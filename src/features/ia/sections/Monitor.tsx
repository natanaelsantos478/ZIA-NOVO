// ─────────────────────────────────────────────────────────────────────────────
// Monitor — Tarefas em Background (dados reais do Supabase)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, ChevronDown, Clock, CheckCircle2, XCircle, Loader2,
  Terminal, Zap, Activity,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface Execucao {
  id: string;
  status: string;
  gatilho: string | null;
  resumo: string | null;
  iniciado_em: string | null;
  concluido_em: string | null;
  solicitacoes_geradas: number;
  acoes_executadas: Array<{ ferramenta?: string; status?: string }> | null;
  agente: { nome: string; avatar_emoji: string } | null;
}

const STATUS_MAP: Record<string, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  bar: string;
  text: string;
}> = {
  EM_EXECUCAO: { label: 'Executando',  icon: Loader2,      iconClass: 'animate-spin text-blue-400',  bar: 'bg-blue-500',    text: 'text-blue-400'    },
  CONCLUIDO:   { label: 'Concluído',   icon: CheckCircle2, iconClass: 'text-emerald-400',             bar: 'bg-emerald-500', text: 'text-emerald-400' },
  FALHOU:      { label: 'Falhou',      icon: XCircle,      iconClass: 'text-red-400',                 bar: 'bg-red-500',     text: 'text-red-400'     },
  AGUARDANDO:  { label: 'Aguardando',  icon: Clock,        iconClass: 'text-slate-400',               bar: 'bg-slate-600',   text: 'text-slate-400'   },
};

function duracao(iniciado: string | null, concluido: string | null): string {
  if (!iniciado) return '—';
  const end = concluido ? new Date(concluido) : new Date();
  const ms = end.getTime() - new Date(iniciado).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function formatHour(ts: string | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function Monitor() {
  const [execucoes, setExecucoes] = useState<Execucao[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'EM_EXECUCAO' | 'CONCLUIDO' | 'FALHOU'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('ia_execucoes_background')
      .select('id,status,gatilho,resumo,iniciado_em,concluido_em,solicitacoes_geradas,acoes_executadas,agente:agente_id(nome,avatar_emoji)')
      .order('iniciado_em', { ascending: false })
      .limit(50);
    setExecucoes((data ?? []) as unknown as Execucao[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh a cada 10s enquanto houver tarefas em execução
  useEffect(() => {
    const hasRunning = execucoes.some(e => e.status === 'EM_EXECUCAO');
    if (!hasRunning) return;
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, [execucoes, load]);

  const filtered = filter === 'all' ? execucoes : execucoes.filter(e => e.status === filter);
  const running = execucoes.filter(e => e.status === 'EM_EXECUCAO').length;
  const done    = execucoes.filter(e => e.status === 'CONCLUIDO').length;
  const failed  = execucoes.filter(e => e.status === 'FALHOU').length;

  return (
    <div className="p-6 space-y-6 max-w-screen-xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-100">Monitor de Tarefas</h1>
          <p className="text-sm text-slate-400 mt-0.5">Acompanhe o que os agentes estão executando em background</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            {running > 0 && <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />}
            <span className="text-2xl font-black text-blue-400">{running}</span>
          </div>
          <p className="text-xs font-semibold text-slate-400">Em Execução</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-2xl font-black text-emerald-400">{done}</p>
          <p className="text-xs font-semibold text-slate-400">Concluídas</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-2xl font-black text-red-400">{failed}</p>
          <p className="text-xs font-semibold text-slate-400">Com Falha</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        {([
          { id: 'all',         label: 'Todas'       },
          { id: 'EM_EXECUCAO', label: 'Executando'  },
          { id: 'CONCLUIDO',   label: 'Concluídas'  },
          { id: 'FALHOU',      label: 'Falhas'       },
        ] as const).map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`text-xs px-3 py-2 rounded-xl font-semibold transition-colors ${
              filter === f.id
                ? 'bg-violet-600 text-white'
                : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-200'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading && execucoes.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-500">
          <Activity className="w-10 h-10 mb-4 opacity-20" />
          <p className="font-medium text-slate-400">Nenhuma tarefa encontrada</p>
          <p className="text-sm mt-1">As execuções dos agentes aparecerão aqui em tempo real.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(exec => {
            const st = STATUS_MAP[exec.status] ?? STATUS_MAP['AGUARDANDO'];
            const StatusIcon = st.icon;
            const isExpanded = expanded === exec.id;
            const acoes = exec.acoes_executadas ?? [];

            return (
              <div key={exec.id}
                className={`bg-slate-900 border rounded-2xl overflow-hidden ${isExpanded ? 'border-violet-600/40' : 'border-slate-800'}`}>

                <button
                  onClick={() => setExpanded(isExpanded ? null : exec.id)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-800/20 transition-colors"
                >
                  <div className="text-2xl shrink-0">{exec.agente?.avatar_emoji ?? '🤖'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-500">{exec.agente?.nome ?? 'Agente'}</span>
                      {exec.gatilho && (
                        <span className="text-xs bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Zap className="w-2.5 h-2.5" />{exec.gatilho}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-slate-200 text-sm truncate">
                      {exec.resumo ?? 'Sem descrição'}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right hidden sm:block">
                      <div className={`flex items-center gap-1.5 text-xs font-semibold ${st.text}`}>
                        <StatusIcon className={`w-3.5 h-3.5 ${st.iconClass}`} />
                        {st.label}
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {formatHour(exec.iniciado_em)} · {duracao(exec.iniciado_em, exec.concluido_em)}
                      </p>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-800 bg-slate-950/60">
                    <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-800/60">
                      <Terminal className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ações Executadas</span>
                    </div>
                    <div className="px-5 py-3 space-y-1 font-mono text-xs">
                      {acoes.length === 0 ? (
                        <p className="text-slate-600">Nenhuma ação registrada.</p>
                      ) : acoes.map((a, i) => (
                        <div key={i} className={`leading-relaxed ${
                          a.status === 'sucesso' ? 'text-emerald-400' :
                          a.status === 'erro'    ? 'text-red-400' : 'text-slate-400'
                        }`}>
                          {a.status === 'sucesso' ? '✓' : a.status === 'erro' ? '✗' : '·'} {a.ferramenta ?? '—'}
                        </div>
                      ))}
                      {exec.status === 'EM_EXECUCAO' && (
                        <div className="flex items-center gap-1.5 text-blue-400 mt-2">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Processando...</span>
                        </div>
                      )}
                    </div>
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
