import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit2, X, Loader2, CheckCircle, AlertCircle, FolderKanban } from 'lucide-react';
import { getProjetos, createProjeto, updateProjeto, getGruposProjetos } from '../../../lib/erp';
import type { ErpProjeto, ErpGrupoProjeto } from '../../../lib/erp';

const STATUS_BADGE: Record<string, string> = {
  PLANEJAMENTO: 'bg-slate-100 text-slate-600',
  EM_ANDAMENTO: 'bg-blue-100 text-blue-700',
  PAUSADO: 'bg-amber-100 text-amber-700',
  CONCLUIDO: 'bg-green-100 text-green-700',
  CANCELADO: 'bg-red-100 text-red-600',
};

const STATUS_LIST = ['PLANEJAMENTO', 'EM_ANDAMENTO', 'PAUSADO', 'CONCLUIDO', 'CANCELADO'];

export default function Projetos() {
  const [projetos, setProjetos] = useState<ErpProjeto[]>([]);
  const [grupos, setGrupos] = useState<ErpGrupoProjeto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Form
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [grupoId, setGrupoId] = useState('');
  const [status, setStatus] = useState<ErpProjeto['status']>('PLANEJAMENTO');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFimPrevista, setDataFimPrevista] = useState('');
  const [orcamentoPrevisto, setOrcamentoPrevisto] = useState('');
  const [progresso, setProgresso] = useState('0');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [p, g] = await Promise.all([getProjetos(), getGruposProjetos()]);
      setProjetos(p); setGrupos(g);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function showToast(msg: string, ok: boolean) { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); }

  function openNew() {
    setNome(''); setDescricao(''); setGrupoId(''); setStatus('PLANEJAMENTO');
    setDataInicio(''); setDataFimPrevista(''); setOrcamentoPrevisto(''); setProgresso('0');
    setEditId(null); setShowForm(true);
  }

  function openEdit(p: ErpProjeto) {
    setNome(p.nome); setDescricao(p.descricao ?? ''); setGrupoId(p.grupo_id ?? '');
    setStatus(p.status); setDataInicio(p.data_inicio ?? ''); setDataFimPrevista(p.data_fim_prevista ?? '');
    setOrcamentoPrevisto(p.orcamento_previsto?.toString() ?? ''); setProgresso(p.progresso_pct.toString());
    setEditId(p.id); setShowForm(true);
  }

  async function handleSave() {
    if (!nome) return showToast('Nome obrigatório.', false);
    setSaving(true);
    try {
      const payload = {
        nome, descricao: descricao || null, grupo_id: grupoId || null, cadeia_id: null,
        status, responsavel_id: null, data_inicio: dataInicio || null,
        data_fim_prevista: dataFimPrevista || null, data_fim_real: null,
        orcamento_previsto: orcamentoPrevisto ? +orcamentoPrevisto : null,
        progresso_pct: +progresso,
      };
      if (editId) await updateProjeto(editId, payload);
      else await createProjeto(payload);
      showToast(editId ? 'Atualizado.' : 'Projeto criado.', true);
      setShowForm(false); load();
    } catch (e) { showToast('Erro: ' + (e as Error).message, false); }
    finally { setSaving(false); }
  }

  const filtered = projetos.filter(p => !search || p.nome.toLowerCase().includes(search.toLowerCase()));

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
          <h1 className="text-xl font-bold text-slate-900">Projetos</h1>
          <p className="text-sm text-slate-500">{projetos.length} projetos cadastrados</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Novo Projeto
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          placeholder="Buscar projeto..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="col-span-2 text-center py-12">
            <FolderKanban className="w-10 h-10 text-slate-200 mx-auto mb-2" />
            <p className="text-slate-400">Nenhum projeto encontrado.</p>
          </div>
        ) : filtered.map(p => (
          <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:border-amber-200 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: p.erp_grupos_projetos?.cor_hex ?? '#94a3b8' }}
                />
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[p.status]}`}>{p.status.replace('_', ' ')}</span>
              </div>
              <button onClick={() => openEdit(p)} className="text-slate-400 hover:text-amber-600 transition-colors">
                <Edit2 className="w-4 h-4" />
              </button>
            </div>

            <h3 className="font-bold text-slate-800 mb-1">{p.nome}</h3>
            {p.descricao && <p className="text-xs text-slate-500 mb-3 line-clamp-2">{p.descricao}</p>}

            {p.erp_grupos_projetos && (
              <p className="text-xs text-slate-400 mb-3">Grupo: {p.erp_grupos_projetos.nome}</p>
            )}

            {/* Progresso */}
            <div className="mb-3">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Progresso</span>
                <span className="font-medium">{p.progresso_pct}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all"
                  style={{ width: `${p.progresso_pct}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{p.data_inicio ? new Date(p.data_inicio + 'T00:00').toLocaleDateString('pt-BR') : '—'}</span>
              <span>→</span>
              <span>{p.data_fim_prevista ? new Date(p.data_fim_prevista + 'T00:00').toLocaleDateString('pt-BR') : '—'}</span>
            </div>
            {p.orcamento_previsto && (
              <p className="text-xs text-slate-400 mt-1">
                Orçamento: {p.orcamento_previsto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            )}
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">{editId ? 'Editar Projeto' : 'Novo Projeto'}</h2>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                  <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    value={status} onChange={e => setStatus(e.target.value as ErpProjeto['status'])}>
                    {STATUS_LIST.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Grupo</label>
                  <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    value={grupoId} onChange={e => setGrupoId(e.target.value)}>
                    <option value="">Sem grupo</option>
                    {grupos.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Data Início</label>
                  <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Data Fim Prevista</label>
                  <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    value={dataFimPrevista} onChange={e => setDataFimPrevista(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Orçamento (R$)</label>
                  <input type="number" min="0" step="0.01" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    value={orcamentoPrevisto} onChange={e => setOrcamentoPrevisto(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Progresso (%)</label>
                  <input type="number" min="0" max="100" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    value={progresso} onChange={e => setProgresso(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-200">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600">Cancelar</button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm font-medium">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editId ? 'Salvar' : 'Criar Projeto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
