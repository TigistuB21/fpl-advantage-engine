import { PlayerPrediction, PredictionsListResponse, SquadOptimization, PlayerDetail } from '../types/fpl';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Fetches top predicted players from the FastAPI backend (/api/v1/predictions).
 */
export async function getTopPredictions(limit: number = 5, eventId: number = 1): Promise<PlayerPrediction[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/predictions?limit=${limit}&event_id=${eventId}`, {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Failed to fetch predictions: ${res.statusText}`);
    const data: PredictionsListResponse = await res.json();
    return data.players;
  } catch (error) {
    console.error('Error fetching top predictions:', error);
    return [];
  }
}

/**
 * Fetches detailed underlying stats and next 3 upcoming fixtures for a specific player (/api/v1/players/{id}/details).
 */
export async function getPlayerDetails(playerId: number): Promise<PlayerDetail | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/players/${playerId}/details`, {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Failed to fetch player details: ${res.statusText}`);
    return await res.json();
  } catch (error) {
    console.error('Error fetching player details:', error);
    return null;
  }
}

/**
 * Fetches the latest AI optimal 15-player squad from FastAPI (/api/v1/optimize/latest).
 */
export async function getLatestOptimization(eventId: number = 1): Promise<SquadOptimization | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/optimize/latest?event_id=${eventId}`, {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Failed to fetch optimization: ${res.statusText}`);
    return await res.json();
  } catch (error) {
    console.error('Error fetching optimal squad:', error);
    return null;
  }
}
