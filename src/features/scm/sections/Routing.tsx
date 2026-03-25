// Routing — Roteirização com IA (rotas + veículo vinculado)
import { useEffect, useState } from 'react';
import {
  Route, Plus, Search, Pencil, Trash2, X, AlertTriangle,
  CheckCircle2, PlayCircle, PauseCircle, Truck, MapPin,
  Clock, Gauge,
} from 'lucide-react';
import {
  getRotas, createRota, updateRota, deleteRota, getVeiculos,
  type ScmRota, type ScmVeiculo,
} from '../../../lib/scm';

const STATUS_MAP: Record<ScmRota['status'], { label: string; color: string; icon: React.ReactNode }> = {
  ativa:        { label: 'Ativa',        color: 'bg-green-100 text-green-700',  icon: <CheckCircle2 className="w-3 h-3" /> },
  em_andamento: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-700',    icon: <PlayCircle className="w-3 h-3" /> },
  inativa:      { label: 'Inativa',      color: 'bg-slate-100 text-slate-500',  icon: <PauseCircle className="w-3 h-3" /> },
};

// ── Modal ─────────────────────────────────────────────────────────────────────
interface FormState {
  nome: string; origem: string; destino: string;
  distancia_km: string; tempo_estimado_min: string;
  veiculo_id: string; status: ScmRota['status'];
}
const EMPTY: FormState = {
  nome: '', origem: '', destino: '', distancia_km: '',
  tempo_estimado_min: '', veiculo_id: '', status: 'ativa',
};

interface ModalProps {
  initial: ScmRota | null;
  veiculos: ScmVeiculo[];
  onSave: (p: Omit<ScmRota, 'id' | 'created_at' | 'tenant_id' | 'scm_veiculos'>) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}

