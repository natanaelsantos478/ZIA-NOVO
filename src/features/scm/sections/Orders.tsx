import { useState } from 'react';
import { Search, Plus, ShoppingCart, Clock, CheckCircle2, AlertTriangle, Filter, Download, ChevronDown } from 'lucide-react';

type OrderStatus = 'Recebido' | 'Em separação' | 'Pronto' | 'Despachado' | 'Em trânsito' | 'Entregue' | 'Cancelado';
type OrderChannel = 'Shopify' | 'VTEX' | 'Mercado Livre' | 'Magalu' | 'Manual' | 'API';

interface Order {
  id: string;
  externalId: string;
  channel: OrderChannel;
  customer: string;
  items: number;
  value: number;
  carrier: string;
  status: OrderStatus;
  slaDue: string;
  slaOk: boolean;
  createdAt: string;
  region: string;
}

const ORDERS: Order[] = [
  { id: 'PED-12855', externalId: 'MLA-987654321', channel: 'Mercado Livre', customer: 'João Alves',        items: 2, value: 1_240, carrier: 'Jadlog',        status: 'Em separação', slaDue: '06/03', slaOk: true,  createdAt: '05/03 09:15', region: 'SP' },
  { id: 'PED-12854', externalId: 'SHO-0048221',   channel: 'Shopify',       customer: 'Maria Santos',      items: 1, value: 2_850, carrier: 'Total Express', status: 'Pronto',       slaDue: '05/03', slaOk: true,  createdAt: '05/03 08:00', region: 'RJ' },
  { id: 'PED-12853', externalId: 'VTX-119820',    channel: 'VTEX',          customer: 'Pedro Oliveira',    items: 5, value: 489,   carrier: 'Correios',      status: 'Recebido',     slaDue: '08/03', slaOk: true,  createdAt: '05/03 10:30', region: 'MG' },
  { id: 'PED-12852', externalId: 'MGL-0089341',   channel: 'Magalu',        customer: 'Fernanda Lima',     items: 3, value: 720,   carrier: 'Total Express', status: 'Despachado',   slaDue: '06/03', slaOk: true,  createdAt: '04/03 14:20', region: 'BA' },
  { id: 'PED-12851', externalId: 'MLA-876543210', channel: 'Mercado Livre', customer: 'Carlos Mendes',     items: 1, value: 3_120, carrier: 'Frota Própria', status: 'Em trânsito',  slaDue: '05/03', slaOk: false, createdAt: '03/03 11:00', region: 'SP' },
  { id: 'PED-12850', externalId: 'API-00112',     channel: 'API',           customer: 'TechCorp Ltda',     items: 10, value: 8_400, carrier: 'Braspress',   status: 'Entregue',     slaDue: '04/03', slaOk: true,  createdAt: '01/03 08:00', region: 'RS' },
  { id: 'PED-12849', externalId: 'MAN-0048',      channel: 'Manual',        customer: 'Ana Costa',         items: 2, value: 195,   carrier: 'Correios',      status: 'Cancelado',    slaDue: '04/03', slaOk: false, createdAt: '02/03 16:00', region: 'SP' },
];

const STATUS_BADGE: Record<OrderStatus, string> = {
  'Recebido':    'bg-blue-100 text-blue-700',
  'Em separação': 'bg-amber-100 text-amber-700',
  'Pronto':      'bg-purple-100 text-purple-700',
  'Despachado':  'bg-indigo-100 text-indigo-700',
  'Em trânsito': 'bg-sky-100 text-sky-700',
  'Entregue':    'bg-emerald-100 text-emerald-700',
  'Cancelado':   'bg-red-100 text-red-700',
};

const CHANNEL_BADGE: Record<OrderChannel, string> = {
  'Shopify':      'bg-green-100 text-green-800',
  'VTEX':         'bg-pink-100 text-pink-800',
  'Mercado Livre': 'bg-yellow-100 text-yellow-800',
  'Magalu':       'bg-blue-100 text-blue-800',
  'Manual':       'bg-slate-100 text-slate-600',
  'API':          'bg-purple-100 text-purple-800',
};

