'use client';

import React, { useEffect, useState } from 'react';
import { getTopPredictions, getLatestOptimization } from '../lib/api';
import { PlayerPrediction, SquadOptimization } from '../types/fpl';
import { FootballPitch } from '../components/FootballPitch';
import { BenchBar } from '../components/BenchBar';
import { PlayerModal } from '../components/PlayerModal';

export default function DashboardPage() {
  const [topPlayers, setTopPlayers] = useState<PlayerPrediction[]>([]);
  const [optimalSquad, setOptimalSquad] = useState<SquadOptimization | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerPrediction | null>(null);

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      const [preds, squad] = await Promise.all([
        getTopPredictions(5),
        getLatestOptimization(1),
      ]);
      setTopPlayers(preds);
      setOptimalSquad(squad);
      setLoading(false);
    }
    loadDashboardData();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 sm:p-6 md:p-10">
      {/* Header Banner */}
      <header className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800/80 pb-6 gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold rounded-full uppercase tracking-wider">
              AI Decision Engine
            </span>
            <span className="text-xs text-slate-400 font-mono">Gameweek 1</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 mt-2">
            FPL Advantage Engine
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Expected Points ($xP$) Forecasts & 2D Tactical Field Squad Optimizer
          </p>
        </div>

        <div className="flex items-center space-x-3 bg-slate-900/80 border border-slate-800 p-3 rounded-xl shadow-lg">
          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></div>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wide">FastAPI API Backend</div>
            <div className="text-sm font-semibold text-emerald-400">Connected (localhost:8000)</div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Top 5 Predicted Players (4 Columns wide on LG) */}
        <section className="lg:col-span-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-md h-fit">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span className="text-emerald-400">🔥</span> Top 5 Predicted Players
            </h2>
            <span className="text-[10px] text-slate-500 font-mono uppercase">xP Forecast</span>
          </div>

          <div className="space-y-3">
            {loading ? (
              <div className="text-sm text-slate-400 py-12 text-center bg-slate-950/50 rounded-xl border border-slate-800/50">
                Fetching predictions...
              </div>
            ) : topPlayers.length === 0 ? (
              <div className="text-sm text-slate-400 py-8 text-center bg-slate-950/50 rounded-xl border border-slate-800/50">
                No predictions found. Verify FastAPI backend is running.
              </div>
            ) : (
              topPlayers.map((player, idx) => (
                <div
                  key={player.player_id}
                  onClick={() => setSelectedPlayer(player)}
                  className="flex items-center justify-between p-3 bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800/60 hover:border-emerald-500/40 rounded-xl cursor-pointer transition-all duration-200"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-mono font-bold text-slate-500 w-5">#{idx + 1}</span>
                    <div>
                      <div className="font-semibold text-sm text-slate-100 flex items-center gap-1.5">
                        {player.web_name}
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                          {player.element_type}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">
                        {player.team_name} · £{player.price_m}m
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-black text-emerald-400 font-mono">
                      {player.predicted_xp.toFixed(1)} <span className="text-[10px] font-normal text-slate-400">xP</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Right Column: 2D Football Pitch & Bench Bar (8 Columns wide on LG) */}
        <section className="lg:col-span-8 flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
            <div>
              <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
                <span className="text-cyan-400">⚽</span> AI Optimal Tactical Field
              </h2>
              <p className="text-xs text-slate-400">PuLP Integer Linear Program Solution</p>
            </div>

            {optimalSquad && (
              <div className="flex items-center space-x-3 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-mono">
                <div>
                  <span className="text-slate-400">Cost: </span>
                  <span className="font-bold text-slate-200">£{optimalSquad.total_cost}m</span>
                </div>
                <div className="w-px h-3.5 bg-slate-800"></div>
                <div>
                  <span className="text-slate-400">Total xP: </span>
                  <span className="font-bold text-cyan-400">{optimalSquad.total_expected_points}</span>
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <div className="text-sm text-slate-400 py-32 text-center bg-slate-900/60 rounded-2xl border border-slate-800">
              Solving optimal squad on 2D tactical field...
            </div>
          ) : optimalSquad ? (
            <div>
              {/* 2D Football Pitch */}
              <FootballPitch
                starters={optimalSquad.starting_11}
                captainId={optimalSquad.captain_id}
                viceCaptainId={optimalSquad.vice_captain_id}
                formation={optimalSquad.formation}
                onPlayerClick={(player) => setSelectedPlayer(player)}
              />

              {/* Substitutes Bench Bar */}
              <BenchBar
                bench={optimalSquad.bench}
                onPlayerClick={(player) => setSelectedPlayer(player)}
              />
            </div>
          ) : (
            <div className="text-sm text-slate-400 py-24 text-center bg-slate-900/60 rounded-2xl border border-slate-800">
              Unable to load optimal squad. Ensure FastAPI server is running on localhost:8000.
            </div>
          )}
        </section>
      </div>

      {/* Interactive Player Inspection Modal */}
      <PlayerModal
        player={selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
      />
    </main>
  );
}
