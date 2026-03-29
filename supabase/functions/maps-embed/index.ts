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

  const GOOGLE_MAPS_KEY = Deno.env.get("GOOGLE_MAPS_KEY");
  if (!GOOGLE_MAPS_KEY) {
    return new Response(JSON.stringify({ error: "GOOGLE_MAPS_KEY não configurado" }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  try {
    const { query } = await req.json();
    if (!query?.trim()) {
      return new Response(JSON.stringify({ error: "query é obrigatório" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const url = `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_KEY}&q=${encodeURIComponent(query.trim())}`;
    return new Response(JSON.stringify({ url }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: String(err.message ?? err) }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
