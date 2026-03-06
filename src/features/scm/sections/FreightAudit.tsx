import { useState, useEffect } from 'react';
import { Plus, Search, FileSearch, AlertCircle, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { getFreightAudits, createFreightAudit, updateFreightAudit, getShipments, fmtCurrency } from '../../../lib/scm';
import type { FreightAudit, Shipment } from '../../../lib/scm';

const STATUS_LABEL: Record<string, string> = {
  pending:   'Pendente',
  approved:  'Aprovado',
  disputed:  'Contestado',
  resolved:  'Resolvido',
};
const STATUS_BADGE: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-700',
  approved:  'bg-green-100 text-green-700',
  disputed:  'bg-rose-100 text-rose-700',
  resolved:  'bg-slate-100 text-slate-600',
};

interface AuditForm {
  shipment_id: string;
  carrier: string;
  billed_value: string;
  agreed_value: string;
  status: string;
  dispute_reason: string;
  notes: string;
}

const EMPTY: AuditForm = {
  shipment_id: '', carrier: '', billed_value: '', agreed_value: '',
  status: 'pending', dispute_reason: '', notes: '',
};

export default function FreightAudit() {
  const [audits, setAudits]     = useState<FreightAudit[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [search, setSearch]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal]       = useState(false);
  const [editId, setEditId]             = useState<string | null>(null);
  const [form, setForm]                 = useState<AuditForm>(EMPTY);
  const [saving, setSaving]             = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true); setError(null);
    try {
      const [a, s] = await Promise.all([getFreightAudits(), getShipments()]);
      setAudits(a); setShipments(s);
    } catch (e: unknown) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  function openNew() { setEditId(null); setForm(EMPTY); setShowModal(true); }
  function openEdit(a: FreightAudit) {
    setEditId(a.id);
    setForm({
      shipment_id: a.shipment_id ?? '',
      carrier: a.carrier ?? '',
      billed_value: a.billed_value?.toString() ?? '',
      agreed_value: a.agreed_value?.toString() ?? '',
      status: a.status,
      dispute_reason: a.dispute_reason ?? '',
      notes: a.notes ?? '',
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.carrier.trim()) return;
    setSaving(true);
    try {
      const payload: Partial<FreightAudit> = {
        shipment_id: form.shipment_id || null,
        carrier: form.carrier.trim(),
        billed_value: form.billed_value ? parseFloat(form.billed_value) : null,
        agreed_value: form.agreed_value ? parseFloat(form.agreed_value) : null,
        status: form.status,
        dispute_reason: form.dispute_reason || null,
        notes: form.notes || null,
      };
      if (editId) { await updateFreightAudit(editId, payload); }
      else { await createFreightAudit(payload); }
      await load(); setShowModal(false);
    } catch (e: unknown) { alert((e as Error).message); }
    finally { setSaving(false); }
  }

  const filtered = audits.filter((a) => {
    const q = search.toLowerCase();
    return (
      (a.carrier ?? '').toLowerCase().includes(q) ||
      (a.scm_shipments?.code ?? '').toLowerCase().includes(q)
    ) && (filterStatus ? a.status === filterStatus : true);
  });

  const totalBilled   = audits.reduce((s, a) => s + (a.billed_value ?? 0), 0);
  const totalAgreed   = audits.reduce((s, a) => s + (a.agreed_value ?? 0), 0);
  const totalDiscrep  = totalBilled - totalAgreed;
  const disputed      = audits.filter((a) => a.status === 'disputed').length;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (error) return <div className="p-8 text-center text-red-500"><AlertCircle className="w-8 h-8 mx-auto mb-2" /><p>{error}</p></div>;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Auditoria de Fretes</h2>
          <p className="text-sm text-slate-500">{audits.length} auditoria(s)</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg">
          <Plus className="w-4 h-4" /> Nova Auditoria
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Total Faturado</p>
          <p className="text-xl font-bold text-slate-800">{fmtCurrency(totalBilled)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Total Acordado</p>
          <p className="text-xl font-bold text-slate-800">{fmtCurrency(totalAgreed)}</p>
        </div>
        <div className={`border rounded-xl p-4 ${totalDiscrep > 0 ? 'bg-rose-50 border-rose-200' : 'bg-green-50 border-green-200'}`}>
          <p className="text-xs text-slate-500 mb-1">Divergência Total</p>
          <p className={`text-xl font-bold ${totalDiscrep > 0 ? 'text-rose-600' : 'text-green-600'}`}>{fmtCurrency(totalDiscrep)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Em Contestação</p>
          <div className="flex items-center gap-2">
            <AlertTriangle className={`w-4 h-4 ${disputed > 0 ? 'text-rose-500' : 'text-slate-300'}`} />
            <p className={`text-xl font-bold ${disputed > 0 ? 'text-rose-600' : 'text-slate-800'}`}>{disputed}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 flex-1 min-w-[180px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar transportadora, embarque..." className="flex-1 text-sm outline-none bg-transparent text-slate-700 placeholder-slate-400" />
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
                {['Embarque', 'Transportadora', 'Valor Faturado', 'Valor Acordado', 'Divergência', 'Status', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-slate-400">
                  <FileSearch className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  Nenhuma auditoria encontrada
                </td></tr>
              )}
              {filtered.map((a) => {
                const discrepancy = (a.billed_value ?? 0) - (a.agreed_value ?? 0);
                return (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-600 text-xs">{a.scm_shipments?.code ?? '—'}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{a.carrier ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{fmtCurrency(a.billed_value)}</td>
                    <td className="px-4 py-3 text-slate-700">{fmtCurrency(a.agreed_value)}</td>
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 font-semibold ${discrepancy > 0 ? 'text-rose-600' : discrepancy < 0 ? 'text-green-600' : 'text-slate-400'}`}>
                        {discrepancy !== 0 && (discrepancy > 0 ? <AlertTriangle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />)}
                        {fmtCurrency(discrepancy)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[a.status] ?? ''}`}>
                        {STATUS_LABEL[a.status] ?? a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => openEdit(a)} className="text-emerald-600 hover:text-emerald-700 text-xs font-medium">Editar</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileSearch className="w-5 h-5 text-emerald-600" />
                <h3 className="font-semibold text-slate-800">{editId ? 'Editar Auditoria' : 'Nova Auditoria de Frete'}</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Embarque</label>
                <select value={form.shipment_id} onChange={(e) => setForm({ ...form, shipment_id: e.target.value })} className={INP}>
                  <option value="">Sem vínculo</option>
                  {shipments.map((s) => <option key={s.id} value={s.id}>{s.code}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Transportadora *</label>
                <input value={form.carrier} onChange={(e) => setForm({ ...form, carrier: e.target.value })} className={INP} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Valor Faturado (R$)</label>
                  <input type="number" value={form.billed_value} onChange={(e) => setForm({ ...form, billed_value: e.target.value })} className={INP} placeholder="1800.00" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Valor Acordado (R$)</label>
                  <input type="number" value={form.agreed_value} onChange={(e) => setForm({ ...form, agreed_value: e.target.value })} className={INP} placeholder="1500.00" />
                </div>
              </div>
              {(parseFloat(form.billed_value || '0') - parseFloat(form.agreed_value || '0')) > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-700">
                  Divergência: {fmtCurrency(parseFloat(form.billed_value || '0') - parseFloat(form.agreed_value || '0'))}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={INP}>
                  {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              {form.status === 'disputed' && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Motivo da Contestação</label>
                  <textarea value={form.dispute_reason} onChange={(e) => setForm({ ...form, dispute_reason: e.target.value })} className={`${INP} resize-none`} rows={2} />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Observações</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={`${INP} resize-none`} rows={2} />
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-lg text-sm">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !form.carrier.trim()}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {editId ? 'Salvar' : 'Criar Auditoria'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const INP = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 bg-white';
