import { useNavigate } from 'react-router-dom';
import {
  Briefcase, Users, Wrench, Truck, Building,
  ShieldCheck, FolderOpen, Settings, ArrowRight,
  Activity, Repeat2, BrainCircuit, Search, Bell,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import GestorContent from '../gestor/GestorContent';

interface ModuleTab {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
}

const MODULE_TABS: ModuleTab[] = [
  { id: 'crm',         name: 'Vendas',      icon: Briefcase,    color: 'from-purple-500 to-indigo-600'  },
  { id: 'hr',          name: 'Pessoas',     icon: Users,        color: 'from-pink-500 to-rose-600'      },
  { id: 'assets',      name: 'Ativos',      icon: Wrench,       color: 'from-blue-500 to-cyan-600'      },
  { id: 'logistics',   name: 'Logística',   icon: Truck,        color: 'from-emerald-500 to-teal-600'   },
  { id: 'backoffice',  name: 'Backoffice',  icon: Building,     color: 'from-slate-600 to-slate-800'    },
  { id: 'assinaturas', name: 'Assinaturas', icon: Repeat2,      color: 'from-violet-500 to-purple-700'  },
  { id: 'quality',     name: 'Qualidade',   icon: ShieldCheck,  color: 'from-green-500 to-emerald-600'  },
  { id: 'docs',        name: 'Documentos',  icon: FolderOpen,   color: 'from-amber-500 to-orange-600'   },
  { id: 'ia',          name: 'IA',          icon: BrainCircuit, color: 'from-violet-500 to-purple-800'  },
  { id: 'settings',    name: 'Config',      icon: Settings,     color: 'from-slate-500 to-slate-700'    },
];

export default function ModuleHub() {
  const { activeModule, setActiveModule, setActiveIndicator } = useAppContext();
  const navigate = useNavigate();

  const currentTab = MODULE_TABS.find(t => t.id === activeModule) ?? MODULE_TABS[0];

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 overflow-hidden">

      {/* HEADER */}
      <header className="h-14 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-4">
          <Activity className="w-8 h-8 text-indigo-500" />
          <div className="flex items-center gap-1">
            <span className="text-xl font-bold text-white">ZIA</span>
            <span className="text-xl font-light text-slate-500">mind</span>
          </div>
          <div className="h-6 w-px bg-slate-800 mx-2" />
          <span className="text-sm text-slate-400">Gestor › {currentTab.name}</span>
        </div>

        <div className="flex-1 max-w-md mx-8 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar em todos os módulos..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl py-1.5 pl-10 pr-4 text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
          />
        </div>

        <div className="flex items-center gap-3">
          <button className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
            <Bell className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate(`/app/${activeModule}`)}
            className={`bg-gradient-to-r ${currentTab.color} text-white rounded-xl px-4 py-2 font-semibold text-sm flex items-center gap-2 hover:opacity-90 transition-opacity`}
          >
            Abrir {currentTab.name} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* TABS — selecionam o módulo exibido no centro do Gestor */}
      <nav className="h-12 bg-slate-900 border-b border-slate-800 flex items-center px-4 gap-1 overflow-x-auto shrink-0 custom-scrollbar">
        {MODULE_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveModule(tab.id); setActiveIndicator(''); }}
            className={
              tab.id === activeModule
                ? `bg-gradient-to-r ${tab.color} text-white px-4 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-lg scale-105 shrink-0 transition-transform`
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 px-4 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 shrink-0 transition-all'
            }
          >
            <tab.icon className="w-4 h-4" />
            {tab.name}
          </button>
        ))}
      </nav>

      {/* CORPO — sempre o Gestor; os tabs acima controlam o painel central */}
      <GestorContent />

    </div>
  );
}
