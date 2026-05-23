-- =============================================================================
-- MIGRATION: segurança — reduz superfície de funções SECURITY DEFINER
--
-- Peer review (Opus) + advisors: 22 funções SECURITY DEFINER eram executáveis
-- por anon/authenticated. A pior: executar_query_ia (executa SQL arbitrário) —
-- backdoor para o banco inteiro. Só as edge functions (service_role) a usam.
--
-- Estratégia:
--   • Backdoor + funções de edge/cron/worker/trigger → só service_role.
--     (Triggers e chamadas internas seguem funcionando: rodam como definer.)
--   • Funções que o frontend autenticado chama (fn_verificar_estoque_pedido,
--     fn_avaliar_no_custo) → tira só do anon, mantém authenticated.
--   • MANTÉM anon+authenticated: tenant_in_scope/zia_is_admin/zia_scope_ids
--     (helpers usados nas policies RLS) e create_demo_lead (landing pública).
--   • Pin de search_path nos helpers de RLS (ALTER não altera o corpo → seguro).
-- =============================================================================

-- 1. Backdoor + funções server-only → revoga de PUBLIC/anon/authenticated, garante service_role
DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'executar_query_ia(text, text)',
    'check_agent_web_search(uuid)',
    'eam_job_alerts()',
    'eam_job_depreciation()',
    'eam_job_maintenance()',
    'eam_job_responsible()',
    'reset_zeus_daily_counters()',
    'ia_agenda_reaper()',
    'fn_aplicar_config_grupo_rh()',
    'fn_atualiza_estoque()',
    'fn_gerar_comissoes_pedido()',
    'ia_agenda_sync_compromisso()',
    'scm_on_embarque_entregue()',
    'scm_on_embarque_frete_lancamento()',
    'upsert_message_queue(text, text, timestamp with time zone)',
    'validate_zeus_api_key(text)',
    'fn_avaliar_gatilho(jsonb, jsonb)',
    'fn_calcular_comissao_item(uuid, uuid, numeric, numeric, uuid)',
    'fn_calcular_valor_folha(jsonb, jsonb)'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role', f);
  END LOOP;
END $$;

-- 2. Funções chamadas pelo frontend AUTENTICADO → revoga PUBLIC (que cobre anon),
--    regranta só authenticated + service_role. (REVOKE FROM anon sozinho não basta:
--    o grant PUBLIC padrão ainda daria acesso ao anon.)
REVOKE EXECUTE ON FUNCTION public.fn_verificar_estoque_pedido(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.fn_verificar_estoque_pedido(uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.fn_avaliar_no_custo(uuid, jsonb, uuid, integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.fn_avaliar_no_custo(uuid, jsonb, uuid, integer) TO authenticated, service_role;

-- 3. Pin de search_path nos helpers de RLS (hardening; ALTER preserva o corpo)
ALTER FUNCTION public.tenant_in_scope(text) SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.tenant_in_scope(uuid) SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.zia_is_admin()        SET search_path = pg_catalog, public, pg_temp;
ALTER FUNCTION public.zia_scope_ids()       SET search_path = pg_catalog, public, pg_temp;
