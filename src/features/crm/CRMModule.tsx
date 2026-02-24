import {
  DollarSign, TrendingUp, Users, AlertCircle,
  MoreHorizontal, ArrowUpRight
} from 'lucide-react';

export default function CRMModule() {
  const kpis = [
    { label: 'Receita Total', value: 'R$ 1.2M', change: '+12%', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { label: 'Leads Ativos', value: '342', change: '+5%', icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Taxa de Conversão', value: '3.2%', change: '-0.4%', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-100' },
    { label: 'Alertas Críticos', value: '3', change: 'Ação Req.', icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100' },
  ];

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">{kpi.label}</p>
              <h3 className="text-2xl font-bold text-slate-900">{kpi.value}</h3>
              <span className={`text-xs font-bold ${kpi.change.includes('-') ? 'text-red-500' : 'text-emerald-500'} flex items-center mt-2`}>
                {kpi.change} <span className="text-slate-400 font-normal ml-1">vs mês anterior</span>
              </span>
            </div>
            <div className={`p-3 rounded-xl ${kpi.bg}`}>
              <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Pipeline Chart Placeholder */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800">Funil de Vendas</h3>
            <button className="text-slate-400 hover:text-slate-600">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
          <div className="h-64 bg-slate-50 rounded-xl flex items-center justify-center border border-dashed border-slate-200">
            <span className="text-slate-400 text-sm font-medium">Gráfico de Pipeline (Placeholder)</span>
          </div>
        </div>

        {/* Recent Activity / Deals */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800">Negócios Recentes</h3>
            <button className="text-slate-400 hover:text-slate-600">
              <ArrowUpRight className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer group">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                    LD
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-600">Empresa {i} Ltda</p>
                    <p className="text-xs text-slate-500">Proposta enviada</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-900">R$ 12.5k</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
