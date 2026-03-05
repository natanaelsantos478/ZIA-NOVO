import { FileCheck, DollarSign, AlertTriangle, CheckCircle2, TrendingDown, Zap } from 'lucide-react';

interface ReconciliationItem {
  carrier: string;
  period: string;
  invoiceNo: string;
  expected: number;
  billed: number;
  diff: number;
  items: number;
  status: 'OK' | 'Divergência' | 'Contestado' | 'Em análise';
}

const ITEMS: ReconciliationItem[] = [
  { carrier: 'Jadlog',        period: 'Fev/26', invoiceNo: 'JDL-0324', expected: 12_480, billed: 13_240, diff: -760,  items: 234, status: 'Contestado'  },
  { carrier: 'Correios',      period: 'Fev/26', invoiceNo: 'COR-0214', expected: 8_920,  billed: 8_850,  diff: 70,    items: 512, status: 'OK'          },
  { carrier: 'Total Express', period: 'Fev/26', invoiceNo: 'TEX-0198', expected: 18_300, billed: 18_300, diff: 0,     items: 189, status: 'OK'          },
  { carrier: 'Braspress',     period: 'Fev/26', invoiceNo: 'BRS-0087', expected: 5_600,  billed: 6_840,  diff: -1_240, items: 43, status: 'Contestado'  },
  { carrier: 'Sequoia',       period: 'Fev/26', invoiceNo: 'SEQ-0056', expected: 9_100,  billed: 9_410,  diff: -310,  items: 78,  status: 'Em análise'  },
];

const STATUS_BADGE: Record<string, string> = {
  'OK':           'bg-emerald-100 text-emerald-700',
  'Divergência':  'bg-red-100 text-red-700',
  'Contestado':   'bg-purple-100 text-purple-700',
  'Em análise':   'bg-amber-100 text-amber-700',
};

const DIVERGENCE_CAUSES = [
  { cause: 'Peso cúbico calculado diferente', amount: 1_240, carrier: 'Braspress', shipments: 8 },
  { cause: 'Frete cobrado sem embarque correspondente', amount: 890, carrier: 'Jadlog', shipments: 12 },
  { cause: 'Taxa de seguro não contratada', amount: 620, carrier: 'Jadlog', shipments: 18 },
  { cause: 'Zona de entrega divergente', amount: 310, carrier: 'Sequoia', shipments: 5 },
];

const totalDivergence = Math.abs(ITEMS.reduce((s, i) => s + Math.min(0, i.diff), 0));

export default function InvoiceReconciliation() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Conciliação de Faturas</h1>
          <p className="text-slate-500 text-sm mt-0.5">O que as transportadoras cobraram vs o que deveria ser cobrado</p>
        </div>
        <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
          <FileCheck className="w-4 h-4" />
          Executar Conciliação
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Cobrado a Mais',    value: `R$ ${totalDivergence.toLocaleString('pt-BR')}`, icon: TrendingDown, color: 'red'     },
          { label: 'Faturas com Problema',    value: ITEMS.filter((i) => i.status !== 'OK').length,   icon: AlertTriangle, color: 'amber'  },
          { label: 'Faturas Conformes',       value: ITEMS.filter((i) => i.status === 'OK').length,   icon: CheckCircle2, color: 'emerald' },
          { label: 'Embarques Analisados',    value: ITEMS.reduce((s, i) => s + i.items, 0),          icon: DollarSign,   color: 'blue'    },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 bg-${s.color}-50`}>
                <Icon className={`w-4 h-4 text-${s.color}-600`} />
              </div>
              <div className="text-xl font-bold text-slate-800">{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3 text-left">Transportadora</th>
              <th className="px-5 py-3 text-center">Período</th>
              <th className="px-5 py-3 text-left">Fatura</th>
              <th className="px-5 py-3 text-center">Embarques</th>
              <th className="px-5 py-3 text-right">Previsto</th>
              <th className="px-5 py-3 text-right">Cobrado</th>
              <th className="px-5 py-3 text-right">Diferença</th>
              <th className="px-5 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {ITEMS.map((item, i) => (
              <tr key={i} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3.5 font-medium text-slate-800">{item.carrier}</td>
                <td className="px-5 py-3.5 text-center text-slate-600">{item.period}</td>
                <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{item.invoiceNo}</td>
                <td className="px-5 py-3.5 text-center text-slate-600">{item.items}</td>
                <td className="px-5 py-3.5 text-right text-slate-700">R$ {item.expected.toLocaleString('pt-BR')}</td>
                <td className="px-5 py-3.5 text-right text-slate-700">R$ {item.billed.toLocaleString('pt-BR')}</td>
                <td className="px-5 py-3.5 text-right">
                  <span className={`font-bold ${item.diff < 0 ? 'text-red-600' : item.diff > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {item.diff < 0 ? '-' : item.diff > 0 ? '+' : ''}R$ {Math.abs(item.diff).toLocaleString('pt-BR')}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[item.status]}`}>{item.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Divergence causes */}
      <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-emerald-600" />
          <h2 className="font-semibold text-slate-800">Principais Causas de Divergência — ZIA detectou</h2>
        </div>
        <div className="space-y-3">
          {DIVERGENCE_CAUSES.map((c, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-slate-800">{c.cause}</p>
                <p className="text-xs text-slate-500 mt-0.5">{c.carrier} · {c.shipments} embarques afetados</p>
              </div>
              <span className="text-sm font-bold text-red-600">-R$ {c.amount.toLocaleString('pt-BR')}</span>
            </div>
          ))}
        </div>
        <button className="mt-4 text-xs bg-emerald-600 text-white px-4 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors">
          Gerar Carta de Contestação Automática para Todas
        </button>
      </div>
    </div>
  );
}
