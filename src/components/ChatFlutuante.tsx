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
  if (path.includes('/crm'))      return 'CRM — seções: Dashboard, Clientes, Orçamentos, Funil de Vendas, Gestão de Funis, Agenda, Compromissos, Negociações, Metas e OKRs, Atividades, CRM Live, Omnichannel Inbox, Customer Success, Escuta Inteligente, IA CRM, Inteligência de Leads, Relatórios, People Analytics, Automação de Tarefas, Flow Builder, Campos Personalizados, Equipes e Territórios';
  if (path.includes('/erp'))      return 'ERP — sub-módulos: OPERAÇÕES (Pedido de Venda, Estoque, Caixa, Clientes, Fornecedores, Produtos, Ordem de Serviço), FINANCEIRO (Faturamento, Contas a Receber, Contas a Pagar, Fluxo de Caixa, Tesouraria, Árvore de Custos), ADMINISTRATIVO (Tarefas, Automações), PLANEJAMENTO (Projetos, Métricas)';
  if (path.includes('/hr') || path.includes('/rh')) return 'RH — seções: Funcionários, Organograma, Cargos e Salários, Vagas (ATS), Onboarding Digital, Admissão, Folha de Ponto, Escalas, Horas Extras, Banco de Horas, Alterações de Ponto, Central de Folha, Detalhamento Individual (holerite), Gestão de Férias, Benefícios, Produtividade, Anotações e Advertências, Desempenho e Sucessão, Portal do Colaborador, Viagens e Despesas, SST, Offboarding e Rescisão, People Analytics ZIA';
  if (path.includes('/eam'))      return 'EAM — seções: Dashboard, Ativos, Movimentações, Ordens de Serviço, Inventário, Seguros, Relatórios, Configurações';
  if (path.includes('/scm'))      return 'SCM — seções: Dashboard, Roteirização com IA, Gestão de Frota, TMS (Fretes), Rastreamento Last-Mile, Gestão de Docas (WMS), Embalagem e Packing, Cross-Docking, Logística Reversa, Auditoria de Fretes';
  if (path.includes('/settings')) return 'Configurações — seções: [Sistema] Preferências, Módulos Ativos, Aparência; [Organização] Empresas e Filiais, Perfis e Acessos, Segurança (alterar senha / 2FA); [Dados e Integrações] Integrações (WhatsApp/Flowise/N8N/Make/Webhook), Backup e Dados; [Alertas] Alertas; [Inteligência Artificial] Configuração da IA, API & IAs';
  if (path.includes('/ia'))       return 'Módulo IA — seções: Chat com ZIA, Quartel General, Histórico, Meus Agentes, Monitor, Modelos de IA, Solicitações, Permissões, Configurações';
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

MAPA DE NAVEGACAO EXATO (use sempre este mapa para orientar o usuario — nunca invente caminhos):

CONFIGURACOES (icone engrenagem no menu lateral):
  [Sistema]
    • Preferencias — personalizar preferencias gerais do sistema
    • Modulos Ativos — ativar ou desativar modulos
    • Aparencia — alterar tema (claro/escuro) e cores
  [Organizacao]
    • Empresas e Filiais — cadastrar e gerenciar empresas e filiais
    • Perfis e Acessos — criar e gerenciar usuarios e seus perfis de acesso
    • Seguranca — ALTERAR SENHA do usuario, ativar autenticacao em dois fatores (2FA)
  [Dados e Integracoes]
    • Integracoes — configurar WhatsApp (Z-API/Twilio), Flowise, N8N, Make, Webhook
    • Backup e Dados — exportar/importar dados
  [Alertas]
    • Alertas — configurar alertas e notificacoes do sistema
  [Inteligencia Artificial]
    • Configuracao da IA — personalizar nome, persona e instrucoes da ZIA
    • API & IAs — gerenciar chaves de API inbound/outbound para agentes externos

CRM (icone roxo — Vendas & CRM):
  [Visao Geral] Dashboard · Clientes
  [Vendas e Funil] Orcamentos · Funil de Vendas · Gestao de Funis · Agenda · Compromissos
    · Negociacoes · Metas e OKRs · Atividades · CRM Live (tempo real)
  [Comunicacao] Omnichannel Inbox · Customer Success · Social Listening
    · Portal de Parceiros · Escuta Inteligente (transcricao em tempo real com 4 agentes IA)
  [Inteligencia e Dados] IA CRM · Inteligencia de Leads · Relatorios Avancados · People Analytics
  [Automacao] Automacao de Tarefas · Flow Builder · Gestao de Atividades
  [Configuracoes CRM] Campos Personalizados · Equipes e Territorios · Integracoes Externas

