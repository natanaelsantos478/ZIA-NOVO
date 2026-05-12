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
  ArrowRight, Trash2, ChevronRight, ChevronLeft, Search,
  Globe, Layers, Zap, Link, Check, Lock, Eye, EyeOff, KeyRound,
  User, Loader2, RefreshCw, Wrench, Database, Download, Upload,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { getTenantIds, getTenantId } from '../../../lib/auth';
import { getWhatsappKey, type WhatsappMensagem } from '../../../lib/whatsapp';
import { useProfiles } from '../../../context/ProfileContext';
import IAMemoria from './IAMemoria';

// ── Context para comunicação entre edge e componente pai ──────────────────────
const OrganoCtx = createContext<{ openChat: (id: string) => void; removeEdge: (id: string) => void }>({
  openChat: () => {},
  removeEdge: () => {},
});

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
  web_search:               { Icon: Globe,     label: 'Pesquisa Web'         },
  memoria:                  { Icon: Brain,     label: 'Memória'              },
  editor_interno:           { Icon: Database,  label: 'Editor Interno'       },
  conector_externo_entrada: { Icon: Download,  label: 'Conector Entrada'     },
  conector_externo_saida:   { Icon: Upload,    label: 'Conector Saída'       },
};

const CARD_DIRECAO: Record<string, 'entrada' | 'saida' | 'ambos'> = {
  web_search:               'entrada',
  memoria:                  'ambos',
  editor_interno:           'ambos',
  conector_externo_entrada: 'entrada',
  conector_externo_saida:   'saida',
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
  const { openChat, removeEdge } = useContext(OrganoCtx);
  const [hovered, setHovered] = useState(false);
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
          className="nodrag nopan flex items-center gap-1"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <button
            className="w-7 h-7 bg-white rounded-full border-2 border-gray-400 shadow-md hover:shadow-lg hover:border-gray-700 flex items-center justify-center transition-all"
            onClick={(e) => { e.stopPropagation(); openChat(id); }}
            title="Abrir chat desta conexão"
          >
            <MessageCircle className="w-3.5 h-3.5 text-gray-700" />
          </button>
          {hovered && (
            <button
              className="w-7 h-7 bg-white rounded-full border-2 border-red-400 shadow-md hover:bg-red-50 hover:border-red-600 flex items-center justify-center transition-all"
              onClick={(e) => { e.stopPropagation(); removeEdge(id); }}
              title="Remover conexão"
            >
              <X className="w-3.5 h-3.5 text-red-500" />
            </button>
          )}
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
  editor_interno: {
    Icon: Database,
    iconBg: 'bg-emerald-500/15', iconBorder: 'border-emerald-500/30', iconText: 'text-emerald-400',
    infoBg: 'bg-emerald-500/5', infoBorder: 'border-emerald-500/20', infoText: 'text-emerald-400',
    titulo: 'Editor Interno',
    desc: 'Permite que o agente leia, edite, crie ou apague dados em módulos específicos da plataforma.',
  },
  conector_externo_entrada: {
    Icon: Download,
    iconBg: 'bg-cyan-500/15', iconBorder: 'border-cyan-500/30', iconText: 'text-cyan-400',
    infoBg: 'bg-cyan-500/5', infoBorder: 'border-cyan-500/20', infoText: 'text-cyan-400',
    titulo: 'Conector Externo · Entrada',
    desc: 'O agente recebe dados de plataformas externas via webhook e decide o que fazer com eles.',
  },
  conector_externo_saida: {
    Icon: Upload,
    iconBg: 'bg-orange-500/15', iconBorder: 'border-orange-500/30', iconText: 'text-orange-400',
    infoBg: 'bg-orange-500/5', infoBorder: 'border-orange-500/20', infoText: 'text-orange-400',
    titulo: 'Conector Externo · Saída',
    desc: 'O agente pode enviar dados para plataformas externas via webhook/API durante o raciocínio.',
  },
};

const MODULOS_EDITOR = [
  { id: 'crm',           label: 'CRM',           submodulos: ['Negociações', 'Leads', 'Prospecção', 'Pipeline'] },
  { id: 'erp_vendas',    label: 'ERP · Vendas',   submodulos: ['Orçamentos', 'Pedidos', 'Produtos', 'NF-e', 'Comissões'] },
  { id: 'erp_financeiro',label: 'ERP · Financeiro',submodulos: ['Contas Pagar', 'Contas Receber', 'Caixa', 'DRE'] },
  { id: 'erp_estoque',   label: 'ERP · Estoque',  submodulos: ['Movimentações', 'Inventário', 'Requisições'] },
  { id: 'rh',            label: 'RH',             submodulos: ['Funcionários', 'Ponto', 'Folha', 'Férias'] },
  { id: 'eam',           label: 'EAM',            submodulos: ['Ativos', 'Manutenção', 'Ordens de Serviço'] },
  { id: 'scm',           label: 'SCM',            submodulos: ['Fornecedores', 'Compras', 'Recebimento'] },
  { id: 'ia',            label: 'IA · Agentes',   submodulos: ['Organograma', 'Chats', 'Memórias'] },
] as const;
const PERMS_EDITOR = ['ver', 'editar', 'criar', 'apagar'] as const;

