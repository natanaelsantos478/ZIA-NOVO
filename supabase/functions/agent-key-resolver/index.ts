import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Resolve o api_code do agente para a chave real armazenada nos Supabase Secrets.
// O secret é nomeado exatamente como o código: API0001 → Deno.env.get('API0001').
//
// POST { api_code: string }
// Retorna { ok: true, key: string } ou { ok: false, error: string }
// Requer JWT válido (verify_jwt: true).

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const { api_code } = await req.json() as { api_code?: string };

    if (!api_code || typeof api_code !== 'string') {
      return new Response(JSON.stringify({ ok: false, error: 'api_code ausente' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Valida formato: apenas letras, números e underscores (evita leitura de secrets arbitrários)
    if (!/^[A-Z0-9_]{1,32}$/.test(api_code)) {
      return new Response(JSON.stringify({ ok: false, error: 'Formato de api_code inválido' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const key = Deno.env.get(api_code);
    if (!key) {
      return new Response(JSON.stringify({ ok: false, error: `Secret "${api_code}" não encontrado no servidor` }), {
        status: 404, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, key }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
