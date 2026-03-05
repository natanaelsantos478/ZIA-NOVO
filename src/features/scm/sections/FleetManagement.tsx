import { useState } from 'react';
import { Search, Plus, Car, Wrench, AlertTriangle, CheckCircle2, Clock, FileText } from 'lucide-react';

type VehicleStatus = 'Disponível' | 'Em rota' | 'Em manutenção' | 'Inativo';

interface Vehicle {
  id: string;
  plate: string;
  model: string;
  type: string;
  year: number;
  capacity: number;
  status: VehicleStatus;
  driver?: string;
  km: number;
  lastMaintenance: string;
  nextMaintenance: string;
  insuranceExp: string;
  anttExp: string;
  fuel: number;
}

const VEHICLES: Vehicle[] = [
  { id: 'VEI-001', plate: 'GHJ-4521', model: 'VW Delivery',       type: 'Furgão',   year: 2023, capacity: 800,   status: 'Em rota',       driver: 'Carlos Silva',    km: 48_420, lastMaintenance: '20/01/2026', nextMaintenance: '20/04/2026', insuranceExp: '15/06/2026', anttExp: '30/12/2026', fuel: 72  },
  { id: 'VEI-002', plate: 'MNO-7832', model: 'Fiat Ducato',       type: 'Furgão',   year: 2022, capacity: 1_100, status: 'Em rota',       driver: 'Amanda Costa',    km: 62_100, lastMaintenance: '10/02/2026', nextMaintenance: '10/05/2026', insuranceExp: '20/08/2026', anttExp: '30/12/2026', fuel: 48  },
  { id: 'VEI-003', plate: 'KLM-3210', model: 'Mercedes Sprinter', type: 'Sprinter', year: 2021, capacity: 1_500, status: 'Em rota',       driver: 'Roberto Lima',    km: 98_320, lastMaintenance: '05/01/2026', nextMaintenance: '05/04/2026', insuranceExp: '10/05/2026', anttExp: '30/12/2026', fuel: 15  },
  { id: 'VEI-004', plate: 'PQR-5643', model: 'Renault Master',    type: 'Van',      year: 2024, capacity: 1_000, status: 'Em rota',       driver: 'Fernanda Souza',  km: 28_900, lastMaintenance: '15/02/2026', nextMaintenance: '15/05/2026', insuranceExp: '01/09/2026', anttExp: '30/12/2026', fuel: 91  },
  { id: 'VEI-005', plate: 'STU-8812', model: 'Ford Transit',      type: 'Van',      year: 2022, capacity: 1_200, status: 'Disponível',    km: 74_500, lastMaintenance: '01/03/2026', nextMaintenance: '01/06/2026', insuranceExp: '15/07/2026', anttExp: '30/12/2026', fuel: 88  },
  { id: 'VEI-006', plate: 'VWX-0041', model: 'Iveco Daily',       type: 'Caminhão', year: 2020, capacity: 3_500, status: 'Em manutenção', km: 142_800, lastMaintenance: '05/03/2026', nextMaintenance: '05/06/2026', insuranceExp: '20/03/2026', anttExp: '30/12/2026', fuel: 40  },
  { id: 'VEI-007', plate: 'YZA-3301', model: 'VW Delivery',       type: 'Furgão',   year: 2019, capacity: 800,   status: 'Inativo',       km: 198_400, lastMaintenance: '10/12/2025', nextMaintenance: '10/03/2026', insuranceExp: '01/01/2026', anttExp: '01/01/2026', fuel: 0   },
];

const STATUS_BADGE: Record<VehicleStatus, string> = {
  'Disponível':     'bg-emerald-100 text-emerald-700',
  'Em rota':        'bg-blue-100 text-blue-700',
  'Em manutenção':  'bg-amber-100 text-amber-700',
  'Inativo':        'bg-slate-100 text-slate-500',
};

export default function FleetManagement() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');

  const STATUSES: VehicleStatus[] = ['Disponível', 'Em rota', 'Em manutenção', 'Inativo'];

  const filtered = VEHICLES.filter((v) => {
    const matchSearch = v.plate.toLowerCase().includes(search.toLowerCase()) ||
      v.model.toLowerCase().includes(search.toLowerCase()) ||
      (v.driver ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'Todos' || v.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const inRouteCount = VEHICLES.filter((v) => v.status === 'Em rota').length;
  const maintenanceCount = VEHICLES.filter((v) => v.status === 'Em manutenção').length;
  const expiredDocs = VEHICLES.filter((v) => v.anttExp === '01/01/2026' || v.insuranceExp === '01/01/2026').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestão de Frota</h1>
          <p className="text-slate-500 text-sm mt-0.5">Veículos, manutenção, documentação e checklist diário</p>
        </div>
        <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
          <Plus className="w-4 h-4" />
          Cadastrar Veículo
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Em Rota',         value: inRouteCount,    icon: Car,         color: 'blue'    },
          { label: 'Disponíveis',     value: VEHICLES.filter((v) => v.status === 'Disponível').length, icon: CheckCircle2, color: 'emerald' },
          { label: 'Em Manutenção',   value: maintenanceCount, icon: Wrench,     color: 'amber'   },
          { label: 'Docs Vencidos',   value: expiredDocs,     icon: AlertTriangle, color: 'red'   },
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
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Placa, modelo ou motorista..." className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        </div>
        {(['Todos', ...STATUSES] as const).map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === s ? 'bg-emerald-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{s}</button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3 text-left">Placa / Modelo</th>
              <th className="px-5 py-3 text-left">Tipo</th>
              <th className="px-5 py-3 text-left">Motorista</th>
              <th className="px-5 py-3 text-center">Km</th>
              <th className="px-5 py-3 text-center">Combustível</th>
              <th className="px-5 py-3 text-center">Prox. Manut.</th>
              <th className="px-5 py-3 text-center">Seguro</th>
              <th className="px-5 py-3 text-center">ANTT</th>
              <th className="px-5 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((v) => {
              const isInsuranceExpired = v.insuranceExp === '01/01/2026';
              const isAnttExpired = v.anttExp === '01/01/2026';
              return (
                <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-mono font-bold text-slate-800">{v.plate}</div>
                    <div className="text-xs text-slate-500">{v.model} {v.year}</div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{v.type}</td>
                  <td className="px-5 py-3.5 text-slate-700">{v.driver ?? '—'}</td>
                  <td className="px-5 py-3.5 text-center text-slate-600">{v.km.toLocaleString('pt-BR')}</td>
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <div className="w-16 bg-slate-100 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${v.fuel < 20 ? 'bg-red-500' : v.fuel < 50 ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${v.fuel}%` }} />
                      </div>
                      <span className={`text-xs ${v.fuel < 20 ? 'text-red-600 font-bold' : 'text-slate-500'}`}>{v.fuel}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-center text-slate-500 text-xs">{v.nextMaintenance}</td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`text-xs font-medium ${isInsuranceExpired ? 'text-red-600' : 'text-slate-500'}`}>{v.insuranceExp}</span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`text-xs font-medium ${isAnttExpired ? 'text-red-600' : 'text-slate-500'}`}>{v.anttExp}</span>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[v.status]}`}>{v.status}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
