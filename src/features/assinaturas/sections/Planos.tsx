import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Pencil, Search, X, ChevronDown,
  Layers, BarChart2, ArrowUpDown, CheckCircle,
  AlertCircle, Archive, Trash2, Loader2,
} from 'lucide-react';
import {
  getPlanos, getPlanoById, createPlano, updatePlano,
  savePlanoFaixas, savePlanoMetricas, savePlanoRegras,
  type AssinaturaPlano, type AssinaturaPlanoFaixa,
  type AssinaturaPlanoMetrica, type AssinaturaPlanoRegra,
} from '../../../lib/assinaturas';
import { getGruposProdutos, type ErpGrupoProduto } from '../../../lib/erp';

// ── Types ─────────────────────────────────────────────────────────────────────

type PlanoStatus = 'ativo' | 'inativo' | 'arquivado';

interface FaixaRow {
  faixa_min: number;
  faixa_max: number | null;
  ilimitado: boolean;
  preco: number;
}

interface MetricaRow {
  nome: string;
  limite: number | null;
  acao_limite: 'bloquear' | 'notificar' | 'cobrar_excedente';
  preco_excedente: number;
}

interface RegraRow {
  plano_destino_id: string;
  tipo: 'upgrade' | 'downgrade';
  cobranca: 'imediata' | 'proximo_ciclo';
}

interface FormState {
  nome: string;
  descricao: string;
  preco_venda: string;
  subscription_period: 'semanal' | 'mensal' | 'trimestral' | 'semestral' | 'anual';
  subscription_annual_discount_pct: string;
  subscription_trial_days: string;
  subscription_grace_days: string;
  subscription_max_users: string;
  plano_status: PlanoStatus;
  grupo_id: string;
}

const emptyForm: FormState = {
  nome: '',
  descricao: '',
  preco_venda: '',
  subscription_period: 'mensal',
  subscription_annual_discount_pct: '',
  subscription_trial_days: '0',
  subscription_grace_days: '0',
  subscription_max_users: '',
  plano_status: 'ativo',
  grupo_id: '',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const CICLO_LABELS: Record<string, string> = {
  semanal: 'Semanal',
  mensal: 'Mensal',
  trimestral: 'Trimestral',
  semestral: 'Semestral',
  anual: 'Anual',
};

function StatusBadge({ status }: { status: string | null }) {
  if (status === 'ativo') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
      <CheckCircle size={11} /> Ativo
    </span>
  );
  if (status === 'inativo') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
      <AlertCircle size={11} /> Inativo
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
      <Archive size={11} /> Arquivado
    </span>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────

interface Toast { id: number; msg: string; type: 'success' | 'error' }

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  let _id = 0;
  const show = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    const id = ++_id;
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);
  return { toasts, show };
}

