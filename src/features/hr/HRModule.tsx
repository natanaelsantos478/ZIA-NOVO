import { useState, useMemo } from 'react';
import {
  Users, Clock, DollarSign, Calendar, Briefcase, UserPlus,
  CheckCircle, FileText, TrendingUp, Search, Plus, X,
  ChevronRight, ChevronDown, AlertTriangle, AlertCircle,
  ArrowUpRight, Download, ShieldCheck, Building,
  Sparkles, Bell, BarChart3, Activity, Zap,
  UserCheck, CreditCard, MapPin, Phone, Mail,
  Hash, Settings, Menu
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

// ============================================================
// TYPES
// ============================================================
type HRSection =
  | 'dashboard'
  | 'employee-register'
  | 'employee-list'
  | 'timesheet'
  | 'employee-metrics'
  | 'payroll'
  | 'employee-groups'
  | 'absences'
  | 'planned-leaves'
  | 'hourbank'
  | 'vacations'
  | 'annotations'
  | 'admissions-metrics'
  | 'vacancies'
  | 'admission-alerts';

type ContractType = 'CLT' | 'PJ' | 'Temporário' | 'Estágio';
type WorkRegime = 'Horário Fixo' | 'Escala' | 'Banco de Horas';
type EmployeeStatus = 'Ativo' | 'Inativo' | 'Afastado' | 'Férias';
type WarningType = 'Verbal' | 'Escrita' | 'Suspensão';
type AbsenceType = 'Médica' | 'Pessoal' | 'Judicial' | 'Luto' | 'Maternidade';
type ApprovalStatus = 'Pendente' | 'Aprovado' | 'Rejeitado';

interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  manager: string;
  contractType: ContractType;
  workRegime: WorkRegime;
  status: EmployeeStatus;
  admissionDate: string;
  salary: number;
  email: string;
  cpf: string;
  rg: string;
  ctps: string;
  pis: string;
  birthDate: string;
  phone: string;
  address: string;
  bank: string;
  agency: string;
  account: string;
  pixKey: string;
  accessLevel: string;
  payrollGroup: string;
  benefits: string[];
  hourBankBalance: number;
  vacationDays: number;
  warnings: number;
}

interface Warning {
  id: string;
  employeeName: string;
  employeeId: string;
  type: WarningType;
  date: string;
  reason: string;
  severity: 'Baixa' | 'Média' | 'Alta';
  status: 'Pendente Assinatura' | 'Assinada' | 'Recusada';
}

interface Absence {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  type: AbsenceType;
  justified: boolean;
  document?: string;
  financialImpact: number;
  status: 'Registrada' | 'Pendente Documentação';
}

interface TimeRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkIn: string;
  checkOut: string;
  lunchStart: string;
  lunchEnd: string;
  totalHours: number;
  overtimeHours: number;
  status: 'Normal' | 'Atraso' | 'Falta' | 'Incompleto';
}

interface Overtime {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  hours: number;
  type: 'Dia Útil' | 'Sábado' | 'Domingo' | 'Feriado';
  percentage: number;
  value: number;
  approvalStatus: ApprovalStatus;
  reason: string;
}

interface PayrollGroup {
  id: string;
  name: string;
  period: string;
  paymentDate: string;
  employeeCount: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  status: 'Aberta' | 'Em Processamento' | 'Fechada' | 'Paga';
}

interface Vacancy {
  id: string;
  title: string;
  department: string;
  contractType: ContractType;
  salaryMin: number;
  salaryMax: number;
  daysOpen: number;
  candidates: number;
  status: 'Aberta' | 'Encerrada';
  manager: string;
}

// ============================================================
// MOCK DATA
// ============================================================
const mockEmployees: Employee[] = [
  {
    id: '1', name: 'Ana Silva', role: 'Desenvolvedora Senior', department: 'TI',
    manager: 'Carlos Souza', contractType: 'CLT', workRegime: 'Horário Fixo',
    status: 'Ativo', admissionDate: '2022-03-10', salary: 12500,
    email: 'ana.silva@empresa.com', cpf: '123.456.789-00', rg: '12.345.678-9',
    ctps: '123456/001', pis: '12345678900', birthDate: '1990-05-15',
    phone: '(11) 99999-0001', address: 'Rua das Flores, 123 - São Paulo/SP',
    bank: 'Itaú', agency: '1234', account: '56789-0', pixKey: 'ana.silva@empresa.com',
    accessLevel: 'Admin', payrollGroup: 'Mensalistas',
    benefits: ['VT', 'VR', 'Plano de Saúde'], hourBankBalance: 8.5, vacationDays: 30, warnings: 0
  },
  {
    id: '2', name: 'João Santos', role: 'Analista de Marketing', department: 'Marketing',
    manager: 'Fernanda Lima', contractType: 'PJ', workRegime: 'Horário Fixo',
    status: 'Ativo', admissionDate: '2023-01-15', salary: 8000,
    email: 'joao.santos@empresa.com', cpf: '234.567.890-11', rg: '23.456.789-0',
    ctps: '234567/001', pis: '23456789011', birthDate: '1988-11-22',
    phone: '(11) 99999-0002', address: 'Av. Paulista, 456 - São Paulo/SP',
    bank: 'Bradesco', agency: '5678', account: '12345-6', pixKey: '234.567.890-11',
    accessLevel: 'User', payrollGroup: 'Mensalistas',
    benefits: ['VR', 'Plano de Saúde'], hourBankBalance: 0, vacationDays: 15, warnings: 1
  },
  {
    id: '3', name: 'Maria Oliveira', role: 'Assistente RH', department: 'RH',
    manager: 'Roberto Costa', contractType: 'Estágio', workRegime: 'Horário Fixo',
    status: 'Férias', admissionDate: '2023-06-01', salary: 1500,
    email: 'maria.oliveira@empresa.com', cpf: '345.678.901-22', rg: '34.567.890-1',
    ctps: '345678/001', pis: '34567890122', birthDate: '2001-03-08',
    phone: '(11) 99999-0003', address: 'Rua Augusta, 789 - São Paulo/SP',
    bank: 'Santander', agency: '9012', account: '34567-8', pixKey: '(11) 99999-0003',
    accessLevel: 'User', payrollGroup: 'Estagiários',
    benefits: ['VT'], hourBankBalance: 0, vacationDays: 10, warnings: 0
  },
  {
    id: '4', name: 'Pedro Costa', role: 'Gerente Comercial', department: 'Comercial',
    manager: 'Diretoria', contractType: 'CLT', workRegime: 'Banco de Horas',
    status: 'Afastado', admissionDate: '2021-11-20', salary: 18000,
    email: 'pedro.costa@empresa.com', cpf: '456.789.012-33', rg: '45.678.901-2',
    ctps: '456789/001', pis: '45678901233', birthDate: '1982-07-30',
    phone: '(11) 99999-0004', address: 'Rua Oscar Freire, 321 - São Paulo/SP',
    bank: 'Nubank', agency: '0001', account: '78901-2', pixKey: '456.789.012-33',
    accessLevel: 'Manager', payrollGroup: 'Gestores',
    benefits: ['VT', 'VR', 'Plano de Saúde', 'Odonto', 'Previdência'], hourBankBalance: 24, vacationDays: 30, warnings: 2
  },
  {
    id: '5', name: 'Lucas Pereira', role: 'Suporte Técnico', department: 'TI',
    manager: 'Ana Silva', contractType: 'CLT', workRegime: 'Escala',
    status: 'Ativo', admissionDate: '2023-08-05', salary: 4500,
    email: 'lucas.pereira@empresa.com', cpf: '567.890.123-44', rg: '56.789.012-3',
    ctps: '567890/001', pis: '56789012344', birthDate: '1995-12-10',
    phone: '(11) 99999-0005', address: 'Rua Vergueiro, 654 - São Paulo/SP',
    bank: 'C6 Bank', agency: '0001', account: '23456-7', pixKey: 'lucas.pereira@empresa.com',
    accessLevel: 'User', payrollGroup: 'Mensalistas',
    benefits: ['VT', 'VR'], hourBankBalance: -2, vacationDays: 5, warnings: 1
  },
];

const mockWarnings: Warning[] = [
  { id: '1', employeeName: 'João Santos', employeeId: '2', type: 'Verbal', date: '2023-09-15', reason: 'Atrasos constantes', severity: 'Baixa', status: 'Assinada' },
  { id: '2', employeeName: 'Pedro Costa', employeeId: '4', type: 'Escrita', date: '2023-08-20', reason: 'Uso indevido de recursos', severity: 'Média', status: 'Assinada' },
  { id: '3', employeeName: 'Lucas Pereira', employeeId: '5', type: 'Suspensão', date: '2023-07-10', reason: 'Insubordinação', severity: 'Alta', status: 'Pendente Assinatura' },
  { id: '4', employeeName: 'Pedro Costa', employeeId: '4', type: 'Verbal', date: '2023-06-05', reason: 'Linguagem inadequada', severity: 'Baixa', status: 'Assinada' },
];

const mockAbsences: Absence[] = [
  { id: '1', employeeId: '3', employeeName: 'Maria Oliveira', date: '2023-10-24', type: 'Médica', justified: true, document: 'atestado.pdf', financialImpact: 0, status: 'Registrada' },
  { id: '2', employeeId: '4', employeeName: 'Pedro Costa', date: '2023-10-15', type: 'Pessoal', justified: false, financialImpact: 981.81, status: 'Registrada' },
  { id: '3', employeeId: '2', employeeName: 'João Santos', date: '2023-10-10', type: 'Pessoal', justified: true, document: 'comprovante.pdf', financialImpact: 0, status: 'Pendente Documentação' },
  { id: '4', employeeId: '5', employeeName: 'Lucas Pereira', date: '2023-10-05', type: 'Pessoal', justified: false, financialImpact: 204.54, status: 'Registrada' },
];

const mockTimeRecords: TimeRecord[] = [
  { id: '1', employeeId: '1', employeeName: 'Ana Silva', date: '2023-10-25', checkIn: '09:00', checkOut: '18:00', lunchStart: '12:00', lunchEnd: '13:00', totalHours: 8, overtimeHours: 0, status: 'Normal' },
  { id: '2', employeeId: '2', employeeName: 'João Santos', date: '2023-10-25', checkIn: '09:15', checkOut: '18:15', lunchStart: '12:30', lunchEnd: '13:30', totalHours: 8, overtimeHours: 0, status: 'Atraso' },
  { id: '3', employeeId: '5', employeeName: 'Lucas Pereira', date: '2023-10-25', checkIn: '08:00', checkOut: '17:00', lunchStart: '12:00', lunchEnd: '13:00', totalHours: 8, overtimeHours: 0, status: 'Normal' },
  { id: '4', employeeId: '3', employeeName: 'Maria Oliveira', date: '2023-10-25', checkIn: '', checkOut: '', lunchStart: '', lunchEnd: '', totalHours: 0, overtimeHours: 0, status: 'Falta' },
  { id: '5', employeeId: '1', employeeName: 'Ana Silva', date: '2023-10-26', checkIn: '09:00', checkOut: '19:00', lunchStart: '12:00', lunchEnd: '13:00', totalHours: 9, overtimeHours: 1, status: 'Normal' },
];

const mockOvertimes: Overtime[] = [
  { id: '1', employeeId: '1', employeeName: 'Ana Silva', date: '2023-10-26', hours: 1, type: 'Dia Útil', percentage: 50, value: 85.22, approvalStatus: 'Pendente', reason: 'Deploy de emergência' },
  { id: '2', employeeId: '5', employeeName: 'Lucas Pereira', date: '2023-10-21', hours: 4, type: 'Sábado', percentage: 100, value: 122.72, approvalStatus: 'Aprovado', reason: 'Manutenção programada' },
  { id: '3', employeeId: '4', employeeName: 'Pedro Costa', date: '2023-10-20', hours: 2, type: 'Dia Útil', percentage: 50, value: 245.45, approvalStatus: 'Rejeitado', reason: 'Sem justificativa' },
];

const mockPayrollGroups: PayrollGroup[] = [
  { id: '1', name: 'Mensalistas - Out/23', period: '01/10/2023 - 31/10/2023', paymentDate: '05/11/2023', employeeCount: 45, totalGross: 350000, totalDeductions: 85000, totalNet: 265000, status: 'Em Processamento' },
  { id: '2', name: 'Mensalistas - Set/23', period: '01/09/2023 - 30/09/2023', paymentDate: '05/10/2023', employeeCount: 44, totalGross: 342000, totalDeductions: 82000, totalNet: 260000, status: 'Paga' },
  { id: '3', name: '13º Salário - 1ª Parcela', period: '2023', paymentDate: '30/11/2023', employeeCount: 45, totalGross: 175000, totalDeductions: 0, totalNet: 175000, status: 'Aberta' },
];

