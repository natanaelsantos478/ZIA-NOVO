// ─────────────────────────────────────────────────────────────────────────────
// IALayout — Layout completo do módulo IA
// Rota: /app/ia/*
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, Component, type ReactNode } from 'react';
import {
  LayoutDashboard, Bot, MessageSquare, ShieldCheck,
  Settings, Clock, AlertTriangle, Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ModuleSidebar from '../../components/Layout/ModuleSidebar';
import Header from '../../components/Layout/Header';
import IAModule from './IAModule';
import { supabase } from '../../lib/supabase';

// ── Error boundary ────────────────────────────────────────────────────────────

class IAErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-12 text-center gap-4">
          <AlertTriangle className="w-10 h-10 text-red-400" />
          <p className="text-slate-400 font-semibold">Erro ao renderizar</p>
          <p className="text-xs text-slate-600 font-mono bg-slate-900 px-4 py-2 rounded-lg max-w-lg break-all">
            {(this.state.error as Error).message}
          </p>
          <button onClick={() => this.setState({ error: null })}
            className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold">
            Tentar novamente
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default function IALayout() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [pendingRequests, setPendingRequests] = useState(0);
  const navigate = useNavigate();

  const handleNavigate = (id: string) => {
    if (id === 'chat') { navigate('/ia'); return; }
    setActiveSection(id);
  };

  useEffect(() => {
    supabase
      .from('ia_solicitacoes')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'PENDENTE')
      .then(({ count }) => setPendingRequests(count ?? 0));
  }, [activeSection]);

  const NAV_GROUPS = [
    {
      label: 'Central',
      items: [
        { icon: Sparkles,        label: 'Chat com ZIA',    id: 'chat'      },
        { icon: LayoutDashboard, label: 'Quartel General', id: 'dashboard' },
        { icon: Clock,           label: 'Histórico',       id: 'historico' },
      ],
    },
    {
      label: 'Agentes',
      items: [
        { icon: Bot, label: 'Meus Agentes', id: 'agentes' },
      ],
    },
    {
      label: 'Gestão',
      items: [
        {
          icon: MessageSquare,
          label: pendingRequests > 0 ? `Solicitações (${pendingRequests})` : 'Solicitações',
          id: 'solicitacoes',
        },
        { icon: ShieldCheck, label: 'Permissões',    id: 'permissoes'    },
        { icon: Settings,    label: 'Configurações', id: 'configuracoes' },
      ],
    },
  ];

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
            onNavigate={handleNavigate}
          />
          <main className="flex-1 overflow-y-auto custom-scrollbar bg-slate-950">
            <IAErrorBoundary>
              <IAModule
                section={activeSection}
                onNavigate={setActiveSection}
                pendingRequests={pendingRequests}
              />
            </IAErrorBoundary>
          </main>
        </div>
      </div>
    </IAErrorBoundary>
  );
}
