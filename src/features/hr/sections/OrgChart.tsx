import { useState } from 'react';
import {
  Users, TrendingUp, Building2, Layers, ChevronRight,
  ChevronDown, Plus, Download, Upload, MoreHorizontal, X, ChevronLeft,
} from 'lucide-react';
import DepartmentDetail from './dept/DepartmentDetail';

/* ── Types ──────────────────────────────────────────────────────────────── */

export interface OrgNode {
  id: string;
  name: string;
  role: string;
  manager?: string;
  headcount: number;
  budget: string;
  costCenter: string;
  children?: OrgNode[];
}

export interface DeptRow {
  id: string;
  dept: string;
  manager: string;
  headcount: number;
  budget: string;
  costCenter: string;
  status: 'Ativo' | 'Inativo';
  companyId: string;
}

/* ── Companies ──────────────────────────────────────────────────────────── */

const COMPANIES = [
  { id: 'all',       name: 'Todas as Empresas'     },
  { id: 'matriz',    name: 'Grupo ZIA — Matriz'     },
  { id: 'filial-sp', name: 'ZIA Tecnologia SP'      },
  { id: 'filial-rj', name: 'ZIA Soluções RJ'        },
  { id: 'filial-mg', name: 'ZIA Operações MG'       },
];

/* ── Initial data ───────────────────────────────────────────────────────── */

const INITIAL_TREE: OrgNode = {
  id: 'ceo', name: 'Diretoria Executiva', role: 'CEO / Presidente',
  headcount: 3, budget: 'R$ 1.200.000', costCenter: 'CC-001',
  children: [
    {
      id: 'ti', name: 'Tecnologia da Informação', role: 'Diretor de TI',
      headcount: 38, budget: 'R$ 850.000', costCenter: 'CC-010',
      children: [
        { id: 'dev',     name: 'Desenvolvimento',  role: 'Gerente de Dev',   headcount: 22, budget: 'R$ 520.000', costCenter: 'CC-011' },
        { id: 'infra',   name: 'Infraestrutura',   role: 'Gerente de Infra', headcount: 10, budget: 'R$ 210.000', costCenter: 'CC-012' },
        { id: 'suporte', name: 'Suporte Técnico',  role: 'Coord. Suporte',   headcount: 6,  budget: 'R$ 120.000', costCenter: 'CC-013' },
      ],
    },
    {
      id: 'comercial', name: 'Comercial & Vendas', role: 'Diretor Comercial',
      headcount: 54, budget: 'R$ 1.100.000', costCenter: 'CC-020',
      children: [
        { id: 'inside', name: 'Inside Sales',    role: 'Gerente Inside', headcount: 20, budget: 'R$ 380.000', costCenter: 'CC-021' },
        { id: 'field',  name: 'Field Sales',     role: 'Gerente Field',  headcount: 18, budget: 'R$ 420.000', costCenter: 'CC-022' },
        { id: 'cs',     name: 'Customer Success',role: 'Gerente CS',     headcount: 16, budget: 'R$ 300.000', costCenter: 'CC-023' },
      ],
    },
    { id: 'rh',         name: 'Recursos Humanos',            role: 'Diretora de RH',           headcount: 18, budget: 'R$ 390.000',   costCenter: 'CC-030' },
    { id: 'financeiro', name: 'Financeiro & Controladoria',  role: 'CFO / Diretor Financeiro',  headcount: 24, budget: 'R$ 580.000',   costCenter: 'CC-040' },
    { id: 'operacoes',  name: 'Operações',                   role: 'COO / Diretor de Operações',headcount: 72, budget: 'R$ 1.450.000', costCenter: 'CC-050' },
    { id: 'marketing',  name: 'Marketing',                   role: 'CMO / Diretor de Marketing',headcount: 15, budget: 'R$ 340.000',   costCenter: 'CC-060' },
    { id: 'juridico',   name: 'Jurídico & Compliance',       role: 'Diretor Jurídico',          headcount: 8,  budget: 'R$ 250.000',   costCenter: 'CC-070' },
    { id: 'qualidade',  name: 'Qualidade (SGQ)',              role: 'Gerente de Qualidade',      headcount: 16, budget: 'R$ 310.000',   costCenter: 'CC-080' },
  ],
};

