import { useState, useEffect } from 'react';
import { Plus, Users, Calendar, CheckCircle, AlertTriangle, MoreHorizontal } from 'lucide-react';
import { getPayrollGroups } from '../../../lib/hr';
import type { PayrollGroup as HrPayrollGroup } from '../../../lib/hr';

interface CalcRule {
  label: string;
  value: string;
}

interface PayrollGroup {
  id: string;
  name: string;
  cnpj: string;
  contractType: 'CLT' | 'PJ' | 'Estágio' | 'Temporário';
  employeeCount: number;
  paymentDay: number;
  paymentFrequency: 'Mensal' | 'Quinzenal';
  inssRate: string;
  irrfTable: string;
  fgts: boolean;
  ferias: boolean;
  status: 'Ativo' | 'Inativo';
  rules: CalcRule[];
  lastProcessed: string;
}

function mapPayrollGroup(r: HrPayrollGroup): PayrollGroup {
  const nameLower = r.name.toLowerCase();
  let contractType: PayrollGroup['contractType'] = 'CLT';
  if (nameLower.includes('pj') || nameLower.includes('prestador')) contractType = 'PJ';
  else if (nameLower.includes('estágio') || nameLower.includes('estagio') || nameLower.includes('bolsista')) contractType = 'Estágio';
  else if (nameLower.includes('temporário') || nameLower.includes('temporario')) contractType = 'Temporário';

  const isClt = contractType === 'CLT' || contractType === 'Temporário';

  return {
    id:               r.id,
    name:             r.name,
    cnpj:             '—',
    contractType,
    employeeCount:    r.employee_count,
    paymentDay:       r.payment_day,
    paymentFrequency: r.frequency === 'Quinzenal' ? 'Quinzenal' : 'Mensal',
    inssRate:         isClt ? 'Progressiva 7,5% – 14%' : 'N/A',
    irrfTable:        isClt ? 'Tabela Vigente' : '—',
    fgts:             isClt,
    ferias:           contractType === 'CLT',
    status:           'Ativo',
    rules:            [],
    lastProcessed:    '—',
  };
}

const CONTRACT_BADGE: Record<string, string> = {
  CLT:        'bg-indigo-100 text-indigo-700',
  PJ:         'bg-purple-100 text-purple-700',
  Estágio:    'bg-teal-100 text-teal-700',
  Temporário: 'bg-amber-100 text-amber-700',
};

function GroupCard({ group }: { group: PayrollGroup }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${group.status === 'Inativo' ? 'border-slate-100 opacity-70' : 'border-slate-200'}`}>
      {/* Card header */}
      <div className="flex items-start justify-between p-5">
        <div className="flex items-start gap-4">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${CONTRACT_BADGE[group.contractType]}`}>
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-slate-800">{group.name}</h3>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${CONTRACT_BADGE[group.contractType]}`}>
                {group.contractType}
              </span>
              {group.status === 'Inativo' && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500">Inativo</span>
              )}
            </div>
            <p className="text-xs text-slate-400">{group.cnpj}</p>
          </div>
        </div>
        <button className="text-slate-400 hover:text-slate-600"><MoreHorizontal className="w-4 h-4" /></button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-0 border-t border-slate-100">
        {[
          { label: 'Funcionários',   value: group.employeeCount.toString() },
          { label: 'Pagamento',      value: `Todo dia ${group.paymentDay}` },
          { label: 'Frequência',     value: group.paymentFrequency        },
          { label: 'Últ. Processo', value: group.lastProcessed           },
        ].map((s, i) => (
          <div key={s.label} className={`px-4 py-3 ${i < 3 ? 'border-r border-slate-100' : ''}`}>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">{s.label}</p>
            <p className="text-sm font-semibold text-slate-700">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Benefits flags */}
      <div className="flex items-center gap-3 px-5 py-3 border-t border-slate-100">
        {[
          { label: 'FGTS',   enabled: group.fgts   },
          { label: 'Férias', enabled: group.ferias  },
        ].map((flag) => (
          <div key={flag.label} className="flex items-center gap-1.5 text-xs">
            {flag.enabled
              ? <CheckCircle className="w-3.5 h-3.5 text-green-500" />
              : <AlertTriangle className="w-3.5 h-3.5 text-slate-300" />
            }
            <span className={flag.enabled ? 'text-green-700 font-medium' : 'text-slate-400'}>{flag.label}</span>
          </div>
        ))}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="ml-auto text-xs text-pink-600 font-semibold hover:text-pink-700"
        >
          {expanded ? 'Ocultar regras ↑' : 'Ver regras de cálculo ↓'}
        </button>
      </div>

      {/* Expandable rules */}
      {expanded && (
        <div className="border-t border-slate-100 px-5 py-4 bg-slate-50/50">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Regras de Cálculo</p>
          <div className="space-y-2">
            {group.rules.map((r) => (
              <div key={r.label} className="flex items-start justify-between gap-4 text-sm">
                <span className="text-slate-500 shrink-0 w-40">{r.label}</span>
                <span className="text-slate-700 text-right">{r.value}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <button className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
              Editar Grupo
            </button>
            <button className="px-3 py-1.5 text-xs font-semibold text-white bg-pink-600 rounded-lg hover:bg-pink-700 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Processar Agora
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PayrollGroups() {
  const [groups, setGroups] = useState<PayrollGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPayrollGroups()
      .then((data) => setGroups(data.map(mapPayrollGroup)))
      .catch((err) => console.error('Erro ao carregar grupos de folha:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Grupos de Folha</h1>
          <p className="text-slate-500 text-sm mt-1">Agrupamentos por CNPJ e tipo de contrato com regras de cálculo e datas de pagamento específicas</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium">
          <Plus className="w-4 h-4" /> Novo Grupo
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Grupos Ativos',  value: groups.filter((g) => g.status === 'Ativo').length.toString()  },
          { label: 'CLT',            value: groups.filter((g) => g.contractType === 'CLT').reduce((s, g) => s + g.employeeCount, 0).toString() + ' func.' },
          { label: 'PJ / Terceiros', value: groups.filter((g) => g.contractType === 'PJ').reduce((s, g) => s + g.employeeCount, 0).toString() + ' func.'  },
          { label: 'Bolsistas',      value: groups.filter((g) => g.contractType === 'Estágio').reduce((s, g) => s + g.employeeCount, 0).toString() + ' func.' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs text-slate-500 mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-slate-800">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {loading && <div className="text-center py-8 text-slate-400 text-sm">Carregando...</div>}
        {!loading && groups.map((g) => <GroupCard key={g.id} group={g} />)}
      </div>
    </div>
  );
}
