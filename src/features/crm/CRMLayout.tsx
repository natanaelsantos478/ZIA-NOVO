import { useState } from 'react';
import {
  TrendingUp, Filter, MessageCircle, Sparkles, Briefcase, Award,
  Radio, Clock, ListTodo, MapPin, PieChart, Globe, Workflow,
  HeartPulse, Share2, Link,
} from 'lucide-react';
import ModuleSidebar from '../../components/Layout/ModuleSidebar';
import Header from '../../components/Layout/Header';
import CRMModule from './CRMModule';

const NAV_ITEMS = [
  { icon: TrendingUp,    label: 'Dashboard',              id: 'dashboard'    },
  { icon: Filter,        label: 'Funil de Vendas',        id: 'pipeline'     },
  { icon: MessageCircle, label: 'Omnichannel Inbox',      id: 'inbox'        },
  { icon: Sparkles,      label: 'Inteligência de Leads',  id: 'leads'        },
  { icon: Briefcase,     label: 'Negociações',            id: 'deals'        },
  { icon: Award,         label: 'Metas e OKRs',           id: 'okr'          },
  { icon: Radio,         label: 'CRM Live (Real-Time)',   id: 'live'         },
  { icon: Clock,         label: 'Automação de Tarefas',   id: 'tasks'        },
  { icon: ListTodo,      label: 'Campos Personalizados',  id: 'fields'       },
  { icon: MapPin,        label: 'Equipes e Territórios',  id: 'teams'        },
  { icon: PieChart,      label: 'Relatórios Avançados',   id: 'reports'      },
  { icon: Globe,         label: 'Integrações Externas',   id: 'integrations' },
  { icon: Workflow,      label: 'Flow Builder',           id: 'flow'         },
  { icon: HeartPulse,    label: 'Customer Success (CS)',  id: 'cs'           },
  { icon: Share2,        label: 'Social Listening',       id: 'social'       },
  { icon: Link,          label: 'Portal de Parceiros',    id: 'partners'     },
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
          navItems={NAV_ITEMS}
          activeId={activeSection}
          onNavigate={setActiveSection}
        />
        <main className="flex-1 overflow-y-auto p-8 bg-slate-50 custom-scrollbar">
          <CRMModule />
        </main>
      </div>
    </div>
  );
}
