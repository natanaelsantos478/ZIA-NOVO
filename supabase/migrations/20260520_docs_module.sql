-- =============================================================================
-- GED (Gestão Eletrônica de Documentos) — schema completo
--
-- Inclui criação das funções helper de RLS caso ainda não existam.
-- Tabelas: ged_categories, ged_documents, ged_document_versions, ged_document_approvals
-- RLS: tenant_id TEXT — zia_is_admin() | zia_no_auth() | tenant_in_scope(tenant_id)
-- Storage: bucket 'ged-documents' deve ser criado via Supabase Dashboard (privado)
-- =============================================================================

-- ── 0. Funções helper de RLS (idempotente — CREATE OR REPLACE) ────────────────

CREATE OR REPLACE FUNCTION public.zia_scope_ids()
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT ARRAY(
    SELECT jsonb_array_elements_text(
      COALESCE(auth.jwt() -> 'app_metadata' -> 'scope_ids', '[]'::jsonb)
    )
  )
$$;

CREATE OR REPLACE FUNCTION public.zia_no_auth()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT auth.jwt() IS NULL
$$;

-- tenant_in_scope: verifica se tid está nos scope_ids do JWT
CREATE OR REPLACE FUNCTION public.tenant_in_scope(tid text)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(
      COALESCE(auth.jwt() -> 'app_metadata' -> 'scope_ids', '[]'::jsonb)
    ) AS s(val)
    WHERE s.val = tid
  )
$$;

GRANT EXECUTE ON FUNCTION public.zia_scope_ids()      TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.zia_no_auth()        TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_in_scope(text) TO anon, authenticated;

-- ── 1. Categorias de documento ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ged_categories (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        text NOT NULL,
  name             text NOT NULL,
  code             text NOT NULL,
  description      text,
  responsible_name text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ged_categories_tenant ON public.ged_categories (tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ged_categories_code ON public.ged_categories (tenant_id, code);

-- ── 2. Documentos ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ged_documents (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        text NOT NULL,
  code             text NOT NULL,
  title            text NOT NULL,
  doc_type         text NOT NULL CHECK (doc_type IN ('procedure','instruction','policy','form','manual','record')),
  category_id      uuid REFERENCES public.ged_categories(id) ON DELETE SET NULL,
  version          text NOT NULL DEFAULT '1.0',
  status           text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','in_review','approved','obsolete')),
  owner_name       text,
  owner_profile_id text,
  file_path        text,
  file_name        text,
  file_size        bigint,
  mime_type        text,
  expires_at       date,
  tags             text[] NOT NULL DEFAULT '{}',
  search_tsv       tsvector GENERATED ALWAYS AS (
    to_tsvector('portuguese',
      coalesce(title,'') || ' ' || coalesce(code,'') || ' ' ||
      coalesce(array_to_string(tags,' '),'')
    )
  ) STORED,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  created_by       text,
  deleted_at       timestamptz
);

CREATE INDEX IF NOT EXISTS idx_ged_documents_tenant    ON public.ged_documents (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ged_documents_status    ON public.ged_documents (tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ged_documents_category  ON public.ged_documents (tenant_id, category_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ged_documents_updated   ON public.ged_documents (tenant_id, updated_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ged_documents_expires   ON public.ged_documents (tenant_id, expires_at) WHERE expires_at IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ged_documents_search    ON public.ged_documents USING gin(search_tsv);
CREATE INDEX IF NOT EXISTS idx_ged_documents_tags      ON public.ged_documents USING gin(tags);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ged_documents_code ON public.ged_documents (tenant_id, code) WHERE deleted_at IS NULL;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION _ged_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_ged_documents_updated_at  ON public.ged_documents;
CREATE TRIGGER trg_ged_documents_updated_at
  BEFORE UPDATE ON public.ged_documents
  FOR EACH ROW EXECUTE FUNCTION _ged_set_updated_at();

DROP TRIGGER IF EXISTS trg_ged_categories_updated_at ON public.ged_categories;
CREATE TRIGGER trg_ged_categories_updated_at
  BEFORE UPDATE ON public.ged_categories
  FOR EACH ROW EXECUTE FUNCTION _ged_set_updated_at();

-- ── 3. Versões de documento ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ged_document_versions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         text NOT NULL,
  document_id       uuid NOT NULL REFERENCES public.ged_documents(id) ON DELETE CASCADE,
  version           text NOT NULL,
  file_path         text,
  file_name         text,
  file_size         bigint,
  change_reason     text,
  author_name       text,
  author_profile_id text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ged_versions_document ON public.ged_document_versions (tenant_id, document_id, created_at DESC);

-- ── 4. Aprovações ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ged_document_approvals (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            text NOT NULL,
  document_id          uuid NOT NULL REFERENCES public.ged_documents(id) ON DELETE CASCADE,
  status               text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  requested_by_name    text NOT NULL,
  requested_by_profile text,
  approver_name        text,
  approver_profile     text,
  comments             text,
  requested_at         timestamptz NOT NULL DEFAULT now(),
  decided_at           timestamptz
);

CREATE INDEX IF NOT EXISTS idx_ged_approvals_tenant_status ON public.ged_document_approvals (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_ged_approvals_document      ON public.ged_document_approvals (document_id);

-- ── 5. RLS com isolamento real de tenant ──────────────────────────────────────

ALTER TABLE public.ged_categories           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ged_documents            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ged_document_versions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ged_document_approvals   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON public.ged_categories;
CREATE POLICY "tenant_isolation" ON public.ged_categories FOR ALL
  USING  (zia_is_admin() OR zia_no_auth() OR tenant_in_scope(tenant_id))
  WITH CHECK (zia_is_admin() OR zia_no_auth() OR tenant_in_scope(tenant_id));

DROP POLICY IF EXISTS "tenant_isolation" ON public.ged_documents;
CREATE POLICY "tenant_isolation" ON public.ged_documents FOR ALL
  USING  (zia_is_admin() OR zia_no_auth() OR tenant_in_scope(tenant_id))
  WITH CHECK (zia_is_admin() OR zia_no_auth() OR tenant_in_scope(tenant_id));

DROP POLICY IF EXISTS "tenant_isolation" ON public.ged_document_versions;
CREATE POLICY "tenant_isolation" ON public.ged_document_versions FOR ALL
  USING  (zia_is_admin() OR zia_no_auth() OR tenant_in_scope(tenant_id))
  WITH CHECK (zia_is_admin() OR zia_no_auth() OR tenant_in_scope(tenant_id));

DROP POLICY IF EXISTS "tenant_isolation" ON public.ged_document_approvals;
CREATE POLICY "tenant_isolation" ON public.ged_document_approvals FOR ALL
  USING  (zia_is_admin() OR zia_no_auth() OR tenant_in_scope(tenant_id))
  WITH CHECK (zia_is_admin() OR zia_no_auth() OR tenant_in_scope(tenant_id));

-- ── 6. GRANTs ─────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ged_categories         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ged_documents          TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ged_document_versions  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ged_document_approvals TO authenticated;

-- ── 7. Verificação ────────────────────────────────────────────────────────────

SELECT
  tablename,
  rowsecurity AS rls_enabled,
  (SELECT count(*) FROM pg_policies p WHERE p.tablename = pt.tablename AND p.schemaname = 'public') AS policies
FROM pg_tables pt
WHERE schemaname = 'public'
  AND tablename IN ('ged_categories','ged_documents','ged_document_versions','ged_document_approvals')
ORDER BY tablename;
