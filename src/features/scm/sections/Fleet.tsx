import { useState, useEffect } from 'react';
import { Plus, Search, Truck, AlertCircle, X, Wrench } from 'lucide-react';
import {
  getVehicles, createVehicle, updateVehicle,
  getDrivers, fmtDate,
} from '../../../lib/scm';
import type { Vehicle, Driver } from '../../../lib/scm';

type VehicleStatus = 'available' | 'in_transit' | 'maintenance' | 'inactive';
type FuelType      = 'diesel' | 'gasoline' | 'electric' | 'flex';
type VehicleType   = 'truck' | 'van' | 'moto' | 'car' | 'semi';

const STATUS_LABEL: Record<string, string> = {
  available:   'Disponível',
  in_transit:  'Em Trânsito',
  maintenance: 'Manutenção',
  inactive:    'Inativo',
};
const STATUS_BADGE: Record<string, string> = {
  available:   'bg-green-100 text-green-700',
  in_transit:  'bg-blue-100 text-blue-700',
  maintenance: 'bg-amber-100 text-amber-700',
  inactive:    'bg-slate-100 text-slate-500',
};
const TYPE_LABEL: Record<string, string> = {
  truck: 'Caminhão', van: 'Van', moto: 'Moto', car: 'Carro', semi: 'Semi-reboque',
};
const FUEL_LABEL: Record<string, string> = {
  diesel: 'Diesel', gasoline: 'Gasolina', electric: 'Elétrico', flex: 'Flex',
};

interface VehicleForm {
  plate: string;
  model: string;
  brand: string;
  type: VehicleType;
  capacity_kg: string;
  fuel_type: FuelType;
  year: string;
  mileage_km: string;
  last_maintenance: string;
  next_maintenance: string;
  driver_id: string;
  notes: string;
}

const EMPTY_FORM: VehicleForm = {
  plate: '', model: '', brand: '', type: 'truck', capacity_kg: '',
  fuel_type: 'diesel', year: '', mileage_km: '', last_maintenance: '',
  next_maintenance: '', driver_id: '', notes: '',
};

