-- =============================================================================
-- MIGRATION: Fix RLS — Habilitar RLS nas tabelas sem políticas de segurança
-- Tabelas: salary_history, position_history, bank_change_requests,
--          activity_automations, schedules, activity_groups, ia_alertas
--
-- FUNÇÃO USADA: tenant_in_scope(text) — já existe no banco
--   Retorna true se:
--     • JWT tem app_metadata.is_admin = true  (admin ZIA)
--     • OU o id passado está em app_metadata.scope_ids (empresas do operador)
--
-- NOTA: as funções zia_is_admin() / zia_scope_ids() / zia_no_auth() referenciadas
-- em migrações anteriores nunca foram aplicadas ao banco. tenant_in_scope() é a
-- função equivalente que está efetivamente deployada.
--
-- APLIQUE NO SUPABASE DASHBOARD > SQL EDITOR
-- =============================================================================

-- ── 1. salary_history ────────────────────────────────────────────────────────
-- Histórico salarial: acesso via employee_id → employees.zia_company_id (text)
ALTER TABLE public.salary_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "salary_history_tenant" ON public.salary_history;
CREATE POLICY "salary_history_tenant" ON public.salary_history FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = salary_history.employee_id
        AND tenant_in_scope(e.zia_company_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = salary_history.employee_id
        AND tenant_in_scope(e.zia_company_id)
    )
  );

-- ── 2. position_history ──────────────────────────────────────────────────────
-- Histórico de cargos: mesmo padrão via employee_id → employees.zia_company_id
ALTER TABLE public.position_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "position_history_tenant" ON public.position_history;
CREATE POLICY "position_history_tenant" ON public.position_history FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = position_history.employee_id
        AND tenant_in_scope(e.zia_company_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = position_history.employee_id
        AND tenant_in_scope(e.zia_company_id)
    )
  );

-- ── 3. bank_change_requests ──────────────────────────────────────────────────
-- Dados bancários sensíveis (PIX/agência/conta): via employee_id
ALTER TABLE public.bank_change_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bank_change_requests_tenant" ON public.bank_change_requests;
CREATE POLICY "bank_change_requests_tenant" ON public.bank_change_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = bank_change_requests.employee_id
        AND tenant_in_scope(e.zia_company_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = bank_change_requests.employee_id
        AND tenant_in_scope(e.zia_company_id)
    )
  );

-- ── 4. activity_automations ──────────────────────────────────────────────────
-- employee_id é nullable (automações globais de módulo não têm funcionário)
-- Quando NULL: acesso permitido (automação global)
-- Quando preenchido: filtra pela empresa do funcionário
ALTER TABLE public.activity_automations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "activity_automations_tenant" ON public.activity_automations;
CREATE POLICY "activity_automations_tenant" ON public.activity_automations FOR ALL
  USING (
    employee_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = activity_automations.employee_id
        AND tenant_in_scope(e.zia_company_id)
    )
  )
  WITH CHECK (
    employee_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = activity_automations.employee_id
        AND tenant_in_scope(e.zia_company_id)
    )
  );

-- ── 5. schedules ─────────────────────────────────────────────────────────────
-- Escalas por empresa: company_id é UUID, cast para text necessário
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "schedules_tenant" ON public.schedules;
CREATE POLICY "schedules_tenant" ON public.schedules FOR ALL
  USING  (tenant_in_scope(company_id::text))
  WITH CHECK (tenant_in_scope(company_id::text));

-- ── 6. activity_groups ───────────────────────────────────────────────────────
-- Configuração global sem vínculo com tenant (igual a crm_funil_etapas)
ALTER TABLE public.activity_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "activity_groups_all" ON public.activity_groups;
CREATE POLICY "activity_groups_all" ON public.activity_groups
  FOR ALL USING (true) WITH CHECK (true);

-- ── 7. ia_alertas ────────────────────────────────────────────────────────────
-- tenant_id é text — sem cast necessário
ALTER TABLE public.ia_alertas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ia_alertas_tenant" ON public.ia_alertas;
CREATE POLICY "ia_alertas_tenant" ON public.ia_alertas FOR ALL
  USING  (tenant_in_scope(tenant_id))
  WITH CHECK (tenant_in_scope(tenant_id));

-- ── GRANTs ────────────────────────────────────────────────────────────────────
GRANT ALL ON public.salary_history       TO anon, authenticated, service_role;
GRANT ALL ON public.position_history     TO anon, authenticated, service_role;
GRANT ALL ON public.bank_change_requests TO anon, authenticated, service_role;
GRANT ALL ON public.activity_automations TO anon, authenticated, service_role;
GRANT ALL ON public.schedules            TO anon, authenticated, service_role;
GRANT ALL ON public.activity_groups      TO anon, authenticated, service_role;
GRANT ALL ON public.ia_alertas           TO anon, authenticated, service_role;

-- ── Verificação ───────────────────────────────────────────────────────────────
SELECT
  pt.tablename,
  pt.rowsecurity                                                       AS rls_enabled,
  COUNT(pp.policyname)                                                 AS policy_count,
  string_agg(pp.policyname, ', ' ORDER BY pp.policyname)              AS policies
FROM pg_tables pt
LEFT JOIN pg_policies pp ON pp.tablename = pt.tablename AND pp.schemaname = 'public'
WHERE pt.schemaname = 'public'
  AND pt.tablename IN (
    'salary_history', 'position_history', 'bank_change_requests',
    'activity_automations', 'schedules', 'activity_groups', 'ia_alertas'
  )
GROUP BY pt.tablename, pt.rowsecurity
ORDER BY pt.tablename;
