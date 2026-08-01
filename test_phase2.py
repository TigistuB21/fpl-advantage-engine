"""
FPL Advantage Engine - Phase 2 ML & Math Optimization Verification Script
Generates xP predictions, solves the PuLP Integer Programming optimal squad selection problem,
and prints the resulting 15-player squad, starting 11 lineup, and formation.
"""

import asyncio
import sys
from engine.ml.predictor import generate_and_save_predictions
from engine.optimizer.solver import run_and_save_optimization

# Reconfigure stdout for UTF-8 compatibility on Windows terminal
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except AttributeError:
        pass


async def main():
    print("=== PHASE 2: ML & MATH OPTIMIZATION TEST ===")
    
    # Step 1: Run Expected Points (xP) Prediction Pipeline
    print("\n1. Generating Player Expected Points (xP) Predictions...")
    pred_count = await generate_and_save_predictions(event_id=1)

    # Step 2: Run PuLP Integer Linear Program Squad Optimizer
    print("\n2. Running PuLP Squad Optimizer (£100.0m Budget Constraint)...")
    solution = await run_and_save_optimization(event_id=1, budget=100.0)

    # Step 3: Print AI Recommended Squad Summary
    print("\n" + "=" * 65)
    print(f"✨ AI OPTIMAL FPL SQUAD RESULT (GW 1) ✨")
    print(f"Formation: {solution['formation']}  |  Total Cost: £{solution['total_cost']}m / £100.0m  |  Total Expected Points (xP): {solution['total_expected_points']}")
    print("=" * 65)

    print("\n--- STARTING 11 LINEUP ---")
    print(f"{'Pos':<6} {'Player Name':<22} {'Team':<15} {'Price':<8} {'xP':<6} {'Role'}")
    print("-" * 65)

    starters = solution["starters_detail"]
    for player in starters:
        is_captain = (player["player_id"] == solution["captain_id"])
        is_vice = (player["player_id"] == solution["vice_captain_id"])
        role = "(C) ⭐" if is_captain else ("(VC)" if is_vice else "Starter")
        xp_display = player["predicted_xp"] * 2.0 if is_captain else player["predicted_xp"]
        
        print(f"{player['element_type']:<6} {player['web_name']:<22} {player['team_name']:<15} £{player['now_cost']/10.0:.1f}m   {xp_display:<6.2f} {role}")

    print("\n--- BENCH PLAYERS ---")
    print(f"{'Pos':<6} {'Player Name':<22} {'Team':<15} {'Price':<8} {'xP':<6}")
    print("-" * 65)
    for player in solution["bench_detail"]:
        print(f"{player['element_type']:<6} {player['web_name']:<22} {player['team_name']:<15} £{player['now_cost']/10.0:.1f}m   {player['predicted_xp']:<6.2f}")

    print("=" * 65)


if __name__ == "__main__":
    asyncio.run(main())
