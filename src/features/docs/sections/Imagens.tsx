import { useState, useEffect, useRef } from 'react';
import {
  Upload, Globe, Sparkles, X, Download, Loader2,
  ZoomIn, Trash2, Search, FolderOpen, CheckCircle, AlertTriangle,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { getTenantId, getTenantIds } from '../../../lib/auth';

// ── Tipos ────────────────────────────────────────────────────────────────────

type TipoImagem = 'importada' | 'web' | 'ia_gerada';

interface GedImagem {
  id:             string;
  tenant_id:      string;
  nome:           string;
  tipo:           TipoImagem;
  storage_path:   string | null;
  url_original:   string | null;
  prompt:         string | null;
  modelo:         string | null;
  agente_id:      string | null;
  mime_type:      string;
  file_size:      number | null;
  created_at:     string;
}

interface ToastState { type: 'error' | 'success'; msg: string }

async function getSignedUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from('ged-imagens').createSignedUrl(storagePath, 3600);
  if (error) throw error;
  return data.signedUrl;
}

async function uploadImagem(file: File, tenantId: string): Promise<{ path: string; mime: string; size: number }> {
  if (!file.type.startsWith('image/')) throw new Error('Apenas imagens são permitidas.');
  if (file.size > 50 * 1024 * 1024) throw new Error('Arquivo muito grande (máx 50 MB).');
  const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'png';
  const path = `${tenantId}/importadas/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from('ged-imagens').upload(path, file, {
    contentType: file.type, cacheControl: '3600', upsert: false,
  });
  if (error) throw error;
  return { path, mime: file.type, size: file.size };
}

function formatBytes(b: number | null): string {
  if (!b) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

// ── Pastas ───────────────────────────────────────────────────────────────────

const PASTAS: { id: TipoImagem; label: string; icon: React.ElementType; cor: string }[] = [
  { id: 'importada', label: 'Importadas',      icon: Upload,   cor: 'text-blue-500'   },
  { id: 'web',       label: 'Web',             icon: Globe,    cor: 'text-cyan-500'   },
  { id: 'ia_gerada', label: 'IA Gerada',       icon: Sparkles, cor: 'text-purple-500' },
];

// ── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ url, nome, onClose }: { url: string; nome: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80"
         onClick={onClose}>
      <div className="relative max-w-5xl max-h-[90vh] p-2" onClick={e => e.stopPropagation()}>
        <button onClick={onClose}
          className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center z-10">
          <X className="w-4 h-4 text-slate-700" />
        </button>
        <img src={url} alt={nome}
          className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl" />
        <p className="mt-2 text-center text-white/70 text-xs truncate">{nome}</p>
      </div>
    </div>
  );
}

// ── Card de imagem ────────────────────────────────────────────────────────────

function ImageCard({
  img, onView, onDelete,
}: {
  img: GedImagem;
  onView: (img: GedImagem) => void;
  onDelete: (id: string) => void;
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (img.storage_path) {
      getSignedUrl(img.storage_path).then(setSignedUrl).catch(() => null);
    } else if (img.url_original) {
      setSignedUrl(img.url_original);
    }
  }, [img.storage_path, img.url_original]);

  return (
    <div className="group relative bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="aspect-square bg-slate-100 flex items-center justify-center overflow-hidden">
        {signedUrl ? (
          <img src={signedUrl} alt={img.nome}
            className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
        )}
      </div>

      {/* Overlay com ações */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
        <button onClick={() => signedUrl && onView(img)}
          className="p-2 bg-white rounded-lg shadow hover:bg-slate-50 transition-colors">
          <ZoomIn className="w-4 h-4 text-slate-700" />
        </button>
        {signedUrl && (
          <a href={signedUrl} download={img.nome} target="_blank" rel="noopener noreferrer"
            className="p-2 bg-white rounded-lg shadow hover:bg-slate-50 transition-colors">
            <Download className="w-4 h-4 text-slate-700" />
          </a>
        )}
        <button onClick={() => onDelete(img.id)}
          className="p-2 bg-white rounded-lg shadow hover:bg-red-50 transition-colors">
          <Trash2 className="w-4 h-4 text-red-500" />
        </button>
      </div>

      {/* Info inferior */}
      <div className="px-2 py-1.5 border-t border-slate-100">
        <p className="text-xs font-medium text-slate-700 truncate">{img.nome}</p>
        {img.prompt && (
          <p className="text-[10px] text-slate-400 truncate mt-0.5">{img.prompt}</p>
        )}
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-[10px] text-slate-400">{formatBytes(img.file_size)}</span>
          {img.modelo && (
            <span className="text-[10px] text-purple-500 font-medium">{img.modelo}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function Imagens() {
  const [pasta, setPasta]       = useState<TipoImagem>('importada');
  const [imagens, setImagens]   = useState<GedImagem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [toast, setToast]       = useState<ToastState | null>(null);
  const [lightbox, setLightbox] = useState<{ url: string; nome: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [webUrl, setWebUrl]     = useState('');
  const [webLoading, setWebLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const tenantId  = getTenantId();
  const tenantIds = getTenantIds();

  // Contadores por pasta
  const [contadores, setContadores] = useState<Record<TipoImagem, number>>({
    importada: 0, web: 0, ia_gerada: 0,
  });

  const showToast = (type: ToastState['type'], msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  async function carregar() {
    setLoading(true);
    const ids = tenantIds.length > 0 ? tenantIds : tenantId ? [tenantId] : [];
    if (!ids.length) { setLoading(false); return; }

    const { data } = await supabase
      .from('ged_imagens')
      .select('*')
      .in('tenant_id', ids)
      .order('created_at', { ascending: false });

    const rows = (data ?? []) as GedImagem[];
    setImagens(rows);

    setContadores({
      importada: rows.filter(r => r.tipo === 'importada').length,
      web:       rows.filter(r => r.tipo === 'web').length,
      ia_gerada: rows.filter(r => r.tipo === 'ia_gerada').length,
    });

    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  const filtradas = imagens.filter(img =>
    img.tipo === pasta &&
    (search === '' || img.nome.toLowerCase().includes(search.toLowerCase()) ||
     (img.prompt ?? '').toLowerCase().includes(search.toLowerCase()))
  );

  // Upload de arquivo local
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !tenantId) return;
    setUploading(true);
    try {
      const { path, mime, size } = await uploadImagem(file, tenantId);
      await supabase.from('ged_imagens').insert({
        tenant_id:    tenantId,
        nome:         file.name,
        tipo:         'importada',
        storage_path: path,
        mime_type:    mime,
        file_size:    size,
      });
      showToast('success', 'Imagem importada com sucesso!');
      carregar();
    } catch (err: unknown) {
      showToast('error', (err as Error).message ?? 'Erro ao importar');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  // Importar da web por URL
  async function handleWebImport() {
    if (!webUrl.trim() || !tenantId) return;
    setWebLoading(true);
    try {
      const url = webUrl.trim();
      // Valida URL básica
      new URL(url);
      const nome = url.split('/').pop()?.split('?')[0] ?? `web_${Date.now()}.jpg`;

      await supabase.from('ged_imagens').insert({
        tenant_id:    tenantId,
        nome,
        tipo:         'web',
        url_original: url,
        mime_type:    'image/jpeg',
      });
      setWebUrl('');
      setPasta('web');
      showToast('success', 'Imagem da web salva!');
      carregar();
    } catch {
      showToast('error', 'URL inválida ou erro ao salvar.');
    } finally {
      setWebLoading(false);
    }
  }

  async function handleDelete(id: string) {
    const img = imagens.find(i => i.id === id);
    if (!img) return;

    if (img.storage_path) {
      const { error: storageErr } = await supabase.storage.from('ged-imagens').remove([img.storage_path]);
      if (storageErr) {
        showToast('error', 'Erro ao remover arquivo do storage.');
        return;
      }
    }
    await supabase.from('ged_imagens').delete().eq('id', id);
    showToast('success', 'Imagem removida.');
    carregar();
  }

  async function handleView(img: GedImagem) {
    try {
      let url = img.url_original ?? '';
      if (img.storage_path) url = await getSignedUrl(img.storage_path);
      if (url) setLightbox({ url, nome: img.nome });
    } catch { showToast('error', 'Erro ao abrir imagem.'); }
  }

  const pastaSelecionada = PASTAS.find(p => p.id === pasta)!;

  return (
    <div className="flex h-full bg-slate-50">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[200] flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium
          ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toast.type === 'error'
            ? <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            : <CheckCircle className="w-4 h-4 flex-shrink-0" />}
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} className="ml-2 opacity-75 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && <Lightbox url={lightbox.url} nome={lightbox.nome} onClose={() => setLightbox(null)} />}

      {/* Sidebar de pastas */}
      <aside className="w-52 flex-shrink-0 border-r border-slate-200 bg-white p-3 flex flex-col gap-1">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 mb-1">Pastas</p>
        {PASTAS.map(p => {
          const Icon = p.icon;
          const ativa = pasta === p.id;
          return (
            <button key={p.id} onClick={() => setPasta(p.id)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors w-full text-left
                ${ativa ? 'bg-amber-50 text-amber-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}>
              <Icon className={`w-4 h-4 flex-shrink-0 ${ativa ? 'text-amber-600' : p.cor}`} />
              <span className="flex-1">{p.label}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${ativa ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                {contadores[p.id]}
              </span>
            </button>
          );
        })}
      </aside>

      {/* Área principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200 bg-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <pastaSelecionada.icon className={`w-5 h-5 ${pastaSelecionada.cor}`} />
            <h2 className="font-bold text-slate-800 text-base">{pastaSelecionada.label}</h2>
          </div>

          {/* Busca */}
          <div className="relative flex-1 max-w-xs ml-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome ou prompt…"
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-300" />
          </div>

          <div className="flex-1" />

          {/* Ações por pasta */}
          {pasta === 'importada' && (
            <>
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Importar imagem
              </button>
              <input ref={fileRef} type="file" className="hidden"
                accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                onChange={handleFileUpload} />
            </>
          )}

          {pasta === 'web' && (
            <div className="flex items-center gap-2">
              <input value={webUrl} onChange={e => setWebUrl(e.target.value)}
                placeholder="https://... URL da imagem"
                className="w-64 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300"
                onKeyDown={e => e.key === 'Enter' && handleWebImport()} />
              <button onClick={handleWebImport} disabled={webLoading || !webUrl.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                {webLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                Salvar
              </button>
            </div>
          )}

          {pasta === 'ia_gerada' && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Imagens geradas automaticamente pelos agentes
            </div>
          )}
        </div>

        {/* Grid de imagens */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
            </div>
          ) : filtradas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <FolderOpen className="w-12 h-12 mb-3 opacity-40" />
              <p className="font-medium">
                {search ? 'Nenhuma imagem encontrada' : `Pasta ${pastaSelecionada.label} vazia`}
              </p>
              <p className="text-sm mt-1">
                {pasta === 'importada' && 'Clique em "Importar imagem" para adicionar.'}
                {pasta === 'web' && 'Cole a URL de uma imagem acima.'}
                {pasta === 'ia_gerada' && 'Imagens geradas por agentes aparecerão aqui.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filtradas.map(img => (
                <ImageCard key={img.id} img={img} onView={handleView} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
