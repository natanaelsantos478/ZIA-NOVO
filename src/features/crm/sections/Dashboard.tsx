// ─────────────────────────────────────────────────────────────────────────────
// CRM Dashboard — KPIs e visão geral com dados reais
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import {
  Users, TrendingUp, Target, AlertCircle,
  RefreshCw, ChevronRight, Building2,
} from 'lucide-react';
import {
  getClientes, getPedidos, getAtendimentos,
  type ErpCliente, type ErpPedido, type ErpAtendimento,
} from '../../../lib/erp';
import { useScope } from '../../../context/ProfileContext';

const STATUS_COLOR: Record<string, string> = {
  RASCUNHO:  'bg-slate-100 text-slate-600',
  CONFIRMADO:'bg-blue-100 text-blue-700',
  FATURADO:  'bg-emerald-100 text-emerald-700',
  CANCELADO: 'bg-red-100 text-red-600',
};

const STATUS_LABEL: Record<string, string> = {
  RASCUNHO:  'Prospecção',
  CONFIRMADO:'Proposta',
  FATURADO:  'Ganho',
  CANCELADO: 'Perdido',
};

const PRIO_COLOR: Record<string, string> = {
  BAIXA:   'bg-slate-100 text-slate-500',
  MEDIA:   'bg-yellow-100 text-yellow-700',
  ALTA:    'bg-orange-100 text-orange-700',
  CRITICA: 'bg-red-100 text-red-700',
};

