import { useState } from 'react';
import { Plus, Search, Download, MoreHorizontal, ChevronUp, ChevronDown } from 'lucide-react';

const SUB_TABS = [
  { id: 'description', label: 'Descrição de Cargos'       },
  { id: 'grades',      label: 'Faixas Salariais e Grades' },
  { id: 'budget',      label: 'Budget de Headcount'       },
];

const POSITIONS = [
  { id: 'P001', title: 'Desenvolvedor Full Stack',    cbo: '2122-10', level: 'Pleno', dept: 'TI – Desenvolvimento',   reqs: 6, active: 22 },
  { id: 'P002', title: 'Desenvolvedor Full Stack',    cbo: '2122-10', level: 'Sênior', dept: 'TI – Desenvolvimento',  reqs: 7, active: 8  },
  { id: 'P003', title: 'Analista de RH',              cbo: '2523-05', level: 'Júnior', dept: 'Recursos Humanos',      reqs: 4, active: 5  },
  { id: 'P004', title: 'Analista de RH',              cbo: '2523-05', level: 'Pleno', dept: 'Recursos Humanos',       reqs: 5, active: 8  },
  { id: 'P005', title: 'Gerente Comercial',           cbo: '1412-05', level: 'Gerência', dept: 'Comercial & Vendas', reqs: 9, active: 4  },
  { id: 'P006', title: 'Executivo de Vendas',         cbo: '3541-20', level: 'Pleno', dept: 'Comercial & Vendas',    reqs: 5, active: 20 },
  { id: 'P007', title: 'Analista Financeiro',         cbo: '2410-25', level: 'Pleno', dept: 'Financeiro',            reqs: 6, active: 12 },
  { id: 'P008', title: 'Especialista em Qualidade',   cbo: '2145-35', level: 'Sênior', dept: 'Qualidade (SGQ)',      reqs: 8, active: 6  },
  { id: 'P009', title: 'Coordenador de Suporte',      cbo: '2124-15', level: 'Coordenação', dept: 'TI – Suporte',   reqs: 7, active: 3  },
  { id: 'P010', title: 'Designer UX/UI',              cbo: '2631-25', level: 'Pleno', dept: 'Tecnologia',            reqs: 5, active: 4  },
];

const LEVEL_BADGE: Record<string, string> = {
  'Júnior':      'bg-slate-100 text-slate-600',
  'Pleno':       'bg-blue-100 text-blue-700',
  'Sênior':      'bg-indigo-100 text-indigo-700',
  'Coordenação': 'bg-purple-100 text-purple-700',
  'Gerência':    'bg-pink-100 text-pink-700',
  'Diretoria':   'bg-rose-100 text-rose-700',
};

const GRADES = [
  { grade: 'A1', min: 'R$ 2.200', mid: 'R$ 2.800', max: 'R$ 3.500',  positions: ['Assistente Adm. Júnior', 'Auxiliar de Suporte'] },
  { grade: 'A2', min: 'R$ 3.000', mid: 'R$ 3.800', max: 'R$ 4.800',  positions: ['Analista Júnior', 'Técnico Pleno'] },
  { grade: 'B1', min: 'R$ 4.500', mid: 'R$ 5.800', max: 'R$ 7.200',  positions: ['Analista Pleno', 'Dev Full Stack Pleno'] },
  { grade: 'B2', min: 'R$ 6.500', mid: 'R$ 8.500', max: 'R$ 11.000', positions: ['Analista Sênior', 'Dev Full Stack Sênior'] },
  { grade: 'C1', min: 'R$ 9.000', mid: 'R$ 12.000', max: 'R$ 16.000', positions: ['Especialista', 'Tech Lead'] },
  { grade: 'C2', min: 'R$ 14.000', mid: 'R$ 18.000', max: 'R$ 24.000', positions: ['Coordenador', 'Gerente Júnior'] },
  { grade: 'D1', min: 'R$ 20.000', mid: 'R$ 26.000', max: 'R$ 34.000', positions: ['Gerente', 'Gerente Sênior'] },
  { grade: 'D2', min: 'R$ 30.000', mid: 'R$ 42.000', max: 'R$ 60.000', positions: ['Diretor', 'C-Level'] },
];

const BUDGET = [
  { dept: 'TI – Desenvolvimento',   approved: 25, current: 22, budget: 'R$ 520.000', spent: 'R$ 468.000', delta: -3 },
  { dept: 'TI – Infraestrutura',    approved: 12, current: 10, budget: 'R$ 210.000', spent: 'R$ 185.000', delta: -2 },
  { dept: 'Comercial & Vendas',     approved: 60, current: 54, budget: 'R$ 1.100.000', spent: 'R$ 988.000', delta: -6 },
  { dept: 'Recursos Humanos',       approved: 20, current: 18, budget: 'R$ 390.000', spent: 'R$ 356.000', delta: -2 },
  { dept: 'Financeiro',             approved: 24, current: 24, budget: 'R$ 580.000', spent: 'R$ 580.000', delta: 0  },
  { dept: 'Operações',              approved: 75, current: 72, budget: 'R$ 1.450.000', spent: 'R$ 1.398.000', delta: -3 },
  { dept: 'Marketing',              approved: 16, current: 15, budget: 'R$ 340.000', spent: 'R$ 320.000', delta: -1 },
  { dept: 'Jurídico & Compliance',  approved: 8,  current: 8,  budget: 'R$ 250.000', spent: 'R$ 250.000', delta: 0  },
  { dept: 'Qualidade (SGQ)',        approved: 18, current: 16, budget: 'R$ 310.000', spent: 'R$ 278.000', delta: -2 },
];

