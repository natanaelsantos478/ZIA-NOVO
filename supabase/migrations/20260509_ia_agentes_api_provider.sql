-- Adiciona campo api_provider em ia_agentes
-- Permite que o runner saiba qual formato de API usar para cada código cadastrado

ALTER TABLE public.ia_agentes
  ADD COLUMN IF NOT EXISTS api_provider TEXT;
