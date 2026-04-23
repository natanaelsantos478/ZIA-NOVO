// ─────────────────────────────────────────────────────────────────────────────
// CRM — Jessica IA: Atendente Virtual (Suporte TI + Vendas)
// Responde pelo WhatsApp dos parceiros com dupla função: suporte técnico e vendas.
// Pode criar clientes, negociações, anotações e orçamentos no CRM automaticamente.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react';
import {
  Bot, Send, Loader2, CheckCircle2, X, Cpu, Building2, Phone,
  MessageCircle, StickyNote, Briefcase, FileText, Calendar,
  ChevronRight, RefreshCw, User, Zap, AlertCircle,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useProfiles } from '../../../context/ProfileContext';
import { getWhatsappKey, lerMensagens, enviarTexto, type WhatsappMensagem } from '../../../lib/whatsapp';
import { addAnotacao, addCompromisso, getFunilPadrao, createNegociacao } from '../data/crmData';
import { createCliente } from '../../../lib/erp';
import type { ApiKey } from '../../../lib/apiKeys';

// ── Prompt perfeito da Jessica ────────────────────────────────────────────────

const JESSICA_PROMPT = `Você é Jessica, atendente virtual da empresa. Você tem DUAS funções simultâneas:

━━ FUNÇÃO 1 — SUPORTE TÉCNICO (TI) ━━
Resolve problemas e dúvidas técnicas sobre sistemas, produtos e serviços.
- Guia o cliente passo a passo com clareza e paciência
- Demonstra empatia quando o cliente está frustrado
- Pede screenshots ou detalhes quando precisa entender melhor
- Escala para equipe humana quando o problema supera seu conhecimento: "Vou acionar nosso time técnico agora"

━━ FUNÇÃO 2 — CONSULTORA DE VENDAS ━━
Você é uma vendedora excepcional e consultiva.
- Identifica as DORES e NECESSIDADES do cliente através da conversa
- Apresenta produtos/serviços focando nos BENEFÍCIOS, não nas características técnicas
- Faz perguntas estratégicas para entender o perfil e momento de compra do cliente
- Cria urgência natural e genuína — nunca forçada ou invasiva
- Usa técnicas consultivas: descubra o problema → mostre o impacto → apresente a solução → guie ao fechamento
- Quando o cliente hesita, ofereça uma demonstração, uma prova gratuita ou uma proposta personalizada

━━ COMO OPERAR ━━
1. Analise cada mensagem: é suporte, é oportunidade de venda, ou ambos?
2. Quando for misto: resolva o suporte E aproveite a abertura para venda de forma natural
3. Tom: caloroso, empático, profissional — nunca robótico ou genérico
4. Linguagem: português brasileiro natural, sem formalidade excessiva
5. Mensagens curtas e diretas — WhatsApp não é e-mail
6. NUNCA se apresente como IA — você é Jessica, da equipe da empresa

━━ AÇÕES NO CRM ━━
Quando relevante, sugira ações automáticas no CRM:
- Cliente forneceu dados completos → create_cliente
- Há interesse real de compra → add_anotacao (registrar intenção) + update_negociacao
- Cliente pediu preço/proposta → create_orcamento
- Precisa de follow-up → add_compromisso
- Resolução de suporte importante → add_anotacao

Retorne APENAS este JSON (sem markdown, sem explicação):
{
  "resposta": "sua mensagem para o cliente em linguagem natural WhatsApp",
  "analise": "tipo: suporte|vendas|misto — temperatura: frio|morno|quente — next: descrição curta do próximo passo",
  "acoes": [
    {
      "id": "id-unico-curto",
      "tipo": "create_cliente|add_anotacao|update_negociacao|create_orcamento|add_compromisso",
      "descricao": "frase humana descrevendo o que será feito",
      "payload": {}
    }
  ]
}`;

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Parceiro {
  id: string;
  titulo: string;
  empresa: string;
  cnpj: string | null;
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
  created_at: string;
}

type ActionTipo = 'create_cliente' | 'add_anotacao' | 'update_negociacao' | 'create_orcamento' | 'add_compromisso';

