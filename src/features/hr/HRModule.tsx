import { useState } from 'react';
import {
  Users, Calendar, Clock, FileText, CheckCircle,
  AlertCircle, Search,
  Briefcase, TrendingUp, UserPlus, Filter, Download, ArrowUpRight,
  AlertTriangle, DollarSign, ChevronDown, ChevronRight,
  User, CreditCard, Key,
  Sparkles, CheckSquare, List,
  Activity, PieChart, BarChart2, LineChart
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

// --- TYPES ---
type HRView = 'dashboard' | 'employees-registration' | 'employees-list' | 'employees-timesheet' | 'employees-metrics' | 'employees-payroll' | 'employees-groups' | 'employees-absences' | 'employees-planned-leaves' | 'employees-hourbank' | 'employees-vacations' | 'employees-annotations' | 'admissions-metrics' | 'admissions-vacancies' | 'admissions-alerts';

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
  indicators?: {
    point: 'ok' | 'alert';
    productivity: 'high' | 'medium' | 'low';
    pendencies: number;
  };
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
  { id: '1', name: 'Ana Silva', role: 'Desenvolvedora Senior', department: 'TI', manager: 'Carlos Souza', contractType: 'CLT', workRegime: 'Horário Fixo', status: 'Ativo', admissionDate: '2022-03-10', salary: 12500, email: 'ana.silva@empresa.com', cpf: '123.456.789-00', pis: '12345678900', accessLevel: 'Admin', indicators: { point: 'ok', productivity: 'high', pendencies: 0 } },
  { id: '2', name: 'João Santos', role: 'Analista de Marketing', department: 'Marketing', manager: 'Fernanda Lima', contractType: 'PJ', workRegime: 'Horário Fixo', status: 'Ativo', admissionDate: '2023-01-15', salary: 8000, email: 'joao.santos@empresa.com', cpf: '234.567.890-11', pis: '23456789011', accessLevel: 'User', indicators: { point: 'alert', productivity: 'medium', pendencies: 2 } },
  { id: '3', name: 'Maria Oliveira', role: 'Assistente RH', department: 'RH', manager: 'Roberto Costa', contractType: 'Estágio', workRegime: 'Horário Fixo', status: 'Férias', admissionDate: '2023-06-01', salary: 1500, email: 'maria.oliveira@empresa.com', cpf: '345.678.901-22', pis: '34567890122', accessLevel: 'User', indicators: { point: 'ok', productivity: 'medium', pendencies: 0 } },
  { id: '4', name: 'Pedro Costa', role: 'Gerente Comercial', department: 'Comercial', manager: 'Diretoria', contractType: 'CLT', workRegime: 'Banco de Horas', status: 'Afastado', admissionDate: '2021-11-20', salary: 18000, email: 'pedro.costa@empresa.com', cpf: '456.789.012-33', pis: '45678901233', accessLevel: 'Manager', indicators: { point: 'alert', productivity: 'high', pendencies: 5 } },
  { id: '5', name: 'Lucas Pereira', role: 'Suporte Técnico', department: 'TI', manager: 'Ana Silva', contractType: 'CLT', workRegime: 'Escala', status: 'Ativo', admissionDate: '2023-08-05', salary: 4500, email: 'lucas.pereira@empresa.com', cpf: '567.890.123-44', pis: '56789012344', accessLevel: 'User', indicators: { point: 'ok', productivity: 'low', pendencies: 1 } },
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
  const [activeView, setActiveView] = useState<HRView>('dashboard');
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    'employees': true,
    'admissions': false
  });
  const { config } = useAppContext();

  const toggleMenu = (menuId: string) => {
    setExpandedMenus(prev => ({ ...prev, [menuId]: !prev[menuId] }));
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: TrendingUp, type: 'item', view: 'dashboard' },
    {
      id: 'employees', label: 'Funcionários', icon: Users, type: 'group',
      subItems: [
        { id: 'employees-registration', label: 'Cadastro de Funcionário', icon: UserPlus },
        { id: 'employees-list', label: 'Lista de Funcionários', icon: List },
        { id: 'employees-timesheet', label: 'Folha de Ponto', icon: Clock },
        { id: 'employees-metrics', label: 'Métricas', icon: TrendingUp },
        { id: 'employees-payroll', label: 'Folha de Pagamento', icon: DollarSign },
        { id: 'employees-groups', label: 'Grupos', icon: Users },
        { id: 'employees-absences', label: 'Faltas e Ausências', icon: AlertCircle },
        { id: 'employees-planned-leaves', label: 'Folgas Planejadas', icon: Calendar },
        { id: 'employees-hourbank', label: 'Banco de Horas', icon: Clock },
        { id: 'employees-vacations', label: 'Férias', icon: Briefcase },
        { id: 'employees-annotations', label: 'Anotações', icon: FileText },
      ]
    },
    {
      id: 'admissions', label: 'Admissões', icon: UserPlus, type: 'group',
      subItems: [
        { id: 'admissions-metrics', label: 'Métricas de Admissões', icon: TrendingUp },
        { id: 'admissions-vacancies', label: 'Vagas', icon: Briefcase },
        { id: 'admissions-alerts', label: 'Alertas', icon: AlertTriangle },
      ]
    },
  ];

  return (
    <div className="h-full flex bg-slate-50 overflow-hidden">
      {/* Sidebar Navigation */}
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col h-full flex-shrink-0">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2">
          <div className={`p-2 rounded-lg bg-${config.primaryColor}-100 text-${config.primaryColor}-600`}>
            <Users className="w-5 h-5" />
          </div>
          <h1 className="font-bold text-slate-800">Recursos Humanos</h1>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => (
            <div key={item.id}>
              {item.type === 'item' ? (
                <button
                  onClick={() => setActiveView(item.view as HRView)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${activeView === item.view
                      ? `bg-${config.primaryColor}-50 text-${config.primaryColor}-700`
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              ) : (
                <div>
                  <button
                    onClick={() => toggleMenu(item.id)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {expandedMenus[item.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>

                  {expandedMenus[item.id] && (
                    <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-100 pl-2">
                      {item.subItems?.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => setActiveView(sub.id as HRView)}
                          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors
                            ${activeView === sub.id
                              ? `text-${config.primaryColor}-700 font-medium bg-${config.primaryColor}-50/50`
                              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                            }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-40"></span>
                          <span>{sub.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto">
          {activeView === 'dashboard' && <HRDashboard />}
          {activeView === 'employees-registration' && <EmployeeRegistration />}
          {activeView === 'employees-list' && <EmployeesTab />}
          {activeView === 'employees-timesheet' && <TimesheetTab />}
          {activeView === 'employees-metrics' && <EmployeeMetricsTab />}
          {activeView === 'employees-payroll' && <PayrollTab />}

          {/* Placeholders for other views */}
          {!['dashboard', 'employees-registration', 'employees-list', 'employees-timesheet', 'employees-metrics', 'employees-payroll'].includes(activeView) && (
            <PlaceholderTab title="Em Breve" />
          )}
        </div>
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function EmployeeMetricsTab() {
  const [activeSubSection, setActiveSubSection] = useState<'general' | 'individual'>('general');
  const { config } = useAppContext();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Métricas e KPIs</h2>
        <div className="bg-slate-100 p-1 rounded-lg flex">
          <button
            onClick={() => setActiveSubSection('general')}
            className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeSubSection === 'general' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Análise Geral
          </button>
          <button
            onClick={() => setActiveSubSection('individual')}
            className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${activeSubSection === 'individual' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Análise Individual
          </button>
        </div>
      </div>

      {activeSubSection === 'general' ? (
        <div className="space-y-6 animate-in fade-in">
          {/* General Dashboard Grid */}
          <div className="grid grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-sm text-slate-500 font-medium">Assiduidade Média</p>
              <h3 className="text-3xl font-bold text-emerald-600 mt-2">96.5%</h3>
              <p className="text-xs text-emerald-500 mt-1 flex items-center"><ArrowUpRight className="w-3 h-3 mr-1" /> +1.2% vs mês anterior</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-sm text-slate-500 font-medium">Horas Extras (Total)</p>
              <h3 className="text-3xl font-bold text-indigo-600 mt-2">142h</h3>
              <p className="text-xs text-red-500 mt-1 flex items-center"><ArrowUpRight className="w-3 h-3 mr-1" /> +12% vs mês anterior</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-sm text-slate-500 font-medium">Absenteísmo</p>
              <h3 className="text-3xl font-bold text-amber-600 mt-2">3.5%</h3>
              <p className="text-xs text-slate-400 mt-1">Dentro da meta (4%)</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-sm text-slate-500 font-medium">Faltas / Funcionário</p>
              <h3 className="text-3xl font-bold text-slate-800 mt-2">0.4</h3>
              <p className="text-xs text-emerald-500 mt-1 flex items-center"><ArrowUpRight className="w-3 h-3 mr-1 rotate-180" /> -0.1 vs mês anterior</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Chart Placeholders */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-80 flex flex-col items-center justify-center text-slate-400">
              <BarChart2 className="w-12 h-12 mb-4 opacity-50" />
              <p className="font-medium">Comparativo de Absenteísmo por Setor</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-80 flex flex-col items-center justify-center text-slate-400">
              <LineChart className="w-12 h-12 mb-4 opacity-50" />
              <p className="font-medium">Evolução Mensal de Horas Extras</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
             <div className="col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-80 flex flex-col items-center justify-center text-slate-400">
               <PieChart className="w-12 h-12 mb-4 opacity-50" />
               <p className="font-medium">Tipos de Ausência</p>
             </div>
             <div className="col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
               <h3 className="font-bold text-slate-800 mb-4">Ranking Banco de Horas (Top 5)</h3>
               <table className="w-full text-sm text-left">
                 <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                   <tr>
                     <th className="p-3 rounded-l-lg">Colaborador</th>
                     <th className="p-3">Setor</th>
                     <th className="p-3 rounded-r-lg text-right">Saldo Acumulado</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                   {[1,2,3,4,5].map(i => (
                     <tr key={i}>
                       <td className="p-3 font-medium">Funcionário {i}</td>
                       <td className="p-3 text-slate-500">Operações</td>
                       <td className="p-3 text-right font-bold text-purple-600">+{(20 - i*2)}h</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center h-96 text-slate-400">
            <div className="text-center">
              <User className="w-16 h-16 mx-auto mb-4 opacity-50 bg-slate-100 rounded-full p-4" />
              <h3 className="text-lg font-bold text-slate-600">Selecione um Funcionário</h3>
              <p className="text-sm">Utilize a busca para visualizar a análise individual detalhada.</p>
              <div className="mt-4 max-w-md mx-auto relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" placeholder="Buscar funcionário..." className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HRDashboard() {
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

  const alerts = mockWarnings.map(w => ({ type: 'Advertência', desc: `${w.employeeName} - ${w.reason}`, date: w.date, severity: w.severity }))
    .concat(mockAbsences.filter(a => !a.justified).map(a => ({ type: 'Falta Injust.', desc: `${a.employeeName}`, date: a.date, severity: 'Alta' })));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-2xl font-bold text-slate-800">Dashboard de Pessoas</h2>

      {/* ZIA Insights Card */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="flex items-start gap-4 relative z-10">
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            <Sparkles className="w-6 h-6 text-yellow-300" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-4">Insights da ZIA</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/10 rounded-xl p-4 border border-white/10">
                <p className="text-xs text-indigo-200 uppercase font-bold mb-1">Risco de Turnover</p>
                <p className="font-medium text-sm">João Santos apresenta 3 atrasos e 1 advertência este mês. Agendar feedback.</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4 border border-white/10">
                <p className="text-xs text-indigo-200 uppercase font-bold mb-1">Hora Extra</p>
                <p className="font-medium text-sm">Setor de TI excedeu o limite de horas extras em 15% na última semana.</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4 border border-white/10">
                <p className="text-xs text-indigo-200 uppercase font-bold mb-1">Recrutamento</p>
                <p className="font-medium text-sm">Vaga de "Gerente Comercial" está aberta há 45 dias. Prioridade Alta.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs Grid */}
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
              <div key={idx} className={`flex items-center justify-between p-3 rounded-lg border
                ${alert.severity === 'Alta' ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${alert.severity === 'Alta' ? 'bg-red-500' : 'bg-amber-500'}`}></div>
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

function EmployeeRegistration() {
  const [showZiaCard, setShowZiaCard] = useState(false);
  const [success, setSuccess] = useState(false);
  const { config } = useAppContext();

  const handleRoleChange = () => {
    setShowZiaCard(true);
  };

  const handleSave = () => {
    setSuccess(true);
    setTimeout(() => setSuccess(false), 5000);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Cadastro de Funcionário</h2>
        {success && (
          <div className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle className="w-4 h-4" /> Financeiro notificado ✓ | Ponto criado ✓ | Email enviado ✓
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-8">
        {/* Seção 1: Dados Pessoais */}
        <section>
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">
            <User className="w-5 h-5 text-blue-600" /> Dados Pessoais
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 mb-1">Nome Completo</label>
              <input type="text" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">CPF</label>
              <input type="text" placeholder="000.000.000-00" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">RG</label>
              <input type="text" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Data de Nascimento</label>
              <input type="date" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Telefone / Celular</label>
              <input type="text" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
            </div>
            <div className="col-span-1 md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 mb-1">Endereço Completo</label>
              <input type="text" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Email Pessoal</label>
              <input type="email" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
            </div>
          </div>
        </section>

        {/* Seção 2: Dados Contratuais */}
        <section>
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">
            <Briefcase className="w-5 h-5 text-blue-600" /> Dados Contratuais
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Tipo de Contrato</label>
              <select className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white">
                <option>CLT</option><option>PJ</option><option>Temporário</option><option>Estágio</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Regime</label>
              <select className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white">
                <option>Horário Fixo</option><option>Escala</option><option>Banco de Horas</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Data de Admissão</label>
              <input type="date" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Departamento</label>
              <select className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white" onChange={handleRoleChange}>
                <option value="">Selecione...</option><option>TI</option><option>Comercial</option><option>RH</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Cargo</label>
              <input type="text" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" onBlur={handleRoleChange} />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Gestor Direto</label>
              <select className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white"><option>Ana Silva</option><option>Carlos Souza</option></select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Salário Base</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 text-sm">R$</span>
                <input type="number" className="w-full border border-slate-200 rounded-lg pl-9 p-2.5 text-sm" />
              </div>
            </div>
            <div className="col-span-1 md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 mb-2">Benefícios Vinculados</label>
              <div className="flex gap-4 flex-wrap">
                {['Vale Transporte', 'Vale Refeição', 'Plano de Saúde', 'Odonto', 'Previdência'].map(b => (
                  <label key={b} className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100">
                    <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" /> {b}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ZIA Suggestion Card */}
        {showZiaCard && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-start gap-4 animate-in fade-in zoom-in-95">
            <Sparkles className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h4 className="font-bold text-indigo-900 text-sm">Sugestão Inteligente ZIA</h4>
              <p className="text-indigo-700 text-sm mt-1 mb-3">
                Com base no cargo e setor selecionados, a ZIA sugere a seguinte configuração padrão:
              </p>
              <div className="flex gap-3 text-xs font-medium text-indigo-800 mb-3">
                <span className="bg-white/50 px-2 py-1 rounded">Escala: Híbrido (3x2)</span>
                <span className="bg-white/50 px-2 py-1 rounded">Grupo: Técnico III</span>
                <span className="bg-white/50 px-2 py-1 rounded">Alertas: Padrão TI</span>
              </div>
              <button className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-700 transition-colors">
                Aplicar Sugestões
              </button>
            </div>
          </div>
        )}

        {/* Seção 3: Dados Bancários */}
        <section>
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">
            <CreditCard className="w-5 h-5 text-blue-600" /> Dados Bancários
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Banco</label>
              <input type="text" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Agência</label>
              <input type="text" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Conta</label>
              <input type="text" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Tipo</label>
              <select className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white">
                <option>Corrente</option><option>Poupança</option>
              </select>
            </div>
          </div>
        </section>

        {/* Seção 4: Acesso */}
        <section>
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">
            <Key className="w-5 h-5 text-blue-600" /> Acesso ao Sistema
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Email Corporativo</label>
              <input type="email" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm" placeholder="nome.sobrenome@empresa.com" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Nível de Acesso</label>
              <select className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white">
                <option>User</option><option>Manager</option><option>Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Grupo de Folha</label>
              <select className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white">
                <option>Mensalistas</option><option>Diretoria</option>
              </select>
            </div>
          </div>
        </section>

        <div className="flex justify-end pt-4">
          <button
            onClick={handleSave}
            className={`px-8 py-3 bg-${config.primaryColor}-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2`}
          >
            <CheckSquare className="w-5 h-5" /> Salvar Funcionário
          </button>
        </div>
      </div>
    </div>
  );
}

function EmployeesTab() {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const { config } = useAppContext();

  if (selectedEmployee) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
        <button onClick={() => setSelectedEmployee(null)} className="flex items-center text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowUpRight className="w-4 h-4 rotate-180 mr-2" /> Voltar para Lista
        </button>

        {/* Header Profile */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex justify-between items-start">
          <div className="flex gap-4">
            <div className={`w-16 h-16 rounded-full bg-${config.primaryColor}-100 flex items-center justify-center text-${config.primaryColor}-700 font-bold text-2xl`}>
              {selectedEmployee.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{selectedEmployee.name}</h2>
              <p className="text-slate-500">{selectedEmployee.role} • {selectedEmployee.department}</p>
              <div className="flex gap-2 mt-2">
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-bold">{selectedEmployee.status}</span>
                <span className="text-xs text-slate-400 self-center">Admissão: {new Date(selectedEmployee.admissionDate).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
             <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200 transition-colors">Editar Perfil</button>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <p className="text-xs text-slate-500 uppercase font-bold">Banco de Horas</p>
            <p className="text-lg font-bold text-purple-600 mt-1">+12h 30m</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <p className="text-xs text-slate-500 uppercase font-bold">Férias</p>
            <p className="text-lg font-bold text-blue-600 mt-1">15 dias</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <p className="text-xs text-slate-500 uppercase font-bold">Pendências</p>
            <p className="text-lg font-bold text-amber-600 mt-1">2 assinaturas</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <p className="text-xs text-slate-500 uppercase font-bold">Alertas</p>
            <p className="text-lg font-bold text-red-600 mt-1">0 ativos</p>
          </div>
        </div>

        {/* Accordion Sections Placeholder */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          {['Dados Pessoais', 'Histórico de Ponto', 'Evolução Salarial', 'Advertências', 'Atividades'].map((section, idx) => (
            <div key={idx} className="border-b border-slate-100 last:border-0">
              <button className="w-full flex justify-between items-center p-4 hover:bg-slate-50 transition-colors text-left">
                <span className="font-bold text-slate-700">{section}</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Lista de Funcionários</h2>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, cargo..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-medium text-sm">
            <Filter className="w-4 h-4" /> Filtros
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 font-medium text-sm">
            <Download className="w-4 h-4" /> Exportar
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Colaborador</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Depto</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contrato</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Admissão</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Indicadores</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {mockEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50 group transition-colors cursor-pointer" onClick={() => setSelectedEmployee(emp)}>
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
                  <td className="p-4 text-sm text-slate-600">
                    {emp.contractType}
                    <span className="block text-xs text-slate-400">{emp.workRegime}</span>
                  </td>
                  <td className="p-4 text-sm text-slate-600">{new Date(emp.admissionDate).toLocaleDateString('pt-BR')}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold border
                      ${emp.status === 'Ativo' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        emp.status === 'Férias' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                        'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <div title="Ponto" className={`w-2 h-2 rounded-full ${emp.indicators?.point === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                      <div title="Produtividade" className={`w-2 h-2 rounded-full ${emp.indicators?.productivity === 'high' ? 'bg-blue-500' : emp.indicators?.productivity === 'medium' ? 'bg-amber-500' : 'bg-slate-300'}`}></div>
                      {emp.indicators && emp.indicators.pendencies > 0 && (
                        <span className="bg-red-100 text-red-600 text-[10px] px-1.5 rounded-full font-bold">{emp.indicators.pendencies}</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <button className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TimesheetTab() {
  const [activeSubTab, setActiveSubTab] = useState<'mirror' | 'overtime' | 'authorizations' | 'changes' | 'justified' | 'unjustified' | 'alerts' | 'scales'>('mirror');
  const { config } = useAppContext();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Folha de Ponto</h2>
      <div className="flex space-x-1 border-b border-slate-200 pb-1 overflow-x-auto">
        {[
          { id: 'mirror', label: 'Espelho' },
          { id: 'overtime', label: 'Horas Extras' },
          { id: 'authorizations', label: 'Autorizações' },
          { id: 'changes', label: 'Alterações' },
          { id: 'justified', label: 'Ausências Just.' },
          { id: 'unjustified', label: 'Ausências Injust.' },
          { id: 'alerts', label: 'Alertas' },
          { id: 'scales', label: 'Escalas' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap
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
              <button className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-50"><FileText className="w-3 h-3" /> PDF</button>
              <button className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-50"><Download className="w-3 h-3" /> CSV</button>
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
        </div>
      )}

      {activeSubTab === 'overtime' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-end">
             <button className={`px-4 py-2 bg-${config.primaryColor}-600 text-white rounded-lg hover:bg-${config.primaryColor}-700 font-bold text-sm shadow-sm`}>
              Aprovar em Lote
            </button>
          </div>
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Colaborador</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Data</th>
                <th className="p-4 text-xs font-bold text-slate-500 uppercase">Horas / Tipo</th>
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
      )}

      {/* Placeholders for new tabs implemented as requested */}
      {activeSubTab === 'authorizations' && (
        <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
          <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <h3 className="font-bold text-slate-600">Autorizações Pendentes</h3>
          <p className="text-sm">Lista de solicitações de HE aguardando aprovação.</p>
        </div>
      )}
      {activeSubTab === 'changes' && (
        <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <h3 className="font-bold text-slate-600">Solicitações de Alterações</h3>
          <p className="text-sm">Correções de ponto solicitadas com trilha de auditoria.</p>
        </div>
      )}
      {activeSubTab === 'justified' && (
        <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
          <CheckSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <h3 className="font-bold text-slate-600">Ausências Justificadas</h3>
          <p className="text-sm">Registro e tabela de ausências com documentos.</p>
        </div>
      )}
      {activeSubTab === 'unjustified' && (
        <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
          <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <h3 className="font-bold text-slate-600">Ausências Não Justificadas</h3>
          <p className="text-sm">Detecção automática e solicitação de justificativa.</p>
        </div>
      )}
      {activeSubTab === 'alerts' && (
        <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
          <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <h3 className="font-bold text-slate-600">Alertas de Ponto</h3>
          <p className="text-sm">Configuração e lista de alertas ativos.</p>
        </div>
      )}
      {activeSubTab === 'scales' && (
        <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
          <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <h3 className="font-bold text-slate-600">Escalas Pré-Programadas</h3>
          <p className="text-sm">Gestão de escalas (5x2, 6x1) e sugestões ZIA.</p>
        </div>
      )}
    </div>
  );
}

function PayrollTab() {
  const [selectedGroup, setSelectedGroup] = useState<PayrollGroup | null>(null);
  const [selectedEmployeePayroll, setSelectedEmployeePayroll] = useState<Employee | null>(null);
  const [activePayslipTab, setActivePayslipTab] = useState('provisions');
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const { config } = useAppContext();

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Folha de Pagamento</h2>
        <button
          onClick={() => setIsCreateGroupModalOpen(true)}
          className={`flex items-center gap-2 px-4 py-2 bg-${config.primaryColor}-600 text-white rounded-lg hover:bg-${config.primaryColor}-700 font-bold text-sm shadow-sm`}
        >
          <Plus className="w-4 h-4" /> Novo Grupo de Folha
        </button>
      </div>

      {/* Payroll Groups Grid */}
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

        {/* Create Group Card Placeholder */}
        <div
          onClick={() => setIsCreateGroupModalOpen(true)}
          className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-6 text-slate-400 hover:border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer min-h-[180px]"
        >
          <Plus className="w-8 h-8 mb-2 opacity-50" />
          <span className="font-bold text-sm">Criar Novo Grupo</span>
        </div>
      </div>

      {/* Detailed Group View Modal */}
      {selectedGroup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center flex-shrink-0">
              <div>
                <h3 className="text-xl font-bold text-slate-800">{selectedGroup.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide
                    ${selectedGroup.status === 'Paga' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                    {selectedGroup.status}
                  </span>
                  <span className="text-xs text-slate-500">{selectedGroup.period}</span>
                </div>
              </div>
              <button onClick={() => setSelectedGroup(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Left Sidebar: Employee List */}
              <div className="w-1/3 border-r border-slate-100 flex flex-col bg-white">
                <div className="p-4 border-b border-slate-100">
                   <div className="relative">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                     <input type="text" placeholder="Filtrar funcionário..." className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                   </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {mockEmployees.slice(0, 5).map(emp => (
                    <div
                      key={emp.id}
                      onClick={() => setSelectedEmployeePayroll(emp)}
                      className={`p-4 border-b border-slate-50 cursor-pointer transition-colors hover:bg-slate-50
                        ${selectedEmployeePayroll?.id === emp.id ? `bg-${config.primaryColor}-50 border-l-4 border-l-${config.primaryColor}-600` : ''}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className={`font-bold text-sm ${selectedEmployeePayroll?.id === emp.id ? `text-${config.primaryColor}-800` : 'text-slate-800'}`}>{emp.name}</span>
                        <span className="text-xs font-bold text-emerald-600">R$ {(emp.salary * 0.85).toLocaleString('pt-BR')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-slate-500">{emp.role}</p>
                        {emp.indicators?.point === 'alert' && <AlertCircle className="w-3 h-3 text-red-500" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Content: Detailed Payslip */}
              <div className="flex-1 overflow-y-auto bg-slate-50 p-8">
                {selectedEmployeePayroll ? (
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Payslip Header */}
                    <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                       <div>
                         <h2 className="text-lg font-bold text-slate-800">{selectedEmployeePayroll.name}</h2>
                         <p className="text-sm text-slate-500">{selectedEmployeePayroll.role} • {selectedEmployeePayroll.contractType}</p>
                       </div>
                       <div className="text-right">
                         <p className="text-xs text-slate-400 uppercase font-bold">Líquido a Receber</p>
                         <p className="text-2xl font-bold text-emerald-600">R$ {(selectedEmployeePayroll.salary * 0.85).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                       </div>
                    </div>

                    {/* Payslip Tabs */}
                    <div className="flex space-x-1 border-b border-slate-200 mb-6 overflow-x-auto">
                      {['provisions', 'discounts', 'hourbank', 'leaves', 'commissions', 'alerts'].map(tab => (
                        <button
                          key={tab}
                          onClick={() => setActivePayslipTab(tab)}
                          className={`px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors whitespace-nowrap
                            ${activePayslipTab === tab
                              ? `text-${config.primaryColor}-600 border-b-2 border-${config.primaryColor}-600`
                              : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          {tab === 'provisions' ? 'Proventos' :
                           tab === 'discounts' ? 'Descontos' :
                           tab === 'hourbank' ? 'Banco de Horas' :
                           tab === 'leaves' ? 'Folgas' :
                           tab === 'commissions' ? 'Comissões' : 'Alertas'}
                        </button>
                      ))}
                    </div>

                    {/* Payslip Content Area */}
                    <div className="min-h-[300px]">
                      {activePayslipTab === 'provisions' && (
                        <div className="space-y-4 animate-in fade-in">
                          <table className="w-full text-sm">
                            <thead className="text-xs text-slate-400 uppercase border-b border-slate-100"><tr><th className="text-left py-2">Descrição</th><th className="text-right py-2">Ref.</th><th className="text-right py-2">Valor</th></tr></thead>
                            <tbody className="divide-y divide-slate-50">
                              <tr><td className="py-3 font-medium text-slate-700">Salário Base</td><td className="py-3 text-right text-slate-500">30d</td><td className="py-3 text-right font-bold text-slate-800">R$ {selectedEmployeePayroll.salary.toLocaleString('pt-BR')}</td></tr>
                              <tr>
                                <td className="py-3 font-medium text-slate-700 flex items-center gap-2">Horas Extras 50% <CheckCircle className="w-3 h-3 text-emerald-500" /></td>
                                <td className="py-3 text-right text-slate-500">12:30</td><td className="py-3 text-right font-bold text-slate-800">R$ 450,00</td>
                              </tr>
                              <tr><td className="py-3 font-medium text-slate-700">DSR sobre HE</td><td className="py-3 text-right text-slate-500">-</td><td className="py-3 text-right font-bold text-slate-800">R$ 90,00</td></tr>
                            </tbody>
                            <tfoot className="border-t border-slate-100">
                              <tr><td colSpan={2} className="py-4 font-bold text-slate-800">Total Proventos</td><td className="py-4 text-right font-bold text-emerald-600 text-lg">R$ {(selectedEmployeePayroll.salary + 540).toLocaleString('pt-BR')}</td></tr>
                            </tfoot>
                          </table>
                        </div>
                      )}

                      {activePayslipTab === 'discounts' && (
                        <div className="space-y-4 animate-in fade-in">
                          <table className="w-full text-sm">
                            <thead className="text-xs text-slate-400 uppercase border-b border-slate-100"><tr><th className="text-left py-2">Descrição</th><th className="text-right py-2">Ref.</th><th className="text-right py-2">Valor</th></tr></thead>
                            <tbody className="divide-y divide-slate-50">
                              <tr><td className="py-3 font-medium text-slate-700">INSS</td><td className="py-3 text-right text-slate-500">11%</td><td className="py-3 text-right font-bold text-red-600">- R$ {(selectedEmployeePayroll.salary * 0.11).toFixed(2)}</td></tr>
                              <tr><td className="py-3 font-medium text-slate-700">IRRF</td><td className="py-3 text-right text-slate-500">7.5%</td><td className="py-3 text-right font-bold text-red-600">- R$ {(selectedEmployeePayroll.salary * 0.075).toFixed(2)}</td></tr>
                              <tr><td className="py-3 font-medium text-slate-700">Vale Transporte</td><td className="py-3 text-right text-slate-500">6%</td><td className="py-3 text-right font-bold text-red-600">- R$ {(selectedEmployeePayroll.salary * 0.06).toFixed(2)}</td></tr>
                              <tr><td className="py-3 font-medium text-slate-700">Plano de Saúde</td><td className="py-3 text-right text-slate-500">Co-part.</td><td className="py-3 text-right font-bold text-red-600">- R$ 120,00</td></tr>
                            </tbody>
                            <tfoot className="border-t border-slate-100">
                              <tr><td colSpan={2} className="py-4 font-bold text-slate-800">Total Descontos</td><td className="py-4 text-right font-bold text-red-600 text-lg">- R$ {(selectedEmployeePayroll.salary * 0.245 + 120).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</td></tr>
                            </tfoot>
                          </table>
                        </div>
                      )}

                      {/* Placeholders for other internal tabs */}
                      {['hourbank', 'leaves', 'commissions', 'alerts'].includes(activePayslipTab) && (
                        <div className="flex flex-col items-center justify-center h-48 text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
                          <Activity className="w-8 h-8 mb-2 opacity-50" />
                          <p className="text-sm font-medium">Detalhes de {activePayslipTab === 'hourbank' ? 'Banco de Horas' : activePayslipTab === 'leaves' ? 'Folgas' : activePayslipTab === 'commissions' ? 'Comissões' : 'Alertas'} em desenvolvimento.</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <Users className="w-16 h-16 mb-4 opacity-30 bg-slate-200 rounded-full p-4" />
                    <p className="font-medium">Selecione um funcionário</p>
                    <p className="text-sm opacity-70">Visualize o holerite detalhado</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {isCreateGroupModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Novo Grupo de Folha</h3>
                <p className="text-sm text-slate-500">Configuração de Pagamento</p>
              </div>
              <button onClick={() => setIsCreateGroupModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">Nome do Grupo</label>
                  <input type="text" className="w-full border border-slate-200 rounded-lg p-2 text-sm" placeholder="Ex: Mensalistas ADM" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Início Apuração</label>
                  <input type="date" className="w-full border border-slate-200 rounded-lg p-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Fim Apuração</label>
                  <input type="date" className="w-full border border-slate-200 rounded-lg p-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Data Pagamento</label>
                  <input type="date" className="w-full border border-slate-200 rounded-lg p-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Banco Pagador</label>
                  <select className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-white"><option>Itaú</option><option>Bradesco</option></select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">Regras de Cálculo</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Aplicar DSR', 'Descontar Atrasos', 'Pagar HE 100%', 'INSS Patronal', 'FGTS', 'IRRF'].map(rule => (
                    <label key={rule} className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100">
                      <input type="checkbox" className="rounded text-blue-600" defaultChecked /> {rule}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setIsCreateGroupModalOpen(false)} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50">Cancelar</button>
              <button className={`px-6 py-2 bg-${config.primaryColor}-600 text-white rounded-lg hover:bg-${config.primaryColor}-700 font-bold shadow-md`}>Criar Grupo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PlaceholderTab({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-96 bg-white rounded-2xl border border-dashed border-slate-300 animate-in fade-in">
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
        <Briefcase className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-2">{title}</h3>
      <p className="text-slate-500">Esta funcionalidade estará disponível em breve.</p>
    </div>
  );
}
