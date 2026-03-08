// ─────────────────────────────────────────────────────────────────────────────
// orgStructure — Hierarquia Holding → Matriz → Filial
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from './supabase';

export interface ZiaHolding {
  id: string;
  nome: string;
  cnpj: string | null;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
}

export interface ZiaMatriz {
  id: string;
  nome: string;
  cnpj: string | null;
  holding_id: string | null;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
  zia_holdings?: { nome: string } | null;
}

export interface ZiaFilial {
  id: string;
  nome_fantasia: string;
  razao_social: string;
  cnpj: string;
  inscricao_estadual: string | null;
  matriz_id: string | null;
  ativo: boolean;
  created_at: string;
  zia_matrizes?: { nome: string; holding_id: string | null } | null;
}

// Contexto selecionado — persiste em localStorage
export interface OrgContexto {
  holding: Pick<ZiaHolding, 'id' | 'nome'> | null;
  matriz:  Pick<ZiaMatriz,  'id' | 'nome'> | null;
  filial:  Pick<ZiaFilial,  'id' | 'nome_fantasia' | 'cnpj'> | null;
}

export const ORG_STORAGE_KEY = 'zia_org_contexto';

export function loadOrgContexto(): OrgContexto {
  try {
    const raw = localStorage.getItem(ORG_STORAGE_KEY);
    return raw ? JSON.parse(raw) : { holding: null, matriz: null, filial: null };
  } catch {
    return { holding: null, matriz: null, filial: null };
  }
}

export function saveOrgContexto(ctx: OrgContexto) {
  localStorage.setItem(ORG_STORAGE_KEY, JSON.stringify(ctx));
}

export function clearOrgContexto() {
  localStorage.removeItem(ORG_STORAGE_KEY);
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getHoldings(): Promise<ZiaHolding[]> {
  const { data, error } = await supabase
    .from('zia_holdings')
    .select('*')
    .eq('ativo', true)
    .order('nome');
  if (error) throw error;
  return data ?? [];
}

export async function getMatrizes(holdingId?: string | null): Promise<ZiaMatriz[]> {
  let q = supabase
    .from('zia_matrizes')
    .select('*, zia_holdings(nome)')
    .eq('ativo', true)
    .order('nome');
  if (holdingId) q = q.eq('holding_id', holdingId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getFiliais(matrizId?: string | null, holdingId?: string | null): Promise<ZiaFilial[]> {
  let q = supabase
    .from('erp_empresas')
    .select('*, zia_matrizes(nome, holding_id)')
    .eq('ativo', true)
    .order('nome_fantasia');

  if (matrizId) {
    q = q.eq('matriz_id', matrizId);
  } else if (holdingId) {
    // Filiais cujas matrizes pertencem à holding
    const { data: mats } = await supabase
      .from('zia_matrizes')
      .select('id')
      .eq('holding_id', holdingId)
      .eq('ativo', true);
    const ids = (mats ?? []).map(m => m.id);
    if (ids.length === 0) return [];
    q = q.in('matriz_id', ids);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as ZiaFilial[];
}
