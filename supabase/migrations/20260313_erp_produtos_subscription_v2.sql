-- ─────────────────────────────────────────────────────────────────────────────
-- erp_produtos — Campos adicionais de Assinatura (v2)
-- Carência, limite de usuários, multi-plano, desconto anual
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE erp_produtos
  ADD COLUMN IF NOT EXISTS subscription_grace_days         integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subscription_max_users          integer,
  ADD COLUMN IF NOT EXISTS subscription_multi_plan         boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscription_annual_discount_pct numeric(5,2) DEFAULT 0;
