-- =============================================================================
-- MIGRATION: jessica_* — habilita RLS (leitura anon, sem escrita)
--
-- Advisor rls_disabled_in_public (ERROR): jessica_conversations / jessica_knowledge
-- estavam sem RLS. Não são referenciadas neste repo (provável uso por
-- worker/chatbot externo via anon). Decisão: manter leitura anon (caso seja base
-- de chatbot público) e bloquear escrita anon (evita poisoning).
-- service_role (backend) segue com acesso total (bypassa RLS).
-- =============================================================================

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['jessica_knowledge','jessica_conversations'] LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS "anon_read" ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS "authenticated_all" ON public.%I', t);
      EXECUTE format('CREATE POLICY "anon_read" ON public.%I FOR SELECT TO anon USING (true)', t);
      EXECUTE format('CREATE POLICY "authenticated_all" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
      EXECUTE format('REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.%I FROM anon', t);
    END IF;
  END LOOP;
END $$;
