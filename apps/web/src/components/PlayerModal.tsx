'use client';

import React, { useEffect, useState } from 'react';
import { PlayerPrediction, PlayerDetail, getPlayerDetails } from '@fpl-engine/shared';

interface PlayerModalProps {
  player: PlayerPrediction | null;
  onClose: () => void;
}

export const PlayerModal: React.FC<PlayerModalProps> = ({ player, onClose }) => {
  const [details, setDetails] = useState<PlayerDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (player) {
      setLoading(true);
      getPlayerDetails(player.player_id).then((data) => {
        setDetails(data);
        setLoading(false);
      });
    } else {
      setDetails(null);
    }
  }, [player]);

  if (!player) return null;

  // Difficulty badge colors
  const diffBgMap: Record<number, string> = {
    1: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    2: 'bg-green-500/20 text-green-300 border-green-500/30',
    3: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    4: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    5: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Glow Accent */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-100 p-2 rounded-full hover:bg-slate-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-slate-950 font-bold text-2xl shadow-lg border border-emerald-300">
            {player.element_type}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-semibold text-emerald-400 uppercase tracking-wider">
                {player.team_name}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                {player.team_short}
              </span>
            </div>
            <h3 className="text-2xl font-black text-slate-100 mt-0.5">{player.web_name}</h3>
            <p className="text-xs text-slate-400">
              {player.first_name} {player.second_name} · £{player.price_m}m
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm font-mono">
            Loading player statistics & fixtures...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Section 1: Underlying Stats Grid */}
            <div>
              <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span className="text-emerald-400">📊</span> Underlying Performance Stats
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-slate-950/70 border border-slate-800/80 p-3 rounded-xl">
                  <div className="text-[10px] text-slate-400">Expected Points</div>
                  <div className="text-xl font-black text-emerald-400 font-mono mt-0.5">
                    {player.predicted_xp.toFixed(1)} <span className="text-xs font-normal">xP</span>
                  </div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800/80 p-3 rounded-xl">
                  <div className="text-[10px] text-slate-400">Goals Scored</div>
                  <div className="text-xl font-bold text-slate-200 font-mono mt-0.5">
                    {details?.underlying_stats.goals_scored ?? 0}
                  </div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800/80 p-3 rounded-xl">
                  <div className="text-[10px] text-slate-400">Assists</div>
                  <div className="text-xl font-bold text-slate-200 font-mono mt-0.5">
                    {details?.underlying_stats.assists ?? 0}
                  </div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800/80 p-3 rounded-xl">
                  <div className="text-[10px] text-slate-400">Clean Sheets</div>
                  <div className="text-xl font-bold text-slate-200 font-mono mt-0.5">
                    {details?.underlying_stats.clean_sheets ?? 0}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 mt-2.5">
                <div className="bg-slate-950/70 border border-slate-800/80 p-2.5 rounded-xl text-center">
                  <div className="text-[9px] text-slate-400">ICT Index</div>
                  <div className="text-sm font-bold text-slate-300 font-mono mt-0.5">
                    {details?.underlying_stats.ict_index ?? 0}
                  </div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800/80 p-2.5 rounded-xl text-center">
                  <div className="text-[9px] text-slate-400">Influence</div>
                  <div className="text-sm font-bold text-slate-300 font-mono mt-0.5">
                    {details?.underlying_stats.influence ?? 0}
                  </div>
                </div>

                <div className="bg-slate-950/70 border border-slate-800/80 p-2.5 rounded-xl text-center">
                  <div className="text-[9px] text-slate-400">Form</div>
                  <div className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                    {details?.underlying_stats.form ?? '0.0'}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Next 3 Upcoming Fixtures */}
            <div>
              <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <span className="text-cyan-400">📅</span> Next 3 Upcoming Fixtures
              </h4>

              <div className="grid grid-cols-3 gap-3">
                {details?.upcoming_fixtures.map((fix) => (
                  <div
                    key={fix.event_id}
                    className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-xl text-center flex flex-col items-center justify-between"
                  >
                    <span className="text-[10px] text-slate-400 font-mono">GW {fix.event_id}</span>
                    
                    <div className="my-1.5">
                      <span className="text-sm font-extrabold text-slate-100 block">
                        {fix.opponent_short}
                      </span>
                      <span className="text-[9px] text-slate-400 font-semibold block uppercase">
                        ({fix.is_home ? 'H' : 'A'})
                      </span>
                    </div>

                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-mono font-bold border ${
                        diffBgMap[fix.difficulty] || 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      FDR {fix.difficulty}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer Action */}
        <div className="mt-7">
          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm rounded-xl transition-all border border-slate-700 shadow-lg"
          >
            Close Player Details
          </button>
        </div>
      </div>
    </div>
  );
};
