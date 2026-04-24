-- Garante que a key WhatsApp ativa da empresa 00007 tenha responder_automatico = true.
-- Executar após a migration 20260424_ia_galeria_e_prompt_jessica.sql.

DO $$
DECLARE
  v_tenant_id TEXT;
  v_count     INT;
BEGIN
  SELECT id INTO v_tenant_id FROM public.zia_companies WHERE code = '00007' LIMIT 1;
  IF v_tenant_id IS NULL THEN
    RAISE NOTICE 'Empresa 00007 não encontrada — migration ignorada.';
    RETURN;
  END IF;

  UPDATE public.ia_api_keys
  SET permissoes = jsonb_set(permissoes, '{whatsapp,responder_automatico}', 'true'::jsonb),
      updated_at = now()
  WHERE tenant_id = v_tenant_id
    AND integracao_tipo = 'whatsapp'
    AND status = 'ativo';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count = 0 THEN
    RAISE NOTICE 'Nenhuma key WhatsApp ativa para 00007. Crie a integração em Configurações → Integrações e aplique esta migration novamente.';
  ELSE
    RAISE NOTICE 'responder_automatico = true aplicado em % key(s) WhatsApp da empresa 00007.', v_count;
  END IF;
END $$;
