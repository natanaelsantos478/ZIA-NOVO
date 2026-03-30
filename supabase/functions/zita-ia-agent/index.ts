// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent";

// ─── TIPOS ───────────────────────────────────────────────────────────────────

interface JwtClaims {
  sub: string;
  exp: number;
  app_metadata: {
    profile_id:  string;
    entity_id:   string;
    entity_type: string;
    scope_ids:   string[];
    is_admin:    boolean;
    holding_id:  string;
  };
}

// ─── VERIFICAÇÃO JWT ──────────────────────────────────────────────────────────

async function verifyJwt(token: string, secret: string): Promise<JwtClaims> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('JWT mal formado');
  const [header, payload, sig] = parts;

  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'],
  );

  const pad = (s: string) => s + '='.repeat((4 - s.length % 4) % 4);
  const sigBytes = Uint8Array.from(
    atob(pad(sig.replace(/-/g, '+').replace(/_/g, '/'))),
    c => c.charCodeAt(0),
  );
  const valid = await crypto.subtle.verify(
    'HMAC', key, sigBytes,
    new TextEncoder().encode(`${header}.${payload}`),
  );
  if (!valid) throw new Error('Assinatura JWT inválida');

  const claims = JSON.parse(atob(pad(payload.replace(/-/g, '+').replace(/_/g, '/'))));
  if (claims.exp < Math.floor(Date.now() / 1000)) throw new Error('Token expirado');

  return claims as JwtClaims;
}

interface Perfil {
  id: string;
  entity_id: string;
  entity_type: string;
  level: number;
  name: string;
  active: boolean;
}

interface AcessoInfo {
  tipo: "global" | "matrix" | "branch";
  filtro: Record<string, string> | null;
}

// ─── VALIDAR TOKEN E RESOLVER PERFIL ─────────────────────────────────────────

async function resolverPerfil(
  req: Request,
  supabase: ReturnType<typeof createClient>
): Promise<Perfil> {
  const token = req.headers.get("x-zita-token");
  if (!token) throw new Error("Token de sessão não fornecido");

  const jwtSecret = Deno.env.get("SUPABASE_JWT_SECRET");
  if (!jwtSecret) throw new Error("Servidor mal configurado");

  let claims: JwtClaims;
  try {
    claims = await verifyJwt(token, jwtSecret);
  } catch (e: unknown) {
    throw new Error(`Token inválido: ${(e as Error).message}`);
  }

  const profileId = claims.app_metadata?.profile_id;
  if (!profileId) throw new Error("Token sem identificação de perfil");

  const { data: perfil, error } = await supabase
    .from("zia_operator_profiles")
    .select("id, entity_id, entity_type, level, name, active")
    .eq("id", profileId)
    .single();

  if (error || !perfil) throw new Error("Perfil não encontrado");
  if (!perfil.active) throw new Error("Perfil inativo");
  return perfil as Perfil;
}

// ─── RESOLVER FILTRO DE TENANT ────────────────────────────────────────────────

function resolverFiltroTenant(perfil: Perfil): AcessoInfo {
  if (perfil.entity_type === "holding") {
    return { tipo: "global", filtro: null };
  }
  if (perfil.entity_type === "matrix") {
    return { tipo: "matrix", filtro: { matrix_id: perfil.entity_id } };
  }
  return { tipo: "branch", filtro: { tenant_id: perfil.entity_id } };
}

// ─── FERRAMENTAS GEMINI ───────────────────────────────────────────────────────

