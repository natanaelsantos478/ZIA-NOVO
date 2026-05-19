// deno-lint-ignore-file no-explicit-any
// ─────────────────────────────────────────────────────────────────────────────
// ia-prospeccao-runner — Pipeline de prospecção B2B server-side
// Chamado pelo tool prospectar_empresas dos agent runners.
// Não substitui o ProspeccaoIA.tsx do browser — funciona em paralelo.
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'content-type, authorization',
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

interface ProspInput {
  tenant_id:      string;
  setor:          string;
  regiao?:        string;  // ex: "São Paulo, SP" | "Sul do Brasil" | "Brasil"
  quantidade?:    number;  // máx empresas a salvar (padrão 10, teto 30)
  palavras_chave?:string;
  capital_min?:   number;
  excluir?:       string;
}

// ── Chama ai-proxy (Gemini) ────────────────────────────────────────────────

async function callProxy(type: string, payload: Record<string, unknown>, tenantId: string): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-proxy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
      body: JSON.stringify({ type, tenantId, ...payload }),
    });
    const d = await res.json() as any;
    if (d?.error === 'GEMINI_TIMEOUT' && attempt < 2) {
      await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
      continue;
    }
    if (d?._geminiStatus) throw new Error(`Gemini ${d._geminiStatus}: ${d?.error}`);
    const parts: { thought?: boolean; text?: string }[] = d?.candidates?.[0]?.content?.parts ?? [];
    return parts.filter((p: any) => !p.thought).map((p: any) => p.text ?? '').join('');
  }
  throw new Error('Gemini: falha após 3 tentativas');
}

// ── Parse JSON array do texto do modelo ────────────────────────────────────

function extractJsonArray<T>(s: string): T[] | null {
  const cleaned = s.replace(/```json|```/gi, '').trim();
  try { const v = JSON.parse(cleaned); if (Array.isArray(v)) return v as T[]; } catch { /* continua */ }
  const first = cleaned.indexOf('[');
  const last  = cleaned.lastIndexOf(']');
  if (first !== -1 && last > first) {
    try { const v = JSON.parse(cleaned.slice(first, last + 1)); if (Array.isArray(v)) return v as T[]; } catch { /* falha */ }
  }
  return null;
}

// ── BrasilAPI CNPJ ─────────────────────────────────────────────────────────

