import { PlayerPrediction, PredictionsListResponse, SquadOptimization } from '../types/fpl';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Fetches the top predicted players from the FastAPI backend.
 */
export async function getTopPredictions(limit: number = 5, eventId: number = 1): Promise<PlayerPrediction[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/predictions?limit=${limit}&event_id=${eventId}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch predictions: ${res.statusText}`);
    }
    const data: PredictionsListResponse = await res.json();
    return data.players;
  } catch (error) {
    console.error('Error fetching top predictions:', error);
    return [];
  }
}

/**
 * Fetches the latest AI optimal 15-player squad from the FastAPI backend.
 */
export async function getLatestOptimization(eventId: number = 1): Promise<SquadOptimization | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/optimize/latest?event_id=${eventId}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch optimization: ${res.statusText}`);
    }
    const data: SquadOptimization = await res.json();
    return data;
  } catch (error) {
    console.error('Error fetching optimal squad:', error);
    return null;
  }
}

/**
 * Triggers PuLP Integer Programming optimization on demand with custom constraints.
 */
export async function triggerOptimization(
  budget: number = 100.0,
  eventId: number = 1,
  lockedPlayerIds: number[] = [],
  excludedPlayerIds: number[] = []
): Promise<SquadOptimization | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/optimize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        budget,
        event_id: eventId,
        locked_player_ids: lockedPlayerIds,
        excluded_player_ids: excludedPlayerIds,
      }),
    });
    if (!res.ok) {
      throw new Error(`Optimization failed: ${res.statusText}`);
    }
    const data: SquadOptimization = await res.json();
    return data;
  } catch (error) {
    console.error('Error triggering optimization:', error);
    return null;
  }
}
