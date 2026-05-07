-- =============================================================================
-- MIGRATION: Agentes fixos do sistema + tabela prosp_empresas (bug crítico)
-- =============================================================================

-- ── 1. prosp_empresas — tabela ausente que causava falha silenciosa nos saves ──

CREATE TABLE IF NOT EXISTS public.prosp_empresas (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           TEXT        NOT NULL,
  nome_fantasia       TEXT,
  cnpj                TEXT,
  cnpj_situacao       TEXT,
  capital_social      NUMERIC,
  municipio           TEXT,
  uf                  TEXT,
  telefone_principal  TEXT,
  telefone_secundario TEXT,
  email_contato       TEXT,
  socios              JSONB,
  serasa_status       TEXT,
  descricao_google    TEXT,
  segmento            TEXT,
  status_pipeline     TEXT        NOT NULL DEFAULT 'prospectado',
  etapa_atual         TEXT,
  fonte_descoberta    TEXT        NOT NULL DEFAULT 'prospeccao_ia',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.prosp_empresas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prosp_empresas_open" ON public.prosp_empresas;
CREATE POLICY "prosp_empresas_open" ON public.prosp_empresas
  FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.prosp_empresas TO authenticated, service_role;
CREATE INDEX IF NOT EXISTS idx_prosp_empresas_tenant ON public.prosp_empresas(tenant_id);

-- ── 2. ia_agentes: fixo + slug para agentes do sistema ────────────────────────

ALTER TABLE public.ia_agentes
  ADD COLUMN IF NOT EXISTS fixo BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ia_agentes_tenant_slug
  ON public.ia_agentes(tenant_id, slug)
  WHERE slug IS NOT NULL;

-- ── 3. ia_agent_memoria_entradas: origem + locked para entradas automáticas ───

ALTER TABLE public.ia_agent_memoria_entradas
  ADD COLUMN IF NOT EXISTS origem TEXT    NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS locked BOOLEAN NOT NULL DEFAULT false;

-- ── 4. Confirmação ────────────────────────────────────────────────────────────

SELECT tablename FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'prosp_empresas';
