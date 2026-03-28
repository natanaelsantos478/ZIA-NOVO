import { useState, useEffect, useMemo } from 'react';
import {
  ArrowDownCircle, Loader2, CheckCircle, AlertCircle,
  Search, X, Clock, TrendingUp, AlertTriangle, DollarSign,
} from 'lucide-react';
import { getLancamentos, getContasBancarias, pagarLancamento } from '../../../lib/erp';
import type { ErpLancamento, ErpContaBancaria } from '../../../lib/erp';

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const today = () => new Date().toISOString().split('T')[0];

function diffDays(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00');
  const t = new Date(today() + 'T00:00');
  return Math.round((t.getTime() - d.getTime()) / 86_400_000);
}

function agingBucket(l: ErpLancamento): '0-30' | '31-60' | '61-90' | '+90' | 'ok' {
  if (l.status !== 'PENDENTE') return 'ok';
  const days = diffDays(l.data_vencimento);
  if (days <= 0) return 'ok';          // a vencer
  if (days <= 30) return '0-30';
  if (days <= 60) return '31-60';
  if (days <= 90) return '61-90';
  return '+90';
}

const AGING_CONFIG = [
  { key: '0-30',  label: '1 – 30 dias',  color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  { key: '31-60', label: '31 – 60 dias', color: 'text-orange-700 bg-orange-50 border-orange-200' },
  { key: '61-90', label: '61 – 90 dias', color: 'text-red-700 bg-red-50 border-red-200' },
  { key: '+90',   label: '+ 90 dias',    color: 'text-red-900 bg-red-100 border-red-300' },
] as const;

type AgingKey = '0-30' | '31-60' | '61-90' | '+90';

export default function ContasReceber() {
  const [lancamentos, setLancamentos] = useState<ErpLancamento[]>([]);
  const [contas, setContas] = useState<ErpContaBancaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'PENDENTE' | 'PAGO' | 'VENCIDO'>('TODOS');
  const [agingFilter, setAgingFilter] = useState<AgingKey | 'TODOS'>('TODOS');

  // Baixa modal
  const [baixaId, setBaixaId] = useState<string | null>(null);
  const [baixaData, setBaixaData] = useState(today());
  const [baixaConta, setBaixaConta] = useState('');
  const [salvando, setSalvando] = useState(false);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function load() {
    try {
      const [data, cs] = await Promise.all([getLancamentos('RECEITA'), getContasBancarias()]);
      setLancamentos(data);
      setContas(cs);
    } catch (e) {
      showToast('Erro ao carregar dados: ' + (e as Error).message, false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleBaixa() {
    if (!baixaId) return;
    setSalvando(true);
    try {
      await pagarLancamento(baixaId, baixaData, baixaConta || undefined);
      showToast('Recebimento registrado com sucesso.', true);
      setBaixaId(null);
      load();
    } catch (e) {
      showToast('Erro: ' + (e as Error).message, false);
    } finally {
      setSalvando(false);
    }
  }

  // ── KPIs ──────────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const pendentes = lancamentos.filter(l => l.status === 'PENDENTE');
    const vencidos = pendentes.filter(l => diffDays(l.data_vencimento) > 0);
    const thisMonth = new Date().toISOString().slice(0, 7);
    const recebidoMes = lancamentos
      .filter(l => l.status === 'PAGO' && l.data_pagamento?.startsWith(thisMonth))
      .reduce((s, l) => s + l.valor, 0);
    const aVencer30 = pendentes
      .filter(l => { const d = diffDays(l.data_vencimento); return d <= 0 && d >= -30; })
      .reduce((s, l) => s + l.valor, 0);

    return {
      totalPendente: pendentes.reduce((s, l) => s + l.valor, 0),
      totalVencido: vencidos.reduce((s, l) => s + l.valor, 0),
      aVencer30,
      recebidoMes,
    };
  }, [lancamentos]);

  // ── Aging summary ─────────────────────────────────────────────────────────────
  const agingSummary = useMemo(() => {
    const res: Record<AgingKey, number> = { '0-30': 0, '31-60': 0, '61-90': 0, '+90': 0 };
    lancamentos.forEach(l => {
      const b = agingBucket(l);
      if (b !== 'ok') res[b] += l.valor;
    });
    return res;
  }, [lancamentos]);

  // ── Filtered list ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return lancamentos.filter(l => {
      if (search && !l.descricao.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter === 'VENCIDO') {
        return l.status === 'PENDENTE' && diffDays(l.data_vencimento) > 0;
      }
      if (statusFilter !== 'TODOS' && l.status !== statusFilter) return false;
      if (agingFilter !== 'TODOS' && agingBucket(l) !== agingFilter) return false;
      return true;
    });
  }, [lancamentos, search, statusFilter, agingFilter]);

  const baixaLancamento = baixaId ? lancamentos.find(l => l.id === baixaId) : null;

  return (
    <div className="p-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <ArrowDownCircle className="w-5 h-5 text-emerald-600" />
          <h1 className="text-xl font-bold text-slate-900">Contas a Receber</h1>
        </div>
        <p className="text-sm text-slate-500">Gestão de recebíveis com aging e baixa manual</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Pendente',   value: kpis.totalPendente, icon: Clock,         color: 'text-amber-600 bg-amber-50 border-amber-200' },
          { label: 'Total Vencido',    value: kpis.totalVencido,  icon: AlertTriangle,  color: 'text-red-600 bg-red-50 border-red-200' },
          { label: 'A Vencer (30d)',   value: kpis.aVencer30,     icon: TrendingUp,     color: 'text-blue-600 bg-blue-50 border-blue-200' },
          { label: 'Recebido no Mês',  value: kpis.recebidoMes,   icon: DollarSign,     color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`bg-white rounded-xl border p-4 ${color.split(' ').slice(2).join(' ')}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color.split(' ').slice(0, 2).join(' ')}`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-xs text-slate-500 font-medium">{label}</span>
            </div>
            <div className={`text-lg font-bold ${color.split(' ')[0]}`}>{BRL(value)}</div>
          </div>
        ))}
      </div>

      {/* Aging buckets */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {AGING_CONFIG.map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => setAgingFilter(agingFilter === key ? 'TODOS' : key)}
            className={`rounded-xl border p-3 text-left transition-all ${color} ${agingFilter === key ? 'ring-2 ring-offset-1 ring-current' : 'opacity-80 hover:opacity-100'}`}
          >
            <div className="text-xs font-medium mb-1">{label}</div>
            <div className="text-base font-bold">{BRL(agingSummary[key])}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Buscar descrição..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex gap-1">
          {(['TODOS', 'PENDENTE', 'VENCIDO', 'PAGO'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              {s === 'TODOS' ? 'Todos' : s === 'PENDENTE' ? 'Pendente' : s === 'VENCIDO' ? 'Vencido' : 'Pago'}
            </button>
          ))}
        </div>
        {agingFilter !== 'TODOS' && (
          <button
            onClick={() => setAgingFilter('TODOS')}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800"
          >
            <X className="w-3 h-3" /> Limpar aging
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">Títulos a Receber</span>
          <span className="text-xs text-slate-400">{filtered.length} registro(s)</span>
        </div>
        {loading ? (
          <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Descrição</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Categoria</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Vencimento</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Aging</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Valor</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-slate-400">Nenhum título encontrado.</td></tr>
                ) : filtered.map(l => {
                  const bucket = agingBucket(l);
                  const overdue = l.status === 'PENDENTE' && diffDays(l.data_vencimento) > 0;
                  return (
                    <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-800 max-w-xs truncate">{l.descricao}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{l.categoria}</td>
                      <td className={`px-4 py-3 text-sm ${overdue ? 'text-red-600 font-medium' : 'text-slate-600'}`}>
                        {new Date(l.data_vencimento + 'T00:00').toLocaleDateString('pt-BR')}
                        {overdue && <span className="ml-1 text-xs">({diffDays(l.data_vencimento)}d)</span>}
                      </td>
                      <td className="px-4 py-3">
                        {bucket !== 'ok' ? (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${AGING_CONFIG.find(a => a.key === bucket)?.color}`}>
                            {AGING_CONFIG.find(a => a.key === bucket)?.label}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                        {BRL(l.valor)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          l.status === 'PAGO' ? 'bg-green-100 text-green-700' :
                          overdue ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {l.status === 'PAGO' ? 'Recebido' : overdue ? 'Vencido' : 'A Receber'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {l.status === 'PENDENTE' && (
                          <button
                            onClick={() => { setBaixaId(l.id); setBaixaData(today()); setBaixaConta(''); }}
                            className="text-xs font-medium text-emerald-600 hover:text-emerald-800 whitespace-nowrap transition-colors"
                          >
                            Dar baixa
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de baixa */}
      {baixaId && baixaLancamento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Confirmar Recebimento</h3>
              <button onClick={() => setBaixaId(null)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 mb-4">
              <p className="text-sm font-medium text-slate-800 truncate">{baixaLancamento.descricao}</p>
              <p className="text-lg font-bold text-emerald-600 mt-1">{BRL(baixaLancamento.valor)}</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Data do Recebimento</label>
                <input
                  type="date"
                  value={baixaData}
                  onChange={e => setBaixaData(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Conta de Destino</label>
                <select
                  value={baixaConta}
                  onChange={e => setBaixaConta(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Sem conta específica</option>
                  {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setBaixaId(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleBaixa}
                disabled={salvando}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirmar Baixa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
