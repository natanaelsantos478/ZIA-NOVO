import { Outlet, useParams } from 'react-router-dom';
import Sidebar from '../../components/Layout/Sidebar';
import Header from '../../components/layout/Header';
import { useAppContext } from '../../context/AppContext';

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
  };

  const currentModuleName = moduleNames[moduleId || ''] || 'Módulo Desconhecido';

  // Mapping internal module IDs to the sidebar's expected IDs
  const sidebarModuleMap: Record<string, string> = {
    sales: 'crm',
    hr: 'hr',
    assets: 'eam',
    logistics: 'scm',
    backoffice: 'erp',
    settings: 'settings',
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
                <h2 className={`font-bold text-${config.primaryColor}-700 text-sm uppercase tracking-wider mr-6 border-r border-slate-200 pr-6`}>
                    {currentModuleName}
                </h2>

                <nav className="flex space-x-6 overflow-x-auto no-scrollbar">
                    {/* Exemplo de abas - isso poderia ser dinâmico baseado no módulo */}
                    <button className={`text-xs font-bold text-${config.primaryColor}-600 border-b-2 border-${config.primaryColor}-600 pb-3.5 pt-3`}>
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
