-- ─────────────────────────────────────────────────────────────────────────────
-- Permite que ia_api_keys armazene integrações de saída (ZIA → serviço externo)
-- sem gerar key_prefix/key_hash, já que nesses casos não há autenticação inbound.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE ia_api_keys ALTER COLUMN key_prefix DROP NOT NULL;
ALTER TABLE ia_api_keys ALTER COLUMN key_hash DROP NOT NULL;

-- Substitui a constraint UNIQUE global por índice UNIQUE parcial (só valida quando NOT NULL)
ALTER TABLE ia_api_keys DROP CONSTRAINT IF EXISTS ia_api_keys_key_hash_key;
CREATE UNIQUE INDEX IF NOT EXISTS ia_api_keys_key_hash_key ON ia_api_keys (key_hash) WHERE key_hash IS NOT NULL;
