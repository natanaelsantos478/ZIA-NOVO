import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Search, Filter, Package, Eye, Wrench,
  ArrowRightLeft, QrCode, ChevronLeft, ChevronRight,
  X, Save, Upload, Tag,
} from 'lucide-react';
import {
  getAssets, getCategories, createAsset, updateAsset, getAssetById,
  getAssetHistory, getAssetFiles, uploadAssetFile,
  type Asset, type AssetCategory, type AssetHistoryEvent, type AssetFile,
  type AssetFilters,
} from '../../../lib/eam';

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  em_aquisicao: 'Em aquisição', disponivel: 'Disponível', em_uso: 'Em uso',
  em_manutencao: 'Em manutenção', em_emprestimo: 'Emprestado',
  descartado: 'Descartado', alienado: 'Alienado', extraviado: 'Extraviado',
};
const STATUS_COLORS: Record<string, string> = {
  em_aquisicao: 'bg-yellow-100 text-yellow-700', disponivel: 'bg-green-100 text-green-700',
  em_uso: 'bg-blue-100 text-blue-700', em_manutencao: 'bg-red-100 text-red-700',
  em_emprestimo: 'bg-purple-100 text-purple-700', descartado: 'bg-slate-100 text-slate-500',
  alienado: 'bg-orange-100 text-orange-600', extraviado: 'bg-rose-100 text-rose-600',
};
const TYPE_LABELS: Record<string, string> = {
  fixo: 'Ativo Fixo', ti: 'TI', mobiliario: 'Mobiliário', intangivel: 'Intangível',
};
const DEPRECIATION_LABELS: Record<string, string> = {
  linear: 'Linear', soma_digitos: 'Soma dos Dígitos',
  saldo_decrescente_duplo: 'Saldo Decrescente Duplo', unidades_produzidas: 'Unidades Produzidas',
};

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

