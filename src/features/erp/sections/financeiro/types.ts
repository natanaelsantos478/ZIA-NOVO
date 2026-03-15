// ─────────────────────────────────────────────────────────────────────────────
// types.ts — Motor de Árvore de Custos (frontend types — espelham o SQL)
// ─────────────────────────────────────────────────────────────────────────────

// ── Tipos base ───────────────────────────────────────────────────────────────

export type TipoNo =
  | 'CUSTO_FOLHA'
  | 'CUSTO_AGREGADOR'
  | 'CUSTO_CONDICIONAL'
  | 'CUSTO_MULTIPLICADOR'
  | 'CUSTO_DISTRIBUIDOR';

export type TipoValor =
  | 'FIXO'
  | 'FIXO_UNITARIO'
  | 'ESCALONADO_VOLUME'
  | 'ESCALONADO_FATURAMENTO'
  | 'PERCENTUAL_RECEITA'
  | 'FORMULA';

export type Recorrencia = 'MENSAL' | 'ANUAL' | 'POR_EVENTO' | 'POR_UNIDADE';

export interface Faixa {
  de: number;
  ate: number | null;
  valor: number;
  inclusive_ate?: boolean;
}

export interface EstruturaValor {
  tipo: TipoValor;
  valor?: number;
  moeda?: 'BRL' | 'USD' | 'EUR';
  recorrencia?: Recorrencia;
  faixas?: Faixa[];
  unidade_escalonamento?: string;
  percentual?: number;
  formula?: string;
  variaveis_formula?: string[];
}

export type TipoGatilho =
  | 'SEMPRE'
  | 'VOLUME_PRODUTO'
  | 'VOLUME_GRUPO'
  | 'FATURAMENTO_TOTAL'
  | 'FATURAMENTO_GRUPO'
  | 'TOTAL_ASSINANTES'
  | 'TOTAL_PEDIDOS_MES'
  | 'VALOR_OUTRO_NO'
  | 'DATA_CALENDARIO'
  | 'CUSTOM_FORMULA';

export type OperadorGatilho = '>' | '>=' | '<' | '<=' | '==' | 'between';

export interface Gatilho {
  tipo: TipoGatilho;
  produto_id?: string;
  grupo_id?: string;
  operador?: OperadorGatilho;
  valor_referencia?: number;
  valor_referencia_2?: number;
  no_referencia_id?: string;
  formula?: string;
  variaveis?: string[];
}

export type EscopoNo =
  | 'EMPRESA'
  | 'PRODUTO'
  | 'GRUPO_PRODUTO'
  | 'GRUPO_CUSTO'
  | 'FAIXA_PRECO';

export type MetodoRateio =
  | 'PROPORCIONAL_RECEITA'
  | 'PROPORCIONAL_VOLUME'
  | 'IGUALITARIO'
  | 'PERCENTUAL_FIXO';

export interface ConfigRateio {
  metodo: MetodoRateio;
  percentuais_fixos?: Record<string, number>;
}

// ── Nó da árvore ─────────────────────────────────────────────────────────────

export interface NoCusto {
  id: string;
  tenant_id?: string;
  nome: string;
  descricao?: string;
  icone: string;
  cor_display: string;
  tipo_no: TipoNo;
  estrutura_valor: EstruturaValor;
  gatilho: Gatilho;
  escopo: EscopoNo;
  produto_id?: string;
  grupo_produto_id?: string;
  grupo_custo_id?: string;
  faixa_preco_min?: number;
  faixa_preco_max?: number;
  config_rateio?: ConfigRateio;
  ativo: boolean;
  ordem_calculo: number;
  // Posição visual no canvas
  posicao?: { x: number; y: number };
  created_at?: string;
}

// ── Aresta ───────────────────────────────────────────────────────────────────

export type TipoRelacao =
  | 'SOMA'
  | 'SUBTRAI'
  | 'SUBSTITUI'
  | 'MULTIPLICA_POR'
  | 'DIVIDE_POR'
  | 'ATIVA_SE'
  | 'MODIFICA_FAIXA';

export interface ArestaCusto {
  id: string;
  tenant_id?: string;
  no_pai_id: string;
  no_filho_id: string;
  tipo_relacao: TipoRelacao;
  condicao_aresta: Gatilho;
  prioridade: number;
  fator?: number;
  limite_aplicacoes?: number;
  ativo: boolean;
}

// ── Grupos de custo ───────────────────────────────────────────────────────────

export type CriterioGrupo =
  | 'MANUAL'
  | 'GRUPO_PRODUTO_ERP'
  | 'FAIXA_PRECO'
  | 'IS_SUBSCRIPTION'
  | 'TODOS_PRODUTOS';

export interface GrupoCusto {
  id: string;
  nome: string;
  descricao?: string;
  cor: string;
  criterio: CriterioGrupo;
  criterio_params?: Record<string, unknown>;
  produtos_ids?: string[];
  ativo: boolean;
}

// ── Impostos ──────────────────────────────────────────────────────────────────

export type TipoCalculoImposto =
  | 'ALIQUOTA_FIXA'
  | 'ALIQUOTA_PROGRESSIVA'
  | 'VALOR_FIXO_MENSAL'
  | 'VINCULADO_NO_CUSTO';

export interface FaixaProgressiva {
  receita_min: number;
  receita_max: number | null;
  aliquota: number;
  deducao: number;
}

export interface Imposto {
  id: string;
  nome: string;
  sigla: string;
  descricao?: string;
  regime?: string;
  tipo_calculo: TipoCalculoImposto;
  aliquota_pct?: number;
  valor_fixo?: number;
  faixas_progressivas?: FaixaProgressiva[];
  no_custo_id?: string;
  base_calculo: 'RECEITA_BRUTA' | 'LUCRO_LIQUIDO' | 'LUCRO_PRESUMIDO' | 'FOLHA_PAGAMENTO';
  competencia: 'MENSAL' | 'TRIMESTRAL' | 'ANUAL';
  ativo: boolean;
}

// ── Contexto de simulação ─────────────────────────────────────────────────────

export interface ContextoCalculo {
  receita_bruta: number;
  total_assinantes: number;
  total_pedidos: number;
  volume_por_produto: Record<string, number>;
  receita_por_produto: Record<string, number>;
  receita_por_grupo: Record<string, number>;
}

// ── Resultado da avaliação ────────────────────────────────────────────────────

export interface ResultadoNo {
  valor: number;
  trace: string;
  filhos_avaliados: Record<string, ResultadoNo>;
  gatilho_ativado: boolean;
  no_nome: string;
  no_tipo: TipoNo;
  faixa_aplicada?: Faixa;
  filho_escolhido?: string;
}

export interface ResultadoSimulacao {
  nos: Record<string, ResultadoNo>;
  totais: {
    custo_total_empresa: number;
    por_produto: Record<string, { direto: number; indireto: number; imposto: number }>;
    impostos_totais: number;
  };
  margem_por_produto: Record<string, {
    receita: number;
    custo_total: number;
    margem_bruta: number;
    margem_pct: number;
  }>;
}

// ── Snapshot mensal ───────────────────────────────────────────────────────────

export interface SnapshotCusto {
  id: string;
  ano: number;
  mes: number;
  contexto_calculo: ContextoCalculo;
  resultado_arvore: ResultadoSimulacao;
  receita_bruta: number;
  total_custos: number;
  total_impostos: number;
  lucro_liquido: number;
  margem_liquida_pct: number;
  calculado_em: string;
}
