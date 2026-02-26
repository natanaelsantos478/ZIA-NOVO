import { useState } from 'react';
import {
  FileText, FolderOpen, CheckSquare, Clock, AlertCircle,
  Search, Filter, Plus, MoreHorizontal, Grid, List,
  FileCheck, FileX, Download, Eye
} from 'lucide-react';

// --- Types ---
type DocStatus = 'Rascunho' | 'Em Revisão' | 'Aprovado' | 'Obsoleto';
type DocType = 'Procedimento' | 'Instrução' | 'Política' | 'Formulário' | 'Manual' | 'Registro';

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
  expiresAt?: string;
  tags: string[];
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
const MOCK_DOCS: Document[] = [
  {
    id: 'DOC-001', code: 'POP-PROD-001', title: 'Operação de Prensa Hidráulica', type: 'Procedimento',
    category: 'Produção', version: '2.0', status: 'Aprovado', owner: 'Carlos Silva',
    createdAt: '2023-01-15', updatedAt: '2024-02-10', approvedBy: 'Gerente Ind.', expiresAt: '2025-02-10',
    tags: ['segurança', 'máquinas']
  },
  {
    id: 'DOC-002', code: 'POL-RH-005', title: 'Política de Home Office', type: 'Política',
    category: 'RH', version: '1.1', status: 'Em Revisão', owner: 'Ana Souza',
    createdAt: '2023-05-20', updatedAt: '2024-03-01', tags: ['rh', 'benefícios']
  },
  {
    id: 'DOC-003', code: 'IT-TI-012', title: 'Configuração de VPN', type: 'Instrução',
    category: 'TI', version: '3.0', status: 'Rascunho', owner: 'Pedro Santos',
    createdAt: '2024-03-15', updatedAt: '2024-03-15', tags: ['ti', 'acesso']
  },
  {
    id: 'DOC-004', code: 'FOR-QUAL-003', title: 'Registro de Não Conformidade', type: 'Formulário',
    category: 'Qualidade', version: '4.0', status: 'Aprovado', owner: 'Maria Oliveira',
    createdAt: '2022-11-10', updatedAt: '2023-11-10', approvedBy: 'Coord. Qualidade', tags: ['sgq', 'nc']
  },
  {
    id: 'DOC-005', code: 'MAN-VEND-001', title: 'Manual de Vendas B2B', type: 'Manual',
    category: 'Vendas', version: '1.0', status: 'Obsoleto', owner: 'Fernanda Lima',
    createdAt: '2021-06-15', updatedAt: '2022-06-15', tags: ['vendas', 'treinamento']
  }
];

const MOCK_APPROVALS: Approval[] = [
  {
    id: 'APR-001', documentId: 'DOC-002', documentTitle: 'Política de Home Office', documentCode: 'POL-RH-005',
    requestedBy: 'Ana Souza', requestedAt: '2024-03-01 14:30', approver: 'Diretor RH', status: 'Pendente'
  },
  {
    id: 'APR-002', documentId: 'DOC-006', documentTitle: 'Controle de Acesso', documentCode: 'IT-SEC-002',
    requestedBy: 'Pedro Santos', requestedAt: '2024-02-28 09:15', approver: 'CISO', status: 'Rejeitado', comments: 'Revisar seção 3'
  }
];

const MOCK_CATEGORIES: DocCategory[] = [
  { id: 'CAT-001', name: 'Produção', code: 'PROD', description: 'Documentos operacionais de fábrica', documentCount: 45, responsible: 'Carlos Silva' },
  { id: 'CAT-002', name: 'Recursos Humanos', code: 'RH', description: 'Políticas e formulários de gestão de pessoas', documentCount: 32, responsible: 'Ana Souza' },
  { id: 'CAT-003', name: 'Qualidade', code: 'QUAL', description: 'Sistema de Gestão da Qualidade', documentCount: 28, responsible: 'Maria Oliveira' },
];

const TABS = ['Dashboard', 'Documentos', 'Formulários', 'Versões', 'Aprovações', 'Categorias'];

