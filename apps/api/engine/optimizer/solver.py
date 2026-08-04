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

    # Constraint 1: Every player can be at most either a starter OR a bench player (not both)
    for i in player_ids:
        prob += (x[i] + y[i]) <= 1

    # Constraint 2: Exactly 15 total squad players
    prob += pulp.lpSum([x[i] + y[i] for i in player_ids]) == 15

    # Constraint 3: Exactly 11 starting players
    prob += pulp.lpSum([x[i] for i in player_ids]) == 11

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


def optimize_user_transfers(
    current_squad_ids: List[int],
    bank: float = 0.0,
    free_transfers: int = 1,
    max_transfers: int = 2,
    event_id: int = 1,
    df: Optional[pd.DataFrame] = None,
) -> Dict[str, Any]:
    """
    Evaluates optimal transfers IN and OUT for an existing 15-player user squad using PuLP ILP.
    Enforces total budget, squad composition, team constraints, and deducts 4 points per hit.
    """
    if df is None or df.empty:
        raise ValueError("Player dataset is empty. Run predictor.py first.")

    df = df.copy()
    df["cost_m"] = df["now_cost"] / 10.0

    current_squad_set = set(current_squad_ids)
    if len(current_squad_set) != 15:
        raise ValueError(f"Expected exactly 15 player IDs in current squad, got {len(current_squad_set)}.")

    current_squad_df = df[df["player_id"].isin(current_squad_set)]
    squad_value = current_squad_df["cost_m"].sum()
    total_budget_m = squad_value + bank
    total_budget_tenths = int(round(total_budget_m * 10))

    player_ids = df["player_id"].tolist()
    xp_dict = dict(zip(df["player_id"], df["predicted_xp"]))
    cost_dict = dict(zip(df["player_id"], df["now_cost"]))
    team_dict = dict(zip(df["player_id"], df["team_id"]))
    pos_dict = dict(zip(df["player_id"], df["element_type"]))

    prob = pulp.LpProblem("FPL_Transfer_Optimizer", pulp.LpMaximize)

    # Binary Decision Variables
    x = pulp.LpVariable.dicts("starter", player_ids, cat=pulp.LpBinary)
    y = pulp.LpVariable.dicts("bench", player_ids, cat=pulp.LpBinary)
    c = pulp.LpVariable.dicts("captain", player_ids, cat=pulp.LpBinary)
    t_in = pulp.LpVariable.dicts("transfer_in", player_ids, cat=pulp.LpBinary)
    t_out = pulp.LpVariable.dicts("transfer_out", player_ids, cat=pulp.LpBinary)

    hits_var = pulp.LpVariable("hits", lowBound=0, cat=pulp.LpInteger)

    # Objective: Maximize (Starter xP + 0.1 * Bench xP + Captain Bonus xP - 4 * Hits)
    prob += pulp.lpSum([
        (xp_dict[i] * x[i]) + (0.1 * xp_dict[i] * y[i]) + (xp_dict[i] * c[i])
        for i in player_ids
    ]) - 4.0 * hits_var

    # Constraint 1: Squad selection link with current squad
    for i in player_ids:
        if i in current_squad_set:
            prob += (x[i] + y[i]) == 1 - t_out[i]
            prob += t_in[i] == 0
        else:
            prob += (x[i] + y[i]) == t_in[i]
            prob += t_out[i] == 0

    # Constraint 2: Total transfers in = total transfers out
    prob += pulp.lpSum([t_in[i] for i in player_ids]) == pulp.lpSum([t_out[i] for i in player_ids])

    # Constraint 3: Max transfers limit
    prob += pulp.lpSum([t_in[i] for i in player_ids]) <= max_transfers

    # Constraint 4: Hits calculation constraint
    prob += hits_var >= pulp.lpSum([t_in[i] for i in player_ids]) - free_transfers
    prob += hits_var >= 0

    # Constraint 5: Squad size = 15, Starters = 11
    prob += pulp.lpSum([x[i] + y[i] for i in player_ids]) == 15
    prob += pulp.lpSum([x[i] for i in player_ids]) == 11

    # Constraint 6: Total budget limit
    prob += pulp.lpSum([cost_dict[i] * (x[i] + y[i]) for i in player_ids]) <= total_budget_tenths

    # Constraint 7: Positional quotas (15 squad: 2 GKP, 5 DEF, 5 MID, 3 FWD)
    prob += pulp.lpSum([x[i] + y[i] for i in player_ids if pos_dict[i] == "GKP"]) == 2
    prob += pulp.lpSum([x[i] + y[i] for i in player_ids if pos_dict[i] == "DEF"]) == 5
    prob += pulp.lpSum([x[i] + y[i] for i in player_ids if pos_dict[i] == "MID"]) == 5
    prob += pulp.lpSum([x[i] + y[i] for i in player_ids if pos_dict[i] == "FWD"]) == 3

    # Constraint 8: Starting 11 formation (1 GKP, 3-5 DEF, 2-5 MID, 1-3 FWD)
    prob += pulp.lpSum([x[i] for i in player_ids if pos_dict[i] == "GKP"]) == 1
    prob += pulp.lpSum([x[i] for i in player_ids if pos_dict[i] == "DEF"]) >= 3
    prob += pulp.lpSum([x[i] for i in player_ids if pos_dict[i] == "DEF"]) <= 5
    prob += pulp.lpSum([x[i] for i in player_ids if pos_dict[i] == "MID"]) >= 2
    prob += pulp.lpSum([x[i] for i in player_ids if pos_dict[i] == "MID"]) <= 5
    prob += pulp.lpSum([x[i] for i in player_ids if pos_dict[i] == "FWD"]) >= 1
    prob += pulp.lpSum([x[i] for i in player_ids if pos_dict[i] == "FWD"]) <= 3

    # Constraint 9: Max 3 players per team
    teams = df["team_id"].unique()
    for t in teams:
        prob += pulp.lpSum([x[i] + y[i] for i in player_ids if team_dict[i] == t]) <= 3

    # Constraint 10: Captain
    prob += pulp.lpSum([c[i] for i in player_ids]) == 1
    for i in player_ids:
        prob += c[i] <= x[i]

    solver = pulp.PULP_CBC_CMD(msg=False)
    status = prob.solve(solver)

    if status != pulp.LpStatusOptimal:
        raise RuntimeError(f"Transfer optimization failed. Status: {pulp.LpStatus[status]}")

    starter_ids = [i for i in player_ids if pulp.value(x[i]) > 0.5]
    bench_ids = [i for i in player_ids if pulp.value(y[i]) > 0.5]
    captain_id = [i for i in player_ids if pulp.value(c[i]) > 0.5][0]
    out_ids = [i for i in player_ids if pulp.value(t_out[i]) > 0.5]
    in_ids = [i for i in player_ids if pulp.value(t_in[i]) > 0.5]

    hits_taken = int(round(pulp.value(hits_var)))
    hit_penalty = hits_taken * 4.0
    transfers_made = len(in_ids)

    starters_df = df[df["player_id"].isin(starter_ids)].sort_values("predicted_xp", ascending=False)
    non_cap_starters = starters_df[starters_df["player_id"] != captain_id]
    vice_captain_id = int(non_cap_starters.iloc[0]["player_id"]) if not non_cap_starters.empty else int(captain_id)

    def_count = len([i for i in starter_ids if pos_dict[i] == "DEF"])
    mid_count = len([i for i in starter_ids if pos_dict[i] == "MID"])
    fwd_count = len([i for i in starter_ids if pos_dict[i] == "FWD"])
    formation = f"{def_count}-{mid_count}-{fwd_count}"

    new_squad_df = df[df["player_id"].isin(starter_ids + bench_ids)]
    new_squad_cost = new_squad_df["cost_m"].sum()
    remaining_bank = round(total_budget_m - new_squad_cost, 2)

    curr_squad_df = df[df["player_id"].isin(current_squad_set)].sort_values("predicted_xp", ascending=False)
    initial_xp_estimate = curr_squad_df.head(11)["predicted_xp"].sum()

    starters_xp = starters_df["predicted_xp"].sum() + xp_dict[captain_id]
    total_xp_after_penalty = starters_xp - hit_penalty
    net_xp_gain = round(total_xp_after_penalty - initial_xp_estimate, 2)

    return {
        "event_id": event_id,
        "transfers_made": transfers_made,
        "free_transfers": free_transfers,
        "hits_taken": hits_taken,
        "hit_penalty": hit_penalty,
        "transferred_out_ids": out_ids,
        "transferred_in_ids": in_ids,
        "starting_11_ids": starter_ids,
        "bench_ids": bench_ids,
        "captain_id": int(captain_id),
        "vice_captain_id": vice_captain_id,
        "formation": formation,
        "total_expected_points": round(float(starters_xp), 2),
        "net_xp_gain": float(net_xp_gain),
        "remaining_bank": max(0.0, float(remaining_bank)),
        "starters_detail": starters_df.to_dict(orient="records"),
        "bench_detail": df[df["player_id"].isin(bench_ids)].sort_values("element_type").to_dict(orient="records"),
    }


