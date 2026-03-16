-- =============================================================================
-- MIGRATION: RLS baseada em JWT claims — isolamento real de tenant
--
-- COMO FUNCIONA:
--   • Ao fazer login, a Edge Function `zia-auth` emite um JWT assinado com:
--       app_metadata.is_admin    = true/false
--       app_metadata.scope_ids   = ["holding-xxx", "matrix-yyy", ...]
--   • O cliente Supabase inclui esse JWT em todas as requisições
--   • As funções abaixo leem os claims do JWT e o RLS decide acesso por linha
--
-- ADMIN ZIA:
--   • JWT tem { is_admin: true } → zia_is_admin() retorna true → vê TUDO
--   • Nunca precisa de scope_ids — o flag basta
--
-- DURANTE TRANSIÇÃO (antes de deploiar a Edge Function):
--   • Sem JWT: auth.jwt() é null → zia_is_admin() = false, zia_scope_ids() = {}
--   • Para não quebrar o app durante a transição, as policies incluem
--     zia_no_auth() que permite acesso quando não há JWT (comportamento atual).
--   • REMOVA zia_no_auth() das policies após confirmar que a Edge Function
--     está funcionando em produção.
--
-- APLIQUE ESTA MIGRATION NO SUPABASE DASHBOARD > SQL EDITOR
-- =============================================================================

-- ── 1. Funções helper ─────────────────────────────────────────────────────────

-- Retorna true se o JWT atual pertence ao admin ZIA (acesso irrestrito)
CREATE OR REPLACE FUNCTION zia_is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean,
    false
  )
$$;

-- Retorna os IDs de empresa acessíveis pelo JWT atual
CREATE OR REPLACE FUNCTION zia_scope_ids()
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT ARRAY(
    SELECT jsonb_array_elements_text(
      COALESCE(auth.jwt() -> 'app_metadata' -> 'scope_ids', '[]'::jsonb)
    )
  )
$$;

-- Retorna true quando não há JWT (app sem Edge Function deployada — modo de transição)
-- ATENÇÃO: Remover esta função e seu uso nas policies após confirmar o deploy da Edge Function
CREATE OR REPLACE FUNCTION zia_no_auth()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT auth.jwt() IS NULL
$$;

-- ── 2. Tabelas de autenticação — continuam públicas ───────────────────────────
-- Necessário para carregar perfis e empresas antes do login

-- zia_operator_profiles: mantém USING(true) — lista de perfis é necessária para o login
DROP POLICY IF EXISTS "profiles_all" ON public.zia_operator_profiles;
CREATE POLICY "profiles_all" ON public.zia_operator_profiles
  FOR ALL USING (true) WITH CHECK (true);

-- zia_companies: mantém USING(true) — lista de empresas é necessária para o login
DROP POLICY IF EXISTS "companies_all" ON public.zia_companies;
CREATE POLICY "companies_all" ON public.zia_companies
  FOR ALL USING (true) WITH CHECK (true);

-- ── 3. Macro para simplificar a criação de policies ───────────────────────────
-- (PostgreSQL não suporta macros, mas usamos funções acima + padrão repetido)

-- ── 4. Tabelas HR (coluna: zia_company_id) ───────────────────────────────────

-- employees
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "employees_all"    ON public.employees;
DROP POLICY IF EXISTS "employees_tenant" ON public.employees;
CREATE POLICY "employees_tenant" ON public.employees FOR ALL
  USING (zia_is_admin() OR zia_no_auth() OR zia_company_id = ANY(zia_scope_ids()))
  WITH CHECK (zia_is_admin() OR zia_company_id = ANY(zia_scope_ids()));

-- departments
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "departments_all"    ON public.departments;
DROP POLICY IF EXISTS "departments_tenant" ON public.departments;
CREATE POLICY "departments_tenant" ON public.departments FOR ALL
  USING (zia_is_admin() OR zia_no_auth() OR zia_company_id = ANY(zia_scope_ids()))
  WITH CHECK (zia_is_admin() OR zia_company_id = ANY(zia_scope_ids()));

-- hr_commissions (zia_company_id como uuid — compatível com text ANY())
ALTER TABLE public.hr_commissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hr_commissions_all"    ON public.hr_commissions;
DROP POLICY IF EXISTS "hr_commissions_tenant" ON public.hr_commissions;
CREATE POLICY "hr_commissions_tenant" ON public.hr_commissions FOR ALL
  USING (zia_is_admin() OR zia_no_auth() OR zia_company_id::text = ANY(zia_scope_ids()))
  WITH CHECK (zia_is_admin() OR zia_company_id::text = ANY(zia_scope_ids()));

