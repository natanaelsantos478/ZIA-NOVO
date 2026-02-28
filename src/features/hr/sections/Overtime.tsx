import { useState } from 'react';
import {
  Clock, CheckCircle, AlertTriangle, User,
  MoreHorizontal, Search, ChevronDown,
} from 'lucide-react';

type DayType = 'Dia Útil' | 'Sábado' | 'Domingo' | 'Feriado';
type OTStatus = 'Aprovado' | 'Pendente' | 'Reprovado';

interface OvertimeRecord {
  id: string;
  employee: string;
  dept: string;
  date: string;
  start: string;
  end: string;
  duration: string;
  dayType: DayType;
  pct: string;
  reason: string;
  status: OTStatus;
  bankOrPayroll: 'Banco de Horas' | 'Folha de Pagamento';
}

const RECORDS: OvertimeRecord[] = [
  { id: 'HE001', employee: 'Carlos Eduardo Lima',   dept: 'TI – Dev',    date: '11/02/2025', start: '17:00', end: '19:30', duration: '02:30', dayType: 'Dia Útil', pct: '50%',  reason: 'Entrega de sprint',          status: 'Aprovado',  bankOrPayroll: 'Banco de Horas'    },
  { id: 'HE002', employee: 'Guilherme Martins',      dept: 'Comercial',   date: '14/02/2025', start: '17:00', end: '20:00', duration: '03:00', dayType: 'Dia Útil', pct: '50%',  reason: 'Fechamento de mês comercial', status: 'Aprovado', bankOrPayroll: 'Folha de Pagamento' },
  { id: 'HE003', employee: 'Ana Beatriz Souza',      dept: 'RH',          date: '15/02/2025', start: '08:00', end: '14:00', duration: '06:00', dayType: 'Sábado',  pct: '50%',  reason: 'Processo seletivo presencial', status: 'Pendente', bankOrPayroll: 'Banco de Horas'    },
  { id: 'HE004', employee: 'Fernanda Rocha',          dept: 'Qualidade',   date: '09/02/2025', start: '12:00', end: '18:00', duration: '06:00', dayType: 'Domingo', pct: '100%', reason: 'Auditoria ISO emergencial',    status: 'Aprovado',  bankOrPayroll: 'Folha de Pagamento' },
  { id: 'HE005', employee: 'Rafael Nunes',            dept: 'TI – Dados',  date: '17/02/2025', start: '08:00', end: '17:00', duration: '09:00', dayType: 'Feriado', pct: '100%', reason: 'Migração de banco de dados',   status: 'Pendente',  bankOrPayroll: 'Banco de Horas'    },
  { id: 'HE006', employee: 'Carlos Eduardo Lima',   dept: 'TI – Dev',    date: '18/02/2025', start: '17:00', end: '20:30', duration: '03:30', dayType: 'Dia Útil', pct: '50%',  reason: 'Bug crítico em produção',     status: 'Pendente',  bankOrPayroll: 'Banco de Horas'    },
];

const PENDING_RECORDS = RECORDS.filter((r) => r.status === 'Pendente');

const DAY_TYPE_BADGE: Record<DayType, string> = {
  'Dia Útil': 'bg-slate-100 text-slate-600',
  'Sábado':   'bg-blue-100 text-blue-700',
  'Domingo':  'bg-indigo-100 text-indigo-700',
  'Feriado':  'bg-rose-100 text-rose-700',
};

const STATUS_CONFIG: Record<OTStatus, { color: string; icon: React.ElementType }> = {
  'Aprovado':  { color: 'bg-green-100 text-green-700',  icon: CheckCircle  },
  'Pendente':  { color: 'bg-amber-100 text-amber-700',  icon: Clock        },
  'Reprovado': { color: 'bg-rose-100 text-rose-700',    icon: AlertTriangle },
};

const EMPLOYEE_CONTEXT: Record<string, { totalHE: string; lastMonth: string; bankBalance: string }> = {
  'Ana Beatriz Souza':   { totalHE: '12h',  lastMonth: '4h',  bankBalance: '+06h 30min' },
  'Carlos Eduardo Lima': { totalHE: '38h',  lastMonth: '6h',  bankBalance: '+18h 20min' },
  'Fernanda Rocha':       { totalHE: '9h',   lastMonth: '6h',  bankBalance: '+03h 00min' },
  'Rafael Nunes':         { totalHE: '22h',  lastMonth: '9h',  bankBalance: '+13h 00min' },
  'Guilherme Martins':    { totalHE: '15h',  lastMonth: '3h',  bankBalance: '+08h 00min' },
};