const INITIAL_TABLE: DeptRow[] = [
  { id: 'ti',         dept: 'Tecnologia da Informação',   manager: 'Roberto Alves',   headcount: 38, budget: 'R$ 850.000',   costCenter: 'CC-010', status: 'Ativo', companyId: 'matriz'    },
  { id: 'comercial',  dept: 'Comercial & Vendas',         manager: 'Fernanda Costa',  headcount: 54, budget: 'R$ 1.100.000', costCenter: 'CC-020', status: 'Ativo', companyId: 'matriz'    },
  { id: 'rh',         dept: 'Recursos Humanos',           manager: 'Carla Mendes',    headcount: 18, budget: 'R$ 390.000',   costCenter: 'CC-030', status: 'Ativo', companyId: 'matriz'    },
  { id: 'financeiro', dept: 'Financeiro & Controladoria', manager: 'Paulo Lima',      headcount: 24, budget: 'R$ 580.000',   costCenter: 'CC-040', status: 'Ativo', companyId: 'matriz'    },
  { id: 'operacoes',  dept: 'Operações',                  manager: 'Marcos Ribeiro',  headcount: 72, budget: 'R$ 1.450.000', costCenter: 'CC-050', status: 'Ativo', companyId: 'filial-sp' },
  { id: 'marketing',  dept: 'Marketing',                  manager: 'Julia Souza',     headcount: 15, budget: 'R$ 340.000',   costCenter: 'CC-060', status: 'Ativo', companyId: 'filial-sp' },
  { id: 'juridico',   dept: 'Jurídico & Compliance',      manager: 'André Ferreira',  headcount: 8,  budget: 'R$ 250.000',   costCenter: 'CC-070', status: 'Ativo', companyId: 'filial-rj' },
  { id: 'qualidade',  dept: 'Qualidade (SGQ)',             manager: 'Patrícia Duarte', headcount: 16, budget: 'R$ 310.000',   costCenter: 'CC-080', status: 'Ativo', companyId: 'filial-rj' },
];

const STATS_CFG = [
  { label: 'Total de Funcionários', icon: Users,      color: 'bg-pink-50 text-pink-600'   },
  { label: 'Departamentos',         icon: Building2,  color: 'bg-blue-50 text-blue-600'   },
  { label: 'Centros de Custo',      icon: Layers,     color: 'bg-amber-50 text-amber-600' },
  { label: 'Cargos Cadastrados',    icon: TrendingUp, color: 'bg-green-50 text-green-600' },
];

/* ── Tree helpers ───────────────────────────────────────────────────────── */

function flattenNodes(node: OrgNode, out: { id: string; name: string }[] = []) {
  out.push({ id: node.id, name: node.name });
  node.children?.forEach((c) => flattenNodes(c, out));
  return out;
}

function addChildToTree(node: OrgNode, parentId: string, child: OrgNode): OrgNode {
  if (node.id === parentId) return { ...node, children: [...(node.children ?? []), child] };
  if (!node.children) return node;
  return { ...node, children: node.children.map((c) => addChildToTree(c, parentId, child)) };
}

/* ── Org tree card ──────────────────────────────────────────────────────── */

const LEVEL_COLORS = [
  'border-pink-300 bg-pink-50',
  'border-slate-300 bg-slate-50',
  'border-blue-200 bg-blue-50',
];

