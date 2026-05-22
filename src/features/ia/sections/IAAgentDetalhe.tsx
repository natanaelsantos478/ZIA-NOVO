// ─────────────────────────────────────────────────────────────────────────────
// IAAgentDetalhe — Detalhe do agente + Chat + Histórico + Permissões + Agenda
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Loader2, Settings2, Play, Pause, Calendar, CheckCircle2, Clock, AlertCircle, XCircle, RefreshCw, Trash2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useZitaIA } from '../../../hooks/useZitaIA';
import AgenteCriarModal from './AgenteCriarModal';

interface Agente {
  id: string;
  nome: string;
  avatar_emoji: string;
  cor: string;
  tipo: string;
  status: string;
  funcao: string;
  modelo_versao: string;
  pode_agir_background: boolean;
}

interface Execucao {
  id: string;
  status: string;
  resumo: string;
  iniciado_em: string;
  acoes_executadas: unknown[];
}

interface Solicitacao {
  id: string;
  titulo: string;
  status: string;
  prioridade: string;
  created_at: string;
}

interface AgendaItem {
  id: string;
  titulo: string;
  descricao: string;
  data_hora: string;
  acao_tipo: string;
  status: string;
  tentativas: number;
  resultado: string | null;
  erro_detalhe: string | null;
  created_at: string;
  parametros: Record<string, unknown>;
}

const STATUS_MAP: Record<string, string> = {
  ativo:    'text-emerald-400',
  pausado:  'text-amber-400',
  rascunho: 'text-slate-400',
};

const TIPO_MAP: Record<string, string> = {
  DIRETOR:      'bg-red-500/20 text-red-400',
  GERENTE:      'bg-violet-500/20 text-violet-400',
  COORDENADOR:  'bg-blue-500/20 text-blue-400',
  FUNCIONARIO:  'bg-emerald-500/20 text-emerald-400',
};

