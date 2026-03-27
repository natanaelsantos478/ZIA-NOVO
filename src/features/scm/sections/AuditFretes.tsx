// AuditFretes — Auditoria de Fretes e Divergências
import { useEffect, useState } from 'react';
import {
  FileSearch, Plus, Search, X, Pencil, AlertTriangle,
  CheckCircle2, Clock, XCircle, TrendingDown,
} from 'lucide-react';
import {
  getAuditoriaFretes, createAuditoriaFrete, updateAuditoriaFrete,
  getEmbarques,
  type ScmAuditoriaFrete, type ScmEmbarque,
} from '../../../lib/scm';

const STATUS_MAP: Record<ScmAuditoriaFrete['status'], { label: string; color: string; icon: React.ReactNode }> = {
  pendente:   { label: 'Pendente',    color: 'bg-amber-100 text-amber-700',  icon: <Clock className="w-3 h-3" /> },
  aprovado:   { label: 'Aprovado',    color: 'bg-green-100 text-green-700',  icon: <CheckCircle2 className="w-3 h-3" /> },
  em_disputa: { label: 'Em Disputa',  color: 'bg-red-100 text-red-700',      icon: <AlertTriangle className="w-3 h-3" /> },
  resolvido:  { label: 'Resolvido',   color: 'bg-slate-100 text-slate-600',  icon: <XCircle className="w-3 h-3" /> },
};

// ── Modal ─────────────────────────────────────────────────────────────────────
interface ModalProps {
  initial: ScmAuditoriaFrete | null;
  embarques: ScmEmbarque[];
  onSave: (p: Omit<ScmAuditoriaFrete, 'id' | 'created_at' | 'tenant_id' | 'scm_embarques' | 'divergencia'>) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}

