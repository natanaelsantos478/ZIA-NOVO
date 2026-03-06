import { useState, useEffect } from 'react';
import {
  Clock, CheckCircle, AlertTriangle,
  MoreHorizontal, Search, ChevronDown,
} from 'lucide-react';
import { getOvertimeRequests, updateOvertimeRequest } from '../../../lib/hr';
import type { OvertimeRequest } from '../../../lib/hr';

type OTStatus = 'Aprovado' | 'Pendente' | 'Reprovado';

interface OvertimeRecord {
  id: string;
  employee: string;
  dept: string;
  date: string;
  duration: string;
  pct: string;
  reason: string;
  status: OTStatus;
}

function fmtDate(iso: string): string {
  try { return new Date(iso).toLocaleDateString('pt-BR'); } catch { return iso; }
}

function fmtHours(h: number): string {
  const hrs  = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function mapRecord(r: OvertimeRequest): OvertimeRecord {
  const statusMap: Record<string, OTStatus> = {
    Aprovado: 'Aprovado', Pendente: 'Pendente', Reprovado: 'Reprovado',
  };
  return {
    id:       r.id,
    employee: r.employee_name ?? '—',
    dept:     r.dept ?? '—',
    date:     fmtDate(r.date),
    duration: fmtHours(Number(r.hours)),
    pct:      r.type ?? '—',
    reason:   r.justification ?? '—',
    status:   statusMap[r.status] ?? 'Pendente',
  };
}

const STATUS_CONFIG: Record<OTStatus, { color: string; icon: React.ElementType }> = {
  'Aprovado':  { color: 'bg-green-100 text-green-700',  icon: CheckCircle  },
  'Pendente':  { color: 'bg-amber-100 text-amber-700',  icon: Clock        },
  'Reprovado': { color: 'bg-rose-100 text-rose-700',    icon: AlertTriangle },
};

function RecordTable({ records }: { records: OvertimeRecord[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Colaborador</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Duração</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Adicional</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Motivo</th>
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
                <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-800">{r.duration}</td>
                <td className="px-4 py-3">
                  <span className="text-sm font-bold text-slate-800">{r.pct}</span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-600 max-w-48 truncate">{r.reason}</td>
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

function PendingTab({ records, onApprove, onReject }: {
  records: OvertimeRecord[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {records.length === 0 && (
        <div className="text-center py-16 text-slate-400 text-sm bg-slate-50 rounded-xl border border-slate-100">
          Nenhuma HE aguardando aprovação.
        </div>
      )}
      {records.map((r) => {
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
                <p className="text-xs text-slate-500">{r.dept} · {r.date}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-mono font-bold text-slate-800">{r.duration}</span>
                <span className="text-sm font-bold text-slate-700">+{r.pct}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </div>
            </div>

            {isExpanded && (
              <div className="px-5 pb-5 border-t border-amber-200 pt-4">
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between"><span className="text-slate-500">Motivo:</span><span className="text-slate-700 font-medium text-right max-w-64">{r.reason}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Adicional Legal:</span><span className="font-bold text-slate-800">{r.pct}</span></div>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-amber-200">
                  <div className="flex-1">
                    <input type="text" placeholder="Observação (opcional)..." className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 bg-white" />
                  </div>
                  <button
                    onClick={() => onReject(r.id)}
                    className="px-4 py-2 text-sm font-semibold text-rose-700 bg-rose-100 rounded-lg hover:bg-rose-200 transition-colors"
                  >
                    Reprovar
                  </button>
                  <button
                    onClick={() => onApprove(r.id)}
                    className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
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

export default function Overtime() {
  const [records, setRecords]     = useState<OvertimeRecord[]>([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState('records');
  const [search, setSearch]       = useState('');

  useEffect(() => {
    getOvertimeRequests()
      .then((data) => setRecords(data.map(mapRecord)))
      .catch((err) => console.error('Erro ao carregar horas extras:', err))
      .finally(() => setLoading(false));
  }, []);

  async function handleApprove(id: string) {
    try {
      await updateOvertimeRequest(id, { status: 'Aprovado' });
      setRecords((prev) => prev.map((r) => r.id === id ? { ...r, status: 'Aprovado' as OTStatus } : r));
    } catch (err) { console.error(err); }
  }

  async function handleReject(id: string) {
    try {
      await updateOvertimeRequest(id, { status: 'Reprovado' });
      setRecords((prev) => prev.map((r) => r.id === id ? { ...r, status: 'Reprovado' as OTStatus } : r));
    } catch (err) { console.error(err); }
  }

  const pendingRecords  = records.filter((r) => r.status === 'Pendente');
  const filteredRecords = records.filter((r) =>
    r.employee.toLowerCase().includes(search.toLowerCase()) ||
    r.reason.toLowerCase().includes(search.toLowerCase()),
  );

  const totalMins  = records.reduce((s, r) => s + (parseInt(r.duration.split(':')[0]) * 60 + parseInt(r.duration.split(':')[1])), 0);
  const totalHours = `${Math.floor(totalMins / 60)}h ${String(totalMins % 60).padStart(2, '0')}min`;
  const approved   = records.filter((r) => r.status === 'Aprovado').length;
  const pending    = records.filter((r) => r.status === 'Pendente').length;

  const SUB_TABS = [
    { id: 'records',  label: 'Registro de HE' },
    { id: 'pending',  label: `Autorizações Pendentes${pendingRecords.length > 0 ? ` (${pendingRecords.length})` : ''}` },
  ];

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
          {loading && <div className="text-center py-8 text-slate-400 text-sm">Carregando...</div>}
          {!loading && activeTab === 'records' && <RecordTable records={filteredRecords} />}
          {!loading && activeTab === 'pending' && <PendingTab records={pendingRecords} onApprove={(id) => void handleApprove(id)} onReject={(id) => void handleReject(id)} />}
        </div>
      </div>
    </div>
  );
}
