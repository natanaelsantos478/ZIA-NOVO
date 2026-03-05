import { useState } from 'react';
import { Search, Plus, Warehouse, Package, BarChart2, AlertTriangle } from 'lucide-react';

type ZoneType = 'Seco' | 'Refrigerado' | 'Congelado' | 'Químicos' | 'Frágeis' | 'Alto Valor';

interface Address {
  code: string;
  corridor: string;
  shelf: string;
  position: number;
  zone: ZoneType;
  sku: string;
  product: string;
  qty: number;
  maxQty: number;
  weight: number;
  lastMovement: string;
}

const ADDRESSES: Address[] = [
  { code: 'A-01-01-1', corridor: 'A', shelf: '01', position: 1, zone: 'Seco',       sku: 'SKU-4821', product: 'Notebook Dell i5 15"',    qty: 12,  maxQty: 20,  weight: 36.0,  lastMovement: '05/03' },
  { code: 'A-01-02-1', corridor: 'A', shelf: '01', position: 2, zone: 'Seco',       sku: 'SKU-4822', product: 'Smartphone Samsung A54',   qty: 45,  maxQty: 60,  weight: 27.0,  lastMovement: '05/03' },
  { code: 'A-02-01-1', corridor: 'A', shelf: '02', position: 1, zone: 'Seco',       sku: 'SKU-3104', product: 'Tênis Nike Air Max 42',     qty: 30,  maxQty: 40,  weight: 18.0,  lastMovement: '04/03' },
  { code: 'B-01-01-1', corridor: 'B', shelf: '01', position: 1, zone: 'Frágeis',    sku: 'SKU-7291', product: 'Smart TV 50" LG',          qty: 5,   maxQty: 8,   weight: 55.0,  lastMovement: '03/03' },
  { code: 'B-01-02-1', corridor: 'B', shelf: '01', position: 2, zone: 'Frágeis',    sku: 'SKU-7292', product: 'Monitor 27" Dell',         qty: 18,  maxQty: 24,  weight: 90.0,  lastMovement: '05/03' },
  { code: 'C-01-01-1', corridor: 'C', shelf: '01', position: 1, zone: 'Alto Valor', sku: 'SKU-9001', product: 'iPhone 15 Pro 256GB',      qty: 8,   maxQty: 10,  weight: 1.36,  lastMovement: '05/03' },
  { code: 'C-01-01-2', corridor: 'C', shelf: '01', position: 2, zone: 'Alto Valor', sku: 'SKU-9002', product: 'Apple Watch Series 9',     qty: 15,  maxQty: 20,  weight: 1.5,   lastMovement: '04/03' },
  { code: 'D-01-01-1', corridor: 'D', shelf: '01', position: 1, zone: 'Refrigerado', sku: 'SKU-5501', product: 'Insulina — cx 30un',      qty: 200, maxQty: 300, weight: 6.0,   lastMovement: '05/03' },
  { code: 'D-01-02-1', corridor: 'D', shelf: '01', position: 2, zone: 'Congelado',  sku: 'SKU-5510', product: 'Sorvete Premium 2L',       qty: 80,  maxQty: 100, weight: 80.0,  lastMovement: '05/03' },
  { code: 'E-01-01-1', corridor: 'E', shelf: '01', position: 1, zone: 'Químicos',   sku: 'SKU-8801', product: 'Solvente Industrial 5L',   qty: 40,  maxQty: 50,  weight: 200.0, lastMovement: '02/03' },
];

const ZONE_BADGE: Record<ZoneType, string> = {
  'Seco':       'bg-amber-50 text-amber-700',
  'Refrigerado': 'bg-blue-50 text-blue-700',
  'Congelado':  'bg-cyan-50 text-cyan-700',
  'Químicos':   'bg-red-50 text-red-700',
  'Frágeis':    'bg-orange-50 text-orange-700',
  'Alto Valor': 'bg-purple-50 text-purple-700',
};

const CORRIDORS = ['Todos', 'A', 'B', 'C', 'D', 'E'];
const ZONES: ZoneType[] = ['Seco', 'Refrigerado', 'Congelado', 'Químicos', 'Frágeis', 'Alto Valor'];

export default function StockAddressing() {
  const [search, setSearch] = useState('');
  const [corridorFilter, setCorridorFilter] = useState('Todos');
  const [zoneFilter, setZoneFilter] = useState('Todos');

  const filtered = ADDRESSES.filter((a) => {
    const matchSearch = a.code.toLowerCase().includes(search.toLowerCase()) ||
      a.sku.toLowerCase().includes(search.toLowerCase()) ||
      a.product.toLowerCase().includes(search.toLowerCase());
    const matchCorridor = corridorFilter === 'Todos' || a.corridor === corridorFilter;
    const matchZone = zoneFilter === 'Todos' || a.zone === zoneFilter;
    return matchSearch && matchCorridor && matchZone;
  });

  const totalSKUs = ADDRESSES.length;
  const criticalAddresses = ADDRESSES.filter((a) => a.qty / a.maxQty < 0.3).length;
  const fullAddresses = ADDRESSES.filter((a) => a.qty / a.maxQty > 0.9).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Endereçamento de Estoque</h1>
          <p className="text-slate-500 text-sm mt-0.5">Posições, prateleiras, corredores e zonas por tipo de produto</p>
        </div>
        <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
          <Plus className="w-4 h-4" />
          Novo Endereço
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Endereços Ocupados', value: totalSKUs, icon: Warehouse,    color: 'emerald' },
          { label: 'SKUs Armazenados',   value: totalSKUs, icon: Package,      color: 'blue'    },
          { label: 'Estoque Crítico',    value: criticalAddresses, icon: AlertTriangle, color: 'amber' },
          { label: 'Endereços Cheios',   value: fullAddresses, icon: BarChart2, color: 'red' },
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
            placeholder="Buscar endereço, SKU ou produto..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Corredor:</span>
          {CORRIDORS.map((c) => (
            <button
              key={c}
              onClick={() => setCorridorFilter(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${corridorFilter === c ? 'bg-emerald-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              {c}
            </button>
          ))}
        </div>
        <select
          value={zoneFilter}
          onChange={(e) => setZoneFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          <option value="Todos">Todas as zonas</option>
          {ZONES.map((z) => <option key={z}>{z}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3 text-left">Endereço</th>
              <th className="px-5 py-3 text-center">Zona</th>
              <th className="px-5 py-3 text-left">SKU</th>
              <th className="px-5 py-3 text-left">Produto</th>
              <th className="px-5 py-3 text-center">Peso Total</th>
              <th className="px-5 py-3 text-center">Ocupação</th>
              <th className="px-5 py-3 text-center">Ult. Movimento</th>
              <th className="px-5 py-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((addr) => {
              const pct = addr.qty / addr.maxQty;
              return (
                <tr key={addr.code} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5 font-mono font-bold text-slate-800">{addr.code}</td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs ${ZONE_BADGE[addr.zone]}`}>{addr.zone}</span>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{addr.sku}</td>
                  <td className="px-5 py-3.5 text-slate-800">{addr.product}</td>
                  <td className="px-5 py-3.5 text-center text-slate-600">{addr.weight.toFixed(1)} kg</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${pct > 0.9 ? 'bg-red-500' : pct < 0.3 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                          style={{ width: `${pct * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 w-16 text-right">{addr.qty}/{addr.maxQty}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-center text-xs text-slate-500">{addr.lastMovement}</td>
                  <td className="px-5 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button className="text-xs text-slate-500 hover:text-slate-800">Transferir</button>
                      <button className="text-xs text-emerald-600 hover:text-emerald-800">Detalhar</button>
                    </div>
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
