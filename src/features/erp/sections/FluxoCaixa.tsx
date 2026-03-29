import { useState, useEffect, useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Loader2, AlertCircle, CalendarDays } from 'lucide-react';
import { getLancamentos } from '../../../lib/erp';
import type { ErpLancamento } from '../../../lib/erp';

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
}

interface MonthData {
  key: string;
  label: string;
  receitas: number;
  despesas: number;
  saldo: number;
  saldoAcumulado: number;
}

export default function FluxoCaixa() {
  const [lancamentos, setLancamentos] = useState<ErpLancamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [periodoMeses, setPeriodoMeses] = useState(6);

  useEffect(() => {
    Promise.all([getLancamentos('RECEITA'), getLancamentos('DESPESA')])
      .then(([r, d]) => setLancamentos([...r, ...d]))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const { months, kpis } = useMemo(() => {
    const now = new Date();
    const result: MonthData[] = [];
    let saldoAcumulado = 0;

    // Build month range: past (periodoMeses/2) and future (periodoMeses/2)
    const half = Math.floor(periodoMeses / 2);
    for (let i = -half; i < periodoMeses - half; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const prefix = `${year}-${String(month).padStart(2, '0')}`;

      const recLancamentos = lancamentos.filter(l =>
        l.tipo === 'RECEITA' &&
        l.status === 'PAGO' &&
        l.data_pagamento?.startsWith(prefix)
      );
      const despLancamentos = lancamentos.filter(l =>
        l.tipo === 'DESPESA' &&
        l.status === 'PAGO' &&
        l.data_pagamento?.startsWith(prefix)
      );
      // also include pending by vencimento for forecast months
      const isPast = i < 0;
      const recPendente = !isPast ? lancamentos.filter(l =>
        l.tipo === 'RECEITA' && l.status === 'PENDENTE' && l.data_vencimento?.startsWith(prefix)
      ) : [];
      const despPendente = !isPast ? lancamentos.filter(l =>
        l.tipo === 'DESPESA' && l.status === 'PENDENTE' && l.data_vencimento?.startsWith(prefix)
      ) : [];

      const receitas = [...recLancamentos, ...recPendente].reduce((s, l) => s + l.valor, 0);
      const despesas = [...despLancamentos, ...despPendente].reduce((s, l) => s + l.valor, 0);
      const saldo = receitas - despesas;
      saldoAcumulado += saldo;

      result.push({ key: prefix, label: monthLabel(year, month), receitas, despesas, saldo, saldoAcumulado });
    }

    const totalReceitas = result.reduce((s, m) => s + m.receitas, 0);
    const totalDespesas = result.reduce((s, m) => s + m.despesas, 0);
    const saldoFinal = saldoAcumulado;
    const melhorMes = result.reduce((best, m) => m.saldo > best.saldo ? m : best, result[0] ?? { saldo: 0, label: '—' });

    return {
      months: result,
      kpis: { totalReceitas, totalDespesas, saldoFinal, melhorMes },
    };
  }, [lancamentos, periodoMeses]);

  const maxBar = useMemo(() => {
    return Math.max(...months.map(m => Math.max(m.receitas, m.despesas)), 1);
  }, [months]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-sm text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900">Fluxo de Caixa</h1>
          </div>
          <p className="text-sm text-slate-500">Receitas vs despesas mensais — realizado e previsto</p>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-slate-400" />
          <select
            value={periodoMeses}
            onChange={e => setPeriodoMeses(+e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={3}>3 meses</option>
            <option value={6}>6 meses</option>
            <option value={12}>12 meses</option>
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Receitas',  value: BRL(kpis.totalReceitas), icon: TrendingUp,   color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
          { label: 'Total Despesas',  value: BRL(kpis.totalDespesas), icon: TrendingDown,  color: 'text-red-600 bg-red-50 border-red-200' },
          { label: 'Saldo do Período',value: BRL(kpis.saldoFinal),    icon: DollarSign,    color: kpis.saldoFinal >= 0 ? 'text-blue-600 bg-blue-50 border-blue-200' : 'text-red-700 bg-red-100 border-red-300' },
          { label: 'Melhor Mês',      value: kpis.melhorMes?.label ?? '—', icon: CalendarDays, color: 'text-violet-600 bg-violet-50 border-violet-200' },
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

      {/* Bar chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Receitas × Despesas por Mês</h3>
        <div className="flex items-end gap-3 overflow-x-auto pb-2">
          {months.map(m => {
            const recH = Math.round((m.receitas / maxBar) * 160);
            const despH = Math.round((m.despesas / maxBar) * 160);
            const isCurrent = m.key === new Date().toISOString().slice(0, 7);
            return (
              <div key={m.key} className={`flex flex-col items-center gap-1 flex-shrink-0 ${isCurrent ? 'opacity-100' : 'opacity-80'}`} style={{ minWidth: 52 }}>
                <div className="flex items-end gap-1" style={{ height: 160 }}>
                  <div
                    className="w-5 rounded-t-sm bg-emerald-400 transition-all"
                    style={{ height: Math.max(recH, 2) }}
                    title={`Receitas: ${BRL(m.receitas)}`}
                  />
                  <div
                    className="w-5 rounded-t-sm bg-red-400 transition-all"
                    style={{ height: Math.max(despH, 2) }}
                    title={`Despesas: ${BRL(m.despesas)}`}
                  />
                </div>
                <span className={`text-[10px] font-medium ${isCurrent ? 'text-blue-700' : 'text-slate-400'}`}>{m.label}</span>
                <span className={`text-[10px] font-semibold ${m.saldo >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {m.saldo >= 0 ? '+' : ''}{BRL(m.saldo)}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-emerald-400 rounded-sm" /><span className="text-xs text-slate-500">Receitas</span></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-red-400 rounded-sm" /><span className="text-xs text-slate-500">Despesas</span></div>
        </div>
      </div>

      {/* Detailed table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <h3 className="text-sm font-semibold text-slate-700">Detalhamento Mensal</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Mês</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Receitas</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Despesas</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Saldo</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Acumulado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {months.map(m => {
                const isCurrent = m.key === new Date().toISOString().slice(0, 7);
                return (
                  <tr key={m.key} className={`hover:bg-slate-50 transition-colors ${isCurrent ? 'bg-blue-50/50' : ''}`}>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {m.label}
                      {isCurrent && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Atual</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-medium">{BRL(m.receitas)}</td>
                    <td className="px-4 py-3 text-right text-red-600 font-medium">{BRL(m.despesas)}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${m.saldo >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {m.saldo >= 0 ? '+' : ''}{BRL(m.saldo)}
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${m.saldoAcumulado >= 0 ? 'text-slate-700' : 'text-red-700'}`}>
                      {BRL(m.saldoAcumulado)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
