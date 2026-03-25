// TMS — Transport Management System (Fretes e Embarques)
import { useEffect, useState } from 'react';
import {
  Package, Plus, Search, X, Pencil, AlertTriangle, Filter,
  CheckCircle2, Truck, Clock, XCircle, RotateCcw,
} from 'lucide-react';
import {
  getEmbarques, createEmbarque, updateEmbarque, getRotas,
  type ScmEmbarque, type ScmRota,
} from '../../../lib/scm';

const STATUS_MAP: Record<ScmEmbarque['status'], { label: string; color: string; icon: React.ReactNode }> = {
  aguardando:   { label: 'Aguardando',   color: 'bg-slate-100 text-slate-600',   icon: <Clock className="w-3 h-3" /> },
  em_transito:  { label: 'Em Trânsito',  color: 'bg-blue-100 text-blue-700',    icon: <Truck className="w-3 h-3" /> },
  entregue:     { label: 'Entregue',     color: 'bg-green-100 text-green-700',   icon: <CheckCircle2 className="w-3 h-3" /> },
  devolvido:    { label: 'Devolvido',    color: 'bg-amber-100 text-amber-700',   icon: <RotateCcw className="w-3 h-3" /> },
  cancelado:    { label: 'Cancelado',    color: 'bg-red-100 text-red-700',       icon: <XCircle className="w-3 h-3" /> },
};

// ── Modal ─────────────────────────────────────────────────────────────────────
interface FormState {
  numero: string; origem: string; destino: string;
  status: ScmEmbarque['status']; transportadora: string;
  valor_frete: string; peso_kg: string; cubagem_m3: string;
  data_saida: string; data_prevista: string; data_entrega: string;
  rota_id: string;
}

const EMPTY: FormState = {
  numero: '', origem: '', destino: '', status: 'aguardando',
  transportadora: '', valor_frete: '', peso_kg: '', cubagem_m3: '',
  data_saida: '', data_prevista: '', data_entrega: '', rota_id: '',
};

interface ModalProps {
  initial: ScmEmbarque | null;
  rotas: ScmRota[];
  onSave: (p: Omit<ScmEmbarque, 'id' | 'created_at' | 'tenant_id' | 'scm_rotas'>) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}

