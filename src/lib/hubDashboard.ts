// ─────────────────────────────────────────────────────────────────────────────
// Hub Dashboard Service — dados reais por módulo para o ModuleHub
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from './supabase';
import { format, subMonths, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getScmDashboard } from './scm';
import { getDashboardStatsExtended } from './eam';
import { getAssinaturas, calcKPIs } from './assinaturas';
import { getEmployees, getVacancies, getAbsences, getDepartments } from './hr';
import { getPedidos, getLancamentos } from './erp';
import { getTenantIds } from './auth';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface HubKPI {
  id: string;
  label: string;
  value: string;
  change: string;
  positive: boolean;
  spark: number[];
}

export interface HubDrill {
  rank: number;
  name: string;
  value: string;
  change: string;
  positive: boolean;
  barWidth: number;
}

export interface HubChart {
  label: string;
  value: number;
}

export interface HubModuleData {
  kpis:  HubKPI[];
  drill: HubDrill[];
  chart: HubChart[];
}


// ── Formatters ────────────────────────────────────────────────────────────────

function fmtCurrency(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `R$ ${(v / 1_000).toFixed(0)}K`;
  return `R$ ${v.toFixed(0)}`;
}

function fmtPct(v: number): string { return `${v.toFixed(1)}%`; }

function changePct(curr: number, prev: number): { change: string; positive: boolean } {
  if (prev === 0) return { change: curr > 0 ? '+100%' : '0%', positive: curr >= 0 };
  const p = ((curr - prev) / prev) * 100;
  return { change: `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`, positive: p >= 0 };
}

// ── Monthly helpers ───────────────────────────────────────────────────────────

/** Returns array of 8 month labels oldest→newest, e.g. ['Set','Out',...,'Abr'] */
function last8MonthLabels(): string[] {
  return Array.from({ length: 8 }, (_, i) =>
    format(subMonths(new Date(), 7 - i), 'MMM', { locale: ptBR })
  ).map(m => m.charAt(0).toUpperCase() + m.slice(1, 3));
}

/** Groups records by month into a 8-slot array (oldest first) */
function groupByMonth(records: { created_at: string }[], getValue?: (r: { created_at: string }) => number): number[] {
  const now = new Date();
  const result = Array(8).fill(0);
  for (const r of records) {
    const d = new Date(r.created_at);
    const monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
    if (monthsAgo >= 0 && monthsAgo < 8) {
      const idx = 7 - monthsAgo;
      result[idx] += getValue ? getValue(r) : 1;
    }
  }
  return result;
}

function buildChart(counts: number[]): HubChart[] {
  const labels = last8MonthLabels();
  return labels.map((label, i) => ({ label, value: counts[i] ?? 0 }));
}

function buildSpark(counts: number[]): number[] { return counts; }

/** Returns 8 values at indices, filling missing with 0 */
function sparkFromMonthly(arr: number[]): number[] {
  return Array.from({ length: 8 }, (_, i) => arr[i] ?? 0);
}

/** Current month value vs previous month */
function currPrev(arr: number[]): [number, number] {
  return [arr[7] ?? 0, arr[6] ?? 0];
}

// ── Fallback empty data ───────────────────────────────────────────────────────

function emptyData(labels: string[]): HubModuleData {
  return {
    kpis: labels.map((label, i) => ({
      id: `kpi_${i}`, label, value: '—', change: '—', positive: true, spark: Array(8).fill(0),
    })),
    drill: [],
    chart: Array(8).fill(0).map((_, i) => ({ label: last8MonthLabels()[i], value: 0 })),
  };
}

// ── Module fetchers ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

