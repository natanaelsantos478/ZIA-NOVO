import { useState, useEffect } from 'react';
import { Plus, Search, Building, AlertCircle, X } from 'lucide-react';
import { getDockSessions, createDockSession, updateDockSession, fmtDate } from '../../../lib/scm';
import type { DockSession } from '../../../lib/scm';

const STATUS_LABEL: Record<string, string> = {
  scheduled:  'Agendado',
  docking:    'Encostando',
  unloading:  'Descarregando',
  loading:    'Carregando',
  completed:  'Concluído',
  cancelled:  'Cancelado',
};
const STATUS_BADGE: Record<string, string> = {
  scheduled:  'bg-amber-100 text-amber-700',
  docking:    'bg-sky-100 text-sky-700',
  unloading:  'bg-violet-100 text-violet-700',
  loading:    'bg-blue-100 text-blue-700',
  completed:  'bg-green-100 text-green-700',
  cancelled:  'bg-slate-100 text-slate-500',
};
const TYPE_LABEL: Record<string, string> = {
  inbound:   'Entrada (Inbound)',
  outbound:  'Saída (Outbound)',
  crossdock: 'Cross-Docking',
};

interface DockForm {
  dock_number: string;
  vehicle_plate: string;
  carrier: string;
  type: string;
  status: string;
  scheduled_at: string;
  pallet_count: string;
  notes: string;
}

const EMPTY: DockForm = {
  dock_number: '', vehicle_plate: '', carrier: '', type: 'inbound',
  status: 'scheduled', scheduled_at: '', pallet_count: '', notes: '',
};

export default function WMS() {
  const [sessions, setSessions] = useState<DockSession[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [search, setSearch]     = useState('');
  const [filterType, setFilterType]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal]       = useState(false);
  const [editId, setEditId]             = useState<string | null>(null);
  const [form, setForm]                 = useState<DockForm>(EMPTY);
  const [saving, setSaving]             = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true); setError(null);
    try { setSessions(await getDockSessions()); }
    catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  function openNew() { setEditId(null); setForm(EMPTY); setShowModal(true); }
  function openEdit(s: DockSession) {
    setEditId(s.id);
    setForm({
      dock_number: s.dock_number.toString(),
      vehicle_plate: s.vehicle_plate ?? '',
      carrier: s.carrier ?? '',
      type: s.type,
      status: s.status,
      scheduled_at: s.scheduled_at ? s.scheduled_at.slice(0, 16) : '',
      pallet_count: s.pallet_count?.toString() ?? '',
      notes: s.notes ?? '',
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.dock_number) return;
    setSaving(true);
    try {
      const payload: Partial<DockSession> = {
        dock_number: parseInt(form.dock_number),
        vehicle_plate: form.vehicle_plate || null,
        carrier: form.carrier || null,
        type: form.type,
        status: form.status,
        scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
        pallet_count: form.pallet_count ? parseInt(form.pallet_count) : null,
        notes: form.notes || null,
      };
      if (editId) { await updateDockSession(editId, payload); }
      else { await createDockSession(payload); }
      await load(); setShowModal(false);
    } catch (e: unknown) { alert((e as Error).message); }
    finally { setSaving(false); }
  }

  const filtered = sessions.filter((s) => {
    const q = search.toLowerCase();
    return (
      (s.vehicle_plate ?? '').toLowerCase().includes(q) ||
      (s.carrier ?? '').toLowerCase().includes(q) ||
      s.dock_number.toString().includes(q)
    ) && (filterType ? s.type === filterType : true)
      && (filterStatus ? s.status === filterStatus : true);
  });

  // Group by dock
  const dockMap = new Map<number, DockSession[]>();
  filtered.forEach((s) => {
    const arr = dockMap.get(s.dock_number) ?? [];
    arr.push(s); dockMap.set(s.dock_number, arr);
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (error) return <div className="p-8 text-center text-red-500"><AlertCircle className="w-8 h-8 mx-auto mb-2" /><p>{error}</p></div>;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Gestão de Docas (WMS)</h2>
          <p className="text-sm text-slate-500">{sessions.length} sessão(ões) de doca</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg">
          <Plus className="w-4 h-4" /> Agendar Doca
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 flex-1 min-w-[180px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar placa, transportadora..." className="flex-1 text-sm outline-none bg-transparent text-slate-700 placeholder-slate-400" />
        </div>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white">
          <option value="">Todos os tipos</option>
          {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white">
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Dock grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          <Building className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Nenhuma sessão de doca encontrada</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Doca', 'Tipo', 'Placa / Transportadora', 'Paletes', 'Agendado para', 'Iniciado', 'Concluído', 'Status', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 font-bold text-sm flex items-center justify-center">
                        {s.dock_number}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{TYPE_LABEL[s.type]}</td>
                    <td className="px-4 py-3">
                      <p className="font-mono font-semibold text-slate-800">{s.vehicle_plate ?? '—'}</p>
                      <p className="text-xs text-slate-400">{s.carrier ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{s.pallet_count ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {s.scheduled_at ? new Date(s.scheduled_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {s.started_at ? new Date(s.started_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {s.completed_at ? new Date(s.completed_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[s.status] ?? ''}`}>
                        {STATUS_LABEL[s.status] ?? s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => openEdit(s)} className="text-emerald-600 hover:text-emerald-700 text-xs font-medium">Editar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-slate-800">{editId ? 'Editar Sessão' : 'Agendar Doca'}</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Número da Doca *</label>
                  <input type="number" value={form.dock_number} onChange={(e) => setForm({ ...form, dock_number: e.target.value })} className={INP} placeholder="1" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={INP}>
                    {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Placa do Veículo</label>
                  <input value={form.vehicle_plate} onChange={(e) => setForm({ ...form, vehicle_plate: e.target.value.toUpperCase() })} className={INP} placeholder="ABC-1234" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Transportadora</label>
                  <input value={form.carrier} onChange={(e) => setForm({ ...form, carrier: e.target.value })} className={INP} placeholder="Transportadora XYZ" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={INP}>
                    {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Qtd. Paletes</label>
                  <input type="number" value={form.pallet_count} onChange={(e) => setForm({ ...form, pallet_count: e.target.value })} className={INP} placeholder="12" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Agendado para</label>
                <input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} className={INP} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Observações</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={`${INP} resize-none`} rows={2} />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.dock_number}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {editId ? 'Salvar' : 'Agendar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const INP = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 bg-white';
