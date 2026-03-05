import { useState } from 'react';
import { Zap, AlertTriangle, Bell, CheckCircle2, Settings, Plus } from 'lucide-react';

type AlertSeverity = 'Crítico' | 'Alto' | 'Médio' | 'Info';
type AlertStatus = 'Ativo' | 'Em análise' | 'Resolvido';

interface TrackingAlert {
  id: string;
  severity: AlertSeverity;
  type: string;
  message: string;
  orders: number;
  carrier: string;
  detectedAt: string;
  status: AlertStatus;
  autoAction?: string;
}

const ALERTS: TrackingAlert[] = [
  { id: 'ALT-0481', severity: 'Crítico', type: 'Sem movimento',     message: '28 objetos Jadlog sem evento de rastreio há mais de 48h', orders: 28, carrier: 'Jadlog',        detectedAt: '05/03 06:00', status: 'Em análise',  autoAction: 'Notificação enviada à Jadlog' },
  { id: 'ALT-0480', severity: 'Alto',    type: 'SLA em risco',      message: '15 entregas Total Express com prazo vencendo em 2h', orders: 15, carrier: 'Total Express', detectedAt: '05/03 12:00', status: 'Ativo',       autoAction: 'Motorista notificado via app' },
  { id: 'ALT-0479', severity: 'Alto',    type: 'Desvio de rota',    message: 'Veículo PT-8824 detectou desvio de 12km da rota planejada', orders: 1, carrier: 'Frota Própria', detectedAt: '05/03 14:23', status: 'Em análise' },
  { id: 'ALT-0478', severity: 'Médio',   type: 'Tentativas múltiplas', message: '8 destinatários com 2+ tentativas de entrega Correios', orders: 8, carrier: 'Correios',  detectedAt: '05/03 10:00', status: 'Ativo',       autoAction: 'Agendamento de nova entrega ativado' },
  { id: 'ALT-0477', severity: 'Médio',   type: 'Atraso climático',  message: 'Chuvas intensas no interior SP — 22 entregas com risco de atraso', orders: 22, carrier: 'Múltiplas', detectedAt: '05/03 09:30', status: 'Ativo', autoAction: 'Clientes notificados via WhatsApp' },
  { id: 'ALT-0476', severity: 'Info',    type: 'Meta atingida',     message: 'Frota própria atingiu 98% de OTIF no dia — record histórico', orders: 92, carrier: 'Frota Própria', detectedAt: '05/03 17:00', status: 'Resolvido' },
];

const SEVERITY_BADGE: Record<AlertSeverity, string> = {
  'Crítico': 'bg-red-600 text-white',
  'Alto':    'bg-orange-500 text-white',
  'Médio':   'bg-amber-400 text-white',
  'Info':    'bg-blue-500 text-white',
};

const STATUS_BADGE: Record<AlertStatus, string> = {
  'Ativo':      'bg-red-100 text-red-700',
  'Em análise': 'bg-amber-100 text-amber-700',
  'Resolvido':  'bg-emerald-100 text-emerald-700',
};

const ALERT_RULES = [
  { rule: 'Objeto sem evento > 24h',             action: 'Notificar operação + carrier', active: true  },
  { rule: 'SLA vencendo em 4h',                  action: 'Notificar motorista + cliente', active: true  },
  { rule: 'Desvio de rota > 5km',                action: 'Alerta supervisor',             active: true  },
  { rule: 'Temperatura fora do range (cold chain)', action: 'Parar entrega + notificar',   active: false },
  { rule: '3+ tentativas falhas',                action: 'Agendar nova entrega',          active: true  },
];

export default function TrackingAlerts() {
  const [statusFilter, setStatusFilter] = useState('Todos');

  const STATUSES: AlertStatus[] = ['Ativo', 'Em análise', 'Resolvido'];

  const filtered = ALERTS.filter((a) => statusFilter === 'Todos' || a.status === statusFilter);

  const activeCount = ALERTS.filter((a) => a.status === 'Ativo').length;
  const criticalCount = ALERTS.filter((a) => a.severity === 'Crítico').length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Alertas de Exceção</h1>
          <p className="text-slate-500 text-sm mt-0.5">Notificação automática para atrasos, desvios e falhas de entrega</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 border border-slate-200 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            <Settings className="w-4 h-4" />
            Configurar Regras
          </button>
          <button className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
            <Plus className="w-4 h-4" />
            Nova Regra
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Alertas Ativos',   value: activeCount,   icon: AlertTriangle, color: 'red'     },
          { label: 'Críticos',         value: criticalCount, icon: Zap,           color: 'rose'    },
          { label: 'Em Análise',       value: ALERTS.filter((a) => a.status === 'Em análise').length, icon: Bell, color: 'amber' },
          { label: 'Resolvidos Hoje',  value: ALERTS.filter((a) => a.status === 'Resolvido').length, icon: CheckCircle2, color: 'emerald' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 bg-${s.color}-50`}>
                <Icon className={`w-4 h-4 text-${s.color}-600`} />
              </div>
              <div className="text-2xl font-bold text-slate-800">{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        {(['Todos', ...STATUSES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === s ? 'bg-emerald-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Alert List */}
      <div className="space-y-3">
        {filtered.map((alert) => (
          <div key={alert.id} className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <span className={`px-2 py-1 rounded text-xs font-bold flex-shrink-0 mt-0.5 ${SEVERITY_BADGE[alert.severity]}`}>{alert.severity}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs text-slate-500 font-medium">{alert.type}</span>
                    <p className="text-sm font-medium text-slate-800 mt-0.5">{alert.message}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${STATUS_BADGE[alert.status]}`}>{alert.status}</span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                  <span>{alert.orders} pedido(s)</span>
                  <span>Transportadora: <span className="text-slate-700">{alert.carrier}</span></span>
                  <span>Detectado: {alert.detectedAt}</span>
                </div>
                {alert.autoAction && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg w-fit">
                    <Zap className="w-3 h-3" />
                    Ação automática: {alert.autoAction}
                  </div>
                )}
              </div>
              {alert.status !== 'Resolvido' && (
                <button className="text-xs border border-slate-200 px-3 py-1.5 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors flex-shrink-0">
                  Atender
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Rules */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Regras de Alerta Configuradas</h2>
          <button className="text-sm text-emerald-600 hover:underline">Gerenciar todas</button>
        </div>
        <div className="divide-y divide-slate-50">
          {ALERT_RULES.map((rule, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3.5">
              <div>
                <div className="text-sm font-medium text-slate-800">{rule.rule}</div>
                <div className="text-xs text-slate-500 mt-0.5">Ação: {rule.action}</div>
              </div>
              <div className={`w-10 h-5 rounded-full flex items-center ${rule.active ? 'bg-emerald-500' : 'bg-slate-200'} p-0.5 cursor-pointer`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow transition-all ${rule.active ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
