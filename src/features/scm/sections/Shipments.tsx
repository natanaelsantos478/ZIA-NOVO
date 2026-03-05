import { useState } from 'react';
import { Search, Plus, Package, Truck, MapPin, Calendar, Users, Filter, Download, ChevronDown } from 'lucide-react';

type ShipStatus = 'Em preparo' | 'Aguardando coleta' | 'Em trânsito' | 'Entregue' | 'Ocorrência';

interface Shipment {
  id: string;
  orders: number;
  carrier: string;
  vehicle: string;
  driver: string;
  origin: string;
  destination: string;
  weight: number;
  status: ShipStatus;
  departureDate: string;
  eta: string;
  value: number;
}

const SHIPMENTS: Shipment[] = [
  { id: 'EMB-9241', orders: 28, carrier: 'Frota Própria',  vehicle: 'VW Delivery',    driver: 'Carlos Silva',    origin: 'CD São Paulo',    destination: 'Zona Sul SP',   weight: 340,   status: 'Em trânsito',      departureDate: '05/03/2026 07:30', eta: '05/03/2026', value: 4_820 },
  { id: 'EMB-9240', orders: 45, carrier: 'Jadlog',         vehicle: 'Toco',           driver: 'Roberto Lima',    origin: 'CD São Paulo',    destination: 'ABC Paulista',  weight: 890,   status: 'Em trânsito',      departureDate: '05/03/2026 06:00', eta: '06/03/2026', value: 12_340 },
  { id: 'EMB-9239', orders: 12, carrier: 'Total Express',  vehicle: 'Sprinter',       driver: 'Fernanda Souza',  origin: 'CD Campinas',     destination: 'Ribeirão Preto', weight: 180,  status: 'Entregue',         departureDate: '04/03/2026 08:00', eta: '05/03/2026', value: 2_180 },
  { id: 'EMB-9238', orders: 60, carrier: 'Braspress',      vehicle: 'Truck',          driver: 'Paulo Mendes',    origin: 'CD São Paulo',    destination: 'Rio de Janeiro', weight: 2_400, status: 'Em preparo',       departureDate: '06/03/2026 —',    eta: '08/03/2026', value: 28_500 },
  { id: 'EMB-9237', orders: 8,  carrier: 'Frota Própria',  vehicle: 'Ducato',         driver: 'Amanda Costa',    origin: 'CD São Paulo',    destination: 'Interior SP',   weight: 120,   status: 'Aguardando coleta', departureDate: '05/03/2026 10:00', eta: '05/03/2026', value: 1_540 },
  { id: 'EMB-9236', orders: 33, carrier: 'Sequoia',        vehicle: 'Toco',           driver: '—',               origin: 'CD Guarulhos',    destination: 'Minas Gerais',  weight: 680,   status: 'Ocorrência',       departureDate: '03/03/2026 06:00', eta: '04/03/2026', value: 9_100 },
  { id: 'EMB-9235', orders: 19, carrier: 'Correios',       vehicle: '—',              driver: '—',               origin: 'CD São Paulo',    destination: 'Nordeste',      weight: 95,    status: 'Em trânsito',      departureDate: '04/03/2026 —',    eta: '10/03/2026', value: 1_920 },
];

const STATUS_BADGE: Record<ShipStatus, string> = {
  'Em preparo':        'bg-slate-100 text-slate-600',
  'Aguardando coleta': 'bg-amber-100 text-amber-700',
  'Em trânsito':       'bg-blue-100 text-blue-700',
  'Entregue':          'bg-emerald-100 text-emerald-700',
  'Ocorrência':        'bg-red-100 text-red-700',
};

export default function Shipments() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | ShipStatus>('Todos');

  const STATUSES: ShipStatus[] = ['Em preparo', 'Aguardando coleta', 'Em trânsito', 'Entregue', 'Ocorrência'];

  const filtered = SHIPMENTS.filter((s) => {
    const matchSearch = s.id.toLowerCase().includes(search.toLowerCase()) ||
      s.carrier.toLowerCase().includes(search.toLowerCase()) ||
      s.destination.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'Todos' || s.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalInTransit = SHIPMENTS.filter((s) => s.status === 'Em trânsito').length;
  const totalOrders = SHIPMENTS.reduce((acc, s) => acc + s.orders, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestão de Embarques</h1>
          <p className="text-slate-500 text-sm mt-0.5">Controle de cargas, veículos, motoristas e datas de embarque</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 border border-slate-200 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            <Download className="w-4 h-4" />
            Exportar
          </button>
          <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
            <Plus className="w-4 h-4" />
            Novo Embarque
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Em Trânsito',       value: totalInTransit, icon: Truck,    color: 'blue'    },
          { label: 'Pedidos Embarcados', value: totalOrders,    icon: Package,  color: 'emerald' },
          { label: 'Motoristas Ativos', value: 4,              icon: Users,    color: 'purple'  },
          { label: 'Embarques Hoje',    value: 5,              icon: Calendar, color: 'amber'   },
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

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar embarque, transportadora, destino..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'Todos' | ShipStatus)}
            className="appearance-none border border-slate-200 rounded-lg px-4 py-2 pr-8 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <option value="Todos">Todos os status</option>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
        <button className="flex items-center gap-2 border border-slate-200 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
          <Filter className="w-4 h-4" />
          Mais Filtros
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3 text-left">Embarque</th>
              <th className="px-5 py-3 text-center">Pedidos</th>
              <th className="px-5 py-3 text-left">Transportadora</th>
              <th className="px-5 py-3 text-left">Motorista</th>
              <th className="px-5 py-3 text-left">Destino</th>
              <th className="px-5 py-3 text-center">Peso (kg)</th>
              <th className="px-5 py-3 text-center">Saída</th>
              <th className="px-5 py-3 text-center">ETA</th>
              <th className="px-5 py-3 text-center">Status</th>
              <th className="px-5 py-3 text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50 transition-colors cursor-pointer">
                <td className="px-5 py-3.5">
                  <div className="font-mono font-medium text-slate-800">{s.id}</div>
                  <div className="text-xs text-slate-500">{s.vehicle}</div>
                </td>
                <td className="px-5 py-3.5 text-center font-bold text-slate-700">{s.orders}</td>
                <td className="px-5 py-3.5 text-slate-700">{s.carrier}</td>
                <td className="px-5 py-3.5 text-slate-600">{s.driver}</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    {s.destination}
                  </div>
                </td>
                <td className="px-5 py-3.5 text-center text-slate-600">{s.weight.toLocaleString('pt-BR')}</td>
                <td className="px-5 py-3.5 text-center text-slate-500 text-xs">{s.departureDate}</td>
                <td className="px-5 py-3.5 text-center text-slate-600">{s.eta}</td>
                <td className="px-5 py-3.5 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[s.status]}`}>
                    {s.status}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right font-bold text-slate-800">
                  R$ {s.value.toLocaleString('pt-BR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
