import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json() as Record<string, unknown>;
    const { action, instanceUrl, token, phone } = body as {
      action: string; instanceUrl: string; token: string; phone: string;
    };

    if (!instanceUrl || !token || !phone) {
      return new Response(JSON.stringify({ ok: false, error: 'Parâmetros incompletos' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const base = instanceUrl.replace(/\/$/, '');

    // ── Enviar texto ─────────────────────────────────────────────────────────
    if (action === 'send-text') {
      const { message } = body as { message: string };
      if (!message) {
        return new Response(JSON.stringify({ ok: false, error: 'message obrigatório' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
        });
      }
      const r = await fetch(`${base}/send-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Client-Token': token },
        body: JSON.stringify({ phone, message }),
      });
      const text = await r.text();
      let parsed: unknown;
      try { parsed = JSON.parse(text); } catch { parsed = text; }
      return new Response(
        JSON.stringify({ ok: r.ok, status: r.status, response: parsed, error: r.ok ? undefined : `HTTP ${r.status}: ${text}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Enviar documento (PDF, imagem etc.) ──────────────────────────────────
    if (action === 'send-document') {
      const { documentUrl, fileName, caption } = body as {
        documentUrl: string; fileName?: string; caption?: string;
      };
      if (!documentUrl) {
        return new Response(JSON.stringify({ ok: false, error: 'documentUrl obrigatório' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
        });
      }
      const safeName = (fileName ?? 'documento').replace(/[^a-zA-Z0-9._-]/g, '_');
      const r = await fetch(`${base}/send-document/${encodeURIComponent(safeName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Client-Token': token },
        body: JSON.stringify({ phone, document: documentUrl, caption: caption ?? '' }),
      });
      const text = await r.text();
      let parsed: unknown;
      try { parsed = JSON.parse(text); } catch { parsed = text; }
      return new Response(
        JSON.stringify({ ok: r.ok, status: r.status, response: parsed, error: r.ok ? undefined : `HTTP ${r.status}: ${text}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({ ok: false, error: `Ação inválida: ${action}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });

  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
