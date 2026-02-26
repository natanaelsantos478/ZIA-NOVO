import { useState } from 'react';
import {
  ShieldCheck, AlertTriangle, FileCheck, CheckCircle,
  MoreHorizontal, Plus, Search, Filter, BarChart3
} from 'lucide-react';

// --- Types ---
type Severity = 'Crítica' | 'Maior' | 'Menor' | 'Observação';
type Status = 'Aberto' | 'Em Andamento' | 'Concluído' | 'Cancelado';

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
  rootCause?: string;
  correctiveAction?: string;
}

interface Audit {
  id: string;
  title: string;
  type: 'Interna' | 'Externa' | 'Fornecedor';
  status: Status;
  auditor: string;
  auditee: string;
  scheduledDate: string;
  findings: number;
  nonConformities: number;
  score?: number;
}

interface Supplier {
  id: string;
  name: string;
  cnpj: string;
  category: string;
  score: number;
  status: 'Aprovado' | 'Condicional' | 'Reprovado' | 'Em Avaliação';
  lastAudit?: string;
}

interface QualityKPI {
  id: string;
  name: string;
  unit: string;
  target: number;
  current: number;
  trend: 'up' | 'down' | 'stable';
  period: string;
}

// --- Mock Data ---
const MOCK_NCS: NonConformity[] = [
  {
    id: 'NC-2024-001',
    title: 'Falha no processo de soldagem',
    description: 'Cordão de solda apresentou porosidade acima do permitido.',
    severity: 'Crítica',
    status: 'Em Andamento',
    origin: 'Produção',
    responsible: 'João Silva',
    dueDate: '2024-03-20',
    openedAt: '2024-03-10'
  },
  {
    id: 'NC-2024-002',
    title: 'Documentação desatualizada',
    description: 'Manual de operação da máquina X não corresponde à versão atual.',
    severity: 'Menor',
    status: 'Aberto',
    origin: 'Auditoria Interna',
    responsible: 'Maria Souza',
    dueDate: '2024-03-25',
    openedAt: '2024-03-12'
  },
  {
    id: 'NC-2024-003',
    title: 'Matéria-prima fora da especificação',
    description: 'Lote 452 de aço carbono com dureza inferior.',
    severity: 'Maior',
    status: 'Concluído',
    origin: 'Recebimento',
    responsible: 'Carlos Pereira',
    dueDate: '2024-03-05',
    openedAt: '2024-02-28'
  }
];

const MOCK_AUDITS: Audit[] = [
  {
    id: 'AUD-2024-01',
    title: 'Auditoria ISO 9001:2015',
    type: 'Externa',
    status: 'Aberto',
    auditor: 'Certificadora XYZ',
    auditee: 'Qualidade',
    scheduledDate: '2024-04-15',
    findings: 0,
    nonConformities: 0
  },
  {
    id: 'AUD-2024-02',
    title: 'Auditoria Interna de Processos',
    type: 'Interna',
    status: 'Concluído',
    auditor: 'Ana Oliveira',
    auditee: 'Produção',
    scheduledDate: '2024-02-10',
    findings: 5,
    nonConformities: 2,
    score: 92
  }
] as Audit[];

const MOCK_SUPPLIERS: Supplier[] = [
  { id: 'FOR-001', name: 'Aços Brasil Ltda', cnpj: '12.345.678/0001-90', category: 'Matéria Prima', score: 95, status: 'Aprovado', lastAudit: '2023-11-20' },
  { id: 'FOR-002', name: 'Transportadora Rápida', cnpj: '98.765.432/0001-10', category: 'Logística', score: 78, status: 'Condicional', lastAudit: '2024-01-15' },
  { id: 'FOR-003', name: 'Tech Solutions', cnpj: '45.678.901/0001-23', category: 'TI', score: 98, status: 'Aprovado', lastAudit: '2023-10-05' },
];

const MOCK_KPIS: QualityKPI[] = [
  { id: 'KPI-001', name: 'Índice de NCs', unit: '%', target: 2.0, current: 1.8, trend: 'down', period: 'Mar 2024' },
  { id: 'KPI-002', name: 'Satisfação Clientes', unit: 'NPS', target: 75, current: 72, trend: 'up', period: 'Mar 2024' },
  { id: 'KPI-003', name: 'Eficácia de Treinamento', unit: '%', target: 90, current: 94, trend: 'up', period: 'Fev 2024' },
  { id: 'KPI-004', name: 'Entregas no Prazo', unit: '%', target: 98, current: 97.5, trend: 'stable', period: 'Mar 2024' },
  { id: 'KPI-005', name: 'Custo da Não Qualidade', unit: 'R$', target: 50000, current: 42000, trend: 'down', period: 'Mar 2024' },
  { id: 'KPI-006', name: 'Auditorias Realizadas', unit: 'qtd', target: 4, current: 4, trend: 'stable', period: 'Mar 2024' },
];

