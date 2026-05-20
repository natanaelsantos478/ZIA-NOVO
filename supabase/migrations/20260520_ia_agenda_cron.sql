-- =============================================================================
-- MIGRATION: pg_cron para ia-agenda-executor
-- Agenda a Edge Function ia-agenda-executor para rodar a cada minuto via
-- pg_cron + pg_net (padrão oficial Supabase para cron server-side).
-- O Deno.cron dentro da Edge Function serve apenas como fallback local.
-- =============================================================================

-- Habilita extensões (idempotente — no-op se já existirem)
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove job anterior se existir
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ia-agenda-executor') THEN
    PERFORM cron.unschedule('ia-agenda-executor');
  END IF;
END;
$$;

-- Agenda execução a cada minuto via pg_net → Edge Function
SELECT cron.schedule(
  'ia-agenda-executor',
  '* * * * *',
  $$
    SELECT net.http_post(
      url     := 'https://tgeomsnxfcqwrxijjvek.supabase.co/functions/v1/ia-agenda-executor',
      headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnZW9tc254ZmNxd3J4aWpqdmVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NDAxMjEsImV4cCI6MjA4ODExNjEyMX0.5c_DvW3KlTd1p75oMDXrRZNmggFrVUbwO9Dk0fqapD4"}'::jsonb,
      body    := '{}'::jsonb
    ) AS request_id;
  $$
);

-- confirmação
SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'ia-agenda-executor';
