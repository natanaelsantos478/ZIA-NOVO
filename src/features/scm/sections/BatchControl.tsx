import { useState } from 'react';
import { Search, Plus, Layers, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';

type BatchStatus = 'Disponível' | 'Em quarentena' | 'Vencido' | 'Reservado';
type RotationMethod = 'FIFO' | 'FEFO' | 'LIFO';

interface Batch {
  id: string;
  sku: string;
  product: string;
  lot: string;
  series?: string;
  qty: number;
  unit: string;
  mfgDate: string;
  expDate?: string;
  daysToExp?: number;
  status: BatchStatus;
  rotation: RotationMethod;
  address: string;
  supplier: string;
}

const BATCHES: Batch[] = [
  { id: 'LT-4821', sku: 'SKU-5501', product: 'Insulina Glargina 100UI/mL', lot: 'LOT-2026-03-A', qty: 500,   unit: 'cx',  mfgDate: '15/01/2026', expDate: '15/01/2027', daysToExp: 316, status: 'Disponível',  rotation: 'FEFO', address: 'D-01-01-1', supplier: 'Farmacêutica Nacional' },
  { id: 'LT-4820', sku: 'SKU-5510', product: 'Sorvete Premium Creme 2L',   lot: 'LOT-2026-02-B', qty: 120,   unit: 'un',  mfgDate: '01/02/2026', expDate: '01/08/2026', daysToExp: 149, status: 'Disponível',  rotation: 'FEFO', address: 'D-01-02-1', supplier: 'Laticínios do Sul'    },
  { id: 'LT-4819', sku: 'SKU-8801', product: 'Solvente Industrial 5L',     lot: 'LOT-2025-11-C', qty: 40,    unit: 'un',  mfgDate: '10/11/2025', expDate: '10/11/2026', daysToExp: 250, status: 'Disponível',  rotation: 'FIFO', address: 'E-01-01-1', supplier: 'Química Brasil'       },
  { id: 'LT-4818', sku: 'SKU-4001', product: 'Leite Integral UHT 1L',      lot: 'LOT-2026-01-A', qty: 200,   unit: 'cx',  mfgDate: '20/01/2026', expDate: '20/04/2026', daysToExp: 46,  status: 'Reservado',   rotation: 'FEFO', address: 'A-03-01-1', supplier: 'Laticínios Norte'     },
  { id: 'LT-4817', sku: 'SKU-4002', product: 'Iogurte Natural 170g',       lot: 'LOT-2026-02-C', qty: 48,    unit: 'cx',  mfgDate: '01/03/2026', expDate: '25/03/2026', daysToExp: 20,  status: 'Em quarentena', rotation: 'FEFO', address: 'D-02-01-1', supplier: 'Laticínios do Sul' },
  { id: 'LT-4816', sku: 'SKU-4003', product: 'Suco de Laranja 1L',         lot: 'LOT-2025-09-B', qty: 12,    unit: 'cx',  mfgDate: '15/09/2025', expDate: '01/03/2026', daysToExp: -4,  status: 'Vencido',     rotation: 'FEFO', address: 'A-04-01-1', supplier: 'Frutas do Cerrado'    },
  { id: 'LT-4815', sku: 'SKU-9001', product: 'iPhone 15 Pro 256GB',        lot: 'LOT-2025-10-A', series: 'SN:A12B34C56D78', qty: 8, unit: 'un', mfgDate: '01/10/2025', status: 'Disponível', rotation: 'FIFO', address: 'C-01-01-1', supplier: 'Apple Brasil' },
];

const STATUS_BADGE: Record<BatchStatus, string> = {
  'Disponível':    'bg-emerald-100 text-emerald-700',
  'Em quarentena': 'bg-amber-100 text-amber-700',
  'Vencido':       'bg-red-100 text-red-700',
  'Reservado':     'bg-blue-100 text-blue-700',
};

const ROTATION_BADGE: Record<RotationMethod, string> = {
  'FIFO': 'bg-slate-100 text-slate-600',
  'FEFO': 'bg-teal-50 text-teal-700',
  'LIFO': 'bg-purple-50 text-purple-700',
};

export default function BatchControl() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');

  const STATUSES = ['Todos', 'Disponível', 'Reservado', 'Em quarentena', 'Vencido'];

  const filtered = BATCHES.filter((b) => {
    const matchSearch = b.id.toLowerCase().includes(search.toLowerCase()) ||
      b.product.toLowerCase().includes(search.toLowerCase()) ||
      b.lot.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'Todos' || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const expiringCount = BATCHES.filter((b) => b.daysToExp !== undefined && b.daysToExp >= 0 && b.daysToExp <= 30).length;
  const expiredCount = BATCHES.filter((b) => b.status === 'Vencido').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Lotes e Validades</h1>
          <p className="text-slate-500 text-sm mt-0.5">Controle de FIFO, FEFO, LIFO — rastreabilidade completa por lote</p>
        </div>
        <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
          <Plus className="w-4 h-4" />
          Novo Lote
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total de Lotes',     value: BATCHES.length,   icon: Layers,        color: 'blue'    },
          { label: 'Vencendo em 30d',    value: expiringCount,    icon: Clock,         color: 'amber'   },
          { label: 'Vencidos',           value: expiredCount,     icon: AlertTriangle, color: 'red'     },
          { label: 'Em Quarentena',      value: BATCHES.filter((b) => b.status === 'Em quarentena').length, icon: CheckCircle2, color: 'orange' },
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
            placeholder="Buscar lote, produto ou SKU..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === s ? 'bg-emerald-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3 text-left">Lote</th>
              <th className="px-5 py-3 text-left">Produto</th>
              <th className="px-5 py-3 text-center">Método</th>
              <th className="px-5 py-3 text-center">Qtd</th>
              <th className="px-5 py-3 text-center">Fabricação</th>
              <th className="px-5 py-3 text-center">Validade</th>
              <th className="px-5 py-3 text-center">Dias restantes</th>
              <th className="px-5 py-3 text-left">Endereço</th>
              <th className="px-5 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((b) => (
              <tr key={b.id} className={`hover:bg-slate-50 transition-colors ${b.status === 'Vencido' ? 'bg-red-50/30' : ''}`}>
                <td className="px-5 py-3.5">
                  <div className="font-mono text-xs font-bold text-slate-700">{b.lot}</div>
                  {b.series && <div className="text-xs text-slate-400 mt-0.5">{b.series}</div>}
                </td>
                <td className="px-5 py-3.5">
                  <div className="text-slate-800 font-medium">{b.product}</div>
                  <div className="text-xs text-slate-500">{b.sku}</div>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${ROTATION_BADGE[b.rotation]}`}>{b.rotation}</span>
                </td>
                <td className="px-5 py-3.5 text-center font-bold text-slate-700">{b.qty} {b.unit}</td>
                <td className="px-5 py-3.5 text-center text-xs text-slate-500">{b.mfgDate}</td>
                <td className="px-5 py-3.5 text-center text-xs text-slate-500">{b.expDate ?? '—'}</td>
                <td className="px-5 py-3.5 text-center">
                  {b.daysToExp !== undefined ? (
                    <span className={`text-sm font-bold ${b.daysToExp < 0 ? 'text-red-600' : b.daysToExp <= 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {b.daysToExp < 0 ? `${Math.abs(b.daysToExp)}d vencido` : `${b.daysToExp}d`}
                    </span>
                  ) : <span className="text-slate-400">—</span>}
                </td>
                <td className="px-5 py-3.5 font-mono text-xs text-slate-600">{b.address}</td>
                <td className="px-5 py-3.5 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[b.status]}`}>{b.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
