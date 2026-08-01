"""
Feature Engineering Module for Expected Points (xP) Forecasting.
Extracts player and team data from PostgreSQL and constructs numerical feature matrices.
"""

import pandas as pd
from sqlalchemy import select
from database import AsyncSessionLocal
from models import Player, Team


async def build_player_feature_matrix() -> pd.DataFrame:
    """
    Queries PostgreSQL for all players and their team strengths,
    then transforms records into a feature DataFrame for ML modeling.
    """
    async with AsyncSessionLocal() as session:
        stmt = (
            select(
                Player.id.label("player_id"),
                Player.web_name,
                Player.element_type,
                Player.now_cost,
                Player.status,
                Player.selected_by_percent,
                Team.id.label("team_id"),
                Team.name.label("team_name"),
                Team.strength_attack_home,
                Team.strength_attack_away,
                Team.strength_defence_home,
                Team.strength_defence_away,
                Team.strength_overall_home,
                Team.strength_overall_away,
            )
            .join(Team, Player.team_id == Team.id)
        )
        result = await session.execute(stmt)
        rows = [dict(row._mapping) for row in result]

    df = pd.DataFrame(rows)
    if df.empty:
        return df

    # Feature Engineering Calculations
    df["cost_m"] = df["now_cost"] / 10.0
    
    # Position encoding
    position_weight = {"GKP": 1.0, "DEF": 1.1, "MID": 1.3, "FWD": 1.4}
    df["pos_weight"] = df["element_type"].map(position_weight).fillna(1.0)

    # Availability multiplier: available='a' (1.0), doubtful='d' (0.5), injured/suspended='i'/'s' (0.0)
    status_map = {"a": 1.0, "d": 0.5, "i": 0.0, "s": 0.0, "u": 0.0}
    df["availability_factor"] = df["status"].map(status_map).fillna(0.0)

    # Average team overall strength
    df["team_strength_avg"] = (df["strength_overall_home"] + df["strength_overall_away"]) / 2.0
    df["team_attack_avg"] = (df["strength_attack_home"] + df["strength_attack_away"]) / 2.0

    return df