async function fetchCrm(): Promise<HubModuleData> {
  const tids = getTenantIds();
  const eightMonthsAgo = startOfMonth(subMonths(new Date(), 7)).toISOString();

  const [clientesRes, pedidosRes, negRes] = await Promise.allSettled([
    supabase.from('erp_clientes').select('id,created_at').in('tenant_id', tids),
    supabase.from('erp_pedidos').select('id,total,status,created_at,erp_clientes(nome)').in('tenant_id', tids).gte('created_at', eightMonthsAgo),
    supabase.from('crm_negociacoes').select('id,valor_total,stage,created_at').in('company_id', tids),
  ]);

  const clientes = clientesRes.status === 'fulfilled' ? (clientesRes.value.data ?? []) : [];
  const pedidos  = pedidosRes.status  === 'fulfilled' ? (pedidosRes.value.data  ?? []) : [];
  const negs     = negRes.status      === 'fulfilled' ? (negRes.value.data      ?? []) : [];

  const fechados = pedidos.filter((p: { status: string }) => p.status === 'fechado' || p.status === 'entregue');
  const revenue  = fechados.reduce((s: number, p: { total?: number }) => s + Number(p.total ?? 0), 0);
  const monthlyCounts = groupByMonth(pedidos);
  const monthlyRevenue = groupByMonth(pedidos, (p: { created_at: string; total?: number }) => Number((p as { total?: number }).total ?? 0));
  const [currR, prevR] = currPrev(monthlyRevenue);
  const [currC, prevC] = currPrev(groupByMonth(clientes));
  const chgR = changePct(currR, prevR);
  const chgC = changePct(currC, prevC);

  const pipeline = negs.reduce((s: number, n: { valor_total?: number }) => s + Number(n.valor_total ?? 0), 0);
  const conv = pedidos.length > 0 ? (fechados.length / pedidos.length) * 100 : 0;

  const topClientes: Record<string, number> = {};
  for (const p of fechados) {
    const nome = (p as { erp_clientes?: { nome?: string } }).erp_clientes?.nome ?? 'Sem nome';
    topClientes[nome] = (topClientes[nome] ?? 0) + Number((p as { total?: number }).total ?? 0);
  }
  const drillList = Object.entries(topClientes)
    .sort(([, a], [, b]) => b - a).slice(0, 6);
  const maxVal = drillList[0]?.[1] ?? 1;

  return {
    kpis: [
      { id: 'revenue',    label: 'Receita',     value: fmtCurrency(revenue),  ...chgR, spark: buildSpark(monthlyRevenue) },
      { id: 'clientes',   label: 'Clientes',    value: String(clientes.length), ...chgC, spark: buildSpark(groupByMonth(clientes)) },
      { id: 'pipeline',   label: 'Pipeline',    value: fmtCurrency(pipeline), change: '—', positive: true, spark: Array(8).fill(0) },
      { id: 'pedidos',    label: 'Pedidos',     value: String(pedidos.length), ...changePct(...currPrev(monthlyCounts)), spark: buildSpark(monthlyCounts) },
      { id: 'fechados',   label: 'Fechados',    value: String(fechados.length), change: '—', positive: true, spark: Array(8).fill(0) },
      { id: 'conversao',  label: 'Conversão',   value: fmtPct(conv),          change: '—', positive: true, spark: Array(8).fill(0) },
    ],
    drill: drillList.map(([name, val], i) => ({
      rank: i + 1, name, value: fmtCurrency(val), change: '—', positive: true,
      barWidth: Math.round((val / maxVal) * 100),
    })),
    chart: buildChart(monthlyRevenue),
  };
}

