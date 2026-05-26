// deno-lint-ignore-file no-explicit-any
// ─────────────────────────────────────────────────────────────────────────────
// ia-card-webhook — Receptor de webhooks externos para o card conector_externo_entrada
//
// Endpoint: POST /functions/v1/ia-card-webhook/<card_id>
//
// Fluxo:
// 1. Valida card_id (UUID) e busca o card (tipo=conector_externo_entrada, ativo=true)
// 2. Busca agentes conectados ao card via ia_agent_cards
// 3. Grava payload em ia_webhook_inbox para cada agente (fan-out)
// 4. Fire-and-forget: dispara ia-agent-runner para cada agente com mensagem informativa
// 5. Retorna 200 com IDs dos itens enfileirados
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization',
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RUNNER_URL           = `${SUPABASE_URL.replace('/rest/v1', '')}/functions/v1/ia-agent-runner`;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }

  // Extrai card_id da URL: /ia-card-webhook/<card_id>
  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const cardId = parts[parts.length - 1];

  if (!cardId || !UUID_RE.test(cardId)) {
    return json({ ok: false, error: 'card_id inválido ou ausente na URL' }, 400);
  }

  if (req.method !== 'POST') {
    return json({ ok: false, error: 'Método não suportado. Use POST.' }, 405);
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    // Se não for JSON, tenta texto
    try {
      payload = await req.text();
    } catch {
      payload = null;
    }
  }

  const sourceIp = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null;

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // 1. Busca o card e valida
  const { data: card, error: cardErr } = await sb
    .from('ia_cards')
    .select('id, tipo, ativo, config, nome, tenant_id')
    .eq('id', cardId)
    .maybeSingle();

  if (cardErr || !card) {
    return json({ ok: false, error: 'Card não encontrado.' }, 404);
  }
  if (card.tipo !== 'conector_externo_entrada') {
    return json({ ok: false, error: 'Card não é do tipo conector_externo_entrada.' }, 400);
  }
  if (!card.ativo) {
    return json({ ok: false, error: 'Card desativado.' }, 403);
  }

  const tenantId: string = card.tenant_id;

  // 2. Busca agentes conectados via ia_agent_cards
  const { data: agentCards, error: acErr } = await sb
    .from('ia_agent_cards')
    .select('agente_id, ia_agentes(id, nome, api_code, api_provider, system_prompt, grau_hierarquico)')
    .eq('card_id', cardId);

  if (acErr || !agentCards || agentCards.length === 0) {
    return json({ ok: false, error: 'Nenhum agente conectado a este card.' }, 404);
  }

  const inboxIds: string[] = [];

  for (const ac of agentCards) {
    const agente = (ac as any).ia_agentes;
    if (!agente) continue;
    const agentId: string = agente.id;

    // 3. Grava no inbox
    const { data: inboxRow, error: inboxErr } = await sb
      .from('ia_webhook_inbox')
      .insert({
        tenant_id:  tenantId,
        card_id:    cardId,
        agent_id:   agentId,
        payload:    payload,
        source_ip:  sourceIp,
        status:     'pendente',
      })
      .select('id')
      .single();

    if (inboxErr || !inboxRow) {
      console.error(`[ia-card-webhook] Falha ao inserir inbox para agente ${agentId}:`, inboxErr);
      continue;
    }

    inboxIds.push(inboxRow.id as string);

    // 4. Fire-and-forget: dispara o runner do agente com mensagem informativa
    const cfg: any = card.config ?? {};
    const instructions: string = cfg.instructions ?? 'Novo webhook recebido de sistema externo.';
    const msgText = `${instructions}\n\nPayload recebido:\n${JSON.stringify(payload, null, 2)}\n\n[inbox_id: ${inboxRow.id}]`;

    // Resolve API key para o runner
    const resolvedApiKey = Deno.env.get(agente.api_code) ?? '';
    if (!resolvedApiKey) {
      console.warn(`[ia-card-webhook] API key não encontrada para secret "${agente.api_code}" — agente ${agentId}`);
    }

    // Disparo fire-and-forget (não await)
    fetch(RUNNER_URL, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({
        agent_id:   agentId,
        tenant_id:  tenantId,
        session_id: `webhook-${inboxRow.id}`,
        message:    msgText,
        api_key:    resolvedApiKey,
        api_provider: agente.api_provider ?? 'gemini',
        system_prompt: agente.system_prompt ?? '',
      }),
    }).catch(err => console.error(`[ia-card-webhook] fire-and-forget falhou para agente ${agentId}:`, String(err)));
  }

  return json({
    ok:        true,
    inbox_ids: inboxIds,
    agentes:   agentCards.length,
    card_id:   cardId,
  });
});
