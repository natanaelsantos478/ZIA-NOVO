// ─────────────────────────────────────────────────────────────────────────────
// ChatFlutuante — Popup de suporte IA persistente em todas as páginas
// Protocolo único por atendimento + histórico salvo no Supabase
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Sparkles, X, Send, Loader2, RotateCcw, ChevronDown } from 'lucide-react';
import { useProfiles } from '../context/ProfileContext';
import { supabase } from '../lib/supabase';

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function generateProtocol(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let r = 'ZIA-';
  for (let i = 0; i < 6; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return r;
}

function getTenantId(): string {
  return localStorage.getItem('zia_active_entity_id_v1') || '00000000-0000-0000-0000-000000000001';
}

function moduleFromPath(path: string): string {
  if (path.includes('/crm'))      return 'CRM (negociações, pipeline, clientes, prospecção, escuta inteligente)';
  if (path.includes('/erp'))      return 'ERP (financeiro, produtos, estoque, orçamentos, NF-e)';
  if (path.includes('/hr') || path.includes('/rh')) return 'RH (funcionários, folha, férias, contratos, ponto)';
  if (path.includes('/eam'))      return 'EAM (ativos, manutenção, depreciação)';
  if (path.includes('/scm'))      return 'SCM (fornecedores, compras, recebimento)';
  if (path.includes('/settings')) return 'Configurações (integrações, API keys, empresas, perfil)';
  if (path.includes('/ia'))       return 'Módulo IA (agentes, Zeus, automações)';
  return 'Página inicial / ZIA Omnisystem';
}

// Renderização simples de markdown: **negrito**, \n→<br>
function renderMd(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part.split('\n').map((line, j, arr) => (
      <span key={`${i}-${j}`}>{line}{j < arr.length - 1 ? <br /> : null}</span>
    ));
  });
}

// ── Prompt de sistema ─────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Voce e a ZIA, assistente virtual de suporte do ZIA Omnisystem — ERP+CRM+RH+EAM+SCM+IA para PMEs brasileiras.

MODULOS DO SOFTWARE:
- CRM: Pipeline kanban de negociacoes, cadastro de clientes, agenda de compromissos, anotacoes, orcamentos visuais, Prospeccao IA (busca empresas na web + valida CNPJ + dispara WhatsApp em cascata), Escuta Inteligente (transcricao de atendimento em tempo real com 4 agentes IA), IA CRM (chat que executa acoes reais no CRM com aprovacao do usuario).
- ERP: Financeiro (contas a pagar/receber, fluxo de caixa, DRE, centros de custo), Produtos e Estoque (grupos, codigos, fotos, estoque minimo), Orcamentos (editor canvas visual, campos dinamicos, assinatura digital), Notas Fiscais (NF-e, NFS-e com foco em integracao), Vendas e Comissoes, Assinaturas recorrentes.
- RH: Cadastro de funcionarios, Folha de pagamento, Ferias, Contratos, Ponto eletronico, Admissao e Demissao, Comissoes por grupo de produto.
- EAM: Cadastro de ativos/equipamentos, Ordens de manutencao preventiva e corretiva, Depreciacao automatica, Alertas de manutencao, Responsaveis.
- SCM: Fornecedores, Pedidos de compra, Recebimento de mercadoria, Gestao de estoque.
- IA: Agentes configuráveis, Zeus (orquestrador de agentes), integracao com Flowise, API Keys para agentes externos, webhooks.
- Configuracoes: Integracoes externas (WhatsApp Z-API/Twilio, Flowise, N8N, Make, Webhook), API Keys inbound/outbound, Perfil de usuario, Empresas/filiais (multi-tenant), Google OAuth.

COMO NAVEGAR:
- Menu lateral esquerdo: icones dos modulos (CRM roxo, RH rosa, EAM azul, SCM verde, ERP slate, IA violeta, Settings)
- Dentro de cada modulo: sidebar com secoes agrupadas
- Para criar registros: botao "+" ou "Novo" em cada listagem

