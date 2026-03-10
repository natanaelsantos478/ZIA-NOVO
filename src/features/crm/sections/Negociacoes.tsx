// ─────────────────────────────────────────────────────────────────────────────
// CRM Negociações — Modal completo com tabs: Dados Gerais / Produtos / Status
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw, Plus, X, Search, FileText, ChevronDown,
  Trash2, Package, AlertCircle, Upload, LayoutGrid,
} from 'lucide-react';
import {
  getPedidos, getClientes, getProdutos, createPedido,
  updatePedidoStatus, invalidateCacheAll,
  type ErpPedido, type ErpCliente, type ErpProduto,
} from '../../../lib/erp';
import { useScope } from '../../../context/ProfileContext';

// ── Tipos ────────────────────────────────────────────────────────────────────

type ModalTab = 'dados-gerais' | 'produtos' | 'status' | 'removidos' | 'importar';

interface CRMMeta {
  responsavel: string;
  compartilhado: string[];
  especificador: string;
  construtora: string;
  referencia_externa: string;
  origem: string;
  valido_ate: string;
  potencial: 'alto' | 'medio' | 'baixo' | '';
  especificar_produtos: boolean;
  notas: string;
}

interface ItemLinha {
  _key: string;
  produto_id: string;
  produto_nome: string;
  codigo_interno: string;
  unidade: string;
  quantidade: number;
  preco_unitario: number;
  desconto_pct: number;
  total_item: number;
}

interface RemovidoItem extends ItemLinha {
  removido_em: string;
}

// ── Constantes ───────────────────────────────────────────────────────────────

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

const STATUS_BG: Record<ErpPedido['status'], string> = {
  RASCUNHO:   'border-slate-300 bg-slate-50',
  CONFIRMADO: 'border-blue-300 bg-blue-50',
  FATURADO:   'border-emerald-300 bg-emerald-50',
  CANCELADO:  'border-red-300 bg-red-50',
};

const ORIGENS = [
  'Indicação', 'Prospecção Ativa', 'Inbound / Site', 'Rede Social',
  'Evento / Feira', 'Portal / Licitação', 'Parceiro', 'Outro',
];

const CONDICOES_PAGAMENTO = [
  'À Vista', '30 dias', '30/60 dias', '30/60/90 dias',
  '28/56/84 dias', '7/14/21 dias', 'Boleto 30 dias',
  'Cartão de Crédito', 'Financiamento', 'Personalizado',
];

const COMPARTILHADOS_OPCOES = ['Assistentes', 'Diretoria', 'Comercial', 'Técnico', 'Financeiro'];

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}
function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');
}
function uid() {
  return Math.random().toString(36).slice(2);
}
function parseMeta(obs: string | null): CRMMeta {
  if (!obs) return metaVazia();
  try {
    const parsed = JSON.parse(obs);
    if (parsed && typeof parsed === 'object' && '_crm' in parsed) return parsed._crm as CRMMeta;
  } catch { /* noop */ }
  return { ...metaVazia(), notas: obs };
}
function metaVazia(): CRMMeta {
  return {
    responsavel: '', compartilhado: [], especificador: '',
    construtora: '', referencia_externa: '', origem: '',
    valido_ate: '', potencial: '', especificar_produtos: false, notas: '',
  };
}
function serializarObs(meta: CRMMeta): string {
  return JSON.stringify({ _crm: meta });
}

// ── Componente principal ─────────────────────────────────────────────────────

