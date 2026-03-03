import { useState } from 'react';
import {
  Plus, Sparkles, AlertTriangle, CheckCircle,
  ChevronLeft, ChevronRight, Users, Clock,
  MoreHorizontal,
} from 'lucide-react';

type ShiftType = '5x2' | '12x36' | 'Rotativa' | 'Personalizada';

interface Shift {
  id: string;
  name: string;
  type: ShiftType;
  start: string;
  end: string;
  breakMinutes: number;
  weeklyHours: string;
  employees: number;
  color: string;
}

const SHIFTS: Shift[] = [
  { id: 'S1', name: 'Turno Manhã',      type: '5x2',        start: '06:00', end: '14:00', breakMinutes: 60,  weeklyHours: '40h', employees: 84, color: 'bg-blue-500'   },
  { id: 'S2', name: 'Turno Tarde',      type: '5x2',        start: '14:00', end: '22:00', breakMinutes: 60,  weeklyHours: '40h', employees: 72, color: 'bg-indigo-500' },
  { id: 'S3', name: 'Turno Noite',      type: '12x36',      start: '22:00', end: '10:00', breakMinutes: 60,  weeklyHours: '36h', employees: 28, color: 'bg-slate-600'  },
  { id: 'S4', name: 'Comercial',        type: '5x2',        start: '08:00', end: '18:00', breakMinutes: 60,  weeklyHours: '44h', employees: 56, color: 'bg-pink-500'   },
  { id: 'S5', name: 'Plantão Semanal',  type: 'Rotativa',   start: '07:00', end: '19:00', breakMinutes: 60,  weeklyHours: '42h', employees: 8,  color: 'bg-amber-500'  },
];

const TYPE_BADGE: Record<ShiftType, string> = {
  '5x2':         'bg-blue-100 text-blue-700',
  '12x36':       'bg-indigo-100 text-indigo-700',
  'Rotativa':    'bg-amber-100 text-amber-700',
  'Personalizada': 'bg-purple-100 text-purple-700',
};

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const CALENDAR_DATES = Array.from({ length: 28 }, (_, i) => i + 3); // 3 Feb → 28 Feb (Mon start)

// Simulate which shift covers each day
function shiftForDay(shiftId: string, dayIndex: number): boolean {
  if (shiftId === 'S1' || shiftId === 'S2' || shiftId === 'S4') {
    // 5x2: Mon–Fri
    const dow = (dayIndex + 1) % 7; // 3 Feb = Monday => index 0 => dow 1
    return dow >= 1 && dow <= 5;
  }
  if (shiftId === 'S3') {
    // 12x36: alternating
    return dayIndex % 3 !== 0;
  }
  if (shiftId === 'S5') {
    // Rotativa: every 7 days
    return dayIndex % 7 < 4;
  }
  return false;
}

interface ZIAAlert {
  type: 'conflict' | 'warning' | 'suggestion';
  message: string;
}

const ZIA_ALERTS: ZIAAlert[] = [
  { type: 'conflict',    message: 'Conflito detectado: 3 funcionários do Turno Noite estão escalados para o Turno Manhã em 17/02 (feriado).' },
  { type: 'warning',     message: 'Plantão Semanal (S5) com apenas 8 colaboradores — cobertura insuficiente para o pico de demanda de segunda-feira.' },
  { type: 'suggestion',  message: 'Histórico indica 22% de absenteísmo às sextas no Turno Tarde. Considere adicionar um folguista para cobertura.' },
  { type: 'suggestion',  message: 'Turno Noite: 4 funcionários com banco de horas negativo acumulado. Otimizar para reduzir horas extras.' },
];

const ALERT_STYLE: Record<ZIAAlert['type'], { bg: string; icon: React.ElementType; text: string }> = {
  conflict:   { bg: 'bg-rose-50 border-rose-200',   icon: AlertTriangle, text: 'text-rose-700'   },
  warning:    { bg: 'bg-amber-50 border-amber-200',  icon: AlertTriangle, text: 'text-amber-700'  },
  suggestion: { bg: 'bg-blue-50 border-blue-200',    icon: Sparkles,      text: 'text-blue-700'   },
};

