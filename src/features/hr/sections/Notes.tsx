import { useState } from 'react';
import { Plus, AlertTriangle, CheckCircle2, FileSignature, Scale, ChevronDown, ChevronUp, Clock } from 'lucide-react';

/* ── Types ──────────────────────────────────────────────────────────────── */

type NoteCategory  = 'Performance' | 'Comportamental' | 'Elogio' | 'Absenteísmo' | 'Conformidade';
type RoutingTarget = 'ERP' | 'CRM' | 'Jurídico';
type ImpactType    = 'Nenhum' | 'Dedução em Folha' | 'Bônus' | 'Suspensão Não Remunerada';

type WarningLevel = 'Verbal' | 'Escrita' | 'Suspensão';
type SigStatus    = 'Pendente Assinatura' | 'Assinado' | 'Contestado' | 'Cancelado';

interface NoteType {
  id:              string;
  name:            string;
  category:        NoteCategory;
  routing:         RoutingTarget[];
  impact:          ImpactType;
  impactValue?:    string;
  autoRoute:       boolean;
  legalIntegration:boolean;
}

interface Warning {
  id:              string;
  employee:        string;
  position:        string;
  level:           WarningLevel;
  date:            string;
  reason:          string;
  issuer:          string;
  sigStatus:       SigStatus;
  sigDate?:        string;
  legalIntegration:boolean;
  observation?:    string;
  priorCount:      number;
}

/* ── Mock data ──────────────────────────────────────────────────────────── */

const NOTE_TYPES: NoteType[] = [
  {
    id: 'NT001', name: 'Nota de Performance Negativa', category: 'Performance',
    routing: ['ERP'], impact: 'Dedução em Folha', impactValue: 'Conforme fórmula de bônus',
    autoRoute: true, legalIntegration: false,
  },
  {
    id: 'NT002', name: 'Elogio Formal', category: 'Elogio',
    routing: ['ERP', 'CRM'], impact: 'Bônus', impactValue: 'R$ 200 – R$ 2.000 (conforme nível do cargo)',
    autoRoute: true, legalIntegration: false,
  },
  {
    id: 'NT003', name: 'Nota Comportamental', category: 'Comportamental',
    routing: ['Jurídico'], impact: 'Nenhum',
    autoRoute: false, legalIntegration: true,
  },
  {
    id: 'NT004', name: 'Registro de Absenteísmo', category: 'Absenteísmo',
    routing: ['ERP'], impact: 'Dedução em Folha', impactValue: 'Proporcional aos dias ausentes',
    autoRoute: true, legalIntegration: false,
  },
  {
    id: 'NT005', name: 'Não Conformidade Regulatória', category: 'Conformidade',
    routing: ['ERP', 'Jurídico'], impact: 'Suspensão Não Remunerada',
    autoRoute: true, legalIntegration: true,
  },
];

const WARNINGS: Warning[] = [
  {
    id: 'W001', employee: 'Rafael Nunes', position: 'Dev Sênior', level: 'Escrita',
    date: '12/02/2026', reason: 'Retrabalho recorrente causando atrasos em entregas críticas (3ª ocorrência no período)',
    issuer: 'Ana Paula Ferreira', sigStatus: 'Pendente Assinatura', legalIntegration: false, priorCount: 2,
  },
  {
    id: 'W002', employee: 'Carlos Eduardo Lima', position: 'Analista de Sistemas', level: 'Verbal',
    date: '05/02/2026', reason: 'Atraso recorrente nos registros de ponto (5 ocorrências em 30 dias)',
    issuer: 'Ana Paula Ferreira', sigStatus: 'Assinado', sigDate: '06/02/2026', legalIntegration: false, priorCount: 0,
  },
  {
    id: 'W003', employee: 'Guilherme Martins', position: 'Esp. em Produto', level: 'Suspensão',
    date: '18/01/2026', reason: 'Comportamento inadequado com cliente externo — violação do código de conduta',
    issuer: 'Diretoria', sigStatus: 'Contestado', legalIntegration: true,
    observation: 'Colaborador abriu contestação formal. Aguardando análise do departamento jurídico.',
    priorCount: 1,
  },
  {
    id: 'W004', employee: 'Beatriz Souza', position: 'Assistente Financeiro', level: 'Verbal',
    date: '28/01/2026', reason: 'Erro de digitação em relatório financeiro com impacto no fechamento do mês',
    issuer: 'Gerência Financeira', sigStatus: 'Assinado', sigDate: '28/01/2026', legalIntegration: false, priorCount: 0,
  },
];

