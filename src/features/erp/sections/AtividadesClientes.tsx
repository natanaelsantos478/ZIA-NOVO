import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, X, Loader2, CheckCircle, AlertCircle,
  Zap, Save, Edit2, ToggleLeft, ToggleRight, ChevronDown, ChevronUp,
  Bell, DollarSign, Settings, Activity,
} from 'lucide-react';
import {
  getAtividadesClientes, createAtividadeCliente, updateAtividadeCliente, deleteAtividadeCliente,
  getGruposClientes, getDescontos,
  type ErpAtividadeCliente, type ErpGrupoCliente, type ErpDesconto,
} from '../../../lib/erp';

// ── Helpers ───────────────────────────────────────────────────────────────────
type TipoAtividade = ErpAtividadeCliente['tipo'];
type FilterTab = 'todos' | TipoAtividade;

const TIPO_CONFIG: Record<TipoAtividade, { label: string; bg: string; color: string; icon: React.ReactNode }> = {
  operacional:  { label: 'Operacional',  bg: 'bg-blue-100',    color: 'text-blue-700',   icon: <Settings className="w-3.5 h-3.5" />    },
  financeira:   { label: 'Financeira',   bg: 'bg-emerald-100', color: 'text-emerald-700',icon: <DollarSign className="w-3.5 h-3.5" />  },
  desconto:     { label: 'Desconto',     bg: 'bg-amber-100',   color: 'text-amber-700',  icon: <Activity className="w-3.5 h-3.5" />    },
  notificacao:  { label: 'Notificação',  bg: 'bg-purple-100',  color: 'text-purple-700', icon: <Bell className="w-3.5 h-3.5" />        },
};

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'todos',       label: 'Todos'        },
  { id: 'operacional', label: 'Operacional'  },
  { id: 'financeira',  label: 'Financeira'   },
  { id: 'desconto',    label: 'Desconto'     },
  { id: 'notificacao', label: 'Notificação'  },
];

type AtividadeForm = Omit<ErpAtividadeCliente, 'id' | 'tenant_id' | 'created_at'>;

const EMPTY_FORM: AtividadeForm = {
  titulo: '',
  descricao: null,
  tipo: 'operacional',
  trigger_valor_acumulado_gt: null,
  trigger_meses_inscrito_gt: null,
  trigger_status_assinatura: null,
  trigger_manual: false,
  acao_add_agenda: false,
  acao_agenda_responsavel_id: null,
  acao_add_grupo_id: null,
  acao_aplicar_desconto_id: null,
  acao_modificar_valor_pct: null,
  acao_notificacao_texto: null,
  ativo: true,
};

// ── Chips de gatilhos e ações ─────────────────────────────────────────────────
function TriggerChips({ a }: { a: ErpAtividadeCliente }) {
  const chips: string[] = [];
  if (a.trigger_valor_acumulado_gt != null) chips.push(`Valor > R$ ${a.trigger_valor_acumulado_gt.toLocaleString('pt-BR')}`);
  if (a.trigger_meses_inscrito_gt != null) chips.push(`Meses > ${a.trigger_meses_inscrito_gt}`);
  if (a.trigger_status_assinatura) chips.push(`Status: ${a.trigger_status_assinatura}`);
  if (a.trigger_manual) chips.push('Manual');
  if (chips.length === 0) return <span className="text-[11px] text-slate-400 italic">Nenhum gatilho</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {chips.map(c => (
        <span key={c} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-medium">{c}</span>
      ))}
    </div>
  );
}

function AcaoChips({ a, grupos, descontos }: { a: ErpAtividadeCliente; grupos: ErpGrupoCliente[]; descontos: ErpDesconto[] }) {
  const chips: string[] = [];
  if (a.acao_add_agenda) chips.push('Criar compromisso');
  if (a.acao_add_grupo_id) {
    const g = grupos.find(x => x.id === a.acao_add_grupo_id);
    chips.push(`Grupo: ${g?.nome ?? '—'}`);
  }
  if (a.acao_aplicar_desconto_id) {
    const d = descontos.find(x => x.id === a.acao_aplicar_desconto_id);
    chips.push(`Desconto: ${d?.nome ?? '—'}`);
  }
  if (a.acao_modificar_valor_pct != null) chips.push(`Modificar ${a.acao_modificar_valor_pct}%`);
  if (a.acao_notificacao_texto) chips.push('Notificação');
  if (chips.length === 0) return <span className="text-[11px] text-slate-400 italic">Nenhuma ação</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {chips.map(c => (
        <span key={c} className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-medium">{c}</span>
      ))}
    </div>
  );
}