async function fetchBrasilApiCnpj(cnpj: string): Promise<Record<string, unknown> | null> {
  const limpo = cnpj.replace(/\D/g, '');
  if (limpo.length !== 14) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${limpo}`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.json() as Record<string, unknown>;
  } catch { return null; }
}

// ── Handler principal ──────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const body = await req.json() as ProspInput;
    const {
      tenant_id, setor,
      regiao        = 'Brasil',
      quantidade    = 10,
      palavras_chave,
      capital_min,
      excluir,
    } = body;

    if (!tenant_id || !setor) return json({ error: 'tenant_id e setor são obrigatórios' }, 400);

    const qtd = Math.min(Math.max(quantidade, 1), 30);
    const sb  = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // ── Etapa 1: Busca Web (2 ângulos paralelos) ──────────────────────────

    const baseCtx = `setor "${setor}" em ${regiao}`
      + (palavras_chave ? `, tema: ${palavras_chave}` : '')
      + (capital_min    ? `, capital mínimo R$ ${capital_min.toLocaleString('pt-BR')}` : '')
      + (excluir        ? `. Excluir: ${excluir}` : '');

    const sysSearch = 'Você é um pesquisador B2B. Use Google Search para encontrar empresas reais e ativas. Não invente empresas.';
    const maxSearch = Math.max(qtd * 2, 20);

    const [r1, r2] = await Promise.allSettled([
      callProxy('gemini-pro-search', {
        system:   sysSearch,
        messages: [{ role: 'user', content: `Pesquise empresas reais do ${baseCtx}. Liste até ${maxSearch} empresas diferentes com nome, CNPJ se disponível, cidade, UF e descrição curta. Uma por linha numerada.` }],
      }, tenant_id),
      callProxy('gemini-pro-search', {
        system:   sysSearch,
        messages: [{ role: 'user', content: `Pesquise mais empresas reais do ${baseCtx}, priorizando as menos conhecidas. Liste até ${Math.max(qtd, 10)} empresas com nome, CNPJ se disponível, cidade, UF e descrição curta. Uma por linha numerada.` }],
      }, tenant_id),
    ]);

    const rawCombined = [r1, r2]
      .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled' && r.value.trim().length > 20)
      .map(r => r.value)
      .join('\n\n');

    if (!rawCombined || rawCombined.trim().length < 30) {
      return json({ error: 'Nenhuma empresa encontrada. Refine o setor ou a região.' });
    }

    // ── Estruturar em JSON ─────────────────────────────────────────────────

    const structPrompt = `Converta o texto abaixo em um JSON array de empresas.
Schema: [{"nome":"string","cnpj":"14 dígitos sem pontuação ou null","cidade":"string","estado":"UF 2 letras","descricao":"string curta"}]

Regras:
- CNPJ: apenas 14 dígitos, sem pontuação. null se não disponível.
- Deduplique por nome (mantenha apenas a primeira ocorrência).
- Retorne APENAS um JSON array válido. Se vazio, retorne [].

Texto:
"""
${rawCombined.slice(0, 8000)}
"""`;

    const structured = await callProxy('gemini-text', { prompt: structPrompt, usePro: true }, tenant_id);

    type EmpresaRaw = { nome: string; cnpj?: string | null; cidade?: string; estado?: string; descricao?: string };
    const empresasRaw = extractJsonArray<EmpresaRaw>(structured) ?? [];

    if (empresasRaw.length === 0) {
      return json({ error: 'Não foi possível estruturar as empresas encontradas. Tente novamente.' });
    }

    // ── Etapa 2: Enriquecer com BrasilAPI ─────────────────────────────────

    type EmpresaEnriquecida = EmpresaRaw & {
      situacao?:      string;
      capital_social?: number;
      telefone?:      string;
      email?:         string;
      socios?:        { nome: string; qualificacao: string }[];
    };

    const pool: EmpresaEnriquecida[] = empresasRaw.slice(0, qtd * 3).map(e => ({ ...e }));
    const comCnpj = pool.filter(e => e.cnpj && String(e.cnpj).replace(/\D/g, '').length === 14);

    await Promise.allSettled(comCnpj.slice(0, 20).map(async (emp) => {
      const d = await fetchBrasilApiCnpj(emp.cnpj!);
      if (!d) return;
      const idx = pool.indexOf(emp);
      const cap = (d.capital_social as number) ?? 0;
      const socios = ((d.qsa as { nome_socio?: string; qualificacao_socio_descricao?: string }[]) ?? [])
        .map(s => ({ nome: s.nome_socio ?? '', qualificacao: s.qualificacao_socio_descricao ?? '' }));
      if (capital_min && cap < capital_min) {
        pool[idx] = { ...emp, situacao: 'CAPITAL_INSUFICIENTE', capital_social: cap, socios };
      } else {
        pool[idx] = {
          ...emp,
          situacao:      (d.descricao_situacao_cadastral as string) ?? 'ATIVA',
          capital_social: cap,
          telefone:      (d.ddd_telefone_1 as string | undefined)?.trim() || emp.telefone,
          email:         (d.email as string | undefined) || emp.email,
          socios,
        };
      }
    }));

    // Prioriza ativas; descarta sem situação apenas se houver ativas suficientes
    const ativas  = pool.filter(e => !e.situacao || e.situacao === 'ATIVA');
    const finais  = (ativas.length >= qtd ? ativas : pool).slice(0, qtd);

    // ── Etapa 3: Salvar no banco ───────────────────────────────────────────

    let salvas = 0;
    const resumo: { nome: string; cidade?: string; estado?: string; cnpj?: string }[] = [];

    for (const emp of finais) {
      const cnpjLimpo = emp.cnpj ? String(emp.cnpj).replace(/\D/g, '') : null;
      const upsertData: Record<string, unknown> = {
        tenant_id,
        nome_fantasia:     emp.nome,
        cnpj:              cnpjLimpo?.length === 14 ? cnpjLimpo : null,
        municipio:         emp.cidade  ?? null,
        uf:                emp.estado  ?? null,
        segmento:          setor,
        status_pipeline:   'novo',
        capital_social:    emp.capital_social ?? null,
        telefone_principal: emp.telefone ?? null,
        email_contato:     emp.email    ?? null,
      };

      const { error } = cnpjLimpo?.length === 14
        ? await sb.from('prosp_empresas').upsert(upsertData, { onConflict: 'tenant_id,cnpj', ignoreDuplicates: true })
        : await sb.from('prosp_empresas').insert(upsertData);

      if (!error) {
        salvas++;
        resumo.push({ nome: emp.nome, cidade: emp.cidade, estado: emp.estado, cnpj: cnpjLimpo ?? undefined });
      }
    }

    console.log(`[ia-prospeccao-runner] tenant=${tenant_id} setor="${setor}" encontradas=${empresasRaw.length} ativas=${ativas.length} salvas=${salvas}`);

    return json({
      ok:               true,
      total_encontradas: empresasRaw.length,
      total_ativas:     ativas.length,
      total_salvas:     salvas,
      criterios:        { setor, regiao, quantidade: qtd, palavras_chave, capital_min, excluir },
      empresas_salvas:  resumo,
    });

  } catch (e) {
    console.error('[ia-prospeccao-runner] erro:', String(e));
    return json({ error: String(e) }, 500);
  }
});