-- ── 5. Tabelas ERP (coluna: tenant_id) ───────────────────────────────────────

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'erp_clientes', 'erp_fornecedores', 'erp_grupo_produtos', 'erp_produtos',
    'erp_estoque_movimentos', 'erp_pedidos', 'erp_pedidos_itens',
    'erp_financeiro_lancamentos', 'erp_contas_bancarias',
    'erp_atendimentos', 'erp_atividades', 'erp_projetos', 'erp_grupos_projetos',
    'erp_empresas', 'erp_caixa_sessoes', 'erp_caixa_transacoes',
    'erp_caixa_vendas', 'erp_caixa_venda_itens'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_all"           ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "tenant_isolation" ON public.%I FOR ALL
         USING (zia_is_admin() OR zia_no_auth() OR tenant_id = ANY(zia_scope_ids()))
         WITH CHECK (zia_is_admin() OR tenant_id = ANY(zia_scope_ids()))',
      t
    );
  END LOOP;
END $$;

-- erp_assinaturas (se existir)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='erp_assinaturas') THEN
    ALTER TABLE public.erp_assinaturas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "tenant_isolation" ON public.erp_assinaturas;
    CREATE POLICY "tenant_isolation" ON public.erp_assinaturas FOR ALL
      USING (zia_is_admin() OR zia_no_auth() OR tenant_id = ANY(zia_scope_ids()))
      WITH CHECK (zia_is_admin() OR tenant_id = ANY(zia_scope_ids()));
  END IF;
END $$;

-- ── 6. Tabelas Financeiro (coluna: tenant_id) ─────────────────────────────────

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'fin_nos_custo', 'fin_arestas_custo', 'fin_grupos_custo',
    'fin_impostos', 'fin_snapshots_custo'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "fin_%s_all"       ON public.%I', replace(t,'fin_',''), t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_all"           ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "tenant_isolation" ON public.%I FOR ALL
         USING (zia_is_admin() OR zia_no_auth() OR tenant_id = ANY(zia_scope_ids()))
         WITH CHECK (zia_is_admin() OR tenant_id = ANY(zia_scope_ids()))',
      t
    );
  END LOOP;
END $$;

-- ── 7. Tabelas CRM (coluna: tenant_id) ───────────────────────────────────────

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'crm_negociacoes', 'crm_atendimentos', 'crm_compromissos',
    'crm_orcamentos', 'crm_orcamento_itens', 'crm_anotacoes',
    'crm_funis_venda', 'crm_funis'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_all"           ON public.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "tenant_isolation" ON public.%I FOR ALL
         USING (zia_is_admin() OR zia_no_auth() OR tenant_id = ANY(zia_scope_ids()))
         WITH CHECK (zia_is_admin() OR tenant_id = ANY(zia_scope_ids()))',
      t
    );
  END LOOP;
END $$;

-- crm_funil_etapas (sem tenant_id direto — acesso via funil pai, mantém USING true)
ALTER TABLE public.crm_funil_etapas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "funil_etapas_all"    ON public.crm_funil_etapas;
DROP POLICY IF EXISTS "tenant_isolation"    ON public.crm_funil_etapas;
CREATE POLICY "funil_etapas_all" ON public.crm_funil_etapas
  FOR ALL USING (true) WITH CHECK (true);

-- crm_orcamento_config e crm_orcamento_apresentacoes (sem tenant_id)
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['crm_orcamento_config','crm_orcamento_apresentacoes','erp_produto_imagens'] LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation" ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS "p_orc_config_all" ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS "p_orc_apres_all"  ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS "p_prod_img_all"   ON public.%I', t);
      EXECUTE format('CREATE POLICY "all_access" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t);
    END IF;
  END LOOP;
END $$;

-- ── 8. GRANTs (garantir acesso ao role anon) ──────────────────────────────────

GRANT EXECUTE ON FUNCTION zia_is_admin()  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION zia_scope_ids() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION zia_no_auth()   TO anon, authenticated;

-- ── 9. Verificação ────────────────────────────────────────────────────────────

SELECT
  tablename,
  rowsecurity AS rls_enabled,
  (SELECT count(*) FROM pg_policies WHERE tablename = pt.tablename) AS policy_count
FROM pg_tables pt
WHERE schemaname = 'public'
  AND tablename IN (
    'employees','departments','hr_commissions',
    'erp_clientes','erp_produtos','erp_pedidos',
    'fin_nos_custo','crm_negociacoes','zia_companies','zia_operator_profiles'
  )
ORDER BY tablename;
