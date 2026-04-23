import { useState } from 'react';
import {
  BarChart3, Package, ArrowRightLeft, Wrench,
  ClipboardList, Shield, FileBarChart, Settings2, Activity,
} from 'lucide-react';
import ModuleSidebar from '../../components/Layout/ModuleSidebar';
import Header from '../../components/Layout/Header';
import EAMModule from './EAMModule';
import { useScope } from '../../context/ProfileContext';

const NAV_GROUPS = [
  {
    label: 'Visão Geral',
    items: [
      { icon: BarChart3, label: 'Dashboard', id: 'dashboard' },
    ],
  },
  {
    label: 'Patrimônio',
    items: [
      { icon: Package,         label: 'Ativos',         id: 'assets'    },
      { icon: ArrowRightLeft,  label: 'Movimentações',  id: 'transfers' },
    ],
  },
  {
    label: 'Manutenção',
    items: [
      { icon: Wrench, label: 'Ordens de Serviço', id: 'maintenance' },
    ],
  },
  {
    label: 'Controle',
    items: [
      { icon: ClipboardList, label: 'Inventário', id: 'inventory' },
      { icon: Shield,        label: 'Seguros',    id: 'insurance' },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { icon: FileBarChart, label: 'Relatórios',         id: 'reports'    },
      { icon: Activity,     label: 'Gestão de Atividades', id: 'automacoes' },
      { icon: Settings2,    label: 'Configurações',     id: 'settings'   },
    ],
  },
];

export default function EAMLayout() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const scope = useScope();

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <ModuleSidebar
          moduleTitle="Gestão de Ativos"
          moduleCode="EAM"
          color="blue"
          navGroups={NAV_GROUPS}
          activeId={activeSection}
          onNavigate={setActiveSection}
        />
        <main className="flex-1 overflow-y-auto bg-slate-50 custom-scrollbar mobile-main-pad">
          <EAMModule key={scope.entityId} activeSection={activeSection} onNavigate={setActiveSection} />
        </main>
      </div>
    </div>
  );
}
