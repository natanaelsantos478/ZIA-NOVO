import { useState, useEffect, useMemo } from 'react';
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, Loader2,
  Calendar, AlertCircle, Clock,
} from 'lucide-react';
import { getLancamentos } from '../../../lib/erp';
import type { ErpLancamento } from '../../../lib/erp';

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const today = () => new Date().toISOString().split('T')[0];

type Tab = 'dre' | 'fluxo' | 'inadimplencia' | 'aging';

const TABS: { id: Tab; label: string }[] = [
  { id: 'dre', label: 'DRE' },
  { id: 'fluxo', label: 'Fluxo de Caixa' },
  { id: 'inadimplencia', label: 'Inadimplência' },
  { id: 'aging', label: 'Aging CR/CP' },
];

// Agrupa lançamentos por semana/dia para fluxo de caixa
function agruparPorDia(lancamentos: ErpLancamento[], tipo: 'RECEITA' | 'DESPESA', mes: string) {
  const map: Record<string, number> = {};
  lancamentos.filter(l => l.tipo === tipo && l.data_vencimento.startsWith(mes)).forEach(l => {
    map[l.data_vencimento] = (map[l.data_vencimento] ?? 0) + l.valor;
  });
  return map;
}

function diasAtraso(venc: string) {
  return Math.floor((new Date().getTime() - new Date(venc + 'T00:00').getTime()) / 86400000);
}

// Bucket de aging
function agingBucket(venc: string): string {
  const hoje = today();
  if (venc >= hoje) return 'A vencer';
  const dias = diasAtraso(venc);
  if (dias <= 30) return '1–30 dias';
  if (dias <= 60) return '31–60 dias';
  if (dias <= 90) return '61–90 dias';
  return '+90 dias';
}

const AGING_ORDER = ['A vencer', '1–30 dias', '31–60 dias', '61–90 dias', '+90 dias'];
const AGING_COLOR: Record<string, string> = {
  'A vencer': 'bg-blue-500',
  '1–30 dias': 'bg-amber-400',
  '31–60 dias': 'bg-orange-500',
  '61–90 dias': 'bg-red-500',
  '+90 dias': 'bg-red-800',
};

