import { useState } from 'react';
import { Plus, CheckCircle2, Clock, Zap, FileSignature, Laptop, Lock, AlertTriangle } from 'lucide-react';

/* ── Types ──────────────────────────────────────────────────────────────── */

type TerminationType   = 'Sem Justa Causa' | 'Com Justa Causa' | 'Pedido de Demissão' | 'Fim de Contrato';
type TerminationStatus = 'Iniciado' | 'Em Aprovação' | 'Documentos Assinados' | 'Concluído';
type StepStatus        = 'pendente' | 'em_andamento' | 'concluído';

interface TerminationCalcRow {
  label:  string;
  value:  number;
  sign:   '+' | '-';
  detail: string;
}

interface Termination {
  id:              string;
  employee:        string;
  position:        string;
  department:      string;
  admissionDate:   string;
  terminationDate: string;
  type:            TerminationType;
  status:          TerminationStatus;
  calcRows:        TerminationCalcRow[];
  totalBruto:      number;
  totalLiquido:    number;
  steps: {
    trct:          StepStatus;
    equipment:     StepStatus;
    access:        StepStatus;
    exitInterview: StepStatus;
  };
  equipmentItems: string[];
  accessSystems:  string[];
}

/* ── Mock data ──────────────────────────────────────────────────────────── */

const TERMINATIONS: Termination[] = [
  {
    id: 'T001',
    employee: 'Rafael Nunes',
    position: 'Dev Sênior',
    department: 'Tecnologia',
    admissionDate: '03/03/2023',
    terminationDate: '15/03/2026',
    type: 'Sem Justa Causa',
    status: 'Em Aprovação',
    calcRows: [
      { label: 'Saldo de Salário',       value: 6000.00,  sign: '+', detail: '15 dias trabalhados em março (sal. R$ 12.000)' },
      { label: 'Aviso Prévio Indenizado',value: 15200.00, sign: '+', detail: '38 dias = 30 + (3 × 2 anos) + 2 prop.' },
      { label: 'Férias Proporcionais',   value: 5000.00,  sign: '+', detail: '5/12 do salário (5 meses no período aquisitivo)' },
      { label: '1/3 Constitucional',     value: 1666.67,  sign: '+', detail: 'Sobre férias proporcionais' },
      { label: '13º Proporcional',       value: 5000.00,  sign: '+', detail: '5/12 do salário anual' },
      { label: 'Multa FGTS 40%',         value: 13824.00, sign: '+', detail: '40% sobre saldo FGTS de R$ 34.560,00' },
      { label: 'INSS sobre Rescisão',    value: 908.86,   sign: '-', detail: 'Teto INSS 2026' },
      { label: 'IRRF sobre Rescisão',    value: 3721.21,  sign: '-', detail: 'Alíquota efetiva 10.6% sobre base de cálculo' },
    ],
    totalBruto:   46690.67,
    totalLiquido: 42060.60,
    steps: {
      trct:          'em_andamento',
      equipment:     'pendente',
      access:        'pendente',
      exitInterview: 'pendente',
    },
    equipmentItems: ['MacBook Pro 14" (SN: MBP24-0451)', 'iPhone 13 Pro (IMEI: 357891)', 'Crachá de Acesso #1847'],
    accessSystems:  ['GitHub / GitLab', 'AWS Console', 'Slack', 'Jira', 'Notion', 'VPN Corporativa'],
  },
  {
    id: 'T002',
    employee: 'João Menezes',
    position: 'Dev Júnior',
    department: 'Tecnologia',
    admissionDate: '05/11/2024',
    terminationDate: '28/02/2026',
    type: 'Pedido de Demissão',
    status: 'Documentos Assinados',
    calcRows: [
      { label: 'Saldo de Salário',       value: 4200.00,  sign: '+', detail: '28 dias trabalhados em fevereiro' },
      { label: 'Férias Proporcionais',   value: 1500.00,  sign: '+', detail: '4/12 do salário (4 meses no período)' },
      { label: '1/3 Constitucional',     value: 500.00,   sign: '+', detail: 'Sobre férias proporcionais' },
      { label: '13º Proporcional',       value: 1500.00,  sign: '+', detail: '4/12 do salário anual' },
      { label: 'Aviso Prévio Cumprido',  value: 0,        sign: '+', detail: 'Aviso cumprido no período — sem indenização' },
      { label: 'INSS sobre Rescisão',    value: 572.40,   sign: '-', detail: 'Sobre saldo salário + verbas' },
      { label: 'IRRF sobre Rescisão',    value: 0,        sign: '-', detail: 'Base abaixo da faixa de incidência' },
    ],
    totalBruto:   7700.00,
    totalLiquido: 7127.60,
    steps: {
      trct:          'concluído',
      equipment:     'concluído',
      access:        'concluído',
      exitInterview: 'em_andamento',
    },
    equipmentItems: ['Notebook Dell Inspiron (SN: DL23-9912)', 'Crachá de Acesso #2031'],
    accessSystems:  ['GitHub', 'Jira', 'Slack', 'VPN Corporativa'],
  },
  {
    id: 'T003',
    employee: 'Marcos Rodrigues',
    position: 'Operador de Armazém (Temporário)',
    department: 'Logística',
    admissionDate: '01/07/2025',
    terminationDate: '30/06/2026',
    type: 'Fim de Contrato',
    status: 'Iniciado',
    calcRows: [
      { label: 'Saldo de Salário',       value: 2800.00,  sign: '+', detail: '30 dias trabalhados em junho' },
      { label: 'Férias Proporcionais',   value: 2800.00,  sign: '+', detail: '12/12 — período integral' },
      { label: '1/3 Constitucional',     value: 933.33,   sign: '+', detail: 'Sobre férias proporcionais' },
      { label: '13º Proporcional',       value: 2800.00,  sign: '+', detail: '12/12 do salário anual' },
      { label: 'Indenização Contrato',   value: 1400.00,  sign: '+', detail: '50% dos salários restantes (art. 479 CLT)' },
      { label: 'INSS sobre Rescisão',    value: 416.44,   sign: '-', detail: 'Alíquota 12% sobre base' },
      { label: 'IRRF sobre Rescisão',    value: 0,        sign: '-', detail: 'Base abaixo da faixa de incidência' },
    ],
    totalBruto:   10733.33,
    totalLiquido: 10316.89,
    steps: {
      trct:          'pendente',
      equipment:     'pendente',
      access:        'pendente',
      exitInterview: 'pendente',
    },
    equipmentItems: ['EPI Kit Completo (Capacete, Luvas, Bota)', 'Crachá de Acesso #3301', 'Uniforme (2 conjuntos)'],
    accessSystems:  ['Sistema WMS', 'Ponto Eletrônico', 'Crachá de Acesso Físico'],
  },
];

