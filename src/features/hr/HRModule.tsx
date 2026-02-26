import { useState } from 'react';
import {
  Users, Calendar, CreditCard, Clock, FileText, CheckCircle,
  AlertCircle, ChevronRight, Search, Plus, X, MoreHorizontal,
  Briefcase, TrendingUp, UserPlus, Filter, Download, ArrowUpRight,
  ShieldCheck, AlertTriangle, Building, DollarSign
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

// --- TYPES ---
type HRTab = 'dashboard' | 'employees' | 'timesheet' | 'payroll' | 'hourbank' | 'vacations' | 'annotations' | 'activities' | 'admissions';
type ContractType = 'CLT' | 'PJ' | 'Temporário' | 'Estágio';
type WorkRegime = 'Horário Fixo' | 'Escala' | 'Banco de Horas';
type EmployeeStatus = 'Ativo' | 'Inativo' | 'Afastado' | 'Férias';
type AbsenceType = 'Médica' | 'Pessoal' | 'Judicial' | 'Luto' | 'Maternidade';
type ApprovalStatus = 'Pendente' | 'Aprovado' | 'Rejeitado';
type WarningType = 'Verbal' | 'Escrita' | 'Suspensão';

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
  pis: string;
  accessLevel: string;
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

interface Warning {
  id: string;
  employeeName: string;
  type: WarningType;
  date: string;
  reason: string;
  severity: 'Baixa' | 'Média' | 'Alta';
}

// --- MOCKS ---
const mockEmployees: Employee[] = [
  { id: '1', name: 'Ana Silva', role: 'Desenvolvedora Senior', department: 'TI', manager: 'Carlos Souza', contractType: 'CLT', workRegime: 'Horário Fixo', status: 'Ativo', admissionDate: '2022-03-10', salary: 12500, email: 'ana.silva@empresa.com', cpf: '123.456.789-00', pis: '12345678900', accessLevel: 'Admin' },
  { id: '2', name: 'João Santos', role: 'Analista de Marketing', department: 'Marketing', manager: 'Fernanda Lima', contractType: 'PJ', workRegime: 'Horário Fixo', status: 'Ativo', admissionDate: '2023-01-15', salary: 8000, email: 'joao.santos@empresa.com', cpf: '234.567.890-11', pis: '23456789011', accessLevel: 'User' },
  { id: '3', name: 'Maria Oliveira', role: 'Assistente RH', department: 'RH', manager: 'Roberto Costa', contractType: 'Estágio', workRegime: 'Horário Fixo', status: 'Férias', admissionDate: '2023-06-01', salary: 1500, email: 'maria.oliveira@empresa.com', cpf: '345.678.901-22', pis: '34567890122', accessLevel: 'User' },
  { id: '4', name: 'Pedro Costa', role: 'Gerente Comercial', department: 'Comercial', manager: 'Diretoria', contractType: 'CLT', workRegime: 'Banco de Horas', status: 'Afastado', admissionDate: '2021-11-20', salary: 18000, email: 'pedro.costa@empresa.com', cpf: '456.789.012-33', pis: '45678901233', accessLevel: 'Manager' },
  { id: '5', name: 'Lucas Pereira', role: 'Suporte Técnico', department: 'TI', manager: 'Ana Silva', contractType: 'CLT', workRegime: 'Escala', status: 'Ativo', admissionDate: '2023-08-05', salary: 4500, email: 'lucas.pereira@empresa.com', cpf: '567.890.123-44', pis: '56789012344', accessLevel: 'User' },
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
  { id: '3', employeeId: '4', employeeName: 'Pedro Costa', date: '2023-10-20', hours: 2, type: 'Dia Útil', percentage: 50, value: 245.45, approvalStatus: 'Rejeitado', reason: 'Sem justificativa clara' },
];

const mockAbsences: Absence[] = [
  { id: '1', employeeId: '3', employeeName: 'Maria Oliveira', date: '2023-10-24', type: 'Médica', justified: true, document: 'atestado.pdf', financialImpact: 0, status: 'Registrada' },
  { id: '2', employeeId: '4', employeeName: 'Pedro Costa', date: '2023-10-15', type: 'Pessoal', justified: false, financialImpact: 981.81, status: 'Registrada' },
  { id: '3', employeeId: '2', employeeName: 'João Santos', date: '2023-10-10', type: 'Pessoal', justified: true, document: 'comprovante.pdf', financialImpact: 0, status: 'Pendente Documentação' },
];

const mockPayrollGroups: PayrollGroup[] = [
  { id: '1', name: 'Mensalistas - Out/23', period: '01/10/2023 - 31/10/2023', paymentDate: '05/11/2023', employeeCount: 45, totalGross: 350000, totalDeductions: 85000, totalNet: 265000, status: 'Em Processamento' },
  { id: '2', name: 'Mensalistas - Set/23', period: '01/09/2023 - 30/09/2023', paymentDate: '05/10/2023', employeeCount: 44, totalGross: 342000, totalDeductions: 82000, totalNet: 260000, status: 'Paga' },
  { id: '3', name: '13º Salário - 1ª Parcela', period: '2023', paymentDate: '30/11/2023', employeeCount: 45, totalGross: 175000, totalDeductions: 0, totalNet: 175000, status: 'Aberta' },
];

const mockWarnings: Warning[] = [
  { id: '1', employeeName: 'João Santos', type: 'Verbal', date: '2023-09-15', reason: 'Atrasos constantes', severity: 'Baixa' },
  { id: '2', employeeName: 'Pedro Costa', type: 'Escrita', date: '2023-08-20', reason: 'Uso indevido de recursos', severity: 'Média' },
  { id: '3', employeeName: 'Lucas Pereira', type: 'Suspensão', date: '2023-07-10', reason: 'Insubordinação', severity: 'Alta' },
];

// --- MAIN COMPONENT ---
export default function HRModule() {
  const [activeTab, setActiveTab] = useState<HRTab>('dashboard');
  const { config } = useAppContext();

  const tabs: { id: HRTab; label: string; icon: any }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
    { id: 'employees', label: 'Funcionários', icon: Users },
    { id: 'timesheet', label: 'Ponto', icon: Clock },
    { id: 'payroll', label: 'Folha', icon: DollarSign },
    { id: 'hourbank', label: 'Banco de Horas', icon: Calendar },
    { id: 'vacations', label: 'Férias', icon: Briefcase },
    { id: 'admissions', label: 'Admissões', icon: UserPlus },
    { id: 'activities', label: 'Atividades', icon: CheckCircle },
    { id: 'annotations', label: 'Anotações', icon: FileText },
  ];

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header Tabs */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <div className={`p-2 rounded-lg bg-${config.primaryColor}-100 text-${config.primaryColor}-600`}>
            <Users className="w-6 h-6" />
          </div>
          Recursos Humanos
        </h1>
        <div className="flex space-x-1 overflow-x-auto pb-1 scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
                ${activeTab === tab.id
                  ? `bg-${config.primaryColor}-50 text-${config.primaryColor}-700 border border-${config.primaryColor}-200`
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent'
                }`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? `text-${config.primaryColor}-600` : 'text-slate-400'}`} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {activeTab === 'dashboard' && <DashboardTab />}
          {activeTab === 'employees' && <EmployeesTab />}
          {activeTab === 'timesheet' && <TimesheetTab />}
          {activeTab === 'payroll' && <PayrollTab />}
          {['hourbank', 'vacations', 'admissions', 'activities', 'annotations'].includes(activeTab) && (
            <PlaceholderTab title={tabs.find(t => t.id === activeTab)?.label || 'Em Breve'} />
          )}
        </div>
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function DashboardTab() {
  const kpis = [
    { label: 'Headcount', value: '847', change: '+3.2%', icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Turnover', value: '4.2%', change: '-0.8%', icon: ArrowUpRight, color: 'text-red-600', bg: 'bg-red-100' },
    { label: 'Banco de Horas', value: '12.4h', change: '+2.1h', icon: Clock, color: 'text-purple-600', bg: 'bg-purple-100' },
    { label: 'Vagas Abertas', value: '3', change: '+1', icon: Briefcase, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  ];

  const deptData = [
    { name: 'Operações', count: 420, percentage: 50 },
    { name: 'Comercial', count: 150, percentage: 18 },
    { name: 'TI', count: 85, percentage: 10 },
    { name: 'Administrativo', count: 60, percentage: 7 },
  ];

  const alerts = mockWarnings.map(w => ({ type: 'Advertência', desc: `${w.employeeName} - ${w.reason}`, date: w.date }))
    .concat(mockAbsences.filter(a => !a.justified).map(a => ({ type: 'Falta Injust.', desc: `${a.employeeName}`, date: a.date })));

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">{kpi.label}</p>
              <h3 className="text-2xl font-bold text-slate-900">{kpi.value}</h3>
              <span className={`text-xs font-bold ${kpi.change.includes('-') && kpi.label !== 'Turnover' ? 'text-red-500' : 'text-emerald-500'} flex items-center mt-2`}>
                {kpi.change} <span className="text-slate-400 font-normal ml-1">vs mês anterior</span>
              </span>
            </div>
            <div className={`p-3 rounded-xl ${kpi.bg}`}>
              <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Funcionários por Depto */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-4">Funcionários por Departamento</h3>
          <div className="space-y-4">
            {deptData.map((dept, idx) => (
              <div key={idx}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-slate-700">{dept.name}</span>
                  <span className="text-slate-500">{dept.count} ({dept.percentage}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${dept.percentage}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alertas Ativos */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            Alertas Ativos
          </h3>
          <div className="space-y-3">
            {alerts.slice(0, 4).map((alert, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{alert.type}</p>
                    <p className="text-xs text-slate-600">{alert.desc}</p>
                  </div>
                </div>
                <span className="text-xs font-medium text-slate-500">{alert.date}</span>
              </div>
            ))}
            {alerts.length === 0 && <p className="text-sm text-slate-500 text-center py-4">Nenhum alerta ativo.</p>}
          </div>
        </div>
      </div>

      {/* Atividades Recentes */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-800 mb-4">Atividades Recentes</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase">Atividade</th>
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase">Responsável</th>
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase">Prazo</th>
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <tr className="hover:bg-slate-50">
                <td className="p-3 text-sm font-medium text-slate-800">Fechamento Folha Set/23</td>
                <td className="p-3 text-sm text-slate-600">Maria Oliveira</td>
                <td className="p-3 text-sm text-slate-600">05/10/2023</td>
                <td className="p-3"><span className="px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">Concluído</span></td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="p-3 text-sm font-medium text-slate-800">Onboarding Lucas Pereira</td>
                <td className="p-3 text-sm text-slate-600">Ana Silva</td>
                <td className="p-3 text-sm text-slate-600">25/10/2023</td>
                <td className="p-3"><span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">Em Andamento</span></td>
              </tr>
              <tr className="hover:bg-slate-50">
                <td className="p-3 text-sm font-medium text-slate-800">Renovação Benefícios</td>
                <td className="p-3 text-sm text-slate-600">João Santos</td>
                <td className="p-3 text-sm text-slate-600">01/11/2023</td>
                <td className="p-3"><span className="px-2 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">Pendente</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function EmployeesTab() {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const { config } = useAppContext();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome, cargo ou CPF..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-medium text-sm">
            <Filter className="w-4 h-4" /> Filtros
          </button>
          <button
            onClick={() => setIsNewModalOpen(true)}
            className={`flex items-center gap-2 px-4 py-2 bg-${config.primaryColor}-600 text-white rounded-lg hover:bg-${config.primaryColor}-700 font-bold text-sm shadow-sm transition-all hover:scale-105`}
          >
            <Plus className="w-4 h-4" /> Novo Funcionário
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nome / Cargo</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Depto</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Regime</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Admissão</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {mockEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50 group transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full bg-${config.primaryColor}-100 flex items-center justify-center text-${config.primaryColor}-700 font-bold text-sm`}>
                        {emp.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{emp.name}</p>
                        <p className="text-xs text-slate-500">{emp.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-slate-600">{emp.department}</td>
                  <td className="p-4 text-sm text-slate-600">{emp.contractType} <span className="text-slate-400">•</span> {emp.workRegime}</td>
                  <td className="p-4 text-sm text-slate-600">{new Date(emp.admissionDate).toLocaleDateString('pt-BR')}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold border
                      ${emp.status === 'Ativo' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        emp.status === 'Férias' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                        'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => setSelectedEmployee(emp)}
                      className="text-slate-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <ArrowUpRight className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800">{selectedEmployee.name}</h3>
                <p className="text-sm text-slate-500">Detalhes do Colaborador</p>
              </div>
              <button onClick={() => setSelectedEmployee(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-bold text-slate-700 border-b border-slate-100 pb-2">Dados Pessoais</h4>
                <div className="grid grid-cols-1 gap-3">
                  <div><p className="text-xs text-slate-400 uppercase">Email</p><p className="text-sm font-medium">{selectedEmployee.email}</p></div>
                  <div><p className="text-xs text-slate-400 uppercase">CPF</p><p className="text-sm font-medium">{selectedEmployee.cpf}</p></div>
                  <div><p className="text-xs text-slate-400 uppercase">PIS</p><p className="text-sm font-medium">{selectedEmployee.pis}</p></div>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="font-bold text-slate-700 border-b border-slate-100 pb-2">Contrato</h4>
                <div className="grid grid-cols-1 gap-3">
                  <div><p className="text-xs text-slate-400 uppercase">Departamento</p><p className="text-sm font-medium">{selectedEmployee.department}</p></div>
                  <div><p className="text-xs text-slate-400 uppercase">Cargo</p><p className="text-sm font-medium">{selectedEmployee.role}</p></div>
                  <div><p className="text-xs text-slate-400 uppercase">Salário</p><p className="text-sm font-medium">R$ {selectedEmployee.salary.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div>
                  <div><p className="text-xs text-slate-400 uppercase">Gestor</p><p className="text-sm font-medium">{selectedEmployee.manager}</p></div>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end">
              <button onClick={() => setSelectedEmployee(null)} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50">Fechar</button>
            </div>
          </div>
        </div>
      )}

      {/* New Employee Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Novo Funcionário</h3>
                <p className="text-sm text-slate-500">Cadastro de Admissão</p>
              </div>
              <button onClick={() => setIsNewModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="flex items-start gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl mb-6">
                <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-amber-800 text-sm">Processo Automatizado</h4>
                  <p className="text-amber-700 text-sm mt-1">
                    Ao salvar, o sistema notificará o financeiro, criará o perfil de ponto automaticamente e disparará o e-mail de onboarding para o colaborador.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Seção 1: Pessoais */}
                <div className="space-y-4">
                  <h4 className="flex items-center gap-2 font-bold text-slate-800 border-b pb-2"><Users className="w-4 h-4" /> Dados Pessoais</h4>
                  <div className="space-y-3">
                    <div><label className="block text-xs font-bold text-slate-500 mb-1">Nome Completo</label><input type="text" className="w-full border rounded-lg p-2 text-sm" placeholder="Ex: João da Silva" /></div>
                    <div><label className="block text-xs font-bold text-slate-500 mb-1">CPF</label><input type="text" className="w-full border rounded-lg p-2 text-sm" placeholder="000.000.000-00" /></div>
                    <div><label className="block text-xs font-bold text-slate-500 mb-1">Email Pessoal</label><input type="email" className="w-full border rounded-lg p-2 text-sm" placeholder="joao@email.com" /></div>
                  </div>
                </div>

                {/* Seção 2: Contrato */}
                <div className="space-y-4">
                  <h4 className="flex items-center gap-2 font-bold text-slate-800 border-b pb-2"><Briefcase className="w-4 h-4" /> Contrato</h4>
                  <div className="space-y-3">
                    <div><label className="block text-xs font-bold text-slate-500 mb-1">Cargo</label><input type="text" className="w-full border rounded-lg p-2 text-sm" /></div>
                    <div><label className="block text-xs font-bold text-slate-500 mb-1">Departamento</label>
                      <select className="w-full border rounded-lg p-2 text-sm">
                        <option>TI</option><option>Comercial</option><option>RH</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="block text-xs font-bold text-slate-500 mb-1">Tipo</label>
                        <select className="w-full border rounded-lg p-2 text-sm"><option>CLT</option><option>PJ</option></select>
                      </div>
                      <div><label className="block text-xs font-bold text-slate-500 mb-1">Salário</label><input type="number" className="w-full border rounded-lg p-2 text-sm" /></div>
                    </div>
                  </div>
                </div>

                {/* Seção 3: Acesso */}
                <div className="space-y-4">
                  <h4 className="flex items-center gap-2 font-bold text-slate-800 border-b pb-2"><ShieldCheck className="w-4 h-4" /> Sistema</h4>
                  <div className="space-y-3">
                    <div><label className="block text-xs font-bold text-slate-500 mb-1">Nível de Acesso</label>
                      <select className="w-full border rounded-lg p-2 text-sm"><option>User</option><option>Manager</option><option>Admin</option></select>
                    </div>
                    <div><label className="block text-xs font-bold text-slate-500 mb-1">Email Corporativo</label><input type="email" className="w-full border rounded-lg p-2 text-sm" placeholder="@empresa.com" /></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setIsNewModalOpen(false)} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50">Cancelar</button>
              <button className={`px-6 py-2 bg-${config.primaryColor}-600 text-white rounded-lg hover:bg-${config.primaryColor}-700 font-bold shadow-md`}>Salvar Admissão</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TimesheetTab() {
  const [activeSubTab, setActiveSubTab] = useState<'mirror' | 'overtime' | 'absences' | 'pendencies'>('mirror');
  const { config } = useAppContext();

  return (
    <div className="space-y-6">
      <div className="flex space-x-2 border-b border-slate-200 pb-1">
        {[
          { id: 'mirror', label: 'Espelho de Ponto' },
          { id: 'overtime', label: 'Horas Extras' },
          { id: 'pendencies', label: 'Pendências' },
          { id: 'absences', label: 'Ausências' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors
              ${activeSubTab === tab.id ? `text-${config.primaryColor}-600 border-b-2 border-${config.primaryColor}-600 bg-slate-50` : 'text-slate-500 hover:text-slate-700'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeSubTab === 'mirror' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-800">Espelho de Ponto - Outubro 2023</h3>
            <div className="flex gap-2">
              <button className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"><Download className="w-4 h-4 text-slate-600" /></button>
            </div>
          </div>
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Colaborador</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Data</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Entrada / Saída</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Total</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {mockTimeRecords.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50">
                  <td className="p-4 font-medium text-slate-900">{record.employeeName}</td>
                  <td className="p-4 text-sm text-slate-600">{new Date(record.date).toLocaleDateString('pt-BR')}</td>
                  <td className="p-4 text-sm text-slate-600 font-mono">
                    {record.checkIn || '--:--'} - {record.checkOut || '--:--'}
                    <div className="text-xs text-slate-400">Almoço: {record.lunchStart} - {record.lunchEnd}</div>
                  </td>
                  <td className="p-4 text-sm font-bold text-slate-800">{record.totalHours}h</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold
                      ${record.status === 'Normal' ? 'bg-emerald-100 text-emerald-700' :
                        record.status === 'Atraso' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4 bg-slate-50 border-t border-slate-100 text-right text-sm text-slate-500">
            Total Horas Trabalhadas: <span className="font-bold text-slate-800">33h</span>
          </div>
        </div>
      )}

      {activeSubTab === 'overtime' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button className={`px-4 py-2 bg-${config.primaryColor}-600 text-white rounded-lg hover:bg-${config.primaryColor}-700 font-bold text-sm shadow-sm`}>
              Aprovar em Lote
            </button>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Colaborador</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Data</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Horas / Tipo</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Valor Est.</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Motivo</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {mockOvertimes.map((ot) => (
                  <tr key={ot.id} className="hover:bg-slate-50">
                    <td className="p-4 font-medium text-slate-900">{ot.employeeName}</td>
                    <td className="p-4 text-sm text-slate-600">{new Date(ot.date).toLocaleDateString('pt-BR')}</td>
                    <td className="p-4 text-sm text-slate-600">
                      <span className="font-bold">{ot.hours}h</span> <span className="text-slate-400">({ot.percentage}%)</span>
                      <div className="text-xs text-slate-500">{ot.type}</div>
                    </td>
                    <td className="p-4 text-sm font-mono text-slate-700">R$ {ot.value.toFixed(2)}</td>
                    <td className="p-4 text-sm text-slate-600 italic">"{ot.reason}"</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold
                        ${ot.approvalStatus === 'Aprovado' ? 'bg-emerald-100 text-emerald-700' :
                          ot.approvalStatus === 'Rejeitado' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                        {ot.approvalStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'pendencies' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="font-bold text-slate-800 mb-4">Pendências de Aprovação</h3>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-blue-300 transition-colors bg-slate-50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600"><AlertCircle className="w-5 h-5" /></div>
                  <div>
                    <p className="font-bold text-slate-800">Ajuste de Ponto - Esquecimento</p>
                    <p className="text-sm text-slate-500">Solicitado por: <strong>Ana Silva</strong> em 24/10/2023</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200">Rejeitar</button>
                  <button className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-200">Aprovar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'absences' && (
        <div className="space-y-6">
          <div className="flex items-start gap-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <h4 className="font-bold text-red-800 text-sm">Política de Faltas (ZIA)</h4>
              <p className="text-red-700 text-sm mt-1">
                Após 3 faltas injustificadas consecutivas, o sistema gerará automaticamente uma advertência por escrito e notificará o gestor imediato.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Histórico de Ausências</h3>
              <button className={`px-4 py-2 bg-${config.primaryColor}-600 text-white rounded-lg text-xs font-bold`}>Registrar Ausência</button>
            </div>
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Colaborador</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Data</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Tipo</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Justificativa</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase">Impacto Financeiro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {mockAbsences.map((ab) => (
                  <tr key={ab.id} className="hover:bg-slate-50">
                    <td className="p-4 font-medium text-slate-900">{ab.employeeName}</td>
                    <td className="p-4 text-sm text-slate-600">{new Date(ab.date).toLocaleDateString('pt-BR')}</td>
                    <td className="p-4 text-sm text-slate-600">{ab.type}</td>
                    <td className="p-4">
                      {ab.justified ? (
                        <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold"><CheckCircle className="w-3 h-3" /> Justificada</span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600 text-xs font-bold"><X className="w-3 h-3" /> Não Justificada</span>
                      )}
                    </td>
                    <td className="p-4 text-sm font-mono text-slate-700">
                      {ab.financialImpact > 0 ? `R$ -${ab.financialImpact.toFixed(2)}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function PayrollTab() {
  const [selectedGroup, setSelectedGroup] = useState<PayrollGroup | null>(null);
  const [selectedEmployeePayroll, setSelectedEmployeePayroll] = useState<Employee | null>(null);
  const { config } = useAppContext();

  return (
    <div className="space-y-8">
      {/* Payroll Groups Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {mockPayrollGroups.map((group) => (
          <div
            key={group.id}
            onClick={() => setSelectedGroup(group)}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden group"
          >
            <div className={`absolute top-0 right-0 p-3 rounded-bl-2xl text-xs font-bold
              ${group.status === 'Paga' ? 'bg-emerald-100 text-emerald-700' :
                group.status === 'Aberta' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
              {group.status}
            </div>
            <h3 className="font-bold text-slate-800 text-lg mb-1">{group.name}</h3>
            <p className="text-xs text-slate-500 mb-4">{group.period}</p>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Colaboradores</span>
                <span className="font-medium text-slate-900">{group.employeeCount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total Líquido</span>
                <span className="font-bold text-slate-900">R$ {group.totalNet.toLocaleString('pt-BR')}</span>
              </div>
            </div>

            <div className="mt-4 w-full bg-slate-100 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full ${group.status === 'Paga' ? 'bg-emerald-500' : 'bg-blue-500'}`}
                style={{ width: group.status === 'Paga' ? '100%' : group.status === 'Em Processamento' ? '60%' : '10%' }}
              ></div>
            </div>
          </div>
        ))}

        {/* New Group Card */}
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-6 text-slate-400 hover:border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer">
          <Plus className="w-8 h-8 mb-2" />
          <span className="font-bold text-sm">Novo Grupo de Folha</span>
        </div>
      </div>

      {/* Group Details Modal */}
      {selectedGroup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800">{selectedGroup.name}</h3>
                <p className="text-sm text-slate-500">Detalhamento da Folha de Pagamento</p>
              </div>
              <button onClick={() => setSelectedGroup(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
            </div>

            <div className="flex-1 overflow-hidden flex">
              {/* Sidebar List */}
              <div className="w-1/3 border-r border-slate-100 overflow-y-auto bg-white">
                <div className="p-4 border-b border-slate-100">
                   <input type="text" placeholder="Filtrar funcionário..." className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm" />
                </div>
                {mockEmployees.slice(0, 5).map(emp => (
                  <div
                    key={emp.id}
                    onClick={() => setSelectedEmployeePayroll(emp)}
                    className="p-4 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-slate-800 text-sm">{emp.name}</span>
                      <span className="text-xs font-bold text-emerald-600">R$ {(emp.salary * 0.85).toLocaleString('pt-BR')}</span>
                    </div>
                    <p className="text-xs text-slate-500">{emp.role}</p>
                  </div>
                ))}
              </div>

              {/* Detail View */}
              <div className="flex-1 overflow-y-auto bg-slate-50 p-8">
                {selectedEmployeePayroll ? (
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                       <div>
                         <h2 className="text-lg font-bold text-slate-800">{selectedEmployeePayroll.name}</h2>
                         <p className="text-sm text-slate-500">{selectedEmployeePayroll.role} • {selectedEmployeePayroll.contractType}</p>
                       </div>
                       <div className="text-right">
                         <p className="text-xs text-slate-400 uppercase">Líquido a Receber</p>
                         <p className="text-2xl font-bold text-emerald-600">R$ {(selectedEmployeePayroll.salary * 0.85).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8">
                      <div>
                        <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><ArrowUpRight className="w-4 h-4 text-emerald-500" /> Proventos</h4>
                        <table className="w-full text-sm">
                          <tbody className="divide-y divide-slate-50">
                            <tr><td className="py-2 text-slate-600">Salário Base</td><td className="py-2 text-right font-medium">R$ {selectedEmployeePayroll.salary.toLocaleString('pt-BR')}</td></tr>
                            <tr><td className="py-2 text-slate-600">H.E. 50%</td><td className="py-2 text-right font-medium">R$ 450,00</td></tr>
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-slate-100"><td className="py-2 font-bold text-slate-800">Total Proventos</td><td className="py-2 text-right font-bold text-emerald-600">R$ {(selectedEmployeePayroll.salary + 450).toLocaleString('pt-BR')}</td></tr>
                          </tfoot>
                        </table>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2"><ArrowUpRight className="w-4 h-4 text-red-500 rotate-180" /> Descontos</h4>
                        <table className="w-full text-sm">
                          <tbody className="divide-y divide-slate-50">
                            <tr><td className="py-2 text-slate-600">INSS</td><td className="py-2 text-right font-medium text-red-600">- R$ {(selectedEmployeePayroll.salary * 0.11).toFixed(2)}</td></tr>
                            <tr><td className="py-2 text-slate-600">IRRF</td><td className="py-2 text-right font-medium text-red-600">- R$ {(selectedEmployeePayroll.salary * 0.07).toFixed(2)}</td></tr>
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-slate-100"><td className="py-2 font-bold text-slate-800">Total Descontos</td><td className="py-2 text-right font-bold text-red-600">- R$ {(selectedEmployeePayroll.salary * 0.18).toFixed(2)}</td></tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <Users className="w-12 h-12 mb-4 opacity-50" />
                    <p>Selecione um funcionário para ver o holerite detalhado</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PlaceholderTab({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-96 bg-white rounded-2xl border border-dashed border-slate-300">
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
        <Briefcase className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
      <p className="text-slate-500">Esta funcionalidade estará disponível em breve.</p>
    </div>
  );
}
