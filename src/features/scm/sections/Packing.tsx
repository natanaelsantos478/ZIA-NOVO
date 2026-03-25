// Packing — Tipos de Embalagem e Configurações
import { useEffect, useState } from 'react';
import {
  Box, Plus, X, Pencil, Trash2, AlertTriangle, Package,
} from 'lucide-react';
import {
  getEmbalagens, createEmbalagem, updateEmbalagem, deleteEmbalagem,
  type ScmEmbalagem,
} from '../../../lib/scm';

const TIPO_MAP: Record<ScmEmbalagem['tipo'], { label: string; icon: string }> = {
  caixa:     { label: 'Caixa',      icon: '📦' },
  pallet:    { label: 'Pallet',     icon: '🪵' },
  envelope:  { label: 'Envelope',   icon: '✉️' },
  saco:      { label: 'Saco',       icon: '🛍️' },
  container: { label: 'Contêiner',  icon: '🚢' },
};

// ── Modal ─────────────────────────────────────────────────────────────────────
interface ModalProps {
  initial: ScmEmbalagem | null;
  onSave: (p: Omit<ScmEmbalagem, 'id' | 'created_at' | 'tenant_id'>) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}

function EmbalagemModal({ initial, onSave, onClose, saving }: ModalProps) {
  const [nome, setNome] = useState(initial?.nome ?? '');
  const [tipo, setTipo] = useState<ScmEmbalagem['tipo']>(initial?.tipo ?? 'caixa');
  const [comp, setComp] = useState(initial ? String(initial.comprimento_cm) : '');
  const [larg, setLarg] = useState(initial ? String(initial.largura_cm) : '');
  const [alt, setAlt] = useState(initial ? String(initial.altura_cm) : '');
  const [tara, setTara] = useState(initial ? String(initial.peso_tara_kg) : '');
  const [cap, setCap] = useState(initial?.capacidade_kg != null ? String(initial.capacidade_kg) : '');
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !comp || !larg || !alt || !tara) {
      setErr('Nome, dimensões e peso tara são obrigatórios.'); return;
    }
    setErr('');
    await onSave({
      nome: nome.trim(), tipo,
      comprimento_cm: Number(comp), largura_cm: Number(larg), altura_cm: Number(alt),
      peso_tara_kg: Number(tara),
      capacidade_kg: cap ? Number(cap) : null,
    });
  }

  const volume = comp && larg && alt
    ? ((Number(comp) * Number(larg) * Number(alt)) / 1_000_000).toFixed(4)
    : null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">{initial ? 'Editar Embalagem' : 'Nova Embalagem'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Nome *</label>
              <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Caixa Padrão P" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Tipo</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value as ScmEmbalagem['tipo'])} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-emerald-400">
                {Object.entries(TIPO_MAP).map(([k, { label, icon }]) => (
                  <option key={k} value={k}>{icon} {label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Dimensões (cm) *</label>
            <div className="grid grid-cols-3 gap-3">
              <input type="number" value={comp} onChange={(e) => setComp(e.target.value)} placeholder="Comp." className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
              <input type="number" value={larg} onChange={(e) => setLarg(e.target.value)} placeholder="Larg." className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
              <input type="number" value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Alt." className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
            </div>
            {volume && (
              <p className="text-xs text-emerald-600 mt-1.5">Volume calculado: {volume} m³</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Peso Tara (kg) *</label>
              <input type="number" value={tara} onChange={(e) => setTara(e.target.value)} placeholder="0.5" step="0.01" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Capacidade Máx. (kg)</label>
              <input type="number" value={cap} onChange={(e) => setCap(e.target.value)} placeholder="20" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
            </div>
          </div>
          {err && <p className="text-sm text-red-500">{err}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Packing() {
  const [items, setItems] = useState<ScmEmbalagem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<ScmEmbalagem | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ScmEmbalagem | null>(null);

  async function load() {
    setLoading(true); setError('');
    try { setItems(await getEmbalagens()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Erro'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleSave(p: Omit<ScmEmbalagem, 'id' | 'created_at' | 'tenant_id'>) {
    setSaving(true);
    try {
      if (modal === 'edit' && selected) {
        const u = await updateEmbalagem(selected.id, p);
        setItems((prev) => prev.map((x) => (x.id === u.id ? u : x)));
      } else {
        const c = await createEmbalagem(p);
        setItems((prev) => [...prev, c]);
      }
      setModal(null); setSelected(null);
    } catch (e) { alert(e instanceof Error ? e.message : 'Erro'); }
    finally { setSaving(false); }
  }

  async function handleDelete(item: ScmEmbalagem) {
    try {
      await deleteEmbalagem(item.id);
      setItems((p) => p.filter((x) => x.id !== item.id));
      setConfirmDelete(null);
    } catch (e) { alert(e instanceof Error ? e.message : 'Erro'); }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Embalagem e Packing</h1>
          <p className="text-sm text-slate-500 mt-0.5">Catálogo de embalagens com dimensões e capacidades</p>
        </div>
        <button onClick={() => { setSelected(null); setModal('create'); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">
          <Plus className="w-4 h-4" /> Nova Embalagem
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-36 bg-white rounded-2xl border border-slate-100 animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
          <Package className="w-12 h-12 text-slate-200 mb-3" />
          <p className="text-slate-500 font-medium">Nenhuma embalagem cadastrada</p>
          <p className="text-sm text-slate-400 mb-4">Cadastre os tipos de embalagem utilizados</p>
          <button onClick={() => { setSelected(null); setModal('create'); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium">
            <Plus className="w-4 h-4" /> Cadastrar
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const tp = TIPO_MAP[item.tipo];
            const vol = ((item.comprimento_cm * item.largura_cm * item.altura_cm) / 1_000_000).toFixed(4);
            return (
              <div key={item.id} className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{tp.icon}</span>
                    <div>
                      <p className="font-semibold text-slate-800">{item.nome}</p>
                      <span className="text-xs text-slate-500">{tp.label}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setSelected(item); setModal('edit'); }} className="p-1.5 rounded-lg text-slate-300 hover:text-emerald-600 hover:bg-emerald-50"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setConfirmDelete(item)} className="p-1.5 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Dimensões (cm)</span>
                    <span className="font-medium text-slate-700">{item.comprimento_cm} × {item.largura_cm} × {item.altura_cm}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Volume</span>
                    <span className="font-medium text-slate-700">{vol} m³</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Tara</span>
                    <span className="font-medium text-slate-700">{item.peso_tara_kg} kg</span>
                  </div>
                  {item.capacidade_kg && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Cap. máx.</span>
                      <span className="font-medium text-emerald-700">{item.capacidade_kg} kg</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <EmbalagemModal
          initial={modal === 'edit' ? selected : null}
          onSave={handleSave}
          onClose={() => { setModal(null); setSelected(null); }}
          saving={saving}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <p className="font-semibold text-slate-800 mb-2">Excluir embalagem?</p>
            <p className="text-sm text-slate-500 mb-5">{confirmDelete.nome}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100">Cancelar</button>
              <button onClick={() => handleDelete(confirmDelete)} className="px-4 py-2 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* Total */}
      {items.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Box className="w-3 h-3" /> {items.length} tipo{items.length !== 1 ? 's' : ''} de embalagem cadastrado{items.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
