import { useState, useEffect } from 'react';
import { Plus, Search, Box, AlertCircle, X } from 'lucide-react';
import { getPackingOrders, createPackingOrder, updatePackingOrder, getShipments, fmtDate } from '../../../lib/scm';
import type { PackingOrder, Shipment } from '../../../lib/scm';

const STATUS_LABEL: Record<string, string> = {
  pending:     'Pendente',
  in_progress: 'Em Andamento',
  packed:      'Embalado',
  dispatched:  'Despachado',
};
const STATUS_BADGE: Record<string, string> = {
  pending:     'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  packed:      'bg-violet-100 text-violet-700',
  dispatched:  'bg-green-100 text-green-700',
};

interface PackForm {
  order_ref: string;
  shipment_id: string;
  status: string;
  items_count: string;
  box_count: string;
  weight_kg: string;
  packer_name: string;
  notes: string;
}

const EMPTY: PackForm = {
  order_ref: '', shipment_id: '', status: 'pending', items_count: '',
  box_count: '', weight_kg: '', packer_name: '', notes: '',
};

export default function Packing() {
  const [orders, setOrders]     = useState<PackingOrder[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [search, setSearch]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal]       = useState(false);
  const [editId, setEditId]             = useState<string | null>(null);
  const [form, setForm]                 = useState<PackForm>(EMPTY);
  const [saving, setSaving]             = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [o, s] = await Promise.all([getPackingOrders(), getShipments()]);
      setOrders(o); setShipments(s);
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  function openNew() { setEditId(null); setForm(EMPTY); setShowModal(true); }
  function openEdit(o: PackingOrder) {
    setEditId(o.id);
    setForm({
      order_ref: o.order_ref, shipment_id: o.shipment_id ?? '',
      status: o.status, items_count: o.items_count?.toString() ?? '',
      box_count: o.box_count?.toString() ?? '', weight_kg: o.weight_kg?.toString() ?? '',
      packer_name: o.packer_name ?? '', notes: o.notes ?? '',
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.order_ref.trim()) return;
    setSaving(true);
    try {
      const payload: Partial<PackingOrder> = {
        order_ref: form.order_ref.trim(),
        shipment_id: form.shipment_id || null,
        status: form.status,
        items_count: form.items_count ? parseInt(form.items_count) : null,
        box_count: form.box_count ? parseInt(form.box_count) : null,
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
        packer_name: form.packer_name || null,
        notes: form.notes || null,
      };
      if (editId) { await updatePackingOrder(editId, payload); }
      else { await createPackingOrder(payload); }
      await load(); setShowModal(false);
    } catch (e: unknown) { alert((e as Error).message); }
    finally { setSaving(false); }
  }

  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    return (
      o.order_ref.toLowerCase().includes(q) ||
      (o.packer_name ?? '').toLowerCase().includes(q) ||
      (o.scm_shipments?.code ?? '').toLowerCase().includes(q)
    ) && (filterStatus ? o.status === filterStatus : true);
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (error) return <div className="p-8 text-center text-red-500"><AlertCircle className="w-8 h-8 mx-auto mb-2" /><p>{error}</p></div>;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Embalagem e Packing</h2>
          <p className="text-sm text-slate-500">{orders.length} ordem(ns) de embalagem</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg">
          <Plus className="w-4 h-4" /> Nova Ordem
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 flex-1 min-w-[180px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar ref., embalador..." className="flex-1 text-sm outline-none bg-transparent text-slate-700 placeholder-slate-400" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white">
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Status summary */}
      <div className="flex gap-3 flex-wrap">
        {Object.entries(STATUS_LABEL).map(([s, label]) => {
          const count = orders.filter((o) => o.status === s).length;
          return (
            <div key={s} className={`px-3 py-1.5 rounded-full text-xs font-medium ${STATUS_BADGE[s]}`}>
              {label}: {count}
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Referência', 'Embarque', 'Embalador', 'Itens', 'Caixas', 'Peso (kg)', 'Embalado em', 'Status', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="text-center py-12 text-slate-400">
                  <Box className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  Nenhuma ordem encontrada
                </td></tr>
              )}
              {filtered.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-slate-800">{o.order_ref}</td>
                  <td className="px-4 py-3 font-mono text-slate-600 text-xs">{o.scm_shipments?.code ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{o.packer_name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600 text-center">{o.items_count ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600 text-center">{o.box_count ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{o.weight_kg ? `${o.weight_kg} kg` : '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{o.packed_at ? fmtDate(o.packed_at.slice(0, 10)) : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[o.status] ?? ''}`}>
                      {STATUS_LABEL[o.status] ?? o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => openEdit(o)} className="text-emerald-600 hover:text-emerald-700 text-xs font-medium">Editar</button>
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
                <Box className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-slate-800">{editId ? 'Editar Ordem' : 'Nova Ordem de Embalagem'}</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Referência *</label>
                  <input value={form.order_ref} onChange={(e) => setForm({ ...form, order_ref: e.target.value })} className={INP} placeholder="PACK-2024-001" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={INP}>
                    {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Embarque</label>
                <select value={form.shipment_id} onChange={(e) => setForm({ ...form, shipment_id: e.target.value })} className={INP}>
                  <option value="">Sem vínculo</option>
                  {shipments.map((s) => <option key={s.id} value={s.id}>{s.code}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Embalador</label>
                <input value={form.packer_name} onChange={(e) => setForm({ ...form, packer_name: e.target.value })} className={INP} placeholder="Nome do embalador" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Qtd. Itens</label>
                  <input type="number" value={form.items_count} onChange={(e) => setForm({ ...form, items_count: e.target.value })} className={INP} placeholder="24" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Qtd. Caixas</label>
                  <input type="number" value={form.box_count} onChange={(e) => setForm({ ...form, box_count: e.target.value })} className={INP} placeholder="3" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Peso Total (kg)</label>
                  <input type="number" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} className={INP} placeholder="15.5" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Observações</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={`${INP} resize-none`} rows={2} />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.order_ref.trim()}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {editId ? 'Salvar' : 'Criar Ordem'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const INP = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 bg-white';
