import { useState } from 'react';
import {
  Clock, TrendingUp, TrendingDown, AlertTriangle,
  Search, User, Download, ChevronUp, ChevronDown,
} from 'lucide-react';

interface BankEntry {
  date: string;
  description: string;
  type: 'credit' | 'debit';
  hours: string;
  balance: string;
  expiry?: string;
}

interface EmployeeBank {
  name: string;
  dept: string;
  balance: string;
  monthCredits: string;
  monthDebits: string;
  expiringHours: string;
  expiryDate: string;
  status: 'healthy' | 'low' | 'negative' | 'expiring';
  entries: BankEntry[];
}

const EMPLOYEES: EmployeeBank[] = [];

const STATUS_CONFIG = {
  healthy:  { color: 'text-green-600', bg: 'bg-green-50',  label: 'Saldo OK'    },
  low:      { color: 'text-amber-600', bg: 'bg-amber-50',  label: 'Saldo Baixo' },
  negative: { color: 'text-rose-600',  bg: 'bg-rose-50',   label: 'Negativo'    },
  expiring: { color: 'text-orange-600', bg: 'bg-orange-50', label: 'Expirando'  },
};

export default function HourBank() {
  const [selectedEmp, setSelectedEmp]   = useState(EMPLOYEES[0]?.name ?? '');
  const [search, setSearch]             = useState('');

  const emp = EMPLOYEES.find((e) => e.name === selectedEmp) ?? EMPLOYEES[0] ?? null;
  const filteredList = EMPLOYEES.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.dept.toLowerCase().includes(search.toLowerCase()),
  );

  const expiringCount = EMPLOYEES.filter((e) => e.status === 'expiring').length;
  const negativeCount = EMPLOYEES.filter((e) => e.status === 'negative').length;

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
            {filteredList.map((e) => {
              const sc = STATUS_CONFIG[e.status];
              const isSelected = e.name === selectedEmp;
              return (
                <button
                  key={e.name}
                  onClick={() => setSelectedEmp(e.name)}
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
        <div className="col-span-2 flex flex-col gap-4">{emp == null ? (
            <div className="flex items-center justify-center py-24 text-slate-400 text-sm bg-white rounded-xl border border-slate-200">
              Nenhum colaborador encontrado. Adicione registros para visualizar o banco de horas.
            </div>
          ) : (<>
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Saldo Atual',       value: emp.balance,       icon: Clock,        color: STATUS_CONFIG[emp.status].color + ' ' + STATUS_CONFIG[emp.status].bg },
              { label: 'Créditos (mês)',    value: emp.monthCredits,  icon: TrendingUp,   color: 'text-green-600 bg-green-50'  },
              { label: 'Débitos (mês)',     value: emp.monthDebits,   icon: TrendingDown, color: 'text-rose-600 bg-rose-50'    },
              { label: 'A Expirar',         value: emp.expiringHours, icon: AlertTriangle, color: emp.expiringHours !== '—' ? 'text-orange-600 bg-orange-50' : 'text-slate-400 bg-slate-100' },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${s.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                  <p className="text-lg font-bold text-slate-800">{s.value}</p>
                  {s.label === 'A Expirar' && emp.expiryDate !== '—' && (
                    <p className="text-[10px] text-orange-500 mt-0.5">Vence: {emp.expiryDate}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Transaction table */}
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Descrição</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Horas</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Saldo</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Expiração</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {emp.entries.map((entry, i) => (
                    <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3 font-mono text-xs text-slate-500">{entry.date}</td>
                      <td className="px-5 py-3 text-slate-700 text-xs">{entry.description}</td>
                      <td className="px-5 py-3 text-center">
                        <div className={`flex items-center justify-center gap-1 font-mono text-xs font-bold ${entry.type === 'credit' ? 'text-green-600' : 'text-rose-600'}`}>
                          {entry.type === 'credit' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          {entry.hours}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center font-mono text-xs font-semibold text-slate-800">{entry.balance}</td>
                      <td className="px-5 py-3 text-xs">
                        {entry.expiry ? (
                          <span className={`${new Date(entry.expiry.split('/').reverse().join('-')) <= new Date('2025-03-01') ? 'text-orange-600 font-semibold' : 'text-slate-400'}`}>
                            {entry.expiry}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>)}
        </div>
      </div>
    </div>
  );
}
