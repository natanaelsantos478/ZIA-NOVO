// ─────────────────────────────────────────────────────────────────────────────
// Organograma — Canvas interativo de agentes e cards IA
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useCallback, useEffect, useRef, createContext, useContext } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState,
  Handle, Position, MarkerType, ConnectionMode,
  BaseEdge, EdgeLabelRenderer, getBezierPath,
  type Node, type Edge, type Connection, type NodeProps, type EdgeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Plus, X, Save, Bot, Brain, Plug, MessageSquare, MessageCircle, Send,
  ArrowRight, Trash2, ChevronRight,
  Globe, Layers, Zap, Link, Check, Lock, Eye, EyeOff, KeyRound,
  User, Loader2, RefreshCw, Wrench,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { getTenantIds, getTenantId } from '../../../lib/auth';
import { useProfiles } from '../../../context/ProfileContext';
import IAMemoria from './IAMemoria';

// ── Context para comunicação entre edge e componente pai ──────────────────────
const OrganoCtx = createContext<{ openChat: (id: string) => void }>({ openChat: () => {} });

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface AgentData {
  id: string;
  nome: string;
  avatar_emoji: string;
  tipo: string;
  status: string;
  api_code?: string;
  funcao?: string;
  nos_entrada: No[];
  nos_saida: No[];
  [key: string]: unknown;
}

interface CardData {
  id: string;
  nome: string;
  tipo: string;
  ativo: boolean;
  config: Record<string, unknown>;
  __isCard: true;
  [key: string]: unknown;
}

interface No {
  id: string;
  tipo: 'entrada' | 'saida';
  subtipo: 'memoria' | 'api_externa' | 'modulo_interno' | 'whatsapp' | 'agente' | 'webhook_saida';
  nome: string;
  instrucoes?: string;
  config: Record<string, unknown>;
  ativo: boolean;
  posicao?: number;
}

// ── Cores dos nós por subtipo ─────────────────────────────────────────────────

const NO_CORES: Record<string, string> = {
  memoria:         'bg-emerald-500',
  modulo_interno:  'bg-gray-500',
  whatsapp:        'bg-green-500',
  api_externa:     'bg-orange-500',
  agente:          'bg-gray-400',
  webhook_saida:   'bg-amber-500',
};

const NO_ICON: Record<string, React.ElementType> = {
  memoria:        Brain,
  modulo_interno: Layers,
  whatsapp:       MessageSquare,
  api_externa:    Globe,
  agente:         Bot,
  webhook_saida:  Zap,
};

// ── AgentNode — card customizado ──────────────────────────────────────────────

function AgentNode({ data, selected }: NodeProps) {
  const agent = data as AgentData;
  const entradas = (agent.nos_entrada ?? []).filter((n: No) => n.ativo);
  const saidas   = (agent.nos_saida   ?? []).filter((n: No) => n.ativo);

  return (
    <div className={`
      relative bg-white rounded-2xl border-2 min-w-[260px] shadow-lg
      transition-all duration-150
      ${selected ? 'border-gray-900 shadow-gray-400/20' : 'border-gray-300 hover:border-gray-600'}
    `}>
      <Handle type="target" position={Position.Left}
        className="!w-4 !h-4 !bg-gray-900 !border-2 !border-white !rounded-full" />

      <div className="px-4 pt-4 pb-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gray-200 border border-gray-300 flex items-center justify-center shrink-0">
          <Bot className="w-4 h-4 text-gray-700" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-gray-900 text-sm truncate">{agent.nome}</div>
          <div className="text-xs text-gray-500 mt-0.5">{agent.tipo}</div>
        </div>
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${agent.status === 'ativo' ? 'bg-green-500' : 'bg-gray-300'}`} />
      </div>

      {agent.api_code && (
        <div className="mx-4 mb-3 px-2 py-0.5 rounded bg-gray-100 border border-gray-200 text-gray-700 text-xs font-mono w-fit">
          {agent.api_code}
        </div>
      )}

      {(entradas.length > 0 || saidas.length > 0) && (
        <div className="border-t border-gray-200 px-4 py-2 flex justify-between gap-2">
          <div className="flex flex-col gap-1.5">
            {entradas.slice(0, 5).map((n: No) => {
              const Icon = NO_ICON[n.subtipo] ?? Plug;
              return (
                <div key={n.id} className="flex items-center gap-1.5" title={n.nome}>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${NO_CORES[n.subtipo] ?? 'bg-gray-400'}`} />
                  <Icon className="w-3 h-3 text-gray-500 flex-shrink-0" />
                  <span className="text-xs text-gray-500 truncate max-w-[80px]">{n.nome}</span>
                </div>
              );
            })}
            {entradas.length > 5 && <div className="text-xs text-gray-400">+{entradas.length - 5}</div>}
          </div>
          {entradas.length > 0 && saidas.length > 0 && (
            <ArrowRight className="w-4 h-4 text-gray-400 self-center flex-shrink-0" />
          )}
          <div className="flex flex-col gap-1.5 items-end">
            {saidas.slice(0, 5).map((n: No) => {
              const Icon = NO_ICON[n.subtipo] ?? Plug;
              return (
                <div key={n.id} className="flex items-center gap-1.5" title={n.nome}>
                  <span className="text-xs text-gray-500 truncate max-w-[80px]">{n.nome}</span>
                  <Icon className="w-3 h-3 text-gray-500 flex-shrink-0" />
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${NO_CORES[n.subtipo] ?? 'bg-gray-400'}`} />
                </div>
              );
            })}
            {saidas.length > 5 && <div className="text-xs text-gray-400">+{saidas.length - 5}</div>}
          </div>
        </div>
      )}

      <Handle type="source" position={Position.Right}
        className="!w-4 !h-4 !bg-gray-900 !border-2 !border-white !rounded-full" />
    </div>
  );
}

// ── CardNode — nó de card de integração ──────────────────────────────────────

const CARD_TIPO_INFO: Record<string, { Icon: React.ElementType; label: string }> = {
  web_search: { Icon: Globe,  label: 'Pesquisa Web' },
  memoria:    { Icon: Brain,  label: 'Memória'      },
};

function CardNode({ data, selected }: NodeProps) {
  const card = data as CardData;
  const ti = CARD_TIPO_INFO[card.tipo] ?? CARD_TIPO_INFO['web_search'];

  return (
    <div className={`
      relative bg-gray-100 rounded-2xl border-2 min-w-[200px] shadow-lg
      transition-all duration-150
      ${selected ? 'border-gray-900' : 'border-gray-400 hover:border-gray-700'}
    `}>
      <Handle type="target" position={Position.Left}
        className="!w-4 !h-4 !bg-gray-600 !border-2 !border-white !rounded-full" />

      <div className="px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-gray-200 border border-gray-300 flex items-center justify-center shrink-0">
          <ti.Icon className="w-4 h-4 text-gray-700" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-gray-900 text-sm truncate">{card.nome}</div>
          <div className="text-xs text-gray-500 mt-0.5">Card · {ti.label}</div>
        </div>
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${card.ativo ? 'bg-green-500' : 'bg-gray-300'}`} />
      </div>

      <Handle type="source" position={Position.Right}
        className="!w-4 !h-4 !bg-gray-600 !border-2 !border-white !rounded-full" />
    </div>
  );
}

// ── AgentConnectionEdge — edge customizada com botão de chat ──────────────────

function AgentConnectionEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, markerEnd, style,
}: EdgeProps) {
  const { openChat } = useContext(OrganoCtx);
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition,
  });

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <button
            className="w-8 h-8 bg-white rounded-full border-2 border-gray-400 shadow-md hover:shadow-lg hover:border-gray-700 flex items-center justify-center transition-all"
            onClick={(e) => { e.stopPropagation(); openChat(id); }}
            title="Abrir chat desta conexão"
          >
            <MessageCircle className="w-4 h-4 text-gray-700" />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

const NODE_TYPES = { agente: AgentNode, card: CardNode };
const EDGE_TYPES = { agentConnection: AgentConnectionEdge };

// ── Mini-modal de confirmação de senha gestor ─────────────────────────────────

interface SenhaGestorModalProps {
  onConfirmed: () => void;
  onCancel: () => void;
}

