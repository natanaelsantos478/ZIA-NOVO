import { TrendingUp, TrendingDown, BarChart3, DollarSign, Truck, Package, Star, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface KPI { label: string; value: string; prev: string; trend: 'up' | 'down' | 'neutral'; trendVal: string; sub: string; }

const KPIS: KPI[] = [
  { label: 'Custo por Pedido',      value: 'R$ 28,40',  prev: 'R$ 31,20',  trend: 'up',   trendVal: '-9%',   sub: 'vs mês anterior'    },
  { label: 'OTIF',                  value: '94,3%',     prev: '92,1%',     trend: 'up',   trendVal: '+2,2pp', sub: 'on-time in-full'   },
  { label: 'Custo de Frete / kg',   value: 'R$ 1,84',  prev: 'R$ 2,10',   trend: 'up',   trendVal: '-12%',  sub: 'frete/kg médio'     },
  { label: 'NPS Logístico',         value: '72',        prev: '68',        trend: 'up',   trendVal: '+4 pts', sub: 'satisfação cliente' },
  { label: 'Pedidos Entregues/mês', value: '18.420',    prev: '16.890',    trend: 'up',   trendVal: '+9%',   sub: 'volume mensal'      },
  { label: 'Taxa de Avaria',        value: '0,8%',      prev: '1,2%',      trend: 'up',   trendVal: '-0,4pp', sub: 'avarias/pedidos'   },
];

const MONTHLY_COSTS = [
  { month: 'Set/25', frete: 142, armazenagem: 38, embalagem: 22, avarias: 8  },
  { month: 'Out/25', frete: 156, armazenagem: 40, embalagem: 24, avarias: 12 },
  { month: 'Nov/25', frete: 188, armazenagem: 42, embalagem: 26, avarias: 9  },
  { month: 'Dez/25', frete: 210, armazenagem: 48, embalagem: 30, avarias: 14 },
  { month: 'Jan/26', frete: 168, armazenagem: 39, embalagem: 23, avarias: 7  },
  { month: 'Fev/26', frete: 174, armazenagem: 41, embalagem: 24, avarias: 8  },
];

const maxCost = Math.max(...MONTHLY_COSTS.map((m) => m.frete + m.armazenagem + m.embalagem + m.avarias));

const CARRIER_PERF = [
  { carrier: 'Frota Própria',  otif: 98, cost: 5.20, avaria: 0.1, nps: 88 },
  { carrier: 'Total Express',  otif: 95, cost: 7.80, avaria: 0.5, nps: 76 },
  { carrier: 'Braspress',      otif: 94, cost: 5.40, avaria: 0.8, nps: 72 },
  { carrier: 'Jadlog',         otif: 91, cost: 4.20, avaria: 1.2, nps: 64 },
  { carrier: 'Correios',       otif: 88, cost: 3.10, avaria: 0.9, nps: 60 },
];

export default function AnalyticsExecutive() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard Executivo</h1>
          <p className="text-slate-500 text-sm mt-0.5">KPIs estratégicos de nível C — custo/kg, OTIF, NPS e custo por pedido</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full font-medium">Fevereiro 2026</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {KPIS.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
            <div className="text-xl font-bold text-slate-800">{kpi.value}</div>
            <div className="text-xs text-slate-500 mt-0.5 mb-2">{kpi.label}</div>
            <div className="flex items-center gap-1">
              {kpi.trend === 'up' ? <ArrowUpRight className="w-3 h-3 text-emerald-500" /> : <ArrowDownRight className="w-3 h-3 text-red-500" />}
              <span className="text-xs font-medium text-emerald-600">{kpi.trendVal}</span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Cost breakdown chart */}
      <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-emerald-600" />
          <h2 className="font-semibold text-slate-800">Composição de Custos Logísticos (R$ mil)</h2>
        </div>
        <div className="flex items-end gap-3 h-48">
          {MONTHLY_COSTS.map((m) => {
            const total = m.frete + m.armazenagem + m.embalagem + m.avarias;
            const h = (total / maxCost) * 100;
            return (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col gap-0.5" style={{ height: `${h * 1.6}px` }}>
                  <div className="bg-red-300 rounded-t" style={{ height: `${(m.avarias / total) * 100}%` }} />
                  <div className="bg-amber-300" style={{ height: `${(m.embalagem / total) * 100}%` }} />
                  <div className="bg-emerald-300" style={{ height: `${(m.armazenagem / total) * 100}%` }} />
                  <div className="bg-emerald-600 rounded-b" style={{ height: `${(m.frete / total) * 100}%` }} />
                </div>
                <span className="text-xs text-slate-500">{m.month}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
          <span className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-600 rounded" /> Frete</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-300 rounded" /> Armazenagem</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 bg-amber-300 rounded" /> Embalagem</span>
          <span className="flex items-center gap-1"><div className="w-3 h-3 bg-red-300 rounded" /> Avarias</span>
        </div>
      </div>

      {/* Carrier performance table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Performance por Transportadora</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3 text-left">Transportadora</th>
              <th className="px-5 py-3 text-center">OTIF</th>
              <th className="px-5 py-3 text-center">Custo/kg</th>
              <th className="px-5 py-3 text-center">Taxa Avaria</th>
              <th className="px-5 py-3 text-center">NPS</th>
              <th className="px-5 py-3 text-center">Score Geral</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {CARRIER_PERF.map((c) => {
              const score = Math.round((c.otif + (c.nps) + (100 - c.avaria * 20) + (100 - c.cost * 5)) / 4);
              return (
                <tr key={c.carrier} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-slate-800">{c.carrier}</td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`font-bold ${c.otif >= 95 ? 'text-emerald-600' : c.otif >= 90 ? 'text-amber-600' : 'text-red-600'}`}>{c.otif}%</span>
                  </td>
                  <td className="px-5 py-3.5 text-center text-slate-600">R$ {c.cost.toFixed(2)}</td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`font-medium ${c.avaria > 1 ? 'text-red-600' : c.avaria > 0.5 ? 'text-amber-600' : 'text-emerald-600'}`}>{c.avaria}%</span>
                  </td>
                  <td className="px-5 py-3.5 text-center text-slate-600">{c.nps}</td>
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < Math.round(score / 20) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
