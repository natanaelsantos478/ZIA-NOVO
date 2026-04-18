// ─────────────────────────────────────────────────────────────────────────────
// CRM — IA Geral (Assistente de CRM com acesso total)
// Chat com IA que pode ler e modificar negociações, compromissos, anotações.
// Todas as alterações passam por popup de confirmação antes de serem aplicadas.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Sparkles, Send, Loader2, X, Check, AlertTriangle,
  ChevronUp, Briefcase, Calendar, FileText, StickyNote, CheckCircle2,
  RefreshCw, Paperclip, User, Camera, Image as ImageIcon, Package,
  MessageCircle, History, PlusCircle, MessageSquare, Trash2,
} from 'lucide-react';
import {
  getAllNegociacoes, updateNegociacao, addCompromisso, addAnotacao,
  toggleCompromissoConcluido, setOrcamento, type NegociacaoData, type ItemOrcamento,
} from '../data/crmData';
import { updateProduto, getProdutos, type ErpProduto } from '../../../lib/erp';
import { useAIConfig } from '../../../context/AIConfigContext';
import { supabase } from '../../../lib/supabase';
import {
  getWhatsappKey, listarChats, lerMensagens, enviarTexto,
  type WhatsappChat, type WhatsappMensagem,
} from '../../../lib/whatsapp';
import { useProfiles } from '../../../context/ProfileContext';
import { useCompanies } from '../../../context/CompaniesContext';
import type { ApiKey } from '../../../lib/apiKeys';

// ── Tipos ─────────────────────────────────────────────────────────────────────

type ActionType =
  | 'update_negociacao'
  | 'add_compromisso'
  | 'add_anotacao'
  | 'toggle_compromisso'
  | 'update_etapa'
  | 'update_status'
  | 'create_orcamento'
  | 'update_produto'
  | 'send_whatsapp';

type ToolType = 'ler_whatsapp' | 'listar_whatsapp';

interface PendingAction {
  id: string;
  tipo: ActionType;
  descricao: string;    // texto legível para o usuário
  negociacaoId?: string;
  negociacaoNome?: string;
  produtoId?: string;
  payload: Record<string, unknown>;
}

interface MsgImage { name: string; dataUrl: string; mimeType: string; }

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  actions?: PendingAction[];
  applied?: boolean;
  file?: { name: string; content: string };
  images?: MsgImage[];
}

interface ConversaResumo {
  id: string;
  titulo: string;
  created_at: string;
  updated_at: string;
}

// ── Helpers — chamadas via ai-proxy (chave Gemini fica no servidor) ──────────

async function gemini(prompt: string, usePro = false): Promise<string> {
  const { data, error } = await supabase.functions.invoke('ai-proxy', {
    body: { type: 'gemini-text', prompt, usePro },
  });
  if (error) return '{}';
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
}

async function geminiVisual(
  prompt: string,
  images: { mimeType: string; data: string }[],
  usePro = false,
): Promise<string> {
  const { data, error } = await supabase.functions.invoke('ai-proxy', {
    body: { type: 'gemini-visual', prompt, images, usePro },
  });
  if (error) return '{}';
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
}

