-- wa_agent_chats: um chat por número de WhatsApp por agente
CREATE TABLE IF NOT EXISTS public.wa_agent_chats (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id         UUID NOT NULL REFERENCES public.ia_agentes(id) ON DELETE CASCADE,
  tenant_id        TEXT NOT NULL,
  phone            TEXT NOT NULL,
  titulo           TEXT,
  context_summary  TEXT,
  last_message_at  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agent_id, phone)
);

ALTER TABLE public.wa_agent_chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_agent_chats_open" ON public.wa_agent_chats FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.wa_agent_chats TO authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_wa_agent_chats_tenant   ON public.wa_agent_chats(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wa_agent_chats_agent    ON public.wa_agent_chats(agent_id);
CREATE INDEX IF NOT EXISTS idx_wa_agent_chats_phone    ON public.wa_agent_chats(phone);
CREATE INDEX IF NOT EXISTS idx_wa_agent_chats_last_msg ON public.wa_agent_chats(last_message_at DESC);

-- wa_agent_chat_messages: log interno de raciocínio (thought / tool_call / tool_result / user / assistant)
CREATE TABLE IF NOT EXISTS public.wa_agent_chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id     UUID NOT NULL REFERENCES public.wa_agent_chats(id) ON DELETE CASCADE,
  agent_id    UUID NOT NULL,
  tenant_id   TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('user','thought','tool_call','tool_result','assistant')),
  content     TEXT,
  tool_name   TEXT,
  tool_args   JSONB,
  tool_result JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wa_agent_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_agent_chat_messages_open" ON public.wa_agent_chat_messages FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.wa_agent_chat_messages TO authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_wa_chat_messages_chat    ON public.wa_agent_chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_wa_chat_messages_tenant  ON public.wa_agent_chat_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wa_chat_messages_created ON public.wa_agent_chat_messages(created_at);
