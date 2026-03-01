import { useState } from 'react';
import { Plus, Plane, CheckCircle2, AlertTriangle, CreditCard, Upload, Clock } from 'lucide-react';

/* ── Types ──────────────────────────────────────────────────────────────── */

type TravelStatus  = 'Pendente Aprovação' | 'Aprovado' | 'Em Viagem' | 'Encerrado' | 'Recusado';
type ExpenseStatus = 'Aguardando OCR' | 'OCR Concluído' | 'Aprovado' | 'Recusado';
type ExpenseCategory = 'Hospedagem' | 'Transporte' | 'Alimentação' | 'Táxi/Uber' | 'Outros';
type ReconcileStatus = 'Conciliado' | 'Pendente' | 'Divergência';

interface Travel {
  id:          string;
  employee:    string;
  destination: string;
  departure:   string;
  returnDate:  string;
  status:      TravelStatus;
  purpose:     string;
  estimatedCost: number;
  bookedVia:   string;
}

interface Expense {
  id:        string;
  employee:  string;
  category:  ExpenseCategory;
  amount:    number;
  date:      string;
  status:    ExpenseStatus;
  ocrData?:  string;
  travelId?: string;
}

interface CardEntry {
  id:       string;
  date:     string;
  merchant: string;
  amount:   number;
  status:   ReconcileStatus;
  matchedTo?: string;
}

/* ── Mock data ──────────────────────────────────────────────────────────── */

const TRAVELS: Travel[] = [
  { id: 'T001', employee: 'Rafael Nunes',       destination: 'São Paulo → Brasília',    departure: '10/03/2026', returnDate: '12/03/2026', status: 'Aprovado',           purpose: 'Reunião com cliente Gov — Licitação pública',             estimatedCost: 3200, bookedVia: 'Integração BTM Travel' },
  { id: 'T002', employee: 'Ana Paula Ferreira', destination: 'São Paulo → Rio de Janeiro', departure: '15/03/2026', returnDate: '16/03/2026', status: 'Pendente Aprovação', purpose: 'Congresso ABRH Nacional 2026',                           estimatedCost: 1800, bookedVia: 'Integração BTM Travel' },
  { id: 'T003', employee: 'Guilherme Martins',  destination: 'São Paulo → Porto Alegre', departure: '05/03/2026', returnDate: '07/03/2026', status: 'Encerrado',          purpose: 'Onboarding presencial novo cliente — Bancorbrás',        estimatedCost: 2600, bookedVia: 'Integração BTM Travel' },
  { id: 'T004', employee: 'Fernanda Oliveira',  destination: 'São Paulo → Florianópolis',departure: '20/03/2026', returnDate: '22/03/2026', status: 'Pendente Aprovação', purpose: 'Workshop UX Research com equipe do cliente',              estimatedCost: 2100, bookedVia: 'Aguardando reserva'   },
  { id: 'T005', employee: 'Carlos Eduardo Lima',destination: 'São Paulo → Curitiba',     departure: '28/02/2026', returnDate: '01/03/2026', status: 'Em Viagem',         purpose: 'Implantação do módulo ERP na filial sul',                estimatedCost: 1900, bookedVia: 'Integração BTM Travel' },
];

const EXPENSES: Expense[] = [
  { id: 'EX001', employee: 'Rafael Nunes',   category: 'Hospedagem',   amount: 780,  date: '10/03/2026', status: 'OCR Concluído', ocrData: 'Hotel Nobile Brasília — 2 noites',         travelId: 'T001' },
  { id: 'EX002', employee: 'Rafael Nunes',   category: 'Alimentação',  amount: 142,  date: '11/03/2026', status: 'OCR Concluído', ocrData: 'Restaurante Varanda Grill — almoço c/ cliente', travelId: 'T001' },
  { id: 'EX003', employee: 'Rafael Nunes',   category: 'Táxi/Uber',   amount: 68,   date: '10/03/2026', status: 'Aprovado',      ocrData: 'Uber BSB — GRU → Hotel',                  travelId: 'T001' },
  { id: 'EX004', employee: 'Carlos Lima',    category: 'Hospedagem',   amount: 420,  date: '28/02/2026', status: 'Aguardando OCR',                                                     travelId: 'T005' },
  { id: 'EX005', employee: 'Carlos Lima',    category: 'Transporte',   amount: 580,  date: '28/02/2026', status: 'OCR Concluído', ocrData: 'Latam — GRU-CWB ida-volta',                travelId: 'T005' },
  { id: 'EX006', employee: 'Guilherme Martins', category: 'Alimentação', amount: 210, date: '06/03/2026', status: 'Aprovado',     ocrData: 'Restaurante Don Giovanni — jantar equipe',  travelId: 'T003' },
];

