// ─────────────────────────────────────────────────────────────────────────────
// IAGaleria — Galeria de documentos que a IA pode enviar pelo WhatsApp
// Cada arquivo é armazenado no bucket 'ia-galeria' e referenciado na tabela
// ia_galeria_arquivos. O webhook do WhatsApp lê esta tabela para saber quais
// arquivos pode sugerir/enviar ao cliente.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react';
import {
  Upload, Trash2, FileText, Image, File, RefreshCw, Plus,
  AlertCircle, CheckCircle2, Download,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { getTenantId } from '../../../lib/auth';

interface GaleriaArquivo {
  id: string;
  tenant_id: string;
  nome: string;
  descricao: string | null;
  storage_path: string;
  mime_type: string;
  tamanho_bytes: number | null;
  created_at: string;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ mime }: { mime: string }) {
  if (mime.startsWith('image/')) return <Image className="w-5 h-5 text-blue-500" />;
  if (mime === 'application/pdf') return <FileText className="w-5 h-5 text-red-500" />;
  return <File className="w-5 h-5 text-slate-400" />;
}

interface UploadModalProps {
  tenantId: string;
  onClose: () => void;
  onUploaded: (f: GaleriaArquivo) => void;
}

function UploadModal({ tenantId, onClose, onUploaded }: UploadModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFile(f: File) {
    setFile(f);
    if (!nome) setNome(f.name.replace(/\.[^.]+$/, ''));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !nome.trim()) { setError('Selecione um arquivo e informe o nome'); return; }
    setUploading(true);
    setError(null);
    try {
      const ext = file.name.split('.').pop() ?? '';
      const safeName = `${crypto.randomUUID()}.${ext}`;
      const storagePath = `${tenantId}/${safeName}`;

      const { error: uploadErr } = await supabase.storage
        .from('ia-galeria')
        .upload(storagePath, file, { contentType: file.type, upsert: false });
      if (uploadErr) throw new Error(`Upload falhou: ${uploadErr.message}`);

      const { data, error: dbErr } = await supabase
        .from('ia_galeria_arquivos')
        .insert({
          tenant_id: tenantId,
          nome: nome.trim(),
          descricao: descricao.trim() || null,
          storage_path: storagePath,
          mime_type: file.type || 'application/octet-stream',
          tamanho_bytes: file.size,
        })
        .select()
        .single();
      if (dbErr) throw new Error(`Registro falhou: ${dbErr.message}`);
      onUploaded(data as GaleriaArquivo);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao enviar');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="font-bold text-slate-800 text-lg mb-4">Adicionar documento</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              file ? 'border-violet-400 bg-violet-50' : 'border-slate-200 hover:border-violet-300'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.mp4,.mp3"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileIcon mime={file.type} />
                <div className="text-left">
                  <p className="text-sm font-semibold text-slate-700">{file.name}</p>
                  <p className="text-xs text-slate-400">{formatBytes(file.size)}</p>
                </div>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Clique para selecionar um arquivo</p>
                <p className="text-xs text-slate-400 mt-1">PDF, Word, Excel, imagens, vídeos</p>
              </>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700">Nome do documento *</label>
            <input
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="ex: Apresentação da Empresa"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-700">Descrição</label>
            <textarea
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              rows={2}
              placeholder="Descreva o conteúdo — a IA usa isso para decidir quando enviar"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit" disabled={uploading || !file}
              className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
              {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function IAGaleria() {
  const tenantId = getTenantId();
  const [arquivos, setArquivos] = useState<GaleriaArquivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const { data, error: e } = await supabase
      .from('ia_galeria_arquivos')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    if (e) setError(e.message);
    else setArquivos((data ?? []) as GaleriaArquivo[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDelete(arq: GaleriaArquivo) {
    if (!confirm(`Excluir "${arq.nome}"? Esta ação não pode ser desfeita.`)) return;
    setDeletingId(arq.id);
    try {
      await supabase.storage.from('ia-galeria').remove([arq.storage_path]);
      const { error: e } = await supabase
        .from('ia_galeria_arquivos')
        .delete()
        .eq('id', arq.id);
      if (e) throw new Error(e.message);
      setArquivos(prev => prev.filter(a => a.id !== arq.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao excluir');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDownload(arq: GaleriaArquivo) {
    const { data } = await supabase.storage
      .from('ia-galeria')
      .createSignedUrl(arq.storage_path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  }

  function handleUploaded(f: GaleriaArquivo) {
    setArquivos(prev => [f, ...prev]);
    setShowUpload(false);
    setSuccessMsg(`"${f.nome}" adicionado com sucesso`);
    setTimeout(() => setSuccessMsg(null), 3000);
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-100 mb-1">Galeria de Documentos</h1>
          <p className="text-sm text-slate-400">
            Arquivos que a IA pode enviar automaticamente pelo WhatsApp quando o cliente solicitar material.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading}
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" /> Adicionar documento
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-violet-900/30 border border-violet-700/40 rounded-xl px-4 py-3 text-sm text-violet-300 mb-6">
        A IA identifica quando o cliente pede uma apresentação, proposta ou material e envia o arquivo mais adequado baseado no nome e descrição. Adicione descrições detalhadas para melhorar a precisão.
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 bg-green-900/30 border border-green-700/40 rounded-xl px-4 py-3 text-sm text-green-300 mb-4">
          <CheckCircle2 className="w-4 h-4 shrink-0" /> {successMsg}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-red-900/30 border border-red-700/40 rounded-xl px-4 py-3 text-sm text-red-300 mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-200">×</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Carregando...
        </div>
      ) : arquivos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-500">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 opacity-30" />
          </div>
          <p className="font-medium text-slate-400 mb-1">Nenhum documento na galeria</p>
          <p className="text-sm text-slate-500 mb-5 text-center max-w-xs">
            Adicione PDFs, apresentações e imagens para que a IA possa enviá-los pelo WhatsApp.
          </p>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-violet-700"
          >
            <Plus className="w-4 h-4" /> Adicionar primeiro documento
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {arquivos.map(arq => (
            <div key={arq.id}
              className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex items-center gap-4 group hover:border-slate-600 transition-colors">
              <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center shrink-0">
                <FileIcon mime={arq.mime_type} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-100 text-sm truncate">{arq.nome}</p>
                {arq.descricao && (
                  <p className="text-xs text-slate-400 truncate mt-0.5">{arq.descricao}</p>
                )}
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[11px] text-slate-500">{arq.mime_type}</span>
                  <span className="text-[11px] text-slate-500">·</span>
                  <span className="text-[11px] text-slate-500">{formatBytes(arq.tamanho_bytes)}</span>
                  <span className="text-[11px] text-slate-500">·</span>
                  <span className="text-[11px] text-slate-500">
                    {new Date(arq.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={() => handleDownload(arq)}
                  className="p-2 rounded-xl hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                  title="Baixar arquivo"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(arq)}
                  disabled={deletingId === arq.id}
                  className="p-2 rounded-xl hover:bg-red-900/40 text-slate-400 hover:text-red-400 transition-colors"
                  title="Excluir"
                >
                  {deletingId === arq.id
                    ? <RefreshCw className="w-4 h-4 animate-spin" />
                    : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showUpload && (
        <UploadModal
          tenantId={tenantId}
          onClose={() => setShowUpload(false)}
          onUploaded={handleUploaded}
        />
      )}
    </div>
  );
}
