import { useState } from 'react';
import { ArrowRightLeft, Clock, Truck, Package, CheckCircle2, AlertTriangle, Plus } from 'lucide-react';

type CDStatus = 'Aguardando chegada' | 'Chegou — triagem' | 'Em separação destino' | 'Aguardando despacho' | 'Despachado';

interface CrossDockEntry {
  id: string;
  supplier: string;
  nfe: string;
  expectedArrival: string;
  actualArrival?: string;
  items: number;
  weight: number;
  destinations: { name: string; qty: number }[];
  status: CDStatus;
  dock: string;
  targetCarrier: string;
  dispatchTime?: string;
  dwellMinutes?: number;
}

const CD_ENTRIES: CrossDockEntry[] = [
  { id: 'CD-0481', supplier: 'Distribuidor Norte', nfe: 'NF-e 083.210', expectedArrival: '05/03 08:00', actualArrival: '05/03 08:15', items: 80, weight: 450, destinations: [{ name: 'Loja SP-01', qty: 40 }, { name: 'Loja SP-02', qty: 40 }], status: 'Despachado', dock: 'CD-01', targetCarrier: 'Frota Própria', dispatchTime: '05/03 10:30', dwellMinutes: 135 },
  { id: 'CD-0480', supplier: 'Fabricante Beta', nfe: 'NF-e 044.891', expectedArrival: '05/03 09:00', actualArrival: '05/03 09:45', items: 120, weight: 680, destinations: [{ name: 'Filial Campinas', qty: 60 }, { name: 'Filial Ribeirão', qty: 60 }], status: 'Aguardando despacho', dock: 'CD-02', targetCarrier: 'Total Express', dwellMinutes: 90 },
  { id: 'CD-0479', supplier: 'Importadora Alfa', nfe: 'NF-e 012.345', expectedArrival: '05/03 10:00', actualArrival: '05/03 10:05', items: 50, weight: 200, destinations: [{ name: 'Loja SP-03', qty: 20 }, { name: 'Loja SP-04', qty: 15 }, { name: 'Loja SP-05', qty: 15 }], status: 'Em separação destino', dock: 'CD-03', targetCarrier: 'Jadlog', dwellMinutes: 40 },
  { id: 'CD-0478', supplier: 'Produtora Gamma', nfe: 'NF-e 098.412', expectedArrival: '05/03 12:00', items: 200, weight: 950, destinations: [{ name: 'CD Rio de Janeiro', qty: 200 }], status: 'Aguardando chegada', dock: 'CD-01', targetCarrier: 'Braspress' },
  { id: 'CD-0477', supplier: 'Fornecedor Delta', nfe: 'NF-e 071.009', expectedArrival: '05/03 11:00', actualArrival: '05/03 11:30', items: 30, weight: 120, destinations: [{ name: 'Filial BH', qty: 30 }], status: 'Chegou — triagem', dock: 'CD-04', targetCarrier: 'Sequoia', dwellMinutes: 25 },
];

const STATUS_BADGE: Record<CDStatus, string> = {
  'Aguardando chegada':    'bg-slate-100 text-slate-500',
  'Chegou — triagem':      'bg-blue-100 text-blue-700',
  'Em separação destino':  'bg-amber-100 text-amber-700',
  'Aguardando despacho':   'bg-purple-100 text-purple-700',
  'Despachado':            'bg-emerald-100 text-emerald-700',
};

export default function CrossDocking() {
  const [filter, setFilter] = useState('Todos');

  const STATUSES = ['Todos', 'Aguardando chegada', 'Chegou — triagem', 'Em separação destino', 'Aguardando despacho', 'Despachado'];

  const filtered = CD_ENTRIES.filter((e) => filter === 'Todos' || e.status === filter);

  const avgDwell = CD_ENTRIES.filter((e) => e.dwellMinutes !== undefined)
    .reduce((s, e) => s + (e.dwellMinutes ?? 0), 0) /
    CD_ENTRIES.filter((e) => e.dwellMinutes !== undefined).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cross-Docking</h1>
          <p className="text-slate-500 text-sm mt-0.5">Mercadoria entra e sai sem armazenagem — triagem e despacho direto</p>
        </div>
        <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
          <Plus className="w-4 h-4" />
          Nova Operação
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Operações Ativas',  value: CD_ENTRIES.filter((e) => e.status !== 'Despachado').length, icon: ArrowRightLeft, color: 'emerald' },
          { label: 'Tempo Médio Pátio', value: `${avgDwell.toFixed(0)} min`, icon: Clock,       color: 'blue'    },
          { label: 'Despachados Hoje',  value: CD_ENTRIES.filter((e) => e.status === 'Despachado').length, icon: Truck, color: 'purple'  },
          { label: 'Alertas',           value: CD_ENTRIES.filter((e) => e.status === 'Chegou — triagem').length, icon: AlertTriangle, color: 'amber' },
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

      {/* Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === s ? 'bg-emerald-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="space-y-4">
        {filtered.map((entry) => (
          <div key={entry.id} className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-slate-800">{entry.id}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[entry.status]}`}>{entry.status}</span>
                  {entry.dwellMinutes !== undefined && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${entry.dwellMinutes > 120 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      <Clock className="w-3 h-3 inline mr-1" />{entry.dwellMinutes}min pátio
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600 mt-1">{entry.supplier} — {entry.nfe}</p>
              </div>
              <div className="text-right text-xs text-slate-500">
                <div>Doca: <span className="font-medium text-slate-700">{entry.dock}</span></div>
                <div>Carrier: <span className="font-medium text-slate-700">{entry.targetCarrier}</span></div>
              </div>
            </div>

            <div className="flex items-center gap-6 mb-3 text-sm text-slate-600">
              <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5" /> {entry.items} itens</span>
              <span>{entry.weight} kg</span>
              <span>Chegada prev: {entry.expectedArrival}</span>
              {entry.actualArrival && <span className="text-emerald-600">Chegou: {entry.actualArrival}</span>}
              {entry.dispatchTime && <span className="text-purple-600">Despachado: {entry.dispatchTime}</span>}
            </div>

            {/* Destinations */}
            <div>
              <p className="text-xs text-slate-500 mb-1.5">Destinos:</p>
              <div className="flex items-center gap-2 flex-wrap">
                {entry.destinations.map((dest, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-3 py-1.5 text-xs">
                    <ArrowRightLeft className="w-3 h-3 text-emerald-500" />
                    <span className="font-medium text-slate-700">{dest.name}</span>
                    <span className="text-slate-500">({dest.qty} itens)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