function EmbarqueModal({ initial, rotas, onSave, onClose, saving }: ModalProps) {
  const [form, setForm] = useState<FormState>(
    initial
      ? {
          numero: initial.numero, origem: initial.origem, destino: initial.destino,
          status: initial.status, transportadora: initial.transportadora ?? '',
          valor_frete: initial.valor_frete != null ? String(initial.valor_frete) : '',
          peso_kg: initial.peso_kg != null ? String(initial.peso_kg) : '',
          cubagem_m3: initial.cubagem_m3 != null ? String(initial.cubagem_m3) : '',
          data_saida: initial.data_saida ?? '', data_prevista: initial.data_prevista ?? '',
          data_entrega: initial.data_entrega ?? '', rota_id: initial.rota_id ?? '',
        }
      : EMPTY,
  );
  const [err, setErr] = useState('');

  function set(k: keyof FormState, v: string) { setForm((p) => ({ ...p, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.numero.trim() || !form.origem.trim() || !form.destino.trim()) {
      setErr('Número, origem e destino são obrigatórios.'); return;
    }
    setErr('');
    await onSave({
      numero: form.numero.trim(), origem: form.origem.trim(), destino: form.destino.trim(),
      status: form.status,
      transportadora: form.transportadora.trim() || null,
      valor_frete: form.valor_frete ? Number(form.valor_frete) : null,
      peso_kg: form.peso_kg ? Number(form.peso_kg) : null,
      cubagem_m3: form.cubagem_m3 ? Number(form.cubagem_m3) : null,
      data_saida: form.data_saida || null, data_prevista: form.data_prevista || null,
      data_entrega: form.data_entrega || null, rota_id: form.rota_id || null,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">{initial ? 'Editar Embarque' : 'Novo Embarque'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <F label="Nº Embarque *" v={form.numero} s={(v) => set('numero', v)} p="EMB-001" />
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Status</label>
              <select value={form.status} onChange={(e) => set('status', e.target.value as ScmEmbarque['status'])} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-emerald-400">
                {Object.entries(STATUS_MAP).map(([k, { label }]) => <option key={k} value={k}>{label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <F label="Origem *" v={form.origem} s={(v) => set('origem', v)} p="São Paulo, SP" />
            <F label="Destino *" v={form.destino} s={(v) => set('destino', v)} p="Rio de Janeiro, RJ" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <F label="Transportadora" v={form.transportadora} s={(v) => set('transportadora', v)} p="Nome da transportadora" />
            <F label="Valor do Frete (R$)" v={form.valor_frete} s={(v) => set('valor_frete', v)} p="0.00" t="number" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <F label="Peso (kg)" v={form.peso_kg} s={(v) => set('peso_kg', v)} p="0" t="number" />
            <F label="Cubagem (m³)" v={form.cubagem_m3} s={(v) => set('cubagem_m3', v)} p="0" t="number" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Rota Vinculada</label>
            <select value={form.rota_id} onChange={(e) => set('rota_id', e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-emerald-400">
              <option value="">Nenhuma</option>
              {rotas.map((r) => <option key={r.id} value={r.id}>{r.nome} ({r.origem} → {r.destino})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <F label="Data Saída" v={form.data_saida} s={(v) => set('data_saida', v)} t="date" />
            <F label="Data Prevista" v={form.data_prevista} s={(v) => set('data_prevista', v)} t="date" />
            <F label="Data Entrega" v={form.data_entrega} s={(v) => set('data_entrega', v)} t="date" />
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

function F({ label, v, s, p, t = 'text' }: { label: string; v: string; s: (x: string) => void; p?: string; t?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>
      <input type={t} value={v} placeholder={p} onChange={(e) => s(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function TMS() {
  const [items, setItems] = useState<ScmEmbarque[]>([]);
  const [rotas, setRotas] = useState<ScmRota[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [error, setError] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<ScmEmbarque | null>(null);
  const [saving, setSaving] = useState(false);

  async function load(q = '', s = '') {
    setLoading(true); setError('');
    try {
      const [e, r] = await Promise.all([getEmbarques(q, s || undefined), getRotas()]);
      setItems(e); setRotas(r);
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const t = setTimeout(() => load(search, filterStatus), 350);
    return () => clearTimeout(t);
  }, [search, filterStatus]);

  async function handleSave(payload: Omit<ScmEmbarque, 'id' | 'created_at' | 'tenant_id' | 'scm_rotas'>) {
    setSaving(true);
    try {
      if (modal === 'edit' && selected) {
        const u = await updateEmbarque(selected.id, payload);
        setItems((p) => p.map((x) => (x.id === u.id ? u : x)));
      } else {
        const c = await createEmbarque(payload);
        setItems((p) => [c, ...p]);
      }
      setModal(null); setSelected(null);
    } catch (e) { alert(e instanceof Error ? e.message : 'Erro'); }
    finally { setSaving(false); }
  }

  const fmtBRL = (v: number | null) => v != null ? `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';
  const fmtDate = (d: string | null) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">TMS — Fretes</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gestão de embarques e transportadoras</p>
        </div>
        <button onClick={() => { setSelected(null); setModal('create'); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">
          <Plus className="w-4 h-4" /> Novo Embarque
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar embarque, origem, destino..." className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-emerald-400">
            <option value="">Todos os status</option>
            {Object.entries(STATUS_MAP).map(([k, { label }]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-white rounded-xl border border-slate-100 animate-pulse" />)}</div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
          <Package className="w-12 h-12 text-slate-200 mb-3" />
          <p className="text-slate-500 font-medium">Nenhum embarque encontrado</p>
          <p className="text-sm text-slate-400 mb-4">Registre o primeiro embarque</p>
          <button onClick={() => { setSelected(null); setModal('create'); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium">
            <Plus className="w-4 h-4" /> Novo Embarque
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Nº', 'Origem → Destino', 'Transportadora', 'Frete', 'Peso', 'Saída', 'Prevista', 'Status', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.map((e) => {
                  const st = STATUS_MAP[e.status];
                  return (
                    <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-slate-800">{e.numero}</td>
                      <td className="px-4 py-3 text-slate-600">
                        <span className="text-slate-500">{e.origem}</span>
                        <span className="mx-1 text-slate-300">→</span>
                        <span>{e.destino}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{e.transportadora ?? <span className="text-slate-300">—</span>}</td>
                      <td className="px-4 py-3 text-slate-600">{fmtBRL(e.valor_frete)}</td>
                      <td className="px-4 py-3 text-slate-500">{e.peso_kg != null ? `${e.peso_kg} kg` : '—'}</td>
                      <td className="px-4 py-3 text-slate-500">{fmtDate(e.data_saida)}</td>
                      <td className="px-4 py-3 text-slate-500">{fmtDate(e.data_prevista)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${st.color}`}>
                          {st.icon} {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => { setSelected(e); setModal('edit'); }} className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50">
                          <Pencil className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 text-xs text-slate-400">
            {items.length} embarque{items.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {modal && (
        <EmbarqueModal
          initial={modal === 'edit' ? selected : null}
          rotas={rotas}
          onSave={handleSave}
          onClose={() => { setModal(null); setSelected(null); }}
          saving={saving}
        />
      )}
    </div>
  );
}
