// Caso — similar ao Atendimento mas tipo=CASO
import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, X, Loader2, CheckCircle, AlertCircle, Briefcase } from 'lucide-react';
import { getAtendimentos, createAtendimento, updateAtendimento, getClientes } from '../../../lib/erp';
import type { ErpAtendimento, ErpCliente } from '../../../lib/erp';

const PRIORIDADE_BADGE: Record<string, string> = {
  BAIXA: 'bg-slate-100 text-slate-600',
  MEDIA: 'bg-blue-100 text-blue-700',
  ALTA: 'bg-amber-100 text-amber-700',
  CRITICA: 'bg-red-100 text-red-700',
};

const STATUS_BADGE: Record<string, string> = {
  ABERTO: 'bg-blue-100 text-blue-700',
  EM_ANDAMENTO: 'bg-amber-100 text-amber-700',
  RESOLVIDO: 'bg-green-100 text-green-700',
  FECHADO: 'bg-slate-100 text-slate-600',
};

export default function Caso() {
  const [casos, setCasos] = useState<ErpAtendimento[]>([]);
  const [clientes, setClientes] = useState<ErpCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Form
  const [clienteId, setClienteId] = useState('');
  const [clienteSearch, setClienteSearch] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [prioridade, setPrioridade] = useState<'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA'>('MEDIA');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [a, c] = await Promise.all([getAtendimentos('CASO'), getClientes()]);
      setCasos(a); setClientes(c);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function showToast(msg: string, ok: boolean) { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); }

  async function handleSave() {
    if (!clienteId || !titulo) return showToast('Cliente e título obrigatórios.', false);
    setSaving(true);
    try {
      await createAtendimento({
        tipo: 'CASO', status: 'ABERTO', cliente_id: clienteId, responsavel_id: null,
        titulo, descricao: descricao || null, prioridade, data_abertura: new Date().toISOString(), data_fechamento: null,
      });
      showToast('Caso criado.', true);
      setShowForm(false); setClienteId(''); setTitulo(''); setDescricao(''); load();
    } catch (e) { showToast('Erro: ' + (e as Error).message, false); }
    finally { setSaving(false); }
  }

  async function handleUpdateStatus(id: string, status: ErpAtendimento['status']) {
    try { await updateAtendimento(id, { status }); load(); }
    catch (e) { showToast('Erro: ' + (e as Error).message, false); }
  }

  const filtered = casos.filter(c =>
    c.titulo.toLowerCase().includes(search.toLowerCase()) ||
    c.erp_clientes?.nome.toLowerCase().includes(search.toLowerCase())
  );

  const clientesFilt = clientes.filter(c => c.nome.toLowerCase().includes(clienteSearch.toLowerCase())).slice(0, 5);

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
          <h1 className="text-xl font-bold text-slate-900">Casos</h1>
          <p className="text-sm text-slate-500">{casos.length} casos registrados</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Novo Caso
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Buscar caso..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="w-10 h-10 text-slate-200 mx-auto mb-2" />
            <p className="text-slate-400">Nenhum caso encontrado.</p>
          </div>
        ) : filtered.map(c => (
          <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-200 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-slate-400 font-mono">#{c.numero}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORIDADE_BADGE[c.prioridade]}`}>{c.prioridade}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[c.status]}`}>{c.status.replace('_', ' ')}</span>
                </div>
                <h3 className="font-semibold text-slate-800">{c.titulo}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{c.erp_clientes?.nome} · {new Date(c.data_abertura).toLocaleDateString('pt-BR')}</p>
                {c.descricao && <p className="text-sm text-slate-600 mt-2 line-clamp-2">{c.descricao}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {c.status === 'ABERTO' && (
                  <button onClick={() => handleUpdateStatus(c.id, 'EM_ANDAMENTO')}
                    className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded hover:bg-amber-200 transition-colors">Iniciar</button>
                )}
                {c.status === 'EM_ANDAMENTO' && (
                  <button onClick={() => handleUpdateStatus(c.id, 'RESOLVIDO')}
                    className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors">Resolver</button>
                )}
                {c.status === 'RESOLVIDO' && (
                  <button onClick={() => handleUpdateStatus(c.id, 'FECHADO')}
                    className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-colors">Fechar</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">Novo Caso</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Cliente *</label>
                {!clienteId ? (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Buscar..." value={clienteSearch} onChange={e => setClienteSearch(e.target.value)} />
                    {clienteSearch && (
                      <div className="absolute top-full left-0 right-0 border border-slate-200 bg-white rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                        {clientesFilt.map(c => (
                          <button key={c.id} onClick={() => { setClienteId(c.id); setClienteSearch(''); }}
                            className="w-full px-3 py-2 hover:bg-slate-50 text-sm text-left border-b border-slate-100 last:border-b-0">{c.nome}</button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                    <span className="text-sm font-medium text-blue-800">{clientes.find(c => c.id === clienteId)?.nome}</span>
                    <button onClick={() => setClienteId('')} className="text-blue-600 text-xs">Alterar</button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Título *</label>
                <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={titulo} onChange={e => setTitulo(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Prioridade</label>
                <div className="flex gap-2">
                  {(['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'] as const).map(p => (
                    <button key={p} onClick={() => setPrioridade(p)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${prioridade === p ? PRIORIDADE_BADGE[p] + ' border-current' : 'border-slate-200 text-slate-600'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Descrição</label>
                <textarea rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  value={descricao} onChange={e => setDescricao(e.target.value)} />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600">Cancelar</button>
                <button onClick={handleSave} disabled={saving || !clienteId || !titulo}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm font-medium">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />} Criar Caso
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
