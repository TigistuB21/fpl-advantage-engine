"""
PuLP Integer Linear Programming (ILP) Squad & Lineup Optimizer.
Solves for the optimal 15-player FPL squad, starting 11 formation, captain, and bench ordering
under budget, positional, and team constraints.
"""

from typing import Any, Dict, List, Optional
import pandas as pd
import pulp
from sqlalchemy import select
from database import AsyncSessionLocal
from models import Player, PlayerPrediction, SquadOptimization, Team


async def fetch_players_with_predictions(event_id: int = 1) -> pd.DataFrame:
    """Queries players and their latest xP predictions for a target gameweek."""
    async with AsyncSessionLocal() as session:
        stmt = (
            select(
                Player.id.label("player_id"),
                Player.web_name,
                Player.element_type,
                Player.now_cost,
                Player.status,
                Team.id.label("team_id"),
                Team.name.label("team_name"),
                Team.short_name.label("team_short"),
                PlayerPrediction.predicted_xp,
            )
            .join(Team, Player.team_id == Team.id)
            .join(PlayerPrediction, Player.id == PlayerPrediction.player_id)
            .where(PlayerPrediction.event_id == event_id)
        )
        result = await session.execute(stmt)
        rows = [dict(row._mapping) for row in result]

    return pd.DataFrame(rows)


