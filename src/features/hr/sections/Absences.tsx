import { useState } from 'react';
import {
  Upload, Search, AlertTriangle, CheckCircle,
  Calendar, Users, MoreHorizontal, Sparkles,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type JustifiedType = 'Atestado Médico' | 'Luto' | 'Casamento' | 'Doação de Sangue' | 'Júri' | 'Licença Paternidade' | 'Outro';
type AbsenceStatus = 'Aprovada' | 'Pendente' | 'Em Análise' | 'Reprovada';

interface JustifiedAbsence {
  id: string;
  employee: string;
  dept: string;
  date: string;
  days: number;
  type: JustifiedType;
  evidence: string;
  payrollIntegration: 'Lançado' | 'Pendente';
  status: AbsenceStatus;
}

interface UnjustifiedAbsence {
  id: string;
  employee: string;
  dept: string;
  date: string;
  discount: string;
  dsrImpact: string;
  totalDeduction: string;
  notified: boolean;
}

interface PlannedDayOff {
  id: string;
  employee: string;
  dept: string;
  date: string;
  shift: string;
  coverageAlert: boolean;
  coverageNote?: string;
  approvedBy: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const JUSTIFIED: JustifiedAbsence[] = [
  { id: 'AJ001', employee: 'Carlos Eduardo Lima',   dept: 'TI – Dev',    date: '07/02/2025', days: 1, type: 'Atestado Médico',     evidence: 'atestado_07022025.pdf',  payrollIntegration: 'Lançado',  status: 'Aprovada'  },
  { id: 'AJ002', employee: 'Beatriz Fontana',        dept: 'Marketing',   date: '10/02/2025', days: 3, type: 'Luto',                evidence: 'declaracao_obito.pdf',   payrollIntegration: 'Lançado',  status: 'Aprovada'  },
  { id: 'AJ003', employee: 'Ana Beatriz Souza',      dept: 'RH',          date: '13/02/2025', days: 1, type: 'Atestado Médico',     evidence: 'atestado_13022025.jpg',  payrollIntegration: 'Pendente', status: 'Pendente'  },
  { id: 'AJ004', employee: 'Guilherme Martins',       dept: 'Comercial',   date: '18/02/2025', days: 2, type: 'Atestado Médico',     evidence: 'atestado_18022025.pdf',  payrollIntegration: 'Pendente', status: 'Em Análise'},
  { id: 'AJ005', employee: 'Fernanda Rocha',          dept: 'Qualidade',   date: '05/02/2025', days: 1, type: 'Doação de Sangue',    evidence: 'comprovante_hemosc.pdf', payrollIntegration: 'Lançado',  status: 'Aprovada'  },
];

const UNJUSTIFIED: UnjustifiedAbsence[] = [
  { id: 'AN001', employee: 'Rafael Nunes',      dept: 'TI – Dados', date: '03/02/2025', discount: 'R$ 445,45', dsrImpact: 'R$ 74,24', totalDeduction: 'R$ 519,69', notified: true  },
  { id: 'AN002', employee: 'Lucas Araújo',      dept: 'Marketing',  date: '06/02/2025', discount: 'R$ 290,00', dsrImpact: 'R$ 48,33', totalDeduction: 'R$ 338,33', notified: true  },
  { id: 'AN003', employee: 'Rafael Nunes',      dept: 'TI – Dados', date: '12/02/2025', discount: 'R$ 445,45', dsrImpact: 'R$ 74,24', totalDeduction: 'R$ 519,69', notified: false },
];

const PLANNED: PlannedDayOff[] = [
  { id: 'FP001', employee: 'Ana Beatriz Souza',  dept: 'RH',          date: '21/02/2025', shift: 'Comercial',   coverageAlert: false,                                                  approvedBy: 'Carla Mendes'    },
  { id: 'FP002', employee: 'Carlos Eduardo Lima', dept: 'TI – Dev',    date: '24/02/2025', shift: 'Comercial',   coverageAlert: true,  coverageNote: 'Apenas 2 devs de plantão (min 3)', approvedBy: 'Roberto Alves'   },
  { id: 'FP003', employee: 'Guilherme Martins',   dept: 'Comercial',   date: '25/02/2025', shift: 'Comercial',   coverageAlert: true,  coverageNote: 'Equipe de vendas abaixo de 60%',   approvedBy: 'Fernanda Costa'  },
  { id: 'FP004', employee: 'Fernanda Rocha',       dept: 'Qualidade',   date: '28/02/2025', shift: 'Comercial',   coverageAlert: false,                                                  approvedBy: 'Patrícia Duarte' },
];

// ─── Sub-component configs ─────────────────────────────────────────────────

const JUSTIFIED_TYPE_COLORS: Record<JustifiedType, string> = {
  'Atestado Médico':     'bg-blue-100 text-blue-700',
  'Luto':                'bg-slate-100 text-slate-600',
  'Casamento':           'bg-pink-100 text-pink-700',
  'Doação de Sangue':    'bg-rose-100 text-rose-700',
  'Júri':                'bg-purple-100 text-purple-700',
  'Licença Paternidade': 'bg-teal-100 text-teal-700',
  'Outro':               'bg-amber-100 text-amber-700',
};

const STATUS_CFG: Record<AbsenceStatus, { color: string; icon: React.ElementType }> = {
  'Aprovada':    { color: 'bg-green-100 text-green-700',  icon: CheckCircle  },
  'Pendente':    { color: 'bg-amber-100 text-amber-700',  icon: AlertTriangle },
  'Em Análise':  { color: 'bg-blue-100 text-blue-700',    icon: Search       },
  'Reprovada':   { color: 'bg-rose-100 text-rose-700',    icon: AlertTriangle },
};

const SUB_TABS = [
  { id: 'justified',   label: 'Ausências Justificadas'    },
  { id: 'unjustified', label: 'Ausências Não Justificadas' },
  { id: 'planned',     label: 'Folgas Planejadas'          },
];

// ─── Tab components ────────────────────────────────────────────────────────

function JustifiedTab() {
  const [search, setSearch] = useState('');
  const filtered = JUSTIFIED.filter((a) =>
    a.employee.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar colaborador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 w-56"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium">
          <Upload className="w-4 h-4" /> Lançar Atestado
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Colaborador</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Dias</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Evidência</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Folha</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((a) => {
              const cfg = STATUS_CFG[a.status];
              const Icon = cfg.icon;
              return (
                <tr key={a.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800 text-sm">{a.employee}</p>
                    <p className="text-xs text-slate-400">{a.dept}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{a.date}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-slate-700">{a.days}d</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${JUSTIFIED_TYPE_COLORS[a.type]}`}>
                      {a.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700">
                      <Upload className="w-3 h-3" />{a.evidence}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium ${a.payrollIntegration === 'Lançado' ? 'text-green-600' : 'text-amber-600'}`}>
                      {a.payrollIntegration}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${cfg.color}`}>
                      <Icon className="w-3 h-3" />{a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal className="w-4 h-4" /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UnjustifiedTab() {
  const totalDeduction = 'R$ 1.377,71';

  return (
    <div>
      <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-xl px-5 py-3 mb-5">
        <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
        <p className="text-sm text-rose-800">
          <span className="font-semibold">{UNJUSTIFIED.length} falta(s) não justificada(s)</span> registradas neste mês.
          Total de desconto automático em folha: <span className="font-bold">{totalDeduction}</span>
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Colaborador</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Data da Falta</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Desconto (dia)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Reflexo no DSR</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Deduzido</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Notificado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {UNJUSTIFIED.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800 text-sm">{a.employee}</p>
                  <p className="text-xs text-slate-400">{a.dept}</p>
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">{a.date}</td>
                <td className="px-4 py-3 text-xs font-semibold text-rose-700">{a.discount}</td>
                <td className="px-4 py-3 text-xs font-semibold text-rose-700">{a.dsrImpact}</td>
                <td className="px-4 py-3 text-xs font-bold text-rose-800">{a.totalDeduction}</td>
                <td className="px-4 py-3">
                  {a.notified ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600"><CheckCircle className="w-3 h-3" /> Sim</span>
                  ) : (
                    <button className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium">
                      <AlertTriangle className="w-3 h-3" /> Notificar
                    </button>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlannedTab() {
  const coverageAlerts = PLANNED.filter((p) => p.coverageAlert).length;

  return (
    <div>
      {coverageAlerts > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 mb-5">
          <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">ZIA detectou {coverageAlerts} conflito(s) de cobertura</span> nas folgas planejadas.
            Revise as folgas destacadas em laranja.
          </p>
        </div>
      )}

      <div className="flex justify-end mb-4">
        <button className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium">
          <Calendar className="w-4 h-4" /> Agendar Folga
        </button>
      </div>

      {/* Simple calendar-style list grouped by date */}
      <div className="space-y-3">
        {PLANNED.map((p) => (
          <div
            key={p.id}
            className={`flex items-start gap-4 rounded-xl border px-5 py-4 ${
              p.coverageAlert ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'
            }`}
          >
            <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 text-white ${p.coverageAlert ? 'bg-orange-500' : 'bg-slate-700'}`}>
              <span className="text-[10px] font-semibold uppercase">{p.date.split('/')[1]}/{p.date.split('/')[2].slice(-2)}</span>
              <span className="text-lg font-bold leading-none">{p.date.split('/')[0]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold text-slate-800 text-sm">{p.employee}</p>
                <span className="text-xs text-slate-400">·</span>
                <p className="text-xs text-slate-500">{p.dept}</p>
              </div>
              <p className="text-xs text-slate-400 mb-1">Escala: {p.shift} · Aprovado por: {p.approvedBy}</p>
              {p.coverageAlert && p.coverageNote && (
                <div className="flex items-center gap-1.5 mt-1">
                  <AlertTriangle className="w-3 h-3 text-orange-500 shrink-0" />
                  <p className="text-xs text-orange-700 font-medium">{p.coverageNote}</p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {p.coverageAlert && (
                <button className="px-3 py-1.5 text-xs font-semibold text-orange-700 bg-orange-100 rounded-lg hover:bg-orange-200">
                  Resolver
                </button>
              )}
              <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

export default function Absences() {
  const [activeTab, setActiveTab] = useState('justified');

  const justifiedCount   = JUSTIFIED.length;
  const unjustifiedCount = UNJUSTIFIED.length;
  const plannedCount     = PLANNED.length;

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Faltas, Ausências e Folgas</h1>
          <p className="text-slate-500 text-sm mt-1">Gestão de ausências justificadas, não justificadas e folgas planejadas com alertas ZIA</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Ausências Justificadas',    value: justifiedCount,   icon: CheckCircle,    color: 'text-green-600 bg-green-50'  },
          { label: 'Ausências Não Justificadas', value: unjustifiedCount, icon: AlertTriangle,  color: 'text-rose-600 bg-rose-50'    },
          { label: 'Folgas Planejadas (mês)',    value: plannedCount,     icon: Users,          color: 'text-blue-600 bg-blue-50'    },
        ].map((s) => {
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

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex border-b border-slate-100 px-6 pt-4 gap-6">
          {SUB_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-semibold transition-all border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'text-pink-600 border-pink-600'
                  : 'text-slate-500 border-transparent hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="p-6">
          {activeTab === 'justified'   && <JustifiedTab />}
          {activeTab === 'unjustified' && <UnjustifiedTab />}
          {activeTab === 'planned'     && <PlannedTab />}
        </div>
      </div>
    </div>
  );
}
