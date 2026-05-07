-- Migra prompt_estilo de ia_api_keys.permissoes->whatsapp para ia_agentes.funcao
-- Aplica apenas ao agente fixo slug='whatsapp' que ainda não tem funcao preenchida.
-- Tenants com funcao já preenchida não são afetados.

UPDATE public.ia_agentes a
SET funcao = sub.prompt
FROM (
  SELECT
    k.tenant_id::text AS tenant_id,
    k.permissoes->'whatsapp'->>'prompt_estilo' AS prompt
  FROM public.ia_api_keys k
  WHERE k.integracao_tipo = 'whatsapp'
    AND k.status                                   = 'ativo'
    AND k.permissoes->'whatsapp'->>'prompt_estilo' IS NOT NULL
    AND trim(k.permissoes->'whatsapp'->>'prompt_estilo') <> ''
) sub
WHERE a.tenant_id = sub.tenant_id
  AND a.slug      = 'whatsapp'
  AND (a.funcao IS NULL OR trim(a.funcao) = '');

-- Confirmação
SELECT a.tenant_id, a.nome, left(a.funcao, 80) AS funcao_preview
FROM public.ia_agentes a
WHERE a.slug = 'whatsapp';
