-- Aplica isolamento real por tenant nas 6 tabelas do organograma de agentes.
-- Validado pelo Opus 4.7: auth.jwt() entrega app_metadata.scope_ids corretamente,
-- zia_is_admin() e tenant_in_scope() testados no banco de produção.
-- activateAuthToken() é chamado antes da navegação no login — sem race condition.
-- Runners (ia-agent-runner, whatsapp-*) usam SERVICE_ROLE_KEY → imunes ao RLS.

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ia_agentes',
    'ia_cards',
    'ia_agent_nos',
    'ia_agent_conexoes',
    'ia_agent_cards',
    'ia_agent_memoria'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
      DECLARE r RECORD;
      BEGIN
        FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
          EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, t);
        END LOOP;
      END;
      EXECUTE format(
        'CREATE POLICY "tenant_isolation" ON public.%I FOR ALL
           USING  (zia_is_admin() OR tenant_in_scope(tenant_id))
           WITH CHECK (zia_is_admin() OR tenant_in_scope(tenant_id))',
        t
      );
    END IF;
  END LOOP;
END $$;
