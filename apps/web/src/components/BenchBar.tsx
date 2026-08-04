'use client';

import React from 'react';
import { PlayerPrediction } from '@fpl-engine/shared';
import { PlayerCard } from './PlayerCard';

interface BenchBarProps {
  bench: PlayerPrediction[];
  transferredInIds?: number[];
  transferredOutIds?: number[];
  onPlayerClick?: (player: PlayerPrediction) => void;
}

export const BenchBar: React.FC<BenchBarProps> = ({
  bench,
  transferredInIds = [],
  transferredOutIds = [],
  onPlayerClick,
}) => {
  return (
    <div className="mt-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md">
      <div className="flex justify-between items-center mb-3 px-2">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-bold text-slate-200">🪑 Substitutes Bench</span>
          <span className="text-xs text-slate-500 font-mono">({bench.length} players)</span>
        </div>
        <span className="text-[10px] text-slate-400">Ordered by auto-sub priority</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 justify-items-center">
        {bench.map((player, idx) => (
          <div key={player.player_id} className="relative flex flex-col items-center">
            <span className="mb-1 px-2 py-0.5 bg-slate-800 text-slate-300 text-[9px] font-mono font-bold rounded-full border border-slate-700">
              {idx === 0 && player.element_type === 'GKP' ? 'SUB GKP' : `SUB #${idx + 1}`}
            </span>
            <PlayerCard
              player={player}
              isBench={true}
              isTransferredIn={transferredInIds.includes(player.player_id)}
              isTransferredOut={transferredOutIds.includes(player.player_id)}
              onClick={onPlayerClick}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

