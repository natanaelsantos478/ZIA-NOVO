// ─────────────────────────────────────────────────────────────────────────────
// TiposOperacao.tsx — CRUD de Tipos de Operação (erp_tipos_operacao)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import {
  Plus, Pencil, Trash2, X, CheckCircle, AlertCircle,
  Loader2, Settings2, ToggleLeft, ToggleRight,
} from 'lucide-react';
import {
  getAllTiposOperacao, upsertTipoOperacao, deleteTipoOperacao,
  CATEGORIA_LABEL, SUBTIPO_LABEL,
  type TipoOperacao, type CategoriaOperacao, type SubtipoOperacao, type DirecaoEstoque,
} from '../../../lib/faturamento';

const CATEGORIAS: CategoriaOperacao[] = ['VENDA','COMPRA','EMPRESTIMO','TRANSFERENCIA','AJUSTE','DEVOLUCAO'];
const SUBTIPOS: SubtipoOperacao[] = ['PRONTA_ENTREGA','FUTURA_DATA','FUTURA_ESTOQUE','EMPRESTIMO'];
const DIRECOES: { value: DirecaoEstoque; label: string }[] = [
  { value: 'ENTRADA', label: 'Entrada' },
  { value: 'SAIDA',   label: 'Saída'   },
  { value: 'NENHUM',  label: 'Nenhum'  },
];

const CATEGORIA_BG: Record<CategoriaOperacao, string> = {
  VENDA:         'bg-purple-100 text-purple-700',
  COMPRA:        'bg-blue-100 text-blue-700',
  EMPRESTIMO:    'bg-amber-100 text-amber-700',
  TRANSFERENCIA: 'bg-cyan-100 text-cyan-700',
  AJUSTE:        'bg-slate-100 text-slate-600',
  DEVOLUCAO:     'bg-red-100 text-red-600',
};

const EMPTY: Omit<TipoOperacao, 'id' | 'tenant_id' | 'created_at'> = {
  codigo:                    '',
  nome:                      '',
  categoria:                 'VENDA',
  subtipo:                   'PRONTA_ENTREGA',
  direcao_estoque:           'SAIDA',
  exige_estoque:             true,
  gera_financeiro:           true,
  ativo:                     true,
  movimenta_estoque:         true,
  reserva_estoque:           false,
  bloqueia_estoque:          false,
  permite_faturamento_parcial: false,
};

