import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface NavItem {
  icon: React.ElementType;
  label: string;
  id: string;
}

// Static class map — Tailwind requires complete class strings to include them in the build
const COLORS = {
  purple:  { gradient: 'from-purple-500 to-indigo-600',  active: 'bg-purple-600',  accent: 'text-purple-400'  },
  pink:    { gradient: 'from-pink-500 to-rose-600',      active: 'bg-pink-600',    accent: 'text-pink-400'    },
  blue:    { gradient: 'from-blue-500 to-cyan-600',      active: 'bg-blue-600',    accent: 'text-blue-400'    },
  emerald: { gradient: 'from-emerald-500 to-teal-600',   active: 'bg-emerald-600', accent: 'text-emerald-400' },
  green:   { gradient: 'from-green-500 to-emerald-600',  active: 'bg-green-600',   accent: 'text-green-400'   },
  amber:   { gradient: 'from-amber-500 to-orange-600',   active: 'bg-amber-600',   accent: 'text-amber-400'   },
  slate:   { gradient: 'from-slate-500 to-slate-700',    active: 'bg-slate-600',   accent: 'text-slate-400'   },
} as const;

export type ModuleColor = keyof typeof COLORS;

interface ModuleSidebarProps {
  moduleTitle: string;
  moduleCode: string;
  color: ModuleColor;
  navItems: NavItem[];
  activeId: string;
  onNavigate: (id: string) => void;
}

export default function ModuleSidebar({
  moduleTitle, moduleCode, color, navItems, activeId, onNavigate,
}: ModuleSidebarProps) {
  const navigate = useNavigate();
  const theme = COLORS[color];

  return (
    <aside className="w-60 bg-slate-950 border-r border-slate-800 flex flex-col h-full shrink-0">

      {/* Cabeçalho do módulo */}
      <div className="px-4 pt-4 pb-4 border-b border-slate-800">
        <button
          onClick={() => navigate('/app')}
          className="flex items-center gap-1.5 text-slate-500 hover:text-white text-[11px] transition-colors group mb-4"
        >
          <ArrowLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
          Hub de Módulos
        </button>

        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${theme.gradient} flex items-center justify-center shrink-0 shadow-lg`}>
            <span className="text-white font-black text-[10px] tracking-wider">{moduleCode}</span>
          </div>
          <div className="min-w-0">
            <p className={`text-[10px] font-black uppercase tracking-widest ${theme.accent}`}>{moduleCode}</p>
            <p className="text-white font-semibold text-xs leading-tight truncate">{moduleTitle}</p>
          </div>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 custom-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm transition-all ${
                isActive
                  ? theme.active + ' text-white font-bold shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/70 font-medium'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