async function fetchHr(): Promise<HubModuleData> {
  try {
    const [employees, vacancies, absences, departments] = await Promise.allSettled([
      getEmployees(), getVacancies(), getAbsences(), getDepartments(),
    ]);
    const emps  = employees.status   === 'fulfilled' ? employees.value   : [];
    const vacs  = vacancies.status   === 'fulfilled' ? vacancies.value   : [];
    const abs   = absences.status    === 'fulfilled' ? absences.value    : [];
    const depts = departments.status === 'fulfilled' ? departments.value : [];

    const active   = emps.filter((e: AnyRecord) => e.status === 'ativo');
    const emonthly = groupByMonth(emps.filter((e: AnyRecord) => e.admission_date).map((e: AnyRecord) => ({ created_at: e.admission_date })));
    const [currE, prevE] = currPrev(emonthly);
    const absPct = active.length > 0 ? (abs.filter((a: AnyRecord) => a.status === 'pendente').length / active.length) * 100 : 0;

    const deptCount: Record<string, number> = {};
    for (const e of active) {
      const d = depts.find((d: AnyRecord) => d.id === e.department_id);
      const key = d?.name ?? 'Sem depto';
      deptCount[key] = (deptCount[key] ?? 0) + 1;
    }
    const drillList = Object.entries(deptCount).sort(([, a], [, b]) => b - a).slice(0, 6);
    const maxD = drillList[0]?.[1] ?? 1;

    return {
      kpis: [
        { id: 'headcount',  label: 'Headcount',   value: String(active.length),  ...changePct(currE, prevE),     spark: sparkFromMonthly(emonthly) },
        { id: 'total',      label: 'Total Func.',  value: String(emps.length),    change: '—', positive: true,    spark: sparkFromMonthly(emonthly) },
        { id: 'vagas',      label: 'Vagas Abertas',value: String(vacs.filter((v: AnyRecord) => v.status === 'aberta').length), change: '—', positive: false, spark: Array(8).fill(0) },
        { id: 'ausencias',  label: 'Ausências',    value: String(abs.length),     change: '—', positive: abs.length === 0, spark: Array(8).fill(0) },
        { id: 'absPct',     label: 'Absenteísmo',  value: fmtPct(absPct),         change: '—', positive: absPct < 5, spark: Array(8).fill(0) },
        { id: 'depts',      label: 'Departamentos',value: String(depts.length),   change: '—', positive: true,    spark: Array(8).fill(0) },
      ],
      drill: drillList.map(([name, val], i) => ({
        rank: i + 1, name, value: `${val} func.`, change: '—', positive: true,
        barWidth: Math.round((val / maxD) * 100),
      })),
      chart: buildChart(emonthly),
    };
  } catch { return emptyData(['Headcount','Total','Vagas','Ausências','Absenteísmo','Departamentos']); }
}

async function fetchAssets(): Promise<HubModuleData> {
  try {
    const stats = await getDashboardStatsExtended();
    const tids = getTenantIds();
    const eightMonthsAgo = startOfMonth(subMonths(new Date(), 7)).toISOString();
    const woRes = await supabase.from('asset_work_orders').select('opened_at,total_cost').in('tenant_id', tids).gte('opened_at', eightMonthsAgo);
    const wos = woRes.data ?? [];
    const woMonthly = groupByMonth(wos.map((w: AnyRecord) => ({ created_at: w.opened_at })));
    const [currW, prevW] = currPrev(woMonthly);

    const catCount: Record<string, number> = {};
    for (const { type, count } of stats.byType ?? []) {
      catCount[type] = count;
    }
    const drillList = Object.entries(catCount).sort(([, a], [, b]) => b - a).slice(0, 6);
    const maxD = drillList[0]?.[1] ?? 1;
    const activeAssets = stats.byStatus?.find(s => s.status === 'ativo')?.count ?? 0;
    const vencendo = (stats.insuranceExpiringSoon?.length ?? 0) + (stats.warrantyExpiringSoon?.length ?? 0);

    return {
      kpis: [
        { id: 'total',    label: 'Total Ativos',  value: String(stats.totalAssets),         change: '—', positive: true, spark: Array(8).fill(stats.totalAssets) },
        { id: 'ativos',   label: 'Em Uso',        value: String(activeAssets),              change: '—', positive: true, spark: Array(8).fill(0) },
        { id: 'manut',    label: 'Em Manutenção', value: String(stats.inMaintenance ?? 0),  change: '—', positive: false, spark: Array(8).fill(0) },
        { id: 'wo',       label: 'OS/mês',        value: String(currW),                     ...changePct(currW, prevW), spark: buildSpark(woMonthly) },
        { id: 'vencendo', label: 'Vencendo (30d)',value: String(vencendo),                  change: '—', positive: false, spark: Array(8).fill(0) },
        { id: 'valor',    label: 'Valor Total',   value: fmtCurrency(stats.totalValue ?? 0),change: '—', positive: true, spark: Array(8).fill(0) },
      ],
      drill: drillList.map(([name, val], i) => ({
        rank: i + 1, name, value: `${val} ativos`, change: '—', positive: true,
        barWidth: Math.round(((val as number) / (maxD as number)) * 100),
      })),
      chart: buildChart(woMonthly),
    };
  } catch { return emptyData(['Total Ativos','Em Uso','Em Manutenção','OS/mês','Vencendo','Valor Total']); }
}

