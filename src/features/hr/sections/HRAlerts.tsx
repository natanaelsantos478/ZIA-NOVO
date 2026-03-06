import { useState, useEffect, useCallback } from 'react';
import { Plus, AlertTriangle, ToggleRight, ToggleLeft, CheckCircle2 } from 'lucide-react';
import { getHrAlerts, resolveHrAlert } from '../../../lib/hr';
import type { HrAlert } from '../../../lib/hr';

/* ── Types ──────────────────────────────────────────────────────────────── */

type TriggerCategory = 'Tempo de Casa'     | 'Fim de Contrato'   | 'Advertências'
                     | 'Sem Promoção'      | 'ASO / Saúde'       | 'Férias Vencendo';

interface AlertRule {
  id:           string;
  name:         string;
  category:     TriggerCategory;
  trigger:      string;
  action:       string;
  notifyRoles:  string[];
  enabled:      boolean;
  activeCount:  number;
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function severityBadge(s: string): string {
  if (s === 'Urgente' || s === 'Crítico') return 'bg-rose-100 text-rose-700';
  if (s === 'Atenção')                    return 'bg-amber-100 text-amber-700';
  return 'bg-blue-100 text-blue-700';
}

function severityLabel(s: string): string {
  if (s === 'Urgente') return 'Crítico';
  return s;
}

function catBadge(type: string): string {
  const map: Record<string, string> = {
    vacation_expiring: 'bg-blue-100 text-blue-700',
    doc_missing:       'bg-rose-100 text-rose-700',
    absence_alert:     'bg-red-100 text-red-700',
    contract_expiring: 'bg-rose-100 text-rose-700',
    promotion_delay:   'bg-amber-100 text-amber-700',
    aso_expiring:      'bg-teal-100 text-teal-700',
    anniversary:       'bg-purple-100 text-purple-700',
  };
  return map[type] ?? 'bg-slate-100 text-slate-600';
}

function fmtDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString('pt-BR'); } catch { return iso; }
}

const CAT_BADGE: Record<TriggerCategory, string> = {
  'Tempo de Casa':   'bg-purple-100 text-purple-700',
  'Fim de Contrato': 'bg-rose-100 text-rose-700',
  'Advertências':    'bg-red-100 text-red-700',
  'Sem Promoção':    'bg-amber-100 text-amber-700',
  'ASO / Saúde':     'bg-teal-100 text-teal-700',
  'Férias Vencendo': 'bg-blue-100 text-blue-700',
};

/* ── Static alert rules (UI config — no DB table yet) ────────────────────── */

const RULES_INITIAL: AlertRule[] = [
  { id: 'R001', name: '5 Anos de Casa',               category: 'Tempo de Casa',   trigger: 'Aniversário de 5, 10, 15… anos',          action: 'Notifica RH e gestor para revisão salarial e reconhecimento', notifyRoles: ['RH', 'Gestor'],        enabled: true,  activeCount: 2 },
  { id: 'R002', name: 'Fim de Contrato em 60 dias',   category: 'Fim de Contrato', trigger: '60 dias antes do vencimento do contrato',  action: 'Notifica RH para decisão: renovar ou iniciar offboarding',    notifyRoles: ['RH', 'Jurídico'],      enabled: true,  activeCount: 1 },
  { id: 'R003', name: 'Fim de Contrato em 30 dias',   category: 'Fim de Contrato', trigger: '30 dias antes do vencimento do contrato',  action: 'Escala para Crítico e bloqueia prorrogação automática',       notifyRoles: ['RH', 'Jurídico', 'Diretor'], enabled: true,  activeCount: 1 },
  { id: 'R004', name: '3ª Advertência Acumulada',     category: 'Advertências',    trigger: 'Colaborador atinge 3 advertências ativas', action: 'Alerta RH e gestor — proposta de demissão pode ser indicada', notifyRoles: ['RH', 'Jurídico'],      enabled: true,  activeCount: 1 },
  { id: 'R005', name: '2 Anos sem Promoção',           category: 'Sem Promoção',   trigger: '24 meses desde a última alteração de cargo',action: 'Sugere revisão na próxima calibração de performance',         notifyRoles: ['RH', 'Gestor'],        enabled: true,  activeCount: 3 },
  { id: 'R006', name: 'ASO Vencendo em 30 dias',      category: 'ASO / Saúde',     trigger: '30 dias antes do vencimento do ASO',      action: 'Notifica RH e SESMT para agendamento',                        notifyRoles: ['RH', 'SESMT'],         enabled: true,  activeCount: 2 },
  { id: 'R007', name: 'Férias Vencendo em 30 dias',   category: 'Férias Vencendo', trigger: '30 dias antes do vencimento do período',  action: 'Alerta gestor e colaborador via portal',                      notifyRoles: ['RH', 'Gestor'],        enabled: true,  activeCount: 1 },
  { id: 'R008', name: '1 Ano sem Promoção',            category: 'Sem Promoção',   trigger: '12 meses desde a última alteração de cargo',action: 'Informativo — adiciona flag de revisão pendente',            notifyRoles: ['Gestor'],              enabled: false, activeCount: 0 },
];

/* ── Sub-tabs ───────────────────────────────────────────────────────────── */

