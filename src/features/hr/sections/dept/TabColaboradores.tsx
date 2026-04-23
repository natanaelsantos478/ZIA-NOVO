import { useEffect, useMemo, useState } from 'react';
import {
  Users, Clock, AlertCircle, TrendingDown, ChevronRight,
  Search, Filter,
} from 'lucide-react';
import type { DeptRow } from '../OrgChart';
import { getEmployees, type Employee as HrEmployee } from '../../../../lib/hr';

/* ── Types ──────────────────────────────────────────────────────────────── */

type SubTab = 'dashboard' | 'funcionarios' | 'ponto';

type UiStatus = 'Ativo' | 'Férias' | 'Afastado';
type UiWorkMode = 'Presencial' | 'Híbrido' | 'Remoto';

interface EmployeeView {
  id: string;
  name: string;
  role: string;
  contract: string;
  status: UiStatus;
  workMode: UiWorkMode;
  admission: string;
  email: string;
  cpf: string;
  salary: string;
}

/* ── Status maps ─────────────────────────────────────────────────────────── */

const STATUS_BADGE: Record<UiStatus, string> = {
  Ativo:    'bg-green-100 text-green-700',
  Férias:   'bg-blue-100 text-blue-700',
  Afastado: 'bg-amber-100 text-amber-700',
};
const MODE_BADGE: Record<UiWorkMode, string> = {
  Presencial: 'bg-slate-100 text-slate-600',
  Híbrido:    'bg-purple-100 text-purple-700',
  Remoto:     'bg-teal-100 text-teal-700',
};

function toUiStatus(s: string | null | undefined): UiStatus {
  const v = (s ?? '').toLowerCase();
  if (v.includes('féri') || v.includes('feri')) return 'Férias';
  if (v.includes('afast') || v.includes('licen')) return 'Afastado';
  return 'Ativo';
}
function toUiWorkMode(s: string | null | undefined): UiWorkMode {
  const v = (s ?? '').toLowerCase();
  if (v.includes('remot')) return 'Remoto';
  if (v.includes('híbr') || v.includes('hibr') || v === 'hybrid') return 'Híbrido';
  return 'Presencial';
}

function mapEmployee(e: HrEmployee): EmployeeView {
  const salaryRaw = (e.personal_data as Record<string, unknown>)?.salary;
  const salary = typeof salaryRaw === 'number'
    ? `R$ ${salaryRaw.toLocaleString('pt-BR')}`
    : typeof salaryRaw === 'string' && salaryRaw.trim() ? salaryRaw : '—';
  return {
    id: e.id,
    name: e.full_name,
    role: e.position_title ?? '—',
    contract: e.contract_type ?? '—',
    status: toUiStatus(e.status),
    workMode: toUiWorkMode(e.work_mode),
    admission: e.admission_date ?? '—',
    email: e.email ?? '—',
    cpf: e.cpf ?? '—',
    salary,
  };
}

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
function EmployeeModal({ emp, onClose }: { emp: EmployeeView; onClose: () => void }) {
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
function Dashboard({ dept, employees }: { dept: DeptRow; employees: EmployeeView[] }) {
  const total      = employees.length || 1;
  const activos    = employees.filter((e) => e.status === 'Ativo').length;
  const ferias     = employees.filter((e) => e.status === 'Férias').length;
  const afastados  = employees.filter((e) => e.status === 'Afastado').length;

  return (
    <div className="p-8 space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Ativos"     value={activos.toString()}   delta={`de ${dept.headcount} total`} icon={Users}        color="bg-green-50 text-green-600"  />
        <KpiCard label="Em Férias"  value={ferias.toString()}    delta="neste mês"                    icon={Clock}        color="bg-blue-50 text-blue-600"    />
        <KpiCard label="Afastados"  value={afastados.toString()} delta="atestado/licença"             icon={AlertCircle}  color="bg-amber-50 text-amber-600"  />
        <KpiCard label="Faltas/mês" value="—"                    delta="aguardando ponto"             icon={TrendingDown} color="bg-red-50 text-red-600"      />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-700 mb-4">Distribuição por Modalidade</h3>
          {[
            { label: 'Remoto',     count: employees.filter((e) => e.workMode === 'Remoto').length,     color: 'bg-teal-400'    },
            { label: 'Híbrido',    count: employees.filter((e) => e.workMode === 'Híbrido').length,    color: 'bg-purple-400'  },
            { label: 'Presencial', count: employees.filter((e) => e.workMode === 'Presencial').length, color: 'bg-slate-400'   },
          ].map(({ label, count, color }) => (
            <div key={label} className="flex items-center gap-3 mb-3">
              <span className="text-sm text-slate-600 w-24">{label}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-2">
                <div className={`h-2 rounded-full ${color}`} style={{ width: `${(count / total) * 100}%` }} />
              </div>
              <span className="text-sm font-medium text-slate-700 w-6 text-right">{count}</span>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-700 mb-4">Tipo de Contrato</h3>
          {[
            { label: 'CLT', count: employees.filter((e) => e.contract.toUpperCase() === 'CLT').length, color: 'bg-pink-400' },
            { label: 'PJ',  count: employees.filter((e) => e.contract.toUpperCase() === 'PJ').length,  color: 'bg-indigo-400' },
          ].map(({ label, count, color }) => (
            <div key={label} className="flex items-center gap-3 mb-3">
              <span className="text-sm text-slate-600 w-24">{label}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-2">
                <div className={`h-2 rounded-full ${color}`} style={{ width: `${(count / total) * 100}%` }} />
              </div>
              <span className="text-sm font-medium text-slate-700 w-6 text-right">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-700">Últimas Inconsistências de Ponto</h3>
        </div>
        <div className="px-6 py-8 text-center text-sm text-slate-400">
          <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          Integração de ponto em desenvolvimento.
        </div>
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────────── */

export default function TabColaboradores({ dept }: { dept: DeptRow }) {
  const [sub, setSub] = useState<SubTab>('dashboard');
  const [search, setSearch] = useState('');
  const [selectedEmp, setSelectedEmp] = useState<EmployeeView | null>(null);
  const [rows, setRows] = useState<HrEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    getEmployees()
      .then((all) => {
        if (!alive) return;
        const scoped = dept.id
          ? all.filter((e) => e.department_id === dept.id)
          : all;
        setRows(scoped);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'Erro ao carregar colaboradores');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, [dept.id]);

  const employees = useMemo(() => rows.map(mapEmployee), [rows]);

  const filtered = useMemo(() => employees.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.role.toLowerCase().includes(search.toLowerCase()),
  ), [employees, search]);

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

      {loading && (
        <div className="p-8 text-center text-sm text-slate-400">Carregando colaboradores...</div>
      )}
      {error && !loading && (
        <div className="p-8 text-center text-sm text-red-500">{error}</div>
      )}

      {!loading && !error && sub === 'dashboard' && <Dashboard dept={dept} employees={employees} />}

      {!loading && !error && sub === 'funcionarios' && (
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
            {filtered.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-slate-400">
                Nenhum colaborador neste departamento.
              </div>
            ) : (
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
            )}
          </div>
        </div>
      )}

      {!loading && !error && sub === 'ponto' && (
        <div className="p-8">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
            <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-700 mb-1">Controle de Ponto</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Integração com dispositivo de ponto eletrônico em desenvolvimento. Em breve você poderá visualizar aqui os registros de entrada, saída e saldo de horas dos colaboradores.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
