// Drone — Frota de Drones e Missões de Entrega
import { useEffect, useState } from 'react';
import {
  Plane, Plus, X, Pencil, Trash2, AlertTriangle,
  CheckCircle2, Zap, Wrench, XCircle, Battery, Radio,
} from 'lucide-react';
import {
  getDrones, createDrone, updateDrone, deleteDrone,
  type ScmDrone,
} from '../../../lib/scm';

const STATUS_MAP: Record<ScmDrone['status'], { label: string; color: string; icon: React.ReactNode }> = {
  disponivel: { label: 'Disponível', color: 'bg-green-100 text-green-700',  icon: <CheckCircle2 className="w-3 h-3" /> },
  em_voo:     { label: 'Em Voo',     color: 'bg-blue-100 text-blue-700',    icon: <Plane className="w-3 h-3" /> },
  manutencao: { label: 'Manutenção', color: 'bg-amber-100 text-amber-700',  icon: <Wrench className="w-3 h-3" /> },
  inativo:    { label: 'Inativo',    color: 'bg-slate-100 text-slate-500',  icon: <XCircle className="w-3 h-3" /> },
};

function BatteryBar({ pct }: { pct: number }) {
  const color = pct > 60 ? 'bg-green-500' : pct > 30 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-medium ${pct > 60 ? 'text-green-700' : pct > 30 ? 'text-amber-700' : 'text-red-700'}`}>{pct}%</span>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
interface ModalProps {
  initial: ScmDrone | null;
  onSave: (p: Omit<ScmDrone, 'id' | 'created_at' | 'tenant_id'>) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}

function DroneModal({ initial, onSave, onClose, saving }: ModalProps) {
  const [nome, setNome] = useState(initial?.nome ?? '');
  const [modelo, setModelo] = useState(initial?.modelo ?? '');
  const [serie, setSerie] = useState(initial?.numero_serie ?? '');
  const [status, setStatus] = useState<ScmDrone['status']>(initial?.status ?? 'disponivel');
  const [bateria, setBateria] = useState(initial?.bateria_pct != null ? String(initial.bateria_pct) : '');
  const [alcance, setAlcance] = useState(initial?.alcance_km != null ? String(initial.alcance_km) : '');
  const [carga, setCarga] = useState(initial?.carga_max_kg != null ? String(initial.carga_max_kg) : '');
  const [manut, setManut] = useState(initial?.ultima_manutencao ?? '');
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !modelo.trim()) { setErr('Nome e modelo são obrigatórios.'); return; }
    setErr('');
    await onSave({
      nome: nome.trim(), modelo: modelo.trim(),
      numero_serie: serie.trim() || null, status,
      bateria_pct: bateria ? Number(bateria) : null,
      alcance_km: alcance ? Number(alcance) : null,
      carga_max_kg: carga ? Number(carga) : null,
      ultima_manutencao: manut || null,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">{initial ? 'Editar Drone' : 'Novo Drone'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Nome *</label>
              <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Drone Alpha-01" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Modelo *</label>
              <input value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder="DJI Matrice 300" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Nº de Série</label>
              <input value={serie} onChange={(e) => setSerie(e.target.value)} placeholder="SN-0001" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as ScmDrone['status'])} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-emerald-400">
                {Object.entries(STATUS_MAP).map(([k, { label }]) => <option key={k} value={k}>{label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Bateria (%)</label>
              <input type="number" value={bateria} onChange={(e) => setBateria(e.target.value)} min="0" max="100" placeholder="100" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Alcance (km)</label>
              <input type="number" value={alcance} onChange={(e) => setAlcance(e.target.value)} step="0.1" placeholder="15" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Carga Máx. (kg)</label>
              <input type="number" value={carga} onChange={(e) => setCarga(e.target.value)} step="0.1" placeholder="2.5" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Última Manutenção</label>
            <input type="date" value={manut} onChange={(e) => setManut(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
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
export default function Drone() {
  const [drones, setDrones] = useState<ScmDrone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<ScmDrone | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ScmDrone | null>(null);

  async function load() {
    setLoading(true); setError('');
    try { setDrones(await getDrones()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Erro ao carregar'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleSave(p: Omit<ScmDrone, 'id' | 'created_at' | 'tenant_id'>) {
    setSaving(true);
    try {
      if (modal === 'edit' && selected) {
        const u = await updateDrone(selected.id, p);
        setDrones((prev) => prev.map((d) => (d.id === u.id ? u : d)));
      } else {
        const c = await createDrone(p);
        setDrones((prev) => [...prev, c]);
      }
      setModal(null); setSelected(null);
    } catch (e) { alert(e instanceof Error ? e.message : 'Erro'); }
    finally { setSaving(false); }
  }

  async function handleDelete(d: ScmDrone) {
    try {
      await deleteDrone(d.id);
      setDrones((prev) => prev.filter((x) => x.id !== d.id));
      setConfirmDelete(null);
    } catch (e) { alert(e instanceof Error ? e.message : 'Erro'); }
  }

  const emVoo = drones.filter((d) => d.status === 'em_voo').length;
  const disponiveis = drones.filter((d) => d.status === 'disponivel').length;
  const baixaBateria = drones.filter((d) => (d.bateria_pct ?? 100) < 20).length;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Integração Drones</h1>
          <p className="text-sm text-slate-500 mt-0.5">Frota de drones para entregas last-mile autônomas</p>
        </div>
        <button
          onClick={() => { setSelected(null); setModal('create'); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4" /> Novo Drone
        </button>
      </div>

      {/* Status pills */}
      {drones.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 font-medium">
            <Plane className="w-3.5 h-3.5" /> {emVoo} em voo
          </span>
          <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-green-50 text-green-700 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" /> {disponiveis} disponíveis
          </span>
          {baixaBateria > 0 && (
            <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-red-50 text-red-700 font-medium">
              <Battery className="w-3.5 h-3.5" /> {baixaBateria} com bateria baixa
            </span>
          )}
        </div>
      )}

      {/* Alerta bateria baixa */}
      {baixaBateria > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">
            <strong>{baixaBateria}</strong> drone{baixaBateria !== 1 ? 's' : ''} com bateria abaixo de 20%. Recarregue antes do próximo voo.
          </p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Grid de drones */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 bg-white rounded-2xl border border-slate-100 animate-pulse" />
          ))}
        </div>
      ) : drones.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
          <Plane className="w-12 h-12 text-slate-200 mb-3" />
          <p className="text-slate-500 font-medium">Nenhum drone cadastrado</p>
          <p className="text-sm text-slate-400 mb-4">Adicione drones para entregas last-mile autônomas</p>
          <button
            onClick={() => { setSelected(null); setModal('create'); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Cadastrar Drone
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drones.map((d) => {
            const st = STATUS_MAP[d.status];
            return (
              <div
                key={d.id}
                className={`bg-white rounded-2xl border p-5 hover:shadow-md transition-all ${
                  d.status === 'em_voo' ? 'border-blue-200' : 'border-slate-100'
                }`}
              >
                {/* Top row */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      d.status === 'em_voo' ? 'bg-blue-50' : 'bg-emerald-50'
                    }`}>
                      <Plane className={`w-5 h-5 ${d.status === 'em_voo' ? 'text-blue-600 animate-bounce' : 'text-emerald-600'}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{d.nome}</p>
                      <p className="text-xs text-slate-500">{d.modelo}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => { setSelected(d); setModal('edit'); }}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-emerald-600 hover:bg-emerald-50"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(d)}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Status badge */}
                <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium mb-3 ${st.color}`}>
                  {st.icon} {st.label}
                </span>

                {/* Bateria */}
                {d.bateria_pct != null && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Battery className="w-3 h-3" /> Bateria
                      </span>
                    </div>
                    <BatteryBar pct={d.bateria_pct} />
                  </div>
                )}

                {/* Specs */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3">
                  {d.alcance_km != null && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Radio className="w-3 h-3 text-slate-400" />
                      <span>Alcance: <strong className="text-slate-700">{d.alcance_km} km</strong></span>
                    </div>
                  )}
                  {d.carga_max_kg != null && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Zap className="w-3 h-3 text-slate-400" />
                      <span>Carga: <strong className="text-slate-700">{d.carga_max_kg} kg</strong></span>
                    </div>
                  )}
                  {d.numero_serie && (
                    <div className="col-span-2 text-xs text-slate-400 mt-1 font-mono">
                      SN: {d.numero_serie}
                    </div>
                  )}
                  {d.ultima_manutencao && (
                    <div className="col-span-2 text-xs text-slate-400 flex items-center gap-1">
                      <Wrench className="w-3 h-3" />
                      Manutenção: {new Date(d.ultima_manutencao + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <DroneModal
          initial={modal === 'edit' ? selected : null}
          onSave={handleSave}
          onClose={() => { setModal(null); setSelected(null); }}
          saving={saving}
        />
      )}

      {/* Confirm delete */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-slate-800">Excluir drone?</p>
                <p className="text-sm text-slate-500">{confirmDelete.nome} — {confirmDelete.modelo}</p>
              </div>
            </div>
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
