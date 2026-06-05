-- =============================================================================
-- MIGRATION: zia_operator_profiles — zera senha em texto-claro (finaliza bcrypt)
--
-- Espelha operação já aplicada ao banco vivo (23/05/2026) após confirmar que a
-- zia-auth nova (validação por bcrypt via verify_operator_password) está no main
-- e funcionando em produção. A partir daqui o login usa SOMENTE o hash.
--
-- Pré-requisitos (migrations anteriores):
--   20260519_operator_password_bcrypt_prep.sql — backfill password_hash + RPC
--   20260523_zia_operator_profiles_lock_anon_write.sql — remove policy aberta
--
-- Idempotente: só zera onde já existe hash.
-- =============================================================================

UPDATE public.zia_operator_profiles
SET password = NULL
WHERE password_hash IS NOT NULL AND password IS NOT NULL;
