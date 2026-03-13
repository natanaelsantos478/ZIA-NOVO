-- ─────────────────────────────────────────────────────────────────────────────
-- erp_produtos — Campos de configuração de Assinatura (Subscription)
-- Adicionados ao produto quando is_subscription = true
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE erp_produtos
  ADD COLUMN IF NOT EXISTS subscription_period      text
    CHECK (subscription_period IN ('mensal','trimestral','semestral','anual')),
  ADD COLUMN IF NOT EXISTS subscription_trial_days  integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subscription_min_months  integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS subscription_setup_fee   numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subscription_features    jsonb DEFAULT '[]'::jsonb;
