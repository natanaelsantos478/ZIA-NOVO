-- =============================================================================
-- FIX: Alinhar ID da holding 'Empresa Teste' com o UUID usado no código
--
-- PROBLEMA:
--   O perfil 00001 (Gestor Holding / Natanael) tem entity_id = '00000000-0000-0000-0000-000000000001'
--   mas a holding em zia_companies tinha id = 'holding-001'.
--   As matrizes (matrix-001, matrix-002) tinham parent_id = 'holding-001'.
--
--   O CompaniesContext.scopeIds() buscava filhos de '00000000-0000-0000-0000-000000000001'
--   → não encontrava nenhum → escopo ficava só ['00000000-0000-0000-0000-000000000001']
--   → CRM não enxergava negociações de matrix-002 nem de branch-1773149292370.
--
-- SOLUÇÃO:
--   Renomear o id da holding de 'holding-001' para '00000000-0000-0000-0000-000000000001'
--   e atualizar o parent_id das matrizes filhas correspondentemente.
--   Isso alinha o banco com o MASTER_PROFILE.entityId do código (ProfileContext.tsx).
-- =============================================================================

-- 1. Remover FK temporariamente (parent_id → id na mesma tabela)
ALTER TABLE public.zia_companies DROP CONSTRAINT IF EXISTS zia_companies_parent_id_fkey;

-- 2. Atualizar parent_id das matrizes que referenciavam 'holding-001'
UPDATE public.zia_companies
SET parent_id = '00000000-0000-0000-0000-000000000001'
WHERE parent_id = 'holding-001';

-- 3. Atualizar o ID da holding
UPDATE public.zia_companies
SET id = '00000000-0000-0000-0000-000000000001'
WHERE id = 'holding-001';

-- 4. Restaurar a FK constraint
ALTER TABLE public.zia_companies
ADD CONSTRAINT zia_companies_parent_id_fkey
FOREIGN KEY (parent_id) REFERENCES public.zia_companies(id) ON DELETE RESTRICT;
