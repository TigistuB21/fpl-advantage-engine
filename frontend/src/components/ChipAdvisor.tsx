'use client';

import React from 'react';
import { ChipOptimizationResponse } from '../types/fpl';

interface ChipAdvisorProps {
  chipData: ChipOptimizationResponse | null;
  loading: boolean;
}

export const ChipAdvisor: React.FC<ChipAdvisorProps> = ({ chipData, loading }) => {
  if (loading) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-md mb-6 animate-pulse">
        <div className="h-5 bg-slate-800 rounded w-48 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-950/60 border border-slate-800 rounded-xl p-4" />
          ))}
        </div>
      </div>
    );
  }

  if (!chipData) return null;

  const getChipIcon = (code: string) => {
    switch (code) {
      case 'baseline':
        return '🛡️';
      case '3xc':
        return '👑';
      case 'bboost':
        return '🚀';
      case 'freehit':
        return '🃏';
      default:
        return '⚡';
    }
  };

  const getChipThreshold = (code: string) => {
    if (code === 'freehit') return 15.0;
    if (code === '3xc' || code === 'bboost') return 10.0;
    return 0.0;
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-md mb-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-slate-800/80 mb-5 gap-2">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[11px] font-bold rounded-full uppercase tracking-wider">
              Phase 9 Chip Optimization
            </span>
            <span className="text-xs text-slate-400 font-mono">1-Gameweek ROI Evaluation</span>
          </div>
          <h3 className="text-xl font-extrabold text-slate-100 mt-1 flex items-center gap-2">
            <span>🎯 FPL Chip Strategy Advisor</span>
          </h3>
        </div>

        {chipData.best_chip_delta > 0 && (
          <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs font-mono">
            <span className="text-emerald-400 font-bold">Top ROI:</span>
            <span className="text-slate-100 font-black">{chipData.best_chip_name}</span>
            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-black rounded">
              +{chipData.best_chip_delta.toFixed(1)} xP
            </span>
          </div>
        )}
      </div>

      {/* 4 Chip Scenarios Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {chipData.chips.map((chip) => {
          const threshold = getChipThreshold(chip.chip_code);
          const isRecommended =
            chip.chip_code !== 'baseline' &&
            (chip.xp_delta >= threshold || chip.chip_code === chipData.best_chip);

          return (
            <div
              key={chip.chip_code}
              className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                isRecommended
                  ? 'bg-gradient-to-b from-emerald-950/40 to-slate-950/80 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div>
                {/* Card Header: Icon & Name + Status Badge */}
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">{getChipIcon(chip.chip_code)}</span>
                    <span className="text-sm font-bold text-slate-100">{chip.chip_name}</span>
                  </div>

                  {chip.chip_code === 'baseline' ? (
                    <span className="px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] font-mono font-bold rounded">
                      BASE
                    </span>
                  ) : isRecommended ? (
                    <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-[10px] font-mono font-black rounded uppercase animate-pulse">
                      🟢 PLAY
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono font-bold rounded uppercase">
                      🟡 SAVE
                    </span>
                  )}
                </div>

                {/* Metrics */}
                <div className="space-y-1 my-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[11px] text-slate-400">Projected xP:</span>
                    <span className="text-sm font-black text-slate-100 font-mono">
                      {chip.projected_xp.toFixed(1)} xP
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline">
                    <span className="text-[11px] text-slate-400">Net Gain vs Base:</span>
                    <span
                      className={`text-sm font-black font-mono ${
                        chip.xp_delta > 0
                          ? 'text-emerald-400'
                          : chip.xp_delta < 0
                          ? 'text-rose-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {chip.xp_delta > 0 ? `+${chip.xp_delta.toFixed(1)}` : chip.xp_delta.toFixed(1)} xP
                    </span>
                  </div>
                </div>

                {/* Strategic Note */}
                <p className="text-[11px] text-slate-400 leading-tight mt-2 pt-2 border-t border-slate-800/60">
                  {chip.recommendation}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* GW19 Chip Expiration Rule Notice */}
      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center space-x-3 text-xs text-amber-300">
        <span className="text-base">💡</span>
        <span>
          <strong>FPL Rule Reminder:</strong> Set #1 Chips (Wildcard, Free Hit, Triple Captain, Bench Boost) expire at the <strong>Gameweek 19 deadline</strong>. Make sure to deploy unused chips before GW19!
        </span>
      </div>
    </div>
  );
};