async function fetchLogistics(): Promise<HubModuleData> {
  try {
    const dash = await getScmDashboard();
    const tids = getTenantIds();
    const eightMonthsAgo = startOfMonth(subMonths(new Date(), 7)).toISOString();
    const embRes = await supabase.from('scm_embarques').select('id,created_at,status').in('tenant_id', tids).gte('created_at', eightMonthsAgo);
    const embs = embRes.data ?? [];
    const embMonthly = groupByMonth(embs);
    const [currE, prevE] = currPrev(embMonthly);

    const rotaRes = await supabase.from('scm_rotas').select('id,nome,status').in('tenant_id', tids);
    const rotas = rotaRes.data ?? [];
    const maxR = rotas.length || 1;

    return {
      kpis: [
        { id: 'veiculos',   label: 'Veículos',       value: String(dash.veiculos_total),              change: '—', positive: true, spark: Array(8).fill(0) },
        { id: 'em_rota',    label: 'Em Rota',        value: String(dash.veiculos_em_rota),            change: '—', positive: true, spark: Array(8).fill(0) },
        { id: 'transito',   label: 'Em Trânsito',    value: String(dash.embarques_em_transito),       change: '—', positive: true, spark: Array(8).fill(0) },
        { id: 'entregas',   label: 'Entregas/mês',   value: String(dash.embarques_entregues_mes),     ...changePct(currE, prevE), spark: buildSpark(embMonthly) },
        { id: 'rotas',      label: 'Rotas Ativas',   value: String(dash.rotas_ativas),                change: '—', positive: true, spark: Array(8).fill(0) },
        { id: 'devolucoes', label: 'Devoluções',     value: String(dash.devolucoes_pendentes),        change: '—', positive: dash.devolucoes_pendentes === 0, spark: Array(8).fill(0) },
      ],
      drill: rotas.slice(0, 6).map((r: AnyRecord, i) => ({
        rank: i + 1, name: r.nome ?? `Rota ${i + 1}`, value: r.status ?? '—', change: '—', positive: r.status === 'ativa',
        barWidth: Math.round(((6 - i) / maxR) * 100),
      })),
      chart: buildChart(embMonthly),
    };
  } catch { return emptyData(['Veículos','Em Rota','Em Trânsito','Entregas/mês','Rotas Ativas','Devoluções']); }
}

async function fetchAssinaturas(): Promise<HubModuleData> {
  try {
    const assinaturas = await getAssinaturas();
    const kpis = calcKPIs(assinaturas);
    const eightMonthsAgo = startOfMonth(subMonths(new Date(), 7)).toISOString();
    const recent = assinaturas.filter((a: AnyRecord) => a.created_at >= eightMonthsAgo);
    const monthly = groupByMonth(recent);
    const [currA, prevA] = currPrev(monthly);

    const planCount: Record<string, number> = {};
    for (const a of assinaturas.filter((a: AnyRecord) => a.status === 'ativa')) {
      const key = (a as AnyRecord).plano_nome ?? 'Sem plano';
      planCount[key] = (planCount[key] ?? 0) + 1;
    }
    const drillList = Object.entries(planCount).sort(([, a], [, b]) => b - a).slice(0, 6);
    const maxP = drillList[0]?.[1] ?? 1;

    return {
      kpis: [
        { id: 'mrr',     label: 'MRR',          value: fmtCurrency(kpis.mrr),          ...changePct(currA, prevA), spark: buildSpark(monthly) },
        { id: 'arr',     label: 'ARR',          value: fmtCurrency(kpis.arr),          change: '—', positive: true, spark: Array(8).fill(0) },
        { id: 'ativas',  label: 'Assinaturas',  value: String(kpis.total_ativas),      change: '—', positive: true, spark: buildSpark(monthly) },
        { id: 'trial',   label: 'Em Trial',     value: String(kpis.total_trial),       change: '—', positive: true, spark: Array(8).fill(0) },
        { id: 'inadim',  label: 'Inadimplentes',value: String(kpis.total_inadimplentes), change: '—', positive: kpis.total_inadimplentes === 0, spark: Array(8).fill(0) },
        { id: 'ticket',  label: 'Ticket Médio', value: fmtCurrency(kpis.ticket_medio), change: '—', positive: true, spark: Array(8).fill(0) },
      ],
      drill: drillList.map(([name, val], i) => ({
        rank: i + 1, name, value: `${val} assinat.`, change: '—', positive: true,
        barWidth: Math.round((val / maxP) * 100),
      })),
      chart: buildChart(monthly),
    };
  } catch { return emptyData(['MRR','ARR','Assinaturas','Em Trial','Inadimplentes','Ticket Médio']); }
}

