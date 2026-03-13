// ─────────────────────────────────────────────────────────────────────────────
// CRM — IA Geral (Assistente de CRM com acesso total)
// Chat com IA que pode ler e modificar negociações, compromissos, anotações.
// Todas as alterações passam por popup de confirmação antes de serem aplicadas.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Sparkles, Send, Loader2, X, Check, AlertTriangle,
  ChevronUp, Briefcase, Calendar, FileText, StickyNote, CheckCircle2,
  RefreshCw, Paperclip, User,
} from 'lucide-react';
import {
  getAllNegociacoes, updateNegociacao, addCompromisso, addAnotacao,
  toggleCompromissoConcluido, setOrcamento, type NegociacaoData, type ItemOrcamento,
} from '../data/crmData';

// ── Tipos ─────────────────────────────────────────────────────────────────────

type ActionType =
  | 'update_negociacao'
  | 'add_compromisso'
  | 'add_anotacao'
  | 'toggle_compromisso'
  | 'update_etapa'
  | 'update_status'
  | 'create_orcamento';

interface PendingAction {
  id: string;
  tipo: ActionType;
  descricao: string;    // texto legível para o usuário
  negociacaoId?: string;
  negociacaoNome?: string;
  payload: Record<string, unknown>;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  actions?: PendingAction[];
  applied?: boolean;
  file?: { name: string; content: string };
}

// ── Config Gemini ─────────────────────────────────────────────────────────────
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;
const FLASH_URL  = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;

async function gemini(prompt: string): Promise<string> {
  if (!GEMINI_KEY) return '[Sem chave Gemini configurada — defina VITE_GEMINI_API_KEY]';
  const res = await fetch(FLASH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });
  const json = await res.json();
  return json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
}

