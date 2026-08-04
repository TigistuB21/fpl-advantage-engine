"""
Verification Script for Phase 9 Chip Optimization Engine
Evaluates Baseline, Triple Captain, Bench Boost, and Free Hit scenarios for a sample FPL manager squad.
"""

import asyncio
import sys
import httpx
from main import app
from database import AsyncSessionLocal
from engine.optimizer.solver import fetch_players_with_predictions, evaluate_chip_strategies, solve_squad_optimization

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except AttributeError:
        pass


async def verify_chip_optimization():
    print("=== TESTING PHASE 9 CHIP OPTIMIZATION ENGINE ===")

    # 1. Fetch player predictions for Gameweek 1
    df = await fetch_players_with_predictions(event_id=1)
    print(f"\n1. Loaded {len(df)} players with predicted xP for Gameweek 1.")
    assert not df.empty, "Player predictions dataframe is empty!"

    # 2. Select a valid, budget-compliant 15-player sample squad
    sample_squad_sol = solve_squad_optimization(df, budget=100.0)
    sample_squad_ids = sample_squad_sol["starting_11_ids"] + sample_squad_sol["bench_ids"]

    print(f"\n2. Evaluating Chip Strategies for Sample Squad ({len(sample_squad_ids)} players)...")
    chip_results = await evaluate_chip_strategies(
        current_squad_ids=sample_squad_ids,
        bank=1.5,
        free_transfers=1,
        event_id=1,
        df=df,
    )

    print("\n=== CHIP EVALUATION RESULTS ===")
    print(f"Baseline (Standard Transfers) xP: {chip_results['baseline_xp']:.2f}")
    print("-" * 65)
    print(f"{'Chip Name':<22} {'Projected xP':<15} {'xP Delta vs Base':<20}")
    print("-" * 65)

    for chip in chip_results["chips"]:
        delta_str = f"+{chip['xp_delta']:.2f}" if chip['xp_delta'] > 0 else f"{chip['xp_delta']:.2f}"
        print(f"{chip['chip_name']:<22} {chip['projected_xp']:<15.2f} {delta_str:<20}")

    print("-" * 65)
    print(f"Recommended Best Chip: {chip_results['best_chip_name']} (Delta: +{chip_results['best_chip_delta']:.2f} xP)")

    # Assertions for mathematical logic
    assert chip_results["baseline_xp"] > 0, "Baseline xP must be greater than 0"
    for chip in chip_results["chips"]:
        if chip["chip_code"] in ["3xc", "bboost"]:
            assert chip["projected_xp"] >= chip_results["baseline_xp"], f"{chip['chip_name']} xP should be >= Baseline"

    # 3. Test REST API Endpoint GET /api/v1/optimize/chips/1
    print("\n3. Testing REST API Endpoint: GET /api/v1/optimize/chips/1 ...")
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/v1/optimize/chips/1")
        print(f"   HTTP Status Code: {res.status_code}")
        assert res.status_code == 200, f"Endpoint failed with status {res.status_code}"
        api_data = res.json()
        print(f"   API Response Baseline xP: {api_data['baseline_xp']}")
        print(f"   API Best Chip: {api_data['best_chip_name']} (+{api_data['best_chip_delta']} xP)")

    print("\n✨ ALL PHASE 9 CHIP OPTIMIZATION CHECKS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    asyncio.run(verify_chip_optimization())
