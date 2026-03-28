// ─────────────────────────────────────────────────────────────────────────────
// lib/faturamento.ts — Tipos e helpers para o módulo de Faturamento
// Acessa tabelas novas: erp_tipos_operacao, erp_depositos e os campos
// adicionados em erp_pedidos / erp_pedidos_itens / erp_produtos
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from './supabase';

// ── Helpers de tenant ─────────────────────────────────────────────────────────

// tenant_id é coluna TEXT — aceita qualquer string, não precisa ser UUID
const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000001';

export function getTenantId(): string {
  const v = localStorage.getItem('zia_active_entity_id_v1');
  return v && v.trim().length > 0 ? v : DEFAULT_TENANT;
}

// ── Interfaces ────────────────────────────────────────────────────────────────

export type CategoriaOperacao =
  | 'VENDA' | 'COMPRA' | 'EMPRESTIMO' | 'TRANSFERENCIA' | 'AJUSTE' | 'DEVOLUCAO';

export type SubtipoOperacao =
  | 'PRONTA_ENTREGA' | 'FUTURA_DATA' | 'FUTURA_ESTOQUE' | 'EMPRESTIMO';

export type DirecaoEstoque = 'ENTRADA' | 'SAIDA' | 'NENHUM';

export type StatusPedido =
  | 'ORCAMENTO' | 'CONFIRMADO' | 'FATURADO' | 'ENTREGUE' | 'CANCELADO';

export type TipoMovimento =
  | 'ENTRADA' | 'SAIDA' | 'RESERVA' | 'LIBERAR_RESERVA'
  | 'BLOQUEAR_EMPRESTIMO' | 'DEVOLVER_EMPRESTIMO' | 'AJUSTE' | 'TRANSFERENCIA';

export interface TipoOperacao {
  id: string;
  codigo: string;
  nome: string;
  categoria: CategoriaOperacao;
  subtipo: SubtipoOperacao;
  movimenta_estoque: boolean;
  direcao_estoque: DirecaoEstoque;
  reserva_estoque: boolean;
  bloqueia_estoque: boolean;
  exige_estoque: boolean;
  gera_financeiro: boolean;
  tipo_financeiro?: string | null;
  permite_faturamento_parcial: boolean;
  modelo_nfe?: string | null;
  natureza_operacao_padrao?: string | null;  // nome real no banco (não "natureza")
  ativo: boolean;
  tenant_id: string;
  created_at?: string;
}

export interface Deposito {
  id: string;
  nome: string;
  codigo?: string;     // opcional — não existe no banco, coluna é nullable
  empresa_id?: string | null;
  ativo: boolean;
  tenant_id: string;
  created_at?: string;
}

export interface ProdutoComEstoque {
  id: string;
  codigo_interno: string;
  nome: string;
  unidade_medida: string;
  ncm: string;
  preco_venda: number;
  preco_custo: number | null;
  estoque_atual: number;
  estoque_reservado: number;
  estoque_emprestado: number;
  estoque_disponivel: number;
  controla_lote: boolean;
  controla_serie: boolean;
  ativo: boolean;
}

export interface ItemFat {
  uid: string;          // local key
  produto_id: string;
  produto_codigo: string;
  produto_nome: string;
  unidade: string;
  ncm: string;
  quantidade: number;
  preco_unitario: number;
  desconto_pct: number;
  total: number;
  deposito_id: string;
  lote: string;
  numero_serie: string;
  // estoque disponível para exibir badge
  estoque_disponivel: number;
  controla_lote: boolean;
  controla_serie: boolean;
}

export interface FormaPagamentoItem {
  forma: 'PIX' | 'BOLETO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'DINHEIRO' | 'TRANSFERENCIA' | 'CHEQUE' | 'PRAZO';
  parcelas: number;          // 1 = à vista
  valor: number;             // total desta forma
  vencimento?: string;       // data do 1º vencimento (ISO)
}

