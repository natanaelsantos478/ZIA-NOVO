// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

function autorizado(req: Request): boolean {
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret) return true;
  return (req.headers.get("x-cron-secret") ?? "") === secret;
}

async function runResponsible(
  supabase: ReturnType<typeof createClient>
): Promise<{ notified: number }> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  let notified = 0;

  const { data: assets } = await supabase
    .from("assets")
    .select("id,tenant_id,name,tag,status,updated_at")
    .is("responsible_id", null)
    .is("responsible_name", null)
    .not("status", "in", "(descartado,alienado,em_aquisicao)")
    .lt("updated_at", sevenDaysAgo);

  for (const a of assets ?? []) {
    // Evita duplicatas na mesma semana
    const { data: existing } = await supabase
      .from("eam_asset_alerts")
      .select("id")
      .eq("asset_id", a.id)
      .eq("type", "no_responsible")
      .eq("resolved", false)
      .gte("created_at", sevenDaysAgo)
      .maybeSingle();

    if (existing) continue;

    await supabase.from("eam_asset_alerts").insert({
      tenant_id: a.tenant_id,
      type: "no_responsible",
      title: `[Admin] Ativo sem responsável: ${a.name}`,
      description: `O ativo ${a.tag} (status: ${a.status}) não tem responsável designado há mais de 7 dias.`,
      severity: "warning",
      asset_id: a.id,
      asset_name: a.name,
      asset_tag: a.tag,
    });
    notified++;
  }

  return { notified };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  if (!autorizado(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const result = await runResponsible(supabase);
    return new Response(JSON.stringify({ ok: true, ...result }), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
