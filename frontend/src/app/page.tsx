import { getTopPredictions, getLatestOptimization } from '../lib/api';

export const revalidate = 0;

export default async function DashboardPage() {
  const topPlayers = await getTopPredictions(5);
  const optimalSquad = await getLatestOptimization(1);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 md:p-12">
      {/* Header Banner */}
      <header className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-6 gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold rounded-full uppercase tracking-wider">
              AI Decision Engine
            </span>
            <span className="text-xs text-slate-400 font-mono">Gameweek 1</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 mt-2">
            FPL Advantage Engine
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Machine Learning Expected Points ($xP$) & PuLP Linear Programming Squad Optimizer
          </p>
        </div>

        <div className="flex items-center space-x-3 bg-slate-900/80 border border-slate-800 p-3 rounded-xl shadow-lg">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wide">FastAPI Backend Status</div>
            <div className="text-sm font-semibold text-emerald-400">Connected (localhost:8000)</div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Top 5 Predicted Players */}
        <section className="lg:col-span-1 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-md">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <span className="text-emerald-400">🔥</span> Top 5 Predicted Players
            </h2>
            <span className="text-xs text-slate-500">xP Forecast</span>
          </div>

          <div className="space-y-4">
            {topPlayers.length === 0 ? (
              <div className="text-sm text-slate-400 py-8 text-center bg-slate-950/50 rounded-xl border border-slate-800/50">
                Connecting to FastAPI backend...
              </div>
            ) : (
              topPlayers.map((player, idx) => (
                <div
                  key={player.player_id}
                  className="flex items-center justify-between p-3.5 bg-slate-950/60 hover:bg-slate-800/50 border border-slate-800/60 rounded-xl transition-all duration-200"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-mono font-bold text-slate-500 w-5">#{idx + 1}</span>
                    <div>
                      <div className="font-semibold text-sm text-slate-100 flex items-center gap-1.5">
                        {player.web_name}
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
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

        {/* Right Column: AI Optimal Squad Summary */}
        <section className="lg:col-span-2 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-md">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <span className="text-cyan-400">⚡</span> AI Optimal 15-Man Squad
              </h2>
              <p className="text-xs text-slate-400">PuLP Integer Linear Programming Solution</p>
            </div>
            {optimalSquad && (
              <div className="flex items-center space-x-4 bg-slate-950/70 border border-slate-800 px-4 py-2 rounded-xl text-xs">
                <div>
                  <span className="text-slate-400">Formation: </span>
                  <span className="font-bold text-emerald-400 font-mono">{optimalSquad.formation}</span>
                </div>
                <div className="w-px h-4 bg-slate-800"></div>
                <div>
                  <span className="text-slate-400">Cost: </span>
                  <span className="font-bold text-slate-200 font-mono">£{optimalSquad.total_cost}m</span>
                </div>
                <div className="w-px h-4 bg-slate-800"></div>
                <div>
                  <span className="text-slate-400">Total xP: </span>
                  <span className="font-bold text-cyan-400 font-mono">{optimalSquad.total_expected_points}</span>
                </div>
              </div>
            )}
          </div>

          {optimalSquad ? (
            <div className="space-y-6">
              {/* Starting 11 */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <span>⚽</span> Starting 11 Lineup ({optimalSquad.starting_11.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {optimalSquad.starting_11.map((p) => {
                    const isCaptain = p.player_id === optimalSquad.captain_id;
                    const isVice = p.player_id === optimalSquad.vice_captain_id;
                    return (
                      <div
                        key={p.player_id}
                        className={`p-3 rounded-xl border transition-all ${
                          isCaptain
                            ? 'bg-amber-500/10 border-amber-500/40 shadow-amber-500/10'
                            : 'bg-slate-950/60 border-slate-800/70 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono uppercase">
                              {p.element_type}
                            </span>
                            <div className="font-semibold text-sm text-slate-100 mt-1">{p.web_name}</div>
                            <div className="text-xs text-slate-400">{p.team_short} · £{p.price_m}m</div>
                          </div>
                          <div className="text-right">
                            {isCaptain && (
                              <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold rounded">
                                (C)
                              </span>
                            )}
                            {isVice && (
                              <span className="px-1.5 py-0.5 bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-bold rounded">
                                (VC)
                              </span>
                            )}
                            <div className="text-sm font-bold text-emerald-400 font-mono mt-1">
                              {isCaptain ? (p.predicted_xp * 2.0).toFixed(1) : p.predicted_xp.toFixed(1)} <span className="text-[9px] font-normal text-slate-400">xP</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bench */}
              <div className="pt-4 border-t border-slate-800/80">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <span>🪑</span> Substitutes Bench ({optimalSquad.bench.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {optimalSquad.bench.map((p, bIdx) => (
                    <div key={p.player_id} className="p-2.5 bg-slate-950/40 border border-slate-800/60 rounded-xl text-xs">
                      <div className="text-[10px] text-slate-500 font-mono">Bench #{bIdx + 1}</div>
                      <div className="font-semibold text-slate-200 truncate">{p.web_name}</div>
                      <div className="text-[11px] text-slate-400 flex justify-between items-center mt-1">
                        <span>{p.team_short} · £{p.price_m}m</span>
                        <span className="font-mono text-emerald-400">{p.predicted_xp.toFixed(1)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-400 py-16 text-center bg-slate-950/50 rounded-xl border border-slate-800/50">
              Loading optimal squad from FastAPI backend...
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
