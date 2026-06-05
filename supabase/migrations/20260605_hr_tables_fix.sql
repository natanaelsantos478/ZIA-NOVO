-- =============================================================================
-- 20260605_hr_tables_fix.sql
-- Corrige tabelas RH:
--   1. Adiciona zia_company_id em positions (backfill via department)
--   2. Ativa RLS real (tenant_isolation) em positions
--   3. Adiciona avg_cycle_time / last_execution_at em activity_groups
--   4. Cria hr_automation_rules — regras de automação de atividades
-- =============================================================================

-- ── 1. positions: adiciona zia_company_id e backfill ──────────────────────────
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS zia_company_id text;

UPDATE public.positions p
SET    zia_company_id = d.zia_company_id
FROM   public.departments d
WHERE  d.id = p.department_id
  AND  p.zia_company_id IS NULL;

-- RLS: agora com isolamento real
DROP POLICY IF EXISTS "authenticated_rw"  ON public.positions;
DROP POLICY IF EXISTS "tenant_isolation"  ON public.positions;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON public.positions
  FOR ALL TO authenticated
  USING      (zia_is_admin() OR tenant_in_scope(zia_company_id))
  WITH CHECK (zia_is_admin() OR tenant_in_scope(zia_company_id));
REVOKE ALL  ON public.positions FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.positions TO authenticated;

-- ── 2. activity_groups: colunas de ciclo médio e última execução ──────────────
ALTER TABLE public.activity_groups ADD COLUMN IF NOT EXISTS avg_cycle_time    text;
ALTER TABLE public.activity_groups ADD COLUMN IF NOT EXISTS last_execution_at timestamptz;

-- ── 3. hr_automation_rules ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hr_automation_rules (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  zia_company_id       text        NOT NULL,
  name                 text        NOT NULL,
  trigger_type         text        NOT NULL DEFAULT 'Manual',
  trigger_module       text,
  trigger_sub_module   text,
  trigger_action       text,
  trigger_detail       text,
  assignee             text,
  department           text,
  status               text        NOT NULL DEFAULT 'Rascunho',
  chain_next_id        uuid        REFERENCES public.hr_automation_rules(id) ON DELETE SET NULL,
  tags                 jsonb       NOT NULL DEFAULT '[]',
  avg_duration_minutes integer     NOT NULL DEFAULT 0,
  total_executions     integer     NOT NULL DEFAULT 0,
  labor_cost_hourly    numeric(10,2) NOT NULL DEFAULT 0,
  material_cost        numeric(10,2) NOT NULL DEFAULT 0,
  logistics_cost       numeric(10,2) NOT NULL DEFAULT 0,
  tax_rate             numeric(6,4)  NOT NULL DEFAULT 0,
  revenue              numeric(12,2) NOT NULL DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hr_automation_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON public.hr_automation_rules;
CREATE POLICY tenant_isolation ON public.hr_automation_rules
  FOR ALL TO authenticated
  USING      (zia_is_admin() OR tenant_in_scope(zia_company_id))
  WITH CHECK (zia_is_admin() OR tenant_in_scope(zia_company_id));
REVOKE ALL  ON public.hr_automation_rules FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_automation_rules TO authenticated;

CREATE INDEX IF NOT EXISTS idx_hr_auto_rules_company ON public.hr_automation_rules(zia_company_id);
CREATE INDEX IF NOT EXISTS idx_hr_auto_rules_chain   ON public.hr_automation_rules(chain_next_id);
