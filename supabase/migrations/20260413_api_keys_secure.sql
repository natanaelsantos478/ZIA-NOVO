-- =============================================================================
-- MIGRATION: API Keys seguras — armazena somente hash em vez de texto puro
--
-- Problema anterior: a coluna `api_key` guardava a chave em texto puro.
-- Se o banco vazasse, todas as chaves seriam expostas.
--
-- Solução: substituir por dois campos:
--   key_prefix  → primeiros 12 chars para identificação visual (ex: "zita_a3f9bc")
--   key_hash    → SHA-256 hex da chave completa, usado para validação server-side
--
-- A chave em texto puro nunca mais é armazenada — apenas gerada uma vez na
-- Edge Function e retornada ao cliente. Perda da chave = criar nova.
-- =============================================================================

-- pgcrypto: necessário para digest() ao migrar dados existentes
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── 1. Adicionar novas colunas (nullable para migrar dados existentes) ─────────
ALTER TABLE public.ia_api_keys
  ADD COLUMN IF NOT EXISTS key_prefix TEXT,
  ADD COLUMN IF NOT EXISTS key_hash   TEXT;

-- ── 2. Migrar registros existentes ────────────────────────────────────────────
-- Para cada chave existente: extrai prefix e calcula hash SHA-256
UPDATE public.ia_api_keys
SET
  key_prefix = LEFT(api_key, 12),
  key_hash   = encode(digest(api_key, 'sha256'), 'hex')
WHERE api_key IS NOT NULL
  AND key_hash IS NULL;

-- ── 3. Tornar colunas NOT NULL (dados já migrados) ────────────────────────────
ALTER TABLE public.ia_api_keys
  ALTER COLUMN key_prefix SET NOT NULL,
  ALTER COLUMN key_hash   SET NOT NULL;

-- ── 4. Índice único no hash (lookup eficiente durante validação) ──────────────
DROP INDEX IF EXISTS idx_ia_api_keys_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_ia_api_keys_hash ON public.ia_api_keys(key_hash);

-- ── 5. Remover a coluna com texto puro ────────────────────────────────────────
ALTER TABLE public.ia_api_keys DROP COLUMN IF EXISTS api_key;

-- ── Resultado esperado ────────────────────────────────────────────────────────
-- ia_api_keys agora tem:
--   key_prefix  TEXT NOT NULL  → "zita_a3f9bc01" (exibido na UI mascarado)
--   key_hash    TEXT NOT NULL  → "e3b0c44298fc..." (validação server-side)
-- A chave completa nunca sai do servidor após a criação.
