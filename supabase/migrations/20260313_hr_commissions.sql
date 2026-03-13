-- ─────────────────────────────────────────────────────────────────────────────
-- hr_commissions — Comissões de vendas vinculadas a funcionários
-- Geradas automaticamente ao finalizar uma venda no CRM com comissão
-- Integradas ao módulo de RH (histórico financeiro do funcionário)
-- e ao módulo de Folha de Pagamento (campo commissions do PayrollItem)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS hr_commissions (
  id              uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  zia_company_id  uuid          NOT NULL,
  employee_id     text          NOT NULL,       -- hr_employees.id
  amount          numeric(12,2) NOT NULL,
  source_type     text          NOT NULL DEFAULT 'crm_venda',
  source_id       text,                         -- crm_finalizacoes.orcamento_id
  negociacao_id   text,
  cliente_nome    text,
  descricao       text,
  recorrente      boolean       DEFAULT false,  -- comissão recorrente (assinatura)
  reference_date  date          NOT NULL DEFAULT CURRENT_DATE,
  pago            boolean       DEFAULT false,  -- liquidado na folha
  folha_id        text,                         -- run de folha em que foi pago
  created_at      timestamptz   DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_commissions_employee  ON hr_commissions(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_commissions_company   ON hr_commissions(zia_company_id);
CREATE INDEX IF NOT EXISTS idx_hr_commissions_source    ON hr_commissions(source_id);

GRANT SELECT, INSERT, UPDATE ON hr_commissions TO anon, authenticated;
