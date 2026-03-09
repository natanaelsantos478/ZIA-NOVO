// ─────────────────────────────────────────────────────────────────────────────
// AuthContext — Sessão do usuário ZIA
//
// Persiste no localStorage: zia_session = { usuario, empresaAtiva }
//
// Hierarquia de acesso:
//   Nível 1 — Gestor Holding  → escolhe holding → matriz → filial
//   Nível 2 — Gestor Matriz   → escolhe entre matrizes/filiais da sua entidade
//   Nível 3 — Gestor Filial   → vai direto para a filial
//   Nível 4 — Funcionário     → vai direto para o módulo
// ─────────────────────────────────────────────────────────────────────────────
import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import { supabase } from '../lib/supabase';

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface ZiaUsuario {
  id: string;
  codigo: string;
  nome: string;
  nivel: 1 | 2 | 3 | 4;
  entidade_tipo: 'holding' | 'matriz' | 'filial';
  entidade_id: string;
  entidade_nome: string;
  modulo_acesso: string | null;
  ativo: boolean;
}

export interface EmpresaAtiva {
  tipo: 'holding' | 'matriz' | 'filial';
  id: string;
  nome: string;
  cnpj?: string;
  holding_id?: string;
  matriz_id?: string;
}

export interface HoldingItem { id: string; nome: string; cnpj: string }
export interface MatrizItem  { id: string; nome: string; cnpj: string; holding_id: string }
export interface FilialItem  { id: string; nome_fantasia: string; cnpj: string; matriz_id: string }

interface AuthSession {
  usuario: ZiaUsuario;
  empresaAtiva: EmpresaAtiva;
}

interface AuthContextType {
  session: AuthSession | null;
  loading: boolean;
  /** Valida credenciais. Retorna o usuario ou error string. */
  autenticar: (codigo: string, senha: string) => Promise<{ error?: string; usuario?: ZiaUsuario }>;
  /** Carrega entidades disponíveis para o usuário. */
  loadEntidades: (usuario: ZiaUsuario) => Promise<void>;
  /** Cria sessão completa (usuario + empresa) e persiste. */
  iniciarSessao: (usuario: ZiaUsuario, empresa: EmpresaAtiva) => void;
  /** Troca empresa sem fazer logout. */
  setEmpresaAtiva: (empresa: EmpresaAtiva) => void;
  logout: () => void;
  holdingsDisponiveis: HoldingItem[];
  matrizesDisponiveis: MatrizItem[];
  filiaisDisponiveis: FilialItem[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'zia_session';

function hashSenha(senha: string) {
  // base64 simples (igual ao usado na seed do banco)
  return btoa(unescape(encodeURIComponent(senha)));
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession]   = useState<AuthSession | null>(null);
  const [loading, setLoading]   = useState(true);
  const [holdingsDisponiveis, setHoldingsDisponiveis] = useState<HoldingItem[]>([]);
  const [matrizesDisponiveis, setMatrizesDisponiveis] = useState<MatrizItem[]>([]);
  const [filiaisDisponiveis, setFiliaisDisponiveis]   = useState<FilialItem[]>([]);

  // Restaura sessão
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setSession(JSON.parse(raw) as AuthSession);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Autenticar ─────────────────────────────────────────────────────────────
  async function autenticar(codigo: string, senha: string) {
    const { data, error } = await supabase
      .from('zia_usuarios')
      .select('*')
      .eq('codigo', codigo.padStart(5, '0'))
      .eq('senha_hash', hashSenha(senha))
      .eq('ativo', true)
      .maybeSingle();

    if (error || !data) {
      return { error: 'Código ou senha inválidos.' };
    }
    return { usuario: data as ZiaUsuario };
  }

  // ── Carregar entidades ────────────────────────────────────────────────────
  async function loadEntidades(usuario: ZiaUsuario) {
    if (usuario.nivel === 1) {
      const [{ data: h }, { data: m }, { data: f }] = await Promise.all([
        supabase.from('zia_holdings').select('id, nome, cnpj').eq('ativo', true).order('nome'),
        supabase.from('zia_matrizes').select('id, nome, cnpj, holding_id').eq('ativo', true).order('nome'),
        supabase.from('erp_empresas').select('id, nome_fantasia, cnpj, matriz_id').eq('ativo', true).order('nome_fantasia'),
      ]);
      setHoldingsDisponiveis((h ?? []) as HoldingItem[]);
      setMatrizesDisponiveis((m ?? []) as MatrizItem[]);
      setFiliaisDisponiveis((f ?? []) as FilialItem[]);

    } else if (usuario.nivel === 2) {
      const [{ data: m }, { data: f }] = await Promise.all([
        supabase.from('zia_matrizes').select('id, nome, cnpj, holding_id').eq('id', usuario.entidade_id).eq('ativo', true),
        supabase.from('erp_empresas').select('id, nome_fantasia, cnpj, matriz_id').eq('matriz_id', usuario.entidade_id).eq('ativo', true).order('nome_fantasia'),
      ]);
      setMatrizesDisponiveis((m ?? []) as MatrizItem[]);
      setFiliaisDisponiveis((f ?? []) as FilialItem[]);

    } else if (usuario.nivel === 3) {
      const { data: f } = await supabase
        .from('erp_empresas')
        .select('id, nome_fantasia, cnpj, matriz_id')
        .eq('id', usuario.entidade_id)
        .eq('ativo', true);
      setFiliaisDisponiveis((f ?? []) as FilialItem[]);
    }
  }

  // ── Iniciar sessão completa ───────────────────────────────────────────────
  function iniciarSessao(usuario: ZiaUsuario, empresa: EmpresaAtiva) {
    const s: AuthSession = { usuario, empresaAtiva: empresa };
    setSession(s);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }

  // ── Trocar empresa ────────────────────────────────────────────────────────
  function setEmpresaAtiva(empresa: EmpresaAtiva) {
    if (!session) return;
    const s: AuthSession = { ...session, empresaAtiva: empresa };
    setSession(s);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }

  // ── Logout ────────────────────────────────────────────────────────────────
  function logout() {
    setSession(null);
    setHoldingsDisponiveis([]);
    setMatrizesDisponiveis([]);
    setFiliaisDisponiveis([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <AuthContext.Provider value={{
      session,
      loading,
      autenticar,
      loadEntidades,
      iniciarSessao,
      setEmpresaAtiva,
      logout,
      holdingsDisponiveis,
      matrizesDisponiveis,
      filiaisDisponiveis,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
