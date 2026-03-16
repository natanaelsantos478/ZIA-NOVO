import { useState } from 'react';
import {
  ShoppingCart, DollarSign, Settings, BarChart3,
  Package, Users, Truck, FileText, Landmark, Receipt,
  ArrowDownCircle, ArrowUpCircle, RefreshCw, TrendingUp,
  ClipboardList, Layers, BarChart2, PieChart,
  Banknote, CreditCard, ListChecks, KanbanSquare, UserCircle,
  FolderKanban, Activity, Building2, AlertCircle, Warehouse,
  ShoppingBag, Headphones, Briefcase, Wrench, Store,
  ChevronRight, ArrowLeft, X, GitFork, Tag, Settings2,
} from 'lucide-react';
import Header from '../../components/Layout/Header';
import ERPModule from './ERPModule';

// ── Definição dos 4 módulos principais ────────────────────────────────────────

const MODULES = {
  operacoes: {
    label: 'Operações',
    icon: ShoppingCart,
    color: 'blue',
    colorClass: 'bg-blue-600 hover:bg-blue-700 text-white',
    borderClass: 'border-blue-600',
    textClass: 'text-blue-600',
    bgLight: 'bg-blue-50',
    groups: [
      {
        label: 'Vendas e Pedidos',
        items: [
          { icon: ShoppingBag,    label: 'Pedido de Venda',      id: 'pedido-venda' },
          { icon: RefreshCw,      label: 'Pedido de Devolução',  id: 'pedido-devolucao' },
          { icon: Package,        label: 'Demonstração',         id: 'pedido-demonstracao' },
          { icon: Store,          label: 'Revenda de Produtos',  id: 'revenda-produtos' },
        ],
      },
      {
        label: 'Estoque',
        items: [
          { icon: Warehouse,      label: 'Consulta de Estoque',  id: 'estoque' },
          { icon: ArrowDownCircle,label: 'Entrada em Estoque',   id: 'entrada-estoque' },
          { icon: ArrowUpCircle,  label: 'Saída de Estoque',     id: 'saida-estoque' },
          { icon: RefreshCw,      label: 'Transação de Produto', id: 'transacao-produto' },
          { icon: Truck,          label: 'Transação Externa',    id: 'transacao-externa' },
        ],
      },
      {
        label: 'Caixa',
        items: [
          { icon: CreditCard,     label: 'Caixa',                id: 'caixa' },
        ],
      },
      {
        label: 'Cadastros',
        items: [
          { icon: Users,          label: 'Clientes',             id: 'cad-clientes' },
          { icon: Truck,          label: 'Fornecedores',         id: 'cad-fornecedores' },
          { icon: Package,        label: 'Produtos',             id: 'cad-produtos' },
          { icon: Layers,         label: 'Grupos de Produtos',   id: 'cad-grupos-produtos' },
        ],
      },
      {
        label: 'Atendimento',
        items: [
          { icon: Headphones,     label: 'Atendimento',          id: 'atendimento' },
          { icon: Briefcase,      label: 'Caso',                 id: 'caso' },
          { icon: Wrench,         label: 'Ordem de Serviço',     id: 'ordem-servico' },
        ],
      },
    ],
  },
  financeiro: {
    label: 'Financeiro',
    icon: DollarSign,
    color: 'emerald',
    colorClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    borderClass: 'border-emerald-600',
    textClass: 'text-emerald-600',
    bgLight: 'bg-emerald-50',
    groups: [
      {
        label: 'Faturamento',
        items: [
          { icon: Receipt,        label: 'Faturamento',           id: 'faturamento' },
          { icon: FileText,       label: 'Pedidos de Clientes',   id: 'pedidos-clientes' },
          { icon: ClipboardList,  label: 'Propostas',             id: 'propostas' },
          { icon: Settings2,      label: 'Tipos de Operação',     id: 'tipos-operacao' },
        ],
      },
      {
        label: 'Planilhas Gerais',
        items: [
          { icon: BarChart2,      label: 'Vendas',                id: 'planilha-vendas' },
          { icon: ListChecks,     label: 'Pedidos',               id: 'planilha-pedidos' },
          { icon: Truck,          label: 'Fretes',                id: 'planilha-fretes' },
        ],
      },
      {
        label: 'Logística Fiscal',
        items: [
          { icon: Package,        label: 'Faturamento de Cargas', id: 'faturamento-cargas' },
          { icon: FileText,       label: 'Consulta de Cargas',    id: 'consulta-cargas' },
          { icon: ClipboardList,  label: 'MDF-e',                 id: 'mdfe' },
        ],
      },
      {
        label: 'Vendas',
        items: [
          { icon: TrendingUp,     label: 'Força de Vendas',       id: 'forca-vendas' },
          { icon: Users,          label: 'Flexível — Vendedores', id: 'flexivel-vendedores' },
          { icon: ClipboardList,  label: 'Agrupamento ORCs',      id: 'agrupamento-orcs' },
          { icon: Store,          label: 'Integração Loja Virtual',id: 'integracao-loja' },
          { icon: CreditCard,     label: 'PDV',                   id: 'pdv' },
        ],
      },
      {
        label: 'Financeiro',
        items: [
          { icon: Banknote,       label: 'Vendas Realizadas',     id: 'vendas-realizadas' },
          { icon: Banknote,       label: 'Entrada de Valores',    id: 'entrada-valores' },
          { icon: ArrowUpCircle,  label: 'Saída de Valores',      id: 'saida-valores' },
          { icon: Landmark,       label: 'Hospedagem de Valores', id: 'hospedagem-valores' },
          { icon: PieChart,       label: 'Relatórios',            id: 'relatorios' },
        ],
      },
      {
        label: 'Custos',
        items: [
          { icon: GitFork,        label: 'Árvore de Custos',      id: 'arvore-custos' },
          { icon: Package,        label: 'Custos por Produto',    id: 'custos-produtos' },
          { icon: Tag,            label: 'Grupos de Custo',       id: 'grupos-custo' },
          { icon: Landmark,       label: 'Impostos',              id: 'impostos-erp' },
          { icon: BarChart2,      label: 'Análise de Margem',     id: 'analise-margem' },
        ],
      },
      {
        label: 'Colaboradores',
        items: [
          { icon: Users,          label: 'Funcionários',          id: 'funcionarios-fin' },
        ],
      },
    ],
  },
  administrativo: {
    label: 'Administrativo',
    icon: Settings,
    color: 'violet',
    colorClass: 'bg-violet-600 hover:bg-violet-700 text-white',
    borderClass: 'border-violet-600',
    textClass: 'text-violet-600',
    bgLight: 'bg-violet-50',
    groups: [
      {
        label: 'Gestão',
        items: [
          { icon: Activity,       label: 'Gestão de Atividades', id: 'gestao-atividades' },
          { icon: KanbanSquare,   label: 'Gerir Tarefas',        id: 'gerir-tarefas' },
        ],
      },
      {
        label: 'Colaborador',
        items: [
          { icon: UserCircle,     label: 'Perfil Colaborador',   id: 'perfil-colaborador' },
          { icon: Building2,      label: 'Empresas',             id: 'cad-empresas' },
        ],
      },
    ],
  },
  planejamento: {
    label: 'Planejamento',
    icon: BarChart3,
    color: 'amber',
    colorClass: 'bg-amber-600 hover:bg-amber-700 text-white',
    borderClass: 'border-amber-600',
    textClass: 'text-amber-600',
    bgLight: 'bg-amber-50',
    groups: [
      {
        label: 'Projetos',
        items: [
          { icon: FolderKanban,   label: 'Projetos',              id: 'projetos' },
          { icon: BarChart3,      label: 'Métricas',              id: 'metricas-projetos' },
          { icon: Layers,         label: 'Grupos de Projetos',    id: 'grupos-projetos' },
          { icon: ClipboardList,  label: 'Cadeias de Projetos',   id: 'cadeias-projetos' },
          { icon: AlertCircle,    label: 'Monitoramento',         id: 'monitoramento-projetos' },
        ],
      },
    ],
  },
} as const;

