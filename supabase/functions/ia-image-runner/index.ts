// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type, authorization' };
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Gemini Imagen endpoint
const IMAGEN_URL = 'https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-fast-generate-001:predict';

// OpenAI endpoints
const OPENAI_GENERATE_URL = 'https://api.openai.com/v1/images/generations';
const OPENAI_EDIT_URL     = 'https://api.openai.com/v1/images/edits';

interface ImageRunnerInput {
  agent_id:        string;
  tenant_id:       string;
  session_id:      string;  // ID do wa_agent_chats
  prompt:          string;
  imagem_base_url?: string;
  provider:        'gemini' | 'openai';
  api_code:        string;  // nome do Supabase secret
  proporcao?:      '16:9' | '4:3' | '1:1' | '3:4' | '9:16';
  escala?:         1 | 2 | 3 | 4;
  acao?:           'gerar' | 'editar' | 'salvar_ged';
  // para salvar_ged:
  imagem_url?:     string;
  nome_ged?:       string;
}

// Mapa de proporção para tamanho OpenAI
const PROPORCAO_TO_OPENAI_SIZE: Record<string, string> = {
  '16:9': '1792x1024',
  '4:3':  '1024x768',
  '1:1':  '1024x1024',
  '3:4':  '768x1024',
  '9:16': '1024x1792',
};