async function fetchIa(): Promise<HubModuleData> {
  const tids = getTenantIds();
  const eightMonthsAgo = startOfMonth(subMonths(new Date(), 7)).toISOString();
  const [agentsRes, solRes, execRes] = await Promise.allSettled([
    supabase.from('ia_agentes').select('id,nome,status,created_at').in('company_id', tids),
    supabase.from('ia_solicitacoes').select('id,status,created_at').in('company_id', tids),
    supabase.from('ia_execucoes_background').select('id,status,started_at').in('company_id', tids).gte('started_at', eightMonthsAgo),
  ]);
  const agents = agentsRes.status === 'fulfilled' ? (agentsRes.value.data ?? []) : [];
  const solic  = solRes.status    === 'fulfilled' ? (solRes.value.data    ?? []) : [];
  const execs  = execRes.status   === 'fulfilled' ? (execRes.value.data   ?? []) : [];

  const activeAgents = agents.filter((a: AnyRecord) => a.status === 'ativo');
  const execMonthly  = groupByMonth(execs.map((e: AnyRecord) => ({ created_at: e.started_at ?? e.created_at })));
  const [currX, prevX] = currPrev(execMonthly);
  const done = execs.filter((e: AnyRecord) => e.status === 'concluido' || e.status === 'sucesso');
  const successRate = execs.length > 0 ? (done.length / execs.length) * 100 : 0;
  const maxA = agents.length || 1;

  return {
    kpis: [
      { id: 'ativos',    label: 'Agentes Ativos', value: String(activeAgents.length),  change: '—', positive: true, spark: Array(8).fill(activeAgents.length) },
      { id: 'total',     label: 'Total Agentes',  value: String(agents.length),        change: '—', positive: true, spark: Array(8).fill(0) },
      { id: 'execucoes', label: 'Execuções/mês',  value: String(currX),                ...changePct(currX, prevX), spark: buildSpark(execMonthly) },
      { id: 'solicit',   label: 'Solicitações',   value: String(solic.filter((s: AnyRecord) => s.status === 'pendente').length), change: '—', positive: false, spark: Array(8).fill(0) },
      { id: 'sucesso',   label: 'Taxa Sucesso',   value: fmtPct(successRate),          change: '—', positive: successRate >= 80, spark: Array(8).fill(0) },
      { id: 'total_exec',label: 'Total Exec.',    value: String(execs.length),         change: '—', positive: true, spark: buildSpark(execMonthly) },
    ],
    drill: agents.slice(0, 6).map((a: AnyRecord, i) => ({
      rank: i + 1, name: a.nome ?? `Agente ${i + 1}`, value: a.status ?? '—', change: '—', positive: a.status === 'ativo',
      barWidth: Math.round(((maxA - i) / maxA) * 100),
    })),
    chart: buildChart(execMonthly),
  };
}

