-- Fix 1: prosp_config — faltava grant para authenticated (mensagem padrão não persistia)
GRANT ALL ON public.prosp_config TO authenticated, service_role;

-- Fix 2: ia_memorias — tabela usada pelo IAMemoria.tsx e pelos agent runners
-- sem migração prévia, criamos aqui com grants corretos
CREATE TABLE IF NOT EXISTS public.ia_memorias (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   TEXT        NOT NULL,
  agent_id    UUID        NOT NULL REFERENCES public.ia_agentes(id) ON DELETE CASCADE,
  tipo        TEXT        NOT NULL,
  titulo      TEXT        NOT NULL DEFAULT '',
  conteudo    TEXT        NOT NULL DEFAULT '',
  importancia INT         NOT NULL DEFAULT 5,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ia_memorias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ia_memorias_tenant" ON public.ia_memorias;
CREATE POLICY "ia_memorias_tenant" ON public.ia_memorias
  FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.ia_memorias TO authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_ia_memorias_agent  ON public.ia_memorias(agent_id);
CREATE INDEX IF NOT EXISTS idx_ia_memorias_tenant ON public.ia_memorias(tenant_id);
