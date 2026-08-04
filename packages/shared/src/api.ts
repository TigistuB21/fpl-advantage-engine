import {
  PlayerPrediction,
  PredictionsListResponse,
  SquadOptimization,
  PlayerDetail,
  UserSquadResponse,
  TransferOptimizationResponse,
  ExplainTransferResponse,
  ChipOptimizationResponse,
} from './fpl';

let customApiBaseUrl: string | null = null;

export function setApiBaseUrl(url: string) {
  customApiBaseUrl = url;
}

export function getApiBaseUrl(): string {
  if (customApiBaseUrl) return customApiBaseUrl;
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  return 'http://172.16.131.188:8000';
}

/**
 * Fetches top predicted players from the FastAPI backend (/api/v1/predictions).
 */
export async function getTopPredictions(limit: number = 5, eventId: number = 1): Promise<PlayerPrediction[]> {
  try {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/api/v1/predictions?limit=${limit}&event_id=${eventId}`, {
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
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/api/v1/players/${playerId}/details`, {
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
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/api/v1/optimize/latest?event_id=${eventId}`, {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Failed to fetch optimization: ${res.statusText}`);
    return await res.json();
  } catch (error) {
    console.error('Error fetching optimal squad:', error);
    return null;
  }
}

/**
 * [Phase 12.5] Fetches the ML-generated global optimal Team of the Week (/api/v1/optimize/totw).
 */
export async function getOptimalTeamOfTheWeek(eventId: number = 1): Promise<SquadOptimization | null> {
  try {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/api/v1/optimize/totw?event_id=${eventId}`, {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Failed to fetch TOTW: ${res.statusText}`);
    return await res.json();
  } catch (error) {
    console.error('Error fetching Team of the Week:', error);
    return null;
  }
}

/**
 * Fetches an official FPL manager's imported squad and bank info (/api/v1/user/{manager_id}/squad).
 */
export async function getUserSquad(
  managerId: number,
  eventId?: number
): Promise<{ data: UserSquadResponse | null; error?: string }> {
  try {
    const baseUrl = getApiBaseUrl();
    const url = eventId
      ? `${baseUrl}/api/v1/user/${managerId}/squad?event_id=${eventId}`
      : `${baseUrl}/api/v1/user/${managerId}/squad`;
    const res = await fetch(url, {
      cache: 'no-store',
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const detail = errJson.detail || `Unable to fetch FPL squad for Manager ID #${managerId}`;
      return { data: null, error: detail };
    }
    const data = await res.json();
    return { data, error: undefined };
  } catch (error) {
    return { data: null, error: `Network error connecting to FastAPI backend.` };
  }
}

/**
 * Triggers PuLP transfer optimization for a user squad (/api/v1/optimize/transfers).
 */
export async function getTransferOptimization(
  squadIds: number[],
  bank: number,
  freeTransfers: number,
  maxTransfers: number = 2,
  eventId: number = 1,
  activeChip?: string
): Promise<TransferOptimizationResponse | null> {
  try {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/api/v1/optimize/transfers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        current_squad_ids: squadIds,
        bank,
        free_transfers: freeTransfers,
        max_transfers: maxTransfers,
        event_id: eventId,
        active_chip: activeChip,
      }),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Failed transfer optimization: ${res.statusText}`);
    return await res.json();
  } catch (error) {
    console.error('Error fetching transfer optimization:', error);
    return null;
  }
}

/**
 * [Phase 14 & 16] Alias function for optimal transfer suggestions.
 */
export async function getOptimalTransfers(
  squadIds: number[],
  bank: number = 1.5,
  freeTransfers: number = 1,
  eventId: number = 1,
  activeChip?: string
): Promise<TransferOptimizationResponse | null> {
  return getTransferOptimization(squadIds, bank, freeTransfers, 2, eventId, activeChip);
}

/**
 * Calls FastAPI LLM endpoint (/api/v1/chat/explain-transfer) to get Director of Football explanation.
 */
export async function getTransferExplanation(
  squadContext: UserSquadResponse,
  transferContext: TransferOptimizationResponse,
  chipContext?: ChipOptimizationResponse | null
): Promise<ExplainTransferResponse | null> {
  try {
    const baseUrl = getApiBaseUrl();
    const payload: any = {
      user_squad: squadContext,
      transfer_result: transferContext,
    };
    if (chipContext) {
      payload.transfer_result.chip_strategy = {
        best_chip: chipContext.best_chip_name,
        best_chip_delta: chipContext.best_chip_delta,
        chips: chipContext.chips,
      };
    }

    const res = await fetch(`${baseUrl}/api/v1/chat/explain-transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Failed to fetch explanation: ${res.statusText}`);
    return await res.json();
  } catch (error) {
    console.error('Error fetching Director of Football explanation:', error);
    return null;
  }
}

/**
 * Fetches 4-chip ROI scenario evaluations for a manager squad (/api/v1/optimize/chips/{manager_id}).
 */
export async function getChipOptimization(
  managerId: number,
  eventId: number = 1
): Promise<ChipOptimizationResponse | null> {
  try {
    const baseUrl = getApiBaseUrl();
    const res = await fetch(`${baseUrl}/api/v1/optimize/chips/${managerId}?event_id=${eventId}`, {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Failed to fetch chip optimization: ${res.statusText}`);
    return await res.json();
  } catch (error) {
    console.error('Error fetching chip optimization:', error);
    return null;
  }
}