const MOCK_MEETINGS = [
  { date: '2024-03-15', agenda: 'Análise Crítica', participants: 'Diretoria, Qualidade', actions: '3 pendentes' },
  { date: '2024-02-20', agenda: 'Revisão de Processos', participants: 'Produção, Qualidade', actions: 'Concluído' },
];

const MOCK_RISKS = [
  { risk: 'Falha no fornecimento', prob: 'Média', impact: 'Alto', mitigation: 'Homologar 2º fornecedor' },
  { risk: 'Perda de dados', prob: 'Baixa', impact: 'Crítico', mitigation: 'Backup diário e offsite' },
];

const MOCK_CALIBRATION = [
  { equip: 'Paquímetro #04', tag: 'EQ-004', last: '2023-03-20', next: '2024-03-20', status: 'Vencendo' },
  { equip: 'Balança #02', tag: 'EQ-002', last: '2023-09-25', next: '2024-09-25', status: 'OK' },
];

const MOCK_COMPETENCIES = [
  { colab: 'João Silva', role: 'Soldador', trainings: 'Solda TIG, NR-12', eval: '95%' },
  { colab: 'Maria Souza', role: 'Inspetora', trainings: 'Metrologia, ISO 9001', eval: '98%' },
];

const MOCK_SAC = [
  { ticket: '#1234', client: 'Empresa X', subject: 'Produto danificado', status: 'Aberto', priority: 'Alta' },
  { ticket: '#1230', client: 'Cliente Y', subject: 'Atraso na entrega', status: 'Fechado', priority: 'Média' },
];

const TABS = [
  'Dashboard', 'Não Conformidades', 'Auditorias', 'Indicadores',
  'Fornecedores', 'Reuniões', 'Riscos', 'Calibração', 'Competências', 'SAC'
];

