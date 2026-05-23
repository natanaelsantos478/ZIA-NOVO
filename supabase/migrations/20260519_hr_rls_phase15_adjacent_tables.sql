-- =============================================================================
-- MIGRATION: HR RLS — Fase 1.5: tabelas HR-adjacentes encontradas no peer review
--
-- Auditoria Opus (19/05/2026) achou tabelas abertas a `{public} USING(true)`
-- que ficaram fora da Fase 1 e guardam dado sensível de RH:
--   • erp_comissoes_funcionario_produto / erp_comissoes_lancamentos /
--     erp_financeiro_funcionarios / erp_grupo_rh_config → salário variável
--   • crm_compromissos → agenda do funcionário (funcionario_id)
--   • activity_groups → tinha tenant_id mas eu rotulei errado como "global"
--   • shifts / financial_transactions → abertas
--   • whatsapp_conversations → RLS estava DESLIGADO (conteúdo de cliente, LGPD)
--
-- Estratégia (mesma da Fase 1):
--   • Tem tenant_id (tagueado ou vazio) → tenant_in_scope(tenant_id)
--     (overload text/uuid já resolve o tipo; cobre admin internamente)
--   • Sem coluna de tenant (shifts, financial_transactions) → TO authenticated
--   • Edge functions usam service_role → imunes ao RLS (WhatsApp não quebra)
-- =============================================================================

CREATE OR REPLACE FUNCTION _hr15_drop_policies(tbl text) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies
           WHERE schemaname='public' AND tablename=tbl LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, tbl);
  END LOOP;
END;
$$;

-- ── 1. Tabelas com tenant_id → isolamento estrito ────────────────────────────
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'crm_compromissos','erp_comissoes_funcionario_produto','erp_comissoes_lancamentos',
    'erp_financeiro_funcionarios','erp_grupo_rh_config','activity_groups','whatsapp_conversations'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t) THEN
      PERFORM _hr15_drop_policies(t);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format(
        'CREATE POLICY "tenant_isolation" ON public.%I FOR ALL
           TO authenticated
           USING (tenant_in_scope(tenant_id))
           WITH CHECK (tenant_in_scope(tenant_id))', t);
    END IF;
  END LOOP;
END $$;

-- ── 2. Tabelas sem coluna de tenant → restritas ao role authenticated ────────
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['shifts','financial_transactions'] LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t) THEN
      PERFORM _hr15_drop_policies(t);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format(
        'CREATE POLICY "authenticated_rw" ON public.%I FOR ALL
           TO authenticated USING (true) WITH CHECK (true)', t);
    END IF;
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS _hr15_drop_policies(text);
