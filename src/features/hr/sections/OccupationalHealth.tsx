import { useState } from 'react';
import { Plus, AlertTriangle, CheckCircle2, Clock, Zap, Shield } from 'lucide-react';

/* ── Types ──────────────────────────────────────────────────────────────── */

type ASOStatus   = 'Válido' | 'Vencendo em 30d' | 'Vencido' | 'Agendado';
type ExamType    = 'Admissional' | 'Periódico' | 'Demissional' | 'Retorno ao Trabalho' | 'Mudança de Função';
type EPIStatus   = 'Em Estoque' | 'Baixo Estoque' | 'Esgotado';
type DocStatus   = 'Válido' | 'Em Revisão' | 'Vencido' | 'Aguardando Aprovação';
type AccidentLevel = 'Leve' | 'Moderado' | 'Grave';

interface ASO {
  id:          string;
  employee:    string;
  position:    string;
  examType:    ExamType;
  examDate:    string;
  nextExam:    string;
  status:      ASOStatus;
  physician:   string;
  conclusion:  'Apto' | 'Apto com Restrições' | 'Inapto';
}

interface EPI {
  id:           string;
  name:         string;
  caNumber:     string;    // Certificado de Aprovação
  stock:        number;
  minStock:     number;
  status:       EPIStatus;
  assignedTo:   number;    // count
  lastIssue:    string;
}

interface RegulatoryDoc {
  id:       string;
  name:     string;
  status:   DocStatus;
  validity: string;
  responsible: string;
  lastReview:  string;
}

interface Accident {
  id:           string;
  employee:     string;
  position:     string;
  date:         string;
  description:  string;
  level:        AccidentLevel;
  catNumber?:   string;
  eamOsNumber?: string;
  timesheetApplied: boolean;
  legalNotified:    boolean;
}

/* ── Mock data ──────────────────────────────────────────────────────────── */

const ASOS: ASO[] = [
  { id: 'A001', employee: 'Ana Paula Ferreira',  position: 'Gerente de RH',        examType: 'Periódico',         examDate: '15/01/2026', nextExam: '15/01/2027', status: 'Válido',          physician: 'Dr. Roberto Melo', conclusion: 'Apto' },
  { id: 'A002', employee: 'Carlos Eduardo Lima', position: 'Analista de Sistemas',  examType: 'Periódico',         examDate: '10/03/2025', nextExam: '10/03/2026', status: 'Vencendo em 30d', physician: 'Dr. Roberto Melo', conclusion: 'Apto' },
  { id: 'A003', employee: 'Beatriz Souza',       position: 'Assistente Financeiro', examType: 'Periódico',         examDate: '20/01/2025', nextExam: '20/01/2026', status: 'Vencido',         physician: 'Dra. Carmen Luz',  conclusion: 'Apto' },
  { id: 'A004', employee: 'Rafael Nunes',        position: 'Dev Sênior',            examType: 'Retorno ao Trabalho',examDate: '28/02/2026', nextExam: '28/02/2027', status: 'Válido',         physician: 'Dr. Roberto Melo', conclusion: 'Apto com Restrições' },
  { id: 'A005', employee: 'Marcos Rodrigues',    position: 'Operador de Armazém',   examType: 'Periódico',         examDate: '',           nextExam: '15/03/2026', status: 'Agendado',        physician: 'Dra. Carmen Luz',  conclusion: 'Apto' },
  { id: 'A006', employee: 'Fernanda Oliveira',   position: 'Designer UX',           examType: 'Periódico',         examDate: '05/02/2026', nextExam: '05/02/2027', status: 'Válido',          physician: 'Dr. Roberto Melo', conclusion: 'Apto' },
];

