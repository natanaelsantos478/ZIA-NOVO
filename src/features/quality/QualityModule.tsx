import React, { useState } from 'react';
import {
  LayoutDashboard,
  AlertTriangle,
  FileCheck,
  Target,
  Truck,
  Users,
  Activity,
  Scale,
  GraduationCap,
  MessageSquare,
  Plus,
  Filter,
  Search,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock
} from 'lucide-react';

// --- Types ---

type Severity = 'Crítica' | 'Maior' | 'Menor' | 'Observação';
type Status = 'Aberto' | 'Em Andamento' | 'Concluído' | 'Cancelado';
type AuditType = 'Interna' | 'Externa' | 'Fornecedor';

interface NonConformity {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  status: Status;
  origin: string;
  responsible: string;
  dueDate: string;
  openedAt: string;
  closedAt?: string;
  rootCause?: string;
  correctiveAction?: string;
}

interface Audit {
  id: string;
  title: string;
  type: AuditType;
  status: Status;
  auditor: string;
  auditee: string;
  scheduledDate: string;
  completedDate?: string;
  findings: number;
  nonConformities: number;
  score?: number;
}

interface KPI {
  id: string;
  name: string;
  unit: string;
  target: number;
  current: number;
  trend: 'up' | 'down' | 'stable';
  period: string;
  category: string;
}

interface QualityRisk {
  id: string;
  title: string;
  category: string;
  probability: 1 | 2 | 3 | 4 | 5;
  impact: 1 | 2 | 3 | 4 | 5;
  riskScore: number;
  status: Status;
  mitigation: string;
  owner: string;
}

interface CalibrationItem {
  id: string;
  equipment: string;
  tag: string;
  lastCalibration: string;
  nextCalibration: string;
  responsible: string;
  status: 'Em dia' | 'Vencido' | 'A vencer';
  certificate?: string;
}

interface Meeting {
  id: string;
  title: string;
  type: string;
  date: string;
  participants: string[];
  status: Status;
  actionItems: number;
}

interface Supplier {
  id: string;
  name: string;
  cnpj: string;
  category: string;
  score: number;
  lastAudit?: string;
  status: 'Aprovado' | 'Condicional' | 'Reprovado' | 'Em Avaliação';
}

interface Competency {
  id: string;
  employee: string;
  role: string;
  skill: string;
  required: number;
  current: number;
  gap: number;
  trainingPlan?: string;
}

interface SACTicket {
  id: string;
  customer: string;
  subject: string;
  description: string;
  severity: Severity;
  status: Status;
  openedAt: string;
  resolvedAt?: string;
  resolution?: string;
  satisfactionScore?: number;
}

// --- Mock Data ---

const mockNCs: NonConformity[] = [
  {
    id: 'NC-2024-001',
    title: 'Falha no processo de soldagem',
    description: 'Cordão de solda fora da especificação técnica',
    severity: 'Crítica',
    status: 'Aberto',
    origin: 'Inspeção Final',
    responsible: 'Carlos Silva',
    dueDate: '2024-03-25',
    openedAt: '2024-03-20'
  },
  {
    id: 'NC-2024-002',
    title: 'Documentação desatualizada',
    description: 'POP-005 versão obsoleta na linha de produção',
    severity: 'Maior',
    status: 'Em Andamento',
    origin: 'Auditoria Interna',
    responsible: 'Ana Costa',
    dueDate: '2024-03-30',
    openedAt: '2024-03-15'
  },
  {
    id: 'NC-2024-003',
    title: 'Atraso na calibração',
    description: 'Paquímetro digital P-012 vencido há 2 dias',
    severity: 'Menor',
    status: 'Concluído',
    origin: 'Gestão de Ativos',
    responsible: 'Marcos Oliveira',
    dueDate: '2024-03-18',
    openedAt: '2024-03-10',
    closedAt: '2024-03-12'
  }
];