// ── Modal criar/editar ─────────────────────────────────────────────────────────
export function AtividadeModal({
  editItem,
  grupos,
  descontos,
  onClose,
  onSaved,
  onSavedItem,
  showToast,
}: {
  editItem: ErpAtividadeCliente | null;
  grupos: ErpGrupoCliente[];
  descontos: ErpDesconto[];
  onClose: () => void;
  onSaved: () => void;
  onSavedItem?: (item: ErpAtividadeCliente) => void;
  showToast: (msg: string, ok: boolean) => void;
}) {
  const [form, setForm] = useState<AtividadeForm>(
    editItem
      ? { ...editItem }
      : EMPTY_FORM,
  );
  const [saving, setSaving] = useState(false);
  const [expandTrigger, setExpandTrigger] = useState(true);
  const [expandAcao, setExpandAcao] = useState(true);

  function set<K extends keyof AtividadeForm>(key: K, val: AtividadeForm[K]) {
    setForm(p => ({ ...p, [key]: val }));
  }

  async function handleSave() {
    if (!form.titulo.trim()) return showToast('Título é obrigatório.', false);
    const hasTrigger =
      form.trigger_valor_acumulado_gt != null ||
      form.trigger_meses_inscrito_gt != null ||
      form.trigger_status_assinatura != null ||
      form.trigger_manual;
    if (!hasTrigger) return showToast('Configure ao menos um gatilho.', false);
    setSaving(true);
    try {
      if (editItem) {
        await updateAtividadeCliente(editItem.id, form);
        showToast('Atividade atualizada.', true);
        onSaved();
      } else {
        const result = await createAtividadeCliente(form);
        showToast('Automação de atividade criada.', true);
        onSavedItem?.(result);
        onSaved();
      }
      onClose();
    } catch (e) {
      showToast('Erro: ' + (e as Error).message, false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <h2 className="text-base font-bold text-slate-900">
            {editItem ? 'Editar Atividade' : 'Nova Atividade'}
          </h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-slate-700" /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
          {/* Informações básicas */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Título *</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                placeholder="Ex: Bônus de Fidelidade 12 meses"
                value={form.titulo}
                onChange={e => set('titulo', e.target.value)}
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Descrição</label>
              <textarea
                rows={2}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
                placeholder="Descrição opcional..."
                value={form.descricao ?? ''}
                onChange={e => set('descricao', e.target.value || null)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
                <select
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
                  value={form.tipo}
                  onChange={e => set('tipo', e.target.value as TipoAtividade)}
                >
                  <option value="operacional">Operacional</option>
                  <option value="financeira">Financeira</option>
                  <option value="desconto">Desconto</option>
                  <option value="notificacao">Notificação</option>
                </select>
              </div>
              <div className="flex flex-col justify-end">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => set('ativo', !form.ativo)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.ativo ? 'bg-slate-800' : 'bg-slate-200'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow ${form.ativo ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                  <span className="text-sm text-slate-700">Atividade ativa</span>
                </div>
              </div>
            </div>
          </div>

          {/* Seção Gatilhos */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setExpandTrigger(p => !p)}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" /> Gatilhos
                <span className="text-[10px] text-red-500 font-normal ml-1">(ao menos um obrigatório)</span>
              </span>
              {expandTrigger ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {expandTrigger && (
              <div className="p-4 space-y-3 bg-white">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Valor acumulado maior que R$</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                      placeholder="Opcional"
                      value={form.trigger_valor_acumulado_gt ?? ''}
                      onChange={e => set('trigger_valor_acumulado_gt', e.target.value ? +e.target.value : null)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Meses inscrito maior que</label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                      placeholder="Opcional"
                      value={form.trigger_meses_inscrito_gt ?? ''}
                      onChange={e => set('trigger_meses_inscrito_gt', e.target.value ? +e.target.value : null)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Status da assinatura mudou para</label>
                  <select
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
                    value={form.trigger_status_assinatura ?? ''}
                    onChange={e => set('trigger_status_assinatura', e.target.value || null)}
                  >
                    <option value="">— Não usar —</option>
                    <option value="ativa">Ativa</option>
                    <option value="pausada">Pausada</option>
                    <option value="cancelada">Cancelada</option>
                    <option value="encerrada">Encerrada</option>
                  </select>
                </div>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-slate-800"
                    checked={form.trigger_manual}
                    onChange={e => set('trigger_manual', e.target.checked)}
                  />
                  <span className="text-sm text-slate-700">Pode ser executada manualmente</span>
                </label>
              </div>
            )}
          </div>

          {/* Seção Ações */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setExpandAcao(p => !p)}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-blue-500" /> Ações
              </span>
              {expandAcao ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {expandAcao && (
              <div className="p-4 space-y-4 bg-white">
                {/* Criar compromisso */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-slate-800"
                      checked={form.acao_add_agenda}
                      onChange={e => {
                        set('acao_add_agenda', e.target.checked);
                        if (!e.target.checked) set('acao_agenda_responsavel_id', null);
                      }}
                    />
                    <span className="text-sm text-slate-700 font-medium">Criar compromisso na agenda</span>
                  </label>
                  {form.acao_add_agenda && (
                    <div className="ml-7">
                      <label className="block text-xs font-medium text-slate-500 mb-1">ID do responsável</label>
                      <input
                        className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                        placeholder="UUID do colaborador responsável"
                        value={form.acao_agenda_responsavel_id ?? ''}
                        onChange={e => set('acao_agenda_responsavel_id', e.target.value || null)}
                      />
                    </div>
                  )}
                </div>

                {/* Adicionar a grupo */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Adicionar a grupo de clientes</label>
                  <select
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
                    value={form.acao_add_grupo_id ?? ''}
                    onChange={e => set('acao_add_grupo_id', e.target.value || null)}
                  >
                    <option value="">— Não usar —</option>
                    {grupos.map(g => (
                      <option key={g.id} value={g.id}>{g.nome}</option>
                    ))}
                  </select>
                </div>

                {/* Aplicar desconto */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Aplicar desconto</label>
                  <select
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
                    value={form.acao_aplicar_desconto_id ?? ''}
                    onChange={e => set('acao_aplicar_desconto_id', e.target.value || null)}
                  >
                    <option value="">— Não usar —</option>
                    {descontos.filter(d => d.ativo).map(d => (
                      <option key={d.id} value={d.id}>{d.nome} ({d.valor_pct}%)</option>
                    ))}
                  </select>
                </div>

                {/* Modificar valor */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Modificar valor mensal em %</label>
                  <input
                    type="number"
                    step={0.01}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                    placeholder="Ex: -10 para reduzir 10%, +5 para aumentar 5%"
                    value={form.acao_modificar_valor_pct ?? ''}
                    onChange={e => set('acao_modificar_valor_pct', e.target.value ? +e.target.value : null)}
                  />
                </div>

                {/* Texto de notificação */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Texto da notificação</label>
                  <textarea
                    rows={2}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
                    placeholder="Mensagem que será enviada ao cliente (opcional)"
                    value={form.acao_notificacao_texto ?? ''}
                    onChange={e => set('acao_notificacao_texto', e.target.value || null)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-6 pb-5 shrink-0 border-t border-slate-100 pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {editItem ? 'Salvar Alterações' : 'Criar Automação de Atividade'}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function AtividadesClientes() {
  const [atividades, setAtividades] = useState<ErpAtividadeCliente[]>([]);
  const [grupos, setGrupos] = useState<ErpGrupoCliente[]>([]);
  const [descontos, setDescontos] = useState<ErpDesconto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<FilterTab>('todos');
  const [modal, setModal] = useState<{ open: boolean; editItem: ErpAtividadeCliente | null }>({ open: false, editItem: null });
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ErpAtividadeCliente | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [ats, grps, descs] = await Promise.all([
        getAtividadesClientes(),
        getGruposClientes(),
        getDescontos(),
      ]);
      setAtividades(ats);
      setGrupos(grps);
      setDescontos(descs);
    } catch (e) {
      showToast('Erro ao carregar dados: ' + (e as Error).message, false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleToggleAtivo(a: ErpAtividadeCliente) {
    setTogglingId(a.id);
    try {
      await updateAtividadeCliente(a.id, { ativo: !a.ativo });
      setAtividades(prev => prev.map(x => x.id === a.id ? { ...x, ativo: !x.ativo } : x));
    } catch (e) {
      showToast('Erro: ' + (e as Error).message, false);
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteAtividadeCliente(confirmDelete.id);
      showToast('Atividade excluída.', true);
      setConfirmDelete(null);
      load();
    } catch (e) {
      showToast('Erro: ' + (e as Error).message, false);
    } finally {
      setDeleting(false);
    }
  }

  const filtered = atividades.filter(a => filterTab === 'todos' || a.tipo === filterTab);

  return (
    <div className="h-full flex flex-col overflow-hidden" translate="no">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-slate-900">Atividades de Clientes</h1>
            <p className="text-xs text-slate-400 mt-0.5">Automações baseadas em gatilhos para os clientes</p>
          </div>
          <button
            onClick={() => setModal({ open: true, editItem: null })}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Nova Automação de Atividade
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 bg-white shrink-0 px-6">
        <div className="flex">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id)}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${filterTab === tab.id ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              {tab.label}
              {tab.id !== 'todos' && (
                <span className="ml-1.5 text-[10px] bg-slate-100 text-slate-500 rounded-full px-1.5 py-0.5 font-normal">
                  {atividades.filter(a => a.tipo === tab.id).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Zap className="w-12 h-12 text-slate-200 mb-3" />
            <p className="font-semibold text-slate-400">Nenhuma atividade encontrada</p>
            <p className="text-sm text-slate-300 mt-1">
              {filterTab === 'todos' ? 'Clique em "Nova Atividade" para criar uma automação.' : `Sem atividades do tipo "${TIPO_CONFIG[filterTab as TipoAtividade]?.label ?? filterTab}".`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(a => {
              const tc = TIPO_CONFIG[a.tipo];
              return (
                <div key={a.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors">
                  {/* Cabeçalho */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-bold text-slate-800 text-sm">{a.titulo}</p>
                        <span className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${tc.bg} ${tc.color}`}>
                          {tc.icon}{tc.label}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${a.ativo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                          {a.ativo ? 'Ativa' : 'Inativa'}
                        </span>
                      </div>
                      {a.descricao && <p className="text-xs text-slate-400">{a.descricao}</p>}
                    </div>

                    {/* Ações do card */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleToggleAtivo(a)}
                        disabled={togglingId === a.id}
                        title={a.ativo ? 'Desativar' : 'Ativar'}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors disabled:opacity-40"
                      >
                        {togglingId === a.id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : a.ativo
                            ? <ToggleRight className="w-4 h-4 text-green-600" />
                            : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => setModal({ open: true, editItem: a })}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(a)}
                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Gatilhos e Ações */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100">
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-400" /> Gatilhos
                      </p>
                      <TriggerChips a={a} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Activity className="w-3 h-3 text-blue-400" /> Ações
                      </p>
                      <AcaoChips a={a} grupos={grupos} descontos={descontos} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal criar/editar */}
      {modal.open && (
        <AtividadeModal
          editItem={modal.editItem}
          grupos={grupos}
          descontos={descontos}
          onClose={() => setModal({ open: false, editItem: null })}
          onSaved={load}
          showToast={showToast}
        />
      )}

      {/* Modal de confirmação de exclusão */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-bold text-slate-900 mb-2">Confirmar exclusão</h3>
            <p className="text-sm text-slate-500 mb-5">
              Tem certeza que deseja excluir a atividade <strong className="text-slate-800">"{confirmDelete.titulo}"</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Excluir
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="flex-1 py-2 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
