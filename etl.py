"""
FPL Advantage Engine - Async ETL Pipeline Script (Phase 1)
Extracts raw data from FPL bootstrap-static and fixtures API, transforms JSON to match ORM models,
and upserts teams, players, and fixtures into PostgreSQL using SQLAlchemy 2.0.
"""

import asyncio
import sys
import httpx
from sqlalchemy.dialects.postgresql import insert as pg_insert
from database import AsyncSessionLocal
from models import Team, Player, Fixture

# Reconfigure stdout for UTF-8 compatibility on Windows terminal
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except AttributeError:
        pass

FPL_BOOTSTRAP_URL = "https://fantasy.premierleague.com/api/bootstrap-static/"
FPL_FIXTURES_URL = "https://fantasy.premierleague.com/api/fixtures/"


async def fetch_fpl_bootstrap_data() -> dict:
    """Extracts raw JSON data from official FPL bootstrap-static endpoint."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    print(f"[EXTRACT] Connecting to FPL API: {FPL_BOOTSTRAP_URL} ...")
    async with httpx.AsyncClient(headers=headers, timeout=20.0, follow_redirects=True) as client:
        response = await client.get(FPL_BOOTSTRAP_URL)
        response.raise_for_status()
        data = response.json()
    print("[EXTRACT] Raw FPL bootstrap data successfully retrieved.")
    return data


async def fetch_fpl_fixtures_data() -> list:
    """Extracts raw fixture schedule from official FPL fixtures endpoint."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    print(f"[EXTRACT] Connecting to FPL Fixtures API: {FPL_FIXTURES_URL} ...")
    async with httpx.AsyncClient(headers=headers, timeout=20.0, follow_redirects=True) as client:
        response = await client.get(FPL_FIXTURES_URL)
        response.raise_for_status()
        data = response.json()
    print(f"[EXTRACT] Retrieved {len(data)} official FPL fixtures.")
    return data


