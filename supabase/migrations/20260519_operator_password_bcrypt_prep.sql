-- =============================================================================
-- MIGRATION: zia_operator_profiles — preparação bcrypt (Fase 1, parte segura)
--
-- Peer review (19/05/2026) achou CRÍTICO: a coluna `password` guarda senha em
-- TEXTO CLARO de 5 operadores, e o anon consegue ler via anon key pública.
--
-- IMPORTANTE — restrição do CLAUDE.md: NÃO usar lib bcrypt dentro da zia-auth
-- (runtime Deno trava por Web Workers). Solução: bcrypt no Postgres via pgcrypto.
-- A zia-auth (service_role) chama a função verify_operator_password().
--
-- Esta migration é a PARTE SEGURA (sem impacto no login):
--   1. Backfill de password_hash via crypt() para perfis com senha texto-claro.
--   2. Cria verify_operator_password() (SECURITY DEFINER + search_path fixo,
--      EXECUTE só para service_role — fecha o vetor SECURITY-DEFINER-anon).
-- A coluna `password` continua intacta aqui → login segue funcionando igual.
-- A remoção do texto-claro (NULL password + revoke anon) é a parte 2, feita
-- só DEPOIS de confirmar que a zia-auth nova valida via hash.
-- =============================================================================

-- pgcrypto vive no schema `extensions` no Supabase — qualificar explicitamente.

-- 1. Backfill: gera bcrypt a partir da senha texto-claro atual (idempotente)
UPDATE public.zia_operator_profiles
SET password_hash = extensions.crypt(password, extensions.gen_salt('bf'))
WHERE password IS NOT NULL
  AND password <> ''
  AND (password_hash IS NULL OR password_hash = '');

-- 2. Função de verificação (bcrypt no Postgres, não no Deno)
CREATE OR REPLACE FUNCTION public.verify_operator_password(p_stored text, p_input text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT p_stored IS NOT NULL AND p_stored <> '' AND p_stored = extensions.crypt(p_input, p_stored);
$$;

-- Só a zia-auth (service_role) chama. anon/authenticated NÃO podem executar.
REVOKE EXECUTE ON FUNCTION public.verify_operator_password(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.verify_operator_password(text, text) FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.verify_operator_password(text, text) TO service_role;
