'use client';

import React, { useEffect, useState } from 'react';
import {
  getTopPredictions,
  getLatestOptimization,
  getUserSquad,
  getTransferOptimization,
  getTransferExplanation,
  getChipOptimization,
  PlayerPrediction,
  SquadOptimization,
  UserSquadResponse,
  TransferOptimizationResponse,
  ExplainTransferResponse,
  ChipOptimizationResponse,
} from '@fpl-engine/shared';
import { FootballPitch } from '../components/FootballPitch';
import { BenchBar } from '../components/BenchBar';
import { PlayerModal } from '../components/PlayerModal';
import { TransferPanel } from '../components/TransferPanel';
import { DirectorChat } from '../components/DirectorChat';
import { ChipAdvisor } from '../components/ChipAdvisor';

export default function DashboardPage() {
  const [topPlayers, setTopPlayers] = useState<PlayerPrediction[]>([]);
  const [optimalSquad, setOptimalSquad] = useState<SquadOptimization | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerPrediction | null>(null);

  // Tab mode state: 'wildcard' or 'my_team'
  const [activeTab, setActiveTab] = useState<'wildcard' | 'my_team'>('wildcard');

  // User squad import & transfer optimizer states
  const [managerIdInput, setManagerIdInput] = useState<string>('1');
  const [userSquad, setUserSquad] = useState<UserSquadResponse | null>(null);
  const [userSquadLoading, setUserSquadLoading] = useState<boolean>(false);
  const [userSquadError, setUserSquadError] = useState<string | null>(null);

  const [maxTransfers, setMaxTransfers] = useState<number>(2);
  const [transferOptimization, setTransferOptimization] = useState<TransferOptimizationResponse | null>(null);
  const [transferLoading, setTransferLoading] = useState<boolean>(false);

  const [explanationData, setExplanationData] = useState<ExplainTransferResponse | null>(null);
  const [explanationLoading, setExplanationLoading] = useState<boolean>(false);

  const [chipOptimization, setChipOptimization] = useState<ChipOptimizationResponse | null>(null);
  const [chipLoading, setChipLoading] = useState<boolean>(false);

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

  const handleLoadUserTeam = async (idToFetch?: number) => {
    const id = idToFetch || parseInt(managerIdInput.trim(), 10);
    if (!id || isNaN(id)) return;

    setUserSquadLoading(true);
    setChipLoading(true);
    setUserSquadError(null);
    setTransferOptimization(null);
    setExplanationData(null);

    const [{ data, error }, chips] = await Promise.all([
      getUserSquad(id),
      getChipOptimization(id),
    ]);

    if (data && data.starting_11.length > 0) {
      setUserSquad(data);
      setChipOptimization(chips);
      setActiveTab('my_team');
    } else {
      setUserSquadError(error || `Unable to load team for Manager ID #${id}. Ensure ID is valid.`);
    }
    setUserSquadLoading(false);
    setChipLoading(false);
  };


  const handleRunTransferOptimization = async () => {
    if (!userSquad) return;
    setTransferLoading(true);
    setExplanationData(null);

    const allSquadIds = [
      ...userSquad.starting_11.map((p) => p.player_id),
      ...userSquad.bench.map((p) => p.player_id),
    ];

    const result = await getTransferOptimization(
      allSquadIds,
      userSquad.bank_m,
      userSquad.free_transfers,
      maxTransfers,
      1
    );

    if (result) {
      setTransferOptimization(result);
    }
    setTransferLoading(false);
  };

  const handleAskDirectorWhy = async () => {
    if (!userSquad || !transferOptimization) return;
    setExplanationLoading(true);
    const result = await getTransferExplanation(userSquad, transferOptimization, chipOptimization);
    if (result) {
      setExplanationData(result);
    }
    setExplanationLoading(false);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 sm:p-6 md:p-10">
      {/* Header Banner */}
      <header className="max-w-7xl mx-auto mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-slate-800/80 pb-6 gap-6">
        <div>
          <div className="flex items-center space-x-3">
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold rounded-full uppercase tracking-wider">
              AI Decision Engine
            </span>
            <span className="text-xs text-slate-400 font-mono">Gameweek 1 (5-GW Horizon)</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 mt-2">
            FPL Advantage Engine
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Expected Points ($xP$) Forecasts, 2D Tactical Pitch & PuLP Transfer Optimizer
          </p>
        </div>

        {/* Manager Import Input & API Status */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center bg-slate-900 border border-slate-800 p-1.5 rounded-xl shadow-lg">
            <input
              type="number"
              value={managerIdInput}
              onChange={(e) => setManagerIdInput(e.target.value)}
              placeholder="FPL Manager ID"
              className="bg-transparent px-3 py-1 text-xs text-slate-100 placeholder-slate-500 focus:outline-none w-32 font-mono"
            />
            <button
              onClick={() => handleLoadUserTeam()}
              disabled={userSquadLoading}
              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-lg transition-all shadow-md disabled:opacity-50"
            >
              {userSquadLoading ? 'Loading...' : 'Load Team'}
            </button>
          </div>

          <div className="flex items-center space-x-2.5 bg-slate-900/80 border border-slate-800 px-3 py-2 rounded-xl shadow-lg">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wide">FastAPI API</div>
              <div className="text-xs font-semibold text-emerald-400">Connected</div>
            </div>
          </div>
        </div>
      </header>

      {userSquadError && (
        <div className="max-w-7xl mx-auto mb-6 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-xl flex justify-between items-center">
          <span>⚠️ {userSquadError}</span>
          <button onClick={() => setUserSquadError(null)} className="text-rose-300 font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Top 5 Predicted Players (4 Columns wide on LG) */}
        <section className="lg:col-span-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-md h-fit">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span className="text-emerald-400">🔥</span> Top 5 Predicted Players
            </h2>
            <span className="text-[10px] text-slate-500 font-mono uppercase">5-GW xP</span>
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

        {/* Right Column: Mode Tabs, Transfer Panel & 2D Tactical Field (8 Columns wide on LG) */}
        <section className="lg:col-span-8 flex flex-col">
          {/* Dashboard Mode Switcher Tabs */}
          <div className="flex items-center space-x-2 border-b border-slate-800 mb-6 pb-2">
            <button
              onClick={() => setActiveTab('wildcard')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'wildcard'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              ⚡ Wildcard Squad (Free Optimizer)
            </button>
            <button
              onClick={() => {
                if (!userSquad) handleLoadUserTeam(1);
                setActiveTab('my_team');
              }}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                activeTab === 'my_team'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              📋 My Team & Transfers {userSquad && `(#${userSquad.manager_id})`}
            </button>
          </div>

          {/* MODE 1: WILDCARD SQUAD (FREE-FORM SOLVER) */}
          {activeTab === 'wildcard' && (
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-100 flex items-center gap-2">
                    <span className="text-cyan-400">⚽</span> AI Wildcard Optimal Squad
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
                  Solving optimal wildcard squad on 2D tactical field...
                </div>
              ) : optimalSquad ? (
                <div>
                  <FootballPitch
                    starters={optimalSquad.starting_11}
                    captainId={optimalSquad.captain_id}
                    viceCaptainId={optimalSquad.vice_captain_id}
                    formation={optimalSquad.formation}
                    onPlayerClick={(player) => setSelectedPlayer(player)}
                  />
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
            </div>
          )}

          {/* MODE 2: MY TEAM & TRANSFER OPTIMIZER */}
          {activeTab === 'my_team' && (
            <div>
              {userSquadLoading ? (
                <div className="text-sm text-slate-400 py-32 text-center bg-slate-900/60 rounded-2xl border border-slate-800">
                  Fetching user squad picks & manager details from official FPL API...
                </div>
              ) : userSquad ? (
                <div>
                  {/* Phase 9 Chip Optimization Strategy Panel */}
                  <ChipAdvisor chipData={chipOptimization} loading={chipLoading} />

                  {/* Transfer Recommendation Panel */}
                  <TransferPanel
                    userSquad={userSquad}
                    optimizationResult={transferOptimization}
                    maxTransfers={maxTransfers}
                    onMaxTransfersChange={(val) => setMaxTransfers(val)}
                    onRunOptimization={handleRunTransferOptimization}
                    loading={transferLoading}
                    onExplainTransfer={handleAskDirectorWhy}
                    explainLoading={explanationLoading}
                  />

                  {/* Director of Football Conversational AI Briefing Drawer */}
                  <DirectorChat
                    explanationData={explanationData}
                    loading={explanationLoading}
                    onClose={() => setExplanationData(null)}
                  />

                  {/* 2D Tactical Field displaying User Squad or Optimized Transfer Squad */}
                  <div className="mb-4 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-100">
                      {transferOptimization ? '⚽ Post-Transfer Lineup' : '⚽ Current Imported Lineup'}
                    </h3>
                    <span className="text-xs text-slate-400 font-mono">
                      {transferOptimization
                        ? `Net xP: ${transferOptimization.total_expected_points.toFixed(1)}`
                        : `Bank: £${userSquad.bank_m}m`}
                    </span>
                  </div>

                  <FootballPitch
                    starters={transferOptimization ? transferOptimization.starting_11 : userSquad.starting_11}
                    captainId={transferOptimization ? transferOptimization.captain_id : userSquad.starting_11[0]?.player_id || 0}
                    viceCaptainId={transferOptimization ? transferOptimization.vice_captain_id : userSquad.starting_11[1]?.player_id || 0}
                    formation={transferOptimization ? transferOptimization.formation : '3-4-3'}
                    transferredInIds={transferOptimization ? transferOptimization.transfers.map((t) => t.transferred_in.player_id) : []}
                    transferredOutIds={transferOptimization ? transferOptimization.transfers.map((t) => t.transferred_out.player_id) : []}
                    onPlayerClick={(player) => setSelectedPlayer(player)}
                  />

                  <BenchBar
                    bench={transferOptimization ? transferOptimization.bench : userSquad.bench}
                    transferredInIds={transferOptimization ? transferOptimization.transfers.map((t) => t.transferred_in.player_id) : []}
                    transferredOutIds={transferOptimization ? transferOptimization.transfers.map((t) => t.transferred_out.player_id) : []}
                    onPlayerClick={(player) => setSelectedPlayer(player)}
                  />
                </div>
              ) : (
                <div className="text-sm text-slate-400 py-24 text-center bg-slate-900/60 rounded-2xl border border-slate-800">
                  No user squad imported yet. Enter an FPL Manager ID above and click &quot;Load Team&quot;.
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Interactive Player Inspection Modal */}
      <PlayerModal player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
    </main>
  );
}
