/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/set-state-in-effect */
// ─────────────────────────────────────────────────────────────────────────────
// ProfileContext — Sistema de perfis de acesso da ZIA
// 4 níveis: 1=Holding · 2=Matriz · 3=Filial · 4=Funcionário
// Persistido no Supabase (tabela zia_operator_profiles)
// ─────────────────────────────────────────────────────────────────────────────
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';

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
  password?: string;
  email?: string;
  emailVerified?: boolean;
  pendingOtp?: string;
  employeeId?: string;
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

// Chave localStorage para o perfil ativo (apenas o ID — dado de preferência de sessão)
const ACTIVE_KEY = 'zia_active_profile_v1';
// Chave localStorage para o entityId do perfil ativo (usado pelo erp.ts para tenant isolation)
export const ACTIVE_ENTITY_KEY = 'zia_active_entity_id_v1';
// Chave localStorage para o array de IDs de escopo (holding vê todas, matriz vê suas filiais, filial vê só ela)
export const SCOPE_IDS_KEY = 'zia_scope_ids_v1';

// ── Mapeamento DB ↔ App ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToProfile(row: any): OperatorProfile {
  return {
    id:            row.id,
    code:          row.code,
    name:          row.name,
    level:         row.level as AccessLevel,
    entityType:    row.entity_type as EntityType,
    entityId:      row.entity_id,
    entityName:    row.entity_name,
    moduleAccess:  row.module_access ?? undefined,
    password:      row.password ?? undefined,
    email:         row.email ?? undefined,
    emailVerified: row.email_verified ?? false,
    pendingOtp:    row.pending_otp ?? undefined,
    employeeId:    row.employee_id ?? undefined,
    active:        row.active,
    createdAt:     row.created_at,
  };
}

function profileToRow(p: OperatorProfile) {
  return {
    id:             p.id,
    code:           p.code,
    name:           p.name,
    level:          p.level,
    entity_type:    p.entityType,
    entity_id:      p.entityId,
    entity_name:    p.entityName,
    module_access:  p.moduleAccess ?? null,
    password:       p.password ?? null,
    email:          p.email ?? null,
    email_verified: p.emailVerified ?? false,
    pending_otp:    p.pendingOtp ?? null,
    employee_id:    p.employeeId ?? null,
    active:         p.active,
  };
}

// ── Context type ──────────────────────────────────────────────────────────────

interface ProfileContextType {
  profiles: OperatorProfile[];          // todos (usado no login lookup)
  scopedProfiles: OperatorProfile[];    // filtrado ao tenant ativo (usado em Settings > Perfis)
  activeProfile: OperatorProfile | null;
  loading: boolean;
  setActiveProfile: (p: OperatorProfile | null, scopeIds?: string[]) => void;
  addProfile: (data: Omit<OperatorProfile, 'id' | 'code' | 'createdAt'>) => Promise<OperatorProfile>;
  updateProfile: (id: string, changes: Partial<OperatorProfile>) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  linkProfileToEmployee: (profileId: string, employeeId: string) => Promise<void>;
  unlinkProfileFromEmployee: (profileId: string) => Promise<void>;
  nextCode: () => string;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────────────

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<OperatorProfile[]>([MASTER_PROFILE]);
  const [loading, setLoading] = useState(true);
  const [activeProfile, setActiveProfileState] = useState<OperatorProfile | null>(null);
  // IDs de entidade (company IDs) acessíveis pelo perfil ativo — define o escopo do tenant
  const [tenantEntityIds, setTenantEntityIds] = useState<string[] | null>(null);

  // Perfis filtrados ao tenant ativo — apenas profiles cujo entityId está no escopo
  const scopedProfiles = tenantEntityIds
    ? profiles.filter(p => tenantEntityIds.includes(p.entityId))
    : profiles;

  // Carrega perfis do Supabase na montagem
  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from('zia_operator_profiles')
        .select('*')
        .order('created_at');

      if (error) {
        console.warn('[ProfileContext] Erro ao carregar:', error.message);
        setLoading(false);
        return;
      }

