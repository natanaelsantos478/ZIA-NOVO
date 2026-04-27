// ─────────────────────────────────────────────────────────────────────────────
// ai-proxy — Supabase Edge Function
//
// Proxy seguro para Gemini: a chave fica nos segredos do servidor
// (nunca exposta ao browser). O frontend chama esta função via Supabase.
//
// Deploy:
//   supabase secrets set GEMINI_API_KEY=AIza...
//   supabase functions deploy ai-proxy --no-verify-jwt
//
// Uso no frontend:
//   supabase.functions.invoke('ai-proxy', { body: { type, ...payload } })
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_FLASH_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent';
const GEMINI_PRO_URL   = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

function buildCors(origin: string | null): Record<string, string> {
  const allowed = Deno.env.get('ALLOWED_ORIGINS');
  const h: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  if (!allowed) { h['Access-Control-Allow-Origin'] = '*'; return h; }
  const list = allowed.split(',').map(s => s.trim());
  h['Access-Control-Allow-Origin'] = list.includes(origin ?? '') ? origin! : list[0];
  h['Vary'] = 'Origin';
  return h;
}

// Sempre retorna 200 — erros da Gemini ficam no corpo como { error: {...} }
function ok(cors: Record<string, string>, data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  const CORS = buildCors(req.headers.get('Origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const body = await req.json() as { type: string; tenantId?: string; [key: string]: unknown };
    const { type, tenantId } = body;

    let geminiKey = Deno.env.get('GEMINI_API_KEY') ?? '';
    if (tenantId) {
      try {
        const sb = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        );
        const { data } = await sb
          .from('ia_api_keys')
          .select('integracao_config')
          .eq('tenant_id', tenantId)
          .eq('integracao_tipo', 'gemini')
          .eq('status', 'ativo')
          .limit(1)
          .single();
        const k = (data?.integracao_config as Record<string, string> | null)?.api_key;
        if (k) geminiKey = k;
      } catch { /* usa fallback */ }
    }

    if (!geminiKey) {
      return ok(CORS, { error: 'GEMINI_API_KEY não configurada.' });
    }

    // ── Gemini texto com modo JSON — Flash ou Pro ─────────────────────────
    if (type === 'gemini-text') {
      const { prompt, usePro = false } = body as { prompt: string; usePro?: boolean };
      const url = usePro ? GEMINI_PRO_URL : GEMINI_FLASH_URL;
      const res = await fetch(`${url}?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      });
      return ok(CORS, await res.json());
    }

    // ── Gemini Flash áudio (transcrição) ──────────────────────────────────
    if (type === 'gemini-audio') {
      const { mimeType, audioBase64 } = body as { mimeType: string; audioBase64: string };
      const res = await fetch(`${GEMINI_FLASH_URL}?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mimeType, data: audioBase64 } },
              { text: 'Transcreva o audio em portugues brasileiro. Retorne apenas o texto, sem formatacao.' },
            ],
          }],
        }),
      });
      return ok(CORS, await res.json());
    }

    // ── Gemini chat (análise final + chat pós-atendimento) ────────────────
    if (type === 'gemini-pro-chat') {
      const { messages, system, jsonMode = false } = body as {
        messages: Array<{ role: string; content?: string; parts?: object[] }>;
        system: string;
        jsonMode?: boolean;
      };

      const contents = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : m.role,
        parts: m.parts ?? [{ text: m.content ?? '' }],
      }));

      const genCfg: Record<string, unknown> = { maxOutputTokens: 2048 };
      if (jsonMode) genCfg.responseMimeType = 'application/json';

      const res = await fetch(`${GEMINI_PRO_URL}?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents,
          generationConfig: genCfg,
        }),
      });
      return ok(CORS, await res.json());
    }

    // ── Gemini texto sem modo JSON (respostas em texto livre) ─────────────
    if (type === 'gemini-text-plain') {
      const { prompt, usePro = false } = body as { prompt: string; usePro?: boolean };
      const url = usePro ? GEMINI_PRO_URL : GEMINI_FLASH_URL;
      const res = await fetch(`${url}?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 2048 },
        }),
      });
      return ok(CORS, await res.json());
    }

    // ── Gemini multimodal com imagens (Flash ou Pro, JSON opcional) ───────
    if (type === 'gemini-visual') {
      const { prompt, images, usePro = false, jsonMode = true } = body as {
        prompt: string;
        images: { mimeType: string; data: string }[];
        usePro?: boolean;
        jsonMode?: boolean;
      };
      const url = usePro ? GEMINI_PRO_URL : GEMINI_FLASH_URL;
      const parts: object[] = [{ text: prompt }];
      for (const img of images) {
        parts.push({ inline_data: { mime_type: img.mimeType, data: img.data } });
      }
      const genCfg: Record<string, unknown> = { maxOutputTokens: 2048 };
      if (jsonMode) genCfg.responseMimeType = 'application/json';
      const res = await fetch(`${url}?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts }], generationConfig: genCfg }),
      });
      return ok(CORS, await res.json());
    }

    // ── Gemini chat com histórico, system prompt e tools opcionais ────────
    if (type === 'gemini-chat') {
      const { system, contents, usePro = false, tools } = body as {
        system: string;
        contents: { role: string; parts: { text: string }[] }[];
        usePro?: boolean;
        tools?: unknown[];
      };
      const url = usePro ? GEMINI_PRO_URL : GEMINI_FLASH_URL;
      const payload: Record<string, unknown> = {
        system_instruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { maxOutputTokens: 2048 },
      };
      if (tools?.length) payload.tools = tools;
      const res = await fetch(`${url}?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return ok(CORS, await res.json());
    }

    // ── Gemini com Google Search Grounding (timeout 75s) ─────────────────
    if (type === 'gemini-pro-search') {
      const { messages, system } = body as {
        messages: { role: 'user' | 'assistant'; content: string }[];
        system: string;
      };

      const contents = messages.map((m: { role: string; content: string }) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 75000);
      let gemRes: Response;
      try {
        gemRes = await fetch(`${GEMINI_PRO_URL}?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: system }] },
            contents,
            tools: [{ google_search: {} }],
            generationConfig: { maxOutputTokens: 2048 },
          }),
          signal: ctrl.signal,
        });
      } catch {
        clearTimeout(t);
        return ok(CORS, { error: 'GEMINI_TIMEOUT' });
      }
      clearTimeout(t);
      return ok(CORS, await gemRes.json());
    }

    return ok(CORS, { error: `Tipo desconhecido: ${type}` });

  } catch (err) {
    return ok(CORS, { error: String(err) });
  }
});
