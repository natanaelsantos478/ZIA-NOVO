// ─────────────────────────────────────────────────────────────────────────────
// Edge Function: website-lead
// Recebe submissões do formulário público do site (landing.html) e cria uma
// negociação no CRM com tenant_id fixo da empresa ZITA.
//
// Endpoint público — sem autenticação, CORS aberto.
// ─────────────────────────────────────────────────────────────────────────────
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// tenant_id fixo da holding ZITA (Natanael)
const ZITA_TENANT_ID = "00000000-0000-0000-0000-000000000001";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

interface LeadPayload {
  name: string;
  email: string;
  phone?: string;
  company: string;
  employees?: string;
  message?: string;
}

Deno.serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  let body: LeadPayload;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  const { name, email, phone, company, employees, message } = body;

  if (!name || !email || !company) {
    return new Response(
      JSON.stringify({ error: "Campos obrigatórios: name, email, company" }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  // Monta descrição com todos os dados do formulário
  const descricao = [
    `Empresa: ${company}`,
    employees ? `Funcionários: ${employees}` : null,
    message ? `Mensagem: ${message}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  const { error } = await supabase.from("crm_negociacoes").insert({
    tenant_id: ZITA_TENANT_ID,
    cliente_nome: name,
    cliente_email: email,
    cliente_telefone: phone ?? null,
    descricao,
    status: "aberta",
    etapa: "prospeccao",
    responsavel: "Site",
    origem: "website",
    data_criacao: new Date().toISOString(),
  });

  if (error) {
    console.error("[website-lead] erro ao inserir:", error);
    return new Response(
      JSON.stringify({ error: "Erro ao registrar lead" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({ ok: true, message: "Lead criado com sucesso" }),
    { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
  );
});
