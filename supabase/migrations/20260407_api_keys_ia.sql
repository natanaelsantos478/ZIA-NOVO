-- =============================================================================
-- MIGRATION: Tabelas de API Keys para IAs externas
-- Permite que IAs externas (Flowise, n8n, Make, WhatsApp, etc.) se autentiquem
-- e operem dentro do ZITA como se fossem um funcionário, com permissões granulares.
-- =============================================================================

-- ── ia_api_keys ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ia_api_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL,
  nome            TEXT NOT NULL,
  descricao       TEXT,
  api_key         TEXT UNIQUE NOT NULL DEFAULT 'zita_' || encode(gen_random_bytes(32), 'hex'),
  status          TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'revogado')),
  employee_id     UUID,

  -- Permissões em JSONB — flexível para expansão futura
  permissoes      JSONB NOT NULL DEFAULT '{
    "modulos": [],
    "acoes": {
      "ler": true,
      "criar": false,
      "editar": false,
      "deletar": false
    },
    "webhooks": {
      "receber": false,
      "enviar": false
    },
    "whatsapp": {
      "ler_mensagens": false,
      "enviar_mensagens": false,
      "enviar_sem_comando": false
    },
    "rate_limit": {
      "requests_por_minuto": 60,
      "requests_por_dia": 10000
    }
  }',

  -- Integração externa
  integracao_tipo   TEXT CHECK (integracao_tipo IN ('flowise','runway','n8n','make','custom','whatsapp','excel','webhook')),
  integracao_url    TEXT,
  integracao_config JSONB NOT NULL DEFAULT '{}',

  -- Auditoria
  ultimo_uso_at   TIMESTAMPTZ,
  total_requests  BIGINT NOT NULL DEFAULT 0,
  criado_por      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ia_api_logs ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ia_api_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id   UUID NOT NULL REFERENCES public.ia_api_keys(id) ON DELETE CASCADE,
  tenant_id    UUID NOT NULL,
  endpoint     TEXT NOT NULL,
  metodo       TEXT NOT NULL,
  status_code  INT,
  ip_origem    TEXT,
  user_agent   TEXT,
  payload_resumo TEXT,
  duracao_ms   INT,
  erro         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Índices ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ia_api_keys_tenant  ON public.ia_api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ia_api_keys_key     ON public.ia_api_keys(api_key);
CREATE INDEX IF NOT EXISTS idx_ia_api_keys_status  ON public.ia_api_keys(status);
CREATE INDEX IF NOT EXISTS idx_ia_api_logs_key     ON public.ia_api_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_ia_api_logs_tenant  ON public.ia_api_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ia_api_logs_created ON public.ia_api_logs(created_at DESC);

-- ── RLS (permissiva, igual ao padrão do projeto) ──────────────────────────────
ALTER TABLE public.ia_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ia_api_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ia_api_keys_all" ON public.ia_api_keys;
CREATE POLICY "ia_api_keys_all" ON public.ia_api_keys FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "ia_api_logs_all" ON public.ia_api_logs;
CREATE POLICY "ia_api_logs_all" ON public.ia_api_logs FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.ia_api_keys TO anon, authenticated, service_role;
GRANT ALL ON public.ia_api_logs TO anon, authenticated, service_role;

-- ── Trigger updated_at ────────────────────────────────────────────────────────
-- Cria a função se não existir (pode já existir em outros migrations)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_ia_api_keys_updated_at ON public.ia_api_keys;
CREATE TRIGGER set_ia_api_keys_updated_at
  BEFORE UPDATE ON public.ia_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Campo is_ia na tabela de employees (se existir) ──────────────────────────
-- Adiciona o campo is_ia para marcar funcionários que são IAs
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'employees'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'is_ia'
    ) THEN
      ALTER TABLE public.employees ADD COLUMN is_ia BOOLEAN NOT NULL DEFAULT false;
    END IF;
  END IF;
END $$;

-- ── Campo is_ia na tabela hr_employees (se existir) ───────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'hr_employees'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'hr_employees' AND column_name = 'is_ia'
    ) THEN
      ALTER TABLE public.hr_employees ADD COLUMN is_ia BOOLEAN NOT NULL DEFAULT false;
    END IF;
  END IF;
END $$;
