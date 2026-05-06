import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  try {
    const { password } = await req.json() as { password?: string };
    if (!password) {
      return new Response(JSON.stringify({ ok: false, error: 'Senha ausente' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const expected = Deno.env.get('GESTOR_PASSWORD');
    if (!expected) {
      return new Response(JSON.stringify({ ok: false, error: 'Senha gestor não configurada no servidor' }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    if (password !== expected) {
      return new Response(JSON.stringify({ ok: false, error: 'Senha incorreta' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const token = crypto.randomUUID();
    const expires_at = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { error } = await supabase
      .from('ia_gestor_sessions')
      .insert({ token, expires_at });

    if (error) {
      return new Response(JSON.stringify({ ok: false, error: 'Falha ao criar sessão' }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, token, expires_at }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
