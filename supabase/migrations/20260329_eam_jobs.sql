-- =============================================================================
-- MIGRATION: EAM Jobs, Alerts e Integrações
-- Cria tabela de alertas, stored procedures para cron jobs e agendamentos.
-- =============================================================================

-- ── eam_asset_alerts ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.eam_asset_alerts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID        NOT NULL,
  type        TEXT        NOT NULL,
  -- warranty_expiring | insurance_expiring | os_overdue
  -- no_responsible | maintenance_overdue | depreciation_error
  title       TEXT        NOT NULL,
  description TEXT,
  severity    TEXT        NOT NULL DEFAULT 'info'
              CHECK (severity IN ('info', 'warning', 'critical')),
  asset_id    UUID,
  asset_name  TEXT,
  asset_tag   TEXT,
  resolved    BOOLEAN     NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.eam_asset_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "eam_asset_alerts_all" ON public.eam_asset_alerts;
CREATE POLICY "eam_asset_alerts_all" ON public.eam_asset_alerts
  FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.eam_asset_alerts TO anon, authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_eam_asset_alerts_tenant_resolved
  ON public.eam_asset_alerts(tenant_id, resolved, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_eam_asset_alerts_type
  ON public.eam_asset_alerts(type, created_at DESC);

-- ── Job 1: Depreciação mensal (todo dia 1º às 02:00) ─────────────────────────
-- Calcula snapshot de depreciação linear para todos os ativos ativos.
-- Tenta criar lançamento no financeiro (falha silenciosa + log).

CREATE OR REPLACE FUNCTION public.eam_job_depreciation()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r              RECORD;
  months_elapsed NUMERIC;
  monthly_quota  NUMERIC;
  new_book_value NUMERIC;
  snap_date      DATE := date_trunc('month', now())::date;
BEGIN
  FOR r IN
    SELECT *
    FROM public.assets
    WHERE status NOT IN ('descartado', 'alienado', 'extraviado')
      AND depreciation_start IS NOT NULL
      AND useful_life_months > 0
      AND acquisition_value > 0
  LOOP
    months_elapsed := EXTRACT(
      EPOCH FROM (snap_date - r.depreciation_start::date)
    ) / (86400.0 * 30.4375);

    IF months_elapsed < 0 OR months_elapsed >= r.useful_life_months THEN
      CONTINUE;
    END IF;

    monthly_quota  := ROUND(
      (r.acquisition_value - COALESCE(r.residual_value, 0)) / r.useful_life_months, 2
    );
    new_book_value := GREATEST(
      COALESCE(r.residual_value, 0),
      r.acquisition_value - (monthly_quota * (months_elapsed + 1))
    );

    -- Snapshot (ON CONFLICT DO NOTHING = idempotente)
    INSERT INTO public.asset_depreciation_snapshots (
      tenant_id, asset_id, reference_month,
      monthly_quota, accumulated_depreciation, book_value,
      method, created_at
    )
    VALUES (
      r.tenant_id, r.id, snap_date,
      monthly_quota, monthly_quota * (months_elapsed + 1), new_book_value,
      r.depreciation_method, now()
    )
    ON CONFLICT DO NOTHING;

    -- Atualiza valor contábil atual no ativo
    UPDATE public.assets
    SET current_book_value = new_book_value, updated_at = now()
    WHERE id = r.id;

    -- Tenta criar lançamento financeiro (falha silenciosa)
    BEGIN
      INSERT INTO public.erp_lancamentos (
        tenant_id, tipo, categoria, descricao,
        valor, data_vencimento, status, created_at
      ) VALUES (
        r.tenant_id, 'DESPESA', 'DEPRECIACAO_ATIVO',
        'Depreciação mensal - ' || r.name || ' (' || r.tag || ')',
        monthly_quota, snap_date, 'PENDENTE', now()
      );
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO public.eam_asset_alerts (
        tenant_id, type, title, description, severity,
        asset_id, asset_name, asset_tag
      ) VALUES (
        r.tenant_id, 'depreciation_error',
        'Erro ao criar lançamento de depreciação: ' || r.tag,
        SQLERRM, 'info', r.id, r.name, r.tag
      );
    END;
  END LOOP;
END;
$$;

-- ── Job 2: Alertas diários (todo dia às 08:00) ────────────────────────────────
-- Verifica garantias, apólices, OS vencidas e ativos sem responsável.

CREATE OR REPLACE FUNCTION public.eam_job_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r         RECORD;
  days_left INTEGER;
  today     DATE := CURRENT_DATE;
BEGIN
  -- 1. Garantias vencendo em 30, 15 ou 5 dias
  FOR r IN
    SELECT *
    FROM public.assets
    WHERE warranty_end IS NOT NULL
      AND status NOT IN ('descartado', 'alienado')
      AND warranty_end::date >= today
      AND warranty_end::date <= today + 30
  LOOP
    days_left := (r.warranty_end::date - today);
    IF days_left IN (30, 15, 5) THEN
      INSERT INTO public.eam_asset_alerts (
        tenant_id, type, title, description, severity,
        asset_id, asset_name, asset_tag
      ) VALUES (
        r.tenant_id, 'warranty_expiring',
        'Garantia vencendo em ' || days_left || ' dias: ' || r.name,
        'Ativo ' || r.tag || ' tem garantia expirando em '
          || to_char(r.warranty_end::date, 'DD/MM/YYYY'),
        CASE WHEN days_left <= 5 THEN 'critical'
             WHEN days_left <= 15 THEN 'warning'
             ELSE 'info' END,
        r.id, r.name, r.tag
      );
    END IF;
  END LOOP;

  -- 2. Apólices vencendo em 60, 30 ou 15 dias
  FOR r IN
    SELECT *
    FROM public.asset_insurance_policies
    WHERE status = 'ativa'
      AND coverage_end::date >= today
      AND coverage_end::date <= today + 60
  LOOP
    days_left := (r.coverage_end::date - today);
    IF days_left IN (60, 30, 15) THEN
      INSERT INTO public.eam_asset_alerts (
        tenant_id, type, title, description, severity
      ) VALUES (
        r.tenant_id, 'insurance_expiring',
        'Apólice vencendo em ' || days_left || ' dias: ' || r.insurer_name,
        'Apólice ' || r.policy_number || ' da ' || r.insurer_name
          || ' vence em ' || to_char(r.coverage_end::date, 'DD/MM/YYYY'),
        CASE WHEN days_left <= 15 THEN 'critical'
             WHEN days_left <= 30 THEN 'warning'
             ELSE 'info' END
      );
    END IF;
  END LOOP;

  -- 3. OS com prazo vencido (abertas há > 30 dias)
  FOR r IN
    SELECT wo.*, a.name AS aname, a.tag AS atag
    FROM public.asset_work_orders wo
    JOIN public.assets a ON a.id = wo.asset_id
    WHERE wo.status NOT IN ('concluida', 'cancelada')
      AND wo.opened_at < now() - INTERVAL '30 days'
  LOOP
    INSERT INTO public.eam_asset_alerts (
      tenant_id, type, title, description, severity,
      asset_id, asset_name, asset_tag
    ) VALUES (
      r.tenant_id, 'os_overdue',
      'OS com prazo vencido: ' || r.title,
      'OS aberta há mais de 30 dias para o ativo ' || r.aname || ' (' || r.atag || ')',
      'warning', r.asset_id, r.aname, r.atag
    );
  END LOOP;

  -- 4. Ativos sem responsável há mais de 7 dias
  FOR r IN
    SELECT *
    FROM public.assets
    WHERE responsible_id IS NULL
      AND responsible_name IS NULL
      AND status NOT IN ('descartado', 'alienado', 'em_aquisicao')
      AND updated_at < now() - INTERVAL '7 days'
  LOOP
    INSERT INTO public.eam_asset_alerts (
      tenant_id, type, title, description, severity,
      asset_id, asset_name, asset_tag
    ) VALUES (
      r.tenant_id, 'no_responsible',
      'Ativo sem responsável: ' || r.name,
      'Ativo ' || r.tag || ' está sem responsável designado',
      'warning', r.id, r.name, r.tag
    );
  END LOOP;
END;
$$;

-- ── Job 3: Manutenção preventiva (todo dia às 06:00) ─────────────────────────
-- Cria OS automaticamente para planos com next_due_date vencida.

CREATE OR REPLACE FUNCTION public.eam_job_maintenance()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r        RECORD;
  next_due DATE;
BEGIN
  FOR r IN
    SELECT
      mp.*,
      a.name    AS aname,
      a.tag     AS atag,
      a.tenant_id AS tid
    FROM public.asset_maintenance_plans mp
    JOIN public.assets a ON a.id = mp.asset_id
    WHERE mp.status = 'ativo'
      AND mp.next_due_date IS NOT NULL
      AND mp.next_due_date::date < CURRENT_DATE
  LOOP
    -- Cria OS preventiva
    INSERT INTO public.asset_work_orders (
      tenant_id, asset_id, type, title, failure_description,
      status, opened_at, estimated_cost,
      parts_cost, labor_cost, total_cost, created_at, updated_at
    ) VALUES (
      r.tid, r.asset_id, 'preventiva',
      'Manutenção preventiva (auto): ' || r.name,
      COALESCE(r.service_description, 'Manutenção preventiva programada'),
      'aberta', now(), COALESCE(r.estimated_cost, 0),
      0, 0, 0, now(), now()
    );

    -- Calcula próxima data
    next_due := CASE r.trigger_unit
      WHEN 'dias'    THEN r.next_due_date::date + (r.trigger_value || ' days')::interval
      WHEN 'semanas' THEN r.next_due_date::date + (r.trigger_value * 7 || ' days')::interval
      WHEN 'meses'   THEN r.next_due_date::date + (r.trigger_value || ' months')::interval
      ELSE                r.next_due_date::date + (r.trigger_value || ' days')::interval
    END;

    -- Atualiza plano
    UPDATE public.asset_maintenance_plans
    SET next_due_date = next_due,
        last_executed = now(),
        updated_at    = now()
    WHERE id = r.id;

    -- Alerta informativo
    INSERT INTO public.eam_asset_alerts (
      tenant_id, type, title, description, severity,
      asset_id, asset_name, asset_tag
    ) VALUES (
      r.tid, 'maintenance_overdue',
      'OS preventiva criada: ' || r.name,
      'Plano "' || r.name || '" vencido para ' || r.aname
        || '. OS criada automaticamente. Próxima: '
        || to_char(next_due, 'DD/MM/YYYY'),
      'info', r.asset_id, r.aname, r.atag
    );
  END LOOP;
END;
$$;

-- ── Job 4: Responsáveis (toda segunda às 09:00) ───────────────────────────────
-- Lista ativos sem responsible_id há mais de 7 dias e notifica admins.

CREATE OR REPLACE FUNCTION public.eam_job_responsible()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT *
    FROM public.assets
    WHERE responsible_id IS NULL
      AND responsible_name IS NULL
      AND status NOT IN ('descartado', 'alienado', 'em_aquisicao')
      AND updated_at < now() - INTERVAL '7 days'
  LOOP
    -- Evitar duplicatas na mesma semana
    IF NOT EXISTS (
      SELECT 1 FROM public.eam_asset_alerts
      WHERE asset_id = r.id
        AND type = 'no_responsible'
        AND resolved = false
        AND created_at > now() - INTERVAL '7 days'
    ) THEN
      INSERT INTO public.eam_asset_alerts (
        tenant_id, type, title, description, severity,
        asset_id, asset_name, asset_tag
      ) VALUES (
        r.tenant_id, 'no_responsible',
        '[Alerta Admin] Ativo sem responsável: ' || r.name,
        'Ativo ' || r.tag || ' (status: ' || r.status
          || ') não tem responsável há mais de 7 dias.',
        'warning', r.id, r.name, r.tag
      );
    END IF;
  END LOOP;
END;
$$;

-- ── pg_cron scheduling ────────────────────────────────────────────────────────
-- Requer extensão pg_cron habilitada no projeto Supabase.
-- No dashboard: Database > Extensions > pg_cron

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Remove agendamentos anteriores (idempotente)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'cron') THEN
    PERFORM cron.unschedule(jobname)
    FROM cron.job
    WHERE jobname IN (
      'eam-monthly-depreciation',
      'eam-daily-alerts',
      'eam-daily-maintenance',
      'eam-weekly-responsible'
    );
  END IF;
END $$;

-- Job 1: Depreciação mensal — todo dia 1º às 02:00
SELECT cron.schedule(
  'eam-monthly-depreciation',
  '0 2 1 * *',
  'SELECT public.eam_job_depreciation()'
);

-- Job 2: Alertas diários — todo dia às 08:00
SELECT cron.schedule(
  'eam-daily-alerts',
  '0 8 * * *',
  'SELECT public.eam_job_alerts()'
);

-- Job 3: Manutenção preventiva — todo dia às 06:00
SELECT cron.schedule(
  'eam-daily-maintenance',
  '0 6 * * *',
  'SELECT public.eam_job_maintenance()'
);

-- Job 4: Responsáveis — toda segunda às 09:00
SELECT cron.schedule(
  'eam-weekly-responsible',
  '0 9 * * 1',
  'SELECT public.eam_job_responsible()'
);

-- ── Confirmação ───────────────────────────────────────────────────────────────
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'eam_asset_alerts';
