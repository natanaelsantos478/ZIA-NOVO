// ─────────────────────────────────────────────────────────────────────────────
// IALayout — Layout completo do módulo IA
// Rota: /app/ia/*
// ─────────────────────────────────────────────────────────────────────────────
import { useState, Component, type ReactNode } from 'react';
import {
  LayoutDashboard, Bot, Plus, ShieldCheck, MessageSquare,
  Radio, Cpu, AlertTriangle,
} from 'lucide-react';
import ModuleSidebar from '../../components/Layout/ModuleSidebar';
import Header from '../../components/Layout/Header';
import IAModule from './IAModule';

// ── Error boundary ────────────────────────────────────────────────────────────

class IAErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-12 text-center gap-4">
          <AlertTriangle className="w-10 h-10 text-red-400" />
          <p className="text-slate-700 font-semibold">Erro ao renderizar o módulo IA</p>
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

// ── Navigation ────────────────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    label: 'Central',
    items: [
      { icon: LayoutDashboard, label: 'Quartel General', id: 'dashboard'  },
      { icon: Radio,           label: 'Monitor ao Vivo', id: 'monitor'    },
    ],
  },
  {
    label: 'Agentes',
    items: [
      { icon: Bot,        label: 'Meus Agentes',  id: 'agents'        },
      { icon: Plus,       label: 'Criar Agente',  id: 'agent-builder' },
    ],
  },
  {
    label: 'Controle',
    items: [
      { icon: MessageSquare, label: 'Solicitações da IA', id: 'requests'    },
      { icon: ShieldCheck,   label: 'Permissões',         id: 'permissions' },
    ],
  },
  {
    label: 'Configuração',
    items: [
      { icon: Cpu, label: 'Modelos de IA', id: 'models' },
    ],
  },
];

// ── Layout ────────────────────────────────────────────────────────────────────

export default function IALayout() {
  const [activeSection, setActiveSection] = useState('dashboard');

  return (
    <IAErrorBoundary>
      <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 overflow-hidden">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <ModuleSidebar
            moduleTitle="IA Omnisystem"
            moduleCode="IA"
            color="violet"
            navGroups={NAV_GROUPS}
            activeId={activeSection}
            onNavigate={setActiveSection}
          />
          <main className="flex-1 overflow-y-auto custom-scrollbar bg-slate-950">
            <IAErrorBoundary>
              <IAModule section={activeSection} onNavigate={setActiveSection} />
            </IAErrorBoundary>
          </main>
        </div>
      </div>
    </IAErrorBoundary>
  );
}