REGRAS:
- Seja conciso. Use **negrito** para termos importantes e nomes de campos/botoes.
- Instrucoes de navegacao: "Va em **Modulo → Secao → Acao**"
- Nao execute acoes — apenas oriente.
- Se o problema for tecnico critico, sugira: "Entre em contato com o suporte em suporte@ziasystem.com.br"
- Responda sempre em portugues brasileiro.`;

// ── Componente ────────────────────────────────────────────────────────────────

export default function ChatFlutuante() {
  const location = useLocation();
  const { activeProfile } = useProfiles();

  const [open, setOpen]             = useState(false);
  const [msgs, setMsgs]             = useState<ChatMsg[]>([]);
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [protocolo, setProtocolo]   = useState('');
  const [unread, setUnread]         = useState(false);

  const conversaIdRef  = useRef<string | null>(null);
  const protocoloRef   = useRef('');
  const bottomRef      = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);
  const saveTimer      = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Inicializa protocolo e mensagem de boas-vindas na primeira abertura
  useEffect(() => {
    if (!open || msgs.length > 0) return;
    const proto = generateProtocol();
    setProtocolo(proto);
    protocoloRef.current = proto;
    setMsgs([{
      role: 'assistant',
      content: `Olá! Sou a **ZIA**, sua assistente de suporte. 👋\n\nSeu protocolo de atendimento é: **${proto}**\n\nVocê tem um número de protocolo anterior? Se sim, informe-o e continuarei de onde paramos. Caso contrário, é só perguntar!`,
    }]);
  }, [open, msgs.length]);

  // Auto-scroll
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, open]);

  // Foco no input ao abrir
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  // Auto-save (debounced 800ms)
  useEffect(() => {
    if (msgs.length < 2) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const saveable = msgs.map(m => ({ role: m.role, content: m.content }));
      if (conversaIdRef.current) {
        await supabase.from('ia_suporte_conversas')
          .update({ mensagens: saveable, updated_at: new Date().toISOString() })
          .eq('id', conversaIdRef.current);
      } else {
        const { data } = await supabase.from('ia_suporte_conversas')
          .insert({ tenant_id: getTenantId(), protocolo: protocoloRef.current, mensagens: saveable })
          .select('id').single();
        if (data) conversaIdRef.current = data.id;
      }
    }, 800);
    return () => clearTimeout(saveTimer.current);
  }, [msgs]);

  const tryLoadProtocol = useCallback(async (proto: string) => {
    const { data } = await supabase
      .from('ia_suporte_conversas')
      .select('*')
      .eq('protocolo', proto.trim().toUpperCase())
      .single();
    return data;
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMsg = { role: 'user', content: text.trim() };
    const currentMsgs = [...msgs, userMsg];
    setMsgs(currentMsgs);
    setInput('');
    setLoading(true);

    try {
      // Detecta se é um protocolo sendo informado (nas primeiras trocas)
      const protoPattern = /^ZIA-[A-Z0-9]{6}$/i;
      if (protoPattern.test(text.trim()) && msgs.length <= 2) {
        const existing = await tryLoadProtocol(text.trim());
        if (existing) {
          conversaIdRef.current = existing.id;
          const loadedMsgs = (existing.mensagens as ChatMsg[]);
          const continueMsg: ChatMsg = {
            role: 'assistant',
            content: `Protocolo **${text.trim().toUpperCase()}** encontrado! ✅\n\nRetomei seu atendimento anterior (${loadedMsgs.length} mensagem(ns)). Como posso continuar ajudando?`,
          };
          setMsgs([...loadedMsgs, continueMsg]);
          setLoading(false);
          return;
        } else {
          setMsgs([...currentMsgs, {
            role: 'assistant',
            content: `Não encontrei o protocolo **${text.trim().toUpperCase()}**. Pode ter expirado ou estar incorreto.\n\nSeu atendimento atual segue com o protocolo **${protocoloRef.current}**. Como posso ajudar?`,
          }]);
          setLoading(false);
          return;
        }
      }

      // Resposta normal da IA
      const modulo = moduleFromPath(location.pathname);
      const historico = currentMsgs.slice(-10)
        .map(m => `${m.role === 'user' ? 'USUÁRIO' : 'ZIA'}: ${m.content}`)
        .join('\n');

      const prompt = `${SYSTEM_PROMPT}

MÓDULO ATUAL DO USUÁRIO: ${modulo}
PROTOCOLO: ${protocoloRef.current}

HISTÓRICO:
${historico}

