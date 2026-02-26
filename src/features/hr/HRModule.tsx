import React, { useState } from 'react';
import {
  Users, Calendar, Clock, AlertTriangle, Activity,
  Briefcase, TrendingDown, DollarSign, BrainCircuit,
  MoreHorizontal, Plus, X, Check
} from 'lucide-react';

// --- Types ---
type TabType = 'dashboard' | 'employees' | 'hour_bank' | 'vacations' | 'annotations' | 'activities' | 'admissions';

type WarningType = 'Verbal' | 'Escrita' | 'Suspensão';
type ActivityStatus = 'Pendente' | 'Em Andamento' | 'Concluída' | 'Atrasada';
type VacancyStatus = 'Aberta' | 'Em Seleção' | 'Encerrada' | 'Cancelada';
type ContractType = 'CLT' | 'PJ' | 'Estágio';

interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  status: 'Ativo' | 'Férias' | 'Afastado' | 'Desligado';
  admissionDate: string;
  avatar: string;
}

interface HourBank {
  id: string; employeeId: string; employeeName: string
  balance: number; credits: number; debits: number
  expirationDate: string
  status: 'Regular' | 'Excedente' | 'Negativo'
}

interface Vacation {
  id: string; employeeId: string; employeeName: string
  acquisitivePeriodStart: string; acquisitivePeriodEnd: string
  daysAvailable: number; daysScheduled: number
  scheduledStart?: string; scheduledEnd?: string
  status: 'Disponível' | 'Agendada' | 'Em Curso' | 'Vencida'
}

interface Warning {
  id: string; employeeId: string; employeeName: string
  type: WarningType; reason: string; date: string
  witness: string; employeeResponse?: string
  status: 'Pendente Assinatura' | 'Assinada' | 'Recusada'
}

interface Activity {
  id: string; title: string; description: string
  assignedTo: string; department: string; dueDate: string
  status: ActivityStatus; priority: 'Alta' | 'Média' | 'Baixa'
  category: string; completedAt?: string
  reworkCount: number; estimatedHours: number
  actualHours: number; cost: number
}

interface Vacancy {
  id: string; role: string; department: string
  manager: string; openPositions: number
  contractType: ContractType; salaryRange: string
  status: VacancyStatus; openedAt: string
  candidates: number; source: string
}

interface Candidate {
  id: string; vacancyId: string; name: string
  email: string; phone: string
  stage: 'Triagem' | 'Entrevista RH' | 'Entrevista Técnica' | 'Proposta' | 'Contratado' | 'Reprovado'
  score: number; appliedAt: string; ziaAnalysis: string
}

// --- Mock Data ---
const mockEmployees: Employee[] = [
  { id: 'E001', name: 'Ana Paula Ferreira', role: 'Gerente de RH', department: 'RH', status: 'Ativo', admissionDate: '2022-03-15', avatar: 'https://i.pravatar.cc/150?u=E001' },
  { id: 'E002', name: 'Roberto Silva', role: 'Analista Sênior', department: 'Operações', status: 'Ativo', admissionDate: '2021-08-10', avatar: 'https://i.pravatar.cc/150?u=E002' },
  { id: 'E003', name: 'Carla Dias', role: 'Coordenadora', department: 'Financeiro', status: 'Férias', admissionDate: '2023-01-20', avatar: 'https://i.pravatar.cc/150?u=E003' },
  { id: 'E004', name: 'Marcos Oliveira', role: 'Assistente', department: 'TI', status: 'Ativo', admissionDate: '2023-11-05', avatar: 'https://i.pravatar.cc/150?u=E004' },
];

const mockHourBank: HourBank[] = [
  { id:'HB001', employeeId:'E002', employeeName:'Roberto Silva', balance:12.5, credits:18, debits:5.5, expirationDate:'2026-06-30', status:'Regular' },
  { id:'HB002', employeeId:'E004', employeeName:'Marcos Oliveira', balance:28.3, credits:35, debits:6.7, expirationDate:'2026-06-30', status:'Excedente' },
  { id:'HB003', employeeId:'E001', employeeName:'Ana Paula Ferreira', balance:-2.5, credits:5, debits:7.5, expirationDate:'2026-06-30', status:'Negativo' },
]

const mockVacations: Vacation[] = [
  { id:'V001', employeeId:'E001', employeeName:'Ana Paula Ferreira', acquisitivePeriodStart:'2025-03-15', acquisitivePeriodEnd:'2026-03-14', daysAvailable:30, daysScheduled:0, status:'Disponível' },
  { id:'V002', employeeId:'E002', employeeName:'Roberto Silva', acquisitivePeriodStart:'2025-07-01', acquisitivePeriodEnd:'2026-06-30', daysAvailable:30, daysScheduled:15, scheduledStart:'2026-03-10', scheduledEnd:'2026-03-24', status:'Agendada' },
  { id:'V003', employeeId:'E004', employeeName:'Marcos Oliveira', acquisitivePeriodStart:'2024-11-20', acquisitivePeriodEnd:'2025-11-19', daysAvailable:30, daysScheduled:30, status:'Vencida' },
]

const mockWarnings: Warning[] = [
  { id:'W001', employeeId:'E004', employeeName:'Marcos Oliveira', type:'Escrita', reason:'Atraso recorrente — 5 ocorrências em 30 dias', date:'2026-02-10', witness:'Juliana Mendes', status:'Assinada' },
  { id:'W002', employeeId:'E001', employeeName:'Ana Paula Ferreira', type:'Verbal', reason:'Uso indevido do sistema durante horário de trabalho', date:'2026-02-20', witness:'Carlos Mendes', status:'Pendente Assinatura' },
]

const mockActivities: Activity[] = [
  { id:'ACT001', title:'Elaborar relatório mensal de ponto', description:'Consolidar dados de ponto fev/2026 e enviar para DP', assignedTo:'Juliana Mendes', department:'RH', dueDate:'2026-02-28', status:'Em Andamento', priority:'Alta', category:'Relatório', reworkCount:0, estimatedHours:4, actualHours:2.5, cost:112.50 },
  { id:'ACT002', title:'Onboarding — Roberto Silva', description:'Configurar acessos e apresentar equipe', assignedTo:'Juliana Mendes', department:'RH', dueDate:'2026-02-15', status:'Concluída', priority:'Alta', category:'Admissão', completedAt:'2026-02-14', reworkCount:0, estimatedHours:8, actualHours:7, cost:262.50 },
  { id:'ACT003', title:'Revisão de contratos PJ', description:'Revisar cláusulas dos contratos vencendo em março', assignedTo:'Juliana Mendes', department:'RH', dueDate:'2026-02-20', status:'Atrasada', priority:'Média', category:'Jurídico', reworkCount:1, estimatedHours:6, actualHours:3, cost:225.00 },
  { id:'ACT004', title:'Pesquisa de clima organizacional', description:'Enviar formulário e consolidar respostas Q1/2026', assignedTo:'Ana Paula Ferreira', department:'Comercial', dueDate:'2026-03-05', status:'Pendente', priority:'Média', category:'Engajamento', reworkCount:0, estimatedHours:3, actualHours:0, cost:0 },
]

