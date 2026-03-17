// ─────────────────────────────────────────────────────────────────────────────
// IASolicitacoes — Inbox de solicitações dos agentes (Supabase-integrado)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2, XCircle, Clock, ChevronDown, Send,
  Loader2, RefreshCw,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface Solicitacao {
  id: string;
  titulo: string;
  descricao: string;
  tipo: 'APROVACAO' | 'INFORMACAO' | 'AUTORIZACAO_API' | 'DECISAO' | 'ALERTA';
  prioridade: 'URGENTE' | 'ALTA' | 'NORMAL' | 'BAIXA';
  status: 'PENDENTE' | 'RESPONDIDA' | 'EXPIRADA';
  opcoes: string[] | null;
  acao_pendente: Record<string, unknown> | null;
  dados_solicitados: Record<string, unknown> | null;
  resposta_gestor: string | null;
  created_at: string;
  agente: { id: string; nome: string; avatar_emoji: string } | null;
}

const TIPO_ICON: Record<string, string> = {
  APROVACAO:      '🔐',
  INFORMACAO:     'ℹ️',
  AUTORIZACAO_API:'🔑',
  DECISAO:        '🤔',
  ALERTA:         '🚨',
};

const TIPO_LABEL: Record<string, string> = {
  APROVACAO: 'Aprovação', INFORMACAO: 'Informação',
  AUTORIZACAO_API: 'Autorização API', DECISAO: 'Decisão', ALERTA: 'Alerta',
};

