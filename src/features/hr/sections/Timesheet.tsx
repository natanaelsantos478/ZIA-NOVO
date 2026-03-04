import { useState, useEffect } from 'react';
import { getTimesheetEntries, TimesheetEntry as HrEntry } from '../../../lib/hr';
import {
  ChevronLeft, ChevronRight, Download, AlertTriangle,
  CheckCircle, Clock, Search, User,
} from 'lucide-react';

interface PunchRecord {
  date: string;
  weekday: string;
  expected: string;
  entryIn: string;
  breakOut: string;
  breakIn: string;
  exitOut: string;
  worked: string;
  balance: string;
  status: 'ok' | 'inconsistency' | 'absence' | 'holiday' | 'weekend';
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function mapEntry(e: HrEntry): PunchRecord {
  const d = new Date(e.date + 'T00:00:00');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return {
    date: `${day}/${month}`,
    weekday: WEEKDAYS[d.getDay()],
    expected: e.expected_hours ?? '—',
    entryIn:  e.entry_in    ?? '—',
    breakOut: e.break_out   ?? '—',
    breakIn:  e.break_in    ?? '—',
    exitOut:  e.exit_out    ?? '—',
    worked:   e.worked_hours ?? '—',
    balance:  e.balance     ?? '—',
    status:   (e.status as PunchRecord['status']) || 'ok',
  };
}

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const ROW_STYLE: Record<PunchRecord['status'], string> = {
  ok:            'hover:bg-green-50/30',
  inconsistency: 'bg-amber-50/60 hover:bg-amber-50',
  absence:       'bg-rose-50/60 hover:bg-rose-50',
  holiday:       'bg-blue-50/40 hover:bg-blue-50',
  weekend:       'bg-slate-50/50 text-slate-400',
};

const STATUS_BADGE: Record<PunchRecord['status'], { label: string; color: string }> = {
  ok:            { label: 'OK',            color: 'text-green-600'  },
  inconsistency: { label: 'Inconsistência', color: 'text-amber-600' },
  absence:       { label: 'Falta',         color: 'text-rose-600'   },
  holiday:       { label: 'Feriado',       color: 'text-blue-600'   },
  weekend:       { label: '—',             color: 'text-slate-400'  },
};

export default function Timesheet() {
  const [allEntries, setAllEntries] = useState<HrEntry[]>([]);
  const [employeeNames, setEmployeeNames] = useState<string[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [monthIndex, setMonthIndex] = useState(new Date().getMonth());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTimesheetEntries().then((data) => {
      setAllEntries(data);
      const names = [...new Set(data.map((e) => e.employee_name).filter(Boolean))] as string[];
      setEmployeeNames(names);
      if (names.length > 0) setSelectedEmployee(names[0]);
      setLoading(false);
    });
  }, []);

  const monthStr = String(monthIndex + 1).padStart(2, '0');
  const records = allEntries
    .filter((e) => e.employee_name === selectedEmployee && e.date.includes(`-${monthStr}-`))
    .map(mapEntry);

  const workingDays = records.filter((r) => r.status !== 'weekend' && r.status !== 'holiday');
  const workedDays  = workingDays.filter((r) => r.status === 'ok' || r.status === 'inconsistency');
  const absences    = workingDays.filter((r) => r.status === 'absence').length;
  const inconsistencies = records.filter((r) => r.status === 'inconsistency').length;
  const totalBalance = '—';

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Folha de Ponto (Espelho)</h1>
          <p className="text-slate-500 text-sm mt-1">Entradas, saídas, intervalos e inconsistências por colaborador</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 font-medium shadow-sm">
          <Download className="w-4 h-4" /> Exportar Espelho (PDF)
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 mb-6">
        {/* Employee selector */}
        <div className="relative">
          <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400 bg-white font-medium text-slate-700"
          >
            {employeeNames.map((e) => <option key={e}>{e}</option>)}
          </select>
        </div>

