import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type' };
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function transcribeAudioGemini(audioUrl: string, mime: string, apiKey: string): Promise<string> {
  const audioRes = await fetch(audioUrl);
  if (!audioRes.ok) throw new Error(`fetch audio ${audioRes.status}`);
  const buf = await audioRes.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  const b64 = btoa(bin);

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: 'Transcreva o áudio em português brasileiro. Retorne apenas o texto transcrito, sem introdução.' },
          { inline_data: { mime_type: mime || 'audio/ogg', data: b64 } },
        ]}],
        generationConfig: { temperature: 0.0, maxOutputTokens: 1024 },
      }),
    }
  );
  if (!res.ok) throw new Error(`gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const transcribed = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
  if (!transcribed) throw new Error('empty transcription');
  return transcribed;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ ok: false, error: 'JSON inválido' }, 400); }

  // Processar mensagens recebidas E enviadas por nós (para histórico)
  const type   = String(body.type ?? '');
  const fromMe = Boolean(body.fromMe ?? body.from_me ?? false);

  const isIncoming = type === 'ReceivedCallback' || type === 'MessageReceived';
  const isOutgoing = type === 'SentCallback' || type === 'MessageSent' || (isIncoming && fromMe);

  if (!isIncoming && !isOutgoing) return json({ ok: true, skipped: true });

  // Parsear payload Z-API
  const phone      = String(body.phone ?? body.from ?? '');
  const textRaw    = body.text ?? body.message ?? body.body ?? '';
  const textParsed = typeof textRaw === 'object'
    ? String((textRaw as Record<string, unknown>)?.message ?? (textRaw as Record<string, unknown>)?.text ?? '')
    : String(textRaw);
  const instanceId = String(body.instanceId ?? body.instance ?? '');
  const zapiMsgId  = String(body.messageId ?? body.id ?? '') || null;

  // Detectar mensagem de áudio (Z-API: campo "audio" presente com audioUrl)
  const audioPayload = body.audio as Record<string, unknown> | undefined;
  const audioUrl     = String(audioPayload?.audioUrl ?? audioPayload?.url ?? '');
  const audioMime    = String(audioPayload?.mimeType ?? 'audio/ogg');
  const isAudio      = !textParsed && !!audioUrl;

  // text será definido após a transcrição (se áudio) ou usado diretamente
  const text = textParsed;

  if (!phone || (!text && !isAudio)) return json({ ok: false, error: 'Payload incompleto' }, 400);

  // ── Mensagem enviada por nós — salvar como histórico sem acionar agente ───
  if (fromMe || isOutgoing) {
    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const { data: keys } = await sb
      .from('ia_api_keys')
      .select('id, tenant_id, integracao_config')
      .eq('integracao_tipo', 'whatsapp')
      .eq('status', 'ativo');

    const waKey = (keys ?? []).find((k: Record<string, unknown>) => {
      const cfg = k.integracao_config as Record<string, unknown>;
      return (cfg?.instanceUrl as string ?? '').includes(instanceId);
    });

    if (!waKey) return json({ ok: true, skipped: 'outgoing-no-tenant' });

    const tenantId = String(waKey.tenant_id);

    const { data: agente } = await sb
      .from('ia_agentes')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('status', 'ativo')
      .eq('integracao_tipo', 'whatsapp')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!agente) return json({ ok: true, skipped: 'outgoing-no-agent' });

    // Buscar ou criar chat
    let chatId: string | null = null;
    const { data: existing } = await sb
      .from('wa_agent_chats')
      .select('id')
      .eq('agent_id', agente.id)
      .eq('phone', phone)
      .maybeSingle();

    if (existing?.id) {
      chatId = existing.id as string;
    } else {
      const { data: novo } = await sb
        .from('wa_agent_chats')
        .insert({ agent_id: agente.id, tenant_id: tenantId, phone, titulo: phone, last_message_at: new Date().toISOString() })
        .select('id').single();
      chatId = novo?.id ?? null;
    }

    if (!chatId) return json({ ok: true, skipped: 'outgoing-no-chat' });

    // Deduplicar pelo zapi_message_id
    if (zapiMsgId) {
      const { data: dup } = await sb
        .from('wa_agent_chat_messages')
        .select('id')
        .eq('chat_id', chatId)
        .eq('zapi_message_id', zapiMsgId)
        .maybeSingle();
      if (dup) return json({ ok: true, skipped: 'outgoing-duplicate' });
    }

    await sb.from('wa_agent_chat_messages').insert({
      chat_id:         chatId,
      agent_id:        agente.id,
      tenant_id:       tenantId,
      role:            'reply',
      content:         text,
      zapi_message_id: zapiMsgId,
    });

    await sb.from('wa_agent_chats').update({ last_message_at: new Date().toISOString() }).eq('id', chatId);

    console.log('[WA] outgoing salvo | phone:', phone, '| chatId:', chatId);
    return json({ ok: true, stored: 'outgoing' });
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // ── Localizar tenant pela instância Z-API ─────────────────────────────────
  const { data: keys } = await sb
    .from('ia_api_keys')
    .select('id, tenant_id, integracao_config')
    .eq('integracao_tipo', 'whatsapp')
    .eq('status', 'ativo');

  const waKey = (keys ?? []).find((k: Record<string, unknown>) => {
    const cfg = k.integracao_config as Record<string, unknown>;
    return (cfg?.instanceUrl as string ?? '').includes(instanceId);
  });

  if (!waKey) {
    console.warn('[WA] Instância não encontrada | instanceId:', instanceId);
    return json({ ok: false, error: 'Instância não encontrada', instanceId }, 404);
  }

  const cfg      = waKey.integracao_config as Record<string, unknown>;
  const tenantId = String(waKey.tenant_id);

  // ── Localizar agente WhatsApp ativo para o tenant ─────────────────────────
  const { data: agente } = await sb
    .from('ia_agentes')
    .select('id, nome, api_code, api_provider, system_prompt')
    .eq('tenant_id', tenantId)
    .eq('status', 'ativo')
    .eq('integracao_tipo', 'whatsapp')
    .not('api_code', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!agente) {
    console.warn('[WA] Nenhum agente WhatsApp ativo | tenant:', tenantId);
    return json({ ok: true, reason: 'no-agent' });
  }

  const apiKey = Deno.env.get(agente.api_code ?? '') ?? '';
  if (!apiKey) {
    console.error('[WA] api_code sem valor em env | code:', agente.api_code, '| tenant:', tenantId);
    return json({ ok: true, reason: 'no-api-key' });
  }

  // ── Transcrever áudio com Gemini quando disponível ────────────────────────
  let finalText = text;
  if (isAudio && audioUrl && (agente.api_provider ?? 'gemini') === 'gemini') {
    try {
      finalText = await transcribeAudioGemini(audioUrl, audioMime, apiKey);
      console.log('[WA] áudio transcrito:', finalText.slice(0, 80));
    } catch (e) {
      console.error('[WA] falha na transcrição:', e);
      finalText = '[O cliente enviou um áudio. Responda pedindo gentilmente que escreva a mensagem em texto.]';
    }
  } else if (isAudio) {
    finalText = '[O cliente enviou um áudio. Responda pedindo gentilmente que escreva a mensagem em texto.]';
  }

  if (!finalText) return json({ ok: false, error: 'Mensagem sem conteúdo' }, 400);

  // ── Rotear para o agente — ele decide tudo ────────────────────────────────
  console.log('[WA] roteando | agente:', agente.nome, '| phone:', phone);

  const runnerRes = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-agent-runner`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
    body: JSON.stringify({
      phone,
      text: finalText,
      zapi_message_id: zapiMsgId,
      tenant_id:    tenantId,
      agent_id:     agente.id,
      api_key:      apiKey,
      api_provider: agente.api_provider ?? 'gemini',
      system_prompt: agente.system_prompt ?? '',
      instance_url: cfg.instanceUrl ?? '',
      zapi_token:   cfg.token ?? '',
    }),
  });

  if (!runnerRes.ok) {
    const err = await runnerRes.text().catch(() => '');
    console.error('[WA] runner HTTP', runnerRes.status, ':', err.slice(0, 200));
    return json({ ok: false, error: 'runner-failed', status: runnerRes.status }, 500);
  }

  const result = await runnerRes.json();
  return json({ ok: true, ...result });
});
