// ─────────────────────────────────────────────────────────────────────────────
// CRM Negociações — Gestão de pedidos/deals com CRUD e mudança de status
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import {
  RefreshCw, Plus, X, Search,
  FileText, ChevronDown,
} from 'lucide-react';
import {
  getPedidos, getClientes, createPedido, updatePedidoStatus, invalidateCacheAll,
  type ErpPedido, type ErpCliente,
} from '../../../lib/erp';
import { useScope } from '../../../context/ProfileContext';

const STATUS_LABEL: Record<ErpPedido['status'], string> = {
  RASCUNHO:   'Prospecção',
  CONFIRMADO: 'Proposta',
  FATURADO:   'Ganho',
  CANCELADO:  'Perdido',
};

const STATUS_COLOR: Record<ErpPedido['status'], string> = {
  RASCUNHO:   'bg-slate-100 text-slate-600',
  CONFIRMADO: 'bg-blue-100 text-blue-700',
  FATURADO:   'bg-emerald-100 text-emerald-700',
  CANCELADO:  'bg-red-100 text-red-600',
};

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');
}

export default function CRMNegociacoes() {
  const scope = useScope();
  const [pedidos, setPedidos]     = useState<ErpPedido[]>([]);
  const [clientes, setClientes]   = useState<ErpCliente[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState<ErpPedido['status'] | 'todos'>('todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [changingStatus, setChangingStatus] = useState<string | null>(null);

  const [form, setForm] = useState({
    cliente_id: '',
    data_emissao: new Date().toISOString().split('T')[0],
    data_entrega_prevista: '',
    condicao_pagamento: '',
    desconto_global_pct: 0,
    frete_valor: 0,
    total_produtos: 0,
    total_pedido: 0,
    observacoes: '',
  });

  async function load() {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([getPedidos('VENDA'), getClientes()]);
      setPedidos(p);
      setClientes(c);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!form.cliente_id || !form.total_pedido) return;
    setSaving(true);
    try {
      await createPedido(
        {
          tipo: 'VENDA',
          status: 'RASCUNHO',
          cliente_id: form.cliente_id,
          vendedor_id: null,
          data_emissao: form.data_emissao,
          data_entrega_prevista: form.data_entrega_prevista || null,
          condicao_pagamento: form.condicao_pagamento || null,
          desconto_global_pct: form.desconto_global_pct,
          frete_valor: form.frete_valor,
          total_produtos: form.total_pedido,
          total_pedido: form.total_pedido,
          observacoes: form.observacoes || null,
        },
        []
      );
      invalidateCacheAll();
      setModalOpen(false);
      setForm({ cliente_id: '', data_emissao: new Date().toISOString().split('T')[0], data_entrega_prevista: '', condicao_pagamento: '', desconto_global_pct: 0, frete_valor: 0, total_produtos: 0, total_pedido: 0, observacoes: '' });
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(id: string, status: ErpPedido['status']) {
    setChangingStatus(id);
    try {
      await updatePedidoStatus(id, status);
      invalidateCacheAll();
      setPedidos(prev => prev.map(p => p.id === id ? { ...p, status } : p));
    } finally {
      setChangingStatus(null);
    }
  }

  const filtered = pedidos.filter(p => {
    if (filterStatus !== 'todos' && p.status !== filterStatus) return false;
    if (search) {
      const nome = (p.erp_clientes?.nome ?? '').toLowerCase();
      if (!nome.includes(search.toLowerCase()) && !String(p.numero).includes(search)) return false;
    }
    return true;
  });

  const totalFiltrado = filtered.reduce((s, p) => s + (p.total_pedido ?? 0), 0);

  return (
    <div className="p-6 space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Negociações</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {filtered.length} registro{filtered.length !== 1 ? 's' : ''} · {fmt(totalFiltrado)}
            {scope.isHolding && <span className="ml-2 text-violet-600 font-medium">· Holding</span>}
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" /> Nova Negociação
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por cliente ou nº…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
        >
          <option value="todos">Todos os estágios</option>
          {(Object.keys(STATUS_LABEL) as ErpPedido['status'][]).map(s => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        <button
          onClick={load}
          className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 flex items-center justify-center text-slate-400 text-sm gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" /> Carregando…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Nenhuma negociação encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nº</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Cliente</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Estágio</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Valor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Data</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Mover</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">#{p.numero}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{p.erp_clientes?.nome ?? '—'}</p>
                      <p className="text-xs text-slate-400">{p.condicao_pagamento ?? 'Pagamento não informado'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[p.status]}`}>
                        {STATUS_LABEL[p.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-800">
                      {fmt(p.total_pedido ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {fmtDate(p.data_emissao)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {changingStatus === p.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-violet-500 mx-auto" />
                      ) : (
                        <StatusMenu
                          current={p.status}
                          onSelect={s => changeStatus(p.id, s)}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal nova negociação */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-800">Nova Negociação</h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Cliente *</label>
                <select
                  value={form.cliente_id}
                  onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                >
                  <option value="">Selecione o cliente…</option>
                  {clientes.filter(c => c.ativo).map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Data da Negociação</label>
                  <input
                    type="date"
                    value={form.data_emissao}
                    onChange={e => setForm(f => ({ ...f, data_emissao: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Previsão de Fechamento</label>
                  <input
                    type="date"
                    value={form.data_entrega_prevista}
                    onChange={e => setForm(f => ({ ...f, data_entrega_prevista: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Valor Total (R$) *</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.total_pedido || ''}
                  onChange={e => setForm(f => ({ ...f, total_pedido: Number(e.target.value), total_produtos: Number(e.target.value) }))}
                  placeholder="0,00"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Condição de Pagamento</label>
                <input
                  value={form.condicao_pagamento}
                  onChange={e => setForm(f => ({ ...f, condicao_pagamento: e.target.value }))}
                  placeholder="Ex: 30/60/90 dias"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Observações</label>
                <textarea
                  value={form.observacoes}
                  onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                  rows={3}
                  placeholder="Detalhes da negociação…"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex gap-2 justify-end">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100">
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={saving || !form.cliente_id || !form.total_pedido}
                className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold disabled:opacity-50"
              >
                {saving ? 'Criando…' : 'Criar Negociação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusMenu({ current, onSelect }: { current: ErpPedido['status']; onSelect: (s: ErpPedido['status']) => void }) {
  const [open, setOpen] = useState(false);
  const options = (Object.keys(STATUS_LABEL) as ErpPedido['status'][]).filter(s => s !== current);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-slate-500 hover:bg-slate-100 border border-slate-200"
      >
        Mover <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-slate-200 rounded-lg shadow-lg py-1 w-36">
            {options.map(s => (
              <button
                key={s}
                onClick={() => { onSelect(s); setOpen(false); }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-violet-50 hover:text-violet-700 transition-colors"
              >
                → {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