const FERRAMENTAS = [
  {
    name: "buscar_dados",
    description:
      "Busca dados em qualquer tabela do sistema. Use para consultar informações antes de agir.",
    parameters: {
      type: "OBJECT",
      properties: {
        tabela: {
          type: "STRING",
          description: "Nome da tabela (ex: erp_pedidos, employees, crm_negociacoes)",
        },
        filtros: {
          type: "OBJECT",
          description: "Filtros adicionais como objeto JSON",
        },
        colunas: {
          type: "STRING",
          description: "Colunas a retornar (padrão: *)",
        },
        limite: {
          type: "NUMBER",
          description: "Máximo de registros (padrão: 20)",
        },
        ordenar_por: {
          type: "STRING",
          description: "Campo.direção (ex: created_at.desc)",
        },
      },
      required: ["tabela"],
    },
  },
  {
    name: "criar_registro",
    description: "Cria um novo registro em qualquer tabela do sistema.",
    parameters: {
      type: "OBJECT",
      properties: {
        tabela: { type: "STRING" },
        dados: {
          type: "OBJECT",
          description:
            "Dados do registro. NÃO inclua tenant_id — é adicionado automaticamente.",
        },
      },
      required: ["tabela", "dados"],
    },
  },
  {
    name: "editar_registro",
    description: "Edita registros existentes.",
    parameters: {
      type: "OBJECT",
      properties: {
        tabela: { type: "STRING" },
        id: {
          type: "STRING",
          description: "UUID do registro (para editar 1 específico)",
        },
        filtros: {
          type: "OBJECT",
          description: "Filtros para editar múltiplos",
        },
        dados: { type: "OBJECT", description: "Campos a atualizar" },
      },
      required: ["tabela", "dados"],
    },
  },
  {
    name: "deletar_registro",
    description: "Deleta registros.",
    parameters: {
      type: "OBJECT",
      properties: {
        tabela: { type: "STRING" },
        id: { type: "STRING" },
        filtros: { type: "OBJECT" },
      },
      required: ["tabela"],
    },
  },
  {
    name: "executar_sql",
    description:
      "Query SQL para análises complexas. Apenas SELECT. Use {{TENANT_ID}} para filtrar por empresa.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: {
          type: "STRING",
          description:
            "Query SELECT. Use {{TENANT_ID}} onde precisar filtrar por empresa.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "gerar_relatorio",
    description:
      "Relatórios consolidados: faturamento, estoque, comissões, pedidos, etc.",
    parameters: {
      type: "OBJECT",
      properties: {
        tipo: {
          type: "STRING",
          enum: [
            "faturamento_mes",
            "estoque_critico",
            "comissoes_pendentes",
            "margem_produtos",
            "pedidos_abertos",
            "top_produtos",
            "top_vendedores",
            "inadimplencia",
          ],
        },
        periodo_inicio: { type: "STRING", description: "YYYY-MM-DD" },
        periodo_fim: { type: "STRING", description: "YYYY-MM-DD" },
      },
      required: ["tipo"],
    },
  },
  {
    name: "enviar_notificacao",
    description: "Cria alertas no sistema.",
    parameters: {
      type: "OBJECT",
      properties: {
        titulo: { type: "STRING" },
        mensagem: { type: "STRING" },
        tipo: { type: "STRING", enum: ["info", "alerta", "urgente"] },
      },
      required: ["titulo", "mensagem", "tipo"],
    },
  },

  // ── Ferramentas EAM ──────────────────────────────────────────────────────────

  {
    name: "buscar_ativo",
    description: "Busca um ativo patrimonial por tag, nome ou número de série.",
    parameters: {
      type: "OBJECT",
      properties: {
        q: { type: "STRING", description: "Tag (ex: PAT-2025-00001), nome ou número de série" },
      },
      required: ["q"],
    },
  },
  {
    name: "listar_manutencoes_atrasadas",
    description: "Lista ordens de serviço e planos de manutenção preventiva com prazo vencido.",
    parameters: { type: "OBJECT", properties: {}, required: [] },
  },
  {
    name: "calcular_valor_patrimonio",
    description: "Retorna o valor total histórico e contábil do patrimônio da empresa.",
    parameters: { type: "OBJECT", properties: {}, required: [] },
  },
  {
    name: "verificar_garantia_ativo",
    description: "Verifica o status de garantia de um ativo específico.",
    parameters: {
      type: "OBJECT",
      properties: {
        asset_id: { type: "STRING", description: "UUID do ativo" },
      },
      required: ["asset_id"],
    },
  },
  {
    name: "listar_ativos_sem_responsavel",
    description: "Lista ativos patrimoniais que não possuem responsável designado.",
    parameters: { type: "OBJECT", properties: {}, required: [] },
  },
  {
    name: "listar_alertas_ativos",
    description: "Lista alertas ativos do módulo de patrimônio (garantias, seguros, OS, etc.).",
    parameters: {
      type: "OBJECT",
      properties: {
        tipo: { type: "STRING", description: "Filtrar por tipo: warranty_expiring, insurance_expiring, os_overdue, no_responsible, maintenance_overdue" },
      },
      required: [],
    },
  },
];

