import { useState, useMemo } from 'react';
import {
  Users, Clock, DollarSign, Calendar, Briefcase, UserPlus,
  CheckCircle, FileText, TrendingUp, Search, Plus, X,
  ChevronRight, ChevronDown, AlertTriangle, AlertCircle,
  ArrowUpRight, Download, ShieldCheck, Building,
  Sparkles, Bell, BarChart3, Activity, Zap,
  UserCheck, CreditCard, MapPin, Phone, Mail,
  Hash, Settings, Menu, Edit3,
  ToggleLeft, ToggleRight, Eye, Check, XCircle,

} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import type {
  HRSection, ContractType, WorkRegime, EmployeeStatus, AbsenceType, ApprovalStatus,
  Employee, TimeRecord, PayrollGroup, Schedule
} from './hrData';
import {
  mockEmployees, mockWarnings, mockAbsences, mockOvertimes,
  changeRequests, overtimes, absences, timeRecords, schedules, alertConfigs, deptMetrics, getHistory, employees,
  payrollGroups
} from './hrData';

type TimesheetTab =
  | 'mirror' | 'overtime' | 'overtime-pending'
  | 'change-requests' | 'justified' | 'unjustified'
  | 'alerts' | 'schedules';

// ============================================================
// SHARED COMPONENTS
// ============================================================
function ZIACard({ insights }: { insights: string[] }) {
  return (
    <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-4 text-white shadow-lg">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-violet-200" />
        <span className="font-bold text-sm">ZIA — Inteligência Artificial</span>
      </div>
      <div className="space-y-2">
        {insights.map((insight, i) => (
          <div key={i} className="flex items-start gap-2 text-sm text-violet-100">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-300 mt-1.5 shrink-0" />
            {insight}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: EmployeeStatus }) {
  const styles = {
    Ativo: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Inativo: 'bg-slate-100 text-slate-600 border-slate-200',
    Afastado: 'bg-orange-50 text-orange-700 border-orange-200',
    Férias: 'bg-blue-50 text-blue-700 border-blue-200',
  };
  return <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${styles[status]}`}>{status}</span>;
}

function SeverityBadge({ severity }: { severity: 'Baixa' | 'Média' | 'Alta' }) {
  const styles = { Baixa: 'bg-yellow-50 text-yellow-700', Média: 'bg-orange-50 text-orange-700', Alta: 'bg-red-50 text-red-700' };
  return <span className={`px-2 py-0.5 rounded text-xs font-bold ${styles[severity]}`}>{severity}</span>;
}

function TabButton({ label, active, onClick, badge }: {
  id: string; label: string; active: boolean;
  onClick: () => void; badge?: number;
}) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition-colors
        ${active ? 'border-indigo-500 text-indigo-600 bg-indigo-50' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200'}`}>
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5 font-black">{badge}</span>
      )}
    </button>
  );
}

function ApprovalBadge({ status }: { status: ApprovalStatus }) {
  const s = {
    Pendente: 'bg-amber-100 text-amber-700',
    Aprovado: 'bg-emerald-100 text-emerald-700',
    Rejeitado: 'bg-red-100 text-red-700',
  };
  return <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${s[status]}`}>{status}</span>;
}

function StatusDot({ status }: { status: TimeRecord['status'] }) {
  const cfg: Record<string, { bg: string; text: string; label: string }> = {
    Normal:    { bg: 'bg-emerald-500', text: 'text-emerald-700', label: 'Normal' },
    Atraso:    { bg: 'bg-amber-500',   text: 'text-amber-700',   label: 'Atraso' },
    Falta:     { bg: 'bg-red-500',     text: 'text-red-700',     label: 'Falta' },
    Incompleto:{ bg: 'bg-orange-400',  text: 'text-orange-700',  label: 'Incompleto' },
    Folga:     { bg: 'bg-slate-400',   text: 'text-slate-500',   label: 'Folga' },
    Feriado:   { bg: 'bg-blue-400',    text: 'text-blue-700',    label: 'Feriado' },
  };
  const c = cfg[status] ?? cfg.Normal;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.bg}`} />
      <span className={c.text}>{c.label}</span>
    </span>
  );
}

function ZIABanner({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 p-3 bg-violet-50 border border-violet-200 rounded-xl">
      <Sparkles className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
      <p className="text-sm text-violet-800">{text}</p>
    </div>
  );
}

function MiniBar({ value, max, color = 'bg-indigo-500' }: { value: number; max: number; color?: string }) {
  return (
    <div className="w-full bg-slate-100 rounded-full h-1.5">
      <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
    </div>
  );
}

