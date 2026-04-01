// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ── Dynamic CORS — restricts origin when ALLOWED_ORIGINS env var is set ──────
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

// ── EAM Job: Depreciation ────────────────────────────────────────────────────
// Scheduled job that calculates and records asset depreciation for all active
// assets. Supports straight-line and declining-balance methods.
// Intended to be invoked by a pg_cron or Supabase scheduled function (monthly).

Deno.serve(async (req: Request) => {
  const CORS = buildCors(req.headers.get('Origin'));

  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  try {
    const body = await req.json().catch(() => ({}));
    const tenant_id: string | null = body.tenant_id ?? null;
    const reference_month: string = body.reference_month ?? new Date().toISOString().slice(0, 7); // YYYY-MM

    // ── Query depreciable assets ───────────────────────────────────────────
    let assetsQuery = supabase
      .from('assets')
      .select('id, tenant_id, tag, name, acquisition_value, residual_value, useful_life_months, depreciation_method, acquisition_date, accumulated_depreciation')
      .not('depreciation_method', 'is', null)
      .not('acquisition_value', 'is', null)
      .not('useful_life_months', 'is', null)
      .neq('status', 'descartado')
      .neq('status', 'alienado');
    if (tenant_id) assetsQuery = assetsQuery.eq('tenant_id', tenant_id);

    const { data: assets, error: assetsErr } = await assetsQuery;
    if (assetsErr) throw new Error('Asset query failed');

    if (!assets || assets.length === 0) {
      return new Response(JSON.stringify({ ok: true, processed: 0, reference_month }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const depreciationEntries: any[] = [];

    for (const asset of assets) {
      const acquisitionValue = Number(asset.acquisition_value ?? 0);
      const residualValue = Number(asset.residual_value ?? 0);
      const usefulLifeMonths = Number(asset.useful_life_months ?? 0);
      const accumulatedDepreciation = Number(asset.accumulated_depreciation ?? 0);

      if (usefulLifeMonths <= 0 || acquisitionValue <= 0) continue;

      const depreciableBase = acquisitionValue - residualValue;
      if (depreciableBase <= 0) continue;

      // Stop if already fully depreciated
      if (accumulatedDepreciation >= depreciableBase) continue;

      let monthlyDepreciation = 0;

      if (asset.depreciation_method === 'declining_balance') {
        const remainingValue = acquisitionValue - accumulatedDepreciation;
        const rate = 2 / usefulLifeMonths; // double-declining rate
        monthlyDepreciation = remainingValue * rate;
      } else {
        // Default: straight-line
        monthlyDepreciation = depreciableBase / usefulLifeMonths;
      }

      // Cap so accumulated doesn't exceed depreciable base
      const remainingToDepreciate = depreciableBase - accumulatedDepreciation;
      monthlyDepreciation = Math.min(monthlyDepreciation, remainingToDepreciate);

      if (monthlyDepreciation <= 0) continue;

      depreciationEntries.push({
        tenant_id: asset.tenant_id,
        asset_id: asset.id,
        reference_month,
        depreciation_amount: Number(monthlyDepreciation.toFixed(2)),
        depreciation_method: asset.depreciation_method ?? 'straight_line',
        accumulated_before: Number(accumulatedDepreciation.toFixed(2)),
        accumulated_after: Number((accumulatedDepreciation + monthlyDepreciation).toFixed(2)),
        created_at: new Date().toISOString(),
      });
    }

    let inserted = 0;

    if (depreciationEntries.length > 0) {
      const { error: insertErr } = await supabase
        .from('asset_depreciation_entries')
        .upsert(depreciationEntries, { onConflict: 'tenant_id,asset_id,reference_month', ignoreDuplicates: true });
      if (insertErr) throw new Error('Depreciation insert failed');
      inserted = depreciationEntries.length;

      // Update accumulated_depreciation on each asset
      for (const entry of depreciationEntries) {
        const { error: updateErr } = await supabase
          .from('assets')
          .update({ accumulated_depreciation: entry.accumulated_after })
          .eq('id', entry.asset_id)
          .eq('tenant_id', entry.tenant_id);
        if (updateErr) throw new Error('Asset update failed');
      }
    }

    return new Response(JSON.stringify({ ok: true, processed: inserted, reference_month }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[eam-job-depreciation] error:', err);
    return new Response(JSON.stringify({ ok: false, error: 'Internal server error' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
