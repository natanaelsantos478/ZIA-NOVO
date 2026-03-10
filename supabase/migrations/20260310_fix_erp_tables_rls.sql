-- =============================================================================
-- MIGRATION: Fix RLS nas tabelas ERP principais
-- O app roda como usuário anônimo (sem Supabase Auth),
-- então as policies que exigem auth.uid() bloqueiam INSERTs.
-- Padrão consistente com o fix já aplicado nas tabelas de caixa.
-- Execute no SQL Editor do Supabase Dashboard (uma vez)
-- =============================================================================

-- ── erp_clientes ──────────────────────────────────────────────────────────────
ALTER TABLE public.erp_clientes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clientes_select"  ON public.erp_clientes;
DROP POLICY IF EXISTS "clientes_insert"  ON public.erp_clientes;
DROP POLICY IF EXISTS "clientes_update"  ON public.erp_clientes;
DROP POLICY IF EXISTS "clientes_delete"  ON public.erp_clientes;
DROP POLICY IF EXISTS "clientes_all"     ON public.erp_clientes;
CREATE POLICY "clientes_all" ON public.erp_clientes FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.erp_clientes TO anon, authenticated, service_role;

-- ── erp_fornecedores ──────────────────────────────────────────────────────────
ALTER TABLE public.erp_fornecedores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fornecedores_select" ON public.erp_fornecedores;
DROP POLICY IF EXISTS "fornecedores_insert" ON public.erp_fornecedores;
DROP POLICY IF EXISTS "fornecedores_update" ON public.erp_fornecedores;
DROP POLICY IF EXISTS "fornecedores_delete" ON public.erp_fornecedores;
DROP POLICY IF EXISTS "fornecedores_all"    ON public.erp_fornecedores;
CREATE POLICY "fornecedores_all" ON public.erp_fornecedores FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.erp_fornecedores TO anon, authenticated, service_role;

-- ── erp_grupo_produtos ────────────────────────────────────────────────────────
ALTER TABLE public.erp_grupo_produtos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "grupo_produtos_all" ON public.erp_grupo_produtos;
CREATE POLICY "grupo_produtos_all" ON public.erp_grupo_produtos FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.erp_grupo_produtos TO anon, authenticated, service_role;

-- ── erp_produtos ──────────────────────────────────────────────────────────────
ALTER TABLE public.erp_produtos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "produtos_select" ON public.erp_produtos;
DROP POLICY IF EXISTS "produtos_insert" ON public.erp_produtos;
DROP POLICY IF EXISTS "produtos_update" ON public.erp_produtos;
DROP POLICY IF EXISTS "produtos_delete" ON public.erp_produtos;
DROP POLICY IF EXISTS "produtos_all"    ON public.erp_produtos;
CREATE POLICY "produtos_all" ON public.erp_produtos FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.erp_produtos TO anon, authenticated, service_role;

-- ── erp_estoque_movimentos ────────────────────────────────────────────────────
ALTER TABLE public.erp_estoque_movimentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "movimentos_all" ON public.erp_estoque_movimentos;
CREATE POLICY "movimentos_all" ON public.erp_estoque_movimentos FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.erp_estoque_movimentos TO anon, authenticated, service_role;

-- ── erp_pedidos ───────────────────────────────────────────────────────────────
ALTER TABLE public.erp_pedidos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pedidos_all" ON public.erp_pedidos;
CREATE POLICY "pedidos_all" ON public.erp_pedidos FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.erp_pedidos TO anon, authenticated, service_role;

-- ── erp_pedidos_itens ─────────────────────────────────────────────────────────
ALTER TABLE public.erp_pedidos_itens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pedidos_itens_all" ON public.erp_pedidos_itens;
CREATE POLICY "pedidos_itens_all" ON public.erp_pedidos_itens FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.erp_pedidos_itens TO anon, authenticated, service_role;

-- ── erp_financeiro_lancamentos ────────────────────────────────────────────────
ALTER TABLE public.erp_financeiro_lancamentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lancamentos_all" ON public.erp_financeiro_lancamentos;
CREATE POLICY "lancamentos_all" ON public.erp_financeiro_lancamentos FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.erp_financeiro_lancamentos TO anon, authenticated, service_role;

-- ── erp_contas_bancarias ──────────────────────────────────────────────────────
ALTER TABLE public.erp_contas_bancarias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contas_bancarias_all" ON public.erp_contas_bancarias;
CREATE POLICY "contas_bancarias_all" ON public.erp_contas_bancarias FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.erp_contas_bancarias TO anon, authenticated, service_role;

-- ── erp_atendimentos ──────────────────────────────────────────────────────────
ALTER TABLE public.erp_atendimentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "atendimentos_all" ON public.erp_atendimentos;
CREATE POLICY "atendimentos_all" ON public.erp_atendimentos FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.erp_atendimentos TO anon, authenticated, service_role;

-- ── erp_atividades ────────────────────────────────────────────────────────────
ALTER TABLE public.erp_atividades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "atividades_all" ON public.erp_atividades;
CREATE POLICY "atividades_all" ON public.erp_atividades FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.erp_atividades TO anon, authenticated, service_role;

-- ── erp_projetos ──────────────────────────────────────────────────────────────
ALTER TABLE public.erp_projetos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "projetos_all" ON public.erp_projetos;
CREATE POLICY "projetos_all" ON public.erp_projetos FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.erp_projetos TO anon, authenticated, service_role;

-- ── erp_grupos_projetos ───────────────────────────────────────────────────────
ALTER TABLE public.erp_grupos_projetos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "grupos_projetos_all" ON public.erp_grupos_projetos;
CREATE POLICY "grupos_projetos_all" ON public.erp_grupos_projetos FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.erp_grupos_projetos TO anon, authenticated, service_role;

-- ── erp_empresas ──────────────────────────────────────────────────────────────
ALTER TABLE public.erp_empresas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "empresas_all" ON public.erp_empresas;
CREATE POLICY "empresas_all" ON public.erp_empresas FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.erp_empresas TO anon, authenticated, service_role;

-- ── Confirmação ───────────────────────────────────────────────────────────────
SELECT tablename, rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'erp_clientes', 'erp_fornecedores', 'erp_grupo_produtos', 'erp_produtos',
    'erp_estoque_movimentos', 'erp_pedidos', 'erp_pedidos_itens',
    'erp_financeiro_lancamentos', 'erp_contas_bancarias',
    'erp_atendimentos', 'erp_atividades', 'erp_projetos',
    'erp_grupos_projetos', 'erp_empresas'
  )
ORDER BY tablename;
