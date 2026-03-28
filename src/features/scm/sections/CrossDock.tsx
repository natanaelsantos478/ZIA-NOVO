// CrossDock — Operações de Cross-Docking
import { useEffect, useState } from 'react';
import {
  ArrowRightLeft, Plus, X, Pencil, AlertTriangle,
  Clock, PlayCircle, CheckCircle2, XCircle,
} from 'lucide-react';
import {
  getCrossDocks, createCrossDock, updateCrossDock,
  getEmbarques, getDocas,
  type ScmCrossDock, type ScmEmbarque, type ScmDoca,
} from '../../../lib/scm';

const STATUS_MAP: Record<ScmCrossDock['status'], { label: string; color: string; icon: React.ReactNode }> = {
  aguardando:   { label: 'Aguardando',   color: 'bg-slate-100 text-slate-600',  icon: <Clock className="w-3 h-3" /> },
  em_andamento: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-700',   icon: <PlayCircle className="w-3 h-3" /> },
  concluido:    { label: 'Concluído',    color: 'bg-green-100 text-green-700',  icon: <CheckCircle2 className="w-3 h-3" /> },
  cancelado:    { label: 'Cancelado',    color: 'bg-red-100 text-red-700',      icon: <XCircle className="w-3 h-3" /> },
};

// ── Modal ─────────────────────────────────────────────────────────────────────
interface ModalProps {
  initial: ScmCrossDock | null;
  embarques: ScmEmbarque[];
  docas: ScmDoca[];
  onSave: (p: Omit<ScmCrossDock, 'id' | 'created_at' | 'tenant_id' | 'entrada' | 'saida' | 'doca'>) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}

function CrossDockModal({ initial, embarques, docas, onSave, onClose, saving }: ModalProps) {
  const [entradaId, setEntradaId] = useState(initial?.embarque_entrada_id ?? '');
  const [saidaId, setSaidaId] = useState(initial?.embarque_saida_id ?? '');
  const [docaId, setDocaId] = useState(initial?.doca_id ?? '');
  const [status, setStatus] = useState<ScmCrossDock['status']>(initial?.status ?? 'aguardando');
  const [dtEntrada, setDtEntrada] = useState(initial?.data_entrada ?? '');
  const [dtSaida, setDtSaida] = useState(initial?.data_saida_prevista ?? '');
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!entradaId || !saidaId) { setErr('Embarque de entrada e saída são obrigatórios.'); return; }
    setErr('');
    await onSave({
      embarque_entrada_id: entradaId, embarque_saida_id: saidaId,
      doca_id: docaId || null, status,
      data_entrada: dtEntrada || null, data_saida_prevista: dtSaida || null,
    });
  }

  const fmtEmb = (e: ScmEmbarque) => `${e.numero} — ${e.origem} → ${e.destino}`;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">{initial ? 'Editar Operação' : 'Nova Operação Cross-Dock'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Embarque de Entrada *</label>
            <select value={entradaId} onChange={(e) => setEntradaId(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-emerald-400">
              <option value="">Selecione...</option>
              {embarques.map((e) => <option key={e.id} value={e.id}>{fmtEmb(e)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Embarque de Saída *</label>
            <select value={saidaId} onChange={(e) => setSaidaId(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-emerald-400">
              <option value="">Selecione...</option>
              {embarques.filter((e) => e.id !== entradaId).map((e) => <option key={e.id} value={e.id}>{fmtEmb(e)}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Doca</label>
              <select value={docaId} onChange={(e) => setDocaId(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-emerald-400">
                <option value="">Nenhuma</option>
                {docas.map((d) => <option key={d.id} value={d.id}>{d.numero} ({d.tipo})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as ScmCrossDock['status'])} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-emerald-400">
                {Object.entries(STATUS_MAP).map(([k, { label }]) => <option key={k} value={k}>{label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Data Entrada</label>
              <input type="datetime-local" value={dtEntrada} onChange={(e) => setDtEntrada(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Saída Prevista</label>
              <input type="datetime-local" value={dtSaida} onChange={(e) => setDtSaida(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
            </div>
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
export default function CrossDock() {
  const [items, setItems] = useState<ScmCrossDock[]>([]);
  const [embarques, setEmbarques] = useState<ScmEmbarque[]>([]);
  const [docas, setDocas] = useState<ScmDoca[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<ScmCrossDock | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true); setError('');
    try {
      const [c, e, d] = await Promise.all([getCrossDocks(), getEmbarques(), getDocas()]);
      setItems(c); setEmbarques(e); setDocas(d);
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  // Refresh embarques and docas when modal opens to pick up data added in other sections
  useEffect(() => {
    if (modal) {
      Promise.all([getEmbarques(), getDocas()]).then(([e, d]) => { setEmbarques(e); setDocas(d); }).catch(() => {});
    }
  }, [modal]);

  async function handleSave(p: Omit<ScmCrossDock, 'id' | 'created_at' | 'tenant_id' | 'entrada' | 'saida' | 'doca'>) {
    setSaving(true);
    try {
      if (modal === 'edit' && selected) {
        const updated = await updateCrossDock(selected.id, p);
        setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      } else {
        const created = await createCrossDock(p);
        setItems((prev) => [created, ...prev]);
      }
      setModal(null); setSelected(null);
    } catch (e) { alert(e instanceof Error ? e.message : 'Erro'); }
    finally { setSaving(false); }
  }

  const fmtDt = (d: string | null) => d ? new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cross-Docking</h1>
          <p className="text-sm text-slate-500 mt-0.5">Transferência direta entre embarques sem armazenagem intermediária</p>
        </div>
        <button onClick={() => { setSelected(null); setModal('create'); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">
          <Plus className="w-4 h-4" /> Nova Operação
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-white rounded-xl border border-slate-100 animate-pulse" />)}</div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
          <ArrowRightLeft className="w-12 h-12 text-slate-200 mb-3" />
          <p className="text-slate-500 font-medium">Nenhuma operação de cross-docking</p>
          <p className="text-sm text-slate-400 mb-4">Vincule embarques de entrada e saída</p>
          <button onClick={() => { setSelected(null); setModal('create'); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium">
            <Plus className="w-4 h-4" /> Nova Operação
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Entrada', 'Saída', 'Doca', 'Data Entrada', 'Saída Prevista', 'Status', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.map((item) => {
                  const st = STATUS_MAP[item.status];
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">{item.entrada?.numero ?? '—'}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">{item.saida?.numero ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-500">{item.doca?.numero ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{fmtDt(item.data_entrada)}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{fmtDt(item.data_saida_prevista)}</td>
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
        <CrossDockModal
          initial={modal === 'edit' ? selected : null}
          embarques={embarques} docas={docas}
          onSave={handleSave}
          onClose={() => { setModal(null); setSelected(null); }}
          saving={saving}
        />
      )}
    </div>
  );
}
