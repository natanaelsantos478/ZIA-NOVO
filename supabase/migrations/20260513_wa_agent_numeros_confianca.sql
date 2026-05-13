CREATE TABLE IF NOT EXISTS wa_agent_numeros_confianca (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id        UUID        NOT NULL REFERENCES ia_agentes(id) ON DELETE CASCADE,
  tenant_id       TEXT        NOT NULL,
  phone           TEXT        NOT NULL,
  nome            TEXT        NOT NULL DEFAULT '',
  descricao       TEXT,
  pode_visualizar BOOLEAN     NOT NULL DEFAULT true,
  pode_editar     BOOLEAN     NOT NULL DEFAULT false,
  pode_criar      BOOLEAN     NOT NULL DEFAULT false,
  pode_apagar     BOOLEAN     NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent_id, phone)
);

ALTER TABLE wa_agent_numeros_confianca ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON wa_agent_numeros_confianca
  USING (tenant_id = current_setting('app.current_tenant', true)::text);

GRANT ALL ON wa_agent_numeros_confianca TO authenticated;
GRANT ALL ON wa_agent_numeros_confianca TO anon;
