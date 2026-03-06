import { Plane, Battery, MapPin, Clock, Wifi } from 'lucide-react';

// Integração com Drones — dados mock enquanto integração com APIs de drones não está disponível
// Candidatos: Wing (Google), Zipline API, DJI Cloud API, ANAC regulamentação

const MOCK_DRONES = [
  { id: 'DR-001', model: 'DJI Matrice 300', status: 'idle',      battery: 98, location: 'Base Central',          lastMission: '2h atrás'  },
  { id: 'DR-002', model: 'DJI Matrice 300', status: 'in_flight', battery: 62, location: 'Em rota — Zona Sul',    lastMission: 'Agora'     },
  { id: 'DR-003', model: 'Zipline P2',      status: 'charging',  battery: 34, location: 'Base Central',          lastMission: '45min atrás' },
  { id: 'DR-004', model: 'Zipline P2',      status: 'idle',      battery: 100,location: 'Base Norte',            lastMission: '3h atrás'  },
];

const MOCK_MISSIONS = [
  { id: 'M001', drone: 'DR-002', type: 'Entrega',   destination: 'Av. Paulista, 1000', status: 'in_flight', eta: '12 min' },
  { id: 'M002', drone: 'DR-001', type: 'Inspeção',  destination: 'Depósito Norte',     status: 'scheduled', eta: '30 min' },
  { id: 'M003', drone: 'DR-004', type: 'Entrega',   destination: 'Rua da Paz, 250',   status: 'scheduled', eta: '1h 15min' },
];

const STATUS_DRONE: Record<string, { label: string; color: string }> = {
  idle:      { label: 'Disponível',  color: 'bg-green-100 text-green-700' },
  in_flight: { label: 'Em Voo',      color: 'bg-blue-100 text-blue-700' },
  charging:  { label: 'Carregando',  color: 'bg-amber-100 text-amber-700' },
  maintenance:{ label: 'Manutenção', color: 'bg-rose-100 text-rose-700' },
};

const STATUS_MISSION: Record<string, string> = {
  in_flight:  'bg-blue-100 text-blue-700',
  scheduled:  'bg-amber-100 text-amber-700',
  completed:  'bg-green-100 text-green-700',
  cancelled:  'bg-slate-100 text-slate-500',
};

export default function Drone() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Integração com Drones</h2>
        <p className="text-sm text-slate-500">Gerenciamento de frota de drones para entregas e inspeções</p>
      </div>

      <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 text-sm text-violet-700 flex items-center gap-3">
        <Plane className="w-5 h-5 flex-shrink-0" />
        <span>
          Integração com APIs de drones em desenvolvimento (DJI Cloud / Zipline). Regulamentação ANAC em andamento. Os dados abaixo são ilustrativos.
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Drones Ativos',    value: MOCK_DRONES.filter((d) => d.status !== 'maintenance').length, icon: Plane,  color: 'text-violet-600 bg-violet-50' },
          { label: 'Em Voo Agora',     value: MOCK_DRONES.filter((d) => d.status === 'in_flight').length,  icon: Wifi,   color: 'text-blue-600 bg-blue-50' },
          { label: 'Missões Hoje',     value: MOCK_MISSIONS.length,                                         icon: MapPin, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Bateria Média',    value: `${Math.round(MOCK_DRONES.reduce((s, d) => s + d.battery, 0) / MOCK_DRONES.length)}%`, icon: Battery, color: 'text-amber-600 bg-amber-50' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className={`w-8 h-8 ${kpi.color} rounded-lg flex items-center justify-center mb-2`}>
              <kpi.icon className="w-4 h-4" />
            </div>
            <p className="text-xs text-slate-500">{kpi.label}</p>
            <p className="text-2xl font-bold text-slate-800">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Drones */}
      <div>
        <h3 className="font-semibold text-slate-700 mb-3">Frota de Drones</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {MOCK_DRONES.map((d) => (
            <div key={d.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${STATUS_DRONE[d.status]?.color ?? ''} flex items-center justify-center`}>
                <Plane className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-800">{d.id}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_DRONE[d.status]?.color ?? ''}`}>
                    {STATUS_DRONE[d.status]?.label ?? d.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{d.model}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {d.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {d.lastMission}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 justify-end">
                  <Battery className={`w-4 h-4 ${d.battery > 50 ? 'text-green-500' : d.battery > 20 ? 'text-amber-500' : 'text-red-500'}`} />
                  <span className="text-sm font-bold text-slate-700">{d.battery}%</span>
                </div>
                <div className="w-16 bg-slate-100 rounded-full h-1.5 mt-1">
                  <div
                    className={`h-1.5 rounded-full ${d.battery > 50 ? 'bg-green-500' : d.battery > 20 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${d.battery}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Missions */}
      <div>
        <h3 className="font-semibold text-slate-700 mb-3">Missões Programadas</h3>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Missão', 'Drone', 'Tipo', 'Destino', 'ETA', 'Status'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MOCK_MISSIONS.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-semibold text-slate-800">{m.id}</td>
                  <td className="px-4 py-3 text-slate-600">{m.drone}</td>
                  <td className="px-4 py-3 text-slate-600">{m.type}</td>
                  <td className="px-4 py-3 text-slate-600 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> {m.destination}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{m.eta}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_MISSION[m.status] ?? ''}`}>
                      {m.status === 'in_flight' ? 'Em Voo' : m.status === 'scheduled' ? 'Agendado' : m.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