export default function CRMNegociacoes() {
  const scope = useScope();
  const [pedidos, setPedidos]   = useState<ErpPedido[]>([]);
  const [clientes, setClientes] = useState<ErpCliente[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filterStatus, setFilterStatus] = useState<ErpPedido['status'] | 'todos'>('todos');
  const [modalOpen, setModalOpen]       = useState(false);
  const [saving, setSaving]             = useState(false);
  const [changingStatus, setChangingStatus] = useState<string | null>(null);

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

  const filtered = pedidos.filter(p => {
    if (filterStatus !== 'todos' && p.status !== filterStatus) return false;
    if (search) {
      const nome = (p.erp_clientes?.nome ?? '').toLowerCase();
      if (!nome.includes(search.toLowerCase()) && !String(p.numero).includes(search)) return false;
    }
    return true;
  });

  const totalFiltrado = filtered.reduce((s, p) => s + (p.total_pedido ?? 0), 0);

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
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Potencial</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Estágio</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Valor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Fechamento</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Mover</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(p => {
                  const meta = parseMeta(p.observacoes ?? null);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">#{p.numero}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{p.erp_clientes?.nome ?? '—'}</p>
                        <p className="text-xs text-slate-400">
                          {meta.responsavel ? `Resp: ${meta.responsavel}` : p.condicao_pagamento ?? 'Pagamento não informado'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {meta.potencial ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            meta.potencial === 'alto' ? 'bg-emerald-100 text-emerald-700' :
                            meta.potencial === 'medio' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {meta.potencial === 'alto' ? 'Alto' : meta.potencial === 'medio' ? 'Médio' : 'Baixo'}
                          </span>
                        ) : <span className="text-slate-300 text-xs">—</span>}
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
                        {p.data_entrega_prevista ? fmtDate(p.data_entrega_prevista) : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {changingStatus === p.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin text-violet-500 mx-auto" />
                        ) : (
                          <StatusMenu current={p.status} onSelect={s => changeStatus(p.id, s)} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal nova negociação */}
      {modalOpen && (
        <NegociacaoModal
          clientes={clientes}
          onClose={() => setModalOpen(false)}
          onSaved={async () => {
            invalidateCacheAll();
            setModalOpen(false);
            await load();
          }}
        />
      )}
    </div>
  );
}

// ── Modal completo ────────────────────────────────────────────────────────────

function NegociacaoModal({
  clientes,
  onClose,
  onSaved,
}: {
  clientes: ErpCliente[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [tab, setTab] = useState<ModalTab>('dados-gerais');
  const [saving, setSaving] = useState(false);
  const [produtos, setProdutos] = useState<ErpProduto[]>([]);
  const [loadingProdutos, setLoadingProdutos] = useState(false);

  // ── Dados Gerais ──
  const [meta, setMeta] = useState<CRMMeta>(metaVazia());
  const [compartilhadoInput, setCompartilhadoInput] = useState('');

  // ── Core ErpPedido ──
  const [clienteId, setClienteId]             = useState('');
  const [dataEmissao, setDataEmissao]         = useState(new Date().toISOString().split('T')[0]);
  const [dataFechamento, setDataFechamento]   = useState('');
  const [condicaoPagamento, setCondicaoPagamento] = useState('');
  const [descontoGlobal, setDescontoGlobal]   = useState(0);
  const [freteValor, setFreteValor]           = useState(0);

  // ── Itens de produto ──
  const [itens, setItens]       = useState<ItemLinha[]>([]);
  const [removidos, setRemovidos] = useState<RemovidoItem[]>([]);

  // ── Carregar produtos ao abrir ──
  useEffect(() => {
    setLoadingProdutos(true);
    getProdutos().then(p => {
      setProdutos(p.filter(x => x.ativo));
    }).finally(() => setLoadingProdutos(false));
  }, []);

  // ── Cálculos ──
  const subtotalItens = itens.reduce((s, i) => s + i.total_item, 0);
  const desconto$     = subtotalItens * (descontoGlobal / 100);
  const totalPedido   = Math.max(0, subtotalItens - desconto$ + freteValor);

  // ── Funções de produto ──
  function adicionarItem() {
    setItens(prev => [...prev, {
      _key: uid(), produto_id: '', produto_nome: '', codigo_interno: '',
      unidade: 'UN', quantidade: 1, preco_unitario: 0, desconto_pct: 0, total_item: 0,
    }]);
  }

  function atualizarItem(key: string, field: Partial<ItemLinha>) {
    setItens(prev => prev.map(item => {
      if (item._key !== key) return item;
      const updated = { ...item, ...field };
      updated.total_item = updated.quantidade * updated.preco_unitario * (1 - updated.desconto_pct / 100);
      return updated;
    }));
  }

  function selecionarProduto(key: string, produtoId: string) {
    const prod = produtos.find(p => p.id === produtoId);
    if (!prod) return;
    atualizarItem(key, {
      produto_id: prod.id,
      produto_nome: prod.nome,
      codigo_interno: prod.codigo_interno,
      unidade: prod.unidade_medida,
      preco_unitario: prod.preco_venda,
    });
  }

  function removerItem(key: string) {
    const item = itens.find(i => i._key === key);
    if (item && item.produto_id) {
      setRemovidos(prev => [...prev, { ...item, removido_em: new Date().toLocaleString('pt-BR') }]);
    }
    setItens(prev => prev.filter(i => i._key !== key));
  }

  // ── Salvar ──
  async function handleSave() {
    if (!clienteId) return;
    setSaving(true);
    try {
      const itensSalvar = itens
        .filter(i => i.produto_id && i.quantidade > 0)
        .map(({ produto_id, quantidade, preco_unitario, desconto_pct, total_item }) => ({
          produto_id, quantidade, preco_unitario, desconto_item_pct: desconto_pct, total_item,
        }));

      await createPedido(
        {
          tipo: 'VENDA',
          status: 'RASCUNHO',
          cliente_id: clienteId,
          vendedor_id: null,
          data_emissao: dataEmissao,
          data_entrega_prevista: dataFechamento || null,
          condicao_pagamento: condicaoPagamento || null,
          desconto_global_pct: descontoGlobal,
          frete_valor: freteValor,
          total_produtos: subtotalItens || totalPedido,
          total_pedido: totalPedido || subtotalItens,
          observacoes: serializarObs(meta),
        },
        itensSalvar
      );
      await onSaved();
    } finally {
      setSaving(false);
    }
  }

  const TABS: { id: ModalTab; label: string }[] = [
    { id: 'dados-gerais', label: 'Dados Gerais' },
    { id: 'produtos',     label: `Produtos${itens.length ? ` (${itens.length})` : ''}` },
    { id: 'status',       label: 'Status' },
    { id: 'removidos',    label: `Removidos${removidos.length ? ` (${removidos.length})` : ''}` },
    { id: 'importar',     label: 'Importar (Excel)' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-800">Nova Negociação</h2>
            {clienteId && (
              <p className="text-xs text-slate-400 mt-0.5">
                {clientes.find(c => c.id === clienteId)?.nome}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 shrink-0 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                tab === t.id
                  ? 'border-violet-600 text-violet-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Corpo scrollável */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'dados-gerais' && (
            <TabDadosGerais
              meta={meta} setMeta={setMeta}
              compartilhadoInput={compartilhadoInput}
              setCompartilhadoInput={setCompartilhadoInput}
              clientes={clientes}
              clienteId={clienteId} setClienteId={setClienteId}
              dataEmissao={dataEmissao} setDataEmissao={setDataEmissao}
              dataFechamento={dataFechamento} setDataFechamento={setDataFechamento}
            />
          )}
          {tab === 'produtos' && (
            <TabProdutos
              itens={itens}
              produtos={produtos}
              loadingProdutos={loadingProdutos}
              descontoGlobal={descontoGlobal} setDescontoGlobal={setDescontoGlobal}
              freteValor={freteValor} setFreteValor={setFreteValor}
              condicaoPagamento={condicaoPagamento} setCondicaoPagamento={setCondicaoPagamento}
              subtotalItens={subtotalItens}
              desconto$={desconto$}
              totalPedido={totalPedido}
              onAdicionarItem={adicionarItem}
              onAtualizarItem={atualizarItem}
              onSelecionarProduto={selecionarProduto}
              onRemoverItem={removerItem}
              especificarProdutos={meta.especificar_produtos}
            />
          )}
          {tab === 'status' && <TabStatus />}
          {tab === 'removidos' && <TabRemovidos removidos={removidos} />}
          {tab === 'importar' && <TabImportar />}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between shrink-0 bg-slate-50 rounded-b-2xl">
          <div className="text-sm text-slate-500">
            {totalPedido > 0 && (
              <span className="font-semibold text-slate-800">{fmt(totalPedido)}</span>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-200">
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !clienteId}
              className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors"
            >
              {saving ? 'Criando…' : 'Criar Negociação'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Dados Gerais ─────────────────────────────────────────────────────────

function TabDadosGerais({
  meta, setMeta, compartilhadoInput, setCompartilhadoInput,
  clientes, clienteId, setClienteId,
  dataEmissao, setDataEmissao, dataFechamento, setDataFechamento,
}: {
  meta: CRMMeta; setMeta: React.Dispatch<React.SetStateAction<CRMMeta>>;
  compartilhadoInput: string; setCompartilhadoInput: (v: string) => void;
  clientes: ErpCliente[]; clienteId: string; setClienteId: (v: string) => void;
  dataEmissao: string; setDataEmissao: (v: string) => void;
  dataFechamento: string; setDataFechamento: (v: string) => void;
}) {
  function setField<K extends keyof CRMMeta>(k: K, v: CRMMeta[K]) {
    setMeta(m => ({ ...m, [k]: v }));
  }

  function adicionarCompartilhado(valor: string) {
    const v = valor.trim();
    if (v && !meta.compartilhado.includes(v)) {
      setField('compartilhado', [...meta.compartilhado, v]);
    }
    setCompartilhadoInput('');
  }

  function removerCompartilhado(v: string) {
    setField('compartilhado', meta.compartilhado.filter(c => c !== v));
  }

  return (
    <div className="px-6 py-5 space-y-4">

      {/* Responsáveis */}
      <Field label="Responsáveis">
        <input
          value={meta.responsavel}
          onChange={e => setField('responsavel', e.target.value)}
          placeholder="Nome do responsável pela negociação"
          className={inputCls}
        />
      </Field>

      {/* Compartilhado com */}
      <Field label="Compartilhado com">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5 min-h-[2rem]">
            {meta.compartilhado.map(v => (
              <span key={v} className="flex items-center gap-1 text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">
                {v}
                <button onClick={() => removerCompartilhado(v)} className="hover:text-violet-900">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <select
              value={compartilhadoInput}
              onChange={e => setCompartilhadoInput(e.target.value)}
              className={inputCls + ' flex-1'}
            >
              <option value="">Selecione ou…</option>
              {COMPARTILHADOS_OPCOES.map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
            <input
              value={compartilhadoInput}
              onChange={e => setCompartilhadoInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && adicionarCompartilhado(compartilhadoInput)}
              placeholder="…ou digite e Enter"
              className={inputCls + ' flex-1'}
            />
            <button
              onClick={() => adicionarCompartilhado(compartilhadoInput)}
              className="px-3 py-2 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 text-sm font-medium"
            >
              + Add
            </button>
          </div>
        </div>
      </Field>

      {/* Cliente */}
      <Field label="Cliente *">
        <select
          value={clienteId}
          onChange={e => setClienteId(e.target.value)}
          className={inputCls}
        >
          <option value="">Selecione o cliente…</option>
          {clientes.filter(c => c.ativo).map(c => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
      </Field>

      {/* Especificador */}
      <Field label="Especificador">
        <input
          value={meta.especificador}
          onChange={e => setField('especificador', e.target.value)}
          placeholder="Ex: Arquiteto, Engenheiro responsável…"
          className={inputCls}
        />
      </Field>

      {/* Construtora */}
      <Field label="Construtora">
        <input
          value={meta.construtora}
          onChange={e => setField('construtora', e.target.value)}
          placeholder="Nome da construtora ou empresa parceira"
          className={inputCls}
        />
      </Field>

      {/* Referência Externa */}
      <Field label="Referência Externa">
        <input
          value={meta.referencia_externa}
          onChange={e => setField('referencia_externa', e.target.value)}
          placeholder="Código ou referência no sistema do cliente"
          className={inputCls}
        />
      </Field>

      {/* Origem */}
      <Field label="Origem">
        <select
          value={meta.origem}
          onChange={e => setField('origem', e.target.value)}
          className={inputCls}
        >
          <option value="">Selecione a origem…</option>
          {ORIGENS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </Field>

      {/* Datas */}
      <div className="grid grid-cols-3 gap-3">
        <Field label="Data da Negociação">
          <input
            type="date"
            value={dataEmissao}
            onChange={e => setDataEmissao(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Previsão de Fechamento">
          <input
            type="date"
            value={dataFechamento}
            onChange={e => setDataFechamento(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Válido até">
          <input
            type="date"
            value={meta.valido_ate}
            onChange={e => setField('valido_ate', e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>

      {/* Potencial da Venda */}
      <Field label="Potencial da Venda">
        <div className="flex gap-2">
          {(['alto', 'medio', 'baixo'] as const).map(p => (
            <button
              key={p}
              onClick={() => setField('potencial', meta.potencial === p ? '' : p)}
              className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                meta.potencial === p
                  ? p === 'alto'   ? 'bg-emerald-500 border-emerald-500 text-white'
                  : p === 'medio' ? 'bg-amber-500 border-amber-500 text-white'
                  :                 'bg-slate-400 border-slate-400 text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {p === 'alto' ? 'Alto' : p === 'medio' ? 'Médio' : 'Baixo'}
            </button>
          ))}
        </div>
      </Field>

      {/* Especificar Produtos */}
      <Field label="Especificar Produtos">
        <div className="flex gap-2">
          {[true, false].map(v => (
            <button
              key={String(v)}
              onClick={() => setField('especificar_produtos', v)}
              className={`px-6 py-2 rounded-lg border text-sm font-medium transition-colors ${
                meta.especificar_produtos === v
                  ? 'bg-violet-600 border-violet-600 text-white'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {v ? 'Sim' : 'Não'}
            </button>
          ))}
        </div>
      </Field>

      {/* Notas / Observações */}
      <Field label="Observações">
        <textarea
          value={meta.notas}
          onChange={e => setField('notas', e.target.value)}
          rows={3}
          placeholder="Detalhes, contexto ou observações da negociação…"
          className={inputCls + ' resize-none'}
        />
      </Field>
    </div>
  );
}

// ── Tab: Produtos ─────────────────────────────────────────────────────────────

function TabProdutos({
  itens, produtos, loadingProdutos,
  descontoGlobal, setDescontoGlobal,
  freteValor, setFreteValor,
  condicaoPagamento, setCondicaoPagamento,
  subtotalItens, desconto$, totalPedido,
  onAdicionarItem, onAtualizarItem, onSelecionarProduto, onRemoverItem,
  especificarProdutos,
}: {
  itens: ItemLinha[];
  produtos: ErpProduto[];
  loadingProdutos: boolean;
  descontoGlobal: number; setDescontoGlobal: (v: number) => void;
  freteValor: number; setFreteValor: (v: number) => void;
  condicaoPagamento: string; setCondicaoPagamento: (v: string) => void;
  subtotalItens: number; desconto$: number; totalPedido: number;
  onAdicionarItem: () => void;
  onAtualizarItem: (key: string, field: Partial<ItemLinha>) => void;
  onSelecionarProduto: (key: string, produtoId: string) => void;
  onRemoverItem: (key: string) => void;
  especificarProdutos: boolean;
}) {
  return (
    <div className="px-6 py-5 space-y-5">
      {!especificarProdutos && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Em "Dados Gerais", ative "Especificar Produtos: Sim" para habilitar o catálogo. Você ainda pode adicionar itens manualmente.
        </div>
      )}

      {/* Grid de itens */}
      {loadingProdutos ? (
        <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
          <RefreshCw className="w-4 h-4 animate-spin" /> Carregando catálogo de produtos…
        </div>
      ) : (
        <div>
          {itens.length > 0 ? (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide w-64">Produto</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide w-20">Qtd</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide w-16">Un.</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Preço Unit.</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide w-16">Desc.%</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">Total</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {itens.map(item => (
                    <tr key={item._key} className="hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <select
                          value={item.produto_id}
                          onChange={e => onSelecionarProduto(item._key, e.target.value)}
                          className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
                        >
                          <option value="">Selecione…</option>
                          {produtos.map(p => (
                            <option key={p.id} value={p.id}>
                              [{p.codigo_interno}] {p.nome}
                            </option>
                          ))}
                        </select>
                        {item.codigo_interno && (
                          <p className="text-xs text-slate-400 mt-0.5 pl-1">Cód: {item.codigo_interno}</p>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number" min={0.01} step={0.01}
                          value={item.quantidade || ''}
                          onChange={e => onAtualizarItem(item._key, { quantidade: Number(e.target.value) })}
                          className="w-full text-center text-xs px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
                        />
                      </td>
                      <td className="px-3 py-2 text-center text-xs text-slate-500">{item.unidade}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number" min={0} step={0.01}
                          value={item.preco_unitario || ''}
                          onChange={e => onAtualizarItem(item._key, { preco_unitario: Number(e.target.value) })}
                          className="w-full text-right text-xs px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number" min={0} max={100} step={0.1}
                          value={item.desconto_pct || ''}
                          onChange={e => onAtualizarItem(item._key, { desconto_pct: Number(e.target.value) })}
                          className="w-full text-center text-xs px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
                        />
                      </td>
                      <td className="px-3 py-2 text-right text-sm font-semibold text-slate-800">
                        {fmt(item.total_item)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => onRemoverItem(item._key)}
                          className="text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-slate-200 py-10 text-center">
              <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Nenhum produto adicionado</p>
              <p className="text-slate-400 text-xs mt-1">Clique em "+ Adicionar Produto" para inserir itens</p>
            </div>
          )}

          <button
            onClick={onAdicionarItem}
            className="mt-3 flex items-center gap-1.5 text-violet-600 hover:text-violet-800 text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Adicionar Produto
          </button>
        </div>
      )}

      {/* Rodapé financeiro */}
      <div className="rounded-xl border border-slate-200 divide-y divide-slate-100">

        {/* Condição de pagamento */}
        <div className="grid grid-cols-2 gap-4 p-4">
          <Field label="Condição de Pagamento">
            <select
              value={condicaoPagamento}
              onChange={e => setCondicaoPagamento(e.target.value)}
              className={inputCls}
            >
              <option value="">Selecione…</option>
              {CONDICOES_PAGAMENTO.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Desconto Global (%)">
              <input
                type="number" min={0} max={100} step={0.1}
                value={descontoGlobal || ''}
                onChange={e => setDescontoGlobal(Number(e.target.value))}
                className={inputCls}
              />
            </Field>
            <Field label="Frete (R$)">
              <input
                type="number" min={0} step={0.01}
                value={freteValor || ''}
                onChange={e => setFreteValor(Number(e.target.value))}
                className={inputCls}
              />
            </Field>
          </div>
        </div>

        {/* Totais */}
        <div className="p-4 bg-slate-50 space-y-1.5 text-sm rounded-b-xl">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal de produtos</span>
            <span>{fmt(subtotalItens)}</span>
          </div>
          {descontoGlobal > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>Desconto global ({descontoGlobal}%)</span>
              <span>- {fmt(desconto$)}</span>
            </div>
          )}
          {freteValor > 0 && (
            <div className="flex justify-between text-slate-500">
              <span>Frete</span>
              <span>+ {fmt(freteValor)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-slate-800 text-base pt-1 border-t border-slate-200 mt-1">
            <span>Total da Negociação</span>
            <span className="text-violet-700">{fmt(totalPedido)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Status ───────────────────────────────────────────────────────────────

function TabStatus() {
  const stages: { status: ErpPedido['status']; desc: string }[] = [
    { status: 'RASCUNHO',   desc: 'Oportunidade identificada, aguardando qualificação.' },
    { status: 'CONFIRMADO', desc: 'Proposta enviada ao cliente, em negociação ativa.' },
    { status: 'FATURADO',   desc: 'Negócio fechado com sucesso.' },
    { status: 'CANCELADO',  desc: 'Oportunidade perdida ou cancelada.' },
  ];

  return (
    <div className="px-6 py-5 space-y-3">
      <p className="text-sm text-slate-500">Acompanhe a progressão da negociação pelos estágios abaixo.</p>
      {stages.map(({ status, desc }) => (
        <div key={status} className={`p-4 rounded-xl border-2 ${STATUS_BG[status]}`}>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800">{STATUS_LABEL[status]}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[status]}`}>
              {status}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">{desc}</p>
        </div>
      ))}
    </div>
  );
}

// ── Tab: Produtos Removidos ───────────────────────────────────────────────────

function TabRemovidos({ removidos }: { removidos: RemovidoItem[] }) {
  if (removidos.length === 0) {
    return (
      <div className="px-6 py-10 text-center">
        <LayoutGrid className="w-10 h-10 text-slate-200 mx-auto mb-3" />
        <p className="text-slate-400 text-sm">Nenhum produto foi removido desta negociação.</p>
      </div>
    );
  }
  return (
    <div className="px-6 py-5 space-y-2">
      {removidos.map(r => (
        <div key={r._key} className="flex items-center justify-between p-3 rounded-lg border border-red-100 bg-red-50">
          <div>
            <p className="text-sm font-medium text-slate-700">{r.produto_nome || '(produto sem nome)'}</p>
            <p className="text-xs text-slate-400">Qtd: {r.quantidade} · {fmt(r.total_item)} · Removido em {r.removido_em}</p>
          </div>
          <span className="text-xs text-red-400 font-medium">Removido</span>
        </div>
      ))}
    </div>
  );
}

// ── Tab: Importar (Excel) ─────────────────────────────────────────────────────

function TabImportar() {
  return (
    <div className="px-6 py-10 text-center">
      <Upload className="w-12 h-12 text-slate-300 mx-auto mb-4" />
      <p className="text-slate-600 font-medium mb-1">Importação via planilha (Excel)</p>
      <p className="text-slate-400 text-sm mb-5">
        Importe múltiplos produtos de uma planilha .xlsx ou .csv. <br />
        O arquivo deve conter: Código Interno, Quantidade, Preço Unitário.
      </p>
      <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:border-violet-400 hover:text-violet-600 text-sm font-medium transition-colors">
        <Upload className="w-4 h-4" /> Selecionar arquivo .xlsx / .csv
      </button>
      <p className="text-xs text-slate-300 mt-4">Funcionalidade disponível em breve</p>
    </div>
  );
}

// ── Helpers de UI ─────────────────────────────────────────────────────────────

const inputCls = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

// ── StatusMenu (mover estágio) ────────────────────────────────────────────────

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
