"""
FPL Advantage Engine - Phase 1 API Proof of Concept
Connects to the official Fantasy Premier League (FPL) bootstrap-static API endpoint
and retrieves the 5 most expensive players currently in the game.
"""

import sys
import httpx

# Ensure clean UTF-8 printing on Windows terminals
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except AttributeError:
        pass

FPL_BOOTSTRAP_URL = "https://fantasy.premierleague.com/api/bootstrap-static/"


def fetch_top_expensive_players(top_n: int = 5):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    print(f"Connecting to official FPL API: {FPL_BOOTSTRAP_URL} ...")
    
    with httpx.Client(headers=headers, timeout=15.0, follow_redirects=True) as client:
        response = client.get(FPL_BOOTSTRAP_URL)
        response.raise_for_status()
        data = response.json()

    print("Data successfully fetched from FPL API!\n")

    # Map position IDs (element_types) to position short names (e.g. GKP, DEF, MID, FWD)
    position_map = {
        pos["id"]: pos["singular_name_short"]
        for pos in data.get("element_types", [])
    }

    # Map team IDs to team names for enhanced context
    team_map = {
        team["id"]: team["name"]
        for team in data.get("teams", [])
    }

    elements = data.get("elements", [])
    
    # Sort players by current cost (`now_cost`) in descending order
    sorted_players = sorted(elements, key=lambda p: p.get("now_cost", 0), reverse=True)

    top_players = sorted_players[:top_n]

    print(f"=== TOP {top_n} MOST EXPENSIVE FPL PLAYERS ===")
    print("-" * 55)
    print(f"{'Rank':<5} {'Player Name':<22} {'Team':<15} {'Pos':<6} {'Cost':<8}")
    print("-" * 55)

    for rank, player in enumerate(top_players, start=1):
        name = player.get("web_name", f"{player.get('first_name')} {player.get('second_name')}")
        team_id = player.get("team")
        team_name = team_map.get(team_id, "Unknown")
        element_type_id = player.get("element_type")
        position = position_map.get(element_type_id, "N/A")
        # now_cost is represented in tenths of a million (e.g., 150 = £15.0m)
        cost_in_millions = player.get("now_cost", 0) / 10.0

        print(f"#{rank:<4} {name:<22} {team_name:<15} {position:<6} £{cost_in_millions:.1f}m")

    print("-" * 55)


if __name__ == "__main__":
    fetch_top_expensive_players(5)