async function fetchBackoffice(): Promise<HubModuleData> {
  try {
    const [pedidosAll, lancamentos] = await Promise.allSettled([
      getPedidos(),
      getLancamentos(),
    ]);
    const pedidos  = pedidosAll.status  === 'fulfilled' ? pedidosAll.value  : [];
    const lancs    = lancamentos.status === 'fulfilled' ? lancamentos.value : [];

    const receitas = lancs.filter((l: AnyRecord) => l.tipo === 'RECEITA');
    const despesas = lancs.filter((l: AnyRecord) => l.tipo === 'DESPESA');
    const totalRec = receitas.reduce((s: number, l: AnyRecord) => s + Number(l.valor ?? 0), 0);
    const totalDesp= despesas.reduce((s: number, l: AnyRecord) => s + Number(l.valor ?? 0), 0);
    const eightMonthsAgo = startOfMonth(subMonths(new Date(), 7)).toISOString();
    const recentRec = receitas.filter((l: AnyRecord) => l.data_vencimento >= eightMonthsAgo);
    const recMonthly = groupByMonth(recentRec.map((l: AnyRecord) => ({ created_at: l.data_vencimento })),
      (l) => Number((l as AnyRecord).valor ?? 0));
    const [currR, prevR] = currPrev(recMonthly);

    return {
      kpis: [
        { id: 'receita',  label: 'Receitas',    value: fmtCurrency(totalRec),  ...changePct(currR, prevR), spark: buildSpark(recMonthly) },
        { id: 'despesa',  label: 'Despesas',    value: fmtCurrency(totalDesp), change: '—', positive: false, spark: Array(8).fill(0) },
        { id: 'pedidos',  label: 'Pedidos',     value: String(pedidos.length), change: '—', positive: true, spark: Array(8).fill(0) },
        { id: 'lancamentos', label: 'Lançamentos', value: String(lancs.length), change: '—', positive: true, spark: Array(8).fill(0) },
        { id: 'pendentes',label: 'A Vencer',    value: String(lancs.filter((l: AnyRecord) => l.status === 'ABERTO').length), change: '—', positive: false, spark: Array(8).fill(0) },
        { id: 'saldo',    label: 'Saldo Líq.',  value: fmtCurrency(totalRec - totalDesp), change: '—', positive: totalRec >= totalDesp, spark: Array(8).fill(0) },
      ],
      drill: [],
      chart: buildChart(recMonthly),
    };
  } catch { return emptyData(['Receitas','Despesas','Pedidos','Lançamentos','A Vencer','Saldo Líq.']); }
}

async function fetchSettings(): Promise<HubModuleData> {
  const [profilesRes, companiesRes] = await Promise.allSettled([
    supabase.from('zia_operator_profiles').select('id,created_at,role'),
    supabase.from('zia_companies').select('id,type,status,created_at'),
  ]);
  const profiles  = profilesRes.status  === 'fulfilled' ? (profilesRes.value.data  ?? []) : [];
  const companies = companiesRes.status === 'fulfilled' ? (companiesRes.value.data ?? []) : [];
  const active = companies.filter((c: AnyRecord) => c.status === 'ativa');

  return {
    kpis: [
      { id: 'usuarios',   label: 'Usuários',       value: String(profiles.length),  change: '—', positive: true, spark: Array(8).fill(profiles.length) },
      { id: 'empresas',   label: 'Empresas',       value: String(active.length),    change: '—', positive: true, spark: Array(8).fill(0) },
      { id: 'holdings',   label: 'Holdings',       value: String(companies.filter((c: AnyRecord) => c.type === 'holding').length), change: '—', positive: true, spark: Array(8).fill(0) },
      { id: 'matrizes',   label: 'Matrizes',       value: String(companies.filter((c: AnyRecord) => c.type === 'matrix').length),  change: '—', positive: true, spark: Array(8).fill(0) },
      { id: 'filiais',    label: 'Filiais',        value: String(companies.filter((c: AnyRecord) => c.type === 'branch').length),  change: '—', positive: true, spark: Array(8).fill(0) },
      { id: 'admins',     label: 'Admins',         value: String(profiles.filter((p: AnyRecord) => p.role === 'admin').length),    change: '—', positive: true, spark: Array(8).fill(0) },
    ],
    drill: profiles.slice(0, 6).map((p: AnyRecord, i) => ({
      rank: i + 1, name: p.name ?? p.email ?? `Usuário ${i + 1}`, value: p.role ?? '—', change: '—', positive: true,
      barWidth: 100 - i * 14,
    })),
    chart: buildChart(groupByMonth(profiles)),
  };
}

// ── Main dispatcher ───────────────────────────────────────────────────────────

export async function fetchModuleHubData(moduleId: string): Promise<HubModuleData> {
  try {
    switch (moduleId) {
      case 'crm':        return await fetchCrm();
      case 'hr':         return await fetchHr();
      case 'assets':     return await fetchAssets();
      case 'logistics':  return await fetchLogistics();
      case 'assinaturas':return await fetchAssinaturas();
      case 'ia':         return await fetchIa();
      case 'backoffice': return await fetchBackoffice();
      case 'settings':   return await fetchSettings();
      default:           return emptyData(['KPI 1','KPI 2','KPI 3','KPI 4','KPI 5','KPI 6']);
    }
  } catch (err) {
    console.error(`[HubDashboard] Error fetching ${moduleId}:`, err);
    return emptyData(['KPI 1','KPI 2','KPI 3','KPI 4','KPI 5','KPI 6']);
  }
}
