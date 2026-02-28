import { useState } from 'react';
import { BarChart3, FileText, File, GitBranch, CheckSquare, Folder } from 'lucide-react';
import ModuleSidebar from '../../components/Layout/ModuleSidebar';
import Header from '../../components/Layout/Header';
import DocsModule from './DocsModule';

// IDs correspond to the tab names used in DocsModule
const NAV_ITEMS = [
  { icon: BarChart3,   label: 'Dashboard',  id: 'Dashboard'  },
  { icon: FileText,    label: 'Documentos', id: 'Documentos' },
  { icon: File,        label: 'Formulários',id: 'Formulários'},
  { icon: GitBranch,   label: 'Versões',    id: 'Versões'    },
  { icon: CheckSquare, label: 'Aprovações', id: 'Aprovações' },
  { icon: Folder,      label: 'Categorias', id: 'Categorias' },
];

export default function DocsLayout() {
  const [activeTab, setActiveTab] = useState('Dashboard');

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <ModuleSidebar
          moduleTitle="Gestão de Documentos"
          moduleCode="GED"
          color="amber"
          navItems={NAV_ITEMS}
          activeId={activeTab}
          onNavigate={setActiveTab}
        />
        <main className="flex-1 overflow-y-auto p-8 bg-slate-50 custom-scrollbar">
          <DocsModule activeTab={activeTab} onTabChange={setActiveTab} />
        </main>
      </div>
    </div>
  );
}
