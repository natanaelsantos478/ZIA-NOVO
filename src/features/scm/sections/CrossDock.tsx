import { useState, useEffect } from 'react';
import { Plus, ArrowRightLeft, AlertCircle } from 'lucide-react';
import { getDockSessions, createDockSession, updateDockSession } from '../../../lib/scm';
import type { DockSession } from '../../../lib/scm';

// Cross-docking: filtra apenas sessões de doca do tipo 'crossdock'

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

export default function CrossDock() {
  const [sessions, setSessions]         = useState<DockSession[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [showNew, setShowNew]           = useState(false);
  const [form, setForm]                 = useState({ dock_number: '', vehicle_plate: '', carrier: '', pallet_count: '', notes: '' });
  const [saving, setSaving]             = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true); setError(null);
    try {
      const all = await getDockSessions();
      setSessions(all.filter((s) => s.type === 'crossdock'));
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  async function handleCreate() {
    if (!form.dock_number) return;
    setSaving(true);
    try {
      await createDockSession({
        dock_number: parseInt(form.dock_number),
        vehicle_plate: form.vehicle_plate || null,
        carrier: form.carrier || null,
        type: 'crossdock',
        status: 'scheduled',
        pallet_count: form.pallet_count ? parseInt(form.pallet_count) : null,
        notes: form.notes || null,
      });
      await load(); setShowNew(false);
      setForm({ dock_number: '', vehicle_plate: '', carrier: '', pallet_count: '', notes: '' });
    } catch (e: unknown) { alert((e as Error).message); }
    finally { setSaving(false); }
  }

  async function advance(s: DockSession) {
    const flow: string[] = ['scheduled', 'docking', 'unloading', 'loading', 'completed'];
    const idx = flow.indexOf(s.status);
    if (idx < 0 || idx >= flow.length - 1) return;
    try {
      await updateDockSession(s.id, { status: flow[idx + 1] });
      await load();
    } catch (e: unknown) { alert((e as Error).message); }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (error) return <div className="p-8 text-center text-red-500"><AlertCircle className="w-8 h-8 mx-auto mb-2" /><p>{error}</p></div>;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Cross-Docking</h2>
          <p className="text-sm text-slate-500">Transferências diretas sem armazenagem — {sessions.length} operação(ões)</p>
        </div>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg">
          <Plus className="w-4 h-4" /> Nova Operação
        </button>
      </div>

      {/* Kanban-style flow */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {['scheduled', 'docking', 'unloading', 'loading', 'completed'].map((status) => {
          const items = sessions.filter((s) => s.status === status);
          return (
            <div key={status} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className={`inline-flex px-2 py-1 rounded-md text-xs font-semibold mb-3 ${STATUS_BADGE[status]}`}>
                {STATUS_LABEL[status]}
              </div>
              <p className="text-xs text-slate-400 mb-3">{items.length} item(ns)</p>
              <div className="space-y-2">
                {items.map((s) => (
                  <div key={s.id} className="border border-slate-100 rounded-lg p-3 bg-slate-50">
                    <p className="font-mono font-semibold text-slate-800 text-xs">Doca {s.dock_number}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{s.vehicle_plate ?? '—'}</p>
                    <p className="text-xs text-slate-400">{s.carrier ?? '—'}</p>
                    {s.pallet_count && <p className="text-xs text-slate-400 mt-1">{s.pallet_count} paletes</p>}
                    {status !== 'completed' && status !== 'cancelled' && (
                      <button
                        onClick={() => advance(s)}
                        className="mt-2 text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                      >
                        Avançar <ArrowRightLeft className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
                {items.length === 0 && (
                  <p className="text-xs text-slate-300 text-center py-4">Vazio</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* New operation modal */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-slate-800">Nova Operação Cross-Docking</h3>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Número da Doca *</label>
                  <input type="number" value={form.dock_number} onChange={(e) => setForm({ ...form, dock_number: e.target.value })} className={INP} placeholder="1" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Qtd. Paletes</label>
                  <input type="number" value={form.pallet_count} onChange={(e) => setForm({ ...form, pallet_count: e.target.value })} className={INP} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Placa do Veículo</label>
                <input value={form.vehicle_plate} onChange={(e) => setForm({ ...form, vehicle_plate: e.target.value.toUpperCase() })} className={INP} placeholder="ABC-1234" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Transportadora</label>
                <input value={form.carrier} onChange={(e) => setForm({ ...form, carrier: e.target.value })} className={INP} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Observações</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={`${INP} resize-none`} rows={2} />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-slate-100">
              <button onClick={() => setShowNew(false)} className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm">Cancelar</button>
              <button onClick={handleCreate} disabled={saving || !form.dock_number}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Criar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const INP = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 bg-white';
