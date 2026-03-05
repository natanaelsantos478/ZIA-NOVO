import { useState } from 'react';
import {
  Truck, Package, AlertTriangle, CheckCircle2, Clock,
  TrendingDown, MapPin, RefreshCw, Zap,
  BarChart3, ArrowUpRight, ArrowDownRight, Activity,
} from 'lucide-react';

interface KPI {
  label: string;
  value: string;
  sub: string;
  trend: 'up' | 'down' | 'neutral';
  trendValue: string;
  icon: React.ElementType;
  color: string;
}

const KPIS: KPI[] = [
  { label: 'Pedidos em Trânsito',   value: '1.284',  sub: 'em 23 rotas ativas',    trend: 'up',   trendValue: '+8%',   icon: Truck,         color: 'emerald' },
  { label: 'Entregas no Prazo',     value: '94,3%',  sub: 'OTIF do dia',           trend: 'up',   trendValue: '+2,1%', icon: CheckCircle2,  color: 'green'   },
  { label: 'Ocorrências Abertas',   value: '37',     sub: '12 críticas',           trend: 'down', trendValue: '-5',    icon: AlertTriangle, color: 'amber'   },
  { label: 'Custo Médio / Pedido',  value: 'R$ 28,40', sub: 'vs R$ 31,20 ontem',  trend: 'up',   trendValue: '-9%',   icon: TrendingDown,  color: 'blue'    },
  { label: 'Pedidos Expedidos Hoje', value: '843',   sub: 'meta: 900',             trend: 'neutral', trendValue: '93%', icon: Package,      color: 'purple'  },
  { label: 'Atrasos Detectados',    value: '41',     sub: 'torre preditiva',       trend: 'down', trendValue: '-12',   icon: Clock,         color: 'rose'    },
];

const COLOR_MAP: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  green:   'bg-green-50 text-green-600 border-green-100',
  amber:   'bg-amber-50 text-amber-600 border-amber-100',
  blue:    'bg-blue-50 text-blue-600 border-blue-100',
  purple:  'bg-purple-50 text-purple-600 border-purple-100',
  rose:    'bg-rose-50 text-rose-600 border-rose-100',
};

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  time: string;
  carrier: string;
}

const ALERTS: Alert[] = [
  { id: '1', type: 'critical', message: 'Veículo PT-8824 parado há 2h sem movimento — rota SP-Interior', time: '14:23', carrier: 'Frota Própria' },
  { id: '2', type: 'critical', message: '23 entregas de Jadlog com atraso previsto acima de 48h', time: '13:50', carrier: 'Jadlog' },
  { id: '3', type: 'warning',  message: 'Estoque de embalagem caixa G abaixo do mínimo (34 un)', time: '12:10', carrier: 'Armazém SP' },
  { id: '4', type: 'warning',  message: 'SLA de Total Express em risco — 87% (meta: 92%)', time: '11:45', carrier: 'Total Express' },
  { id: '5', type: 'info',     message: 'Roteirização da manhã concluída — 18 rotas otimizadas', time: '08:30', carrier: 'ZIA IA' },
  { id: '6', type: 'info',     message: 'Conciliação de faturas Correios finalizada (+R$ 1.240 de diferença)', time: '07:15', carrier: 'Correios' },
];

interface ActiveRoute {
  id: string;
  driver: string;
  vehicle: string;
  status: 'Em rota' | 'Parado' | 'Concluído';
  deliveries: number;
  done: number;
  eta: string;
  region: string;
}

const ACTIVE_ROUTES: ActiveRoute[] = [
  { id: 'R001', driver: 'Carlos Silva',   vehicle: 'VW Delivery — GHJ-4521', status: 'Em rota',  deliveries: 28, done: 19, eta: '18:30', region: 'Zona Sul SP' },
  { id: 'R002', driver: 'Amanda Costa',   vehicle: 'Fiat Ducato — MNO-7832',  status: 'Em rota',  deliveries: 22, done: 15, eta: '17:45', region: 'ABC Paulista' },
  { id: 'R003', driver: 'Roberto Lima',   vehicle: 'Mercedes Sprinter — KLM-3210', status: 'Parado', deliveries: 31, done: 20, eta: '?',     region: 'Interior SP' },
  { id: 'R004', driver: 'Fernanda Souza', vehicle: 'Renault Master — PQR-5643', status: 'Em rota', deliveries: 17, done: 17, eta: '16:00', region: 'Zona Norte SP' },
];

const ALERT_STYLES: Record<string, string> = {
  critical: 'bg-red-50 border-red-200 text-red-700',
  warning:  'bg-amber-50 border-amber-200 text-amber-700',
  info:     'bg-blue-50 border-blue-200 text-blue-700',
};

const STATUS_BADGE: Record<string, string> = {
  'Em rota':  'bg-emerald-100 text-emerald-700',
  'Parado':   'bg-red-100 text-red-700',
  'Concluído': 'bg-slate-100 text-slate-600',
};

