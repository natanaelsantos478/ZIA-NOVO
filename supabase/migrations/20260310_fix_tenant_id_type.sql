-- =============================================================================
-- MIGRATION: Altera tenant_id de uuid para text em todas as tabelas ERP
-- Necessário porque os IDs de empresa/filial são strings (ex: "branch-1773149292370")
-- e não UUIDs. Execute no SQL Editor do Supabase Dashboard.
-- =============================================================================

ALTER TABLE public.erp_clientes              ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
ALTER TABLE public.erp_fornecedores          ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
ALTER TABLE public.erp_grupo_produtos        ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
ALTER TABLE public.erp_produtos              ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
ALTER TABLE public.erp_estoque_movimentos    ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
ALTER TABLE public.erp_pedidos               ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
ALTER TABLE public.erp_pedidos_itens         ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
ALTER TABLE public.erp_financeiro_lancamentos ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
ALTER TABLE public.erp_contas_bancarias      ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
ALTER TABLE public.erp_atendimentos          ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
ALTER TABLE public.erp_atividades            ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
ALTER TABLE public.erp_projetos              ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
ALTER TABLE public.erp_grupos_projetos       ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
ALTER TABLE public.erp_empresas              ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
ALTER TABLE public.erp_caixa_sessoes         ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
ALTER TABLE public.erp_caixa_transacoes      ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
ALTER TABLE public.erp_caixa_vendas          ALTER COLUMN tenant_id TYPE text USING tenant_id::text;
ALTER TABLE public.erp_caixa_venda_itens     ALTER COLUMN tenant_id TYPE text USING tenant_id::text;

-- Confirmação
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'tenant_id'
ORDER BY table_name;
