-- ─────────────────────────────────────────────────────────────────────────────
-- SCM Fix Tenant Isolation — Etapa 1
-- scm_cold_chain e scm_rastreamento não têm coluna tenant_id.
-- A RLS policy do arquivo 20260420 aplica tenant_id = ANY(zia_scope_ids())
-- nessas tabelas, o que quebra silenciosamente qualquer INSERT/SELECT.
-- Solução: adicionar tenant_id e recriar as policies corretas.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── scm_cold_chain ────────────────────────────────────────────────────────────

ALTER TABLE public.scm_cold_chain
  ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

-- Backfill: herdar tenant_id do embarque vinculado (quando existir)
UPDATE public.scm_cold_chain cc
SET    tenant_id = emb.tenant_id
FROM   public.scm_embarques emb
WHERE  cc.embarque_id = emb.id
  AND  cc.tenant_id   = '00000000-0000-0000-0000-000000000001';

-- Recriar policy com a coluna agora existente
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'scm_cold_chain') THEN
    DROP POLICY IF EXISTS "tenant_isolation" ON public.scm_cold_chain;
    ALTER TABLE public.scm_cold_chain ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "tenant_isolation" ON public.scm_cold_chain FOR ALL
      USING  (zia_is_admin() OR zia_no_auth() OR tenant_id = ANY(zia_scope_ids()))
      WITH CHECK (zia_is_admin() OR zia_no_auth() OR tenant_id = ANY(zia_scope_ids()));
  END IF;
END $$;

-- ── scm_rastreamento ──────────────────────────────────────────────────────────

ALTER TABLE public.scm_rastreamento
  ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001';

-- Backfill: herdar tenant_id do embarque vinculado
UPDATE public.scm_rastreamento r
SET    tenant_id = emb.tenant_id
FROM   public.scm_embarques emb
WHERE  r.embarque_id = emb.id
  AND  r.tenant_id   = '00000000-0000-0000-0000-000000000001';

-- Recriar policy
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'scm_rastreamento') THEN
    DROP POLICY IF EXISTS "tenant_isolation" ON public.scm_rastreamento;
    ALTER TABLE public.scm_rastreamento ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "tenant_isolation" ON public.scm_rastreamento FOR ALL
      USING  (zia_is_admin() OR zia_no_auth() OR tenant_id = ANY(zia_scope_ids()))
      WITH CHECK (zia_is_admin() OR zia_no_auth() OR tenant_id = ANY(zia_scope_ids()));
  END IF;
END $$;

-- Índice de performance para queries filtradas por tenant
CREATE INDEX IF NOT EXISTS idx_scm_cold_chain_tenant_id    ON public.scm_cold_chain(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scm_rastreamento_tenant_id  ON public.scm_rastreamento(tenant_id);
