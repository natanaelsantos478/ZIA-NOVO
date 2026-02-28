import { Outlet, useParams } from 'react-router-dom';
import Sidebar from '../../components/Layout/Sidebar';
import Header from '../../components/Layout/Header';
import { useAppContext } from '../../context/AppContext';

// Static color map — prevents Tailwind from stripping dynamic classes in production
const COLOR_MAP: Record<string, { text7: string; text6: string; border6: string }> = {
  indigo: { text7: 'text-indigo-700', text6: 'text-indigo-600', border6: 'border-indigo-600' },
  purple: { text7: 'text-purple-700', text6: 'text-purple-600', border6: 'border-purple-600' },
  blue:   { text7: 'text-blue-700',   text6: 'text-blue-600',   border6: 'border-blue-600'   },
};

export default function ModuleLayout() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const { config } = useAppContext();

  // Mapeamento de nomes de módulo para exibição
  const moduleNames: Record<string, string> = {
    sales: 'Vendas & CRM',
    hr: 'Recursos Humanos',
    assets: 'Gestão de Ativos',
    logistics: 'Logística & Supply Chain',
    backoffice: 'Backoffice & Financeiro',
    settings: 'Configurações do Sistema',
    quality: 'Gestão da Qualidade',
    docs: 'Gestão de Documentos',
  };

  const currentModuleName = moduleNames[moduleId || ''] || 'Módulo Desconhecido';
  const theme = COLOR_MAP[config.primaryColor] ?? COLOR_MAP.indigo;

  // Mapping internal module IDs to the sidebar's expected IDs
  const sidebarModuleMap: Record<string, string> = {
    sales: 'crm',
    hr: 'hr',
    assets: 'eam',
    logistics: 'scm',
    backoffice: 'erp',
    settings: 'settings',
    quality: 'quality',
    docs: 'docs',
  };

  const activeSidebarModule = sidebarModuleMap[moduleId || ''];

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-50 overflow-hidden">
        <Header />

        <div className="flex flex-1 overflow-hidden relative h-full">
            {/* Sidebar Fixa */}
            <Sidebar activeModule={activeSidebarModule} />

            {/* Conteúdo Principal */}
            <main className="flex-1 flex flex-col min-w-0 bg-slate-50 relative overflow-hidden">

                {/* Barra de Sub-abas (Header Secundário) */}
                <header className="h-12 bg-white border-b border-slate-200 flex items-center px-6 shrink-0 z-20 shadow-sm">
                <h2 className={`font-bold ${theme.text7} text-sm uppercase tracking-wider mr-6 border-r border-slate-200 pr-6`}>
                    {currentModuleName}
                </h2>

                <nav className="flex space-x-6 overflow-x-auto no-scrollbar">
                    {/* Exemplo de abas - isso poderia ser dinâmico baseado no módulo */}
                    <button className={`text-xs font-bold ${theme.text6} border-b-2 ${theme.border6} pb-3.5 pt-3`}>
                    Visão Geral
                    </button>
                    <button className="text-xs font-medium text-slate-500 hover:text-slate-800 pb-3.5 pt-3 transition-colors">
                    Relatórios
                    </button>
                    <button className="text-xs font-medium text-slate-500 hover:text-slate-800 pb-3.5 pt-3 transition-colors">
                    Configurações
                    </button>
                </nav>
                </header>

                {/* Área de Conteúdo (Dashboards) */}
                <div className="flex-1 overflow-y-auto p-8 relative custom-scrollbar">
                   <Outlet />
                </div>
            </main>
        </div>
    </div>
  );
}
