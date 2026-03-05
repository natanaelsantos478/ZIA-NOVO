import { useState } from 'react';
import { Star, BarChart2, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface CarrierData {
  carrier: string;
  deliveries: number;
  otif: number;
  avgDelay: number;
  damageRate: number;
  invoiceAccuracy: number;
  nps: number;
  cost: number;
  trend: 'up' | 'down' | 'neutral';
  monthHistory: number[];
}

const CARRIERS: CarrierData[] = [
  { carrier: 'Frota Própria',  deliveries: 920,   otif: 98.1, avgDelay: 0.1, damageRate: 0.1, invoiceAccuracy: 100, nps: 88, cost: 5.20, trend: 'up',    monthHistory: [96, 97, 97, 98, 98, 98] },
  { carrier: 'Total Express',  deliveries: 2_410, otif: 95.4, avgDelay: 0.5, damageRate: 0.5, invoiceAccuracy: 97,  nps: 76, cost: 7.80, trend: 'up',    monthHistory: [91, 92, 94, 94, 95, 95] },
  { carrier: 'Braspress',      deliveries: 430,   otif: 94.0, avgDelay: 0.8, damageRate: 0.8, invoiceAccuracy: 94,  nps: 72, cost: 5.40, trend: 'neutral', monthHistory: [93, 94, 93, 94, 94, 94] },
  { carrier: 'Jadlog',         deliveries: 1_980, otif: 91.2, avgDelay: 1.4, damageRate: 1.2, invoiceAccuracy: 91,  nps: 64, cost: 4.20, trend: 'down',  monthHistory: [94, 93, 92, 92, 91, 91] },
  { carrier: 'Correios',       deliveries: 5_120, otif: 88.3, avgDelay: 2.1, damageRate: 0.9, invoiceAccuracy: 96,  nps: 60, cost: 3.10, trend: 'neutral', monthHistory: [87, 88, 88, 87, 88, 88] },
  { carrier: 'Sequoia',        deliveries: 780,   otif: 92.5, avgDelay: 0.9, damageRate: 1.8, invoiceAccuracy: 89,  nps: 68, cost: 6.10, trend: 'up',    monthHistory: [90, 90, 91, 92, 92, 92] },
];

const maxDeliveries = Math.max(...CARRIERS.map((c) => c.deliveries));

export default function CarrierAnalytics() {
  const [selected, setSelected] = useState('Frota Própria');
  const selectedCarrier = CARRIERS.find((c) => c.carrier === selected) ?? CARRIERS[0];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Análise de Transportadoras</h1>
          <p className="text-slate-500 text-sm mt-0.5">SLA, custo, avarias e NPS por transportadora</p>
        </div>
      </div>

      {/* Carrier selector tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {CARRIERS.map((c) => (
          <button
            key={c.carrier}
            onClick={() => setSelected(c.carrier)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selected === c.carrier ? 'bg-emerald-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            {c.carrier}
          </button>
        ))}
      </div>

      {/* Selected carrier detail */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'OTIF',               value: `${selectedCarrier.otif}%`,  good: selectedCarrier.otif >= 95 },
          { label: 'Atraso Médio',       value: `${selectedCarrier.avgDelay}d`, good: selectedCarrier.avgDelay <= 0.5 },
          { label: 'Taxa de Avaria',     value: `${selectedCarrier.damageRate}%`, good: selectedCarrier.damageRate <= 0.5 },
          { label: 'Precisão de Fatura', value: `${selectedCarrier.invoiceAccuracy}%`, good: selectedCarrier.invoiceAccuracy >= 97 },
          { label: 'NPS',                value: selectedCarrier.nps.toString(), good: selectedCarrier.nps >= 75 },
          { label: 'Custo Médio/kg',    value: `R$ ${selectedCarrier.cost.toFixed(2)}`, good: selectedCarrier.cost <= 5 },
        ].map((m) => (
          <div key={m.label} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
            <div className={`text-2xl font-bold ${m.good ? 'text-emerald-600' : 'text-amber-600'}`}>{m.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{m.label}</div>
            <div className={`text-xs mt-1 ${m.good ? 'text-emerald-500' : 'text-amber-500'}`}>{m.good ? '✓ Meta atingida' : '⚠ Abaixo da meta'}</div>
          </div>
        ))}
      </div>

      {/* Trend chart */}
      <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
        <h2 className="font-semibold text-slate-800 mb-4">Histórico OTIF — {selectedCarrier.carrier} (últimos 6 meses)</h2>
        <div className="flex items-end gap-3 h-32">
          {selectedCarrier.monthHistory.map((val, i) => {
            const months = ['Set/25', 'Out/25', 'Nov/25', 'Dez/25', 'Jan/26', 'Fev/26'];
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-bold text-emerald-700">{val}%</span>
                <div className="w-full rounded-t" style={{ height: `${(val / 100) * 100}px`, background: `rgb(16 185 129 / ${val / 100})` }} />
                <span className="text-xs text-slate-500">{months[i]}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* All carriers comparison table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Comparativo Geral</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3 text-left">Transportadora</th>
              <th className="px-5 py-3 text-center">Entregas</th>
              <th className="px-5 py-3 text-center">OTIF</th>
              <th className="px-5 py-3 text-center">Atraso Médio</th>
              <th className="px-5 py-3 text-center">Avaria</th>
              <th className="px-5 py-3 text-center">NPS</th>
              <th className="px-5 py-3 text-center">Custo/kg</th>
              <th className="px-5 py-3 text-center">Tendência</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {CARRIERS.map((c) => (
              <tr key={c.carrier} className={`hover:bg-slate-50 transition-colors cursor-pointer ${selected === c.carrier ? 'bg-emerald-50/30' : ''}`} onClick={() => setSelected(c.carrier)}>
                <td className="px-5 py-3.5 font-medium text-slate-800">{c.carrier}</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                      <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${(c.deliveries / maxDeliveries) * 100}%` }} />
                    </div>
                    <span className="text-xs text-slate-600 w-12 text-right">{c.deliveries.toLocaleString('pt-BR')}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-center">
                  <span className={`font-bold text-sm ${c.otif >= 95 ? 'text-emerald-600' : c.otif >= 90 ? 'text-amber-600' : 'text-red-600'}`}>{c.otif}%</span>
                </td>
                <td className="px-5 py-3.5 text-center text-slate-600">{c.avgDelay}d</td>
                <td className="px-5 py-3.5 text-center">
                  <span className={c.damageRate > 1 ? 'text-red-600 font-medium' : 'text-slate-600'}>{c.damageRate}%</span>
                </td>
                <td className="px-5 py-3.5 text-center text-slate-600">{c.nps}</td>
                <td className="px-5 py-3.5 text-center text-slate-600">R$ {c.cost.toFixed(2)}</td>
                <td className="px-5 py-3.5 text-center">
                  {c.trend === 'up' ? <TrendingUp className="w-4 h-4 text-emerald-500 mx-auto" /> :
                   c.trend === 'down' ? <TrendingDown className="w-4 h-4 text-red-500 mx-auto" /> :
                   <BarChart2 className="w-4 h-4 text-slate-400 mx-auto" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
