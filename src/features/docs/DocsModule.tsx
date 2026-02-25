import React, { useState } from 'react';
import {
  LayoutDashboard,
  Files,
  FileText,
  History,
  CheckSquare,
  Tags,
  Search,
  Filter,
  Plus,
  MoreVertical,
  FileCheck,
  AlertTriangle,
  Clock,
  FolderOpen,
  ArrowRight
} from 'lucide-react';

// --- Types ---

type DocStatus = 'Rascunho' | 'Em Revisão' | 'Aprovado' | 'Obsoleto' | 'Cancelado';
type DocType = 'Procedimento' | 'Instrução de Trabalho' | 'Política' | 'Formulário' | 'Manual' | 'Registro' | 'Norma';

interface Document {
  id: string;
  code: string;
  title: string;
  type: DocType;
  category: string;
  version: string;
  status: DocStatus;
  owner: string;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  expiresAt?: string;
  description: string;
  tags: string[];
}

interface FormTemplate {
  id: string;
  code: string;
  title: string;
  category: string;
  version: string;
  status: DocStatus;
  fields: number;
  submissions: number;
  lastUsed?: string;
}

interface DocVersion {
  id: string;
  documentId: string;
  documentTitle: string;
  version: string;
  changedBy: string;
  changedAt: string;
  changeDescription: string;
  previousVersion: string;
}

interface Approval {
  id: string;
  documentId: string;
  documentTitle: string;
  documentCode: string;
  requestedBy: string;
  requestedAt: string;
  approver: string;
  status: 'Pendente' | 'Aprovado' | 'Rejeitado';
  comments?: string;
  resolvedAt?: string;
}

interface DocCategory {
  id: string;
  name: string;
  code: string;
  description: string;
  documentCount: number;
  responsible: string;
}

// --- Mock Data ---

const mockDocuments: Document[] = [
  {
    id: 'DOC-001',
    code: 'POP-RH-001',
    title: 'Procedimento de Admissão',
    type: 'Procedimento',
    category: 'RH',
    version: 'v2.0',
    status: 'Aprovado',
    owner: 'Maria Souza',
    createdAt: '2023-01-10',
    updatedAt: '2024-02-15',
    description: 'Fluxo completo de contratação e onboarding',
    tags: ['RH', 'Admissão']
  },
  {
    id: 'DOC-002',
    code: 'IT-PROD-05',
    title: 'Operação de Prensa Hidráulica',
    type: 'Instrução de Trabalho',
    category: 'Produção',
    version: 'v1.1',
    status: 'Em Revisão',
    owner: 'João Silva',
    createdAt: '2023-05-20',
    updatedAt: '2024-03-10',
    description: 'Passo a passo seguro para operação',
    tags: ['Segurança', 'Máquinas']
  },
  {
    id: 'DOC-003',
    code: 'POL-TI-02',
    title: 'Política de Segurança da Informação',
    type: 'Política',
    category: 'TI',
    version: 'v3.0',
    status: 'Rascunho',
    owner: 'Pedro Santos',
    createdAt: '2024-03-01',
    updatedAt: '2024-03-18',
    description: 'Diretrizes de acesso e proteção de dados',
    tags: ['LGPD', 'Segurança']
  }
];

const mockApprovals: Approval[] = [
  {
    id: 'APR-001',
    documentId: 'DOC-002',
    documentTitle: 'Operação de Prensa Hidráulica',
    documentCode: 'IT-PROD-05',
    requestedBy: 'João Silva',
    requestedAt: '2024-03-10',
    approver: 'Carlos Gerente',
    status: 'Pendente'
  },
  {
    id: 'APR-002',
    documentId: 'DOC-005',
    documentTitle: 'Manual de Vendas',
    documentCode: 'MAN-COM-01',
    requestedBy: 'Ana Vendas',
    requestedAt: '2024-03-05',
    approver: 'Diretor Comercial',
    status: 'Aprovado',
    resolvedAt: '2024-03-08'
  }
];

