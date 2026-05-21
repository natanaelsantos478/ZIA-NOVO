import { useState, useEffect, useCallback, useRef } from 'react';
import ActivitiesPanel from '../../components/shared/ActivitiesPanel';
import {
  FileText, FolderOpen, CheckSquare, Clock, AlertCircle,
  Search, Filter, Plus, Grid, List,
  FileCheck, FileX, Download, X, Upload, Loader2,
  ChevronLeft, ChevronRight, GitBranch, CheckCircle, AlertTriangle,
} from 'lucide-react';
import {
  getDocuments, getDocumentKPIs, getCategories, getApprovals,
  createDocument, createCategory, createVersion, decideApproval, requestApproval,
  getDocumentVersions, getDocumentSignedUrl, uploadDocumentFile, updateDocument, softDeleteDocument,
  DOC_TYPE_LABELS, DOC_STATUS_LABELS, APPROVAL_STATUS_LABELS,
  type GedDocument, type GedCategory, type GedApproval, type GedKPIs, type GedVersion,
  type DocType, type DocStatus, type CreateDocumentInput,
} from '../../lib/docs';

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<DocStatus, string> = {
  approved:  'bg-emerald-100 text-emerald-700',
  draft:     'bg-slate-100 text-slate-600',
  obsolete:  'bg-red-100 text-red-700',
  in_review: 'bg-amber-100 text-amber-700',
};

function formatBytes(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR');
}

// ── Toast ─────────────────────────────────────────────────────────────────────

