import { useState } from 'react';
import { CheckCircle2, Clock, Upload, Smartphone, Plus, AlertTriangle, ToggleRight, ToggleLeft } from 'lucide-react';

/* ── Types ──────────────────────────────────────────────────────────────── */

type RequestType   = 'Atestado Médico' | 'Solicitação de Férias' | 'Correção de Ponto' | 'Holerite' | 'Declaração de IR';
type RequestStatus = 'Pendente' | 'Em Análise' | 'Aprovado' | 'Recusado';

interface PortalRequest {
  id:        string;
  employee:  string;
  position:  string;
  type:      RequestType;
  date:      string;
  status:    RequestStatus;
  detail:    string;
  ocrDone?:  boolean;   // for medical certs
}

interface PortalFeature {
  id:          string;
  name:        string;
  description: string;
  enabled:     boolean;
  ocrSupport:  boolean;
}

/* ── Mock data ──────────────────────────────────────────────────────────── */

const REQUESTS: PortalRequest[] = [
  { id: 'PR001', employee: 'Carlos Eduardo Lima',  position: 'Analista de Sistemas',   type: 'Atestado Médico',   date: '28/02/2026', status: 'Pendente',   detail: 'Atestado de 2 dias — CRM Dr. Silva (CRF-SP)', ocrDone: true  },
  { id: 'PR002', employee: 'Beatriz Souza',        position: 'Assistente Financeiro',  type: 'Solicitação de Férias', date: '27/02/2026', status: 'Em Análise', detail: '15 dias a partir de 20/03/2026'                               },
  { id: 'PR003', employee: 'Rafael Nunes',         position: 'Dev Sênior',             type: 'Correção de Ponto', date: '26/02/2026', status: 'Pendente',   detail: 'Esqueci de bater saída em 25/02 — saída real 18:30'           },
  { id: 'PR004', employee: 'Fernanda Oliveira',    position: 'Designer UX',            type: 'Holerite',          date: '25/02/2026', status: 'Aprovado',   detail: 'Holerite fev/2026 — download realizado'                       },
  { id: 'PR005', employee: 'Marcos Rodrigues',     position: 'Operador de Armazém',    type: 'Atestado Médico',   date: '25/02/2026', status: 'Em Análise', detail: 'Atestado de 3 dias — ortopedia', ocrDone: false               },
  { id: 'PR006', employee: 'Patrícia Souza',       position: 'Analista de Marketing',  type: 'Solicitação de Férias', date: '24/02/2026', status: 'Aprovado',   detail: '30 dias a partir de 01/04/2026 — aprovado pelo gestor'       },
  { id: 'PR007', employee: 'Guilherme Martins',    position: 'Esp. em Produto',        type: 'Declaração de IR',  date: '23/02/2026', status: 'Aprovado',   detail: 'Declaração de Rendimentos 2025 — emitida automaticamente'     },
];

const FEATURES_INITIAL: PortalFeature[] = [
  { id: 'F001', name: 'Holerite Digital',         description: 'Visualização e download do contracheque',              enabled: true,  ocrSupport: false },
  { id: 'F002', name: 'Espelho de Ponto',          description: 'Consulta de registros de ponto e saldo de horas',     enabled: true,  ocrSupport: false },
  { id: 'F003', name: 'Envio de Atestado (OCR)',   description: 'Upload com extração automática de dados via OCR',     enabled: true,  ocrSupport: true  },
  { id: 'F004', name: 'Solicitação de Férias',     description: 'Pedido de férias sem intermediário do RH',            enabled: true,  ocrSupport: false },
  { id: 'F005', name: 'Declaração de IR',          description: 'Informe de rendimentos gerado automaticamente',       enabled: true,  ocrSupport: false },
  { id: 'F006', name: 'Correção de Ponto',         description: 'Solicitação de ajuste com justificativa e evidência', enabled: true,  ocrSupport: false },
  { id: 'F007', name: 'Chat com RH',               description: 'Canal de mensagens direto com a equipe de RH',        enabled: false, ocrSupport: false },
];

/* ── Style maps ─────────────────────────────────────────────────────────── */

const STATUS_BADGE: Record<RequestStatus, string> = {
  'Pendente':   'bg-amber-100 text-amber-700',
  'Em Análise': 'bg-indigo-100 text-indigo-700',
  'Aprovado':   'bg-green-100 text-green-700',
  'Recusado':   'bg-rose-100 text-rose-700',
};

const TYPE_BADGE: Record<RequestType, string> = {
  'Atestado Médico':     'bg-rose-50 text-rose-700',
  'Solicitação de Férias':'bg-blue-50 text-blue-700',
  'Correção de Ponto':   'bg-amber-50 text-amber-700',
  'Holerite':            'bg-slate-100 text-slate-600',
  'Declaração de IR':    'bg-purple-50 text-purple-700',
};

