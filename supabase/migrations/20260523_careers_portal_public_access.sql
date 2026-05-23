-- =============================================================================
-- MIGRATION: portal público /vagas — religa acesso anônimo controlado
--
-- A RLS Fase 1 trancou `vacancies`/`candidates` em `TO authenticated`, o que
-- quebrou o portal público /vagas (anon lia 0). Esta migration religa o acesso
-- anônimo de forma SEGURA:
--   • vacancies: anon SELECT apenas de vagas ABERTAS (mantém authenticated_rw
--     para o ATS interno gerenciar tudo).
--   • candidates: anon só INSERT (candidatar-se a vaga aberta) — NÃO lê/edita
--     candidaturas (LGPD: um candidato não vê os dados de outro).
--
-- Espelha o que foi aplicado ao banco vivo (23/05/2026).
-- =============================================================================

-- vacancies: leitura pública só de vagas abertas
DROP POLICY IF EXISTS "vacancies_public_read" ON public.vacancies;
CREATE POLICY "vacancies_public_read" ON public.vacancies
  FOR SELECT TO anon
  USING (lower(coalesce(status,'')) IN ('active','aberta','published','publicada','open'));

-- candidates: anon só pode INSERIR candidatura para vaga aberta existente
DROP POLICY IF EXISTS "candidates_public_insert" ON public.candidates;
CREATE POLICY "candidates_public_insert" ON public.candidates
  FOR INSERT TO anon
  WITH CHECK (
    vacancy_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.vacancies v
      WHERE v.id = vacancy_id
        AND lower(coalesce(v.status,'')) IN ('active','aberta','published','publicada','open')
    )
  );

-- anon não lê/edita candidaturas — só insere
REVOKE SELECT, UPDATE, DELETE, TRUNCATE ON public.candidates FROM anon;