const mockVacancies: Vacancy[] = [
  { id:'VAC001', role:'Desenvolvedor Full Stack', department:'TI', manager:'Mariana Costa', openPositions:2, contractType:'CLT', salaryRange:'R$ 8.000 – R$ 12.000', status:'Em Seleção', openedAt:'2026-02-01', candidates:34, source:'LinkedIn' },
  { id:'VAC002', role:'Analista Financeiro Júnior', department:'Financeiro', manager:'Paulo Rocha', openPositions:1, contractType:'CLT', salaryRange:'R$ 3.500 – R$ 4.500', status:'Aberta', openedAt:'2026-02-15', candidates:12, source:'ZIAvagas' },
  { id:'VAC003', role:'Motorista de Entregas', department:'Logística', manager:'Sandra Lima', openPositions:3, contractType:'CLT', salaryRange:'R$ 2.500 – R$ 3.200', status:'Encerrada', openedAt:'2026-01-10', candidates:67, source:'Indicação' },
]

const mockCandidates: Candidate[] = [
  { id:'C001', vacancyId:'VAC001', name:'Felipe Andrade', email:'felipe@email.com', phone:'(11) 99999-1234', stage:'Entrevista Técnica', score:87, appliedAt:'2026-02-05', ziaAnalysis:'Perfil técnico forte. 4 anos React e Node.js. Aderência alta ao cargo.' },
  { id:'C002', vacancyId:'VAC001', name:'Tatiane Gomes', email:'tatiane@email.com', phone:'(11) 98888-5678', stage:'Proposta', score:92, appliedAt:'2026-02-07', ziaAnalysis:'Excelente fit técnico e cultural. Experiência em produto similar. Recomendado para contratação.' },
  { id:'C003', vacancyId:'VAC002', name:'Lucas Barros', email:'lucas@email.com', phone:'(21) 97777-9012', stage:'Entrevista RH', score:74, appliedAt:'2026-02-18', ziaAnalysis:'Bom perfil acadêmico. Pouca experiência prática. Potencial para crescimento.' },
]

