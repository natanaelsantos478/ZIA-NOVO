// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

function buildCors(origin: string | null): Record<string, string> {
  const allowed = Deno.env.get('ALLOWED_ORIGINS');
  const h: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-zita-token',
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  try {
    const body = await req.json();
    const { action, query, cnpj, tipo = 'web', num = 5 } = body;

    if (action === 'cnpj') {
      if (!cnpj) {
        return new Response(JSON.stringify({ error: 'CNPJ obrigatório' }), {
          status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
        });
      }

      const cnpjLimpo = cnpj.replace(/\D/g, '');
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`BrasilAPI erro ${res.status}: ${errText}`);
      }
      const data = await res.json();

      const socios = (data.qsa ?? []).map((s: any) => s.nome_socio ?? s.nome ?? '').filter(Boolean);
      const endereco = [
        data.logradouro,
        data.numero,
        data.complemento,
        data.bairro,
      ].filter(Boolean).join(', ');

      return new Response(JSON.stringify({
        cnpj: data.cnpj,
        razao_social: data.razao_social,
        nome_fantasia: data.nome_fantasia,
        situacao: data.descricao_situacao_cadastral,
        endereco,
        municipio: data.municipio,
        uf: data.uf,
        socios,
      }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    if (action === 'search') {
      if (!query) {
        return new Response(JSON.stringify({ error: 'query obrigatório' }), {
          status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
        });
      }

      const CSE_KEY = Deno.env.get('GOOGLE_API_KEY');
      const CSE_ID  = Deno.env.get('GOOGLE_CSE_ID');
      if (!CSE_KEY || !CSE_ID) throw new Error('GOOGLE_API_KEY ou GOOGLE_CSE_ID não configurados');

      const numReq = Math.min(num, 10);
      const params = new URLSearchParams({
        key: CSE_KEY,
        cx:  CSE_ID,
        q:   query,
        num: String(numReq),
        gl:  'br',
        hl:  'pt-br',
        // Para notícias: restringe aos últimos 7 dias e ordena por data
        ...(tipo === 'noticias' ? { dateRestrict: 'd7', sort: 'date' } : {}),
      });

      const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`);
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Google CSE erro ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const items = data.items ?? [];

      const resultados = items.map((item: any) => ({
        titulo:  item.title   ?? '',
        url:     item.link    ?? '',
        snippet: item.snippet ?? '',
        data:    item.pagemap?.metatags?.[0]?.['article:published_time'] ?? '',
      }));

      return new Response(JSON.stringify({ resultados, query }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'images') {
      if (!query) {
        return new Response(JSON.stringify({ error: 'query obrigatório' }), {
          status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
        });
      }

      const CSE_KEY = Deno.env.get('GOOGLE_API_KEY');
      const CSE_ID  = Deno.env.get('GOOGLE_CSE_ID');
      if (!CSE_KEY || !CSE_ID) throw new Error('GOOGLE_API_KEY ou GOOGLE_CSE_ID não configurados');

      const params = new URLSearchParams({
        key:        CSE_KEY,
        cx:         CSE_ID,
        q:          query,
        num:        String(Math.min(num, 9)),
        gl:         'br',
        hl:         'pt-br',
        searchType: 'image',
      });

      const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`);
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Google CSE Images erro ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const images = (data.items ?? []).map((item: any) => ({
        title:        item.title                          ?? '',
        imageUrl:     item.link                           ?? '',
        thumbnailUrl: item.image?.thumbnailLink           ?? '',
        link:         item.image?.contextLink             ?? '',
        source:       item.displayLink                    ?? '',
      }));

      return new Response(JSON.stringify({ images, query }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: `action inválida: ${action}` }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('[ia-web-search] erro:', err);
    return new Response(JSON.stringify({ error: err.message ?? 'Erro interno' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
