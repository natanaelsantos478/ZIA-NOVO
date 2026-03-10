-- =============================================================================
-- MIGRATION: Fix grants + create missing caixa tables
-- Execute no SQL Editor do Supabase Dashboard (uma vez)
-- =============================================================================

-- ── 1. Corrigir grants das tabelas sem permissão ──────────────────────────────

-- erp_caixa_sessoes
GRANT ALL ON public.erp_caixa_sessoes TO anon, authenticated, service_role;

-- erp_caixa_transacoes
GRANT ALL ON public.erp_caixa_transacoes TO anon, authenticated, service_role;

-- zia_usuarios
GRANT SELECT, INSERT, UPDATE ON public.zia_usuarios TO authenticated;
GRANT ALL ON public.zia_usuarios TO service_role;

-- ── 2. Garantir RLS policies nas tabelas de caixa ────────────────────────────

-- Sessões
ALTER TABLE public.erp_caixa_sessoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sessoes_select" ON public.erp_caixa_sessoes;
DROP POLICY IF EXISTS "sessoes_insert" ON public.erp_caixa_sessoes;
DROP POLICY IF EXISTS "sessoes_update" ON public.erp_caixa_sessoes;

CREATE POLICY "sessoes_select" ON public.erp_caixa_sessoes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "sessoes_insert" ON public.erp_caixa_sessoes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "sessoes_update" ON public.erp_caixa_sessoes
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Transações
ALTER TABLE public.erp_caixa_transacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transacoes_select" ON public.erp_caixa_transacoes;
DROP POLICY IF EXISTS "transacoes_insert" ON public.erp_caixa_transacoes;
DROP POLICY IF EXISTS "transacoes_update" ON public.erp_caixa_transacoes;

CREATE POLICY "transacoes_select" ON public.erp_caixa_transacoes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "transacoes_insert" ON public.erp_caixa_transacoes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "transacoes_update" ON public.erp_caixa_transacoes
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ── 3. Criar tabela de vendas (cabeçalho) ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.erp_caixa_vendas (
  id               uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_id        uuid         NOT NULL REFERENCES public.erp_caixa_sessoes(id) ON DELETE CASCADE,
  operador_codigo  varchar      NOT NULL,
  cliente_id       uuid         REFERENCES public.erp_clientes(id),
  subtotal         numeric      NOT NULL DEFAULT 0,
  desconto         numeric      NOT NULL DEFAULT 0,
  total            numeric      NOT NULL DEFAULT 0,
  pagamentos_json  jsonb        NOT NULL DEFAULT '[]',
  status           text         NOT NULL DEFAULT 'FINALIZADA'
                                CHECK (status IN ('FINALIZADA', 'CANCELADA')),
  tenant_id        uuid         NOT NULL,
  created_at       timestamptz  NOT NULL DEFAULT now()
);

ALTER TABLE public.erp_caixa_vendas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vendas_select" ON public.erp_caixa_vendas;
DROP POLICY IF EXISTS "vendas_insert" ON public.erp_caixa_vendas;
DROP POLICY IF EXISTS "vendas_update" ON public.erp_caixa_vendas;

CREATE POLICY "vendas_select" ON public.erp_caixa_vendas
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "vendas_insert" ON public.erp_caixa_vendas
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "vendas_update" ON public.erp_caixa_vendas
  FOR UPDATE USING (auth.uid() IS NOT NULL);

GRANT ALL ON public.erp_caixa_vendas TO anon, authenticated, service_role;

-- ── 4. Criar tabela de itens da venda ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.erp_caixa_venda_itens (
  id             uuid     PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id       uuid     NOT NULL REFERENCES public.erp_caixa_vendas(id) ON DELETE CASCADE,
  produto_id     uuid     REFERENCES public.erp_produtos(id),
  produto_nome   text     NOT NULL,
  produto_code   text     NOT NULL,
  unidade        text     NOT NULL DEFAULT 'UN',
  quantidade     numeric  NOT NULL DEFAULT 1,
  preco_unitario numeric  NOT NULL DEFAULT 0,
  desconto_pct   numeric  NOT NULL DEFAULT 0,
  total_item     numeric  NOT NULL DEFAULT 0,
  tenant_id      uuid     NOT NULL
);

ALTER TABLE public.erp_caixa_venda_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "venda_itens_select" ON public.erp_caixa_venda_itens;
DROP POLICY IF EXISTS "venda_itens_insert" ON public.erp_caixa_venda_itens;

CREATE POLICY "venda_itens_select" ON public.erp_caixa_venda_itens
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "venda_itens_insert" ON public.erp_caixa_venda_itens
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

GRANT ALL ON public.erp_caixa_venda_itens TO anon, authenticated, service_role;

-- ── 5. Índices ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_caixa_vendas_sessao    ON public.erp_caixa_vendas(sessao_id);
CREATE INDEX IF NOT EXISTS idx_caixa_vendas_tenant    ON public.erp_caixa_vendas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_caixa_venda_itens_venda ON public.erp_caixa_venda_itens(venda_id);

-- ── 6. Confirmação ────────────────────────────────────────────────────────────

SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'erp_caixa_sessoes',
    'erp_caixa_transacoes',
    'erp_caixa_vendas',
    'erp_caixa_venda_itens',
    'zia_usuarios'
  )
ORDER BY tablename;
