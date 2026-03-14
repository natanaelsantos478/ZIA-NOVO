import { useState } from 'react';
import {
  LayoutDashboard, Users, Package, KeyRound, Plug, Settings,
} from 'lucide-react';
import ModuleSidebar from '../../components/Layout/ModuleSidebar';
import Header from '../../components/Layout/Header';
import AssinaturasModule from './AssinaturasModule';

const NAV_GROUPS = [
  {
    label: 'Módulo',
    items: [
      { icon: LayoutDashboard, label: 'Visão Geral',              id: 'visao-geral'   },
      { icon: Users,           label: 'Clientes com Assinatura',  id: 'clientes'      },
      { icon: Package,         label: 'Planos',                   id: 'planos'        },
      { icon: KeyRound,        label: 'Acessos',                  id: 'acessos'       },
      { icon: Plug,            label: 'Integrações',              id: 'integracoes'   },
      { icon: Settings,        label: 'Configurações',            id: 'configuracoes' },
    ],
  },
];

export default function AssinaturasLayout() {
  const [activeSection, setActiveSection] = useState('visao-geral');

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <ModuleSidebar
          moduleTitle="Assinaturas"
          moduleCode="ASS"
          color="blue"
          navGroups={NAV_GROUPS}
          activeId={activeSection}
          onNavigate={setActiveSection}
        />
        <main className="flex-1 overflow-y-auto bg-slate-50 custom-scrollbar mobile-main-pad">
          <AssinaturasModule activeSection={activeSection} />
        </main>
      </div>
    </div>
  );
}