interface JessicaAction {
  id: string;
  tipo: ActionTipo;
  descricao: string;
  payload: Record<string, unknown>;
}

interface JessicaMsg {
  id: string;
  from: 'jessica' | 'cliente' | 'system';
  text: string;
  analise?: string;
  acoes?: JessicaAction[];
  actionsApplied?: boolean;
  tokens?: number;
  ts: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function callJessica(
  conversa: WhatsappMensagem[],
  parceiro: Parceiro,
  tenantId: string | undefined,
): Promise<{ resposta: string; analise: string; acoes: JessicaAction[]; tokens: number }> {
  const historicoTexto = conversa
    .slice(-12)
    .map(m => `${m.fromMe ? 'Jessica' : parceiro.empresa}: ${m.text}`)
    .join('\n');

  const prompt = `${JESSICA_PROMPT}

━━ CONTEXTO DO PARCEIRO ━━
Empresa: ${parceiro.empresa}
${parceiro.cnpj ? `CNPJ: ${parceiro.cnpj}` : ''}
${parceiro.cidade ? `Localização: ${parceiro.cidade}/${parceiro.estado}` : ''}
${parceiro.telefone ? `Telefone: ${parceiro.telefone}` : ''}

━━ HISTÓRICO DA CONVERSA (WhatsApp) ━━
${historicoTexto || '(sem histórico anterior — primeira interação)'}

Analise a conversa e gere sua próxima mensagem como Jessica.`;

  const { data, error } = await supabase.functions.invoke('ai-proxy', {
    body: { type: 'gemini-text', prompt, usePro: false, ...(tenantId ? { tenantId } : {}) },
  });

  if (error) throw new Error(error.message);

  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
  const tokens = data?.usageMetadata?.totalTokenCount ?? 0;

  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim()) as {
      resposta?: string; analise?: string; acoes?: JessicaAction[];
    };
    return {
      resposta: parsed.resposta ?? '...',
      analise: parsed.analise ?? '',
      acoes: Array.isArray(parsed.acoes) ? parsed.acoes : [],
      tokens,
    };
  } catch {
    return { resposta: raw.slice(0, 500), analise: '', acoes: [], tokens };
  }
}

// ── Action icons & labels ─────────────────────────────────────────────────────

const ACTION_ICON: Record<ActionTipo, typeof Bot> = {
  create_cliente:    User,
  add_anotacao:      StickyNote,
  update_negociacao: Briefcase,
  create_orcamento:  FileText,
  add_compromisso:   Calendar,
};

const ACTION_LABEL: Record<ActionTipo, string> = {
  create_cliente:    'Criar cliente',
  add_anotacao:      'Adicionar anotação',
  update_negociacao: 'Atualizar negociação',
  create_orcamento:  'Criar orçamento',
  add_compromisso:   'Criar compromisso',
};

// ── Componente principal ──────────────────────────────────────────────────────

