import { useState } from 'react';
import {
  BarChart3, AlertTriangle, FileCheck, TrendingUp, Users,
  MessageSquare, ShieldAlert, Wrench, BookOpen, Headset,
} from 'lucide-react';
import ModuleSidebar from '../../components/Layout/ModuleSidebar';
import Header from '../../components/Layout/Header';
import QualityModule from './QualityModule';

// IDs correspond to the tab names used in QualityModule
const NAV_ITEMS = [
  { icon: BarChart3,     label: 'Dashboard',          id: 'Dashboard'          },
  { icon: AlertTriangle, label: 'Não Conformidades',  id: 'Não Conformidades'  },
  { icon: FileCheck,     label: 'Auditorias',         id: 'Auditorias'         },
  { icon: TrendingUp,    label: 'Indicadores',        id: 'Indicadores'        },
  { icon: Users,         label: 'Fornecedores',       id: 'Fornecedores'       },
  { icon: MessageSquare, label: 'Reuniões',           id: 'Reuniões'           },
  { icon: ShieldAlert,   label: 'Riscos',             id: 'Riscos'             },
  { icon: Wrench,        label: 'Calibração',         id: 'Calibração'         },
  { icon: BookOpen,      label: 'Competências',       id: 'Competências'       },
  { icon: Headset,       label: 'SAC',                id: 'SAC'                },
];

export default function QualityLayout() {
  const [activeTab, setActiveTab] = useState('Dashboard');

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <ModuleSidebar
          moduleTitle="Gestão da Qualidade"
          moduleCode="SGQ"
          color="green"
          navItems={NAV_ITEMS}
          activeId={activeTab}
          onNavigate={setActiveTab}
        />
        <main className="flex-1 overflow-y-auto p-8 bg-slate-50 custom-scrollbar">
          <QualityModule activeTab={activeTab} onTabChange={setActiveTab} />
        </main>
      </div>
    </div>
  );
}