function fmt(v: number) {
  return v >= 1_000_000
    ? `R$ ${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000
    ? `R$ ${(v / 1_000).toFixed(0)}k`
    : `R$ ${v.toFixed(0)}`;
}

export default function CRMDashboard() {
  const scope = useScope();
  const [clientes, setClientes]       = useState<ErpCliente[]>([]);
  const [pedidos, setPedidos]         = useState<ErpPedido[]>([]);
  const [atendimentos, setAtendimentos] = useState<ErpAtendimento[]>([]);
  const [loading, setLoading]         = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [c, p, a] = await Promise.all([
        getClientes(),
        getPedidos('VENDA'),
        getAtendimentos(),
      ]);
      setClientes(c);
      setPedidos(p);
      setAtendimentos(a);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // KPIs calculados
  const totalClientes  = clientes.length;
  const ativos         = clientes.filter(c => c.ativo).length;
  const pipeline       = pedidos.filter(p => p.status === 'RASCUNHO' || p.status === 'CONFIRMADO');
  const valorPipeline  = pipeline.reduce((s, p) => s + (p.total_pedido ?? 0), 0);
  const ganhos         = pedidos.filter(p => p.status === 'FATURADO');
  const valorGanho     = ganhos.reduce((s, p) => s + (p.total_pedido ?? 0), 0);
  const abertosCriticos = atendimentos.filter(a => a.status !== 'FECHADO' && a.status !== 'RESOLVIDO' && a.prioridade === 'CRITICA').length;
  const totalAbertos   = atendimentos.filter(a => a.status === 'ABERTO' || a.status === 'EM_ANDAMENTO').length;

  const taxaConversao = pedidos.length > 0
    ? ((ganhos.length / pedidos.length) * 100).toFixed(1)
    : '0.0';

  // Funil por etapa
  const funnelStages = [
    { label: 'Prospecção',  status: 'RASCUNHO',   color: 'bg-slate-400' },
    { label: 'Proposta',    status: 'CONFIRMADO',  color: 'bg-blue-500' },
    { label: 'Ganho',       status: 'FATURADO',    color: 'bg-emerald-500' },
    { label: 'Perdido',     status: 'CANCELADO',   color: 'bg-red-400' },
  ];

  const recentDeals = [...pedidos]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  const recentAtend = [...atendimentos]
    .filter(a => a.status !== 'FECHADO')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        Carregando dados…
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Dashboard CRM</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Visão geral de clientes, pipeline e atendimentos
            {scope.isHolding && <span className="ml-2 text-violet-600 font-medium">· Visão Holding</span>}
            {scope.isMatrix  && <span className="ml-2 text-blue-600 font-medium">· Visão Matriz</span>}
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm"
        >
          <RefreshCw className="w-4 h-4" /> Atualizar
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Clientes Ativos',
            value: ativos.toString(),
            sub: `${totalClientes} cadastrados`,
            icon: Users,
            color: 'text-violet-600',
            bg: 'bg-violet-50',
          },
          {
            label: 'Pipeline',
            value: fmt(valorPipeline),
            sub: `${pipeline.length} negociações`,
            icon: TrendingUp,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
          },
          {
            label: 'Receita Fechada',
            value: fmt(valorGanho),
            sub: `Taxa ${taxaConversao}% conversão`,
            icon: Target,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
          },
          {
            label: 'Atendimentos',
            value: totalAbertos.toString(),
            sub: abertosCriticos > 0 ? `${abertosCriticos} críticos` : 'em aberto',
            icon: AlertCircle,
            color: abertosCriticos > 0 ? 'text-red-600' : 'text-orange-600',
            bg: abertosCriticos > 0 ? 'bg-red-50' : 'bg-orange-50',
          },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{kpi.label}</p>
              <div className={`w-8 h-8 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
            </div>
            <p className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</p>
            <p className="text-xs text-slate-400 mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Funil de vendas */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="text-sm font-bold text-slate-700 mb-4">Funil de Vendas</h2>
          {funnelStages.map(stage => {
            const count = pedidos.filter(p => p.status === stage.status).length;
            const pct = pedidos.length > 0 ? (count / pedidos.length) * 100 : 0;
            const valor = pedidos
              .filter(p => p.status === stage.status)
              .reduce((s, p) => s + (p.total_pedido ?? 0), 0);
            return (
              <div key={stage.status} className="mb-3">
                <div className="flex justify-between text-xs text-slate-600 mb-1">
                  <span className="font-medium">{stage.label}</span>
                  <span>{count} · {fmt(valor)}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${stage.color} rounded-full transition-all`}
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
              </div>
            );
          })}
          {pedidos.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-4">Nenhuma negociação registrada</p>
          )}
        </div>

        {/* Negociações recentes */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 col-span-1 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-700">Negociações Recentes</h2>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
          {recentDeals.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">Nenhuma negociação encontrada</p>
          ) : (
            <div className="space-y-2">
              {recentDeals.map(deal => {
                const nome = deal.erp_clientes?.nome ?? 'Cliente';
                const iniciais = nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
                return (
                  <div key={deal.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                    <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {iniciais}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{nome}</p>
                      <p className="text-xs text-slate-400">Ped #{deal.numero}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-slate-800">{fmt(deal.total_pedido ?? 0)}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLOR[deal.status]}`}>
                        {STATUS_LABEL[deal.status]}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Atendimentos abertos */}
      {recentAtend.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h2 className="text-sm font-bold text-slate-700 mb-4">Atendimentos em Aberto</h2>
          <div className="space-y-2">
            {recentAtend.map(a => (
              <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${a.prioridade === 'CRITICA' ? 'bg-red-500' : a.prioridade === 'ALTA' ? 'bg-orange-500' : 'bg-slate-300'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{a.titulo}</p>
                  <p className="text-xs text-slate-400">{a.erp_clientes?.nome ?? '—'}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${PRIO_COLOR[a.prioridade]}`}>
                    {a.prioridade}
                  </span>
                  <span className="text-xs text-slate-400">
                    {a.status === 'ABERTO' ? 'Aberto' : 'Em andamento'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Estado vazio */}
      {clientes.length === 0 && pedidos.length === 0 && (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <div className="w-14 h-14 rounded-full bg-violet-50 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-7 h-7 text-violet-400" />
          </div>
          <h3 className="text-base font-bold text-slate-700 mb-1">CRM vazio</h3>
          <p className="text-sm text-slate-500">
            Cadastre clientes e registre negociações para visualizar o painel.
          </p>
        </div>
      )}
    </div>
  );
}
