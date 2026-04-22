// whatsapp-webhook — Recebe callbacks do Z-API, mantém histórico e responde com IA
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type' };
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
const GEMINI_PRO_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ ok: false, error: 'JSON inválido' }, 400); }

  // Só processa mensagens recebidas (ignora delivery, status, etc.)
  const type = String(body.type ?? '');
  if (type !== 'ReceivedCallback' && type !== 'MessageReceived') return json({ ok: true, skipped: true });

  const phone = String(body.phone ?? body.from ?? '');
  const textRaw = body.text ?? body.message ?? body.body ?? '';
  const text = typeof textRaw === 'object'
    ? String((textRaw as Record<string, unknown>)?.message ?? (textRaw as Record<string, unknown>)?.text ?? '')
    : String(textRaw);
  const instanceId = String(body.instanceId ?? body.instance ?? '');

  if (!phone || !text) return json({ ok: false, error: 'Payload incompleto' }, 400);

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Buscar chave WhatsApp ativa correspondente à instância
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
  if (!perms?.responder_automatico) return json({ ok: true, skipped: 'auto-reply desativado' });

  const tenantId = String(waKey.tenant_id);
  const mensagemInicial = String(perms.mensagem_inicial ?? '');
  const promptEstilo = String(perms.prompt_estilo ?? '');

  // Salvar mensagem do usuário no histórico
  await sb.from('whatsapp_conversations').insert({ tenant_id: tenantId, phone, role: 'user', message: text });

  // Verificar histórico: buscar últimas 11 mensagens (10 + a que acabou de entrar)
  const { data: historico } = await sb
    .from('whatsapp_conversations')
    .select('role, message, created_at')
    .eq('tenant_id', tenantId)
    .eq('phone', phone)
    .order('created_at', { ascending: false })
    .limit(11);

  const msgs = (historico ?? []).reverse(); // cronológico
  const isFirstMessage = msgs.filter(m => m.role === 'assistant').length === 0;

  let resposta = '';

  if (isFirstMessage) {
    // Primeira mensagem: sempre a mensagem inicial fixa
    resposta = mensagemInicial;
  } else {
    // Mensagens seguintes: Gemini com contexto das últimas 10 mensagens
    const apiKey = GEMINI_API_KEY;
    if (apiKey) {
      // System prompt: usa prompt_estilo ou deriva da mensagem inicial como persona
      const systemPrompt = promptEstilo ||
        `Você é a Ana, assistente comercial da KL Factoring. Responda de forma consultiva, cordial e focada em antecipação de recebíveis. Use o contexto da conversa para dar continuidade natural ao atendimento. Não repita a mensagem de apresentação já enviada. Mensagem de abertura usada: "${mensagemInicial}"`;

      // Histórico para o Gemini (excluindo a mensagem atual que já está no array)
      const contextMsgs = msgs.slice(-10).map((m: { role: string; message: string }) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.message }],
      }));

      try {
        const r = await fetch(`${GEMINI_PRO_URL}?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: contextMsgs,
            generationConfig: { maxOutputTokens: 1024 },
          }),
        });
        const d = await r.json();
        resposta = d?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      } catch { /* fallback */ }
    }

    if (!resposta) resposta = 'Desculpe, não consegui processar sua mensagem. Poderia repetir?';
  }

  // Salvar resposta no histórico
  await sb.from('whatsapp_conversations').insert({ tenant_id: tenantId, phone, role: 'assistant', message: resposta });

  // Enviar via whatsapp-proxy
  const cfg = waKey.integracao_config as Record<string, unknown>;
  const sendRes = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-proxy`, {
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

  const result = await sendRes.json() as Record<string, unknown>;
  return json({ ok: result.ok, phone, isFirstMessage, replied: true, zapiStatus: result.status });
});
