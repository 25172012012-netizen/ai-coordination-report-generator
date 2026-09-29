import React, { useState } from 'react';
import { OrderRecord, NOT_AVAILABLE } from '../types';
import { ShoppingCart, Factory, Wrench, Truck, AlertTriangle, FileText, Search, ChevronDown, ChevronUp } from 'lucide-react';

interface OrderCardListProps {
  orders: OrderRecord[];
  filter: string;
}

export const OrderCardList: React.FC<OrderCardListProps> = ({ orders, filter }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  const filteredOrders = orders.filter(order => {
    if (filter === 'purchase' && !order.pendingDepartments.includes('purchase')) return false;
    if (filter === 'production' && !order.pendingDepartments.includes('production')) return false;
    if (filter === 'service' && !order.pendingDepartments.includes('service')) return false;
    if (filter === 'dispatch' && !order.pendingDepartments.includes('dispatch')) return false;
    if (filter === 'critical' && !order.isCritical) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const match =
        order.orderId.toLowerCase().includes(q) ||
        order.customer.toLowerCase().includes(q) ||
        order.product.toLowerCase().includes(q) ||
        order.orderStatus.toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  const toggleExpand = (id: string) => {
    setExpandedOrders(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const renderValue = (val: string) => {
    if (!val || val === NOT_AVAILABLE) {
      return <span className="text-slate-500 italic">{NOT_AVAILABLE}</span>;
    }
    return <span className="text-slate-200 font-medium">{val}</span>;
  };

  return (
    <div className="space-y-4">
      {/* Search and count bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by OA, Customer, Product..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-700/60 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="text-xs text-slate-400">
          Showing <span className="text-white font-semibold">{filteredOrders.length}</span> of {orders.length} orders
        </div>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 gap-4">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/40 border border-slate-800/80 rounded-2xl">
            <p className="text-sm text-slate-400">No orders match the selected filter or search term.</p>
          </div>
        ) : (
          filteredOrders.map((order, index) => {
            const isExpanded = expandedOrders[order.orderId] ?? true;
            const presentDepts = order.presentDepartments || [];

            return (
              <div
                key={`${order.orderId}-${index}`}
                className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-lg transition hover:border-slate-700"
              >
                {/* Card Header */}
                <div
                  onClick={() => toggleExpand(order.orderId)}
                  className="p-5 flex items-center justify-between cursor-pointer select-none bg-slate-850/50 hover:bg-slate-800/50 transition border-b border-slate-800/60"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="px-3 py-1 rounded-lg text-xs font-mono font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                      {order.orderId}
                    </span>
                    <h4 className="text-sm font-bold text-white">{order.customer}</h4>
                    <span className="text-xs text-slate-400 font-medium">({order.product})</span>
                  </div>

                  <div className="flex items-center space-x-3">
                    {order.isCritical && (
                      <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Action Required</span>
                      </span>
                    )}
                    {order.quantity !== NOT_AVAILABLE && (
                      <span className="text-xs text-slate-400 font-medium">Qty: {order.quantity}</span>
                    )}
                    <button className="text-slate-400 hover:text-white p-1">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Collapsible Content */}
                {isExpanded && (
                  <div className="p-5 space-y-5">
                    {/* Conflict Warning if present */}
                    {order.conflicts && order.conflicts.length > 0 && (
                      <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1.5">
                        <div className="flex items-center space-x-2 text-xs font-bold text-amber-400">
                          <AlertTriangle className="w-4 h-4" />
                          <span>Cross-Document Conflict Detected:</span>
                        </div>
                        {order.conflicts.map((c, cIdx) => (
                          <div key={cIdx} className="text-xs text-slate-300 pl-6 space-y-0.5">
                            <span className="font-semibold text-amber-300">{c.field}:</span>
                            {c.values.map((v, vIdx) => (
                              <div key={vIdx} className="text-[11px] text-slate-400">
                                &bull; <span className="text-slate-200">{v.source}</span>: &quot;{v.value}&quot;
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Department Breakdown - Only rendered for departments present in uploaded document */}
                    {presentDepts.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* 1. PURCHASE */}
                        {presentDepts.includes('purchase') && (
                          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
                            <div className="flex items-center space-x-2 text-xs font-bold text-sky-400 border-b border-slate-800 pb-2">
                              <ShoppingCart className="w-3.5 h-3.5" />
                              <span>PURCHASE</span>
                            </div>
                            <div className="text-xs space-y-1">
                              {order.purchase.material !== NOT_AVAILABLE && <div className="text-slate-400">&bull; Material: {renderValue(order.purchase.material)}</div>}
                              {order.purchase.availability !== NOT_AVAILABLE && <div className="text-slate-400">&bull; Availability: {renderValue(order.purchase.availability)}</div>}
                              {order.purchase.expectedDate !== NOT_AVAILABLE && <div className="text-slate-400">&bull; Expected Date: {renderValue(order.purchase.expectedDate)}</div>}
                              <div className="text-slate-400">&bull; Pending Action: {renderValue(order.purchase.pendingAction)}</div>
                            </div>
                          </div>
                        )}

                        {/* 2. PRODUCTION */}
                        {presentDepts.includes('production') && (
                          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
                            <div className="flex items-center space-x-2 text-xs font-bold text-purple-400 border-b border-slate-800 pb-2">
                              <Factory className="w-3.5 h-3.5" />
                              <span>PRODUCTION</span>
                            </div>
                            <div className="text-xs space-y-1">
                              <div className="text-slate-400">&bull; Status: {renderValue(order.production.status)}</div>
                              {order.production.completion !== NOT_AVAILABLE && <div className="text-slate-400">&bull; Completion: {renderValue(order.production.completion)}</div>}
                              {order.production.targetDate !== NOT_AVAILABLE && <div className="text-slate-400">&bull; Target Date: {renderValue(order.production.targetDate)}</div>}
                              <div className="text-slate-400">&bull; Pending Action: {renderValue(order.production.pendingAction)}</div>
                            </div>
                          </div>
                        )}

                        {/* 3. SERVICE */}
                        {presentDepts.includes('service') && (
                          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
                            <div className="flex items-center space-x-2 text-xs font-bold text-amber-400 border-b border-slate-800 pb-2">
                              <Wrench className="w-3.5 h-3.5" />
                              <span>SERVICE</span>
                            </div>
                            <div className="text-xs space-y-1">
                              <div className="text-slate-400">&bull; Site Status: {renderValue(order.service.siteStatus)}</div>
                              {order.service.installation !== NOT_AVAILABLE && <div className="text-slate-400">&bull; Installation: {renderValue(order.service.installation)}</div>}
                              {order.service.commissioning !== NOT_AVAILABLE && <div className="text-slate-400">&bull; Commissioning: {renderValue(order.service.commissioning)}</div>}
                              {order.service.pendingIssue !== NOT_AVAILABLE && <div className="text-slate-400">&bull; Pending Issue: {renderValue(order.service.pendingIssue)}</div>}
                              <div className="text-slate-400">&bull; Required Action: {renderValue(order.service.requiredAction)}</div>
                            </div>
                          </div>
                        )}

                        {/* 4. DISPATCH */}
                        {presentDepts.includes('dispatch') && (
                          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 space-y-2">
                            <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400 border-b border-slate-800 pb-2">
                              <Truck className="w-3.5 h-3.5" />
                              <span>DISPATCH</span>
                            </div>
                            <div className="text-xs space-y-1">
                              <div className="text-slate-400">&bull; Status: {renderValue(order.dispatch.status)}</div>
                              {order.dispatch.plannedDate !== NOT_AVAILABLE && <div className="text-slate-400">&bull; Planned Date: {renderValue(order.dispatch.plannedDate)}</div>}
                              {order.dispatch.pendingRequirement !== NOT_AVAILABLE && <div className="text-slate-400">&bull; Pending Req: {renderValue(order.dispatch.pendingRequirement)}</div>}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}

                    {/* Extra Document Columns */}
                    {order.customAttributes && Object.keys(order.customAttributes).length > 0 && (
                      <div className="p-3.5 bg-slate-950/40 border border-slate-800/80 rounded-xl">
                        <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                          Additional Document Attributes
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {Object.entries(order.customAttributes).map(([k, v]) => (
                            <div key={k} className="flex items-start space-x-2">
                              <span className="font-semibold text-slate-400">{k}:</span>
                              <span className="text-slate-200">{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Required Checklist */}
                    {presentDepts.length > 0 && (
                      <div className="p-3.5 bg-slate-950/40 border border-slate-800/80 rounded-xl">
                        <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                          Action Required
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {presentDepts.includes('purchase') && (
                            <div className="flex items-start space-x-2">
                              <span className="font-semibold text-sky-400">PURCHASE:</span>
                              <span className="text-slate-300">{order.actionRequired.purchase}</span>
                            </div>
                          )}
                          {presentDepts.includes('production') && (
                            <div className="flex items-start space-x-2">
                              <span className="font-semibold text-purple-400">PRODUCTION:</span>
                              <span className="text-slate-300">{order.actionRequired.production}</span>
                            </div>
                          )}
                          {presentDepts.includes('service') && (
                            <div className="flex items-start space-x-2">
                              <span className="font-semibold text-amber-400">SERVICE:</span>
                              <span className="text-slate-300">{order.actionRequired.service}</span>
                            </div>
                          )}
                          {presentDepts.includes('dispatch') && (
                            <div className="flex items-start space-x-2">
                              <span className="font-semibold text-emerald-400">DISPATCH:</span>
                              <span className="text-slate-300">{order.actionRequired.dispatch}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Source Footer */}
                    <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/50">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Sources: <span className="text-slate-300">{order.sources.join(', ')}</span></span>
                      </div>
                      <span className="text-emerald-400 font-medium">{order.confidence}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
