import { TrendingUp, Zap, BarChart2, AlertTriangle, CheckCircle2 } from 'lucide-react';

const FORECAST_DATA = [
  { month: 'Mar/26', actual: null,   predicted: 19_800, low: 18_200, high: 21_400 },
  { month: 'Abr/26', actual: null,   predicted: 21_200, low: 19_400, high: 23_000 },
  { month: 'Mai/26', actual: null,   predicted: 22_400, low: 20_100, high: 24_700 },
  { month: 'Jun/26', actual: null,   predicted: 20_800, low: 18_600, high: 23_000 },
];

const HISTORICAL = [
  { month: 'Set/25', value: 14_200 },
  { month: 'Out/25', value: 15_800 },
  { month: 'Nov/25', value: 18_400 },
  { month: 'Dez/25', value: 22_100 },
  { month: 'Jan/26', value: 16_890 },
  { month: 'Fev/26', value: 18_420 },
];

const ALL_DATA = [
  ...HISTORICAL.map((h) => ({ ...h, type: 'historical' as const })),
  ...FORECAST_DATA.map((f) => ({ month: f.month, value: f.predicted, type: 'forecast' as const })),
];

const maxValue = Math.max(...ALL_DATA.map((d) => d.value));

const CAPACITY_PLAN = [
  { resource: 'Motoristas',      current: 7,  needed: 9,  gap: 2  },
  { resource: 'Veículos',        current: 7,  needed: 8,  gap: 1  },
  { resource: 'Espaço armazém',  current: 85, needed: 95, gap: 10 },
  { resource: 'Operadores WMS',  current: 4,  needed: 5,  gap: 1  },
];

export default function DemandForecast() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Previsão de Demanda</h1>
          <p className="text-slate-500 text-sm mt-0.5">Modelo preditivo ZIA — previsão de volume para dimensionar operação</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-purple-600 bg-purple-50 px-3 py-1.5 rounded-full border border-purple-100">
            <Zap className="w-3.5 h-3.5" />
            Modelo ML atualizado em 01/03/2026
          </span>
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Previsão Mar/26',   value: '19.800 pedidos', icon: TrendingUp,   color: 'emerald', sub: '+7,5% vs fev/26' },
          { label: 'Pico previsto',     value: 'Dez/26',         icon: BarChart2,    color: 'purple',  sub: 'estimativa: 28K pedidos' },
          { label: 'Acurácia do modelo', value: '94,2%',         icon: CheckCircle2, color: 'blue',    sub: 'MAPE últimos 6 meses' },
          { label: 'Alerta de capacidade', value: '2 gaps',      icon: AlertTriangle, color: 'amber',  sub: 'recursos insuficientes' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 bg-${s.color}-50`}>
                <Icon className={`w-4 h-4 text-${s.color}-600`} />
              </div>
              <div className="text-lg font-bold text-slate-800">{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
              <div className="text-xs text-slate-400 mt-0.5">{s.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Forecast chart */}
      <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-800">Volume de Pedidos — Histórico + Previsão</h2>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5"><div className="w-4 h-1 bg-emerald-600 rounded" /> Realizado</span>
            <span className="flex items-center gap-1.5"><div className="w-4 h-1 bg-purple-400 rounded border-dashed border border-purple-400" /> Previsto</span>
          </div>
        </div>
        <div className="flex items-end gap-2 h-48">
          {ALL_DATA.map((d, i) => {
            const h = (d.value / maxValue) * 100;
            const isForecast = d.type === 'forecast';
            const isFirst = i === 6;
            return (
              <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="relative w-full">
                  <div
                    className={`w-full rounded-t ${isForecast ? 'bg-purple-300 border-t-2 border-purple-400 border-dashed' : 'bg-emerald-500'}`}
                    style={{ height: `${h * 1.6}px` }}
                  />
                  {isFirst && <div className="absolute inset-y-0 left-0 border-l-2 border-dashed border-purple-400" />}
                </div>
                <div className="text-xs font-bold text-slate-700">{(d.value / 1000).toFixed(1)}K</div>
                <span className="text-xs text-slate-500">{d.month}</span>
                {isForecast && <span className="text-xs text-purple-500">prev.</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Capacity plan */}
      <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
        <h2 className="font-semibold text-slate-800 mb-4">Plano de Capacidade — Março/Abril 2026</h2>
        <div className="space-y-4">
          {CAPACITY_PLAN.map((r) => {
            const pct = (r.current / r.needed) * 100;
            return (
              <div key={r.resource}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-700">{r.resource}</span>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-slate-500">Atual: <span className="font-bold text-slate-700">{r.current}</span></span>
                    <span className="text-slate-500">Necessário: <span className="font-bold text-slate-700">{r.needed}</span></span>
                    {r.gap > 0 && (
                      <span className="text-amber-600 font-bold text-xs bg-amber-50 px-2 py-0.5 rounded-full">+{r.gap} necessários</span>
                    )}
                  </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${pct >= 100 ? 'bg-emerald-500' : pct >= 80 ? 'bg-amber-400' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
