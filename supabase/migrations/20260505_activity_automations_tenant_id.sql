-- Adiciona tenant_id às tabelas de automação de atividades
-- Necessário para isolamento multi-tenant (seguindo padrão do projeto)
ALTER TABLE activity_automations ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT '';
ALTER TABLE activity_groups      ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_activity_automations_tenant ON activity_automations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activity_groups_tenant      ON activity_groups(tenant_id);
