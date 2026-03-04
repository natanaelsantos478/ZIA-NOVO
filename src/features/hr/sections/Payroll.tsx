import { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, Users, TrendingDown, ChevronLeft, ChevronRight,
  CheckCircle, Clock, AlertTriangle, MoreHorizontal,
  Download, Lock, Play, Search,
} from 'lucide-react';
import { getPayrollRuns, getPayrollItems, PayrollItem } from '../../../lib/hr';

type PayrollType = 'Mensal' | 'Quinzenal' | '13º Salário' | 'Rescisões' | 'Adiantamentos';
type PayrollStatus = 'Aberta' | 'Em Processamento' | 'Aguardando Aprovação' | 'Fechada' | 'Paga';

interface PayrollEmployee {
  id: string;
  name: string;
  role: string;
  dept: string;
  salaryBase: number;
  heBonus: number;
  commissions: number;
  additionals: number;
  totalGross: number;
  inss: number;
  irrf: number;
  benefits: number;
  advances: number;
  absences: number;
  totalDeductions: number;
  netSalary: number;
  status: PayrollStatus;
}

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function mapItem(item: PayrollItem): PayrollEmployee {
  return {
    id: item.id,
    name: item.employee_name ?? '—',
    role: item.role ?? '—',
    dept: item.dept ?? '—',
    salaryBase: item.salary_base,
    heBonus: item.he_bonus,
    commissions: item.commissions,
    additionals: item.additionals,
    totalGross: item.total_gross,
    inss: item.inss,
    irrf: item.irrf,
    benefits: item.benefits,
    advances: item.advances,
    absences: item.absences_deduction,
    totalDeductions: item.total_deductions,
    netSalary: item.net_salary,
    status: (item.status as PayrollStatus) || 'Aberta',
  };
}

const STATUS_CONFIG: Record<PayrollStatus, { color: string; icon: React.ElementType; label: string }> = {
  'Aberta':                { color: 'bg-slate-100 text-slate-600',  icon: Clock,         label: 'Aberta'               },
  'Em Processamento':      { color: 'bg-blue-100 text-blue-700',    icon: Play,          label: 'Em Processamento'     },
  'Aguardando Aprovação':  { color: 'bg-amber-100 text-amber-700',  icon: AlertTriangle, label: 'Aguardando Aprovação' },
  'Fechada':               { color: 'bg-indigo-100 text-indigo-700', icon: Lock,         label: 'Fechada'              },
  'Paga':                  { color: 'bg-green-100 text-green-700',  icon: CheckCircle,   label: 'Paga'                 },
};

const PAY_TYPES: PayrollType[] = ['Mensal', 'Quinzenal', '13º Salário', 'Rescisões', 'Adiantamentos'];

function fmt(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function MonthlyTab({ items, loading }: { items: PayrollEmployee[]; loading: boolean }) {
  const [search, setSearch] = useState('');
  const filtered = items.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.dept.toLowerCase().includes(search.toLowerCase()),
  );

  const totalGross  = items.reduce((s, e) => s + e.totalGross, 0);
  const totalDeduct = items.reduce((s, e) => s + e.totalDeductions, 0);
  const totalNet    = items.reduce((s, e) => s + e.netSalary, 0);
  const pending     = items.filter((e) => e.status !== 'Paga' && e.status !== 'Fechada').length;

  return (
    <div>
      {loading && <div className="py-8 text-center text-slate-400 text-sm">Carregando folha...</div>}
      {!loading && <><div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total Bruto',        value: fmt(totalGross),  color: 'text-slate-700 bg-slate-50'   },
          { label: 'Total Descontos',    value: fmt(totalDeduct), color: 'text-rose-700 bg-rose-50'     },
          { label: 'Total Líquido',      value: fmt(totalNet),    color: 'text-green-700 bg-green-50'   },
          { label: 'Pendentes de Ação',  value: `${pending} func.`, color: 'text-amber-700 bg-amber-50' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl p-4 border border-slate-100 ${s.color}`}>
            <p className="text-xs opacity-70 mb-1">{s.label}</p>
            <p className="text-xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Actions row */}
      <div className="flex items-center justify-between mb-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Buscar colaborador..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 w-56"
          />
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
            <Download className="w-4 h-4" /> Exportar
          </button>
          <button className="flex items-center gap-2 px-3 py-2 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 font-medium">
            <Lock className="w-4 h-4" /> Fechar Folha
          </button>
          <button className="flex items-center gap-2 px-3 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium">
            <Play className="w-4 h-4" /> Processar Folha
          </button>
        </div>
      </div>

      {/* Payroll table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              {['Colaborador', 'Salário Base', 'HE / Bônus', 'Comissões', 'Total Bruto', 'INSS', 'IRRF', 'Outros Desc.', 'Total Desc.', 'Líquido', 'Status'].map((h) => (
                <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
              ))}
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((e) => {
              const cfg = STATUS_CONFIG[e.status];
              const Icon = cfg.icon;
              return (
                <tr key={e.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-3 py-3">
                    <p className="font-medium text-slate-800 text-xs">{e.name}</p>
                    <p className="text-[11px] text-slate-400">{e.dept}</p>
                  </td>
                  <td className="px-3 py-3 text-xs text-slate-600 whitespace-nowrap">{fmt(e.salaryBase)}</td>
                  <td className="px-3 py-3 text-xs text-slate-600 whitespace-nowrap">{e.heBonus > 0 ? fmt(e.heBonus) : '—'}</td>
                  <td className="px-3 py-3 text-xs text-slate-600 whitespace-nowrap">{e.commissions > 0 ? fmt(e.commissions) : '—'}</td>
                  <td className="px-3 py-3 text-xs font-bold text-slate-800 whitespace-nowrap">{fmt(e.totalGross)}</td>
                  <td className="px-3 py-3 text-xs text-rose-600 whitespace-nowrap">{fmt(e.inss)}</td>
                  <td className="px-3 py-3 text-xs text-rose-600 whitespace-nowrap">{fmt(e.irrf)}</td>
                  <td className="px-3 py-3 text-xs text-rose-600 whitespace-nowrap">{fmt(e.benefits + e.advances + e.absences)}</td>
                  <td className="px-3 py-3 text-xs font-semibold text-rose-700 whitespace-nowrap">{fmt(e.totalDeductions)}</td>
                  <td className="px-3 py-3 text-xs font-bold text-green-700 whitespace-nowrap">{fmt(e.netSalary)}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${cfg.color}`}>
                      <Icon className="w-3 h-3" />{cfg.label}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal className="w-4 h-4" /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 bg-slate-50/80">
              <td className="px-3 py-3 text-xs font-bold text-slate-700">TOTAL ({filtered.length} func.)</td>
              <td className="px-3 py-3 text-xs font-semibold text-slate-700">{fmt(filtered.reduce((s, e) => s + e.salaryBase, 0))}</td>
              <td className="px-3 py-3 text-xs font-semibold text-slate-700">{fmt(filtered.reduce((s, e) => s + e.heBonus, 0))}</td>
              <td className="px-3 py-3 text-xs font-semibold text-slate-700">{fmt(filtered.reduce((s, e) => s + e.commissions, 0))}</td>
              <td className="px-3 py-3 text-xs font-bold text-slate-800">{fmt(filtered.reduce((s, e) => s + e.totalGross, 0))}</td>
              <td className="px-3 py-3 text-xs font-semibold text-rose-700">{fmt(filtered.reduce((s, e) => s + e.inss, 0))}</td>
              <td className="px-3 py-3 text-xs font-semibold text-rose-700">{fmt(filtered.reduce((s, e) => s + e.irrf, 0))}</td>
              <td className="px-3 py-3 text-xs font-semibold text-rose-700">{fmt(filtered.reduce((s, e) => s + e.benefits + e.advances + e.absences, 0))}</td>
              <td className="px-3 py-3 text-xs font-bold text-rose-800">{fmt(filtered.reduce((s, e) => s + e.totalDeductions, 0))}</td>
              <td className="px-3 py-3 text-xs font-bold text-green-700">{fmt(filtered.reduce((s, e) => s + e.netSalary, 0))}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
      </>}
    </div>
  );
}

