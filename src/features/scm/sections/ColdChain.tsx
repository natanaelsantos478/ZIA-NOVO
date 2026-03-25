// ColdChain — Monitoramento de Cadeia Fria (temperatura e umidade)
import { useEffect, useState } from 'react';
import {
  Thermometer, Plus, X, AlertTriangle, CheckCircle2, Droplets,
} from 'lucide-react';
import {
  getColdChainEvents, createColdChainEvent, getEmbarques,
  type ScmColdChain, type ScmEmbarque,
} from '../../../lib/scm';

const STATUS_MAP: Record<ScmColdChain['status'], { label: string; color: string; bg: string; dot: string }> = {
  normal:  { label: 'Normal',  color: 'text-green-700',  bg: 'bg-green-50 border-green-200',  dot: 'bg-green-500' },
  alerta:  { label: 'Alerta',  color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200',  dot: 'bg-amber-500' },
  critico: { label: 'Crítico', color: 'text-red-700',    bg: 'bg-red-50 border-red-200',      dot: 'bg-red-500' },
};

// ── Modal ─────────────────────────────────────────────────────────────────────
interface ModalProps {
  embarques: ScmEmbarque[];
  onSave: (p: Omit<ScmColdChain, 'id' | 'created_at' | 'scm_embarques'>) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}

function EventoModal({ embarques, onSave, onClose, saving }: ModalProps) {
  const [embId, setEmbId] = useState('');
  const [tempAtual, setTempAtual] = useState('');
  const [tempMin, setTempMin] = useState('');
  const [tempMax, setTempMax] = useState('');
  const [umidade, setUmidade] = useState('');
  const [status, setStatus] = useState<ScmColdChain['status']>('normal');
  const [sensorId, setSensorId] = useState('');
  const [obs, setObs] = useState('');
  const [err, setErr] = useState('');

  // Auto-detectar status baseado na temperatura
  useEffect(() => {
    if (tempAtual && tempMin && tempMax) {
      const t = Number(tempAtual);
      const min = Number(tempMin);
      const max = Number(tempMax);
      if (t < min || t > max) {
        const diff = Math.max(Math.abs(t - min), Math.abs(t - max));
        setStatus(diff > 5 ? 'critico' : 'alerta');
      } else {
        setStatus('normal');
      }
    }
  }, [tempAtual, tempMin, tempMax]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!tempAtual || !tempMin || !tempMax) { setErr('Temperaturas atual, mín. e máx. são obrigatórias.'); return; }
    setErr('');
    await onSave({
      embarque_id: embId || null,
      temperatura_atual: Number(tempAtual),
      temperatura_min: Number(tempMin),
      temperatura_max: Number(tempMax),
      umidade_pct: umidade ? Number(umidade) : null,
      status,
      sensor_id: sensorId.trim() || null,
      observacao: obs.trim() || null,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Registrar Leitura Cold Chain</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Embarque</label>
            <select value={embId} onChange={(e) => setEmbId(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-emerald-400">
              <option value="">Nenhum</option>
              {embarques.map((e) => <option key={e.id} value={e.id}>{e.numero} — {e.destino}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Temp. Atual (°C) *</label>
              <input type="number" value={tempAtual} onChange={(e) => setTempAtual(e.target.value)} step="0.1" placeholder="4.0" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Temp. Mín. (°C) *</label>
              <input type="number" value={tempMin} onChange={(e) => setTempMin(e.target.value)} step="0.1" placeholder="2.0" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Temp. Máx. (°C) *</label>
              <input type="number" value={tempMax} onChange={(e) => setTempMax(e.target.value)} step="0.1" placeholder="8.0" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
            </div>
          </div>
          {/* Status auto-detectado */}
          {tempAtual && tempMin && tempMax && (
            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm ${STATUS_MAP[status].bg}`}>
              <span className={`w-2 h-2 rounded-full ${STATUS_MAP[status].dot}`} />
              <span className={`font-medium ${STATUS_MAP[status].color}`}>Status detectado: {STATUS_MAP[status].label}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Umidade (%)</label>
              <input type="number" value={umidade} onChange={(e) => setUmidade(e.target.value)} min="0" max="100" placeholder="85" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">ID do Sensor</label>
              <input value={sensorId} onChange={(e) => setSensorId(e.target.value)} placeholder="SEN-001" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Observação</label>
            <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400 resize-none" />
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

// ── Main ──────────────────────────────────────────────────────────────────────
export default function ColdChain() {
  const [items, setItems] = useState<ScmColdChain[]>([]);
  const [embarques, setEmbarques] = useState<ScmEmbarque[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true); setError('');
    try {
      const [c, e] = await Promise.all([getColdChainEvents(), getEmbarques()]);
      setItems(c); setEmbarques(e);
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleSave(p: Omit<ScmColdChain, 'id' | 'created_at' | 'scm_embarques'>) {
    setSaving(true);
    try {
      const c = await createColdChainEvent(p);
      setItems((prev) => [c, ...prev]);
      setModal(false);
    } catch (e) { alert(e instanceof Error ? e.message : 'Erro'); }
    finally { setSaving(false); }
  }

  const alertas = items.filter((i) => i.status !== 'normal').length;
  const criticos = items.filter((i) => i.status === 'critico').length;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cadeia Fria (Cold Chain)</h1>
          <p className="text-sm text-slate-500 mt-0.5">Monitoramento de temperatura e umidade em embarques refrigerados</p>
        </div>
        <button onClick={() => setModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">
          <Plus className="w-4 h-4" /> Registrar Leitura
        </button>
      </div>

      {criticos > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700"><strong>{criticos}</strong> leitura{criticos !== 1 ? 's' : ''} em status CRÍTICO. Verifique imediatamente.</p>
        </div>
      )}
      {alertas > 0 && criticos === 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-700"><strong>{alertas}</strong> leitura{alertas !== 1 ? 's' : ''} fora do range ideal.</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 bg-white rounded-2xl border border-slate-100 animate-pulse" />)}</div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
          <Thermometer className="w-12 h-12 text-slate-200 mb-3" />
          <p className="text-slate-500 font-medium">Nenhuma leitura registrada</p>
          <p className="text-sm text-slate-400 mb-4">Registre leituras de temperatura de sensores IoT</p>
          <button onClick={() => setModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium">
            <Plus className="w-4 h-4" /> Registrar Leitura
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const st = STATUS_MAP[item.status];
            const emb = item.scm_embarques;
            const dentroDaFaixa = item.temperatura_atual >= item.temperatura_min && item.temperatura_atual <= item.temperatura_max;
            return (
              <div key={item.id} className={`rounded-2xl border p-4 ${st.bg}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    {emb && <p className="text-xs font-semibold text-slate-700">{emb.numero} → {emb.destino}</p>}
                    {item.sensor_id && <p className="text-xs text-slate-400 mt-0.5">Sensor: {item.sensor_id}</p>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${st.dot}`} />
                    <span className={`text-xs font-semibold ${st.color}`}>{st.label}</span>
                  </div>
                </div>
                <div className="flex items-end gap-2 mb-2">
                  <span className={`text-3xl font-bold ${st.color}`}>{item.temperatura_atual}°C</span>
                  {!dentroDaFaixa && <AlertTriangle className="w-5 h-5 text-red-500 mb-1" />}
                  {dentroDaFaixa && <CheckCircle2 className="w-5 h-5 text-green-500 mb-1" />}
                </div>
                <div className="text-xs text-slate-500 space-y-1">
                  <p>Faixa: {item.temperatura_min}°C — {item.temperatura_max}°C</p>
                  {item.umidade_pct != null && (
                    <p className="flex items-center gap-1"><Droplets className="w-3 h-3" /> {item.umidade_pct}% umidade</p>
                  )}
                  <p className="text-slate-400">{new Date(item.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                {item.observacao && (
                  <p className="mt-2 text-xs text-slate-500 italic border-t border-slate-200 pt-2">{item.observacao}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <EventoModal embarques={embarques} onSave={handleSave} onClose={() => setModal(false)} saving={saving} />
      )}
    </div>
  );
}
