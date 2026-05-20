-- =============================================================================
-- GED — Funções RPC para operações transacionais e agregação de KPIs
--
-- Corrige:
--   1. getDocumentKPIs: agrega por GROUP BY server-side em vez de baixar linhas
--   2. decideApproval: atualiza approval + documento em transação atômica
--   3. requestApproval: atualiza documento + cria approval em transação atômica
--
-- Nota: zia_is_admin() já existe no banco (migration 20260316_rls_jwt_claims.sql)
-- Nota: tenant_in_scope() já existe no banco (migration 20260520_docs_module.sql)
-- Todas as funções são SECURITY INVOKER — RLS é aplicado com o JWT do chamador.
-- =============================================================================

-- ── 1. KPIs de documentos (server-side GROUP BY) ─────────────────────────────

CREATE OR REPLACE FUNCTION public.ged_document_kpis()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER AS $$
DECLARE
  v_today   date    := current_date;
  v_in30d   date    := current_date + 30;
  v_pending bigint  := 0;
  v_result  jsonb;
  v_scopes  text[]  := zia_scope_ids();
BEGIN
  -- pending approvals — filtro defensivo por tenant (além do RLS)
  SELECT COUNT(*) INTO v_pending
  FROM public.ged_document_approvals
  WHERE status = 'pending'
    AND (zia_is_admin() OR tenant_id = ANY(v_scopes));

  -- agrega tudo de ged_documents em um único scan com filtro defensivo
  SELECT jsonb_build_object(
    'total_active',      COALESCE(SUM(CASE WHEN status = 'approved'                              THEN 1 ELSE 0 END), 0),
    'pending_approvals', v_pending,
    'expiring_30d',      COALESCE(SUM(CASE WHEN expires_at BETWEEN v_today AND v_in30d           THEN 1 ELSE 0 END), 0),
    'total_forms',       COALESCE(SUM(CASE WHEN doc_type = 'form' AND status = 'approved'        THEN 1 ELSE 0 END), 0),
    'by_status', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('status', status, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
      FROM (
        SELECT status, COUNT(*) AS cnt
        FROM public.ged_documents
        WHERE deleted_at IS NULL
          AND (zia_is_admin() OR tenant_id = ANY(v_scopes))
        GROUP BY status
      ) s
    ),
    'by_type', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('doc_type', doc_type, 'count', cnt) ORDER BY cnt DESC), '[]'::jsonb)
      FROM (
        SELECT doc_type, COUNT(*) AS cnt
        FROM public.ged_documents
        WHERE deleted_at IS NULL
          AND (zia_is_admin() OR tenant_id = ANY(v_scopes))
        GROUP BY doc_type
      ) t
    )
  ) INTO v_result
  FROM public.ged_documents
  WHERE deleted_at IS NULL
    AND (zia_is_admin() OR tenant_id = ANY(v_scopes));

  RETURN COALESCE(v_result, jsonb_build_object(
    'total_active', 0, 'pending_approvals', v_pending,
    'expiring_30d', 0, 'total_forms', 0,
    'by_status', '[]'::jsonb, 'by_type', '[]'::jsonb
  ));
END;
$$;

-- ── 2. Decidir aprovação — atômico (approval + documento em um bloco) ─────────

CREATE OR REPLACE FUNCTION public.ged_decide_approval(
  p_approval_id uuid,
  p_decision    text,       -- 'approved' | 'rejected'
  p_comments    text DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_doc_id uuid;
BEGIN
  -- Atualiza approval (só funciona se ainda estiver 'pending' e se tenant_in_scope via RLS)
  UPDATE public.ged_document_approvals
     SET status     = p_decision,
         comments   = p_comments,
         decided_at = now()
   WHERE id     = p_approval_id
     AND status = 'pending'
  RETURNING document_id INTO v_doc_id;

  IF v_doc_id IS NULL THEN
    RAISE EXCEPTION 'approval_not_found_or_already_decided';
  END IF;

  -- Atualiza status do documento (na mesma transação)
  UPDATE public.ged_documents
     SET status = CASE WHEN p_decision = 'approved' THEN 'approved'::text ELSE 'draft'::text END
   WHERE id = v_doc_id;
END;
$$;

-- ── 3. Solicitar aprovação — atômico ─────────────────────────────────────────

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
  -- Muda status do documento para in_review (RLS valida acesso)
  UPDATE public.ged_documents
     SET status = 'in_review'
   WHERE id = p_document_id AND deleted_at IS NULL
  RETURNING tenant_id INTO v_tenant_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'document_not_found';
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

-- ── 4. GRANTs ─────────────────────────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION public.ged_document_kpis()                                                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.ged_decide_approval(uuid, text, text)                                  TO authenticated;
GRANT EXECUTE ON FUNCTION public.ged_request_approval(uuid, text, text, text, text)                     TO authenticated;

-- ── 5. Verificação ────────────────────────────────────────────────────────────
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('ged_document_kpis', 'ged_decide_approval', 'ged_request_approval')
ORDER BY routine_name;
