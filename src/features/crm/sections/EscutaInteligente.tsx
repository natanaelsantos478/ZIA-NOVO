// ─────────────────────────────────────────────────────────────────────────────
// Escuta Inteligente — 4 Agentes de IA trabalhando em conjunto
//
// Agente 1 · Gemini 3.1 Flash  → Transcrição de áudio em tempo real (esquerda)
// Agente 2 · Gemini 3.1 Flash  → Advisor: perfil, sugestões, produtos (centro)
// Agente 3 · Gemini 3.1 Flash  → Extrator de dados do cliente (direita)
// Agente 4 · Gemini 3.1 Pro    → Análise final + ações pós-atendimento (modal)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic, Square, Brain, MessageSquare, User, Search, Send,
  CheckCircle, AlertCircle, AlertTriangle, Loader2, Zap,
  Package, Flame, Thermometer, TrendingUp, X,
  Sparkles, Check, FileText, Calendar, Phone, Mail,
  Building2, DollarSign, RotateCcw, Volume2, ChevronDown,
  Linkedin, Camera, Image as ImageIcon,
} from 'lucide-react';
import { getProdutos, getClientes, createAtendimento, updateAtendimento, createCliente, getProdutoFotos } from '../../../lib/erp';
import type { ErpCliente, ErpProduto } from '../../../lib/erp';
import { useAlerts } from '../../../context/AlertContext';
import { useAIConfig, searchWebImage } from '../../../context/AIConfigContext';
import { supabase } from '../../../lib/supabase';
import { getAllNegociacoes, addAtendimento as addAtendimentoCRM, createNegociacao, addCompromisso, setOrcamento } from '../data/crmData';
import type { NegociacaoData } from '../data/crmData';

// ── Tipos ─────────────────────────────────────────────────────────────────────

type CustomerProfile = 'EMOCIONAL' | 'ANALITICO' | 'EXECUTOR' | 'PRAGMATICO' | 'ASSERTIVO' | 'INDEFINIDO';
type SalesTemp       = 'FRIO' | 'MORNO' | 'QUENTE';
type AdvisorType     = 'pergunta' | 'empatia' | 'produto' | 'objecao' | 'fechamento' | 'neutro';

interface TranscriptLine { id: string; ts: number; text: string; }

interface ProdutoSugerido {
  nome: string;
  motivo: string;           // por que este produto se encaixa para este cliente
  estoque_status: 'ok' | 'baixo' | 'pedir'; // ok=suficiente, baixo=abaixo do mínimo, pedir=sem estoque
  estoque_qtd: number;      // quantidade atual em estoque
  preco_lista: number;      // preço de venda cadastrado (R$)
  preco_sugerido: number | null; // preço sugerido pela IA com base no orçamento do cliente (null = usar lista)
  dica_estoque: string | null;   // dica específica sobre disponibilidade
}

interface AdvisorResult {
  perfil: CustomerProfile;
  confianca_perfil: number;
  temperatura: SalesTemp;
  sugestao: string;
  tipo: AdvisorType;
  perguntas_sugeridas: string[];
  produtos_sugeridos: ProdutoSugerido[];
  produtos_mencionados: string[];  // nomes citados na conversa mas fora do catálogo → busca na web
  alerta: string | null;
  palavra_sugerida: string | null; // palavra/frase que o vendedor hesitou/esqueceu
  busca_imagem: string | null;     // query para imagem contextual que ajuda no atendimento
}

interface CustomerData {
  nome?: string; empresa?: string; cargo?: string;
  email?: string; telefone?: string; orcamento?: string;
  datas: { data: string; contexto: string }[];
  necessidades: string[]; preferencias: string[]; notas: string[];
}

interface FinalAction {
  id: string;
  tipo: 'criar_orcamento' | 'agendar_reuniao' | 'atualizar_cliente' | 'criar_tarefa' | 'registrar_atendimento' | 'enviar_proposta';
  titulo: string; descricao: string; prioridade: 'alta' | 'media' | 'baixa';
  data?: string;   // YYYY-MM-DD — obrigatório para agendar_reuniao
  hora?: string;   // HH:MM     — obrigatório para agendar_reuniao
}

interface FinalAnalysis {
  resumo: string; sentimento_geral: 'positivo' | 'neutro' | 'negativo';
  probabilidade_fechamento: number; acoes: FinalAction[]; observacoes: string;
}

interface ChatMsgImage { name: string; dataUrl: string; mimeType: string; }
interface WebImage { title: string; imageUrl: string; thumbnailUrl: string; link: string; source: string; }
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  images?: ChatMsgImage[];
  webImages?: WebImage[];   // fotos trazidas pela busca na internet
  webSources?: string[];    // fontes citadas pelo Gemini (grounding)
}

type Phase = 'idle' | 'recording' | 'finalizing' | 'review';

// ── Config UI ─────────────────────────────────────────────────────────────────

const PROFILE_CFG: Record<CustomerProfile, { label: string; color: string; bg: string; desc: string }> = {
  EMOCIONAL:  { label: 'Emocional',  color: 'text-pink-700',   bg: 'bg-pink-100',   desc: 'Relacionamento e confiança' },
  ANALITICO:  { label: 'Analítico',  color: 'text-blue-700',   bg: 'bg-blue-100',   desc: 'Dados, comparativos, garantias' },
  EXECUTOR:   { label: 'Executor',   color: 'text-orange-700', bg: 'bg-orange-100', desc: 'Resultados rápidos, sem rodeios' },
  PRAGMATICO: { label: 'Pragmático', color: 'text-green-700',  bg: 'bg-green-100',  desc: 'Custo-benefício e ROI' },
  ASSERTIVO:  { label: 'Assertivo',  color: 'text-purple-700', bg: 'bg-purple-100', desc: 'Controle, status, exclusividade' },
  INDEFINIDO: { label: 'Indefinido', color: 'text-slate-600',  bg: 'bg-slate-100',  desc: 'Colete mais informações' },
};

const TEMP_CFG: Record<SalesTemp, { label: string; Icon: typeof Flame; color: string; bg: string }> = {
  FRIO:   { label: 'Frio',   Icon: Thermometer, color: 'text-blue-600',  bg: 'bg-blue-50'  },
  MORNO:  { label: 'Morno',  Icon: TrendingUp,  color: 'text-amber-600', bg: 'bg-amber-50' },
  QUENTE: { label: 'Quente', Icon: Flame,       color: 'text-red-600',   bg: 'bg-red-50'   },
};

const ADVISOR_BADGE: Record<AdvisorType, string> = {
  pergunta:   'bg-blue-100 text-blue-700',
  empatia:    'bg-pink-100 text-pink-700',
  produto:    'bg-green-100 text-green-700',
  objecao:    'bg-amber-100 text-amber-700',
  fechamento: 'bg-purple-100 text-purple-700',
  neutro:     'bg-slate-100 text-slate-600',
};

const ACTION_ICON: Record<FinalAction['tipo'], typeof FileText> = {
  criar_orcamento:       DollarSign,
  agendar_reuniao:       Calendar,
  atualizar_cliente:     User,
  criar_tarefa:          CheckCircle,
  registrar_atendimento: FileText,
  enviar_proposta:       Send,
};

const BAR_COUNT  = 32;
const DEFAULT_CX: CustomerData = { datas: [], necessidades: [], preferencias: [], notas: [] };

// ── Prompts ───────────────────────────────────────────────────────────────────

interface ProdutoInfo {
  nome: string; grupo: string; preco: number; estoque: number; est_min: number | null; unidade: string;
}

function advisorPrompt(transcript: string, produtos: ProdutoInfo[]) {
  const catJSON = JSON.stringify(produtos.slice(0, 40));
  return `Voce e um assistente de vendas em tempo real. Analise a transcricao e retorne APENAS JSON valido (sem markdown).

PERFIS COMPORTAMENTAIS:
- EMOCIONAL: relacionamento e confianca | ANALITICO: dados e detalhes tecnicos | EXECUTOR: resultados rapidos
- PRAGMATICO: custo-beneficio e ROI | ASSERTIVO: controle e exclusividade | INDEFINIDO: poucas informacoes

CATALOGO DE PRODUTOS (nome, grupo, preco em R$, estoque_atual, estoque_minimo, unidade):
${catJSON || '[]'}

REGRAS DE ESTOQUE:
- estoque_status="ok" se estoque > (est_min ?? 0)
- estoque_status="baixo" se estoque > 0 mas <= est_min
- estoque_status="pedir" se estoque == 0
- dica_estoque: "Estoque baixo (X un.) — pode precisar de pedido" se baixo; "Sem estoque — verificar reposicao" se pedir; null se ok

REGRAS DE PRECO:
- Se cliente mencionou orcamento ou preco, calcule preco_sugerido como menor preco justificavel (nao abaixo do custo se disponivel); senao null
- preco_sugerido como numero decimal (ex: 149.90)

REGRAS DE PRODUTO:
- Sugira ate 4 produtos que MAIS se adequam ao pedido/necessidades do cliente
- Analise NOME COMPLETO + GRUPO para identificar caracteristicas (material, dimensoes, modelo, capacidade, tecnologia)
- Se cliente pediu caracteristica especifica, compare TODOS os produtos e escolha os mais adequados
- motivo: 1 frase curta e direta por que este produto especificamente serve para ESTE cliente agora
- Se nenhum se adequa, retorne []
- produtos_mencionados: liste TODOS os nomes de produtos/marcas/modelos que o cliente mencionou ou o consultor citou durante a conversa, mesmo que nao estejam no catalogo (ex: ["Poltrona Carrier","iPhone 15","Sofa Chester"]). Retorne [] se nao houve mencao.

TRANSCRICAO:
${transcript}

REGRA DE LACUNA: Se o consultor hesitou na fala (disse "aquele...", "como chama", "esqueci o nome", "aquela coisa que...", reticencias, pausa com repeticao), identifique a palavra ou frase exata que ele estava tentando lembrar e coloque em palavra_sugerida. Ex: "o... aquele material de vedacao de borracha..." → "Anel de vedacao / O-ring / gaxeta". Senao: null.
REGRA DE IMAGEM CONTEXTUAL: Se um produto, empresa do cliente, local, processo tecnico ou conceito visual esta sendo discutido e uma imagem ajudaria o vendedor ou cliente a visualizar, coloque uma query de busca curta em busca_imagem (ex: "sofa retratil moderno sala de estar", "fachada Riachuelo shopping"). Senao: null.

JSON EXATO (mantenha esta estrutura):
{"perfil":"INDEFINIDO","confianca_perfil":0,"temperatura":"FRIO","sugestao":"acao especifica e curta AGORA","tipo":"pergunta","perguntas_sugeridas":["Pergunta 1?","Pergunta 2?"],"produtos_sugeridos":[{"nome":"Nome exato do produto","motivo":"motivo especifico para este cliente","estoque_status":"ok","estoque_qtd":10,"preco_lista":299.90,"preco_sugerido":null,"dica_estoque":null}],"produtos_mencionados":["Nome do produto externo"],"alerta":null,"palavra_sugerida":null,"busca_imagem":null}

- sugestao: CURTA e ACIONAVEL | perguntas_sugeridas: 2 ABERTAS | tipo: pergunta|produto|objecao|fechamento|empatia|neutro
- palavra_sugerida: palavra/frase que o consultor hesitou; senao null
- busca_imagem: query curta para imagem que ajuda AGORA no atendimento; senao null`;
}

