-- =============================================================================
-- MIGRATION: CRM Anotações + Funis de Venda
-- =============================================================================

-- ── crm_anotacoes ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crm_anotacoes (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  negociacao_id  uuid        NOT NULL REFERENCES public.crm_negociacoes(id) ON DELETE CASCADE,
  tenant_id      text        NOT NULL,
  tipo           text        NOT NULL DEFAULT 'anotacao'
                             CHECK (tipo IN ('anotacao','tarefa')),
  conteudo       text        NOT NULL DEFAULT '',
  concluida      boolean     NOT NULL DEFAULT false,
  data_prazo     date,
  criado_por     text        NOT NULL DEFAULT 'usuario',
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_anot_neg    ON public.crm_anotacoes(negociacao_id);
CREATE INDEX IF NOT EXISTS idx_crm_anot_tenant ON public.crm_anotacoes(tenant_id);

ALTER TABLE public.crm_anotacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_anotacoes" ON public.crm_anotacoes
  USING (tenant_id = (SELECT COALESCE(
    (SELECT raw_user_meta_data->>'active_entity_id' FROM auth.users WHERE id = auth.uid()),
    '00000000-0000-0000-0000-000000000001'
  )));

-- ── crm_funis_venda ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crm_funis_venda (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  text        NOT NULL,
  nome       text        NOT NULL,
  descricao  text,
  padrao     boolean     NOT NULL DEFAULT false,
  ordem      integer     NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_funis_tenant ON public.crm_funis_venda(tenant_id);

ALTER TABLE public.crm_funis_venda ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_funis" ON public.crm_funis_venda
  USING (tenant_id = (SELECT COALESCE(
    (SELECT raw_user_meta_data->>'active_entity_id' FROM auth.users WHERE id = auth.uid()),
    '00000000-0000-0000-0000-000000000001'
  )));

-- ── crm_funil_etapas ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crm_funil_etapas (
  id        uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  funil_id  uuid    NOT NULL REFERENCES public.crm_funis_venda(id) ON DELETE CASCADE,
  tenant_id text    NOT NULL,
  nome      text    NOT NULL,
  cor       text    NOT NULL DEFAULT '#6366f1',
  ordem     integer NOT NULL DEFAULT 0,
  meta_dias integer          -- SLA esperado em dias
);

CREATE INDEX IF NOT EXISTS idx_crm_etapas_funil ON public.crm_funil_etapas(funil_id);

ALTER TABLE public.crm_funil_etapas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_etapas" ON public.crm_funil_etapas
  USING (tenant_id = (SELECT COALESCE(
    (SELECT raw_user_meta_data->>'active_entity_id' FROM auth.users WHERE id = auth.uid()),
    '00000000-0000-0000-0000-000000000001'
  )));

-- ── Grants ────────────────────────────────────────────────────────────────────
GRANT ALL ON public.crm_anotacoes    TO authenticated, anon;
GRANT ALL ON public.crm_funis_venda  TO authenticated, anon;
GRANT ALL ON public.crm_funil_etapas TO authenticated, anon;
