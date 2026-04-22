import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type' };
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ ok: false, error: 'JSON invalido' }, 400); }

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

  // Buscar instancia WhatsApp ativa
  const { data: keys } = await sb
    .from('ia_api_keys')
    .select('id, tenant_id, permissoes, integracao_config')
    .eq('integracao_tipo', 'whatsapp')
    .eq('status', 'ativo');

  const waKey = (keys ?? []).find((k: Record<string, unknown>) => {
    const cfg = k.integracao_config as Record<string, unknown>;
    return (cfg?.instanceUrl as string ?? '').includes(instanceId);
  });

  if (!waKey) return json({ ok: false, error: 'Instancia nao encontrada', instanceId }, 404);

  const perms = (waKey.permissoes as Record<string, unknown>)?.whatsapp as Record<string, unknown>;
  if (!perms?.responder_automatico) return json({ ok: true, skipped: 'auto-reply desativado' });

  const tenantId = String(waKey.tenant_id);
  const mensagemInicial = String(perms.mensagem_inicial ?? '');
  const promptEstilo = String(perms.prompt_estilo ?? '');

  // Chave Gemini: secret GEMINI_API_KEY ou fallback no banco
  let geminiKey = Deno.env.get('GEMINI_API_KEY') ?? '';
  if (!geminiKey) {
    const { data: row } = await sb
      .from('ia_api_keys')
      .select('integracao_config')
      .eq('tenant_id', tenantId)
      .eq('integracao_tipo', 'gemini')
      .eq('status', 'ativo')
      .limit(1)
      .maybeSingle();
    geminiKey = (row?.integracao_config as Record<string, string> | null)?.api_key ?? '';
  }

  // CRM: achar ou criar negociacao/lead
  let negociacaoId: string | null = null;
  let clienteNome = phone;
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
    clienteNome = negExistente.cliente_nome as string;
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
    if (novaNeg) { negociacaoId = novaNeg.id as string; isNewLead = true; }
  }

  // Salvar mensagem do usuario
  await sb.from('whatsapp_conversations').insert({
    tenant_id: tenantId, phone, role: 'user', message: text, negociacao_id: negociacaoId,
  });

  // Buscar historico completo (ultimas 11 para detectar se e primeira resposta)
  const { data: historico } = await sb
    .from('whatsapp_conversations')
    .select('role, message')
    .eq('tenant_id', tenantId)
    .eq('phone', phone)
    .order('created_at', { ascending: false })
    .limit(11);

  const msgs = (historico ?? []).reverse(); // ordem cronologica
  const isFirstMessage = msgs.filter(m => m.role === 'assistant').length === 0;

  let resposta = '';

  if (isFirstMessage) {
    // Primeira mensagem: sempre o texto fixo cadastrado
    resposta = mensagemInicial;
  } else if (geminiKey) {
    // Demais mensagens: Gemini com contexto das ultimas 10
    const systemPrompt = promptEstilo ||
      `Voce e a Ana, assistente comercial da KL Factoring. Responda de forma consultiva, cordial e focada em antecipacao de recebiveis. Use o historico da conversa para dar continuidade natural ao atendimento. A mensagem de abertura ja foi enviada anteriormente: "${mensagemInicial}". Nao repita a apresentacao.${clienteNome !== phone ? ` O cliente se chama ${clienteNome}.` : ' O cliente ainda nao informou o nome; quando pertinente, pergunte de forma natural.'}`;

    const contents = msgs.slice(-10).map((m: { role: string; message: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.message }],
    }));

    try {
      const r = await fetch(`${GEMINI_URL}?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { maxOutputTokens: 1024 },
        }),
      });
      const d = await r.json();
      resposta = d?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
    } catch { /* fallback abaixo */ }
  }

  if (!resposta) resposta = mensagemInicial || 'Ola! Como posso ajudar?';

  // Salvar resposta no historico
  await sb.from('whatsapp_conversations').insert({
    tenant_id: tenantId, phone, role: 'assistant', message: resposta, negociacao_id: negociacaoId,
  });

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
  return json({ ok: result.ok, phone, isFirstMessage, isNewLead, negociacaoId, replied: true });
});
