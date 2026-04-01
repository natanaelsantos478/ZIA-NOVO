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

// ── EAM Job: Responsible ─────────────────────────────────────────────────────
// Scheduled job that syncs asset custody and responsibility records:
//   - Detects assets with missing or invalid responsible assignments
//   - Sends reminder notifications to asset custodians for pending confirmations
//   - Flags assets whose responsible user has been deactivated
// Intended to be invoked by a pg_cron or Supabase scheduled function (weekly).

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

    const results: Record<string, number> = {
      unassigned_flagged: 0,
      inactive_responsible_flagged: 0,
      reminders_sent: 0,
    };

    // ── 1. Flag assets without a responsible user ──────────────────────────
    let unassignedQuery = supabase
      .from('assets')
      .select('id, tenant_id, tag, name')
      .is('responsible_id', null)
      .neq('status', 'descartado')
      .neq('status', 'alienado')
      .neq('status', 'em_estoque');
    if (tenant_id) unassignedQuery = unassignedQuery.eq('tenant_id', tenant_id);

    const { data: unassignedAssets, error: unassignedErr } = await unassignedQuery;
    if (unassignedErr) throw new Error('Unassigned assets query failed');

    if (unassignedAssets && unassignedAssets.length > 0) {
      const alerts = unassignedAssets.map((asset: any) => ({
        tenant_id: asset.tenant_id,
        asset_id: asset.id,
        alert_type: 'no_responsible',
        severity: 'warning',
        message: `Ativo ${asset.tag} (${asset.name}) sem responsável atribuído`,
        due_date: null,
        resolved: false,
        created_at: new Date().toISOString(),
      }));

      const { error: alertInsertErr } = await supabase
        .from('eam_alerts')
        .upsert(alerts, { onConflict: 'tenant_id,asset_id,alert_type', ignoreDuplicates: true });
      if (alertInsertErr) throw new Error('Unassigned alert insert failed');
      results.unassigned_flagged = alerts.length;
    }

    // ── 2. Flag assets whose responsible user is inactive ─────────────────
    let activeAssetsQuery = supabase
      .from('assets')
      .select('id, tenant_id, tag, name, responsible_id')
      .not('responsible_id', 'is', null)
      .neq('status', 'descartado')
      .neq('status', 'alienado');
    if (tenant_id) activeAssetsQuery = activeAssetsQuery.eq('tenant_id', tenant_id);

    const { data: activeAssets, error: activeAssetsErr } = await activeAssetsQuery;
    if (activeAssetsErr) throw new Error('Active assets query failed');

    if (activeAssets && activeAssets.length > 0) {
      // Collect unique responsible IDs
      const responsibleIds = [...new Set(activeAssets.map((a: any) => a.responsible_id).filter(Boolean))];

      const { data: employees, error: empErr } = await supabase
        .from('employees')
        .select('id, status')
        .in('id', responsibleIds);
      if (empErr) throw new Error('Employees query failed');

      const inactiveIds = new Set(
        (employees ?? []).filter((e: any) => e.status !== 'ativo').map((e: any) => e.id)
      );

      const inactiveAlerts = activeAssets
        .filter((asset: any) => inactiveIds.has(asset.responsible_id))
        .map((asset: any) => ({
          tenant_id: asset.tenant_id,
          asset_id: asset.id,
          alert_type: 'responsible_inactive',
          severity: 'warning',
          message: `Ativo ${asset.tag} (${asset.name}) com responsável inativo — reatribuição necessária`,
          due_date: null,
          resolved: false,
          created_at: new Date().toISOString(),
        }));

      if (inactiveAlerts.length > 0) {
        const { error: inactiveInsertErr } = await supabase
          .from('eam_alerts')
          .upsert(inactiveAlerts, { onConflict: 'tenant_id,asset_id,alert_type', ignoreDuplicates: true });
        if (inactiveInsertErr) throw new Error('Inactive responsible alert insert failed');
        results.inactive_responsible_flagged = inactiveAlerts.length;
      }
    }

    // ── 3. Send reminders for pending custody confirmations ────────────────
    let pendingCustodyQuery = supabase
      .from('asset_custody_records')
      .select('id, tenant_id, asset_id, responsible_id, assigned_date')
      .eq('confirmation_status', 'pending')
      .lt('assigned_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    if (tenant_id) pendingCustodyQuery = pendingCustodyQuery.eq('tenant_id', tenant_id);

    const { data: pendingCustody, error: custodyErr } = await pendingCustodyQuery;
    if (custodyErr) throw new Error('Custody records query failed');

    if (pendingCustody && pendingCustody.length > 0) {
      const reminders = pendingCustody.map((record: any) => ({
        tenant_id: record.tenant_id,
        asset_id: record.asset_id,
        alert_type: 'custody_confirmation_pending',
        severity: 'info',
        message: `Confirmação de custódia pendente desde ${record.assigned_date}`,
        due_date: null,
        reference_id: record.id,
        resolved: false,
        created_at: new Date().toISOString(),
      }));

      const { error: reminderInsertErr } = await supabase
        .from('eam_alerts')
        .upsert(reminders, { onConflict: 'tenant_id,asset_id,alert_type,reference_id', ignoreDuplicates: true });
      if (reminderInsertErr) throw new Error('Reminder insert failed');
      results.reminders_sent = reminders.length;
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[eam-job-responsible] error:', err);
    return new Response(JSON.stringify({ ok: false, error: 'Internal server error' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
