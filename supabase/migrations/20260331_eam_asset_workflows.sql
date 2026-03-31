-- ── asset_workflows ──────────────────────────────────────────────────────────
-- Workflows de transferência, requisição e empréstimo de ativos
CREATE TABLE IF NOT EXISTS public.asset_workflows (
  id                        uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 text        NOT NULL,
  asset_id                  uuid        NOT NULL REFERENCES public.assets(id) ON DELETE RESTRICT,
  type                      text        NOT NULL CHECK (type IN ('transferencia', 'requisicao_uso', 'emprestimo')),
  status                    text        NOT NULL DEFAULT 'pendente'
                                        CHECK (status IN ('pendente', 'aprovado', 'rejeitado', 'confirmado_recebimento', 'cancelado')),
  requester_id              uuid        NULL,
  requester_name            text        NULL,
  target_responsible_id     uuid        NULL,
  target_responsible_name   text        NULL,
  target_department         text        NULL,
  approver_id               uuid        NULL,
  requester_comment         text        NULL,
  approver_comment          text        NULL,
  confirmation_comment      text        NULL,
  expected_return           date        NULL,
  requested_at              timestamptz NOT NULL DEFAULT now(),
  approved_at               timestamptz NULL,
  confirmed_at              timestamptz NULL,
  cancelled_at              timestamptz NULL,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assetwf_tenant   ON public.asset_workflows(tenant_id);
CREATE INDEX IF NOT EXISTS idx_assetwf_asset    ON public.asset_workflows(asset_id);
CREATE INDEX IF NOT EXISTS idx_assetwf_status   ON public.asset_workflows(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_assetwf_req      ON public.asset_workflows(tenant_id, requested_at DESC);

ALTER TABLE public.asset_workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_open" ON public.asset_workflows USING (true) WITH CHECK (true);
