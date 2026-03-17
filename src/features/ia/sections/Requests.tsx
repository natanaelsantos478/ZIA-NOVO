// ─────────────────────────────────────────────────────────────────────────────
// Requests — Solicitações da IA para o Gestor
// Inbox de pedidos dos agentes que precisam de aprovação ou decisão humana
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import {
  MessageSquare, CheckCircle2, XCircle, Clock,
  ChevronDown, Send, Zap, DollarSign, ShieldCheck,
  Database, UserCheck,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Request {
  id: number;
  agent: string;
  avatar: string;
  type: 'permission' | 'budget' | 'decision' | 'data' | 'action';
  priority: 'urgent' | 'high' | 'normal' | 'low';
  title: string;
  description: string;
  context: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'answered';
  managerReply?: string;
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const INITIAL_REQUESTS: Request[] = [
  {
    id: 1,
    agent: 'ZIA Sales Monitor',
    avatar: '🤖',
    type: 'decision',
    priority: 'urgent',
    title: 'Deal "Grupo Itamaraty" — acionar proposta de retenção?',
    description: 'O deal está parado há 12 dias sem interação. Detectei que o cliente visitou nossa página de preços 3 vezes esta semana. Posso enviar automaticamente uma proposta de retenção com 10% de desconto?',
    context: 'Histórico: deal no valor de R$48.000/ano, cliente há 3 anos, LTV estimado R$180.000. O desconto representaria R$4.800 por ano mas evita churn.',
    createdAt: 'Há 15 minutos',
    status: 'pending',
  },
  {
    id: 2,
    agent: 'HR Compliance Bot',
    avatar: '🧑‍💼',
    type: 'action',
    priority: 'urgent',
    title: 'Autorizar envio de alerta de banco de horas negativo',
    description: '3 colaboradores estão com banco de horas negativo há mais de 30 dias: Ana Silva (-12h), Pedro Costa (-8h), Mariana Luz (-6h). Posso enviar e-mail automático para os gestores diretos solicitando regularização?',
    context: 'Conforme política interna (RH-07), banco de horas negativo por mais de 30 dias exige notificação formal. Preciso de aprovação para enviar e-mail externo.',
    createdAt: 'Há 32 minutos',
    status: 'pending',
  },
  {
    id: 3,
    agent: 'Fiscal Watcher',
    avatar: '📊',
    type: 'permission',
    priority: 'high',
    title: 'Solicitar acesso de leitura ao extrato bancário',
    description: 'Para calcular o DARF do mês corretamente, preciso comparar o DRE com os extratos bancários. Atualmente só tenho acesso ao módulo ERP. Solicito permissão temporária de leitura para a conta corrente Bradesco *8291.',
    context: 'O DARF vence em 3 dias. Sem os dados do extrato, o cálculo pode ter margem de erro de ±15%. O acesso seria apenas de leitura e por 48 horas.',
    createdAt: 'Há 1 hora',
    status: 'pending',
  },
  {
    id: 4,
    agent: 'Stock Alert Agent',
    avatar: '📦',
    type: 'budget',
    priority: 'high',
    title: 'Criar PO automático — SKU-4421 abaixo do mínimo',
    description: 'O produto "Parafuso Inox M6 (SKU-4421)" atingiu 45 unidades em estoque, abaixo do mínimo de 200. Já identifiquei o melhor fornecedor (Metalúrgica ABC, cotação vigente R$0,85/un). Posso criar um pedido de compra de 500 unidades (R$425,00)?',
    context: 'Prazo de entrega do fornecedor: 5 dias úteis. Consumo médio: 40 un/semana. Sem reposição, haverá ruptura em ~8 dias úteis.',
    createdAt: 'Há 2 horas',
    status: 'pending',
  },
  {
    id: 5,
    agent: 'Doc Summarizer',
    avatar: '📄',
    type: 'data',
    priority: 'normal',
    title: 'Contrato "Fornecedor XYZ" precisa de cláusula de multa identificada',
    description: 'Ao resumir o contrato, identifiquei uma cláusula de multa por rescisão (§14.3) que pode ser relevante. O valor da multa é de 3 salários mensais do contrato. Devo destacar isso no resumo e notificar o jurídico?',
    context: 'Contrato vigente, valor mensal R$12.500. Multa por rescisão imotivada: R$37.500. A validade atual vai até 31/12/2026.',
    createdAt: 'Há 3 horas',
    status: 'approved',
    managerReply: 'Sim, destaque no resumo e crie uma tarefa no módulo Docs para revisão jurídica até sexta-feira.',
  },
  {
    id: 6,
    agent: 'Quality Inspector',
    avatar: '🔍',
    type: 'action',
    priority: 'normal',
    title: 'Abrir NC recorrente — Linha de Produção 2',
    description: 'Detectei padrão de 4 NCs nas últimas 3 semanas na Linha 2, todas relacionadas a calibração de temperatura. Isso configura NC sistêmica (critério: 3+ NCs do mesmo tipo em 30 dias). Devo abrir a NC recorrente automaticamente?',
    context: 'NCs anteriores: #NC-089, #NC-094, #NC-098, #NC-102. Causa raiz provável: sensor de temperatura com drift. Ação sugerida: manutenção preventiva com urgência.',
    createdAt: 'Há 5 horas',
    status: 'pending',
  },
  {
    id: 7,
    agent: 'ZIA General',
    avatar: '✨',
    type: 'decision',
    priority: 'low',
    title: 'Agendamento de relatório consolidado mensal',
    description: 'O mês de março está encerrando em 14 dias. Devo começar a consolidar os relatórios de todos os módulos para o relatório executivo mensal? Qual formato prefere: PDF resumido ou dashboard interativo?',
    context: 'Último relatório foi gerado em 28/02/2026. O processo leva aproximadamente 40 minutos de processamento.',
    createdAt: 'Há 1 dia',
    status: 'rejected',
    managerReply: 'Não ainda. Agende para 3 dias antes do fechamento do mês.',
  },
];

const TYPE_MAP = {
  permission: { icon: ShieldCheck, label: 'Permissão',  color: 'text-violet-400',   bg: 'bg-violet-500/10'  },
  budget:     { icon: DollarSign,  label: 'Orçamento',  color: 'text-emerald-400',  bg: 'bg-emerald-500/10' },
  decision:   { icon: UserCheck,   label: 'Decisão',    color: 'text-blue-400',     bg: 'bg-blue-500/10'    },
  data:       { icon: Database,    label: 'Dados',      color: 'text-amber-400',    bg: 'bg-amber-500/10'   },
  action:     { icon: Zap,         label: 'Ação',       color: 'text-pink-400',     bg: 'bg-pink-500/10'    },
};

const PRIORITY_MAP = {
  urgent: { label: 'Urgente', color: 'bg-red-500/20 text-red-400 border-red-500/30'    },
  high:   { label: 'Alta',    color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  normal: { label: 'Normal',  color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  low:    { label: 'Baixa',   color: 'bg-slate-700/60 text-slate-400 border-slate-600'  },
};

const STATUS_MAP = {
  pending:  { label: 'Aguardando', color: 'text-amber-400',   icon: Clock        },
  approved: { label: 'Aprovado',   color: 'text-emerald-400', icon: CheckCircle2 },
  rejected: { label: 'Rejeitado',  color: 'text-red-400',     icon: XCircle      },
  answered: { label: 'Respondido', color: 'text-blue-400',    icon: MessageSquare},
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function Requests() {
  const [requests, setRequests] = useState<Request[]>(INITIAL_REQUESTS);
  const [expanded, setExpanded] = useState<number | null>(1);
  const [replyText, setReplyText] = useState<Record<number, string>>({});
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const filtered = filter === 'all' ? requests : requests.filter(r => r.status === filter);
  const pending = requests.filter(r => r.status === 'pending').length;

  const handleApprove = (id: number) => {
    setRequests(prev => prev.map(r =>
      r.id !== id ? r : { ...r, status: 'approved', managerReply: replyText[id] || 'Aprovado.' }
    ));
  };

  const handleReject = (id: number) => {
    setRequests(prev => prev.map(r =>
      r.id !== id ? r : { ...r, status: 'rejected', managerReply: replyText[id] || 'Solicitação negada.' }
    ));
  };

  return (
    <div className="p-6 space-y-6 max-w-screen-lg">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-black text-slate-100">Solicitações da IA</h1>
            {pending > 0 && (
              <span className="px-2 py-0.5 bg-amber-500 text-white text-xs font-black rounded-full">{pending}</span>
            )}
          </div>
          <p className="text-sm text-slate-400">Pedidos dos agentes que precisam da sua decisão ou aprovação</p>
        </div>
      </div>

      {/* ── Filter tabs ─────────────────────────────────────────────────── */}
      <div className="flex gap-2">
        {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-2 rounded-xl font-semibold transition-colors ${
              filter === f
                ? 'bg-violet-600 text-white'
                : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            {f === 'all' ? `Todas (${requests.length})` :
             f === 'pending' ? `Pendentes (${pending})` :
             f === 'approved' ? 'Aprovadas' : 'Rejeitadas'}
          </button>
        ))}
      </div>

      {/* ── Requests list ───────────────────────────────────────────────── */}
      <div className="space-y-3">
        {filtered.map(req => {
          const typeInfo = TYPE_MAP[req.type];
          const TypeIcon = typeInfo.icon;
          const priorityInfo = PRIORITY_MAP[req.priority];
          const statusInfo = STATUS_MAP[req.status];
          const StatusIcon = statusInfo.icon;
          const isExpanded = expanded === req.id;

          return (
            <div
              key={req.id}
              className={`bg-slate-900 border rounded-2xl overflow-hidden transition-all ${
                req.status === 'pending' && req.priority === 'urgent'
                  ? 'border-red-500/40'
                  : isExpanded ? 'border-violet-600/40' : 'border-slate-800'
              }`}
            >
              {/* Header row */}
              <button
                onClick={() => setExpanded(isExpanded ? null : req.id)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-800/20 transition-colors"
              >
                <div className="text-2xl shrink-0">{req.avatar}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-bold text-slate-500">{req.agent}</span>
                    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold border ${priorityInfo.color}`}>
                      {priorityInfo.label}
                    </span>
                    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold ${typeInfo.bg} ${typeInfo.color}`}>
                      <TypeIcon className="w-3 h-3" />{typeInfo.label}
                    </span>
                  </div>
                  <p className="font-semibold text-slate-200 text-sm leading-snug">{req.title}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right hidden sm:block">
                    <div className={`flex items-center gap-1 text-xs font-semibold ${statusInfo.color}`}>
                      <StatusIcon className="w-3.5 h-3.5" /> {statusInfo.label}
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">{req.createdAt}</p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-slate-800 px-5 py-5 space-y-4 bg-slate-900/50">

                  {/* Description */}
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Solicitação do Agente</p>
                    <p className="text-sm text-slate-300 leading-relaxed">{req.description}</p>
                  </div>

                  {/* Context */}
                  <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Contexto e Dados</p>
                    <p className="text-sm text-slate-400 leading-relaxed">{req.context}</p>
                  </div>

                  {/* Manager reply (if exists) */}
                  {req.managerReply && (
                    <div className={`p-3 rounded-xl border ${
                      req.status === 'approved'
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                    }`}>
                      <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${
                        req.status === 'approved' ? 'text-emerald-400' : 'text-red-400'
                      }`}>
                        Sua resposta
                      </p>
                      <p className="text-sm text-slate-300">{req.managerReply}</p>
                    </div>
                  )}

                  {/* Action area (only for pending) */}
                  {req.status === 'pending' && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                          Resposta / Instrução (opcional)
                        </label>
                        <textarea
                          value={replyText[req.id] ?? ''}
                          onChange={e => setReplyText(prev => ({ ...prev, [req.id]: e.target.value }))}
                          placeholder="Adicione instruções específicas para o agente..."
                          rows={2}
                          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500 resize-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(req.id)}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Aprovar
                        </button>
                        <button
                          onClick={() => handleReject(req.id)}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-900/60 hover:bg-red-800/80 text-red-300 text-sm font-bold transition-colors border border-red-800"
                        >
                          <XCircle className="w-4 h-4" /> Rejeitar
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors ml-auto">
                          <Send className="w-4 h-4" /> Responder sem decidir
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <MessageSquare className="w-12 h-12 text-slate-700 mb-4" />
            <p className="text-slate-400 font-semibold">Nenhuma solicitação encontrada</p>
            <p className="text-sm text-slate-600 mt-1">Os agentes irão solicitar decisões aqui quando necessário</p>
          </div>
        )}
      </div>
    </div>
  );
}
