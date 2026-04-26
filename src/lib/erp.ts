// ─────────────────────────────────────────────────────────────────────────────
// ERP Service Layer — operações de dados do módulo ERP
// Lê/escreve direto no Supabase
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from './supabase';

// ── Cache em memória (TTL 60s) — evita re-fetch a cada troca de seção ─────────
const _cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 60_000; // 60 segundos

function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const hit = _cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return Promise.resolve(hit.data as T);
  return fetcher().then(data => { _cache.set(key, { data, ts: Date.now() }); return data; });
}

/** Invalida o cache de uma chave (chame após writes) */
export function invalidateCache(key: string) { _cache.delete(key); }
export function invalidateCacheAll() { _cache.clear(); }

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ErpEmpresa {
  id: string;
  nome_fantasia: string;
  razao_social: string;
  cnpj: string;
  inscricao_estadual: string | null;
  endereco_json: Record<string, unknown>;
  telefone: string | null;
  email: string | null;
  ativo: boolean;
  tenant_id: string;
  created_at: string;
}

export interface ErpCliente {
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

export interface ErpFornecedor {
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

export interface ErpGrupoProduto {
  id: string;
  nome: string;
  codigo: string;
  descricao: string | null;
  tenant_id: string;
  created_at: string;
}

export interface ErpProduto {
  id: string;
  codigo_interno: string;
  codigo_barras: string | null;
  ncm: string;
  cst_icms: string | null;
  cst_pis: string | null;
  cst_cofins: string | null;
  nome: string;
  descricao: string | null;
  unidade_medida: string;
  grupo_id: string | null;
  preco_custo: number | null;
  preco_venda: number;
  estoque_atual: number;
  estoque_minimo: number | null;
  peso_bruto_kg: number | null;
  produto_pai_id: string | null;
  variacao_nome: string | null;
  ativo: boolean;
  is_subscription: boolean;
  subscription_period: 'mensal' | 'trimestral' | 'semestral' | 'anual' | null;
  subscription_trial_days: number | null;
  subscription_min_months: number | null;
  subscription_setup_fee: number | null;
  subscription_features: string[] | null;
  subscription_grace_days: number | null;
  subscription_max_users: number | null;
  subscription_multi_plan: boolean | null;
  subscription_annual_discount_pct: number | null;
  tenant_id: string;
  created_at: string;
  erp_grupo_produtos?: { nome: string } | null;
}

// ── Subscription types ────────────────────────────────────────────────────────

export type AssinaturaStatus = 'ativa' | 'pausada' | 'cancelada' | 'encerrada' | 'inadimplente' | 'em_trial';

export interface ErpAssinatura {
  id: string;
  tenant_id: string;
  cliente_id: string;
  produto_id: string;
  vendedor_id: string | null;
  status: AssinaturaStatus;
  valor_mensal: number;
  data_inicio: string;
  data_fim: string | null;
  desconto_pct: number;
  observacoes: string | null;
  crm_negociacao_id: string | null;
  ciclo_cobranca: 'mensal' | 'trimestral' | 'semestral' | 'anual' | null;
  proximo_vencimento: string | null;
  motivo_cancelamento: string | null;
  motivo_pausa: string | null;
  data_retorno_previsto: string | null;
  desconto_motivo: string | null;
  desconto_validade: string | null;
  created_at: string;
  erp_clientes?: { nome: string; telefone: string | null } | null;
  erp_produtos?: { nome: string } | null;
}

export interface ErpAssinaturaHistorico {
  id: string;
  tenant_id: string;
  assinatura_id: string;
  acao: string;
  valor_anterior: string | null;
  valor_novo: string | null;
  motivo: string | null;
  usuario_nome: string | null;
  created_at: string;
}

export interface ErpAssinaturaCobranca {
  id: string;
  tenant_id: string;
  assinatura_id: string;
  referencia: string;
  valor_bruto: number;
  desconto_pct: number;
  valor_liquido: number;
  vencimento: string;
  pago_em: string | null;
  status: 'pendente' | 'pago' | 'atrasado' | 'cancelado';
  gateway_id: string | null;
  created_at: string;
}

export interface ErpGrupoCliente {
  id: string;
  tenant_id: string;
  nome: string;
  tipo: string;
  descricao: string | null;
  created_at: string;
}

export interface ErpGrupoClienteMembro {
  id: string;
  grupo_id: string;
  cliente_id: string;
  tenant_id: string;
  added_at: string;
  erp_clientes?: { nome: string; telefone: string | null } | null;
}

export interface ErpDesconto {
  id: string;
  tenant_id: string;
  nome: string;
  valor_pct: number;
  aplica_a: 'produto' | 'grupo' | 'assinatura';
  referencia_id: string | null;
  ativo: boolean;
  created_at: string;
}

export interface ErpAtividadeCliente {
  id: string;
  tenant_id: string;
  titulo: string;
  descricao: string | null;
  tipo: 'operacional' | 'financeira' | 'desconto' | 'notificacao';
  trigger_valor_acumulado_gt: number | null;
  trigger_meses_inscrito_gt: number | null;
  trigger_status_assinatura: string | null;
  trigger_manual: boolean;
  acao_add_agenda: boolean;
  acao_agenda_responsavel_id: string | null;
  acao_add_grupo_id: string | null;
  acao_aplicar_desconto_id: string | null;
  acao_modificar_valor_pct: number | null;
  acao_notificacao_texto: string | null;
  ativo: boolean;
  created_at: string;
}

export interface ErpProdutoFoto {
  id: string;
  tenant_id: string;
  produto_id: string;
  url: string;
  is_cover: boolean;
  ordem: number;
  created_at: string;
}

export interface ErpProdutoPdf {
  id: string;
  tenant_id: string;
  produto_id: string;
  url: string;
  nome: string;
  created_at: string;
}

export interface ErpMovimento {
  id: string;
  produto_id: string;
  tipo_movimento: 'ENTRADA' | 'SAIDA' | 'TRANSFERENCIA' | 'AJUSTE';
  quantidade: number;
  deposito_origem: string | null;
  deposito_destino: string | null;
  empresa_destino_id: string | null;
  pedido_id: string | null;
  usuario_id: string;
  observacao: string | null;
  tenant_id: string;
  created_at: string;
  erp_produtos?: { nome: string; unidade_medida: string } | null;
}

export interface ErpPedido {
  id: string;
  numero: number;
  tipo: 'VENDA' | 'DEVOLUCAO' | 'DEMONSTRACAO' | 'REVENDA';
  status: 'RASCUNHO' | 'CONFIRMADO' | 'FATURADO' | 'CANCELADO' | 'REALIZADO';
  cliente_id: string;
  vendedor_id: string | null;
  data_emissao: string;
  data_entrega_prevista: string | null;
  condicao_pagamento: string | null;
  formas_pagamento_json?: Array<{ forma: string; parcelas: number; valor: number; vencimento?: string }> | null;
  desconto_global_pct: number;
  frete_valor: number;
  total_produtos: number;
  total_pedido: number;
  observacoes: string | null;
  tenant_id: string;
  created_at: string;
  erp_clientes?: { nome: string; cpf_cnpj: string } | null;
}

export interface ErpPedidoItem {
  id: string;
  pedido_id: string;
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
  desconto_item_pct: number;
  total_item: number;
  tenant_id: string;
  erp_produtos?: { nome: string; unidade_medida: string; codigo_interno: string } | null;
}

export interface ErpAtendimento {
  id: string;
  numero: number;
  tipo: 'ATENDIMENTO' | 'CASO' | 'ORDEM_SERVICO';
  status: 'ABERTO' | 'EM_ANDAMENTO' | 'RESOLVIDO' | 'FECHADO';
  cliente_id: string;
  responsavel_id: string | null;
  titulo: string;
  descricao: string | null;
  prioridade: 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
  data_abertura: string;
  data_fechamento: string | null;
  tenant_id: string;
  created_at: string;
  erp_clientes?: { nome: string } | null;
}

export interface ErpLancamento {
  id: string;
  tipo: 'RECEITA' | 'DESPESA';
  categoria: string;
  descricao: string;
  valor: number;
  data_vencimento: string;
  data_pagamento: string | null;
  status: 'PENDENTE' | 'PAGO' | 'CANCELADO';
  nfe_id: string | null;
  pedido_id: string | null;
  conta_bancaria_id: string | null;
  tenant_id: string;
  created_at: string;
}

export interface ErpContaBancaria {
  id: string;
  nome: string;
  banco_codigo: string | null;
  agencia: string | null;
  conta: string | null;
  saldo_atual: number;
  empresa_id: string | null;
  ativo: boolean;
  tenant_id: string;
  created_at: string;
}

export interface ErpAtividade {
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

export interface ErpProjeto {
  id: string;
  nome: string;
  descricao: string | null;
  grupo_id: string | null;
  cadeia_id: string | null;
  status: 'PLANEJAMENTO' | 'EM_ANDAMENTO' | 'PAUSADO' | 'CONCLUIDO' | 'CANCELADO';
  responsavel_id: string | null;
  data_inicio: string | null;
  data_fim_prevista: string | null;
  data_fim_real: string | null;
  orcamento_previsto: number | null;
  orcamento_realizado: number;
  progresso_pct: number;
  tenant_id: string;
  created_at: string;
  erp_grupos_projetos?: { nome: string; cor_hex: string } | null;
}

export interface ErpGrupoProjeto {
  id: string;
  nome: string;
  descricao: string | null;
  cor_hex: string;
  lider_id: string | null;
  tenant_id: string;
  created_at: string;
}

// ── Helper ────────────────────────────────────────────────────────────────────
import { getTenantId, getTenantIds } from './auth';

// ── Clientes ─────────────────────────────────────────────────────────────────

export async function getClientes(search = '', tenantIds?: string[]): Promise<ErpCliente[]> {
  const tids = tenantIds ?? getTenantIds();
  return cached(`${tids.join(',')}:clientes:${search}`, async () => {
    let q = supabase.from('erp_clientes').select('*').in('tenant_id', tids).order('nome');
    if (search) q = q.ilike('nome', `%${search}%`);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  });
}

export async function createCliente(payload: Omit<ErpCliente, 'id' | 'tenant_id' | 'created_at'>, tenantId?: string): Promise<ErpCliente> {
  const tenant_id = tenantId || getTenantId();
  const { data, error } = await supabase.from('erp_clientes').insert({ ...payload, tenant_id }).select().single();
  if (error) throw error;
  invalidateCacheAll();
  return data;
}

export async function updateCliente(id: string, payload: Partial<ErpCliente>): Promise<ErpCliente> {
  const { data, error } = await supabase.from('erp_clientes').update(payload).eq('id', id).eq('tenant_id', getTenantId()).select().single();
  if (error) throw error;
  invalidateCacheAll();
  return data;
}

export async function deleteCliente(id: string): Promise<void> {
  const [{ count: negCount }, { count: pedCount }, { count: assCount }] = await Promise.all([
    supabase.from('crm_negociacoes').select('id', { count: 'exact', head: true }).eq('cliente_id', id),
    supabase.from('erp_pedidos').select('id', { count: 'exact', head: true }).eq('cliente_id', id),
    supabase.from('erp_assinaturas').select('id', { count: 'exact', head: true }).eq('cliente_id', id),
  ]);
  const bloqueios: string[] = [];
  if ((negCount ?? 0) > 0) bloqueios.push(`${negCount} negociação(ões)`);
  if ((pedCount ?? 0) > 0) bloqueios.push(`${pedCount} pedido(s)`);
  if ((assCount ?? 0) > 0) bloqueios.push(`${assCount} assinatura(s)`);
  if (bloqueios.length > 0) {
    throw new Error(`Não é possível excluir: este cliente possui ${bloqueios.join(', ')} vinculado(s). Exclua-os primeiro.`);
  }
  const { error } = await supabase.from('erp_clientes').delete().eq('id', id).eq('tenant_id', getTenantId());
  if (error) throw error;
  invalidateCacheAll();
}

// ── Fornecedores ──────────────────────────────────────────────────────────────

export async function getFornecedores(search = ''): Promise<ErpFornecedor[]> {
  const tids = getTenantIds();
  return cached(`${tids.join(',')}:fornecedores:${search}`, async () => {
    let q = supabase.from('erp_fornecedores').select('*').in('tenant_id', tids).order('nome');
    if (search) q = q.ilike('nome', `%${search}%`);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  });
}

export async function createFornecedor(payload: Omit<ErpFornecedor, 'id' | 'tenant_id' | 'created_at'>, tenantId?: string): Promise<ErpFornecedor> {
  const tenant_id = tenantId || getTenantId();
  const { data, error } = await supabase.from('erp_fornecedores').insert({ ...payload, tenant_id }).select().single();
  if (error) throw error;
  invalidateCacheAll();
  return data;
}

export async function updateFornecedor(id: string, payload: Partial<ErpFornecedor>): Promise<ErpFornecedor> {
  const { data, error } = await supabase.from('erp_fornecedores').update(payload).eq('id', id).eq('tenant_id', getTenantId()).select().single();
  if (error) throw error;
  invalidateCacheAll();
  return data;
}

export async function deleteFornecedor(id: string): Promise<void> {
  const { error } = await supabase.from('erp_fornecedores').delete().eq('id', id).eq('tenant_id', getTenantId());
  if (error) throw error;
  invalidateCacheAll();
}

// ── Grupo Produtos ────────────────────────────────────────────────────────────

export async function getGruposProdutos(): Promise<ErpGrupoProduto[]> {
  const tids = getTenantIds();
  return cached(`${tids.join(',')}:grupos_produtos`, async () => {
    const { data, error } = await supabase.from('erp_grupo_produtos').select('*').in('tenant_id', tids).order('nome');
    if (error) throw error;
    return data ?? [];
  });
}

export async function createGrupoProduto(payload: Omit<ErpGrupoProduto, 'id' | 'tenant_id' | 'created_at'>, tenantId?: string): Promise<ErpGrupoProduto> {
  const tenant_id = tenantId || getTenantId();
  const { data, error } = await supabase.from('erp_grupo_produtos').insert({ ...payload, tenant_id }).select().single();
  if (error) throw error;
  invalidateCacheAll();
  return data;
}

export async function updateGrupoProduto(id: string, payload: Partial<ErpGrupoProduto>): Promise<ErpGrupoProduto> {
  const { data, error } = await supabase.from('erp_grupo_produtos').update(payload).eq('id', id).eq('tenant_id', getTenantId()).select().single();
  if (error) throw error;
  invalidateCacheAll();
  return data;
}

export async function deleteGrupoProduto(id: string): Promise<void> {
  const { error } = await supabase.from('erp_grupo_produtos').delete().eq('id', id).eq('tenant_id', getTenantId());
  if (error) throw error;
  invalidateCacheAll();
}

// ── Produtos ──────────────────────────────────────────────────────────────────

export async function getProdutos(search = ''): Promise<ErpProduto[]> {
  const tids = getTenantIds();
  return cached(`${tids.join(',')}:produtos:${search}`, async () => {
    let q = supabase.from('erp_produtos').select('*, erp_grupo_produtos(nome)')
      .in('tenant_id', tids)
      .order('nome');
    if (search) q = q.ilike('nome', `%${search}%`);
    const { data, error } = await q;
    if (error) throw error;
    return data ?? [];
  });
}

/** Busca todas as variações de um produto pai (sub-produtos) */
export async function getVariacoesProduto(paiId: string): Promise<ErpProduto[]> {
  const { data, error } = await supabase
    .from('erp_produtos')
    .select('*, erp_grupo_produtos(nome)')
    .eq('produto_pai_id', paiId)
    .in('tenant_id', getTenantIds())
    .order('codigo_interno');
  if (error) throw error;
  return data ?? [];
}

/** Busca orçamentos CRM que contêm um produto específico */
export async function getOrcamentosPorProduto(produtoId: string): Promise<{ orcamento_id: string; negociacao_id: string; quantidade: number; preco_unitario: number; total: number; negociacao?: { cliente_nome: string } }[]> {
  const { data, error } = await supabase
    .from('crm_orcamento_itens')
    .select('orcamento_id, quantidade, preco_unitario, total, crm_orcamentos(negociacao_id, crm_negociacoes(cliente_nome))')
    .eq('produto_id', produtoId);
  if (error) throw error;
  return (data ?? []).map((row: Record<string, unknown>) => ({
    orcamento_id: row.orcamento_id as string,
    negociacao_id: ((row.crm_orcamentos as Record<string, unknown>)?.negociacao_id ?? '') as string,
    quantidade: row.quantidade as number,
    preco_unitario: row.preco_unitario as number,
    total: row.total as number,
    negociacao: { cliente_nome: (((row.crm_orcamentos as Record<string, unknown>)?.crm_negociacoes as Record<string, unknown>)?.cliente_nome ?? '') as string },
  }));
}

export async function createProduto(payload: Omit<ErpProduto, 'id' | 'tenant_id' | 'created_at' | 'estoque_atual' | 'erp_grupo_produtos'>, tenantId?: string): Promise<ErpProduto> {
  const tenant_id = tenantId || getTenantId();
  const { data, error } = await supabase.from('erp_produtos').insert({ ...payload, tenant_id, estoque_atual: 0 }).select().single();
  if (error) throw error;
  invalidateCacheAll();
  return data;
}

export async function updateProduto(id: string, payload: Partial<ErpProduto>): Promise<ErpProduto> {
  const { data, error } = await supabase.from('erp_produtos').update(payload).eq('id', id).eq('tenant_id', getTenantId()).select().single();
  if (error) throw error;
  invalidateCacheAll();
  return data;
}

export async function deleteProduto(id: string): Promise<void> {
  const { error } = await supabase.from('erp_produtos').delete().eq('id', id).eq('tenant_id', getTenantId());
  if (error) throw error;
  invalidateCacheAll();
}

// ── Estoque ───────────────────────────────────────────────────────────────────

export async function getMovimentos(produtoId?: string): Promise<ErpMovimento[]> {
  let q = supabase.from('erp_estoque_movimentos')
    .select('*, erp_produtos(nome, unidade_medida)')
    .in('tenant_id', getTenantIds())
    .order('created_at', { ascending: false })
    .limit(200);
  if (produtoId) q = q.eq('produto_id', produtoId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function registrarMovimento(payload: {
  produto_id: string;
  tipo_movimento: 'ENTRADA' | 'SAIDA' | 'TRANSFERENCIA' | 'AJUSTE';
  quantidade: number;
  deposito_origem?: string;
  deposito_destino?: string;
  observacao?: string;
}): Promise<ErpMovimento> {
  const tenant_id = getTenantId();
  const { data: { user } } = await supabase.auth.getUser();
  const usuario_id = user?.id ?? '00000000-0000-0000-0000-000000000001';

  const { data, error } = await supabase.from('erp_estoque_movimentos')
    .insert({ ...payload, usuario_id, tenant_id })
    .select()
    .single();
  if (error) throw error;

  // Nota: atualização de estoque_atual é responsabilidade exclusiva do trigger
  // trg_atualiza_estoque no banco. Não duplicar aqui.

  invalidateCacheAll();
  return data;
}

// ── Pedidos ───────────────────────────────────────────────────────────────────

export async function getPedidos(tipo?: string, status?: string): Promise<ErpPedido[]> {
  let q = supabase.from('erp_pedidos')
    .select('*, erp_clientes!erp_pedidos_cliente_id_fkey(nome, cpf_cnpj)')
    .in('tenant_id', getTenantIds())
    .order('created_at', { ascending: false });
  if (tipo) q = q.eq('tipo', tipo);
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getPedidoItens(pedidoId: string): Promise<ErpPedidoItem[]> {
  const { data, error } = await supabase.from('erp_pedidos_itens')
    .select('*, erp_produtos(nome, unidade_medida, codigo_interno)')
    .eq('pedido_id', pedidoId)
    .in('tenant_id', getTenantIds());
  if (error) throw error;
  return data ?? [];
}

export async function createPedido(
  pedido: Omit<ErpPedido, 'id' | 'numero' | 'tenant_id' | 'created_at' | 'erp_clientes'>,
  itens: Omit<ErpPedidoItem, 'id' | 'pedido_id' | 'tenant_id' | 'erp_produtos'>[],
  tenantId?: string
): Promise<ErpPedido> {
  const tenant_id = tenantId || getTenantId();
  const { data: pedidoData, error: pedidoError } = await supabase
    .from('erp_pedidos')
    .insert({ ...pedido, tenant_id })
    .select()
    .single();
  if (pedidoError) throw pedidoError;

  if (itens.length > 0) {
    const { error: itensError } = await supabase.from('erp_pedidos_itens').insert(
      itens.map(item => ({ ...item, pedido_id: pedidoData.id, tenant_id }))
    );
    if (itensError) throw itensError;
  }
  return pedidoData;
}

export async function updatePedidoStatus(id: string, status: ErpPedido['status']): Promise<void> {
  const { error } = await supabase.from('erp_pedidos').update({ status }).eq('id', id).eq('tenant_id', getTenantId());
  if (error) throw error;
}

// ── Atendimentos ──────────────────────────────────────────────────────────────

export async function getAtendimentos(tipo?: string): Promise<ErpAtendimento[]> {
  let q = supabase.from('erp_atendimentos')
    .select('*, erp_clientes(nome)')
    .in('tenant_id', getTenantIds())
    .order('created_at', { ascending: false });
  if (tipo) q = q.eq('tipo', tipo);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function createAtendimento(payload: Omit<ErpAtendimento, 'id' | 'numero' | 'tenant_id' | 'created_at' | 'erp_clientes'>, tenantId?: string): Promise<ErpAtendimento> {
  const tenant_id = tenantId || getTenantId();
  const { data, error } = await supabase.from('erp_atendimentos').insert({ ...payload, tenant_id }).select().single();
  if (error) throw error;
  return data;
}

export async function updateAtendimento(id: string, payload: Partial<ErpAtendimento>): Promise<ErpAtendimento> {
  const { data, error } = await supabase.from('erp_atendimentos').update(payload).eq('id', id).eq('tenant_id', getTenantId()).select().single();
  if (error) throw error;
  return data;
}

// ── Lançamentos Financeiros ───────────────────────────────────────────────────

export async function getLancamentos(tipo?: 'RECEITA' | 'DESPESA'): Promise<ErpLancamento[]> {
  let q = supabase.from('erp_financeiro_lancamentos')
    .select('*')
    .in('tenant_id', getTenantIds())
    .order('data_vencimento', { ascending: false });
  if (tipo) q = q.eq('tipo', tipo);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function createLancamento(payload: Omit<ErpLancamento, 'id' | 'tenant_id' | 'created_at'>, tenantId?: string): Promise<ErpLancamento> {
  const tenant_id = tenantId || getTenantId();
  const { data, error } = await supabase.from('erp_financeiro_lancamentos').insert({ ...payload, tenant_id }).select().single();
  if (error) throw error;
  return data;
}

export async function pagarLancamento(id: string, data_pagamento: string, conta_bancaria_id?: string): Promise<void> {
  const update: Record<string, unknown> = { status: 'PAGO', data_pagamento };
  if (conta_bancaria_id) update.conta_bancaria_id = conta_bancaria_id;
  const { error } = await supabase.from('erp_financeiro_lancamentos').update(update).eq('id', id).eq('tenant_id', getTenantId());
  if (error) throw error;
}

// ── Contas Bancárias ──────────────────────────────────────────────────────────

export async function getContasBancarias(): Promise<ErpContaBancaria[]> {
  const { data, error } = await supabase.from('erp_contas_bancarias').select('*').in('tenant_id', getTenantIds()).order('nome');
  if (error) throw error;
  return data ?? [];
}

export async function createContaBancaria(payload: Omit<ErpContaBancaria, 'id' | 'tenant_id' | 'created_at' | 'saldo_atual'>): Promise<ErpContaBancaria> {
  const tenant_id = getTenantId();
  const { data, error } = await supabase.from('erp_contas_bancarias').insert({ ...payload, tenant_id, saldo_atual: 0 }).select().single();
  if (error) throw error;
  return data;
}

// ── Condições de Pagamento ────────────────────────────────────────────────────

export interface ErpCondicaoPagamento {
  id: string;
  descricao: string;
  parcelas_json: { prazo: number; percentual: number }[];
  ativo: boolean;
  tenant_id: string;
  created_at: string;
}

export async function getCondicoesPagamento(): Promise<ErpCondicaoPagamento[]> {
  const { data, error } = await supabase.from('erp_condicoes_pagamento')
    .select('*').in('tenant_id', getTenantIds()).order('descricao');
  if (error) throw error;
  return data ?? [];
}

export async function createCondicaoPagamento(
  payload: Omit<ErpCondicaoPagamento, 'id' | 'tenant_id' | 'created_at'>,
): Promise<ErpCondicaoPagamento> {
  const tenant_id = getTenantId();
  const { data, error } = await supabase.from('erp_condicoes_pagamento')
    .insert({ ...payload, tenant_id }).select().single();
  if (error) throw error;
  return data;
}

export async function toggleCondicaoPagamento(id: string, ativo: boolean): Promise<void> {
  const { error } = await supabase.from('erp_condicoes_pagamento').update({ ativo }).eq('id', id).eq('tenant_id', getTenantId());
  if (error) throw error;
}

// ── Atividades ERP ────────────────────────────────────────────────────────────

export async function getAtividades(modulo?: string): Promise<ErpAtividade[]> {
  let q = supabase.from('erp_atividades')
    .select('*')
    .in('tenant_id', getTenantIds())
    .order('created_at', { ascending: false });
  if (modulo) q = q.eq('modulo_destino', modulo);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function createAtividade(payload: Omit<ErpAtividade, 'id' | 'tenant_id' | 'created_at'>): Promise<ErpAtividade> {
  const tenant_id = getTenantId();
  const { data, error } = await supabase.from('erp_atividades').insert({ ...payload, tenant_id }).select().single();
  if (error) throw error;
  return data;
}

export async function updateAtividadeStatus(id: string, status: ErpAtividade['status']): Promise<void> {
  const update: Record<string, unknown> = { status };
  if (status === 'CONCLUIDA') update.data_conclusao = new Date().toISOString();
  const { error } = await supabase.from('erp_atividades').update(update).eq('id', id).eq('tenant_id', getTenantId());
  if (error) throw error;
}

// ── Projetos ──────────────────────────────────────────────────────────────────

export async function getProjetos(): Promise<ErpProjeto[]> {
  const { data, error } = await supabase.from('erp_projetos')
    .select('*, erp_grupos_projetos(nome, cor_hex)')
    .in('tenant_id', getTenantIds())
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createProjeto(payload: Omit<ErpProjeto, 'id' | 'tenant_id' | 'created_at' | 'orcamento_realizado' | 'erp_grupos_projetos'>): Promise<ErpProjeto> {
  const tenant_id = getTenantId();
  const { data, error } = await supabase.from('erp_projetos')
    .insert({ ...payload, tenant_id, orcamento_realizado: 0 })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProjeto(id: string, payload: Partial<ErpProjeto>): Promise<ErpProjeto> {
  const { data, error } = await supabase.from('erp_projetos').update(payload).eq('id', id).eq('tenant_id', getTenantId()).select().single();
  if (error) throw error;
  return data;
}

export async function getGruposProjetos(): Promise<ErpGrupoProjeto[]> {
  const { data, error } = await supabase.from('erp_grupos_projetos').select('*').in('tenant_id', getTenantIds()).order('nome');
  if (error) throw error;
  return data ?? [];
}

export async function createGrupoProjeto(payload: Omit<ErpGrupoProjeto, 'id' | 'tenant_id' | 'created_at'>): Promise<ErpGrupoProjeto> {
  const tenant_id = getTenantId();
  const { data, error } = await supabase.from('erp_grupos_projetos').insert({ ...payload, tenant_id }).select().single();
  if (error) throw error;
  return data;
}

// ── Caixa / PDV ───────────────────────────────────────────────────────────────
// Estrutura alinhada com o schema real do Supabase (erp_caixa_sessoes,
// erp_caixa_transacoes). As tabelas erp_caixa_vendas e erp_caixa_venda_itens
// devem ser criadas via SQL (ver supabase/migrations/).

export interface ErpCaixaSessao {
  id: string;
  numero: number;
  operador_codigo: string | null;
  operador_nome: string;
  filial_id: string | null;
  data_abertura: string;
  data_fechamento: string | null;
  status: 'ABERTA' | 'FECHADA';
  saldo_inicial: number;        // fundo de troco (reais)
  valor_abertura: number;       // mesmo que saldo_inicial
  saldo_final: number | null;
  valor_fechamento: number | null;
  total_vendas: number;         // reais
  total_dinheiro: number;
  total_credito: number;
  total_debito: number;
  total_pix: number;
  total_voucher: number;
  total_cancelado: number;
  qtd_vendas: number;
  observacoes: string | null;
  terminal_config_id: string | null;
  tenant_id: string;
  created_at: string;
}

// ── Transação de caixa (erp_caixa_transacoes — cada meio de pagamento) ────────

export interface ErpCaixaTransacao {
  id: string;
  sessao_caixa_id: string;
  pedido_id: string | null;
  terminal_config_id: string | null;
  forma_pagamento: string;      // 'dinheiro' | 'credito' | 'debito' | 'pix' | 'voucher'
  valor: number;                // reais (não centavos)
  parcelas: number;
  bandeira: string | null;
  nsu: string | null;
  codigo_autorizacao: string | null;
  status: string;               // 'APROVADA' | 'NEGADA' | 'CANCELADA'
  motivo_recusa: string | null;
  payload_provider: Record<string, unknown> | null;
  operador_codigo: string;
  filial_id: string | null;
  modulo_origem: string;        // 'erp_caixa'
  tenant_id: string;
  created_at: string;
}

// ── Venda completa (tabelas erp_caixa_vendas / erp_caixa_venda_itens) ─────────
// Estas tabelas precisam ser criadas — ver SQL em supabase/migrations/

export interface ErpCaixaVenda {
  id: string;
  sessao_id: string;
  operador_codigo: string;
  cliente_id: string | null;
  subtotal: number;             // reais
  desconto: number;
  total: number;
  pagamentos_json: Record<string, unknown>[];
  status: 'FINALIZADA' | 'CANCELADA';
  tenant_id: string;
  created_at: string;
}

export interface ErpCaixaVendaItem {
  id: string;
  venda_id: string;
  produto_id: string;
  produto_nome: string;
  produto_code: string;
  unidade: string;
  quantidade: number;
  preco_unitario: number;       // reais
  desconto_pct: number;
  total_item: number;           // reais
  tenant_id: string;
}

export async function openCaixaSessao(payload: {
  operador_codigo?: string;
  operador_nome: string;
  filial_id?: string | null;
  saldo_inicial?: number;
}): Promise<ErpCaixaSessao> {
  const tenant_id = getTenantId();
  const saldo = payload.saldo_inicial ?? 0;
  const { data, error } = await supabase.from('erp_caixa_sessoes').insert({
    operador_codigo: payload.operador_codigo ?? null,
    operador_nome: payload.operador_nome,
    filial_id: payload.filial_id ?? null,
    saldo_inicial: saldo,
    valor_abertura: saldo,
    data_abertura: new Date().toISOString(),
    status: 'ABERTA',
    total_vendas: 0, total_dinheiro: 0, total_credito: 0,
    total_debito: 0, total_pix: 0, total_voucher: 0,
    total_cancelado: 0, qtd_vendas: 0,
    tenant_id,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function closeCaixaSessao(
  id: string,
  stats: {
    total_vendas: number;
    total_dinheiro: number;
    total_credito: number;
    total_debito: number;
    total_pix: number;
    total_voucher: number;
    qtd_vendas: number;
  }
): Promise<void> {
  const { error } = await supabase.from('erp_caixa_sessoes').update({
    status: 'FECHADA',
    data_fechamento: new Date().toISOString(),
    valor_fechamento: stats.total_vendas,
    ...stats,
  }).eq('id', id).eq('tenant_id', getTenantId());
  if (error) throw error;
}

// Salva uma transação de pagamento em erp_caixa_transacoes (tabela real)
export async function createCaixaTransacao(payload: {
  sessao_caixa_id: string;
  forma_pagamento: string;
  valor: number;
  parcelas?: number;
  operador_codigo: string;
  filial_id?: string | null;
  status?: string;
}): Promise<ErpCaixaTransacao> {
  const tenant_id = getTenantId();
  const { data, error } = await supabase.from('erp_caixa_transacoes').insert({
    sessao_caixa_id: payload.sessao_caixa_id,
    forma_pagamento: payload.forma_pagamento,
    valor: payload.valor,
    parcelas: payload.parcelas ?? 1,
    operador_codigo: payload.operador_codigo,
    filial_id: payload.filial_id ?? null,
    modulo_origem: 'erp_caixa',
    status: payload.status ?? 'APROVADA',
    tenant_id,
  }).select().single();
  if (error) throw error;
  return data;
}

// Salva venda completa em erp_caixa_vendas + itens (criadas via migration)
export async function createCaixaVenda(
  venda: Omit<ErpCaixaVenda, 'id' | 'tenant_id' | 'created_at'>,
  itens: Omit<ErpCaixaVendaItem, 'id' | 'venda_id' | 'tenant_id'>[]
): Promise<ErpCaixaVenda> {
  const tenant_id = getTenantId();
  const { data: vendaData, error: vendaError } = await supabase
    .from('erp_caixa_vendas')
    .insert({ ...venda, tenant_id })
    .select()
    .single();
  if (vendaError) throw vendaError;

  if (itens.length > 0) {
    const { error: itensError } = await supabase.from('erp_caixa_venda_itens').insert(
      itens.map(i => ({ ...i, venda_id: vendaData.id, tenant_id }))
    );
    if (itensError) throw itensError;
  }
  return vendaData;
}

export async function getVendasDaSessao(sessao_id: string): Promise<ErpCaixaVenda[]> {
  const { data, error } = await supabase.from('erp_caixa_vendas')
    .select('*')
    .eq('sessao_id', sessao_id)
    .in('tenant_id', getTenantIds())
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getTransacoesDaSessao(sessao_caixa_id: string): Promise<ErpCaixaTransacao[]> {
  const { data, error } = await supabase.from('erp_caixa_transacoes')
    .select('*')
    .eq('sessao_caixa_id', sessao_caixa_id)
    .in('tenant_id', getTenantIds())
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function cancelCaixaVenda(id: string): Promise<void> {
  const { error } = await supabase.from('erp_caixa_vendas')
    .update({ status: 'CANCELADA' })
    .eq('id', id)
    .eq('tenant_id', getTenantId());
  if (error) throw error;
}

// ── Hierarquia de Empresas (Holding → Matriz → Filial) ────────────────────────
// zia_holdings → zia_matrizes → erp_empresas (filiais via matriz_id)

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
}

export async function getHoldings(): Promise<ZiaHolding[]> {
  const { data, error } = await supabase.from('zia_holdings').select('*').order('nome');
  if (error) throw error;
  return data ?? [];
}

export async function getMatrizes(holdingId?: string): Promise<ZiaMatriz[]> {
  let q = supabase.from('zia_matrizes').select('*').order('nome');
  if (holdingId) q = q.eq('holding_id', holdingId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

// Filiais = erp_empresas com matriz_id
export async function getFiliais(matrizId?: string): Promise<ErpEmpresa[]> {
  let q = supabase.from('erp_empresas').select('*').eq('ativo', true).order('nome_fantasia');
  if (matrizId) q = q.eq('matriz_id', matrizId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

// ── Usuários / Perfis de Operadores (zia_usuarios) ────────────────────────────

export interface ZiaUsuario {
  id: string;
  codigo: string;
  nome: string;
  senha_hash: string;
  nivel: 1 | 2 | 3 | 4;
  entidade_tipo: 'holding' | 'matriz' | 'filial';
  entidade_id: string;
  entidade_nome: string;
  modulo_acesso: string | null;
  ativo: boolean;
  criado_por: string;
  tenant_id: string;
  created_at: string;
}

export async function getZiaUsuarios(): Promise<ZiaUsuario[]> {
  const { data, error } = await supabase.from('zia_usuarios')
    .select('*')
    .order('nome');
  if (error) throw error;
  return data ?? [];
}

export async function createZiaUsuario(
  payload: Omit<ZiaUsuario, 'id' | 'created_at'>
): Promise<ZiaUsuario> {
  const { data, error } = await supabase.from('zia_usuarios')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateZiaUsuario(
  id: string,
  payload: Partial<ZiaUsuario>
): Promise<ZiaUsuario> {
  const { data, error } = await supabase.from('zia_usuarios')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteZiaUsuario(id: string): Promise<void> {
  const { error } = await supabase.from('zia_usuarios').delete().eq('id', id);
  if (error) throw error;
}

// ── Utilitários externos ──────────────────────────────────────────────────────

export async function consultarCNPJ(cnpj: string): Promise<Record<string, unknown> | null> {
  const cleaned = cnpj.replace(/\D/g, '');
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleaned}`);
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

// ── Assinaturas ───────────────────────────────────────────────────────────────

/** Retorna ID do vendedor logado se nivel >= 3, null se gestor (vê todos) */
export function getVendedorFilter(): string | null {
  try {
    const raw = localStorage.getItem('zia_active_profile_v1');
    if (!raw) return null;
    const p = JSON.parse(raw) as { level?: number; id?: string };
    return (p.level ?? 1) >= 3 ? (p.id ?? null) : null;
  } catch { return null; }
}

export async function getAssinaturas(filters?: {
  vendedor_id?: string | null;
  status?: string;
  search?: string;
}): Promise<ErpAssinatura[]> {
  const tids = getTenantIds();
  let q = supabase
    .from('erp_assinaturas')
    .select('*, erp_clientes(nome, telefone), erp_produtos(nome)')
    .in('tenant_id', tids)
    .order('created_at', { ascending: false });
  if (filters?.vendedor_id) q = q.eq('vendedor_id', filters.vendedor_id);
  if (filters?.status) q = q.eq('status', filters.status);
  if (filters?.search) q = q.ilike('erp_clientes.nome', `%${filters.search}%`);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as ErpAssinatura[];
}

export async function getAssinatura(id: string): Promise<ErpAssinatura> {
  const { data, error } = await supabase
    .from('erp_assinaturas')
    .select('*, erp_clientes(nome, telefone), erp_produtos(nome)')
    .eq('id', id)
    .in('tenant_id', getTenantIds())
    .single();
  if (error) throw error;
  return data as ErpAssinatura;
}

export async function createAssinatura(payload: Omit<ErpAssinatura, 'id' | 'tenant_id' | 'created_at' | 'erp_clientes' | 'erp_produtos'>, tenantId?: string): Promise<ErpAssinatura> {
  const tenant_id = tenantId || getTenantId();
  const { data, error } = await supabase
    .from('erp_assinaturas')
    .insert({ ...payload, tenant_id })
    .select('*, erp_clientes(nome, telefone), erp_produtos(nome)')
    .single();
  if (error) throw error;
  return data as ErpAssinatura;
}

export async function updateAssinatura(id: string, payload: Partial<ErpAssinatura>): Promise<ErpAssinatura> {
  const { erp_clientes: _c, erp_produtos: _p, ...rest } = payload;
  const { data, error } = await supabase
    .from('erp_assinaturas')
    .update(rest)
    .eq('id', id)
    .eq('tenant_id', getTenantId())
    .select('*, erp_clientes(nome, telefone), erp_produtos(nome)')
    .single();
  if (error) throw error;
  return data as ErpAssinatura;
}

export async function deleteAssinatura(id: string): Promise<void> {
  const { error } = await supabase.from('erp_assinaturas').delete().eq('id', id).eq('tenant_id', getTenantId());
  if (error) throw error;
}

// ── Histórico de Assinaturas ──────────────────────────────────────────────────

export async function getAssinaturaHistorico(assinaturaId: string): Promise<ErpAssinaturaHistorico[]> {
  const { data, error } = await supabase
    .from('erp_assinaturas_historico')
    .select('*')
    .eq('assinatura_id', assinaturaId)
    .in('tenant_id', getTenantIds())
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data ?? []) as ErpAssinaturaHistorico[];
}

export async function addAssinaturaHistorico(
  assinaturaId: string,
  entry: Pick<ErpAssinaturaHistorico, 'acao' | 'valor_anterior' | 'valor_novo' | 'motivo' | 'usuario_nome'>
): Promise<void> {
  const tenant_id = getTenantId();
  if (!tenant_id) return;
  await supabase.from('erp_assinaturas_historico').insert({
    assinatura_id: assinaturaId,
    tenant_id,
    ...entry,
  });
}

// ── Cobranças de Assinaturas ──────────────────────────────────────────────────

export async function getAssinaturaCobrancas(assinaturaId: string): Promise<ErpAssinaturaCobranca[]> {
  const { data, error } = await supabase
    .from('erp_assinaturas_cobrancas')
    .select('*')
    .eq('assinatura_id', assinaturaId)
    .in('tenant_id', getTenantIds())
    .order('vencimento', { ascending: false });
  if (error) return [];
  return (data ?? []) as ErpAssinaturaCobranca[];
}

// ── Grupos de Clientes ────────────────────────────────────────────────────────

export async function getGruposClientes(): Promise<ErpGrupoCliente[]> {
  const tids = getTenantIds();
  const { data, error } = await supabase
    .from('erp_grupos_clientes')
    .select('*')
    .in('tenant_id', tids)
    .order('nome');
  if (error) throw error;
  return data ?? [];
}

export async function createGrupoCliente(payload: Omit<ErpGrupoCliente, 'id' | 'tenant_id' | 'created_at'>): Promise<ErpGrupoCliente> {
  const tenant_id = getTenantId();
  const { data, error } = await supabase.from('erp_grupos_clientes').insert({ ...payload, tenant_id }).select().single();
  if (error) throw error;
  return data;
}

export async function updateGrupoCliente(id: string, payload: Partial<ErpGrupoCliente>): Promise<ErpGrupoCliente> {
  const { data, error } = await supabase.from('erp_grupos_clientes').update(payload).eq('id', id).eq('tenant_id', getTenantId()).select().single();
  if (error) throw error;
  return data;
}

export async function deleteGrupoCliente(id: string): Promise<void> {
  const { error } = await supabase.from('erp_grupos_clientes').delete().eq('id', id).eq('tenant_id', getTenantId());
  if (error) throw error;
}

export async function getMembrosGrupo(grupoId: string): Promise<ErpGrupoClienteMembro[]> {
  const { data, error } = await supabase
    .from('erp_grupos_clientes_membros')
    .select('*, erp_clientes(nome, telefone)')
    .eq('grupo_id', grupoId)
    .in('tenant_id', getTenantIds())
    .order('added_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ErpGrupoClienteMembro[];
}

export async function addMembroGrupo(grupoId: string, clienteId: string): Promise<void> {
  const tenant_id = getTenantId();
  const { error } = await supabase.from('erp_grupos_clientes_membros').insert({ grupo_id: grupoId, cliente_id: clienteId, tenant_id });
  if (error && error.code !== '23505') throw error; // ignore unique violation
}

export async function removeMembroGrupo(grupoId: string, clienteId: string): Promise<void> {
  const { error } = await supabase.from('erp_grupos_clientes_membros').delete().eq('grupo_id', grupoId).eq('cliente_id', clienteId).eq('tenant_id', getTenantId());
  if (error) throw error;
}

// ── Descontos ─────────────────────────────────────────────────────────────────

export async function getDescontos(): Promise<ErpDesconto[]> {
  const tids = getTenantIds();
  const { data, error } = await supabase.from('erp_descontos').select('*').in('tenant_id', tids).order('nome');
  if (error) throw error;
  return data ?? [];
}

export async function createDesconto(payload: Omit<ErpDesconto, 'id' | 'tenant_id' | 'created_at'>): Promise<ErpDesconto> {
  const tenant_id = getTenantId();
  const { data, error } = await supabase.from('erp_descontos').insert({ ...payload, tenant_id }).select().single();
  if (error) throw error;
  return data;
}

export async function updateDesconto(id: string, payload: Partial<ErpDesconto>): Promise<ErpDesconto> {
  const { data, error } = await supabase.from('erp_descontos').update(payload).eq('id', id).eq('tenant_id', getTenantId()).select().single();
  if (error) throw error;
  return data;
}

export async function deleteDesconto(id: string): Promise<void> {
  const { error } = await supabase.from('erp_descontos').delete().eq('id', id).eq('tenant_id', getTenantId());
  if (error) throw error;
}

// ── Atividades de Clientes ────────────────────────────────────────────────────

export async function getAtividadesClientes(): Promise<ErpAtividadeCliente[]> {
  const tids = getTenantIds();
  const { data, error } = await supabase.from('erp_atividades_clientes').select('*').in('tenant_id', tids).order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createAtividadeCliente(payload: Omit<ErpAtividadeCliente, 'id' | 'tenant_id' | 'created_at'>): Promise<ErpAtividadeCliente> {
  const tenant_id = getTenantId();
  const { data, error } = await supabase.from('erp_atividades_clientes').insert({ ...payload, tenant_id }).select().single();
  if (error) throw error;
  return data;
}

export async function updateAtividadeCliente(id: string, payload: Partial<ErpAtividadeCliente>): Promise<ErpAtividadeCliente> {
  const { data, error } = await supabase.from('erp_atividades_clientes').update(payload).eq('id', id).eq('tenant_id', getTenantId()).select().single();
  if (error) throw error;
  return data;
}

export async function deleteAtividadeCliente(id: string): Promise<void> {
  const { error } = await supabase.from('erp_atividades_clientes').delete().eq('id', id).eq('tenant_id', getTenantId());
  if (error) throw error;
}

// ── Product Media ─────────────────────────────────────────────────────────────

export async function getProdutoFotos(produtoId: string): Promise<ErpProdutoFoto[]> {
  const { data, error } = await supabase.from('erp_produto_fotos').select('*').eq('produto_id', produtoId).in('tenant_id', getTenantIds()).order('ordem');
  if (error) throw error;
  return data ?? [];
}

export async function addProdutoFoto(produtoId: string, file: File, isCover = false): Promise<ErpProdutoFoto> {
  const tenant_id = getTenantId();
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${produtoId}/${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage.from('product-media').upload(path, file, { upsert: false });
  if (upErr) throw upErr;
  const { data: { publicUrl } } = supabase.storage.from('product-media').getPublicUrl(path);
  // Count existing photos for ordem
  const { count } = await supabase.from('erp_produto_fotos').select('*', { count: 'exact', head: true }).eq('produto_id', produtoId);
  const { data, error } = await supabase.from('erp_produto_fotos').insert({ produto_id: produtoId, url: publicUrl, is_cover: isCover, ordem: count ?? 0, tenant_id }).select().single();
  if (error) throw error;
  return data;
}

export async function setCoverFoto(produtoId: string, fotoId: string): Promise<void> {
  const tid = getTenantId();
  await supabase.from('erp_produto_fotos').update({ is_cover: false }).eq('produto_id', produtoId).eq('tenant_id', tid);
  await supabase.from('erp_produto_fotos').update({ is_cover: true }).eq('id', fotoId).eq('tenant_id', tid);
}

export async function deleteProdutoFoto(id: string, url: string): Promise<void> {
  // Extract path from URL
  const parts = url.split('/product-media/');
  if (parts[1]) await supabase.storage.from('product-media').remove([parts[1]]);
  await supabase.from('erp_produto_fotos').delete().eq('id', id).eq('tenant_id', getTenantId());
}

export async function getProdutoPdfs(produtoId: string): Promise<ErpProdutoPdf[]> {
  const { data, error } = await supabase.from('erp_produto_pdfs').select('*').eq('produto_id', produtoId).in('tenant_id', getTenantIds()).order('created_at');
  if (error) throw error;
  return data ?? [];
}

export async function addProdutoPdf(produtoId: string, file: File): Promise<ErpProdutoPdf> {
  const tenant_id = getTenantId();
  const path = `${produtoId}/pdf_${Date.now()}_${file.name}`;
  const { error: upErr } = await supabase.storage.from('product-media').upload(path, file, { upsert: false });
  if (upErr) throw upErr;
  const { data: { publicUrl } } = supabase.storage.from('product-media').getPublicUrl(path);
  const { data, error } = await supabase.from('erp_produto_pdfs').insert({ produto_id: produtoId, url: publicUrl, nome: file.name, tenant_id }).select().single();
  if (error) throw error;
  return data;
}

export async function deleteProdutoPdf(id: string, url: string): Promise<void> {
  const parts = url.split('/product-media/');
  if (parts[1]) await supabase.storage.from('product-media').remove([parts[1]]);
  await supabase.from('erp_produto_pdfs').delete().eq('id', id).eq('tenant_id', getTenantId());
}
