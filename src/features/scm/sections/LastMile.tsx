// LastMile — Rastreamento Last-Mile (eventos de rastreamento por embarque)
import { useEffect, useState } from 'react';
import {
  Navigation, Plus, Search, X, MapPin, Clock, AlertTriangle,
  Package, ChevronDown, ChevronUp,
} from 'lucide-react';
import {
  getRastreamentos, createRastreamento, getEmbarques,
  type ScmRastreamento, type ScmEmbarque,
} from '../../../lib/scm';

// ── Modal novo evento ─────────────────────────────────────────────────────────
interface EventoModalProps {
  embarques: ScmEmbarque[];
  onSave: (p: Omit<ScmRastreamento, 'id' | 'created_at' | 'scm_embarques' | 'tenant_id'>) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}

function EventoModal({ embarques, onSave, onClose, saving }: EventoModalProps) {
  const [embarqueId, setEmbarqueId] = useState('');
  const [status, setStatus] = useState('');
  const [descricao, setDescricao] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!embarqueId || !status.trim() || !descricao.trim()) {
      setErr('Embarque, status e descrição são obrigatórios.'); return;
    }
    setErr('');
    await onSave({
      embarque_id: embarqueId,
      status: status.trim(),
      descricao: descricao.trim(),
      latitude: lat ? Number(lat) : null,
      longitude: lng ? Number(lng) : null,
    });
  }

  const STATUS_SUGERIDOS = [
    'Coletado na origem', 'Em trânsito', 'Chegou ao centro de distribuição',
    'Saiu para entrega', 'Tentativa de entrega', 'Entregue ao destinatário',
    'Endereço não encontrado', 'Devolvido ao remetente',
  ];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Novo Evento de Rastreamento</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Embarque *</label>
            <select value={embarqueId} onChange={(e) => setEmbarqueId(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-emerald-400">
              <option value="">Selecione um embarque...</option>
              {embarques.map((e) => (
                <option key={e.id} value={e.id}>{e.numero} — {e.origem} → {e.destino}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Status *</label>
            <input
              list="status-list" value={status} onChange={(e) => setStatus(e.target.value)}
              placeholder="Ex: Em trânsito..." className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400"
            />
            <datalist id="status-list">
              {STATUS_SUGERIDOS.map((s) => <option key={s} value={s} />)}
            </datalist>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Descrição *</label>
            <textarea
              value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2}
              placeholder="Descreva o evento de rastreamento..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400 resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Latitude</label>
              <input type="number" value={lat} onChange={(e) => setLat(e.target.value)} step="any" placeholder="-23.5505" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Longitude</label>
              <input type="number" value={lng} onChange={(e) => setLng(e.target.value)} step="any" placeholder="-46.6333" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
            </div>
          </div>
          {err && <p className="text-sm text-red-500">{err}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100">Cancelar</button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
              {saving ? 'Salvando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Componente de linha de timeline ──────────────────────────────────────────
function TimelineItem({ event, isLast }: { event: ScmRastreamento; isLast: boolean }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-emerald-200 shrink-0 mt-1" />
        {!isLast && <div className="w-px flex-1 bg-slate-200 mt-1 mb-0" />}
      </div>
      <div className={`pb-4 ${isLast ? '' : ''}`}>
        <p className="text-sm font-medium text-slate-800">{event.status}</p>
        <p className="text-xs text-slate-500 mt-0.5">{event.descricao}</p>
        <div className="flex items-center gap-3 mt-1">
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Clock className="w-3 h-3" />
            {new Date(event.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </span>
          {event.latitude && event.longitude && (
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <MapPin className="w-3 h-3" />
              {event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Grupo por embarque ────────────────────────────────────────────────────────
function EmbarqueGroup({ numero, destino, events }: { numero: string; destino: string; events: ScmRastreamento[] }) {
  const [open, setOpen] = useState(true);
  const latest = events[0];

  return (
    <div className="bg-white rounded-2xl border border-slate-100">
      <button onClick={() => setOpen((p) => !p)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 rounded-2xl transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Package className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-slate-800 text-sm">{numero}</p>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {destino}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {latest && (
            <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-medium">
              {latest.status}
            </span>
          )}
          <span className="text-xs text-slate-400">{events.length} evento{events.length !== 1 ? 's' : ''}</span>
          {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-slate-50 pt-4">
          {events.map((ev, i) => (
            <TimelineItem key={ev.id} event={ev} isLast={i === events.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function LastMile() {
  const [events, setEvents] = useState<ScmRastreamento[]>([]);
  const [embarques, setEmbarques] = useState<ScmEmbarque[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true); setError('');
    try {
      const [ev, emb] = await Promise.all([getRastreamentos(), getEmbarques()]);
      setEvents(ev); setEmbarques(emb);
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  // Refresh embarques when modal opens to pick up shipments added in TMS
  useEffect(() => {
    if (modal) getEmbarques().then(setEmbarques).catch(() => {});
  }, [modal]);

  async function handleSave(payload: Omit<ScmRastreamento, 'id' | 'created_at' | 'scm_embarques' | 'tenant_id'>) {
    setSaving(true);
    try {
      const created = await createRastreamento(payload);
      setEvents((p) => [created, ...p]);
      setModal(false);
    } catch (e) { alert(e instanceof Error ? e.message : 'Erro'); }
    finally { setSaving(false); }
  }

  // Agrupar eventos por embarque (ignora eventos sem embarque_id)
  const grouped = events.reduce((acc, ev) => {
    if (!ev.embarque_id) return acc;
    const key = ev.embarque_id;
    if (!acc[key]) {
      acc[key] = { events: [], meta: ev.scm_embarques ?? null };
    } else if (!acc[key].meta && ev.scm_embarques) {
      acc[key].meta = ev.scm_embarques;
    }
    acc[key].events.push(ev);
    return acc;
  }, {} as Record<string, { events: ScmRastreamento[]; meta: ScmRastreamento['scm_embarques'] }>);

  const filteredKeys = Object.keys(grouped).filter((key) => {
    if (!search) return true;
    const { meta } = grouped[key];
    if (!meta) return true;
    const q = search.toLowerCase();
    return meta.numero.toLowerCase().includes(q) || meta.destino.toLowerCase().includes(q);
  });

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Rastreamento Last-Mile</h1>
          <p className="text-sm text-slate-500 mt-0.5">Eventos de entrega em tempo real por embarque</p>
        </div>
        <button onClick={() => setModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">
          <Plus className="w-4 h-4" /> Novo Evento
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por embarque ou destino..." className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-white rounded-2xl border border-slate-100 animate-pulse" />)}</div>
      ) : filteredKeys.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
          <Navigation className="w-12 h-12 text-slate-200 mb-3" />
          <p className="text-slate-500 font-medium">Nenhum evento de rastreamento</p>
          <p className="text-sm text-slate-400 mb-4">Registre eventos para acompanhar entregas</p>
          <button onClick={() => setModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium">
            <Plus className="w-4 h-4" /> Registrar Evento
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredKeys.map((key) => (
            <EmbarqueGroup
              key={key}
              numero={grouped[key].meta?.numero ?? key.slice(0, 8)}
              destino={grouped[key].meta?.destino ?? '—'}
              events={grouped[key].events}
            />
          ))}
        </div>
      )}

      {modal && (
        <EventoModal
          embarques={embarques}
          onSave={handleSave}
          onClose={() => setModal(false)}
          saving={saving}
        />
      )}
    </div>
  );
}
