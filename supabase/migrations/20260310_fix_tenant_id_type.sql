-- =============================================================================
-- MIGRATION: Altera tenant_id de uuid para text em todas as tabelas ERP
-- Deve dropar policies que dependem da coluna antes de alterar o tipo.
-- Execute no SQL Editor do Supabase Dashboard.
-- =============================================================================

-- ── 1. Drop de TODAS as policies que referenciam tenant_id ───────────────────

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'erp_clientes','erp_fornecedores','erp_grupo_produtos','erp_produtos',
        'erp_estoque_movimentos','erp_pedidos','erp_pedidos_itens',
        'erp_financeiro_lancamentos','erp_contas_bancarias','erp_atendimentos',
        'erp_atividades','erp_projetos','erp_grupos_projetos','erp_empresas',
        'erp_caixa_sessoes','erp_caixa_transacoes','erp_caixa_vendas','erp_caixa_venda_itens'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ── 2. Altera tenant_id para text ────────────────────────────────────────────

ALTER TABLE public.erp_clientes               ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
ALTER TABLE public.erp_fornecedores           ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
ALTER TABLE public.erp_grupo_produtos         ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
ALTER TABLE public.erp_produtos               ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
ALTER TABLE public.erp_estoque_movimentos     ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
ALTER TABLE public.erp_pedidos                ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
ALTER TABLE public.erp_pedidos_itens          ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
ALTER TABLE public.erp_financeiro_lancamentos ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
ALTER TABLE public.erp_contas_bancarias       ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
ALTER TABLE public.erp_atendimentos           ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
ALTER TABLE public.erp_atividades             ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
ALTER TABLE public.erp_projetos               ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
ALTER TABLE public.erp_grupos_projetos        ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
ALTER TABLE public.erp_empresas               ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
ALTER TABLE public.erp_caixa_sessoes          ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
ALTER TABLE public.erp_caixa_transacoes       ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
ALTER TABLE public.erp_caixa_vendas           ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
ALTER TABLE public.erp_caixa_venda_itens      ALTER COLUMN tenant_id TYPE text USING tenant_id::text;

-- ── 3. Recria policies permissivas (app usa anon sem Supabase Auth) ──────────

CREATE POLICY "clientes_all"              ON public.erp_clientes               FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "fornecedores_all"          ON public.erp_fornecedores            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "grupo_produtos_all"        ON public.erp_grupo_produtos          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "produtos_all"              ON public.erp_produtos                FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "movimentos_all"            ON public.erp_estoque_movimentos      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "pedidos_all"               ON public.erp_pedidos                 FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "pedidos_itens_all"         ON public.erp_pedidos_itens           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "lancamentos_all"           ON public.erp_financeiro_lancamentos  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "contas_bancarias_all"      ON public.erp_contas_bancarias        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "atendimentos_all"          ON public.erp_atendimentos            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "atividades_all"            ON public.erp_atividades              FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "projetos_all"              ON public.erp_projetos                FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "grupos_projetos_all"       ON public.erp_grupos_projetos         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "empresas_all"              ON public.erp_empresas                FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "caixa_sessoes_all"         ON public.erp_caixa_sessoes           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "caixa_transacoes_all"      ON public.erp_caixa_transacoes        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "caixa_vendas_all"          ON public.erp_caixa_vendas            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "caixa_venda_itens_all"     ON public.erp_caixa_venda_itens       FOR ALL USING (true) WITH CHECK (true);

-- ── 4. Confirmação ───────────────────────────────────────────────────────────

SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'tenant_id'
ORDER BY table_name;
