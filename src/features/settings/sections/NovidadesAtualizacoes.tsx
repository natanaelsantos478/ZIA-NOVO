import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, GripVertical, Eye, EyeOff, ImageIcon, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useProfiles } from '../../../context/ProfileContext';

interface Novidade {
  id: string;
  titulo: string | null;
  imagem_url: string;
  storage_path: string | null;
  ordem: number;
  ativo: boolean;
}

export default function NovidadesAtualizacoes() {
  const { activeProfile } = useProfiles();
  const tenantId = activeProfile?.entityId ?? '';

  const [items, setItems]     = useState<Novidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError]     = useState('');
  const [toast, setToast]     = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    if (!tenantId) return;
    setLoading(true);
    const { data } = await supabase
      .from('novidades')
      .select('id, titulo, imagem_url, storage_path, ordem, ativo')
      .eq('tenant_id', tenantId)
      .order('ordem');
    setItems((data ?? []) as Novidade[]);
    setLoading(false);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0 || !tenantId) return;
    setUploading(true);
    setError('');
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) { setError('Apenas imagens são aceitas.'); continue; }
        if (file.size > 5 * 1024 * 1024) { setError('Imagem deve ter no máximo 5 MB.'); continue; }

        const ext  = file.name.split('.').pop() ?? 'jpg';
        const path = `${tenantId}/${Date.now()}.${ext}`;

        const { error: upErr } = await supabase.storage.from('novidades').upload(path, file, { upsert: false });
        if (upErr) { setError(`Erro ao enviar: ${upErr.message}`); continue; }

        const { data: urlData } = supabase.storage.from('novidades').getPublicUrl(path);

        const maxOrdem = items.length > 0 ? Math.max(...items.map(i => i.ordem)) + 1 : 0;
        const { error: dbErr } = await supabase.from('novidades').insert({
          tenant_id:    tenantId,
          imagem_url:   urlData.publicUrl,
          storage_path: path,
          ordem:        maxOrdem,
          ativo:        true,
        });
        if (dbErr) { setError(`Erro ao salvar: ${dbErr.message}`); continue; }
      }
      await load();
      showToast('Imagem adicionada com sucesso!');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function toggleAtivo(item: Novidade) {
    await supabase.from('novidades').update({ ativo: !item.ativo }).eq('id', item.id);
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, ativo: !i.ativo } : i));
  }

  async function handleDelete(item: Novidade) {
    if (!confirm(`Remover esta imagem da sequência de novidades?`)) return;
    if (item.storage_path) await supabase.storage.from('novidades').remove([item.storage_path]);
    await supabase.from('novidades').delete().eq('id', item.id);
    setItems(prev => prev.filter(i => i.id !== item.id));
    showToast('Imagem removida.');
  }

  async function updateTitulo(item: Novidade, titulo: string) {
    await supabase.from('novidades').update({ titulo: titulo || null }).eq('id', item.id);
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, titulo: titulo || null } : i));
  }

  async function moveItem(index: number, dir: -1 | 1) {
    const newItems = [...items];
    const swap = index + dir;
    if (swap < 0 || swap >= newItems.length) return;
    [newItems[index], newItems[swap]] = [newItems[swap], newItems[index]];
    const updated = newItems.map((item, i) => ({ ...item, ordem: i }));
    setItems(updated);
    await Promise.all(updated.map(item => supabase.from('novidades').update({ ordem: item.ordem }).eq('id', item.id)));
  }

  return (
    <div className="p-6 max-w-3xl">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-900">Novidades e Atualizações</h2>
        <p className="text-sm text-slate-500 mt-1">
          As imagens ativas aparecem em carrossel para todos os usuários ao entrar no sistema.
          Formato recomendado: <strong>16:9</strong> (ex: 1280×720px).
        </p>
      </div>

      {/* Upload */}
      <div
        className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer mb-6"
        onClick={() => fileRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleUpload(e.dataTransfer.files); }}
      >
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => handleUpload(e.target.files)} />
        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-indigo-500">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="text-sm font-medium">Enviando...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <ImageIcon className="w-10 h-10" />
            <p className="text-sm font-medium text-slate-600">Clique ou arraste imagens aqui</p>
            <p className="text-xs text-slate-400">PNG, JPG, WEBP · máx 5 MB por imagem · proporção 16:9 ideal</p>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 py-8 justify-center">
          <Loader2 className="w-5 h-5 animate-spin" /> Carregando...
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <ImageIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma imagem cadastrada ainda.</p>
          <p className="text-xs mt-1">Adicione imagens para exibir na entrada do sistema.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={item.id} className={`flex items-center gap-3 bg-white border rounded-2xl p-3 shadow-sm transition-opacity ${!item.ativo ? 'opacity-50' : ''}`}>

              {/* Reordenar */}
              <div className="flex flex-col gap-0.5 shrink-0">
                <button onClick={() => moveItem(index, -1)} disabled={index === 0}
                  className="p-0.5 text-slate-300 hover:text-slate-600 disabled:opacity-20 transition-colors">
                  <GripVertical className="w-4 h-4" />
                </button>
              </div>
              <span className="text-xs font-mono text-slate-400 w-4 shrink-0">{index + 1}</span>

              {/* Preview */}
              <div className="w-28 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                <img src={item.imagem_url} alt="" className="w-full h-full object-cover" />
              </div>

              {/* Título editável */}
              <input
                type="text"
                defaultValue={item.titulo ?? ''}
                onBlur={e => updateTitulo(item, e.target.value)}
                placeholder="Título opcional..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 min-w-0"
              />

              {/* Ativo/Inativo */}
              <button onClick={() => toggleAtivo(item)}
                className={`p-2 rounded-xl transition-colors ${item.ativo ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                title={item.ativo ? 'Visível — clique para ocultar' : 'Oculto — clique para exibir'}>
                {item.ativo ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>

              {/* Excluir */}
              <button onClick={() => handleDelete(item)}
                className="p-2 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          <button
            onClick={() => fileRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-2xl py-3 text-sm text-slate-400 hover:text-indigo-500 hover:border-indigo-300 transition-all"
          >
            <Plus className="w-4 h-4" /> Adicionar mais imagens
          </button>
        </div>
      )}
    </div>
  );
}
