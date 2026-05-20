// ─────────────────────────────────────────────────────────────────────────────
// GED Service Layer — Gestão Eletrônica de Documentos
// Todas as operações lêem/escrevem direto no Supabase — zero mock.
// RLS garante isolamento por tenant via JWT app_metadata.scope_ids.
// Storage: bucket 'ged-documents' (privado) — criar via Supabase Dashboard.
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from './supabase';
import { getTenantId, getTenantIds } from './auth';

// ── Types ─────────────────────────────────────────────────────────────────────

export type DocType = 'procedure' | 'instruction' | 'policy' | 'form' | 'manual' | 'record';
export type DocStatus = 'draft' | 'in_review' | 'approved' | 'obsolete';
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
  // join
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
  // join
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

// ── Documents ────────────────────────────────────────────────────────────────

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
  const { data, error } = await supabase
    .from('ged_documents')
    .select('*, ged_categories(name)')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();
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
    .insert({ ...input, tenant_id, version: input.version ?? '1.0', status: input.status ?? 'draft' })
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
  const { data, error } = await supabase
    .from('ged_documents')
    .update(input)
    .eq('id', id)
    .select('*, ged_categories(name)')
    .single();
  if (error) throw error;
  return data as GedDocument;
}

export async function softDeleteDocument(id: string): Promise<void> {
  const { error } = await supabase
    .from('ged_documents')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// ── Categories ────────────────────────────────────────────────────────────────

export async function getCategories(): Promise<GedCategory[]> {
  const tenantIds = getTenantIds();
  let query = supabase
    .from('ged_categories')
    .select('*')
    .order('name');
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
  const { data, error } = await supabase
    .from('ged_categories')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as GedCategory;
}

// ── Approvals ─────────────────────────────────────────────────────────────────

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
}): Promise<GedApproval> {
  const tenant_id = getTenantId();
  // Muda status do documento para 'in_review'
  await supabase.from('ged_documents').update({ status: 'in_review' }).eq('id', input.document_id);
  const { data, error } = await supabase
    .from('ged_document_approvals')
    .insert({ ...input, tenant_id, status: 'pending' })
    .select('*, ged_documents(code, title)')
    .single();
  if (error) throw error;
  return data as GedApproval;
}

export async function decideApproval(
  id: string,
  decision: 'approved' | 'rejected',
  comments?: string,
): Promise<GedApproval> {
  const { data: approval, error: fetchErr } = await supabase
    .from('ged_document_approvals')
    .select('document_id')
    .eq('id', id)
    .single();
  if (fetchErr) throw fetchErr;

  const { data, error } = await supabase
    .from('ged_document_approvals')
    .update({ status: decision, comments: comments ?? null, decided_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, ged_documents(code, title)')
    .single();
  if (error) throw error;

  // Atualiza status do documento conforme decisão
  const newDocStatus: DocStatus = decision === 'approved' ? 'approved' : 'draft';
  await supabase.from('ged_documents').update({ status: newDocStatus }).eq('id', approval.document_id);

  return data as GedApproval;
}

// ── Versions ──────────────────────────────────────────────────────────────────

export async function getDocumentVersions(document_id: string): Promise<GedVersion[]> {
  const { data, error } = await supabase
    .from('ged_document_versions')
    .select('*')
    .eq('document_id', document_id)
    .order('created_at', { ascending: false });
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

// ── KPIs / Dashboard ─────────────────────────────────────────────────────────

export async function getDocumentKPIs(): Promise<GedKPIs> {
  const tenantIds = getTenantIds();
  const today = new Date().toISOString().split('T')[0];
  const in30d = new Date(Date.now() + 30 * 86400_000).toISOString().split('T')[0];

  const filter = (q: ReturnType<typeof supabase.from>) =>
    tenantIds.length > 0 ? q.in('tenant_id', tenantIds) : q;

  const [activeRes, pendingRes, expiringRes, formsRes, statusRes, typeRes] = await Promise.all([
    filter(supabase.from('ged_documents').select('id', { count: 'exact', head: true })
      .eq('status', 'approved').is('deleted_at', null)),
    filter(supabase.from('ged_document_approvals').select('id', { count: 'exact', head: true })
      .eq('status', 'pending')),
    filter(supabase.from('ged_documents').select('id', { count: 'exact', head: true })
      .is('deleted_at', null).gte('expires_at', today).lte('expires_at', in30d)),
    filter(supabase.from('ged_documents').select('id', { count: 'exact', head: true })
      .eq('doc_type', 'form').eq('status', 'approved').is('deleted_at', null)),
    filter(supabase.from('ged_documents').select('status').is('deleted_at', null)),
    filter(supabase.from('ged_documents').select('doc_type').is('deleted_at', null)),
  ]);

  // Agrega status e tipo no cliente (tabelas ainda sem dados massivos)
  const statusMap = new Map<string, number>();
  (statusRes.data ?? []).forEach(r => statusMap.set(r.status, (statusMap.get(r.status) ?? 0) + 1));
  const by_status = Array.from(statusMap.entries()).map(([status, count]) => ({
    status: status as DocStatus, count,
  }));

  const typeMap = new Map<string, number>();
  (typeRes.data ?? []).forEach(r => typeMap.set(r.doc_type, (typeMap.get(r.doc_type) ?? 0) + 1));
  const by_type = Array.from(typeMap.entries()).map(([doc_type, count]) => ({
    doc_type: doc_type as DocType, count,
  }));

  return {
    total_active:      activeRes.count ?? 0,
    pending_approvals: pendingRes.count ?? 0,
    expiring_30d:      expiringRes.count ?? 0,
    total_forms:       formsRes.count ?? 0,
    by_status,
    by_type,
  };
}

// ── Storage (bucket: 'ged-documents') ────────────────────────────────────────
// O bucket deve ser criado via Supabase Dashboard como privado antes do uso.
// Política de storage: { allow: select, for: authenticated, to: own tenant prefix }

const BUCKET = 'ged-documents';

export async function uploadDocumentFile(
  file: File,
  documentId: string,
  version: string,
): Promise<{ path: string; name: string; size: number; mime: string }> {
  const tenant_id = getTenantId();
  const ext = file.name.split('.').pop() ?? 'bin';
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