type ModuleKey = keyof typeof MODULES;

const MODULE_COLORS: Record<string, string> = {
  blue: 'text-blue-600 bg-blue-50 border-blue-200',
  emerald: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  violet: 'text-violet-600 bg-violet-50 border-violet-200',
  amber: 'text-amber-600 bg-amber-50 border-amber-200',
};

const MODULE_ACTIVE: Record<string, string> = {
  blue: 'bg-blue-600 text-white',
  emerald: 'bg-emerald-600 text-white',
  violet: 'bg-violet-600 text-white',
  amber: 'bg-amber-600 text-white',
};

const MODULE_HOVER: Record<string, string> = {
  blue: 'hover:bg-blue-50 hover:text-blue-700',
  emerald: 'hover:bg-emerald-50 hover:text-emerald-700',
  violet: 'hover:bg-violet-50 hover:text-violet-700',
  amber: 'hover:bg-amber-50 hover:text-amber-700',
};

// ── Componente Principal ───────────────────────────────────────────────────────

export default function ERPLayout() {
  const [activeModule, setActiveModule] = useState<ModuleKey | null>(null);
  const [activeSection, setActiveSection] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const module = activeModule ? MODULES[activeModule] : null;

  function handleModuleClick(key: ModuleKey) {
    if (activeModule === key) {
      setActiveModule(null);
      setActiveSection('');
    } else {
      setActiveModule(key);
      const firstItem = MODULES[key].groups[0]?.items[0];
      if (firstItem) setActiveSection(firstItem.id);
    }
  }

  function handleBack() {
    setActiveModule(null);
    setActiveSection('');
  }

  function handleSelectSection(id: string) {
    setActiveSection(id);
    setSidebarOpen(false);
  }

  const sidebarInner = (
    <>
      {/* Cabeçalho da sidebar */}
      <div className="flex items-center justify-between gap-2 px-4 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          {activeModule ? (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Módulos ERP</span>
            </button>
          ) : (
            <>
              <div className="w-7 h-7 bg-slate-800 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800 leading-none">ERP</div>
                <div className="text-[10px] text-slate-500 leading-none mt-0.5">Backoffice</div>
              </div>
            </>
          )}
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden text-slate-400 hover:text-slate-700"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── Sem módulo selecionado: 4 botões principais ── */}
      {!activeModule && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider px-2 mb-3">Escolha um módulo</p>
          {(Object.entries(MODULES) as [ModuleKey, typeof MODULES[ModuleKey]][]).map(([key, mod]) => {
            const Icon = mod.icon;
            return (
              <button
                key={key}
                onClick={() => handleModuleClick(key)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all border ${MODULE_COLORS[mod.color]}`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${mod.colorClass}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-800">{mod.label}</div>
                  <div className="text-xs text-slate-500">{mod.groups.reduce((a, g) => a + g.items.length, 0)} submodulos</div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 ml-auto" />
              </button>
            );
          })}
        </div>
      )}

      {/* ── Módulo selecionado: sidebar com submodulos ── */}
      {activeModule && module && (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className={`px-4 py-2 flex items-center gap-2 ${module.bgLight} border-b border-slate-100`}>
            <module.icon className={`w-4 h-4 ${module.textClass}`} />
            <span className={`text-xs font-bold uppercase tracking-wider ${module.textClass}`}>{module.label}</span>
          </div>
          <nav className="p-2 space-y-4">
            {module.groups.map((group) => (
              <div key={group.label}>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-3 py-1">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeSection === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelectSection(item.id)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-all ${
                          isActive
                            ? MODULE_ACTIVE[module.color]
                            : `text-slate-600 ${MODULE_HOVER[module.color]}`
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
      )}
    </>
  );

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden">
      <Header onMenuClick={() => setSidebarOpen(true)} />
      <div className="flex flex-1 overflow-hidden">

        {/* ── Mobile backdrop ───────────────────────────────────── */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* ── Desktop sidebar ───────────────────────────────────── */}
        <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 overflow-hidden flex-shrink-0">
          {sidebarInner}
        </aside>

        {/* ── Mobile slide-over sidebar ─────────────────────────── */}
        <aside
          className={`lg:hidden fixed inset-y-0 left-0 z-50 flex flex-col w-72 bg-white border-r border-slate-200 overflow-hidden transition-transform duration-300 ease-in-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {sidebarInner}
        </aside>

        {/* ── Conteúdo principal ─────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto bg-slate-50 custom-scrollbar mobile-main-pad">
          {!activeModule ? (
            <ERPHome onModuleSelect={(key) => handleModuleClick(key as ModuleKey)} />
          ) : (
            <ERPModule key={activeSection} activeSection={activeSection} moduleColor={module!.color} />
          )}
        </main>
      </div>
    </div>
  );
}

// ── Tela inicial do ERP ───────────────────────────────────────────────────────

function ERPHome({ onModuleSelect }: { onModuleSelect: (key: string) => void }) {
  const stats = [
    { label: 'Pedidos Hoje',     value: '—', icon: ShoppingCart,   color: 'blue'    },
    { label: 'Receita do Mês',   value: '—', icon: TrendingUp,     color: 'emerald' },
    { label: 'Contas a Pagar',   value: '—', icon: ArrowUpCircle,  color: 'red'     },
    { label: 'Contas a Receber', value: '—', icon: ArrowDownCircle,color: 'green'   },
  ];

  const STAT_COLORS: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    red: 'bg-red-100 text-red-600',
    green: 'bg-green-100 text-green-600',
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">ERP — Backoffice</h1>
        <p className="text-slate-500 mt-1">Selecione um módulo no painel lateral ou acesse diretamente abaixo</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${STAT_COLORS[s.color]}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-lg font-bold text-slate-800">{s.value}</div>
                <div className="text-xs text-slate-500">{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4 módulos */}
      <div className="grid grid-cols-2 gap-4">
        {(Object.entries(MODULES) as [string, typeof MODULES[ModuleKey]][]).map(([key, mod]) => {
          const Icon = mod.icon;
          return (
            <button
              key={key}
              onClick={() => onModuleSelect(key)}
              className={`bg-white rounded-xl border-2 p-6 text-left hover:shadow-md transition-all ${MODULE_COLORS[mod.color]}`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${mod.colorClass}`}>
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">{mod.label}</h3>
              <p className="text-sm text-slate-500 mt-1">
                {mod.groups.reduce((a, g) => a + g.items.length, 0)} submodulos disponíveis
              </p>
              <div className="mt-4 flex flex-wrap gap-1">
                {mod.groups.slice(0, 2).map((g) => (
                  <span key={g.label} className="text-xs bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                    {g.label}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
