// ─────────────────────────────────────────────────────────────────────────────
// CompromissoDetalhe — Drawer lateral com 5 abas + chat de voz com IA
// Abas: Resumo | Local | Participantes | Arquivos | Valores Negociados
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, MapPin, Users, Paperclip, DollarSign, FileText, ExternalLink, Navigation2,
  Check, CheckCircle2, XCircle, Trash2, Upload, Download, Plus,
  Search, Mic, MicOff, Send, Loader2, Sparkles, Video,
  Phone, Navigation, ListTodo, Calendar, Clock, MoreHorizontal,
} from 'lucide-react';
import { useCompromissos } from './hooks/useCompromissos';
import type { CompromissoFull, CompromissoParticipante, CompromissoArquivo, ZiaProfile } from '../types/compromisso';
import { supabase } from '../../../lib/supabase';

// (Gemini chamado via ai-proxy — sem chave no bundle)

const TIPO_ICON: Record<string, typeof Calendar> = {
  reuniao: Video, ligacao: Phone, visita: Navigation, apresentacao: ListTodo, outro: MoreHorizontal,
};
const TIPO_LABEL: Record<string, string> = {
  reuniao: 'Reunião', ligacao: 'Ligação', visita: 'Visita', apresentacao: 'Apresentação', outro: 'Outro',
};
const STATUS_CFG: Record<string, { label: string; color: string }> = {
  agendado:    { label: 'Agendado',     color: 'bg-blue-100 text-blue-700'    },
  confirmado:  { label: 'Confirmado',   color: 'bg-purple-100 text-purple-700'},
  em_andamento:{ label: 'Em andamento', color: 'bg-amber-100 text-amber-700'  },
  concluido:   { label: 'Concluído',    color: 'bg-green-100 text-green-700'  },
  cancelado:   { label: 'Cancelado',    color: 'bg-red-100 text-red-700'      },
};

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ── Speech Recognition helper ─────────────────────────────────────────────────
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
interface SpeechRecognitionEventLike {
  results: { transcript: string }[][];
}
declare const webkitSpeechRecognition: new () => SpeechRecognitionLike;
function getSpeechRecognition(): SpeechRecognitionLike | null {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
  return SR ? new SR() : null;
}

// ── Valor de negociação vinculada ─────────────────────────────────────────────
async function fetchNegociacaoValor(id: string): Promise<number | null> {
  const { data } = await supabase
    .from('crm_negociacoes')
    .select('valor_estimado')
    .eq('id', id)
    .single();
  return data?.valor_estimado ?? null;
}
async function fetchOrcamentoValor(id: string): Promise<number | null> {
  const { data } = await supabase
    .from('crm_orcamentos')
    .select('total')
    .eq('id', id)
    .single();
  return data?.total ?? null;
}
async function fetchProdutoValor(id: string): Promise<{ nome: string; preco: number } | null> {
  const { data } = await supabase
    .from('erp_produtos')
    .select('nome, preco_venda')
    .eq('id', id)
    .single();
  return data ? { nome: data.nome, preco: data.preco_venda } : null;
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  compromisso: CompromissoFull;
  onClose: () => void;
  onEdit: () => void;
  onUpdated: () => void;
}

type TabId = 'resumo' | 'local' | 'participantes' | 'arquivos' | 'valores';

