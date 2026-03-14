-- ─────────────────────────────────────────────────────────────────────────────
-- crm_finalizacoes — Finalizações de Venda
-- Migra os dados de localStorage para Supabase com isolamento por tenant
-- e suporte a controle de acesso por vendedor (nível 4)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm_finalizacoes (
  id                  uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  zia_company_id      uuid          NOT NULL,          -- tenant isolation
  orcamento_id        text          NOT NULL,           -- CRM orcamento reference
  negociacao_id       text          NOT NULL,           -- CRM negociacao reference
  tipo_pagamento      text          NOT NULL
                        CHECK (tipo_pagamento IN ('unico','recorrente')),
  recorrencia_ativa   boolean       DEFAULT false,
  periodo_recorrencia text,
  duracao_tipo        text,
  duracao_valor       integer,
  data_inicio         date,
  tem_comissao        boolean       DEFAULT false,
  vendedor_id         text,                             -- hr_employees.id
  vendedor_nome       text,
  comissao_pct        numeric(5,2),
  comissao_recorrente boolean       DEFAULT false,
  comissao_valor      numeric(12,2),
  total_venda         numeric(12,2) NOT NULL,
  status              text          NOT NULL DEFAULT 'ativa'
                        CHECK (status IN ('ativa','encerrada','cancelada')),
  created_at          timestamptz   DEFAULT now()
);

-- Índices para queries com acesso por tenant e vendedor
CREATE INDEX IF NOT EXISTS idx_crm_finalizacoes_company
  ON crm_finalizacoes(zia_company_id);

CREATE INDEX IF NOT EXISTS idx_crm_finalizacoes_vendedor
  ON crm_finalizacoes(vendedor_id);

CREATE INDEX IF NOT EXISTS idx_crm_finalizacoes_negociacao
  ON crm_finalizacoes(negociacao_id);

-- Unicidade por orçamento (evita duplicatas no upsert)
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_finalizacoes_orcamento
  ON crm_finalizacoes(orcamento_id);

-- Grants
GRANT SELECT, INSERT, UPDATE ON crm_finalizacoes TO anon, authenticated;
