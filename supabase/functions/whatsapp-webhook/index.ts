import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type' };
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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
  const instanceId = String(body.instanceId ?? body.instance ?? '');
  const zapiMsgId  = String(body.messageId ?? body.id ?? '') || null;

  // Extrai texto digitado (pode vir junto com mídia)
  const textRaw = body.text ?? body.message ?? body.body ?? '';
  let userText = typeof textRaw === 'object'
    ? String((textRaw as Record<string, unknown>)?.message ?? (textRaw as Record<string, unknown>)?.text ?? '')
    : String(textRaw);

  // Campos de mídia estruturados para o runner
  let mediaKind:   string | undefined;
  let mediaName:   string | undefined;
  let mediaMime:   string | undefined;
  let mediaZapiUrl: string | undefined;
  let mediaTag = '';

  // ── Detecta mídia SEMPRE — independente de haver texto (caption pode vir em body.text)
  const audio = body.audio as Record<string, unknown> | undefined;
  const audioUrl = String(audio?.url ?? audio?.audioUrl ?? audio?.mediaUrl ?? '');
  if (audioUrl) {
    mediaTag = `[ÁUDIO_RECEBIDO url="${audioUrl}"]`;
  }

  if (!mediaTag) {
    const image = body.image as Record<string, unknown> | undefined;
    const imageUrl = String(image?.url ?? image?.imageUrl ?? image?.mediaUrl ?? '');
    if (imageUrl) {
      const imageMime = String(image?.mimeType ?? image?.mime ?? 'image/jpeg');
      const imageName = String(image?.fileName ?? image?.name ?? `imagem_${Date.now()}.jpg`);
      const imageCaption = String(image?.caption ?? '');
      mediaTag     = `[IMAGEM_RECEBIDA url="${imageUrl}" mime="${imageMime}"]`;
      mediaKind    = 'image';
      mediaName    = imageName;
      mediaMime    = imageMime;
      mediaZapiUrl = imageUrl;
      // caption de body.image.caption que não veio em body.text
      if (imageCaption && !userText) userText = imageCaption;
    } else if (image) {
      mediaTag = '[IMAGEM_RECEBIDA: sem URL disponível]';
    }
  }

  if (!mediaTag) {
    const video = body.video as Record<string, unknown> | undefined;
    if (video) {
      const videoCaption = String(video?.caption ?? '');
      mediaTag  = '[VÍDEO_RECEBIDO]';
      if (videoCaption && !userText) userText = videoCaption;
    }
  }

  if (!mediaTag) {
    const doc = body.document as Record<string, unknown> | undefined;
    const docUrl = String(doc?.url ?? doc?.documentUrl ?? doc?.mediaUrl ?? '');
    if (docUrl) {
      const docNome    = String(doc?.fileName ?? doc?.name ?? doc?.title ?? 'documento');
      const docMime    = String(doc?.mimeType ?? doc?.mime ?? '');
      const docCaption = String(doc?.caption ?? '');
      mediaTag     = `[DOCUMENTO_RECEBIDO url="${docUrl}" nome="${docNome}"${docMime ? ` tipo="${docMime}"` : ''}]`;
      mediaKind    = 'document';
      mediaName    = docNome;
      mediaMime    = docMime || 'application/octet-stream';
      mediaZapiUrl = docUrl;
      // caption de body.document.caption que não veio em body.text
      if (docCaption && !userText) userText = docCaption;
    } else if (doc) {
      const docNome = String(doc?.fileName ?? doc?.name ?? doc?.title ?? 'documento');
      mediaTag = `[DOCUMENTO_RECEBIDO: ${docNome} — sem URL disponível]`;
    }
  }

  // Monta texto final: tag de mídia + texto do usuário (caption ou instrução)
  let text = '';
  if (mediaTag && userText) {
    text = `${mediaTag}\n${userText}`;
  } else if (mediaTag) {
    text = mediaTag;
  } else {
    text = userText;
  }

  if (!phone || !text) return json({ ok: false, error: 'Payload incompleto' }, 400);

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

  // ── Rotear para o agente — ele decide tudo ────────────────────────────────
  console.log('[WA] roteando | agente:', agente.nome, '| phone:', phone);

  const runnerRes = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-agent-runner`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
    body: JSON.stringify({
      phone,
      text,
      zapi_message_id: zapiMsgId,
      tenant_id:    tenantId,
      agent_id:     agente.id,
      api_key:      apiKey,
      api_provider: agente.api_provider ?? 'gemini',
      system_prompt: agente.system_prompt ?? '',
      instance_url: cfg.instanceUrl ?? '',
      zapi_token:   cfg.token ?? '',
      ...(mediaKind    && { media_kind:     mediaKind    }),
      ...(mediaName    && { media_name:     mediaName    }),
      ...(mediaMime    && { media_mime:     mediaMime    }),
      ...(mediaZapiUrl && { media_zapi_url: mediaZapiUrl }),
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