function RotaModal({ initial, veiculos, onSave, onClose, saving }: ModalProps) {
  const [form, setForm] = useState<FormState>(
    initial
      ? {
          nome: initial.nome, origem: initial.origem, destino: initial.destino,
          distancia_km: String(initial.distancia_km),
          tempo_estimado_min: String(initial.tempo_estimado_min),
          veiculo_id: initial.veiculo_id ?? '', status: initial.status,
        }
      : EMPTY,
  );
  const [err, setErr] = useState('');

  function set(k: keyof FormState, v: string) { setForm((p) => ({ ...p, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome.trim() || !form.origem.trim() || !form.destino.trim() || !form.distancia_km) {
      setErr('Nome, origem, destino e distância são obrigatórios.'); return;
    }
    setErr('');
    await onSave({
      nome: form.nome.trim(), origem: form.origem.trim(), destino: form.destino.trim(),
      distancia_km: Number(form.distancia_km),
      tempo_estimado_min: Number(form.tempo_estimado_min) || 0,
      veiculo_id: form.veiculo_id || null, status: form.status,
    });
  }

  const available = veiculos.filter((v) => v.status === 'disponivel' || v.status === 'em_rota');

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">{initial ? 'Editar Rota' : 'Nova Rota'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Nome da Rota *</label>
            <input value={form.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Ex: Rota SP → RJ" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Origem *</label>
              <input value={form.origem} onChange={(e) => set('origem', e.target.value)} placeholder="São Paulo, SP" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Destino *</label>
              <input value={form.destino} onChange={(e) => set('destino', e.target.value)} placeholder="Rio de Janeiro, RJ" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Distância (km) *</label>
              <input type="number" value={form.distancia_km} onChange={(e) => set('distancia_km', e.target.value)} placeholder="430" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Tempo Estimado (min)</label>
              <input type="number" value={form.tempo_estimado_min} onChange={(e) => set('tempo_estimado_min', e.target.value)} placeholder="300" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Veículo Vinculado</label>
              <select value={form.veiculo_id} onChange={(e) => set('veiculo_id', e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-emerald-400">
                <option value="">Nenhum</option>
                {available.map((v) => (
                  <option key={v.id} value={v.id}>{v.placa} — {v.modelo}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Status</label>
              <select value={form.status} onChange={(e) => set('status', e.target.value as ScmRota['status'])} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-emerald-400">
                {Object.entries(STATUS_MAP).map(([k, { label }]) => <option key={k} value={k}>{label}</option>)}
              </select>
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
export default function Routing() {
  const [rotas, setRotas] = useState<ScmRota[]>([]);
  const [veiculos, setVeiculos] = useState<ScmVeiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<ScmRota | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ScmRota | null>(null);

  async function load(q = '') {
    setLoading(true); setError('');
    try {
      const [r, v] = await Promise.all([getRotas(q), getVeiculos()]);
      setRotas(r); setVeiculos(v);
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro ao carregar'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { const t = setTimeout(() => load(search), 350); return () => clearTimeout(t); }, [search]);

  async function handleSave(payload: Omit<ScmRota, 'id' | 'created_at' | 'tenant_id' | 'scm_veiculos'>) {
    setSaving(true);
    try {
      if (modal === 'edit' && selected) {
        const u = await updateRota(selected.id, payload);
        setRotas((p) => p.map((r) => (r.id === u.id ? u : r)));
      } else {
        const c = await createRota(payload);
        setRotas((p) => [c, ...p]);
      }
      setModal(null); setSelected(null);
    } catch (e) { alert(e instanceof Error ? e.message : 'Erro'); }
    finally { setSaving(false); }
  }

  async function handleDelete(r: ScmRota) {
    try {
      await deleteRota(r.id);
      setRotas((p) => p.filter((x) => x.id !== r.id));
      setConfirmDelete(null);
    } catch (e) { alert(e instanceof Error ? e.message : 'Erro'); }
  }

  function fmtTempo(min: number) {
    if (!min) return '—';
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}h${m > 0 ? ` ${m}min` : ''}` : `${m}min`;
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Roteirização com IA</h1>
          <p className="text-sm text-slate-500 mt-0.5">Planejamento e otimização de rotas de entrega</p>
        </div>
        <button onClick={() => { setSelected(null); setModal('create'); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">
          <Plus className="w-4 h-4" /> Nova Rota
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar rota, origem ou destino..." className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-36 bg-white rounded-2xl border border-slate-100 animate-pulse" />)}
        </div>
      ) : rotas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
          <Route className="w-12 h-12 text-slate-200 mb-3" />
          <p className="text-slate-500 font-medium">Nenhuma rota cadastrada</p>
          <p className="text-sm text-slate-400 mb-4">Crie a primeira rota de entrega</p>
          <button onClick={() => { setSelected(null); setModal('create'); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium">
            <Plus className="w-4 h-4" /> Criar Rota
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rotas.map((r) => {
            const st = STATUS_MAP[r.status];
            return (
              <div key={r.id} className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-slate-800">{r.nome}</p>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium mt-1 ${st.color}`}>
                      {st.icon} {st.label}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setSelected(r); setModal('edit'); }} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => setConfirmDelete(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{r.origem}</span>
                  <span className="text-slate-300">→</span>
                  <span>{r.destino}</span>
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Gauge className="w-3 h-3" /> {r.distancia_km.toLocaleString('pt-BR')} km</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {fmtTempo(r.tempo_estimado_min)}</span>
                  {r.scm_veiculos && (
                    <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> {r.scm_veiculos.placa}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <RotaModal
          initial={modal === 'edit' ? selected : null}
          veiculos={veiculos}
          onSave={handleSave}
          onClose={() => { setModal(null); setSelected(null); }}
          saving={saving}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <p className="font-semibold text-slate-800 mb-2">Excluir rota?</p>
            <p className="text-sm text-slate-500 mb-5">{confirmDelete.nome} ({confirmDelete.origem} → {confirmDelete.destino})</p>
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
