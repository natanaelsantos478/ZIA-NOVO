// ─────────────────────────────────────────────────────────────────────────────
// IALayout — Escritório de IA
// Rota: /app/ia/*
// ─────────────────────────────────────────────────────────────────────────────
import { useState, Component, type ReactNode } from 'react';
import { Network, Settings, AlertTriangle, MessageSquare } from 'lucide-react';
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

// ── Navegação — 2 seções ──────────────────────────────────────────────────────

export const IA_NAV_GROUPS = [
  {
    label: 'Escritório de IA',
    items: [
      { icon: Network,       label: 'Organograma',                  id: 'organograma'    },
      { icon: MessageSquare, label: 'Conversas WhatsApp',           id: 'wa-chats'       },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { icon: Settings,  label: 'Configurações e Personalizações', id: 'configuracoes' },
    ],
  },
];

// ── Layout ────────────────────────────────────────────────────────────────────

export default function IALayout() {
  const [activeSection, setActiveSection] = useState('organograma');

  return (
    <IAErrorBoundary>
      <div className="flex flex-col h-full w-full bg-slate-950 text-slate-100 overflow-hidden">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <ModuleSidebar
            moduleTitle="Escritório de IA"
            moduleCode="IA"
            color="violet"
            navGroups={IA_NAV_GROUPS}
            activeId={activeSection}
            onNavigate={setActiveSection}
          />
          <main className="flex-1 overflow-hidden bg-slate-950">
            <IAErrorBoundary>
              <IAModule section={activeSection} onNavigate={setActiveSection} />
            </IAErrorBoundary>
          </main>
        </div>
      </div>
    </IAErrorBoundary>
  );
}
