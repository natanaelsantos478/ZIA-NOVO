-- =============================================================================
-- RLS Fase 2 — Piloto CRM (8 tabelas internas)
--
-- Substitui policies abertas (qual=true, role public) por isolamento por tenant.
-- Mecanismo: JWT custom da zia-auth com app_metadata.scope_ids; helpers
-- zia_is_admin() + tenant_in_scope(tenant_id). Admin (is_admin) tem bypass.
-- Ver "LEI DA RLS" no CLAUDE.md.
--
-- Testado (rollback via RAISE): usuário zita-vendas vê 5 de 125 negociacoes;
-- KL FACTORING vê 117; admin vê 125. tenant_id 100% populado (0 nulls).
-- Excluídos deste lote: crm_orcamentos, crm_orcamento_itens (possível view pública/anon).
-- =============================================================================

DO $$
DECLARE t text; p text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'crm_anotacoes','crm_atendimentos','crm_atividades','crm_compromisso_arquivos',
    'crm_compromisso_participantes','crm_funil_etapas','crm_funis','crm_negociacoes'
  ] LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p, t);
    END LOOP;
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON public.%I FOR ALL TO authenticated '
      'USING (zia_is_admin() OR tenant_in_scope(tenant_id)) '
      'WITH CHECK (zia_is_admin() OR tenant_in_scope(tenant_id))', t);
  END LOOP;
END $$;
