-- =============================================================================
-- MIGRATION: Fix RLS nas tabelas do módulo Financeiro (fin_*)
-- O app roda como usuário anônimo (sem Supabase Auth).
-- A migration anterior (20260315_fin_erp_grants) só adicionou GRANT mas
-- não criou as RLS policies — resultado: "violates row-level security policy".
-- Padrão idêntico ao 20260310_fix_erp_tables_rls.sql aplicado nas tabelas ERP.
-- Execute no SQL Editor do Supabase Dashboard.
-- =============================================================================

-- ── fin_nos_custo ─────────────────────────────────────────────────────────────
ALTER TABLE public.fin_nos_custo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "nos_custo_all"  ON public.fin_nos_custo;
DROP POLICY IF EXISTS "fin_nos_all"    ON public.fin_nos_custo;
CREATE POLICY "fin_nos_all" ON public.fin_nos_custo FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.fin_nos_custo TO anon, authenticated, service_role;

-- ── fin_arestas_custo ─────────────────────────────────────────────────────────
ALTER TABLE public.fin_arestas_custo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "arestas_custo_all" ON public.fin_arestas_custo;
DROP POLICY IF EXISTS "fin_arestas_all"   ON public.fin_arestas_custo;
CREATE POLICY "fin_arestas_all" ON public.fin_arestas_custo FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.fin_arestas_custo TO anon, authenticated, service_role;

-- ── fin_grupos_custo ──────────────────────────────────────────────────────────
ALTER TABLE public.fin_grupos_custo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "grupos_custo_all" ON public.fin_grupos_custo;
DROP POLICY IF EXISTS "fin_grupos_all"   ON public.fin_grupos_custo;
CREATE POLICY "fin_grupos_all" ON public.fin_grupos_custo FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.fin_grupos_custo TO anon, authenticated, service_role;

-- ── fin_impostos ──────────────────────────────────────────────────────────────
ALTER TABLE public.fin_impostos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "impostos_all"     ON public.fin_impostos;
DROP POLICY IF EXISTS "fin_impostos_all" ON public.fin_impostos;
CREATE POLICY "fin_impostos_all" ON public.fin_impostos FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.fin_impostos TO anon, authenticated, service_role;

-- ── fin_snapshots_custo ───────────────────────────────────────────────────────
ALTER TABLE public.fin_snapshots_custo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "snapshots_custo_all" ON public.fin_snapshots_custo;
DROP POLICY IF EXISTS "fin_snapshots_all"   ON public.fin_snapshots_custo;
CREATE POLICY "fin_snapshots_all" ON public.fin_snapshots_custo FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.fin_snapshots_custo TO anon, authenticated, service_role;

-- ── Confirmação ───────────────────────────────────────────────────────────────
SELECT tablename, rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'fin_nos_custo', 'fin_arestas_custo', 'fin_grupos_custo',
    'fin_impostos', 'fin_snapshots_custo'
  )
ORDER BY tablename;