function SparkLine({ data, color = '#6366f1' }: { data: number[]; color?: string }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 80;
    const y = 28 - ((v - min) / range) * 22;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width="80" height="28" viewBox="0 0 80 28" className="overflow-visible">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ============================================================
// NAVIGATION CONFIG
// ============================================================
interface NavItem {
  id: HRSection;
  label: string;
  icon: React.ElementType;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
  {
    id: 'employee-list', label: 'Funcionários', icon: Users,
    children: [
      { id: 'employee-register', label: 'Cadastro de Funcionário', icon: UserPlus },
      { id: 'employee-list', label: 'Lista de Funcionários', icon: Users },
      { id: 'timesheet', label: 'Folha de Ponto', icon: Clock },
      { id: 'employee-metrics', label: 'Métricas', icon: BarChart3 },
      { id: 'payroll', label: 'Folha de Pagamento', icon: DollarSign },
      { id: 'employee-groups', label: 'Grupos de Funcionários', icon: Building },
      { id: 'absences', label: 'Faltas e Ausências', icon: AlertCircle },
      { id: 'planned-leaves', label: 'Folgas Planejadas', icon: Calendar },
      { id: 'hourbank', label: 'Banco de Horas', icon: Activity },
      { id: 'vacations', label: 'Férias', icon: Briefcase },
      { id: 'annotations', label: 'Anotações e Atividades', icon: FileText },
    ]
  },
  {
    id: 'admissions-metrics', label: 'Admissões', icon: UserPlus,
    children: [
      { id: 'admissions-metrics', label: 'Métricas de Admissões', icon: BarChart3 },
      { id: 'vacancies', label: 'Vagas', icon: Briefcase },
      { id: 'admission-alerts', label: 'Alertas de Admissão', icon: Bell },
    ]
  },
];

// ============================================================
// SIDEBAR
// ============================================================
function Sidebar({ active, onNavigate }: { active: HRSection; onNavigate: (s: HRSection) => void }) {
  const { config } = useAppContext();

  const [expanded, setExpanded] = useState<string[]>(['employee-list', 'admissions-metrics']);

  const toggleExpand = (id: string) => {
    setExpanded(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const isActive = (id: HRSection) => active === id;
  const pc = config.primaryColor;

  return (
    <div className="w-56 shrink-0 bg-white border-r border-slate-100 flex flex-col h-full shadow-sm">
      <div className={`p-4 border-b border-slate-100 bg-${pc}-600`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">Pessoas</p>
            <p className="text-white/60 text-xs">Recursos Humanos</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {navItems.map(item => (
          <div key={item.id}>
            {item.children ? (
              <>
                <button
                  onClick={() => toggleExpand(item.id)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors text-sm font-semibold mt-1"
                >
                  <div className="flex items-center gap-2">
                    <item.icon className="w-4 h-4 text-slate-400" />
                    {item.label}
                  </div>
                  {expanded.includes(item.id) ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>
                {expanded.includes(item.id) && (
                  <div className="ml-2 border-l border-slate-100 pl-2 space-y-0.5 mb-1">
                    {item.children.map(child => (
                      <button
                        key={child.id}
                        onClick={() => onNavigate(child.id)}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors text-left
                          ${isActive(child.id)
                            ? `bg-${pc}-50 text-${pc}-700 font-bold`
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
                      >
                        <child.icon className={`w-3.5 h-3.5 ${isActive(child.id) ? `text-${pc}-500` : 'text-slate-300'}`} />
                        {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors mt-0.5
                  ${isActive(item.id)
                    ? `bg-${pc}-50 text-${pc}-700 font-bold`
                    : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <item.icon className={`w-4 h-4 ${isActive(item.id) ? `text-${pc}-500` : 'text-slate-400'}`} />
                {item.label}
              </button>
            )}
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-100">
        <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">RH</div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-700 truncate">Gestor RH</p>
            <p className="text-[10px] text-slate-400">Admin</p>
          </div>
          <Settings className="w-3.5 h-3.5 text-slate-300" />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DASHBOARD
// ============================================================
function DashboardSection({ onNavigate }: { onNavigate: (s: HRSection) => void }) {
  const activeCount = mockEmployees.filter(e => e.status === 'Ativo').length;
  const alertCount = mockWarnings.filter(w => w.status === 'Pendente Assinatura').length + mockAbsences.filter(a => !a.justified).length;
  const overtimePending = mockOvertimes.filter(o => o.approvalStatus === 'Pendente').length;
  const hourBankIssues = mockEmployees.filter(e => e.hourBankBalance < 0).length;

  const deptData = useMemo(() => {
    const counts: Record<string, number> = {};
    mockEmployees.forEach(e => { counts[e.department] = (counts[e.department] || 0) + 1; });
    const total = mockEmployees.length;
    return Object.entries(counts).map(([name, count]) => ({ name, count, pct: Math.round(count / total * 100) }));
  }, []);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Headcount', value: mockEmployees.length.toString(), sub: `${activeCount} ativos`, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', change: '+2 este mês', up: true },
          { label: 'Turnover', value: '4.2%', sub: 'Últimos 90 dias', icon: ArrowUpRight, color: 'text-red-500', bg: 'bg-red-50', change: '-0.8% vs anterior', up: true },
          { label: 'Banco de Horas', value: '12.4h', sub: 'Média por funcionário', icon: Clock, color: 'text-purple-600', bg: 'bg-purple-50', change: '+2.1h vs anterior', up: false },
          { label: 'Alertas Ativos', value: alertCount.toString(), sub: 'Requerem atenção', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', change: `${overtimePending} HE pendentes`, up: false },
        ].map((kpi, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2.5 rounded-xl ${kpi.bg}`}>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <span className={`text-xs font-semibold ${kpi.up ? 'text-emerald-600' : 'text-amber-600'}`}>{kpi.change}</span>
            </div>
            <p className="text-2xl font-black text-slate-900">{kpi.value}</p>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">{kpi.label}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Dept breakdown */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-4 text-sm">Funcionários por Departamento</h3>
          <div className="space-y-3">
            {deptData.map((d, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-slate-600">{d.name}</span>
                  <span className="text-slate-400">{d.count} ({d.pct}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${d.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active alerts */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-4 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" /> Alertas Ativos
          </h3>
          <div className="space-y-2">
            {mockAbsences.filter(a => !a.justified).map(a => (
              <div key={a.id} className="flex items-center gap-2 p-2.5 bg-red-50 rounded-lg border border-red-100">
                <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800">Falta Injustificada</p>
                  <p className="text-[11px] text-slate-500 truncate">{a.employeeName} — {a.date}</p>
                </div>
                <span className="text-[11px] font-bold text-red-600">-R${a.financialImpact.toFixed(0)}</span>
              </div>
            ))}
            {mockOvertimes.filter(o => o.approvalStatus === 'Pendente').map(o => (
              <div key={o.id} className="flex items-center gap-2 p-2.5 bg-amber-50 rounded-lg border border-amber-100">
                <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800">HE Pendente Aprovação</p>
                  <p className="text-[11px] text-slate-500 truncate">{o.employeeName} — {o.hours}h</p>
                </div>
                <button onClick={() => onNavigate('timesheet')} className="text-[11px] text-amber-700 font-bold hover:underline">Ver</button>
              </div>
            ))}
            {hourBankIssues > 0 && (
              <div className="flex items-center gap-2 p-2.5 bg-purple-50 rounded-lg border border-purple-100">
                <div className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                <p className="text-xs font-bold text-slate-800 flex-1">{hourBankIssues} func. com saldo negativo</p>
                <button onClick={() => onNavigate('hourbank')} className="text-[11px] text-purple-700 font-bold hover:underline">Ver</button>
              </div>
            )}
          </div>
        </div>

        {/* ZIA insights */}
        <ZIACard insights={[
          `Pedro Costa tem 2 advertências nos últimos 90 dias — risco de reincidência elevado.`,
          `Setor TI concentra 60% das horas extras — avaliar redistribuição ou contratação.`,
          `3 vagas abertas há mais de 10 dias sem candidatos suficientes.`,
        ]} />
      </div>

      {/* Quick access */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-800 mb-4 text-sm">Ações Rápidas</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Novo Funcionário', icon: UserPlus, section: 'employee-register' as HRSection, color: 'bg-indigo-50 text-indigo-700' },
            { label: 'Aprovar HE', icon: CheckCircle, section: 'timesheet' as HRSection, color: 'bg-emerald-50 text-emerald-700' },
            { label: 'Folha de Pagamento', icon: DollarSign, section: 'payroll' as HRSection, color: 'bg-blue-50 text-blue-700' },
            { label: 'Nova Vaga', icon: Briefcase, section: 'vacancies' as HRSection, color: 'bg-amber-50 text-amber-700' },
          ].map((action, i) => (
            <button key={i} onClick={() => onNavigate(action.section)}
              className={`flex items-center gap-3 p-3 rounded-xl ${action.color} hover:opacity-80 transition-opacity text-left`}>
              <action.icon className="w-5 h-5" />
              <span className="text-sm font-bold">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">Atividade Recente</h3>
          <button className="text-xs text-indigo-600 font-semibold hover:underline">Ver tudo</button>
        </div>
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              {['Funcionário', 'Evento', 'Data', 'Status'].map(h => (
                <th key={h} className="p-3 text-[11px] font-bold text-slate-400 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            <tr className="hover:bg-slate-50"><td className="p-3 text-sm font-medium">Ana Silva</td><td className="p-3 text-sm text-slate-600">Hora Extra — Deploy emergência</td><td className="p-3 text-sm text-slate-500">26/10/2023</td><td className="p-3"><span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-bold">Pendente</span></td></tr>
            <tr className="hover:bg-slate-50"><td className="p-3 text-sm font-medium">Maria Oliveira</td><td className="p-3 text-sm text-slate-600">Ausência Justificada — Médica</td><td className="p-3 text-sm text-slate-500">24/10/2023</td><td className="p-3"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-bold">Registrada</span></td></tr>
            <tr className="hover:bg-slate-50"><td className="p-3 text-sm font-medium">Pedro Costa</td><td className="p-3 text-sm text-slate-600">Advertência Verbal — Linguagem</td><td className="p-3 text-sm text-slate-500">15/10/2023</td><td className="p-3"><span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold">Assinada</span></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
// EMPLOYEE REGISTRATION
// ============================================================
function EmployeeRegisterSection({ onNavigate }: { onNavigate: (s: HRSection) => void }) {
  const { config } = useAppContext();

  const pc = config.primaryColor;

  const [form, setForm] = useState({
    name: '', cpf: '', rg: '', ctps: '', pis: '', birthDate: '', phone: '', email: '',
    address: '', city: '', state: 'SP', zip: '',
    contractType: 'CLT' as ContractType, workRegime: 'Horário Fixo' as WorkRegime,
    role: '', department: '', manager: '', admissionDate: '', salary: '' as unknown as number,
    benefits: [] as string[], payrollGroup: '',
    bank: '', agency: '', account: '', accountType: 'Corrente', pixKey: '',
    corporateEmail: '', accessLevel: 'User',
  });
  const [saved, setSaved] = useState(false);
  const [ziaActive, setZiaActive] = useState(false);
  const [activeSection, setActiveSection] = useState<'personal' | 'contract' | 'bank' | 'access'>('personal');

  const updateField = (field: string, value: string | string[] | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if ((field === 'role' || field === 'department') && form.role && form.department) {
      setZiaActive(true);
    }
  };

  const toggleBenefit = (b: string) => {
    const current = form.benefits;
    updateField('benefits', current.includes(b) ? current.filter(x => x !== b) : [...current, b]);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => { setSaved(false); onNavigate('employee-list'); }, 2500);
  };

  const sections = [
    { id: 'personal', label: 'Dados Pessoais', icon: Users },
    { id: 'contract', label: 'Contrato', icon: Briefcase },
    { id: 'bank', label: 'Dados Bancários', icon: CreditCard },
    { id: 'access', label: 'Acesso ao Sistema', icon: ShieldCheck },
  ] as const;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900">Cadastro de Funcionário</h2>
          <p className="text-sm text-slate-500">Preencha todas as seções para concluir a admissão</p>
        </div>
        <button onClick={() => onNavigate('employee-list')} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
          <X className="w-4 h-4" /> Cancelar
        </button>
      </div>

      {/* Progress tabs */}
      <div className="flex bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        {sections.map((sec, i) => (
          <button key={sec.id} onClick={() => setActiveSection(sec.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold border-r border-slate-100 last:border-0 transition-colors
              ${activeSection === sec.id ? `bg-${pc}-50 text-${pc}-700` : 'text-slate-500 hover:bg-slate-50'}`}>
            <sec.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{sec.label}</span>
            <span className="sm:hidden">{i + 1}</span>
          </button>
        ))}
      </div>

      {/* Automation notice */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <Zap className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-amber-800">Admissão Automatizada</p>
          <p className="text-sm text-amber-700 mt-0.5">
            Ao salvar, o sistema irá: <span className="font-semibold">notificar o financeiro</span> · <span className="font-semibold">criar perfil de ponto</span> · <span className="font-semibold">vincular ao grupo de folha</span> · <span className="font-semibold">disparar e-mail de onboarding</span>
          </p>
        </div>
      </div>

      {/* SECTION: Personal */}
      {activeSection === 'personal' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
          <h3 className="font-bold text-slate-800 flex items-center gap-2"><Users className="w-4 h-4 text-indigo-500" /> Dados Pessoais</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 mb-1.5">NOME COMPLETO *</label>
              <input value={form.name} onChange={e => updateField('name', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="Ex: João da Silva" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">CPF *</label>
              <input value={form.cpf} onChange={e => updateField('cpf', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="000.000.000-00" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">RG *</label>
              <input value={form.rg} onChange={e => updateField('rg', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="00.000.000-0" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">CTPS</label>
              <input value={form.ctps} onChange={e => updateField('ctps', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="000000/001" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">PIS</label>
              <input value={form.pis} onChange={e => updateField('pis', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="00000000000" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">DATA DE NASCIMENTO *</label>
              <input type="date" value={form.birthDate} onChange={e => updateField('birthDate', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">TELEFONE *</label>
              <input value={form.phone} onChange={e => updateField('phone', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="(00) 00000-0000" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">E-MAIL PESSOAL *</label>
              <input type="email" value={form.email} onChange={e => updateField('email', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="joao@email.com" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 mb-1.5">ENDEREÇO COMPLETO</label>
              <input value={form.address} onChange={e => updateField('address', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="Rua, número, complemento, bairro" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">CIDADE</label>
              <input value={form.city} onChange={e => updateField('city', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="São Paulo" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">ESTADO</label>
                <select value={form.state} onChange={e => updateField('state', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  {['SP','RJ','MG','RS','PR','BA','SC','GO','PE','CE'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">CEP</label>
                <input value={form.zip} onChange={e => updateField('zip', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="00000-000" />
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={() => setActiveSection('contract')}
              className={`px-5 py-2.5 bg-${pc}-600 text-white rounded-xl font-bold text-sm hover:bg-${pc}-700 flex items-center gap-2`}>
              Próximo: Contrato <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* SECTION: Contract */}
      {activeSection === 'contract' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
          <h3 className="font-bold text-slate-800 flex items-center gap-2"><Briefcase className="w-4 h-4 text-indigo-500" /> Dados Contratuais</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">TIPO DE CONTRATO *</label>
              <select value={form.contractType} onChange={e => updateField('contractType', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                {['CLT','PJ','Temporário','Estágio'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">REGIME DE TRABALHO *</label>
              <select value={form.workRegime} onChange={e => updateField('workRegime', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                {['Horário Fixo','Escala','Banco de Horas'].map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">CARGO *</label>
              <input value={form.role} onChange={e => updateField('role', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="Ex: Analista de Sistemas" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">DEPARTAMENTO *</label>
              <select value={form.department} onChange={e => updateField('department', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="">Selecionar...</option>
                {['TI','Comercial','Marketing','RH','Financeiro','Operações','Jurídico'].map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">GESTOR DIRETO *</label>
              <select value={form.manager} onChange={e => updateField('manager', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="">Selecionar...</option>
                {mockEmployees.filter(e => e.accessLevel !== 'User').map(e => <option key={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">DATA DE ADMISSÃO *</label>
              <input type="date" value={form.admissionDate} onChange={e => updateField('admissionDate', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">SALÁRIO BASE *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">R$</span>
                <input type="number" value={form.salary} onChange={e => updateField('salary', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="0,00" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">GRUPO DE FOLHA</label>
              <select value={form.payrollGroup} onChange={e => updateField('payrollGroup', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="">Selecionar...</option>
                {['Mensalistas','Estagiários','Gestores','PJs'].map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 mb-2">BENEFÍCIOS</label>
              <div className="flex flex-wrap gap-2">
                {['VT','VR','Plano de Saúde','Odonto','Previdência'].map(b => (
                  <button key={b} onClick={() => toggleBenefit(b)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all
                      ${form.benefits.includes(b) ? `bg-indigo-100 text-indigo-700 border-indigo-300` : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                    {b}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ZIA suggestion */}
          {ziaActive && form.role && form.department && (
            <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-violet-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-violet-800">ZIA sugere para {form.role} em {form.department}:</p>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-white rounded-lg p-2 border border-violet-100">
                      <p className="text-violet-500 font-bold uppercase text-[10px]">Escala ideal</p>
                      <p className="text-slate-700 font-semibold mt-0.5">Horário Fixo 8h/dia</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 border border-violet-100">
                      <p className="text-violet-500 font-bold uppercase text-[10px]">Grupo de Atividades</p>
                      <p className="text-slate-700 font-semibold mt-0.5">Onboarding Técnico</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 border border-violet-100">
                      <p className="text-violet-500 font-bold uppercase text-[10px]">Alertas</p>
                      <p className="text-slate-700 font-semibold mt-0.5">Ponto + Produtividade</p>
                    </div>
                  </div>
                  <button className="mt-2 text-xs text-violet-600 font-bold hover:underline">Aplicar sugestões da ZIA →</button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <button onClick={() => setActiveSection('personal')}
              className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50">
              ← Anterior
            </button>
            <button onClick={() => setActiveSection('bank')}
              className={`px-5 py-2.5 bg-${pc}-600 text-white rounded-xl font-bold text-sm hover:bg-${pc}-700 flex items-center gap-2`}>
              Próximo: Dados Bancários <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* SECTION: Bank */}
      {activeSection === 'bank' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
          <h3 className="font-bold text-slate-800 flex items-center gap-2"><CreditCard className="w-4 h-4 text-indigo-500" /> Dados Bancários</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">BANCO *</label>
              <select value={form.bank} onChange={e => updateField('bank', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="">Selecionar...</option>
                {['Itaú','Bradesco','Santander','Banco do Brasil','Caixa','Nubank','C6 Bank','Inter','BTG Pactual'].map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">TIPO DE CONTA</label>
              <select value={form.accountType} onChange={e => updateField('accountType', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option>Corrente</option>
                <option>Poupança</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">AGÊNCIA *</label>
              <input value={form.agency} onChange={e => updateField('agency', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="0000" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">CONTA *</label>
              <input value={form.account} onChange={e => updateField('account', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="00000-0" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 mb-1.5">CHAVE PIX (opcional)</label>
              <input value={form.pixKey} onChange={e => updateField('pixKey', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="CPF, e-mail, telefone ou chave aleatória" />
            </div>
          </div>
          <div className="flex justify-between">
            <button onClick={() => setActiveSection('contract')}
              className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50">← Anterior</button>
            <button onClick={() => setActiveSection('access')}
              className={`px-5 py-2.5 bg-${pc}-600 text-white rounded-xl font-bold text-sm hover:bg-${pc}-700 flex items-center gap-2`}>
              Próximo: Acesso <ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* SECTION: Access */}
      {activeSection === 'access' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
          <h3 className="font-bold text-slate-800 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-indigo-500" /> Acesso ao Sistema</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">E-MAIL CORPORATIVO</label>
              <div className="relative">
                <input value={form.corporateEmail || (form.name ? form.name.toLowerCase().replace(' ', '.') + '@empresa.com' : '')}
                  onChange={e => updateField('corporateEmail', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="joao.silva@empresa.com" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-emerald-600 font-bold">Auto-gerado</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">NÍVEL DE ACESSO *</label>
              <select value={form.accessLevel} onChange={e => updateField('accessLevel', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="User">User — Acesso básico</option>
                <option value="Manager">Manager — Aprova solicitações</option>
                <option value="Admin">Admin — Acesso total</option>
              </select>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <p className="text-xs font-bold text-slate-600 mb-3">RESUMO DA ADMISSÃO</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Nome', value: form.name || '—' },
                { label: 'Cargo', value: form.role || '—' },
                { label: 'Departamento', value: form.department || '—' },
                { label: 'Contrato', value: form.contractType },
                { label: 'Salário', value: form.salary ? `R$ ${Number(form.salary).toLocaleString('pt-BR')}` : '—' },
                { label: 'Grupo de Folha', value: form.payrollGroup || '—' },
                { label: 'Benefícios', value: form.benefits.length > 0 ? form.benefits.join(', ') : 'Nenhum' },
                { label: 'Acesso', value: form.accessLevel },
              ].map((item, i) => (
                <div key={i}>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">{item.label}</p>
                  <p className="text-xs font-semibold text-slate-700 mt-0.5 truncate">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between">
            <button onClick={() => setActiveSection('bank')}
              className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50">← Anterior</button>
            <button onClick={handleSave}
              className={`px-6 py-2.5 bg-${pc}-600 text-white rounded-xl font-bold text-sm hover:bg-${pc}-700 flex items-center gap-2 shadow-md`}>
              <UserCheck className="w-4 h-4" /> Salvar Admissão
            </button>
          </div>
        </div>
      )}

      {/* Success toast */}
      {saved && (
        <div className="fixed bottom-6 right-6 bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 z-50 animate-bounce">
          <CheckCircle className="w-5 h-5" />
          <div>
            <p className="font-bold text-sm">Admissão salva com sucesso!</p>
            <p className="text-xs text-emerald-100">Financeiro notificado · Ponto criado · E-mail disparado</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// EMPLOYEE LIST
// ============================================================
function EmployeeListSection({ onNavigate }: { onNavigate: (s: HRSection) => void }) {
  const { config } = useAppContext();

  const pc = config.primaryColor;
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<EmployeeStatus | 'Todos'>('Todos');
  const [filterDept, setFilterDept] = useState('Todos');
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);

  const depts = ['Todos', ...Array.from(new Set(mockEmployees.map(e => e.department)))];
  const filtered = mockEmployees.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.role.toLowerCase().includes(search.toLowerCase()) ||
      e.cpf.includes(search);
    const matchStatus = filterStatus === 'Todos' || e.status === filterStatus;
    const matchDept = filterDept === 'Todos' || e.department === filterDept;
    return matchSearch && matchStatus && matchDept;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900">Funcionários</h2>
          <p className="text-sm text-slate-500">{filtered.length} colaboradores encontrados</p>
        </div>
        <button onClick={() => onNavigate('employee-register')}
          className={`flex items-center gap-2 px-4 py-2.5 bg-${pc}-600 text-white rounded-xl font-bold text-sm shadow-sm hover:bg-${pc}-700`}>
          <Plus className="w-4 h-4" /> Novo Funcionário
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, cargo ou CPF..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
          <option value="Todos">Todos os status</option>
          {(['Ativo','Inativo','Afastado','Férias'] as EmployeeStatus[]).map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
          {depts.map(d => <option key={d}>{d}</option>)}
        </select>
        <button className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
          <Download className="w-4 h-4" /> Exportar
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              {['Colaborador','Departamento','Regime','Admissão','Banco Hrs','Status','Ações'].map(h => (
                <th key={h} className="p-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(emp => (
              <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full bg-${pc}-100 flex items-center justify-center text-${pc}-700 font-bold text-xs shrink-0`}>
                      {emp.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{emp.name}</p>
                      <p className="text-xs text-slate-400">{emp.role}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4 text-sm text-slate-600">{emp.department}</td>
                <td className="p-4">
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg font-medium">{emp.contractType}</span>
                  <span className="text-xs text-slate-400 ml-1">{emp.workRegime}</span>
                </td>
                <td className="p-4 text-sm text-slate-500">{new Date(emp.admissionDate).toLocaleDateString('pt-BR')}</td>
                <td className="p-4">
                  <span className={`text-sm font-bold ${emp.hourBankBalance < 0 ? 'text-red-600' : emp.hourBankBalance > 20 ? 'text-amber-600' : 'text-slate-700'}`}>
                    {emp.hourBankBalance > 0 ? '+' : ''}{emp.hourBankBalance}h
                  </span>
                </td>
                <td className="p-4"><StatusBadge status={emp.status} /></td>
                <td className="p-4">
                  <button onClick={() => setSelectedEmp(emp)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Employee profile modal */}
      {selectedEmp && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl bg-${pc}-100 flex items-center justify-center text-${pc}-700 font-black text-lg`}>
                  {selectedEmp.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">{selectedEmp.name}</h3>
                  <p className="text-sm text-slate-500">{selectedEmp.role} · {selectedEmp.department}</p>
                </div>
                <StatusBadge status={selectedEmp.status} />
              </div>
              <button onClick={() => setSelectedEmp(null)} className="p-2 hover:bg-slate-200 rounded-full"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="overflow-y-auto p-6 space-y-5">
              {/* Quick metrics */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Banco de Horas', value: `${selectedEmp.hourBankBalance}h`, color: selectedEmp.hourBankBalance < 0 ? 'text-red-600' : 'text-slate-900' },
                  { label: 'Férias Disponíveis', value: `${selectedEmp.vacationDays}d`, color: 'text-slate-900' },
                  { label: 'Advertências', value: selectedEmp.warnings.toString(), color: selectedEmp.warnings > 0 ? 'text-orange-600' : 'text-slate-900' },
                  { label: 'Salário Base', value: `R$ ${selectedEmp.salary.toLocaleString('pt-BR')}`, color: 'text-emerald-700' },
                ].map((m, i) => (
                  <div key={i} className="bg-slate-50 rounded-xl p-3 text-center">
                    <p className={`text-lg font-black ${m.color}`}>{m.value}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{m.label}</p>
                  </div>
                ))}
              </div>
              {/* Details grid */}
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-700 text-sm border-b border-slate-100 pb-2">Dados Pessoais</h4>
                  {[
                    { icon: Mail, label: 'E-mail', value: selectedEmp.email },
                    { icon: Phone, label: 'Telefone', value: selectedEmp.phone },
                    { icon: Hash, label: 'CPF', value: selectedEmp.cpf },
                    { icon: Hash, label: 'PIS', value: selectedEmp.pis },
                    { icon: MapPin, label: 'Endereço', value: selectedEmp.address },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <item.icon className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">{item.label}</p>
                        <p className="text-xs text-slate-700">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-700 text-sm border-b border-slate-100 pb-2">Contrato</h4>
                  {[
                    { label: 'Gestor', value: selectedEmp.manager },
                    { label: 'Tipo de Contrato', value: selectedEmp.contractType },
                    { label: 'Regime', value: selectedEmp.workRegime },
                    { label: 'Admissão', value: new Date(selectedEmp.admissionDate).toLocaleDateString('pt-BR') },
                    { label: 'Nível de Acesso', value: selectedEmp.accessLevel },
                    { label: 'Benefícios', value: selectedEmp.benefits.join(', ') || 'Nenhum' },
                  ].map((item, i) => (
                    <div key={i}>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">{item.label}</p>
                      <p className="text-xs text-slate-700">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
              {/* Warnings */}
              {selectedEmp.warnings > 0 && (
                <div>
                  <h4 className="font-bold text-slate-700 text-sm border-b border-slate-100 pb-2 mb-3">Advertências</h4>
                  {mockWarnings.filter(w => w.employeeId === selectedEmp.id).map(w => (
                    <div key={w.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-xl border border-orange-100 mb-2">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{w.type}</p>
                        <p className="text-xs text-slate-500">{w.reason} · {w.date}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <SeverityBadge severity={w.severity} />
                        <span className={`text-xs px-2 py-0.5 rounded font-bold ${w.status === 'Assinada' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{w.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
              <button className="text-sm text-indigo-600 font-bold hover:underline" onClick={() => { setSelectedEmp(null); onNavigate('employee-metrics'); }}>
                Ver Métricas Completas →
              </button>
              <button onClick={() => setSelectedEmp(null)} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 text-sm font-medium hover:bg-slate-50">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// TIMESHEET
// ============================================================
function MirrorTab() {
  const [selectedEmployee, setSelectedEmployee] = useState('Todos');
  const [selectedMonth, setSelectedMonth] = useState('2023-10');

  const filtered = selectedEmployee === 'Todos'
    ? timeRecords
    : timeRecords.filter(r => r.employeeName === selectedEmployee);

  const totalHrs = filtered.reduce((a, r) => a + r.totalHours, 0);
  const totalOT  = filtered.reduce((a, r) => a + r.overtimeHours, 0);
  const totalFaults = filtered.filter(r => r.status === 'Falta').length;
  const totalDelays = filtered.filter(r => r.status === 'Atraso').length;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-400" />
          <select value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
            <option value="Todos">Todos</option>
            {mockEmployees.map(e => <option key={e.name}>{e.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        </div>
        <div className="flex-1" />
        <button className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
          <Download className="w-4 h-4" /> PDF
        </button>
        <button className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
          <Download className="w-4 h-4" /> CSV
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Trabalhadas', value: `${totalHrs}h`, color: 'text-slate-900', bg: 'bg-white' },
          { label: 'Horas Extras', value: `${totalOT}h`, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Faltas', value: totalFaults.toString(), color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Atrasos', value: totalDelays.toString(), color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map((c, i) => (
          <div key={i} className={`${c.bg} rounded-xl p-4 border border-slate-100 text-center`}>
            <p className={`text-2xl font-black ${c.color}`}>{c.value}</p>
            <p className="text-xs text-slate-500 mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              {['Colaborador','Data','Dia','Entrada','Saída','Almoço','Total','HE','Status'].map(h => (
                <th key={h} className="p-3 text-[10px] font-bold text-slate-400 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(r => (
              <tr key={r.id} className={`hover:bg-slate-50 transition-colors ${r.status === 'Falta' ? 'bg-red-50/30' : r.status === 'Folga' || r.status === 'Feriado' ? 'bg-slate-50/50' : ''}`}>
                <td className="p-3 text-sm font-medium text-slate-800">{r.employeeName}</td>
                <td className="p-3 text-sm text-slate-600">{new Date(r.date).toLocaleDateString('pt-BR')}</td>
                <td className="p-3 text-xs text-slate-400">{new Date(r.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' })}</td>
                <td className="p-3 font-mono text-sm text-slate-700">{r.checkIn || '—'}</td>
                <td className="p-3 font-mono text-sm text-slate-700">{r.checkOut || '—'}</td>
                <td className="p-3 font-mono text-xs text-slate-500">
                  {r.lunchStart && r.lunchEnd ? `${r.lunchStart}–${r.lunchEnd}` : '—'}
                </td>
                <td className="p-3 text-sm font-bold text-slate-800">{r.totalHours > 0 ? `${r.totalHours}h` : '—'}</td>
                <td className="p-3">
                  {r.overtimeHours > 0
                    ? <span className="text-xs font-bold text-amber-600">+{r.overtimeHours}h</span>
                    : <span className="text-xs text-slate-300">—</span>}
                </td>
                <td className="p-3"><StatusDot status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">{filtered.length} registros no período</span>
          <div className="flex gap-4 text-xs">
            <span className="text-slate-600">Total: <strong>{totalHrs}h trabalhadas</strong></span>
            {totalOT > 0 && <span className="text-amber-600">+{totalOT}h extras</span>}
            {totalFaults > 0 && <span className="text-red-600">{totalFaults} falta(s)</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function OvertimeTab() {
  const [filter, setFilter] = useState<ApprovalStatus | 'Todos'>('Todos');
  const [localOT, setLocalOT] = useState(overtimes);

  const filtered = filter === 'Todos' ? localOT : localOT.filter(o => o.approvalStatus === filter);

  const approve = (id: string) => setLocalOT(prev => prev.map(o => o.id === id ? { ...o, approvalStatus: 'Aprovado' as ApprovalStatus } : o));
  const reject  = (id: string) => setLocalOT(prev => prev.map(o => o.id === id ? { ...o, approvalStatus: 'Rejeitado' as ApprovalStatus } : o));

  const approveAll = () => {
    const ids = filtered.filter(o => o.approvalStatus === 'Pendente').map(o => o.id);
    setLocalOT(prev => prev.map(o => ids.includes(o.id) ? { ...o, approvalStatus: 'Aprovado' as ApprovalStatus } : o));
  };

  const totalPending = localOT.filter(o => o.approvalStatus === 'Pendente').length;
  const totalValue   = localOT.filter(o => o.approvalStatus === 'Aprovado').reduce((a, o) => a + o.value, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
          <p className="text-2xl font-black text-amber-600">{totalPending}</p>
          <p className="text-xs text-amber-700 mt-1">Pendentes de aprovação</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
          <p className="text-2xl font-black text-emerald-600">R$ {totalValue.toFixed(2)}</p>
          <p className="text-xs text-emerald-700 mt-1">Valor aprovado no período</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-2xl font-black text-slate-800">{localOT.reduce((a, o) => a + o.hours, 0)}h</p>
          <p className="text-xs text-slate-500 mt-1">Total de horas extras</p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex border border-slate-200 rounded-xl overflow-hidden bg-white">
          {(['Todos','Pendente','Aprovado','Rejeitado'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 text-xs font-bold transition-colors
                ${filter === f ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        {totalPending > 0 && (
          <button onClick={approveAll}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-sm">
            <CheckCircle className="w-4 h-4" /> Aprovar Todos Pendentes ({totalPending})
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              {['Colaborador','Data','Horas','Tipo','% Extra','Valor Est.','Motivo','Autorizado','Status','Ações'].map(h => (
                <th key={h} className="p-3 text-[10px] font-bold text-slate-400 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(ot => (
              <tr key={ot.id} className="hover:bg-slate-50">
                <td className="p-3 text-sm font-medium text-slate-800">{ot.employeeName}</td>
                <td className="p-3 text-sm text-slate-600">{new Date(ot.date).toLocaleDateString('pt-BR')}</td>
                <td className="p-3 text-sm font-bold text-amber-600">{ot.hours}h</td>
                <td className="p-3">
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg font-medium">{ot.type}</span>
                </td>
                <td className="p-3 text-sm font-bold text-slate-700">{ot.percentage}%</td>
                <td className="p-3 text-sm font-mono text-slate-700">R$ {ot.value.toFixed(2)}</td>
                <td className="p-3 text-xs text-slate-500 italic max-w-32 truncate" title={ot.reason}>"{ot.reason}"</td>
                <td className="p-3">
                  {ot.authorized
                    ? <span className="flex items-center gap-1 text-xs text-emerald-600 font-bold"><CheckCircle className="w-3 h-3" /> Sim</span>
                    : <span className="flex items-center gap-1 text-xs text-red-500 font-bold"><XCircle className="w-3 h-3" /> Não</span>}
                </td>
                <td className="p-3"><ApprovalBadge status={ot.approvalStatus} /></td>
                <td className="p-3">
                  {ot.approvalStatus === 'Pendente' && (
                    <div className="flex gap-1">
                      <button onClick={() => approve(ot.id)}
                        className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors" title="Aprovar">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => reject(ot.id)}
                        className="p-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors" title="Rejeitar">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ZIABanner text="Lucas Pereira acumulou 7h extras não autorizadas neste mês — acima do limite de 8h/mês configurado. Recomendação: agendar conversa com o gestor e revisar distribuição de carga." />
    </div>
  );
}

function OvertimePendingTab() {
  const [localOT, setLocalOT] = useState(overtimes.filter(o => o.approvalStatus === 'Pendente'));
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const approve = (id: string) => setLocalOT(prev => prev.filter(o => o.id !== id));
  const confirmReject = (id: string) => {
    setLocalOT(prev => prev.filter(o => o.id !== id));
    setRejecting(null);
    setRejectReason('');
  };

  const historyByEmployee = (name: string) =>
    overtimes.filter(o => o.employeeName === name && o.approvalStatus !== 'Pendente');

  if (localOT.length === 0) return (
    <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-dashed border-slate-200">
      <CheckCircle className="w-12 h-12 text-emerald-400 mb-3" />
      <p className="text-lg font-bold text-slate-700">Nenhuma aprovação pendente</p>
      <p className="text-sm text-slate-400 mt-1">Todas as solicitações de HE foram processadas.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <ZIABanner text={`${localOT.length} solicitação(ões) aguardando aprovação. Valor total estimado: R$ ${localOT.reduce((a, o) => a + o.value, 0).toFixed(2)}.`} />

      <div className="space-y-3">
        {localOT.map(ot => {
          const history = historyByEmployee(ot.employeeName);
          return (
            <div key={ot.id} className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
              <div className="flex items-start justify-between p-4 border-b border-slate-100">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 font-black text-sm">
                    {ot.employeeName.split(' ').map(n => n[0]).join('').substring(0,2)}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{ot.employeeName}</p>
                    <p className="text-xs text-slate-500">{new Date(ot.date).toLocaleDateString('pt-BR')} · {ot.type} · {ot.hours}h ({ot.percentage}%)</p>
                    <p className="text-xs text-slate-600 mt-1 italic">"{ot.reason}"</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-slate-800">R$ {ot.value.toFixed(2)}</p>
                  <p className="text-[10px] text-slate-400">Valor estimado</p>
                  {!ot.authorized && (
                    <span className="text-[10px] text-red-600 font-bold flex items-center gap-1 justify-end mt-1">
                      <AlertTriangle className="w-3 h-3" /> Não autorizada previamente
                    </span>
                  )}
                </div>
              </div>

              {/* History */}
              {history.length > 0 && (
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Histórico deste colaborador</p>
                  <div className="flex gap-3">
                    {history.slice(0, 3).map((h, i) => (
                      <span key={i} className="text-xs text-slate-500">
                        {new Date(h.date).toLocaleDateString('pt-BR')} · {h.hours}h · <ApprovalBadge status={h.approvalStatus} />
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 px-4 py-3">
                {rejecting === ot.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                      placeholder="Motivo da rejeição (obrigatório)..."
                      className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
                    <button onClick={() => confirmReject(ot.id)} disabled={!rejectReason}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold disabled:opacity-50 hover:bg-red-700">
                      Confirmar Rejeição
                    </button>
                    <button onClick={() => setRejecting(null)}
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50">
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <>
                    <button onClick={() => setRejecting(ot.id)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-red-100 text-red-700 rounded-xl text-xs font-bold hover:bg-red-200">
                      <X className="w-3.5 h-3.5" /> Rejeitar
                    </button>
                    <button onClick={() => approve(ot.id)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-sm">
                      <CheckCircle className="w-3.5 h-3.5" /> Aprovar
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChangeRequestsTab() {
  const [localReqs, setLocalReqs] = useState(changeRequests);
  const [viewHistory, setViewHistory] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const pending  = localReqs.filter(r => r.status === 'Pendente');
  const historic = localReqs.filter(r => r.status !== 'Pendente');

  const approve = (id: string) =>
    setLocalReqs(prev => prev.map(r => r.id === id ? { ...r, status: 'Aprovado' as ApprovalStatus } : r));
  const confirmReject = (id: string) => {
    setLocalReqs(prev => prev.map(r => r.id === id ? { ...r, status: 'Rejeitado' as ApprovalStatus } : r));
    setRejectingId(null);
    setRejectReason('');
  };

  const shown = viewHistory ? historic : pending;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex border border-slate-200 rounded-xl overflow-hidden bg-white">
          <button onClick={() => setViewHistory(false)}
            className={`px-4 py-2 text-xs font-bold transition-colors
              ${!viewHistory ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
            Pendentes ({pending.length})
          </button>
          <button onClick={() => setViewHistory(true)}
            className={`px-4 py-2 text-xs font-bold transition-colors
              ${viewHistory ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
            Histórico ({historic.length})
          </button>
        </div>
        <div className="flex-1" />
        <button className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 hover:bg-slate-50">
          <Download className="w-3.5 h-3.5" /> Exportar para Auditoria
        </button>
      </div>

      {shown.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 bg-white rounded-2xl border border-dashed border-slate-200">
          <CheckCircle className="w-10 h-10 text-emerald-400 mb-2" />
          <p className="font-bold text-slate-600">Nenhuma solicitação {viewHistory ? 'no histórico' : 'pendente'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map(req => (
            <div key={req.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-start justify-between p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 font-black text-xs">
                    {req.employeeName.split(' ').map(n => n[0]).join('').substring(0,2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-800 text-sm">{req.employeeName}</p>
                      <ApprovalBadge status={req.status} />
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Data do ponto: <strong>{new Date(req.date).toLocaleDateString('pt-BR')}</strong> · Solicitado em: {req.requestedAt}
                    </p>
                    <p className="text-xs text-slate-600 mt-1 italic">"{req.reason}"</p>
                  </div>
                </div>
                {req.evidence && (
                  <button className="flex items-center gap-1.5 text-xs text-indigo-600 font-bold hover:underline">
                    <Eye className="w-3.5 h-3.5" /> {req.evidence}
                  </button>
                )}
              </div>

              {/* Point comparison */}
              <div className="mx-4 mb-4 grid grid-cols-2 gap-3">
                <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-red-400 uppercase mb-2">Registro Original</p>
                  <div className="flex gap-4 text-sm">
                    <div><span className="text-xs text-slate-400">Entrada:</span> <strong className="font-mono">{req.originalIn || '—'}</strong></div>
                    <div><span className="text-xs text-slate-400">Saída:</span> <strong className="font-mono">{req.originalOut || '—'}</strong></div>
                  </div>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-emerald-400 uppercase mb-2">Solicitação de Correção</p>
                  <div className="flex gap-4 text-sm">
                    <div><span className="text-xs text-slate-400">Entrada:</span> <strong className="font-mono text-emerald-700">{req.requestedIn}</strong></div>
                    <div><span className="text-xs text-slate-400">Saída:</span> <strong className="font-mono text-emerald-700">{req.requestedOut}</strong></div>
                  </div>
                </div>
              </div>

              {req.status === 'Pendente' && (
                <div className="px-4 pb-4">
                  {rejectingId === req.id ? (
                    <div className="flex items-center gap-2">
                      <input value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                        placeholder="Motivo da rejeição..."
                        className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
                      <button onClick={() => confirmReject(req.id)} disabled={!rejectReason}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold disabled:opacity-50">
                        Confirmar
                      </button>
                      <button onClick={() => setRejectingId(null)}
                        className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600">
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setRejectingId(req.id)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-red-100 text-red-700 rounded-xl text-xs font-bold hover:bg-red-200">
                        <X className="w-3.5 h-3.5" /> Rejeitar
                      </button>
                      <button onClick={() => approve(req.id)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700">
                        <CheckCircle className="w-3.5 h-3.5" /> Aprovar Alteração
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function JustifiedAbsencesTab() {
  const [localAbs, setLocalAbs] = useState(absences.filter(a => a.justified));
  const [showForm, setShowForm] = useState(false);
  const [newAbs, setNewAbs] = useState({ employee: '', date: '', type: 'Médica' as AbsenceType, document: '' });

  const addAbsence = () => {
    if (!newAbs.employee || !newAbs.date) return;
    setLocalAbs(prev => [...prev, {
      id: String(Date.now()), employeeId: '0', employeeName: newAbs.employee,
      date: newAbs.date, type: newAbs.type, justified: true,
      document: newAbs.document, financialImpact: 0, status: 'Registrada'
    }]);
    setShowForm(false);
    setNewAbs({ employee: '', date: '', type: 'Médica', document: '' });
  };

  const typeColors: Record<AbsenceType, string> = {
    Médica: 'bg-blue-100 text-blue-700',
    Pessoal: 'bg-purple-100 text-purple-700',
    Judicial: 'bg-slate-100 text-slate-600',
    Luto: 'bg-gray-100 text-gray-600',
    Maternidade: 'bg-pink-100 text-pink-700',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <div className="bg-blue-50 rounded-xl px-4 py-2 border border-blue-100">
            <p className="text-lg font-black text-blue-600">{localAbs.length}</p>
            <p className="text-xs text-blue-700">Justificadas</p>
          </div>
          <div className="bg-amber-50 rounded-xl px-4 py-2 border border-amber-100">
            <p className="text-lg font-black text-amber-600">{localAbs.filter(a => a.status === 'Pendente Documentação').length}</p>
            <p className="text-xs text-amber-700">Pendentes documentação</p>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-sm">
          <Plus className="w-4 h-4" /> Registrar Ausência
        </button>
      </div>

      {showForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">
          <p className="font-bold text-blue-800 text-sm">Nova Ausência Justificada</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-blue-600 uppercase mb-1">Funcionário</label>
              <select value={newAbs.employee} onChange={e => setNewAbs(p => ({...p, employee: e.target.value}))}
                className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none">
                <option value="">Selecionar...</option>
                {mockEmployees.map(e => <option key={e.name}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-blue-600 uppercase mb-1">Data</label>
              <input type="date" value={newAbs.date} onChange={e => setNewAbs(p => ({...p, date: e.target.value}))}
                className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-blue-600 uppercase mb-1">Tipo</label>
              <select value={newAbs.type} onChange={e => setNewAbs(p => ({...p, type: e.target.value as AbsenceType}))}
                className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none">
                {(['Médica','Pessoal','Judicial','Luto','Maternidade'] as AbsenceType[]).map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-blue-600 uppercase mb-1">Documento</label>
              <input value={newAbs.document} onChange={e => setNewAbs(p => ({...p, document: e.target.value}))}
                placeholder="atestado.pdf"
                className="w-full border border-blue-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-xs text-slate-600">Cancelar</button>
            <button onClick={addAbsence} className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700">Salvar</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              {['Colaborador','Data','Tipo','Documento','Impacto Folha','Status'].map(h => (
                <th key={h} className="p-3 text-[10px] font-bold text-slate-400 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {localAbs.map(ab => (
              <tr key={ab.id} className="hover:bg-slate-50">
                <td className="p-3 text-sm font-medium text-slate-800">{ab.employeeName}</td>
                <td className="p-3 text-sm text-slate-600">{new Date(ab.date).toLocaleDateString('pt-BR')}</td>
                <td className="p-3"><span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${typeColors[ab.type] || 'bg-slate-100 text-slate-600'}`}>{ab.type}</span></td>
                <td className="p-3">
                  {ab.document
                    ? <button className="flex items-center gap-1 text-xs text-indigo-600 font-bold hover:underline"><Eye className="w-3 h-3" /> {ab.document}</button>
                    : <span className="text-xs text-slate-300">—</span>}
                </td>
                <td className="p-3 text-xs font-medium text-emerald-600">Sem desconto</td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded-lg text-xs font-bold ${ab.status === 'Registrada' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {ab.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UnjustifiedAbsencesTab() {
  const unjustified = absences.filter(a => !a.justified);
  const totalImpact = unjustified.reduce((a, b) => a + b.financialImpact, 0);
  const totalDsr    = unjustified.reduce((a, b) => a + (b.dsrImpact || 0), 0);

  return (
    <div className="space-y-4">
      <ZIABanner text="Pedro Costa tem 1 falta injustificada nos últimos 30 dias. Com mais 2 ocorrências este mês, o sistema gerará automaticamente uma advertência escrita." />

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-red-50 rounded-xl p-4 border border-red-100">
          <p className="text-2xl font-black text-red-600">{unjustified.length}</p>
          <p className="text-xs text-red-700 mt-1">Faltas não justificadas</p>
        </div>
        <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
          <p className="text-2xl font-black text-orange-600">R$ {totalImpact.toFixed(2)}</p>
          <p className="text-xs text-orange-700 mt-1">Desconto em folha</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
          <p className="text-2xl font-black text-amber-600">R$ {totalDsr.toFixed(2)}</p>
          <p className="text-xs text-amber-700 mt-1">Reflexo no DSR</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              {['Colaborador','Data','Tipo','Desconto Salário','Reflexo DSR','Total','Ação'].map(h => (
                <th key={h} className="p-3 text-[10px] font-bold text-slate-400 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {unjustified.map(ab => (
              <tr key={ab.id} className="hover:bg-red-50/20">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold text-xs">
                      {ab.employeeName.split(' ').map(n=>n[0]).join('').substring(0,2)}
                    </div>
                    <span className="text-sm font-medium text-slate-800">{ab.employeeName}</span>
                  </div>
                </td>
                <td className="p-3 text-sm text-slate-600">{new Date(ab.date).toLocaleDateString('pt-BR')}</td>
                <td className="p-3"><span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-bold">Injustificada</span></td>
                <td className="p-3 text-sm font-mono text-red-600 font-bold">-R$ {ab.financialImpact.toFixed(2)}</td>
                <td className="p-3 text-sm font-mono text-orange-600">-R$ {(ab.dsrImpact || 0).toFixed(2)}</td>
                <td className="p-3 text-sm font-bold text-red-700">-R$ {(ab.financialImpact + (ab.dsrImpact || 0)).toFixed(2)}</td>
                <td className="p-3">
                  <button className="flex items-center gap-1.5 text-xs text-indigo-600 font-bold hover:underline">
                    <Bell className="w-3 h-3" /> Solicitar justificativa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-4 bg-red-50 border-t border-red-100 flex items-center justify-between">
          <span className="text-xs text-red-700 font-semibold">Total de descontos: R$ {(totalImpact + totalDsr).toFixed(2)}</span>
          <span className="text-xs text-slate-500">Valores já integrados à folha de pagamento do período</span>
        </div>
      </div>
    </div>
  );
}

function AlertsTab() {
  const [localAlerts, setLocalAlerts] = useState(alertConfigs);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newAlert, setNewAlert] = useState({
    type: '', threshold: 3, unit: 'vezes/mês',
    severity: 'Média' as 'Baixa'|'Média'|'Alta',
    recipient: 'Gestor Direto', action: 'Notificação'
  });

  const toggle = (id: string) =>
    setLocalAlerts(prev => prev.map(a => a.id === id ? { ...a, active: !a.active } : a));

  const addAlert = () => {
    if (!newAlert.type) return;
    setLocalAlerts(prev => [...prev, { ...newAlert, id: String(Date.now()), active: true }]);
    setShowNewForm(false);
    setNewAlert({ type:'', threshold:3, unit:'vezes/mês', severity:'Média', recipient:'Gestor Direto', action:'Notificação' });
  };

  const sevColor = { Baixa: 'bg-yellow-100 text-yellow-700', Média: 'bg-orange-100 text-orange-700', Alta: 'bg-red-100 text-red-700' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-slate-700">Configuração de Alertas de Ponto</p>
          <p className="text-xs text-slate-400">{localAlerts.filter(a => a.active).length} alertas ativos de {localAlerts.length} configurados</p>
        </div>
        <button onClick={() => setShowNewForm(!showNewForm)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-sm">
          <Plus className="w-4 h-4" /> Novo Alerta
        </button>
      </div>

      {showNewForm && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 space-y-3">
          <p className="font-bold text-indigo-800 text-sm">Configurar Novo Alerta</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-indigo-600 uppercase mb-1">Tipo de Alerta</label>
              <input value={newAlert.type} onChange={e => setNewAlert(p=>({...p,type:e.target.value}))}
                placeholder="Ex: Atraso Recorrente"
                className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-indigo-600 uppercase mb-1">Severidade</label>
              <select value={newAlert.severity} onChange={e => setNewAlert(p=>({...p,severity:e.target.value as any}))}
                className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none">
                {['Baixa','Média','Alta'].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-indigo-600 uppercase mb-1">Threshold</label>
              <input type="number" value={newAlert.threshold} onChange={e => setNewAlert(p=>({...p,threshold:+e.target.value}))}
                className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-indigo-600 uppercase mb-1">Destinatário</label>
              <select value={newAlert.recipient} onChange={e => setNewAlert(p=>({...p,recipient:e.target.value}))}
                className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none">
                {['Gestor Direto','RH','RH + Gestor','Diretoria'].map(r=><option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-indigo-600 uppercase mb-1">Ação Automática</label>
              <select value={newAlert.action} onChange={e => setNewAlert(p=>({...p,action:e.target.value}))}
                className="w-full border border-indigo-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none">
                {['Notificação','Criar Anotação','Bloquear e Notificar','Notificação + Anotação'].map(a=><option key={a}>{a}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowNewForm(false)} className="px-3 py-1.5 bg-white border border-indigo-200 rounded-lg text-xs text-slate-600">Cancelar</button>
            <button onClick={addAlert} className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700">Salvar Alerta</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {localAlerts.map(alert => (
          <div key={alert.id} className={`bg-white rounded-2xl border shadow-sm p-4 transition-opacity ${alert.active ? 'border-slate-100 opacity-100' : 'border-slate-100 opacity-50'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${alert.active ? 'bg-indigo-50' : 'bg-slate-100'}`}>
                  <Bell className={`w-4 h-4 ${alert.active ? 'text-indigo-600' : 'text-slate-400'}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-800 text-sm">{alert.type}</p>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${sevColor[alert.severity]}`}>{alert.severity}</span>
                    {!alert.active && <span className="text-xs text-slate-400 font-medium">Desativado</span>}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Threshold: <strong>{alert.threshold} {alert.unit}</strong> · Para: <strong>{alert.recipient}</strong> · Ação: <strong>{alert.action}</strong>
                  </p>
                </div>
              </div>
              <button onClick={() => toggle(alert.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors
                  ${alert.active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                {alert.active ? <><ToggleRight className="w-4 h-4" /> Ativo</> : <><ToggleLeft className="w-4 h-4" /> Inativo</>}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SchedulesTab() {
  const [localSchedules, setLocalSchedules] = useState(schedules);
  const [selected, setSelected] = useState<Schedule | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newSched, setNewSched] = useState({ name: '', type: '5x2' });

  const days = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-slate-700">Escalas de Trabalho</p>
          <p className="text-xs text-slate-400">{localSchedules.length} escalas cadastradas</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-sm">
          <Plus className="w-4 h-4" /> Nova Escala
        </button>
      </div>

      <ZIABanner text="Sugestão de otimização: A escala do setor TI tem 28% de horas extras nas últimas 4 semanas. Considere ampliar o horário padrão ou redistribuir as atividades entre os colaboradores." />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {localSchedules.map(sched => (
          <div key={sched.id}
            onClick={() => setSelected(sched)}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-bold text-slate-800">{sched.name}</p>
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-lg font-bold">{sched.type}</span>
              </div>
              <button className="p-1.5 hover:bg-slate-100 rounded-lg">
                <Edit3 className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>

            {/* Week visual */}
            <div className="grid grid-cols-7 gap-1 mb-3">
              {sched.shifts.map((shift, i) => (
                <div key={i} className="text-center">
                  <div className={`w-full h-6 rounded-md flex items-center justify-center text-[9px] font-bold
                    ${shift.active ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-300'}`}>
                    {shift.day.substring(0,1)}
                  </div>
                  {shift.active && (
                    <div className="text-[8px] text-slate-400 mt-0.5">{shift.checkIn}</div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {sched.employees.map((emp, i) => (
                <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                  {emp.split(' ')[0]}
                </span>
              ))}
            </div>
          </div>
        ))}

        {/* New scale card */}
        <button onClick={() => setShowNew(true)}
          className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-6 text-slate-400 hover:border-indigo-300 hover:bg-indigo-50 transition-all">
          <Plus className="w-8 h-8 mb-2" />
          <span className="font-bold text-sm">Nova Escala</span>
        </button>
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800">{selected.name}</h3>
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold">{selected.type}</span>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-slate-200 rounded-full"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-3">Configuração de Horários</p>
                <div className="space-y-2">
                  {selected.shifts.map((shift, i) => (
                    <div key={i} className={`flex items-center justify-between p-3 rounded-xl border
                      ${shift.active ? 'border-indigo-100 bg-indigo-50' : 'border-slate-100 bg-slate-50'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${shift.active ? 'bg-indigo-500' : 'bg-slate-300'}`} />
                        <span className={`text-sm font-bold ${shift.active ? 'text-slate-800' : 'text-slate-400'}`}>{shift.day}</span>
                      </div>
                      {shift.active
                        ? <span className="text-sm font-mono text-indigo-700 font-bold">{shift.checkIn} → {shift.checkOut}</span>
                        : <span className="text-xs text-slate-400">Folga</span>}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Colaboradores nesta escala</p>
                <div className="flex flex-wrap gap-2">
                  {selected.employees.map((emp, i) => (
                    <span key={i} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">{emp}</span>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-5 pb-5 flex justify-end">
              <button onClick={() => setSelected(null)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New schedule modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Nova Escala de Trabalho</h3>
              <button onClick={() => setShowNew(false)} className="p-2 hover:bg-slate-200 rounded-full"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nome da Escala</label>
                <input value={newSched.name} onChange={e => setNewSched(p=>({...p,name:e.target.value}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="Ex: Operações Noturno" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tipo de Escala</label>
                <select value={newSched.type} onChange={e => setNewSched(p=>({...p,type:e.target.value}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  {['5x2','6x1','12x36','Turno Rotativo','Personalizado'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Horários por Dia</label>
                <div className="space-y-2">
                  {days.map(day => (
                    <div key={day} className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-600 w-16">{day}</span>
                      <input type="time" defaultValue="08:00"
                        className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none" />
                      <span className="text-slate-400 text-xs">até</span>
                      <input type="time" defaultValue="17:00"
                        className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none" />
                      <input type="checkbox" defaultChecked={day !== 'Sábado' && day !== 'Domingo'}
                        className="rounded" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-5 pb-5 flex justify-end gap-2">
              <button onClick={() => setShowNew(false)}
                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button onClick={() => {
                if (newSched.name) {
                  setLocalSchedules(prev => [...prev, {
                    id: String(Date.now()), name: newSched.name, type: newSched.type,
                    employees: [],
                    shifts: days.map(d => ({ day: d, checkIn: '08:00', checkOut: '17:00', active: d !== 'Sábado' && d !== 'Domingo' }))
                  }]);
                  setShowNew(false);
                }
              }} className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-sm">
                Salvar Escala
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// COMPONENTE PRINCIPAL — TimesheetSection
// ============================================================
export function TimesheetSection({ onNavigate: _onNavigate }: { onNavigate: (s: HRSection) => void }) {
  const [activeTab, setActiveTab] = useState<TimesheetTab>('mirror');

  const pending  = overtimes.filter(o => o.approvalStatus === 'Pendente').length;
  const chgReqs  = changeRequests.filter(r => r.status === 'Pendente').length;
  const unjust   = absences.filter(a => !a.justified).length;

  const tabs: { id: TimesheetTab; label: string; badge?: number }[] = [
    { id: 'mirror',           label: 'Espelho de Ponto' },
    { id: 'overtime',         label: 'Horas Extras' },
    { id: 'overtime-pending', label: 'Autorizações HE', badge: pending },
    { id: 'change-requests',  label: 'Solicitações/Histórico', badge: chgReqs },
    { id: 'justified',        label: 'Ausências Justificadas' },
    { id: 'unjustified',      label: 'Ausências Injustificadas', badge: unjust },
    { id: 'alerts',           label: 'Alertas de Ponto' },
    { id: 'schedules',        label: 'Escalas' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900">Folha de Ponto</h2>
          <p className="text-sm text-slate-500">Controle de jornada, horas extras e ausências</p>
        </div>
        <div className="flex items-center gap-2">
          {pending > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-xl text-xs font-bold">
              <AlertTriangle className="w-3.5 h-3.5" /> {pending} HE aguardando aprovação
            </span>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex overflow-x-auto border-b border-slate-100">
          {tabs.map(tab => (
            <TabButton
              key={tab.id}
              id={tab.id}
              label={tab.label}
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              badge={tab.badge}
            />
          ))}
        </div>
        <div className="p-5">
          {activeTab === 'mirror'           && <MirrorTab />}
          {activeTab === 'overtime'         && <OvertimeTab />}
          {activeTab === 'overtime-pending' && <OvertimePendingTab />}
          {activeTab === 'change-requests'  && <ChangeRequestsTab />}
          {activeTab === 'justified'        && <JustifiedAbsencesTab />}
          {activeTab === 'unjustified'      && <UnjustifiedAbsencesTab />}
          {activeTab === 'alerts'           && <AlertsTab />}
          {activeTab === 'schedules'        && <SchedulesTab />}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MÉTRICAS — ABA ANÁLISE GERAL
// ============================================================
function GeneralMetricsTab() {
  const [period, setPeriod] = useState('30d');

  const totalHeadcount = employees.length;
  const activeCount    = employees.filter(e => e.status === 'Ativo').length;
  const avgOT          = 12.4;
  const absenceRate    = 1.8;
  const turnover       = 4.2;

  return (
    <div className="space-y-5">
      {/* Period selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-slate-500 uppercase">Período:</span>
        {['7d','30d','90d','6m','1a'].map(p => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors
              ${period === p ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
            {p}
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label:'Headcount', value:totalHeadcount.toString(), sub:`${activeCount} ativos`, spark:[82,84,83,85,84,85], color:'#6366f1', delta:'+2', up:true },
          { label:'Turnover', value:`${turnover}%`, sub:'Últimos 90d', spark:[6,5.5,5,4.8,4.4,4.2], color:'#ef4444', delta:'-0.8%', up:true },
          { label:'Absenteísmo', value:`${absenceRate}%`, sub:'Média geral', spark:[2.5,2.3,2.1,2,1.9,1.8], color:'#f59e0b', delta:'-0.4%', up:true },
          { label:'Banco de Horas', value:`${avgOT}h`, sub:'Média/funcionário', spark:[10,11,12,11,12,12.4], color:'#8b5cf6', delta:'+2.1h', up:false },
          { label:'Satisfação', value:'8.4', sub:'eNPS interno', spark:[7.8,8,8.1,8.2,8.3,8.4], color:'#10b981', delta:'+0.3', up:true },
        ].map((kpi, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs font-bold text-slate-500">{kpi.label}</p>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${kpi.up ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {kpi.delta}
              </span>
            </div>
            <p className="text-2xl font-black text-slate-900">{kpi.value}</p>
            <p className="text-[10px] text-slate-400 mb-2">{kpi.sub}</p>
            <SparkLine data={kpi.spark} color={kpi.color} />
          </div>
        ))}
      </div>

      {/* Dept breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-bold text-slate-800 mb-4 text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-500" /> Indicadores por Departamento
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Departamento','Headcount','Horas Médias','Absenteísmo','HE Acum.','Produtividade'].map(h => (
                    <th key={h} className="pb-2 pr-3 font-bold text-slate-400 uppercase text-[10px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {deptMetrics.map((d, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="py-2 pr-3 font-bold text-slate-700">{d.dept}</td>
                    <td className="py-2 pr-3 text-slate-600">{d.headcount}</td>
                    <td className="py-2 pr-3 text-slate-600">{d.avgHours}h</td>
                    <td className="py-2 pr-3">
                      <span className={`font-bold ${d.absenceRate > 2 ? 'text-red-600' : 'text-emerald-600'}`}>{d.absenceRate}%</span>
                    </td>
                    <td className="py-2 pr-3 text-amber-600 font-bold">{d.otHours}h</td>
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700">{d.productivity}%</span>
                        <MiniBar value={d.productivity} max={100} color={d.productivity >= 90 ? 'bg-emerald-500' : d.productivity >= 80 ? 'bg-indigo-500' : 'bg-amber-500'} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-bold text-slate-800 mb-4 text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-500" /> Composição da Equipe
            </h3>
            <div className="space-y-3">
              {[
                { label:'CLT', value:3, total:employees.length, color:'bg-indigo-500' },
                { label:'PJ', value:1, total:employees.length, color:'bg-purple-500' },
                { label:'Estágio', value:1, total:employees.length, color:'bg-pink-400' },
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-slate-600">{item.label}</span>
                    <span className="text-slate-400">{item.value} ({Math.round(item.value/item.total*100)}%)</span>
                  </div>
                  <MiniBar value={item.value} max={item.total} color={item.color} />
                </div>
              ))}
            </div>
          </div>

          <ZIACard insights={[
            'TI tem 420h extras acumuladas — 62% do total da empresa. Risco de burnout.',
            'Absenteísmo no Comercial (2.8%) acima da média (1.8%). Investigar causas.',
            'Produtividade geral subiu 3% vs mês anterior. Tendência positiva.',
          ]} />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MÉTRICAS — ABA ANÁLISE INDIVIDUAL
// ============================================================
function IndividualMetricsTab() {
  const [selectedId, setSelectedId] = useState<string>('1');
  const emp = employees.find(e => e.id === selectedId) ?? employees[0];
  const history = useMemo(() => getHistory(selectedId), [selectedId]);

  const tenureMonths = Math.floor(
    (new Date().getTime() - new Date(emp.admissionDate).getTime()) / (1000 * 60 * 60 * 24 * 30)
  );

  const compaRatio = emp.salary / 10000; // simplified midpoint

  return (
    <div className="space-y-5">
      {/* Employee selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-bold text-slate-500 uppercase">Colaborador:</span>
        <div className="flex flex-wrap gap-2">
          {employees.map(e => (
            <button key={e.id} onClick={() => setSelectedId(e.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border
                ${selectedId === e.id ? 'bg-indigo-600 text-white border-indigo-600 shadow' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black
                ${selectedId === e.id ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'}`}>
                {e.name.split(' ').map(n=>n[0]).join('').substring(0,2)}
              </span>
              {e.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Profile header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-xl">
              {emp.name.split(' ').map(n=>n[0]).join('').substring(0,2)}
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">{emp.name}</h3>
              <p className="text-sm text-slate-500">{emp.role} · {emp.department}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg font-medium">{emp.contractType}</span>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg font-medium">{emp.workRegime}</span>
                <span className={`text-xs px-2 py-0.5 rounded-lg font-bold
                  ${emp.status==='Ativo' ? 'bg-emerald-100 text-emerald-700'
                    : emp.status==='Férias' ? 'bg-blue-100 text-blue-700'
                    : 'bg-orange-100 text-orange-700'}`}>{emp.status}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label:'Tempo de Casa', value:`${tenureMonths}m`, color:'text-indigo-600' },
              { label:'Salário', value:`R$ ${(emp.salary/1000).toFixed(1)}k`, color:'text-emerald-600' },
              { label:'Banco Horas', value:`${emp.hourBankBalance}h`, color: emp.hourBankBalance < 0 ? 'text-red-600' : 'text-amber-600' },
              { label:'Advertências', value:emp.warnings.toString(), color: emp.warnings > 0 ? 'text-orange-600' : 'text-slate-600' },
            ].map((m, i) => (
              <div key={i} className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
                <p className={`text-xl font-black ${m.color}`}>{m.value}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Evolution charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Salary evolution */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h4 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" /> Evolução Salarial
          </h4>
          <div className="space-y-2">
            {history.map((h, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-slate-400 w-10">{h.month}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-2">
                  <div className="bg-emerald-500 h-2 rounded-full transition-all"
                    style={{ width: `${(h.salary / (emp.salary * 1.1)) * 100}%` }} />
                </div>
                <span className="text-xs font-bold text-slate-700 w-20 text-right">
                  R$ {h.salary.toLocaleString('pt-BR',{maximumFractionDigits:0})}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">Compa-Ratio atual</span>
            <span className={`text-sm font-black ${compaRatio < 0.8 ? 'text-red-600' : compaRatio > 1.2 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {(compaRatio * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Productivity & attendance */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h4 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-500" /> Produtividade & Presença
          </h4>
          <div className="space-y-3">
            {history.map((h, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-slate-400 w-10">{h.month}</span>
                <div className="flex-1 grid grid-cols-3 gap-2 text-xs">
                  <div className="text-center">
                    <div className="bg-indigo-100 rounded h-1.5 mb-1">
                      <div className="bg-indigo-500 h-1.5 rounded" style={{ width: `${h.productivity}%` }} />
                    </div>
                    <span className="text-[9px] text-indigo-600 font-bold">{h.productivity}%</span>
                  </div>
                  <div className="text-center">
                    <span className={`text-[10px] font-bold ${h.overtimeHours > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                      +{h.overtimeHours}h HE
                    </span>
                  </div>
                  <div className="text-center">
                    <span className={`text-[10px] font-bold ${h.absences > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                      {h.absences === 0 ? '✓ Sem faltas' : `${h.absences} falta`}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ZIA individual summary */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-violet-200" />
          <span className="font-bold">ZIA — Análise de {emp.name}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { title:'Pontos Positivos', items: emp.warnings === 0 ? ['Zero advertências no período','Produtividade acima da média','Assiduidade exemplar'] : ['Evolução salarial consistente','Horas extras dentro do limite'] },
            { title:'Pontos de Atenção', items: emp.hourBankBalance < 0 ? ['Saldo negativo no banco de horas','Risco de descontos na folha'] : emp.warnings > 1 ? ['2+ advertências — risco elevado','Histórico de ausências injustificadas'] : ['Monitorar banco de horas','Verificar alinhamento com gestor'] },
            { title:'Recomendações', items: ['Conversa de carreira recomendada','Avaliar aumento em 60 dias','Indicar para programa de liderança'] },
          ].map((col, i) => (
            <div key={i}>
              <p className="text-xs font-bold text-violet-200 uppercase mb-2">{col.title}</p>
              {col.items.map((item, j) => (
                <div key={j} className="flex items-start gap-2 text-sm text-violet-100 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-300 mt-1.5 shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// EMPLOYEE METRICS SECTION
// ============================================================
function EmployeeMetricsSection({ onNavigate: _onNavigate }: { onNavigate: (s: HRSection) => void }) {
  const [activeTab, setActiveTab] = useState<'general' | 'individual'>('general');

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-black text-slate-900">Métricas de Funcionários</h2>
        <p className="text-sm text-slate-500">Análise de desempenho, produtividade e indicadores da equipe</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-100">
          {[
            { id: 'general', label: 'Análise Geral', icon: BarChart3 },
            { id: 'individual', label: 'Análise Individual', icon: Users },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-bold border-b-2 transition-colors
                ${activeTab === tab.id ? 'border-indigo-500 text-indigo-600 bg-indigo-50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
        <div className="p-5">
          {activeTab === 'general'    && <GeneralMetricsTab />}
          {activeTab === 'individual' && <IndividualMetricsTab />}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PAYROLL — HOLERITE TABS
// ============================================================
type PayslipTab = 'proventos' | 'descontos' | 'hourbank' | 'folgas' | 'comissoes' | 'alertas';

function PayslipProventos({ emp }: { emp: Employee }) {
  const otValue   = 450;
  const nightAdd  = emp.workRegime === 'Escala' ? emp.salary * 0.20 : 0;
  const totalProv = emp.salary + otValue + nightAdd;

  return (
    <div className="space-y-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="pb-2 text-left text-[10px] font-bold text-slate-400 uppercase">Descrição</th>
            <th className="pb-2 text-right text-[10px] font-bold text-slate-400 uppercase">Ref.</th>
            <th className="pb-2 text-right text-[10px] font-bold text-slate-400 uppercase">Valor</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          <tr>
            <td className="py-2 text-slate-700">Salário Base</td>
            <td className="py-2 text-right text-slate-500 text-xs">220h</td>
            <td className="py-2 text-right font-bold text-slate-800">R$ {emp.salary.toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
          </tr>
          <tr>
            <td className="py-2">
              <span className="text-slate-700">Horas Extras 50%</span>
              <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">Autorizada</span>
            </td>
            <td className="py-2 text-right text-slate-500 text-xs">2h</td>
            <td className="py-2 text-right font-bold text-slate-800">R$ {otValue.toFixed(2)}</td>
          </tr>
          {nightAdd > 0 && (
            <tr>
              <td className="py-2 text-slate-700">Adicional Noturno (20%)</td>
              <td className="py-2 text-right text-slate-500 text-xs">—</td>
              <td className="py-2 text-right font-bold text-slate-800">R$ {nightAdd.toFixed(2)}</td>
            </tr>
          )}
          <tr>
            <td className="py-2 text-slate-700">DSR sobre HE</td>
            <td className="py-2 text-right text-slate-500 text-xs">—</td>
            <td className="py-2 text-right font-bold text-slate-800">R$ {(otValue * 0.2).toFixed(2)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-200">
            <td className="pt-3 font-black text-slate-800">Total Proventos</td>
            <td />
            <td className="pt-3 text-right font-black text-emerald-600 text-base">
              R$ {totalProv.toLocaleString('pt-BR',{minimumFractionDigits:2})}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function PayslipDescontos({ emp }: { emp: Employee }) {
  const inss    = emp.salary * 0.11;
  const irrf    = emp.salary > 4664 ? emp.salary * 0.075 : 0;
  const vt      = emp.benefits.includes('VT') ? 220 : 0;
  const vr      = emp.benefits.includes('VR') ? 132 : 0;
  const health  = emp.benefits.includes('Plano de Saúde') ? emp.salary * 0.03 : 0;
  const dental  = emp.benefits.includes('Odonto') ? 45 : 0;
  const absence = 0;
  const total   = inss + irrf + vt + vr + health + dental + absence;

  return (
    <div className="space-y-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="pb-2 text-left text-[10px] font-bold text-slate-400 uppercase">Descrição</th>
            <th className="pb-2 text-right text-[10px] font-bold text-slate-400 uppercase">Base</th>
            <th className="pb-2 text-right text-[10px] font-bold text-slate-400 uppercase">Valor</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          <tr>
            <td className="py-2 text-slate-700">INSS</td>
            <td className="py-2 text-right text-slate-500 text-xs">11%</td>
            <td className="py-2 text-right font-bold text-red-600">- R$ {inss.toFixed(2)}</td>
          </tr>
          {irrf > 0 && (
            <tr>
              <td className="py-2 text-slate-700">IRRF</td>
              <td className="py-2 text-right text-slate-500 text-xs">7.5%</td>
              <td className="py-2 text-right font-bold text-red-600">- R$ {irrf.toFixed(2)}</td>
            </tr>
          )}
          {vt > 0 && (
            <tr>
              <td className="py-2 text-slate-700">Vale-Transporte (desc. 6%)</td>
              <td className="py-2 text-right text-slate-500 text-xs">6%</td>
              <td className="py-2 text-right font-bold text-red-600">- R$ {vt.toFixed(2)}</td>
            </tr>
          )}
          {vr > 0 && (
            <tr>
              <td className="py-2 text-slate-700">Vale-Refeição (co-part.)</td>
              <td className="py-2 text-right text-slate-500 text-xs">22d</td>
              <td className="py-2 text-right font-bold text-red-600">- R$ {vr.toFixed(2)}</td>
            </tr>
          )}
          {health > 0 && (
            <tr>
              <td className="py-2 text-slate-700">Plano de Saúde (co-part.)</td>
              <td className="py-2 text-right text-slate-500 text-xs">3%</td>
              <td className="py-2 text-right font-bold text-red-600">- R$ {health.toFixed(2)}</td>
            </tr>
          )}
          {dental > 0 && (
            <tr>
              <td className="py-2 text-slate-700">Odontológico</td>
              <td className="py-2 text-right text-slate-500 text-xs">fixo</td>
              <td className="py-2 text-right font-bold text-red-600">- R$ {dental.toFixed(2)}</td>
            </tr>
          )}
          {absence > 0 && (
            <tr>
              <td className="py-2 text-red-700 font-bold">Faltas Injustificadas (c/ DSR)</td>
              <td className="py-2 text-right text-slate-500 text-xs">—</td>
              <td className="py-2 text-right font-bold text-red-600">- R$ {absence.toFixed(2)}</td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-200">
            <td className="pt-3 font-black text-slate-800">Total Descontos</td>
            <td />
            <td className="pt-3 text-right font-black text-red-600 text-base">- R$ {total.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function PayslipHourBank({ emp }: { emp: Employee }) {
  const movements = [
    { date:'01/10', desc:'HE Autorizada — Deploy', type:'crédito', hours:1, balance: emp.hourBankBalance + 2 },
    { date:'10/10', desc:'Compensação aprovada', type:'débito', hours:-2, balance: emp.hourBankBalance + 3 },
    { date:'15/10', desc:'HE Autorizada — Migração', type:'crédito', hours:3, balance: emp.hourBankBalance + 1 },
    { date:'26/10', desc:'HE Lançada', type:'crédito', hours:1, balance: emp.hourBankBalance },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 text-center">
          <p className="text-xl font-black text-emerald-600">+{Math.max(0, emp.hourBankBalance)}h</p>
          <p className="text-[10px] text-emerald-700 mt-0.5">Créditos (a receber)</p>
        </div>
        <div className="bg-red-50 rounded-xl p-3 border border-red-100 text-center">
          <p className="text-xl font-black text-red-600">{Math.min(0, emp.hourBankBalance)}h</p>
          <p className="text-[10px] text-red-700 mt-0.5">Débitos (a compensar)</p>
        </div>
        <div className={`rounded-xl p-3 border text-center ${emp.hourBankBalance >= 0 ? 'bg-indigo-50 border-indigo-100' : 'bg-orange-50 border-orange-100'}`}>
          <p className={`text-xl font-black ${emp.hourBankBalance >= 0 ? 'text-indigo-600' : 'text-orange-600'}`}>
            {emp.hourBankBalance > 0 ? '+' : ''}{emp.hourBankBalance}h
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">Saldo atual</p>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            {['Data','Descrição','Tipo','Horas','Saldo'].map(h => (
              <th key={h} className="pb-2 text-left text-[10px] font-bold text-slate-400 uppercase">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {movements.map((m, i) => (
            <tr key={i} className="hover:bg-slate-50">
              <td className="py-2 text-slate-500 text-xs">{m.date}</td>
              <td className="py-2 text-slate-700">{m.desc}</td>
              <td className="py-2">
                <span className={`text-xs px-2 py-0.5 rounded font-bold ${m.type === 'crédito' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {m.type}
                </span>
              </td>
              <td className={`py-2 font-bold font-mono ${m.hours > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {m.hours > 0 ? '+' : ''}{m.hours}h
              </td>
              <td className="py-2 text-slate-600 font-mono">{m.balance > 0 ? '+' : ''}{m.balance}h</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PayslipFolgas({ emp }: { emp: Employee }) {
  const folgas = [
    { type:'Descanso Semanal', date:'Domingos', paid:true, source:'Legal' },
    { type:'Folga Setorial', date:'12/10/2023 (Feriado Nacional)', paid:true, source:'Cadastro Setor' },
    { type:'Folga Individual Planejada', date:'20/10/2023', paid:true, source:'Aprovada gestor' },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 text-center">
          <p className="text-xl font-black text-blue-600">{emp.vacationDays}</p>
          <p className="text-[10px] text-blue-700 mt-0.5">Dias de férias disponíveis</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 text-center">
          <p className="text-xl font-black text-emerald-600">3</p>
          <p className="text-[10px] text-emerald-700 mt-0.5">Folgas no período</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-slate-100 text-center">
          <p className="text-xl font-black text-slate-800">R$ 0</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Desconto por folgas</p>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            {['Tipo','Data','Remunerado','Origem'].map(h => (
              <th key={h} className="pb-2 text-left text-[10px] font-bold text-slate-400 uppercase">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {folgas.map((f, i) => (
            <tr key={i} className="hover:bg-slate-50">
              <td className="py-2 text-slate-700 font-medium">{f.type}</td>
              <td className="py-2 text-slate-500 text-xs">{f.date}</td>
              <td className="py-2">
                <span className={`text-xs px-2 py-0.5 rounded font-bold ${f.paid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {f.paid ? 'Sim' : 'Não'}
                </span>
              </td>
              <td className="py-2 text-xs text-slate-400">{f.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PayslipComissoes({ emp }: { emp: Employee }) {
  const hasComission = emp.department === 'Comercial' || emp.department === 'Marketing';
  if (!hasComission) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-slate-400">
        <DollarSign className="w-10 h-10 mb-2 opacity-40" />
        <p className="text-sm font-medium">Sem comissões para este colaborador no período</p>
        <p className="text-xs mt-1">Comissões são aplicáveis aos setores Comercial e Marketing</p>
      </div>
    );
  }
  const comissoes = [
    { produto:'Produto A', vendas:12, meta:10, percentual:5, valor:3600, impostos:648 },
    { produto:'Produto B', vendas:5, meta:8, percentual:3, valor:900, impostos:162 },
  ];
  const totalBruto = comissoes.reduce((a, c) => a + c.valor, 0);
  const totalImp   = comissoes.reduce((a, c) => a + c.impostos, 0);

  return (
    <div className="space-y-4">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            {['Produto/Serviço','Vendas','Meta','% Comissão','Valor Bruto','Impostos','Líquido'].map(h => (
              <th key={h} className="pb-2 text-left text-[10px] font-bold text-slate-400 uppercase">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {comissoes.map((c, i) => (
            <tr key={i} className="hover:bg-slate-50">
              <td className="py-2 font-medium text-slate-800">{c.produto}</td>
              <td className="py-2 text-slate-600">{c.vendas}</td>
              <td className="py-2">
                <span className={c.vendas >= c.meta ? 'text-emerald-600 font-bold' : 'text-amber-600'}>{c.meta}</span>
              </td>
              <td className="py-2 text-slate-600">{c.percentual}%</td>
              <td className="py-2 font-bold text-slate-800">R$ {c.valor.toFixed(2)}</td>
              <td className="py-2 text-red-500 text-xs">- R$ {c.impostos.toFixed(2)}</td>
              <td className="py-2 font-bold text-emerald-600">R$ {(c.valor - c.impostos).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-200">
            <td colSpan={4} className="pt-3 font-black text-slate-800">Total Comissões</td>
            <td className="pt-3 font-black text-slate-800">R$ {totalBruto.toFixed(2)}</td>
            <td className="pt-3 text-red-600 font-bold">- R$ {totalImp.toFixed(2)}</td>
            <td className="pt-3 font-black text-emerald-600">R$ {(totalBruto - totalImp).toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function PayslipAlertas({ emp }: { emp: Employee }) {
  const [resolved, setResolved] = useState<string[]>([]);
  const alerts = [
    { id:'1', severity:'Alta', desc:'Horas extras sem autorização prévia detectadas (2h em 26/10)', action:'Aprovar ou contestar', resolvable:true },
    emp.hourBankBalance < 0 ? { id:'2', severity:'Média', desc:`Saldo negativo no banco de horas (${emp.hourBankBalance}h) — desconto programado`, action:'Ajustar ou isentar', resolvable:true } : null,
    emp.warnings > 1 ? { id:'3', severity:'Alta', desc:'2+ advertências no histórico — impacta progressão salarial', action:'Verificar', resolvable:false } : null,
  ].filter(Boolean) as { id:string; severity:string; desc:string; action:string; resolvable:boolean }[];

  if (alerts.filter(a => !resolved.includes(a.id)).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-emerald-500">
        <CheckCircle className="w-10 h-10 mb-2" />
        <p className="text-sm font-bold">Nenhuma inconsistência detectada</p>
        <p className="text-xs text-slate-400 mt-1">Folha aprovada pela ZIA</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
        <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
        <p className="text-xs text-amber-800 font-medium">ZIA detectou {alerts.filter(a => !resolved.includes(a.id)).length} inconsistência(s) nesta folha. Resolva antes do fechamento.</p>
      </div>
      {alerts.filter(a => !resolved.includes(a.id)).map(alert => (
        <div key={alert.id} className={`border rounded-xl p-4 ${alert.severity === 'Alta' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${alert.severity === 'Alta' ? 'text-red-600' : 'text-amber-600'}`} />
              <div>
                <p className={`text-sm font-bold ${alert.severity === 'Alta' ? 'text-red-800' : 'text-amber-800'}`}>{alert.severity === 'Alta' ? '⚠ Crítico' : '⚡ Atenção'}</p>
                <p className="text-sm text-slate-700 mt-0.5">{alert.desc}</p>
              </div>
            </div>
            {alert.resolvable && (
              <div className="flex gap-2 shrink-0">
                <button onClick={() => setResolved(p => [...p, alert.id])}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700">
                  Aprovar
                </button>
                <button onClick={() => setResolved(p => [...p, alert.id])}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50">
                  Contestar
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function PayslipViewer({ emp, onClose }: { emp: Employee; onClose: () => void }) {
  const { config } = useAppContext();
  const [activeTab, setActiveTab] = useState<PayslipTab>('proventos');


  const inss  = emp.salary * 0.11;
  const irrf  = emp.salary > 4664 ? emp.salary * 0.075 : 0;
  const vt    = emp.benefits.includes('VT') ? 220 : 0;
  const vr    = emp.benefits.includes('VR') ? 132 : 0;
  const hlth  = emp.benefits.includes('Plano de Saúde') ? emp.salary * 0.03 : 0;
  const totalDed = inss + irrf + vt + vr + hlth;
  const totalProv = emp.salary + 450;
  const netPay = totalProv - totalDed;

  const tabs: { id: PayslipTab; label: string }[] = [
    { id:'proventos',  label:'Proventos' },
    { id:'descontos',  label:'Descontos' },
    { id:'hourbank',   label:'Banco de Horas' },
    { id:'folgas',     label:'Folgas' },
    { id:'comissoes',  label:'Comissões' },
    { id:'alertas',    label:'Alertas da Folha' },
  ];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-${config.primaryColor}-100 flex items-center justify-center text-${config.primaryColor}-700 font-black text-sm`}>
              {emp.name.split(' ').map(n=>n[0]).join('').substring(0,2)}
            </div>
            <div>
              <h3 className="font-black text-slate-800">{emp.name}</h3>
              <p className="text-xs text-slate-500">{emp.role} · Outubro 2023 · {emp.contractType}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-slate-400">Líquido a receber</p>
              <p className="text-xl font-black text-emerald-600">R$ {netPay.toLocaleString('pt-BR',{minimumFractionDigits:2})}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full"><X className="w-5 h-5 text-slate-500" /></button>
          </div>
        </div>

        {/* Summary strip */}
        <div className="flex items-center gap-6 px-5 py-3 bg-white border-b border-slate-100 shrink-0">
          <div className="text-center">
            <p className="text-xs text-slate-400">Proventos</p>
            <p className="text-sm font-black text-emerald-600">+R$ {totalProv.toLocaleString('pt-BR',{minimumFractionDigits:2})}</p>
          </div>
          <div className="text-slate-200 text-lg">—</div>
          <div className="text-center">
            <p className="text-xs text-slate-400">Descontos</p>
            <p className="text-sm font-black text-red-500">-R$ {totalDed.toLocaleString('pt-BR',{minimumFractionDigits:2})}</p>
          </div>
          <div className="text-slate-200 text-lg">=</div>
          <div className="text-center">
            <p className="text-xs text-slate-400">Líquido</p>
            <p className="text-sm font-black text-slate-900">R$ {netPay.toLocaleString('pt-BR',{minimumFractionDigits:2})}</p>
          </div>
          <div className="flex-1" />
          <button className="flex items-center gap-1.5 text-xs text-indigo-600 font-bold hover:underline">
            <Download className="w-3.5 h-3.5" /> Baixar PDF
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 overflow-x-auto shrink-0">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-xs font-bold whitespace-nowrap border-b-2 transition-colors
                ${activeTab === tab.id ? 'border-indigo-500 text-indigo-600 bg-indigo-50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'proventos'  && <PayslipProventos  emp={emp} />}
          {activeTab === 'descontos'  && <PayslipDescontos  emp={emp} />}
          {activeTab === 'hourbank'   && <PayslipHourBank   emp={emp} />}
          {activeTab === 'folgas'     && <PayslipFolgas     emp={emp} />}
          {activeTab === 'comissoes'  && <PayslipComissoes  emp={emp} />}
          {activeTab === 'alertas'    && <PayslipAlertas    emp={emp} />}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CRIAR GRUPO DE FOLHA MODAL
// ============================================================
function NewPayrollGroupModal({ onClose, onSave }: { onClose: () => void; onSave: (g: PayrollGroup) => void }) {
  const { config } = useAppContext();

  const [form, setForm] = useState({
    name: '', period: '', paymentDate: '', bank: 'Itaú',
    employees: [] as string[], approver: '', rules: 'CLT Padrão',
    gratification: { type: 'Nenhuma', value: '', applies: 'Individual' }
  });

  const toggleEmp = (name: string) =>
    setForm(p => ({
      ...p,
      employees: p.employees.includes(name) ? p.employees.filter(e => e !== name) : [...p.employees, name]
    }));

  const save = () => {
    onSave({
      id: String(Date.now()),
      name: form.name || 'Novo Grupo',
      period: form.period,
      paymentDate: form.paymentDate,
      employeeCount: form.employees.length,
      totalGross: form.employees.length * 8000,
      totalDeductions: form.employees.length * 1600,
      totalNet: form.employees.length * 6400,
      status: 'Aberta'
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
          <h3 className="font-black text-slate-800">Criar Grupo de Folha</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full"><X className="w-5 h-5 text-slate-500" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nome do Grupo *</label>
              <input value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="Ex: Mensalistas — Nov/23" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Período de Apuração</label>
              <input value={form.period} onChange={e => setForm(p=>({...p,period:e.target.value}))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="Ex: 01/11/2023 – 30/11/2023" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Data de Pagamento</label>
              <input type="date" value={form.paymentDate} onChange={e => setForm(p=>({...p,paymentDate:e.target.value}))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Banco para Depósito</label>
              <select value={form.bank} onChange={e => setForm(p=>({...p,bank:e.target.value}))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                {['Itaú','Bradesco','Santander','Banco do Brasil','Nubank'].map(b=><option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Regras de Cálculo</label>
              <select value={form.rules} onChange={e => setForm(p=>({...p,rules:e.target.value}))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                {['CLT Padrão','PJ Mensal','Estagiário','Gestores Premium'].map(r=><option key={r}>{r}</option>)}
              </select>
            </div>
          </div>

          {/* Employee selection */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Funcionários do Grupo</label>
            <div className="grid grid-cols-2 gap-2">
              {employees.map(emp => (
                <button key={emp.id} onClick={() => toggleEmp(emp.name)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all text-xs
                    ${form.employees.includes(emp.name) ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[10px]
                    ${form.employees.includes(emp.name) ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {emp.name.split(' ').map(n=>n[0]).join('').substring(0,2)}
                  </div>
                  <div>
                    <p className="font-bold">{emp.name}</p>
                    <p className="text-[10px] opacity-70">{emp.role}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Gratificação */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <p className="text-xs font-bold text-slate-600 uppercase mb-3">Gratificação (opcional)</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Tipo</label>
                <select value={form.gratification.type} onChange={e => setForm(p=>({...p,gratification:{...p.gratification,type:e.target.value}}))}
                  className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs bg-white focus:outline-none">
                  {['Nenhuma','Valor Fixo','Percentual','Bonificação'].map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              {form.gratification.type !== 'Nenhuma' && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Valor</label>
                    <input value={form.gratification.value} onChange={e => setForm(p=>({...p,gratification:{...p.gratification,value:e.target.value}}))}
                      className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs bg-white focus:outline-none"
                      placeholder={form.gratification.type === 'Percentual' ? '5%' : 'R$ 500'} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Aplicar a</label>
                    <select value={form.gratification.applies} onChange={e => setForm(p=>({...p,gratification:{...p.gratification,applies:e.target.value}}))}
                      className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs bg-white focus:outline-none">
                      <option>Individual</option>
                      <option>Grupo inteiro</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="px-5 pb-5 pt-3 border-t border-slate-100 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Cancelar</button>
          <button onClick={save} className={`px-6 py-2.5 bg-${config.primaryColor}-600 text-white rounded-xl text-sm font-bold hover:bg-${config.primaryColor}-700 shadow-sm`}>
            Criar Grupo
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// PAYROLL SECTION — COMPONENTE PRINCIPAL
// ============================================================
function PayrollSection({ onNavigate: _onNavigate }: { onNavigate: (s: HRSection) => void }) {
  const { config } = useAppContext();

  const [groups, setGroups] = useState(payrollGroups);
  const [selectedGroup, setSelectedGroup] = useState<PayrollGroup | null>(null);
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [empSearch, setEmpSearch] = useState('');

  const filteredEmps = employees.filter(e =>
    e.name.toLowerCase().includes(empSearch.toLowerCase()) ||
    e.role.toLowerCase().includes(empSearch.toLowerCase())
  );

  const statusColor = (status: PayrollGroup['status']) => ({
    'Aberta':           'bg-blue-100 text-blue-700',
    'Em Processamento': 'bg-amber-100 text-amber-700',
    'Fechada':          'bg-slate-100 text-slate-600',
    'Paga':             'bg-emerald-100 text-emerald-700',
  }[status]);

  const statusBar = (status: PayrollGroup['status']) => ({
    'Aberta': 10, 'Em Processamento': 60, 'Fechada': 90, 'Paga': 100
  }[status]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900">Folha de Pagamento</h2>
          <p className="text-sm text-slate-500">Processamento, grupos e holerites detalhados</p>
        </div>
        <button onClick={() => setShowNewGroup(true)}
          className={`flex items-center gap-2 px-4 py-2.5 bg-${config.primaryColor}-600 text-white rounded-xl font-bold text-sm shadow-sm hover:bg-${config.primaryColor}-700`}>
          <Plus className="w-4 h-4" /> Novo Grupo de Folha
        </button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label:'Total Bruto (Out/23)', value:`R$ ${(350000/1000).toFixed(0)}k`, color:'text-slate-900' },
          { label:'Total Descontos', value:`R$ ${(85000/1000).toFixed(0)}k`, color:'text-red-500' },
          { label:'Total Líquido', value:`R$ ${(265000/1000).toFixed(0)}k`, color:'text-emerald-600' },
        ].map((k,i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
            <p className={`text-2xl font-black ${k.color}`}>{k.value}</p>
            <p className="text-xs text-slate-500 mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Group cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {groups.map(group => (
          <div key={group.id} onClick={() => setSelectedGroup(group)}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all relative overflow-hidden">
            <div className={`absolute top-0 right-0 px-3 py-1.5 rounded-bl-2xl text-xs font-black ${statusColor(group.status)}`}>
              {group.status}
            </div>
            <h3 className="font-black text-slate-800 mb-1 pr-24 text-sm">{group.name}</h3>
            <p className="text-[11px] text-slate-400 mb-4">{group.period}</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Colaboradores</span>
                <span className="font-bold text-slate-700">{group.employeeCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pagamento</span>
                <span className="font-bold text-slate-700">{group.paymentDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Líquido</span>
                <span className="font-black text-emerald-600">R$ {group.totalNet.toLocaleString('pt-BR')}</span>
              </div>
            </div>
            <div className="mt-4 w-full bg-slate-100 rounded-full h-1.5">
              <div className={`h-1.5 rounded-full transition-all ${group.status === 'Paga' ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                style={{ width: `${statusBar(group.status)}%` }} />
            </div>
          </div>
        ))}

        {/* New group button */}
        <button onClick={() => setShowNewGroup(true)}
          className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-6 text-slate-400 hover:border-indigo-300 hover:bg-indigo-50 transition-all">
          <Plus className="w-8 h-8 mb-2" />
          <span className="font-bold text-sm">Novo Grupo</span>
        </button>
      </div>

      {/* Group detail modal — employee list + payslip */}
      {selectedGroup && (
        <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-black text-slate-800">{selectedGroup.name}</h3>
                <p className="text-xs text-slate-500">{selectedGroup.period} · Pagamento: {selectedGroup.paymentDate}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1.5 rounded-xl text-xs font-black ${statusColor(selectedGroup.status)}`}>{selectedGroup.status}</span>
                <button onClick={() => { setSelectedGroup(null); setSelectedEmp(null); }} className="p-2 hover:bg-slate-200 rounded-full">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Left: employee list */}
              <div className="w-72 border-r border-slate-100 flex flex-col shrink-0">
                <div className="p-3 border-b border-slate-100">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input value={empSearch} onChange={e => setEmpSearch(e.target.value)}
                      placeholder="Filtrar funcionário..."
                      className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                  </div>
                </div>
                {/* Summary row */}
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Total Bruto</span>
                    <span className="font-bold">R$ {selectedGroup.totalGross.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Total Líquido</span>
                    <span className="font-bold text-emerald-600">R$ {selectedGroup.totalNet.toLocaleString('pt-BR')}</span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {filteredEmps.map(emp => {
                    const net = emp.salary * 0.82;
                    return (
                      <div key={emp.id} onClick={() => setSelectedEmp(emp)}
                        className={`flex items-center justify-between p-3 border-b border-slate-50 cursor-pointer transition-colors
                          ${selectedEmp?.id === emp.id ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : 'hover:bg-slate-50'}`}>
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-black text-[10px] flex items-center justify-center shrink-0">
                            {emp.name.split(' ').map(n=>n[0]).join('').substring(0,2)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{emp.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">{emp.role}</p>
                          </div>
                        </div>
                        <span className="text-xs font-black text-emerald-600 shrink-0 ml-2">
                          R$ {(net/1000).toFixed(1)}k
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right: payslip or placeholder */}
              <div className="flex-1 overflow-y-auto bg-slate-50 flex flex-col">
                {selectedEmp ? (
                  <div className="p-6">
                    {/* Mini header inside panel */}
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-black text-slate-800">{selectedEmp.name}</h4>
                        <p className="text-xs text-slate-500">{selectedEmp.role} · {selectedEmp.contractType}</p>
                      </div>
                      <button onClick={() => setSelectedEmp(selectedEmp)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-sm">
                        <Eye className="w-3.5 h-3.5" /> Ver holerite completo
                      </button>
                    </div>

                    {/* Quick summary */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      {[
                        { l:'Bruto', v:`R$ ${(selectedEmp.salary+450).toLocaleString('pt-BR')}`, c:'text-slate-800' },
                        { l:'Descontos', v:`-R$ ${(selectedEmp.salary*0.18).toFixed(0)}`, c:'text-red-500' },
                        { l:'Líquido', v:`R$ ${(selectedEmp.salary*0.82+450).toFixed(0)}`, c:'text-emerald-600' },
                      ].map((k,i) => (
                        <div key={i} className="bg-white rounded-xl p-3 border border-slate-100 text-center">
                          <p className={`font-black text-sm ${k.c}`}>{k.v}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{k.l}</p>
                        </div>
                      ))}
                    </div>

                    {/* Inline holerite with all 6 tabs */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      <PayslipViewer emp={selectedEmp} onClose={() => setSelectedEmp(null)} />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                    <Users className="w-12 h-12 mb-3 opacity-40" />
                    <p className="font-bold text-slate-500">Selecione um funcionário</p>
                    <p className="text-sm text-slate-400 mt-1">para ver o holerite detalhado</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payslip standalone modal — triggered from "Ver holerite completo" */}
      {selectedEmp && !selectedGroup && (
        <PayslipViewer emp={selectedEmp} onClose={() => setSelectedEmp(null)} />
      )}

      {showNewGroup && (
        <NewPayrollGroupModal
          onClose={() => setShowNewGroup(false)}
          onSave={g => setGroups(p => [g, ...p])}
        />
      )}
    </div>
  );
}

// ============================================================
// PLACEHOLDER (for sections in upcoming parts)
// ============================================================
function ComingSoonSection({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-80 bg-white rounded-2xl border border-dashed border-slate-200">
      <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4">
        <Sparkles className="w-7 h-7 text-indigo-400" />
      </div>
      <h3 className="text-lg font-black text-slate-800 mb-1">{title}</h3>
      <p className="text-sm text-slate-400 text-center max-w-xs">{description}</p>
      <p className="text-xs text-indigo-500 font-bold mt-3">Implementado na próxima parte →</p>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function HRModule() {
  const [activeSection, setActiveSection] = useState<HRSection>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);


  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard': return <DashboardSection onNavigate={setActiveSection} />;
      case 'employee-register': return <EmployeeRegisterSection onNavigate={setActiveSection} />;
      case 'employee-list': return <EmployeeListSection onNavigate={setActiveSection} />;
      case 'timesheet': return <TimesheetSection onNavigate={setActiveSection} />;
      case 'employee-metrics': return <EmployeeMetricsSection onNavigate={setActiveSection} />;
      case 'payroll': return <PayrollSection onNavigate={setActiveSection} />;
      case 'employee-groups': return <ComingSoonSection title="Grupos de Funcionários" description="Criação e gestão de grupos com critérios automáticos — Parte 4" />;
      case 'absences': return <ComingSoonSection title="Faltas e Ausências" description="Dashboard de absenteísmo e impacto financeiro — Parte 4" />;
      case 'planned-leaves': return <ComingSoonSection title="Folgas Planejadas" description="Calendário de folgas com detecção de conflitos ZIA — Parte 4" />;
      case 'hourbank': return <ComingSoonSection title="Banco de Horas" description="Controle de saldo, créditos, débitos e expiração — Parte 4" />;
      case 'vacations': return <ComingSoonSection title="Férias" description="Período aquisitivo, agendamento e cálculo automático — Parte 4" />;
      case 'annotations': return <ComingSoonSection title="Anotações e Atividades" description="Advertências, tipos de anotação, produtividade e custeio — Parte 5" />;
      case 'admissions-metrics': return <ComingSoonSection title="Métricas de Admissões" description="Funil de recrutamento e análise de vagas — Parte 6" />;
      case 'vacancies': return <ComingSoonSection title="Vagas — ZIAvagas" description="Abertura de vagas, funil de candidatos e portal público — Parte 6" />;
      case 'admission-alerts': return <ComingSoonSection title="Alertas de Admissões e Rescisões" description="Configuração de alertas automáticos ZIA — Parte 6" />;
      default: return <DashboardSection onNavigate={setActiveSection} />;
    }
  };

  const getSectionTitle = () => {
    const all = navItems.flatMap(n => n.children ? [n, ...n.children] : [n]);
    return all.find(n => n.id === activeSection)?.label || 'Dashboard';
  };

  return (
    <div className="h-full flex bg-slate-50">
      {sidebarOpen && <Sidebar active={activeSection} onNavigate={setActiveSection} />}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <div className="bg-white border-b border-slate-100 px-5 py-3 flex items-center gap-3 shadow-sm shrink-0">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-lg hover:bg-slate-100">
            <Menu className="w-4 h-4 text-slate-500" />
          </button>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>Pessoas</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="font-bold text-slate-800">{getSectionTitle()}</span>
          </div>
          <div className="flex-1" />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input placeholder="Buscar funcionário..." className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm w-56 focus:outline-none focus:ring-2 focus:ring-indigo-300" />
          </div>
          <button className="relative p-2 hover:bg-slate-100 rounded-xl">
            <Bell className="w-4 h-4 text-slate-500" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto">
            {renderSection()}
          </div>
        </div>
      </div>
    </div>
  );
}
