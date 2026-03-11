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

const GEMINI_FLASH_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent';
const GEMINI_PRO_URL   = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const geminiKey = Deno.env.get('GEMINI_API_KEY') ?? '';

    if (!geminiKey) {
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY não configurada no servidor.' }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json() as { type: string; [key: string]: unknown };
    const { type } = body;

    // ── Gemini Flash texto (advisor + extrator — resposta JSON) ───────────
    if (type === 'gemini-text') {
      const { prompt } = body as { prompt: string };
      const res = await fetch(`${GEMINI_FLASH_URL}?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        status: res.status, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
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
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        status: res.status, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // ── Gemini 2.5 Pro (análise final + chat pós-atendimento) ─────────────
    if (type === 'gemini-pro-chat') {
      const { messages, system } = body as {
        messages: { role: 'user' | 'assistant'; content: string }[];
        system: string;
      };

      // Gemini usa "model" no lugar de "assistant"
      const contents = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      const res = await fetch(`${GEMINI_PRO_URL}?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents,
          generationConfig: { maxOutputTokens: 2048 },
        }),
      });
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        status: res.status, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: `Tipo desconhecido: ${type}` }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
