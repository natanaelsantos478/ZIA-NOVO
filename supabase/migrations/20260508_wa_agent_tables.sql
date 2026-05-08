-- Chat interno do agente WhatsApp (uma thread por número de telefone)
create table if not exists wa_agent_chats (
  id               uuid primary key default gen_random_uuid(),
  agent_id         uuid not null references ia_agentes(id) on delete cascade,
  tenant_id        uuid not null,
  phone            text not null,
  titulo           text,
  last_message_at  timestamptz default now(),
  created_at       timestamptz default now(),
  unique (agent_id, phone)
);

-- Mensagens do chat interno (inputs, thoughts, tool calls, replies)
create table if not exists wa_agent_chat_messages (
  id               uuid primary key default gen_random_uuid(),
  chat_id          uuid not null references wa_agent_chats(id) on delete cascade,
  agent_id         uuid not null,
  tenant_id        uuid not null,
  role             text not null check (role in ('user','reply','thought','tool_call','tool_result','assistant')),
  content          text,
  tool_name        text,
  tool_args        jsonb,
  tool_result      jsonb,
  zapi_message_id  text,
  created_at       timestamptz default now()
);

create index if not exists wa_agent_chat_messages_chat_id_idx on wa_agent_chat_messages(chat_id);
create index if not exists wa_agent_chat_messages_zapi_idx    on wa_agent_chat_messages(zapi_message_id) where zapi_message_id is not null;

-- Configuração de prospecção por tenant (mensagem de disparo persistente)
create table if not exists prosp_config (
  tenant_id        uuid primary key,
  mensagem_padrao  text,
  updated_at       timestamptz default now()
);

-- RLS
alter table wa_agent_chats         enable row level security;
alter table wa_agent_chat_messages  enable row level security;
alter table prosp_config            enable row level security;

create policy "tenant isolation" on wa_agent_chats
  using (tenant_id = auth.uid() or auth.role() = 'service_role');

create policy "tenant isolation" on wa_agent_chat_messages
  using (tenant_id = auth.uid() or auth.role() = 'service_role');

create policy "tenant isolation" on prosp_config
  using (tenant_id = auth.uid() or auth.role() = 'service_role');

-- Grant para service_role
grant all on wa_agent_chats, wa_agent_chat_messages, prosp_config to service_role;
