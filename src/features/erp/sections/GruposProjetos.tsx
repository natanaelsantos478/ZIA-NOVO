import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, X, Loader2, CheckCircle, AlertCircle, Layers } from 'lucide-react';
import { getGruposProjetos, createGrupoProjeto } from '../../../lib/erp';
import { supabase } from '../../../lib/supabase';
import type { ErpGrupoProjeto } from '../../../lib/erp';

const COR_OPTIONS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

export default function GruposProjetos() {
  const [grupos, setGrupos] = useState<ErpGrupoProjeto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [cor, setCor] = useState(COR_OPTIONS[0]);

  const load = useCallback(async () => {
    try { setLoading(true); setGrupos(await getGruposProjetos()); } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function showToast(msg: string, ok: boolean) { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); }

  async function handleDelete(id: string) {
    if (!confirm('Excluir grupo?')) return;
    try {
      const { error } = await supabase.from('erp_grupos_projetos').delete().eq('id', id);
      if (error) throw error;
      showToast('Grupo excluído.', true); load();
    } catch (e) { showToast('Erro: ' + (e as Error).message, false); }
  }

  async function handleSave() {
    if (!nome) return showToast('Nome obrigatório.', false);
    setSaving(true);
    try {
      await createGrupoProjeto({ nome, descricao: descricao || null, cor_hex: cor, lider_id: null });
      showToast('Grupo criado.', true);
      setShowForm(false); setNome(''); setDescricao(''); load();
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
          <h1 className="text-xl font-bold text-slate-900">Grupos de Projetos</h1>
          <p className="text-sm text-slate-500">{grupos.length} grupos cadastrados</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Novo Grupo
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" /></div>
        ) : grupos.length === 0 ? (
          <div className="col-span-3 text-center py-12">
            <Layers className="w-10 h-10 text-slate-200 mx-auto mb-2" />
            <p className="text-slate-400">Nenhum grupo cadastrado.</p>
          </div>
        ) : grupos.map(g => (
          <div key={g.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:border-amber-200 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ backgroundColor: g.cor_hex }} />
              <div className="flex gap-1">
                <button onClick={() => handleDelete(g.id)} className="text-slate-400 hover:text-red-600 transition-colors p-1">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <h3 className="font-bold text-slate-800 mb-1">{g.nome}</h3>
            {g.descricao && <p className="text-xs text-slate-500">{g.descricao}</p>}
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">Novo Grupo de Projetos</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nome *</label>
                <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  value={nome} onChange={e => setNome(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Descrição</label>
                <textarea rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                  value={descricao} onChange={e => setDescricao(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Cor de Identificação</label>
                <div className="flex gap-2 flex-wrap">
                  {COR_OPTIONS.map(c => (
                    <button key={c} onClick={() => setCor(c)}
                      className={`w-8 h-8 rounded-lg transition-all ${cor === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-105'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600">Cancelar</button>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm font-medium">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />} Criar Grupo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
