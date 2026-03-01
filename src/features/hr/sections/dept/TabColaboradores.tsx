import { useState } from 'react';
import {
  Users, Clock, AlertCircle, TrendingDown, ChevronRight,
  CheckCircle, XCircle, Search, Filter,
} from 'lucide-react';
import type { DeptRow } from '../OrgChart';

/* ── Types ──────────────────────────────────────────────────────────────── */

type SubTab = 'dashboard' | 'funcionarios' | 'ponto';

interface Employee {
  id: string; name: string; role: string; contract: string;
  status: 'Ativo' | 'Férias' | 'Afastado'; workMode: 'Presencial' | 'Híbrido' | 'Remoto';
  admission: string; email: string; cpf: string; salary: string;
}

interface PunchRecord {
  date: string; weekday: string; entry: string; breakOut: string;
  breakIn: string; exit: string; worked: string; balance: string;
  status: 'ok' | 'inconsistency' | 'absence' | 'holiday';
}

/* ── Mock data ───────────────────────────────────────────────────────────── */

const EMPLOYEES: Employee[] = [
  { id: '1', name: 'Ana Beatriz Souza',  role: 'Engenheira Sênior',   contract: 'CLT', status: 'Ativo',    workMode: 'Híbrido',    admission: '2021-03-15', email: 'ana.souza@zia.com',    cpf: '123.456.789-00', salary: 'R$ 12.500' },
  { id: '2', name: 'Carlos Eduardo Lima',role: 'Analista Pleno',      contract: 'CLT', status: 'Ativo',    workMode: 'Remoto',     admission: '2022-07-01', email: 'carlos.lima@zia.com',  cpf: '234.567.890-11', salary: 'R$ 7.800'  },
  { id: '3', name: 'Fernanda Rocha',     role: 'Tech Lead',           contract: 'CLT', status: 'Férias',   workMode: 'Presencial', admission: '2020-01-10', email: 'fernanda.r@zia.com',   cpf: '345.678.901-22', salary: 'R$ 15.000' },
  { id: '4', name: 'Guilherme Martins',  role: 'Desenvolvedor Junior', contract: 'CLT', status: 'Ativo',   workMode: 'Híbrido',    admission: '2023-09-05', email: 'guilherme.m@zia.com',  cpf: '456.789.012-33', salary: 'R$ 5.200'  },
  { id: '5', name: 'Isabela Ferreira',   role: 'Product Owner',       contract: 'PJ',  status: 'Afastado', workMode: 'Remoto',    admission: '2021-11-20', email: 'isabela.f@zia.com',    cpf: '567.890.123-44', salary: 'R$ 18.000' },
  { id: '6', name: 'Leonardo Carvalho',  role: 'DevOps Engineer',     contract: 'CLT', status: 'Ativo',    workMode: 'Remoto',     admission: '2022-05-12', email: 'leonardo.c@zia.com',   cpf: '678.901.234-55', salary: 'R$ 11.000' },
];

const PUNCH: PunchRecord[] = [
  { date: '2025-01-27', weekday: 'Seg', entry: '08:02', breakOut: '12:05', breakIn: '13:05', exit: '17:03', worked: '8h01', balance: '+0h01', status: 'ok'            },
  { date: '2025-01-28', weekday: 'Ter', entry: '08:45', breakOut: '12:10', breakIn: '13:15', exit: '17:00', worked: '7h10', balance: '-0h50', status: 'inconsistency'  },
  { date: '2025-01-29', weekday: 'Qua', entry: '07:58', breakOut: '12:00', breakIn: '13:00', exit: '17:02', worked: '8h04', balance: '+0h04', status: 'ok'            },
  { date: '2025-01-30', weekday: 'Qui', entry: '—',     breakOut: '—',     breakIn: '—',     exit: '—',     worked: '0h00', balance: '-8h00', status: 'absence'       },
  { date: '2025-01-31', weekday: 'Sex', entry: '08:01', breakOut: '12:03', breakIn: '13:01', exit: '17:10', worked: '8h12', balance: '+0h12', status: 'ok'            },
  { date: '2025-02-03', weekday: 'Seg', entry: '08:05', breakOut: '12:00', breakIn: '13:10', exit: '17:00', worked: '7h45', balance: '-0h15', status: 'inconsistency'  },
];

