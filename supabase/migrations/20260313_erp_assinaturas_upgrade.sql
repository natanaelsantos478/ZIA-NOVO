-- ─────────────────────────────────────────────────────────────────────────────
-- erp_assinaturas — Expansão do módulo de assinaturas
-- Novos status, ciclo de cobrança, motivos, próximo vencimento
-- ─────────────────────────────────────────────────────────────────────────────

-- Remove constraint de status para recriar com valores extras
ALTER TABLE erp_assinaturas
  DROP CONSTRAINT IF EXISTS erp_assinaturas_status_check;

ALTER TABLE erp_assinaturas
  ADD CONSTRAINT erp_assinaturas_status_check
    CHECK (status IN ('ativa','pausada','cancelada','encerrada','inadimplente','em_trial'));

ALTER TABLE erp_assinaturas
  ADD COLUMN IF NOT EXISTS ciclo_cobranca      text
    CHECK (ciclo_cobranca IN ('mensal','trimestral','semestral','anual')),
  ADD COLUMN IF NOT EXISTS proximo_vencimento  date,
  ADD COLUMN IF NOT EXISTS motivo_cancelamento text,
  ADD COLUMN IF NOT EXISTS motivo_pausa        text,
  ADD COLUMN IF NOT EXISTS data_retorno_previsto date,
  ADD COLUMN IF NOT EXISTS desconto_motivo     text,
  ADD COLUMN IF NOT EXISTS desconto_validade   date;

-- ─────────────────────────────────────────────────────────────────────────────
-- erp_assinaturas_historico — Log de alterações em assinaturas
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS erp_assinaturas_historico (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       uuid        NOT NULL,
  assinatura_id   uuid        NOT NULL REFERENCES erp_assinaturas(id) ON DELETE CASCADE,
  acao            text        NOT NULL,  -- 'status_change','desconto','plano','ciclo','vendedor','observacao'
  valor_anterior  text,
  valor_novo      text,
  motivo          text,
  usuario_nome    text,
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ass_hist_assinatura ON erp_assinaturas_historico(assinatura_id);
CREATE INDEX IF NOT EXISTS idx_ass_hist_tenant     ON erp_assinaturas_historico(tenant_id);

GRANT SELECT, INSERT ON erp_assinaturas_historico TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- erp_assinaturas_cobrancas — Registro de cobranças por ciclo
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS erp_assinaturas_cobrancas (
  id              uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       uuid          NOT NULL,
  assinatura_id   uuid          NOT NULL REFERENCES erp_assinaturas(id) ON DELETE CASCADE,
  referencia      text          NOT NULL,  -- ex: '2026-01', '2026-Q1'
  valor_bruto     numeric(12,2) NOT NULL,
  desconto_pct    numeric(5,2)  DEFAULT 0,
  valor_liquido   numeric(12,2) NOT NULL,
  vencimento      date          NOT NULL,
  pago_em         date,
  status          text          NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente','pago','atrasado','cancelado')),
  gateway_id      text,
  created_at      timestamptz   DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ass_cob_assinatura ON erp_assinaturas_cobrancas(assinatura_id);
CREATE INDEX IF NOT EXISTS idx_ass_cob_tenant     ON erp_assinaturas_cobrancas(tenant_id);

GRANT SELECT, INSERT, UPDATE ON erp_assinaturas_cobrancas TO anon, authenticated;
