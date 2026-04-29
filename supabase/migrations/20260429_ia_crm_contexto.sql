-- Tabela compartilhada de contexto entre as ferramentas de IA do CRM:
-- IA CRM (chat), Escuta Inteligente e Inteligência de Leads.
-- Cada módulo salva resumos de eventos significativos aqui.
-- Todos os módulos lêem os últimos registros para enriquecer seus prompts.

CREATE TABLE IF NOT EXISTS ia_crm_contexto (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   TEXT        NOT NULL,
  modulo      TEXT        NOT NULL CHECK (modulo IN ('ia_crm', 'escuta', 'leads')),
  negociacao_id UUID      REFERENCES crm_negociacoes(id) ON DELETE SET NULL,
  titulo      TEXT        NOT NULL,
  resumo      TEXT        NOT NULL,
  dados       JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ia_crm_contexto_tenant_created
  ON ia_crm_contexto (tenant_id, created_at DESC);

ALTER TABLE ia_crm_contexto ENABLE ROW LEVEL SECURITY;

GRANT ALL ON ia_crm_contexto TO authenticated, service_role;
