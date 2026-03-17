// ─────────────────────────────────────────────────────────────────────────────
// IAModule — Switch de seções do módulo IA
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import IADashboard    from './sections/IADashboard';
import IAAgentes      from './sections/IAAgentes';
import IASolicitacoes from './sections/IASolicitacoes';
import IAPermissoes   from './sections/IAPermissoes';
import IAConfiguracoes from './sections/IAConfiguracoes';
import IAHistorico    from './sections/IAHistorico';
import IAAgentDetalhe from './sections/IAAgentDetalhe';

interface IAModuleProps {
  section: string;
  onNavigate: (id: string) => void;
  pendingRequests?: number;
}

export default function IAModule({ section, onNavigate }: IAModuleProps) {
  const [agenteDetalheId, setAgenteDetalheId] = useState<string | null>(null);

  function handleNavigate(id: string, params?: Record<string, string>) {
    if (id === 'agente-detalhe' && params?.id) {
      setAgenteDetalheId(params.id);
      return;
    }
    setAgenteDetalheId(null);
    onNavigate(id);
  }

  // Detalhe do agente tem prioridade sobre qualquer seção
  if (agenteDetalheId) {
    return <IAAgentDetalhe agenteId={agenteDetalheId} onBack={() => setAgenteDetalheId(null)} />;
  }

  switch (section) {
    case 'dashboard':     return <IADashboard    onNavigate={handleNavigate} />;
    case 'agentes':       return <IAAgentes       onNavigate={handleNavigate} />;
    case 'solicitacoes':  return <IASolicitacoes />;
    case 'permissoes':    return <IAPermissoes />;
    case 'configuracoes': return <IAConfiguracoes />;
    case 'historico':     return <IAHistorico />;
    default:              return <IADashboard    onNavigate={handleNavigate} />;
  }
}
