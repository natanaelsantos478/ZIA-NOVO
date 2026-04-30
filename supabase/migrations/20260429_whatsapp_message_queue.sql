CREATE TABLE IF NOT EXISTS whatsapp_message_queue (
  numero        TEXT        PRIMARY KEY,
  mensagens     JSONB       NOT NULL DEFAULT '[]',
  process_after TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '5 seconds'),
  processed     BOOLEAN     NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wmq_process_after_idx
  ON whatsapp_message_queue (process_after)
  WHERE processed = false;

ALTER TABLE whatsapp_message_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wmq_service_role_all" ON whatsapp_message_queue
  FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON whatsapp_message_queue TO service_role;
