import { useState } from 'react';
import {
  CheckCircle, Clock, Circle, Users, TrendingUp,
  FileText, Laptop, Key, UserCheck, MoreHorizontal,
  Search, ChevronRight,
} from 'lucide-react';

interface OnboardingEmployee {
  id: string;
  name: string;
  role: string;
  dept: string;
  startDate: string;
  day: number;
  totalDays: number;
  mentor: string;
  steps: { label: string; done: boolean; dueDay: number }[];
}

const EMPLOYEES: OnboardingEmployee[] = [
  {
    id: 'OB001',
    name: 'Ana Beatriz Souza',
    role: 'Analista de RH Pleno',
    dept: 'Recursos Humanos',
    startDate: '2025-02-10',
    day: 12,
    totalDays: 90,
    mentor: 'Carla Mendes',
    steps: [
      { label: 'Assinatura do contrato digital',      done: true, dueDay: 1 },
      { label: 'Entrega de documentos pessoais',      done: true, dueDay: 1 },
      { label: 'Configuração de acesso (e-mail/VPN)', done: true, dueDay: 2 },
      { label: 'Treinamento de cultura e valores',    done: true, dueDay: 3 },
      { label: 'Apresentação ao time',                done: true, dueDay: 3 },
      { label: 'Treinamento de ferramentas internas', done: false, dueDay: 15 },
      { label: 'Reunião com mentor (1:1)',             done: false, dueDay: 20 },
      { label: 'Avaliação de 30 dias',                done: false, dueDay: 30 },
      { label: 'Definição de metas 90 dias',          done: false, dueDay: 45 },
      { label: 'Avaliação de conclusão (90 dias)',    done: false, dueDay: 90 },
    ],
  },
  {
    id: 'OB002',
    name: 'Carlos Eduardo Lima',
    role: 'Desenvolvedor Full Stack Sênior',
    dept: 'TI – Desenvolvimento',
    startDate: '2025-02-03',
    day: 19,
    totalDays: 90,
    mentor: 'Roberto Alves',
    steps: [
      { label: 'Assinatura do contrato digital',      done: true, dueDay: 1 },
      { label: 'Entrega de documentos pessoais',      done: true, dueDay: 1 },
      { label: 'Configuração de acesso (e-mail/VPN)', done: true, dueDay: 2 },
      { label: 'Setup do ambiente de dev',            done: true, dueDay: 3 },
      { label: 'Code review onboarding task',         done: true, dueDay: 10 },
      { label: 'Treinamento de arquitetura interna',  done: false, dueDay: 20 },
      { label: 'Reunião técnica com o time',          done: false, dueDay: 25 },
      { label: 'Avaliação de 30 dias',                done: false, dueDay: 30 },
      { label: 'Definição de metas 90 dias',          done: false, dueDay: 45 },
      { label: 'Avaliação de conclusão (90 dias)',    done: false, dueDay: 90 },
    ],
  },
  {
    id: 'OB003',
    name: 'Fernanda Rocha',
    role: 'Gerente de Qualidade',
    dept: 'Qualidade (SGQ)',
    startDate: '2025-01-27',
    day: 26,
    totalDays: 90,
    mentor: 'Patrícia Duarte',
    steps: [
      { label: 'Assinatura do contrato digital',      done: true, dueDay: 1 },
      { label: 'Entrega de documentos pessoais',      done: true, dueDay: 1 },
      { label: 'Configuração de acesso (e-mail/VPN)', done: true, dueDay: 2 },
      { label: 'Treinamento de cultura e valores',    done: true, dueDay: 3 },
      { label: 'Onboarding SGQ – normas ISO',         done: true, dueDay: 10 },
      { label: 'Treinamento de ferramentas internas', done: true, dueDay: 15 },
      { label: 'Reunião com mentor (1:1)',             done: false, dueDay: 20 },
      { label: 'Avaliação de 30 dias',                done: false, dueDay: 30 },
      { label: 'Definição de metas 90 dias',          done: false, dueDay: 45 },
      { label: 'Avaliação de conclusão (90 dias)',    done: false, dueDay: 90 },
    ],
  },
];

const STEP_ICONS: Record<string, React.ElementType> = {
  'Assinatura':    FileText,
  'Configuração':  Key,
  'Setup':         Laptop,
  'Treinamento':   UserCheck,
  default:         CheckCircle,
};

function getStepIcon(label: string): React.ElementType {
  const key = Object.keys(STEP_ICONS).find((k) => label.includes(k));
  return key ? STEP_ICONS[key] : STEP_ICONS.default;
}

