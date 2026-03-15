-- =============================================================================
-- MIGRATION: Cria tabela crm_funis e completa colunas de crm_funil_etapas
--
-- O código usa crm_funis (não crm_funis_venda) e espera as colunas
-- slug, icone, probabilidade, obrigatoria em crm_funil_etapas.
-- =============================================================================

-- ── 1. Cria crm_funis (novo schema, substitui crm_funis_venda) ───────────────
CREATE TABLE IF NOT EXISTS public.crm_funis (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  text        NOT NULL,
  nome       text        NOT NULL,
  descricao  text,
  cor        text,
  is_padrao  boolean     NOT NULL DEFAULT false,
  ativo      boolean     NOT NULL DEFAULT true,
  ordem      integer     NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_funis_tenant   ON public.crm_funis(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_funis_padrao   ON public.crm_funis(tenant_id, is_padrao);

ALTER TABLE public.crm_funis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crm_funis_all" ON public.crm_funis;
CREATE POLICY "crm_funis_all" ON public.crm_funis FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.crm_funis TO authenticated, anon, service_role;

-- ── 2. Recria crm_funil_etapas apontando para crm_funis ──────────────────────
-- Primeiro dropa a tabela antiga (ela só tinha id/funil_id/tenant_id/nome/cor/ordem/meta_dias
-- e referenciava crm_funis_venda — se houver dados migrar antes de dropar em produção)
DROP TABLE IF EXISTS public.crm_funil_etapas CASCADE;

CREATE TABLE public.crm_funil_etapas (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  funil_id      uuid        NOT NULL REFERENCES public.crm_funis(id) ON DELETE CASCADE,
  tenant_id     text        NOT NULL,
  nome          text        NOT NULL,
  slug          text        NOT NULL DEFAULT '',
  cor           text        NOT NULL DEFAULT '#6366f1',
  icone         text,
  ordem         integer     NOT NULL DEFAULT 0,
  probabilidade integer     NOT NULL DEFAULT 50,
  obrigatoria   boolean     NOT NULL DEFAULT false,
  tipo          text        CHECK (tipo IS NULL OR tipo IN ('NORMAL','PROSPECCAO','NEGOCIACAO','GANHA','PERDIDA')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_etapas_funil  ON public.crm_funil_etapas(funil_id);
CREATE INDEX IF NOT EXISTS idx_crm_etapas_tenant ON public.crm_funil_etapas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_etapas_tipo   ON public.crm_funil_etapas(tipo) WHERE tipo IS NOT NULL;

ALTER TABLE public.crm_funil_etapas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crm_etapas_all" ON public.crm_funil_etapas;
CREATE POLICY "crm_etapas_all" ON public.crm_funil_etapas FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.crm_funil_etapas TO authenticated, anon, service_role;
