// ─────────────────────────────────────────────────────────────────────────────
// ai-proxy — Supabase Edge Function
//
// Proxy seguro para Gemini e Claude: as chaves ficam nos segredos do servidor
// (nunca expostas ao browser). O frontend chama esta função via Supabase.
//
// Deploy:
//   supabase secrets set GEMINI_API_KEY=AIza...
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//   supabase functions deploy ai-proxy --no-verify-jwt
//
// Uso no frontend:
//   supabase.functions.invoke('ai-proxy', { body: { type, ...payload } })
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const GEMINI_URL  = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const CLAUDE_URL  = 'https://api.anthropic.com/v1/messages';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const geminiKey    = Deno.env.get('GEMINI_API_KEY')    ?? '';
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY') ?? '';

    if (!geminiKey || !anthropicKey) {
      return new Response(JSON.stringify({ error: 'Chaves de API não configuradas no servidor.' }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json() as { type: string; [key: string]: unknown };
    const { type } = body;

    // ── Gemini texto (advisor + extrator) ─────────────────────────────────
    if (type === 'gemini-text') {
      const { prompt } = body as { prompt: string };
      const res = await fetch(`${GEMINI_URL}?key=${geminiKey}`, {
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

    // ── Gemini áudio (transcrição) ─────────────────────────────────────────
    if (type === 'gemini-audio') {
      const { mimeType, audioBase64 } = body as { mimeType: string; audioBase64: string };
      const res = await fetch(`${GEMINI_URL}?key=${geminiKey}`, {
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

    // ── Claude Sonnet 4.6 (análise final + chat) ───────────────────────────
    if (type === 'claude-chat') {
      const { messages, system } = body as { messages: unknown[]; system: string };
      const res = await fetch(CLAUDE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 2048,
          system,
          messages,
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
