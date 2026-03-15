-- =============================================================================
-- MIGRATION: Adiciona coluna `tipo` em crm_funil_etapas
-- Vincula cada etapa a um dos 4 tipos: PROSPECCAO | NEGOCIACAO | GANHA | PERDIDA
-- =============================================================================

ALTER TABLE public.crm_funil_etapas
  ADD COLUMN IF NOT EXISTS tipo text
  CHECK (
    tipo IS NULL OR tipo IN (
      'NORMAL',
      'PROSPECCAO',
      'NEGOCIACAO',
      'GANHA',
      'PERDIDA'
    )
  );

COMMENT ON COLUMN public.crm_funil_etapas.tipo IS
  'Classificação da etapa: NORMAL | PROSPECCAO | NEGOCIACAO | GANHA | PERDIDA. '
  'NULL = etapa personalizada sem classificação.';

CREATE INDEX IF NOT EXISTS idx_crm_etapas_tipo ON public.crm_funil_etapas(tipo)
  WHERE tipo IS NOT NULL;
