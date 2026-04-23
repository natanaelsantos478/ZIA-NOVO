// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface EmpresaRaw {
  nome: string;
  razao_social: string;
  cnpj?: string;
  telefone?: string;
  website?: string;
  municipio?: string;
  uf?: string;
  capital_social?: number;
  situacao?: string;
  data_abertura?: string;
  cnae?: string;
  porte?: string;
  socios?: string;
  funcionarios?: string;
  serasa?: string;
  saas?: string;
  score: number;
  classificacao: "HOT" | "WARM" | "COLD" | "DESCARTADO";
  motivos?: string[];
  tem_socio_ligado_ti?: boolean;
}

// ─── SSE helpers ─────────────────────────────────────────────────────────────

function makeEmitter(writer: WritableStreamDefaultWriter<Uint8Array>) {
  const enc = new TextEncoder();
  return async (obj: object) => {
    await writer.write(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
  };
}

// ─── fetch com timeout ───────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, opts: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

// ─── Serper search ───────────────────────────────────────────────────────────

async function serperSearch(query: string, key: string, num = 10): Promise<any[]> {
  try {
    const res = await fetchWithTimeout("https://google.serper.dev/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-KEY": key },
      body: JSON.stringify({ q: query, gl: "br", hl: "pt-br", num: Math.min(num, 100) }),
    }, 8000);
    if (!res.ok) return [];
    const data = await res.json();
    return data.organic ?? [];
  } catch {
    return [];
  }
}

// ─── BrasilAPI CNPJ ──────────────────────────────────────────────────────────

