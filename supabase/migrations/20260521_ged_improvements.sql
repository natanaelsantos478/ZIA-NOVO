-- =============================================================================
-- GED Improvements — melhorias da auditoria Opus (sessão 21/05/2026)
--
-- 1. Trigger ged_enforce_in_review: bloqueia status='in_review' sem aprovação pendente
-- 2. ged_request_approval: cria aprovação ANTES de mudar status (compatível com trigger)
-- 3. ged_decide_approval: cria versão automática ao aprovar se não existir
-- 4. ged_document_kpis: adiciona campo 'expired'
-- =============================================================================

-- ── 1. Trigger: impede in_review sem approval pendente ────────────────────────

CREATE OR REPLACE FUNCTION public.ged_check_in_review_trigger()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'in_review' AND (OLD.status IS DISTINCT FROM 'in_review') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.ged_document_approvals
      WHERE document_id = NEW.id AND status = 'pending'
    ) THEN
      RAISE EXCEPTION 'in_review_requires_pending_approval';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ged_enforce_in_review ON public.ged_documents;
CREATE TRIGGER ged_enforce_in_review
  BEFORE UPDATE ON public.ged_documents
  FOR EACH ROW EXECUTE FUNCTION public.ged_check_in_review_trigger();

-- ── 2. ged_request_approval — cria approval ANTES de mudar status ─────────────

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
  SELECT tenant_id INTO v_tenant_id
  FROM public.ged_documents
  WHERE id = p_document_id AND status = 'draft' AND deleted_at IS NULL;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'document_not_found_or_not_draft';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.ged_document_approvals
    WHERE document_id = p_document_id AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'document_already_pending_approval';
  END IF;

  -- Cria aprovação PRIMEIRO para que o trigger ged_enforce_in_review a encontre
  INSERT INTO public.ged_document_approvals
    (tenant_id, document_id, status, requested_by_name, requested_by_profile, approver_name, approver_profile)
  VALUES
    (v_tenant_id, p_document_id, 'pending', p_requested_by_name, p_requested_by_profile, p_approver_name, p_approver_profile)
  RETURNING id INTO v_appr_id;

  UPDATE public.ged_documents
     SET status = 'in_review'
   WHERE id = p_document_id;

  RETURN v_appr_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ged_request_approval(uuid, text, text, text, text) TO authenticated;

-- ── 3. ged_decide_approval — cria versão automática ao aprovar ───────────────

CREATE OR REPLACE FUNCTION public.ged_decide_approval(
  p_approval_id uuid,
  p_decision    text,
  p_comments    text DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_doc_id    uuid;
  v_tenant_id text;
  v_version   text;
  v_file_path text;
  v_file_name text;
  v_file_size bigint;
BEGIN
  UPDATE public.ged_document_approvals
     SET status = p_decision, comments = p_comments, decided_at = now()
   WHERE id = p_approval_id AND status = 'pending'
  RETURNING document_id INTO v_doc_id;

  IF v_doc_id IS NULL THEN
    RAISE EXCEPTION 'approval_not_found_or_already_decided';
  END IF;

  SELECT tenant_id, version, file_path, file_name, file_size
    INTO v_tenant_id, v_version, v_file_path, v_file_name, v_file_size
  FROM public.ged_documents
  WHERE id = v_doc_id;

  UPDATE public.ged_documents
     SET status = CASE WHEN p_decision = 'approved' THEN 'approved'::text ELSE 'draft'::text END
   WHERE id = v_doc_id;

  IF p_decision = 'approved' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.ged_document_versions
      WHERE document_id = v_doc_id AND version = v_version
    ) THEN
      INSERT INTO public.ged_document_versions
        (tenant_id, document_id, version, file_path, file_name, file_size, change_reason, author_name)
      VALUES
        (v_tenant_id, v_doc_id, v_version, v_file_path, v_file_name, v_file_size, 'Aprovação automática', 'Sistema');
    END IF;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ged_decide_approval(uuid, text, text) TO authenticated;

-- ── 4. ged_document_kpis — adiciona campo 'expired' ──────────────────────────

CREATE OR REPLACE FUNCTION public.ged_document_kpis()
RETURNS jsonb LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_today  date   := current_date;
  v_in30d  date   := current_date + 30;
  v_pending bigint := 0;
  v_result jsonb;
  v_scopes text[] := zia_scope_ids();
BEGIN
  SELECT COUNT(*) INTO v_pending
  FROM public.ged_document_approvals
  WHERE status = 'pending'
    AND (zia_is_admin() OR tenant_id = ANY(v_scopes));

  SELECT jsonb_build_object(
    'total_active',      COALESCE(SUM(CASE WHEN status = 'approved'                                    THEN 1 ELSE 0 END), 0),
    'pending_approvals', v_pending,
    'expiring_30d',      COALESCE(SUM(CASE WHEN expires_at BETWEEN v_today AND v_in30d                 THEN 1 ELSE 0 END), 0),
    'expired',           COALESCE(SUM(CASE WHEN expires_at < v_today AND status != 'obsolete'          THEN 1 ELSE 0 END), 0),
    'total_forms',       COALESCE(SUM(CASE WHEN doc_type = 'form' AND status = 'approved'              THEN 1 ELSE 0 END), 0),
    'by_status', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('status', status, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
      FROM (
        SELECT status, COUNT(*) AS cnt
        FROM public.ged_documents
        WHERE deleted_at IS NULL AND (zia_is_admin() OR tenant_id = ANY(v_scopes))
        GROUP BY status
      ) s
    ),
    'by_type', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('doc_type', doc_type, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
      FROM (
        SELECT doc_type, COUNT(*) AS cnt
        FROM public.ged_documents
        WHERE deleted_at IS NULL AND (zia_is_admin() OR tenant_id = ANY(v_scopes))
        GROUP BY doc_type
      ) t
    )
  ) INTO v_result
  FROM public.ged_documents
  WHERE deleted_at IS NULL
    AND (zia_is_admin() OR tenant_id = ANY(v_scopes));

  RETURN COALESCE(v_result, jsonb_build_object(
    'total_active', 0, 'pending_approvals', v_pending,
    'expiring_30d', 0, 'expired', 0, 'total_forms', 0,
    'by_status', '[]'::jsonb, 'by_type', '[]'::jsonb
  ));
END;
$$;

GRANT EXECUTE ON FUNCTION public.ged_document_kpis() TO authenticated;
