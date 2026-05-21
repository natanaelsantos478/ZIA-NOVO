// ─────────────────────────────────────────────────────────────────────────────
// GED Service Layer — Gestão Eletrônica de Documentos
// Zero mock. Todas as operações vão ao Supabase.
// RLS garante isolamento por tenant via JWT app_metadata.scope_ids.
// Operações transacionais (approve/request) usam RPC para atomicidade.
// Storage: bucket 'ged-documents' (privado) — criar via Supabase Dashboard.
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from './supabase';
import { getTenantId, getTenantIds } from './auth';

// ── Types ─────────────────────────────────────────────────────────────────────

export type DocType     = 'procedure' | 'instruction' | 'policy' | 'form' | 'manual' | 'record';
export type DocStatus   = 'draft' | 'in_review' | 'approved' | 'obsolete';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  procedure:   'Procedimento',
  instruction: 'Instrução',
  policy:      'Política',
  form:        'Formulário',
  manual:      'Manual',
  record:      'Registro',
};

export const DOC_STATUS_LABELS: Record<DocStatus, string> = {
  draft:     'Rascunho',
  in_review: 'Em Revisão',
  approved:  'Aprovado',
  obsolete:  'Obsoleto',
};

export const APPROVAL_STATUS_LABELS: Record<ApprovalStatus, string> = {
  pending:  'Pendente',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
};

export interface GedCategory {
  id: string;
  tenant_id: string;
  name: string;
  code: string;
  description: string | null;
  responsible_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface GedDocument {
  id: string;
  tenant_id: string;
  code: string;
  title: string;
  doc_type: DocType;
  category_id: string | null;
  version: string;
  status: DocStatus;
  owner_name: string | null;
  owner_profile_id: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  expires_at: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  created_by: string | null;
  ged_categories?: { name: string } | null;
}

export interface GedVersion {
  id: string;
  tenant_id: string;
  document_id: string;
  version: string;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  change_reason: string | null;
  author_name: string | null;
  author_profile_id: string | null;
  created_at: string;
}

export interface GedApproval {
  id: string;
  tenant_id: string;
  document_id: string;
  status: ApprovalStatus;
  requested_by_name: string;
  requested_by_profile: string | null;
  approver_name: string | null;
  approver_profile: string | null;
  comments: string | null;
  requested_at: string;
  decided_at: string | null;
  ged_documents?: { code: string; title: string } | null;
}

export interface GedKPIs {
  total_active: number;
  pending_approvals: number;
  expiring_30d: number;
  total_forms: number;
  by_status: { status: DocStatus; count: number }[];
  by_type: { doc_type: DocType; count: number }[];
}

export interface GetDocumentsOptions {
  search?: string;
  status?: DocStatus | '';
  doc_type?: DocType | '';
  category_id?: string;
  page?: number;
  pageSize?: number;
}

// ── Documents ─────────────────────────────────────────────────────────────────

export async function getDocuments(opts: GetDocumentsOptions = {}): Promise<{
  data: GedDocument[];
  count: number;
}> {
  const tenantIds = getTenantIds();
  const { search = '', status = '', doc_type = '', category_id = '', page = 0, pageSize = 20 } = opts;

  let query = supabase
    .from('ged_documents')
    .select('*, ged_categories(name)', { count: 'exact' })
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (tenantIds.length > 0) query = query.in('tenant_id', tenantIds);
  if (status)      query = query.eq('status', status);
  if (doc_type)    query = query.eq('doc_type', doc_type);
  if (category_id) query = query.eq('category_id', category_id);
  if (search.trim()) {
    query = query.textSearch('search_tsv', search.trim(), { type: 'websearch', config: 'portuguese' });
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data ?? []) as GedDocument[], count: count ?? 0 };
}

export async function getDocument(id: string): Promise<GedDocument | null> {
  const tenantIds = getTenantIds();
  let q = supabase
    .from('ged_documents')
    .select('*, ged_categories(name)')
    .eq('id', id)
    .is('deleted_at', null);
  if (tenantIds.length > 0) q = q.in('tenant_id', tenantIds);
  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  return data as GedDocument | null;
}

export interface CreateDocumentInput {
  code: string;
  title: string;
  doc_type: DocType;
  category_id?: string;
  version?: string;
  status?: DocStatus;
  owner_name?: string;
  owner_profile_id?: string;
  expires_at?: string;
  tags?: string[];
}

export async function createDocument(input: CreateDocumentInput): Promise<GedDocument> {
  const tenant_id = getTenantId();
  const { data, error } = await supabase
    .from('ged_documents')
    .insert({
      ...input,
      tenant_id,
      version: input.version ?? '1.0',
      status:  input.status  ?? 'draft',
    })
    .select('*, ged_categories(name)')
    .single();
  if (error) throw error;
  return data as GedDocument;
}

export interface UpdateDocumentInput extends Partial<CreateDocumentInput> {
  file_path?: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
}

export async function updateDocument(id: string, input: UpdateDocumentInput): Promise<GedDocument> {
  // Defense in depth: restringe ao tenant ativo além do RLS
  const tenantId = getTenantId();
  let q = supabase.from('ged_documents').update(input).eq('id', id);
  if (tenantId) q = q.eq('tenant_id', tenantId);
  const { data, error } = await q.select('*, ged_categories(name)').single();
  if (error) throw error;
  return data as GedDocument;
}

export async function softDeleteDocument(id: string): Promise<void> {
  // Defense in depth: restringe ao tenant ativo além do RLS
  const tenantId = getTenantId();
  let q = supabase
    .from('ged_documents')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (tenantId) q = q.eq('tenant_id', tenantId);
  const { error } = await q;
  if (error) throw error;
}

