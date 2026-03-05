import { useState } from 'react';
import { Calendar, Clock, User, AlertTriangle, CheckCircle2, Plus } from 'lucide-react';

interface DriverDay {
  driver: string;
  date: string;
  startTime: string;
  endTime: string;
  breaks: number;
  workHours: number;
  status: 'Regular' | 'Hora extra' | 'Folga' | 'Férias' | 'Falta';
  note?: string;
}

const SCHEDULE: DriverDay[] = [
  { driver: 'Carlos Silva',   date: '05/03/2026', startTime: '07:00', endTime: '16:30', breaks: 1, workHours: 8.5, status: 'Regular' },
  { driver: 'Amanda Costa',   date: '05/03/2026', startTime: '06:00', endTime: '18:00', breaks: 1, workHours: 11,  status: 'Hora extra', note: 'Autorizado pela gerência — carga urgente' },
  { driver: 'Roberto Lima',   date: '05/03/2026', startTime: '07:00', endTime: '16:00', breaks: 1, workHours: 8,   status: 'Regular' },
  { driver: 'Fernanda Souza', date: '05/03/2026', startTime: '07:30', endTime: '16:30', breaks: 1, workHours: 8,   status: 'Regular' },
  { driver: 'Pedro Alves',    date: '05/03/2026', startTime: '—',     endTime: '—',     breaks: 0, workHours: 0,   status: 'Folga' },
  { driver: 'Marcos Duarte',  date: '05/03/2026', startTime: '—',     endTime: '—',     breaks: 0, workHours: 0,   status: 'Férias', note: 'Férias 01/03 a 15/03/2026' },
  { driver: 'Julia Santos',   date: '05/03/2026', startTime: '—',     endTime: '—',     breaks: 0, workHours: 0,   status: 'Falta', note: 'Atestado médico apresentado' },
];

const STATUS_BADGE: Record<string, string> = {
  'Regular':    'bg-emerald-100 text-emerald-700',
  'Hora extra': 'bg-amber-100 text-amber-700',
  'Folga':      'bg-blue-100 text-blue-700',
  'Férias':     'bg-purple-100 text-purple-700',
  'Falta':      'bg-red-100 text-red-700',
};

const COMPLIANCE_DATA = [
  { driver: 'Carlos Silva',   weekHours: 40.5, limit: 44, overtime: 0,  status: 'OK'   },
  { driver: 'Amanda Costa',   weekHours: 52.0, limit: 44, overtime: 8,  status: 'Alerta' },
  { driver: 'Roberto Lima',   weekHours: 38.0, limit: 44, overtime: 0,  status: 'OK'   },
  { driver: 'Fernanda Souza', weekHours: 40.0, limit: 44, overtime: 0,  status: 'OK'   },
  { driver: 'Pedro Alves',    weekHours: 32.0, limit: 44, overtime: 0,  status: 'OK'   },
];

export default function DriverSchedule() {
  const [week] = useState('05/03/2026');

  const overtimeCount = SCHEDULE.filter((d) => d.status === 'Hora extra').length;
  const faultCount = SCHEDULE.filter((d) => d.status === 'Falta').length;
  const activeCount = SCHEDULE.filter((d) => d.status === 'Regular' || d.status === 'Hora extra').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Jornada do Motorista</h1>
          <p className="text-slate-500 text-sm mt-0.5">Horas trabalhadas, pausas e compliance trabalhista</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-700">Semana de {week}</span>
          </div>
          <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
            <Plus className="w-4 h-4" />
            Ajuste de Jornada
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Motoristas Ativos',  value: activeCount,    icon: User,          color: 'emerald' },
          { label: 'Com Hora Extra',     value: overtimeCount,  icon: Clock,         color: 'amber'   },
          { label: 'Faltas',             value: faultCount,     icon: AlertTriangle, color: 'red'     },
          { label: 'Conformidade CLT',   value: '80%',          icon: CheckCircle2,  color: 'blue'    },
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

      {/* Today's schedule */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Jornada de Hoje — {week}</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-5 py-3 text-left">Motorista</th>
              <th className="px-5 py-3 text-center">Entrada</th>
              <th className="px-5 py-3 text-center">Saída</th>
              <th className="px-5 py-3 text-center">Intervalos</th>
              <th className="px-5 py-3 text-center">Horas Trab.</th>
              <th className="px-5 py-3 text-center">Status</th>
              <th className="px-5 py-3 text-left">Obs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {SCHEDULE.map((d) => (
              <tr key={d.driver} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3.5 font-medium text-slate-800">{d.driver}</td>
                <td className="px-5 py-3.5 text-center text-slate-600">{d.startTime}</td>
                <td className="px-5 py-3.5 text-center text-slate-600">{d.endTime}</td>
                <td className="px-5 py-3.5 text-center text-slate-600">{d.breaks > 0 ? `${d.breaks}h` : '—'}</td>
                <td className="px-5 py-3.5 text-center">
                  {d.workHours > 0 ? (
                    <span className={`font-bold ${d.workHours > 10 ? 'text-red-600' : 'text-slate-700'}`}>{d.workHours}h</span>
                  ) : <span className="text-slate-400">—</span>}
                </td>
                <td className="px-5 py-3.5 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[d.status]}`}>{d.status}</span>
                </td>
                <td className="px-5 py-3.5 text-xs text-slate-500">{d.note ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CLT Compliance */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Controle Semanal — Compliance CLT</h2>
        </div>
        <div className="divide-y divide-slate-50">
          {COMPLIANCE_DATA.map((c) => (
            <div key={c.driver} className="px-5 py-4 flex items-center gap-4">
              <span className="text-sm font-medium text-slate-800 w-36 flex-shrink-0">{c.driver}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1 bg-slate-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${c.weekHours > c.limit ? 'bg-red-500' : c.weekHours > 40 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min((c.weekHours / c.limit) * 100, 100)}%` }}
                    />
                  </div>
                  <span className={`text-sm font-bold w-14 text-right ${c.weekHours > c.limit ? 'text-red-600' : 'text-slate-700'}`}>{c.weekHours}h</span>
                  <span className="text-xs text-slate-500">/ {c.limit}h</span>
                </div>
                {c.overtime > 0 && <span className="text-xs text-amber-600">{c.overtime}h extras autorizadas</span>}
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${c.status === 'OK' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{c.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
