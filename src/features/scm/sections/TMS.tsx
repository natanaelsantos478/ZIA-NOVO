import { useState, useEffect } from 'react';
import { Plus, Search, Package, AlertCircle, X, Send } from 'lucide-react';
import {
  getShipments, createShipment, updateShipment,
  getVehicles, getDrivers, fmtDate, fmtCurrency,
} from '../../../lib/scm';
import type { Shipment, Vehicle, Driver } from '../../../lib/scm';

const STATUS_LABEL: Record<string, string> = {
  pending:    'Pendente',
  in_transit: 'Em Trânsito',
  delivered:  'Entregue',
  cancelled:  'Cancelado',
  returned:   'Devolvido',
};
const STATUS_BADGE: Record<string, string> = {
  pending:    'bg-amber-100 text-amber-700',
  in_transit: 'bg-blue-100 text-blue-700',
  delivered:  'bg-green-100 text-green-700',
  cancelled:  'bg-slate-100 text-slate-500',
  returned:   'bg-rose-100 text-rose-700',
};
const TYPE_LABEL: Record<string, string> = {
  ftl:     'FTL (Carga Fechada)',
  ltl:     'LTL (Carga Fracionada)',
  express: 'Expresso',
};

interface ShipmentForm {
  code: string;
  origin: string;
  destination: string;
  carrier: string;
  vehicle_id: string;
  driver_id: string;
  type: string;
  freight_value: string;
  weight_kg: string;
  volume_m3: string;
  scheduled_date: string;
  estimated_delivery: string;
  tracking_code: string;
  notes: string;
}

const EMPTY: ShipmentForm = {
  code: '', origin: '', destination: '', carrier: '', vehicle_id: '',
  driver_id: '', type: 'ftl', freight_value: '', weight_kg: '', volume_m3: '',
  scheduled_date: '', estimated_delivery: '', tracking_code: '', notes: '',
};

