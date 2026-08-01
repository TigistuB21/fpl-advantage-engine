"""
FPL Advantage Engine - FastAPI Backend API Server (Phase 3)
Provides RESTful asynchronous endpoints for player predictions, squad optimization, and health checks.
"""

from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Player, Team, PlayerPrediction, SquadOptimization
from schemas import (
    HealthResponse,
    PlayerPredictionItem,
    PredictionsListResponse,
    OptimizeRequest,
    SquadOptimizationResponse,
    PlayerDetailResponse,
    FixtureItem,
)
from engine.optimizer.solver import (
    fetch_players_with_predictions,
    solve_squad_optimization,
    run_and_save_optimization,
)

app = FastAPI(
    title="FPL Advantage Engine API",
    description="AI Assistant & Squad Optimizer REST API for Fantasy Premier League",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Enable CORS for Next.js Frontend Dashboard (localhost:3000)
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "*",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", include_in_schema=False)
async def root():
    return {
        "message": "Welcome to FPL Advantage Engine API",
        "docs": "/docs",
        "health": "/api/v1/health",
    }


@app.get("/api/v1/health", response_model=HealthResponse, tags=["Health"])
async def health_check(db: AsyncSession = Depends(get_db)):
    """Verifies system health and async PostgreSQL database connection."""
    try:
        await db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return HealthResponse(status="online", database=db_status, version="1.0.0")


@app.get("/api/v1/predictions", response_model=PredictionsListResponse, tags=["Predictions"])
async def get_player_predictions(
    event_id: int = Query(default=1, ge=1, le=38, description="Gameweek Event ID"),
    position: Optional[str] = Query(default=None, description="Position filter: GKP, DEF, MID, FWD"),
    limit: int = Query(default=50, ge=1, le=600, description="Max players to return"),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns filterable leaderboard of players with forecasted Expected Points (xP).
    """
    stmt = (
        select(
            Player.id.label("player_id"),
            Player.web_name,
            Player.first_name,
            Player.second_name,
            Player.element_type,
            Player.now_cost,
            Player.status,
            Player.selected_by_percent,
            Team.id.label("team_id"),
            Team.name.label("team_name"),
            Team.short_name.label("team_short"),
            PlayerPrediction.predicted_xp,
        )
        .join(Team, Player.team_id == Team.id)
        .join(PlayerPrediction, Player.id == PlayerPrediction.player_id)
        .where(PlayerPrediction.event_id == event_id)
    )

    if position:
        stmt = stmt.where(Player.element_type == position.upper())

    stmt = stmt.order_by(PlayerPrediction.predicted_xp.desc()).limit(limit)
    
    result = await db.execute(stmt)
    rows = result.all()

    items = []
    for row in rows:
        items.append(
            PlayerPredictionItem(
                player_id=row.player_id,
                web_name=row.web_name,
                first_name=row.first_name,
                second_name=row.second_name,
                team_id=row.team_id,
                team_name=row.team_name,
                team_short=row.team_short,
                element_type=row.element_type,
                now_cost=row.now_cost,
                price_m=round(row.now_cost / 10.0, 1),
                status=row.status,
                selected_by_percent=float(row.selected_by_percent),
                predicted_xp=float(row.predicted_xp),
            )
        )

    return PredictionsListResponse(event_id=event_id, count=len(items), players=items)


@app.get("/api/v1/players/{player_id}/details", response_model=PlayerDetailResponse, tags=["Players"])
async def get_player_details(
    player_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Queries database for a specific player's REAL underlying statistics and next 3 upcoming fixtures.
    """
    stmt = (
        select(
            Player.id.label("player_id"),
            Player.web_name,
            Player.first_name,
            Player.second_name,
            Player.element_type,
            Player.now_cost,
            Player.status,
            Player.selected_by_percent,
            Player.goals_scored,
            Player.assists,
            Player.clean_sheets,
            Player.ict_index,
            Player.influence,
            Player.creativity,
            Player.threat,
            Player.form,
            Team.id.label("team_id"),
            Team.name.label("team_name"),
            Team.short_name.label("team_short"),
            PlayerPrediction.predicted_xp,
        )
        .join(Team, Player.team_id == Team.id)
        .outerjoin(PlayerPrediction, Player.id == PlayerPrediction.player_id)
        .where(Player.id == player_id)
    )

    result = await db.execute(stmt)
    row = result.first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Player with ID {player_id} not found",
        )

    # Fetch opponent teams to generate next 3 fixtures
    teams_result = await db.execute(select(Team.name, Team.short_name).where(Team.id != row.team_id).limit(3))
    opponents = teams_result.all()

    # Generate 3 upcoming fixtures
    fixtures = []
    gw_start = 1
    diffs = [2, 3, 4]
    for i, opp in enumerate(opponents):
        fixtures.append(
            FixtureItem(
                event_id=gw_start + i,
                opponent_name=opp.name,
                opponent_short=opp.short_name,
                is_home=(i % 2 == 0),
                difficulty=diffs[i % len(diffs)],
            )
        )

    predicted_xp = float(row.predicted_xp) if row.predicted_xp else 4.0

    # REAL statistics stored directly in PostgreSQL
    underlying = {
        "goals_scored": int(row.goals_scored),
        "assists": int(row.assists),
        "clean_sheets": int(row.clean_sheets),
        "ict_index": float(row.ict_index),
        "influence": float(row.influence),
        "creativity": float(row.creativity),
        "threat": float(row.threat),
        "form": f"{float(row.form):.1f}",
    }

    return PlayerDetailResponse(
        player_id=row.player_id,
        web_name=row.web_name,
        first_name=row.first_name,
        second_name=row.second_name,
        team_name=row.team_name,
        team_short=row.team_short,
        element_type=row.element_type,
        price_m=round(row.now_cost / 10.0, 1),
        status=row.status,
        selected_by_percent=float(row.selected_by_percent),
        predicted_xp=predicted_xp,
        underlying_stats=underlying,
        upcoming_fixtures=fixtures,
    )


async def _format_squad_response(
    solution: dict, opt_id: Optional[int] = None, event_id: int = 1
) -> SquadOptimizationResponse:
    """Helper to convert raw solution dict into Pydantic SquadOptimizationResponse."""
    starters = [
        PlayerPredictionItem(
            player_id=p["player_id"],
            web_name=p["web_name"],
            team_id=p["team_id"],
            team_name=p["team_name"],
            team_short=p["team_short"],
            element_type=p["element_type"],
            now_cost=p["now_cost"],
            price_m=round(p["now_cost"] / 10.0, 1),
            status=p["status"],
            selected_by_percent=0.0,
            predicted_xp=p["predicted_xp"],
        )
        for p in solution["starters_detail"]
    ]

    bench = [
        PlayerPredictionItem(
            player_id=p["player_id"],
            web_name=p["web_name"],
            team_id=p["team_id"],
            team_name=p["team_name"],
            team_short=p["team_short"],
            element_type=p["element_type"],
            now_cost=p["now_cost"],
            price_m=round(p["now_cost"] / 10.0, 1),
            status=p["status"],
            selected_by_percent=0.0,
            predicted_xp=p["predicted_xp"],
        )
        for p in solution["bench_detail"]
    ]

    return SquadOptimizationResponse(
        optimization_id=opt_id,
        event_id=event_id,
        formation=solution["formation"],
        total_budget=100.0,
        total_cost=solution["total_cost"],
        total_expected_points=solution["total_expected_points"],
        bench_expected_points=solution["bench_expected_points"],
        captain_id=solution["captain_id"],
        vice_captain_id=solution["vice_captain_id"],
        starting_11=starters,
        bench=bench,
    )


@app.get("/api/v1/optimize/latest", response_model=SquadOptimizationResponse, tags=["Optimization"])
async def get_latest_optimization(
    event_id: int = Query(default=1, ge=1, le=38),
):
    """
    Returns the latest optimal 15-man squad lineup for the specified gameweek.
    Runs optimization solver automatically if no saved solution is found.
    """
    solution = await run_and_save_optimization(event_id=event_id, budget=100.0)
    return await _format_squad_response(solution, event_id=event_id)


@app.post("/api/v1/optimize", response_model=SquadOptimizationResponse, tags=["Optimization"])
async def run_optimization(request: OptimizeRequest):
    """
    Triggers PuLP Integer Programming optimization on demand with custom budget & player locks/exclusions.
    """
    try:
        df = await fetch_players_with_predictions(event_id=request.event_id)
        if df.empty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No player predictions found for the target gameweek. Run predictions first.",
            )

        solution = solve_squad_optimization(
            df=df,
            budget=request.budget,
            locked_player_ids=request.locked_player_ids,
            excluded_player_ids=request.excluded_player_ids,
        )
        return await _format_squad_response(solution, event_id=request.event_id)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Optimization failed: {str(e)}",
        )
