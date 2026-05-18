-- Enable RLS and add authenticated-only policy for tables missing coverage
ALTER TABLE public.ia_codigos_disponiveis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_all" ON public.ia_codigos_disponiveis
  TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.ia_gestor_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated_all" ON public.ia_gestor_sessions
  TO authenticated USING (true) WITH CHECK (true);
