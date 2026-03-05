import { useState } from 'react';
import { Search, MapPin, Truck, CheckCircle2, Clock, AlertTriangle, Activity } from 'lucide-react';

interface TrackingEvent {
  time: string;
  location: string;
  event: string;
  status: 'done' | 'current' | 'pending';
}

interface TrackedPackage {
  trackingCode: string;
  carrier: string;
  recipient: string;
  origin: string;
  destination: string;
  status: string;
  eta: string;
  events: TrackingEvent[];
}

const PACKAGES: TrackedPackage[] = [
  {
    trackingCode: 'JD8481234BR',
    carrier: 'Jadlog',
    recipient: 'João Alves',
    origin: 'São Paulo, SP',
    destination: 'Rio de Janeiro, RJ',
    status: 'Em trânsito',
    eta: '06/03/2026',
    events: [
      { time: '05/03 08:15', location: 'São Paulo, SP', event: 'Objeto postado', status: 'done' },
      { time: '05/03 11:30', location: 'São Paulo, SP', event: 'Em processamento — CD São Paulo', status: 'done' },
      { time: '05/03 14:45', location: 'São Paulo, SP', event: 'Objeto em transferência para CD destino', status: 'done' },
      { time: '06/03 08:00', location: 'Rio de Janeiro, RJ', event: 'Chegada ao CD destino', status: 'current' },
      { time: '06/03 —', location: 'Rio de Janeiro, RJ', event: 'Saiu para entrega', status: 'pending' },
      { time: '06/03 —', location: 'Rio de Janeiro, RJ', event: 'Entrega realizada', status: 'pending' },
    ],
  },
  {
    trackingCode: 'TE0048123',
    carrier: 'Total Express',
    recipient: 'Maria Santos',
    origin: 'Campinas, SP',
    destination: 'Ribeirão Preto, SP',
    status: 'Saiu para entrega',
    eta: '05/03/2026',
    events: [
      { time: '04/03 07:00', location: 'Campinas, SP', event: 'Coleta realizada', status: 'done' },
      { time: '04/03 18:00', location: 'Campinas, SP', event: 'Triagem realizada', status: 'done' },
      { time: '05/03 06:30', location: 'Ribeirão Preto, SP', event: 'Chegada ao CD destino', status: 'done' },
      { time: '05/03 08:45', location: 'Ribeirão Preto, SP', event: 'Saiu para entrega', status: 'current' },
      { time: '05/03 —', location: 'Ribeirão Preto, SP', event: 'Entrega realizada', status: 'pending' },
    ],
  },
];

const STATUS_BADGE: Record<string, string> = {
  'Em trânsito':      'bg-blue-100 text-blue-700',
  'Saiu para entrega': 'bg-amber-100 text-amber-700',
  'Entregue':         'bg-emerald-100 text-emerald-700',
  'Ocorrência':       'bg-red-100 text-red-700',
};

export default function Tracking() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string>(PACKAGES[0].trackingCode);

  const filteredPackages = PACKAGES.filter((p) =>
    p.trackingCode.toLowerCase().includes(search.toLowerCase()) ||
    p.recipient.toLowerCase().includes(search.toLowerCase())
  );

  const selectedPkg = PACKAGES.find((p) => p.trackingCode === selected) ?? PACKAGES[0];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Rastreio em Tempo Real</h1>
          <p className="text-slate-500 text-sm mt-0.5">Integração com transportadoras e telemetria de frota própria</p>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
          <Activity className="w-3.5 h-3.5 animate-pulse" />
          Atualização automática
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Rastreados Ativos',  value: '1.284', icon: Truck,        color: 'blue'    },
          { label: 'Saiu p/ Entrega',    value: '392',   icon: MapPin,       color: 'amber'   },
          { label: 'Entregues Hoje',     value: '843',   icon: CheckCircle2, color: 'emerald' },
          { label: 'Sem Evento +24h',   value: '28',    icon: AlertTriangle, color: 'red'     },
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
        {/* Package list */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Código de rastreio ou destinatário..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          {filteredPackages.map((pkg) => (
            <button
              key={pkg.trackingCode}
              onClick={() => setSelected(pkg.trackingCode)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${selected === pkg.trackingCode ? 'border-emerald-300 bg-emerald-50' : 'border-slate-100 bg-white hover:border-slate-200'}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-xs font-bold text-slate-700">{pkg.trackingCode}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[pkg.status] ?? 'bg-slate-100 text-slate-600'}`}>{pkg.status}</span>
              </div>
              <div className="text-sm font-medium text-slate-800">{pkg.recipient}</div>
              <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                <MapPin className="w-3 h-3" />
                {pkg.destination}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">{pkg.carrier} · ETA: {pkg.eta}</div>
            </button>
          ))}
        </div>

        {/* Timeline */}
        <div className="col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <div className="mb-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono text-sm text-slate-500">{selectedPkg.trackingCode}</div>
                <div className="text-lg font-bold text-slate-800 mt-0.5">{selectedPkg.recipient}</div>
              </div>
              <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${STATUS_BADGE[selectedPkg.status] ?? 'bg-slate-100 text-slate-600'}`}>{selectedPkg.status}</span>
            </div>
            <div className="flex items-center gap-4 mt-3 text-sm text-slate-600">
              <span>{selectedPkg.origin}</span>
              <span className="text-slate-400">→</span>
              <span className="font-medium">{selectedPkg.destination}</span>
              <span className="ml-auto text-emerald-600 font-medium">ETA: {selectedPkg.eta}</span>
            </div>
          </div>

          {/* Map placeholder */}
          <div className="h-40 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl flex items-center justify-center mb-5 border border-emerald-100">
            <div className="text-center">
              <MapPin className="w-6 h-6 text-emerald-400 mx-auto" />
              <p className="text-xs text-slate-500 mt-1">Mapa em tempo real</p>
            </div>
          </div>

          {/* Events timeline */}
          <div className="relative">
            {selectedPkg.events.map((ev, i) => (
              <div key={i} className="flex gap-4 mb-4 last:mb-0">
                <div className="flex flex-col items-center">
                  <div className={`w-4 h-4 rounded-full flex-shrink-0 mt-0.5 ${ev.status === 'done' ? 'bg-emerald-500' : ev.status === 'current' ? 'bg-amber-400 ring-4 ring-amber-100' : 'bg-slate-200'}`} />
                  {i < selectedPkg.events.length - 1 && (
                    <div className={`w-0.5 flex-1 mt-1 ${ev.status === 'done' ? 'bg-emerald-300' : 'bg-slate-200'}`} style={{ minHeight: '20px' }} />
                  )}
                </div>
                <div className={`pb-4 ${i < selectedPkg.events.length - 1 ? '' : ''}`}>
                  <div className={`text-sm font-medium ${ev.status === 'pending' ? 'text-slate-400' : 'text-slate-800'}`}>{ev.event}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{ev.location} · {ev.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
