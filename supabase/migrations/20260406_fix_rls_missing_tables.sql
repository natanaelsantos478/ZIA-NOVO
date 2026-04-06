-- =============================================================================
-- MIGRATION: Fix RLS — Habilitar RLS nas tabelas sem políticas de segurança
-- Tabelas: salary_history, position_history, bank_change_requests,
--          activity_automations, schedules, activity_groups, ia_alertas
--
-- PADRÃO: igual ao 20260316_rls_jwt_claims.sql
--   • zia_is_admin()  → admin ZIA vê tudo (app_metadata.is_admin = true)
--   • zia_no_auth()   → sem JWT (modo transição) permite acesso temporariamente
--   • zia_scope_ids() → filtra pelas empresa(s) do operador logado
--
-- FUNÇÕES HELPER (já criadas em 20260316_rls_jwt_claims.sql):
--   zia_is_admin(), zia_scope_ids(), zia_no_auth()
--
-- APLIQUE NO SUPABASE DASHBOARD > SQL EDITOR
-- =============================================================================

-- ── 1. salary_history ────────────────────────────────────────────────────────
-- Histórico salarial: dado crítico — acesso via employee_id → employees.zia_company_id
-- Sem coluna de tenant direto: subquery verifica empresa do funcionário
ALTER TABLE public.salary_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "salary_history_tenant" ON public.salary_history;
CREATE POLICY "salary_history_tenant" ON public.salary_history FOR ALL
  USING (
    zia_is_admin()
    OR zia_no_auth()
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = salary_history.employee_id
        AND e.zia_company_id = ANY(zia_scope_ids())
    )
  )
  WITH CHECK (
    zia_is_admin()
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = salary_history.employee_id
        AND e.zia_company_id = ANY(zia_scope_ids())
    )
  );

-- ── 2. position_history ──────────────────────────────────────────────────────
-- Histórico de cargos: mesmo padrão via employee_id → employees.zia_company_id
ALTER TABLE public.position_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "position_history_tenant" ON public.position_history;
CREATE POLICY "position_history_tenant" ON public.position_history FOR ALL
  USING (
    zia_is_admin()
    OR zia_no_auth()
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = position_history.employee_id
        AND e.zia_company_id = ANY(zia_scope_ids())
    )
  )
  WITH CHECK (
    zia_is_admin()
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = position_history.employee_id
        AND e.zia_company_id = ANY(zia_scope_ids())
    )
  );

-- ── 3. bank_change_requests ──────────────────────────────────────────────────
-- Solicitações de alteração bancária (dados PIX/agência/conta): dado sensível
-- Acesso via employee_id → employees.zia_company_id
ALTER TABLE public.bank_change_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bank_change_requests_tenant" ON public.bank_change_requests;
CREATE POLICY "bank_change_requests_tenant" ON public.bank_change_requests FOR ALL
  USING (
    zia_is_admin()
    OR zia_no_auth()
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = bank_change_requests.employee_id
        AND e.zia_company_id = ANY(zia_scope_ids())
    )
  )
  WITH CHECK (
    zia_is_admin()
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = bank_change_requests.employee_id
        AND e.zia_company_id = ANY(zia_scope_ids())
    )
  );

-- ── 4. activity_automations ──────────────────────────────────────────────────
-- Automações de atividades: acesso via employee_id → employees.zia_company_id
ALTER TABLE public.activity_automations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "activity_automations_tenant" ON public.activity_automations;
CREATE POLICY "activity_automations_tenant" ON public.activity_automations FOR ALL
  USING (
    zia_is_admin()
    OR zia_no_auth()
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = activity_automations.employee_id
        AND e.zia_company_id = ANY(zia_scope_ids())
    )
  )
  WITH CHECK (
    zia_is_admin()
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = activity_automations.employee_id
        AND e.zia_company_id = ANY(zia_scope_ids())
    )
  );

-- ── 5. schedules ─────────────────────────────────────────────────────────────
-- Escalas de trabalho por empresa: tem company_id diretamente
-- Cast ::text necessário pois zia_scope_ids() retorna text[] e company_id pode ser UUID
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "schedules_tenant" ON public.schedules;
CREATE POLICY "schedules_tenant" ON public.schedules FOR ALL
  USING (
    zia_is_admin()
    OR zia_no_auth()
    OR company_id::text = ANY(zia_scope_ids())
  )
  WITH CHECK (
    zia_is_admin()
    OR company_id::text = ANY(zia_scope_ids())
  );

-- ── 6. activity_groups ───────────────────────────────────────────────────────
-- Grupos de atividade: dado de CONFIGURAÇÃO GLOBAL sem vínculo com tenant
-- Idêntico ao tratamento de crm_funil_etapas e erp_produto_imagens
ALTER TABLE public.activity_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "activity_groups_all" ON public.activity_groups;
CREATE POLICY "activity_groups_all" ON public.activity_groups
  FOR ALL USING (true) WITH CHECK (true);

-- ── 7. ia_alertas ────────────────────────────────────────────────────────────
-- Alertas da IA: tem tenant_id diretamente (padrão idêntico ao ERP/CRM)
-- Cast ::text necessário se tenant_id for UUID
ALTER TABLE public.ia_alertas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ia_alertas_tenant" ON public.ia_alertas;
CREATE POLICY "ia_alertas_tenant" ON public.ia_alertas FOR ALL
  USING (
    zia_is_admin()
    OR zia_no_auth()
    OR tenant_id::text = ANY(zia_scope_ids())
  )
  WITH CHECK (
    zia_is_admin()
    OR tenant_id::text = ANY(zia_scope_ids())
  );

-- ── GRANTs ────────────────────────────────────────────────────────────────────
-- Garante acesso ao role anon (usado pelo app no modo de transição sem JWT)
GRANT ALL ON public.salary_history       TO anon, authenticated, service_role;
GRANT ALL ON public.position_history     TO anon, authenticated, service_role;
GRANT ALL ON public.bank_change_requests TO anon, authenticated, service_role;
GRANT ALL ON public.activity_automations TO anon, authenticated, service_role;
GRANT ALL ON public.schedules            TO anon, authenticated, service_role;
GRANT ALL ON public.activity_groups      TO anon, authenticated, service_role;
GRANT ALL ON public.ia_alertas           TO anon, authenticated, service_role;

-- ── Verificação ───────────────────────────────────────────────────────────────
-- Execute após aplicar para confirmar que RLS está ativo e as policies foram criadas
SELECT
  pt.tablename,
  pt.rowsecurity                                                      AS rls_enabled,
  (SELECT count(*) FROM pg_policies pp WHERE pp.tablename = pt.tablename) AS policy_count,
  string_agg(pp.policyname, ', ' ORDER BY pp.policyname)             AS policies
FROM pg_tables pt
LEFT JOIN pg_policies pp ON pp.tablename = pt.tablename AND pp.schemaname = 'public'
WHERE pt.schemaname = 'public'
  AND pt.tablename IN (
    'salary_history', 'position_history', 'bank_change_requests',
    'activity_automations', 'schedules', 'activity_groups', 'ia_alertas'
  )
GROUP BY pt.tablename, pt.rowsecurity
ORDER BY pt.tablename;
