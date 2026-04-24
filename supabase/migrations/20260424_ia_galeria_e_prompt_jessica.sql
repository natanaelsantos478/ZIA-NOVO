-- =============================================================================
-- Galeria de arquivos da IA + Prompt Jessica (empresa 00007)
-- =============================================================================

-- ── 1. Tabela ia_galeria_arquivos ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ia_galeria_arquivos (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    TEXT        NOT NULL,
  nome         TEXT        NOT NULL,
  descricao    TEXT,
  storage_path TEXT        NOT NULL,
  mime_type    TEXT        NOT NULL DEFAULT 'application/pdf',
  tamanho_bytes BIGINT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ia_galeria_tenant_idx ON public.ia_galeria_arquivos (tenant_id);

ALTER TABLE public.ia_galeria_arquivos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "galeria_tenant_all" ON public.ia_galeria_arquivos
  FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.ia_galeria_arquivos TO anon, authenticated, service_role;

-- ── 2. Prompt da Jessica — empresa 00007 ────────────────────────────────────
-- Atualiza prompt_estilo na API key WhatsApp ativa da empresa com code '00007'.
-- Se não existir key ainda, cria uma (sem credenciais Z-API — preencher depois).
DO $$
DECLARE
  v_tenant_id TEXT;
  v_key_id    TEXT;
  v_prompt    TEXT := 'Você é a Jessica, consultora comercial da ZITA Soluções em Software e SaaS. '
    'A ZITA é especializada em automatização de processos e implementação de Escritórios de IA em empresas brasileiras. '
    'A ZITA está lançando uma plataforma completa (ERP + CRM + RH + automações com IA) em modelo SaaS no dia 26/05 de 2026. '
    'Estamos buscando empresas para serem parceiras beta testers: testar o software, sugerir melhorias e opções personalizadas. '
    'Como a plataforma está em desenvolvimento, TODAS as melhorias sugeridas pelos clientes beta serão implementadas. '
    'Seja consultiva, profissional e cordial. Respostas curtas. Nunca use emojis. '
    'Se o cliente informar o nome, use-o naturalmente na conversa. '
    'COMPORTAMENTO ao receber mensagem INBOUND (cliente entrou em contato): '
    'Pergunte se ele tem interesse em saber mais sobre a proposta da ZITA (plataforma SaaS + parceria beta) ou se precisa de assistência com algum processo da empresa, pois você também atua como assistente comercial. '
    'COMPORTAMENTO em PROSPECÇÃO ATIVA (você mandou primeiro): '
    'Apresente-se brevemente, mencione que identificou a empresa como potencial parceira e pergunte se pode falar sobre uma oportunidade de parceria. '
    'Caso o cliente demonstre interesse, explique o modelo beta tester e ofereça enviar uma apresentação completa da empresa. '
    'O cliente tem direito a: testes gratuitos durante o período beta, personalizações específicas para o segmento dele, e influência direta no roadmap do produto.';
BEGIN
  SELECT id INTO v_tenant_id FROM public.zia_companies WHERE code = '00007' LIMIT 1;
  IF v_tenant_id IS NULL THEN
    RAISE NOTICE 'Empresa com code 00007 não encontrada — prompt não aplicado.';
    RETURN;
  END IF;

  -- Tenta atualizar key existente
  UPDATE public.ia_api_keys
  SET permissoes = jsonb_set(
        jsonb_set(permissoes, '{whatsapp,prompt_estilo}', to_jsonb(v_prompt)),
        '{whatsapp,responder_automatico}', 'true'::jsonb
      ),
      updated_at = now()
  WHERE tenant_id = v_tenant_id
    AND integracao_tipo = 'whatsapp'
    AND status = 'ativo'
  RETURNING id INTO v_key_id;

  IF v_key_id IS NULL THEN
    RAISE NOTICE 'Nenhuma key WhatsApp ativa encontrada para 00007 — crie a integração em Configurações e o prompt será aplicado na próxima migration ou pelo modal.';
  ELSE
    RAISE NOTICE 'Prompt da Jessica aplicado na key % da empresa 00007.', v_key_id;
  END IF;
END $$;
