// ─────────────────────────────────────────────────────────────────────────────
// Monitor — Tarefas em Background
// Acompanhe em tempo real o que cada agente está executando
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import {
  Pause, Square, RefreshCw, ChevronDown,
  Clock, CheckCircle2, XCircle, Loader2,
  Terminal,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Task {
  id: string;
  agent: string;
  avatar: string;
  name: string;
  status: 'running' | 'done' | 'failed' | 'queued' | 'paused';
  progress: number;
  startedAt: string;
  duration: string;
  logs: string[];
  tokensUsed: number;
  model: string;
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const INITIAL_TASKS: Task[] = [
  {
    id: 'T001',
    agent: 'ZIA Sales Monitor',
    avatar: '🤖',
    name: 'Análise de pipeline — 23 deals ativos',
    status: 'running',
    progress: 61,
    startedAt: '14:30:12',
    duration: '2m 18s',
    tokensUsed: 12400,
    model: 'Flash Lite',
    logs: [
      '14:30:12 | Iniciando análise de 23 deals ativos',
      '14:30:14 | Carregando histórico de interações — CRM',
      '14:30:18 | Processando deal #1 → #8 — Sem alertas',
      '14:30:31 | ⚠️  Deal "Grupo Itamaraty" — última interação há 12 dias',
      '14:31:02 | Processando deal #9 → #16 — 1 alerta gerado',
      '14:31:45 | Processando deal #17 → #23...',
    ],
  },
  {
    id: 'T002',
    agent: 'HR Compliance Bot',
    avatar: '🧑‍💼',
    name: 'Validação de folha de março/2026',
    status: 'running',
    progress: 78,
    startedAt: '14:28:00',
    duration: '4m 30s',
    tokensUsed: 28900,
    model: 'Flash Lite',
    logs: [
      '14:28:00 | Iniciando validação de folha — 142 colaboradores',
      '14:28:05 | Cruzando dados de ponto com folha...',
      '14:29:10 | ⚠️  Banco de horas negativo: Ana Silva (-12h), Pedro Costa (-8h)',
      '14:30:22 | Verificando benefícios — plano de saúde, vale transporte',
      '14:31:00 | 98% dos registros válidos — 3 inconsistências encontradas',
      '14:32:28 | Gerando relatório de inconsistências...',
    ],
  },
  {
    id: 'T003',
    agent: 'Doc Summarizer',
    avatar: '📄',
    name: 'Resumo de 4 contratos novos',
    status: 'running',
    progress: 25,
    startedAt: '14:34:00',
    duration: '0m 30s',
    tokensUsed: 5200,
    model: 'Flash Lite',
    logs: [
      '14:34:00 | 4 documentos na fila para processamento',
      '14:34:02 | Processando: Contrato_Fornecedor_ABC.pdf (1.2MB)',
      '14:34:18 | Extraindo cláusulas principais...',
    ],
  },
  {
    id: 'T004',
    agent: 'ZIA General',
    avatar: '✨',
    name: 'Coordenação de sub-agentes — ciclo 14:30',
    status: 'running',
    progress: 90,
    startedAt: '14:30:00',
    duration: '2m 30s',
    tokensUsed: 8100,
    model: 'Pro',
    logs: [
      '14:30:00 | Ciclo de coordenação iniciado',
      '14:30:01 | Ativando ZIA Sales Monitor — gatilho: ciclo 6h',
      '14:30:02 | Ativando HR Compliance Bot — gatilho: novo dado de ponto',
      '14:30:04 | Ativando Doc Summarizer — gatilho: novos documentos detectados (4)',
      '14:31:50 | Coletando status dos sub-agentes...',
      '14:32:22 | 3 agentes respondendo — 0 erros',
    ],
  },
  {
    id: 'T005',
    agent: 'Fiscal Watcher',
    avatar: '📊',
    name: 'Verificação diária de vencimentos fiscais',
    status: 'done',
    progress: 100,
    startedAt: '07:00:00',
    duration: '1m 12s',
    tokensUsed: 3200,
    model: 'Pro',
    logs: [
      '07:00:00 | Verificação diária iniciada',
      '07:00:03 | Consultando calendário fiscal — Receita Federal',
      '07:00:18 | DARF IRPJ vence em 3 dias (20/03/2026) — alerta criado',
      '07:01:05 | GPS vence em 5 dias — notificação agendada',
      '07:01:12 | Verificação concluída — 2 alertas gerados',
    ],
  },
  {
    id: 'T006',
    agent: 'Quality Inspector',
    avatar: '🔍',
    name: 'Análise de NCs recorrentes — Linha 2',
    status: 'failed',
    progress: 45,
    startedAt: '12:15:00',
    duration: '0m 48s',
    tokensUsed: 1800,
    model: 'Flash Lite',
    logs: [
      '12:15:00 | Iniciando análise de padrões de NC',
      '12:15:03 | Carregando registros dos últimos 30 dias...',
      '12:15:22 | Processando NC #089, #094, #098, #102',
      '12:15:48 | ❌ Erro: Sem permissão para acessar dados de calibração (quality.read restrito)',
      '12:15:48 | Tarefa falhou — criando solicitação de permissão',
    ],
  },
  {
    id: 'T007',
    agent: 'Stock Alert Agent',
    avatar: '📦',
    name: 'Monitoramento de estoque — ciclo 10:00',
    status: 'queued',
    progress: 0,
    startedAt: '—',
    duration: '—',
    tokensUsed: 0,
    model: 'Flash Lite',
    logs: ['Aguardando na fila — agendado para 18:00'],
  },
];

const STATUS_MAP = {
  running: { label: 'Executando', icon: Loader2, iconClass: 'animate-spin text-blue-400',   bar: 'bg-blue-500', text: 'text-blue-400',    bg: 'bg-blue-500/10'   },
  done:    { label: 'Concluído',  icon: CheckCircle2, iconClass: 'text-emerald-400',        bar: 'bg-emerald-500',text: 'text-emerald-400',bg: 'bg-emerald-500/10'},
  failed:  { label: 'Falhou',     icon: XCircle,      iconClass: 'text-red-400',            bar: 'bg-red-500',   text: 'text-red-400',    bg: 'bg-red-500/10'    },
  queued:  { label: 'Na Fila',    icon: Clock,        iconClass: 'text-slate-400',          bar: 'bg-slate-600', text: 'text-slate-400',  bg: 'bg-slate-700/30'  },
  paused:  { label: 'Pausado',    icon: Pause,        iconClass: 'text-amber-400',          bar: 'bg-amber-500', text: 'text-amber-400',  bg: 'bg-amber-500/10'  },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function Monitor() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [expanded, setExpanded] = useState<string | null>('T001');
  const [filter, setFilter] = useState<'all' | 'running' | 'done' | 'failed'>('all');

  const filtered = filter === 'all' ? tasks : tasks.filter(t => t.status === filter);
  const running = tasks.filter(t => t.status === 'running').length;
  const totalTokens = tasks.reduce((s, t) => s + t.tokensUsed, 0);

  const killTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id !== id ? t : { ...t, status: 'failed', progress: t.progress }));
  };

  return (
    <div className="p-6 space-y-6 max-w-screen-xl">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-100">Monitor de Tarefas</h1>
          <p className="text-sm text-slate-400 mt-0.5">Acompanhe o que os agentes estão executando em background</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors">
          <RefreshCw className="w-4 h-4" /> Atualizar
        </button>
      </div>

      {/* ── Stats bar ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-2xl font-black text-blue-400">{running}</span>
          </div>
          <p className="text-xs font-semibold text-slate-400">Em Execução</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-2xl font-black text-emerald-400">{tasks.filter(t => t.status === 'done').length}</p>
          <p className="text-xs font-semibold text-slate-400">Concluídas Hoje</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-2xl font-black text-red-400">{tasks.filter(t => t.status === 'failed').length}</p>
          <p className="text-xs font-semibold text-slate-400">Com Falha</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-2xl font-black text-violet-400">{(totalTokens / 1000).toFixed(0)}K</p>
          <p className="text-xs font-semibold text-slate-400">Tokens Consumidos</p>
        </div>
      </div>

      {/* ── Filter ──────────────────────────────────────────────────────── */}
      <div className="flex gap-2">
        {(['all', 'running', 'done', 'failed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-2 rounded-xl font-semibold transition-colors ${
              filter === f ? 'bg-violet-600 text-white' : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            {f === 'all' ? 'Todas' : f === 'running' ? 'Executando' : f === 'done' ? 'Concluídas' : 'Falhas'}
          </button>
        ))}
      </div>

      {/* ── Task list ───────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {filtered.map(task => {
          const st = STATUS_MAP[task.status];
          const StatusIcon = st.icon;
          const isExpanded = expanded === task.id;

          return (
            <div key={task.id} className={`bg-slate-900 border rounded-2xl overflow-hidden ${isExpanded ? 'border-violet-600/40' : 'border-slate-800'}`}>

              {/* Row */}
              <button
                onClick={() => setExpanded(isExpanded ? null : task.id)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-800/20 transition-colors"
              >
                <div className="text-2xl shrink-0">{task.avatar}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-500">{task.agent}</span>
                    <span className="text-xs bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full font-mono">{task.id}</span>
                    <span className="text-xs bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">{task.model}</span>
                  </div>
                  <p className="font-semibold text-slate-200 text-sm">{task.name}</p>
                  {task.status === 'running' && (
                    <div className="mt-2">
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${st.bar} rounded-full transition-all`}
                          style={{ width: `${task.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right hidden sm:block">
                    <div className={`flex items-center gap-1.5 text-xs font-semibold ${st.text}`}>
                      <StatusIcon className={`w-3.5 h-3.5 ${st.iconClass}`} />
                      {st.label} {task.status === 'running' ? `${task.progress}%` : ''}
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{task.duration} • {task.tokensUsed.toLocaleString()} tokens</p>
                  </div>
                  {task.status === 'running' && (
                    <button
                      onClick={e => { e.stopPropagation(); killTask(task.id); }}
                      className="p-1.5 rounded-lg bg-red-900/40 hover:bg-red-800/60 text-red-400 transition-colors"
                      title="Cancelar tarefa"
                    >
                      <Square className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {/* Logs */}
              {isExpanded && (
                <div className="border-t border-slate-800 bg-slate-950/60">
                  <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-800/60">
                    <Terminal className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Log de Execução</span>
                  </div>
                  <div className="px-5 py-3 space-y-1 font-mono text-xs">
                    {task.logs.map((log, i) => (
                      <div key={i} className={`leading-relaxed ${
                        log.includes('❌') || log.includes('Erro') ? 'text-red-400' :
                        log.includes('⚠️') ? 'text-amber-400' :
                        log.includes('✓') ? 'text-emerald-400' :
                        'text-slate-400'
                      }`}>
                        {log}
                      </div>
                    ))}
                    {task.status === 'running' && (
                      <div className="flex items-center gap-1.5 text-blue-400">
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
    </div>
  );
}
