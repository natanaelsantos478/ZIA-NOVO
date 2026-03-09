// ─────────────────────────────────────────────────────────────────────────────
// ProfileContext — Sistema de perfis de acesso da ZIA
// 4 níveis: 1=Holding · 2=Matriz · 3=Filial · 4=Funcionário
// Armazenamento: localStorage (sem Supabase ainda)
// ─────────────────────────────────────────────────────────────────────────────
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type AccessLevel = 1 | 2 | 3 | 4;
export type EntityType  = 'holding' | 'matrix' | 'branch';

export interface OperatorProfile {
  id: string;
  code: string;          // 5 dígitos: "00001"
  name: string;
  level: AccessLevel;    // 1=Holding · 2=Matriz · 3=Filial · 4=Funcionário
  entityType: EntityType;
  entityId: string;      // ID da holding/matriz/filial
  entityName: string;    // Nome exibível
  moduleAccess?: string; // Somente nível 4 — módulo que o funcionário pode acessar
  password?: string;     // Reservado para uso futuro
  active: boolean;
  createdAt: string;
}

export const LEVEL_LABELS: Record<AccessLevel, string> = {
  1: 'Gestor Holding',
  2: 'Gestor de Matriz',
  3: 'Gestor de Filial',
  4: 'Funcionário',
};

export const LEVEL_COLORS: Record<AccessLevel, string> = {
  1: 'bg-violet-100 text-violet-700 border-violet-200',
  2: 'bg-blue-100 text-blue-700 border-blue-200',
  3: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  4: 'bg-slate-100 text-slate-600 border-slate-200',
};

// Módulos disponíveis para acesso de funcionários nível 4
export const MODULE_OPTIONS: { id: string; label: string; route: string }[] = [
  { id: 'erp',       label: 'ERP — Backoffice',  route: '/app/backoffice' },
  { id: 'hr',        label: 'RH',                route: '/app/hr'         },
  { id: 'crm',       label: 'CRM',               route: '/app/crm'        },
  { id: 'quality',   label: 'Qualidade',          route: '/app/quality'    },
  { id: 'docs',      label: 'Documentos',         route: '/app/docs'       },
  { id: 'assets',    label: 'Ativos (EAM)',        route: '/app/assets'     },
  { id: 'logistics', label: 'Logística (SCM)',     route: '/app/logistics'  },
  { id: 'caixa',     label: 'Caixa (PDV)',         route: '/app/backoffice' },
];

// Perfil mestre pré-criado (Gestor Holding — código 00001)
const MASTER_PROFILE: OperatorProfile = {
  id: 'profile-00001',
  code: '00001',
  name: 'Gestor Holding',
  level: 1,
  entityType: 'holding',
  entityId: 'holding-001',
  entityName: 'ZIA Omnisystem Holding',
  active: true,
  createdAt: '2024-01-01T00:00:00.000Z',
};

// ── Context type ──────────────────────────────────────────────────────────────

