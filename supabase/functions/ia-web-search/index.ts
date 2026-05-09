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

// Busca via Gemini com Google Search grounding (gratuito)
async function searchViaGemini(query: string, tipo: string, num: number) {
  const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY');
  if (!GEMINI_KEY) throw new Error('GEMINI_API_KEY não configurado');

  const promptBase = tipo === 'noticias'
    ? `Busque as notícias mais recentes sobre: ${query}`
    : `Busque na web sobre: ${query}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: promptBase }] }],
        tools: [{ googleSearch: {} }],
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini Search erro ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const candidate = data.candidates?.[0];
  const chunks: any[] = candidate?.groundingMetadata?.groundingChunks ?? [];
  const supports: any[] = candidate?.groundingMetadata?.groundingSupports ?? [];

  // Mapeia trechos de texto para cada chunk pelo índice
  const snippetMap: Record<number, string[]> = {};
  for (const support of supports) {
    const text = (support.segment?.text ?? '').trim();
    if (!text) continue;
    for (const idx of (support.groundingChunkIndices ?? [])) {
      if (!snippetMap[idx]) snippetMap[idx] = [];
      snippetMap[idx].push(text);
    }
  }

  const resultados = chunks
    .filter((c: any) => c.web?.uri)
    .slice(0, num)
    .map((c: any, i: number) => ({
      titulo:  c.web.title ?? '',
      url:     c.web.uri  ?? '',
      snippet: (snippetMap[i] ?? []).join(' ').slice(0, 400),
      data:    '',
    }));

  return resultados;
}

Deno.serve(async (req: Request) => {
  const CORS = buildCors(req.headers.get('Origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  try {
    const body = await req.json();
    const { action, query, cnpj, tipo = 'web', num = 5 } = body;

    // ── CNPJ ────────────────────────────────────────────────────────────────
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
      const endereco = [data.logradouro, data.numero, data.complemento, data.bairro]
        .filter(Boolean).join(', ');

      return new Response(JSON.stringify({
        cnpj:         data.cnpj,
        razao_social: data.razao_social,
        nome_fantasia: data.nome_fantasia,
        situacao:     data.descricao_situacao_cadastral,
        endereco,
        municipio:    data.municipio,
        uf:           data.uf,
        socios,
      }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    // ── SEARCH / NOTICIAS — via Gemini (gratuito) ───────────────────────────
    if (action === 'search') {
      if (!query) {
        return new Response(JSON.stringify({ error: 'query obrigatório' }), {
          status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
        });
      }

      const resultados = await searchViaGemini(query, tipo, Math.min(num, 10));

      return new Response(JSON.stringify({ resultados, query }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // ── IMAGES — via Serper (usar com moderação) ────────────────────────────
    if (action === 'images') {
      if (!query) {
        return new Response(JSON.stringify({ error: 'query obrigatório' }), {
          status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
        });
      }

      const SERPER_KEY = Deno.env.get('SERPER_API_KEY');
      if (!SERPER_KEY) throw new Error('SERPER_API_KEY não configurado');

      const res = await fetch('https://google.serper.dev/images', {
        method: 'POST',
        headers: { 'X-API-KEY': SERPER_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: query, gl: 'br', hl: 'pt-br', num: Math.min(num, 9) }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Serper Images erro ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const images = (data.images ?? []).map((item: any) => ({
        title:        item.title        ?? '',
        imageUrl:     item.imageUrl     ?? '',
        thumbnailUrl: item.thumbnailUrl ?? '',
        link:         item.link         ?? '',
        source:       item.source       ?? '',
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
