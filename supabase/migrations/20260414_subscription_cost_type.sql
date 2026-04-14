-- ─────────────────────────────────────────────────────────────────────────────
-- erp_produtos — Adicionar 'semanal' ao ciclo + campos de custo de assinatura
-- ─────────────────────────────────────────────────────────────────────────────

-- Expandir CHECK de subscription_period para incluir 'semanal'
ALTER TABLE erp_produtos
  DROP CONSTRAINT IF EXISTS erp_produtos_subscription_period_check;

ALTER TABLE erp_produtos
  ADD CONSTRAINT erp_produtos_subscription_period_check
    CHECK (subscription_period IN ('semanal','mensal','trimestral','semestral','anual'));

-- Tipo de custo operacional da assinatura
--   fixo    = custo fixo independente da quantidade de assinantes
--   relativo = custo escala a cada novo assinante (ex: R$5/assinante/mês)
ALTER TABLE erp_produtos
  ADD COLUMN IF NOT EXISTS subscription_cost_type text
    CHECK (subscription_cost_type IN ('fixo','relativo')),
  ADD COLUMN IF NOT EXISTS subscription_cost_per_unit numeric(12,2) DEFAULT 0;
