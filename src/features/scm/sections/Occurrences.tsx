import { useState } from 'react';
import { Search, Plus, AlertTriangle, CheckCircle2, Clock, X, Filter, Download } from 'lucide-react';

type OccType = 'Avaria' | 'Extravio' | 'Atraso' | 'Tentativa de entrega' | 'Recusa' | 'Endereço incorreto';
type OccStatus = 'Aberta' | 'Em análise' | 'Resolvida' | 'Encerrada';
type OccPriority = 'Crítica' | 'Alta' | 'Média' | 'Baixa';

interface Occurrence {
  id: string;
  type: OccType;
  shipment: string;
  carrier: string;
  recipient: string;
  description: string;
  status: OccStatus;
  priority: OccPriority;
  openedAt: string;
  resolvedAt?: string;
  responsible: string;
}

const OCCS: Occurrence[] = [
  { id: 'OCC-1841', type: 'Avaria',               shipment: 'EMB-9236', carrier: 'Sequoia',       recipient: 'Atacado Minas',   description: 'Caixas amassadas — produto danificado durante transporte',     status: 'Em análise', priority: 'Crítica', openedAt: '03/03/2026', responsible: 'Ana Paula' },
  { id: 'OCC-1840', type: 'Extravio',              shipment: 'EMB-9240', carrier: 'Jadlog',        recipient: 'Tech SP',         description: 'Nota fiscal 012.840 não localizada no CD destino',             status: 'Aberta',     priority: 'Crítica', openedAt: '05/03/2026', responsible: 'Carlos Ops' },
  { id: 'OCC-1839', type: 'Atraso',               shipment: 'EMB-9237', carrier: 'Correios',      recipient: 'Varejo Norte',    description: 'Previsão SLA 3d — entregue com 6d',                           status: 'Resolvida',  priority: 'Média',   openedAt: '02/03/2026', resolvedAt: '05/03/2026', responsible: 'Fernanda M' },
  { id: 'OCC-1838', type: 'Tentativa de entrega', shipment: 'EMB-9235', carrier: 'Correios',      recipient: 'João Santos',     description: 'Três tentativas de entrega — destinatário ausente',           status: 'Em análise', priority: 'Alta',    openedAt: '04/03/2026', responsible: 'Roberto L' },
  { id: 'OCC-1837', type: 'Recusa',               shipment: 'EMB-9234', carrier: 'Total Express', recipient: 'Supermercado BH', description: 'Destinatário recusou entrega por divergência no pedido',       status: 'Aberta',     priority: 'Alta',    openedAt: '04/03/2026', responsible: 'Ana Paula' },
  { id: 'OCC-1836', type: 'Endereço incorreto',   shipment: 'EMB-9233', carrier: 'Jadlog',        recipient: 'Distribuidora X', description: 'CEP incorreto na NF — entrega devolvida para CD',             status: 'Encerrada',  priority: 'Baixa',   openedAt: '01/03/2026', resolvedAt: '03/03/2026', responsible: 'Carlos Ops' },
];

const STATUS_BADGE: Record<OccStatus, string> = {
  'Aberta':     'bg-red-100 text-red-700',
  'Em análise': 'bg-amber-100 text-amber-700',
  'Resolvida':  'bg-emerald-100 text-emerald-700',
  'Encerrada':  'bg-slate-100 text-slate-500',
};

const PRIORITY_BADGE: Record<OccPriority, string> = {
  'Crítica': 'bg-red-600 text-white',
  'Alta':    'bg-orange-500 text-white',
  'Média':   'bg-amber-400 text-white',
  'Baixa':   'bg-slate-400 text-white',
};

const TYPE_ICON: Record<OccType, string> = {
  'Avaria':               '💥',
  'Extravio':             '❓',
  'Atraso':               '⏰',
  'Tentativa de entrega': '🔔',
  'Recusa':               '✋',
  'Endereço incorreto':   '📍',
};

export default function Occurrences() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | OccStatus>('Todos');

  const STATUSES: OccStatus[] = ['Aberta', 'Em análise', 'Resolvida', 'Encerrada'];

  const filtered = OCCS.filter((o) => {
    const matchSearch = o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.type.toLowerCase().includes(search.toLowerCase()) ||
      o.carrier.toLowerCase().includes(search.toLowerCase()) ||
      o.recipient.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'Todos' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const openCount = OCCS.filter((o) => o.status === 'Aberta').length;
  const criticalCount = OCCS.filter((o) => o.priority === 'Crítica' && o.status !== 'Encerrada').length;
  const resolvedToday = OCCS.filter((o) => o.resolvedAt === '05/03/2026').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Controle de Ocorrências</h1>
          <p className="text-slate-500 text-sm mt-0.5">Avarias, extravios, atrasos e recusas com fluxo de resolução</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 border border-slate-200 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            <Download className="w-4 h-4" />
            Exportar
          </button>
          <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
            <Plus className="w-4 h-4" />
            Registrar Ocorrência
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Abertas',        value: openCount,     icon: AlertTriangle, color: 'red'     },
          { label: 'Críticas',       value: criticalCount, icon: X,             color: 'rose'    },
          { label: 'Em Análise',     value: 2,             icon: Clock,         color: 'amber'   },
          { label: 'Resolvidas Hoje', value: resolvedToday, icon: CheckCircle2, color: 'emerald' },
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
            placeholder="Buscar por ID, tipo, transportadora..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
        {(['Todos', ...STATUSES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s as 'Todos' | OccStatus)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === s
                ? 'bg-emerald-600 text-white'
                : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {s}
          </button>
        ))}
        <button className="flex items-center gap-2 border border-slate-200 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors ml-auto">
          <Filter className="w-4 h-4" />
          Filtros
        </button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.map((occ) => (
          <div key={occ.id} className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm hover:border-slate-200 transition-colors">
            <div className="flex items-start gap-4">
              <div className="text-2xl flex-shrink-0">{TYPE_ICON[occ.type]}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-mono text-sm font-bold text-slate-700">{occ.id}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${PRIORITY_BADGE[occ.priority]}`}>
                    {occ.priority}
                  </span>
                  <span className="text-sm font-medium text-slate-800">{occ.type}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ml-auto ${STATUS_BADGE[occ.status]}`}>
                    {occ.status}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-1.5">{occ.description}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 flex-wrap">
                  <span>Embarque: <span className="font-medium text-slate-700">{occ.shipment}</span></span>
                  <span>Transportadora: <span className="font-medium text-slate-700">{occ.carrier}</span></span>
                  <span>Destinatário: <span className="font-medium text-slate-700">{occ.recipient}</span></span>
                  <span>Responsável: <span className="font-medium text-slate-700">{occ.responsible}</span></span>
                  <span>Abertura: {occ.openedAt}</span>
                  {occ.resolvedAt && <span className="text-emerald-600">Resolvida: {occ.resolvedAt}</span>}
                </div>
              </div>
              <div className="flex-shrink-0 flex gap-2">
                <button className="text-xs border border-slate-200 px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">Detalhes</button>
                {occ.status === 'Aberta' && (
                  <button className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors">Atender</button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
