// Green — Sustentabilidade (ESG) e Métricas Ambientais
import { useEffect, useState } from 'react';
import {
  Leaf, Plus, X, Pencil, AlertTriangle, TrendingDown, Gauge, Fuel,
} from 'lucide-react';
import {
  getEsgMetricas, createEsgMetrica, updateEsgMetrica,
  type ScmEsgMetrica,
} from '../../../lib/scm';

// ── Modal ─────────────────────────────────────────────────────────────────────
interface ModalProps {
  initial: ScmEsgMetrica | null;
  onSave: (p: Omit<ScmEsgMetrica, 'id' | 'created_at' | 'tenant_id'>) => Promise<void>;
  onClose: () => void;
  saving: boolean;
}

function EsgModal({ initial, onSave, onClose, saving }: ModalProps) {
  const [periodo, setPeriodo] = useState(initial?.periodo ?? new Date().toISOString().slice(0, 7));
  const [co2, setCo2] = useState(initial ? String(initial.emissao_co2_kg) : '');
  const [km, setKm] = useState(initial ? String(initial.km_percorridos) : '');
  const [carga, setCarga] = useState(initial ? String(initial.carga_transportada_kg) : '');
  const [fretes, setFretes] = useState(initial ? String(initial.fretes_realizados) : '');
  const [combustivel, setCombustivel] = useState(initial?.combustivel_litros != null ? String(initial.combustivel_litros) : '');
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!periodo || !co2 || !km || !carga || !fretes) { setErr('Todos os campos principais são obrigatórios.'); return; }
    setErr('');
    await onSave({
      periodo, emissao_co2_kg: Number(co2), km_percorridos: Number(km),
      carga_transportada_kg: Number(carga), fretes_realizados: Number(fretes),
      combustivel_litros: combustivel ? Number(combustivel) : null,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">{initial ? 'Editar Período ESG' : 'Nova Métrica ESG'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Período (Ano-Mês) *</label>
            <input type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Emissão CO₂ (kg) *</label>
              <input type="number" value={co2} onChange={(e) => setCo2(e.target.value)} placeholder="0" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">KM Percorridos *</label>
              <input type="number" value={km} onChange={(e) => setKm(e.target.value)} placeholder="0" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Carga Trans. (kg) *</label>
              <input type="number" value={carga} onChange={(e) => setCarga(e.target.value)} placeholder="0" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Fretes Realizados *</label>
              <input type="number" value={fretes} onChange={(e) => setFretes(e.target.value)} placeholder="0" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Combustível (litros)</label>
            <input type="number" value={combustivel} onChange={(e) => setCombustivel(e.target.value)} placeholder="0" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-400" />
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
export default function Green() {
  const [items, setItems] = useState<ScmEsgMetrica[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<ScmEsgMetrica | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true); setError('');
    try { setItems(await getEsgMetricas()); }
    catch (e) { setError(e instanceof Error ? e.message : 'Erro'); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleSave(p: Omit<ScmEsgMetrica, 'id' | 'created_at' | 'tenant_id'>) {
    setSaving(true);
    try {
      if (modal === 'edit' && selected) {
        await updateEsgMetrica(selected.id, p);
        await load();
      } else {
        const c = await createEsgMetrica(p);
        setItems((prev) => [c, ...prev]);
      }
      setModal(null); setSelected(null);
    } catch (e) { alert(e instanceof Error ? e.message : 'Erro'); }
    finally { setSaving(false); }
  }

  const totalCo2 = items.reduce((s, i) => s + i.emissao_co2_kg, 0);
  const totalKm = items.reduce((s, i) => s + i.km_percorridos, 0);
  const intensidade = totalKm > 0 ? (totalCo2 / totalKm * 1000).toFixed(1) : null; // g CO₂/km

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sustentabilidade (ESG)</h1>
          <p className="text-sm text-slate-500 mt-0.5">Emissões de CO₂, consumo de combustível e indicadores ambientais</p>
        </div>
        <button onClick={() => { setSelected(null); setModal('create'); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">
          <Plus className="w-4 h-4" /> Novo Período
        </button>
      </div>

      {/* Totais acumulados */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="w-4 h-4 text-red-500" />
              <span className="text-xs text-slate-500">CO₂ Total</span>
            </div>
            <p className="text-lg font-bold text-slate-800">{(totalCo2 / 1000).toFixed(2)} t</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Gauge className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-slate-500">KM Totais</span>
            </div>
            <p className="text-lg font-bold text-slate-800">{totalKm.toLocaleString('pt-BR')}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Leaf className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-slate-500">Intensidade</span>
            </div>
            <p className="text-lg font-bold text-slate-800">{intensidade ?? '—'} <span className="text-xs font-normal text-slate-400">g/km</span></p>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Fuel className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-slate-500">Combustível</span>
            </div>
            <p className="text-lg font-bold text-slate-800">{items.reduce((s, i) => s + (i.combustivel_litros ?? 0), 0).toLocaleString('pt-BR')} L</p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 bg-white rounded-xl border border-slate-100 animate-pulse" />)}</div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
          <Leaf className="w-12 h-12 text-slate-200 mb-3" />
          <p className="text-slate-500 font-medium">Nenhuma métrica ESG registrada</p>
          <p className="text-sm text-slate-400 mb-4">Registre emissões e indicadores de sustentabilidade</p>
          <button onClick={() => { setSelected(null); setModal('create'); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium">
            <Plus className="w-4 h-4" /> Iniciar Rastreamento ESG
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Período', 'CO₂ (kg)', 'KM Percorridos', 'Carga (kg)', 'Fretes', 'Combustível (L)', 'Intensidade', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {items.map((item) => {
                  const intens = item.km_percorridos > 0
                    ? (item.emissao_co2_kg / item.km_percorridos * 1000).toFixed(1)
                    : '—';
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-800">{item.periodo}</td>
                      <td className="px-4 py-3 text-slate-600">{item.emissao_co2_kg.toLocaleString('pt-BR')}</td>
                      <td className="px-4 py-3 text-slate-600">{item.km_percorridos.toLocaleString('pt-BR')}</td>
                      <td className="px-4 py-3 text-slate-600">{item.carga_transportada_kg.toLocaleString('pt-BR')}</td>
                      <td className="px-4 py-3 text-slate-600">{item.fretes_realizados}</td>
                      <td className="px-4 py-3 text-slate-500">{item.combustivel_litros != null ? item.combustivel_litros.toLocaleString('pt-BR') : '—'}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-emerald-700">{intens} g/km</span>
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
        <EsgModal
          initial={modal === 'edit' ? selected : null}
          onSave={handleSave}
          onClose={() => { setModal(null); setSelected(null); }}
          saving={saving}
        />
      )}
    </div>
  );
}
