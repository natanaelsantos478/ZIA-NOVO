// ─────────────────────────────────────────────────────────────────────────────
// financeiro.ts — Data layer Supabase para o módulo ERP/Financeiro
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from './supabase';

// ── Helper — mesmo padrão de erp.ts ──────────────────────────────────────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000001';

function getTenantId(): string {
  const v = localStorage.getItem('zia_active_entity_id_v1');
  return v && UUID_RE.test(v) ? v : DEFAULT_TENANT;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FinNoCusto {
  id: string;
  tenant_id: string;
  nome: string;
  descricao?: string | null;
  icone?: string;
  cor_display?: string;
  tipo_no: 'CUSTO_FOLHA' | 'CUSTO_AGREGADOR' | 'CUSTO_CONDICIONAL' | 'CUSTO_MULTIPLICADOR' | 'CUSTO_DISTRIBUIDOR';
  estrutura_valor: Record<string, unknown>;
  gatilho: Record<string, unknown>;
  escopo: 'EMPRESA' | 'PRODUTO' | 'GRUPO_PRODUTO' | 'GRUPO_CUSTO' | 'FAIXA_PRECO';
  produto_id?: string | null;
  grupo_produto_id?: string | null;
  grupo_custo_id?: string | null;
  faixa_preco_min?: number | null;
  faixa_preco_max?: number | null;
  config_rateio?: Record<string, unknown> | null;
  posicao_canvas?: { x: number; y: number } | null;
  ordem_calculo?: number;
  ativo: boolean;
  created_at?: string;
}

export interface FinArestaCusto {
  id: string;
  tenant_id: string;
  no_pai_id: string;
  no_filho_id: string;
  tipo_relacao: 'SOMA' | 'SUBTRAI' | 'SUBSTITUI' | 'MULTIPLICA_POR' | 'DIVIDE_POR' | 'ATIVA_SE' | 'MODIFICA_FAIXA';
  condicao_aresta?: Record<string, unknown> | null;
  prioridade?: number;
  fator?: number | null;
  ativo?: boolean;
  created_at?: string;
}

export interface FinGrupoCusto {
  id: string;
  tenant_id: string;
  nome: string;
  descricao?: string | null;
  cor?: string;
  criterio: 'MANUAL' | 'GRUPO_PRODUTO_ERP' | 'FAIXA_PRECO' | 'IS_SUBSCRIPTION' | 'TODOS_PRODUTOS';
  criterio_params?: Record<string, unknown> | null;
  ativo?: boolean;
  created_at?: string;
}

export interface FinImposto {
  id: string;
  tenant_id: string;
  nome: string;
  sigla: string;
  regime_tributario?: string | null;
  base_calculo?: 'RECEITA_BRUTA' | 'LUCRO_LIQUIDO' | 'FOLHA_PAGAMENTO';
  competencia?: 'MENSAL' | 'TRIMESTRAL' | 'ANUAL';
  tipo_calculo: 'ALIQUOTA_FIXA' | 'ALIQUOTA_PROGRESSIVA' | 'VALOR_FIXO_MENSAL' | 'VINCULADO_NO_CUSTO';
  aliquota_pct?: number | null;
  valor_fixo?: number | null;
  faixas_progressivas?: { receita_min: number; receita_max: number | null; aliquota: number; deducao: number }[] | null;
  no_custo_id?: string | null;
  ativo: boolean;
  created_at?: string;
}

export interface FinSnapshotCusto {
  id?: string;
  tenant_id: string;
  ano: number;
  mes: number;
  contexto_calculo?: Record<string, unknown> | null;
  resultado_arvore?: Record<string, unknown> | null;
  receita_bruta?: number | null;
  total_custos?: number | null;
  total_impostos?: number | null;
  lucro_liquido?: number | null;
  margem_liquida_pct?: number | null;
  created_at?: string;
}

export interface FinFuncionarioFinanceiro {
  id?: string;
  tenant_id: string;
  employee_id: string;
  banco_codigo?: string | null;
  banco_nome?: string | null;
  agencia?: string | null;
  conta?: string | null;
  tipo_conta?: 'corrente' | 'poupanca' | 'pix' | null;
  chave_pix?: string | null;
  tipo_chave_pix?: 'cpf' | 'cnpj' | 'email' | 'telefone' | 'aleatoria' | null;
  comissao_padrao_pct?: number | null;
  cnpj_pj?: string | null;
  razao_social_pj?: string | null;
  created_at?: string;
}

export interface FinComissaoRegra {
  id?: string;
  tenant_id: string;
  employee_id: string;
  escopo: 'produto' | 'grupo';
  produto_id?: string | null;
  grupo_id?: string | null;
  comissao_pct: number;
  tipo_escalonamento?: 'nenhum' | 'volume' | 'valor' | 'empresas';
  faixas?: { de: number; ate: number | null; valor: number }[] | null;
  ativo?: boolean;
  created_at?: string;
}

export interface FinComissaoLancamento {
  id: string;
  tenant_id: string;
  employee_id: string;
  pedido_id?: string | null;
  produto_id?: string | null;
  produto_nome?: string | null;
  quantidade?: number | null;
  valor_venda?: number | null;
  comissao_pct?: number | null;
  valor_comissao: number;
  status: 'PENDENTE' | 'APROVADA' | 'PAGA' | 'CANCELADA';
  referencia_mes?: string | null;
  created_at?: string;
}

export interface ErpAssinaturaItem {
  id?: string;
  tenant_id: string;
  assinatura_id: string;
  produto_id: string;
  quantidade: number;
  valor_unitario: number;
  desconto_pct: number;
  erp_produtos?: { nome: string; codigo_interno: string } | null;
}

// ── Nós de Custo ──────────────────────────────────────────────────────────────

export async function getNos(): Promise<FinNoCusto[]> {
  const { data, error } = await supabase
    .from('fin_nos_custo')
    .select('*')
    .eq('tenant_id', getTenantId())
    .order('ordem_calculo');
  if (error) throw error;
  return data ?? [];
}

export async function upsertNo(no: Partial<FinNoCusto>): Promise<FinNoCusto> {
  const payload = { ...no, tenant_id: getTenantId() };
  const { data, error } = await supabase
    .from('fin_nos_custo')
    .upsert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteNo(id: string): Promise<void> {
  const { error } = await supabase.from('fin_nos_custo').delete().eq('id', id).eq('tenant_id', getTenantId());
  if (error) throw error;
}

export async function updateNoPosicao(id: string, posicao: { x: number; y: number }): Promise<void> {
  const { error } = await supabase
    .from('fin_nos_custo')
    .update({ posicao_canvas: posicao })
    .eq('id', id)
    .eq('tenant_id', getTenantId());
  if (error) throw error;
}

// ── Arestas ───────────────────────────────────────────────────────────────────

export async function getArestas(): Promise<FinArestaCusto[]> {
  const { data, error } = await supabase
    .from('fin_arestas_custo')
    .select('*')
    .eq('tenant_id', getTenantId());
  if (error) throw error;
  return data ?? [];
}

export async function upsertAresta(a: Partial<FinArestaCusto>): Promise<FinArestaCusto> {
  const payload = { ...a, tenant_id: getTenantId() };
  const { data, error } = await supabase
    .from('fin_arestas_custo')
    .upsert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAresta(id: string): Promise<void> {
  const { error } = await supabase.from('fin_arestas_custo').delete().eq('id', id).eq('tenant_id', getTenantId());
  if (error) throw error;
}

// ── Grupos de Custo ───────────────────────────────────────────────────────────

export async function getGruposCusto(): Promise<FinGrupoCusto[]> {
  const { data, error } = await supabase
    .from('fin_grupos_custo')
    .select('*')
    .eq('tenant_id', getTenantId())
    .order('nome');
  if (error) throw error;
  return data ?? [];
}

export async function upsertGrupoCusto(g: Partial<FinGrupoCusto>): Promise<FinGrupoCusto> {
  const payload = { ...g, tenant_id: getTenantId() };
  const { data, error } = await supabase
    .from('fin_grupos_custo')
    .upsert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteGrupoCusto(id: string): Promise<void> {
  const { error } = await supabase.from('fin_grupos_custo').delete().eq('id', id).eq('tenant_id', getTenantId());
  if (error) throw error;
}

// ── Impostos ──────────────────────────────────────────────────────────────────

export async function getImpostos(): Promise<FinImposto[]> {
  const { data, error } = await supabase
    .from('fin_impostos')
    .select('*')
    .eq('tenant_id', getTenantId())
    .order('nome');
  if (error) throw error;
  return data ?? [];
}

export async function upsertImposto(imp: Partial<FinImposto>): Promise<FinImposto> {
  const payload = { ...imp, tenant_id: getTenantId() };
  const { data, error } = await supabase
    .from('fin_impostos')
    .upsert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteImposto(id: string): Promise<void> {
  const { error } = await supabase.from('fin_impostos').delete().eq('id', id).eq('tenant_id', getTenantId());
  if (error) throw error;
}

// ── Snapshots ─────────────────────────────────────────────────────────────────

export async function getSnapshot(ano: number, mes: number): Promise<FinSnapshotCusto | null> {
  const { data, error } = await supabase
    .from('fin_snapshots_custo')
    .select('*')
    .eq('tenant_id', getTenantId())
    .eq('ano', ano)
    .eq('mes', mes)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertSnapshot(s: Omit<FinSnapshotCusto, 'tenant_id'>): Promise<FinSnapshotCusto> {
  const payload = { ...s, tenant_id: getTenantId() };
  const { data, error } = await supabase
    .from('fin_snapshots_custo')
    .upsert(payload, { onConflict: 'tenant_id,ano,mes' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── RPC: Avaliar nó ───────────────────────────────────────────────────────────

export async function avaliarNoDB(
  noId: string,
  contexto: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc('fn_avaliar_no_custo', {
    p_no_id: noId,
    p_contexto: contexto,
    p_tenant_id: getTenantId(),
  });
  if (error) throw error;
  return data as Record<string, unknown>;
}

// ── Funcionários Financeiros ──────────────────────────────────────────────────

export async function getFuncionarioFinanceiro(employeeId: string): Promise<FinFuncionarioFinanceiro | null> {
  const { data, error } = await supabase
    .from('erp_financeiro_funcionarios')
    .select('*')
    .eq('tenant_id', getTenantId())
    .eq('employee_id', employeeId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertFuncionarioFinanceiro(f: Omit<FinFuncionarioFinanceiro, 'tenant_id'>): Promise<void> {
  const payload = { ...f, tenant_id: getTenantId() };
  const { error } = await supabase
    .from('erp_financeiro_funcionarios')
    .upsert(payload, { onConflict: 'tenant_id,employee_id' });
  if (error) throw error;
}

// ── Comissões — Regras ────────────────────────────────────────────────────────

export async function getComissaoRegras(employeeId: string): Promise<FinComissaoRegra[]> {
  const { data, error } = await supabase
    .from('erp_comissoes_funcionario_produto')
    .select('*')
    .eq('tenant_id', getTenantId())
    .eq('employee_id', employeeId)
    .order('created_at');
  if (error) throw error;
  return data ?? [];
}

export async function upsertComissaoRegra(r: Partial<FinComissaoRegra> & { employee_id: string }): Promise<void> {
  const payload = { ...r, tenant_id: getTenantId() };
  const { error } = await supabase.from('erp_comissoes_funcionario_produto').upsert(payload);
  if (error) throw error;
}

export async function deleteComissaoRegra(id: string): Promise<void> {
  const { error } = await supabase.from('erp_comissoes_funcionario_produto').delete().eq('id', id);
  if (error) throw error;
}

// ── Comissões — Lançamentos ───────────────────────────────────────────────────

export async function getComissaoLancamentos(
  employeeId: string,
  ano?: number,
  mes?: number,
): Promise<FinComissaoLancamento[]> {
  let q = supabase
    .from('erp_comissoes_lancamentos')
    .select('*')
    .eq('tenant_id', getTenantId())
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });
  if (ano && mes) {
    const ref = `${ano}-${String(mes).padStart(2, '0')}`;
    q = q.eq('referencia_mes', ref);
  }
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function aprovarComissoes(ids: string[]): Promise<void> {
  const { error } = await supabase
    .from('erp_comissoes_lancamentos')
    .update({ status: 'PAGA' })
    .in('id', ids);
  if (error) throw error;
}

// ── Assinatura Itens ──────────────────────────────────────────────────────────

export async function getAssinaturaItens(assinaturaId: string): Promise<ErpAssinaturaItem[]> {
  const { data, error } = await supabase
    .from('erp_assinaturas_itens')
    .select('*, erp_produtos(nome, codigo_interno)')
    .eq('tenant_id', getTenantId())
    .eq('assinatura_id', assinaturaId);
  if (error) throw error;
  return data ?? [];
}

export async function replaceAssinaturaItens(assinaturaId: string, itens: Omit<ErpAssinaturaItem, 'id' | 'tenant_id' | 'erp_produtos'>[]): Promise<void> {
  const tenantId = getTenantId();
  await supabase.from('erp_assinaturas_itens').delete().eq('assinatura_id', assinaturaId);
  if (itens.length === 0) return;
  const { error } = await supabase.from('erp_assinaturas_itens').insert(
    itens.map(i => ({ ...i, tenant_id: tenantId, assinatura_id: assinaturaId })),
  );
  if (error) throw error;
}
