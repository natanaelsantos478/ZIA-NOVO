import { useState, useEffect } from 'react';
import { Plus, Search, RefreshCw, AlertCircle, X } from 'lucide-react';
import { getReverseLogistics, createReverseLogistic, updateReverseLogistic, getShipments, fmtCurrency } from '../../../lib/scm';
import type { ReverseLogistic, Shipment } from '../../../lib/scm';

const STATUS_LABEL: Record<string, string> = {
  requested:   'Solicitado',
  collected:   'Coletado',
  in_transit:  'Em Trânsito',
  received:    'Recebido',
  processed:   'Processado',
};
const STATUS_BADGE: Record<string, string> = {
  requested:   'bg-amber-100 text-amber-700',
  collected:   'bg-sky-100 text-sky-700',
  in_transit:  'bg-blue-100 text-blue-700',
  received:    'bg-violet-100 text-violet-700',
  processed:   'bg-green-100 text-green-700',
};
const REASON_LABEL: Record<string, string> = {
  damaged:    'Produto danificado',
  wrong_item: 'Item errado',
  refused:    'Recusa na entrega',
  not_home:   'Ausência do cliente',
  other:      'Outro',
};
const REFUND_LABEL: Record<string, string> = {
  refund:   'Estorno',
  exchange: 'Troca',
  credit:   'Crédito',
};

interface ReverseForm {
  original_shipment_id: string; reason: string; customer_name: string;
  customer_phone: string; product_description: string; status: string;
  value: string; refund_type: string; notes: string;
}
const EMPTY: ReverseForm = {
  original_shipment_id: '', reason: 'damaged', customer_name: '',
  customer_phone: '', product_description: '', status: 'requested',
  value: '', refund_type: 'refund', notes: '',
};

export default function Reverse() {
  const [items, setItems]         = useState<ReverseLogistic[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [search, setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal]       = useState(false);
  const [editId, setEditId]             = useState<string | null>(null);
  const [form, setForm]                 = useState<ReverseForm>(EMPTY);
  const [saving, setSaving]             = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [r, s] = await Promise.all([getReverseLogistics(), getShipments()]);
      setItems(r); setShipments(s);
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  function openNew() { setEditId(null); setForm(EMPTY); setShowModal(true); }
  function openEdit(r: ReverseLogistic) {
    setEditId(r.id);
    setForm({
      original_shipment_id: r.original_shipment_id ?? '',
      reason: r.reason ?? 'damaged', customer_name: r.customer_name ?? '',
      customer_phone: r.customer_phone ?? '', product_description: r.product_description ?? '',
      status: r.status, value: r.value?.toString() ?? '',
      refund_type: r.refund_type ?? 'refund', notes: r.notes ?? '',
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.customer_name.trim()) return;
    setSaving(true);
    try {
      const payload: Partial<ReverseLogistic> = {
        original_shipment_id: form.original_shipment_id || null,
        reason: form.reason || null, customer_name: form.customer_name.trim(),
        customer_phone: form.customer_phone || null,
        product_description: form.product_description || null,
        status: form.status, value: form.value ? parseFloat(form.value) : null,
        refund_type: form.refund_type || null, notes: form.notes || null,
      };
      if (editId) { await updateReverseLogistic(editId, payload); }
      else { await createReverseLogistic(payload); }
      await load(); setShowModal(false);
    } catch (e: unknown) { alert((e as Error).message); }
    finally { setSaving(false); }
  }

  const filtered = items.filter((r) => {
    const q = search.toLowerCase();
    return (
      (r.customer_name ?? '').toLowerCase().includes(q) ||
      (r.product_description ?? '').toLowerCase().includes(q) ||
      (r.scm_shipments?.code ?? '').toLowerCase().includes(q)
    ) && (filterStatus ? r.status === filterStatus : true);
  });

  const totalValue = items.reduce((s, r) => s + (r.value ?? 0), 0);
  const open = items.filter((r) => !['processed', 'received'].includes(r.status)).length;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (error) return <div className="p-8 text-center text-red-500"><AlertCircle className="w-8 h-8 mx-auto mb-2" /><p>{error}</p></div>;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Logística Reversa</h2>
          <p className="text-sm text-slate-500">{items.length} devolução(ões) — {open} em aberto</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg">
          <Plus className="w-4 h-4" /> Nova Devolução
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Devoluções em Aberto</p>
          <p className="text-2xl font-bold text-rose-600">{open}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Processadas</p>
          <p className="text-2xl font-bold text-green-600">{items.filter((r) => r.status === 'processed').length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Valor Total em Devoluções</p>
          <p className="text-2xl font-bold text-slate-800">{fmtCurrency(totalValue)}</p>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 flex-1 min-w-[180px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente, produto..." className="flex-1 text-sm outline-none bg-transparent text-slate-700 placeholder-slate-400" />
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
                {['Embarque', 'Cliente', 'Produto', 'Motivo', 'Valor', 'Resolução', 'Status', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-slate-400">
                  <RefreshCw className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  Nenhuma devolução encontrada
                </td></tr>
              )}
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-slate-600 text-xs">{r.scm_shipments?.code ?? '—'}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{r.customer_name ?? '—'}</p>
                    <p className="text-xs text-slate-400">{r.customer_phone ?? ''}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-[160px] truncate">{r.product_description ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{REASON_LABEL[r.reason ?? ''] ?? r.reason ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-700 font-medium">{fmtCurrency(r.value)}</td>
                  <td className="px-4 py-3 text-slate-600">{REFUND_LABEL[r.refund_type ?? ''] ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[r.status] ?? ''}`}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => openEdit(r)} className="text-emerald-600 hover:text-emerald-700 text-xs font-medium">Editar</button>
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
                <RefreshCw className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-slate-800">{editId ? 'Editar Devolução' : 'Nova Devolução'}</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Embarque Original</label>
                <select value={form.original_shipment_id} onChange={(e) => setForm({ ...form, original_shipment_id: e.target.value })} className={INP}>
                  <option value="">Sem vínculo</option>
                  {shipments.map((s) => <option key={s.id} value={s.id}>{s.code}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Nome do Cliente *</label>
                  <input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} className={INP} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Telefone</label>
                  <input value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} className={INP} placeholder="(11) 99999-9999" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Descrição do Produto</label>
                <input value={form.product_description} onChange={(e) => setForm({ ...form, product_description: e.target.value })} className={INP} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Motivo</label>
                  <select value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className={INP}>
                    {Object.entries(REASON_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={INP}>
                    {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Valor (R$)</label>
                  <input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className={INP} placeholder="299.90" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tipo de Resolução</label>
                  <select value={form.refund_type} onChange={(e) => setForm({ ...form, refund_type: e.target.value })} className={INP}>
                    {Object.entries(REFUND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Observações</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={`${INP} resize-none`} rows={2} />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.customer_name.trim()}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {editId ? 'Salvar' : 'Registrar Devolução'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const INP = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 bg-white';
