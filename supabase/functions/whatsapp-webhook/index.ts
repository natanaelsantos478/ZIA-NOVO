// whatsapp-webhook — Recebe callbacks do Z-API e responde automaticamente via IA (Gemini)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type' };
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ ok: false, error: 'JSON inválido' }, 400); }

  // Z-API envia vários tipos de evento; só processar mensagens recebidas
  const type = String(body.type ?? '');
  if (type !== 'ReceivedCallback' && type !== 'MessageReceived') return json({ ok: true, skipped: true });

  const phone = String(body.phone ?? body.from ?? '');
  const text = String((body.message as Record<string, unknown>)?.text ?? body.text ?? body.body ?? '');
  const instanceId = String(body.instanceId ?? body.instance ?? '');

  if (!phone || !text) return json({ ok: false, error: 'Payload incompleto' }, 400);

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Buscar chave WhatsApp ativa que corresponde a esta instância Z-API
  const { data: keys } = await sb
    .from('ia_api_keys')
    .select('id, tenant_id, permissoes, integracao_config')
    .eq('integracao_tipo', 'whatsapp')
    .eq('status', 'ativo');

  const waKey = (keys ?? []).find((k: Record<string, unknown>) => {
    const cfg = k.integracao_config as Record<string, unknown>;
    return (cfg?.instanceUrl as string ?? '').includes(instanceId);
  });

  if (!waKey) return json({ ok: false, error: 'Instância não encontrada' }, 404);

  const perms = (waKey.permissoes as Record<string, unknown>)?.whatsapp as Record<string, unknown>;
  if (!perms?.responder_automatico) return json({ ok: true, skipped: 'auto-reply desativado' });

  // Gerar resposta
  let resposta = '';
  if (perms.modo_resposta_automatica === 'mensagem_fixa' && perms.resposta_fixa) {
    resposta = String(perms.resposta_fixa);
  } else if (GEMINI_API_KEY) {
    const promptEstilo = String(perms.prompt_estilo ?? '');
    const mensagemInicial = String(perms.mensagem_inicial ?? '');
    const systemPrompt = promptEstilo
      ? `Você é um assistente de WhatsApp. Responda de forma natural e cordial. Estilo: ${promptEstilo}`
      : `Você é um assistente de WhatsApp. Responda de forma natural e cordial.`;
    const userMsg = mensagemInicial && !perms._primeiraResposta
      ? `${mensagemInicial}`
      : text;

    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userMsg }] }],
          }),
        },
      );
      const d = await r.json();
      resposta = d?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    } catch { resposta = ''; }
  }

  if (!resposta) return json({ ok: true, skipped: 'sem resposta gerada' });

  // Enviar via whatsapp-proxy
  const cfg = waKey.integracao_config as Record<string, unknown>;
  const sendUrl = `${SUPABASE_URL}/functions/v1/whatsapp-proxy`;
  const sendRes = await fetch(sendUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
    body: JSON.stringify({
      action: 'send-text',
      instanceUrl: cfg.instanceUrl,
      token: cfg.token,
      phone,
      message: resposta,
    }),
  });

  const result = await sendRes.json();
  return json({ ok: result.ok, phone, replied: true });
});
