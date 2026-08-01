"""
FPL Advantage Engine - Async ETL Pipeline Script (Phase 1)
Extracts raw data from FPL bootstrap-static API, transforms JSON to match ORM models,
and upserts teams and players into PostgreSQL using SQLAlchemy 2.0.
"""

import asyncio
import sys
import httpx
from sqlalchemy.dialects.postgresql import insert as pg_insert
from database import AsyncSessionLocal
from models import Team, Player

# Reconfigure stdout for UTF-8 compatibility on Windows terminal
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except AttributeError:
        pass

FPL_BOOTSTRAP_URL = "https://fantasy.premierleague.com/api/bootstrap-static/"


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
    print("[EXTRACT] Raw FPL data successfully retrieved.")
    return data


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
        }
        transformed.append(record)
    return transformed


async def load_data(teams_records: list[dict], players_records: list[dict]):
    """Upserts transformed team and player records into PostgreSQL in transaction blocks."""
    async with AsyncSessionLocal() as session:
        async with session.begin():
            # Step 1: Upsert Teams (Parent Table)
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

            # Step 2: Upsert Players (Child Table)
            print(f"[LOAD] Upserting {len(players_records)} players into database...")
            player_stmt = pg_insert(Player).values(players_records)
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
                },
            )
            await session.execute(player_stmt)

    print("[LOAD] Database transaction committed successfully!")


async def run_etl():
    print("=== STARTING FPL ADVANTAGE ENGINE ETL PIPELINE ===")
    
    # 1. Extract
    raw_data = await fetch_fpl_bootstrap_data()

    # 2. Transform
    raw_teams = raw_data.get("teams", [])
    raw_elements = raw_data.get("elements", [])
    element_types = raw_data.get("element_types", [])

    teams_records = transform_teams(raw_teams)
    players_records = transform_players(raw_elements, element_types)

    print(f"[TRANSFORM] Transformed {len(teams_records)} teams and {len(players_records)} players.")

    # 3. Load
    await load_data(teams_records, players_records)

    print("=" * 55)
    print(f"ETL COMPLETE SUCCESS SUMMARY:")
    print(f"  - Teams Saved/Updated:   {len(teams_records)}")
    print(f"  - Players Saved/Updated: {len(players_records)}")
    print("=" * 55)


if __name__ == "__main__":
    asyncio.run(run_etl())