const CHANNELS: OrderChannel[] = ['Shopify', 'VTEX', 'Mercado Livre', 'Magalu', 'Manual', 'API'];

export default function Orders() {
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState('Todos');

  const STATUSES: OrderStatus[] = ['Recebido', 'Em separação', 'Pronto', 'Despachado', 'Em trânsito', 'Entregue', 'Cancelado'];

  const filtered = ORDERS.filter((o) => {
    const matchSearch = o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.customer.toLowerCase().includes(search.toLowerCase()) ||
      o.externalId.toLowerCase().includes(search.toLowerCase());
    const matchChannel = channelFilter === 'Todos' || o.channel === channelFilter;
    const matchStatus = statusFilter === 'Todos' || o.status === statusFilter;
    return matchSearch && matchChannel && matchStatus;
  });

  const lateCount = ORDERS.filter((o) => !o.slaOk && o.status !== 'Cancelado').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestão de Pedidos</h1>
          <p className="text-slate-500 text-sm mt-0.5">Todos os canais integrados: Shopify, VTEX, Mercado Livre, Magalu e mais</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 border border-slate-200 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            <Download className="w-4 h-4" />
            Exportar
          </button>
          <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
            <Plus className="w-4 h-4" />
            Novo Pedido
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Pedidos Hoje',      value: ORDERS.length,    icon: ShoppingCart,  color: 'emerald' },
          { label: 'Em Processamento', value: ORDERS.filter((o) => ['Recebido', 'Em separação', 'Pronto'].includes(o.status)).length, icon: Clock, color: 'blue' },
          { label: 'SLA em Risco',     value: lateCount,         icon: AlertTriangle, color: 'amber'   },
          { label: 'Entregues Hoje',   value: ORDERS.filter((o) => o.status === 'Entregue').length, icon: CheckCircle2, color: 'teal' },
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
            placeholder="Buscar pedido, cliente ou ID externo..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
        <div className="relative">
          <select value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)} className="appearance-none border border-slate-200 rounded-lg px-4 py-2 pr-8 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400">
            <option value="Todos">Todos os canais</option>
            {CHANNELS.map((c) => <option key={c}>{c}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="appearance-none border border-slate-200 rounded-lg px-4 py-2 pr-8 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400">
            <option value="Todos">Todos os status</option>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
        <button className="flex items-center gap-2 border border-slate-200 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
          <Filter className="w-4 h-4" />
          Mais Filtros
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3 text-left">Pedido</th>
              <th className="px-5 py-3 text-center">Canal</th>
              <th className="px-5 py-3 text-left">Cliente</th>
              <th className="px-5 py-3 text-center">Itens</th>
              <th className="px-5 py-3 text-right">Valor</th>
              <th className="px-5 py-3 text-left">Transportadora</th>
              <th className="px-5 py-3 text-center">SLA</th>
              <th className="px-5 py-3 text-center">Criado em</th>
              <th className="px-5 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((order) => (
              <tr key={order.id} className="hover:bg-slate-50 transition-colors cursor-pointer">
                <td className="px-5 py-3.5">
                  <div className="font-mono font-medium text-slate-800">{order.id}</div>
                  <div className="text-xs text-slate-500">{order.externalId}</div>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${CHANNEL_BADGE[order.channel]}`}>{order.channel}</span>
                </td>
                <td className="px-5 py-3.5 text-slate-700">{order.customer}</td>
                <td className="px-5 py-3.5 text-center font-bold text-slate-700">{order.items}</td>
                <td className="px-5 py-3.5 text-right font-bold text-slate-800">R$ {order.value.toLocaleString('pt-BR')}</td>
                <td className="px-5 py-3.5 text-slate-600">{order.carrier}</td>
                <td className="px-5 py-3.5 text-center">
                  <span className={`text-xs font-medium ${order.slaOk ? 'text-emerald-600' : 'text-red-600 font-bold'}`}>
                    {order.slaOk ? '✓ ' : '⚠ '}{order.slaDue}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-center text-xs text-slate-500">{order.createdAt}</td>
                <td className="px-5 py-3.5 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[order.status]}`}>{order.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