const STATUS_BADGE: Record<Employee['status'], string> = {
  Ativo:    'bg-green-100 text-green-700',
  Férias:   'bg-blue-100 text-blue-700',
  Afastado: 'bg-amber-100 text-amber-700',
};
const MODE_BADGE: Record<Employee['workMode'], string> = {
  Presencial: 'bg-slate-100 text-slate-600',
  Híbrido:    'bg-purple-100 text-purple-700',
  Remoto:     'bg-teal-100 text-teal-700',
};
const PUNCH_STATUS: Record<PunchRecord['status'], { label: string; cls: string; icon: React.ElementType }> = {
  ok:            { label: 'OK',          cls: 'text-green-600', icon: CheckCircle  },
  inconsistency: { label: 'Inconsist.',  cls: 'text-amber-600', icon: AlertCircle  },
  absence:       { label: 'Falta',       cls: 'text-red-500',   icon: XCircle      },
  holiday:       { label: 'Feriado',     cls: 'text-blue-500',  icon: CheckCircle  },
};

/* ── KPI card ─────────────────────────────────────────────────────────────── */
function KpiCard({ label, value, delta, icon: Icon, color }: {
  label: string; value: string; delta: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-slate-500">{label}</span>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{delta}</p>
    </div>
  );
}

/* ── Employee detail modal ─────────────────────────────────────────────────── */
function EmployeeModal({ emp, onClose }: { emp: Employee; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800">Ficha do Colaborador</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg font-bold">×</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-pink-100 flex items-center justify-center text-2xl font-bold text-pink-600">
              {emp.name.charAt(0)}
            </div>
            <div>
              <p className="font-bold text-slate-800">{emp.name}</p>
              <p className="text-sm text-slate-500">{emp.role}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['E-mail', emp.email], ['CPF', emp.cpf], ['Admissão', emp.admission],
              ['Contrato', emp.contract], ['Modalidade', emp.workMode], ['Salário', emp.salary],
            ].map(([k, v]) => (
              <div key={k} className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400">{k}</p>
                <p className="font-medium text-slate-700 mt-0.5">{v}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium px-3 py-1 rounded-full ${STATUS_BADGE[emp.status]}`}>{emp.status}</span>
            <span className={`text-xs font-medium px-3 py-1 rounded-full ${MODE_BADGE[emp.workMode]}`}>{emp.workMode}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Dashboard sub-tab ─────────────────────────────────────────────────────── */
function Dashboard({ dept }: { dept: DeptRow }) {
  const activos  = EMPLOYEES.filter((e) => e.status === 'Ativo').length;
  const ferias   = EMPLOYEES.filter((e) => e.status === 'Férias').length;
  const afastados= EMPLOYEES.filter((e) => e.status === 'Afastado').length;
  const faltas   = PUNCH.filter((p) => p.status === 'absence').length;

  return (
    <div className="p-8 space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Ativos"       value={activos.toString()}  delta={`de ${dept.headcount} total`} icon={Users}        color="bg-green-50 text-green-600"  />
        <KpiCard label="Em Férias"    value={ferias.toString()}   delta="neste mês"                    icon={Clock}        color="bg-blue-50 text-blue-600"    />
        <KpiCard label="Afastados"    value={afastados.toString()}delta="atestado/licença"              icon={AlertCircle}  color="bg-amber-50 text-amber-600"  />
        <KpiCard label="Faltas/mês"   value={faltas.toString()}   delta="últimos 30 dias"              icon={TrendingDown} color="bg-red-50 text-red-600"      />
      </div>

      {/* Distribution */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-700 mb-4">Distribuição por Modalidade</h3>
          {[
            { label: 'Remoto',     count: EMPLOYEES.filter((e) => e.workMode === 'Remoto').length,     color: 'bg-teal-400'    },
            { label: 'Híbrido',    count: EMPLOYEES.filter((e) => e.workMode === 'Híbrido').length,    color: 'bg-purple-400'  },
            { label: 'Presencial', count: EMPLOYEES.filter((e) => e.workMode === 'Presencial').length, color: 'bg-slate-400'   },
          ].map(({ label, count, color }) => (
            <div key={label} className="flex items-center gap-3 mb-3">
              <span className="text-sm text-slate-600 w-24">{label}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-2">
                <div className={`h-2 rounded-full ${color}`} style={{ width: `${(count / EMPLOYEES.length) * 100}%` }} />
              </div>
              <span className="text-sm font-medium text-slate-700 w-6 text-right">{count}</span>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-700 mb-4">Tipo de Contrato</h3>
          {[
            { label: 'CLT', count: EMPLOYEES.filter((e) => e.contract === 'CLT').length, color: 'bg-pink-400' },
            { label: 'PJ',  count: EMPLOYEES.filter((e) => e.contract === 'PJ').length,  color: 'bg-indigo-400' },
          ].map(({ label, count, color }) => (
            <div key={label} className="flex items-center gap-3 mb-3">
              <span className="text-sm text-slate-600 w-24">{label}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-2">
                <div className={`h-2 rounded-full ${color}`} style={{ width: `${(count / EMPLOYEES.length) * 100}%` }} />
              </div>
              <span className="text-sm font-medium text-slate-700 w-6 text-right">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent absences */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-700">Últimas Inconsistências de Ponto</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {PUNCH.filter((p) => p.status !== 'ok').map((p) => {
            const s = PUNCH_STATUS[p.status];
            const Icon = s.icon;
            return (
              <div key={p.date} className="flex items-center justify-between px-6 py-3 text-sm">
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${s.cls}`} />
                  <span className="text-slate-500">{p.weekday}, {p.date}</span>
                </div>
                <span className={`text-xs font-medium ${s.cls}`}>{s.label}</span>
                <span className="text-slate-400 font-mono">{p.balance}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────────── */

export default function TabColaboradores({ dept }: { dept: DeptRow }) {
  const [sub, setSub]           = useState<SubTab>('dashboard');
  const [search, setSearch]     = useState('');
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [punchEmp, setPunchEmp] = useState(EMPLOYEES[0].name);

  const filtered = EMPLOYEES.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.role.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      {selectedEmp && <EmployeeModal emp={selectedEmp} onClose={() => setSelectedEmp(null)} />}

      {/* Sub-tabs */}
      <div className="bg-white border-b border-slate-200 px-8">
        <div className="flex gap-0">
          {[
            { id: 'dashboard',    label: 'Dashboard' },
            { id: 'funcionarios', label: 'Funcionários' },
            { id: 'ponto',        label: 'Ponto' },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setSub(id as SubTab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                sub === id ? 'border-pink-500 text-pink-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Dashboard */}
      {sub === 'dashboard' && <Dashboard dept={dept} />}

      {/* Funcionários */}
      {sub === 'funcionarios' && (
        <div className="p-8">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-700">Colaboradores do Departamento</h3>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar colaborador..."
                    className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 w-56"
                  />
                </div>
                <button className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
                  <Filter className="w-4 h-4" /> Filtros
                </button>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Nome','Cargo','Contrato','Modalidade','Admissão','Status',''].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-sm font-bold text-pink-600">
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{emp.name}</p>
                          <p className="text-xs text-slate-400">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{emp.role}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded">{emp.contract}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${MODE_BADGE[emp.workMode]}`}>{emp.workMode}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{emp.admission}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[emp.status]}`}>{emp.status}</span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedEmp(emp)}
                        className="flex items-center gap-1 text-xs text-pink-600 hover:underline font-medium"
                      >
                        Ver ficha <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ponto */}
      {sub === 'ponto' && (
        <div className="p-8 space-y-4">
          <div className="flex items-center gap-3">
            <select
              value={punchEmp}
              onChange={(e) => setPunchEmp(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-pink-500/30"
            >
              {EMPLOYEES.map((e) => <option key={e.id}>{e.name}</option>)}
            </select>
            <span className="text-sm text-slate-500">Janeiro / 2025</span>
          </div>

          {/* Balance summary */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Horas Esperadas', value: '176h00', cls: 'text-slate-700' },
              { label: 'Horas Trabalhadas', value: '167h50', cls: 'text-slate-700' },
              { label: 'Saldo do Período', value: '-8h10', cls: 'text-red-600' },
              { label: 'Faltas', value: '1', cls: 'text-red-600' },
            ].map(({ label, value, cls }) => (
              <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <p className="text-xs text-slate-500 mb-1">{label}</p>
                <p className={`text-2xl font-bold ${cls}`}>{value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Data','Dia','Entrada','Saída Almoço','Ret. Almoço','Saída','Trabalhado','Saldo','Status'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {PUNCH.map((p) => {
                  const s = PUNCH_STATUS[p.status];
                  const Icon = s.icon;
                  return (
                    <tr key={p.date} className={`${p.status === 'absence' ? 'bg-red-50/40' : p.status === 'inconsistency' ? 'bg-amber-50/30' : ''}`}>
                      <td className="px-4 py-3 text-slate-600 font-mono text-xs">{p.date}</td>
                      <td className="px-4 py-3 text-slate-500">{p.weekday}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">{p.entry}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">{p.breakOut}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">{p.breakIn}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">{p.exit}</td>
                      <td className="px-4 py-3 font-mono text-xs font-medium text-slate-800">{p.worked}</td>
                      <td className={`px-4 py-3 font-mono text-xs font-medium ${p.balance.startsWith('-') ? 'text-red-600' : 'text-green-600'}`}>{p.balance}</td>
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1 text-xs font-medium ${s.cls}`}>
                          <Icon className="w-3 h-3" /> {s.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
