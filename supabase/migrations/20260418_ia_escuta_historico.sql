CREATE TABLE IF NOT EXISTS ia_escuta_historico (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                TEXT        NOT NULL,
  cliente_nome             TEXT,
  negociacao_id            TEXT,
  resumo                   TEXT,
  sentimento               TEXT        CHECK (sentimento IN ('positivo','neutro','negativo')),
  probabilidade_fechamento INT,
  duracao_segundos         INT,
  transcricao              TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ia_escuta_historico_tenant_idx  ON ia_escuta_historico (tenant_id);
CREATE INDEX IF NOT EXISTS ia_escuta_historico_created_idx ON ia_escuta_historico (created_at DESC);

ALTER TABLE ia_escuta_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "escuta_historico_all" ON ia_escuta_historico FOR ALL USING (true) WITH CHECK (true);
