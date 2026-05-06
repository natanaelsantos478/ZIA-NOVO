// ─────────────────────────────────────────────────────────────────────────────
// Organograma — Canvas interativo de agentes IA
// Usa @xyflow/react para drag-and-drop com nós e conexões
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState,
  Handle, Position, MarkerType,
  type Node, type Edge, type Connection, type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Plus, X, Save, Bot, Brain, Plug, MessageSquare,
  ArrowRight, Trash2, ChevronRight,
  Globe, Layers, Zap, Link, Check, Lock, Eye, EyeOff, KeyRound,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { getTenantIds, getTenantId } from '../../../lib/auth';
import { useProfiles } from '../../../context/ProfileContext';

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
  memoria:         'bg-violet-500',
  modulo_interno:  'bg-blue-500',
  whatsapp:        'bg-green-500',
  api_externa:     'bg-orange-500',
  agente:          'bg-slate-400',
  webhook_saida:   'bg-yellow-500',
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
      relative bg-slate-800 rounded-xl border-2 min-w-[200px] shadow-xl
      transition-all duration-150
      ${selected ? 'border-violet-400 shadow-violet-500/30' : 'border-slate-600 hover:border-violet-500/50'}
    `}>
      {/* Handle de entrada (esquerda) */}
      <Handle type="target" position={Position.Left}
        className="!w-3 !h-3 !bg-violet-400 !border-slate-700 !border-2" />

      {/* Header do card */}
      <div className="px-3 pt-3 pb-2 flex items-start gap-2">
        <span className="text-2xl">{agent.avatar_emoji || '🤖'}</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-100 text-sm truncate">{agent.nome}</div>
          <div className="text-xs text-slate-400 truncate">{agent.tipo}</div>
        </div>
        <div className={`
          w-2 h-2 rounded-full mt-1 flex-shrink-0
          ${agent.status === 'ativo' ? 'bg-green-400' : 'bg-slate-600'}
        `} />
      </div>

      {/* api_code badge */}
      {agent.api_code && (
        <div className="mx-3 mb-2 px-2 py-0.5 rounded bg-violet-900/50 border border-violet-700/50 text-violet-300 text-xs font-mono w-fit">
          {agent.api_code}
        </div>
      )}

      {/* Nós de entrada e saída */}
      {(entradas.length > 0 || saidas.length > 0) && (
        <div className="border-t border-slate-700 mx-0 mt-1 px-3 py-2 flex justify-between gap-2">
          {/* Entradas */}
          <div className="flex flex-col gap-1">
            {entradas.slice(0, 5).map((n: No) => {
              const Icon = NO_ICON[n.subtipo] ?? Plug;
              return (
                <div key={n.id} className="flex items-center gap-1" title={n.nome}>
                  <div className={`w-2 h-2 rounded-full ${NO_CORES[n.subtipo] ?? 'bg-slate-400'}`} />
                  <Icon className="w-3 h-3 text-slate-400" />
                </div>
              );
            })}
            {entradas.length > 5 && (
              <div className="text-xs text-slate-500">+{entradas.length - 5}</div>
            )}
          </div>
          {/* Separador */}
          <ArrowRight className="w-4 h-4 text-slate-600 self-center" />
          {/* Saídas */}
          <div className="flex flex-col gap-1 items-end">
            {saidas.slice(0, 5).map((n: No) => {
              const Icon = NO_ICON[n.subtipo] ?? Plug;
              return (
                <div key={n.id} className="flex items-center gap-1" title={n.nome}>
                  <Icon className="w-3 h-3 text-slate-400" />
                  <div className={`w-2 h-2 rounded-full ${NO_CORES[n.subtipo] ?? 'bg-slate-400'}`} />
                </div>
              );
            })}
            {saidas.length > 5 && (
              <div className="text-xs text-slate-500">+{saidas.length - 5}</div>
            )}
          </div>
        </div>
      )}

      {/* Handle de saída (direita) */}
      <Handle type="source" position={Position.Right}
        className="!w-3 !h-3 !bg-violet-400 !border-slate-700 !border-2" />
    </div>
  );
}

const NODE_TYPES = { agente: AgentNode };

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

// ── Painel lateral de detalhes do agente ──────────────────────────────────────

interface AgentePainelProps {
  agente: AgentData;
  isGestor: boolean;
  tenantId: string;
  onClose: () => void;
  onSaved: () => void;
}

type AbaId = 'identidade' | 'memoria' | 'nos-entrada' | 'nos-saida' | 'conexoes';

function AgentePainel({ agente, isGestor, tenantId, onClose, onSaved }: AgentePainelProps) {
  const [aba, setAba] = useState<AbaId>('identidade');
  const [saving, setSaving] = useState(false);

  // Identidade
  const [nome, setNome]               = useState(agente.nome);
  const emoji                             = agente.avatar_emoji || '🤖';
  const [tipo, setTipo]               = useState(agente.tipo || 'ESPECIALISTA');
  const [status, setStatus]           = useState(agente.status || 'ativo');
  const [apiCode, setApiCode]         = useState(agente.api_code || '');
  const [funcao, setFuncao]           = useState((agente.funcao as string) || '');
  const [apiCodeUnlocked, setApiCodeUnlocked] = useState(false);
  const [senhaModal, setSenhaModal]   = useState(false);

  // Memória
  const [indice, setIndice]         = useState('');
  const [entradas, setEntradas]     = useState<Array<{ id: string; categoria: string; conteudo: string }>>([]);
  const [memoriaId, setMemoriaId]   = useState<string | null>(null);
  const [loadingMem, setLoadingMem] = useState(false);

  // Nós
  const [nosEntrada, setNosEntrada] = useState<No[]>(agente.nos_entrada ?? []);
  const [nosSaida, setNosSaida]     = useState<No[]>(agente.nos_saida ?? []);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Conexões
  const [conexoes, setConexoes] = useState<Array<{ id: string; destino_nome: string; tipo: string; frequencia: string }>>([]);
  const [loadingCon, setLoadingCon] = useState(false);

  const ABAS: { id: AbaId; label: string }[] = [
    { id: 'identidade',  label: 'Identidade' },
    { id: 'memoria',     label: 'Memória' },
    { id: 'nos-entrada', label: 'Entradas' },
    { id: 'nos-saida',   label: 'Saídas' },
    { id: 'conexoes',    label: 'Conexões' },
  ];

  // Carrega memória ao abrir aba
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

  // Carrega conexões ao abrir aba
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

  async function salvarIdentidade() {
    setSaving(true);
    await supabase.from('ia_agentes').update({
      nome, avatar_emoji: emoji, tipo, status, api_code: apiCode || null, funcao,
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
    await supabase.from('ia_agent_nos').delete()
      .eq('agent_id', agente.id).eq('tipo', tipo).eq('tenant_id', tenantId);
    if (lista.length === 0) return;
    await supabase.from('ia_agent_nos').insert(
      lista.map((n, i) => ({
        agent_id: agente.id, tenant_id: tenantId, tipo, subtipo: n.subtipo,
        posicao: i, nome: n.nome, instrucoes: n.instrucoes ?? null,
        config: n.config, ativo: n.ativo,
      }))
    );
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
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <span className="text-xl">{emoji}</span>
          <span className="font-semibold text-slate-100 text-sm truncate max-w-[260px]">{nome}</span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Abas */}
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

      {/* Conteúdo */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">

        {/* ─── Identidade ─── */}
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
              <div>
                <label className="block text-xs text-slate-400 mb-1">Código de API</label>
                {apiCodeUnlocked ? (
                  <div className="flex gap-2 items-center">
                    <input value={apiCode} onChange={e => setApiCode(e.target.value.toUpperCase())}
                      placeholder="ex: API0001"
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
          </>
        )}

        {/* ─── Memória ─── */}
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

        {/* ─── Nós de entrada ─── */}
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
            <button onClick={() => salvarNos(nosEntrada, 'entrada')}
              className="w-full py-2 bg-violet-600 hover:bg-violet-700 rounded-lg text-white text-sm font-semibold flex items-center justify-center gap-2">
              <Save className="w-4 h-4" /> Salvar entradas
            </button>
          </>
        )}

        {/* ─── Nós de saída ─── */}
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
            <button onClick={() => salvarNos(nosSaida, 'saida')}
              className="w-full py-2 bg-violet-600 hover:bg-violet-700 rounded-lg text-white text-sm font-semibold flex items-center justify-center gap-2">
              <Save className="w-4 h-4" /> Salvar saídas
            </button>
          </>
        )}

        {/* ─── Conexões ─── */}
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

// ── Modal de nova conexão ─────────────────────────────────────────────────────

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

  async function confirmar() {
    setSaving(true);
    await supabase.from('ia_agent_conexoes').upsert({
      agent_origem_id: origemId, agent_destino_id: destinoId,
      tenant_id: tenantId, tipo, frequencia, instrucoes: instrucoes || null, ativo: true,
    }, { onConflict: 'agent_origem_id,agent_destino_id' });
    setSaving(false);
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
        <div className="flex gap-3 mt-6">
          <button onClick={onCancel}
            className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200 text-sm font-semibold">
            Cancelar
          </button>
          <button onClick={confirmar} disabled={saving}
            className="flex-1 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg text-white text-sm font-semibold flex items-center justify-center gap-2">
            <Link className="w-4 h-4" /> Conectar
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
              {['ORQUESTRADOR','ESPECIALISTA','ASSISTENTE','MONITOR','AUTOMACAO'].map(t => (
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

// ── Organograma principal ─────────────────────────────────────────────────────

interface OrganogramaProps {
  onNavigate: (id: string) => void;
}

export default function Organograma({ onNavigate: _onNavigate }: OrganogramaProps) {
  const { activeProfile }                 = useProfiles();
  const isGestor                          = activeProfile?.level === 1;
  const [nodes, setNodes, onNodesChange]  = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange]  = useEdgesState<Edge>([]);
  const [tenantId, setTenantId]           = useState('');
  const [loading, setLoading]             = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<AgentData | null>(null);
  const [criarOpen, setCriarOpen]         = useState(false);
  const [conexaoModal, setConexaoModal]   = useState<{
    origemId: string; origemNome: string;
    destinoId: string; destinoNome: string;
  } | null>(null);
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
  ) {
    const nosEntradaMap: Record<string, No[]> = {};
    const nosSaidaMap:   Record<string, No[]> = {};
    for (const n of (nos ?? []) as Array<{ tipo: string; agent_id: string }>) {
      const m = n.tipo === 'entrada' ? nosEntradaMap : nosSaidaMap;
      if (!m[n.agent_id]) m[n.agent_id] = [];
      m[n.agent_id].push(n as unknown as No);
    }
    const newNodes: Node[] = ((agentes ?? []) as Array<{ id: string; pos_x?: number; pos_y?: number }>).map(a => ({
      id: a.id,
      type: 'agente',
      position: { x: a.pos_x ?? 100, y: a.pos_y ?? 100 },
      data: {
        ...a,
        nos_entrada: (nosEntradaMap[a.id] ?? []).sort((x, y) => (x.posicao ?? 0) - (y.posicao ?? 0)),
        nos_saida:   (nosSaidaMap[a.id]   ?? []).sort((x, y) => (x.posicao ?? 0) - (y.posicao ?? 0)),
      } as AgentData,
    }));
    const newEdges: Edge[] = ((conexoes ?? []) as Array<{
      id: string; agent_origem_id: string; agent_destino_id: string; tipo: string;
    }>).map(c => ({
      id: c.id,
      source: c.agent_origem_id,
      target: c.agent_destino_id,
      label: c.tipo,
      animated: c.tipo === 'consulta',
      style: { stroke: c.tipo === 'consulta' ? '#8b5cf6' : '#ef4444', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: c.tipo === 'consulta' ? '#8b5cf6' : '#ef4444' },
    }));
    setNodes(newNodes);
    setEdges(newEdges);
  }

  async function carregar(tid: string) {
    setLoading(true);
    const [{ data: agentes }, { data: nos }, { data: conexoes }] = await Promise.all([
      supabase.from('ia_agentes').select('*').eq('tenant_id', tid),
      supabase.from('ia_agent_nos').select('*').eq('tenant_id', tid),
      supabase.from('ia_agent_conexoes').select('*').eq('tenant_id', tid).eq('ativo', true),
    ]);
    buildCanvas(agentes, nos, conexoes);
    setLoading(false);
  }

  async function recarregar(tid: string) {
    const [{ data: agentes }, { data: nos }, { data: conexoes }] = await Promise.all([
      supabase.from('ia_agentes').select('*').eq('tenant_id', tid),
      supabase.from('ia_agent_nos').select('*').eq('tenant_id', tid),
      supabase.from('ia_agent_conexoes').select('*').eq('tenant_id', tid).eq('ativo', true),
    ]);
    buildCanvas(agentes, nos, conexoes);
  }

  const onConnect = useCallback(async (params: Connection) => {
    if (!params.source || !params.target || params.source === params.target) return;
    const origem  = nodes.find(n => n.id === params.source);
    const destino = nodes.find(n => n.id === params.target);
    if (!origem || !destino) return;
    setConexaoModal({
      origemId:   params.source,
      origemNome: (origem.data as AgentData).nome,
      destinoId:  params.target,
      destinoNome:(destino.data as AgentData).nome,
    });
  }, [nodes]);

  function onNodeDragStop(_: React.MouseEvent, node: Node) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      supabase.from('ia_agentes')
        .update({ pos_x: node.position.x, pos_y: node.position.y })
        .eq('id', node.id)
        .then(() => {});
    }, 800);
  }

  function onNodeClick(_: React.MouseEvent, node: Node) {
    setSelectedAgent(node.data as AgentData);
  }

  function onPaneClick() {
    setSelectedAgent(null);
  }

  async function onConexaoConfirm() {
    setConexaoModal(null);
    await recarregar(tenantId);
  }

  function onAgenteSaved() {
    void recarregar(tenantId);
  }

  async function onAgenteCreated(id: string) {
    setCriarOpen(false);
    await carregar(tenantId);
    const agente = nodes.find(n => n.id === id);
    if (agente) setSelectedAgent(agente.data as AgentData);
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
          <button onClick={() => setCriarOpen(true)}
            className="flex items-center gap-2 px-3 py-2 bg-violet-600 hover:bg-violet-700 rounded-xl text-white text-sm font-semibold shadow-lg">
            <Plus className="w-4 h-4" /> Novo agente
          </button>
          {nodes.length === 0 && (
            <div className="px-3 py-2 bg-slate-800/80 rounded-xl text-slate-400 text-xs border border-slate-700">
              Nenhum agente criado ainda
            </div>
          )}
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={NODE_TYPES}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          colorMode="dark"
          className="bg-slate-950"
        >
          <Background color="#334155" gap={24} size={1} />
          <Controls className="!bg-slate-800 !border-slate-700 !rounded-xl" />
          <MiniMap
            nodeColor={(n) => {
              const d = n.data as AgentData;
              return d.status === 'ativo' ? '#7c3aed' : '#475569';
            }}
            className="!bg-slate-800 !border-slate-700 !rounded-xl"
          />
        </ReactFlow>

        {/* Dica de conexão */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 bg-slate-800/80 rounded-full text-xs text-slate-400 border border-slate-700 pointer-events-none">
          Arraste entre handles para conectar agentes · Clique num card para editar
        </div>
      </div>

      {/* Painel lateral */}
      {selectedAgent && (
        <AgentePainel
          agente={selectedAgent}
          isGestor={isGestor}
          tenantId={tenantId}
          onClose={() => setSelectedAgent(null)}
          onSaved={onAgenteSaved}
        />
      )}

      {/* Modal de conexão */}
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
      {criarOpen && (
        <CriarAgenteModal
          tenantId={tenantId}
          onCreated={onAgenteCreated}
          onCancel={() => setCriarOpen(false)}
        />
      )}
    </div>
  );
}
