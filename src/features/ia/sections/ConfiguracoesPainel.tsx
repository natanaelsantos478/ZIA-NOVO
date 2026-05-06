// ─────────────────────────────────────────────────────────────────────────────
// ConfiguracoesPainel — Configurações e Personalizações do Escritório de IA
// Consolida todas as seções existentes em abas internas
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import {
  Sparkles, LayoutDashboard, Bot, Cpu, MessageSquare,
  ShieldCheck, Clock, Activity, Settings, KeyRound,
} from 'lucide-react';
import ChatSection     from './ChatSection';
import IADashboard     from './IADashboard';
import IAAgentes       from './IAAgentes';
import IAAgentDetalhe  from './IAAgentDetalhe';
import Models          from './Models';
import IASolicitacoes  from './IASolicitacoes';
import IAPermissoes    from './IAPermissoes';
import IAHistorico     from './IAHistorico';
import IAConfiguracoes from './IAConfiguracoes';
import Monitor         from './Monitor';
import GestorAPIs      from './GestorAPIs';

type AbaId =
  | 'chat'
  | 'dashboard'
  | 'agentes'
  | 'models'
  | 'solicitacoes'
  | 'permissoes'
  | 'historico'
  | 'monitor'
  | 'configuracoes'
  | 'gestor-apis';

interface Aba { id: AbaId; label: string; icon: React.ElementType }

const ABAS: Aba[] = [
  { id: 'chat',          label: 'Chat com ZIA',    icon: Sparkles       },
  { id: 'dashboard',     label: 'Quartel General',  icon: LayoutDashboard },
  { id: 'agentes',       label: 'Meus Agentes',     icon: Bot            },
  { id: 'models',        label: 'Modelos de IA',    icon: Cpu            },
  { id: 'solicitacoes',  label: 'Solicitações',     icon: MessageSquare  },
  { id: 'permissoes',    label: 'Permissões',       icon: ShieldCheck    },
  { id: 'historico',     label: 'Histórico',        icon: Clock          },
  { id: 'monitor',       label: 'Monitor',          icon: Activity       },
  { id: 'configuracoes', label: 'Config. Gerais',   icon: Settings       },
  { id: 'gestor-apis',   label: 'Gestor & APIs',    icon: KeyRound       },
];

export default function ConfiguracoesPainel() {
  const [aba, setAba]                   = useState<AbaId>('chat');
  const [agenteDetalheId, setAgenteDetalheId] = useState<string | null>(null);

  function handleAgentesNavigate(id: string, params?: Record<string, string>) {
    if (id === 'agente-detalhe' && params?.id) {
      setAgenteDetalheId(params.id);
    }
  }

  if (agenteDetalheId) {
    return (
      <IAAgentDetalhe
        agenteId={agenteDetalheId}
        onBack={() => setAgenteDetalheId(null)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Barra de abas horizontais */}
      <div className="flex border-b border-slate-700/60 bg-slate-900/50 overflow-x-auto custom-scrollbar flex-shrink-0">
        {ABAS.map(a => {
          const Icon = a.icon;
          return (
            <button
              key={a.id}
              onClick={() => setAba(a.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${
                aba === a.id
                  ? 'border-violet-500 text-violet-300 bg-violet-950/30'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {a.label}
            </button>
          );
        })}
      </div>

      {/* Conteúdo da aba */}
      <div className="flex-1 overflow-hidden">
        {aba === 'chat'          && <ChatSection />}
        {aba === 'dashboard'     && <IADashboard onNavigate={(id) => { if (['agentes','solicitacoes'].includes(id)) setAba(id as AbaId); }} />}
        {aba === 'agentes'       && <IAAgentes   onNavigate={handleAgentesNavigate} />}
        {aba === 'models'        && <Models />}
        {aba === 'solicitacoes'  && <IASolicitacoes />}
        {aba === 'permissoes'    && <IAPermissoes />}
        {aba === 'historico'     && <IAHistorico />}
        {aba === 'monitor'       && <Monitor />}
        {aba === 'configuracoes' && <IAConfiguracoes />}
        {aba === 'gestor-apis'   && <GestorAPIs />}
      </div>
    </div>
  );
}
