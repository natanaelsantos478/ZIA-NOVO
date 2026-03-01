import { useState } from 'react';
import {
  Plus, Bell, AlertTriangle, Clock, CheckCircle,
  ToggleLeft, ToggleRight, MoreHorizontal, ChevronDown,
} from 'lucide-react';

type TriggerType = 'Faltas Consecutivas' | 'Faltas no Mês' | 'Atraso Recorrente' | 'HE Excessiva' | 'Banco Negativo' | 'Horas Expirando';
type AlertSeverity = 'Alta' | 'Média' | 'Baixa';
type AlertAction = 'Notificação' | 'Advertência Automática' | 'Alerta para Gestor' | 'Alerta para RH';

interface AlertRule {
  id: string;
  name: string;
  triggerType: TriggerType;
  threshold: string;
  severity: AlertSeverity;
  actions: AlertAction[];
  active: boolean;
  triggeredCount: number;
  lastTriggered?: string;
}

interface AlertHistoryEntry {
  id: string;
  ruleId: string;
  ruleName: string;
  employee: string;
  dept: string;
  date: string;
  details: string;
  severity: AlertSeverity;
  action: string;
  resolved: boolean;
}

const RULES: AlertRule[] = [
  {
    id: 'R001',
    name: 'Faltas Não Justificadas – 3 em 30 dias',
    triggerType: 'Faltas no Mês',
    threshold: '≥ 3 faltas em 30 dias corridos',
    severity: 'Alta',
    actions: ['Advertência Automática', 'Alerta para RH', 'Alerta para Gestor'],
    active: true,
    triggeredCount: 2,
    lastTriggered: '12/02/2025',
  },
  {
    id: 'R002',
    name: 'Atraso Recorrente – 5x no mês',
    triggerType: 'Atraso Recorrente',
    threshold: '≥ 5 atrasos de qualquer duração no mês',
    severity: 'Média',
    actions: ['Notificação', 'Alerta para Gestor'],
    active: true,
    triggeredCount: 5,
    lastTriggered: '20/02/2025',
  },
  {
    id: 'R003',
    name: 'Faltas Consecutivas – 2 dias',
    triggerType: 'Faltas Consecutivas',
    threshold: '≥ 2 faltas em dias consecutivos',
    severity: 'Alta',
    actions: ['Advertência Automática', 'Alerta para RH'],
    active: true,
    triggeredCount: 1,
    lastTriggered: '07/02/2025',
  },
  {
    id: 'R004',
    name: 'HE Excessiva – 30h no mês',
    triggerType: 'HE Excessiva',
    threshold: '> 30h de HE acumuladas no mês',
    severity: 'Média',
    actions: ['Alerta para RH', 'Alerta para Gestor'],
    active: true,
    triggeredCount: 1,
    lastTriggered: '18/02/2025',
  },
  {
    id: 'R005',
    name: 'Banco de Horas Negativo',
    triggerType: 'Banco Negativo',
    threshold: 'Saldo do banco de horas < 0h',
    severity: 'Média',
    actions: ['Notificação', 'Alerta para Gestor'],
    active: true,
    triggeredCount: 1,
    lastTriggered: '05/02/2025',
  },
  {
    id: 'R006',
    name: 'Horas Prestes a Expirar',
    triggerType: 'Horas Expirando',
    threshold: 'Horas no banco com vencimento em ≤ 30 dias',
    severity: 'Baixa',
    actions: ['Notificação'],
    active: false,
    triggeredCount: 0,
  },
];

const HISTORY: AlertHistoryEntry[] = [
  { id: 'H001', ruleId: 'R001', ruleName: 'Faltas Não Justificadas – 3 em 30 dias', employee: 'Rafael Nunes',    dept: 'TI – Dados',  date: '12/02/2025', details: '3ª falta não justificada em 30 dias (03/02, 06/02 e 12/02)', severity: 'Alta', action: 'Advertência Automática gerada + RH e Gestor notificados', resolved: false },
  { id: 'H002', ruleId: 'R002', ruleName: 'Atraso Recorrente – 5x no mês',          employee: 'Lucas Araújo',    dept: 'Marketing',   date: '20/02/2025', details: '5 atrasos registrados em fevereiro (04, 06, 11, 14 e 20/02)', severity: 'Média', action: 'Notificação enviada + Gestor alertado', resolved: false },
  { id: 'H003', ruleId: 'R003', ruleName: 'Faltas Consecutivas – 2 dias',           employee: 'Carlos E. Lima',  dept: 'TI – Dev',    date: '07/02/2025', details: 'Falta nos dias 06 e 07/02 sem justificativa', severity: 'Alta', action: 'Advertência Automática gerada + RH alertado', resolved: true  },
  { id: 'H004', ruleId: 'R004', ruleName: 'HE Excessiva – 30h no mês',             employee: 'Carlos E. Lima',  dept: 'TI – Dev',    date: '18/02/2025', details: '38h de HE acumuladas em fevereiro', severity: 'Média', action: 'RH e Gestor alertados', resolved: false },
  { id: 'H005', ruleId: 'R001', ruleName: 'Faltas Não Justificadas – 3 em 30 dias', employee: 'Rafael Nunes',    dept: 'TI – Dados',  date: '12/02/2025', details: '2ª ocorrência do gatilho (acumulado histórico)', severity: 'Alta', action: 'Escalado para Direção de RH', resolved: false },
];

