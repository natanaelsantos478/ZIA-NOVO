// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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

// Verifica limite diário e incrementa contador. Retorna erro ou null.
async function checkAndIncrementLimit(agentId: string, tenantId: string): Promise<string | null> {
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Busca card web_search conectado ao agente
  const { data: link } = await sb
    .from('ia_agent_cards')
    .select('card_id, ia_cards(config)')
    .eq('agente_id', agentId)
    .maybeSingle() as any;

  const config: Record<string, unknown> = (link?.ia_cards as any)?.config ?? {};
  const limiteDiario = typeof config.limite_diario === 'number' ? config.limite_diario : null;

  if (!limiteDiario) return null; // sem limite configurado

  const today = new Date().toISOString().split('T')[0];

  const { data: usage } = await sb
    .from('ia_agent_search_usage')
    .select('count')
    .eq('agent_id', agentId)
    .eq('date', today)
    .maybeSingle();

  const currentCount = (usage as any)?.count ?? 0;

  if (currentCount >= limiteDiario) {
    return 'seu limite de pesquisas diarias foi atingido';
  }

  // Incrementa
  await sb.from('ia_agent_search_usage').upsert(
    { agent_id: agentId, tenant_id: tenantId, date: today, count: currentCount + 1 },
    { onConflict: 'agent_id,date' },
  );

  return null;
}

// Busca via Serper (Google Search)
async function searchViaSerper(query: string, tipo: string, num: number) {
  const SERPER_KEY = Deno.env.get('SERPER_API_KEY');
  if (!SERPER_KEY) throw new Error('SERPER_API_KEY não configurado');

  const endpoint = tipo === 'noticias' ? 'https://google.serper.dev/news' : 'https://google.serper.dev/search';

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'X-API-KEY': SERPER_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: query, gl: 'br', hl: 'pt-br', num: Math.min(num, 10) }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Serper Search erro ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const items: any[] = tipo === 'noticias' ? (data.news ?? []) : (data.organic ?? []);

  return items.slice(0, num).map((item: any) => ({
    titulo:  item.title   ?? '',
    url:     item.link    ?? '',
    snippet: item.snippet ?? '',
    data:    item.date    ?? '',
  }));
}

Deno.serve(async (req: Request) => {
  const CORS = buildCors(req.headers.get('Origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  try {
    const body = await req.json();
    const { action, query, cnpj, tipo = 'web', num = 5, agent_id, tenant_id } = body;

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
        cnpj:          data.cnpj,
        razao_social:  data.razao_social,
        nome_fantasia: data.nome_fantasia,
        situacao:      data.descricao_situacao_cadastral,
        endereco,
        municipio:     data.municipio,
        uf:            data.uf,
        socios,
      }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    // ── SEARCH / NOTICIAS — via Serper ──────────────────────────────────────
    if (action === 'search') {
      if (!query) {
        return new Response(JSON.stringify({ error: 'query obrigatório' }), {
          status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
        });
      }

      // Verifica limite diário (apenas quando chamado por agente)
      if (agent_id && tenant_id) {
        const limiteErro = await checkAndIncrementLimit(agent_id, tenant_id);
        if (limiteErro) {
          return new Response(JSON.stringify({ error: limiteErro }), {
            status: 429, headers: { ...CORS, 'Content-Type': 'application/json' },
          });
        }
      }

      const resultados = await searchViaSerper(query, tipo, Math.min(num, 10));

      return new Response(JSON.stringify({ resultados, query }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // ── IMAGES — via Serper ──────────────────────────────────────────────────
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
