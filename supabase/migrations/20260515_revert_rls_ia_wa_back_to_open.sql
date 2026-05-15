-- REVERT: volta USING(true) em todas as tabelas IA/WA.
--
-- tenant_in_scope() e jwt_scope_ids() bloqueiam tudo porque auth.jwt()
-- retorna vazio — o cliente Supabase usa Authorization: Bearer com JWT
-- customizado da zia-auth mas sem supabase.auth.setSession(), então o
-- PostgREST não reconhece as claims de app_metadata.
--
-- Isolação real requer mudança de arquitetura no auth, não só no RLS.
-- Por enquanto USING(true) mantém o comportamento original do projeto.

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ia_agentes','ia_agent_cards','ia_agent_conexoes','ia_agent_memoria',
    'ia_agent_memoria_entradas','ia_agent_nos','ia_agendamentos','ia_cards',
    'ia_conexao_mensagens','ia_config_tenant','ia_crm_conversas',
    'ia_escuta_historico','ia_execucoes_background','ia_memorias',
    'ia_permissoes','ia_solicitacoes','ia_suporte_conversas',
    'wa_agent_chats','wa_agent_chat_messages','wa_agent_numeros_confianca',
    'ia_api_keys','ia_api_logs'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
      DECLARE r RECORD;
      BEGIN
        FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
          EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, t);
        END LOOP;
      END;
      EXECUTE format(
        'CREATE POLICY "tenant_isolation" ON public.%I FOR ALL USING (true) WITH CHECK (true)', t
      );
    END IF;
  END LOOP;
END $$;
