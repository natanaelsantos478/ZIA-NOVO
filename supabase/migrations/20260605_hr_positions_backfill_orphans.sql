-- =============================================================================
-- 20260605_hr_positions_backfill_orphans.sql
-- Backfill de positions órfãs (sem zia_company_id E sem department_id).
-- A migration 20260605_hr_tables_fix tentou popular via JOIN com departments,
-- mas todos os 20 positions estavam sem department_id → 0 linhas atualizadas
-- e ficaram invisíveis à RLS. Atribui ao DEFAULT_TENANT (holding raiz).
-- =============================================================================
UPDATE public.positions
SET    zia_company_id = '00000000-0000-0000-0000-000000000001'
WHERE  zia_company_id IS NULL;
