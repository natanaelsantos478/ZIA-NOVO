-- Etapa 5: Itens de embarque
-- Rastreia quais produtos/SKUs compõem cada embarque

CREATE TABLE IF NOT EXISTS scm_embarque_itens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     TEXT NOT NULL,
  embarque_id   UUID NOT NULL REFERENCES scm_embarques(id) ON DELETE CASCADE,
  produto_id    UUID REFERENCES erp_produtos(id) ON DELETE SET NULL,
  descricao     TEXT NOT NULL,
  quantidade    NUMERIC(12, 3) NOT NULL DEFAULT 1,
  unidade       TEXT NOT NULL DEFAULT 'un',
  peso_kg       NUMERIC(10, 3),
  volume_m3     NUMERIC(10, 4),
  observacao    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE scm_embarque_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON scm_embarque_itens
  USING (tenant_id = ANY(zia_scope_ids()));

CREATE POLICY "tenant_insert" ON scm_embarque_itens
  FOR INSERT WITH CHECK (
    zia_no_auth() OR tenant_id = ANY(zia_scope_ids())
  );

CREATE POLICY "tenant_update" ON scm_embarque_itens
  FOR UPDATE USING (tenant_id = ANY(zia_scope_ids()));

CREATE POLICY "tenant_delete" ON scm_embarque_itens
  FOR DELETE USING (tenant_id = ANY(zia_scope_ids()));

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_scm_embarque_itens_tenant   ON scm_embarque_itens(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scm_embarque_itens_embarque ON scm_embarque_itens(embarque_id);
CREATE INDEX IF NOT EXISTS idx_scm_embarque_itens_produto  ON scm_embarque_itens(produto_id) WHERE produto_id IS NOT NULL;

-- Grants
GRANT ALL ON scm_embarque_itens TO authenticated;
GRANT ALL ON scm_embarque_itens TO service_role;
