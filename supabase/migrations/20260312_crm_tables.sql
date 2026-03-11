-- =============================================================================
-- MIGRATION: CRM Tables
-- crm_negociacoes, crm_atendimentos, crm_compromissos,
-- crm_orcamentos, crm_orcamento_itens
-- Execute no SQL Editor do Supabase Dashboard
-- =============================================================================

-- ── crm_negociacoes ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crm_negociacoes (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            text        NOT NULL,
  cliente_id           uuid        REFERENCES public.erp_clientes(id),
  cliente_nome         text        NOT NULL,
  cliente_cnpj         text,
  cliente_email        text,
  cliente_telefone     text,
  cliente_endereco     text,
  descricao            text,
  status               text        NOT NULL DEFAULT 'aberta'
                                   CHECK (status IN ('aberta','ganha','perdida','suspensa')),
  etapa                text        NOT NULL DEFAULT 'prospeccao'
                                   CHECK (etapa IN ('prospeccao','qualificacao','proposta','negociacao','fechamento')),
  valor_estimado       numeric,
  probabilidade        integer     DEFAULT 50,
  responsavel          text        NOT NULL DEFAULT '',
  origem               text,
  data_fechamento_prev date,
  notas                text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_neg_tenant ON public.crm_negociacoes(tenant_id);

-- ── crm_atendimentos ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crm_atendimentos (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  negociacao_id  uuid        NOT NULL REFERENCES public.crm_negociacoes(id) ON DELETE CASCADE,
  tenant_id      text        NOT NULL,
  cliente_nome   text        NOT NULL DEFAULT '',
  data           date        NOT NULL,
  hora           text        NOT NULL DEFAULT '00:00',
  duracao        integer     NOT NULL DEFAULT 0,
  transcricao    jsonb       NOT NULL DEFAULT '[]',
  analise        jsonb,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_at_neg ON public.crm_atendimentos(negociacao_id);
CREATE INDEX IF NOT EXISTS idx_crm_at_tenant ON public.crm_atendimentos(tenant_id);

-- ── crm_compromissos ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crm_compromissos (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  negociacao_id  uuid        REFERENCES public.crm_negociacoes(id) ON DELETE SET NULL,
  tenant_id      text        NOT NULL,
  cliente_nome   text        NOT NULL DEFAULT '',
  titulo         text        NOT NULL,
  data           date        NOT NULL,
  hora           text        NOT NULL DEFAULT '09:00',
  duracao        integer     NOT NULL DEFAULT 30,
  tipo           text        NOT NULL DEFAULT 'outro'
                             CHECK (tipo IN ('reuniao','ligacao','visita','followup','outro')),
  notas          text        NOT NULL DEFAULT '',
  criado_por     text        NOT NULL DEFAULT 'usuario'
                             CHECK (criado_por IN ('usuario','ia')),
  concluido      boolean     NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_comp_neg    ON public.crm_compromissos(negociacao_id);
CREATE INDEX IF NOT EXISTS idx_crm_comp_tenant ON public.crm_compromissos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crm_comp_data   ON public.crm_compromissos(data);

-- ── crm_orcamentos ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crm_orcamentos (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  negociacao_id       uuid        NOT NULL REFERENCES public.crm_negociacoes(id) ON DELETE CASCADE,
  tenant_id           text        NOT NULL,
  status              text        NOT NULL DEFAULT 'rascunho'
                                  CHECK (status IN ('rascunho','enviado','aprovado','recusado')),
  condicao_pagamento  text        NOT NULL DEFAULT 'A combinar',
  desconto_global_pct numeric     NOT NULL DEFAULT 0,
  frete               numeric     NOT NULL DEFAULT 0,
  total               numeric     NOT NULL DEFAULT 0,
  criado_por          text        NOT NULL DEFAULT 'usuario'
                                  CHECK (criado_por IN ('usuario','ia')),
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_orc_neg    ON public.crm_orcamentos(negociacao_id);
CREATE INDEX IF NOT EXISTS idx_crm_orc_tenant ON public.crm_orcamentos(tenant_id);

-- ── crm_orcamento_itens ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crm_orcamento_itens (
  id             uuid     PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id   uuid     NOT NULL REFERENCES public.crm_orcamentos(id) ON DELETE CASCADE,
  tenant_id      text     NOT NULL,
  produto_id     uuid     REFERENCES public.erp_produtos(id),
  produto_nome   text     NOT NULL,
  codigo         text     NOT NULL DEFAULT '',
  unidade        text     NOT NULL DEFAULT 'UN',
  quantidade     numeric  NOT NULL DEFAULT 1,
  preco_unitario numeric  NOT NULL DEFAULT 0,
  desconto_pct   numeric  NOT NULL DEFAULT 0,
  total          numeric  NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_crm_orc_itens_orc ON public.crm_orcamento_itens(orcamento_id);

-- ── RLS + Grants ──────────────────────────────────────────────────────────────
ALTER TABLE public.crm_negociacoes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_atendimentos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_compromissos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_orcamentos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_orcamento_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crm_neg_all"       ON public.crm_negociacoes;
DROP POLICY IF EXISTS "crm_at_all"        ON public.crm_atendimentos;
DROP POLICY IF EXISTS "crm_comp_all"      ON public.crm_compromissos;
DROP POLICY IF EXISTS "crm_orc_all"       ON public.crm_orcamentos;
DROP POLICY IF EXISTS "crm_orc_itens_all" ON public.crm_orcamento_itens;

CREATE POLICY "crm_neg_all"       ON public.crm_negociacoes    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "crm_at_all"        ON public.crm_atendimentos   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "crm_comp_all"      ON public.crm_compromissos   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "crm_orc_all"       ON public.crm_orcamentos     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "crm_orc_itens_all" ON public.crm_orcamento_itens FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.crm_negociacoes     TO anon, authenticated, service_role;
GRANT ALL ON public.crm_atendimentos    TO anon, authenticated, service_role;
GRANT ALL ON public.crm_compromissos    TO anon, authenticated, service_role;
GRANT ALL ON public.crm_orcamentos      TO anon, authenticated, service_role;
GRANT ALL ON public.crm_orcamento_itens TO anon, authenticated, service_role;

-- ── Seed: dados de exemplo usando clientes e produtos REAIS do ERP ─────────────
DO $$
DECLARE
  v_tenant_id    text;
  v_cliente_id   uuid;
  v_cliente_nome text;
  v_cnpj         text;
  v_email        text;
  v_tel          text;
  p1_id          uuid;
  p1_nome        text;
  p1_cod         text;
  p1_un          text;
  p1_preco       numeric;
  p2_id          uuid;
  p2_nome        text;
  p2_cod         text;
  p2_un          text;
  p2_preco       numeric;
  v_neg1_id      uuid := gen_random_uuid();
  v_neg2_id      uuid := gen_random_uuid();
  v_orc_id       uuid := gen_random_uuid();
BEGIN
  -- Pega o primeiro cliente ativo do ERP
  SELECT tenant_id, id, nome, cpf_cnpj, email, telefone
    INTO v_tenant_id, v_cliente_id, v_cliente_nome, v_cnpj, v_email, v_tel
    FROM erp_clientes
   WHERE ativo = true
   ORDER BY created_at
   LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE NOTICE 'Nenhum cliente encontrado no ERP. Seed CRM ignorado.';
    RETURN;
  END IF;

  -- Pega os dois primeiros produtos ativos
  SELECT id, nome, codigo_interno, unidade_medida, preco_venda
    INTO p1_id, p1_nome, p1_cod, p1_un, p1_preco
    FROM erp_produtos
   WHERE tenant_id = v_tenant_id AND ativo = true
   ORDER BY created_at
   LIMIT 1;

  SELECT id, nome, codigo_interno, unidade_medida, preco_venda
    INTO p2_id, p2_nome, p2_cod, p2_un, p2_preco
    FROM erp_produtos
   WHERE tenant_id = v_tenant_id AND ativo = true
     AND id != p1_id
   ORDER BY created_at
   LIMIT 1;

  -- Garante que não há seed duplo
  IF EXISTS (SELECT 1 FROM crm_negociacoes WHERE tenant_id = v_tenant_id) THEN
    RAISE NOTICE 'Seed CRM já existente para tenant %. Ignorado.', v_tenant_id;
    RETURN;
  END IF;

  -- ── Negociação 1: aberta, em negociação, com orçamento ───────────────────
  INSERT INTO crm_negociacoes
    (id, tenant_id, cliente_id, cliente_nome, cliente_cnpj, cliente_email,
     cliente_telefone, descricao, status, etapa, valor_estimado, probabilidade,
     responsavel, origem, data_fechamento_prev, notas, created_at)
  VALUES
    (v_neg1_id, v_tenant_id, v_cliente_id, v_cliente_nome, v_cnpj, v_email,
     v_tel,
     'Implementação completa do sistema + treinamento da equipe',
     'aberta', 'negociacao',
     GREATEST(COALESCE(p1_preco * 3 + COALESCE(p2_preco, 0) * 2, 15000), 8000),
     72, 'Carlos Mendes', 'Indicação',
     CURRENT_DATE + 45,
     'Decisor direto. Urgência para implantação no próximo trimestre.',
     now() - interval '10 days');

  -- Orçamento para negociação 1
  INSERT INTO crm_orcamentos
    (id, tenant_id, negociacao_id, status, condicao_pagamento,
     desconto_global_pct, frete, total, criado_por, created_at)
  VALUES
    (v_orc_id, v_tenant_id, v_neg1_id, 'enviado', '30/60/90 dias',
     5, 0,
     GREATEST(COALESCE((p1_preco * 3 + COALESCE(p2_preco, 0) * 2) * 0.95, 9500), 7600),
     'ia', now() - interval '8 days');

  -- Itens do orçamento (usando produtos reais)
  IF p1_id IS NOT NULL THEN
    INSERT INTO crm_orcamento_itens
      (orcamento_id, tenant_id, produto_id, produto_nome, codigo, unidade,
       quantidade, preco_unitario, desconto_pct, total)
    VALUES
      (v_orc_id, v_tenant_id, p1_id, p1_nome, COALESCE(p1_cod,'---'),
       COALESCE(p1_un,'UN'), 3, COALESCE(p1_preco,0), 0,
       COALESCE(p1_preco,0) * 3);
  END IF;

  IF p2_id IS NOT NULL THEN
    INSERT INTO crm_orcamento_itens
      (orcamento_id, tenant_id, produto_id, produto_nome, codigo, unidade,
       quantidade, preco_unitario, desconto_pct, total)
    VALUES
      (v_orc_id, v_tenant_id, p2_id, p2_nome, COALESCE(p2_cod,'---'),
       COALESCE(p2_un,'UN'), 2, COALESCE(p2_preco,0), 10,
       COALESCE(p2_preco,0) * 2 * 0.9);
  END IF;

  -- Atendimento da negociação 1
  INSERT INTO crm_atendimentos
    (negociacao_id, tenant_id, cliente_nome, data, hora, duracao,
     transcricao, analise, created_at)
  VALUES
    (v_neg1_id, v_tenant_id, v_cliente_nome,
     CURRENT_DATE - 8, '10:30', 1847,
     '[{"ts":0,"text":"Bom dia! Quero entender melhor a solução de vocês."},
       {"ts":14,"text":"Atualmente temos muitos processos manuais e precisamos automatizar."},
       {"ts":32,"text":"Qual o prazo médio de implantação?"},
       {"ts":55,"text":"E quanto fica o custo mensal para nossa equipe de 15 pessoas?"}]'::jsonb,
     '{"perfil":"EXECUTOR","temperatura":"QUENTE","resumo":"Cliente quer automatizar processos manuais. Equipe de 15 pessoas. Foco em prazo e custo. Alto potencial de fechamento.","necessidades":["Automação de processos","Controle financeiro","Relatórios gerenciais"],"produtos_mencionados":[],"objecoes":["Prazo de implantação","Custo por usuário"],"probabilidade_fechamento":72,"sentimento":"positivo","observacoes":"Priorizar demo focada em ganhos de produtividade. Enviar proposta em até 3 dias."}'::jsonb,
     now() - interval '8 days');

  -- Compromissos da negociação 1
  INSERT INTO crm_compromissos
    (negociacao_id, tenant_id, cliente_nome, titulo, data, hora,
     duracao, tipo, notas, criado_por, concluido, created_at)
  VALUES
    (v_neg1_id, v_tenant_id, v_cliente_nome,
     'Envio da proposta comercial', CURRENT_DATE - 6, '09:00',
     20, 'followup', 'Proposta enviada por e-mail com orçamento detalhado.',
     'ia', true, now() - interval '8 days'),

    (v_neg1_id, v_tenant_id, v_cliente_nome,
     'Reunião de apresentação da proposta', CURRENT_DATE + 5, '10:00',
     90, 'reuniao', 'Apresentar proposta e tirar dúvidas técnicas da equipe.',
     'ia', false, now() - interval '7 days'),

    (v_neg1_id, v_tenant_id, v_cliente_nome,
     'Follow-up pós-reunião', CURRENT_DATE + 9, '14:00',
     20, 'ligacao', 'Verificar impressões após apresentação da proposta.',
     'ia', false, now() - interval '7 days');

  -- ── Negociação 2: aberta, proposta, sem orçamento ─────────────────────────
  INSERT INTO crm_negociacoes
    (id, tenant_id, cliente_id, cliente_nome, cliente_cnpj, cliente_email,
     cliente_telefone, descricao, status, etapa, valor_estimado, probabilidade,
     responsavel, origem, data_fechamento_prev, notas, created_at)
  VALUES
    (v_neg2_id, v_tenant_id, v_cliente_id, v_cliente_nome, v_cnpj, v_email,
     v_tel,
     'Módulo adicional + suporte estendido anual',
     'aberta', 'proposta',
     GREATEST(COALESCE(p1_preco * 2, 6000), 4000),
     45, 'Ana Lima', 'Inbound / Site',
     CURRENT_DATE + 60,
     'Cliente já usa o sistema base. Interesse em expandir funcionalidades.',
     now() - interval '5 days');

  -- Compromisso da negociação 2
  INSERT INTO crm_compromissos
    (negociacao_id, tenant_id, cliente_nome, titulo, data, hora,
     duracao, tipo, notas, criado_por, concluido, created_at)
  VALUES
    (v_neg2_id, v_tenant_id, v_cliente_nome,
     'Ligação de qualificação — módulo adicional', CURRENT_DATE + 10, '14:00',
     30, 'ligacao', 'Entender necessidades específicas para o módulo adicional.',
     'usuario', false, now() - interval '5 days');

  -- Evento livre (sem vínculo com negociação)
  INSERT INTO crm_compromissos
    (negociacao_id, tenant_id, cliente_nome, titulo, data, hora,
     duracao, tipo, notas, criado_por, concluido, created_at)
  VALUES
    (NULL, v_tenant_id, '',
     'Reunião interna — planejamento comercial', CURRENT_DATE + 2, '08:30',
     60, 'reuniao', 'Alinhamento de metas e estratégia comercial do trimestre.',
     'usuario', false, now());

  RAISE NOTICE 'Seed CRM concluído para tenant % · cliente: %', v_tenant_id, v_cliente_nome;
END;
$$;
