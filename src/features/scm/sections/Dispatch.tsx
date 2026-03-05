import { useState } from 'react';
import { Search, Plus, Truck, CheckCircle2, Clock, Package, ScanLine, Download } from 'lucide-react';

type DispatchStatus = 'Aguardando conferência' | 'Em conferência' | 'Lacrado' | 'Aguardando coleta' | 'Coletado';

interface DispatchItem {
  id: string;
  shipment: string;
  carrier: string;
  trackingCode?: string;
  boxes: number;
  weight: number;
  nfes: number;
  status: DispatchStatus;
  operator: string;
  scheduledPickup: string;
  destination: string;
}

const DISPATCHES: DispatchItem[] = [
  { id: 'EXP-5241', shipment: 'EMB-9241', carrier: 'Jadlog',        trackingCode: 'JD8481234BR', boxes: 12, weight: 84.5, nfes: 12, status: 'Coletado',              operator: 'Marcos T', scheduledPickup: '05/03 14:00', destination: 'Zona Sul SP' },
  { id: 'EXP-5240', shipment: 'EMB-9240', carrier: 'Frota Própria', boxes: 31, weight: 342.0, nfes: 28, status: 'Aguardando coleta',   operator: 'Pedro A',  scheduledPickup: '05/03 16:00', destination: 'ABC Paulista' },
  { id: 'EXP-5239', shipment: 'EMB-9239', carrier: 'Total Express', trackingCode: 'TE0048123',  boxes: 8,  weight: 56.0, nfes: 8,  status: 'Lacrado',               operator: 'Joana S',  scheduledPickup: '05/03 17:00', destination: 'Ribeirão Preto' },
  { id: 'EXP-5238', shipment: 'EMB-9237', carrier: 'Correios',      boxes: 5,  weight: 22.0, nfes: 5,  status: 'Em conferência',      operator: 'Marcos T', scheduledPickup: '05/03 18:00', destination: 'Interior SP' },
  { id: 'EXP-5237', shipment: 'EMB-9238', carrier: 'Braspress',     boxes: 24, weight: 840.0, nfes: 18, status: 'Aguardando conferência', operator: '—',       scheduledPickup: '06/03 06:00', destination: 'Rio de Janeiro' },
];

const STATUS_BADGE: Record<DispatchStatus, string> = {
  'Aguardando conferência': 'bg-slate-100 text-slate-500',
  'Em conferência':         'bg-blue-100 text-blue-700',
  'Lacrado':                'bg-amber-100 text-amber-700',
  'Aguardando coleta':      'bg-purple-100 text-purple-700',
  'Coletado':               'bg-emerald-100 text-emerald-700',
};

export default function Dispatch() {
  const [search, setSearch] = useState('');

  const filtered = DISPATCHES.filter((d) =>
    d.id.toLowerCase().includes(search.toLowerCase()) ||
    d.carrier.toLowerCase().includes(search.toLowerCase()) ||
    d.destination.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Expedição</h1>
          <p className="text-slate-500 text-sm mt-0.5">Conferência final, lacre, geração de etiquetas e documentos de transporte</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 border border-emerald-300 text-emerald-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-50 transition-colors">
            <ScanLine className="w-4 h-4" />
            Escanear Caixa
          </button>
          <button className="flex items-center gap-2 border border-slate-200 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            <Download className="w-4 h-4" />
            Imprimir Etiquetas
          </button>
          <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
            <Plus className="w-4 h-4" />
            Iniciar Expedição
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Aguard. Conferência', value: DISPATCHES.filter((d) => d.status === 'Aguardando conferência').length, icon: Clock,        color: 'slate'   },
          { label: 'Em Conferência',     value: DISPATCHES.filter((d) => d.status === 'Em conferência').length,         icon: Package,      color: 'blue'    },
          { label: 'Lacrados',           value: DISPATCHES.filter((d) => d.status === 'Lacrado').length,                icon: CheckCircle2, color: 'amber'   },
          { label: 'Coletados',          value: DISPATCHES.filter((d) => d.status === 'Coletado').length,               icon: Truck,        color: 'emerald' },
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

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar expedição, transportadora..."
          className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3 text-left">Expedição</th>
              <th className="px-5 py-3 text-left">Transportadora</th>
              <th className="px-5 py-3 text-left">Rastreio</th>
              <th className="px-5 py-3 text-left">Destino</th>
              <th className="px-5 py-3 text-center">Caixas</th>
              <th className="px-5 py-3 text-center">Peso</th>
              <th className="px-5 py-3 text-center">NF-es</th>
              <th className="px-5 py-3 text-center">Operador</th>
              <th className="px-5 py-3 text-center">Coleta</th>
              <th className="px-5 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((d) => (
              <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="font-mono font-medium text-slate-800">{d.id}</div>
                  <div className="text-xs text-slate-500">{d.shipment}</div>
                </td>
                <td className="px-5 py-3.5 text-slate-700">{d.carrier}</td>
                <td className="px-5 py-3.5 font-mono text-xs text-blue-600">{d.trackingCode ?? '—'}</td>
                <td className="px-5 py-3.5 text-slate-700">{d.destination}</td>
                <td className="px-5 py-3.5 text-center font-bold text-slate-700">{d.boxes}</td>
                <td className="px-5 py-3.5 text-center text-slate-600">{d.weight} kg</td>
                <td className="px-5 py-3.5 text-center text-slate-600">{d.nfes}</td>
                <td className="px-5 py-3.5 text-center text-slate-600">{d.operator}</td>
                <td className="px-5 py-3.5 text-center text-xs text-slate-500">{d.scheduledPickup}</td>
                <td className="px-5 py-3.5 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[d.status]}`}>{d.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
