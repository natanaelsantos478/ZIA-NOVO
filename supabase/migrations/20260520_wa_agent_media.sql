-- =============================================================================
-- WA Agent Media — suporte a recebimento de arquivos no agente WhatsApp
-- Adiciona colunas de mídia em wa_agent_chat_messages e origem em ia_arquivos
-- =============================================================================

-- ── 1. Colunas de mídia em wa_agent_chat_messages ────────────────────────────

ALTER TABLE public.wa_agent_chat_messages
  ADD COLUMN IF NOT EXISTS media_type  text,     -- 'document' | 'image' | 'video' | 'audio'
  ADD COLUMN IF NOT EXISTS media_url   text,     -- signed URL (7 dias) para UI
  ADD COLUMN IF NOT EXISTS file_name   text,     -- nome original do arquivo
  ADD COLUMN IF NOT EXISTS arquivo_id  uuid REFERENCES public.ia_arquivos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS wa_chat_messages_arquivo_idx
  ON public.wa_agent_chat_messages(arquivo_id) WHERE arquivo_id IS NOT NULL;

-- ── 2. Rastreio de origem em ia_arquivos ─────────────────────────────────────

ALTER TABLE public.ia_arquivos
  ADD COLUMN IF NOT EXISTS origem  text DEFAULT 'chat'; -- 'chat' | 'whatsapp'

-- ── 3. Verificação ────────────────────────────────────────────────────────────

SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'wa_agent_chat_messages'
  AND column_name  IN ('media_type', 'media_url', 'file_name', 'arquivo_id')
ORDER BY column_name;
