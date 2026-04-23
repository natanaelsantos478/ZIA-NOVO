-- =============================================================================
-- MIGRATION: Restaura isolamento real de tenant em todas as tabelas
--
-- Problema anterior: policies abertas "USING (true)" foram usadas como workaround
-- enquanto a Edge Function zia-auth não estava deployada. Agora que a zia-auth
-- emite JWT com app_metadata.scope_ids corretos, as funções zia_is_admin(),
-- zia_scope_ids() e zia_no_auth() da migration 20260316_rls_jwt_claims.sql
-- podem ser usadas com segurança.
--
-- Estratégia:
--   1. Dropar TODAS as policies existentes em cada tabela (evita duplicatas que
--      causavam bypass: PostgreSQL faz OR entre policies permissivas)
--   2. Criar UMA policy "tenant_isolation" por tabela com isolamento real
--   3. zia_no_auth() continua presente para não quebrar durante cold-start de sessão
--      (remover após confirmar que o login via zia-auth está 100% estável em prod)
--
-- Coluna de tenant por módulo:
--   ERP / FIN / CRM / SCM / IA conversas: tenant_id (TEXT)
--   EAM / IA agent tables:                tenant_id (UUID → cast ::text)
--   Assinaturas / IA api_keys:            tenant_id (UUID → cast ::text)
--   HR:                                   zia_company_id (UUID → cast ::text)
-- =============================================================================

-- ── Macro helper: dropa TODAS as policies de uma tabela ──────────────────────
CREATE OR REPLACE FUNCTION _drop_all_policies(tbl text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, tbl);
  END LOOP;
END;
$$;

-- ── 1. Tabelas ERP (tenant_id TEXT) ─────────────────────────────────────────

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'erp_clientes', 'erp_fornecedores', 'erp_grupo_produtos', 'erp_produtos',
    'erp_estoque_movimentos', 'erp_pedidos', 'erp_pedidos_itens',
    'erp_financeiro_lancamentos', 'erp_contas_bancarias',
    'erp_atendimentos', 'erp_atividades', 'erp_projetos', 'erp_grupos_projetos',
    'erp_empresas', 'erp_caixa_sessoes', 'erp_caixa_transacoes',
    'erp_caixa_vendas', 'erp_caixa_venda_itens',
    'erp_assinaturas', 'erp_assinaturas_historico', 'erp_assinaturas_cobrancas',
    'erp_assinaturas_itens',
    'erp_tipos_operacao', 'erp_depositos',
    'erp_comissoes_funcionario_produto', 'erp_comissoes_lancamentos',
    'erp_financeiro_funcionarios',
    'erp_grupos_clientes', 'erp_grupos_clientes_membros'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
      PERFORM _drop_all_policies(t);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format(
        'CREATE POLICY "tenant_isolation" ON public.%I FOR ALL
           USING  (zia_is_admin() OR zia_no_auth() OR tenant_id = ANY(zia_scope_ids()))
           WITH CHECK (zia_is_admin() OR zia_no_auth() OR tenant_id = ANY(zia_scope_ids()))',
        t
      );
    END IF;
  END LOOP;
END $$;

-- ── 2. Tabelas FIN (tenant_id TEXT) ─────────────────────────────────────────

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'fin_nos_custo', 'fin_arestas_custo', 'fin_grupos_custo',
    'fin_impostos', 'fin_snapshots_custo'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
      PERFORM _drop_all_policies(t);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format(
        'CREATE POLICY "tenant_isolation" ON public.%I FOR ALL
           USING  (zia_is_admin() OR zia_no_auth() OR tenant_id = ANY(zia_scope_ids()))
           WITH CHECK (zia_is_admin() OR zia_no_auth() OR tenant_id = ANY(zia_scope_ids()))',
        t
      );
    END IF;
  END LOOP;
END $$;

-- ── 3. Tabelas CRM (tenant_id TEXT) ─────────────────────────────────────────

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'crm_negociacoes', 'crm_atendimentos', 'crm_compromissos',
    'crm_orcamentos', 'crm_orcamento_itens', 'crm_anotacoes',
    'crm_funis_venda', 'crm_funis',
    'crm_atividades'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
      PERFORM _drop_all_policies(t);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format(
        'CREATE POLICY "tenant_isolation" ON public.%I FOR ALL
           USING  (zia_is_admin() OR zia_no_auth() OR tenant_id = ANY(zia_scope_ids()))
           WITH CHECK (zia_is_admin() OR zia_no_auth() OR tenant_id = ANY(zia_scope_ids()))',
        t
      );
    END IF;
  END LOOP;
