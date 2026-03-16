// ─────────────────────────────────────────────────────────────────────────────
// IAPage — Módulo dedicado ao Agente IA ZIA (tela cheia)
// Rota: /app/ia
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Sparkles, Send, Loader2, RotateCcw, AlertCircle, Zap,
  MessageSquare, ChevronRight, Shield, Clock, Database,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useZitaIA, type MensagemIA, type AcaoExecutada } from '../../hooks/useZitaIA';
import { useProfiles, LEVEL_LABELS } from '../../context/ProfileContext';

// ── Componente de ação executada ──────────────────────────────────────────────

function CartaoAcao({ acao }: { acao: AcaoExecutada }) {
  const [expandido, setExpandido] = useState(false);
  return (
    <div
      className={`text-xs rounded-lg border overflow-hidden ${
        acao.status === 'sucesso'
          ? 'border-emerald-800 bg-emerald-950/40'
          : 'border-red-800 bg-red-950/40'
      }`}
    >
      <button
        onClick={() => setExpandido(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
      >
        <Zap className={`w-3 h-3 flex-shrink-0 ${acao.status === 'sucesso' ? 'text-emerald-400' : 'text-red-400'}`} />
        <span className={`font-mono font-medium ${acao.status === 'sucesso' ? 'text-emerald-300' : 'text-red-300'}`}>
          {acao.ferramenta}
        </span>
        <ChevronRight className={`w-3 h-3 ml-auto transition-transform ${expandido ? 'rotate-90' : ''} text-slate-500`} />
      </button>
      {expandido && (
        <div className="px-3 pb-3 space-y-2 border-t border-slate-800">
          {acao.args && (
            <div>
              <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1 mt-2">Parâmetros</p>
              <pre className="text-slate-400 text-[10px] overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(acao.args, null, 2)}
              </pre>
            </div>
          )}
          {acao.resultado != null && (
            <div>
              <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Resultado</p>
              <pre className="text-slate-400 text-[10px] overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(acao.resultado as Record<string, unknown>, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Bolha de mensagem ─────────────────────────────────────────────────────────

function BolhaMensagem({ msg, userName }: { msg: MensagemIA; userName: string }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex gap-3 mb-6 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser ? 'bg-indigo-700' : 'bg-gradient-to-br from-violet-500 to-indigo-600'
      }`}>
        {isUser
          ? <span className="text-xs font-bold text-white">{userName.charAt(0).toUpperCase()}</span>
          : <Sparkles className="w-4 h-4 text-white" />}
      </div>
      <div className={`flex-1 max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        <p className={`text-xs text-slate-500 mb-1.5 ${isUser ? 'text-right' : ''}`}>
          {isUser ? userName : 'ZIA Agent'}
        </p>
        <div className={`rounded-2xl px-4 py-3 text-sm ${
          isUser
            ? 'bg-indigo-600 text-white rounded-br-sm'
            : msg.erro
            ? 'bg-red-900/40 text-red-300 border border-red-800 rounded-bl-sm'
            : 'bg-slate-800 text-slate-100 rounded-bl-sm'
        }`}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{msg.content}</p>
          ) : (
            <div className="prose prose-sm prose-invert max-w-none">
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          )}
        </div>
        {/* Ações executadas */}
        {msg.acoes && msg.acoes.length > 0 && (
          <div className="mt-2 w-full space-y-1.5">
            <p className="text-[10px] text-slate-500 flex items-center gap-1">
              <Database className="w-3 h-3" /> {msg.acoes.length} ação(ões) executada(s)
            </p>
            {msg.acoes.map((a, i) => <CartaoAcao key={i} acao={a} />)}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Painel lateral: contexto e histórico ──────────────────────────────────────

const SUGESTOES_RAPIDAS = [
  { label: 'Faturamento do mês', prompt: 'Qual é o faturamento do mês atual?' },
  { label: 'Estoque crítico', prompt: 'Quais produtos estão com estoque crítico?' },
  { label: 'Pedidos em aberto', prompt: 'Quantos pedidos estão em aberto?' },
  { label: 'Comissões pendentes', prompt: 'Qual o valor total de comissões pendentes?' },
  { label: 'Top funcionários', prompt: 'Quais são os funcionários mais ativos este mês?' },
  { label: 'Clientes recentes', prompt: 'Liste os últimos 10 clientes cadastrados.' },
];

// ── Página principal ──────────────────────────────────────────────────────────

export default function IAPage() {
  const [input, setInput]       = useState('');
  const bottomRef               = useRef<HTMLDivElement>(null);
  const inputRef                = useRef<HTMLTextAreaElement>(null);
  const location                = useLocation();
  const { activeProfile }       = useProfiles();
  const { enviarMensagem, loading, historico, novaConversa, erro, tokenValido } = useZitaIA();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [historico, loading]);

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

  if (!activeProfile) return null;

  return (
    <div className="flex flex-col h-screen bg-slate-950 overflow-hidden">
      {/* Barra de título simples */}
      <div className="h-12 bg-indigo-700 flex items-center px-5 gap-3 flex-shrink-0">
        <Sparkles className="w-4 h-4 text-indigo-300" />
        <span className="text-white font-bold text-sm tracking-wide">ZIA Agent</span>
        <span className="text-indigo-400 text-xs">Assistente IA com acesso ao ERP</span>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar lateral ── */}
        <aside className="w-72 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col overflow-hidden">

          {/* Perfil ativo */}
          <div className="p-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">{activeProfile.name.charAt(0)}</span>
              </div>
              <div className="min-w-0">
                <p className="text-white font-semibold text-sm truncate">{activeProfile.name}</p>
                <p className="text-slate-400 text-xs">{LEVEL_LABELS[activeProfile.level]}</p>
              </div>
            </div>

            <div className="mt-3 space-y-1.5">
              <div className="flex items-center gap-2 text-xs">
                <Shield className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                <span className="text-slate-400">Acesso:</span>
                <span className={`font-medium ${
                  activeProfile.entityType === 'holding' ? 'text-violet-400' :
                  activeProfile.entityType === 'matrix'  ? 'text-blue-400' :
                  'text-emerald-400'
                }`}>
                  {activeProfile.entityType === 'holding' ? 'Global (Holding)' :
                   activeProfile.entityType === 'matrix'  ? 'Matrix'           : 'Filial'}
                </span>
              </div>
              {!tokenValido && (
                <div className="flex items-start gap-2 bg-amber-950/50 border border-amber-800 rounded-lg p-2 mt-2">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-300">
                    Sessão IA expirada. Faça logout e login novamente.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sugestões rápidas */}
          <div className="p-4 border-b border-slate-800">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">
              Sugestões Rápidas
            </p>
            <div className="space-y-1.5">
              {SUGESTOES_RAPIDAS.map(s => (
                <button
                  key={s.label}
                  onClick={() => { setInput(s.prompt); inputRef.current?.focus(); }}
                  disabled={!tokenValido}
                  className="w-full text-left text-xs px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 hover:border-violet-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ações */}
          <div className="p-4 mt-auto">
            {historico.length > 0 && (
              <button
                onClick={novaConversa}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs rounded-lg transition-colors border border-slate-700"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Nova Conversa
              </button>
            )}
            <div className="flex items-center gap-1.5 mt-3">
              <Clock className="w-3 h-3 text-slate-600" />
              <p className="text-[10px] text-slate-600">
                {historico.length} mensagem(s) nesta sessão
              </p>
            </div>
          </div>
        </aside>

        {/* ── Área de chat ── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar">

            {historico.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center max-w-lg mx-auto">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center mb-6 shadow-lg shadow-violet-900/50">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">ZIA Agent</h1>
                <p className="text-slate-400 text-sm leading-relaxed mb-8">
                  Sou seu assistente executivo com acesso total ao ERP.
                  Posso consultar dados, criar registros, gerar relatórios e muito mais.
                </p>
                <div className="grid grid-cols-2 gap-3 w-full">
                  {SUGESTOES_RAPIDAS.map(s => (
                    <button
                      key={s.label}
                      onClick={() => { setInput(s.prompt); inputRef.current?.focus(); }}
                      disabled={!tokenValido}
                      className="flex items-start gap-2 text-left bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-violet-700 rounded-xl p-3 transition-all group disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <MessageSquare className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
                      <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors">
                        {s.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto">
                {historico.map((msg, i) => (
                  <BolhaMensagem key={i} msg={msg} userName={activeProfile.name} />
                ))}

                {loading && (
                  <div className="flex gap-3 mb-6">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-slate-800 rounded-2xl rounded-bl-sm px-4 py-3">
                      <div className="flex items-center gap-2 text-violet-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-xs">Processando...</span>
                      </div>
                    </div>
                  </div>
                )}

                {erro && !loading && (
                  <div className="flex items-start gap-3 bg-red-900/30 border border-red-800 rounded-xl p-4 mb-4 max-w-3xl mx-auto">
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-300">{erro}</p>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <div className="px-8 pb-6 flex-shrink-0">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-end gap-3 bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 focus-within:border-violet-600 transition-colors shadow-lg">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={tokenValido ? 'Pergunte, peça análises ou solicite ações...' : 'Faça login para usar o agente IA'}
                  disabled={loading || !tokenValido}
                  rows={1}
                  className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-600 resize-none focus:outline-none max-h-40 leading-relaxed"
                />
                <button
                  onClick={handleEnviar}
                  disabled={!input.trim() || loading || !tokenValido}
                  className="w-9 h-9 flex-shrink-0 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-colors"
                >
                  {loading
                    ? <Loader2 className="w-4 h-4 animate-spin text-white" />
                    : <Send className="w-4 h-4 text-white" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-600 mt-2 text-center">
                Enter para enviar · Shift+Enter nova linha · O agente tem acesso aos dados do seu tenant
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
