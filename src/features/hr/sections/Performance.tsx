import { useState } from 'react';
import { Plus, Star, BookOpen, AlertTriangle, Sparkles } from 'lucide-react';

/* ── Types ──────────────────────────────────────────────────────────────── */

type CycleType   = '90°' | '180°' | '360°';
type CycleStatus = 'Ativo' | 'Calibração' | 'Encerrado' | 'Agendado';
type Readiness   = 'Pronto' | '6 meses' | '12 meses' | 'Em Desenvolvimento';

interface EvalCycle {
  id:           string;
  name:         string;
  type:         CycleType;
  status:       CycleStatus;
  deadline:     string;
  participants: number;
  completed:    number;
}

interface BoxEmployee {
  id:          string;
  name:        string;
  initials:    string;
  performance: 1 | 2 | 3;
  potential:   1 | 2 | 3;
}

interface Course {
  id:             string;
  title:          string;
  type:           'Interno' | 'Externo';
  required:       boolean;
  overdue:        boolean;
  linkedTo:       string;
  enrolled:       number;
  completed:      number;
  deadline?:      string;
}

interface SuccessionRole {
  id:            string;
  role:          string;
  currentHolder: string;
  riskLevel:     'Alto' | 'Médio' | 'Baixo';
  successors:    Array<{
    name:         string;
    readiness:    Readiness;
    evalScore:    number;
    turnoverRisk: 'Alto' | 'Médio' | 'Baixo';
    ziaNote?:     string;
  }>;
}

/* ── Mock data ──────────────────────────────────────────────────────────── */

const EVAL_CYCLES: EvalCycle[] = [
  { id: 'C001', name: 'Avaliação Q1 2026 — 360°',       type: '360°', status: 'Calibração', deadline: '15/03/2026', participants: 186, completed: 178 },
  { id: 'C002', name: 'Avaliação de Probatória',         type: '90°',  status: 'Ativo',      deadline: '28/03/2026', participants: 8,   completed: 3   },
  { id: 'C003', name: 'Avaliação Semestral 2025-2',      type: '180°', status: 'Encerrado',  deadline: '30/11/2025', participants: 183, completed: 183 },
  { id: 'C004', name: 'Avaliação Q2 2026 — 360°',        type: '360°', status: 'Agendado',   deadline: '15/06/2026', participants: 0,   completed: 0   },
];

const BOX_EMPLOYEES: BoxEmployee[] = [
  { id: 'E001', name: 'Ana Paula',      initials: 'AP', performance: 3, potential: 3 },
  { id: 'E002', name: 'Carlos Lima',    initials: 'CL', performance: 2, potential: 2 },
  { id: 'E003', name: 'Beatriz Souza',  initials: 'BS', performance: 3, potential: 2 },
  { id: 'E004', name: 'Rafael Nunes',   initials: 'RN', performance: 1, potential: 3 },
  { id: 'E005', name: 'Fernanda',       initials: 'FO', performance: 2, potential: 3 },
  { id: 'E006', name: 'Guilherme',      initials: 'GM', performance: 3, potential: 3 },
  { id: 'E007', name: 'Marcos R.',      initials: 'MR', performance: 2, potential: 1 },
  { id: 'E008', name: 'Patrícia S.',    initials: 'PS', performance: 1, potential: 2 },
];

// [row 0 = alto potencial … row 2 = baixo potencial] × [col 0 = baixa perf … col 2 = alta perf]
const BOX_META = [
  [
    { label: 'Enigma',          bg: 'bg-amber-50',  border: 'border-amber-200', color: 'text-amber-700'  },
    { label: 'Potencial Bruto', bg: 'bg-green-50',  border: 'border-green-200', color: 'text-green-700'  },
    { label: 'Estrela ★',       bg: 'bg-green-100', border: 'border-green-300', color: 'text-green-800'  },
  ],
  [
    { label: 'Risco',           bg: 'bg-rose-50',   border: 'border-rose-200',  color: 'text-rose-700'   },
    { label: 'Núcleo',          bg: 'bg-slate-50',  border: 'border-slate-200', color: 'text-slate-600'  },
    { label: 'Alto Desempenho', bg: 'bg-blue-50',   border: 'border-blue-200',  color: 'text-blue-700'   },
  ],
  [
    { label: 'Problemático',    bg: 'bg-rose-100',  border: 'border-rose-300',  color: 'text-rose-800'   },
    { label: 'Eficiente',       bg: 'bg-amber-50',  border: 'border-amber-200', color: 'text-amber-700'  },
    { label: 'Especialista',    bg: 'bg-slate-100', border: 'border-slate-200', color: 'text-slate-600'  },
  ],
] as const;