export default function DocsModule() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Documentos Ativos', value: '284', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Aprovações Pendentes', value: '8', icon: CheckSquare, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Vencendo em 30d', value: '5', icon: Clock, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Formulários Ativos', value: '47', icon: FolderOpen, color: 'text-emerald-600', bg: 'bg-emerald-50' }
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{kpi.label}</p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-3xl font-bold text-slate-800">{kpi.value}</span>
              <div className={`p-2 rounded-lg ${kpi.bg}`}>
                <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribuição por Tipo */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Distribuição por Tipo</h3>
          <div className="space-y-4">
             {[
               { label: 'Procedimentos (POP)', count: 120, pct: 45, color: 'bg-blue-500' },
               { label: 'Instruções de Trabalho', count: 85, pct: 30, color: 'bg-indigo-500' },
               { label: 'Políticas', count: 35, pct: 12, color: 'bg-purple-500' },
               { label: 'Formulários', count: 47, pct: 15, color: 'bg-emerald-500' },
             ].map((item, i) => (
               <div key={i}>
                 <div className="flex justify-between text-sm mb-1">
                   <span className="font-medium text-slate-700">{item.label}</span>
                   <span className="text-slate-500">{item.count} ({item.pct}%)</span>
                 </div>
                 <div className="w-full bg-slate-100 rounded-full h-2">
                   <div className={`h-2 rounded-full ${item.color}`} style={{ width: `${item.pct}%` }}></div>
                 </div>
               </div>
             ))}
          </div>
        </div>

        {/* Aprovações Pendentes */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            Pendências
          </h3>
          <div className="space-y-3">
            {MOCK_APPROVALS.filter(a => a.status === 'Pendente').map(app => (
              <div key={app.id} className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-amber-700 bg-amber-200 px-2 py-0.5 rounded-full">
                    {app.documentCode}
                  </span>
                  <span className="text-xs text-amber-600">{app.requestedAt.split(' ')[0]}</span>
                </div>
                <p className="text-sm font-bold text-slate-800 mb-1">{app.documentTitle}</p>
                <p className="text-xs text-slate-600 mb-3">Solicitante: {app.requestedBy}</p>
                <div className="flex gap-2">
                  <button className="flex-1 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded hover:bg-slate-50">
                    Revisar
                  </button>
                  <button className="flex-1 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded hover:bg-emerald-700">
                    Aprovar
                  </button>
                </div>
              </div>
            ))}
            {MOCK_APPROVALS.filter(a => a.status === 'Pendente').length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">Nenhuma aprovação pendente.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderDocuments = () => (
    <div className="space-y-4">
       <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-4 items-center justify-between">
         <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por código, título ou tags..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
         </div>
         <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
            <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
              <Filter className="w-4 h-4" /> Filtros
            </button>
            <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700">
              <Plus className="w-4 h-4" /> Novo Documento
            </button>
         </div>
       </div>

       {viewMode === 'grid' ? (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
           {MOCK_DOCS.map(doc => (
             <div key={doc.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group p-5 flex flex-col h-full">
               <div className="flex justify-between items-start mb-3">
                 <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                   {doc.code}
                 </span>
                 <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider
                   ${doc.status === 'Aprovado' ? 'bg-emerald-100 text-emerald-700' :
                     doc.status === 'Rascunho' ? 'bg-slate-100 text-slate-600' :
                     doc.status === 'Obsoleto' ? 'bg-red-100 text-red-700' :
                     'bg-amber-100 text-amber-700'}`}>
                   {doc.status}
                 </span>
               </div>

               <div className="flex-1 mb-4">
                 <h4 className="font-bold text-slate-800 leading-tight mb-2 group-hover:text-amber-600 transition-colors">
                   {doc.title}
                 </h4>
                 <div className="flex flex-wrap gap-1 mb-2">
                   <span className="text-xs text-white bg-slate-400 px-1.5 py-0.5 rounded">{doc.type}</span>
                   <span className="text-xs text-white bg-slate-400 px-1.5 py-0.5 rounded">{doc.category}</span>
                 </div>
               </div>

               <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 flex justify-between items-center">
                  <span>v{doc.version}</span>
                  <span>{doc.updatedAt}</span>
               </div>

               <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="flex-1 py-1.5 bg-slate-50 text-slate-600 text-xs font-bold rounded hover:bg-slate-100 flex items-center justify-center gap-1">
                    <Eye className="w-3 h-3" /> Ver
                  </button>
                  <button className="flex-1 py-1.5 bg-slate-50 text-slate-600 text-xs font-bold rounded hover:bg-slate-100 flex items-center justify-center gap-1">
                    <Download className="w-3 h-3" /> Baixar
                  </button>
               </div>
             </div>
           ))}
         </div>
       ) : (
         <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="px-6 py-3">Código</th>
                  <th className="px-6 py-3">Título</th>
                  <th className="px-6 py-3">Tipo</th>
                  <th className="px-6 py-3">Versão</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Atualizado em</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {MOCK_DOCS.map(doc => (
                  <tr key={doc.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-mono text-slate-500">{doc.code}</td>
                    <td className="px-6 py-3 font-medium text-slate-800">{doc.title}</td>
                    <td className="px-6 py-3"><span className="bg-slate-100 px-2 py-1 rounded text-xs">{doc.type}</span></td>
                    <td className="px-6 py-3 text-slate-600">v{doc.version}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold
                        ${doc.status === 'Aprovado' ? 'text-emerald-700 bg-emerald-100' :
                          doc.status === 'Rascunho' ? 'text-slate-600 bg-slate-100' :
                          doc.status === 'Obsoleto' ? 'text-red-700 bg-red-100' :
                          'text-amber-700 bg-amber-100'}`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-500">{doc.updatedAt}</td>
                    <td className="px-6 py-3 text-right">
                      <button className="text-slate-400 hover:text-slate-600">
                        <MoreHorizontal className="w-4 h-4" />
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

  const renderGenericTable = (title: string, columns: string[], data: Record<string, unknown>[] = []) => (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 flex justify-between items-center">
        <h3 className="font-bold text-slate-800">{title}</h3>
        <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700">
            <Plus className="w-4 h-4" /> Novo
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
               {Object.values(item).slice(1, columns.length + 1).map((val, idx) => (
                 <td key={idx} className="px-6 py-3 text-slate-700">{String(val)}</td>
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

  const renderApprovals = () => (
     <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
       <div className="p-4 border-b border-slate-200 flex justify-between items-center">
         <h3 className="font-bold text-slate-800">Fila de Aprovações</h3>
       </div>
       <table className="w-full text-sm text-left">
         <thead className="bg-slate-50 text-slate-500 font-medium">
           <tr>
             <th className="px-6 py-3">Documento</th>
             <th className="px-6 py-3">Solicitante</th>
             <th className="px-6 py-3">Data Solicitação</th>
             <th className="px-6 py-3">Status</th>
             <th className="px-6 py-3">Ações</th>
           </tr>
         </thead>
         <tbody className="divide-y divide-slate-100">
           {MOCK_APPROVALS.map(app => (
             <tr key={app.id} className="hover:bg-slate-50">
               <td className="px-6 py-3">
                 <div className="font-medium text-slate-800">{app.documentTitle}</div>
                 <div className="text-xs text-slate-500 font-mono">{app.documentCode}</div>
               </td>
               <td className="px-6 py-3 text-slate-600">{app.requestedBy}</td>
               <td className="px-6 py-3 text-slate-600">{app.requestedAt}</td>
               <td className="px-6 py-3">
                 <span className={`px-2 py-1 rounded-full text-xs font-bold
                   ${app.status === 'Aprovado' ? 'bg-emerald-100 text-emerald-700' :
                     app.status === 'Rejeitado' ? 'bg-red-100 text-red-700' :
                     'bg-amber-100 text-amber-700'}`}>
                   {app.status}
                 </span>
               </td>
               <td className="px-6 py-3">
                 {app.status === 'Pendente' && (
                   <div className="flex gap-2">
                     <button className="p-1 rounded bg-emerald-100 text-emerald-600 hover:bg-emerald-200" title="Aprovar">
                       <FileCheck className="w-4 h-4" />
                     </button>
                     <button className="p-1 rounded bg-red-100 text-red-600 hover:bg-red-200" title="Rejeitar">
                       <FileX className="w-4 h-4" />
                     </button>
                   </div>
                 )}
               </td>
             </tr>
           ))}
         </tbody>
       </table>
     </div>
  );

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestão Eletrônica de Documentos (GED)</h1>
          <p className="text-slate-500 text-sm mt-1">Centralize, versione e distribua documentos corporativos.</p>
        </div>
        <div className="flex gap-2">
           <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium text-sm flex items-center gap-2">
             <Download className="w-4 h-4" /> Relatório Mestre
           </button>
           <button className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium text-sm flex items-center gap-2">
             <Plus className="w-4 h-4" /> Novo Documento
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
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-100'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'Dashboard' && renderDashboard()}
        {activeTab === 'Documentos' && renderDocuments()}
        {activeTab === 'Aprovações' && renderApprovals()}
        {activeTab === 'Formulários' && renderGenericTable('Biblioteca de Formulários', ['Código', 'Nome', 'Revisão', 'Responsável'])}
        {activeTab === 'Versões' && renderGenericTable('Histórico de Versões', ['Documento', 'Versão', 'Data', 'Autor', 'Motivo'])}
        {activeTab === 'Categorias' && renderGenericTable('Categorias de Documentos', ['Nome', 'Código', 'Descrição', 'Qtd. Docs'], MOCK_CATEGORIES as unknown as Record<string, unknown>[])}
      </div>
    </div>
  );
}
