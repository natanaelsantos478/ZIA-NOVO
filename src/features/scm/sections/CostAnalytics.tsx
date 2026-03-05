import { PieChart, DollarSign, TrendingDown, BarChart3, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const COST_BREAKDOWN = [
  { category: 'Frete',       value: 174_000, pct: 58, color: 'bg-emerald-500', prev: 168_000 },
  { category: 'Armazenagem', value: 41_000,  pct: 14, color: 'bg-blue-400',    prev: 39_000  },
  { category: 'Embalagem',   value: 24_000,  pct: 8,  color: 'bg-amber-400',   prev: 23_000  },
  { category: 'Avarias',     value: 8_000,   pct: 3,  color: 'bg-red-400',     prev: 9_000   },
  { category: 'MOD Armazém', value: 38_000,  pct: 13, color: 'bg-purple-400',  prev: 38_000  },
  { category: 'Outros',      value: 12_000,  pct: 4,  color: 'bg-slate-300',   prev: 12_000  },
];

const COST_BY_SKU = [
  { sku: 'Eletrônicos',   costPerOrder: 48.40, orders: 2_100, trend: 'up'   },
  { sku: 'Moda',          costPerOrder: 18.20, orders: 5_400, trend: 'down' },
  { sku: 'Alimentos',     costPerOrder: 12.80, orders: 3_200, trend: 'down' },
  { sku: 'Farmácia',      costPerOrder: 32.10, orders: 1_800, trend: 'up'   },
  { sku: 'Móveis',        costPerOrder: 124.50, orders: 380,  trend: 'up'   },
  { sku: 'Ferramentas',   costPerOrder: 29.80, orders: 1_200, trend: 'neutral' },
];

const COST_BY_REGION = [
  { region: 'Grande SP',    value: 1.24, volume: 8_400 },
  { region: 'Interior SP',  value: 2.10, volume: 3_200 },
  { region: 'Sul',          value: 3.80, volume: 1_800 },
  { region: 'Nordeste',     value: 5.20, volume: 1_400 },
  { region: 'Norte',        value: 8.40, volume: 420   },
  { region: 'Centro-Oeste', value: 4.10, volume: 1_200 },
];

const totalCost = COST_BREAKDOWN.reduce((s, c) => s + c.value, 0);
const totalPrev = COST_BREAKDOWN.reduce((s, c) => s + c.prev, 0);

export default function CostAnalytics() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Análise de Custos</h1>
          <p className="text-slate-500 text-sm mt-0.5">Frete, armazenagem, embalagem e avarias — por SKU, cliente e região</p>
        </div>
        <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-medium">Fevereiro 2026</span>
      </div>

      {/* Total cost summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-semibold text-slate-700">Custo Total Logístico</span>
          </div>
          <div className="text-3xl font-bold text-slate-800">R$ {(totalCost / 1000).toFixed(0)}K</div>
          <div className="flex items-center gap-1 mt-2">
            <ArrowDownRight className="w-3 h-3 text-emerald-500" />
            <span className="text-xs text-emerald-600 font-medium">-{(((totalPrev - totalCost) / totalPrev) * 100).toFixed(1)}%</span>
            <span className="text-xs text-slate-400">vs jan/26</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-semibold text-slate-700">Custo por Pedido</span>
          </div>
          <div className="text-3xl font-bold text-slate-800">R$ 28,40</div>
          <div className="flex items-center gap-1 mt-2">
            <ArrowDownRight className="w-3 h-3 text-emerald-500" />
            <span className="text-xs text-emerald-600 font-medium">-9%</span>
            <span className="text-xs text-slate-400">vs jan/26 (R$ 31,20)</span>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-semibold text-slate-700">Custo / kg médio</span>
          </div>
          <div className="text-3xl font-bold text-slate-800">R$ 1,84</div>
          <div className="flex items-center gap-1 mt-2">
            <ArrowDownRight className="w-3 h-3 text-emerald-500" />
            <span className="text-xs text-emerald-600 font-medium">-12%</span>
            <span className="text-xs text-slate-400">vs jan/26</span>
          </div>
        </div>
      </div>

      {/* Cost breakdown */}
      <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
        <h2 className="font-semibold text-slate-800 mb-4">Composição de Custos</h2>
        <div className="space-y-3">
          {COST_BREAKDOWN.map((c) => (
            <div key={c.category} className="flex items-center gap-4">
              <span className="text-sm text-slate-700 w-28 flex-shrink-0">{c.category}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-3">
                <div className={`h-3 rounded-full ${c.color}`} style={{ width: `${c.pct}%` }} />
              </div>
              <span className="text-sm font-bold text-slate-700 w-12 text-right">{c.pct}%</span>
              <span className="text-xs text-slate-500 w-28 text-right">R$ {(c.value / 1000).toFixed(0)}K</span>
              <div className="flex items-center gap-0.5 w-12">
                {c.value > c.prev ? (
                  <><ArrowUpRight className="w-3 h-3 text-red-500" /><span className="text-xs text-red-500">+{(((c.value - c.prev) / c.prev) * 100).toFixed(0)}%</span></>
                ) : (
                  <><ArrowDownRight className="w-3 h-3 text-emerald-500" /><span className="text-xs text-emerald-500">-{(((c.prev - c.value) / c.prev) * 100).toFixed(0)}%</span></>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cost by SKU category */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-4">Custo por Categoria de Produto</h2>
          <div className="space-y-3">
            {COST_BY_SKU.sort((a, b) => b.costPerOrder - a.costPerOrder).map((s) => (
              <div key={s.sku} className="flex items-center justify-between">
                <span className="text-sm text-slate-700">{s.sku}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">{s.orders.toLocaleString('pt-BR')} pedidos</span>
                  <span className="text-sm font-bold text-slate-800 w-24 text-right">R$ {s.costPerOrder.toFixed(2)}</span>
                  {s.trend === 'up' ? <ArrowUpRight className="w-3 h-3 text-red-500" /> : s.trend === 'down' ? <ArrowDownRight className="w-3 h-3 text-emerald-500" /> : <span className="w-3 h-3" />}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-4">Custo de Frete por Região (R$/kg)</h2>
          <div className="space-y-3">
            {COST_BY_REGION.sort((a, b) => a.value - b.value).map((r) => (
              <div key={r.region} className="flex items-center gap-3">
                <span className="text-sm text-slate-700 w-28 flex-shrink-0">{r.region}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${(r.value / 8.4) * 100}%` }} />
                </div>
                <span className="text-sm font-bold text-slate-700 w-16 text-right">R$ {r.value.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
