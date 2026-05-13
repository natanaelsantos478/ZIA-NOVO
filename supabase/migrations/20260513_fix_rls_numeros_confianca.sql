-- Fix RLS policy on wa_agent_numeros_confianca
-- Old policy used current_setting('app.current_tenant') which frontend never sets.
-- Correct pattern: tenant_id = auth.uid() (Supabase Auth JWT).

DROP POLICY IF EXISTS "tenant_isolation" ON wa_agent_numeros_confianca;

CREATE POLICY "tenant_isolation" ON wa_agent_numeros_confianca
  USING (tenant_id = auth.uid()::text OR auth.role() = 'service_role')
  WITH CHECK (tenant_id = auth.uid()::text OR auth.role() = 'service_role');
