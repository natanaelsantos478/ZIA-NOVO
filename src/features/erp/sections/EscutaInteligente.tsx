// ─────────────────────────────────────────────────────────────────────────────
// EscutaInteligente — Monitor de Atendimento com IA em Tempo Real
// Fluxo: Gravação → Gemini 2.0 Flash (transcrição) → Gemini Flash (análise por
//        frase) → Claude Sonnet 4.6 (análise final completa)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic, Square, Brain, MessageSquare,
  CheckCircle, AlertCircle, AlertTriangle, Loader2,
  Clock, BarChart2, Zap, FileText, KeyRound, ChevronDown,
  TrendingUp, TrendingDown, Minus, Star, Volume2,
} from 'lucide-react';

// ── Tipos ────────────────────────────────────────────────────────────────────

interface SentenceAnalysis {
  sentimento: 'positivo' | 'neutro' | 'negativo' | 'alerta';
  intencao: string;
  palavras_chave: string[];
  risco: boolean;
  pontos_atencao?: string;
}

interface TranscriptEntry {
  id: string;
  timestamp: number; // segundos desde início
  text: string;
  analysis?: SentenceAnalysis;
  analyzing: boolean;
}

interface FinalAnalysis {
  resumo: string;
  pontuacao_atendimento: number; // 0–10
  pontos_positivos: string[];
  pontos_negativos: string[];
  recomendacoes: string[];
  proximos_passos: string[];
  satisfacao_estimada: 'alta' | 'media' | 'baixa';
}

type Phase = 'idle' | 'recording' | 'processing' | 'done' | 'error';

// ── Configuração de sentimentos ───────────────────────────────────────────────

const SENTIMENT = {
  positivo: { label: 'Positivo', bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-200',  icon: CheckCircle,     bar: 'bg-green-500' },
  neutro:   { label: 'Neutro',   bg: 'bg-slate-100',  text: 'text-slate-600',  border: 'border-slate-200',  icon: Minus,           bar: 'bg-slate-400' },
  negativo: { label: 'Negativo', bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-200',    icon: AlertCircle,     bar: 'bg-red-500'   },
  alerta:   { label: 'Alerta',   bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-200',  icon: AlertTriangle,   bar: 'bg-amber-500' },
};

const BAR_COUNT = 40;
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const CLAUDE_ENDPOINT  = 'https://api.anthropic.com/v1/messages';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function transcribeAudio(blob: Blob, apiKey: string): Promise<string> {
  const base64 = await blobToBase64(blob);
  const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inline_data: { mime_type: blob.type || 'audio/webm', data: base64 } },
          { text: 'Transcreva o áudio em português brasileiro. Retorne apenas o texto transcrito, sem formatação ou comentários.' },
        ],
      }],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `Gemini transcription error ${res.status}`);
  }
  const data = await res.json();
  return (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim();
}

async function analyzeSentence(text: string, apiKey: string): Promise<SentenceAnalysis> {
  const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `Você é um analisador de qualidade de atendimento ao cliente. Analise a frase abaixo e retorne um JSON válido com a estrutura exata:
{"sentimento":"positivo|neutro|negativo|alerta","intencao":"string curta descrevendo o que o falante quer","palavras_chave":["string"],"risco":boolean,"pontos_atencao":"string ou null"}

Frase: "${text.replace(/"/g, "'")}"

Retorne apenas o JSON, sem markdown.`,
        }],
      }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });
  if (!res.ok) throw new Error(`Gemini analysis error ${res.status}`);
  const data = await res.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
  try {
    return JSON.parse(raw) as SentenceAnalysis;
  } catch {
    return { sentimento: 'neutro', intencao: 'indeterminado', palavras_chave: [], risco: false };
  }
}

async function generateFinalAnalysis(
  entries: TranscriptEntry[],
  claudeKey: string,
): Promise<FinalAnalysis> {
  const transcript = entries.map(e => e.text).join(' ');
  const sentimentSummary = entries
    .filter(e => e.analysis)
    .map(e => `[${e.analysis!.sentimento.toUpperCase()}] ${e.text}`)
    .join('\n');

  const res = await fetch(CLAUDE_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': claudeKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: 'Você é um especialista sênior em análise de qualidade de atendimento ao cliente para empresas brasileiras. Sua análise é precisa, prática e orientada a resultados.',
      messages: [{
        role: 'user',
        content: `Analise este atendimento ao cliente e retorne um JSON válido com a estrutura exata abaixo. Não inclua markdown.

Estrutura esperada:
{
  "resumo": "string (2-3 frases resumindo o atendimento)",
  "pontuacao_atendimento": number (0 a 10),
  "pontos_positivos": ["string"],
  "pontos_negativos": ["string"],
  "recomendacoes": ["string"],
  "proximos_passos": ["string"],
  "satisfacao_estimada": "alta|media|baixa"
}

Transcrição completa:
${transcript}

Análise por frase:
${sentimentSummary}`,
      }],
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `Claude API error ${res.status}`);
  }
  const data = await res.json();
  const raw = data.content?.[0]?.text ?? '{}';
  // Remove markdown code blocks if Claude wrapped the JSON
  const cleaned = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleaned) as FinalAnalysis;
}