// ── Prompt Builder ────────────────────────────────────────────────────────────
function buildPrompt(userMsg: string, dados: NegociacaoData[], history: ChatMessage[], anexo?: string): string {
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

  return `Voce e a IA geral do CRM ZIA. Voce tem acesso completo aos dados de negociacoes, compromissos, anotacoes e pode sugerir alteracoes.

DADOS ATUAIS DAS NEGOCIACOES (ultimas 30):
${JSON.stringify(resumo)}

HISTORICO RECENTE:
${historyText}

${anexo ? `CONTEUDO DO ARQUIVO ANEXADO:\n${anexo}\n` : ''}MENSAGEM DO USUARIO: ${userMsg}

Analise a mensagem e retorne JSON com:
{
  "resposta": "texto da sua resposta em portugues (markdown permitido)",
  "acoes": [
    {
      "id": "uuid curto unico",
      "tipo": "update_negociacao|add_compromisso|add_anotacao|toggle_compromisso|update_etapa|update_status",
      "descricao": "frase descrevendo exatamente o que sera feito",
      "negociacao_id": "id da negociacao afetada ou null",
      "negociacao_nome": "nome do cliente ou null",
      "payload": { "campo": "valor" }
    }
  ]
}

TIPOS DE ACAO:
- update_negociacao: payload={campo: valor} — pode alterar qualquer campo da negociacao
- add_compromisso: payload={clienteNome, titulo, data(YYYY-MM-DD), hora(HH:MM), duracao(min), tipo(reuniao|ligacao|visita|followup|outro), notas}
- add_anotacao: payload={tipo(anotacao|tarefa), conteudo, dataPrazo(YYYY-MM-DD ou null), criadoPor:"ia"}
- toggle_compromisso: payload={compromisso_id}
- update_etapa: payload={etapa: prospeccao|qualificacao|proposta|negociacao|fechamento}
- update_status: payload={status: aberta|ganha|perdida|suspensa}
- create_orcamento: payload={condicao_pagamento, desconto_global_pct(0-100), frete(valor), validade(YYYY-MM-DD), observacoes, itens:[{produto_nome, codigo(""), unidade("UN"), quantidade, preco_unitario, desconto_pct(0-100)}]} — cria ou atualiza orçamento da negociação com os itens informados

REGRAS:
- So sugira acoes quando o usuario pedir algo que requer mudanca no CRM
- Se for apenas uma pergunta, retorne acoes=[]
- Seja preciso nas descricoes das acoes (o usuario vai aprovar antes de aplicar)
- Nao invente dados que nao existem nas negociacoes
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
  };

  const LABEL: Record<ActionType, string> = {
    update_negociacao:  'Atualizar negociação',
    add_compromisso:    'Criar compromisso',
    add_anotacao:       'Adicionar anotação',
    toggle_compromisso: 'Marcar compromisso',
    update_etapa:       'Alterar etapa',
    update_status:      'Alterar status',
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
  const [dados, setDados]           = useState<NegociacaoData[]>([]);
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
  const fileRef                     = useRef<HTMLInputElement>(null);
  const bottomRef                   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getAllNegociacoes().then(setDados).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, thinking]);

  const refreshDados = useCallback(async () => {
    setDados(await getAllNegociacoes());
  }, []);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || thinking) return;

    const userMsg: ChatMessage = { role: 'user', content: text, file: anexo ?? undefined };
    setMsgs(prev => [...prev, userMsg]);
    setInput('');
    setAnexo(null);
    setThinking(true);

    try {
      const prompt = buildPrompt(text, dados, [...msgs, userMsg], anexo?.content);
      const raw    = await gemini(prompt);
      let parsed: { resposta?: string; acoes?: Array<{
        id: string; tipo: ActionType; descricao: string;
        negociacao_id?: string; negociacao_nome?: string;
        payload: Record<string, unknown>;
      }> } = {};
      try { parsed = JSON.parse(raw); } catch { parsed = { resposta: raw, acoes: [] }; }

      const actions: PendingAction[] = (parsed.acoes ?? []).map(a => ({
        id:              a.id ?? crypto.randomUUID(),
        tipo:            a.tipo,
        descricao:       a.descricao,
        negociacaoId:    a.negociacao_id,
        negociacaoNome:  a.negociacao_nome,
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
  }, [input, thinking, dados, msgs, anexo]);

  const applyActions = useCallback(async (selected: Set<string>) => {
    if (!pendingActions || pendingMsgIdx === null) return;
    setApplying(true);
    const toApply = pendingActions.filter(a => selected.has(a.id));

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
        if (action.tipo === 'add_compromisso' && action.negociacaoId) {
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
    setMsgs(prev => prev.map((m, i) => i === pendingMsgIdx ? { ...m, applied: true } : m));
    setPendingActions(null);
    setPendingMsgIdx(null);
    setApplying(false);
  }, [pendingActions, pendingMsgIdx, refreshDados]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text().catch(() => '[Arquivo binário — não legível como texto]');
    setAnexo({ name: file.name, content: text.slice(0, 8000) });
    e.target.value = '';
  }

  const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 bg-white border-b border-slate-200 shrink-0">
        <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-purple-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-900 leading-tight">IA CRM</p>
          <p className="text-[11px] text-slate-500">Assistente com acesso total · Gemini 2.0 Flash</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {loading ? (
            <span className="text-xs text-slate-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Carregando dados...</span>
          ) : (
            <span className="text-xs text-green-600 font-medium">{dados.length} negociação(ões) carregada(s)</span>
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

      {/* Anexo pendente */}
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
          <button onClick={() => fileRef.current?.click()} title="Anexar arquivo"
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-purple-600 shrink-0 transition-colors">
            <Paperclip className="w-4 h-4" />
          </button>
          <input ref={fileRef} type="file" className="hidden" accept=".txt,.csv,.json,.md,.xlsx" onChange={handleFile} />
          <textarea
            rows={1}
            className="flex-1 text-sm text-slate-800 placeholder-slate-400 resize-none focus:outline-none py-1.5 max-h-32 leading-relaxed"
            placeholder="Pergunte ou peça uma ação no CRM..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          />
          <button onClick={handleSend} disabled={!input.trim() || thinking}
            className="p-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white shrink-0 transition-colors">
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-slate-400 text-center mt-1.5">
          <AlertTriangle className="w-3 h-3 inline mr-0.5" />Toda alteração no CRM requer sua aprovação antes de ser aplicada
        </p>
      </div>

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
