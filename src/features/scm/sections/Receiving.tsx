import { useState } from 'react';
import { Search, Plus, ClipboardList, CheckCircle2, Clock, AlertTriangle, Camera, Download } from 'lucide-react';

type ReceivingStatus = 'Aguardando' | 'Em conferência' | 'Conferido' | 'Com divergência' | 'Finalizado';

interface ReceivingEntry {
  id: string;
  nfe: string;
  supplier: string;
  items: number;
  expectedWeight: number;
  receivedWeight: number;
  status: ReceivingStatus;
  arrivedAt: string;
  dock: string;
  operator: string;
  hasPhoto: boolean;
}

const ENTRIES: ReceivingEntry[] = [
  { id: 'REC-2841', nfe: 'NF-e 012.841', supplier: 'Distribuidora Norte',  items: 48, expectedWeight: 320, receivedWeight: 318, status: 'Conferido',       arrivedAt: '05/03 08:14', dock: 'Doca 01', operator: 'Marcos T', hasPhoto: true  },
  { id: 'REC-2840', nfe: 'NF-e 012.838', supplier: 'Fornecedor Alpha',     items: 120, expectedWeight: 840, receivedWeight: 840, status: 'Em conferência',  arrivedAt: '05/03 09:30', dock: 'Doca 03', operator: 'Joana S', hasPhoto: false },
  { id: 'REC-2839', nfe: 'NF-e 012.835', supplier: 'Industria Beta',       items: 30, expectedWeight: 150, receivedWeight: 148, status: 'Com divergência', arrivedAt: '05/03 10:05', dock: 'Doca 02', operator: 'Pedro A', hasPhoto: true  },
  { id: 'REC-2838', nfe: 'NF-e 012.831', supplier: 'Importadora Delta',    items: 8,  expectedWeight: 45,  receivedWeight: 45,  status: 'Finalizado',      arrivedAt: '04/03 14:20', dock: 'Doca 01', operator: 'Marcos T', hasPhoto: true  },
  { id: 'REC-2837', nfe: 'NF-e 012.829', supplier: 'Atacado Regional',     items: 200, expectedWeight: 1200, receivedWeight: 0, status: 'Aguardando',     arrivedAt: '05/03 11:45', dock: 'Doca 04', operator: '—',       hasPhoto: false },
];

const STATUS_BADGE: Record<ReceivingStatus, string> = {
  'Aguardando':      'bg-slate-100 text-slate-500',
  'Em conferência':  'bg-blue-100 text-blue-700',
  'Conferido':       'bg-emerald-100 text-emerald-700',
  'Com divergência': 'bg-red-100 text-red-700',
  'Finalizado':      'bg-teal-100 text-teal-700',
};

export default function Receiving() {
  const [search, setSearch] = useState('');

  const filtered = ENTRIES.filter((e) =>
    e.id.toLowerCase().includes(search.toLowerCase()) ||
    e.supplier.toLowerCase().includes(search.toLowerCase()) ||
    e.nfe.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Recebimento de Mercadorias</h1>
          <p className="text-slate-500 text-sm mt-0.5">Entrada por NF-e, conferência física e registro de avarias</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 border border-slate-200 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            <Download className="w-4 h-4" />
            Exportar
          </button>
          <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
            <Plus className="w-4 h-4" />
            Novo Recebimento
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Aguardando',      value: ENTRIES.filter((e) => e.status === 'Aguardando').length,      icon: Clock,         color: 'slate'   },
          { label: 'Em Conferência',  value: ENTRIES.filter((e) => e.status === 'Em conferência').length,  icon: ClipboardList, color: 'blue'    },
          { label: 'Com Divergência', value: ENTRIES.filter((e) => e.status === 'Com divergência').length, icon: AlertTriangle, color: 'red'     },
          { label: 'Finalizados Hoje', value: ENTRIES.filter((e) => e.status === 'Finalizado').length,     icon: CheckCircle2,  color: 'emerald' },
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
          placeholder="Buscar recebimento, NF-e, fornecedor..."
          className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3 text-left">Recebimento</th>
              <th className="px-5 py-3 text-left">Fornecedor</th>
              <th className="px-5 py-3 text-center">Itens</th>
              <th className="px-5 py-3 text-center">Peso Prev.</th>
              <th className="px-5 py-3 text-center">Peso Rec.</th>
              <th className="px-5 py-3 text-left">Doca</th>
              <th className="px-5 py-3 text-left">Operador</th>
              <th className="px-5 py-3 text-center">Chegada</th>
              <th className="px-5 py-3 text-center">Foto</th>
              <th className="px-5 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((entry) => (
              <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="font-mono font-medium text-slate-800">{entry.id}</div>
                  <div className="text-xs text-slate-500">{entry.nfe}</div>
                </td>
                <td className="px-5 py-3.5 text-slate-700">{entry.supplier}</td>
                <td className="px-5 py-3.5 text-center font-bold text-slate-700">{entry.items}</td>
                <td className="px-5 py-3.5 text-center text-slate-600">{entry.expectedWeight} kg</td>
                <td className="px-5 py-3.5 text-center">
                  <span className={`font-medium ${entry.receivedWeight === 0 ? 'text-slate-400' : Math.abs(entry.receivedWeight - entry.expectedWeight) > 2 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {entry.receivedWeight === 0 ? '—' : `${entry.receivedWeight} kg`}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-slate-600">{entry.dock}</td>
                <td className="px-5 py-3.5 text-slate-600">{entry.operator}</td>
                <td className="px-5 py-3.5 text-center text-xs text-slate-500">{entry.arrivedAt}</td>
                <td className="px-5 py-3.5 text-center">
                  {entry.hasPhoto ? (
                    <Camera className="w-4 h-4 text-emerald-500 mx-auto" />
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[entry.status]}`}>
                    {entry.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