async function brasilApiCnpj(cnpj: string): Promise<any | null> {
  const limpo = cnpj.replace(/\D/g, "");
  if (limpo.length !== 14) return null;
  try {
    const res = await fetchWithTimeout(`https://brasilapi.com.br/api/cnpj/v1/${limpo}`, {}, 8000);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// ─── Gemini call ─────────────────────────────────────────────────────────────

async function gemini(prompt: string, key: string): Promise<string> {
  const res = await fetchWithTimeout(`${GEMINI_URL}?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
    }),
  }, 20000);
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

// ─── Extract CNPJ from text ───────────────────────────────────────────────────

function extractCnpj(text: string): string | null {
  const m = text.match(/\d{2}[\.\s]?\d{3}[\.\s]?\d{3}[\/\s]?\d{4}[-\s]?\d{2}/);
  if (!m) return null;
  return m[0].replace(/\D/g, "");
}

// ─── Salvar no Supabase ───────────────────────────────────────────────────────

async function salvarEmpresas(
  supabaseClient: ReturnType<typeof createClient>,
  empresas: EmpresaRaw[],
  campanhaId: string,
  tenantId: string,
) {
  try {
    const rows = empresas.map((e) => ({
      tenant_id: tenantId,
      campanha_id: campanhaId,
      nome: e.nome || e.razao_social,
      razao_social: e.razao_social,
      cnpj: e.cnpj,
      telefone: e.telefone,
      website: e.website,
      municipio: e.municipio,
      uf: e.uf,
      capital_social: e.capital_social,
      funcionarios: e.funcionarios,
      socios: e.socios,
      saas: e.saas,
      serasa: e.serasa,
      score: e.score,
      classificacao: e.classificacao,
      motivos: e.motivos,
      tem_socio_ligado_ti: e.tem_socio_ligado_ti ?? false,
      data_abertura: e.data_abertura,
      cnae: e.cnae,
      porte: e.porte,
    }));
    await supabaseClient.from("ia_prospeccao_empresas").insert(rows);
  } catch (err) {
    console.error("[ia-prospeccao] erro ao salvar empresas:", err);
  }
}

// ─── Handler principal ────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const CORS = buildCors(req.headers.get('Origin'));
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const SERPER_KEY = Deno.env.get("SERPER_API_KEY") ?? "";
  const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const emit = makeEmitter(writer);

  const response = new Response(readable, {
    headers: {
      ...CORS,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });

  (async () => {
    try {
      const body = await req.json();
      const {
        segmento = "empresas",
        regiao = "Brasil",
        meta = 10,
        capital_min = 0,
        tenant_id,
        campanha_id,
      } = body;

      const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
      const empresas: EmpresaRaw[] = [];

      // ── ETAPA 1 — Descoberta via Google Search ─────────────────────────────
      await emit({ type: "etapa", numero: 1, total: 9, nome: "Descoberta via Google Search", status: "iniciando" });
      await emit({ type: "progresso", mensagem: `🔍 Pesquisando empresas de ${segmento} em ${regiao}...` });

      let discovered: { nome: string; website: string; snippet: string }[] = [];

      if (SERPER_KEY) {
        const numPorQuery = Math.min(Math.ceil(meta * 1.5), 100);
        const queries = [
          `empresas ${segmento} ${regiao}`,
          `"${segmento}" "${regiao}" empresa CNPJ`,
          `${segmento} empresa ${regiao} razão social ativa`,
          `lista empresas "${segmento}" ${regiao} CNPJ`,
          `"${regiao}" "${segmento}" fornecedor distribuidor`,
        ];
        const seen = new Set<string>();
        const queryResults = await Promise.allSettled(queries.map(q => serperSearch(q, SERPER_KEY, numPorQuery)));
        for (const res of queryResults) {
          if (res.status !== "fulfilled") continue;
          for (const r of res.value) {
            if (discovered.length >= meta * 2) break;
            const nome = (r.title ?? "").split(" - ")[0].split(" | ")[0].trim();
            if (!nome || seen.has(nome.toLowerCase())) continue;
            seen.add(nome.toLowerCase());
            discovered.push({ nome, website: r.link ?? "", snippet: r.snippet ?? "" });
            await emit({ type: "progresso", mensagem: `✅ Encontrada: ${nome}` });
          }
        }
      }

      // Fallback Gemini: ativo sempre que não atingiu a meta (independente do Serper)
      if (discovered.length < meta && GEMINI_KEY) {
        await emit({ type: "progresso", mensagem: `🤖 Completando lista via IA (${discovered.length}/${meta} encontradas)...` });
        try {
          const seenNames = new Set(discovered.map(d => d.nome.toLowerCase()));
          const txt = await gemini(
            `Liste ${meta - discovered.length} empresas reais do segmento "${segmento}" localizadas em "${regiao}", Brasil. ` +
            `Responda APENAS com JSON array: [{"nome":"...","website":"..."}]. Sem explicação.`,
            GEMINI_KEY,
          );
          const match = txt.match(/\[[\s\S]*\]/);
          if (match) {
            const extra: { nome: string; website: string }[] = JSON.parse(match[0]);
            for (const e of extra) {
              if (e.nome && !seenNames.has(e.nome.toLowerCase())) {
                discovered.push({ nome: e.nome, website: e.website ?? "", snippet: "" });
                seenNames.add(e.nome.toLowerCase());
                await emit({ type: "progresso", mensagem: `🤖 ${e.nome}` });
              }
            }
          }
        } catch { /* ignora */ }
      }

      if (discovered.length === 0) {
        throw new Error(`Nenhuma empresa encontrada para "${segmento}" em "${regiao}". Verifique os critérios ou configure a chave Serper.`);
      }

      // Limita ao meta
      discovered = discovered.slice(0, meta * 2);

      for (const d of discovered) {
        empresas.push({
          nome: d.nome,
          razao_social: d.nome,
          website: d.website,
          score: 0,
          classificacao: "COLD",
        });
      }

      await emit({
        type: "etapa", numero: 1, total: 9, nome: "Descoberta via Google Search", status: "concluido",
        resultado: `${empresas.length} empresas encontradas`,
        empresas: empresas.map(e => ({ nome: e.nome, razao_social: e.razao_social, website: e.website, score: 0, classificacao: "COLD" })),
      });

      // ── ETAPA 2 — Localização e Telefone ──────────────────────────────────
      await emit({ type: "etapa", numero: 2, total: 9, nome: "Localização e Telefone (Maps)", status: "iniciando" });
      await emit({ type: "progresso", mensagem: `📞 Coletando telefones para ${empresas.length} empresas em paralelo...` });

      // Paralelo com concorrência de 5
      await Promise.allSettled(
        empresas.map(async (emp) => {
          if (!SERPER_KEY) return;
          const results = await serperSearch(`"${emp.nome}" ${regiao} telefone contato`, SERPER_KEY, 5);
          for (const r of results) {
            const text = `${r.title ?? ""} ${r.snippet ?? ""}`;
            const phoneMatch = text.match(/\(?\d{2}\)?\s*\d{4,5}[-\s]?\d{4}/);
            if (phoneMatch) {
              emp.telefone = phoneMatch[0].replace(/\s+/g, " ").trim();
              await emit({ type: "progresso", mensagem: `📱 ${emp.nome}: ${emp.telefone}` });
              break;
            }
          }
          if (!emp.municipio) {
            for (const r of results) {
              const m = (r.snippet ?? "").match(/\b([A-ZÀ-Ú][a-zà-ú]+(?:\s[A-ZÀ-Ú][a-zà-ú]+)*)\s*[-–]\s*([A-Z]{2})\b/);
              if (m) { emp.municipio = m[1]; emp.uf = m[2]; break; }
            }
          }
          if (!emp.municipio) emp.municipio = regiao.split(",")[0].trim();
        })
      );
      const comTelefone = empresas.filter(e => e.telefone).length;

      await emit({
        type: "etapa", numero: 2, total: 9, nome: "Localização e Telefone (Maps)", status: "concluido",
        resultado: `${comTelefone} telefones coletados`,
        empresas: empresas.map(e => ({ nome: e.nome, razao_social: e.razao_social, telefone: e.telefone, municipio: e.municipio, uf: e.uf, website: e.website, score: 0, classificacao: "COLD" })),
      });

      // ── ETAPA 3 — Validação CNPJ ──────────────────────────────────────────
      await emit({ type: "etapa", numero: 3, total: 9, nome: "Validação CNPJ (Receita Federal)", status: "iniciando" });
      await emit({ type: "progresso", mensagem: `🏢 Validando CNPJs para ${empresas.length} empresas...` });

      // Paralelo em lotes de 5 para evitar rate limit da BrasilAPI
      const CNPJ_BATCH = 5;
      const validarEmpresa = async (emp: EmpresaRaw) => {
        if (!emp.cnpj && SERPER_KEY) {
          const results = await serperSearch(`"${emp.nome}" CNPJ ${regiao}`, SERPER_KEY, 5);
          for (const r of results) {
            const cnpj = extractCnpj(`${r.title ?? ""} ${r.snippet ?? ""}`);
            if (cnpj) { emp.cnpj = cnpj; break; }
          }
        }
        if (emp.cnpj) {
          const dados = await brasilApiCnpj(emp.cnpj);
          if (dados) {
            emp.razao_social = dados.razao_social ?? emp.razao_social;
            emp.situacao = dados.descricao_situacao_cadastral ?? "";
            emp.capital_social = dados.capital_social ?? 0;
            emp.data_abertura = dados.data_inicio_atividade ?? "";
            emp.cnae = dados.cnae_fiscal_descricao ?? String(dados.cnae_fiscal ?? "");
            emp.porte = dados.porte ?? "";
            emp.municipio = dados.municipio ?? emp.municipio;
            emp.uf = dados.uf ?? emp.uf;
            const socios = (dados.qsa ?? []).map((s: any) => s.nome_socio ?? s.nome ?? "").filter(Boolean);
            emp.socios = socios.join(", ");
            if (dados.descricao_situacao_cadastral?.toUpperCase().includes("ATIVA")) {
              await emit({ type: "progresso", mensagem: `✅ ${emp.razao_social}: CNPJ ${emp.cnpj} — ATIVA` });
            } else {
              emp.classificacao = "DESCARTADO";
              emp.motivos = ["CNPJ inativo"];
              await emit({ type: "progresso", mensagem: `❌ ${emp.razao_social}: inativa — descartada` });
            }
          }
        } else {
          await emit({ type: "progresso", mensagem: `⚠️ ${emp.nome}: CNPJ não encontrado` });
        }
      };
      for (let bi = 0; bi < empresas.length; bi += CNPJ_BATCH) {
        await Promise.allSettled(empresas.slice(bi, bi + CNPJ_BATCH).map(validarEmpresa));
      }
      const validados = empresas.filter(e => e.cnpj && e.classificacao !== "DESCARTADO").length;
      const descartadosInativos = empresas.filter(e => e.motivos?.includes("CNPJ inativo")).length;

      const ativas = empresas.filter(e => e.classificacao !== "DESCARTADO");
      await emit({
        type: "etapa", numero: 3, total: 9, nome: "Validação CNPJ (Receita Federal)", status: "concluido",
        resultado: `${validados} validados, ${descartadosInativos} descartados (inativos)`,
        empresas: empresas.map(e => ({ nome: e.nome, razao_social: e.razao_social, cnpj: e.cnpj, situacao: e.situacao, municipio: e.municipio, uf: e.uf, capital_social: e.capital_social, score: 0, classificacao: e.classificacao })),
      });

      // ── ETAPA 4 — Filtro de Capital Social ────────────────────────────────
      await emit({ type: "etapa", numero: 4, total: 9, nome: "Filtro de Capital Social", status: "iniciando" });
      await emit({ type: "progresso", mensagem: `💰 Filtrando por capital social mínimo R$ ${capital_min.toLocaleString("pt-BR")}...` });

      let descartadasCapital = 0;
      for (const emp of ativas) {
        if (emp.capital_social !== undefined && emp.capital_social < capital_min) {
          emp.classificacao = "DESCARTADO";
          emp.motivos = [...(emp.motivos ?? []), `Capital R$ ${emp.capital_social?.toLocaleString("pt-BR")} abaixo do mínimo`];
          descartadasCapital++;
          await emit({ type: "progresso", mensagem: `❌ ${emp.razao_social}: capital R$ ${emp.capital_social?.toLocaleString("pt-BR")} — descartada` });
        } else {
          await emit({ type: "progresso", mensagem: `✅ ${emp.razao_social}: capital R$ ${emp.capital_social?.toLocaleString("pt-BR") ?? "N/D"}` });
        }
      }

      const ativas4 = empresas.filter(e => e.classificacao !== "DESCARTADO");
      await emit({
        type: "etapa", numero: 4, total: 9, nome: "Filtro de Capital Social", status: "concluido",
        resultado: `${descartadasCapital} descartadas, ${ativas4.length} ativas`,
        empresas: empresas.map(e => ({ nome: e.nome, razao_social: e.razao_social, cnpj: e.cnpj, capital_social: e.capital_social, score: 0, classificacao: e.classificacao })),
      });

      // ── ETAPA 5 — Estimativa de Funcionários ──────────────────────────────
      await emit({ type: "etapa", numero: 5, total: 9, nome: "Estimativa de Funcionários", status: "iniciando" });
      await emit({ type: "progresso", mensagem: `👥 Estimando funcionários para ${ativas4.length} empresas...` });

      if (GEMINI_KEY && ativas4.length > 0) {
        try {
          const listaPrompt = ativas4.map(e =>
            `- ${e.razao_social} (CNPJ: ${e.cnpj ?? "N/D"}, Porte: ${e.porte ?? "N/D"}, Capital: R$ ${e.capital_social?.toLocaleString("pt-BR") ?? "N/D"})`
          ).join("\n");
          const txt = await gemini(
            `Para cada empresa abaixo, estime a faixa de funcionários com base no porte e capital social.\n${listaPrompt}\n\n` +
            `Responda APENAS com JSON array na mesma ordem: [{"razao_social":"...","funcionarios":"X a Y funcionários"}]. Sem explicação.`,
            GEMINI_KEY,
          );
          const match = txt.match(/\[[\s\S]*\]/);
          if (match) {
            const estimativas: { razao_social: string; funcionarios: string }[] = JSON.parse(match[0]);
            for (const est of estimativas) {
              const emp = ativas4.find(e => e.razao_social.toLowerCase().includes(est.razao_social.toLowerCase().slice(0, 10)));
              if (emp) {
                emp.funcionarios = est.funcionarios;
                await emit({ type: "progresso", mensagem: `👤 ${emp.razao_social}: ${emp.funcionarios}` });
              }
            }
          }
        } catch (err) {
          await emit({ type: "progresso", mensagem: `⚠️ Estimativa via IA indisponível: ${(err as Error).message}` });
        }
      }

      await emit({
        type: "etapa", numero: 5, total: 9, nome: "Estimativa de Funcionários", status: "concluido",
        resultado: `${ativas4.filter(e => e.funcionarios).length} estimativas`,
        empresas: ativas4.map(e => ({ nome: e.nome, razao_social: e.razao_social, cnpj: e.cnpj, funcionarios: e.funcionarios, porte: e.porte, score: 0, classificacao: e.classificacao })),
      });

      // ── ETAPA 6 — Análise de Sócios ───────────────────────────────────────
      await emit({ type: "etapa", numero: 6, total: 9, nome: "Análise de Sócios (LinkedIn)", status: "iniciando" });
      await emit({ type: "progresso", mensagem: `🤝 Analisando sócios de ${ativas4.length} empresas...` });

      const sociosTI = ["cto", "tech", "ti", "tecnologia", "software", "systems", "digital"];
      // Só chama Serper quando não veio sócio do QSA (BrasilAPI). Uma busca por empresa, com timeout.
      await Promise.allSettled(
        ativas4.map(async (emp) => {
          if (SERPER_KEY && (!emp.socios || emp.socios === "")) {
            const results = await serperSearch(`"${emp.razao_social}" sócios diretores site:linkedin.com`, SERPER_KEY, 3);
            const nomes: string[] = [];
            for (const r of results) {
              const m = r.title?.match(/^(.+?)\s*[-–|]/);
              if (m) nomes.push(m[1].trim());
            }
            if (nomes.length) emp.socios = nomes.slice(0, 3).join(", ");
          }
          // Heurística local: marca TI se o cargo/nome do 1º sócio mencionar termo de TI.
          // (Antes fazia uma 2ª busca Serper "LinkedIn CTO" — removida: travava e é pouco confiável.)
          if (emp.socios) {
            const primeiro = emp.socios.split(",")[0]?.trim().toLowerCase() ?? "";
            const cnaeTI = (emp.cnae ?? "").toLowerCase();
            emp.tem_socio_ligado_ti =
              sociosTI.some(kw => primeiro.includes(kw)) ||
              sociosTI.some(kw => cnaeTI.includes(kw));
            await emit({ type: "progresso", mensagem: `🤝 ${emp.razao_social}: ${emp.socios.split(",")[0]?.trim()}${emp.tem_socio_ligado_ti ? " (TI)" : ""}` });
          }
        })
      );
      const comSocioTI = ativas4.filter(e => e.tem_socio_ligado_ti).length;

      await emit({
        type: "etapa", numero: 6, total: 9, nome: "Análise de Sócios (LinkedIn)", status: "concluido",
        resultado: `${ativas4.filter(e => e.socios).length} com sócios, ${comSocioTI} ligados a TI`,
        empresas: ativas4.map(e => ({ nome: e.nome, razao_social: e.razao_social, cnpj: e.cnpj, socios: e.socios, tem_socio_ligado_ti: e.tem_socio_ligado_ti, score: 0, classificacao: e.classificacao })),
      });

      // ── ETAPA 7 — Saúde Financeira (Serasa) ───────────────────────────────
      await emit({ type: "etapa", numero: 7, total: 9, nome: "Saúde Financeira (Serasa)", status: "iniciando" });
      await emit({ type: "progresso", mensagem: `🛡 Verificando saúde financeira de ${ativas4.length} empresas...` });

      if (GEMINI_KEY && ativas4.length > 0) {
        try {
          const lista = ativas4.map(e =>
            `- ${e.razao_social} (Capital: R$ ${e.capital_social?.toLocaleString("pt-BR") ?? "N/D"}, Data abertura: ${e.data_abertura ?? "N/D"}, Porte: ${e.porte ?? "N/D"})`
          ).join("\n");
          const txt = await gemini(
            `Com base nos dados disponíveis, avalie a saúde financeira de cada empresa abaixo.\n${lista}\n\n` +
            `Responda APENAS com JSON array: [{"razao_social":"...","serasa":"Sem restrições | Risco baixo | Risco médio | Risco alto"}]. Sem explicação.`,
            GEMINI_KEY,
          );
          const match = txt.match(/\[[\s\S]*\]/);
          if (match) {
            const avaliacoes: { razao_social: string; serasa: string }[] = JSON.parse(match[0]);
            for (const av of avaliacoes) {
              const emp = ativas4.find(e => e.razao_social.toLowerCase().includes(av.razao_social.toLowerCase().slice(0, 10)));
              if (emp) {
                emp.serasa = av.serasa;
                await emit({ type: "progresso", mensagem: `🛡 ${emp.razao_social}: ${emp.serasa}` });
              }
            }
          }
        } catch (err) {
          await emit({ type: "progresso", mensagem: `⚠️ Verificação Serasa indisponível: ${(err as Error).message}` });
        }
      }

      await emit({
        type: "etapa", numero: 7, total: 9, nome: "Saúde Financeira (Serasa)", status: "concluido",
        resultado: `${ativas4.filter(e => e.serasa).length} verificadas`,
        empresas: ativas4.map(e => ({ nome: e.nome, razao_social: e.razao_social, cnpj: e.cnpj, serasa: e.serasa, score: 0, classificacao: e.classificacao })),
      });

      // ── ETAPA 8 — Detecção de SaaS ────────────────────────────────────────
      await emit({ type: "etapa", numero: 8, total: 9, nome: "Detecção de SaaS Utilizados", status: "iniciando" });
      await emit({ type: "progresso", mensagem: `💻 Detectando SaaS utilizados por ${ativas4.length} empresas...` });

      const SAAS_KEYWORDS = ["SAP", "TOTVS", "Oracle", "Salesforce", "HubSpot", "Pipedrive", "RD Station", "Conta Azul", "Omie", "Senior", "Sankhya"];

      await Promise.allSettled(
        ativas4.map(async (emp) => {
          if (!SERPER_KEY) return;
          const results = await serperSearch(
            `"${emp.razao_social}" ${SAAS_KEYWORDS.slice(0, 5).join(" OR ")}`,
            SERPER_KEY, 5,
          );
          const detected: string[] = [];
          for (const r of results) {
            for (const kw of SAAS_KEYWORDS) {
              if ((`${r.title ?? ""} ${r.snippet ?? ""}`).toLowerCase().includes(kw.toLowerCase())) {
                if (!detected.includes(kw)) detected.push(kw);
              }
            }
          }
          if (detected.length) {
            emp.saas = detected.join(", ");
            await emit({ type: "progresso", mensagem: `💻 ${emp.razao_social}: ${emp.saas}` });
          } else {
            await emit({ type: "progresso", mensagem: `💻 ${emp.razao_social}: nenhum SaaS detectado` });
          }
        })
      );

      await emit({
        type: "etapa", numero: 8, total: 9, nome: "Detecção de SaaS Utilizados", status: "concluido",
        resultado: `${ativas4.filter(e => e.saas).length} com SaaS detectado`,
        empresas: ativas4.map(e => ({ nome: e.nome, razao_social: e.razao_social, cnpj: e.cnpj, saas: e.saas, score: 0, classificacao: e.classificacao })),
      });

      // ── ETAPA 9 — Score Final e Classificação ─────────────────────────────
      await emit({ type: "etapa", numero: 9, total: 9, nome: "Score Final e Classificação", status: "iniciando" });
      await emit({ type: "progresso", mensagem: `🏆 Calculando score final para ${ativas4.length} empresas...` });

      for (const emp of ativas4) {
        let score = 0;
        const motivos: string[] = [];

        // Capital social (0-25)
        if (emp.capital_social) {
          if (emp.capital_social >= 1_000_000) { score += 25; motivos.push("Capital alto"); }
          else if (emp.capital_social >= 200_000) { score += 15; motivos.push("Capital médio"); }
          else if (emp.capital_social >= 50_000) { score += 8; }
        }

        // Telefone (0-15)
        if (emp.telefone) { score += 15; motivos.push("Contato disponível"); }

        // Website (0-10)
        if (emp.website) { score += 10; motivos.push("Presença online"); }

        // Sócios (0-10)
        if (emp.socios) score += 5;
        if (emp.tem_socio_ligado_ti) { score += 10; motivos.push("Sócio TI"); }

        // Funcionários (0-15)
        if (emp.funcionarios) {
          const nums = emp.funcionarios.match(/\d+/g);
          if (nums) {
            const max = Math.max(...nums.map(Number));
            if (max >= 100) { score += 15; motivos.push(`${max}+ funcionários`); }
            else if (max >= 20) { score += 10; motivos.push(`${max} funcionários`); }
            else score += 5;
          }
        }

        // Serasa (0-15)
        if (emp.serasa?.includes("Sem restrições")) { score += 15; motivos.push("Serasa limpo"); }
        else if (emp.serasa?.includes("baixo")) score += 10;
        else if (emp.serasa?.includes("médio")) score += 5;

        // SaaS (0-10) — usa SaaS legado → oportunidade de troca
        if (emp.saas) {
          const legacy = ["SAP", "TOTVS", "Oracle"];
          if (legacy.some(l => emp.saas?.includes(l))) { score += 10; motivos.push("Usa ERP legado"); }
          else score += 5;
        }

        emp.score = Math.min(score, 100);
        emp.motivos = motivos;

        if (emp.score >= 70) emp.classificacao = "HOT";
        else if (emp.score >= 40) emp.classificacao = "WARM";
        else if (emp.score >= 20) emp.classificacao = "COLD";
        else { emp.classificacao = "DESCARTADO"; }

        await emit({ type: "progresso", mensagem: `🎯 ${emp.razao_social}: ${emp.score}/100 — ${emp.classificacao}` });
      }

      const qualificados = empresas.filter(e => e.classificacao !== "DESCARTADO");
      const hot = qualificados.filter(e => e.classificacao === "HOT").length;
      const warm = qualificados.filter(e => e.classificacao === "WARM").length;
      const cold = qualificados.filter(e => e.classificacao === "COLD").length;

      await emit({
        type: "etapa", numero: 9, total: 9, nome: "Score Final e Classificação", status: "concluido",
        resultado: `${hot} HOT, ${warm} WARM, ${cold} COLD`,
        empresas: qualificados.sort((a, b) => b.score - a.score),
      });

      // ── Relatório final ───────────────────────────────────────────────────
      const resumo = {
        total_pesquisadas: empresas.length,
        hot,
        warm,
        cold,
        descartados: empresas.length - qualificados.length,
        com_telefone: empresas.filter(e => e.telefone).length,
      };

      await emit({ type: "relatorio", empresas: qualificados, resumo });

      // Salva no banco
      if (tenant_id && campanha_id) {
        await salvarEmpresas(supabaseClient, qualificados, campanha_id, tenant_id);
        await supabaseClient
          .from("ia_campanhas")
          .update({
            status: "concluido",
            total_encontradas: empresas.length,
            total_qualificadas: qualificados.length,
            updated_at: new Date().toISOString(),
          })
          .eq("id", campanha_id);
      }

      await emit({ type: "done", qualificados: qualificados.length });
    } catch (err: any) {
      console.error("[ia-prospeccao] erro:", err);
      await emit({ type: "error", message: err.message ?? "Erro interno" });
    } finally {
      await writer.close();
    }
  })();

  return response;
});
