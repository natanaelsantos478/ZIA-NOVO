// Reverse — Logística Reversa e Devoluções
import { useEffect, useState } from 'react';
import {
  RefreshCw, Plus, Search, X, Pencil, AlertTriangle,
  Clock, Truck, CheckCircle2, XCircle, Link2,
} from 'lucide-react';
import {
  getDevolucoes, createDevolucao, updateDevolucao, getEmbarques,
  tryGetPedidosFaturados,
  type ScmDevolucao, type ScmEmbarque, type DevolucaoPayload, type PedidoOption,
} from '../../../lib/scm';

const STATUS_MAP: Record<ScmDevolucao['status'], { label: string; color: string; icon: React.ReactNode }> = {
  solicitada:  { label: 'Solicitada',   color: 'bg-amber-100 text-amber-700',   icon: <Clock className="w-3 h-3" /> },
  em_transito: { label: 'Em Trânsito',  color: 'bg-blue-100 text-blue-700',    icon: <Truck className="w-3 h-3" /> },
  recebida:    { label: 'Recebida',     color: 'bg-green-100 text-green-700',   icon: <CheckCircle2 className="w-3 h-3" /> },
  cancelada:   { label: 'Cancelada',    color: 'bg-red-100 text-red-700',       icon: <XCircle className="w-3 h-3" /> },
};

// ── Modal ─────────────────────────────────────────────────────────────────────
interface ModalProps {
  initial: ScmDevolucao | null;
  embarques: ScmEmbarque[];
  onSave: (p: DevolucaoPayload) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}