function OrgNodeCard({
  node, level = 0, onSelect,
}: {
  node: OrgNode; level?: number; onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(level === 0);
  const hasChildren = (node.children?.length ?? 0) > 0;
  const color = LEVEL_COLORS[Math.min(level, LEVEL_COLORS.length - 1)];

  return (
    <div className="flex flex-col items-center">
      <div className={`relative border-2 rounded-xl px-4 py-3 min-w-[180px] max-w-[220px] shadow-sm hover:shadow-md transition-shadow ${color}`}>
        {/* click expand */}
        <div
          className="cursor-pointer select-none"
          onClick={() => hasChildren && setOpen((v) => !v)}
        >
          <p className="text-xs font-bold text-slate-700 truncate">{node.name}</p>
          <p className="text-[11px] text-slate-500 truncate">{node.role}</p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/80">
            <span className="text-[10px] text-slate-500">{node.headcount} func.</span>
            <span className="text-[10px] text-slate-400">{node.costCenter}</span>
          </div>
        </div>
        {/* open detail */}
        <button
          onClick={() => onSelect(node.id)}
          className="mt-2 w-full text-[10px] text-pink-600 font-medium hover:underline text-center"
        >
          Ver detalhes →
        </button>
        {hasChildren && (
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white border border-slate-300 flex items-center justify-center shadow-sm z-10 pointer-events-none">
            {open ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
          </div>
        )}
      </div>

      {hasChildren && open && (
        <div className="mt-6 pt-2 border-t-2 border-slate-200 flex flex-wrap justify-center gap-6 w-full">
          {node.children!.map((child) => (
            <div key={child.id} className="flex flex-col items-center">
              <div className="w-0.5 h-4 bg-slate-300" />
              <OrgNodeCard node={child} level={level + 1} onSelect={onSelect} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── New Department form ────────────────────────────────────────────────── */

interface DeptForm {
  name: string; role: string; manager: string; parentId: string;
  costCenter: string; budget: string; headcount: string;
  status: 'Ativo' | 'Inativo'; companyId: string;
}
const INIT_FORM: DeptForm = {
  name: '', role: '', manager: '', parentId: 'ceo',
  costCenter: '', budget: '', headcount: '', status: 'Ativo', companyId: 'matriz',
};
const INPUT = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400 bg-white';
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
        {label}{required && <span className="text-pink-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
function NewDeptModal({ allNodes, onCancel, onSave }: {
  allNodes: { id: string; name: string }[];
  onCancel: () => void;
  onSave: (f: DeptForm) => void;
}) {
  const [form, setForm] = useState<DeptForm>(INIT_FORM);
  const set = (p: Partial<DeptForm>) => setForm((prev) => ({ ...prev, ...p }));
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-800 text-lg">Novo Departamento</h2>
            <p className="text-xs text-slate-400 mt-0.5">Preencha os dados do novo departamento</p>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <Field label="Empresa" required>
            <select value={form.companyId} onChange={(e) => set({ companyId: e.target.value })} className={INPUT}>
              {COMPANIES.filter((c) => c.id !== 'all').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Nome do Departamento" required>
            <input type="text" value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ex: Engenharia de Dados" className={INPUT} />
          </Field>
          <Field label="Cargo do Responsável" required>
            <input type="text" value={form.role} onChange={(e) => set({ role: e.target.value })} placeholder="Ex: Gerente de Engenharia" className={INPUT} />
          </Field>
          <Field label="Gestor / Responsável">
            <input type="text" value={form.manager} onChange={(e) => set({ manager: e.target.value })} placeholder="Ex: Ana Beatriz Souza" className={INPUT} />
          </Field>
          <Field label="Departamento Superior" required>
            <select value={form.parentId} onChange={(e) => set({ parentId: e.target.value })} className={INPUT}>
              {allNodes.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Centro de Custo" required>
              <input type="text" value={form.costCenter} onChange={(e) => set({ costCenter: e.target.value })} placeholder="CC-090" className={INPUT} />
            </Field>
            <Field label="Headcount Planejado">
              <input type="number" min="0" value={form.headcount} onChange={(e) => set({ headcount: e.target.value })} placeholder="10" className={INPUT} />
            </Field>
          </div>
          <Field label="Orçamento Anual">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 font-medium shrink-0">R$</span>
              <input type="text" value={form.budget} onChange={(e) => set({ budget: e.target.value })} placeholder="450.000" className={INPUT} />
            </div>
          </Field>
          <Field label="Status">
            <div className="flex gap-2">
              {(['Ativo', 'Inativo'] as const).map((s) => (
                <label key={s} className={`flex items-center gap-2 px-4 py-2 border rounded-xl cursor-pointer text-sm font-medium transition-all flex-1 justify-center ${form.status === s ? 'border-pink-400 bg-pink-50 text-pink-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  <input type="radio" name="deptStatus" value={s} checked={form.status === s} onChange={() => set({ status: s })} className="sr-only" />
                  {s}
                </label>
              ))}
            </div>
          </Field>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 font-medium">Cancelar</button>
          <button
            onClick={() => { if (!form.name.trim() || !form.role.trim() || !form.costCenter.trim()) return; onSave(form); }}
            className="px-5 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium transition-colors"
          >Criar Departamento</button>
        </div>
      </div>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────────── */

export default function OrgChart() {
  const [view, setView]           = useState<'tree' | 'table'>('tree');
  const [showForm, setShowForm]   = useState(false);
  const [orgTree, setOrgTree]     = useState<OrgNode>(INITIAL_TREE);
  const [deptTable, setDeptTable] = useState<DeptRow[]>(INITIAL_TABLE);
  const [company, setCompany]     = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const allNodes   = flattenNodes(orgTree);
  const filtered   = company === 'all' ? deptTable : deptTable.filter((r) => r.companyId === company);
  const selectedDept = selectedId ? deptTable.find((d) => d.id === selectedId) ?? null : null;

  const stats = [
    { ...STATS_CFG[0], value: filtered.reduce((s, r) => s + r.headcount, 0).toString(), delta: '+12 este mês' },
    { ...STATS_CFG[1], value: filtered.length.toString(),                                delta: `${filtered.filter((r) => r.status === 'Ativo').length} ativos` },
    { ...STATS_CFG[2], value: filtered.length.toString(),                                delta: `${filtered.length} centros ativos` },
    { ...STATS_CFG[3], value: '61',                                                      delta: '5 novos cargos' },
  ];

  const handleSave = (form: DeptForm) => {
    const budgetFormatted = form.budget
      ? `R$ ${Number(form.budget.replace(/\D/g, '')).toLocaleString('pt-BR')}`
      : 'R$ 0';
    const headcount = parseInt(form.headcount, 10) || 0;
    const newId = form.costCenter.toLowerCase().replace(/[^a-z0-9]/g, '-');
    setDeptTable((prev) => [...prev, {
      id: newId, dept: form.name, manager: form.manager || '—',
      headcount, budget: budgetFormatted, costCenter: form.costCenter,
      status: form.status, companyId: form.companyId,
    }]);
    setOrgTree((prev) => addChildToTree(prev, form.parentId, {
      id: newId, name: form.name, role: form.role, manager: form.manager,
      headcount, budget: budgetFormatted, costCenter: form.costCenter,
    }));
    setShowForm(false);
  };

  /* ── If dept selected, render detail ─────────────────────────────────── */
  if (selectedDept) {
    const companyName = COMPANIES.find((c) => c.id === selectedDept.companyId)?.name ?? '';
    return (
      <DepartmentDetail
        dept={selectedDept}
        companyName={companyName}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <div className="p-8">
      {showForm && <NewDeptModal allNodes={allNodes} onCancel={() => setShowForm(false)} onSave={handleSave} />}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Organograma Dinâmico</h1>
          <p className="text-slate-500 text-sm mt-1">Estrutura hierárquica, centros de custo e fluxos de aprovação</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Company filter */}
          <select
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-pink-500/30"
          >
            {COMPANIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            <Upload className="w-4 h-4" /> Importar
          </button>
          <button className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            <Download className="w-4 h-4" /> Exportar
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 transition-colors font-medium">
            <Plus className="w-4 h-4" /> Novo Departamento
          </button>
        </div>
      </div>

      {/* Company badge */}
      {company !== 'all' && (
        <div className="flex items-center gap-2 mb-6">
          <span className="text-xs font-medium bg-pink-100 text-pink-700 px-3 py-1 rounded-full">
            {COMPANIES.find((c) => c.id === company)?.name}
          </span>
          <button onClick={() => setCompany('all')} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
            <X className="w-3 h-3" /> Limpar filtro
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map((s) => { const Icon = s.icon; return (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-500">{s.label}</span>
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${s.color}`}><Icon className="w-4 h-4" /></div>
            </div>
            <p className="text-2xl font-bold text-slate-800">{s.value}</p>
            <p className="text-xs text-slate-400 mt-1">{s.delta}</p>
          </div>
        ); })}
      </div>

      {/* View toggle */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-700">Estrutura da Organização</h2>
          <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
            {(['tree', 'table'] as const).map((v) => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${view === v ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500'}`}>
                {v === 'tree' ? 'Árvore' : 'Tabela'}
              </button>
            ))}
          </div>
        </div>

        {view === 'tree' ? (
          <div className="p-8 overflow-auto">
            <OrgNodeCard node={orgTree} onSelect={setSelectedId} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Departamento','Empresa','Gestor','Funcionários','Orçamento Anual','Centro de Custo','Status',''].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((row) => (
                  <tr key={row.costCenter} className="hover:bg-slate-50/60 transition-colors cursor-pointer" onClick={() => setSelectedId(row.id)}>
                    <td className="px-6 py-4 font-medium text-slate-800 hover:text-pink-600 transition-colors">{row.dept}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      <span className="bg-slate-100 px-2 py-0.5 rounded-full">
                        {COMPANIES.find((c) => c.id === row.companyId)?.name ?? row.companyId}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{row.manager}</td>
                    <td className="px-6 py-4 text-slate-600">{row.headcount}</td>
                    <td className="px-6 py-4 text-slate-600">{row.budget}</td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded">{row.costCenter}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${row.status === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={(e) => { e.stopPropagation(); }} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
