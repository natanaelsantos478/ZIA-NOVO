-- FASE 1: Corrige RLS aberto (qual: true) nas 4 tabelas de IA/WA
-- Padrão adotado: mesmo das tabelas ia_agent_conexoes e ia_conexao_mensagens

-- ia_cards
DROP POLICY IF EXISTS "ia_cards_open"   ON public.ia_cards;
DROP POLICY IF EXISTS "ia_cards_tenant" ON public.ia_cards;
CREATE POLICY "ia_cards_tenant" ON public.ia_cards FOR ALL
  USING (tenant_id = ANY(string_to_array(current_setting('app.tenant_ids', true), ',')));

-- ia_agent_cards
DROP POLICY IF EXISTS "ia_agent_cards_open"   ON public.ia_agent_cards;
DROP POLICY IF EXISTS "ia_agent_cards_tenant" ON public.ia_agent_cards;
CREATE POLICY "ia_agent_cards_tenant" ON public.ia_agent_cards FOR ALL
  USING (tenant_id = ANY(string_to_array(current_setting('app.tenant_ids', true), ',')));

-- wa_agent_chats
DROP POLICY IF EXISTS "tenant isolation"      ON public.wa_agent_chats;
DROP POLICY IF EXISTS "wa_agent_chats_open"   ON public.wa_agent_chats;
DROP POLICY IF EXISTS "wa_agent_chats_tenant" ON public.wa_agent_chats;
CREATE POLICY "wa_agent_chats_tenant" ON public.wa_agent_chats FOR ALL
  USING (tenant_id = ANY(string_to_array(current_setting('app.tenant_ids', true), ',')));

-- wa_agent_chat_messages
DROP POLICY IF EXISTS "tenant isolation"             ON public.wa_agent_chat_messages;
DROP POLICY IF EXISTS "wa_agent_chat_messages_open"   ON public.wa_agent_chat_messages;
DROP POLICY IF EXISTS "wa_agent_chat_messages_tenant" ON public.wa_agent_chat_messages;
CREATE POLICY "wa_agent_chat_messages_tenant" ON public.wa_agent_chat_messages FOR ALL
  USING (tenant_id = ANY(string_to_array(current_setting('app.tenant_ids', true), ',')));

-- Grants (service_role já tem bypass, authenticated precisa de grant explícito)
GRANT ALL ON public.ia_cards             TO authenticated, service_role;
GRANT ALL ON public.ia_agent_cards       TO authenticated, service_role;
GRANT ALL ON public.wa_agent_chats       TO authenticated, service_role;
GRANT ALL ON public.wa_agent_chat_messages TO authenticated, service_role;