export default function Relatorios() {
  const [receitas, setReceitas] = useState<ErpLancamento[]>([]);
  const [despesas, setDespesas] = useState<ErpLancamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('dre');
  const [mesFiltro, setMesFiltro] = useState(() => new Date().toISOString().slice(0, 7));

  useEffect(() => {
    Promise.all([getLancamentos('RECEITA'), getLancamentos('DESPESA')])
      .then(([r, d]) => { setReceitas(r); setDespesas(d); })
      .finally(() => setLoading(false));
  }, []);

  const filtrarMes = (lista: ErpLancamento[]) => lista.filter(l => l.data_vencimento.startsWith(mesFiltro));
  const receitasMes = filtrarMes(receitas);
  const despesasMes = filtrarMes(despesas);

  const totalReceitas = receitasMes.reduce((s, l) => s + l.valor, 0);
  const totalDespesas = despesasMes.reduce((s, l) => s + l.valor, 0);
  const lucro = totalReceitas - totalDespesas;
  const receitasPagas = receitasMes.filter(l => l.status === 'PAGO').reduce((s, l) => s + l.valor, 0);
  const despesasPagas = despesasMes.filter(l => l.status === 'PAGO').reduce((s, l) => s + l.valor, 0);

  const receitasPorCategoria = receitasMes.reduce<Record<string, number>>((acc, l) => {
    acc[l.categoria] = (acc[l.categoria] ?? 0) + l.valor; return acc;
  }, {});
  const despesasPorCategoria = despesasMes.reduce<Record<string, number>>((acc, l) => {
    acc[l.categoria] = (acc[l.categoria] ?? 0) + l.valor; return acc;
  }, {});

  // Fluxo de Caixa — dias com movimento no mês
  const receitasDia = useMemo(() => agruparPorDia(receitas, 'RECEITA', mesFiltro), [receitas, mesFiltro]);
  const despesasDia = useMemo(() => agruparPorDia(despesas, 'DESPESA', mesFiltro), [despesas, mesFiltro]);
  const diasComMovimento = useMemo(() => {
    const dias = new Set([...Object.keys(receitasDia), ...Object.keys(despesasDia)]);
    return Array.from(dias).sort();
  }, [receitasDia, despesasDia]);

  // Inadimplência — PENDENTE e vencido
  const inadimplentes = useMemo(() =>
    receitas.filter(l => l.status === 'PENDENTE' && l.data_vencimento < today())
      .sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento)),
  [receitas]);
  const totalInadimplente = inadimplentes.reduce((s, l) => s + l.valor, 0);

  // Aging CR (contas a receber)
  const agingCR = useMemo(() => {
    const pendentes = receitas.filter(l => l.status === 'PENDENTE');
    const buckets: Record<string, number> = {};
    pendentes.forEach(l => { const b = agingBucket(l.data_vencimento); buckets[b] = (buckets[b] ?? 0) + l.valor; });
    return buckets;
  }, [receitas]);

  // Aging CP (contas a pagar)
  const agingCP = useMemo(() => {
    const pendentes = despesas.filter(l => l.status === 'PENDENTE');
    const buckets: Record<string, number> = {};
    pendentes.forEach(l => { const b = agingBucket(l.data_vencimento); buckets[b] = (buckets[b] ?? 0) + l.valor; });
    return buckets;
  }, [despesas]);

  const totalAgingCR = Object.values(agingCR).reduce((s, v) => s + v, 0);
  const totalAgingCP = Object.values(agingCP).reduce((s, v) => s + v, 0);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Central de Relatórios</h1>
          <p className="text-sm text-slate-500">DRE, Fluxo de Caixa, Inadimplência e Aging financeiro</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input type="month" className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={mesFiltro} onChange={e => setMesFiltro(e.target.value)} />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-green-200 p-4">
          <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-green-500" /><span className="text-xs text-slate-500">Receitas Totais</span></div>
          <div className="text-xl font-bold text-green-600">{fmtBRL(totalReceitas)}</div>
          <div className="text-xs text-slate-400 mt-1">Recebido: {fmtBRL(receitasPagas)}</div>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4">
          <div className="flex items-center gap-2 mb-2"><TrendingDown className="w-4 h-4 text-red-500" /><span className="text-xs text-slate-500">Despesas Totais</span></div>
          <div className="text-xl font-bold text-red-600">{fmtBRL(totalDespesas)}</div>
          <div className="text-xs text-slate-400 mt-1">Pago: {fmtBRL(despesasPagas)}</div>
        </div>
        <div className={`bg-white rounded-xl border p-4 ${lucro >= 0 ? 'border-blue-200' : 'border-orange-200'}`}>
          <div className="flex items-center gap-2 mb-2"><DollarSign className={`w-4 h-4 ${lucro >= 0 ? 'text-blue-500' : 'text-orange-500'}`} /><span className="text-xs text-slate-500">Resultado</span></div>
          <div className={`text-xl font-bold ${lucro >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>{fmtBRL(lucro)}</div>
          <div className="text-xs text-slate-400 mt-1">{lucro >= 0 ? 'Lucro' : 'Prejuízo'}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2"><BarChart3 className="w-4 h-4 text-slate-500" /><span className="text-xs text-slate-500">Margem</span></div>
          <div className="text-xl font-bold text-slate-700">
            {totalReceitas > 0 ? ((lucro / totalReceitas) * 100).toFixed(1) + '%' : '—'}
          </div>
          <div className="text-xs text-slate-400 mt-1">Margem líquida</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 mb-6">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" /></div>
      ) : (
        <>
          {/* DRE */}
          {tab === 'dre' && (
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-bold text-slate-700 mb-4">DRE — {mesFiltro}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between font-semibold text-green-700 pb-2 border-b border-slate-100">
                    <span>+ Receita Bruta</span><span>{fmtBRL(totalReceitas)}</span>
                  </div>
                  {Object.entries(despesasPorCategoria).map(([cat, val]) => (
                    <div key={cat} className="flex justify-between text-slate-600">
                      <span>— {cat}</span><span>{fmtBRL(val)}</span>
                    </div>
                  ))}
                  {Object.keys(despesasPorCategoria).length === 0 && (
                    <div className="text-slate-400 text-xs">Nenhuma despesa no período</div>
                  )}
                  <div className="flex justify-between font-bold text-slate-800 pt-2 border-t border-slate-200">
                    <span>= Resultado do Período</span>
                    <span className={lucro >= 0 ? 'text-green-600' : 'text-red-600'}>{fmtBRL(lucro)}</span>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-bold text-slate-700 mb-4">Receitas por Categoria</h3>
                {Object.keys(receitasPorCategoria).length === 0 ? (
                  <p className="text-slate-400 text-sm">Nenhuma receita no período.</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(receitasPorCategoria).sort((a, b) => b[1] - a[1]).map(([cat, val]) => {
                      const pct = totalReceitas > 0 ? (val / totalReceitas) * 100 : 0;
                      return (
                        <div key={cat}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-600">{cat}</span>
                            <span className="font-medium">{fmtBRL(val)}</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Fluxo de Caixa */}
          {tab === 'fluxo' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-700">Fluxo de Caixa — {mesFiltro}</h3>
                <p className="text-xs text-slate-400 mt-0.5">Movimentos diários de receita e despesa por vencimento</p>
              </div>
              {diasComMovimento.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">Nenhum movimento no período.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Data</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Entradas</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Saídas</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase">Saldo Dia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {diasComMovimento.map(dia => {
                      const rec = receitasDia[dia] ?? 0;
                      const des = despesasDia[dia] ?? 0;
                      const saldo = rec - des;
                      return (
                        <tr key={dia} className="hover:bg-slate-50">
                          <td className="px-5 py-3 text-slate-700">{new Date(dia + 'T00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}</td>
                          <td className="px-5 py-3 text-right text-green-600 font-medium">{rec > 0 ? fmtBRL(rec) : '—'}</td>
                          <td className="px-5 py-3 text-right text-red-600 font-medium">{des > 0 ? fmtBRL(des) : '—'}</td>
                          <td className={`px-5 py-3 text-right font-bold ${saldo >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            {saldo >= 0 ? '+' : ''}{fmtBRL(saldo)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200">
                    <tr>
                      <td className="px-5 py-3 text-xs font-bold text-slate-600 uppercase">Total</td>
                      <td className="px-5 py-3 text-right font-bold text-green-700">{fmtBRL(totalReceitas)}</td>
                      <td className="px-5 py-3 text-right font-bold text-red-700">{fmtBRL(totalDespesas)}</td>
                      <td className={`px-5 py-3 text-right font-bold ${lucro >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {lucro >= 0 ? '+' : ''}{fmtBRL(lucro)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          )}

          {/* Inadimplência */}
          {tab === 'inadimplencia' && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2"><AlertCircle className="w-4 h-4 text-red-500" /><span className="text-xs text-red-700 font-medium">Total Inadimplente</span></div>
                  <div className="text-2xl font-bold text-red-700">{fmtBRL(totalInadimplente)}</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2"><Clock className="w-4 h-4 text-slate-500" /><span className="text-xs text-slate-500">Títulos vencidos</span></div>
                  <div className="text-2xl font-bold text-slate-700">{inadimplentes.length}</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2"><BarChart3 className="w-4 h-4 text-slate-500" /><span className="text-xs text-slate-500">Multa estimada (2% + 0,1%/dia)</span></div>
                  <div className="text-2xl font-bold text-orange-600">
                    {fmtBRL(inadimplentes.reduce((s, l) => {
                      const dias = diasAtraso(l.data_vencimento);
                      return s + l.valor * 0.02 + l.valor * 0.001 * dias;
                    }, 0))}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
                  <h3 className="text-sm font-semibold text-slate-700">Títulos Vencidos — Todos os períodos</h3>
                </div>
                {inadimplentes.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-sm">Nenhum título vencido.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="border-b border-slate-200">
                      <tr>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Descrição</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Vencimento</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Dias Atraso</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Valor Original</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Valor Atualizado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {inadimplentes.map(l => {
                        const dias = diasAtraso(l.data_vencimento);
                        const multa = l.valor * 0.02 + l.valor * 0.001 * dias;
                        return (
                          <tr key={l.id} className="hover:bg-red-50/20">
                            <td className="px-4 py-3 font-medium text-slate-800">{l.descricao}</td>
                            <td className="px-4 py-3 text-slate-600">{new Date(l.data_vencimento + 'T00:00').toLocaleDateString('pt-BR')}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${dias > 90 ? 'bg-red-900 text-white' : dias > 60 ? 'bg-red-600 text-white' : dias > 30 ? 'bg-orange-500 text-white' : 'bg-amber-400 text-white'}`}>
                                {dias}d
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-slate-700 font-medium">{fmtBRL(l.valor)}</td>
                            <td className="px-4 py-3 text-right font-bold text-red-700">{fmtBRL(l.valor + multa)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* Aging */}
          {tab === 'aging' && (
            <div className="grid grid-cols-2 gap-6">
              {/* Aging CR */}
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-bold text-slate-700 mb-1">Aging — Contas a Receber</h3>
                <p className="text-xs text-slate-400 mb-4">Total: {fmtBRL(totalAgingCR)}</p>
                {totalAgingCR === 0 ? <p className="text-slate-400 text-sm">Nenhum título pendente.</p> : (
                  <div className="space-y-4">
                    {AGING_ORDER.map(bucket => {
                      const val = agingCR[bucket] ?? 0;
                      if (val === 0) return null;
                      const pct = totalAgingCR > 0 ? (val / totalAgingCR) * 100 : 0;
                      return (
                        <div key={bucket}>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="font-medium text-slate-700">{bucket}</span>
                            <span className="text-slate-500">{fmtBRL(val)} <span className="text-slate-400">({pct.toFixed(0)}%)</span></span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${AGING_COLOR[bucket]}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Aging CP */}
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-bold text-slate-700 mb-1">Aging — Contas a Pagar</h3>
                <p className="text-xs text-slate-400 mb-4">Total: {fmtBRL(totalAgingCP)}</p>
                {totalAgingCP === 0 ? <p className="text-slate-400 text-sm">Nenhuma despesa pendente.</p> : (
                  <div className="space-y-4">
                    {AGING_ORDER.map(bucket => {
                      const val = agingCP[bucket] ?? 0;
                      if (val === 0) return null;
                      const pct = totalAgingCP > 0 ? (val / totalAgingCP) * 100 : 0;
                      return (
                        <div key={bucket}>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span className="font-medium text-slate-700">{bucket}</span>
                            <span className="text-slate-500">{fmtBRL(val)} <span className="text-slate-400">({pct.toFixed(0)}%)</span></span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${AGING_COLOR[bucket]}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Legenda */}
              <div className="col-span-2 bg-slate-50 rounded-xl border border-slate-200 p-4 flex items-center gap-6 text-xs text-slate-500">
                <span className="font-medium text-slate-600">Legenda de cores:</span>
                {AGING_ORDER.map(b => (
                  <div key={b} className="flex items-center gap-1.5">
                    <span className={`w-3 h-3 rounded-full ${AGING_COLOR[b]}`} />
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
