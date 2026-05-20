// deno-lint-ignore-file no-explicit-any
// =============================================================================
// ia-agenda-executor — motor de execução da agenda dos agentes de IA.
// Roda automaticamente via Deno.cron a cada minuto. Também pode ser invocado
// por HTTP POST para testes.
// =============================================================================
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization',
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

interface AgendaItem {
  id:                   string;
  agent_id:             string | null;
  tenant_id:            string;
  titulo:               string;
  descricao:            string;
  data_hora:            string;
  acao_tipo:            string;
  parametros:           Record<string, unknown>;
  tentativas:           number;
  max_tentativas:       number;
}

async function executarPendentes(): Promise<{ processados: number; erros: number; reaper_ok: boolean }> {
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  let processados = 0;
  let erros       = 0;

  // 1. Reaper — libera itens travados em 'executando' há mais de 5 min
  let reaperOk = true;
  try {
    const { error } = await (sb as any).rpc('ia_agenda_reaper');
    if (error) { reaperOk = false; console.error('[ia-agenda-executor] reaper rpc erro:', error.message); }
  } catch (e) {
    reaperOk = false;
    console.error('[ia-agenda-executor] reaper exceção:', String(e));
  }

  // 2. Busca até 10 itens vencidos
  const { data: itens, error: selErr } = await sb
    .from('ia_agent_agenda')
    .select('id, agent_id, tenant_id, titulo, descricao, data_hora, acao_tipo, parametros, tentativas, max_tentativas')
    .eq('status', 'pendente')
    .lte('data_hora', new Date().toISOString())
    .order('data_hora', { ascending: true })
    .limit(10);

  if (selErr) {
    console.error('[ia-agenda-executor] select erro:', selErr.message);
    return { processados, erros: erros + 1, reaper_ok: reaperOk };
  }

  for (const item of (itens ?? []) as AgendaItem[]) {
    // Optimistic lock — só pega se ainda está pendente
    const { data: locked, error: lockErr } = await sb
      .from('ia_agent_agenda')
      .update({
        status:           'executando',
        executando_desde: new Date().toISOString(),
        tentativas:       (item.tentativas ?? 0) + 1,
      })
      .eq('id', item.id)
      .eq('status', 'pendente')
      .select('id')
      .maybeSingle();

    if (lockErr || !locked) continue;

    const inicio = Date.now();
    try {
      if (!item.agent_id) {
        throw new Error('agent_id nulo — agente foi removido');
      }

      // Carrega agente
      const { data: agente } = await sb
        .from('ia_agentes')
        .select('id, nome, tenant_id, status, api_code, api_provider, system_prompt, integracao_config')
        .eq('id', item.agent_id)
        .maybeSingle() as any;

      if (!agente)                              throw new Error(`Agente não encontrado: ${item.agent_id}`);
      if (agente.tenant_id !== item.tenant_id)  throw new Error(`Tenant mismatch: agente.tenant=${agente.tenant_id} item.tenant=${item.tenant_id}`);
      if (agente.status !== 'ativo')            throw new Error(`Agente inativo (status=${agente.status})`);

      let resultado = '';

      switch (item.acao_tipo) {
        case 'whatsapp': {
          const p = (item.parametros ?? {}) as any;
          const phone    = p.phone;
          const mensagem = p.mensagem;
          if (!phone || !mensagem) throw new Error('parametros.phone e parametros.mensagem obrigatórios para acao_tipo=whatsapp');
          const cfg = (agente.integracao_config as any) ?? {};
          const res = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-proxy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
            body: JSON.stringify({
              action:      'send-text',
              instanceUrl: cfg.instanceUrl ?? '',
              token:       cfg.token       ?? '',
              phone,
              message:     mensagem,
            }),
          });
          resultado = res.ok ? `Mensagem enviada para ${phone}` : `Falha HTTP ${res.status}`;
          break;
        }

        case 'chamar_agente': {
          const p = (item.parametros ?? {}) as any;
          const destino = p.agent_id_destino;
          const msg     = p.mensagem ?? item.titulo;
          if (!destino) throw new Error('parametros.agent_id_destino obrigatório para acao_tipo=chamar_agente');
          const res = await fetch(`${SUPABASE_URL}/functions/v1/ia-agent-runner`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
            body: JSON.stringify({
              agent_id:   destino,
              tenant_id:  item.tenant_id,
              session_id: `agenda_${item.id}`,
              message:    msg,
            }),
          });
          const d = await res.json() as any;
          resultado = d.response ?? d.error ?? `HTTP ${res.status}`;
          break;
        }

        case 'executar_prompt':
        case 'tarefa':
        case 'lembrete':
        case 'mensagem':
        case 'outro':
        default: {
          // Dispara para o próprio agente via ia-agent-runner
          const p = (item.parametros ?? {}) as any;
          const promptText = p.prompt ?? item.descricao ?? item.titulo;
          const res = await fetch(`${SUPABASE_URL}/functions/v1/ia-agent-runner`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
            body: JSON.stringify({
              agent_id:   item.agent_id,
              tenant_id:  item.tenant_id,
              session_id: `agenda_${item.id}`,
              message:    `[AÇÃO AGENDADA — ${item.acao_tipo}] ${promptText}`,
            }),
          });
          const d = await res.json() as any;
          resultado = d.response ?? d.error ?? `HTTP ${res.status} (${item.acao_tipo})`;
          break;
        }
      }

      await sb.from('ia_agent_agenda').update({
        status:           'concluido',
        resultado,
        executado_em:     new Date().toISOString(),
        duracao_ms:       Date.now() - inicio,
        executando_desde: null,
      }).eq('id', item.id);

      processados++;
    } catch (e) {
      erros++;
      const msg = String(e?.message ?? e);
      const novasTentativas = (item.tentativas ?? 0) + 1;
      const esgotado = novasTentativas >= (item.max_tentativas ?? 3);
      await sb.from('ia_agent_agenda').update({
        status:           esgotado ? 'falhou' : 'pendente',
        erro_detalhe:     msg.slice(0, 1000),
        executando_desde: null,
        resultado:        `Falha na tentativa ${novasTentativas}: ${msg.slice(0, 200)}`,
      }).eq('id', item.id);
      console.error(`[ia-agenda-executor] falha item ${item.id}:`, msg);
    }
  }

  return { processados, erros, reaper_ok: reaperOk };
}

// ── Schedule automático: a cada minuto ───────────────────────────────────────
try {
  // Deno.cron só existe no runtime Supabase em produção; em local dev pode lançar.
  (Deno as any).cron?.('ia-agenda-executor', '* * * * *', async () => {
    const r = await executarPendentes();
    console.log(`[ia-agenda-executor] cron tick | processados=${r.processados} erros=${r.erros} reaper=${r.reaper_ok}`);
  });
} catch (e) {
  console.warn('[ia-agenda-executor] Deno.cron não disponível neste runtime:', String(e));
}

// ── HTTP handler — health check e invocação manual ───────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const r = await executarPendentes();
    return json({ ok: true, ...r });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
});
