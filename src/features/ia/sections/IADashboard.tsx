// ─────────────────────────────────────────────────────────────────────────────
// IADashboard — Quartel General IA (Supabase-integrado)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import {
  Bot, CheckCircle2, TrendingUp,
  MessageSquare, Activity, ChevronRight, Sparkles,
  BrainCircuit, ArrowUpRight, ShieldCheck,
  Radio, Plus,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Agente {
  id: string;
  nome: string;
  avatar_emoji: string;
  tipo: string;
  status: string;
  funcao: string;
  modelo_versao: string;
  updated_at: string;
}

interface Solicitacao {
  id: string;
  titulo: string;
  tipo: string;
  prioridade: string;
  created_at: string;
  agente: { nome: string; avatar_emoji: string } | null;
}

interface Execucao {
  id: string;
  status: string;
  resumo: string;
  iniciado_em: string;
  agente: { nome: string; avatar_emoji: string } | null;
}

interface Config {
  ia_ativa: boolean;
  modo_autonomia: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { dot: string; text: string; label: string }> = {
  ativo:    { dot: 'bg-emerald-400 animate-pulse', text: 'text-emerald-400', label: 'Ativo'    },
  pausado:  { dot: 'bg-amber-400',                 text: 'text-amber-400',   label: 'Pausado'  },
  rascunho: { dot: 'bg-slate-500',                 text: 'text-slate-400',   label: 'Rascunho' },
};

const TIPO_MAP: Record<string, string> = {
  ESPECIALISTA:  'bg-blue-500/20 text-blue-400',
  MONITOR:       'bg-emerald-500/20 text-emerald-400',
  ORQUESTRADOR:  'bg-violet-500/20 text-violet-400',
  EXTERNO:       'bg-orange-500/20 text-orange-400',
};

const PRIORIDADE_MAP: Record<string, string> = {
  URGENTE: 'bg-red-500/20 text-red-400 border-red-500/30',
  ALTA:    'bg-amber-500/20 text-amber-400 border-amber-500/30',
  NORMAL:  'bg-blue-500/20 text-blue-400 border-blue-500/30',
  BAIXA:   'bg-slate-700 text-slate-400 border-slate-600',
};


function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `${m}min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function IADashboard({ onNavigate }: { onNavigate?: (id: string) => void }) {
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [execucoes, setExecucoes] = useState<Execucao[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [agRes, solRes, execRes, cfgRes] = await Promise.all([
        supabase.from('ia_agentes').select('id,nome,avatar_emoji,tipo,status,funcao,modelo_versao,updated_at').order('created_at'),
        supabase.from('ia_solicitacoes').select('id,titulo,tipo,prioridade,created_at,agente:agente_id(nome,avatar_emoji)').eq('status','PENDENTE').order('prioridade').limit(5),
        supabase.from('ia_execucoes_background').select('id,status,resumo,iniciado_em,agente:agente_id(nome,avatar_emoji)').order('iniciado_em', { ascending: false }).limit(6),
        supabase.from('ia_config_tenant').select('ia_ativa,modo_autonomia').single(),
      ]);
      setAgentes((agRes.data ?? []) as Agente[]);
      setSolicitacoes((solRes.data ?? []) as unknown as Solicitacao[]);
      setExecucoes((execRes.data ?? []) as unknown as Execucao[]);
      setConfig((cfgRes.data ?? null) as Config | null);
      setLoading(false);
    }
    load();
  }, []);

  const ativos    = agentes.filter(a => a.status === 'ativo').length;
  const pausados  = agentes.filter(a => a.status === 'pausado').length;
  const urgentes  = solicitacoes.filter(s => s.prioridade === 'URGENTE').length;
  const exOk      = execucoes.filter(e => e.status === 'CONCLUIDO').length;

  return (
    <div className="p-6 space-y-6 max-w-screen-xl">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-2 h-2 rounded-full ${config?.ia_ativa !== false ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            <span className={`text-xs font-semibold uppercase tracking-wider ${config?.ia_ativa !== false ? 'text-emerald-400' : 'text-slate-500'}`}>
              {config?.ia_ativa !== false ? 'IA Operacional' : 'IA Desativada'}
              {config?.modo_autonomia ? ` — Modo ${config.modo_autonomia}` : ''}
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-100">Quartel General IA</h1>
          <p className="text-sm text-slate-400 mt-0.5">Visão geral dos agentes e atividade em tempo real</p>
        </div>
        <button
          onClick={() => onNavigate?.('agentes')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-colors shadow-lg shadow-violet-900/30"
        >
          <Plus className="w-4 h-4" /> Novo Agente
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Agentes Ativos',    value: loading ? '…' : String(ativos),            sub: `${pausados} pausados`,            icon: Bot,          color: 'text-violet-400', bg: 'bg-violet-500/10' },
          { label: 'Solicitações',      value: loading ? '…' : String(solicitacoes.length),sub: urgentes > 0 ? `${urgentes} urgentes 🔴` : 'nenhuma urgente', icon: MessageSquare, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Execuções Recentes',value: loading ? '…' : String(execucoes.length),  sub: `${exOk} concluídas`,              icon: Activity,     color: 'text-blue-400',   bg: 'bg-blue-500/10'   },
          { label: 'Total de Agentes',  value: loading ? '…' : String(agentes.length),    sub: 'criados na empresa',              icon: BrainCircuit, color: 'text-emerald-400',bg: 'bg-emerald-500/10'},
        ].map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-start gap-3">
            <div className={`p-2.5 rounded-xl ${s.bg}`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
            <div>
              <p className="text-2xl font-black text-slate-100">{s.value}</p>
              <p className="text-xs font-semibold text-slate-400">{s.label}</p>
              <p className="text-xs text-slate-600 mt-0.5">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Agentes grid */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-violet-400" />
              <span className="font-bold text-slate-200 text-sm">Agentes</span>
            </div>
            <button onClick={() => onNavigate?.('agentes')}
              className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 font-semibold">
              Gerenciar <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-600 text-sm">Carregando agentes…</div>
          ) : agentes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <Bot className="w-10 h-10 text-slate-700" />
              <p className="text-slate-500 text-sm">Nenhum agente criado ainda</p>
              <button onClick={() => onNavigate?.('agentes')}
                className="text-xs text-violet-400 font-semibold hover:text-violet-300">
                + Criar primeiro agente
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {agentes.map(ag => {
                const st = STATUS_MAP[ag.status] ?? STATUS_MAP.rascunho;
                return (
                  <div key={ag.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-800/30 transition-colors">
                    <div className="text-2xl shrink-0">{ag.avatar_emoji || '🤖'}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-200 text-sm">{ag.nome}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${TIPO_MAP[ag.tipo] ?? 'bg-slate-700 text-slate-400'}`}>{ag.tipo}</span>
                        {ag.modelo_versao && <span className="text-xs bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">{ag.modelo_versao}</span>}
                      </div>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{ag.funcao}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className={`w-2 h-2 rounded-full ${st.dot}`} />
                      <span className={`text-xs font-semibold ${st.text}`}>{st.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Painel lateral */}
        <div className="space-y-4">

          {/* Solicitações pendentes */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-slate-200 text-sm">Solicitações Pendentes</span>
                {solicitacoes.length > 0 && (
                  <span className="px-1.5 py-0.5 bg-amber-500 text-white text-xs font-black rounded-full">{solicitacoes.length}</span>
                )}
              </div>
              <button onClick={() => onNavigate?.('solicitacoes')}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1">
                Ver todas <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            {loading ? (
              <div className="py-8 text-center text-slate-600 text-xs">Carregando…</div>
            ) : solicitacoes.length === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500/30 mx-auto mb-2" />
                <p className="text-xs text-slate-600">Nenhuma solicitação pendente</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {solicitacoes.map(s => (
                  <button key={s.id} onClick={() => onNavigate?.('solicitacoes')}
                    className="w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-slate-800/30 transition-colors">
                    <span className="text-lg shrink-0">{(s.agente as any)?.avatar_emoji || '🤖'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-200 truncate">{s.titulo}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-500">{(s.agente as any)?.nome}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full border font-semibold ${PRIORIDADE_MAP[s.prioridade] ?? ''}`}>{s.prioridade}</span>
                      </div>
                    </div>
                    <span className="text-xs text-slate-600 shrink-0">{timeAgo(s.created_at)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Acesso rápido */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <p className="font-bold text-slate-200 text-sm mb-3">Acesso Rápido</p>
            <div className="space-y-1.5">
              {[
                { icon: Radio,         label: 'Histórico de Execuções', id: 'historico'    },
                { icon: ShieldCheck, label: 'Permissões Globais',    id: 'permissoes'    },
                { icon: Sparkles,     label: 'Configurações da IA',   id: 'configuracoes' },
              ].map(item => (
                <button key={item.id} onClick={() => onNavigate?.(item.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 transition-colors group">
                  <item.icon className="w-4 h-4 text-slate-400 group-hover:text-violet-400 transition-colors" />
                  <span className="text-sm text-slate-300 flex-1 text-left">{item.label}</span>
                  <ArrowUpRight className="w-3 h-3 text-slate-600 group-hover:text-slate-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Execuções recentes */}
      {execucoes.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-violet-400" />
              <span className="font-bold text-slate-200 text-sm">Execuções Recentes em Background</span>
            </div>
            <button onClick={() => onNavigate?.('historico')}
              className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 font-semibold">
              Ver histórico <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-slate-800/60">
            {execucoes.map(exec => (
              <div key={exec.id} className="flex items-start gap-4 px-5 py-3.5">
                <div className="text-xl shrink-0">{(exec.agente as any)?.avatar_emoji || '🤖'}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-slate-300">{(exec.agente as any)?.nome}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      exec.status === 'CONCLUIDO' ? 'bg-emerald-500/10 text-emerald-400' :
                      exec.status === 'EM_EXECUCAO' ? 'bg-blue-500/10 text-blue-400' :
                      exec.status === 'FALHOU' ? 'bg-red-500/10 text-red-400' : 'bg-slate-700 text-slate-400'
                    }`}>{exec.status}</span>
                    <span className="text-xs text-slate-600">{timeAgo(exec.iniciado_em)}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{exec.resumo || '—'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

