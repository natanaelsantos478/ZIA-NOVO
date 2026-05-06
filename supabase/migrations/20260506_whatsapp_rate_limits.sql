-- Rate limiting e proteção contra bot-loop no WhatsApp IA

-- Colunas de configuração na ia_config_tenant
ALTER TABLE ia_config_tenant
  ADD COLUMN IF NOT EXISTS wa_cooldown_segundos    INT  NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS wa_max_consecutivas     INT  NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS wa_max_por_minuto       INT  NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS wa_max_por_dia          INT  NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS wa_bot_velocidade_ms    INT  NOT NULL DEFAULT 3000;

-- Rastreamento por telefone (cooldown + consecutivas + detecção de bot)
CREATE TABLE IF NOT EXISTS ia_whatsapp_rate_limits (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        TEXT         NOT NULL,
  phone            TEXT         NOT NULL,
  data_uso         DATE         NOT NULL DEFAULT CURRENT_DATE,
  ultima_ia_at     TIMESTAMPTZ,
  consecutivas_ia  INT          NOT NULL DEFAULT 0,
  respostas_dia    INT          NOT NULL DEFAULT 0,
  UNIQUE (tenant_id, phone, data_uso)
);

-- Rastreamento agregado por tenant (para limites por minuto e por dia)
CREATE TABLE IF NOT EXISTS ia_whatsapp_tenant_usage (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        TEXT         NOT NULL,
  data_uso         DATE         NOT NULL DEFAULT CURRENT_DATE,
  respostas_dia    INT          NOT NULL DEFAULT 0,
  respostas_minuto INT          NOT NULL DEFAULT 0,
  minuto_inicio_ts TIMESTAMPTZ,
  UNIQUE (tenant_id, data_uso)
);

ALTER TABLE ia_whatsapp_rate_limits  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ia_whatsapp_tenant_usage ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ia_whatsapp_rate_limits'  AND policyname = 'rl_all') THEN
    CREATE POLICY "rl_all"  ON ia_whatsapp_rate_limits  USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ia_whatsapp_tenant_usage' AND policyname = 'tu_all') THEN
    CREATE POLICY "tu_all"  ON ia_whatsapp_tenant_usage USING (true) WITH CHECK (true);
  END IF;
END $$;

GRANT ALL ON TABLE ia_whatsapp_rate_limits  TO anon, authenticated, service_role;
GRANT ALL ON TABLE ia_whatsapp_tenant_usage TO anon, authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_wa_rl_tenant_phone  ON ia_whatsapp_rate_limits  (tenant_id, phone, data_uso);
CREATE INDEX IF NOT EXISTS idx_wa_tu_tenant        ON ia_whatsapp_tenant_usage (tenant_id, data_uso);
