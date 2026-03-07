import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, X, Loader2, CheckCircle, AlertCircle, Activity } from 'lucide-react';
import { getAtividades, createAtividade, updateAtividadeStatus } from '../../../lib/erp';
import type { ErpAtividade } from '../../../lib/erp';

const PRIORIDADE_BADGE: Record<string, string> = {
  BAIXA: 'bg-slate-100 text-slate-500',
  MEDIA: 'bg-blue-100 text-blue-700',
  ALTA: 'bg-amber-100 text-amber-700',
  CRITICA: 'bg-red-100 text-red-700',
};

const STATUS_BADGE: Record<string, string> = {
  PENDENTE: 'bg-slate-100 text-slate-600',
  EM_ANDAMENTO: 'bg-blue-100 text-blue-700',
  CONCLUIDA: 'bg-green-100 text-green-700',
  CANCELADA: 'bg-red-100 text-red-600',
};

const MODULOS = ['ERP', 'RH', 'LOGISTICA', 'CRM', 'PLANEJAMENTO'];

export default function GestaoAtividades() {
  const [atividades, setAtividades] = useState<ErpAtividade[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [moduloFiltro, setModuloFiltro] = useState('');
  const [statusFiltro, setStatusFiltro] = useState('');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Form
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [modulo, setModulo] = useState('ERP');
  const [submodulo, setSubmodulo] = useState('');
  const [prioridade, setPrioridade] = useState<'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA'>('MEDIA');
  const [dataPrazo, setDataPrazo] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setAtividades(await getAtividades(moduloFiltro || undefined));
    } finally { setLoading(false); }
  }, [moduloFiltro]);

  useEffect(() => { load(); }, [load]);

  function showToast(msg: string, ok: boolean) { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); }

  async function handleSave() {
    if (!titulo) return showToast('Título obrigatório.', false);
    setSaving(true);
    try {
      await createAtividade({
        titulo, descricao: descricao || null, modulo_destino: modulo, submodulo_destino: submodulo || null,
        prioridade, status: 'PENDENTE', responsavel_id: null,
        criado_por: '00000000-0000-0000-0000-000000000001',
        data_prazo: dataPrazo || null, data_conclusao: null, referencia_id: null,
      });
      showToast('Atividade criada.', true);
      setShowForm(false); setTitulo(''); setDescricao(''); setSubmodulo(''); setDataPrazo('');
      load();
    } catch (e) { showToast('Erro: ' + (e as Error).message, false); }
    finally { setSaving(false); }
  }

  async function handleStatus(id: string, status: ErpAtividade['status']) {
    try { await updateAtividadeStatus(id, status); load(); }
    catch (e) { showToast('Erro: ' + (e as Error).message, false); }
  }

  const filtered = atividades.filter(a => {
    if (search && !a.titulo.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFiltro && a.status !== statusFiltro) return false;
    return true;
  });

  const resumo = {
    pendentes: atividades.filter(a => a.status === 'PENDENTE').length,
    em_andamento: atividades.filter(a => a.status === 'EM_ANDAMENTO').length,
    concluidas: atividades.filter(a => a.status === 'CONCLUIDA').length,
  };

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
          <h1 className="text-xl font-bold text-slate-900">Gestão de Atividades</h1>
          <p className="text-sm text-slate-500">Central integrada de atividades de todos os módulos</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Nova Atividade
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
            <Activity className="w-5 h-5 text-slate-500" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-700">{resumo.pendentes}</div>
            <div className="text-xs text-slate-500">Pendentes</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-blue-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Activity className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="text-xl font-bold text-blue-600">{resumo.em_andamento}</div>
            <div className="text-xs text-slate-500">Em Andamento</div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-green-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <div className="text-xl font-bold text-green-600">{resumo.concluidas}</div>
            <div className="text-xs text-slate-500">Concluídas</div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            placeholder="Buscar atividade..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          value={moduloFiltro} onChange={e => setModuloFiltro(e.target.value)}>
          <option value="">Todos os módulos</option>
          {MODULOS.map(m => <option key={m}>{m}</option>)}
        </select>
        <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="PENDENTE">Pendente</option>
          <option value="EM_ANDAMENTO">Em Andamento</option>
          <option value="CONCLUIDA">Concluída</option>
          <option value="CANCELADA">Cancelada</option>
        </select>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="w-10 h-10 text-slate-200 mx-auto mb-2" />
            <p className="text-slate-400">Nenhuma atividade encontrada.</p>
          </div>
        ) : filtered.map(a => (
          <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:border-violet-200 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORIDADE_BADGE[a.prioridade]}`}>{a.prioridade}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[a.status]}`}>{a.status.replace('_', ' ')}</span>
                  <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium">{a.modulo_destino}</span>
                  {a.submodulo_destino && (
                    <span className="text-xs text-slate-500">{a.submodulo_destino}</span>
                  )}
                </div>
                <h3 className="font-semibold text-slate-800">{a.titulo}</h3>
                {a.descricao && <p className="text-sm text-slate-600 mt-1 line-clamp-2">{a.descricao}</p>}
                {a.data_prazo && (
                  <p className="text-xs text-slate-400 mt-1">
                    Prazo: {new Date(a.data_prazo + 'T00:00').toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {a.status === 'PENDENTE' && (
                  <button onClick={() => handleStatus(a.id, 'EM_ANDAMENTO')}
                    className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors">Iniciar</button>
                )}
                {a.status === 'EM_ANDAMENTO' && (
                  <button onClick={() => handleStatus(a.id, 'CONCLUIDA')}
                    className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors">Concluir</button>
                )}
                {a.status !== 'CANCELADA' && a.status !== 'CONCLUIDA' && (
                  <button onClick={() => handleStatus(a.id, 'CANCELADA')}
                    className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors">Cancelar</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">Nova Atividade</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Título *</label>
                <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  value={titulo} onChange={e => setTitulo(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Módulo</label>
                  <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    value={modulo} onChange={e => setModulo(e.target.value)}>
                    {MODULOS.map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Submódulo</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    value={submodulo} onChange={e => setSubmodulo(e.target.value)} placeholder="Opcional" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Prioridade</label>
                  <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    value={prioridade} onChange={e => setPrioridade(e.target.value as 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA')}>
                    <option value="BAIXA">Baixa</option>
                    <option value="MEDIA">Média</option>
                    <option value="ALTA">Alta</option>
                    <option value="CRITICA">Crítica</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Data Prazo</label>
                  <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    value={dataPrazo} onChange={e => setDataPrazo(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Descrição</label>
                <textarea rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                  value={descricao} onChange={e => setDescricao(e.target.value)} />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600">Cancelar</button>
                <button onClick={handleSave} disabled={saving || !titulo}
                  className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm font-medium">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />} Criar Atividade
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