const AGENDA_STATUS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pendente:   { label: 'Pendente',   color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',    icon: <Clock className="w-3 h-3" /> },
  executando: { label: 'Executando', color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',       icon: <Loader2 className="w-3 h-3 animate-spin" /> },
  concluido:  { label: 'Concluído',  color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: <CheckCircle2 className="w-3 h-3" /> },
  falhou:     { label: 'Falhou',     color: 'bg-red-500/15 text-red-400 border-red-500/30',          icon: <XCircle className="w-3 h-3" /> },
};

export default function IAAgentDetalhe({
  agenteId,
  onBack,
}: {
  agenteId: string;
  onBack: () => void;
}) {
  const [agente, setAgente] = useState<Agente | null>(null);
  const [tab, setTab] = useState<'chat' | 'agenda' | 'execucoes' | 'solicitacoes' | 'config'>('chat');
  const [execucoes, setExecucoes] = useState<Execucao[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [agendaLoading, setAgendaLoading] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { enviarMensagem, loading: chatLoading, historico, novaConversa } = useZitaIA();

  useEffect(() => {
    supabase.from('ia_agentes').select('*').eq('id', agenteId).single()
      .then(({ data }) => setAgente(data as Agente));
    supabase.from('ia_execucoes_background')
      .select('id,status,resumo,iniciado_em,acoes_executadas')
      .eq('agente_id', agenteId).order('iniciado_em', { ascending: false }).limit(20)
      .then(({ data }) => setExecucoes((data ?? []) as Execucao[]));
    supabase.from('ia_solicitacoes')
      .select('id,titulo,status,prioridade,created_at')
      .eq('agente_id', agenteId).order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => setSolicitacoes((data ?? []) as Solicitacao[]));
  }, [agenteId]);

  useEffect(() => {
    if (tab === 'agenda') loadAgenda();
  }, [tab, agenteId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [historico]);

  async function loadAgenda() {
    setAgendaLoading(true);
    const { data } = await supabase
      .from('ia_agent_agenda')
      .select('id,titulo,descricao,data_hora,acao_tipo,status,tentativas,resultado,erro_detalhe,created_at,parametros')
      .eq('agent_id', agenteId)
      .order('data_hora', { ascending: false })
      .limit(50);
    setAgenda((data ?? []) as AgendaItem[]);
    setAgendaLoading(false);
  }

  async function cancelarItem(id: string) {
    await supabase.from('ia_agent_agenda').update({ status: 'cancelado' }).eq('id', id);
    setAgenda(a => a.map(i => i.id === id ? { ...i, status: 'cancelado' } : i));
  }

  async function toggleStatus() {
    if (!agente) return;
    const next = agente.status === 'ativo' ? 'pausado' : 'ativo';
    await supabase.from('ia_agentes').update({ status: next }).eq('id', agenteId);
    setAgente(a => a ? { ...a, status: next } : a);
  }

  async function send() {
    const msg = input.trim();
    if (!msg || chatLoading) return;
    setInput('');
    await enviarMensagem(msg, `Agente: ${agente?.nome ?? ''} | Função: ${agente?.funcao ?? ''}`);
  }

  if (!agente) {
    return <div className="flex items-center justify-center py-32"><Loader2 className="w-8 h-8 text-violet-400 animate-spin" /></div>;
  }

  const borderColor = agente.cor ?? '#7c3aed';

  const pendentes  = agenda.filter(i => i.status === 'pendente').length;
  const concluidos = agenda.filter(i => i.status === 'concluido').length;
  const falhos     = agenda.filter(i => i.status === 'falhou').length;

  return (
    <div className="p-6 space-y-6 max-w-screen-xl">

      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={onBack} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 mt-1 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-start gap-4 flex-1">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0"
            style={{ background: borderColor + '22', borderColor: borderColor + '44', borderWidth: 1 }}>
            {agente.avatar_emoji || '🤖'}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-slate-100">{agente.nome}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${TIPO_MAP[agente.tipo] ?? 'bg-slate-700 text-slate-400'}`}>{agente.tipo}</span>
              <span className={`text-xs font-semibold ${STATUS_MAP[agente.status] ?? 'text-slate-400'}`}>● {agente.status}</span>
            </div>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">{agente.funcao}</p>
            {agente.modelo_versao && (
              <p className="text-xs font-mono text-slate-600 mt-1">{agente.modelo_versao}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={toggleStatus}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors">
            {agente.status === 'ativo' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {agente.status === 'ativo' ? 'Pausar' : 'Ativar'}
          </button>
          <button onClick={() => setEditModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors">
            <Settings2 className="w-3.5 h-3.5" /> Editar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-2xl p-1.5 w-fit">
        {([
          { id: 'chat',         label: '💬 Chat'          },
          { id: 'agenda',       label: `📅 Agenda${pendentes > 0 ? ` (${pendentes})` : ''}` },
          { id: 'execucoes',    label: '⚡ Execuções'     },
          { id: 'solicitacoes', label: '📋 Solicitações'  },
          { id: 'config',       label: '⚙️ Configuração'  },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              tab === t.id ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Chat ────────────────────────────────────────────────────────── */}
      {tab === 'chat' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col" style={{ height: '60vh' }}>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
            {historico.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3 opacity-50">
                <div className="text-4xl">{agente.avatar_emoji}</div>
                <p className="text-slate-400 text-sm">Inicie uma conversa com {agente.nome}</p>
              </div>
            )}
            {historico.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-lg shrink-0 ${msg.role === 'user' ? 'bg-violet-600' : 'bg-slate-800'}`}>
                  {msg.role === 'user' ? '👤' : agente.avatar_emoji}
                </div>
                <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user' ? 'bg-violet-600 text-white rounded-tr-sm' :
                  msg.erro ? 'bg-red-900/40 text-red-300 border border-red-700' :
                  'bg-slate-800 text-slate-200 rounded-tl-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-lg">{agente.avatar_emoji}</div>
                <div className="bg-slate-800 px-4 py-3 rounded-2xl rounded-tl-sm">
                  <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-slate-800 p-4">
            <div className="flex gap-3">
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
                placeholder={`Mensagem para ${agente.nome}…`}
                className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500" />
              <button onClick={send} disabled={!input.trim() || chatLoading}
                className="px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white transition-colors">
                <Send className="w-4 h-4" />
              </button>
              <button onClick={novaConversa} className="px-3 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs transition-colors">
                Nova
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Agenda ──────────────────────────────────────────────────────── */}
      {tab === 'agenda' && (
        <div className="space-y-4">
          {/* Resumo */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Pendentes',  value: pendentes,  color: 'text-amber-400',   bg: 'bg-amber-500/10' },
              { label: 'Concluídos', value: concluidos, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { label: 'Falhos',     value: falhos,     color: 'text-red-400',     bg: 'bg-red-500/10' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} border border-slate-800 rounded-2xl px-5 py-4 flex items-center gap-3`}>
                <span className={`text-3xl font-black ${s.color}`}>{s.value}</span>
                <span className="text-sm text-slate-400">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-400">Ações agendadas ({agenda.length})</h2>
            <button onClick={loadAgenda} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" /> Atualizar
            </button>
          </div>

          {agendaLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
            </div>
          ) : agenda.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <Calendar className="w-12 h-12 text-slate-700" />
              <p className="text-slate-500 text-sm">Nenhuma ação agendada para este agente</p>
              <p className="text-slate-600 text-xs max-w-xs">Peça ao agente via WhatsApp para agendar uma ação futura e ela aparecerá aqui.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {agenda.map(item => {
                const s = AGENDA_STATUS[item.status] ?? AGENDA_STATUS.pendente;
                const dataHora = new Date(item.data_hora);
                const passado  = dataHora < new Date();
                return (
                  <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 space-y-2">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-semibold ${s.color}`}>
                            {s.icon} {s.label}
                          </span>
                          <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{item.acao_tipo}</span>
                          {passado && item.status === 'pendente' && (
                            <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Atrasado
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-slate-200 text-sm mt-1.5">{item.titulo}</p>
                        {item.descricao && item.descricao !== item.titulo && (
                          <p className="text-xs text-slate-500 mt-0.5">{item.descricao}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-slate-400 font-mono">{dataHora.toLocaleDateString('pt-BR')}</p>
                        <p className="text-sm font-bold text-slate-300">{dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>

                    {item.resultado && (
                      <div className={`text-xs rounded-xl px-3 py-2 ${item.status === 'falhou' ? 'bg-red-900/20 text-red-300' : 'bg-slate-800 text-slate-400'}`}>
                        {item.resultado}
                      </div>
                    )}

                    {item.status === 'pendente' && (
                      <div className="flex justify-end">
                        <button onClick={() => cancelarItem(item.id)}
                          className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3 h-3" /> Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Execuções ────────────────────────────────────────────────────── */}
      {tab === 'execucoes' && (
        execucoes.length === 0 ? (
          <p className="text-center text-slate-600 py-20">Nenhuma execução registrada para este agente</p>
        ) : (
          <div className="space-y-2">
            {execucoes.map(e => (
              <div key={e.id} className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    e.status === 'CONCLUIDO' ? 'bg-emerald-500/10 text-emerald-400' :
                    e.status === 'FALHOU' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'
                  }`}>{e.status}</span>
                  <span className="text-xs text-slate-500">{new Date(e.iniciado_em).toLocaleString('pt-BR')}</span>
                </div>
                <p className="text-sm text-slate-300 mt-2">{e.resumo || '—'}</p>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Solicitações ─────────────────────────────────────────────────── */}
      {tab === 'solicitacoes' && (
        solicitacoes.length === 0 ? (
          <p className="text-center text-slate-600 py-20">Nenhuma solicitação deste agente</p>
        ) : (
          <div className="space-y-2">
            {solicitacoes.map(s => (
              <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 flex items-center gap-4">
                <div className="flex-1">
                  <p className="font-semibold text-slate-200 text-sm">{s.titulo}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{new Date(s.created_at).toLocaleString('pt-BR')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${s.status === 'PENDENTE' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>{s.status}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${s.prioridade === 'URGENTE' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-slate-700 text-slate-400 border-slate-600'}`}>{s.prioridade}</span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Config shortcut ──────────────────────────────────────────────── */}
      {tab === 'config' && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <p className="text-slate-400 text-sm">Edite todas as configurações deste agente no modal completo.</p>
          <button onClick={() => setEditModal(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold transition-colors">
            <Settings2 className="w-4 h-4" /> Abrir configurações do agente
          </button>
        </div>
      )}

      {editModal && (
        <AgenteCriarModal
          agenteId={agenteId}
          onClose={() => setEditModal(false)}
          onSaved={() => {
            setEditModal(false);
            supabase.from('ia_agentes').select('*').eq('id', agenteId).single().then(({ data }) => setAgente(data as Agente));
          }}
        />
      )}
    </div>
  );
}
