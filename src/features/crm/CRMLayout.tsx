import { useState } from 'react';
import {
  TrendingUp, Filter, MessageCircle, Sparkles, Briefcase, Award,
  Radio, Clock, ListTodo, MapPin, PieChart, Globe, Workflow,
  HeartPulse, Share2, Link, LayoutDashboard,
} from 'lucide-react';
import ModuleSidebar from '../../components/Layout/ModuleSidebar';
import Header from '../../components/Layout/Header';
import CRMModule from './CRMModule';

const NAV_GROUPS = [
  {
    label: 'Visão Geral',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard' },
    ],
  },
  {
    label: 'Vendas e Funil',
    items: [
      { icon: Filter,    label: 'Funil de Vendas',      id: 'pipeline' },
      { icon: Briefcase, label: 'Negociações',           id: 'deals'    },
      { icon: Award,     label: 'Metas e OKRs',          id: 'okr'      },
      { icon: Radio,     label: 'CRM Live (Real-Time)',  id: 'live'     },
    ],
  },
  {
    label: 'Comunicação',
    items: [
      { icon: MessageCircle, label: 'Omnichannel Inbox',      id: 'inbox'   },
      { icon: HeartPulse,    label: 'Customer Success (CS)',  id: 'cs'      },
      { icon: Share2,        label: 'Social Listening',       id: 'social'  },
      { icon: Link,          label: 'Portal de Parceiros',    id: 'partners'},
    ],
  },
  {
    label: 'Inteligência e Dados',
    items: [
      { icon: Sparkles, label: 'Inteligência de Leads', id: 'leads'   },
      { icon: PieChart, label: 'Relatórios Avançados',  id: 'reports' },
      { icon: TrendingUp, label: 'People Analytics',   id: 'analytics'},
    ],
  },
  {
    label: 'Automação',
    items: [
      { icon: Clock,    label: 'Automação de Tarefas', id: 'tasks' },
      { icon: Workflow, label: 'Flow Builder',          id: 'flow'  },
    ],
  },
  {
    label: 'Configurações',
    items: [
      { icon: ListTodo, label: 'Campos Personalizados', id: 'fields'       },
      { icon: MapPin,   label: 'Equipes e Territórios', id: 'teams'        },
      { icon: Globe,    label: 'Integrações Externas',  id: 'integrations' },
    ],
  },
];

export default function CRMLayout() {
  const [activeSection, setActiveSection] = useState('dashboard');

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <ModuleSidebar
          moduleTitle="Vendas & CRM"
          moduleCode="CRM"
          color="purple"
          navGroups={NAV_GROUPS}
          activeId={activeSection}
          onNavigate={setActiveSection}
        />
        <main className="flex-1 overflow-y-auto bg-slate-50 custom-scrollbar">
          <CRMModule activeSection={activeSection} />
        </main>
      </div>
    </div>
  );
}