const mockCategories: DocCategory[] = [
  {
    id: 'CAT-01',
    name: 'Recursos Humanos',
    code: 'RH',
    description: 'Documentos relacionados à gestão de pessoas',
    documentCount: 45,
    responsible: 'Gerente RH'
  },
  {
    id: 'CAT-02',
    name: 'Produção',
    code: 'PROD',
    description: 'Instruções técnicas e processos fabris',
    documentCount: 128,
    responsible: 'Gerente Industrial'
  },
  {
    id: 'CAT-03',
    name: 'Qualidade',
    code: 'SGQ',
    description: 'Normas, manuais e registros da qualidade',
    documentCount: 67,
    responsible: 'Coord. Qualidade'
  }
];

// --- Components ---

const DocsModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showNewDocModal, setShowNewDocModal] = useState(false);

  const renderDashboard = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-slate-500">Documentos Ativos</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-1">
                {mockDocuments.filter(d => d.status === 'Aprovado').length + 142}
              </h3>
            </div>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Files className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center text-sm text-slate-600">
            <span className="text-emerald-600 font-medium mr-1">+12</span>
            novos este mês
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-slate-500">Aprovações Pendentes</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-1">
                {mockApprovals.filter(a => a.status === 'Pendente').length}
              </h3>
            </div>
            <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
              <CheckSquare className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center text-sm text-slate-600">
            <span className="text-orange-600 font-medium mr-1">Urgent</span>
            2 aguardando {'>'} 3 dias
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-slate-500">Vencendo em 30 dias</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-1">8</h3>
            </div>
            <div className="p-2 rounded-lg bg-yellow-50 text-yellow-600">
              <Clock className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center text-sm text-slate-600">
            <span className="text-slate-500">Necessitam revisão</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-slate-500">Formulários Ativos</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-1">24</h3>
            </div>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <FileText className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center text-sm text-slate-600">
            <span className="text-emerald-600 font-medium mr-1">1.2k</span>
            submissões total
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Atividade Recente</h3>
          <div className="space-y-6">
            {[1, 2, 3, 4].map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-slate-300 mt-2"></div>
                  {i !== 3 && <div className="w-px h-full bg-slate-200 my-2"></div>}
                </div>
                <div>
                  <p className="text-sm text-slate-900">
                    <span className="font-semibold">Carlos Silva</span> aprovou a revisão do documento <span className="font-medium text-blue-600">POP-RH-001</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Há 2 horas • Versão 2.1</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Aprovações Rápidas</h3>
          <div className="space-y-4">
            {mockApprovals.filter(a => a.status === 'Pendente').map(approval => (
              <div key={approval.id} className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-orange-600 bg-white px-2 py-1 rounded border border-orange-200">{approval.documentCode}</span>
                  <span className="text-xs text-orange-600">{new Date(approval.requestedAt).toLocaleDateString()}</span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm mb-1">{approval.documentTitle}</h4>
                <p className="text-xs text-slate-600 mb-3">Solicitado por: {approval.requestedBy}</p>
                <div className="flex gap-2">
                  <button className="flex-1 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-medium rounded hover:bg-slate-50 transition-colors">
                    Ver Detalhes
                  </button>
                  <button className="flex-1 px-3 py-1.5 bg-orange-600 text-white text-xs font-medium rounded hover:bg-orange-700 transition-colors shadow-sm">
                    Revisar
                  </button>
                </div>
              </div>
            ))}
            {mockApprovals.filter(a => a.status === 'Pendente').length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">Nenhuma aprovação pendente.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderDocuments = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar documentos..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
          <button className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">
            <Filter className="w-5 h-5" />
          </button>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
            >
              <LayoutDashboard className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
            >
              <MoreVertical className="w-4 h-4 rotate-90" />
            </button>
          </div>
        </div>
        <button
          onClick={() => setShowNewDocModal(true)}
          className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors shadow-sm font-medium text-sm"
        >
          <Plus className="w-4 h-4" />
          Novo Documento
        </button>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockDocuments.map(doc => (
            <div key={doc.id} className="group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all hover:border-amber-200">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                    doc.type === 'Procedimento' ? 'bg-blue-50 text-blue-700' :
                    doc.type === 'Política' ? 'bg-purple-50 text-purple-700' :
                    'bg-slate-50 text-slate-700'
                  }`}>
                    {doc.type}
                  </span>
                  <button className="text-slate-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>

                <div className="mb-4">
                  <span className="font-mono text-xs text-slate-500 mb-1 block">{doc.code}</span>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">{doc.title}</h3>
                </div>

                <p className="text-sm text-slate-500 line-clamp-2 mb-4 h-10">
                  {doc.description}
                </p>

                <div className="flex items-center gap-2 mb-4">
                  <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-medium border border-slate-200">
                    {doc.version}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${
                    doc.status === 'Aprovado' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                    doc.status === 'Em Revisão' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                    'bg-slate-50 text-slate-600 border border-slate-200'
                  }`}>
                    {doc.status === 'Aprovado' && <FileCheck className="w-3 h-3" />}
                    {doc.status === 'Em Revisão' && <History className="w-3 h-3" />}
                    {doc.status}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                      {doc.owner.charAt(0)}
                    </div>
                    <span className="text-xs text-slate-500">{new Date(doc.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <button className="text-amber-600 hover:text-amber-700 text-sm font-medium flex items-center gap-1">
                    Ver Documento <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Código</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Título</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Versão</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Responsável</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {mockDocuments.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-500">{doc.code}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{doc.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{doc.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{doc.version}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      doc.status === 'Aprovado' ? 'bg-emerald-100 text-emerald-700' :
                      doc.status === 'Em Revisão' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {doc.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{doc.owner}</td>
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
      )}
    </div>
  );

  const renderCategories = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-slate-900">Categorias de Documentos</h2>
        <button className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors shadow-sm font-medium text-sm">
          <Plus className="w-4 h-4" />
          Nova Categoria
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockCategories.map(cat => (
          <div key={cat.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-amber-200 transition-all cursor-pointer group">
            <div className="flex justify-between items-start mb-4">
              <span className="text-2xl font-black text-slate-200 group-hover:text-amber-100 transition-colors">{cat.code}</span>
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-all">
                <FolderOpen className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">{cat.name}</h3>
            <p className="text-sm text-slate-500 mb-6">{cat.description}</p>

            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
              <span className="text-sm font-medium text-slate-900">{cat.documentCount} documentos</span>
              <span className="text-xs text-slate-500">{cat.responsible}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      {/* Header */}
      <header className="flex-none bg-white border-b border-slate-200 px-8 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg">
              <Files className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Gestão de Documentos</h1>
              <p className="text-sm text-slate-500">Document Management System (DMS)</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Busca global..."
                className="pl-9 pr-4 py-1.5 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-amber-500/20 w-64"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'documents', label: 'Documentos', icon: Files },
            { id: 'forms', label: 'Formulários', icon: FileText },
            { id: 'versions', label: 'Versões', icon: History },
            { id: 'approvals', label: 'Aprovações', icon: CheckSquare },
            { id: 'categories', label: 'Categorias', icon: Tags },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                ${activeTab === tab.id
                  ? 'bg-amber-50 text-amber-700 shadow-sm ring-1 ring-amber-200'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }
              `}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-amber-600' : 'text-slate-400'}`} />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'documents' && renderDocuments()}
          {activeTab === 'categories' && renderCategories()}

          {['forms', 'versions', 'approvals'].includes(activeTab) && (
            <div className="flex flex-col items-center justify-center h-96 text-slate-400 animate-in fade-in duration-500">
              <div className="p-4 bg-slate-100 rounded-full mb-4">
                <Files className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-medium text-slate-900">Módulo em Desenvolvimento</h3>
              <p className="text-sm">Esta funcionalidade estará disponível na próxima atualização.</p>
            </div>
          )}
        </div>
      </main>

      {/* New Document Modal */}
      {showNewDocModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900">Novo Documento</h3>
              <button
                onClick={() => setShowNewDocModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <MoreVertical className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Código</label>
                  <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-500" value="AUTO-GENERATED" disabled />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Título</label>
                  <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all" placeholder="Ex: Procedimento de Segurança" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
                  <select className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all">
                    <option>Procedimento</option>
                    <option>Instrução de Trabalho</option>
                    <option>Política</option>
                    <option>Formulário</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                  <select className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all">
                    <option>RH</option>
                    <option>Produção</option>
                    <option>Qualidade</option>
                    <option>TI</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
                <textarea rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all resize-none" placeholder="Breve resumo do documento..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Responsável</label>
                  <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Tags</label>
                  <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all" placeholder="Separadas por vírgula" />
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setShowNewDocModal(false)}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button className="px-4 py-2 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 shadow-sm shadow-amber-200 transition-all transform active:scale-95">
                Criar Documento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocsModule;