const EPIS: EPI[] = [
  { id: 'EPI001', name: 'Capacete de Segurança',    caNumber: 'CA 31.105', stock: 45, minStock: 10, status: 'Em Estoque', assignedTo: 12, lastIssue: '15/02/2026' },
  { id: 'EPI002', name: 'Luva de Proteção Mecânica',caNumber: 'CA 40.922', stock: 8,  minStock: 20, status: 'Baixo Estoque', assignedTo: 24, lastIssue: '10/02/2026' },
  { id: 'EPI003', name: 'Óculos de Proteção',       caNumber: 'CA 14.174', stock: 32, minStock: 10, status: 'Em Estoque', assignedTo: 18, lastIssue: '20/01/2026' },
  { id: 'EPI004', name: 'Protetor Auricular',        caNumber: 'CA 5.674',  stock: 0,  minStock: 30, status: 'Esgotado',   assignedTo: 28, lastIssue: '05/01/2026' },
  { id: 'EPI005', name: 'Bota de Segurança',         caNumber: 'CA 28.212', stock: 15, minStock: 5,  status: 'Em Estoque', assignedTo: 10, lastIssue: '01/02/2026' },
  { id: 'EPI006', name: 'Colete Refletivo',          caNumber: 'CA 21.031', stock: 22, minStock: 8,  status: 'Em Estoque', assignedTo: 8,  lastIssue: '18/01/2026' },
];

const REGULATORY_DOCS: RegulatoryDoc[] = [
  { id: 'DOC001', name: 'PPRA — Programa de Prevenção de Riscos Ambientais',           status: 'Válido',              validity: '31/12/2026', responsible: 'Dr. Cláudio Ávila (SESMT)', lastReview: '10/01/2026' },
  { id: 'DOC002', name: 'PCMSO — Programa de Controle Médico de Saúde Ocupacional',    status: 'Em Revisão',          validity: '31/12/2026', responsible: 'Dr. Roberto Melo (Médico do Trabalho)', lastReview: '15/01/2026' },
  { id: 'DOC003', name: 'LTCAT — Laudo Técnico das Condições Ambientais de Trabalho',  status: 'Aguardando Aprovação',validity: '31/12/2025', responsible: 'Eng. Maurício Santos',      lastReview: '05/12/2025' },
  { id: 'DOC004', name: 'PGR — Programa de Gerenciamento de Riscos (NR-1)',             status: 'Válido',              validity: '30/06/2026', responsible: 'Eng. Maurício Santos',      lastReview: '20/01/2026' },
];

const ACCIDENTS: Accident[] = [
  {
    id: 'ACC001', employee: 'Marcos Rodrigues', position: 'Operador de Armazém',
    date: '25/02/2026', description: 'Queda com esmagamento de dedo durante movimentação de palete no armazém B',
    level: 'Moderado',
    catNumber: 'CAT-2026-00047',
    eamOsNumber: 'OS-EAM-4892',
    timesheetApplied: true,
    legalNotified: true,
  },
  {
    id: 'ACC002', employee: 'Ricardo Alves', position: 'Assistente de Logística',
    date: '12/01/2026', description: 'Corte leve na mão ao manusear embalagem sem EPI adequado',
    level: 'Leve',
    catNumber: 'CAT-2026-00003',
    eamOsNumber: undefined,
    timesheetApplied: false,
    legalNotified: false,
  },
];

/* ── Style maps ─────────────────────────────────────────────────────────── */

const ASO_BADGE: Record<ASOStatus, string> = {
  'Válido':          'bg-green-100 text-green-700',
  'Vencendo em 30d': 'bg-amber-100 text-amber-700',
  'Vencido':         'bg-rose-100 text-rose-700',
  'Agendado':        'bg-blue-100 text-blue-700',
};

const EPI_BADGE: Record<EPIStatus, string> = {
  'Em Estoque':    'bg-green-100 text-green-700',
  'Baixo Estoque': 'bg-amber-100 text-amber-700',
  'Esgotado':      'bg-rose-100 text-rose-700',
};

const DOC_BADGE: Record<DocStatus, string> = {
  'Válido':               'bg-green-100 text-green-700',
  'Em Revisão':           'bg-indigo-100 text-indigo-700',
  'Vencido':              'bg-rose-100 text-rose-700',
  'Aguardando Aprovação': 'bg-amber-100 text-amber-700',
};

const ACCIDENT_BADGE: Record<AccidentLevel, string> = {
  Leve:     'bg-amber-100 text-amber-700',
  Moderado: 'bg-orange-100 text-orange-700',
  Grave:    'bg-rose-100 text-rose-700',
};

/* ── Sub-tabs ───────────────────────────────────────────────────────────── */