function PlaceholderTab({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-pink-50 flex items-center justify-center mb-4">
        <DollarSign className="w-8 h-8 text-pink-300" />
      </div>
      <h3 className="text-slate-700 font-semibold mb-1">{title}</h3>
      <p className="text-slate-400 text-sm max-w-sm">
        Nenhum registro encontrado para a competência selecionada. Clique em "Processar" para iniciar.
      </p>
      <button className="mt-4 px-4 py-2 text-sm font-medium text-white bg-pink-600 rounded-lg hover:bg-pink-700 flex items-center gap-2">
        <Play className="w-4 h-4" /> Iniciar Processamento
      </button>
    </div>
  );
}

export default function Payroll() {
  const [activeType, setActiveType] = useState<PayrollType>('Mensal');
  const [monthIndex, setMonthIndex] = useState(1);
  const [items, setItems]           = useState<PayrollEmployee[]>([]);
  const [loading, setLoading]       = useState(true);

  const loadPayroll = useCallback(async () => {
    setLoading(true);
    const runs = await getPayrollRuns();
    if (runs.length > 0) {
      const run = runs[0];
      const data = await getPayrollItems(run.id);
      setItems(data.map(mapItem));
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadPayroll(); }, [loadPayroll]);

  const totalGross = items.reduce((s, e) => s + e.totalGross, 0);
  const totalNet   = items.reduce((s, e) => s + e.netSalary, 0);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Central de Folha de Pagamento</h1>
          <p className="text-slate-500 text-sm mt-1">Processamento mensal, quinzenal, 13º, rescisões e adiantamentos — integrado ao ERP</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
          <button onClick={() => setMonthIndex((m) => Math.max(0, m - 1))} className="text-slate-400 hover:text-slate-600">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-slate-700 w-36 text-center">{MONTHS[monthIndex]} / 2025</span>
          <button onClick={() => setMonthIndex((m) => Math.min(11, m + 1))} className="text-slate-400 hover:text-slate-600">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Folha Bruta Total',   value: fmt(totalGross), icon: DollarSign, color: 'text-slate-600 bg-slate-50'  },
          { label: 'Folha Líquida Total', value: fmt(totalNet),   icon: DollarSign, color: 'text-green-600 bg-green-50'  },
          { label: 'Funcionários',         value: `${items.length}`,  icon: Users,  color: 'text-blue-600 bg-blue-50'    },
          { label: 'Encargos (INSS emp.)', value: fmt(totalGross * 0.28), icon: TrendingDown, color: 'text-rose-600 bg-rose-50' },
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
              <p className="text-xl font-bold text-slate-800">{s.value}</p>
            </div>
          );
        })}
      </div>

      {/* Card with payroll type tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex border-b border-slate-100 px-6 pt-4 gap-4">
          {PAY_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setActiveType(t)}
              className={`pb-3 text-sm font-semibold transition-all border-b-2 -mb-px whitespace-nowrap ${
                activeType === t ? 'text-pink-600 border-pink-600' : 'text-slate-500 border-transparent hover:text-slate-700'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="p-6">
          {activeType === 'Mensal'      && <MonthlyTab items={items} loading={loading} />}
          {activeType !== 'Mensal'      && <PlaceholderTab title={`Folha ${activeType}`} />}
        </div>
      </div>
    </div>
  );
}
