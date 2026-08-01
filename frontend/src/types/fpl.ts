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
  price_m: number;
  status: string;
  selected_by_percent: number;
  predicted_xp: number;
}

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
