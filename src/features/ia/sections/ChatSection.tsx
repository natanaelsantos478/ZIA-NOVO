import { useState, useEffect } from 'react';
import { Bot, Sparkles } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useConversas } from './chat/useConversas';
import ConversasSidebar from './chat/ConversasSidebar';
import ChatArea from './chat/ChatArea';
import type { Agente } from './chat/types';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const ZIA_GERAL_ID = 'b697ce6c-8ea0-4268-bf73-7e690a296f68';

export default function ChatSection() {
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [agenteAtivo, setAgenteAtivo] = useState<Agente | null>(null);
  const [conversaId, setConversaId] = useState<string | null>(null);

  const { conversas, isLoading: loadingConversas, deletarConversa, refetch } = useConversas();

  useEffect(() => {
    supabase
      .from('ia_agentes')
      .select('*')
      .eq('status', 'ativo')
      .eq('tenant_id', TENANT_ID)
      .then(({ data }) => {
        const lista = (data as Agente[]) ?? [];
        setAgentes(lista);
        const padrao = lista.find(a => a.id === ZIA_GERAL_ID) ?? lista[0] ?? null;
        setAgenteAtivo(padrao);
      });
  }, []);

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
      <div className="flex flex-col h-full bg-white overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-slate-800 flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Chat ZIA</h2>
            <p className="text-xs text-slate-400">Assistente de IA</p>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-400 gap-3">
          <Bot className="w-6 h-6 animate-pulse" />
          <span className="text-sm">Carregando agentes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Modal header */}
      <div className="flex items-center gap-3 px-6 py-3.5 border-b border-gray-100 bg-slate-800 flex-shrink-0">
        <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-white">Chat ZIA</h2>
          <p className="text-xs text-slate-400 truncate">
            {agenteAtivo.nome} · {conversas.length} conversa{conversas.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-xs text-white font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
            Online
          </span>
        </div>
      </div>

      {/* Body: sidebar + chat */}
      <div className="flex flex-1 overflow-hidden">
        {!loadingConversas && (
          <div className="flex-shrink-0 w-72 border-r border-gray-100">
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
        <div className="flex-1 overflow-hidden min-w-0">
          <ChatArea
            conversaId={conversaId}
            agente={agenteAtivo}
            agentes={agentes}
            onAgenteChange={setAgenteAtivo}
            tenantId={TENANT_ID}
            usuarioId="usuario"
            onNovaConversa={handleConversaCriada}
          />
        </div>
      </div>
    </div>
  );
}
