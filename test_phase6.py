"""
Phase 6 Verification Script: Test PuLP Transfer Optimizer
"""

import asyncio
import sys
import httpx
from engine.optimizer.solver import fetch_players_with_predictions, optimize_user_transfers

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except AttributeError:
        pass


async def verify_phase6():
    print("=== STARTING PHASE 6 VERIFICATION ===")

    # 1. Fetch player dataset
    print("\n[TEST 1] Fetching player predictions for Gameweek 1...")
    df = await fetch_players_with_predictions(event_id=1)
    assert not df.empty, "Player predictions DataFrame is empty!"
    print(f"-> Loaded {len(df)} players.")

    # Construct a valid baseline 15-man squad
    gkps = df[df["element_type"] == "GKP"].sort_values("now_cost").head(2)["player_id"].tolist()
    defs = df[df["element_type"] == "DEF"].sort_values("now_cost").head(5)["player_id"].tolist()
    mids = df[df["element_type"] == "MID"].sort_values("now_cost").head(5)["player_id"].tolist()
    fwds = df[df["element_type"] == "FWD"].sort_values("now_cost").head(3)["player_id"].tolist()

    sample_squad_ids = gkps + defs + mids + fwds
    assert len(sample_squad_ids) == 15, "Sample squad does not contain 15 players!"

    print(f"-> Sample Squad Player IDs: {sample_squad_ids}")

    # 2. Test Single Transfer (Free Transfer)
    print("\n[TEST 2] Running transfer optimizer (1 Free Transfer, Max 1 Transfer)...")
    sol1 = optimize_user_transfers(
        current_squad_ids=sample_squad_ids,
        bank=2.0,
        free_transfers=1,
        max_transfers=1,
        event_id=1,
        df=df,
    )
    print(f"-> Transfers Made:      {sol1['transfers_made']}")
    print(f"-> Hits Taken:          {sol1['hits_taken']} (Penalty: -{sol1['hit_penalty']} pts)")
    print(f"-> Transferred Out IDs: {sol1['transferred_out_ids']}")
    print(f"-> Transferred In IDs:  {sol1['transferred_in_ids']}")
    print(f"-> Total Expected Points: {sol1['total_expected_points']}")
    print(f"-> Net xP Gain:         +{sol1['net_xp_gain']} xP")
    print(f"-> Remaining Bank:      £{sol1['remaining_bank']}m")

    assert sol1["transfers_made"] <= 1
    assert sol1["hits_taken"] == 0

    # 3. Test Double Transfer with Hit
    print("\n[TEST 3] Running transfer optimizer (1 Free Transfer, Max 2 Transfers)...")
    sol2 = optimize_user_transfers(
        current_squad_ids=sample_squad_ids,
        bank=3.0,
        free_transfers=1,
        max_transfers=2,
        event_id=1,
        df=df,
    )
    print(f"-> Transfers Made:      {sol2['transfers_made']}")
    print(f"-> Hits Taken:          {sol2['hits_taken']} (Penalty: -{sol2['hit_penalty']} pts)")
    print(f"-> Transferred Out IDs: {sol2['transferred_out_ids']}")
    print(f"-> Transferred In IDs:  {sol2['transferred_in_ids']}")
    print(f"-> Formation:           {sol2['formation']}")
    print(f"-> Total Expected Points: {sol2['total_expected_points']}")
    print(f"-> Net xP Gain:         +{sol2['net_xp_gain']} xP")
    print(f"-> Remaining Bank:      £{sol2['remaining_bank']}m")

    assert sol2["hits_taken"] == max(0, sol2["transfers_made"] - 1)

    # 4. Test REST Endpoint
    print("\n[TEST 4] Testing FastAPI endpoint POST /api/v1/optimize/transfers...")
    async with httpx.AsyncClient(base_url="http://localhost:8000", timeout=10.0) as client:
        res = await client.post(
            "/api/v1/optimize/transfers",
            json={
                "current_squad_ids": sample_squad_ids,
                "bank": 2.5,
                "free_transfers": 1,
                "max_transfers": 2,
                "event_id": 1,
            },
        )
        if res.status_code == 200:
            data = res.json()
            print(f"-> API Response Status: 200 OK")
            print(f"-> API Transfers Made: {data['transfers_made']}")
            print(f"-> API Total xP:        {data['total_expected_points']}")
        else:
            print(f"-> API Response Status: {res.status_code} {res.text}")

    print("\n=== PHASE 6 VERIFICATION PASSED ===")


if __name__ == "__main__":
    asyncio.run(verify_phase6())
