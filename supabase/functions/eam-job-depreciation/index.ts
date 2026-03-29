// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

// ─── Verifica autorização ─────────────────────────────────────────────────────

function autorizado(req: Request): boolean {
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret) return true; // sem secret configurado, aceita (dev)
  const header = req.headers.get("x-cron-secret") ?? "";
  return header === secret;
}

// ─── Lógica principal ─────────────────────────────────────────────────────────

async function runDepreciation(
  supabase: ReturnType<typeof createClient>
): Promise<{ processed: number; errors: number }> {
  const snapDate = new Date();
  snapDate.setDate(1);
  const snapDateStr = snapDate.toISOString().split("T")[0];

  const { data: assets, error: assetsErr } = await supabase
    .from("assets")
    .select("*")
    .not("status", "in", "(descartado,alienado,extraviado)")
    .not("depreciation_start", "is", null)
    .gt("useful_life_months", 0)
    .gt("acquisition_value", 0);

  if (assetsErr) throw new Error("Failed to fetch assets: " + assetsErr.message);

  let processed = 0;
  let errors = 0;

  for (const asset of assets ?? []) {
    try {
      const depStart = new Date(asset.depreciation_start);
      const snap = new Date(snapDateStr);
      const monthsElapsed =
        (snap.getFullYear() - depStart.getFullYear()) * 12 +
        (snap.getMonth() - depStart.getMonth());

      if (monthsElapsed < 0 || monthsElapsed >= asset.useful_life_months) continue;

      const residual = Number(asset.residual_value ?? 0);
      const cost = Number(asset.acquisition_value);
      const life = asset.useful_life_months;

      const monthlyQuota = Math.round(((cost - residual) / life) * 100) / 100;
      const accumulated = monthlyQuota * (monthsElapsed + 1);
      const bookValue = Math.max(residual, cost - accumulated);

      // Snapshot (idempotente)
      await supabase.from("asset_depreciation_snapshots").upsert(
        {
          tenant_id: asset.tenant_id,
          asset_id: asset.id,
          reference_month: snapDateStr,
          monthly_quota: monthlyQuota,
          accumulated_depreciation: accumulated,
          book_value: bookValue,
          method: asset.depreciation_method,
        },
        { onConflict: "asset_id,reference_month", ignoreDuplicates: true }
      );

      // Atualiza valor contábil
      await supabase
        .from("assets")
        .update({ current_book_value: bookValue, updated_at: new Date().toISOString() })
        .eq("id", asset.id);

      // Tenta lançamento financeiro (falha silenciosa)
      try {
        await supabase.from("erp_lancamentos").insert({
          tenant_id: asset.tenant_id,
          tipo: "DESPESA",
          categoria: "DEPRECIACAO_ATIVO",
          descricao: `Depreciação mensal - ${asset.name} (${asset.tag})`,
          valor: monthlyQuota,
          data_vencimento: snapDateStr,
          status: "PENDENTE",
        });
      } catch {
        await supabase.from("eam_asset_alerts").insert({
          tenant_id: asset.tenant_id,
          type: "depreciation_error",
          title: `Erro ao criar lançamento: ${asset.tag}`,
          description: "Falha ao criar lançamento de depreciação no financeiro.",
          severity: "info",
          asset_id: asset.id,
          asset_name: asset.name,
          asset_tag: asset.tag,
        });
      }

      processed++;
    } catch {
      errors++;
    }
  }

  return { processed, errors };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

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

    const result = await runDepreciation(supabase);

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