const mockAudits: Audit[] = [
  {
    id: 'AUD-2024-01',
    title: 'Auditoria ISO 9001',
    type: 'Interna',
    status: 'Concluído',
    auditor: 'Consultoria Quality',
    auditee: 'Produção',
    scheduledDate: '2024-02-15',
    findings: 5,
    nonConformities: 2,
    score: 85
  },
  {
    id: 'AUD-2024-02',
    title: 'Auditoria de Fornecedor - Metalúrgica XYZ',
    type: 'Fornecedor',
    status: 'Em Andamento',
    auditor: 'Equipe Interna',
    auditee: 'Metalúrgica XYZ',
    scheduledDate: '2024-03-22',
    findings: 0,
    nonConformities: 0
  }
];

const mockKPIs: KPI[] = [
  {
    id: 'KPI-01',
    name: 'Índice de Refugo',
    unit: '%',
    target: 2.5,
    current: 1.8,
    trend: 'down',
    period: 'Mar/2024',
    category: 'Produção'
  },
  {
    id: 'KPI-02',
    name: 'Satisfação do Cliente (NPS)',
    unit: 'pts',
    target: 75,
    current: 82,
    trend: 'up',
    period: 'Mar/2024',
    category: 'Atendimento'
  },
  {
    id: 'KPI-03',
    name: 'Eficácia de Treinamento',
    unit: '%',
    target: 90,
    current: 85,
    trend: 'stable',
    period: 'Mar/2024',
    category: 'RH'
  }
];

const mockSuppliers: Supplier[] = [
  {
    id: 'SUP-001',
    name: 'Metalúrgica Aço Forte',
    cnpj: '12.345.678/0001-90',
    category: 'Matéria Prima',
    score: 95,
    status: 'Aprovado',
    lastAudit: '2023-11-15'
  },
  {
    id: 'SUP-002',
    name: 'Transportadora Rápida',
    cnpj: '98.765.432/0001-10',
    category: 'Logística',
    score: 70,
    status: 'Condicional',
    lastAudit: '2024-01-20'
  }
];

// --- Components ---

const QualityModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showNewNCModal, setShowNewNCModal] = useState(false);

  const renderDashboard = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-slate-500">NCs Abertas</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-1">
                {mockNCs.filter(nc => nc.status === 'Aberto').length}
              </h3>
            </div>
            <div className={`p-2 rounded-lg ${mockNCs.filter(nc => nc.status === 'Aberto').length > 5 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center text-sm text-slate-600">
            <span className="text-red-600 font-medium mr-1">+2</span>
            essa semana
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-slate-500">Auditorias Mês</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-1">3</h3>
            </div>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <FileCheck className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center text-sm text-slate-600">
            <span className="text-emerald-600 font-medium mr-1">100%</span>
            planejado
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-slate-500">KPIs na Meta</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-1">
                {Math.round((mockKPIs.filter(k =>
                  (k.trend === 'down' && k.current <= k.target) ||
                  (k.trend !== 'down' && k.current >= k.target)
                ).length / mockKPIs.length) * 100)}%
              </h3>
            </div>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Target className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center text-sm text-slate-600">
            <span className="text-emerald-600 font-medium mr-1">+5%</span>
            vs mês anterior
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-slate-500">Tickets SAC</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-1">12</h3>
            </div>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <MessageSquare className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center text-sm text-slate-600">
            <span className="text-amber-600 font-medium mr-1">4</span>
            aguardando resposta
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">NCs por Severidade</h3>
          <div className="space-y-4">
            {['Crítica', 'Maior', 'Menor', 'Observação'].map((sev) => {
              const count = mockNCs.filter(nc => nc.severity === sev).length;
              const max = Math.max(...['Crítica', 'Maior', 'Menor', 'Observação'].map(s => mockNCs.filter(n => n.severity === s).length));
              const width = max > 0 ? (count / max) * 100 : 0;

              let color = 'bg-slate-200';
              if (sev === 'Crítica') color = 'bg-red-500';
              if (sev === 'Maior') color = 'bg-orange-500';
              if (sev === 'Menor') color = 'bg-yellow-400';

              return (
                <div key={sev} className="flex items-center gap-4">
                  <span className="text-sm font-medium text-slate-600 w-24">{sev}</span>
                  <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${color} rounded-full transition-all duration-500`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-slate-900 w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Últimas NCs Abertas</h3>
          <div className="space-y-4">
            {mockNCs.slice(0, 5).map(nc => (
              <div key={nc.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    nc.severity === 'Crítica' ? 'bg-red-500' :
                    nc.severity === 'Maior' ? 'bg-orange-500' :
                    'bg-yellow-400'
                  }`} />
                  <div>
                    <p className="font-medium text-slate-900 text-sm">{nc.title}</p>
                    <p className="text-xs text-slate-500">{nc.id} • {nc.responsible}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    nc.status === 'Aberto' ? 'bg-red-100 text-red-700' :
                    nc.status === 'Em Andamento' ? 'bg-blue-100 text-blue-700' :
                    'bg-emerald-100 text-emerald-700'
                  }`}>
                    {nc.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderNCs = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar NC..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">
            <Filter className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={() => setShowNewNCModal(true)}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          Nova NC
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Título</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Severidade</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Origem</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Responsável</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Prazo</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {mockNCs.map((nc) => (
              <tr key={nc.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{nc.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{nc.title}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                    nc.severity === 'Crítica' ? 'bg-red-50 text-red-700 border-red-200' :
                    nc.severity === 'Maior' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                    nc.severity === 'Menor' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                    'bg-slate-50 text-slate-600 border-slate-200'
                  }`}>
                    {nc.severity}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{nc.origin}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{nc.responsible}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(nc.dueDate).toLocaleDateString('pt-BR')}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`flex items-center gap-1.5 text-sm ${
                    nc.status === 'Aberto' ? 'text-red-600 font-medium' :
                    nc.status === 'Em Andamento' ? 'text-blue-600 font-medium' :
                    'text-emerald-600 font-medium'
                  }`}>
                    {nc.status === 'Aberto' && <AlertCircle className="w-4 h-4" />}
                    {nc.status === 'Em Andamento' && <Clock className="w-4 h-4" />}
                    {nc.status === 'Concluído' && <CheckCircle2 className="w-4 h-4" />}
                    {nc.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button className="text-slate-400 hover:text-slate-600">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderAudits = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-slate-900">Auditorias Recentes</h2>
        <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm font-medium text-sm">
          <Plus className="w-4 h-4" />
          Nova Auditoria
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockAudits.map(audit => (
          <div key={audit.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                audit.type === 'Interna' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                'bg-purple-50 text-purple-700 border-purple-200'
              }`}>
                {audit.type}
              </span>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                audit.status === 'Concluído' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {audit.status}
              </span>
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-2">{audit.title}</h3>
            <p className="text-sm text-slate-500 mb-4">{audit.auditee} • {new Date(audit.scheduledDate).toLocaleDateString('pt-BR')}</p>

            <div className="flex justify-between items-center py-3 border-t border-slate-100 mb-4">
              <div className="text-center">
                <span className="block text-xl font-bold text-slate-900">{audit.findings}</span>
                <span className="text-xs text-slate-500 uppercase">Achados</span>
              </div>
              <div className="h-8 w-px bg-slate-200"></div>
              <div className="text-center">
                <span className="block text-xl font-bold text-slate-900">{audit.nonConformities}</span>
                <span className="text-xs text-slate-500 uppercase">NCs</span>
              </div>
              <div className="h-8 w-px bg-slate-200"></div>
              <div className="text-center">
                <span className="block text-xl font-bold text-emerald-600">{audit.score || '-'}%</span>
                <span className="text-xs text-slate-500 uppercase">Score</span>
              </div>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${audit.score || 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderKPIs = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-slate-900">Indicadores de Desempenho</h2>
        <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm font-medium text-sm">
          <Plus className="w-4 h-4" />
          Novo Indicador
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockKPIs.map(kpi => {
          const isGood = kpi.trend === 'down' ? kpi.current <= kpi.target : kpi.current >= kpi.target;
          const percentage = Math.min((kpi.current / kpi.target) * 100, 100);

          return (
            <div key={kpi.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">{kpi.category}</span>
                <span className="text-xs text-slate-500">{kpi.period}</span>
              </div>

              <h3 className="text-lg font-bold text-slate-900 mb-1">{kpi.name}</h3>

              <div className="flex items-end gap-2 mb-4">
                <span className="text-3xl font-bold text-slate-900">{kpi.current}{kpi.unit}</span>
                <span className="text-sm text-slate-500 mb-1">meta {kpi.target}{kpi.unit}</span>
              </div>

              <div className="w-full bg-slate-100 rounded-full h-2 mb-2">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${isGood ? 'bg-emerald-500' : 'bg-red-500'}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>

              <div className="flex items-center text-sm">
                <span className={`flex items-center font-medium ${isGood ? 'text-emerald-600' : 'text-red-600'}`}>
                  {isGood ? 'Dentro da meta' : 'Fora da meta'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      {/* Header */}
      <header className="flex-none bg-white border-b border-slate-200 px-8 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Gestão da Qualidade</h1>
              <p className="text-sm text-slate-500">Sistema de Gestão da Qualidade (SGQ)</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">Última auditoria: 15/02/2024</span>
            <div className="h-4 w-px bg-slate-200"></div>
            <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-xs font-semibold uppercase tracking-wider">
              ISO 9001:2015
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'ncs', label: 'Não Conformidades', icon: AlertTriangle },
            { id: 'audits', label: 'Auditorias', icon: FileCheck },
            { id: 'kpis', label: 'Indicadores', icon: Target },
            { id: 'suppliers', label: 'Fornecedores', icon: Truck },
            { id: 'meetings', label: 'Reuniões', icon: Users },
            { id: 'risks', label: 'Riscos', icon: Activity },
            { id: 'calibration', label: 'Calibração', icon: Scale },
            { id: 'competencies', label: 'Competências', icon: GraduationCap },
            { id: 'sac', label: 'SAC', icon: MessageSquare },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                ${activeTab === tab.id
                  ? 'bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-200'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }
              `}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-emerald-600' : 'text-slate-400'}`} />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'ncs' && renderNCs()}
          {activeTab === 'audits' && renderAudits()}
          {activeTab === 'kpis' && renderKPIs()}
          {/* Placeholder for other tabs */}
          {['suppliers', 'meetings', 'risks', 'calibration', 'competencies', 'sac'].includes(activeTab) && (
            <div className="flex flex-col items-center justify-center h-96 text-slate-400 animate-in fade-in duration-500">
              <div className="p-4 bg-slate-100 rounded-full mb-4">
                <Activity className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-medium text-slate-900">Módulo em Desenvolvimento</h3>
              <p className="text-sm">Esta funcionalidade estará disponível na próxima atualização.</p>
            </div>
          )}
        </div>
      </main>

      {/* New NC Modal */}
      {showNewNCModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Nova Não Conformidade</h3>
              <button
                onClick={() => setShowNewNCModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Título da NC</label>
                <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" placeholder="Ex: Falha no processo X" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Origem</label>
                  <select className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all">
                    <option>Auditoria Interna</option>
                    <option>Auditoria Externa</option>
                    <option>Reclamação de Cliente</option>
                    <option>Inspeção de Entrada</option>
                    <option>Processo Produtivo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Severidade</label>
                  <select className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all">
                    <option>Crítica</option>
                    <option>Maior</option>
                    <option>Menor</option>
                    <option>Observação</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descrição Detalhada</label>
                <textarea rows={4} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all resize-none" placeholder="Descreva o problema encontrado..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Responsável</label>
                  <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Prazo</label>
                  <input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all" />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setShowNewNCModal(false)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button className="px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 shadow-sm shadow-emerald-200 transition-all transform active:scale-95">
                Registrar NC
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QualityModule;
