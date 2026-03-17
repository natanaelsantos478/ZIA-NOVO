// ─────────────────────────────────────────────────────────────────────────────
// IAHistorico — Histórico unificado: conversas, execuções e ações (Supabase)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Activity, Zap, ChevronDown, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

type TabType = 'execucoes' | 'conversas' | 'acoes';

interface Execucao {
  id: string;
  status: string;
  gatilho: string;
  resumo: string;
  iniciado_em: string;
  concluido_em: string | null;
  solicitacoes_geradas: number;
  acoes_executadas: unknown[];
  agente: { nome: string; avatar_emoji: string } | null;
}

interface Conversa {
  id: string;
  titulo: string;
  created_at: string;
  mensagens: { count: number }[];
  agente: { nome: string; avatar_emoji: string } | null;
}

interface AcaoLog {
  id: string;
  ferramenta: string;
  status: string;
  created_at: string;
  parametros: Record<string, unknown>;
  resultado: unknown;
}

function timeAgo(iso: string) {
  if (!iso) return '—';
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'agora'; if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
  return new Date(iso).toLocaleDateString('pt-BR');
}

function duration(start: string, end: string | null) {
  if (!end) return '—';
  const s = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

export default function IAHistorico() {
  const [tab, setTab] = useState<TabType>('execucoes');
  const [execucoes, setExecucoes] = useState<Execucao[]>([]);
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [acoes, setAcoes] = useState<AcaoLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    if (tab === 'execucoes') {
      const { data } = await supabase
        .from('ia_execucoes_background')
        .select('id,status,gatilho,resumo,iniciado_em,concluido_em,solicitacoes_geradas,acoes_executadas,agente:agente_id(nome,avatar_emoji)')
        .order('iniciado_em', { ascending: false })
        .limit(50);
      setExecucoes((data ?? []) as unknown as Execucao[]);
    } else if (tab === 'conversas') {
      const { data } = await supabase
        .from('ia_conversas')
        .select('id,titulo,created_at,mensagens:ia_mensagens(count),agente:agente_id(nome,avatar_emoji)')
        .order('created_at', { ascending: false })
        .limit(50);
      setConversas((data ?? []) as unknown as Conversa[]);
    } else {
      const { data } = await supabase
        .from('ia_acoes_log')
        .select('id,ferramenta,status,created_at,parametros,resultado')
        .order('created_at', { ascending: false })
        .limit(100);
      setAcoes((data ?? []) as AcaoLog[]);
    }
    setLoading(false);
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 space-y-6 max-w-screen-xl">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-100">Histórico</h1>
          <p className="text-sm text-slate-400 mt-0.5">Registro completo de conversas, execuções e ações da IA</p>
        </div>
        <button onClick={load} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-2xl p-1.5 w-fit">
        {([
          { id: 'execucoes', icon: Activity,      label: 'Execuções Background' },
          { id: 'conversas', icon: MessageSquare, label: 'Conversas'             },
          { id: 'acoes',     icon: Zap,           label: 'Ações Executadas'      },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              tab === t.id ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-violet-400 animate-spin" /></div>
      ) : (

        <>
          {/* ── Execuções ── */}
          {tab === 'execucoes' && (
            execucoes.length === 0 ? (
              <p className="text-center text-slate-600 py-20">Nenhuma execução registrada ainda</p>
            ) : (
              <div className="space-y-2">
                {execucoes.map(exec => {
                  const ag = exec.agente as { nome: string; avatar_emoji: string } | null;
                  const isExp = expanded === exec.id;
                  return (
                    <div key={exec.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                      <button onClick={() => setExpanded(isExp ? null : exec.id)}
                        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-800/20 transition-colors">
                        <span className="text-xl shrink-0">{ag?.avatar_emoji || '🤖'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-slate-400">{ag?.nome}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                              exec.status === 'CONCLUIDO'   ? 'bg-emerald-500/10 text-emerald-400' :
                              exec.status === 'EM_EXECUCAO' ? 'bg-blue-500/10 text-blue-400' :
                              exec.status === 'FALHOU'      ? 'bg-red-500/10 text-red-400' : 'bg-slate-700 text-slate-400'
                            }`}>{exec.status}</span>
                            <span className="text-xs text-slate-600">{timeAgo(exec.iniciado_em)}</span>
                            <span className="text-xs text-slate-600">• {duration(exec.iniciado_em, exec.concluido_em)}</span>
                          </div>
                          <p className="text-sm text-slate-300">{exec.resumo || exec.gatilho || '—'}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {exec.solicitacoes_geradas > 0 && (
                            <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">{exec.solicitacoes_geradas} sol.</span>
                          )}
                          <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isExp ? 'rotate-180' : ''}`} />
                        </div>
                      </button>
                      {isExp && exec.acoes_executadas && (exec.acoes_executadas as unknown[]).length > 0 && (
                        <div className="border-t border-slate-800 px-5 py-4 bg-slate-950/40">
                          <p className="text-xs font-bold text-slate-500 uppercase mb-3">Ações Executadas</p>
                          <div className="space-y-2">
                            {(exec.acoes_executadas as Array<{ferramenta?: string; status?: string; resultado?: unknown}>).map((a, i) => (
                              <div key={i} className="flex items-start gap-3 text-xs">
                                <span className={`px-2 py-0.5 rounded font-mono font-bold ${a.status === 'sucesso' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{a.ferramenta}</span>
                                <span className="text-slate-500 truncate">{JSON.stringify(a.resultado).slice(0, 120)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* ── Conversas ── */}
          {tab === 'conversas' && (
            conversas.length === 0 ? (
              <p className="text-center text-slate-600 py-20">Nenhuma conversa registrada ainda</p>
            ) : (
              <div className="space-y-2">
                {conversas.map(c => {
                  const ag = c.agente as { nome: string; avatar_emoji: string } | null;
                  const msgCount = Array.isArray(c.mensagens) ? c.mensagens[0]?.count ?? 0 : 0;
                  return (
                    <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 flex items-center gap-4 hover:border-slate-700 transition-colors">
                      <span className="text-xl">{ag?.avatar_emoji || '💬'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-200 text-sm">{c.titulo || 'Conversa sem título'}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{ag?.nome ?? 'Assistente geral'} • {msgCount} mensagens</p>
                      </div>
                      <span className="text-xs text-slate-600 shrink-0">{timeAgo(c.created_at)}</span>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* ── Ações ── */}
          {tab === 'acoes' && (
            acoes.length === 0 ? (
              <p className="text-center text-slate-600 py-20">Nenhuma ação registrada ainda</p>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase">Ferramenta</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Parâmetros</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase">Quando</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {acoes.map(a => (
                      <tr key={a.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="px-5 py-3 font-mono text-xs text-violet-400">{a.ferramenta}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${a.status === 'sucesso' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{a.status}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400 max-w-xs truncate">{JSON.stringify(a.parametros ?? {})}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{timeAgo(a.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