const COURSES: Course[] = [
  { id: 'CR001', title: 'Segurança no Trabalho (NR-1)',       type: 'Interno', required: true,  overdue: false, linkedTo: 'SST — Todos os CLT',        enrolled: 186, completed: 183, deadline: '31/03/2026' },
  { id: 'CR002', title: 'Operações com Empilhadeira (NR-11)', type: 'Interno', required: true,  overdue: false, linkedTo: 'SST — Operadores Armazém',  enrolled: 12,  completed: 8,   deadline: '15/04/2026' },
  { id: 'CR003', title: 'Excel Avançado',                     type: 'Externo', required: false, overdue: false, linkedTo: 'Analistas (todos)',          enrolled: 24,  completed: 18  },
  { id: 'CR004', title: 'Liderança e Gestão de Equipes',      type: 'Externo', required: true,  overdue: false, linkedTo: 'Gerentes e Diretores',       enrolled: 14,  completed: 10,  deadline: '30/06/2026' },
  { id: 'CR005', title: 'LGPD — Proteção de Dados Pessoais',  type: 'Interno', required: true,  overdue: true,  linkedTo: 'Todos os colaboradores',     enrolled: 186, completed: 176, deadline: '28/02/2026' },
  { id: 'CR006', title: 'Design Thinking',                    type: 'Externo', required: false, overdue: false, linkedTo: 'Produto e UX',               enrolled: 8,   completed: 5   },
];

const SUCCESSION_ROLES: SuccessionRole[] = [
  {
    id: 'SR001', role: 'Gerente de RH', currentHolder: 'Ana Paula Ferreira', riskLevel: 'Médio',
    successors: [
      { name: 'Fernanda Oliveira', readiness: 'Pronto',  evalScore: 8.7, turnoverRisk: 'Baixo' },
      { name: 'Beatriz Souza',     readiness: '6 meses', evalScore: 7.9, turnoverRisk: 'Baixo', ziaNote: 'Alto potencial. 6 meses para assumir plenamente com mentoria estruturada.' },
    ],
  },
  {
    id: 'SR002', role: 'Dev Sênior / Tech Lead', currentHolder: 'Rafael Nunes', riskLevel: 'Alto',
    successors: [
      { name: 'Carlos Eduardo Lima', readiness: '12 meses',         evalScore: 7.1, turnoverRisk: 'Médio', ziaNote: 'Risco de turnover médio. Plano de retenção recomendado nos próximos 90 dias.' },
      { name: 'João Menezes',        readiness: 'Em Desenvolvimento', evalScore: 6.5, turnoverRisk: 'Baixo' },
    ],
  },
  {
    id: 'SR003', role: 'Gerente Financeiro', currentHolder: 'Vaga em aberto', riskLevel: 'Alto',
    successors: [
      { name: 'Beatriz Souza', readiness: '12 meses', evalScore: 7.5, turnoverRisk: 'Baixo', ziaNote: 'Candidata promissora, mas necessita de desenvolvimento em gestão de equipes.' },
    ],
  },
];

/* ── Style maps ─────────────────────────────────────────────────────────── */

const CYCLE_BADGE: Record<CycleStatus, string> = {
  'Ativo':      'bg-green-100 text-green-700',
  'Calibração': 'bg-indigo-100 text-indigo-700',
  'Encerrado':  'bg-slate-100 text-slate-500',
  'Agendado':   'bg-amber-100 text-amber-700',
};

const RISK_BADGE: Record<'Alto' | 'Médio' | 'Baixo', string> = {
  Alto:  'bg-rose-100 text-rose-700',
  Médio: 'bg-amber-100 text-amber-700',
  Baixo: 'bg-green-100 text-green-700',
};

const READINESS_BADGE: Record<Readiness, string> = {
  'Pronto':            'bg-green-100 text-green-700',
  '6 meses':           'bg-blue-100 text-blue-700',
  '12 meses':          'bg-amber-100 text-amber-700',
  'Em Desenvolvimento':'bg-slate-100 text-slate-500',
};

/* ── Sub-tabs ───────────────────────────────────────────────────────────── */

