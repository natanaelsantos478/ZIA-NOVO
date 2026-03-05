import { useState } from 'react';
import { Search, Plus, BadgeDollarSign, Edit2, Copy, Trash2 } from 'lucide-react';

interface FreightTable {
  id: string;
  name: string;
  carrier: string;
  type: 'Por peso' | 'Ad valorem' | 'Tabular' | 'Misto';
  zones: number;
  minWeight: number;
  maxWeight: number;
  baseRate: number;
  validity: string;
  active: boolean;
}

const TABLES: FreightTable[] = [
  { id: 'TAB-001', name: 'Jadlog Package — SP/RJ', carrier: 'Jadlog',        type: 'Por peso',  zones: 4, minWeight: 0.1,  maxWeight: 30,    baseRate: 12.50, validity: '31/12/2026', active: true  },
  { id: 'TAB-002', name: 'Total Express SP',       carrier: 'Total Express', type: 'Tabular',   zones: 6, minWeight: 0.5,  maxWeight: 100,   baseRate: 18.40, validity: '30/06/2026', active: true  },
  { id: 'TAB-003', name: 'Correios PAC Nacional',  carrier: 'Correios',      type: 'Por peso',  zones: 8, minWeight: 0.1,  maxWeight: 30,    baseRate: 8.90,  validity: '31/12/2026', active: true  },
  { id: 'TAB-004', name: 'Correios SEDEX Nacional', carrier: 'Correios',     type: 'Por peso',  zones: 8, minWeight: 0.1,  maxWeight: 30,    baseRate: 19.20, validity: '31/12/2026', active: true  },
  { id: 'TAB-005', name: 'Braspress Carga',        carrier: 'Braspress',     type: 'Ad valorem', zones: 12, minWeight: 10, maxWeight: 5_000, baseRate: 4.20,  validity: '31/12/2026', active: true  },
  { id: 'TAB-006', name: 'Frota Própria SP',       carrier: 'Frota Própria', type: 'Por peso',  zones: 3, minWeight: 0.1,  maxWeight: 1_500, baseRate: 6.80,  validity: '31/12/2026', active: true  },
  { id: 'TAB-007', name: 'Jadlog Package — Antigo', carrier: 'Jadlog',       type: 'Por peso',  zones: 4, minWeight: 0.1,  maxWeight: 30,    baseRate: 13.20, validity: '31/12/2025', active: false },
];

const TYPE_BADGE: Record<string, string> = {
  'Por peso':  'bg-blue-50 text-blue-700',
  'Ad valorem': 'bg-amber-50 text-amber-700',
  'Tabular':   'bg-purple-50 text-purple-700',
  'Misto':     'bg-teal-50 text-teal-700',
};

export default function FreightTables() {
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const filtered = TABLES.filter((t) => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) || t.carrier.toLowerCase().includes(search.toLowerCase());
    const matchActive = showInactive || t.active;
    return matchSearch && matchActive;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tabelas de Frete</h1>
          <p className="text-slate-500 text-sm mt-0.5">Cadastro de tabelas por transportadora, zona, peso e tipo de carga</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="rounded" />
            Mostrar inativas
          </label>
          <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
            <Plus className="w-4 h-4" />
            Nova Tabela
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Tabelas Ativas',       value: TABLES.filter((t) => t.active).length, icon: BadgeDollarSign, color: 'emerald' },
          { label: 'Transportadoras',      value: new Set(TABLES.map((t) => t.carrier)).size, icon: BadgeDollarSign, color: 'blue' },
          { label: 'Vencendo em 90d',      value: 1, icon: BadgeDollarSign, color: 'amber' },
          { label: 'Tabelas Desativadas',  value: TABLES.filter((t) => !t.active).length, icon: BadgeDollarSign, color: 'slate' },
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
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar tabela ou transportadora..." className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3 text-left">Nome da Tabela</th>
              <th className="px-5 py-3 text-left">Transportadora</th>
              <th className="px-5 py-3 text-center">Tipo</th>
              <th className="px-5 py-3 text-center">Zonas</th>
              <th className="px-5 py-3 text-center">Peso (kg)</th>
              <th className="px-5 py-3 text-right">Tarifa base</th>
              <th className="px-5 py-3 text-center">Vigência</th>
              <th className="px-5 py-3 text-center">Status</th>
              <th className="px-5 py-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((t) => (
              <tr key={t.id} className={`hover:bg-slate-50 transition-colors ${!t.active ? 'opacity-60' : ''}`}>
                <td className="px-5 py-3.5 font-medium text-slate-800">{t.name}</td>
                <td className="px-5 py-3.5 text-slate-600">{t.carrier}</td>
                <td className="px-5 py-3.5 text-center">
                  <span className={`px-2 py-0.5 rounded text-xs ${TYPE_BADGE[t.type]}`}>{t.type}</span>
                </td>
                <td className="px-5 py-3.5 text-center text-slate-600">{t.zones}</td>
                <td className="px-5 py-3.5 text-center text-slate-500 text-xs">{t.minWeight} – {t.maxWeight} kg</td>
                <td className="px-5 py-3.5 text-right font-bold text-slate-800">R$ {t.baseRate.toFixed(2)}</td>
                <td className="px-5 py-3.5 text-center text-xs text-slate-500">{t.validity}</td>
                <td className="px-5 py-3.5 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${t.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {t.active ? 'Ativa' : 'Inativa'}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button className="text-slate-400 hover:text-slate-700"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button className="text-slate-400 hover:text-slate-700"><Copy className="w-3.5 h-3.5" /></button>
                    <button className="text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
