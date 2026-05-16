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
    const body = await req.json() as {
      action: string;
      instanceUrl: string;
      token: string;
      phone: string;
      message?: string;
      documentUrl?: string;
      fileName?: string;
    };

    const { action, instanceUrl, token, phone } = body;

    if (!instanceUrl || !token || !phone) {
      return new Response(JSON.stringify({ ok: false, error: 'Parâmetros incompletos' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const base = instanceUrl.replace(/\/$/, '');

    if (action === 'get-messages') {
      const amount = (body as any).amount ?? 30;
      const r = await fetch(`${base}/chat-messages/${phone}?amount=${amount}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Client-Token': token },
      });
      const parsed = await r.json().catch(() => ([])) as unknown;
      const arr = Array.isArray(parsed) ? parsed : ((parsed as any)?.messages ?? []);
      console.log('[whatsapp-proxy] get-messages status:', r.status, '| phone:', phone, '| count:', arr.length);
      return new Response(
        JSON.stringify({ ok: r.ok, messages: arr, _debug_count: arr.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (action === 'check-phone') {
      // Verifica se o número está registrado no WhatsApp via Z-API
      const r = await fetch(`${base}/phone-exists?phone=${phone}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Client-Token': token },
      });
      const parsed = await r.json().catch(() => ({})) as Record<string, unknown>;
      const exists = r.ok && (parsed?.exists === true || parsed?.numberExists === true);
      return new Response(
        JSON.stringify({ ok: true, exists, response: parsed }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (action === 'send-text') {
      if (!body.message) {
        return new Response(JSON.stringify({ ok: false, error: 'message obrigatório' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
        });
      }
      const r = await fetch(`${base}/send-text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Client-Token': token },
        body: JSON.stringify({ phone, message: body.message }),
      });
      const parsed = await r.json().catch(() => r.text());
      return new Response(
        JSON.stringify({ ok: r.ok, status: r.status, response: parsed, error: r.ok ? undefined : `HTTP ${r.status}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (action === 'send-audio') {
      const { audioBase64, extension = 'mp3' } = body as any;
      if (!audioBase64) {
        return new Response(JSON.stringify({ ok: false, error: 'audioBase64 obrigatório' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
        });
      }
      const r = await fetch(`${base}/send-audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Client-Token': token },
        body: JSON.stringify({
          phone,
          audio: `data:audio/${extension};base64,${audioBase64}`,
          extension,
        }),
      });
      const parsed = await r.json().catch(() => r.text());
      return new Response(
        JSON.stringify({ ok: r.ok, status: r.status, response: parsed }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (action === 'send-document') {
      if (!body.documentUrl || !body.fileName) {
        return new Response(JSON.stringify({ ok: false, error: 'documentUrl e fileName obrigatórios' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
        });
      }
      const r = await fetch(`${base}/send-document/${phone}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Client-Token': token },
        body: JSON.stringify({ phone, document: body.documentUrl, fileName: body.fileName }),
      });
      const parsed = await r.json().catch(() => r.text());
      return new Response(
        JSON.stringify({ ok: r.ok, status: r.status, response: parsed, error: r.ok ? undefined : `HTTP ${r.status}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(JSON.stringify({ ok: false, error: 'Ação inválida' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
    });

  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