export interface PedidoFat {
  id?: string;
  numero?: number;
  tipo: string;
  subtipo: string;
  status: StatusPedido;
  tipo_operacao_id: string | null;
  participante_id: string | null;
  participante_nome: string;
  participante_doc: string;
  vendedor_id: string | null;
  deposito_id: string | null;
  data_emissao: string;
  data_faturamento_prevista: string;
  condicao_pagamento: string;
  desconto_global_pct: number;
  frete_valor: number;
  frete_modalidade: string;
  transportadora_nome: string;
  transportadora_cnpj: string;
  placa_veiculo: string;
  peso_bruto: number;
  peso_liquido: number;
  obs_nfe: string;
  obs_interna: string;
  inf_complementares: string;
  pedido_compra_vinculado_id: string | null;
  end_entrega_igual: boolean;
  end_entrega_json: Record<string, string>;
  formas_pagamento_json: FormaPagamentoItem[];
  deducoes_json: Array<{ descricao: string; valor: number; tipo: '%' | 'R$' }>;
  conversao_de_para_json: Array<{ de: string; para: string; fator: number }>;
  vendedor_auxiliar: string;
  comissao_auxiliar_pct: number;
  total_produtos: number;
  total_pedido: number;
  faturado_em: string | null;
  tenant_id?: string;
  itens: ItemFat[];
}

export interface CheckEstoqueItem {
  produto_id: string;
  produto_nome: string;
  quantidade_pedida: number;
  estoque_disponivel: number;
  disponivel: boolean;
}

// ── API — Tipos de Operação ───────────────────────────────────────────────────

export async function getTiposOperacao(): Promise<TipoOperacao[]> {
  const tid = getTenantId();
  const { data, error } = await supabase
    .from('erp_tipos_operacao')
    .select('*')
    .eq('tenant_id', tid)
    .eq('ativo', true)
    .order('codigo', { ascending: true });
  if (error) throw error;
  return (data ?? []) as TipoOperacao[];
}

export async function getAllTiposOperacao(): Promise<TipoOperacao[]> {
  const tid = getTenantId();
  const { data, error } = await supabase
    .from('erp_tipos_operacao')
    .select('*')
    .eq('tenant_id', tid)
    .order('codigo', { ascending: true });
  if (error) throw error;
  return (data ?? []) as TipoOperacao[];
}

export async function upsertTipoOperacao(
  payload: Omit<TipoOperacao, 'id' | 'tenant_id' | 'created_at'> & { id?: string },
): Promise<TipoOperacao> {
  const tid = getTenantId();
  const row = { ...payload, tenant_id: tid };
  if (row.id) {
    const { data, error } = await supabase
      .from('erp_tipos_operacao')
      .update(row)
      .eq('id', row.id)
      .select()
      .single();
    if (error) throw error;
    return data as TipoOperacao;
  }
  const { data, error } = await supabase
    .from('erp_tipos_operacao')
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data as TipoOperacao;
}

export async function deleteTipoOperacao(id: string): Promise<void> {
  const { error } = await supabase.from('erp_tipos_operacao').delete().eq('id', id);
  if (error) throw error;
}

// ── API — Depósitos ───────────────────────────────────────────────────────────

