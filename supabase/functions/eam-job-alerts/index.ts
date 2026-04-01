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

// ── EAM Job: Alerts ──────────────────────────────────────────────────────────
// Scheduled job that scans EAM data and generates alerts for:
//   - Warranties expiring within the next N days
//   - Maintenance plans due within the next N days
//   - Insurance policies expiring within the next N days
// Inserts rows into eam_alerts (or a notification table) for each finding.
// Intended to be invoked by a pg_cron or Supabase scheduled function.

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
    const warranty_alert_days: number = Number(body.warranty_alert_days ?? 30);
    const maintenance_alert_days: number = Number(body.maintenance_alert_days ?? 14);
    const insurance_alert_days: number = Number(body.insurance_alert_days ?? 30);

    const now = new Date();
    const results: Record<string, number> = {
      warranty_alerts: 0,
      maintenance_alerts: 0,
      insurance_alerts: 0,
    };

    // ── 1. Warranty alerts ─────────────────────────────────────────────────
    const warrantyThreshold = new Date(now);
    warrantyThreshold.setDate(warrantyThreshold.getDate() + warranty_alert_days);

    let warrantyQuery = supabase
      .from('assets')
      .select('id, tenant_id, tag, name, warranty_end')
      .not('warranty_end', 'is', null)
      .lte('warranty_end', warrantyThreshold.toISOString().split('T')[0])
      .gte('warranty_end', now.toISOString().split('T')[0])
      .neq('status', 'descartado')
      .neq('status', 'alienado');
    if (tenant_id) warrantyQuery = warrantyQuery.eq('tenant_id', tenant_id);

    const { data: expiringWarranties, error: wErr } = await warrantyQuery;
    if (wErr) throw new Error(`Warranty query failed: ${wErr.message}`);

    if (expiringWarranties && expiringWarranties.length > 0) {
      const warrantyAlerts = expiringWarranties.map((asset: any) => ({
        tenant_id: asset.tenant_id,
        asset_id: asset.id,
        alert_type: 'warranty_expiring',
        severity: 'warning',
        message: `Garantia do ativo ${asset.tag} (${asset.name}) vence em ${asset.warranty_end}`,
        due_date: asset.warranty_end,
        resolved: false,
        created_at: now.toISOString(),
      }));

      const { error: waInsertErr } = await supabase
        .from('eam_alerts')
        .upsert(warrantyAlerts, { onConflict: 'tenant_id,asset_id,alert_type,due_date', ignoreDuplicates: true });
      if (waInsertErr) throw new Error(`Warranty alert insert failed: ${waInsertErr.message}`);
      results.warranty_alerts = warrantyAlerts.length;
    }

    // ── 2. Maintenance plan alerts ─────────────────────────────────────────
    const maintenanceThreshold = new Date(now);
    maintenanceThreshold.setDate(maintenanceThreshold.getDate() + maintenance_alert_days);

    let maintenanceQuery = supabase
      .from('asset_maintenance_plans')
      .select('id, tenant_id, asset_id, name, next_due_date')
      .eq('status', 'ativo')
      .not('next_due_date', 'is', null)
      .lte('next_due_date', maintenanceThreshold.toISOString().split('T')[0])
      .gte('next_due_date', now.toISOString().split('T')[0]);
    if (tenant_id) maintenanceQuery = maintenanceQuery.eq('tenant_id', tenant_id);

    const { data: duePlans, error: mpErr } = await maintenanceQuery;
    if (mpErr) throw new Error(`Maintenance plan query failed: ${mpErr.message}`);

    if (duePlans && duePlans.length > 0) {
      const maintenanceAlerts = duePlans.map((plan: any) => ({
        tenant_id: plan.tenant_id,
        asset_id: plan.asset_id,
        alert_type: 'maintenance_due',
        severity: 'info',
        message: `Manutenção "${plan.name}" prevista para ${plan.next_due_date}`,
        due_date: plan.next_due_date,
        reference_id: plan.id,
        resolved: false,
        created_at: now.toISOString(),
      }));

      const { error: maInsertErr } = await supabase
        .from('eam_alerts')
        .upsert(maintenanceAlerts, { onConflict: 'tenant_id,asset_id,alert_type,due_date', ignoreDuplicates: true });
      if (maInsertErr) throw new Error(`Maintenance alert insert failed: ${maInsertErr.message}`);
      results.maintenance_alerts = maintenanceAlerts.length;
    }

    // ── 3. Insurance expiry alerts ─────────────────────────────────────────
    const insuranceThreshold = new Date(now);
    insuranceThreshold.setDate(insuranceThreshold.getDate() + insurance_alert_days);

    let insuranceQuery = supabase
      .from('asset_insurance_policies')
      .select('id, tenant_id, policy_number, insurer_name, coverage_end')
      .eq('status', 'ativa')
      .lte('coverage_end', insuranceThreshold.toISOString().split('T')[0])
      .gte('coverage_end', now.toISOString().split('T')[0]);
    if (tenant_id) insuranceQuery = insuranceQuery.eq('tenant_id', tenant_id);

    const { data: expiringPolicies, error: insErr } = await insuranceQuery;
    if (insErr) throw new Error(`Insurance query failed: ${insErr.message}`);

    if (expiringPolicies && expiringPolicies.length > 0) {
      const insuranceAlerts = expiringPolicies.map((policy: any) => ({
        tenant_id: policy.tenant_id,
        asset_id: null,
        alert_type: 'insurance_expiring',
        severity: 'warning',
        message: `Apólice ${policy.policy_number} (${policy.insurer_name}) vence em ${policy.coverage_end}`,
        due_date: policy.coverage_end,
        reference_id: policy.id,
        resolved: false,
        created_at: now.toISOString(),
      }));

      const { error: iaInsertErr } = await supabase
        .from('eam_alerts')
        .upsert(insuranceAlerts, { onConflict: 'tenant_id,reference_id,alert_type,due_date', ignoreDuplicates: true });
      if (iaInsertErr) throw new Error(`Insurance alert insert failed: ${iaInsertErr.message}`);
      results.insurance_alerts = insuranceAlerts.length;
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[eam-job-alerts] error:', err);
    return new Response(JSON.stringify({ ok: false, error: 'Internal server error' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
