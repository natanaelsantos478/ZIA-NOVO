import { useState, useEffect, useMemo } from 'react';
import {
  ArrowUpCircle, Loader2, CheckCircle, AlertCircle,
  Search, X, Clock, AlertTriangle, DollarSign, Plus,
} from 'lucide-react';
import { getLancamentos, createLancamento, getContasBancarias, pagarLancamento } from '../../../lib/erp';
import type { ErpLancamento, ErpContaBancaria } from '../../../lib/erp';

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const today = () => new Date().toISOString().split('T')[0];

function diffDays(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00');
  const t = new Date(today() + 'T00:00');
  return Math.round((t.getTime() - d.getTime()) / 86_400_000);
}

const CATEGORIAS = ['OPERACIONAL', 'FISCAL', 'FOLHA', 'FORNECEDOR', 'HOSPEDAGEM', 'OUTROS'];

type StatusFilter = 'TODOS' | 'PENDENTE' | 'VENCIDO' | 'PAGO';

export default function ContasPagar() {
  const [lancamentos, setLancamentos] = useState<ErpLancamento[]>([]);
  const [contas, setContas] = useState<ErpContaBancaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('TODOS');

  // Form
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [dataVencimento, setDataVencimento] = useState(today());
  const [contaId, setContaId] = useState('');
  const [pagarNow, setPagarNow] = useState(false);
  const [dataPagamento, setDataPagamento] = useState(today());
  const [saving, setSaving] = useState(false);

  // Baixa
  const [baixaId, setBaixaId] = useState<string | null>(null);
  const [baixaData, setBaixaData] = useState(today());
  const [baixaConta, setBaixaConta] = useState('');
  const [salvandoBaixa, setSalvandoBaixa] = useState(false);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function load() {
    try {
      const [data, cs] = await Promise.all([getLancamentos('DESPESA'), getContasBancarias()]);
      setLancamentos(data);
      setContas(cs);
    } catch (e) {
      showToast('Erro: ' + (e as Error).message, false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSave() {
    if (!descricao || !valor || +valor <= 0) return showToast('Descrição e valor são obrigatórios.', false);
    setSaving(true);
    try {
      await createLancamento({
        tipo: 'DESPESA',
        categoria,
        descricao,
        valor: +valor,
        data_vencimento: dataVencimento,
        data_pagamento: pagarNow ? dataPagamento : null,
        status: pagarNow ? 'PAGO' : 'PENDENTE',
        nfe_id: null,
        pedido_id: null,
        conta_bancaria_id: contaId || null,
      });
      showToast('Despesa lançada.', true);
      setDescricao(''); setValor(''); setPagarNow(false); setShowForm(false);
      load();
    } catch (e) {
      showToast('Erro: ' + (e as Error).message, false);
    } finally {
      setSaving(false);
    }
  }

  async function handleBaixa() {
    if (!baixaId) return;
    setSalvandoBaixa(true);
    try {
      await pagarLancamento(baixaId, baixaData, baixaConta || undefined);
      showToast('Pagamento registrado.', true);
      setBaixaId(null);
      load();
    } catch (e) {
      showToast('Erro: ' + (e as Error).message, false);
    } finally {
      setSalvandoBaixa(false);
    }
  }

  // ── KPIs ──────────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const pendentes = lancamentos.filter(l => l.status === 'PENDENTE');
    const vencidos = pendentes.filter(l => diffDays(l.data_vencimento) > 0);
    const thisMonth = new Date().toISOString().slice(0, 7);
    const pagoMes = lancamentos
      .filter(l => l.status === 'PAGO' && l.data_pagamento?.startsWith(thisMonth))
      .reduce((s, l) => s + l.valor, 0);
    return {
      totalPendente: pendentes.reduce((s, l) => s + l.valor, 0),
      totalVencido: vencidos.reduce((s, l) => s + l.valor, 0),
      pagoMes,
      qtdVencido: vencidos.length,
    };
  }, [lancamentos]);

  const filtered = useMemo(() => {
    return lancamentos.filter(l => {
      if (search && !l.descricao.toLowerCase().includes(search.toLowerCase())) return false;
      const overdue = l.status === 'PENDENTE' && diffDays(l.data_vencimento) > 0;
      if (statusFilter === 'VENCIDO') return overdue;
      if (statusFilter !== 'TODOS' && l.status !== statusFilter) return false;
      return true;
    });
  }, [lancamentos, search, statusFilter]);

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
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ArrowUpCircle className="w-5 h-5 text-red-600" />
            <h1 className="text-xl font-bold text-slate-900">Contas a Pagar</h1>
          </div>
          <p className="text-sm text-slate-500">Gerencie despesas e pagamentos pendentes</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Nova Despesa
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Pendente',  value: BRL(kpis.totalPendente), icon: Clock,         color: 'text-amber-600 bg-amber-50 border-amber-200' },
          { label: 'Total Vencido',   value: BRL(kpis.totalVencido),  icon: AlertTriangle,  color: 'text-red-600 bg-red-50 border-red-200' },
          { label: 'Títulos Vencidos',value: String(kpis.qtdVencido), icon: AlertCircle,    color: 'text-orange-600 bg-orange-50 border-orange-200' },
          { label: 'Pago no Mês',     value: BRL(kpis.pagoMes),       icon: DollarSign,     color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`bg-white rounded-xl border p-4 ${color.split(' ').slice(2).join(' ')}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color.split(' ').slice(0, 2).join(' ')}`}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="text-xs text-slate-500 font-medium">{label}</span>
            </div>
            <div className={`text-lg font-bold ${color.split(' ')[0]}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Form slide-down */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <h3 className="text-sm font-bold text-slate-700 mb-4">Nova Despesa</h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="col-span-2 lg:col-span-1">
              <label className="block text-xs font-medium text-slate-600 mb-1">Descrição *</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: Aluguel, Fornecedor..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Valor (R$) *</label>
              <input
                type="number" min="0.01" step="0.01"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                value={valor} onChange={e => setValor(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Categoria</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                value={categoria} onChange={e => setCategoria(e.target.value)}>
                {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Vencimento</label>
              <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                value={dataVencimento} onChange={e => setDataVencimento(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Conta</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                value={contaId} onChange={e => setContaId(e.target.value)}>
                <option value="">Sem conta</option>
                {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="flex items-end gap-3">
              <div className="flex items-center gap-2 pb-2">
                <input type="checkbox" id="pagarNow" checked={pagarNow} onChange={e => setPagarNow(e.target.checked)} className="rounded" />
                <label htmlFor="pagarNow" className="text-sm text-slate-700 whitespace-nowrap">Já pago</label>
              </div>
              {pagarNow && (
                <input type="date" className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  value={dataPagamento} onChange={e => setDataPagamento(e.target.value)} />
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} Lançar Despesa
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="Buscar descrição..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex gap-1">
          {(['TODOS', 'PENDENTE', 'VENCIDO', 'PAGO'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-red-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {s === 'TODOS' ? 'Todos' : s === 'PENDENTE' ? 'Pendente' : s === 'VENCIDO' ? 'Vencido' : 'Pago'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">Despesas</span>
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
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Valor</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-slate-400">Nenhuma despesa encontrada.</td></tr>
                ) : filtered.map(l => {
                  const overdue = l.status === 'PENDENTE' && diffDays(l.data_vencimento) > 0;
                  return (
                    <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-800 max-w-xs truncate">{l.descricao}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{l.categoria}</td>
                      <td className={`px-4 py-3 text-sm ${overdue ? 'text-red-600 font-medium' : 'text-slate-600'}`}>
                        {new Date(l.data_vencimento + 'T00:00').toLocaleDateString('pt-BR')}
                        {overdue && <span className="ml-1 text-xs">({diffDays(l.data_vencimento)}d)</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-red-600">{BRL(l.valor)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          l.status === 'PAGO' ? 'bg-green-100 text-green-700' :
                          overdue ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {l.status === 'PAGO' ? 'Pago' : overdue ? 'Vencido' : 'Pendente'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {l.status === 'PENDENTE' && (
                          <button
                            onClick={() => { setBaixaId(l.id); setBaixaData(today()); setBaixaConta(''); }}
                            className="text-xs font-medium text-red-600 hover:text-red-800 whitespace-nowrap transition-colors"
                          >
                            Pagar
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
              <h3 className="text-base font-bold text-slate-900">Confirmar Pagamento</h3>
              <button onClick={() => setBaixaId(null)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="bg-slate-50 rounded-lg p-3 mb-4">
              <p className="text-sm font-medium text-slate-800 truncate">{baixaLancamento.descricao}</p>
              <p className="text-lg font-bold text-red-600 mt-1">{BRL(baixaLancamento.valor)}</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Data do Pagamento</label>
                <input type="date" value={baixaData} onChange={e => setBaixaData(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Conta de Origem</label>
                <select value={baixaConta} onChange={e => setBaixaConta(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500">
                  <option value="">Sem conta específica</option>
                  {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setBaixaId(null)}
                className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                Cancelar
              </button>
              <button onClick={handleBaixa} disabled={salvandoBaixa}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors">
                {salvandoBaixa && <Loader2 className="w-4 h-4 animate-spin" />} Confirmar Pagamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
