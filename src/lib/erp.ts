// ─────────────────────────────────────────────────────────────────────────────
// ERP Service Layer — operações de dados do módulo ERP
// Lê/escreve direto no Supabase
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from './supabase';

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
  status: 'RASCUNHO' | 'CONFIRMADO' | 'FATURADO' | 'CANCELADO';
  cliente_id: string;
  vendedor_id: string | null;
  data_emissao: string;
  data_entrega_prevista: string | null;
  condicao_pagamento: string | null;
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

async function getTenantId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? '00000000-0000-0000-0000-000000000001';
}

// ── Clientes ─────────────────────────────────────────────────────────────────

export async function getClientes(search = ''): Promise<ErpCliente[]> {
  let q = supabase.from('erp_clientes').select('*').order('nome');
  if (search) q = q.ilike('nome', `%${search}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function createCliente(payload: Omit<ErpCliente, 'id' | 'tenant_id' | 'created_at'>): Promise<ErpCliente> {
  const tenant_id = await getTenantId();
  const { data, error } = await supabase.from('erp_clientes').insert({ ...payload, tenant_id }).select().single();
  if (error) throw error;
  return data;
}

export async function updateCliente(id: string, payload: Partial<ErpCliente>): Promise<ErpCliente> {
  const { data, error } = await supabase.from('erp_clientes').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteCliente(id: string): Promise<void> {
  const { error } = await supabase.from('erp_clientes').delete().eq('id', id);
  if (error) throw error;
}

// ── Fornecedores ──────────────────────────────────────────────────────────────

export async function getFornecedores(search = ''): Promise<ErpFornecedor[]> {
  let q = supabase.from('erp_fornecedores').select('*').order('nome');
  if (search) q = q.ilike('nome', `%${search}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function createFornecedor(payload: Omit<ErpFornecedor, 'id' | 'tenant_id' | 'created_at'>): Promise<ErpFornecedor> {
  const tenant_id = await getTenantId();
  const { data, error } = await supabase.from('erp_fornecedores').insert({ ...payload, tenant_id }).select().single();
  if (error) throw error;
  return data;
}

export async function updateFornecedor(id: string, payload: Partial<ErpFornecedor>): Promise<ErpFornecedor> {
  const { data, error } = await supabase.from('erp_fornecedores').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteFornecedor(id: string): Promise<void> {
  const { error } = await supabase.from('erp_fornecedores').delete().eq('id', id);
  if (error) throw error;
}

// ── Grupo Produtos ────────────────────────────────────────────────────────────

export async function getGruposProdutos(): Promise<ErpGrupoProduto[]> {
  const { data, error } = await supabase.from('erp_grupo_produtos').select('*').order('nome');
  if (error) throw error;
  return data ?? [];
}

export async function createGrupoProduto(payload: Omit<ErpGrupoProduto, 'id' | 'tenant_id' | 'created_at'>): Promise<ErpGrupoProduto> {
  const tenant_id = await getTenantId();
  const { data, error } = await supabase.from('erp_grupo_produtos').insert({ ...payload, tenant_id }).select().single();
  if (error) throw error;
  return data;
}

export async function updateGrupoProduto(id: string, payload: Partial<ErpGrupoProduto>): Promise<ErpGrupoProduto> {
  const { data, error } = await supabase.from('erp_grupo_produtos').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteGrupoProduto(id: string): Promise<void> {
  const { error } = await supabase.from('erp_grupo_produtos').delete().eq('id', id);
  if (error) throw error;
}

// ── Produtos ──────────────────────────────────────────────────────────────────

export async function getProdutos(search = ''): Promise<ErpProduto[]> {
  let q = supabase.from('erp_produtos').select('*, erp_grupo_produtos(nome)').order('nome');
  if (search) q = q.ilike('nome', `%${search}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function createProduto(payload: Omit<ErpProduto, 'id' | 'tenant_id' | 'created_at' | 'estoque_atual' | 'erp_grupo_produtos'>): Promise<ErpProduto> {
  const tenant_id = await getTenantId();
  const { data, error } = await supabase.from('erp_produtos').insert({ ...payload, tenant_id, estoque_atual: 0 }).select().single();
  if (error) throw error;
  return data;
}

export async function updateProduto(id: string, payload: Partial<ErpProduto>): Promise<ErpProduto> {
  const { data, error } = await supabase.from('erp_produtos').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteProduto(id: string): Promise<void> {
  const { error } = await supabase.from('erp_produtos').delete().eq('id', id);
  if (error) throw error;
}

// ── Estoque ───────────────────────────────────────────────────────────────────

export async function getMovimentos(produtoId?: string): Promise<ErpMovimento[]> {
  let q = supabase.from('erp_estoque_movimentos')
    .select('*, erp_produtos(nome, unidade_medida)')
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
  const tenant_id = await getTenantId();
  const usuario_id = tenant_id;
  const { data, error } = await supabase.from('erp_estoque_movimentos')
    .insert({ ...payload, usuario_id, tenant_id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Pedidos ───────────────────────────────────────────────────────────────────

export async function getPedidos(tipo?: string, status?: string): Promise<ErpPedido[]> {
  let q = supabase.from('erp_pedidos')
    .select('*, erp_clientes(nome, cpf_cnpj)')
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
    .eq('pedido_id', pedidoId);
  if (error) throw error;
  return data ?? [];
}

export async function createPedido(
  pedido: Omit<ErpPedido, 'id' | 'numero' | 'tenant_id' | 'created_at' | 'erp_clientes'>,
  itens: Omit<ErpPedidoItem, 'id' | 'pedido_id' | 'tenant_id' | 'erp_produtos'>[]
): Promise<ErpPedido> {
  const tenant_id = await getTenantId();
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
  const { error } = await supabase.from('erp_pedidos').update({ status }).eq('id', id);
  if (error) throw error;
}

// ── Atendimentos ──────────────────────────────────────────────────────────────

export async function getAtendimentos(tipo?: string): Promise<ErpAtendimento[]> {
  let q = supabase.from('erp_atendimentos')
    .select('*, erp_clientes(nome)')
    .order('created_at', { ascending: false });
  if (tipo) q = q.eq('tipo', tipo);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function createAtendimento(payload: Omit<ErpAtendimento, 'id' | 'numero' | 'tenant_id' | 'created_at' | 'erp_clientes'>): Promise<ErpAtendimento> {
  const tenant_id = await getTenantId();
  const { data, error } = await supabase.from('erp_atendimentos').insert({ ...payload, tenant_id }).select().single();
  if (error) throw error;
  return data;
}

export async function updateAtendimento(id: string, payload: Partial<ErpAtendimento>): Promise<ErpAtendimento> {
  const { data, error } = await supabase.from('erp_atendimentos').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

// ── Lançamentos Financeiros ───────────────────────────────────────────────────

export async function getLancamentos(tipo?: 'RECEITA' | 'DESPESA'): Promise<ErpLancamento[]> {
  let q = supabase.from('erp_financeiro_lancamentos')
    .select('*')
    .order('data_vencimento', { ascending: false });
  if (tipo) q = q.eq('tipo', tipo);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function createLancamento(payload: Omit<ErpLancamento, 'id' | 'tenant_id' | 'created_at'>): Promise<ErpLancamento> {
  const tenant_id = await getTenantId();
  const { data, error } = await supabase.from('erp_financeiro_lancamentos').insert({ ...payload, tenant_id }).select().single();
  if (error) throw error;
  return data;
}

export async function pagarLancamento(id: string, data_pagamento: string, conta_bancaria_id?: string): Promise<void> {
  const update: Record<string, unknown> = { status: 'PAGO', data_pagamento };
  if (conta_bancaria_id) update.conta_bancaria_id = conta_bancaria_id;
  const { error } = await supabase.from('erp_financeiro_lancamentos').update(update).eq('id', id);
  if (error) throw error;
}

// ── Contas Bancárias ──────────────────────────────────────────────────────────

export async function getContasBancarias(): Promise<ErpContaBancaria[]> {
  const { data, error } = await supabase.from('erp_contas_bancarias').select('*').order('nome');
  if (error) throw error;
  return data ?? [];
}

export async function createContaBancaria(payload: Omit<ErpContaBancaria, 'id' | 'tenant_id' | 'created_at' | 'saldo_atual'>): Promise<ErpContaBancaria> {
  const tenant_id = await getTenantId();
  const { data, error } = await supabase.from('erp_contas_bancarias').insert({ ...payload, tenant_id, saldo_atual: 0 }).select().single();
  if (error) throw error;
  return data;
}

// ── Atividades ERP ────────────────────────────────────────────────────────────

export async function getAtividades(modulo?: string): Promise<ErpAtividade[]> {
  let q = supabase.from('erp_atividades')
    .select('*')
    .order('created_at', { ascending: false });
  if (modulo) q = q.eq('modulo_destino', modulo);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function createAtividade(payload: Omit<ErpAtividade, 'id' | 'tenant_id' | 'created_at'>): Promise<ErpAtividade> {
  const tenant_id = await getTenantId();
  const { data, error } = await supabase.from('erp_atividades').insert({ ...payload, tenant_id }).select().single();
  if (error) throw error;
  return data;
}

export async function updateAtividadeStatus(id: string, status: ErpAtividade['status']): Promise<void> {
  const update: Record<string, unknown> = { status };
  if (status === 'CONCLUIDA') update.data_conclusao = new Date().toISOString();
  const { error } = await supabase.from('erp_atividades').update(update).eq('id', id);
  if (error) throw error;
}

// ── Projetos ──────────────────────────────────────────────────────────────────

export async function getProjetos(): Promise<ErpProjeto[]> {
  const { data, error } = await supabase.from('erp_projetos')
    .select('*, erp_grupos_projetos(nome, cor_hex)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createProjeto(payload: Omit<ErpProjeto, 'id' | 'tenant_id' | 'created_at' | 'orcamento_realizado' | 'erp_grupos_projetos'>): Promise<ErpProjeto> {
  const tenant_id = await getTenantId();
  const { data, error } = await supabase.from('erp_projetos')
    .insert({ ...payload, tenant_id, orcamento_realizado: 0 })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProjeto(id: string, payload: Partial<ErpProjeto>): Promise<ErpProjeto> {
  const { data, error } = await supabase.from('erp_projetos').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function getGruposProjetos(): Promise<ErpGrupoProjeto[]> {
  const { data, error } = await supabase.from('erp_grupos_projetos').select('*').order('nome');
  if (error) throw error;
  return data ?? [];
}

export async function createGrupoProjeto(payload: Omit<ErpGrupoProjeto, 'id' | 'tenant_id' | 'created_at'>): Promise<ErpGrupoProjeto> {
  const tenant_id = await getTenantId();
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
  const tenant_id = await getTenantId();
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
  }).eq('id', id);
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
  const tenant_id = await getTenantId();
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
  const tenant_id = await getTenantId();
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
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getTransacoesDaSessao(sessao_caixa_id: string): Promise<ErpCaixaTransacao[]> {
  const { data, error } = await supabase.from('erp_caixa_transacoes')
    .select('*')
    .eq('sessao_caixa_id', sessao_caixa_id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
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
