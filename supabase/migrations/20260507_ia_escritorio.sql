-- =============================================================================
-- MIGRATION: Escritório de IA — Organograma, Memória, Nós, Conexões
-- Adiciona estrutura para o canvas visual de agentes com pontos de entrada/saída.
-- =============================================================================

-- ── 1. Estender ia_agentes com campos do organograma ─────────────────────────

ALTER TABLE public.ia_agentes
  ADD COLUMN IF NOT EXISTS api_code TEXT,
  ADD COLUMN IF NOT EXISTS pos_x    FLOAT DEFAULT 100,
  ADD COLUMN IF NOT EXISTS pos_y    FLOAT DEFAULT 100;

-- ── 2. Códigos de API disponíveis (gerenciado pelo gestor, sem tenant) ────────

CREATE TABLE IF NOT EXISTS public.ia_codigos_disponiveis (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo      TEXT NOT NULL UNIQUE,
  nome        TEXT NOT NULL,
  descricao   TEXT,
  ativo       BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.ia_codigos_disponiveis TO authenticated, service_role;

-- ── 3. Sessões do gestor (geradas pela Edge Function gestor-auth) ──────────────

CREATE TABLE IF NOT EXISTS public.ia_gestor_sessions (
  token       TEXT PRIMARY KEY,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.ia_gestor_sessions TO service_role;

-- ── 4. Memória de agente (índice + entradas) ──────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ia_agent_memoria (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    UUID NOT NULL REFERENCES public.ia_agentes(id) ON DELETE CASCADE,
  tenant_id   TEXT NOT NULL,
  indice      TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ia_agent_memoria ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ia_agent_memoria_tenant" ON public.ia_agent_memoria;
CREATE POLICY "ia_agent_memoria_tenant" ON public.ia_agent_memoria
  FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.ia_agent_memoria TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.ia_agent_memoria_entradas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memoria_id  UUID NOT NULL REFERENCES public.ia_agent_memoria(id) ON DELETE CASCADE,
  agent_id    UUID NOT NULL,
  tenant_id   TEXT NOT NULL,
  categoria   TEXT NOT NULL,
  conteudo    TEXT NOT NULL,
  tags        TEXT[],
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ia_agent_memoria_entradas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ia_agent_memoria_entradas_tenant" ON public.ia_agent_memoria_entradas;
CREATE POLICY "ia_agent_memoria_entradas_tenant" ON public.ia_agent_memoria_entradas
  FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.ia_agent_memoria_entradas TO authenticated, service_role;

-- ── 5. Nós de entrada e saída do agente ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ia_agent_nos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    UUID NOT NULL REFERENCES public.ia_agentes(id) ON DELETE CASCADE,
  tenant_id   TEXT NOT NULL,
  tipo        TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  subtipo     TEXT NOT NULL CHECK (subtipo IN ('memoria','api_externa','modulo_interno','whatsapp','agente','webhook_saida')),
  posicao     INT NOT NULL DEFAULT 0,
  nome        TEXT NOT NULL,
  instrucoes  TEXT,
  config      JSONB NOT NULL DEFAULT '{}',
  ativo       BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ia_agent_nos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ia_agent_nos_tenant" ON public.ia_agent_nos;
CREATE POLICY "ia_agent_nos_tenant" ON public.ia_agent_nos
  FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.ia_agent_nos TO authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_ia_agent_nos_agent ON public.ia_agent_nos(agent_id);

-- ── 6. Conexões entre agentes (edges do canvas) ───────────────────────────────

CREATE TABLE IF NOT EXISTS public.ia_agent_conexoes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_origem_id   UUID NOT NULL REFERENCES public.ia_agentes(id) ON DELETE CASCADE,
  agent_destino_id  UUID NOT NULL REFERENCES public.ia_agentes(id) ON DELETE CASCADE,
  tenant_id         TEXT NOT NULL,
  tipo              TEXT NOT NULL CHECK (tipo IN ('consulta','permissao')),
  frequencia        TEXT NOT NULL CHECK (frequencia IN ('sempre','esporadica')),
  instrucoes        TEXT,
  ativo             BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(agent_origem_id, agent_destino_id)
);

ALTER TABLE public.ia_agent_conexoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ia_agent_conexoes_tenant" ON public.ia_agent_conexoes;
CREATE POLICY "ia_agent_conexoes_tenant" ON public.ia_agent_conexoes
  FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.ia_agent_conexoes TO authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_ia_agent_conexoes_origem  ON public.ia_agent_conexoes(agent_origem_id);
CREATE INDEX IF NOT EXISTS idx_ia_agent_conexoes_destino ON public.ia_agent_conexoes(agent_destino_id);

-- ── 7. Confirmação ────────────────────────────────────────────────────────────

SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'ia_codigos_disponiveis','ia_gestor_sessions',
    'ia_agent_memoria','ia_agent_memoria_entradas',
    'ia_agent_nos','ia_agent_conexoes'
  )
ORDER BY tablename;
