import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { getGruposProdutos, createGrupoProduto, updateGrupoProduto, deleteGrupoProduto } from '../../../lib/erp';
import type { ErpGrupoProduto } from '../../../lib/erp';

const EMPTY_FORM = { nome: '', codigo: '', descricao: '' };

export default function CadGruposProdutos() {
  const [grupos, setGrupos] = useState<ErpGrupoProduto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    try { setLoading(true); setGrupos(await getGruposProdutos()); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function showToast(msg: string, ok: boolean) { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); }
  function openNew() { setForm(EMPTY_FORM); setEditId(null); setShowForm(true); }
  function openEdit(g: ErpGrupoProduto) { setForm({ nome: g.nome, codigo: g.codigo, descricao: g.descricao ?? '' }); setEditId(g.id); setShowForm(true); }

  async function handleDelete(id: string) {
    if (!confirm('Excluir grupo?')) return;
    try { await deleteGrupoProduto(id); showToast('Grupo excluído.', true); load(); }
    catch (e) { showToast('Erro: ' + (e as Error).message, false); }
  }

  async function handleSave() {
    if (!form.nome || !form.codigo) return showToast('Nome e código obrigatórios.', false);
    setSaving(true);
    try {
      if (editId) await updateGrupoProduto(editId, { nome: form.nome, codigo: form.codigo, descricao: form.descricao || null });
      else await createGrupoProduto({ nome: form.nome, codigo: form.codigo, descricao: form.descricao || null });
      showToast(editId ? 'Atualizado.' : 'Criado.', true);
      setShowForm(false); load();
    } catch (e) { showToast('Erro: ' + (e as Error).message, false); }
    finally { setSaving(false); }
  }

  return (
    <div className="p-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Grupos de Produtos</h1>
          <p className="text-sm text-slate-500">{grupos.length} grupos cadastrados</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Novo Grupo
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" /></div>
        ) : grupos.length === 0 ? (
          <div className="col-span-3 text-center py-8 text-slate-400">Nenhum grupo cadastrado.</div>
        ) : grupos.map(g => (
          <div key={g.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-200 transition-colors">
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{g.codigo}</span>
              <div className="flex gap-1">
                <button onClick={() => openEdit(g)} className="text-slate-400 hover:text-blue-600 transition-colors p-1"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDelete(g.id)} className="text-slate-400 hover:text-red-600 transition-colors p-1"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <h3 className="font-semibold text-slate-800 text-sm">{g.nome}</h3>
            {g.descricao && <p className="text-xs text-slate-500 mt-1">{g.descricao}</p>}
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">{editId ? 'Editar Grupo' : 'Novo Grupo'}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Código *</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                    value={form.codigo} onChange={e => setForm(p => ({ ...p, codigo: e.target.value.toUpperCase() }))} placeholder="EX: ELET" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Nome *</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Descrição</label>
                <textarea rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600">Cancelar</button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-60">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editId ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