        {/* Month navigator */}
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2">
          <button
            onClick={() => setMonthIndex((m) => Math.max(0, m - 1))}
            className="text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-slate-700 w-28 text-center">
            {MONTHS[monthIndex]} / 2025
          </span>
          <button
            onClick={() => setMonthIndex((m) => Math.min(11, m + 1))}
            className="text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Search within month */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Filtrar por data..."
            className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400 w-44"
          />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Dias Úteis',      value: `${workingDays.length}`,  icon: Clock,          color: 'text-slate-600 bg-slate-100'   },
          { label: 'Dias Trabalhados', value: `${workedDays.length}`,   icon: CheckCircle,    color: 'text-green-600 bg-green-50'    },
          { label: 'Faltas',          value: `${absences}`,            icon: AlertTriangle,  color: 'text-rose-600 bg-rose-50'      },
          { label: 'Inconsistências', value: `${inconsistencies}`,     icon: AlertTriangle,  color: 'text-amber-600 bg-amber-50'    },
          { label: 'Saldo do Mês',    value: totalBalance,             icon: Clock,          color: 'text-blue-600 bg-blue-50'      },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${s.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs text-slate-500">{s.label}</span>
              </div>
              <p className="text-xl font-bold text-slate-800">{s.value}</p>
            </div>
          );
        })}
      </div>

      {/* Inconsistency banner */}
      {inconsistencies > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 mb-5">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">{inconsistencies} inconsistência(s) encontrada(s)</span> neste mês —
            batidas sem par ou intervalos não registrados. Linhas destacadas em amarelo.
          </p>
        </div>
      )}

      {/* Timesheet table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">Data</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-12">Dia</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Jornada</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Entrada</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Saída Intervalo</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Retorno</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Saída</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Trab.</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Saldo</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={10} className="text-center py-10 text-slate-400 text-sm">Carregando...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-10 text-slate-400 text-sm">Nenhum registro encontrado.</td></tr>
              ) : records.map((row) => {
                const badge = STATUS_BADGE[row.status];
                const style = ROW_STYLE[row.status];
                return (
                  <tr key={row.date} className={`transition-colors ${style}`}>
                    <td className="px-4 py-2.5 font-mono text-xs font-semibold text-slate-700">{row.date}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{row.weekday}</td>
                    <td className="px-4 py-2.5 text-center text-xs text-slate-500">{row.expected}</td>
                    <td className={`px-4 py-2.5 text-center font-mono text-xs ${row.status === 'inconsistency' && row.entryIn !== '—' && parseInt(row.entryIn.split(':')[1]) > 10 ? 'text-amber-600 font-semibold' : 'text-slate-700'}`}>
                      {row.entryIn}
                    </td>
                    <td className={`px-4 py-2.5 text-center font-mono text-xs ${row.breakOut === '—' && row.status === 'inconsistency' ? 'text-amber-600 font-bold' : 'text-slate-700'}`}>
                      {row.breakOut}
                    </td>
                    <td className="px-4 py-2.5 text-center font-mono text-xs text-slate-700">{row.breakIn}</td>
                    <td className="px-4 py-2.5 text-center font-mono text-xs text-slate-700">{row.exitOut}</td>
                    <td className="px-4 py-2.5 text-center font-mono text-xs font-semibold text-slate-800">{row.worked}</td>
                    <td className={`px-4 py-2.5 text-center font-mono text-xs font-semibold ${
                      row.balance.startsWith('+') ? 'text-green-600' : row.balance.startsWith('-') ? 'text-rose-600' : 'text-slate-400'
                    }`}>
                      {row.balance}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`text-xs font-semibold ${badge.color}`}>{badge.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>

          </table>
        </div>

        {/* Footer summary */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/60">
          <div className="flex gap-6 text-xs">
            <span className="text-slate-500">Funcionário: <span className="font-semibold text-slate-700">{selectedEmployee}</span></span>
            <span className="text-slate-500">Competência: <span className="font-semibold text-slate-700">{MONTHS[monthIndex]}/2025</span></span>
            <span className="text-slate-500">Jornada Contratual: <span className="font-semibold text-slate-700">44h/semana · 8h/dia</span></span>
          </div>
          <div className="flex gap-6 text-xs">
            <span className="text-slate-500">Total Trabalhado: <span className="font-semibold text-green-700">160h 47min</span></span>
            <span className="text-slate-500">Saldo Acumulado: <span className="font-semibold text-blue-700">+01:02</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}
