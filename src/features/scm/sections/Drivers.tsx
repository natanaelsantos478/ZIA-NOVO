import { useState, useEffect } from 'react';
import { Plus, Search, User, AlertCircle, X } from 'lucide-react';
import { getDrivers, createDriver, updateDriver, fmtDate } from '../../../lib/scm';
import type { Driver } from '../../../lib/scm';

const STATUS_LABEL: Record<string, string> = {
  available: 'Disponível',
  on_route:  'Em Rota',
  off_duty:  'Folga',
  inactive:  'Inativo',
};
const STATUS_BADGE: Record<string, string> = {
  available: 'bg-green-100 text-green-700',
  on_route:  'bg-blue-100 text-blue-700',
  off_duty:  'bg-amber-100 text-amber-700',
  inactive:  'bg-slate-100 text-slate-500',
};

interface DriverForm {
  name: string; cpf: string; cnh: string; cnh_category: string;
  cnh_expiry: string; phone: string; status: string;
}
const EMPTY: DriverForm = {
  name: '', cpf: '', cnh: '', cnh_category: 'B', cnh_expiry: '', phone: '', status: 'available',
};

export default function Drivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [search, setSearch]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal]       = useState(false);
  const [editId, setEditId]             = useState<string | null>(null);
  const [form, setForm]                 = useState<DriverForm>(EMPTY);
  const [saving, setSaving]             = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true); setError(null);
    try { setDrivers(await getDrivers()); }
    catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  function openNew() { setEditId(null); setForm(EMPTY); setShowModal(true); }
  function openEdit(d: Driver) {
    setEditId(d.id);
    setForm({
      name: d.name, cpf: d.cpf ?? '', cnh: d.cnh ?? '',
      cnh_category: d.cnh_category ?? 'B', cnh_expiry: d.cnh_expiry ?? '',
      phone: d.phone ?? '', status: d.status,
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const payload: Partial<Driver> = {
        name: form.name.trim(), cpf: form.cpf || null, cnh: form.cnh || null,
        cnh_category: form.cnh_category || null,
        cnh_expiry: form.cnh_expiry || null, phone: form.phone || null,
        status: form.status,
      };
      if (editId) { await updateDriver(editId, payload); }
      else { await createDriver(payload); }
      await load(); setShowModal(false);
    } catch (e: unknown) { alert((e as Error).message); }
    finally { setSaving(false); }
  }

  const filtered = drivers.filter((d) => {
    const q = search.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      (d.cpf ?? '').includes(q) ||
      (d.cnh ?? '').toLowerCase().includes(q)
    ) && (filterStatus ? d.status === filterStatus : true);
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (error) return <div className="p-8 text-center text-red-500"><AlertCircle className="w-8 h-8 mx-auto mb-2" /><p>{error}</p></div>;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Motoristas</h2>
          <p className="text-sm text-slate-500">{drivers.length} motorista(s) cadastrado(s)</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg">
          <Plus className="w-4 h-4" /> Novo Motorista
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 flex-1 min-w-[180px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar nome, CPF, CNH..." className="flex-1 text-sm outline-none bg-transparent text-slate-700 placeholder-slate-400" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white">
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Nome', 'CPF', 'CNH', 'Cat.', 'Validade CNH', 'Telefone', 'Status', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-slate-400">
                  <User className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  Nenhum motorista encontrado
                </td></tr>
              )}
              {filtered.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{d.name}</td>
                  <td className="px-4 py-3 font-mono text-slate-600 text-xs">{d.cpf ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-slate-600 text-xs">{d.cnh ?? '—'}</td>
                  <td className="px-4 py-3 text-center font-semibold text-slate-700">{d.cnh_category ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{fmtDate(d.cnh_expiry)}</td>
                  <td className="px-4 py-3 text-slate-600">{d.phone ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[d.status] ?? ''}`}>
                      {STATUS_LABEL[d.status] ?? d.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => openEdit(d)} className="text-emerald-600 hover:text-emerald-700 text-xs font-medium">Editar</button>
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
                <User className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-slate-800">{editId ? 'Editar Motorista' : 'Novo Motorista'}</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nome Completo *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={INP} placeholder="João da Silva" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">CPF</label>
                  <input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} className={INP} placeholder="000.000.000-00" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Telefone</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={INP} placeholder="(11) 99999-9999" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">CNH</label>
                  <input value={form.cnh} onChange={(e) => setForm({ ...form, cnh: e.target.value })} className={INP} placeholder="00000000000" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Categoria</label>
                  <select value={form.cnh_category} onChange={(e) => setForm({ ...form, cnh_category: e.target.value })} className={INP}>
                    {['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Validade CNH</label>
                  <input type="date" value={form.cnh_expiry} onChange={(e) => setForm({ ...form, cnh_expiry: e.target.value })} className={INP} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={INP}>
                  {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.name.trim()}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {editId ? 'Salvar' : 'Cadastrar Motorista'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const INP = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 bg-white';