export default function TMS() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [vehicles, setVehicles]   = useState<Vehicle[]>([]);
  const [drivers, setDrivers]     = useState<Driver[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [search, setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal]       = useState(false);
  const [editId, setEditId]             = useState<string | null>(null);
  const [form, setForm]                 = useState<ShipmentForm>(EMPTY);
  const [saving, setSaving]             = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [s, v, d] = await Promise.all([getShipments(), getVehicles(), getDrivers()]);
      setShipments(s); setVehicles(v); setDrivers(d);
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  function openNew() { setEditId(null); setForm(EMPTY); setShowModal(true); }
  function openEdit(s: Shipment) {
    setEditId(s.id);
    setForm({
      code: s.code, origin: s.origin ?? '', destination: s.destination ?? '',
      carrier: s.carrier ?? '', vehicle_id: s.vehicle_id ?? '',
      driver_id: s.driver_id ?? '', type: s.type ?? 'ftl',
      freight_value: s.freight_value?.toString() ?? '',
      weight_kg: s.weight_kg?.toString() ?? '',
      volume_m3: s.volume_m3?.toString() ?? '',
      scheduled_date: s.scheduled_date ?? '',
      estimated_delivery: s.estimated_delivery ?? '',
      tracking_code: s.tracking_code ?? '', notes: s.notes ?? '',
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.code.trim()) return;
    setSaving(true);
    try {
      const payload: Partial<Shipment> = {
        code: form.code.trim(),
        origin: form.origin || null,
        destination: form.destination || null,
        carrier: form.carrier || null,
        vehicle_id: form.vehicle_id || null,
        driver_id: form.driver_id || null,
        type: form.type || null,
        freight_value: form.freight_value ? parseFloat(form.freight_value) : null,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
        volume_m3: form.volume_m3 ? parseFloat(form.volume_m3) : null,
        scheduled_date: form.scheduled_date || null,
        estimated_delivery: form.estimated_delivery || null,
        tracking_code: form.tracking_code || null,
        notes: form.notes || null,
      };
      if (editId) { await updateShipment(editId, payload); }
      else { await createShipment(payload); }
      await load(); setShowModal(false);
    } catch (e: unknown) { alert((e as Error).message); }
    finally { setSaving(false); }
  }

  const filtered = shipments.filter((s) => {
    const q = search.toLowerCase();
    return (
      (s.code.toLowerCase().includes(q) ||
       (s.carrier ?? '').toLowerCase().includes(q) ||
       (s.origin ?? '').toLowerCase().includes(q) ||
       (s.destination ?? '').toLowerCase().includes(q)) &&
      (filterStatus ? s.status === filterStatus : true)
    );
  });

  if (loading) return <Spinner />;
  if (error) return <Err msg={error} />;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">TMS — Gestão de Fretes</h2>
          <p className="text-sm text-slate-500">{shipments.length} embarque(s)</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg">
          <Plus className="w-4 h-4" /> Novo Embarque
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar código, transportadora, origem..." className="flex-1 text-sm outline-none bg-transparent text-slate-700 placeholder-slate-400" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white">
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Código', 'Tipo', 'Origem → Destino', 'Transportadora', 'Veículo', 'Valor do Frete', 'Peso', 'Entrega Prev.', 'Status', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="text-center py-12 text-slate-400">
                  <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  Nenhum embarque encontrado
                </td></tr>
              )}
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-slate-800">{s.code}</td>
                  <td className="px-4 py-3 text-slate-600">{TYPE_LABEL[s.type ?? ''] ?? s.type ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{s.origin ?? '—'} → {s.destination ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{s.carrier ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{s.scm_vehicles?.plate ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-700 font-medium">{fmtCurrency(s.freight_value)}</td>
                  <td className="px-4 py-3 text-slate-600">{s.weight_kg ? `${s.weight_kg} kg` : '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{fmtDate(s.estimated_delivery)}</td>
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-slate-800">{editId ? 'Editar Embarque' : 'Novo Embarque'}</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <F label="Código *"><input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className={I} placeholder="EMB-2024-001" /></F>
                <F label="Tipo"><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={I}>
                  {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select></F>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <F label="Origem"><input value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} className={I} placeholder="São Paulo, SP" /></F>
                <F label="Destino"><input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} className={I} placeholder="Rio de Janeiro, RJ" /></F>
              </div>
              <F label="Transportadora"><input value={form.carrier} onChange={(e) => setForm({ ...form, carrier: e.target.value })} className={I} placeholder="Transportadora XYZ" /></F>
              <div className="grid grid-cols-2 gap-4">
                <F label="Veículo"><select value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })} className={I}>
                  <option value="">Selecionar...</option>
                  {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate} {v.model ? `— ${v.model}` : ''}</option>)}
                </select></F>
                <F label="Motorista"><select value={form.driver_id} onChange={(e) => setForm({ ...form, driver_id: e.target.value })} className={I}>
                  <option value="">Selecionar...</option>
                  {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select></F>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <F label="Valor do Frete (R$)"><input type="number" value={form.freight_value} onChange={(e) => setForm({ ...form, freight_value: e.target.value })} className={I} placeholder="1500.00" /></F>
                <F label="Peso (kg)"><input type="number" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} className={I} placeholder="1200" /></F>
                <F label="Volume (m³)"><input type="number" value={form.volume_m3} onChange={(e) => setForm({ ...form, volume_m3: e.target.value })} className={I} placeholder="4.5" /></F>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <F label="Data de Coleta"><input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} className={I} /></F>
                <F label="Entrega Prevista"><input type="date" value={form.estimated_delivery} onChange={(e) => setForm({ ...form, estimated_delivery: e.target.value })} className={I} /></F>
              </div>
              <F label="Código de Rastreio"><input value={form.tracking_code} onChange={(e) => setForm({ ...form, tracking_code: e.target.value })} className={I} placeholder="BR123456789XX" /></F>
              <F label="Observações"><textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={`${I} resize-none`} rows={2} /></F>
            </div>
            <div className="flex gap-3 p-6 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.code.trim()}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                {editId ? 'Salvar' : 'Criar Embarque'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>{children}</div>;
}
const I = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 bg-white';
function Spinner() { return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>; }
function Err({ msg }: { msg: string }) { return <div className="p-8 text-center text-red-500"><AlertCircle className="w-8 h-8 mx-auto mb-2" /><p>{msg}</p></div>; }