function RecordTable({ records }: { records: OvertimeRecord[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Colaborador</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Horário</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Duração</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo de Dia</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Adicional</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Destino</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {records.map((r) => {
            const cfg = STATUS_CONFIG[r.status];
            const Icon = cfg.icon;
            return (
              <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-800 text-xs">{r.employee}</p>
                  <p className="text-[11px] text-slate-400">{r.dept}</p>
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">{r.date}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{r.start} – {r.end}</td>
                <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-800">{r.duration}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${DAY_TYPE_BADGE[r.dayType]}`}>
                    {r.dayType}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm font-bold text-slate-800">{r.pct}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] font-medium ${r.bankOrPayroll === 'Banco de Horas' ? 'text-blue-600' : 'text-green-600'}`}>
                    {r.bankOrPayroll}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${cfg.color}`}>
                    <Icon className="w-3 h-3" />{r.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button className="text-slate-400 hover:text-slate-600">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {records.length === 0 && (
        <div className="text-center py-12 text-slate-400 text-sm">Nenhum registro encontrado.</div>
      )}
    </div>
  );
}

function PendingTab() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {PENDING_RECORDS.length === 0 && (
        <div className="text-center py-16 text-slate-400 text-sm bg-slate-50 rounded-xl border border-slate-100">
          Nenhuma HE aguardando aprovação.
        </div>
      )}
      {PENDING_RECORDS.map((r) => {
        const ctx = EMPLOYEE_CONTEXT[r.employee];
        const isExpanded = expandedId === r.id;
        return (
          <div key={r.id} className="bg-amber-50/60 border border-amber-200 rounded-xl overflow-hidden">
            <div
              className="flex items-center gap-4 px-5 py-4 cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : r.id)}
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                {r.employee.split(' ').map((n) => n[0]).slice(0, 2).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm">{r.employee}</p>
                <p className="text-xs text-slate-500">{r.dept} · {r.date} · {r.start}–{r.end}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${DAY_TYPE_BADGE[r.dayType]}`}>{r.dayType}</span>
                <span className="font-mono font-bold text-slate-800">{r.duration}</span>
                <span className="text-sm font-bold text-slate-700">+{r.pct}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </div>
            </div>

            {isExpanded && (
              <div className="px-5 pb-5 border-t border-amber-200 pt-4">
                <div className="grid grid-cols-2 gap-6">
                  {/* Request details */}
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Detalhes da Solicitação</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-slate-500">Motivo:</span><span className="text-slate-700 font-medium text-right max-w-48">{r.reason}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Destino:</span><span className={`font-medium ${r.bankOrPayroll === 'Banco de Horas' ? 'text-blue-600' : 'text-green-600'}`}>{r.bankOrPayroll}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Adicional Legal:</span><span className="font-bold text-slate-800">{r.pct}</span></div>
                    </div>
                  </div>

                  {/* Employee context */}
                  {ctx && (
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                        <User className="w-3 h-3 inline mr-1" />Contexto do Colaborador
                      </p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-slate-500">Total HE (ano):</span><span className="font-semibold text-slate-700">{ctx.totalHE}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">HE mês anterior:</span><span className="font-semibold text-slate-700">{ctx.lastMonth}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Banco de horas:</span><span className="font-semibold text-green-700">{ctx.bankBalance}</span></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Approval actions */}
                <div className="flex items-center gap-3 mt-5 pt-4 border-t border-amber-200">
                  <div className="flex-1">
                    <input type="text" placeholder="Observação (opcional)..." className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 bg-white" />
                  </div>
                  <button className="px-4 py-2 text-sm font-semibold text-rose-700 bg-rose-100 rounded-lg hover:bg-rose-200 transition-colors">
                    Reprovar
                  </button>
                  <button className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Aprovar HE
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

const SUB_TABS = [
  { id: 'records',  label: 'Registro de HE' },
  { id: 'pending',  label: `Autorizações Pendentes ${PENDING_RECORDS.length > 0 ? `(${PENDING_RECORDS.length})` : ''}` },
];

export default function Overtime() {
  const [activeTab, setActiveTab] = useState('records');
  const [search, setSearch]       = useState('');

  const filteredRecords = RECORDS.filter((r) =>
    r.employee.toLowerCase().includes(search.toLowerCase()) ||
    r.reason.toLowerCase().includes(search.toLowerCase()),
  );

  const totalHours = '24h 00min';
  const approved   = RECORDS.filter((r) => r.status === 'Aprovado').length;
  const pending    = RECORDS.filter((r) => r.status === 'Pendente').length;

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestão de Horas Extras</h1>
          <p className="text-slate-500 text-sm mt-1">Registro, classificação automática e painel de aprovação</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total HE (mês)',     value: totalHours, color: 'text-pink-600 bg-pink-50',   icon: Clock         },
          { label: 'Aprovadas',          value: `${approved}`,    color: 'text-green-600 bg-green-50',  icon: CheckCircle   },
          { label: 'Pendentes',          value: `${pending}`,     color: 'text-amber-600 bg-amber-50',  icon: AlertTriangle },
          { label: 'Em Banco de Horas',  value: '3',        color: 'text-blue-600 bg-blue-50',    icon: Clock         },
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

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 pt-4">
          <div className="flex gap-6">
            {SUB_TABS.map((tab) => (
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
          {activeTab === 'records' && (
            <div className="pb-3 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar colaborador..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400 w-52"
              />
            </div>
          )}
        </div>
        <div className="p-6">
          {activeTab === 'records' && <RecordTable records={filteredRecords} />}
          {activeTab === 'pending' && <PendingTab />}
        </div>
      </div>
    </div>
  );
}
