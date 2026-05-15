-- Fix ia_agentes tipo CHECK constraint to include ASSISTENTE and AUTOMACAO
ALTER TABLE ia_agentes DROP CONSTRAINT ia_agentes_tipo_check;
ALTER TABLE ia_agentes ADD CONSTRAINT ia_agentes_tipo_check
  CHECK (tipo IN ('ESPECIALISTA', 'MONITOR', 'ORQUESTRADOR', 'EXTERNO', 'ASSISTENTE', 'AUTOMACAO'));