function ASOsTab() {
  const expired = ASOS.filter((a) => a.status === 'Vencido').length;
  const expiring = ASOS.filter((a) => a.status === 'Vencendo em 30d').length;

  return (
    <div className="space-y-4">
      {(expired > 0 || expiring > 0) && (
        <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-xl px-5 py-4">
          <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-rose-800">
              {expired > 0 ? `${expired} ASO vencido${expired > 1 ? 's' : ''}` : ''}
              {expired > 0 && expiring > 0 ? ' · ' : ''}
              {expiring > 0 ? `${expiring} vencendo em 30 dias` : ''}
            </p>
            <p className="text-xs text-rose-600 mt-0.5">
              Colaboradores com ASO vencido não devem exercer atividades de risco. Agendar exames imediatamente.
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button className="flex items-center gap-2 px-3 py-1.5 text-xs text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 font-medium">
          <Plus className="w-3 h-3" /> Novo ASO
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['Colaborador', 'Tipo de Exame', 'Realizado em', 'Próximo Exame', 'Conclusão', 'Status'].map((h, i) => (
                  <th key={h} className={`${i === 0 ? 'text-left px-5' : 'text-center px-4'} py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {ASOS.map((a) => (
                <tr key={a.id} className={`hover:bg-slate-50/60 transition-colors ${a.status === 'Vencido' ? 'bg-rose-50/20' : ''}`}>
                  <td className="px-5 py-3">
                    <p className="font-medium text-slate-800">{a.employee}</p>
                    <p className="text-xs text-slate-400">{a.position}</p>
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-slate-600">{a.examType}</td>
                  <td className="px-4 py-3 text-center text-xs text-slate-500">{a.examDate || '—'}</td>
                  <td className="px-4 py-3 text-center text-xs text-slate-500">{a.nextExam}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-semibold ${a.conclusion === 'Apto' ? 'text-green-600' : a.conclusion === 'Inapto' ? 'text-rose-600' : 'text-amber-600'}`}>
                      {a.conclusion}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${ASO_BADGE[a.status]}`}>{a.status}</span>
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

function EPIsTab() {
  const stockAlerts = EPIS.filter((e) => e.status !== 'Em Estoque').length;

  return (
    <div className="space-y-4">
      {stockAlerts > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-amber-800">
            {stockAlerts} EPI{stockAlerts > 1 ? 's' : ''} com estoque crítico — reposição necessária para conformidade com NRs.
          </p>
        </div>
      )}

      <div className="flex justify-end">
        <button className="flex items-center gap-2 px-3 py-1.5 text-xs text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 font-medium">
          <Plus className="w-3 h-3" /> Registrar EPI
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {EPIS.map((e) => (
          <div key={e.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-slate-800 text-sm">{e.name}</p>
                <p className="text-xs text-slate-400">CA: {e.caNumber}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${EPI_BADGE[e.status]}`}>{e.status}</span>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              {[
                { label: 'Em Estoque',    value: e.stock.toString()          },
                { label: 'Mínimo',        value: e.minStock.toString()       },
                { label: 'Entregues',     value: e.assignedTo.toString()     },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">{s.label}</p>
                  <p className={`text-lg font-bold ${e.status === 'Esgotado' ? 'text-rose-600' : e.status === 'Baixo Estoque' ? 'text-amber-600' : 'text-slate-800'}`}>{s.value}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-100">
              <span>Última entrega: {e.lastIssue}</span>
              <button className="text-indigo-600 font-semibold hover:text-indigo-700">Registrar Entrega</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgramsTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-5 py-4">
        <Shield className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
        <p className="text-sm text-indigo-700">
          Documentos regulatórios obrigatórios (NR-7, NR-9, NR-1) — vencimentos e revisões controlados automaticamente.
        </p>
      </div>

      <div className="flex justify-end">
        <button className="flex items-center gap-2 px-3 py-1.5 text-xs text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 font-medium">
          <Plus className="w-3 h-3" /> Novo Documento
        </button>
      </div>

      <div className="space-y-3">
        {REGULATORY_DOCS.map((doc) => (
          <div key={doc.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0 mr-4">
                <p className="font-semibold text-slate-800 text-sm">{doc.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">Responsável: {doc.responsible}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${DOC_BADGE[doc.status]}`}>{doc.status}</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm border-t border-slate-100 pt-3">
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Validade</p>
                <p className="font-medium text-slate-700">{doc.validity}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Última Revisão</p>
                <p className="font-medium text-slate-700">{doc.lastReview}</p>
              </div>
              <div className="flex items-end">
                <button className="text-xs text-indigo-600 font-semibold hover:text-indigo-700">Ver Documento</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AccidentsTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Acidentes registrados geram automaticamente: CAT, OS no EAM, afastamento no ponto e notificação ao jurídico
        </p>
        <button className="flex items-center gap-2 px-3 py-1.5 text-xs text-white bg-rose-600 rounded-lg hover:bg-rose-700 font-medium">
          <Plus className="w-3 h-3" /> Registrar Acidente
        </button>
      </div>

      <div className="space-y-4">
        {ACCIDENTS.map((acc) => (
          <div key={acc.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className={`px-5 py-4 border-b ${acc.level === 'Leve' ? 'border-amber-100 bg-amber-50/40' : acc.level === 'Moderado' ? 'border-orange-100 bg-orange-50/40' : 'border-rose-100 bg-rose-50/40'}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-slate-800">{acc.employee}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${ACCIDENT_BADGE[acc.level]}`}>{acc.level}</span>
                  </div>
                  <p className="text-xs text-slate-500">{acc.position} · {acc.date}</p>
                  <p className="text-sm text-slate-700 mt-2">{acc.description}</p>
                </div>
              </div>
            </div>

            {/* Integration cascade */}
            <div className="px-5 py-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-indigo-400" /> Integrações Automáticas
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: 'CAT Emitida',
                    value: acc.catNumber ?? null,
                    done: !!acc.catNumber,
                    detail: acc.catNumber ? `Número: ${acc.catNumber}` : 'Pendente — emitir junto ao INSS',
                  },
                  {
                    label: 'OS Aberta no EAM',
                    value: acc.eamOsNumber ?? null,
                    done: !!acc.eamOsNumber,
                    detail: acc.eamOsNumber ? `OS: ${acc.eamOsNumber} — Manutenção notificada` : 'Não aplicável para este tipo de acidente',
                  },
                  {
                    label: 'Afastamento no Ponto',
                    value: null,
                    done: acc.timesheetApplied,
                    detail: acc.timesheetApplied ? 'Colaborador afastado no espelho de ponto' : 'Afastamento não aplicado — acidente leve',
                  },
                  {
                    label: 'Jurídico Acionado',
                    value: null,
                    done: acc.legalNotified,
                    detail: acc.legalNotified ? 'Ticket aberto no módulo jurídico' : 'Não acionado — aguardando triagem',
                  },
                ].map((item) => (
                  <div key={item.label} className={`rounded-lg border p-3 flex items-start gap-3 ${item.done ? 'border-green-200 bg-green-50/50' : 'border-slate-200 bg-slate-50/50'}`}>
                    {item.done
                      ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                      : <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    }
                    <div>
                      <p className="text-xs font-semibold text-slate-700">{item.label}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────────────────────── */

const TABS = [
  { id: 'asos',      label: 'ASOs'            },
  { id: 'epis',      label: 'EPIs'            },
  { id: 'programs',  label: 'PPRA / PCMSO'    },
  { id: 'accidents', label: 'Acidentes e CAT' },
] as const;

type TabId = typeof TABS[number]['id'];

export default function OccupationalHealth() {
  const [tab, setTab] = useState<TabId>('asos');

  const expired = ASOS.filter((a) => a.status === 'Vencido').length;
  const pendingAcc = ACCIDENTS.filter((a) => !a.catNumber).length;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">SST — Saúde e Segurança no Trabalho</h1>
        <p className="text-slate-500 text-sm mt-1">
          ASOs, EPIs, PPRA/PCMSO e acidentes com geração automática de CAT, OS no EAM, afastamento no ponto e acionamento jurídico
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
            {t.id === 'asos' && expired > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black flex items-center justify-center">
                {expired}
              </span>
            )}
            {t.id === 'accidents' && pendingAcc > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black flex items-center justify-center">
                {pendingAcc}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'asos'      && <ASOsTab />}
      {tab === 'epis'      && <EPIsTab />}
      {tab === 'programs'  && <ProgramsTab />}
      {tab === 'accidents' && <AccidentsTab />}
    </div>
  );
}