def solve_squad_optimization(
    df: pd.DataFrame,
    budget: float = 100.0,
    locked_player_ids: Optional[List[int]] = None,
    excluded_player_ids: Optional[List[int]] = None,
) -> Dict[str, Any]:
    """
    Solves the FPL Integer Programming problem using PuLP.
    Returns optimal starting 11, bench, captain, formation, total cost, and total expected points.
    """
    if df.empty:
        raise ValueError("Player dataset is empty. Run predictor.py first.")

    df = df.copy()
    df["cost_m"] = df["now_cost"] / 10.0

    locked = set(locked_player_ids or [])
    excluded = set(excluded_player_ids or [])

    prob = pulp.LpProblem("FPL_Squad_Optimizer", pulp.LpMaximize)

    player_ids = df["player_id"].tolist()
    
    # Binary Decision Variables
    x = pulp.LpVariable.dicts("starter", player_ids, cat=pulp.LpBinary)  # 1 if starting 11
    y = pulp.LpVariable.dicts("bench", player_ids, cat=pulp.LpBinary)    # 1 if on bench
    c = pulp.LpVariable.dicts("captain", player_ids, cat=pulp.LpBinary)  # 1 if captain

    # Pre-index player parameters
    xp_dict = dict(zip(df["player_id"], df["predicted_xp"]))
    cost_dict = dict(zip(df["player_id"], df["now_cost"]))  # stored in 10ths (e.g. 100 = £10.0m)
    team_dict = dict(zip(df["player_id"], df["team_id"]))
    pos_dict = dict(zip(df["player_id"], df["element_type"]))

    # Objective Function: Maximize (Starter xP + 0.1 * Bench xP + Captain Bonus xP)
    prob += pulp.lpSum([
        (xp_dict[i] * x[i]) + (0.1 * xp_dict[i] * y[i]) + (xp_dict[i] * c[i])
        for i in player_ids
    ])

    # Constraint 1: Exactly 15 total squad players
    prob += pulp.lpSum([x[i] + y[i] for i in player_ids]) == 15

    # Constraint 2: Exactly 11 starting players
    prob += pulp.lpSum([x[i]] for i in player_ids) == 11

    # Constraint 3: Budget limit (convert budget £100.0m to 10ths = 1000)
    max_budget_tenths = int(budget * 10)
    prob += pulp.lpSum([cost_dict[i] * (x[i] + y[i]) for i in player_ids]) <= max_budget_tenths

    # Constraint 4: 15-Man Squad Positional Breakdown (2 GKP, 5 DEF, 5 MID, 3 FWD)
    prob += pulp.lpSum([x[i] + y[i] for i in player_ids if pos_dict[i] == "GKP"]) == 2
    prob += pulp.lpSum([x[i] + y[i] for i in player_ids if pos_dict[i] == "DEF"]) == 5
    prob += pulp.lpSum([x[i] + y[i] for i in player_ids if pos_dict[i] == "MID"]) == 5
    prob += pulp.lpSum([x[i] + y[i] for i in player_ids if pos_dict[i] == "FWD"]) == 3

    # Constraint 5: Valid Starting 11 Formation Boundaries
    prob += pulp.lpSum([x[i] for i in player_ids if pos_dict[i] == "GKP"]) == 1
    prob += pulp.lpSum([x[i] for i in player_ids if pos_dict[i] == "DEF"]) >= 3
    prob += pulp.lpSum([x[i] for i in player_ids if pos_dict[i] == "DEF"]) <= 5
    prob += pulp.lpSum([x[i] for i in player_ids if pos_dict[i] == "MID"]) >= 2
    prob += pulp.lpSum([x[i] for i in player_ids if pos_dict[i] == "MID"]) <= 5
    prob += pulp.lpSum([x[i] for i in player_ids if pos_dict[i] == "FWD"]) >= 1
    prob += pulp.lpSum([x[i] for i in player_ids if pos_dict[i] == "FWD"]) <= 3

    # Constraint 6: Max 3 players per Premier League team
    teams = df["team_id"].unique()
    for t in teams:
        prob += pulp.lpSum([x[i] + y[i] for i in player_ids if team_dict[i] == t]) <= 3

    # Constraint 7: Captain Choice (Must be 1 player, and that player must be in starting 11)
    prob += pulp.lpSum([c[i] for i in player_ids]) == 1
    for i in player_ids:
        prob += c[i] <= x[i]

    # User Locked & Excluded constraints
    for i in player_ids:
        if i in locked:
            prob += (x[i] + y[i]) == 1
        if i in excluded:
            prob += (x[i] + y[i]) == 0

    # Solve Integer Linear Program using COIN-OR CBC Solver
    solver = pulp.PULP_CBC_CMD(msg=False)
    status = prob.solve(solver)

    if status != pulp.LpStatusOptimal:
        raise RuntimeError(f"Optimization failed. Status: {pulp.LpStatus[status]}")

    # Extract Results
    starter_ids = [i for i in player_ids if pulp.value(x[i]) > 0.5]
    bench_ids = [i for i in player_ids if pulp.value(y[i]) > 0.5]
    captain_id = [i for i in player_ids if pulp.value(c[i]) > 0.5][0]

    # Determine Vice-Captain (highest xP starter non-captain)
    starters_df = df[df["player_id"].isin(starter_ids)].sort_values("predicted_xp", ascending=False)
    non_cap_starters = starters_df[starters_df["player_id"] != captain_id]
    vice_captain_id = int(non_cap_starters.iloc[0]["player_id"]) if not non_cap_starters.empty else int(captain_id)

    # Compute Formation String (e.g. 3-4-3)
    def_count = len([i for i in starter_ids if pos_dict[i] == "DEF"])
    mid_count = len([i for i in starter_ids if pos_dict[i] == "MID"])
    fwd_count = len([i for i in starter_ids if pos_dict[i] == "FWD"])
    formation = f"{def_count}-{mid_count}-{fwd_count}"

    # Calculate Total Cost & Expected Points
    squad_df = df[df["player_id"].isin(starter_ids + bench_ids)]
    total_cost = squad_df["cost_m"].sum()
    
    # Starting 11 xP + Captain double points
    captain_xp = xp_dict[captain_id]
    starters_xp = starters_df["predicted_xp"].sum() + captain_xp
    bench_xp = df[df["player_id"].isin(bench_ids)]["predicted_xp"].sum()

    return {
        "starting_11_ids": starter_ids,
        "bench_ids": bench_ids,
        "captain_id": int(captain_id),
        "vice_captain_id": vice_captain_id,
        "formation": formation,
        "total_cost": round(float(total_cost), 1),
        "total_expected_points": round(float(starters_xp), 2),
        "bench_expected_points": round(float(bench_xp), 2),
        "starters_detail": starters_df.to_dict(orient="records"),
        "bench_detail": df[df["player_id"].isin(bench_ids)].sort_values("element_type").to_dict(orient="records"),
    }


async def run_and_save_optimization(event_id: int = 1, budget: float = 100.0) -> Dict[str, Any]:
    """Runs PuLP solver and persists optimal squad into squad_optimizations table."""
    df = await fetch_players_with_predictions(event_id=event_id)
    solution = solve_squad_optimization(df, budget=budget)

    async with AsyncSessionLocal() as session:
        async with session.begin():
            opt_record = SquadOptimization(
                event_id=event_id,
                total_budget=budget,
                total_expected_points=solution["total_expected_points"],
                starting_11_ids=solution["starting_11_ids"],
                bench_ids=solution["bench_ids"],
                captain_id=solution["captain_id"],
                vice_captain_id=solution["vice_captain_id"],
                formation=solution["formation"],
                parameters={"budget": budget, "solver": "PuLP ILP CBC"},
            )
            session.add(opt_record)

    print(f"[OPTIMIZER] Solved & saved optimal squad ({solution['formation']}) for GW {event_id} into PostgreSQL.")
    return solution
