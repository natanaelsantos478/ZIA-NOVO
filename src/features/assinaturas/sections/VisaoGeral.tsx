import { useEffect, useState } from 'react';
import {
  TrendingUp, DollarSign, BarChart3, CreditCard,
  Clock, AlertCircle, PauseCircle, XCircle,
} from 'lucide-react';
import Loader from '../../../components/UI/Loader';
import { getAssinaturas, calcKPIs } from '../../../lib/assinaturas';
import type { ErpAssinatura, AssinaturasKPIs } from '../../../lib/assinaturas';

const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const STATUS_META: Record<string, { label: string; color: string; bar: string }> = {
  ativa:       { label: 'Ativa',        color: 'text-green-700',  bar: 'bg-green-500'   },
  em_trial:    { label: 'Em Trial',     color: 'text-amber-700',  bar: 'bg-amber-400'   },
  pausada:     { label: 'Pausada',      color: 'text-yellow-700', bar: 'bg-yellow-400'  },
  inadimplente:{ label: 'Inadimplente', color: 'text-red-700',    bar: 'bg-red-500'     },
  cancelada:   { label: 'Cancelada',    color: 'text-slate-600',  bar: 'bg-slate-400'   },
  encerrada:   { label: 'Encerrada',    color: 'text-slate-500',  bar: 'bg-slate-300'   },
};

const STATUS_BADGE: Record<string, string> = {
  ativa:        'bg-green-100 text-green-800',
  em_trial:     'bg-amber-100 text-amber-800',
  pausada:      'bg-yellow-100 text-yellow-800',
  inadimplente: 'bg-red-100 text-red-800',
  cancelada:    'bg-slate-100 text-slate-700',
  encerrada:    'bg-slate-100 text-slate-500',
};

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  colorBg: string;
  colorIcon: string;
}

function KpiCard({ label, value, icon: Icon, colorBg, colorIcon }: KpiCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4 shadow-sm">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${colorBg}`}>
        <Icon className={`w-5 h-5 ${colorIcon}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium truncate">{label}</p>
        <p className="text-xl font-bold text-slate-800 leading-tight truncate">{value}</p>
      </div>
    </div>
  );
}

export default function VisaoGeral() {
  const [assinaturas, setAssinaturas] = useState<ErpAssinatura[]>([]);
  const [kpis, setKpis] = useState<AssinaturasKPIs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getAssinaturas()
      .then((data) => {
        setAssinaturas(data);
        setKpis(calcKPIs(data));
      })
      .catch((err: Error) => setError(err.message ?? 'Erro ao carregar assinaturas.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700 text-sm">
          {error}
        </div>
      </div>
    );
  }

  // Status distribution
  const statusKeys = ['ativa', 'em_trial', 'pausada', 'inadimplente', 'cancelada', 'encerrada'] as const;
  const statusCounts: Record<string, number> = {};
  for (const k of statusKeys) statusCounts[k] = 0;
  for (const a of assinaturas) {
    if (statusCounts[a.status] !== undefined) statusCounts[a.status]++;
    else statusCounts[a.status] = (statusCounts[a.status] ?? 0) + 1;
  }
  const total = assinaturas.length || 1; // avoid division by zero

  // 5 most recent
  const recent = [...assinaturas].slice(0, 5);

  return (
    <div className="p-6 space-y-6">
      {/* Page title */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Visão Geral</h1>
        <p className="text-sm text-slate-500 mt-0.5">Painel de métricas do módulo de Assinaturas</p>
      </div>

      {/* KPI row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Assinaturas Ativas"
          value={kpis?.total_ativas ?? 0}
          icon={TrendingUp}
          colorBg="bg-green-50"
          colorIcon="text-green-600"
        />
        <KpiCard
          label="MRR"
          value={brl(kpis?.mrr ?? 0)}
          icon={DollarSign}
          colorBg="bg-blue-50"
          colorIcon="text-blue-600"
        />
        <KpiCard
          label="ARR Projetado"
          value={brl(kpis?.arr ?? 0)}
          icon={BarChart3}
          colorBg="bg-indigo-50"
          colorIcon="text-indigo-600"
        />
        <KpiCard
          label="Ticket Médio"
          value={brl(kpis?.ticket_medio ?? 0)}
          icon={CreditCard}
          colorBg="bg-slate-100"
          colorIcon="text-slate-600"
        />
      </div>

      {/* KPI row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Em Trial"
          value={kpis?.total_trial ?? 0}
          icon={Clock}
          colorBg="bg-amber-50"
          colorIcon="text-amber-600"
        />
        <KpiCard
          label="Inadimplentes"
          value={kpis?.total_inadimplentes ?? 0}
          icon={AlertCircle}
          colorBg="bg-red-50"
          colorIcon="text-red-600"
        />
        <KpiCard
          label="Pausadas"
          value={kpis?.total_pausadas ?? 0}
          icon={PauseCircle}
          colorBg="bg-yellow-50"
          colorIcon="text-yellow-600"
        />
        <KpiCard
          label="Churn do Mês"
          value={kpis?.total_canceladas_mes ?? 0}
          icon={XCircle}
          colorBg="bg-red-50"
          colorIcon="text-red-500"
        />
      </div>

      {/* Distribution + Growth panels */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Left: Distribution by status */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Distribuição por Status</h2>

          {/* Stacked bar */}
          <div className="flex h-4 rounded-full overflow-hidden mb-4">
            {statusKeys.map((key) => {
              const count = statusCounts[key] ?? 0;
              const pct = (count / total) * 100;
              if (pct === 0) return null;
              return (
                <div
                  key={key}
                  className={STATUS_META[key].bar}
                  style={{ width: `${pct}%` }}
                  title={`${STATUS_META[key].label}: ${count}`}
                />
              );
            })}
          </div>

          {/* Legend */}
          <div className="space-y-2">
            {statusKeys.map((key) => {
              const count = statusCounts[key] ?? 0;
              const pct = total > 1 ? ((count / (total)) * 100).toFixed(1) : '0.0';
              return (
                <div key={key} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full inline-block ${STATUS_META[key].bar}`} />
                    <span className={STATUS_META[key].color + ' font-medium'}>
                      {STATUS_META[key].label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500">
                    <span>{count}</span>
                    <span className="w-10 text-right">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Growth placeholder */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col items-center justify-center gap-3 text-center min-h-[200px]">
          <BarChart3 className="w-10 h-10 text-slate-300" />
          <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
            Conecte dados históricos para visualizar o gráfico de crescimento
          </p>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Crescimento</h2>
        </div>
      </div>

      {/* Recent subscriptions table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">Últimas Assinaturas</h2>
        </div>
        {recent.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400">
            Nenhuma assinatura encontrada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Cliente</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Plano</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Valor Mensal</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Início</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recent.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-slate-800">
                      {a.erp_clientes?.nome ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {a.erp_produtos?.nome ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 font-medium">
                      {brl(a.valor_mensal)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[a.status] ?? 'bg-slate-100 text-slate-600'}`}>
                        {STATUS_META[a.status]?.label ?? a.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {a.data_inicio
                        ? new Date(a.data_inicio).toLocaleDateString('pt-BR')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