// ─── EXECUTOR DE FERRAMENTAS ──────────────────────────────────────────────────

async function executarFerramenta(
  nome: string,
  params: Record<string, unknown>,
  supabase: ReturnType<typeof createClient>,
  perfil: Perfil,
  acesso: AcessoInfo
): Promise<unknown> {
  const tenantId = perfil.entity_id;

  // Aplica filtro de tenant em qualquer query Supabase
  const aplicarFiltro = (q: any): any => {
    if (!acesso.filtro) return q;
    for (const [k, v] of Object.entries(acesso.filtro)) {
      q = q.eq(k, v);
    }
    return q;
  };

  switch (nome) {
    case "buscar_dados": {
      const { tabela, filtros, colunas, limite, ordenar_por } = params as {
        tabela: string;
        filtros?: Record<string, unknown>;
        colunas?: string;
        limite?: number;
        ordenar_por?: string;
      };
      let q = supabase.from(tabela).select(colunas ?? "*").limit(limite ?? 20);
      if (filtros) {
        for (const [k, v] of Object.entries(filtros)) q = q.eq(k, String(v));
      }
      q = aplicarFiltro(q);
      if (ordenar_por) {
        const [campo, dir] = ordenar_por.split(".");
        q = q.order(campo, { ascending: dir !== "desc" });
      }
      const { data, error } = await q;
      if (error) throw error;
      return { registros: data, total: data?.length ?? 0 };
    }

    case "criar_registro": {
      const { tabela, dados } = params as {
        tabela: string;
        dados: Record<string, unknown>;
      };
      // tenant_id sempre vem do token — nunca do Gemini
      const payload = { ...dados, tenant_id: tenantId };
      const { data, error } = await supabase
        .from(tabela)
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return { criado: true, registro: data };
    }

    case "editar_registro": {
      const { tabela, id, filtros, dados } = params as {
        tabela: string;
        id?: string;
        filtros?: Record<string, unknown>;
        dados: Record<string, unknown>;
      };
      // Remove tenant_id dos dados — não pode ser sobrescrito
      const { tenant_id: _t, ...dadosLimpos } = dados as {
        tenant_id?: unknown;
        [k: string]: unknown;
      };
      let q: any = supabase.from(tabela).update(dadosLimpos);
      if (id) q = q.eq("id", id);
      if (filtros) {
        for (const [k, v] of Object.entries(filtros)) q = q.eq(k, String(v));
      }
      q = aplicarFiltro(q);
      const { data, error } = await q.select();
      if (error) throw error;
      return { editado: true, registros_afetados: (data as unknown[])?.length ?? 0 };
    }

    case "deletar_registro": {
      const { tabela, id, filtros } = params as {
        tabela: string;
        id?: string;
        filtros?: Record<string, unknown>;
      };
      let q: any = supabase.from(tabela).delete();
      if (id) q = q.eq("id", id);
      if (filtros) {
        for (const [k, v] of Object.entries(filtros)) q = q.eq(k, String(v));
      }
      q = aplicarFiltro(q);
      const { error } = await q;
      if (error) throw error;
      return { deletado: true };
    }

    case "executar_sql": {
      const { query } = params as { query: string };
      if (!query.trim().toUpperCase().startsWith("SELECT")) {
        throw new Error("Apenas queries SELECT são permitidas");
      }
      const queryComTenant = query.replace(/\{\{TENANT_ID\}\}/g, `'${tenantId}'`);
      const { data, error } = await supabase.rpc("executar_query_ia", {
        p_query: queryComTenant,
        p_tenant_id: tenantId,
      });
      if (error) throw error;
      return { resultado: data };
    }

    case "gerar_relatorio": {
      const { tipo, periodo_inicio, periodo_fim } = params as {
        tipo: string;
        periodo_inicio?: string;
        periodo_fim?: string;
      };
      const hoje = new Date();
      const inicio =
        periodo_inicio ??
        new Date(hoje.getFullYear(), hoje.getMonth(), 1)
          .toISOString()
          .split("T")[0];
      const fim = periodo_fim ?? hoje.toISOString().split("T")[0];

      const relatorios: Record<string, () => Promise<unknown>> = {
        faturamento_mes: async () => {
          let q = supabase
            .from("erp_pedidos")
            .select("total_pedido")
            .eq("status", "FATURADO")
            .gte("data_emissao", inicio)
            .lte("data_emissao", fim);
          q = aplicarFiltro(q);
          const { data } = await q;
          return {
            total:
              data?.reduce((s: number, p: any) => s + Number(p.total_pedido), 0) ?? 0,
            pedidos: data?.length ?? 0,
          };
        },
        estoque_critico: async () => {
          let q = supabase
            .from("erp_produtos")
            .select("nome, estoque_atual, estoque_minimo, estoque_disponivel")
            .eq("ativo", true);
          q = aplicarFiltro(q);
          const { data } = await q;
          const criticos = (data ?? []).filter(
            (p: any) => Number(p.estoque_atual) <= Number(p.estoque_minimo ?? 0)
          );
          return { criticos: criticos.length, produtos: criticos };
        },
        pedidos_abertos: async () => {
          let q = supabase
            .from("erp_pedidos")
            .select("numero, status, total_pedido")
            .in("status", ["ORCAMENTO", "CONFIRMADO"]);
          q = aplicarFiltro(q);
          const { data } = await q;
          return {
            total: data?.length ?? 0,
            valor:
              data?.reduce((s: number, p: any) => s + Number(p.total_pedido), 0) ?? 0,
          };
        },
        comissoes_pendentes: async () => {
          let q = supabase
            .from("erp_comissoes_lancamentos")
            .select("employee_id, comissao_valor")
            .eq("status", "PENDENTE");
          q = aplicarFiltro(q);
          const { data } = await q;
          return {
            total_valor:
              data?.reduce((s: number, c: any) => s + Number(c.comissao_valor), 0) ?? 0,
            registros: data?.length ?? 0,
          };
        },
      };

      const fn = relatorios[tipo];
      if (!fn) return { erro: `Relatório '${tipo}' não encontrado` };
      return await fn();
    }

    case "enviar_notificacao": {
      const { titulo, mensagem, tipo } = params as {
        titulo: string;
        mensagem: string;
        tipo: string;
      };
      const { error } = await supabase.from("hr_alerts").insert({
        title: titulo,
        message: mensagem,
        type: tipo,
        tenant_id: tenantId,
      });
      if (error) throw error;
      return { notificacao_criada: true };
    }

    // ── EAM tools ──────────────────────────────────────────────────────────────

    case "buscar_ativo": {
      const { q } = params as { q: string };
      const { data, error } = await aplicarFiltro(
        supabase
          .from("assets")
          .select("id,tag,name,status,asset_type,responsible_name,department_name,acquisition_value,current_book_value,warranty_end")
          .or(`tag.ilike.%${q}%,name.ilike.%${q}%,serial_number.ilike.%${q}%`)
          .limit(10)
      );
      if (error) throw error;
      return { ativos: data ?? [] };
    }

    case "listar_manutencoes_atrasadas": {
      const today = new Date().toISOString().split("T")[0];
      const [orders, plans] = await Promise.all([
        aplicarFiltro(
          supabase
            .from("asset_work_orders")
            .select("id,title,status,type,opened_at,asset_id")
            .not("status", "in", "(concluida,cancelada)")
            .lt("opened_at", new Date(Date.now() - 30 * 86400000).toISOString())
        ),
        aplicarFiltro(
          supabase
            .from("asset_maintenance_plans")
            .select("id,name,next_due_date,trigger_value,trigger_unit,asset_id")
            .eq("status", "ativo")
            .lt("next_due_date", today)
        ),
      ]);
      return {
        ordens_atrasadas: orders.data ?? [],
        planos_vencidos: plans.data ?? [],
      };
    }

    case "calcular_valor_patrimonio": {
      const { data, error } = await aplicarFiltro(
        supabase
          .from("assets")
          .select("acquisition_value,current_book_value,status")
          .not("status", "in", "(descartado,alienado)")
      );
      if (error) throw error;
      const assets = data ?? [];
      const totalHistorico = assets.reduce((s: number, a: any) => s + Number(a.acquisition_value ?? 0), 0);
      const totalContabil = assets.reduce((s: number, a: any) => s + Number(a.current_book_value ?? a.acquisition_value ?? 0), 0);
      return {
        total_ativos: assets.length,
        valor_historico: totalHistorico,
        valor_contabil: totalContabil,
        depreciacao_acumulada: totalHistorico - totalContabil,
      };
    }

    case "verificar_garantia_ativo": {
      const { asset_id } = params as { asset_id: string };
      const { data, error } = await supabase
        .from("assets")
        .select("id,tag,name,warranty_start,warranty_end,warranty_supplier")
        .eq("id", asset_id)
        .single();
      if (error) throw error;
      if (!data) return { erro: "Ativo não encontrado" };
      const hoje = new Date();
      const venc = data.warranty_end ? new Date(data.warranty_end) : null;
      const dias = venc ? Math.ceil((venc.getTime() - hoje.getTime()) / 86400000) : null;
      return {
        ...data,
        garantia_vigente: venc ? venc > hoje : false,
        dias_restantes: dias,
      };
    }

    case "listar_ativos_sem_responsavel": {
      const { data, error } = await aplicarFiltro(
        supabase
          .from("assets")
          .select("id,tag,name,status,asset_type,department_name,updated_at")
          .is("responsible_id", null)
          .is("responsible_name", null)
          .not("status", "in", "(descartado,alienado,em_aquisicao)")
          .order("updated_at", { ascending: true })
          .limit(50)
      );
      if (error) throw error;
      return { ativos_sem_responsavel: data ?? [], total: (data ?? []).length };
    }

    case "listar_alertas_ativos": {
      const { tipo } = params as { tipo?: string };
      let q = aplicarFiltro(
        supabase
          .from("eam_asset_alerts")
          .select("*")
          .eq("resolved", false)
          .order("created_at", { ascending: false })
          .limit(50)
      );
      if (tipo) q = q.eq("type", tipo);
      const { data, error } = await q;
      if (error) throw error;
      return { alertas: data ?? [], total: (data ?? []).length };
    }

    default:
      throw new Error(`Ferramenta desconhecida: ${nome}`);
  }
}

