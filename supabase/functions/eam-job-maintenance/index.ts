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

function addToDate(date: string, value: number, unit: string): string {
  const d = new Date(date);
  switch (unit) {
    case "dias":    d.setDate(d.getDate() + value); break;
    case "semanas": d.setDate(d.getDate() + value * 7); break;
    case "meses":   d.setMonth(d.getMonth() + value); break;
    default:        d.setDate(d.getDate() + value); break;
  }
  return d.toISOString().split("T")[0];
}

async function runMaintenance(
  supabase: ReturnType<typeof createClient>
): Promise<{ created: number }> {
  const today = new Date().toISOString().split("T")[0];
  let created = 0;

  const { data: overduePlans } = await supabase
    .from("asset_maintenance_plans")
    .select("*")
    .eq("status", "ativo")
    .not("next_due_date", "is", null)
    .lt("next_due_date", today);

  for (const plan of overduePlans ?? []) {
    const { data: asset } = await supabase
      .from("assets")
      .select("name,tag,tenant_id")
      .eq("id", plan.asset_id)
      .single();

    if (!asset) continue;

    // Cria OS preventiva
    await supabase.from("asset_work_orders").insert({
      tenant_id: plan.tenant_id ?? asset.tenant_id,
      asset_id: plan.asset_id,
      type: "preventiva",
      title: `Manutenção preventiva (auto): ${plan.name}`,
      failure_description: plan.service_description ?? "Manutenção preventiva programada",
      status: "aberta",
      opened_at: new Date().toISOString(),
      estimated_cost: plan.estimated_cost ?? 0,
      parts_cost: 0,
      labor_cost: 0,
      total_cost: 0,
    });

    // Atualiza próxima data
    const nextDue = addToDate(
      plan.next_due_date,
      plan.trigger_value,
      plan.trigger_unit
    );

    await supabase
      .from("asset_maintenance_plans")
      .update({
        next_due_date: nextDue,
        last_executed: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", plan.id);

    // Notifica
    await supabase.from("eam_asset_alerts").insert({
      tenant_id: plan.tenant_id ?? asset.tenant_id,
      type: "maintenance_overdue",
      title: `OS preventiva criada: ${plan.name}`,
      description: `Plano "${plan.name}" estava vencido para ${asset.name}. OS criada. Próxima: ${new Date(nextDue).toLocaleDateString("pt-BR")}.`,
      severity: "info",
      asset_id: plan.asset_id,
      asset_name: asset.name,
      asset_tag: asset.tag,
    });

    created++;
  }

  return { created };
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
    const result = await runMaintenance(supabase);
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
