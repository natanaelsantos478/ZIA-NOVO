import { useState } from 'react';
import { Clock, AlertTriangle, CheckCircle2, TrendingDown, BarChart2, Filter } from 'lucide-react';

interface SLARecord {
  id: string;
  customer: string;
  channel: string;
  carrier: string;
  promised: string;
  expected: string;
  actual?: string;
  status: 'No prazo' | 'Em risco' | 'Atrasado' | 'Entregue no prazo' | 'Entregue com atraso';
  daysDelay?: number;
  region: string;
}

const SLA_RECORDS: SLARecord[] = [
  { id: 'PED-12854', customer: 'Maria Santos',   channel: 'Shopify',       carrier: 'Total Express', promised: '05/03', expected: '05/03', actual: undefined, status: 'No prazo',             region: 'RJ' },
  { id: 'PED-12851', customer: 'Carlos Mendes',  channel: 'Mercado Livre', carrier: 'Frota Própria', promised: '05/03', expected: '06/03', actual: undefined, status: 'Atrasado',   daysDelay: 1, region: 'SP' },
  { id: 'PED-12849', customer: 'Ana Costa',      channel: 'Manual',        carrier: 'Correios',      promised: '04/03', expected: '04/03', actual: '04/03',   status: 'Entregue no prazo',   region: 'SP' },
  { id: 'PED-12848', customer: 'Roberto Lima',   channel: 'VTEX',          carrier: 'Total Express', promised: '05/03', expected: '05/03', actual: undefined, status: 'Em risco',             region: 'MG' },
  { id: 'PED-12847', customer: 'Juliana Ferreira', channel: 'Magalu',      carrier: 'Correios',      promised: '03/03', expected: '04/03', actual: '05/03',   status: 'Entregue com atraso', daysDelay: 2, region: 'BA' },
  { id: 'PED-12846', customer: 'Paulo Saúde',    channel: 'Shopify',       carrier: 'Jadlog',        promised: '07/03', expected: '07/03', actual: undefined, status: 'No prazo',             region: 'SP' },
  { id: 'PED-12845', customer: 'Gisele Ramos',   channel: 'API',           carrier: 'Braspress',     promised: '08/03', expected: '09/03', actual: undefined, status: 'Em risco',             region: 'RS' },
];

const STATUS_BADGE: Record<string, string> = {
  'No prazo':             'bg-emerald-100 text-emerald-700',
  'Em risco':             'bg-amber-100 text-amber-700',
  'Atrasado':             'bg-red-100 text-red-700',
  'Entregue no prazo':    'bg-teal-100 text-teal-700',
  'Entregue com atraso':  'bg-orange-100 text-orange-700',
};

const CARRIERS = ['Todos', 'Correios', 'Jadlog', 'Total Express', 'Frota Própria', 'Braspress'];

export default function OrderSLA() {
  const [carrierFilter, setCarrierFilter] = useState('Todos');

  const filtered = SLA_RECORDS.filter((r) => carrierFilter === 'Todos' || r.carrier === carrierFilter);

  const lateCount = SLA_RECORDS.filter((r) => r.status === 'Atrasado' || r.status === 'Entregue com atraso').length;
  const atRiskCount = SLA_RECORDS.filter((r) => r.status === 'Em risco').length;
  const onTimeRate = ((SLA_RECORDS.filter((r) => r.status === 'No prazo' || r.status === 'Entregue no prazo').length / SLA_RECORDS.length) * 100).toFixed(1);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">SLA por Pedido</h1>
          <p className="text-slate-500 text-sm mt-0.5">Prazo comprometido vs prazo real — monitoramento em tempo real</p>
        </div>
        <button className="flex items-center gap-2 border border-slate-200 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
          <Filter className="w-4 h-4" />
          Configurar Alertas
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Taxa OTIF',       value: `${onTimeRate}%`, icon: CheckCircle2,  color: 'emerald' },
          { label: 'Em Risco',        value: atRiskCount,      icon: AlertTriangle, color: 'amber'   },
          { label: 'Atrasados',       value: lateCount,        icon: Clock,         color: 'red'     },
          { label: 'Atraso Médio',    value: '1,5 dias',       icon: TrendingDown,  color: 'orange'  },
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

      {/* SLA por carrier */}
      <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 className="w-4 h-4 text-emerald-600" />
          <h2 className="font-semibold text-slate-800">OTIF por Transportadora (mês)</h2>
        </div>
        <div className="space-y-3">
          {[
            { carrier: 'Frota Própria',  otif: 98, deliveries: 92 },
            { carrier: 'Total Express',  otif: 95, deliveries: 241 },
            { carrier: 'Braspress',      otif: 94, deliveries: 43 },
            { carrier: 'Jadlog',         otif: 91, deliveries: 198 },
            { carrier: 'Correios',       otif: 88, deliveries: 512 },
          ].map((c) => (
            <div key={c.carrier} className="flex items-center gap-4">
              <span className="text-sm text-slate-700 w-32 flex-shrink-0">{c.carrier}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${c.otif >= 95 ? 'bg-emerald-500' : c.otif >= 90 ? 'bg-amber-400' : 'bg-red-500'}`}
                  style={{ width: `${c.otif}%` }}
                />
              </div>
              <span className={`text-sm font-bold w-12 text-right ${c.otif >= 95 ? 'text-emerald-600' : c.otif >= 90 ? 'text-amber-600' : 'text-red-600'}`}>{c.otif}%</span>
              <span className="text-xs text-slate-500 w-20 text-right">{c.deliveries} entregas</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filter + Table */}
      <div className="flex items-center gap-2 mb-4">
        {CARRIERS.map((c) => (
          <button
            key={c}
            onClick={() => setCarrierFilter(c)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${carrierFilter === c ? 'bg-emerald-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3 text-left">Pedido</th>
              <th className="px-5 py-3 text-left">Cliente</th>
              <th className="px-5 py-3 text-left">Canal</th>
              <th className="px-5 py-3 text-left">Transportadora</th>
              <th className="px-5 py-3 text-center">Prometido</th>
              <th className="px-5 py-3 text-center">Previsão</th>
              <th className="px-5 py-3 text-center">Entregue</th>
              <th className="px-5 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3.5 font-mono font-medium text-slate-800">{r.id}</td>
                <td className="px-5 py-3.5 text-slate-700">{r.customer}</td>
                <td className="px-5 py-3.5 text-slate-500 text-xs">{r.channel}</td>
                <td className="px-5 py-3.5 text-slate-700">{r.carrier}</td>
                <td className="px-5 py-3.5 text-center text-slate-600">{r.promised}</td>
                <td className="px-5 py-3.5 text-center">
                  <span className={r.expected > r.promised ? 'text-red-600 font-medium' : 'text-slate-600'}>{r.expected}</span>
                </td>
                <td className="px-5 py-3.5 text-center text-slate-500">{r.actual ?? '—'}</td>
                <td className="px-5 py-3.5 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[r.status]}`}>
                    {r.status}
                    {r.daysDelay ? ` (+${r.daysDelay}d)` : ''}
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
