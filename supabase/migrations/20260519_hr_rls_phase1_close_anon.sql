-- =============================================================================
-- MIGRATION: HR RLS — Fase 1: fechar a brecha de acesso anônimo
--
-- PROBLEMA (auditoria 19/05/2026):
--   30 tabelas HR estavam com policy "{public} USING(true) WITH CHECK(true)".
--   Qualquer cliente com a anon key (embutida no bundle JS público) lia e
--   escrevia CPF, salário, dados bancários, folha, saúde ocupacional e
--   rescisões de TODAS as empresas. Brecha grave de LGPD.
--
-- COMO FUNCIONA A RLS DESTE PROJETO (não é Supabase Auth nativo):
--   • Login via Edge Function zia-auth → JWT HS256 custom no sessionStorage.
--   • JWT carrega app_metadata.{is_admin, scope_ids[]}.
--   • Função deployada tenant_in_scope(text) = is_admin OR tid = ANY(scope_ids).
--   • A anon key NÃO tem app_metadata → tenant_in_scope = false, e o role
--     Postgres é 'anon' (custom JWT usa role 'authenticated').
--
-- ESTRATÉGIA — Fase 1 (zero perda de dados, zero quebra de operador):
--   1. employees / departments: dados já têm zia_company_id (text) preenchido
--      → isolamento estrito real: tenant_in_scope(zia_company_id).
--   2. Demais 28 tabelas: os dados ainda NÃO têm tag de tenant
--      (employee_id / department_id / zia_company_id NULL em produção)
--      → restringe ao role 'authenticated' (TO authenticated USING(true)).
--      Bloqueia a anon key (fim da brecha) SEM esconder dados dos operadores.
--      O isolamento estrito por tenant nessas tabelas é a Fase 2 (após backfill
--      das colunas de tenant e ajuste das queries em src/lib/hr.ts).
--
-- NÃO TOCADAS (já isoladas corretamente em migrations anteriores):
--   activity_automations, bank_change_requests, position_history,
--   salary_history, schedules + activity_groups (config global intencional).
--
-- AVISO PORTAL PÚBLICO: vacancies/candidates também ficam restritas a
--   authenticated. O portal público /vagas (anon, sem login) PARA de
--   funcionar até ser refatorado para uma Edge Function. Decisão explícita
--   do Natanael (19/05/2026).
-- =============================================================================

-- ── Helper temporário: dropa TODAS as policies de uma tabela ─────────────────
-- (evita OR-bypass: PostgreSQL faz OR entre policies permissivas)
CREATE OR REPLACE FUNCTION _hr_drop_policies(tbl text) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies
           WHERE schemaname = 'public' AND tablename = tbl LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, tbl);
  END LOOP;
END;
$$;

-- ── 1. employees / departments → isolamento estrito por tenant ───────────────
-- zia_company_id é text; tenant_in_scope(text) já está deployada e cobre admin.
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['employees','departments'] LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t) THEN
      PERFORM _hr_drop_policies(t);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format(
        'CREATE POLICY "tenant_isolation" ON public.%I FOR ALL
           TO authenticated
           USING (tenant_in_scope(zia_company_id))
           WITH CHECK (tenant_in_scope(zia_company_id))', t);
    END IF;
  END LOOP;
END $$;

-- ── 2. Demais 28 tabelas HR → restritas ao role authenticated ────────────────
-- Fecha a anon key. Filtro de empresa segue no app (src/lib/hr.ts) até a
-- Fase 2 trocar isto por tenant_in_scope quando os dados estiverem tagueados.
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'absences','admissions','benefits_operators','candidates','contractors',
    'employee_benefits','employee_group_members','employee_groups',
    'employee_notes','hour_bank','hr_activities','hr_alerts','hr_schedules',
    'occupational_health','offboarding','onboarding_processes',
    'onboarding_steps','overtime_requests','payroll_groups','payroll_items',
    'payroll_runs','performance_reviews','positions','punch_corrections',
    'timesheet_entries','travel_expenses','vacancies','vacations'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t) THEN
      PERFORM _hr_drop_policies(t);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format(
        'CREATE POLICY "authenticated_rw" ON public.%I FOR ALL
           TO authenticated USING (true) WITH CHECK (true)', t);
    END IF;
  END LOOP;
END $$;

-- ── 3. Cleanup do helper temporário ──────────────────────────────────────────
DROP FUNCTION IF EXISTS _hr_drop_policies(text);

-- NOTA: GRANTs para o role 'authenticated' já estavam presentes em todas as
-- 30 tabelas (verificado na auditoria) — RLS não retorna 403. Não há GRANT
-- para revogar do anon: a policy "TO authenticated" já nega o role anon
-- (RLS sem policy aplicável = deny), fechando a brecha.