function CardPainel({ card, tenantId: _tenantId, onClose, onSaved }: CardPainelProps) {
  const [nome, setNome]   = useState(card.nome);
  const [ativo, setAtivo] = useState(card.ativo);
  const [saving, setSaving] = useState(false);

  const [modulosConfig, setModulosConfig] = useState<Record<string, {
    ativo: boolean; permissoes: string[]; submodulos: string[];
  }>>(() => {
    const cfg = (card.config as any)?.modulos ?? {};
    return Object.fromEntries(MODULOS_EDITOR.map(m => [m.id, cfg[m.id] ?? { ativo: false, permissoes: ['ver'], submodulos: [] }]));
  });
  const [urlEntrada, setUrlEntrada]       = useState((card.config as any)?.webhook_description ?? '');
  const [instrEntrada, setInstrEntrada]   = useState((card.config as any)?.instructions ?? '');
  const [targetUrl, setTargetUrl]         = useState((card.config as any)?.target_url ?? '');
  const [targetMethod, setTargetMethod]   = useState((card.config as any)?.method ?? 'POST');
  const [targetHeaders, setTargetHeaders] = useState((card.config as any)?.headers ?? '');
  const [targetDesc, setTargetDesc]       = useState((card.config as any)?.description ?? '');

  const pi = CARD_PAINEL_INFO[card.tipo as string] ?? CARD_PAINEL_INFO['web_search'];

  async function salvar() {
    setSaving(true);
    let config: Record<string, unknown> = { ...card.config };
    if (card.tipo === 'editor_interno') {
      config = { ...config, modulos: modulosConfig };
    } else if (card.tipo === 'conector_externo_entrada') {
      config = { ...config, webhook_description: urlEntrada, instructions: instrEntrada };
    } else if (card.tipo === 'conector_externo_saida') {
      config = { ...config, target_url: targetUrl, method: targetMethod, headers: targetHeaders, description: targetDesc };
    }
    await supabase.from('ia_cards').update({ nome: nome.trim(), ativo, config }).eq('id', card.id);
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

        {card.tipo === 'editor_interno' && (
          <div className="border-t border-slate-700 pt-3 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-300">Módulos e permissões</span>
              <button
                onClick={() => setModulosConfig(prev => Object.fromEntries(
                  MODULOS_EDITOR.map(m => [m.id, { ...prev[m.id], ativo: true, permissoes: [...PERMS_EDITOR], submodulos: [...m.submodulos] }])
                ))}
                className="text-[10px] text-violet-400 hover:text-violet-300 font-medium"
              >Selecionar tudo</button>
            </div>
            {MODULOS_EDITOR.map(m => {
              const mc = modulosConfig[m.id] ?? { ativo: false, permissoes: ['ver'], submodulos: [] };
              return (
                <div key={m.id} className={`rounded-lg border transition-colors ${mc.ativo ? 'border-emerald-700/50 bg-emerald-950/20' : 'border-slate-700 bg-slate-800/50'}`}>
                  <div className="flex items-center gap-2 px-3 py-2">
                    <input type="checkbox" checked={mc.ativo}
                      onChange={e => setModulosConfig(prev => ({ ...prev, [m.id]: { ...mc, ativo: e.target.checked } }))}
                      className="rounded accent-emerald-500" />
                    <span className="text-xs font-medium text-slate-200 flex-1">{m.label}</span>
                    {mc.ativo && (
                      <button
                        onClick={() => setModulosConfig(prev => ({ ...prev, [m.id]: { ...mc, permissoes: [...PERMS_EDITOR], submodulos: [...m.submodulos] } }))}
                        className="text-[10px] text-slate-500 hover:text-slate-300"
                      >tudo</button>
                    )}
                  </div>
                  {mc.ativo && (
                    <div className="px-3 pb-2 space-y-2 border-t border-slate-700/50 pt-2">
                      <div className="flex flex-wrap gap-1">
                        {PERMS_EDITOR.map(p => (
                          <button key={p} onClick={() => {
                            const has = mc.permissoes.includes(p);
                            setModulosConfig(prev => ({ ...prev, [m.id]: { ...mc, permissoes: has ? mc.permissoes.filter(x => x !== p) : [...mc.permissoes, p] } }));
                          }}
                            className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
                              mc.permissoes.includes(p) ? 'bg-emerald-700 border-emerald-600 text-white' : 'bg-slate-700 border-slate-600 text-slate-400'
                            }`}>{p}</button>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {m.submodulos.map(s => (
                          <button key={s} onClick={() => {
                            const has = mc.submodulos.includes(s);
                            setModulosConfig(prev => ({ ...prev, [m.id]: { ...mc, submodulos: has ? mc.submodulos.filter(x => x !== s) : [...mc.submodulos, s] } }));
                          }}
                            className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                              mc.submodulos.includes(s) ? 'bg-slate-600 border-slate-500 text-slate-200' : 'bg-slate-800 border-slate-700 text-slate-500'
                            }`}>{s}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {card.tipo === 'conector_externo_entrada' && (
          <div className="border-t border-slate-700 pt-3 space-y-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Descrição do webhook de entrada</label>
              <input value={urlEntrada} onChange={e => setUrlEntrada(e.target.value)}
                placeholder="Descreva de onde vêm os dados (ex: Webhook do Pipedrive ao criar negócio)"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-xs" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Instrução para o agente</label>
              <textarea rows={3} value={instrEntrada} onChange={e => setInstrEntrada(e.target.value)}
                placeholder="Quando receber dados via webhook, o agente deve..."
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-xs resize-none" />
            </div>
            <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-lg p-3">
              <p className="text-xs text-cyan-400 font-medium mb-1">Como funciona</p>
              <p className="text-xs text-slate-400 leading-relaxed">Conecte este card ao agente no canvas. Quando dados chegarem via webhook externo, o agente os recebe, interpreta e age conforme a instrução acima.</p>
            </div>
          </div>
        )}

        {card.tipo === 'conector_externo_saida' && (
          <div className="border-t border-slate-700 pt-3 space-y-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">URL de destino</label>
              <input value={targetUrl} onChange={e => setTargetUrl(e.target.value)}
                placeholder="https://webhook.site/..."
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-xs font-mono" />
            </div>
            <div className="flex gap-2">
              <div className="w-24 flex-shrink-0">
                <label className="block text-xs text-slate-400 mb-1">Método</label>
                <select value={targetMethod} onChange={e => setTargetMethod(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2 py-2 text-slate-100 text-xs">
                  {['POST','PUT','PATCH'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs text-slate-400 mb-1">Headers (opcional)</label>
                <input value={targetHeaders} onChange={e => setTargetHeaders(e.target.value)}
                  placeholder="Authorization: Bearer ..."
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2 py-2 text-slate-100 text-xs font-mono" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Descrição para o agente</label>
              <textarea rows={2} value={targetDesc} onChange={e => setTargetDesc(e.target.value)}
                placeholder="Descreva quando e o que o agente deve enviar via este conector..."
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-xs resize-none" />
            </div>
          </div>
        )}

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

type AbaId = 'identidade' | 'memoria' | 'nos-entrada' | 'nos-saida' | 'conexoes' | 'chat' | 'confianca';

function AgentePainel({ agente, isGestor, tenantId, onClose, onSaved }: AgentePainelProps) {
  const [aba, setAba] = useState<AbaId>('identidade');
  const [saving, setSaving] = useState(false);

  const [nome, setNome]               = useState(agente.nome);
  const emoji                         = agente.avatar_emoji || '🤖';
  const [tipo, setTipo]               = useState(agente.tipo || 'ESPECIALISTA');
  const [status, setStatus]           = useState(agente.status || 'ativo');
  const [apiCode, setApiCode]         = useState((agente.api_code as string) || '');
  const [apiProvider, setApiProvider] = useState((agente.api_provider as string) || 'gemini');
  const [funcao, setFuncao]           = useState((agente.system_prompt as string) || (agente.funcao as string) || '');
  const [grauHierarquico, setGrauHierarquico] = useState<number>((agente.grau_hierarquico as number) || 5);
  const [apiCodeUnlocked, setApiCodeUnlocked] = useState(false);
  const [senhaModal, setSenhaModal]   = useState(false);

  const [indice, setIndice]         = useState('');
  const [entradas, setEntradas]     = useState<Array<{ id: string; categoria: string; conteudo: string }>>([]);
  const [memoriaId, setMemoriaId]   = useState<string | null>(null);
  const [loadingMem, setLoadingMem] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const [conexoes, setConexoes] = useState<Array<{ id: string; destino_nome: string; grau_destino: number }>>([]);
  const [loadingCon, setLoadingCon] = useState(false);

  interface CardConectado { id: string; card_id: string; tipo: string; nome: string; ativo: boolean; config: Record<string, unknown> }
  interface NoConectado   { id: string; subtipo: string; nome: string; ativo: boolean; tipo: 'entrada' | 'saida' }
  interface AgenteConexao { id: string; agente_id: string; agente_nome: string; instrucoes: string }
  const [cardsConectados, setCardsConectados]   = useState<CardConectado[]>([]);
  const [nosConectados,   setNosConectados]     = useState<NoConectado[]>([]);
  const [agentsEntrada,   setAgentsEntrada]     = useState<AgenteConexao[]>([]);
  const [agentsSaida,     setAgentsSaida]       = useState<AgenteConexao[]>([]);
  const [loadingCards, setLoadingCards]         = useState(false);

  interface WaChat { id: string; phone: string; last_message_at: string }
  interface WaMsg  { id: string; role: string; content: string | null; tool_name: string | null; tool_args: Record<string,unknown>|null; tool_result: Record<string,unknown>|null; created_at: string }
  const [waChats,      setWaChats]      = useState<WaChat[]>([]);
  const [waChatId,     setWaChatId]     = useState<string | null>(null);
  const [waMsgs,       setWaMsgs]       = useState<WaMsg[]>([]);
  const [loadingChat,  setLoadingChat]  = useState(false);
  const [expandedMsg,  setExpandedMsg]  = useState<Set<string>>(new Set());
  const [chatInput,    setChatInput]    = useState('');
  const [sendingChat,  setSendingChat]  = useState(false);
  const [chatSearch,   setChatSearch]   = useState('');
  const [chatMode,     setChatMode]     = useState<'list' | 'messages'>('list');
  const [zapiMsgs,     setZapiMsgs]    = useState<WhatsappMensagem[]>([]);
  const [loadingZapi,  setLoadingZapi]  = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  interface NumeroConfianca {
    id: string; phone: string; nome: string; descricao: string;
    pode_visualizar: boolean; pode_editar: boolean; pode_criar: boolean; pode_apagar: boolean;
  }
  const [numeros, setNumeros]           = useState<NumeroConfianca[]>([]);
  const [loadingNum, setLoadingNum]     = useState(false);
  const [savingNum, setSavingNum]       = useState<string | null>(null);
  const [novoPhone, setNovoPhone]       = useState('');
  const [novoNome, setNovoNome]         = useState('');
  const [novaDesc, setNovaDesc]         = useState('');
  const [addingNum, setAddingNum]       = useState(false);
  const [errNum,    setErrNum]          = useState('');

  const ABAS: { id: AbaId; label: string }[] = [
    { id: 'identidade',  label: 'Identidade' },
    { id: 'memoria',     label: 'Memória' },
    { id: 'nos-entrada', label: 'Entradas' },
    { id: 'nos-saida',   label: 'Saídas' },
    { id: 'conexoes',    label: 'Conexões' },
    { id: 'confianca',   label: 'Confiança' },
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
      .select('id, agent_destino_id')
      .eq('agent_origem_id', agente.id)
      .eq('tenant_id', tenantId)
      .then(async ({ data }) => {
        if (!data) { setLoadingCon(false); return; }
        const destIds = data.map(c => c.agent_destino_id);
        const { data: agentes } = await supabase.from('ia_agentes')
          .select('id, nome, grau_hierarquico')
          .in('id', destIds);
        const map = Object.fromEntries((agentes ?? []).map(a => [a.id, a]));
        setConexoes(data.map(c => ({
          id: c.id,
          destino_nome: (map[c.agent_destino_id] as any)?.nome ?? '?',
          grau_destino: (map[c.agent_destino_id] as any)?.grau_hierarquico ?? 5,
        })));
        setLoadingCon(false);
      });
  }, [aba, agente.id, tenantId]);

  useEffect(() => {
    if (aba !== 'nos-entrada' && aba !== 'nos-saida') return;
    setLoadingCards(true);
    Promise.all([
      supabase.from('ia_agent_cards').select('id, card_id, ia_cards(tipo, nome, ativo, config)').eq('agente_id', agente.id),
      supabase.from('ia_agent_nos').select('id, subtipo, nome, ativo, tipo').eq('agent_id', agente.id).eq('tenant_id', tenantId),
      // agentes que conectam PARA este (entradas)
      supabase.from('ia_agent_conexoes').select('id, agent_origem_id, instrucoes, ia_agentes!agent_origem_id(nome)').eq('agent_destino_id', agente.id).eq('tenant_id', tenantId),
      // agentes que este conecta PARA (saídas)
      supabase.from('ia_agent_conexoes').select('id, agent_destino_id, instrucoes, ia_agentes!agent_destino_id(nome)').eq('agent_origem_id', agente.id).eq('tenant_id', tenantId),
    ]).then(([{ data: cards }, { data: nos }, { data: conEntrada }, { data: conSaida }]) => {
      setCardsConectados((cards ?? []).map((r: any) => ({
        id: r.id, card_id: r.card_id,
        tipo: r.ia_cards?.tipo ?? '', nome: r.ia_cards?.nome ?? '',
        ativo: r.ia_cards?.ativo ?? false, config: r.ia_cards?.config ?? {},
      })));
      setNosConectados((nos ?? []).map((r: any) => ({
        id: r.id, subtipo: r.subtipo, nome: r.nome, ativo: r.ativo, tipo: r.tipo,
      })));
      setAgentsEntrada((conEntrada ?? []).map((r: any) => ({
        id: r.id, agente_id: r.agent_origem_id,
        agente_nome: (r.ia_agentes as any)?.nome ?? '?',
        instrucoes: r.instrucoes ?? '',
      })));
      setAgentsSaida((conSaida ?? []).map((r: any) => ({
        id: r.id, agente_id: r.agent_destino_id,
        agente_nome: (r.ia_agentes as any)?.nome ?? '?',
        instrucoes: r.instrucoes ?? '',
      })));
      setLoadingCards(false);
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

  // Carrega histórico Z-API quando abre um chat WhatsApp (não internal)
  useEffect(() => {
    if (chatMode !== 'messages' || !waChatId) return;
    const phone = waChats.find(c => c.id === waChatId)?.phone;
    if (!phone || phone === 'user_direto') { setZapiMsgs([]); return; }
    setLoadingZapi(true);
    getWhatsappKey([tenantId]).then(async key => {
      if (!key) { setLoadingZapi(false); return; }
      const cfg = (key.integracao_config ?? {}) as { instanceUrl?: string; token?: string };
      if (!cfg.instanceUrl || !cfg.token) { setLoadingZapi(false); return; }
      try {
        const fnBase = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://tgeomsnxfcqwrxijjvek.supabase.co';
        const resp = await fetch(`${fnBase}/functions/v1/whatsapp-proxy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get-messages', instanceUrl: cfg.instanceUrl, token: cfg.token, phone, amount: 30 }),
        });
        const data = resp.ok ? await resp.json() : {};
        const rawMsgs: Record<string, unknown>[] = ((data as any)?.messages ?? []);
        const arr: WhatsappMensagem[] = rawMsgs.map((m) => {
          // Z-API retorna text como objeto { message: "..." } ou string direta
          const rawText = m.text;
          const text = typeof rawText === 'string'
            ? rawText
            : ((rawText && typeof rawText === 'object' ? (rawText as any).message || '' : '')
              || (m.body as string | undefined) || (m.caption as string | undefined) || '');
          // Z-API usa "momment" (duplo m) para o timestamp
          const timestamp = String((m as any).momment ?? m.moment ?? m.timestamp ?? m.date ?? '');
          return {
            id: String(m.messageId ?? m.id ?? crypto.randomUUID()),
            phone: String(m.phone ?? phone),
            fromMe: Boolean(m.fromMe ?? m.fromme ?? false),
            text,
            timestamp,
          };
        });
        setZapiMsgs(arr);
      } catch { /* silencia — histórico é opcional */ }
      setLoadingZapi(false);
    });
  }, [waChatId, chatMode, tenantId]);

  useEffect(() => {
    if (aba !== 'confianca') return;
    setLoadingNum(true);
    supabase.from('wa_agent_numeros_confianca')
      .select('id, phone, nome, descricao, pode_visualizar, pode_editar, pode_criar, pode_apagar')
      .eq('agent_id', agente.id)
      .eq('tenant_id', tenantId)
      .order('created_at')
      .then(({ data }) => {
        setNumeros((data ?? []) as NumeroConfianca[]);
        setLoadingNum(false);
      });
  }, [aba, agente.id, tenantId]);

  async function adicionarNumero() {
    if (!novoPhone.trim() || !novoNome.trim()) return;
    setAddingNum(true); setErrNum('');
    const { data, error } = await supabase.from('wa_agent_numeros_confianca').insert({
      agent_id: agente.id, tenant_id: tenantId,
      phone: novoPhone.trim(), nome: novoNome.trim(), descricao: novaDesc.trim() || null,
      pode_visualizar: true, pode_editar: false, pode_criar: false, pode_apagar: false,
    }).select('id, phone, nome, descricao, pode_visualizar, pode_editar, pode_criar, pode_apagar').single();
    if (error) {
      setErrNum(`Erro ao salvar: ${error.message}`);
    } else if (data) {
      setNumeros(prev => [...prev, data as NumeroConfianca]);
      setNovoPhone(''); setNovoNome(''); setNovaDesc('');
    }
    setAddingNum(false);
  }

  async function salvarNumero(n: NumeroConfianca) {
    setSavingNum(n.id);
    await supabase.from('wa_agent_numeros_confianca').update({
      phone: n.phone, nome: n.nome, descricao: n.descricao || null,
      pode_visualizar: n.pode_visualizar, pode_editar: n.pode_editar,
      pode_criar: n.pode_criar, pode_apagar: n.pode_apagar,
    }).eq('id', n.id);
    setSavingNum(null);
  }

  async function removerNumero(id: string) {
    if (!confirm('Remover este número de confiança?')) return;
    await supabase.from('wa_agent_numeros_confianca').delete().eq('id', id);
    setNumeros(prev => prev.filter(n => n.id !== id));
  }

  function toggleExpand(id: string) {
    setExpandedMsg(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function enviarMensagemDireta() {
    const msg = chatInput.trim();
    if (!msg || sendingChat || !waChatId) return;
    setChatInput('');
    setSendingChat(true);

    // Salva mensagem do usuário imediatamente para aparecer na tela
    const { data: savedMsg } = await supabase.from('wa_agent_chat_messages').insert({
      chat_id: waChatId, agent_id: agente.id, tenant_id: tenantId,
      role: 'user', content: msg, tool_name: null, tool_args: null, tool_result: null,
    }).select('id, role, content, tool_name, tool_args, tool_result, created_at').single();
    if (savedMsg) setWaMsgs(prev => [...prev, savedMsg as WaMsg]);

    const sessionId = waChats.find(c => c.id === waChatId)?.phone ?? 'user_direto';

    // Chama o runner via fetch direto (verify_jwt:false, sem dependência de SDK auth)
    const fnBase = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://tgeomsnxfcqwrxijjvek.supabase.co';
    fetch(`${fnBase}/functions/v1/ia-agent-runner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agent_id: agente.id, tenant_id: tenantId, session_id: sessionId, message: msg, message_already_logged: true }),
    }).catch(e => console.error('[runner] fetch error:', e))
      .finally(() => setSendingChat(false));
  }

  async function iniciarChatDireto() {
    setSendingChat(true);
    try {
      // Cria o chat diretamente — não depende do agente processar
      const { data: existing } = await supabase
        .from('wa_agent_chats').select('id')
        .eq('agent_id', agente.id).eq('phone', 'user_direto').maybeSingle();

      let novoChatId: string;
      if (existing?.id) {
        novoChatId = existing.id as string;
        await supabase.from('wa_agent_chats').update({ last_message_at: new Date().toISOString() }).eq('id', novoChatId);
      } else {
        const { data: novo } = await supabase
          .from('wa_agent_chats')
          .insert({ agent_id: agente.id, tenant_id: tenantId, phone: 'user_direto', titulo: 'Chat Direto', last_message_at: new Date().toISOString() })
          .select('id').single();
        novoChatId = (novo?.id as string) ?? '';
      }

      // Recarrega chats imediatamente e abre o chat direto
      const { data } = await supabase.from('wa_agent_chats').select('id, phone, last_message_at').eq('agent_id', agente.id).order('last_message_at', { ascending: false });
      const rows = (data ?? []) as WaChat[];
      setWaChats(rows);
      setWaChatId(novoChatId || (rows[0]?.id ?? null));
      setChatMode('messages');
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
      grau_hierarquico: grauHierarquico,
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
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-slate-400">Grau hierárquico</label>
                <span className="text-xs font-semibold text-slate-200">{grauHierarquico}/10
                  <span className="text-slate-500 font-normal ml-1">
                    {grauHierarquico <= 3 ? '· Operacional' : grauHierarquico <= 6 ? '· Gerencial' : grauHierarquico <= 9 ? '· Estratégico' : '· Diretivo'}
                  </span>
                </span>
              </div>
              <input type="range" min={1} max={10} value={grauHierarquico}
                onChange={e => setGrauHierarquico(Number(e.target.value))}
                className="w-full accent-violet-500" />
              <p className="text-[10px] text-slate-600 mt-0.5">Define a autonomia de decisão. Agentes com grau menor precisam de autorização de agentes com grau maior.</p>
            </div>
            {isGestor && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Chave de API</label>
                  {apiCodeUnlocked ? (
                    <div className="flex gap-2 items-center">
                      <input value={apiCode} onChange={e => setApiCode(e.target.value.toUpperCase())}
                        placeholder="Cole sua chave API (ex: AIzaSy..., sk-ant-...)"
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
            <p className="text-xs text-slate-400 mb-2">
              Agentes e nós conectados como entrada deste agente.
            </p>
            {loadingCards ? (
              <div className="text-slate-400 text-sm text-center py-8">Carregando...</div>
            ) : (
              <>
                {agentsEntrada.length === 0 && nosConectados.filter(n => n.tipo === 'entrada').length === 0 && cardsConectados.filter(c => (CARD_DIRECAO[c.tipo] ?? 'ambos') !== 'saida').length === 0 ? (
                  <div className="text-slate-500 text-sm text-center py-8">
                    <Download className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Nenhuma conexão de entrada.
                    <br /><span className="text-xs">Conecte agentes no canvas para aparecer aqui.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {agentsEntrada.map(a => (
                      <div key={a.id} className="flex items-center gap-3 rounded-xl border px-3 py-2.5 bg-violet-900/20 border-violet-700/40">
                        <div className="w-7 h-7 rounded-lg bg-violet-800/40 border border-violet-600/40 flex items-center justify-center flex-shrink-0">
                          <Bot className="w-3.5 h-3.5 text-violet-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-200 truncate">{a.agente_nome}</div>
                          {a.instrucoes && <div className="text-xs text-slate-500 truncate">{a.instrucoes}</div>}
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                      </div>
                    ))}
                    {nosConectados.filter(n => n.tipo === 'entrada').map(n => {
                      const Icon = NO_ICON[n.subtipo] ?? Plug;
                      return (
                        <div key={n.id} className="flex items-center gap-3 rounded-xl border px-3 py-2.5 bg-slate-800/50 border-slate-700">
                          <div className="w-7 h-7 rounded-lg bg-slate-700 border border-slate-600 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-3.5 h-3.5 text-slate-300" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-slate-200 truncate">{n.nome || n.subtipo}</div>
                            <div className="text-xs text-slate-500">{n.subtipo.replace('_', ' ')}</div>
                          </div>
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${n.ativo ? 'bg-green-500' : 'bg-slate-600'}`} />
                        </div>
                      );
                    })}
                    {cardsConectados.filter(c => (CARD_DIRECAO[c.tipo] ?? 'ambos') !== 'saida').map(c => {
                      const ti = CARD_TIPO_INFO[c.tipo] ?? CARD_TIPO_INFO['web_search'];
                      const pi = CARD_PAINEL_INFO[c.tipo] ?? CARD_PAINEL_INFO['web_search'];
                      return (
                        <div key={c.id} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${pi.infoBg} ${pi.infoBorder}`}>
                          <div className={`w-7 h-7 rounded-lg ${pi.iconBg} border ${pi.iconBorder} flex items-center justify-center flex-shrink-0`}>
                            <ti.Icon className={`w-3.5 h-3.5 ${pi.iconText}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-slate-200 truncate">{c.nome}</div>
                            <div className={`text-xs ${pi.infoText}`}>{ti.label}</div>
                          </div>
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${c.ativo ? 'bg-green-500' : 'bg-slate-600'}`} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {aba === 'nos-saida' && (
          <>
            <p className="text-xs text-slate-400">
              Agentes e nós conectados como saída deste agente.
            </p>
            {loadingCards ? (
              <div className="text-slate-400 text-sm text-center py-8">Carregando...</div>
            ) : (
              <>
                {agentsSaida.length === 0 && nosConectados.filter(n => n.tipo === 'saida').length === 0 && cardsConectados.filter(c => (CARD_DIRECAO[c.tipo] ?? 'ambos') !== 'entrada').length === 0 ? (
                  <div className="text-slate-500 text-sm text-center py-8">
                    <Upload className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    Nenhuma conexão de saída.
                    <br /><span className="text-xs">Conecte agentes no canvas para aparecer aqui.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {agentsSaida.map(a => (
                      <div key={a.id} className="flex items-center gap-3 rounded-xl border px-3 py-2.5 bg-violet-900/20 border-violet-700/40">
                        <div className="w-7 h-7 rounded-lg bg-violet-800/40 border border-violet-600/40 flex items-center justify-center flex-shrink-0">
                          <Bot className="w-3.5 h-3.5 text-violet-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-200 truncate">{a.agente_nome}</div>
                          {a.instrucoes && <div className="text-xs text-slate-500 truncate">{a.instrucoes}</div>}
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                      </div>
                    ))}
                    {nosConectados.filter(n => n.tipo === 'saida').map(n => {
                      const Icon = NO_ICON[n.subtipo] ?? Plug;
                      return (
                        <div key={n.id} className="flex items-center gap-3 rounded-xl border px-3 py-2.5 bg-slate-800/50 border-slate-700">
                          <div className="w-7 h-7 rounded-lg bg-slate-700 border border-slate-600 flex items-center justify-center flex-shrink-0">
                            <Icon className="w-3.5 h-3.5 text-slate-300" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-slate-200 truncate">{n.nome || n.subtipo}</div>
                            <div className="text-xs text-slate-500">{n.subtipo.replace('_', ' ')}</div>
                          </div>
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${n.ativo ? 'bg-green-500' : 'bg-slate-600'}`} />
                        </div>
                      );
                    })}
                    {cardsConectados.filter(c => (CARD_DIRECAO[c.tipo] ?? 'ambos') !== 'entrada').map(c => {
                      const ti = CARD_TIPO_INFO[c.tipo] ?? CARD_TIPO_INFO['web_search'];
                      const pi = CARD_PAINEL_INFO[c.tipo] ?? CARD_PAINEL_INFO['web_search'];
                      return (
                        <div key={c.id} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${pi.infoBg} ${pi.infoBorder}`}>
                          <div className={`w-7 h-7 rounded-lg ${pi.iconBg} border ${pi.iconBorder} flex items-center justify-center flex-shrink-0`}>
                            <ti.Icon className={`w-3.5 h-3.5 ${pi.iconText}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-slate-200 truncate">{c.nome}</div>
                            <div className={`text-xs ${pi.infoText}`}>{ti.label}</div>
                          </div>
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${c.ativo ? 'bg-green-500' : 'bg-slate-600'}`} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
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
                      <div className="text-xs text-slate-400">Grau {c.grau_destino}/10 · conversa</div>
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

        {aba === 'confianca' && (
          <>
            <p className="text-xs text-slate-400 mb-3">
              Números de confiança para agentes WhatsApp. A IA identifica quem está falando, aplica as permissões e pode notificá-los proativamente durante o raciocínio.
            </p>
            {loadingNum ? (
              <div className="text-slate-400 text-sm text-center py-8">Carregando...</div>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  {numeros.map(n => (
                    <div key={n.id} className="bg-slate-800 rounded-xl border border-slate-700 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          value={n.phone}
                          onChange={e => setNumeros(prev => prev.map(x => x.id === n.id ? { ...x, phone: e.target.value } : x))}
                          placeholder="5511999999999"
                          className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-slate-100 text-xs font-mono"
                        />
                        <button onClick={() => removerNumero(n.id)} className="text-red-400 hover:text-red-300 flex-shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <input
                        value={n.nome}
                        onChange={e => setNumeros(prev => prev.map(x => x.id === n.id ? { ...x, nome: e.target.value } : x))}
                        placeholder="Nome (ex: João Gestor)"
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-slate-100 text-xs"
                      />
                      <textarea
                        value={n.descricao}
                        onChange={e => setNumeros(prev => prev.map(x => x.id === n.id ? { ...x, descricao: e.target.value } : x))}
                        rows={2}
                        placeholder="Descrição para a IA (ex: Diretor de vendas — pode aprovar descontos acima de 20%)"
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-slate-100 text-xs resize-none"
                      />
                      <div className="grid grid-cols-2 gap-1.5">
                        {(['pode_visualizar','pode_editar','pode_criar','pode_apagar'] as const).map(perm => {
                          const labels: Record<string, string> = {
                            pode_visualizar: 'Visualizar', pode_editar: 'Editar',
                            pode_criar: 'Criar', pode_apagar: 'Apagar',
                          };
                          return (
                            <label key={perm} className="flex items-center gap-1.5 cursor-pointer bg-slate-700/50 rounded-lg px-2 py-1.5">
                              <input
                                type="checkbox"
                                checked={n[perm]}
                                onChange={e => setNumeros(prev => prev.map(x => x.id === n.id ? { ...x, [perm]: e.target.checked } : x))}
                                className="rounded accent-violet-500"
                              />
                              <span className="text-xs text-slate-300">{labels[perm]}</span>
                            </label>
                          );
                        })}
                      </div>
                      <button
                        onClick={() => salvarNumero(n)}
                        disabled={savingNum === n.id}
                        className="w-full py-1 bg-violet-700 hover:bg-violet-600 disabled:opacity-50 rounded-lg text-xs text-white font-semibold flex items-center justify-center gap-1"
                      >
                        {savingNum === n.id ? <Zap className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                        Salvar
                      </button>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-700 pt-4 space-y-2">
                  <p className="text-xs text-slate-500 font-medium">Adicionar número</p>
                  <input
                    value={novoPhone}
                    onChange={e => setNovoPhone(e.target.value)}
                    placeholder="Telefone (ex: 5511999999999)"
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-xs font-mono"
                  />
                  <input
                    value={novoNome}
                    onChange={e => setNovoNome(e.target.value)}
                    placeholder="Nome identificador"
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-xs"
                  />
                  <textarea
                    value={novaDesc}
                    onChange={e => setNovaDesc(e.target.value)}
                    rows={2}
                    placeholder="Descrição para a IA (quem é, o que pode fazer...)"
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-xs resize-none"
                  />
                  <button
                    onClick={adicionarNumero}
                    disabled={addingNum || !novoPhone.trim() || !novoNome.trim()}
                    className="w-full py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg text-white text-xs font-semibold flex items-center justify-center gap-2"
                  >
                    {addingNum ? <Zap className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Adicionar número
                  </button>
                  {errNum && <p className="text-xs text-red-400 mt-1">{errNum}</p>}
                </div>
              </>
            )}
          </>
        )}

        {aba === 'chat' && (
          <div className="flex flex-col h-full overflow-hidden">
            {/* ── Modo lista de contatos ── */}
            {chatMode === 'list' && (
              <>
                <div className="flex-shrink-0 px-3 py-2 border-b border-slate-700 space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
                    <input
                      value={chatSearch} onChange={e => setChatSearch(e.target.value)}
                      placeholder="Buscar contato..."
                      className="w-full pl-7 pr-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <button
                    onClick={iniciarChatDireto} disabled={sendingChat}
                    className="w-full py-1.5 bg-violet-700/40 hover:bg-violet-700/70 border border-violet-600/40 disabled:opacity-50 rounded-lg text-xs text-violet-300 font-medium flex items-center justify-center gap-1.5 transition-colors"
                  >
                    {sendingChat ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageCircle className="w-3 h-3" />}
                    Nova conversa interna
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {loadingChat ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-slate-600 animate-spin" /></div>
                  ) : waChats.filter(c => c.phone.toLowerCase().includes(chatSearch.toLowerCase())).length === 0 ? (
                    <p className="text-xs text-slate-600 text-center py-8">
                      {chatSearch ? 'Nenhum contato encontrado' : 'Nenhuma conversa ainda'}
                    </p>
                  ) : (
                    waChats.filter(c => c.phone.toLowerCase().includes(chatSearch.toLowerCase())).map(c => (
                      <button key={c.id} onClick={() => { setWaChatId(c.id); setChatMode('messages'); }}
                        className="w-full text-left px-3 py-2.5 border-b border-slate-800 hover:bg-slate-800/60 flex items-center gap-2.5 transition-colors">
                        <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                          {c.phone === 'user_direto' ? <Bot className="w-3.5 h-3.5 text-violet-400" /> : <User className="w-3.5 h-3.5 text-slate-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-slate-200 truncate">
                            {c.phone === 'user_direto' ? 'Chat Direto (Interno)' : c.phone}
                          </div>
                          <div className="text-[10px] text-slate-500">{new Date(c.last_message_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                        <ChevronRight className="w-3 h-3 text-slate-600 flex-shrink-0" />
                      </button>
                    ))
                  )}
                </div>
              </>
            )}

            {/* ── Modo mensagens ── */}
            {chatMode === 'messages' && (
              <>
                <div className="flex-shrink-0 px-3 py-2 border-b border-slate-700 flex items-center gap-2">
                  <button onClick={() => setChatMode('list')} className="text-slate-500 hover:text-slate-300 flex-shrink-0">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-medium text-slate-300 truncate flex-1">
                    {waChats.find(c => c.id === waChatId)?.phone === 'user_direto'
                      ? 'Chat Direto (Interno)'
                      : waChats.find(c => c.id === waChatId)?.phone ?? ''}
                  </span>
                  <button onClick={() => {
                    if (!waChatId) return;
                    supabase.from('wa_agent_chat_messages').select('id, role, content, tool_name, tool_args, tool_result, created_at').eq('chat_id', waChatId).order('created_at', { ascending: true })
                      .then(({ data }) => { setWaMsgs((data ?? []) as WaMsg[]); setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80); });
                  }} className="text-slate-500 hover:text-slate-300 flex-shrink-0">
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3 space-y-2">
                  {/* Histórico Z-API — últimas 30 mensagens anteriores */}
                  {loadingZapi && (
                    <div className="flex items-center justify-center gap-1.5 py-2">
                      <Loader2 className="w-3 h-3 text-slate-600 animate-spin" />
                      <span className="text-[10px] text-slate-600">Carregando histórico Z-API...</span>
                    </div>
                  )}
                  {!loadingZapi && zapiMsgs.length > 0 && (
                    <>
                      {zapiMsgs.map(m => (
                        <div key={m.id} className={`flex items-start gap-1.5 ${m.fromMe ? 'justify-end' : ''}`}>
                          {!m.fromMe && (
                            <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <User className="w-2.5 h-2.5 text-slate-400" />
                            </div>
                          )}
                          <div className={`max-w-[78%] rounded-2xl px-3 py-1.5 text-xs leading-relaxed opacity-70 ${
                            m.fromMe
                              ? 'bg-violet-600 rounded-tr-sm text-white'
                              : 'bg-slate-800 rounded-tl-sm text-slate-200'
                          }`}>
                            {m.text || '(mídia)'}
                          </div>
                          {m.fromMe && (
                            <div className="w-5 h-5 rounded-full bg-violet-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Bot className="w-2.5 h-2.5 text-violet-200" />
                            </div>
                          )}
                        </div>
                      ))}
                      <div className="flex items-center gap-2 py-1">
                        <div className="flex-1 h-px bg-slate-700" />
                        <span className="text-[10px] text-slate-600 flex-shrink-0">— agente ativo a partir daqui —</span>
                        <div className="flex-1 h-px bg-slate-700" />
                      </div>
                    </>
                  )}
                  {loadingChat ? (
                    <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-slate-600 animate-spin" /></div>
                  ) : waMsgs.length === 0 ? (
                    <p className="text-xs text-slate-600 text-center py-8">Sem mensagens nesta conversa</p>
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
                      <div className="max-w-[90%] w-full bg-slate-900/60 border border-slate-700/30 rounded-lg px-2.5 py-1">
                        <button onClick={() => toggleExpand(msg.id)} className="w-full flex items-center gap-1.5">
                          <Brain className="w-2.5 h-2.5 text-slate-600 flex-shrink-0" />
                          <span className="text-[10px] text-slate-600 flex-1 text-left truncate">
                            {(msg.content ?? '').slice(0, 55)}{(msg.content?.length ?? 0) > 55 ? '…' : ''}
                          </span>
                          <ChevronRight className={`w-2.5 h-2.5 text-slate-700 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </button>
                        {isExpanded && (
                          <p className="mt-1.5 text-xs text-slate-400 italic leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>
                    </div>
                  );
                  if (msg.role === 'tool_call') return (
                    <div key={msg.id} className="flex justify-center">
                      <div className="max-w-[90%] w-full bg-amber-950/30 border border-amber-800/30 rounded-lg px-2.5 py-1">
                        <button onClick={() => toggleExpand(msg.id)} className="w-full flex items-center gap-1.5">
                          <Wrench className="w-2.5 h-2.5 text-amber-600 flex-shrink-0" />
                          <span className="text-[10px] text-amber-600 flex-1 text-left truncate">{msg.tool_name}</span>
                          <ChevronRight className={`w-2.5 h-2.5 text-amber-700 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </button>
                        {isExpanded && msg.tool_args && (
                          <pre className="mt-1.5 text-[10px] text-amber-300/70 font-mono bg-black/30 rounded p-1.5 overflow-x-auto max-h-32">{JSON.stringify(msg.tool_args, null, 2)}</pre>
                        )}
                      </div>
                    </div>
                  );
                  if (msg.role === 'tool_result') return (
                    <div key={msg.id} className="flex justify-center">
                      <div className="max-w-[90%] w-full bg-emerald-950/30 border border-emerald-800/30 rounded-lg px-2.5 py-1">
                        <button onClick={() => toggleExpand(msg.id)} className="w-full flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 flex-shrink-0" />
                          <span className="text-[10px] text-emerald-600 flex-1 text-left truncate">resultado: {msg.tool_name}</span>
                          <ChevronRight className={`w-2.5 h-2.5 text-emerald-700 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </button>
                        {isExpanded && msg.tool_result && (
                          <pre className="mt-1.5 text-[10px] text-emerald-300/70 font-mono bg-black/30 rounded p-1.5 overflow-x-auto max-h-32">{JSON.stringify(msg.tool_result, null, 2)}</pre>
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
              </>
            )}
          </div>
        )}
      </div>
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
  const [instrucoes, setInstrucoes] = useState('');
  const [saving, setSaving]         = useState(false);
  const [erroSave, setErroSave]     = useState('');

  async function confirmar() {
    setSaving(true);
    setErroSave('');
    const payload = {
      agent_origem_id: origemId, agent_destino_id: destinoId,
      tenant_id: tenantId, tipo: 'conversa', frequencia: 'sempre',
      instrucoes: instrucoes.trim() || null, ativo: true,
    };
    const { error: insErr } = await supabase.from('ia_agent_conexoes').insert(payload);
    if (insErr) {
      if ((insErr as { code?: string }).code === '23505') {
        const { error: updErr } = await supabase
          .from('ia_agent_conexoes')
          .update({ instrucoes: instrucoes.trim() || null, ativo: true })
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
          {' ↔ '}
          <span className="text-violet-300 font-medium">{destinoNome}</span>
        </p>
        <div className="bg-slate-700/50 rounded-lg px-3 py-2 mb-4 text-xs text-slate-400">
          Os agentes se comunicam via conversa. Cada agente decide se responde ou executa uma ação com base no seu grau hierárquico e contexto.
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Orientação (opcional)</label>
            <textarea rows={2} value={instrucoes} onChange={e => setInstrucoes(e.target.value)}
              placeholder="Ex: consultar antes de fechar qualquer negócio acima de R$5.000..."
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
  const [tipo, setTipo]     = useState<string>('web_search');
  const [saving, setSaving] = useState(false);
  const [erro, setErro]     = useState('');

  async function criar() {
    if (!nome.trim()) return;
    setErro('');
    setSaving(true);
    const tid = tenantId || getTenantId();
    const config: Record<string, unknown> =
      tipo === 'web_search'               ? { provider: 'serper' } :
      tipo === 'memoria'                  ? { api_provider: 'gemini', api_code: '' } :
      tipo === 'editor_interno'           ? { modulos: {} } :
      tipo === 'conector_externo_entrada' ? { webhook_description: '', instructions: '' } :
      tipo === 'conector_externo_saida'   ? { target_url: '', method: 'POST', headers: '', description: '' } :
      {};
    const { error } = await supabase.from('ia_cards').insert({
      tenant_id: tid, tipo, nome: nome.trim(), config, ativo: true,
    });
    setSaving(false);
    if (error) { setErro(error.message); return; }
    onCreated();
  }

  const TIPOS = [
    { id: 'web_search',               Icon: Globe,     cor: 'blue',    label: 'Pesquisa Web',          desc: 'Agentes pesquisam na internet via Serper.' },
    { id: 'memoria',                  Icon: Brain,     cor: 'violet',  label: 'Memória',               desc: 'Memória persistente com 11 pastas organizadas.' },
    { id: 'editor_interno',           Icon: Database,  cor: 'emerald', label: 'Editor Interno',        desc: 'Lê/edita dados de módulos internos (CRM, ERP, RH...).' },
    { id: 'conector_externo_entrada', Icon: Download,  cor: 'cyan',    label: 'Conector Entrada',      desc: 'Recebe dados de plataformas externas via webhook.' },
    { id: 'conector_externo_saida',   Icon: Upload,    cor: 'orange',  label: 'Conector Saída',        desc: 'Envia dados para plataformas externas via webhook/API.' },
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
                  setNome(
                    t.id === 'web_search'               ? 'Pesquisa Web Google' :
                    t.id === 'memoria'                  ? 'Memória do Agente' :
                    t.id === 'editor_interno'           ? 'Editor Interno' :
                    t.id === 'conector_externo_entrada' ? 'Conector Entrada' :
                    'Conector Saída'
                  );
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
  const removeConexao = useCallback(async (edgeId: string) => {
    if (!confirm('Remover esta conexão entre agentes?')) return;
    await supabase.from('ia_agent_conexoes').delete().eq('id', edgeId);
    setEdges(prev => prev.filter(e => e.id !== edgeId));
  }, [setEdges]);
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

        <OrganoCtx.Provider value={{ openChat: openConexaoChat, removeEdge: removeConexao }}>
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