export default function ControlTower() {
  const [selectedTab, setSelectedTab] = useState<'rotas' | 'alertas'>('alertas');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Torre de Controle</h1>
          <p className="text-slate-500 text-sm mt-0.5">Visão centralizada de todas as operações logísticas em tempo real</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
            <Activity className="w-3.5 h-3.5 animate-pulse" />
            Atualizado há 32s
          </span>
          <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {KPIS.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 border ${COLOR_MAP[kpi.color]}`}>
                <Icon className="w-4.5 h-4.5" />
              </div>
              <div className="text-xl font-bold text-slate-800">{kpi.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{kpi.label}</div>
              <div className="flex items-center gap-1 mt-2">
                {kpi.trend === 'up' ? (
                  <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                ) : kpi.trend === 'down' ? (
                  <ArrowDownRight className="w-3 h-3 text-rose-500" />
                ) : null}
                <span className={`text-xs font-medium ${kpi.trend === 'up' ? 'text-emerald-600' : kpi.trend === 'down' ? 'text-rose-600' : 'text-slate-500'}`}>
                  {kpi.trendValue}
                </span>
                <span className="text-xs text-slate-400">{kpi.sub}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Performance Bar */}
      <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-slate-800">Desempenho do Dia</h2>
            <p className="text-xs text-slate-500">Entregas realizadas vs meta diária</p>
          </div>
          <span className="text-sm font-bold text-emerald-600">843 / 900</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3">
          <div className="bg-emerald-500 h-3 rounded-full transition-all" style={{ width: '93.7%' }} />
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-500">
          <span>0</span>
          <span>OTIF: 94,3%</span>
          <span>900</span>
        </div>
      </div>

      {/* Tabs: Rotas Ativas / Alertas */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-100">
          {(['alertas', 'rotas'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                selectedTab === tab
                  ? 'text-emerald-600 border-b-2 border-emerald-500 bg-emerald-50/40'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab === 'alertas' ? (
                <span className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Alertas & Exceções
                  <span className="bg-red-100 text-red-700 text-xs px-1.5 py-0.5 rounded-full">2</span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Rotas Ativas ({ACTIVE_ROUTES.length})
                </span>
              )}
            </button>
          ))}
        </div>

        {selectedTab === 'alertas' && (
          <div className="divide-y divide-slate-50">
            {ALERTS.map((alert) => (
              <div key={alert.id} className={`flex items-start gap-3 px-5 py-3.5 border-l-4 ${ALERT_STYLES[alert.type]}`}>
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{alert.message}</p>
                  <p className="text-xs mt-0.5 opacity-70">{alert.carrier} · {alert.time}</p>
                </div>
                <button className="text-xs underline opacity-70 hover:opacity-100 flex-shrink-0">Ver</button>
              </div>
            ))}
          </div>
        )}

        {selectedTab === 'rotas' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-5 py-3 text-left">Motorista</th>
                  <th className="px-5 py-3 text-left">Veículo</th>
                  <th className="px-5 py-3 text-left">Região</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-center">Progresso</th>
                  <th className="px-5 py-3 text-center">ETA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {ACTIVE_ROUTES.map((route) => (
                  <tr key={route.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-slate-800">{route.driver}</td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">{route.vehicle}</td>
                    <td className="px-5 py-3.5 text-slate-600">{route.region}</td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[route.status]}`}>
                        {route.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                          <div
                            className="bg-emerald-500 h-1.5 rounded-full"
                            style={{ width: `${(route.done / route.deliveries) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 w-12 text-right">{route.done}/{route.deliveries}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-center text-slate-600 font-medium">{route.eta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bottom row — Transportadoras status */}
      <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-emerald-600" />
          <h2 className="font-semibold text-slate-800">Status por Transportadora</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'Correios',       sla: 91, entregas: 312, cor: 'yellow' },
            { name: 'Jadlog',         sla: 87, entregas: 198, cor: 'red'    },
            { name: 'Total Express',  sla: 95, entregas: 241, cor: 'green'  },
            { name: 'Frota Própria',  sla: 98, entregas: 92,  cor: 'green'  },
          ].map((c) => (
            <div key={c.name} className="bg-slate-50 rounded-lg p-3">
              <div className="text-sm font-medium text-slate-700">{c.name}</div>
              <div className="flex items-end justify-between mt-2">
                <div>
                  <div className="text-lg font-bold text-slate-800">{c.sla}%</div>
                  <div className="text-xs text-slate-500">SLA</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-emerald-600">{c.entregas}</div>
                  <div className="text-xs text-slate-500">entregas</div>
                </div>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                <div
                  className={`h-1.5 rounded-full ${c.sla >= 92 ? 'bg-emerald-500' : c.sla >= 88 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${c.sla}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
