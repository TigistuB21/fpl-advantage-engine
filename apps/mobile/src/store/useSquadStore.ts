import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getUserSquad,
  getTransferOptimization,
  getChipOptimization,
  getOptimalTeamOfTheWeek,
  UserSquadResponse,
  TransferOptimizationResponse,
  ChipOptimizationResponse,
  SquadOptimization,
  PlayerPrediction,
} from '@fpl-engine/shared';

export type ActiveChipType = 'NONE' | 'TC' | 'BB' | 'FH' | 'WC';

interface SquadState {
  managerId: number | null;
  isGuestMode: boolean;
  aiTeamOfTheWeek: SquadOptimization | null;
  currentSquad: UserSquadResponse | null;
  aiOptimizedSquad: TransferOptimizationResponse | null;
  chipOptimization: ChipOptimizationResponse | null;
  bank: number;
  freeTransfers: number;
  transferSuggestions: TransferOptimizationResponse | null;
  activeChip: ActiveChipType;
  targetGameweek: number;
  selectedPlayerId: number | null;
  customCaptainId: number | null;
  customViceCaptainId: number | null;
  isLoading: boolean;
  error: string | null;

  setManagerId: (id: number | null) => Promise<void>;
  setActiveChip: (chip: ActiveChipType) => void;
  toggleChip: (chip: ActiveChipType) => void;
  setTargetGameweek: (gw: number) => void;
  setSelectedPlayerId: (id: number | null) => void;
  setCustomCaptainId: (id: number) => void;
  setCustomViceCaptainId: (id: number) => void;
  swapPlayers: (idA: number, idB: number) => boolean;
  fetchTransferSuggestions: () => Promise<void>;
  applyPlannedTransfer: (playerOutId: number, playerIn: PlayerPrediction, priceDiff: number) => void;
  getTotalProjectedXp: () => number;
  fetchTeamOfTheWeek: () => Promise<void>;
  fetchSquadData: (managerId: number) => Promise<void>;
}

