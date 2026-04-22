// whatsapp-webhook — Recebe callbacks do Z-API, mantém histórico, cria lead no CRM e responde com IA
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

  // ── CRM: localizar ou criar negociação/lead para este número ─────────────
  let negociacaoId: string | null = null;
  let clienteNome: string = phone;
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
    const nomeInicial = phone;
    const origem = 'whatsapp';

    const negociacaoData: Record<string, unknown> = {
      tenant_id: tenantId,
      cliente_nome: nomeInicial,
      cliente_telefone: phone,
      origem,
      status: 'aberta',
      etapa: 'prospeccao',
      responsavel: 'IA WhatsApp',
    };

    const { data: novaNeg } = await sb
      .from('crm_negociacoes')
      .insert(negociacaoData)
      .select('id')
      .single();

    if (novaNeg) {
      negociacaoId = novaNeg.id as string;
      clienteNome = nomeInicial;
      isNewLead = true;
    }
  }

  // Salvar mensagem do usuário no histórico (vinculada ao lead)
  await sb.from('whatsapp_conversations').insert({
    tenant_id: tenantId,
    phone,
    role: 'user',
    message: text,
    negociacao_id: negociacaoId,
  });

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
  let nomeDetectado: string | null = null;

  {
    const apiKey = GEMINI_API_KEY;
    if (apiKey) {
      const nomeDesconhecido = clienteNome === phone;

      const aberturaInstrucao = mensagemInicial
        ? `Se for a primeira mensagem da conversa ou o cliente ainda não tiver sido saudado, use preferencialmente esta mensagem de abertura (adaptando se necessário): "${mensagemInicial}".`
        : '';

      const systemPrompt = promptEstilo ||
        `Você é a Ana, assistente comercial da KL Factoring. Responda de forma consultiva, cordial e focada em antecipação de recebíveis. Use o contexto da conversa para dar continuidade natural ao atendimento. ${aberturaInstrucao}${nomeDesconhecido ? ' O cliente ainda não informou o nome. Quando pertinente, pergunte o nome dele de forma natural.' : ` O cliente se chama ${clienteNome}.`}

Responda SEMPRE em JSON válido com exatamente dois campos:
{
  "resposta": "<texto da resposta para o cliente>",
  "nome_detectado": "<nome do cliente se ele informou nesta mensagem, ou null>"
}`;

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
            generationConfig: {
              maxOutputTokens: 1024,
              responseMimeType: 'application/json',
            },
          }),
        });
        const d = await r.json();
        const raw = d?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        try {
          const parsed = JSON.parse(raw);
          resposta = parsed.resposta ?? '';
          nomeDetectado = parsed.nome_detectado ?? null;
        } catch {
          resposta = raw;
        }
      } catch { /* fallback abaixo */ }
    }

    if (!resposta) resposta = 'Desculpe, não consegui processar sua mensagem. Poderia repetir?';
  }

  // Atualizar nome do cliente no CRM se detectado e ainda desconhecido
  if (nomeDetectado && negociacaoId && clienteNome === phone) {
    await sb
      .from('crm_negociacoes')
      .update({ cliente_nome: nomeDetectado })
      .eq('id', negociacaoId);
  }

  // Salvar resposta no histórico (vinculada ao lead)
  await sb.from('whatsapp_conversations').insert({
    tenant_id: tenantId,
    phone,
    role: 'assistant',
    message: resposta,
    negociacao_id: negociacaoId,
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
  return json({
    ok: result.ok,
    phone,
    isFirstMessage,
    isNewLead,
    negociacaoId,
    nomeDetectado,
    replied: true,
    zapiStatus: result.status,
  });
});
