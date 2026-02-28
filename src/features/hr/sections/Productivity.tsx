import { useState } from 'react';
import { TrendingDown, TrendingUp, Plus, Sparkles, Clock, CheckCircle2, RefreshCw } from 'lucide-react';

/* ── Types ──────────────────────────────────────────────────────────────── */

type PerfStatus = 'ok' | 'warning' | 'critical';
type Trend      = 'up' | 'down' | 'stable';

interface EmployeePerf {
  id:          string;
  name:        string;
  position:    string;
  department:  string;
  delivered:   number;
  delayed:     number;
  rework:      number;
  avgTime:     number;   // hours
  trend:       Trend;
  status:      PerfStatus;
  ziaAlert?:   string;
}

interface CustomMetric {
  id:           string;
  name:         string;
  formula:      string;
  currentValue: number;
  unit:         string;
  trend:        Trend;
  delta:        string;
  description:  string;
}

/* ── Mock data ──────────────────────────────────────────────────────────── */

const EMPLOYEES: EmployeePerf[] = [
  { id: 'E001', name: 'Ana Paula Ferreira',  position: 'Gerente de RH',         department: 'RH',         delivered: 42, delayed: 2, rework: 1, avgTime: 3.2, trend: 'up',     status: 'ok'       },
  { id: 'E002', name: 'Carlos Eduardo Lima', position: 'Analista de Sistemas',   department: 'TI',         delivered: 38, delayed: 5, rework: 3, avgTime: 4.8, trend: 'down',   status: 'warning', ziaAlert: 'Queda de 18% no volume de entregas nas últimas 3 semanas. Possível sobrecarga ou desmotivação — recomenda-se conversa 1:1.' },
  { id: 'E003', name: 'Beatriz Souza',       position: 'Assistente Financeiro',  department: 'Financeiro', delivered: 61, delayed: 1, rework: 0, avgTime: 1.9, trend: 'up',     status: 'ok'       },
  { id: 'E004', name: 'Rafael Nunes',        position: 'Dev Sênior',             department: 'Tecnologia', delivered: 29, delayed: 8, rework: 6, avgTime: 6.1, trend: 'down',   status: 'critical',ziaAlert: 'Alto índice de retrabalho (20.7%) combinado com atrasos crescentes. Verificar sobrecarga ou bloqueios técnicos urgentemente.' },
  { id: 'E005', name: 'Fernanda Oliveira',   position: 'Designer UX',            department: 'Produto',    delivered: 47, delayed: 3, rework: 2, avgTime: 2.7, trend: 'stable',  status: 'ok'      },
  { id: 'E006', name: 'Guilherme Martins',   position: 'Especialista em Produto',department: 'Produto',    delivered: 33, delayed: 0, rework: 1, avgTime: 5.4, trend: 'up',     status: 'ok'       },
];

const METRICS: CustomMetric[] = [
  {
    id: 'M001',
    name:         'Eficiência Operacional',
    formula:      '(Entregas Pontuais ÷ Total Entregas) × (Horas Trabalhadas ÷ Horas Previstas)',
    currentValue: 87.3,
    unit:         '%',
    trend:        'up',
    delta:        '+2.1 pp',
    description:  'Cruza pontualidade de entregas com aderência à jornada registrada no ponto eletrônico',
  },
  {
    id: 'M002',
    name:         'Custo por Atividade Concluída',
    formula:      'Folha Líquida ÷ Total Atividades Concluídas',
    currentValue: 148.70,
    unit:         'R$',
    trend:        'down',
    delta:        '−R$ 12,40',
    description:  'Custo médio por entrega, calculado com base na folha de pagamento do período',
  },
  {
    id: 'M003',
    name:         'Índice de Retrabalho',
    formula:      'Retrabalhos ÷ Total Entregas × 100',
    currentValue: 4.2,
    unit:         '%',
    trend:        'down',
    delta:        '−0.8 pp',
    description:  'Percentual de atividades que precisaram ser refeitas total ou parcialmente no período',
  },
  {
    id: 'M004',
    name:         'HE sobre Produtividade',
    formula:      'HE Realizadas (h) ÷ Entregas Adicionais Geradas',
    currentValue: 2.3,
    unit:         'h/entrega',
    trend:        'stable',
    delta:        '0.0',
    description:  'Horas extras necessárias para cada unidade adicional de entrega — avalia custo-benefício do HE',
  },
];

/* ── Helpers ────────────────────────────────────────────────────────────── */

const STATUS_CLASS: Record<PerfStatus, string> = {
  ok:       'bg-green-100 text-green-700',
  warning:  'bg-amber-100 text-amber-700',
  critical: 'bg-rose-100 text-rose-700',
};

const STATUS_LABEL: Record<PerfStatus, string> = {
  ok:       'Normal',
  warning:  'Atenção',
  critical: 'Crítico',
};

/* ── Individual productivity tab ────────────────────────────────────────── */