function extractorPrompt(transcript: string) {
  return `Extraia dados do cliente desta transcricao de vendas. Retorne APENAS JSON valido (sem markdown):
{"nome":null,"empresa":null,"cargo":null,"email":null,"telefone":null,"orcamento":null,"datas":[],"necessidades":[],"preferencias":[],"notas":[]}
Transcricao: ${transcript}`;
}

function finalPrompt(transcript: string, customerData: CustomerData, lastAdvisor: string) {
  const tx = transcript.slice(0, 8000);
  return `Voce e um especialista em CRM e vendas consultivas. Analise o atendimento abaixo e retorne APENAS JSON valido.

TRANSCRICAO DO ATENDIMENTO:
${tx}

DADOS EXTRAIDOS DO CLIENTE: ${JSON.stringify(customerData)}
PERFIL COMPORTAMENTAL IDENTIFICADO: ${lastAdvisor}

Retorne exatamente este JSON preenchido com base na transcricao real (NAO use valores padrao, analise de verdade):
{"resumo":"descreva em 2-3 frases o que aconteceu neste atendimento","sentimento_geral":"positivo","probabilidade_fechamento":75,"acoes":[{"id":"1","tipo":"registrar_atendimento","titulo":"Registrar este atendimento no CRM","descricao":"Atendimento realizado via Escuta Inteligente","prioridade":"alta"},{"id":"2","tipo":"criar_orcamento","titulo":"Criar orcamento para o cliente","descricao":"Orcamento solicitado durante o atendimento","prioridade":"alta"},{"id":"3","tipo":"agendar_reuniao","titulo":"titulo da proxima acao sugerida","descricao":"descricao do que deve ser feito","prioridade":"media","data":"YYYY-MM-DD","hora":"HH:MM"}],"observacoes":"pontos importantes a nao esquecer sobre este cliente e esta oportunidade"}

TIPOS DE ACOES: criar_orcamento | agendar_reuniao | atualizar_cliente | criar_tarefa | registrar_atendimento | enviar_proposta
SENTIMENTO: "positivo" se cliente demonstrou interesse, "negativo" se houve rejeicao ou frustração, "neutro" se indefinido
PROBABILIDADE: numero de 0 a 100 baseado nos sinais reais de compra identificados na transcricao
PRIORIDADE DAS ACOES: "alta" | "media" | "baixa" — seja preciso com base na urgencia identificada
DATAS: para acoes do tipo "agendar_reuniao", preencha "data" (formato YYYY-MM-DD) e "hora" (formato HH:MM) com base na data/hora mencionada na transcricao. Se nao mencionada, use a data de hoje + 7 dias, hora 09:00. Data de hoje: ${new Date().toISOString().slice(0, 10)}`;
}

// ── Helpers — chamadas via ai-proxy (chave Gemini fica no servidor) ──────────

const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

type GeminiResp = { candidates?: { content: { parts: { text: string }[] } }[] };

async function callProxy(body: Record<string, unknown>): Promise<GeminiResp> {
  const { data, error } = await supabase.functions.invoke('ai-proxy', { body });
  if (error) throw new Error(`ai-proxy: ${error.message}`);
  return data as GeminiResp;
}

async function gText(prompt: string): Promise<string> {
  const d = await callProxy({ type: 'gemini-text', prompt });
  if (!d.candidates?.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = (d as any).error as { message?: string } | undefined;
    if (err?.message) throw new Error(`Gemini: ${err.message}`);
    return '{}';
  }
  return d.candidates[0]?.content?.parts?.[0]?.text ?? '{}';
}

async function gProChat(msgs: ChatMessage[], system: string, jsonMode = false): Promise<string> {
  const contents = msgs.map(m => {
    const parts: object[] = [{ text: m.content }];
    if (m.images?.length) {
      for (const img of m.images) {
        parts.push({ inline_data: { mime_type: img.mimeType, data: img.dataUrl.split(',')[1] ?? img.dataUrl } });
      }
    }
    return { role: m.role === 'assistant' ? 'model' : 'user', parts };
  });
  const d = await callProxy({ type: 'gemini-pro-chat', messages: contents, system, jsonMode });
  if (!d.candidates?.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = (d as any).error as { message?: string } | undefined;
    if (err?.message) throw new Error(`Gemini: ${err.message}`);
    return jsonMode ? '{}' : '';
  }
  return (d.candidates[0]?.content?.parts?.[0]?.text ?? (jsonMode ? '{}' : '')).trim();
}

// ── Gemini 3.1 Pro com Google Search Grounding ────────────────────────────────
type GeminiSearchResp = {
  candidates?: {
    content: { parts: { text: string }[] };
    groundingMetadata?: {
      webSearchQueries?: string[];
      groundingChunks?: { web?: { uri: string; title: string } }[];
    };
  }[];
  error?: { message?: string };
};

async function gProSearch(
  msgs: ChatMessage[],
  system: string,
): Promise<{ text: string; queries: string[]; sources: string[] }> {
  const { data, error } = await supabase.functions.invoke('ai-proxy', {
    body: {
      type: 'gemini-pro-search',
      messages: msgs.map(m => ({ role: m.role, content: m.content })),
      system,
    },
  });
  if (error) throw new Error(error.message ?? 'Erro no proxy');
  const resp = data as GeminiSearchResp;
  if (resp.error?.message) throw new Error(`Gemini: ${resp.error.message}`);
  const cand = resp.candidates?.[0];
  const text    = cand?.content?.parts?.map(p => p.text).join('') ?? '';
  const queries = cand?.groundingMetadata?.webSearchQueries ?? [];
  const sources = (cand?.groundingMetadata?.groundingChunks ?? [])
    .map(c => c.web?.title ?? '')
    .filter(Boolean);
  return { text, queries, sources };
}

// ── Busca imagens no Google via Serper (ia-web-search) ────────────────────────
async function searchWebImages(query: string): Promise<WebImage[]> {
  try {
    const { data, error } = await supabase.functions.invoke('ia-web-search', {
      body: { action: 'images', query, num: 6 },
    });
    if (error) return [];
    return (data as { images: WebImage[] }).images ?? [];
  } catch { return []; }
}

