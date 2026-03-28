-- =============================================================================
-- MIGRATION: EAM — Gestão de Ativos / Patrimônio
-- Tabelas completas para o módulo Enterprise Asset Management
-- Execute no SQL Editor do Supabase Dashboard
-- =============================================================================

-- ── eam_asset_categories ─────────────────────────────────────────────────────
-- Categorias e subcategorias configuráveis pelo tenant
CREATE TABLE IF NOT EXISTS public.eam_asset_categories (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      text        NOT NULL,
  name           text        NOT NULL,
  parent_id      uuid        REFERENCES public.eam_asset_categories(id) ON DELETE SET NULL,
  description    text,
  color          text        DEFAULT '#3b82f6',
  icon           text        DEFAULT 'Box',
  active         boolean     NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eam_cat_tenant ON public.eam_asset_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_eam_cat_parent ON public.eam_asset_categories(parent_id);

-- ── eam_asset_locations ───────────────────────────────────────────────────────
-- Localizações físicas configuráveis (unidade, andar, sala)
CREATE TABLE IF NOT EXISTS public.eam_asset_locations (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      text        NOT NULL,
  name           text        NOT NULL,
  type           text        NOT NULL DEFAULT 'room'
                             CHECK (type IN ('unit','floor','room','area','external')),
  parent_id      uuid        REFERENCES public.eam_asset_locations(id) ON DELETE SET NULL,
  address        text,
  active         boolean     NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eam_loc_tenant ON public.eam_asset_locations(tenant_id);

-- ── eam_tag_counters ──────────────────────────────────────────────────────────
-- Contador sequencial por tenant para geração de tags patrimoniais
CREATE TABLE IF NOT EXISTS public.eam_tag_counters (
  tenant_id      text        PRIMARY KEY,
  last_seq       integer     NOT NULL DEFAULT 0,
  prefix         text        NOT NULL DEFAULT 'PAT',
  format         text        NOT NULL DEFAULT '{prefix}-{year}-{seq5}',
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- ── eam_assets ────────────────────────────────────────────────────────────────
-- Tabela principal de ativos patrimoniais
CREATE TABLE IF NOT EXISTS public.eam_assets (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             text        NOT NULL,

  -- Identificação
  tag                   text        NOT NULL,                          -- PAT-2024-00001
  name                  text        NOT NULL,
  description           text,
  asset_type            text        NOT NULL DEFAULT 'fixed'
                                    CHECK (asset_type IN ('fixed','it','furniture','intangible','vehicle','other')),
  category_id           uuid        REFERENCES public.eam_asset_categories(id) ON DELETE SET NULL,
  subcategory_id        uuid        REFERENCES public.eam_asset_categories(id) ON DELETE SET NULL,
  brand                 text,
  model                 text,
  serial_number         text,

  -- Aquisição
  acquisition_date      date,
  acquisition_value     numeric(15,2) NOT NULL DEFAULT 0,
  supplier_id           text,                                          -- FK para fornecedores (texto livre)
  supplier_name         text,
  invoice_number        text,
  invoice_date          date,

  -- Garantia
  warranty_start        date,
  warranty_end          date,
  warranty_supplier     text,

  -- Localização
  location_id           uuid        REFERENCES public.eam_asset_locations(id) ON DELETE SET NULL,
  location_description  text,                                          -- texto livre complementar

  -- Responsabilidade
  responsible_id        text,                                          -- FK para funcionário (texto livre)
  responsible_name      text,
  department_id         text,
  department_name       text,

  -- Depreciação
  depreciation_method   text        NOT NULL DEFAULT 'linear'
                                    CHECK (depreciation_method IN ('linear','sum_of_years','double_declining','units_produced')),
  useful_life_months    integer     NOT NULL DEFAULT 60,
  residual_value        numeric(15,2) NOT NULL DEFAULT 0,
  depreciation_start    date,
  total_units           numeric,                                       -- para método unidades produzidas
  current_book_value    numeric(15,2),                                 -- calculado e cacheado

  -- Status
  status                text        NOT NULL DEFAULT 'disponivel'
                                    CHECK (status IN ('em_aquisicao','disponivel','em_uso','em_manutencao','em_emprestimo','descartado','alienado','extraviado')),

  -- QR Code
  qr_code               text,

  -- Auditoria
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  created_by            text,
  updated_by            text
);

CREATE INDEX IF NOT EXISTS idx_eam_assets_tenant     ON public.eam_assets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_eam_assets_tag        ON public.eam_assets(tenant_id, tag);
CREATE INDEX IF NOT EXISTS idx_eam_assets_status     ON public.eam_assets(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_eam_assets_category   ON public.eam_assets(category_id);
CREATE INDEX IF NOT EXISTS idx_eam_assets_responsible ON public.eam_assets(tenant_id, responsible_id);
CREATE INDEX IF NOT EXISTS idx_eam_assets_department ON public.eam_assets(tenant_id, department_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_eam_assets_tag_unique ON public.eam_assets(tenant_id, tag);

-- ── eam_asset_documents ───────────────────────────────────────────────────────
-- Fotos e documentos vinculados ao ativo
CREATE TABLE IF NOT EXISTS public.eam_asset_documents (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      text        NOT NULL,
  asset_id       uuid        NOT NULL REFERENCES public.eam_assets(id) ON DELETE CASCADE,
  doc_type       text        NOT NULL DEFAULT 'other'
                             CHECK (doc_type IN ('foto','nota_fiscal','manual','certificado_calibracao','laudo_vistoria','contrato','other')),
  storage_path   text        NOT NULL,
  public_url     text,
  filename       text        NOT NULL,
  file_size      integer,
  mime_type      text,
  is_primary     boolean     NOT NULL DEFAULT false,
  description    text,
  uploaded_by    text,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eam_docs_tenant  ON public.eam_asset_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_eam_docs_asset   ON public.eam_asset_documents(asset_id);
CREATE INDEX IF NOT EXISTS idx_eam_docs_type    ON public.eam_asset_documents(asset_id, doc_type);

-- ── eam_asset_history ─────────────────────────────────────────────────────────
-- Histórico imutável de movimentações — NUNCA deletar registros desta tabela
CREATE TABLE IF NOT EXISTS public.eam_asset_history (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         text        NOT NULL,
  asset_id          uuid        NOT NULL REFERENCES public.eam_assets(id) ON DELETE RESTRICT,
  event_type        text        NOT NULL
                                CHECK (event_type IN (
                                  'criacao','transferencia','mudanca_status','requisicao',
                                  'devolucao','descarte','alienacao','extravio',
                                  'manutencao_iniciada','manutencao_concluida','inventario',
                                  'edicao','upload_documento','termo_responsabilidade'
                                )),
  from_responsible  text,
  to_responsible    text,
  from_department   text,
  to_department     text,
  from_status       text,
  to_status         text,
  from_location     text,
  to_location       text,
  justification     text,
  approved_by       text,
  reference_id      uuid,                                              -- FK opcional para outra entidade
  notes             text,
  user_id           text,
  user_name         text,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eam_hist_tenant  ON public.eam_asset_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_eam_hist_asset   ON public.eam_asset_history(asset_id);
CREATE INDEX IF NOT EXISTS idx_eam_hist_created ON public.eam_asset_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_eam_hist_type    ON public.eam_asset_history(tenant_id, event_type);

-- ── eam_asset_transfers ───────────────────────────────────────────────────────
-- Workflows de transferência, requisição e empréstimo
CREATE TABLE IF NOT EXISTS public.eam_asset_transfers (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           text        NOT NULL,
  asset_id            uuid        NOT NULL REFERENCES public.eam_assets(id) ON DELETE RESTRICT,
  transfer_type       text        NOT NULL DEFAULT 'transferencia'
                                  CHECK (transfer_type IN ('transferencia','requisicao_uso','emprestimo')),
  status              text        NOT NULL DEFAULT 'pendente'
                                  CHECK (status IN ('pendente','aprovado','rejeitado','confirmado_recebimento','cancelado')),
  requester_id        text,
  requester_name      text        NOT NULL,
  approver_id         text,
  approver_name       text,
  destination_id      text,
  destination_name    text        NOT NULL,
  destination_dept    text,
  from_responsible    text,
  from_department     text,
  from_location       text,
  to_location         text,
  expected_return     date,
  reason              text        NOT NULL,
  rejection_reason    text,
  approval_notes      text,
  receive_notes       text,
  requested_at        timestamptz NOT NULL DEFAULT now(),
  approved_at         timestamptz,
  received_at         timestamptz,
  cancelled_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eam_trans_tenant  ON public.eam_asset_transfers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_eam_trans_asset   ON public.eam_asset_transfers(asset_id);
CREATE INDEX IF NOT EXISTS idx_eam_trans_status  ON public.eam_asset_transfers(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_eam_trans_req     ON public.eam_asset_transfers(tenant_id, requester_id);

-- ── eam_depreciation_snapshots ────────────────────────────────────────────────
-- Snapshots mensais de depreciação por ativo
CREATE TABLE IF NOT EXISTS public.eam_depreciation_snapshots (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             text        NOT NULL,
  asset_id              uuid        NOT NULL REFERENCES public.eam_assets(id) ON DELETE CASCADE,
  ref_year              integer     NOT NULL,
  ref_month             integer     NOT NULL CHECK (ref_month BETWEEN 1 AND 12),
  monthly_quota         numeric(15,2) NOT NULL DEFAULT 0,
  accumulated_dep       numeric(15,2) NOT NULL DEFAULT 0,
  book_value            numeric(15,2) NOT NULL DEFAULT 0,
  auto_generated        boolean     NOT NULL DEFAULT true,
  financial_entry_id    text,                                          -- FK para módulo financeiro (se existir)
  created_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eam_dep_tenant   ON public.eam_depreciation_snapshots(tenant_id);
CREATE INDEX IF NOT EXISTS idx_eam_dep_asset    ON public.eam_depreciation_snapshots(asset_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_eam_dep_unique ON public.eam_depreciation_snapshots(asset_id, ref_year, ref_month);

-- ── eam_maintenance_plans ─────────────────────────────────────────────────────
-- Planos de manutenção preventiva
CREATE TABLE IF NOT EXISTS public.eam_maintenance_plans (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             text        NOT NULL,
  asset_id              uuid        NOT NULL REFERENCES public.eam_assets(id) ON DELETE CASCADE,
  name                  text        NOT NULL,
  trigger_type          text        NOT NULL DEFAULT 'periodicity'
                                    CHECK (trigger_type IN ('periodicity','counter')),
  trigger_value         integer     NOT NULL DEFAULT 30,
  trigger_unit          text        NOT NULL DEFAULT 'days'
                                    CHECK (trigger_unit IN ('days','weeks','months','km','hours','cycles')),
  service_description   text        NOT NULL,
  supplier_id           text,
  supplier_name         text,
  estimated_cost        numeric(15,2),
  advance_alert_days    integer     NOT NULL DEFAULT 7,
  next_due_date         date,
  last_executed         date,
  status                text        NOT NULL DEFAULT 'ativo'
                                    CHECK (status IN ('ativo','pausado','cancelado')),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eam_plans_tenant ON public.eam_maintenance_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_eam_plans_asset  ON public.eam_maintenance_plans(asset_id);
CREATE INDEX IF NOT EXISTS idx_eam_plans_status ON public.eam_maintenance_plans(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_eam_plans_due    ON public.eam_maintenance_plans(tenant_id, next_due_date);

-- ── eam_work_orders ───────────────────────────────────────────────────────────
-- Ordens de Serviço (corretiva e preventiva)
CREATE TABLE IF NOT EXISTS public.eam_work_orders (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             text        NOT NULL,
  asset_id              uuid        NOT NULL REFERENCES public.eam_assets(id) ON DELETE RESTRICT,
  plan_id               uuid        REFERENCES public.eam_maintenance_plans(id) ON DELETE SET NULL,
  order_number          text,
  order_type            text        NOT NULL DEFAULT 'corrective'
                                    CHECK (order_type IN ('preventiva','corretiva')),
  status                text        NOT NULL DEFAULT 'aberta'
                                    CHECK (status IN ('aberta','em_andamento','aguardando_peca','concluida','cancelada')),
  title                 text        NOT NULL,
  failure_description   text,
  root_cause            text,
  solution_applied      text,
  supplier_id           text,
  supplier_name         text,
  technician_name       text,
  estimated_cost        numeric(15,2),
  parts_cost            numeric(15,2) DEFAULT 0,
  labor_cost            numeric(15,2) DEFAULT 0,
  total_cost            numeric(15,2) DEFAULT 0,
  opened_at             timestamptz NOT NULL DEFAULT now(),
  started_at            timestamptz,
  completed_at          timestamptz,
  cancelled_at          timestamptz,
  notes                 text,
  created_by            text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eam_wo_tenant   ON public.eam_work_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_eam_wo_asset    ON public.eam_work_orders(asset_id);
CREATE INDEX IF NOT EXISTS idx_eam_wo_status   ON public.eam_work_orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_eam_wo_opened   ON public.eam_work_orders(tenant_id, opened_at DESC);

-- ── eam_insurance_policies ────────────────────────────────────────────────────
-- Apólices de seguro (por ativo ou grupo)
CREATE TABLE IF NOT EXISTS public.eam_insurance_policies (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         text        NOT NULL,
  policy_number     text        NOT NULL,
  insurer_name      text        NOT NULL,
  coverage_type     text        NOT NULL DEFAULT 'patrimonial'
                                CHECK (coverage_type IN ('patrimonial','vida','responsabilidade','roubo','incendio','all_risk','outro')),
  coverage_details  text,
  insured_value     numeric(15,2) NOT NULL DEFAULT 0,
  annual_premium    numeric(15,2) DEFAULT 0,
  monthly_premium   numeric(15,2),
  start_date        date        NOT NULL,
  end_date          date        NOT NULL,
  status            text        NOT NULL DEFAULT 'ativa'
                                CHECK (status IN ('ativa','vencida','cancelada')),
  broker_name       text,
  broker_contact    text,
  notes             text,
  created_by        text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eam_pol_tenant  ON public.eam_insurance_policies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_eam_pol_status  ON public.eam_insurance_policies(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_eam_pol_end     ON public.eam_insurance_policies(tenant_id, end_date);

-- ── eam_insurance_policy_assets ───────────────────────────────────────────────
-- Relacionamento N:N entre apólices e ativos
CREATE TABLE IF NOT EXISTS public.eam_insurance_policy_assets (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   text NOT NULL,
  policy_id   uuid NOT NULL REFERENCES public.eam_insurance_policies(id) ON DELETE CASCADE,
  asset_id    uuid NOT NULL REFERENCES public.eam_assets(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_eam_pol_asset_unique ON public.eam_insurance_policy_assets(policy_id, asset_id);
CREATE INDEX IF NOT EXISTS idx_eam_pol_asset_policy ON public.eam_insurance_policy_assets(policy_id);
CREATE INDEX IF NOT EXISTS idx_eam_pol_asset_asset  ON public.eam_insurance_policy_assets(asset_id);

-- ── eam_insurance_claims ──────────────────────────────────────────────────────
-- Sinistros vinculados a apólices
CREATE TABLE IF NOT EXISTS public.eam_insurance_claims (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       text        NOT NULL,
  policy_id       uuid        NOT NULL REFERENCES public.eam_insurance_policies(id) ON DELETE RESTRICT,
  asset_id        uuid        REFERENCES public.eam_assets(id) ON DELETE SET NULL,
  claim_date      date        NOT NULL,
  description     text        NOT NULL,
  claimed_value   numeric(15,2),
  paid_value      numeric(15,2),
  status          text        NOT NULL DEFAULT 'aberto'
                              CHECK (status IN ('aberto','em_analise','pago','negado','encerrado')),
  resolution_notes text,
  created_by      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eam_claims_tenant ON public.eam_insurance_claims(tenant_id);
CREATE INDEX IF NOT EXISTS idx_eam_claims_policy ON public.eam_insurance_claims(policy_id);

-- ── eam_inventories ───────────────────────────────────────────────────────────
-- Inventários patrimoniais
CREATE TABLE IF NOT EXISTS public.eam_inventories (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           text        NOT NULL,
  name                text        NOT NULL,
  description         text,
  scope_type          text        NOT NULL DEFAULT 'geral'
                                  CHECK (scope_type IN ('geral','departamento','localizacao')),
  scope_value         text,                                            -- ID do departamento ou localização
  scope_label         text,
  status              text        NOT NULL DEFAULT 'planejado'
                                  CHECK (status IN ('planejado','em_andamento','concluido')),
  responsible_id      text,
  responsible_name    text,
  planned_start       date,
  started_at          timestamptz,
  completed_at        timestamptz,
  total_expected      integer     DEFAULT 0,
  total_found         integer     DEFAULT 0,
  total_not_found     integer     DEFAULT 0,
  total_new           integer     DEFAULT 0,
  created_by          text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eam_inv_tenant  ON public.eam_inventories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_eam_inv_status  ON public.eam_inventories(tenant_id, status);

-- ── eam_inventory_items ───────────────────────────────────────────────────────
-- Itens verificados em cada inventário
CREATE TABLE IF NOT EXISTS public.eam_inventory_items (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         text        NOT NULL,
  inventory_id      uuid        NOT NULL REFERENCES public.eam_inventories(id) ON DELETE CASCADE,
  asset_id          uuid        REFERENCES public.eam_assets(id) ON DELETE SET NULL,
  asset_tag         text,                                              -- copiado no momento da criação
  asset_name        text,
  item_status       text        NOT NULL DEFAULT 'pendente'
                                CHECK (item_status IN ('pendente','localizado','nao_encontrado','encontrado_sem_cadastro')),
  found_location    text,
  expected_location text,
  checked_by        text,
  checked_at        timestamptz,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eam_invitem_inv    ON public.eam_inventory_items(inventory_id);
CREATE INDEX IF NOT EXISTS idx_eam_invitem_asset  ON public.eam_inventory_items(asset_id);
CREATE INDEX IF NOT EXISTS idx_eam_invitem_status ON public.eam_inventory_items(inventory_id, item_status);
CREATE INDEX IF NOT EXISTS idx_eam_invitem_tenant ON public.eam_inventory_items(tenant_id);

-- ── eam_responsibility_terms ──────────────────────────────────────────────────
-- Termos de responsabilidade de custódia de ativo
CREATE TABLE IF NOT EXISTS public.eam_responsibility_terms (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       text        NOT NULL,
  asset_id        uuid        NOT NULL REFERENCES public.eam_assets(id) ON DELETE RESTRICT,
  employee_id     text,
  employee_name   text        NOT NULL,
  start_date      date        NOT NULL DEFAULT CURRENT_DATE,
  end_date        date,
  status          text        NOT NULL DEFAULT 'pendente_assinatura'
                              CHECK (status IN ('pendente_assinatura','assinado','rescindido')),
  signed_at       timestamptz,
  sign_method     text        DEFAULT 'aceite_digital'
                              CHECK (sign_method IN ('eletrônico','aceite_digital','fisico')),
  document_hash   text,
  notes           text,
  created_by      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eam_terms_tenant  ON public.eam_responsibility_terms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_eam_terms_asset   ON public.eam_responsibility_terms(asset_id);
CREATE INDEX IF NOT EXISTS idx_eam_terms_employee ON public.eam_responsibility_terms(tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_eam_terms_status  ON public.eam_responsibility_terms(tenant_id, status);

-- ── eam_notification_rules ────────────────────────────────────────────────────
-- Configurações de alertas por tenant
CREATE TABLE IF NOT EXISTS public.eam_notification_rules (
  tenant_id                   text        PRIMARY KEY,
  warranty_alert_days         integer[]   NOT NULL DEFAULT '{30,15,5}',
  insurance_alert_days        integer[]   NOT NULL DEFAULT '{60,30,15}',
  maintenance_alert_days      integer     NOT NULL DEFAULT 7,
  no_responsible_alert_days   integer     NOT NULL DEFAULT 30,
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- DEFAULT SEED DATA: categorias padrão para novos tenants
-- (inseridas via código no primeiro acesso ao módulo, não aqui no SQL)
-- ─────────────────────────────────────────────────────────────────────────────

-- Comentário de segurança:
-- RLS deve ser habilitado em todas as tabelas via Dashboard do Supabase.
-- Policies exemplo (habilitar manualmente):
--   ALTER TABLE public.eam_assets ENABLE ROW LEVEL SECURITY;
--   CREATE POLICY "tenant_isolation" ON public.eam_assets
--     USING (tenant_id = current_setting('request.jwt.claims', true)::json->>'entity_id');
-- (Ajustar conforme o padrão de JWT claims do projeto)
