import React from 'react';
import { OrderRecord } from '../types';
import { AlertTriangle, FileSpreadsheet, Layers } from 'lucide-react';

interface ConflictViewerProps {
  orders: OrderRecord[];
}

export const ConflictViewer: React.FC<ConflictViewerProps> = ({ orders }) => {
  const conflictingOrders = orders.filter(o => o.conflicts && o.conflicts.length > 0);

  if (conflictingOrders.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-900/40 border border-slate-800 rounded-2xl">
        <Layers className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
        <h4 className="text-sm font-semibold text-slate-200">No Cross-Document Conflicts</h4>
        <p className="text-xs text-slate-400 mt-1">All uploaded files provided consistent or complementary order data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center space-x-3">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
        <p className="text-xs text-amber-200">
          Identified discrepancies between uploaded source files for <span className="font-bold">{conflictingOrders.length}</span> order(s).
          Review the differing values below to decide operational follow-ups.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {conflictingOrders.map((order, idx) => (
          <div key={idx} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-lg font-mono text-xs font-bold border border-blue-500/20">
                  {order.orderId}
                </span>
                <span className="font-semibold text-white text-sm">{order.customer}</span>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {order.conflicts.length} field conflict(s)
              </span>
            </div>

            <div className="space-y-3">
              {order.conflicts.map((conflict, cIdx) => (
                <div key={cIdx} className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
                  <div className="text-xs font-semibold text-amber-400 flex items-center space-x-1.5">
                    <span>Field: {conflict.field}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {conflict.values.map((v, vIdx) => (
                      <div key={vIdx} className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                        <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
                          <span className="truncate">{v.source}</span>
                        </div>
                        <div className="text-white font-medium pl-5">{v.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