const SUB_TABS = [
  { id: 'list',     label: 'Escalas Cadastradas' },
  { id: 'calendar', label: 'Calendário'          },
  { id: 'zia',      label: 'ZIA – Otimização'    },
  { id: 'new',      label: 'Nova Escala'         },
];

import { Trash2 } from 'lucide-react';

function ShiftListTab({ shifts, onDelete, onNew }: { shifts: Shift[], onDelete: (id: string) => void, onNew: () => void }) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={onNew} className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium">
          <Plus className="w-4 h-4" /> Nova Escala
        </button>
      </div>
      <div className="space-y-3">
        {shifts.map((shift) => (
          <div key={shift.id} className="flex items-center gap-4 bg-slate-50 rounded-xl border border-slate-100 p-4 hover:shadow-sm transition-shadow">
            <div className={`w-3 h-12 rounded-full ${shift.color} shrink-0`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-slate-800">{shift.name}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${TYPE_BADGE[shift.type]}`}>
                  {shift.type}
                </span>
              </div>
              <div className="flex gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{shift.start} – {shift.end}</span>
                <span>Intervalo: {shift.breakMinutes}min</span>
                <span>Carga: {shift.weeklyHours}/semana</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="flex items-center gap-1 text-slate-600 text-sm">
                <Users className="w-4 h-4 text-slate-400" />
                <span className="font-semibold">{shift.employees}</span>
                <span className="text-xs text-slate-400">func.</span>
              </div>
            </div>
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === shift.id ? null : shift.id); }}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {openMenuId === shift.id && (
                <div className="absolute right-0 mt-2 w-32 bg-white border border-slate-200 rounded-lg shadow-lg z-10 py-1">
                  <button
                    onClick={() => { onDelete(shift.id); setOpenMenuId(null); }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CalendarTab({ shifts }: { shifts: Shift[] }) {
  const [, setWeekOffset] = useState(0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset((w) => w - 1)} className="p-1.5 text-slate-500 hover:text-slate-700 bg-slate-100 rounded-lg">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-slate-700">Fevereiro 2025</span>
          <button onClick={() => setWeekOffset((w) => w + 1)} className="p-1.5 text-slate-500 hover:text-slate-700 bg-slate-100 rounded-lg">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap max-w-lg justify-end">
          {shifts.map((s) => (
            <div key={s.id} className="flex items-center gap-1.5 text-xs text-slate-600">
              <div className={`w-3 h-3 rounded-sm ${s.color}`} />
              {s.name.split(' ').slice(-1)[0]}
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto pb-4">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="text-left px-3 py-2 text-slate-500 font-semibold w-40">Escala</th>
              {WEEKDAYS.map((d) => (
                <th key={d} className="text-center px-1 py-2 text-slate-500 font-semibold w-10">{d}</th>
              ))}
              {WEEKDAYS.map((d) => (
                <th key={d + '2'} className="text-center px-1 py-2 text-slate-500 font-semibold w-10">{d}</th>
              ))}
              {WEEKDAYS.map((d, i) => i < 2 && (
                <th key={d + '3'} className="text-center px-1 py-2 text-slate-500 font-semibold w-10">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shifts.map((shift) => (
              <tr key={shift.id} className="hover:bg-slate-50/60">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-sm ${shift.color} shrink-0`} />
                    <span className="font-medium text-slate-700">{shift.name}</span>
                  </div>
                </td>
                {CALENDAR_DATES.map((day, idx) => {
                  const active = shiftForDay(shift.id, idx);
                  const isWeekend = (idx % 7 === 5) || (idx % 7 === 6);
                  return (
                    <td key={day} className={`text-center py-2 px-0.5 ${isWeekend ? 'opacity-30' : ''}`}>
                      {active ? (
                        <div className={`mx-auto w-7 h-7 rounded-lg ${shift.color} opacity-80 flex items-center justify-center text-white font-bold`}>
                          {day}
                        </div>
                      ) : (
                        <div className="mx-auto w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                          {day}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ZIATab() {
  return (
    <div>
      {/* ZIA header */}
      <div className="flex items-center gap-3 bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-200 rounded-xl p-4 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-semibold text-slate-800">ZIA – Análise de Escalas</p>
          <p className="text-xs text-slate-500 mt-0.5">Conflitos detectados, alertas de cobertura e sugestões de otimização baseadas em histórico de absenteísmo</p>
        </div>
        <button className="ml-auto px-4 py-2 text-sm font-semibold text-white bg-pink-600 rounded-lg hover:bg-pink-700 flex items-center gap-2 shrink-0">
          <Sparkles className="w-3.5 h-3.5" /> Reanalisar
        </button>
      </div>

      <div className="space-y-3 mb-8">
        {ZIA_ALERTS.map((alert, i) => {
          const cfg = ALERT_STYLE[alert.type];
          const Icon = cfg.icon;
          return (
            <div key={i} className={`flex items-start gap-3 border rounded-xl p-4 ${cfg.bg}`}>
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.text}`} />
              <div className="flex-1">
                <span className={`text-xs font-bold uppercase tracking-wider ${cfg.text} mr-2`}>
                  {alert.type === 'conflict' ? 'Conflito' : alert.type === 'warning' ? 'Atenção' : 'Sugestão'}
                </span>
                <span className="text-sm text-slate-700">{alert.message}</span>
              </div>
              {alert.type === 'conflict' && (
                <button className="px-3 py-1 text-xs font-semibold text-rose-700 bg-rose-100 rounded-lg hover:bg-rose-200 shrink-0">
                  Resolver
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Absenteeism chart (simplified bar representation) */}
      <div className="bg-slate-50 rounded-xl border border-slate-100 p-5">
        <h3 className="font-semibold text-slate-700 mb-4">Histórico de Absenteísmo por Dia da Semana</h3>
        <div className="flex items-end gap-3 h-32">
          {[
            { day: 'Seg', pct: 12 },
            { day: 'Ter', pct: 8  },
            { day: 'Qua', pct: 9  },
            { day: 'Qui', pct: 11 },
            { day: 'Sex', pct: 22 },
          ].map((d) => (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs font-semibold text-slate-600">{d.pct}%</span>
              <div className="w-full flex items-end justify-center">
                <div
                  className={`w-full rounded-t-lg ${d.pct > 18 ? 'bg-rose-400' : d.pct > 12 ? 'bg-amber-400' : 'bg-blue-400'}`}
                  style={{ height: `${(d.pct / 25) * 100}px` }}
                />
              </div>
              <span className="text-xs text-slate-500">{d.day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { v4 as uuidv4 } from 'uuid';

const SHIFT_COLORS = [
  'bg-blue-500', 'bg-indigo-500', 'bg-slate-600', 'bg-pink-500',
  'bg-amber-500', 'bg-emerald-500', 'bg-purple-500', 'bg-cyan-500'
];

function NewShiftTab({ onAdd, onSuccess }: { onAdd: (shift: Shift) => void, onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [type, setType] = useState<ShiftType>('5x2');
  const [start, setStart] = useState('08:00');
  const [end, setEnd] = useState('17:00');
  const [breakMinutes, setBreakMinutes] = useState(60);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // default Mon-Fri
  const [error, setError] = useState('');

  const handleDayToggle = (index: number) => {
    if (selectedDays.includes(index)) {
      setSelectedDays(selectedDays.filter(d => d !== index));
    } else {
      setSelectedDays([...selectedDays, index].sort());
    }
  };

  const calculateWeeklyHours = () => {
    // simplified calculation
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    if (isNaN(h1) || isNaN(h2)) return '0h';

    let dailyMins = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (dailyMins < 0) dailyMins += 24 * 60; // crossed midnight
    dailyMins -= breakMinutes;

    if (type === '12x36') return '36h';

    const weeklyMins = dailyMins * selectedDays.length;
    return `${Math.floor(weeklyMins / 60)}h`;
  };

  const handleSave = () => {
    if (!name.trim()) {
      setError('Por favor, insira o nome da escala.');
      return;
    }
    if (!start || !end) {
      setError('Horários de entrada e saída são obrigatórios.');
      return;
    }

    const newShift: Shift = {
      id: uuidv4(),
      name: name.trim(),
      type,
      start,
      end,
      breakMinutes,
      weeklyHours: calculateWeeklyHours(),
      employees: 0,
      color: SHIFT_COLORS[Math.floor(Math.random() * SHIFT_COLORS.length)]
    };

    onAdd(newShift);
    onSuccess();
  };

  return (
    <div className="max-w-xl space-y-4">
      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
          {error}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nome da Escala *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Turno Manhã Industrial"
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tipo de Escala *</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ShiftType)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400 bg-white"
          >
            <option value="5x2">5x2 (Segunda a Sexta)</option>
            <option value="12x36">12x36</option>
            <option value="Rotativa">Rotativa</option>
            <option value="Personalizada">Personalizada</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Hora de Entrada *</label>
          <input
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Hora de Saída *</label>
          <input
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Intervalo (minutos) *</label>
          <input
            type="number"
            value={breakMinutes}
            onChange={(e) => setBreakMinutes(Number(e.target.value))}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tolerância de atraso (min)</label>
          <input type="number" defaultValue={10} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Dias da Semana *</label>
        <div className="flex gap-2">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d, i) => (
            <button
              key={d}
              onClick={() => handleDayToggle(i)}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${
                selectedDays.includes(i) ? 'bg-pink-600 text-white border-pink-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3 pt-2">
        <button className="px-3 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-pink-500" /> ZIA – Verificar Conflitos
        </button>
        <button onClick={handleSave} className="px-6 py-2 text-sm font-semibold text-white bg-pink-600 rounded-lg hover:bg-pink-700">
          Salvar Escala
        </button>
      </div>
    </div>
  );
}

export default function Schedules() {
  const [activeTab, setActiveTab] = useState('list');
  const [shifts, setShifts] = useState<Shift[]>(SHIFTS);

  const handleAddShift = (newShift: Shift) => {
    setShifts([...shifts, newShift]);
  };

  const handleDeleteShift = (id: string) => {
    setShifts(shifts.filter(s => s.id !== id));
  };

  const totalEmployees = shifts.reduce((s, sh) => s + sh.employees, 0);

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Escalas Pré-Programadas</h1>
          <p className="text-slate-500 text-sm mt-1">Criação e gestão de escalas com detecção de conflitos por ZIA</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg px-4 py-2 shadow-sm">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span><span className="font-semibold">{shifts.length}</span> escalas ativas · <span className="font-semibold">{totalEmployees}</span> funcionários</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex border-b border-slate-100 px-6 pt-4 gap-6">
          {SUB_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-semibold transition-all border-b-2 -mb-px flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'text-pink-600 border-pink-600'
                  : 'text-slate-500 border-transparent hover:text-slate-700'
              }`}
            >
              {tab.id === 'zia' && <Sparkles className="w-3.5 h-3.5" />}
              {tab.label}
            </button>
          ))}
        </div>
        <div className="p-6">
          {activeTab === 'list'     && <ShiftListTab shifts={shifts} onDelete={handleDeleteShift} onNew={() => setActiveTab('new')} />}
          {activeTab === 'calendar' && <CalendarTab shifts={shifts} />}
          {activeTab === 'zia'      && <ZIATab />}
          {activeTab === 'new'      && <NewShiftTab onAdd={handleAddShift} onSuccess={() => setActiveTab('list')} />}
        </div>
      </div>
    </div>
  );
}