ERP (icone slate):
  Sub-modulo OPERACOES (azul): Pedido de Venda · Pedido de Devolucao · Demonstracao · Revenda
    · Consulta de Estoque · Entrada de Estoque · Saida de Estoque · Caixa
    · Clientes · Fornecedores · Produtos · Grupos de Produtos
    · Atendimento · Caso · Ordem de Servico
  Sub-modulo FINANCEIRO (verde): Faturamento · Pedidos de Clientes · Propostas
    · Contas a Receber · Contas a Pagar · Fluxo de Caixa · Tesouraria · Relatorios Financeiros
    · Arvore de Custos · Custos por Produto · Analise de Margem
  Sub-modulo ADMINISTRATIVO (violeta): Gestao de Atividades · Gerir Tarefas · Automacoes
  Sub-modulo PLANEJAMENTO (ambar): Projetos · Metricas · Grupos · Cadeias · Monitoramento

RH (icone rosa — Recursos Humanos):
  [Estrutura Organizacional] Funcionarios · Organograma · Cargos e Salarios · Grupos de Funcionarios
  [Recrutamento e Entrada] Vagas (ATS) · Onboarding Digital · Admissao de Funcionario · Gestao de Terceiros
  [Jornada e Ponto] Folha de Ponto · Escalas · Horas Extras · Banco de Horas
    · Alteracoes de Ponto · Faltas e Ausencias · Alertas de Ponto
  [Remuneracao e Folha] Central de Folha · Grupos de Folha · Detalhamento Individual (holerite)
    · Gestao de Ferias · Beneficios
  [Atividades e Produtividade] Gestao de Atividades · Produtividade · Anotacoes e Advertencias
  [Desenvolvimento e Saude] Desempenho e Sucessao · Portal do Colaborador
    · Viagens e Despesas · SST (Seguranca e Saude no Trabalho)
  [Desligamento e IA] Offboarding e Rescisao · People Analytics ZIA

EAM (icone azul — Gestao de Ativos):
  Dashboard · Ativos · Movimentacoes · Ordens de Servico (manutencao preventiva e corretiva)
  · Inventario · Seguros · Relatorios · Configuracoes

SCM (icone verde — Logistica & Supply Chain):
  Dashboard · Roteirizacao com IA · Gestao de Frota · TMS (Fretes) · Rastreamento Last-Mile
  · Gestao de Docas (WMS) · Embalagem e Packing · Cross-Docking · Logistica Reversa · Auditoria de Fretes

IA (icone violeta — IA Omnisystem):
  Chat com ZIA · Quartel General · Historico · Meus Agentes · Monitor · Modelos de IA
  · Solicitacoes (aprovacoes pendentes) · Permissoes · Configuracoes

COMO NAVEGAR:
- Menu lateral esquerdo: icones dos modulos (CRM roxo, RH rosa, EAM azul, SCM verde, ERP slate, IA violeta, engrenagem=Configuracoes)
- Dentro de cada modulo: sidebar com secoes agrupadas
- Para criar registros: botao "+" ou "Novo" em cada listagem

REGRAS:
- Seja conciso. Use **negrito** para termos importantes, nomes de campos e botoes.
- Instrucoes de navegacao: "Va em **Modulo → Secao**" usando APENAS caminhos do mapa acima.
- Nunca invente secoes ou caminhos que nao estejam no mapa.
- Nao execute acoes — apenas oriente.
- Se o problema for tecnico critico, sugira: "Entre em contato com o suporte em suporte@ziasystem.com.br"
- Responda sempre em portugues brasileiro.

FORMATO DE RESPOSTA: Retorne APENAS JSON no formato {"resposta": "texto da resposta aqui"}.
Nunca inclua outros campos como "protocolo" no JSON de resposta.`;

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
      const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text
        ?? 'Desculpe, não consegui processar. Tente novamente.';
      let reply = raw;
      try {
        const parsed = JSON.parse(raw);
        reply = parsed.resposta ?? parsed.response ?? parsed.message ?? parsed.text ?? raw;
      } catch { /* texto puro, usar como está */ }

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
