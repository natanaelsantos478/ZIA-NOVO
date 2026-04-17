/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────
export type ColorScheme  = 'light' | 'dark' | 'system';
export type AccentColor  = 'indigo' | 'violet' | 'blue' | 'emerald' | 'rose' | 'amber' | 'slate';
export type BorderRadius = 'sharp' | 'default' | 'rounded' | 'pill';
export type GlowLevel    = 'none' | 'subtle' | 'vivid';

export interface ThemeSettings {
  colorScheme:    ColorScheme;
  accentColor:    AccentColor;
  borderRadius:   BorderRadius;
  glowLevel:      GlowLevel;
  compactMode:    boolean;
  sidebarStyle:   'default' | 'minimal' | 'bordered';
  useCompanyLogo: boolean;
}

export interface ThemeContextType {
  settings: ThemeSettings;
  isDark:   boolean;
  update:   (patch: Partial<ThemeSettings>) => void;
  reset:    () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'zia_theme_v2';

export const DEFAULT_SETTINGS: ThemeSettings = {
  colorScheme:    'light',
  accentColor:    'indigo',
  borderRadius:   'default',
  glowLevel:      'none',
  compactMode:    false,
  sidebarStyle:   'default',
  useCompanyLogo: false,
};

export const ACCENT_COLORS: Record<AccentColor, { label: string; hex: string; tw: string; ring: string }> = {
  indigo:  { label: 'Índigo',    hex: '#6366f1', tw: 'bg-indigo-500',  ring: 'ring-indigo-500'  },
  violet:  { label: 'Violeta',   hex: '#8b5cf6', tw: 'bg-violet-500',  ring: 'ring-violet-500'  },
  blue:    { label: 'Azul',      hex: '#3b82f6', tw: 'bg-blue-500',    ring: 'ring-blue-500'    },
  emerald: { label: 'Esmeralda', hex: '#10b981', tw: 'bg-emerald-500', ring: 'ring-emerald-500' },
  rose:    { label: 'Rosa',      hex: '#f43f5e', tw: 'bg-rose-500',    ring: 'ring-rose-500'    },
  amber:   { label: 'Âmbar',     hex: '#f59e0b', tw: 'bg-amber-500',   ring: 'ring-amber-500'   },
  slate:   { label: 'Cinza',     hex: '#64748b', tw: 'bg-slate-500',   ring: 'ring-slate-500'   },
};

// ── Context ───────────────────────────────────────────────────────────────────
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function resolveIsDark(scheme: ColorScheme): boolean {
  if (scheme === 'dark')   return true;
  if (scheme === 'light')  return false;
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyToDOM(s: ThemeSettings, isDark: boolean) {
  const html = document.documentElement;
  html.setAttribute('data-zia-theme',   isDark ? 'dark' : 'light');
  html.setAttribute('data-zia-radius',  s.borderRadius);
  html.setAttribute('data-zia-glow',    s.glowLevel);
  html.setAttribute('data-zia-compact', s.compactMode ? 'true' : 'false');
  html.setAttribute('data-zia-accent',  s.accentColor);
  html.setAttribute('data-zia-sidebar', s.sidebarStyle);
  // Also toggle Tailwind's dark class for dark: variants
  if (isDark) html.classList.add('dark');
  else        html.classList.remove('dark');
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ThemeSettings>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return DEFAULT_SETTINGS;
  });

  const isDark = resolveIsDark(settings.colorScheme);

  // Sync system preference
  useEffect(() => {
    if (settings.colorScheme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyToDOM(settings, mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [settings]);

  // Apply to DOM on every settings change
  useEffect(() => { applyToDOM(settings, isDark); }, [settings, isDark]);

  function update(patch: Partial<ThemeSettings>) {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  function reset() {
    setSettings(DEFAULT_SETTINGS);
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }

  return (
    <ThemeContext.Provider value={{ settings, isDark, update, reset }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