// ── Prompt Builder ────────────────────────────────────────────────────────────
function buildPrompt(
  userMsg: string,
  dados: NegociacaoData[],
  history: ChatMessage[],
  produtos: ErpProduto[],
  anexo?: string,
  wpChats?: WhatsappChat[],
  wpEnabled?: boolean,
  wpContext?: { phone: string; mensagens: WhatsappMensagem[] } | null,
): string {
  const resumo = dados.slice(0, 30).map(d => ({
    id:           d.negociacao.id,
    cliente:      d.negociacao.clienteNome,
    status:       d.negociacao.status,
    etapa:        d.negociacao.etapa,
    valor:        d.negociacao.valor_estimado,
    prob:         d.negociacao.probabilidade,
    responsavel:  d.negociacao.responsavel,
    compromissos: d.compromissos.length,
    anotacoes:    d.anotacoes.length,
  }));

  const historyText = history.slice(-6).map(m => `${m.role === 'user' ? 'USUÁRIO' : 'IA'}: ${m.content}`).join('\n');

  const produtosResumo = produtos.slice(0, 50).map(p => ({
    id: p.id,
    nome: p.nome,
    codigo: p.codigo_interno,
    preco_venda: p.preco_venda,
    preco_custo: p.preco_custo,
    estoque: p.estoque_atual,
    ativo: p.ativo,
  }));

  const wpResumo = (wpChats ?? []).slice(0, 30).map(c => ({
    telefone: c.phone,
    nome: c.name ?? '',
    ultima: (c.lastMessage ?? '').slice(0, 80),
    quando: c.lastMessageAt ?? '',
    naoLidas: c.unread ?? 0,
  }));

  const wpBlock = wpEnabled
    ? `INTEGRACAO WHATSAPP: ATIVA (${wpChats?.length ?? 0} conversas carregadas)
CONVERSAS RECENTES (primeiras 30):
${JSON.stringify(wpResumo)}
${wpContext ? `\nMENSAGENS DA CONVERSA COM ${wpContext.phone} (ultimas ${wpContext.mensagens.length}):\n${JSON.stringify(wpContext.mensagens.map(m => ({ de: m.fromMe ? 'eu' : 'contato', texto: m.text, quando: m.timestamp })))}\n` : ''}`
    : 'INTEGRACAO WHATSAPP: NAO CONFIGURADA (configure em Configuracoes -> Integracoes com tipo "whatsapp")';

  return `Voce e a IA geral do CRM ZIA. Voce tem acesso completo aos dados de negociacoes, compromissos, anotacoes, PRODUTOS, WHATSAPP e pode sugerir e EXECUTAR alteracoes reais no banco de dados.

DADOS ATUAIS DAS NEGOCIACOES (ultimas 30):
${JSON.stringify(resumo)}

CATALOGO DE PRODUTOS (primeiros 50):
${JSON.stringify(produtosResumo)}

${wpBlock}

HISTORICO RECENTE:
${historyText}

${anexo ? `CONTEUDO DO ARQUIVO ANEXADO:\n${anexo}\n` : ''}MENSAGEM DO USUARIO: ${userMsg}

Analise a mensagem e retorne JSON com:
{
  "resposta": "texto da sua resposta em portugues (markdown permitido)",
  "acoes": [
    {
      "id": "uuid curto unico",
      "tipo": "update_negociacao|add_compromisso|add_anotacao|toggle_compromisso|update_etapa|update_status|create_orcamento|update_produto|send_whatsapp",
      "descricao": "frase descrevendo exatamente o que sera feito",
      "negociacao_id": "id da negociacao afetada ou null",
      "negociacao_nome": "nome do cliente ou null",
      "produto_id": "id do produto afetado ou null",
      "payload": { "campo": "valor" }
    }
  ],
  "ferramenta": {
    "tipo": "ler_whatsapp",
    "telefone": "DDDNumero sem formatacao (ex: 5511999999999)"
  }
}

TIPOS DE ACAO:
- update_negociacao: payload={campo: valor} — pode alterar qualquer campo da negociacao
- add_compromisso: negociacao_id pode ser null para compromissos gerais (agenda pessoal sem negociacao vinculada). payload={clienteNome, titulo, data(YYYY-MM-DD), hora(HH:MM), duracao(min), tipo(reuniao|ligacao|visita|followup|outro), notas}
- add_anotacao: payload={tipo(anotacao|tarefa), conteudo, dataPrazo(YYYY-MM-DD ou null), criadoPor:"ia"}
- toggle_compromisso: payload={compromisso_id}
- update_etapa: payload={etapa: prospeccao|qualificacao|proposta|negociacao|fechamento}
- update_status: payload={status: aberta|ganha|perdida|suspensa}
- create_orcamento: payload={condicao_pagamento, desconto_global_pct(0-100), frete(valor), validade(YYYY-MM-DD), observacoes, itens:[{produto_nome, codigo(""), unidade("UN"), quantidade, preco_unitario, desconto_pct(0-100)}]}
- update_produto: produto_id="id do produto", payload={preco_venda: novo_valor, preco_custo: novo_valor, nome: novo_nome, estoque_atual: nova_qtd, ativo: true/false} — ALTERA REALMENTE o produto no banco. Use o id exato do produto do catalogo acima.
- send_whatsapp: payload={telefone: "5511999999999", mensagem: "texto a enviar"} — ENVIA mensagem WhatsApp real via Z-API/Twilio configurado. Requer aprovacao do usuario.

FERRAMENTA ler_whatsapp (leitura silenciosa, nao pede aprovacao):
- Se o usuario pedir para ler/ver/analisar mensagens de uma conversa especifica, retorne ferramenta: {tipo:"ler_whatsapp", telefone:"numeroSemFormato"}.
- O sistema busca as mensagens e te reenvia com o contexto. Nesse caso, resposta pode ser vazia ou "Buscando conversa...".
- Use apenas quando precisar ver mensagens que nao estao no resumo acima. Se o usuario so pede a lista de conversas, ja temos no contexto — apenas responda.

REGRAS CRITICAS:
- update_produto REQUER produto_id preenchido com o id real do produto do catalogo
- So sugira acoes quando o usuario pedir algo que requer mudanca
- Se for apenas uma pergunta, retorne acoes=[]
- Seja preciso nas descricoes das acoes (o usuario vai aprovar antes de aplicar)
- Nao invente IDs — use somente IDs que existem nos dados acima
- Data de hoje: ${new Date().toISOString().slice(0, 10)}`;
}

