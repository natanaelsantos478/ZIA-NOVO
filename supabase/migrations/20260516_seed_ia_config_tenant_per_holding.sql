-- Cria registros de ia_config_tenant para cada holding real,
-- clonando as configurações do DEFAULT_TENANT. Idempotente.
INSERT INTO ia_config_tenant (
  tenant_id, modelo_padrao, modelo_versao_padrao,
  ia_ativa, modo_autonomia, max_tokens_dia
)
SELECT
  t.tenant_id,
  c.modelo_padrao, c.modelo_versao_padrao,
  c.ia_ativa, c.modo_autonomia, c.max_tokens_dia
FROM (VALUES
  ('holding-zita-vendas'),
  ('holding-1776109691730'),
  ('holding-1776719943013')
) AS t(tenant_id)
CROSS JOIN ia_config_tenant c
WHERE c.tenant_id = '00000000-0000-0000-0000-000000000001'
  AND NOT EXISTS (
    SELECT 1 FROM ia_config_tenant x WHERE x.tenant_id = t.tenant_id
  );
