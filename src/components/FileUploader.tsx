import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, FileText, Trash2, Sparkles, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';

interface FileUploaderProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  onGenerate: (useAi: boolean) => void;
  isGenerating: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  files,
  onFilesChange,
  onGenerate,
  isGenerating,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [useAi, setUseAi] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptedTypes = ['.xlsx', '.xls', '.csv', '.pdf', '.docx'];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      appendFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      appendFiles(Array.from(e.target.files));
    }
    // reset value so re-selecting same file triggers change
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const appendFiles = (newFiles: File[]) => {
    const valid = newFiles.filter(f => {
      const ext = '.' + f.name.split('.').pop()?.toLowerCase();
      return acceptedTypes.includes(ext);
    });

    const combined = [...files];
    for (const f of valid) {
      if (!combined.some(existing => existing.name === f.name && existing.size === f.size)) {
        combined.push(f);
      }
    }
    onFilesChange(combined);
  };

  const removeFile = (index: number) => {
    const next = [...files];
    next.splice(index, 1);
    onFilesChange(next);
  };

  const clearAll = () => {
    onFilesChange([]);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['xlsx', 'xls', 'csv'].includes(ext || '')) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-400" />;
    }
    return <FileText className="w-5 h-5 text-blue-400" />;
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <span>Upload Operational Documents</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Attach Excel sheets, status logs, PDFs, or Word documents to synthesize orders and responsibilities.
          </p>
        </div>
        {files.length > 0 && (
          <button
            onClick={clearAll}
            className="text-xs text-slate-400 hover:text-rose-400 transition"
          >
            Clear All ({files.length})
          </button>
        )}
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-slate-700/80 hover:border-slate-600 bg-slate-950/40 hover:bg-slate-900/40'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".xlsx,.xls,.csv,.pdf,.docx"
          onChange={handleFileInput}
          className="hidden"
        />
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-blue-400">
            <Upload className="w-6 h-6" />
          </div>
          <div className="text-sm font-medium text-slate-200">
            <span className="text-blue-400 font-semibold underline underline-offset-2">Click to upload</span> or drag and drop
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
            <span className="px-2 py-0.5 bg-slate-800 rounded">.xlsx</span>
            <span className="px-2 py-0.5 bg-slate-800 rounded">.xls</span>
            <span className="px-2 py-0.5 bg-slate-800 rounded">.csv</span>
            <span className="px-2 py-0.5 bg-slate-800 rounded">.pdf</span>
            <span className="px-2 py-0.5 bg-slate-800 rounded">.docx</span>
          </div>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-4 space-y-2 max-h-48 overflow-y-auto pr-1">
          {files.map((file, idx) => (
            <div
              key={`${file.name}-${idx}`}
              className="flex items-center justify-between px-3.5 py-2.5 bg-slate-800/60 border border-slate-700/60 rounded-xl text-sm"
            >
              <div className="flex items-center space-x-3 truncate">
                {getFileIcon(file.name)}
                <span className="text-slate-200 truncate font-medium">{file.name}</span>
                <span className="text-xs text-slate-400">({formatSize(file.size)})</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(idx);
                }}
                className="text-slate-400 hover:text-rose-400 transition p-1"
                title="Remove file"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Action Bar */}
      <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Grounding & AI Option */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5 text-xs text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Strict Grounding: Missing data is never fabricated</span>
          </div>

          <label className="flex items-center space-x-2 cursor-pointer text-xs text-slate-300">
            <input
              type="checkbox"
              checked={useAi}
              onChange={(e) => setUseAi(e.target.checked)}
              className="rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-0 focus:ring-offset-0"
            />
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              AI Action Synthesis
            </span>
          </label>
        </div>

        {/* Generate Button */}
        <button
          onClick={() => onGenerate(useAi)}
          disabled={files.length === 0 || isGenerating}
          className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Synthesizing Report...</span>
            </>
          ) : (
            <>
              <span>Generate Coordination Report</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