function EvaluationTab() {
  const hasCalibration = EVAL_CYCLES.some((c) => c.status === 'Calibração');

  return (
    <div className="space-y-6">
      {/* Cycle list */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Ciclos de Avaliação</h3>
          <button className="flex items-center gap-2 px-3 py-1.5 text-xs text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 font-medium">
            <Plus className="w-3 h-3" /> Novo Ciclo
          </button>
        </div>
        <div className="divide-y divide-slate-50">
          {EVAL_CYCLES.map((cycle) => {
            const pct = cycle.participants > 0 ? Math.round((cycle.completed / cycle.participants) * 100) : 0;
            return (
              <div key={cycle.id} className="flex items-center gap-5 px-5 py-4 hover:bg-slate-50/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-slate-800 text-sm">{cycle.name}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700">{cycle.type}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${CYCLE_BADGE[cycle.status]}`}>{cycle.status}</span>
                  </div>
                  <p className="text-xs text-slate-400">Prazo: {cycle.deadline} · {cycle.participants} participantes</p>
                  {cycle.participants > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-slate-500 font-medium">{pct}%</span>
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-slate-700">{cycle.completed}/{cycle.participants}</p>
                  <p className="text-[10px] text-slate-400">concluídas</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 9-Box matrix */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="mb-4">
          <h3 className="font-semibold text-slate-800">Matriz 9-Box Automática</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Referência: Avaliação Semestral 2025-2 · Metas quantitativas (ERP/CRM) + avaliação qualitativa dos gestores
          </p>
        </div>

        <div className="flex gap-3">
          {/* Y-axis label */}
          <div className="flex items-center justify-center w-5 shrink-0">
            <span
              className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider select-none"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              Potencial ↑
            </span>
          </div>

          <div className="flex-1">
            {/* Performance axis labels */}
            <div className="grid grid-cols-3 gap-2 mb-1.5">
              {['Baixa', 'Média', 'Alta'].map((l) => (
                <p key={l} className="text-center text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{l}</p>
              ))}
            </div>

            {/* Grid */}
            <div className="space-y-2">
              {BOX_META.map((row, rowIdx) => {
                const potLvl = (3 - rowIdx) as 1 | 2 | 3;
                return (
                  <div key={rowIdx} className="grid grid-cols-3 gap-2">
                    {row.map((cell, colIdx) => {
                      const perfLvl = (colIdx + 1) as 1 | 2 | 3;
                      const emps = BOX_EMPLOYEES.filter((e) => e.performance === perfLvl && e.potential === potLvl);
                      return (
                        <div key={colIdx} className={`${cell.bg} border ${cell.border} rounded-lg p-2 min-h-[76px]`}>
                          <p className={`text-[10px] font-semibold ${cell.color} mb-2`}>{cell.label}</p>
                          <div className="flex flex-wrap gap-1">
                            {emps.map((emp) => (
                              <div
                                key={emp.id}
                                title={emp.name}
                                className="w-6 h-6 rounded-full bg-indigo-200 text-indigo-800 text-[9px] font-bold flex items-center justify-center cursor-default"
                              >
                                {emp.initials}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
            <p className="text-center text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-2">Performance →</p>
          </div>
        </div>

        {/* Calibration note */}
        {hasCalibration && (
          <div className="mt-4 flex items-start gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
            <Star className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-indigo-800">Calibração em andamento — Q1 2026</p>
              <p className="text-xs text-indigo-600 mt-0.5">
                8 colaboradores foram movidos na calibração entre gestores. Aguardando aprovação do CHRO para consolidação.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LMSTab() {
  const overdueCount = COURSES.filter((c) => c.overdue).length;

  return (
    <div className="space-y-4">
      {overdueCount > 0 && (
        <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-xl px-5 py-4">
          <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <p className="text-sm text-rose-700 font-medium">
            {overdueCount} curso{overdueCount > 1 ? 's' : ''} obrigatório{overdueCount > 1 ? 's' : ''} com prazo vencido — conformidade SST/Jurídico em risco.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex gap-2 text-xs">
          {[
            { label: 'Obrigatórios', value: COURSES.filter((c) => c.required).length, color: 'text-rose-600' },
            { label: 'Opcionais',    value: COURSES.filter((c) => !c.required).length, color: 'text-slate-600' },
            { label: 'Total',        value: COURSES.length,                            color: 'text-indigo-600' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-lg border border-slate-200 px-3 py-2">
              <span className={`font-bold ${s.color}`}>{s.value}</span>
              <span className="text-slate-500 ml-1">{s.label}</span>
            </div>
          ))}
        </div>
        <button className="flex items-center gap-2 px-3 py-1.5 text-xs text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 font-medium">
          <Plus className="w-3 h-3" /> Novo Curso
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Curso</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vinculado a</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Prazo</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Conclusões</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Progresso</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {COURSES.map((c) => {
                const pct = Math.round((c.completed / c.enrolled) * 100);
                return (
                  <tr key={c.id} className={`hover:bg-slate-50/60 transition-colors ${c.overdue ? 'bg-rose-50/30' : ''}`}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <BookOpen className={`w-4 h-4 shrink-0 ${c.required ? 'text-rose-400' : 'text-slate-300'}`} />
                        <div>
                          <p className="font-medium text-slate-800">{c.title}</p>
                          <div className="flex gap-1 mt-0.5">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${c.type === 'Interno' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>{c.type}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${c.required ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>{c.required ? 'Obrigatório' : 'Opcional'}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{c.linkedTo}</td>
                    <td className="px-4 py-3 text-center">
                      {c.deadline
                        ? <span className={`text-xs font-medium ${c.overdue ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>{c.deadline}</span>
                        : <span className="text-slate-300 text-xs">—</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-semibold text-slate-700">{c.completed}</span>
                      <span className="text-xs text-slate-400">/{c.enrolled}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${pct === 100 ? 'bg-green-400' : c.overdue ? 'bg-rose-400' : 'bg-indigo-400'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-600 w-8 text-right">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SuccessionTab() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const highRisk = SUCCESSION_ROLES.filter((r) => r.riskLevel === 'Alto').length;

  return (
    <div className="space-y-5">
      {highRisk > 0 && (
        <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-xl px-5 py-4">
          <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-rose-800">
              {highRisk} cargo{highRisk > 1 ? 's' : ''} crítico{highRisk > 1 ? 's' : ''} com risco de sucessão alto
            </p>
            <p className="text-xs text-rose-600 mt-0.5">
              ZIA cruzou avaliação de desempenho com risco de turnover para priorizar ações de desenvolvimento de sucessores.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {SUCCESSION_ROLES.map((role) => (
          <div key={role.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div
              className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50/40 transition-colors"
              onClick={() => setExpanded(expanded === role.id ? null : role.id)}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-slate-800">{role.role}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${RISK_BADGE[role.riskLevel]}`}>
                    Risco {role.riskLevel}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Titular: {role.currentHolder} · {role.successors.length} sucessor{role.successors.length !== 1 ? 'es' : ''} mapeado{role.successors.length !== 1 ? 's' : ''}
                </p>
              </div>
              <span className="text-slate-400 text-xs">{expanded === role.id ? '▲' : '▼'}</span>
            </div>

            {expanded === role.id && (
              <div className="border-t border-slate-100 px-5 py-4 bg-slate-50/40 space-y-3">
                {role.successors.map((s, i) => (
                  <div key={i} className="bg-white rounded-lg border border-slate-100 p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-800 text-sm">#{i + 1} {s.name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${READINESS_BADGE[s.readiness]}`}>{s.readiness}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${RISK_BADGE[s.turnoverRisk]}`}>Turnover {s.turnoverRisk}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Score de avaliação: <span className="font-semibold text-slate-700">{s.evalScore}/10</span></p>
                      </div>
                      <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden mt-1.5">
                        <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${s.evalScore * 10}%` }} />
                      </div>
                    </div>
                    {s.ziaNote && (
                      <div className="flex items-start gap-2 bg-purple-50 rounded-lg px-3 py-2 mt-2">
                        <Sparkles className="w-3.5 h-3.5 text-purple-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-purple-700">ZIA: {s.ziaNote}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────────────────────── */

const TABS = [
  { id: 'evaluation', label: 'Avaliação de Desempenho' },
  { id: 'lms',        label: 'LMS — Treinamentos'       },
  { id: 'succession', label: 'Sucessão'                 },
] as const;

type TabId = typeof TABS[number]['id'];

export default function Performance() {
  const [tab, setTab] = useState<TabId>('evaluation');

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Desempenho e Sucessão</h1>
        <p className="text-slate-500 text-sm mt-1">
          Ciclos 90/180/360°, Matriz 9-Box automática (ERP/CRM + qualitativo), LMS corporativo e mapeamento de sucessão com ZIA
        </p>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'evaluation' && <EvaluationTab />}
      {tab === 'lms'        && <LMSTab />}
      {tab === 'succession' && <SuccessionTab />}
    </div>
  );
}
