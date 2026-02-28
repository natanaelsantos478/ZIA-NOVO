import { useState } from 'react';
import { Plus, ArrowRight, Tag, Clock, CheckCircle2, MoreHorizontal, Zap } from 'lucide-react';

/* ── Types ──────────────────────────────────────────────────────────────── */

type TriggerType = 'Manual' | 'Gatilho CRM' | 'Gatilho ERP' | 'Gatilho RH' | 'Agendado';
type TaskStatus  = 'Ativa' | 'Pausada' | 'Concluída' | 'Rascunho';

interface Activity {
  id:              string;
  name:            string;
  trigger:         TriggerType;
  triggerDetail:   string;
  assignee:        string;
  department:      string;
  status:          TaskStatus;
  chainNext?:      string;
  tags:            string[];
  avgDuration:     number;   // minutes
  totalExecutions: number;
}

interface ActivityGroup {
  tag:           string;
  color:         string;
  activityCount: number;
  avgCycleTime:  string;
  lastExecution: string;
  reportReady:   boolean;
}

interface ActivityCost {
  id:            string;
  name:          string;
  laborHours:    number;
  hourlyCost:    number;
  materialCost:  number;
  logisticsCost: number;
  taxRate:       number;
  revenue:       number;
}

/* ── Mock data ──────────────────────────────────────────────────────────── */

const ACTIVITIES: Activity[] = [
  { id: 'A001', name: 'Onboarding Digital',              trigger: 'Gatilho RH',  triggerDetail: 'Admissão registrada no sistema',            assignee: 'Ana Paula Ferreira', department: 'RH',         status: 'Ativa',   chainNext: 'A002', tags: ['Admissão', 'Onboarding'], avgDuration: 480, totalExecutions: 42  },
  { id: 'A002', name: 'Criação de Conta nos Sistemas',   trigger: 'Gatilho RH',  triggerDetail: 'Conclusão do Onboarding Digital',           assignee: 'Carlos Eduardo Lima', department: 'TI',       status: 'Ativa',   chainNext: 'A003', tags: ['Admissão', 'TI'],         avgDuration: 30,  totalExecutions: 42  },
  { id: 'A003', name: 'Treinamento Inicial',             trigger: 'Gatilho RH',  triggerDetail: 'Conta nos sistemas criada',                 assignee: 'Beatriz Souza',       department: 'RH',       status: 'Ativa',   tags: ['Admissão', 'Treinamento'],              avgDuration: 960, totalExecutions: 42  },
  { id: 'A004', name: 'Follow-up de Lead Qualificado',   trigger: 'Gatilho CRM', triggerDetail: 'Lead novo com score ≥ 70 no CRM',           assignee: 'Rafael Nunes',        department: 'Comercial',status: 'Ativa',   chainNext: 'A005', tags: ['CRM', 'Vendas'],          avgDuration: 45,  totalExecutions: 218 },
  { id: 'A005', name: 'Envio de Proposta',               trigger: 'Gatilho CRM', triggerDetail: 'Follow-up concluído sem descarte',          assignee: 'Rafael Nunes',        department: 'Comercial',status: 'Ativa',   tags: ['CRM', 'Vendas'],                        avgDuration: 60,  totalExecutions: 143 },
  { id: 'A006', name: 'Revisão de Contrato Rescisório',  trigger: 'Gatilho ERP', triggerDetail: 'Solicitação de demissão registrada no ERP', assignee: 'Fernanda Oliveira',   department: 'Jurídico', status: 'Pausada', tags: ['Demissão', 'Jurídico'],                 avgDuration: 240, totalExecutions: 7   },
];

const GROUPS: ActivityGroup[] = [
  { tag: 'Admissão',    color: 'bg-blue-100 text-blue-700',      activityCount: 5, avgCycleTime: '2 dias', lastExecution: 'há 3 dias', reportReady: true  },
  { tag: 'CRM',         color: 'bg-emerald-100 text-emerald-700', activityCount: 8, avgCycleTime: '3 h',    lastExecution: 'há 2 h',    reportReady: true  },
  { tag: 'Treinamento', color: 'bg-purple-100 text-purple-700',  activityCount: 3, avgCycleTime: '1 dia',  lastExecution: 'há 1 sem',  reportReady: false },
  { tag: 'Vendas',      color: 'bg-amber-100 text-amber-700',    activityCount: 6, avgCycleTime: '4 h',    lastExecution: 'há 1 h',    reportReady: true  },
  { tag: 'Jurídico',    color: 'bg-rose-100 text-rose-700',      activityCount: 4, avgCycleTime: '5 dias', lastExecution: 'há 2 sem',  reportReady: false },
  { tag: 'TI',          color: 'bg-sky-100 text-sky-700',        activityCount: 4, avgCycleTime: '45 min', lastExecution: 'há 3 dias', reportReady: true  },
];