function AuditoriaModal({ initial, embarques, onSave, onClose, saving }: ModalProps) {
  const [embId, setEmbId] = useState(initial?.embarque_id ?? '');
  const [transportadora, setTransportadora] = useState(initial?.transportadora ?? '');
  const [valorCobrado, setValorCobrado] = useState(initial ? String(initial.valor_cobrado) : '');
  const [valorAuditado, setValorAuditado] = useState(initial?.valor_auditado != null ? String(initial.valor_auditado) : '');
  const [status, setStatus] = useState<ScmAuditoriaFrete['status']>(initial?.status ?? 'pendente');
  const [motivo, setMotivo] = useState(initial?.motivo_divergencia ?? '');
  const [err, setErr] = useState('');

  const divergencia = valorCobrado && valorAuditado
    ? Number(valorCobrado) - Number(valorAuditado)
    : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!transportadora.trim() || !valorCobrado) { setErr('Transportadora e valor cobrado são obrigatórios.'); return; }
    setErr('');
    await onSave({
      embarque_id: embId || null, transportadora: transportadora.trim(),
      valor_cobrado: Number(valorCobrado),
      valor_auditado: valorAuditado ? Number(valorAuditado) : null,
      status, motivo_divergencia: motivo.trim() || null,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">{initial ? 'Editar Auditoria' : 'Nova Auditoria de Frete'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Embarque</label>
            <select value={embId} onChange={(e) => setEmbId(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-emerald-400">
              <option value="">Nenhum</option>
              {embarques.map((e) => <option key={e.id} value={e.id}>{e.numero} — {e.origem} → {e.destino}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Transportadora *</label>
            <input value={transportadora} onChange={(e) => setTransportadora(e.target.value)} placeholder="Nome da transportadora" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Valor Cobrado (R$) *</label>
              <input type="number" value={valorCobrado} onChange={(e) => setValorCobrado(e.target.value)} step="0.01" placeholder="0.00" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Valor Auditado (R$)</label>
              <input type="number" value={valorAuditado} onChange={(e) => setValorAuditado(e.target.value)} step="0.01" placeholder="0.00" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
            </div>
          </div>
          {divergencia != null && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${divergencia > 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              <TrendingDown className="w-4 h-4" />
              Divergência: {divergencia > 0 ? '+' : ''}R$ {Math.abs(divergencia).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              {divergencia > 0 ? ' (cobrado a mais)' : ' (cobrado a menos)'}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as ScmAuditoriaFrete['status'])} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-emerald-400">
                {Object.entries(STATUS_MAP).map(([k, { label }]) => <option key={k} value={k}>{label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Motivo da Divergência</label>
            <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400 resize-none" />
          </div>
          {err && <p className="text-sm text-red-500">{err}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AuditFretes() {
  const [items, setItems] = useState<ScmAuditoriaFrete[]>([]);
  const [embarques, setEmbarques] = useState<ScmEmbarque[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<ScmAuditoriaFrete | null>(null);
  const [saving, setSaving] = useState(false);

  async function load(q = '') {
    setLoading(true); setError('');
    try {
      const [a, e] = await Promise.all([getAuditoriaFretes(q), getEmbarques()]);
      setItems(a); setEmbarques(e);
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { const t = setTimeout(() => load(search), 350); return () => clearTimeout(t); }, [search]);

  async function handleSave(p: Omit<ScmAuditoriaFrete, 'id' | 'created_at' | 'tenant_id' | 'scm_embarques' | 'divergencia'>) {
    setSaving(true);
    try {
      if (modal === 'edit' && selected) {
        const updated = await updateAuditoriaFrete(selected.id, p);
        setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      } else {
        const c = await createAuditoriaFrete(p);
        setItems((prev) => [c, ...prev]);
      }
      setModal(null); setSelected(null);
    } catch (e) { alert(e instanceof Error ? e.message : 'Erro'); }
    finally { setSaving(false); }
  }

  const fmtBRL = (v: number | null | undefined) => v != null ? `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';

  const totalDivergencia = items.reduce((sum, i) => sum + (i.divergencia ?? 0), 0);
  const pendentes = items.filter((i) => i.status === 'pendente').length;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Auditoria de Fretes</h1>
          <p className="text-sm text-slate-500 mt-0.5">Conferência e divergências de cobranças de frete</p>
        </div>
        <button onClick={() => { setSelected(null); setModal('create'); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">
          <Plus className="w-4 h-4" /> Nova Auditoria
        </button>
      </div>

      {/* Summary */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <p className="text-xs text-slate-500 mb-1">Total Auditado</p>
            <p className="text-lg font-bold text-slate-800">{items.length}</p>
          </div>
          <div className={`rounded-xl border p-4 ${pendentes > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100'}`}>
            <p className="text-xs text-slate-500 mb-1">Pendentes</p>
            <p className={`text-lg font-bold ${pendentes > 0 ? 'text-amber-700' : 'text-slate-800'}`}>{pendentes}</p>
          </div>
          <div className={`rounded-xl border p-4 ${totalDivergencia > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-100'}`}>
            <p className="text-xs text-slate-500 mb-1">Divergência Total</p>
            <p className={`text-lg font-bold ${totalDivergencia > 0 ? 'text-red-700' : 'text-green-700'}`}>{fmtBRL(totalDivergencia)}</p>
          </div>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por transportadora..." className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 bg-white rounded-xl border border-slate-100 animate-pulse" />)}</div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
          <FileSearch className="w-12 h-12 text-slate-200 mb-3" />
          <p className="text-slate-500 font-medium">Nenhuma auditoria registrada</p>
          <p className="text-sm text-slate-400 mb-4">Confira os fretes cobrados pelas transportadoras</p>
          <button onClick={() => { setSelected(null); setModal('create'); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium">
            <Plus className="w-4 h-4" /> Iniciar Auditoria
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Embarque', 'Transportadora', 'Cobrado', 'Auditado', 'Divergência', 'Status', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.map((item) => {
                  const st = STATUS_MAP[item.status];
                  const div = item.divergencia;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">{item.scm_embarques?.numero ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-700">{item.transportadora}</td>
                      <td className="px-4 py-3 text-slate-600">{fmtBRL(item.valor_cobrado)}</td>
                      <td className="px-4 py-3 text-slate-600">{fmtBRL(item.valor_auditado)}</td>
                      <td className="px-4 py-3">
                        {div != null ? (
                          <span className={`text-xs font-semibold ${div > 0 ? 'text-red-600' : div < 0 ? 'text-green-600' : 'text-slate-400'}`}>
                            {div > 0 ? '+' : ''}{fmtBRL(div)}
                          </span>
                        ) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${st.color}`}>
                          {st.icon} {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => { setSelected(item); setModal('edit'); }} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50">
                          <Pencil className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <AuditoriaModal
          initial={modal === 'edit' ? selected : null}
          embarques={embarques}
          onSave={handleSave}
          onClose={() => { setModal(null); setSelected(null); }}
          saving={saving}
        />
      )}
    </div>
  );
}
