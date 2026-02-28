import { useState } from 'react';
import { Heart, Zap, CheckCircle, AlertTriangle, Plus, MoreHorizontal, RefreshCw, Shield } from 'lucide-react';

/* ── Types ─────────────────────────────────────────────────────────────── */

type BenefitType = 'Saúde' | 'VR' | 'VT' | 'Odonto' | 'Seguro de Vida' | 'Gympass';
type ApiStatus   = 'Conectado' | 'Erro' | 'Sincronizando';

interface Operator {
  id:            string;
  name:          string;
  type:          BenefitType;
  apiStatus:     ApiStatus;
  lastSync:      string;
  totalEmployees: number;
  monthlyCost:   number;
  coParticipation: boolean;
  eligibility:   string[];   // cargo labels
  discount:      string;     // description of discount rule
}

interface EmployeeBenefit {
  id:         string;
  name:       string;
  position:   string;
  health:     boolean;
  dental:     boolean;
  vr:         number;   // daily value
  vt:         boolean;
  life:       boolean;
  gym:        boolean;
  totalDiscount: number;
  coParticip:    number;
}

/* ── Mock data ──────────────────────────────────────────────────────────── */

const OPERATORS: Operator[] = [
  {
    id: 'OP001',
    name: 'Amil Saúde',
    type: 'Saúde',
    apiStatus: 'Conectado',
    lastSync: 'há 12 min',
    totalEmployees: 186,
    monthlyCost: 278_400,
    coParticipation: true,
    eligibility: ['Todos os CLT'],
    discount: 'Co-participação: 20% de consultas e exames, desc. máx. R$ 150/mês',
  },
  {
    id: 'OP002',
    name: 'OdontoPrev',
    type: 'Odonto',
    apiStatus: 'Conectado',
    lastSync: 'há 28 min',
    totalEmployees: 186,
    monthlyCost: 9_300,
    coParticipation: false,
    eligibility: ['Todos os CLT'],
    discount: 'Desconto fixo: R$ 18,00/mês por colaborador (sem co-participação)',
  },
  {
    id: 'OP003',
    name: 'Ticket Restaurante',
    type: 'VR',
    apiStatus: 'Sincronizando',
    lastSync: 'sincronizando...',
    totalEmployees: 186,
    monthlyCost: 111_600,
    coParticipation: false,
    eligibility: ['Todos os CLT'],
    discount: 'Desconto: 20% do valor do VR sobre salário base (máx. legislação)',
  },
  {
    id: 'OP004',
    name: 'Bilhete Único SP',
    type: 'VT',
    apiStatus: 'Conectado',
    lastSync: 'há 5 min',
    totalEmployees: 142,
    monthlyCost: 23_940,
    coParticipation: false,
    eligibility: ['CLT presencial'],
    discount: 'Desconto: 6% do salário base (limitado ao custo real do VT)',
  },
  {
    id: 'OP005',
    name: 'MetLife Vida',
    type: 'Seguro de Vida',
    apiStatus: 'Conectado',
    lastSync: 'há 2 h',
    totalEmployees: 186,
    monthlyCost: 5_580,
    coParticipation: false,
    eligibility: ['Todos os CLT'],
    discount: 'Custo integral empresa — sem desconto em folha',
  },
  {
    id: 'OP006',
    name: 'Gympass',
    type: 'Gympass',
    apiStatus: 'Erro',
    lastSync: 'falha — 09:14',
    totalEmployees: 54,
    monthlyCost: 8_100,
    coParticipation: true,
    eligibility: ['Pleno', 'Sênior', 'Especialista', 'Gerente', 'Diretor'],
    discount: 'Co-participação: 50% do plano escolhido pelo colaborador',
  },
];

