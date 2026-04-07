// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ─── CORS ────────────────────────────────────────────────────────────────────
// A gateway aceita requests de qualquer origem (IAs externas vêm de servidores variados)
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "content-type, x-zia-api-key, x-client-info, apikey, authorization",
};

function corsResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface ApiKeyRow {
  id: string;
  tenant_id: string;
  nome: string;
  status: string;
  employee_id: string | null;
  permissoes: {
    modulos: string[];
    acoes: { ler: boolean; criar: boolean; editar: boolean; deletar: boolean };
    webhooks: { receber: boolean; enviar: boolean };
    whatsapp: { ler_mensagens: boolean; enviar_mensagens: boolean; enviar_sem_comando: boolean };
    rate_limit: { requests_por_minuto: number; requests_por_dia: number };
  };
}

interface GatewayRequest {
  action: "query" | "create" | "update" | "delete" | "send_message" | "trigger_webhook" | "run_automation";
  module: "crm" | "erp" | "rh" | "financeiro" | "scm" | "eam" | "ia";
  resource?: string;
  filters?: Record<string, any>;
  data?: Record<string, any>;
  id?: string;
  page?: number;
  limit?: number;
}

// ─── Mapeamento módulo → tabelas permitidas ───────────────────────────────────
const MODULE_TABLES: Record<string, string[]> = {
  crm:        ["crm_clientes", "crm_contatos", "crm_oportunidades", "crm_atividades", "crm_anotacoes"],
  erp:        ["erp_pedidos", "erp_produtos", "erp_orcamentos", "erp_notas_fiscais"],
  rh:         ["hr_employees", "hr_payroll", "hr_absences", "hr_timesheet"],
  financeiro: ["fin_contas_pagar", "fin_contas_receber", "fin_transacoes", "fin_caixa"],
  scm:        ["scm_estoque", "scm_pedidos_compra", "scm_fornecedores"],
  eam:        ["eam_assets", "eam_maintenance_orders", "eam_work_orders"],
  ia:         ["ia_conversas", "ia_mensagens"],
};

