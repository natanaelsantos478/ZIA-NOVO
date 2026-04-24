import { useState, useEffect, useRef } from 'react';
import { FileText, Upload, Trash2, Plus, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useProfiles } from '../../../context/ProfileContext';

interface Arquivo {
  id: string;
  nome: string;
  descricao: string | null;
  file_name: string;
  file_url: string;
  storage_path: string;
  created_at: string;
}

export default function ArquivosIA() {
  const { activeProfile } = useProfiles();
  const tenantId = activeProfile?.entityId ?? '';

  const [arquivos, setArquivos] = useState<Arquivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('whatsapp_ia_arquivos')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    setArquivos((data ?? []) as Arquivo[]);
    setLoading(false);
  }

  useEffect(() => { if (tenantId) load(); }, [tenantId]);

  function flash(msg: string, type: 'ok' | 'err') {
    if (type === 'ok') { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); }
    else { setError(msg); setTimeout(() => setError(''), 4000); }
  }

  async function handleUpload() {
    if (!file || !nome.trim()) { flash('Nome e arquivo são obrigatórios.', 'err'); return; }
    if (file.type !== 'application/pdf') { flash('Apenas arquivos PDF são permitidos.', 'err'); return; }
    if (file.size > 20 * 1024 * 1024) { flash('Arquivo muito grande. Máximo 20 MB.', 'err'); return; }

    setUploading(true);
    setError('');
    try {
      const ext = file.name.split('.').pop() ?? 'pdf';
      const path = `${tenantId}/${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('ia-arquivos')
        .upload(path, file, { contentType: file.type, upsert: false });

      if (upErr) throw new Error(upErr.message);

      const { data: urlData } = supabase.storage.from('ia-arquivos').getPublicUrl(path);
      const publicUrl = urlData.publicUrl;

      const { error: dbErr } = await supabase.from('whatsapp_ia_arquivos').insert({
        tenant_id: tenantId,
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        file_name: file.name,
        file_url: publicUrl,
        storage_path: path,
      });

      if (dbErr) throw new Error(dbErr.message);

      flash('Arquivo enviado com sucesso!', 'ok');
      setNome(''); setDescricao(''); setFile(null); setShowForm(false);
      if (fileRef.current) fileRef.current.value = '';
      load();
    } catch (e) {
      flash((e as Error).message, 'err');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(arq: Arquivo) {
    if (!confirm(`Remover "${arq.nome}"?`)) return;
    await supabase.storage.from('ia-arquivos').remove([arq.storage_path]);
    await supabase.from('whatsapp_ia_arquivos').delete().eq('id', arq.id);
    flash('Arquivo removido.', 'ok');
    load();
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Arquivos da IA</h1>
          <p className="text-sm text-slate-500 mt-1">
            PDFs que a IA pode enviar automaticamente durante conversas no WhatsApp.
          </p>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Adicionar arquivo
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl mb-4">
          <CheckCircle className="w-4 h-4 shrink-0" /> {success}
        </div>
      )}

      {showForm && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Novo arquivo</h2>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">
                Nome do arquivo <span className="text-red-500">*</span>
              </label>
              <input
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Ex: Apresentação ZITA"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <p className="text-xs text-slate-400 mt-1">A IA usa este nome exato para acionar o envio.</p>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Descrição (opcional)</label>
              <input
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                placeholder="Ex: Apresentação institucional da empresa com proposta de parceria"
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <p className="text-xs text-slate-400 mt-1">Ajuda a IA a entender quando enviar este arquivo.</p>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">
                Arquivo PDF <span className="text-red-500">*</span>
              </label>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-violet-50 file:text-violet-700 file:font-medium file:text-xs cursor-pointer"
              />
              {file && <p className="text-xs text-slate-500 mt-1">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>}
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? 'Enviando...' : 'Enviar'}
              </button>
              <button
                onClick={() => { setShowForm(false); setNome(''); setDescricao(''); setFile(null); }}
                className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2 rounded-xl transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
        </div>
      ) : arquivos.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6 text-slate-400" />
          </div>
          <p className="text-slate-500 text-sm">Nenhum arquivo cadastrado.</p>
          <p className="text-slate-400 text-xs mt-1">Adicione PDFs que a IA poderá enviar aos clientes.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {arquivos.map(arq => (
            <div key={arq.id} className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm truncate">{arq.nome}</p>
                {arq.descricao && <p className="text-xs text-slate-500 truncate mt-0.5">{arq.descricao}</p>}
                <p className="text-xs text-slate-400 mt-0.5">{arq.file_name}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={arq.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-violet-600 hover:text-violet-800 font-medium"
                >
                  Ver
                </a>
                <button
                  onClick={() => handleDelete(arq)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 bg-violet-50 border border-violet-100 rounded-2xl p-4">
        <p className="text-xs font-semibold text-violet-700 mb-1">Como funciona</p>
        <p className="text-xs text-violet-600">
          A IA conhece os arquivos cadastrados e seus nomes. Quando um cliente pedir uma apresentação ou material,
          ela envia o texto de resposta e o arquivo PDF automaticamente pelo WhatsApp.
          Use nomes claros e descritivos para que a IA saiba quando enviar cada arquivo.
        </p>
      </div>
    </div>
  );
}
