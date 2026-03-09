// ─────────────────────────────────────────────────────────────────────────────
// CompaniesContext — Registro único de Holding / Matrizes / Filiais
// Compartilhado entre: Empresas.tsx (Settings) e Perfis.tsx (Settings)
// Persistido em localStorage para sobreviver a reloads
// ─────────────────────────────────────────────────────────────────────────────
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

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
}

// ── Dados iniciais ────────────────────────────────────────────────────────────

const INITIAL_COMPANIES: Company[] = [
  {
    id: 'holding-001',
    type: 'holding',
    code: 'H001',
    razaoSocial: 'ZIA Omnisystem Holding LTDA',
    nomeFantasia: 'ZIA Omnisystem Holding',
    cnpj: '00.000.000/0001-00',
    email: 'holding@zia.com.br',
    cidade: 'São Paulo',
    estado: 'SP',
    status: 'ativa',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'matrix-001',
    type: 'matrix',
    parentId: 'holding-001',
    code: 'M001',
    razaoSocial: 'ZIA Operações Sudeste LTDA',
    nomeFantasia: 'Matriz Principal',
    cnpj: '00.000.000/0002-00',
    email: 'matriz@zia.com.br',
    cidade: 'São Paulo',
    estado: 'SP',
    status: 'ativa',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'matrix-002',
    type: 'matrix',
    parentId: 'holding-001',
    code: 'M002',
    razaoSocial: 'ZIA Operações Norte LTDA',
    nomeFantasia: 'Matriz Norte',
    cnpj: '00.000.000/0005-00',
    email: 'norte@zia.com.br',
    cidade: 'Manaus',
    estado: 'AM',
    status: 'ativa',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'branch-001',
    type: 'branch',
    parentId: 'matrix-001',
    code: 'F001',
    razaoSocial: 'ZIA Operações SP LTDA',
    nomeFantasia: 'Filial São Paulo',
    cnpj: '00.000.000/0003-00',
    cidade: 'São Paulo',
    estado: 'SP',
    status: 'ativa',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'branch-002',
    type: 'branch',
    parentId: 'matrix-001',
    code: 'F002',
    razaoSocial: 'ZIA Operações RJ LTDA',
    nomeFantasia: 'Filial Rio de Janeiro',
    cnpj: '00.000.000/0004-00',
    cidade: 'Rio de Janeiro',
    estado: 'RJ',
    status: 'ativa',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'branch-003',
    type: 'branch',
    parentId: 'matrix-002',
    code: 'F003',
    razaoSocial: 'ZIA Operações AM LTDA',
    nomeFantasia: 'Filial Manaus',
    cnpj: '00.000.000/0006-00',
    cidade: 'Manaus',
    estado: 'AM',
    status: 'ativa',
    createdAt: '2024-01-01T00:00:00Z',
  },
];

// ── Context type ──────────────────────────────────────────────────────────────

interface CompaniesContextType {
  companies: Company[];
  holdings: Company[];
  matrices: Company[];
  branches: Company[];
  /** Retorna as filiais filhas de uma matriz */
  branchesOf: (matrixId: string) => Company[];
  /** Retorna a matriz pai de uma filial */
  matrixOf: (branchId: string) => Company | undefined;
  /** Retorna a holding pai de uma matriz */
  holdingOf: (matrixId: string) => Company | undefined;
  /** IDs de todas as entidades que um perfil pode "ver" dado seu entityId e tipo */
  scopeIds: (type: CompanyType, entityId: string) => string[];
  addCompany: (data: Omit<Company, 'id' | 'code' | 'createdAt'>) => Company;
  updateCompany: (id: string, changes: Partial<Company>) => void;
  removeCompany: (id: string) => void;
}

const CompaniesContext = createContext<CompaniesContextType | undefined>(undefined);

const STORAGE_KEY = 'zia_companies_v1';

// ── Provider ──────────────────────────────────────────────────────────────────

export function CompaniesProvider({ children }: { children: ReactNode }) {
  const [companies, setCompanies] = useState<Company[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: Company[] = JSON.parse(stored);
        // Garante que os IDs padrão sempre existam
        const ids = new Set(parsed.map(c => c.id));
        const missing = INITIAL_COMPANIES.filter(c => !ids.has(c.id));
        return missing.length > 0 ? [...parsed, ...missing] : parsed;
      }
    } catch { /* ignore */ }
    return INITIAL_COMPANIES;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(companies));
  }, [companies]);

  const holdings = companies.filter(c => c.type === 'holding' && c.status === 'ativa');
  const matrices  = companies.filter(c => c.type === 'matrix'  && c.status === 'ativa');
  const branches  = companies.filter(c => c.type === 'branch'  && c.status === 'ativa');

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

  /**
   * Retorna todos os IDs que um perfil pode "ver" com base no seu nível:
   * - Holding: todos os IDs (holding + matrizes + filiais filhas)
   * - Matriz: ID da matriz + IDs das filiais filhas
   * - Filial: apenas o ID da própria filial
   */
  function scopeIds(type: CompanyType, entityId: string): string[] {
    if (type === 'holding') {
      // Holding vê tudo
      return companies.map(c => c.id);
    }
    if (type === 'matrix') {
      const childBranches = branches.filter(b => b.parentId === entityId).map(b => b.id);
      return [entityId, ...childBranches];
    }
    // Branch
    return [entityId];
  }

  function nextCode(type: CompanyType): string {
    const prefix = type === 'holding' ? 'H' : type === 'matrix' ? 'M' : 'F';
    const max = companies
      .filter(c => c.type === type)
      .reduce((acc, c) => Math.max(acc, parseInt(c.code.slice(1), 10) || 0), 0);
    return `${prefix}${String(max + 1).padStart(3, '0')}`;
  }

  function addCompany(data: Omit<Company, 'id' | 'code' | 'createdAt'>): Company {
    const newCompany: Company = {
      ...data,
      id: `${data.type}-${Date.now()}`,
      code: nextCode(data.type),
      createdAt: new Date().toISOString(),
    };
    setCompanies(prev => [...prev, newCompany]);
    return newCompany;
  }

  function updateCompany(id: string, changes: Partial<Company>) {
    setCompanies(prev => prev.map(c => c.id === id ? { ...c, ...changes } : c));
  }

  function removeCompany(id: string) {
    // Não remove se tiver filhos
    const hasChildren = companies.some(c => c.parentId === id);
    if (hasChildren) return;
    // Não remove as companies padrão iniciais
    if (INITIAL_COMPANIES.some(c => c.id === id)) return;
    setCompanies(prev => prev.filter(c => c.id !== id));
  }

  return (
    <CompaniesContext.Provider value={{
      companies,
      holdings,
      matrices,
      branches,
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
