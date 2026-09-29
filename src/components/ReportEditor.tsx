import React, { useState } from 'react';
import { Copy, Check, Download, Printer, RotateCcw, Maximize2, Minimize2, FileCode } from 'lucide-react';

interface ReportEditorProps {
  reportText: string;
  originalReportText: string;
  onTextChange: (text: string) => void;
  onCopy: () => void;
  onDownloadTxt: () => void;
  onPrintPdf: () => void;
  onReset: () => void;
  isCopied: boolean;
}

export const ReportEditor: React.FC<ReportEditorProps> = ({
  reportText,
  originalReportText,
  onTextChange,
  onCopy,
  onDownloadTxt,
  onPrintPdf,
  onReset,
  isCopied,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const linesCount = reportText.split('\n').length;
  const wordsCount = reportText.trim().split(/\s+/).filter(Boolean).length;
  const charsCount = reportText.length;
  const isModified = reportText !== originalReportText;

  return (
    <div
      className={`bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-col shadow-2xl transition-all ${
        isFullscreen ? 'fixed inset-4 z-50 bg-slate-950/95 border-slate-700' : 'h-[680px]'
      }`}
    >
      {/* Editor Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-5 py-3.5 border-b border-slate-800 gap-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
            <FileCode className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Fixed-Format Coordination Report</h3>
            <p className="text-xs text-slate-400">
              Deterministic, editable operational output ready for clipboard, TXT, or PDF.
            </p>
          </div>
          {isModified && (
            <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full">
              Edited
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {isModified && (
            <button
              onClick={onReset}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 transition"
              title="Reset edits to original generated report"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          <button
            onClick={onCopy}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-sm transition"
            title="Copy full report to clipboard"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Report</span>
              </>
            )}
          </button>

          <button
            onClick={onDownloadTxt}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 transition"
            title="Download report as .txt file"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>TXT</span>
          </button>

          <button
            onClick={onPrintPdf}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 transition"
            title="Print or Save as PDF"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400" />
            <span>Print / PDF</span>
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 p-4 overflow-hidden relative">
        <textarea
          value={reportText}
          onChange={(e) => onTextChange(e.target.value)}
          spellCheck={false}
          className="w-full h-full bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 font-mono text-xs sm:text-sm text-slate-200 leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-blue-500/50 shadow-inner"
          placeholder="Upload operational documents to generate the coordination report..."
        />
      </div>

      {/* Editor Footer / Metadata Bar */}
      <div className="px-5 py-2.5 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center space-x-4">
          <span>{linesCount} lines</span>
          <span>&middot;</span>
          <span>{wordsCount} words</span>
          <span>&middot;</span>
          <span>{charsCount} characters</span>
        </div>
        <div className="text-slate-400 font-mono text-[11px]">
          Template: Fixed Operational Schema
        </div>
      </div>
    </div>
  );
};
