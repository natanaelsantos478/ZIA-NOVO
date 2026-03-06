import { useState, useEffect } from 'react';
import {
  Clock, TrendingUp, TrendingDown, AlertTriangle,
  Search, User, Download,
} from 'lucide-react';
import { getHourBank } from '../../../lib/hr';
import type { HourBank as HrHourBank } from '../../../lib/hr';

interface EmployeeBank {
  id: string;
  name: string;
  dept: string;
  balance: string;
  balanceMinutes: number;
  limitHours: number;
  status: 'healthy' | 'low' | 'negative' | 'expiring';
}

function fmtMinutes(minutes: number): string {
  const abs  = Math.abs(minutes);
  const h    = Math.floor(abs / 60);
  const m    = abs % 60;
  const sign = minutes < 0 ? '-' : '+';
  return `${sign}${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}min`;
}

function deriveStatus(minutes: number, limitHours: number): EmployeeBank['status'] {
  if (minutes < 0)                       return 'negative';
  if (minutes < 60)                      return 'low';
  if (minutes > limitHours * 60 * 0.9)  return 'expiring';
  return 'healthy';
}

function mapHourBank(row: HrHourBank): EmployeeBank {
  return {
    id:             row.id,
    name:           row.employee_name ?? '—',
    dept:           row.dept ?? '—',
    balance:        fmtMinutes(row.balance_minutes),
    balanceMinutes: row.balance_minutes,
    limitHours:     row.limit_hours,
    status:         deriveStatus(row.balance_minutes, row.limit_hours),
  };
}

const STATUS_CONFIG = {
  healthy:  { color: 'text-green-600', bg: 'bg-green-50',  label: 'Saldo OK'    },
  low:      { color: 'text-amber-600', bg: 'bg-amber-50',  label: 'Saldo Baixo' },
  negative: { color: 'text-rose-600',  bg: 'bg-rose-50',   label: 'Negativo'    },
  expiring: { color: 'text-orange-600', bg: 'bg-orange-50', label: 'Expirando'  },
};

export default function HourBank() {
  const [employees, setEmployees]       = useState<EmployeeBank[]>([]);
  const [loading, setLoading]           = useState(true);
  const [selectedId, setSelectedId]     = useState<string | null>(null);
  const [search, setSearch]             = useState('');

  useEffect(() => {
    getHourBank()
      .then((data) => {
        const mapped = data.map(mapHourBank);
        setEmployees(mapped);
        if (mapped.length > 0) setSelectedId(mapped[0].id);
      })
      .catch((err) => console.error('Erro ao carregar banco de horas:', err))
      .finally(() => setLoading(false));
  }, []);

  const emp = employees.find((e) => e.id === selectedId) ?? employees[0];
  const filteredList = employees.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.dept.toLowerCase().includes(search.toLowerCase()),
  );

  const expiringCount = employees.filter((e) => e.status === 'expiring').length;
  const negativeCount = employees.filter((e) => e.status === 'negative').length;

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Banco de Horas</h1>
          <p className="text-slate-500 text-sm mt-1">Extrato de créditos, débitos, projeções e expiração</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-sm">
          <Download className="w-4 h-4" /> Exportar Extrato
        </button>
      </div>

      {/* Global alerts */}
      {(expiringCount > 0 || negativeCount > 0) && (
        <div className="flex gap-3 mb-6 flex-wrap">
          {expiringCount > 0 && (
            <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-sm text-orange-800">
              <AlertTriangle className="w-4 h-4 shrink-0 text-orange-500" />
              <span><span className="font-semibold">{expiringCount} colaborador(es)</span> com horas prestes a expirar (vencimento em fevereiro)</span>
            </div>
          )}
          {negativeCount > 0 && (
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-800">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span><span className="font-semibold">{negativeCount} colaborador(es)</span> com saldo negativo no banco de horas</span>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Left: employee list */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="px-4 pt-4 pb-3 border-b border-slate-100">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar colaborador..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400 w-full"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
            {loading && (
              <p className="text-center py-8 text-slate-400 text-sm">Carregando...</p>
            )}
            {filteredList.map((e) => {
              const sc = STATUS_CONFIG[e.status];
              const isSelected = e.id === selectedId;
              return (
                <button
                  key={e.id}
                  onClick={() => setSelectedId(e.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${isSelected ? 'bg-pink-50 border-r-2 border-pink-500' : 'hover:bg-slate-50'}`}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                    {e.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 text-sm truncate">{e.name}</p>
                    <p className="text-xs text-slate-400 truncate">{e.dept}</p>
                  </div>
                  <span className={`text-xs font-bold shrink-0 ${sc.color}`}>{e.balance}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: employee detail */}
        <div className="col-span-2 flex flex-col gap-4">
          {emp ? (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Saldo Atual',   value: emp.balance,                                icon: Clock,        color: `${STATUS_CONFIG[emp.status].color} ${STATUS_CONFIG[emp.status].bg}` },
                  { label: 'Limite (h)',    value: `${emp.limitHours}h`,                       icon: TrendingUp,   color: 'text-blue-600 bg-blue-50'    },
                  { label: 'Status',        value: STATUS_CONFIG[emp.status].label,            icon: AlertTriangle, color: `${STATUS_CONFIG[emp.status].color} ${STATUS_CONFIG[emp.status].bg}` },
                ].map((s) => {
                  const Icon = s.icon;
                  return (
                    <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${s.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                      <p className="text-lg font-bold text-slate-800">{s.value}</p>
                    </div>
                  );
                })}
              </div>

              {/* Employee info card */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="font-semibold text-slate-700 text-sm">{emp.name}</span>
                    <span className="text-slate-400 text-xs">· {emp.dept}</span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_CONFIG[emp.status].bg} ${STATUS_CONFIG[emp.status].color}`}>
                    {STATUS_CONFIG[emp.status].label}
                  </span>
                </div>
                <div className="px-5 py-8 text-center text-slate-400 text-sm">
                  <TrendingDown className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>Extrato detalhado de movimentações em breve.</p>
                  <p className="text-xs mt-1 text-slate-300">Saldo atual: <span className={`font-bold ${emp.balanceMinutes < 0 ? 'text-rose-500' : 'text-green-500'}`}>{emp.balance}</span></p>
                </div>
              </div>
            </>
          ) : (
            <div className="col-span-2 flex items-center justify-center text-slate-400 text-sm">
              Selecione um colaborador.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
