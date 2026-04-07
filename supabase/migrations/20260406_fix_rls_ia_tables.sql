-- =============================================================================
-- MIGRATION: Fix RLS — Corrigir policies "always true" nas tabelas IA
-- Tabelas: ia_conversas, ia_mensagens, ia_acoes_log
--
-- PROBLEMA: criadas com USING (true) sem filtro de tenant — e com policies
-- duplicadas (3 por tabela) acumuladas em migrations distintas.
--
-- CORREÇÃO: remover todas as policies duplicadas e substituir por isolamento
-- real usando tenant_in_scope(tenant_id::text).
-- tenant_id nestas tabelas é UUID — cast ::text necessário.
--
-- FUNÇÃO: tenant_in_scope(text) — deployada no banco
--   • app_metadata.is_admin = true  → acesso total (admin ZIA)
--   • id IN app_metadata.scope_ids  → acesso às empresas do operador
--
-- APLIQUE NO SUPABASE DASHBOARD > SQL EDITOR
-- =============================================================================

-- ── ia_conversas ─────────────────────────────────────────────────────────────
-- Remove as 3 policies USING(true) duplicadas antes de criar a correta
DROP POLICY IF EXISTS "ia_conversas_all"    ON public.ia_conversas;
DROP POLICY IF EXISTS "p_ia_conv"           ON public.ia_conversas;
DROP POLICY IF EXISTS "p_ia_conversas"      ON public.ia_conversas;
DROP POLICY IF EXISTS "ia_conversas_tenant" ON public.ia_conversas;
CREATE POLICY "ia_conversas_tenant" ON public.ia_conversas FOR ALL
  USING  (tenant_in_scope(tenant_id::text))
  WITH CHECK (tenant_in_scope(tenant_id::text));

-- ── ia_mensagens ──────────────────────────────────────────────────────────────
-- Remove as 3 policies USING(true) duplicadas
DROP POLICY IF EXISTS "ia_mensagens_all"    ON public.ia_mensagens;
DROP POLICY IF EXISTS "p_ia_mensagens"      ON public.ia_mensagens;
DROP POLICY IF EXISTS "p_ia_msg"            ON public.ia_mensagens;
DROP POLICY IF EXISTS "ia_mensagens_tenant" ON public.ia_mensagens;
CREATE POLICY "ia_mensagens_tenant" ON public.ia_mensagens FOR ALL
  USING  (tenant_in_scope(tenant_id::text))
  WITH CHECK (tenant_in_scope(tenant_id::text));

-- ── ia_acoes_log ──────────────────────────────────────────────────────────────
-- Remove as 3 policies USING(true) duplicadas
DROP POLICY IF EXISTS "ia_acoes_log_all"    ON public.ia_acoes_log;
DROP POLICY IF EXISTS "p_ia_acoes_log"      ON public.ia_acoes_log;
DROP POLICY IF EXISTS "p_ia_log"            ON public.ia_acoes_log;
DROP POLICY IF EXISTS "ia_acoes_log_tenant" ON public.ia_acoes_log;
CREATE POLICY "ia_acoes_log_tenant" ON public.ia_acoes_log FOR ALL
  USING  (tenant_in_scope(tenant_id::text))
  WITH CHECK (tenant_in_scope(tenant_id::text));

-- ── Verificação ───────────────────────────────────────────────────────────────
SELECT
  pt.tablename,
  pt.rowsecurity                                                       AS rls_enabled,
  COUNT(pp.policyname)                                                 AS policy_count,
  string_agg(pp.policyname, ', ' ORDER BY pp.policyname)              AS policies
FROM pg_tables pt
LEFT JOIN pg_policies pp ON pp.tablename = pt.tablename AND pp.schemaname = 'public'
WHERE pt.schemaname = 'public'
  AND pt.tablename IN ('ia_conversas', 'ia_mensagens', 'ia_acoes_log')
GROUP BY pt.tablename, pt.rowsecurity
ORDER BY pt.tablename;
