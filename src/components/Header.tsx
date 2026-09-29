import React from 'react';
import { FileText, Sparkles, Database, CheckCircle2, AlertCircle } from 'lucide-react';

interface HeaderProps {
  onLoadSample: () => void;
  isLoadingSample: boolean;
  hasData: boolean;
  llmConfigured?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onLoadSample,
  isLoadingSample,
  hasData,
  llmConfigured = false,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo & Title */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold text-white tracking-tight">AI Coordination Report Generator</h1>
              <span className="px-2 py-0.5 text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full">
                MVP Engine
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Operational documents to structured coordination report &middot; <span className="text-emerald-400 font-medium">Strict Grounding</span>
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-3">
          {/* LLM / Offline status badge */}
          <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 bg-slate-800/80 border border-slate-700/60 rounded-lg text-xs text-slate-300">
            <div className={`w-2 h-2 rounded-full ${llmConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-blue-400'}`} />
            <span>{llmConfigured ? 'LLM Adapter Active' : 'Deterministic Grounded Engine'}</span>
          </div>

          {/* Load Sample Button */}
          <button
            onClick={onLoadSample}
            disabled={isLoadingSample}
            className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 hover:border-slate-600 transition shadow-sm disabled:opacity-50"
            title="Load the 12-order ORDER STATUS Sept.xlsx sample workbook"
          >
            <Database className="w-3.5 h-3.5 text-blue-400" />
            <span>{isLoadingSample ? 'Loading Sample...' : 'Load Sample (Sept.xlsx)'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
