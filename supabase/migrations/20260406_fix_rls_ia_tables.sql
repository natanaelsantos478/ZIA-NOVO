-- =============================================================================
-- MIGRATION: Fix RLS — Corrigir policies "always true" nas tabelas IA
-- Tabelas: ia_conversas, ia_mensagens, ia_acoes_log
--
-- PROBLEMA: criadas em 20260316_ia_agent_tables.sql com USING (true) sem
-- filtro de tenant — qualquer operador autenticado vê dados de outros tenants.
--
-- CORREÇÃO: substituir por tenant_id::text = ANY(zia_scope_ids())
-- mesmo padrão das tabelas ERP/CRM em 20260316_rls_jwt_claims.sql
--
-- APLIQUE NO SUPABASE DASHBOARD > SQL EDITOR
-- =============================================================================

-- ── ia_conversas ─────────────────────────────────────────────────────────────
-- tenant_id UUID NOT NULL (definido em 20260316_ia_agent_tables.sql)
DROP POLICY IF EXISTS "ia_conversas_all"    ON public.ia_conversas;
DROP POLICY IF EXISTS "ia_conversas_tenant" ON public.ia_conversas;
CREATE POLICY "ia_conversas_tenant" ON public.ia_conversas FOR ALL
  USING (
    zia_is_admin()
    OR zia_no_auth()
    OR tenant_id::text = ANY(zia_scope_ids())
  )
  WITH CHECK (
    zia_is_admin()
    OR tenant_id::text = ANY(zia_scope_ids())
  );

-- ── ia_mensagens ──────────────────────────────────────────────────────────────
-- tenant_id UUID NOT NULL
DROP POLICY IF EXISTS "ia_mensagens_all"    ON public.ia_mensagens;
DROP POLICY IF EXISTS "ia_mensagens_tenant" ON public.ia_mensagens;
CREATE POLICY "ia_mensagens_tenant" ON public.ia_mensagens FOR ALL
  USING (
    zia_is_admin()
    OR zia_no_auth()
    OR tenant_id::text = ANY(zia_scope_ids())
  )
  WITH CHECK (
    zia_is_admin()
    OR tenant_id::text = ANY(zia_scope_ids())
  );

-- ── ia_acoes_log ──────────────────────────────────────────────────────────────
-- tenant_id UUID NOT NULL
DROP POLICY IF EXISTS "ia_acoes_log_all"    ON public.ia_acoes_log;
DROP POLICY IF EXISTS "ia_acoes_log_tenant" ON public.ia_acoes_log;
CREATE POLICY "ia_acoes_log_tenant" ON public.ia_acoes_log FOR ALL
  USING (
    zia_is_admin()
    OR zia_no_auth()
    OR tenant_id::text = ANY(zia_scope_ids())
  )
  WITH CHECK (
    zia_is_admin()
    OR tenant_id::text = ANY(zia_scope_ids())
  );

-- ── Verificação ───────────────────────────────────────────────────────────────
SELECT
  pt.tablename,
  pt.rowsecurity                                                      AS rls_enabled,
  (SELECT count(*) FROM pg_policies pp WHERE pp.tablename = pt.tablename) AS policy_count,
  string_agg(pp.policyname, ', ' ORDER BY pp.policyname)             AS policies
FROM pg_tables pt
LEFT JOIN pg_policies pp ON pp.tablename = pt.tablename AND pp.schemaname = 'public'
WHERE pt.schemaname = 'public'
  AND pt.tablename IN ('ia_conversas', 'ia_mensagens', 'ia_acoes_log')
GROUP BY pt.tablename, pt.rowsecurity
ORDER BY pt.tablename;
