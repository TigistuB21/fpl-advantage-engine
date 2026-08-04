"""
Phase 7 Verification Script: Test Split Attack & Defense Fixture Difficulty (xG-FDR) Predictor
"""

import asyncio
import sys
from engine.ml.feature_engineering import build_player_feature_matrix, get_5gw_attack_fdr, get_5gw_defense_fdr
from engine.ml.predictor import calculate_expected_points, generate_and_save_predictions

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except AttributeError:
        pass


async def verify_phase7_fdr():
    print("=== STARTING PHASE 7 SPLIT xG-FDR VERIFICATION ===")

    # 1. Test Split FDR maps
    print("\n[TEST 1] Calculating 5-GW Attack FDR vs Defense FDR for Premier League teams...")
    attack_fdrs = await get_5gw_attack_fdr(event_id=1)
    defense_fdrs = await get_5gw_defense_fdr(event_id=1)

    print(f"-> Calculated Attack FDRs for {len(attack_fdrs)} teams.")
    print(f"-> Calculated Defense FDRs for {len(defense_fdrs)} teams.")

    # 2. Run prediction pipeline
    print("\n[TEST 2] Running generate_and_save_predictions(event_id=1, model_version='v3.0-split-xg-fdr')...")
    saved_count = await generate_and_save_predictions(event_id=1, model_version="v3.0-split-xg-fdr")
    print(f"-> Successfully saved {saved_count} predictions to PostgreSQL under version 'v3.0-split-xg-fdr'.")
    assert saved_count > 0, "No prediction records were saved!"

    # 3. Inspect Split FDR Multipliers & xP on sample players
    print("\n[TEST 3] Inspecting Split FDR Impact on Sample Defenders & Attackers...")
    df_raw = await build_player_feature_matrix(event_id=1)
    df_pred = calculate_expected_points(df_raw)

    defenders = df_pred[df_pred["element_type"] == "DEF"].sort_values("predicted_xp", ascending=False).head(5)
    forwards = df_pred[df_pred["element_type"] == "FWD"].sort_values("predicted_xp", ascending=False).head(5)

    print("\n--- Top 5 Defenders (Defense FDR applied) ---")
    for _, row in defenders.iterrows():
        print(
            f"  • [{row['element_type']}] {row['web_name']:<16} ({row['team_name']}) | "
            f"Defense FDR: {row['defense_fdr']:.3f} | Attack FDR: {row['attack_fdr']:.3f} | "
            f"Final xP: {row['predicted_xp']:.2f}"
        )

    print("\n--- Top 5 Forwards (Attack FDR applied) ---")
    for _, row in forwards.iterrows():
        print(
            f"  • [{row['element_type']}] {row['web_name']:<16} ({row['team_name']}) | "
            f"Defense FDR: {row['defense_fdr']:.3f} | Attack FDR: {row['attack_fdr']:.3f} | "
            f"Final xP: {row['predicted_xp']:.2f}"
        )

    print("\n=== PHASE 7 VERIFICATION PASSED ===")


if __name__ == "__main__":
    asyncio.run(verify_phase7_fdr())
