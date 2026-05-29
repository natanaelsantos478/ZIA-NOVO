-- ============================================================
-- SCM — Correção RLS: tenant isolation em todas as tabelas
-- com coluna tenant_id (14 tabelas)
-- Padrão: zia_is_admin() OR tenant_in_scope(tenant_id)
-- Role: authenticated only | anon: sem acesso
-- ============================================================

-- ── scm_auditoria_fretes ────────────────────────────────────
DROP POLICY IF EXISTS "scm_auditoria_fretes_tenant" ON public.scm_auditoria_fretes;
CREATE POLICY tenant_isolation ON public.scm_auditoria_fretes
  FOR ALL TO authenticated
  USING      (zia_is_admin() OR tenant_in_scope(tenant_id))
  WITH CHECK (zia_is_admin() OR tenant_in_scope(tenant_id));
REVOKE ALL ON public.scm_auditoria_fretes FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scm_auditoria_fretes TO authenticated;

-- ── scm_cold_chain ──────────────────────────────────────────
DROP POLICY IF EXISTS "scm_cold_chain_tenant" ON public.scm_cold_chain;
CREATE POLICY tenant_isolation ON public.scm_cold_chain
  FOR ALL TO authenticated
  USING      (zia_is_admin() OR tenant_in_scope(tenant_id))
  WITH CHECK (zia_is_admin() OR tenant_in_scope(tenant_id));
REVOKE ALL ON public.scm_cold_chain FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scm_cold_chain TO authenticated;

-- ── scm_crossdock ───────────────────────────────────────────
DROP POLICY IF EXISTS "scm_crossdock_tenant" ON public.scm_crossdock;
CREATE POLICY tenant_isolation ON public.scm_crossdock
  FOR ALL TO authenticated
  USING      (zia_is_admin() OR tenant_in_scope(tenant_id))
  WITH CHECK (zia_is_admin() OR tenant_in_scope(tenant_id));
REVOKE ALL ON public.scm_crossdock FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scm_crossdock TO authenticated;

-- ── scm_devolucoes ──────────────────────────────────────────
DROP POLICY IF EXISTS "scm_devolucoes_tenant" ON public.scm_devolucoes;
CREATE POLICY tenant_isolation ON public.scm_devolucoes
  FOR ALL TO authenticated
  USING      (zia_is_admin() OR tenant_in_scope(tenant_id))
  WITH CHECK (zia_is_admin() OR tenant_in_scope(tenant_id));
REVOKE ALL ON public.scm_devolucoes FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scm_devolucoes TO authenticated;

-- ── scm_docas ───────────────────────────────────────────────
DROP POLICY IF EXISTS "scm_docas_tenant" ON public.scm_docas;
CREATE POLICY tenant_isolation ON public.scm_docas
  FOR ALL TO authenticated
  USING      (zia_is_admin() OR tenant_in_scope(tenant_id))
  WITH CHECK (zia_is_admin() OR tenant_in_scope(tenant_id));
REVOKE ALL ON public.scm_docas FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scm_docas TO authenticated;

-- ── scm_drones ──────────────────────────────────────────────
DROP POLICY IF EXISTS "scm_drones_tenant" ON public.scm_drones;
CREATE POLICY tenant_isolation ON public.scm_drones
  FOR ALL TO authenticated
  USING      (zia_is_admin() OR tenant_in_scope(tenant_id))
  WITH CHECK (zia_is_admin() OR tenant_in_scope(tenant_id));
REVOKE ALL ON public.scm_drones FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scm_drones TO authenticated;

-- ── scm_embalagens ──────────────────────────────────────────
DROP POLICY IF EXISTS "scm_embalagens_tenant" ON public.scm_embalagens;
CREATE POLICY tenant_isolation ON public.scm_embalagens
  FOR ALL TO authenticated
  USING      (zia_is_admin() OR tenant_in_scope(tenant_id))
  WITH CHECK (zia_is_admin() OR tenant_in_scope(tenant_id));
REVOKE ALL ON public.scm_embalagens FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scm_embalagens TO authenticated;