// ── Popup de confirmação ───────────────────────────────────────────────────────
function ConfirmModal({
  actions, onConfirm, onCancel, applying,
}: {
  actions: PendingAction[];
  onConfirm: (selected: Set<string>) => void;
  onCancel: () => void;
  applying: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(actions.map(a => a.id)));

  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const ICON: Record<ActionType, typeof Briefcase> = {
    update_negociacao:  Briefcase,
    add_compromisso:    Calendar,
    add_anotacao:       StickyNote,
    toggle_compromisso: CheckCircle2,
    update_etapa:       ChevronUp,
    update_status:      RefreshCw,
    create_orcamento:   FileText,
    update_produto:     Package,
    send_whatsapp:      MessageCircle,
  };

  const LABEL: Record<ActionType, string> = {
    update_negociacao:  'Atualizar negociação',
    add_compromisso:    'Criar compromisso',
    add_anotacao:       'Adicionar anotação',
    toggle_compromisso: 'Marcar compromisso',
    update_etapa:       'Alterar etapa',
    update_status:      'Alterar status',
    create_orcamento:   'Criar orçamento',
    update_produto:     'Atualizar produto',
    send_whatsapp:      'Enviar WhatsApp',
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">Confirmar alterações da IA</p>
              <p className="text-xs text-slate-500">Selecione quais ações aplicar</p>
            </div>
          </div>
          <button onClick={onCancel}><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {actions.map(action => {
            const Icon = ICON[action.tipo] ?? FileText;
            const isSelected = selected.has(action.id);
            return (
              <button key={action.id} onClick={() => toggle(action.id)}
                className={`w-full flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                  isSelected ? 'border-purple-500 bg-purple-50' : 'border-slate-100 bg-slate-50 opacity-60'
                }`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-purple-100' : 'bg-slate-100'}`}>
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-purple-600' : 'text-slate-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold uppercase tracking-wide mb-0.5 ${isSelected ? 'text-purple-600' : 'text-slate-400'}`}>
                    {LABEL[action.tipo]}
                  </p>
                  <p className="text-sm text-slate-800 font-medium leading-snug">{action.descricao}</p>
                  {action.negociacaoNome && (
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                      <User className="w-3 h-3" />{action.negociacaoNome}
                    </p>
                  )}
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                  isSelected ? 'border-purple-500 bg-purple-500' : 'border-slate-300'
                }`}>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
              </button>
            );
          })}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
            Cancelar
          </button>
          <button onClick={() => onConfirm(selected)} disabled={selected.size === 0 || applying}
            className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold">
            {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Aplicar {selected.size} ação(ões)
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function IACrm() {
  const { systemContext } = useAIConfig();
  const { activeProfile } = useProfiles();
  const { scopeIds: getScopeIds } = useCompanies();
  const [dados, setDados]           = useState<NegociacaoData[]>([]);
  const [produtos, setProdutos]     = useState<ErpProduto[]>([]);
  const [wpKey, setWpKey]           = useState<ApiKey | null>(null);
  const [wpChats, setWpChats]       = useState<WhatsappChat[]>([]);
  const [loading, setLoading]       = useState(true);
  const [msgs, setMsgs]             = useState<ChatMessage[]>([{
    role: 'assistant',
    content: 'Olá! Sou a IA geral do CRM. Posso consultar negociações, criar compromissos, adicionar anotações e muito mais. O que você precisa?',
  }]);
  const [input, setInput]           = useState('');
  const [thinking, setThinking]     = useState(false);
  const [pendingActions, setPendingActions] = useState<PendingAction[] | null>(null);
  const [pendingMsgIdx, setPendingMsgIdx]   = useState<number | null>(null);
  const [applying, setApplying]     = useState(false);
  const [anexo, setAnexo]           = useState<{ name: string; content: string } | null>(null);
  const [imagens, setImagens]       = useState<MsgImage[]>([]);
  const [imgMenu, setImgMenu]       = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [conversas, setConversas]   = useState<ConversaResumo[]>([]);
  const [conversaId, setConversaId] = useState<string | null>(null);
  const conversaIdRef               = useRef<string | null>(null);
  const fileRef                     = useRef<HTMLInputElement>(null);
  const galeriaRef                  = useRef<HTMLInputElement>(null);
  const cameraRef                   = useRef<HTMLInputElement>(null);
  const bottomRef                   = useRef<HTMLDivElement>(null);

  const INITIAL_MSG: ChatMessage = {
    role: 'assistant',
    content: 'Olá! Sou a IA geral do CRM. Posso consultar negociações, criar compromissos, adicionar anotações e muito mais. O que você precisa?',
  };

  useEffect(() => {
    Promise.all([getAllNegociacoes(), getProdutos()])
      .then(([neg, prods]) => { setDados(neg); setProdutos(prods); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!activeProfile) return;
    const ids = getScopeIds(activeProfile.entityType as 'holding' | 'matrix' | 'branch', activeProfile.entityId);
    getWhatsappKey([activeProfile.entityId, ...ids]).then(async key => {
      setWpKey(key);
      if (key) {
        const chats = await listarChats(key);
        setWpChats(chats);
      }
    });
  }, [activeProfile, getScopeIds]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, thinking]);

  const loadConversas = useCallback(async () => {
    if (!activeProfile) return;
    const { data } = await supabase
      .from('ia_crm_conversas')
      .select('id, titulo, created_at, updated_at')
      .eq('tenant_id', activeProfile.entityId)
      .order('updated_at', { ascending: false });
    setConversas((data ?? []) as ConversaResumo[]);
  }, [activeProfile]);

  useEffect(() => { loadConversas(); }, [loadConversas]);

  // Auto-save sempre que msgs muda (debounced 600ms)
  useEffect(() => {
    if (msgs.length <= 1) return;
    const timer = setTimeout(async () => {
      if (!activeProfile) return;
      const titulo = msgs.find(m => m.role === 'user')?.content.slice(0, 60) ?? 'Nova conversa';
      const saveable = msgs.map(m => ({ role: m.role, content: m.content, applied: m.applied, actions: m.actions }));
      if (conversaIdRef.current) {
        await supabase.from('ia_crm_conversas')
          .update({ mensagens: saveable, updated_at: new Date().toISOString() })
          .eq('id', conversaIdRef.current);
        setConversas(prev => prev.map(c => c.id === conversaIdRef.current ? { ...c, updated_at: new Date().toISOString() } : c));
      } else {
        const { data } = await supabase.from('ia_crm_conversas')
          .insert({ tenant_id: activeProfile.entityId, titulo, mensagens: saveable })
          .select('id, titulo, created_at, updated_at')
          .single();
        if (data) {
          conversaIdRef.current = data.id;
          setConversaId(data.id);
          setConversas(prev => [data as ConversaResumo, ...prev]);
        }
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [msgs, activeProfile]);

  const openConversa = useCallback(async (id: string) => {
    const { data } = await supabase.from('ia_crm_conversas').select('*').eq('id', id).single();
    if (!data) return;
    conversaIdRef.current = id;
    setConversaId(id);
    setMsgs((data.mensagens as ChatMessage[]) ?? [INITIAL_MSG]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const newConversa = useCallback(() => {
    conversaIdRef.current = null;
    setConversaId(null);
    setMsgs([INITIAL_MSG]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const deleteConversa = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from('ia_crm_conversas').delete().eq('id', id);
    setConversas(prev => prev.filter(c => c.id !== id));
    if (conversaIdRef.current === id) newConversa();
  }, [newConversa]);

  const refreshDados = useCallback(async () => {
    const [neg, prods] = await Promise.all([getAllNegociacoes(), getProdutos()]);
    setDados(neg);
    setProdutos(prods);
    if (wpKey) {
      const chats = await listarChats(wpKey);
      setWpChats(chats);
    }
  }, [wpKey]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text && !imagens.length || thinking) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: text || '(imagem enviada)',
      file: anexo ?? undefined,
      images: imagens.length ? [...imagens] : undefined,
    };
    setMsgs(prev => [...prev, userMsg]);
    setInput('');
    setAnexo(null);
    setImagens([]);
    setThinking(true);

    try {
      const imgParts = userMsg.images?.map(i => ({
        mimeType: i.mimeType,
        data: i.dataUrl.split(',')[1] ?? i.dataUrl,
      })) ?? [];

      type ParsedResponse = {
        resposta?: string;
        acoes?: Array<{
          id: string; tipo: ActionType; descricao: string;
          negociacao_id?: string; negociacao_nome?: string;
          payload: Record<string, unknown>;
        }>;
        ferramenta?: { tipo: ToolType; telefone?: string };
      };

      const runGemini = async (wpContext: { phone: string; mensagens: WhatsappMensagem[] } | null): Promise<ParsedResponse> => {
        const prompt = (systemContext ? systemContext + '\n\n' : '') +
          buildPrompt(
            text || 'Analise as imagens enviadas e me ajude com o CRM.',
            dados, [...msgs, userMsg], produtos, anexo?.content,
            wpChats, wpKey !== null, wpContext,
          );
        const raw = imgParts.length ? await geminiVisual(prompt, imgParts) : await gemini(prompt);
        let p: ParsedResponse = {};
        try { p = JSON.parse(raw); } catch { p = { resposta: raw, acoes: [] }; }
        if ((p.acoes ?? []).length > 0) {
          try {
            const rawPro = imgParts.length ? await geminiVisual(prompt, imgParts, true) : await gemini(prompt, true);
            const pp = JSON.parse(rawPro);
            if (pp.resposta || pp.acoes) p = pp;
          } catch { /* mantém Flash */ }
        }
        return p;
      };

      let parsed = await runGemini(null);

      // Loop de ferramenta: IA pediu leitura de conversa WhatsApp (até 2 vezes)
      let toolHops = 0;
      while (parsed.ferramenta?.tipo === 'ler_whatsapp' && parsed.ferramenta.telefone && wpKey && toolHops < 2) {
        toolHops++;
        const phone = parsed.ferramenta.telefone;
        const mensagens = await lerMensagens(wpKey, phone, 30);
        parsed = await runGemini({ phone, mensagens });
      }

      const actions: PendingAction[] = (parsed.acoes ?? []).map(a => ({
        id:              a.id ?? crypto.randomUUID(),
        tipo:            a.tipo,
        descricao:       a.descricao,
        negociacaoId:    a.negociacao_id,
        negociacaoNome:  a.negociacao_nome,
        produtoId:       (a as Record<string, unknown>).produto_id as string | undefined,
        payload:         a.payload ?? {},
      }));

      const aiMsg: ChatMessage = {
        role: 'assistant',
        content: parsed.resposta ?? 'Analisado.',
        actions: actions.length > 0 ? actions : undefined,
      };
      setMsgs(prev => {
        const next = [...prev, aiMsg];
        if (actions.length > 0) {
          setPendingActions(actions);
          setPendingMsgIdx(next.length - 1);
        }
        return next;
      });
    } catch (e) {
      setMsgs(prev => [...prev, { role: 'assistant', content: `Erro: ${(e as Error).message}` }]);
    } finally { setThinking(false); }
  }, [input, thinking, dados, msgs, anexo, produtos, wpChats, wpKey, systemContext, imagens]);

  const applyActions = useCallback(async (selected: Set<string>) => {
    if (!pendingActions || pendingMsgIdx === null) return;
    setApplying(true);
    const toApply = pendingActions.filter(a => selected.has(a.id));
    const erros: string[] = [];

    for (const action of toApply) {
      try {
        if (action.tipo === 'update_negociacao' && action.negociacaoId) {
          await updateNegociacao(action.negociacaoId, action.payload as Parameters<typeof updateNegociacao>[1]);
        }
        if (action.tipo === 'update_etapa' && action.negociacaoId) {
          await updateNegociacao(action.negociacaoId, { etapa: (action.payload as { etapa: string }).etapa as Parameters<typeof updateNegociacao>[1]['etapa'] });
        }
        if (action.tipo === 'update_status' && action.negociacaoId) {
          await updateNegociacao(action.negociacaoId, { status: (action.payload as { status: string }).status as Parameters<typeof updateNegociacao>[1]['status'] });
        }
        if (action.tipo === 'add_compromisso') {
          const p = action.payload as { clienteNome: string; titulo: string; data: string; hora: string; duracao: number; tipo: string; notas: string };
          await addCompromisso(action.negociacaoId, {
            clienteNome: p.clienteNome ?? '', titulo: p.titulo ?? 'Compromisso IA',
            data: p.data, hora: p.hora ?? '09:00', duracao: Number(p.duracao) || 60,
            tipo: (p.tipo as Parameters<typeof addCompromisso>[1]['tipo']) ?? 'outro',
            notas: p.notas ?? '', criado_por: 'ia', concluido: false,
          });
        }
        if (action.tipo === 'add_anotacao' && action.negociacaoId) {
          const p = action.payload as { tipo: string; conteudo: string; dataPrazo?: string };
          await addAnotacao(action.negociacaoId, {
            tipo: (p.tipo as 'anotacao' | 'tarefa') ?? 'anotacao',
            conteudo: p.conteudo ?? '',
            concluida: false,
            dataPrazo: p.dataPrazo ?? undefined,
            criadoPor: 'ia',
          });
        }
        if (action.tipo === 'toggle_compromisso') {
          const p = action.payload as { compromisso_id: string };
          if (p.compromisso_id) await toggleCompromissoConcluido(p.compromisso_id);
        }
        if (action.tipo === 'update_produto' && action.produtoId) {
          const p = action.payload as Partial<ErpProduto>;
          await updateProduto(action.produtoId, p);
        }
        if (action.tipo === 'send_whatsapp') {
          if (!wpKey) {
            erros.push('WhatsApp não configurado — adicione a integração em Configurações → Serviços Externos.');
          } else {
            const p = action.payload as { telefone?: string; mensagem?: string };
            if (!p.telefone || !p.mensagem) {
              erros.push('Dados incompletos para envio do WhatsApp (telefone ou mensagem ausente).');
            } else {
              const result = await enviarTexto(wpKey, p.telefone, p.mensagem);
              if (!result.ok) {
                erros.push(`Falha ao enviar WhatsApp para ${p.telefone}: ${result.error ?? 'erro desconhecido'}. Verifique as credenciais em Configurações → Serviços Externos.`);
              }
            }
          }
        }
        if (action.tipo === 'create_orcamento' && action.negociacaoId) {
          const p = action.payload as {
            condicao_pagamento?: string;
            desconto_global_pct?: number;
            frete?: number;
            validade?: string;
            observacoes?: string;
            itens?: Array<{ produto_nome: string; codigo?: string; unidade?: string; quantidade: number; preco_unitario: number; desconto_pct?: number }>;
          };
          const itens: ItemOrcamento[] = (p.itens ?? []).map((item, idx) => {
            const qt  = Number(item.quantidade)    || 1;
            const pu  = Number(item.preco_unitario) || 0;
            const dsc = Number(item.desconto_pct)   || 0;
            return {
              id:              `ia-item-${Date.now()}-${idx}`,
              produto_nome:    item.produto_nome ?? 'Item',
              codigo:          item.codigo   ?? '',
              unidade:         item.unidade  ?? 'UN',
              quantidade:      qt,
              preco_unitario:  pu,
              desconto_pct:    dsc,
              total:           qt * pu * (1 - dsc / 100),
            };
          });
          const total = itens.reduce((s, i) => s + i.total, 0);
          const descontoGlobal = Number(p.desconto_global_pct) || 0;
          const frete = Number(p.frete) || 0;
          const totalFinal = total * (1 - descontoGlobal / 100) + frete;
          await setOrcamento(action.negociacaoId, {
            status:              'rascunho',
            condicao_pagamento:  p.condicao_pagamento  ?? 'A combinar',
            desconto_global_pct: descontoGlobal,
            frete,
            itens,
            total:               totalFinal,
            dataCriacao:         new Date().toISOString().split('T')[0],
            criado_por:          'ia',
            validade:            p.validade    ?? undefined,
            observacoes:         p.observacoes ?? 'Orçamento gerado pela IA',
          });
        }
      } catch { /* continue other actions */ }
    }

    await refreshDados();
    setMsgs(prev => {
      const next = prev.map((m, i) => i === pendingMsgIdx ? { ...m, applied: true } : m);
      if (erros.length > 0) {
        next.push({ role: 'system', content: `⚠️ ${erros.join('\n⚠️ ')}` });
      }
      return next;
    });
    setPendingActions(null);
    setPendingMsgIdx(null);
    setApplying(false);
  }, [pendingActions, pendingMsgIdx, refreshDados, wpKey]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text().catch(() => '[Arquivo binário — não legível como texto]');
    setAnexo({ name: file.name, content: text.slice(0, 8000) });
    e.target.value = '';
  }

  async function handleImagem(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      if (imagens.length >= 4) break; // máximo 4 imagens por mensagem
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setImagens(prev => [...prev, { name: file.name, dataUrl, mimeType: file.type }]);
    }
    e.target.value = '';
    setImgMenu(false);
  }

  const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="flex h-full overflow-hidden bg-slate-50">

      {/* Sidebar de histórico */}
      {showSidebar && (
        <div className="w-64 shrink-0 flex flex-col bg-white border-r border-slate-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Conversas</span>
            <button onClick={newConversa}
              className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-medium">
              <PlusCircle className="w-3.5 h-3.5" /> Nova
            </button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar py-1">
            {conversas.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-6">Nenhuma conversa salva</p>
            )}
            {conversas.map(c => (
              <button key={c.id} onClick={() => openConversa(c.id)}
                className={`w-full flex items-start gap-2 px-4 py-2.5 text-left hover:bg-purple-50 group transition-colors ${conversaId === c.id ? 'bg-purple-50' : ''}`}>
                <MessageSquare className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${conversaId === c.id ? 'text-purple-500' : 'text-slate-300'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium truncate ${conversaId === c.id ? 'text-purple-700' : 'text-slate-700'}`}>{c.titulo}</p>
                  <p className="text-[10px] text-slate-400">{new Date(c.updated_at).toLocaleDateString('pt-BR')}</p>
                </div>
                <button onClick={e => deleteConversa(c.id, e)}
                  className="shrink-0 opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-500 text-slate-300 transition-opacity">
                  <Trash2 className="w-3 h-3" />
                </button>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Área principal */}
      <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 bg-white border-b border-slate-200 shrink-0">
        <button onClick={() => setShowSidebar(p => !p)}
          className={`p-1.5 rounded-lg transition-colors ${showSidebar ? 'bg-purple-100 text-purple-600' : 'hover:bg-slate-100 text-slate-400'}`}
          title="Histórico de conversas">
          <History className="w-4 h-4" />
        </button>
        <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-purple-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900 leading-tight">IA CRM</p>
          <p className="text-[11px] text-slate-500">Assistente com acesso total · Flash 3.1 / Pro 3.1</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <button onClick={newConversa}
            className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-medium px-2 py-1 rounded-lg hover:bg-purple-50 transition-colors"
            title="Nova conversa">
            <PlusCircle className="w-3.5 h-3.5" /> Nova
          </button>
          {loading ? (
            <span className="text-xs text-slate-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Carregando dados...</span>
          ) : (
            <span className="text-xs text-green-600 font-medium">{dados.length} negociação(ões) carregada(s)</span>
          )}
          {wpKey ? (
            <span className="text-xs text-emerald-700 font-medium flex items-center gap-1" title="WhatsApp conectado">
              <MessageCircle className="w-3 h-3" />{wpChats.length} conversa(s)
            </span>
          ) : (
            <span className="text-xs text-slate-400 flex items-center gap-1" title="Configure em Configurações → Integrações">
              <MessageCircle className="w-3 h-3" />WhatsApp off
            </span>
          )}
          <button onClick={refreshDados} title="Atualizar dados" className="p-1.5 rounded-lg hover:bg-slate-100">
            <RefreshCw className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Painel de dados resumido */}
      {dados.length > 0 && (
        <div className="flex gap-3 px-5 py-2.5 bg-white border-b border-slate-100 overflow-x-auto shrink-0">
          {[
            { label: 'Negociações', val: dados.length, color: 'text-purple-700' },
            { label: 'Abertas',     val: dados.filter(d => d.negociacao.status === 'aberta').length, color: 'text-blue-700' },
            { label: 'Ganhas',      val: dados.filter(d => d.negociacao.status === 'ganha').length, color: 'text-green-700' },
            { label: 'Valor Total', val: BRL(dados.reduce((s, d) => s + (d.negociacao.valor_estimado ?? 0), 0)), color: 'text-emerald-700' },
            { label: 'Compromissos', val: dados.reduce((s, d) => s + d.compromissos.length, 0), color: 'text-amber-700' },
          ].map(k => (
            <div key={k.label} className="shrink-0 text-center px-3">
              <p className={`text-sm font-bold ${k.color}`}>{k.val}</p>
              <p className="text-[10px] text-slate-400">{k.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Chat */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
        {msgs.map((msg, i) => (
          msg.role === 'system' ? (
            <div key={i} className="flex justify-center">
              <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-2.5 text-xs max-w-[90%] whitespace-pre-wrap">
                {msg.content}
              </div>
            </div>
          ) : (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role !== 'user' && (
              <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              </div>
            )}
            <div className={`max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
              {msg.file && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                  <Paperclip className="w-3 h-3" />{msg.file.name}
                </div>
              )}
              {/* Imagens enviadas na mensagem */}
              {msg.images && msg.images.length > 0 && (
                <div className={`flex flex-wrap gap-1.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.images.map((img, ii) => (
                    <img
                      key={ii}
                      src={img.dataUrl}
                      alt={img.name}
                      className="w-36 h-36 object-cover rounded-xl border border-white/20 shadow cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(img.dataUrl, '_blank')}
                      title={img.name}
                    />
                  ))}
                </div>
              )}
              <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-800'
              }`}>
                {msg.content}
              </div>

              {/* Ações propostas */}
              {msg.actions && msg.actions.length > 0 && (
                <div className={`w-full mt-1 border rounded-xl overflow-hidden ${msg.applied ? 'border-green-200 bg-green-50' : 'border-purple-200 bg-purple-50'}`}>
                  <div className={`flex items-center justify-between px-4 py-2.5 text-xs font-semibold ${msg.applied ? 'text-green-700' : 'text-purple-700'}`}>
                    <span className="flex items-center gap-1.5">
                      {msg.applied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                      {msg.applied ? `${msg.actions.length} ação(ões) aplicada(s)` : `${msg.actions.length} ação(ões) proposta(s)`}
                    </span>
                    {!msg.applied && (
                      <button onClick={() => { setPendingActions(msg.actions!); setPendingMsgIdx(i); }}
                        className="bg-purple-600 text-white px-3 py-1 rounded-lg hover:bg-purple-700 transition-colors">
                        Revisar
                      </button>
                    )}
                  </div>
                  <div className="px-4 pb-3 space-y-1">
                    {msg.actions.map(a => (
                      <div key={a.id} className="flex items-start gap-2 text-[11px] text-slate-600">
                        <span className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${msg.applied ? 'bg-green-500' : 'bg-purple-400'}`} />
                        <span>{a.descricao}{a.negociacaoNome ? ` — ${a.negociacaoNome}` : ''}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5 text-slate-600" />
              </div>
            )}
          </div>
          )
        ))}

        {thinking && (
          <div className="flex gap-3 justify-start">
            <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-2 text-sm text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-purple-400" /> Analisando...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Sugestões rápidas */}
      {msgs.length <= 1 && !thinking && (
        <div className="px-5 pb-3 flex flex-wrap gap-2 shrink-0">
          {[
            'Quais negociações estão abertas?',
            'Crie um compromisso para amanhã com o primeiro cliente',
            'Quais negociações têm maior probabilidade de fechamento?',
            'Adicione uma anotação de tarefa na primeira negociação',
            'Mostre o resumo do pipeline',
          ].map(s => (
            <button key={s} onClick={() => setInput(s)}
              className="text-xs bg-white border border-slate-200 hover:border-purple-300 hover:text-purple-700 text-slate-600 px-3 py-1.5 rounded-full transition-colors">
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Pré-visualização de imagens pendentes */}
      {imagens.length > 0 && (
        <div className="mx-5 mb-1 flex gap-2 flex-wrap">
          {imagens.map((img, i) => (
            <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-purple-200 shadow-sm group">
              <img src={img.dataUrl} alt={img.name} className="w-full h-full object-cover" />
              <button
                onClick={() => setImagens(prev => prev.filter((_, j) => j !== i))}
                className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
          {imagens.length < 4 && (
            <button
              onClick={() => galeriaRef.current?.click()}
              className="w-16 h-16 rounded-xl border-2 border-dashed border-purple-200 flex items-center justify-center text-purple-300 hover:border-purple-400 hover:text-purple-500 transition-colors"
              title="Adicionar imagem"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* Anexo de texto pendente */}
      {anexo && (
        <div className="mx-5 mb-1 flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-xl px-3 py-2">
          <Paperclip className="w-4 h-4 text-purple-500 shrink-0" />
          <span className="text-xs text-purple-700 flex-1 truncate">{anexo.name}</span>
          <button onClick={() => setAnexo(null)} className="text-purple-400 hover:text-purple-700"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Input */}
      <div className="px-5 pb-5 pt-2 shrink-0">
        <div className="flex gap-2 bg-white border border-slate-200 rounded-2xl p-2 shadow-sm focus-within:border-purple-400 transition-colors">
          {/* Botão de arquivo texto */}
          <button onClick={() => fileRef.current?.click()} title="Anexar arquivo"
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-purple-600 shrink-0 transition-colors">
            <Paperclip className="w-4 h-4" />
          </button>
          <input ref={fileRef} type="file" className="hidden" accept=".txt,.csv,.json,.md,.xlsx" onChange={handleFile} />

          {/* Botão câmera / galeria */}
          <div className="relative shrink-0">
            <button
              onClick={() => setImgMenu(p => !p)}
              title="Imagem ou câmera"
              className={`p-2 rounded-xl hover:bg-slate-100 transition-colors ${imagens.length ? 'text-purple-600' : 'text-slate-400 hover:text-purple-600'}`}
            >
              <Camera className="w-4 h-4" />
            </button>
            {imgMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setImgMenu(false)} />
                <div className="absolute bottom-10 left-0 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-40 w-44">
                  <button
                    onClick={() => { cameraRef.current?.click(); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                  >
                    <Camera className="w-4 h-4 text-purple-500" />
                    Tirar foto
                  </button>
                  <button
                    onClick={() => { galeriaRef.current?.click(); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition-colors border-t border-slate-50"
                  >
                    <ImageIcon className="w-4 h-4 text-indigo-500" />
                    Escolher da galeria
                  </button>
                </div>
              </>
            )}
            {/* Input câmera (capture) */}
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleImagem}
            />
            {/* Input galeria */}
            <input
              ref={galeriaRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImagem}
            />
          </div>

          <textarea
            rows={1}
            className="flex-1 text-sm text-slate-800 placeholder-slate-400 resize-none focus:outline-none py-1.5 max-h-32 leading-relaxed"
            placeholder="Pergunte, peça uma ação ou envie uma imagem..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          />
          <button onClick={handleSend} disabled={(!input.trim() && !imagens.length) || thinking}
            className="p-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white shrink-0 transition-colors">
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-slate-400 text-center mt-1.5">
          <AlertTriangle className="w-3 h-3 inline mr-0.5" />Toda alteração no CRM requer sua aprovação antes de ser aplicada
        </p>
      </div>

      </div>{/* fim área principal */}

      {/* Popup de confirmação */}
      {pendingActions && (
        <ConfirmModal
          actions={pendingActions}
          applying={applying}
          onConfirm={applyActions}
          onCancel={() => { setPendingActions(null); setPendingMsgIdx(null); }}
        />
      )}
    </div>
  );
}
