-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: google_workspace card — multi-account
--
-- Cria infraestrutura para o card google_workspace:
--   • google_oauth_tokens     — múltiplas contas Google por tenant
--   • google_api_usage        — tracking de chamadas (cota / auditoria)
--   • ia_pending_actions      — fila de aprovação humana (gmail_send etc.)
--
-- RLS: zia_is_admin() OR tenant_in_scope(tenant_id) (custom auth do projeto).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) Tokens OAuth — uma linha por (tenant, conta Google) ────────────────────
CREATE TABLE IF NOT EXISTS public.google_oauth_tokens (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            TEXT        NOT NULL,
  google_account_email TEXT        NOT NULL,
  google_user_id       TEXT,
  access_token         TEXT        NOT NULL,
  refresh_token        TEXT        NOT NULL,
  scopes               TEXT[]      NOT NULL DEFAULT '{}',
  expires_at           TIMESTAMPTZ NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, google_account_email)
);

ALTER TABLE public.google_oauth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "google_oauth_tokens_tenant" ON public.google_oauth_tokens
  FOR ALL TO authenticated
  USING      (zia_is_admin() OR tenant_in_scope(tenant_id))
  WITH CHECK (zia_is_admin() OR tenant_in_scope(tenant_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.google_oauth_tokens TO authenticated, service_role;

CREATE INDEX IF NOT EXISTS google_oauth_tokens_tenant_idx
  ON public.google_oauth_tokens (tenant_id);

COMMENT ON TABLE  public.google_oauth_tokens IS 'Tokens OAuth Google por (tenant, conta). access_token nunca deve sair em logs.';
COMMENT ON COLUMN public.google_oauth_tokens.scopes IS 'Scopes concedidos pelo usuário (calendar, sheets, gmail.readonly, gmail.send, drive.metadata.readonly).';


-- 2) Auditoria de chamadas Google API ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.google_api_usage (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            TEXT        NOT NULL,
  google_account_email TEXT        NOT NULL,
  agent_id             UUID,
  scope                TEXT        NOT NULL,    -- calendar | sheets | gmail_read | gmail_send | drive_meta
  endpoint             TEXT        NOT NULL,    -- ex: 'events.insert', 'messages.send'
  status_code          INT,
  duration_ms          INT,
  error                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.google_api_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "google_api_usage_tenant" ON public.google_api_usage
  FOR ALL TO authenticated
  USING      (zia_is_admin() OR tenant_in_scope(tenant_id))
  WITH CHECK (zia_is_admin() OR tenant_in_scope(tenant_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.google_api_usage TO authenticated, service_role;

CREATE INDEX IF NOT EXISTS google_api_usage_tenant_created_idx
  ON public.google_api_usage (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS google_api_usage_tenant_scope_idx
  ON public.google_api_usage (tenant_id, scope, created_at DESC);

COMMENT ON TABLE public.google_api_usage IS 'Auditoria de cada chamada de tool Google: ferramenta, escopo, latência, erro.';


-- 3) Fila de ações pendentes de aprovação humana ───────────────────────────
CREATE TABLE IF NOT EXISTS public.ia_pending_actions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     TEXT        NOT NULL,
  agent_id      UUID        NOT NULL REFERENCES public.ia_agentes(id) ON DELETE CASCADE,
  acao_tipo     TEXT        NOT NULL,        -- ex: 'gmail_send', 'google_calendar_delete'
  payload       JSONB       NOT NULL,        -- dados completos da ação a executar
  resumo        TEXT,                        -- texto curto para o aprovador (ex: "Enviar email para foo@bar.com")
  status        TEXT        NOT NULL DEFAULT 'pendente',  -- pendente | aprovado | rejeitado | executado | erro
  resultado     JSONB,
  aprovado_por  TEXT,                        -- code/nome do operator que aprovou
  aprovado_em   TIMESTAMPTZ,
  executado_em  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ia_pending_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ia_pending_actions_tenant" ON public.ia_pending_actions
  FOR ALL TO authenticated
  USING      (zia_is_admin() OR tenant_in_scope(tenant_id))
  WITH CHECK (zia_is_admin() OR tenant_in_scope(tenant_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ia_pending_actions TO authenticated, service_role;

CREATE INDEX IF NOT EXISTS ia_pending_actions_tenant_status_idx
  ON public.ia_pending_actions (tenant_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS ia_pending_actions_agent_idx
  ON public.ia_pending_actions (agent_id, created_at DESC);

COMMENT ON TABLE public.ia_pending_actions IS 'Ações pedidas por agentes IA que exigem aprovação humana (ex: envio de email via Gmail).';
