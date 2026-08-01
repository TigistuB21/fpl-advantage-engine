'use client';

import React from 'react';
import { PlayerPrediction } from '../types/fpl';
import { PlayerCard } from './PlayerCard';

interface FootballPitchProps {
  starters: PlayerPrediction[];
  captainId: number;
  viceCaptainId: number;
  formation: string;
  onPlayerClick?: (player: PlayerPrediction) => void;
}

export const FootballPitch: React.FC<FootballPitchProps> = ({
  starters,
  captainId,
  viceCaptainId,
  formation,
  onPlayerClick,
}) => {
  // Group starters into 4 position rows
  const gkpList = starters.filter((p) => p.element_type === 'GKP');
  const defList = starters.filter((p) => p.element_type === 'DEF');
  const midList = starters.filter((p) => p.element_type === 'MID');
  const fwdList = starters.filter((p) => p.element_type === 'FWD');

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-emerald-500/30 shadow-2xl bg-gradient-to-b from-emerald-950 via-emerald-900 to-emerald-950 p-4 sm:p-6 min-h-[480px] sm:min-h-[540px] flex flex-col justify-between select-none">
      {/* Field Background Line Markings */}
      <div className="absolute inset-0 pointer-events-none opacity-25">
        {/* Halfway Line */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-emerald-300/40"></div>
        {/* Center Circle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 sm:w-36 sm:h-36 rounded-full border-2 border-emerald-300/40"></div>
        {/* Penalty Area Top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 sm:w-64 h-20 sm:h-24 border-b-2 border-x-2 border-emerald-300/40 rounded-b-xl"></div>
        {/* Penalty Area Bottom */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 sm:w-64 h-20 sm:h-24 border-t-2 border-x-2 border-emerald-300/40 rounded-t-xl"></div>
      </div>

      {/* Pitch Header Badge */}
      <div className="relative z-10 flex justify-between items-center px-2">
        <div className="flex items-center space-x-2 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-emerald-500/30">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="text-xs font-mono font-bold text-emerald-300 uppercase tracking-wider">
            Formation: {formation}
          </span>
        </div>
      </div>

      {/* 4 Formation Rows */}
      <div className="relative z-10 my-auto space-y-6 sm:space-y-8 py-4">
        {/* Goalkeeper Row */}
        <div className="flex justify-center space-x-4">
          {gkpList.map((player) => (
            <PlayerCard
              key={player.player_id}
              player={player}
              isCaptain={player.player_id === captainId}
              isViceCaptain={player.player_id === viceCaptainId}
              onClick={onPlayerClick}
            />
          ))}
        </div>

        {/* Defenders Row */}
        <div className="flex justify-evenly items-center px-2 sm:px-6">
          {defList.map((player) => (
            <PlayerCard
              key={player.player_id}
              player={player}
              isCaptain={player.player_id === captainId}
              isViceCaptain={player.player_id === viceCaptainId}
              onClick={onPlayerClick}
            />
          ))}
        </div>

        {/* Midfielders Row */}
        <div className="flex justify-evenly items-center px-2 sm:px-4">
          {midList.map((player) => (
            <PlayerCard
              key={player.player_id}
              player={player}
              isCaptain={player.player_id === captainId}
              isViceCaptain={player.player_id === viceCaptainId}
              onClick={onPlayerClick}
            />
          ))}
        </div>

        {/* Forwards Row */}
        <div className="flex justify-evenly items-center px-4 sm:px-10">
          {fwdList.map((player) => (
            <PlayerCard
              key={player.player_id}
              player={player}
              isCaptain={player.player_id === captainId}
              isViceCaptain={player.player_id === viceCaptainId}
              onClick={onPlayerClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