function SenhaGestorModal({ onConfirmed, onCancel }: SenhaGestorModalProps) {
  const [senha, setSenha]     = useState('');
  const [show, setShow]       = useState(false);
  const [erro, setErro]       = useState('');
  const [loading, setLoading] = useState(false);

  async function confirmar() {
    if (!senha) return;
    setLoading(true);
    setErro('');
    try {
      const { data, error } = await supabase.functions.invoke('gestor-auth', {
        body: { password: senha },
      });
      if (error || !data?.ok) {
        setErro(data?.error ?? 'Senha incorreta');
        setLoading(false);
        return;
      }
      onConfirmed();
    } catch {
      setErro('Falha ao validar senha');
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
      <div className="bg-slate-800 rounded-2xl p-6 w-[340px] shadow-2xl border border-slate-700 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-violet-700/30 flex items-center justify-center flex-shrink-0">
            <KeyRound className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-100">Confirmar identidade</p>
            <p className="text-xs text-slate-400">Digite a senha gestor para editar o código de API.</p>
          </div>
        </div>
        <div className="relative">
          <input
            type={show ? 'text' : 'password'}
            value={senha}
            onChange={e => setSenha(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && confirmar()}
            placeholder="Senha gestor"
            autoFocus
            className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2 text-slate-100 text-sm pr-10"
          />
          <button onClick={() => setShow(p => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {erro && <p className="text-red-400 text-xs">{erro}</p>}
        <div className="flex gap-2">
          <button onClick={onCancel}
            className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-slate-200 text-sm font-semibold">
            Cancelar
          </button>
          <button onClick={confirmar} disabled={loading || !senha}
            className="flex-1 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-xl text-white text-sm font-semibold">
            {loading ? 'Validando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── CardPainel — painel lateral de um card ────────────────────────────────────

interface CardPainelProps {
  card: CardData;
  tenantId: string;
  onClose: () => void;
  onSaved: () => void;
}

const CARD_PAINEL_INFO: Record<string, {
  Icon: React.ElementType;
  iconBg: string; iconBorder: string; iconText: string;
  infoBg: string; infoBorder: string; infoText: string;
  titulo: string; desc: string;
}> = {
  web_search: {
    Icon: Globe,
    iconBg: 'bg-blue-500/15', iconBorder: 'border-blue-500/30', iconText: 'text-blue-400',
    infoBg: 'bg-blue-500/5', infoBorder: 'border-blue-500/20', infoText: 'text-blue-400',
    titulo: 'Pesquisa Web Google',
    desc: 'Permite que agentes pesquisem na internet via Serper. Conecte ao agente arrastando a cordinha.',
  },
  memoria: {
    Icon: Brain,
    iconBg: 'bg-violet-500/15', iconBorder: 'border-violet-500/30', iconText: 'text-violet-400',
    infoBg: 'bg-violet-500/5', infoBorder: 'border-violet-500/20', infoText: 'text-violet-400',
    titulo: 'Memória do Agente',
    desc: 'Memória persistente com 11 pastas organizadas (leis, personalidade, conversas, pesquisas…). Conecte ao agente arrastando a cordinha.',
  },
};

function CardPainel({ card, tenantId: _tenantId, onClose, onSaved }: CardPainelProps) {
  const [nome, setNome]   = useState(card.nome);
  const [ativo, setAtivo] = useState(card.ativo);
  const [saving, setSaving] = useState(false);

  const pi = CARD_PAINEL_INFO[card.tipo as string] ?? CARD_PAINEL_INFO['web_search'];

  async function salvar() {
    setSaving(true);
    await supabase.from('ia_cards').update({ nome: nome.trim(), ativo }).eq('id', card.id);
    setSaving(false);
    onSaved();
  }

  async function deletar() {
    if (!confirm('Excluir este card? Todas as conexões com agentes serão removidas.')) return;
    await supabase.from('ia_agent_cards').delete().eq('card_id', card.id);
    await supabase.from('ia_cards').delete().eq('id', card.id);
    onClose();
    onSaved();
  }

  return (
    <div className="w-[360px] flex-shrink-0 bg-slate-900 border-l border-slate-700 flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg ${pi.iconBg} border ${pi.iconBorder} flex items-center justify-center`}>
            <pi.Icon className={`w-3.5 h-3.5 ${pi.iconText}`} />
          </div>
          <span className="font-semibold text-slate-100 text-sm truncate max-w-[240px]">{card.nome}</span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
        <div>
          <p className="text-xs text-slate-500 mb-3 leading-relaxed">
            Cards são integrações conectadas a agentes. Arraste do handle do card até um agente para criar a conexão (cordinha).
          </p>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Nome do card</label>
          <input value={nome} onChange={e => setNome(e.target.value)}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm" />
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={ativo} onChange={e => setAtivo(e.target.checked)}
              className="rounded" />
            <span className="text-sm text-slate-300">Ativo</span>
          </label>
        </div>

        <div className={`${pi.infoBg} border ${pi.infoBorder} rounded-xl p-3`}>
          <p className={`text-xs font-semibold ${pi.infoText} mb-1`}>{pi.titulo}</p>
          <p className="text-xs text-slate-400 leading-relaxed">{pi.desc}</p>
        </div>

        <button onClick={salvar} disabled={saving || !nome.trim()}
          className="w-full py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg text-white text-sm font-semibold flex items-center justify-center gap-2">
          {saving ? <Zap className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar
        </button>

        <button onClick={deletar}
          className="w-full py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-800/40 rounded-lg text-red-400 text-sm font-semibold flex items-center justify-center gap-2">
          <Trash2 className="w-4 h-4" /> Excluir card
        </button>
      </div>
    </div>
  );
}

// ── Painel lateral de detalhes do agente ──────────────────────────────────────

interface AgentePainelProps {
  agente: AgentData;
  isGestor: boolean;
  tenantId: string;
  onClose: () => void;
  onSaved: () => void;
}

type AbaId = 'identidade' | 'memoria' | 'nos-entrada' | 'nos-saida' | 'conexoes' | 'chat';

function AgentePainel({ agente, isGestor, tenantId, onClose, onSaved }: AgentePainelProps) {
  const [aba, setAba] = useState<AbaId>('identidade');
  const [saving, setSaving] = useState(false);
  const [erroNos, setErroNos] = useState('');

  const [nome, setNome]               = useState(agente.nome);
  const emoji                         = agente.avatar_emoji || '🤖';
  const [tipo, setTipo]               = useState(agente.tipo || 'ESPECIALISTA');
  const [status, setStatus]           = useState(agente.status || 'ativo');
  const [apiCode, setApiCode]         = useState((agente.api_code as string) || '');
  const [apiProvider, setApiProvider] = useState((agente.api_provider as string) || 'gemini');
  const [funcao, setFuncao]           = useState((agente.system_prompt as string) || (agente.funcao as string) || '');
  const [apiCodeUnlocked, setApiCodeUnlocked] = useState(false);
  const [senhaModal, setSenhaModal]   = useState(false);

  const [indice, setIndice]         = useState('');
  const [entradas, setEntradas]     = useState<Array<{ id: string; categoria: string; conteudo: string }>>([]);
  const [memoriaId, setMemoriaId]   = useState<string | null>(null);
  const [loadingMem, setLoadingMem] = useState(false);

  const [nosEntrada, setNosEntrada] = useState<No[]>(agente.nos_entrada ?? []);
  const [nosSaida, setNosSaida]     = useState<No[]>(agente.nos_saida ?? []);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [conexoes, setConexoes] = useState<Array<{ id: string; destino_nome: string; tipo: string; frequencia: string }>>([]);
  const [loadingCon, setLoadingCon] = useState(false);

  interface WaChat { id: string; phone: string; last_message_at: string }
  interface WaMsg  { id: string; role: string; content: string | null; tool_name: string | null; tool_args: Record<string,unknown>|null; tool_result: Record<string,unknown>|null; created_at: string }
  const [waChats,      setWaChats]      = useState<WaChat[]>([]);
  const [waChatId,     setWaChatId]     = useState<string | null>(null);
  const [waMsgs,       setWaMsgs]       = useState<WaMsg[]>([]);
  const [loadingChat,  setLoadingChat]  = useState(false);
  const [expandedMsg,  setExpandedMsg]  = useState<Set<string>>(new Set());
  const [chatInput,    setChatInput]    = useState('');
  const [sendingChat,  setSendingChat]  = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const ABAS: { id: AbaId; label: string }[] = [
    { id: 'identidade',  label: 'Identidade' },
    { id: 'memoria',     label: 'Memória' },
    { id: 'nos-entrada', label: 'Entradas' },
    { id: 'nos-saida',   label: 'Saídas' },
    { id: 'conexoes',    label: 'Conexões' },
    { id: 'chat',        label: 'Chat' },
  ];

  useEffect(() => {
    if (aba !== 'memoria') return;
    setLoadingMem(true);
    supabase.from('ia_agent_memoria')
      .select('id, indice')
      .eq('agent_id', agente.id)
      .maybeSingle()
      .then(async ({ data }) => {
        if (data) {
          setMemoriaId(data.id);
          setIndice(data.indice || '');
          const { data: rows } = await supabase.from('ia_agent_memoria_entradas')
            .select('id, categoria, conteudo')
            .eq('memoria_id', data.id)
            .order('created_at');
          setEntradas((rows ?? []) as Array<{ id: string; categoria: string; conteudo: string }>);
        }
        setLoadingMem(false);
      });
  }, [aba, agente.id]);

  useEffect(() => {
    if (aba !== 'conexoes') return;
    setLoadingCon(true);
    supabase.from('ia_agent_conexoes')
      .select('id, tipo, frequencia, agent_destino_id')
      .eq('agent_origem_id', agente.id)
      .eq('tenant_id', tenantId)
      .then(async ({ data }) => {
        if (!data) { setLoadingCon(false); return; }
        const destIds = data.map(c => c.agent_destino_id);
        const { data: agentes } = await supabase.from('ia_agentes')
          .select('id, nome')
          .in('id', destIds);
        const map = Object.fromEntries((agentes ?? []).map(a => [a.id, a.nome]));
        setConexoes(data.map(c => ({
          id: c.id,
          destino_nome: map[c.agent_destino_id] ?? '?',
          tipo: c.tipo,
          frequencia: c.frequencia,
        })));
        setLoadingCon(false);
      });
  }, [aba, agente.id, tenantId]);

  useEffect(() => {
    if (aba !== 'chat') return;
    setLoadingChat(true);
    supabase.from('wa_agent_chats')
      .select('id, phone, last_message_at')
      .eq('agent_id', agente.id)
      .order('last_message_at', { ascending: false })
      .then(({ data }) => {
        const rows = (data ?? []) as WaChat[];
        setWaChats(rows);
        if (rows.length > 0 && !waChatId) setWaChatId(rows[0].id);
        setLoadingChat(false);
      });
  }, [aba, agente.id]);

  useEffect(() => {
    if (aba !== 'chat') return;

    const reloadChats = () =>
      supabase.from('wa_agent_chats')
        .select('id, phone, last_message_at')
        .eq('agent_id', agente.id)
        .order('last_message_at', { ascending: false })
        .then(({ data }) => {
          const rows = (data ?? []) as WaChat[];
          setWaChats(rows);
          setWaChatId(prev => prev ?? (rows[0]?.id ?? null));
        });

    const channel = supabase
      .channel(`wa-chats-agent-${agente.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'wa_agent_chats', filter: `agent_id=eq.${agente.id}` },
        () => reloadChats(),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'wa_agent_chats', filter: `agent_id=eq.${agente.id}` },
        () => reloadChats(),
      )
      .subscribe();

    // Poll chat list every 15s so new chats appear even if realtime dies
    const poll = setInterval(reloadChats, 15_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [aba, agente.id]);

  useEffect(() => {
    if (!waChatId) return;

    const loadMsgs = () =>
      supabase.from('wa_agent_chat_messages')
        .select('id, role, content, tool_name, tool_args, tool_result, created_at')
        .eq('chat_id', waChatId)
        .order('created_at', { ascending: true })
        .then(({ data }) => {
          setWaMsgs((data ?? []) as WaMsg[]);
          setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
        });

    loadMsgs();

    const channel = supabase
      .channel(`wa-chat-${waChatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'wa_agent_chat_messages', filter: `chat_id=eq.${waChatId}` },
        (payload) => {
          const newMsg = payload.new as WaMsg;
          setWaMsgs(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          if (newMsg.role === 'reply') {
            setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
          }
        }
      )
      .subscribe();

    // Poll every 15s as fallback when realtime disconnects
    const poll = setInterval(loadMsgs, 15_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [waChatId]);

  function toggleExpand(id: string) {
    setExpandedMsg(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function enviarMensagemDireta() {
    const msg = chatInput.trim();
    if (!msg || sendingChat) return;
    setChatInput('');
    setSendingChat(true);
    const sessionId = waChatId
      ? (waChats.find(c => c.id === waChatId)?.phone ?? 'user_direto')
      : 'user_direto';
    try {
      await supabase.functions.invoke('ia-agent-runner', {
        body: { agent_id: agente.id, tenant_id: tenantId, session_id: sessionId, message: msg },
      });
    } catch (e) {
      console.error('[AgentePainel] enviar error:', e);
    }
    setSendingChat(false);
  }

  async function iniciarChatDireto() {
    setSendingChat(true);
    try {
      await supabase.functions.invoke('ia-agent-runner', {
        body: { agent_id: agente.id, tenant_id: tenantId, session_id: 'user_direto', message: 'Olá' },
      });
    } catch (e) {
      console.error('[AgentePainel] iniciarChat error:', e);
    }
    setSendingChat(false);
  }

  async function salvarIdentidade() {
    setSaving(true);
    await supabase.from('ia_agentes').update({
      nome, avatar_emoji: emoji, tipo, status,
      api_code: apiCode || null,
      api_provider: apiProvider || null,
      funcao,
      system_prompt: funcao,
    }).eq('id', agente.id);
    setSaving(false);
    onSaved();
  }

  async function salvarIndice() {
    if (memoriaId) {
      await supabase.from('ia_agent_memoria').update({ indice, updated_at: new Date().toISOString() }).eq('id', memoriaId);
    } else {
      const { data } = await supabase.from('ia_agent_memoria')
        .insert({ agent_id: agente.id, tenant_id: tenantId, indice })
        .select('id').single();
      if (data) setMemoriaId(data.id);
    }
  }

  async function adicionarEntrada() {
    let mId = memoriaId;
    if (!mId) {
      const { data } = await supabase.from('ia_agent_memoria')
        .insert({ agent_id: agente.id, tenant_id: tenantId, indice })
        .select('id').single();
      mId = data?.id ?? null;
      if (mId) setMemoriaId(mId);
    }
    if (!mId) return;
    const { data } = await supabase.from('ia_agent_memoria_entradas')
      .insert({ memoria_id: mId, agent_id: agente.id, tenant_id: tenantId, categoria: 'geral', conteudo: '' })
      .select('id, categoria, conteudo').single();
    if (data) setEntradas(prev => [...prev, data]);
  }

  async function removerEntrada(id: string) {
    await supabase.from('ia_agent_memoria_entradas').delete().eq('id', id);
    setEntradas(prev => prev.filter(e => e.id !== id));
  }

  async function salvarNos(lista: No[], tipo: 'entrada' | 'saida') {
    setErroNos('');
    setSaving(true);
    const { error: delErr } = await supabase.from('ia_agent_nos').delete()
      .eq('agent_id', agente.id).eq('tipo', tipo).eq('tenant_id', tenantId);
    if (delErr) { setErroNos(`Erro ao limpar: ${delErr.message}`); setSaving(false); return; }
    if (lista.length > 0) {
      const rows = lista.map((n, i) => ({
        agent_id: agente.id, tenant_id: tenantId, tipo, subtipo: n.subtipo,
        posicao: i, nome: n.nome || '(sem nome)', instrucoes: n.instrucoes ?? null,
        config: n.config ?? {}, ativo: n.ativo,
      }));
      const { error: insErr } = await supabase.from('ia_agent_nos').insert(rows);
      if (insErr) { setErroNos(`Erro ao salvar: ${insErr.message}`); setSaving(false); return; }
    }
    setSaving(false);
    onSaved();
  }

  function adicionarNo(tipo: 'entrada' | 'saida') {
    const novo: No = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      tipo, subtipo: tipo === 'entrada' ? 'memoria' : 'whatsapp',
      nome: '', instrucoes: '', config: {}, ativo: true,
    };
    if (tipo === 'entrada') setNosEntrada(prev => [...prev, novo]);
    else setNosSaida(prev => [...prev, novo]);
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, 50);
  }

  return (
    <div className="w-[400px] flex-shrink-0 bg-slate-900 border-l border-slate-700 flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-100 text-sm truncate max-w-[280px]">{nome}</span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex border-b border-slate-700 overflow-x-auto custom-scrollbar">
        {ABAS.map(a => (
          <button key={a.id} onClick={() => setAba(a.id)}
            className={`px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
              aba === a.id
                ? 'border-violet-500 text-violet-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}>
            {a.label}
          </button>
        ))}
      </div>

      <div ref={scrollRef} className={`flex-1 overflow-y-auto custom-scrollbar ${aba === 'chat' ? '' : 'p-4 space-y-4'}`}>

        {aba === 'identidade' && (
          <>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Nome</label>
              <input value={nome} onChange={e => setNome(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Tipo</label>
              <select value={tipo} onChange={e => setTipo(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm">
                {['ORQUESTRADOR','ESPECIALISTA','ASSISTENTE','MONITOR','AUTOMACAO'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm">
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
                <option value="treinamento">Em treinamento</option>
              </select>
            </div>
            {isGestor && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Código de API</label>
                  {apiCodeUnlocked ? (
                    <div className="flex gap-2 items-center">
                      <input value={apiCode} onChange={e => setApiCode(e.target.value.toUpperCase())}
                        placeholder="ex: GEMINI_API_KEY"
                        autoFocus
                        className="flex-1 bg-slate-800 border border-violet-500 rounded-lg px-3 py-2 text-slate-100 text-sm font-mono" />
                      <button onClick={() => setApiCodeUnlocked(false)}
                        className="text-slate-500 hover:text-slate-300" title="Bloquear">
                        <Lock className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2 items-center">
                      <div className="flex-1 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-slate-400 text-sm font-mono">
                        {apiCode || '— não definido —'}
                      </div>
                      <button onClick={() => setSenhaModal(true)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-slate-300 font-medium whitespace-nowrap">
                        <Lock className="w-3.5 h-3.5" /> Alterar
                      </button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Provedor de IA</label>
                  {apiCodeUnlocked ? (
                    <select value={apiProvider} onChange={e => setApiProvider(e.target.value)}
                      className="w-full bg-slate-800 border border-violet-500 rounded-lg px-3 py-2 text-slate-100 text-sm">
                      <option value="gemini">Gemini (Google)</option>
                      <option value="openai">OpenAI (GPT-4)</option>
                      <option value="deepseek">DeepSeek</option>
                      <option value="claude">Claude (Anthropic)</option>
                      <option value="openai_compatible">OpenAI Compatible</option>
                    </select>
                  ) : (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-slate-400 text-sm">
                      {apiProvider || '— não definido —'}
                    </div>
                  )}
                </div>
              </div>
            )}
            {senhaModal && (
              <SenhaGestorModal
                onConfirmed={() => { setSenhaModal(false); setApiCodeUnlocked(true); }}
                onCancel={() => setSenhaModal(false)}
              />
            )}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Função / Prompt de sistema</label>
              <textarea rows={5} value={funcao} onChange={e => setFuncao(e.target.value)}
                placeholder="Descreva o papel e comportamento deste agente..."
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm resize-none" />
            </div>
            <button onClick={salvarIdentidade} disabled={saving}
              className="w-full py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg text-white text-sm font-semibold flex items-center justify-center gap-2">
              {saving ? <Zap className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar identidade
            </button>
            <button
              onClick={async () => {
                if (!confirm(`Excluir o agente "${nome}"? Esta ação não pode ser desfeita.`)) return;
                await supabase.from('ia_agent_cards').delete().eq('agent_id', agente.id);
                await supabase.from('ia_agent_conexoes').delete().eq('agent_origem_id', agente.id);
                await supabase.from('ia_agent_conexoes').delete().eq('agent_destino_id', agente.id);
                await supabase.from('ia_agentes').delete().eq('id', agente.id);
                onSaved();
                onClose();
              }}
              className="w-full py-2 bg-red-900/30 hover:bg-red-900/50 border border-red-700/40 rounded-lg text-red-400 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Excluir agente
            </button>
          </>
        )}

        {aba === 'memoria' && (
          <>
            {loadingMem ? (
              <div className="text-slate-400 text-sm text-center py-8">Carregando...</div>
            ) : (
              <>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Índice da memória</label>
                  <p className="text-xs text-slate-500 mb-2">
                    Descreva o que está armazenado. A IA lê isso para decidir se vale acessar a memória completa.
                  </p>
                  <textarea rows={4} value={indice} onChange={e => setIndice(e.target.value)}
                    placeholder="Ex: Preferências de comunicação de clientes, histórico de objeções comuns, melhores horários..."
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm resize-none" />
                  <button onClick={salvarIndice}
                    className="mt-2 px-3 py-1.5 bg-violet-700 hover:bg-violet-600 rounded-lg text-white text-xs font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Salvar índice
                  </button>
                </div>
                <div className="border-t border-slate-700 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-slate-300">Entradas de memória</span>
                    <button onClick={adicionarEntrada}
                      className="flex items-center gap-1 px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-300">
                      <Plus className="w-3 h-3" /> Adicionar
                    </button>
                  </div>
                  {entradas.length === 0 && (
                    <p className="text-slate-500 text-xs text-center py-4">Nenhuma entrada ainda.</p>
                  )}
                  {entradas.map(e => (
                    <div key={e.id} className="mb-3 bg-slate-800 rounded-lg p-3 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          defaultValue={e.categoria}
                          onBlur={async ev => {
                            await supabase.from('ia_agent_memoria_entradas')
                              .update({ categoria: ev.target.value }).eq('id', e.id);
                          }}
                          placeholder="Categoria"
                          className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-100 text-xs" />
                        <button onClick={() => removerEntrada(e.id)}
                          className="text-red-400 hover:text-red-300">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <textarea
                        defaultValue={e.conteudo}
                        onBlur={async ev => {
                          await supabase.from('ia_agent_memoria_entradas')
                            .update({ conteudo: ev.target.value }).eq('id', e.id);
                        }}
                        rows={3}
                        placeholder="Conteúdo da memória..."
                        className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-100 text-xs resize-none" />
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {aba === 'nos-entrada' && (
          <>
            <p className="text-xs text-slate-400">
              Canais de onde este agente pode puxar contexto/dados (máx. 10).
              Os 3 primeiros do tipo <strong>memória</strong> são as entradas diretas da memória deste agente.
            </p>
            <div className="space-y-3">
              {nosEntrada.map((n, i) => (
                <NoCard key={n.id} no={n}
                  onChange={no => setNosEntrada(prev => prev.map((x, j) => j === i ? no : x))}
                  onRemove={() => setNosEntrada(prev => prev.filter((_, j) => j !== i))} />
              ))}
            </div>
            {nosEntrada.length < 10 && (
              <button onClick={() => adicionarNo('entrada')}
                className="w-full py-2 border border-dashed border-slate-600 rounded-lg text-slate-400 hover:text-slate-200 hover:border-slate-400 text-sm flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Adicionar entrada
              </button>
            )}
            {erroNos && <p className="text-red-400 text-xs">{erroNos}</p>}
            <button onClick={() => salvarNos(nosEntrada, 'entrada')} disabled={saving}
              className="w-full py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg text-white text-sm font-semibold flex items-center justify-center gap-2">
              <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar entradas'}
            </button>
          </>
        )}

        {aba === 'nos-saida' && (
          <>
            <p className="text-xs text-slate-400">
              Canais pelos quais este agente pode emitir respostas ou acionar outros sistemas (máx. 5).
            </p>
            <div className="space-y-3">
              {nosSaida.map((n, i) => (
                <NoCard key={n.id} no={n} saidaMode
                  onChange={no => setNosSaida(prev => prev.map((x, j) => j === i ? no : x))}
                  onRemove={() => setNosSaida(prev => prev.filter((_, j) => j !== i))} />
              ))}
            </div>
            {nosSaida.length < 5 && (
              <button onClick={() => adicionarNo('saida')}
                className="w-full py-2 border border-dashed border-slate-600 rounded-lg text-slate-400 hover:text-slate-200 hover:border-slate-400 text-sm flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Adicionar saída
              </button>
            )}
            {erroNos && <p className="text-red-400 text-xs">{erroNos}</p>}
            <button onClick={() => salvarNos(nosSaida, 'saida')} disabled={saving}
              className="w-full py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg text-white text-sm font-semibold flex items-center justify-center gap-2">
              <Save className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar saídas'}
            </button>
          </>
        )}

        {aba === 'conexoes' && (
          <>
            <p className="text-xs text-slate-400">
              Agentes com os quais este agente se conecta. Para criar conexões, use o canvas: arraste do handle de saída de um card até outro.
            </p>
            {loadingCon ? (
              <div className="text-slate-400 text-sm text-center py-8">Carregando...</div>
            ) : conexoes.length === 0 ? (
              <div className="text-slate-500 text-sm text-center py-8">Nenhuma conexão ainda.</div>
            ) : (
              <div className="space-y-2">
                {conexoes.map(c => (
                  <div key={c.id} className="flex items-center gap-3 bg-slate-800 rounded-lg px-3 py-2">
                    <ChevronRight className="w-4 h-4 text-violet-400" />
                    <div className="flex-1">
                      <div className="text-sm text-slate-200 font-medium">{c.destino_nome}</div>
                      <div className="text-xs text-slate-400">{c.tipo} · {c.frequencia}</div>
                    </div>
                    <button onClick={async () => {
                      await supabase.from('ia_agent_conexoes').delete().eq('id', c.id);
                      setConexoes(prev => prev.filter(x => x.id !== c.id));
                    }} className="text-red-400 hover:text-red-300">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {aba === 'chat' && (
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-700 flex-shrink-0">
              {waChats.length === 0 && !loadingChat ? (
                <button
                  onClick={iniciarChatDireto}
                  disabled={sendingChat}
                  className="flex-1 py-1.5 bg-violet-700 hover:bg-violet-600 disabled:opacity-50 rounded-lg text-xs text-white font-semibold flex items-center justify-center gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> Iniciar conversa direta
                </button>
              ) : (
                <select
                  value={waChatId ?? ''}
                  onChange={e => setWaChatId(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-violet-500"
                >
                  {waChats.map(c => (
                    <option key={c.id} value={c.id}>{c.phone}</option>
                  ))}
                </select>
              )}
              <button
                onClick={() => {
                  setLoadingChat(true);
                  supabase.from('wa_agent_chats').select('id, phone, last_message_at').eq('agent_id', agente.id).order('last_message_at', { ascending: false })
                    .then(({ data }) => {
                      const rows = (data ?? []) as WaChat[];
                      setWaChats(rows);
                      if (rows.length > 0 && !waChatId) setWaChatId(rows[0].id);
                      setLoadingChat(false);
                    });
                  if (waChatId) {
                    supabase.from('wa_agent_chat_messages').select('id, role, content, tool_name, tool_args, tool_result, created_at').eq('chat_id', waChatId).order('created_at', { ascending: true })
                      .then(({ data }) => { setWaMsgs((data ?? []) as WaMsg[]); setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80); });
                  }
                }}
                className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-300 flex-shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3 space-y-2">
              {loadingChat ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-slate-600 animate-spin" /></div>
              ) : waMsgs.length === 0 ? (
                <p className="text-xs text-slate-600 text-center py-8">
                  {waChats.length === 0 ? 'Nenhuma conversa WhatsApp ainda' : 'Sem mensagens nesta conversa'}
                </p>
              ) : (
                waMsgs.map(msg => {
                  const isExpanded = expandedMsg.has(msg.id);
                  if (msg.role === 'user') return (
                    <div key={msg.id} className="flex items-start gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <User className="w-2.5 h-2.5 text-slate-400" />
                      </div>
                      <div className="max-w-[78%] bg-slate-800 rounded-2xl rounded-tl-sm px-3 py-1.5 text-slate-200 text-xs leading-relaxed">
                        {msg.content}
                      </div>
                    </div>
                  );
                  if (msg.role === 'reply') return (
                    <div key={msg.id} className="flex items-start gap-1.5 justify-end">
                      <div className="max-w-[78%] bg-violet-600 rounded-2xl rounded-tr-sm px-3 py-1.5 text-white text-xs leading-relaxed">
                        {msg.content}
                      </div>
                      <div className="w-5 h-5 rounded-full bg-violet-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bot className="w-2.5 h-2.5 text-violet-200" />
                      </div>
                    </div>
                  );
                  if (msg.role === 'thought') return (
                    <div key={msg.id} className="flex justify-center">
                      <div className="max-w-[90%] bg-slate-900 border border-slate-700/50 rounded-lg px-2.5 py-1.5">
                        <p className="text-[10px] text-slate-500 font-medium mb-0.5">raciocínio</p>
                        <p className="text-xs text-slate-400 italic leading-relaxed">{msg.content}</p>
                      </div>
                    </div>
                  );
                  if (msg.role === 'tool_call') return (
                    <div key={msg.id} className="flex justify-center">
                      <div className="max-w-[90%] bg-amber-950/40 border border-amber-800/40 rounded-lg px-2.5 py-1.5">
                        <p className="text-[10px] text-amber-400 font-medium flex items-center gap-1 mb-0.5">
                          <Wrench className="w-2.5 h-2.5" /> {msg.tool_name}
                        </p>
                        {msg.tool_args && (
                          <button onClick={() => toggleExpand(msg.id)} className="text-[10px] text-amber-600 hover:text-amber-400 flex items-center gap-0.5">
                            <ChevronRight className={`w-2.5 h-2.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            {isExpanded ? 'ocultar' : 'args'}
                          </button>
                        )}
                        {isExpanded && msg.tool_args && (
                          <pre className="mt-1 text-[10px] text-amber-300/70 font-mono bg-black/30 rounded p-1.5 overflow-x-auto max-h-32">{JSON.stringify(msg.tool_args, null, 2)}</pre>
                        )}
                      </div>
                    </div>
                  );
                  if (msg.role === 'tool_result') return (
                    <div key={msg.id} className="flex justify-center">
                      <div className="max-w-[90%] bg-emerald-950/40 border border-emerald-800/40 rounded-lg px-2.5 py-1.5">
                        <p className="text-[10px] text-emerald-400 font-medium flex items-center gap-1 mb-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> resultado: {msg.tool_name}
                        </p>
                        {msg.tool_result && (
                          <button onClick={() => toggleExpand(msg.id)} className="text-[10px] text-emerald-600 hover:text-emerald-400 flex items-center gap-0.5">
                            <ChevronRight className={`w-2.5 h-2.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            {isExpanded ? 'ocultar' : 'ver'}
                          </button>
                        )}
                        {isExpanded && msg.tool_result && (
                          <pre className="mt-1 text-[10px] text-emerald-300/70 font-mono bg-black/30 rounded p-1.5 overflow-x-auto max-h-32">{JSON.stringify(msg.tool_result, null, 2)}</pre>
                        )}
                      </div>
                    </div>
                  );
                  if (msg.role === 'assistant') return (
                    <div key={msg.id} className="flex justify-center">
                      <p className="text-[10px] text-slate-700 italic">{msg.content}</p>
                    </div>
                  );
                  return null;
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {waChatId && (
              <div className="flex-shrink-0 border-t border-slate-700 px-3 py-2 flex items-end gap-2">
                <textarea
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviarMensagemDireta(); }
                  }}
                  placeholder="Mensagem para o agente..."
                  rows={1}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:border-violet-500 max-h-24 overflow-y-auto"
                  style={{ minHeight: '32px' }}
                />
                <button
                  onClick={enviarMensagemDireta}
                  disabled={!chatInput.trim() || sendingChat}
                  className="w-8 h-8 flex items-center justify-center bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl flex-shrink-0 transition-colors"
                >
                  {sendingChat
                    ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                    : <Send className="w-3.5 h-3.5 text-white" />}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── NoCard — card de configuração de um nó ────────────────────────────────────

interface NoCardProps {
  no: No;
  saidaMode?: boolean;
  onChange: (no: No) => void;
  onRemove: () => void;
}

const SUBTIPOS_ENTRADA = ['memoria','api_externa','modulo_interno','whatsapp','agente'] as const;
const SUBTIPOS_SAIDA   = ['whatsapp','agente','webhook_saida','modulo_interno'] as const;

function NoCard({ no, saidaMode, onChange, onRemove }: NoCardProps) {
  const subtipos = saidaMode ? SUBTIPOS_SAIDA : SUBTIPOS_ENTRADA;
  const Icon = NO_ICON[no.subtipo] ?? Plug;

  return (
    <div className="bg-slate-800 rounded-lg p-3 space-y-2 border border-slate-700">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${NO_CORES[no.subtipo] ?? 'bg-slate-400'}`} />
        <Icon className="w-3.5 h-3.5 text-slate-400" />
        <select value={no.subtipo}
          onChange={e => onChange({ ...no, subtipo: e.target.value as No['subtipo'] })}
          className="flex-1 bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-100 text-xs">
          {subtipos.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
        </select>
        <button onClick={onRemove} className="text-red-400 hover:text-red-300 ml-1">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <input value={no.nome} onChange={e => onChange({ ...no, nome: e.target.value })}
        placeholder="Nome do nó (ex: Memória de clientes)"
        className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-100 text-xs" />
      <textarea value={no.instrucoes ?? ''} onChange={e => onChange({ ...no, instrucoes: e.target.value })}
        rows={2} placeholder="Instrução para a IA sobre quando/como usar este nó..."
        className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-100 text-xs resize-none" />
      {(no.subtipo === 'api_externa' || no.subtipo === 'webhook_saida') && (
        <input
          value={(no.config as { url?: string }).url ?? ''}
          onChange={e => onChange({ ...no, config: { ...no.config, url: e.target.value } })}
          placeholder="URL"
          className="w-full bg-slate-700 border border-slate-600 rounded px-2 py-1 text-slate-100 text-xs" />
      )}
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={no.ativo} onChange={e => onChange({ ...no, ativo: e.target.checked })}
          className="rounded" />
        <span className="text-xs text-slate-400">Ativo</span>
      </label>
    </div>
  );
}

// ── Modal de nova conexão agente↔agente ───────────────────────────────────────

interface ConexaoModalProps {
  origemNome: string;
  destinoNome: string;
  tenantId: string;
  origemId: string;
  destinoId: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConexaoModal({ origemNome, destinoNome, tenantId, origemId, destinoId, onConfirm, onCancel }: ConexaoModalProps) {
  const [tipo, setTipo]           = useState<'consulta' | 'permissao'>('consulta');
  const [frequencia, setFrequencia] = useState<'sempre' | 'esporadica'>('esporadica');
  const [instrucoes, setInstrucoes] = useState('');
  const [saving, setSaving]       = useState(false);
  const [erroSave, setErroSave]   = useState('');

  async function confirmar() {
    setSaving(true);
    setErroSave('');
    // Use insert; on duplicate key conflict (23505) do an update instead
    const payload = {
      agent_origem_id: origemId, agent_destino_id: destinoId,
      tenant_id: tenantId, tipo, frequencia,
      instrucoes: instrucoes.trim() || null, ativo: true,
    };
    const { error: insErr } = await supabase.from('ia_agent_conexoes').insert(payload);
    if (insErr) {
      if ((insErr as { code?: string }).code === '23505') {
        // Connection already exists — update it
        const { error: updErr } = await supabase
          .from('ia_agent_conexoes')
          .update({ tipo, frequencia, instrucoes: instrucoes.trim() || null, ativo: true })
          .eq('agent_origem_id', origemId)
          .eq('agent_destino_id', destinoId);
        if (updErr) { setSaving(false); setErroSave(`Erro ao atualizar: ${updErr.message}`); return; }
      } else {
        setSaving(false);
        setErroSave(`Erro ao salvar: ${insErr.message} (${(insErr as { code?: string }).code})`);
        return;
      }
    }
    setSaving(false);
    if (error) { setErroSave(`Erro ao salvar: ${error.message}`); return; }
    onConfirm();
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-2xl p-6 w-[440px] shadow-2xl border border-slate-700">
        <h3 className="text-lg font-bold text-slate-100 mb-1">Nova conexão</h3>
        <p className="text-sm text-slate-400 mb-5">
          <span className="text-violet-300 font-medium">{origemNome}</span>
          {' → '}
          <span className="text-violet-300 font-medium">{destinoNome}</span>
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Tipo de conexão</label>
            <div className="grid grid-cols-2 gap-2">
              {(['consulta','permissao'] as const).map(t => (
                <button key={t} onClick={() => setTipo(t)}
                  className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                    tipo === t
                      ? 'bg-violet-600 border-violet-500 text-white'
                      : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-violet-500/50'
                  }`}>
                  {t === 'consulta' ? '↔ Consulta' : '↑ Permissão'}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {tipo === 'consulta'
                ? 'Agente pode perguntar algo ao destino para tomar decisão.'
                : 'Agente destino tem autoridade sobre este agente.'}
            </p>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Frequência</label>
            <select value={frequencia} onChange={e => setFrequencia(e.target.value as 'sempre' | 'esporadica')}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm">
              <option value="sempre">Sempre (em toda interação)</option>
              <option value="esporadica">Esporádica (quando necessário)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Instrução (opcional)</label>
            <textarea rows={2} value={instrucoes} onChange={e => setInstrucoes(e.target.value)}
              placeholder="Quando e como usar esta conexão..."
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm resize-none" />
          </div>
        </div>
        {erroSave && <p className="text-xs text-red-400 mt-3">{erroSave}</p>}
        <div className="flex gap-3 mt-4">
          <button onClick={onCancel}
            className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200 text-sm font-semibold">
            Cancelar
          </button>
          <button onClick={confirmar} disabled={saving}
            className="flex-1 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg text-white text-sm font-semibold flex items-center justify-center gap-2">
            <Link className="w-4 h-4" /> {saving ? 'Conectando…' : 'Conectar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal de criar agente ─────────────────────────────────────────────────────

interface CriarAgenteModalProps {
  tenantId: string;
  onCreated: (id: string) => void;
  onCancel: () => void;
}

function CriarAgenteModal({ tenantId, onCreated, onCancel }: CriarAgenteModalProps) {
  const [nome, setNome]     = useState('');
  const emoji = '🤖';
  const [tipo, setTipo]     = useState('ESPECIALISTA');
  const [funcao, setFuncao] = useState('');
  const [saving, setSaving] = useState(false);
  const [erro, setErro]     = useState('');

  async function criar() {
    if (!nome.trim()) return;
    setErro('');
    setSaving(true);
    const tid = tenantId || getTenantId();
    const { data, error } = await supabase.from('ia_agentes').insert({
      tenant_id: tid, nome, avatar_emoji: emoji, tipo,
      funcao: funcao || 'Agente de IA', status: 'ativo', pos_x: 200, pos_y: 200,
    }).select('id').single();
    setSaving(false);
    if (error) { setErro(error.message); return; }
    if (data) onCreated(data.id);
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-2xl p-6 w-[440px] shadow-2xl border border-slate-700">
        <h3 className="text-lg font-bold text-slate-100 mb-5">Novo agente</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Nome *</label>
            <input value={nome} onChange={e => setNome(e.target.value)}
              placeholder="Ex: Agente de Vendas"
              autoFocus
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Tipo</label>
            <select value={tipo} onChange={e => setTipo(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm">
              {['ORQUESTRADOR','ESPECIALISTA','ASSISTENTE','MONITOR','AUTOMACAO','EXTERNO'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Função do agente</label>
            <textarea rows={3} value={funcao} onChange={e => setFuncao(e.target.value)}
              placeholder="Descreva o papel deste agente..."
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm resize-none" />
          </div>
        </div>
        {erro && <p className="text-red-400 text-xs mt-1">{erro}</p>}
        <div className="flex gap-3 mt-4">
          <button onClick={onCancel}
            className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200 text-sm font-semibold">
            Cancelar
          </button>
          <button onClick={criar} disabled={saving || !nome.trim()}
            className="flex-1 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg text-white text-sm font-semibold flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> {saving ? 'Criando...' : 'Criar agente'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal de criar card ───────────────────────────────────────────────────────

interface CriarCardModalProps {
  tenantId: string;
  onCreated: () => void;
  onCancel: () => void;
}

function CriarCardModal({ tenantId, onCreated, onCancel }: CriarCardModalProps) {
  const [nome, setNome]     = useState('Pesquisa Web Google');
  const [tipo, setTipo]     = useState<'web_search' | 'memoria'>('web_search');
  const [saving, setSaving] = useState(false);
  const [erro, setErro]     = useState('');

  async function criar() {
    if (!nome.trim()) return;
    setErro('');
    setSaving(true);
    const tid = tenantId || getTenantId();
    const config = tipo === 'web_search'
      ? { provider: 'serper' }
      : { api_provider: 'deepseek', api_code: '' };
    const { error } = await supabase.from('ia_cards').insert({
      tenant_id: tid,
      tipo,
      nome: nome.trim(),
      config,
      ativo: true,
    });
    setSaving(false);
    if (error) { setErro(error.message); return; }
    onCreated();
  }

  const TIPOS = [
    { id: 'web_search', Icon: Globe,  cor: 'blue',   label: 'Pesquisa Web',       desc: 'Agentes pesquisam na internet via Serper.' },
    { id: 'memoria',    Icon: Brain,  cor: 'violet',  label: 'Memória do Agente',  desc: 'Memória persistente com 11 pastas organizadas.' },
  ] as const;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-2xl p-6 w-[440px] shadow-2xl border border-slate-700">
        <h3 className="text-lg font-bold text-slate-100 mb-5">Novo card</h3>
        <div className="space-y-4">
          {/* Seletor de tipo */}
          <div className="grid grid-cols-2 gap-2">
            {TIPOS.map(t => {
              const sel = tipo === t.id;
              return (
                <button key={t.id} onClick={() => {
                  setTipo(t.id);
                  setNome(t.id === 'web_search' ? 'Pesquisa Web Google' : 'Memória do Agente');
                }}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all ${
                    sel ? 'border-violet-500 bg-violet-500/10' : 'border-slate-600 hover:border-slate-500'
                  }`}>
                  <t.Icon className={`w-4 h-4 mt-0.5 shrink-0 ${sel ? 'text-violet-400' : 'text-slate-400'}`} />
                  <div>
                    <p className={`text-xs font-bold ${sel ? 'text-slate-100' : 'text-slate-300'}`}>{t.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-tight">{t.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Nome do card *</label>
            <input value={nome} onChange={e => setNome(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && criar()}
              placeholder="Ex: Pesquisa Web Google"
              autoFocus
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm" />
          </div>
        </div>
        {erro && <p className="text-red-400 text-xs mt-1">{erro}</p>}
        <div className="flex gap-3 mt-4">
          <button onClick={onCancel}
            className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200 text-sm font-semibold">
            Cancelar
          </button>
          <button onClick={criar} disabled={saving || !nome.trim()}
            className="flex-1 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg text-white text-sm font-semibold flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> {saving ? 'Criando...' : 'Criar card'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ConexaoChatPanel — painel de chat entre agentes conectados ────────────────

interface ConexaoChatMsg {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

function ConexaoChatPanel({ conexaoId, onClose }: { conexaoId: string; onClose: () => void }) {
  const [msgs, setMsgs] = useState<ConexaoChatMsg[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = () =>
      supabase.from('ia_conexao_mensagens')
        .select('id, role, content, created_at')
        .eq('conexao_id', conexaoId)
        .order('created_at', { ascending: true })
        .then(({ data }) => {
          setMsgs((data ?? []) as ConexaoChatMsg[]);
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
        });

    load();

    const channel = supabase.channel(`conexao-chat-${conexaoId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'ia_conexao_mensagens',
        filter: `conexao_id=eq.${conexaoId}`,
      }, (payload) => {
        const msg = payload.new as ConexaoChatMsg;
        setMsgs(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
      })
      .subscribe();

    const poll = setInterval(load, 15_000);
    return () => { supabase.removeChannel(channel); clearInterval(poll); };
  }, [conexaoId]);

  const roleLabel: Record<string, string> = {
    origem: 'Agente Origem',
    destino: 'Agente Destino',
    system: 'Sistema',
    tool_call: 'Tool Call',
    tool_result: 'Resultado',
  };

  return (
    <div className="absolute right-4 top-16 bottom-4 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-20 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-gray-700" />
          <span className="font-semibold text-gray-900 text-sm">Chat da Conexão</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
        {msgs.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-8">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="font-medium text-gray-500">Nenhuma mensagem ainda</p>
            <p className="text-xs mt-1 text-gray-400">As mensagens trocadas entre os agentes conectados aparecerão aqui.</p>
          </div>
        ) : (
          msgs.map(m => (
            <div key={m.id} className={`flex flex-col gap-0.5 ${m.role === 'origem' ? 'items-start' : m.role === 'destino' ? 'items-end' : 'items-center'}`}>
              <div className="text-xs text-gray-400">{roleLabel[m.role] ?? m.role}</div>
              <div className={`rounded-xl px-3 py-2 text-sm max-w-[90%] ${
                m.role === 'origem' ? 'bg-gray-100 text-gray-900' :
                m.role === 'destino' ? 'bg-gray-900 text-white' :
                'bg-amber-50 text-amber-900 border border-amber-200 text-xs font-mono w-full'
              }`}>
                {m.content}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

// ── Organograma principal ─────────────────────────────────────────────────────

interface OrganogramaProps {
  onNavigate: (id: string) => void;
}

// Prefixo para IDs de nós card no canvas (evita colisão com IDs de agentes)
const CARD_PREFIX = 'card::';

export default function Organograma({ onNavigate: _onNavigate }: OrganogramaProps) {
  const { activeProfile }                 = useProfiles();
  const isGestor                          = activeProfile?.level === 1;
  const [nodes, setNodes, onNodesChange]  = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange]  = useEdgesState<Edge>([]);
  const [tenantId, setTenantId]           = useState('');
  const [loading, setLoading]             = useState(true);
  const [selectedAgent, setSelectedAgent]       = useState<AgentData | null>(null);
  const [selectedCard, setSelectedCard]         = useState<CardData | null>(null);
  const [selectedCardAgentId, setSelectedCardAgentId] = useState<string | null>(null);
  const [criarAgenteOpen, setCriarAgenteOpen] = useState(false);
  const [criarCardOpen, setCriarCardOpen]     = useState(false);
  const [conexaoModal, setConexaoModal]   = useState<{
    origemId: string; origemNome: string;
    destinoId: string; destinoNome: string;
  } | null>(null);
  const [selectedConexaoChat, setSelectedConexaoChat] = useState<string | null>(null);
  const openConexaoChat = useCallback((conexaoId: string) => setSelectedConexaoChat(conexaoId), []);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const ids = getTenantIds();
    const tid = ids[0] ?? '';
    setTenantId(tid);
    void carregar(tid);
  }, []);

  function buildCanvas(
    agentes: unknown[] | null,
    nos: unknown[] | null,
    conexoes: unknown[] | null,
    cards: unknown[] | null,
    agentCards: unknown[] | null,
  ) {
    const nosEntradaMap: Record<string, No[]> = {};
    const nosSaidaMap:   Record<string, No[]> = {};
    for (const n of (nos ?? []) as Array<{ tipo: string; agent_id: string }>) {
      const m = n.tipo === 'entrada' ? nosEntradaMap : nosSaidaMap;
      if (!m[n.agent_id]) m[n.agent_id] = [];
      m[n.agent_id].push(n as unknown as No);
    }

    const agentNodes: Node[] = ((agentes ?? []) as Array<{ id: string; pos_x?: number; pos_y?: number }>).map(a => ({
      id: a.id,
      type: 'agente',
      position: { x: a.pos_x ?? 100, y: a.pos_y ?? 100 },
      data: {
        ...a,
        nos_entrada: (nosEntradaMap[a.id] ?? []).sort((x, y) => (x.posicao ?? 0) - (y.posicao ?? 0)),
        nos_saida:   (nosSaidaMap[a.id]   ?? []).sort((x, y) => (x.posicao ?? 0) - (y.posicao ?? 0)),
      } as AgentData,
    }));

    const cardNodes: Node[] = ((cards ?? []) as Array<{ id: string; pos_x?: number; pos_y?: number; nome: string; tipo: string; ativo: boolean; config: Record<string, unknown> }>).map(c => ({
      id: `${CARD_PREFIX}${c.id}`,
      type: 'card',
      position: { x: c.pos_x ?? 400, y: c.pos_y ?? 200 },
      data: { ...c, __isCard: true } as CardData,
    }));

    const agentEdges: Edge[] = ((conexoes ?? []) as Array<{
      id: string; agent_origem_id: string; agent_destino_id: string; tipo: string;
    }>).map(c => ({
      id: c.id,
      source: c.agent_origem_id,
      target: c.agent_destino_id,
      type: 'agentConnection',
      animated: c.tipo === 'consulta',
      style: { stroke: '#374151', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#374151' },
    }));

    const cardEdges: Edge[] = ((agentCards ?? []) as Array<{
      id: string; card_id: string; agente_id: string;
    }>).map(ac => ({
      id: `ac-${ac.id}`,
      source: `${CARD_PREFIX}${ac.card_id}`,
      target: ac.agente_id,
      animated: true,
      style: { stroke: '#6b7280', strokeWidth: 2, strokeDasharray: '5 3' },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#6b7280' },
    }));

    setNodes([...agentNodes, ...cardNodes]);
    setEdges([...agentEdges, ...cardEdges]);
  }

  async function carregar(tid: string) {
    setLoading(true);
    const [
      { data: agentes },
      { data: nos },
      { data: conexoes },
      { data: cards },
      { data: agentCards },
    ] = await Promise.all([
      supabase.from('ia_agentes').select('*').eq('tenant_id', tid),
      supabase.from('ia_agent_nos').select('*').eq('tenant_id', tid),
      supabase.from('ia_agent_conexoes').select('*').eq('tenant_id', tid).eq('ativo', true),
      supabase.from('ia_cards').select('*').eq('tenant_id', tid),
      supabase.from('ia_agent_cards').select('*').eq('tenant_id', tid),
    ]);
    buildCanvas(agentes, nos, conexoes, cards, agentCards);
    setLoading(false);
  }

  async function recarregar(tid: string) {
    const [
      { data: agentes },
      { data: nos },
      { data: conexoes },
      { data: cards },
      { data: agentCards },
    ] = await Promise.all([
      supabase.from('ia_agentes').select('*').eq('tenant_id', tid),
      supabase.from('ia_agent_nos').select('*').eq('tenant_id', tid),
      supabase.from('ia_agent_conexoes').select('*').eq('tenant_id', tid).eq('ativo', true),
      supabase.from('ia_cards').select('*').eq('tenant_id', tid),
      supabase.from('ia_agent_cards').select('*').eq('tenant_id', tid),
    ]);
    buildCanvas(agentes, nos, conexoes, cards, agentCards);
  }

  const onConnect = useCallback(async (params: Connection) => {
    if (!params.source || !params.target || params.source === params.target) return;

    const sourceIsCard = params.source.startsWith(CARD_PREFIX);
    const targetIsCard = params.target.startsWith(CARD_PREFIX);

    // card → agente: cria ia_agent_cards
    if (sourceIsCard && !targetIsCard) {
      const cardId  = params.source.replace(CARD_PREFIX, '');
      const agentId = params.target;
      const tid     = tenantId;
      await supabase.from('ia_agent_cards').upsert(
        { card_id: cardId, agente_id: agentId, tenant_id: tid },
        { onConflict: 'card_id,agente_id' }
      );
      await recarregar(tid);
      return;
    }

    // agente → card: cria ia_agent_cards (direção invertida, mesmo efeito)
    if (!sourceIsCard && targetIsCard) {
      const cardId  = params.target.replace(CARD_PREFIX, '');
      const agentId = params.source;
      const tid     = tenantId;
      await supabase.from('ia_agent_cards').upsert(
        { card_id: cardId, agente_id: agentId, tenant_id: tid },
        { onConflict: 'card_id,agente_id' }
      );
      await recarregar(tid);
      return;
    }

    // card → card ou agente → agente
    if (!sourceIsCard && !targetIsCard) {
      const origem  = nodes.find(n => n.id === params.source);
      const destino = nodes.find(n => n.id === params.target);
      if (!origem || !destino) return;
      setConexaoModal({
        origemId:   params.source,
        origemNome: (origem.data as AgentData).nome,
        destinoId:  params.target,
        destinoNome:(destino.data as AgentData).nome,
      });
    }
  }, [nodes, tenantId]);

  function onNodeDragStop(_: React.MouseEvent, node: Node) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (node.id.startsWith(CARD_PREFIX)) {
        const cardId = node.id.replace(CARD_PREFIX, '');
        await supabase.from('ia_cards')
          .update({ pos_x: node.position.x, pos_y: node.position.y })
          .eq('id', cardId);
      } else {
        await supabase.from('ia_agentes')
          .update({ pos_x: node.position.x, pos_y: node.position.y })
          .eq('id', node.id);
      }
    }, 800);
  }

  function onNodeClick(_: React.MouseEvent, node: Node) {
    if (node.id.startsWith(CARD_PREFIX)) {
      setSelectedAgent(null);
      setSelectedCard(node.data as CardData);
      const edge = edges.find(e => e.source === node.id);
      setSelectedCardAgentId(edge?.target ?? null);
    } else {
      setSelectedCard(null);
      setSelectedCardAgentId(null);
      setSelectedAgent(node.data as AgentData);
    }
  }

  function onPaneClick() {
    setSelectedAgent(null);
    setSelectedCard(null);
    setSelectedCardAgentId(null);
  }

  async function onConexaoConfirm() {
    setConexaoModal(null);
    await recarregar(tenantId);
  }

  function onAgenteSaved() {
    void recarregar(tenantId);
  }

  async function onAgenteCreated(id: string) {
    setCriarAgenteOpen(false);
    await carregar(tenantId);
    const agente = nodes.find(n => n.id === id);
    if (agente) setSelectedAgent(agente.data as AgentData);
  }

  async function onCardCreated() {
    setCriarCardOpen(false);
    await carregar(tenantId);
  }

  async function onEdgesDelete(deletedEdges: Edge[]) {
    for (const edge of deletedEdges) {
      if (edge.id.startsWith('ac-')) {
        // card↔agente: remove de ia_agent_cards
        const acId = edge.id.replace('ac-', '');
        await supabase.from('ia_agent_cards').delete().eq('id', acId);
      } else {
        // agente↔agente: remove de ia_agent_conexoes
        await supabase.from('ia_agent_conexoes').delete().eq('id', edge.id);
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <Bot className="w-6 h-6 animate-pulse mr-2" /> Carregando organograma...
      </div>
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Canvas */}
      <div className="flex-1 relative">
        {/* Toolbar */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
          <button onClick={() => setCriarAgenteOpen(true)}
            className="flex items-center gap-2 px-3 py-2 bg-violet-600 hover:bg-violet-700 rounded-xl text-white text-sm font-semibold shadow-lg">
            <Plus className="w-4 h-4" /> Novo agente
          </button>
          <button onClick={() => setCriarCardOpen(true)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-white text-sm font-semibold shadow-lg">
            <Globe className="w-4 h-4" /> Criar card
          </button>
        </div>

        <OrganoCtx.Provider value={{ openChat: openConexaoChat }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onEdgesDelete={onEdgesDelete}
            onNodeDragStop={onNodeDragStop}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={NODE_TYPES}
            edgeTypes={EDGE_TYPES}
            connectionMode={ConnectionMode.Loose}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            colorMode="dark"
            className="bg-slate-950"
          >
            <Background color="#334155" gap={24} size={1} />
            <Controls className="!bg-slate-800 !border-slate-700 !rounded-xl" />
            <MiniMap
              nodeColor={(n) => {
                if (n.id.startsWith(CARD_PREFIX)) return '#6b7280';
                const d = n.data as AgentData;
                return d.status === 'ativo' ? '#111827' : '#6b7280';
              }}
              className="!bg-slate-800 !border-slate-700 !rounded-xl"
            />
          </ReactFlow>
        </OrganoCtx.Provider>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 bg-slate-800/80 rounded-full text-xs text-slate-400 border border-slate-700 pointer-events-none">
          Arraste entre handles para conectar · Clique num nó para editar
        </div>

        {selectedConexaoChat && (
          <ConexaoChatPanel
            conexaoId={selectedConexaoChat}
            onClose={() => setSelectedConexaoChat(null)}
          />
        )}
      </div>

      {/* Painel lateral — agente */}
      {selectedAgent && (
        <AgentePainel
          agente={selectedAgent}
          isGestor={isGestor}
          tenantId={tenantId}
          onClose={() => setSelectedAgent(null)}
          onSaved={onAgenteSaved}
        />
      )}

      {/* Painel lateral — card */}
      {selectedCard && selectedCard.tipo === 'memoria' && (
        <IAMemoria
          card={selectedCard}
          initialAgentId={selectedCardAgentId ?? undefined}
          onClose={() => { setSelectedCard(null); setSelectedCardAgentId(null); }}
          onSaved={() => { recarregar(tenantId); }}
        />
      )}
      {selectedCard && selectedCard.tipo !== 'memoria' && (
        <CardPainel
          card={selectedCard}
          tenantId={tenantId}
          onClose={() => setSelectedCard(null)}
          onSaved={() => recarregar(tenantId)}
        />
      )}

      {/* Modal de conexão agente↔agente */}
      {conexaoModal && (
        <ConexaoModal
          {...conexaoModal}
          tenantId={tenantId}
          onConfirm={onConexaoConfirm}
          onCancel={() => {
            setConexaoModal(null);
            setEdges(prev => prev.filter(e => e.id !== 'temp'));
          }}
        />
      )}

      {/* Modal de criar agente */}
      {criarAgenteOpen && (
        <CriarAgenteModal
          tenantId={tenantId}
          onCreated={onAgenteCreated}
          onCancel={() => setCriarAgenteOpen(false)}
        />
      )}

      {/* Modal de criar card */}
      {criarCardOpen && (
        <CriarCardModal
          tenantId={tenantId}
          onCreated={onCardCreated}
          onCancel={() => setCriarCardOpen(false)}
        />
      )}
    </div>
  );
}