const PRIO_MAP: Record<string, string> = {
  URGENTE: 'bg-red-500/20 text-red-400 border-red-500/30',
  ALTA:    'bg-amber-500/20 text-amber-400 border-amber-500/30',
  NORMAL:  'bg-blue-500/20 text-blue-400 border-blue-500/30',
  BAIXA:   'bg-slate-700 text-slate-400 border-slate-600',
};

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'agora'; if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function IASolicitacoes() {
  const [items, setItems] = useState<Solicitacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'PENDENTE' | 'RESPONDIDA' | 'TODOS'>('PENDENTE');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [selectedOption, setSelectedOption] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('ia_solicitacoes')
      .select('id,titulo,descricao,tipo,prioridade,status,opcoes,acao_pendente,dados_solicitados,resposta_gestor,created_at,agente:agente_id(id,nome,avatar_emoji)')
      .order('prioridade')
      .order('created_at', { ascending: false });
    if (filter !== 'TODOS') q = q.eq('status', filter);
    const { data } = await q;
    setItems((data ?? []) as unknown as Solicitacao[]);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const pending = items.filter(i => i.status === 'PENDENTE').length;

  async function respond(id: string, resposta: string, status: 'RESPONDIDA') {
    setSubmitting(id);
    await supabase.from('ia_solicitacoes').update({
      status, resposta_gestor: resposta, respondido_em: new Date().toISOString(),
    }).eq('id', id);
    await load();
    setExpanded(null);
    setSubmitting(null);
  }

  return (
    <div className="p-6 space-y-6 max-w-screen-lg">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-100">Solicitações da IA</h1>
            <p className="text-sm text-slate-400 mt-0.5">Pedidos dos agentes que precisam da sua decisão</p>
          </div>
          {pending > 0 && (
            <span className="px-2.5 py-1 bg-red-500 text-white text-sm font-black rounded-full animate-pulse">{pending}</span>
          )}
        </div>
        <button onClick={load} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['PENDENTE', 'RESPONDIDA', 'TODOS'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs px-3 py-2 rounded-xl font-semibold transition-colors ${
              filter === f ? 'bg-violet-600 text-white' : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-200'
            }`}>
            {f === 'PENDENTE' ? `Pendentes (${pending})` : f === 'RESPONDIDA' ? 'Respondidas' : 'Todas'}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-violet-400 animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-500/30" />
          <p className="text-slate-400 font-semibold">Nenhuma solicitação {filter === 'PENDENTE' ? 'pendente' : ''}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(s => {
            const isExpanded = expanded === s.id;
            const ag = s.agente as { nome: string; avatar_emoji: string } | null;

            return (
              <div key={s.id} className={`bg-slate-900 border rounded-2xl overflow-hidden transition-all ${
                s.status === 'PENDENTE' && s.prioridade === 'URGENTE' ? 'border-red-500/40' :
                isExpanded ? 'border-violet-600/40' : 'border-slate-800'
              }`}>

                {/* Row */}
                <button onClick={() => setExpanded(isExpanded ? null : s.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-800/20 transition-colors">
                  <span className="text-2xl shrink-0">{ag?.avatar_emoji || '🤖'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-bold text-slate-500">{ag?.nome}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${PRIO_MAP[s.prioridade] ?? ''}`}>{s.prioridade}</span>
                      <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                        {TIPO_ICON[s.tipo]} {TIPO_LABEL[s.tipo]}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-200 text-sm leading-snug">{s.titulo}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className={`flex items-center gap-1 text-xs font-semibold ${
                        s.status === 'PENDENTE' ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {s.status === 'PENDENTE' ? <Clock className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                        {s.status}
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">{timeAgo(s.created_at)}</p>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {/* Expanded */}
                {isExpanded && (
                  <div className="border-t border-slate-800 px-5 py-5 space-y-4 bg-slate-900/50">
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Solicitação do Agente</p>
                      <p className="text-sm text-slate-300 leading-relaxed">{s.descricao}</p>
                    </div>

                    {s.acao_pendente && (
                      <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700">
                        <p className="text-xs font-bold text-slate-500 mb-2">Ação que o agente quer executar</p>
                        <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap">{JSON.stringify(s.acao_pendente, null, 2)}</pre>
                      </div>
                    )}

                    {/* Resposta já dada */}
                    {s.resposta_gestor && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                        <p className="text-xs font-bold text-emerald-400 mb-1">Sua resposta</p>
                        <p className="text-sm text-slate-300">{s.resposta_gestor}</p>
                      </div>
                    )}

                    {/* Action area — pendentes */}
                    {s.status === 'PENDENTE' && (
                      <div className="space-y-3">

                        {/* DECISAO — opções clicáveis */}
                        {s.tipo === 'DECISAO' && s.opcoes && s.opcoes.length > 0 && (
                          <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Selecione uma opção</p>
                            <div className="grid grid-cols-2 gap-2">
                              {s.opcoes.map(opt => (
                                <button key={opt}
                                  onClick={() => setSelectedOption(p => ({ ...p, [s.id]: opt }))}
                                  className={`p-3 rounded-xl border text-sm font-semibold transition-all text-left ${
                                    selectedOption[s.id] === opt
                                      ? 'border-violet-500 bg-violet-500/10 text-violet-300'
                                      : 'border-slate-700 bg-slate-800/40 text-slate-300 hover:border-slate-600'
                                  }`}>
                                  {opt}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Campo de resposta/instrução */}
                        {(s.tipo === 'INFORMACAO' || s.tipo === 'AUTORIZACAO_API' || s.tipo === 'APROVACAO') && (
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                              {s.tipo === 'INFORMACAO' ? 'Forneça a informação' :
                               s.tipo === 'AUTORIZACAO_API' ? 'Token / Credencial' : 'Observação (opcional)'}
                            </label>
                            <textarea value={replyText[s.id] ?? ''}
                              onChange={e => setReplyText(p => ({ ...p, [s.id]: e.target.value }))}
                              placeholder={s.tipo === 'AUTORIZACAO_API' ? 'Cole a chave de API aqui…' : 'Digite aqui…'}
                              rows={2}
                              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500 resize-none" />
                          </div>
                        )}

                        {/* Buttons */}
                        <div className="flex gap-2">
                          {s.tipo !== 'ALERTA' && s.tipo !== 'INFORMACAO' && (
                            <button
                              onClick={() => respond(s.id, replyText[s.id] || selectedOption[s.id] || 'Aprovado.', 'RESPONDIDA')}
                              disabled={!!submitting}
                              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-colors disabled:opacity-50">
                              {submitting === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                              {s.tipo === 'DECISAO' ? 'Confirmar decisão' : 'Aprovar'}
                            </button>
                          )}
                          {s.tipo === 'APROVACAO' && (
                            <button
                              onClick={() => respond(s.id, replyText[s.id] || 'Solicitação negada.', 'RESPONDIDA')}
                              disabled={!!submitting}
                              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-900/60 hover:bg-red-800/80 text-red-300 text-sm font-bold border border-red-800 transition-colors disabled:opacity-50">
                              <XCircle className="w-4 h-4" /> Rejeitar
                            </button>
                          )}
                          {(s.tipo === 'INFORMACAO' || s.tipo === 'AUTORIZACAO_API') && (
                            <button
                              onClick={() => respond(s.id, replyText[s.id] ?? '', 'RESPONDIDA')}
                              disabled={!replyText[s.id] || !!submitting}
                              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-colors disabled:opacity-40">
                              {submitting === s.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                              Enviar resposta
                            </button>
                          )}
                          {s.tipo === 'ALERTA' && (
                            <button
                              onClick={() => respond(s.id, 'Leitura confirmada.', 'RESPONDIDA')}
                              disabled={!!submitting}
                              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-bold transition-colors">
                              <CheckCircle2 className="w-4 h-4" /> Confirmar leitura
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
