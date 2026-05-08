// ─────────────────────────────────────────────────────────────────────────────
// WaAgentChats — Chat interno dos agentes WhatsApp
// Exibe threads wa_agent_chats + mensagens wa_agent_chat_messages
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState, useRef } from 'react';
import { MessageSquare, Bot, User, Wrench, ChevronRight, RefreshCw, Loader2, Search } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useProfiles } from '../../../context/ProfileContext';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface WaChat {
  id: string;
  phone: string;
  titulo: string | null;
  last_message_at: string;
  agent_id: string;
  agent_nome?: string;
}

interface WaMessage {
  id: string;
  role: 'user' | 'thought' | 'tool_call' | 'tool_result' | 'reply' | 'assistant';
  content: string | null;
  tool_name: string | null;
  tool_args: Record<string, unknown> | null;
  tool_result: Record<string, unknown> | null;
  zapi_message_id: string | null;
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, '');
  if (d.length === 13) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  if (d.length === 12) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 8)}-${d.slice(8)}`;
  return phone;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ── Bolha por role ────────────────────────────────────────────────────────────

function MessageRow({ msg }: { msg: WaMessage }) {
  const [expanded, setExpanded] = useState(false);

  if (msg.role === 'user') {
    return (
      <div className="flex items-start gap-2 justify-start">
        <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
          <User className="w-3.5 h-3.5 text-slate-300" />
        </div>
        <div className="max-w-[72%]">
          <div className="bg-slate-800 rounded-2xl rounded-tl-sm px-3.5 py-2 text-slate-100 text-sm leading-relaxed">
            {msg.content}
          </div>
          <p className="text-xs text-slate-600 mt-1 ml-1">{formatTime(msg.created_at)}</p>
        </div>
      </div>
    );
  }

  if (msg.role === 'reply') {
    return (
      <div className="flex items-start gap-2 justify-end">
        <div className="max-w-[72%]">
          <div className="bg-violet-600 rounded-2xl rounded-tr-sm px-3.5 py-2 text-white text-sm leading-relaxed">
            {msg.content}
          </div>
          <p className="text-xs text-slate-600 mt-1 mr-1 text-right">{formatTime(msg.created_at)}</p>
        </div>
        <div className="w-7 h-7 rounded-full bg-violet-700 flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bot className="w-3.5 h-3.5 text-violet-200" />
        </div>
      </div>
    );
  }

  if (msg.role === 'thought') {
    return (
      <div className="flex justify-center">
        <div className="max-w-[80%] bg-slate-900 border border-slate-700/50 rounded-xl px-3.5 py-2.5">
          <p className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500 inline-block" />
            Raciocínio interno
          </p>
          <p className="text-sm text-slate-400 italic leading-relaxed">{msg.content}</p>
          <p className="text-xs text-slate-700 mt-1">{formatTime(msg.created_at)}</p>
        </div>
      </div>
    );
  }

  if (msg.role === 'tool_call') {
    return (
      <div className="flex justify-center">
        <div className="max-w-[80%] bg-amber-950/40 border border-amber-800/40 rounded-xl px-3.5 py-2.5">
          <p className="text-xs text-amber-400 font-medium mb-1.5 flex items-center gap-1.5">
            <Wrench className="w-3 h-3" />
            Chamando ferramenta: <span className="font-mono">{msg.tool_name}</span>
          </p>
          {msg.tool_args && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-xs text-amber-600 hover:text-amber-400 flex items-center gap-1"
            >
              <ChevronRight className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`} />
              {expanded ? 'ocultar' : 'ver argumentos'}
            </button>
          )}
          {expanded && msg.tool_args && (
            <pre className="mt-2 text-xs text-amber-300/70 font-mono bg-black/30 rounded-lg p-2 overflow-x-auto max-h-40">
              {JSON.stringify(msg.tool_args, null, 2)}
            </pre>
          )}
          <p className="text-xs text-amber-900 mt-1">{formatTime(msg.created_at)}</p>
        </div>
      </div>
    );
  }

  if (msg.role === 'tool_result') {
    return (
      <div className="flex justify-center">
        <div className="max-w-[80%] bg-emerald-950/40 border border-emerald-800/40 rounded-xl px-3.5 py-2.5">
          <p className="text-xs text-emerald-400 font-medium mb-1.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            Resultado: <span className="font-mono">{msg.tool_name}</span>
          </p>
          {msg.tool_result && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-xs text-emerald-600 hover:text-emerald-400 flex items-center gap-1"
            >
              <ChevronRight className={`w-3 h-3 transition-transform ${expanded ? 'rotate-90' : ''}`} />
              {expanded ? 'ocultar' : 'ver resultado'}
            </button>
          )}
          {expanded && msg.tool_result && (
            <pre className="mt-2 text-xs text-emerald-300/70 font-mono bg-black/30 rounded-lg p-2 overflow-x-auto max-h-40">
              {JSON.stringify(msg.tool_result, null, 2)}
            </pre>
          )}
          <p className="text-xs text-emerald-900 mt-1">{formatTime(msg.created_at)}</p>
        </div>
      </div>
    );
  }

  if (msg.role === 'assistant') {
    return (
      <div className="flex justify-center">
        <p className="text-xs text-slate-600 italic px-3 py-1">
          {msg.content}
        </p>
      </div>
    );
  }

  return null;
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function WaAgentChats() {
  const { activeProfile } = useProfiles();
  const tenantId = activeProfile?.entityId ?? '';

  const [chats, setChats] = useState<WaChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<WaMessage[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [search, setSearch] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Carregar lista de chats
  const loadChats = async () => {
    setLoadingChats(true);
    const { data } = await supabase
      .from('wa_agent_chats')
      .select('id, phone, titulo, last_message_at, agent_id, ia_agentes(nome)')
      .order('last_message_at', { ascending: false });

    setChats(
      (data ?? []).map((c: Record<string, unknown>) => ({
        id: c.id as string,
        phone: c.phone as string,
        titulo: c.titulo as string | null,
        last_message_at: c.last_message_at as string,
        agent_id: c.agent_id as string,
        agent_nome: (c.ia_agentes as Record<string, unknown> | null)?.nome as string | undefined,
      }))
    );
    setLoadingChats(false);
  };

  // Carregar mensagens do chat ativo
  const loadMessages = async (chatId: string) => {
    setLoadingMsgs(true);
    const { data } = await supabase
      .from('wa_agent_chat_messages')
      .select('id, role, content, tool_name, tool_args, tool_result, zapi_message_id, created_at')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    setMessages((data ?? []) as WaMessage[]);
    setLoadingMsgs(false);
  };

  useEffect(() => { loadChats(); }, [tenantId]);

  useEffect(() => {
    if (activeChatId) loadMessages(activeChatId);
  }, [activeChatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filtered = chats.filter(c =>
    c.phone.includes(search) ||
    (c.titulo ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (c.agent_nome ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const activeChat = chats.find(c => c.id === activeChatId);

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Sidebar de chats ── */}
      <div className="w-72 flex-shrink-0 border-r border-slate-800 flex flex-col bg-slate-950">
        {/* Header */}
        <div className="px-4 py-4 border-b border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-violet-400" />
              Conversas WhatsApp
            </h2>
            <button
              onClick={loadChats}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loadingChats ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 text-slate-600 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-slate-600 text-center py-8 px-4">
              {search ? 'Nenhum resultado' : 'Nenhuma conversa ainda'}
            </p>
          ) : (
            filtered.map(chat => (
              <button
                key={chat.id}
                onClick={() => setActiveChatId(chat.id)}
                className={`w-full text-left px-4 py-3 border-b border-slate-800/60 transition-colors hover:bg-slate-900 ${activeChatId === chat.id ? 'bg-slate-900 border-l-2 border-l-violet-500' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-violet-900/50 border border-violet-700/40 flex items-center justify-center flex-shrink-0">
                      <User className="w-3.5 h-3.5 text-violet-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">
                        {formatPhone(chat.phone)}
                      </p>
                      {chat.agent_nome && (
                        <p className="text-xs text-slate-500 truncate">{chat.agent_nome}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-slate-600 flex-shrink-0 mt-0.5">
                    {timeAgo(chat.last_message_at)}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Área de mensagens ── */}
      {activeChatId ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header do chat */}
          <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between flex-shrink-0">
            <div>
              <p className="text-sm font-semibold text-slate-200">
                {formatPhone(activeChat?.phone ?? '')}
              </p>
              {activeChat?.agent_nome && (
                <p className="text-xs text-slate-500">via {activeChat.agent_nome}</p>
              )}
            </div>
            <button
              onClick={() => activeChatId && loadMessages(activeChatId)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-5 space-y-3">
            {loadingMsgs ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-5 h-5 text-slate-600 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <p className="text-xs text-slate-600 text-center py-12">Sem mensagens</p>
            ) : (
              messages.map(msg => <MessageRow key={msg.id} msg={msg} />)
            )}
            <div ref={bottomRef} />
          </div>

          {/* Legenda */}
          <div className="px-5 py-2 border-t border-slate-800 flex items-center gap-4 flex-shrink-0">
            <span className="text-xs text-slate-600">Legenda:</span>
            <span className="text-xs text-slate-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-600 inline-block" /> Recebida</span>
            <span className="text-xs text-violet-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-600 inline-block" /> Enviada</span>
            <span className="text-xs text-slate-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-700 inline-block" /> Raciocínio</span>
            <span className="text-xs text-amber-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-700 inline-block" /> Ferramenta</span>
            <span className="text-xs text-emerald-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-700 inline-block" /> Resultado</span>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-center p-12">
          <div>
            <MessageSquare className="w-10 h-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Selecione uma conversa para ver o raciocínio do agente</p>
          </div>
        </div>
      )}
    </div>
  );
}