export const useSquadStore = create<SquadState>()(
  persist(
    (set, get) => ({
      managerId: null,
      isGuestMode: true,
      aiTeamOfTheWeek: null,
      currentSquad: null,
      aiOptimizedSquad: null,
      chipOptimization: null,
      bank: 1.5,
      freeTransfers: 1,
      transferSuggestions: null,
      activeChip: 'NONE',
      targetGameweek: 1,
      selectedPlayerId: null,
      customCaptainId: null,
      customViceCaptainId: null,
      isLoading: false,
      error: null,

      setActiveChip: (chip: ActiveChipType) =>
        set((state) => ({
          activeChip: state.activeChip === chip ? 'NONE' : chip,
        })),

      toggleChip: (chip: ActiveChipType) => {
        const nextChip = get().activeChip === chip ? 'NONE' : chip;
        set({ activeChip: nextChip });

        if (nextChip === 'WC' || nextChip === 'FH') {
          get().fetchTransferSuggestions();
        }
      },

      setTargetGameweek: (gw: number) =>
        set({ targetGameweek: gw }),

      setSelectedPlayerId: (id: number | null) =>
        set({ selectedPlayerId: id }),

      setCustomCaptainId: (id: number) =>
        set((state) => ({
          customCaptainId: id,
          customViceCaptainId: state.customViceCaptainId === id ? null : state.customViceCaptainId,
        })),

      setCustomViceCaptainId: (id: number) =>
        set((state) => ({
          customViceCaptainId: id,
          customCaptainId: state.customCaptainId === id ? null : state.customCaptainId,
        })),

      swapPlayers: (idA: number, idB: number) => {
        const { isGuestMode, currentSquad, aiTeamOfTheWeek } = get();

        if (isGuestMode && aiTeamOfTheWeek) {
          const starters = [...aiTeamOfTheWeek.starting_11];
          const bench = [...aiTeamOfTheWeek.bench];

          const indexAInStarters = starters.findIndex((p) => p.player_id === idA);
          const indexBInBench = bench.findIndex((p) => p.player_id === idB);

          const indexBInStarters = starters.findIndex((p) => p.player_id === idB);
          const indexAInBench = bench.findIndex((p) => p.player_id === idA);

          let newStarters = [...starters];
          let newBench = [...bench];

          if (indexAInStarters !== -1 && indexBInBench !== -1) {
            newStarters[indexAInStarters] = bench[indexBInBench];
            newBench[indexBInBench] = starters[indexAInStarters];
          } else if (indexBInStarters !== -1 && indexAInBench !== -1) {
            newStarters[indexBInStarters] = bench[indexAInBench];
            newBench[indexAInBench] = starters[indexBInStarters];
          } else {
            return false;
          }

          const gkps = newStarters.filter((p) => p.element_type === 'GKP').length;
          const defs = newStarters.filter((p) => p.element_type === 'DEF').length;
          const mids = newStarters.filter((p) => p.element_type === 'MID').length;
          const fwds = newStarters.filter((p) => p.element_type === 'FWD').length;

          if (gkps !== 1 || defs < 3 || mids < 2 || fwds < 1) {
            set({ error: 'Invalid formation: Must have 1 GKP, >=3 DEF, >=2 MID, >=1 FWD' });
            return false;
          }

          set({
            aiTeamOfTheWeek: {
              ...aiTeamOfTheWeek,
              starting_11: newStarters,
              bench: newBench,
              formation: `${defs}-${mids}-${fwds}`,
            },
            selectedPlayerId: null,
            error: null,
          });
          return true;
        } else if (currentSquad) {
          const starters = [...currentSquad.starting_11];
          const bench = [...currentSquad.bench];

          const indexAInStarters = starters.findIndex((p) => p.player_id === idA);
          const indexBInBench = bench.findIndex((p) => p.player_id === idB);

          const indexBInStarters = starters.findIndex((p) => p.player_id === idB);
          const indexAInBench = bench.findIndex((p) => p.player_id === idA);

          let newStarters = [...starters];
          let newBench = [...bench];

          if (indexAInStarters !== -1 && indexBInBench !== -1) {
            newStarters[indexAInStarters] = bench[indexBInBench];
            newBench[indexBInBench] = starters[indexAInStarters];
          } else if (indexBInStarters !== -1 && indexAInBench !== -1) {
            newStarters[indexBInStarters] = bench[indexAInBench];
            newBench[indexAInBench] = starters[indexBInStarters];
          } else {
            return false;
          }

          const gkps = newStarters.filter((p) => p.element_type === 'GKP').length;
          const defs = newStarters.filter((p) => p.element_type === 'DEF').length;
          const mids = newStarters.filter((p) => p.element_type === 'MID').length;
          const fwds = newStarters.filter((p) => p.element_type === 'FWD').length;

          if (gkps !== 1 || defs < 3 || mids < 2 || fwds < 1) {
            set({ error: 'Invalid formation: Must have 1 GKP, >=3 DEF, >=2 MID, >=1 FWD' });
            return false;
          }

          set({
            currentSquad: {
              ...currentSquad,
              starting_11: newStarters,
              bench: newBench,
            },
            selectedPlayerId: null,
            error: null,
          });
          return true;
        }

        return false;
      },

      fetchTransferSuggestions: async () => {
        const { isGuestMode, currentSquad, aiTeamOfTheWeek, bank, freeTransfers, activeChip } = get();
        let playerIds: number[] = [];

        if (isGuestMode && aiTeamOfTheWeek) {
          playerIds = [
            ...aiTeamOfTheWeek.starting_11.map((p) => p.player_id),
            ...aiTeamOfTheWeek.bench.map((p) => p.player_id),
          ];
        } else if (currentSquad) {
          playerIds = [
            ...currentSquad.starting_11.map((p) => p.player_id),
            ...currentSquad.bench.map((p) => p.player_id),
          ];
        }

        if (playerIds.length === 0) return;

        try {
          const maxTransfers = activeChip === 'WC' || activeChip === 'FH' ? 15 : 2;
          const res = await getTransferOptimization(playerIds, bank, freeTransfers, maxTransfers, 1, activeChip);
          set({ transferSuggestions: res });
        } catch (err) {
          console.error('Error fetching transfer suggestions:', err);
        }
      },

      applyPlannedTransfer: (playerOutId: number, playerIn: PlayerPrediction, priceDiff: number) => {
        const { isGuestMode, currentSquad, aiTeamOfTheWeek, bank } = get();

        const newBank = Math.max(0, Math.round((bank - priceDiff) * 10) / 10);

        if (isGuestMode && aiTeamOfTheWeek) {
          const newStarters = aiTeamOfTheWeek.starting_11.map((p) =>
            p.player_id === playerOutId ? playerIn : p
          );
          const newBench = aiTeamOfTheWeek.bench.map((p) =>
            p.player_id === playerOutId ? playerIn : p
          );

          set({
            bank: newBank,
            aiTeamOfTheWeek: {
              ...aiTeamOfTheWeek,
              starting_11: newStarters,
              bench: newBench,
            },
          });
        } else if (currentSquad) {
          const newStarters = currentSquad.starting_11.map((p) =>
            p.player_id === playerOutId ? playerIn : p
          );
          const newBench = currentSquad.bench.map((p) =>
            p.player_id === playerOutId ? playerIn : p
          );

          set({
            bank: newBank,
            currentSquad: {
              ...currentSquad,
              bank_m: newBank,
              starting_11: newStarters,
              bench: newBench,
            },
          });
        }
      },

      getTotalProjectedXp: () => {
        const { isGuestMode, currentSquad, aiTeamOfTheWeek, activeChip, customCaptainId, targetGameweek } = get();

        let starters: PlayerPrediction[] = [];
        let bench: PlayerPrediction[] = [];

        if (isGuestMode && aiTeamOfTheWeek) {
          starters = aiTeamOfTheWeek.starting_11;
          bench = aiTeamOfTheWeek.bench;
        } else if (currentSquad) {
          starters = currentSquad.starting_11;
          bench = currentSquad.bench;
        }

        if (starters.length === 0) return 60.0;

        const getPlayerGwXp = (p: PlayerPrediction): number => {
          const fixtures = p.upcoming_fixtures?.[targetGameweek];
          if (fixtures && fixtures.length > 0) {
            return fixtures.reduce((acc, f) => acc + (f.xp || 0), 0);
          }
          if (fixtures && fixtures.length === 0) {
            return 0.0; // BGW
          }
          return p.predicted_xp || 4.5;
        };

        let baseSum = starters.reduce((acc, p) => acc + getPlayerGwXp(p), 0);

        let captainPlayer = starters.find((p) => p.player_id === customCaptainId);
        if (!captainPlayer) {
          captainPlayer = [...starters].sort(
            (a, b) => getPlayerGwXp(b) - getPlayerGwXp(a)
          )[0];
        }

        const captainXp = getPlayerGwXp(captainPlayer);

        if (activeChip === 'TC') {
          baseSum += captainXp * 2;
        } else {
          baseSum += captainXp;
        }

        if (activeChip === 'BB') {
          const benchSum = bench.reduce((acc, p) => acc + getPlayerGwXp(p), 0);
          baseSum += benchSum;
        }

        return Math.round(baseSum * 10) / 10;
      },

      fetchTeamOfTheWeek: async () => {
        set({ isLoading: true, error: null });
        try {
          const totw = await getOptimalTeamOfTheWeek(1);
          set({
            aiTeamOfTheWeek: totw,
            isLoading: false,
            error: null,
          });
        } catch (err: any) {
          console.error('Error fetching TOTW:', err);
          set({
            isLoading: false,
            error: 'Failed to load Team of the Week',
          });
        }
      },

      fetchSquadData: async (managerId: number) => {
        set({ isLoading: true, error: null, managerId, isGuestMode: false });
        try {
          const { data: squad, error: squadErr } = await getUserSquad(managerId, 1);
          if (squadErr || !squad) {
            set({
              isLoading: false,
              error: squadErr || `Manager ID #${managerId} not found`,
            });
            return;
          }

          set({
            currentSquad: squad,
            bank: squad.bank_m ?? 1.5,
            freeTransfers: squad.free_transfers ?? 1,
          });

          const playerIds = [
            ...squad.starting_11.map((p) => p.player_id),
            ...squad.bench.map((p) => p.player_id),
          ];
          const [transferRes, chipRes] = await Promise.all([
            getTransferOptimization(playerIds, squad.bank_m ?? 1.5, squad.free_transfers ?? 1, 2, 1),
            getChipOptimization(managerId, 1),
          ]);

          set({
            aiOptimizedSquad: transferRes,
            transferSuggestions: transferRes,
            chipOptimization: chipRes,
            isLoading: false,
            error: null,
          });
        } catch (err: any) {
          console.error('Error in fetchSquadData:', err);
          set({
            isLoading: false,
            error: err.message || 'Failed to fetch squad data',
          });
        }
      },

      setManagerId: async (id: number | null) => {
        if (id === null || isNaN(id) || id <= 0) {
          set({
            managerId: null,
            isGuestMode: true,
            currentSquad: null,
            aiOptimizedSquad: null,
            customCaptainId: null,
            customViceCaptainId: null,
          });
          await get().fetchTeamOfTheWeek();
        } else {
          set({
            managerId: id,
            isGuestMode: false,
            customCaptainId: null,
            customViceCaptainId: null,
          });
          await get().fetchSquadData(id);
        }
      },
    }),
    {
      name: 'fpl-squad-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        managerId: state.managerId,
        isGuestMode: state.isGuestMode,
        aiTeamOfTheWeek: state.aiTeamOfTheWeek,
        currentSquad: state.currentSquad,
        aiOptimizedSquad: state.aiOptimizedSquad,
        chipOptimization: state.chipOptimization,
        bank: state.bank,
        freeTransfers: state.freeTransfers,
        activeChip: state.activeChip,
        customCaptainId: state.customCaptainId,
        customViceCaptainId: state.customViceCaptainId,
      }),
    }
  )
);
