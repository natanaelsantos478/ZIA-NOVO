// ─────────────────────────────────────────────────────────────────────────────
// mockData.ts — Dados mock para o Motor de Árvore de Custos
// ─────────────────────────────────────────────────────────────────────────────
import type { NoCusto, ArestaCusto, GrupoCusto, Imposto } from './types';

// ── Nós de exemplo ────────────────────────────────────────────────────────────

export const NOS_MOCK: NoCusto[] = [
  // ── Nó raiz agregador ──
  {
    id: 'raiz-operacional',
    nome: 'Custos Operacionais',
    descricao: 'Total de custos operacionais da empresa',
    icone: '🏢',
    cor_display: '#2563eb',
    tipo_no: 'CUSTO_AGREGADOR',
    estrutura_valor: { tipo: 'FIXO', valor: 0, moeda: 'BRL', recorrencia: 'MENSAL' },
    gatilho: { tipo: 'SEMPRE' },
    escopo: 'EMPRESA',
    ativo: true,
    ordem_calculo: 0,
    posicao: { x: 350, y: 50 },
  },

  // ── Claude AI (condicional por volume) ──
  {
    id: 'claude-ai',
    nome: 'Claude AI',
    descricao: 'Custo da API da Anthropic — varia com número de assinantes',
    icone: '🤖',
    cor_display: '#7c3aed',
    tipo_no: 'CUSTO_CONDICIONAL',
    estrutura_valor: { tipo: 'FIXO', valor: 0, moeda: 'BRL', recorrencia: 'MENSAL' },
    gatilho: { tipo: 'SEMPRE' },
    escopo: 'EMPRESA',
    ativo: true,
    ordem_calculo: 1,
    posicao: { x: 100, y: 220 },
  },
  {
    id: 'claude-ate-99',
    nome: 'Claude — até 99 assinantes',
    icone: '🤖',
    cor_display: '#7c3aed',
    tipo_no: 'CUSTO_FOLHA',
    estrutura_valor: { tipo: 'FIXO', valor: 150, moeda: 'BRL', recorrencia: 'MENSAL' },
    gatilho: { tipo: 'TOTAL_ASSINANTES', operador: '<=', valor_referencia: 99 },
    escopo: 'EMPRESA',
    ativo: true,
    ordem_calculo: 2,
    posicao: { x: -80, y: 400 },
  },
  {
    id: 'claude-100-499',
    nome: 'Claude — 100 a 499 assinantes',
    icone: '🤖',
    cor_display: '#7c3aed',
    tipo_no: 'CUSTO_FOLHA',
    estrutura_valor: { tipo: 'FIXO', valor: 120, moeda: 'BRL', recorrencia: 'MENSAL' },
    gatilho: { tipo: 'TOTAL_ASSINANTES', operador: 'between', valor_referencia: 100, valor_referencia_2: 499 },
    escopo: 'EMPRESA',
    ativo: true,
    ordem_calculo: 2,
    posicao: { x: 100, y: 400 },
  },
  {
    id: 'claude-500-mais',
    nome: 'Claude — 500+ assinantes',
    icone: '🤖',
    cor_display: '#7c3aed',
    tipo_no: 'CUSTO_FOLHA',
    estrutura_valor: { tipo: 'FIXO', valor: 90, moeda: 'BRL', recorrencia: 'MENSAL' },
    gatilho: { tipo: 'TOTAL_ASSINANTES', operador: '>=', valor_referencia: 500 },
    escopo: 'EMPRESA',
    ativo: true,
    ordem_calculo: 2,
    posicao: { x: 280, y: 400 },
  },

  // ── Servidor AWS (escalonado por volume) ──
  {
    id: 'aws-server',
    nome: 'Servidor AWS',
    descricao: 'Custo de hospedagem escalonado por número de assinantes',
    icone: '☁️',
    cor_display: '#ea580c',
    tipo_no: 'CUSTO_FOLHA',
    estrutura_valor: {
      tipo: 'ESCALONADO_VOLUME',
      unidade_escalonamento: 'assinantes',
      moeda: 'BRL',
      recorrencia: 'MENSAL',
      faixas: [
        { de: 0,   ate: 49,   valor: 2.00 },
        { de: 50,  ate: 199,  valor: 1.60 },
        { de: 200, ate: null, valor: 1.20 },
      ],
    },
    gatilho: { tipo: 'SEMPRE' },
    escopo: 'EMPRESA',
    ativo: true,
    ordem_calculo: 1,
    posicao: { x: 400, y: 220 },
  },

  // ── Folha de pagamento (fixo) ──
  {
    id: 'folha-pagamento',
    nome: 'Folha de Pagamento',
    descricao: 'Salários + encargos mensais da equipe',
    icone: '👥',
    cor_display: '#16a34a',
    tipo_no: 'CUSTO_FOLHA',
    estrutura_valor: { tipo: 'FIXO', valor: 28000, moeda: 'BRL', recorrencia: 'MENSAL' },
    gatilho: { tipo: 'SEMPRE' },
    escopo: 'EMPRESA',
    ativo: true,
    ordem_calculo: 1,
    posicao: { x: 650, y: 220 },
  },

  // ── Marketing (percentual da receita) ──
  {
    id: 'marketing',
    nome: 'Marketing',
    descricao: '5% da receita bruta destinado a marketing',
    icone: '📣',
    cor_display: '#db2777',
    tipo_no: 'CUSTO_FOLHA',
    estrutura_valor: { tipo: 'PERCENTUAL_RECEITA', percentual: 5, moeda: 'BRL', recorrencia: 'MENSAL' },
    gatilho: { tipo: 'FATURAMENTO_TOTAL', operador: '>=', valor_referencia: 10000 },
    escopo: 'EMPRESA',
    ativo: true,
    ordem_calculo: 1,
    posicao: { x: 900, y: 220 },
  },
];

