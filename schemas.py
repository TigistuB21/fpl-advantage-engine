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


class FixtureItem(BaseModel):
    event_id: int
    opponent_name: str
    opponent_short: str
    is_home: bool
    difficulty: int


class PlayerDetailResponse(BaseModel):
    player_id: int
    web_name: str
    first_name: Optional[str] = None
    second_name: Optional[str] = None
    team_name: str
    team_short: str
    element_type: str
    price_m: float
    status: str
    selected_by_percent: float
    predicted_xp: float
    underlying_stats: Dict[str, Any]
    upcoming_fixtures: List[FixtureItem]


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


class UserSquadResponse(BaseModel):
    manager_id: int
    event_id: int
    player_name: str
    team_name: str
    bank_m: float
    free_transfers: int
    starting_11: List[PlayerPredictionItem]
    bench: List[PlayerPredictionItem]


class TransferOptimizationRequest(BaseModel):
    current_squad_ids: List[int] = Field(..., description="List of 15 player IDs in user's current squad")
    bank: float = Field(default=0.0, ge=0.0, le=100.0, description="Available bank balance in £ millions")
    free_transfers: int = Field(default=1, ge=0, le=5, description="Number of available free transfers")
    max_transfers: int = Field(default=2, ge=0, le=5, description="Maximum transfers allowed to evaluate")
    event_id: int = Field(default=1, ge=1, le=38, description="Target Gameweek number")


class TransferItem(BaseModel):
    transferred_out: PlayerPredictionItem
    transferred_in: PlayerPredictionItem


class TransferOptimizationResponse(BaseModel):
    event_id: int
    formation: str
    transfers_made: int
    free_transfers: int
    hits_taken: int
    hit_penalty: float
    transfers: List[TransferItem]
    starting_11: List[PlayerPredictionItem]
    bench: List[PlayerPredictionItem]
    captain_id: int
    vice_captain_id: int
    total_expected_points: float
    net_xp_gain: float
    remaining_bank: float


class ExplainTransferRequest(BaseModel):
    user_squad: Dict[str, Any] = Field(..., description="User squad context (manager_id, player_name, team_name, bank_m, free_transfers)")
    transfer_result: Dict[str, Any] = Field(..., description="PuLP transfer optimization output")


class ExplainTransferResponse(BaseModel):
    explanation: str
    director_name: str
    model_version: str
    is_fallback: bool


class ChipScenarioItem(BaseModel):
    chip_code: str
    chip_name: str
    projected_xp: float
    xp_delta: float
    recommendation: str


class ChipOptimizationResponse(BaseModel):
    manager_id: int
    event_id: int
    baseline_xp: float
    chips: List[ChipScenarioItem]
    best_chip: str
    best_chip_name: str
    best_chip_delta: float



