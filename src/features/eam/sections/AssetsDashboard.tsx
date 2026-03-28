import { useEffect, useState } from 'react';
import {
  Package, DollarSign, Wrench, AlertTriangle,
  TrendingDown, UserX, ArrowRight, Activity,
} from 'lucide-react';
import { getDashboardStats, type DashboardStats } from '../../../lib/eam';

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

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

interface Props { onNavigate: (id: string) => void; }

export default function AssetsDashboard({ onNavigate }: Props) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats()
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Por status */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Ativos por Status</h2>
          {stats.byStatus.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Nenhum ativo cadastrado</p>
          ) : (
            <div className="space-y-2">
              {stats.byStatus.map((s) => (
                <div key={s.status} className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[s.status] ?? 'bg-slate-100 text-slate-600'}`}>
                    {STATUS_LABELS[s.status] ?? s.status}
                  </span>
                  <span className="text-sm font-semibold text-slate-700">{s.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Por tipo */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Ativos por Tipo</h2>
          {stats.byType.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Nenhum ativo cadastrado</p>
          ) : (
            <div className="space-y-3">
              {stats.byType.map((t) => {
                const pct = stats.totalAssets > 0 ? Math.round((t.count / stats.totalAssets) * 100) : 0;
                return (
                  <div key={t.type}>
                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                      <span>{TYPE_LABELS[t.type] ?? t.type}</span>
                      <span>{t.count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full">
                      <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
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

      {/* Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Garantias vencendo */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Garantias Vencendo em 30 dias
          </h2>
          {stats.warrantyExpiringSoon.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Nenhuma garantia próxima do vencimento</p>
          ) : (
            <div className="space-y-2">
              {stats.warrantyExpiringSoon.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{a.name}</p>
                    <p className="text-xs text-slate-400">{a.tag}</p>
                  </div>
                  <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full">
                    {a.warranty_end ? new Date(a.warranty_end).toLocaleDateString('pt-BR') : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => onNavigate('assets')} className="mt-3 text-xs text-blue-600 hover:underline flex items-center gap-1">
            Ver todos os ativos <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Sem responsável */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <UserX className="w-4 h-4 text-red-500" /> Ativos sem Responsável
          </h2>
          {stats.assetsWithoutResponsible.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Todos os ativos têm responsável</p>
          ) : (
            <div className="space-y-2">
              {stats.assetsWithoutResponsible.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{a.name}</p>
                    <p className="text-xs text-slate-400">{a.tag} · {TYPE_LABELS[a.asset_type]}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[a.status] ?? ''}`}>
                    {STATUS_LABELS[a.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => onNavigate('assets')} className="mt-3 text-xs text-blue-600 hover:underline flex items-center gap-1">
            Gerenciar ativos <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
