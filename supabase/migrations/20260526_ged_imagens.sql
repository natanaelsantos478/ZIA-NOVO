-- Tabela de imagens do GED (Gestão Eletrônica de Documentos)
-- Armazena imagens em 3 categorias: importada | web | ia_gerada

CREATE TABLE IF NOT EXISTS public.ged_imagens (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT        NOT NULL,
  nome            TEXT        NOT NULL,
  tipo            TEXT        NOT NULL CHECK (tipo IN ('importada', 'web', 'ia_gerada')),
  storage_path    TEXT,
  url_original    TEXT,
  prompt          TEXT,
  imagem_base_id  UUID        REFERENCES public.ged_imagens(id) ON DELETE SET NULL,
  modelo          TEXT,
  agente_id       UUID,
  chat_message_id UUID,
  mime_type       TEXT        NOT NULL DEFAULT 'image/png',
  file_size       BIGINT,
  width           INT,
  height          INT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ged_imagens_tenant ON public.ged_imagens(tenant_id);
CREATE INDEX IF NOT EXISTS ged_imagens_tipo   ON public.ged_imagens(tenant_id, tipo);

-- Colunas adicionais em wa_agent_chat_messages para suporte ao chat de imagens
ALTER TABLE public.wa_agent_chat_messages
  ADD COLUMN IF NOT EXISTS imagem_base_url TEXT,
  ADD COLUMN IF NOT EXISTS imagem_prompt   TEXT;

-- RLS
ALTER TABLE public.ged_imagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON public.ged_imagens
  FOR ALL TO authenticated
  USING      (zia_is_admin() OR tenant_in_scope(tenant_id))
  WITH CHECK (zia_is_admin() OR tenant_in_scope(tenant_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ged_imagens TO authenticated;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.ged_imagens_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER ged_imagens_updated_at
  BEFORE UPDATE ON public.ged_imagens
  FOR EACH ROW EXECUTE FUNCTION public.ged_imagens_updated_at();
