CREATE TABLE IF NOT EXISTS crm_parceiros_historico (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            TEXT        NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_data         JSONB       NOT NULL DEFAULT '{}',
  empresas_adicionadas INTEGER     NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS crm_parceiros_historico_tenant_idx   ON crm_parceiros_historico (tenant_id);
CREATE INDEX IF NOT EXISTS crm_parceiros_historico_created_idx  ON crm_parceiros_historico (created_at DESC);

ALTER TABLE crm_parceiros_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parceiros_historico_tenant_all" ON crm_parceiros_historico
  FOR ALL USING (true) WITH CHECK (true);