// ── Arestas de exemplo ────────────────────────────────────────────────────────

export const ARESTAS_MOCK: ArestaCusto[] = [
  // raiz → claude-ai (SOMA)
  { id: 'e1', no_pai_id: 'raiz-operacional', no_filho_id: 'claude-ai',       tipo_relacao: 'SOMA',      condicao_aresta: { tipo: 'SEMPRE' }, prioridade: 0, ativo: true },
  // raiz → aws-server (SOMA)
  { id: 'e2', no_pai_id: 'raiz-operacional', no_filho_id: 'aws-server',      tipo_relacao: 'SOMA',      condicao_aresta: { tipo: 'SEMPRE' }, prioridade: 0, ativo: true },
  // raiz → folha-pagamento (SOMA)
  { id: 'e3', no_pai_id: 'raiz-operacional', no_filho_id: 'folha-pagamento', tipo_relacao: 'SOMA',      condicao_aresta: { tipo: 'SEMPRE' }, prioridade: 0, ativo: true },
  // raiz → marketing (SOMA)
  { id: 'e4', no_pai_id: 'raiz-operacional', no_filho_id: 'marketing',       tipo_relacao: 'SOMA',      condicao_aresta: { tipo: 'SEMPRE' }, prioridade: 0, ativo: true },
  // claude-ai → claude-ate-99 (SUBSTITUI, prio 10)
  { id: 'e5', no_pai_id: 'claude-ai', no_filho_id: 'claude-ate-99',   tipo_relacao: 'SUBSTITUI', condicao_aresta: { tipo: 'TOTAL_ASSINANTES', operador: '<=', valor_referencia: 99  }, prioridade: 10, ativo: true },
  // claude-ai → claude-100-499 (SUBSTITUI, prio 5)
  { id: 'e6', no_pai_id: 'claude-ai', no_filho_id: 'claude-100-499',  tipo_relacao: 'SUBSTITUI', condicao_aresta: { tipo: 'TOTAL_ASSINANTES', operador: 'between', valor_referencia: 100, valor_referencia_2: 499 }, prioridade: 5, ativo: true },
  // claude-ai → claude-500-mais (SUBSTITUI, prio 1)
  { id: 'e7', no_pai_id: 'claude-ai', no_filho_id: 'claude-500-mais', tipo_relacao: 'SUBSTITUI', condicao_aresta: { tipo: 'TOTAL_ASSINANTES', operador: '>=', valor_referencia: 500 }, prioridade: 1, ativo: true },
];

