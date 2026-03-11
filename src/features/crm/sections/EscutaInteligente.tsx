// ─────────────────────────────────────────────────────────────────────────────
// Escuta Inteligente — 4 Agentes de IA trabalhando em conjunto
//
// Agente 1 · Gemini 2.0 Flash  → Transcrição de áudio em tempo real (esquerda)
// Agente 2 · Gemini 2.0 Flash  → Advisor: perfil, sugestões, produtos (centro)
// Agente 3 · Gemini 2.0 Flash  → Extrator de dados do cliente (direita)
// Agente 4 · Gemini 3.1 Pro    → Análise final + ações pós-atendimento (modal)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic, Square, Brain, MessageSquare, User, Search, Send,
  CheckCircle, AlertCircle, AlertTriangle, Loader2, Zap,
  Clock, Package, Flame, Thermometer, TrendingUp, X,
  Sparkles, Check, FileText, Calendar, Phone, Mail,
  Building2, DollarSign, RotateCcw, Volume2, ChevronDown,
  Linkedin,
} from 'lucide-react';
import { getProdutos, getClientes, createAtendimento } from '../../../lib/erp';
import { supabase } from '../../../lib/supabase';
import type { ErpProduto } from '../../../lib/erp';

// ── Tipos ─────────────────────────────────────────────────────────────────────

type CustomerProfile = 'EMOCIONAL' | 'ANALITICO' | 'EXECUTOR' | 'PRAGMATICO' | 'ASSERTIVO' | 'INDEFINIDO';
type SalesTemp       = 'FRIO' | 'MORNO' | 'QUENTE';
type AdvisorType     = 'pergunta' | 'empatia' | 'produto' | 'objecao' | 'fechamento' | 'neutro';

interface TranscriptLine { id: string; ts: number; text: string; }

interface AdvisorResult {
  perfil: CustomerProfile;
  confianca_perfil: number;
  temperatura: SalesTemp;
  sugestao: string;
  tipo: AdvisorType;
  produtos_sugeridos: string[];
  alerta: string | null;
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
}

interface FinalAnalysis {
  resumo: string; sentimento_geral: 'positivo' | 'neutro' | 'negativo';
  probabilidade_fechamento: number; acoes: FinalAction[]; observacoes: string;
}

interface ChatMessage { role: 'user' | 'assistant'; content: string; }

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

function advisorPrompt(transcript: string, productNames: string[]) {
  return `Voce e especialista em vendas consultivas. Analise a transcricao e retorne APENAS JSON valido (sem markdown).

PERFIS: EMOCIONAL (sentimentos/relacionamento), ANALITICO (dados/garantias), EXECUTOR (resultados rapidos),
PRAGMATICO (custo-beneficio/ROI), ASSERTIVO (controle/status/poder), INDEFINIDO (pouca info).

PRODUTOS DISPONIVEIS: ${productNames.slice(0, 30).join(', ') || 'nenhum cadastrado'}

TRANSCRICAO: ${transcript}

Retorne este JSON preenchido:
{"perfil":"INDEFINIDO","confianca_perfil":0,"temperatura":"FRIO","sugestao":"frase de acao para o consultor agora","tipo":"neutro","produtos_sugeridos":[],"alerta":null}`;
}

function extractorPrompt(transcript: string) {
  return `Extraia dados do cliente desta transcricao de vendas. Retorne APENAS JSON valido (sem markdown):
{"nome":null,"empresa":null,"cargo":null,"email":null,"telefone":null,"orcamento":null,"datas":[],"necessidades":[],"preferencias":[],"notas":[]}
Transcricao: ${transcript}`;
}

function finalPrompt(transcript: string, customerData: CustomerData, lastAdvisor: string) {
  return `Analise este atendimento de vendas completo. Retorne APENAS JSON valido (sem markdown):
{"resumo":"","sentimento_geral":"neutro","probabilidade_fechamento":50,"acoes":[{"id":"1","tipo":"registrar_atendimento","titulo":"","descricao":"","prioridade":"alta"}],"observacoes":""}

TRANSCRICAO COMPLETA: ${transcript}
DADOS DO CLIENTE: ${JSON.stringify(customerData)}
PERFIL IDENTIFICADO: ${lastAdvisor}`;
}

// ── Helpers — todas as chamadas passam pela Edge Function ai-proxy ───────────

const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

async function toB64(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res((r.result as string).split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}

async function proxy<T = unknown>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>('ai-proxy', { body });
  if (error) throw new Error(error.message);
  return data as T;
}