const SEVERITY_CONFIG: Record<AlertSeverity, { color: string; bg: string; dot: string }> = {
  'Alta':  { color: 'text-rose-700',   bg: 'bg-rose-100',   dot: 'bg-rose-500'   },
  'Média': { color: 'text-amber-700',  bg: 'bg-amber-100',  dot: 'bg-amber-500'  },
  'Baixa': { color: 'text-blue-700',   bg: 'bg-blue-100',   dot: 'bg-blue-400'   },
};

const TRIGGER_ICON: Record<TriggerType, React.ElementType> = {
  'Faltas Consecutivas': AlertTriangle,
  'Faltas no Mês':       AlertTriangle,
  'Atraso Recorrente':   Clock,
  'HE Excessiva':        Clock,
  'Banco Negativo':      AlertTriangle,
  'Horas Expirando':     Bell,
};

const ACTION_COLOR: Record<AlertAction, string> = {
  'Notificação':             'bg-blue-100 text-blue-700',
  'Advertência Automática':  'bg-rose-100 text-rose-700',
  'Alerta para Gestor':      'bg-amber-100 text-amber-700',
  'Alerta para RH':          'bg-purple-100 text-purple-700',
};

function NewAlertForm({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="max-w-xl space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-slate-800">Novo Gatilho de Alerta</h3>
        <button onClick={onCancel} className="text-sm text-slate-500 hover:text-slate-700">Cancelar</button>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nome do Alerta *</label>
        <input type="text" placeholder="Ex: Faltas Excessivas Q2" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tipo de Gatilho *</label>
          <select className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 bg-white">
            <option>Faltas Consecutivas</option>
            <option>Faltas no Mês</option>
            <option>Atraso Recorrente</option>
            <option>HE Excessiva</option>
            <option>Banco Negativo</option>
            <option>Horas Expirando</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Limite / Threshold *</label>
          <input type="text" placeholder="Ex: 3 ocorrências em 30 dias" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Severidade</label>
          <select className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 bg-white">
            <option>Alta</option>
            <option>Média</option>
            <option>Baixa</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Aplica-se a</label>
          <select className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 bg-white">
            <option>Todos os funcionários</option>
            <option>Por departamento</option>
            <option>Por grupo</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-2">Ações ao Disparar</label>
        <div className="flex flex-wrap gap-2">
          {(['Notificação', 'Advertência Automática', 'Alerta para Gestor', 'Alerta para RH'] as AlertAction[]).map((a) => (
            <button key={a} className={`px-3 py-1.5 text-xs font-semibold rounded-lg border-2 transition-all ${ACTION_COLOR[a]} border-transparent`}>
              {a}
            </button>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Cancelar</button>
        <button className="px-6 py-2 text-sm font-semibold text-white bg-pink-600 rounded-lg hover:bg-pink-700">Salvar Gatilho</button>
      </div>
    </div>
  );
}

export default function PointAlerts() {
  const [activeTab, setActiveTab]   = useState('rules');
  const [showForm, setShowForm]     = useState(false);
  const [rules, setRules]           = useState(RULES);
  const [expandedRule, setExpanded] = useState<string | null>(null);

  const toggleRule = (id: string) => {
    setRules((prev) => prev.map((r) => r.id === id ? { ...r, active: !r.active } : r));
  };

  const unresolvedCount = HISTORY.filter((h) => !h.resolved).length;
  const activeRules = rules.filter((r) => r.active).length;

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Alertas de Ponto</h1>
          <p className="text-slate-500 text-sm mt-1">Configure gatilhos automáticos para advertências, alertas de atraso e faltas recorrentes</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium"
          >
            <Plus className="w-4 h-4" /> Novo Gatilho
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Gatilhos Ativos',     value: `${activeRules}/${rules.length}`,  icon: Bell,          color: 'text-pink-600 bg-pink-50'   },
          { label: 'Alertas Não Resolvidos', value: `${unresolvedCount}`,            icon: AlertTriangle, color: 'text-rose-600 bg-rose-50'   },
          { label: 'Disparos (mês)',       value: HISTORY.length.toString(),          icon: Clock,         color: 'text-amber-600 bg-amber-50' },
          { label: 'Resolvidos',          value: HISTORY.filter((h) => h.resolved).length.toString(), icon: CheckCircle, color: 'text-green-600 bg-green-50' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500">{s.label}</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-800">{s.value}</p>
            </div>
          );
        })}
      </div>

      {showForm ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <NewAlertForm onCancel={() => setShowForm(false)} />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex border-b border-slate-100 px-6 pt-4 gap-6">
            {[
              { id: 'rules',   label: 'Gatilhos Configurados' },
              { id: 'history', label: `Histórico de Disparos (${HISTORY.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3 text-sm font-semibold transition-all border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? 'text-pink-600 border-pink-600'
                    : 'text-slate-500 border-transparent hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {activeTab === 'rules' && (
              <div className="space-y-3">
                {rules.map((rule) => {
                  const TrigIcon = TRIGGER_ICON[rule.triggerType];
                  const sev = SEVERITY_CONFIG[rule.severity];
                  const isExpanded = expandedRule === rule.id;

                  return (
                    <div
                      key={rule.id}
                      className={`border rounded-xl overflow-hidden ${rule.active ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}
                    >
                      <div className="flex items-center gap-4 px-5 py-4">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${rule.active ? sev.bg : 'bg-slate-100'}`}>
                          <TrigIcon className={`w-4 h-4 ${rule.active ? sev.color : 'text-slate-400'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-semibold text-slate-800 text-sm">{rule.name}</p>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${sev.bg} ${sev.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${sev.dot}`} />
                              {rule.severity}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">{rule.threshold}</p>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          {rule.lastTriggered && (
                            <div className="text-right text-xs text-slate-400">
                              <p>Último disparo</p>
                              <p className="font-medium text-slate-600">{rule.lastTriggered}</p>
                            </div>
                          )}
                          <div className="text-right text-xs text-slate-400">
                            <p>Disparos</p>
                            <p className="font-bold text-slate-700">{rule.triggeredCount}</p>
                          </div>
                          <button
                            onClick={() => toggleRule(rule.id)}
                            title={rule.active ? 'Desativar' : 'Ativar'}
                            className="text-slate-400 hover:text-pink-500 transition-colors"
                          >
                            {rule.active
                              ? <ToggleRight className="w-7 h-7 text-pink-600" />
                              : <ToggleLeft className="w-7 h-7 text-slate-400" />
                            }
                          </button>
                          <button
                            onClick={() => setExpanded(isExpanded ? null : rule.id)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                          <button className="text-slate-400 hover:text-slate-600">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-5 pb-4 border-t border-slate-100 pt-4">
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Ações ao Disparar</p>
                          <div className="flex flex-wrap gap-2">
                            {rule.actions.map((a) => (
                              <span key={a} className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${ACTION_COLOR[a]}`}>
                                {a}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-3">
                {HISTORY.map((h) => {
                  const sev = SEVERITY_CONFIG[h.severity];
                  return (
                    <div key={h.id} className={`flex items-start gap-4 rounded-xl border px-5 py-4 ${h.resolved ? 'bg-slate-50/50 border-slate-100' : 'bg-white border-slate-200'}`}>
                      <div className={`w-2.5 h-2.5 rounded-full mt-2 shrink-0 ${sev.dot}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <p className="font-semibold text-slate-800 text-sm">{h.employee}</p>
                          <span className="text-slate-400 text-xs">·</span>
                          <p className="text-xs text-slate-500">{h.dept}</p>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${sev.bg} ${sev.color}`}>{h.severity}</span>
                        </div>
                        <p className="text-xs text-slate-500 mb-1"><span className="font-medium">{h.ruleName}</span> · {h.date}</p>
                        <p className="text-xs text-slate-600">{h.details}</p>
                        <p className="text-xs text-slate-400 mt-1"><span className="font-medium">Ação:</span> {h.action}</p>
                      </div>
                      <div className="shrink-0">
                        {h.resolved ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                            <CheckCircle className="w-3.5 h-3.5" /> Resolvido
                          </span>
                        ) : (
                          <button className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">
                            Marcar como Resolvido
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