// ─── Handler principal ───────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return corsResponse({ error: "Method not allowed" }, 405);

  const startTime = Date.now();

  // Criar cliente Supabase com service_role para validação da key
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  // ── 1. Extrair e validar a API Key ─────────────────────────────────────────
  const apiKeyHeader = req.headers.get("x-zia-api-key");
  if (!apiKeyHeader || !apiKeyHeader.startsWith("zita_")) {
    return corsResponse({ error: "Missing or invalid X-ZIA-API-Key header" }, 401);
  }

  const { data: keyRow, error: keyError } = await supabaseAdmin
    .from("ia_api_keys")
    .select("*")
    .eq("api_key", apiKeyHeader)
    .eq("status", "ativo")
    .single();

  if (keyError || !keyRow) {
    return corsResponse({ error: "Invalid or revoked API key" }, 401);
  }

  const key = keyRow as ApiKeyRow;

  // ── 2. Rate limiting (contagem de requests na última hora) ─────────────────
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count: recentCount } = await supabaseAdmin
    .from("ia_api_logs")
    .select("*", { count: "exact", head: true })
    .eq("api_key_id", key.id)
    .gte("created_at", oneHourAgo);

  const maxPerHour = (key.permissoes.rate_limit?.requests_por_minuto ?? 60) * 60;
  if ((recentCount ?? 0) >= maxPerHour) {
    await logRequest(supabaseAdmin, key, req, "/ia-api-gateway", "POST", 429, startTime, null, "Rate limit exceeded");
    return corsResponse({
      error: "Rate limit exceeded",
      limit: maxPerHour,
      reset_in: "up to 1 hour",
    }, 429);
  }

  // ── 3. Parse do body ────────────────────────────────────────────────────────
  let body: GatewayRequest;
  try {
    body = await req.json();
  } catch {
    await logRequest(supabaseAdmin, key, req, "/ia-api-gateway", "POST", 400, startTime, null, "Invalid JSON body");
    return corsResponse({ error: "Invalid JSON body" }, 400);
  }

  const { action, module: mod, resource, filters, data, id, page = 1, limit: pageLimit = 20 } = body;

  if (!action || !mod) {
    return corsResponse({ error: "Missing required fields: action, module" }, 400);
  }

  // ── 4. Verificar permissão de módulo ───────────────────────────────────────
  const allowedModules: string[] = key.permissoes.modulos ?? [];
  if (allowedModules.length > 0 && !allowedModules.includes(mod)) {
    await logRequest(supabaseAdmin, key, req, `/${mod}/${resource ?? ""}`, "POST", 403, startTime, null, `Module '${mod}' not allowed`);
    return corsResponse({ error: `Module '${mod}' not allowed for this key` }, 403);
  }

  // ── 5. Verificar permissão de ação ─────────────────────────────────────────
  const acoes = key.permissoes.acoes;
  const actionPermMap: Record<string, boolean> = {
    query:            acoes.ler,
    create:           acoes.criar,
    update:           acoes.editar,
    delete:           acoes.deletar,
    send_message:     key.permissoes.whatsapp?.enviar_mensagens ?? false,
    trigger_webhook:  key.permissoes.webhooks?.enviar ?? false,
    run_automation:   acoes.criar,
  };

  if (!actionPermMap[action]) {
    await logRequest(supabaseAdmin, key, req, `/${mod}/${resource ?? ""}`, "POST", 403, startTime, null, `Action '${action}' not permitted`);
    return corsResponse({ error: `Action '${action}' not permitted for this key` }, 403);
  }

  // Criar cliente com service_role para executar as ações (já filtrado por tenant abaixo)
  const db = supabaseAdmin;
  let result: any = null;
  let statusCode = 200;
  let erro: string | null = null;

  try {
    // ── 6. Executar ação ────────────────────────────────────────────────────

    if (action === "query") {
      // Validar tabela
      const validTables = MODULE_TABLES[mod] ?? [];
      const table = resource ?? validTables[0];
      if (validTables.length > 0 && !validTables.includes(table)) {
        return corsResponse({ error: `Resource '${table}' not found in module '${mod}'` }, 404);
      }

      let query = db.from(table).select("*").eq("tenant_id", key.tenant_id);

      if (filters) {
        for (const [k, v] of Object.entries(filters)) {
          query = query.eq(k, v);
        }
      }

      const offset = (page - 1) * Math.min(pageLimit, 100);
      const { data: rows, error: qErr, count } = await query
        .range(offset, offset + Math.min(pageLimit, 100) - 1)
        .order("created_at", { ascending: false });

      if (qErr) throw qErr;
      result = { data: rows, total: count, page, limit: pageLimit };

    } else if (action === "create") {
      if (!resource || !data) return corsResponse({ error: "Missing resource or data for create" }, 400);

      const validTables = MODULE_TABLES[mod] ?? [];
      if (validTables.length > 0 && !validTables.includes(resource)) {
        return corsResponse({ error: `Resource '${resource}' not found in module '${mod}'` }, 404);
      }

      const { data: created, error: cErr } = await db
        .from(resource)
        .insert({ ...data, tenant_id: key.tenant_id })
        .select()
        .single();

      if (cErr) throw cErr;
      result = { data: created };
      statusCode = 201;

    } else if (action === "update") {
      if (!resource || !data || !id) return corsResponse({ error: "Missing resource, id or data for update" }, 400);

      const { data: updated, error: uErr } = await db
        .from(resource)
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("tenant_id", key.tenant_id)
        .select()
        .single();

      if (uErr) throw uErr;
      result = { data: updated };

    } else if (action === "delete") {
      if (!resource || !id) return corsResponse({ error: "Missing resource or id for delete" }, 400);

      const { error: dErr } = await db
        .from(resource)
        .delete()
        .eq("id", id)
        .eq("tenant_id", key.tenant_id);

      if (dErr) throw dErr;
      result = { success: true };

    } else if (action === "send_message") {
      // Integração WhatsApp — delega para a função de WhatsApp existente (se houver)
      if (!key.permissoes.whatsapp?.enviar_mensagens) {
        return corsResponse({ error: "WhatsApp messaging not permitted for this key" }, 403);
      }
      // Placeholder — integre com seu gateway WhatsApp aqui
      result = { success: true, message: "WhatsApp message queued" };

    } else if (action === "trigger_webhook") {
      if (!data?.url) return corsResponse({ error: "Missing data.url for trigger_webhook" }, 400);

      const webhookRes = await fetch(data.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: key.tenant_id, ...data.payload }),
      });
      result = { success: webhookRes.ok, status: webhookRes.status };

    } else if (action === "run_automation") {
      // Placeholder — conecte a automações internas aqui
      result = { success: true, message: "Automation triggered" };

    } else {
      statusCode = 400;
      erro = `Unknown action: ${action}`;
      result = { error: erro };
    }

  } catch (err: any) {
    statusCode = 500;
    erro = err?.message ?? "Internal error";
    result = { error: erro };
  }

  // ── 7. Registrar log e atualizar contador ──────────────────────────────────
  await logRequest(
    supabaseAdmin, key, req,
    `/${mod}/${resource ?? action}`, "POST",
    statusCode, startTime,
    body ? JSON.stringify(body).slice(0, 200) : null,
    erro,
  );

  // Atualizar ultimo_uso_at e total_requests
  supabaseAdmin
    .from("ia_api_keys")
    .update({
      ultimo_uso_at: new Date().toISOString(),
      total_requests: (keyRow.total_requests ?? 0) + 1,
    })
    .eq("id", key.id)
    .then(() => {}); // fire and forget

  return corsResponse(result, statusCode);
});

// ─── Helper: registrar log ────────────────────────────────────────────────────
async function logRequest(
  db: ReturnType<typeof createClient>,
  key: ApiKeyRow,
  req: Request,
  endpoint: string,
  metodo: string,
  statusCode: number,
  startTime: number,
  payloadResume: string | null,
  erro: string | null,
): Promise<void> {
  try {
    await db.from("ia_api_logs").insert({
      api_key_id:     key.id,
      tenant_id:      key.tenant_id,
      endpoint,
      metodo,
      status_code:    statusCode,
      ip_origem:      req.headers.get("x-forwarded-for") ?? req.headers.get("cf-connecting-ip") ?? null,
      user_agent:     req.headers.get("user-agent")?.slice(0, 200) ?? null,
      payload_resumo: payloadResume,
      duracao_ms:     Date.now() - startTime,
      erro,
    });
  } catch {
    // Não deixar falha de log derrubar a resposta principal
  }
}
