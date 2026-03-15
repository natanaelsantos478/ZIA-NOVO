-- =============================================================================
-- MIGRATION: Adiciona coluna `tipo` em crm_funil_etapas
-- Vincula cada etapa a um dos 6 tipos obrigatórios do funil.
-- Etapas obrigatórias: prospeccao | projeto_em_analise | proposta_enviada |
--                      proposta_aceita | venda_realizada | venda_cancelada
-- =============================================================================

ALTER TABLE public.crm_funil_etapas
  ADD COLUMN IF NOT EXISTS tipo text
  CHECK (
    tipo IS NULL OR tipo IN (
      'prospeccao',
      'projeto_em_analise',
      'proposta_enviada',
      'proposta_aceita',
      'venda_realizada',
      'venda_cancelada'
    )
  );

COMMENT ON COLUMN public.crm_funil_etapas.tipo IS
  'Tipo obrigatório da etapa. NULL = etapa personalizada (pode ser excluída). '
  'Etapas com tipo definido não devem ser excluídas pela UI.';

CREATE INDEX IF NOT EXISTS idx_crm_etapas_tipo ON public.crm_funil_etapas(tipo)
  WHERE tipo IS NOT NULL;
