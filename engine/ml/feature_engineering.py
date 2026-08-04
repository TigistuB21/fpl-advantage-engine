"""
Feature Engineering Module for Expected Points (xP) Forecasting.
Extracts player and team data from PostgreSQL and constructs numerical feature matrices.
"""

import pandas as pd
from sqlalchemy import select
from database import AsyncSessionLocal
from models import Player, Team, Fixture


async def get_5gw_split_fdrs(event_id: int = 1) -> tuple[dict[int, float], dict[int, float]]:
    """
    Computes rolling 5-Gameweek attack_fdr and defense_fdr multipliers for each team.
    - attack_fdr: Evaluates opponent defensive weakness (strength_defence). Higher when facing weaker defences.
    - defense_fdr: Evaluates opponent attacking threat (strength_attack). Higher when facing weaker attacks.
    """
    target_events = list(range(event_id, event_id + 5))
    async with AsyncSessionLocal() as session:
        stmt_fix = select(Fixture).where(Fixture.event_id.in_(target_events))
        res_fix = await session.execute(stmt_fix)
        fixtures = res_fix.scalars().all()

        stmt_teams = select(Team)
        res_teams = await session.execute(stmt_teams)
        teams = res_teams.scalars().all()

    team_map = {t.id: t for t in teams}

    opp_defence_list: dict[int, list[float]] = {}
    opp_attack_list: dict[int, list[float]] = {}

    for fix in fixtures:
        home_team = team_map.get(fix.team_h_id)
        away_team = team_map.get(fix.team_a_id)

        if home_team and away_team:
            # Home team facing Away team: opponent's defence is away_team.strength_defence_away
            opp_defence_list.setdefault(fix.team_h_id, []).append(float(away_team.strength_defence_away))
            # Home team facing Away team: opponent's attack is away_team.strength_attack_away
            opp_attack_list.setdefault(fix.team_h_id, []).append(float(away_team.strength_attack_away))

            # Away team facing Home team: opponent's defence is home_team.strength_defence_home
            opp_defence_list.setdefault(fix.team_a_id, []).append(float(home_team.strength_defence_home))
            # Away team facing Home team: opponent's attack is home_team.strength_attack_home
            opp_attack_list.setdefault(fix.team_a_id, []).append(float(home_team.strength_attack_home))

    attack_fdr_map: dict[int, float] = {}
    defense_fdr_map: dict[int, float] = {}

    baseline_strength = 1150.0  # Premier League average rating baseline

    for t_id in team_map:
        defs = opp_defence_list.get(t_id, [baseline_strength])
        atks = opp_attack_list.get(t_id, [baseline_strength])

        avg_opp_def = sum(defs) / float(len(defs)) if defs else baseline_strength
        avg_opp_atk = sum(atks) / float(len(atks)) if atks else baseline_strength

        # Weaker opponent defence -> Higher attack multiplier for MID & FWD
        attack_fdr_map[t_id] = round(baseline_strength / max(avg_opp_def, 500.0), 3)

        # Weaker opponent attack -> Higher defense multiplier for GKP & DEF (clean sheet chance)
        defense_fdr_map[t_id] = round(baseline_strength / max(avg_opp_atk, 500.0), 3)

    return attack_fdr_map, defense_fdr_map


async def get_5gw_attack_fdr(event_id: int = 1) -> dict[int, float]:
    """Helper to fetch 5-GW attack FDR map for all teams."""
    attack_fdr, _ = await get_5gw_split_fdrs(event_id)
    return attack_fdr


async def get_5gw_defense_fdr(event_id: int = 1) -> dict[int, float]:
    """Helper to fetch 5-GW defense FDR map for all teams."""
    _, defense_fdr = await get_5gw_split_fdrs(event_id)
    return defense_fdr


async def build_player_feature_matrix(event_id: int = 1) -> pd.DataFrame:
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

    # 5-Gameweek Rolling Split Fixture Difficulty Ratings (Attack FDR vs Defense FDR)
    attack_fdr_map, defense_fdr_map = await get_5gw_split_fdrs(event_id)
    df["attack_fdr"] = df["team_id"].map(attack_fdr_map).fillna(1.0)
    df["defense_fdr"] = df["team_id"].map(defense_fdr_map).fillna(1.0)

    return df


