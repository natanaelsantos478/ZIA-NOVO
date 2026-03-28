// EAM — Dashboard de Ativos
import { useEffect, useState } from 'react';
import {
  Package, DollarSign, Wrench, AlertTriangle,
  TrendingDown, UserX, ArrowRight, Activity, Shield, Calendar,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { getDashboardStatsExtended, type DashboardStatsExtended } from '../../../lib/eam';

const STATUS_LABELS: Record<string, string> = {
  em_aquisicao: 'Em aquisição', disponivel: 'Disponível', em_uso: 'Em uso',
  em_manutencao: 'Em manutenção', em_emprestimo: 'Emprestado',
  descartado: 'Descartado', alienado: 'Alienado', extraviado: 'Extraviado',
};
const STATUS_COLORS: Record<string, string> = {
  em_aquisicao: 'bg-yellow-100 text-yellow-700', disponivel: 'bg-green-100 text-green-700',
  em_uso: 'bg-blue-100 text-blue-700', em_manutencao: 'bg-red-100 text-red-700',
  em_emprestimo: 'bg-purple-100 text-purple-700', descartado: 'bg-slate-100 text-slate-500',
  alienado: 'bg-orange-100 text-orange-600', extraviado: 'bg-rose-100 text-rose-600',
};
const TYPE_LABELS: Record<string, string> = {
  fixo: 'Ativo Fixo', ti: 'TI', mobiliario: 'Mobiliário', intangivel: 'Intangível', veiculo: 'Veículo', outro: 'Outro',
};

const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#14b8a6'];

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
}

