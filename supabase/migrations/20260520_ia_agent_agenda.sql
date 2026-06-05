-- =============================================================================
-- MIGRATION: Agenda interna de agentes de IA
-- Cada agente tem sua agenda de ações futuras executadas server-side.
-- A Edge Function `ia-agenda-executor` é o motor (com Deno.cron interno).
-- =============================================================================

-- ── 1. ia_agent_agenda ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ia_agent_agenda (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id             uuid        REFERENCES public.ia_agentes(id) ON DELETE SET NULL,
  tenant_id            text        NOT NULL,
  titulo               text        NOT NULL,
  descricao            text        NOT NULL DEFAULT '',
  data_hora            timestamptz NOT NULL,
  timezone             text        NOT NULL DEFAULT 'America/Sao_Paulo',
  acao_tipo            text        NOT NULL DEFAULT 'mensagem'
                                   CHECK (acao_tipo IN ('whatsapp','lembrete','tarefa','chamar_agente','executar_prompt','outro','mensagem')),
  parametros           jsonb       NOT NULL DEFAULT '{}'::jsonb,
  status               text        NOT NULL DEFAULT 'pendente'
                                   CHECK (status IN ('pendente','executando','concluido','falhou','cancelado')),
  resultado            text        NOT NULL DEFAULT '',
  erro_detalhe         text        NOT NULL DEFAULT '',
  tentativas           integer     NOT NULL DEFAULT 0,
  max_tentativas       integer     NOT NULL DEFAULT 3,
  executando_desde     timestamptz,
  executado_em         timestamptz,
  duracao_ms           integer,
  -- vínculo CRM
  vincular_compromisso boolean     NOT NULL DEFAULT false,
  funcionario_id       uuid        REFERENCES public.employees(id) ON DELETE SET NULL,
  compromisso_id       uuid        REFERENCES public.crm_compromissos(id) ON DELETE SET NULL,
  -- auditoria
  criado_por_tipo      text        NOT NULL DEFAULT 'usuario'
                                   CHECK (criado_por_tipo IN ('usuario','agente','sistema')),
  criado_por_id        text        NOT NULL DEFAULT '',
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ia_agenda_agent    ON public.ia_agent_agenda(agent_id);
CREATE INDEX IF NOT EXISTS idx_ia_agenda_tenant   ON public.ia_agent_agenda(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ia_agenda_status   ON public.ia_agent_agenda(status);
CREATE INDEX IF NOT EXISTS idx_ia_agenda_data     ON public.ia_agent_agenda(data_hora);
CREATE INDEX IF NOT EXISTS idx_ia_agenda_pendente ON public.ia_agent_agenda(data_hora) WHERE status = 'pendente';

-- ── trigger updated_at ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ia_agenda_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ia_agenda_updated_at ON public.ia_agent_agenda;
CREATE TRIGGER ia_agenda_updated_at
  BEFORE UPDATE ON public.ia_agent_agenda
  FOR EACH ROW EXECUTE FUNCTION public.ia_agenda_set_updated_at();

-- ── 2. ALTER crm_compromissos — funcionario_id ───────────────────────────────
ALTER TABLE public.crm_compromissos
  ADD COLUMN IF NOT EXISTS funcionario_id uuid REFERENCES public.employees(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_crm_comp_func ON public.crm_compromissos(funcionario_id);

-- ── trigger de sincronização com crm_compromissos ────────────────────────────
CREATE OR REPLACE FUNCTION public.ia_agenda_sync_compromisso()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_comp_id uuid;
  v_titulo  text;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.vincular_compromisso AND NEW.funcionario_id IS NOT NULL THEN
    v_titulo := COALESCE(NEW.titulo, 'Ação agendada pelo agente');
    INSERT INTO public.crm_compromissos
      (tenant_id, titulo, data, hora, duracao, tipo, notas, criado_por, funcionario_id)
    VALUES (
      NEW.tenant_id,
      v_titulo,
      (NEW.data_hora AT TIME ZONE NEW.timezone)::date,
      to_char(NEW.data_hora AT TIME ZONE NEW.timezone, 'HH24:MI'),
      30,
      'outro',
      NEW.descricao,
      'ia',
      NEW.funcionario_id
    )
    RETURNING id INTO v_comp_id;
    NEW.compromisso_id := v_comp_id;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.compromisso_id IS NOT NULL THEN
    IF NEW.data_hora <> OLD.data_hora OR NEW.titulo <> OLD.titulo THEN
      UPDATE public.crm_compromissos SET
        data   = (NEW.data_hora AT TIME ZONE NEW.timezone)::date,
        hora   = to_char(NEW.data_hora AT TIME ZONE NEW.timezone, 'HH24:MI'),
        titulo = NEW.titulo
      WHERE id = NEW.compromisso_id;
    END IF;
    IF NEW.status = 'concluido' AND OLD.status <> 'concluido' THEN
      UPDATE public.crm_compromissos SET concluido = true WHERE id = NEW.compromisso_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ia_agenda_compromisso_sync ON public.ia_agent_agenda;
CREATE TRIGGER ia_agenda_compromisso_sync
  BEFORE INSERT OR UPDATE ON public.ia_agent_agenda
  FOR EACH ROW EXECUTE FUNCTION public.ia_agenda_sync_compromisso();

-- ── 3. reaper para itens travados ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ia_agenda_reaper()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Itens travados em executando > 5min com tentativas restantes → volta a pendente
  UPDATE public.ia_agent_agenda
  SET status = 'pendente', executando_desde = NULL
  WHERE status = 'executando'
    AND executando_desde < now() - interval '5 minutes'
    AND tentativas < max_tentativas;

  -- Itens travados sem tentativas restantes → falhou
  UPDATE public.ia_agent_agenda
  SET status = 'falhou',
      erro_detalhe = erro_detalhe || ' [max_tentativas atingido via reaper]'
  WHERE status = 'executando'
    AND executando_desde < now() - interval '5 minutes'
    AND tentativas >= max_tentativas;
END;
$$;
GRANT EXECUTE ON FUNCTION public.ia_agenda_reaper() TO service_role;

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.ia_agent_agenda ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ia_agenda_tenant" ON public.ia_agent_agenda;
CREATE POLICY "ia_agenda_tenant" ON public.ia_agent_agenda
  FOR ALL
  USING (tenant_in_scope(tenant_id))
  WITH CHECK (tenant_in_scope(tenant_id));

GRANT ALL ON public.ia_agent_agenda TO anon, authenticated, service_role;

-- ── confirmação ──────────────────────────────────────────────────────────────
SELECT
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'ia_agent_agenda';
