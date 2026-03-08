// ─────────────────────────────────────────────────────────────────────────────
// ERP Service Layer — operações específicas do módulo ERP
//
// Entidades compartilhadas (Cliente, Fornecedor, Produto, Atividade) vivem em
// src/lib/entities.ts e são re-exportadas aqui para compatibilidade.
// ─────────────────────────────────────────────────────────────────────────────
import { getFilialDb } from './supabase';
import { getFilialId } from './tenant';

// ── Re-exports de entidades centrais ─────────────────────────────────────────
export type {
  Cliente   as ErpCliente,
  Fornecedor as ErpFornecedor,
  GrupoProduto as ErpGrupoProduto,
  Produto   as ErpProduto,
  Atividade as ErpAtividade,
} from './entities';

export {
  getClientes, createCliente, updateCliente, deleteCliente,
  getFornecedores, createFornecedor, updateFornecedor, deleteFornecedor,
  getGruposProdutos, createGrupoProduto, updateGrupoProduto, deleteGrupoProduto,
  getProdutos, createProduto, updateProduto, deleteProduto,
  getAtividades, createAtividade, updateAtividadeStatus,
  consultarCNPJ, consultarCEP,
} from './entities';

// ── Helper de tenant — usa filial selecionada ─────────────────────────────────
function db() { return getFilialDb(); }
function tid() { return getFilialId(); }

// ── Tipos ERP-específicos ─────────────────────────────────────────────────────

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

export interface ErpCondicaoPagamento {
  id: string;
  descricao: string;
  parcelas_json: Array<{ dias: number; percentual: number }>;
  ativo: boolean;
  tenant_id: string;
  created_at: string;
}

export interface ErpNaturezaOperacao {
  id: string;
  codigo: string;
  descricao: string;
  cfop_padrao: string;
  ativo: boolean;
  tenant_id: string;
  created_at: string;
}

export interface ErpDeposito {
  id: string;
  nome: string;
  empresa_id: string | null;
  ativo: boolean;
  tenant_id: string;
  created_at: string;
}

export interface ErpEmployeeSimple {
  id: string;
  full_name: string;
  position_title: string | null;
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
  // Condição de pagamento
  condicao_pagamento: string | null;
  condicao_pagamento_id: string | null;
  // Natureza de operação
  natureza_operacao_id: string | null;
  natureza_operacao_texto: string | null;
  // Depósito
  deposito_id: string | null;
  deposito_texto: string | null;
  // Tabela de preço / pedido vinculado
  tabela_preco: string | null;
  pedido_compra: string | null;
  // Totais e descontos
  desconto_global_pct: number;
  desconto_global_valor: number | null;
  acrescimo_valor: number | null;
  frete_valor: number;
  total_produtos: number;
  total_ipi: number | null;
  total_pedido: number;
  // Transporte
  modalidade_frete: string | null;
  transportadora_nome: string | null;
  transportadora_cnpj: string | null;
  placa_veiculo: string | null;
  peso_bruto: number | null;
  peso_liquido: number | null;
  volumes: number | null;
  especie_volume: string | null;
  // Agentes
  vendedor_auxiliar: string | null;
  comissao_auxiliar_pct: number | null;
  centro_custo: string | null;
  projeto: string | null;
  // NF-e
  modelo_nfe: string | null;
  serie_nfe: string | null;
  ambiente_nfe: string | null;
  finalidade_nfe: string | null;
  consumidor_final: string | null;
  // Endereço de entrega
  end_entrega_igual_cliente: boolean | null;
  end_entrega_json: Record<string, string> | null;
  // Observações
  obs_nfe: string | null;
  obs_interna: string | null;
  inf_complementares: string | null;
  observacoes: string | null;
  tenant_id: string;
  created_at: string;
  erp_clientes?: { nome: string; cpf_cnpj: string; endereco_json?: Record<string, string> } | null;
}

