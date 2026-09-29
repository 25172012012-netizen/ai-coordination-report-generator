import React from 'react';
import { OverallSummary } from '../types';
import { ShoppingCart, Factory, Wrench, Truck, AlertTriangle, Layers } from 'lucide-react';

interface SummaryCardsProps {
  summary: OverallSummary;
  selectedFilter: string;
  onSelectFilter: (filter: string) => void;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  summary,
  selectedFilter,
  onSelectFilter,
}) => {
  const activeDepts = summary.activeDepartments || ['purchase', 'production', 'service', 'dispatch'];

  const allCards = [
    {
      id: 'all',
      title: 'Total Orders',
      count: summary.totalOrders,
      icon: Layers,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      activeBorder: 'border-blue-500 ring-2 ring-blue-500/20',
      alwaysShow: true,
    },
    {
      id: 'purchase',
      title: 'Purchase Pending',
      count: summary.purchasePending,
      icon: ShoppingCart,
      color: 'text-sky-400',
      bgColor: 'bg-sky-500/10',
      borderColor: 'border-sky-500/20',
      activeBorder: 'border-sky-500 ring-2 ring-sky-500/20',
      deptKey: 'purchase',
    },
    {
      id: 'production',
      title: 'Production Pending',
      count: summary.productionPending,
      icon: Factory,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/20',
      activeBorder: 'border-purple-500 ring-2 ring-purple-500/20',
      deptKey: 'production',
    },
    {
      id: 'service',
      title: 'Service Pending',
      count: summary.servicePending,
      icon: Wrench,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/20',
      activeBorder: 'border-amber-500 ring-2 ring-amber-500/20',
      deptKey: 'service',
    },
    {
      id: 'dispatch',
      title: 'Dispatch Pending',
      count: summary.dispatchPending,
      icon: Truck,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/20',
      activeBorder: 'border-emerald-500 ring-2 ring-emerald-500/20',
      deptKey: 'dispatch',
    },
    {
      id: 'critical',
      title: 'Critical / Delayed',
      count: summary.criticalDelayedOrders,
      icon: AlertTriangle,
      color: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/20',
      activeBorder: 'border-rose-500 ring-2 ring-rose-500/20',
      alwaysShow: true,
    },
  ];

  // Only render cards that are always shown or whose department is present in uploaded document
  const visibleCards = allCards.filter(c => c.alwaysShow || activeDepts.includes(c.deptKey as any));

  return (
    <div className={`grid gap-3 grid-cols-2 sm:grid-cols-${Math.min(visibleCards.length, 6)}`}>
      {visibleCards.map(card => {
        const Icon = card.icon;
        const isSelected = selectedFilter === card.id;

        return (
          <button
            key={card.id}
            onClick={() => onSelectFilter(card.id)}
            className={`flex flex-col p-4 rounded-xl border bg-slate-900/70 text-left transition-all hover:translate-y-[-2px] ${
              isSelected ? card.activeBorder : card.borderColor
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-400 truncate">{card.title}</span>
              <div className={`p-1.5 rounded-lg ${card.bgColor} ${card.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">{card.count}</div>
          </button>
        );
      })}
    </div>
  );
};
