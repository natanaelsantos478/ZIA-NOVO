import { Heart, AlertTriangle, CheckCircle, Clock, Activity, Calendar } from 'lucide-react';
import type { DeptRow } from '../OrgChart';

const EXAMS = [
  { name: 'Ana Beatriz Souza',   exam: 'ASO Periódico',         due: '2025-04-15', status: 'ok',       lastDone: '2024-04-15' },
  { name: 'Carlos Eduardo Lima', exam: 'ASO Admissional',       due: 'Realizado',  status: 'ok',       lastDone: '2022-07-01' },
  { name: 'Fernanda Rocha',      exam: 'ASO Periódico',         due: '2025-01-10', status: 'vencido',  lastDone: '2024-01-10' },
  { name: 'Guilherme Martins',   exam: 'ASO Admissional',       due: 'Realizado',  status: 'ok',       lastDone: '2023-09-05' },
  { name: 'Isabela Ferreira',    exam: 'Audiometria',           due: '2025-02-28', status: 'proximo',  lastDone: '2024-02-28' },
  { name: 'Leonardo Carvalho',   exam: 'Exame Oftalmológico',   due: '2025-03-10', status: 'proximo',  lastDone: '2024-03-10' },
];

const LEAVES = [
  { name: 'Isabela Ferreira', type: 'Licença Médica',     start: '2025-01-15', end: '2025-02-14', days: 30, cid: 'M54.5' },
  { name: 'Fernanda Rocha',   type: 'Férias',             start: '2025-01-20', end: '2025-02-09', days: 21, cid: '—'     },
];

const INDICATORS = [
  { label: 'Absenteísmo',     value: '3,8%',  ref: '< 3%', ok: false, icon: AlertTriangle },
  { label: 'Índice de Saúde', value: '82/100', ref: '> 80', ok: true,  icon: Heart         },
  { label: 'Exames em Dia',   value: '66%',    ref: '> 90%', ok: false, icon: CheckCircle  },
  { label: 'Licenças/mês',    value: '1',      ref: '≤ 2',  ok: true,  icon: Calendar      },
];

const STATUS_CFG = {
  ok:      { label: 'Em dia',   cls: 'bg-green-100 text-green-700', icon: CheckCircle  },
  vencido: { label: 'Vencido',  cls: 'bg-red-100 text-red-700',     icon: AlertTriangle},
  proximo: { label: 'Próximo',  cls: 'bg-amber-100 text-amber-700', icon: Clock        },
};

export default function TabSaude({ dept: _dept }: { dept: DeptRow }) {
  return (
    <div className="p-8 space-y-6">
      {/* Indicators */}
      <div className="grid grid-cols-4 gap-4">
        {INDICATORS.map(({ label, value, ref, ok, icon: Icon }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-500">{label}</span>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${ok ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <p className={`text-2xl font-bold ${ok ? 'text-slate-800' : 'text-red-600'}`}>{value}</p>
            <p className="text-xs text-slate-400 mt-1">Referência: {ref}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* ASO & Exams */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-700">ASO & Exames Ocupacionais</h3>
            <Activity className="w-4 h-4 text-slate-400" />
          </div>
          <div className="divide-y divide-slate-100">
            {EXAMS.map((e) => {
              const s = STATUS_CFG[e.status as keyof typeof STATUS_CFG];
              const Icon = s.icon;
              return (
                <div key={e.name} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{e.name}</p>
                    <p className="text-xs text-slate-400">{e.exam} · último: {e.lastDone}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-mono">{e.due}</span>
                    <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${s.cls}`}>
                      <Icon className="w-3 h-3" /> {s.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Afastamentos */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-700">Afastamentos Ativos</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {LEAVES.map((l) => (
                <div key={l.name} className="px-6 py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-slate-800">{l.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{l.type} · CID: {l.cid}</p>
                    </div>
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{l.days} dias</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                    <Calendar className="w-3 h-3" />
                    <span>{l.start} → {l.end}</span>
                  </div>
                </div>
              ))}
              {LEAVES.length === 0 && (
                <p className="px-6 py-4 text-sm text-slate-400">Nenhum afastamento ativo.</p>
              )}
            </div>
          </div>

          {/* Absenteísmo chart */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="font-semibold text-slate-700 mb-4">Absenteísmo — Últimos 6 meses</h3>
            <div className="flex items-end gap-2 h-20">
              {[
                { month: 'Ago', pct: 2.1 }, { month: 'Set', pct: 3.0 },
                { month: 'Out', pct: 1.8 }, { month: 'Nov', pct: 4.2 },
                { month: 'Dez', pct: 2.7 }, { month: 'Jan', pct: 3.8 },
              ].map(({ month, pct }) => (
                <div key={month} className="flex flex-col items-center flex-1">
                  <span className="text-[10px] text-slate-500 mb-1">{pct}%</span>
                  <div
                    className={`w-full rounded-t ${pct > 3 ? 'bg-red-400' : 'bg-pink-300'}`}
                    style={{ height: `${(pct / 5) * 60}px` }}
                  />
                  <span className="text-[10px] text-slate-400 mt-1">{month}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-3 text-center">Referência: &lt; 3% — linha vermelha indica acima do limite</p>
          </div>
        </div>
      </div>
    </div>
  );
}
