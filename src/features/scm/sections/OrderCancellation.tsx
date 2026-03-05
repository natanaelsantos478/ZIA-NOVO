import { useState } from 'react';
import { Search, XCircle, CheckCircle2, Clock, AlertTriangle, Plus } from 'lucide-react';

type CancelStatus = 'Solicitado' | 'Em análise' | 'Aprovado' | 'Recusado' | 'Cancelado';
type CancelReason = 'Arrependimento' | 'Produto errado' | 'Preço mais baixo' | 'Prazo inaceitável' | 'Duplicata' | 'Solicitação do cliente' | 'Fraude';

interface CancelRequest {
  id: string;
  orderId: string;
  customer: string;
  value: number;
  reason: CancelReason;
  requestedAt: string;
  status: CancelStatus;
  resolvedAt?: string;
  operator?: string;
  refundMethod: string;
}

const CANCELS: CancelRequest[] = [
  { id: 'CAN-0481', orderId: 'PED-12849', customer: 'Ana Costa',        value: 195,   reason: 'Arrependimento',       requestedAt: '05/03 09:00', status: 'Cancelado',  resolvedAt: '05/03 09:45', operator: 'Pedro A', refundMethod: 'Estorno cartão' },
  { id: 'CAN-0480', orderId: 'PED-12840', customer: 'Paulo Ramos',      value: 3_120, reason: 'Produto errado',       requestedAt: '04/03 14:30', status: 'Aprovado',   resolvedAt: '04/03 15:00', operator: 'Joana S', refundMethod: 'PIX' },
  { id: 'CAN-0479', orderId: 'PED-12835', customer: 'Carla Oliveira',   value: 840,   reason: 'Preço mais baixo',     requestedAt: '04/03 11:15', status: 'Recusado',   resolvedAt: '04/03 12:00', operator: 'Pedro A', refundMethod: '—' },
  { id: 'CAN-0478', orderId: 'PED-12831', customer: 'Fernando Lima',    value: 580,   reason: 'Duplicata',            requestedAt: '05/03 10:00', status: 'Em análise', operator: 'Joana S',        refundMethod: 'Estorno cartão' },
  { id: 'CAN-0477', orderId: 'PED-12828', customer: 'TechBrasil Ltda',  value: 8_400, reason: 'Solicitação do cliente', requestedAt: '05/03 08:30', status: 'Solicitado', refundMethod: 'TED' },
  { id: 'CAN-0476', orderId: 'PED-12819', customer: 'Marcos Duarte',    value: 2_100, reason: 'Fraude',               requestedAt: '03/03 20:00', status: 'Cancelado',  resolvedAt: '04/03 08:00', operator: 'Admin',   refundMethod: 'Bloqueado' },
];

const STATUS_BADGE: Record<CancelStatus, string> = {
  'Solicitado': 'bg-blue-100 text-blue-700',
  'Em análise': 'bg-amber-100 text-amber-700',
  'Aprovado':   'bg-emerald-100 text-emerald-700',
  'Recusado':   'bg-red-100 text-red-700',
  'Cancelado':  'bg-slate-100 text-slate-600',
};

const REASON_COLORS: Record<CancelReason, string> = {
  'Arrependimento':        'text-slate-600',
  'Produto errado':        'text-amber-700',
  'Preço mais baixo':      'text-blue-600',
  'Prazo inaceitável':     'text-orange-600',
  'Duplicata':             'text-purple-600',
  'Solicitação do cliente': 'text-emerald-600',
  'Fraude':                'text-red-600',
};

export default function OrderCancellation() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');

  const STATUSES: CancelStatus[] = ['Solicitado', 'Em análise', 'Aprovado', 'Recusado', 'Cancelado'];

  const filtered = CANCELS.filter((c) => {
    const matchSearch = c.id.toLowerCase().includes(search.toLowerCase()) ||
      c.customer.toLowerCase().includes(search.toLowerCase()) ||
      c.orderId.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'Todos' || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const pendingCount = CANCELS.filter((c) => ['Solicitado', 'Em análise'].includes(c.status)).length;
  const totalRefund = CANCELS.filter((c) => c.status === 'Cancelado' || c.status === 'Aprovado').reduce((s, c) => s + c.value, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cancelamentos</h1>
          <p className="text-slate-500 text-sm mt-0.5">Fluxo controlado de cancelamentos e alterações pós-compra</p>
        </div>
        <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
          <Plus className="w-4 h-4" />
          Registrar Cancelamento
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Pendentes de Ação', value: pendingCount, icon: Clock,       color: 'amber'   },
          { label: 'Aprovados',         value: CANCELS.filter((c) => c.status === 'Aprovado').length, icon: CheckCircle2, color: 'emerald' },
          { label: 'Recusados',         value: CANCELS.filter((c) => c.status === 'Recusado').length, icon: XCircle, color: 'red' },
          { label: 'Total Estornado',   value: `R$ ${totalRefund.toLocaleString('pt-BR')}`, icon: AlertTriangle, color: 'blue' },
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
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cancelamento, pedido ou cliente..." className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
        </div>
        {(['Todos', ...STATUSES] as const).map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === s ? 'bg-emerald-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{s}</button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3 text-left">ID / Pedido</th>
              <th className="px-5 py-3 text-left">Cliente</th>
              <th className="px-5 py-3 text-left">Motivo</th>
              <th className="px-5 py-3 text-right">Valor</th>
              <th className="px-5 py-3 text-left">Reembolso</th>
              <th className="px-5 py-3 text-center">Solicitado</th>
              <th className="px-5 py-3 text-center">Resolvido</th>
              <th className="px-5 py-3 text-center">Status</th>
              <th className="px-5 py-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="font-mono font-medium text-slate-800">{c.id}</div>
                  <div className="text-xs text-slate-500">{c.orderId}</div>
                </td>
                <td className="px-5 py-3.5 text-slate-700">{c.customer}</td>
                <td className="px-5 py-3.5">
                  <span className={`text-sm ${REASON_COLORS[c.reason]}`}>{c.reason}</span>
                </td>
                <td className="px-5 py-3.5 text-right font-bold text-slate-800">R$ {c.value.toLocaleString('pt-BR')}</td>
                <td className="px-5 py-3.5 text-slate-600 text-xs">{c.refundMethod}</td>
                <td className="px-5 py-3.5 text-center text-xs text-slate-500">{c.requestedAt}</td>
                <td className="px-5 py-3.5 text-center text-xs text-slate-500">{c.resolvedAt ?? '—'}</td>
                <td className="px-5 py-3.5 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[c.status]}`}>{c.status}</span>
                </td>
                <td className="px-5 py-3.5 text-center">
                  {['Solicitado', 'Em análise'].includes(c.status) && (
                    <div className="flex items-center justify-center gap-2">
                      <button className="text-xs text-emerald-600 hover:underline">Aprovar</button>
                      <button className="text-xs text-red-500 hover:underline">Recusar</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
