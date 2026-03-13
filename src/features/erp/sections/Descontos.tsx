import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, X, Loader2, CheckCircle, AlertCircle,
  Percent, Save, Edit2, Tag,
} from 'lucide-react';
import {
  getDescontos, createDesconto, updateDesconto, deleteDesconto,
  type ErpDesconto,
} from '../../../lib/erp';

// ── Helpers ───────────────────────────────────────────────────────────────────
type AplicaA = ErpDesconto['aplica_a'];

const APLICA_CONFIG: Record<AplicaA, { label: string; bg: string; color: string }> = {
  produto:     { label: 'Produto',     bg: 'bg-blue-100',    color: 'text-blue-700'   },
  grupo:       { label: 'Grupo',       bg: 'bg-purple-100',  color: 'text-purple-700' },
  assinatura:  { label: 'Assinatura',  bg: 'bg-emerald-100', color: 'text-emerald-700'},
};

type FilterTab = 'todos' | AplicaA;

const TABS: { id: FilterTab; label: string }[] = [
  { id: 'todos',      label: 'Todos'      },
  { id: 'produto',    label: 'Produto'    },
  { id: 'grupo',      label: 'Grupo'      },
  { id: 'assinatura', label: 'Assinatura' },
];

type DescontoForm = {
  nome: string;
  valor_pct: number;
  aplica_a: AplicaA;
  ativo: boolean;
};

const EMPTY_FORM: DescontoForm = {
  nome: '',
  valor_pct: 0,
  aplica_a: 'produto',
  ativo: true,
};

// ── Modal de criação / edição ─────────────────────────────────────────────────
function DescontoModal({
  editItem,
  onClose,
  onSaved,
  showToast,
}: {
  editItem: ErpDesconto | null;
  onClose: () => void;
  onSaved: () => void;
  showToast: (msg: string, ok: boolean) => void;
}) {
  const [form, setForm] = useState<DescontoForm>(
    editItem
      ? { nome: editItem.nome, valor_pct: editItem.valor_pct, aplica_a: editItem.aplica_a, ativo: editItem.ativo }
      : EMPTY_FORM,
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.nome.trim()) return showToast('Nome é obrigatório.', false);
    if (form.valor_pct < 0 || form.valor_pct > 100) return showToast('Percentual deve estar entre 0 e 100.', false);
    setSaving(true);
    try {
      if (editItem) {
        await updateDesconto(editItem.id, { nome: form.nome, valor_pct: form.valor_pct, aplica_a: form.aplica_a, ativo: form.ativo });
        showToast('Desconto atualizado.', true);
      } else {
        await createDesconto({ nome: form.nome, valor_pct: form.valor_pct, aplica_a: form.aplica_a, ativo: form.ativo, referencia_id: null });
        showToast('Desconto criado.', true);
      }
      onSaved();
      onClose();
    } catch (e) {
      showToast('Erro: ' + (e as Error).message, false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">
            {editItem ? 'Editar Desconto' : 'Novo Desconto'}
          </h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-slate-700" /></button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nome *</label>
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="Ex: Desconto VIP 15%"
              value={form.nome}
              onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Valor (%) *</label>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                step={0.01}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 pr-8"
                value={form.valor_pct}
                onChange={e => setForm(p => ({ ...p, valor_pct: Math.min(100, Math.max(0, +e.target.value)) }))}
              />
              <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Aplica a</label>
            <select
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
              value={form.aplica_a}
              onChange={e => setForm(p => ({ ...p, aplica_a: e.target.value as AplicaA }))}
            >
              <option value="produto">Produto</option>
              <option value="grupo">Grupo</option>
              <option value="assinatura">Assinatura</option>
            </select>
          </div>

          <div className="flex items-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setForm(p => ({ ...p, ativo: !p.ativo }))}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.ativo ? 'bg-slate-800' : 'bg-slate-200'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow ${form.ativo ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
            <span className="text-sm text-slate-700">Desconto ativo</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {editItem ? 'Salvar Alterações' : 'Criar Desconto'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function Descontos() {
  const [descontos, setDescontos] = useState<ErpDesconto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<FilterTab>('todos');
  const [modal, setModal] = useState<{ open: boolean; editItem: ErpDesconto | null }>({ open: false, editItem: null });
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ErpDesconto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setDescontos(await getDescontos());
    } catch (e) {
      showToast('Erro ao carregar descontos: ' + (e as Error).message, false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteDesconto(confirmDelete.id);
      showToast('Desconto excluído.', true);
      setConfirmDelete(null);
      load();
    } catch (e) {
      showToast('Erro: ' + (e as Error).message, false);
    } finally {
      setDeleting(false);
    }
  }

  const filtered = descontos.filter(d => filterTab === 'todos' || d.aplica_a === filterTab);

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
            <h1 className="text-base font-bold text-slate-900">Descontos</h1>
            <p className="text-xs text-slate-400 mt-0.5">Gerencie os descontos disponíveis na plataforma</p>
          </div>
          <button
            onClick={() => setModal({ open: true, editItem: null })}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Novo Desconto
          </button>
        </div>
      </div>

      {/* Tabs de filtro */}
      <div className="border-b border-slate-200 bg-white shrink-0 px-6">
        <div className="flex">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id)}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${filterTab === tab.id ? 'border-slate-800 text-slate-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              {tab.label}
              {tab.id !== 'todos' && (
                <span className="ml-1.5 text-[10px] bg-slate-100 text-slate-500 rounded-full px-1.5 py-0.5 font-normal">
                  {descontos.filter(d => d.aplica_a === tab.id).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Tag className="w-12 h-12 text-slate-200 mb-3" />
            <p className="font-semibold text-slate-400">Nenhum desconto encontrado</p>
            <p className="text-sm text-slate-300 mt-1">
              {filterTab === 'todos' ? 'Clique em "Novo Desconto" para começar.' : `Nenhum desconto do tipo "${APLICA_CONFIG[filterTab as AplicaA]?.label ?? filterTab}".`}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map(d => {
              const ac = APLICA_CONFIG[d.aplica_a];
              return (
                <div key={d.id} className="bg-white border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-colors flex flex-col gap-3">
                  {/* Cabeçalho do card */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-800 text-sm truncate">{d.nome}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${ac.bg} ${ac.color}`}>
                          {ac.label}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${d.ativo ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                          {d.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </div>
                    {/* Valor em destaque */}
                    <div className="shrink-0 flex flex-col items-end">
                      <span className="text-2xl font-extrabold text-slate-800 leading-none">{d.valor_pct}%</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">de desconto</span>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex gap-2 pt-1 border-t border-slate-100">
                    <button
                      onClick={() => setModal({ open: true, editItem: d })}
                      className="flex-1 flex items-center justify-center gap-1 text-xs text-slate-600 border border-slate-200 hover:border-slate-400 hover:bg-slate-50 py-1.5 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Editar
                    </button>
                    <button
                      onClick={() => setConfirmDelete(d)}
                      className="flex-1 flex items-center justify-center gap-1 text-xs text-red-500 border border-red-100 hover:border-red-300 hover:bg-red-50 py-1.5 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Excluir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal criar/editar */}
      {modal.open && (
        <DescontoModal
          editItem={modal.editItem}
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
              Tem certeza que deseja excluir o desconto <strong className="text-slate-800">"{confirmDelete.nome}"</strong>? Esta ação não pode ser desfeita.
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