function EmployeeCard({ emp, onExpand }: { emp: OnboardingEmployee; onExpand: () => void }) {
  const completedSteps = emp.steps.filter((s) => s.done).length;
  const progress = Math.round((emp.day / emp.totalDays) * 100);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {emp.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">{emp.name}</p>
            <p className="text-xs text-slate-500">{emp.role}</p>
            <p className="text-xs text-slate-400">{emp.dept}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
            emp.day < 30 ? 'bg-blue-100 text-blue-700' : emp.day < 60 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
          }`}>
            <Clock className="w-3 h-3" /> Dia {emp.day}
          </span>
          <button className="text-slate-400 hover:text-slate-600">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>{completedSteps}/{emp.steps.length} etapas concluídas</span>
          <span>Dia {emp.day}/{emp.totalDays}</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-pink-500 to-rose-500 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Quick step status */}
      <div className="flex items-center gap-1 flex-wrap mb-4">
        {emp.steps.map((step, i) => (
          <div
            key={i}
            title={step.label}
            className={`w-5 h-5 rounded-full flex items-center justify-center ${
              step.done ? 'bg-green-100' : step.dueDay <= emp.day ? 'bg-rose-100' : 'bg-slate-100'
            }`}
          >
            {step.done
              ? <CheckCircle className="w-3 h-3 text-green-600" />
              : step.dueDay <= emp.day
                ? <Clock className="w-3 h-3 text-rose-500" />
                : <Circle className="w-3 h-3 text-slate-300" />
            }
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <span className="text-xs text-slate-500">
          Mentor: <span className="font-medium text-slate-700">{emp.mentor}</span>
        </span>
        <button onClick={onExpand} className="flex items-center gap-1 text-xs text-pink-600 font-semibold hover:text-pink-700">
          Ver detalhes <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function StepDetail({ emp, onClose }: { emp: OnboardingEmployee; onClose: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="font-bold text-slate-800">{emp.name}</h3>
          <p className="text-sm text-slate-500">{emp.role} · {emp.dept}</p>
        </div>
        <button onClick={onClose} className="text-xs text-pink-600 font-semibold hover:text-pink-700">← Voltar</button>
      </div>

      <div className="space-y-3">
        {emp.steps.map((step, i) => {
          const Icon = getStepIcon(step.label);
          const overdue = !step.done && step.dueDay <= emp.day;
          return (
            <div
              key={i}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                step.done ? 'bg-green-50 border-green-100' : overdue ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'
              }`}
            >
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                step.done ? 'bg-green-100' : overdue ? 'bg-rose-100' : 'bg-slate-200'
              }`}>
                {step.done
                  ? <CheckCircle className="w-4 h-4 text-green-600" />
                  : overdue
                    ? <Clock className="w-4 h-4 text-rose-500" />
                    : <Icon className="w-4 h-4 text-slate-400" />
                }
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${step.done ? 'text-green-800 line-through' : overdue ? 'text-rose-800' : 'text-slate-700'}`}>
                  {step.label}
                </p>
                <p className="text-xs text-slate-400">Previsto: Dia {step.dueDay}</p>
              </div>
              {step.done && <span className="text-xs text-green-600 font-semibold">Concluído</span>}
              {overdue && <span className="text-xs text-rose-600 font-semibold">Atrasado</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Onboarding() {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = EMPLOYEES.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.dept.toLowerCase().includes(search.toLowerCase()),
  );

  const expandedEmp = expanded ? EMPLOYEES.find((e) => e.id === expanded) : null;

  const stats = [
    { label: 'Em Onboarding',      value: EMPLOYEES.length.toString(),                                     icon: Users,       color: 'text-pink-600 bg-pink-50'  },
    { label: 'Etapas Concluídas',  value: EMPLOYEES.reduce((s, e) => s + e.steps.filter((t) => t.done).length, 0).toString(), icon: CheckCircle, color: 'text-green-600 bg-green-50' },
    { label: 'Atrasadas',          value: EMPLOYEES.reduce((s, e) => s + e.steps.filter((t) => !t.done && t.dueDay <= e.day).length, 0).toString(), icon: Clock, color: 'text-rose-600 bg-rose-50' },
    { label: 'Taxa de Conclusão',  value: '91%',                                                            icon: TrendingUp,  color: 'text-blue-600 bg-blue-50'  },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Onboarding Digital</h1>
          <p className="text-slate-500 text-sm mt-1">Acompanhe a integração de novos colaboradores passo a passo</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500">{s.label}</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-800">{s.value}</p>
            </div>
          );
        })}
      </div>

      {expandedEmp ? (
        <StepDetail emp={expandedEmp} onClose={() => setExpanded(null)} />
      ) : (
        <>
          {/* Search */}
          <div className="relative mb-6 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar colaborador..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400 w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {filtered.map((emp) => (
              <EmployeeCard key={emp.id} emp={emp} onExpand={() => setExpanded(emp.id)} />
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16 text-slate-400 text-sm bg-white rounded-xl border border-slate-200">
              Nenhum colaborador em onboarding encontrado.
            </div>
          )}
        </>
      )}
    </div>
  );
}
