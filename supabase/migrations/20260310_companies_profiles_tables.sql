-- =============================================================================
-- MIGRATION: Tabelas para Companies e Profiles (migração do localStorage)
-- Execute no SQL Editor do Supabase Dashboard
-- =============================================================================

-- ── 1. Fix: grant na sequência do numero de caixa ─────────────────────────────

GRANT USAGE, SELECT ON SEQUENCE public.erp_caixa_sessoes_numero_seq
  TO anon, authenticated, service_role;

-- ── 2. Tabela unificada de empresas (holding / matriz / filial) ────────────────

CREATE TABLE IF NOT EXISTS public.zia_companies (
  id                 text        PRIMARY KEY,
  type               text        NOT NULL CHECK (type IN ('holding', 'matrix', 'branch')),
  parent_id          text        REFERENCES public.zia_companies(id) ON DELETE RESTRICT,
  code               text        NOT NULL,
  razao_social       text        NOT NULL,
  nome_fantasia      text        NOT NULL,
  cnpj               text        NOT NULL DEFAULT '',
  inscricao_estadual text,
  email              text,
  telefone           text,
  endereco           text,
  cidade             text,
  estado             text,
  cep                text,
  status             text        NOT NULL DEFAULT 'ativa',
  created_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.zia_companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "companies_all" ON public.zia_companies;
CREATE POLICY "companies_all" ON public.zia_companies FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.zia_companies TO anon, authenticated, service_role;

-- ── 3. Tabela de perfis de operadores ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.zia_operator_profiles (
  id            text        PRIMARY KEY,
  code          text        NOT NULL,
  name          text        NOT NULL,
  level         integer     NOT NULL CHECK (level BETWEEN 1 AND 4),
  entity_type   text        NOT NULL,
  entity_id     text        NOT NULL,
  entity_name   text        NOT NULL,
  module_access text,
  password      text,
  active        boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.zia_operator_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_all" ON public.zia_operator_profiles;
CREATE POLICY "profiles_all" ON public.zia_operator_profiles FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.zia_operator_profiles TO anon, authenticated, service_role;

-- ── 4. Fix: RLS permissiva nas tabelas de caixa (app usa anon sem auth) ────────
-- Substitui as policies que exigiam auth.uid() IS NOT NULL

-- erp_caixa_sessoes
DROP POLICY IF EXISTS "sessoes_select" ON public.erp_caixa_sessoes;
DROP POLICY IF EXISTS "sessoes_insert" ON public.erp_caixa_sessoes;
DROP POLICY IF EXISTS "sessoes_update" ON public.erp_caixa_sessoes;
CREATE POLICY "sessoes_all" ON public.erp_caixa_sessoes FOR ALL USING (true) WITH CHECK (true);

-- erp_caixa_transacoes
DROP POLICY IF EXISTS "transacoes_select" ON public.erp_caixa_transacoes;
DROP POLICY IF EXISTS "transacoes_insert" ON public.erp_caixa_transacoes;
DROP POLICY IF EXISTS "transacoes_update" ON public.erp_caixa_transacoes;
CREATE POLICY "transacoes_all" ON public.erp_caixa_transacoes FOR ALL USING (true) WITH CHECK (true);

-- erp_caixa_vendas
DROP POLICY IF EXISTS "vendas_select" ON public.erp_caixa_vendas;
DROP POLICY IF EXISTS "vendas_insert" ON public.erp_caixa_vendas;
DROP POLICY IF EXISTS "vendas_update" ON public.erp_caixa_vendas;
CREATE POLICY "vendas_all" ON public.erp_caixa_vendas FOR ALL USING (true) WITH CHECK (true);

-- erp_caixa_venda_itens
DROP POLICY IF EXISTS "venda_itens_select" ON public.erp_caixa_venda_itens;
DROP POLICY IF EXISTS "venda_itens_insert" ON public.erp_caixa_venda_itens;
CREATE POLICY "venda_itens_all" ON public.erp_caixa_venda_itens FOR ALL USING (true) WITH CHECK (true);

-- ── 5. Confirmação ────────────────────────────────────────────────────────────

SELECT tablename, rowsecurity AS rls
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'zia_companies', 'zia_operator_profiles',
    'erp_caixa_sessoes', 'erp_caixa_transacoes',
    'erp_caixa_vendas', 'erp_caixa_venda_itens'
  )
ORDER BY tablename;
