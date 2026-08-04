'use client';

import React from 'react';
import { UserSquadResponse, TransferOptimizationResponse } from '@fpl-engine/shared';

interface TransferPanelProps {
  userSquad: UserSquadResponse | null;
  optimizationResult: TransferOptimizationResponse | null;
  maxTransfers: number;
  onMaxTransfersChange: (val: number) => void;
  onRunOptimization: () => void;
  loading: boolean;
  onExplainTransfer?: () => void;
  explainLoading?: boolean;
}

export const TransferPanel: React.FC<TransferPanelProps> = ({
  userSquad,
  optimizationResult,
  maxTransfers,
  onMaxTransfersChange,
  onRunOptimization,
  loading,
  onExplainTransfer,
  explainLoading,
}) => {
  if (!userSquad) return null;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-md mb-6">
      {/* Top Banner: User Manager Info & Optimizer Action */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b border-slate-800/80 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold rounded-full uppercase tracking-wider">
              FPL Team Imported
            </span>
            <span className="text-xs text-slate-400 font-mono">Manager ID: #{userSquad.manager_id}</span>
          </div>
          <h3 className="text-xl font-extrabold text-slate-100 mt-1">
            {userSquad.team_name} <span className="text-sm font-normal text-slate-400">({userSquad.player_name})</span>
          </h3>
        </div>

        {/* Transfer Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-mono">
            <span className="text-slate-400">Max Transfers:</span>
            <button
              onClick={() => onMaxTransfersChange(1)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                maxTransfers === 1
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              1
            </button>
            <button
              onClick={() => onMaxTransfersChange(2)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                maxTransfers === 2
                  ? 'bg-emerald-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              2
            </button>
          </div>

          <button
            onClick={onRunOptimization}
            disabled={loading}
            className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all duration-200 disabled:opacity-50"
          >
            <span>{loading ? 'Solving ILP Solver...' : '⚡ Optimize Weekly Transfers'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5">
        <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Free Transfers</div>
          <div className="text-lg font-black text-slate-100 mt-0.5">
            {userSquad.free_transfers} <span className="text-xs text-slate-500 font-normal">Available</span>
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Hits Taken</div>
          <div className="text-lg font-black text-slate-100 mt-0.5 flex items-center gap-1.5">
            {optimizationResult ? optimizationResult.hits_taken : 0}
            {optimizationResult && optimizationResult.hits_taken > 0 ? (
              <span className="px-2 py-0.5 bg-rose-500/20 border border-rose-500/40 text-rose-400 text-[10px] font-bold rounded-full">
                -{optimizationResult.hit_penalty} pts
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold rounded-full">
                0 pts penalty
              </span>
            )}
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Net xP Gain</div>
          <div className="text-lg font-black text-emerald-400 mt-0.5">
            {optimizationResult
              ? `${optimizationResult.net_xp_gain > 0 ? '+' : ''}${optimizationResult.net_xp_gain.toFixed(1)}`
              : '0.0'}{' '}
            <span className="text-xs text-slate-500 font-normal">xP</span>
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">Remaining Bank</div>
          <div className="text-lg font-black text-cyan-400 mt-0.5">
            £{optimizationResult ? optimizationResult.remaining_bank.toFixed(1) : userSquad.bank_m.toFixed(1)}m
          </div>
        </div>
      </div>

      {/* Recommended Transfer Pairs List */}
      <div>
        <div className="flex flex-wrap justify-between items-center mb-3 gap-2">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
            Recommended Transfers ({optimizationResult ? optimizationResult.transfers_made : 0})
          </h4>

          {optimizationResult && onExplainTransfer && (
            <button
              onClick={onExplainTransfer}
              disabled={explainLoading}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600/80 hover:bg-indigo-500 text-slate-100 font-bold text-xs rounded-xl border border-indigo-400/40 shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50"
            >
              <span>👔</span>
              <span>{explainLoading ? 'Director Analyzing...' : 'Ask Director of Football Why?'}</span>
            </button>
          )}
        </div>

        {optimizationResult && optimizationResult.transfers.length > 0 ? (
          <div className="space-y-3">
            {optimizationResult.transfers.map((item, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl items-center"
              >
                {/* SELL Player Card */}
                <div className="sm:col-span-5 flex items-center justify-between p-2.5 bg-rose-950/20 border border-rose-900/40 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[9px] font-black rounded">
                      SELL
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-200">{item.transferred_out.web_name}</div>
                      <div className="text-[10px] text-slate-400">
                        {item.transferred_out.team_short} · £{item.transferred_out.price_m}m
                      </div>
                    </div>
                  </div>
                  <div className="text-xs font-bold text-rose-400 font-mono">
                    {item.transferred_out.predicted_xp.toFixed(1)} xP
                  </div>
                </div>

                {/* Arrow Icon Divider */}
                <div className="sm:col-span-2 flex justify-center items-center text-slate-500 font-bold text-sm">
                  ➔
                </div>

                {/* BUY Player Card */}
                <div className="sm:col-span-5 flex items-center justify-between p-2.5 bg-emerald-950/20 border border-emerald-900/40 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] font-black rounded">
                      BUY
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-200">{item.transferred_in.web_name}</div>
                      <div className="text-[10px] text-slate-400">
                        {item.transferred_in.team_short} · £{item.transferred_in.price_m}m
                      </div>
                    </div>
                  </div>
                  <div className="text-xs font-bold text-emerald-400 font-mono">
                    {item.transferred_in.predicted_xp.toFixed(1)} xP
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-slate-400 py-6 text-center bg-slate-950/40 rounded-xl border border-slate-800/40">
            {loading
              ? 'Evaluating integer linear programming transfer models...'
              : 'Click "Optimize Weekly Transfers" to generate AI recommended SELL vs BUY transfers.'}
          </div>
        )}
      </div>
    </div>
  );
};
