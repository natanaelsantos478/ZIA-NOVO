-- ─────────────────────────────────────────────────────────────────────────────
-- crm_atividades — Atividades do CRM (ligações, reuniões, e-mails, etc.)
-- Tabela criada manualmente no Supabase; esta migration documenta o schema.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.crm_atividades (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      text        NOT NULL,
  tipo           text        NOT NULL DEFAULT 'outro',  -- ligacao | reuniao | email | whatsapp | proposta | followup | outro
  titulo         text        NOT NULL,
  descricao      text,
  responsavel_id text,
  cliente_id     uuid        REFERENCES public.erp_clientes(id) ON DELETE SET NULL,
  negociacao_id  uuid        REFERENCES public.crm_negociacoes(id) ON DELETE SET NULL,
  data_prazo     date,
  status         text        NOT NULL DEFAULT 'pendente',  -- pendente | em_andamento | concluida | cancelada
  criado_por     text        NOT NULL DEFAULT 'manual',    -- manual | ia
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Indexes para queries frequentes
CREATE INDEX IF NOT EXISTS idx_crm_ativ_tenant     ON public.crm_atividades(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_ativ_negociacao ON public.crm_atividades(negociacao_id);
CREATE INDEX IF NOT EXISTS idx_crm_ativ_cliente    ON public.crm_atividades(cliente_id);
CREATE INDEX IF NOT EXISTS idx_crm_ativ_prazo      ON public.crm_atividades(data_prazo);
CREATE INDEX IF NOT EXISTS idx_crm_ativ_status     ON public.crm_atividades(status);

-- RLS (política aberta — mesma configuração já existente no banco)
ALTER TABLE public.crm_atividades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "all_crmativ" ON public.crm_atividades;
CREATE POLICY "all_crmativ" ON public.crm_atividades
  FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.crm_atividades TO anon, authenticated, service_role;