const EMPLOYEES: EmployeeBenefit[] = [
  { id: 'E001', name: 'Ana Paula Ferreira',     position: 'Gerente de RH',        health: true, dental: true, vr: 35, vt: true,  life: true, gym: true,  totalDiscount: 487, coParticip: 120 },
  { id: 'E002', name: 'Carlos Eduardo Lima',    position: 'Analista de Sistemas',  health: true, dental: true, vr: 35, vt: true,  life: true, gym: true,  totalDiscount: 423, coParticip: 80  },
  { id: 'E003', name: 'Beatriz Souza',          position: 'Assistente Financeiro', health: true, dental: true, vr: 35, vt: true,  life: true, gym: false, totalDiscount: 312, coParticip: 60  },
  { id: 'E004', name: 'Rafael Nunes',           position: 'Dev Sênior',            health: true, dental: true, vr: 35, vt: false, life: true, gym: true,  totalDiscount: 390, coParticip: 95  },
  { id: 'E005', name: 'Fernanda Oliveira',      position: 'Designer UX',           health: true, dental: true, vr: 35, vt: true,  life: true, gym: false, totalDiscount: 298, coParticip: 55  },
  { id: 'E006', name: 'Guilherme Martins',      position: 'Esp. em Produto',       health: true, dental: true, vr: 35, vt: false, life: true, gym: true,  totalDiscount: 415, coParticip: 100 },
];

/* ── Helpers ────────────────────────────────────────────────────────────── */

