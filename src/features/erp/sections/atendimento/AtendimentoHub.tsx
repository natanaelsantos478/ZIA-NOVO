// ─────────────────────────────────────────────────────────────────────────────
// AtendimentoHub — Container com sub-sidebar própria para o módulo de Atendimento
// A sub-sidebar aparece apenas dentro desta seção (não na sidebar principal do ERP)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, lazy, Suspense } from 'react';
import {
  LayoutDashboard, Plus, Clock, CheckCircle2,
  TableProperties, Briefcase, FilePlus2, Stethoscope,
  ChevronRight, ChevronLeft, Headphones,
} from 'lucide-react';
import Loader from '../../../../components/UI/Loader';

const AtendDashboard    = lazy(() => import('./views/AtendDashboard'));
const NovoAtendimento   = lazy(() => import('./views/NovoAtendimento'));
const EmAndamento       = lazy(() => import('./views/EmAndamento'));
const Finalizados       = lazy(() => import('./views/Finalizados'));
const TodosRegistros    = lazy(() => import('./views/TodosRegistros'));
const ListaCasos        = lazy(() => import('./views/ListaCasos'));
const NovoCaso          = lazy(() => import('./views/NovoCaso'));
const Diagnosticos      = lazy(() => import('./views/Diagnosticos'));

// ─── Navegação da sub-sidebar ─────────────────────────────────────────────────
const SUB_NAV = [
  {
    label: 'Visão Geral',
    items: [
      { id: 'dashboard',       icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'Fila de Atendimento',
    items: [
      { id: 'novo',            icon: Plus,            label: 'Novo Atendimento' },
      { id: 'em-andamento',    icon: Clock,           label: 'Em Andamento' },
      { id: 'finalizados',     icon: CheckCircle2,    label: 'Finalizados' },
      { id: 'todos',           icon: TableProperties, label: 'Todos os Registros' },
    ],
  },
  {
    label: 'Gestão de Casos',
    items: [
      { id: 'casos',           icon: Briefcase,       label: 'Lista de Casos' },
      { id: 'novo-caso',       icon: FilePlus2,       label: 'Novo Caso' },
      { id: 'diagnosticos',    icon: Stethoscope,     label: 'Diagnósticos' },
    ],
  },
] as const;

type SubView = typeof SUB_NAV[number]['items'][number]['id'];

function SubSidebar({
  active, onSelect, collapsed, onToggle,
}: {
  active: SubView;
  onSelect: (id: SubView) => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <aside
      className={`flex flex-col bg-white border-r border-slate-200 flex-shrink-0 transition-all duration-200 ${collapsed ? 'w-12' : 'w-52'}`}
    >
      {/* Toggle */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-slate-100">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Headphones className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Atendimento</span>
          </div>
        )}
        <button
          onClick={onToggle}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors ml-auto"
          title={collapsed ? 'Expandir' : 'Recolher'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-2 custom-scrollbar">
        {SUB_NAV.map((group) => (
          <div key={group.label} className="mb-3">
            {!collapsed && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-3 py-1">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5 px-1.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = active === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelect(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'
                    } ${collapsed ? 'justify-center' : ''}`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}

function SubContent({ view, onNavigate }: { view: SubView; onNavigate: (v: string) => void }) {
  switch (view) {
    case 'dashboard':    return <AtendDashboard onNavigate={onNavigate} />;
    case 'novo':         return <NovoAtendimento onBack={() => onNavigate('todos')} />;
    case 'em-andamento': return <EmAndamento />;
    case 'finalizados':  return <Finalizados />;
    case 'todos':        return <TodosRegistros onNovo={() => onNavigate('novo')} />;
    case 'casos':        return <ListaCasos onNovo={() => onNavigate('novo-caso')} />;
    case 'novo-caso':    return <NovoCaso onBack={() => onNavigate('casos')} />;
    case 'diagnosticos': return <Diagnosticos />;
    default:             return null;
  }
}

export default function AtendimentoHub() {
  const [activeView, setActiveView] = useState<SubView>('dashboard');
  const [collapsed, setCollapsed] = useState(false);

  function handleNavigate(v: string) { setActiveView(v as SubView); }

  return (
    <div className="flex h-full overflow-hidden">
      <SubSidebar
        active={activeView}
        onSelect={setActiveView}
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
      />
      <main className="flex-1 overflow-y-auto bg-slate-50 custom-scrollbar">
        <Suspense fallback={<Loader />}>
          <SubContent view={activeView} onNavigate={handleNavigate} />
        </Suspense>
      </main>
    </div>
  );
}
