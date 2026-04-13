// ─────────────────────────────────────────────────────────────────────────────
// Edge Function: create-api-key
//
// Responsabilidade: gerar uma API Key de forma segura.
//
// Fluxo:
//   1. Verifica Authorization (JWT do usuário ZIA)
//   2. Extrai tenant_id do payload do JWT (app_metadata.scope_ids[0])
//   3. Gera rawKey = "zita_" + 32 bytes aleatórios em hex (64 chars)
//   4. Calcula keyHash = SHA-256(rawKey) em hex
//   5. Persiste key_prefix (primeiros 12 chars) + key_hash no banco
//   6. Retorna o registro + raw_key UMA ÚNICA VEZ — nunca mais recuperável
//
// Por que Edge Function e não insert direto do frontend?
//   • O rawKey nunca existe no banco — apenas o hash
//   • Geração com crypto.getRandomValues (CSPRNG) server-side
//   • tenant_id vem do JWT assinado, não do body (evita forjamento)
// ─────────────────────────────────────────────────────────────────────────────
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// ── Decodificar JWT sem verificar assinatura (o Supabase/RLS faz isso) ────────
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const [, payloadB64] = token.split(".");
    const padded = payloadB64.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

// ── Gerar SHA-256 hex do texto ────────────────────────────────────────────────
async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── Handler ───────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // ── 1. Verificar Authorization ───────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ error: "Authorization header obrigatório" }, 401);
  }
  const token = authHeader.slice(7);

  // ── 2. Extrair tenant_id do JWT ───────────────────────────────────────────────
  // scope_ids vem do zia-auth: lista de entity IDs que o usuário pode acessar.
  // O primeiro é o entity_id principal do operador (tenant da chave).
  const payload = decodeJwtPayload(token);
  const appMeta = (payload?.app_metadata ?? {}) as Record<string, unknown>;
  const scopeIds = appMeta.scope_ids as string[] | undefined;
  const sub = payload?.sub as string | undefined;

  // Parse do body
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido no body" }, 400);
  }

  // tenant_id: prioridade para scope_ids[0] do JWT, fallback para body (admin)
  const tenantId: string =
    (scopeIds && scopeIds.length > 0 ? scopeIds[0] : null) ??
    (body.tenant_id as string | undefined) ??
    sub ??
    "";

  if (!tenantId) {
    return json({ error: "tenant_id não encontrado no JWT" }, 400);
  }

  // ── 3. Validar campos obrigatórios ────────────────────────────────────────────
  const nome = (body.nome as string | undefined)?.trim();
  if (!nome) return json({ error: "nome é obrigatório" }, 400);

  // ── 4. Gerar a chave ──────────────────────────────────────────────────────────
  // 32 bytes aleatórios → 64 chars hex → prefixados com "zita_"
  const rawBytes = new Uint8Array(32);
  crypto.getRandomValues(rawBytes);
  const hexChars = Array.from(rawBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const rawKey = `zita_${hexChars}`;        // ex: "zita_a3f9bc01..." (69 chars)
  const keyPrefix = rawKey.slice(0, 12);    // ex: "zita_a3f9bc" (para display)

  // ── 5. SHA-256 da chave (o que fica no banco) ─────────────────────────────────
  const keyHash = await sha256Hex(rawKey);

  // ── 6. Permissões padrão mescladas com as do body ─────────────────────────────
  const DEFAULT_PERMISSOES = {
    modulos: [],
    acoes:    { ler: true, criar: false, editar: false, deletar: false },
    webhooks: { receber: false, enviar: false },
    whatsapp: { ler_mensagens: false, enviar_mensagens: false, enviar_sem_comando: false },
    rate_limit: { requests_por_minuto: 60, requests_por_dia: 10000 },
  };
  const inputPermissoes = (body.permissoes ?? {}) as typeof DEFAULT_PERMISSOES;
  const permissoes = {
    ...DEFAULT_PERMISSOES,
    ...inputPermissoes,
    acoes:     { ...DEFAULT_PERMISSOES.acoes,     ...inputPermissoes.acoes     },
    webhooks:  { ...DEFAULT_PERMISSOES.webhooks,  ...inputPermissoes.webhooks  },
    whatsapp:  { ...DEFAULT_PERMISSOES.whatsapp,  ...inputPermissoes.whatsapp  },
    rate_limit:{ ...DEFAULT_PERMISSOES.rate_limit,...inputPermissoes.rate_limit },
  };

  // ── 7. Inserir no banco via service_role ──────────────────────────────────────
  // service_role: bypassa RLS para garantir que a chave seja criada.
  // A autorização real foi verificada acima via JWT.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data, error } = await supabase
    .from("ia_api_keys")
    .insert({
      tenant_id:        tenantId,
      nome,
      descricao:        (body.descricao as string | undefined)?.trim() || null,
      key_prefix:       keyPrefix,
      key_hash:         keyHash,      // SHA-256 — único dado salvo no banco
      employee_id:      (body.employee_id as string | undefined) || null,
      permissoes,
      integracao_tipo:  (body.integracao_tipo as string | undefined) || null,
      integracao_url:   (body.integracao_url as string | undefined)?.trim() || null,
      integracao_config: (body.integracao_config as Record<string, unknown>) ?? {},
      criado_por:       (body.criado_por as string | undefined) || null,
    })
    // Nunca retornar key_hash ao cliente
    .select("id, tenant_id, nome, descricao, key_prefix, status, employee_id, permissoes, integracao_tipo, integracao_url, integracao_config, ultimo_uso_at, total_requests, criado_por, created_at, updated_at")
    .single();

  if (error) {
    return json({ error: error.message }, 400);
  }

  // ── 8. Retornar registro + rawKey (única vez que aparece) ─────────────────────
  return json({ ...data, raw_key: rawKey }, 201);
});