/* ── Helpers ────────────────────────────────────────────────────────────── */

function fmt(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const TYPE_BADGE: Record<TerminationType, string> = {
  'Sem Justa Causa':   'bg-rose-100 text-rose-700',
  'Com Justa Causa':   'bg-red-100 text-red-800',
  'Pedido de Demissão':'bg-amber-100 text-amber-700',
  'Fim de Contrato':   'bg-slate-100 text-slate-600',
};

const STATUS_BADGE: Record<TerminationStatus, string> = {
  'Iniciado':            'bg-slate-100 text-slate-600',
  'Em Aprovação':        'bg-amber-100 text-amber-700',
  'Documentos Assinados':'bg-blue-100 text-blue-700',
  'Concluído':           'bg-green-100 text-green-700',
};

const STEP_ICON_CLASS: Record<StepStatus, { icon: typeof CheckCircle2; cls: string }> = {
  'concluído':    { icon: CheckCircle2, cls: 'text-green-500'  },
  'em_andamento': { icon: Clock,        cls: 'text-amber-500'  },
  'pendente':     { icon: Clock,        cls: 'text-slate-300'  },
};

function StepIcon({ status }: { status: StepStatus }) {
  const { icon: Icon, cls } = STEP_ICON_CLASS[status];
  return <Icon className={`w-4 h-4 shrink-0 ${cls}`} />;
}

/* ── Main component ─────────────────────────────────────────────────────── */

export default function Offboarding() {
  const [expanded, setExpanded] = useState<string | null>(TERMINATIONS[0].id);
  const pendingApproval = TERMINATIONS.filter((t) => t.status === 'Em Aprovação').length;

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Offboarding e Rescisão</h1>
          <p className="text-slate-500 text-sm mt-1">
            Cálculo rescisório automático com geração de TRCT digital, devolução de equipamentos (EAM), bloqueio de acessos e entrevista de desligamento
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-rose-600 rounded-lg hover:bg-rose-700 font-medium">
          <Plus className="w-4 h-4" /> Nova Rescisão
        </button>
      </div>

      {pendingApproval > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-6">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-amber-800">
            {pendingApproval} rescisão{pendingApproval > 1 ? 'ões' : ''} aguardando aprovação da diretoria antes da geração do TRCT.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {TERMINATIONS.map((t) => (
          <div key={t.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header row */}
            <div
              className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50/40 transition-colors"
              onClick={() => setExpanded(expanded === t.id ? null : t.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-bold text-slate-800">{t.employee}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${TYPE_BADGE[t.type]}`}>{t.type}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_BADGE[t.status]}`}>{t.status}</span>
                </div>
                <p className="text-xs text-slate-400">
                  {t.position} · {t.department} · Admissão: {t.admissionDate} · Desligamento: {t.terminationDate}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold text-slate-800">{fmt(t.totalLiquido)}</p>
                <p className="text-[10px] text-slate-400">líquido a pagar</p>
              </div>
              <span className="text-slate-400 text-xs ml-2">{expanded === t.id ? '▲' : '▼'}</span>
            </div>

            {expanded === t.id && (
              <div className="border-t border-slate-100">
                <div className="grid grid-cols-2 gap-0 divide-x divide-slate-100">
                  {/* Left: calculation */}
                  <div className="p-5">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Cálculo Rescisório (TRCT)</h4>
                    <div className="space-y-2">
                      {t.calcRows.filter((r) => r.value > 0).map((row) => (
                        <div key={row.label} className="flex items-center justify-between text-sm">
                          <div className="flex-1 min-w-0">
                            <span className="text-slate-700">{row.label}</span>
                            <span className="text-xs text-slate-400 ml-1">— {row.detail}</span>
                          </div>
                          <span className={`font-semibold ml-4 shrink-0 ${row.sign === '+' ? 'text-slate-800' : 'text-rose-600'}`}>
                            {row.sign === '-' ? '−' : '+'} {fmt(row.value)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-200 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Total Bruto</span>
                        <span className="font-semibold text-slate-700">{fmt(t.totalBruto)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-bold text-slate-800">Total Líquido</span>
                        <span className="text-xl font-bold text-green-700">{fmt(t.totalLiquido)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: integration cascade */}
                  <div className="p-5">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-indigo-400" /> Checklist de Desligamento
                    </h4>
                    <div className="space-y-4">
                      {/* TRCT */}
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5"><StepIcon status={t.steps.trct} /></div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <FileSignature className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-sm font-medium text-slate-700">TRCT Digital</span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {t.steps.trct === 'concluído' ? 'Assinado digitalmente pelo colaborador e testemunha' :
                             t.steps.trct === 'em_andamento' ? 'Aguardando assinatura do colaborador no portal' :
                             'Aguardando aprovação da rescisão para geração'}
                          </p>
                        </div>
                      </div>

                      {/* Equipment */}
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5"><StepIcon status={t.steps.equipment} /></div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Laptop className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-sm font-medium text-slate-700">Devolução de Equipamentos (EAM)</span>
                          </div>
                          <ul className="mt-1 space-y-0.5">
                            {t.equipmentItems.map((item) => (
                              <li key={item} className="text-xs text-slate-400">· {item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Access */}
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5"><StepIcon status={t.steps.access} /></div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-sm font-medium text-slate-700">Bloqueio de Acessos</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {t.accessSystems.map((sys) => (
                              <span key={sys} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${t.steps.access === 'concluído' ? 'bg-rose-100 text-rose-600 line-through' : 'bg-slate-100 text-slate-500'}`}>{sys}</span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Exit interview */}
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5"><StepIcon status={t.steps.exitInterview} /></div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-700">Entrevista de Desligamento</span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {t.steps.exitInterview === 'concluído' ? 'Realizada — resultados registrados' :
                             t.steps.exitInterview === 'em_andamento' ? 'Formulário enviado ao colaborador via portal' :
                             'Será aplicada automaticamente via portal do colaborador'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                      {t.status === 'Em Aprovação' && (
                        <button className="px-3 py-1.5 text-xs font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700">Aprovar Rescisão</button>
                      )}
                      {(t.status === 'Em Aprovação' || t.status === 'Documentos Assinados') && (
                        <button className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Gerar TRCT PDF</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