interface ToastState { type: 'error' | 'success'; msg: string }

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  return (
    <div className={`fixed top-4 right-4 z-[200] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium max-w-sm
      ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
      {toast.type === 'error'
        ? <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        : <CheckCircle className="w-4 h-4 flex-shrink-0" />}
      <span>{toast.msg}</span>
      <button onClick={onClose} className="ml-auto opacity-75 hover:opacity-100"><X className="w-4 h-4" /></button>
    </div>
  );
}

// ── Modal Novo Documento ──────────────────────────────────────────────────────

interface NewDocModalProps {
  categories: GedCategory[];
  onClose: () => void;
  onSaved: (doc: GedDocument) => void;
}

function NewDocModal({ categories, onClose, onSaved }: NewDocModalProps) {
  const [form, setForm] = useState<CreateDocumentInput>({
    code: '', title: '', doc_type: 'procedure', category_id: '', version: '1.0',
    status: 'draft', owner_name: '', tags: [],
  });
  const [file, setFile]       = useState<File | null>(null);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof CreateDocumentInput, v: unknown) =>
    setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim() || !form.title.trim()) {
      setError('Código e título são obrigatórios.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
      const doc  = await createDocument({ ...form, tags, category_id: form.category_id || undefined });

      if (file) {
        try {
          const uploaded = await uploadDocumentFile(file, doc.id, doc.version);
          await updateDocument(doc.id, {
            file_path: uploaded.path,
            file_name: uploaded.name,
            file_size: uploaded.size,
            mime_type: uploaded.mime,
          });
          await createVersion({
            document_id:      doc.id,
            version:          doc.version,
            change_reason:    'Versão inicial',
            author_name:      doc.owner_name ?? 'Sistema',
            file_path:        uploaded.path,
            file_name:        uploaded.name,
            file_size:        uploaded.size,
          });
        } catch (upErr: unknown) {
          // Upload falhou — desfaz o documento para não deixar registro órfão
          await softDeleteDocument(doc.id).catch(() => null);
          throw upErr;
        }
      }

      onSaved(doc);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar documento.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800">Novo Documento</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Código *</label>
              <input
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                placeholder="POP-PROD-001"
                value={form.code}
                onChange={e => set('code', e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Versão</label>
              <input
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="1.0"
                value={form.version}
                onChange={e => set('version', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Título *</label>
            <input
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="Título do documento"
              value={form.title}
              onChange={e => set('title', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Tipo</label>
              <select
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                value={form.doc_type}
                onChange={e => set('doc_type', e.target.value as DocType)}
              >
                {(Object.entries(DOC_TYPE_LABELS) as [DocType, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Status</label>
              <select
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                value={form.status}
                onChange={e => set('status', e.target.value as DocStatus)}
              >
                {(Object.entries(DOC_STATUS_LABELS) as [DocStatus, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Categoria</label>
              <select
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                value={form.category_id ?? ''}
                onChange={e => set('category_id', e.target.value)}
              >
                <option value="">Sem categoria</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Vence em</label>
              <input
                type="date"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                value={form.expires_at ?? ''}
                onChange={e => set('expires_at', e.target.value || undefined)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Responsável</label>
            <input
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="Nome do responsável"
              value={form.owner_name ?? ''}
              onChange={e => set('owner_name', e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Tags (separadas por vírgula)</label>
            <input
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="segurança, produção, iso"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Arquivo (opcional)</label>
            <div
              className="border-2 border-dashed border-slate-200 rounded-lg p-4 text-center cursor-pointer hover:border-amber-400 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {file ? (
                <div className="flex items-center justify-center gap-2 text-sm text-slate-700">
                  <FileText className="w-4 h-4 text-amber-600" />
                  <span className="font-medium">{file.name}</span>
                  <span className="text-slate-400">({formatBytes(file.size)})</span>
                </div>
              ) : (
                <div className="text-slate-400">
                  <Upload className="w-6 h-6 mx-auto mb-1" />
                  <p className="text-xs">Clique para selecionar PDF, DOCX, XLS ou imagem</p>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </form>

        <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-200">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
            Cancelar
          </button>
          <button onClick={handleSubmit as unknown as React.MouseEventHandler} disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-60 flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Salvando...' : 'Criar Documento'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Nova Categoria ──────────────────────────────────────────────────────

interface NewCategoryModalProps {
  onClose: () => void;
  onSaved: (cat: GedCategory) => void;
}

function NewCategoryModal({ onClose, onSaved }: NewCategoryModalProps) {
  const [form, setForm] = useState({ name: '', code: '', description: '', responsible_name: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) { setError('Nome e código são obrigatórios.'); return; }
    setSaving(true);
    setError('');
    try {
      const cat = await createCategory({
        name: form.name, code: form.code,
        description: form.description || undefined,
        responsible_name: form.responsible_name || undefined,
      });
      onSaved(cat);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar categoria.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800">Nova Categoria</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nome *</label>
              <input
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Produção" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Código *</label>
              <input
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="PROD" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Descrição</label>
            <textarea
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none h-20"
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Responsável</label>
            <input
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              value={form.responsible_name} onChange={e => setForm(f => ({ ...f, responsible_name: e.target.value }))} />
          </div>
        </form>
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-200">
          <button type="button" onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
            Cancelar
          </button>
          <button onClick={handleSubmit as unknown as React.MouseEventHandler} disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-60 flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Criar Categoria
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal de Rejeição ─────────────────────────────────────────────────────────

interface RejectModalProps {
  approvalId: string;
  docTitle: string;
  onClose: () => void;
  onDone: () => void;
  onError: (msg: string) => void;
}

function RejectModal({ approvalId, docTitle, onClose, onDone, onError }: RejectModalProps) {
  const [comments, setComments] = useState('');
  const [saving, setSaving]     = useState(false);

  async function handleReject() {
    setSaving(true);
    try {
      await decideApproval(approvalId, 'rejected', comments);
      onDone();
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'Erro ao rejeitar aprovação.');
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-800">Rejeitar Documento</h2>
        <p className="text-sm text-slate-600"><span className="font-medium">{docTitle}</span></p>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">Motivo da rejeição</label>
          <textarea
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[80px] resize-none"
            placeholder="Descreva o que precisa ser corrigido..."
            value={comments}
            onChange={e => setComments(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
            Cancelar
          </button>
          <button onClick={handleReject} disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60 flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirmar Rejeição
          </button>
        </div>
      </div>
    </div>
  );
}

// ── DocsModule principal ───────────────────────────────────────────────────────

interface DocsModuleProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const TABS     = ['Dashboard', 'Documentos', 'Formulários', 'Versões', 'Aprovações', 'Categorias'];
const PAGE_SIZE = 20;

export default function DocsModule({ activeTab: controlledTab, onTabChange }: DocsModuleProps = {}) {
  const [internalTab, setInternalTab] = useState('Dashboard');
  const [viewMode, setViewMode]       = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm]   = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [filterStatus, setFilterStatus] = useState<DocStatus | ''>('');
  const [filterType, setFilterType]     = useState<DocType | ''>('');
  const [showFilters, setShowFilters]   = useState(false);
  const [page, setPage]                 = useState(0);

  // Modals
  const [showNewDoc, setShowNewDoc]           = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [rejectModal, setRejectModal]         = useState<{ id: string; title: string } | null>(null);

  // Toast
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function showToast(type: 'error' | 'success', msg: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ type, msg });
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  // Data
  const [docs, setDocs]             = useState<GedDocument[]>([]);
  const [docsCount, setDocsCount]   = useState(0);
  const [categories, setCategories] = useState<GedCategory[]>([]);
  const [approvals, setApprovals]   = useState<GedApproval[]>([]);
  const [kpis, setKpis]             = useState<GedKPIs | null>(null);
  const [kpisError, setKpisError]   = useState(false);

  // Versions tab state
  const [versionsDocId, setVersionsDocId]     = useState('');
  const [versions, setVersions]               = useState<GedVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  // Loading / error
  const [loadingDocs, setLoadingDocs]         = useState(false);
  const [loadingApprovals, setLoadingApprovals] = useState(false);
  const [loadingKpis, setLoadingKpis]         = useState(false);
  const [approvingId, setApprovingId]         = useState<string | null>(null);
  const [docError, setDocError]               = useState('');

  const activeTab = controlledTab ?? internalTab;
  const setActiveTab = (tab: string) => { setInternalTab(tab); onTabChange?.(tab); };

  // Debounce busca
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchTerm), 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Reset page ao mudar filtros
  useEffect(() => { setPage(0); }, [searchDebounced, filterStatus, filterType, activeTab]);

  // Categorias (uma vez)
  useEffect(() => {
    getCategories().then(setCategories).catch(err => showToast('error', err instanceof Error ? err.message : 'Erro ao carregar categorias.'));
  }, []);

  // Aba Versões: carrega versões quando documento é selecionado
  useEffect(() => {
    if (!versionsDocId) { setVersions([]); return; }
    let cancelled = false;
    setLoadingVersions(true);
    getDocumentVersions(versionsDocId)
      .then(data  => { if (!cancelled) setVersions(data); })
      .catch(err  => { if (!cancelled) showToast('error', err instanceof Error ? err.message : 'Erro ao carregar versões.'); })
      .finally(() => { if (!cancelled) setLoadingVersions(false); });
    return () => { cancelled = true; };
  }, [versionsDocId]);

  // Documentos — server-side: filtro de tipo também para Formulários
  const loadDocs = useCallback(async () => {
    const effectiveType: DocType | '' = activeTab === 'Formulários' ? 'form' : filterType;
    setLoadingDocs(true);
    setDocError('');
    try {
      const result = await getDocuments({
        search:      searchDebounced,
        status:      filterStatus,
        doc_type:    effectiveType,
        page,
        pageSize:    PAGE_SIZE,
      });
      setDocs(result.data);
      setDocsCount(result.count);
    } catch (err: unknown) {
      setDocError(err instanceof Error ? err.message : 'Erro ao carregar documentos.');
    } finally {
      setLoadingDocs(false);
    }
  }, [searchDebounced, filterStatus, filterType, page, activeTab]);

  useEffect(() => {
    if (activeTab === 'Documentos' || activeTab === 'Formulários' || activeTab === 'Versões') loadDocs();
  }, [activeTab, loadDocs]);

  // Aprovações
  useEffect(() => {
    if (activeTab !== 'Aprovações' && activeTab !== 'Dashboard') return;
    setLoadingApprovals(true);
    getApprovals()
      .then(setApprovals)
      .catch(err => showToast('error', err instanceof Error ? err.message : 'Erro ao carregar aprovações.'))
      .finally(() => setLoadingApprovals(false));
  }, [activeTab]);

  // KPIs
  useEffect(() => {
    if (activeTab !== 'Dashboard') return;
    let cancelled = false;
    setLoadingKpis(true);
    setKpisError(false);
    getDocumentKPIs()
      .then(data  => { if (!cancelled) setKpis(data); })
      .catch(()   => { if (!cancelled) setKpisError(true); })
      .finally(() => { if (!cancelled) setLoadingKpis(false); });
    return () => { cancelled = true; };
  }, [activeTab]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleApprove(id: string) {
    setApprovingId(id);
    try {
      await decideApproval(id, 'approved');
      // Atualiza estado local apenas após confirmação do banco
      setApprovals(prev => prev.map(a => a.id === id ? { ...a, status: 'approved' as const, decided_at: new Date().toISOString() } : a));
      showToast('success', 'Documento aprovado com sucesso.');
      loadDocs();
      getDocumentKPIs().then(setKpis).catch(() => null);
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Erro ao aprovar. Tente novamente.');
    } finally {
      setApprovingId(null);
    }
  }

  async function handleDownload(doc: GedDocument) {
    if (!doc.file_path) {
      showToast('error', 'Este documento não possui arquivo anexado.');
      return;
    }
    try {
      const url = await getDocumentSignedUrl(doc.file_path);
      window.open(url, '_blank');
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Erro ao gerar link de download. Verifique se o bucket "ged-documents" está configurado.');
    }
  }

  async function handleSendToReview(doc: GedDocument) {
    try {
      await requestApproval({
        document_id:           doc.id,
        requested_by_name:     doc.owner_name ?? 'Usuário',
        requested_by_profile:  doc.owner_profile_id ?? undefined,
      });
      setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, status: 'in_review' as const } : d));
      showToast('success', 'Documento enviado para aprovação.');
      getDocumentKPIs().then(setKpis).catch(() => null);
      getApprovals().then(setApprovals).catch(() => null);
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Erro ao enviar para aprovação.');
    }
  }

  // ── Dashboard ──────────────────────────────────────────────────────────────

  const renderDashboard = () => {
    const kpiCards = [
      { label: 'Documentos Aprovados', value: kpis?.total_active ?? 0,      icon: FileText,    color: 'text-blue-600',    bg: 'bg-blue-50'    },
      { label: 'Aprovações Pendentes', value: kpis?.pending_approvals ?? 0, icon: CheckSquare, color: 'text-amber-600',   bg: 'bg-amber-50'   },
      { label: 'Vencendo em 30d',      value: kpis?.expiring_30d ?? 0,      icon: Clock,       color: 'text-red-600',     bg: 'bg-red-50'     },
      { label: 'Documentos Vencidos',  value: kpis?.expired ?? 0,           icon: AlertCircle, color: 'text-rose-600',    bg: 'bg-rose-50'    },
      { label: 'Formulários Ativos',   value: kpis?.total_forms ?? 0,       icon: FolderOpen,  color: 'text-emerald-600', bg: 'bg-emerald-50' },
    ];
    const pendentes    = approvals.filter(a => a.status === 'pending');
    const totalDocs    = (kpis?.by_type ?? []).reduce((acc, t) => acc + t.count, 0) || 1;

    return (
      <div className="space-y-6">
        {kpisError && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 text-sm text-amber-700">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            Erro ao carregar KPIs. Verifique a conexão e recarregue a página.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((kpi, idx) => (
            <div key={idx} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <p className="text-sm font-medium text-slate-500">{kpi.label}</p>
              <div className="flex items-center justify-between mt-2">
                {loadingKpis
                  ? <div className="h-8 w-12 bg-slate-100 animate-pulse rounded" />
                  : <span className="text-3xl font-bold text-slate-800">{kpi.value}</span>}
                <div className={`p-2 rounded-lg ${kpi.bg}`}>
                  <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Distribuição por Tipo */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Distribuição por Tipo</h3>
            {loadingKpis ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-6 bg-slate-100 animate-pulse rounded" />)}</div>
            ) : kpisError || (kpis?.by_type.length === 0) ? (
              <p className="text-sm text-slate-400 text-center py-8">
                {kpisError ? 'Erro ao carregar dados.' : 'Nenhum documento cadastrado.'}
              </p>
            ) : (
              <div className="space-y-4">
                {kpis?.by_type.map(item => {
                  const pct = Math.round((item.count / totalDocs) * 100);
                  const colors: Record<string, string> = {
                    procedure: 'bg-blue-500', instruction: 'bg-indigo-500',
                    policy: 'bg-purple-500',  form: 'bg-emerald-500',
                    manual: 'bg-amber-500',   record: 'bg-slate-400',
                  };
                  return (
                    <div key={item.doc_type}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-slate-700">{DOC_TYPE_LABELS[item.doc_type]}</span>
                        <span className="text-slate-500">{item.count} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className={`h-2 rounded-full ${colors[item.doc_type] ?? 'bg-slate-400'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pendências */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Pendências ({pendentes.length})
            </h3>
            {loadingApprovals ? (
              <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-lg" />)}</div>
            ) : pendentes.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">Nenhuma aprovação pendente.</p>
            ) : (
              <div className="space-y-3 custom-scrollbar overflow-y-auto max-h-64">
                {pendentes.map(app => (
                  <div key={app.id} className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-amber-700 bg-amber-200 px-2 py-0.5 rounded-full">
                        {app.ged_documents?.code ?? '—'}
                      </span>
                      <span className="text-xs text-amber-600">{formatDate(app.requested_at)}</span>
                    </div>
                    <p className="text-sm font-bold text-slate-800 mb-1 truncate">{app.ged_documents?.title ?? '—'}</p>
                    <p className="text-xs text-slate-600 mb-3">Solicitante: {app.requested_by_name}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setRejectModal({ id: app.id, title: app.ged_documents?.title ?? '' })}
                        className="flex-1 py-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded hover:bg-slate-50"
                      >
                        Revisar
                      </button>
                      <button
                        onClick={() => handleApprove(app.id)}
                        disabled={approvingId === app.id}
                        className="flex-1 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-1"
                      >
                        {approvingId === app.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                        Aprovar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── Toolbar ────────────────────────────────────────────────────────────────

  const isFormsTab = activeTab === 'Formulários';

  const renderToolbar = () => (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por código, título ou tags..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
              <Grid className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
              <List className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium border rounded-lg transition-colors ${showFilters ? 'bg-amber-50 border-amber-300 text-amber-700' : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50'}`}
          >
            <Filter className="w-4 h-4" /> Filtros
          </button>
          <button
            onClick={() => setShowNewDoc(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700"
          >
            <Plus className="w-4 h-4" /> Novo Documento
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="flex gap-4 pt-2 border-t border-slate-100">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-slate-500 mb-1">Status</label>
            <select
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as DocStatus | '')}
            >
              <option value="">Todos</option>
              {(Object.entries(DOC_STATUS_LABELS) as [DocStatus, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          {/* Filtro de tipo oculto na aba Formulários (já filtrado server-side) */}
          {!isFormsTab && (
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-500 mb-1">Tipo</label>
              <select
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                value={filterType}
                onChange={e => setFilterType(e.target.value as DocType | '')}
              >
                <option value="">Todos</option>
                {(Object.entries(DOC_TYPE_LABELS) as [DocType, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={() => { setFilterStatus(''); setFilterType(''); setSearchTerm(''); }}
            className="self-end px-3 py-2 text-xs text-slate-500 hover:text-slate-700"
          >
            Limpar
          </button>
        </div>
      )}
    </div>
  );

  // ── Lista de documentos ────────────────────────────────────────────────────

  const renderDocuments = () => (
    <div className="space-y-4">
      {renderToolbar()}

      {loadingDocs && (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando...
        </div>
      )}

      {docError && !loadingDocs && (
        <div className="text-center py-10 text-sm text-red-600 bg-red-50 rounded-xl border border-red-200 p-4">{docError}</div>
      )}

      {!loadingDocs && !docError && docs.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">Nenhum documento encontrado.</p>
          <p className="text-sm mt-1">
            {isFormsTab ? 'Crie um documento do tipo "Formulário" para aparecer aqui.' : 'Crie o primeiro usando o botão "Novo Documento".'}
          </p>
        </div>
      )}

      {!loadingDocs && docs.length > 0 && (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {docs.map(doc => (
              <div key={doc.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group p-5 flex flex-col h-full">
                <div className="flex justify-between items-start mb-3">
                  <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">{doc.code}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_COLORS[doc.status]}`}>
                    {DOC_STATUS_LABELS[doc.status]}
                  </span>
                </div>
                <div className="flex-1 mb-4">
                  <h4 className="font-bold text-slate-800 leading-tight mb-2 group-hover:text-amber-600 transition-colors line-clamp-2">{doc.title}</h4>
                  <div className="flex flex-wrap gap-1 mb-2">
                    <span className="text-xs text-white bg-slate-400 px-1.5 py-0.5 rounded">{DOC_TYPE_LABELS[doc.doc_type]}</span>
                    {doc.ged_categories?.name && (
                      <span className="text-xs text-white bg-slate-400 px-1.5 py-0.5 rounded">{doc.ged_categories.name}</span>
                    )}
                  </div>
                  {doc.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {doc.tags.slice(0, 3).map(tag => (
                        <span key={tag} className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">#{tag}</span>
                      ))}
                      {doc.tags.length > 3 && (
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">+{doc.tags.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between items-center">
                  <span>v{doc.version}</span>
                  <span>{formatDate(doc.updated_at)}</span>
                </div>
                <div className="mt-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {doc.status === 'draft' && (
                    <button
                      onClick={() => handleSendToReview(doc)}
                      className="flex-1 py-1.5 bg-amber-50 text-amber-700 text-xs font-bold rounded hover:bg-amber-100 flex items-center justify-center gap-1"
                    >
                      <CheckSquare className="w-3 h-3" /> Enviar
                    </button>
                  )}
                  {doc.file_path && (
                    <button
                      onClick={() => handleDownload(doc)}
                      className="flex-1 py-1.5 bg-slate-50 text-slate-600 text-xs font-bold rounded hover:bg-slate-100 flex items-center justify-center gap-1"
                    >
                      <Download className="w-3 h-3" /> Baixar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="px-6 py-3">Código</th>
                  <th className="px-6 py-3">Título</th>
                  <th className="px-6 py-3">Tipo</th>
                  <th className="px-6 py-3">Versão</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Atualizado</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {docs.map(doc => (
                  <tr key={doc.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-mono text-slate-500">{doc.code}</td>
                    <td className="px-6 py-3 font-medium text-slate-800 max-w-xs truncate">{doc.title}</td>
                    <td className="px-6 py-3"><span className="bg-slate-100 px-2 py-1 rounded text-xs">{DOC_TYPE_LABELS[doc.doc_type]}</span></td>
                    <td className="px-6 py-3 text-slate-600">v{doc.version}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[doc.status]}`}>
                        {DOC_STATUS_LABELS[doc.status]}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-500">{formatDate(doc.updated_at)}</td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {doc.file_path && (
                          <button
                            onClick={() => handleDownload(doc)}
                            className="p-1 text-slate-400 hover:text-amber-600"
                            title="Baixar arquivo"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        {doc.status === 'draft' && (
                          <button
                            onClick={() => handleSendToReview(doc)}
                            className="p-1 text-slate-400 hover:text-amber-600"
                            title="Enviar para aprovação"
                          >
                            <CheckSquare className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Paginação */}
      {docsCount > PAGE_SIZE && (
        <div className="flex items-center justify-between px-2">
          <span className="text-sm text-slate-500">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, docsCount)} de {docsCount}
          </span>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * PAGE_SIZE >= docsCount}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // ── Aprovações ─────────────────────────────────────────────────────────────

  const renderApprovals = () => (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200">
        <h3 className="font-bold text-slate-800">Fila de Aprovações</h3>
      </div>
      {loadingApprovals ? (
        <div className="flex items-center justify-center py-10 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
        </div>
      ) : approvals.length === 0 ? (
        <div className="text-center py-10 text-slate-400 text-sm">Nenhuma aprovação registrada.</div>
      ) : (
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-medium">
            <tr>
              <th className="px-6 py-3">Documento</th>
              <th className="px-6 py-3">Solicitante</th>
              <th className="px-6 py-3">Data</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {approvals.map(app => (
              <tr key={app.id} className="hover:bg-slate-50">
                <td className="px-6 py-3">
                  <div className="font-medium text-slate-800">{app.ged_documents?.title ?? '—'}</div>
                  <div className="text-xs text-slate-500 font-mono">{app.ged_documents?.code ?? '—'}</div>
                </td>
                <td className="px-6 py-3 text-slate-600">{app.requested_by_name}</td>
                <td className="px-6 py-3 text-slate-600">{formatDate(app.requested_at)}</td>
                <td className="px-6 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    app.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                    app.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {APPROVAL_STATUS_LABELS[app.status]}
                  </span>
                </td>
                <td className="px-6 py-3">
                  {app.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(app.id)}
                        disabled={approvingId === app.id}
                        className="p-1.5 rounded bg-emerald-100 text-emerald-600 hover:bg-emerald-200 disabled:opacity-50"
                        title="Aprovar"
                      >
                        {approvingId === app.id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <FileCheck className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => setRejectModal({ id: app.id, title: app.ged_documents?.title ?? '' })}
                        className="p-1.5 rounded bg-red-100 text-red-600 hover:bg-red-200"
                        title="Rejeitar"
                      >
                        <FileX className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {app.comments && app.status === 'rejected' && (
                    <span className="text-xs text-slate-500 italic">{app.comments}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  // ── Categorias ─────────────────────────────────────────────────────────────

  const renderCategories = () => (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowNewCategory(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700"
        >
          <Plus className="w-4 h-4" /> Nova Categoria
        </button>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {categories.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">Nenhuma categoria cadastrada.</div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium">
              <tr>
                <th className="px-6 py-3">Nome</th>
                <th className="px-6 py-3">Código</th>
                <th className="px-6 py-3">Descrição</th>
                <th className="px-6 py-3">Responsável</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.map(cat => (
                <tr key={cat.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-800">{cat.name}</td>
                  <td className="px-6 py-3 font-mono text-slate-500">{cat.code}</td>
                  <td className="px-6 py-3 text-slate-600 max-w-xs truncate">{cat.description ?? '—'}</td>
                  <td className="px-6 py-3 text-slate-600">{cat.responsible_name ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  // ── Versões ────────────────────────────────────────────────────────────────

  const renderVersions = () => (
    <div className="space-y-4">
      {/* Seletor de documento */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-slate-500" />
          Selecione um documento para ver o histórico de versões
        </label>
        <select
          className="w-full max-w-md px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          value={versionsDocId}
          onChange={e => setVersionsDocId(e.target.value)}
        >
          <option value="">— Selecione um documento —</option>
          {docs.map(d => (
            <option key={d.id} value={d.id}>{d.code} — {d.title}</option>
          ))}
        </select>
        {docs.length === 0 && (
          <p className="text-xs text-slate-400 mt-2">
            Nenhum documento carregado. Vá à aba Documentos para carregar a lista.
          </p>
        )}
      </div>

      {/* Lista de versões */}
      {versionsDocId && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-bold text-slate-800">Histórico de Versões</h3>
          </div>
          {loadingVersions ? (
            <div className="flex items-center justify-center py-10 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando...
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              Nenhuma versão registrada para este documento.
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="px-6 py-3">Versão</th>
                  <th className="px-6 py-3">Arquivo</th>
                  <th className="px-6 py-3">Motivo da Alteração</th>
                  <th className="px-6 py-3">Autor</th>
                  <th className="px-6 py-3">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {versions.map(v => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-mono font-bold text-slate-700">v{v.version}</td>
                    <td className="px-6 py-3 text-slate-600">
                      {v.file_name
                        ? <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {v.file_name} <span className="text-slate-400">({formatBytes(v.file_size)})</span></span>
                        : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-6 py-3 text-slate-600 max-w-xs truncate">{v.change_reason ?? '—'}</td>
                    <td className="px-6 py-3 text-slate-600">{v.author_name ?? '—'}</td>
                    <td className="px-6 py-3 text-slate-500">{formatDate(v.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );

  // ── Root render ────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">
      {/* Toast global */}
      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      {/* Modals */}
      {showNewDoc && (
        <NewDocModal
          categories={categories}
          onClose={() => setShowNewDoc(false)}
          onSaved={doc => {
            setShowNewDoc(false);
            setDocs(prev => [doc, ...prev]);
            setDocsCount(c => c + 1);
            showToast('success', 'Documento criado com sucesso.');
          }}
        />
      )}

      {showNewCategory && (
        <NewCategoryModal
          onClose={() => setShowNewCategory(false)}
          onSaved={cat => {
            setShowNewCategory(false);
            setCategories(prev => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)));
            showToast('success', 'Categoria criada com sucesso.');
          }}
        />
      )}

      {rejectModal && (
        <RejectModal
          approvalId={rejectModal.id}
          docTitle={rejectModal.title}
          onClose={() => setRejectModal(null)}
          onError={msg => showToast('error', msg)}
          onDone={() => {
            setApprovals(prev => prev.map(a =>
              a.id === rejectModal.id
                ? { ...a, status: 'rejected' as const, decided_at: new Date().toISOString() }
                : a
            ));
            setRejectModal(null);
            showToast('success', 'Documento rejeitado. O responsável será notificado.');
            loadDocs();
            getDocumentKPIs().then(setKpis).catch(() => null);
          }}
        />
      )}

      <header className="flex items-center justify-between pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestão Eletrônica de Documentos (GED)</h1>
          <p className="text-slate-500 text-sm mt-1">Centralize, versione e distribua documentos corporativos.</p>
        </div>
        <button
          onClick={() => setShowNewDoc(true)}
          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-medium text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Novo Documento
        </button>
      </header>

      {!controlledTab && (
        <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab ? 'bg-amber-600 text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'Dashboard'   && renderDashboard()}
        {activeTab === 'Documentos'  && renderDocuments()}
        {activeTab === 'Formulários' && renderDocuments()}
        {activeTab === 'Aprovações'  && renderApprovals()}
        {activeTab === 'Categorias'  && renderCategories()}
        {activeTab === 'Versões'     && renderVersions()}
        {activeTab === 'automacoes'  && <ActivitiesPanel defaultModule="DOCUMENTOS" />}
      </div>
    </div>
  );
}
