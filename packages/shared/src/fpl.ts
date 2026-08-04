export interface FixtureData {
  opponent: string;
  is_home: boolean;
  difficulty: number;
  xp: number;
}

export interface PlayerPrediction {
  player_id: number;
  web_name: string;
  first_name?: string;
  second_name?: string;
  team_id: number;
  team_name: string;
  team_short: string;
  element_type: 'GKP' | 'DEF' | 'MID' | 'FWD';
  now_cost: number;
  price_m: float;
  status: string;
  selected_by_percent: number;
  predicted_xp: number;
  upcoming_fixtures?: Record<number, FixtureData[]>;
}

export type float = number;

export interface PredictionsListResponse {
  event_id: number;
  count: number;
  players: PlayerPrediction[];
}

export interface SquadOptimization {
  optimization_id?: number;
  event_id: number;
  formation: string;
  total_budget: number;
  total_cost: number;
  total_expected_points: number;
  bench_expected_points: number;
  captain_id: number;
  vice_captain_id: number;
  starting_11: PlayerPrediction[];
  bench: PlayerPrediction[];
}

export interface Fixture {
  event_id: number;
  opponent_name: string;
  opponent_short: string;
  is_home: boolean;
  difficulty: number;
}

export interface PlayerDetail extends PlayerPrediction {
  underlying_stats: {
    goals_scored: number;
    assists: number;
    clean_sheets: number;
    ict_index: number;
    influence: number;
    creativity: number;
    threat: number;
    form: string;
  };
  upcoming_fixtures: Fixture[] | Record<number, FixtureData[]> | any;
}

export interface UserSquadResponse {
  manager_id: number;
  event_id: number;
  player_name: string;
  team_name: string;
  bank_m: number;
  free_transfers: number;
  starting_11: PlayerPrediction[];
  bench: PlayerPrediction[];
}

export interface TransferItem {
  transferred_out: PlayerPrediction;
  transferred_in: PlayerPrediction;
}

export interface TransferOptimizationResponse {
  event_id: number;
  formation: string;
  transfers_made: number;
  free_transfers: number;
  hits_taken: number;
  hit_penalty: number;
  transfers: TransferItem[];
  starting_11: PlayerPrediction[];
  bench: PlayerPrediction[];
  captain_id: number;
  vice_captain_id: number;
  total_expected_points: number;
  net_xp_gain: number;
  remaining_bank: number;
}

export interface ExplainTransferResponse {
  explanation: string;
  director_name: string;
  model_version: string;
  is_fallback: boolean;
}

export interface ChipScenarioItem {
  chip_code: 'baseline' | '3xc' | 'bboost' | 'freehit' | string;
  chip_name: string;
  projected_xp: number;
  xp_delta: number;
  recommendation: string;
}

export interface ChipOptimizationResponse {
  manager_id: number;
  event_id: number;
  baseline_xp: number;
  chips: ChipScenarioItem[];
  best_chip: string;
  best_chip_name: string;
  best_chip_delta: number;
}
