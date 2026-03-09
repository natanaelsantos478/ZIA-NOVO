// ─────────────────────────────────────────────────────────────────────────────
// useComissoes — Hook de comissões de funcionários
// Conecta com as tabelas erp_* do Supabase
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from '../lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CadastroFinanceiro {
  id: string;
  employee_id: string;
  banco_codigo: string | null;
  agencia: string | null;
  conta: string | null;
  tipo_conta: 'CORRENTE' | 'POUPANCA' | 'SALARIO' | null;
  pix_chave: string | null;
  pix_tipo: 'CPF' | 'EMAIL' | 'TELEFONE' | 'CHAVE_ALEATORIA' | null;
  recebe_comissao: boolean;
  percentual_comissao_padrao: number | null;
  teto_comissao_mensal: number | null;
  tenant_id: string;
  created_at: string;
  updated_at: string | null;
}

export type TipoComissao =
  | 'COMISSAO_GRUPO_PRODUTO'
  | 'COMISSAO_PRODUTO_ESPECIFICO';

export type TipoEscalonamento = 'NENHUM' | 'POR_UNIDADES' | 'POR_VALOR';

export interface EscalonamentoRow {
  min: number;
  max: number | null;
  pct: number;
}

export interface RegraComissao {
  id: string;
  employee_id: string;
  tipo: TipoComissao;
  produto_id: string | null;
  grupo_produto_id: string | null;
  group_id: string | null;
  comissao_pct: number;
  tipo_escalonamento: TipoEscalonamento;
  escalonamento_json: EscalonamentoRow[] | null;
  origem: 'MANUAL' | 'GRUPO';
  ativo: boolean;
  tenant_id: string;
  created_at: string;
  // joined
  erp_produtos?: { nome: string } | null;
  erp_grupo_produtos?: { nome: string } | null;
  employee_groups?: { name: string } | null;
}

export interface HistoricoComissao {
  id: string;
  employee_id: string;
  pedido_id: string | null;
  produto_id: string | null;
  grupo_produto_id: string | null;
  quantidade: number | null;
  valor_venda: number | null;
  comissao_pct: number;
  valor_comissao: number;
  status: 'PENDENTE' | 'APROVADA' | 'PAGA' | 'CANCELADA';
  data_referencia: string;
  data_pagamento: string | null;
  conta_bancaria_id: string | null;
  tenant_id: string;
  created_at: string;
  // joined
  erp_produtos?: { nome: string } | null;
  erp_pedidos?: { numero: number } | null;
  erp_grupo_produtos?: { nome: string } | null;
}

export interface AnalyticsComissoesItem {
  employee_id: string;
  employee_name?: string;
  total_pendente: number;
  total_pago: number;
  total_geral: number;
  count_lancamentos: number;
}

export interface PreviewComissaoItem {
  produto_id: string;
  produto_nome: string;
  quantidade: number;
  valor_unitario: number;
  valor_total_item: number;
  comissao_pct: number;
  valor_comissao: number;
  regra_id: string | null;
}

// ── Helper ────────────────────────────────────────────────────────────────────

async function getTenantId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? '00000000-0000-0000-0000-000000000001';
}

// ── Cadastro Financeiro ────────────────────────────────────────────────────────

