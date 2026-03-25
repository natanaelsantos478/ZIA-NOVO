// WMS — Gestão de Docas e Armazém
import { useEffect, useState } from 'react';
import {
  Building, Plus, X, Pencil, Trash2, AlertTriangle,
  CheckCircle2, Loader2, Wrench,
} from 'lucide-react';
import {
  getDocas, createDoca, updateDoca, deleteDoca,
  type ScmDoca,
} from '../../../lib/scm';

const STATUS_MAP: Record<ScmDoca['status'], { label: string; color: string; dot: string }> = {
  livre:      { label: 'Livre',      color: 'bg-green-100 text-green-700',  dot: 'bg-green-500' },
  ocupada:    { label: 'Ocupada',    color: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500'  },
  manutencao: { label: 'Manutenção', color: 'bg-amber-100 text-amber-700',  dot: 'bg-amber-500' },
};

const TIPO_MAP: Record<ScmDoca['tipo'], { label: string; color: string }> = {
  recebimento: { label: 'Recebimento', color: 'bg-violet-50 text-violet-700' },
  expedicao:   { label: 'Expedição',   color: 'bg-emerald-50 text-emerald-700' },
  misto:       { label: 'Misto',       color: 'bg-slate-50 text-slate-700' },
};

// ── Modal ─────────────────────────────────────────────────────────────────────
interface ModalProps {
  initial: ScmDoca | null;
  onSave: (p: Omit<ScmDoca, 'id' | 'created_at' | 'tenant_id'>) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}

function DocaModal({ initial, onSave, onClose, saving }: ModalProps) {
  const [numero, setNumero] = useState(initial?.numero ?? '');
  const [tipo, setTipo] = useState<ScmDoca['tipo']>(initial?.tipo ?? 'misto');
  const [status, setStatus] = useState<ScmDoca['status']>(initial?.status ?? 'livre');
  const [cap, setCap] = useState(initial?.capacidade_pallets != null ? String(initial.capacidade_pallets) : '');
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!numero.trim()) { setErr('Número da doca é obrigatório.'); return; }
    setErr('');
    await onSave({ numero: numero.trim(), tipo, status, capacidade_pallets: cap ? Number(cap) : null });
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">{initial ? 'Editar Doca' : 'Nova Doca'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Número da Doca *</label>
            <input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="D-01" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Tipo</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value as ScmDoca['tipo'])} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-emerald-400">
                {Object.entries(TIPO_MAP).map(([k, { label }]) => <option key={k} value={k}>{label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as ScmDoca['status'])} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-emerald-400">
                {Object.entries(STATUS_MAP).map(([k, { label }]) => <option key={k} value={k}>{label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Capacidade (pallets)</label>
            <input type="number" value={cap} onChange={(e) => setCap(e.target.value)} placeholder="20" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
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
export default function WMS() {
  const [docas, setDocas] = useState<ScmDoca[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<ScmDoca | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ScmDoca | null>(null);

  async function load() {
    setLoading(true); setError('');
    try { setDocas(await getDocas()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Erro'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleSave(p: Omit<ScmDoca, 'id' | 'created_at' | 'tenant_id'>) {
    setSaving(true);
    try {
      if (modal === 'edit' && selected) {
        const u = await updateDoca(selected.id, p);
        setDocas((prev) => prev.map((d) => (d.id === u.id ? u : d)));
      } else {
        const c = await createDoca(p);
        setDocas((prev) => [...prev, c]);
      }
      setModal(null); setSelected(null);
    } catch (e) { alert(e instanceof Error ? e.message : 'Erro'); }
    finally { setSaving(false); }
  }

  async function handleDelete(d: ScmDoca) {
    try {
      await deleteDoca(d.id);
      setDocas((p) => p.filter((x) => x.id !== d.id));
      setConfirmDelete(null);
    } catch (e) { alert(e instanceof Error ? e.message : 'Erro'); }
  }

  const counts = {
    livre: docas.filter((d) => d.status === 'livre').length,
    ocupada: docas.filter((d) => d.status === 'ocupada').length,
    manutencao: docas.filter((d) => d.status === 'manutencao').length,
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestão de Docas (WMS)</h1>
          <p className="text-sm text-slate-500 mt-0.5">Controle de docas de recebimento e expedição</p>
        </div>
        <button onClick={() => { setSelected(null); setModal('create'); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">
          <Plus className="w-4 h-4" /> Nova Doca
        </button>
      </div>

      {/* Summary pills */}
      {docas.length > 0 && (
        <div className="flex gap-3">
          <span className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl bg-green-50 text-green-700 font-medium">
            <CheckCircle2 className="w-4 h-4" /> {counts.livre} Livres
          </span>
          <span className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 font-medium">
            <Loader2 className="w-4 h-4" /> {counts.ocupada} Ocupadas
          </span>
          <span className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 font-medium">
            <Wrench className="w-4 h-4" /> {counts.manutencao} Manutenção
          </span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-28 bg-white rounded-2xl border border-slate-100 animate-pulse" />)}
        </div>
      ) : docas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
          <Building className="w-12 h-12 text-slate-200 mb-3" />
          <p className="text-slate-500 font-medium">Nenhuma doca cadastrada</p>
          <p className="text-sm text-slate-400 mb-4">Adicione as docas do armazém</p>
          <button onClick={() => { setSelected(null); setModal('create'); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium">
            <Plus className="w-4 h-4" /> Cadastrar Doca
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {docas.map((d) => {
            const st = STATUS_MAP[d.status];
            const tp = TIPO_MAP[d.tipo];
            return (
              <div key={d.id} className="bg-white rounded-2xl border border-slate-100 p-4 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-lg font-bold text-slate-800">{d.numero}</p>
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 ${tp.color}`}>{tp.label}</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setSelected(d); setModal('edit'); }} className="p-1 rounded-lg text-slate-300 hover:text-emerald-600 hover:bg-emerald-50"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setConfirmDelete(d)} className="p-1 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                </div>
                {d.capacidade_pallets && (
                  <p className="text-xs text-slate-400 mt-2">{d.capacidade_pallets} pallets</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <DocaModal
          initial={modal === 'edit' ? selected : null}
          onSave={handleSave}
          onClose={() => { setModal(null); setSelected(null); }}
          saving={saving}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <p className="font-semibold text-slate-800 mb-2">Excluir doca {confirmDelete.numero}?</p>
            <p className="text-sm text-slate-500 mb-5">Esta ação não pode ser desfeita.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100">Cancelar</button>
              <button onClick={() => handleDelete(confirmDelete)} className="px-4 py-2 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
