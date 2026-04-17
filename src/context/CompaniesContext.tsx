/* eslint-disable react-refresh/only-export-components */
// ─────────────────────────────────────────────────────────────────────────────
// CompaniesContext — Registro único de Holding / Matrizes / Filiais
// Persistido no Supabase (tabela zia_companies)
// ─────────────────────────────────────────────────────────────────────────────
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export type CompanyType   = 'holding' | 'matrix' | 'branch';
export type CompanyStatus = 'ativa' | 'inativa';

export interface Company {
  id: string;
  type: CompanyType;
  parentId?: string;      // matriz → holding; filial → matriz
  code: string;           // H001, M001, F001…
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  inscricaoEstadual?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  status: CompanyStatus;
  createdAt: string;
  logoUrl?: string;
  logoStoragePath?: string;
}

// ── Mapeamento DB ↔ App ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToCompany(row: any): Company {
  return {
    id:                row.id,
    type:              row.type as CompanyType,
    parentId:          row.parent_id ?? undefined,
    code:              row.code,
    razaoSocial:       row.razao_social,
    nomeFantasia:      row.nome_fantasia,
    cnpj:              row.cnpj ?? '',
    inscricaoEstadual: row.inscricao_estadual ?? undefined,
    email:             row.email ?? undefined,
    telefone:          row.telefone ?? undefined,
    endereco:          row.endereco ?? undefined,
    cidade:            row.cidade ?? undefined,
    estado:            row.estado ?? undefined,
    cep:               row.cep ?? undefined,
    status:            (row.status ?? 'ativa') as CompanyStatus,
    createdAt:         row.created_at,
    logoUrl:           row.logo_url ?? undefined,
    logoStoragePath:   row.logo_storage_path ?? undefined,
  };
}

function companyToRow(c: Company) {
  return {
    id:                c.id,
    type:              c.type,
    parent_id:         c.parentId ?? null,
    code:              c.code,
    razao_social:      c.razaoSocial,
    nome_fantasia:     c.nomeFantasia,
    cnpj:              c.cnpj ?? '',
    inscricao_estadual: c.inscricaoEstadual ?? null,
    email:             c.email ?? null,
    telefone:          c.telefone ?? null,
    endereco:          c.endereco ?? null,
    cidade:            c.cidade ?? null,
    estado:            c.estado ?? null,
    cep:               c.cep ?? null,
    status:            c.status,
    logo_url:          c.logoUrl ?? null,
    logo_storage_path: c.logoStoragePath ?? null,
  };
}

// ── Context type ──────────────────────────────────────────────────────────────

interface CompaniesContextType {
  companies: Company[];   // todos os registros (usado pelo admin)
  holdings: Company[];    // filtrado pelo holdingScope ativo
  matrices: Company[];    // filtrado pelo holdingScope ativo
  branches: Company[];    // filtrado pelo holdingScope ativo
  loading: boolean;
  holdingScope: string | null;
  setHoldingScope: (id: string | null) => void;
  branchesOf: (matrixId: string) => Company[];
  matrixOf: (branchId: string) => Company | undefined;
  holdingOf: (matrixId: string) => Company | undefined;
  scopeIds: (type: CompanyType, entityId: string) => string[];
  addCompany: (data: Omit<Company, 'id' | 'code' | 'createdAt'>) => Promise<Company>;
  updateCompany: (id: string, changes: Partial<Company>) => Promise<void>;
  removeCompany: (id: string) => Promise<void>;
}

const CompaniesContext = createContext<CompaniesContextType | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────────────────

