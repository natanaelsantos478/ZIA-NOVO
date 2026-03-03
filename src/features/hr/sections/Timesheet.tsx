import { useState } from 'react';
import {
  Download, AlertTriangle,
  CheckCircle, Clock, Search, Calendar, Plus, X, ArrowLeft, ChevronRight
} from 'lucide-react';

// ─── TYPES & MOCKS ─────────────────────────────────────────────────────────────

export interface EmployeeOverview {
  id: string;
  name: string;
  department: string;
  workedHours: string;
  overtime: string;
  missingHours: string;
  requestsCount: number;
}

export const EMPLOYEES_OVERVIEW: EmployeeOverview[] = [
  { id: 'E001', name: 'Ana Beatriz Souza', department: 'TI - Desenvolvimento', workedHours: '158:30', overtime: '04:15', missingHours: '02:00', requestsCount: 1 },
  { id: 'E002', name: 'Carlos Eduardo Lima', department: 'Recursos Humanos', workedHours: '160:00', overtime: '00:00', missingHours: '00:00', requestsCount: 0 },
  { id: 'E003', name: 'Fernanda Rocha', department: 'Comercial & Vendas', workedHours: '145:00', overtime: '00:00', missingHours: '15:00', requestsCount: 3 },
  { id: 'E004', name: 'Guilherme Martins', department: 'Financeiro', workedHours: '172:45', overtime: '12:45', missingHours: '00:00', requestsCount: 2 },
  { id: 'E005', name: 'Isabela Ferreira', department: 'TI - Suporte', workedHours: '160:15', overtime: '00:15', missingHours: '00:00', requestsCount: 0 },
];

export interface DetailedPunch {
  date: string;
  weekday: string;
  punches: string[]; // up to 8
  overtime: string;
  missing: string;
  dailyBalance: string;
  accumulatedBalance: string;
  type: 'workday' | 'weekend' | 'holiday';
}

// Generate a full month
const generateDetailedPunches = (): DetailedPunch[] => {
  const days: DetailedPunch[] = [];
  let currentAcc = 0; // in minutes

  for (let i = 1; i <= 28; i++) {
    const isWeekend = (i % 7 === 3) || (i % 7 === 4); // Fake weekend logic for mock
    let punches = ['', '', '', '', '', '', '', ''];
    let overtime = '00:00';
    let missing = '00:00';
    let dailyBalance = '+00:00';

    if (!isWeekend) {
      if (i === 5) {
        // Late arrival
        punches = ['08:30', '12:00', '13:00', '17:00', '', '', '', ''];
        missing = '00:30';
        dailyBalance = '-00:30';
        currentAcc -= 30;
      } else if (i === 10) {
        // Overtime
        punches = ['08:00', '12:00', '13:00', '18:30', '', '', '', ''];
        overtime = '01:30';
        dailyBalance = '+01:30';
        currentAcc += 90;
      } else if (i === 15) {
        // Multi punches
        punches = ['08:00', '12:00', '13:00', '15:00', '15:30', '17:30', '', ''];
        overtime = '00:00';
        dailyBalance = '+00:00';
      } else {
        punches = ['08:00', '12:00', '13:00', '17:00', '', '', '', ''];
      }
    }

    const sign = currentAcc >= 0 ? '+' : '-';
    const accH = Math.floor(Math.abs(currentAcc) / 60).toString().padStart(2, '0');
    const accM = (Math.abs(currentAcc) % 60).toString().padStart(2, '0');

    days.push({
      date: `${i.toString().padStart(2, '0')}/02`,
      weekday: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'][(i+3)%7],
      punches,
      overtime,
      missing,
      dailyBalance,
      accumulatedBalance: `${sign}${accH}:${accM}`,
      type: isWeekend ? 'weekend' : 'workday' as const
    });
  }
  return days;
};

const DETAILED_PUNCHES = generateDetailedPunches();

const MOCK_GROUPS = [
  {
    category: 'Turno',
    groups: ['Turno Manhã (06h–14h)', 'Turno Tarde (14h–22h)'],
  },
  {
    category: 'Departamento',
    groups: ['Gestores e Líderes'],
  },
  {
    category: 'Projeto',
    groups: ['Projeto ZIA 2.0'],
  },
  {
    category: 'Benefício',
    groups: ['Plano de Saúde Premium', 'Comercial – Comissão Variável'],
  },
  {
    category: 'Personalizado',
    groups: ['Home Office Integral', 'Híbrido (3×2)'],
  }
];

// ─── SUBCOMPONENTS ─────────────────────────────────────────────────────────────

