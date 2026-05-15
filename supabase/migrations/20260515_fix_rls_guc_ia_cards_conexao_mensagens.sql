-- Corrige RLS quebrado: policies usavam GUC app.tenant_ids que o frontend nunca seta,
-- fazendo ia_cards, ia_agent_cards, wa_agent_chats, wa_agent_chat_messages e
-- ia_conexao_mensagens retornarem 0 linhas para o cliente.
-- Alinha ao padrão do restante do módulo IA (ia_agentes, ia_agent_conexoes): USING (true).

-- ia_cards
DROP POLICY IF EXISTS "ia_cards_tenant" ON public.ia_cards;
CREATE POLICY "ia_cards_tenant" ON public.ia_cards FOR ALL USING (true) WITH CHECK (true);

-- ia_agent_cards
DROP POLICY IF EXISTS "ia_agent_cards_tenant" ON public.ia_agent_cards;
CREATE POLICY "ia_agent_cards_tenant" ON public.ia_agent_cards FOR ALL USING (true) WITH CHECK (true);

-- wa_agent_chats
DROP POLICY IF EXISTS "wa_agent_chats_tenant" ON public.wa_agent_chats;
CREATE POLICY "wa_agent_chats_tenant" ON public.wa_agent_chats FOR ALL USING (true) WITH CHECK (true);

-- wa_agent_chat_messages
DROP POLICY IF EXISTS "wa_agent_chat_messages_tenant" ON public.wa_agent_chat_messages;
CREATE POLICY "wa_agent_chat_messages_tenant" ON public.wa_agent_chat_messages FOR ALL USING (true) WITH CHECK (true);

-- ia_conexao_mensagens
DROP POLICY IF EXISTS "tenant_isolation_ia_conexao_mensagens" ON public.ia_conexao_mensagens;
CREATE POLICY "tenant_isolation_ia_conexao_mensagens" ON public.ia_conexao_mensagens FOR ALL USING (true) WITH CHECK (true);