export interface ErpPedidoItem {
  id: string;
  pedido_id: string;
  produto_id: string;
  descricao_item: string | null;
  quantidade: number;
  unidade_medida: string | null;
  preco_unitario: number;
  desconto_item_pct: number;
  total_item: number;
  ipi_pct: number | null;
  ipi_valor: number | null;
  cfop: string | null;
  ncm: string | null;
  cst_icms: string | null;
  tenant_id: string;
  erp_produtos?: { nome: string; unidade_medida: string; codigo_interno: string; ncm: string | null; cst_icms: string | null } | null;
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
  numero_documento: string | null;
  forma_pagamento: 'PIX' | 'BOLETO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'DINHEIRO' | 'TED' | 'DOC' | 'CHEQUE' | null;
  parcela_numero: number | null;
  parcela_total: number | null;
  desconto_aplicado: number;
  juros_multa: number;
  valor_pago: number | null;
  observacoes: string | null;
  grupo_lancamento_id: string | null;
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

// ── Empresas / Configurações ──────────────────────────────────────────────────

export async function getEmpresas(): Promise<ErpEmpresa[]> {
  const { data, error } = await db().from('erp_empresas').select('*').eq('ativo', true).order('nome_fantasia');
  if (error) throw error;
  return data ?? [];
}

export async function getCondicoesPagamento(): Promise<ErpCondicaoPagamento[]> {
  const { data, error } = await db().from('erp_condicoes_pagamento').select('*').eq('ativo', true).order('descricao');
  if (error) throw error;
  return data ?? [];
}

export async function getNaturezasOperacao(): Promise<ErpNaturezaOperacao[]> {
  const { data, error } = await db().from('erp_naturezas_operacao').select('*').eq('ativo', true).order('descricao');
  if (error) throw error;
  return data ?? [];
}

export async function getDepositos(empresaId?: string): Promise<ErpDeposito[]> {
  let q = db().from('erp_depositos').select('*').eq('ativo', true).order('nome');
  if (empresaId) q = q.eq('empresa_id', empresaId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getEmployeesSimple(): Promise<ErpEmployeeSimple[]> {
  const { data, error } = await db().from('employees').select('id, full_name, position_title').eq('status', 'active').order('full_name');
  if (error) throw error;
  return (data ?? []) as ErpEmployeeSimple[];
}

export async function updatePedido(id: string, payload: Partial<Omit<ErpPedido, 'id' | 'numero' | 'tenant_id' | 'created_at' | 'erp_clientes'>>): Promise<ErpPedido> {
  const { data, error } = await db().from('erp_pedidos').update(payload).eq('id', id).select('*, erp_clientes(nome, cpf_cnpj, endereco_json)').single();
  if (error) throw error;
  return data;
}

// ── Estoque ───────────────────────────────────────────────────────────────────

export async function getMovimentos(produtoId?: string): Promise<ErpMovimento[]> {
  let q = db().from('erp_estoque_movimentos')
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
  const tenant_id = tid();
  const usuario_id = tenant_id;
  const { data, error } = await db().from('erp_estoque_movimentos')
    .insert({ ...payload, usuario_id, tenant_id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Pedidos ───────────────────────────────────────────────────────────────────

export async function getPedidos(tipo?: string, status?: string): Promise<ErpPedido[]> {
  let q = db().from('erp_pedidos')
    .select('*, erp_clientes(nome, cpf_cnpj, endereco_json)')
    .order('created_at', { ascending: false });
  if (tipo) q = q.eq('tipo', tipo);
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getPedidoItens(pedidoId: string): Promise<ErpPedidoItem[]> {
  const { data, error } = await db().from('erp_pedidos_itens')
    .select('*, erp_produtos(nome, unidade_medida, codigo_interno, ncm, cst_icms)')
    .eq('pedido_id', pedidoId);
  if (error) throw error;
  return data ?? [];
}

export async function createPedido(
  pedido: Omit<ErpPedido, 'id' | 'numero' | 'tenant_id' | 'created_at' | 'erp_clientes'>,
  itens: Omit<ErpPedidoItem, 'id' | 'pedido_id' | 'tenant_id' | 'erp_produtos'>[]
): Promise<ErpPedido> {
  const tenant_id = tid();
  const { data: pedidoData, error: pedidoError } = await db()
    .from('erp_pedidos')
    .insert({ ...pedido, tenant_id })
    .select()
    .single();
  if (pedidoError) throw pedidoError;
  if (itens.length > 0) {
    const { error: itensError } = await db().from('erp_pedidos_itens').insert(
      itens.map(item => ({ ...item, pedido_id: pedidoData.id, tenant_id }))
    );
    if (itensError) throw itensError;
  }
  return pedidoData;
}

export async function updatePedidoStatus(id: string, status: ErpPedido['status']): Promise<void> {
  const { error } = await db().from('erp_pedidos').update({ status }).eq('id', id);
  if (error) throw error;
}

// ── Atendimentos ──────────────────────────────────────────────────────────────

export async function getAtendimentos(tipo?: string): Promise<ErpAtendimento[]> {
  let q = db().from('erp_atendimentos')
    .select('*, erp_clientes(nome)')
    .order('created_at', { ascending: false });
  if (tipo) q = q.eq('tipo', tipo);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function createAtendimento(payload: Omit<ErpAtendimento, 'id' | 'numero' | 'tenant_id' | 'created_at' | 'erp_clientes'>): Promise<ErpAtendimento> {
  const tenant_id = tid();
  const { data, error } = await db().from('erp_atendimentos').insert({ ...payload, tenant_id }).select().single();
  if (error) throw error;
  return data;
}

export async function updateAtendimento(id: string, payload: Partial<ErpAtendimento>): Promise<ErpAtendimento> {
  const { data, error } = await db().from('erp_atendimentos').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

// ── Lançamentos Financeiros ───────────────────────────────────────────────────

export async function getLancamentos(tipo?: 'RECEITA' | 'DESPESA'): Promise<ErpLancamento[]> {
  let q = db().from('erp_financeiro_lancamentos')
    .select('*')
    .order('data_vencimento', { ascending: false });
  if (tipo) q = q.eq('tipo', tipo);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function createLancamento(payload: Omit<ErpLancamento, 'id' | 'tenant_id' | 'created_at'>): Promise<ErpLancamento> {
  const tenant_id = tid();
  const { data, error } = await db().from('erp_financeiro_lancamentos').insert({ ...payload, tenant_id }).select().single();
  if (error) throw error;
  return data;
}

export async function pagarLancamento(id: string, data_pagamento: string, conta_bancaria_id?: string): Promise<void> {
  const update: Record<string, unknown> = { status: 'PAGO', data_pagamento };
  if (conta_bancaria_id) update.conta_bancaria_id = conta_bancaria_id;
  const { error } = await db().from('erp_financeiro_lancamentos').update(update).eq('id', id);
  if (error) throw error;
}

export interface BaixaPayload {
  data_pagamento: string;
  valor_pago: number;
  forma_pagamento: ErpLancamento['forma_pagamento'];
  conta_bancaria_id: string | null;
  numero_documento: string;
  desconto_aplicado: number;
  juros_multa: number;
  observacoes: string;
}

export async function baixarLancamento(id: string, payload: BaixaPayload): Promise<void> {
  const { error } = await db().from('erp_financeiro_lancamentos').update({
    status: 'PAGO',
    data_pagamento: payload.data_pagamento,
    valor_pago: payload.valor_pago,
    forma_pagamento: payload.forma_pagamento,
    conta_bancaria_id: payload.conta_bancaria_id,
    numero_documento: payload.numero_documento || null,
    desconto_aplicado: payload.desconto_aplicado,
    juros_multa: payload.juros_multa,
    observacoes: payload.observacoes || null,
  }).eq('id', id);
  if (error) throw error;
}

export async function cancelarLancamento(id: string, observacoes: string): Promise<void> {
  const { error } = await db().from('erp_financeiro_lancamentos').update({
    status: 'CANCELADO',
    observacoes,
  }).eq('id', id);
  if (error) throw error;
}

export async function parcelarLancamento(
  original: ErpLancamento,
  parcelas: Array<{ valor: number; data_vencimento: string }>
): Promise<void> {
  const tenant_id = tid();
  const grupo_lancamento_id = crypto.randomUUID();
  const novos = parcelas.map((p, i) => ({
    tipo: original.tipo,
    categoria: original.categoria,
    descricao: `${original.descricao} — Parcela ${i + 1}/${parcelas.length}`,
    valor: p.valor,
    data_vencimento: p.data_vencimento,
    data_pagamento: null,
    status: 'PENDENTE' as const,
    nfe_id: original.nfe_id,
    pedido_id: original.pedido_id,
    conta_bancaria_id: original.conta_bancaria_id,
    parcela_numero: i + 1,
    parcela_total: parcelas.length,
    grupo_lancamento_id,
    tenant_id,
  }));
  const { error: errCancel } = await db().from('erp_financeiro_lancamentos')
    .update({ status: 'CANCELADO', observacoes: `Substituído por parcelamento ${grupo_lancamento_id}` })
    .eq('id', original.id);
  if (errCancel) throw errCancel;
  const { error: errInsert } = await db().from('erp_financeiro_lancamentos').insert(novos);
  if (errInsert) throw errInsert;
}

// ── Contas Bancárias ──────────────────────────────────────────────────────────

export async function getContasBancarias(): Promise<ErpContaBancaria[]> {
  const { data, error } = await db().from('erp_contas_bancarias').select('*').order('nome');
  if (error) throw error;
  return data ?? [];
}

export async function createContaBancaria(payload: Omit<ErpContaBancaria, 'id' | 'tenant_id' | 'created_at' | 'saldo_atual'>): Promise<ErpContaBancaria> {
  const tenant_id = tid();
  const { data, error } = await db().from('erp_contas_bancarias').insert({ ...payload, tenant_id, saldo_atual: 0 }).select().single();
  if (error) throw error;
  return data;
}

// ── Projetos ──────────────────────────────────────────────────────────────────

export async function getProjetos(): Promise<ErpProjeto[]> {
  const { data, error } = await db().from('erp_projetos')
    .select('*, erp_grupos_projetos(nome, cor_hex)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createProjeto(payload: Omit<ErpProjeto, 'id' | 'tenant_id' | 'created_at' | 'orcamento_realizado' | 'erp_grupos_projetos'>): Promise<ErpProjeto> {
  const tenant_id = tid();
  const { data, error } = await db().from('erp_projetos')
    .insert({ ...payload, tenant_id, orcamento_realizado: 0 })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProjeto(id: string, payload: Partial<ErpProjeto>): Promise<ErpProjeto> {
  const { data, error } = await db().from('erp_projetos').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function getGruposProjetos(): Promise<ErpGrupoProjeto[]> {
  const { data, error } = await db().from('erp_grupos_projetos').select('*').order('nome');
  if (error) throw error;
  return data ?? [];
}

export async function createGrupoProjeto(payload: Omit<ErpGrupoProjeto, 'id' | 'tenant_id' | 'created_at'>): Promise<ErpGrupoProjeto> {
  const tenant_id = tid();
  const { data, error } = await db().from('erp_grupos_projetos').insert({ ...payload, tenant_id }).select().single();
  if (error) throw error;
  return data;
}
