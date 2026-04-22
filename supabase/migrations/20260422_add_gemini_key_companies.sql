-- Chave Gemini por empresa
-- Quando preenchida, sobrescreve a chave global do sistema para todas
-- as chamadas de IA dessa empresa. Fallback: chave global do sistema.
ALTER TABLE zia_companies
  ADD COLUMN IF NOT EXISTS gemini_api_key TEXT;