// ── Toast helper ──────────────────────────────────────────────────────────────
function Toast({ msg, type, onClose }: { msg: string; type: 'ok' | 'err'; onClose: () => void }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-white text-sm ${type === 'ok' ? 'bg-green-600' : 'bg-red-600'}`}>
      <span>{msg}</span>
      <button onClick={onClose}><X className="w-4 h-4" /></button>
    </div>
  );
}

// ── Asset Form ────────────────────────────────────────────────────────────────
const EMPTY_FORM = {
  name: '', description: '', asset_type: 'fixo' as Asset['asset_type'],
  category_id: '', subcategory_id: '', brand: '', model: '', serial_number: '',
  acquisition_date: '', acquisition_value: 0, supplier_name: '', invoice_ref: '',
  warranty_start: '', warranty_end: '', warranty_supplier: '',
  location_unit: '', location_floor: '', location_room: '',
  responsible_name: '', department_name: '',
  depreciation_method: 'linear' as Asset['depreciation_method'],
  useful_life_months: 60, residual_value: 0, depreciation_start: '',
  status: 'disponivel' as Asset['status'], notes: '',
};

interface AssetFormProps {
  initial?: Asset | null;
  categories: AssetCategory[];
  onSave: () => void;
  onCancel: () => void;
}

function AssetForm({ initial, categories, onSave, onCancel }: AssetFormProps) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...(initial ?? {}) });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const roots = categories.filter((c) => !c.parent_id);
  const subs = categories.filter((c) => c.parent_id === form.category_id);

  function set(key: string, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('Nome é obrigatório'); return; }
    if (!form.asset_type) { setError('Tipo é obrigatório'); return; }
    setSaving(true);
    setError('');
    try {
      if (initial?.id) {
        await updateAsset(initial.id, form as Partial<Asset>);
      } else {
        await createAsset(form as Omit<Asset, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'tag'>);
      }
      onSave();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  const field = (label: string, key: string, type = 'text', extra?: React.InputHTMLAttributes<HTMLInputElement>) => (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <input
        type={type}
        value={(form as Record<string, unknown>)[key] as string ?? ''}
        onChange={(e) => set(key, type === 'number' ? Number(e.target.value) : e.target.value)}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        {...extra}
      />
    </div>
  );

  const select = (label: string, key: string, options: { value: string; label: string }[]) => (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      <select
        value={(form as Record<string, unknown>)[key] as string ?? ''}
        onChange={(e) => set(key, e.target.value)}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">— Selecione —</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Identificação */}
      <section>
        <h3 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-100">Identificação</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field('Nome do Ativo *', 'name')}
          {select('Tipo *', 'asset_type', Object.entries(TYPE_LABELS).map(([k, v]) => ({ value: k, label: v })))}
          {select('Categoria', 'category_id', roots.map((c) => ({ value: c.id, label: c.name })))}
          {subs.length > 0 && select('Subcategoria', 'subcategory_id', subs.map((c) => ({ value: c.id, label: c.name })))}
          {field('Fabricante', 'brand')}
          {field('Modelo', 'model')}
          {field('Número de Série', 'serial_number')}
        </div>
        <div className="mt-4">
          <label className="block text-xs font-medium text-slate-600 mb-1">Descrição</label>
          <textarea
            value={form.description ?? ''}
            onChange={(e) => set('description', e.target.value)}
            rows={2}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </section>

      {/* Aquisição */}
      <section>
        <h3 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-100">Aquisição</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {field('Data de Aquisição', 'acquisition_date', 'date')}
          {field('Valor de Compra (R$)', 'acquisition_value', 'number')}
          {field('Fornecedor', 'supplier_name')}
          {field('Nota Fiscal (ref)', 'invoice_ref')}
          {field('Início de Garantia', 'warranty_start', 'date')}
          {field('Fim de Garantia', 'warranty_end', 'date')}
          {field('Fornecedor Garantia', 'warranty_supplier')}
        </div>
      </section>

      {/* Localização */}
      <section>
        <h3 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-100">Localização e Responsabilidade</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {field('Unidade', 'location_unit')}
          {field('Andar', 'location_floor')}
          {field('Sala', 'location_room')}
          {field('Responsável', 'responsible_name')}
          {field('Departamento', 'department_name')}
          {select('Status', 'status', Object.entries(STATUS_LABELS).map(([k, v]) => ({ value: k, label: v })))}
        </div>
      </section>

      {/* Depreciação */}
      <section>
        <h3 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-100">Depreciação</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {select('Método', 'depreciation_method', Object.entries(DEPRECIATION_LABELS).map(([k, v]) => ({ value: k, label: v })))}
          {field('Vida Útil (meses)', 'useful_life_months', 'number')}
          {field('Valor Residual (R$)', 'residual_value', 'number')}
          {field('Início da Depreciação', 'depreciation_start', 'date')}
        </div>
      </section>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving}
          className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? 'Salvando…' : (initial ? 'Atualizar' : 'Cadastrar Ativo')}
        </button>
        <button type="button" onClick={onCancel}
          className="px-5 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ── Asset Detail Panel ────────────────────────────────────────────────────────
type DetailTab = 'info' | 'history' | 'files';

interface DetailPanelProps {
  asset: Asset;
  categories: AssetCategory[];
  onEdit: () => void;
  onClose: () => void;
}

function DetailPanel({ asset, categories, onEdit, onClose }: DetailPanelProps) {
  const [tab, setTab] = useState<DetailTab>('info');
  const [history, setHistory] = useState<AssetHistoryEvent[]>([]);
  const [files, setFiles] = useState<AssetFile[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    getAssetHistory(asset.id).then(setHistory);
    getAssetFiles(asset.id).then(setFiles);
  }, [asset.id]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const newFile = await uploadAssetFile(asset.id, file, 'outro');
      setFiles((f) => [newFile, ...f]);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  const catName = categories.find((c) => c.id === asset.category_id)?.name ?? '—';

  const EVENT_LABELS: Record<string, string> = {
    criacao: 'Cadastro', transferencia: 'Transferência', mudanca_status: 'Mudança de Status',
    edicao: 'Edição', manutencao_iniciada: 'Manutenção Iniciada',
    manutencao_concluida: 'Manutenção Concluída', inventario: 'Inventário',
    upload_documento: 'Documento Anexado',
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-t-2xl">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Tag className="w-4 h-4 opacity-80" />
              <span className="text-sm opacity-90 font-mono">{asset.tag}</span>
            </div>
            <h2 className="text-xl font-bold">{asset.name}</h2>
            <p className="text-sm opacity-80 mt-0.5">{TYPE_LABELS[asset.asset_type]} · {catName}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[asset.status]} bg-white/20 text-white`}>
              {STATUS_LABELS[asset.status]}
            </span>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 bg-white px-4">
        {(['info', 'history', 'files'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {t === 'info' ? 'Visão Geral' : t === 'history' ? 'Histórico' : 'Documentos'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
        {tab === 'info' && (
          <div className="space-y-4">
            <button onClick={onEdit} className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
              Editar ativo
            </button>
            {[
              { label: 'Valor de Compra', value: fmt(asset.acquisition_value) },
              { label: 'Valor Contábil Atual', value: asset.current_book_value != null ? fmt(asset.current_book_value) : '—' },
              { label: 'Número de Série', value: asset.serial_number ?? '—' },
              { label: 'Modelo', value: asset.model ?? '—' },
              { label: 'Fabricante', value: asset.brand ?? '—' },
              { label: 'Responsável', value: asset.responsible_name ?? '—' },
              { label: 'Departamento', value: asset.department_name ?? '—' },
              { label: 'Localização', value: [asset.location_unit, asset.location_floor, asset.location_room].filter(Boolean).join(' / ') || '—' },
              { label: 'Garantia até', value: asset.warranty_end ? new Date(asset.warranty_end).toLocaleDateString('pt-BR') : '—' },
              { label: 'Método Depreciação', value: DEPRECIATION_LABELS[asset.depreciation_method] ?? '—' },
              { label: 'Vida Útil', value: `${asset.useful_life_months} meses` },
              { label: 'Valor Residual', value: fmt(asset.residual_value) },
              { label: 'Fornecedor', value: asset.supplier_name ?? '—' },
              { label: 'Nota Fiscal', value: asset.invoice_ref ?? '—' },
              { label: 'Cadastrado em', value: new Date(asset.created_at).toLocaleDateString('pt-BR') },
            ].map((row) => (
              <div key={row.label} className="flex justify-between text-sm py-1.5 border-b border-slate-50">
                <span className="text-slate-500">{row.label}</span>
                <span className="font-medium text-slate-700 text-right max-w-[60%] truncate">{row.value}</span>
              </div>
            ))}
            {asset.qr_code_url && (
              <div className="flex items-center gap-2 mt-2">
                <QrCode className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-500 truncate">{asset.qr_code_url}</span>
              </div>
            )}
          </div>
        )}

        {tab === 'history' && (
          <div className="space-y-3">
            {history.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">Nenhum registro de histórico</p>
            ) : history.map((ev) => (
              <div key={ev.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-1.5 shrink-0" />
                  <div className="w-px bg-slate-100 flex-1 mt-1" />
                </div>
                <div className="pb-4">
                  <p className="text-sm font-medium text-slate-700">{EVENT_LABELS[ev.event_type] ?? ev.event_type}</p>
                  <p className="text-xs text-slate-500">{ev.justification}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{new Date(ev.created_at).toLocaleString('pt-BR')}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'files' && (
          <div className="space-y-3">
            <label className={`flex items-center gap-2 px-4 py-2 border-2 border-dashed border-blue-200 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
              <Upload className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-blue-600">{uploading ? 'Enviando…' : 'Anexar arquivo'}</span>
              <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
            </label>
            {files.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Nenhum arquivo anexado</p>
            ) : files.map((f) => (
              <div key={f.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                  <Package className="w-4 h-4 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">{f.original_name}</p>
                  <p className="text-xs text-slate-400">{f.file_type} · {f.uploaded_at ? new Date(f.uploaded_at).toLocaleDateString('pt-BR') : ''}</p>
                </div>
                {f.url && (
                  <a href={f.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline shrink-0">
                    Abrir
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AssetsList() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<AssetFilters>({ search: '', status: '', asset_type: '' });
  const [showFilters, setShowFilters] = useState(false);

  const [mode, setMode] = useState<'list' | 'form' | 'detail'>('list');
  const [selected, setSelected] = useState<Asset | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadAssets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAssets({ ...filters, page, pageSize: PAGE_SIZE });
      setAssets(res.data);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { getCategories().then(setCategories); }, []);
  useEffect(() => { loadAssets(); }, [loadAssets]);

  function openEdit(asset: Asset) {
    setSelected(asset);
    setMode('form');
  }

  function openNew() {
    setSelected(null);
    setMode('form');
  }

  async function afterSave() {
    setMode('list');
    await loadAssets();
    showToast(selected ? 'Ativo atualizado com sucesso!' : 'Ativo cadastrado com sucesso!');
    setSelected(null);
  }

  async function openDetailFromDb(asset: Asset) {
    const full = await getAssetById(asset.id);
    setSelected(full ?? asset);
    setMode('detail');
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // ── Form view
  if (mode === 'form') {
    return (
      <div className="p-6 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setMode('list')} className="p-1.5 hover:bg-slate-100 rounded-lg">
            <ChevronLeft className="w-5 h-5 text-slate-500" />
          </button>
          <h1 className="text-xl font-bold text-slate-800">
            {selected ? 'Editar Ativo' : 'Novo Ativo'}
          </h1>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <AssetForm
            initial={selected}
            categories={categories}
            onSave={afterSave}
            onCancel={() => { setMode('list'); setSelected(null); }}
          />
        </div>
        {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    );
  }

  // ── Detail view
  if (mode === 'detail' && selected) {
    return (
      <div className="p-6 max-w-2xl">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <DetailPanel
            asset={selected}
            categories={categories}
            onEdit={() => openEdit(selected)}
            onClose={() => { setMode('list'); setSelected(null); }}
          />
        </div>
        {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    );
  }

  // ── List view
  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Ativos Patrimoniais</h1>
          <p className="text-slate-500 text-sm">{total} ativo{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Novo Ativo
        </button>
      </div>

      {/* Search + Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 space-y-3">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome…"
              value={filters.search ?? ''}
              onChange={(e) => { setFilters((f) => ({ ...f, search: e.target.value })); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm ${showFilters ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            <Filter className="w-4 h-4" /> Filtros
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
            <select value={filters.status ?? ''} onChange={(e) => { setFilters((f) => ({ ...f, status: e.target.value as Asset['status'] | '' })); setPage(1); }}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todos os status</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={filters.asset_type ?? ''} onChange={(e) => { setFilters((f) => ({ ...f, asset_type: e.target.value as Asset['asset_type'] | '' })); setPage(1); }}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todos os tipos</option>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={filters.category_id ?? ''} onChange={(e) => { setFilters((f) => ({ ...f, category_id: e.target.value })); setPage(1); }}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todas as categorias</option>
              {categories.filter((c) => !c.parent_id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-7 h-7 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Package className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">Nenhum ativo encontrado</p>
            <p className="text-slate-400 text-sm mt-1">Cadastre o primeiro ativo ou ajuste os filtros</p>
            <button onClick={openNew} className="mt-4 flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
              <Plus className="w-4 h-4" /> Cadastrar Ativo
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tag</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nome</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Tipo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Responsável</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Valor</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {assets.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{a.tag}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => openDetailFromDb(a)} className="text-left hover:underline">
                        <p className="font-medium text-slate-800">{a.name}</p>
                        {a.model && <p className="text-xs text-slate-400">{a.model}</p>}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">{TYPE_LABELS[a.asset_type]}</td>
                    <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{a.responsible_name ?? <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[a.status]}`}>
                        {STATUS_LABELS[a.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 hidden lg:table-cell">{fmt(a.acquisition_value)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openDetailFromDb(a)} title="Ver detalhes"
                          className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEdit(a)} title="Editar"
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
                          <ArrowRightLeft className="w-4 h-4" />
                        </button>
                        <button title="Manutenção"
                          className="p-1.5 hover:bg-orange-50 rounded-lg text-orange-400">
                          <Wrench className="w-4 h-4" />
                        </button>
                        {a.qr_code_url && (
                          <a href={a.qr_code_url} target="_blank" rel="noreferrer" title="QR Code"
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
                            <QrCode className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Página {page} de {totalPages} · {total} registros
            </p>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 hover:bg-slate-100 rounded-lg disabled:opacity-40">
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 hover:bg-slate-100 rounded-lg disabled:opacity-40">
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
        )}
      </div>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
