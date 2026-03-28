import { useEffect, useState, useCallback } from 'react';
import { Shield, Plus, AlertTriangle, X } from 'lucide-react';
import {
  getInsurancePolicies, createInsurancePolicy, updateInsurancePolicy,
  getClaims, createClaim, updateClaim,
  type InsurancePolicy, type InsuranceClaim,
} from '../../../lib/eam';

const POL_STATUS_COLORS: Record<string, string> = { ativa: 'bg-green-100 text-green-700', vencida: 'bg-red-100 text-red-700', cancelada: 'bg-slate-100 text-slate-500' };
const CLAIM_STATUS_LABELS: Record<string, string> = { aberto: 'Aberto', em_analise: 'Em Análise', pago: 'Pago', negado: 'Negado', encerrado: 'Encerrado' };
const CLAIM_STATUS_COLORS: Record<string, string> = { aberto: 'bg-yellow-100 text-yellow-700', em_analise: 'bg-blue-100 text-blue-700', pago: 'bg-green-100 text-green-700', negado: 'bg-red-100 text-red-700', encerrado: 'bg-slate-100 text-slate-500' };

function fmt(v: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v); }
function daysUntil(date: string) { return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000); }

function Toast({ msg, type, onClose }: { msg: string; type: 'ok' | 'err'; onClose: () => void }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-white text-sm ${type === 'ok' ? 'bg-green-600' : 'bg-red-600'}`}>
      <span>{msg}</span><button onClick={onClose}><X className="w-4 h-4" /></button>
    </div>
  );
}

type TabId = 'policies' | 'claims';

export default function AssetInsurance() {
  const [tab, setTab] = useState<TabId>('policies');
  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);
  const [claims, setClaims] = useState<InsuranceClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  const [polForm, setPolForm] = useState({
    policy_number: '', insurer_name: '', coverage_type: 'patrimonial',
    insured_value: 0, annual_premium: 0, coverage_start: '', coverage_end: '',
    broker_name: '', notes: '', status: 'ativa' as InsurancePolicy['status'],
  });
  const [claimForm, setClaimForm] = useState({
    policy_id: '', claim_date: new Date().toISOString().split('T')[0],
    description: '', claim_value: 0, status: 'aberto' as InsuranceClaim['status'],
  });

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  const load = useCallback(async () => {
    setLoading(true);
    const [pols, cls] = await Promise.all([getInsurancePolicies(), getClaims()]);
    setPolicies(pols); setClaims(cls); setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreatePolicy(e: React.FormEvent) {
    e.preventDefault();
    if (!polForm.policy_number || !polForm.insurer_name || !polForm.coverage_start || !polForm.coverage_end) {
      showToast('Preencha os campos obrigatórios', 'err'); return;
    }
    setSaving(true);
    try {
      await createInsurancePolicy(polForm as Omit<InsurancePolicy, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>);
      setShowForm(false);
      setPolForm({ policy_number: '', insurer_name: '', coverage_type: 'patrimonial', insured_value: 0, annual_premium: 0, coverage_start: '', coverage_end: '', broker_name: '', notes: '', status: 'ativa' });
      await load(); showToast('Apólice cadastrada!');
    } catch { showToast('Erro ao cadastrar apólice', 'err'); }
    finally { setSaving(false); }
  }

  async function handleCreateClaim(e: React.FormEvent) {
    e.preventDefault();
    if (!claimForm.policy_id || !claimForm.description) { showToast('Preencha os campos obrigatórios', 'err'); return; }
    setSaving(true);
    try {
      await createClaim(claimForm as Omit<InsuranceClaim, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>);
      setShowForm(false);
      setClaimForm({ policy_id: '', claim_date: new Date().toISOString().split('T')[0], description: '', claim_value: 0, status: 'aberto' });
      await load(); showToast('Sinistro registrado!');
    } catch { showToast('Erro ao registrar sinistro', 'err'); }
    finally { setSaving(false); }
  }

  async function handleUpdateClaim(id: string, status: InsuranceClaim['status']) {
    await updateClaim(id, { status });
    await load(); showToast('Status atualizado');
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Seguros</h1>
          <p className="text-slate-500 text-sm">Apólices e sinistros do patrimônio</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> {tab === 'policies' ? 'Nova Apólice' : 'Novo Sinistro'}
        </button>
      </div>

      <div className="flex border-b border-slate-200">
        {(['policies', 'claims'] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); setShowForm(false); }}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {t === 'policies' ? `Apólices (${policies.length})` : `Sinistros (${claims.length})`}
          </button>
        ))}
      </div>

      {/* POLICIES */}
      {tab === 'policies' && (
        <>
          {showForm && (
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <h2 className="text-base font-semibold text-slate-800 mb-4">Nova Apólice</h2>
              <form onSubmit={handleCreatePolicy} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  ['Número da Apólice *', 'policy_number', 'text'],
                  ['Seguradora *', 'insurer_name', 'text'],
                  ['Corretora', 'broker_name', 'text'],
                  ['Valor Segurado (R$)', 'insured_value', 'number'],
                  ['Prêmio Anual (R$)', 'annual_premium', 'number'],
                  ['Início da Vigência *', 'coverage_start', 'date'],
                  ['Fim da Vigência *', 'coverage_end', 'date'],
                ].map(([label, key, type]) => (
                  <div key={key as string}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{label as string}</label>
                    <input type={type as string} value={(polForm as Record<string, unknown>)[key as string] as string}
                      onChange={(e) => setPolForm((f) => ({ ...f, [key as string]: type === 'number' ? Number(e.target.value) : e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tipo de Cobertura</label>
                  <select value={polForm.coverage_type} onChange={(e) => setPolForm((f) => ({ ...f, coverage_type: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {['patrimonial', 'vida', 'responsabilidade', 'roubo', 'incendio', 'all_risk', 'outro'].map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Observações</label>
                  <textarea value={polForm.notes ?? ''} onChange={(e) => setPolForm((f) => ({ ...f, notes: e.target.value }))} rows={2}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="sm:col-span-2 flex gap-3">
                  <button type="submit" disabled={saving} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">{saving ? 'Salvando…' : 'Salvar'}</button>
                  <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-40"><div className="w-7 h-7 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : policies.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <Shield className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">Nenhuma apólice cadastrada</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {policies.map((pol) => {
                  const days = daysUntil(pol.coverage_end);
                  const expiring = days > 0 && days <= 30;
                  return (
                    <div key={pol.id} className="p-4 hover:bg-slate-50">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${POL_STATUS_COLORS[pol.status]}`}>{pol.status}</span>
                            {expiring && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Vence em {days}d</span>}
                          </div>
                          <p className="font-medium text-slate-800 text-sm">{pol.insurer_name} · Apólice {pol.policy_number}</p>
                          <p className="text-xs text-slate-500">{pol.coverage_type} · Valor segurado: {fmt(pol.insured_value)}</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {new Date(pol.coverage_start).toLocaleDateString('pt-BR')} → {new Date(pol.coverage_end).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        {pol.status === 'ativa' && (
                          <button onClick={() => updateInsurancePolicy(pol.id, { status: 'cancelada' }).then(load)}
                            className="text-xs px-3 py-1.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100">Cancelar</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* CLAIMS */}
      {tab === 'claims' && (
        <>
          {showForm && (
            <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
              <h2 className="text-base font-semibold text-slate-800 mb-4">Registrar Sinistro</h2>
              <form onSubmit={handleCreateClaim} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Apólice *</label>
                  <select value={claimForm.policy_id} onChange={(e) => setClaimForm((f) => ({ ...f, policy_id: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                    <option value="">— Selecione —</option>
                    {policies.map((p) => <option key={p.id} value={p.id}>{p.insurer_name} · {p.policy_number}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Data do Sinistro</label>
                  <input type="date" value={claimForm.claim_date} onChange={(e) => setClaimForm((f) => ({ ...f, claim_date: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Valor Sinistrado (R$)</label>
                  <input type="number" value={claimForm.claim_value} onChange={(e) => setClaimForm((f) => ({ ...f, claim_value: Number(e.target.value) }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Descrição *</label>
                  <textarea value={claimForm.description} onChange={(e) => setClaimForm((f) => ({ ...f, description: e.target.value }))} rows={3}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                </div>
                <div className="sm:col-span-2 flex gap-3">
                  <button type="submit" disabled={saving} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">{saving ? 'Salvando…' : 'Registrar'}</button>
                  <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            {claims.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <Shield className="w-12 h-12 text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">Nenhum sinistro registrado</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {claims.map((c) => {
                  const pol = policies.find((p) => p.id === c.policy_id);
                  return (
                    <div key={c.id} className="p-4 hover:bg-slate-50">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CLAIM_STATUS_COLORS[c.status]}`}>{CLAIM_STATUS_LABELS[c.status]}</span>
                          <p className="font-medium text-slate-800 text-sm mt-1">{c.description}</p>
                          <p className="text-xs text-slate-500">{pol ? `${pol.insurer_name} · ${pol.policy_number}` : '—'}</p>
                          <p className="text-xs text-slate-400">{new Date(c.claim_date).toLocaleDateString('pt-BR')} · {c.claim_value ? fmt(c.claim_value) : '—'}</p>
                        </div>
                        {c.status === 'aberto' && (
                          <select onChange={(e) => handleUpdateClaim(c.id, e.target.value as InsuranceClaim['status'])} defaultValue={c.status}
                            className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="aberto">Aberto</option>
                            <option value="em_analise">Em Análise</option>
                            <option value="pago">Pago</option>
                            <option value="negado">Negado</option>
                            <option value="encerrado">Encerrado</option>
                          </select>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
