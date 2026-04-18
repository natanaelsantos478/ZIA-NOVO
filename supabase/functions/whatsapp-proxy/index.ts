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
    const { action, instanceUrl, token, phone, message } = await req.json() as {
      action: string;
      instanceUrl: string;
      token: string;
      phone: string;
      message: string;
    };

    if (action !== 'send-text') {
      return new Response(JSON.stringify({ ok: false, error: 'Ação inválida' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    if (!instanceUrl || !token || !phone || !message) {
      return new Response(JSON.stringify({ ok: false, error: 'Parâmetros incompletos' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const url = `${instanceUrl.replace(/\/$/, '')}/send-text`;
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Token': token,
      },
      body: JSON.stringify({ phone, message }),
    });

    const body = await r.text();
    let parsed: unknown;
    try { parsed = JSON.parse(body); } catch { parsed = body; }

    return new Response(
      JSON.stringify({ ok: r.ok, status: r.status, response: parsed, error: r.ok ? undefined : `HTTP ${r.status}: ${body}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