async def evaluate_chip_strategies(
    current_squad_ids: List[int],
    bank: float = 0.0,
    free_transfers: int = 1,
    event_id: int = 1,
    df: Optional[pd.DataFrame] = None,
) -> Dict[str, Any]:
    """
    Evaluates 4 FPL Chip Deployment scenarios for the current gameweek:
      1. Baseline: Standard optimal transfer solution (max 2 transfers)
      2. Triple Captain (TC): Multiplies highest xP starter by 3 (adds 1x Captain xP)
      3. Bench Boost (BB): Adds 100% of the 4 bench players' projected xP
      4. Free Hit (FH): Solves 1-week optimal 15-man squad from scratch with 0 hit penalty
    """
    if df is None or df.empty:
        df = await fetch_players_with_predictions(event_id=event_id)

    if df.empty:
        raise ValueError(f"No player predictions found for Gameweek {event_id}.")

    # Scenario 1: Baseline (Standard Transfers)
    baseline_sol = optimize_user_transfers(
        current_squad_ids=current_squad_ids,
        bank=bank,
        free_transfers=free_transfers,
        max_transfers=2,
        event_id=event_id,
        df=df,
    )
    baseline_xp = float(baseline_sol["total_expected_points"])
    captain_id = baseline_sol["captain_id"]

    # Extract captain xP
    player_xp_map = dict(zip(df["player_id"], df["predicted_xp"]))
    captain_xp = float(player_xp_map.get(captain_id, 0.0))

    # Scenario 2: Triple Captain (TC)
    tc_xp = round(baseline_xp + captain_xp, 2)
    tc_delta = round(tc_xp - baseline_xp, 2)

    # Scenario 3: Bench Boost (BB)
    bench_ids = baseline_sol["bench_ids"]
    bench_xp_sum = sum(float(player_xp_map.get(pid, 0.0)) for pid in bench_ids)
    bb_xp = round(baseline_xp + bench_xp_sum, 2)
    bb_delta = round(bb_xp - baseline_xp, 2)

    # Scenario 4: Free Hit (FH)
    current_squad_df = df[df["player_id"].isin(current_squad_ids)]
    team_value_m = (current_squad_df["now_cost"].sum() / 10.0) + bank
    fh_sol = solve_squad_optimization(df, budget=team_value_m)
    fh_xp = float(fh_sol["total_expected_points"])
    fh_delta = round(fh_xp - baseline_xp, 2)

    chips = [
        {
            "chip_code": "baseline",
            "chip_name": "No Chip (Baseline)",
            "projected_xp": baseline_xp,
            "xp_delta": 0.0,
            "recommendation": "Standard transfer strategy without activating a chip.",
        },
        {
            "chip_code": "3xc",
            "chip_name": "Triple Captain",
            "projected_xp": tc_xp,
            "xp_delta": tc_delta,
            "recommendation": (
                f"Play TC if captain xP gain (+{tc_delta:.1f} xP) > +10.0 xP threshold."
                if tc_delta >= 10.0 else "Save TC for a Double Gameweek."
            ),
        },
        {
            "chip_code": "bboost",
            "chip_name": "Bench Boost",
            "projected_xp": bb_xp,
            "xp_delta": bb_delta,
            "recommendation": (
                f"Play Bench Boost if bench xP gain (+{bb_delta:.1f} xP) > +10.0 xP threshold."
                if bb_delta >= 10.0 else "Save Bench Boost for a DGW when all 15 players play twice."
            ),
        },
        {
            "chip_code": "freehit",
            "chip_name": "Free Hit",
            "projected_xp": fh_xp,
            "xp_delta": fh_delta,
            "recommendation": (
                f"Play Free Hit if squad overhaul gain (+{fh_delta:.1f} xP) > +15.0 xP threshold."
                if fh_delta >= 15.0 else "Save Free Hit for a major Blank Gameweek."
            ),
        },
    ]

    best_chip = max(chips[1:], key=lambda c: c["xp_delta"])

    return {
        "event_id": event_id,
        "baseline_xp": baseline_xp,
        "chips": chips,
        "best_chip": best_chip["chip_code"] if best_chip["xp_delta"] > 0 else "none",
        "best_chip_name": best_chip["chip_name"] if best_chip["xp_delta"] > 0 else "No Chip",
        "best_chip_delta": best_chip["xp_delta"],
    }

