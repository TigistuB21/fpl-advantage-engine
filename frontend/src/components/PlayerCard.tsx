'use client';

import React from 'react';
import { PlayerPrediction } from '../types/fpl';

interface PlayerCardProps {
  player: PlayerPrediction;
  isCaptain?: boolean;
  isViceCaptain?: boolean;
  isBench?: boolean;
  isTransferredIn?: boolean;
  isTransferredOut?: boolean;
  onClick?: (player: PlayerPrediction) => void;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  isCaptain = false,
  isViceCaptain = false,
  isBench = false,
  isTransferredIn = false,
  isTransferredOut = false,
  onClick,
}) => {
  const displayXp = isCaptain ? (player.predicted_xp * 2.0).toFixed(1) : player.predicted_xp.toFixed(1);

  // Position color accents
  const posColorMap: Record<string, string> = {
    GKP: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    DEF: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    MID: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    FWD: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  };

  return (
    <div
      onClick={() => onClick && onClick(player)}
      className={`relative group cursor-pointer transition-all duration-300 hover:scale-105 hover:-translate-y-1 ${
        isBench ? 'w-24 sm:w-28' : 'w-24 sm:w-32'
      }`}
    >
      {/* Captain / Vice Captain / Transfer Badges */}
      <div className="absolute -top-2 -right-1 z-10 flex gap-1">
        {isTransferredIn && (
          <span className="px-1.5 py-0.5 bg-emerald-500 text-slate-950 text-[9px] font-black rounded-full shadow-lg border border-emerald-300 animate-pulse">
            IN
          </span>
        )}
        {isTransferredOut && (
          <span className="px-1.5 py-0.5 bg-rose-600 text-white text-[9px] font-black rounded-full shadow-lg border border-rose-400">
            OUT
          </span>
        )}
        {isCaptain && (
          <span className="px-1.5 py-0.5 bg-amber-400 text-slate-950 text-[10px] font-extrabold rounded-full shadow-lg border border-amber-300 animate-pulse">
            C
          </span>
        )}
        {isViceCaptain && (
          <span className="px-1.5 py-0.5 bg-slate-200 text-slate-900 text-[10px] font-extrabold rounded-full shadow-lg border border-slate-300">
            VC
          </span>
        )}
      </div>

      {/* Jersey Icon Container */}
      <div className="flex flex-col items-center">
        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shadow-lg border backdrop-blur-md transition-all ${
          isTransferredIn
            ? 'bg-gradient-to-tr from-emerald-600 to-teal-400 border-emerald-300 ring-2 ring-emerald-400 shadow-emerald-500/50'
            : isTransferredOut
            ? 'bg-gradient-to-tr from-rose-900 to-rose-700 border-rose-500 ring-2 ring-rose-500 shadow-rose-500/50 opacity-60'
            : isCaptain
            ? 'bg-gradient-to-tr from-amber-600 to-yellow-400 border-amber-300 shadow-amber-500/30'
            : isBench
            ? 'bg-slate-900/90 border-slate-700/80 text-slate-400'
            : 'bg-gradient-to-tr from-slate-900 via-slate-800 to-emerald-950 border-emerald-500/40 text-emerald-400 shadow-emerald-500/10 group-hover:border-emerald-400'
        }`}>
          {/* Soccer Jersey SVG Icon */}
          <svg
            className={`w-6 h-6 sm:w-7 sm:h-7 ${isCaptain ? 'text-slate-950' : isTransferredIn ? 'text-slate-950' : 'text-emerald-400'}`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2L4 5v4c0 5.25 3.5 10.15 8 11.5 4.5-1.35 8-6.25 8-11.5V5l-8-3zm0 2.18l6 2.25v3.57c0 4.31-2.87 8.35-6 9.5-3.13-1.15-6-5.19-6-9.5V6.43l6-2.25z"/>
          </svg>
        </div>

        {/* Player Name Tag */}
        <div className={`w-full mt-1.5 bg-slate-950/90 backdrop-blur-md border rounded-lg p-1 text-center shadow-md ${
          isTransferredIn
            ? 'border-emerald-500 text-emerald-300'
            : isTransferredOut
            ? 'border-rose-500/80 text-rose-300 opacity-70'
            : 'border-slate-800/80 group-hover:border-emerald-500/50'
        }`}>
          <div className="text-[11px] sm:text-xs font-bold text-slate-100 truncate px-1">
            {player.web_name}
          </div>

          <div className="flex items-center justify-between px-1 mt-0.5 text-[9px] sm:text-[10px]">
            <span className={`px-1 rounded border text-[8px] font-mono ${posColorMap[player.element_type] || 'text-slate-400'}`}>
              {player.team_short}
            </span>
            <span className="font-mono font-bold text-emerald-400">{displayXp} xP</span>
          </div>
        </div>
      </div>
    </div>
  );
};