function DescriptionTab() {
  const [search, setSearch] = useState('');
  const filtered = POSITIONS.filter(
    (p) => p.title.toLowerCase().includes(search.toLowerCase()) || p.dept.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar cargo ou departamento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400 w-72"
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
            <Download className="w-4 h-4" /> Exportar
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium">
            <Plus className="w-4 h-4" /> Novo Cargo
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Cargo</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">CBO</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Nível</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Departamento</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Requisitos</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Func. Ativos</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-800">{p.title}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.cbo}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${LEVEL_BADGE[p.level] ?? 'bg-slate-100 text-slate-600'}`}>
                    {p.level}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{p.dept}</td>
                <td className="px-4 py-3 text-slate-600">{p.reqs} itens</td>
                <td className="px-4 py-3 text-slate-600">{p.active}</td>
                <td className="px-4 py-3">
                  <button className="text-slate-400 hover:text-slate-600 transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">Nenhum cargo encontrado.</div>
        )}
      </div>
    </div>
  );
}

function GradesTab() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">Faixas salariais organizadas por grade. Clique para editar.</p>
        <button className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium">
          <Plus className="w-4 h-4" /> Nova Grade
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Grade</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Piso (Mín.)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Midpoint</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Teto (Máx.)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Cargos incluídos</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {GRADES.map((g) => (
              <tr key={g.grade} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-4 py-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-pink-50 text-pink-700 font-bold text-sm">{g.grade}</span>
                </td>
                <td className="px-4 py-3 text-slate-600">{g.min}</td>
                <td className="px-4 py-3 font-semibold text-slate-800">{g.mid}</td>
                <td className="px-4 py-3 text-slate-600">{g.max}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {g.positions.map((pos) => (
                      <span key={pos} className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{pos}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <button className="text-slate-400 hover:text-slate-600 transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BudgetTab() {
  const totalApproved = BUDGET.reduce((s, r) => s + r.approved, 0);
  const totalCurrent  = BUDGET.reduce((s, r) => s + r.current, 0);
  const totalDelta    = totalCurrent - totalApproved;

  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-xl p-4">
          <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider mb-1">Headcount Aprovado</p>
          <p className="text-3xl font-bold text-blue-700">{totalApproved}</p>
        </div>
        <div className="bg-slate-100 rounded-xl p-4">
          <p className="text-xs text-slate-600 font-semibold uppercase tracking-wider mb-1">Headcount Atual</p>
          <p className="text-3xl font-bold text-slate-700">{totalCurrent}</p>
        </div>
        <div className={`rounded-xl p-4 ${totalDelta < 0 ? 'bg-amber-50' : 'bg-green-50'}`}>
          <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${totalDelta < 0 ? 'text-amber-600' : 'text-green-600'}`}>Variação</p>
          <p className={`text-3xl font-bold flex items-center gap-1 ${totalDelta < 0 ? 'text-amber-700' : 'text-green-700'}`}>
            {totalDelta < 0 ? <ChevronDown className="w-6 h-6" /> : <ChevronUp className="w-6 h-6" />}
            {Math.abs(totalDelta)} vagas
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Departamento</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">HC Aprovado</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">HC Atual</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Variação</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Budget Aprovado</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Gasto Atual</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {BUDGET.map((row) => (
              <tr key={row.dept} className="hover:bg-slate-50/60 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-800">{row.dept}</td>
                <td className="px-4 py-3 text-slate-600">{row.approved}</td>
                <td className="px-4 py-3 text-slate-600">{row.current}</td>
                <td className="px-4 py-3">
                  {row.delta === 0 ? (
                    <span className="text-slate-400 text-xs">—</span>
                  ) : row.delta < 0 ? (
                    <span className="inline-flex items-center gap-0.5 text-amber-600 font-medium text-xs">
                      <ChevronDown className="w-3 h-3" />{Math.abs(row.delta)} vagas abertas
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 text-green-600 font-medium text-xs">
                      <ChevronUp className="w-3 h-3" />{row.delta}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{row.budget}</td>
                <td className="px-4 py-3 text-slate-600">{row.spent}</td>
                <td className="px-4 py-3">
                  <button className="text-slate-400 hover:text-slate-600 transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Positions() {
  const [activeTab, setActiveTab] = useState('description');

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cargos, Salários e Budget</h1>
          <p className="text-slate-500 text-sm mt-1">Descrição de cargos, faixas salariais e planejamento de headcount</p>
        </div>
      </div>

      {/* Card with sub-tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        {/* Sub-tabs */}
        <div className="flex border-b border-slate-100 px-6 pt-4 gap-6">
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

        <div className="p-6">
          {activeTab === 'description' && <DescriptionTab />}
          {activeTab === 'grades'      && <GradesTab />}
          {activeTab === 'budget'      && <BudgetTab />}
        </div>
      </div>
    </div>
  );
}
