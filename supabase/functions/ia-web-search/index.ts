// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-zita-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
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

      const SERPER_KEY = Deno.env.get('SERPER_API_KEY');
      if (!SERPER_KEY) throw new Error('SERPER_API_KEY não configurada');

      const endpoint = tipo === 'noticias'
        ? 'https://google.serper.dev/news'
        : 'https://google.serper.dev/search';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-KEY': SERPER_KEY },
        body: JSON.stringify({ q: query, gl: 'br', hl: 'pt-br', num: Math.min(num, 10) }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Serper erro ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const items = tipo === 'noticias' ? (data.news ?? []) : (data.organic ?? []);

      const resultados = items.map((item: any) => ({
        titulo: item.title ?? '',
        url: item.link ?? '',
        snippet: item.snippet ?? '',
        data: item.date ?? item.publishedDate ?? '',
      }));

      return new Response(JSON.stringify({ resultados, query }), {
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
