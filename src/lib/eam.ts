// ─────────────────────────────────────────────────────────────────────────────
// EAM Service Layer — Gestão de Ativos / Patrimônio
// Todas as operações lêem/escrevem direto no Supabase — zero mock
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from './supabase';
import { ACTIVE_ENTITY_KEY, SCOPE_IDS_KEY } from '../context/ProfileContext';

// ── Tenant helpers ────────────────────────────────────────────────────────────
const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000001';

function getTenantId(): string {
  const v = localStorage.getItem(ACTIVE_ENTITY_KEY);
  return v && v.trim().length > 0 ? v : DEFAULT_TENANT;
}

function getTenantIds(): string[] {
  const raw = localStorage.getItem(SCOPE_IDS_KEY);
  if (raw) {
    try {
      const ids = (JSON.parse(raw) as string[]).filter(
        (id) => typeof id === 'string' && id.trim().length > 0
      );
      if (Array.isArray(ids) && ids.length > 0) return ids;
    } catch { /* ignore */ }
  }
  return [getTenantId()];
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type AssetType = 'fixo' | 'ti' | 'mobiliario' | 'intangivel';
export type AssetStatus =
  | 'em_aquisicao' | 'disponivel' | 'em_uso' | 'em_manutencao'
  | 'em_emprestimo' | 'descartado' | 'alienado' | 'extraviado';
export type DepreciationMethod =
  | 'linear' | 'soma_digitos' | 'saldo_decrescente_duplo' | 'unidades_produzidas';

export interface AssetCategory {
  id: string;
  tenant_id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  // extra cols from full schema
  description?: string;
  color?: string;
  icon?: string;
  active?: boolean;
  children?: AssetCategory[];
}

export interface Asset {
  id: string;
  tenant_id: string;
  tag: string;
  name: string;
  description: string | null;
  asset_type: AssetType;
  category_id: string | null;
  subcategory_id: string | null;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  acquisition_date: string | null;
  acquisition_value: number;
  supplier_id: string | null;
  supplier_name: string | null;
  invoice_ref: string | null;
  invoice_date: string | null;
  warranty_start: string | null;
  warranty_end: string | null;
  warranty_supplier: string | null;
  location_id: string | null;
  location_unit: string | null;
  location_floor: string | null;
  location_room: string | null;
  responsible_id: string | null;
  responsible_name: string | null;
  department_id: string | null;
  department_name: string | null;
  depreciation_method: DepreciationMethod;
  useful_life_months: number;
  residual_value: number;
  depreciation_start: string | null;
  total_units: number | null;
  current_book_value: number | null;
  status: AssetStatus;
  qr_code_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  // joins
  asset_categories?: { name: string } | null;
}

export interface AssetFile {
  id: string;
  tenant_id: string;
  asset_id: string;
  file_type: 'foto' | 'nota_fiscal' | 'manual' | 'certificado_calibracao' | 'laudo_vistoria' | 'contrato' | 'outro';
  storage_path: string;
  url: string | null;
  original_name: string;
  size_bytes: number | null;
  mime_type: string | null;
  is_primary: boolean;
  uploaded_by: string | null;
  uploaded_at: string;
}

export interface AssetHistoryEvent {
  id: string;
  tenant_id: string;
  asset_id: string;
  event_type: string;
  from_responsible_id: string | null;
  from_department_id: string | null;
  from_status: string | null;
  to_responsible_id: string | null;
  to_department_id: string | null;
  to_status: string | null;
  justification: string;
  approved_by: string | null;
  user_id: string | null;
  created_at: string;
}

export interface AssetWorkflow {
  id: string;
  tenant_id: string;
  asset_id: string;
  type: 'transferencia' | 'requisicao_uso' | 'emprestimo';
  requester_id: string | null;
  target_responsible_id: string | null;
  approver_id: string | null;
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'confirmado_recebimento' | 'cancelado';
  requested_at: string;
  approved_at: string | null;
  confirmed_at: string | null;
  cancelled_at: string | null;
  requester_comment: string | null;
  approver_comment: string | null;
  confirmation_comment: string | null;
  created_at: string;
  // extended fields from full schema
  requester_name?: string;
  target_responsible_name?: string;
  target_department?: string;
}

export interface DepreciationSnapshot {
  id: string;
  tenant_id: string;
  asset_id: string;
  reference_month: number;
  reference_year: number;
  monthly_quota: number;
  accumulated_depreciation: number;
  net_book_value: number;
  financial_entry_id: string | null;
  auto_generated: boolean;
  created_at: string;
}

export interface MaintenancePlan {
  id: string;
  tenant_id: string;
  asset_id: string;
  name: string;
  trigger_type: 'periodicidade' | 'contador';
  trigger_value: number;
  trigger_unit: string;
  service_description: string;
  preferred_supplier_id: string | null;
  preferred_supplier_name: string | null;
  estimated_cost: number | null;
  advance_alert_days: number;
  next_due_date: string | null;
  last_executed: string | null;
  status: 'ativo' | 'pausado' | 'cancelado';
  created_at: string;
  updated_at: string;
}

export interface WorkOrder {
  id: string;
  tenant_id: string;
  asset_id: string;
  plan_id: string | null;
  order_number: string | null;
  type: 'preventiva' | 'corretiva';
  status: 'aberta' | 'em_andamento' | 'aguardando_peca' | 'concluida' | 'cancelada';
  title: string;
  failure_description: string | null;
  root_cause: string | null;
  solution_applied: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  technician_name: string | null;
  estimated_cost: number | null;
  parts_cost: number;
  labor_cost: number;
  total_cost: number;
  opened_at: string;
  started_at: string | null;
  concluded_at: string | null;
  cancelled_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface InsurancePolicy {
  id: string;
  tenant_id: string;
  policy_number: string;
  insurer_name: string;
  coverage_type: string;
  coverage_details: string | null;
  insured_value: number;
  annual_premium: number | null;
  monthly_premium: number | null;
  coverage_start: string;
  coverage_end: string;
  status: 'ativa' | 'vencida' | 'cancelada';
  broker_name: string | null;
  broker_contact: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface InsuranceClaim {
  id: string;
  tenant_id: string;
  policy_id: string;
  asset_id: string | null;
  claim_date: string;
  description: string;
  claim_value: number | null;
  paid_value: number | null;
  status: 'aberto' | 'em_analise' | 'pago' | 'negado' | 'encerrado';
  resolution_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Inventory {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  scope: 'geral' | 'por_setor' | 'por_unidade';
  scope_ref: string | null;
  scope_label: string | null;
  status: 'planejado' | 'em_andamento' | 'concluido';
  responsible_id: string | null;
  responsible_name: string | null;
  planned_start: string | null;
  started_at: string | null;
  ended_at: string | null;
  total_expected: number;
  total_found: number;
  total_missing: number;
  total_new: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  tenant_id: string;
  inventory_id: string;
  asset_id: string | null;
  asset_tag: string | null;
  asset_name: string | null;
  status: 'pendente' | 'localizado' | 'nao_encontrado' | 'encontrado_sem_cadastro';
  found_location: string | null;
  expected_location: string | null;
  checked_by: string | null;
  checked_at: string | null;
  notes: string | null;
  created_at: string;
}

// ── Pagination helper ─────────────────────────────────────────────────────────
export interface PageResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ── Tag generation ────────────────────────────────────────────────────────────
export async function generateAssetTag(): Promise<string> {
  const tenantId = getTenantId();
  const year = new Date().getFullYear();

  // Upsert counter e incrementar atomicamente
  const { data, error } = await supabase.rpc('increment_asset_tag_sequence', {
    p_tenant_id: tenantId,
  });

  let seq = 1;
  if (error || data == null) {
    // fallback: buscar o último e incrementar
    const { data: row } = await supabase
      .from('asset_tag_sequences')
      .select('last_sequence')
      .eq('tenant_id', tenantId)
      .single();
    seq = (row?.last_sequence ?? 0) + 1;
    await supabase
      .from('asset_tag_sequences')
      .upsert({ tenant_id: tenantId, last_sequence: seq }, { onConflict: 'tenant_id' });
  } else {
    seq = data as number;
  }

  const seqPadded = String(seq).padStart(5, '0');
  return `PAT-${year}-${seqPadded}`;
}

// ── Categories ────────────────────────────────────────────────────────────────
export async function getCategories(): Promise<AssetCategory[]> {
  const { data } = await supabase
    .from('asset_categories')
    .select('*')
    .in('tenant_id', [...getTenantIds(), 'default'])
    .order('name');
  return data ?? [];
}

export async function createCategory(payload: {
  name: string;
  parent_id?: string | null;
  description?: string;
  color?: string;
  icon?: string;
}): Promise<AssetCategory> {
  const { data, error } = await supabase
    .from('asset_categories')
    .insert({ ...payload, tenant_id: getTenantId() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCategory(id: string, changes: Partial<AssetCategory>): Promise<void> {
  const { error } = await supabase
    .from('asset_categories')
    .update(changes)
    .eq('id', id)
    .eq('tenant_id', getTenantId());
  if (error) throw error;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from('asset_categories')
    .delete()
    .eq('id', id)
    .eq('tenant_id', getTenantId());
  if (error) throw error;
}

// ── Assets ────────────────────────────────────────────────────────────────────
export interface AssetFilters {
  search?: string;
  status?: AssetStatus | '';
  asset_type?: AssetType | '';
  category_id?: string;
  department_id?: string;
  responsible_id?: string;
  acquisition_value_min?: number;
  acquisition_value_max?: number;
  orderBy?: keyof Asset;
  orderDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export async function getAssets(filters: AssetFilters = {}): Promise<PageResult<Asset>> {
  const {
    search, status, asset_type, category_id, department_id, responsible_id,
    acquisition_value_min, acquisition_value_max,
    orderBy = 'created_at', orderDir = 'desc',
    page = 1, pageSize = 20,
  } = filters;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('assets')
    .select('*, asset_categories!assets_category_id_fkey(name)', { count: 'exact' })
    .in('tenant_id', getTenantIds())
    .order(orderBy as string, { ascending: orderDir === 'asc' })
    .range(from, to);

  if (search) {
    query = query.or(`name.ilike.%${search}%,tag.ilike.%${search}%,serial_number.ilike.%${search}%`);
  }
  if (status) query = query.eq('status', status);
  if (asset_type) query = query.eq('asset_type', asset_type);
  if (category_id) query = query.eq('category_id', category_id);
  if (department_id) query = query.eq('department_id', department_id);
  if (responsible_id) query = query.eq('responsible_id', responsible_id);
  if (acquisition_value_min != null) query = query.gte('acquisition_value', acquisition_value_min);
  if (acquisition_value_max != null) query = query.lte('acquisition_value', acquisition_value_max);

  const { data, count, error } = await query;
  if (error) throw error;
  return { data: data ?? [], total: count ?? 0, page, pageSize };
}

export async function getAssetById(id: string): Promise<Asset | null> {
  const { data } = await supabase
    .from('assets')
    .select('*, asset_categories!assets_category_id_fkey(name)')
    .eq('id', id)
    .in('tenant_id', getTenantIds())
    .single();
  return data ?? null;
}

export async function createAsset(payload: Omit<Asset, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'tag'>): Promise<Asset> {
  const tag = await generateAssetTag();
  const tenantId = getTenantId();
  const qr_code_url = `${window.location.origin}/app/assets?asset=${tag}`;

  const { data, error } = await supabase
    .from('assets')
    .insert({ ...payload, tag, tenant_id: tenantId, qr_code_url })
    .select()
    .single();
  if (error) throw error;

  // Registrar criação no histórico
  await addHistory(data.id, 'criacao', { justification: 'Ativo cadastrado no sistema' });

  return data;
}

export async function updateAsset(id: string, changes: Partial<Asset>): Promise<void> {
  const { error } = await supabase
    .from('assets')
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', getTenantId());
  if (error) throw error;
  await addHistory(id, 'edicao', { justification: 'Dados do ativo atualizados' });
}

export async function changeAssetStatus(
  id: string,
  newStatus: AssetStatus,
  justification: string
): Promise<void> {
  const asset = await getAssetById(id);
  if (!asset) throw new Error('Ativo não encontrado');

  await supabase
    .from('assets')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', getTenantId());

  await addHistory(id, 'mudanca_status', {
    justification,
    from_status: asset.status,
    to_status: newStatus,
  });
}

// ── History ───────────────────────────────────────────────────────────────────
interface HistoryPayload {
  justification: string;
  from_status?: string;
  to_status?: string;
  from_responsible_id?: string;
  to_responsible_id?: string;
  from_department_id?: string;
  to_department_id?: string;
}

export async function addHistory(
  assetId: string,
  eventType: AssetHistoryEvent['event_type'],
  payload: HistoryPayload
): Promise<void> {
  await supabase.from('asset_history').insert({
    tenant_id: getTenantId(),
    asset_id: assetId,
    event_type: eventType,
    justification: payload.justification,
    from_status: payload.from_status ?? null,
    to_status: payload.to_status ?? null,
    from_responsible_id: payload.from_responsible_id ?? null,
    to_responsible_id: payload.to_responsible_id ?? null,
    from_department_id: payload.from_department_id ?? null,
    to_department_id: payload.to_department_id ?? null,
  });
}

export async function getAssetHistory(
  assetId: string,
  page = 1,
  pageSize = 20,
): Promise<PageResult<AssetHistoryEvent>> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count, error } = await supabase
    .from('asset_history')
    .select('*', { count: 'exact' })
    .eq('asset_id', assetId)
    .in('tenant_id', getTenantIds())
    .order('created_at', { ascending: false })
    .range(from, to);
  if (error) throw error;
  return { data: data ?? [], total: count ?? 0, page, pageSize };
}

// ── Files ─────────────────────────────────────────────────────────────────────
export async function getAssetFiles(assetId: string): Promise<AssetFile[]> {
  const { data } = await supabase
    .from('asset_files')
    .select('*')
    .eq('asset_id', assetId)
    .order('uploaded_at', { ascending: false });
  return data ?? [];
}

export async function uploadAssetFile(
  assetId: string,
  file: File,
  fileType: AssetFile['file_type'],
  isPrimary = false
): Promise<AssetFile> {
  const tenantId = getTenantId();
  const ext = file.name.split('.').pop();
  const path = `assets/${tenantId}/${assetId}/${Date.now()}.${ext}`;

  const { error: upErr } = await supabase.storage.from('ia-arquivos').upload(path, file);
  if (upErr) throw upErr;

  const { data: urlData } = supabase.storage.from('ia-arquivos').getPublicUrl(path);

  if (isPrimary) {
    await supabase
      .from('asset_files')
      .update({ is_primary: false })
      .eq('asset_id', assetId)
      .eq('file_type', 'foto');
  }

  const { data, error } = await supabase
    .from('asset_files')
    .insert({
      tenant_id: tenantId,
      asset_id: assetId,
      file_type: fileType,
      storage_path: path,
      url: urlData.publicUrl,
      original_name: file.name,
      size_bytes: file.size,
      mime_type: file.type,
      is_primary: isPrimary,
    })
    .select()
    .single();
  if (error) throw error;

  await addHistory(assetId, 'upload_documento', {
    justification: `Documento "${file.name}" anexado (${fileType})`,
  });
  return data;
}

export async function deleteAssetFile(fileId: string, storagePath: string): Promise<void> {
  await supabase.storage.from('ia-arquivos').remove([storagePath]);
  await supabase.from('asset_files').delete().eq('id', fileId);
}

// ── Workflows ─────────────────────────────────────────────────────────────────
export async function getWorkflows(status?: string): Promise<AssetWorkflow[]> {
  let query = supabase
    .from('asset_workflows')
    .select('*')
    .in('tenant_id', getTenantIds())
    .order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data } = await query;
  return data ?? [];
}

export async function createWorkflow(payload: {
  asset_id: string;
  type: AssetWorkflow['type'];
  requester_name: string;
  target_responsible_name: string;
  target_department?: string;
  requester_comment?: string;
  expected_return?: string;
}): Promise<AssetWorkflow> {
  const { data, error } = await supabase
    .from('asset_workflows')
    .insert({ ...payload, tenant_id: getTenantId(), status: 'pendente' })
    .select()
    .single();
  if (error) throw error;

  await changeAssetStatus(payload.asset_id, 'em_emprestimo', `Requisição de ${payload.type} criada`);
  return data;
}

export async function approveWorkflow(id: string, notes?: string): Promise<void> {
  const { error } = await supabase
    .from('asset_workflows')
    .update({ status: 'aprovado', approved_at: new Date().toISOString(), approver_comment: notes ?? null })
    .eq('id', id)
    .eq('tenant_id', getTenantId());
  if (error) throw error;
}

export async function rejectWorkflow(id: string, reason: string): Promise<void> {
  const { error } = await supabase
    .from('asset_workflows')
    .update({ status: 'rejeitado', cancelled_at: new Date().toISOString(), approver_comment: reason })
    .eq('id', id)
    .eq('tenant_id', getTenantId());
  if (error) throw error;
}

export async function confirmWorkflowReceipt(id: string, notes?: string): Promise<void> {
  const wf = await supabase.from('asset_workflows').select('*').eq('id', id).single();
  const { error } = await supabase
    .from('asset_workflows')
    .update({ status: 'confirmado_recebimento', confirmed_at: new Date().toISOString(), confirmation_comment: notes ?? null })
    .eq('id', id)
    .eq('tenant_id', getTenantId());
  if (error) throw error;

  if (wf.data) {
    await addHistory(wf.data.asset_id, 'transferencia', {
      justification: `Recebimento confirmado. ${notes ?? ''}`.trim(),
      to_responsible_id: wf.data.target_responsible_id,
    });
  }
}

// ── Depreciation ──────────────────────────────────────────────────────────────
export function calcLinear(cost: number, residual: number, lifeMonths: number): number {
  if (lifeMonths <= 0) return 0;
  return (cost - residual) / lifeMonths;
}

export function calcSumOfYears(cost: number, residual: number, lifeMonths: number, elapsedMonths: number): number {
  const n = Math.ceil(lifeMonths / 12);
  const sumDigits = (n * (n + 1)) / 2;
  const year = Math.floor(elapsedMonths / 12);
  const remaining = n - year;
  if (remaining <= 0) return 0;
  return ((cost - residual) * remaining) / (sumDigits * 12);
}

export function calcDoubleDecl(currentBookValue: number, residual: number, lifeMonths: number): number {
  if (lifeMonths <= 0) return 0;
  const rate = 2 / lifeMonths;
  const quota = currentBookValue * rate;
  return currentBookValue - quota < residual ? Math.max(0, currentBookValue - residual) : quota;
}

export async function getDepreciationSnapshots(assetId: string): Promise<DepreciationSnapshot[]> {
  const { data } = await supabase
    .from('asset_depreciation_snapshots')
    .select('*')
    .eq('asset_id', assetId)
    .order('reference_year', { ascending: true })
    .order('reference_month', { ascending: true });
  return data ?? [];
}

export async function runDepreciationForAsset(asset: Asset, unitsPeriod?: number): Promise<DepreciationSnapshot | null> {
  if (!asset.depreciation_start || asset.acquisition_value <= 0) return null;

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const start = new Date(asset.depreciation_start);
  const elapsedMonths =
    (year - start.getFullYear()) * 12 + (month - (start.getMonth() + 1));
  if (elapsedMonths < 0) return null;

  const currentBV = asset.current_book_value ?? asset.acquisition_value;
  let quota = 0;

  switch (asset.depreciation_method) {
    case 'linear':
      quota = calcLinear(asset.acquisition_value, asset.residual_value, asset.useful_life_months);
      break;
    case 'soma_digitos':
      quota = calcSumOfYears(asset.acquisition_value, asset.residual_value, asset.useful_life_months, elapsedMonths);
      break;
    case 'saldo_decrescente_duplo':
      quota = calcDoubleDecl(currentBV, asset.residual_value, asset.useful_life_months);
      break;
    case 'unidades_produzidas':
      quota = calcUnitsProduced(
        asset.acquisition_value, asset.residual_value,
        asset.total_units ?? 1, unitsPeriod ?? 0,
      );
      break;
    default:
      quota = calcLinear(asset.acquisition_value, asset.residual_value, asset.useful_life_months);
  }

  const snapshots = await getDepreciationSnapshots(asset.id);
  const accumulated = snapshots.reduce((s, sn) => s + Number(sn.monthly_quota), 0) + quota;
  const netBookValue = Math.max(asset.residual_value, asset.acquisition_value - accumulated);
  quota = Math.min(quota, Math.max(0, currentBV - asset.residual_value));

  const { data, error } = await supabase
    .from('asset_depreciation_snapshots')
    .upsert({
      tenant_id: getTenantId(),
      asset_id: asset.id,
      reference_month: month,
      reference_year: year,
      monthly_quota: quota,
      accumulated_depreciation: accumulated,
      net_book_value: netBookValue,
      auto_generated: true,
    }, { onConflict: 'asset_id,reference_month,reference_year' })
    .select()
    .single();

  if (!error && data) {
    await supabase
      .from('assets')
      .update({ current_book_value: netBookValue })
      .eq('id', asset.id);
  }

  return data ?? null;
}

// ── Maintenance Plans ─────────────────────────────────────────────────────────
export async function getMaintenancePlans(assetId?: string): Promise<MaintenancePlan[]> {
  let query = supabase
    .from('asset_maintenance_plans')
    .select('*')
    .in('tenant_id', getTenantIds())
    .order('next_due_date', { ascending: true });
  if (assetId) query = query.eq('asset_id', assetId);
  const { data } = await query;
  return data ?? [];
}

export async function createMaintenancePlan(payload: Omit<MaintenancePlan, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>): Promise<MaintenancePlan> {
  const { data, error } = await supabase
    .from('asset_maintenance_plans')
    .insert({ ...payload, tenant_id: getTenantId() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateMaintenancePlan(id: string, changes: Partial<MaintenancePlan>): Promise<void> {
  const { error } = await supabase
    .from('asset_maintenance_plans')
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', getTenantId());
  if (error) throw error;
}

export async function deleteMaintenancePlan(id: string): Promise<void> {
  const { error } = await supabase
    .from('asset_maintenance_plans')
    .delete()
    .eq('id', id)
    .eq('tenant_id', getTenantId());
  if (error) throw error;
}

// ── Work Orders ───────────────────────────────────────────────────────────────
export async function getWorkOrders(assetId?: string, status?: string): Promise<WorkOrder[]> {
  let query = supabase
    .from('asset_work_orders')
    .select('*')
    .in('tenant_id', getTenantIds())
    .order('opened_at', { ascending: false });
  if (assetId) query = query.eq('asset_id', assetId);
  if (status) query = query.eq('status', status);
  const { data } = await query;
  return data ?? [];
}

export async function createWorkOrder(payload: Omit<WorkOrder, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'parts_cost' | 'labor_cost' | 'total_cost'>): Promise<WorkOrder> {
  const { data, error } = await supabase
    .from('asset_work_orders')
    .insert({ ...payload, tenant_id: getTenantId(), parts_cost: 0, labor_cost: 0, total_cost: 0 })
    .select()
    .single();
  if (error) throw error;
  await changeAssetStatus(payload.asset_id, 'em_manutencao', `OS ${data.order_number ?? data.id} aberta`);
  await addHistory(payload.asset_id, 'manutencao_iniciada', { justification: `Ordem de serviço aberta: ${payload.title}` });
  return data;
}

export async function updateWorkOrder(id: string, changes: Partial<WorkOrder>): Promise<void> {
  const total = (changes.parts_cost ?? 0) + (changes.labor_cost ?? 0);
  const { error } = await supabase
    .from('asset_work_orders')
    .update({ ...changes, total_cost: total || changes.total_cost, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', getTenantId());
  if (error) throw error;
}

export async function closeWorkOrder(id: string, solution: string, costs: { parts: number; labor: number }): Promise<void> {
  const { data: wo } = await supabase.from('asset_work_orders').select('asset_id,title').eq('id', id).single();
  await supabase.from('asset_work_orders').update({
    status: 'concluida',
    solution_applied: solution,
    parts_cost: costs.parts,
    labor_cost: costs.labor,
    total_cost: costs.parts + costs.labor,
    concluded_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', id);
  if (wo) {
    await changeAssetStatus(wo.asset_id, 'disponivel', 'Manutenção concluída');
    await addHistory(wo.asset_id, 'manutencao_concluida', { justification: `OS concluída: ${wo.title}. ${solution}` });
  }
}

// ── Insurance ─────────────────────────────────────────────────────────────────
export async function getInsurancePolicies(): Promise<InsurancePolicy[]> {
  const { data } = await supabase
    .from('asset_insurance_policies')
    .select('*')
    .in('tenant_id', getTenantIds())
    .order('coverage_end', { ascending: true });
  return data ?? [];
}

export async function createInsurancePolicy(payload: Omit<InsurancePolicy, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>): Promise<InsurancePolicy> {
  const { data, error } = await supabase
    .from('asset_insurance_policies')
    .insert({ ...payload, tenant_id: getTenantId() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateInsurancePolicy(id: string, changes: Partial<InsurancePolicy>): Promise<void> {
  const { error } = await supabase
    .from('asset_insurance_policies')
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', getTenantId());
  if (error) throw error;
}

export async function getPolicyAssets(policyId: string): Promise<string[]> {
  const { data } = await supabase
    .from('asset_policy_items')
    .select('asset_id')
    .eq('policy_id', policyId);
  return (data ?? []).map((r) => r.asset_id);
}

export async function setPolicyAssets(policyId: string, assetIds: string[]): Promise<void> {
  const tenantId = getTenantId();
  await supabase.from('asset_policy_items').delete().eq('policy_id', policyId);
  if (assetIds.length === 0) return;
  await supabase.from('asset_policy_items').insert(
    assetIds.map((aid) => ({ tenant_id: tenantId, policy_id: policyId, asset_id: aid }))
  );
}

export async function getClaims(policyId?: string): Promise<InsuranceClaim[]> {
  let query = supabase
    .from('asset_claims')
    .select('*')
    .in('tenant_id', getTenantIds())
    .order('claim_date', { ascending: false });
  if (policyId) query = query.eq('policy_id', policyId);
  const { data } = await query;
  return data ?? [];
}

export async function createClaim(payload: Omit<InsuranceClaim, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>): Promise<InsuranceClaim> {
  const { data, error } = await supabase
    .from('asset_claims')
    .insert({ ...payload, tenant_id: getTenantId() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateClaim(id: string, changes: Partial<InsuranceClaim>): Promise<void> {
  const { error } = await supabase
    .from('asset_claims')
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', getTenantId());
  if (error) throw error;
}

// ── Inventory ─────────────────────────────────────────────────────────────────
export async function getInventories(): Promise<Inventory[]> {
  const { data } = await supabase
    .from('asset_inventories')
    .select('*')
    .in('tenant_id', getTenantIds())
    .order('created_at', { ascending: false });
  return data ?? [];
}

export async function createInventory(payload: Omit<Inventory, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'total_expected' | 'total_found' | 'total_missing' | 'total_new'>): Promise<Inventory> {
  const { data, error } = await supabase
    .from('asset_inventories')
    .insert({ ...payload, tenant_id: getTenantId(), total_expected: 0, total_found: 0, total_missing: 0, total_new: 0 })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function startInventory(id: string): Promise<void> {
  const tenantId = getTenantId();

  // Snapshot dos ativos ativos do tenant
  const { data: activeAssets } = await supabase
    .from('assets')
    .select('id, tag, name, location_unit, location_floor, location_room')
    .in('tenant_id', getTenantIds())
    .not('status', 'in', '("descartado","alienado","extraviado")');

  const items = (activeAssets ?? []).map((a) => ({
    tenant_id: tenantId,
    inventory_id: id,
    asset_id: a.id,
    asset_tag: a.tag,
    asset_name: a.name,
    status: 'pendente',
    expected_location: [a.location_unit, a.location_floor, a.location_room].filter(Boolean).join(' / ') || null,
  }));

  if (items.length > 0) {
    await supabase.from('asset_inventory_items').insert(items);
  }

  await supabase.from('asset_inventories').update({
    status: 'em_andamento',
    started_at: new Date().toISOString(),
    total_expected: items.length,
    updated_at: new Date().toISOString(),
  }).eq('id', id);
}

export async function checkInventoryItem(
  inventoryId: string,
  assetTag: string,
  foundLocation?: string,
  notes?: string
): Promise<InventoryItem | null> {
  const { data: item } = await supabase
    .from('asset_inventory_items')
    .select('*')
    .eq('inventory_id', inventoryId)
    .eq('asset_tag', assetTag)
    .single();

  if (!item) return null;

  const { data } = await supabase
    .from('asset_inventory_items')
    .update({
      status: 'localizado',
      found_location: foundLocation ?? null,
      checked_at: new Date().toISOString(),
      notes: notes ?? null,
    })
    .eq('id', item.id)
    .select()
    .single();

  return data ?? null;
}

export async function getInventoryItems(inventoryId: string): Promise<InventoryItem[]> {
  const { data } = await supabase
    .from('asset_inventory_items')
    .select('*')
    .eq('inventory_id', inventoryId)
    .order('asset_tag', { ascending: true });
  return data ?? [];
}

export async function finishInventory(id: string): Promise<void> {
  const items = await getInventoryItems(id);
  const found = items.filter((i) => i.status === 'localizado').length;
  const missing = items.filter((i) => i.status === 'nao_encontrado').length;
  const newItems = items.filter((i) => i.status === 'encontrado_sem_cadastro').length;

  // Marcar pendentes como não encontrados
  await supabase
    .from('asset_inventory_items')
    .update({ status: 'nao_encontrado' })
    .eq('inventory_id', id)
    .eq('status', 'pendente');

  await supabase.from('asset_inventories').update({
    status: 'concluido',
    ended_at: new Date().toISOString(),
    total_found: found,
    total_missing: missing + items.filter((i) => i.status === 'pendente').length,
    total_new: newItems,
    updated_at: new Date().toISOString(),
  }).eq('id', id);
}

// ── Dashboard stats ───────────────────────────────────────────────────────────
export interface DashboardStats {
  totalAssets: number;
  totalValue: number;
  totalBookValue: number;
  inMaintenance: number;
  warrantyExpiringSoon: Asset[];
  assetsWithoutResponsible: Asset[];
  byStatus: { status: string; count: number }[];
  byType: { type: string; count: number }[];
  recentActivity: AssetHistoryEvent[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const tenantIds = getTenantIds();
  const today = new Date();
  const in30days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [assetsRes, histRes] = await Promise.all([
    supabase
      .from('assets')
      .select('id, status, asset_type, acquisition_value, current_book_value, responsible_id, warranty_end')
      .in('tenant_id', tenantIds),
    supabase
      .from('asset_history')
      .select('*')
      .in('tenant_id', tenantIds)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const all = assetsRes.data ?? [];
  const byStatus: Record<string, number> = {};
  const byType: Record<string, number> = {};
  let totalValue = 0;
  let totalBookValue = 0;

  for (const a of all) {
    byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
    byType[a.asset_type] = (byType[a.asset_type] ?? 0) + 1;
    totalValue += Number(a.acquisition_value ?? 0);
    totalBookValue += Number(a.current_book_value ?? a.acquisition_value ?? 0);
  }

  const warrantyExpiringSoon = all
    .filter((a) => a.warranty_end && a.warranty_end <= in30days && a.warranty_end >= today.toISOString().split('T')[0])
    .slice(0, 5) as Asset[];

  const assetsWithoutResponsible = all
    .filter((a) => !a.responsible_id)
    .slice(0, 5) as Asset[];

  return {
    totalAssets: all.length,
    totalValue,
    totalBookValue,
    inMaintenance: byStatus['em_manutencao'] ?? 0,
    warrantyExpiringSoon,
    assetsWithoutResponsible,
    byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
    byType: Object.entries(byType).map(([type, count]) => ({ type, count })),
    recentActivity: histRes.data ?? [],
  };
}

// ── Locations ─────────────────────────────────────────────────────────────────
export interface AssetLocation {
  id: string;
  tenant_id: string;
  name: string;
  type: 'unidade' | 'predio' | 'andar' | 'sala' | 'almoxarifado' | 'externo';
  parent_id: string | null;
  address: string | null;
  active: boolean;
  created_at: string;
}

export async function getLocations(): Promise<AssetLocation[]> {
  const { data } = await supabase
    .from('asset_locations')
    .select('*')
    .in('tenant_id', getTenantIds())
    .eq('active', true)
    .order('name');
  return data ?? [];
}

export async function createLocation(payload: {
  name: string;
  type: AssetLocation['type'];
  parent_id?: string;
  address?: string;
  active?: boolean;
}): Promise<AssetLocation> {
  const { data, error } = await supabase
    .from('asset_locations')
    .insert({ ...payload, tenant_id: getTenantId() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteLocation(id: string): Promise<void> {
  const { error } = await supabase
    .from('asset_locations')
    .delete()
    .eq('id', id)
    .eq('tenant_id', getTenantId());
  if (error) throw error;
}

// ── Notification Rules ────────────────────────────────────────────────────────
export interface NotificationRules {
  tenant_id: string;
  warranty_alert_days: number[];
  insurance_alert_days: number[];
  maintenance_alert_days: number;
  no_responsible_alert_days: number;
}

export async function getNotificationRules(): Promise<NotificationRules | null> {
  const { data } = await supabase
    .from('asset_notification_rules')
    .select('*')
    .eq('tenant_id', getTenantId())
    .single();
  return data ?? null;
}

export async function saveNotificationRules(rules: Omit<NotificationRules, 'tenant_id'>): Promise<void> {
  const { error } = await supabase
    .from('asset_notification_rules')
    .upsert({ ...rules, tenant_id: getTenantId() }, { onConflict: 'tenant_id' });
  if (error) throw error;
}

// ── Depreciation — extras ─────────────────────────────────────────────────────
/** Quota mensal pelo método Unidades Produzidas */
export function calcUnitsProduced(
  cost: number,
  residual: number,
  totalUnits: number,
  unitsPeriod: number,
): number {
  if (totalUnits <= 0) return 0;
  const ratePerUnit = (cost - residual) / totalUnits;
  return Math.max(0, ratePerUnit * unitsPeriod);
}

export interface DepreciationProjectionRow {
  month: number;
  year: number;
  label: string;
  quota: number;
  accumulated: number;
  netBookValue: number;
}

/** Projeção futura sem gravar no banco */
export function getDepreciationProjection(asset: Asset, months = 60): DepreciationProjectionRow[] {
  if (!asset.depreciation_start || asset.acquisition_value <= 0) return [];

  const start = new Date(asset.depreciation_start);
  const now = new Date();
  const rows: DepreciationProjectionRow[] = [];
  let currentBV = asset.current_book_value ?? asset.acquisition_value;
  let accumulated = asset.acquisition_value - currentBV;

  const startOffset =
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());

  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const elapsed = startOffset + i;
    let quota = 0;

    switch (asset.depreciation_method) {
      case 'linear':
        quota = calcLinear(asset.acquisition_value, asset.residual_value, asset.useful_life_months);
        break;
      case 'soma_digitos':
        quota = calcSumOfYears(asset.acquisition_value, asset.residual_value, asset.useful_life_months, elapsed);
        break;
      case 'saldo_decrescente_duplo':
        quota = calcDoubleDecl(currentBV, asset.residual_value, asset.useful_life_months);
        break;
      default:
        quota = calcLinear(asset.acquisition_value, asset.residual_value, asset.useful_life_months);
    }

    quota = Math.min(quota, Math.max(0, currentBV - asset.residual_value));
    if (quota <= 0 && currentBV <= asset.residual_value) break;

    accumulated += quota;
    currentBV = Math.max(asset.residual_value, asset.acquisition_value - accumulated);

    rows.push({
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      label: d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
      quota,
      accumulated,
      netBookValue: currentBV,
    });
  }
  return rows;
}

// ── Workflow — cancel ─────────────────────────────────────────────────────────
export async function cancelWorkflow(id: string, reason: string): Promise<void> {
  const { error } = await supabase
    .from('asset_workflows')
    .update({ status: 'cancelado', cancelled_at: new Date().toISOString(), approver_comment: reason })
    .eq('id', id)
    .eq('tenant_id', getTenantId());
  if (error) throw error;
}

// ── Insurance — delete policy ─────────────────────────────────────────────────
export async function deleteInsurancePolicy(id: string): Promise<void> {
  const { error } = await supabase
    .from('asset_insurance_policies')
    .delete()
    .eq('id', id)
    .eq('tenant_id', getTenantId());
  if (error) throw error;
}

// ── Dashboard — extended ──────────────────────────────────────────────────────
export interface DashboardStatsExtended extends DashboardStats {
  maintenanceCostMonths: { label: string; cost: number }[];
  valueEvolution: { label: string; value: number; bookValue: number }[];
  insuranceExpiringSoon: InsurancePolicy[];
  maintenanceOverdue: MaintenancePlan[];
}

export async function getDashboardStatsExtended(): Promise<DashboardStatsExtended> {
  const tenantIds = getTenantIds();
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const in30days = new Date(today.getTime() + 30 * 86400000).toISOString().split('T')[0];
  const in60days = new Date(today.getTime() + 60 * 86400000).toISOString().split('T')[0];
  const sixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 5, 1);

  const [assetsRes, histRes, woRes, policiesRes, plansRes] = await Promise.all([
    supabase
      .from('assets')
      .select('id,status,asset_type,acquisition_value,current_book_value,responsible_id,warranty_end,depreciation_start,acquisition_date,category_id')
      .in('tenant_id', tenantIds),
    supabase
      .from('asset_history')
      .select('*')
      .in('tenant_id', tenantIds)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('asset_work_orders')
      .select('total_cost,concluded_at,opened_at')
      .in('tenant_id', tenantIds)
      .gte('opened_at', sixMonthsAgo.toISOString()),
    supabase
      .from('asset_insurance_policies')
      .select('*')
      .in('tenant_id', tenantIds)
      .eq('status', 'ativa')
      .lte('coverage_end', in60days)
      .gte('coverage_end', todayStr),
    supabase
      .from('asset_maintenance_plans')
      .select('*')
      .in('tenant_id', tenantIds)
      .eq('status', 'ativo')
      .lt('next_due_date', todayStr),
  ]);

  const all = assetsRes.data ?? [];
  const byStatus: Record<string, number> = {};
  const byType: Record<string, number> = {};
  let totalValue = 0;
  let totalBookValue = 0;

  for (const a of all) {
    byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
    byType[a.asset_type] = (byType[a.asset_type] ?? 0) + 1;
    totalValue += Number(a.acquisition_value ?? 0);
    totalBookValue += Number(a.current_book_value ?? a.acquisition_value ?? 0);
  }

  // 12-month value evolution (acquisition count * avg value per month)
  const valueEvolution: { label: string; value: number; bookValue: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const cutoff = d.toISOString().split('T')[0];
    const active = all.filter((a) => a.acquisition_date && a.acquisition_date <= cutoff);
    const val = active.reduce((s, a) => s + Number(a.acquisition_value ?? 0), 0);
    const bv = active.reduce((s, a) => s + Number(a.current_book_value ?? a.acquisition_value ?? 0), 0);
    valueEvolution.push({
      label: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      value: val,
      bookValue: bv,
    });
  }

  // 6-month maintenance costs
  const maintenanceCostMonths: { label: string; cost: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const nextD = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
    const cost = (woRes.data ?? [])
      .filter((o) => o.concluded_at && o.concluded_at >= d.toISOString() && o.concluded_at < nextD.toISOString())
      .reduce((s, o) => s + Number(o.total_cost ?? 0), 0);
    maintenanceCostMonths.push({
      label: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      cost,
    });
  }

  return {
    totalAssets: all.length,
    totalValue,
    totalBookValue,
    inMaintenance: byStatus['em_manutencao'] ?? 0,
    warrantyExpiringSoon: all
      .filter((a) => a.warranty_end && a.warranty_end <= in30days && a.warranty_end >= todayStr)
      .slice(0, 5) as Asset[],
    assetsWithoutResponsible: all.filter((a) => !a.responsible_id).slice(0, 5) as Asset[],
    byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
    byType: Object.entries(byType).map(([type, count]) => ({ type, count })),
    recentActivity: histRes.data ?? [],
    maintenanceCostMonths,
    valueEvolution,
    insuranceExpiringSoon: (policiesRes.data ?? []) as InsurancePolicy[],
    maintenanceOverdue: (plansRes.data ?? []) as MaintenancePlan[],
  };
}

// ── Reports ───────────────────────────────────────────────────────────────────
export type ReportType =
  | 'inventario_patrimonial'
  | 'depreciacao'
  | 'custo_manutencao'
  | 'extrato_ativo'
  | 'por_responsavel'
  | 'por_departamento';

export interface ReportFilters {
  type: ReportType;
  dateFrom?: string;
  dateTo?: string;
  assetId?: string;
  status?: AssetStatus | '';
  category_id?: string;
}

export interface ReportRow {
  [key: string]: string | number | null;
}

async function buildReportRows(filters: ReportFilters): Promise<{ headers: string[]; rows: ReportRow[] }> {
  const tenantIds = getTenantIds();

  switch (filters.type) {
    case 'inventario_patrimonial': {
      let q = supabase
        .from('assets')
        .select('tag,name,asset_type,status,acquisition_date,acquisition_value,current_book_value,responsible_name,department_name,location_room,brand,model,serial_number')
        .in('tenant_id', tenantIds)
        .order('tag');
      if (filters.status) q = q.eq('status', filters.status);
      if (filters.category_id) q = q.eq('category_id', filters.category_id);
      if (filters.dateFrom) q = q.gte('acquisition_date', filters.dateFrom);
      if (filters.dateTo) q = q.lte('acquisition_date', filters.dateTo);
      const { data } = await q;
      return {
        headers: ['Tag','Nome','Tipo','Status','Dt Aquisição','Valor Original','Valor Contábil','Responsável','Departamento','Local','Marca','Modelo','Nº Série'],
        rows: (data ?? []).map((a) => ({
          tag: a.tag, nome: a.name, tipo: a.asset_type, status: a.status,
          aquisicao: a.acquisition_date, valor_original: a.acquisition_value,
          valor_contabil: a.current_book_value, responsavel: a.responsible_name,
          departamento: a.department_name, local: a.location_room,
          marca: a.brand, modelo: a.model, serie: a.serial_number,
        })),
      };
    }

    case 'depreciacao': {
      let q = supabase
        .from('asset_depreciation_snapshots')
        .select('asset_id,reference_month,reference_year,monthly_quota,accumulated_depreciation,net_book_value,assets!inner(tag,name,depreciation_method)')
        .in('tenant_id', tenantIds)
        .order('reference_year').order('reference_month');
      if (filters.dateFrom) {
        const [y, m] = filters.dateFrom.split('-');
        q = q.gte('reference_year', parseInt(y)).gte('reference_month', parseInt(m));
      }
      if (filters.dateTo) {
        const [y, m] = filters.dateTo.split('-');
        q = q.lte('reference_year', parseInt(y)).lte('reference_month', parseInt(m));
      }
      const { data } = await q;
      return {
        headers: ['Tag','Nome','Método','Mês','Ano','Quota Mensal','Depreciação Acum.','Valor Contábil'],
        rows: (data ?? []).map((s: Record<string, unknown>) => {
          const a = s['assets'] as Record<string, unknown> ?? {};
          return {
            tag: a['tag'] as string | null, nome: a['name'] as string | null, metodo: a['depreciation_method'] as string | null,
            mes: s['reference_month'] as number | null, ano: s['reference_year'] as number | null,
            quota: s['monthly_quota'] as number | null, acumulada: s['accumulated_depreciation'] as number | null,
            valor_contabil: s['net_book_value'] as number | null,
          };
        }),
      };
    }

    case 'custo_manutencao': {
      let q = supabase
        .from('asset_work_orders')
        .select('assets!inner(tag,name),type,status,technician_name,opened_at,concluded_at,parts_cost,labor_cost,total_cost')
        .in('tenant_id', tenantIds)
        .eq('status', 'concluida')
        .order('concluded_at', { ascending: false });
      if (filters.dateFrom) q = q.gte('concluded_at', filters.dateFrom);
      if (filters.dateTo) q = q.lte('concluded_at', filters.dateTo);
      const { data } = await q;
      return {
        headers: ['Tag','Ativo','Tipo','Técnico','Aberta em','Concluída em','Custo Peças','Custo Mão de Obra','Custo Total'],
        rows: (data ?? []).map((o: Record<string, unknown>) => {
          const a = o['assets'] as Record<string, unknown> ?? {};
          return {
            tag: a['tag'] as string | null, ativo: a['name'] as string | null, tipo: o['type'] as string | null, tecnico: o['technician_name'] as string | null,
            aberta: o['opened_at'] as string | null, concluida: o['concluded_at'] as string | null,
            pecas: o['parts_cost'] as number | null, mao_obra: o['labor_cost'] as number | null, total: o['total_cost'] as number | null,
          };
        }),
      };
    }

    case 'extrato_ativo': {
      const { data } = await supabase
        .from('asset_history')
        .select('assets!inner(tag,name),event_type,from_status,to_status,justification,created_at')
        .in('tenant_id', tenantIds)
        .eq(filters.assetId ? 'asset_id' : 'tenant_id', filters.assetId ?? tenantIds[0])
        .order('created_at');
      return {
        headers: ['Tag','Ativo','Evento','Status Anterior','Novo Status','Justificativa','Data'],
        rows: (data ?? []).map((h: Record<string, unknown>) => {
          const a = h['assets'] as Record<string, unknown> ?? {};
          return {
            tag: a['tag'] as string | null, ativo: a['name'] as string | null, evento: h['event_type'] as string | null,
            status_de: h['from_status'] as string | null, status_para: h['to_status'] as string | null,
            justificativa: h['justification'] as string | null, data: h['created_at'] as string | null,
          };
        }),
      };
    }

    case 'por_responsavel': {
      const { data } = await supabase
        .from('assets')
        .select('responsible_name,tag,name,asset_type,status,acquisition_value,current_book_value')
        .in('tenant_id', tenantIds)
        .not('responsible_name', 'is', null)
        .order('responsible_name').order('tag');
      return {
        headers: ['Responsável','Tag','Ativo','Tipo','Status','Valor Original','Valor Contábil'],
        rows: (data ?? []).map((a) => ({
          responsavel: a.responsible_name, tag: a.tag, ativo: a.name,
          tipo: a.asset_type, status: a.status,
          valor_original: a.acquisition_value, valor_contabil: a.current_book_value,
        })),
      };
    }

    case 'por_departamento': {
      const { data } = await supabase
        .from('assets')
        .select('department_name,tag,name,asset_type,status,acquisition_value,current_book_value')
        .in('tenant_id', tenantIds)
        .not('department_name', 'is', null)
        .order('department_name').order('tag');
      return {
        headers: ['Departamento','Tag','Ativo','Tipo','Status','Valor Original','Valor Contábil'],
        rows: (data ?? []).map((a) => ({
          departamento: a.department_name, tag: a.tag, ativo: a.name,
          tipo: a.asset_type, status: a.status,
          valor_original: a.acquisition_value, valor_contabil: a.current_book_value,
        })),
      };
    }

    default:
      return { headers: [], rows: [] };
  }
}

export async function generateReport(filters: ReportFilters): Promise<{ headers: string[]; rows: ReportRow[] }> {
  return buildReportRows(filters);
}

/** Exporta CSV com BOM UTF-8 e delimitador ponto-e-vírgula */
export function downloadReportCsv(headers: string[], rows: ReportRow[], filename = 'relatorio.csv'): void {
  const cols = Object.keys(rows[0] ?? {});
  const lines = [
    headers.join(';'),
    ...rows.map((r) =>
      cols.map((c) => {
        const v = r[c] ?? '';
        return typeof v === 'string' && v.includes(';') ? `"${v}"` : String(v);
      }).join(';')
    ),
  ];
  const bom = '\uFEFF';
  const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── EAM Alerts ────────────────────────────────────────────────────────────────

export interface EamAlert {
  id: string;
  tenant_id: string;
  type: string;
  title: string;
  description: string | null;
  severity: 'info' | 'warning' | 'critical';
  asset_id: string | null;
  asset_name: string | null;
  asset_tag: string | null;
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

export async function getEamAlerts(resolved = false): Promise<EamAlert[]> {
  const tenantIds = getTenantIds();
  const { data, error } = await supabase
    .from('eam_asset_alerts')
    .select('*')
    .in('tenant_id', tenantIds)
    .eq('resolved', resolved)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as EamAlert[];
}

export async function resolveEamAlert(id: string): Promise<void> {
  const { error } = await supabase
    .from('eam_asset_alerts')
    .update({ resolved: true, resolved_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ── Integration helpers (resilient — never throw) ────────────────────────────

export interface EmployeeOption { id: string; name: string; department_name: string | null; }
export interface DepartmentOption { id: string; name: string; }
export interface SupplierOption { id: string; name: string; }

export async function tryGetEmployees(): Promise<EmployeeOption[]> {
  try {
    const { getEmployees } = await import('./hr');
    const employees = await getEmployees();
    return employees.map((e) => ({
      id: e.id,
      name: e.full_name,
      department_name: (e.departments as { name: string } | null)?.name ?? null,
    }));
  } catch {
    return [];
  }
}

export async function tryGetDepartments(): Promise<DepartmentOption[]> {
  try {
    const { getDepartments } = await import('./hr');
    const depts = await getDepartments();
    return depts.map((d) => ({ id: d.id, name: d.name }));
  } catch {
    return [];
  }
}

export async function tryGetSuppliers(): Promise<SupplierOption[]> {
  try {
    const { getFornecedores } = await import('./erp');
    const suppliers = await getFornecedores();
    return suppliers.map((f) => ({ id: f.id, name: f.nome }));
  } catch {
    return [];
  }
}

export async function tryCreateFinancialEntry(
  tenantId: string,
  tipo: 'RECEITA' | 'DESPESA',
  categoria: string,
  descricao: string,
  valor: number,
  dataVencimento: string,
): Promise<void> {
  try {
    const { createLancamento } = await import('./erp');
    await createLancamento({
      tipo,
      categoria,
      descricao,
      valor,
      data_vencimento: dataVencimento,
      data_pagamento: null,
      status: 'PENDENTE',
      nfe_id: null,
      pedido_id: null,
      conta_bancaria_id: null,
    } as Parameters<typeof createLancamento>[0]);
    void tenantId;
  } catch {
    // fail silently — financial module may not be active
  }
}

