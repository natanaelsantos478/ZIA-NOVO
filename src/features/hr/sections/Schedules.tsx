import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Sparkles, AlertTriangle, CheckCircle,
  ChevronLeft, ChevronRight, Users, Clock, Edit2, Trash2, X, Save,
} from 'lucide-react';
import {
  getSchedules, createSchedule, updateSchedule, deleteSchedule,
  getEmployees, assignScheduleToEmployee,
} from '../../../lib/hr';
import type { Schedule, Employee as HrEmployee } from '../../../lib/hr';

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_BADGE: Record<string, string> = {
  '5x2':           'bg-blue-100 text-blue-700',
  '6x1':           'bg-emerald-100 text-emerald-700',
  '12x36':         'bg-indigo-100 text-indigo-700',
  '4x3':           'bg-orange-100 text-orange-700',
  'Rotativa':      'bg-amber-100 text-amber-700',
  'Personalizada': 'bg-purple-100 text-purple-700',
};

const WEEKDAY_KEYS  = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const WEEKDAY_FULL  = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const INPUT_CLS = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-400 bg-white';

const ZIA_ALERTS = [
  { type: 'warning'    as const, message: 'Verifique a cobertura para os picos de demanda às segundas-feiras — algumas escalas podem estar subalocadas.' },
  { type: 'suggestion' as const, message: 'Histórico indica maior absenteísmo às sextas no período da tarde. Considere adicionar folguistas para cobertura.' },
  { type: 'suggestion' as const, message: 'Funcionários no turno 12x36 com banco de horas acumulado. Otimize para reduzir horas extras.' },
];

// ── Calendar helpers ──────────────────────────────────────────────────────────

