import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Edit2, Trash2, X, Loader2, CheckCircle, AlertCircle,
  Truck, ArrowRight, Package, DollarSign, MapPin, ChevronRight,
  PlayCircle, CheckSquare, XCircle, Fuel, Receipt, Wrench,
} from 'lucide-react';
import { getFretes, createFrete, updateFrete, deleteFrete } from '../../../lib/scm';
import type { ScmFrete, ScmFreteItem } from '../../../lib/scm';
import { getProdutos, getFornecedores } from '../../../lib/erp';
import type { ErpProduto, ErpFornecedor } from '../../../lib/erp';

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  rascunho: 'Rascunho',
  ativo: 'Ativo',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

const STATUS_COLORS: Record<string, string> = {
  rascunho: 'bg-slate-100 text-slate-600',
  ativo:    'bg-blue-100 text-blue-700',
  concluido: 'bg-green-100 text-green-700',
  cancelado: 'bg-red-100 text-red-600',
};

const FILTER_TABS = [
  { id: '', label: 'Todos' },
  { id: 'rascunho', label: 'Rascunho' },
  { id: 'ativo', label: 'Ativo' },
  { id: 'concluido', label: 'Concluído' },
  { id: 'cancelado', label: 'Cancelado' },
];

function fmt(v: number | null | undefined): string {
  if (v == null) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ── Formulário vazio ──────────────────────────────────────────────────────────

type FreteForm = Omit<ScmFrete, 'id' | 'tenant_id' | 'created_at' | 'numero' | 'custo_total'>;

const EMPTY_FORM: FreteForm = {
  status: 'rascunho',
  descricao: null,
  tipo: 'proprio',
  placa: null,
  motorista: null,
  fornecedor_id: null,
  origem: null,
  destino: null,
  distancia_km: null,
  itens_json: [],
  custo_combustivel: 0,
  custo_pedagio: 0,
  custo_motorista: 0,
  custo_manutencao: 0,
  custo_outros: 0,
  valor_cobrado: null,
  pedido_id: null,
  peso_total_kg: null,
  volumes: null,
  observacoes: null,
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function FreteServicos() {
  const [fretes, setFretes] = useState<ScmFrete[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FreteForm>(EMPTY_FORM);
  const [activeTab, setActiveTab] = useState<'dados' | 'rota' | 'produtos' | 'custos'>('dados');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Lookup data
  const [produtos, setProdutos] = useState<ErpProduto[]>([]);
  const [fornecedores, setFornecedores] = useState<ErpFornecedor[]>([]);
  const [loadingLookup, setLoadingLookup] = useState(false);

  // Item add state
  const [itemProdutoId, setItemProdutoId] = useState('');
  const [itemQtd, setItemQtd] = useState('1');
  const [itemPeso, setItemPeso] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setFretes(await getFretes(filterStatus || undefined));
    } catch (e) {
      showToast('Erro ao carregar fretes: ' + (e as Error).message, false);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { load(); }, [load]);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function loadLookup() {
    if (produtos.length > 0) return;
    setLoadingLookup(true);
    try {
      const [p, f] = await Promise.all([getProdutos(), getFornecedores()]);
      setProdutos(p);
      setFornecedores(f);
    } catch {
      // silently fail — user can retry by reopening form
    } finally {
      setLoadingLookup(false);
    }
  }

  function openNew() {
    setForm(EMPTY_FORM);
    setEditId(null);
    setActiveTab('dados');
    setShowForm(true);
    loadLookup();
  }

  function openEdit(f: ScmFrete) {
    setForm({
      status: f.status,
      descricao: f.descricao,
      tipo: f.tipo,
      placa: f.placa,
      motorista: f.motorista,
      fornecedor_id: f.fornecedor_id,
      origem: f.origem,
      destino: f.destino,
      distancia_km: f.distancia_km,
      itens_json: f.itens_json ?? [],
      custo_combustivel: f.custo_combustivel,
      custo_pedagio: f.custo_pedagio,
      custo_motorista: f.custo_motorista,
      custo_manutencao: f.custo_manutencao,
      custo_outros: f.custo_outros,
      valor_cobrado: f.valor_cobrado,
      pedido_id: f.pedido_id,
      peso_total_kg: f.peso_total_kg,
      volumes: f.volumes,
      observacoes: f.observacoes,
    });
    setEditId(f.id);
    setActiveTab('dados');
    setShowForm(true);
    loadLookup();
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este frete?')) return;
    try {
      await deleteFrete(id);
      showToast('Frete excluído.', true);
      load();
    } catch (e) {
      showToast('Erro: ' + (e as Error).message, false);
    }
  }

  async function handleSave() {
    if (!form.descricao?.trim()) return showToast('Informe a descrição do frete.', false);
    setSaving(true);
    try {
      if (editId) {
        await updateFrete(editId, form);
        showToast('Frete atualizado.', true);
      } else {
        await createFrete(form);
        showToast('Frete criado.', true);
      }
      setShowForm(false);
      load();
    } catch (e) {
      showToast('Erro: ' + (e as Error).message, false);
    } finally {
      setSaving(false);
    }
  }

  async function advanceStatus(frete: ScmFrete, newStatus: ScmFrete['status']) {
    try {
      await updateFrete(frete.id, { status: newStatus });
      showToast(`Status alterado para "${STATUS_LABELS[newStatus]}".`, true);
      load();
    } catch (e) {
      showToast('Erro: ' + (e as Error).message, false);
    }
  }

  function addItem() {
    const prod = produtos.find(p => p.id === itemProdutoId);
    if (!prod) return showToast('Selecione um produto.', false);
    const qtd = parseFloat(itemQtd) || 1;
    const peso = parseFloat(itemPeso) || (prod.peso_bruto_kg ?? 0);
    const newItem: ScmFreteItem = {
      produto_id: prod.id,
      nome: prod.nome,
      quantidade: qtd,
      peso_kg: peso,
    };
    setForm(prev => ({
      ...prev,
      itens_json: [...prev.itens_json, newItem],
      peso_total_kg: (prev.peso_total_kg ?? 0) + peso * qtd,
    }));
    setItemProdutoId('');
    setItemQtd('1');
    setItemPeso('');
  }

  function removeItem(idx: number) {
    setForm(prev => {
      const items = prev.itens_json.filter((_, i) => i !== idx);
      const pesoTotal = items.reduce((acc, it) => acc + it.peso_kg * it.quantidade, 0);
      return { ...prev, itens_json: items, peso_total_kg: pesoTotal || null };
    });
  }

  const custoTotal = (form.custo_combustivel || 0)
    + (form.custo_pedagio || 0)
    + (form.custo_motorista || 0)
    + (form.custo_manutencao || 0)
    + (form.custo_outros || 0);

  const margem = form.valor_cobrado != null && custoTotal > 0
    ? ((form.valor_cobrado - custoTotal) / form.valor_cobrado * 100).toFixed(1)
    : null;

  const filtered = fretes.filter(f => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (f.descricao ?? '').toLowerCase().includes(q) ||
      (f.origem ?? '').toLowerCase().includes(q) ||
      (f.destino ?? '').toLowerCase().includes(q) ||
      (f.placa ?? '').toLowerCase().includes(q) ||
      (f.motorista ?? '').toLowerCase().includes(q)
    );
  });

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">TMS — Gestão de Fretes</h1>
          <p className="text-sm text-slate-500">{filtered.length} frete{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Novo Frete
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 mb-4 bg-white rounded-lg border border-slate-200 p-1 w-fit">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterStatus(tab.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filterStatus === tab.id
                ? 'bg-emerald-600 text-white'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Buscar por descrição, origem, destino, placa ou motorista..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Nº</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Descrição</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Origem → Destino</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Tipo</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Custo Total</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Valor Cobrado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-10 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-10 text-slate-400">
                  Nenhum frete encontrado.
                </td>
              </tr>
            ) : filtered.map(f => (
              <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-mono text-slate-500 text-xs">#{f.numero}</td>
                <td className="px-4 py-3 font-medium text-slate-800 max-w-[200px] truncate">
                  {f.descricao || '—'}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {f.origem || f.destino ? (
                    <span className="flex items-center gap-1 text-xs">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {f.origem || '?'}
                      <ArrowRight className="w-3 h-3 text-slate-300" />
                      {f.destino || '?'}
                      {f.distancia_km && (
                        <span className="text-slate-400 ml-1">({f.distancia_km} km)</span>
                      )}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium w-fit ${
                    f.tipo === 'proprio' ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'
                  }`}>
                    <Truck className="w-3 h-3" />
                    {f.tipo === 'proprio' ? 'Próprio' : 'Terceiro'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[f.status]}`}>
                    {STATUS_LABELS[f.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-slate-700 font-medium">{fmt(f.custo_total)}</td>
                <td className="px-4 py-3 text-right text-slate-700">{fmt(f.valor_cobrado)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    {/* Status advance buttons */}
                    {f.status === 'rascunho' && (
                      <button
                        onClick={() => advanceStatus(f, 'ativo')}
                        title="Ativar frete"
                        className="text-slate-400 hover:text-blue-600 transition-colors"
                      >
                        <PlayCircle className="w-4 h-4" />
                      </button>
                    )}
                    {f.status === 'ativo' && (
                      <button
                        onClick={() => advanceStatus(f, 'concluido')}
                        title="Marcar como concluído"
                        className="text-slate-400 hover:text-green-600 transition-colors"
                      >
                        <CheckSquare className="w-4 h-4" />
                      </button>
                    )}
                    {(f.status === 'rascunho' || f.status === 'ativo') && (
                      <button
                        onClick={() => advanceStatus(f, 'cancelado')}
                        title="Cancelar frete"
                        className="text-slate-400 hover:text-red-600 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(f)}
                      className="text-slate-400 hover:text-emerald-600 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(f.id)}
                      className="text-slate-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Form Panel ── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
              <h2 className="text-lg font-bold text-slate-900">
                {editId ? 'Editar Frete' : 'Novo Frete'}
              </h2>
              <button onClick={() => setShowForm(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-slate-700" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 px-6 shrink-0">
              {([
                { id: 'dados', label: 'Dados', icon: Truck },
                { id: 'rota', label: 'Rota', icon: MapPin },
                { id: 'produtos', label: 'Produtos', icon: Package },
                { id: 'custos', label: 'Custos', icon: DollarSign },
              ] as const).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === id
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">

              {/* ── Tab: Dados ── */}
              {activeTab === 'dados' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Descrição *</label>
                    <input
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Ex.: Entrega SP → RJ — Pedido #1234"
                      value={form.descricao ?? ''}
                      onChange={e => setForm(p => ({ ...p, descricao: e.target.value || null }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Tipo de Transporte</label>
                      <div className="flex gap-2">
                        {([
                          { id: 'proprio', label: 'Próprio' },
                          { id: 'terceiro', label: 'Terceiro' },
                        ] as const).map(opt => (
                          <button
                            key={opt.id}
                            onClick={() => setForm(p => ({ ...p, tipo: opt.id, fornecedor_id: null, placa: null, motorista: null }))}
                            className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                              form.tipo === opt.id
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'border-slate-200 text-slate-600 hover:border-emerald-400'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                      <select
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        value={form.status}
                        onChange={e => setForm(p => ({ ...p, status: e.target.value as ScmFrete['status'] }))}
                      >
                        <option value="rascunho">Rascunho</option>
                        <option value="ativo">Ativo</option>
                        <option value="concluido">Concluído</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </div>
                  </div>

                  {/* Campos condicionais: próprio vs terceiro */}
                  {form.tipo === 'proprio' ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Placa do Veículo</label>
                        <input
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          placeholder="AAA-0000 ou ABC1D23"
                          value={form.placa ?? ''}
                          onChange={e => setForm(p => ({ ...p, placa: e.target.value.toUpperCase() || null }))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Motorista</label>
                        <input
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          placeholder="Nome do motorista"
                          value={form.motorista ?? ''}
                          onChange={e => setForm(p => ({ ...p, motorista: e.target.value || null }))}
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Transportadora {loadingLookup && <Loader2 className="inline w-3 h-3 animate-spin ml-1" />}
                      </label>
                      <select
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        value={form.fornecedor_id ?? ''}
                        onChange={e => setForm(p => ({ ...p, fornecedor_id: e.target.value || null }))}
                      >
                        <option value="">— Selecione uma transportadora —</option>
                        {fornecedores.map(f => (
                          <option key={f.id} value={f.id}>{f.nome}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Volumes</label>
                      <input
                        type="number"
                        min="0"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        value={form.volumes ?? ''}
                        onChange={e => setForm(p => ({ ...p, volumes: e.target.value ? +e.target.value : null }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Vinc. Pedido de Venda (ID)</label>
                      <input
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="UUID do pedido (opcional)"
                        value={form.pedido_id ?? ''}
                        onChange={e => setForm(p => ({ ...p, pedido_id: e.target.value || null }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Observações</label>
                    <textarea
                      rows={3}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                      value={form.observacoes ?? ''}
                      onChange={e => setForm(p => ({ ...p, observacoes: e.target.value || null }))}
                    />
                  </div>
                </div>
              )}

              {/* ── Tab: Rota ── */}
              {activeTab === 'rota' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        <MapPin className="inline w-3 h-3 mr-1" />Origem
                      </label>
                      <input
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="Ex.: São Paulo, SP"
                        value={form.origem ?? ''}
                        onChange={e => setForm(p => ({ ...p, origem: e.target.value || null }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        <ChevronRight className="inline w-3 h-3 mr-1" />Destino
                      </label>
                      <input
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        placeholder="Ex.: Rio de Janeiro, RJ"
                        value={form.destino ?? ''}
                        onChange={e => setForm(p => ({ ...p, destino: e.target.value || null }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Distância (km)</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        className="w-40 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        value={form.distancia_km ?? ''}
                        onChange={e => setForm(p => ({ ...p, distancia_km: e.target.value ? +e.target.value : null }))}
                      />
                      {form.distancia_km && (
                        <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
                          {form.distancia_km.toLocaleString('pt-BR')} km estimados
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Rota preview */}
                  {(form.origem || form.destino) && (
                    <div className="bg-emerald-50 rounded-xl p-4 flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                        <Truck className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
                        <span>{form.origem || '?'}</span>
                        <ArrowRight className="w-4 h-4 text-emerald-400" />
                        <span>{form.destino || '?'}</span>
                        {form.distancia_km && (
                          <span className="text-emerald-600 font-normal ml-2">
                            · {form.distancia_km} km
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Peso Total (kg)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={form.peso_total_kg ?? ''}
                      onChange={e => setForm(p => ({ ...p, peso_total_kg: e.target.value ? +e.target.value : null }))}
                    />
                    <p className="text-xs text-slate-400 mt-1">Calculado automaticamente ao adicionar produtos na aba Produtos.</p>
                  </div>
                </div>
              )}

              {/* ── Tab: Produtos ── */}
              {activeTab === 'produtos' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-500">Adicione os produtos que serão transportados neste frete.</p>

                  {/* Add item row */}
                  <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Adicionar produto</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-1">
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Produto {loadingLookup && <Loader2 className="inline w-3 h-3 animate-spin" />}
                        </label>
                        <select
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          value={itemProdutoId}
                          onChange={e => {
                            setItemProdutoId(e.target.value);
                            const prod = produtos.find(p => p.id === e.target.value);
                            if (prod?.peso_bruto_kg) setItemPeso(String(prod.peso_bruto_kg));
                          }}
                        >
                          <option value="">— Selecione —</option>
                          {produtos.map(p => (
                            <option key={p.id} value={p.id}>{p.nome} ({p.unidade_medida})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Quantidade</label>
                        <input
                          type="number"
                          min="0.001"
                          step="any"
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          value={itemQtd}
                          onChange={e => setItemQtd(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Peso unit. (kg)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          value={itemPeso}
                          onChange={e => setItemPeso(e.target.value)}
                        />
                      </div>
                    </div>
                    <button
                      onClick={addItem}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Adicionar
                    </button>
                  </div>

                  {/* Items list */}
                  {form.itens_json.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">
                      <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      Nenhum produto adicionado.
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Produto</th>
                            <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Qtd</th>
                            <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Peso unit. (kg)</th>
                            <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500 uppercase">Peso total (kg)</th>
                            <th className="px-4 py-2"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {form.itens_json.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="px-4 py-2 text-slate-800 font-medium">{item.nome}</td>
                              <td className="px-4 py-2 text-right text-slate-600">{item.quantidade}</td>
                              <td className="px-4 py-2 text-right text-slate-600">{item.peso_kg.toLocaleString('pt-BR')}</td>
                              <td className="px-4 py-2 text-right text-slate-600 font-medium">
                                {(item.peso_kg * item.quantidade).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
                              </td>
                              <td className="px-4 py-2">
                                <button onClick={() => removeItem(idx)} className="text-slate-300 hover:text-red-500 transition-colors">
                                  <X className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-emerald-50 border-t border-emerald-100">
                          <tr>
                            <td colSpan={3} className="px-4 py-2 text-xs font-semibold text-emerald-700">Total</td>
                            <td className="px-4 py-2 text-right text-emerald-700 font-bold">
                              {form.itens_json.reduce((acc, it) => acc + it.peso_kg * it.quantidade, 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 })} kg
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── Tab: Custos ── */}
              {activeTab === 'custos' && (
                <div className="space-y-5">
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <Receipt className="w-3.5 h-3.5" /> Custos Operacionais
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
                          <Fuel className="w-3 h-3" /> Combustível (R$)
                        </label>
                        {form.distancia_km && (
                          <p className="text-xs text-slate-400 mb-1">
                            Sugestão: {form.distancia_km} km × consumo médio × preço/L
                          </p>
                        )}
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          value={form.custo_combustivel || ''}
                          onChange={e => setForm(p => ({ ...p, custo_combustivel: +e.target.value || 0 }))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Pedágio (R$)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          value={form.custo_pedagio || ''}
                          onChange={e => setForm(p => ({ ...p, custo_pedagio: +e.target.value || 0 }))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Motorista (R$)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          value={form.custo_motorista || ''}
                          onChange={e => setForm(p => ({ ...p, custo_motorista: +e.target.value || 0 }))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
                          <Wrench className="w-3 h-3" /> Manutenção (R$)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          value={form.custo_manutencao || ''}
                          onChange={e => setForm(p => ({ ...p, custo_manutencao: +e.target.value || 0 }))}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Outros (R$)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          value={form.custo_outros || ''}
                          onChange={e => setForm(p => ({ ...p, custo_outros: +e.target.value || 0 }))}
                        />
                      </div>
                    </div>

                    {/* Custo total */}
                    <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-700">Custo Total</span>
                      <span className="text-xl font-bold text-slate-900">{fmt(custoTotal)}</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4 space-y-3">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5" /> Cobrança ao Cliente
                    </p>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Valor Cobrado (R$)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        value={form.valor_cobrado ?? ''}
                        onChange={e => setForm(p => ({ ...p, valor_cobrado: e.target.value ? +e.target.value : null }))}
                      />
                    </div>

                    {margem !== null && (
                      <div className={`rounded-xl p-4 flex items-center justify-between ${
                        parseFloat(margem) >= 0 ? 'bg-green-50' : 'bg-red-50'
                      }`}>
                        <span className={`text-sm font-semibold ${parseFloat(margem) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          Margem bruta
                        </span>
                        <div className="text-right">
                          <div className={`text-xl font-bold ${parseFloat(margem) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            {margem}%
                          </div>
                          <div className={`text-xs ${parseFloat(margem) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {fmt((form.valor_cobrado ?? 0) - custoTotal)} de lucro bruto
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200 shrink-0">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editId ? 'Salvar Alterações' : 'Criar Frete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
