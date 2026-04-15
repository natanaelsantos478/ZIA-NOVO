-- ─────────────────────────────────────────────────────────────────────────────
-- crm_custos — Custos atrelados a compromissos e atividades de CRM
-- Cada custo gera automaticamente um lançamento DESPESA no financeiro
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm_custos (
  id               uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id        uuid          NOT NULL,
  descricao        text          NOT NULL,
  valor            numeric(12,2) NOT NULL CHECK (valor >= 0),
  data             date          NOT NULL DEFAULT CURRENT_DATE,
  categoria        text          NOT NULL DEFAULT 'outros'
    CHECK (categoria IN ('deslocamento','material','alimentacao','hospedagem','publicidade','outros')),
  negociacao_id    uuid          REFERENCES crm_negociacoes(id)    ON DELETE SET NULL,
  atividade_id     uuid          REFERENCES crm_atividades(id)     ON DELETE SET NULL,
  compromisso_id   uuid          REFERENCES crm_compromissos(id)   ON DELETE SET NULL,
  lancamento_id    uuid          REFERENCES erp_financeiro_lancamentos(id) ON DELETE SET NULL,
  created_at       timestamptz   DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_custos_tenant        ON crm_custos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_custos_negociacao    ON crm_custos(negociacao_id);
CREATE INDEX IF NOT EXISTS idx_crm_custos_atividade     ON crm_custos(atividade_id);
CREATE INDEX IF NOT EXISTS idx_crm_custos_compromisso   ON crm_custos(compromisso_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON crm_custos TO anon, authenticated;
