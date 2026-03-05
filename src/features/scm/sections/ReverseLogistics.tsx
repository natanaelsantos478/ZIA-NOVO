import { useState } from 'react';
import { Search, Plus, RefreshCw, ArrowLeft, CheckCircle2, Clock, Download } from 'lucide-react';

type ReturnStatus = 'Solicitado' | 'Coleta agendada' | 'Em retorno' | 'Recebido no CD' | 'Reaproveitado' | 'Descartado';
type ReturnReason = 'Produto com defeito' | 'Pedido errado' | 'Arrependimento' | 'Avaria no transporte' | 'Não entregue';

interface ReturnOrder {
  id: string;
  originalOrder: string;
  customer: string;
  product: string;
  quantity: number;
  reason: ReturnReason;
  carrier: string;
  status: ReturnStatus;
  requestedAt: string;
  eta?: string;
  refundValue: number;
}

const RETURNS: ReturnOrder[] = [
  { id: 'RET-891', originalOrder: 'PED-12841', customer: 'João Silva',      product: 'Notebook Dell i5',     quantity: 1, reason: 'Produto com defeito',    carrier: 'Jadlog',        status: 'Em retorno',       requestedAt: '03/03/2026', eta: '06/03/2026', refundValue: 2_850 },
  { id: 'RET-890', originalOrder: 'PED-12838', customer: 'Maria Oliveira',  product: 'Camiseta tam P (cx3)', quantity: 3, reason: 'Pedido errado',          carrier: 'Correios',      status: 'Recebido no CD',   requestedAt: '02/03/2026', refundValue: 180   },
  { id: 'RET-889', originalOrder: 'PED-12831', customer: 'Carlos Mendes',   product: 'Smartphone Samsung',  quantity: 1, reason: 'Arrependimento',         carrier: 'Total Express', status: 'Coleta agendada',  requestedAt: '04/03/2026', eta: '07/03/2026', refundValue: 1_440 },
  { id: 'RET-888', originalOrder: 'PED-12820', customer: 'Fernanda Costa',  product: 'Tênis Nike Air Max',  quantity: 1, reason: 'Avaria no transporte',   carrier: 'Frota Própria', status: 'Reaproveitado',    requestedAt: '28/02/2026', refundValue: 620   },
  { id: 'RET-887', originalOrder: 'PED-12815', customer: 'Pedro Alves',     product: 'Smart TV 50"',        quantity: 1, reason: 'Não entregue',           carrier: 'Braspress',     status: 'Solicitado',       requestedAt: '05/03/2026', refundValue: 1_890 },
  { id: 'RET-886', originalOrder: 'PED-12800', customer: 'Ana Rodrigues',   product: 'Livros (caixa 5kg)',  quantity: 1, reason: 'Pedido errado',          carrier: 'Correios',      status: 'Descartado',       requestedAt: '25/02/2026', refundValue: 95    },
];

const STATUS_BADGE: Record<ReturnStatus, string> = {
  'Solicitado':       'bg-blue-100 text-blue-700',
  'Coleta agendada':  'bg-amber-100 text-amber-700',
  'Em retorno':       'bg-purple-100 text-purple-700',
  'Recebido no CD':   'bg-emerald-100 text-emerald-700',
  'Reaproveitado':    'bg-teal-100 text-teal-700',
  'Descartado':       'bg-slate-100 text-slate-500',
};

const REASON_BADGE: Record<ReturnReason, string> = {
  'Produto com defeito':   'bg-red-50 text-red-600',
  'Pedido errado':         'bg-orange-50 text-orange-600',
  'Arrependimento':        'bg-slate-50 text-slate-600',
  'Avaria no transporte':  'bg-amber-50 text-amber-600',
  'Não entregue':          'bg-blue-50 text-blue-600',
};

export default function ReverseLogistics() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');

  const STATUSES = ['Todos', 'Solicitado', 'Coleta agendada', 'Em retorno', 'Recebido no CD', 'Reaproveitado', 'Descartado'];

  const filtered = RETURNS.filter((r) => {
    const matchSearch = r.id.toLowerCase().includes(search.toLowerCase()) ||
      r.customer.toLowerCase().includes(search.toLowerCase()) ||
      r.product.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'Todos' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalRefund = RETURNS.filter((r) => r.status === 'Recebido no CD' || r.status === 'Reaproveitado').reduce((s, r) => s + r.refundValue, 0);
  const inTransitCount = RETURNS.filter((r) => r.status === 'Em retorno').length;
  const pendingCount = RETURNS.filter((r) => r.status === 'Solicitado' || r.status === 'Coleta agendada').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Logística Reversa</h1>
          <p className="text-slate-500 text-sm mt-0.5">Devoluções com rastreio, reaproveitamento e gestão de reembolsos</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 border border-slate-200 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            <Download className="w-4 h-4" />
            Exportar
          </button>
          <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
            <Plus className="w-4 h-4" />
            Nova Devolução
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Em Retorno',         value: inTransitCount, icon: ArrowLeft,    color: 'purple'  },
          { label: 'Aguardando Ação',    value: pendingCount,   icon: Clock,        color: 'amber'   },
          { label: 'Recebidos no CD',    value: RETURNS.filter((r) => r.status === 'Recebido no CD').length, icon: CheckCircle2, color: 'emerald' },
          { label: 'Reembolso Pendente', value: `R$ ${totalRefund.toLocaleString('pt-BR')}`, icon: RefreshCw, color: 'blue' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 bg-${s.color}-50`}>
                <Icon className={`w-4 h-4 text-${s.color}-600`} />
              </div>
              <div className="text-xl font-bold text-slate-800">{s.value}</div>
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
            placeholder="Buscar por ID, cliente ou produto..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3 text-left">ID / Pedido Original</th>
              <th className="px-5 py-3 text-left">Cliente</th>
              <th className="px-5 py-3 text-left">Produto</th>
              <th className="px-5 py-3 text-left">Motivo</th>
              <th className="px-5 py-3 text-left">Transportadora</th>
              <th className="px-5 py-3 text-center">ETA CD</th>
              <th className="px-5 py-3 text-right">Valor</th>
              <th className="px-5 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((ret) => (
              <tr key={ret.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="font-mono font-medium text-slate-800">{ret.id}</div>
                  <div className="text-xs text-slate-500">{ret.originalOrder}</div>
                </td>
                <td className="px-5 py-3.5 text-slate-700">{ret.customer}</td>
                <td className="px-5 py-3.5">
                  <div className="text-slate-800 font-medium">{ret.product}</div>
                  <div className="text-xs text-slate-500">Qtd: {ret.quantity}</div>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`px-2 py-0.5 rounded text-xs ${REASON_BADGE[ret.reason]}`}>
                    {ret.reason}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-slate-600">{ret.carrier}</td>
                <td className="px-5 py-3.5 text-center text-slate-500">{ret.eta ?? '—'}</td>
                <td className="px-5 py-3.5 text-right font-bold text-slate-800">
                  R$ {ret.refundValue.toLocaleString('pt-BR')}
                </td>
                <td className="px-5 py-3.5 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[ret.status]}`}>
                    {ret.status}
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
