// ─────────────────────────────────────────────────────────────────────────────
// Dashboard — Quartel General IA
// Visão geral de todos os agentes, tarefas e atividade em tempo real
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import {
  Bot, Cpu, CheckCircle2, AlertTriangle, Zap, TrendingUp,
  MessageSquare, ShieldCheck, Activity, ChevronRight,
  Sparkles, BrainCircuit, BarChart3, ArrowUpRight, Radio,
} from 'lucide-react';

// ── Mock data ─────────────────────────────────────────────────────────────────

const STATS = [
  { label: 'Agentes Ativos',     value: '4',    sub: 'de 7 criados',     icon: Bot,          color: 'text-violet-400', bg: 'bg-violet-500/10' },
  { label: 'Tarefas em Curso',   value: '12',   sub: '+3 desde ontem',   icon: Activity,     color: 'text-blue-400',   bg: 'bg-blue-500/10'   },
  { label: 'Concluídas Hoje',    value: '38',   sub: '94% taxa sucesso',  icon: CheckCircle2, color: 'text-emerald-400',bg: 'bg-emerald-500/10'},
  { label: 'Solicitações Abertas',value: '5',   sub: '2 urgentes',        icon: MessageSquare,color: 'text-amber-400',  bg: 'bg-amber-500/10'  },
];

const AGENTS = [
  { id: 1, name: 'ZIA Sales Monitor',  role: 'Monitora pipeline CRM e alerta sobre negociações paradas', status: 'working', model: 'Gemini 3.1 Flash', task: 'Analisando 23 deals ativos', updated: '2 min atrás',   avatar: '🤖' },
  { id: 2, name: 'HR Compliance Bot',   role: 'Verifica conformidade de folha, ponto e benefícios',       status: 'working', model: 'Gemini 3.1 Flash', task: 'Processando folha de março',  updated: '5 min atrás',   avatar: '🧑‍💼' },
  { id: 3, name: 'Fiscal Watcher',      role: 'Monitora obrigações fiscais e vencimentos de guias',       status: 'idle',    model: 'Gemini 3.1 Pro',   task: 'Aguardando próxima janela',  updated: '1h atrás',      avatar: '📊' },
  { id: 4, name: 'Doc Summarizer',      role: 'Resume e classifica documentos enviados ao módulo Docs',  status: 'working', model: 'Gemini 3.1 Flash', task: 'Resumindo 4 contratos',      updated: '8 min atrás',   avatar: '📄' },
  { id: 5, name: 'Stock Alert Agent',   role: 'Alerta sobre rupturas de estoque e reposição necessária', status: 'idle',    model: 'Gemini 3.1 Flash', task: 'Aguardando gatilho',         updated: '3h atrás',      avatar: '📦' },
  { id: 6, name: 'Quality Inspector',   role: 'Analisa não-conformidades e sugere ações corretivas',      status: 'paused',  model: 'Gemini 3.1 Flash', task: 'Pausado manualmente',        updated: '2h atrás',      avatar: '🔍' },
  { id: 7, name: 'ZIA General',         role: 'Agente coordenador — aciona outros agentes sob demanda',  status: 'working', model: 'Gemini 3.1 Pro',   task: 'Coordenando 3 sub-agentes',  updated: 'Agora',         avatar: '✨' },
];

const ACTIVITY_LOG = [
  { time: '14:32', agent: 'ZIA Sales Monitor',  type: 'alert',   msg: 'Deal "Grupo Itamaraty" parado há 7 dias — notificação enviada a Carlos Lima' },
  { time: '14:28', agent: 'HR Compliance Bot',   type: 'action',  msg: 'Detectou 3 colaboradores com banco de horas negativo — criou solicitação #47' },
  { time: '14:15', agent: 'Doc Summarizer',      type: 'done',    msg: 'Resumo de contrato "Fornecedor XYZ" gerado e arquivado no módulo Docs' },
  { time: '13:58', agent: 'ZIA General',         type: 'action',  msg: 'Acionou Fiscal Watcher — DARF com vencimento em 2 dias detectado' },
  { time: '13:40', agent: 'Stock Alert Agent',   type: 'alert',   msg: 'Produto SKU-4421 abaixo do estoque mínimo — solicitação de compra gerada' },
  { time: '13:12', agent: 'HR Compliance Bot',   type: 'done',    msg: 'Validação de horas extras da semana concluída — nenhuma inconsistência' },
  { time: '12:55', agent: 'ZIA Sales Monitor',  type: 'done',    msg: 'Relatório semanal de pipeline enviado para o gestor' },
];

const STATUS_MAP = {
  working: { label: 'Trabalhando', dot: 'bg-emerald-400 animate-pulse', text: 'text-emerald-400' },
  idle:    { label: 'Ocioso',      dot: 'bg-slate-500',                  text: 'text-slate-400'   },
  paused:  { label: 'Pausado',     dot: 'bg-amber-400',                  text: 'text-amber-400'   },
  error:   { label: 'Erro',        dot: 'bg-red-400',                    text: 'text-red-400'     },
};