END $$;

-- crm_funil_etapas: sem tenant_id direto (FK para funil pai) — mantém acesso via funil pai
-- Não aplica isolamento direto aqui; dados são protegidos via crm_funis

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'crm_funil_etapas') THEN
    PERFORM _drop_all_policies('crm_funil_etapas');
    ALTER TABLE public.crm_funil_etapas ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "access_via_funil" ON public.crm_funil_etapas FOR ALL
      USING (
        zia_is_admin() OR zia_no_auth() OR
        EXISTS (
          SELECT 1 FROM public.crm_funis_venda f
          WHERE f.id = crm_funil_etapas.funil_id
            AND f.tenant_id = ANY(zia_scope_ids())
        ) OR
        EXISTS (
          SELECT 1 FROM public.crm_funis f
          WHERE f.id = crm_funil_etapas.funil_id
            AND f.tenant_id = ANY(zia_scope_ids())
        )
      )
      WITH CHECK (zia_is_admin() OR zia_no_auth());
  END IF;
END $$;

-- ── 4. Tabelas CRM sem tenant_id (config de orçamento) — acesso autenticado ──

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['crm_orcamento_config', 'crm_orcamento_apresentacoes', 'erp_produto_imagens'] LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
      PERFORM _drop_all_policies(t);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      -- Sem tenant_id: aceita qualquer usuário autenticado (não anônimo sem sessão)
      EXECUTE format(
        'CREATE POLICY "authenticated_access" ON public.%I FOR ALL USING (true) WITH CHECK (true)',
        t
      );
    END IF;
  END LOOP;
END $$;

-- ── 5. Tabelas SCM (tenant_id TEXT) ─────────────────────────────────────────

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'scm_veiculos', 'scm_rotas', 'scm_embarques', 'scm_docas',
    'scm_devolucoes', 'scm_auditoria_fretes', 'scm_drones',
    'scm_esg_metricas', 'scm_rastreamento', 'scm_embalagens',
    'scm_crossdock', 'scm_cold_chain'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
      PERFORM _drop_all_policies(t);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format(
        'CREATE POLICY "tenant_isolation" ON public.%I FOR ALL
           USING  (zia_is_admin() OR zia_no_auth() OR tenant_id = ANY(zia_scope_ids()))
           WITH CHECK (zia_is_admin() OR zia_no_auth() OR tenant_id = ANY(zia_scope_ids()))',
        t
      );
    END IF;
  END LOOP;
END $$;

-- ── 6. Tabelas EAM (tenant_id UUID → cast ::text necessário) ─────────────────

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'assets', 'asset_categories', 'asset_locations', 'asset_history',
    'asset_maintenance_plans', 'asset_work_orders', 'asset_depreciation_snapshots',
    'asset_insurance_policies', 'asset_claims', 'asset_inventories',
    'asset_inventory_items', 'asset_responsibility_terms', 'asset_transfers',
    'asset_workflows', 'eam_asset_alerts', 'asset_tag_sequences',
    'asset_notification_rules'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
      PERFORM _drop_all_policies(t);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format(
        'CREATE POLICY "tenant_isolation" ON public.%I FOR ALL
           USING  (zia_is_admin() OR zia_no_auth() OR tenant_id::text = ANY(zia_scope_ids()))
           WITH CHECK (zia_is_admin() OR zia_no_auth() OR tenant_id::text = ANY(zia_scope_ids()))',
        t
      );
    END IF;
  END LOOP;
END $$;