// ─── HANDLER PRINCIPAL ────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const CORS = buildCors(req.headers.get('Origin'));
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) throw new Error("GEMINI_API_KEY não configurada");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── Segurança: validar perfil via token ──────────────────────────────────
    const perfil = await resolverPerfil(req, supabase);
    const acesso = resolverFiltroTenant(perfil);

    const body = (await req.json()) as {
      mensagem: string;
      historico?: { role: string; content: string }[];
      conversa_id?: string;
      contexto_pagina?: string;
      agente_id?: string;
    };

    const { mensagem, historico = [], conversa_id, contexto_pagina, agente_id } = body;

    const BASE_PROMPT = `Você é a IA do ZIA ERP — assistente executivo do sistema.
Usuário: ${perfil.name} | Tipo: ${perfil.entity_type} | Acesso: ${acesso.tipo}
Contexto atual: ${contexto_pagina ?? "Tela inicial"}
Você tem autonomia para consultar dados e executar ações. Responda em português brasileiro de forma objetiva.
Quando executar ações, informe o que foi feito e o resultado.
${acesso.tipo === "global" ? "Este usuário tem acesso TOTAL — nível Holding." : ""}
${acesso.tipo === "matrix" ? `Acesso à matrix ${perfil.entity_id} e suas filiais.` : ""}
${acesso.tipo === "branch" ? `Acesso restrito à filial ${perfil.entity_id}.` : ""}
Tabelas disponíveis: employees, crm_negociacoes, crm_orcamentos, erp_pedidos, erp_produtos,
erp_clientes, erp_fornecedores, erp_estoque_movimentos, erp_financeiro_lancamentos,
fin_nos_custo, erp_comissoes_lancamentos, erp_assinaturas, hr_alerts e outras.`;

    let SYSTEM_PROMPT = BASE_PROMPT;

    if (agente_id) {
      const { data: agente } = await supabase
        .from("ia_agentes")
        .select("nome, funcao, system_prompt, modelo_versao")
        .eq("id", agente_id)
        .single();
      if (agente) {
        const agenteHeader = `Você é o agente "${agente.nome}". Função: ${agente.funcao}`;
        SYSTEM_PROMPT = agente.system_prompt
          ? `${agenteHeader}\n\n${agente.system_prompt}\n\n${BASE_PROMPT}`
          : `${agenteHeader}\n\n${BASE_PROMPT}`;
      }
    }

    const contents = [
      ...historico.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      { role: "user", parts: [{ text: mensagem }] },
    ];

    let resposta = "";
    const acoesExecutadas: unknown[] = [];
    let iteracoes = 0;

    // Loop agentico: Gemini chama ferramentas até ter resposta final
    while (iteracoes < 10) {
      iteracoes++;

      const geminiRes = await fetch(`${GEMINI_URL}?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
          tools: [{ function_declarations: FERRAMENTAS }],
          generationConfig: { maxOutputTokens: 4096 },
        }),
      });

      const geminiData = (await geminiRes.json()) as {
        candidates?: {
          content: {
            parts: {
              text?: string;
              functionCall?: { name: string; args: Record<string, unknown> };
            }[];
          };
        }[];
        error?: { message: string };
      };

      if (geminiData.error) throw new Error(geminiData.error.message);

      const parts = geminiData.candidates?.[0]?.content?.parts ?? [];
      const funcCalls = parts.filter((p) => p.functionCall);

      if (funcCalls.length === 0) {
        resposta = parts
          .filter((p) => p.text)
          .map((p) => p.text)
          .join("");
        break;
      }

      // Executar todas as chamadas de ferramentas
      const funcResults = [];
      for (const part of funcCalls) {
        const { name, args } = part.functionCall!;
        let resultado: unknown;
        let statusAcao = "sucesso";

        try {
          resultado = await executarFerramenta(name, args, supabase, perfil, acesso);
        } catch (err) {
          resultado = { erro: String(err) };
          statusAcao = "erro";
        }

        // Log da ação (best-effort — não falha a requisição se tabela não existir)
        try {
          await supabase.from("ia_acoes_log").insert({
            tenant_id: perfil.entity_id,
            conversa_id: conversa_id ?? null,
            ferramenta: name,
            parametros: args,
            resultado,
            status: statusAcao,
            revertivel: ["criar_registro", "editar_registro"].includes(name),
          });
        } catch { /* tabela pode não existir ainda */ }

        acoesExecutadas.push({ ferramenta: name, args, resultado, status: statusAcao });
        funcResults.push({
          role: "function",
          parts: [{ functionResponse: { name, response: { resultado } } }],
        });
      }

      // Preserve ALL parts (including thought signatures) for Gemini 3.1 compatibility
      contents.push({ role: "model", parts });
      contents.push(...funcResults);
    }

    // Persistir mensagens (best-effort)
    if (conversa_id) {
      try {
        await supabase.from("ia_mensagens").insert([
          {
            conversa_id,
            tenant_id: perfil.entity_id,
            role: "user",
            conteudo: mensagem,
          },
          {
            conversa_id,
            tenant_id: perfil.entity_id,
            role: "assistant",
            conteudo: resposta,
            ferramentas_usadas: acoesExecutadas.length > 0 ? acoesExecutadas : null,
          },
        ]);
      } catch { /* tabela pode não existir ainda */ }
    }

    return new Response(
      JSON.stringify({ resposta, acoes_executadas: acoesExecutadas }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = String(err);
    const status =
      msg.includes("Token") ||
      msg.includes("Perfil") ||
      msg.includes("Sessão") ||
      msg.includes("expirada")
        ? 401
        : 500;
    return new Response(JSON.stringify({ erro: msg }), {
      status,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
