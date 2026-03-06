import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, X, Loader2, CheckCircle, AlertCircle, Headphones } from 'lucide-react';
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

interface AtendimentoFormProps {
  tipo: 'ATENDIMENTO' | 'CASO' | 'ORDEM_SERVICO';
  clientes: ErpCliente[];
  onSave: (data: Omit<ErpAtendimento, 'id' | 'numero' | 'tenant_id' | 'created_at' | 'erp_clientes'>) => void;
  onCancel: () => void;
  saving: boolean;
}

function AtendimentoForm({ tipo, clientes, onSave, onCancel, saving }: AtendimentoFormProps) {
  const [clienteId, setClienteId] = useState('');
  const [clienteSearch, setClienteSearch] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [prioridade, setPrioridade] = useState<'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA'>('MEDIA');

  const filteredClientes = clientes.filter(c => c.nome.toLowerCase().includes(clienteSearch.toLowerCase())).slice(0, 5);
  const clienteSelecionado = clientes.find(c => c.id === clienteId);

  return (
    <div className="space-y-4">
      <div className="col-span-2">
        <label className="block text-xs font-medium text-slate-600 mb-1">Cliente *</label>
        {!clienteId ? (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Buscar cliente..." value={clienteSearch} onChange={e => setClienteSearch(e.target.value)} />
            {clienteSearch && (
              <div className="absolute top-full left-0 right-0 border border-slate-200 bg-white rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                {filteredClientes.map(c => (
                  <button key={c.id} onClick={() => { setClienteId(c.id); setClienteSearch(''); }}
                    className="w-full px-3 py-2 hover:bg-slate-50 text-sm text-left border-b border-slate-100 last:border-b-0">
                    {c.nome}
                  </button>
                ))}
                {filteredClientes.length === 0 && <div className="px-3 py-2 text-sm text-slate-400">Nenhum encontrado.</div>}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
            <span className="text-sm font-medium text-blue-800">{clienteSelecionado?.nome}</span>
            <button onClick={() => setClienteId('')} className="text-blue-600 text-xs">Alterar</button>
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Título *</label>
        <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={`Resumo do ${tipo === 'ATENDIMENTO' ? 'atendimento' : tipo === 'CASO' ? 'caso' : 'serviço'}...`}
          value={titulo} onChange={e => setTitulo(e.target.value)} />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Prioridade</label>
        <div className="flex gap-2">
          {(['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'] as const).map(p => (
            <button key={p} onClick={() => setPrioridade(p)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${prioridade === p ? PRIORIDADE_BADGE[p] + ' border-current' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Descrição</label>
        <textarea rows={4} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Detalhes do problema ou solicitação..."
          value={descricao} onChange={e => setDescricao(e.target.value)} />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900">Cancelar</button>
        <button disabled={saving || !clienteId || !titulo}
          onClick={() => onSave({ tipo, status: 'ABERTO', cliente_id: clienteId, responsavel_id: null,
            titulo, descricao: descricao || null, prioridade, data_abertura: new Date().toISOString(), data_fechamento: null })}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Abrir Atendimento
        </button>
      </div>
    </div>
  );
}

export default function Atendimento() {
  const [atendimentos, setAtendimentos] = useState<ErpAtendimento[]>([]);
  const [clientes, setClientes] = useState<ErpCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [a, c] = await Promise.all([getAtendimentos('ATENDIMENTO'), getClientes()]);
      setAtendimentos(a); setClientes(c);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function showToast(msg: string, ok: boolean) { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); }

  async function handleSave(data: Omit<ErpAtendimento, 'id' | 'numero' | 'tenant_id' | 'created_at' | 'erp_clientes'>) {
    setSaving(true);
    try {
      await createAtendimento(data);
      showToast('Atendimento criado.', true);
      setShowForm(false); load();
    } catch (e) { showToast('Erro: ' + (e as Error).message, false); }
    finally { setSaving(false); }
  }

  async function handleUpdateStatus(id: string, status: ErpAtendimento['status']) {
    try { await updateAtendimento(id, { status }); load(); }
    catch (e) { showToast('Erro: ' + (e as Error).message, false); }
  }

  const filtered = atendimentos.filter(a =>
    a.titulo.toLowerCase().includes(search.toLowerCase()) ||
    a.erp_clientes?.nome.toLowerCase().includes(search.toLowerCase())
  );

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
          <h1 className="text-xl font-bold text-slate-900">Atendimentos</h1>
          <p className="text-sm text-slate-500">{atendimentos.length} atendimentos registrados</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Novo Atendimento
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Buscar por título ou cliente..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Headphones className="w-10 h-10 text-slate-200 mx-auto mb-2" />
            <p className="text-slate-400">Nenhum atendimento encontrado.</p>
          </div>
        ) : filtered.map(a => (
          <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-200 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-slate-400 font-mono">#{a.numero}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORIDADE_BADGE[a.prioridade]}`}>{a.prioridade}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[a.status]}`}>{a.status.replace('_', ' ')}</span>
                </div>
                <h3 className="font-semibold text-slate-800">{a.titulo}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{a.erp_clientes?.nome} · {new Date(a.data_abertura).toLocaleDateString('pt-BR')}</p>
                {a.descricao && <p className="text-sm text-slate-600 mt-2 line-clamp-2">{a.descricao}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {a.status === 'ABERTO' && (
                  <button onClick={() => handleUpdateStatus(a.id, 'EM_ANDAMENTO')}
                    className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded hover:bg-amber-200 transition-colors">
                    Iniciar
                  </button>
                )}
                {a.status === 'EM_ANDAMENTO' && (
                  <button onClick={() => handleUpdateStatus(a.id, 'RESOLVIDO')}
                    className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors">
                    Resolver
                  </button>
                )}
                {(a.status === 'RESOLVIDO') && (
                  <button onClick={() => handleUpdateStatus(a.id, 'FECHADO')}
                    className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition-colors">
                    Fechar
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">Novo Atendimento</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-6">
              <AtendimentoForm tipo="ATENDIMENTO" clientes={clientes} onSave={handleSave} onCancel={() => setShowForm(false)} saving={saving} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