// ── Categories ────────────────────────────────────────────────────────────────

export async function getCategories(): Promise<GedCategory[]> {
  const tenantIds = getTenantIds();
  let query = supabase.from('ged_categories').select('*').order('name');
  if (tenantIds.length > 0) query = query.in('tenant_id', tenantIds);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as GedCategory[];
}

export async function createCategory(input: {
  name: string;
  code: string;
  description?: string;
  responsible_name?: string;
}): Promise<GedCategory> {
  const tenant_id = getTenantId();
  const { data, error } = await supabase
    .from('ged_categories')
    .insert({ ...input, tenant_id })
    .select()
    .single();
  if (error) throw error;
  return data as GedCategory;
}

export async function updateCategory(id: string, input: Partial<{
  name: string;
  code: string;
  description: string;
  responsible_name: string;
}>): Promise<GedCategory> {
  const tenantId = getTenantId();
  let q = supabase.from('ged_categories').update(input).eq('id', id);
  if (tenantId) q = q.eq('tenant_id', tenantId);
  const { data, error } = await q.select().single();
  if (error) throw error;
  return data as GedCategory;
}

// ── Approvals (operações atômicas via RPC) ────────────────────────────────────

export async function getApprovals(opts: { status?: ApprovalStatus | '' } = {}): Promise<GedApproval[]> {
  const tenantIds = getTenantIds();
  let query = supabase
    .from('ged_document_approvals')
    .select('*, ged_documents(code, title)')
    .order('requested_at', { ascending: false });
  if (tenantIds.length > 0) query = query.in('tenant_id', tenantIds);
  if (opts.status) query = query.eq('status', opts.status);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as GedApproval[];
}

export async function requestApproval(input: {
  document_id: string;
  requested_by_name: string;
  requested_by_profile?: string;
  approver_name?: string;
  approver_profile?: string;
}): Promise<string> {
  // RPC garante atomicidade: status do doc muda para 'in_review' + cria approval
  const { data, error } = await supabase.rpc('ged_request_approval', {
    p_document_id:           input.document_id,
    p_requested_by_name:     input.requested_by_name,
    p_requested_by_profile:  input.requested_by_profile  ?? null,
    p_approver_name:         input.approver_name          ?? null,
    p_approver_profile:      input.approver_profile       ?? null,
  });
  if (error) throw error;
  return data as string;
}

export async function decideApproval(
  id: string,
  decision: 'approved' | 'rejected',
  comments?: string,
): Promise<void> {
  // RPC garante atomicidade: approval + status do documento atualizados no mesmo bloco
  const { error } = await supabase.rpc('ged_decide_approval', {
    p_approval_id: id,
    p_decision:    decision,
    p_comments:    comments ?? null,
  });
  if (error) throw error;
}

// ── Versions ──────────────────────────────────────────────────────────────────

export async function getDocumentVersions(document_id: string): Promise<GedVersion[]> {
  const tenantIds = getTenantIds();
  let q = supabase
    .from('ged_document_versions')
    .select('*')
    .eq('document_id', document_id)
    .order('created_at', { ascending: false });
  if (tenantIds.length > 0) q = q.in('tenant_id', tenantIds);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as GedVersion[];
}

export async function createVersion(input: {
  document_id: string;
  version: string;
  change_reason: string;
  author_name: string;
  author_profile_id?: string;
  file_path?: string;
  file_name?: string;
  file_size?: number;
}): Promise<GedVersion> {
  const tenant_id = getTenantId();
  const { data, error } = await supabase
    .from('ged_document_versions')
    .insert({ ...input, tenant_id })
    .select()
    .single();
  if (error) throw error;
  return data as GedVersion;
}

// ── KPIs — server-side via RPC (GROUP BY no Postgres, sem baixar linhas) ─────

export async function getDocumentKPIs(): Promise<GedKPIs> {
  const { data, error } = await supabase.rpc('ged_document_kpis');
  if (error) throw error;
  const d = data as {
    total_active:      number;
    pending_approvals: number;
    expiring_30d:      number;
    total_forms:       number;
    by_status: { status: DocStatus; count: number }[];
    by_type:   { doc_type: DocType; count: number }[];
  };
  return {
    total_active:      d.total_active      ?? 0,
    pending_approvals: d.pending_approvals  ?? 0,
    expiring_30d:      d.expiring_30d       ?? 0,
    total_forms:       d.total_forms        ?? 0,
    by_status:         d.by_status          ?? [],
    by_type:           d.by_type            ?? [],
  };
}

// ── Storage (bucket: 'ged-documents', privado) ────────────────────────────────
// Criar via Supabase Dashboard → Storage → New bucket (privado).
// Adicionar policies: authenticated pode ler/escrever em {tenant_id}/*.

const BUCKET        = 'ged-documents';
const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB
const ALLOWED_MIME  = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
]);

export async function uploadDocumentFile(
  file: File,
  documentId: string,
  version: string,
): Promise<{ path: string; name: string; size: number; mime: string }> {
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error(`Tipo de arquivo não permitido: ${file.type}`);
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`Arquivo muito grande: ${(file.size / 1024 / 1024).toFixed(1)} MB. Máximo permitido: 50 MB.`);
  }
  const tenant_id = getTenantId();
  const ext  = file.name.split('.').pop()?.replace(/[^a-z0-9]/gi, '') ?? 'bin';
  const path = `${tenant_id}/${documentId}/v${version}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  return { path, name: file.name, size: file.size, mime: file.type };
}

export async function getDocumentSignedUrl(filePath: string, expiresIn = 300): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(filePath, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteDocumentFile(filePath: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([filePath]);
  if (error) throw error;
}
