import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type, authorization' };
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

async function sendWithRetry(
  url: string,
  body: unknown,
  authHeader: string,
  maxAttempts = 3,
): Promise<{ ok: boolean; status: number }> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader },
        body: JSON.stringify(body),
      });
      if (res.ok) return { ok: true, status: res.status };
      console.warn(`[IA] proxy tentativa ${attempt}/${maxAttempts} falhou — status ${res.status}`);
      if (attempt < maxAttempts) await new Promise(r => setTimeout(r, 1500 * attempt));
      if (attempt === maxAttempts) return { ok: false, status: res.status };
    } catch (err) {
      console.error(`[IA] proxy erro tentativa ${attempt}:`, String(err));
      if (attempt < maxAttempts) await new Promise(r => setTimeout(r, 1500 * attempt));
      if (attempt === maxAttempts) return { ok: false, status: 0 };
    }
  }
  return { ok: false, status: 0 };
}

const SUPABASE_URL        = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GEMINI_API_KEY      = Deno.env.get('GEMINI_API_KEY') ?? '';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  let input: { phone: string; tenant_id: string };
  try { input = await req.json(); } catch { return json({ ok: false, error: 'JSON inválido' }, 400); }

  const { phone, tenant_id: tenantId } = input;
  if (!phone || !tenantId) return json({ ok: false, error: 'phone e tenant_id obrigatórios' }, 400);

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // ── Config do tenant (Z-API instance + permissões) ────────────────────────
  const { data: keys } = await sb
    .from('ia_api_keys')
    .select('permissoes, integracao_config')
    .eq('tenant_id', tenantId)
    .eq('integracao_tipo', 'whatsapp')
    .eq('status', 'ativo')
    .limit(1);

  const waKey = keys?.[0];
  if (!waKey) return json({ ok: false, error: 'Config do tenant não encontrada', tenantId }, 404);

  const perms = (waKey.permissoes as Record<string, unknown>)?.whatsapp as Record<string, unknown>;
  const cfg   = waKey.integracao_config as Record<string, unknown>;
  const mensagemInicial = String(perms?.mensagem_inicial ?? '');

  // ── Agente de WhatsApp fixo ───────────────────────────────────────────────
  const { data: waAgente } = await sb
    .from('ia_agentes')
    .select('id, funcao, api_code, api_provider, status')
    .eq('tenant_id', tenantId)
    .eq('slug', 'whatsapp')
    .maybeSingle();

  const promptEstilo = (waAgente?.funcao as string | null) || String(perms?.prompt_estilo ?? '');
  const agentId      = (waAgente?.id as string | null) ?? '';
  const apiProvider  = (waAgente?.api_provider as string | null) ?? 'gemini';

  // ── Resolver API key (cascata: env → tenant gemini → any gemini → api_code) ─
  let apiKey = GEMINI_API_KEY;
  if (!apiKey) {
    const { data: gRow } = await sb
      .from('ia_api_keys')
      .select('integracao_config')
      .eq('tenant_id', tenantId).eq('integracao_tipo', 'gemini').eq('status', 'ativo')
      .limit(1).maybeSingle();
    const k = (gRow?.integracao_config as Record<string, string> | null)?.api_key;
    if (k) apiKey = k;
  }
  if (!apiKey) {
    const { data: anyRow } = await sb
      .from('ia_api_keys')
      .select('integracao_config')
      .eq('integracao_tipo', 'gemini').eq('status', 'ativo')
      .limit(1).maybeSingle();
    const k = (anyRow?.integracao_config as Record<string, string> | null)?.api_key;
    if (k) apiKey = k;
  }
  // api_code do agente → nome exato do Supabase Secret (máxima prioridade)
  if (waAgente?.api_code) {
    const fromSecret = Deno.env.get(waAgente.api_code as string);
    if (fromSecret) apiKey = fromSecret;
  }

  console.log('[IA] apiKey:', apiKey ? 'found' : 'MISSING', '| provider:', apiProvider, '| phone:', phone);

  // ── Lead / negociação ─────────────────────────────────────────────────────
  const { data: negRow } = await sb
    .from('crm_negociacoes')
    .select('id, cliente_nome')
    .eq('tenant_id', tenantId)
    .eq('cliente_telefone', phone)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const negociacaoId: string | null = (negRow?.id as string) ?? null;
  const clienteNome = (negRow?.cliente_nome as string) ?? phone;

  // ── Histórico de conversa (30 mensagens) ──────────────────────────────────
  const { data: historico } = await sb
    .from('whatsapp_conversations')
    .select('role, message')
    .eq('tenant_id', tenantId)
    .eq('phone', phone)
    .order('created_at', { ascending: false })
    .limit(30);

  const history = (historico ?? []).reverse() as { role: string; message: string }[];

  // ── Arquivos disponíveis ──────────────────────────────────────────────────
  const { data: arquivosRows } = await sb
    .from('whatsapp_ia_arquivos')
    .select('nome, descricao, file_url, file_name')
    .eq('tenant_id', tenantId);
  const arquivos = (arquivosRows ?? []) as { nome: string; descricao: string | null; file_url: string; file_name: string }[];

  // ── Chamar runner (ReAct loop) ────────────────────────────────────────────
  let resposta = '';
  let transferido = false;
  let nomeDetectado: string | null = null;

  if (apiKey && agentId) {
    try {
      const runnerRes = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-agent-runner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
        body: JSON.stringify({
          phone, tenant_id: tenantId, agent_id: agentId,
          api_key: apiKey, api_provider: apiProvider,
          prompt_estilo: promptEstilo, mensagem_inicial: mensagemInicial,
          history, arquivos, negociacao_id: negociacaoId, cliente_nome: clienteNome,
        }),
      });
      const runnerData = await runnerRes.json() as {
        ok: boolean; resposta?: string; transferido?: boolean; nomeDetectado?: string | null;
      };
      if (runnerData.ok && runnerData.resposta) {
        resposta      = runnerData.resposta;
        transferido   = runnerData.transferido ?? false;
        nomeDetectado = runnerData.nomeDetectado ?? null;
      } else {
        console.error('[IA] runner retornou erro:', JSON.stringify(runnerData));
      }
    } catch (err) {
      console.error('[IA] runner fetch exception:', String(err));
    }
  } else if (!agentId) {
    console.error('[IA] agente de WhatsApp não encontrado para tenant', tenantId);
  } else {
    console.error('[IA] API key não encontrada para tenant', tenantId);
  }

  if (!resposta || resposta.length < 5) {
    resposta = 'Desculpe, não consegui processar sua mensagem. Poderia repetir?';
  }

  // ── Detectar arquivo solicitado pela IA ───────────────────────────────────
  let arquivoParaEnviar: { file_url: string; file_name: string; nome: string } | null = null;
  const arquivoMatch = resposta.match(/\[ARQUIVO:([^\]]+)\]\s*$/);
  if (arquivoMatch && arquivos.length > 0) {
    const nomeArq = arquivoMatch[1].trim();
    const found = arquivos.find(a => a.nome.toLowerCase() === nomeArq.toLowerCase());
    if (found) {
      arquivoParaEnviar = found;
      resposta = resposta.replace(arquivoMatch[0], '').trim();
    }
  }

  // ── Atualizar nome do cliente se detectado ────────────────────────────────
  if (nomeDetectado && negociacaoId && clienteNome === phone) {
    await sb.from('crm_negociacoes').update({ cliente_nome: nomeDetectado }).eq('id', negociacaoId);
  }

  // ── Salvar no histórico (texto limpo, [QUEBRA] → \n) ─────────────────────
  await sb.from('whatsapp_conversations').insert({
    tenant_id: tenantId,
    phone,
    role: 'assistant',
    message: resposta.replace(/\[QUEBRA\]/g, '\n') + (arquivoParaEnviar ? `\n[Arquivo enviado: ${arquivoParaEnviar.nome}]` : ''),
    negociacao_id: negociacaoId,
  });

  // ── Enviar mensagens (suporte a [QUEBRA]) ─────────────────────────────────
  const partes = resposta.split('[QUEBRA]').map(p => p.trim()).filter(Boolean);
  let lastResult = { ok: false, status: 0 };
  for (let i = 0; i < partes.length; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, 1200));
    lastResult = await sendWithRetry(
      `${SUPABASE_URL}/functions/v1/whatsapp-proxy`,
      { action: 'send-text', instanceUrl: cfg.instanceUrl, token: cfg.token, phone, message: partes[i] },
      `Bearer ${SUPABASE_SERVICE_KEY}`,
    );
    console.log('[IA] send-text parte', i + 1, '/', partes.length, '| ok:', lastResult.ok);
  }

  if (arquivoParaEnviar) {
    const docResult = await sendWithRetry(
      `${SUPABASE_URL}/functions/v1/whatsapp-proxy`,
      { action: 'send-document', instanceUrl: cfg.instanceUrl, token: cfg.token, phone, documentUrl: arquivoParaEnviar.file_url, fileName: arquivoParaEnviar.file_name },
      `Bearer ${SUPABASE_SERVICE_KEY}`,
    );
    console.log('[IA] arquivo enviado:', arquivoParaEnviar.nome, '| ok:', docResult.ok);
  }

  return json({
    ok: lastResult.ok,
    phone,
    tenantId,
    nomeDetectado,
    replied: true,
    transferido,
    arquivoEnviado: arquivoParaEnviar?.nome ?? null,
    zapiStatus: lastResult.status,
  });
});
