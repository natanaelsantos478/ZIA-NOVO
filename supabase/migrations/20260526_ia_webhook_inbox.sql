-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: ia_webhook_inbox
-- Fila de webhooks recebidos pelos conectores externos de entrada (card conector_externo_entrada).
-- Cada registro representa um webhook recebido do exterior aguardando processamento pelo agente.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ia_webhook_inbox (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    TEXT        NOT NULL,
  card_id      UUID        NOT NULL REFERENCES public.ia_cards(id) ON DELETE CASCADE,
  agent_id     UUID        NOT NULL REFERENCES public.ia_agentes(id) ON DELETE CASCADE,
  payload      JSONB       NOT NULL,
  source_ip    TEXT,
  status       TEXT        NOT NULL DEFAULT 'pendente', -- pendente | processado | erro
  resultado    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

ALTER TABLE public.ia_webhook_inbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ia_webhook_inbox_tenant" ON public.ia_webhook_inbox
  FOR ALL TO authenticated
  USING (zia_is_admin() OR tenant_in_scope(tenant_id))
  WITH CHECK (zia_is_admin() OR tenant_in_scope(tenant_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ia_webhook_inbox TO authenticated, service_role;

CREATE INDEX IF NOT EXISTS ia_webhook_inbox_agent_status_idx
  ON public.ia_webhook_inbox (agent_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS ia_webhook_inbox_tenant_idx
  ON public.ia_webhook_inbox (tenant_id, created_at DESC);

COMMENT ON TABLE public.ia_webhook_inbox IS 'Fila de webhooks recebidos de sistemas externos via card conector_externo_entrada. Processados pelo agente IA via tool ver_caixa_entrada / marcar_webhook_processado.';
