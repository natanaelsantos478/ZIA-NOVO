import { getFilialDb } from './supabase';
import { getFilialId } from './tenant';

export interface ScmFrete {
  id: string;
  tenant_id: string;
  created_at: string;
  numero: number;
  status: 'rascunho' | 'ativo' | 'concluido' | 'cancelado';
  descricao: string | null;
  tipo: 'proprio' | 'terceiro';
  placa: string | null;
  motorista: string | null;
  fornecedor_id: string | null;
  origem: string | null;
  destino: string | null;
  distancia_km: number | null;
  itens_json: ScmFreteItem[];
  custo_combustivel: number;
  custo_pedagio: number;
  custo_motorista: number;
  custo_manutencao: number;
  custo_outros: number;
  custo_total: number;
  valor_cobrado: number | null;
  pedido_id: string | null;
  peso_total_kg: number | null;
  volumes: number | null;
  observacoes: string | null;
}

export interface ScmFreteItem {
  produto_id: string;
  nome: string;
  quantidade: number;
  peso_kg: number;
}

function db() { return getFilialDb(); }
function tid() { return getFilialId(); }

export async function getFretes(status?: string): Promise<ScmFrete[]> {
  let q = db().from('scm_fretes').select('*').order('numero', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(r => ({ ...r, itens_json: r.itens_json ?? [] }));
}

export async function createFrete(payload: Omit<ScmFrete, 'id' | 'tenant_id' | 'created_at' | 'numero' | 'custo_total'>): Promise<ScmFrete> {
  const { data, error } = await db().from('scm_fretes').insert({ ...payload, tenant_id: tid() }).select().single();
  if (error) throw error;
  return { ...data, itens_json: data.itens_json ?? [] };
}

export async function updateFrete(id: string, payload: Partial<Omit<ScmFrete, 'id' | 'tenant_id' | 'created_at' | 'numero' | 'custo_total'>>): Promise<ScmFrete> {
  const { data, error } = await db().from('scm_fretes').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return { ...data, itens_json: data.itens_json ?? [] };
}

export async function deleteFrete(id: string): Promise<void> {
  const { error } = await db().from('scm_fretes').delete().eq('id', id);
  if (error) throw error;
}
