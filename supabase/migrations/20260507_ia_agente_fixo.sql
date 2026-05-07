-- =============================================================================
-- MIGRATION: Agentes fixos do sistema (fixo + slug)
-- Permite marcar agentes como não-deletáveis e identificá-los por slug.
-- =============================================================================

ALTER TABLE public.ia_agentes
  ADD COLUMN IF NOT EXISTS fixo BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- Garante que cada tenant tenha no máximo um agente por slug
CREATE UNIQUE INDEX IF NOT EXISTS idx_ia_agentes_tenant_slug
  ON public.ia_agentes(tenant_id, slug)
  WHERE slug IS NOT NULL;
