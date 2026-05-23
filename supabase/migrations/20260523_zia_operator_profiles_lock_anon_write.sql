-- =============================================================================
-- MIGRATION: zia_operator_profiles — fecha escrita/leitura aberta do anon
--
-- Peer review (Opus) achou: além da policy estreita `anon_read_profiles`,
-- existia `profiles_all {public} ALL USING(true)` — e RLS é OR-permissivo,
-- então o anon (anon key pública) podia LER e ESCREVER tudo: ler senha em
-- texto-claro, trocar senha de qualquer operador, criar perfil admin.
--
-- Fix:
--   • DROP da policy aberta `profiles_all`.
--   • `authenticated_all` → app/admin (autenticados) seguem com acesso total.
--   • `anon_read_profiles` (SELECT, active=true) mantido — a tela de login
--     lista perfis com a anon key antes do login.
--   • REVOKE de escrita do anon (defense-in-depth; a policy já bloqueia).
--
-- NOTA: isto fecha a ESCRITA anon e a policy aberta. A leitura do texto-claro
-- da coluna `password` pelo anon é fechada em passo separado (column-grant +
-- ProfileContext sem select('*') + NULL da coluna após a zia-auth nova no main).
-- =============================================================================

DROP POLICY IF EXISTS "profiles_all" ON public.zia_operator_profiles;

DROP POLICY IF EXISTS "authenticated_all" ON public.zia_operator_profiles;
CREATE POLICY "authenticated_all" ON public.zia_operator_profiles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_read_profiles" ON public.zia_operator_profiles;
CREATE POLICY "anon_read_profiles" ON public.zia_operator_profiles
  FOR SELECT TO anon USING (active = true);

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.zia_operator_profiles FROM anon;