function DevolucaoModal({ initial, embarques, onSave, onClose, saving }: ModalProps) {
  const [numero, setNumero] = useState(initial?.numero ?? '');
  const [embId, setEmbId] = useState(initial?.embarque_origem_id ?? '');
  const [pedidoId, setPedidoId] = useState(initial?.pedido_devolucao_id ?? '');
  const [motivo, setMotivo] = useState(initial?.motivo ?? '');
  const [desc, setDesc] = useState(initial?.descricao ?? '');
  const [status, setStatus] = useState<ScmDevolucao['status']>(initial?.status ?? 'solicitada');
  const [transportadora, setTransportadora] = useState(initial?.transportadora ?? '');
  const [frete, setFrete] = useState(initial?.valor_frete_retorno != null ? String(initial.valor_frete_retorno) : '');
  const [dtSolicitacao, setDtSolicitacao] = useState(initial?.data_solicitacao ?? new Date().toISOString().slice(0, 10));
  const [dtPrevista, setDtPrevista] = useState(initial?.data_prevista ?? '');
  const [pedidos, setPedidos] = useState<PedidoOption[]>([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    tryGetPedidosFaturados().then(setPedidos);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!numero.trim() || !motivo.trim()) { setErr('Número e motivo são obrigatórios.'); return; }
    setErr('');
    await onSave({
      numero: numero.trim(), embarque_origem_id: embId || null,
      pedido_devolucao_id: pedidoId || null,
      motivo: motivo.trim(), descricao: desc.trim() || null,
      status, transportadora: transportadora.trim() || null,
      valor_frete_retorno: frete ? Number(frete) : null,
      data_solicitacao: dtSolicitacao, data_prevista: dtPrevista || null,
    });
  }

  const MOTIVOS = ['Produto com defeito', 'Produto errado', 'Produto danificado', 'Arrependimento de compra', 'Prazo de entrega excedido', 'Não recebido pelo destinatário'];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl my-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">{initial ? 'Editar Devolução' : 'Nova Devolução'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Nº Devolução *</label>
              <input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="DEV-001" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as ScmDevolucao['status'])} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-emerald-400">
                {Object.entries(STATUS_MAP).map(([k, { label }]) => <option key={k} value={k}>{label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Embarque de Origem</label>
            <select value={embId} onChange={(e) => setEmbId(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-emerald-400">
              <option value="">Nenhum</option>
              {embarques.map((e) => <option key={e.id} value={e.id}>{e.numero} — {e.origem} → {e.destino}</option>)}
            </select>
          </div>
          {/* Pedido vinculado */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5" /> Pedido de Origem (opcional)
            </p>
            <select
              value={pedidoId}
              onChange={(e) => setPedidoId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-emerald-400"
            >
              <option value="">Sem vínculo com pedido</option>
              {pedidos.map((p) => (
                <option key={p.id} value={p.id}>#{p.numero} — {p.cliente_nome}</option>
              ))}
            </select>
            {pedidoId && (() => {
              const ped = pedidos.find((p) => p.id === pedidoId);
              return ped ? (
                <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  Pedido #{ped.numero} · {ped.cliente_nome}
                </div>
              ) : null;
            })()}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Motivo *</label>
            <input list="motivo-list" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex: Produto com defeito" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
            <datalist id="motivo-list">
              {MOTIVOS.map((m) => <option key={m} value={m} />)}
            </datalist>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Descrição</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Transportadora</label>
              <input value={transportadora} onChange={(e) => setTransportadora(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Frete Retorno (R$)</label>
              <input type="number" value={frete} onChange={(e) => setFrete(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Data Solicitação</label>
              <input type="date" value={dtSolicitacao} onChange={(e) => setDtSolicitacao(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Data Prevista</label>
              <input type="date" value={dtPrevista} onChange={(e) => setDtPrevista(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
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
export default function Reverse() {
  const [items, setItems] = useState<ScmDevolucao[]>([]);
  const [embarques, setEmbarques] = useState<ScmEmbarque[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<ScmDevolucao | null>(null);
  const [saving, setSaving] = useState(false);

  async function load(q = '') {
    setLoading(true); setError('');
    try {
      const [d, e] = await Promise.all([getDevolucoes(q), getEmbarques()]);
      setItems(d); setEmbarques(e);
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { const t = setTimeout(() => load(search), 350); return () => clearTimeout(t); }, [search]);
  // Refresh embarques when modal opens to pick up shipments added in TMS
  useEffect(() => {
    if (modal) getEmbarques().then(setEmbarques).catch(() => {});
  }, [modal]);

  async function handleSave(p: DevolucaoPayload) {
    setSaving(true);
    try {
      if (modal === 'edit' && selected) {
        const updated = await updateDevolucao(selected.id, p);
        setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      } else {
        const c = await createDevolucao(p);
        setItems((prev) => [c, ...prev]);
      }
      setModal(null); setSelected(null);
    } catch (e) { alert(e instanceof Error ? e.message : 'Erro'); }
    finally { setSaving(false); }
  }

  const fmtDate = (d: string | null) => d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '—';
  const fmtBRL = (v: number | null) => v != null ? `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—';

  const pending = items.filter((i) => i.status === 'solicitada' || i.status === 'em_transito').length;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Logística Reversa</h1>
          <p className="text-sm text-slate-500 mt-0.5">Gestão de devoluções e retornos de mercadorias</p>
        </div>
        <button onClick={() => { setSelected(null); setModal('create'); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">
          <Plus className="w-4 h-4" /> Nova Devolução
        </button>
      </div>

      {pending > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-700"><strong>{pending}</strong> devolução{pending !== 1 ? 'ões' : ''} pendente{pending !== 1 ? 's' : ''} de resolução.</p>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nº, motivo ou transportadora..." className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
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
          <RefreshCw className="w-12 h-12 text-slate-200 mb-3" />
          <p className="text-slate-500 font-medium">Nenhuma devolução registrada</p>
          <p className="text-sm text-slate-400 mb-4">Registre retornos e devoluções de mercadorias</p>
          <button onClick={() => { setSelected(null); setModal('create'); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium">
            <Plus className="w-4 h-4" /> Nova Devolução
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Nº / Pedido', 'Motivo', 'Transportadora', 'Frete Retorno', 'Solicitação', 'Prevista', 'Status', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.map((item) => {
                  const st = STATUS_MAP[item.status];
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono font-semibold text-slate-800">{item.numero}</span>
                        {item.pedido_devolucao_id && (
                          <span className="block mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                            <Link2 className="w-3 h-3" />Pedido vinculado
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700 max-w-[200px] truncate">{item.motivo}</td>
                      <td className="px-4 py-3 text-slate-500">{item.transportadora ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{fmtBRL(item.valor_frete_retorno)}</td>
                      <td className="px-4 py-3 text-slate-500">{fmtDate(item.data_solicitacao)}</td>
                      <td className="px-4 py-3 text-slate-500">{fmtDate(item.data_prevista)}</td>
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
        <DevolucaoModal
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
