import { useState, Component, type ReactNode } from 'react';
import {
  TrendingUp, Filter, MessageCircle, Briefcase, Award,
  Radio, Clock, ListTodo, MapPin, PieChart, Globe, Workflow,
  HeartPulse, Share2, Link, LayoutDashboard, Users, AlertTriangle, Volume2, CalendarDays,
  Bot, GitBranch, FileText, CalendarCheck, Activity,
} from 'lucide-react';
import ModuleSidebar from '../../components/Layout/ModuleSidebar';
import Header from '../../components/Layout/Header';
import CRMModule from './CRMModule';

class CRMErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-12 text-center gap-4">
          <AlertTriangle className="w-10 h-10 text-red-400" />
          <p className="text-slate-700 font-semibold">Erro ao renderizar o CRM</p>
          <p className="text-sm text-slate-500 font-mono bg-slate-100 px-4 py-2 rounded-lg max-w-lg break-all">
            {(this.state.error as Error).message}
          </p>
          <button
            onClick={() => this.setState({ error: null })}
            className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700"
          >
            Tentar novamente
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const NAV_GROUPS = [
  {
    label: 'Visão Geral',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard' },
      { icon: Users,           label: 'Clientes',  id: 'clientes'  },
    ],
  },
  {
    label: 'Vendas e Funil',
    items: [
      { icon: FileText,     label: 'Orçamentos',            id: 'orcamentos'  },
      { icon: Filter,       label: 'Funil de Vendas',      id: 'pipeline'    },
      { icon: GitBranch,    label: 'Gestão de Funis',      id: 'funis-venda' },
      { icon: CalendarDays,  label: 'Agenda',               id: 'agenda'        },
      { icon: CalendarCheck, label: 'Compromissos',         id: 'compromissos'  },
      { icon: Briefcase,     label: 'Negociações',          id: 'deals'         },
      { icon: Award,        label: 'Metas e OKRs',          id: 'okr'         },
      { icon: Activity,     label: 'Atividades',            id: 'atividades'  },
      { icon: Radio,        label: 'CRM Live (Real-Time)',  id: 'live'        },
    ],
  },
  {
    label: 'Comunicação',
    items: [
      { icon: MessageCircle, label: 'Omnichannel Inbox',      id: 'inbox'              },
      { icon: HeartPulse,    label: 'Customer Success (CS)',  id: 'cs'                 },
      { icon: Share2,        label: 'Social Listening',       id: 'social'             },
      { icon: Link,          label: 'Portal de Parceiros',    id: 'partners'           },
      { icon: Volume2,       label: 'Escuta Inteligente',     id: 'escuta-inteligente' },
    ],
  },
  {
    label: 'Inteligência e Dados',
    items: [
      { icon: Bot,        label: 'IA CRM',               id: 'ia-crm'   },
      { icon: PieChart,   label: 'Relatórios Avançados',  id: 'reports' },
      { icon: TrendingUp, label: 'People Analytics',      id: 'analytics'},
    ],
  },
  {
    label: 'Automação',
    items: [
      { icon: Clock,    label: 'Automação de Tarefas', id: 'tasks'      },
      { icon: Workflow, label: 'Flow Builder',          id: 'flow'       },
      { icon: Activity, label: 'Gestão de Atividades', id: 'automacoes' },
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
        <main className="flex-1 overflow-hidden bg-slate-50 mobile-main-pad">
          <CRMErrorBoundary>
            <CRMModule activeSection={activeSection} />
          </CRMErrorBoundary>
        </main>
      </div>
    </div>
  );
}
