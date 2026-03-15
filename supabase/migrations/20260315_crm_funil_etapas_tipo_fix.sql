-- =============================================================================
-- FIX: Corrige constraint de `tipo` em crm_funil_etapas
-- Troca os valores antigos (lowercase) pelos novos (PROSPECCAO/NEGOCIACAO/GANHA/PERDIDA)
-- Execute se a migration 20260315_crm_funil_etapas_tipo.sql já foi aplicada.
-- =============================================================================

-- Remove constraint antiga (pode ter qualquer nome dependendo do banco)
DO $$
DECLARE
  v_constraint text;
BEGIN
  SELECT conname INTO v_constraint
    FROM pg_constraint
    WHERE conrelid = 'public.crm_funil_etapas'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%prospeccao%';
  IF v_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.crm_funil_etapas DROP CONSTRAINT %I', v_constraint);
  END IF;
END $$;

-- Adiciona nova constraint com os valores corretos
ALTER TABLE public.crm_funil_etapas
  ADD CONSTRAINT crm_funil_etapas_tipo_check
  CHECK (
    tipo IS NULL OR tipo IN ('NORMAL', 'PROSPECCAO', 'NEGOCIACAO', 'GANHA', 'PERDIDA')
  );

-- Atualiza registros com valores legados caso existam
UPDATE public.crm_funil_etapas SET tipo = 'PROSPECCAO' WHERE tipo IN ('prospeccao', 'projeto_em_analise');
UPDATE public.crm_funil_etapas SET tipo = 'NEGOCIACAO'  WHERE tipo IN ('proposta_enviada', 'proposta_aceita');
UPDATE public.crm_funil_etapas SET tipo = 'GANHA'       WHERE tipo = 'venda_realizada';
UPDATE public.crm_funil_etapas SET tipo = 'PERDIDA'     WHERE tipo = 'venda_cancelada';