async def fetch_fpl_user_picks(manager_id: int, event_id: int | None = None) -> dict:
    """
    Extracts raw user squad picks, bank balance, and manager metadata from official FPL API endpoints.
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    user_entry_url = f"https://fantasy.premierleague.com/api/entry/{manager_id}/"
    async with httpx.AsyncClient(headers=headers, timeout=20.0, follow_redirects=True) as client:
        entry_res = await client.get(user_entry_url)
        entry_res.raise_for_status()
        entry_data = entry_res.json()

        current_ev = entry_data.get("current_event") or 1
        target_event = event_id or current_ev
        picks_data = {}

        # Search for published squad picks from target_event down to 1
        for curr_gw in range(target_event, 0, -1):
            picks_url = f"https://fantasy.premierleague.com/api/entry/{manager_id}/event/{curr_gw}/picks/"
            try:
                picks_res = await client.get(picks_url)
                if picks_res.status_code == 200:
                    res_json = picks_res.json()
                    if res_json.get("picks"):
                        picks_data = res_json
                        target_event = curr_gw
                        break
            except Exception:
                continue



    first_name = entry_data.get("player_first_name", "")
    last_name = entry_data.get("player_last_name", "")
    player_name = f"{first_name} {last_name}".strip() or f"Manager {manager_id}"
    team_name = entry_data.get("name", "FPL Squad")

    entry_history = picks_data.get("entry_history", {})
    bank = entry_history.get("bank") if entry_history.get("bank") is not None else (entry_data.get("last_deadline_bank") or 0)
    bank_m = bank / 10.0
    free_transfers = entry_history.get("event_transfers", 1) or 1

    return {
        "manager_id": manager_id,
        "event_id": target_event,
        "player_name": player_name,
        "team_name": team_name,
        "bank_m": bank_m,
        "free_transfers": free_transfers,
        "picks": picks_data.get("picks", []),
    }



def transform_teams(raw_teams: list) -> list[dict]:
    """Transforms raw team JSON objects into dictionary records for database insertion."""
    transformed = []
    for team in raw_teams:
        record = {
            "id": team["id"],
            "name": team["name"],
            "short_name": team["short_name"],
            "strength_overall_home": team.get("strength_overall_home", 0),
            "strength_overall_away": team.get("strength_overall_away", 0),
            "strength_attack_home": team.get("strength_attack_home", 0),
            "strength_attack_away": team.get("strength_attack_away", 0),
            "strength_defence_home": team.get("strength_defence_home", 0),
            "strength_defence_away": team.get("strength_defence_away", 0),
        }
        transformed.append(record)
    return transformed


def transform_players(raw_elements: list, element_types: list) -> list[dict]:
    """Transforms raw element JSON objects into dictionary records for database insertion."""
    position_map = {
        pos["id"]: pos["singular_name_short"]
        for pos in element_types
    }

    transformed = []
    for player in raw_elements:
        element_type_id = player.get("element_type")
        position_code = position_map.get(element_type_id, "N/A")

        record = {
            "id": player["id"],
            "team_id": player["team"],
            "web_name": player["web_name"],
            "first_name": player.get("first_name"),
            "second_name": player.get("second_name"),
            "element_type": position_code,
            "now_cost": player.get("now_cost", 0),
            "status": player.get("status", "a"),
            "selected_by_percent": float(player.get("selected_by_percent", 0.0)),
            "news": player.get("news"),
            "goals_scored": player.get("goals_scored", 0),
            "assists": player.get("assists", 0),
            "clean_sheets": player.get("clean_sheets", 0),
            "ict_index": float(player.get("ict_index", 0.0) or 0.0),
            "influence": float(player.get("influence", 0.0) or 0.0),
            "creativity": float(player.get("creativity", 0.0) or 0.0),
            "threat": float(player.get("threat", 0.0) or 0.0),
            "form": float(player.get("form", 0.0) or 0.0),
        }
        transformed.append(record)
    return transformed


def transform_fixtures(raw_fixtures: list) -> list[dict]:
    """Transforms raw fixture JSON objects into database dictionary records."""
    transformed = []
    for fix in raw_fixtures:
        record = {
            "id": fix["id"],
            "event_id": fix.get("event"),
            "team_h_id": fix["team_h"],
            "team_a_id": fix["team_a"],
            "team_h_difficulty": fix.get("team_h_difficulty", 3),
            "team_a_difficulty": fix.get("team_a_difficulty", 3),
            "finished": fix.get("finished", False),
        }
        transformed.append(record)
    return transformed


async def load_data(teams_records: list[dict], players_records: list[dict], fixtures_records: list[dict]):
    """Upserts transformed team, player, and fixture records into PostgreSQL."""
    async with AsyncSessionLocal() as session:
        async with session.begin():
            # Step 1: Upsert Teams
            print(f"[LOAD] Upserting {len(teams_records)} teams into database...")
            team_stmt = pg_insert(Team).values(teams_records)
            team_stmt = team_stmt.on_conflict_do_update(
                index_elements=["id"],
                set_={
                    "name": team_stmt.excluded.name,
                    "short_name": team_stmt.excluded.short_name,
                    "strength_overall_home": team_stmt.excluded.strength_overall_home,
                    "strength_overall_away": team_stmt.excluded.strength_overall_away,
                    "strength_attack_home": team_stmt.excluded.strength_attack_home,
                    "strength_attack_away": team_stmt.excluded.strength_attack_away,
                    "strength_defence_home": team_stmt.excluded.strength_defence_home,
                    "strength_defence_away": team_stmt.excluded.strength_defence_away,
                },
            )
            await session.execute(team_stmt)

            # Step 2: Upsert Players in chunks
            chunk_size = 50
            print(f"[LOAD] Upserting {len(players_records)} players in batches of {chunk_size}...")
            for i in range(0, len(players_records), chunk_size):
                chunk = players_records[i : i + chunk_size]
                player_stmt = pg_insert(Player).values(chunk)
                player_stmt = player_stmt.on_conflict_do_update(
                    index_elements=["id"],
                    set_={
                        "team_id": player_stmt.excluded.team_id,
                        "web_name": player_stmt.excluded.web_name,
                        "first_name": player_stmt.excluded.first_name,
                        "second_name": player_stmt.excluded.second_name,
                        "element_type": player_stmt.excluded.element_type,
                        "now_cost": player_stmt.excluded.now_cost,
                        "status": player_stmt.excluded.status,
                        "selected_by_percent": player_stmt.excluded.selected_by_percent,
                        "news": player_stmt.excluded.news,
                        "goals_scored": player_stmt.excluded.goals_scored,
                        "assists": player_stmt.excluded.assists,
                        "clean_sheets": player_stmt.excluded.clean_sheets,
                        "ict_index": player_stmt.excluded.ict_index,
                        "influence": player_stmt.excluded.influence,
                        "creativity": player_stmt.excluded.creativity,
                        "threat": player_stmt.excluded.threat,
                        "form": player_stmt.excluded.form,
                    },
                )
                await session.execute(player_stmt)

            # Step 3: Upsert Fixtures in chunks
            print(f"[LOAD] Upserting {len(fixtures_records)} fixtures in batches of {chunk_size}...")
            for i in range(0, len(fixtures_records), chunk_size):
                chunk = fixtures_records[i : i + chunk_size]
                fixture_stmt = pg_insert(Fixture).values(chunk)
                fixture_stmt = fixture_stmt.on_conflict_do_update(
                    index_elements=["id"],
                    set_={
                        "event_id": fixture_stmt.excluded.event_id,
                        "team_h_id": fixture_stmt.excluded.team_h_id,
                        "team_a_id": fixture_stmt.excluded.team_a_id,
                        "team_h_difficulty": fixture_stmt.excluded.team_h_difficulty,
                        "team_a_difficulty": fixture_stmt.excluded.team_a_difficulty,
                        "finished": fixture_stmt.excluded.finished,
                    },
                )
                await session.execute(fixture_stmt)

    print("[LOAD] Database transaction committed successfully!")


async def run_etl():
    print("=== STARTING FPL ADVANTAGE ENGINE ETL PIPELINE ===")
    
    # 1. Extract
    raw_data = await fetch_fpl_bootstrap_data()
    raw_fixtures = await fetch_fpl_fixtures_data()

    # 2. Transform
    raw_teams = raw_data.get("teams", [])
    raw_elements = raw_data.get("elements", [])
    element_types = raw_data.get("element_types", [])

    teams_records = transform_teams(raw_teams)
    players_records = transform_players(raw_elements, element_types)
    fixtures_records = transform_fixtures(raw_fixtures)

    print(f"[TRANSFORM] Transformed {len(teams_records)} teams, {len(players_records)} players, and {len(fixtures_records)} fixtures.")

    # 3. Load
    await load_data(teams_records, players_records, fixtures_records)

    print("=" * 55)
    print(f"ETL COMPLETE SUCCESS SUMMARY:")
    print(f"  - Teams Saved/Updated:    {len(teams_records)}")
    print(f"  - Players Saved/Updated:  {len(players_records)}")
    print(f"  - Fixtures Saved/Updated: {len(fixtures_records)}")
    print("=" * 55)


if __name__ == "__main__":
    asyncio.run(run_etl())