-- ── scm_embarque_itens ──────────────────────────────────────
DROP POLICY IF EXISTS "scm_embarque_itens_tenant" ON public.scm_embarque_itens;
CREATE POLICY tenant_isolation ON public.scm_embarque_itens
  FOR ALL TO authenticated
  USING      (zia_is_admin() OR tenant_in_scope(tenant_id))
  WITH CHECK (zia_is_admin() OR tenant_in_scope(tenant_id));
REVOKE ALL ON public.scm_embarque_itens FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scm_embarque_itens TO authenticated;

-- ── scm_embarques ───────────────────────────────────────────
DROP POLICY IF EXISTS "scm_embarques_tenant" ON public.scm_embarques;
CREATE POLICY tenant_isolation ON public.scm_embarques
  FOR ALL TO authenticated
  USING      (zia_is_admin() OR tenant_in_scope(tenant_id))
  WITH CHECK (zia_is_admin() OR tenant_in_scope(tenant_id));
REVOKE ALL ON public.scm_embarques FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scm_embarques TO authenticated;

-- ── scm_esg_metricas ────────────────────────────────────────
DROP POLICY IF EXISTS "scm_esg_metricas_tenant" ON public.scm_esg_metricas;
CREATE POLICY tenant_isolation ON public.scm_esg_metricas
  FOR ALL TO authenticated
  USING      (zia_is_admin() OR tenant_in_scope(tenant_id))
  WITH CHECK (zia_is_admin() OR tenant_in_scope(tenant_id));
REVOKE ALL ON public.scm_esg_metricas FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scm_esg_metricas TO authenticated;

-- ── scm_fretes ──────────────────────────────────────────────
DROP POLICY IF EXISTS "scm_fretes_tenant" ON public.scm_fretes;
CREATE POLICY tenant_isolation ON public.scm_fretes
  FOR ALL TO authenticated
  USING      (zia_is_admin() OR tenant_in_scope(tenant_id))
  WITH CHECK (zia_is_admin() OR tenant_in_scope(tenant_id));
REVOKE ALL ON public.scm_fretes FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scm_fretes TO authenticated;

-- ── scm_rastreamento ────────────────────────────────────────
DROP POLICY IF EXISTS "scm_rastreamento_tenant" ON public.scm_rastreamento;
CREATE POLICY tenant_isolation ON public.scm_rastreamento
  FOR ALL TO authenticated
  USING      (zia_is_admin() OR tenant_in_scope(tenant_id))
  WITH CHECK (zia_is_admin() OR tenant_in_scope(tenant_id));
REVOKE ALL ON public.scm_rastreamento FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scm_rastreamento TO authenticated;

-- ── scm_rotas ───────────────────────────────────────────────
DROP POLICY IF EXISTS "scm_rotas_tenant" ON public.scm_rotas;
CREATE POLICY tenant_isolation ON public.scm_rotas
  FOR ALL TO authenticated
  USING      (zia_is_admin() OR tenant_in_scope(tenant_id))
  WITH CHECK (zia_is_admin() OR tenant_in_scope(tenant_id));
REVOKE ALL ON public.scm_rotas FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scm_rotas TO authenticated;

-- ── scm_veiculos ────────────────────────────────────────────
DROP POLICY IF EXISTS "scm_veiculos_tenant" ON public.scm_veiculos;
CREATE POLICY tenant_isolation ON public.scm_veiculos
  FOR ALL TO authenticated
  USING      (zia_is_admin() OR tenant_in_scope(tenant_id))
  WITH CHECK (zia_is_admin() OR tenant_in_scope(tenant_id));
REVOKE ALL ON public.scm_veiculos FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scm_veiculos TO authenticated;

-- ============================================================
-- PENDENTE (9 tabelas sem coluna tenant_id — legado/inglês):
-- scm_deliveries, scm_dock_sessions, scm_drivers,
-- scm_freight_audits, scm_packing_orders, scm_reverse_logistics,
-- scm_routes, scm_shipments, scm_vehicles
-- Decisão pendente: verificar uso e descartar ou adicionar tenant_id
-- ============================================================
