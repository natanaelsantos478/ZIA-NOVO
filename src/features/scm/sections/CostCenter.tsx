import { Building, DollarSign, BarChart3, TrendingUp, TrendingDown } from 'lucide-react';

interface CostCenterItem {
  cc: string;
  name: string;
  type: 'Filial' | 'Cliente' | 'Produto' | 'Projeto';
  frete: number;
  armazenagem: number;
  outros: number;
  total: number;
  prev: number;
  var: number;
}

const COST_CENTERS: CostCenterItem[] = [
  { cc: 'CC-1001', name: 'Filial São Paulo',        type: 'Filial',   frete: 82_400, armazenagem: 18_200, outros: 9_400,  total: 110_000, prev: 118_000, var: -6.8  },
  { cc: 'CC-1002', name: 'Filial Campinas',         type: 'Filial',   frete: 31_200, armazenagem: 8_400,  outros: 3_200,  total: 42_800,  prev: 40_200,  var: +6.5  },
  { cc: 'CC-1003', name: 'Filial Ribeirão Preto',   type: 'Filial',   frete: 14_800, armazenagem: 4_100,  outros: 1_800,  total: 20_700,  prev: 21_800,  var: -5.0  },
  { cc: 'CC-2001', name: 'TechCorp Ltda',           type: 'Cliente',  frete: 18_420, armazenagem: 2_800,  outros: 1_200,  total: 22_420,  prev: 21_000,  var: +6.8  },
  { cc: 'CC-2002', name: 'Distribuidora Norte',     type: 'Cliente',  frete: 9_840,  armazenagem: 1_400,  outros: 580,    total: 11_820,  prev: 12_400,  var: -4.7  },
  { cc: 'CC-3001', name: 'Linha Eletrônicos',       type: 'Produto',  frete: 24_800, armazenagem: 8_200,  outros: 4_100,  total: 37_100,  prev: 38_500,  var: -3.6  },
  { cc: 'CC-3002', name: 'Linha Moda & Vestuário',  type: 'Produto',  frete: 18_200, armazenagem: 4_800,  outros: 2_400,  total: 25_400,  prev: 24_100,  var: +5.4  },
];

const TYPE_BADGE: Record<string, string> = {
  'Filial':  'bg-blue-50 text-blue-700',
  'Cliente': 'bg-purple-50 text-purple-700',
  'Produto': 'bg-amber-50 text-amber-700',
  'Projeto': 'bg-teal-50 text-teal-700',
};

const maxTotal = Math.max(...COST_CENTERS.map((c) => c.total));

export default function CostCenter() {
  const totalLogistic = COST_CENTERS.filter((c) => c.type === 'Filial').reduce((s, c) => s + c.total, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Centro de Custo Logístico</h1>
          <p className="text-slate-500 text-sm mt-0.5">Rateio de custos por filial, cliente e produto</p>
        </div>
        <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-medium">Fevereiro 2026</span>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Custo Total Logístico',  value: `R$ ${(totalLogistic / 1000).toFixed(0)}K`, icon: DollarSign, color: 'emerald' },
          { label: 'Centros de Custo',       value: COST_CENTERS.length, icon: Building, color: 'blue' },
          { label: 'Custo Médio/CC',         value: `R$ ${((totalLogistic / COST_CENTERS.filter((c) => c.type === 'Filial').length) / 1000).toFixed(1)}K`, icon: BarChart3, color: 'purple' },
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
              <th className="px-5 py-3 text-left">Centro de Custo</th>
              <th className="px-5 py-3 text-center">Tipo</th>
              <th className="px-5 py-3 text-right">Frete</th>
              <th className="px-5 py-3 text-right">Armazenagem</th>
              <th className="px-5 py-3 text-right">Outros</th>
              <th className="px-5 py-3 text-right">Total</th>
              <th className="px-5 py-3 text-center">Participação</th>
              <th className="px-5 py-3 text-center">Var. %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {COST_CENTERS.map((cc) => (
              <tr key={cc.cc} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="font-medium text-slate-800">{cc.name}</div>
                  <div className="font-mono text-xs text-slate-500">{cc.cc}</div>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <span className={`px-2 py-0.5 rounded text-xs ${TYPE_BADGE[cc.type]}`}>{cc.type}</span>
                </td>
                <td className="px-5 py-3.5 text-right text-slate-600">R$ {(cc.frete / 1000).toFixed(1)}K</td>
                <td className="px-5 py-3.5 text-right text-slate-600">R$ {(cc.armazenagem / 1000).toFixed(1)}K</td>
                <td className="px-5 py-3.5 text-right text-slate-600">R$ {(cc.outros / 1000).toFixed(1)}K</td>
                <td className="px-5 py-3.5 text-right font-bold text-slate-800">R$ {(cc.total / 1000).toFixed(1)}K</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                      <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${(cc.total / maxTotal) * 100}%` }} />
                    </div>
                    <span className="text-xs text-slate-500 w-8 text-right">{((cc.total / totalLogistic) * 100).toFixed(0)}%</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <div className="flex items-center justify-center gap-1">
                    {cc.var < 0 ? (
                      <><TrendingDown className="w-3.5 h-3.5 text-emerald-500" /><span className="text-xs font-medium text-emerald-600">{cc.var.toFixed(1)}%</span></>
                    ) : (
                      <><TrendingUp className="w-3.5 h-3.5 text-red-500" /><span className="text-xs font-medium text-red-600">+{cc.var.toFixed(1)}%</span></>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
