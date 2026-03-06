import { useState, useEffect } from 'react';
import {
  Truck, Package, Navigation, RefreshCw, FileSearch,
  TrendingUp, AlertCircle, CheckCircle, Clock,
} from 'lucide-react';
import { getScmKpis, fmtCurrency } from '../../../lib/scm';
import type { ScmKpis } from '../../../lib/scm';

export default function Dashboard() {
  const [kpis, setKpis]       = useState<ScmKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    getScmKpis()
      .then(setKpis)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="p-8 text-center text-red-500">
      <AlertCircle className="w-8 h-8 mx-auto mb-2" />
      <p className="font-medium">Erro ao carregar dados</p>
      <p className="text-sm text-slate-400 mt-1">{error}</p>
    </div>
  );

  const k = kpis!;

  const cards = [
    {
      label: 'Embarques Ativos',
      value: k.inTransit,
      sub: `${k.totalShipments} total`,
      icon: Truck,
      color: 'bg-emerald-50 text-emerald-600',
      border: 'border-l-emerald-500',
    },
    {
      label: 'Entregues',
      value: k.delivered,
      sub: `${k.totalShipments > 0 ? Math.round((k.delivered / k.totalShipments) * 100) : 0}% de conclusão`,
      icon: CheckCircle,
      color: 'bg-green-50 text-green-600',
      border: 'border-l-green-500',
    },
    {
      label: 'Entregas Pendentes',
      value: k.pendingDeliveries,
      sub: 'last-mile em aberto',
      icon: Navigation,
      color: 'bg-sky-50 text-sky-600',
      border: 'border-l-sky-500',
    },
    {
      label: 'Frotas Disponíveis',
      value: `${k.availableVehicles}/${k.totalVehicles}`,
      sub: 'veículos prontos',
      icon: Package,
      color: 'bg-violet-50 text-violet-600',
      border: 'border-l-violet-500',
    },
    {
      label: 'Motoristas Ativos',
      value: k.activeDrivers,
      sub: 'disponíveis/em rota',
      icon: TrendingUp,
      color: 'bg-amber-50 text-amber-600',
      border: 'border-l-amber-500',
    },
    {
      label: 'Auditorias Pendentes',
      value: k.pendingAudits,
      sub: 'fretes para revisar',
      icon: FileSearch,
      color: 'bg-orange-50 text-orange-600',
      border: 'border-l-orange-500',
    },
    {
      label: 'Devoluções em Aberto',
      value: k.openReturns,
      sub: 'logística reversa',
      icon: RefreshCw,
      color: 'bg-rose-50 text-rose-600',
      border: 'border-l-rose-500',
    },
    {
      label: 'Gasto Total em Frete',
      value: fmtCurrency(k.freightSpend),
      sub: `${fmtCurrency(k.auditDiscrepancy)} em divergências`,
      icon: Clock,
      color: 'bg-slate-50 text-slate-600',
      border: 'border-l-slate-400',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Dashboard SCM</h2>
        <p className="text-slate-500 text-sm mt-1">Visão geral em tempo real — Logística & Supply Chain</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`bg-white rounded-xl border border-slate-200 border-l-4 ${card.border} p-4 shadow-sm`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{card.label}</span>
              <div className={`w-8 h-8 rounded-lg ${card.color} flex items-center justify-center`}>
                <card.icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-800">{card.value}</p>
            <p className="text-xs text-slate-400 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Status summary row */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Resumo de Status — Embarques</h3>
        <div className="flex gap-3 flex-wrap">
          {[
            { label: 'Em Trânsito',  value: k.inTransit,                          color: 'bg-emerald-500' },
            { label: 'Entregues',    value: k.delivered,                           color: 'bg-green-500'   },
            { label: 'Pendentes',    value: k.totalShipments - k.inTransit - k.delivered, color: 'bg-amber-400' },
          ].map((item) => {
            const pct = k.totalShipments > 0 ? Math.round((item.value / k.totalShipments) * 100) : 0;
            return (
              <div key={item.label} className="flex-1 min-w-[140px]">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>{item.label}</span>
                  <span>{item.value} ({pct}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className={`${item.color} h-2 rounded-full transition-all`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
