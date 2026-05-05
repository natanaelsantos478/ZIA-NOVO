-- ─────────────────────────────────────────────────────────────────────────────
-- SCM Integration FKs — Etapa 1
-- Adiciona FKs opcionais (NULL) que ligam o módulo SCM ao ERP/RH.
-- Nenhum dado existente é afetado. Todas as colunas são nullable.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── scm_embarques: vínculo com pedido, cliente e transportadora ───────────────

ALTER TABLE public.scm_embarques
  ADD COLUMN IF NOT EXISTS pedido_id         UUID NULL REFERENCES public.erp_pedidos(id)     ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cliente_id        UUID NULL REFERENCES public.erp_clientes(id)    ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS transportadora_id UUID NULL REFERENCES public.erp_fornecedores(id) ON DELETE SET NULL;

-- ── scm_veiculos: vínculo com motorista (employee) ───────────────────────────

ALTER TABLE public.scm_veiculos
  ADD COLUMN IF NOT EXISTS employee_id UUID NULL REFERENCES public.employees(id) ON DELETE SET NULL;

-- ── scm_devolucoes: vínculo com pedido de devolução no ERP ───────────────────

ALTER TABLE public.scm_devolucoes
  ADD COLUMN IF NOT EXISTS pedido_devolucao_id UUID NULL REFERENCES public.erp_pedidos(id) ON DELETE SET NULL;

-- ── erp_fornecedores: flag para filtrar transportadoras no select ─────────────

ALTER TABLE public.erp_fornecedores
  ADD COLUMN IF NOT EXISTS is_transportadora BOOLEAN NOT NULL DEFAULT false;

-- Índices para performance nas queries de join mais frequentes
CREATE INDEX IF NOT EXISTS idx_scm_embarques_pedido_id         ON public.scm_embarques(pedido_id)         WHERE pedido_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scm_embarques_cliente_id        ON public.scm_embarques(cliente_id)        WHERE cliente_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scm_embarques_transportadora_id ON public.scm_embarques(transportadora_id) WHERE transportadora_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scm_veiculos_employee_id        ON public.scm_veiculos(employee_id)        WHERE employee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scm_devolucoes_pedido_dev_id    ON public.scm_devolucoes(pedido_devolucao_id) WHERE pedido_devolucao_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_erp_fornecedores_transportadora ON public.erp_fornecedores(is_transportadora) WHERE is_transportadora = true;