function fmtShort(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}K`;
  return fmt(v);
}

interface Props { onNavigate: (id: string) => void; }

export default function AssetsDashboard({ onNavigate }: Props) {
  const [stats, setStats] = useState<DashboardStatsExtended | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStatsExtended()
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) return null;

  const kpis = [
    { label: 'Total de Ativos', value: stats.totalAssets.toString(), icon: Package, color: 'bg-blue-500', action: () => onNavigate('assets') },
    { label: 'Valor Histórico', value: fmt(stats.totalValue), icon: DollarSign, color: 'bg-emerald-500', action: null },
    { label: 'Valor Contábil', value: fmt(stats.totalBookValue), icon: TrendingDown, color: 'bg-violet-500', action: null },
    { label: 'Em Manutenção', value: stats.inMaintenance.toString(), icon: Wrench, color: 'bg-orange-500', action: () => onNavigate('maintenance') },
  ];

  const typeData = stats.byType.map((t, i) => ({
    name: TYPE_LABELS[t.type] ?? t.type,
    value: t.count,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard de Ativos</h1>
        <p className="text-slate-500 text-sm mt-1">Visão consolidada do patrimônio da empresa</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <button
            key={k.label}
            onClick={k.action ?? undefined}
            className={`bg-white rounded-xl p-5 shadow-sm border border-slate-100 text-left transition-all ${k.action ? 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer' : 'cursor-default'}`}
          >
            <div className={`w-10 h-10 ${k.color} rounded-lg flex items-center justify-center mb-3`}>
              <k.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-xs text-slate-500 mb-1">{k.label}</p>
            <p className="text-xl font-bold text-slate-800">{k.value}</p>
          </button>
        ))}
      </div>

      {/* Charts row 1: Type pie + Status list + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut por tipo */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Ativos por Tipo</h2>
          {typeData.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Nenhum ativo cadastrado</p>
          ) : (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {typeData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [v, 'Ativos']}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1.5 w-full">
                {typeData.map((t) => (
                  <div key={t.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                      <span className="text-slate-600">{t.name}</span>
                    </div>
                    <span className="font-semibold text-slate-700">{t.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Por status */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Ativos por Status</h2>
          {stats.byStatus.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Nenhum ativo cadastrado</p>
          ) : (
            <div className="space-y-2.5">
              {stats.byStatus.map((s) => {
                const pct = stats.totalAssets > 0 ? Math.round(s.count / stats.totalAssets * 100) : 0;
                return (
                  <div key={s.status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[s.status] ?? 'bg-slate-100 text-slate-600'}`}>
                        {STATUS_LABELS[s.status] ?? s.status}
                      </span>
                      <span className="text-xs font-semibold text-slate-700">{s.count}</span>
                    </div>
                    <div className="h-1 bg-slate-100 rounded-full">
                      <div className="h-1 bg-blue-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Atividade recente */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-500" /> Atividade Recente
          </h2>
          {stats.recentActivity.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Sem atividade registrada</p>
          ) : (
            <div className="space-y-3">
              {stats.recentActivity.slice(0, 6).map((ev) => (
                <div key={ev.id} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-slate-700 capitalize">{ev.event_type.replace('_', ' ')}</p>
                    <p className="text-xs text-slate-400">{new Date(ev.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Charts row 2: Value evolution + Maintenance costs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolução patrimonial 12 meses */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Evolução Patrimonial (12 meses)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={stats.valueEvolution} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10, fill: '#94a3b8' }} width={60} />
              <Tooltip
                formatter={(v: number) => [fmt(v)]}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="value"
                name="Valor Histórico"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="bookValue"
                name="Valor Contábil"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
                strokeDasharray="5 3"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Custo de manutenção 6 meses */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Custo de Manutenção (6 meses)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.maintenanceCostMonths} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10, fill: '#94a3b8' }} width={60} />
              <Tooltip
                formatter={(v: number) => [fmt(v), 'Custo']}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Bar dataKey="cost" name="Custo" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alerts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Seguros vencendo */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-500" /> Seguros Vencendo
          </h2>
          {stats.insuranceExpiringSoon.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-3">Nenhum seguro próximo do vencimento</p>
          ) : (
            <div className="space-y-2">
              {stats.insuranceExpiringSoon.slice(0, 4).map((pol) => (
                <div key={pol.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                  <span className="text-slate-700 font-medium truncate">{pol.insurer_name}</span>
                  <span className="text-amber-600 font-medium shrink-0 ml-1">
                    {new Date(pol.coverage_end).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => onNavigate('insurance')} className="mt-3 text-xs text-blue-600 hover:underline flex items-center gap-1">
            Ver seguros <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Manutenção vencida */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-red-500" /> Manutenção Vencida
          </h2>
          {stats.maintenanceOverdue.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-3">Nenhuma manutenção vencida</p>
          ) : (
            <div className="space-y-2">
              {stats.maintenanceOverdue.slice(0, 4).map((p) => (
                <div key={p.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                  <span className="text-slate-700 font-medium truncate">{p.name}</span>
                  <span className="text-red-600 font-medium shrink-0 ml-1">
                    {p.next_due_date ? new Date(p.next_due_date).toLocaleDateString('pt-BR') : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => onNavigate('maintenance')} className="mt-3 text-xs text-blue-600 hover:underline flex items-center gap-1">
            Ver manutenção <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Garantias vencendo */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Garantias Vencendo
          </h2>
          {stats.warrantyExpiringSoon.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-3">Nenhuma garantia próxima do vencimento</p>
          ) : (
            <div className="space-y-2">
              {stats.warrantyExpiringSoon.slice(0, 4).map((a) => (
                <div key={a.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                  <span className="text-slate-700 font-medium truncate">{a.name}</span>
                  <span className="text-amber-600 font-medium shrink-0 ml-1">
                    {a.warranty_end ? new Date(a.warranty_end).toLocaleDateString('pt-BR') : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => onNavigate('assets')} className="mt-3 text-xs text-blue-600 hover:underline flex items-center gap-1">
            Ver todos <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Sem responsável */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <UserX className="w-4 h-4 text-red-500" /> Sem Responsável
          </h2>
          {stats.assetsWithoutResponsible.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-3">Todos os ativos têm responsável</p>
          ) : (
            <div className="space-y-2">
              {stats.assetsWithoutResponsible.slice(0, 4).map((a) => (
                <div key={a.id} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-0">
                  <span className="text-slate-700 font-medium truncate">{a.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ml-1 ${STATUS_COLORS[a.status] ?? ''}`}>
                    {STATUS_LABELS[a.status] ?? a.status}
                  </span>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => onNavigate('assets')} className="mt-3 text-xs text-blue-600 hover:underline flex items-center gap-1">
            Gerenciar <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
