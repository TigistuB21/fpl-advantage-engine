"""
FPL Advantage Engine - Pydantic Response & Request Schemas
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = "online"
    database: str = "connected"
    version: str = "1.0.0"


class PlayerPredictionItem(BaseModel):
    player_id: int
    web_name: str
    first_name: Optional[str] = None
    second_name: Optional[str] = None
    team_id: int
    team_name: str
    team_short: str
    element_type: str  # 'GKP', 'DEF', 'MID', 'FWD'
    now_cost: int      # in 10ths
    price_m: float     # in millions (£)
    status: str        # 'a', 'd', 'i', 's'
    selected_by_percent: float
    predicted_xp: float


class PredictionsListResponse(BaseModel):
    event_id: int
    count: int
    players: List[PlayerPredictionItem]


class OptimizeRequest(BaseModel):
    budget: float = Field(default=100.0, ge=50.0, le=150.0, description="Total squad budget in £ millions")
    event_id: int = Field(default=1, ge=1, le=38, description="Target Gameweek number")
    locked_player_ids: Optional[List[int]] = Field(default=None, description="Player IDs that must be included")
    excluded_player_ids: Optional[List[int]] = Field(default=None, description="Player IDs that must be excluded")


class SquadOptimizationResponse(BaseModel):
    optimization_id: Optional[int] = None
    event_id: int
    formation: str
    total_budget: float
    total_cost: float
    total_expected_points: float
    bench_expected_points: float
    captain_id: int
    vice_captain_id: int
    starting_11: List[PlayerPredictionItem]
    bench: List[PlayerPredictionItem]
    parameters: Optional[Dict[str, Any]] = None
