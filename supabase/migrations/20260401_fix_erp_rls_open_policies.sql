-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: substitui RLS baseada em JWT (tenant_in_scope) por políticas abertas.
--
-- Problema: a função tenant_in_scope() verificava scope_ids dentro do JWT
-- (auth.jwt() -> 'app_metadata' -> 'scope_ids'), mas o frontend nunca embute
-- esse claim no token. Resultado: todas as tabelas erp_* retornavam vazio.
--
-- Solução: usar política aberta (USING true), igual ao padrão de crm_negociacoes,
-- crm_orcamentos, etc. O isolamento por tenant é feito na camada de aplicação
-- via .in('tenant_id', tids) em erp.ts e crmData.ts.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND qual LIKE '%tenant_in_scope%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL USING (true) WITH CHECK (true)',
      r.policyname, r.tablename
    );
  END LOOP;
END $$;
