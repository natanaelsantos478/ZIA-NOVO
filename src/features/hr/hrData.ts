// ============================================================
// TYPES & INTERFACES
// ============================================================
export type HRSection =
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

export type ContractType = 'CLT' | 'PJ' | 'Temporário' | 'Estágio';
export type WorkRegime = 'Horário Fixo' | 'Escala' | 'Banco de Horas';
export type EmployeeStatus = 'Ativo' | 'Inativo' | 'Afastado' | 'Férias';
export type WarningType = 'Verbal' | 'Escrita' | 'Suspensão';
export type AbsenceType = 'Médica' | 'Pessoal' | 'Judicial' | 'Luto' | 'Maternidade';
export type ApprovalStatus = 'Pendente' | 'Aprovado' | 'Rejeitado';

export interface Employee {
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
  rg?: string;
  ctps?: string;
  pis?: string;
  birthDate?: string;
  phone?: string;
  address?: string;
  bank?: string;
  agency?: string;
  account?: string;
  pixKey?: string;
  accessLevel: string;
  payrollGroup: string;
  benefits: string[];
  hourBankBalance: number;
  vacationDays: number;
  warnings: number;
}

export interface Warning {
  id: string;
  employeeName: string;
  employeeId: string;
  type: WarningType;
  date: string;
  reason: string;
  severity: 'Baixa' | 'Média' | 'Alta';
  status: 'Pendente Assinatura' | 'Assinada' | 'Recusada';
}

export interface Absence {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  type: AbsenceType;
  justified: boolean;
  document?: string;
  financialImpact: number;
  status: 'Registrada' | 'Pendente Documentação';
  dsrImpact?: number;
}

export interface TimeRecord {
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
  status: 'Normal' | 'Atraso' | 'Falta' | 'Incompleto' | 'Folga' | 'Feriado';
}

export interface Overtime {
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
  authorized?: boolean;
}