async function gText(prompt: string): Promise<string> {
  const d = await proxy<{ candidates?: { content: { parts: { text: string }[] } }[] }>(
    { type: 'gemini-text', prompt },
  );
  return d.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
}

async function gAudio(blob: Blob): Promise<string> {
  const audioBase64 = await toB64(blob);
  const d = await proxy<{ candidates?: { content: { parts: { text: string }[] } }[] }>(
    { type: 'gemini-audio', mimeType: blob.type || 'audio/webm', audioBase64 },
  );
  return (d.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
}

async function gProChat(msgs: ChatMessage[], system: string): Promise<string> {
  const d = await proxy<{ candidates?: { content: { parts: { text: string }[] } }[] }>(
    { type: 'gemini-pro-chat', messages: msgs.map(m => ({ role: m.role, content: m.content })), system },
  );
  return (d.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
}

function parseJ<T>(raw: string, fb: T): T {
  try {
    return JSON.parse(raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim()) as T;
  } catch { return fb; }
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
  const [transc, setTransc]     = useState(false);
  const txEndRef                = useRef<HTMLDivElement>(null);

  // Agente 2 — Advisor
  const [advisor, setAdvisor]   = useState<AdvisorResult | null>(null);
  const [advLoad, setAdvLoad]   = useState(false);
  const advTimer                = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Agente 3 — Extrator
  const [cx, setCx]             = useState<CustomerData>(DEFAULT_CX);
  const [extrLoad, setExtrLoad] = useState(false);

  // LinkedIn
  const [liQ, setLiQ]           = useState('');

  // Produtos
  const [prods, setProds]       = useState<ErpProduto[]>([]);

  // Refs de gravação
  const recRef   = useRef<MediaRecorder | null>(null);
  const actxRef  = useRef<AudioContext | null>(null);
  const anlRef   = useRef<AnalyserNode | null>(null);
  const afRef    = useRef<number>(0);
  const t0Ref    = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const extrRef  = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const mimeRef  = useRef('audio/webm');

  // Análise final
  const [finMsg, setFinMsg]     = useState('');
  const [fa, setFa]             = useState<FinalAnalysis | null>(null);
  const [selAct, setSelAct]     = useState<Set<string>>(new Set());
  const [applAct, setApplAct]   = useState<Set<string>>(new Set());
  const [chatMsgs, setChatMsgs] = useState<ChatMessage[]>([]);
  const [chatIn, setChatIn]     = useState('');
  const [chatLoad, setChatLoad] = useState(false);
  const chatEndRef              = useRef<HTMLDivElement>(null);

  useEffect(() => { getProdutos().then(setProds).catch(() => {}); }, []);
  useEffect(() => { txEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [lines]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMsgs]);
  useEffect(() => { if (cx.nome && !liQ) setLiQ(cx.nome); }, [cx.nome]);

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
      setAdvLoad(true);
      try {
        const raw = await gText(advisorPrompt(text, prods.map(p => p.nome)));
        setAdvisor(parseJ<AdvisorResult>(raw, {
          perfil: 'INDEFINIDO', confianca_perfil: 0, temperatura: 'FRIO',
          sugestao: '', tipo: 'neutro', produtos_sugeridos: [], alerta: null,
        }));
      } catch { /* silent */ }
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

  // Agente 1: processa chunk
  const processChunk = useCallback(async (blob: Blob) => {
    if (blob.size < 2000) return;
    setTransc(true);
    try {
      const text = await gAudio(blob);
      if (!text) return;
      const id = crypto.randomUUID();
      const ts = Math.floor((Date.now() - t0Ref.current) / 1000);
      setLines(prev => {
        const next = [...prev, { id, ts, text }];
        runAdvisor(next.map(l => l.text).join(' '));
        return next;
      });
    } catch { /* silent */ }
    finally { setTransc(false); }
  }, [runAdvisor]);

  // Iniciar gravação
  const start = useCallback(async () => {
    setError(null); setLines([]); setAdvisor(null); setCx(DEFAULT_CX);
    setApplAct(new Set()); setDuration(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx    = new AudioContext();
      const anl    = ctx.createAnalyser(); anl.fftSize = 128;
      ctx.createMediaStreamSource(stream).connect(anl);
      actxRef.current = ctx; anlRef.current = anl;
      afRef.current   = requestAnimationFrame(animWave);

      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
      mimeRef.current = mime;
      const rec = new MediaRecorder(stream, { mimeType: mime });
      recRef.current = rec;
      rec.ondataavailable = (e) => { if (e.data.size > 0) processChunk(new Blob([e.data], { type: mime })); };
      rec.onstop = () => stream.getTracks().forEach(t => t.stop());

      t0Ref.current = Date.now();
      rec.start(6000);
      setPhase('recording');
      timerRef.current = setInterval(() => setDuration(Math.floor((Date.now() - t0Ref.current) / 1000)), 1000);
      extrRef.current  = setInterval(() =>
        setLines(cur => { runExtractor(cur.map(l => l.text).join(' ')); return cur; }), 30000);
    } catch {
      setError('Não foi possível acessar o microfone. Verifique as permissões do navegador.');
    }
  }, [animWave, processChunk, runExtractor]);

  // Parar + análise final
  const stop = useCallback(async () => {
    clearInterval(timerRef.current); clearInterval(extrRef.current);
    cancelAnimationFrame(afRef.current); actxRef.current?.close();
    recRef.current?.stop(); setWBars(Array(BAR_COUNT).fill(0.04));
    setPhase('finalizing');

    const curLines:   TranscriptLine[]   = await new Promise(r => setLines(l   => { r(l); return l; }));
    const curCx:      CustomerData       = await new Promise(r => setCx(c       => { r(c); return c; }));
    const curAdv:     AdvisorResult|null = await new Promise(r => setAdvisor(a  => { r(a); return a; }));
    const transcript  = curLines.map(l => l.text).join(' ');

    if (!transcript.trim()) { setError('Nenhuma transcrição capturada. Verifique o microfone.'); setPhase('idle'); return; }
    if (curCx.notas.length === 0) { setFinMsg('Extraindo dados do cliente...'); await runExtractor(transcript).catch(() => {}); }

    setFinMsg('Gemini 3.1 Pro analisando atendimento...');
    try {
      const raw      = await gProChat(
        [{ role: 'user', content: finalPrompt(transcript, curCx, JSON.stringify(curAdv)) }],
        'Voce e especialista em vendas e CRM. Analise atendimentos e sugira acoes concretas em JSON.',
      );
      const analysis = parseJ<FinalAnalysis>(raw, { resumo: '', sentimento_geral: 'neutro', probabilidade_fechamento: 50, acoes: [], observacoes: '' });
      setSelAct(new Set(analysis.acoes.filter(a => a.prioridade === 'alta').map(a => a.id)));
      setFa(analysis);
      setChatMsgs([{
        role: 'assistant',
        content: `**${analysis.resumo}**\n\nProbabilidade de fechamento: **${analysis.probabilidade_fechamento}%**. Identifiquei ${analysis.acoes.length} ação(ões) sugerida(s). Como posso ajudar?`,
      }]);
      setPhase('review');
    } catch (e) {
      setError(`Erro na análise final: ${(e as Error).message}`);
      setPhase('idle');
    }
  }, [runExtractor]);

  // Chat com Gemini 3.1 Pro
  const sendChat = useCallback(async () => {
    if (!chatIn.trim() || chatLoad || !fa) return;
    const msg: ChatMessage = { role: 'user', content: chatIn };
    setChatMsgs(p => [...p, msg]); setChatIn(''); setChatLoad(true);
    const tx = lines.map(l => l.text).join(' ');
    try {
      const reply = await gProChat(
        [...chatMsgs, msg],
        `Voce e especialista em vendas analisando um atendimento. Transcricao: "${tx.slice(0, 3000)}". Analise feita: ${JSON.stringify(fa)}. Responda em portugues, de forma direta.`,
      );
      setChatMsgs(p => [...p, { role: 'assistant', content: reply }]);
    } catch (e) {
      setChatMsgs(p => [...p, { role: 'assistant', content: `Erro: ${(e as Error).message}` }]);
    } finally { setChatLoad(false); }
  }, [chatIn, chatLoad, fa, chatMsgs, lines]);

  // Aplicar ações selecionadas
  const applyActions = useCallback(async () => {
    if (!fa) return;
    const applied = new Set<string>();
    for (const action of fa.acoes.filter(a => selAct.has(a.id))) {
      try {
        if (action.tipo === 'registrar_atendimento') {
          const clients = await getClientes(cx.nome ?? '').catch(() => []);
          if (clients.length > 0) {
            await createAtendimento({
              tipo: 'ATENDIMENTO', status: 'ABERTO', cliente_id: clients[0].id,
              responsavel_id: null, titulo: `Escuta IA — ${cx.nome ?? 'Cliente'}`,
              descricao: fa.resumo, prioridade: 'ALTA',
              data_abertura: new Date().toISOString(), data_fechamento: null,
            });
          }
        }
        applied.add(action.id);
      } catch { /* continue */ }
    }
    setApplAct(applied);
  }, [fa, selAct, cx]);

  // Reset
  const reset = useCallback(() => {
    setPhase('idle'); setLines([]); setAdvisor(null); setCx(DEFAULT_CX);
    setFa(null); setDuration(0); setApplAct(new Set()); setSelAct(new Set());
    setChatMsgs([]); setError(null); setLiQ('');
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
          <p className="text-[11px] text-slate-500">4 agentes · Gemini 2.0 Flash × 3 + Gemini 3.1 Pro</p>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {phase === 'recording' && (
            <span className="flex items-center gap-1.5 font-mono text-sm text-slate-600">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />{fmt(duration)}
            </span>
          )}
          {phase === 'idle' && (
            <button onClick={start} className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm">
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
                { Icon: Sparkles, label: 'Agente 4 · Claude', desc: 'Análise final + ações (modal)',       col: 'text-amber-600',  bg: 'bg-amber-50'  },
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
                    {transc && <Loader2 className="w-3 h-3 text-purple-400 animate-spin" />}
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
              {lines.length === 0 ? (
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
              <div ref={txEndRef} />
            </div>

            <div className={`px-3 py-1.5 border-t border-slate-100 flex items-center gap-1.5 text-[11px] flex-shrink-0 ${transc ? 'text-purple-600' : 'text-slate-400'}`}>
              {transc ? <><Loader2 className="w-3 h-3 animate-spin" />Transcrevendo...</> : <><Clock className="w-3 h-3" />Chunk a cada 6s</>}
            </div>
          </div>

          {/* CENTRO — Advisor (Agente 2) */}
          <div className="flex-1 flex flex-col bg-white border-r border-slate-200 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-purple-100 bg-purple-50 flex-shrink-0">
              <Brain className="w-3.5 h-3.5 text-purple-600" />
              <span className="text-xs font-semibold text-purple-700">Assistente de Vendas · Agente 2</span>
              {advLoad && <Loader2 className="w-3 h-3 text-purple-400 animate-spin ml-auto" />}
            </div>

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
                  </div>

                  {/* Produtos sugeridos */}
                  {advisor.produtos_sugeridos.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5 mb-2">
                        <Package className="w-3.5 h-3.5" /> Produtos Sugeridos
                      </p>
                      <div className="space-y-1.5">
                        {advisor.produtos_sugeridos.slice(0, 4).map((name, i) => {
                          const prod = prods.find(p => p.nome.toLowerCase().includes(name.toLowerCase()));
                          return (
                            <div key={i} className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                              <Package className="w-3 h-3 text-green-600 flex-shrink-0" />
                              <span className="text-sm text-green-800 font-medium flex-1">{name}</span>
                              {prod && <span className="text-xs text-green-600 font-mono">R$ {(prod.preco_venda / 100).toFixed(2)}</span>}
                            </div>
                          );
                        })}
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
              ) : (
                <div className="text-center py-14 text-slate-400">
                  <Brain className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  <p className="text-sm">Aguardando transcrição...</p>
                  <p className="text-xs mt-1 text-slate-300">Análise aparece 2s após cada chunk</p>
                </div>
              )}
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

              {/* Chat com Claude */}
              <div className="w-1/2 flex flex-col border-r border-slate-200">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex-shrink-0">
                  <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5 text-purple-600" /> Conversar com Claude sobre este atendimento
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {chatMsgs.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${m.role === 'user' ? 'bg-purple-600 text-white rounded-br-none' : 'bg-slate-100 text-slate-800 rounded-bl-none'}`}>
                        {m.content}
                      </div>
                    </div>
                  ))}
                  {chatLoad && (
                    <div className="flex justify-start">
                      <div className="bg-slate-100 rounded-2xl rounded-bl-none px-4 py-2.5 flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                        <span className="text-xs text-slate-500">Claude digitando...</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="p-3 border-t border-slate-200 flex gap-2 flex-shrink-0">
                  <input value={chatIn} onChange={e => setChatIn(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                    placeholder="Pergunte sobre o atendimento..."
                    className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400" />
                  <button onClick={sendChat} disabled={chatLoad || !chatIn.trim()}
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
                        onClick={() => !isDone && setSelAct(prev => { const s = new Set(prev); s.has(action.id) ? s.delete(action.id) : s.add(action.id); return s; })}
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
    </div>
  );
}
