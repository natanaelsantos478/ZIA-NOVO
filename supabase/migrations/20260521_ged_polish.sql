-- =============================================================================
-- GED Polish — correções pós-investigação Opus (sessão 21/05/2026)
--
-- 1. UNIQUE INDEX parcial: no máximo 1 pending por documento
-- 2. ged_decide_approval: usa approver_name real + valida p_decision
-- =============================================================================

-- ── 1. Garante invariante "no máximo 1 pending por doc" no schema ─────────────

CREATE UNIQUE INDEX IF NOT EXISTS ged_one_pending_per_doc
  ON public.ged_document_approvals(document_id)
  WHERE status = 'pending';

-- ── 2. ged_decide_approval — approver_name real + validação de decision ───────

CREATE OR REPLACE FUNCTION public.ged_decide_approval(
  p_approval_id uuid,
  p_decision    text,
  p_comments    text DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_doc_id         uuid;
  v_approver_name  text;
  v_approver_prof  text;
  v_tenant_id      text;
  v_version        text;
  v_file_path      text;
  v_file_name      text;
  v_file_size      bigint;
BEGIN
  IF p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'invalid_decision_must_be_approved_or_rejected';
  END IF;

  UPDATE public.ged_document_approvals
     SET status = p_decision, comments = p_comments, decided_at = now()
   WHERE id = p_approval_id AND status = 'pending'
  RETURNING document_id, approver_name, approver_profile
    INTO v_doc_id, v_approver_name, v_approver_prof;

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
        (tenant_id, document_id, version, file_path, file_name, file_size,
         change_reason, author_name, author_profile_id)
      VALUES
        (v_tenant_id, v_doc_id, v_version, v_file_path, v_file_name, v_file_size,
         'Aprovação automática',
         COALESCE(v_approver_name, 'Sistema'),
         v_approver_prof);
    END IF;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ged_decide_approval(uuid, text, text) TO authenticated;