export default function Fleet() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers]   = useState<Driver[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [search, setSearch]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal]       = useState(false);
  const [editId, setEditId]             = useState<string | null>(null);
  const [form, setForm]                 = useState<VehicleForm>(EMPTY_FORM);
  const [saving, setSaving]             = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [v, d] = await Promise.all([getVehicles(), getDrivers()]);
      setVehicles(v);
      setDrivers(d);
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEdit(v: Vehicle) {
    setEditId(v.id);
    setForm({
      plate: v.plate,
      model: v.model ?? '',
      brand: v.brand ?? '',
      type: (v.type as VehicleType) ?? 'truck',
      capacity_kg: v.capacity_kg?.toString() ?? '',
      fuel_type: (v.fuel_type as FuelType) ?? 'diesel',
      year: v.year?.toString() ?? '',
      mileage_km: v.mileage_km?.toString() ?? '',
      last_maintenance: v.last_maintenance ?? '',
      next_maintenance: v.next_maintenance ?? '',
      driver_id: v.driver_id ?? '',
      notes: v.notes ?? '',
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.plate.trim()) return;
    setSaving(true);
    try {
      const payload: Partial<Vehicle> = {
        plate: form.plate.trim(),
        model: form.model || null,
        brand: form.brand || null,
        type: form.type,
        capacity_kg: form.capacity_kg ? parseFloat(form.capacity_kg) : null,
        fuel_type: form.fuel_type || null,
        year: form.year ? parseInt(form.year) : null,
        mileage_km: form.mileage_km ? parseFloat(form.mileage_km) : null,
        last_maintenance: form.last_maintenance || null,
        next_maintenance: form.next_maintenance || null,
        driver_id: form.driver_id || null,
        notes: form.notes || null,
      };
      if (editId) {
        await updateVehicle(editId, payload);
      } else {
        await createVehicle(payload);
      }
      await load();
      setShowModal(false);
    } catch (e: unknown) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const filtered = vehicles.filter((v) => {
    const q = search.toLowerCase();
    const matchSearch =
      v.plate.toLowerCase().includes(q) ||
      (v.model ?? '').toLowerCase().includes(q) ||
      (v.brand ?? '').toLowerCase().includes(q);
    const matchStatus = filterStatus ? v.status === filterStatus : true;
    return matchSearch && matchStatus;
  });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="p-8 text-center text-red-500">
      <AlertCircle className="w-8 h-8 mx-auto mb-2" />
      <p>{error}</p>
    </div>
  );

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Gestão de Frota</h2>
          <p className="text-sm text-slate-500">{vehicles.length} veículo(s) cadastrado(s)</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> Novo Veículo
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar placa, modelo..."
            className="flex-1 text-sm outline-none bg-transparent text-slate-700 placeholder-slate-400"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white"
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* KPI chips */}
      <div className="flex gap-3 flex-wrap">
        {Object.entries(STATUS_LABEL).map(([s, label]) => {
          const count = vehicles.filter((v) => v.status === s).length;
          return (
            <div key={s} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${STATUS_BADGE[s]}`}>
              {label}: {count}
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Placa', 'Tipo', 'Marca/Modelo', 'Ano', 'Motorista', 'Capacidade', 'Km', 'Próx. Manutenção', 'Status', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    <Truck className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    Nenhum veículo encontrado
                  </td>
                </tr>
              )}
              {filtered.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-slate-800">{v.plate}</td>
                  <td className="px-4 py-3 text-slate-600">{TYPE_LABEL[v.type] ?? v.type}</td>
                  <td className="px-4 py-3 text-slate-700">{[v.brand, v.model].filter(Boolean).join(' ') || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{v.year ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{v.scm_drivers?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{v.capacity_kg ? `${v.capacity_kg.toLocaleString('pt-BR')} kg` : '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{v.mileage_km ? `${v.mileage_km.toLocaleString('pt-BR')} km` : '—'}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {v.next_maintenance ? (
                      <span className={new Date(v.next_maintenance) < new Date() ? 'text-red-600 font-medium' : ''}>
                        {fmtDate(v.next_maintenance)}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[v.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {STATUS_LABEL[v.status] ?? v.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openEdit(v)}
                      className="text-emerald-600 hover:text-emerald-700 text-xs font-medium"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-slate-800">{editId ? 'Editar Veículo' : 'Novo Veículo'}</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Placa *" required>
                  <input value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value.toUpperCase() })}
                    className={INPUT} placeholder="ABC-1234" />
                </Field>
                <Field label="Tipo">
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as VehicleType })} className={INPUT}>
                    {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Marca">
                  <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className={INPUT} placeholder="Mercedes-Benz" />
                </Field>
                <Field label="Modelo">
                  <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className={INPUT} placeholder="Atego 2430" />
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Ano">
                  <input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} className={INPUT} placeholder="2022" />
                </Field>
                <Field label="Combustível">
                  <select value={form.fuel_type} onChange={(e) => setForm({ ...form, fuel_type: e.target.value as FuelType })} className={INPUT}>
                    {Object.entries(FUEL_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Field>
                <Field label="Capacidade (kg)">
                  <input type="number" value={form.capacity_kg} onChange={(e) => setForm({ ...form, capacity_kg: e.target.value })} className={INPUT} placeholder="5000" />
                </Field>
              </div>
              <Field label="Hodômetro (km)">
                <input type="number" value={form.mileage_km} onChange={(e) => setForm({ ...form, mileage_km: e.target.value })} className={INPUT} placeholder="85000" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Última Manutenção">
                  <input type="date" value={form.last_maintenance} onChange={(e) => setForm({ ...form, last_maintenance: e.target.value })} className={INPUT} />
                </Field>
                <Field label="Próxima Manutenção">
                  <input type="date" value={form.next_maintenance} onChange={(e) => setForm({ ...form, next_maintenance: e.target.value })} className={INPUT} />
                </Field>
              </div>
              <Field label="Motorista">
                <select value={form.driver_id} onChange={(e) => setForm({ ...form, driver_id: e.target.value })} className={INPUT}>
                  <option value="">Sem motorista</option>
                  {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </Field>
              <Field label="Observações">
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className={`${INPUT} resize-none`} rows={2} />
              </Field>
            </div>

            <div className="flex gap-3 p-6 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm hover:bg-slate-50">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.plate.trim()}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
              >
                {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Wrench className="w-4 h-4" />}
                {editId ? 'Salvar' : 'Cadastrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

const INPUT = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 bg-white';