export default function CompromissoDetalhe({ compromisso, onClose, onEdit, onUpdated }: Props) {
  const [tab, setTab] = useState<TabId>('resumo');
  const { addParticipante, removeParticipante, toggleConfirmado, uploadArquivo, removeArquivo, getArquivoUrl, fetchProfiles, updateCompromisso } = useCompromissos();

  // Participantes
  const [participantes, setParticipantes] = useState<CompromissoParticipante[]>(compromisso.participantes ?? []);
  const [profiles, setProfiles]           = useState<ZiaProfile[]>([]);
  const [profSearch, setProfSearch]       = useState('');
  const [savingPart, setSavingPart]       = useState(false);

  // Arquivos
  const [arquivos, setArquivos]           = useState<CompromissoArquivo[]>(compromisso.arquivos ?? []);
  const [uploading, setUploading]         = useState(false);
  const fileInputRef                      = useRef<HTMLInputElement>(null);

  // Valores
  const [valorNeg, setValorNeg]           = useState<number | null>(null);
  const [valorOrc, setValorOrc]           = useState<number | null>(null);
  const [valorProd, setValorProd]         = useState<{ nome: string; preco: number } | null>(null);

  // Chat de voz com IA
  const [chatMsgs, setChatMsgs]           = useState<{ role: 'user' | 'assistant'; text: string }[]>([{
    role: 'assistant', text: 'Olá! Sou a IA deste compromisso. Pode me perguntar qualquer coisa sobre ele ou falar por voz.',
  }]);
  const [chatInput, setChatInput]         = useState('');
  const [chatThinking, setChatThinking]   = useState(false);
  const [listening, setListening]         = useState(false);
  const srRef                             = useRef<SpeechRecognitionLike | null>(null);
  const chatBottomRef                     = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchProfiles().then(setProfiles);
    if (compromisso.negociacao_id) fetchNegociacaoValor(compromisso.negociacao_id).then(setValorNeg);
    if (compromisso.orcamento_id)  fetchOrcamentoValor(compromisso.orcamento_id).then(setValorOrc);
    if (compromisso.produto_id)    fetchProdutoValor(compromisso.produto_id).then(setValorProd);
  }, [compromisso.negociacao_id, compromisso.orcamento_id, compromisso.produto_id, fetchProfiles]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMsgs, chatThinking]);

  // ── Participantes ─────────────────────────────────────────────────────────
  const filteredProfiles = profiles.filter(p =>
    p.name.toLowerCase().includes(profSearch.toLowerCase()) &&
    !participantes.find(x => x.profissional_id === p.id),
  );

  async function handleAddPart(p: ZiaProfile) {
    setSavingPart(true);
    try {
      const novo = await addParticipante(compromisso.id, {
        profissional_id: p.id,
        profissional_nome: p.name,
      });
      setParticipantes(prev => [...prev, novo]);
      setProfSearch('');
    } finally { setSavingPart(false); }
  }

  async function handleRemovePart(id: string) {
    await removeParticipante(id);
    setParticipantes(prev => prev.filter(p => p.id !== id));
  }

  async function handleToggleConfirmado(part: CompromissoParticipante) {
    await toggleConfirmado(part.id, !part.confirmado);
    setParticipantes(prev => prev.map(p => p.id === part.id ? { ...p, confirmado: !p.confirmado } : p));
  }

  // ── Arquivos ──────────────────────────────────────────────────────────────
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const novo = await uploadArquivo(compromisso.id, file);
        setArquivos(prev => [...prev, novo]);
      }
    } catch (err) { alert(`Erro no upload: ${(err as Error).message}`); }
    finally { setUploading(false); e.target.value = ''; }
  }

  async function handleRemoveArquivo(arq: CompromissoArquivo) {
    await removeArquivo(arq.id, arq.storage_path);
    setArquivos(prev => prev.filter(a => a.id !== arq.id));
  }

  function formatBytes(b?: number) {
    if (!b) return '';
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  }

  // ── Concluir / Cancelar ───────────────────────────────────────────────────
  async function handleConcluir() {
    await updateCompromisso(compromisso.id, { status: 'concluido', concluido: true });
    onUpdated();
  }
  async function handleCancelar() {
    await updateCompromisso(compromisso.id, { status: 'cancelado' });
    onUpdated();
  }

  // ── Chat IA por voz ───────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    const sr = getSpeechRecognition();
    if (!sr) { alert('Seu navegador não suporta reconhecimento de voz.'); return; }
    sr.continuous = false;
    sr.interimResults = false;
    sr.lang = 'pt-BR';
    sr.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setChatInput(text);
    };
    sr.onend = () => setListening(false);
    srRef.current = sr;
    sr.start();
    setListening(true);
  }, []);

  const stopListening = useCallback(() => {
    srRef.current?.stop();
    setListening(false);
  }, []);

  const sendChat = useCallback(async () => {
    const text = chatInput.trim();
    if (!text || chatThinking) return;
    setChatInput('');
    setChatMsgs(prev => [...prev, { role: 'user', text }]);
    setChatThinking(true);
    try {
      const ctx = `Compromisso: "${compromisso.titulo}" — ${TIPO_LABEL[compromisso.tipo] ?? compromisso.tipo} — ${compromisso.data} ${compromisso.hora} — Status: ${compromisso.status}${compromisso.local ? ` — Local: ${compromisso.local}` : ''}${compromisso.local_endereco ? ` (${compromisso.local_endereco})` : ''}${compromisso.notas ? ` — Notas: ${compromisso.notas}` : ''}${compromisso.cliente_nome ? ` — Cliente: ${compromisso.cliente_nome}` : ''}${compromisso.valor_em_disputa ? ` — Valor em disputa: ${BRL(compromisso.valor_em_disputa)}` : ''}`;
      const prompt = `Você é a IA assistente deste compromisso no CRM ZIA.\n\nCONTEXTO DO COMPROMISSO:\n${ctx}\n\nHistórico:\n${chatMsgs.slice(-4).map(m => `${m.role === 'user' ? 'Usuário' : 'IA'}: ${m.text}`).join('\n')}\n\nUsuário: ${text}\n\nResponda de forma concisa e útil sobre este compromisso.`;
      const { data: proxyData, error: proxyErr } = await supabase.functions.invoke('ai-proxy', {
        body: { type: 'gemini-text-plain', prompt },
      });
      if (proxyErr) throw proxyErr;
      const reply = proxyData?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Sem resposta.';
      setChatMsgs(prev => [...prev, { role: 'assistant', text: reply }]);
    } catch (e) {
      setChatMsgs(prev => [...prev, { role: 'assistant', text: `Erro: ${(e as Error).message}` }]);
    } finally { setChatThinking(false); }
  }, [chatInput, chatThinking, compromisso, chatMsgs]);

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const TABS: { id: TabId; label: string; icon: typeof Calendar }[] = [
    { id: 'resumo',        label: 'Resumo',          icon: FileText       },
    { id: 'local',         label: 'Local',            icon: MapPin         },
    { id: 'participantes', label: 'Participantes',    icon: Users          },
    { id: 'arquivos',      label: 'Arquivos',         icon: Paperclip      },
    { id: 'valores',       label: 'Valores',          icon: DollarSign     },
  ];

  const TipoIcon = TIPO_ICON[compromisso.tipo] ?? Calendar;
  const sc = STATUS_CFG[compromisso.status] ?? { label: compromisso.status, color: 'bg-slate-100 text-slate-600' };
  const localValue  = (compromisso.local_endereco ?? compromisso.local ?? '').trim();
  const localIsLink = localValue.startsWith('http');
  const [embedUrl, setEmbedUrl]     = useState('');
  const [geocoding, setGeocoding]   = useState(false);

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://tgeomsnxfcqwrxijjvek.supabase.co';
  const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  useEffect(() => {
    if (!localValue || localIsLink) return;
    setGeocoding(true);
    fetch(`${SUPABASE_URL}/functions/v1/maps-embed`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_KEY}` },
      body:    JSON.stringify({ query: localValue }),
    })
      .then(r => r.json())
      .then(data => setEmbedUrl(data.url ?? ''))
      .catch(() => setEmbedUrl(''))
      .finally(() => setGeocoding(false));
  }, [localValue, localIsLink, SUPABASE_URL, SUPABASE_KEY]);

  const mapsOpenUrl = localIsLink
    ? localValue
    : localValue ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(localValue)}` : '';

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div className="flex-1 bg-black/30" onClick={onClose} />

      {/* Drawer */}
      <div className="w-full max-w-xl bg-white flex flex-col shadow-2xl h-full overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
              <TipoIcon className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900 leading-tight">{compromisso.titulo}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.color}`}>{sc.label}</span>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />{compromisso.data}
                </span>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />{compromisso.hora} · {compromisso.duracao}min
                </span>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100">
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Ações */}
          <div className="flex gap-2 mt-3">
            <button onClick={onEdit}
              className="flex-1 py-1.5 text-xs font-semibold border border-purple-200 text-purple-700 rounded-lg hover:bg-purple-50">
              Editar
            </button>
            {compromisso.status !== 'concluido' && (
              <button onClick={handleConcluir}
                className="flex-1 py-1.5 text-xs font-semibold bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />Concluir
              </button>
            )}
            {compromisso.status !== 'cancelado' && (
              <button onClick={handleCancelar}
                className="flex-1 py-1.5 text-xs font-semibold border border-red-200 text-red-600 rounded-lg hover:bg-red-50 flex items-center justify-center gap-1">
                <XCircle className="w-3.5 h-3.5" />Cancelar
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-4 gap-0.5 overflow-x-auto shrink-0">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-3 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                  tab === t.id ? 'border-purple-600 text-purple-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}>
                <Icon className="w-3.5 h-3.5" />{t.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">

          {/* ── Resumo ── */}
          {tab === 'resumo' && (
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Tipo', val: TIPO_LABEL[compromisso.tipo] ?? compromisso.tipo },
                  { label: 'Cliente', val: compromisso.cliente_nome || '—' },
                  { label: 'Data', val: compromisso.data },
                  { label: 'Hora', val: `${compromisso.hora} (${compromisso.duracao}min)` },
                ].map(f => (
                  <div key={f.label} className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-400 mb-0.5">{f.label}</p>
                    <p className="text-sm font-semibold text-slate-800">{f.val}</p>
                  </div>
                ))}
              </div>

              {compromisso.notas && (
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400 mb-1">Notas</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{compromisso.notas}</p>
                </div>
              )}

              {compromisso.link_reuniao && (
                <div className="bg-purple-50 rounded-xl p-3 flex items-center gap-3">
                  <Video className="w-4 h-4 text-purple-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-400 mb-0.5">Link da reunião</p>
                    <p className="text-xs text-purple-700 truncate">{compromisso.link_reuniao}</p>
                  </div>
                  <button
                    onClick={() => window.open(compromisso.link_reuniao, '_blank')}
                    className="px-3 py-1.5 bg-purple-600 text-white text-xs rounded-lg font-semibold hover:bg-purple-700 flex items-center gap-1 shrink-0"
                  >
                    <ExternalLink className="w-3 h-3" />Entrar
                  </button>
                </div>
              )}

              {/* Chat IA por voz */}
              <div className="border border-purple-200 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-purple-50 border-b border-purple-100">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <p className="text-xs font-bold text-purple-700">Chat IA sobre este compromisso</p>
                  <button
                    onClick={listening ? stopListening : startListening}
                    className={`ml-auto p-1.5 rounded-lg transition-colors ${listening ? 'bg-red-500 text-white animate-pulse' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}
                    title={listening ? 'Parar voz' : 'Falar por voz'}
                  >
                    {listening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <div className="h-40 overflow-y-auto p-3 space-y-2 bg-white custom-scrollbar">
                  {chatMsgs.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] text-xs px-3 py-2 rounded-xl leading-relaxed ${
                        m.role === 'user' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {m.text}
                      </div>
                    </div>
                  ))}
                  {chatThinking && (
                    <div className="flex justify-start">
                      <div className="bg-slate-100 text-slate-400 text-xs px-3 py-2 rounded-xl flex items-center gap-1.5">
                        <Loader2 className="w-3 h-3 animate-spin" />Pensando...
                      </div>
                    </div>
                  )}
                  <div ref={chatBottomRef} />
                </div>

                <div className="flex gap-2 p-2.5 border-t border-purple-100 bg-slate-50">
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                    placeholder={listening ? '🎤 Ouvindo...' : 'Pergunte sobre este compromisso...'}
                    className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                  <button
                    onClick={sendChat}
                    disabled={!chatInput.trim() || chatThinking}
                    className="p-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-lg"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Local ── */}
          {tab === 'local' && (
            <div className="p-5 space-y-4">
              {!localValue ? (
                <div className="text-center py-12">
                  <MapPin className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">Nenhum local definido para este compromisso.</p>
                  <button onClick={onEdit} className="mt-3 text-xs text-purple-600 font-semibold hover:underline">Adicionar local →</button>
                </div>
              ) : (
                <>
                  {/* Endereço / link salvo */}
                  <div className="bg-slate-50 rounded-xl p-3 flex items-start gap-2">
                    <Navigation2 className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-400 mb-0.5">
                        {localIsLink ? 'Link do Google Maps' : 'Endereço'}
                      </p>
                      <p className="text-sm text-slate-800 break-all">{localValue}</p>
                    </div>
                  </div>

                  {/* Geocodificando */}
                  {geocoding && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-500" />
                      Buscando localização no mapa...
                    </div>
                  )}

                  {/* Mapa */}
                  {embedUrl && !geocoding && (
                    <div className="rounded-xl overflow-hidden border border-slate-200">
                      <iframe
                        src={embedUrl}
                        width="100%"
                        height="280"
                        style={{ border: 0 }}
                        loading="lazy"
                        allowFullScreen
                        title="Mapa"
                      />
                    </div>
                  )}

                  {/* Botão abrir */}
                  <button
                    onClick={() => window.open(mapsOpenUrl, '_blank')}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {localIsLink ? 'Abrir link no Maps' : 'Abrir no Google Maps'}
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── Participantes ── */}
          {tab === 'participantes' && (
            <div className="p-5 space-y-4">
              {participantes.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">Nenhum participante adicionado.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {participantes.map(p => (
                    <div key={p.id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-sm font-bold text-purple-700 shrink-0">
                        {p.profissional_nome.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{p.profissional_nome}</p>
                        {p.profissional_email && <p className="text-xs text-slate-500">{p.profissional_email}</p>}
                      </div>
                      <button
                        onClick={() => handleToggleConfirmado(p)}
                        className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${
                          p.confirmado ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {p.confirmado ? <><Check className="w-3 h-3 inline mr-0.5" />Confirmado</> : 'Pendente'}
                      </button>
                      <button onClick={() => handleRemovePart(p.id)} className="text-slate-300 hover:text-red-500 ml-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Adicionar participante */}
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Adicionar participante</p>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    value={profSearch}
                    onChange={e => setProfSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                    placeholder="Buscar profissional..."
                  />
                </div>
                {profSearch && (
                  <div className="mt-1 border border-slate-200 rounded-lg overflow-hidden max-h-40 overflow-y-auto">
                    {filteredProfiles.slice(0, 8).map(p => (
                      <button
                        key={p.id}
                        onClick={() => handleAddPart(p)}
                        disabled={savingPart}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-purple-50 text-left border-b border-slate-50 last:border-0 disabled:opacity-50"
                      >
                        <Plus className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                        <span className="text-sm text-slate-700">{p.name}</span>
                        <span className="text-xs text-slate-400 ml-auto">{p.entity_name}</span>
                      </button>
                    ))}
                    {filteredProfiles.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-3">Nenhum resultado</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Arquivos ── */}
          {tab === 'arquivos' && (
            <div className="p-5 space-y-4">
              {/* Upload area */}
              <div
                className="border-2 border-dashed border-purple-200 rounded-xl p-6 text-center cursor-pointer hover:bg-purple-50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-2" />
                ) : (
                  <Upload className="w-8 h-8 text-purple-300 mx-auto mb-2" />
                )}
                <p className="text-sm text-slate-500">
                  {uploading ? 'Enviando...' : 'Clique ou arraste arquivos aqui'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">Documentos, imagens, planilhas...</p>
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleUpload} />
              </div>

              {/* Lista de arquivos */}
              {arquivos.length > 0 && (
                <div className="space-y-2">
                  {arquivos.map(arq => (
                    <div key={arq.id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                      <Paperclip className="w-4 h-4 text-slate-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{arq.nome_original}</p>
                        <p className="text-xs text-slate-400">
                          {formatBytes(arq.tamanho_bytes)} · {arq.created_at?.split('T')[0] ?? ''}
                        </p>
                      </div>
                      <a
                        href={getArquivoUrl(arq.storage_path)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-slate-400 hover:text-purple-600 rounded-lg hover:bg-purple-50"
                        title="Download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => handleRemoveArquivo(arq)}
                        className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50"
                        title="Remover"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {arquivos.length === 0 && !uploading && (
                <p className="text-center text-slate-400 text-sm">Nenhum arquivo anexado.</p>
              )}
            </div>
          )}

          {/* ── Valores Negociados ── */}
          {tab === 'valores' && (
            <div className="p-5 space-y-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Valores em disputa neste compromisso</p>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Item</th>
                      <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {valorNeg != null && (
                      <tr>
                        <td className="px-4 py-3 text-slate-700 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />Negociação vinculada
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">{BRL(valorNeg)}</td>
                      </tr>
                    )}
                    {valorOrc != null && (
                      <tr>
                        <td className="px-4 py-3 text-slate-700 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-purple-500" />Orçamento vinculado
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">{BRL(valorOrc)}</td>
                      </tr>
                    )}
                    {valorProd && (
                      <tr>
                        <td className="px-4 py-3 text-slate-700 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-amber-500" />Produto: {valorProd.nome}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-800">{BRL(valorProd.preco)}</td>
                      </tr>
                    )}
                    {compromisso.valor_em_disputa != null && compromisso.valor_em_disputa > 0 && (
                      <tr className="bg-purple-50">
                        <td className="px-4 py-3 text-purple-800 font-bold flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-purple-600" />Valor em disputa (registrado)
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-purple-800 text-base">{BRL(compromisso.valor_em_disputa)}</td>
                      </tr>
                    )}
                    {!valorNeg && !valorOrc && !valorProd && (!compromisso.valor_em_disputa || compromisso.valor_em_disputa === 0) && (
                      <tr>
                        <td colSpan={2} className="px-4 py-8 text-center text-slate-400 text-sm">
                          Nenhum valor vinculado. Edite o compromisso para adicionar valores.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {(valorNeg != null || valorOrc != null || valorProd != null) && (
                    <tfoot>
                      <tr className="bg-slate-50 border-t-2 border-slate-200">
                        <td className="px-4 py-3 font-bold text-slate-800">Total referenciado</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-700 text-base">
                          {BRL((valorNeg ?? 0) + (valorOrc ?? 0) + (valorProd?.preco ?? 0))}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              <div className="bg-amber-50 rounded-xl p-3 text-xs text-amber-700">
                <DollarSign className="w-3.5 h-3.5 inline mr-1" />
                Para editar o valor em disputa, clique em <strong>Editar</strong> no topo do painel.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
