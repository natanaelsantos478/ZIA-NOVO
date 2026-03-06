import { useState, useEffect } from 'react';
import { Plus, Search, Route, AlertCircle, X, MapPin } from 'lucide-react';
import { getRoutes, createRoute, updateRoute, getVehicles, getDrivers, fmtDate } from '../../../lib/scm';
import type { Route as ScmRoute, Vehicle, Driver } from '../../../lib/scm';

const STATUS_LABEL: Record<string, string> = {
  planned:   'Planejada',
  active:    'Em Execução',
  completed: 'Concluída',
  cancelled: 'Cancelada',
};
const STATUS_BADGE: Record<string, string> = {
  planned:   'bg-amber-100 text-amber-700',
  active:    'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

interface RouteForm {
  name: string;
  origin: string;
  destination: string;
  vehicle_id: string;
  driver_id: string;
  distance_km: string;
  estimated_duration_min: string;
  scheduled_date: string;
  notes: string;
}

const EMPTY: RouteForm = {
  name: '', origin: '', destination: '', vehicle_id: '', driver_id: '',
  distance_km: '', estimated_duration_min: '', scheduled_date: '', notes: '',
};

export default function Routing() {
  const [routes, setRoutes]   = useState<ScmRoute[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers]   = useState<Driver[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [search, setSearch]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal]       = useState(false);
  const [editId, setEditId]             = useState<string | null>(null);
  const [form, setForm]                 = useState<RouteForm>(EMPTY);
  const [saving, setSaving]             = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [r, v, d] = await Promise.all([getRoutes(), getVehicles(), getDrivers()]);
      setRoutes(r); setVehicles(v); setDrivers(d);
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  function openNew() { setEditId(null); setForm(EMPTY); setShowModal(true); }
  function openEdit(r: ScmRoute) {
    setEditId(r.id);
    setForm({
      name: r.name, origin: r.origin ?? '', destination: r.destination ?? '',
      vehicle_id: r.vehicle_id ?? '', driver_id: r.driver_id ?? '',
      distance_km: r.distance_km?.toString() ?? '',
      estimated_duration_min: r.estimated_duration_min?.toString() ?? '',
      scheduled_date: r.scheduled_date ?? '', notes: r.notes ?? '',
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        origin: form.origin || null,
        destination: form.destination || null,
        stops: [] as { address: string; order: number }[],
        vehicle_id: form.vehicle_id || null,
        driver_id: form.driver_id || null,
        distance_km: form.distance_km ? parseFloat(form.distance_km) : null,
        estimated_duration_min: form.estimated_duration_min ? parseInt(form.estimated_duration_min) : null,
        status: 'planned' as const,
        scheduled_date: form.scheduled_date || null,
        notes: form.notes || null,
      };
      if (editId) { await updateRoute(editId, payload); }
      else { await createRoute(payload); }
      await load(); setShowModal(false);
    } catch (e: unknown) { alert((e as Error).message); }
    finally { setSaving(false); }
  }

  const filtered = routes.filter((r) => {
    const q = search.toLowerCase();
    return (
      (r.name.toLowerCase().includes(q) ||
       (r.origin ?? '').toLowerCase().includes(q) ||
       (r.destination ?? '').toLowerCase().includes(q)) &&
      (filterStatus ? r.status === filterStatus : true)
    );
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (error) return <div className="p-8 text-center text-red-500"><AlertCircle className="w-8 h-8 mx-auto mb-2" /><p>{error}</p></div>;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Roteirização</h2>
          <p className="text-sm text-slate-500">{routes.length} rota(s) cadastrada(s)</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg">
          <Plus className="w-4 h-4" /> Nova Rota
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar rota, origem, destino..." className="flex-1 text-sm outline-none bg-transparent text-slate-700 placeholder-slate-400" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white">
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="grid gap-4">
        {filtered.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
            <Route className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>Nenhuma rota encontrada</p>
          </div>
        )}
        {filtered.map((r) => (
          <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-semibold text-slate-800">{r.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[r.status]}`}>
                    {STATUS_LABEL[r.status]}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{r.origin ?? '—'}</span>
                  <span className="text-slate-300">→</span>
                  <span>{r.destination ?? '—'}</span>
                </div>
                <div className="flex gap-6 text-xs text-slate-500">
                  <span>🚛 {r.scm_vehicles?.plate ?? '—'} {r.scm_vehicles?.model ? `(${r.scm_vehicles.model})` : ''}</span>
                  <span>👤 {r.scm_drivers?.name ?? 'Sem motorista'}</span>
                  {r.distance_km && <span>📏 {r.distance_km} km</span>}
                  {r.estimated_duration_min && <span>⏱ {Math.floor(r.estimated_duration_min / 60)}h{r.estimated_duration_min % 60 > 0 ? `${r.estimated_duration_min % 60}min` : ''}</span>}
                  {r.scheduled_date && <span>📅 {fmtDate(r.scheduled_date)}</span>}
                </div>
              </div>
              <button onClick={() => openEdit(r)} className="text-emerald-600 hover:text-emerald-700 text-xs font-medium ml-4">
                Editar
              </button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Route className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-slate-800">{editId ? 'Editar Rota' : 'Nova Rota'}</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nome da Rota *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={INP} placeholder="Rota SP-RJ Diária" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Origem</label>
                  <input value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} className={INP} placeholder="São Paulo, SP" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Destino</label>
                  <input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} className={INP} placeholder="Rio de Janeiro, RJ" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Veículo</label>
                  <select value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })} className={INP}>
                    <option value="">Selecionar...</option>
                    {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate}{v.model ? ` — ${v.model}` : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Motorista</label>
                  <select value={form.driver_id} onChange={(e) => setForm({ ...form, driver_id: e.target.value })} className={INP}>
                    <option value="">Selecionar...</option>
                    {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Distância (km)</label>
                  <input type="number" value={form.distance_km} onChange={(e) => setForm({ ...form, distance_km: e.target.value })} className={INP} placeholder="450" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Duração Est. (min)</label>
                  <input type="number" value={form.estimated_duration_min} onChange={(e) => setForm({ ...form, estimated_duration_min: e.target.value })} className={INP} placeholder="360" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Data Prevista</label>
                  <input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} className={INP} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Observações</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={`${INP} resize-none`} rows={2} />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.name.trim()}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {editId ? 'Salvar' : 'Criar Rota'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const INP = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 bg-white';