export interface PayrollGroup {
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

export interface Vacancy {
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

export interface ChangeRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  originalIn: string;
  originalOut: string;
  requestedIn: string;
  requestedOut: string;
  reason: string;
  evidence: string;
  status: ApprovalStatus;
  requestedAt: string;
}

export interface ScheduleShift {
  day: string;
  checkIn: string;
  checkOut: string;
  active: boolean;
}

export interface Schedule {
  id: string;
  name: string;
  type: string;
  employees: string[];
  shifts: ScheduleShift[];
}

export interface AlertConfig {
  id: string;
  type: string;
  threshold: number;
  unit: string;
  severity: 'Baixa' | 'Média' | 'Alta';
  recipient: string;
  action: string;
  active: boolean;
}

export interface DeptMetric {
  dept: string;
  headcount: number;
  avgHours: number;
  absenceRate: number;
  otHours: number;
  productivity: number;
}

export interface EmployeeHistory {
  month: string;
  salary: number;
  hoursWorked: number;
  overtimeHours: number;
  absences: number;
  productivity: number;
}

// ============================================================
// MOCK DATA
// ============================================================
export const mockEmployees: Employee[] = [
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

// Alias for compatibility
export const employees = mockEmployees;

export const mockWarnings: Warning[] = [
  { id: '1', employeeName: 'João Santos', employeeId: '2', type: 'Verbal', date: '2023-09-15', reason: 'Atrasos constantes', severity: 'Baixa', status: 'Assinada' },
  { id: '2', employeeName: 'Pedro Costa', employeeId: '4', type: 'Escrita', date: '2023-08-20', reason: 'Uso indevido de recursos', severity: 'Média', status: 'Assinada' },
  { id: '3', employeeName: 'Lucas Pereira', employeeId: '5', type: 'Suspensão', date: '2023-07-10', reason: 'Insubordinação', severity: 'Alta', status: 'Pendente Assinatura' },
  { id: '4', employeeName: 'Pedro Costa', employeeId: '4', type: 'Verbal', date: '2023-06-05', reason: 'Linguagem inadequada', severity: 'Baixa', status: 'Assinada' },
];

export const absences: Absence[] = [
  { id: '1', employeeId: '3', employeeName: 'Maria Oliveira', date: '2023-10-24', type: 'Médica', justified: true, document: 'atestado.pdf', financialImpact: 0, status: 'Registrada', dsrImpact: 0 },
  { id: '2', employeeId: '4', employeeName: 'Pedro Costa', date: '2023-10-15', type: 'Pessoal', justified: false, financialImpact: 981.81, status: 'Registrada', dsrImpact: 196.36 },
  { id: '3', employeeId: '2', employeeName: 'João Santos', date: '2023-10-10', type: 'Pessoal', justified: true, document: 'comprovante.pdf', financialImpact: 0, status: 'Pendente Documentação', dsrImpact: 0 },
  { id: '4', employeeId: '5', employeeName: 'Lucas Pereira', date: '2023-10-05', type: 'Pessoal', justified: false, financialImpact: 204.54, status: 'Registrada', dsrImpact: 40.90 },
  { id: '5', employeeId: '3', employeeName: 'Maria Oliveira', date: '2023-09-28', type: 'Médica', justified: true, document: 'atestado_28set.pdf', financialImpact: 0, status: 'Registrada', dsrImpact: 0 },
];

// Alias for compatibility
export const mockAbsences = absences;

export const timeRecords: TimeRecord[] = [
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

export const mockTimeRecords = timeRecords;

export const overtimes: Overtime[] = [
  { id:'1', employeeId:'1', employeeName:'Ana Silva', date:'2023-10-26', hours:1, type:'Dia Útil', percentage:50, value:85.22, approvalStatus:'Pendente', reason:'Deploy emergência produção', authorized:false },
  { id:'2', employeeId:'5', employeeName:'Lucas Pereira', date:'2023-10-26', hours:3, type:'Dia Útil', percentage:50, value:153.40, approvalStatus:'Pendente', reason:'Migração de dados crítica', authorized:true },
  { id:'3', employeeId:'5', employeeName:'Lucas Pereira', date:'2023-10-21', hours:4, type:'Sábado', percentage:100, value:122.72, approvalStatus:'Aprovado', reason:'Manutenção programada', authorized:true },
  { id:'4', employeeId:'4', employeeName:'Pedro Costa', date:'2023-10-20', hours:2, type:'Dia Útil', percentage:50, value:245.45, approvalStatus:'Rejeitado', reason:'Sem justificativa clara', authorized:false },
  { id:'5', employeeId:'2', employeeName:'João Santos', date:'2023-10-15', hours:2, type:'Domingo', percentage:100, value:200.00, approvalStatus:'Aprovado', reason:'Evento de marketing', authorized:true },
];

export const mockOvertimes = overtimes;

export const mockPayrollGroups: PayrollGroup[] = [
  { id: '1', name: 'Mensalistas - Out/23', period: '01/10/2023 - 31/10/2023', paymentDate: '05/11/2023', employeeCount: 45, totalGross: 350000, totalDeductions: 85000, totalNet: 265000, status: 'Em Processamento' },
  { id: '2', name: 'Mensalistas - Set/23', period: '01/09/2023 - 30/09/2023', paymentDate: '05/10/2023', employeeCount: 44, totalGross: 342000, totalDeductions: 82000, totalNet: 260000, status: 'Paga' },
  { id: '3', name: '13º Salário - 1ª Parcela', period: '2023', paymentDate: '30/11/2023', employeeCount: 45, totalGross: 175000, totalDeductions: 0, totalNet: 175000, status: 'Aberta' },
  { id: '4', name: 'Estagiários — Out/23', period: '01/10/2023 – 31/10/2023', paymentDate: '10/11/2023', employeeCount: 8, totalGross: 18000, totalDeductions: 1200, totalNet: 16800, status: 'Aberta' },
];

export const payrollGroups = mockPayrollGroups;

export const mockVacancies: Vacancy[] = [
  { id: '1', title: 'Desenvolvedor Full Stack', department: 'TI', contractType: 'CLT', salaryMin: 8000, salaryMax: 14000, daysOpen: 12, candidates: 47, status: 'Aberta', manager: 'Ana Silva' },
  { id: '2', title: 'Analista Financeiro', department: 'Financeiro', contractType: 'CLT', salaryMin: 5000, salaryMax: 8000, daysOpen: 5, candidates: 23, status: 'Aberta', manager: 'Roberto Costa' },
  { id: '3', title: 'SDR Comercial', department: 'Comercial', contractType: 'CLT', salaryMin: 2500, salaryMax: 4000, daysOpen: 30, candidates: 89, status: 'Aberta', manager: 'Pedro Costa' },
];

export const changeRequests: ChangeRequest[] = [
  { id:'1', employeeId:'1', employeeName:'Ana Silva', date:'2023-10-24', originalIn:'09:00', originalOut:'--:--', requestedIn:'09:00', requestedOut:'18:30', reason:'Esqueci de registrar saída — reunião externa', evidence:'email_cliente.pdf', status:'Pendente', requestedAt:'2023-10-25 08:30' },
  { id:'2', employeeId:'2', employeeName:'João Santos', date:'2023-10-20', originalIn:'--:--', originalOut:'18:00', requestedIn:'09:30', requestedOut:'18:00', reason:'Biométrico com falha técnica', evidence:'chamado_ti.pdf', status:'Aprovado', requestedAt:'2023-10-21 09:00' },
  { id:'3', employeeId:'5', employeeName:'Lucas Pereira', date:'2023-10-18', originalIn:'08:15', originalOut:'17:00', requestedIn:'08:00', requestedOut:'17:00', reason:'Atraso por acidente no trânsito (Linha 2 metro)', evidence:'foto_transito.jpg', status:'Rejeitado', requestedAt:'2023-10-19 07:45' },
  { id:'4', employeeId:'3', employeeName:'Maria Oliveira', date:'2023-10-17', originalIn:'', originalOut:'', requestedIn:'13:00', requestedOut:'17:00', reason:'Trabalho externo — visita ao fornecedor', evidence:'nota_visita.pdf', status:'Pendente', requestedAt:'2023-10-18 10:00' },
];

export const schedules: Schedule[] = [
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

export const alertConfigs: AlertConfig[] = [
  { id:'1', type:'Atraso Recorrente', threshold:3, unit:'vezes/mês', severity:'Média', recipient:'Gestor Direto', action:'Criar Anotação', active:true },
  { id:'2', type:'Falta Injustificada', threshold:1, unit:'por ocorrência', severity:'Alta', recipient:'RH + Gestor', action:'Notificação + Anotação', active:true },
  { id:'3', type:'HE Não Autorizada', threshold:1, unit:'por ocorrência', severity:'Alta', recipient:'Gestor Direto', action:'Bloquear e Notificar', active:true },
  { id:'4', type:'Jornada Excedente', threshold:10, unit:'horas/dia', severity:'Média', recipient:'RH', action:'Notificação', active:false },
  { id:'5', type:'Intervalo Irregular', threshold:5, unit:'min variação', severity:'Baixa', recipient:'Gestor Direto', action:'Notificação', active:true },
  { id:'6', type:'Saída Antecipada', threshold:30, unit:'min antes do fim', severity:'Baixa', recipient:'Gestor Direto', action:'Registrar Ocorrência', active:false },
];

export const deptMetrics: DeptMetric[] = [
  { dept:'TI',         headcount:85,  avgHours:168, absenceRate:1.2, otHours:420, productivity:91 },
  { dept:'Comercial',  headcount:150, avgHours:172, absenceRate:2.8, otHours:180, productivity:78 },
  { dept:'Marketing',  headcount:32,  avgHours:165, absenceRate:1.8, otHours:60,  productivity:84 },
  { dept:'RH',         headcount:18,  avgHours:164, absenceRate:1.0, otHours:15,  productivity:88 },
  { dept:'Financeiro', headcount:25,  avgHours:166, absenceRate:0.8, otHours:40,  productivity:92 },
];

export const getHistory = (empId: string): EmployeeHistory[] => {
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
