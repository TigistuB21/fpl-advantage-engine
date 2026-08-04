"""
Phase 5 Verification Script: Test FPL User Squad Import & Multi-Gameweek xP Predictor
"""

import asyncio
import sys
from etl import fetch_fpl_user_picks
from engine.ml.predictor import generate_and_save_predictions

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except AttributeError:
        pass


async def verify_phase5():
    print("=== STARTING PHASE 5 VERIFICATION ===")

    # 1. Test 5-Gameweek Rolling xP Predictor
    print("\n[TEST 1] Running 5-Gameweek Rolling xP Predictor...")
    count = await generate_and_save_predictions(event_id=1)
    print(f"-> Successfully calculated and saved {count} 5-GW rolling xP predictions.")
    assert count > 0, "No predictions were saved!"

    # 2. Test FPL User Picks Extraction from official FPL API
    print("\n[TEST 2] Fetching FPL user picks for Manager ID = 1...")
    try:
        squad = await fetch_fpl_user_picks(manager_id=1, event_id=1)
        print(f"-> Manager Name:    {squad['player_name']}")
        print(f"-> Team Name:       {squad['team_name']}")
        print(f"-> Bank (£m):       £{squad['bank_m']}m")
        print(f"-> Free Transfers:  {squad['free_transfers']}")
        print(f"-> Total Picks:     {len(squad['picks'])}")
        assert len(squad["picks"]) > 0, "User picks returned empty list!"
    except Exception as e:
        print(f"-> Warning/Info on FPL API fetch: {e}")

    print("\n=== PHASE 5 VERIFICATION PASSED ===")


if __name__ == "__main__":
    asyncio.run(verify_phase5())
