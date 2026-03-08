// ─────────────────────────────────────────────────────────────────────────────
// Dashboard de Atendimentos — KPIs, distribuição e últimos atendimentos
// ─────────────────────────────────────────────────────────────────────────────
import { Clock, CheckCircle2, AlertTriangle, BarChart3, Star, TrendingUp, Plus, TableProperties } from 'lucide-react';
import { MOCK_ATENDIMENTOS } from '../mockData';

interface Props { onNavigate: (v: string) => void; }

const STATUS_LABEL: Record<string, string> = {
  AGUARDANDO: 'Aguardando', EM_ATENDIMENTO: 'Em Atendimento',
  AGUARDANDO_CLIENTE: 'Ag. Cliente', AGUARDANDO_TERCEIRO: 'Ag. Terceiro',
  EM_ANALISE: 'Em Análise', RESOLVIDO: 'Resolvido', FECHADO: 'Fechado', CANCELADO: 'Cancelado',
};

const STATUS_COLOR: Record<string, string> = {
  AGUARDANDO: 'bg-slate-200 text-slate-700',
  EM_ATENDIMENTO: 'bg-amber-100 text-amber-700',
  AGUARDANDO_CLIENTE: 'bg-purple-100 text-purple-700',
  EM_ANALISE: 'bg-blue-100 text-blue-700',
  RESOLVIDO: 'bg-green-100 text-green-700',
  FECHADO: 'bg-slate-100 text-slate-500',
  CANCELADO: 'bg-red-100 text-red-600',
};

const PRIO_COLOR: Record<string, string> = {
  BAIXA: 'bg-slate-100 text-slate-600',
  MEDIA: 'bg-blue-100 text-blue-700',
  ALTA: 'bg-amber-100 text-amber-700',
  CRITICA: 'bg-red-100 text-red-700',
  URGENTE: 'bg-red-600 text-white',
};

export default function AtendDashboard({ onNavigate }: Props) {
  const total = MOCK_ATENDIMENTOS.length;
  const emAndamento = MOCK_ATENDIMENTOS.filter(a => a.status === 'EM_ATENDIMENTO').length;
  const aguardando = MOCK_ATENDIMENTOS.filter(a => a.status === 'AGUARDANDO').length;
  const resolvidos = MOCK_ATENDIMENTOS.filter(a => ['RESOLVIDO', 'FECHADO'].includes(a.status)).length;
  const satisfacaoMedia = (() => {
    const avaliados = MOCK_ATENDIMENTOS.filter(a => a.satisfacao !== null);
    if (!avaliados.length) return null;
    return (avaliados.reduce((s, a) => s + (a.satisfacao ?? 0), 0) / avaliados.length).toFixed(1);
  })();

  const kpis = [
    { label: 'Total de Atendimentos', value: total, icon: BarChart3, color: 'blue', bg: 'bg-blue-50', text: 'text-blue-600', iconBg: 'bg-blue-100' },
    { label: 'Em Andamento', value: emAndamento, icon: Clock, color: 'amber', bg: 'bg-amber-50', text: 'text-amber-600', iconBg: 'bg-amber-100' },
    { label: 'Aguardando', value: aguardando, icon: AlertTriangle, color: 'orange', bg: 'bg-orange-50', text: 'text-orange-600', iconBg: 'bg-orange-100' },
    { label: 'Resolvidos / Fechados', value: resolvidos, icon: CheckCircle2, color: 'green', bg: 'bg-green-50', text: 'text-green-600', iconBg: 'bg-green-100' },
    { label: 'Satisfação Média', value: satisfacaoMedia ? `${satisfacaoMedia} ★` : '—', icon: Star, color: 'yellow', bg: 'bg-yellow-50', text: 'text-yellow-600', iconBg: 'bg-yellow-100' },
    { label: 'Taxa de Resolução', value: total > 0 ? `${Math.round((resolvidos / total) * 100)}%` : '—', icon: TrendingUp, color: 'emerald', bg: 'bg-emerald-50', text: 'text-emerald-600', iconBg: 'bg-emerald-100' },
  ];

  // Distribuição por tipo
  const byTipo = MOCK_ATENDIMENTOS.reduce<Record<string, number>>((acc, a) => {
    acc[a.tipo] = (acc[a.tipo] ?? 0) + 1;
    return acc;
  }, {});

  // Últimos 5
  const recentes = [...MOCK_ATENDIMENTOS].sort((a, b) =>
    new Date(b.data_abertura).getTime() - new Date(a.data_abertura).getTime()
  ).slice(0, 5);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dashboard de Atendimentos</h1>
          <p className="text-sm text-slate-500">Visão consolidada — atualizado agora</p>
        </div>
        <button
          onClick={() => onNavigate('novo')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Novo Atendimento
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className={`rounded-xl border border-slate-200 p-4 flex items-center gap-3 bg-white`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${k.iconBg}`}>
                <Icon className={`w-5 h-5 ${k.text}`} />
              </div>
              <div>
                <div className={`text-2xl font-bold ${k.text}`}>{k.value}</div>
                <div className="text-xs text-slate-500">{k.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Distribuição por tipo */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Distribuição por Tipo</h3>
          <div className="space-y-2">
            {Object.entries(byTipo).map(([tipo, count]) => (
              <div key={tipo} className="flex items-center gap-3">
                <div className="flex-1 text-xs text-slate-600 truncate">{tipo.replace(/_/g, ' ')}</div>
                <div className="w-32 bg-slate-100 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(count / total) * 100}%` }} />
                </div>
                <div className="text-xs font-semibold text-slate-700 w-5 text-right">{count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recentes */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-700">Atendimentos Recentes</h3>
            <button onClick={() => onNavigate('todos')} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
              <TableProperties className="w-3.5 h-3.5" /> Ver todos
            </button>
          </div>
          <div className="space-y-2">
            {recentes.map(a => (
              <div key={a.id} className="flex items-start gap-2 py-1.5 border-b border-slate-50 last:border-b-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs font-mono text-slate-400">{a.numero}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${PRIO_COLOR[a.prioridade]}`}>{a.prioridade}</span>
                  </div>
                  <p className="text-xs font-medium text-slate-700 truncate">{a.titulo}</p>
                  <p className="text-[10px] text-slate-400">{a.solicitante_nome}</p>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLOR[a.status]}`}>
                  {STATUS_LABEL[a.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
