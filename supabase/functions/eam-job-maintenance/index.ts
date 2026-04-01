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

// ── EAM Job: Maintenance ─────────────────────────────────────────────────────
// Scheduled job that processes overdue maintenance plans:
//   - Marks overdue maintenance plans as 'overdue'
//   - Advances next_due_date for recurring plans that were completed
//   - Creates work orders for plans that become due
// Intended to be invoked by a pg_cron or Supabase scheduled function (daily).

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

    const today = new Date().toISOString().split('T')[0];
    const results: Record<string, number> = {
      overdue_marked: 0,
      work_orders_created: 0,
    };

    // ── 1. Mark overdue plans ──────────────────────────────────────────────
    let overdueQuery = supabase
      .from('asset_maintenance_plans')
      .update({ status: 'overdue' })
      .eq('status', 'ativo')
      .lt('next_due_date', today);
    if (tenant_id) overdueQuery = overdueQuery.eq('tenant_id', tenant_id);

    const { error: overdueErr, count: overdueCount } = await (overdueQuery as any).select('id', { count: 'exact', head: true });
    if (overdueErr) throw new Error('Overdue update failed');
    results.overdue_marked = overdueCount ?? 0;

    // Re-run the update (select+update in one pass is not directly supported)
    let overdueUpdateQuery = supabase
      .from('asset_maintenance_plans')
      .update({ status: 'overdue' })
      .eq('status', 'ativo')
      .lt('next_due_date', today);
    if (tenant_id) overdueUpdateQuery = overdueUpdateQuery.eq('tenant_id', tenant_id);
    const { error: overdueUpdateErr } = await overdueUpdateQuery;
    if (overdueUpdateErr) throw new Error('Overdue status update failed');

    // ── 2. Create work orders for plans due today ──────────────────────────
    let dueTodayQuery = supabase
      .from('asset_maintenance_plans')
      .select('id, tenant_id, asset_id, name, description, responsible_id, estimated_duration_hours')
      .eq('status', 'ativo')
      .eq('next_due_date', today);
    if (tenant_id) dueTodayQuery = dueTodayQuery.eq('tenant_id', tenant_id);

    const { data: duePlans, error: duePlanErr } = await dueTodayQuery;
    if (duePlanErr) throw new Error('Due plans query failed');

    if (duePlans && duePlans.length > 0) {
      const workOrders = duePlans.map((plan: any) => ({
        tenant_id: plan.tenant_id,
        asset_id: plan.asset_id,
        maintenance_plan_id: plan.id,
        title: plan.name,
        description: plan.description ?? null,
        assigned_to: plan.responsible_id ?? null,
        estimated_hours: plan.estimated_duration_hours ?? null,
        status: 'pending',
        priority: 'normal',
        scheduled_date: today,
        created_at: new Date().toISOString(),
      }));

      const { error: woInsertErr } = await supabase
        .from('asset_work_orders')
        .upsert(workOrders, { onConflict: 'tenant_id,maintenance_plan_id,scheduled_date', ignoreDuplicates: true });
      if (woInsertErr) throw new Error('Work order insert failed');
      results.work_orders_created = workOrders.length;
    }

    return new Response(JSON.stringify({ ok: true, results, run_date: today }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[eam-job-maintenance] error:', err);
    return new Response(JSON.stringify({ ok: false, error: 'Internal server error' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
