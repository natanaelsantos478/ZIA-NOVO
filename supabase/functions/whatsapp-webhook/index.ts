import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type' };
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

async function sendWithRetry(
  url: string,
  body: unknown,
  authHeader: string,
  maxAttempts = 3,
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader },
        body: JSON.stringify(body),
      });
      const data = await res.json() as Record<string, unknown>;
      if (res.ok) return { ok: true, status: res.status, data };
      console.warn(`[WA] proxy tentativa ${attempt}/${maxAttempts} falhou — status ${res.status}`);
      if (attempt < maxAttempts) await new Promise(r => setTimeout(r, 1500 * attempt));
      if (attempt === maxAttempts) return { ok: false, status: res.status, data };
    } catch (err) {
      console.error(`[WA] proxy erro tentativa ${attempt}:`, String(err));
      if (attempt < maxAttempts) await new Promise(r => setTimeout(r, 1500 * attempt));
      if (attempt === maxAttempts) return { ok: false, status: 0, data: { error: String(err) } };
    }
  }
  return { ok: false, status: 0, data: {} };
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ ok: false, error: 'JSON inválido' }, 400); }

  const type = String(body.type ?? '');
  if (type !== 'ReceivedCallback' && type !== 'MessageReceived') return json({ ok: true, skipped: true });

  const phone = String(body.phone ?? body.from ?? '');
  const textRaw = body.text ?? body.message ?? body.body ?? '';
  const text = typeof textRaw === 'object'
    ? String((textRaw as Record<string, unknown>)?.message ?? (textRaw as Record<string, unknown>)?.text ?? '')
    : String(textRaw);
  const instanceId = String(body.instanceId ?? body.instance ?? '');
  const zapiMsgId = String(body.messageId ?? body.id ?? '') || null;

  if (!phone || !text) return json({ ok: false, error: 'Payload incompleto' }, 400);

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: keys } = await sb
    .from('ia_api_keys')
    .select('id, tenant_id, permissoes, integracao_config')
    .eq('integracao_tipo', 'whatsapp')
    .eq('status', 'ativo');

  const waKey = (keys ?? []).find((k: Record<string, unknown>) => {
    const cfg = k.integracao_config as Record<string, unknown>;
    return (cfg?.instanceUrl as string ?? '').includes(instanceId);
  });

  if (!waKey) return json({ ok: false, error: 'Instância não encontrada', instanceId }, 404);

  const perms = (waKey.permissoes as Record<string, unknown>)?.whatsapp as Record<string, unknown>;
  const tenantId = String(waKey.tenant_id);
  const mensagemInicial = String(perms?.mensagem_inicial ?? '');

  // ── Criar/encontrar lead no CRM — sempre, independente do auto-reply ──────
  let negociacaoId: string | null = null;
  let isNewLead = false;

  const { data: negExistente } = await sb
    .from('crm_negociacoes')
    .select('id, cliente_nome')
    .eq('tenant_id', tenantId)
    .eq('cliente_telefone', phone)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (negExistente) {
    negociacaoId = negExistente.id as string;
  } else {
    const { data: novaNeg } = await sb
      .from('crm_negociacoes')
      .insert({
        tenant_id: tenantId,
        cliente_nome: phone,
        cliente_telefone: phone,
        origem: 'whatsapp',
        status: 'aberta',
        etapa: 'prospeccao',
        responsavel: 'IA WhatsApp',
      })
      .select('id')
      .single();
    if (novaNeg) {
      negociacaoId = novaNeg.id as string;
      isNewLead = true;
    }
  }

  // ── Salvar mensagem — unique constraint garante deduplicação ──────────────
  const { error: insertErr } = await sb.from('whatsapp_conversations').insert({
    tenant_id: tenantId,
    phone,
    role: 'user',
    message: text,
    negociacao_id: negociacaoId,
    zapi_message_id: zapiMsgId,
  });
  if (insertErr?.code === '23505') {
    console.log('[WA] duplicate webhook ignorado — phone:', phone, '| msgId:', zapiMsgId);
    return json({ ok: true, skipped: 'duplicate-webhook' });
  }

  // ── Se auto-reply desligado: salva e para aqui ────────────────────────────
  if (!perms?.responder_automatico) {
    console.log('[WA] auto-reply desativado — mensagem salva sem resposta | tenant:', tenantId);
    return json({ ok: true, saved: true, replied: false, isNewLead, negociacaoId });
  }

  // ── Novo lead + mensagem_inicial → envia saudação fixa sem chamar IA ──────
  const cfg = waKey.integracao_config as Record<string, unknown>;
  if (isNewLead && mensagemInicial) {
    await sb.from('whatsapp_conversations').insert({
      tenant_id: tenantId, phone, role: 'assistant',
      message: mensagemInicial, negociacao_id: negociacaoId,
    });
    const r0 = await sendWithRetry(
      `${SUPABASE_URL}/functions/v1/whatsapp-proxy`,
      { action: 'send-text', instanceUrl: cfg.instanceUrl, token: cfg.token, phone, message: mensagemInicial },
      `Bearer ${SUPABASE_SERVICE_KEY}`,
    );
    console.log('[WA] mensagem_inicial enviada para novo lead | ok:', r0.ok, '| zapiStatus:', r0.status);
    return json({ ok: r0.ok, phone, isNewLead, negociacaoId, replied: true, zapiStatus: r0.status });
  }

  // ── Enfileirar para processamento com debounce de 5s ─────────────────────
  const processAfter = new Date(Date.now() + 5000).toISOString();

  await sb.rpc('upsert_message_queue', {
    p_numero: phone,
    p_tenant_id: tenantId,
    p_process_after: processAfter,
  });

  console.log('[WA] mensagem enfileirada | phone:', phone, '| tenant:', tenantId, '| processAfter:', processAfter);
  return json({ ok: true, saved: true, queued: true, isNewLead, negociacaoId });
});
