-- ─────────────────────────────────────────────────────────────────────────────
-- fin_erp_grants — Permissões para tabelas do módulo ERP/Financeiro
-- As tabelas já existem; este arquivo apenas garante acesso via chave anon/authenticated.
-- ─────────────────────────────────────────────────────────────────────────────

-- Árvore de Custos
GRANT SELECT, INSERT, UPDATE, DELETE ON fin_nos_custo        TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON fin_arestas_custo    TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON fin_grupos_custo     TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON fin_impostos         TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON fin_snapshots_custo  TO anon, authenticated;

-- Assinaturas multi-produto
GRANT SELECT, INSERT, UPDATE, DELETE ON erp_assinaturas_itens TO anon, authenticated;

-- Comissões de funcionários
GRANT SELECT, INSERT, UPDATE, DELETE ON erp_comissoes_funcionario_produto TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON erp_comissoes_lancamentos         TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON erp_financeiro_funcionarios       TO anon, authenticated;