function ToastList({ toasts }: { toasts: Toast[] }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
      {toasts.map(t => (
        <div key={t.id} className={`px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium text-white
          ${t.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function Planos() {
  const { toasts, show } = useToast();

  // List state
  const [planos, setPlanos] = useState<AssinaturaPlano[]>([]);
  const [grupos, setGrupos] = useState<ErpGrupoProduto[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<PlanoStatus | 'todos'>('todos');

  // Panel state
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form
  const [form, setForm] = useState<FormState>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  // Dynamic lists
  const [faixas, setFaixas] = useState<FaixaRow[]>([]);
  const [metricas, setMetricas] = useState<MetricaRow[]>([]);
  const [regras, setRegras] = useState<RegraRow[]>([]);

  // ── Load list ──────────────────────────────────────────────────────────────

  async function loadList() {
    setLoadingList(true);
    try {
      const [p, g] = await Promise.all([getPlanos(), getGruposProdutos()]);
      setPlanos(p);
      setGrupos(g);
    } catch (e) {
      show('Erro ao carregar planos.', 'error');
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => { loadList(); }, []);

  // ── Filtered list ─────────────────────────────────────────────────────────

  const filtered = planos.filter(p => {
    const matchSearch = !search || p.nome.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'todos' || p.plano_status === filterStatus;
    return matchSearch && matchStatus;
  });

  // ── Open panel ─────────────────────────────────────────────────────────────

  function openNew() {
    setEditingId(null);
    setForm(emptyForm);
    setErrors({});
    setFaixas([]);
    setMetricas([]);
    setRegras([]);
    setPanelOpen(true);
  }

  async function openEdit(id: string) {
    setEditingId(id);
    setForm(emptyForm);
    setErrors({});
    setFaixas([]);
    setMetricas([]);
    setRegras([]);
    setPanelOpen(true);
    setLoadingDetail(true);
    try {
      const plano = await getPlanoById(id);
      if (!plano) { show('Plano não encontrado.', 'error'); return; }
      setForm({
        nome: plano.nome,
        descricao: plano.descricao ?? '',
        preco_venda: String(plano.preco_venda),
        subscription_period: plano.subscription_period ?? 'mensal',
        subscription_annual_discount_pct: plano.subscription_annual_discount_pct != null
          ? String(plano.subscription_annual_discount_pct) : '',
        subscription_trial_days: String(plano.subscription_trial_days ?? 0),
        subscription_grace_days: String(plano.subscription_grace_days ?? 0),
        subscription_max_users: plano.subscription_max_users != null
          ? String(plano.subscription_max_users) : '',
        plano_status: (plano.plano_status as PlanoStatus) ?? 'ativo',
        grupo_id: plano.grupo_id ?? '',
      });
      setFaixas((plano.faixas ?? []).map(f => ({
        faixa_min: f.faixa_min,
        faixa_max: f.faixa_max,
        ilimitado: f.faixa_max === null,
        preco: f.preco,
      })));
      setMetricas((plano.metricas ?? []).map(m => ({
        nome: m.nome,
        limite: m.limite,
        acao_limite: m.acao_limite,
        preco_excedente: m.preco_excedente,
      })));
      setRegras((plano.regras ?? []).map(r => ({
        plano_destino_id: r.plano_destino_id,
        tipo: r.tipo,
        cobranca: r.cobranca,
      })));
    } catch {
      show('Erro ao carregar detalhes do plano.', 'error');
    } finally {
      setLoadingDetail(false);
    }
  }

  function closePanel() {
    setPanelOpen(false);
    setEditingId(null);
  }

  // ── Form helpers ──────────────────────────────────────────────────────────

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.nome.trim()) e.nome = 'Nome obrigatório.';
    const price = parseFloat(form.preco_venda);
    if (isNaN(price) || price < 0) e.preco_venda = 'Valor base inválido.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  // ── Calculated discounted price ────────────────────────────────────────────

  const basePrice = parseFloat(form.preco_venda) || 0;
  const discountPct = parseFloat(form.subscription_annual_discount_pct) || 0;
  const discountedPrice = basePrice * (1 - discountPct / 100);

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        nome: form.nome.trim(),
        descricao: form.descricao.trim() || null,
        preco_venda: parseFloat(form.preco_venda),
        subscription_period: form.subscription_period,
        subscription_annual_discount_pct: form.subscription_annual_discount_pct !== ''
          ? parseFloat(form.subscription_annual_discount_pct) : null,
        subscription_trial_days: parseInt(form.subscription_trial_days) || 0,
        subscription_grace_days: parseInt(form.subscription_grace_days) || 0,
        subscription_max_users: form.subscription_max_users !== ''
          ? parseInt(form.subscription_max_users) : null,
        plano_status: form.plano_status,
        grupo_id: form.grupo_id || null,
        is_subscription: true as const,
        ativo: form.plano_status === 'ativo',
        unidade_medida: 'UN' as const,
        estoque_atual: 0,
        ncm: '' as const,
        codigo_interno: '',
      };

      let savedId: string;
      if (editingId) {
        const updated = await updatePlano(editingId, payload);
        savedId = updated.id;
      } else {
        const created = await createPlano(payload as Parameters<typeof createPlano>[0]);
        savedId = created.id;
      }

      // Save dynamic lists
      const faixasPayload: Omit<AssinaturaPlanoFaixa, 'id' | 'tenant_id' | 'created_at'>[] =
        faixas.map(f => ({
          plano_id: savedId,
          faixa_min: f.faixa_min,
          faixa_max: f.ilimitado ? null : f.faixa_max,
          preco: f.preco,
        }));

      const metricasPayload: Omit<AssinaturaPlanoMetrica, 'id' | 'tenant_id' | 'created_at'>[] =
        metricas.map(m => ({
          plano_id: savedId,
          nome: m.nome,
          limite: m.limite,
          acao_limite: m.acao_limite,
          preco_excedente: m.preco_excedente,
        }));

      const regrasPayload: Omit<AssinaturaPlanoRegra, 'id' | 'tenant_id' | 'plano_destino'>[] =
        regras.filter(r => r.plano_destino_id).map(r => ({
          plano_origem_id: savedId,
          plano_destino_id: r.plano_destino_id,
          tipo: r.tipo,
          cobranca: r.cobranca,
        }));

      await Promise.all([
        savePlanoFaixas(savedId, faixasPayload),
        savePlanoMetricas(savedId, metricasPayload),
        savePlanoRegras(savedId, regrasPayload),
      ]);

      show(editingId ? 'Plano atualizado com sucesso.' : 'Plano criado com sucesso.');
      closePanel();
      await loadList();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar plano.';
      show(msg, 'error');
    } finally {
      setSaving(false);
    }
  }

  // ── Faixas handlers ────────────────────────────────────────────────────────

  function addFaixa() {
    setFaixas(f => [...f, { faixa_min: 1, faixa_max: null, ilimitado: true, preco: 0 }]);
  }

  function updateFaixa(idx: number, patch: Partial<FaixaRow>) {
    setFaixas(f => f.map((r, i) => i === idx ? { ...r, ...patch } : r));
  }

  function removeFaixa(idx: number) {
    setFaixas(f => f.filter((_, i) => i !== idx));
  }

  // ── Métricas handlers ──────────────────────────────────────────────────────

  function addMetrica() {
    setMetricas(m => [...m, { nome: '', limite: null, acao_limite: 'bloquear', preco_excedente: 0 }]);
  }

  function updateMetrica(idx: number, patch: Partial<MetricaRow>) {
    setMetricas(m => m.map((r, i) => i === idx ? { ...r, ...patch } : r));
  }

  function removeMetrica(idx: number) {
    setMetricas(m => m.filter((_, i) => i !== idx));
  }

  // ── Regras handlers ────────────────────────────────────────────────────────

  function addRegra() {
    setRegras(r => [...r, { plano_destino_id: '', tipo: 'upgrade', cobranca: 'proximo_ciclo' }]);
  }

  function updateRegra(idx: number, patch: Partial<RegraRow>) {
    setRegras(r => r.map((x, i) => i === idx ? { ...x, ...patch } : x));
  }

  function removeRegra(idx: number) {
    setRegras(r => r.filter((_, i) => i !== idx));
  }

  // ── Other plans for regras select ─────────────────────────────────────────

  const otherPlanos = planos.filter(p => p.id !== editingId);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left: List ────────────────────────────────────────────────────── */}
      <div className={`flex flex-col bg-white border-r border-slate-200 transition-all duration-300
        ${panelOpen ? 'w-[420px] min-w-[320px]' : 'flex-1'}`}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Planos de Assinatura</h2>
            <p className="text-xs text-slate-500 mt-0.5">{filtered.length} plano{filtered.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors"
          >
            <Plus size={15} /> Novo Plano
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 px-4 py-3 border-b border-slate-100">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome..."
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
          </div>
          <div className="relative">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as PlanoStatus | 'todos')}
              className="pl-3 pr-8 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 appearance-none bg-white"
            >
              <option value="todos">Todos</option>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
              <option value="arquivado">Arquivado</option>
            </select>
            <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loadingList ? (
            <div className="flex items-center justify-center py-16 text-slate-400">
              <Loader2 size={22} className="animate-spin mr-2" /> Carregando...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
              <Layers size={32} className="opacity-30" />
              <p className="text-sm">Nenhum plano encontrado.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nome</th>
                  {!panelOpen && <>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Ciclo</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Valor base</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Trial</th>
                  </>}
                  <th className="text-center px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(p => (
                  <tr
                    key={p.id}
                    className={`hover:bg-slate-50 transition-colors cursor-pointer
                      ${editingId === p.id ? 'bg-violet-50' : ''}`}
                    onClick={() => openEdit(p.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800 truncate max-w-[160px]">{p.nome}</div>
                      {p.erp_grupo_produtos?.nome && (
                        <div className="text-xs text-slate-400 truncate">{p.erp_grupo_produtos.nome}</div>
                      )}
                    </td>
                    {!panelOpen && <>
                      <td className="px-3 py-3 text-slate-600">
                        {CICLO_LABELS[p.subscription_period ?? ''] ?? '—'}
                      </td>
                      <td className="px-3 py-3 text-right font-medium text-slate-700">
                        {fmtBRL(p.preco_venda)}
                      </td>
                      <td className="px-3 py-3 text-center text-slate-500">
                        {p.subscription_trial_days ? `${p.subscription_trial_days}d` : '—'}
                      </td>
                    </>}
                    <td className="px-3 py-3 text-center">
                      <StatusBadge status={p.plano_status} />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        onClick={e => { e.stopPropagation(); openEdit(p.id); }}
                        className="p-1 rounded hover:bg-violet-100 text-slate-400 hover:text-violet-600 transition-colors"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Right: Form panel ─────────────────────────────────────────────── */}
      {panelOpen && (
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          {/* Panel header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
            <h3 className="text-base font-semibold text-slate-800">
              {editingId ? 'Editar Plano' : 'Novo Plano'}
            </h3>
            <button onClick={closePanel} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
              <X size={18} />
            </button>
          </div>

          {loadingDetail ? (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              <Loader2 size={22} className="animate-spin mr-2" /> Carregando plano...
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 space-y-8">

              {/* ── Seção: Dados básicos ──────────────────────────────────── */}
              <section>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Layers size={13} /> Dados do Plano
                </h4>

                <div className="space-y-4">
                  {/* Nome */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Nome do plano <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={form.nome}
                      onChange={e => setField('nome', e.target.value)}
                      placeholder="Ex: Plano Pro, Starter, Enterprise…"
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300
                        ${errors.nome ? 'border-red-400' : 'border-slate-200'}`}
                    />
                    {errors.nome && <p className="text-xs text-red-500 mt-1">{errors.nome}</p>}
                  </div>

                  {/* Descrição */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Descrição / Observações</label>
                    <textarea
                      value={form.descricao}
                      onChange={e => setField('descricao', e.target.value)}
                      rows={2}
                      placeholder="Descreva brevemente o plano…"
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none"
                    />
                  </div>

                  {/* Valor base + Ciclo */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Valor base (R$) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={form.preco_venda}
                        onChange={e => setField('preco_venda', e.target.value)}
                        placeholder="0,00"
                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300
                          ${errors.preco_venda ? 'border-red-400' : 'border-slate-200'}`}
                      />
                      {errors.preco_venda && <p className="text-xs text-red-500 mt-1">{errors.preco_venda}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Ciclo de cobrança</label>
                      <div className="relative">
                        <select
                          value={form.subscription_period}
                          onChange={e => setField('subscription_period', e.target.value as FormState['subscription_period'])}
                          className="w-full pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 appearance-none bg-white"
                        >
                          <option value="semanal">Semanal</option>
                          <option value="mensal">Mensal</option>
                          <option value="trimestral">Trimestral</option>
                          <option value="semestral">Semestral</option>
                          <option value="anual">Anual</option>
                        </select>
                        <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Desconto anual */}
                  {form.subscription_period === 'anual' && (
                    <div className="bg-violet-50 border border-violet-100 rounded-lg p-3">
                      <label className="block text-xs font-medium text-violet-700 mb-1">Desconto anual (%)</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={form.subscription_annual_discount_pct}
                          onChange={e => setField('subscription_annual_discount_pct', e.target.value)}
                          placeholder="0"
                          className="w-28 px-3 py-1.5 text-sm border border-violet-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
                        />
                        {discountPct > 0 && basePrice > 0 && (
                          <span className="text-xs text-violet-600 font-medium">
                            Valor com desconto: {fmtBRL(discountedPrice)}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Trial + Carência */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Trial (dias)</label>
                      <input
                        type="number"
                        min="0"
                        value={form.subscription_trial_days}
                        onChange={e => setField('subscription_trial_days', e.target.value)}
                        placeholder="0 = sem trial"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Carência (dias)</label>
                      <input
                        type="number"
                        min="0"
                        value={form.subscription_grace_days}
                        onChange={e => setField('subscription_grace_days', e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300"
                      />
                    </div>
                  </div>

                  {/* Limite usuários + Status */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Limite de usuários/acessos</label>
                      <input
                        type="number"
                        min="0"
                        value={form.subscription_max_users}
                        onChange={e => setField('subscription_max_users', e.target.value)}
                        placeholder="Ilimitado"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Status do plano</label>
                      <div className="relative">
                        <select
                          value={form.plano_status}
                          onChange={e => setField('plano_status', e.target.value as PlanoStatus)}
                          className="w-full pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 appearance-none bg-white"
                        >
                          <option value="ativo">Ativo</option>
                          <option value="inativo">Inativo</option>
                          <option value="arquivado">Arquivado</option>
                        </select>
                        <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Grupo */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Grupo de produto</label>
                    <div className="relative">
                      <select
                        value={form.grupo_id}
                        onChange={e => setField('grupo_id', e.target.value)}
                        className="w-full pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-300 appearance-none bg-white"
                      >
                        <option value="">Sem grupo</option>
                        {grupos.map(g => (
                          <option key={g.id} value={g.id}>{g.nome}</option>
                        ))}
                      </select>
                      <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </section>

              {/* ── Seção: Faixas de preço ───────────────────────────────── */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <BarChart2 size={13} /> Preço Escalonado (Faixas)
                  </h4>
                  <button
                    onClick={addFaixa}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 hover:bg-violet-100 text-slate-600 hover:text-violet-700 transition-colors"
                  >
                    <Plus size={12} /> Adicionar Faixa
                  </button>
                </div>

                {faixas.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Nenhuma faixa configurada. O valor base será utilizado.</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-400 italic mb-2">
                      Faixas sobrepõem o valor base quando configuradas.
                    </p>
                    {faixas.map((f, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                        <div className="flex-1 grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-xs text-slate-500 mb-0.5">Mín.</label>
                            <input
                              type="number"
                              min="0"
                              value={f.faixa_min}
                              onChange={e => updateFaixa(idx, { faixa_min: Number(e.target.value) })}
                              className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-violet-300"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-0.5">Máx.</label>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min="0"
                                value={f.ilimitado ? '' : (f.faixa_max ?? '')}
                                disabled={f.ilimitado}
                                onChange={e => updateFaixa(idx, { faixa_max: Number(e.target.value) })}
                                placeholder={f.ilimitado ? '∞' : ''}
                                className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-violet-300 disabled:bg-slate-100 disabled:text-slate-400"
                              />
                            </div>
                            <label className="flex items-center gap-1 mt-0.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={f.ilimitado}
                                onChange={e => updateFaixa(idx, { ilimitado: e.target.checked, faixa_max: e.target.checked ? null : 0 })}
                                className="accent-violet-600 w-3 h-3"
                              />
                              <span className="text-xs text-slate-500">Ilimitado</span>
                            </label>
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-0.5">Preço (R$)</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={f.preco}
                              onChange={e => updateFaixa(idx, { preco: Number(e.target.value) })}
                              className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-violet-300"
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => removeFaixa(idx)}
                          className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-500 transition-colors ml-1 shrink-0"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* ── Seção: Métricas ──────────────────────────────────────── */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <BarChart2 size={13} /> Métricas Customizáveis
                  </h4>
                  <button
                    onClick={addMetrica}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 hover:bg-violet-100 text-slate-600 hover:text-violet-700 transition-colors"
                  >
                    <Plus size={12} /> Adicionar Métrica
                  </button>
                </div>

                {metricas.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Nenhuma métrica configurada.</p>
                ) : (
                  <div className="space-y-3">
                    {metricas.map((m, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-3">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 grid grid-cols-2 gap-2">
                            {/* Nome */}
                            <div>
                              <label className="block text-xs text-slate-500 mb-0.5">Nome da métrica</label>
                              <input
                                value={m.nome}
                                onChange={e => updateMetrica(idx, { nome: e.target.value })}
                                placeholder="Ex: Projetos, Contatos…"
                                className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-violet-300"
                              />
                            </div>
                            {/* Limite */}
                            <div>
                              <label className="block text-xs text-slate-500 mb-0.5">Limite</label>
                              <input
                                type="number"
                                min="0"
                                value={m.limite ?? ''}
                                onChange={e => updateMetrica(idx, { limite: e.target.value === '' ? null : Number(e.target.value) })}
                                placeholder="Ilimitado"
                                className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-violet-300"
                              />
                            </div>
                            {/* Ação */}
                            <div>
                              <label className="block text-xs text-slate-500 mb-0.5">Ação ao atingir limite</label>
                              <div className="relative">
                                <select
                                  value={m.acao_limite}
                                  onChange={e => updateMetrica(idx, { acao_limite: e.target.value as MetricaRow['acao_limite'] })}
                                  className="w-full pl-2 pr-7 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-violet-300 appearance-none bg-white"
                                >
                                  <option value="bloquear">Bloquear</option>
                                  <option value="notificar">Notificar</option>
                                  <option value="cobrar_excedente">Cobrar excedente</option>
                                </select>
                                <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                              </div>
                            </div>
                            {/* Preço excedente */}
                            {m.acao_limite === 'cobrar_excedente' && (
                              <div>
                                <label className="block text-xs text-slate-500 mb-0.5">Preço por excedente (R$)</label>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={m.preco_excedente}
                                  onChange={e => updateMetrica(idx, { preco_excedente: Number(e.target.value) })}
                                  placeholder="0,00"
                                  className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-violet-300"
                                />
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => removeMetrica(idx)}
                            className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-500 transition-colors mt-0.5 shrink-0"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* ── Seção: Regras upgrade/downgrade ─────────────────────── */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <ArrowUpDown size={13} /> Regras de Upgrade / Downgrade
                  </h4>
                  <button
                    onClick={addRegra}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 hover:bg-violet-100 text-slate-600 hover:text-violet-700 transition-colors"
                  >
                    <Plus size={12} /> Adicionar Regra
                  </button>
                </div>

                {regras.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Nenhuma regra de migração configurada.</p>
                ) : (
                  <div className="space-y-2">
                    {regras.map((r, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                        <div className="flex-1 grid grid-cols-3 gap-2">
                          {/* Plano destino */}
                          <div>
                            <label className="block text-xs text-slate-500 mb-0.5">Plano destino</label>
                            <div className="relative">
                              <select
                                value={r.plano_destino_id}
                                onChange={e => updateRegra(idx, { plano_destino_id: e.target.value })}
                                className="w-full pl-2 pr-7 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-violet-300 appearance-none bg-white"
                              >
                                <option value="">Selecionar…</option>
                                {otherPlanos.map(p => (
                                  <option key={p.id} value={p.id}>{p.nome}</option>
                                ))}
                              </select>
                              <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                          </div>
                          {/* Tipo */}
                          <div>
                            <label className="block text-xs text-slate-500 mb-0.5">Tipo</label>
                            <div className="relative">
                              <select
                                value={r.tipo}
                                onChange={e => updateRegra(idx, { tipo: e.target.value as RegraRow['tipo'] })}
                                className="w-full pl-2 pr-7 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-violet-300 appearance-none bg-white"
                              >
                                <option value="upgrade">Upgrade</option>
                                <option value="downgrade">Downgrade</option>
                              </select>
                              <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                          </div>
                          {/* Cobrança */}
                          <div>
                            <label className="block text-xs text-slate-500 mb-0.5">Cobrança</label>
                            <div className="relative">
                              <select
                                value={r.cobranca}
                                onChange={e => updateRegra(idx, { cobranca: e.target.value as RegraRow['cobranca'] })}
                                className="w-full pl-2 pr-7 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-violet-300 appearance-none bg-white"
                              >
                                <option value="imediata">Imediata</option>
                                <option value="proximo_ciclo">Próximo ciclo</option>
                              </select>
                              <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => removeRegra(idx)}
                          className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-500 transition-colors ml-1 shrink-0"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

            </div>
          )}

          {/* Panel footer */}
          {!loadingDetail && (
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 shrink-0 bg-white">
              <button
                onClick={closePanel}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-60"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Criar plano'}
              </button>
            </div>
          )}
        </div>
      )}

      <ToastList toasts={toasts} />
    </div>
  );
}
