-- ─────────────────────────────────────────────────────────────────────────────
-- 20260314_orcamentos_apresentacao.sql
-- Tabelas para configuração global de orçamentos, apresentações e imagens de produtos
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Configuração global de orçamentos ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_orcamento_config (
  id                        UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  tenant_id                 UUID NOT NULL UNIQUE,
  logo_url                  TEXT,
  logo_storage_path         TEXT,
  cor_primaria              TEXT DEFAULT '#7c3aed',
  cor_secundaria            TEXT DEFAULT '#f3f4f6',
  cor_texto                 TEXT DEFAULT '#111827',
  fonte_padrao              TEXT DEFAULT 'Inter',
  texto_validade            TEXT,
  texto_condicoes           TEXT,
  texto_rodape              TEXT,
  assinatura_url            TEXT,
  mostrar_codigo_produto    BOOLEAN DEFAULT true,
  mostrar_ncm               BOOLEAN DEFAULT false,
  mostrar_estoque           BOOLEAN DEFAULT false,
  mostrar_desconto_por_item BOOLEAN DEFAULT true,
  mostrar_imagens_produto   BOOLEAN DEFAULT true,
  max_imagens_por_produto   INTEGER DEFAULT 3,
  prefixo_numero            TEXT DEFAULT 'ORC',
  proximo_numero            INTEGER DEFAULT 1,
  empresa                   TEXT DEFAULT 'Minha Empresa',
  template_apresentacao     JSONB DEFAULT '{"paginas": []}',
  template_paginas          JSONB DEFAULT '[]',
  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now()
);

-- ── Apresentações individuais por orçamento ────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm_orcamento_apresentacoes (
  id           UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  orcamento_id UUID NOT NULL REFERENCES crm_orcamentos(id) ON DELETE CASCADE,
  tenant_id    UUID NOT NULL,
  nome         TEXT DEFAULT 'Apresentação',
  orientacao   TEXT DEFAULT 'portrait',
  tamanho_pagina TEXT DEFAULT 'A4',
  paginas      JSONB NOT NULL DEFAULT '[]',
  thumbnail_url TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_apres_orcamento ON crm_orcamento_apresentacoes(orcamento_id);
CREATE INDEX IF NOT EXISTS idx_crm_apres_tenant    ON crm_orcamento_apresentacoes(tenant_id);

-- ── Imagens de produtos ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS erp_produto_imagens (
  id           UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
  produto_id   UUID NOT NULL REFERENCES erp_produtos(id) ON DELETE CASCADE,
  url          TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  ordem        INTEGER DEFAULT 0,
  legenda      TEXT,
  is_principal BOOLEAN DEFAULT false,
  tenant_id    UUID NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_erp_prod_img_produto ON erp_produto_imagens(produto_id);
CREATE INDEX IF NOT EXISTS idx_erp_prod_img_tenant  ON erp_produto_imagens(tenant_id);

-- ── Coluna apresentacao_id em crm_orcamentos (link direto) ────────────────────
ALTER TABLE crm_orcamentos
  ADD COLUMN IF NOT EXISTS apresentacao_id UUID REFERENCES crm_orcamento_apresentacoes(id);

-- ── Row Level Security ─────────────────────────────────────────────────────────
ALTER TABLE crm_orcamento_config       ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_orcamento_apresentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_produto_imagens         ENABLE ROW LEVEL SECURITY;

-- Políticas simples (tenant_id = auth.uid() para MVP sem multitenancy real)
CREATE POLICY p_orc_config_all ON crm_orcamento_config
  USING (true) WITH CHECK (true);

CREATE POLICY p_orc_apres_all ON crm_orcamento_apresentacoes
  USING (true) WITH CHECK (true);

CREATE POLICY p_prod_img_all ON erp_produto_imagens
  USING (true) WITH CHECK (true);
