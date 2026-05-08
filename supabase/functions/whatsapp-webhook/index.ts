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
      console.warn(`[WA] proxy tentativa ${attempt}/${maxAttempts} — status ${res.status}`);
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
  const fromMe = Boolean(body.fromMe ?? body.from_me ?? false);

  if (fromMe) {
    console.log('[WA] ignorando mensagem do próprio bot | phone:', phone);
    return json({ ok: true, skipped: 'from-bot-self' });
  }

  if (!phone || !text) return json({ ok: false, error: 'Payload incompleto' }, 400);

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // ── Localizar tenant pela instância Z-API ─────────────────────────────────
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
  const cfg = waKey.integracao_config as Record<string, unknown>;
  const tenantId = String(waKey.tenant_id);
  const mensagemInicial = String(perms?.mensagem_inicial ?? '');

  // ── Criar/encontrar lead no CRM ───────────────────────────────────────────
  let negociacaoId: string | null = null;
  let isNewLead = false;
  let clienteNome = phone;

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
    clienteNome = (negExistente.cliente_nome as string) ?? phone;
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
        responsavel: 'Agente WhatsApp',
      })
      .select('id')
      .single();
    if (novaNeg) {
      negociacaoId = novaNeg.id as string;
      isNewLead = true;
    }
  }

  // ── Salvar mensagem do usuário (dedup por zapi_message_id) ────────────────
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

  // ── Auto-reply desligado ──────────────────────────────────────────────────
  if (!perms?.responder_automatico) {
    console.log('[WA] auto-reply desativado | tenant:', tenantId);
    return json({ ok: true, saved: true, replied: false, isNewLead, negociacaoId });
  }

  // ── Novo lead → envia mensagem inicial (boas-vindas estática) ─────────────
  if (isNewLead && mensagemInicial) {
    await sb.from('whatsapp_conversations').insert({
      tenant_id: tenantId, phone, role: 'assistant',
      message: mensagemInicial, negociacao_id: negociacaoId,
    });
    const r = await sendWithRetry(
      `${SUPABASE_URL}/functions/v1/whatsapp-proxy`,
      { action: 'send-text', instanceUrl: cfg.instanceUrl, token: cfg.token, phone, message: mensagemInicial },
      `Bearer ${SUPABASE_SERVICE_KEY}`,
    );
    console.log('[WA] mensagem_inicial enviada | ok:', r.ok, '| phone:', phone);
    return json({ ok: r.ok, phone, isNewLead, negociacaoId, replied: true });
  }

  // ── Localizar agente WhatsApp configurado para o tenant ───────────────────
  const agentIdFromPerms = String(perms?.agent_id ?? '').trim() || null;
  let agentQuery = sb
    .from('ia_agentes')
    .select('id, nome, api_code, api_provider, system_prompt')
    .eq('tenant_id', tenantId)
    .eq('status', 'ativo')
    .not('api_code', 'is', null);

  if (agentIdFromPerms) {
    agentQuery = agentQuery.eq('id', agentIdFromPerms);
  } else {
    agentQuery = agentQuery.eq('integracao_tipo', 'whatsapp');
  }

  const { data: agentRow } = await agentQuery.order('created_at', { ascending: false }).limit(1).maybeSingle();

  if (!agentRow) {
    console.warn('[WA] Nenhum agente WhatsApp encontrado | tenant:', tenantId);
    return json({ ok: true, saved: true, replied: false, reason: 'no-agent' });
  }

  const apiKey = Deno.env.get(agentRow.api_code ?? '') ?? '';
  if (!apiKey) {
    console.error('[WA] api_code', agentRow.api_code, 'sem valor em env | tenant:', tenantId);
    return json({ ok: true, saved: true, replied: false, reason: 'no-api-key' });
  }

  // ── Carregar histórico e arquivos ─────────────────────────────────────────
  const [{ data: historico }, { data: arquivosRows }] = await Promise.all([
    sb.from('whatsapp_conversations')
      .select('role, message')
      .eq('tenant_id', tenantId)
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(20),
    sb.from('whatsapp_ia_arquivos')
      .select('nome, descricao, file_url, file_name')
      .eq('tenant_id', tenantId),
  ]);

  const history = (historico ?? []).reverse() as { role: string; message: string }[];
  const arquivos = (arquivosRows ?? []) as { nome: string; descricao: string | null; file_url: string; file_name: string }[];

  // ── Chamar agente ReAct ───────────────────────────────────────────────────
  console.log('[WA] chamando runner | agente:', agentRow.nome, '| provider:', agentRow.api_provider, '| phone:', phone);

  const runnerRes = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-agent-runner`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
    body: JSON.stringify({
      phone,
      tenant_id: tenantId,
      agent_id: agentRow.id,
      api_key: apiKey,
      api_provider: agentRow.api_provider ?? 'gemini',
      prompt_estilo: agentRow.system_prompt ?? '',
      mensagem_inicial: mensagemInicial,
      history,
      arquivos,
      negociacao_id: negociacaoId,
      cliente_nome: clienteNome,
    }),
  });

  if (!runnerRes.ok) {
    const errText = await runnerRes.text().catch(() => '');
    console.error('[WA] runner HTTP', runnerRes.status, ':', errText.slice(0, 200));
    return json({ ok: false, error: 'runner-failed', status: runnerRes.status }, 500);
  }

  const runnerData = await runnerRes.json() as {
    ok: boolean;
    resposta?: string;
    transferido?: boolean;
    nomeDetectado?: string | null;
    acoes?: unknown[];
    chatId?: string;
  };

  let resposta = String(runnerData.resposta ?? '').trim();
  const nomeDetectado = runnerData.nomeDetectado ?? null;
  const transferido = runnerData.transferido ?? false;

  if (!resposta || resposta.length < 3) {
    console.error('[WA] runner retornou resposta vazia');
    return json({ ok: true, saved: true, replied: false, reason: 'empty-response' });
  }

  // ── Dividir resposta em partes ([QUEBRA]) ─────────────────────────────────
  let partes = resposta.split('[QUEBRA]').map(s => s.trim()).filter(Boolean).slice(0, 3);
  if (partes.length === 0) partes = [resposta];

  // ── Detectar arquivo na última parte ─────────────────────────────────────
  let arquivoParaEnviar: { file_url: string; file_name: string; nome: string } | null = null;
  const lastIdx = partes.length - 1;
  const arquivoMatch = partes[lastIdx].match(/\[ARQUIVO:([^\]]+)\]\s*$/);
  if (arquivoMatch && arquivos.length > 0) {
    const nomeArq = arquivoMatch[1].trim();
    const found = arquivos.find(a => a.nome.toLowerCase() === nomeArq.toLowerCase());
    if (found) {
      arquivoParaEnviar = found;
      partes[lastIdx] = partes[lastIdx].replace(arquivoMatch[0], '').trim();
      if (!partes[lastIdx]) partes.splice(lastIdx, 1);
    }
  }

  // ── Salvar respostas no histórico ─────────────────────────────────────────
  const respostaCompleta = partes.join('\n') + (arquivoParaEnviar ? `\n[Arquivo: ${arquivoParaEnviar.nome}]` : '');
  await sb.from('whatsapp_conversations').insert({
    tenant_id: tenantId,
    phone,
    role: 'assistant',
    message: respostaCompleta,
    negociacao_id: negociacaoId,
  });

  // ── Atualizar nome do cliente se detectado ────────────────────────────────
  if (nomeDetectado && negociacaoId && clienteNome === phone) {
    await sb.from('crm_negociacoes')
      .update({ cliente_nome: nomeDetectado })
      .eq('id', negociacaoId);
  }

  // ── Enviar cada parte via Z-API ───────────────────────────────────────────
  let lastResult = { ok: false, status: 0 };
  for (const parte of partes) {
    lastResult = await sendWithRetry(
      `${SUPABASE_URL}/functions/v1/whatsapp-proxy`,
      { action: 'send-text', instanceUrl: cfg.instanceUrl, token: cfg.token, phone, message: parte },
      `Bearer ${SUPABASE_SERVICE_KEY}`,
    );
    console.log('[WA] send-text | ok:', lastResult.ok, '| parte length:', parte.length);
    if (partes.length > 1) await new Promise(r => setTimeout(r, 800));
  }

  if (arquivoParaEnviar) {
    const docResult = await sendWithRetry(
      `${SUPABASE_URL}/functions/v1/whatsapp-proxy`,
      { action: 'send-document', instanceUrl: cfg.instanceUrl, token: cfg.token, phone, documentUrl: arquivoParaEnviar.file_url, fileName: arquivoParaEnviar.file_name },
      `Bearer ${SUPABASE_SERVICE_KEY}`,
    );
    console.log('[WA] arquivo enviado:', arquivoParaEnviar.nome, '| ok:', docResult.ok);
  }

  return json({
    ok: lastResult.ok,
    phone,
    tenantId,
    agente: agentRow.nome,
    partes: partes.length,
    nomeDetectado,
    transferido,
    arquivoEnviado: arquivoParaEnviar?.nome ?? null,
  });
});