// ── Grupos de custo ───────────────────────────────────────────────────────────

export const GRUPOS_CUSTO_MOCK: GrupoCusto[] = [
  {
    id: 'gc-infra',
    nome: 'Infraestrutura',
    descricao: 'Custos de servidores, CDN e serviços cloud',
    cor: '#2563eb',
    criterio: 'MANUAL',
    produtos_ids: [],
    ativo: true,
  },
  {
    id: 'gc-assinaturas',
    nome: 'Todos os Assinantes',
    descricao: 'Agrupa todos os produtos de assinatura ativa',
    cor: '#7c3aed',
    criterio: 'IS_SUBSCRIPTION',
    ativo: true,
  },
  {
    id: 'gc-premium',
    nome: 'Planos Premium',
    descricao: 'Produtos com preço entre R$ 200 e R$ 1.000',
    cor: '#d97706',
    criterio: 'FAIXA_PRECO',
    criterio_params: { preco_min: 200, preco_max: 1000 },
    ativo: true,
  },
];

// ── Impostos ──────────────────────────────────────────────────────────────────

export const IMPOSTOS_MOCK: Imposto[] = [
  {
    id: 'imp-simples',
    nome: 'Simples Nacional',
    sigla: 'SN',
    descricao: 'Regime tributário simplificado para MPEs',
    regime: 'Simples Nacional',
    tipo_calculo: 'ALIQUOTA_PROGRESSIVA',
    base_calculo: 'RECEITA_BRUTA',
    competencia: 'MENSAL',
    faixas_progressivas: [
      { receita_min: 0,      receita_max: 180000,  aliquota: 6.0,  deducao: 0 },
      { receita_min: 180001, receita_max: 360000,  aliquota: 11.2, deducao: 9360 },
      { receita_min: 360001, receita_max: 720000,  aliquota: 14.7, deducao: 22896 },
      { receita_min: 720001, receita_max: 1800000, aliquota: 18.7, deducao: 51696 },
    ],
    ativo: true,
  },
  {
    id: 'imp-pis-cofins',
    nome: 'PIS/COFINS',
    sigla: 'PIS/COFINS',
    descricao: 'Contribuição social sobre faturamento',
    regime: 'Lucro Presumido',
    tipo_calculo: 'ALIQUOTA_FIXA',
    aliquota_pct: 3.65,
    base_calculo: 'RECEITA_BRUTA',
    competencia: 'MENSAL',
    ativo: true,
  },
  {
    id: 'imp-iss',
    nome: 'ISS',
    sigla: 'ISS',
    descricao: 'Imposto sobre serviços',
    tipo_calculo: 'ALIQUOTA_FIXA',
    aliquota_pct: 5.0,
    base_calculo: 'RECEITA_BRUTA',
    competencia: 'MENSAL',
    ativo: false,
  },
];

// ── Contexto padrão para simulação ───────────────────────────────────────────

export const CONTEXTO_PADRAO = {
  receita_bruta: 85000,
  total_assinantes: 47,
  total_pedidos: 312,
  volume_por_produto: { 'prod-1': 150, 'prod-2': 90, 'prod-3': 72 },
  receita_por_produto: { 'prod-1': 42000, 'prod-2': 25000, 'prod-3': 18000 },
  receita_por_grupo: { 'gc-infra': 67000, 'gc-assinaturas': 85000 },
};
