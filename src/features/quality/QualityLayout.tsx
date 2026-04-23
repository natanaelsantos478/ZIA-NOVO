import { useState } from 'react';
import {
  BarChart3, AlertTriangle, FileCheck, TrendingUp, Users,
  MessageSquare, ShieldAlert, Wrench, BookOpen, Headset, Activity,
} from 'lucide-react';
import ModuleSidebar from '../../components/Layout/ModuleSidebar';
import Header from '../../components/Layout/Header';
import QualityModule from './QualityModule';

export const NAV_GROUPS = [
  {
    label: 'Visão Geral',
    items: [
      { icon: BarChart3, label: 'Dashboard', id: 'Dashboard' },
    ],
  },
  {
    label: 'Qualidade',
    items: [
      { icon: AlertTriangle, label: 'Não Conformidades', id: 'Não Conformidades' },
      { icon: FileCheck,     label: 'Auditorias',        id: 'Auditorias'        },
      { icon: Wrench,        label: 'Calibração',        id: 'Calibração'        },
    ],
  },
  {
    label: 'Análise',
    items: [
      { icon: TrendingUp, label: 'Indicadores', id: 'Indicadores' },
      { icon: ShieldAlert, label: 'Riscos',     id: 'Riscos'      },
    ],
  },
  {
    label: 'Parceiros e Pessoas',
    items: [
      { icon: Users,    label: 'Fornecedores', id: 'Fornecedores' },
      { icon: BookOpen, label: 'Competências', id: 'Competências' },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { icon: MessageSquare, label: 'Reuniões',          id: 'Reuniões'   },
      { icon: Headset,       label: 'SAC',               id: 'SAC'        },
      { icon: Activity,      label: 'Gestão de Atividades', id: 'automacoes' },
    ],
  },
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
          navGroups={NAV_GROUPS}
          activeId={activeTab}
          onNavigate={setActiveTab}
        />
        <main className="flex-1 overflow-y-auto bg-slate-50 custom-scrollbar mobile-main-pad">
          <QualityModule />
        </main>
      </div>
    </div>
  );
}