export default function JessicaIA() {
  const { activeProfile } = useProfiles();
  const tenantId = activeProfile?.entityId;

  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [conversa, setConversa] = useState<WhatsappMensagem[]>([]);
  const [msgs, setMsgs] = useState<JessicaMsg[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [applying, setApplying] = useState(false);
  const [wpKey, setWpKey] = useState<ApiKey | null>(null);
  const [wpError, setWpError] = useState<string | null>(null);
  const [totalTokens, setTotalTokens] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const selected = parceiros.find(p => p.id === selectedId) ?? null;

  // Carrega parceiros do crm_negociacoes
  useEffect(() => {
    if (!tenantId) return;
    supabase
      .from('crm_negociacoes')
      .select('id, titulo, empresa, cnpj, telefone, cidade, estado, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (data) setParceiros(data as Parceiro[]);
      });
  }, [tenantId]);

  // Carrega chave WhatsApp
  useEffect(() => {
    if (!tenantId) return;
    getWhatsappKey([tenantId]).then(k => setWpKey(k));
  }, [tenantId]);

  // Carrega conversa WhatsApp do parceiro selecionado
  useEffect(() => {
    if (!selected?.telefone || !wpKey) return;
    setLoading(true);
    setConversa([]);
    lerMensagens(wpKey, selected.telefone, 20)
      .then(msgs => setConversa(msgs))
      .finally(() => setLoading(false));
  }, [selected?.id, wpKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll automático
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  async function handleGerar() {
    if (!selected || !tenantId) return;
    setSending(true);
    setWpError(null);
    try {
      const result = await callJessica(conversa, selected, tenantId);
      const msg: JessicaMsg = {
        id: `j_${Date.now()}`,
        from: 'jessica',
        text: result.resposta,
        analise: result.analise,
        acoes: result.acoes,
        tokens: result.tokens,
        ts: new Date().toISOString(),
      };
      setMsgs(prev => [...prev, msg]);
      setTotalTokens(t => t + (result.tokens ?? 0));
    } catch (e) {
      setWpError(e instanceof Error ? e.message : 'Erro ao gerar resposta');
    } finally {
      setSending(false);
    }
  }

  async function handleEnviar(msgId: string) {
    const msg = msgs.find(m => m.id === msgId);
    if (!msg || !selected?.telefone || !wpKey) return;
    setSending(true);
    setWpError(null);
    try {
      const res = await enviarTexto(wpKey, selected.telefone, msg.text);
      if (!res.ok) throw new Error(res.error ?? 'Falha no envio');
      setMsgs(prev => prev.map(m => m.id === msgId ? { ...m, from: 'jessica' as const } : m));
      // Adiciona à conversa local
      setConversa(prev => [...prev, {
        id: `sent_${Date.now()}`,
        phone: selected.telefone!,
        fromMe: true,
        text: msg.text,
        timestamp: new Date().toISOString(),
      }]);
    } catch (e) {
      setWpError(e instanceof Error ? e.message : 'Erro ao enviar');
    } finally {
      setSending(false);
    }
  }

  async function handleAplicarAcoes(msgId: string) {
    const msg = msgs.find(m => m.id === msgId);
    if (!msg?.acoes?.length || !tenantId || !selected) return;
    setApplying(true);
    try {
      const funil = await getFunilPadrao();
      for (const acao of msg.acoes) {
        if (acao.tipo === 'add_anotacao') {
          const negociacoes = await supabase
            .from('crm_negociacoes').select('id').eq('tenant_id', tenantId)
            .eq('empresa', selected.empresa).limit(1);
          const negId = negociacoes.data?.[0]?.id;
          if (negId) {
            await addAnotacao(negId, {
              tipo: 'anotacao',
              conteudo: (acao.payload.conteudo as string) || msg.analise || 'Anotação via Jessica IA',
              criadoPor: 'Jessica IA',
              concluida: false,
            });
          }
        } else if (acao.tipo === 'create_cliente') {
          await createCliente({
            tipo: 'PJ',
            nome: selected.empresa,
            cpf_cnpj: selected.cnpj ?? '',
            inscricao_estadual: null,
            email: (acao.payload.email as string) ?? null,
            telefone: selected.telefone ?? null,
            endereco_json: {},
            limite_credito: null,
            tabela_preco_id: null,
            vendedor_id: null,
            ativo: true,
          }, tenantId);
        } else if (acao.tipo === 'add_compromisso') {
          const negociacoes = await supabase
            .from('crm_negociacoes').select('id').eq('tenant_id', tenantId)
            .eq('empresa', selected.empresa).limit(1);
          const negId = negociacoes.data?.[0]?.id;
          await addCompromisso(negId, {
            clienteNome: selected.empresa,
            titulo: (acao.payload.titulo as string) ?? 'Follow-up Jessica',
            data: (acao.payload.data as string) ?? new Date(Date.now() + 86400000).toISOString().slice(0, 10),
            hora: (acao.payload.hora as string) ?? '09:00',
            duracao: 30,
            tipo: 'followup' as const,
            notas: (acao.payload.notas as string) ?? '',
            concluido: false,
            criado_por: 'ia' as const,
          });
        } else if (acao.tipo === 'update_negociacao') {
          const negociacoes = await supabase
            .from('crm_negociacoes').select('id').eq('tenant_id', tenantId)
            .eq('empresa', selected.empresa).limit(1);
          const negId = negociacoes.data?.[0]?.id;
          if (negId) {
            await supabase.from('crm_negociacoes').update(acao.payload).eq('id', negId);
          }
        } else if (acao.tipo === 'create_orcamento') {
          if (funil) {
            await createNegociacao({
              clienteNome: selected.empresa,
              clienteCnpj: selected.cnpj ?? undefined,
              clienteTelefone: selected.telefone ?? undefined,
              status: 'aberta',
              etapa: 'proposta',
              etapaId: funil.etapas?.[0]?.id,
              funilId: funil.id,
              probabilidade: 60,
              responsavel: 'Jessica IA',
              origem: 'JESSICA_IA',
              notas: `Orçamento solicitado via Jessica IA\n${msg.analise}`,
            });
          }
        }
      }
      setMsgs(prev => prev.map(m => m.id === msgId ? { ...m, actionsApplied: true } : m));
    } catch (e) {
      setWpError(e instanceof Error ? e.message : 'Erro ao aplicar ações');
    } finally {
      setApplying(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex overflow-hidden bg-white">

      {/* ── Painel esquerdo: lista de parceiros ── */}
      <div className="w-72 shrink-0 border-r border-slate-100 flex flex-col">
        <div className="px-4 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center">
              <Bot className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-sm">Jessica IA</h2>
              <p className="text-[10px] text-slate-400">Suporte TI + Vendas</p>
            </div>
          </div>
          {totalTokens > 0 && (
            <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-400">
              <Cpu className="w-3 h-3" />
              <span>{totalTokens.toLocaleString('pt-BR')} tokens nesta sessão</span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {parceiros.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400 mt-8">
              <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-200" />
              Nenhum parceiro encontrado.<br />Use a Prospecção IA para adicionar.
            </div>
          ) : (
            parceiros.map(p => (
              <button
                key={p.id}
                onClick={() => { setSelectedId(p.id); setMsgs([]); }}
                className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors flex items-start gap-3 ${selectedId === p.id ? 'bg-violet-50 border-l-2 border-l-violet-500' : ''}`}
              >
                <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-xs truncate">{p.empresa || p.titulo}</p>
                  {p.telefone && (
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <Phone className="w-2.5 h-2.5" />{p.telefone}
                    </p>
                  )}
                  {(p.cidade || p.estado) && (
                    <p className="text-[10px] text-slate-400">{p.cidade}/{p.estado}</p>
                  )}
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-1" />
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Painel direito: conversa ── */}
      {!selected ? (
        <div className="flex-1 flex items-center justify-center text-slate-400">
          <div className="text-center">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 text-slate-200" />
            <p className="text-sm font-medium">Selecione um parceiro</p>
            <p className="text-xs mt-1">Jessica irá analisar a conversa e sugerir respostas</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-w-0">

          {/* Header */}
          <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div>
              <h3 className="font-bold text-slate-800">{selected.empresa}</h3>
              <p className="text-xs text-slate-400">
                {selected.telefone ?? 'sem telefone'}
                {selected.cidade ? ` · ${selected.cidade}/${selected.estado}` : ''}
              </p>
            </div>
            <button
              onClick={() => {
                if (!selected.telefone || !wpKey) return;
                setLoading(true);
                lerMensagens(wpKey, selected.telefone, 20)
                  .then(m => setConversa(m))
                  .finally(() => setLoading(false));
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              title="Recarregar conversa"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Sem WhatsApp configurado */}
          {!wpKey && (
            <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>WhatsApp não configurado. Vá em Configurações → Integrações e adicione uma chave WhatsApp.</span>
            </div>
          )}

          {/* Erro */}
          {wpError && (
            <div className="mx-6 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center justify-between">
              <span>{wpError}</span>
              <button onClick={() => setWpError(null)}><X className="w-4 h-4" /></button>
            </div>
          )}

          {/* Área da conversa */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">

            {/* Histórico WhatsApp */}
            {loading && (
              <div className="text-center text-xs text-slate-400 py-4">
                <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" />
                Carregando conversa...
              </div>
            )}

            {!loading && conversa.length === 0 && !selected.telefone && (
              <div className="text-center text-xs text-slate-400 py-8">
                <Phone className="w-6 h-6 mx-auto mb-2 text-slate-200" />
                Este parceiro não tem telefone cadastrado.
              </div>
            )}

            {!loading && conversa.length === 0 && selected.telefone && (
              <div className="text-center text-xs text-slate-400 py-8">
                Nenhuma mensagem anterior. Clique em "Gerar Resposta" para Jessica iniciar.
              </div>
            )}

            {conversa.map(m => (
              <div key={m.id} className={`flex ${m.fromMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${m.fromMe ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                  {!m.fromMe && <p className="text-[10px] font-bold mb-0.5 text-slate-500">{selected.empresa}</p>}
                  {m.fromMe && <p className="text-[10px] font-bold mb-0.5 text-violet-200">Jessica</p>}
                  <p className="leading-relaxed">{m.text}</p>
                </div>
              </div>
            ))}

            {/* Respostas geradas pela Jessica */}
            {msgs.map(msg => (
              <div key={msg.id} className="space-y-2">
                {/* Balão da Jessica */}
                <div className="flex justify-end">
                  <div className="max-w-[75%] bg-violet-50 border border-violet-200 rounded-2xl px-3 py-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Bot className="w-3 h-3 text-violet-500" />
                      <span className="text-[10px] font-bold text-violet-600">Jessica (sugestão)</span>
                      {msg.tokens ? (
                        <span className="text-[9px] text-slate-400 flex items-center gap-0.5 ml-auto">
                          <Cpu className="w-2.5 h-2.5" />{msg.tokens}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-slate-800 leading-relaxed">{msg.text}</p>
                    {msg.analise && (
                      <p className="text-[10px] text-slate-400 mt-1 italic">{msg.analise}</p>
                    )}
                  </div>
                </div>

                {/* Botões de ação */}
                {!msg.actionsApplied && (
                  <div className="flex items-center justify-end gap-2 flex-wrap">
                    {/* Ações CRM sugeridas */}
                    {msg.acoes && msg.acoes.length > 0 && (
                      <div className="bg-white border border-slate-200 rounded-xl p-2.5 w-full max-w-sm">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-500" /> Ações CRM sugeridas
                        </p>
                        <div className="space-y-1">
                          {msg.acoes.map(a => {
                            const Icon = ACTION_ICON[a.tipo] ?? StickyNote;
                            return (
                              <div key={a.id} className="flex items-center gap-2 text-xs text-slate-600">
                                <Icon className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                                <span>{a.descricao || ACTION_LABEL[a.tipo]}</span>
                              </div>
                            );
                          })}
                        </div>
                        <button
                          onClick={() => handleAplicarAcoes(msg.id)}
                          disabled={applying}
                          className="mt-2 w-full py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {applying ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                          Aplicar ações no CRM
                        </button>
                      </div>
                    )}

                    {/* Enviar ou descartar */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setMsgs(prev => prev.filter(m => m.id !== msg.id))}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-xs font-semibold hover:bg-slate-50 transition-colors"
                      >
                        Descartar
                      </button>
                      <button
                        onClick={() => handleEnviar(msg.id)}
                        disabled={sending || !wpKey}
                        className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                        Enviar pelo WhatsApp
                      </button>
                    </div>
                  </div>
                )}

                {/* Ações aplicadas */}
                {msg.actionsApplied && (
                  <div className="flex justify-end">
                    <span className="text-[10px] text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Ações aplicadas no CRM
                    </span>
                  </div>
                )}
              </div>
            ))}

            <div ref={bottomRef} />
          </div>

          {/* Botão gerar */}
          <div className="px-4 py-3 border-t border-slate-100 shrink-0">
            <button
              onClick={handleGerar}
              disabled={sending || !selected}
              className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {sending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Jessica está pensando...</>
              ) : (
                <><Bot className="w-4 h-4" /> Gerar Resposta como Jessica</>
              )}
            </button>
            <p className="text-[10px] text-slate-400 text-center mt-1.5">
              Analisa a conversa completa e gera resposta como suporte TI + vendedora
            </p>
          </div>

        </div>
      )}
    </div>
  );
}
