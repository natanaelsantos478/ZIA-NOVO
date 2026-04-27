-- =============================================================================
-- MIGRATION: Tabela novidades + bucket storage + RLS
--
-- A tabela pode já existir (criada manualmente). Usamos IF NOT EXISTS / IF EXISTS
-- para idempotência. As políticas são recriadas do zero para garantir consistência.
-- =============================================================================

-- ── 1. Tabela principal ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.novidades (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo       TEXT,
  descricao    TEXT,
  image_url    TEXT        NOT NULL,
  storage_path TEXT,
  ordem        INT         NOT NULL DEFAULT 0,
  ativo        BOOLEAN     NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.novidades ENABLE ROW LEVEL SECURITY;

-- Remove policies existentes (evita erro de duplicata / policy abertas antigas)
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT policyname FROM pg_policies
           WHERE schemaname = 'public' AND tablename = 'novidades' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.novidades', r.policyname);
  END LOOP;
END $$;

-- Leitura pública: todos os usuários (autenticados ou não) podem ver novidades
CREATE POLICY "public_read" ON public.novidades
  FOR SELECT USING (true);

-- Escrita exclusiva para admin ZIA (token com app_metadata.is_admin = true)
CREATE POLICY "admin_write" ON public.novidades
  FOR ALL
  USING  (zia_is_admin())
  WITH CHECK (zia_is_admin());

-- ── 2. Storage bucket para imagens ──────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'novidades',
  'novidades',
  true,
  5242880,  -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public             = true,
  file_size_limit    = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Remove storage policies anteriores para o bucket novidades
DROP POLICY IF EXISTS "novidades_public_read"    ON storage.objects;
DROP POLICY IF EXISTS "novidades_admin_insert"   ON storage.objects;
DROP POLICY IF EXISTS "novidades_admin_update"   ON storage.objects;
DROP POLICY IF EXISTS "novidades_admin_delete"   ON storage.objects;

-- Leitura pública (bucket público — necessário para URLs diretas nas imagens)
CREATE POLICY "novidades_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'novidades');

-- Upload / update / delete: apenas admin (verifica claim no JWT)
CREATE POLICY "novidades_admin_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'novidades' AND
    ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean IS TRUE)
  );

CREATE POLICY "novidades_admin_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'novidades' AND
    ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean IS TRUE)
  );

CREATE POLICY "novidades_admin_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'novidades' AND
    ((auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean IS TRUE)
  );
