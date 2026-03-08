// ─────────────────────────────────────────────────────────────────────────────
// Entidades Centrais — compartilhadas entre todos os módulos
// (ERP, CRM, RH, SCM, Qualidade, etc.)
//
// Tabelas Supabase usadas por todos os módulos:
//   clients          → erp_clientes
//   suppliers        → erp_fornecedores
//   product_groups   → erp_grupo_produtos
//   products         → erp_produtos
//   activities       → erp_atividades
//
// Funcionários: tabela `employees` gerenciada pelo módulo RH
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from './supabase';

// ── Helper ────────────────────────────────────────────────────────────────────

async function getTenantId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? '00000000-0000-0000-0000-000000000001';
}

// ── Cliente ───────────────────────────────────────────────────────────────────

export interface Cliente {
  id: string;
  tipo: 'PF' | 'PJ';
  nome: string;
  cpf_cnpj: string;
  inscricao_estadual: string | null;
  email: string | null;
  telefone: string | null;
  endereco_json: Record<string, unknown>;
  limite_credito: number | null;
  tabela_preco_id: string | null;
  vendedor_id: string | null;
  ativo: boolean;
  tenant_id: string;
  created_at: string;
}

export async function getClientes(search = ''): Promise<Cliente[]> {
  let q = supabase.from('erp_clientes').select('*').order('nome');
  if (search) q = q.ilike('nome', `%${search}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function createCliente(payload: Omit<Cliente, 'id' | 'tenant_id' | 'created_at'>): Promise<Cliente> {
  const tenant_id = await getTenantId();
  const { data, error } = await supabase.from('erp_clientes').insert({ ...payload, tenant_id }).select().single();
  if (error) throw error;
  return data;
}

export async function updateCliente(id: string, payload: Partial<Cliente>): Promise<Cliente> {
  const { data, error } = await supabase.from('erp_clientes').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteCliente(id: string): Promise<void> {
  const { error } = await supabase.from('erp_clientes').delete().eq('id', id);
  if (error) throw error;
}

// ── Fornecedor ────────────────────────────────────────────────────────────────

export interface Fornecedor {
  id: string;
  nome: string;
  cnpj_cpf: string;
  contato_nome: string | null;
  email: string | null;
  telefone: string | null;
  endereco_json: Record<string, unknown>;
  prazo_entrega_dias: number | null;
  ativo: boolean;
  tenant_id: string;
  created_at: string;
}

export async function getFornecedores(search = ''): Promise<Fornecedor[]> {
  let q = supabase.from('erp_fornecedores').select('*').order('nome');
  if (search) q = q.ilike('nome', `%${search}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function createFornecedor(payload: Omit<Fornecedor, 'id' | 'tenant_id' | 'created_at'>): Promise<Fornecedor> {
  const tenant_id = await getTenantId();
  const { data, error } = await supabase.from('erp_fornecedores').insert({ ...payload, tenant_id }).select().single();
  if (error) throw error;
  return data;
}

export async function updateFornecedor(id: string, payload: Partial<Fornecedor>): Promise<Fornecedor> {
  const { data, error } = await supabase.from('erp_fornecedores').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteFornecedor(id: string): Promise<void> {
  const { error } = await supabase.from('erp_fornecedores').delete().eq('id', id);
  if (error) throw error;
}

// ── Grupo de Produtos ─────────────────────────────────────────────────────────

export interface GrupoProduto {
  id: string;
  nome: string;
  codigo: string;
  descricao: string | null;
  tenant_id: string;
  created_at: string;
}

export async function getGruposProdutos(): Promise<GrupoProduto[]> {
  const { data, error } = await supabase.from('erp_grupo_produtos').select('*').order('nome');
  if (error) throw error;
  return data ?? [];
}

export async function createGrupoProduto(payload: Omit<GrupoProduto, 'id' | 'tenant_id' | 'created_at'>): Promise<GrupoProduto> {
  const tenant_id = await getTenantId();
  const { data, error } = await supabase.from('erp_grupo_produtos').insert({ ...payload, tenant_id }).select().single();
  if (error) throw error;
  return data;
}

export async function updateGrupoProduto(id: string, payload: Partial<GrupoProduto>): Promise<GrupoProduto> {
  const { data, error } = await supabase.from('erp_grupo_produtos').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteGrupoProduto(id: string): Promise<void> {
  const { error } = await supabase.from('erp_grupo_produtos').delete().eq('id', id);
  if (error) throw error;
}

// ── Produto ───────────────────────────────────────────────────────────────────

export interface Produto {
  id: string;
  codigo_interno: string;
  codigo_barras: string | null;
  ncm: string;
  cst_icms: string | null;
  cst_pis: string | null;
  cst_cofins: string | null;
  nome: string;
  unidade_medida: string;
  grupo_id: string | null;
  preco_custo: number | null;
  preco_venda: number;
  estoque_atual: number;
  estoque_minimo: number | null;
  peso_bruto_kg: number | null;
  ativo: boolean;
  tenant_id: string;
  created_at: string;
  erp_grupo_produtos?: { nome: string } | null;
}

export async function getProdutos(search = ''): Promise<Produto[]> {
  let q = supabase.from('erp_produtos').select('*, erp_grupo_produtos(nome)').order('nome');
  if (search) q = q.ilike('nome', `%${search}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function createProduto(payload: Omit<Produto, 'id' | 'tenant_id' | 'created_at' | 'estoque_atual' | 'erp_grupo_produtos'>): Promise<Produto> {
  const tenant_id = await getTenantId();
  const { data, error } = await supabase.from('erp_produtos').insert({ ...payload, tenant_id, estoque_atual: 0 }).select().single();
  if (error) throw error;
  return data;
}

export async function updateProduto(id: string, payload: Partial<Produto>): Promise<Produto> {
  const { data, error } = await supabase.from('erp_produtos').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteProduto(id: string): Promise<void> {
  const { error } = await supabase.from('erp_produtos').delete().eq('id', id);
  if (error) throw error;
}

// ── Atividade (transversal a todos os módulos) ────────────────────────────────

export interface Atividade {
  id: string;
  titulo: string;
  descricao: string | null;
  modulo_destino: string;
  submodulo_destino: string | null;
  prioridade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'CANCELADA';
  responsavel_id: string | null;
  criado_por: string;
  data_prazo: string | null;
  data_conclusao: string | null;
  referencia_id: string | null;
  tenant_id: string;
  created_at: string;
}

export async function getAtividades(modulo?: string): Promise<Atividade[]> {
  let q = supabase.from('erp_atividades').select('*').order('created_at', { ascending: false });
  if (modulo) q = q.eq('modulo_destino', modulo);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function createAtividade(payload: Omit<Atividade, 'id' | 'tenant_id' | 'created_at'>): Promise<Atividade> {
  const tenant_id = await getTenantId();
  const { data, error } = await supabase.from('erp_atividades').insert({ ...payload, tenant_id }).select().single();
  if (error) throw error;
  return data;
}

export async function updateAtividadeStatus(id: string, status: Atividade['status']): Promise<void> {
  const update: Record<string, unknown> = { status };
  if (status === 'CONCLUIDA') update.data_conclusao = new Date().toISOString();
  const { error } = await supabase.from('erp_atividades').update(update).eq('id', id);
  if (error) throw error;
}

// ── Utilitários externos ──────────────────────────────────────────────────────

export async function consultarCNPJ(cnpj: string): Promise<Record<string, unknown> | null> {
  const cleaned = cnpj.replace(/\D/g, '');
  try {
    const res = await fetch(`https://receitaws.com.br/v1/cnpj/${cleaned}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function consultarCEP(cep: string): Promise<Record<string, unknown> | null> {
  const cleaned = cep.replace(/\D/g, '');
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.erro) return null;
    return data;
  } catch {
    return null;
  }
}
