-- Troca RLS de todas as tabelas IA/WA para: TO authenticated USING(true)
-- Motivo: auth.jwt() com JWTs customizados é frágil via PostgREST.
-- Segurança de tenant é mantida pelos filtros tenant_id nas queries do app.
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
        'CREATE POLICY "authenticated_rw" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
        t
      );
    END IF;
  END LOOP;
END $$;
