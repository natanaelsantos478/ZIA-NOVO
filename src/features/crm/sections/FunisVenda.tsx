// ─────────────────────────────────────────────────────────────────────────────
// CRM — Gestão de Funis de Venda
// Usa o sistema CrmFunil (mesmo do Pipeline) com FunilEditorModal completo
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import {
  Plus, Pencil, Trash2, X, Loader2,
  CheckCircle, AlertCircle, Filter, Tag,
  Star, StarOff, Circle, ChevronDown, ChevronUp,
} from 'lucide-react';
import {
  getCrmFunis, createFunil, deleteFunil, updateFunil,
  type CrmFunil,
} from '../data/crmData';

const FunilEditorModal = lazy(() => import('./FunilEditorModal'));

// ── Helpers ───────────────────────────────────────────────────────────────────

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm text-white ${ok ? 'bg-green-600' : 'bg-red-600'}`}>
      {ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{msg}
    </div>
  );
}

// ── Modal simples para criar novo funil ────────────────────────────────────────
interface CreateFunilModalProps {
  onSave: (nome: string, descricao: string) => Promise<void>;
  onClose: () => void;
}
function CreateFunilModal({ onSave, onClose }: CreateFunilModalProps) {
  const [nome, setNome] = useState('');
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);

  async function handle() {
    if (!nome.trim()) return;
    setSaving(true);
    try { await onSave(nome.trim(), desc.trim()); onClose(); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">Novo Funil</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Nome do Funil *</label>
            <input autoFocus className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Vendas B2B" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Descrição</label>
            <textarea rows={2} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
              value={desc} onChange={e => setDesc(e.target.value)} placeholder="Opcional" />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Cancelar</button>
          <button onClick={handle} disabled={!nome.trim() || saving}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-sm font-semibold">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Criar Funil
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function FunisVenda() {
  const [funis, setFunis]           = useState<CrmFunil[]>([]);
  const [loading, setLoading]       = useState(true);
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [toast, setToast]           = useState<{ msg: string; ok: boolean } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editFunil, setEditFunil]   = useState<CrmFunil | null>(null);

  const showToast = useCallback((msg: string, ok: boolean) => {
    setToast({ msg, ok }); setTimeout(() => setToast(null), 3000);
  }, []);

  const load = useCallback(async () => {
    try { setLoading(true); setFunis(await getCrmFunis()); }
    catch { setFunis([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreateFunil(nome: string, descricao: string) {
    try {
      await createFunil(nome, descricao || undefined);
      await load();
      showToast('Funil criado com as etapas obrigatórias.', true);
    } catch { showToast('Erro ao criar funil.', false); }
  }

  async function handleDeleteFunil(id: string) {
    if (!confirm('Excluir este funil e todas as suas etapas?')) return;
    try { await deleteFunil(id); await load(); showToast('Funil excluído.', true); }
    catch { showToast('Erro ao excluir.', false); }
  }

  async function handleSetPadrao(id: string) {
    try {
      await Promise.all(funis.map(f => updateFunil(f.id, { padrao: f.id === id })));
      await load();
      showToast('Funil padrão definido.', true);
    } catch { showToast('Erro ao definir padrão.', false); }
  }

  return (
    <div className="p-6 max-w-3xl">
      {toast && <Toast {...toast} />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Funis de Venda</h1>
          <p className="text-sm text-slate-500">Crie e organize seus funis e etapas de venda</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Novo Funil
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-400" /></div>
      ) : funis.length === 0 ? (
        <div className="py-20 text-center">
          <Filter className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">Nenhum funil cadastrado.</p>
          <p className="text-sm text-slate-400 mt-1">Crie o primeiro funil para começar.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {funis.map(funil => (
            <div key={funil.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              {/* Cabeçalho do funil */}
              <div className="flex items-center gap-3 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{funil.nome}</span>
                    {funil.isPadrao && (
                      <span className="flex items-center gap-0.5 text-[11px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                        <Star className="w-3 h-3" /> Padrão
                      </span>
                    )}
                    {!funil.ativo && (
                      <span className="text-[11px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">Inativo</span>
                    )}
                  </div>
                  {funil.descricao && <p className="text-xs text-slate-500 mt-0.5">{funil.descricao}</p>}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Tag className="w-3 h-3" />{funil.etapas.length} etapa{funil.etapas.length !== 1 ? 's' : ''}
                    </span>
                    <div className="flex items-center gap-1">
                      {[...funil.etapas].sort((a, b) => a.ordem - b.ordem).map(e => (
                        <div key={e.id} className="flex items-center gap-1">
                          <Circle className="w-2 h-2" style={{ color: e.cor, fill: e.cor }} />
                          <span className="text-[10px] text-slate-500 hidden sm:inline">{e.nome}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {!funil.isPadrao && (
                    <button onClick={() => handleSetPadrao(funil.id)} title="Definir como padrão"
                      className="p-2 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors">
                      <StarOff className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => setEditFunil(funil)}
                    className="p-2 rounded-lg hover:bg-purple-50 text-slate-400 hover:text-purple-600 transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteFunil(funil.id)}
                    className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setExpanded(expanded === funil.id ? null : funil.id)}
                    className="p-2 rounded-lg hover:bg-slate-50 text-slate-400 transition-colors">
                    {expanded === funil.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Etapas expandidas — somente visualização; edição via botão Editar */}
              {expanded === funil.id && (
                <div className="border-t border-slate-100 px-5 pb-5 pt-4">
                  <p className="text-xs text-slate-400 mb-3 flex items-center justify-between">
                    <span>Etapas do funil</span>
                    <button onClick={() => setEditFunil(funil)}
                      className="text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1">
                      <Pencil className="w-3 h-3" /> Editar etapas
                    </button>
                  </p>
                  <div className="space-y-2">
                    {[...funil.etapas].sort((a, b) => a.ordem - b.ordem).map(e => (
                      <div key={e.id} className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: e.cor }} />
                        <span className="text-sm font-medium text-slate-700 flex-1">{e.nome}</span>
                        {e.icone && <span className="text-base">{e.icone}</span>}
                        <span className="text-xs text-slate-400">{e.probabilidade}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal criar novo funil */}
      {showCreate && (
        <CreateFunilModal
          onSave={handleCreateFunil}
          onClose={() => setShowCreate(false)}
        />
      )}

      {/* Editor completo de funil */}
      {editFunil && (
        <Suspense fallback={null}>
          <FunilEditorModal
            funil={editFunil}
            onClose={() => setEditFunil(null)}
            onSaved={updated => {
              setFunis(prev => prev.map(f => f.id === updated.id ? updated : f));
              setEditFunil(null);
              showToast('Funil atualizado.', true);
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
