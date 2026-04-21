// ─────────────────────────────────────────────────────────────────────────────
// mockData.ts — Defaults de simulação para o Motor de Árvore de Custos
//
// Dados exemplares (NOS_MOCK, ARESTAS_MOCK, IMPOSTOS_MOCK, GRUPOS_CUSTO_MOCK)
// foram removidos para evitar que apareçam como custos reais de um tenant sem
// dados ainda cadastrados. A árvore é sempre lida do Supabase; quando o tenant
// não tem nada cadastrado, a tela mostra estado vazio (não dados fictícios).
//
// `CONTEXTO_PADRAO` permanece: são apenas valores iniciais de simulação que o
// usuário pode ajustar nos controles do Simulador.
// ─────────────────────────────────────────────────────────────────────────────

// ── Contexto padrão para simulação ───────────────────────────────────────────

export const CONTEXTO_PADRAO = {
  receita_bruta: 0,
  total_assinantes: 0,
  total_pedidos: 0,
  volume_por_produto: {} as Record<string, number>,
  receita_por_produto: {} as Record<string, number>,
  receita_por_grupo: {} as Record<string, number>,
};