Responda à última mensagem do usuário de forma útil e concisa.`;

      const { data, error } = await supabase.functions.invoke('ai-proxy', {
        body: { type: 'gemini-text', prompt },
      });

      if (error) throw new Error(error.message);
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text
        ?? 'Desculpe, não consegui processar. Tente novamente.';

      setMsgs(prev => [...prev, { role: 'assistant', content: reply }]);
      if (!open) setUnread(true);
    } catch (e) {
      setMsgs(prev => [...prev, {
        role: 'assistant',
        content: `Erro ao processar: ${(e as Error).message}`,
      }]);
    } finally {
      setLoading(false);
    }
  }, [msgs, loading, location.pathname, tryLoadProtocol, open]);

  const reset = useCallback(() => {
    const proto = generateProtocol();
    setProtocolo(proto);
    protocoloRef.current = proto;
    conversaIdRef.current = null;
    setMsgs([{
      role: 'assistant',
      content: `Novo atendimento iniciado. Seu protocolo é: **${proto}**\n\nComo posso ajudar?`,
    }]);
  }, []);

  const handleOpen = useCallback(() => {
    setOpen(p => !p);
    setUnread(false);
  }, []);

  // Não renderizar sem perfil ativo ou dentro da própria tela de IA
  if (!activeProfile) return null;
  if (location.pathname.startsWith('/ia') || location.pathname.startsWith('/app/ia')) return null;

  const SUGGESTIONS = [
    'Como criar uma negociação no CRM?',
    'Como configurar integração WhatsApp?',
    'Como cadastrar um produto?',
    'Como emitir uma NF-e?',
  ];

  return (
    <>
      {/* ── Popup ──────────────────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 w-[380px] flex flex-col bg-white rounded-2xl shadow-2xl shadow-indigo-900/20 border border-slate-100 overflow-hidden"
          style={{ maxHeight: 'calc(100vh - 120px)' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-700 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white leading-tight">ZIA Suporte</p>
              {protocolo && (
                <p className="text-[10px] text-white/70 font-mono tracking-wider">{protocolo}</p>
              )}
            </div>
            <button onClick={reset} title="Novo atendimento"
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
              <RotateCcw className="w-3.5 h-3.5 text-white/80" />
            </button>
            <button onClick={() => setOpen(false)}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar" style={{ minHeight: 0 }}>
            {msgs.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-3 h-3 text-violet-600" />
                  </div>
                )}
                <div className={`max-w-[82%] rounded-2xl px-3 py-2.5 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-sm'
                    : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                }`}>
                  {renderMd(msg.content)}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 justify-start">
                <div className="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-3 h-3 text-violet-600" />
                </div>
                <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-3 py-2.5 flex items-center gap-2">
                  <Loader2 className="w-3 h-3 text-slate-400 animate-spin" />
                  <span className="text-xs text-slate-400">Digitando...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Sugestões rápidas */}
          {msgs.length === 1 && !loading && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => sendMessage(s)}
                  className="text-[10px] bg-slate-50 border border-slate-200 hover:border-indigo-300 hover:text-indigo-700 text-slate-600 px-2.5 py-1 rounded-full transition-colors">
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 pb-3 pt-1 shrink-0">
            <div className="flex gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2 focus-within:border-indigo-400 transition-colors">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
                }}
                placeholder="Dúvida ou protocolo anterior (ZIA-XXXXXX)..."
                className="flex-1 text-xs text-slate-800 placeholder-slate-400 resize-none focus:outline-none bg-transparent leading-relaxed"
                style={{ maxHeight: '80px' }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className="p-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg shrink-0 transition-colors self-end"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[9px] text-slate-400 text-center mt-1">
              Protocolo salvo automaticamente
            </p>
          </div>
        </div>
      )}

      {/* ── Botão flutuante ────────────────────────────────────────────────── */}
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-violet-600 to-indigo-700 rounded-full shadow-lg shadow-indigo-900/50 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
        title="Abrir ZIA — Assistente IA"
        aria-label="Abrir ZIA — Assistente IA"
      >
        {open
          ? <ChevronDown className="w-6 h-6 text-white" />
          : <Sparkles className="w-6 h-6 text-white" />
        }
        {unread && !open && (
          <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white" />
        )}
      </button>
    </>
  );
}