function parseJ<T>(raw: string, fb: T): T {
  try {
    const p = JSON.parse(raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
    // Faz merge com o fallback para garantir que campos ausentes recebam valores padrão
    return (typeof p === 'object' && p !== null && !Array.isArray(p))
      ? { ...fb, ...p } as T
      : p as T;
  } catch { return fb; }
}

// ── Modal pré-atendimento ─────────────────────────────────────────────────────

interface PreAtendimentoModalProps {
  onClose: () => void;
  onStart: (linkedNeg: NegociacaoData | null, erpClient?: ErpCliente | null) => void;
}

function PreAtendimentoModal({ onClose, onStart }: PreAtendimentoModalProps) {
  const [search, setSearch]                   = useState('');
  const [selected, setSelected]               = useState<NegociacaoData | null>(null);
  const [selectedErpClient, setSelectedErpClient] = useState<ErpCliente | null>(null);
  const [negs, setNegs]                       = useState<NegociacaoData[]>([]);
  const [erpClientes, setErpClientes]         = useState<ErpCliente[]>([]);

  useEffect(() => {
    getAllNegociacoes().then(setNegs).catch(() => {});
    getClientes().then(setErpClientes).catch(() => {});
  }, []);

  const q = search.toLowerCase();

  const filteredNegs = negs.filter(d => {
    if (!search) return true;
    return d.negociacao.clienteNome.toLowerCase().includes(q) || d.negociacao.id.toLowerCase().includes(q) || d.negociacao.descricao?.toLowerCase().includes(q);
  });

  // Clientes ERP que não têm negociação CRM vinculada (ou que batem na busca)
  const negClienteIds = new Set(negs.map(d => d.negociacao.clienteId).filter(Boolean));
  const filteredErpClientes = erpClientes.filter(c => {
    if (!c.ativo) return false;
    if (search) return c.nome.toLowerCase().includes(q) || (c.cpf_cnpj ?? '').includes(search);
    return !negClienteIds.has(c.id); // sem busca: mostra só os sem negociação
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <Mic className="w-5 h-5 text-purple-600" />
          <div>
            <h2 className="font-bold text-slate-800 text-sm">Configurar Atendimento</h2>
            <p className="text-xs text-slate-400">Vincule a uma negociação ou inicie sem vínculo</p>
          </div>
          <button onClick={onClose} className="ml-auto text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Busca */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              className="w-full pl-8 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400"
              placeholder="Buscar negociação ou cliente..."
              value={search} onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          {/* Lista de negociações + clientes ERP */}
          <div className="space-y-1.5 max-h-64 overflow-y-auto custom-scrollbar">
            {filteredNegs.length === 0 && filteredErpClientes.length === 0 && (
              <p className="text-center text-sm text-slate-400 py-6">Nenhuma negociação ou cliente encontrado</p>
            )}

            {/* Negociações CRM */}
            {filteredNegs.length > 0 && (
              <>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-1">Negociações CRM</p>
                {filteredNegs.map(d => {
                  const n = d.negociacao;
                  const isSel = selected?.negociacao.id === n.id;
                  return (
                    <button
                      key={n.id}
                      onClick={() => { setSelected(isSel ? null : d); setSelectedErpClient(null); }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl border transition-colors ${isSel ? 'border-purple-400 bg-purple-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-[11px] font-mono text-slate-400">{n.id}</p>
                            {d.atendimentos.length > 0 && (
                              <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full">{d.atendimentos.length} atend.</span>
                            )}
                          </div>
                          <p className="text-sm font-semibold text-slate-800 truncate">{n.clienteNome}</p>
                          {n.descricao && <p className="text-xs text-slate-500 truncate">{n.descricao}</p>}
                        </div>
                        {isSel && <Check className="w-4 h-4 text-purple-600 shrink-0 mt-1" />}
                      </div>
                    </button>
                  );
                })}
              </>
            )}

            {/* Clientes ERP */}
            {filteredErpClientes.length > 0 && (
              <>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-1 pt-1">Clientes</p>
                {filteredErpClientes.map(c => {
                  const isSel = selectedErpClient?.id === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedErpClient(isSel ? null : c); setSelected(null); }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl border transition-colors ${isSel ? 'border-purple-400 bg-purple-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">{c.tipo}</span>
                            {c.cpf_cnpj && <p className="text-[11px] font-mono text-slate-400">{c.cpf_cnpj}</p>}
                          </div>
                          <p className="text-sm font-semibold text-slate-800 truncate">{c.nome}</p>
                          {c.email && <p className="text-xs text-slate-500 truncate">{c.email}</p>}
                        </div>
                        {isSel && <Check className="w-4 h-4 text-purple-600 shrink-0 mt-1" />}
                      </div>
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {(selected || selectedErpClient) && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
              <p className="text-xs text-purple-500 font-semibold">Selecionado</p>
              {selected && (
                <>
                  <p className="text-sm font-bold text-purple-800">{selected.negociacao.clienteNome}</p>
                  <p className="text-[11px] font-mono text-purple-400">{selected.negociacao.id}</p>
                </>
              )}
              {selectedErpClient && (
                <>
                  <p className="text-sm font-bold text-purple-800">{selectedErpClient.nome}</p>
                  <p className="text-[11px] text-purple-400">{selectedErpClient.cpf_cnpj || selectedErpClient.email || 'Cliente ERP'}</p>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={() => onStart(selected, selectedErpClient)}
            className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
          >
            <Mic className="w-4 h-4" /> Iniciar Atendimento
          </button>
          <button
            onClick={() => onStart(null, null)}
            className="px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
          >
            Sem vínculo
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════
export default function EscutaInteligente() {

  const [phase, setPhase]       = useState<Phase>('idle');
  const [duration, setDuration] = useState(0);
  const [wBars, setWBars]       = useState<number[]>(Array(BAR_COUNT).fill(0.04));
  const [error, setError]       = useState<string | null>(null);

  // Agente 1 — Transcrição
  const [lines, setLines]       = useState<TranscriptLine[]>([]);
  const txEndRef                = useRef<HTMLDivElement>(null);

  // Agente 2 — Advisor
  const [advisor, setAdvisor]           = useState<AdvisorResult | null>(null);
  const [advLoad, setAdvLoad]           = useState(false);
  const [advError, setAdvError]         = useState<string | null>(null);
  const [advisorContextImg, setAdvisorContextImg] = useState<WebImage[]>([]);
  const advTimer                        = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Agente 3 — Extrator
  const [cx, setCx]             = useState<CustomerData>(DEFAULT_CX);
  const [extrLoad, setExtrLoad] = useState(false);

  // LinkedIn
  const [liQ, setLiQ]           = useState('');

  // Transcrição interim (SpeechRecognition)
  const [interimText, setInterimText] = useState('');

  // Produtos
  const [prods, setProds]           = useState<ErpProduto[]>([]);
  const [prodFotos, setProdFotos]   = useState<Record<string, string>>({});
  const [lightbox, setLightbox]     = useState<{ nome: string; url: string } | null>(null);
  const [instantProdNames, setInstantProdNames] = useState<string[]>([]);   // detecção local imediata da transcrição

  const { addLevel1Alert } = useAlerts();
  const { systemContext, config: aiCfg } = useAIConfig();

  // Refs de gravação
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const srRef    = useRef<any>(null);
  const recRef   = useRef<MediaRecorder | null>(null);
  const actxRef  = useRef<AudioContext | null>(null);
  const anlRef   = useRef<AnalyserNode | null>(null);
  const afRef    = useRef<number>(0);
  const t0Ref    = useRef<number>(0);
  const timerRef     = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const extrRef      = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const mimeRef      = useRef('audio/webm');
  const txRef        = useRef('');   // acumula transcrição completa — evita side-effect dentro de setState
  const lineCountRef = useRef(0);    // conta chunks finais para disparar extrator cedo

  // Vinculação a negociação CRM
  const [showPreModal, setShowPreModal]     = useState(false);
  const [linkedNeg, setLinkedNeg]           = useState<NegociacaoData | null>(null);
  const [atendSaved, setAtendSaved]         = useState(false);
  const linkedNegRef                        = useRef<NegociacaoData | null>(null);
  const linkedErpClientRef                  = useRef<ErpCliente | null>(null);
  useEffect(() => { linkedNegRef.current = linkedNeg; }, [linkedNeg]);

  // Análise final
  const [finMsg, setFinMsg]     = useState('');
  const [fa, setFa]             = useState<FinalAnalysis | null>(null);
  const [selAct, setSelAct]     = useState<Set<string>>(new Set());
  const [applAct, setApplAct]   = useState<Set<string>>(new Set());
  const [chatMsgs, setChatMsgs]   = useState<ChatMessage[]>([]);
  const [chatIn, setChatIn]       = useState('');
  const [chatLoad, setChatLoad]   = useState(false);
  const [chatImgs, setChatImgs]   = useState<ChatMsgImage[]>([]);
  const [imgMenuChat, setImgMenuChat] = useState(false);
  const chatEndRef                = useRef<HTMLDivElement>(null);
  const chatGaleriaRef            = useRef<HTMLInputElement>(null);
  const chatCameraRef             = useRef<HTMLInputElement>(null);

  useEffect(() => { getProdutos().then(setProds).catch(() => {}); }, []);
  useEffect(() => { txEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [lines]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMsgs]);
  useEffect(() => { if (cx.nome && !liQ) setLiQ(cx.nome); }, [cx.nome]);
  // Cleanup ao desmontar componente (navegar para outra seção enquanto grava)
  useEffect(() => () => {
    if (srRef.current) { srRef.current.onend = null; srRef.current.stop(); srRef.current = null; }
    recRef.current?.stop();
    cancelAnimationFrame(afRef.current);
    clearInterval(timerRef.current);
    clearInterval(extrRef.current);
    actxRef.current?.close();
  }, []);

  // Waveform
  const animWave = useCallback(() => {
    if (!anlRef.current) return;
    const buf = new Uint8Array(anlRef.current.frequencyBinCount);
    anlRef.current.getByteFrequencyData(buf);
    const step = Math.floor(buf.length / BAR_COUNT);
    setWBars(Array.from({ length: BAR_COUNT }, (_, i) => Math.max(0.04, (buf[i * step] ?? 0) / 255)));
    afRef.current = requestAnimationFrame(animWave);
  }, []);

  // Agente 2 (debounce 2s após cada chunk)
  const runAdvisor = useCallback((text: string) => {
    if (!text.trim()) return;
    clearTimeout(advTimer.current);
    advTimer.current = setTimeout(async () => {
      setAdvLoad(true); setAdvError(null);
      try {
        const prodInfos: ProdutoInfo[] = prods.map(p => ({
          nome:    p.nome,
          grupo:   p.erp_grupo_produtos?.nome ?? '',
          preco:   p.preco_venda / 100,
          estoque: p.estoque_atual,
          est_min: p.estoque_minimo,
          unidade: p.unidade_medida,
        }));
        const raw = await gText(advisorPrompt(text, prodInfos));
        const adv = parseJ<AdvisorResult>(raw, {
          perfil: 'INDEFINIDO', confianca_perfil: 0, temperatura: 'FRIO',
          sugestao: '', tipo: 'neutro', perguntas_sugeridas: [], produtos_sugeridos: [],
          produtos_mencionados: [], alerta: null, palavra_sugerida: null, busca_imagem: null,
        });
        if (!Array.isArray(adv.perguntas_sugeridas)) adv.perguntas_sugeridas = [];
        if (!Array.isArray(adv.produtos_sugeridos)) adv.produtos_sugeridos = [];
        if (!Array.isArray(adv.produtos_mencionados)) adv.produtos_mencionados = [];
        setAdvisor(adv);

        // Busca imagem contextual em background (não bloqueia a UI)
        if (adv.busca_imagem) {
          setAdvisorContextImg([]);
          searchWebImages(adv.busca_imagem).then(imgs => {
            if (imgs.length) setAdvisorContextImg(imgs.slice(0, 4));
          }).catch(() => {});
        } else {
          setAdvisorContextImg([]);
        }

        // Agrega todos os nomes a mostrar: sugeridos (catálogo) + mencionados (externos)
        const todoNomes = [
          ...adv.produtos_sugeridos.map(ps => typeof ps === 'string' ? ps : ps.nome),
          ...adv.produtos_mencionados,
        ];
        if (todoNomes.length) {
          setInstantProdNames(prev => [...new Set([...todoNomes, ...prev])].slice(0, 6));
        }

        // Carrega foto para produtos do catálogo (banco → web fallback)
        adv.produtos_sugeridos.forEach(async (ps) => {
          const nome = typeof ps === 'string' ? ps : ps.nome;
          if (prodFotos[nome]) return;
          const erp = prods.find(p => p.nome.toLowerCase() === nome.toLowerCase());
          if (erp) {
            try {
              const fotos = await getProdutoFotos(erp.id);
              const cover = fotos.find(f => f.is_cover) ?? fotos[0];
              if (cover) { setProdFotos(prev => ({ ...prev, [nome]: cover.url })); return; }
            } catch { /* continua */ }
          }
          const webUrl = await searchWebImage(nome, aiCfg);
          if (webUrl) setProdFotos(prev => ({ ...prev, [nome]: webUrl }));
        });

        // Busca foto na web para produtos mencionados fora do catálogo
        adv.produtos_mencionados.forEach(async (nome) => {
          if (prodFotos[nome]) return;
          const webUrl = await searchWebImage(nome, aiCfg);
          if (webUrl) setProdFotos(prev => ({ ...prev, [nome]: webUrl }));
        });
      } catch (e) {
        setAdvError((e as Error).message);
      }
      finally { setAdvLoad(false); }
    }, 2000);
  }, [prods]);

  // Agente 3 (a cada 30s)
  const runExtractor = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setExtrLoad(true);
    try {
      const raw = await gText(extractorPrompt(text));
      const d   = parseJ<CustomerData>(raw, DEFAULT_CX);
      setCx(prev => ({
        nome:         d.nome      ?? prev.nome,
        empresa:      d.empresa   ?? prev.empresa,
        cargo:        d.cargo     ?? prev.cargo,
        email:        d.email     ?? prev.email,
        telefone:     d.telefone  ?? prev.telefone,
        orcamento:    d.orcamento ?? prev.orcamento,
        datas:        [...prev.datas,        ...(d.datas        ?? [])],
        necessidades: [...new Set([...prev.necessidades, ...(d.necessidades ?? [])])],
        preferencias: [...new Set([...prev.preferencias, ...(d.preferencias ?? [])])],
        notas:        [...new Set([...prev.notas,        ...(d.notas        ?? [])])],
      }));
    } catch { /* silent */ }
    finally { setExtrLoad(false); }
  }, []);

  // Iniciar gravação
  const start = useCallback(async () => {
    setError(null); setLines([]); setAdvisor(null); setCx(DEFAULT_CX);
    setInstantProdNames([]);
    setApplAct(new Set()); setDuration(0); setInterimText(''); setAtendSaved(false);
    txRef.current = ''; lineCountRef.current = 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = ((window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition) as (new () => any) | undefined;
    if (!SR) {
      setError('Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx    = new AudioContext();
      if (ctx.state === 'suspended') await ctx.resume();
      const anl    = ctx.createAnalyser(); anl.fftSize = 128;
      ctx.createMediaStreamSource(stream).connect(anl);
      actxRef.current = ctx; anlRef.current = anl;
      afRef.current   = requestAnimationFrame(animWave);

      // MediaRecorder apenas para visualização do waveform (sem processamento de chunks)
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      mimeRef.current = mime;
      const rec = new MediaRecorder(stream, { mimeType: mime });
      recRef.current = rec;
      rec.onstop = () => stream.getTracks().forEach(t => t.stop());
      rec.start();

      // SpeechRecognition para transcrição em tempo real
      const sr = new SR();
      sr.continuous = true;
      sr.interimResults = true;
      sr.lang = 'pt-BR';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sr.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            const text = res[0].transcript.trim();
            if (text) {
              // Acumula no ref — sem side-effects dentro de setState
              txRef.current += (txRef.current ? ' ' : '') + text;
              lineCountRef.current += 1;
              const id = crypto.randomUUID();
              const ts = Math.floor((Date.now() - t0Ref.current) / 1000);
              setLines(prev => [...prev, { id, ts, text }]);
              // Advisor: debounce 2s após cada chunk (chamado fora do setState)
              runAdvisor(txRef.current);
              // Extrator: disparo precoce no 3º e 10º chunk; depois o intervalo cuida
              if (lineCountRef.current === 3 || lineCountRef.current === 10) {
                runExtractor(txRef.current);
              }
            }
          } else {
            interim += res[0].transcript;
          }
        }
        setInterimText(interim);
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sr.onerror = (e: any) => {
        if (e.error === 'not-allowed' || e.error === 'audio-capture') {
          setError('Permissão de microfone negada. Permita o acesso e tente novamente.');
          if (srRef.current) { srRef.current.onend = null; srRef.current = null; }
        }
        // 'no-speech', 'network', 'aborted' — onend cuida do restart
      };
      // SpeechRecognition para automaticamente em silêncio; reinicia para manter contínuo
      sr.onend = () => { if (srRef.current) { try { sr.start(); } catch { /* estado inválido */ } } };
      sr.start();
      srRef.current = sr;

      t0Ref.current = Date.now();
      setPhase('recording');
      timerRef.current = setInterval(() => setDuration(Math.floor((Date.now() - t0Ref.current) / 1000)), 1000);
      extrRef.current  = setInterval(() => { if (txRef.current) runExtractor(txRef.current); }, 25000);
    } catch (err: unknown) {
      const name = (err instanceof Error) ? err.name : '';
      if (name === 'NotReadableError' || name === 'TrackStartError') {
        setError('Microfone em uso por outro programa (Zoom, Teams, Discord?). Feche-o e tente novamente.');
      } else if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setError('Permissão de microfone negada. Clique no cadeado na barra do navegador e permita o acesso.');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setError('Nenhum microfone encontrado. Conecte um microfone e tente novamente.');
      } else {
        setError(`Erro ao acessar microfone: ${name || 'desconhecido'}. Tente recarregar a página.`);
      }
    }
  }, [animWave, runAdvisor, runExtractor]);

  // Parar + análise final
  const stop = useCallback(async () => {
    clearInterval(timerRef.current); clearInterval(extrRef.current);
    cancelAnimationFrame(afRef.current); actxRef.current?.close();
    if (srRef.current) { srRef.current.onend = null; srRef.current.stop(); srRef.current = null; }
    recRef.current?.stop(); setWBars(Array(BAR_COUNT).fill(0.04));
    setInterimText('');
    setPhase('finalizing');

    const curLines:   TranscriptLine[]   = await new Promise(r => setLines(l   => { r(l); return l; }));
    const curCx:      CustomerData       = await new Promise(r => setCx(c       => { r(c); return c; }));
    const curAdv:     AdvisorResult|null = await new Promise(r => setAdvisor(a  => { r(a); return a; }));
    const transcript  = curLines.map(l => l.text).join('\n');

    if (!transcript.trim()) { setError('Nenhuma transcrição capturada. Verifique o microfone.'); setPhase('idle'); return; }

    // Extrator final se ainda não tiver dados básicos
    const hasData = !!(curCx.nome || curCx.empresa || curCx.necessidades.length);
    if (!hasData) { setFinMsg('Extraindo dados do cliente...'); await runExtractor(transcript).catch(() => {}); }

    // ── Auto-save: registra o atendimento com a transcrição imediatamente ──
    let savedAtendId: string | null = null;
    try {
      setFinMsg('Salvando atendimento...');
      // Determina o cliente ERP: prioriza cliente vinculado na negociação CRM ou selecionado diretamente.
      // Evita busca por nome vazio (que retornaria todos os clientes e vincularia ao errado).
      const explicitClientId = linkedNegRef.current?.negociacao.clienteId ?? linkedErpClientRef.current?.id ?? null;
      let erpClientId: string | null = explicitClientId;
      if (!erpClientId && curCx.nome && curCx.nome.trim().length >= 2) {
        const found = await getClientes(curCx.nome.trim()).catch(() => []);
        if (found.length === 1) erpClientId = found[0].id; // só vincula se exato (1 resultado)
      }
      if (erpClientId) {
        const descricao = [
          curCx.empresa ? `Empresa: ${curCx.empresa}` : '',
          curCx.cargo   ? `Cargo: ${curCx.cargo}` : '',
          curCx.orcamento ? `Orçamento: ${curCx.orcamento}` : '',
          curCx.necessidades.length ? `Necessidades: ${curCx.necessidades.join(', ')}` : '',
          '',
          '── Transcrição ──',
          curLines.map(l => `[${fmt(l.ts)}] ${l.text}`).join('\n'),
        ].filter(Boolean).join('\n');
        const atnd = await createAtendimento({
          tipo: 'ATENDIMENTO', status: 'EM_ANDAMENTO',
          cliente_id: erpClientId, responsavel_id: null,
          titulo: `Escuta IA · ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}${curCx.nome ? ' · ' + curCx.nome : ''}`,
          descricao, prioridade: 'MEDIA',
          data_abertura: new Date().toISOString(), data_fechamento: null,
        });
        savedAtendId = atnd.id;
      }
    } catch { /* prossegue mesmo se o save falhar */ }

    // ── Análise Gemini Pro ──
    setFinMsg('Gemini 1.5 Pro analisando atendimento...');
    try {
      const sysAnalise = [systemContext, 'Voce e especialista em vendas e CRM. Analise atendimentos e retorne JSON conforme solicitado.'].filter(Boolean).join('\n\n');
      const raw = await gProChat(
        [{ role: 'user', content: finalPrompt(transcript, curCx, JSON.stringify(curAdv)) }],
        sysAnalise,
        true, // JSON mode
      );
      const analysis = parseJ<FinalAnalysis>(raw, { resumo: '', sentimento_geral: 'neutro', probabilidade_fechamento: 0, acoes: [], observacoes: '' });
      if (!Array.isArray(analysis.acoes)) analysis.acoes = [];

      // Garante que "registrar_atendimento" está sempre nas ações
      if (!analysis.acoes.find(a => a.tipo === 'registrar_atendimento')) {
        analysis.acoes.unshift({
          id: crypto.randomUUID(), tipo: 'registrar_atendimento',
          titulo: 'Registrar atendimento no CRM', descricao: analysis.resumo || 'Atendimento via Escuta Inteligente', prioridade: 'alta',
        });
      }

      // Atualiza o atendimento salvo com o resumo da análise
      if (savedAtendId && analysis.resumo) {
        updateAtendimento(savedAtendId, {
          status: 'RESOLVIDO',
          descricao: `${analysis.resumo}\n\nProbabilidade: ${analysis.probabilidade_fechamento}% · Sentimento: ${analysis.sentimento_geral}\n\n${analysis.observacoes ? 'Obs: ' + analysis.observacoes + '\n\n' : ''}── Transcrição ──\n${curLines.map(l => `[${fmt(l.ts)}] ${l.text}`).join('\n')}`,
        }).catch(() => {});
      }

      setSelAct(new Set(analysis.acoes.filter(a => a.prioridade === 'alta').map(a => a.id)));
      setFa(analysis);

      // ── Alerta Nível 1 para Gestor ────────────────────────────────────────
      // Dispara quando a IA detecta alta probabilidade de fechamento com sentimento negativo
      if (analysis.probabilidade_fechamento >= 60 && analysis.sentimento_geral === 'negativo') {
        addLevel1Alert({
          dealName:    linkedNegRef.current?.negociacao.clienteNome ?? curCx.empresa ?? curCx.nome ?? 'Atendimento em curso',
          clientName:  curCx.nome ?? curCx.empresa ?? '—',
          probability: analysis.probabilidade_fechamento,
          observacoes: analysis.observacoes ?? analysis.resumo ?? '',
          negociacaoId: linkedNegRef.current?.negociacao.id,
        });
      }
      const savedNote = savedAtendId ? '\n\nAtendimento salvo no CRM.' : '';
      setChatMsgs([{
        role: 'assistant',
        content: `${analysis.resumo}\n\nProbabilidade de fechamento: **${analysis.probabilidade_fechamento}%** · Sentimento: ${analysis.sentimento_geral}\n\n${analysis.acoes.length} ação(ões) sugerida(s). Como posso ajudar?${savedNote}`,
      }]);
      setPhase('review');
    } catch (e) {
      // Mesmo se Gemini falhar, vai para review com o que temos
      const fallback: FinalAnalysis = {
        resumo: 'Análise automática indisponível. Verifique a chave Gemini nas configurações.',
        sentimento_geral: 'neutro', probabilidade_fechamento: 0,
        acoes: [{ id: '1', tipo: 'registrar_atendimento', titulo: 'Registrar atendimento', descricao: transcript.slice(0, 500), prioridade: 'alta' }],
        observacoes: `Erro: ${(e as Error).message}`,
      };
      setFa(fallback);
      setSelAct(new Set(['1']));
      const savedNote = savedAtendId ? '\n\nA transcrição foi salva no CRM.' : '';
      setChatMsgs([{
        role: 'assistant',
        content: `Não foi possível gerar análise automática (${(e as Error).message}).${savedNote}\n\nA transcrição foi capturada com sucesso. Posso ajudar a analisar?`,
      }]);
      setPhase('review');
    }
  }, [runExtractor]);

  // Leitura de imagens para o chat
  async function handleChatImagem(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      if (chatImgs.length >= 4) break;
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setChatImgs(prev => [...prev, { name: file.name, dataUrl, mimeType: file.type }]);
    }
    e.target.value = '';
    setImgMenuChat(false);
  }

  // Busca local de produto (voz/texto) e exibe na sidebar em tempo real
  const searchProdLocal = useCallback((term: string) => {
    const t = term.toLowerCase().trim();
    if (!t) return;
    const found = prods.filter(p =>
      p.nome.toLowerCase().includes(t) || t.split(/\s+/).some(w => w.length > 3 && p.nome.toLowerCase().includes(w))
    );
    if (!found.length) return;
    setInstantProdNames(prev => {
      const names = found.slice(0, 3).map(p => p.nome);
      return [...names, ...prev.filter(n => !names.includes(n))].slice(0, 6);
    });
    found.slice(0, 3).forEach(async (prod) => {
      if (prodFotos[prod.nome]) return;
      try {
        const fotos = await getProdutoFotos(prod.id);
        const cover = fotos.find(f => f.is_cover) ?? fotos[0];
        if (cover) { setProdFotos(prev => ({ ...prev, [prod.nome]: cover.url })); return; }
      } catch { /* continua */ }
      const url = await searchWebImage(prod.nome, aiCfg);
      if (url) setProdFotos(prev => ({ ...prev, [prod.nome]: url }));
    });
  }, [prods, prodFotos, aiCfg]);

  // Chat com Gemini 3.1 Pro — disponível durante gravação e revisão
  const sendChat = useCallback(async () => {
    if ((!chatIn.trim() && !chatImgs.length) || chatLoad) return;
    const msg: ChatMessage = { role: 'user', content: chatIn || '(imagem enviada)', images: chatImgs.length ? [...chatImgs] : undefined };
    setChatMsgs(p => [...p, msg]); setChatIn(''); setChatImgs([]); setChatLoad(true);

    // Intercepção local: "procure/busque/mostre/encontre/pesquise [produto X]"
    const cmdMatch = chatIn.match(/(?:procur[ae]|busqu[ae]|buscar?|mostrar?|mostr[ae]|encontr[ae]|pesquisa[r]?)\s+(?:(?:o|a|um|uma)\s+)?(?:produto\s+)?(.+)/i);
    if (cmdMatch) searchProdLocal(cmdMatch[1]);

    const tx = lines.map(l => l.text).join(' ');
    try {
      const sysChat = [
        systemContext,
        `Voce e especialista em vendas assistindo um atendimento ao vivo. Transcricao atual: "${tx.slice(0, 3000)}". ${fa ? `Analise feita: ${JSON.stringify(fa)}.` : `Analise em andamento: ${JSON.stringify(advisor ?? {})}.`} Responda em portugues, de forma direta e util para o consultor de vendas. Quando o usuario pedir informacoes sobre empresas, produtos, pessoas ou noticias, use a busca na internet para trazer dados atualizados.`,
      ].filter(Boolean).join('\n\n');

      // Usa Gemini com Google Search Grounding para o chat final
      const { text, queries, sources } = await gProSearch([...chatMsgs, msg], sysChat);

      // Se o Gemini pesquisou algo, busca imagens para enriquecer a resposta
      let webImages: WebImage[] = [];
      if (queries.length > 0) {
        webImages = await searchWebImages(queries[0]);
      }

      setChatMsgs(p => [...p, {
        role: 'assistant',
        content: text,
        webImages: webImages.length ? webImages : undefined,
        webSources: sources.length ? sources : undefined,
      }]);
    } catch (e) {
      setChatMsgs(p => [...p, { role: 'assistant', content: `Erro: ${(e as Error).message}` }]);
    } finally { setChatLoad(false); }
  }, [chatIn, chatImgs, chatLoad, fa, chatMsgs, lines, searchProdLocal]);

  // Aplicar ações selecionadas
  const applyActions = useCallback(async () => {
    if (!fa) return;
    const applied = new Set<string>();
    for (const action of fa.acoes.filter(a => selAct.has(a.id))) {
      try {
        if (action.tipo === 'registrar_atendimento') {
          const explicitId = linkedNegRef.current?.negociacao.clienteId ?? linkedErpClientRef.current?.id ?? null;
          let erpClientId: string | null = explicitId;
          if (!erpClientId && cx.nome && cx.nome.trim().length >= 2) {
            const found = await getClientes(cx.nome.trim()).catch(() => []);
            if (found.length === 1) erpClientId = found[0].id;
          }
          if (erpClientId) {
            await createAtendimento({
              tipo: 'ATENDIMENTO', status: 'ABERTO', cliente_id: erpClientId,
              responsavel_id: null, titulo: `Escuta IA — ${cx.nome ?? 'Cliente'}`,
              descricao: fa.resumo, prioridade: 'ALTA',
              data_abertura: new Date().toISOString(), data_fechamento: null,
            });
          }
        }

        if (action.tipo === 'agendar_reuniao' && linkedNegRef.current) {
          const neg = linkedNegRef.current;
          const dataComp = action.data ?? new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
          const horaComp = action.hora ?? '09:00';
          await addCompromisso(neg.negociacao.id, {
            clienteNome: cx.nome ?? neg.negociacao.clienteNome ?? 'Cliente',
            titulo: action.titulo,
            data: dataComp,
            hora: horaComp,
            duracao: 60,
            tipo: 'reuniao',
            notas: action.descricao,
            criado_por: 'ia',
            concluido: false,
          });
        }

        if (action.tipo === 'criar_orcamento') {
          // Usa negociação vinculada ou cria uma nova
          let negId: string;
          if (linkedNegRef.current) {
            negId = linkedNegRef.current.negociacao.id;
          } else {
            const valorNum = cx.orcamento ? Number(cx.orcamento.replace(/\D/g, '')) / 100 || 0 : 0;
            const novaOp = await createNegociacao({
              clienteId:      linkedErpClientRef.current?.id ?? undefined,
              clienteNome:    cx.nome ?? 'Cliente',
              clienteEmail:   cx.email ?? undefined,
              clienteTelefone: cx.telefone ?? undefined,
              descricao:      action.descricao.slice(0, 120),
              status:         'aberta',
              etapa:          'qualificacao',
              valor_estimado: valorNum || undefined,
              probabilidade:  fa.probabilidade_fechamento,
              responsavel:    '',
              notas:          fa.observacoes,
            });
            negId = novaOp.negociacao.id;
          }
          await setOrcamento(negId, {
            status:              'rascunho',
            itens:               [],
            condicao_pagamento:  '',
            desconto_global_pct: 0,
            frete:               0,
            total:               0,
            dataCriacao:         new Date().toISOString().split('T')[0],
            criado_por:          'ia',
            observacoes:         action.descricao,
          });
        }

        applied.add(action.id);
      } catch { /* continue */ }
    }
    setApplAct(applied);
  }, [fa, selAct, cx]);

  // Reset
  const reset = useCallback(() => {
    if (srRef.current) { srRef.current.onend = null; srRef.current.stop(); srRef.current = null; }
    setPhase('idle'); setLines([]); setAdvisor(null); setCx(DEFAULT_CX);
    setFa(null); setDuration(0); setApplAct(new Set()); setSelAct(new Set());
    setChatMsgs([]); setError(null); setLiQ(''); setInterimText('');
    setLinkedNeg(null); setAtendSaved(false);
    linkedErpClientRef.current = null;
  }, []);

  // Aliases render
  const profCfg = advisor ? PROFILE_CFG[advisor.perfil]   : null;
  const tempCfg = advisor ? TEMP_CFG[advisor.temperatura] : null;

  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-3 bg-white border-b border-slate-200 flex-shrink-0">
        <Volume2 className="w-5 h-5 text-purple-600" />
        <div>
          <h1 className="text-sm font-bold text-slate-900 leading-tight">Escuta Inteligente</h1>
          <p className="text-[11px] text-slate-500">4 agentes · Gemini 3.1 Flash Lite × 3 + Gemini 3.1 Pro</p>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {phase === 'recording' && (
            <span className="flex items-center gap-1.5 font-mono text-sm text-slate-600">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />{fmt(duration)}
            </span>
          )}
          {phase === 'idle' && (
            <button onClick={() => setShowPreModal(true)} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm">
              <Mic className="w-4 h-4" /> Iniciar Atendimento
            </button>
          )}
          {phase === 'recording' && (
            <button onClick={stop} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm">
              <Square className="w-4 h-4" /> Finalizar e Analisar
            </button>
          )}
          {phase === 'review' && (
            <button onClick={reset} className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
              <RotateCcw className="w-4 h-4" /> Novo Atendimento
            </button>
          )}
        </div>
      </div>

      {/* ── ERRO ─────────────────────────────────────────────────────────────── */}
      {error && (
        <div className="mx-5 mt-2 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-2 text-sm text-red-700 flex-shrink-0">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ── FINALIZANDO ──────────────────────────────────────────────────────── */}
      {phase === 'finalizing' && (
        <div className="flex items-center justify-center flex-1">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto mb-4">
              <Brain className="w-8 h-8 text-purple-600 animate-pulse" />
            </div>
            <p className="font-semibold text-slate-800">{finMsg || 'Processando...'}</p>
            <p className="text-sm text-slate-500 mt-1">Aguarde alguns segundos</p>
          </div>
        </div>
      )}

      {/* ── IDLE ─────────────────────────────────────────────────────────────── */}
      {phase === 'idle' && (
        <div className="flex items-center justify-center flex-1 p-8">
          <div className="text-center max-w-lg">
            <div className="w-20 h-20 rounded-3xl bg-purple-100 flex items-center justify-center mx-auto mb-5">
              <Mic className="w-10 h-10 text-purple-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">Pronto para o atendimento</h2>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Clique em <strong>Iniciar Atendimento</strong> para ativar os 4 agentes de IA simultaneamente.
            </p>
            <div className="grid grid-cols-2 gap-3 text-left">
              {[
                { Icon: Mic,      label: 'Agente 1 · Gemini', desc: 'Transcrição ao vivo (esquerda)',      col: 'text-blue-600',   bg: 'bg-blue-50'   },
                { Icon: Brain,    label: 'Agente 2 · Gemini', desc: 'Advisor: perfil + sugestões (centro)', col: 'text-purple-600', bg: 'bg-purple-50' },
                { Icon: User,     label: 'Agente 3 · Gemini', desc: 'Dados do cliente (direita)',          col: 'text-green-600',  bg: 'bg-green-50'  },
                { Icon: Sparkles, label: 'Agente 4 · Gemini', desc: 'Análise final + ações (modal)',       col: 'text-amber-600',  bg: 'bg-amber-50'  },
              ].map((a, i) => (
                <div key={i} className={`flex items-start gap-3 ${a.bg} rounded-xl p-3`}>
                  <a.Icon className={`w-4 h-4 ${a.col} mt-0.5 flex-shrink-0`} />
                  <div>
                    <p className="text-xs font-semibold text-slate-700">{a.label}</p>
                    <p className="text-xs text-slate-500">{a.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── GRID 3 COLUNAS (recording | review) ─────────────────────────────── */}
      {(phase === 'recording' || phase === 'review') && (
        <div className="flex flex-1 overflow-hidden">

          {/* ESQUERDA — Transcrição (Agente 1) */}
          <div className="w-[31%] flex flex-col border-r border-slate-200 bg-white">
            {phase === 'recording' && (
              <div className="bg-slate-900 px-4 py-2.5 flex-shrink-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    Agente 1 · Transcrição
                  </span>
                  <div className="flex items-center gap-2">
                    {interimText && <Loader2 className="w-3 h-3 text-purple-400 animate-spin" />}
                    <span className="text-[11px] font-mono text-slate-500">{fmt(duration)}</span>
                  </div>
                </div>
                <div className="flex items-end gap-px h-7">
                  {wBars.map((h, i) => (
                    <div key={i} className="flex-1 rounded-full transition-all duration-75"
                      style={{ height: `${Math.max(8, h * 100)}%`, backgroundColor: h > 0.5 ? '#8b5cf6' : h > 0.2 ? '#a78bfa' : '#334155' }} />
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 flex-shrink-0">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-semibold text-slate-600">Transcrição ao Vivo</span>
              <span className="ml-auto text-xs text-slate-400">{lines.length} frases</span>
            </div>

            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 custom-scrollbar">
              {lines.length === 0 && !interimText ? (
                <div className="text-center py-10 text-slate-400">
                  <Mic className="w-6 h-6 mx-auto mb-2 opacity-20" />
                  <p className="text-xs">Aguardando áudio...</p>
                </div>
              ) : (
                lines.map(line => (
                  <div key={line.id} className="rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-2">
                    <span className="text-[10px] font-mono text-slate-400 mr-1.5">{fmt(line.ts)}</span>
                    <span className="text-xs text-slate-700 leading-relaxed">{line.text}</span>
                  </div>
                ))
              )}
              {interimText && (
                <div className="rounded-lg bg-purple-50 border border-purple-100 px-2.5 py-2 opacity-75">
                  <span className="text-[10px] font-mono text-slate-400 mr-1.5">{fmt(duration)}</span>
                  <span className="text-xs text-purple-600 italic leading-relaxed">{interimText}</span>
                </div>
              )}
              <div ref={txEndRef} />
            </div>

            <div className={`px-3 py-1.5 border-t border-slate-100 flex items-center gap-1.5 text-[11px] flex-shrink-0 ${interimText ? 'text-purple-600' : 'text-slate-400'}`}>
              {interimText ? <><Loader2 className="w-3 h-3 animate-spin" />Transcrevendo...</> : <><Mic className="w-3 h-3" />Reconhecimento de voz ativo</>}
            </div>
          </div>

          {/* CENTRO — Advisor (Agente 2) */}
          <div className="flex-1 flex flex-col bg-white border-r border-slate-200 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-purple-100 bg-purple-50 flex-shrink-0">
              <Brain className="w-3.5 h-3.5 text-purple-600" />
              <span className="text-xs font-semibold text-purple-700">Assistente de Vendas · Agente 2</span>
              {advLoad && <Loader2 className="w-3 h-3 text-purple-400 animate-spin ml-auto" />}
            </div>

            {/* ── Produtos em Destaque (tempo real) ── */}
            {(() => {
              const advisorNomes = (advisor?.produtos_sugeridos ?? []).map(ps => typeof ps === 'string' ? ps : ps.nome);
              const allNomes = [...new Set([...instantProdNames, ...advisorNomes])].slice(0, 6);
              if (!allNomes.length) return null;
              return (
                <div className="px-3 pt-3 pb-1 border-b border-purple-100 bg-gradient-to-b from-purple-50/60 to-white flex-shrink-0">
                  <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                    <Package className="w-3 h-3" />
                    Produtos Detectados
                    <span className="ml-1 flex items-center gap-1 text-[9px] font-semibold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                      ao vivo
                    </span>
                    {instantProdNames.length > 0 && (
                      <button onClick={() => setInstantProdNames([])} className="ml-auto text-[9px] text-slate-400 hover:text-red-500 transition-colors">
                        limpar
                      </button>
                    )}
                  </p>
                  <div className="flex gap-2.5 overflow-x-auto pb-2 custom-scrollbar">
                    {allNomes.map((nome, i) => {
                      const prod = prods.find(p => p.nome.toLowerCase() === nome.toLowerCase());
                      const foto = prodFotos[nome];
                      const fromAdvisor = advisor?.produtos_sugeridos?.find(ps => (typeof ps === 'string' ? ps : ps.nome).toLowerCase() === nome.toLowerCase());
                      const advisorObj  = typeof fromAdvisor !== 'string' ? fromAdvisor : undefined;
                      const preco = prod?.preco_venda
                        ? (prod.preco_venda / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                        : advisorObj?.preco_lista
                          ? advisorObj.preco_lista.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                          : null;
                      const precoSug = advisorObj?.preco_sugerido
                        ? advisorObj.preco_sugerido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                        : null;
                      const estoque = prod
                        ? prod.estoque_atual > (prod.estoque_minimo ?? 0)
                          ? { label: 'Em estoque', cls: 'bg-emerald-100 text-emerald-700' }
                          : prod.estoque_atual > 0
                            ? { label: `Baixo (${prod.estoque_atual})`, cls: 'bg-amber-100 text-amber-700' }
                            : { label: 'Sem estoque', cls: 'bg-red-100 text-red-700' }
                        : advisorObj?.estoque_status === 'ok'    ? { label: 'Em estoque', cls: 'bg-emerald-100 text-emerald-700' }
                        : advisorObj?.estoque_status === 'baixo' ? { label: 'Estoque baixo', cls: 'bg-amber-100 text-amber-700' }
                        : advisorObj?.estoque_status === 'pedir' ? { label: 'Sem estoque', cls: 'bg-red-100 text-red-700' }
                        : null;
                      return (
                        <div key={i}
                          className="flex-shrink-0 w-36 rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                          onClick={() => foto && setLightbox({ nome, url: foto })}
                        >
                          {/* Imagem grande */}
                          <div className="relative w-full h-28 bg-slate-100 overflow-hidden">
                            {foto ? (
                              <img src={foto} alt={nome} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-slate-300">
                                <Package className="w-8 h-8" />
                                <Loader2 className="w-3 h-3 animate-spin opacity-50" />
                              </div>
                            )}
                            {/* Badge "IA" ou "Voz" */}
                            <span className={`absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${instantProdNames.includes(nome) ? 'bg-purple-600 text-white' : 'bg-green-600 text-white'}`}>
                              {instantProdNames.includes(nome) ? 'VOZ' : 'IA'}
                            </span>
                          </div>
                          {/* Info */}
                          <div className="p-2">
                            <p className="text-[11px] font-bold text-slate-800 leading-snug line-clamp-2">{nome}</p>
                            {advisorObj?.motivo && (
                              <p className="text-[9px] text-purple-600 mt-0.5 leading-snug line-clamp-1">{advisorObj.motivo}</p>
                            )}
                            <div className="mt-1.5 space-y-0.5">
                              {preco && (
                                <div className="flex items-center gap-1 flex-wrap">
                                  <span className={`text-[11px] font-mono font-bold ${precoSug ? 'line-through text-slate-400 text-[10px]' : 'text-slate-700'}`}>{preco}</span>
                                  {precoSug && <span className="text-[11px] font-mono font-bold text-purple-700">{precoSug}</span>}
                                </div>
                              )}
                              {estoque && (
                                <span className={`inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${estoque.cls}`}>
                                  {estoque.label}
                                </span>
                              )}
                              {advisorObj?.dica_estoque && (
                                <p className="text-[9px] text-amber-600 flex items-center gap-0.5">
                                  <AlertTriangle className="w-2.5 h-2.5 flex-shrink-0" />{advisorObj.dica_estoque}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {advisor ? (
                <>
                  {/* Perfil + Temperatura */}
                  <div className="flex items-stretch gap-2">
                    <div className={`flex-1 rounded-xl px-4 py-3 ${profCfg?.bg}`}>
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Perfil do Cliente</p>
                      <div className="flex items-center justify-between">
                        <p className={`text-lg font-bold ${profCfg?.color}`}>{profCfg?.label}</p>
                        <span className="text-xs text-slate-500">{advisor.confianca_perfil}% conf.</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">{profCfg?.desc}</p>
                      <div className="mt-2 h-1.5 bg-white/50 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${profCfg?.color.replace('text-', 'bg-').replace('-700', '-400') ?? ''}`}
                          style={{ width: `${advisor.confianca_perfil}%` }} />
                      </div>
                    </div>
                    {tempCfg && (
                      <div className={`flex flex-col items-center justify-center rounded-xl px-4 py-3 ${tempCfg.bg} flex-shrink-0`}>
                        <tempCfg.Icon className={`w-6 h-6 ${tempCfg.color}`} />
                        <span className={`text-xs font-bold mt-1 ${tempCfg.color}`}>{tempCfg.label}</span>
                      </div>
                    )}
                  </div>

                  {/* Palavra esquecida — destaque máximo quando detectada */}
                  {advisor.palavra_sugerida && (
                    <div className="rounded-2xl border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-orange-50 px-5 py-3 animate-pulse-once">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Volume2 className="w-4 h-4 text-amber-600" />
                        <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">Palavra que você quis dizer</span>
                      </div>
                      <p className="text-xl font-black text-amber-900 leading-tight">
                        {advisor.palavra_sugerida}
                      </p>
                    </div>
                  )}

                  {/* Sugestão — destaque */}
                  <div className="rounded-2xl border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-violet-50 px-5 py-4">
                    <div className="flex items-center gap-2 mb-2.5">
                      <Zap className="w-4 h-4 text-purple-600" />
                      <span className="text-xs font-bold text-purple-700 uppercase tracking-wide">Sugestão Agora</span>
                      <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full ${ADVISOR_BADGE[advisor.tipo]}`}>
                        {advisor.tipo}
                      </span>
                    </div>
                    <p className="text-base font-semibold text-purple-900 leading-snug">
                      "{advisor.sugestao}"
                    </p>

                    {/* Imagens contextuais em linha com a sugestão */}
                    {advisorContextImg.length > 0 && (
                      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                        {advisorContextImg.map((img, i) => (
                          <a key={i} href={img.link} target="_blank" rel="noopener noreferrer" title={img.title} className="flex-shrink-0">
                            <img
                              src={img.thumbnailUrl || img.imageUrl}
                              alt={img.title}
                              className="w-20 h-20 object-cover rounded-xl border border-purple-200 shadow hover:opacity-80 hover:shadow-md transition-all"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Perguntas sugeridas */}
                  {advisor.perguntas_sugeridas.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5 mb-2">
                        <MessageSquare className="w-3.5 h-3.5" /> Perguntas para Fazer Agora
                      </p>
                      <div className="space-y-1.5">
                        {advisor.perguntas_sugeridas.map((q, i) => (
                          <div key={i} className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
                            <span className="text-[10px] font-bold text-blue-500 mt-0.5 flex-shrink-0">{i + 1}</span>
                            <span className="text-xs text-blue-800 leading-relaxed">{q}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Alerta */}
                  {advisor.alerta && (
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-amber-800">{advisor.alerta}</p>
                    </div>
                  )}
                </>
              ) : advError ? (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-4 text-center">
                  <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-red-700 mb-1">Erro no Advisor</p>
                  <p className="text-[11px] text-red-600 break-all">{advError}</p>
                  <p className="text-[11px] text-red-400 mt-2">Verifique se GEMINI_API_KEY está configurada nos secrets da Edge Function no Supabase Dashboard</p>
                </div>
              ) : (
                <div className="text-center py-14 text-slate-400">
                  <Brain className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Aguardando transcrição...</p>
                  <p className="text-xs mt-1 text-slate-300">Análise aparece 2s após cada chunk</p>
                </div>
              )}
            </div>

            {/* ── Chat ao vivo no Agente 2 (recording + review) ── */}
            <div className="border-t border-slate-200 flex-shrink-0">
              {/* Pré-visualização de imagens pendentes */}
              {chatImgs.length > 0 && (
                <div className="px-3 pt-2 flex gap-2 flex-wrap">
                  {chatImgs.map((img, i) => (
                    <div key={i} className="relative w-10 h-10 rounded-xl overflow-hidden border border-purple-200 group">
                      <img src={img.dataUrl} alt={img.name} className="w-full h-full object-cover" />
                      <button
                        onClick={() => setChatImgs(prev => prev.filter((_, j) => j !== i))}
                        className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Histórico de mensagens do chat ao vivo */}
              {chatMsgs.length > 0 && (
                <div className="max-h-36 overflow-y-auto px-3 py-2 space-y-1.5 custom-scrollbar bg-slate-50">
                  {chatMsgs.map((m, i) => (
                    <div key={i} className={`flex flex-col gap-0.5 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                      {m.images && m.images.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {m.images.map((img, ii) => (
                            <img key={ii} src={img.dataUrl} alt={img.name}
                              className="w-16 h-16 object-cover rounded-lg border border-white/30 cursor-pointer"
                              onClick={() => window.open(img.dataUrl, '_blank')} />
                          ))}
                        </div>
                      )}
                      <div className={`max-w-[85%] rounded-xl px-3 py-1.5 text-xs leading-relaxed ${
                        m.role === 'user' ? 'bg-purple-600 text-white' : 'bg-white border border-slate-200 text-slate-800'
                      }`}>
                        {m.content}
                      </div>
                      {m.webImages && m.webImages.length > 0 && (
                        <div className="flex gap-1.5 flex-wrap max-w-[85%]">
                          {m.webImages.map((img, ii) => (
                            <a key={ii} href={img.link} target="_blank" rel="noopener noreferrer" title={img.title}>
                              <img
                                src={img.thumbnailUrl || img.imageUrl}
                                alt={img.title}
                                className="w-16 h-16 object-cover rounded-lg border border-slate-200 hover:opacity-80 transition-opacity"
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {chatLoad && (
                    <div className="flex justify-start">
                      <div className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
                        <Loader2 className="w-3 h-3 animate-spin text-purple-400" />
                        <span className="text-xs text-slate-400">Gemini digitando...</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}

              {/* Input */}
              <div className="flex items-center gap-1.5 px-3 py-2">
                {/* Botão câmera */}
                <div className="relative shrink-0">
                  <button
                    onClick={() => setImgMenuChat(p => !p)}
                    title="Imagem ou câmera"
                    className={`p-1.5 rounded-lg hover:bg-slate-100 transition-colors ${chatImgs.length ? 'text-purple-600' : 'text-slate-400 hover:text-purple-600'}`}
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  {imgMenuChat && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setImgMenuChat(false)} />
                      <div className="absolute bottom-9 left-0 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-40 w-44">
                        <button onClick={() => chatCameraRef.current?.click()}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition-colors">
                          <Camera className="w-4 h-4 text-purple-500" /> Tirar foto
                        </button>
                        <button onClick={() => chatGaleriaRef.current?.click()}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition-colors border-t border-slate-50">
                          <ImageIcon className="w-4 h-4 text-indigo-500" /> Escolher da galeria
                        </button>
                      </div>
                    </>
                  )}
                  <input ref={chatCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleChatImagem} />
                  <input ref={chatGaleriaRef} type="file" accept="image/*" multiple className="hidden" onChange={handleChatImagem} />
                </div>

                <input
                  value={chatIn}
                  onChange={e => setChatIn(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                  placeholder="Procure produto, tire dúvida ou envie imagem..."
                  className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                />
                <button
                  onClick={sendChat}
                  disabled={chatLoad || (!chatIn.trim() && !chatImgs.length)}
                  className="bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white p-2 rounded-xl transition-colors shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* DIREITA — Dados do cliente + LinkedIn (Agente 3) */}
          <div className="w-[28%] flex flex-col bg-white overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 flex-shrink-0">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-semibold text-slate-600">Dados do Cliente · Agente 3</span>
              {extrLoad && <Loader2 className="w-3 h-3 text-slate-400 animate-spin ml-auto" />}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-3 space-y-2.5">
                {([
                  { Icon: User,       label: 'Nome',     val: cx.nome      },
                  { Icon: Building2,  label: 'Empresa',  val: cx.empresa   },
                  { Icon: FileText,   label: 'Cargo',    val: cx.cargo     },
                  { Icon: Mail,       label: 'E-mail',   val: cx.email     },
                  { Icon: Phone,      label: 'Telefone', val: cx.telefone  },
                  { Icon: DollarSign, label: 'Orçamento',val: cx.orcamento },
                ] as const).filter(f => f.val).map(({ Icon, label, val }) => (
                  <div key={label} className="flex items-start gap-2">
                    <Icon className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-400">{label}</p>
                      <p className="text-xs font-medium text-slate-700">{val}</p>
                    </div>
                  </div>
                ))}

                {cx.necessidades.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Necessidades</p>
                    {cx.necessidades.map((n, i) => <p key={i} className="text-xs text-slate-700 leading-relaxed">· {n}</p>)}
                  </div>
                )}

                {cx.preferencias.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Preferências</p>
                    <div className="flex flex-wrap gap-1">
                      {cx.preferencias.map((p, i) => (
                        <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">{p}</span>
                      ))}
                    </div>
                  </div>
                )}

                {cx.datas.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Datas</p>
                    {cx.datas.map((d, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs text-slate-700 mb-1">
                        <Calendar className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <strong>{d.data}</strong> — {d.contexto}
                      </div>
                    ))}
                  </div>
                )}

                {cx.notas.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Notas</p>
                    {cx.notas.map((n, i) => <p key={i} className="text-xs text-slate-600 leading-relaxed">· {n}</p>)}
                  </div>
                )}

                {!cx.nome && !cx.empresa && cx.notas.length === 0 && (
                  <div className="text-center py-6 text-slate-400">
                    <User className="w-5 h-5 mx-auto mb-1.5 opacity-20" />
                    <p className="text-xs">Extraindo dados a cada 30s...</p>
                  </div>
                )}
              </div>

              {/* LinkedIn */}
              <div className="border-t border-slate-100 p-3">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Linkedin className="w-3 h-3 text-blue-600" /> LinkedIn
                </p>
                <div className="flex gap-1.5">
                  <input type="text" value={liQ} onChange={e => setLiQ(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && liQ.trim() && window.open(`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(liQ)}`, '_blank')}
                    placeholder="Nome ou empresa..."
                    className="flex-1 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  <button onClick={() => liQ.trim() && window.open(`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(liQ)}`, '_blank')}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-1.5 rounded-lg transition-colors">
                    <Search className="w-3.5 h-3.5" />
                  </button>
                </div>
                {cx.nome && (
                  <button
                    onClick={() => window.open(`https://www.google.com/search?q=site:linkedin.com/in+${encodeURIComponent(`${cx.nome ?? ''} ${cx.empresa ?? ''}`)}`, '_blank')}
                    className="mt-1.5 text-[10px] text-blue-600 hover:underline text-left w-full">
                    → Buscar "{cx.nome}" no Google/LinkedIn
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════ MODAL PRÉ-ATENDIMENTO ══════════════════════════════════════════ */}
      {showPreModal && (
        <PreAtendimentoModal
          onClose={() => setShowPreModal(false)}
          onStart={(neg, erpClient) => {
            setLinkedNeg(neg);
            linkedErpClientRef.current = erpClient ?? null;
            setAtendSaved(false);
            setShowPreModal(false);
            start();
          }}
        />
      )}

      {/* ════ MODAL ANÁLISE FINAL — Agente 4 (Gemini 3.1 Pro) ══════════════ */}
      {phase === 'review' && fa && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden">

            {/* Modal header */}
            <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-purple-700 to-violet-700 flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
              <div className="flex-1 min-w-0">
                <h2 className="text-white font-bold text-sm">Análise Final · Gemini 3.1 Pro</h2>
                <p className="text-purple-200 text-xs truncate">{fa.resumo}</p>
              </div>
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-right">
                  <p className="text-purple-300 text-[10px]">Prob. Fechamento</p>
                  <p className="text-white font-bold text-xl leading-none">{fa.probabilidade_fechamento}%</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${fa.sentimento_geral === 'positivo' ? 'bg-green-500 text-white' : fa.sentimento_geral === 'negativo' ? 'bg-red-500 text-white' : 'bg-slate-500 text-white'}`}>
                  {fa.sentimento_geral.toUpperCase()}
                </span>
                <button onClick={() => setPhase('recording')} className="text-purple-300 hover:text-white transition-colors" title="Minimizar">
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="flex flex-1 overflow-hidden">

              {/* Chat com Gemini 3.1 Pro */}
              <div className="w-1/2 flex flex-col border-r border-slate-200">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex-shrink-0">
                  <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5 text-purple-600" /> Conversar com Gemini sobre este atendimento
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {chatMsgs.map((m, i) => (
                    <div key={i} className={`flex flex-col gap-1 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                      {/* Imagens da mensagem */}
                      {m.images && m.images.length > 0 && (
                        <div className={`flex flex-wrap gap-1.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          {m.images.map((img, ii) => (
                            <img
                              key={ii}
                              src={img.dataUrl}
                              alt={img.name}
                              className="w-28 h-28 object-cover rounded-xl border border-white/20 shadow cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(img.dataUrl, '_blank')}
                              title={img.name}
                            />
                          ))}
                        </div>
                      )}
                      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${m.role === 'user' ? 'bg-purple-600 text-white rounded-br-none' : 'bg-slate-100 text-slate-800 rounded-bl-none'}`}>
                        {m.content}
                      </div>

                      {/* Imagens da web (grounding) */}
                      {m.webImages && m.webImages.length > 0 && (
                        <div className="max-w-[85%] mt-1">
                          <div className="flex flex-wrap gap-1.5">
                            {m.webImages.map((img, ii) => (
                              <a key={ii} href={img.link} target="_blank" rel="noopener noreferrer" title={img.title}>
                                <img
                                  src={img.thumbnailUrl || img.imageUrl}
                                  alt={img.title}
                                  className="w-20 h-20 object-cover rounded-xl border border-slate-200 shadow hover:opacity-80 hover:shadow-md transition-all"
                                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                              </a>
                            ))}
                          </div>
                          {m.webSources && m.webSources.length > 0 && (
                            <p className="text-[10px] text-slate-400 mt-1">
                              Fontes: {m.webSources.slice(0, 3).join(' · ')}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {chatLoad && (
                    <div className="flex justify-start">
                      <div className="bg-slate-100 rounded-2xl rounded-bl-none px-4 py-2.5 flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                        <span className="text-xs text-slate-500">Gemini pesquisando e digitando...</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Pré-visualização de imagens pendentes */}
                {chatImgs.length > 0 && (
                  <div className="px-3 pb-1 flex gap-2 flex-wrap border-t border-slate-100 pt-2">
                    {chatImgs.map((img, i) => (
                      <div key={i} className="relative w-12 h-12 rounded-xl overflow-hidden border border-purple-200 shadow-sm group">
                        <img src={img.dataUrl} alt={img.name} className="w-full h-full object-cover" />
                        <button
                          onClick={() => setChatImgs(prev => prev.filter((_, j) => j !== i))}
                          className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-2.5 h-2.5 text-white" />
                        </button>
                      </div>
                    ))}
                    {chatImgs.length < 4 && (
                      <button
                        onClick={() => chatGaleriaRef.current?.click()}
                        className="w-12 h-12 rounded-xl border-2 border-dashed border-purple-200 flex items-center justify-center text-purple-300 hover:border-purple-400 hover:text-purple-500 transition-colors"
                        title="Adicionar imagem"
                      >
                        <ImageIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}

                <div className="p-3 border-t border-slate-200 flex gap-2 flex-shrink-0">
                  {/* Botão câmera / galeria */}
                  <div className="relative shrink-0">
                    <button
                      onClick={() => setImgMenuChat(p => !p)}
                      title="Imagem ou câmera"
                      className={`p-2 rounded-xl hover:bg-slate-100 transition-colors ${chatImgs.length ? 'text-purple-600' : 'text-slate-400 hover:text-purple-600'}`}
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                    {imgMenuChat && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setImgMenuChat(false)} />
                        <div className="absolute bottom-10 left-0 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-40 w-44">
                          <button
                            onClick={() => chatCameraRef.current?.click()}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                          >
                            <Camera className="w-4 h-4 text-purple-500" />
                            Tirar foto
                          </button>
                          <button
                            onClick={() => chatGaleriaRef.current?.click()}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition-colors border-t border-slate-50"
                          >
                            <ImageIcon className="w-4 h-4 text-indigo-500" />
                            Escolher da galeria
                          </button>
                        </div>
                      </>
                    )}
                    <input ref={chatCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleChatImagem} />
                    <input ref={chatGaleriaRef} type="file" accept="image/*" multiple className="hidden" onChange={handleChatImagem} />
                  </div>

                  <input value={chatIn} onChange={e => setChatIn(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                    placeholder="Pergunte sobre o atendimento..."
                    className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400" />
                  <button onClick={sendChat} disabled={chatLoad || (!chatIn.trim() && !chatImgs.length)}
                    className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white p-2 rounded-xl transition-colors">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Ações sugeridas */}
              <div className="w-1/2 flex flex-col overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                  <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" /> Ações Sugeridas ({fa.acoes.length})
                  </p>
                  <p className="text-xs text-slate-400">{selAct.size} selecionada(s)</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
                  {fa.acoes.map(action => {
                    const Icon   = ACTION_ICON[action.tipo];
                    const isSel  = selAct.has(action.id);
                    const isDone = applAct.has(action.id);
                    return (
                      <div key={action.id}
                        onClick={() => { if (!isDone) setSelAct(prev => { const s = new Set(prev); if (s.has(action.id)) { s.delete(action.id); } else { s.add(action.id); } return s; }); }}
                        className={`rounded-xl border-2 p-3 transition-all select-none ${isDone ? 'border-green-300 bg-green-50 cursor-default' : isSel ? 'border-purple-300 bg-purple-50 cursor-pointer' : 'border-slate-200 bg-white hover:border-slate-300 cursor-pointer'}`}>
                        <div className="flex items-start gap-3">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-green-500' : isSel ? 'bg-purple-600' : 'bg-slate-100'}`}>
                            {isDone ? <Check className="w-4 h-4 text-white" /> : <Icon className={`w-3.5 h-3.5 ${isSel ? 'text-white' : 'text-slate-500'}`} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-slate-800">{action.titulo}</p>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${action.prioridade === 'alta' ? 'bg-red-100 text-red-700' : action.prioridade === 'media' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                                {action.prioridade}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{action.descricao}</p>
                            {isDone && <p className="text-xs text-green-600 font-medium mt-1">✓ Aplicada com sucesso</p>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {fa.observacoes && (
                  <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex-shrink-0">
                    <p className="text-xs text-slate-500 leading-relaxed"><strong className="text-slate-700">Obs: </strong>{fa.observacoes}</p>
                  </div>
                )}

                {/* Seção CRM — vincular a negociação */}
                <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex-shrink-0 space-y-2">
                  {linkedNeg ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
                        <p className="text-[10px] text-purple-500 font-semibold uppercase">Vinculado</p>
                        <p className="text-xs font-bold text-purple-800 truncate">{linkedNeg.negociacao.clienteNome}</p>
                        <p className="text-[10px] font-mono text-purple-400">{linkedNeg.negociacao.id}</p>
                      </div>
                      {!atendSaved ? (
                        <button
                          onClick={async () => {
                            if (!linkedNegRef.current) return;
                            await addAtendimentoCRM(linkedNegRef.current.negociacao.id, {
                              clienteNome: cx.nome ?? linkedNegRef.current.negociacao.clienteNome,
                              data: new Date().toISOString().split('T')[0],
                              hora: new Date().toTimeString().slice(0, 5),
                              duracao: duration,
                              transcricao: lines.map(l => ({ ts: l.ts, text: l.text })),
                              analise: fa ? {
                                perfil: advisor?.perfil ?? 'INDEFINIDO',
                                temperatura: advisor?.temperatura ?? 'FRIO',
                                resumo: fa.resumo,
                                necessidades: cx.necessidades,
                                produtos_mencionados: (advisor?.produtos_sugeridos ?? []).map((p: { nome?: string; descricao?: string }) => p.nome ?? p.descricao ?? String(p)),
                                objecoes: [],
                                probabilidade_fechamento: fa.probabilidade_fechamento,
                                sentimento: fa.sentimento_geral,
                                observacoes: fa.observacoes ?? '',
                              } : undefined,
                            });
                            setAtendSaved(true);
                          }}
                          className="shrink-0 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                        >
                          Salvar Atendimento
                        </button>
                      ) : (
                        <span className="shrink-0 flex items-center gap-1 text-xs text-green-600 font-semibold">
                          <CheckCircle className="w-4 h-4" /> Salvo
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-slate-400 flex-1">Sem negociação vinculada</p>
                      <button
                        onClick={async () => {
                          if (!fa) return;
                          // Se temos cliente ERP selecionado, usa os dados dele
                          // Se não, cria o cliente em erp_clientes primeiro (mesma base do sistema)
                          let erpClientId: string | undefined = linkedErpClientRef.current?.id ?? undefined;
                          let clienteNome = linkedErpClientRef.current?.nome ?? cx.nome ?? cx.empresa ?? 'Cliente';
                          let clienteEmail = linkedErpClientRef.current?.email ?? cx.email ?? undefined;
                          let clienteTelefone = linkedErpClientRef.current?.telefone ?? cx.telefone ?? undefined;

                          if (!erpClientId && (cx.nome || cx.empresa)) {
                            // Cria cliente novo na base principal (erp_clientes)
                            const novoCliente = await createCliente({
                              tipo: 'PF',
                              nome: clienteNome,
                              cpf_cnpj: '',
                              inscricao_estadual: null,
                              email: clienteEmail ?? null,
                              telefone: clienteTelefone ?? null,
                              endereco_json: {},
                              limite_credito: null,
                              tabela_preco_id: null,
                              vendedor_id: null,
                              ativo: true,
                            });
                            erpClientId = novoCliente.id;
                          }

                          const neg = await createNegociacao({
                            clienteId: erpClientId,
                            clienteNome,
                            clienteEmail,
                            clienteTelefone,
                            descricao: fa.resumo.slice(0, 120),
                            status: 'aberta', etapa: 'qualificacao',
                            valor_estimado: cx.orcamento ? Number(cx.orcamento.replace(/\D/g, '')) || undefined : undefined,
                            probabilidade: fa.probabilidade_fechamento,
                            responsavel: '',
                            notas: fa.observacoes,
                          });
                          setLinkedNeg(neg);
                          setAtendSaved(false);
                        }}
                        className="shrink-0 flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> Criar Negociação
                      </button>
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-slate-200 flex gap-2 flex-shrink-0">
                  <button onClick={applyActions} disabled={selAct.size === 0}
                    className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
                    <Check className="w-4 h-4" /> Aplicar {selAct.size} Ação(ões)
                  </button>
                  <button onClick={() => setSelAct(new Set(fa.acoes.map(a => a.id)))} title="Selecionar todas"
                    className="px-3 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">
                    <CheckCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Lightbox: imagem do produto no centro da tela ────────────────────── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[200] bg-black/80 flex flex-col items-center justify-center p-6"
          onClick={() => setLightbox(null)}
        >
          <div
            className="bg-white rounded-2xl overflow-hidden shadow-2xl max-w-2xl w-full"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-green-600" />
                <span className="font-semibold text-slate-800 text-sm">{lightbox.nome}</span>
              </div>
              <button onClick={() => setLightbox(null)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            <img
              src={lightbox.url}
              alt={lightbox.nome}
              className="w-full max-h-[60vh] object-contain bg-slate-50"
            />
          </div>
        </div>
      )}
    </div>
  );
}
