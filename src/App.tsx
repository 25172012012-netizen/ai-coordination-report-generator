import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { FileUploader } from './components/FileUploader';
import { SummaryCards } from './components/SummaryCards';
import { ReportEditor } from './components/ReportEditor';
import { OrderCardList } from './components/OrderCardList';
import { ConflictViewer } from './components/ConflictViewer';
import { PrintReportModal } from './components/PrintReportModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { GenerationResult } from './types';
import { FileText, LayoutGrid, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

export const App: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [editableReportText, setEditableReportText] = useState<string>('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'editor' | 'cards' | 'conflicts'>('editor');
  const [isCopied, setIsCopied] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [llmConfigured, setLlmConfigured] = useState(false);

  // Check health and LLM availability on mount
  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        if (data && data.llmConfigured !== undefined) {
          setLlmConfigured(data.llmConfigured);
        }
      })
      .catch(() => {
        // server might be booting up or local dev
      });
  }, []);

  const addToast = (type: 'success' | 'error' | 'info', title: string, description?: string) => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts(prev => [...prev, { id, type, title, description }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleGenerate = async (useAi: boolean) => {
    if (files.length === 0) {
      addToast('error', 'No files uploaded', 'Please upload at least one .xlsx, .xls, .csv, .pdf, or .docx file.');
      return;
    }

    setIsGenerating(true);
    try {
      const formData = new FormData();
      files.forEach(f => formData.append('files', f));
      formData.append('useAI', String(useAi));

      const response = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate report');
      }

      setResult(data);
      setEditableReportText(data.reportText);
      setSelectedFilter('all');

      if (data.hasConflicts) {
        addToast('info', 'Report Generated with Conflicts', 'Discrepancies detected across uploaded files. Check the Conflicts tab.');
      } else {
        addToast('success', 'Report Generated Successfully', `Synthesized ${data.orders.length} order(s) strictly from uploaded data.`);
      }

      if (data.warnings && data.warnings.length > 0) {
        data.warnings.forEach((w: string) => {
          addToast('info', 'Document Note', w);
        });
      }
    } catch (err: any) {
      addToast('error', 'Generation Error', err.message || 'An unexpected error occurred during processing.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLoadSample = async () => {
    setIsLoadingSample(true);
    try {
      const response = await fetch('/api/sample');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load sample workbook');
      }

      setResult(data);
      setEditableReportText(data.reportText);
      setSelectedFilter('all');
      addToast('success', 'Sample Loaded (ORDER STATUS Sept.xlsx)', '12 orders extracted and mapped into fixed coordination report.');
    } catch (err: any) {
      addToast('error', 'Sample Load Failed', err.message);
    } finally {
      setIsLoadingSample(false);
    }
  };

  const handleCopy = () => {
    if (!editableReportText) return;
    navigator.clipboard.writeText(editableReportText).then(() => {
      setIsCopied(true);
      addToast('success', 'Copied to Clipboard', 'Coordination report is ready to paste into emails or messages.');
      setTimeout(() => setIsCopied(false), 2500);
    });
  };

  const handleDownloadTxt = () => {
    if (!editableReportText) return;
    const blob = new Blob([editableReportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `coordination_report_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    addToast('success', 'File Downloaded', 'Saved as .txt format.');
  };

  const handlePrintPdf = () => {
    setIsPrintModalOpen(true);
  };

  const handleReset = () => {
    if (result) {
      setEditableReportText(result.reportText);
      addToast('info', 'Reset Edits', 'Reverted back to generated report text.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Navigation Header */}
      <Header
        onLoadSample={handleLoadSample}
        isLoadingSample={isLoadingSample}
        hasData={Boolean(result)}
        llmConfigured={llmConfigured}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 no-print">
        {/* Upload Zone */}
        <section>
          <FileUploader
            files={files}
            onFilesChange={setFiles}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
          />
        </section>

        {/* Results Area */}
        {result && (
          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* KPI Summary Cards */}
            <SummaryCards
              summary={result.summary}
              selectedFilter={selectedFilter}
              onSelectFilter={setSelectedFilter}
            />

            {/* View Switcher Tabs */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setActiveTab('editor')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
                    activeTab === 'editor'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Fixed-Format Report (Editable)</span>
                </button>

                <button
                  onClick={() => setActiveTab('cards')}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
                    activeTab === 'cards'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span>Order Cards Matrix ({result.orders.length})</span>
                </button>

                {result.hasConflicts && (
                  <button
                    onClick={() => setActiveTab('conflicts')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
                      activeTab === 'conflicts'
                        ? 'bg-amber-600 text-white shadow-md'
                        : 'text-amber-400 hover:text-white'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>Conflicts</span>
                  </button>
                )}
              </div>

              {/* Source summary tag */}
              <div className="hidden md:flex items-center space-x-2 text-xs text-slate-400">
                <Info className="w-3.5 h-3.5 text-blue-400" />
                <span>Files processed: <span className="text-slate-200 font-medium">{result.filesProcessed.join(', ')}</span></span>
              </div>
            </div>

            {/* Tab 1: Fixed Format Report Editor */}
            {activeTab === 'editor' && (
              <ReportEditor
                reportText={editableReportText}
                originalReportText={result.reportText}
                onTextChange={setEditableReportText}
                onCopy={handleCopy}
                onDownloadTxt={handleDownloadTxt}
                onPrintPdf={handlePrintPdf}
                onReset={handleReset}
                isCopied={isCopied}
              />
            )}

            {/* Tab 2: Interactive Order Cards */}
            {activeTab === 'cards' && (
              <OrderCardList
                orders={result.orders}
                filter={selectedFilter}
              />
            )}

            {/* Tab 3: Conflicts Viewer */}
            {activeTab === 'conflicts' && (
              <ConflictViewer
                orders={result.orders}
              />
            )}
          </section>
        )}
      </main>

      {/* Hidden Print Container specifically targeted for window.print() */}
      <div className="hidden print:block report-print-container">
        {editableReportText}
      </div>

      {/* Print / Save PDF Modal */}
      <PrintReportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        reportText={editableReportText}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};