export default function TiposOperacao() {
  const [items, setItems] = useState<TipoOperacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [modal, setModal] = useState<{ open: boolean; editing: TipoOperacao | null }>({ open: false, editing: null });
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => {
    getAllTiposOperacao().then(setItems).finally(() => setLoading(false));
  }, []);

  function openNew() {
    setForm(EMPTY);
    setModal({ open: true, editing: null });
  }

  function openEdit(t: TipoOperacao) {
    setForm({
      codigo:                    t.codigo,
      nome:                      t.nome,
      categoria:                 t.categoria,
      subtipo:                   t.subtipo,
      direcao_estoque:           t.direcao_estoque,
      exige_estoque:             t.exige_estoque,
      gera_financeiro:           t.gera_financeiro,
      ativo:                     t.ativo,
      movimenta_estoque:         t.movimenta_estoque ?? true,
      reserva_estoque:           t.reserva_estoque ?? false,
      bloqueia_estoque:          t.bloqueia_estoque ?? false,
      permite_faturamento_parcial: t.permite_faturamento_parcial ?? false,
    });
    setModal({ open: true, editing: t });
  }

  async function handleSave() {
    if (!form.codigo.trim() || !form.nome.trim()) {
      showToast('Preencha Código e Nome.', false); return;
    }
    setSaving(true);
    try {
      const payload = modal.editing ? { ...form, id: modal.editing.id } : form;
      const saved = await upsertTipoOperacao(payload);
      if (modal.editing) {
        setItems(prev => prev.map(i => i.id === saved.id ? saved : i));
      } else {
        setItems(prev => [...prev, saved]);
      }
      setModal({ open: false, editing: null });
      showToast(`Tipo "${saved.nome}" salvo.`, true);
    } catch (e) {
      showToast('Erro: ' + (e as Error).message, false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, nome: string) {
    if (!confirm(`Excluir "${nome}"?`)) return;
    setDeleting(id);
    try {
      await deleteTipoOperacao(id);
      setItems(prev => prev.filter(i => i.id !== id));
      showToast('Excluído.', true);
    } catch (e) {
      showToast('Erro: ' + (e as Error).message, false);
    } finally {
      setDeleting(null); }
  }

  async function toggleAtivo(t: TipoOperacao) {
    try {
      const updated = await upsertTipoOperacao({ ...t, ativo: !t.ativo });
      setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
    } catch (e) {
      showToast('Erro: ' + (e as Error).message, false);
    }
  }

  return (
    <div className="p-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white max-w-sm ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-emerald-600" />
          <div>
            <h1 className="text-xl font-bold text-slate-900">Tipos de Operação</h1>
            <p className="text-sm text-slate-500">Configure os tipos de operação disponíveis no Faturamento</p>
          </div>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Novo Tipo
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase w-20">Código</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Nome</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Categoria</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Subtipo</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Direção</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Exige Est.</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Fin.</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Ativo</th>
              <th className="px-4 py-3 w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={9} className="text-center py-12">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-300" />
              </td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-12">
                <Settings2 className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                <p className="text-slate-400">Nenhum tipo cadastrado ainda.</p>
                <button onClick={openNew} className="mt-2 text-emerald-600 text-sm hover:underline">
                  Criar primeiro tipo
                </button>
              </td></tr>
            ) : items.map(t => (
              <tr key={t.id} className={`hover:bg-slate-50 transition-colors ${!t.ativo ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3 font-mono text-slate-600 font-medium">{t.codigo}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{t.nome}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORIA_BG[t.categoria]}`}>
                    {CATEGORIA_LABEL[t.categoria]}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600 hidden md:table-cell text-xs">{SUBTIPO_LABEL[t.subtipo]}</td>
                <td className="px-4 py-3 text-center text-xs text-slate-600 hidden lg:table-cell">{t.direcao_estoque}</td>
                <td className="px-4 py-3 text-center hidden lg:table-cell">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${t.exige_estoque ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {t.exige_estoque ? 'Sim' : 'Não'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center hidden lg:table-cell">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${t.gera_financeiro ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                    {t.gera_financeiro ? 'Sim' : 'Não'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => toggleAtivo(t)}>
                    {t.ativo
                      ? <ToggleRight className="w-5 h-5 text-emerald-500 mx-auto" />
                      : <ToggleLeft className="w-5 h-5 text-slate-300 mx-auto" />}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button onClick={() => openEdit(t)} className="text-slate-400 hover:text-slate-700 transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(t.id, t.nome)}
                      disabled={deleting === t.id}
                      className="text-slate-300 hover:text-red-500 disabled:opacity-50 transition-colors"
                    >
                      {deleting === t.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModal({ open: false, editing: null })} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h2 className="font-bold text-slate-800">
                {modal.editing ? 'Editar Tipo de Operação' : 'Novo Tipo de Operação'}
              </h2>
              <button onClick={() => setModal({ open: false, editing: null })} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 custom-scrollbar">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Código *</label>
                  <input
                    type="text"
                    value={form.codigo}
                    onChange={e => setForm(f => ({ ...f, codigo: e.target.value.toUpperCase() }))}
                    maxLength={10}
                    placeholder="Ex: VND01"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Nome *</label>
                  <input
                    type="text"
                    value={form.nome}
                    onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                    placeholder="Ex: Venda Pronta Entrega"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Categoria</label>
                  <select
                    value={form.categoria}
                    onChange={e => setForm(f => ({ ...f, categoria: e.target.value as CategoriaOperacao }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    {CATEGORIAS.map(c => <option key={c} value={c}>{CATEGORIA_LABEL[c]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Subtipo</label>
                  <select
                    value={form.subtipo}
                    onChange={e => setForm(f => ({ ...f, subtipo: e.target.value as SubtipoOperacao }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    {SUBTIPOS.map(s => <option key={s} value={s}>{SUBTIPO_LABEL[s]}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Direção de Estoque</label>
                <div className="flex gap-2">
                  {DIRECOES.map(d => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, direcao_estoque: d.value }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                        form.direcao_estoque === d.value
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'border-slate-200 text-slate-600 hover:border-emerald-400'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {([
                  { key: 'exige_estoque',  label: 'Exige Estoque'    },
                  { key: 'gera_financeiro', label: 'Gera Financeiro' },
                  { key: 'ativo',           label: 'Ativo'           },
                ] as const).map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-slate-200 hover:border-emerald-400 transition-colors">
                    <input
                      type="checkbox"
                      checked={form[key]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                      className="rounded accent-emerald-600"
                    />
                    <span className="text-xs text-slate-700 font-medium">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-200">
              <button
                onClick={() => setModal({ open: false, editing: null })}
                className="px-4 py-2 text-sm border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl font-medium"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