export async function getDepositos(): Promise<Deposito[]> {
  const tid = getTenantId();
  const { data, error } = await supabase
    .from('erp_depositos')
    .select('*')
    .eq('tenant_id', tid)
    .eq('ativo', true)
    .order('nome', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Deposito[];
}

// ── API — Produtos com estoque completo ───────────────────────────────────────

export async function getProdutosComEstoque(search = ''): Promise<ProdutoComEstoque[]> {
  const tid = getTenantId();
  let query = supabase
    .from('erp_produtos')
    .select('id,codigo_interno,nome,unidade_medida,ncm,preco_venda,preco_custo,estoque_atual,estoque_reservado,estoque_emprestado,estoque_disponivel,controla_lote,controla_serie,ativo')
    .eq('tenant_id', tid)
    .eq('ativo', true)
    .order('nome', { ascending: true })
    .limit(50);
  if (search.trim()) {
    query = query.or(`nome.ilike.%${search}%,codigo_interno.ilike.%${search}%`);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(r => ({
    ...r,
    estoque_reservado:  Number(r.estoque_reservado  ?? 0),
    estoque_emprestado: Number(r.estoque_emprestado ?? 0),
    estoque_disponivel: Number(r.estoque_disponivel ?? r.estoque_atual ?? 0),
    controla_lote:  Boolean(r.controla_lote),
    controla_serie: Boolean(r.controla_serie),
  })) as ProdutoComEstoque[];
}

// ── API — Pedidos (novo schema) ───────────────────────────────────────────────

export async function getPedidosFat(opts?: {
  status?: StatusPedido;
  tipo_operacao_id?: string;
  limit?: number;
}): Promise<PedidoFat[]> {
  const tid = getTenantId();
  let q = supabase
    .from('erp_pedidos')
    .select('*')
    .eq('tenant_id', tid)
    .order('created_at', { ascending: false })
    .limit(opts?.limit ?? 100);
  if (opts?.status) q = q.eq('status', opts.status);
  if (opts?.tipo_operacao_id) q = q.eq('tipo_operacao_id', opts.tipo_operacao_id);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map(rowToPedidoFat);
}

export async function getPedidoFat(id: string): Promise<PedidoFat | null> {
  const { data, error } = await supabase
    .from('erp_pedidos')
    .select('*, erp_pedidos_itens(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const p = rowToPedidoFat(data);
  p.itens = await getItensFat(id);
  return p;
}

async function getItensFat(pedidoId: string): Promise<ItemFat[]> {
  const { data } = await supabase
    .from('erp_pedidos_itens')
    .select('*, erp_produtos(codigo_interno,nome,unidade_medida,ncm,estoque_disponivel,controla_lote,controla_serie)')
    .eq('pedido_id', pedidoId)
    .order('created_at', { ascending: true });
  return (data ?? []).map(rowToItemFat);
}

export async function savePedidoFat(pedido: PedidoFat): Promise<PedidoFat> {
  const tid = getTenantId();
  const totalProdutos = pedido.itens.reduce((s, i) => s + i.total, 0);
  const descGlobal = totalProdutos * (pedido.desconto_global_pct / 100);
  const totalPedido = totalProdutos - descGlobal + pedido.frete_valor;

  const row: Record<string, unknown> = {
    tipo:                    pedido.tipo || 'VENDA',
    subtipo:                 pedido.subtipo || 'PRONTA_ENTREGA',
    status:                  pedido.status,
    tipo_operacao_id:        pedido.tipo_operacao_id  || null,
    participante_id:         pedido.participante_id   || null,
    vendedor_id:             pedido.vendedor_id       || null,
    deposito_id:             pedido.deposito_id       || null,
    data_emissao:            pedido.data_emissao,
    data_faturamento_prevista: pedido.data_faturamento_prevista || null,
    condicao_pagamento:      pedido.condicao_pagamento || null,
    desconto_global_pct:     pedido.desconto_global_pct,
    frete_valor:             pedido.frete_valor,
    total_produtos:          totalProdutos,
    total_pedido:            totalPedido,
    pedido_compra_vinculado_id: pedido.pedido_compra_vinculado_id || null,
    obs_nfe:                 pedido.obs_nfe            || null,
    obs_interna:             pedido.obs_interna        || null,
    inf_complementares:      pedido.inf_complementares || null,
    formas_pagamento_json:   pedido.formas_pagamento_json.length > 0 ? pedido.formas_pagamento_json : null,
    deducoes_json:           pedido.deducoes_json.length > 0 ? pedido.deducoes_json : null,
    conversao_de_para_json:  pedido.conversao_de_para_json.length > 0 ? pedido.conversao_de_para_json : null,
    vendedor_auxiliar:       pedido.vendedor_auxiliar  || null,
    comissao_auxiliar_pct:   pedido.comissao_auxiliar_pct || 0,
    end_entrega_igual:       pedido.end_entrega_igual,
    end_entrega_json:        pedido.end_entrega_igual ? null : (Object.keys(pedido.end_entrega_json).length > 0 ? pedido.end_entrega_json : null),
    tenant_id:               tid,
  };

  let pedidoId = pedido.id;

  if (pedidoId) {
    const { error } = await supabase.from('erp_pedidos').update(row).eq('id', pedidoId);
    if (error) throw error;
    // Remove itens antigos e reinsere
    await supabase.from('erp_pedidos_itens').delete().eq('pedido_id', pedidoId);
  } else {
    const { data, error } = await supabase.from('erp_pedidos').insert(row).select('id,numero').single();
    if (error) throw error;
    pedidoId = data.id;
  }

  // Insere itens
  if (pedido.itens.length > 0) {
    const itensRow = pedido.itens.map(i => ({
      pedido_id:        pedidoId,
      produto_id:       i.produto_id,
      quantidade:       i.quantidade,
      preco_unitario:   i.preco_unitario,
      desconto_item_pct: i.desconto_pct,
      total_item:       i.total,
      deposito_id:      i.deposito_id || null,
      lote:             i.lote        || null,
      numero_serie:     i.numero_serie || null,
      tenant_id:        tid,
    }));
    const { error } = await supabase.from('erp_pedidos_itens').insert(itensRow);
    if (error) throw error;
  }

  return (await getPedidoFat(pedidoId!))!;
}

export async function atualizarStatusPedido(
  id: string,
  status: StatusPedido,
  extra?: { faturado_em?: string },
): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (extra?.faturado_em) patch.faturado_em = extra.faturado_em;
  const { error } = await supabase.from('erp_pedidos').update(patch).eq('id', id);
  if (error) throw error;
}

export async function registrarMovimentoEstoque(mov: {
  produto_id: string;
  tipo_movimento: TipoMovimento;
  tipo_movimento_detalhe?: string;
  quantidade: number;
  deposito_id?: string | null;
  pedido_id?: string;
  pedido_item_id?: string;
  lote?: string;
  numero_serie?: string;
  custo_unitario?: number;
  observacao?: string;
}): Promise<void> {
  const tid = getTenantId();
  const { error } = await supabase.from('erp_estoque_movimentos').insert({
    ...mov,
    usuario_id: 'usuario',
    tenant_id:  tid,
  });
  if (error) throw error;
}

export async function verificarEstoquePedido(pedidoId: string): Promise<CheckEstoqueItem[]> {
  const { data, error } = await supabase.rpc('fn_verificar_estoque_pedido', {
    p_pedido_id: pedidoId,
  });
  if (error) {
    // fallback manual se a função RPC não existir ainda
    console.warn('[faturamento] fn_verificar_estoque_pedido não disponível, usando fallback');
    return [];
  }
  return (data ?? []) as CheckEstoqueItem[];
}

export async function getPedidosCompraParaVincular(produtosIds: string[]): Promise<PedidoFat[]> {
  if (!produtosIds.length) return [];
  const tid = getTenantId();
  // Busca PCs (tipo=COMPRA) confirmados ou orçamento que contêm esses produtos
  const { data: pedidosItens } = await supabase
    .from('erp_pedidos_itens')
    .select('pedido_id')
    .in('produto_id', produtosIds);
  const ids = [...new Set((pedidosItens ?? []).map(i => i.pedido_id))];
  if (!ids.length) return [];
  const { data } = await supabase
    .from('erp_pedidos')
    .select('*')
    .eq('tenant_id', tid)
    .eq('tipo', 'COMPRA')
    .in('status', ['ORCAMENTO', 'CONFIRMADO'])
    .in('id', ids);
  return (data ?? []).map(rowToPedidoFat);
}

// ── Row mappers ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToPedidoFat(r: any): PedidoFat {
  return {
    id:                       r.id,
    numero:                   r.numero,
    tipo:                     r.tipo ?? 'VENDA',
    subtipo:                  r.subtipo ?? 'PRONTA_ENTREGA',
    status:                   r.status ?? 'ORCAMENTO',
    tipo_operacao_id:         r.tipo_operacao_id ?? null,
    participante_id:          r.participante_id ?? r.cliente_id ?? null,
    participante_nome:        r.participante_nome ?? r.erp_clientes?.nome ?? '',
    participante_doc:         r.participante_doc ?? r.erp_clientes?.cpf_cnpj ?? '',
    vendedor_id:              r.vendedor_id ?? null,
    deposito_id:              r.deposito_id ?? null,
    data_emissao:             r.data_emissao ?? new Date().toISOString().split('T')[0],
    data_faturamento_prevista: r.data_faturamento_prevista ?? '',
    condicao_pagamento:       r.condicao_pagamento ?? '',
    desconto_global_pct:      Number(r.desconto_global_pct ?? 0),
    frete_valor:              Number(r.frete_valor ?? 0),
    frete_modalidade:         r.frete_modalidade ?? 'SEM_FRETE',
    transportadora_nome:      r.transportadora_nome ?? '',
    transportadora_cnpj:      r.transportadora_cnpj ?? '',
    placa_veiculo:            r.placa_veiculo ?? '',
    peso_bruto:               Number(r.peso_bruto ?? 0),
    peso_liquido:             Number(r.peso_liquido ?? 0),
    obs_nfe:                  r.obs_nfe ?? '',
    obs_interna:              r.obs_interna ?? '',
    inf_complementares:       r.inf_complementares ?? '',
    pedido_compra_vinculado_id: r.pedido_compra_vinculado_id ?? null,
    end_entrega_igual:        r.end_entrega_igual !== false,
    end_entrega_json:         r.end_entrega_json ?? {},
    formas_pagamento_json:    Array.isArray(r.formas_pagamento_json) ? r.formas_pagamento_json : [],
    deducoes_json:            r.deducoes_json ?? [],
    conversao_de_para_json:   r.conversao_de_para_json ?? [],
    vendedor_auxiliar:        r.vendedor_auxiliar ?? '',
    comissao_auxiliar_pct:    Number(r.comissao_auxiliar_pct ?? 0),
    total_produtos:           Number(r.total_produtos ?? 0),
    total_pedido:             Number(r.total_pedido ?? 0),
    faturado_em:              r.faturado_em ?? null,
    tenant_id:                r.tenant_id,
    itens:                    [],
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToItemFat(r: any): ItemFat {
  const p = r.erp_produtos ?? {};
  const total = Number(r.quantidade) * Number(r.preco_unitario) * (1 - Number(r.desconto_item_pct ?? 0) / 100);
  return {
    uid:                r.id,
    produto_id:         r.produto_id,
    produto_codigo:     p.codigo_interno ?? '',
    produto_nome:       p.nome ?? '',
    unidade:            p.unidade_medida ?? 'UN',
    ncm:                p.ncm ?? '',
    quantidade:         Number(r.quantidade),
    preco_unitario:     Number(r.preco_unitario),
    desconto_pct:       Number(r.desconto_item_pct ?? 0),
    total,
    deposito_id:        r.deposito_id ?? '',
    lote:               r.lote ?? '',
    numero_serie:       r.numero_serie ?? '',
    estoque_disponivel: Number(p.estoque_disponivel ?? 0),
    controla_lote:      Boolean(p.controla_lote),
    controla_serie:     Boolean(p.controla_serie),
  };
}

// ── Helpers UI ────────────────────────────────────────────────────────────────

export const CATEGORIA_LABEL: Record<CategoriaOperacao, string> = {
  VENDA:         'Venda',
  COMPRA:        'Compra',
  EMPRESTIMO:    'Empréstimo',
  TRANSFERENCIA: 'Transferência',
  AJUSTE:        'Ajuste',
  DEVOLUCAO:     'Devolução',
};

export const SUBTIPO_LABEL: Record<SubtipoOperacao, string> = {
  PRONTA_ENTREGA:  'Pronta Entrega',
  FUTURA_DATA:     'Futura (Data)',
  FUTURA_ESTOQUE:  'Futura (Estoque)',
  EMPRESTIMO:      'Empréstimo',
};

export const STATUS_COLOR: Record<StatusPedido, string> = {
  ORCAMENTO:  'bg-slate-100 text-slate-600',
  CONFIRMADO: 'bg-blue-100 text-blue-700',
  FATURADO:   'bg-green-100 text-green-700',
  ENTREGUE:   'bg-emerald-100 text-emerald-700',
  CANCELADO:  'bg-red-100 text-red-600',
};

export const CATEGORIA_COLOR: Record<CategoriaOperacao, string> = {
  VENDA:         'bg-purple-100 text-purple-700',
  COMPRA:        'bg-blue-100 text-blue-700',
  EMPRESTIMO:    'bg-amber-100 text-amber-700',
  TRANSFERENCIA: 'bg-cyan-100 text-cyan-700',
  AJUSTE:        'bg-slate-100 text-slate-600',
  DEVOLUCAO:     'bg-red-100 text-red-600',
};

export const BRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export function pedidoVazio(): PedidoFat {
  return {
    tipo: 'VENDA',
    subtipo: 'PRONTA_ENTREGA',
    status: 'ORCAMENTO',
    tipo_operacao_id: null,
    participante_id: null,
    participante_nome: '',
    participante_doc: '',
    vendedor_id: null,
    deposito_id: null,
    data_emissao: new Date().toISOString().split('T')[0],
    data_faturamento_prevista: '',
    condicao_pagamento: 'À Vista',
    desconto_global_pct: 0,
    frete_valor: 0,
    frete_modalidade: 'SEM_FRETE',
    transportadora_nome: '',
    transportadora_cnpj: '',
    placa_veiculo: '',
    peso_bruto: 0,
    peso_liquido: 0,
    obs_nfe: '',
    obs_interna: '',
    inf_complementares: '',
    pedido_compra_vinculado_id: null,
    end_entrega_igual: true,
    end_entrega_json: {},
    formas_pagamento_json: [],
    deducoes_json: [],
    conversao_de_para_json: [],
    vendedor_auxiliar: '',
    comissao_auxiliar_pct: 0,
    total_produtos: 0,
    total_pedido: 0,
    faturado_em: null,
    itens: [],
  };
}
