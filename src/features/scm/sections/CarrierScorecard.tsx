import { useState } from 'react';
import { Star, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ScorecardData {
  carrier: string;
  month: string;
  otif: number;
  otifGoal: number;
  occurrenceRate: number;
  occurrenceGoal: number;
  damageRate: number;
  damageGoal: number;
  invoiceAccuracy: number;
  invoiceGoal: number;
  nps: number;
  npsGoal: number;
  overall: number;
  trend: 'up' | 'down' | 'neutral';
}

const SCORECARDS: ScorecardData[] = [
  { carrier: 'Frota Própria',  month: 'Fev/2026', otif: 98.1, otifGoal: 95, occurrenceRate: 0.5,  occurrenceGoal: 2,  damageRate: 0.1, damageGoal: 0.5, invoiceAccuracy: 100, invoiceGoal: 98, nps: 88, npsGoal: 70, overall: 98, trend: 'up'     },
  { carrier: 'Total Express',  month: 'Fev/2026', otif: 95.4, otifGoal: 95, occurrenceRate: 1.2,  occurrenceGoal: 2,  damageRate: 0.5, damageGoal: 0.5, invoiceAccuracy: 97,  invoiceGoal: 98, nps: 76, npsGoal: 70, overall: 87, trend: 'up'     },
  { carrier: 'Braspress',      month: 'Fev/2026', otif: 94.0, otifGoal: 95, occurrenceRate: 1.8,  occurrenceGoal: 2,  damageRate: 0.8, damageGoal: 0.5, invoiceAccuracy: 94,  invoiceGoal: 98, nps: 72, npsGoal: 70, overall: 79, trend: 'neutral' },
  { carrier: 'Jadlog',         month: 'Fev/2026', otif: 91.2, otifGoal: 95, occurrenceRate: 2.8,  occurrenceGoal: 2,  damageRate: 1.2, damageGoal: 0.5, invoiceAccuracy: 91,  invoiceGoal: 98, nps: 64, npsGoal: 70, overall: 68, trend: 'down'   },
  { carrier: 'Correios',       month: 'Fev/2026', otif: 88.3, otifGoal: 95, occurrenceRate: 3.1,  occurrenceGoal: 2,  damageRate: 0.9, damageGoal: 0.5, invoiceAccuracy: 96,  invoiceGoal: 98, nps: 60, npsGoal: 70, overall: 62, trend: 'neutral' },
];

const METRICS = [
  { key: 'otif' as const,            label: 'OTIF (%)',           goal: 'otifGoal' as const,            higherBetter: true  },
  { key: 'occurrenceRate' as const,  label: 'Taxa Ocorrências (%)', goal: 'occurrenceGoal' as const,    higherBetter: false },
  { key: 'damageRate' as const,      label: 'Taxa Avaria (%)',    goal: 'damageGoal' as const,          higherBetter: false },
  { key: 'invoiceAccuracy' as const, label: 'Precisão Fatura (%)', goal: 'invoiceGoal' as const,       higherBetter: true  },
  { key: 'nps' as const,             label: 'NPS',               goal: 'npsGoal' as const,              higherBetter: true  },
];

export default function CarrierScorecard() {
  const [selected, setSelected] = useState('Total Express');
  const sc = SCORECARDS.find((s) => s.carrier === selected) ?? SCORECARDS[0];

  function isGoalMet(val: number, goal: number, higherBetter: boolean): boolean {
    return higherBetter ? val >= goal : val <= goal;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Scorecard de Transportadoras</h1>
          <p className="text-slate-500 text-sm mt-0.5">Avaliação de desempenho com SLA, avarias e reclamações</p>
        </div>
        <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-medium">Fevereiro 2026</span>
      </div>

      {/* Ranking overview */}
      <div className="grid grid-cols-5 gap-3">
        {[...SCORECARDS].sort((a, b) => b.overall - a.overall).map((s, i) => (
          <button
            key={s.carrier}
            onClick={() => setSelected(s.carrier)}
            className={`p-4 rounded-xl border transition-all text-left ${selected === s.carrier ? 'border-emerald-300 bg-emerald-50 shadow-sm' : 'border-slate-100 bg-white hover:border-slate-200'}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xl font-black ${i === 0 ? 'text-amber-400' : 'text-slate-300'}`}>#{i + 1}</span>
              {s.trend === 'up' ? <TrendingUp className="w-4 h-4 text-emerald-500" /> : s.trend === 'down' ? <TrendingDown className="w-4 h-4 text-red-500" /> : null}
            </div>
            <div className="text-sm font-semibold text-slate-800 mb-1">{s.carrier}</div>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, j) => (
                <Star key={j} className={`w-3 h-3 ${j < Math.round(s.overall / 20) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
              ))}
            </div>
            <div className={`text-2xl font-bold mt-1 ${s.overall >= 90 ? 'text-emerald-600' : s.overall >= 75 ? 'text-amber-600' : 'text-red-600'}`}>{s.overall}</div>
          </button>
        ))}
      </div>

      {/* Detailed scorecard for selected */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-slate-800">Detalhe — {sc.carrier}</h2>
          <span className={`text-3xl font-black ${sc.overall >= 90 ? 'text-emerald-600' : sc.overall >= 75 ? 'text-amber-600' : 'text-red-600'}`}>{sc.overall}/100</span>
        </div>
        <div className="space-y-4">
          {METRICS.map((m) => {
            const val = sc[m.key];
            const goal = sc[m.goal];
            const met = isGoalMet(val, goal, m.higherBetter);
            const pct = m.higherBetter ? (val / 100) * 100 : Math.max(0, 100 - (val / goal) * 50);
            return (
              <div key={m.key}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-slate-700">{m.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Meta: {goal}{m.key === 'nps' ? '' : '%'}</span>
                    <span className={`text-sm font-bold ${met ? 'text-emerald-600' : 'text-red-600'}`}>{val}{m.key === 'nps' ? '' : '%'}</span>
                    {met ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-red-500" />}
                  </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${met ? 'bg-emerald-500' : 'bg-red-400'}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* All carriers comparison table */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Comparativo Completo</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3 text-left">Transportadora</th>
              <th className="px-5 py-3 text-center">OTIF</th>
              <th className="px-5 py-3 text-center">Ocorrências</th>
              <th className="px-5 py-3 text-center">Avaria</th>
              <th className="px-5 py-3 text-center">Fatura OK</th>
              <th className="px-5 py-3 text-center">NPS</th>
              <th className="px-5 py-3 text-center">Score Final</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {[...SCORECARDS].sort((a, b) => b.overall - a.overall).map((s) => (
              <tr key={s.carrier} className={`hover:bg-slate-50 cursor-pointer transition-colors ${selected === s.carrier ? 'bg-emerald-50/30' : ''}`} onClick={() => setSelected(s.carrier)}>
                <td className="px-5 py-3.5 font-medium text-slate-800">{s.carrier}</td>
                <td className="px-5 py-3.5 text-center"><span className={`font-bold ${s.otif >= s.otifGoal ? 'text-emerald-600' : 'text-red-600'}`}>{s.otif}%</span></td>
                <td className="px-5 py-3.5 text-center"><span className={`font-medium ${s.occurrenceRate <= s.occurrenceGoal ? 'text-emerald-600' : 'text-red-600'}`}>{s.occurrenceRate}%</span></td>
                <td className="px-5 py-3.5 text-center"><span className={`font-medium ${s.damageRate <= s.damageGoal ? 'text-emerald-600' : 'text-red-600'}`}>{s.damageRate}%</span></td>
                <td className="px-5 py-3.5 text-center"><span className={`font-medium ${s.invoiceAccuracy >= s.invoiceGoal ? 'text-emerald-600' : 'text-amber-600'}`}>{s.invoiceAccuracy}%</span></td>
                <td className="px-5 py-3.5 text-center text-slate-700">{s.nps}</td>
                <td className="px-5 py-3.5 text-center">
                  <span className={`text-lg font-black ${s.overall >= 90 ? 'text-emerald-600' : s.overall >= 75 ? 'text-amber-600' : 'text-red-600'}`}>{s.overall}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