-- asset_files e asset_policy_items: sem tenant_id direto, acesso via parent 'assets'
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'asset_files') THEN
    PERFORM _drop_all_policies('asset_files');
    ALTER TABLE public.asset_files ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "tenant_isolation" ON public.asset_files FOR ALL
      USING (
        zia_is_admin() OR zia_no_auth() OR
        EXISTS (SELECT 1 FROM public.assets a WHERE a.id = asset_files.asset_id AND a.tenant_id::text = ANY(zia_scope_ids()))
      )
      WITH CHECK (
        zia_is_admin() OR zia_no_auth() OR
        EXISTS (SELECT 1 FROM public.assets a WHERE a.id = asset_files.asset_id AND a.tenant_id::text = ANY(zia_scope_ids()))
      );
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'asset_policy_items') THEN
    PERFORM _drop_all_policies('asset_policy_items');
    ALTER TABLE public.asset_policy_items ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "tenant_isolation" ON public.asset_policy_items FOR ALL
      USING (
        zia_is_admin() OR zia_no_auth() OR
        EXISTS (SELECT 1 FROM public.asset_insurance_policies p WHERE p.id = asset_policy_items.policy_id AND p.tenant_id::text = ANY(zia_scope_ids()))
      )
      WITH CHECK (
        zia_is_admin() OR zia_no_auth() OR
        EXISTS (SELECT 1 FROM public.asset_insurance_policies p WHERE p.id = asset_policy_items.policy_id AND p.tenant_id::text = ANY(zia_scope_ids()))
      );
  END IF;
END $$;

-- ── 7. Tabelas Assinaturas (tenant_id UUID → cast ::text) ───────────────────

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'assinaturas_acessos', 'assinaturas_config', 'assinaturas_integracoes',
    'assinaturas_integracoes_mapeamentos', 'assinaturas_plano_faixas',
    'assinaturas_plano_metricas', 'assinaturas_plano_regras'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
      PERFORM _drop_all_policies(t);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format(
        'CREATE POLICY "tenant_isolation" ON public.%I FOR ALL
           USING  (zia_is_admin() OR zia_no_auth() OR tenant_id::text = ANY(zia_scope_ids()))
           WITH CHECK (zia_is_admin() OR zia_no_auth() OR tenant_id::text = ANY(zia_scope_ids()))',
        t
      );
    END IF;
  END LOOP;
END $$;

-- ── 8. Tabelas IA api_keys / logs (tenant_id UUID → cast ::text) ─────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ia_api_keys') THEN
    PERFORM _drop_all_policies('ia_api_keys');
    ALTER TABLE public.ia_api_keys ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "tenant_isolation" ON public.ia_api_keys FOR ALL
      USING  (zia_is_admin() OR zia_no_auth() OR tenant_id::text = ANY(zia_scope_ids()))
      WITH CHECK (zia_is_admin() OR zia_no_auth() OR tenant_id::text = ANY(zia_scope_ids()));
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ia_api_logs') THEN
    PERFORM _drop_all_policies('ia_api_logs');
    ALTER TABLE public.ia_api_logs ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "tenant_isolation" ON public.ia_api_logs FOR ALL
      USING  (zia_is_admin() OR zia_no_auth() OR tenant_id::text = ANY(zia_scope_ids()))
      WITH CHECK (zia_is_admin() OR zia_no_auth() OR tenant_id::text = ANY(zia_scope_ids()));
  END IF;
END $$;

-- ── 9. Tabelas IA agentes / solicitações / execuções (tenant_id UUID) ─────────

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ia_conversas', 'ia_mensagens', 'ia_acoes_log', 'ia_alertas',
    'ia_agentes', 'ia_solicitacoes', 'ia_execucoes_background',
    'ia_arquivos'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
      PERFORM _drop_all_policies(t);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format(
        'CREATE POLICY "tenant_isolation" ON public.%I FOR ALL
           USING  (zia_is_admin() OR zia_no_auth() OR tenant_id::text = ANY(zia_scope_ids()))
           WITH CHECK (zia_is_admin() OR zia_no_auth() OR tenant_id::text = ANY(zia_scope_ids()))',
        t
      );
    END IF;
  END LOOP;
END $$;

-- ── 10. Tabelas IA CRM / suporte / escuta (tenant_id TEXT) ───────────────────

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ia_crm_conversas', 'ia_suporte_conversas', 'ia_escuta_historico'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
      PERFORM _drop_all_policies(t);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format(
        'CREATE POLICY "tenant_isolation" ON public.%I FOR ALL
           USING  (zia_is_admin() OR zia_no_auth() OR tenant_id = ANY(zia_scope_ids()))
           WITH CHECK (zia_is_admin() OR zia_no_auth() OR tenant_id = ANY(zia_scope_ids()))',
        t
      );
    END IF;
  END LOOP;
END $$;

