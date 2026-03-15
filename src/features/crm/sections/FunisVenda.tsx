// ─────────────────────────────────────────────────────────────────────────────
// CRM — Gestão de Funis de Venda
// Cria/edita/exclui funis e suas etapas; organiza ordem via botões ↑↓
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Pencil, Trash2, ChevronUp, ChevronDown, X, Loader2,
  CheckCircle, AlertCircle, Filter, GripVertical, Tag, Clock,
  Star, StarOff, Circle, Lock,
} from 'lucide-react';
import {
  getFunis, createFunil, updateFunil, deleteFunil,
  upsertEtapaFunil, deleteEtapa,
  ETAPAS_OBRIGATORIAS,
  type FunilVenda, type EtapaFunil,
} from '../data/crmData';

// ── Helpers ───────────────────────────────────────────────────────────────────
const CORES = [
  '#6366f1','#8b5cf6','#ec4899','#f43f5e','#f59e0b',
  '#10b981','#06b6d4','#3b82f6','#64748b','#84cc16',
];

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm text-white ${ok ? 'bg-green-600' : 'bg-red-600'}`}>
      {ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}{msg}
    </div>
  );
}

// ── Modal de Funil ─────────────────────────────────────────────────────────────
interface FunilModalProps {
  initial?: FunilVenda;
  onSave: (nome: string, descricao: string) => Promise<void>;
  onClose: () => void;
}
function FunilModal({ initial, onSave, onClose }: FunilModalProps) {
  const [nome, setNome] = useState(initial?.nome ?? '');
  const [desc, setDesc] = useState(initial?.descricao ?? '');
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
          <h2 className="text-base font-bold text-slate-900">{initial ? 'Editar Funil' : 'Novo Funil'}</h2>
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
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal de Etapa ─────────────────────────────────────────────────────────────
interface EtapaModalProps {
  funilId: string;
  etapaOrdem: number;
  initial?: EtapaFunil;
  onSave: (e: Omit<EtapaFunil, 'id'> & { id?: string }) => Promise<void>;
  onClose: () => void;
}
function EtapaModal({ funilId, etapaOrdem, initial, onSave, onClose }: EtapaModalProps) {
  const [nome, setNome]         = useState(initial?.nome ?? '');
  const [cor, setCor]           = useState(initial?.cor ?? CORES[0]);
  const [metaDias, setMetaDias] = useState(initial?.metaDias?.toString() ?? '');
  const [saving, setSaving]     = useState(false);

  async function handle() {
    if (!nome.trim()) return;
    setSaving(true);
    try {
      await onSave({ id: initial?.id, funilId, nome: nome.trim(), cor, ordem: initial?.ordem ?? etapaOrdem, metaDias: metaDias ? Number(metaDias) : undefined });
      onClose();
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">{initial ? 'Editar Etapa' : 'Nova Etapa'}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Nome da Etapa *</label>
            <input autoFocus className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Proposta Enviada" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2">Cor</label>
            <div className="flex flex-wrap gap-2">
              {CORES.map(c => (
                <button key={c} onClick={() => setCor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${cor === c ? 'border-slate-800 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Meta (dias nesta etapa)</label>
            <input type="number" min={1} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              value={metaDias} onChange={e => setMetaDias(e.target.value)} placeholder="Opcional" />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500">Cancelar</button>
          <button onClick={handle} disabled={!nome.trim() || saving}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-sm font-semibold">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Painel de etapas de um funil ───────────────────────────────────────────────
function EtapasPanel({ funil, onRefresh, showToast }: {
  funil: FunilVenda;
  onRefresh: () => void;
  showToast: (msg: string, ok: boolean) => void;
}) {
  const [editEtapa, setEditEtapa]   = useState<EtapaFunil | null | 'new'>(null);

  const sorted = [...funil.etapas].sort((a, b) => a.ordem - b.ordem);

  async function moveEtapa(etapa: EtapaFunil, dir: 'up' | 'down') {
    const idx  = sorted.findIndex(e => e.id === etapa.id);
    const swap = sorted[dir === 'up' ? idx - 1 : idx + 1];
    if (!swap) return;
    await Promise.all([
      upsertEtapaFunil({ ...etapa, ordem: swap.ordem }),
      upsertEtapaFunil({ ...swap,  ordem: etapa.ordem }),
    ]);
    onRefresh();
  }

  async function handleDelete(etapa: EtapaFunil) {
    if (etapa.tipo) { showToast('Esta etapa é obrigatória e não pode ser excluída.', false); return; }
    if (!confirm('Excluir esta etapa?')) return;
    try { await deleteEtapa(etapa.id); onRefresh(); showToast('Etapa excluída.', true); }
    catch { showToast('Erro ao excluir.', false); }
  }

  async function handleSaveEtapa(e: Omit<EtapaFunil, 'id'> & { id?: string }) {
    try { await upsertEtapaFunil(e); onRefresh(); showToast('Etapa salva.', true); }
    catch { showToast('Erro ao salvar etapa.', false); }
  }

  const nextOrdem = sorted.length > 0 ? sorted[sorted.length - 1].ordem + 1 : 0;

  return (
    <div className="mt-4 space-y-2">
      {sorted.map((e, idx) => (
        <div key={e.id} className={`flex items-center gap-3 bg-white border rounded-xl px-4 py-3 group ${e.tipo ? 'border-purple-100 bg-purple-50/30' : 'border-slate-100'}`}>
          <GripVertical className="w-4 h-4 text-slate-300 shrink-0" />
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: e.cor }} />
          <span className="flex-1 text-sm font-medium text-slate-800">{e.nome}</span>
          {e.tipo && (
            <span className="flex items-center gap-1 text-[10px] text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded-full font-semibold">
              <Lock className="w-2.5 h-2.5" /> obrigatória
            </span>
          )}
          {e.metaDias && (
            <span className="flex items-center gap-1 text-[11px] text-slate-400">
              <Clock className="w-3 h-3" />{e.metaDias}d
            </span>
          )}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => moveEtapa(e, 'up')} disabled={idx === 0}
              className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"><ChevronUp className="w-3.5 h-3.5 text-slate-500" /></button>
            <button onClick={() => moveEtapa(e, 'down')} disabled={idx === sorted.length - 1}
              className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5 text-slate-500" /></button>
            <button onClick={() => setEditEtapa(e)} className="p-1 rounded hover:bg-purple-50">
              <Pencil className="w-3.5 h-3.5 text-purple-500" /></button>
            {e.tipo ? (
              <span className="p-1 text-slate-300 cursor-not-allowed" title="Etapa obrigatória — não pode ser excluída">
                <Lock className="w-3.5 h-3.5" />
              </span>
            ) : (
              <button onClick={() => handleDelete(e)} className="p-1 rounded hover:bg-red-50">
                <Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
            )}
          </div>
        </div>
      ))}

      <button onClick={() => setEditEtapa('new')}
        className="w-full flex items-center gap-2 justify-center border border-dashed border-purple-300 text-purple-600 hover:bg-purple-50 rounded-xl py-2.5 text-sm font-medium transition-colors">
        <Plus className="w-4 h-4" /> Adicionar Etapa
      </button>

      {editEtapa === 'new' && (
        <EtapaModal funilId={funil.id} etapaOrdem={nextOrdem}
          onSave={handleSaveEtapa} onClose={() => setEditEtapa(null)} />
      )}
      {editEtapa && editEtapa !== 'new' && (
        <EtapaModal funilId={funil.id} etapaOrdem={editEtapa.ordem} initial={editEtapa}
          onSave={handleSaveEtapa} onClose={() => setEditEtapa(null)} />
      )}
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function FunisVenda() {
  const [funis, setFunis]           = useState<FunilVenda[]>([]);
  const [loading, setLoading]       = useState(true);
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [toast, setToast]           = useState<{ msg: string; ok: boolean } | null>(null);
  const [modalFunil, setModalFunil] = useState<FunilVenda | null | 'new'>(null);

  const showToast = useCallback((msg: string, ok: boolean) => {
    setToast({ msg, ok }); setTimeout(() => setToast(null), 3000);
  }, []);

  const load = useCallback(async () => {
    try { setLoading(true); setFunis(await getFunis()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreateFunil(nome: string, descricao: string) {
    try {
      const funil = await createFunil(nome, descricao || undefined);
      // Auto-cria as 6 etapas obrigatórias no novo funil
      await Promise.all(
        ETAPAS_OBRIGATORIAS.map(eo =>
          upsertEtapaFunil({ funilId: funil.id, nome: eo.defaultNome, cor: eo.cor, ordem: eo.ordem, tipo: eo.tipo }),
        ),
      );
      load(); showToast('Funil criado com as etapas obrigatórias.', true);
    } catch { showToast('Erro ao criar funil.', false); }
  }

  async function handleUpdateFunil(id: string, nome: string, descricao: string) {
    try { await updateFunil(id, { nome, descricao: descricao || undefined }); load(); showToast('Funil atualizado.', true); }
    catch { showToast('Erro ao atualizar.', false); }
  }

  async function handleDeleteFunil(id: string) {
    if (!confirm('Excluir este funil e todas as suas etapas?')) return;
    try { await deleteFunil(id); load(); showToast('Funil excluído.', true); }
    catch { showToast('Erro ao excluir.', false); }
  }

  async function handleSetPadrao(id: string) {
    try {
      await Promise.all(funis.map(f => updateFunil(f.id, { padrao: f.id === id })));
      load(); showToast('Funil padrão definido.', true);
    } catch { showToast('Erro.', false); }
  }

  async function moveFunil(funil: FunilVenda, dir: 'up' | 'down') {
    const sorted = [...funis].sort((a, b) => a.ordem - b.ordem);
    const idx = sorted.findIndex(f => f.id === funil.id);
    const swap = sorted[dir === 'up' ? idx - 1 : idx + 1];
    if (!swap) return;
    await Promise.all([
      updateFunil(funil.id, { ordem: swap.ordem }),
      updateFunil(swap.id,  { ordem: funil.ordem }),
    ]);
    load();
  }

  const sorted = [...funis].sort((a, b) => a.ordem - b.ordem);

  return (
    <div className="p-6 max-w-3xl">
      {toast && <Toast {...toast} />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Funis de Venda</h1>
          <p className="text-sm text-slate-500">Crie e organize seus funis e etapas de venda</p>
        </div>
        <button onClick={() => setModalFunil('new')}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Novo Funil
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-400" /></div>
      ) : sorted.length === 0 ? (
        <div className="py-20 text-center">
          <Filter className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">Nenhum funil cadastrado.</p>
          <p className="text-sm text-slate-400 mt-1">Crie o primeiro funil para começar.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map((funil, idx) => (
            <div key={funil.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              {/* Cabeçalho do funil */}
              <div className="flex items-center gap-3 px-5 py-4">
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveFunil(funil, 'up')} disabled={idx === 0}
                    className="p-0.5 rounded hover:bg-slate-100 disabled:opacity-20"><ChevronUp className="w-3.5 h-3.5 text-slate-400" /></button>
                  <button onClick={() => moveFunil(funil, 'down')} disabled={idx === sorted.length - 1}
                    className="p-0.5 rounded hover:bg-slate-100 disabled:opacity-20"><ChevronDown className="w-3.5 h-3.5 text-slate-400" /></button>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{funil.nome}</span>
                    {funil.padrao && (
                      <span className="flex items-center gap-0.5 text-[11px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">
                        <Star className="w-3 h-3" /> Padrão
                      </span>
                    )}
                  </div>
                  {funil.descricao && <p className="text-xs text-slate-500 mt-0.5">{funil.descricao}</p>}
                  <div className="flex items-center gap-3 mt-2">
                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Tag className="w-3 h-3" />{funil.etapas.length} etapa{funil.etapas.length !== 1 ? 's' : ''}
                    </span>
                    {/* Pré-visualização das etapas */}
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
                  {!funil.padrao && (
                    <button onClick={() => handleSetPadrao(funil.id)} title="Definir como padrão"
                      className="p-2 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors">
                      <StarOff className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => setModalFunil(funil)}
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

              {/* Etapas expandidas */}
              {expanded === funil.id && (
                <div className="border-t border-slate-100 px-5 pb-5">
                  <EtapasPanel funil={funil} onRefresh={load} showToast={showToast} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modais de funil */}
      {modalFunil === 'new' && (
        <FunilModal onSave={handleCreateFunil} onClose={() => setModalFunil(null)} />
      )}
      {modalFunil && modalFunil !== 'new' && (
        <FunilModal initial={modalFunil}
          onSave={(nome, desc) => handleUpdateFunil(modalFunil.id, nome, desc)}
          onClose={() => setModalFunil(null)} />
      )}
    </div>
  );
}
