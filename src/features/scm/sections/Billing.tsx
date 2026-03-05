import { useState } from 'react';
import { Search, Plus, Receipt, CheckCircle2, Clock, DollarSign, Download } from 'lucide-react';

type InvoiceStatus = 'Rascunho' | 'Emitida' | 'Enviada' | 'Paga' | 'Vencida' | 'Cancelada';

interface Invoice {
  id: string;
  client: string;
  period: string;
  deliveries: number;
  freightValue: number;
  taxValue: number;
  total: number;
  status: InvoiceStatus;
  dueDate: string;
  issuedAt?: string;
}

const INVOICES: Invoice[] = [
  { id: 'FAT-2026-041', client: 'TechCorp Ltda',         period: 'Fev/2026', deliveries: 312, freightValue: 18_420, taxValue: 1_842, total: 20_262, status: 'Paga',     dueDate: '15/03/2026', issuedAt: '01/03/2026' },
  { id: 'FAT-2026-040', client: 'Distribuidora Norte',   period: 'Fev/2026', deliveries: 184, freightValue: 9_840,  taxValue: 984,   total: 10_824, status: 'Enviada',  dueDate: '15/03/2026', issuedAt: '01/03/2026' },
  { id: 'FAT-2026-039', client: 'Atacado Regional',      period: 'Fev/2026', deliveries: 98,  freightValue: 4_200,  taxValue: 420,   total: 4_620,  status: 'Emitida',  dueDate: '20/03/2026', issuedAt: '01/03/2026' },
  { id: 'FAT-2026-038', client: 'Varejo Express',        period: 'Fev/2026', deliveries: 445, freightValue: 24_800, taxValue: 2_480, total: 27_280, status: 'Paga',     dueDate: '10/03/2026', issuedAt: '01/03/2026' },
  { id: 'FAT-2026-037', client: 'Importadora Delta',     period: 'Jan/2026', deliveries: 62,  freightValue: 3_100,  taxValue: 310,   total: 3_410,  status: 'Vencida',  dueDate: '15/02/2026', issuedAt: '01/02/2026' },
  { id: 'FAT-2026-036', client: 'MedFarma Distribuidora', period: 'Fev/2026', deliveries: 220, freightValue: 14_200, taxValue: 1_420, total: 15_620, status: 'Rascunho', dueDate: '20/03/2026' },
];

const STATUS_BADGE: Record<InvoiceStatus, string> = {
  'Rascunho':  'bg-slate-100 text-slate-500',
  'Emitida':   'bg-blue-100 text-blue-700',
  'Enviada':   'bg-amber-100 text-amber-700',
  'Paga':      'bg-emerald-100 text-emerald-700',
  'Vencida':   'bg-red-100 text-red-700',
  'Cancelada': 'bg-slate-100 text-slate-400',
};

export default function Billing() {
  const [search, setSearch] = useState('');

  const filtered = INVOICES.filter((i) =>
    i.client.toLowerCase().includes(search.toLowerCase()) ||
    i.id.toLowerCase().includes(search.toLowerCase())
  );

  const paidTotal = INVOICES.filter((i) => i.status === 'Paga').reduce((s, i) => s + i.total, 0);
  const pendingTotal = INVOICES.filter((i) => ['Emitida', 'Enviada'].includes(i.status)).reduce((s, i) => s + i.total, 0);
  const overdueTotal = INVOICES.filter((i) => i.status === 'Vencida').reduce((s, i) => s + i.total, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Faturamento</h1>
          <p className="text-slate-500 text-sm mt-0.5">Geração automática de cobranças baseada nas entregas realizadas</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 border border-slate-200 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            <Download className="w-4 h-4" />
            Exportar
          </button>
          <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
            <Plus className="w-4 h-4" />
            Nova Fatura
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Recebido (mês)',  value: `R$ ${(paidTotal / 1000).toFixed(1)}K`,    icon: CheckCircle2, color: 'emerald' },
          { label: 'A Receber',      value: `R$ ${(pendingTotal / 1000).toFixed(1)}K`, icon: Clock,        color: 'blue'    },
          { label: 'Vencido',        value: `R$ ${(overdueTotal / 1000).toFixed(1)}K`, icon: Receipt,      color: 'red'     },
          { label: 'Rascunhos',      value: INVOICES.filter((i) => i.status === 'Rascunho').length, icon: DollarSign, color: 'slate' },
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

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar fatura ou cliente..." className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3 text-left">Fatura</th>
              <th className="px-5 py-3 text-left">Cliente</th>
              <th className="px-5 py-3 text-center">Período</th>
              <th className="px-5 py-3 text-center">Entregas</th>
              <th className="px-5 py-3 text-right">Frete</th>
              <th className="px-5 py-3 text-right">Impostos</th>
              <th className="px-5 py-3 text-right">Total</th>
              <th className="px-5 py-3 text-center">Vencimento</th>
              <th className="px-5 py-3 text-center">Status</th>
              <th className="px-5 py-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((inv) => (
              <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3.5 font-mono text-xs font-bold text-slate-700">{inv.id}</td>
                <td className="px-5 py-3.5 font-medium text-slate-800">{inv.client}</td>
                <td className="px-5 py-3.5 text-center text-slate-600">{inv.period}</td>
                <td className="px-5 py-3.5 text-center font-bold text-slate-700">{inv.deliveries}</td>
                <td className="px-5 py-3.5 text-right text-slate-700">R$ {inv.freightValue.toLocaleString('pt-BR')}</td>
                <td className="px-5 py-3.5 text-right text-slate-500">R$ {inv.taxValue.toLocaleString('pt-BR')}</td>
                <td className="px-5 py-3.5 text-right font-bold text-slate-800">R$ {inv.total.toLocaleString('pt-BR')}</td>
                <td className="px-5 py-3.5 text-center text-xs text-slate-500">{inv.dueDate}</td>
                <td className="px-5 py-3.5 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[inv.status]}`}>{inv.status}</span>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button className="text-xs text-slate-500 hover:text-slate-800">PDF</button>
                    {inv.status === 'Rascunho' && <button className="text-xs text-emerald-600 hover:text-emerald-800">Emitir</button>}
                    {inv.status === 'Emitida' && <button className="text-xs text-blue-600 hover:text-blue-800">Enviar</button>}
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