export async function getCadastroFinanceiro(
  employee_id: string,
): Promise<CadastroFinanceiro | null> {
  const { data, error } = await supabase
    .from('erp_financeiro_funcionarios')
    .select('*')
    .eq('employee_id', employee_id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function salvarCadastroFinanceiro(
  employee_id: string,
  dados: Partial<CadastroFinanceiro>,
): Promise<CadastroFinanceiro> {
  const tenant_id = await getTenantId();
  const payload = {
    ...dados,
    employee_id,
    tenant_id,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from('erp_financeiro_funcionarios')
    .upsert(payload, { onConflict: 'employee_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Regras de Comissão ────────────────────────────────────────────────────────

export async function getRegrasComissao(
  employee_id: string,
): Promise<RegraComissao[]> {
  const { data, error } = await supabase
    .from('erp_comissoes_funcionario_produto')
    .select(
      '*, erp_produtos(nome), erp_grupo_produtos(nome), employee_groups(name)',
    )
    .eq('employee_id', employee_id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function adicionarRegraComissao(payload: {
  employee_id: string;
  tipo: TipoComissao;
  produto_id?: string | null;
  grupo_produto_id?: string | null;
  group_id?: string | null;
  comissao_pct: number;
  tipo_escalonamento: TipoEscalonamento;
  escalonamento_json?: EscalonamentoRow[] | null;
  origem?: 'MANUAL' | 'GRUPO';
  ativo?: boolean;
}): Promise<RegraComissao> {
  const tenant_id = await getTenantId();
  const { data, error } = await supabase
    .from('erp_comissoes_funcionario_produto')
    .insert({
      ...payload,
      origem: payload.origem ?? 'MANUAL',
      ativo: payload.ativo ?? true,
      tenant_id,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removerRegraComissao(id: string): Promise<void> {
  const { error } = await supabase
    .from('erp_comissoes_funcionario_produto')
    .delete()
    .eq('id', id)
    .eq('origem', 'MANUAL');
  if (error) throw error;
}

// ── Histórico de Comissões ────────────────────────────────────────────────────

export async function getHistoricoComissoes(
  employee_id: string,
  filters: { mes?: number; ano?: number; status?: string } = {},
): Promise<HistoricoComissao[]> {
  let q = supabase
    .from('erp_comissoes_lancamentos')
    .select(
      '*, erp_produtos(nome), erp_pedidos(numero), erp_grupo_produtos(nome)',
    )
    .eq('employee_id', employee_id)
    .order('data_referencia', { ascending: false });

  if (filters.status) {
    q = q.eq('status', filters.status);
  }
  if (filters.ano) {
    const startDate = `${filters.ano}-${String(filters.mes ?? 1).padStart(2, '0')}-01`;
    const endMonth = filters.mes ? filters.mes + 1 : 1;
    const endYear = filters.mes === 12 || !filters.mes ? filters.ano + 1 : filters.ano;
    const endDate = `${endYear}-${String(endMonth > 12 ? 1 : endMonth).padStart(2, '0')}-01`;

    if (filters.mes) {
      q = q.gte('data_referencia', startDate).lt('data_referencia', endDate);
    } else {
      q = q.gte('data_referencia', `${filters.ano}-01-01`).lt('data_referencia', `${filters.ano + 1}-01-01`);
    }
  }

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

// ── Pagar Comissões ───────────────────────────────────────────────────────────

export async function pagarComissoes(
  ids: string[],
  conta_bancaria_id?: string,
): Promise<void> {
  if (ids.length === 0) return;

  const today = new Date().toISOString().slice(0, 10);
  const tenant_id = await getTenantId();

  // 1. Buscar os lançamentos para agrupar por funcionário
  const { data: lancamentos, error: fetchError } = await supabase
    .from('erp_comissoes_lancamentos')
    .select('id, employee_id, valor_comissao')
    .in('id', ids);
  if (fetchError) throw fetchError;

  // 2. Marcar como PAGO
  const updatePayload: Record<string, unknown> = {
    status: 'PAGA',
    data_pagamento: today,
  };
  if (conta_bancaria_id) updatePayload.conta_bancaria_id = conta_bancaria_id;

  const { error: updateError } = await supabase
    .from('erp_comissoes_lancamentos')
    .update(updatePayload)
    .in('id', ids);
  if (updateError) throw updateError;

  // 3. Agrupar por employee_id e criar lançamento financeiro para cada
  const byEmployee = (lancamentos ?? []).reduce<Record<string, number>>(
    (acc, l) => {
      acc[l.employee_id] = (acc[l.employee_id] ?? 0) + (l.valor_comissao ?? 0);
      return acc;
    },
    {},
  );

  const financialInserts = Object.entries(byEmployee).map(([employee_id, total]) => ({
    tipo: 'DESPESA' as const,
    categoria: 'OPERACIONAL',
    descricao: `Pagamento de comissões — funcionário ${employee_id}`,
    valor: total,
    data_vencimento: today,
    data_pagamento: today,
    status: 'PAGO' as const,
    nfe_id: null,
    pedido_id: null,
    conta_bancaria_id: conta_bancaria_id ?? null,
    tenant_id,
  }));

  if (financialInserts.length > 0) {
    const { error: finError } = await supabase
      .from('erp_financeiro_lancamentos')
      .insert(financialInserts);
    if (finError) throw finError;
  }
}

// ── Analytics de Comissões ────────────────────────────────────────────────────

export async function getAnalyticsComissoes(filters: {
  data_inicio: string;
  data_fim: string;
}): Promise<AnalyticsComissoesItem[]> {
  const { data, error } = await supabase
    .from('erp_comissoes_lancamentos')
    .select('employee_id, valor_comissao, status')
    .gte('data_referencia', filters.data_inicio)
    .lte('data_referencia', filters.data_fim);
  if (error) throw error;

  const byEmployee: Record<
    string,
    { total_pendente: number; total_pago: number; count_lancamentos: number }
  > = {};

  for (const row of data ?? []) {
    if (!byEmployee[row.employee_id]) {
      byEmployee[row.employee_id] = {
        total_pendente: 0,
        total_pago: 0,
        count_lancamentos: 0,
      };
    }
    const entry = byEmployee[row.employee_id];
    entry.count_lancamentos += 1;
    if (row.status === 'PAGA') {
      entry.total_pago += row.valor_comissao ?? 0;
    } else if (row.status === 'PENDENTE' || row.status === 'APROVADA') {
      entry.total_pendente += row.valor_comissao ?? 0;
    }
  }

  return Object.entries(byEmployee).map(([employee_id, stats]) => ({
    employee_id,
    total_pendente: stats.total_pendente,
    total_pago: stats.total_pago,
    total_geral: stats.total_pendente + stats.total_pago,
    count_lancamentos: stats.count_lancamentos,
  }));
}

// ── Preview de Comissão ───────────────────────────────────────────────────────

export async function calcularPreviewComissao(
  pedido_id: string,
): Promise<PreviewComissaoItem[]> {
  // Buscar itens do pedido com produto e vendedor
  const { data: pedido, error: pedidoError } = await supabase
    .from('erp_pedidos')
    .select('id, vendedor_id, erp_pedidos_itens(*, erp_produtos(nome, grupo_id))')
    .eq('id', pedido_id)
    .single();
  if (pedidoError) throw pedidoError;
  if (!pedido?.vendedor_id) return [];

  const vendedor_id: string = pedido.vendedor_id;
  const itens: Array<{
    produto_id: string;
    quantidade: number;
    preco_unitario: number;
    total_item: number;
    erp_produtos?: { nome: string; grupo_id: string | null } | null;
  }> = (pedido as Record<string, unknown>).erp_pedidos_itens as typeof itens ?? [];

  if (itens.length === 0) return [];

  // Buscar regras de comissão do vendedor
  const { data: regras, error: regrasError } = await supabase
    .from('erp_comissoes_funcionario_produto')
    .select('*')
    .eq('employee_id', vendedor_id)
    .eq('ativo', true);
  if (regrasError) throw regrasError;

  const regrasList: RegraComissao[] = regras ?? [];

  const preview: PreviewComissaoItem[] = itens.map((item) => {
    const produto_id = item.produto_id;
    const grupo_id = item.erp_produtos?.grupo_id ?? null;

    // Prioridade: regra por produto específico > regra por grupo de produto
    let regraMatch: RegraComissao | null = null;

    const regraProduto = regrasList.find(
      (r) => r.tipo === 'COMISSAO_PRODUTO_ESPECIFICO' && r.produto_id === produto_id,
    );
    if (regraProduto) {
      regraMatch = regraProduto;
    } else if (grupo_id) {
      const regraGrupo = regrasList.find(
        (r) => r.tipo === 'COMISSAO_GRUPO_PRODUTO' && r.grupo_produto_id === grupo_id,
      );
      if (regraGrupo) regraMatch = regraGrupo;
    }

    let comissao_pct = 0;
    let regra_id: string | null = null;

    if (regraMatch) {
      regra_id = regraMatch.id;
      // Verificar escalonamento
      if (
        regraMatch.tipo_escalonamento !== 'NENHUM' &&
        regraMatch.escalonamento_json &&
        regraMatch.escalonamento_json.length > 0
      ) {
        const valorRef =
          regraMatch.tipo_escalonamento === 'POR_UNIDADES'
            ? item.quantidade
            : item.total_item;

        const faixa = regraMatch.escalonamento_json.find(
          (f) =>
            valorRef >= f.min && (f.max === null || valorRef <= f.max),
        );
        comissao_pct = faixa ? faixa.pct : regraMatch.comissao_pct;
      } else {
        comissao_pct = regraMatch.comissao_pct;
      }
    }

    const valor_comissao = (item.total_item * comissao_pct) / 100;

    return {
      produto_id,
      produto_nome: item.erp_produtos?.nome ?? produto_id,
      quantidade: item.quantidade,
      valor_unitario: item.preco_unitario,
      valor_total_item: item.total_item,
      comissao_pct,
      valor_comissao,
      regra_id,
    };
  });

  return preview;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useComissoes() {
  return {
    getCadastroFinanceiro,
    salvarCadastroFinanceiro,
    getRegrasComissao,
    adicionarRegraComissao,
    removerRegraComissao,
    getHistoricoComissoes,
    pagarComissoes,
    getAnalyticsComissoes,
    calcularPreviewComissao,
  };
}