function AlertsTab({ onCountChange }: { onCountChange?: (n: number) => void }) {
  const [alerts, setAlerts]   = useState<HrAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getHrAlerts();
      setAlerts(data);
      if (onCountChange) onCountChange(data.filter((a) => !a.resolved).length);
    } catch (err) {
      console.error('Erro ao carregar alertas:', err);
    } finally {
      setLoading(false);
    }
  }, [onCountChange]);

  useEffect(() => { void load(); }, [load]);

  async function handleResolve(id: string) {
    try {
      await resolveHrAlert(id);
      setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, resolved: true } : a));
    } catch (err) {
      console.error('Erro ao resolver alerta:', err);
    }
  }

  const active        = alerts.filter((a) => !a.resolved);
  const resolved      = alerts.filter((a) => a.resolved);
  const criticalCount = active.filter((a) => a.severity === 'Urgente' || a.severity === 'Crítico').length;

  if (loading) {
    return <div className="text-center py-16 text-slate-400 text-sm">Carregando alertas...</div>;
  }

  return (
    <div className="space-y-5">
      {criticalCount > 0 && (
        <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-xl px-5 py-4">
          <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-rose-800">{criticalCount} alerta{criticalCount > 1 ? 's' : ''} crítico{criticalCount > 1 ? 's' : ''} ativos — ação imediata recomendada</p>
            <p className="text-xs text-rose-600 mt-0.5">Alertas críticos podem ter implicações jurídicas ou financeiras se não tratados a tempo.</p>
          </div>
        </div>
      )}

      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Alertas Ativos ({active.length})</p>
        {active.length === 0 && (
          <div className="text-center py-10 text-slate-400 text-sm bg-slate-50 rounded-xl border border-slate-100">
            Nenhum alerta ativo no momento.
          </div>
        )}
        <div className="space-y-3">
          {active.map((a) => {
            const isCritical = a.severity === 'Urgente' || a.severity === 'Crítico';
            return (
              <div key={a.id} className={`bg-white rounded-xl border shadow-sm p-5 ${isCritical ? 'border-rose-200' : 'border-slate-200'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-slate-800">{a.employee_name ?? 'Geral'}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${severityBadge(a.severity)}`}>{severityLabel(a.severity)}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${catBadge(a.type)}`}>{a.title}</span>
                    </div>
                    <p className="text-xs text-slate-400">{a.dept ? `${a.dept} · ` : ''}Disparado em {fmtDate(a.created_at)}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">Ativo</span>
                </div>
                <p className="text-sm text-slate-700 mb-2">{a.description ?? ''}</p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => void handleResolve(a.id)}
                    className="px-3 py-1.5 text-xs font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Marcar como Resolvido
                  </button>
                  <button className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Ignorar</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {resolved.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Histórico — Resolvidos ({resolved.length})</p>
          <div className="space-y-2">
            {resolved.map((a) => (
              <div key={a.id} className="bg-white rounded-xl border border-slate-100 px-5 py-3 flex items-center gap-4 opacity-70">
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                <div className="flex-1">
                  <span className="text-sm font-medium text-slate-700">{a.employee_name ?? 'Geral'}</span>
                  <span className="text-xs text-slate-400 ml-2">{a.description ?? ''}</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">Resolvido</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RulesTab() {
  const [rules, setRules] = useState<AlertRule[]>(RULES_INITIAL);

  function toggle(id: string) {
    setRules((prev) => prev.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Gatilhos configuráveis baseados em tempo de casa, acúmulo de advertências, vencimento de contratos e outros eventos
        </p>
        <button className="flex items-center gap-2 px-3 py-1.5 text-xs text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 font-medium">
          <Plus className="w-3 h-3" /> Nova Regra
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-50">
        {rules.map((rule) => (
          <div key={rule.id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50/40 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`font-medium text-sm ${rule.enabled ? 'text-slate-800' : 'text-slate-400'}`}>{rule.name}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${CAT_BADGE[rule.category]}`}>{rule.category}</span>
                {rule.activeCount > 0 && rule.enabled && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
                    {rule.activeCount} ativo{rule.activeCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">Gatilho: {rule.trigger}</p>
              <p className="text-xs text-slate-500 mt-0.5">Ação: {rule.action}</p>
              <div className="flex gap-1 mt-1.5">
                {rule.notifyRoles.map((role) => (
                  <span key={role} className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px]">{role}</span>
                ))}
              </div>
            </div>
            <button
              onClick={() => toggle(rule.id)}
              className={`shrink-0 mt-1 transition-colors ${rule.enabled ? 'text-green-500' : 'text-slate-300'}`}
            >
              {rule.enabled
                ? <ToggleRight className="w-7 h-7" />
                : <ToggleLeft  className="w-7 h-7" />
              }
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────────────────────── */

const TABS = [
  { id: 'alerts', label: 'Alertas Disparados' },
  { id: 'rules',  label: 'Configuração de Regras' },
] as const;

type TabId = typeof TABS[number]['id'];

export default function HRAlerts() {
  const [tab, setTab]           = useState<TabId>('alerts');
  const [activeCount, setActiveCount] = useState(0);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Alertas Transversais de RH</h1>
        <p className="text-slate-500 text-sm mt-1">
          Gatilhos configuráveis baseados em tempo de casa, acúmulo de advertências, fim de contrato e outros eventos da jornada do colaborador
        </p>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              tab === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
            {t.id === 'alerts' && activeCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black flex items-center justify-center">
                {activeCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'alerts' && <AlertsTab onCountChange={setActiveCount} />}
      {tab === 'rules'  && <RulesTab />}
    </div>
  );
}