interface ProfileContextType {
  profiles: OperatorProfile[];
  activeProfile: OperatorProfile | null;
  setActiveProfile: (p: OperatorProfile | null) => void;
  addProfile: (data: Omit<OperatorProfile, 'id' | 'code' | 'createdAt'>) => OperatorProfile;
  updateProfile: (id: string, changes: Partial<OperatorProfile>) => void;
  deleteProfile: (id: string) => void;
  nextCode: () => string;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

const STORAGE_KEY = 'zia_profiles_v1';
const ACTIVE_KEY  = 'zia_active_profile_v1';

// ── Provider ──────────────────────────────────────────────────────────────────

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<OperatorProfile[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: OperatorProfile[] = JSON.parse(stored);
        // Garante que o perfil mestre sempre existe
        const hasMaster = parsed.some(p => p.id === MASTER_PROFILE.id);
        return hasMaster ? parsed : [MASTER_PROFILE, ...parsed];
      }
    } catch { /* ignore */ }
    return [MASTER_PROFILE];
  });

  const [activeProfile, setActiveProfileState] = useState<OperatorProfile | null>(() => {
    try {
      const id = localStorage.getItem(ACTIVE_KEY);
      if (id) {
        const stored = localStorage.getItem(STORAGE_KEY);
        const profs: OperatorProfile[] = stored ? JSON.parse(stored) : [MASTER_PROFILE];
        const all = profs.some(p => p.id === MASTER_PROFILE.id) ? profs : [MASTER_PROFILE, ...profs];
        return all.find(p => p.id === id) ?? null;
      }
    } catch { /* ignore */ }
    return null;
  });

  // Persiste sempre que os perfis mudarem
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  }, [profiles]);

  function setActiveProfile(p: OperatorProfile | null) {
    setActiveProfileState(p);
    if (p) {
      localStorage.setItem(ACTIVE_KEY, p.id);
    } else {
      localStorage.removeItem(ACTIVE_KEY);
    }
  }

  function nextCode(): string {
    const max = profiles.reduce((acc, p) => Math.max(acc, parseInt(p.code, 10)), 0);
    return String(max + 1).padStart(5, '0');
  }

  function addProfile(data: Omit<OperatorProfile, 'id' | 'code' | 'createdAt'>): OperatorProfile {
    const profile: OperatorProfile = {
      ...data,
      id: `profile-${Date.now()}`,
      code: nextCode(),
      createdAt: new Date().toISOString(),
    };
    setProfiles(prev => [...prev, profile]);
    return profile;
  }

  function updateProfile(id: string, changes: Partial<OperatorProfile>) {
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p));
    // Atualiza perfil ativo se for o mesmo
    setActiveProfileState(prev =>
      prev?.id === id ? { ...prev, ...changes } : prev
    );
  }

  function deleteProfile(id: string) {
    if (id === MASTER_PROFILE.id) return; // perfil mestre nunca pode ser removido
    setProfiles(prev => prev.filter(p => p.id !== id));
    if (activeProfile?.id === id) setActiveProfile(null);
  }

  return (
    <ProfileContext.Provider value={{
      profiles,
      activeProfile,
      setActiveProfile,
      addProfile,
      updateProfile,
      deleteProfile,
      nextCode,
    }}>
      {children}
    </ProfileContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useProfiles() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfiles must be used within ProfileProvider');
  return ctx;
}

/**
 * useScope — Retorna informações de escopo do perfil ativo.
 *
 * Uso em módulos para filtrar dados:
 *
 *   const scope = useScope();
 *
 *   // Verificar se uma entidade está no escopo:
 *   const visible = scope.canSee('branch-001');
 *
 *   // Verificar nível:
 *   if (scope.isHolding) { ... }   // Nível 1 — vê tudo
 *   if (scope.isMatrix)  { ... }   // Nível 2 — vê matriz + filiais dela
 *   if (scope.isBranch)  { ... }   // Nível 3/4 — vê só a própria filial
 *
 * Quando não há backend, use scopedEntityIds para filtrar arrays mock:
 *   const myData = allData.filter(d => scope.scopedEntityIds.includes(d.entityId));
 */
export interface ScopeInfo {
  level: AccessLevel | null;
  entityId: string | null;
  entityType: EntityType | null;
  entityName: string | null;
  isHolding: boolean;
  isMatrix: boolean;
  isBranch: boolean;
  /** IDs que o perfil pode ver — preenchido por CompaniesContext externamente */
  scopedEntityIds: string[];
  /** Retorna true se o id passado está no escopo do perfil */
  canSee: (entityId: string) => boolean;
}

export function useScope(): ScopeInfo {
  const { activeProfile } = useProfiles();

  if (!activeProfile) {
    return {
      level: null,
      entityId: null,
      entityType: null,
      entityName: null,
      isHolding: false,
      isMatrix: false,
      isBranch: false,
      scopedEntityIds: [],
      canSee: () => false,
    };
  }

  // Holding vê tudo (scopedEntityIds será [] mas canSee retorna true)
  const isHolding = activeProfile.level === 1;
  const isMatrix  = activeProfile.level === 2;
  const isBranch  = activeProfile.level === 3 || activeProfile.level === 4;

  // Para holding: sempre pode ver qualquer entityId
  // Para outros: scopedEntityIds deve ser preenchido por CompaniesContext
  // (por enquanto deixamos vazio — os módulos podem checar isHolding primeiro)
  const scopedEntityIds: string[] = isBranch ? [activeProfile.entityId] : [];

  return {
    level: activeProfile.level,
    entityId: activeProfile.entityId,
    entityType: activeProfile.entityType,
    entityName: activeProfile.entityName,
    isHolding,
    isMatrix,
    isBranch,
    scopedEntityIds,
    canSee: (id: string) => {
      if (isHolding) return true;
      return scopedEntityIds.includes(id);
    },
  };
}