      if (!data || data.length === 0) {
        // Primeira vez: semeia com o perfil mestre
        const { error: seedError } = await supabase
          .from('zia_operator_profiles')
          .insert(profileToRow(MASTER_PROFILE));
        if (seedError) console.warn('[ProfileContext] Erro ao semear:', seedError.message);
        setProfiles([MASTER_PROFILE]);
      } else {
        const loaded = data.map(rowToProfile);
        // Garante que o perfil mestre sempre existe
        const hasMaster = loaded.some(p => p.id === MASTER_PROFILE.id);
        setProfiles(hasMaster ? loaded : [MASTER_PROFILE, ...loaded]);
      }
      setLoading(false);
    }
    load();
  }, []);

  // Sessão NÃO é restaurada entre reloads — o login é sempre exigido ao abrir a plataforma.
  // Limpa qualquer sessão residual do localStorage quando os perfis carregam.
  useEffect(() => {
    if (loading) return;
    localStorage.removeItem(ACTIVE_KEY);
    localStorage.removeItem(ACTIVE_ENTITY_KEY);
    localStorage.removeItem(SCOPE_IDS_KEY);
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  function setActiveProfile(p: OperatorProfile | null, scopeIds?: string[]) {
    setActiveProfileState(p);
    if (p) {
      localStorage.setItem(ACTIVE_KEY, p.id);
      localStorage.setItem(ACTIVE_ENTITY_KEY, p.entityId);
      // Persiste os IDs do escopo para que erp.ts use .in() nas queries
      const ids = scopeIds && scopeIds.length > 0 ? scopeIds : [p.entityId];
      localStorage.setItem(SCOPE_IDS_KEY, JSON.stringify(ids));
      setTenantEntityIds(ids);
    } else {
      localStorage.removeItem(ACTIVE_KEY);
      localStorage.removeItem(ACTIVE_ENTITY_KEY);
      localStorage.removeItem(SCOPE_IDS_KEY);
      setTenantEntityIds(null);
    }
  }

  function nextCode(): string {
    const max = profiles.reduce((acc, p) => Math.max(acc, parseInt(p.code, 10)), 0);
    return String(max + 1).padStart(5, '0');
  }

  async function addProfile(data: Omit<OperatorProfile, 'id' | 'code' | 'createdAt'>): Promise<OperatorProfile> {
    const profile: OperatorProfile = {
      ...data,
      id: `profile-${Date.now()}`,
      code: nextCode(),
      createdAt: new Date().toISOString(),
    };
    setProfiles(prev => [...prev, profile]);
    const { error } = await supabase.from('zia_operator_profiles').insert(profileToRow(profile));
    if (error) {
      setProfiles(prev => prev.filter(p => p.id !== profile.id));
      throw error;
    }
    return profile;
  }

  async function updateProfile(id: string, changes: Partial<OperatorProfile>): Promise<void> {
    const original = profiles.find(p => p.id === id);
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p));
    setActiveProfileState(prev => prev?.id === id ? { ...prev, ...changes } : prev);
    const updated = { ...original, ...changes } as OperatorProfile;
    const { error } = await supabase
      .from('zia_operator_profiles')
      .update(profileToRow(updated))
      .eq('id', id);
    if (error && original) {
      setProfiles(prev => prev.map(p => p.id === id ? original : p));
      throw error;
    }
  }

  async function deleteProfile(id: string): Promise<void> {
    if (id === MASTER_PROFILE.id) return;
    const toDelete = profiles.find(p => p.id === id);
    setProfiles(prev => prev.filter(p => p.id !== id));
    if (activeProfile?.id === id) setActiveProfile(null);
    const { error } = await supabase.from('zia_operator_profiles').delete().eq('id', id);
    if (error && toDelete) {
      setProfiles(prev => [...prev, toDelete]);
      throw error;
    }
  }

  async function linkProfileToEmployee(profileId: string, employeeId: string): Promise<void> {
    const { error } = await supabase
      .from('zia_operator_profiles')
      .update({ employee_id: employeeId })
      .eq('id', profileId);
    if (error) throw error;
    setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, employeeId } : p));
  }

  async function unlinkProfileFromEmployee(profileId: string): Promise<void> {
    const { error } = await supabase
      .from('zia_operator_profiles')
      .update({ employee_id: null })
      .eq('id', profileId);
    if (error) throw error;
    setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, employeeId: undefined } : p));
  }

  return (
    <ProfileContext.Provider value={{
      profiles,
      scopedProfiles,
      activeProfile,
      loading,
      setActiveProfile,
      addProfile,
      updateProfile,
      deleteProfile,
      linkProfileToEmployee,
      unlinkProfileFromEmployee,
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
 */
export interface ScopeInfo {
  level: AccessLevel | null;
  entityId: string | null;
  entityType: EntityType | null;
  entityName: string | null;
  isHolding: boolean;
  isMatrix: boolean;
  isBranch: boolean;
  scopedEntityIds: string[];
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

  const isHolding = activeProfile.level === 1;
  const isMatrix  = activeProfile.level === 2;
  const isBranch  = activeProfile.level === 3 || activeProfile.level === 4;
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
