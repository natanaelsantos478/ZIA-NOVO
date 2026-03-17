// ─────────────────────────────────────────────────────────────────────────────
// Agents — Gestão de Agentes IA
// Lista, cria, edita e gerencia agentes com funções específicas
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import {
  Bot, Plus, Search, Play, Pause, Trash2, Edit3, ChevronDown,
  Cpu, MoreVertical, Eye,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Agent {
  id: number;
  name: string;
  avatar: string;
  role: string;
  model: string;
  status: 'working' | 'idle' | 'paused' | 'error';
  permissions: string[];
  triggers: string;
  callGeneral: boolean;
  tasksToday: number;
  successRate: number;
  lastSeen: string;
  createdAt: string;
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const INITIAL_AGENTS: Agent[] = [
  {
    id: 1,
    name: 'ZIA Sales Monitor',
    avatar: '🤖',
    role: 'Monitora o pipeline de vendas do CRM. Identifica deals parados há mais de X dias e envia alertas para os responsáveis. Gera relatórios semanais automaticamente.',
    model: 'gemini-3.1-flash-lite-preview',
    status: 'working',
    permissions: ['crm.read', 'hr.read'],
    triggers: 'A cada 6 horas ou quando um deal não é atualizado há 7+ dias',
    callGeneral: true,
    tasksToday: 8,
    successRate: 98,
    lastSeen: '2 min atrás',
    createdAt: '10/01/2026',
  },
  {
    id: 2,
    name: 'HR Compliance Bot',
    avatar: '🧑‍💼',
    role: 'Verifica conformidade de folha de pagamento, banco de horas e benefícios. Detecta inconsistências e cria solicitações automáticas para o gestor de RH.',
    model: 'gemini-3.1-flash-lite-preview',
    status: 'working',
    permissions: ['hr.read', 'hr.write'],
    triggers: 'Diariamente às 07h e ao receber novos dados de ponto',
    callGeneral: false,
    tasksToday: 14,
    successRate: 95,
    lastSeen: '5 min atrás',
    createdAt: '15/01/2026',
  },
  {
    id: 3,
    name: 'Fiscal Watcher',
    avatar: '📊',
    role: 'Monitora vencimentos de guias fiscais (DARF, GPS, ISS, ICMS). Alerta com antecedência de 5, 3 e 1 dia. Consulta automaticamente o calendário da Receita Federal.',
    model: 'gemini-3.1-pro-preview',
    status: 'idle',
    permissions: ['erp.read'],
    triggers: 'Diariamente às 08h',
    callGeneral: true,
    tasksToday: 2,
    successRate: 100,
    lastSeen: '1h atrás',
    createdAt: '20/01/2026',
  },
  {
    id: 4,
    name: 'Doc Summarizer',
    avatar: '📄',
    role: 'Resume e classifica automaticamente documentos enviados ao módulo Docs. Extrai partes relevantes de contratos, atas e laudos.',
    model: 'gemini-3.1-flash-lite-preview',
    status: 'working',
    permissions: ['docs.read', 'docs.write'],
    triggers: 'Toda vez que um novo documento é carregado',
    callGeneral: false,
    tasksToday: 7,
    successRate: 91,
    lastSeen: '8 min atrás',
    createdAt: '02/02/2026',
  },
  {
    id: 5,
    name: 'Stock Alert Agent',
    avatar: '📦',
    role: 'Monitora níveis de estoque e alerta quando produtos atingem o ponto de reposição. Gera automaticamente requisições de compra quando necessário.',
    model: 'gemini-3.1-flash-lite-preview',
    status: 'idle',
    permissions: ['scm.read', 'erp.read'],
    triggers: 'A cada 4 horas ou quando uma movimentação de saída é registrada',
    callGeneral: false,
    tasksToday: 3,
    successRate: 97,
    lastSeen: '3h atrás',
    createdAt: '10/02/2026',
  },
  {
    id: 6,
    name: 'Quality Inspector',
    avatar: '🔍',
    role: 'Analisa registros de não-conformidades e sugere ações corretivas baseadas em histórico. Conecta padrões de falhas recorrentes.',
    model: 'gemini-3.1-flash-lite-preview',
    status: 'paused',
    permissions: ['quality.read', 'quality.write'],
    triggers: 'A cada nova NC registrada',
    callGeneral: true,
    tasksToday: 0,
    successRate: 88,
    lastSeen: '2h atrás',
    createdAt: '18/02/2026',
  },
  {
    id: 7,
    name: 'ZIA General',
    avatar: '✨',
    role: 'Agente coordenador central. Monitora todos os outros agentes, aciona sub-agentes com base em gatilhos contextuais e sintetiza informações para o gestor.',
    model: 'gemini-3.1-pro-preview',
    status: 'working',
    permissions: ['crm.read', 'hr.read', 'erp.read', 'scm.read', 'docs.read', 'quality.read'],
    triggers: 'Contínuo — sempre ativo',
    callGeneral: false,
    tasksToday: 4,
    successRate: 96,
    lastSeen: 'Agora',
    createdAt: '01/01/2026',
  },
];

const MODEL_LABELS: Record<string, string> = {
  'gemini-3.1-flash-lite-preview': 'Flash Lite',
  'gemini-3.1-flash-preview':      'Flash',
  'gemini-3.1-pro-preview':        'Pro',
};

const STATUS_MAP = {
  working: { label: 'Trabalhando', dot: 'bg-emerald-400 animate-pulse', text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  idle:    { label: 'Ocioso',      dot: 'bg-slate-500',                  text: 'text-slate-400',   bg: 'bg-slate-700/40'   },
  paused:  { label: 'Pausado',     dot: 'bg-amber-400',                  text: 'text-amber-400',   bg: 'bg-amber-500/10'   },
  error:   { label: 'Erro',        dot: 'bg-red-400',                    text: 'text-red-400',     bg: 'bg-red-500/10'     },
};

const PERMISSION_LABELS: Record<string, string> = {
  'crm.read': 'CRM Leitura', 'crm.write': 'CRM Escrita',
  'hr.read':  'RH Leitura',  'hr.write':  'RH Escrita',
  'erp.read': 'ERP Leitura', 'erp.write': 'ERP Escrita',
  'scm.read': 'SCM Leitura', 'scm.write': 'SCM Escrita',
  'docs.read':'Docs Leitura','docs.write':'Docs Escrita',
  'quality.read': 'Qualidade Leitura', 'quality.write': 'Qualidade Escrita',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function Agents({ onNavigate }: { onNavigate?: (id: string) => void }) {
  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'working' | 'idle' | 'paused'>('all');
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [menuId, setMenuId] = useState<number | null>(null);

  const filtered = agents.filter(a => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) ||
                        a.role.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || a.status === filter;
    return matchSearch && matchFilter;
  });

  const toggleStatus = (id: number) => {
    setAgents(prev => prev.map(a =>
      a.id === id
        ? { ...a, status: a.status === 'working' ? 'paused' : a.status === 'paused' ? 'working' : a.status }
        : a
    ));
    setMenuId(null);
  };

  const deleteAgent = (id: number) => {
    setAgents(prev => prev.filter(a => a.id !== id));
    setMenuId(null);
  };

  return (
    <div className="p-6 space-y-6 max-w-screen-xl">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-100">Meus Agentes</h1>
          <p className="text-sm text-slate-400 mt-0.5">{agents.length} agentes criados • {agents.filter(a => a.status === 'working').length} ativos agora</p>
        </div>
        <button
          onClick={() => onNavigate?.('agent-builder')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-colors shadow-lg shadow-violet-900/30"
        >
          <Plus className="w-4 h-4" />
          Criar Agente
        </button>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar agente..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30"
          />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'working', 'idle', 'paused'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-2 rounded-xl font-semibold transition-colors ${
                filter === f
                  ? 'bg-violet-600 text-white'
                  : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {f === 'all' ? 'Todos' : f === 'working' ? 'Ativos' : f === 'idle' ? 'Ociosos' : 'Pausados'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Agent list ──────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {filtered.map(agent => {
          const st = STATUS_MAP[agent.status];
          const isExpanded = expandedId === agent.id;

          return (
            <div key={agent.id} className={`bg-slate-900 border rounded-2xl overflow-hidden transition-all ${isExpanded ? 'border-violet-600/40' : 'border-slate-800'}`}>

              {/* Row principal */}
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="text-3xl shrink-0">{agent.avatar}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-100">{agent.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${st.bg} ${st.text}`}>
                      {st.label}
                    </span>
                    {agent.callGeneral && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 font-semibold">
                        ↑ Aciona ZIA General
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 mt-0.5 truncate">{agent.role}</p>
                </div>

                {/* Stats */}
                <div className="hidden lg:flex items-center gap-6 shrink-0">
                  <div className="text-center">
                    <p className="text-lg font-black text-slate-100">{agent.tasksToday}</p>
                    <p className="text-xs text-slate-500">tarefas hoje</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-black text-emerald-400">{agent.successRate}%</p>
                    <p className="text-xs text-slate-500">sucesso</p>
                  </div>
                  <div className="text-center min-w-[90px]">
                    <p className="text-xs font-semibold text-slate-300">{MODEL_LABELS[agent.model] ?? agent.model}</p>
                    <p className="text-xs text-slate-500">modelo</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : agent.id)}
                    className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setMenuId(menuId === agent.id ? null : agent.id)}
                      className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {menuId === agent.id && (
                      <div className="absolute right-0 top-10 z-30 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-44 overflow-hidden">
                        <button
                          onClick={() => { setExpandedId(agent.id); setMenuId(null); }}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700"
                        >
                          <Eye className="w-3.5 h-3.5" /> Ver detalhes
                        </button>
                        <button
                          onClick={() => toggleStatus(agent.id)}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-700"
                        >
                          {agent.status === 'working' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                          {agent.status === 'working' ? 'Pausar' : 'Ativar'}
                        </button>
                        <button
                          onClick={() => deleteAgent(agent.id)}
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-900/20"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Excluir
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded details */}
              {isExpanded && (
                <div className="border-t border-slate-800 px-5 py-4 bg-slate-900/50 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Função completa</p>
                      <p className="text-sm text-slate-300 leading-relaxed">{agent.role}</p>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Gatilho</p>
                        <p className="text-sm text-slate-300">{agent.triggers}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Modelo</p>
                        <div className="flex items-center gap-2">
                          <Cpu className="w-3.5 h-3.5 text-violet-400" />
                          <span className="text-sm text-slate-300 font-mono">{agent.model}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Permissões</p>
                        <div className="flex flex-wrap gap-1.5">
                          {agent.permissions.map(p => (
                            <span key={p} className="text-xs bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded-lg">
                              {PERMISSION_LABELS[p] ?? p}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors">
                      <Edit3 className="w-3.5 h-3.5" /> Editar configurações
                    </button>
                    <button
                      onClick={() => toggleStatus(agent.id)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                    >
                      {agent.status === 'working' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      {agent.status === 'working' ? 'Pausar agente' : 'Ativar agente'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Bot className="w-12 h-12 text-slate-700 mb-4" />
            <p className="text-slate-400 font-semibold">Nenhum agente encontrado</p>
            <p className="text-sm text-slate-600 mt-1">Tente outro filtro ou crie um novo agente</p>
            <button
              onClick={() => onNavigate?.('agent-builder')}
              className="mt-4 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-colors"
            >
              Criar primeiro agente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
