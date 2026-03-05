import { useState } from 'react';
import { Route, Play, RefreshCw, MapPin, Truck, Clock, DollarSign, Zap, CheckCircle2, AlertTriangle } from 'lucide-react';

interface Stop {
  order: number;
  address: string;
  recipient: string;
  window: string;
  status: 'Pendente' | 'Entregue' | 'Tentativa';
  weight: number;
}

interface RouteData {
  id: string;
  driver: string;
  vehicle: string;
  stops: Stop[];
  totalKm: number;
  estTime: string;
  fuelCost: number;
  optimized: boolean;
  region: string;
}

const ROUTE_DATA: RouteData[] = [
  {
    id: 'RTA-001', driver: 'Carlos Silva', vehicle: 'VW Delivery — GHJ-4521',
    region: 'Zona Sul SP', totalKm: 87.4, estTime: '6h 20min', fuelCost: 62.30, optimized: true,
    stops: [
      { order: 1, address: 'Av. Paulista, 1000 — Bela Vista', recipient: 'Escritório Central', window: '08:00–10:00', status: 'Entregue', weight: 12 },
      { order: 2, address: 'R. Vergueiro, 540 — Liberdade',   recipient: 'Mercadinho Sato',    window: '10:00–11:00', status: 'Entregue', weight: 28 },
      { order: 3, address: 'Av. Jabaquara, 200 — Mirandópolis', recipient: 'Supermercado SP', window: '11:00–13:00', status: 'Pendente', weight: 45 },
      { order: 4, address: 'R. Domingos de Morais, 800 — Vila Mariana', recipient: 'Padaria Bella', window: '13:00–14:00', status: 'Pendente', weight: 8 },
      { order: 5, address: 'Av. Santo Amaro, 1200 — Brooklin', recipient: 'Tech Office',       window: '14:00–16:00', status: 'Pendente', weight: 20 },
    ],
  },
  {
    id: 'RTA-002', driver: 'Amanda Costa', vehicle: 'Fiat Ducato — MNO-7832',
    region: 'ABC Paulista', totalKm: 124.8, estTime: '8h 45min', fuelCost: 89.10, optimized: true,
    stops: [
      { order: 1, address: 'Av. Industrial, 300 — Santo André',  recipient: 'Fábrica Norte',  window: '07:30–09:00', status: 'Entregue', weight: 150 },
      { order: 2, address: 'R. Coronel Alfredo, 80 — São Bernardo', recipient: 'Distribuidora', window: '09:00–11:00', status: 'Entregue', weight: 80 },
      { order: 3, address: 'Av. Portugal, 450 — São Caetano',    recipient: 'Hospital Regional', window: '11:00–12:30', status: 'Tentativa', weight: 30 },
      { order: 4, address: 'Av. Presidente Kennedy, 200 — Mauá', recipient: 'Atacado Mauá',   window: '13:00–15:00', status: 'Pendente', weight: 200 },
    ],
  },
];

const STOP_STATUS_BADGE: Record<string, string> = {
  'Pendente':  'bg-slate-100 text-slate-600',
  'Entregue':  'bg-emerald-100 text-emerald-700',
  'Tentativa': 'bg-amber-100 text-amber-700',
};

const OPTIMIZATION_TIPS = [
  { tip: 'Agrupar 3 paradas no Brooklin economizaria 12 km', saving: 'R$ 8,60' },
  { tip: 'Janela da Padaria Bella pode ser atendida no retorno', saving: '18 min' },
  { tip: 'Trocar rota RTA-001 por Frota 3 reduziria custo em 15%', saving: 'R$ 9,30' },
];

