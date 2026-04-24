-- Tabela de arquivos que a IA pode enviar via WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_ia_arquivos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    text NOT NULL,
  nome         text NOT NULL,
  descricao    text,
  file_name    text NOT NULL,
  file_url     text NOT NULL,
  storage_path text NOT NULL,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE whatsapp_ia_arquivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON whatsapp_ia_arquivos
  USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY "service_role_all" ON whatsapp_ia_arquivos
  TO service_role USING (true) WITH CHECK (true);

CREATE INDEX ON whatsapp_ia_arquivos(tenant_id);
