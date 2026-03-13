-- ─────────────────────────────────────────────────────────────────────────────
-- Módulo de Assinaturas — tabelas de suporte
-- ─────────────────────────────────────────────────────────────────────────────

-- Status do plano no catálogo (planos são erp_produtos com is_subscription=true)
ALTER TABLE erp_produtos
  ADD COLUMN IF NOT EXISTS plano_status text DEFAULT 'ativo'
    CHECK (plano_status IN ('ativo','inativo','arquivado'));

-- ─────────────────────────────────────────────────────────────────────────────
-- assinaturas_acessos — usuários individuais vinculados a cada assinatura
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS assinaturas_acessos (
  id                 uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id          uuid          NOT NULL,
  assinatura_id      uuid          NOT NULL REFERENCES erp_assinaturas(id) ON DELETE CASCADE,
  nome_usuario       text          NOT NULL,
  email              text          NOT NULL,
  nivel              text          NOT NULL DEFAULT 'operador',
  valor_diferenciado numeric(12,2),
  status             text          NOT NULL DEFAULT 'ativo'
    CHECK (status IN ('ativo','suspenso','cancelado')),
  ultimo_acesso      timestamptz,
  externo_id         text,          -- ID do acesso na plataforma externa (se integrado)
  created_at         timestamptz   DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ass_acessos_assinatura ON assinaturas_acessos(assinatura_id);
CREATE INDEX IF NOT EXISTS idx_ass_acessos_tenant     ON assinaturas_acessos(tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON assinaturas_acessos TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- assinaturas_integracoes — configuração de cada integração por tenant
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS assinaturas_integracoes (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   uuid        NOT NULL,
  tipo        text        NOT NULL,
    -- 'hotmart' | 'kiwify' | 'stripe' | 'pagar_me' | 'guru' | 'pepper'
    -- 'eduzz' | 'monetizze' | 'vindi' | 'iugu' | 'generica' | 'planilha'
  api_key_enc text,
  webhook_url text,
  ativo       boolean     DEFAULT false,
  ultimo_sync timestamptz,
  ultimo_erro text,
  config_json jsonb       DEFAULT '{}',
  created_at  timestamptz DEFAULT now(),
  UNIQUE (tenant_id, tipo)
);

CREATE INDEX IF NOT EXISTS idx_ass_int_tenant ON assinaturas_integracoes(tenant_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON assinaturas_integracoes TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- assinaturas_integracoes_mapeamentos — plano local <-> produto externo
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS assinaturas_integracoes_mapeamentos (
  id                  uuid  DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id           uuid  NOT NULL,
  integracao_id       uuid  NOT NULL REFERENCES assinaturas_integracoes(id) ON DELETE CASCADE,
  produto_local_id    uuid  NOT NULL REFERENCES erp_produtos(id),
  produto_externo_id  text  NOT NULL,
  produto_externo_nome text
);

GRANT SELECT, INSERT, UPDATE, DELETE ON assinaturas_integracoes_mapeamentos TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- assinaturas_plano_faixas — preço escalonado por faixa de quantidade
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS assinaturas_plano_faixas (
  id         uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id  uuid          NOT NULL,
  plano_id   uuid          NOT NULL REFERENCES erp_produtos(id) ON DELETE CASCADE,
  faixa_min  integer       NOT NULL,
  faixa_max  integer,      -- null = ilimitado
  preco      numeric(12,2) NOT NULL,
  created_at timestamptz   DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ass_faixas_plano ON assinaturas_plano_faixas(plano_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON assinaturas_plano_faixas TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- assinaturas_plano_metricas — métricas customizáveis por plano
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS assinaturas_plano_metricas (
  id              uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       uuid          NOT NULL,
  plano_id        uuid          NOT NULL REFERENCES erp_produtos(id) ON DELETE CASCADE,
  nome            text          NOT NULL,
  limite          integer,
  acao_limite     text          NOT NULL DEFAULT 'notificar'
    CHECK (acao_limite IN ('bloquear','notificar','cobrar_excedente')),
  preco_excedente numeric(12,2) DEFAULT 0,
  created_at      timestamptz   DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ass_metricas_plano ON assinaturas_plano_metricas(plano_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON assinaturas_plano_metricas TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- assinaturas_plano_regras — regras de upgrade/downgrade entre planos
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS assinaturas_plano_regras (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id        uuid NOT NULL,
  plano_origem_id  uuid NOT NULL REFERENCES erp_produtos(id) ON DELETE CASCADE,
  plano_destino_id uuid NOT NULL REFERENCES erp_produtos(id),
  tipo             text NOT NULL CHECK (tipo IN ('upgrade','downgrade')),
  cobranca         text NOT NULL DEFAULT 'proximo_ciclo'
    CHECK (cobranca IN ('imediata','proximo_ciclo'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON assinaturas_plano_regras TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- assinaturas_config — configuração global do módulo por tenant
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS assinaturas_config (
  id                          uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id                   uuid    NOT NULL UNIQUE,
  allow_trial                 boolean DEFAULT true,
  trial_dias_padrao           integer DEFAULT 7,
  churn_alerta_dias           integer DEFAULT 7,
  notificar_inadimplente_dias integer DEFAULT 3,
  is_internal_license_mode    boolean DEFAULT false,
  created_at                  timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON assinaturas_config TO anon, authenticated;
