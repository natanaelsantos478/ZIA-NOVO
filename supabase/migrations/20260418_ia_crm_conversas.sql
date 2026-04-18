CREATE TABLE IF NOT EXISTS ia_crm_conversas (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   TEXT        NOT NULL,
  titulo      TEXT        NOT NULL DEFAULT 'Nova conversa',
  mensagens   JSONB       NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ia_crm_conversas_tenant_idx  ON ia_crm_conversas (tenant_id);
CREATE INDEX IF NOT EXISTS ia_crm_conversas_updated_idx ON ia_crm_conversas (updated_at DESC);

ALTER TABLE ia_crm_conversas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversas_tenant_all" ON ia_crm_conversas
  FOR ALL USING (true) WITH CHECK (true);
