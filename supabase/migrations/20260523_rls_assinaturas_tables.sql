-- =============================================================================
-- MIGRATION: segurança — habilita RLS nas tabelas do módulo de Assinaturas
--
-- Advisor `rls_disabled_in_public` (ERROR): 9 tabelas de assinaturas estavam
-- SEM RLS → expostas (leitura/escrita) via anon key. `assinaturas_integracoes`
-- pode guardar credenciais de gateway de pagamento no futuro.
--
-- Todas estão VAZIAS hoje (0 linhas) → seguro aplicar isolamento estrito já.
-- tenant_id é uuid; tenant_in_scope tem overload uuid.
-- =============================================================================

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'assinaturas_acessos','assinaturas_config','assinaturas_integracoes',
    'assinaturas_integracoes_mapeamentos','assinaturas_plano_faixas',
    'assinaturas_plano_metricas','assinaturas_plano_regras',
    'erp_assinaturas_cobrancas','erp_assinaturas_historico'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation" ON public.%I', t);
      EXECUTE format(
        'CREATE POLICY "tenant_isolation" ON public.%I FOR ALL
           TO authenticated
           USING (tenant_in_scope(tenant_id))
           WITH CHECK (tenant_in_scope(tenant_id))', t);
    END IF;
  END LOOP;
END $$;
