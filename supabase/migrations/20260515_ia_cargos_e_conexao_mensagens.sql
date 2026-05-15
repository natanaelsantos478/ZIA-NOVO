-- 1. Migra tipos antigos para o novo modelo de cargos hierárquicos
UPDATE ia_agentes SET tipo = 'FUNCIONARIO' WHERE tipo IN ('ESPECIALISTA', 'MONITOR', 'EXTERNO', 'ASSISTENTE', 'AUTOMACAO');
UPDATE ia_agentes SET tipo = 'GERENTE'     WHERE tipo = 'ORQUESTRADOR';

-- 2. Troca o CHECK constraint pelo novo modelo de cargos
ALTER TABLE ia_agentes DROP CONSTRAINT IF EXISTS ia_agentes_tipo_check;
ALTER TABLE ia_agentes ADD CONSTRAINT ia_agentes_tipo_check
  CHECK (tipo IN ('DIRETOR', 'GERENTE', 'COORDENADOR', 'FUNCIONARIO'));

-- 3. Cria tabela de mensagens das conexões (chat na cordinha entre agentes)
CREATE TABLE IF NOT EXISTS public.ia_conexao_mensagens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conexao_id  UUID        NOT NULL REFERENCES public.ia_agent_conexoes(id) ON DELETE CASCADE,
  tenant_id   TEXT        NOT NULL,
  role        TEXT        NOT NULL CHECK (role IN ('origem', 'destino', 'system')),
  content     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ia_conexao_mensagens_conexao ON public.ia_conexao_mensagens(conexao_id);
CREATE INDEX IF NOT EXISTS idx_ia_conexao_mensagens_tenant  ON public.ia_conexao_mensagens(tenant_id);

-- 4. RLS e grant
ALTER TABLE public.ia_conexao_mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_ia_conexao_mensagens"
  ON public.ia_conexao_mensagens
  USING (tenant_id = ANY(string_to_array(current_setting('app.tenant_ids', true), ',')));

GRANT ALL ON public.ia_conexao_mensagens TO authenticated, service_role;