function isDayActive(schedule: Schedule, date: Date): boolean {
  if (schedule.type === '12x36') {
    const epochDay = Math.floor(date.getTime() / 86400000);
    return epochDay % 2 === 0;
  }
  const dow = date.getDay();
  return schedule.workdays.includes(WEEKDAY_KEYS[dow]);
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

// ── Edit Schedule Modal ────────────────────────────────────────────────────────

function EditScheduleModal({
  schedule, allEmployees, onClose, onSaved,
}: {
  schedule: Schedule;
  allEmployees: HrEmployee[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name:          schedule.name,
    type:          schedule.type ?? '5x2',
    entry_time:    schedule.entry_time?.slice(0, 5) ?? '08:00',
    exit_time:     schedule.exit_time?.slice(0, 5) ?? '17:00',
    break_minutes: schedule.break_minutes ?? 60,
    tolerance_min: schedule.tolerance_min ?? 5,
    workdays:      schedule.workdays ?? [],
    weekly_hours:  schedule.weekly_hours ?? 44,
    color:         schedule.color ?? '#6366f1',
  });
  const [selected, setSelected] = useState<Set<string>>(
    new Set(allEmployees.filter(e => e.shift_id === schedule.id).map(e => e.id))
  );
  const [saving, setSaving] = useState(false);

  const toggleDay = (key: string) =>
    setForm(f => ({
      ...f,
      workdays: f.workdays.includes(key)
        ? f.workdays.filter(d => d !== key)
        : [...f.workdays, key],
    }));

  const toggleEmployee = (id: string) =>
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSchedule(schedule.id, {
        name: form.name, type: form.type,
        entry_time: form.entry_time, exit_time: form.exit_time,
        break_minutes: form.break_minutes, tolerance_min: form.tolerance_min,
        workdays: form.workdays, weekly_hours: form.weekly_hours, color: form.color,
      });
      const prev = allEmployees.filter(e => e.shift_id === schedule.id).map(e => e.id);
      const toAdd    = [...selected].filter(id => !prev.includes(id));
      const toRemove = prev.filter(id => !selected.has(id));
      await Promise.all([
        ...toAdd.map(id => assignScheduleToEmployee(id, schedule.id)),
        ...toRemove.map(id => assignScheduleToEmployee(id, null)),
      ]);
      onSaved();
      onClose();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Editar Escala</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Nome *</label>
              <input className={INPUT_CLS} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Tipo</label>
              <select className={INPUT_CLS} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {['5x2','6x1','12x36','4x3','Rotativa','Personalizada'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Cor</label>
              <input type="color" className="w-full h-10 px-1 py-1 border border-slate-200 rounded-lg cursor-pointer"
                value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Entrada</label>
              <input type="time" className={INPUT_CLS} value={form.entry_time} onChange={e => setForm(f => ({ ...f, entry_time: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Saída</label>
              <input type="time" className={INPUT_CLS} value={form.exit_time} onChange={e => setForm(f => ({ ...f, exit_time: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Intervalo (min)</label>
              <input type="number" className={INPUT_CLS} value={form.break_minutes}
                onChange={e => setForm(f => ({ ...f, break_minutes: parseInt(e.target.value) || 60 }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Tolerância (min)</label>
              <input type="number" className={INPUT_CLS} value={form.tolerance_min}
                onChange={e => setForm(f => ({ ...f, tolerance_min: parseInt(e.target.value) || 5 }))} />
            </div>
          </div>

          {/* Weekdays */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Dias da Semana</label>
            <div className="flex gap-1.5">
              {WEEKDAY_KEYS.map((key, i) => (
                <button key={key} type="button" onClick={() => toggleDay(key)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${
                    form.workdays.includes(key)
                      ? 'bg-pink-600 text-white border-pink-600'
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}>
                  {WEEKDAY_FULL[i]}
                </button>
              ))}
            </div>
          </div>

          {/* Employee selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Funcionários nesta escala ({selected.size})
            </label>
            <div className="max-h-52 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-50 custom-scrollbar">
              {allEmployees.filter(e => e.status !== 'Inativo').map(emp => (
                <label key={emp.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" checked={selected.has(emp.id)} onChange={() => toggleEmployee(emp.id)}
                    className="accent-pink-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{emp.full_name}</p>
                    <p className="text-xs text-slate-400 truncate">{emp.position_title ?? '—'}</p>
                  </div>
                  {emp.shift_id && emp.shift_id !== schedule.id && (
                    <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-medium shrink-0">outra escala</span>
                  )}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-pink-600 rounded-lg hover:bg-pink-700 disabled:opacity-60">
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar Escala'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── New Schedule Modal ─────────────────────────────────────────────────────────

function NewScheduleModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: '', type: '5x2',
    entry_time: '08:00', exit_time: '17:00',
    break_minutes: 60, tolerance_min: 5,
    workdays: ['mon','tue','wed','thu','fri'],
    weekly_hours: 44, color: '#6366f1',
  });
  const [saving, setSaving] = useState(false);

  const toggleDay = (key: string) =>
    setForm(f => ({
      ...f,
      workdays: f.workdays.includes(key)
        ? f.workdays.filter(d => d !== key)
        : [...f.workdays, key],
    }));

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await createSchedule({ ...form, active: true });
      onSaved();
      onClose();
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Nova Escala</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Nome da Escala *</label>
              <input className={INPUT_CLS} value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Turno Manhã Industrial" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Tipo</label>
              <select className={INPUT_CLS} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {['5x2','6x1','12x36','4x3','Rotativa','Personalizada'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Cor</label>
              <input type="color" className="w-full h-10 px-1 py-1 border border-slate-200 rounded-lg cursor-pointer"
                value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Entrada</label>
              <input type="time" className={INPUT_CLS} value={form.entry_time} onChange={e => setForm(f => ({ ...f, entry_time: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Saída</label>
              <input type="time" className={INPUT_CLS} value={form.exit_time} onChange={e => setForm(f => ({ ...f, exit_time: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Intervalo (min)</label>
              <input type="number" className={INPUT_CLS} value={form.break_minutes}
                onChange={e => setForm(f => ({ ...f, break_minutes: parseInt(e.target.value) || 60 }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Tolerância (min)</label>
              <input type="number" className={INPUT_CLS} value={form.tolerance_min}
                onChange={e => setForm(f => ({ ...f, tolerance_min: parseInt(e.target.value) || 5 }))} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Dias da Semana</label>
            <div className="flex gap-1.5">
              {WEEKDAY_KEYS.map((key, i) => (
                <button key={key} type="button" onClick={() => toggleDay(key)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-all ${
                    form.workdays.includes(key)
                      ? 'bg-pink-600 text-white border-pink-600'
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}>
                  {WEEKDAY_FULL[i]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !form.name.trim()}
            className="px-5 py-2 text-sm font-semibold text-white bg-pink-600 rounded-lg hover:bg-pink-700 disabled:opacity-60">
            {saving ? 'Criando...' : 'Criar Escala'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Shift List Tab ─────────────────────────────────────────────────────────────

function ShiftListTab({
  schedules, employees, onRefresh,
}: {
  schedules: Schedule[];
  employees: HrEmployee[];
  onRefresh: () => void;
}) {
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [showNew, setShowNew] = useState(false);

  const empCount = (schId: string) => employees.filter(e => e.shift_id === schId).length;

  const handleDelete = async (s: Schedule) => {
    if (!confirm(`Excluir "${s.name}"? Os funcionários vinculados ficarão sem escala.`)) return;
    try {
      await deleteSchedule(s.id);
      onRefresh();
    } catch (err) { console.error(err); }
  };

  return (
    <div>
      {editing && (
        <EditScheduleModal
          schedule={editing} allEmployees={employees}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); onRefresh(); }}
        />
      )}
      {showNew && (
        <NewScheduleModal
          onClose={() => setShowNew(false)}
          onSaved={() => { setShowNew(false); onRefresh(); }}
        />
      )}

      <div className="flex justify-end mb-4">
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium">
          <Plus className="w-4 h-4" /> Nova Escala
        </button>
      </div>

      <div className="space-y-3">
        {schedules.map(s => {
          const count = empCount(s.id);
          const avatars = employees.filter(e => e.shift_id === s.id).slice(0, 4);
          return (
            <div key={s.id} className="flex items-center gap-4 bg-slate-50 rounded-xl border border-slate-100 p-4 hover:shadow-sm transition-shadow">
              <div className="w-3 h-12 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-slate-800">{s.name}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${TYPE_BADGE[s.type ?? '5x2'] ?? 'bg-slate-100 text-slate-600'}`}>
                    {s.type}
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />{s.entry_time?.slice(0,5)} – {s.exit_time?.slice(0,5)}
                  </span>
                  <span>Intervalo: {s.break_minutes}min</span>
                  <span>Tolerância: {s.tolerance_min}min</span>
                  {s.workdays.length > 0 && (
                    <span>{s.workdays.map(d => WEEKDAY_FULL[WEEKDAY_KEYS.indexOf(d)]).filter(Boolean).join(', ')}</span>
                  )}
                </div>
                {count > 0 && (
                  <div className="flex items-center gap-1 mt-2">
                    {avatars.map(e => (
                      <div key={e.id} title={e.full_name}
                        className="w-6 h-6 rounded-full bg-slate-300 flex items-center justify-center text-[9px] font-bold text-slate-700">
                        {e.full_name.split(' ').slice(0,2).map(n => n[0]).join('').toUpperCase()}
                      </div>
                    ))}
                    {count > 4 && <span className="text-xs text-slate-400 ml-1">+{count - 4}</span>}
                  </div>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1 text-slate-600 text-sm">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span className="font-semibold">{count}</span>
                  <span className="text-xs text-slate-400">func.</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => setEditing(s)}
                  className="p-1.5 text-slate-400 hover:text-pink-600 transition-colors" title="Editar escala">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(s)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors" title="Excluir escala">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
        {schedules.length === 0 && (
          <p className="text-center text-slate-400 text-sm py-10">Nenhuma escala cadastrada. Crie a primeira escala.</p>
        )}
      </div>
    </div>
  );
}

// ── Calendar Tab ──────────────────────────────────────────────────────────────

function CalendarTab({ schedules }: { schedules: Schedule[] }) {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const days = getDaysInMonth(year, month);
  const firstDow = new Date(year, month, 1).getDay();
  const grid: (Date | null)[] = [...Array(firstDow).fill(null), ...days];
  while (grid.length % 7 !== 0) grid.push(null);

  const prevMonth = () => month === 0 ? (setMonth(11), setYear(y => y - 1)) : setMonth(m => m - 1);
  const nextMonth = () => month === 11 ? (setMonth(0), setYear(y => y + 1)) : setMonth(m => m + 1);

  const monthLabel = new Date(year, month, 1)
    .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 text-slate-500 hover:text-slate-700 bg-slate-100 rounded-lg">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-slate-700 capitalize">{monthLabel}</span>
          <button onClick={nextMonth} className="p-1.5 text-slate-500 hover:text-slate-700 bg-slate-100 rounded-lg">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {schedules.map(s => (
            <div key={s.id} className="flex items-center gap-1.5 text-xs text-slate-600">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: s.color }} />
              {s.name.split(' ').slice(0, 2).join(' ')}
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              {WEEKDAY_FULL.map(d => (
                <th key={d} className="text-center px-1 py-2 text-slate-400 font-semibold">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: grid.length / 7 }, (_, wi) => (
              <tr key={wi}>
                {grid.slice(wi * 7, wi * 7 + 7).map((date, di) => {
                  if (!date) return <td key={di} className="p-1" />;
                  const isToday = date.toDateString() === today.toDateString();
                  const active  = schedules.filter(s => isDayActive(s, date));
                  return (
                    <td key={di} className="p-1 align-top">
                      <div className={`min-h-[52px] rounded-lg p-1 ${isToday ? 'bg-pink-50 border border-pink-200' : 'border border-slate-100'}`}>
                        <p className={`text-[11px] font-bold mb-1 ${isToday ? 'text-pink-600' : 'text-slate-500'}`}>
                          {date.getDate()}
                        </p>
                        <div className="space-y-0.5">
                          {active.map(s => (
                            <div key={s.id} className="text-[9px] font-semibold text-white px-1 py-0.5 rounded truncate"
                              style={{ backgroundColor: s.color }} title={s.name}>
                              {s.name.split(' ')[0]}
                            </div>
                          ))}
                        </div>
                      </div>
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

// ── ZIA Tab ───────────────────────────────────────────────────────────────────

function ZIATab() {
  const STYLE = {
    warning:    { bg: 'bg-amber-50 border-amber-200', icon: AlertTriangle, text: 'text-amber-700', label: 'Atenção'  },
    suggestion: { bg: 'bg-blue-50 border-blue-200',   icon: Sparkles,      text: 'text-blue-700',  label: 'Sugestão' },
  } as const;

  return (
    <div>
      <div className="flex items-center gap-3 bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-200 rounded-xl p-4 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-semibold text-slate-800">ZIA – Análise de Escalas</p>
          <p className="text-xs text-slate-500 mt-0.5">Conflitos, alertas de cobertura e sugestões de otimização baseadas em histórico</p>
        </div>
        <button className="ml-auto px-4 py-2 text-sm font-semibold text-white bg-pink-600 rounded-lg hover:bg-pink-700 flex items-center gap-2 shrink-0">
          <Sparkles className="w-3.5 h-3.5" /> Reanalisar
        </button>
      </div>

      <div className="space-y-3 mb-8">
        {ZIA_ALERTS.map((alert, i) => {
          const cfg = STYLE[alert.type];
          const Icon = cfg.icon;
          return (
            <div key={i} className={`flex items-start gap-3 border rounded-xl p-4 ${cfg.bg}`}>
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.text}`} />
              <div className="flex-1">
                <span className={`text-xs font-bold uppercase tracking-wider ${cfg.text} mr-2`}>{cfg.label}</span>
                <span className="text-sm text-slate-700">{alert.message}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-slate-50 rounded-xl border border-slate-100 p-5">
        <h3 className="font-semibold text-slate-700 mb-4">Histórico de Absenteísmo por Dia da Semana</h3>
        <div className="flex items-end gap-3 h-32">
          {[{ day:'Seg',pct:12 },{ day:'Ter',pct:8 },{ day:'Qua',pct:9 },{ day:'Qui',pct:11 },{ day:'Sex',pct:22 }].map(d => (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs font-semibold text-slate-600">{d.pct}%</span>
              <div className="w-full flex items-end justify-center">
                <div className={`w-full rounded-t-lg ${d.pct > 18 ? 'bg-rose-400' : d.pct > 12 ? 'bg-amber-400' : 'bg-blue-400'}`}
                  style={{ height: `${(d.pct / 25) * 100}px` }} />
              </div>
              <span className="text-xs text-slate-500">{d.day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

const SUB_TABS = [
  { id: 'list',     label: 'Escalas Cadastradas' },
  { id: 'calendar', label: 'Calendário'          },
  { id: 'zia',      label: 'ZIA – Otimização'    },
];

export default function Schedules() {
  const [activeTab, setActiveTab] = useState('list');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [employees, setEmployees] = useState<HrEmployee[]>([]);
  const [loading, setLoading]     = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, e] = await Promise.all([getSchedules(), getEmployees()]);
      setSchedules(s);
      setEmployees(e);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const totalAssigned = employees.filter(e => e.shift_id !== null).length;

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Escalas Pré-Programadas</h1>
          <p className="text-slate-500 text-sm mt-1">Gestão de turnos e alocação de colaboradores — sincronizado em tempo real</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg px-4 py-2 shadow-sm">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span>
            <span className="font-semibold">{schedules.length}</span> escalas ·{' '}
            <span className="font-semibold">{totalAssigned}</span> funcionários escalados
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex border-b border-slate-100 px-6 pt-4 gap-6">
          {SUB_TABS.map(tab => (
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
          {loading && (
            <p className="text-center text-slate-400 text-sm py-10">Carregando escalas...</p>
          )}
          {!loading && activeTab === 'list'     && <ShiftListTab schedules={schedules} employees={employees} onRefresh={loadData} />}
          {!loading && activeTab === 'calendar' && <CalendarTab schedules={schedules} />}
          {activeTab === 'zia'                  && <ZIATab />}
        </div>
      </div>
    </div>
  );
}
