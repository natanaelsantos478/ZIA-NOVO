-- Corrige RLS quebrado de ia_cards, ia_agent_cards, wa_agent_chats,
-- wa_agent_chat_messages e ia_conexao_mensagens.
--
-- Problema: commit 5fe2221 usou GUC app.tenant_ids que o frontend nunca seta,
-- tornando todas as queries nessas tabelas retornarem 0 linhas silenciosamente.
--
-- Fix: usa o padrão correto do projeto — zia_is_admin() OR jwt_scope_ids().
--   zia_is_admin()  → app_metadata.is_admin do JWT — admin vê tudo
--   jwt_scope_ids() → app_metadata.scope_ids do JWT — array de tenant IDs do usuário

-- Cria helper zia_is_admin() se não existir (mesmo padrão de 20260316_rls_jwt_claims.sql)
CREATE OR REPLACE FUNCTION zia_is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean,
    false
  )
$$;
GRANT EXECUTE ON FUNCTION zia_is_admin() TO anon, authenticated;

-- ia_cards
DROP POLICY IF EXISTS "ia_cards_tenant" ON public.ia_cards;
CREATE POLICY "ia_cards_tenant" ON public.ia_cards FOR ALL
  USING  (zia_is_admin() OR tenant_id = ANY(jwt_scope_ids()))
  WITH CHECK (zia_is_admin() OR tenant_id = ANY(jwt_scope_ids()));

-- ia_agent_cards
DROP POLICY IF EXISTS "ia_agent_cards_tenant" ON public.ia_agent_cards;
CREATE POLICY "ia_agent_cards_tenant" ON public.ia_agent_cards FOR ALL
  USING  (zia_is_admin() OR tenant_id = ANY(jwt_scope_ids()))
  WITH CHECK (zia_is_admin() OR tenant_id = ANY(jwt_scope_ids()));

-- wa_agent_chats (unifica as duas policies anteriores em uma)
DROP POLICY IF EXISTS "wa_agent_chats_tenant" ON public.wa_agent_chats;
DROP POLICY IF EXISTS "wa_agent_chats_scope"  ON public.wa_agent_chats;
CREATE POLICY "wa_agent_chats_tenant" ON public.wa_agent_chats FOR ALL
  USING  (zia_is_admin() OR tenant_id = ANY(jwt_scope_ids()))
  WITH CHECK (zia_is_admin() OR tenant_id = ANY(jwt_scope_ids()));

-- wa_agent_chat_messages (unifica as duas policies anteriores em uma)
DROP POLICY IF EXISTS "wa_agent_chat_messages_tenant" ON public.wa_agent_chat_messages;
DROP POLICY IF EXISTS "wa_agent_chat_messages_scope"  ON public.wa_agent_chat_messages;
CREATE POLICY "wa_agent_chat_messages_tenant" ON public.wa_agent_chat_messages FOR ALL
  USING  (zia_is_admin() OR tenant_id = ANY(jwt_scope_ids()))
  WITH CHECK (zia_is_admin() OR tenant_id = ANY(jwt_scope_ids()));

-- ia_conexao_mensagens (remove policies duplicadas)
DROP POLICY IF EXISTS "ia_conexao_mensagens_tenant"           ON public.ia_conexao_mensagens;
DROP POLICY IF EXISTS "tenant_isolation_ia_conexao_mensagens" ON public.ia_conexao_mensagens;
CREATE POLICY "tenant_isolation_ia_conexao_mensagens" ON public.ia_conexao_mensagens FOR ALL
  USING  (zia_is_admin() OR tenant_id = ANY(jwt_scope_ids()))
  WITH CHECK (zia_is_admin() OR tenant_id = ANY(jwt_scope_ids()));
