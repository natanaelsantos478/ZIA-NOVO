CREATE TABLE IF NOT EXISTS ia_suporte_conversas (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   TEXT        NOT NULL,
  protocolo   TEXT        NOT NULL,
  mensagens   JSONB       NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ia_suporte_conversas_protocolo_idx ON ia_suporte_conversas (protocolo);
CREATE INDEX IF NOT EXISTS ia_suporte_conversas_tenant_idx ON ia_suporte_conversas (tenant_id);

ALTER TABLE ia_suporte_conversas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "suporte_conversas_all" ON ia_suporte_conversas FOR ALL USING (true) WITH CHECK (true);