/* ── Static style maps ──────────────────────────────────────────────────── */

const CAT_BADGE: Record<NoteCategory, string> = {
  'Performance':    'bg-amber-100 text-amber-700',
  'Comportamental': 'bg-rose-100 text-rose-700',
  'Elogio':         'bg-green-100 text-green-700',
  'Absenteísmo':    'bg-orange-100 text-orange-700',
  'Conformidade':   'bg-purple-100 text-purple-700',
};

const TARGET_BADGE: Record<RoutingTarget, string> = {
  'ERP':      'bg-blue-100 text-blue-700',
  'CRM':      'bg-emerald-100 text-emerald-700',
  'Jurídico': 'bg-rose-100 text-rose-700',
};

const WARN_BADGE: Record<WarningLevel, string> = {
  'Verbal':    'bg-amber-100 text-amber-700',
  'Escrita':   'bg-orange-100 text-orange-700',
  'Suspensão': 'bg-rose-100 text-rose-700',
};

const SIG_BADGE: Record<SigStatus, string> = {
  'Pendente Assinatura': 'bg-amber-50 text-amber-700 border border-amber-200',
  'Assinado':            'bg-green-50 text-green-700 border border-green-200',
  'Contestado':          'bg-rose-50 text-rose-700 border border-rose-200',
  'Cancelado':           'bg-slate-100 text-slate-500 border border-slate-200',
};

/* ── Note types tab ─────────────────────────────────────────────────────── */

