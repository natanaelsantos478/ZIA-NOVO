// ─────────────────────────────────────────────────────────────────────────────
// CRM Pipeline — Funil de vendas estilo kanban
// Estágios mapeados dos status de erp_pedidos
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import {
  RefreshCw, ChevronRight, ChevronLeft,
  DollarSign, Calendar, Building2,
} from 'lucide-react';
import {
  getPedidos, updatePedidoStatus, invalidateCacheAll,
  type ErpPedido,
} from '../../../lib/erp';
import { useScope } from '../../../context/ProfileContext';

interface Stage {
  id: ErpPedido['status'];
  label: string;
  color: string;
  bg: string;
  border: string;
  dot: string;
}

const STAGES: Stage[] = [
  { id: 'RASCUNHO',  label: 'Prospecção',    color: 'text-slate-700',   bg: 'bg-slate-50',   border: 'border-slate-200', dot: 'bg-slate-400' },
  { id: 'CONFIRMADO',label: 'Proposta',       color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200',  dot: 'bg-blue-500' },
  { id: 'FATURADO',  label: 'Ganho',          color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200',dot: 'bg-emerald-500' },
  { id: 'CANCELADO', label: 'Perdido',         color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',   dot: 'bg-red-400' },
];

const STATUS_NEXT: Partial<Record<ErpPedido['status'], ErpPedido['status']>> = {
  RASCUNHO:   'CONFIRMADO',
  CONFIRMADO: 'FATURADO',
};

const STATUS_PREV: Partial<Record<ErpPedido['status'], ErpPedido['status']>> = {
  CONFIRMADO: 'RASCUNHO',
  FATURADO:   'CONFIRMADO',
};

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export default function CRMPipeline() {
  const scope = useScope();
  const [pedidos, setPedidos] = useState<ErpPedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [moving, setMoving]   = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await getPedidos('VENDA');
      setPedidos(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function moveStage(pedido: ErpPedido, newStatus: ErpPedido['status']) {
    setMoving(pedido.id);
    try {
      await updatePedidoStatus(pedido.id, newStatus);
      invalidateCacheAll();
      setPedidos(prev => prev.map(p => p.id === pedido.id ? { ...p, status: newStatus } : p));
    } finally {
      setMoving(null);
    }
  }

  const byStage = (status: ErpPedido['status']) =>
    pedidos.filter(p => p.status === status);

  const totalStage = (status: ErpPedido['status']) =>
    pedidos.filter(p => p.status === status).reduce((s, p) => s + (p.total_pedido ?? 0), 0);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Carregando pipeline…
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col h-full">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Funil de Vendas</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {pedidos.length} negociações · {fmt(pedidos.reduce((s, p) => s + (p.total_pedido ?? 0), 0))} total
            {scope.isHolding && <span className="ml-2 text-violet-600 font-medium">· Visão Holding</span>}
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm"
        >
          <RefreshCw className="w-4 h-4" /> Atualizar
        </button>
      </div>

      {/* Colunas kanban */}
      <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
        {STAGES.map(stage => {
          const cards = byStage(stage.id);
          const total = totalStage(stage.id);
          return (
            <div key={stage.id} className="flex-shrink-0 w-72 flex flex-col">
              {/* Header da coluna */}
              <div className={`rounded-t-xl px-4 py-3 ${stage.bg} border ${stage.border} border-b-0`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${stage.dot}`} />
                    <span className={`text-sm font-bold ${stage.color}`}>{stage.label}</span>
                  </div>
                  <span className="text-xs font-bold bg-white/70 px-2 py-0.5 rounded-full text-slate-600">
                    {cards.length}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 font-medium">{fmt(total)}</p>
              </div>

              {/* Cards */}
              <div className={`flex-1 rounded-b-xl border ${stage.border} bg-white p-2 space-y-2 min-h-32 overflow-y-auto custom-scrollbar`}>
                {cards.length === 0 && (
                  <div className="flex items-center justify-center h-20 text-xs text-slate-300">
                    Nenhuma negociação
                  </div>
                )}
                {cards.map(pedido => {
                  const nome = pedido.erp_clientes?.nome ?? 'Cliente';
                  const iniciais = nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
                  const nextStatus = STATUS_NEXT[pedido.status];
                  const prevStatus = STATUS_PREV[pedido.status];
                  return (
                    <div
                      key={pedido.id}
                      className={`bg-white rounded-lg border border-slate-200 p-3 shadow-sm hover:shadow-md transition-shadow ${moving === pedido.id ? 'opacity-60' : ''}`}
                    >
                      {/* Cliente */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                          {iniciais}
                        </div>
                        <p className="text-sm font-semibold text-slate-800 truncate">{nome}</p>
                      </div>

                      {/* Valor */}
                      <div className="flex items-center gap-1 text-sm font-bold text-slate-800 mb-2">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                        {fmt(pedido.total_pedido ?? 0)}
                      </div>

                      {/* Meta */}
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {fmtDate(pedido.data_emissao)}
                        </span>
                        <span className="font-mono">#{pedido.numero}</span>
                      </div>

                      {/* Ações de mover */}
                      {(prevStatus || nextStatus) && (
                        <div className="flex gap-1 mt-3 pt-2 border-t border-slate-100">
                          {prevStatus && (
                            <button
                              onClick={() => moveStage(pedido, prevStatus)}
                              disabled={moving === pedido.id}
                              className="flex-1 flex items-center justify-center gap-1 py-1 rounded text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                            >
                              <ChevronLeft className="w-3 h-3" />
                              {STAGES.find(s => s.id === prevStatus)?.label}
                            </button>
                          )}
                          {nextStatus && (
                            <button
                              onClick={() => moveStage(pedido, nextStatus)}
                              disabled={moving === pedido.id}
                              className="flex-1 flex items-center justify-center gap-1 py-1 rounded text-xs text-violet-600 hover:bg-violet-50 font-semibold disabled:opacity-40 transition-colors"
                            >
                              {STAGES.find(s => s.id === nextStatus)?.label}
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {pedidos.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma negociação registrada.</p>
          <p className="text-xs mt-1">Crie pedidos de venda no módulo de Negociações.</p>
        </div>
      )}
    </div>
  );
}
