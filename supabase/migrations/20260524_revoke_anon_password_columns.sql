-- =============================================================================
-- MIGRATION: zia_operator_profiles — anon não lê password / password_hash
--
-- Problema: o grant de SELECT era no NÍVEL DA TABELA (cobre TODAS as colunas),
-- então qualquer cliente anon que fizesse select('*') recebia o bcrypt em
-- password_hash. Correção: remover o grant de tabela e conceder SELECT apenas
-- nas colunas que a tela de login precisa. password/password_hash ficam sem
-- grant para anon. authenticated/service_role mantêm acesso total (gestão de
-- credenciais no painel). Pareado com o frontend 2.0.4 (ProfileContext usa
-- colunas explícitas, não traz mais password/hash ao cliente).
--
-- Em Postgres, REVOKE SELECT(coluna) NÃO funciona enquanto existe o grant de
-- tabela (ele cobre tudo). Por isso: REVOKE da tabela + GRANT por coluna.
-- =============================================================================

REVOKE SELECT ON public.zia_operator_profiles FROM anon;

GRANT SELECT (
  id, code, name, level, entity_type, entity_id, entity_name, module_access,
  email, email_verified, pending_otp, employee_id, active, created_at
) ON public.zia_operator_profiles TO anon;