export default function QualityModule() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [searchTerm, setSearchTerm] = useState('');

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'NCs Abertas', value: '7', color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Índice de Qualidade', value: '94%', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Auditorias (Ano)', value: '12', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Ações Corretivas', value: '85%', color: 'text-amber-600', bg: 'bg-amber-50' }
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{kpi.label}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-3xl font-bold text-slate-800">{kpi.value}</span>
              <div className={`p-2 rounded-lg ${kpi.bg}`}>
                <ShieldCheck className={`w-6 h-6 ${kpi.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Últimas NCs */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Últimas Não Conformidades
          </h3>
          <div className="space-y-3">
            {MOCK_NCS.slice(0, 3).map(nc => (
              <div key={nc.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 border border-slate-100">
                <div className={`mt-1 w-2 h-2 rounded-full ${nc.severity === 'Crítica' ? 'bg-red-500' : 'bg-amber-500'}`} />
                <div>
                  <p className="text-sm font-semibold text-slate-800">{nc.title}</p>
                  <p className="text-xs text-slate-500">{nc.id} • {nc.status}</p>
                </div>
                <span className="ml-auto text-xs font-medium text-slate-400">{nc.openedAt}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Próximas Calibrações (Mock simples) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            Próximas Calibrações
          </h3>
          <div className="space-y-3">
            {[
              { equip: 'Paquímetro Digital #04', date: '20/03/2024' },
              { equip: 'Micrômetro Externo #12', date: '22/03/2024' },
              { equip: 'Balança de Precisão #02', date: '25/03/2024' }
            ].map((cal, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 border border-slate-100">
                <span className="text-sm font-medium text-slate-700">{cal.equip}</span>
                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">{cal.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderNCs = () => (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar NCs..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100">
            <Filter className="w-4 h-4" /> Filtros
          </button>
          <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">
            <Plus className="w-4 h-4" /> Nova NC
          </button>
        </div>
      </div>
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 text-slate-500 font-medium">
          <tr>
            <th className="px-4 py-3">ID</th>
            <th className="px-4 py-3">Título</th>
            <th className="px-4 py-3">Severidade</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Responsável</th>
            <th className="px-4 py-3">Prazo</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {MOCK_NCS.map(nc => (
            <tr key={nc.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-mono text-slate-500">{nc.id}</td>
              <td className="px-4 py-3 font-medium text-slate-800">{nc.title}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded-full text-xs font-bold
                  ${nc.severity === 'Crítica' ? 'bg-red-100 text-red-700' :
                    nc.severity === 'Maior' ? 'bg-orange-100 text-orange-700' :
                    'bg-blue-100 text-blue-700'}`}>
                  {nc.severity}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded-full text-xs font-bold
                  ${nc.status === 'Concluído' ? 'bg-emerald-100 text-emerald-700' :
                    nc.status === 'Em Andamento' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-700'}`}>
                  {nc.status}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-600">{nc.responsible}</td>
              <td className="px-4 py-3 text-slate-600">{nc.dueDate}</td>
              <td className="px-4 py-3 text-right">
                <button className="text-slate-400 hover:text-slate-600">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderAudits = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
       {MOCK_AUDITS.map(audit => (
         <div key={audit.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:shadow-md transition-shadow">
           <div className="flex justify-between items-start mb-4">
             <div className="flex items-center gap-3">
               <div className="p-2 bg-indigo-50 rounded-lg">
                 <FileCheck className="w-5 h-5 text-indigo-600" />
               </div>
               <div>
                 <h4 className="font-bold text-slate-800 text-sm">{audit.title}</h4>
                 <p className="text-xs text-slate-500 font-mono">{audit.id}</p>
               </div>
             </div>
             <span className={`px-2 py-1 rounded text-xs font-bold ${
               audit.status === 'Concluído' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
             }`}>
               {audit.status}
             </span>
           </div>

           <div className="space-y-2 mb-4">
             <div className="flex justify-between text-xs">
               <span className="text-slate-500">Tipo:</span>
               <span className="font-medium text-slate-700">{audit.type}</span>
             </div>
             <div className="flex justify-between text-xs">
               <span className="text-slate-500">Data:</span>
               <span className="font-medium text-slate-700">{audit.scheduledDate}</span>
             </div>
             <div className="flex justify-between text-xs">
               <span className="text-slate-500">Auditor:</span>
               <span className="font-medium text-slate-700">{audit.auditor}</span>
             </div>
           </div>

           {audit.score !== undefined && (
             <div className="mt-4 pt-4 border-t border-slate-100">
               <div className="flex justify-between items-end mb-1">
                 <span className="text-xs font-bold text-slate-500">Score</span>
                 <span className="text-lg font-bold text-indigo-600">{audit.score}%</span>
               </div>
               <div className="w-full bg-slate-100 rounded-full h-2">
                 <div
                   className="bg-indigo-600 h-2 rounded-full"
                   style={{ width: `${audit.score}%` }}
                 />
               </div>
             </div>
           )}

           <button className="w-full mt-4 py-2 text-sm font-medium text-slate-600 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
             Ver Detalhes
           </button>
         </div>
       ))}

       {/* Card Adicionar Nova */}
       <button className="border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all group h-full min-h-[200px]">
         <Plus className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
         <span className="text-sm font-bold">Agendar Auditoria</span>
       </button>
    </div>
  );

  const renderSuppliers = () => (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex justify-between items-center">
        <h3 className="font-bold text-slate-800">Base de Fornecedores Qualificados</h3>
        <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">
            <Plus className="w-4 h-4" /> Novo Fornecedor
        </button>
      </div>
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 text-slate-500 font-medium">
          <tr>
            <th className="px-4 py-3">Fornecedor</th>
            <th className="px-4 py-3">Categoria</th>
            <th className="px-4 py-3">Score (IQF)</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Última Auditoria</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {MOCK_SUPPLIERS.map(sup => (
            <tr key={sup.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <div className="font-medium text-slate-800">{sup.name}</div>
                <div className="text-xs text-slate-400">{sup.cnpj}</div>
              </td>
              <td className="px-4 py-3 text-slate-600">{sup.category}</td>
              <td className="px-4 py-3">
                 <div className="flex items-center gap-2">
                   <span className={`font-bold ${sup.score >= 90 ? 'text-emerald-600' : sup.score >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                     {sup.score}
                   </span>
                   <div className="w-16 h-1.5 bg-slate-100 rounded-full">
                     <div
                        className={`h-1.5 rounded-full ${sup.score >= 90 ? 'bg-emerald-500' : sup.score >= 70 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${sup.score}%` }}
                     />
                   </div>
                 </div>
              </td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded-full text-xs font-bold
                  ${sup.status === 'Aprovado' ? 'bg-emerald-100 text-emerald-700' :
                    sup.status === 'Condicional' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'}`}>
                  {sup.status}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-600">{sup.lastAudit}</td>
              <td className="px-4 py-3 text-right">
                <button className="text-slate-400 hover:text-slate-600">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderIndicators = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {MOCK_KPIS.map(kpi => {
        const percent = Math.min(100, Math.max(0, (kpi.current / kpi.target) * 100));
        const isPositive = kpi.trend === 'up' || kpi.trend === 'stable'; // Simplified logic

        return (
          <div key={kpi.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm font-medium text-slate-500">{kpi.name}</p>
                <div className="flex items-end gap-2 mt-1">
                  <h3 className="text-2xl font-bold text-slate-800">
                    {kpi.unit === 'R$' ? 'R$ ' : ''}{kpi.current}{kpi.unit === '%' ? '%' : ''}
                  </h3>
                  <span className="text-xs text-slate-400 mb-1">/ {kpi.target}{kpi.unit}</span>
                </div>
              </div>
              <div className={`p-2 rounded-lg bg-slate-50`}>
                <BarChart3 className="w-5 h-5 text-slate-500" />
              </div>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-2 mb-2">
              <div
                className={`h-2 rounded-full ${
                  percent >= 100 ? 'bg-emerald-500' :
                  percent >= 80 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>

            <div className="flex justify-between text-xs">
              <span className="text-slate-400">Meta: {kpi.target}{kpi.unit}</span>
              <span className={`${isPositive ? 'text-emerald-600' : 'text-red-600'} font-bold`}>
                {percent.toFixed(1)}% Atingido
              </span>
            </div>
          </div>
        )
      })}
    </div>
  );

  const renderGenericTable = (title: string, columns: string[], data: Record<string, string>[] = []) => (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex justify-between items-center">
        <h3 className="font-bold text-slate-800">{title}</h3>
        <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">
            <Plus className="w-4 h-4" /> Novo Registro
        </button>
      </div>
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 text-slate-500 font-medium">
          <tr>
            {columns.map((col, i) => <th key={i} className="px-6 py-3">{col}</th>)}
            <th className="px-6 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.length > 0 ? data.map((item, i) => (
             <tr key={i} className="hover:bg-slate-50">
               {Object.values(item).map((val, idx) => (
                 <td key={idx} className="px-6 py-3 text-slate-700">{val}</td>
               ))}
               <td className="px-6 py-3 text-right">
                 <button className="text-slate-400 hover:text-slate-600">
                   <MoreHorizontal className="w-4 h-4" />
                 </button>
               </td>
             </tr>
          )) : (
            <tr>
              <td colSpan={columns.length + 1} className="p-8 text-center text-slate-500">
                <p>Nenhum registro encontrado.</p>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestão da Qualidade (SGQ)</h1>
          <p className="text-slate-500 text-sm mt-1">Controle de conformidades, auditorias e indicadores.</p>
        </div>
        <div className="flex gap-2">
           <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium text-sm">
             Exportar Relatórios
           </button>
           <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium text-sm flex items-center gap-2">
             <Plus className="w-4 h-4" /> Nova Ação
           </button>
        </div>
      </header>

      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all
              ${activeTab === tab
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-100'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'Dashboard' && renderDashboard()}
        {activeTab === 'Não Conformidades' && renderNCs()}
        {activeTab === 'Auditorias' && renderAudits()}
        {activeTab === 'Fornecedores' && renderSuppliers()}
        {activeTab === 'Indicadores' && renderIndicators()}

        {activeTab === 'Reuniões' && renderGenericTable('Atas de Reunião', ['Data', 'Pauta', 'Participantes', 'Ações'], MOCK_MEETINGS)}
        {activeTab === 'Riscos' && renderGenericTable('Matriz de Riscos', ['Risco', 'Probabilidade', 'Impacto', 'Mitigação'], MOCK_RISKS)}
        {activeTab === 'Calibração' && renderGenericTable('Plano de Calibração', ['Equipamento', 'Tag', 'Última Cal.', 'Próxima Cal.', 'Status'], MOCK_CALIBRATION)}
        {activeTab === 'Competências' && renderGenericTable('Matriz de Competências', ['Colaborador', 'Função', 'Treinamentos', 'Avaliação'], MOCK_COMPETENCIES)}
        {activeTab === 'SAC' && renderGenericTable('Atendimentos SAC', ['Ticket', 'Cliente', 'Assunto', 'Status', 'Prioridade'], MOCK_SAC)}
      </div>
    </div>
  );
}