function IndividualTab() {
  const [selectedId, setSelectedId] = useState<string>(EMPLOYEES[0].id);
  const emp = EMPLOYEES.find((e) => e.id === selectedId)!;

  const onTimeRate  = (((emp.delivered - emp.delayed) / emp.delivered) * 100).toFixed(1);
  const reworkRate  = ((emp.rework / emp.delivered) * 100).toFixed(1);

  return (
    <div className="flex gap-6">
      {/* Employee list */}
      <div className="w-64 shrink-0 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden self-start">
        <div className="px-4 py-3 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Colaboradores</p>
        </div>
        <div className="divide-y divide-slate-50">
          {EMPLOYEES.map((e) => (
            <button
              key={e.id}
              onClick={() => setSelectedId(e.id)}
              className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${selectedId === e.id ? 'bg-indigo-50' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${selectedId === e.id ? 'text-indigo-700' : 'text-slate-700'}`}>{e.name}</p>
                  <p className="text-xs text-slate-400">{e.department}</p>
                </div>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_CLASS[e.status]}`}>
                  {STATUS_LABEL[e.status]}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Detail panel */}
      <div className="flex-1 space-y-4">
        {emp.ziaAlert && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
            <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">ZIA identificou queda de performance</p>
              <p className="text-xs text-amber-700 mt-0.5">{emp.ziaAlert}</p>
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800">{emp.name}</h3>
              <p className="text-sm text-slate-500">{emp.position} · {emp.department}</p>
            </div>
            <div className={`flex items-center gap-1 text-sm font-semibold ${
              emp.trend === 'up' ? 'text-green-600' : emp.trend === 'down' ? 'text-rose-600' : 'text-slate-400'
            }`}>
              {emp.trend === 'up'   && <TrendingUp   className="w-4 h-4" />}
              {emp.trend === 'down' && <TrendingDown className="w-4 h-4" />}
              {emp.trend === 'stable' && <span>→</span>}
              {emp.trend === 'up' ? 'Em alta' : emp.trend === 'down' ? 'Em queda' : 'Estável'}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Entregas no Mês', value: emp.delivered.toString(), Icon: CheckCircle2, color: 'text-green-500' },
              { label: 'Com Atraso',      value: emp.delayed.toString(),   Icon: Clock,        color: 'text-amber-500' },
              { label: 'Retrabalho',      value: emp.rework.toString(),    Icon: RefreshCw,    color: 'text-rose-500'  },
              { label: 'Tempo Médio',     value: `${emp.avgTime}h`,        Icon: Clock,        color: 'text-blue-500'  },
            ].map((s) => (
              <div key={s.label} className="bg-slate-50 rounded-xl p-4">
                <s.Icon className={`w-5 h-5 ${s.color} mb-2`} />
                <p className="text-2xl font-bold text-slate-800">{s.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Rate bars */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h3 className="font-semibold text-slate-800">Indicadores</h3>
          {[
            { label: 'Taxa de Pontualidade', value: parseFloat(onTimeRate), bar: 'bg-green-500' },
            { label: 'Taxa de Retrabalho',   value: parseFloat(reworkRate), bar: 'bg-rose-500'  },
          ].map((r) => (
            <div key={r.label}>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-slate-600">{r.label}</span>
                <span className="font-semibold text-slate-800">{r.value.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full ${r.bar} rounded-full`} style={{ width: `${Math.min(r.value, 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── General / custom metrics tab ───────────────────────────────────────── */

function GeneralTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Métricas personalizadas combinando atividades, ponto eletrônico e dados de folha de pagamento
        </p>
        <button className="flex items-center gap-2 px-3 py-1.5 text-xs text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 font-medium">
          <Plus className="w-3 h-3" /> Nova Métrica
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {METRICS.map((m) => (
          <div key={m.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-slate-800 text-sm">{m.name}</h3>
              <div className={`flex items-center gap-1 text-xs font-semibold ${
                m.trend === 'up' ? 'text-green-600' : m.trend === 'down' ? 'text-rose-600' : 'text-slate-400'
              }`}>
                {m.trend === 'up'   && <TrendingUp   className="w-3 h-3" />}
                {m.trend === 'down' && <TrendingDown className="w-3 h-3" />}
                {m.delta}
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-800 mb-1">
              {m.unit === 'R$'
                ? m.currentValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                : `${m.currentValue}${m.unit}`
              }
            </p>
            <p className="text-xs text-slate-500 mb-3">{m.description}</p>
            <div className="bg-slate-50 rounded-lg px-3 py-2">
              <p className="text-[10px] text-slate-400 mb-0.5 uppercase tracking-wider">Fórmula</p>
              <p className="text-xs text-indigo-700 font-mono">{m.formula}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ZIA insights */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          <h3 className="font-semibold text-indigo-800">Insights ZIA — Produtividade Geral</h3>
        </div>
        <div className="space-y-2">
          {[
            'O custo por atividade caiu 7.7% no mês — combina alta eficiência com redução de retrabalho.',
            'HE sobre produtividade estável em 2.3h/entrega. Aumentos acima de 3h indicam ineficiência operacional.',
            'Colaboradores de Produto têm 35% menos retrabalho que TI. Considere compartilhamento de boas práticas entre equipes.',
          ].map((insight, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-indigo-700">
              <span className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-400" />
              {insight}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────────────────────── */

const TABS = [
  { id: 'individual', label: 'Produtividade Individual'  },
  { id: 'general',    label: 'Métricas Personalizadas'   },
] as const;

type TabId = typeof TABS[number]['id'];

export default function Productivity() {
  const [tab, setTab] = useState<TabId>('individual');

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Produtividade e Dashboards</h1>
        <p className="text-slate-500 text-sm mt-1">
          Performance individual com detecção ZIA de quedas + métricas customizadas cruzando atividades, ponto e folha
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

      {tab === 'individual' && <IndividualTab />}
      {tab === 'general'    && <GeneralTab />}
    </div>
  );
}
