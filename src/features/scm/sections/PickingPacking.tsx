import { useState } from 'react';
import { Search, CheckSquare, Clock, User, BarChart2, Zap, ScanLine } from 'lucide-react';

type PickStatus = 'Aguardando' | 'Em separação' | 'Separado' | 'Em embalagem' | 'Pronto para embarque';

interface PickOrder {
  id: string;
  orderId: string;
  items: number;
  addresses: string[];
  operator: string;
  wave: string;
  carrier: string;
  status: PickStatus;
  priority: 'Urgente' | 'Normal' | 'Baixa';
  startedAt: string;
  dueTime: string;
  box: string;
  weight: number;
}

const PICK_ORDERS: PickOrder[] = [
  { id: 'PK-8841', orderId: 'PED-12850', items: 3,  addresses: ['A-01-01-1', 'B-01-02-1', 'C-01-01-1'], operator: 'Marcos T', wave: 'Onda 3', carrier: 'Jadlog',        status: 'Pronto para embarque', priority: 'Urgente', startedAt: '13:45', dueTime: '14:30', box: 'Caixa M',   weight: 4.2  },
  { id: 'PK-8840', orderId: 'PED-12849', items: 5,  addresses: ['A-01-02-1', 'A-02-01-1', 'E-01-01-1'], operator: 'Joana S',  wave: 'Onda 3', carrier: 'Frota Própria', status: 'Em embalagem',         priority: 'Normal',  startedAt: '13:50', dueTime: '15:00', box: 'Caixa G',   weight: 8.7  },
  { id: 'PK-8839', orderId: 'PED-12848', items: 1,  addresses: ['C-01-01-2'],                           operator: 'Pedro A',  wave: 'Onda 3', carrier: 'Total Express', status: 'Em separação',         priority: 'Urgente', startedAt: '14:00', dueTime: '14:45', box: 'Caixa P',   weight: 0.2  },
  { id: 'PK-8838', orderId: 'PED-12847', items: 8,  addresses: ['A-01-01-1', 'B-01-01-1', 'D-01-01-1'], operator: '—',        wave: 'Onda 4', carrier: 'Correios',      status: 'Aguardando',           priority: 'Normal',  startedAt: '—',     dueTime: '16:00', box: '—',        weight: 12.4 },
  { id: 'PK-8837', orderId: 'PED-12846', items: 2,  addresses: ['C-01-01-1', 'A-01-02-1'],              operator: 'Marcos T', wave: 'Onda 3', carrier: 'Jadlog',        status: 'Separado',             priority: 'Normal',  startedAt: '13:30', dueTime: '15:30', box: 'Caixa P',   weight: 1.8  },
  { id: 'PK-8836', orderId: 'PED-12845', items: 12, addresses: ['A-01-01-1', 'A-01-02-1', 'A-02-01-1'], operator: '—',        wave: 'Onda 4', carrier: 'Braspress',     status: 'Aguardando',           priority: 'Baixa',   startedAt: '—',     dueTime: '17:00', box: '—',        weight: 22.0 },
];

const STATUS_BADGE: Record<PickStatus, string> = {
  'Aguardando':            'bg-slate-100 text-slate-500',
  'Em separação':          'bg-blue-100 text-blue-700',
  'Separado':              'bg-amber-100 text-amber-700',
  'Em embalagem':          'bg-purple-100 text-purple-700',
  'Pronto para embarque':  'bg-emerald-100 text-emerald-700',
};

const PRIORITY_BADGE: Record<string, string> = {
  'Urgente': 'bg-red-100 text-red-700',
  'Normal':  'bg-slate-100 text-slate-600',
  'Baixa':   'bg-green-50 text-green-700',
};

const WAVE_COLORS: Record<string, string> = {
  'Onda 3': 'bg-indigo-50 text-indigo-700',
  'Onda 4': 'bg-pink-50 text-pink-700',
};

export default function PickingPacking() {
  const [search, setSearch] = useState('');
  const [waveFilter, setWaveFilter] = useState('Todos');

  const WAVES = ['Todos', 'Onda 3', 'Onda 4'];

  const filtered = PICK_ORDERS.filter((p) => {
    const matchSearch = p.id.toLowerCase().includes(search.toLowerCase()) ||
      p.orderId.toLowerCase().includes(search.toLowerCase()) ||
      p.operator.toLowerCase().includes(search.toLowerCase());
    const matchWave = waveFilter === 'Todos' || p.wave === waveFilter;
    return matchSearch && matchWave;
  });

  const readyCount = PICK_ORDERS.filter((p) => p.status === 'Pronto para embarque').length;
  const inProgressCount = PICK_ORDERS.filter((p) => ['Em separação', 'Separado', 'Em embalagem'].includes(p.status)).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Picking & Packing</h1>
          <p className="text-slate-500 text-sm mt-0.5">Separação de pedidos com leitura de código de barras / QR Code</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 border border-emerald-300 text-emerald-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-50 transition-colors">
            <ScanLine className="w-4 h-4" />
            Escanear
          </button>
          <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
            <Zap className="w-4 h-4" />
            Criar Onda
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Aguardando',         value: PICK_ORDERS.filter((p) => p.status === 'Aguardando').length,  icon: Clock,       color: 'slate'   },
          { label: 'Em Processo',        value: inProgressCount,  icon: User,        color: 'blue'    },
          { label: 'Prontos para Embarque', value: readyCount,    icon: CheckSquare, color: 'emerald' },
          { label: 'Produtividade/hora',  value: '28 ord/h',      icon: BarChart2,   color: 'purple'  },
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
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar picking, pedido ou operador..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
        {WAVES.map((w) => (
          <button
            key={w}
            onClick={() => setWaveFilter(w)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${waveFilter === w ? 'bg-emerald-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            {w}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3 text-left">Picking</th>
              <th className="px-5 py-3 text-left">Pedido</th>
              <th className="px-5 py-3 text-center">Itens</th>
              <th className="px-5 py-3 text-center">Onda</th>
              <th className="px-5 py-3 text-left">Operador</th>
              <th className="px-5 py-3 text-left">Transportadora</th>
              <th className="px-5 py-3 text-center">Embalagem</th>
              <th className="px-5 py-3 text-center">Peso</th>
              <th className="px-5 py-3 text-center">Prazo</th>
              <th className="px-5 py-3 text-center">Prioridade</th>
              <th className="px-5 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((pk) => (
              <tr key={pk.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3.5 font-mono font-medium text-slate-800">{pk.id}</td>
                <td className="px-5 py-3.5 text-slate-600">{pk.orderId}</td>
                <td className="px-5 py-3.5 text-center font-bold text-slate-700">{pk.items}</td>
                <td className="px-5 py-3.5 text-center">
                  <span className={`px-2 py-0.5 rounded text-xs ${WAVE_COLORS[pk.wave] ?? 'bg-slate-100 text-slate-600'}`}>{pk.wave}</span>
                </td>
                <td className="px-5 py-3.5 text-slate-700">{pk.operator}</td>
                <td className="px-5 py-3.5 text-slate-600">{pk.carrier}</td>
                <td className="px-5 py-3.5 text-center text-slate-500">{pk.box}</td>
                <td className="px-5 py-3.5 text-center text-slate-500">{pk.weight} kg</td>
                <td className="px-5 py-3.5 text-center text-slate-600">{pk.dueTime}</td>
                <td className="px-5 py-3.5 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_BADGE[pk.priority]}`}>{pk.priority}</span>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[pk.status]}`}>{pk.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
