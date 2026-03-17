import React, { useState } from 'react';
import { ArrowLeft, Menu, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface NavItem {
  icon: React.ElementType;
  label: string;
  id: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
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
  violet:  { gradient: 'from-violet-500 to-purple-700',  active: 'bg-violet-600',  accent: 'text-violet-400'  },
} as const;

export type ModuleColor = keyof typeof COLORS;

interface ModuleSidebarProps {
  moduleTitle: string;
  moduleCode: string;
  color: ModuleColor;
  navItems?: NavItem[];
  navGroups?: NavGroup[];
  activeId: string;
  onNavigate: (id: string) => void;
}

function NavButton({
  item, isActive, theme, onNavigate,
}: {
  item: NavItem;
  isActive: boolean;
  theme: (typeof COLORS)[ModuleColor];
  onNavigate: (id: string) => void;
}) {
  const Icon = item.icon;
  return (
    <button
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
}

// Compact bottom nav bar for mobile (max 5 pinned items)
function MobileBottomBar({
  navGroups, navItems, activeId, theme, onNavigate,
}: {
  navGroups?: NavGroup[];
  navItems?: NavItem[];
  activeId: string;
  theme: (typeof COLORS)[ModuleColor];
  onNavigate: (id: string) => void;
}) {
  const allItems = navGroups
    ? navGroups.flatMap(g => g.items)
    : (navItems ?? []);
  const pinned = allItems.slice(0, 4);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-slate-950 border-t border-slate-800 flex items-stretch h-16 safe-area-pb">
      {pinned.map(item => {
        const Icon = item.icon;
        const active = activeId === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors ${
              active ? 'text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Icon className={`w-5 h-5 ${active ? theme.accent : ''}`} />
            <span className="truncate max-w-[56px] text-center leading-tight">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default function ModuleSidebar({
  moduleTitle, moduleCode, color, navItems, navGroups, activeId, onNavigate,
}: ModuleSidebarProps) {
  const navigate = useNavigate();
  const theme = COLORS[color];
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleNavigate(id: string) {
    setMobileOpen(false);
    onNavigate(id);
  }

  const sidebarContent = (
    <>
      {/* Cabeçalho do módulo */}
      <div className="px-4 pt-4 pb-4 border-b border-slate-800 flex items-start justify-between">
        <div>
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
        {/* Close button — mobile only */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden text-slate-500 hover:text-white mt-1 shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 custom-scrollbar">
        {navGroups ? (
          <div className="space-y-5">
            {navGroups.map((group) => (
              <div key={group.label}>
                <p className="text-[10px] uppercase tracking-widest text-slate-600 font-bold px-3 mb-1.5">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <NavButton
                      key={item.id}
                      item={item}
                      isActive={activeId === item.id}
                      theme={theme}
                      onNavigate={handleNavigate}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-0.5">
            {(navItems ?? []).map((item) => (
              <NavButton
                key={item.id}
                item={item}
                isActive={activeId === item.id}
                theme={theme}
                onNavigate={handleNavigate}
              />
            ))}
          </div>
        )}
      </nav>
    </>
  );

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside className="hidden lg:flex w-60 bg-slate-950 border-r border-slate-800 flex-col h-full shrink-0">
        {sidebarContent}
      </aside>

      {/* ── Mobile: backdrop ────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile: slide-over drawer ───────────────────────────────────── */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-slate-950 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* ── Mobile: bottom nav bar (always visible) ─────────────────────── */}
      <MobileBottomBar
        navGroups={navGroups}
        navItems={navItems}
        activeId={activeId}
        theme={theme}
        onNavigate={handleNavigate}
      />

      {/* ── Mobile: hamburger FAB (opens full drawer) ───────────────────── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed bottom-[4.5rem] right-4 z-30 w-11 h-11 bg-slate-900 border border-slate-700 text-white rounded-full shadow-xl flex items-center justify-center"
        aria-label="Menu"
      >
        <Menu className="w-5 h-5" />
      </button>
    </>
  );
}
