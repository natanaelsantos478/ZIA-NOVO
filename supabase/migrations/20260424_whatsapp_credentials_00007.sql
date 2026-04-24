-- Configura credenciais Z-API da empresa 00007 na key WhatsApp existente.
-- instanceUrl: base sem /send-text (o proxy adiciona o endpoint)
-- token: Client-Token da Z-API

DO $$
DECLARE
  v_tenant_id TEXT;
  v_key_id    TEXT;
  v_config    JSONB := '{
    "provider":    "zapi",
    "instanceUrl": "https://api.z-api.io/instances/3F1969DB5C2181E61967D6E8332D8490/token/13138C57B4A6EBC80FF93E61",
    "token":       "F453e4d3987b1440d815c4e3449b7d1d3S"
  }'::jsonb;
BEGIN
  SELECT id INTO v_tenant_id FROM public.zia_companies WHERE code = '00007' LIMIT 1;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Empresa 00007 não encontrada.';
  END IF;

  -- Tenta atualizar key WhatsApp existente
  UPDATE public.ia_api_keys
  SET integracao_config = v_config,
      permissoes = jsonb_set(
        jsonb_set(permissoes, '{whatsapp,responder_automatico}', 'true'::jsonb),
        '{whatsapp,enviar_mensagens}', 'true'::jsonb
      ),
      status     = 'ativo',
      updated_at = now()
  WHERE tenant_id      = v_tenant_id
    AND integracao_tipo = 'whatsapp'
  RETURNING id INTO v_key_id;

  -- Se não existia nenhuma key, cria
  IF v_key_id IS NULL THEN
    INSERT INTO public.ia_api_keys (
      tenant_id, nome, integracao_tipo, integracao_config, status, permissoes
    ) VALUES (
      v_tenant_id,
      'WhatsApp Principal 00007',
      'whatsapp',
      v_config,
      'ativo',
      jsonb_build_object(
        'modulos', '[]'::jsonb,
        'acoes', '{"ler":true,"criar":false,"editar":false,"deletar":false}'::jsonb,
        'webhooks', '{"receber":false,"enviar":false}'::jsonb,
        'whatsapp', jsonb_build_object(
          'ler_mensagens', true,
          'ler_todas_conversas', false,
          'numeros_bloqueados', '[]'::jsonb,
          'apenas_numeros_permitidos', '[]'::jsonb,
          'enviar_mensagens', true,
          'enviar_sem_comando', false,
          'enviar_em_massa', false,
          'responder_automatico', true,
          'mensagem_inicial', '',
          'modo_resposta_automatica', 'prompt_estilo',
          'resposta_fixa', '',
          'prompt_estilo', '',
          'modulos_autorizados', '[]'::jsonb,
          'agentes_autorizados', '[]'::jsonb
        ),
        'rate_limit', '{"requests_por_minuto":60,"requests_por_dia":10000}'::jsonb
      )
    )
    RETURNING id INTO v_key_id;
    RAISE NOTICE 'Key WhatsApp criada: %', v_key_id;
  ELSE
    RAISE NOTICE 'Key WhatsApp atualizada: %', v_key_id;
  END IF;
END $$;
