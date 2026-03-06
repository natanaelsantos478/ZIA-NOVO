import { useState, useEffect } from 'react';
import { Plus, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { getAtividades, createAtividade, updateAtividadeStatus } from '../../../lib/erp';
import type { ErpAtividade } from '../../../lib/erp';

const COLUNAS: { id: ErpAtividade['status']; label: string; color: string; bg: string }[] = [
  { id: 'PENDENTE',     label: 'A Fazer',      color: 'text-slate-600',  bg: 'bg-slate-50'  },
  { id: 'EM_ANDAMENTO', label: 'Em Andamento', color: 'text-blue-600',   bg: 'bg-blue-50'   },
  { id: 'CONCLUIDA',    label: 'Concluído',    color: 'text-green-600',  bg: 'bg-green-50'  },
  { id: 'CANCELADA',    label: 'Cancelado',    color: 'text-slate-400',  bg: 'bg-slate-50'  },
];

const PRIORIDADE_COLORS: Record<string, string> = {
  BAIXA: 'bg-slate-200',
  MEDIA: 'bg-blue-400',
  ALTA: 'bg-amber-400',
  CRITICA: 'bg-red-500',
};

export default function GerirTarefas() {
  const [tarefas, setTarefas] = useState<ErpAtividade[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [titulo, setTitulo] = useState('');
  const [prioridade, setPrioridade] = useState<'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA'>('MEDIA');
  const [dataPrazo, setDataPrazo] = useState('');
  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => {
    getAtividades().then(setTarefas).finally(() => setLoading(false));
  }, []);

  function showToast(msg: string, ok: boolean) { setToast({ msg, ok }); setTimeout(() => setToast(null), 3000); }

  async function handleCreate() {
    if (!titulo) return showToast('Título obrigatório.', false);
    setSaving(true);
    try {
      await createAtividade({
        titulo, descricao: null, modulo_destino: 'ERP', submodulo_destino: null,
        prioridade, status: 'PENDENTE', responsavel_id: null,
        criado_por: '00000000-0000-0000-0000-000000000001',
        data_prazo: dataPrazo || null, data_conclusao: null, referencia_id: null,
      });
      showToast('Tarefa criada.', true);
      setShowForm(false); setTitulo(''); setDataPrazo('');
      getAtividades().then(setTarefas);
    } catch (e) { showToast('Erro: ' + (e as Error).message, false); }
    finally { setSaving(false); }
  }

  async function moveCard(id: string, newStatus: ErpAtividade['status']) {
    try {
      await updateAtividadeStatus(id, newStatus);
      setTarefas(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    } catch (e) { showToast('Erro ao mover: ' + (e as Error).message, false); }
  }

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  return (
    <div className="p-6 h-full flex flex-col">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Gerir Tarefas</h1>
          <p className="text-sm text-slate-500">Board Kanban — arraste os cards entre colunas</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Nova Tarefa
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 flex-1 overflow-x-auto">
        {COLUNAS.map(col => {
          const cards = tarefas.filter(t => t.status === col.id);
          return (
            <div
              key={col.id}
              className={`flex flex-col w-72 flex-shrink-0 ${col.bg} rounded-xl border border-slate-200 p-3`}
              onDragOver={e => e.preventDefault()}
              onDrop={() => { if (draggingId) moveCard(draggingId, col.id); setDraggingId(null); }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`text-sm font-bold ${col.color}`}>{col.label}</span>
                <span className="text-xs bg-white border border-slate-200 px-1.5 py-0.5 rounded-full text-slate-500 font-medium">{cards.length}</span>
              </div>

              <div className="flex flex-col gap-2 flex-1 overflow-y-auto custom-scrollbar">
                {cards.map(t => (
                  <div
                    key={t.id}
                    draggable
                    onDragStart={() => setDraggingId(t.id)}
                    onDragEnd={() => setDraggingId(null)}
                    className={`bg-white rounded-lg border border-slate-200 p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow ${draggingId === t.id ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${PRIORIDADE_COLORS[t.prioridade]}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 leading-tight">{t.titulo}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded font-medium">{t.modulo_destino}</span>
                          {t.data_prazo && (
                            <span className={`text-xs ${new Date(t.data_prazo) < new Date() ? 'text-red-500' : 'text-slate-400'}`}>
                              {new Date(t.data_prazo + 'T00:00').toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {cards.length === 0 && (
                  <div className="text-center py-4 text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-lg">
                    Arraste aqui
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">Nova Tarefa</h2>
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
                  <label className="block text-xs font-medium text-slate-600 mb-1">Prioridade</label>
                  <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    value={prioridade} onChange={e => setPrioridade(e.target.value as typeof prioridade)}>
                    <option value="BAIXA">Baixa</option>
                    <option value="MEDIA">Média</option>
                    <option value="ALTA">Alta</option>
                    <option value="CRITICA">Crítica</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Prazo</label>
                  <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    value={dataPrazo} onChange={e => setDataPrazo(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600">Cancelar</button>
                <button onClick={handleCreate} disabled={saving || !titulo}
                  className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm font-medium">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />} Criar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
