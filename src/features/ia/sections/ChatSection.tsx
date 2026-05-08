import { useState, useEffect } from 'react';
import { Bot } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useProfiles } from '../../../context/ProfileContext';
import { useConversas } from './chat/useConversas';
import ConversasSidebar from './chat/ConversasSidebar';
import ChatArea from './chat/ChatArea';
import type { Agente } from './chat/types';

const ZIA_GERAL_ID = 'b697ce6c-8ea0-4268-bf73-7e690a296f68';

export default function ChatSection() {
  const { activeProfile } = useProfiles();
  const tenantId = activeProfile?.entityId ?? '';

  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [agenteAtivo, setAgenteAtivo] = useState<Agente | null>(null);
  const [conversaId, setConversaId] = useState<string | null>(null);
  const [usuarioId, setUsuarioId] = useState('anon');

  const { conversas, isLoading: loadingConversas, deletarConversa, refetch } = useConversas(tenantId);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.id) setUsuarioId(data.user.id);
    });
  }, []);

  useEffect(() => {
    if (!tenantId) return;
    supabase
      .from('ia_agentes')
      .select('*')
      .eq('status', 'ativo')
      .eq('tenant_id', tenantId)
      .then(({ data }) => {
        const lista = (data as Agente[]) ?? [];
        setAgentes(lista);
        const padrao = lista.find(a => a.id === ZIA_GERAL_ID) ?? lista[0] ?? null;
        setAgenteAtivo(padrao);
      });
  }, [tenantId]);

  const handleSelecionarConversa = (id: string) => setConversaId(id);
  const handleNovaConversa = () => setConversaId(null);
  const handleDeletarConversa = async (id: string) => {
    await deletarConversa(id);
    if (conversaId === id) setConversaId(null);
  };
  const handleConversaCriada = (id: string) => {
    setConversaId(id);
    refetch();
  };

  if (!agenteAtivo) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-950 text-slate-500 gap-3">
        <Bot className="w-6 h-6 animate-pulse" />
        <span className="text-sm">Carregando agentes...</span>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {!loadingConversas && (
        <div className="flex-shrink-0 w-64">
          <ConversasSidebar
            conversas={conversas}
            conversaAtiva={conversaId}
            onSelecionar={handleSelecionarConversa}
            onNova={handleNovaConversa}
            onDeletar={handleDeletarConversa}
            agentes={agentes}
          />
        </div>
      )}
      <div className="flex-1 overflow-hidden">
        <ChatArea
          conversaId={conversaId}
          agente={agenteAtivo}
          agentes={agentes}
          onAgenteChange={setAgenteAtivo}
          tenantId={tenantId}
          usuarioId={usuarioId}
          onNovaConversa={handleConversaCriada}
        />
      </div>
    </div>
  );
}