function NoteTypesTab() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Tipos com roteamento automático para ERP/CRM e impacto financeiro configurável
        </p>
        <button className="flex items-center gap-2 px-3 py-1.5 text-xs text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 font-medium">
          <Plus className="w-3 h-3" /> Novo Tipo
        </button>
      </div>

      {NOTE_TYPES.map((nt) => (
        <div key={nt.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div
            className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50/40 transition-colors"
            onClick={() => setExpanded(expanded === nt.id ? null : nt.id)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="font-semibold text-slate-800 text-sm">{nt.name}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${CAT_BADGE[nt.category]}`}>
                  {nt.category}
                </span>
                {nt.legalIntegration && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700 flex items-center gap-0.5">
                    <Scale className="w-2.5 h-2.5" /> Integração Jurídica
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-400">Roteamento:</span>
                {nt.routing.map((r) => (
                  <span key={r} className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${TARGET_BADGE[r]}`}>{r}</span>
                ))}
                <span className={`ml-1 text-xs font-medium ${nt.autoRoute ? 'text-green-600' : 'text-slate-400'}`}>
                  {nt.autoRoute ? '● Automático' : '○ Manual'}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0 mr-2">
              <p className="text-xs text-slate-400">Impacto</p>
              <p className="text-sm font-semibold text-slate-700">{nt.impact}</p>
            </div>
            {expanded === nt.id
              ? <ChevronUp   className="w-4 h-4 text-slate-400 shrink-0" />
              : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            }
          </div>

          {expanded === nt.id && (
            <div className="border-t border-slate-100 px-5 py-4 bg-slate-50/40">
              <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Impacto Financeiro</p>
                  <p className="font-medium text-slate-700">{nt.impactValue ?? 'Sem impacto direto'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Roteamento Automático</p>
                  <p className="font-medium text-slate-700">
                    {nt.autoRoute ? 'Sim — ao lançar a anotação' : 'Não — requer aprovação manual'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Integração Jurídica</p>
                  <p className="font-medium text-slate-700">
                    {nt.legalIntegration ? 'Ativa — registrado no módulo jurídico' : 'Não aplicável'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Editar Tipo</button>
                <button className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Ver Histórico</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Warnings tab ───────────────────────────────────────────────────────── */

function WarningsTab() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const pending = WARNINGS.filter((w) => w.sigStatus === 'Pendente Assinatura').length;

  return (
    <div className="space-y-5">
      {/* Alert banner */}
      {pending > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {pending} advertência{pending > 1 ? 's' : ''} aguardando assinatura
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              O prazo legal para coleta de assinatura é de 5 dias úteis a partir da emissão.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['Verbal', 'Escrita', 'Suspensão'] as WarningLevel[]).map((l) => (
            <span key={l} className={`px-2 py-0.5 rounded-full text-xs font-semibold ${WARN_BADGE[l]}`}>
              {l}: {WARNINGS.filter((w) => w.level === l).length}
            </span>
          ))}
        </div>
        <button className="flex items-center gap-2 px-3 py-1.5 text-xs text-white bg-rose-600 rounded-lg hover:bg-rose-700 font-medium">
          <Plus className="w-3 h-3" /> Nova Advertência
        </button>
      </div>

      <div className="space-y-3">
        {WARNINGS.map((w) => (
          <div key={w.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div
              className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50/40 transition-colors"
              onClick={() => setExpanded(expanded === w.id ? null : w.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-semibold text-slate-800 text-sm">{w.employee}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${WARN_BADGE[w.level]}`}>{w.level}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${SIG_BADGE[w.sigStatus]}`}>{w.sigStatus}</span>
                  {w.legalIntegration && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700 flex items-center gap-0.5">
                      <Scale className="w-2.5 h-2.5" /> Jurídico
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">{w.position} · {w.date} · emitida por {w.issuer}</p>
                <p className="text-xs text-slate-600 mt-1 truncate">{w.reason}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {w.priorCount > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-rose-600 font-semibold">{w.priorCount} anterior{w.priorCount > 1 ? 'es' : ''}</p>
                    <p className="text-[10px] text-slate-400">advertências</p>
                  </div>
                )}
                {expanded === w.id
                  ? <ChevronUp   className="w-4 h-4 text-slate-400" />
                  : <ChevronDown className="w-4 h-4 text-slate-400" />
                }
              </div>
            </div>

            {expanded === w.id && (
              <div className="border-t border-slate-100 px-5 py-4 bg-slate-50/40 space-y-4">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Motivo completo</p>
                    <p className="text-slate-700">{w.reason}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Status de Assinatura</p>
                    <p className={`font-semibold ${
                      w.sigStatus === 'Assinado'   ? 'text-green-700'
                      : w.sigStatus === 'Contestado' ? 'text-rose-700'
                      : 'text-amber-700'
                    }`}>
                      {w.sigStatus}{w.sigDate ? ` em ${w.sigDate}` : ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 mb-0.5">Integração Jurídica</p>
                    <p className="font-medium text-slate-700">
                      {w.legalIntegration ? 'Enviado ao módulo jurídico' : 'Não aplicável'}
                    </p>
                  </div>
                </div>

                {w.observation && (
                  <div className="bg-rose-50 border border-rose-100 rounded-lg px-4 py-3">
                    <p className="text-xs font-semibold text-rose-700 mb-1">Contestação / Observação</p>
                    <p className="text-xs text-rose-600">{w.observation}</p>
                  </div>
                )}

                {w.sigStatus === 'Pendente Assinatura' && (
                  <div className="flex items-center gap-2 text-xs text-amber-600 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    Prazo expira em {w.date} + 5 dias úteis
                  </div>
                )}

                <div className="flex gap-2">
                  {w.sigStatus === 'Pendente Assinatura' && (
                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700">
                      <FileSignature className="w-3 h-3" /> Registrar Assinatura
                    </button>
                  )}
                  {w.sigStatus === 'Contestado' && (
                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                      <Scale className="w-3 h-3" /> Enviar para Jurídico
                    </button>
                  )}
                  {w.sigStatus === 'Assinado' && (
                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-green-50 border border-green-200 text-green-700 rounded-lg">
                      <CheckCircle2 className="w-3 h-3" /> Assinatura Confirmada
                    </button>
                  )}
                  <button className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
                    Histórico do Colaborador
                  </button>
                  <button className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
                    Imprimir
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────────────────────── */

const TABS = [
  { id: 'types',    label: 'Tipos de Anotações' },
  { id: 'warnings', label: 'Advertências'        },
] as const;

type TabId = typeof TABS[number]['id'];

export default function Notes() {
  const [tab, setTab] = useState<TabId>('types');
  const pendingWarn = WARNINGS.filter((w) => w.sigStatus === 'Pendente Assinatura').length;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Anotações e Advertências</h1>
        <p className="text-slate-500 text-sm mt-1">
          Formalização de ocorrências com impacto financeiro configurável, roteamento automático e integração jurídica
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
            {t.id === 'warnings' && pendingWarn > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black flex items-center justify-center">
                {pendingWarn}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'types'    && <NoteTypesTab />}
      {tab === 'warnings' && <WarningsTab />}
    </div>
  );
}