const COSTS: ActivityCost[] = [
  { id: 'A001', name: 'Onboarding Digital',            laborHours: 8,    hourlyCost: 45, materialCost: 120, logisticsCost: 0,  taxRate: 0.08, revenue: 0     },
  { id: 'A004', name: 'Follow-up de Lead Qualificado', laborHours: 0.75, hourlyCost: 65, materialCost: 0,   logisticsCost: 0,  taxRate: 0.05, revenue: 1200  },
  { id: 'A005', name: 'Envio de Proposta',             laborHours: 1,    hourlyCost: 65, materialCost: 15,  logisticsCost: 0,  taxRate: 0.05, revenue: 8500  },
  { id: 'A006', name: 'Revisão Contrato Rescisório',   laborHours: 4,    hourlyCost: 90, materialCost: 30,  logisticsCost: 80, taxRate: 0.09, revenue: 0     },
  { id: 'A003', name: 'Treinamento Inicial',           laborHours: 16,   hourlyCost: 45, materialCost: 250, logisticsCost: 0,  taxRate: 0.08, revenue: 0     },
];

/* ── Helpers ────────────────────────────────────────────────────────────── */

function fmt(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function getChain(startId: string): Activity[] {
  const chain: Activity[] = [];
  let current: Activity | undefined = ACTIVITIES.find((a) => a.id === startId);
  while (current) {
    chain.push(current);
    current = current.chainNext ? ACTIVITIES.find((a) => a.id === current!.chainNext) : undefined;
  }
  return chain;
}

const TRIGGER_BADGE: Record<TriggerType, string> = {
  'Manual':       'bg-slate-100 text-slate-600',
  'Gatilho CRM':  'bg-emerald-100 text-emerald-700',
  'Gatilho ERP':  'bg-blue-100 text-blue-700',
  'Gatilho RH':   'bg-purple-100 text-purple-700',
  'Agendado':     'bg-amber-100 text-amber-700',
};

const STATUS_BADGE: Record<TaskStatus, string> = {
  'Ativa':     'bg-green-100 text-green-700',
  'Pausada':   'bg-amber-100 text-amber-700',
  'Concluída': 'bg-slate-100 text-slate-500',
  'Rascunho':  'bg-rose-100 text-rose-600',
};

/* ── Sub-tabs ───────────────────────────────────────────────────────────── */

function AutomationTab() {
  const [expanded, setExpanded] = useState<string | null>(null);

  const chainNextIds = new Set(ACTIVITIES.filter((a) => a.chainNext).map((a) => a.chainNext!));
  const chainRoots   = ACTIVITIES.filter((a) => !chainNextIds.has(a.id) && a.chainNext);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 font-medium">
          <Plus className="w-4 h-4" /> Nova Atividade
        </button>
      </div>

      {/* Chain flow visualizer */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-500" /> Fluxos em Cadeia
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Uma atividade concluída dispara automaticamente a próxima na cadeia</p>
        </div>
        <div className="p-5 space-y-4">
          {chainRoots.map((root) => {
            const chain = getChain(root.id);
            return (
              <div key={root.id} className="bg-slate-50/60 rounded-lg p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Gatilho: {root.triggerDetail}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {chain.map((act, i) => (
                    <div key={act.id} className="flex items-center gap-2">
                      <div className="bg-white border border-indigo-200 rounded-lg px-3 py-2 shadow-sm">
                        <p className="text-xs font-semibold text-indigo-800">{act.name}</p>
                        <p className="text-[10px] text-slate-400">{act.assignee} · {fmtDuration(act.avgDuration)}</p>
                      </div>
                      {i < chain.length - 1 && (
                        <ArrowRight className="w-4 h-4 text-indigo-400 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full activity list */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Todas as Atividades</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {ACTIVITIES.map((act) => (
            <div key={act.id} className="hover:bg-slate-50/40 transition-colors">
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer"
                onClick={() => setExpanded(expanded === act.id ? null : act.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-slate-800 text-sm">{act.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${TRIGGER_BADGE[act.trigger]}`}>
                      {act.trigger}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_BADGE[act.status]}`}>
                      {act.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{act.triggerDetail} · {act.assignee} · {act.department}</p>
                </div>
                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-700">{act.totalExecutions}</p>
                    <p className="text-[10px] text-slate-400">execuções</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-700">{fmtDuration(act.avgDuration)}</p>
                    <p className="text-[10px] text-slate-400">tempo médio</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {act.tags.map((t) => (
                      <span key={t} className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px]">{t}</span>
                    ))}
                  </div>
                  <MoreHorizontal className="w-4 h-4 text-slate-400" />
                </div>
              </div>
              {expanded === act.id && (
                <div className="px-5 pb-4 bg-slate-50/40 border-t border-slate-100">
                  <div className="grid grid-cols-3 gap-4 pt-4 text-sm">
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Departamento</p>
                      <p className="font-medium text-slate-700">{act.department}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Responsável</p>
                      <p className="font-medium text-slate-700">{act.assignee}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Próxima na cadeia</p>
                      <p className="font-medium text-slate-700">
                        {act.chainNext
                          ? (ACTIVITIES.find((a) => a.id === act.chainNext)?.name ?? '—')
                          : '— fim da cadeia'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <button className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Editar</button>
                    <button className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Adicionar à Cadeia</button>
                    {act.status === 'Ativa'
                      ? <button className="px-3 py-1.5 text-xs font-semibold bg-amber-50 border border-amber-200 rounded-lg text-amber-700 hover:bg-amber-100">Pausar</button>
                      : <button className="px-3 py-1.5 text-xs font-semibold bg-green-50 border border-green-200 rounded-lg text-green-700 hover:bg-green-100">Reativar</button>
                    }
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GroupsTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Agrupamentos automáticos por tag para geração de relatórios gerenciais</p>
        <button className="flex items-center gap-2 px-3 py-1.5 text-xs text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 font-medium">
          <Plus className="w-3 h-3" /> Nova Tag / Grupo
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {GROUPS.map((g) => (
          <div key={g.tag} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-start justify-between mb-4">
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${g.color}`}>
                <Tag className="w-3 h-3" /> {g.tag}
              </span>
              {g.reportReady
                ? <span className="text-[11px] text-green-600 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Relatório disponível</span>
                : <span className="text-[11px] text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" /> Processando</span>
              }
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Atividades',        value: g.activityCount.toString() },
                { label: 'Tempo médio ciclo', value: g.avgCycleTime             },
                { label: 'Última execução',   value: g.lastExecution            },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">{s.label}</p>
                  <p className="text-sm font-semibold text-slate-700">{s.value}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
              <button className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Ver Atividades</button>
              {g.reportReady && (
                <button className="px-3 py-1.5 text-xs font-semibold bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-700 hover:bg-indigo-100">Gerar Relatório</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CostingTab() {
  function totalCost(c: ActivityCost): number {
    const labor   = c.laborHours * c.hourlyCost;
    const sub     = labor + c.materialCost + c.logisticsCost;
    return sub * (1 + c.taxRate);
  }

  function roi(c: ActivityCost): number | null {
    if (c.revenue === 0) return null;
    const cost = totalCost(c);
    return ((c.revenue - cost) / cost) * 100;
  }

  const grandCost    = COSTS.reduce((s, c) => s + totalCost(c), 0);
  const grandRevenue = COSTS.reduce((s, c) => s + c.revenue, 0);
  const grandROI     = grandRevenue > 0 ? ((grandRevenue - grandCost) / grandCost) * 100 : null;

  return (
    <div className="space-y-6">
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-5 py-4 text-sm text-indigo-700">
        <span className="font-semibold">Activity-Based Costing (ABC):</span> consolida custo de mão de obra
        (horas × salário), materiais diretos, custos logísticos (frota/veículos integrados) e impostos —
        permitindo cálculo de ROI por atividade.
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Custo Total Operacional', value: fmt(grandCost)                                               },
          { label: 'Receita Associada',        value: fmt(grandRevenue)                                           },
          { label: 'ROI Ponderado',            value: grandROI !== null ? `${grandROI.toFixed(1)}%` : '—'        },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs text-slate-500 mb-1">{s.label}</p>
            <p className="text-xl font-bold text-slate-800">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['Atividade', 'Mão de Obra', 'Materiais', 'Logística', 'Impostos', 'Custo Total', 'ROI'].map((h, i) => (
                  <th key={h} className={`${i === 0 ? 'text-left px-5' : i === 6 ? 'text-right px-5' : 'text-right px-4'} py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {COSTS.map((c) => {
                const labor  = c.laborHours * c.hourlyCost;
                const sub    = labor + c.materialCost + c.logisticsCost;
                const taxes  = sub * c.taxRate;
                const total  = sub + taxes;
                const roiVal = roi(c);
                return (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3 font-medium text-slate-800">{c.name}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{fmt(labor)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{fmt(c.materialCost)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{fmt(c.logisticsCost)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{fmt(taxes)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">{fmt(total)}</td>
                    <td className="px-5 py-3 text-right">
                      {roiVal === null
                        ? <span className="text-slate-400 text-xs">N/A</span>
                        : <span className={`font-bold ${roiVal >= 0 ? 'text-green-600' : 'text-rose-600'}`}>
                            {roiVal >= 0 ? '+' : ''}{roiVal.toFixed(1)}%
                          </span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t border-slate-200">
                <td className="px-5 py-3 text-xs font-semibold text-slate-500" colSpan={5}>Total</td>
                <td className="px-4 py-3 text-right font-bold text-slate-800">{fmt(grandCost)}</td>
                <td className="px-5 py-3 text-right font-bold text-green-600">
                  {grandROI !== null ? `+${grandROI.toFixed(1)}%` : '—'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────────────────────── */

const TABS = [
  { id: 'automation', label: 'Cadastro e Automação'  },
  { id: 'groups',     label: 'Grupos de Atividades'  },
  { id: 'costing',    label: 'Custeio ABC'            },
] as const;

type TabId = typeof TABS[number]['id'];

export default function Activities() {
  const [tab, setTab] = useState<TabId>('automation');

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Gestão de Atividades</h1>
        <p className="text-slate-500 text-sm mt-1">
          Tarefas manuais e automatizadas por gatilhos de sistema, com fluxos em cadeia e custeio integrado por atividade
        </p>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'automation' && <AutomationTab />}
      {tab === 'groups'     && <GroupsTab />}
      {tab === 'costing'    && <CostingTab />}
    </div>
  );
}
