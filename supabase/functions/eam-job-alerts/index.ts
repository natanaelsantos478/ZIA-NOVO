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

async function runAlerts(
  supabase: ReturnType<typeof createClient>
): Promise<{ alerts: number }> {
  let alerts = 0;
  const today = new Date().toISOString().split("T")[0];
  const in30 = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
  const in60 = new Date(Date.now() + 60 * 86400000).toISOString().split("T")[0];

  // 1. Garantias vencendo (30, 15, 5 dias)
  const { data: warrantyAssets } = await supabase
    .from("assets")
    .select("id,tenant_id,name,tag,warranty_end,status")
    .not("warranty_end", "is", null)
    .not("status", "in", "(descartado,alienado)")
    .gte("warranty_end", today)
    .lte("warranty_end", in30);

  for (const a of warrantyAssets ?? []) {
    const daysLeft = Math.round(
      (new Date(a.warranty_end).getTime() - Date.now()) / 86400000
    );
    if ([30, 15, 5].includes(daysLeft)) {
      await supabase.from("eam_asset_alerts").insert({
        tenant_id: a.tenant_id,
        type: "warranty_expiring",
        title: `Garantia vencendo em ${daysLeft} dias: ${a.name}`,
        description: `Ativo ${a.tag} tem garantia expirando em ${new Date(a.warranty_end).toLocaleDateString("pt-BR")}.`,
        severity: daysLeft <= 5 ? "critical" : daysLeft <= 15 ? "warning" : "info",
        asset_id: a.id,
        asset_name: a.name,
        asset_tag: a.tag,
      });
      alerts++;
    }
  }

  // 2. Apólices vencendo (60, 30, 15 dias)
  const { data: policies } = await supabase
    .from("asset_insurance_policies")
    .select("id,tenant_id,insurer_name,policy_number,coverage_end")
    .eq("status", "ativa")
    .gte("coverage_end", today)
    .lte("coverage_end", in60);

  for (const p of policies ?? []) {
    const daysLeft = Math.round(
      (new Date(p.coverage_end).getTime() - Date.now()) / 86400000
    );
    if ([60, 30, 15].includes(daysLeft)) {
      await supabase.from("eam_asset_alerts").insert({
        tenant_id: p.tenant_id,
        type: "insurance_expiring",
        title: `Apólice vencendo em ${daysLeft} dias: ${p.insurer_name}`,
        description: `Apólice ${p.policy_number} da ${p.insurer_name} vence em ${new Date(p.coverage_end).toLocaleDateString("pt-BR")}.`,
        severity: daysLeft <= 15 ? "critical" : daysLeft <= 30 ? "warning" : "info",
      });
      alerts++;
    }
  }

  // 3. OS com prazo vencido (abertas há > 30 dias)
  const cutoffDate = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: overdueOrders } = await supabase
    .from("asset_work_orders")
    .select("id,tenant_id,title,asset_id,opened_at")
    .not("status", "in", "(concluida,cancelada)")
    .lt("opened_at", cutoffDate);

  for (const o of overdueOrders ?? []) {
    const { data: asset } = await supabase
      .from("assets")
      .select("name,tag")
      .eq("id", o.asset_id)
      .single();

    await supabase.from("eam_asset_alerts").insert({
      tenant_id: o.tenant_id,
      type: "os_overdue",
      title: `OS com prazo vencido: ${o.title}`,
      description: `Ordem de serviço aberta há mais de 30 dias${asset ? ` para ${asset.name}` : ""}.`,
      severity: "warning",
      asset_id: o.asset_id,
      asset_name: asset?.name ?? null,
      asset_tag: asset?.tag ?? null,
    });
    alerts++;
  }

  // 4. Ativos sem responsável há > 7 dias
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data: noResp } = await supabase
    .from("assets")
    .select("id,tenant_id,name,tag,status")
    .is("responsible_id", null)
    .is("responsible_name", null)
    .not("status", "in", "(descartado,alienado,em_aquisicao)")
    .lt("updated_at", sevenDaysAgo);

  for (const a of noResp ?? []) {
    const already = await supabase
      .from("eam_asset_alerts")
      .select("id")
      .eq("asset_id", a.id)
      .eq("type", "no_responsible")
      .eq("resolved", false)
      .gte("created_at", sevenDaysAgo)
      .maybeSingle();

    if (!already.data) {
      await supabase.from("eam_asset_alerts").insert({
        tenant_id: a.tenant_id,
        type: "no_responsible",
        title: `Ativo sem responsável: ${a.name}`,
        description: `O ativo ${a.tag} está sem responsável designado há mais de 7 dias.`,
        severity: "warning",
        asset_id: a.id,
        asset_name: a.name,
        asset_tag: a.tag,
      });
      alerts++;
    }
  }

  return { alerts };
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
    const result = await runAlerts(supabase);
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