const CARD_ENTRIES: CardEntry[] = [
  { id: 'CC001', date: '10/03/2026', merchant: 'Hotel Nobile Brasília',         amount: 780,  status: 'Conciliado',   matchedTo: 'EX001 — R. Nunes' },
  { id: 'CC002', date: '11/03/2026', merchant: 'Varanda Grill Brasília',         amount: 142,  status: 'Conciliado',   matchedTo: 'EX002 — R. Nunes' },
  { id: 'CC003', date: '28/02/2026', merchant: 'LATAM Airlines',                amount: 580,  status: 'Conciliado',   matchedTo: 'EX005 — C. Lima'  },
  { id: 'CC004', date: '01/03/2026', merchant: 'Posto BR Rod. Bandeirantes',     amount: 315,  status: 'Pendente',                                    },
  { id: 'CC005', date: '05/03/2026', merchant: 'GOL Linhas Aéreas',             amount: 890,  status: 'Divergência',  matchedTo: 'Sem recibo cadastrado' },
  { id: 'CC006', date: '06/03/2026', merchant: 'Restaurante Don Giovanni POA',   amount: 210,  status: 'Conciliado',   matchedTo: 'EX006 — G. Martins' },
];

/* ── Helpers ────────────────────────────────────────────────────────────── */

function fmt(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const TRAVEL_STATUS_BADGE: Record<TravelStatus, string> = {
  'Pendente Aprovação': 'bg-amber-100 text-amber-700',
  'Aprovado':           'bg-green-100 text-green-700',
  'Em Viagem':          'bg-blue-100 text-blue-700',
  'Encerrado':          'bg-slate-100 text-slate-500',
  'Recusado':           'bg-rose-100 text-rose-700',
};

const EXPENSE_STATUS_BADGE: Record<ExpenseStatus, string> = {
  'Aguardando OCR':  'bg-amber-100 text-amber-700',
  'OCR Concluído':   'bg-indigo-100 text-indigo-700',
  'Aprovado':        'bg-green-100 text-green-700',
  'Recusado':        'bg-rose-100 text-rose-700',
};

const RECONCILE_BADGE: Record<ReconcileStatus, string> = {
  'Conciliado':  'bg-green-100 text-green-700',
  'Pendente':    'bg-amber-100 text-amber-700',
  'Divergência': 'bg-rose-100 text-rose-700',
};

/* ── Sub-tabs ───────────────────────────────────────────────────────────── */

function TripsTab() {
  const pendingApproval = TRAVELS.filter((t) => t.status === 'Pendente Aprovação').length;

  return (
    <div className="space-y-4">
      {pendingApproval > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-amber-800">
            {pendingApproval} viagem{pendingApproval > 1 ? 's' : ''} aguardando aprovação — reservas ainda não confirmadas.
          </p>
        </div>
      )}

      <div className="flex justify-end">
        <button className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 font-medium">
          <Plus className="w-4 h-4" /> Solicitar Viagem
        </button>
      </div>

      <div className="space-y-3">
        {TRAVELS.map((t) => (
          <div key={t.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Plane className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="font-semibold text-slate-800">{t.employee}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${TRAVEL_STATUS_BADGE[t.status]}`}>{t.status}</span>
                </div>
                <p className="text-sm text-slate-600 font-medium ml-6">{t.destination}</p>
                <p className="text-xs text-slate-400 ml-6">{t.departure} → {t.returnDate} · {t.purpose}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-bold text-slate-800">{fmt(t.estimatedCost)}</p>
                <p className="text-[10px] text-slate-400">estimado</p>
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-400">Reserva: {t.bookedVia}</span>
              <div className="flex gap-2">
                {t.status === 'Pendente Aprovação' && (
                  <>
                    <button className="px-3 py-1.5 text-xs font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700">Aprovar</button>
                    <button className="px-3 py-1.5 text-xs font-semibold bg-white border border-rose-200 text-rose-600 rounded-lg hover:bg-rose-50">Recusar</button>
                  </>
                )}
                {t.status === 'Aprovado' && (
                  <span className="flex items-center gap-1 text-xs text-green-600 font-semibold">
                    <CheckCircle2 className="w-3 h-3" /> Reserva Confirmada
                  </span>
                )}
                {t.status === 'Em Viagem' && (
                  <span className="flex items-center gap-1 text-xs text-blue-600 font-semibold">
                    <Plane className="w-3 h-3" /> Em andamento
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExpensesTab() {
  const ocrPending = EXPENSES.filter((e) => e.status === 'Aguardando OCR').length;

  return (
    <div className="space-y-4">
      {ocrPending > 0 && (
        <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-5 py-4">
          <Clock className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
          <p className="text-sm text-indigo-700">
            <span className="font-semibold">{ocrPending} recibo{ocrPending > 1 ? 's' : ''}</span> aguardando processamento OCR — dados extraídos automaticamente do app mobile.
          </p>
        </div>
      )}

      <div className="flex justify-end">
        <button className="flex items-center gap-2 px-3 py-1.5 text-xs text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 font-medium">
          <Upload className="w-3 h-3" /> Upload de Recibo
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['Colaborador', 'Categoria', 'OCR — Dados Extraídos', 'Data', 'Valor', 'Status'].map((h, i) => (
                  <th key={h} className={`${i === 0 || i === 2 ? 'text-left' : 'text-center'} px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {EXPENSES.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{e.employee}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">{e.category}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px]">
                    {e.ocrData ?? <span className="italic text-slate-300">Processando...</span>}
                  </td>
                  <td className="px-4 py-3 text-center text-xs text-slate-500">{e.date}</td>
                  <td className="px-4 py-3 text-center font-semibold text-slate-800">{fmt(e.amount)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${EXPENSE_STATUS_BADGE[e.status]}`}>{e.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t border-slate-200">
                <td className="px-4 py-3 text-xs font-semibold text-slate-500" colSpan={4}>Total de despesas</td>
                <td className="px-4 py-3 text-center font-bold text-slate-800">
                  {fmt(EXPENSES.reduce((s, e) => s + e.amount, 0))}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

function ReconciliationTab() {
  const divergences = CARD_ENTRIES.filter((c) => c.status === 'Divergência').length;

  return (
    <div className="space-y-4">
      {divergences > 0 && (
        <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-xl px-5 py-4">
          <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-rose-800">{divergences} lançamento{divergences > 1 ? 's' : ''} com divergência no cartão corporativo</p>
            <p className="text-xs text-rose-600 mt-0.5">Compras no cartão sem recibo correspondente cadastrado. Solicite regularização ao colaborador.</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <CreditCard className="w-4 h-4 text-slate-400" />
          Conciliação automática com cartão corporativo — última sincronização: há 15 min
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['Data', 'Estabelecimento', 'Valor', 'Conciliado com', 'Status'].map((h, i) => (
                  <th key={h} className={`${i === 1 ? 'text-left' : 'text-center'} px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {CARD_ENTRIES.map((c) => (
                <tr key={c.id} className={`hover:bg-slate-50/60 transition-colors ${c.status === 'Divergência' ? 'bg-rose-50/30' : ''}`}>
                  <td className="px-4 py-3 text-center text-xs text-slate-500">{c.date}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{c.merchant}</td>
                  <td className="px-4 py-3 text-center font-semibold text-slate-800">{fmt(c.amount)}</td>
                  <td className="px-4 py-3 text-center text-xs text-slate-500">
                    {c.matchedTo ?? <span className="italic text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${RECONCILE_BADGE[c.status]}`}>{c.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t border-slate-200">
                <td className="px-4 py-3 text-xs font-semibold text-slate-500" colSpan={2}>Total no cartão</td>
                <td className="px-4 py-3 text-center font-bold text-slate-800">
                  {fmt(CARD_ENTRIES.reduce((s, c) => s + c.amount, 0))}
                </td>
                <td colSpan={2} />
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
  { id: 'trips',          label: 'Viagens'               },
  { id: 'expenses',       label: 'Despesas e Recibos'    },
  { id: 'reconciliation', label: 'Conciliação de Cartão' },
] as const;

type TabId = typeof TABS[number]['id'];

export default function TravelExpenses() {
  const [tab, setTab] = useState<TabId>('trips');

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Viagens e Despesas (T&E)</h1>
        <p className="text-slate-500 text-sm mt-1">
          Aprovação de viagens, reservas via integração, recibos por OCR no app e conciliação automática com cartão corporativo
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

      {tab === 'trips'          && <TripsTab />}
      {tab === 'expenses'       && <ExpensesTab />}
      {tab === 'reconciliation' && <ReconciliationTab />}
    </div>
  );
}
