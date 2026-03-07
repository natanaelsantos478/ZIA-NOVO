import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Loader2, Calendar } from 'lucide-react';
import { getLancamentos } from '../../../lib/erp';
import type { ErpLancamento } from '../../../lib/erp';

export default function Relatorios() {
  const [receitas, setReceitas] = useState<ErpLancamento[]>([]);
  const [despesas, setDespesas] = useState<ErpLancamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [mesFiltro, setMesFiltro] = useState(() => new Date().toISOString().slice(0, 7));

  useEffect(() => {
    Promise.all([getLancamentos('RECEITA'), getLancamentos('DESPESA')])
      .then(([r, d]) => { setReceitas(r); setDespesas(d); })
      .finally(() => setLoading(false));
  }, []);

  const filtrarMes = (lista: ErpLancamento[]) =>
    lista.filter(l => l.data_vencimento.startsWith(mesFiltro));

  const receitasMes = filtrarMes(receitas);
  const despesasMes = filtrarMes(despesas);

  const totalReceitas = receitasMes.reduce((s, l) => s + l.valor, 0);
  const totalDespesas = despesasMes.reduce((s, l) => s + l.valor, 0);
  const lucro = totalReceitas - totalDespesas;

  const receitasPagas = receitasMes.filter(l => l.status === 'PAGO').reduce((s, l) => s + l.valor, 0);
  const despesasPagas = despesasMes.filter(l => l.status === 'PAGO').reduce((s, l) => s + l.valor, 0);

  // Agrupar por categoria
  const receitasPorCategoria = receitasMes.reduce<Record<string, number>>((acc, l) => {
    acc[l.categoria] = (acc[l.categoria] ?? 0) + l.valor;
    return acc;
  }, {});

  const despesasPorCategoria = despesasMes.reduce<Record<string, number>>((acc, l) => {
    acc[l.categoria] = (acc[l.categoria] ?? 0) + l.valor;
    return acc;
  }, {});

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Central de Relatórios</h1>
          <p className="text-sm text-slate-500">DRE gerencial e análise financeira</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input type="month" className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={mesFiltro} onChange={e => setMesFiltro(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" /></div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-green-200 p-4">
              <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-green-500" /><span className="text-xs text-slate-500">Receitas Totais</span></div>
              <div className="text-xl font-bold text-green-600">{totalReceitas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
              <div className="text-xs text-slate-400 mt-1">Recebido: {receitasPagas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            </div>
            <div className="bg-white rounded-xl border border-red-200 p-4">
              <div className="flex items-center gap-2 mb-2"><TrendingDown className="w-4 h-4 text-red-500" /><span className="text-xs text-slate-500">Despesas Totais</span></div>
              <div className="text-xl font-bold text-red-600">{totalDespesas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
              <div className="text-xs text-slate-400 mt-1">Pago: {despesasPagas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
            </div>
            <div className={`bg-white rounded-xl border p-4 ${lucro >= 0 ? 'border-blue-200' : 'border-orange-200'}`}>
              <div className="flex items-center gap-2 mb-2"><DollarSign className={`w-4 h-4 ${lucro >= 0 ? 'text-blue-500' : 'text-orange-500'}`} /><span className="text-xs text-slate-500">Resultado</span></div>
              <div className={`text-xl font-bold ${lucro >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                {lucro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
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

          <div className="grid grid-cols-2 gap-6">
            {/* DRE simplificado */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-bold text-slate-700 mb-4">DRE — {mesFiltro}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between font-semibold text-green-700 pb-2 border-b border-slate-100">
                  <span>+ Receita Bruta</span>
                  <span>{totalReceitas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
                {Object.entries(despesasPorCategoria).map(([cat, val]) => (
                  <div key={cat} className="flex justify-between text-slate-600">
                    <span>— {cat}</span>
                    <span>{val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold text-slate-800 pt-2 border-t border-slate-200">
                  <span>= Resultado do Período</span>
                  <span className={lucro >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {lucro.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Receitas por categoria */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-bold text-slate-700 mb-4">Receitas por Categoria</h3>
              {Object.keys(receitasPorCategoria).length === 0 ? (
                <p className="text-slate-400 text-sm">Nenhuma receita no período.</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(receitasPorCategoria)
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, val]) => {
                      const pct = totalReceitas > 0 ? (val / totalReceitas) * 100 : 0;
                      return (
                        <div key={cat}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-600">{cat}</span>
                            <span className="font-medium">{val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
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
        </>
      )}
    </div>
  );
}