export function CompaniesProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [holdingScope, setHoldingScope] = useState<string | null>(null);

  // Carrega do Supabase na montagem
  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from('zia_companies')
        .select('*')
        .order('created_at');

      if (error) {
        console.warn('[CompaniesContext] Erro ao carregar:', error.message);
        setLoading(false);
        return;
      }

      setCompanies(data?.map(rowToCompany) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  // Arrays completos — usados internamente e pelo painel admin (holdingScope = null)
  const allHoldings = companies.filter(c => c.type === 'holding' && c.status === 'ativa');
  const allMatrices = companies.filter(c => c.type === 'matrix'  && c.status === 'ativa');
  const allBranches = companies.filter(c => c.type === 'branch'  && c.status === 'ativa');

  // Arrays filtrados pelo tenant ativo — expostos para os módulos da aplicação
  const scopedMatrixIds = holdingScope
    ? new Set(allMatrices.filter(m => m.parentId === holdingScope).map(m => m.id))
    : null;

  const holdings = holdingScope ? allHoldings.filter(h => h.id === holdingScope) : allHoldings;
  const matrices = holdingScope ? allMatrices.filter(m => m.parentId === holdingScope) : allMatrices;
  const branches = holdingScope
    ? allBranches.filter(b => scopedMatrixIds!.has(b.parentId ?? ''))
    : allBranches;

  function branchesOf(matrixId: string) {
    return branches.filter(b => b.parentId === matrixId);
  }

  function matrixOf(branchId: string) {
    const branch = companies.find(c => c.id === branchId);
    if (!branch?.parentId) return undefined;
    return companies.find(c => c.id === branch.parentId);
  }

  function holdingOf(matrixId: string) {
    const matrix = companies.find(c => c.id === matrixId);
    if (!matrix?.parentId) return undefined;
    return companies.find(c => c.id === matrix.parentId);
  }

  // scopeIds: retorna apenas IDs dentro da árvore do tenant informado
  function scopeIds(type: CompanyType, entityId: string): string[] {
    if (type === 'holding') {
      const ownMatrices = allMatrices.filter(m => m.parentId === entityId);
      const ownMatrixIds = new Set(ownMatrices.map(m => m.id));
      const ownBranches = allBranches.filter(b => ownMatrixIds.has(b.parentId ?? ''));
      return [entityId, ...ownMatrices.map(m => m.id), ...ownBranches.map(b => b.id)];
    }
    if (type === 'matrix') {
      const childBranches = allBranches.filter(b => b.parentId === entityId).map(b => b.id);
      return [entityId, ...childBranches];
    }
    return [entityId];
  }

  function nextCode(type: CompanyType): string {
    const prefix = type === 'holding' ? 'H' : type === 'matrix' ? 'M' : 'F';
    const max = companies
      .filter(c => c.type === type)
      .reduce((acc, c) => Math.max(acc, parseInt(c.code.slice(1), 10) || 0), 0);
    return `${prefix}${String(max + 1).padStart(3, '0')}`;
  }

  async function addCompany(data: Omit<Company, 'id' | 'code' | 'createdAt'>): Promise<Company> {
    const newCompany: Company = {
      ...data,
      id: `${data.type}-${Date.now()}`,
      code: nextCode(data.type),
      createdAt: new Date().toISOString(),
    };
    // Optimistic update
    setCompanies(prev => [...prev, newCompany]);
    const { error } = await supabase.from('zia_companies').insert(companyToRow(newCompany));
    if (error) {
      // Reverte em caso de erro
      setCompanies(prev => prev.filter(c => c.id !== newCompany.id));
      throw error;
    }
    return newCompany;
  }

  async function updateCompany(id: string, changes: Partial<Company>): Promise<void> {
    setCompanies(prev => prev.map(c => c.id === id ? { ...c, ...changes } : c));
    const updated = companies.find(c => c.id === id);
    if (!updated) return;
    const row = companyToRow({ ...updated, ...changes });
    const { error } = await supabase.from('zia_companies').update(row).eq('id', id);
    if (error) {
      // Reverte
      setCompanies(prev => prev.map(c => c.id === id ? updated : c));
      throw error;
    }
  }

  async function removeCompany(id: string): Promise<void> {
    const hasChildren = companies.some(c => c.parentId === id);
    if (hasChildren) return;
    const toRemove = companies.find(c => c.id === id);
    if (!toRemove) return;
    setCompanies(prev => prev.filter(c => c.id !== id));
    const { error } = await supabase.from('zia_companies').delete().eq('id', id);
    if (error) {
      // Reverte
      setCompanies(prev => [...prev, toRemove]);
      throw error;
    }
  }

  return (
    <CompaniesContext.Provider value={{
      companies,
      holdings,
      matrices,
      branches,
      loading,
      holdingScope,
      setHoldingScope,
      branchesOf,
      matrixOf,
      holdingOf,
      scopeIds,
      addCompany,
      updateCompany,
      removeCompany,
    }}>
      {children}
    </CompaniesContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useCompanies() {
  const ctx = useContext(CompaniesContext);
  if (!ctx) throw new Error('useCompanies must be used within CompaniesProvider');
  return ctx;
}
