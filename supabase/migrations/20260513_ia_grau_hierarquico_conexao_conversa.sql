-- Adiciona grau_hierarquico aos agentes (1=operacional … 10=diretivo)
ALTER TABLE ia_agentes ADD COLUMN IF NOT EXISTS grau_hierarquico INTEGER DEFAULT 5;
ALTER TABLE ia_agentes DROP CONSTRAINT IF EXISTS ia_agentes_grau_check;
ALTER TABLE ia_agentes ADD CONSTRAINT ia_agentes_grau_check CHECK (grau_hierarquico BETWEEN 1 AND 10);

-- Migra tipo de conexão: consulta/permissão → conversa
UPDATE ia_agent_conexoes SET tipo = 'conversa' WHERE tipo IN ('consulta','permissao','permissão');
ALTER TABLE ia_agent_conexoes DROP CONSTRAINT IF EXISTS ia_agent_conexoes_tipo_check;
ALTER TABLE ia_agent_conexoes ADD CONSTRAINT ia_agent_conexoes_tipo_check CHECK (tipo = 'conversa');
ALTER TABLE ia_agent_conexoes ALTER COLUMN tipo SET DEFAULT 'conversa';
