"""
Expected Points (xP) Forecasting Engine.
Uses feature matrices and statistical regression models to generate player xP predictions,
persisting the results into the PostgreSQL database.
"""

import pandas as pd
from sqlalchemy import delete
from sqlalchemy.dialects.postgresql import insert as pg_insert
from database import AsyncSessionLocal
from models import PlayerPrediction
from engine.ml.feature_engineering import build_player_feature_matrix


def calculate_expected_points(df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes forecasted Expected Points (xP) for players.
    Applies position specific multipliers, cost scaling, team strength, and availability status.
    """
    if df.empty:
        df["predicted_xp"] = 0.0
        return df

    # Base baseline xP from price and popularity (higher price -> higher underlying quality)
    cost_base = df["cost_m"] * 0.45
    popularity_boost = (df["selected_by_percent"] / 100.0) * 2.5
    team_boost = (df["team_attack_avg"] / 1200.0) * 1.5

    # Compute raw expected points
    raw_xp = (cost_base + popularity_boost + team_boost) * df["pos_weight"]

    # Multiply by availability (0.0 if injured/suspended, 0.5 if doubtful, 1.0 if fit)
    df["predicted_xp"] = (raw_xp * df["availability_factor"]).round(2)

    return df


async def generate_and_save_predictions(event_id: int = 1, model_version: str = "v1.0-heuristic") -> int:
    """
    Builds features, runs xP prediction pipeline, and upserts results into player_predictions table.
    """
    df = await build_player_feature_matrix()
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
            # Delete existing predictions for this event and model version to ensure clean dataset
            await session.execute(
                delete(PlayerPrediction).where(
                    PlayerPrediction.event_id == event_id,
                    PlayerPrediction.model_version == model_version
                )
            )

            # Insert new predictions
            stmt = pg_insert(PlayerPrediction).values(records)
            await session.execute(stmt)

    print(f"[PREDICTOR] Saved {len(records)} player xP predictions for Gameweek {event_id} into PostgreSQL.")
    return len(records)
