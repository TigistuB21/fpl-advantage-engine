'use client';

import React from 'react';
import { ExplainTransferResponse } from '../types/fpl';

interface DirectorChatProps {
  explanationData: ExplainTransferResponse | null;
  loading: boolean;
  onClose: () => void;
}

export const DirectorChat: React.FC<DirectorChatProps> = ({
  explanationData,
  loading,
  onClose,
}) => {
  if (!loading && !explanationData) return null;

  // Simple parser to format markdown bold and headings cleanly in React
  const renderFormattedMarkdown = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('### ')) {
        return (
          <h4 key={idx} className="text-base font-extrabold text-emerald-400 mt-3 mb-1 flex items-center gap-1.5">
            {line.replace('### ', '')}
          </h4>
        );
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return (
          <p key={idx} className="text-xs font-bold text-slate-200 mt-2 mb-1 uppercase tracking-wide font-mono">
            {line.replace(/\*\*/g, '')}
          </p>
        );
      }
      if (line.startsWith('- ')) {
        const content = line.replace('- ', '');
        const parts = content.split(/(\*\*.*?\*\*)/g);
        return (
          <li key={idx} className="text-xs text-slate-300 ml-4 mb-1 list-disc leading-relaxed">
            {parts.map((part, pIdx) =>
              part.startsWith('**') && part.endsWith('**') ? (
                <strong key={pIdx} className="text-slate-100 font-semibold">
                  {part.replace(/\*\*/g, '')}
                </strong>
              ) : (
                part
              )
            )}
          </li>
        );
      }

      if (line.trim() === '') return <div key={idx} className="h-1.5" />;

      // Paragraph with inline bold parsing
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={idx} className="text-xs text-slate-300 mb-1 leading-relaxed">
          {parts.map((part, pIdx) =>
            part.startsWith('**') && part.endsWith('**') ? (
              <strong key={pIdx} className="text-emerald-300 font-semibold">
                {part.replace(/\*\*/g, '')}
              </strong>
            ) : (
              part
            )
          )}
        </p>
      );
    });
  };

  return (
    <div className="mt-5 bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/30 rounded-2xl p-5 shadow-2xl backdrop-blur-lg relative overflow-hidden transition-all duration-300">
      {/* Background Accent Glow */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex justify-between items-center pb-3 border-b border-slate-800/80 mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-slate-950 font-black text-lg shadow-lg shadow-emerald-500/20">
            👔
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-extrabold text-slate-100">Director of Football AI</h3>
              {explanationData && (
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold rounded-full">
                  {explanationData.is_fallback ? 'Rule Engine' : 'LLM Connected'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              {explanationData ? explanationData.director_name : 'Analysing tactical context...'}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 text-xs px-2.5 py-1 bg-slate-800/60 rounded-lg hover:bg-slate-800 transition-all"
        >
          ✕ Close Briefing
        </button>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="py-6 space-y-3">
          <div className="flex items-center space-x-3 text-xs text-emerald-400 font-mono animate-pulse">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Consulting LLM model & evaluating 5-GW expected points rationale...</span>
          </div>
          <div className="h-4 bg-slate-800/60 rounded-lg w-3/4 animate-pulse" />
          <div className="h-4 bg-slate-800/60 rounded-lg w-full animate-pulse" />
          <div className="h-4 bg-slate-800/60 rounded-lg w-5/6 animate-pulse" />
        </div>
      ) : explanationData ? (
        <div>
          {/* Explanation Content */}
          <div className="prose prose-invert max-w-none text-slate-300">
            {renderFormattedMarkdown(explanationData.explanation)}
          </div>

          {/* Model Footer Tag */}
          <div className="mt-4 pt-3 border-t border-slate-800/60 flex justify-between items-center text-[10px] text-slate-500 font-mono">
            <span>Model: {explanationData.model_version}</span>
            <span>5-Gameweek Optimization Horizon</span>
          </div>
        </div>
      ) : null}
    </div>
  );
};
