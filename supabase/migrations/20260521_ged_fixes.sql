-- =============================================================================
-- GED Fixes — corrige issues da auditoria Opus
--
-- 1. RLS policies no storage.objects para o bucket 'ged-documents' por tenant
-- 2. ged_request_approval: bloqueia duplicatas e valida status 'draft'
-- =============================================================================

-- ── 1. Storage policies por tenant (bucket ged-documents) ────────────────────
-- Path: {tenant_id}/{document_id}/v{version}/{filename}
-- split_part(name, '/', 1) extrai o tenant_id do caminho

DROP POLICY IF EXISTS "ged_docs_tenant_select" ON storage.objects;
DROP POLICY IF EXISTS "ged_docs_tenant_insert" ON storage.objects;
DROP POLICY IF EXISTS "ged_docs_tenant_delete" ON storage.objects;

CREATE POLICY "ged_docs_tenant_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'ged-documents'
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean IS TRUE
      OR split_part(name, '/', 1) = ANY(public.zia_scope_ids())
    )
  );

CREATE POLICY "ged_docs_tenant_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'ged-documents'
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean IS TRUE
      OR split_part(name, '/', 1) = ANY(public.zia_scope_ids())
    )
  );

CREATE POLICY "ged_docs_tenant_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'ged-documents'
    AND (
      (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean IS TRUE
      OR split_part(name, '/', 1) = ANY(public.zia_scope_ids())
    )
  );

-- ── 2. Atualiza ged_request_approval — bloqueia duplicatas e valida status ───

CREATE OR REPLACE FUNCTION public.ged_request_approval(
  p_document_id          uuid,
  p_requested_by_name    text,
  p_requested_by_profile text DEFAULT NULL,
  p_approver_name        text DEFAULT NULL,
  p_approver_profile     text DEFAULT NULL
)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_tenant_id text;
  v_appr_id   uuid;
BEGIN
  -- Bloqueia se já há uma aprovação pendente para este documento
  IF EXISTS (
    SELECT 1 FROM public.ged_document_approvals
    WHERE document_id = p_document_id AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'document_already_pending_approval';
  END IF;

  -- Só permite envio a partir de status 'draft' (RLS valida acesso)
  UPDATE public.ged_documents
     SET status = 'in_review'
   WHERE id = p_document_id
     AND status = 'draft'
     AND deleted_at IS NULL
  RETURNING tenant_id INTO v_tenant_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'document_not_found_or_not_draft';
  END IF;

  -- Cria registro de aprovação (na mesma transação)
  INSERT INTO public.ged_document_approvals
    (tenant_id, document_id, status, requested_by_name, requested_by_profile, approver_name, approver_profile)
  VALUES
    (v_tenant_id, p_document_id, 'pending', p_requested_by_name, p_requested_by_profile, p_approver_name, p_approver_profile)
  RETURNING id INTO v_appr_id;

  RETURN v_appr_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ged_request_approval(uuid, text, text, text, text) TO authenticated;

-- ── 3. Verificação ────────────────────────────────────────────────────────────
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'ged_request_approval';
