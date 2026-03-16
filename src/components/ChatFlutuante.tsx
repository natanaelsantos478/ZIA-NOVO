// ─────────────────────────────────────────────────────────────────────────────
// ChatFlutuante — Widget flutuante do agente IA ZIA
// Aparece em todas as telas como botão no canto inferior direito.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Sparkles, X, Send, Loader2, ChevronDown, Maximize2,
  RotateCcw, AlertCircle, Zap,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useZitaIA, type MensagemIA } from '../hooks/useZitaIA';
import { useProfiles } from '../context/ProfileContext';

// ── Formatação de ações executadas ────────────────────────────────────────────

function BadgeAcoes({ acoes }: { acoes: MensagemIA['acoes'] }) {
  if (!acoes?.length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {acoes.map((a, i) => (
        <span
          key={i}
          className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium ${
            a.status === 'sucesso'
              ? 'bg-emerald-900/60 text-emerald-300'
              : 'bg-red-900/60 text-red-300'
          }`}
        >
          <Zap className="w-2.5 h-2.5" />
          {a.ferramenta}
        </span>
      ))}
    </div>
  );
}

// ── Bolha de mensagem ─────────────────────────────────────────────────────────

function BolhaMensagem({ msg, userName }: { msg: MensagemIA; userName: string }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mr-2 flex-shrink-0 mt-0.5">
          <Sparkles className="w-3 h-3 text-white" />
        </div>
      )}
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
          isUser
            ? 'bg-indigo-600 text-white rounded-br-sm'
            : msg.erro
            ? 'bg-red-900/40 text-red-300 border border-red-800 rounded-bl-sm'
            : 'bg-slate-800 text-slate-100 rounded-bl-sm'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{msg.content}</p>
        ) : (
          <div className="prose prose-sm prose-invert max-w-none">
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
        )}
        <BadgeAcoes acoes={msg.acoes} />
      </div>
      {isUser && (
        <div className="w-6 h-6 rounded-full bg-indigo-700 flex items-center justify-center ml-2 flex-shrink-0 mt-0.5">
          <span className="text-[9px] font-bold text-white">
            {userName.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Widget principal ──────────────────────────────────────────────────────────

export default function ChatFlutuante() {
  const [aberto, setAberto]     = useState(false);
  const [input, setInput]       = useState('');
  const [minimizado, setMinimizado] = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const inputRef                = useRef<HTMLTextAreaElement>(null);
  const location                = useLocation();
  const navigate                = useNavigate();
  const { activeProfile }       = useProfiles();
  const { enviarMensagem, loading, historico, novaConversa, erro, tokenValido } = useZitaIA();

  // Não renderizar no login ou admin
  if (!activeProfile) return null;

  // Auto-scroll para última mensagem
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [historico, loading]);

  // Focus no input ao abrir
  useEffect(() => {
    if (aberto && !minimizado) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [aberto, minimizado]);

  async function handleEnviar() {
    const msg = input.trim();
    if (!msg || loading) return;
    setInput('');
    await enviarMensagem(msg, location.pathname);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEnviar();
    }
  }

  const sugestoes = [
    'Quantos pedidos estão abertos?',
    'Qual o estoque crítico?',
    'Mostra o faturamento do mês',
    'Quais comissões estão pendentes?',
  ];

  return (
    <>
      {/* Botão flutuante */}
      {!aberto && (
        <button
          onClick={() => setAberto(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-violet-600 to-indigo-700 rounded-full shadow-lg shadow-indigo-900/50 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform group"
          title="Assistente IA"
        >
          <Sparkles className="w-6 h-6 text-white" />
          {/* Badge pulsante se houver resposta nova */}
        </button>
      )}

      {/* Janela do chat */}
      {aberto && (
        <div
          className={`fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-black/60 flex flex-col transition-all duration-200 ${
            minimizado ? 'h-14 w-80' : 'w-96 h-[560px]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700 flex-shrink-0 rounded-t-2xl bg-gradient-to-r from-violet-900/60 to-indigo-900/60">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold leading-none">ZIA Agent</p>
              <p className="text-violet-400 text-[10px] mt-0.5 truncate">
                {activeProfile.name} · {activeProfile.entityType}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => navigate('/app/ia')}
                className="text-slate-400 hover:text-white transition-colors p-1 rounded"
                title="Abrir em tela cheia"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setMinimizado(v => !v)}
                className="text-slate-400 hover:text-white transition-colors p-1 rounded"
                title={minimizado ? 'Expandir' : 'Minimizar'}
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${minimizado ? 'rotate-180' : ''}`} />
              </button>
              <button
                onClick={() => setAberto(false)}
                className="text-slate-400 hover:text-white transition-colors p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Corpo (oculto quando minimizado) */}
          {!minimizado && (
            <>
              {/* Mensagens */}
              <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
                {historico.length === 0 && (
                  <div className="text-center pt-6">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center mx-auto mb-3">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-slate-300 text-sm font-medium">Olá, {activeProfile.name.split(' ')[0]}!</p>
                    <p className="text-slate-500 text-xs mt-1">Como posso ajudar?</p>

                    {!tokenValido && (
                      <div className="mt-3 flex items-start gap-2 bg-amber-900/40 border border-amber-700 rounded-xl p-3 text-left">
                        <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-300">
                          Sessão IA não inicializada. Faça logout e login novamente para ativar o agente.
                        </p>
                      </div>
                    )}

                    {/* Sugestões rápidas */}
                    {tokenValido && (
                      <div className="mt-4 space-y-1.5">
                        {sugestoes.map(s => (
                          <button
                            key={s}
                            onClick={() => { setInput(s); inputRef.current?.focus(); }}
                            className="w-full text-left text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-xl transition-colors border border-slate-700 hover:border-slate-600"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {historico.map((msg, i) => (
                  <BolhaMensagem key={i} msg={msg} userName={activeProfile.name} />
                ))}

                {loading && (
                  <div className="flex justify-start mb-3">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mr-2 flex-shrink-0">
                      <Sparkles className="w-3 h-3 text-white" />
                    </div>
                    <div className="bg-slate-800 rounded-2xl rounded-bl-sm px-4 py-3">
                      <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                    </div>
                  </div>
                )}

                {erro && !loading && (
                  <div className="flex items-start gap-2 bg-red-900/30 border border-red-800 rounded-xl p-3 mx-1">
                    <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-300">{erro}</p>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {/* Barra de ação superior do chat */}
              {historico.length > 0 && (
                <div className="px-4 pb-1 flex justify-end">
                  <button
                    onClick={novaConversa}
                    className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" /> Nova conversa
                  </button>
                </div>
              )}

              {/* Input */}
              <div className="px-3 pb-3 flex-shrink-0">
                <div className="flex items-end gap-2 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 focus-within:border-violet-600 transition-colors">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Pergunte algo..."
                    disabled={loading || !tokenValido}
                    rows={1}
                    className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 resize-none focus:outline-none max-h-24 leading-relaxed"
                    style={{ minHeight: '20px' }}
                  />
                  <button
                    onClick={handleEnviar}
                    disabled={!input.trim() || loading || !tokenValido}
                    className="w-7 h-7 flex-shrink-0 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-colors"
                  >
                    {loading
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      : <Send className="w-3.5 h-3.5 text-white" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-600 mt-1 text-center">Enter para enviar · Shift+Enter nova linha</p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
