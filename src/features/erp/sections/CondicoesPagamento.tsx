// ERP — Condições de Pagamento
import { useState, useEffect } from 'react';
import {
  CreditCard, Plus, Loader2, CheckCircle, AlertCircle,
  X, Trash2, ToggleLeft, ToggleRight,
} from 'lucide-react';
import {
  getCondicoesPagamento, createCondicaoPagamento, toggleCondicaoPagamento,
} from '../../../lib/erp';
import type { ErpCondicaoPagamento } from '../../../lib/erp';

interface Parcela { prazo: number; percentual: number }

function descricaoParcelas(parcelas: Parcela[]): string {
  if (!parcelas.length) return 'À vista';
  return parcelas.map(p => `${p.prazo}d`).join('/');
}

export default function CondicoesPagamento() {
  const [condicoes, setCondicoes] = useState<ErpCondicaoPagamento[]>([]);
  const [loading, setLoading]     = useState(true);
  const [toast, setToast]         = useState<{ msg: string; ok: boolean } | null>(null);
  const [showForm, setShowForm]   = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Form
  const [descricao, setDescricao] = useState('');
  const [parcelas, setParcelas]   = useState<Parcela[]>([{ prazo: 30, percentual: 100 }]);
  const [saving, setSaving]       = useState(false);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function load() {
    try { setCondicoes(await getCondicoesPagamento()); }
    catch (e) { showToast('Erro: ' + (e as Error).message, false); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function addParcela() {
    const used = parcelas.reduce((s, p) => s + p.percentual, 0);
    const restante = Math.max(0, 100 - used);
    setParcelas(prev => [...prev, { prazo: (prev.at(-1)?.prazo ?? 0) + 30, percentual: restante }]);
  }

  function removeParcela(i: number) {
    if (parcelas.length === 1) return;
    setParcelas(prev => prev.filter((_, idx) => idx !== i));
  }

  function updateParcela(i: number, field: keyof Parcela, value: number) {
    setParcelas(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p));
  }

  const totalPct = parcelas.reduce((s, p) => s + p.percentual, 0);

  async function handleSave() {
    if (!descricao.trim()) return showToast('Descrição obrigatória.', false);
    if (Math.abs(totalPct - 100) > 0.01) return showToast(`Percentuais devem somar 100% (atual: ${totalPct}%).`, false);
    setSaving(true);
    try {
      await createCondicaoPagamento({ descricao: descricao.trim(), parcelas_json: parcelas, ativo: true });
      showToast('Condição criada.', true);
      setDescricao(''); setParcelas([{ prazo: 30, percentual: 100 }]); setShowForm(false);
      load();
    } catch (e) { showToast('Erro: ' + (e as Error).message, false); }
    finally { setSaving(false); }
  }

  async function handleToggle(c: ErpCondicaoPagamento) {
    setTogglingId(c.id);
    try {
      await toggleCondicaoPagamento(c.id, !c.ativo);
      setCondicoes(prev => prev.map(x => x.id === c.id ? { ...x, ativo: !x.ativo } : x));
    } catch (e) { showToast('Erro: ' + (e as Error).message, false); }
    finally { setTogglingId(null); }
  }

  const ativas   = condicoes.filter(c => c.ativo);
  const inativas = condicoes.filter(c => !c.ativo);

  return (
    <div className="p-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900">Condições de Pagamento</h1>
          </div>
          <p className="text-sm text-slate-500">Tabelas de prazo e parcelamento utilizadas em pedidos e propostas</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Nova Condição
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Nova Condição de Pagamento</h3>
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-600 mb-1">Descrição *</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={descricao} onChange={e => setDescricao(e.target.value)}
              placeholder="Ex: 30/60/90 dias, À vista, 2x sem juros…" />
          </div>

          {/* Parcelas */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-600">Parcelas</label>
              <span className={`text-xs font-semibold ${Math.abs(totalPct - 100) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                Total: {totalPct}%
              </span>
            </div>
            <div className="space-y-2">
              {parcelas.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 w-6">{i + 1}ª</span>
                  <div className="flex items-center gap-1 flex-1">
                    <input type="number" min={1} className="w-24 border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={p.prazo} onChange={e => updateParcela(i, 'prazo', +e.target.value)} />
                    <span className="text-xs text-slate-400">dias</span>
                  </div>
                  <div className="flex items-center gap-1 flex-1">
                    <input type="number" min={0} max={100} step={0.01} className="w-24 border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={p.percentual} onChange={e => updateParcela(i, 'percentual', +e.target.value)} />
                    <span className="text-xs text-slate-400">%</span>
                  </div>
                  <button onClick={() => removeParcela(i)} disabled={parcelas.length === 1}
                    className="text-slate-300 hover:text-red-400 disabled:opacity-30 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={addParcela}
              className="mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors">
              <Plus className="w-3 h-3" /> Adicionar parcela
            </button>
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Salvar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div>
      ) : condicoes.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Nenhuma condição cadastrada.</p>
          <p className="text-xs text-slate-400 mt-1">Crie condições como "À vista", "30/60/90 dias", "2x sem juros".</p>
        </div>
      ) : (
        <>
          {/* Ativas */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Condições Ativas</span>
              <span className="text-xs text-slate-400">{ativas.length} condição(ões)</span>
            </div>
            {ativas.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Nenhuma condição ativa.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Descrição</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Prazos</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Parcelas</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Ativo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ativas.map(c => (
                    <CondicaoRow key={c.id} c={c} toggling={togglingId === c.id} onToggle={handleToggle} />
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Inativas */}
          {inativas.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden opacity-70">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <span className="text-sm font-semibold text-slate-500">Inativas ({inativas.length})</span>
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {inativas.map(c => (
                    <CondicaoRow key={c.id} c={c} toggling={togglingId === c.id} onToggle={handleToggle} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CondicaoRow({
  c, toggling, onToggle,
}: {
  c: ErpCondicaoPagamento;
  toggling: boolean;
  onToggle: (c: ErpCondicaoPagamento) => void;
}) {
  const parcelas: { prazo: number; percentual: number }[] = Array.isArray(c.parcelas_json) ? c.parcelas_json : [];

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3 font-medium text-slate-800">{c.descricao}</td>
      <td className="px-4 py-3 text-slate-600">
        {parcelas.length === 0 ? 'À vista' : descricaoParcelas(parcelas)}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {parcelas.length === 0 ? (
            <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full">À vista 100%</span>
          ) : parcelas.map((p, i) => (
            <span key={i} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
              {p.prazo}d · {p.percentual}%
            </span>
          ))}
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        <button onClick={() => onToggle(c)} disabled={toggling}
          className="text-slate-400 hover:text-slate-700 disabled:opacity-50 transition-colors">
          {toggling
            ? <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            : c.ativo
              ? <ToggleRight className="w-6 h-6 text-blue-500" />
              : <ToggleLeft className="w-6 h-6 text-slate-400" />
          }
        </button>
      </td>
    </tr>
  );
}

function descricaoParcelas(parcelas: { prazo: number; percentual: number }[]): string {
  return parcelas.map(p => `${p.prazo}d`).join('/');
}