const mockVacancies: Vacancy[] = [
  { id: '1', title: 'Desenvolvedor Full Stack', department: 'TI', contractType: 'CLT', salaryMin: 8000, salaryMax: 14000, daysOpen: 12, candidates: 47, status: 'Aberta', manager: 'Ana Silva' },
  { id: '2', title: 'Analista Financeiro', department: 'Financeiro', contractType: 'CLT', salaryMin: 5000, salaryMax: 8000, daysOpen: 5, candidates: 23, status: 'Aberta', manager: 'Roberto Costa' },
  { id: '3', title: 'SDR Comercial', department: 'Comercial', contractType: 'CLT', salaryMin: 2500, salaryMax: 4000, daysOpen: 30, candidates: 89, status: 'Aberta', manager: 'Pedro Costa' },
];

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

      {showNewRoleModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h3 className="font-black text-slate-800">Criar Novo Cargo</h3>
              <button onClick={()=>setShowNewRoleModal(false)} className="p-2 hover:bg-slate-200 rounded-full"><X className="w-4 h-4"/></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nome do Cargo *</label>
                  <input value={newRoleForm.nome} onChange={e=>setNewRoleForm(p=>({...p,nome:e.target.value}))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    placeholder="Ex: Analista de Sistemas" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tipo</label>
                  <select value={newRoleForm.tipo} onChange={e=>setNewRoleForm(p=>({...p,tipo:e.target.value}))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    {['CLT', 'PJ', 'Estágio', 'Terceirizado', 'Temporário'].map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Grupo de Salário</label>
                  <select value={newRoleForm.grupoSalario} onChange={e=>setNewRoleForm(p=>({...p,grupoSalario:e.target.value}))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    <option value="">Selecione um grupo...</option>
                    {/* Opções virão de outra aba futuramente */}
                  </select>
                </div>

                <div className="col-span-2 pt-2 pb-1">
                  <h4 className="font-bold text-slate-700 text-sm border-b border-slate-100 pb-2">Atividades Automáticas</h4>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Atividades Diárias</label>
                  <textarea value={newRoleForm.atividadesDiarias} onChange={e=>setNewRoleForm(p=>({...p,atividadesDiarias:e.target.value}))} rows={2}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                    placeholder="Descreva as atividades diárias..." />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Atividades Semanais</label>
                  <textarea value={newRoleForm.atividadesSemanais} onChange={e=>setNewRoleForm(p=>({...p,atividadesSemanais:e.target.value}))} rows={2}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                    placeholder="Descreva as atividades semanais..." />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Atividades Mensais</label>
                  <textarea value={newRoleForm.atividadesMensais} onChange={e=>setNewRoleForm(p=>({...p,atividadesMensais:e.target.value}))} rows={2}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                    placeholder="Descreva as atividades mensais..." />
                </div>

                <div className="col-span-2 p-4 bg-slate-50 rounded-xl border border-slate-200 mt-2">
                  <p className="text-xs font-bold text-slate-600 uppercase mb-3">Atividades com Períodos Personalizados</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Intervalo (dias)</label>
                      <input type="number" value={newRoleForm.intervaloPersonalizado} onChange={e=>setNewRoleForm(p=>({...p,intervaloPersonalizado:e.target.value}))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        placeholder="Ex: 15" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Atividade</label>
                      <select value={newRoleForm.atividadePersonalizada} onChange={e=>setNewRoleForm(p=>({...p,atividadePersonalizada:e.target.value}))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                        <option value="">Selecione uma atividade...</option>
                        {/* Opções virão do banco de atividades */}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="col-span-2 pt-2 pb-1">
                  <h4 className="font-bold text-slate-700 text-sm border-b border-slate-100 pb-2">Custos e Salário</h4>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Salário Base (R$)</label>
                  <input type="number" value={newRoleForm.salarioBase} onChange={e=>setNewRoleForm(p=>({...p,salarioBase:e.target.value}))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Custo Direto (R$)</label>
                  <input type="number" value={newRoleForm.custoDireto} onChange={e=>setNewRoleForm(p=>({...p,custoDireto:e.target.value}))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Custo Indireto (R$)</label>
                  <input type="number" value={newRoleForm.custoIndireto} onChange={e=>setNewRoleForm(p=>({...p,custoIndireto:e.target.value}))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Cálculo de Imposto (%)</label>
                  <input type="number" value={newRoleForm.imposto} onChange={e=>setNewRoleForm(p=>({...p,imposto:e.target.value}))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    placeholder="0" />
                </div>

              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-3 shrink-0">
              <button onClick={()=>setShowNewRoleModal(false)} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 font-medium">Cancelar</button>
              <button onClick={handleSaveRole} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700">Salvar Cargo</button>
            </div>
          </div>
        </div>
      )}
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
    role: '', department: '', manager: '', admissionDate: '', salary: '',
    benefits: [] as string[], payrollGroup: '',
    bank: '', agency: '', account: '', accountType: 'Corrente', pixKey: '',
    corporateEmail: '', accessLevel: 'User',
  });
  const [saved, setSaved] = useState(false);
  const [ziaActive, setZiaActive] = useState(false);
  const [activeSection, setActiveSection] = useState<'personal' | 'contract' | 'bank' | 'access'>('personal');

  const updateField = (field: string, value: string | string[]) => {
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
                    <p className="text-[11px] text-slate-500 mt-0.5">{m.label}</p>
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
  const { config } = useAppContext();

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard': return <DashboardSection onNavigate={setActiveSection} />;
      case 'employee-register': return <EmployeeRegisterSection onNavigate={setActiveSection} />;
      case 'employee-list': return <EmployeeListSection onNavigate={setActiveSection} />;
      case 'timesheet': return <ComingSoonSection title="Folha de Ponto" description="Espelho de ponto, horas extras, ausências, escalas e alertas — Parte 2" />;
      case 'employee-metrics': return <ComingSoonSection title="Métricas de Funcionário" description="Análise geral e individual com dashboards completos — Parte 3" />;
      case 'payroll': return <ComingSoonSection title="Folha de Pagamento" description="Grupos de folha, holerite detalhado com abas — Parte 3" />;
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
// ============================================================
// PARTE 2 — FOLHA DE PONTO (8 ABAS COMPLETAS)
// Adicionar este conteúdo ao HRModule_part1.tsx
// Substituir a função ComingSoonSection do case 'timesheet'
// por <TimesheetSection onNavigate={setActiveSection} />
// ============================================================

// Novos tipos necessários — adicionar junto aos tipos existentes:
//
// type TimesheetTab =
//   | 'mirror' | 'overtime' | 'overtime-pending'
//   | 'change-requests' | 'justified' | 'unjustified'
//   | 'alerts' | 'schedules';
//
// interface ScheduleShift { day: string; checkIn: string; checkOut: string; active: boolean; }
// interface Schedule { id: string; name: string; type: string; employees: string[]; shifts: ScheduleShift[]; }
// interface AlertConfig { id: string; type: string; threshold: number; unit: string; severity: 'Baixa'|'Média'|'Alta'; recipient: string; action: string; active: boolean; }
// interface ChangeRequest { id: string; employeeId: string; employeeName: string; date: string; originalIn: string; originalOut: string; requestedIn: string; requestedOut: string; reason: string; evidence: string; status: ApprovalStatus; requestedAt: string; }

// ============================================================
// MOCKS ADICIONAIS — adicionar junto aos mocks existentes
// ============================================================

// const mockSchedules: Schedule[] = [
//   { id:'1', name:'Comercial 9-18', type:'5x2', employees:['João Santos','Maria Oliveira'],
//     shifts:[
//       {day:'Segunda',checkIn:'09:00',checkOut:'18:00',active:true},
//       {day:'Terça',checkIn:'09:00',checkOut:'18:00',active:true},
//       {day:'Quarta',checkIn:'09:00',checkOut:'18:00',active:true},
//       {day:'Quinta',checkIn:'09:00',checkOut:'18:00',active:true},
//       {day:'Sexta',checkIn:'09:00',checkOut:'18:00',active:true},
//       {day:'Sábado',checkIn:'',checkOut:'',active:false},
//       {day:'Domingo',checkIn:'',checkOut:'',active:false},
//     ]},
//   { id:'2', name:'TI Flexível 8-17', type:'5x2', employees:['Ana Silva','Lucas Pereira'],
//     shifts:[
//       {day:'Segunda',checkIn:'08:00',checkOut:'17:00',active:true},
//       {day:'Terça',checkIn:'08:00',checkOut:'17:00',active:true},
//       {day:'Quarta',checkIn:'08:00',checkOut:'17:00',active:true},
//       {day:'Quinta',checkIn:'08:00',checkOut:'17:00',active:true},
//       {day:'Sexta',checkIn:'08:00',checkOut:'17:00',active:true},
//       {day:'Sábado',checkIn:'',checkOut:'',active:false},
//       {day:'Domingo',checkIn:'',checkOut:'',active:false},
//     ]},
//   { id:'3', name:'Operações 12x36', type:'12x36', employees:['Pedro Costa'],
//     shifts:[
//       {day:'Segunda',checkIn:'07:00',checkOut:'19:00',active:true},
//       {day:'Terça',checkIn:'',checkOut:'',active:false},
//       {day:'Quarta',checkIn:'07:00',checkOut:'19:00',active:true},
//       {day:'Quinta',checkIn:'',checkOut:'',active:false},
//       {day:'Sexta',checkIn:'07:00',checkOut:'19:00',active:true},
//       {day:'Sábado',checkIn:'',checkOut:'',active:false},
//       {day:'Domingo',checkIn:'',checkOut:'',active:false},
//     ]},
// ];

// const mockChangeRequests: ChangeRequest[] = [
//   { id:'1', employeeId:'1', employeeName:'Ana Silva', date:'2023-10-24',
//     originalIn:'09:00', originalOut:'', requestedIn:'09:00', requestedOut:'18:30',
//     reason:'Esqueci de registrar saída — estava em reunião externa', evidence:'email_confirmacao.pdf',
//     status:'Pendente', requestedAt:'2023-10-25 08:30' },
//   { id:'2', employeeId:'2', employeeName:'João Santos', date:'2023-10-20',
//     originalIn:'', originalOut:'18:00', requestedIn:'09:30', requestedOut:'18:00',
//     reason:'Sistema biométrico com falha técnica no período da manhã', evidence:'chamado_ti.pdf',
//     status:'Aprovado', requestedAt:'2023-10-21 09:00' },
//   { id:'3', employeeId:'5', employeeName:'Lucas Pereira', date:'2023-10-18',
//     originalIn:'08:15', originalOut:'17:00', requestedIn:'08:00', requestedOut:'17:00',
//     reason:'Atraso de 15min devido a acidente no trânsito (linha 2)', evidence:'foto_transito.jpg',
//     status:'Rejeitado', requestedAt:'2023-10-19 07:45' },
// ];

// const mockAlertConfigs: AlertConfig[] = [
//   { id:'1', type:'Atraso Recorrente', threshold:3, unit:'vezes/mês', severity:'Média', recipient:'Gestor Direto', action:'Criar Anotação', active:true },
//   { id:'2', type:'Falta Injustificada', threshold:1, unit:'por ocorrência', severity:'Alta', recipient:'RH + Gestor', action:'Notificação + Anotação', active:true },
//   { id:'3', type:'HE Não Autorizada', threshold:1, unit:'por ocorrência', severity:'Alta', recipient:'Gestor Direto', action:'Bloquear HE', active:true },
//   { id:'4', type:'Jornada Excedente', threshold:10, unit:'horas/dia', severity:'Média', recipient:'RH', action:'Notificação', active:false },
//   { id:'5', type:'Intervalo Irregular', threshold:5, unit:'min de variação', severity:'Baixa', recipient:'Gestor Direto', action:'Notificação', active:true },
// ];

// ============================================================
// COMPONENTE PRINCIPAL — substituir case 'timesheet' no switch
// ============================================================

import { useState } from 'react';
import {
  Clock, Search, Download, CheckCircle, X, AlertTriangle,
  AlertCircle, ChevronRight, Plus, Edit3, Trash2,
  Calendar, Users, Filter, ToggleLeft, ToggleRight,
  FileText, Sparkles, Bell, Eye, Check, XCircle,
  ArrowUpRight, TrendingUp, TrendingDown, Zap, Shield
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

// ---- Local Types ----
type TimesheetTab =
  | 'mirror' | 'overtime' | 'overtime-pending'
  | 'change-requests' | 'justified' | 'unjustified'
  | 'alerts' | 'schedules';

type ApprovalStatus = 'Pendente' | 'Aprovado' | 'Rejeitado';
type AbsenceType = 'Médica' | 'Pessoal' | 'Judicial' | 'Luto' | 'Maternidade';

interface TimeRecord {
  id: string; employeeId: string; employeeName: string;
  date: string; checkIn: string; checkOut: string;
  lunchStart: string; lunchEnd: string;
  totalHours: number; overtimeHours: number;
  status: 'Normal' | 'Atraso' | 'Falta' | 'Incompleto' | 'Folga' | 'Feriado';
}

interface Overtime {
  id: string; employeeId: string; employeeName: string;
  date: string; hours: number;
  type: 'Dia Útil' | 'Sábado' | 'Domingo' | 'Feriado';
  percentage: number; value: number;
  approvalStatus: ApprovalStatus; reason: string;
  authorized: boolean;
}

interface Absence {
  id: string; employeeId: string; employeeName: string;
  date: string; type: AbsenceType; justified: boolean;
  document?: string; financialImpact: number;
  status: 'Registrada' | 'Pendente Documentação';
  dsrImpact: number;
}

interface ChangeRequest {
  id: string; employeeId: string; employeeName: string;
  date: string; originalIn: string; originalOut: string;
  requestedIn: string; requestedOut: string;
  reason: string; evidence: string;
  status: ApprovalStatus; requestedAt: string;
}

interface ScheduleShift {
  day: string; checkIn: string; checkOut: string; active: boolean;
}

interface Schedule {
  id: string; name: string; type: string;
  employees: string[]; shifts: ScheduleShift[];
}

interface AlertConfig {
  id: string; type: string; threshold: number; unit: string;
  severity: 'Baixa' | 'Média' | 'Alta';
  recipient: string; action: string; active: boolean;
}

// ---- Mock Data ----
const timeRecords: TimeRecord[] = [
  { id:'1', employeeId:'1', employeeName:'Ana Silva', date:'2023-10-25', checkIn:'09:00', checkOut:'18:00', lunchStart:'12:00', lunchEnd:'13:00', totalHours:8, overtimeHours:0, status:'Normal' },
  { id:'2', employeeId:'2', employeeName:'João Santos', date:'2023-10-25', checkIn:'09:15', checkOut:'18:15', lunchStart:'12:30', lunchEnd:'13:30', totalHours:8, overtimeHours:0, status:'Atraso' },
  { id:'3', employeeId:'5', employeeName:'Lucas Pereira', date:'2023-10-25', checkIn:'08:00', checkOut:'17:00', lunchStart:'12:00', lunchEnd:'13:00', totalHours:8, overtimeHours:0, status:'Normal' },
  { id:'4', employeeId:'3', employeeName:'Maria Oliveira', date:'2023-10-25', checkIn:'', checkOut:'', lunchStart:'', lunchEnd:'', totalHours:0, overtimeHours:0, status:'Falta' },
  { id:'5', employeeId:'1', employeeName:'Ana Silva', date:'2023-10-26', checkIn:'09:00', checkOut:'19:00', lunchStart:'12:00', lunchEnd:'13:00', totalHours:9, overtimeHours:1, status:'Normal' },
  { id:'6', employeeId:'5', employeeName:'Lucas Pereira', date:'2023-10-26', checkIn:'08:00', checkOut:'20:00', lunchStart:'12:00', lunchEnd:'13:00', totalHours:11, overtimeHours:3, status:'Normal' },
  { id:'7', employeeId:'2', employeeName:'João Santos', date:'2023-10-26', checkIn:'09:00', checkOut:'17:30', lunchStart:'12:00', lunchEnd:'13:30', totalHours:7.5, overtimeHours:0, status:'Incompleto' },
  { id:'8', employeeId:'4', employeeName:'Pedro Costa', date:'2023-10-26', checkIn:'', checkOut:'', lunchStart:'', lunchEnd:'', totalHours:0, overtimeHours:0, status:'Folga' },
  { id:'9', employeeId:'1', employeeName:'Ana Silva', date:'2023-10-27', checkIn:'09:00', checkOut:'18:00', lunchStart:'12:00', lunchEnd:'13:00', totalHours:8, overtimeHours:0, status:'Normal' },
  { id:'10', employeeId:'3', employeeName:'Maria Oliveira', date:'2023-10-27', checkIn:'', checkOut:'', lunchStart:'', lunchEnd:'', totalHours:0, overtimeHours:0, status:'Feriado' },
];

const overtimes: Overtime[] = [
  { id:'1', employeeId:'1', employeeName:'Ana Silva', date:'2023-10-26', hours:1, type:'Dia Útil', percentage:50, value:85.22, approvalStatus:'Pendente', reason:'Deploy emergência produção', authorized:false },
  { id:'2', employeeId:'5', employeeName:'Lucas Pereira', date:'2023-10-26', hours:3, type:'Dia Útil', percentage:50, value:153.40, approvalStatus:'Pendente', reason:'Migração de dados crítica', authorized:true },
  { id:'3', employeeId:'5', employeeName:'Lucas Pereira', date:'2023-10-21', hours:4, type:'Sábado', percentage:100, value:122.72, approvalStatus:'Aprovado', reason:'Manutenção programada', authorized:true },
  { id:'4', employeeId:'4', employeeName:'Pedro Costa', date:'2023-10-20', hours:2, type:'Dia Útil', percentage:50, value:245.45, approvalStatus:'Rejeitado', reason:'Sem justificativa clara', authorized:false },
  { id:'5', employeeId:'2', employeeName:'João Santos', date:'2023-10-15', hours:2, type:'Domingo', percentage:100, value:200.00, approvalStatus:'Aprovado', reason:'Evento de marketing', authorized:true },
];

const absences: Absence[] = [
  { id:'1', employeeId:'3', employeeName:'Maria Oliveira', date:'2023-10-24', type:'Médica', justified:true, document:'atestado_24out.pdf', financialImpact:0, status:'Registrada', dsrImpact:0 },
  { id:'2', employeeId:'4', employeeName:'Pedro Costa', date:'2023-10-15', type:'Pessoal', justified:false, financialImpact:981.81, status:'Registrada', dsrImpact:196.36 },
  { id:'3', employeeId:'2', employeeName:'João Santos', date:'2023-10-10', type:'Pessoal', justified:true, document:'comprovante.pdf', financialImpact:0, status:'Pendente Documentação', dsrImpact:0 },
  { id:'4', employeeId:'5', employeeName:'Lucas Pereira', date:'2023-10-05', type:'Pessoal', justified:false, financialImpact:204.54, status:'Registrada', dsrImpact:40.90 },
  { id:'5', employeeId:'3', employeeName:'Maria Oliveira', date:'2023-09-28', type:'Médica', justified:true, document:'atestado_28set.pdf', financialImpact:0, status:'Registrada', dsrImpact:0 },
];

const changeRequests: ChangeRequest[] = [
  { id:'1', employeeId:'1', employeeName:'Ana Silva', date:'2023-10-24', originalIn:'09:00', originalOut:'--:--', requestedIn:'09:00', requestedOut:'18:30', reason:'Esqueci de registrar saída — reunião externa', evidence:'email_cliente.pdf', status:'Pendente', requestedAt:'2023-10-25 08:30' },
  { id:'2', employeeId:'2', employeeName:'João Santos', date:'2023-10-20', originalIn:'--:--', originalOut:'18:00', requestedIn:'09:30', requestedOut:'18:00', reason:'Biométrico com falha técnica', evidence:'chamado_ti_4521.pdf', status:'Aprovado', requestedAt:'2023-10-21 09:00' },
  { id:'3', employeeId:'5', employeeName:'Lucas Pereira', date:'2023-10-18', originalIn:'08:15', originalOut:'17:00', requestedIn:'08:00', requestedOut:'17:00', reason:'Atraso por acidente no trânsito (Linha 2 metro)', evidence:'foto_transito.jpg', status:'Rejeitado', requestedAt:'2023-10-19 07:45' },
  { id:'4', employeeId:'3', employeeName:'Maria Oliveira', date:'2023-10-17', originalIn:'', originalOut:'', requestedIn:'13:00', requestedOut:'17:00', reason:'Trabalho externo — visita ao fornecedor', evidence:'nota_visita.pdf', status:'Pendente', requestedAt:'2023-10-18 10:00' },
];

const schedules: Schedule[] = [
  { id:'1', name:'Comercial 9-18', type:'5x2', employees:['João Santos','Maria Oliveira'],
    shifts:[
      {day:'Segunda',checkIn:'09:00',checkOut:'18:00',active:true},
      {day:'Terça',checkIn:'09:00',checkOut:'18:00',active:true},
      {day:'Quarta',checkIn:'09:00',checkOut:'18:00',active:true},
      {day:'Quinta',checkIn:'09:00',checkOut:'18:00',active:true},
      {day:'Sexta',checkIn:'09:00',checkOut:'18:00',active:true},
      {day:'Sábado',checkIn:'',checkOut:'',active:false},
      {day:'Domingo',checkIn:'',checkOut:'',active:false},
    ]},
  { id:'2', name:'TI Flexível 8-17', type:'5x2', employees:['Ana Silva','Lucas Pereira'],
    shifts:[
      {day:'Segunda',checkIn:'08:00',checkOut:'17:00',active:true},
      {day:'Terça',checkIn:'08:00',checkOut:'17:00',active:true},
      {day:'Quarta',checkIn:'08:00',checkOut:'17:00',active:true},
      {day:'Quinta',checkIn:'08:00',checkOut:'17:00',active:true},
      {day:'Sexta',checkIn:'08:00',checkOut:'17:00',active:true},
      {day:'Sábado',checkIn:'',checkOut:'',active:false},
      {day:'Domingo',checkIn:'',checkOut:'',active:false},
    ]},
  { id:'3', name:'Operações 12x36', type:'12x36', employees:['Pedro Costa'],
    shifts:[
      {day:'Segunda',checkIn:'07:00',checkOut:'19:00',active:true},
      {day:'Terça',checkIn:'',checkOut:'',active:false},
      {day:'Quarta',checkIn:'07:00',checkOut:'19:00',active:true},
      {day:'Quinta',checkIn:'',checkOut:'',active:false},
      {day:'Sexta',checkIn:'07:00',checkOut:'19:00',active:true},
      {day:'Sábado',checkIn:'',checkOut:'',active:false},
      {day:'Domingo',checkIn:'',checkOut:'',active:false},
    ]},
];

const alertConfigs: AlertConfig[] = [
  { id:'1', type:'Atraso Recorrente', threshold:3, unit:'vezes/mês', severity:'Média', recipient:'Gestor Direto', action:'Criar Anotação', active:true },
  { id:'2', type:'Falta Injustificada', threshold:1, unit:'por ocorrência', severity:'Alta', recipient:'RH + Gestor', action:'Notificação + Anotação', active:true },
  { id:'3', type:'HE Não Autorizada', threshold:1, unit:'por ocorrência', severity:'Alta', recipient:'Gestor Direto', action:'Bloquear e Notificar', active:true },
  { id:'4', type:'Jornada Excedente', threshold:10, unit:'horas/dia', severity:'Média', recipient:'RH', action:'Notificação', active:false },
  { id:'5', type:'Intervalo Irregular', threshold:5, unit:'min variação', severity:'Baixa', recipient:'Gestor Direto', action:'Notificação', active:true },
  { id:'6', type:'Saída Antecipada', threshold:30, unit:'min antes do fim', severity:'Baixa', recipient:'Gestor Direto', action:'Registrar Ocorrência', active:false },
];

// ---- Helper Components ----
function TabButton({ id, label, active, onClick, badge }: {
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

// ============================================================
// ABA 1 — ESPELHO DE PONTO
// ============================================================
function MirrorTab() {
  const [selectedEmployee, setSelectedEmployee] = useState('Todos');
  const [selectedMonth, setSelectedMonth] = useState('2023-10');
  const employees = ['Todos', 'Ana Silva', 'João Santos', 'Maria Oliveira', 'Pedro Costa', 'Lucas Pereira'];

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
            {employees.map(e => <option key={e}>{e}</option>)}
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

// ============================================================
// ABA 2 — HORAS EXTRAS
// ============================================================
function OvertimeTab() {
  const [filter, setFilter] = useState<ApprovalStatus | 'Todos'>('Todos');
  const [selected, setSelected] = useState<string[]>([]);
  const [localOT, setLocalOT] = useState(overtimes);

  const filtered = filter === 'Todos' ? localOT : localOT.filter(o => o.approvalStatus === filter);

  const approve = (id: string) => setLocalOT(prev => prev.map(o => o.id === id ? { ...o, approvalStatus: 'Aprovado' as ApprovalStatus } : o));
  const reject  = (id: string) => setLocalOT(prev => prev.map(o => o.id === id ? { ...o, approvalStatus: 'Rejeitado' as ApprovalStatus } : o));

  const approveAll = () => {
    const ids = filtered.filter(o => o.approvalStatus === 'Pendente').map(o => o.id);
    setLocalOT(prev => prev.map(o => ids.includes(o.id) ? { ...o, approvalStatus: 'Aprovado' as ApprovalStatus } : o));
    setSelected([]);
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

// ============================================================
// ABA 3 — AUTORIZAÇÕES PENDENTES
// ============================================================
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

// ============================================================
// ABA 4 — SOLICITAÇÕES DE ALTERAÇÕES (inclui histórico 1.2.1.4)
// ============================================================
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

// ============================================================
// ABA 5 — AUSÊNCIAS JUSTIFICADAS
// ============================================================
function JustifiedAbsencesTab() {
  const [localAbs, setLocalAbs] = useState(absences.filter(a => a.justified));
  const [showForm, setShowForm] = useState(false);
  const [newAbs, setNewAbs] = useState({ employee: '', date: '', type: 'Médica' as AbsenceType, document: '' });

  const addAbsence = () => {
    if (!newAbs.employee || !newAbs.date) return;
    setLocalAbs(prev => [...prev, {
      id: String(Date.now()), employeeId: '0', employeeName: newAbs.employee,
      date: newAbs.date, type: newAbs.type, justified: true,
      document: newAbs.document, financialImpact: 0, dsrImpact: 0, status: 'Registrada'
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
                {['Ana Silva','João Santos','Maria Oliveira','Pedro Costa','Lucas Pereira'].map(n => <option key={n}>{n}</option>)}
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

// ============================================================
// ABA 6 — AUSÊNCIAS NÃO JUSTIFICADAS
// ============================================================
function UnjustifiedAbsencesTab() {
  const unjustified = absences.filter(a => !a.justified);
  const totalImpact = unjustified.reduce((a, b) => a + b.financialImpact, 0);
  const totalDsr    = unjustified.reduce((a, b) => a + b.dsrImpact, 0);

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
                <td className="p-3 text-sm font-mono text-orange-600">-R$ {ab.dsrImpact.toFixed(2)}</td>
                <td className="p-3 text-sm font-bold text-red-700">-R$ {(ab.financialImpact + ab.dsrImpact).toFixed(2)}</td>
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

// ============================================================
// ABA 7 — ALERTAS DE PONTO
// ============================================================
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

// ============================================================
// ABA 8 — ESCALAS PRÉ-PROGRAMADAS
// ============================================================
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
// Exportar e usar no switch do HRModule:
// case 'timesheet': return <TimesheetSection onNavigate={setActiveSection} />;
// ============================================================
export function TimesheetSection({ onNavigate: _onNavigate }: { onNavigate: (s: string) => void }) {
  const [activeTab, setActiveTab] = useState<TimesheetTab>('mirror');
  const { config } = useAppContext();

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
// PARTE 3 — MÉTRICAS DE FUNCIONÁRIO + FOLHA DE PAGAMENTO
// Instrução de integração no final do arquivo
// ============================================================

import { useState, useMemo } from 'react';
import {
  Users, DollarSign, TrendingUp, TrendingDown,
  AlertTriangle, Download, Plus, X, Search,
  CheckCircle, BarChart3, Sparkles,
  ArrowUpRight, ArrowDownRight, Calendar,
  CreditCard, Shield, Activity, Zap, Eye, FileText
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

// ---- Shared Types ----
type ContractType = 'CLT' | 'PJ' | 'Temporário' | 'Estágio';
type WorkRegime = 'Horário Fixo' | 'Escala' | 'Banco de Horas';
type EmployeeStatus = 'Ativo' | 'Inativo' | 'Afastado' | 'Férias';

interface Employee {
  id: string; name: string; role: string; department: string;
  manager: string; contractType: ContractType; workRegime: WorkRegime;
  status: EmployeeStatus; admissionDate: string; salary: number;
  email: string; cpf: string; accessLevel: string; payrollGroup: string;
  benefits: string[]; hourBankBalance: number; vacationDays: number; warnings: number;
}

// ---- Mock Employees ----
const employees: Employee[] = [
  { id:'1', name:'Ana Silva', role:'Desenvolvedora Senior', department:'TI', manager:'Carlos Souza', contractType:'CLT', workRegime:'Horário Fixo', status:'Ativo', admissionDate:'2022-03-10', salary:12500, email:'ana.silva@empresa.com', cpf:'123.456.789-00', accessLevel:'Admin', payrollGroup:'Mensalistas', benefits:['VT','VR','Plano de Saúde'], hourBankBalance:8.5, vacationDays:30, warnings:0 },
  { id:'2', name:'João Santos', role:'Analista de Marketing', department:'Marketing', manager:'Fernanda Lima', contractType:'PJ', workRegime:'Horário Fixo', status:'Ativo', admissionDate:'2023-01-15', salary:8000, email:'joao.santos@empresa.com', cpf:'234.567.890-11', accessLevel:'User', payrollGroup:'Mensalistas', benefits:['VR','Plano de Saúde'], hourBankBalance:0, vacationDays:15, warnings:1 },
  { id:'3', name:'Maria Oliveira', role:'Assistente RH', department:'RH', manager:'Roberto Costa', contractType:'Estágio', workRegime:'Horário Fixo', status:'Férias', admissionDate:'2023-06-01', salary:1500, email:'maria.oliveira@empresa.com', cpf:'345.678.901-22', accessLevel:'User', payrollGroup:'Estagiários', benefits:['VT'], hourBankBalance:0, vacationDays:10, warnings:0 },
  { id:'4', name:'Pedro Costa', role:'Gerente Comercial', department:'Comercial', manager:'Diretoria', contractType:'CLT', workRegime:'Banco de Horas', status:'Afastado', admissionDate:'2021-11-20', salary:18000, email:'pedro.costa@empresa.com', cpf:'456.789.012-33', accessLevel:'Manager', payrollGroup:'Gestores', benefits:['VT','VR','Plano de Saúde','Odonto','Previdência'], hourBankBalance:24, vacationDays:30, warnings:2 },
  { id:'5', name:'Lucas Pereira', role:'Suporte Técnico', department:'TI', manager:'Ana Silva', contractType:'CLT', workRegime:'Escala', status:'Ativo', admissionDate:'2023-08-05', salary:4500, email:'lucas.pereira@empresa.com', cpf:'567.890.123-44', accessLevel:'User', payrollGroup:'Mensalistas', benefits:['VT','VR'], hourBankBalance:-2, vacationDays:5, warnings:1 },
];

// ---- Payroll Groups ----
interface PayrollGroup {
  id: string; name: string; period: string; paymentDate: string;
  employeeCount: number; totalGross: number; totalDeductions: number;
  totalNet: number; status: 'Aberta' | 'Em Processamento' | 'Fechada' | 'Paga';
}

const payrollGroups: PayrollGroup[] = [
  { id:'1', name:'Mensalistas — Out/23', period:'01/10/2023 – 31/10/2023', paymentDate:'05/11/2023', employeeCount:45, totalGross:350000, totalDeductions:85000, totalNet:265000, status:'Em Processamento' },
  { id:'2', name:'Mensalistas — Set/23', period:'01/09/2023 – 30/09/2023', paymentDate:'05/10/2023', employeeCount:44, totalGross:342000, totalDeductions:82000, totalNet:260000, status:'Paga' },
  { id:'3', name:'13º Salário — 1ª Parcela', period:'2023', paymentDate:'30/11/2023', employeeCount:45, totalGross:175000, totalDeductions:0, totalNet:175000, status:'Aberta' },
  { id:'4', name:'Estagiários — Out/23', period:'01/10/2023 – 31/10/2023', paymentDate:'10/11/2023', employeeCount:8, totalGross:18000, totalDeductions:1200, totalNet:16800, status:'Aberta' },
];

// ---- Metric Helpers ----
interface DeptMetric {
  dept: string;
  headcount: number;
  avgHours: number;
  absenceRate: number;
  otHours: number;
  productivity: number;
}

const deptMetrics: DeptMetric[] = [
  { dept:'TI',         headcount:85,  avgHours:168, absenceRate:1.2, otHours:420, productivity:91 },
  { dept:'Comercial',  headcount:150, avgHours:172, absenceRate:2.8, otHours:180, productivity:78 },
  { dept:'Marketing',  headcount:32,  avgHours:165, absenceRate:1.8, otHours:60,  productivity:84 },
  { dept:'RH',         headcount:18,  avgHours:164, absenceRate:1.0, otHours:15,  productivity:88 },
  { dept:'Financeiro', headcount:25,  avgHours:166, absenceRate:0.8, otHours:40,  productivity:92 },
];

interface EmployeeHistory {
  month: string;
  salary: number;
  hoursWorked: number;
  overtimeHours: number;
  absences: number;
  productivity: number;
}

const getHistory = (empId: string): EmployeeHistory[] => {
  const base = employees.find(e => e.id === empId)?.salary ?? 5000;
  return [
    { month:'Mai/23', salary: base * 0.9,  hoursWorked:168, overtimeHours:2, absences:0, productivity:82 },
    { month:'Jun/23', salary: base * 0.92, hoursWorked:160, overtimeHours:0, absences:1, productivity:79 },
    { month:'Jul/23', salary: base * 0.92, hoursWorked:172, overtimeHours:4, absences:0, productivity:85 },
    { month:'Ago/23', salary: base * 0.95, hoursWorked:168, overtimeHours:2, absences:0, productivity:88 },
    { month:'Set/23', salary: base,        hoursWorked:165, overtimeHours:1, absences:0, productivity:86 },
    { month:'Out/23', salary: base,        hoursWorked:170, overtimeHours:5, absences:0, productivity:91 },
  ];
};

// ============================================================
// SHARED COMPONENTS
// ============================================================
function ZIACard({ insights }: { insights: string[] }) {
  return (
    <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-4 text-white shadow-lg">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-violet-200" />
        <span className="font-bold text-sm">ZIA — Insights Automáticos</span>
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
export function EmployeeMetricsSection({ onNavigate: _onNavigate }: { onNavigate: (s: string) => void }) {
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
  const [activeTab, setActiveTab] = useState<PayslipTab>('proventos');
  const { config } = useAppContext();

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
export function PayrollSection({ onNavigate: _onNavigate }: { onNavigate: (s: string) => void }) {
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
// INSTRUÇÕES DE INTEGRAÇÃO
// ============================================================
//
// 1. Adicionar os seguintes imports no topo do HRModule_part1.tsx:
//    import { EmployeeMetricsSection } from './HRModule_part3';
//    import { PayrollSection } from './HRModule_part3';
//    OU copiar as funções exportadas diretamente no arquivo único.
//
// 2. No switch do renderSection(), substituir:
//    case 'employee-metrics':
//      return <EmployeeMetricsSection onNavigate={setActiveSection} />;
//    case 'payroll':
//      return <PayrollSection onNavigate={setActiveSection} />;
//
// 3. Garantir que os seguintes imports do lucide-react estejam presentes
//    no topo do arquivo principal:
//    DollarSign, TrendingUp, TrendingDown, BarChart3, Activity,
//    ArrowUpRight, ArrowDownRight, Eye, CreditCard, Shield,
//    FileText, Zap (já estão na Parte 1)
//
// ============================================================
// ============================================================
// PARTE 4 — GRUPOS DE FUNCIONÁRIOS + FALTAS + FOLGAS +
//            BANCO DE HORAS + FÉRIAS
// ============================================================
// Integração: no switch do renderSection() do HRModule principal,
// substituir os ComingSoonSection pelos componentes exportados:
//
// case 'employee-groups': return <EmployeeGroupsSection />;
// case 'absences':        return <AbsencesSection />;
// case 'planned-leaves':  return <PlannedLeavesSection />;
// case 'hourbank':        return <HourBankSection />;
// case 'vacations':       return <VacationsSection />;
// ============================================================

import { useState, useMemo } from 'react';
import {
  Users, Calendar, Clock, Briefcase, AlertTriangle,
  AlertCircle, Plus, X, Search, Download, CheckCircle,
  ChevronDown, TrendingUp, TrendingDown, Sparkles,
  Edit3, Trash2, UserPlus, Building, Activity,
  ArrowUpRight, Bell, Filter
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

// ============================================================
// TIPOS LOCAIS
// ============================================================
type EmployeeStatus = 'Ativo' | 'Inativo' | 'Afastado' | 'Férias';
type ContractType   = 'CLT' | 'PJ' | 'Temporário' | 'Estágio';
type WorkRegime     = 'Horário Fixo' | 'Escala' | 'Banco de Horas';
type AbsenceType    = 'Médica' | 'Pessoal' | 'Judicial' | 'Luto' | 'Maternidade';
type VacationStatus = 'Agendada' | 'Em Curso' | 'Concluída' | 'Vencendo' | 'Vencida';

interface Employee {
  id: string; name: string; role: string; department: string;
  manager: string; contractType: ContractType; workRegime: WorkRegime;
  status: EmployeeStatus; admissionDate: string; salary: number;
  hourBankBalance: number; vacationDays: number; warnings: number;
}

interface EmployeeGroup {
  id: string; name: string; description: string;
  criteria: string; members: string[]; color: string;
  createdAt: string; autoAssign: boolean;
}

interface AbsenceRecord {
  id: string; employeeId: string; employeeName: string;
  date: string; type: AbsenceType; justified: boolean;
  document?: string; financialImpact: number; dsrImpact: number;
  status: 'Registrada' | 'Pendente Documentação';
  department: string;
}

interface PlannedLeave {
  id: string; employeeId: string; employeeName: string;
  date: string; department: string; type: 'Folga Individual' | 'Feriado Setorial' | 'DSR';
  approved: boolean; approvedBy?: string; conflict: boolean;
}

interface HourBankEntry {
  id: string; employeeId: string; employeeName: string;
  department: string; balance: number; toReceive: number;
  toCompensate: number; expiresAt: string; lastMovement: string;
  status: 'Normal' | 'Excesso' | 'Negativo' | 'Vencendo';
}

interface VacationRecord {
  id: string; employeeId: string; employeeName: string;
  department: string; role: string;
  acquisitionStart: string; acquisitionEnd: string;
  availableDays: number; usedDays: number;
  scheduledStart?: string; scheduledEnd?: string;
  status: VacationStatus; salary: number;
}

// ============================================================
// MOCKS
// ============================================================
const employees: Employee[] = [
  { id:'1', name:'Ana Silva',     role:'Desenvolvedora Senior', department:'TI',       manager:'Carlos Souza',  contractType:'CLT',     workRegime:'Horário Fixo', status:'Ativo',    admissionDate:'2022-03-10', salary:12500, hourBankBalance:8.5,  vacationDays:30, warnings:0 },
  { id:'2', name:'João Santos',   role:'Analista de Marketing', department:'Marketing', manager:'Fernanda Lima', contractType:'PJ',      workRegime:'Horário Fixo', status:'Ativo',    admissionDate:'2023-01-15', salary:8000,  hourBankBalance:0,    vacationDays:15, warnings:1 },
  { id:'3', name:'Maria Oliveira',role:'Assistente RH',         department:'RH',        manager:'Roberto Costa', contractType:'Estágio', workRegime:'Horário Fixo', status:'Férias',   admissionDate:'2023-06-01', salary:1500,  hourBankBalance:0,    vacationDays:10, warnings:0 },
  { id:'4', name:'Pedro Costa',   role:'Gerente Comercial',     department:'Comercial', manager:'Diretoria',     contractType:'CLT',     workRegime:'Banco de Horas',status:'Afastado', admissionDate:'2021-11-20', salary:18000, hourBankBalance:24,  vacationDays:30, warnings:2 },
  { id:'5', name:'Lucas Pereira', role:'Suporte Técnico',       department:'TI',        manager:'Ana Silva',     contractType:'CLT',     workRegime:'Escala',       status:'Ativo',    admissionDate:'2023-08-05', salary:4500,  hourBankBalance:-2,  vacationDays:5,  warnings:1 },
];

const initGroups: EmployeeGroup[] = [
  { id:'1', name:'Equipe TI',      description:'Todos os colaboradores do setor de TI',         criteria:'Departamento = TI',            members:['1','5'],   color:'bg-blue-500',   createdAt:'2023-01-01', autoAssign:true  },
  { id:'2', name:'Gestores',       description:'Cargos com nível de acesso Manager ou superior', criteria:'Nível Acesso = Manager/Admin',  members:['1','4'],   color:'bg-purple-500', createdAt:'2023-01-01', autoAssign:true  },
  { id:'3', name:'CLT Full-time',  description:'Todos os contratados CLT em regime de HF',       criteria:'Contrato = CLT, Regime = HF',  members:['1'],       color:'bg-emerald-500',createdAt:'2023-03-01', autoAssign:true  },
  { id:'4', name:'Projeto Alpha',  description:'Time dedicado ao projeto Alpha Q4/23',            criteria:'Manual',                       members:['1','2','5'],color:'bg-amber-500',  createdAt:'2023-09-15', autoAssign:false },
];

const absenceRecords: AbsenceRecord[] = [
  { id:'1', employeeId:'3', employeeName:'Maria Oliveira', date:'2023-10-24', type:'Médica',   justified:true,  document:'atestado.pdf', financialImpact:0,      dsrImpact:0,    status:'Registrada',           department:'RH' },
  { id:'2', employeeId:'4', employeeName:'Pedro Costa',   date:'2023-10-15', type:'Pessoal',  justified:false, financialImpact:981.81, dsrImpact:196.36, status:'Registrada',           department:'Comercial' },
  { id:'3', employeeId:'2', employeeName:'João Santos',   date:'2023-10-10', type:'Pessoal',  justified:true,  document:'comp.pdf',     financialImpact:0,      dsrImpact:0,    status:'Pendente Documentação', department:'Marketing' },
  { id:'4', employeeId:'5', employeeName:'Lucas Pereira', date:'2023-10-05', type:'Pessoal',  justified:false, financialImpact:204.54, dsrImpact:40.90,  status:'Registrada',           department:'TI' },
  { id:'5', employeeId:'3', employeeName:'Maria Oliveira', date:'2023-09-28', type:'Médica',  justified:true,  document:'atestado2.pdf',financialImpact:0,      dsrImpact:0,    status:'Registrada',           department:'RH' },
  { id:'6', employeeId:'2', employeeName:'João Santos',   date:'2023-09-15', type:'Pessoal',  justified:false, financialImpact:400.00, dsrImpact:80.00,  status:'Registrada',           department:'Marketing' },
];

const plannedLeaves: PlannedLeave[] = [
  { id:'1', employeeId:'1', employeeName:'Ana Silva',     date:'2023-11-02', department:'TI',       type:'Folga Individual',  approved:true,  approvedBy:'Carlos Souza', conflict:false },
  { id:'2', employeeId:'5', employeeName:'Lucas Pereira', date:'2023-11-02', department:'TI',       type:'Folga Individual',  approved:true,  approvedBy:'Ana Silva',    conflict:true  },
  { id:'3', employeeId:'2', employeeName:'João Santos',   date:'2023-11-15', department:'Marketing',type:'Folga Individual',  approved:false, conflict:false },
  { id:'4', employeeId:'3', employeeName:'Maria Oliveira',date:'2023-11-20', department:'RH',       type:'DSR',               approved:true,  approvedBy:'Sistema',      conflict:false },
  { id:'5', employeeId:'4', employeeName:'Pedro Costa',   date:'2023-11-10', department:'Comercial',type:'Feriado Setorial',  approved:true,  approvedBy:'Sistema',      conflict:false },
];

const hourBankEntries: HourBankEntry[] = [
  { id:'1', employeeId:'1', employeeName:'Ana Silva',     department:'TI',       balance:8.5,  toReceive:8.5,  toCompensate:0,   expiresAt:'2024-03-10', lastMovement:'2023-10-26', status:'Normal'   },
  { id:'2', employeeId:'2', employeeName:'João Santos',   department:'Marketing', balance:0,    toReceive:0,    toCompensate:0,   expiresAt:'—',          lastMovement:'2023-10-01', status:'Normal'   },
  { id:'3', employeeId:'3', employeeName:'Maria Oliveira',department:'RH',       balance:0,    toReceive:0,    toCompensate:0,   expiresAt:'—',          lastMovement:'2023-09-30', status:'Normal'   },
  { id:'4', employeeId:'4', employeeName:'Pedro Costa',   department:'Comercial', balance:24,   toReceive:24,   toCompensate:0,   expiresAt:'2024-01-20', lastMovement:'2023-10-20', status:'Excesso'  },
  { id:'5', employeeId:'5', employeeName:'Lucas Pereira', department:'TI',       balance:-2,   toReceive:0,    toCompensate:2,   expiresAt:'—',          lastMovement:'2023-10-26', status:'Negativo' },
];

const vacationRecords: VacationRecord[] = [
  { id:'1', employeeId:'1', employeeName:'Ana Silva',     department:'TI',       role:'Desenvolvedora Senior', acquisitionStart:'2022-03-10', acquisitionEnd:'2023-03-09', availableDays:30, usedDays:0,  scheduledStart:'2024-01-08', scheduledEnd:'2024-01-28', status:'Agendada',  salary:12500 },
  { id:'2', employeeId:'2', employeeName:'João Santos',   department:'Marketing', role:'Analista de Marketing', acquisitionStart:'2023-01-15', acquisitionEnd:'2024-01-14', availableDays:15, usedDays:0,  status:'Agendada',  salary:8000 },
  { id:'3', employeeId:'3', employeeName:'Maria Oliveira',department:'RH',       role:'Assistente RH',         acquisitionStart:'2023-06-01', acquisitionEnd:'2024-05-31', availableDays:10, usedDays:10, scheduledStart:'2023-10-16', scheduledEnd:'2023-10-27', status:'Em Curso',  salary:1500 },
  { id:'4', employeeId:'4', employeeName:'Pedro Costa',   department:'Comercial', role:'Gerente Comercial',     acquisitionStart:'2021-11-20', acquisitionEnd:'2022-11-19', availableDays:30, usedDays:15, status:'Vencendo',  salary:18000 },
  { id:'5', employeeId:'5', employeeName:'Lucas Pereira', department:'TI',       role:'Suporte Técnico',       acquisitionStart:'2023-08-05', acquisitionEnd:'2024-08-04', availableDays:5,  usedDays:0,  status:'Agendada',  salary:4500 },
];

// ============================================================
// SHARED HELPERS
// ============================================================
function ZIABanner({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2.5 p-3.5 bg-violet-50 border border-violet-200 rounded-xl">
      <Sparkles className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
      <p className="text-sm text-violet-800">{text}</p>
    </div>
  );
}

function SectionHeader({ title, subtitle, action }: {
  title: string; subtitle: string;
  action?: { label: string; onClick: () => void; icon?: React.ElementType };
}) {
  const { config } = useAppContext();
  const pc = config.primaryColor;
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-xl font-black text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
      {action && (
        <button onClick={action.onClick}
          className={`flex items-center gap-2 px-4 py-2.5 bg-${pc}-600 text-white rounded-xl font-bold text-sm shadow-sm hover:bg-${pc}-700`}>
          {action.icon && <action.icon className="w-4 h-4" />}
          {action.label}
        </button>
      )}
    </div>
  );
}

function KPICard({ label, value, sub, color, icon: Icon }: {
  label: string; value: string; sub: string;
  color: string; icon: React.ElementType;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <p className="text-2xl font-black text-slate-900">{value}</p>
      <p className="text-xs font-bold text-slate-500 mt-0.5">{label}</p>
      <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>
    </div>
  );
}

function StatusPill({ status, map }: {
  status: string;
  map: Record<string, string>;
}) {
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${map[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  );
}

// ============================================================
// SEÇÃO 1 — GRUPOS DE FUNCIONÁRIOS
// ============================================================
export function EmployeeGroupsSection() {
  const [groups, setGroups] = useState(initGroups);
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<EmployeeGroup | null>(null);
  const [newGroup, setNewGroup] = useState({
    name: '', description: '', criteria: 'Manual', color: 'bg-indigo-500', autoAssign: false, members: [] as string[]
  });

  const colors = [
    'bg-indigo-500','bg-blue-500','bg-emerald-500','bg-violet-500',
    'bg-amber-500','bg-pink-500','bg-teal-500','bg-red-500',
  ];

  const toggleMember = (id: string) =>
    setNewGroup(p => ({
      ...p,
      members: p.members.includes(id) ? p.members.filter(m => m !== id) : [...p.members, id]
    }));

  const saveGroup = () => {
    if (!newGroup.name) return;
    setGroups(p => [...p, {
      id: String(Date.now()),
      name: newGroup.name,
      description: newGroup.description,
      criteria: newGroup.criteria,
      members: newGroup.members,
      color: newGroup.color,
      createdAt: new Date().toISOString().split('T')[0],
      autoAssign: newGroup.autoAssign,
    }]);
    setShowNew(false);
    setNewGroup({ name:'', description:'', criteria:'Manual', color:'bg-indigo-500', autoAssign:false, members:[] });
  };

  const deleteGroup = (id: string) => setGroups(p => p.filter(g => g.id !== id));

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Grupos de Funcionários"
        subtitle={`${groups.length} grupos cadastrados · Usados em folha, atividades, dashboards e automações`}
        action={{ label:'Novo Grupo', onClick:() => setShowNew(true), icon:Plus }}
      />

      <ZIABanner text="Grupos com autoAssign ativo atualizam membros automaticamente quando um funcionário atende aos critérios — sem necessidade de manutenção manual." />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {groups.map(g => (
          <div key={g.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <div className={`h-1.5 ${g.color}`} />
            <div className="p-5">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl ${g.color} flex items-center justify-center`}>
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-black text-slate-800 text-sm">{g.name}</p>
                    <p className="text-[10px] text-slate-400">{g.members.length} membros</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setSelected(g)} className="p-1.5 hover:bg-slate-100 rounded-lg">
                    <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                  <button onClick={() => deleteGroup(g.id)} className="p-1.5 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-3">{g.description}</p>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                  {g.criteria}
                </span>
                {g.autoAssign && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold">
                    Auto-assign
                  </span>
                )}
              </div>
              <div className="flex -space-x-2">
                {g.members.slice(0,5).map((mid, i) => {
                  const emp = employees.find(e => e.id === mid);
                  return emp ? (
                    <div key={i} title={emp.name}
                      className="w-7 h-7 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-[10px] font-black text-indigo-700">
                      {emp.name.split(' ').map(n=>n[0]).join('').substring(0,2)}
                    </div>
                  ) : null;
                })}
                {g.members.length > 5 && (
                  <div className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500">
                    +{g.members.length - 5}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* New group card */}
        <button onClick={() => setShowNew(true)}
          className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-6 text-slate-400 hover:border-indigo-300 hover:bg-indigo-50 transition-all min-h-48">
          <Plus className="w-8 h-8 mb-2" />
          <span className="font-bold text-sm">Novo Grupo</span>
        </button>
      </div>

      {/* New Group Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h3 className="font-black text-slate-800">Novo Grupo de Funcionários</h3>
              <button onClick={() => setShowNew(false)} className="p-2 hover:bg-slate-200 rounded-full">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nome do Grupo *</label>
                <input value={newGroup.name} onChange={e => setNewGroup(p=>({...p,name:e.target.value}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="Ex: Projeto Alpha" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Descrição</label>
                <input value={newGroup.description} onChange={e => setNewGroup(p=>({...p,description:e.target.value}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="Descreva o propósito deste grupo" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Critério de Formação</label>
                  <select value={newGroup.criteria} onChange={e => setNewGroup(p=>({...p,criteria:e.target.value}))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    {['Manual','Departamento','Cargo','Tipo de Contrato','Regime de Trabalho','Projeto','Localidade'].map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Cor</label>
                  <div className="flex gap-2 flex-wrap mt-1">
                    {colors.map(c => (
                      <button key={c} onClick={() => setNewGroup(p=>({...p,color:c}))}
                        className={`w-7 h-7 rounded-full ${c} transition-transform ${newGroup.color === c ? 'scale-125 ring-2 ring-offset-1 ring-slate-400' : 'hover:scale-110'}`} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <input type="checkbox" id="autoAssign" checked={newGroup.autoAssign}
                  onChange={e => setNewGroup(p=>({...p,autoAssign:e.target.checked}))}
                  className="w-4 h-4 rounded accent-indigo-600" />
                <label htmlFor="autoAssign" className="text-sm text-slate-700 cursor-pointer">
                  <span className="font-bold">Auto-assign</span> — novos funcionários que atendam ao critério entram automaticamente
                </label>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Membros Iniciais</label>
                <div className="space-y-2">
                  {employees.map(emp => (
                    <label key={emp.id} className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all
                      ${newGroup.members.includes(emp.id) ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-slate-200 hover:border-slate-300'}`}>
                      <input type="checkbox" checked={newGroup.members.includes(emp.id)}
                        onChange={() => toggleMember(emp.id)}
                        className="w-4 h-4 rounded accent-indigo-600" />
                      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-[10px] shrink-0">
                        {emp.name.split(' ').map(n=>n[0]).join('').substring(0,2)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{emp.name}</p>
                        <p className="text-xs text-slate-400">{emp.role} · {emp.department}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-3 shrink-0">
              <button onClick={() => setShowNew(false)} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 font-medium hover:bg-slate-50">Cancelar</button>
              <button onClick={saveGroup} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-sm">Criar Grupo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// SEÇÃO 2 — FALTAS E AUSÊNCIAS
// ============================================================
export function AbsencesSection() {
  const [filter, setFilter] = useState<'Todos'|'Justificada'|'Injustificada'>('Todos');
  const [deptFilter, setDeptFilter] = useState('Todos');
  const [showForm, setShowForm] = useState(false);
  const [records, setRecords] = useState(absenceRecords);
  const [newAbs, setNewAbs] = useState({ employee:'', date:'', type:'Pessoal' as AbsenceType, justified:false, document:'' });

  const depts = ['Todos', ...Array.from(new Set(absenceRecords.map(r => r.department)))];

  const filtered = records.filter(r => {
    const matchFilter = filter === 'Todos' || (filter === 'Justificada' ? r.justified : !r.justified);
    const matchDept = deptFilter === 'Todos' || r.department === deptFilter;
    return matchFilter && matchDept;
  });

  const totalImpact = records.filter(r => !r.justified).reduce((a, r) => a + r.financialImpact + r.dsrImpact, 0);
  const byDept = useMemo(() => {
    const map: Record<string,{total:number;unjust:number}> = {};
    records.forEach(r => {
      if (!map[r.department]) map[r.department] = { total:0, unjust:0 };
      map[r.department].total++;
      if (!r.justified) map[r.department].unjust++;
    });
    return Object.entries(map).map(([dept,v]) => ({ dept, ...v, rate: Math.round(v.unjust/v.total*100) }));
  }, [records]);

  const addAbsence = () => {
    const emp = employees.find(e => e.name === newAbs.employee);
    if (!emp || !newAbs.date) return;
    const impact = newAbs.justified ? 0 : emp.salary / 22;
    setRecords(p => [...p, {
      id: String(Date.now()), employeeId: emp.id,
      employeeName: emp.name, date: newAbs.date, type: newAbs.type,
      justified: newAbs.justified, document: newAbs.document || undefined,
      financialImpact: impact, dsrImpact: impact * 0.2,
      status: newAbs.justified && !newAbs.document ? 'Pendente Documentação' : 'Registrada',
      department: emp.department,
    }]);
    setShowForm(false);
    setNewAbs({ employee:'', date:'', type:'Pessoal', justified:false, document:'' });
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Faltas e Ausências"
        subtitle="Visão consolidada com impacto financeiro e indicadores de absenteísmo"
        action={{ label:'Registrar Ausência', onClick:() => setShowForm(true), icon:Plus }}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total de Ausências"  value={records.length.toString()}                                                icon={AlertCircle}  color="bg-slate-500"   sub="No período" />
        <KPICard label="Injustificadas"       value={records.filter(r=>!r.justified).length.toString()}                       icon={AlertTriangle} color="bg-red-500"    sub={`R$ ${totalImpact.toFixed(0)} em desconto`} />
        <KPICard label="Justificadas"         value={records.filter(r=>r.justified).length.toString()}                        icon={CheckCircle}   color="bg-emerald-500" sub="Sem impacto financeiro" />
        <KPICard label="Pendentes Doc."       value={records.filter(r=>r.status==='Pendente Documentação').length.toString()}  icon={Bell}          color="bg-amber-500"   sub="Aguardam comprovante" />
      </div>

      {/* Dept breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-bold text-slate-800 text-sm mb-4">Absenteísmo por Departamento</h3>
          <div className="space-y-3">
            {byDept.map((d, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-600 w-24">{d.dept}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-2">
                  <div className={`h-2 rounded-full ${d.rate > 50 ? 'bg-red-500' : d.rate > 30 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, d.rate * 2)}%` }} />
                </div>
                <span className="text-xs text-slate-500 w-24">{d.unjust}/{d.total} injust.</span>
                <span className={`text-xs font-black w-10 text-right ${d.rate > 50 ? 'text-red-600' : d.rate > 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {d.rate}%
                </span>
              </div>
            ))}
          </div>
        </div>
        <ZIABanner text={`João Santos tem 2 faltas injustificadas nos últimos 45 dias — padrão recorrente às sextas-feiras. Recomendo conversa com gestor e verificação de engajamento.`} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex border border-slate-200 rounded-xl overflow-hidden bg-white">
          {(['Todos','Justificada','Injustificada'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 text-xs font-bold transition-colors
                ${filter === f ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
              {f}
            </button>
          ))}
        </div>
        <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-600 focus:outline-none">
          {depts.map(d => <option key={d}>{d}</option>)}
        </select>
        <div className="flex-1" />
        <button className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 hover:bg-slate-50">
          <Download className="w-3.5 h-3.5" /> Exportar DP
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              {['Colaborador','Depto','Data','Tipo','Justificativa','Desconto','DSR','Status'].map(h => (
                <th key={h} className="p-3 text-[10px] font-bold text-slate-400 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(r => (
              <tr key={r.id} className={`hover:bg-slate-50 transition-colors ${!r.justified ? 'bg-red-50/20' : ''}`}>
                <td className="p-3 text-sm font-medium text-slate-800">{r.employeeName}</td>
                <td className="p-3 text-xs text-slate-500">{r.department}</td>
                <td className="p-3 text-sm text-slate-600">{new Date(r.date).toLocaleDateString('pt-BR')}</td>
                <td className="p-3">
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">{r.type}</span>
                </td>
                <td className="p-3">
                  {r.justified
                    ? <span className="flex items-center gap-1 text-xs text-emerald-600 font-bold"><CheckCircle className="w-3 h-3" /> Justificada</span>
                    : <span className="flex items-center gap-1 text-xs text-red-600 font-bold"><X className="w-3 h-3" /> Injustificada</span>}
                </td>
                <td className="p-3 font-mono text-sm">
                  {r.financialImpact > 0
                    ? <span className="text-red-600 font-bold">-R$ {r.financialImpact.toFixed(2)}</span>
                    : <span className="text-slate-300">—</span>}
                </td>
                <td className="p-3 font-mono text-sm">
                  {r.dsrImpact > 0
                    ? <span className="text-orange-500 font-bold">-R$ {r.dsrImpact.toFixed(2)}</span>
                    : <span className="text-slate-300">—</span>}
                </td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold
                    ${r.status === 'Registrada' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-8 text-center text-slate-400">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="font-medium">Nenhuma ausência encontrada com este filtro</p>
          </div>
        )}
      </div>

      {/* Register modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Registrar Ausência</h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-200 rounded-full"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Funcionário *</label>
                <select value={newAbs.employee} onChange={e => setNewAbs(p=>({...p,employee:e.target.value}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  <option value="">Selecionar...</option>
                  {employees.map(e=><option key={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Data *</label>
                  <input type="date" value={newAbs.date} onChange={e => setNewAbs(p=>({...p,date:e.target.value}))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tipo</label>
                  <select value={newAbs.type} onChange={e => setNewAbs(p=>({...p,type:e.target.value as AbsenceType}))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    {(['Médica','Pessoal','Judicial','Luto','Maternidade'] as AbsenceType[]).map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <input type="checkbox" id="just" checked={newAbs.justified}
                  onChange={e => setNewAbs(p=>({...p,justified:e.target.checked}))}
                  className="w-4 h-4 rounded accent-indigo-600" />
                <label htmlFor="just" className="text-sm text-slate-700 cursor-pointer font-medium">Ausência justificada</label>
              </div>
              {newAbs.justified && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Documento comprobatório</label>
                  <input value={newAbs.document} onChange={e => setNewAbs(p=>({...p,document:e.target.value}))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    placeholder="atestado.pdf" />
                </div>
              )}
              {newAbs.employee && !newAbs.justified && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-xs text-red-700 font-medium">
                    Desconto estimado: <strong>R$ {(employees.find(e=>e.name===newAbs.employee)?.salary ?? 0 / 22).toFixed(2)}</strong> + reflexo no DSR
                  </p>
                </div>
              )}
            </div>
            <div className="px-5 pb-5 flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 font-medium hover:bg-slate-50">Cancelar</button>
              <button onClick={addAbsence} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-sm">Registrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// SEÇÃO 3 — FOLGAS PLANEJADAS
// ============================================================
export function PlannedLeavesSection() {
  const [leaves, setLeaves] = useState(plannedLeaves);
  const [viewMonth, setViewMonth] = useState('2023-11');
  const [showForm, setShowForm] = useState(false);
  const [newLeave, setNewLeave] = useState({ employee:'', date:'', type:'Folga Individual' as PlannedLeave['type'] });

  const conflicts = leaves.filter(l => l.conflict);

  const daysInMonth = () => {
    const [y, m] = viewMonth.split('-').map(Number);
    return new Date(y, m, 0).getDate();
  };

  const getLeavesForDay = (day: number) => {
    const dateStr = `${viewMonth}-${String(day).padStart(2,'0')}`;
    return leaves.filter(l => l.date === dateStr);
  };

  const addLeave = () => {
    const emp = employees.find(e => e.name === newLeave.employee);
    if (!emp || !newLeave.date) return;
    // conflict detection: same dept, same date, already exists
    const sameDaySameDept = leaves.filter(l => l.date === newLeave.date && l.department === emp.department);
    const isConflict = sameDaySameDept.length >= 2;
    setLeaves(p => [...p, {
      id: String(Date.now()), employeeId: emp.id,
      employeeName: emp.name, date: newLeave.date,
      department: emp.department, type: newLeave.type,
      approved: false, conflict: isConflict,
    }]);
    setShowForm(false);
    setNewLeave({ employee:'', date:'', type:'Folga Individual' });
  };

  const approve = (id: string) => setLeaves(p => p.map(l => l.id === id ? { ...l, approved: true, approvedBy: 'Gestor' } : l));
  const remove  = (id: string) => setLeaves(p => p.filter(l => l.id !== id));

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Folgas Planejadas"
        subtitle="Calendário de folgas com detecção automática de conflitos de cobertura"
        action={{ label:'Agendar Folga', onClick:() => setShowForm(true), icon:Plus }}
      />

      {conflicts.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-800 text-sm">Conflito de Cobertura Detectado pela ZIA</p>
            <p className="text-sm text-red-700 mt-0.5">
              {conflicts.length} folga(s) conflitam com cobertura mínima de setor. Em 02/11, TI tem 2 colaboradores folhando simultaneamente.
            </p>
            <button className="text-xs text-red-700 font-bold underline mt-1">Ver redistribuição sugerida →</button>
          </div>
        </div>
      )}

      {/* Calendar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">Calendário de Folgas</h3>
          <input type="month" value={viewMonth} onChange={e => setViewMonth(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
        </div>
        <div className="grid grid-cols-7 gap-px bg-slate-100 text-xs">
          {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
            <div key={d} className="bg-slate-50 p-2 text-center font-bold text-slate-400">{d}</div>
          ))}
          {/* Empty cells before first day */}
          {Array.from({ length: new Date(`${viewMonth}-01`).getDay() }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-white p-2 min-h-16" />
          ))}
          {Array.from({ length: daysInMonth() }, (_, i) => i + 1).map(day => {
            const dayLeaves = getLeavesForDay(day);
            const hasConflict = dayLeaves.some(l => l.conflict);
            return (
              <div key={day} className={`bg-white p-2 min-h-16 border-t border-slate-50 ${hasConflict ? 'bg-red-50/30' : ''}`}>
                <span className={`text-xs font-bold ${hasConflict ? 'text-red-600' : 'text-slate-600'}`}>{day}</span>
                <div className="mt-1 space-y-0.5">
                  {dayLeaves.slice(0,3).map((l, i) => (
                    <div key={i} className={`text-[9px] px-1.5 py-0.5 rounded font-bold truncate
                      ${l.conflict ? 'bg-red-200 text-red-700' : l.approved ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {l.employeeName.split(' ')[0]}
                    </div>
                  ))}
                  {dayLeaves.length > 3 && <div className="text-[9px] text-slate-400">+{dayLeaves.length-3}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-sm">Solicitações de Folga</h3>
        </div>
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              {['Colaborador','Departamento','Data','Tipo','Conflito','Aprovação','Ações'].map(h => (
                <th key={h} className="p-3 text-[10px] font-bold text-slate-400 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {leaves.map(l => (
              <tr key={l.id} className={`hover:bg-slate-50 ${l.conflict ? 'bg-red-50/20' : ''}`}>
                <td className="p-3 text-sm font-medium text-slate-800">{l.employeeName}</td>
                <td className="p-3 text-xs text-slate-500">{l.department}</td>
                <td className="p-3 text-sm text-slate-600">{new Date(l.date).toLocaleDateString('pt-BR')}</td>
                <td className="p-3">
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">{l.type}</span>
                </td>
                <td className="p-3">
                  {l.conflict
                    ? <span className="flex items-center gap-1 text-xs text-red-600 font-bold"><AlertTriangle className="w-3 h-3" /> Conflito</span>
                    : <span className="text-xs text-emerald-600 font-bold">OK</span>}
                </td>
                <td className="p-3">
                  {l.approved
                    ? <span className="text-xs text-emerald-600 font-bold">Aprovada por {l.approvedBy}</span>
                    : <span className="text-xs text-amber-600 font-bold">Pendente</span>}
                </td>
                <td className="p-3">
                  <div className="flex gap-1">
                    {!l.approved && (
                      <button onClick={() => approve(l.id)}
                        className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-bold hover:bg-emerald-200">
                        Aprovar
                      </button>
                    )}
                    <button onClick={() => remove(l.id)}
                      className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs font-bold hover:bg-red-200">
                      Remover
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Agendar Folga</h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-200 rounded-full"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Funcionário *</label>
                <select value={newLeave.employee} onChange={e => setNewLeave(p=>({...p,employee:e.target.value}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  <option value="">Selecionar...</option>
                  {employees.map(e=><option key={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Data *</label>
                  <input type="date" value={newLeave.date} onChange={e => setNewLeave(p=>({...p,date:e.target.value}))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tipo</label>
                  <select value={newLeave.type} onChange={e => setNewLeave(p=>({...p,type:e.target.value as PlannedLeave['type']}))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    {['Folga Individual','Feriado Setorial','DSR'].map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="px-5 pb-5 flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 font-medium hover:bg-slate-50">Cancelar</button>
              <button onClick={addLeave} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-sm">Agendar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// SEÇÃO 4 — BANCO DE HORAS
// ============================================================
export function HourBankSection() {
  const [entries, setEntries] = useState(hourBankEntries);
  const [filter, setFilter] = useState<'Todos'|'Excesso'|'Negativo'|'Vencendo'>('Todos');
  const [selected, setSelected] = useState<HourBankEntry | null>(null);
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustForm, setAdjustForm] = useState({ employeeId:'', hours:'', type:'crédito', reason:'' });

  const filtered = filter === 'Todos' ? entries : entries.filter(e => e.status === filter);

  const totalBalance  = entries.reduce((a, e) => a + e.balance, 0);
  const excessCount   = entries.filter(e => e.status === 'Excesso').length;
  const negativeCount = entries.filter(e => e.status === 'Negativo').length;
  const expiringCount = entries.filter(e => e.status === 'Vencendo').length;

  const applyAdjust = () => {
    const hrs = parseFloat(adjustForm.hours) || 0;
    const delta = adjustForm.type === 'crédito' ? hrs : -hrs;
    setEntries(p => p.map(e => {
      if (e.employeeId !== adjustForm.employeeId) return e;
      const newBal = e.balance + delta;
      const status: HourBankEntry['status'] =
        newBal < 0 ? 'Negativo' : newBal > 20 ? 'Excesso' : 'Normal';
      return { ...e, balance: newBal, status, lastMovement: new Date().toISOString().split('T')[0] };
    }));
    setShowAdjust(false);
    setAdjustForm({ employeeId:'', hours:'', type:'crédito', reason:'' });
  };

  const statusStyle: Record<HourBankEntry['status'], string> = {
    Normal:   'bg-slate-100 text-slate-600',
    Excesso:  'bg-amber-100 text-amber-700',
    Negativo: 'bg-red-100 text-red-700',
    Vencendo: 'bg-orange-100 text-orange-700',
  };

  const movements = (empId: string) => [
    { date:'26/10', desc:'HE Autorizada — Deploy',  type:'crédito', hours:+1 },
    { date:'15/10', desc:'Compensação aprovada',     type:'débito',  hours:-2 },
    { date:'10/10', desc:'HE Autorizada — Migração', type:'crédito', hours:+3 },
  ].filter(() => empId);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900">Banco de Horas</h2>
          <p className="text-sm text-slate-500">Controle de saldo, movimentações e expiração por funcionário</p>
        </div>
        <button onClick={() => setShowAdjust(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-sm hover:bg-indigo-700">
          <Plus className="w-4 h-4" /> Lançar Ajuste
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Saldo Total Empresa"  value={`${totalBalance}h`}       icon={Clock}         color="bg-indigo-500"  sub="Horas acumuladas" />
        <KPICard label="Em Excesso (>20h)"    value={excessCount.toString()}    icon={AlertTriangle} color="bg-amber-500"   sub="Risco de burnout" />
        <KPICard label="Saldo Negativo"        value={negativeCount.toString()}  icon={TrendingDown}  color="bg-red-500"    sub="Desconto pendente" />
        <KPICard label="Vencendo em 60d"       value={expiringCount.toString()}  icon={Bell}          color="bg-orange-500" sub="Necessitam atenção" />
      </div>

      <ZIABanner text="Pedro Costa tem 24h acumuladas — acima do limite de 20h configurado. Recomendo agendar compensação antes de 20/01/2024 para evitar pagamento compulsório." />

      {/* Filter */}
      <div className="flex border border-slate-200 rounded-xl overflow-hidden bg-white w-fit">
        {(['Todos','Excesso','Negativo','Vencendo'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 text-xs font-bold transition-colors
              ${filter === f ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              {['Colaborador','Departamento','A Receber','A Compensar','Saldo','Expira em','Última Movim.','Status','Ações'].map(h => (
                <th key={h} className="p-3 text-[10px] font-bold text-slate-400 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(e => (
              <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-xs shrink-0">
                      {e.employeeName.split(' ').map(n=>n[0]).join('').substring(0,2)}
                    </div>
                    <span className="text-sm font-medium text-slate-800">{e.employeeName}</span>
                  </div>
                </td>
                <td className="p-3 text-xs text-slate-500">{e.department}</td>
                <td className="p-3 font-mono text-sm text-emerald-600 font-bold">
                  {e.toReceive > 0 ? `+${e.toReceive}h` : '—'}
                </td>
                <td className="p-3 font-mono text-sm text-red-500 font-bold">
                  {e.toCompensate > 0 ? `-${e.toCompensate}h` : '—'}
                </td>
                <td className="p-3">
                  <span className={`font-black font-mono text-sm ${e.balance < 0 ? 'text-red-600' : e.balance > 20 ? 'text-amber-600' : 'text-slate-800'}`}>
                    {e.balance > 0 ? '+' : ''}{e.balance}h
                  </span>
                </td>
                <td className="p-3 text-xs text-slate-500">{e.expiresAt}</td>
                <td className="p-3 text-xs text-slate-400">{new Date(e.lastMovement).toLocaleDateString('pt-BR')}</td>
                <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs font-bold ${statusStyle[e.status]}`}>{e.status}</span></td>
                <td className="p-3">
                  <button onClick={() => setSelected(e)}
                    className="flex items-center gap-1 text-xs text-indigo-600 font-bold hover:underline">
                    <ArrowUpRight className="w-3 h-3" /> Detalhar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800">Banco de Horas — {selected.employeeName}</h3>
                <p className="text-xs text-slate-500">Saldo atual: <strong className={selected.balance < 0 ? 'text-red-600' : 'text-emerald-600'}>{selected.balance > 0 ? '+' : ''}{selected.balance}h</strong></p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-slate-200 rounded-full"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5">
              <p className="text-xs font-bold text-slate-500 uppercase mb-3">Movimentações do Período</p>
              <div className="space-y-2">
                {movements(selected.employeeId).map((m, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${m.type === 'crédito' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      <div>
                        <p className="text-sm font-medium text-slate-700">{m.desc}</p>
                        <p className="text-xs text-slate-400">{m.date}</p>
                      </div>
                    </div>
                    <span className={`font-bold font-mono text-sm ${m.hours > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {m.hours > 0 ? '+' : ''}{m.hours}h
                    </span>
                  </div>
                ))}
              </div>
              {selected.expiresAt !== '—' && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-xs text-amber-800 font-medium">
                    ⚠ Horas expiram em <strong>{selected.expiresAt}</strong>. Agende compensação ou pagamento.
                  </p>
                </div>
              )}
            </div>
            <div className="px-5 pb-5 flex justify-end">
              <button onClick={() => setSelected(null)} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 font-medium hover:bg-slate-50">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust modal */}
      {showAdjust && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Lançar Ajuste Manual</h3>
              <button onClick={() => setShowAdjust(false)} className="p-2 hover:bg-slate-200 rounded-full"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Funcionário *</label>
                <select value={adjustForm.employeeId} onChange={e => setAdjustForm(p=>({...p,employeeId:e.target.value}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  <option value="">Selecionar...</option>
                  {employees.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tipo</label>
                  <select value={adjustForm.type} onChange={e => setAdjustForm(p=>({...p,type:e.target.value}))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none">
                    <option value="crédito">Crédito (+ horas)</option>
                    <option value="débito">Débito (- horas)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Horas *</label>
                  <input type="number" step="0.5" value={adjustForm.hours}
                    onChange={e => setAdjustForm(p=>({...p,hours:e.target.value}))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    placeholder="Ex: 2.5" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Motivo *</label>
                <input value={adjustForm.reason} onChange={e => setAdjustForm(p=>({...p,reason:e.target.value}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="Ex: Compensação aprovada pelo gestor" />
              </div>
            </div>
            <div className="px-5 pb-5 flex justify-end gap-3">
              <button onClick={() => setShowAdjust(false)} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 font-medium">Cancelar</button>
              <button onClick={applyAdjust} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-sm">Aplicar Ajuste</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// SEÇÃO 5 — FÉRIAS
// ============================================================
export function VacationsSection() {
  const [vacations, setVacations] = useState(vacationRecords);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<VacationStatus | 'Todos'>('Todos');
  const [schedForm, setSchedForm] = useState({ employeeId:'', start:'', end:'' });

  const filtered = filter === 'Todos' ? vacations : vacations.filter(v => v.status === filter);

  const expiring = vacations.filter(v => v.status === 'Vencendo').length;
  const expired  = vacations.filter(v => v.status === 'Vencida').length;
  const active   = vacations.filter(v => v.status === 'Em Curso').length;

  const statusStyle: Record<VacationStatus, string> = {
    Agendada:  'bg-blue-100 text-blue-700',
    'Em Curso':'bg-emerald-100 text-emerald-700',
    Concluída: 'bg-slate-100 text-slate-600',
    Vencendo:  'bg-amber-100 text-amber-700',
    Vencida:   'bg-red-100 text-red-700',
  };

  const calcVacPay = (salary: number) => {
    const third = salary / 3;
    const inss  = salary * 0.11;
    const irrf  = salary > 4664 ? (salary + third) * 0.075 : 0;
    return salary + third - inss - irrf;
  };

  const scheduleVacation = () => {
    if (!schedForm.employeeId || !schedForm.start || !schedForm.end) return;
    setVacations(p => p.map(v =>
      v.employeeId === schedForm.employeeId
        ? { ...v, scheduledStart: schedForm.start, scheduledEnd: schedForm.end, status: 'Agendada' as VacationStatus }
        : v
    ));
    setShowForm(false);
    setSchedForm({ employeeId:'', start:'', end:'' });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900">Férias</h2>
          <p className="text-sm text-slate-500">Controle de períodos aquisitivos, agendamentos e cálculo automático</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-sm hover:bg-indigo-700">
          <Plus className="w-4 h-4" /> Agendar Férias
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Em Curso agora"    value={active.toString()}    icon={Briefcase}     color="bg-emerald-500" sub="Colaboradores em férias" />
        <KPICard label="Agendadas"          value={vacations.filter(v=>v.status==='Agendada').length.toString()} icon={Calendar} color="bg-blue-500" sub="Próximos 90 dias" />
        <KPICard label="Vencendo em 60d"   value={expiring.toString()}  icon={AlertTriangle} color="bg-amber-500"   sub="Risco de perda" />
        <KPICard label="Vencidas"           value={expired.toString()}   icon={AlertCircle}   color="bg-red-500"    sub="Requerem ação imediata" />
      </div>

      {expiring > 0 && (
        <ZIABanner text={`Pedro Costa tem ${expiring} período(s) de férias próximo(s) do vencimento. Melhor janela para agendamento: Janeiro/2024, quando o setor Comercial tem menor demanda histórica.`} />
      )}

      {/* Filter */}
      <div className="flex border border-slate-200 rounded-xl overflow-hidden bg-white w-fit">
        {(['Todos','Agendada','Em Curso','Vencendo','Vencida','Concluída'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 text-xs font-bold transition-colors
              ${filter === f ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              {['Colaborador','Depto','Período Aquisitivo','Dias Disponíveis','Agendamento','Valor Estimado','Status'].map(h => (
                <th key={h} className="p-3 text-[10px] font-bold text-slate-400 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(v => (
              <tr key={v.id} className={`hover:bg-slate-50 transition-colors ${v.status === 'Vencida' ? 'bg-red-50/20' : v.status === 'Vencendo' ? 'bg-amber-50/20' : ''}`}>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-xs shrink-0">
                      {v.employeeName.split(' ').map(n=>n[0]).join('').substring(0,2)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{v.employeeName}</p>
                      <p className="text-xs text-slate-400">{v.role}</p>
                    </div>
                  </div>
                </td>
                <td className="p-3 text-xs text-slate-500">{v.department}</td>
                <td className="p-3 text-xs text-slate-500">
                  {new Date(v.acquisitionStart).toLocaleDateString('pt-BR')} –<br/>
                  {new Date(v.acquisitionEnd).toLocaleDateString('pt-BR')}
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-black ${v.availableDays - v.usedDays <= 5 ? 'text-red-600' : 'text-slate-800'}`}>
                      {v.availableDays - v.usedDays}d
                    </span>
                    <span className="text-xs text-slate-400">/ {v.availableDays}d</span>
                  </div>
                  <div className="w-20 bg-slate-100 rounded-full h-1.5 mt-1">
                    <div className="bg-indigo-500 h-1.5 rounded-full"
                      style={{ width: `${(v.usedDays/v.availableDays)*100}%` }} />
                  </div>
                </td>
                <td className="p-3 text-xs text-slate-600">
                  {v.scheduledStart && v.scheduledEnd
                    ? <>{new Date(v.scheduledStart).toLocaleDateString('pt-BR')} – {new Date(v.scheduledEnd).toLocaleDateString('pt-BR')}</>
                    : <span className="text-slate-300 italic">Não agendado</span>}
                </td>
                <td className="p-3 text-sm font-mono font-bold text-emerald-600">
                  R$ {calcVacPay(v.salary).toLocaleString('pt-BR',{minimumFractionDigits:2})}
                </td>
                <td className="p-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusStyle[v.status]}`}>
                    {v.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Schedule modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Agendar Férias</h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-200 rounded-full"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Funcionário *</label>
                <select value={schedForm.employeeId} onChange={e => setSchedForm(p=>({...p,employeeId:e.target.value}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  <option value="">Selecionar...</option>
                  {vacations.filter(v=>v.status !== 'Em Curso').map(v=>(
                    <option key={v.employeeId} value={v.employeeId}>{v.employeeName} ({v.availableDays - v.usedDays}d disponíveis)</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Início *</label>
                  <input type="date" value={schedForm.start} onChange={e => setSchedForm(p=>({...p,start:e.target.value}))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Retorno *</label>
                  <input type="date" value={schedForm.end} onChange={e => setSchedForm(p=>({...p,end:e.target.value}))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                </div>
              </div>
              {schedForm.employeeId && schedForm.start && schedForm.end && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1">
                  <p className="text-xs font-bold text-indigo-700">Resumo do Agendamento</p>
                  {(() => {
                    const days = Math.round((new Date(schedForm.end).getTime() - new Date(schedForm.start).getTime()) / 86400000);
                    const emp  = vacations.find(v => v.employeeId === schedForm.employeeId);
                    const pay  = emp ? calcVacPay(emp.salary) : 0;
                    return (
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div><p className="text-indigo-500">Dias</p><p className="font-bold text-slate-800">{days}d</p></div>
                        <div><p className="text-indigo-500">1/3 Const.</p><p className="font-bold text-slate-800">R$ {((emp?.salary ?? 0)/3).toFixed(0)}</p></div>
                        <div><p className="text-indigo-500">Líquido Est.</p><p className="font-bold text-emerald-600">R$ {pay.toFixed(0)}</p></div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
            <div className="px-5 pb-5 flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 font-medium">Cancelar</button>
              <button onClick={scheduleVacation} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-sm">Agendar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// ============================================================
// PARTE 5 — ANOTAÇÕES E ATIVIDADES
// Inclui: Advertências, Anotações Customizadas, Produtividade,
//         Atividades, Custo de Atividades, Métricas Customizadas
// ============================================================
// Integração no switch do HRModule principal:
//   case 'annotations': return <AnnotationsSection />;
// ============================================================

import { useState, useMemo } from 'react';
import {
  FileText, AlertTriangle, Activity, DollarSign,
  BarChart3, Plus, X, Search, Download, CheckCircle,
  Edit3, Trash2, Sparkles, Clock, Users, TrendingUp,
  TrendingDown, Calendar, ChevronDown, Filter, Bell,
  Shield, Star, Hash, Eye, ArrowUpRight, Zap
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

// ============================================================
// TIPOS
// ============================================================
type AnnotationTab = 'warnings' | 'custom' | 'productivity' | 'activities' | 'activity-cost' | 'custom-metrics';
type WarningSeverity = 'Baixa' | 'Média' | 'Alta';
type WarningType = 'Verbal' | 'Escrita' | 'Suspensão';
type WarningStatus = 'Pendente Assinatura' | 'Assinada' | 'Recusada';
type ActivityStatus = 'Pendente' | 'Em Andamento' | 'Concluída' | 'Atrasada';

interface Employee { id: string; name: string; role: string; department: string; salary: number; }

interface Warning {
  id: string; employeeId: string; employeeName: string; department: string;
  type: WarningType; severity: WarningSeverity; date: string;
  reason: string; description: string; status: WarningStatus;
  witness?: string; suspensionDays?: number;
}

interface CustomAnnotation {
  id: string; employeeId: string; employeeName: string; department: string;
  category: string; title: string; description: string;
  date: string; author: string; visibility: 'Privado' | 'Gestor' | 'RH' | 'Público';
  tags: string[]; attachments: string[];
}

interface ProductivityRecord {
  id: string; employeeId: string; employeeName: string; department: string;
  period: string; score: number; tasksCompleted: number; tasksTotal: number;
  hoursWorked: number; deliveredOnTime: number; qualityScore: number;
  notes: string;
}

interface Activity {
  id: string; title: string; description: string; assignedTo: string[];
  department: string; createdBy: string; deadline: string;
  estimatedHours: number; actualHours: number;
  status: ActivityStatus; priority: 'Baixa' | 'Média' | 'Alta' | 'Urgente';
  category: string; cost: number; tags: string[];
}

interface CustomMetric {
  id: string; name: string; description: string; unit: string;
  formula: string; target: number; current: number;
  department: string; frequency: 'Diária' | 'Semanal' | 'Mensal';
  active: boolean; lastUpdated: string;
}

// ============================================================
// MOCKS
// ============================================================
const employees: Employee[] = [
  { id:'1', name:'Ana Silva',      role:'Desenvolvedora Senior', department:'TI',        salary:12500 },
  { id:'2', name:'João Santos',    role:'Analista de Marketing', department:'Marketing', salary:8000  },
  { id:'3', name:'Maria Oliveira', role:'Assistente RH',         department:'RH',        salary:1500  },
  { id:'4', name:'Pedro Costa',    role:'Gerente Comercial',     department:'Comercial', salary:18000 },
  { id:'5', name:'Lucas Pereira',  role:'Suporte Técnico',       department:'TI',        salary:4500  },
];

const initWarnings: Warning[] = [
  { id:'1', employeeId:'2', employeeName:'João Santos', department:'Marketing', type:'Verbal', severity:'Baixa', date:'2023-09-15', reason:'Atraso recorrente', description:'Terceiro atraso no mês de setembro, todos nas segundas-feiras. Gestor conversou sobre pontualidade.', status:'Assinada', witness:'Fernanda Lima' },
  { id:'2', employeeId:'4', employeeName:'Pedro Costa', department:'Comercial', type:'Escrita', severity:'Alta', date:'2023-10-05', reason:'Horas extras não autorizadas', description:'Realizou 8h extras sem autorização prévia no mês de setembro, contrariando política interna vigente.', status:'Pendente Assinatura' },
  { id:'3', employeeId:'4', employeeName:'Pedro Costa', department:'Comercial', type:'Escrita', severity:'Média', date:'2023-07-20', reason:'Conduta inadequada em reunião', description:'Uso de linguagem inadequada durante reunião com cliente. Diretoria solicitou advertência formal.', status:'Assinada', witness:'Roberto Costa' },
  { id:'4', employeeId:'5', employeeName:'Lucas Pereira', department:'TI', type:'Verbal', severity:'Baixa', date:'2023-10-18', reason:'Não cumprimento de SLA', description:'Dois chamados críticos excederam SLA em outubro. Gestor conduziu conversa formal.', status:'Pendente Assinatura' },
];

const initAnnotations: CustomAnnotation[] = [
  { id:'1', employeeId:'1', employeeName:'Ana Silva', department:'TI', category:'Reconhecimento', title:'Destaque Q3/2023', description:'Ana liderou a migração do sistema legado com zero downtime. Performance excepcional reconhecida pela diretoria.', date:'2023-09-30', author:'Carlos Souza', visibility:'Público', tags:['liderança','performance','migração'], attachments:[] },
  { id:'2', employeeId:'5', employeeName:'Lucas Pereira', department:'TI', category:'Melhoria Necessária', title:'Comunicação com cliente', description:'Lucas precisa melhorar a comunicação escrita nos chamados. Cliente reclamou de respostas curtas e sem contexto.', date:'2023-10-10', author:'Ana Silva', visibility:'Gestor', tags:['comunicação','atendimento'], attachments:['feedback_cliente.pdf'] },
  { id:'3', employeeId:'3', employeeName:'Maria Oliveira', department:'RH', category:'Capacitação', title:'Conclusão MBA RH', description:'Maria concluiu MBA em Gestão de Pessoas com louvor. Candidata a progressão de cargo em 2024.', date:'2023-08-15', author:'Roberto Costa', visibility:'RH', tags:['formação','progressão'], attachments:['diploma.pdf'] },
];

const productivityRecords: ProductivityRecord[] = [
  { id:'1', employeeId:'1', employeeName:'Ana Silva',      department:'TI',       period:'Out/23', score:91, tasksCompleted:24, tasksTotal:25, hoursWorked:170, deliveredOnTime:96, qualityScore:94, notes:'Mês excelente. Entregou sprint completo adiantado.' },
  { id:'2', employeeId:'2', employeeName:'João Santos',    department:'Marketing', period:'Out/23', score:72, tasksCompleted:14, tasksTotal:18, hoursWorked:165, deliveredOnTime:78, qualityScore:80, notes:'Houve retrabalho em 2 campanhas. Alinhamento com briefing precisa melhorar.' },
  { id:'3', employeeId:'3', employeeName:'Maria Oliveira', department:'RH',        period:'Out/23', score:85, tasksCompleted:31, tasksTotal:33, hoursWorked:160, deliveredOnTime:94, qualityScore:88, notes:'Bom desempenho. Parte do mês em férias.' },
  { id:'4', employeeId:'4', employeeName:'Pedro Costa',    department:'Comercial', period:'Out/23', score:61, tasksCompleted:8,  tasksTotal:15, hoursWorked:120, deliveredOnTime:53, qualityScore:70, notes:'Afastamento impactou entregas. Aguardando retorno para reavaliação.' },
  { id:'5', employeeId:'5', employeeName:'Lucas Pereira',  department:'TI',        period:'Out/23', score:78, tasksCompleted:42, tasksTotal:50, hoursWorked:170, deliveredOnTime:84, qualityScore:75, notes:'Volume de chamados acima da meta. Qualidade pode melhorar.' },
];

const initActivities: Activity[] = [
  { id:'1', title:'Migração Banco de Dados', description:'Migrar schema do PostgreSQL 12 para 15 com zero downtime', assignedTo:['Ana Silva','Lucas Pereira'], department:'TI', createdBy:'Carlos Souza', deadline:'2023-11-15', estimatedHours:40, actualHours:28, status:'Em Andamento', priority:'Alta', category:'Infraestrutura', cost:2800, tags:['database','infra'] },
  { id:'2', title:'Campanha Black Friday', description:'Criar materiais e estratégia digital para BF 2023', assignedTo:['João Santos'], department:'Marketing', createdBy:'Fernanda Lima', deadline:'2023-11-20', estimatedHours:60, actualHours:45, status:'Em Andamento', priority:'Urgente', category:'Marketing', cost:4500, tags:['campanha','digital'] },
  { id:'3', title:'Revisão Política de Benefícios', description:'Atualizar política de benefícios para 2024 com benchmark de mercado', assignedTo:['Maria Oliveira'], department:'RH', createdBy:'Roberto Costa', deadline:'2023-10-31', estimatedHours:20, actualHours:22, status:'Atrasada', priority:'Média', category:'RH', cost:550, tags:['benefícios','política'] },
  { id:'4', title:'Onboarding Q4 — Novos Vendedores', description:'Conduzir processo de integração para 3 novos analistas comerciais', assignedTo:['Maria Oliveira','Pedro Costa'], department:'Comercial', createdBy:'Pedro Costa', deadline:'2023-11-10', estimatedHours:16, actualHours:16, status:'Concluída', priority:'Alta', category:'RH', cost:960, tags:['onboarding','comercial'] },
  { id:'5', title:'Auditoria de Acessos Sistema', description:'Revisar e atualizar permissões de todos os usuários no ERP', assignedTo:['Lucas Pereira'], department:'TI', createdBy:'Ana Silva', deadline:'2023-12-01', estimatedHours:12, actualHours:0, status:'Pendente', priority:'Baixa', category:'Segurança', cost:360, tags:['segurança','erp'] },
];

const initCustomMetrics: CustomMetric[] = [
  { id:'1', name:'Taxa de Retenção', description:'% colaboradores que permanecem após 12 meses', unit:'%', formula:'(Ativos_12m / Admitidos_12m) * 100', target:90, current:87.5, department:'RH', frequency:'Mensal', active:true, lastUpdated:'2023-10-31' },
  { id:'2', name:'Custo por Contratação', description:'Custo médio do processo seletivo até admissão', unit:'R$', formula:'Total_Recrutamento / Admissões', target:2500, current:2180, department:'RH', frequency:'Mensal', active:true, lastUpdated:'2023-10-31' },
  { id:'3', name:'Horas de Treinamento/Func.', description:'Média de horas de T&D por colaborador no mês', unit:'h', formula:'Total_Horas_TD / Headcount', target:8, current:5.2, department:'RH', frequency:'Mensal', active:true, lastUpdated:'2023-10-31' },
  { id:'4', name:'NPS Interno', description:'Net Promoter Score da pesquisa de clima', unit:'pts', formula:'% Promotores - % Detratores', target:50, current:42, department:'RH', frequency:'Mensal', active:false, lastUpdated:'2023-09-30' },
  { id:'5', name:'Produtividade TI', description:'Tickets resolvidos por analista por dia', unit:'tickets/dia', formula:'Tickets_Resolvidos / (Analistas * Dias_Úteis)', target:6, current:5.4, department:'TI', frequency:'Semanal', active:true, lastUpdated:'2023-10-27' },
];

// ============================================================
// SHARED UI
// ============================================================
function ZIABanner({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2.5 p-3.5 bg-violet-50 border border-violet-200 rounded-xl">
      <Sparkles className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
      <p className="text-sm text-violet-800">{text}</p>
    </div>
  );
}

function TabBtn({ id, label, active, onClick, badge }: {
  id: string; label: string; active: boolean; onClick: () => void; badge?: number;
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

function SeverityBadge({ severity }: { severity: WarningSeverity }) {
  const s = { Baixa:'bg-yellow-100 text-yellow-700', Média:'bg-orange-100 text-orange-700', Alta:'bg-red-100 text-red-700' };
  return <span className={`px-2 py-0.5 rounded text-xs font-bold ${s[severity]}`}>{severity}</span>;
}

function StatusBadge({ status, map }: { status: string; map: Record<string,string> }) {
  return <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${map[status] ?? 'bg-slate-100 text-slate-600'}`}>{status}</span>;
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 90 ? 'bg-emerald-500' : score >= 75 ? 'bg-indigo-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500';
  const text  = score >= 90 ? 'text-emerald-600' : score >= 75 ? 'text-indigo-600' : score >= 60 ? 'text-amber-600' : 'text-red-600';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-100 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-black w-8 text-right ${text}`}>{score}</span>
    </div>
  );
}

// ============================================================
// ABA 1 — ADVERTÊNCIAS
// ============================================================
function WarningsTab() {
  const [warnings, setWarnings] = useState(initWarnings);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<WarningStatus | 'Todas'>('Todas');
  const [form, setForm] = useState({
    employee:'', type:'Verbal' as WarningType, severity:'Baixa' as WarningSeverity,
    reason:'', description:'', witness:'', suspensionDays:''
  });

  const filtered = filter === 'Todas' ? warnings : warnings.filter(w => w.status === filter);
  const pending  = warnings.filter(w => w.status === 'Pendente Assinatura').length;

  const signWarning  = (id: string) => setWarnings(p => p.map(w => w.id === id ? { ...w, status: 'Assinada' as WarningStatus } : w));
  const refuseWarning = (id: string) => setWarnings(p => p.map(w => w.id === id ? { ...w, status: 'Recusada' as WarningStatus } : w));
  const deleteWarning = (id: string) => setWarnings(p => p.filter(w => w.id !== id));

  const addWarning = () => {
    const emp = employees.find(e => e.name === form.employee);
    if (!emp || !form.reason) return;
    setWarnings(p => [...p, {
      id: String(Date.now()), employeeId: emp.id,
      employeeName: emp.name, department: emp.department,
      type: form.type, severity: form.severity,
      date: new Date().toISOString().split('T')[0],
      reason: form.reason, description: form.description,
      status: 'Pendente Assinatura',
      witness: form.witness || undefined,
      suspensionDays: form.type === 'Suspensão' ? parseInt(form.suspensionDays) || 1 : undefined,
    }]);
    setShowForm(false);
    setForm({ employee:'', type:'Verbal', severity:'Baixa', reason:'', description:'', witness:'', suspensionDays:'' });
  };

  const statusMap = {
    'Pendente Assinatura': 'bg-amber-100 text-amber-700',
    'Assinada': 'bg-emerald-100 text-emerald-700',
    'Recusada': 'bg-red-100 text-red-700',
  };

  const typeIcon = { Verbal:'🗣', Escrita:'📄', Suspensão:'🚫' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-3">
          <div className="bg-red-50 rounded-xl px-4 py-2 border border-red-100">
            <p className="text-lg font-black text-red-600">{warnings.length}</p>
            <p className="text-xs text-red-700">Total advertências</p>
          </div>
          <div className="bg-amber-50 rounded-xl px-4 py-2 border border-amber-100">
            <p className="text-lg font-black text-amber-600">{pending}</p>
            <p className="text-xs text-amber-700">Aguardando assinatura</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex border border-slate-200 rounded-xl overflow-hidden bg-white">
            {(['Todas','Pendente Assinatura','Assinada','Recusada'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-2 text-xs font-bold transition-colors
                  ${filter === f ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                {f === 'Pendente Assinatura' ? 'Pendentes' : f}
              </button>
            ))}
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-sm">
            <Plus className="w-3.5 h-3.5" /> Nova Advertência
          </button>
        </div>
      </div>

      <ZIABanner text="Pedro Costa tem 2 advertências em menos de 6 meses. Próxima infração pode resultar em rescisão por justa causa conforme CLT Art. 482. Recomendo documentar formalmente e escalar para diretoria." />

      <div className="space-y-3">
        {filtered.map(w => (
          <div key={w.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden
            ${w.severity === 'Alta' ? 'border-red-200' : w.severity === 'Média' ? 'border-orange-200' : 'border-slate-100'}`}>
            <div className="flex items-start justify-between p-4 flex-wrap gap-3">
              <div className="flex items-start gap-3">
                <div className="text-2xl">{typeIcon[w.type]}</div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-black text-slate-800">{w.employeeName}</span>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">{w.department}</span>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold">{w.type}</span>
                    <SeverityBadge severity={w.severity} />
                    <StatusBadge status={w.status} map={statusMap} />
                  </div>
                  <p className="text-sm font-bold text-slate-700">{w.reason}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{w.description}</p>
                  {w.witness && <p className="text-xs text-slate-400 mt-1">Testemunha: <strong>{w.witness}</strong></p>}
                  {w.suspensionDays && <p className="text-xs text-orange-600 font-bold mt-1">Suspensão: {w.suspensionDays} dia(s)</p>}
                  <p className="text-xs text-slate-400 mt-1">{new Date(w.date).toLocaleDateString('pt-BR')}</p>
                </div>
              </div>
              <div className="flex gap-2 items-start shrink-0">
                {w.status === 'Pendente Assinatura' && (
                  <>
                    <button onClick={() => signWarning(w.id)}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700">
                      Marcar Assinada
                    </button>
                    <button onClick={() => refuseWarning(w.id)}
                      className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200">
                      Recusada
                    </button>
                  </>
                )}
                <button onClick={() => deleteWarning(w.id)}
                  className="p-1.5 hover:bg-red-50 rounded-lg">
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400">
            <CheckCircle className="w-8 h-8 mb-2 opacity-40" />
            <p className="font-medium">Nenhuma advertência encontrada</p>
          </div>
        )}
      </div>

      {/* New warning modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h3 className="font-black text-slate-800">Nova Advertência</h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-200 rounded-full"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Funcionário *</label>
                  <select value={form.employee} onChange={e => setForm(p=>({...p,employee:e.target.value}))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    <option value="">Selecionar...</option>
                    {employees.map(e=><option key={e.id}>{e.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tipo</label>
                  <select value={form.type} onChange={e => setForm(p=>({...p,type:e.target.value as WarningType}))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none">
                    {(['Verbal','Escrita','Suspensão'] as WarningType[]).map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Severidade</label>
                  <select value={form.severity} onChange={e => setForm(p=>({...p,severity:e.target.value as WarningSeverity}))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none">
                    {(['Baixa','Média','Alta'] as WarningSeverity[]).map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Motivo (título) *</label>
                <input value={form.reason} onChange={e => setForm(p=>({...p,reason:e.target.value}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="Ex: Atraso recorrente" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Descrição completa</label>
                <textarea value={form.description} onChange={e => setForm(p=>({...p,description:e.target.value}))} rows={3}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                  placeholder="Descreva os fatos que originaram esta advertência..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Testemunha</label>
                  <input value={form.witness} onChange={e => setForm(p=>({...p,witness:e.target.value}))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none"
                    placeholder="Nome da testemunha" />
                </div>
                {form.type === 'Suspensão' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Dias de Suspensão</label>
                    <input type="number" min="1" max="30" value={form.suspensionDays}
                      onChange={e => setForm(p=>({...p,suspensionDays:e.target.value}))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
                  </div>
                )}
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-xs text-amber-800 font-medium">
                  ⚠ Após salvar, o funcionário será notificado para assinar o documento. O RH também será notificado automaticamente.
                </p>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-3 shrink-0">
              <button onClick={() => setShowForm(false)} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 font-medium">Cancelar</button>
              <button onClick={addWarning} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-sm">Emitir Advertência</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// ABA 2 — ANOTAÇÕES CUSTOMIZADAS
// ============================================================
function CustomAnnotationsTab() {
  const [annotations, setAnnotations] = useState(initAnnotations);
  const [showForm, setShowForm] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [form, setForm] = useState({
    employee:'', category:'Reconhecimento', title:'', description:'',
    visibility:'Gestor' as CustomAnnotation['visibility'], tags:[] as string[]
  });

  const categories = ['Reconhecimento','Melhoria Necessária','Capacitação','Comportamento','Projeto','Saúde','Outro'];
  const visibilityStyle = {
    Privado:'bg-red-100 text-red-700',
    Gestor:'bg-amber-100 text-amber-700',
    RH:'bg-blue-100 text-blue-700',
    Público:'bg-emerald-100 text-emerald-700',
  };
  const categoryColor: Record<string, string> = {
    Reconhecimento:'bg-emerald-100 text-emerald-700',
    'Melhoria Necessária':'bg-orange-100 text-orange-700',
    Capacitação:'bg-blue-100 text-blue-700',
    Comportamento:'bg-red-100 text-red-700',
    Projeto:'bg-purple-100 text-purple-700',
    Saúde:'bg-pink-100 text-pink-700',
    Outro:'bg-slate-100 text-slate-600',
  };

  const addTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      setForm(p=>({...p, tags:[...p.tags, tagInput.trim()]}));
      setTagInput('');
    }
  };

  const saveAnnotation = () => {
    const emp = employees.find(e => e.name === form.employee);
    if (!emp || !form.title) return;
    setAnnotations(p=>[...p, {
      id: String(Date.now()), employeeId: emp.id,
      employeeName: emp.name, department: emp.department,
      category: form.category, title: form.title,
      description: form.description, date: new Date().toISOString().split('T')[0],
      author: 'Usuário Atual', visibility: form.visibility,
      tags: form.tags, attachments: [],
    }]);
    setShowForm(false);
    setForm({ employee:'', category:'Reconhecimento', title:'', description:'', visibility:'Gestor', tags:[] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{annotations.length} anotações registradas</p>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-sm">
          <Plus className="w-3.5 h-3.5" /> Nova Anotação
        </button>
      </div>

      <div className="space-y-3">
        {annotations.map(ann => (
          <div key={ann.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${categoryColor[ann.category] ?? 'bg-slate-100 text-slate-600'}`}>
                    {ann.category}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${visibilityStyle[ann.visibility]}`}>
                    {ann.visibility}
                  </span>
                  <span className="text-xs text-slate-400">{new Date(ann.date).toLocaleDateString('pt-BR')}</span>
                </div>
                <p className="font-bold text-slate-800">{ann.title}</p>
                <p className="text-sm text-slate-600 mt-1">{ann.description}</p>
                <div className="flex items-center gap-3 mt-2 flex-wrap">
                  <span className="text-xs text-slate-500">
                    <strong>{ann.employeeName}</strong> · {ann.department}
                  </span>
                  <span className="text-xs text-slate-400">por {ann.author}</span>
                </div>
                {ann.tags.length > 0 && (
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {ann.tags.map((tag, i) => (
                      <span key={i} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">#{tag}</span>
                    ))}
                  </div>
                )}
                {ann.attachments.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {ann.attachments.map((att, i) => (
                      <button key={i} className="flex items-center gap-1 text-xs text-indigo-600 font-bold hover:underline">
                        <FileText className="w-3 h-3" /> {att}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={() => setAnnotations(p=>p.filter(a=>a.id!==ann.id))}
                className="p-1.5 hover:bg-red-50 rounded-lg shrink-0">
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h3 className="font-black text-slate-800">Nova Anotação</h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-200 rounded-full"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Funcionário *</label>
                  <select value={form.employee} onChange={e => setForm(p=>({...p,employee:e.target.value}))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                    <option value="">Selecionar...</option>
                    {employees.map(e=><option key={e.id}>{e.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Categoria</label>
                  <select value={form.category} onChange={e => setForm(p=>({...p,category:e.target.value}))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none">
                    {categories.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Visibilidade</label>
                  <select value={form.visibility} onChange={e => setForm(p=>({...p,visibility:e.target.value as any}))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none">
                    {['Privado','Gestor','RH','Público'].map(v=><option key={v}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Título *</label>
                <input value={form.title} onChange={e => setForm(p=>({...p,title:e.target.value}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="Título da anotação" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Descrição</label>
                <textarea value={form.description} onChange={e => setForm(p=>({...p,description:e.target.value}))} rows={3}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                  placeholder="Detalhe a anotação..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tags</label>
                <div className="flex gap-2">
                  <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                    placeholder="tag + Enter" />
                  <button onClick={addTag} className="px-3 py-2 bg-slate-100 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-200">Add</button>
                </div>
                {form.tags.length > 0 && (
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {form.tags.map((tag,i)=>(
                      <span key={i} className="flex items-center gap-1 text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                        #{tag}
                        <button onClick={() => setForm(p=>({...p,tags:p.tags.filter(t=>t!==tag)}))} className="hover:text-red-500">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-3 shrink-0">
              <button onClick={() => setShowForm(false)} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 font-medium">Cancelar</button>
              <button onClick={saveAnnotation} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-sm">Salvar Anotação</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// ABA 3 — PRODUTIVIDADE
// ============================================================
function ProductivityTab() {
  const [period, setPeriod] = useState('Out/23');
  const [showForm, setShowForm] = useState(false);
  const [records, setRecords] = useState(productivityRecords);
  const [form, setForm] = useState({ employee:'', score:'', tasksCompleted:'', tasksTotal:'', hoursWorked:'', deliveredOnTime:'', qualityScore:'', notes:'' });

  const avgScore = Math.round(records.reduce((a,r)=>a+r.score,0) / records.length);

  const saveRecord = () => {
    const emp = employees.find(e=>e.name===form.employee);
    if (!emp) return;
    setRecords(p=>[...p, {
      id: String(Date.now()), employeeId:emp.id, employeeName:emp.name, department:emp.department,
      period, score:+form.score||0, tasksCompleted:+form.tasksCompleted||0, tasksTotal:+form.tasksTotal||0,
      hoursWorked:+form.hoursWorked||0, deliveredOnTime:+form.deliveredOnTime||0, qualityScore:+form.qualityScore||0, notes:form.notes
    }]);
    setShowForm(false);
    setForm({ employee:'', score:'', tasksCompleted:'', tasksTotal:'', hoursWorked:'', deliveredOnTime:'', qualityScore:'', notes:'' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-3 items-center">
          <select value={period} onChange={e=>setPeriod(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
            {['Out/23','Set/23','Ago/23','Jul/23'].map(p=><option key={p}>{p}</option>)}
          </select>
          <div className="bg-indigo-50 rounded-xl px-4 py-2 border border-indigo-100">
            <span className="text-xs text-indigo-600 font-bold">Score médio: </span>
            <span className="text-lg font-black text-indigo-700">{avgScore}</span>
          </div>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-sm">
          <Plus className="w-3.5 h-3.5" /> Registrar Avaliação
        </button>
      </div>

      <ZIABanner text="Pedro Costa tem o menor score do período (61) — impacto do afastamento. Ana Silva lidera com 91. Recomendo reunião de alinhamento individual para João Santos que apresentou regressão de 14 pontos." />

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              {['Colaborador','Depto','Score Geral','Tarefas','Pontualidade','Qualidade','Observações'].map(h=>(
                <th key={h} className="p-3 text-[10px] font-bold text-slate-400 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {records.map(r=>(
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-[10px]">
                      {r.employeeName.split(' ').map(n=>n[0]).join('').substring(0,2)}
                    </div>
                    <span className="text-sm font-medium text-slate-800">{r.employeeName}</span>
                  </div>
                </td>
                <td className="p-3 text-xs text-slate-500">{r.department}</td>
                <td className="p-3 w-36">
                  <ScoreBar score={r.score} />
                </td>
                <td className="p-3">
                  <span className="text-sm font-bold text-slate-700">{r.tasksCompleted}/{r.tasksTotal}</span>
                  <span className="text-xs text-slate-400 ml-1">({Math.round(r.tasksCompleted/r.tasksTotal*100)}%)</span>
                </td>
                <td className="p-3">
                  <ScoreBar score={r.deliveredOnTime} />
                </td>
                <td className="p-3">
                  <ScoreBar score={r.qualityScore} />
                </td>
                <td className="p-3 text-xs text-slate-500 italic max-w-48" title={r.notes}>
                  {r.notes.length > 60 ? r.notes.substring(0,60)+'…' : r.notes}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h3 className="font-black text-slate-800">Registrar Avaliação — {period}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-200 rounded-full"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Funcionário *</label>
                <select value={form.employee} onChange={e=>setForm(p=>({...p,employee:e.target.value}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  <option value="">Selecionar...</option>
                  {employees.map(e=><option key={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  {label:'Score Geral (0-100)', key:'score'},
                  {label:'Tarefas Concluídas', key:'tasksCompleted'},
                  {label:'Total de Tarefas', key:'tasksTotal'},
                  {label:'Horas Trabalhadas', key:'hoursWorked'},
                  {label:'Pontualidade (%)', key:'deliveredOnTime'},
                  {label:'Qualidade (%)', key:'qualityScore'},
                ].map(f=>(
                  <div key={f.key}>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{f.label}</label>
                    <input type="number" value={(form as any)[f.key]}
                      onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Observações</label>
                <textarea value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none resize-none" />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-3 shrink-0">
              <button onClick={()=>setShowForm(false)} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 font-medium">Cancelar</button>
              <button onClick={saveRecord} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-sm">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// ABA 4 — ATIVIDADES
// ============================================================
function ActivitiesTab() {
  const [activities, setActivities] = useState(initActivities);
  const [filter, setFilter] = useState<ActivityStatus | 'Todas'>('Todas');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title:'', description:'', assignedTo:[] as string[], department:'TI',
    deadline:'', estimatedHours:'', priority:'Média' as Activity['priority'],
    category:'', tags:[] as string[], tagInput:'',
  });

  const filtered = filter === 'Todas' ? activities : activities.filter(a=>a.status===filter);

  const statusMap = {
    Pendente:    'bg-slate-100 text-slate-600',
    'Em Andamento':'bg-blue-100 text-blue-700',
    Concluída:   'bg-emerald-100 text-emerald-700',
    Atrasada:    'bg-red-100 text-red-700',
  };
  const priorityMap = {
    Baixa:'bg-slate-100 text-slate-500',
    Média:'bg-blue-100 text-blue-700',
    Alta:'bg-orange-100 text-orange-700',
    Urgente:'bg-red-100 text-red-700',
  };

  const toggleAssignee = (name: string) =>
    setForm(p=>({ ...p, assignedTo: p.assignedTo.includes(name) ? p.assignedTo.filter(n=>n!==name) : [...p.assignedTo, name] }));

  const updateStatus = (id: string, status: ActivityStatus) =>
    setActivities(p=>p.map(a=>a.id===id?{...a,status}:a));

  const saveActivity = () => {
    if (!form.title) return;
    setActivities(p=>[...p,{
      id:String(Date.now()), title:form.title, description:form.description,
      assignedTo:form.assignedTo, department:form.department,
      createdBy:'Usuário Atual', deadline:form.deadline,
      estimatedHours:+form.estimatedHours||0, actualHours:0,
      status:'Pendente', priority:form.priority,
      category:form.category||'Geral',
      cost:(+form.estimatedHours||0)*80, tags:form.tags,
    }]);
    setShowForm(false);
    setForm({ title:'', description:'', assignedTo:[], department:'TI', deadline:'', estimatedHours:'', priority:'Média', category:'', tags:[], tagInput:'' });
  };

  const atrasadas = activities.filter(a=>a.status==='Atrasada').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-3">
          {(['Todas','Pendente','Em Andamento','Concluída','Atrasada'] as const).map(f=>(
            <button key={f} onClick={()=>setFilter(f)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors border
                ${filter===f?'bg-indigo-600 text-white border-indigo-600':'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
              {f} {f==='Atrasada'&&atrasadas>0?`(${atrasadas})`:''}
            </button>
          ))}
        </div>
        <button onClick={()=>setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-sm">
          <Plus className="w-3.5 h-3.5" /> Nova Atividade
        </button>
      </div>

      {atrasadas > 0 && <ZIABanner text={`${atrasadas} atividade(s) atrasada(s). Revisão da política de benefícios deveria ter sido concluída em 31/10. Recomendo redistribuir para evitar bloqueio de outras entregas.`} />}

      <div className="space-y-3">
        {filtered.map(act=>(
          <div key={act.id} className={`bg-white rounded-2xl border shadow-sm p-4
            ${act.status==='Atrasada'?'border-red-200 bg-red-50/10':act.status==='Concluída'?'border-emerald-100':'border-slate-100'}`}>
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${statusMap[act.status]}`}>{act.status}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${priorityMap[act.priority]}`}>{act.priority}</span>
                  <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{act.category}</span>
                </div>
                <p className="font-bold text-slate-800">{act.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{act.description}</p>
                <div className="flex items-center gap-4 mt-2 flex-wrap">
                  <span className="text-xs text-slate-400">
                    👤 {act.assignedTo.join(', ')}
                  </span>
                  <span className="text-xs text-slate-400">
                    🗓 Prazo: <strong className={act.status==='Atrasada'?'text-red-600':''}>{new Date(act.deadline).toLocaleDateString('pt-BR')}</strong>
                  </span>
                  <span className="text-xs text-slate-400">
                    ⏱ {act.actualHours}/{act.estimatedHours}h estimadas
                  </span>
                  {act.cost > 0 && (
                    <span className="text-xs text-emerald-600 font-bold">
                      R$ {act.cost.toLocaleString('pt-BR')}
                    </span>
                  )}
                </div>
                {act.tags.length > 0 && (
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {act.tags.map((tag,i)=>(
                      <span key={i} className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">#{tag}</span>
                    ))}
                  </div>
                )}
                {/* Progress bar */}
                {act.estimatedHours > 0 && (
                  <div className="mt-2">
                    <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                      <span>Progresso</span>
                      <span>{Math.round((act.actualHours/act.estimatedHours)*100)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${act.status==='Atrasada'?'bg-red-500':act.status==='Concluída'?'bg-emerald-500':'bg-indigo-500'}`}
                        style={{ width:`${Math.min(100,(act.actualHours/act.estimatedHours)*100)}%` }} />
                    </div>
                  </div>
                )}
              </div>
              {act.status !== 'Concluída' && (
                <div className="flex flex-col gap-1 shrink-0">
                  {act.status !== 'Em Andamento' && (
                    <button onClick={()=>updateStatus(act.id,'Em Andamento')}
                      className="px-2.5 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-bold hover:bg-blue-200">
                      Iniciar
                    </button>
                  )}
                  <button onClick={()=>updateStatus(act.id,'Concluída')}
                    className="px-2.5 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold hover:bg-emerald-200">
                    Concluir
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h3 className="font-black text-slate-800">Nova Atividade</h3>
              <button onClick={()=>setShowForm(false)} className="p-2 hover:bg-slate-200 rounded-full"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Título *</label>
                <input value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="Título da atividade" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Descrição</label>
                <textarea value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none resize-none" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Departamento</label>
                  <select value={form.department} onChange={e=>setForm(p=>({...p,department:e.target.value}))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                    {['TI','Marketing','RH','Comercial','Financeiro'].map(d=><option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Prazo</label>
                  <input type="date" value={form.deadline} onChange={e=>setForm(p=>({...p,deadline:e.target.value}))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Horas Est.</label>
                  <input type="number" value={form.estimatedHours} onChange={e=>setForm(p=>({...p,estimatedHours:e.target.value}))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" placeholder="0" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Prioridade</label>
                  <select value={form.priority} onChange={e=>setForm(p=>({...p,priority:e.target.value as any}))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                    {['Baixa','Média','Alta','Urgente'].map(p=><option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Categoria</label>
                  <input value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                    placeholder="Ex: Infraestrutura" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Responsáveis</label>
                <div className="grid grid-cols-2 gap-2">
                  {employees.map(e=>(
                    <label key={e.id} className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer text-xs transition-all
                      ${form.assignedTo.includes(e.name)?'bg-indigo-50 border-indigo-300':'bg-white border-slate-200 hover:border-slate-300'}`}>
                      <input type="checkbox" checked={form.assignedTo.includes(e.name)}
                        onChange={()=>toggleAssignee(e.name)} className="w-3.5 h-3.5 accent-indigo-600" />
                      <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-[9px] font-black text-indigo-700 shrink-0">
                        {e.name.split(' ').map(n=>n[0]).join('').substring(0,2)}
                      </div>
                      <span className="font-medium text-slate-700">{e.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              {form.estimatedHours && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                  <p className="text-xs text-indigo-700 font-medium">
                    Custo estimado: <strong>R$ {(+form.estimatedHours * 80 * form.assignedTo.length).toLocaleString('pt-BR')}</strong>
                    {' '}({form.assignedTo.length} responsável(is) × {form.estimatedHours}h × R$80/h)
                  </p>
                </div>
              )}
            </div>
            <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-3 shrink-0">
              <button onClick={()=>setShowForm(false)} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 font-medium">Cancelar</button>
              <button onClick={saveActivity} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-sm">Criar Atividade</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// ABA 5 — CUSTO DE ATIVIDADES
// ============================================================
function ActivityCostTab() {
  const totalEstimated = initActivities.reduce((a,act)=>a+act.cost,0);
  const byDept = useMemo(()=>{
    const map: Record<string,{estimated:number;completed:number;count:number}> = {};
    initActivities.forEach(act=>{
      if (!map[act.department]) map[act.department]={estimated:0,completed:0,count:0};
      map[act.department].estimated += act.cost;
      if (act.status==='Concluída') map[act.department].completed += act.cost;
      map[act.department].count++;
    });
    return Object.entries(map).map(([dept,v])=>({dept,...v}));
  },[]);

  const totalHours = initActivities.reduce((a,act)=>a+act.estimatedHours,0);
  const completedCost = initActivities.filter(a=>a.status==='Concluída').reduce((a,act)=>a+act.cost,0);

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {label:'Custo Total Est.',    value:`R$ ${totalEstimated.toLocaleString('pt-BR')}`, sub:'Todas as atividades', color:'bg-indigo-500', icon:DollarSign},
          {label:'Já Executado',        value:`R$ ${completedCost.toLocaleString('pt-BR')}`,  sub:'Atividades concluídas', color:'bg-emerald-500', icon:CheckCircle},
          {label:'Total Horas Est.',    value:`${totalHours}h`,                               sub:'Estimativa total', color:'bg-blue-500', icon:Clock},
          {label:'Custo Médio/Atv.',   value:`R$ ${(totalEstimated/initActivities.length).toFixed(0)}`, sub:'Por atividade', color:'bg-violet-500', icon:BarChart3},
        ].map((k,i)=>(
          <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className={`w-9 h-9 rounded-xl ${k.color} flex items-center justify-center mb-3`}>
              <k.icon className="w-4 h-4 text-white" />
            </div>
            <p className="text-xl font-black text-slate-900">{k.value}</p>
            <p className="text-xs font-bold text-slate-500 mt-0.5">{k.label}</p>
            <p className="text-[11px] text-slate-400">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Cost by department */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-500" /> Custo por Departamento
          </h3>
          <div className="space-y-3">
            {byDept.map((d,i)=>(
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-bold text-slate-700">{d.dept}</span>
                  <span className="font-mono font-bold text-slate-800">R$ {d.estimated.toLocaleString('pt-BR')}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-indigo-500 h-2 rounded-full"
                    style={{ width:`${(d.estimated/totalEstimated)*100}%` }} />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">{d.count} atividade(s)</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-500" /> Custo por Atividade
          </h3>
          <div className="space-y-2">
            {initActivities.sort((a,b)=>b.cost-a.cost).map((act,i)=>(
              <div key={i} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 hover:bg-slate-50">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800 truncate">{act.title}</p>
                  <p className="text-[10px] text-slate-400">{act.department} · {act.estimatedHours}h</p>
                </div>
                <div className="text-right ml-3 shrink-0">
                  <p className="text-sm font-black text-slate-800">R$ {act.cost.toLocaleString('pt-BR')}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold
                    ${act.status==='Concluída'?'bg-emerald-100 text-emerald-700':act.status==='Atrasada'?'bg-red-100 text-red-700':'bg-slate-100 text-slate-500'}`}>
                    {act.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ZIABanner text="O departamento de Marketing concentra 52% do custo total de atividades este mês, principalmente pela Campanha Black Friday. Considere monitorar horas extras alocadas para evitar ultrapassagem de budget." />
    </div>
  );
}

// ============================================================
// ABA 6 — MÉTRICAS CUSTOMIZADAS
// ============================================================
function CustomMetricsTab() {
  const [metrics, setMetrics] = useState(initCustomMetrics);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name:'', description:'', unit:'%', formula:'', target:'',
    department:'RH', frequency:'Mensal' as CustomMetric['frequency']
  });

  const toggle = (id: string) => setMetrics(p=>p.map(m=>m.id===id?{...m,active:!m.active}:m));

  const saveMetric = () => {
    if (!form.name) return;
    setMetrics(p=>[...p,{
      id:String(Date.now()), name:form.name, description:form.description,
      unit:form.unit, formula:form.formula, target:+form.target||0,
      current:0, department:form.department, frequency:form.frequency,
      active:true, lastUpdated:new Date().toISOString().split('T')[0],
    }]);
    setShowForm(false);
    setForm({ name:'', description:'', unit:'%', formula:'', target:'', department:'RH', frequency:'Mensal' });
  };

  const getProgress = (m: CustomMetric) => Math.min(100, (m.current/m.target)*100);
  const getStatus = (m: CustomMetric) => {
    const pct = m.current/m.target;
    if (pct >= 1) return { label:'Meta atingida', color:'text-emerald-600', bg:'bg-emerald-500' };
    if (pct >= 0.8) return { label:'Próximo da meta', color:'text-indigo-600', bg:'bg-indigo-500' };
    if (pct >= 0.6) return { label:'Em progresso', color:'text-amber-600', bg:'bg-amber-500' };
    return { label:'Abaixo da meta', color:'text-red-600', bg:'bg-red-500' };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-slate-700">Métricas Customizadas</p>
          <p className="text-xs text-slate-400">{metrics.filter(m=>m.active).length} ativas de {metrics.length} configuradas</p>
        </div>
        <button onClick={()=>setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-sm">
          <Plus className="w-3.5 h-3.5" /> Nova Métrica
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {metrics.map(m=>{
          const status = getStatus(m);
          return (
            <div key={m.id} className={`bg-white rounded-2xl border shadow-sm p-5 transition-opacity ${m.active?'border-slate-100 opacity-100':'border-slate-100 opacity-50'}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-black text-slate-800 text-sm">{m.name}</p>
                  <p className="text-xs text-slate-400">{m.department} · {m.frequency}</p>
                </div>
                <button onClick={()=>toggle(m.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-colors
                    ${m.active?'bg-emerald-100 text-emerald-700 hover:bg-emerald-200':'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                  {m.active?'Ativa':'Inativa'}
                </button>
              </div>
              <p className="text-xs text-slate-500 mb-3">{m.description}</p>
              <div className="flex items-end justify-between mb-2">
                <div>
                  <p className="text-2xl font-black text-slate-900">{m.current}<span className="text-sm font-medium text-slate-400 ml-0.5">{m.unit}</span></p>
                  <p className="text-xs text-slate-400">Meta: {m.target}{m.unit}</p>
                </div>
                <p className={`text-xs font-bold ${status.color}`}>{status.label}</p>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className={`${status.bg} h-2 rounded-full transition-all`} style={{ width:`${getProgress(m)}%` }} />
              </div>
              {m.formula && (
                <p className="text-[10px] text-slate-400 mt-2 font-mono bg-slate-50 px-2 py-1 rounded">{m.formula}</p>
              )}
              <p className="text-[10px] text-slate-300 mt-1">Atualizado: {new Date(m.lastUpdated).toLocaleDateString('pt-BR')}</p>
            </div>
          );
        })}

        <button onClick={()=>setShowForm(true)}
          className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-6 text-slate-400 hover:border-indigo-300 hover:bg-indigo-50 transition-all min-h-48">
          <Plus className="w-8 h-8 mb-2" />
          <span className="font-bold text-sm">Nova Métrica</span>
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h3 className="font-black text-slate-800">Nova Métrica Customizada</h3>
              <button onClick={()=>setShowForm(false)} className="p-2 hover:bg-slate-200 rounded-full"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nome da Métrica *</label>
                <input value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="Ex: Taxa de Turnover Voluntário" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Descrição</label>
                <input value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none"
                  placeholder="O que esta métrica mede?" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Unidade</label>
                  <input value={form.unit} onChange={e=>setForm(p=>({...p,unit:e.target.value}))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                    placeholder="%, R$, h, pts..." />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Meta</label>
                  <input type="number" value={form.target} onChange={e=>setForm(p=>({...p,target:e.target.value}))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none" placeholder="0" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Departamento</label>
                  <select value={form.department} onChange={e=>setForm(p=>({...p,department:e.target.value}))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                    {['RH','TI','Marketing','Comercial','Financeiro','Empresa'].map(d=><option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Frequência</label>
                  <select value={form.frequency} onChange={e=>setForm(p=>({...p,frequency:e.target.value as any}))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
                    {['Diária','Semanal','Mensal'].map(f=><option key={f}>{f}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Fórmula de Cálculo (opcional)</label>
                <input value={form.formula} onChange={e=>setForm(p=>({...p,formula:e.target.value}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none font-mono"
                  placeholder="Ex: (Demissoes_Voluntárias / Headcount) * 100" />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-3 shrink-0">
              <button onClick={()=>setShowForm(false)} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 font-medium">Cancelar</button>
              <button onClick={saveMetric} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-sm">Criar Métrica</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// COMPONENTE PRINCIPAL — AnnotationsSection
// ============================================================
export function AnnotationsSection() {
  const [activeTab, setActiveTab] = useState<AnnotationTab>('warnings');

  const pendingWarnings = initWarnings.filter(w=>w.status==='Pendente Assinatura').length;
  const delayedActivities = initActivities.filter(a=>a.status==='Atrasada').length;

  const tabs: { id: AnnotationTab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id:'warnings',       label:'Advertências',        icon:Shield,    badge:pendingWarnings },
    { id:'custom',         label:'Anotações',            icon:FileText },
    { id:'productivity',   label:'Produtividade',        icon:TrendingUp },
    { id:'activities',     label:'Atividades',           icon:Activity,  badge:delayedActivities },
    { id:'activity-cost',  label:'Custo de Atividades',  icon:DollarSign },
    { id:'custom-metrics', label:'Métricas Customizadas',icon:BarChart3 },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-black text-slate-900">Anotações e Atividades</h2>
        <p className="text-sm text-slate-500">Advertências, registros, produtividade, atividades e métricas customizadas</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex overflow-x-auto border-b border-slate-100">
          {tabs.map(tab=>(
            <TabBtn
              key={tab.id} id={tab.id}
              label={tab.label}
              active={activeTab===tab.id}
              onClick={()=>setActiveTab(tab.id)}
              badge={tab.badge}
            />
          ))}
        </div>
        <div className="p-5">
          {activeTab==='warnings'       && <WarningsTab />}
          {activeTab==='custom'         && <CustomAnnotationsTab />}
          {activeTab==='productivity'   && <ProductivityTab />}
          {activeTab==='activities'     && <ActivitiesTab />}
          {activeTab==='activity-cost'  && <ActivityCostTab />}
          {activeTab==='custom-metrics' && <CustomMetricsTab />}
        </div>
      </div>
    </div>
  );
}
// ============================================================
// PARTE 6 — ADMISSÕES COMPLETO
// Vagas · Organograma · Cargos & Salários · Onboarding
// Benefícios · SST · Portal do Colaborador · Offboarding
// People Analytics ZIA
// ============================================================
// Integração no switch do HRModule principal:
//
// case 'admissions':       return <AdmissionsSection />;
// case 'org-chart':        return <OrgChartSection />;
// case 'salary-table':     return <SalaryTableSection />;
// case 'onboarding':       return <OnboardingSection />;
// case 'benefits':         return <BenefitsSection />;
// case 'sst':              return <SSTSection />;
// case 'employee-portal':  return <EmployeePortalSection />;
// case 'offboarding':      return <OffboardingSection />;
// case 'people-analytics': return <PeopleAnalyticsSection />;
// ============================================================

import { useState, useMemo } from 'react';
import {
  Users, Briefcase, TrendingUp, TrendingDown, Star,
  Plus, X, Search, Download, CheckCircle, AlertTriangle,
  AlertCircle, Clock, Calendar, Building, Target,
  ArrowUpRight, Bell, Sparkles, ChevronDown, ChevronRight,
  DollarSign, Heart, Shield, UserCheck, LogOut,
  BarChart2, Activity, Award, Zap, FileText,
  Edit3, Trash2, Eye, RefreshCw
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

// ============================================================
// SHARED HELPERS
// ============================================================
function ZIABanner({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2.5 p-3.5 bg-violet-50 border border-violet-200 rounded-xl">
      <Sparkles className="w-4 h-4 text-violet-600 shrink-0 mt-0.5" />
      <p className="text-sm text-violet-800">{text}</p>
    </div>
  );
}

function KPICard({ label, value, sub, color, icon: Icon, trend }: {
  label: string; value: string; sub: string;
  color: string; icon: React.ElementType; trend?: 'up' | 'down' | null;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend && (
          <span className={`flex items-center gap-0.5 text-xs font-bold ${trend === 'up' ? 'text-emerald-600' : 'text-red-500'}`}>
            {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          </span>
        )}
      </div>
      <p className="text-2xl font-black text-slate-900">{value}</p>
      <p className="text-xs font-bold text-slate-500 mt-0.5">{label}</p>
      <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>
    </div>
  );
}

function SectionHeader({ title, subtitle, action }: {
  title: string; subtitle: string;
  action?: { label: string; onClick: () => void; icon?: React.ElementType };
}) {
  const { config } = useAppContext();
  const pc = config.primaryColor;
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-xl font-black text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
      {action && (
        <button onClick={action.onClick}
          className={`flex items-center gap-2 px-4 py-2.5 bg-${pc}-600 text-white rounded-xl font-bold text-sm shadow-sm hover:bg-${pc}-700`}>
          {action.icon && <action.icon className="w-4 h-4" />}
          {action.label}
        </button>
      )}
    </div>
  );
}

// ============================================================
// MOCKS
// ============================================================
const jobOpenings = [
  { id:'1', title:'Desenvolvedor Full Stack',    dept:'TI',          level:'Pleno',      type:'CLT',     salary:'R$ 8k–12k',  status:'Aberta',     applicants:34, stage:'Triagem',      priority:'Alta',  openedAt:'2024-01-10', recruiter:'Carla Mendes'  },
  { id:'2', title:'Analista de Marketing Digital',dept:'Marketing',  level:'Junior',     type:'CLT',     salary:'R$ 4k–6k',   status:'Aberta',     applicants:67, stage:'Entrevista RH',priority:'Média', openedAt:'2024-01-05', recruiter:'Carla Mendes'  },
  { id:'3', title:'Gerente de Contas',            dept:'Comercial',  level:'Senior',     type:'CLT',     salary:'R$ 12k–18k', status:'Finalizada', applicants:22, stage:'Proposta',     priority:'Alta',  openedAt:'2023-12-20', recruiter:'Roberto Costa' },
  { id:'4', title:'Designer UX/UI',               dept:'Produto',    level:'Pleno',      type:'PJ',      salary:'R$ 6k–9k',   status:'Pausada',    applicants:18, stage:'Portfólio',    priority:'Baixa', openedAt:'2024-01-12', recruiter:'Carla Mendes'  },
  { id:'5', title:'Assistente Financeiro',         dept:'Financeiro', level:'Junior',     type:'Estágio', salary:'R$ 1.5k–2k', status:'Aberta',     applicants:91, stage:'Triagem',      priority:'Média', openedAt:'2024-01-15', recruiter:'Roberto Costa' },
];

const orgNodes = [
  { id:'ceo',  name:'Roberto Almeida', role:'CEO',           dept:'Diretoria', level:0, parentId:null,  direct:3 },
  { id:'cto',  name:'Ana Silva',       role:'CTO',           dept:'TI',        level:1, parentId:'ceo', direct:4 },
  { id:'cmo',  name:'Fernanda Lima',   role:'CMO',           dept:'Marketing', level:1, parentId:'ceo', direct:3 },
  { id:'cco',  name:'Pedro Costa',     role:'CCO',           dept:'Comercial', level:1, parentId:'ceo', direct:5 },
  { id:'dev1', name:'Lucas Pereira',   role:'Dev Senior',    dept:'TI',        level:2, parentId:'cto', direct:0 },
  { id:'dev2', name:'Julia Nunes',     role:'Dev Pleno',     dept:'TI',        level:2, parentId:'cto', direct:0 },
  { id:'mkt1', name:'João Santos',     role:'Analista Mkt',  dept:'Marketing', level:2, parentId:'cmo', direct:0 },
  { id:'com1', name:'Maria Oliveira',  role:'Vendas Sr',     dept:'Comercial', level:2, parentId:'cco', direct:0 },
];

const salaryBands = [
  { id:'1', role:'Desenvolvedor Full Stack',  dept:'TI',             levelJr:'R$ 5–7k',    levelPl:'R$ 8–12k',  levelSr:'R$ 13–18k', avg:10500, market:11200, gap:-6.3 },
  { id:'2', role:'Analista de Marketing',     dept:'Marketing',      levelJr:'R$ 3–4.5k',  levelPl:'R$ 5–7k',   levelSr:'R$ 8–11k',  avg:6200,  market:6800,  gap:-8.8 },
  { id:'3', role:'Gerente Comercial',         dept:'Comercial',      levelJr:'—',           levelPl:'R$ 10–14k', levelSr:'R$ 15–22k', avg:16500, market:15800, gap:4.4  },
  { id:'4', role:'Designer UX/UI',            dept:'Produto',        levelJr:'R$ 3.5–5k',  levelPl:'R$ 6–9k',   levelSr:'R$ 10–14k', avg:7500,  market:8100,  gap:-7.4 },
  { id:'5', role:'Assistente Administrativo', dept:'Administrativo', levelJr:'R$ 1.8–2.5k',levelPl:'R$ 2.8–3.8k',levelSr:'R$ 4–5.5k',avg:3200,  market:3000,  gap:6.7  },
];

const onboardingCandidates = [
  { id:'1', name:'Beatriz Ferreira', role:'Desenvolvedora Full Stack', dept:'TI',        startDate:'2024-02-01', status:'Em Andamento', progress:60,  buddy:'Ana Silva',      tasks:{ total:10, done:6  } },
  { id:'2', name:'Carlos Eduardo',   role:'Analista de Marketing',     dept:'Marketing', startDate:'2024-01-22', status:'Concluído',    progress:100, buddy:'João Santos',    tasks:{ total:10, done:10 } },
  { id:'3', name:'Diana Costa',      role:'Gerente de Contas',         dept:'Comercial', startDate:'2024-02-05', status:'Pendente',     progress:15,  buddy:'Maria Oliveira', tasks:{ total:10, done:1  } },
];

const benefits = [
  { id:'1', name:'Plano de Saúde',     provider:'Unimed',       cost:480, coverage:'Titular + dependentes', enrolled:48, category:'Saúde',       status:'Ativo' },
  { id:'2', name:'Plano Odontológico', provider:'OdontoPrev',   cost:85,  coverage:'Titular',               enrolled:52, category:'Saúde',       status:'Ativo' },
  { id:'3', name:'VR/VA',              provider:'Alelo',         cost:750, coverage:'Dias úteis',            enrolled:55, category:'Alimentação', status:'Ativo' },
  { id:'4', name:'VT',                 provider:'SPTrans',       cost:220, coverage:'Dias úteis',            enrolled:38, category:'Transporte',  status:'Ativo' },
  { id:'5', name:'Gympass',            provider:'Gympass',       cost:99,  coverage:'Plano Basic',           enrolled:22, category:'Bem-estar',   status:'Ativo' },
  { id:'6', name:'Seguro de Vida',     provider:'Porto Seguro',  cost:35,  coverage:'3x salário',            enrolled:55, category:'Seguro',      status:'Ativo' },
];

const sstRecords = [
  { id:'1', type:'Acidente de Trabalho', employee:'Lucas Pereira',  date:'2024-01-08', severity:'Leve',      days:2, status:'Fechado',    cat:'Acidente'    },
  { id:'2', type:'Exame Periódico',      employee:'Ana Silva',       date:'2024-01-15', severity:'—',         days:0, status:'Agendado',   cat:'Exame'       },
  { id:'3', type:'Treinamento NR-10',    employee:'Equipe TI',       date:'2024-01-20', severity:'—',         days:0, status:'Concluído',  cat:'Treinamento' },
  { id:'4', type:'Quase-acidente',       employee:'João Santos',     date:'2024-01-22', severity:'Sem lesão', days:0, status:'Investigado',cat:'Incidente'   },
  { id:'5', type:'Exame Admissional',    employee:'Beatriz Ferreira',date:'2024-01-30', severity:'—',         days:0, status:'Concluído',  cat:'Exame'       },
];

const offboardingList = [
  { id:'1', name:'Rodrigo Mendes', role:'Dev Backend',  dept:'TI',      lastDay:'2024-01-31', type:'Demissão',           reason:'Oportunidade externa', status:'Em Andamento', progress:70, tasks:{ total:8, done:5 } },
  { id:'2', name:'Camila Torres',  role:'Analista RH',  dept:'RH',      lastDay:'2024-02-15', type:'Pedido de Demissão', reason:'Mudança de cidade',    status:'Iniciado',     progress:20, tasks:{ total:8, done:1 } },
];

const analyticsData = {
  headcount: { current:55, prev:52, growth:5.8 },
  turnover: { rate:8.2, voluntary:5.1, involuntary:3.1 },
  avgTenure: 2.8,
  engagementScore: 74,
  timeToHire: 28,
  costPerHire: 4200,
  absenteeism: 3.2,
  npsScore: 42,
  deptBreakdown: [
    { dept:'TI',         count:18, turnover:12.0 },
    { dept:'Comercial',  count:15, turnover:9.0  },
    { dept:'Marketing',  count:8,  turnover:5.0  },
    { dept:'RH',         count:5,  turnover:0.0  },
    { dept:'Financeiro', count:6,  turnover:8.0  },
    { dept:'Outros',     count:3,  turnover:0.0  },
  ],
};

// ============================================================
// 1. ADMISSÕES — VAGAS
// ============================================================
export function AdmissionsSection() {
  const [openings, setOpenings] = useState(jobOpenings);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todas');
  const [showNew, setShowNew] = useState(false);
  const [newJob, setNewJob] = useState({ title:'', dept:'TI', level:'Pleno', type:'CLT', salaryMin:'', salaryMax:'', priority:'Média' });

  const filtered = openings.filter(o => {
    const matchSearch = o.title.toLowerCase().includes(search.toLowerCase()) || o.dept.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'Todas' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const saveJob = () => {
    if (!newJob.title) return;
    setOpenings(p => [...p, {
      id: String(Date.now()), title: newJob.title, dept: newJob.dept,
      level: newJob.level, type: newJob.type,
      salary: `R$ ${newJob.salaryMin}–${newJob.salaryMax}`,
      status: 'Aberta', applicants: 0, stage: 'Triagem',
      priority: newJob.priority, openedAt: new Date().toISOString().split('T')[0],
      recruiter: 'Carla Mendes',
    }]);
    setShowNew(false);
    setNewJob({ title:'', dept:'TI', level:'Pleno', type:'CLT', salaryMin:'', salaryMax:'', priority:'Média' });
  };

  const statusColor: Record<string, string> = {
    'Aberta': 'bg-emerald-100 text-emerald-700',
    'Finalizada': 'bg-blue-100 text-blue-700',
    'Pausada': 'bg-amber-100 text-amber-700',
  };
  const priorityColor: Record<string, string> = {
    'Alta': 'bg-red-100 text-red-700',
    'Média': 'bg-amber-100 text-amber-700',
    'Baixa': 'bg-slate-100 text-slate-500',
  };

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Recrutamento & Seleção"
        subtitle="Gestão de vagas, candidatos e pipeline de contratação"
        action={{ label:'Nova Vaga', onClick:() => setShowNew(true), icon:Plus }}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Vagas Abertas"      value={openings.filter(o=>o.status==='Aberta').length.toString()} icon={Briefcase}  color="bg-indigo-500" sub="Ativamente recrutando" trend="up" />
        <KPICard label="Candidatos Totais"  value={openings.reduce((a,o)=>a+o.applicants,0).toString()}       icon={Users}      color="bg-blue-500"   sub="No pipeline ativo"   trend="up" />
        <KPICard label="Time-to-Hire (d)"   value={analyticsData.timeToHire.toString()}                       icon={Clock}      color="bg-amber-500"  sub="Média dias p/ contratar" />
        <KPICard label="Custo por Contrat." value={`R$ ${analyticsData.costPerHire.toLocaleString('pt-BR')}`} icon={DollarSign} color="bg-emerald-500" sub="Cost per hire" />
      </div>

      <ZIABanner text="Desenvolvedor Full Stack tem 34 candidatos há 18 dias sem feedback da área técnica. Risco de perda dos top 3 finalistas por demora. Recomendo agendar entrevistas técnicas esta semana." />

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar vaga ou departamento..."
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
        </div>
        <div className="flex border border-slate-200 rounded-xl overflow-hidden bg-white">
          {['Todas','Aberta','Pausada','Finalizada'].map(f => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={`px-3 py-2 text-xs font-bold transition-colors ${statusFilter===f ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
              {f}
            </button>
          ))}
        </div>
        <button className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 hover:bg-slate-50">
          <Download className="w-3.5 h-3.5" /> Exportar
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>{['Vaga','Dept','Nível','Tipo','Salário','Candidatos','Etapa','Prior.','Status','Ações'].map(h=>(
              <th key={h} className="p-3 text-[10px] font-bold text-slate-400 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(o => (
              <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-3"><p className="text-sm font-bold text-slate-800">{o.title}</p><p className="text-[11px] text-slate-400">{o.recruiter}</p></td>
                <td className="p-3 text-xs text-slate-500">{o.dept}</td>
                <td className="p-3 text-xs text-slate-600">{o.level}</td>
                <td className="p-3"><span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">{o.type}</span></td>
                <td className="p-3 text-xs font-mono text-slate-600">{o.salary}</td>
                <td className="p-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-black text-indigo-600">{o.applicants}</span>
                    <div className="w-10 bg-slate-100 rounded-full h-1.5">
                      <div className="bg-indigo-400 h-1.5 rounded-full" style={{ width:`${Math.min(100,o.applicants)}%` }} />
                    </div>
                  </div>
                </td>
                <td className="p-3"><span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">{o.stage}</span></td>
                <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded font-bold ${priorityColor[o.priority]}`}>{o.priority}</span></td>
                <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full font-bold ${statusColor[o.status]??'bg-slate-100 text-slate-600'}`}>{o.status}</span></td>
                <td className="p-3"><button className="flex items-center gap-1 text-xs text-indigo-600 font-bold hover:underline"><ArrowUpRight className="w-3 h-3" />Ver</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="p-8 text-center text-slate-400"><Briefcase className="w-8 h-8 mx-auto mb-2 opacity-40"/><p>Nenhuma vaga encontrada</p></div>}
      </div>

      {showNew && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h3 className="font-black text-slate-800">Abrir Nova Vaga</h3>
              <button onClick={()=>setShowNew(false)} className="p-2 hover:bg-slate-200 rounded-full"><X className="w-4 h-4"/></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Título da Vaga *</label>
                <input value={newJob.title} onChange={e=>setNewJob(p=>({...p,title:e.target.value}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  placeholder="Ex: Desenvolvedor Full Stack" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Departamento</label>
                  <select value={newJob.dept} onChange={e=>setNewJob(p=>({...p,dept:e.target.value}))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none">
                    {['TI','Marketing','Comercial','RH','Financeiro','Produto','Administrativo'].map(d=><option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nível</label>
                  <select value={newJob.level} onChange={e=>setNewJob(p=>({...p,level:e.target.value}))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none">
                    {['Estágio','Junior','Pleno','Senior','Especialista','Gerente','Diretor'].map(l=><option key={l}>{l}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tipo</label>
                  <select value={newJob.type} onChange={e=>setNewJob(p=>({...p,type:e.target.value}))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none">
                    {['CLT','PJ','Estágio','Temporário'].map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Salário Min</label>
                  <input value={newJob.salaryMin} onChange={e=>setNewJob(p=>({...p,salaryMin:e.target.value}))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none" placeholder="5000"/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Salário Max</label>
                  <input value={newJob.salaryMax} onChange={e=>setNewJob(p=>({...p,salaryMax:e.target.value}))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none" placeholder="8000"/>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Prioridade</label>
                <div className="flex gap-2">
                  {['Alta','Média','Baixa'].map(p=>(
                    <button key={p} onClick={()=>setNewJob(prev=>({...prev,priority:p}))}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all
                        ${newJob.priority===p ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-3 shrink-0">
              <button onClick={()=>setShowNew(false)} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 font-medium">Cancelar</button>
              <button onClick={saveJob} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700">Abrir Vaga</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// 2. ORGANOGRAMA
// ============================================================
export function OrgChartSection() {
  const [expandedIds, setExpandedIds] = useState(['ceo','cto','cmo','cco']);
  const [selected, setSelected] = useState<typeof orgNodes[0]|null>(null);

  const toggle = (id: string) =>
    setExpandedIds(p => p.includes(id) ? p.filter(x=>x!==id) : [...p,id]);

  const deptColors: Record<string,string> = {
    TI: 'bg-blue-50 border-blue-300 text-blue-800',
    Marketing: 'bg-pink-50 border-pink-300 text-pink-800',
    Comercial: 'bg-amber-50 border-amber-300 text-amber-800',
    Diretoria: 'bg-indigo-50 border-indigo-300 text-indigo-800',
  };

  const OrgNode = ({ node, depth=0 }: { node: typeof orgNodes[0]; depth?: number }) => {
    const children = orgNodes.filter(n => n.parentId === node.id);
    const isExpanded = expandedIds.includes(node.id);
    const colorClass = deptColors[node.dept] ?? 'bg-slate-50 border-slate-300 text-slate-800';
    return (
      <div className="flex flex-col items-center">
        <div onClick={()=>setSelected(node)}
          className={`cursor-pointer p-3 rounded-2xl border-2 w-36 text-center transition-all hover:shadow-md relative
            ${colorClass} ${selected?.id===node.id ? 'ring-2 ring-offset-2 ring-indigo-500 shadow-lg' : ''}`}>
          <div className="w-9 h-9 rounded-full bg-white border-2 border-current mx-auto mb-1 flex items-center justify-center text-xs font-black">
            {node.name.split(' ').map(n=>n[0]).join('').substring(0,2)}
          </div>
          <p className="text-xs font-black leading-tight truncate">{node.name}</p>
          <p className="text-[10px] opacity-60 truncate">{node.role}</p>
          {children.length > 0 && (
            <button onClick={e=>{e.stopPropagation();toggle(node.id);}}
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border-2 border-current rounded-full flex items-center justify-center z-10">
              {isExpanded ? <ChevronDown className="w-3 h-3"/> : <ChevronRight className="w-3 h-3"/>}
            </button>
          )}
        </div>
        {children.length > 0 && isExpanded && (
          <div className="mt-5 pt-0 relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-4 bg-slate-300" />
            <div className="flex gap-4 mt-4 relative">
              {children.length > 1 && (
                <div className="absolute top-0 left-[18px] right-[18px] h-px bg-slate-300" />
              )}
              {children.map(child => (
                <div key={child.id} className="flex flex-col items-center">
                  <div className="w-px h-4 bg-slate-300" />
                  <OrgNode node={child} depth={depth+1} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const root = orgNodes.find(n=>n.level===0)!;

  return (
    <div className="space-y-5">
      <SectionHeader title="Organograma" subtitle="Estrutura hierárquica e relações de reporte" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Headcount Total"    value="55"  icon={Users}    color="bg-indigo-500" sub="Colaboradores ativos" />
        <KPICard label="Departamentos"       value="7"   icon={Building} color="bg-blue-500"   sub="Áreas ativas" />
        <KPICard label="Span de Controle"   value="4.2" icon={Target}   color="bg-emerald-500" sub="Diretos por gestor" />
        <KPICard label="Níveis Hierárquicos" value="4"   icon={TrendingUp} color="bg-amber-500" sub="Camadas de gestão" />
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 overflow-x-auto">
        <div className="min-w-max flex justify-center pb-4">
          <OrgNode node={root} />
        </div>
      </div>
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-indigo-50 px-5 py-4 border-b border-indigo-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Perfil no Organograma</h3>
              <button onClick={()=>setSelected(null)} className="p-2 hover:bg-indigo-100 rounded-full"><X className="w-4 h-4"/></button>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-lg">
                  {selected.name.split(' ').map(n=>n[0]).join('').substring(0,2)}
                </div>
                <div>
                  <p className="font-black text-slate-800 text-lg">{selected.name}</p>
                  <p className="text-sm text-slate-500">{selected.role}</p>
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold">{selected.dept}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl"><p className="text-xs text-slate-400">Nível</p><p className="font-bold text-slate-700">Nível {selected.level+1}</p></div>
                <div className="p-3 bg-slate-50 rounded-xl"><p className="text-xs text-slate-400">Diretos</p><p className="font-bold text-slate-700">{selected.direct} pessoas</p></div>
              </div>
            </div>
            <div className="px-5 pb-5 flex justify-end">
              <button onClick={()=>setSelected(null)} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// 3. CARGOS & SALÁRIOS
// ============================================================
export function SalaryTableSection() {
  const [search, setSearch] = useState('');
  const [bands, setBands] = useState(salaryBands);
  const [showNewRoleModal, setShowNewRoleModal] = useState(false);
  const [newRoleForm, setNewRoleForm] = useState({
    nome: '',
    tipo: 'CLT',
    grupoSalario: '',
    atividadesDiarias: '',
    atividadesSemanais: '',
    atividadesMensais: '',
    intervaloPersonalizado: '',
    atividadePersonalizada: '',
    salarioBase: '',
    custoDireto: '',
    custoIndireto: '',
    imposto: ''
  });

  const filtered = bands.filter(b =>
    b.role.toLowerCase().includes(search.toLowerCase()) ||
    b.dept.toLowerCase().includes(search.toLowerCase())
  );

  const handleSaveRole = () => {
    if (!newRoleForm.nome) return;

    // Add to bands (mock update for now)
    const newBand = {
      id: String(Date.now()),
      role: newRoleForm.nome,
      dept: 'A Definir', // Can add dept to form if needed
      levelJr: `R$ ${newRoleForm.salarioBase}`,
      levelPl: '-',
      levelSr: '-',
      avg: Number(newRoleForm.salarioBase) || 0,
      market: 0,
      gap: 0,
    };

    setBands(prev => [...prev, newBand]);
    setShowNewRoleModal(false);
    setNewRoleForm({
      nome: '', tipo: 'CLT', grupoSalario: '',
      atividadesDiarias: '', atividadesSemanais: '', atividadesMensais: '',
      intervaloPersonalizado: '', atividadePersonalizada: '',
      salarioBase: '', custoDireto: '', custoIndireto: '', imposto: ''
    });
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="Cargos & Salários" subtitle="Tabela salarial por função e nível — comparativo com o mercado"
        action={{ label:'Novo Cargo', onClick:()=>setShowNewRoleModal(true), icon:Plus }} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Cargos Mapeados"   value={bands.length.toString()}                           icon={Briefcase}   color="bg-indigo-500"  sub="Posições cadastradas" />
        <KPICard label="Abaixo do Mercado" value={bands.filter(b=>b.gap<0).length.toString()}        icon={TrendingDown} color="bg-red-500"    sub="Risco de turnover" />
        <KPICard label="Acima do Mercado"  value={bands.filter(b=>b.gap>0).length.toString()}        icon={TrendingUp}   color="bg-emerald-500" sub="Competitivos" />
        <KPICard label="Gap Médio"         value={`${Math.abs(bands.reduce((a,b)=>a+b.gap,0)/bands.length).toFixed(1)}%`} icon={Target} color="bg-amber-500" sub="Desvio vs. mercado" />
      </div>
      <ZIABanner text="TI e Design estão 7–9% abaixo do mercado. Aquecimento do setor tech em 2024 aumenta o risco de perda de talentos. Recomendo revisão salarial nessas funções no próximo ciclo." />
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar cargo ou departamento..."
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"/>
        </div>
        <button className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 hover:bg-slate-50">
          <Download className="w-3.5 h-3.5"/> Exportar
        </button>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>{['Cargo','Depto','Junior','Pleno','Senior','Praticada','Mercado','Gap'].map(h=>(
              <th key={h} className="p-3 text-[10px] font-bold text-slate-400 uppercase">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(b => (
              <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-3 text-sm font-bold text-slate-800">{b.role}</td>
                <td className="p-3 text-xs text-slate-500">{b.dept}</td>
                <td className="p-3 text-xs font-mono text-slate-600">{b.levelJr}</td>
                <td className="p-3 text-xs font-mono text-slate-600">{b.levelPl}</td>
                <td className="p-3 text-xs font-mono text-slate-600">{b.levelSr}</td>
                <td className="p-3 text-sm font-mono font-bold text-slate-800">R$ {b.avg.toLocaleString('pt-BR')}</td>
                <td className="p-3 text-sm font-mono text-slate-500">R$ {b.market.toLocaleString('pt-BR')}</td>
                <td className="p-3">
                  <span className={`text-xs font-black px-2 py-1 rounded-full
                    ${b.gap < -5 ? 'bg-red-100 text-red-700' : b.gap > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {b.gap > 0 ? '+' : ''}{b.gap.toFixed(1)}%
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

// ============================================================
// 4. ONBOARDING
// ============================================================
export function OnboardingSection() {
  const [candidates] = useState(onboardingCandidates);
  const [selected, setSelected] = useState<typeof onboardingCandidates[0]|null>(null);

  const checklistItems = [
    'Assinatura de contrato','Criação de e-mail corporativo','Acesso aos sistemas',
    'Apresentação à equipe','Treinamento de boas-vindas','Configuração do equipamento',
    'Tour pelas instalações','Definição de metas 30/60/90d','Reunião com gestor direto','Avaliação de integração',
  ];

  const statusColor: Record<string,string> = {
    'Em Andamento':'bg-blue-100 text-blue-700',
    'Concluído':'bg-emerald-100 text-emerald-700',
    'Pendente':'bg-amber-100 text-amber-700',
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="Onboarding" subtitle="Acompanhamento da integração de novos colaboradores"
        action={{ label:'Novo Onboarding', onClick:()=>{}, icon:Plus }} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Em Andamento" value={candidates.filter(c=>c.status==='Em Andamento').length.toString()} icon={RefreshCw}   color="bg-blue-500"    sub="Integrações ativas" />
        <KPICard label="Concluídos"   value={candidates.filter(c=>c.status==='Concluído').length.toString()}    icon={CheckCircle} color="bg-emerald-500" sub="Este mês" />
        <KPICard label="Pendentes"    value={candidates.filter(c=>c.status==='Pendente').length.toString()}     icon={Clock}       color="bg-amber-500"   sub="Aguardando início" />
        <KPICard label="Taxa Conclusão" value="87%" icon={Target} color="bg-indigo-500" sub="Onboardings completos" trend="up" />
      </div>
      <ZIABanner text="Beatriz Ferreira está em dia com o onboarding (60%), mas ainda não completou os acessos aos sistemas. Sugestão: enviar lembrete ao TI para provisionamento urgente." />
      <div className="space-y-4">
        {candidates.map(c => (
          <div key={c.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-sm">
                  {c.name.split(' ').map(n=>n[0]).join('').substring(0,2)}
                </div>
                <div>
                  <p className="font-black text-slate-800">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.role} · {c.dept}</p>
                  <p className="text-xs text-slate-400">Início: {new Date(c.startDate).toLocaleDateString('pt-BR')} · Buddy: {c.buddy}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${statusColor[c.status]}`}>{c.status}</span>
                <button onClick={()=>setSelected(c)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100">
                  <Eye className="w-3 h-3"/> Checklist
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-slate-100 rounded-full h-2.5">
                <div className={`h-2.5 rounded-full ${c.progress===100?'bg-emerald-500':c.progress>50?'bg-blue-500':'bg-amber-500'}`}
                  style={{ width:`${c.progress}%` }} />
              </div>
              <span className="text-sm font-black text-slate-700 w-10 text-right">{c.progress}%</span>
              <span className="text-xs text-slate-400">{c.tasks.done}/{c.tasks.total}</span>
            </div>
          </div>
        ))}
      </div>
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div><h3 className="font-bold text-slate-800">Checklist — {selected.name}</h3>
                <p className="text-xs text-slate-500">{selected.tasks.done}/{selected.tasks.total} tarefas concluídas</p></div>
              <button onClick={()=>setSelected(null)} className="p-2 hover:bg-slate-200 rounded-full"><X className="w-4 h-4"/></button>
            </div>
            <div className="p-5 overflow-y-auto space-y-2">
              {checklistItems.map((item,i) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border
                  ${i < selected.tasks.done ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
                    ${i < selected.tasks.done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                    {i < selected.tasks.done && <CheckCircle className="w-3 h-3 text-white"/>}
                  </div>
                  <p className={`text-sm ${i < selected.tasks.done ? 'text-emerald-700 line-through' : 'text-slate-700'}`}>{item}</p>
                </div>
              ))}
            </div>
            <div className="px-5 pb-5 flex justify-end shrink-0">
              <button onClick={()=>setSelected(null)} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// 5. BENEFÍCIOS
// ============================================================
export function BenefitsSection() {
  const [benefitList] = useState(benefits);

  const totalCost = benefitList.reduce((a,b) => a + b.cost * b.enrolled, 0);
  const categoryColors: Record<string,string> = {
    'Saúde': 'bg-red-100 text-red-700',
    'Alimentação': 'bg-orange-100 text-orange-700',
    'Transporte': 'bg-blue-100 text-blue-700',
    'Bem-estar': 'bg-emerald-100 text-emerald-700',
    'Seguro': 'bg-purple-100 text-purple-700',
  };

  const byCategory = useMemo(() => {
    const map: Record<string,{cost:number}> = {};
    benefitList.forEach(b => {
      if (!map[b.category]) map[b.category] = { cost:0 };
      map[b.category].cost += b.cost * b.enrolled;
    });
    return Object.entries(map).map(([cat,v]) => ({ cat, cost:v.cost, pct:Math.round(v.cost/totalCost*100) }));
  }, [benefitList]);

  return (
    <div className="space-y-5">
      <SectionHeader title="Benefícios" subtitle="Gestão e custos do pacote de benefícios da empresa"
        action={{ label:'Novo Benefício', onClick:()=>{}, icon:Plus }} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Custo Total/mês"   value={`R$ ${(totalCost/1000).toFixed(0)}k`}      icon={DollarSign}  color="bg-indigo-500" sub="Todos os benefícios" />
        <KPICard label="Benefícios Ativos" value={benefitList.filter(b=>b.status==='Ativo').length.toString()} icon={Heart} color="bg-red-500" sub="Programas vigentes" />
        <KPICard label="Colaboradores"     value="55"                                          icon={Users}       color="bg-emerald-500" sub="Elegíveis" />
        <KPICard label="Custo per Capita"  value={`R$ ${Math.round(totalCost/55).toLocaleString('pt-BR')}`} icon={Target} color="bg-amber-500" sub="Por colaborador/mês" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>{['Benefício','Fornecedor','Categoria','Cobertura','Custo Unit.','Adesões','Total/mês'].map(h=>(
                <th key={h} className="p-3 text-[10px] font-bold text-slate-400 uppercase">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {benefitList.map(b => (
                <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 text-sm font-bold text-slate-800">{b.name}</td>
                  <td className="p-3 text-xs text-slate-500">{b.provider}</td>
                  <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full font-bold ${categoryColors[b.category]??'bg-slate-100 text-slate-600'}`}>{b.category}</span></td>
                  <td className="p-3 text-xs text-slate-500">{b.coverage}</td>
                  <td className="p-3 font-mono text-sm">R$ {b.cost.toLocaleString('pt-BR')}</td>
                  <td className="p-3 text-sm font-bold text-indigo-600">{b.enrolled}</td>
                  <td className="p-3 font-mono text-sm font-bold text-slate-800">R$ {(b.cost*b.enrolled).toLocaleString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <h3 className="font-bold text-slate-800 text-sm mb-3">Distribuição por Categoria</h3>
            <div className="space-y-2.5">
              {byCategory.sort((a,b)=>b.cost-a.cost).map((c,i)=>(
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-bold text-slate-600">{c.cat}</span>
                    <span className="text-slate-400">{c.pct}%</span>
                  </div>
                  <div className="bg-slate-100 rounded-full h-2">
                    <div className="bg-indigo-500 h-2 rounded-full" style={{ width:`${c.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <ZIABanner text="Gympass tem 40% de adesão — abaixo do esperado. Um comunicado interno pode aumentar o engajamento sem custo adicional para a empresa." />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 6. SST
// ============================================================
export function SSTSection() {
  const [records, setRecords] = useState(sstRecords);
  const [showNew, setShowNew] = useState(false);
  const [newRecord, setNewRecord] = useState({ type:'', employee:'', date:'', cat:'Exame' });

  const catColors: Record<string,string> = {
    'Acidente':'bg-red-100 text-red-700', 'Exame':'bg-blue-100 text-blue-700',
    'Treinamento':'bg-emerald-100 text-emerald-700', 'Incidente':'bg-amber-100 text-amber-700',
  };
  const statusColors: Record<string,string> = {
    'Fechado':'bg-slate-100 text-slate-600', 'Agendado':'bg-blue-100 text-blue-700',
    'Concluído':'bg-emerald-100 text-emerald-700', 'Investigado':'bg-amber-100 text-amber-700',
  };

  const saveRecord = () => {
    if (!newRecord.type || !newRecord.employee || !newRecord.date) return;
    setRecords(p => [...p, { id:String(Date.now()), type:newRecord.type, employee:newRecord.employee,
      date:newRecord.date, severity:newRecord.cat==='Acidente'?'Leve':'—', days:0, status:'Agendado', cat:newRecord.cat }]);
    setShowNew(false);
    setNewRecord({ type:'', employee:'', date:'', cat:'Exame' });
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="Saúde & Segurança do Trabalho" subtitle="Acidentes, exames periódicos, treinamentos NR e incidentes"
        action={{ label:'Registrar Ocorrência', onClick:()=>setShowNew(true), icon:Plus }} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Acidentes"         value={records.filter(r=>r.cat==='Acidente').length.toString()}    icon={AlertTriangle} color="bg-red-500"     sub="No período" />
        <KPICard label="Exames Agendados"  value={records.filter(r=>r.cat==='Exame').length.toString()}       icon={Heart}         color="bg-blue-500"    sub="Periódicos e admissionais" />
        <KPICard label="Treinamentos NR"   value={records.filter(r=>r.cat==='Treinamento').length.toString()} icon={Award}         color="bg-emerald-500" sub="Concluídos" />
        <KPICard label="Dias Afastados"    value={records.reduce((a,r)=>a+r.days,0).toString()}               icon={Clock}         color="bg-amber-500"   sub="Por acidentes" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>{['Tipo','Colaborador/Grupo','Data','Categoria','Gravidade','Dias','Status'].map(h=>(
                <th key={h} className="p-3 text-[10px] font-bold text-slate-400 uppercase">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {records.map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="p-3 text-sm font-medium text-slate-800">{r.type}</td>
                  <td className="p-3 text-xs text-slate-600">{r.employee}</td>
                  <td className="p-3 text-xs text-slate-500">{new Date(r.date).toLocaleDateString('pt-BR')}</td>
                  <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded font-bold ${catColors[r.cat]}`}>{r.cat}</span></td>
                  <td className="p-3 text-xs text-slate-500">{r.severity}</td>
                  <td className="p-3 text-sm font-bold text-slate-700">{r.days>0?`${r.days}d`:'—'}</td>
                  <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded font-bold ${statusColors[r.status]}`}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <h3 className="font-bold text-slate-800 text-sm mb-3">NRs Obrigatórias</h3>
            <div className="space-y-2">
              {[
                { nr:'NR-01', desc:'Disposições Gerais',  status:'OK' },
                { nr:'NR-06', desc:'EPIs',                status:'OK' },
                { nr:'NR-09', desc:'PPRA',                status:'OK' },
                { nr:'NR-10', desc:'Segurança Elétrica',  status:'Vencendo' },
                { nr:'NR-17', desc:'Ergonomia',           status:'Pendente' },
              ].map((nr,i) => (
                <div key={i} className="flex items-center justify-between">
                  <div><span className="text-xs font-bold text-slate-700">{nr.nr}</span><span className="text-xs text-slate-400 ml-1">— {nr.desc}</span></div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold
                    ${nr.status==='OK'?'bg-emerald-100 text-emerald-700':nr.status==='Vencendo'?'bg-amber-100 text-amber-700':'bg-red-100 text-red-700'}`}>
                    {nr.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <ZIABanner text="NR-17 (Ergonomia) está com laudo vencido. Prazo legal expirou. Risco de autuação fiscal. Recomendo contratar empresa especializada esta semana." />
        </div>
      </div>
      {showNew && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Registrar Ocorrência SST</h3>
              <button onClick={()=>setShowNew(false)} className="p-2 hover:bg-slate-200 rounded-full"><X className="w-4 h-4"/></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tipo *</label>
                <input value={newRecord.type} onChange={e=>setNewRecord(p=>({...p,type:e.target.value}))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none" placeholder="Ex: Acidente de Trabalho"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Colaborador/Grupo</label>
                  <input value={newRecord.employee} onChange={e=>setNewRecord(p=>({...p,employee:e.target.value}))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none" placeholder="Nome ou grupo"/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Data</label>
                  <input type="date" value={newRecord.date} onChange={e=>setNewRecord(p=>({...p,date:e.target.value}))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none"/>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Categoria</label>
                <div className="flex gap-2 flex-wrap">
                  {['Acidente','Exame','Treinamento','Incidente'].map(cat => (
                    <button key={cat} onClick={()=>setNewRecord(p=>({...p,cat}))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all
                        ${newRecord.cat===cat?'bg-indigo-600 text-white border-indigo-600':'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-5 pb-5 flex justify-end gap-3">
              <button onClick={()=>setShowNew(false)} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600">Cancelar</button>
              <button onClick={saveRecord} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700">Registrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// 7. PORTAL DO COLABORADOR
// ============================================================
export function EmployeePortalSection() {
  const emp = { name:'Ana Silva', role:'Desenvolvedora Senior', dept:'TI', manager:'Carlos Souza',
    admission:'10/03/2022', salary:12500, vacation:30, hourBank:8.5, warnings:0 };

  const requests = [
    { id:'1', type:'Alteração de Ponto', status:'Aprovado',   date:'20/01/2024', desc:'Esqueci de registrar saída dia 18/01' },
    { id:'2', type:'Folga',              status:'Pendente',   date:'25/01/2024', desc:'Folga compensatória dia 05/02' },
    { id:'3', type:'Holerite',           status:'Disponível', date:'15/01/2024', desc:'Holerite Jan/2024' },
  ];

  const statusColor: Record<string,string> = {
    'Aprovado':'bg-emerald-100 text-emerald-700', 'Pendente':'bg-amber-100 text-amber-700',
    'Disponível':'bg-blue-100 text-blue-700', 'Rejeitado':'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="Portal do Colaborador" subtitle="Acesso centralizado a informações, solicitações e documentos" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex flex-col items-center text-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-xl mb-3">AS</div>
            <p className="font-black text-slate-800 text-lg">{emp.name}</p>
            <p className="text-sm text-slate-500">{emp.role}</p>
            <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full font-bold mt-1">{emp.dept}</span>
          </div>
          <div className="space-y-2 text-sm">
            {[{label:'Gestor',value:emp.manager},{label:'Admissão',value:emp.admission},{label:'Salário',value:`R$ ${emp.salary.toLocaleString('pt-BR')}`}].map((row,i)=>(
              <div key={i} className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-slate-400 text-xs">{row.label}</span>
                <span className="font-bold text-slate-700 text-xs">{row.value}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4">
            {[{label:'Férias',value:`${emp.vacation}d`,color:'text-blue-600'},{label:'B. Horas',value:`+${emp.hourBank}h`,color:'text-emerald-600'},{label:'Advertências',value:'0',color:'text-slate-600'}].map((k,i)=>(
              <div key={i} className="bg-slate-50 rounded-xl p-2 text-center">
                <p className={`text-sm font-black ${k.color}`}>{k.value}</p>
                <p className="text-[10px] text-slate-400">{k.label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h3 className="font-bold text-slate-800 mb-3">Ações Rápidas</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { label:'Baixar Holerite', icon:FileText, color:'bg-indigo-50 text-indigo-700 hover:bg-indigo-100' },
                { label:'Solicitar Folga', icon:Calendar, color:'bg-blue-50 text-blue-700 hover:bg-blue-100' },
                { label:'Alterar Ponto',   icon:Clock,    color:'bg-amber-50 text-amber-700 hover:bg-amber-100' },
                { label:'Ver Benefícios',  icon:Heart,    color:'bg-red-50 text-red-700 hover:bg-red-100' },
              ].map((a,i)=>(
                <button key={i} className={`flex flex-col items-center gap-2 p-3 rounded-xl text-xs font-bold transition-colors ${a.color}`}>
                  <a.icon className="w-5 h-5"/>{a.label}
                </button>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100"><h3 className="font-bold text-slate-800 text-sm">Minhas Solicitações</h3></div>
            <div className="divide-y divide-slate-50">
              {requests.map(r=>(
                <div key={r.id} className="flex items-center justify-between p-4 hover:bg-slate-50">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{r.type}</p>
                    <p className="text-xs text-slate-400">{r.desc} · {r.date}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${statusColor[r.status]}`}>{r.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 8. OFFBOARDING
// ============================================================
export function OffboardingSection() {
  const [list] = useState(offboardingList);
  const [selected, setSelected] = useState<typeof offboardingList[0]|null>(null);

  const offboardTasks = [
    'Entrevista de desligamento','Devolução de equipamentos','Revogação de acessos',
    'Quitação financeira','Homologação sindical','Comunicado à equipe',
    'Transferência de conhecimento','Documentação CTPS/rescisão',
  ];

  const typeColors: Record<string,string> = {
    'Demissão':'bg-red-100 text-red-700','Pedido de Demissão':'bg-amber-100 text-amber-700',
  };
  const statusColors: Record<string,string> = {
    'Em Andamento':'bg-blue-100 text-blue-700','Iniciado':'bg-amber-100 text-amber-700','Concluído':'bg-emerald-100 text-emerald-700',
  };

  return (
    <div className="space-y-5">
      <SectionHeader title="Offboarding" subtitle="Gestão do processo de desligamento com checklist e entrevista de saída"
        action={{ label:'Iniciar Offboarding', onClick:()=>{}, icon:Plus }} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Em Processo"       value={list.filter(l=>l.status!=='Concluído').length.toString()} icon={LogOut}      color="bg-red-500"     sub="Desligamentos ativos" />
        <KPICard label="Concluídos (mês)"  value="3"                                                        icon={CheckCircle} color="bg-emerald-500" sub="Fechados este mês" />
        <KPICard label="Turnover Mensal"   value="1.8%"                                                     icon={TrendingDown} color="bg-amber-500"  sub="Vs 2.1% último mês" trend="up" />
        <KPICard label="Satisfação (Exit)" value="7.4/10"                                                   icon={Star}        color="bg-indigo-500"  sub="Média entrevistas saída" />
      </div>
      <ZIABanner text="Rodrigo Mendes e Camila Torres mencionaram 'remuneração abaixo do mercado' como motivo de saída. Padrão idêntico às 3 saídas anteriores de TI e RH. Revisar tabela salarial urgentemente." />
      <div className="space-y-4">
        {list.map(l=>(
          <div key={l.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center text-red-700 font-black text-sm">
                  {l.name.split(' ').map(n=>n[0]).join('').substring(0,2)}
                </div>
                <div>
                  <p className="font-black text-slate-800">{l.name}</p>
                  <p className="text-xs text-slate-500">{l.role} · {l.dept}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded font-bold ${typeColors[l.type]}`}>{l.type}</span>
                    <span className="text-xs text-slate-400">Último dia: {new Date(l.lastDay).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${statusColors[l.status]}`}>{l.status}</span>
                <button onClick={()=>setSelected(l)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-100">
                  <Eye className="w-3 h-3"/> Checklist
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 italic flex-1 truncate">{l.reason}</span>
              <div className="w-32 bg-slate-100 rounded-full h-2">
                <div className={`h-2 rounded-full ${l.progress===100?'bg-emerald-500':l.progress>50?'bg-blue-500':'bg-amber-500'}`}
                  style={{ width:`${l.progress}%` }} />
              </div>
              <span className="text-sm font-black text-slate-700">{l.progress}%</span>
              <span className="text-xs text-slate-400">{l.tasks.done}/{l.tasks.total}</span>
            </div>
          </div>
        ))}
      </div>
      {selected && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-slate-800">Offboarding — {selected.name}</h3>
              <button onClick={()=>setSelected(null)} className="p-2 hover:bg-slate-200 rounded-full"><X className="w-4 h-4"/></button>
            </div>
            <div className="p-5 overflow-y-auto space-y-2">
              {offboardTasks.map((task,i)=>(
                <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border
                  ${i < selected.tasks.done ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-200'}`}>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0
                    ${i < selected.tasks.done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                    {i < selected.tasks.done && <CheckCircle className="w-3 h-3 text-white"/>}
                  </div>
                  <p className={`text-sm ${i < selected.tasks.done ? 'text-emerald-700 line-through' : 'text-slate-700'}`}>{task}</p>
                </div>
              ))}
            </div>
            <div className="px-5 pb-5 flex justify-end shrink-0">
              <button onClick={()=>setSelected(null)} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// 9. PEOPLE ANALYTICS ZIA
// ============================================================
export function PeopleAnalyticsSection() {
  const [period, setPeriod] = useState('Jan/2024');
  const d = analyticsData;

  const mainMetrics = [
    { label:'Headcount',       value:d.headcount.current.toString(), sub:`${d.headcount.prev} anterior`, trend:'up' as const,   icon:Users,      color:'bg-indigo-500' },
    { label:'Turnover Anual',  value:`${d.turnover.rate}%`,          sub:`${d.turnover.voluntary}% voluntário`, trend:'down' as const, icon:TrendingDown, color:'bg-red-500' },
    { label:'Tempo de Casa',   value:`${d.avgTenure}a`,              sub:'Média geral',         trend:null,          icon:Clock,      color:'bg-amber-500' },
    { label:'Engajamento',     value:`${d.engagementScore}/100`,     sub:'Score interno',       trend:'up' as const, icon:Zap,        color:'bg-emerald-500' },
    { label:'Time-to-Hire',    value:`${d.timeToHire}d`,             sub:'Dias recrutamento',   trend:null,          icon:Briefcase,  color:'bg-blue-500' },
    { label:'Custo/Contrat.',  value:`R$ ${d.costPerHire.toLocaleString('pt-BR')}`, sub:'All-in cost', trend:null, icon:DollarSign, color:'bg-purple-500' },
    { label:'Absenteísmo',     value:`${d.absenteeism}%`,            sub:'Meta: < 2.5%',        trend:'down' as const, icon:AlertCircle, color:'bg-orange-500' },
    { label:'eNPS',            value:d.npsScore.toString(),          sub:'Employee NPS',        trend:'up' as const, icon:Star,       color:'bg-pink-500' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900">People Analytics</h2>
          <p className="text-sm text-slate-500">Inteligência de dados com insights preditivos da ZIA</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={period} onChange={e=>setPeriod(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none">
            {['Jan/2024','Dez/2023','Nov/2023','Out/2023'].map(p=><option key={p}>{p}</option>)}
          </select>
          <button className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 hover:bg-slate-50">
            <Download className="w-3.5 h-3.5"/> Relatório
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {mainMetrics.slice(0,4).map((m,i)=><KPICard key={i} label={m.label} value={m.value} sub={m.sub} color={m.color} icon={m.icon} trend={m.trend} />)}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {mainMetrics.slice(4).map((m,i)=><KPICard key={i} label={m.label} value={m.value} sub={m.sub} color={m.color} icon={m.icon} trend={m.trend} />)}
      </div>

      {/* ZIA Insights */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-violet-600"/>
          <h3 className="font-black text-slate-800">Insights da ZIA — {period}</h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {[
            { type:'🔴 Risco',       text:'TI tem turnover de 12% — 47% acima da média da empresa. Combinado com salários 8% abaixo do mercado, o risco de perda de 2–3 devs nos próximos 90 dias é alto.', bg:'bg-red-50 border-red-200 text-red-800' },
            { type:'🟢 Oportunidade',text:'Engajamento subiu 6 pontos vs trimestre passado. O programa de flexibilidade remota parece ser o fator-chave. Recomendo formalizar a política de home office.', bg:'bg-emerald-50 border-emerald-200 text-emerald-800' },
            { type:'🟡 Alerta',      text:'Absenteísmo em 3.2% — acima da meta de 2.5%. Padrão concentrado em Marketing, sugerindo sobrecarga operacional na equipe de 8 pessoas.', bg:'bg-amber-50 border-amber-200 text-amber-800' },
            { type:'🔵 Tendência',   text:'Time-to-hire reduziu 18% em Q4/2023 com a nova plataforma de triagem. Projeção: 22 dias em Q1/2024 se o processo atual for mantido.', bg:'bg-blue-50 border-blue-200 text-blue-800' },
          ].map((insight,i)=>(
            <div key={i} className={`p-4 rounded-xl border ${insight.bg}`}>
              <p className="text-xs font-black uppercase tracking-wide mb-1 opacity-70">{insight.type}</p>
              <p className="text-sm leading-relaxed">{insight.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-bold text-slate-800 text-sm mb-4">Headcount & Turnover por Departamento</h3>
          <div className="space-y-3">
            {d.deptBreakdown.map((dept,i)=>(
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-bold text-slate-600 w-24">{dept.dept}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-2.5">
                  <div className="bg-indigo-500 h-2.5 rounded-full" style={{ width:`${dept.count/d.headcount.current*100}%` }} />
                </div>
                <span className="text-xs font-bold text-slate-700 w-5">{dept.count}</span>
                <span className={`text-xs font-black w-12 text-right ${dept.turnover>10?'text-red-600':dept.turnover>5?'text-amber-600':'text-emerald-600'}`}>
                  {dept.turnover}%↑
                </span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 mt-3">Barra = headcount · Percentual = turnover do depto</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h3 className="font-bold text-slate-800 text-sm mb-4">Turnover: Empresa vs Mercado</h3>
          <div className="space-y-3">
            {[
              { label:'Empresa (total)',    value:d.turnover.rate,           ref:'interno' },
              { label:'Voluntário',         value:d.turnover.voluntary,      ref:'interno' },
              { label:'Involuntário',       value:d.turnover.involuntary,    ref:'interno' },
              { label:'Benchmark Setor',    value:12.0,                      ref:'externo' },
            ].map((row,i)=>(
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs font-medium text-slate-600 w-36">{row.label}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-2">
                  <div className={`h-2 rounded-full ${row.ref==='externo'?'bg-slate-400':row.value>10?'bg-red-500':row.value>6?'bg-amber-500':'bg-emerald-500'}`}
                    style={{ width:`${row.value/20*100}%` }} />
                </div>
                <span className={`text-xs font-black w-10 text-right ${row.ref!=='externo'&&row.value>10?'text-red-600':row.ref!=='externo'&&row.value>6?'text-amber-600':'text-slate-600'}`}>
                  {row.value}%
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
            <p className="text-xs text-indigo-800 font-medium">
              ✓ Empresa está <strong>3.8pp abaixo</strong> do benchmark setorial — desempenho positivo em retenção.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