function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 5);
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function EscutaInteligente() {
  const geminiKeyEnv  = import.meta.env.VITE_GEMINI_API_KEY  as string | undefined;
  const claudeKeyEnv  = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;

  const [phase,        setPhase]        = useState<Phase>('idle');
  const [geminiKey,    setGeminiKey]    = useState(geminiKeyEnv ?? '');
  const [claudeKey,    setClaudeKey]    = useState(claudeKeyEnv ?? '');
  const [showKeys,     setShowKeys]     = useState(!geminiKeyEnv || !claudeKeyEnv);
  const [entries,      setEntries]      = useState<TranscriptEntry[]>([]);
  const [finalAnalysis,setFinalAnalysis]= useState<FinalAnalysis | null>(null);
  const [duration,     setDuration]     = useState(0);
  const [audioBars,    setAudioBars]    = useState<number[]>(Array(BAR_COUNT).fill(0.05));
  const [error,        setError]        = useState<string | null>(null);
  const [processingMsg,setProcessingMsg]= useState('');

  const mediaRecorderRef  = useRef<MediaRecorder | null>(null);
  const audioContextRef   = useRef<AudioContext | null>(null);
  const analyserRef       = useRef<AnalyserNode | null>(null);
  const animFrameRef      = useRef<number>(0);
  const durationTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef      = useRef<number>(0);
  const transcriptEndRef  = useRef<HTMLDivElement | null>(null);
  const pendingSentences  = useRef<Set<string>>(new Set());

  // Scroll automático no transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  // Animação de waveform
  const animateWaveform = useCallback(() => {
    if (!analyserRef.current) return;
    const data = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(data);
    const step = Math.floor(data.length / BAR_COUNT);
    const bars = Array.from({ length: BAR_COUNT }, (_, i) =>
      Math.max(0.04, (data[i * step] ?? 0) / 255),
    );
    setAudioBars(bars);
    animFrameRef.current = requestAnimationFrame(animateWaveform);
  }, []);

  // Processa chunk de áudio: transcrição → análise por frase
  const processChunk = useCallback(async (blob: Blob) => {
    if (blob.size < 1000) return; // ignora chunks muito pequenos (silêncio)
    try {
      const text = await transcribeAudio(blob, geminiKey);
      if (!text) return;

      const sentences = splitIntoSentences(text);
      for (const sentence of sentences) {
        if (pendingSentences.current.has(sentence)) continue;
        pendingSentences.current.add(sentence);

        const id = `${Date.now()}-${Math.random()}`;
        const timestamp = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const newEntry: TranscriptEntry = { id, timestamp, text: sentence, analyzing: true };

        setEntries(prev => [...prev, newEntry]);

        // Análise por frase em paralelo (não bloqueia próximos chunks)
        analyzeSentence(sentence, geminiKey)
          .then(analysis => {
            setEntries(prev =>
              prev.map(e => e.id === id ? { ...e, analysis, analyzing: false } : e),
            );
          })
          .catch(() => {
            setEntries(prev =>
              prev.map(e => e.id === id ? { ...e, analyzing: false } : e),
            );
          });
      }
    } catch (err) {
      console.warn('[Escuta] Falha no chunk:', err);
    }
  }, [geminiKey]);

  // Inicia gravação
  const startRecording = useCallback(async () => {
    setError(null);
    setEntries([]);
    setFinalAnalysis(null);
    pendingSentences.current.clear();

    if (!geminiKey || !claudeKey) {
      setError('Configure as chaves de API antes de iniciar.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

      // AudioContext para waveform
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      ctx.createMediaStreamSource(stream).connect(analyser);
      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      animFrameRef.current = requestAnimationFrame(animateWaveform);

      // MediaRecorder — chunks a cada 8s
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      let chunkBuffer: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunkBuffer.push(e.data);
          const combined = new Blob(chunkBuffer, { type: recorder.mimeType });
          processChunk(combined);
          chunkBuffer = [];
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        cancelAnimationFrame(animFrameRef.current);
        audioContextRef.current?.close();
        setAudioBars(Array(BAR_COUNT).fill(0.05));
      };

      startTimeRef.current = Date.now();
      recorder.start(8000); // chunk a cada 8 segundos
      setPhase('recording');

      // Cronômetro
      durationTimerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

    } catch (err) {
      setError('Não foi possível acessar o microfone. Verifique as permissões do navegador.');
    }
  }, [geminiKey, claudeKey, animateWaveform, processChunk]);

  // Para gravação e inicia análise final
  const stopRecording = useCallback(async () => {
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    mediaRecorderRef.current?.stop();
    setPhase('processing');
    setProcessingMsg('Finalizando transcrições...');

    // Aguarda análises de frase pendentes (máx 15s)
    const deadline = Date.now() + 15000;
    await new Promise<void>(resolve => {
      const check = () => {
        const stillAnalyzing = entries.some(e => e.analyzing);
        if (!stillAnalyzing || Date.now() > deadline) return resolve();
        setTimeout(check, 500);
      };
      setTimeout(check, 1000);
    });

    setProcessingMsg('Gerando análise final com Claude Sonnet 4.6...');
    try {
      const currentEntries = await new Promise<TranscriptEntry[]>(r => setEntries(e => { r(e); return e; }));
      if (currentEntries.length === 0) {
        setError('Nenhum texto transcrito. Verifique o microfone e as chaves de API.');
        setPhase('error');
        return;
      }
      const analysis = await generateFinalAnalysis(currentEntries, claudeKey);
      setFinalAnalysis(analysis);
      setPhase('done');
    } catch (err) {
      setError(`Erro na análise final: ${(err as Error).message}`);
      setPhase('error');
    }
  }, [entries, claudeKey]);

  // Reinicia
  const reset = useCallback(() => {
    setPhase('idle');
    setEntries([]);
    setFinalAnalysis(null);
    setDuration(0);
    setError(null);
    pendingSentences.current.clear();
  }, []);

  // Estatísticas em tempo real
  const stats = {
    total:    entries.length,
    positivo: entries.filter(e => e.analysis?.sentimento === 'positivo').length,
    negativo: entries.filter(e => e.analysis?.sentimento === 'negativo').length,
    alerta:   entries.filter(e => e.analysis?.sentimento === 'alerta').length,
    risco:    entries.filter(e => e.analysis?.risco).length,
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">

      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-blue-600" />
            Escuta Inteligente
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Transcrição e análise de atendimentos em tempo real via IA
          </p>
        </div>

        {/* Controles de gravação */}
        <div className="flex items-center gap-3">
          {phase === 'recording' && (
            <span className="flex items-center gap-1.5 text-sm font-mono text-slate-600">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {formatDuration(duration)}
            </span>
          )}
          {phase === 'idle' || phase === 'error' ? (
            <button
              onClick={startRecording}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
            >
              <Mic className="w-4 h-4" />
              Iniciar Escuta
            </button>
          ) : phase === 'recording' ? (
            <button
              onClick={stopRecording}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
            >
              <Square className="w-4 h-4" />
              Parar e Analisar
            </button>
          ) : phase === 'done' ? (
            <button
              onClick={reset}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
            >
              <Mic className="w-4 h-4" />
              Nova Escuta
            </button>
          ) : null}
        </div>
      </div>

      {/* Painel de chaves API */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowKeys(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <span className="flex items-center gap-2"><KeyRound className="w-4 h-4 text-slate-400" />Configuração de APIs</span>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showKeys ? 'rotate-180' : ''}`} />
        </button>
        {showKeys && (
          <div className="px-5 pb-5 pt-1 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Gemini API Key
                <span className="ml-1 font-normal text-slate-400">(transcrição + análise por frase)</span>
              </label>
              <input
                type="password"
                value={geminiKey}
                onChange={e => setGeminiKey(e.target.value)}
                placeholder="AIza..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-400 mt-1">
                Modelo: <code>gemini-2.0-flash</code> · Google AI Studio
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Anthropic API Key
                <span className="ml-1 font-normal text-slate-400">(análise final)</span>
              </label>
              <input
                type="password"
                value={claudeKey}
                onChange={e => setClaudeKey(e.target.value)}
                placeholder="sk-ant-..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-400 mt-1">
                Modelo: <code>claude-sonnet-4-6</code> · console.anthropic.com
              </p>
            </div>
            <div className="md:col-span-2 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-xs text-blue-700">
              <strong>Dica:</strong> Adicione <code>VITE_GEMINI_API_KEY</code> e <code>VITE_ANTHROPIC_API_KEY</code> no arquivo <code>.env</code> para não precisar inserir manualmente.
            </div>
          </div>
        )}
      </div>

      {/* Erro */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Área principal — gravação ativa */}
      {(phase === 'recording' || phase === 'processing' || phase === 'done') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Coluna principal — waveform + transcript */}
          <div className="lg:col-span-2 space-y-4">

            {/* Waveform */}
            {phase === 'recording' && (
              <div className="bg-slate-900 rounded-xl px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    Gravando — microfone ativo
                  </span>
                  <span className="text-xs text-slate-500 font-mono">{formatDuration(duration)}</span>
                </div>
                <div className="flex items-end gap-0.5 h-14">
                  {audioBars.map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-full transition-all duration-75"
                      style={{
                        height: `${Math.max(8, h * 100)}%`,
                        backgroundColor: h > 0.5 ? '#3b82f6' : h > 0.2 ? '#60a5fa' : '#334155',
                      }}
                    />
                  ))}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Chunks enviados ao Gemini a cada 8s · Análise por frase em paralelo
                </p>
              </div>
            )}

            {/* Processing */}
            {phase === 'processing' && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-6 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <Brain className="w-5 h-5 text-purple-600 animate-pulse" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{processingMsg}</p>
                  <p className="text-xs text-slate-500 mt-0.5">Aguarde — isso pode levar alguns segundos</p>
                </div>
                <Loader2 className="w-5 h-5 text-slate-400 animate-spin ml-auto" />
              </div>
            )}

            {/* Transcript */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100">
                <MessageSquare className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-700">Transcrição em Tempo Real</span>
                <span className="ml-auto text-xs text-slate-400">{entries.length} frases</span>
              </div>
              <div className="p-4 space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
                {entries.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Mic className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">As frases transcritas aparecerão aqui</p>
                  </div>
                ) : (
                  entries.map(entry => {
                    const s = entry.analysis ? SENTIMENT[entry.analysis.sentimento] : null;
                    const Icon = s?.icon;
                    return (
                      <div
                        key={entry.id}
                        className={`rounded-lg border px-3 py-2.5 transition-all ${
                          s ? `${s.bg} ${s.border}` : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-[10px] font-mono text-slate-400 mt-0.5 flex-shrink-0 w-8">
                            {formatDuration(entry.timestamp)}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm leading-relaxed ${s ? s.text : 'text-slate-700'}`}>
                              {entry.text}
                            </p>
                            {entry.analyzing && (
                              <span className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Analisando...
                              </span>
                            )}
                            {entry.analysis && (
                              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                {Icon && (
                                  <span className={`flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-full ${s?.bg} ${s?.text}`}>
                                    <Icon className="w-3 h-3" />
                                    {s?.label}
                                  </span>
                                )}
                                <span className="text-[11px] text-slate-500">{entry.analysis.intencao}</span>
                                {entry.analysis.risco && (
                                  <span className="text-[11px] font-medium text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                    <AlertTriangle className="w-3 h-3" /> Risco
                                  </span>
                                )}
                                {entry.analysis.palavras_chave.slice(0, 3).map(kw => (
                                  <span key={kw} className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">
                                    {kw}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={transcriptEndRef} />
              </div>
            </div>
          </div>

          {/* Coluna lateral — métricas */}
          <div className="space-y-4">
            {/* Pipeline de modelos */}
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Pipeline de IA</p>
              <div className="space-y-2.5">
                {[
                  { label: 'Gemini 2.0 Flash', role: 'Transcrição de áudio', color: 'blue',   active: phase === 'recording' },
                  { label: 'Gemini 2.0 Flash', role: 'Análise por frase',    color: 'violet', active: phase === 'recording' || phase === 'processing' },
                  { label: 'Claude Sonnet 4.6', role: 'Análise final',        color: 'purple', active: phase === 'processing' },
                ].map((m, i) => (
                  <div key={i} className={`flex items-center gap-2.5 rounded-lg p-2.5 ${m.active ? 'bg-blue-50' : 'bg-slate-50'}`}>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${m.active ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{m.label}</p>
                      <p className="text-[11px] text-slate-500">{m.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Estatísticas em tempo real */}
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Sentimentos</p>
              <div className="space-y-2">
                {(['positivo', 'neutro', 'negativo', 'alerta'] as const).map(s => {
                  const count = entries.filter(e => e.analysis?.sentimento === s).length;
                  const pct   = stats.total ? Math.round((count / stats.total) * 100) : 0;
                  const cfg   = SENTIMENT[s];
                  return (
                    <div key={s}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className={`font-medium ${cfg.text}`}>{cfg.label}</span>
                        <span className="text-slate-500">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${cfg.bar}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Alertas */}
            {stats.risco > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-red-700 flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Pontos de Risco ({stats.risco})
                </p>
                <div className="space-y-1">
                  {entries.filter(e => e.analysis?.risco).map(e => (
                    <p key={e.id} className="text-xs text-red-600 line-clamp-2 leading-relaxed">
                      · {e.text}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Duração + total */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                <Clock className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-slate-800 font-mono">{formatDuration(duration)}</p>
                <p className="text-[10px] text-slate-500">Duração</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                <BarChart2 className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                <p className="text-lg font-bold text-slate-800">{stats.total}</p>
                <p className="text-[10px] text-slate-500">Frases</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Análise Final — Claude Sonnet 4.6 */}
      {phase === 'done' && finalAnalysis && (
        <div className="bg-white border border-purple-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-gradient-to-r from-purple-600 to-violet-600 px-6 py-4 flex items-center gap-3">
            <Brain className="w-5 h-5 text-white" />
            <div>
              <h2 className="text-white font-bold text-sm">Análise Final — Claude Sonnet 4.6</h2>
              <p className="text-purple-200 text-xs">Relatório completo do atendimento</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-white font-bold text-2xl">{finalAnalysis.pontuacao_atendimento}</span>
              <span className="text-purple-300 text-xs">/10</span>
              {[...Array(10)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${i < finalAnalysis.pontuacao_atendimento ? 'text-yellow-300 fill-yellow-300' : 'text-purple-400'}`}
                />
              ))}
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Resumo */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Resumo
              </p>
              <p className="text-sm text-slate-700 leading-relaxed">{finalAnalysis.resumo}</p>
            </div>

            {/* Satisfação */}
            <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
              <Zap className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-600">Satisfação estimada do cliente:</span>
              <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                finalAnalysis.satisfacao_estimada === 'alta'  ? 'bg-green-100 text-green-700' :
                finalAnalysis.satisfacao_estimada === 'media' ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-700'
              }`}>
                {finalAnalysis.satisfacao_estimada.toUpperCase()}
              </span>
            </div>

            {/* Grid: Positivos / Negativos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-green-700 flex items-center gap-1.5 mb-2">
                  <TrendingUp className="w-3.5 h-3.5" /> Pontos Positivos
                </p>
                <ul className="space-y-1.5">
                  {finalAnalysis.pontos_positivos.map((p, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-sm text-slate-700">
                      <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-red-700 flex items-center gap-1.5 mb-2">
                  <TrendingDown className="w-3.5 h-3.5" /> Pontos de Melhoria
                </p>
                <ul className="space-y-1.5">
                  {finalAnalysis.pontos_negativos.map((p, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-sm text-slate-700">
                      <AlertCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Recomendações */}
            <div>
              <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5 mb-2">
                <Zap className="w-3.5 h-3.5" /> Recomendações
              </p>
              <ul className="space-y-1.5">
                {finalAnalysis.recomendacoes.map((r, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-sm text-slate-700">
                    <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>

            {/* Próximos passos */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5 mb-2">
                <Clock className="w-3.5 h-3.5" /> Próximos Passos
              </p>
              <ul className="space-y-1">
                {finalAnalysis.proximos_passos.map((p, i) => (
                  <li key={i} className="text-sm text-amber-800 flex items-start gap-1.5">
                    <span className="font-bold flex-shrink-0">→</span> {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tela idle com instrução */}
      {phase === 'idle' && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
            <Mic className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-2">Pronto para escutar</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed mb-6">
            Configure as chaves de API acima e clique em <strong>Iniciar Escuta</strong> para começar.
            O áudio será processado em tempo real por dois modelos Gemini, e ao final
            o Claude Sonnet 4.6 gerará o relatório completo.
          </p>
          <div className="flex items-center justify-center gap-6 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><Volume2 className="w-3.5 h-3.5 text-blue-500" />Gemini — Transcrição</span>
            <span className="text-slate-300">→</span>
            <span className="flex items-center gap-1.5"><BarChart2 className="w-3.5 h-3.5 text-violet-500" />Gemini — Análise/frase</span>
            <span className="text-slate-300">→</span>
            <span className="flex items-center gap-1.5"><Brain className="w-3.5 h-3.5 text-purple-500" />Claude — Relatório</span>
          </div>
        </div>
      )}
    </div>
  );
}
