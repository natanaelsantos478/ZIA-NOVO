-- =============================================================================
-- MIGRATION: Tabelas do Agente IA ZIA
-- Cria as tabelas de conversas, mensagens e log de ações do agente.
-- Execute no SQL Editor do Supabase Dashboard.
-- =============================================================================

-- ── ia_conversas ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ia_conversas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL,
  usuario_id   TEXT NOT NULL,
  titulo       TEXT NOT NULL DEFAULT 'Nova conversa',
  ativa        BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ia_conversas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ia_conversas_all" ON public.ia_conversas;
CREATE POLICY "ia_conversas_all" ON public.ia_conversas FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.ia_conversas TO anon, authenticated, service_role;

-- ── ia_mensagens ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ia_mensagens (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id         UUID REFERENCES public.ia_conversas(id) ON DELETE CASCADE,
  tenant_id           UUID NOT NULL,
  role                TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  conteudo            TEXT NOT NULL,
  ferramentas_usadas  JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ia_mensagens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ia_mensagens_all" ON public.ia_mensagens;
CREATE POLICY "ia_mensagens_all" ON public.ia_mensagens FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.ia_mensagens TO anon, authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_ia_mensagens_conversa ON public.ia_mensagens(conversa_id);

-- ── ia_acoes_log ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ia_acoes_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL,
  conversa_id  UUID REFERENCES public.ia_conversas(id) ON DELETE SET NULL,
  ferramenta   TEXT NOT NULL,
  parametros   JSONB,
  resultado    JSONB,
  status       TEXT NOT NULL DEFAULT 'sucesso' CHECK (status IN ('sucesso', 'erro')),
  revertivel   BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ia_acoes_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ia_acoes_log_all" ON public.ia_acoes_log;
CREATE POLICY "ia_acoes_log_all" ON public.ia_acoes_log FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.ia_acoes_log TO anon, authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_ia_acoes_log_tenant ON public.ia_acoes_log(tenant_id);

-- ── Confirmação ───────────────────────────────────────────────────────────────
SELECT tablename, rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('ia_conversas', 'ia_mensagens', 'ia_acoes_log')
ORDER BY tablename;
