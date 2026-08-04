"""
Expected Points (xP) Forecasting Engine.
Uses feature matrices and statistical regression models to generate player xP predictions,
persisting the results into the PostgreSQL database.
"""

import numpy as np
import pandas as pd
from sqlalchemy import delete
from sqlalchemy.dialects.postgresql import insert as pg_insert
from database import AsyncSessionLocal
from models import PlayerPrediction
from engine.ml.feature_engineering import build_player_feature_matrix


def calculate_expected_points(df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes forecasted Expected Points (xP) for players across a rolling 5-Gameweek window.
    Applies position specific multipliers, cost scaling, team strength, availability status,
    and split 5-Gameweek rolling Fixture Difficulty Ratings (attack_fdr vs defense_fdr).
    """
    if df.empty:
        df["predicted_xp"] = 0.0
        return df

    # Base baseline xP from price and popularity
    cost_base = df["cost_m"] * 0.45
    popularity_boost = (df["selected_by_percent"] / 100.0) * 2.5
    team_boost = (df["team_attack_avg"] / 1200.0) * 1.5

    # Compute single GW expected points baseline
    single_gw_xp = (cost_base + popularity_boost + team_boost) * df["pos_weight"] * df["availability_factor"]

    # Select split FDR multiplier based on position:
    # GKP & DEF depend on clean sheets / opponent attacking threat (defense_fdr)
    # MID & FWD depend on goal threat / opponent defensive weakness (attack_fdr)
    attack_fdr = df["attack_fdr"] if "attack_fdr" in df.columns else 1.0
    defense_fdr = df["defense_fdr"] if "defense_fdr" in df.columns else 1.0

    is_defensive = df["element_type"].isin(["GKP", "DEF"])
    fdr_mult = np.where(is_defensive, defense_fdr, attack_fdr)

    df["predicted_xp"] = (single_gw_xp * fdr_mult).round(2)

    return df



async def generate_and_save_predictions(event_id: int = 1, model_version: str = "v3.0-split-xg-fdr") -> int:
    """
    Builds features, runs 5-Gameweek split xG-FDR prediction pipeline, and upserts results into player_predictions table.
    """
    df = await build_player_feature_matrix(event_id=event_id)
    if df.empty:
        print("[PREDICTOR] No player data found in database.")
        return 0

    df_predicted = calculate_expected_points(df)

    records = []
    for _, row in df_predicted.iterrows():
        records.append({
            "player_id": int(row["player_id"]),
            "event_id": event_id,
            "predicted_xp": float(row["predicted_xp"]),
            "model_version": model_version,
        })

    async with AsyncSessionLocal() as session:
        async with session.begin():
            # Delete existing predictions for this event to ensure clean dataset
            await session.execute(
                delete(PlayerPrediction).where(
                    PlayerPrediction.event_id == event_id,
                )
            )

            # Insert new predictions
            stmt = pg_insert(PlayerPrediction).values(records)
            await session.execute(stmt)

    print(f"[PREDICTOR] Saved {len(records)} player split xG-FDR predictions for Gameweek {event_id} into PostgreSQL (version: {model_version}).")
    return len(records)