const LOG_TYPE_MAP = {
  alert:  { icon: AlertTriangle, color: 'text-amber-400',   bg: 'bg-amber-500/10'   },
  action: { icon: Zap,           color: 'text-blue-400',    bg: 'bg-blue-500/10'    },
  done:   { icon: CheckCircle2,  color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function Dashboard({ onNavigate }: { onNavigate?: (id: string) => void }) {
  const [logFilter, setLogFilter] = useState<'all' | 'alert' | 'action' | 'done'>('all');

  const filteredLog = logFilter === 'all' ? ACTIVITY_LOG : ACTIVITY_LOG.filter(l => l.type === logFilter);

  return (
    <div className="p-6 space-y-6 max-w-screen-xl">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Sistema IA Operacional</span>
          </div>
          <h1 className="text-2xl font-black text-slate-100">Quartel General IA</h1>
          <p className="text-sm text-slate-400 mt-0.5">Visão geral de todos os agentes e atividade em tempo real</p>
        </div>
        <button
          onClick={() => onNavigate?.('agent-builder')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-colors shadow-lg shadow-violet-900/30"
        >
          <Sparkles className="w-4 h-4" />
          Novo Agente
        </button>
      </div>

      {/* ── Stats ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-start gap-3">
            <div className={`p-2.5 rounded-xl ${s.bg}`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-100">{s.value}</p>
              <p className="text-xs font-semibold text-slate-400">{s.label}</p>
              <p className="text-xs text-slate-600 mt-0.5">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Agents grid ─────────────────────────────────────────────── */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-violet-400" />
              <span className="font-bold text-slate-200 text-sm">Agentes</span>
            </div>
            <button
              onClick={() => onNavigate?.('agents')}
              className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 font-semibold"
            >
              Ver todos <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-slate-800/60">
            {AGENTS.map(agent => {
              const st = STATUS_MAP[agent.status as keyof typeof STATUS_MAP];
              return (
                <div key={agent.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-800/30 transition-colors group">
                  <div className="text-2xl shrink-0">{agent.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200 text-sm truncate">{agent.name}</span>
                      <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full shrink-0">{agent.model}</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{agent.task}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className={`w-2 h-2 rounded-full ${st.dot}`} />
                    <span className={`text-xs font-semibold ${st.text}`}>{st.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Sidebar widgets ──────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Token usage mini chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-violet-400" />
              <span className="font-bold text-slate-200 text-sm">Uso de Tokens Hoje</span>
            </div>
            <div className="space-y-2.5">
              {[
                { label: 'Gemini 3.1 Flash', used: 68, color: 'bg-violet-500' },
                { label: 'Gemini 3.1 Pro',   used: 24, color: 'bg-blue-500'   },
                { label: 'Gemini Flash Lite', used: 8,  color: 'bg-emerald-500'},
              ].map(m => (
                <div key={m.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">{m.label}</span>
                    <span className="text-slate-300 font-semibold">{m.used}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full ${m.color} rounded-full`} style={{ width: `${m.used}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between text-xs">
              <span className="text-slate-500">Total hoje</span>
              <span className="text-slate-300 font-bold">1.2M tokens</span>
            </div>
          </div>

          {/* Quick access */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <p className="font-bold text-slate-200 text-sm mb-3">Acesso Rápido</p>
            <div className="space-y-2">
              {[
                { icon: MessageSquare, label: '5 Solicitações Abertas', id: 'requests', badge: '5', badgeColor: 'bg-amber-500' },
                { icon: ShieldCheck,   label: 'Permissões do Sistema',   id: 'permissions', badge: null, badgeColor: '' },
                { icon: Radio,         label: 'Monitor de Tarefas',      id: 'monitor',     badge: '12', badgeColor: 'bg-blue-500' },
                { icon: Cpu,           label: 'Configurar Modelos',      id: 'models',      badge: null, badgeColor: '' },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => onNavigate?.(item.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800 transition-colors text-left group"
                >
                  <item.icon className="w-4 h-4 text-slate-400 group-hover:text-violet-400 transition-colors" />
                  <span className="text-sm text-slate-300 flex-1">{item.label}</span>
                  {item.badge && (
                    <span className={`text-xs text-white px-1.5 py-0.5 rounded-full font-bold ${item.badgeColor}`}>{item.badge}</span>
                  )}
                  <ArrowUpRight className="w-3 h-3 text-slate-600 group-hover:text-slate-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Activity Log ────────────────────────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-violet-400" />
            <span className="font-bold text-slate-200 text-sm">Log de Atividade</span>
          </div>
          <div className="flex gap-1.5">
            {(['all', 'alert', 'action', 'done'] as const).map(f => (
              <button
                key={f}
                onClick={() => setLogFilter(f)}
                className={`text-xs px-3 py-1 rounded-full font-semibold transition-colors ${
                  logFilter === f
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {f === 'all' ? 'Todos' : f === 'alert' ? 'Alertas' : f === 'action' ? 'Ações' : 'Concluídos'}
              </button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-slate-800/60">
          {filteredLog.map((entry, i) => {
            const t = LOG_TYPE_MAP[entry.type as keyof typeof LOG_TYPE_MAP];
            const Icon = t.icon;
            return (
              <div key={i} className="flex items-start gap-4 px-5 py-3.5">
                <div className={`p-1.5 rounded-lg ${t.bg} shrink-0 mt-0.5`}>
                  <Icon className={`w-3.5 h-3.5 ${t.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-slate-300">{entry.agent}</span>
                    <span className="text-xs text-slate-600">{entry.time}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{entry.msg}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
