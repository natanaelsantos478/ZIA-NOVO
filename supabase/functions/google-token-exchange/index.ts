// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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

Deno.serve(async (req: Request) => {
  const CORS = buildCors(req.headers.get('Origin'));
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const GOOGLE_CLIENT_ID     = Deno.env.get("GOOGLE_CLIENT_ID");
  const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return new Response(JSON.stringify({ error: "Google OAuth não configurado no servidor" }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  try {
    const { code, code_verifier, redirect_uri } = await req.json();

    if (!code || !code_verifier || !redirect_uri) {
      return new Response(JSON.stringify({ error: "code, code_verifier e redirect_uri são obrigatórios" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Troca o código pelo access_token usando client_secret (nunca exposto no frontend)
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id:     GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        code_verifier,
        grant_type:    "authorization_code",
        redirect_uri,
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.json().catch(() => ({})) as any;
      return new Response(JSON.stringify({ error: err.error_description ?? err.error ?? "Falha na troca do código" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const tokenData = await tokenRes.json() as any;

    // Busca e-mail do usuário
    let email: string | undefined;
    try {
      const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (userRes.ok) {
        const user = await userRes.json() as any;
        email = user.email;
      }
    } catch { /* ignora */ }

    return new Response(JSON.stringify({
      access_token: tokenData.access_token,
      expires_in:   tokenData.expires_in ?? 3600,
      email,
    }), { headers: { ...CORS, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("[google-token-exchange] erro:", err?.message);
    return new Response(JSON.stringify({ error: err?.message ?? "Erro interno" }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
