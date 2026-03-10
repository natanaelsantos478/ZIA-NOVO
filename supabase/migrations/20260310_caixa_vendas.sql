-- =============================================================================
-- MIGRATION: erp_caixa_vendas + erp_caixa_venda_itens
-- Tabelas para registrar vendas completas do PDV (Caixa)
-- Execute no SQL Editor do Supabase Dashboard
-- =============================================================================

-- ── Venda (cabeçalho) ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.erp_caixa_vendas (
  id               uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_id        uuid         NOT NULL REFERENCES public.erp_caixa_sessoes(id) ON DELETE CASCADE,
  operador_codigo  varchar      NOT NULL,
  cliente_id       uuid         REFERENCES public.erp_clientes(id),
  subtotal         numeric      NOT NULL DEFAULT 0,   -- reais
  desconto         numeric      NOT NULL DEFAULT 0,
  total            numeric      NOT NULL DEFAULT 0,
  pagamentos_json  jsonb        NOT NULL DEFAULT '[]',
  status           text         NOT NULL DEFAULT 'FINALIZADA'
                                CHECK (status IN ('FINALIZADA', 'CANCELADA')),
  tenant_id        uuid         NOT NULL,
  created_at       timestamptz  NOT NULL DEFAULT now()
);

-- ── Itens da venda ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.erp_caixa_venda_itens (
  id             uuid     PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id       uuid     NOT NULL REFERENCES public.erp_caixa_vendas(id) ON DELETE CASCADE,
  produto_id     uuid     REFERENCES public.erp_produtos(id),
  produto_nome   text     NOT NULL,
  produto_code   text     NOT NULL,
  unidade        text     NOT NULL DEFAULT 'UN',
  quantidade     numeric  NOT NULL DEFAULT 1,
  preco_unitario numeric  NOT NULL DEFAULT 0,  -- reais
  desconto_pct   numeric  NOT NULL DEFAULT 0,
  total_item     numeric  NOT NULL DEFAULT 0,  -- reais
  tenant_id      uuid     NOT NULL
);

-- ── Índices ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_caixa_vendas_sessao   ON public.erp_caixa_vendas(sessao_id);
CREATE INDEX IF NOT EXISTS idx_caixa_vendas_tenant   ON public.erp_caixa_vendas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_caixa_venda_itens_venda ON public.erp_caixa_venda_itens(venda_id);

-- ── RLS: habilita e cria políticas (mesma lógica das demais tabelas ERP) ──────
ALTER TABLE public.erp_caixa_vendas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_caixa_venda_itens ENABLE ROW LEVEL SECURITY;

-- Permite leitura e escrita para usuários autenticados do mesmo tenant
CREATE POLICY "tenant_vendas_select" ON public.erp_caixa_vendas
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "tenant_vendas_insert" ON public.erp_caixa_vendas
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "tenant_vendas_update" ON public.erp_caixa_vendas
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "tenant_venda_itens_select" ON public.erp_caixa_venda_itens
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "tenant_venda_itens_insert" ON public.erp_caixa_venda_itens
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ── Grant para roles do PostgREST ─────────────────────────────────────────────
GRANT ALL ON public.erp_caixa_vendas      TO anon, authenticated, service_role;
GRANT ALL ON public.erp_caixa_venda_itens TO anon, authenticated, service_role;