// Mapa de proporção para aspectRatio Gemini (formato "W:H")
const PROPORCAO_TO_GEMINI_AR: Record<string, string> = {
  '16:9': '16:9',
  '4:3':  '4:3',
  '1:1':  '1:1',
  '3:4':  '3:4',
  '9:16': '9:16',
};

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function uploadToStorage(
  sb: ReturnType<typeof createClient>,
  tenantId: string,
  agentId: string,
  imageBytes: Uint8Array,
  mimeType = 'image/png',
): Promise<string> {
  const ext  = mimeType.split('/')[1] ?? 'png';
  const path = `${tenantId}/ia/${agentId}/${Date.now()}.${ext}`;
  const { error } = await sb.storage.from('ged-imagens').upload(path, imageBytes, {
    contentType: mimeType,
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return path;
}

async function getSignedUrl(sb: ReturnType<typeof createClient>, path: string): Promise<string> {
  const { data, error } = await sb.storage.from('ged-imagens').createSignedUrl(path, 3600);
  if (error) throw new Error(`SignedUrl failed: ${error.message}`);
  return data.signedUrl;
}

async function gerarComGemini(
  apiKey: string,
  prompt: string,
  proporcao: string,
): Promise<{ bytes: Uint8Array; mime: string }> {
  const ar = PROPORCAO_TO_GEMINI_AR[proporcao] ?? '1:1';
  const res = await fetch(`${IMAGEN_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1, aspectRatio: ar },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini Imagen error ${res.status}: ${err}`);
  }
  const data: any = await res.json();
  const b64 = data?.predictions?.[0]?.bytesBase64Encoded;
  if (!b64) throw new Error('Gemini Imagen: resposta sem imagem');
  const mime = data?.predictions?.[0]?.mimeType ?? 'image/png';
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { bytes, mime };
}

async function gerarComOpenAI(
  apiKey: string,
  prompt: string,
  proporcao: string,
  escala: number,
  imagemBaseUrl?: string,
): Promise<{ bytes: Uint8Array; mime: string }> {
  const size    = PROPORCAO_TO_OPENAI_SIZE[proporcao] ?? '1024x1024';
  const quality = escala >= 3 ? 'high' : escala === 2 ? 'medium' : 'low';

  let b64: string;

  if (imagemBaseUrl) {
    // Edição: baixa imagem base e chama /images/edits
    const imgResp = await fetch(imagemBaseUrl);
    if (!imgResp.ok) throw new Error('Não foi possível baixar a imagem base');
    const imgBytes = new Uint8Array(await imgResp.arrayBuffer());
    const imgB64   = toBase64(imgBytes);

    const editRes = await fetch(OPENAI_EDIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model:           'gpt-image-1',
        prompt,
        image:           `data:image/png;base64,${imgB64}`,
        n:               1,
        size,
        response_format: 'b64_json',
      }),
    });
    if (!editRes.ok) {
      const err = await editRes.text();
      throw new Error(`OpenAI Images Edit error ${editRes.status}: ${err}`);
    }
    const editData: any = await editRes.json();
    b64 = editData?.data?.[0]?.b64_json;
  } else {
    // Geração direta
    const genRes = await fetch(OPENAI_GENERATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model:           'gpt-image-1',
        prompt,
        n:               1,
        size,
        quality,
        response_format: 'b64_json',
      }),
    });
    if (!genRes.ok) {
      const err = await genRes.text();
      throw new Error(`OpenAI Images error ${genRes.status}: ${err}`);
    }
    const genData: any = await genRes.json();
    b64 = genData?.data?.[0]?.b64_json;
  }

  if (!b64) throw new Error('OpenAI: resposta sem imagem');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return { bytes, mime: 'image/png' };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  let body: ImageRunnerInput;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: 'JSON inválido' }, 400);
  }

  const {
    agent_id, tenant_id, session_id, prompt,
    imagem_base_url, provider, api_code,
    proporcao = '1:1', escala = 1,
    acao = 'gerar', imagem_url, nome_ged,
  } = body;

  if (!agent_id || !tenant_id || !session_id || !provider || !api_code) {
    return json({ ok: false, error: 'agent_id, tenant_id, session_id, provider e api_code são obrigatórios' }, 400);
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Resolve a API key do secret do Supabase
  const apiKey = Deno.env.get(api_code) ?? '';
  if (!apiKey) {
    return json({ ok: false, error: `Secret "${api_code}" não encontrado. Configure nas Edge Functions Secrets.` }, 400);
  }

  try {
    // ── AÇÃO: salvar_ged ─────────────────────────────────────────────────────
    if (acao === 'salvar_ged') {
      if (!imagem_url) return json({ ok: false, error: 'imagem_url obrigatório para salvar_ged' }, 400);

      // Baixa imagem da URL
      const imgResp = await fetch(imagem_url);
      if (!imgResp.ok) return json({ ok: false, error: 'Não foi possível baixar a imagem' }, 400);
      const imgBytes = new Uint8Array(await imgResp.arrayBuffer());
      const mime     = imgResp.headers.get('content-type')?.split(';')[0] ?? 'image/png';

      const storagePath = await uploadToStorage(sb, tenant_id, agent_id, imgBytes, mime);
      const signedUrl   = await getSignedUrl(sb, storagePath);

      const { data: gedRow, error: gedErr } = await sb.from('ged_imagens').insert({
        tenant_id,
        nome:         nome_ged ?? `imagem_ia_${Date.now()}`,
        tipo:         'ia_gerada',
        storage_path: storagePath,
        prompt:       prompt ?? null,
        modelo:       provider,
        agente_id:    agent_id,
        mime_type:    mime,
        file_size:    imgBytes.length,
      }).select('id').single();

      if (gedErr) console.warn('[ia-image-runner] ged_imagens insert warning:', gedErr.message);

      return json({ ok: true, ged_imagem_id: gedRow?.id ?? null, storage_path: storagePath, signed_url: signedUrl });
    }

    // ── AÇÃO: gerar / editar ─────────────────────────────────────────────────
    if (!prompt) return json({ ok: false, error: 'prompt obrigatório para gerar/editar' }, 400);

    let imageBytes: Uint8Array;
    let imageMime:  string;

    if (provider === 'gemini') {
      ({ bytes: imageBytes, mime: imageMime } = await gerarComGemini(apiKey, prompt, proporcao));
    } else {
      ({ bytes: imageBytes, mime: imageMime } = await gerarComOpenAI(apiKey, prompt, proporcao, escala, imagem_base_url));
    }

    // Upload para storage
    const storagePath = await uploadToStorage(sb, tenant_id, agent_id, imageBytes, imageMime);
    const signedUrl   = await getSignedUrl(sb, storagePath);

    // Busca ou cria chat de imagens para a sessão
    let chatId = session_id;
    if (session_id.startsWith('img_')) {
      // session_id já é o ID do wa_agent_chats — usa direto
      chatId = session_id;
    }

    // Salva mensagem no chat com role='image_gen'
    const { data: msgRow, error: msgErr } = await sb.from('wa_agent_chat_messages').insert({
      chat_id:         chatId,
      agent_id,
      tenant_id,
      role:            'image_gen',
      content:         prompt,
      media_url:       signedUrl,
      media_type:      imageMime,
      imagem_prompt:   prompt,
      imagem_base_url: imagem_base_url ?? null,
    }).select('id').single();

    if (msgErr) console.warn('[ia-image-runner] chat_messages insert warning:', msgErr.message);

    // Atualiza last_message_at do chat
    await sb.from('wa_agent_chats')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', chatId);

    // INSERT automático em ged_imagens (pasta ia_gerada)
    const { data: gedRow } = await sb.from('ged_imagens').insert({
      tenant_id,
      nome:            `${prompt.slice(0, 60)}…`.replace(/…$/, prompt.length <= 60 ? '' : '…'),
      tipo:            'ia_gerada',
      storage_path:    storagePath,
      prompt,
      modelo:          provider,
      agente_id:       agent_id,
      chat_message_id: msgRow?.id ?? null,
      mime_type:       imageMime,
      file_size:       imageBytes.length,
    }).select('id').single();

    return json({
      ok:            true,
      image_url:     signedUrl,
      storage_path:  storagePath,
      message_id:    msgRow?.id ?? null,
      ged_imagem_id: gedRow?.id ?? null,
    });

  } catch (err: any) {
    console.error('[ia-image-runner] erro:', err?.message ?? err);
    return json({ ok: false, error: err?.message ?? 'Erro interno' }, 500);
  }
});
