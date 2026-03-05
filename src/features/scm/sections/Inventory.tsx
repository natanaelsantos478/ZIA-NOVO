import { useState } from 'react';
import { Search, Plus, CheckCircle2, Clock, AlertTriangle, RefreshCw, Download } from 'lucide-react';

type InvStatus = 'Agendado' | 'Em andamento' | 'Aguardando contagem' | 'Em análise' | 'Concluído';
type InvType = 'Geral' | 'Rotativo' | 'Cíclico' | 'Spot check';

interface InventoryJob {
  id: string;
  type: InvType;
  zone: string;
  skus: number;
  counted: number;
  divergences: number;
  operator: string;
  status: InvStatus;
  scheduledAt: string;
  accuracy: number;
}

const INVENTORIES: InventoryJob[] = [
  { id: 'INV-0841', type: 'Rotativo',    zone: 'Corredor A',   skus: 24, counted: 24, divergences: 1,  operator: 'Marcos T', status: 'Concluído',            scheduledAt: '05/03/2026', accuracy: 95.8 },
  { id: 'INV-0840', type: 'Cíclico',    zone: 'Alto Valor C', skus: 10, counted: 7,  divergences: 0,  operator: 'Pedro A',  status: 'Em andamento',         scheduledAt: '05/03/2026', accuracy: 100  },
  { id: 'INV-0839', type: 'Spot check', zone: 'Corredor B',   skus: 5,  counted: 5,  divergences: 2,  operator: 'Joana S',  status: 'Em análise',           scheduledAt: '04/03/2026', accuracy: 60.0 },
  { id: 'INV-0838', type: 'Geral',      zone: 'Armazém Completo', skus: 280, counted: 0, divergences: 0, operator: '—', status: 'Agendado',              scheduledAt: '15/03/2026', accuracy: 0    },
  { id: 'INV-0837', type: 'Rotativo',   zone: 'Corredor D',   skus: 12, counted: 12, divergences: 0,  operator: 'Marcos T', status: 'Aguardando contagem',  scheduledAt: '05/03/2026', accuracy: 0    },
];

const STATUS_BADGE: Record<InvStatus, string> = {
  'Agendado':            'bg-slate-100 text-slate-500',
  'Em andamento':        'bg-blue-100 text-blue-700',
  'Aguardando contagem': 'bg-amber-100 text-amber-700',
  'Em análise':          'bg-orange-100 text-orange-700',
  'Concluído':           'bg-emerald-100 text-emerald-700',
};

const TYPE_BADGE: Record<InvType, string> = {
  'Geral':       'bg-purple-50 text-purple-700',
  'Rotativo':    'bg-blue-50 text-blue-700',
  'Cíclico':     'bg-teal-50 text-teal-700',
  'Spot check':  'bg-orange-50 text-orange-700',
};

export default function Inventory() {
  const [search, setSearch] = useState('');

  const filtered = INVENTORIES.filter((inv) =>
    inv.id.toLowerCase().includes(search.toLowerCase()) ||
    inv.zone.toLowerCase().includes(search.toLowerCase()) ||
    inv.operator.toLowerCase().includes(search.toLowerCase())
  );

  const avgAccuracy = INVENTORIES.filter((i) => i.accuracy > 0).reduce((s, i) => s + i.accuracy, 0) /
    INVENTORIES.filter((i) => i.accuracy > 0).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inventário</h1>
          <p className="text-slate-500 text-sm mt-0.5">Inventário rotativo e cíclico — contagem sem parar a operação</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 border border-slate-200 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            <Download className="w-4 h-4" />
            Exportar
          </button>
          <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
            <Plus className="w-4 h-4" />
            Novo Inventário
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Precisão Média',   value: `${avgAccuracy.toFixed(1)}%`, icon: CheckCircle2,  color: 'emerald' },
          { label: 'Em Andamento',     value: INVENTORIES.filter((i) => i.status === 'Em andamento').length, icon: RefreshCw, color: 'blue' },
          { label: 'Divergências',     value: INVENTORIES.reduce((s, i) => s + i.divergences, 0), icon: AlertTriangle, color: 'amber' },
          { label: 'Agendados',        value: INVENTORIES.filter((i) => i.status === 'Agendado').length, icon: Clock, color: 'slate' },
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
          placeholder="Buscar inventário, zona ou operador..."
          className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {filtered.map((inv) => {
          const progress = inv.skus > 0 ? (inv.counted / inv.skus) * 100 : 0;
          return (
            <div key={inv.id} className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm hover:border-slate-200 transition-colors">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap mb-2">
                    <span className="font-mono text-sm font-bold text-slate-700">{inv.id}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${TYPE_BADGE[inv.type]}`}>{inv.type}</span>
                    <span className="text-sm font-medium text-slate-800">{inv.zone}</span>
                    <span className={`ml-auto px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[inv.status]}`}>{inv.status}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                    <span>Operador: <span className="text-slate-700">{inv.operator}</span></span>
                    <span>Agendado: {inv.scheduledAt}</span>
                    {inv.divergences > 0 && <span className="text-amber-600">⚠ {inv.divergences} divergências</span>}
                    {inv.accuracy > 0 && <span className={`font-bold ${inv.accuracy >= 98 ? 'text-emerald-600' : inv.accuracy >= 90 ? 'text-amber-600' : 'text-red-600'}`}>Precisão: {inv.accuracy}%</span>}
                  </div>
                  {inv.skus > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-slate-100 rounded-full h-2">
                        <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="text-xs text-slate-500">{inv.counted}/{inv.skus} SKUs</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button className="text-xs border border-slate-200 px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">Ver</button>
                  {['Em andamento', 'Aguardando contagem'].includes(inv.status) && (
                    <button className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors">Contar</button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