function GroupSelector({ selectedGroup, setSelectedGroup }: { selectedGroup: string | null, setSelectedGroup: (v: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const handleSelectGroup = (cat: string, group: string) => {
    setSelectedGroup(`${cat} > ${group}`);
    setOpen(false);
    setActiveCategory(null);
  };

  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">Grupo</label>
      <div className="relative">
        <div
          onClick={() => {
            setOpen(!open);
            setActiveCategory(null);
          }}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white cursor-pointer hover:border-pink-300 transition-colors flex justify-between items-center"
        >
          <span className={selectedGroup ? "text-slate-800 font-medium" : "text-slate-400"}>
            {selectedGroup || "Selecione um grupo..."}
          </span>
          <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`} />
        </div>

        {/* Overlay to close when clicking outside */}
        {open && (
          <div className="fixed inset-0 z-30" onClick={() => { setOpen(false); setActiveCategory(null); }} />
        )}

        {/* Primary Dropdown Menu (Categories) */}
        {open && (
          <div className="absolute top-full left-0 mt-1 w-full max-h-64 overflow-y-auto bg-white rounded-xl shadow-lg border border-slate-100 z-40 py-2 no-scrollbar">
            {MOCK_GROUPS.map((cat) => (
              <div
                key={cat.category}
                className="relative"
              >
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveCategory(activeCategory === cat.category ? null : cat.category);
                  }}
                  className={`flex items-center justify-between px-4 py-2 cursor-pointer text-sm transition-colors ${activeCategory === cat.category ? 'bg-pink-50 text-pink-700 font-medium' : 'text-slate-700 hover:bg-slate-50'}`}
                >
                  {cat.category}
                  <ChevronRight className={`w-3 h-3 transition-transform ${activeCategory === cat.category ? 'text-pink-600 rotate-90' : 'text-slate-400'}`} />
                </div>

                {/* Secondary Dropdown Menu (Groups) - Accordion style */}
                {activeCategory === cat.category && (
                  <div className="bg-slate-50/50 py-1 border-y border-slate-100">
                    {cat.groups.map(groupName => (
                      <div
                        key={groupName}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectGroup(cat.category, groupName);
                        }}
                        className="px-8 py-2 hover:bg-pink-50 hover:text-pink-700 cursor-pointer text-sm text-slate-600 transition-colors truncate"
                      >
                        {groupName}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WorkDaysCalendarModal({ onClose }: { onClose: () => void }) {
  // Simple fake 28 day month
  const days = Array.from({ length: 28 }, (_, i) => i + 1);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Calendário - Fev/2025</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-7 gap-2 text-center mb-2">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => (
              <span key={d} className="text-xs font-semibold text-slate-500">{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2 text-center">
            {/* offset start */}
            <div className="p-2"></div><div className="p-2"></div><div className="p-2"></div>
            {days.map(d => {
              const isWeekend = (d % 7 === 1) || (d % 7 === 2); // shifted for starting wednesday
              const isHoliday = d === 20;
              const bgClass = isHoliday ? 'bg-red-100 text-red-700 font-bold' : isWeekend ? 'bg-red-50 text-red-600' : 'bg-green-100 text-green-800 font-medium';
              return (
                <div key={d} className={`p-2 rounded-lg text-sm flex items-center justify-center h-10 w-10 mx-auto ${bgClass}`}>
                  {d}
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex flex-col gap-2 text-sm text-slate-600 border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-100"></span> Dias Úteis (20)</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-50"></span> Finais de Semana (8)</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-100"></span> Feriados (0)</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NewTimeOffModal({ onClose }: { onClose: () => void }) {
  const [targetType, setTargetType] = useState('Colaborador Específico');
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 className="text-lg font-bold text-slate-800">Nova Folga Programada</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Motivo</label>
              <select className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500/30">
                <option>Férias</option>
                <option>Atestado Médico</option>
                <option>Licença Paternidade/Maternidade</option>
                <option>Folga Prêmio</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Data Inicial</label>
              <input type="date" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500/30" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Data Final</label>
              <input type="date" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500/30" />
            </div>
          </div>

          <fieldset className="border border-slate-200 rounded-xl p-4 bg-slate-50">
            <legend className="px-2 text-sm font-bold text-slate-700">Aplica-se a</legend>
            <div className="flex flex-col gap-4 mt-2">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Tipo de Alvo</label>
                <select
                  value={targetType}
                  onChange={(e) => {
                    setTargetType(e.target.value);
                    setSelectedGroup(null); // reset group selection when changing type
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-pink-500/30 bg-white"
                >
                  <option>Colaborador Específico</option>
                  <option>Departamento</option>
                  <option>Cargo</option>
                  <option>Grupo</option>
                  <option>Filtros Avançados (Idade, CC, Empresa)</option>
                </select>
              </div>

              {targetType === 'Colaborador Específico' && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Colaborador</label>
                  <select className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"><option>Selecione um colaborador</option><option>Ana Beatriz</option><option>Carlos Eduardo Lima</option></select>
                </div>
              )}

              {targetType === 'Departamento' && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Departamento</label>
                  <select className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"><option>Selecione um departamento</option><option>TI</option><option>RH</option><option>Comercial & Vendas</option></select>
                </div>
              )}

              {targetType === 'Cargo' && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Cargo</label>
                  <select className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"><option>Selecione um cargo</option><option>Desenvolvedor Full Stack</option><option>Analista de RH</option></select>
                </div>
              )}

              {targetType === 'Grupo' && (
                <GroupSelector
                  selectedGroup={selectedGroup}
                  setSelectedGroup={setSelectedGroup}
                />
              )}

              {targetType === 'Filtros Avançados (Idade, CC, Empresa)' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Grupo de Folha</label>
                    <select className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"><option>Todos</option><option>CLT Padrão</option></select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Empresa / Filial</label>
                    <select className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"><option>Todas</option><option>Matriz SP</option></select>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Idade Min.</label>
                      <input type="number" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" placeholder="Ex: 18" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-slate-500 mb-1">Idade Máx.</label>
                      <input type="number" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg" placeholder="Ex: 65" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Centro de Custo</label>
                    <select className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"><option>Todos</option><option>CC-001</option></select>
                  </div>
                </div>
              )}
            </div>
          </fieldset>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancelar</button>
          <button onClick={onClose} className="px-4 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium">Programar Folga</button>
        </div>
      </div>
    </div>
  );
}

function TimesheetOverview({
  employees,
  onSelectEmployee
}: {
  employees: EmployeeOverview[],
  onSelectEmployee: (emp: EmployeeOverview) => void
}) {
  const [search, setSearch] = useState('');

  const filtered = employees.filter(e => e.name.toLowerCase().includes(search.toLowerCase()) || e.department.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar colaborador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400 w-64"
          />
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">De:</span>
            <input type="date" defaultValue="2025-02-01" className="px-2 py-1.5 border border-slate-200 rounded-lg text-slate-700" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Até:</span>
            <input type="date" defaultValue="2025-02-28" className="px-2 py-1.5 border border-slate-200 rounded-lg text-slate-700" />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Colaborador</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Departamento</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Horas Trab.</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Horas Extras</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Horas Faltantes</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Solicitações</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((emp) => (
              <tr key={emp.id} onClick={() => onSelectEmployee(emp)} className="hover:bg-pink-50/40 transition-colors cursor-pointer">
                <td className="px-4 py-3 font-medium text-slate-800">{emp.name}</td>
                <td className="px-4 py-3 text-slate-500">{emp.department}</td>
                <td className="px-4 py-3 text-center font-mono text-slate-700">{emp.workedHours}</td>
                <td className="px-4 py-3 text-center font-mono text-green-600 font-medium">{emp.overtime}</td>
                <td className="px-4 py-3 text-center font-mono text-rose-600 font-medium">{emp.missingHours}</td>
                <td className="px-4 py-3 text-center">
                  {emp.requestsCount > 0 ? (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 font-bold text-xs">
                      {emp.requestsCount}
                    </span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button className="text-pink-600 hover:text-pink-700 text-xs font-semibold">Ver Espelho</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TimesheetDetail({
  employee,
  onBack
}: {
  employee: EmployeeOverview,
  onBack: () => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-800">{employee.name}</h2>
            <p className="text-sm text-slate-500">{employee.department} • Fev / 2025</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 font-medium shadow-sm">
          <Download className="w-4 h-4" /> Exportar Espelho
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider sticky left-0 bg-slate-50/90 backdrop-blur">Dia</th>
                {Array.from({ length: 8 }).map((_, i) => (
                  <th key={i} colSpan={2} className="px-2 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider border-l border-slate-100">
                    Batida {i + 1}
                  </th>
                ))}
                <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider border-l border-slate-200 bg-amber-50/50">HE</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider bg-rose-50/50">Faltas</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider bg-blue-50/50">Saldo Dia</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-100/50">Acumulado</th>
              </tr>
              <tr className="border-b border-slate-200 bg-slate-50/60">
                <th className="px-3 py-1 sticky left-0 bg-slate-50/90 backdrop-blur"></th>
                {Array.from({ length: 8 }).map((_, i) => (
                  <Fragment key={i}>
                    <th className="px-1 py-1 text-center text-[10px] font-medium text-slate-400 border-l border-slate-100">Ent</th>
                    <th className="px-1 py-1 text-center text-[10px] font-medium text-slate-400">Sai</th>
                  </Fragment>
                ))}
                <th className="px-3 py-1 border-l border-slate-200 bg-amber-50/50"></th>
                <th className="px-3 py-1 bg-rose-50/50"></th>
                <th className="px-3 py-1 bg-blue-50/50"></th>
                <th className="px-3 py-1 bg-slate-100/50"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {DETAILED_PUNCHES.map((row) => (
                <tr key={row.date} className={`hover:bg-slate-50/50 transition-colors ${row.type === 'weekend' ? 'bg-slate-50/40 text-slate-400' : ''}`}>
                  <td className="px-3 py-2 text-xs font-medium sticky left-0 bg-white/90 backdrop-blur border-r border-slate-50">
                    <span className="font-mono">{row.date}</span> <span className="text-[10px] ml-1">{row.weekday}</span>
                  </td>
                  {Array.from({ length: 8 }).map((_, i) => {
                    const isEven = i % 2 === 0;
                    return (
                      <Fragment key={i}>
                        <td className={`px-1 py-2 text-center font-mono text-xs border-l border-slate-50 ${isEven ? 'text-green-700' : 'text-slate-600'}`}>{row.punches[i*2] || '—'}</td>
                        <td className={`px-1 py-2 text-center font-mono text-xs ${!isEven ? 'text-rose-700' : 'text-slate-600'}`}>{row.punches[i*2+1] || '—'}</td>
                      </Fragment>
                    )
                  })}
                  <td className="px-3 py-2 text-center font-mono text-xs text-amber-600 font-medium border-l border-slate-200 bg-amber-50/10">{row.overtime !== '00:00' ? row.overtime : '—'}</td>
                  <td className="px-3 py-2 text-center font-mono text-xs text-rose-600 font-medium bg-rose-50/10">{row.missing !== '00:00' ? row.missing : '—'}</td>
                  <td className={`px-3 py-2 text-center font-mono text-xs font-bold bg-blue-50/10 ${row.dailyBalance.startsWith('+') && row.dailyBalance !== '+00:00' ? 'text-green-600' : row.dailyBalance.startsWith('-') ? 'text-rose-600' : 'text-slate-400'}`}>{row.dailyBalance}</td>
                  <td className={`px-3 py-2 text-center font-mono text-xs font-bold bg-slate-50/50 ${row.accumulatedBalance.startsWith('+') && row.accumulatedBalance !== '+00:00' ? 'text-green-600' : row.accumulatedBalance.startsWith('-') ? 'text-rose-600' : 'text-slate-600'}`}>{row.accumulatedBalance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
import { Fragment } from 'react';

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────────

export default function Timesheet() {
  const [showCalendar, setShowCalendar] = useState(false);
  const [showNewTimeOff, setShowNewTimeOff] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeOverview | null>(null);

  return (
    <div className="p-8">
      {showCalendar && <WorkDaysCalendarModal onClose={() => setShowCalendar(false)} />}
      {showNewTimeOff && <NewTimeOffModal onClose={() => setShowNewTimeOff(false)} />}

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Ponto e Folgas</h1>
          <p className="text-slate-500 text-sm mt-1">Gestão de batidas, espelhos de ponto e solicitações de folga</p>
        </div>
        <button
          onClick={() => setShowNewTimeOff(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" /> Nova Folga Programada
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <button
          onClick={() => setShowCalendar(true)}
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:ring-2 hover:ring-pink-500/50 hover:border-pink-300 transition-all text-left"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 bg-slate-100">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs text-slate-500 font-semibold uppercase">Dias Úteis Mês Atual</span>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold text-slate-800">20</p>
            <p className="text-xs text-pink-600 font-medium mb-1 flex items-center gap-1">Ver calendário &rarr;</p>
          </div>
        </button>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-green-600 bg-green-50">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs text-slate-500 font-semibold uppercase">Horas Extras (Geral)</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">17h 15m</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-rose-600 bg-rose-50">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs text-slate-500 font-semibold uppercase">Faltas Injustificadas</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">17h 00m</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-amber-600 bg-amber-50">
              <CheckCircle className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs text-slate-500 font-semibold uppercase">Solicitações Pendentes</span>
          </div>
          <p className="text-3xl font-bold text-slate-800">6</p>
        </div>
      </div>

      {/* Main Content Area */}
      {selectedEmployee ? (
        <TimesheetDetail employee={selectedEmployee} onBack={() => setSelectedEmployee(null)} />
      ) : (
        <TimesheetOverview employees={EMPLOYEES_OVERVIEW} onSelectEmployee={setSelectedEmployee} />
      )}
    </div>
  );
}