/* ── Sub-tabs ───────────────────────────────────────────────────────────── */

function RequestsTab() {
  const pending = REQUESTS.filter((r) => r.status === 'Pendente').length;
  const ocrPending = REQUESTS.filter((r) => r.ocrDone === false).length;

  return (
    <div className="space-y-4">
      {(pending > 0 || ocrPending > 0) && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {pending} solicitaç{pending === 1 ? 'ão pendente' : 'ões pendentes'}
              {ocrPending > 0 ? ` · ${ocrPending} atestado${ocrPending > 1 ? 's' : ''} aguardando validação OCR` : ''}
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Atestados enviados pelo portal passam por OCR automático antes da aprovação.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Solicitações Recebidas pelo Portal</h3>
          <p className="text-xs text-slate-400 mt-0.5">Enviadas pelos colaboradores via app/web — sem intermediário manual do RH</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Colaborador</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Detalhe</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">OCR</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {REQUESTS.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-800">{r.employee}</p>
                    <p className="text-xs text-slate-400">{r.position}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${TYPE_BADGE[r.type]}`}>{r.type}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px] truncate">{r.detail}</td>
                  <td className="px-4 py-3 text-center text-xs text-slate-500">{r.date}</td>
                  <td className="px-4 py-3 text-center">
                    {r.ocrDone === true  && <span className="text-xs text-green-600 font-semibold flex items-center justify-center gap-1"><CheckCircle2 className="w-3 h-3" /> OK</span>}
                    {r.ocrDone === false && <span className="text-xs text-amber-600 font-semibold flex items-center justify-center gap-1"><Clock className="w-3 h-3" /> Processando</span>}
                    {r.ocrDone === undefined && <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_BADGE[r.status]}`}>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ConfigTab() {
  const [features, setFeatures] = useState<PortalFeature[]>(FEATURES_INITIAL);

  function toggle(id: string) {
    setFeatures((prev) => prev.map((f) => f.id === id ? { ...f, enabled: !f.enabled } : f));
  }

  return (
    <div className="space-y-6">
      {/* Portal preview card */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Smartphone className="w-6 h-6 text-white/80" />
          <div>
            <h3 className="font-bold text-white">Portal do Colaborador</h3>
            <p className="text-white/70 text-xs">Interface self-service · Web + Mobile</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {['Holerite', 'Espelho de Ponto', 'Férias', 'Atestado', 'Declaração IR', 'Ajuste Ponto'].map((item) => (
            <div key={item} className="bg-white/10 rounded-lg px-3 py-2 text-xs text-white/90 font-medium text-center">
              {item}
            </div>
          ))}
        </div>
        <p className="text-white/60 text-[11px] mt-3">
          Acesso via SSO corporativo · Atestados processados por OCR automático
        </p>
      </div>

      {/* Feature toggles */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">Funcionalidades do Portal</h3>
          <button className="flex items-center gap-2 px-3 py-1.5 text-xs text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 font-medium">
            <Plus className="w-3 h-3" /> Nova Funcionalidade
          </button>
        </div>
        <div className="divide-y divide-slate-50">
          {features.map((f) => (
            <div key={f.id} className="flex items-center gap-4 px-5 py-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-medium text-slate-800 text-sm">{f.name}</span>
                  {f.ocrSupport && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700">
                      <Upload className="w-2.5 h-2.5" /> OCR
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">{f.description}</p>
              </div>
              <button
                onClick={() => toggle(f.id)}
                className={`shrink-0 transition-colors ${f.enabled ? 'text-green-500' : 'text-slate-300'}`}
              >
                {f.enabled
                  ? <ToggleRight className="w-7 h-7" />
                  : <ToggleLeft  className="w-7 h-7" />
                }
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────────────────────── */

const TABS = [
  { id: 'requests', label: 'Solicitações Recebidas' },
  { id: 'config',   label: 'Configuração do Portal' },
] as const;

type TabId = typeof TABS[number]['id'];

export default function EmployeePortal() {
  const [tab, setTab] = useState<TabId>('requests');
  const pendingCount = REQUESTS.filter((r) => r.status === 'Pendente').length;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Portal do Colaborador</h1>
        <p className="text-slate-500 text-sm mt-1">
          Self-service mobile/web: holerite, espelho de ponto, atestados via OCR e férias sem intermediário do RH
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
            {t.id === 'requests' && pendingCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black flex items-center justify-center">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'requests' && <RequestsTab />}
      {tab === 'config'   && <ConfigTab />}
    </div>
  );
}