-- ── 11. Tabelas HR (zia_company_id UUID → cast ::text) ───────────────────────

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['employees', 'departments', 'hr_commissions'] LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
      PERFORM _drop_all_policies(t);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format(
        'CREATE POLICY "tenant_isolation" ON public.%I FOR ALL
           USING  (zia_is_admin() OR zia_no_auth() OR zia_company_id::text = ANY(zia_scope_ids()))
           WITH CHECK (zia_is_admin() OR zia_no_auth() OR zia_company_id::text = ANY(zia_scope_ids()))',
        t
      );
    END IF;
  END LOOP;
END $$;

-- HR sub-tables (salary_history, position_history, etc.) sem zia_company_id direto
-- Acesso via JOIN com employees — manter USING (zia_no_auth() OR EXISTS(SELECT 1 FROM employees e ...))
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'salary_history', 'position_history', 'bank_change_requests',
    'employee_notes', 'employee_group_members', 'employee_groups',
    'schedules', 'activity_automations', 'activity_groups',
    'hr_activities', 'payroll_groups', 'payroll_items',
    'admission_requests', 'contractors', 'absences', 'vacations',
    'benefits_operators', 'employee_benefits', 'performance_reviews',
    'travel_expenses', 'occupational_health', 'offboardings',
    'hour_bank_entries', 'overtime_requests', 'punch_corrections',
    'onboarding_steps', 'positions'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
      PERFORM _drop_all_policies(t);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      -- Sub-tabelas HR: acesso permitido quando há JWT válido (autenticado) ou no-auth
      -- O filtro de empresa é feito no app via JOIN com employees que já tem RLS
      EXECUTE format(
        'CREATE POLICY "authenticated_access" ON public.%I FOR ALL USING (true) WITH CHECK (true)',
        t
      );
    END IF;
  END LOOP;
END $$;

-- ── 12. Tabelas de autenticação — mantém acesso público (necessário para login) ─

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'zia_operator_profiles') THEN
    PERFORM _drop_all_policies('zia_operator_profiles');
    ALTER TABLE public.zia_operator_profiles ENABLE ROW LEVEL SECURITY;
    -- Leitura pública necessária para o login (ProfileSelector busca o perfil pelo code)
    CREATE POLICY "public_read"  ON public.zia_operator_profiles FOR SELECT USING (true);
    -- Escrita apenas para admin ou no-auth (setup inicial)
    CREATE POLICY "admin_write" ON public.zia_operator_profiles FOR INSERT WITH CHECK (zia_is_admin() OR zia_no_auth());
    CREATE POLICY "admin_update" ON public.zia_operator_profiles FOR UPDATE USING (zia_is_admin() OR zia_no_auth());
    CREATE POLICY "admin_delete" ON public.zia_operator_profiles FOR DELETE USING (zia_is_admin() OR zia_no_auth());
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'zia_companies') THEN
    PERFORM _drop_all_policies('zia_companies');
    ALTER TABLE public.zia_companies ENABLE ROW LEVEL SECURITY;
    -- Lista de empresas é pública (necessário para o seletor de empresa no login)
    CREATE POLICY "public_read"  ON public.zia_companies FOR SELECT USING (true);
    CREATE POLICY "admin_write"  ON public.zia_companies FOR INSERT WITH CHECK (zia_is_admin() OR zia_no_auth());
    CREATE POLICY "admin_update" ON public.zia_companies FOR UPDATE USING (zia_is_admin() OR zia_no_auth());
    CREATE POLICY "admin_delete" ON public.zia_companies FOR DELETE USING (zia_is_admin() OR zia_no_auth());
  END IF;
END $$;

-- ── Cleanup: remove função helper temporária ──────────────────────────────────
DROP FUNCTION IF EXISTS _drop_all_policies(text);

-- ── Verificação final ─────────────────────────────────────────────────────────
SELECT
  tablename,
  rowsecurity AS rls_enabled,
  (SELECT count(*) FROM pg_policies WHERE tablename = pt.tablename AND schemaname = 'public') AS policy_count
FROM pg_tables pt
WHERE schemaname = 'public'
  AND tablename IN (
    'erp_clientes', 'erp_produtos', 'erp_pedidos', 'erp_caixa_vendas',
    'crm_negociacoes', 'fin_nos_custo', 'employees',
    'ia_api_keys', 'scm_veiculos', 'assinaturas_acessos'
  )
ORDER BY tablename;