export default function Routing() {
  const [selectedRoute, setSelectedRoute] = useState<string>('RTA-001');
  const activeRoute = ROUTE_DATA.find((r) => r.id === selectedRoute) ?? ROUTE_DATA[0];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Roteirização</h1>
          <p className="text-slate-500 text-sm mt-0.5">Criação de rotas otimizadas por custo, tempo ou distância</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 border border-emerald-300 text-emerald-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-50 transition-colors">
            <RefreshCw className="w-4 h-4" />
            Reotimizar
          </button>
          <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
            <Play className="w-4 h-4" />
            Nova Roteirização IA
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Rotas Ativas',       value: ROUTE_DATA.length.toString(), icon: Route,       color: 'emerald' },
          { label: 'Km Totais',           value: `${ROUTE_DATA.reduce((s, r) => s + r.totalKm, 0).toFixed(0)} km`, icon: MapPin, color: 'blue' },
          { label: 'Custo Combustível',  value: `R$ ${ROUTE_DATA.reduce((s, r) => s + r.fuelCost, 0).toFixed(2)}`, icon: DollarSign, color: 'amber' },
          { label: 'Economia com IA',    value: '22%', icon: Zap, color: 'purple' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 bg-${s.color}-50`}>
                <Icon className={`w-4 h-4 text-${s.color}-600`} />
              </div>
              <div className="text-2xl font-bold text-slate-800">{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Route list */}
        <div className="space-y-3">
          <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Rotas do Dia</h2>
          {ROUTE_DATA.map((route) => (
            <button
              key={route.id}
              onClick={() => setSelectedRoute(route.id)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                selectedRoute === route.id
                  ? 'border-emerald-300 bg-emerald-50 shadow-sm'
                  : 'border-slate-100 bg-white hover:border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-sm font-bold text-slate-800">{route.id}</span>
                {route.optimized && (
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">IA otimizada</span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-0.5">
                <Truck className="w-3 h-3" />
                {route.driver}
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                <span>{route.stops.length} paradas</span>
                <span>{route.totalKm} km</span>
                <span>{route.estTime}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                {route.stops.filter((s) => s.status === 'Entregue').length > 0 && (
                  <span className="text-xs text-emerald-600">
                    {route.stops.filter((s) => s.status === 'Entregue').length} entregues
                  </span>
                )}
                <span className="text-xs text-slate-400">
                  {route.stops.filter((s) => s.status === 'Pendente').length} pendentes
                </span>
              </div>
            </button>
          ))}

          {/* AI Tips */}
          <div className="bg-purple-50 rounded-xl border border-purple-100 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-semibold text-purple-800">Sugestões IA</span>
            </div>
            {OPTIMIZATION_TIPS.map((tip, i) => (
              <div key={i} className="flex items-start gap-2 mb-2 last:mb-0">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-purple-700">{tip.tip}</p>
                  <p className="text-xs font-bold text-purple-900 mt-0.5">Economia: {tip.saving}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Route detail */}
        <div className="col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-800">{activeRoute.id} — {activeRoute.region}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{activeRoute.driver} · {activeRoute.vehicle}</p>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {activeRoute.totalKm} km</span>
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {activeRoute.estTime}</span>
                <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" /> R$ {activeRoute.fuelCost.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Map placeholder */}
          <div className="h-48 bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center border-b border-slate-100">
            <div className="text-center">
              <MapPin className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Mapa ao vivo</p>
              <p className="text-xs text-slate-400">Integração Google Maps / HERE Maps</p>
            </div>
          </div>

          {/* Stops list */}
          <div className="divide-y divide-slate-50">
            {activeRoute.stops.map((stop) => (
              <div key={stop.order} className="flex items-center gap-4 px-5 py-3.5">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  stop.status === 'Entregue' ? 'bg-emerald-500 text-white' :
                  stop.status === 'Tentativa' ? 'bg-amber-500 text-white' :
                  'bg-slate-200 text-slate-600'
                }`}>
                  {stop.status === 'Entregue' ? <CheckCircle2 className="w-3.5 h-3.5" /> : stop.order}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">{stop.address}</div>
                  <div className="text-xs text-slate-500">{stop.recipient}</div>
                </div>
                <div className="text-xs text-slate-500 flex-shrink-0">{stop.window}</div>
                <div className="text-xs text-slate-500 flex-shrink-0">{stop.weight} kg</div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${STOP_STATUS_BADGE[stop.status]}`}>
                  {stop.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
