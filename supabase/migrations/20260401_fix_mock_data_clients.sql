-- =============================================================================
-- FIX: Limpar dados mock de clientes e verificar integridade da hierarquia
--
-- 1. Remove clientes com tenant_id cccccccc-* (fora da hierarquia zia_companies)
-- 2. Linka crm_negociacoes ao erp_clientes via cliente_id onde o nome bater
-- 3. Adiciona 1 cliente mock em matrix-001 e matrix-002 para teste completo
-- =============================================================================

-- ── 1. Remover clientes orphans (cccccccc-* não existem em zia_companies) ──────
DELETE FROM public.erp_clientes
WHERE tenant_id LIKE 'cccccccc-%';

-- ── 2. Linkar crm_negociacoes → erp_clientes onde cliente_id ainda é NULL ─────
-- Para cada negociação sem cliente_id, tenta encontrar o cliente pelo nome
-- no mesmo tenant OU no tenant da holding (hierarquia).

UPDATE public.crm_negociacoes n
SET cliente_id = c.id
FROM public.erp_clientes c
WHERE n.cliente_id IS NULL
  AND lower(trim(n.cliente_nome)) = lower(trim(c.nome))
  AND (
    -- mesmo tenant
    c.tenant_id = n.tenant_id
    OR
    -- cliente pertence à holding (visível para todos)
    c.tenant_id = '00000000-0000-0000-0000-000000000001'
  );

-- ── 3. Adicionar clientes mock para matrix-001 e matrix-002 ──────────────────
-- Só insere se ainda não existir cliente nesse tenant.

INSERT INTO public.erp_clientes (id, tenant_id, tipo, nome, cpf_cnpj, ativo)
SELECT
  gen_random_uuid(), 'matrix-001', 'PJ',
  'Empresa Matriz 1 – Cliente Teste', '00.000.001/0001-91', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.erp_clientes WHERE tenant_id = 'matrix-001'
);

INSERT INTO public.erp_clientes (id, tenant_id, tipo, nome, cpf_cnpj, ativo)
SELECT
  gen_random_uuid(), 'matrix-002', 'PJ',
  'Empresa Matriz 2 – Cliente Teste', '00.000.002/0001-02', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.erp_clientes WHERE tenant_id = 'matrix-002'
);

-- ── Verificação ───────────────────────────────────────────────────────────────
SELECT tenant_id, count(*) as clientes
FROM public.erp_clientes
GROUP BY tenant_id
ORDER BY tenant_id;
