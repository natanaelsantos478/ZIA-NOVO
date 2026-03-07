import { useState } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign, AlertTriangle,
  Wallet, CreditCard, ArrowUpRight, ArrowDownRight,
  BarChart3, Calendar, ChevronDown,
} from 'lucide-react';

type Period = '7d' | '30d' | '90d' | '12m';

interface KpiCard {
  label: string;
  value: string;
  sub: string;
  trend: number;
  icon: React.ElementType;
  color: string;
  bg: string;
}

const KPI_CARDS: KpiCard[] = [
  { label: 'Receita do Mês',      value: 'R$ 892.400',  sub: 'Competência março/26', trend: 12.4,  icon: TrendingUp,    color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { label: 'Despesas do Mês',     value: 'R$ 621.800',  sub: 'Competência março/26', trend: -3.1,  icon: TrendingDown,  color: 'text-red-500',     bg: 'bg-red-50'     },
  { label: 'Resultado Líquido',   value: 'R$ 270.600',  sub: 'Margem: 30.3%',        trend: 8.7,   icon: DollarSign,    color: 'text-slate-700',   bg: 'bg-slate-100'  },
  { label: 'A Receber (Pendente)',value: 'R$ 1.243.500', sub: '47 títulos em aberto', trend: 0,     icon: Wallet,        color: 'text-blue-600',    bg: 'bg-blue-50'    },
  { label: 'A Pagar (Pendente)',  value: 'R$ 389.200',  sub: '23 títulos em aberto', trend: 0,     icon: CreditCard,    color: 'text-amber-600',   bg: 'bg-amber-50'   },
  { label: 'Inadimplência',       value: 'R$ 87.300',   sub: '2.8% da receita',      trend: -1.2,  icon: AlertTriangle, color: 'text-red-500',     bg: 'bg-red-50'     },
];

const CASH_FLOW_DATA = [
  { mes: 'Out/25', receita: 720000, despesa: 550000 },
  { mes: 'Nov/25', receita: 810000, despesa: 590000 },
  { mes: 'Dez/25', receita: 960000, despesa: 680000 },
  { mes: 'Jan/26', receita: 750000, despesa: 610000 },
  { mes: 'Fev/26', receita: 830000, despesa: 595000 },
  { mes: 'Mar/26', receita: 892000, despesa: 622000 },
];

const RECENT_TRANSACTIONS = [
  { id: 'LC-0081', desc: 'Fatura Cliente Metalúrgica ABC',   tipo: 'RECEITA',  valor: 48200,  data: '05/03/26', status: 'PAGO',     forma: 'PIX' },
  { id: 'LC-0080', desc: 'Aluguel sede — março/2026',        tipo: 'DESPESA',  valor: 12500,  data: '05/03/26', status: 'PAGO',     forma: 'TED' },
  { id: 'LC-0079', desc: 'Parcela 2/3 — Pedido #0072',       tipo: 'RECEITA',  valor: 31400,  data: '04/03/26', status: 'PENDENTE', forma: 'BOLETO' },
  { id: 'LC-0078', desc: 'DARF — PIS/COFINS fev/26',         tipo: 'DESPESA',  valor: 9870,   data: '03/03/26', status: 'PAGO',     forma: 'DOC' },
  { id: 'LC-0077', desc: 'Fatura Transportes Rápidos Ltda',  tipo: 'RECEITA',  valor: 22700,  data: '02/03/26', status: 'PAGO',     forma: 'PIX' },
  { id: 'LC-0076', desc: 'Fornecedor Plásticos Norte',        tipo: 'DESPESA',  valor: 18300,  data: '01/03/26', status: 'PENDENTE', forma: 'BOLETO' },
  { id: 'LC-0075', desc: 'Parcela 1/2 — Proposta #0041',     tipo: 'RECEITA',  valor: 55000,  data: '28/02/26', status: 'PAGO',     forma: 'TED' },
];

const DRE_ROWS = [
  { label: 'Receita Bruta',           value: 1089200, indent: 0, bold: false },
  { label: '(-) Deduções e Impostos', value: -196800,  indent: 1, bold: false },
  { label: 'Receita Líquida',         value: 892400,  indent: 0, bold: true  },
  { label: '(-) CMV / CPV',           value: -312600,  indent: 1, bold: false },
  { label: 'Lucro Bruto',             value: 579800,  indent: 0, bold: true  },
  { label: '(-) Despesas Operacionais',value: -309200, indent: 1, bold: false },
  { label: 'EBITDA',                  value: 270600,  indent: 0, bold: true  },
  { label: '(-) Depreciação',         value: -8400,   indent: 1, bold: false },
  { label: 'EBIT',                    value: 262200,  indent: 0, bold: false  },
  { label: '(-) Resultado Financeiro',value: -14700,  indent: 1, bold: false },
  { label: 'Lucro Antes IR',          value: 247500,  indent: 0, bold: true  },
  { label: '(-) IRPJ + CSLL',         value: -54450,  indent: 1, bold: false },
  { label: 'Lucro Líquido',           value: 193050,  indent: 0, bold: true  },
];

function fmt(n: number): string {
  return Math.abs(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function CashFlowChart({ data }: { data: typeof CASH_FLOW_DATA }) {
  const maxVal = Math.max(...data.flatMap(d => [d.receita, d.despesa]));
  const chartH = 160;
  const barW = 28;
  const gap = 8;
  const groupW = barW * 2 + gap + 24;
  const totalW = data.length * groupW;

  return (
    <div className="overflow-x-auto">
      <svg width={totalW} height={chartH + 40} className="block mx-auto">
        {data.map((d, i) => {
          const x = i * groupW + 12;
          const rH = Math.round((d.receita / maxVal) * chartH);
          const eH = Math.round((d.despesa / maxVal) * chartH);
          return (
            <g key={d.mes}>
              {/* receita bar */}
              <rect x={x} y={chartH - rH} width={barW} height={rH}
                fill="#10b981" rx={4} opacity={0.85} />
              {/* despesa bar */}
              <rect x={x + barW + gap} y={chartH - eH} width={barW} height={eH}
                fill="#f87171" rx={4} opacity={0.85} />
              {/* label */}
              <text x={x + barW + gap / 2} y={chartH + 18}
                textAnchor="middle" fontSize={11} fill="#64748b">{d.mes}</text>
            </g>
          );
        })}
      </svg>
      <div className="flex items-center justify-center gap-6 mt-2">
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> Receita
        </span>
        <span className="flex items-center gap-1.5 text-xs text-slate-500">
          <span className="w-3 h-3 rounded-sm bg-red-400 inline-block" /> Despesa
        </span>
      </div>
    </div>
  );
}

const PERIOD_LABELS: Record<Period, string> = {
  '7d': 'Últimos 7 dias', '30d': 'Últimos 30 dias',
  '90d': 'Últimos 90 dias', '12m': 'Últimos 12 meses',
};

export default function FinanceDashboard() {
  const [period, setPeriod] = useState<Period>('30d');
  const [showPeriod, setShowPeriod] = useState(false);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard Financeiro</h1>
          <p className="text-slate-500 text-sm mt-0.5">Visão consolidada — março de 2026</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowPeriod(v => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:border-slate-300 shadow-sm"
          >
            <Calendar className="w-4 h-4" />
            {PERIOD_LABELS[period]}
            <ChevronDown className="w-4 h-4" />
          </button>
          {showPeriod && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
              {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
                <button key={p} onClick={() => { setPeriod(p); setShowPeriod(false); }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 ${period === p ? 'text-slate-800 font-medium' : 'text-slate-600'}`}>
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
        {KPI_CARDS.map(kpi => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div className={`w-10 h-10 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${kpi.color}`} />
                </div>
                {kpi.trend !== 0 && (
                  <span className={`flex items-center gap-1 text-xs font-medium ${kpi.trend > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {kpi.trend > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    {Math.abs(kpi.trend)}%
                  </span>
                )}
              </div>
              <p className="mt-3 text-2xl font-bold text-slate-800">{kpi.value}</p>
              <p className="text-slate-500 text-xs mt-1">{kpi.label}</p>
              <p className="text-slate-400 text-xs mt-0.5">{kpi.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Charts + DRE row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Fluxo de Caixa */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-slate-500" />
            <h2 className="text-base font-semibold text-slate-700">Fluxo de Caixa — Últimos 6 Meses</h2>
          </div>
          <CashFlowChart data={CASH_FLOW_DATA} />
        </div>

        {/* DRE Simplificado */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-slate-500" />
            <h2 className="text-base font-semibold text-slate-700">DRE — Março/2026</h2>
          </div>
          <div className="space-y-1">
            {DRE_ROWS.map(row => (
              <div key={row.label}
                className={`flex items-center justify-between py-1 ${row.bold ? 'border-t border-slate-200 mt-1 pt-2' : ''}`}>
                <span className={`text-sm ${row.bold ? 'font-semibold text-slate-800' : 'text-slate-500'}`}
                  style={{ paddingLeft: `${row.indent * 16}px` }}>
                  {row.label}
                </span>
                <span className={`text-sm font-medium ${row.value < 0 ? 'text-red-500' : row.bold ? 'text-slate-800' : 'text-emerald-700'}`}>
                  {row.value < 0 ? `(${fmt(row.value)})` : fmt(row.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-700">Últimas Movimentações</h2>
          <span className="text-xs text-slate-400">{RECENT_TRANSACTIONS.length} registros recentes</span>
        </div>
        <div className="divide-y divide-slate-50">
          {RECENT_TRANSACTIONS.map(tx => (
            <div key={tx.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${tx.tipo === 'RECEITA' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                {tx.tipo === 'RECEITA'
                  ? <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                  : <ArrowDownRight className="w-4 h-4 text-red-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{tx.desc}</p>
                <p className="text-xs text-slate-400">{tx.id} · {tx.data} · {tx.forma}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`text-sm font-semibold ${tx.tipo === 'RECEITA' ? 'text-emerald-700' : 'text-red-600'}`}>
                  {tx.tipo === 'RECEITA' ? '+' : '-'} {fmt(tx.valor)}
                </p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${tx.status === 'PAGO' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {tx.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
