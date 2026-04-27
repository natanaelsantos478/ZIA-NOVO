-- ─────────────────────────────────────────────────────────────────────────────
-- Novidades: comunicados do admin Zitasoftware mostrados a todas as empresas
-- após o login. Suporta título, descrição e um anexo opcional (Supabase Storage).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS zia_novidades (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo       TEXT        NOT NULL,
  descricao    TEXT,
  arquivo_url  TEXT,
  arquivo_nome TEXT,
  arquivo_tipo TEXT,
  ativo        BOOLEAN     NOT NULL DEFAULT true,
  criado_em    TIMESTAMPTZ NOT NULL DEFAULT now(),
  criado_por   TEXT        DEFAULT 'admin'
);

ALTER TABLE zia_novidades ENABLE ROW LEVEL SECURITY;

-- Leitura pública — necessário para exibir antes da autenticação do usuário
CREATE POLICY "novidades_public_read"
  ON zia_novidades FOR SELECT USING (true);

-- Escrita sem restrição de RLS (o painel admin tem sua própria camada de autenticação)
CREATE POLICY "novidades_admin_write"
  ON zia_novidades FOR ALL USING (true) WITH CHECK (true);

-- Storage bucket para anexos das novidades (arquivos públicos, read + write liberados)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'novidades',
  'novidades',
  true,
  20971520,  -- 20 MB
  ARRAY[
    'image/jpeg','image/png','image/gif','image/webp',
    'application/pdf',
    'video/mp4','video/webm',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "novidades_storage_public_read"
  ON storage.objects FOR SELECT USING (bucket_id = 'novidades');

CREATE POLICY "novidades_storage_public_insert"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'novidades');

CREATE POLICY "novidades_storage_public_delete"
  ON storage.objects FOR DELETE USING (bucket_id = 'novidades');
