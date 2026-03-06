import { useState, useEffect } from 'react';
import { Plus, Search, Navigation, AlertCircle, X, MapPin } from 'lucide-react';
import { getDeliveries, createDelivery, updateDelivery, getShipments, fmtDate } from '../../../lib/scm';
import type { Delivery, Shipment } from '../../../lib/scm';

const STATUS_LABEL: Record<string, string> = {
  pending:           'Pendente',
  out_for_delivery:  'Saiu para Entrega',
  delivered:         'Entregue',
  attempted:         'Tentativa Falhou',
  returned:          'Devolvido',
};
const STATUS_BADGE: Record<string, string> = {
  pending:           'bg-amber-100 text-amber-700',
  out_for_delivery:  'bg-blue-100 text-blue-700',
  delivered:         'bg-green-100 text-green-700',
  attempted:         'bg-orange-100 text-orange-700',
  returned:          'bg-rose-100 text-rose-700',
};
const PROOF_LABEL: Record<string, string> = {
  signature: 'Assinatura', photo: 'Foto', code: 'Código',
};

interface DeliveryForm {
  shipment_id: string;
  recipient_name: string;
  recipient_address: string;
  recipient_phone: string;
  scheduled_date: string;
  proof_type: string;
  notes: string;
}

const EMPTY: DeliveryForm = {
  shipment_id: '', recipient_name: '', recipient_address: '',
  recipient_phone: '', scheduled_date: '', proof_type: 'signature', notes: '',
};

export default function LastMile() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [shipments, setShipments]   = useState<Shipment[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [search, setSearch]         = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal]       = useState(false);
  const [editId, setEditId]             = useState<string | null>(null);
  const [form, setForm]                 = useState<DeliveryForm>(EMPTY);
  const [saving, setSaving]             = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [d, s] = await Promise.all([getDeliveries(), getShipments()]);
      setDeliveries(d); setShipments(s);
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  function openNew() { setEditId(null); setForm(EMPTY); setShowModal(true); }
  function openEdit(d: Delivery) {
    setEditId(d.id);
    setForm({
      shipment_id: d.shipment_id ?? '',
      recipient_name: d.recipient_name ?? '',
      recipient_address: d.recipient_address ?? '',
      recipient_phone: d.recipient_phone ?? '',
      scheduled_date: d.scheduled_date ?? '',
      proof_type: d.proof_type ?? 'signature',
      notes: d.notes ?? '',
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.recipient_name.trim()) return;
    setSaving(true);
    try {
      const payload: Partial<Delivery> = {
        shipment_id: form.shipment_id || null,
        recipient_name: form.recipient_name.trim(),
        recipient_address: form.recipient_address || null,
        recipient_phone: form.recipient_phone || null,
        scheduled_date: form.scheduled_date || null,
        proof_type: form.proof_type || null,
        notes: form.notes || null,
      };
      if (editId) { await updateDelivery(editId, payload); }
      else { await createDelivery(payload); }
      await load(); setShowModal(false);
    } catch (e: unknown) { alert((e as Error).message); }
    finally { setSaving(false); }
  }

  const filtered = deliveries.filter((d) => {
    const q = search.toLowerCase();
    return (
      ((d.recipient_name ?? '').toLowerCase().includes(q) ||
       (d.recipient_address ?? '').toLowerCase().includes(q) ||
       (d.scm_shipments?.code ?? '').toLowerCase().includes(q)) &&
      (filterStatus ? d.status === filterStatus : true)
    );
  });

  const counts = Object.keys(STATUS_LABEL).map((s) => ({
    status: s,
    count: deliveries.filter((d) => d.status === s).length,
  }));

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (error) return <div className="p-8 text-center text-red-500"><AlertCircle className="w-8 h-8 mx-auto mb-2" /><p>{error}</p></div>;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Rastreamento Last-Mile</h2>
          <p className="text-sm text-slate-500">{deliveries.length} entrega(s)</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg">
          <Plus className="w-4 h-4" /> Nova Entrega
        </button>
      </div>

      {/* Status chips */}
      <div className="flex gap-2 flex-wrap">
        {counts.map(({ status, count }) => (
          <button
            key={status}
            onClick={() => setFilterStatus(filterStatus === status ? '' : status)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              filterStatus === status
                ? STATUS_BADGE[status] + ' ring-2 ring-offset-1'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {STATUS_LABEL[status]}: {count}
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 flex-1">
          <Search className="w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar destinatário, endereço, embarque..." className="flex-1 text-sm outline-none bg-transparent text-slate-700 placeholder-slate-400" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Embarque', 'Destinatário', 'Endereço', 'Telefone', 'Data Prevista', 'Tentativas', 'Comprovante', 'Status', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="text-center py-12 text-slate-400">
                  <Navigation className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  Nenhuma entrega encontrada
                </td></tr>
              )}
              {filtered.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-slate-600 text-xs">{d.scm_shipments?.code ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{d.recipient_name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-[200px]">
                    <span className="flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-400" />
                      <span className="truncate">{d.recipient_address ?? '—'}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{d.recipient_phone ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{fmtDate(d.scheduled_date)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-semibold ${d.attempts > 1 ? 'text-orange-600' : 'text-slate-600'}`}>{d.attempts}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{PROOF_LABEL[d.proof_type ?? ''] ?? d.proof_type ?? '—'}</td>
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
                <Navigation className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-slate-800">{editId ? 'Editar Entrega' : 'Nova Entrega'}</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Embarque</label>
                <select value={form.shipment_id} onChange={(e) => setForm({ ...form, shipment_id: e.target.value })} className={INP}>
                  <option value="">Sem vínculo</option>
                  {shipments.map((s) => <option key={s.id} value={s.id}>{s.code} — {s.destination ?? '?'}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Destinatário *</label>
                <input value={form.recipient_name} onChange={(e) => setForm({ ...form, recipient_name: e.target.value })} className={INP} placeholder="Nome do destinatário" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Endereço</label>
                <input value={form.recipient_address} onChange={(e) => setForm({ ...form, recipient_address: e.target.value })} className={INP} placeholder="Rua, número, bairro, cidade" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Telefone</label>
                  <input value={form.recipient_phone} onChange={(e) => setForm({ ...form, recipient_phone: e.target.value })} className={INP} placeholder="(11) 99999-9999" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Data Prevista</label>
                  <input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} className={INP} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tipo de Comprovante</label>
                <select value={form.proof_type} onChange={(e) => setForm({ ...form, proof_type: e.target.value })} className={INP}>
                  {Object.entries(PROOF_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Observações</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={`${INP} resize-none`} rows={2} />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm hover:bg-slate-50">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.recipient_name.trim()}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {editId ? 'Salvar' : 'Cadastrar Entrega'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const INP = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 bg-white';