function fmt(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const TYPE_BADGE: Record<BenefitType, string> = {
  'Saúde':        'bg-rose-100 text-rose-700',
  'VR':           'bg-emerald-100 text-emerald-700',
  'VT':           'bg-blue-100 text-blue-700',
  'Odonto':       'bg-sky-100 text-sky-700',
  'Seguro de Vida':'bg-purple-100 text-purple-700',
  'Gympass':      'bg-amber-100 text-amber-700',
};

const API_BADGE: Record<ApiStatus, { bg: string; dot: string; label: string }> = {
  Conectado:     { bg: 'bg-green-50 text-green-700',  dot: 'bg-green-500',  label: 'Conectado'     },
  Erro:          { bg: 'bg-rose-50 text-rose-700',    dot: 'bg-rose-500',   label: 'Erro de API'   },
  Sincronizando: { bg: 'bg-amber-50 text-amber-700',  dot: 'bg-amber-400',  label: 'Sincronizando' },
};

/* ── Sub-components ─────────────────────────────────────────────────────── */

function OperatorCard({ op }: { op: Operator }) {
  const [expanded, setExpanded] = useState(false);
  const api = API_BADGE[op.apiStatus];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-5">
        <div className="flex items-start gap-4">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${TYPE_BADGE[op.type]}`}>
            <Heart className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-slate-800">{op.name}</h3>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${TYPE_BADGE[op.type]}`}>
                {op.type}
              </span>
              {op.coParticipation && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700">
                  Co-participação
                </span>
              )}
            </div>
            {/* API status */}
            <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${api.bg}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${api.dot} ${op.apiStatus === 'Sincronizando' ? 'animate-pulse' : ''}`} />
              {api.label} · {op.lastSync}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {op.apiStatus === 'Erro' && (
            <button className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-semibold">
              <RefreshCw className="w-3 h-3" /> Reconectar
            </button>
          )}
          <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-0 border-t border-slate-100">
        {[
          { label: 'Colaboradores',   value: op.totalEmployees.toString() },
          { label: 'Custo Mensal',    value: fmt(op.monthlyCost)          },
          { label: 'Elegibilidade',   value: op.eligibility.join(', ')    },
        ].map((s, i) => (
          <div key={s.label} className={`px-4 py-3 ${i < 2 ? 'border-r border-slate-100' : ''}`}>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">{s.label}</p>
            <p className="text-sm font-semibold text-slate-700 truncate" title={s.value}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Expand */}
      <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
        <p className="text-xs text-slate-500 italic">{op.discount}</p>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="ml-4 shrink-0 text-xs text-pink-600 font-semibold hover:text-pink-700"
        >
          {expanded ? 'Ocultar ↑' : 'Detalhes ↓'}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 px-5 py-4 bg-slate-50/50 space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Configurações da Integração</p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: 'Tipo de conexão', value: 'API REST (OAuth 2.0)' },
              { label: 'Frequência de sync', value: 'A cada 30 minutos' },
              { label: 'Co-participação', value: op.coParticipation ? 'Ativa — calculada automaticamente' : 'Não aplicável' },
              { label: 'Integração folha', value: 'Desconto lançado automaticamente' },
            ].map((r) => (
              <div key={r.label} className="flex flex-col gap-0.5">
                <span className="text-slate-400 text-xs">{r.label}</span>
                <span className="text-slate-700 font-medium">{r.value}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <button className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
              Editar Operadora
            </button>
            <button className="px-3 py-1.5 text-xs font-semibold text-white bg-pink-600 rounded-lg hover:bg-pink-700 flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Sincronizar Agora
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Employee benefits table ────────────────────────────────────────────── */

function BenefitsTableTab() {
  const flag = (v: boolean) => v
    ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
    : <span className="block w-1.5 h-1.5 rounded-full bg-slate-200 mx-auto" />;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-800">Benefícios por Colaborador</h3>
          <p className="text-xs text-slate-400 mt-0.5">Descontos calculados e lançados automaticamente via API — sem importação manual</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-lg font-medium">
            <Zap className="w-3 h-3" /> API Ativa
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Colaborador</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Saúde</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Odonto</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">VR</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">VT</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Seguro</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Gym</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Co-Part.</th>
              <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Desc. Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {EMPLOYEES.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-5 py-3">
                  <p className="font-medium text-slate-800">{e.name}</p>
                  <p className="text-xs text-slate-400">{e.position}</p>
                </td>
                <td className="px-3 py-3 text-center">{flag(e.health)}</td>
                <td className="px-3 py-3 text-center">{flag(e.dental)}</td>
                <td className="px-3 py-3 text-center text-slate-600">
                  {e.vr > 0 ? `R$ ${e.vr}/dia` : flag(false)}
                </td>
                <td className="px-3 py-3 text-center">{flag(e.vt)}</td>
                <td className="px-3 py-3 text-center">{flag(e.life)}</td>
                <td className="px-3 py-3 text-center">{flag(e.gym)}</td>
                <td className="px-5 py-3 text-right text-slate-600">{fmt(e.coParticip)}</td>
                <td className="px-5 py-3 text-right font-semibold text-slate-800">{fmt(e.totalDiscount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 border-t border-slate-200">
              <td className="px-5 py-3 text-xs font-semibold text-slate-500" colSpan={7}>Total ({EMPLOYEES.length} colaboradores exibidos)</td>
              <td className="px-5 py-3 text-right font-bold text-slate-700">
                {fmt(EMPLOYEES.reduce((s, e) => s + e.coParticip, 0))}
              </td>
              <td className="px-5 py-3 text-right font-bold text-slate-800">
                {fmt(EMPLOYEES.reduce((s, e) => s + e.totalDiscount, 0))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

/* ── Eligibility rules tab ──────────────────────────────────────────────── */

const ELIGIBILITY_RULES = [
  { benefit: 'Plano de Saúde Amil',    positions: ['Todos CLT'], coParticip: true,  employerShare: '80%', employeeShare: '20% + co-participação' },
  { benefit: 'Odontológico OdontoPrev',positions: ['Todos CLT'], coParticip: false, employerShare: '100%', employeeShare: 'R$ 18,00 fixo' },
  { benefit: 'Vale Refeição Ticket',   positions: ['Todos CLT'], coParticip: false, employerShare: '80%', employeeShare: '20% do valor (lei PAT)' },
  { benefit: 'Vale Transporte',        positions: ['CLT Presencial'], coParticip: false, employerShare: 'Custo − 6% salário', employeeShare: '6% do salário base' },
  { benefit: 'Seguro de Vida MetLife', positions: ['Todos CLT'], coParticip: false, employerShare: '100%', employeeShare: 'Sem desconto em folha' },
  { benefit: 'Gympass',               positions: ['Pleno', 'Sênior', 'Especialista', 'Gerente', 'Diretor'], coParticip: true, employerShare: '50%', employeeShare: '50% do plano escolhido' },
];

function EligibilityTab() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h3 className="font-semibold text-slate-800">Regras de Elegibilidade e Rateio</h3>
        <p className="text-xs text-slate-400 mt-0.5">Definição de quais cargos têm direito a cada benefício e como o custo é distribuído</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Benefício</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Elegibilidade</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Co-Part.</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Empresa</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Colaborador</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {ELIGIBILITY_RULES.map((r) => (
              <tr key={r.benefit} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-5 py-3 font-medium text-slate-800">{r.benefit}</td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-1">
                    {r.positions.map((p) => (
                      <span key={p} className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">{p}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  {r.coParticip
                    ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                    : <span className="block w-1.5 h-1.5 rounded-full bg-slate-200 mx-auto" />}
                </td>
                <td className="px-5 py-3 text-slate-600">{r.employerShare}</td>
                <td className="px-5 py-3 text-slate-600">{r.employeeShare}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────────── */

const TABS = [
  { id: 'operators',    label: 'Operadoras'         },
  { id: 'employees',   label: 'Por Colaborador'     },
  { id: 'eligibility', label: 'Elegibilidade'       },
] as const;

type TabId = typeof TABS[number]['id'];

export default function Benefits() {
  const [tab, setTab] = useState<TabId>('operators');

  const totalMonthlyCost = OPERATORS.reduce((s, o) => s + o.monthlyCost, 0);
  const connectedCount   = OPERATORS.filter((o) => o.apiStatus === 'Conectado').length;
  const errorCount       = OPERATORS.filter((o) => o.apiStatus === 'Erro').length;

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestão de Benefícios</h1>
          <p className="text-slate-500 text-sm mt-1">
            Operadoras integradas via API — descontos aplicados automaticamente em folha, sem importação manual de arquivos
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium">
          <Plus className="w-4 h-4" /> Nova Operadora
        </button>
      </div>

      {/* Error banner */}
      {errorCount > 0 && (
        <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-xl px-5 py-4 mb-6">
          <AlertTriangle className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-rose-800">
              {errorCount} operadora{errorCount > 1 ? 's' : ''} com erro de conexão API
            </p>
            <p className="text-xs text-rose-600 mt-0.5">
              Os descontos dessas operadoras não estão sendo sincronizados automaticamente. Verifique as credenciais e reconecte.
            </p>
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Custo Total / Mês',  value: fmt(totalMonthlyCost), sub: 'empresa + colaborador' },
          { label: 'Operadoras Ativas',  value: OPERATORS.length.toString(), sub: `${connectedCount} conectadas` },
          { label: 'APIs Conectadas',    value: connectedCount.toString(),   sub: `${errorCount > 0 ? errorCount + ' com erro' : 'todas ok'}` },
          { label: 'Colaboradores',      value: '186',                       sub: 'com pelo menos 1 benefício' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs text-slate-500 mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-slate-800">{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* API info banner */}
      <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-5 py-4 mb-6">
        <Shield className="w-5 h-5 text-indigo-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-indigo-800">Integração 100% via API — sem importação de arquivos</p>
          <p className="text-xs text-indigo-600 mt-0.5">
            Os dados de utilização, co-participação e descontos são recebidos diretamente das operadoras via REST API com autenticação OAuth 2.0.
            O sistema aplica os descontos automaticamente no fechamento da folha de pagamento.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'operators' && (
        <div className="space-y-4">
          {OPERATORS.map((op) => <OperatorCard key={op.id} op={op} />)}
        </div>
      )}
      {tab === 'employees' && <BenefitsTableTab />}
      {tab === 'eligibility' && <EligibilityTab />}
    </div>
  );
}