export default function HRModule() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  type AnnotationSubTab = 'warnings' | 'annotations' | 'productivity'
  type AdmissionSubTab = 'metrics' | 'vacancies' | 'candidates' | 'alerts'

  const [annotationSubTab, setAnnotationSubTab] = useState<AnnotationSubTab>('warnings')
  const [admissionSubTab, setAdmissionSubTab] = useState<AdmissionSubTab>('metrics')
  const [candidateViewMode, setCandidateViewMode] = useState<'table' | 'kanban'>('table')
  const [selectedVacancy, setSelectedVacancy] = useState<string>('VAC001')
  const [showNewWarningModal, setShowNewWarningModal] = useState(false)
  const [showNewActivityModal, setShowNewActivityModal] = useState(false)
  const [showNewAnnotationTypeModal, setShowNewAnnotationTypeModal] = useState(false)
  const [showConfigAlertModal, setShowConfigAlertModal] = useState(false)
  const [showNewVacancyModal, setShowNewVacancyModal] = useState(false)
  const [showScheduleVacationModal, setShowScheduleVacationModal] = useState(false)
  const [showNewHourBankModal, setShowNewHourBankModal] = useState(false)
  const [warnings, setWarnings] = useState<Warning[]>(mockWarnings)
  const [activities, setActivities] = useState<Activity[]>(mockActivities)
  const [vacancies, setVacancies] = useState<Vacancy[]>(mockVacancies)
  const [hourBank, setHourBank] = useState<HourBank[]>(mockHourBank)
  const [vacations, setVacations] = useState<Vacation[]>(mockVacations)

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Headcount Total', value: '847', change: '+12%', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-100' },
          { label: 'Vagas Abertas', value: '23', change: '+5', icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-100' },
          { label: 'Absenteísmo', value: '1.8%', change: '-0.4%', icon: TrendingDown, color: 'text-purple-600', bg: 'bg-purple-100' },
          { label: 'Turnover', value: '4.2%', change: '-0.8%', icon: Activity, color: 'text-amber-600', bg: 'bg-amber-100' },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">{kpi.label}</p>
              <h3 className="text-2xl font-bold text-slate-900">{kpi.value}</h3>
              <span className={`text-xs font-bold ${kpi.change.includes('-') ? 'text-emerald-500' : 'text-slate-500'} flex items-center mt-2`}>
                {kpi.change} <span className="text-slate-400 font-normal ml-1">vs mês anterior</span>
              </span>
            </div>
            <div className={`p-3 rounded-xl ${kpi.bg}`}>
              <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 flex gap-6 overflow-x-auto">
        {[
          { id: 'dashboard', label: 'Visão Geral' },
          { id: 'employees', label: 'Funcionários' },
          { id: 'hour_bank', label: 'Banco de Horas' },
          { id: 'vacations', label: 'Férias' },
          { id: 'annotations', label: 'Anotações' },
          { id: 'admissions', label: 'Admissões' },
          { id: 'activities', label: 'Atividades' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 min-h-[400px]">
        {activeTab === 'dashboard' && (
           <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <Activity className="w-12 h-12 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-900">Dashboard RH</h3>
            <p className="text-slate-500 max-w-md">Visão geral dos indicadores de recursos humanos.</p>
           </div>
        )}

        {activeTab === 'employees' && (
           <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <Users className="w-12 h-12 text-slate-300" />
            <h3 className="text-lg font-medium text-slate-900">Gestão de Funcionários</h3>
            <p className="text-slate-500 max-w-md">Lista completa de colaboradores e gestão de perfis.</p>
           </div>
        )}

        {activeTab === 'hour_bank' && (
           <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Saldo Total Empresa</p>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {hourBank.filter(h => h.balance > 0).reduce((acc, curr) => acc + curr.balance, 0).toFixed(1)}h
                  </h3>
                </div>
                <div className="p-3 rounded-xl bg-blue-100">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Colaboradores Excedentes</p>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {hourBank.filter(h => h.status === 'Excedente').length}
                  </h3>
                </div>
                <div className="p-3 rounded-xl bg-amber-100">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 mb-1">Colaboradores Negativos</p>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {hourBank.filter(h => h.status === 'Negativo').length}
                  </h3>
                </div>
                <div className="p-3 rounded-xl bg-red-100">
                  <TrendingDown className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800">Banco de Horas por Colaborador</h3>
                <button
                  onClick={() => setShowNewHourBankModal(true)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Registrar Movimentação
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-slate-900 font-semibold border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Funcionário</th>
                      <th className="px-6 py-4">Saldo</th>
                      <th className="px-6 py-4">Créditos</th>
                      <th className="px-6 py-4">Débitos</th>
                      <th className="px-6 py-4">Vencimento</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {hourBank.map((item) => (
                      <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${item.status === 'Negativo' ? 'bg-red-950/30' : ''}`}>
                        <td className="px-6 py-4 font-medium text-slate-900">{item.employeeName}</td>
                        <td className={`px-6 py-4 font-bold ${item.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {item.balance > 0 ? '+' : ''}{item.balance}h
                        </td>
                        <td className="px-6 py-4 text-emerald-600">+{item.credits}h</td>
                        <td className="px-6 py-4 text-red-600">-{item.debits}h</td>
                        <td className="px-6 py-4">{new Date(item.expirationDate).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            item.status === 'Regular' ? 'bg-emerald-100 text-emerald-700' :
                            item.status === 'Excedente' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal */}
            {showNewHourBankModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-900">Registrar Movimentação</h3>
                    <button onClick={() => setShowNewHourBankModal(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <form onSubmit={(e) => { e.preventDefault(); setShowNewHourBankModal(false); }} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Funcionário</label>
                      <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        {mockEmployees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2">
                          <input type="radio" name="type" value="credit" className="text-indigo-600 focus:ring-indigo-500" defaultChecked />
                          <span className="text-sm text-slate-600">Crédito</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="radio" name="type" value="debit" className="text-indigo-600 focus:ring-indigo-500" />
                          <span className="text-sm text-slate-600">Débito</span>
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Horas</label>
                      <input type="number" step="0.5" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="0.0" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Motivo</label>
                      <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                      <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button type="button" onClick={() => setShowNewHourBankModal(false)} className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors">
                        Cancelar
                      </button>
                      <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
                        Registrar
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
           </div>
        )}

        {activeTab === 'vacations' && (
           <div className="space-y-6">
            {/* Banners */}
            {vacations.some(v => v.status === 'Vencida') && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <p className="text-sm font-medium text-red-800">
                  {vacations.filter(v => v.status === 'Vencida').length} colaborador(es) com férias vencidas — ação necessária
                </p>
              </div>
            )}
            {vacations.some(v => v.status === 'Disponível' && new Date(v.acquisitivePeriodEnd) <= new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)) && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-center gap-3">
                <Calendar className="w-5 h-5 text-amber-600" />
                <p className="text-sm font-medium text-amber-800">
                  Atenção: férias próximas do vencimento
                </p>
              </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800">Controle de Férias</h3>
                <button
                  onClick={() => setShowScheduleVacationModal(true)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" /> Agendar Férias
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-slate-900 font-semibold border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Funcionário</th>
                      <th className="px-6 py-4">Período Aquisitivo</th>
                      <th className="px-6 py-4">Dias Disponíveis</th>
                      <th className="px-6 py-4">Dias Agendados</th>
                      <th className="px-6 py-4">Início Previsto</th>
                      <th className="px-6 py-4">Fim Previsto</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vacations.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900">{item.employeeName}</td>
                        <td className="px-6 py-4">
                          {new Date(item.acquisitivePeriodStart).toLocaleDateString()} - {new Date(item.acquisitivePeriodEnd).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-900">{item.daysAvailable}</td>
                        <td className="px-6 py-4 text-slate-500">{item.daysScheduled}</td>
                        <td className="px-6 py-4">{item.scheduledStart ? new Date(item.scheduledStart).toLocaleDateString() : '-'}</td>
                        <td className="px-6 py-4">{item.scheduledEnd ? new Date(item.scheduledEnd).toLocaleDateString() : '-'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            item.status === 'Disponível' ? 'bg-emerald-100 text-emerald-700' :
                            item.status === 'Agendada' ? 'bg-blue-100 text-blue-700' :
                            item.status === 'Em Curso' ? 'bg-indigo-100 text-indigo-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal */}
            {showScheduleVacationModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-900">Agendar Férias</h3>
                    <button onClick={() => setShowScheduleVacationModal(false)} className="text-slate-400 hover:text-slate-600">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <form onSubmit={(e) => { e.preventDefault(); setShowScheduleVacationModal(false); }} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Funcionário</label>
                      <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        {mockEmployees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Início</label>
                        <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Fim</label>
                        <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-sm text-slate-600 font-medium">Período: <span className="text-slate-900">0 dias</span></p>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700">Verifique a cobertura do setor antes de confirmar o agendamento.</p>
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button type="button" onClick={() => setShowScheduleVacationModal(false)} className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors">
                        Cancelar
                      </button>
                      <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
                        Confirmar Agendamento
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
           </div>
        )}

        {activeTab === 'annotations' && (
           <div className="space-y-6">
            {/* Sub-tabs */}
            <div className="flex gap-2">
              {(['warnings', 'annotations', 'productivity'] as AnnotationSubTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setAnnotationSubTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    annotationSubTab === tab
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab === 'warnings' ? 'Advertências' : tab === 'annotations' ? 'Anotações' : 'Produtividade'}
                </button>
              ))}
            </div>

            {/* Content */}
            {annotationSubTab === 'warnings' && (
              <div className="space-y-6">
                 <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center gap-3">
                   <AlertTriangle className="w-5 h-5 text-red-600" />
                   <p className="text-sm font-medium text-red-800">2 advertências este mês</p>
                 </div>

                 <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                   <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                     <h3 className="font-bold text-slate-800">Histórico de Advertências</h3>
                     <button
                       onClick={() => setShowNewWarningModal(true)}
                       className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
                     >
                       <Plus className="w-4 h-4" /> Nova Advertência
                     </button>
                   </div>
                   <div className="overflow-x-auto">
                     <table className="w-full text-left text-sm text-slate-600">
                       <thead className="bg-slate-50 text-slate-900 font-semibold border-b border-slate-100">
                         <tr>
                           <th className="px-6 py-4">Funcionário</th>
                           <th className="px-6 py-4">Tipo</th>
                           <th className="px-6 py-4">Motivo</th>
                           <th className="px-6 py-4">Data</th>
                           <th className="px-6 py-4">Testemunha</th>
                           <th className="px-6 py-4">Status</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                         {warnings.map((warning) => (
                           <tr key={warning.id} className="hover:bg-slate-50 transition-colors">
                             <td className="px-6 py-4 font-medium text-slate-900">{warning.employeeName}</td>
                             <td className="px-6 py-4">
                               <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                 warning.type === 'Verbal' ? 'bg-amber-100 text-amber-700' :
                                 warning.type === 'Escrita' ? 'bg-orange-100 text-orange-700' :
                                 'bg-red-100 text-red-700'
                               }`}>
                                 {warning.type}
                               </span>
                             </td>
                             <td className="px-6 py-4 max-w-xs truncate" title={warning.reason}>{warning.reason}</td>
                             <td className="px-6 py-4">{new Date(warning.date).toLocaleDateString()}</td>
                             <td className="px-6 py-4">{warning.witness}</td>
                             <td className="px-6 py-4">
                               <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                 warning.status === 'Assinada' ? 'bg-emerald-100 text-emerald-700' :
                                 warning.status === 'Pendente Assinatura' ? 'bg-amber-100 text-amber-700' :
                                 'bg-red-100 text-red-700'
                               }`}>
                                 {warning.status}
                               </span>
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 </div>

                 {/* Modal Nova Advertência */}
                 {showNewWarningModal && (
                   <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                     <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                       <div className="flex justify-between items-center mb-6">
                         <h3 className="text-lg font-bold text-slate-900">Registrar Advertência</h3>
                         <button onClick={() => setShowNewWarningModal(false)} className="text-slate-400 hover:text-slate-600">
                           <X className="w-5 h-5" />
                         </button>
                       </div>
                       <form onSubmit={(e) => { e.preventDefault(); setShowNewWarningModal(false); }} className="space-y-4">
                         <div>
                           <label className="block text-sm font-medium text-slate-700 mb-1">Funcionário</label>
                           <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                             {mockEmployees.map(emp => (
                               <option key={emp.id} value={emp.id}>{emp.name}</option>
                             ))}
                           </select>
                         </div>
                         <div>
                           <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                           <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                             <option value="Verbal">Verbal</option>
                             <option value="Escrita">Escrita</option>
                             <option value="Suspensão">Suspensão</option>
                           </select>
                         </div>
                         <div>
                           <label className="block text-sm font-medium text-slate-700 mb-1">Motivo</label>
                           <textarea className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24"></textarea>
                         </div>
                         <div>
                           <label className="block text-sm font-medium text-slate-700 mb-1">Testemunha</label>
                           <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                         </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                            <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                         </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Resposta do Colaborador (Opcional)</label>
                            <textarea className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-20"></textarea>
                         </div>
                         <div className="flex gap-3 pt-4">
                           <button type="button" onClick={() => setShowNewWarningModal(false)} className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors">
                             Cancelar
                           </button>
                           <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
                             Registrar Advertência
                           </button>
                         </div>
                       </form>
                     </div>
                   </div>
                 )}
              </div>
            )}

            {annotationSubTab === 'annotations' && (
              <div className="space-y-6">
                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                   <p className="text-sm text-slate-600">
                     Configure tipos de anotação personalizados com gastos vinculados, roteamento automático e atividades disparadas automaticamente.
                   </p>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   {[
                     { title: 'Visita Técnica', costs: 'R$ 150 (combustível) + R$ 50 (pedágio)', routing: 'ERP + CRM', activity: 'Relatório de visita (prazo: 24h)' },
                     { title: 'Treinamento Externo', costs: 'Variável (nota fiscal)', routing: 'ERP', activity: 'Aplicar conhecimento (prazo: 7 dias)' },
                     { title: 'Reunião com Cliente', costs: 'Nenhum', routing: 'CRM', activity: 'Follow-up comercial (prazo: 48h)' },
                   ].map((card, i) => (
                     <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
                       <h3 className="font-bold text-slate-900 text-lg">{card.title}</h3>
                       <div className="space-y-2 text-sm">
                         <div className="flex justify-between border-b border-slate-50 pb-2">
                           <span className="text-slate-500">Gastos:</span>
                           <span className="font-medium text-slate-700 text-right">{card.costs}</span>
                         </div>
                         <div className="flex justify-between border-b border-slate-50 pb-2">
                           <span className="text-slate-500">Roteamento:</span>
                           <span className="font-medium text-slate-700">{card.routing}</span>
                         </div>
                         <div className="flex justify-between">
                           <span className="text-slate-500">Atividade:</span>
                           <span className="font-medium text-slate-700 text-right">{card.activity}</span>
                         </div>
                       </div>
                     </div>
                   ))}

                   <button
                     onClick={() => setShowNewAnnotationTypeModal(true)}
                     className="border-2 border-dashed border-slate-300 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 text-slate-400 hover:border-indigo-500 hover:text-indigo-500 transition-colors"
                   >
                     <Plus className="w-8 h-8" />
                     <span className="font-medium">Criar Tipo de Anotação</span>
                   </button>
                 </div>

                 {/* Modal Criar Tipo de Anotação */}
                 {showNewAnnotationTypeModal && (
                   <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
                     <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 my-8">
                       <div className="flex justify-between items-center mb-6">
                         <h3 className="text-lg font-bold text-slate-900">Criar Tipo de Anotação</h3>
                         <button onClick={() => setShowNewAnnotationTypeModal(false)} className="text-slate-400 hover:text-slate-600">
                           <X className="w-5 h-5" />
                         </button>
                       </div>
                       <form onSubmit={(e) => { e.preventDefault(); setShowNewAnnotationTypeModal(false); }} className="space-y-6">
                         <div>
                           <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Tipo</label>
                           <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ex: Viagem Corporativa" />
                         </div>

                         <div>
                           <label className="block text-sm font-medium text-slate-700 mb-2">Tabela de Gastos Diretos</label>
                           <div className="border border-slate-200 rounded-lg overflow-hidden">
                             <table className="w-full text-left text-xs">
                               <thead className="bg-slate-50">
                                 <tr>
                                   <th className="px-3 py-2 font-medium text-slate-600">Descrição</th>
                                   <th className="px-3 py-2 font-medium text-slate-600">Valor Estimado</th>
                                   <th className="px-3 py-2 font-medium text-slate-600">Impostos</th>
                                 </tr>
                               </thead>
                               <tbody>
                                 <tr>
                                   <td className="px-3 py-2 text-slate-400 italic" colSpan={3}>Nenhum gasto configurado</td>
                                 </tr>
                               </tbody>
                             </table>
                             <button type="button" className="w-full py-2 text-xs text-indigo-600 font-medium hover:bg-indigo-50 transition-colors border-t border-slate-100">+ Adicionar gasto</button>
                           </div>
                         </div>

                         <div>
                           <label className="block text-sm font-medium text-slate-700 mb-2">Roteamento</label>
                           <div className="flex gap-4">
                             <label className="flex items-center gap-2">
                               <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500" />
                               <span className="text-sm text-slate-600">Integrar com ERP (Financeiro)</span>
                             </label>
                             <label className="flex items-center gap-2">
                               <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500" />
                               <span className="text-sm text-slate-600">Integrar com CRM (Vendas)</span>
                             </label>
                           </div>
                         </div>

                         <div>
                           <label className="block text-sm font-medium text-slate-700 mb-1">Atividade Vinculada</label>
                           <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ex: Preencher relatório de despesas" />
                         </div>

                         <div>
                           <label className="block text-sm font-medium text-slate-700 mb-2">Alertas — Destinatários</label>
                           <div className="flex flex-wrap gap-4">
                             {['Gestor Direto', 'RH', 'Financeiro', 'Diretoria'].map(role => (
                               <label key={role} className="flex items-center gap-2">
                                 <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500" />
                                 <span className="text-sm text-slate-600">{role}</span>
                               </label>
                             ))}
                           </div>
                         </div>

                         <div className="flex gap-3 pt-4 border-t border-slate-100">
                           <button type="button" onClick={() => setShowNewAnnotationTypeModal(false)} className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors">
                             Cancelar
                           </button>
                           <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
                             Salvar Tipo
                           </button>
                         </div>
                       </form>
                     </div>
                   </div>
                 )}
              </div>
            )}

            {annotationSubTab === 'productivity' && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-100">
                   <span className="text-sm font-medium text-slate-600">Filtrar por:</span>
                   <select className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                     <option>Todos os Funcionários</option>
                     {mockEmployees.map(e => <option key={e.id}>{e.name}</option>)}
                   </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white p-4 rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-500 uppercase font-bold">Total de Atividades</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{activities.length}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-500 uppercase font-bold">Concluídas no Prazo</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">{activities.filter(a => a.status === 'Concluída').length}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-500 uppercase font-bold">Atrasadas</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">{activities.filter(a => a.status === 'Atrasada').length}</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-500 uppercase font-bold">Taxa de Retrabalho</p>
                    <p className="text-2xl font-bold text-amber-600 mt-1">
                      {((activities.filter(a => a.reworkCount > 0).length / activities.length) * 100 || 0).toFixed(0)}%
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                   <div className="overflow-x-auto">
                     <table className="w-full text-left text-sm text-slate-600">
                       <thead className="bg-slate-50 text-slate-900 font-semibold border-b border-slate-100">
                         <tr>
                           <th className="px-6 py-4">Título</th>
                           <th className="px-6 py-4">Prazo</th>
                           <th className="px-6 py-4">H. Est.</th>
                           <th className="px-6 py-4">H. Real.</th>
                           <th className="px-6 py-4">Custo</th>
                           <th className="px-6 py-4">Status</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                         {activities.map((act) => (
                           <tr key={act.id} className={`hover:bg-slate-50 transition-colors ${act.status === 'Atrasada' ? 'bg-red-950/20' : ''}`}>
                             <td className="px-6 py-4 font-medium text-slate-900">{act.title}</td>
                             <td className="px-6 py-4">{new Date(act.dueDate).toLocaleDateString()}</td>
                             <td className="px-6 py-4">{act.estimatedHours}h</td>
                             <td className="px-6 py-4">{act.actualHours}h</td>
                             <td className="px-6 py-4">R$ {act.cost.toFixed(2)}</td>
                             <td className="px-6 py-4">
                               <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                 act.status === 'Concluída' ? 'bg-emerald-100 text-emerald-700' :
                                 act.status === 'Em Andamento' ? 'bg-blue-100 text-blue-700' :
                                 act.status === 'Atrasada' ? 'bg-red-100 text-red-700' :
                                 'bg-slate-100 text-slate-600'
                               }`}>
                                 {act.status}
                               </span>
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                </div>
              </div>
            )}
           </div>
        )}

        {activeTab === 'activities' && (
           <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                 <div>
                    <p className="text-xs text-slate-500 uppercase font-bold">Total</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{activities.length}</p>
                 </div>
                 <div className="p-2 bg-slate-100 rounded-lg"><Activity className="w-5 h-5 text-slate-600" /></div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                 <div>
                    <p className="text-xs text-slate-500 uppercase font-bold">Em Andamento</p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">{activities.filter(a => a.status === 'Em Andamento').length}</p>
                 </div>
                 <div className="p-2 bg-blue-100 rounded-lg"><Clock className="w-5 h-5 text-blue-600" /></div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                 <div>
                    <p className="text-xs text-slate-500 uppercase font-bold">Atrasadas</p>
                    <p className="text-2xl font-bold text-red-600 mt-1">{activities.filter(a => a.status === 'Atrasada').length}</p>
                 </div>
                 <div className="p-2 bg-red-100 rounded-lg"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                 <div>
                    <p className="text-xs text-slate-500 uppercase font-bold">Concluídas</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">{activities.filter(a => a.status === 'Concluída').length}</p>
                 </div>
                 <div className="p-2 bg-emerald-100 rounded-lg"><Check className="w-5 h-5 text-emerald-600" /></div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
               <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                 <h3 className="font-bold text-slate-800">Atividades e Projetos</h3>
                 <button
                   onClick={() => setShowNewActivityModal(true)}
                   className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
                 >
                   <Plus className="w-4 h-4" /> Nova Atividade
                 </button>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm text-slate-600">
                   <thead className="bg-slate-50 text-slate-900 font-semibold border-b border-slate-100">
                     <tr>
                       <th className="px-6 py-4">Título</th>
                       <th className="px-6 py-4">Responsável</th>
                       <th className="px-6 py-4">Departamento</th>
                       <th className="px-6 py-4">Prazo</th>
                       <th className="px-6 py-4">H.Est</th>
                       <th className="px-6 py-4">H.Real</th>
                       <th className="px-6 py-4">Custo</th>
                       <th className="px-6 py-4">Status</th>
                       <th className="px-6 py-4">Prioridade</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {activities.map((act) => (
                       <tr key={act.id} className="hover:bg-slate-50 transition-colors">
                         <td className="px-6 py-4 font-medium text-slate-900">{act.title}</td>
                         <td className="px-6 py-4">{act.assignedTo}</td>
                         <td className="px-6 py-4">{act.department}</td>
                         <td className="px-6 py-4">{new Date(act.dueDate).toLocaleDateString()}</td>
                         <td className="px-6 py-4">{act.estimatedHours}h</td>
                         <td className="px-6 py-4">{act.actualHours}h</td>
                         <td className="px-6 py-4">R$ {act.cost.toFixed(2)}</td>
                         <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                              act.status === 'Concluída' ? 'bg-emerald-100 text-emerald-700' :
                              act.status === 'Em Andamento' ? 'bg-blue-100 text-blue-700' :
                              act.status === 'Atrasada' ? 'bg-red-100 text-red-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {act.status}
                            </span>
                         </td>
                         <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                act.priority === 'Alta' ? 'bg-red-100 text-red-700' :
                                act.priority === 'Média' ? 'bg-amber-100 text-amber-700' :
                                'bg-slate-100 text-slate-600'
                            }`}>
                                {act.priority}
                            </span>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>

            {/* Modal Nova Atividade */}
            {showNewActivityModal && (
               <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
                 <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 my-8">
                   <div className="flex justify-between items-center mb-6">
                     <h3 className="text-lg font-bold text-slate-900">Nova Atividade</h3>
                     <button onClick={() => setShowNewActivityModal(false)} className="text-slate-400 hover:text-slate-600">
                       <X className="w-5 h-5" />
                     </button>
                   </div>
                   <form onSubmit={(e) => { e.preventDefault(); setShowNewActivityModal(false); }} className="space-y-6">
                     {/* Seção 1 */}
                     <div>
                        <h4 className="text-sm font-bold text-slate-900 mb-3 border-b border-slate-100 pb-1">Dados da Atividade</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
                                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                                <textarea className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-20"></textarea>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Responsável</label>
                                <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                    {mockEmployees.map(emp => (
                                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Departamento</label>
                                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Prazo</label>
                                <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Prioridade</label>
                                <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                    <option>Alta</option>
                                    <option>Média</option>
                                    <option>Baixa</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                        </div>
                     </div>

                     {/* Seção 2 */}
                     <div>
                        <h4 className="text-sm font-bold text-slate-900 mb-3 border-b border-slate-100 pb-1">Tipo e Gatilho</h4>
                        <div className="space-y-3">
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2">
                                    <input type="radio" name="activityType" className="text-indigo-600 focus:ring-indigo-500" defaultChecked />
                                    <span className="text-sm text-slate-600">Manual</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input type="radio" name="activityType" className="text-indigo-600 focus:ring-indigo-500" />
                                    <span className="text-sm text-slate-600">Automática</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input type="radio" name="activityType" className="text-indigo-600 focus:ring-indigo-500" />
                                    <span className="text-sm text-slate-600">Recorrente</span>
                                </label>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Gatilho (se Automática)</label>
                                <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" disabled>
                                    <option>Lead novo no CRM</option>
                                    <option>Lead movido de etapa</option>
                                    <option>Ação no ERP</option>
                                    <option>Data/Hora programada</option>
                                    <option>Conclusão de outra atividade</option>
                                    <option>Alteração de status de funcionário</option>
                                </select>
                            </div>
                        </div>
                     </div>

                     {/* Seção 3 */}
                     <div>
                        <h4 className="text-sm font-bold text-slate-900 mb-3 border-b border-slate-100 pb-1">Custo Estimado</h4>
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Horas Estimadas</label>
                                <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                <p className="text-xs text-slate-400 mt-1">(horas × salário/hora do responsável)</p>
                             </div>
                             <div className="col-span-2">
                                 <label className="block text-sm font-medium text-slate-700 mb-1">Custos Diretos</label>
                                 <div className="border border-slate-200 rounded-lg overflow-hidden">
                                     <table className="w-full text-left text-xs">
                                         <thead className="bg-slate-50">
                                             <tr>
                                                 <th className="px-3 py-2 font-medium text-slate-600">Descrição</th>
                                                 <th className="px-3 py-2 font-medium text-slate-600">Valor</th>
                                             </tr>
                                         </thead>
                                         <tbody>
                                             <tr>
                                                 <td className="px-3 py-2 text-slate-400 italic" colSpan={2}>Nenhum custo adicional</td>
                                             </tr>
                                         </tbody>
                                     </table>
                                     <button type="button" className="w-full py-2 text-xs text-indigo-600 font-medium hover:bg-indigo-50 transition-colors">+ Adicionar custo</button>
                                 </div>
                             </div>
                             <div className="col-span-2 flex justify-end items-center gap-2">
                                 <span className="text-sm font-medium text-slate-600">Total Estimado:</span>
                                 <span className="text-lg font-bold text-amber-600">R$ 0,00</span>
                             </div>
                        </div>
                     </div>

                     <div className="flex gap-3 pt-4 border-t border-slate-100">
                       <button type="button" onClick={() => setShowNewActivityModal(false)} className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors">
                         Cancelar
                       </button>
                       <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
                         Criar Atividade
                       </button>
                     </div>
                   </form>
                 </div>
               </div>
            )}
           </div>
        )}

        {activeTab === 'admissions' && (
           <div className="space-y-6">
            {/* Sub-tabs */}
            <div className="flex gap-2">
              {(['metrics', 'vacancies', 'candidates', 'alerts'] as AdmissionSubTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setAdmissionSubTab(tab)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    admissionSubTab === tab
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab === 'metrics' ? 'Métricas' : tab === 'vacancies' ? 'Vagas' : tab === 'candidates' ? 'Candidatos' : 'Alertas'}
                </button>
              ))}
            </div>

            {/* Content */}
            {admissionSubTab === 'metrics' && (
              <div className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                   <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                     <div>
                       <p className="text-sm font-medium text-slate-500 mb-1">Vagas Abertas</p>
                       <h3 className="text-2xl font-bold text-slate-900">
                         {vacancies.filter(v => v.status === 'Aberta' || v.status === 'Em Seleção').length}
                       </h3>
                     </div>
                     <div className="p-3 rounded-xl bg-blue-100">
                       <Briefcase className="w-6 h-6 text-blue-600" />
                     </div>
                   </div>
                   <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                     <div>
                       <p className="text-sm font-medium text-slate-500 mb-1">Candidatos Total</p>
                       <h3 className="text-2xl font-bold text-slate-900">
                         {vacancies.reduce((acc, curr) => acc + curr.candidates, 0)}
                       </h3>
                     </div>
                     <div className="p-3 rounded-xl bg-purple-100">
                       <Users className="w-6 h-6 text-purple-600" />
                     </div>
                   </div>
                   <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                     <div>
                       <p className="text-sm font-medium text-slate-500 mb-1">Tempo Médio</p>
                       <h3 className="text-2xl font-bold text-slate-900">18 dias</h3>
                     </div>
                     <div className="p-3 rounded-xl bg-amber-100">
                       <Clock className="w-6 h-6 text-amber-600" />
                     </div>
                   </div>
                   <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                     <div>
                       <p className="text-sm font-medium text-slate-500 mb-1">Custo Médio</p>
                       <h3 className="text-2xl font-bold text-slate-900">R$ 2.840</h3>
                     </div>
                     <div className="p-3 rounded-xl bg-emerald-100">
                       <DollarSign className="w-6 h-6 text-emerald-600" />
                     </div>
                   </div>
                 </div>

                 <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                   <div className="p-6 border-b border-slate-100">
                     <h3 className="font-bold text-slate-800">Vagas Ativas</h3>
                   </div>
                   <div className="overflow-x-auto">
                     <table className="w-full text-left text-sm text-slate-600">
                       <thead className="bg-slate-50 text-slate-900 font-semibold border-b border-slate-100">
                         <tr>
                           <th className="px-6 py-4">Cargo</th>
                           <th className="px-6 py-4">Departamento</th>
                           <th className="px-6 py-4">Vagas</th>
                           <th className="px-6 py-4">Candidatos</th>
                           <th className="px-6 py-4">Fonte</th>
                           <th className="px-6 py-4">Status</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                         {vacancies.filter(v => v.status === 'Aberta' || v.status === 'Em Seleção').map((vacancy) => (
                           <tr key={vacancy.id} className="hover:bg-slate-50 transition-colors">
                             <td className="px-6 py-4 font-medium text-slate-900">{vacancy.role}</td>
                             <td className="px-6 py-4">{vacancy.department}</td>
                             <td className="px-6 py-4">{vacancy.openPositions}</td>
                             <td className="px-6 py-4">{vacancy.candidates}</td>
                             <td className="px-6 py-4">{vacancy.source}</td>
                             <td className="px-6 py-4">
                               <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                 vacancy.status === 'Aberta' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                               }`}>
                                 {vacancy.status}
                               </span>
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 </div>
              </div>
            )}

            {admissionSubTab === 'vacancies' && (
              <div className="space-y-6">
                 <div className="flex justify-end">
                   <button
                     onClick={() => setShowNewVacancyModal(true)}
                     className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
                   >
                     <Plus className="w-4 h-4" /> Nova Vaga
                   </button>
                 </div>
                 <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                   <div className="overflow-x-auto">
                     <table className="w-full text-left text-sm text-slate-600">
                       <thead className="bg-slate-50 text-slate-900 font-semibold border-b border-slate-100">
                         <tr>
                           <th className="px-6 py-4">Cargo</th>
                           <th className="px-6 py-4">Departamento</th>
                           <th className="px-6 py-4">Gestor</th>
                           <th className="px-6 py-4">Vagas</th>
                           <th className="px-6 py-4">Contrato</th>
                           <th className="px-6 py-4">Faixa Salarial</th>
                           <th className="px-6 py-4">Candidatos</th>
                           <th className="px-6 py-4">Fonte</th>
                           <th className="px-6 py-4">Status</th>
                           <th className="px-6 py-4">Ações</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100">
                         {vacancies.map((vacancy) => (
                           <tr key={vacancy.id} className="hover:bg-slate-50 transition-colors">
                             <td className="px-6 py-4 font-medium text-slate-900">{vacancy.role}</td>
                             <td className="px-6 py-4">{vacancy.department}</td>
                             <td className="px-6 py-4">{vacancy.manager}</td>
                             <td className="px-6 py-4">{vacancy.openPositions}</td>
                             <td className="px-6 py-4">{vacancy.contractType}</td>
                             <td className="px-6 py-4">{vacancy.salaryRange}</td>
                             <td className="px-6 py-4">{vacancy.candidates}</td>
                             <td className="px-6 py-4">{vacancy.source}</td>
                             <td className="px-6 py-4">
                               <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                 vacancy.status === 'Aberta' ? 'bg-emerald-100 text-emerald-700' :
                                 vacancy.status === 'Em Seleção' ? 'bg-blue-100 text-blue-700' :
                                 vacancy.status === 'Encerrada' ? 'bg-slate-100 text-slate-600' :
                                 'bg-red-100 text-red-700'
                               }`}>
                                 {vacancy.status}
                               </span>
                             </td>
                             <td className="px-6 py-4">
                               <button className="text-slate-400 hover:text-indigo-600"><MoreHorizontal className="w-5 h-5" /></button>
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 </div>

                 {/* Modal Nova Vaga */}
                 {showNewVacancyModal && (
                   <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
                     <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 my-8">
                       <div className="flex justify-between items-center mb-6">
                         <h3 className="text-lg font-bold text-slate-900">Nova Vaga</h3>
                         <button onClick={() => setShowNewVacancyModal(false)} className="text-slate-400 hover:text-slate-600">
                           <X className="w-5 h-5" />
                         </button>
                       </div>
                       <form onSubmit={(e) => { e.preventDefault(); setShowNewVacancyModal(false); }} className="space-y-4">
                         <div className="grid grid-cols-2 gap-4">
                           <div className="col-span-2">
                             <label className="block text-sm font-medium text-slate-700 mb-1">Cargo</label>
                             <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                           </div>
                           <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1">Departamento</label>
                             <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                           </div>
                           <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1">Gestor</label>
                             <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                               {mockEmployees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                             </select>
                           </div>
                           <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1">Número de Vagas</label>
                             <input type="number" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                           </div>
                           <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Contrato</label>
                             <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                               <option>CLT</option>
                               <option>PJ</option>
                               <option>Estágio</option>
                             </select>
                           </div>
                           <div className="col-span-2">
                             <label className="block text-sm font-medium text-slate-700 mb-1">Faixa Salarial</label>
                             <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ex: R$ 5.000 - R$ 7.000" />
                           </div>
                           <div className="col-span-2">
                             <label className="block text-sm font-medium text-slate-700 mb-1">Requisitos Obrigatórios</label>
                             <textarea className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-20"></textarea>
                           </div>
                           <div className="col-span-2">
                             <label className="block text-sm font-medium text-slate-700 mb-1">Requisitos Desejáveis</label>
                             <textarea className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-20"></textarea>
                           </div>
                           <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1">Prazo para Preenchimento</label>
                             <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                           </div>
                           <div>
                             <label className="block text-sm font-medium text-slate-700 mb-1">Canal de Divulgação</label>
                             <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                               <option>LinkedIn</option>
                               <option>ZIAvagas</option>
                               <option>Site</option>
                               <option>Indicação</option>
                               <option>Outros</option>
                             </select>
                           </div>
                         </div>
                         <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 flex items-start gap-2">
                           <BrainCircuit className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                           <p className="text-xs text-amber-700">ZIA analisará os candidatos automaticamente com base nos requisitos cadastrados.</p>
                         </div>
                         <div className="flex gap-3 pt-4">
                           <button type="button" onClick={() => setShowNewVacancyModal(false)} className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors">
                             Cancelar
                           </button>
                           <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
                             Publicar Vaga
                           </button>
                         </div>
                       </form>
                     </div>
                   </div>
                 )}
              </div>
            )}

            {admissionSubTab === 'candidates' && (
              <div className="space-y-6">
                 <div className="flex justify-between items-center">
                   <div className="flex items-center gap-4">
                     <span className="text-sm font-medium text-slate-600">Filtrar por vaga:</span>
                     <select
                       value={selectedVacancy}
                       onChange={(e) => setSelectedVacancy(e.target.value)}
                       className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                     >
                       {mockVacancies.map(v => <option key={v.id} value={v.id}>{v.role}</option>)}
                     </select>
                   </div>
                   <div className="flex bg-slate-100 p-1 rounded-lg">
                     <button
                        onClick={() => setCandidateViewMode('table')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${candidateViewMode === 'table' ? 'bg-white shadow-sm text-slate-700' : 'text-slate-500 hover:text-slate-700'}`}
                     >
                        Tabela
                     </button>
                     <button
                        onClick={() => setCandidateViewMode('kanban')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${candidateViewMode === 'kanban' ? 'bg-white shadow-sm text-slate-700' : 'text-slate-500 hover:text-slate-700'}`}
                     >
                        Kanban
                     </button>
                   </div>
                 </div>

                 {candidateViewMode === 'table' ? (
                     <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                       <div className="overflow-x-auto">
                         <table className="w-full text-left text-sm text-slate-600">
                           <thead className="bg-slate-50 text-slate-900 font-semibold border-b border-slate-100">
                             <tr>
                               <th className="px-6 py-4">Nome</th>
                               <th className="px-6 py-4">E-mail</th>
                               <th className="px-6 py-4">Etapa</th>
                               <th className="px-6 py-4">Score ZIA</th>
                               <th className="px-6 py-4">Data</th>
                               <th className="px-6 py-4">Análise ZIA</th>
                             </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                             {mockCandidates.filter(c => c.vacancyId === selectedVacancy).map((candidate) => (
                               <tr key={candidate.id} className="hover:bg-slate-50 transition-colors">
                                 <td className="px-6 py-4 font-medium text-slate-900">{candidate.name}</td>
                                 <td className="px-6 py-4">{candidate.email}</td>
                                 <td className="px-6 py-4">
                                   <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-bold">{candidate.stage}</span>
                                 </td>
                                 <td className="px-6 py-4">
                                   <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                     candidate.score >= 90 ? 'bg-emerald-100 text-emerald-700' :
                                     candidate.score >= 70 ? 'bg-blue-100 text-blue-700' :
                                     candidate.score >= 50 ? 'bg-amber-100 text-amber-700' :
                                     'bg-red-100 text-red-700'
                                   }`}>
                                     {candidate.score}
                                   </span>
                                 </td>
                                 <td className="px-6 py-4">{new Date(candidate.appliedAt).toLocaleDateString()}</td>
                                 <td className="px-6 py-4 max-w-xs truncate flex items-center gap-2">
                                   <BrainCircuit className="w-4 h-4 text-indigo-500 shrink-0" />
                                   <span title={candidate.ziaAnalysis}>{candidate.ziaAnalysis}</span>
                                 </td>
                               </tr>
                             ))}
                           </tbody>
                         </table>
                       </div>
                     </div>
                 ) : (
                     <div className="flex gap-4 overflow-x-auto pb-4 items-start h-[calc(100vh-300px)]">
                        {['Triagem', 'Entrevista RH', 'Entrevista Técnica', 'Proposta', 'Contratado', 'Reprovado'].map((stage) => {
                            const candidatesInStage = mockCandidates.filter(c => c.vacancyId === selectedVacancy && c.stage === stage);
                            return (
                                <div key={stage} className="min-w-[280px] w-[280px] flex flex-col bg-slate-50 rounded-xl border border-slate-200 h-full">
                                    <div className="p-3 border-b border-slate-200 flex justify-between items-center bg-white rounded-t-xl">
                                        <h4 className="font-bold text-slate-700 text-sm">{stage}</h4>
                                        <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">{candidatesInStage.length}</span>
                                    </div>
                                    <div className="p-2 space-y-2 overflow-y-auto flex-1 custom-scrollbar">
                                        {candidatesInStage.map(candidate => (
                                            <div key={candidate.id} className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h5 className="font-bold text-slate-800 text-sm">{candidate.name}</h5>
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                                         candidate.score >= 90 ? 'bg-emerald-100 text-emerald-700' :
                                                         candidate.score >= 70 ? 'bg-blue-100 text-blue-700' :
                                                         candidate.score >= 50 ? 'bg-amber-100 text-amber-700' :
                                                         'bg-red-100 text-red-700'
                                                    }`}>
                                                        {candidate.score}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500 mb-2">{new Date(candidate.appliedAt).toLocaleDateString()}</p>

                                                <div className="bg-slate-50 p-2 rounded border border-slate-100 mb-2">
                                                    <div className="flex items-center gap-1 mb-1">
                                                        <BrainCircuit className="w-3 h-3 text-indigo-500" />
                                                        <span className="text-[10px] font-bold text-indigo-700">Análise ZIA</span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-600 line-clamp-2 leading-snug">
                                                        {candidate.ziaAnalysis}
                                                    </p>
                                                </div>

                                                <button className="w-full py-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors border border-dashed border-slate-200 hover:border-indigo-200 group-hover:border-indigo-300">
                                                    Mover →
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                     </div>
                 )}
              </div>
            )}

            {admissionSubTab === 'alerts' && (
              <div className="space-y-6">
                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                   <p className="text-sm text-slate-600">Configure alertas automáticos para eventos de admissão e rescisão.</p>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-3">
                     <div className="flex justify-between items-start">
                       <h3 className="font-bold text-slate-900">Vaga sem preenchimento</h3>
                       <div className="p-1.5 bg-red-100 rounded-lg"><AlertTriangle className="w-4 h-4 text-red-600" /></div>
                     </div>
                     <p className="text-sm text-slate-500">Alerta se vaga aberta há mais de 30 dias sem contratação.</p>
                     <div className="pt-2 text-xs text-slate-400 border-t border-slate-50">
                       Destinatários: Gestor, RH • Canal: E-mail
                     </div>
                   </div>

                   <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-3">
                     <div className="flex justify-between items-start">
                       <h3 className="font-bold text-slate-900">Avanço de Etapa</h3>
                       <div className="p-1.5 bg-blue-100 rounded-lg"><TrendingDown className="w-4 h-4 text-blue-600" /></div>
                     </div>
                     <p className="text-sm text-slate-500">Alerta quando candidato avança para etapa de Proposta.</p>
                     <div className="pt-2 text-xs text-slate-400 border-t border-slate-50">
                       Destinatários: Gestor • Canal: Notificação
                     </div>
                   </div>

                   <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-3">
                     <div className="flex justify-between items-start">
                       <h3 className="font-bold text-slate-900">Fim da Experiência</h3>
                       <div className="p-1.5 bg-amber-100 rounded-lg"><Clock className="w-4 h-4 text-amber-600" /></div>
                     </div>
                     <p className="text-sm text-slate-500">Alerta 7 dias antes do fim do período de experiência.</p>
                     <div className="pt-2 text-xs text-slate-400 border-t border-slate-50">
                       Destinatários: RH, Jurídico • Canal: E-mail, WhatsApp
                     </div>
                   </div>
                 </div>

                 <div className="flex justify-end">
                   <button
                     onClick={() => setShowConfigAlertModal(true)}
                     className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors flex items-center gap-2"
                   >
                     <Plus className="w-4 h-4" /> Configurar Alerta
                   </button>
                 </div>

                 {/* Modal Configurar Alerta */}
                 {showConfigAlertModal && (
                   <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
                     <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 my-8">
                       <div className="flex justify-between items-center mb-6">
                         <h3 className="text-lg font-bold text-slate-900">Configurar Alerta</h3>
                         <button onClick={() => setShowConfigAlertModal(false)} className="text-slate-400 hover:text-slate-600">
                           <X className="w-5 h-5" />
                         </button>
                       </div>
                       <form onSubmit={(e) => { e.preventDefault(); setShowConfigAlertModal(false); }} className="space-y-4">
                         <div>
                           <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Evento</label>
                           <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                             <option>Vaga sem preenchimento</option>
                             <option>Candidato avançou de etapa</option>
                             <option>Prazo de experiência</option>
                             <option>Acúmulo de advertências</option>
                             <option>Indicadores de risco ZIA</option>
                           </select>
                         </div>

                         <div>
                           <label className="block text-sm font-medium text-slate-700 mb-1">Condição</label>
                           <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ex: > 30 dias" />
                         </div>

                         <div>
                           <label className="block text-sm font-medium text-slate-700 mb-2">Destinatários</label>
                           <div className="grid grid-cols-2 gap-2">
                             {['Gestor', 'RH', 'Financeiro', 'Jurídico'].map(role => (
                               <label key={role} className="flex items-center gap-2">
                                 <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500" />
                                 <span className="text-sm text-slate-600">{role}</span>
                               </label>
                             ))}
                           </div>
                         </div>

                         <div>
                           <label className="block text-sm font-medium text-slate-700 mb-2">Canal</label>
                           <div className="flex gap-4">
                             {['Notificação', 'E-mail', 'WhatsApp'].map(channel => (
                               <label key={channel} className="flex items-center gap-2">
                                 <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500" />
                                 <span className="text-sm text-slate-600">{channel}</span>
                               </label>
                             ))}
                           </div>
                         </div>

                         <div>
                           <label className="block text-sm font-medium text-slate-700 mb-1">Ação Automática</label>
                           <select className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                             <option>Apenas notificar</option>
                             <option>Criar atividade</option>
                             <option>Abrir vaga</option>
                             <option>Notificar jurídico</option>
                           </select>
                         </div>

                         <div className="flex gap-3 pt-4 border-t border-slate-100">
                           <button type="button" onClick={() => setShowConfigAlertModal(false)} className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors">
                             Cancelar
                           </button>
                           <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
                             Salvar Alerta
                           </button>
                         </div>
                       </form>
                     </div>
                   </div>
                 )}
              </div>
            )}
           </div>
        )}
      </div>
    </div>
  );
}
