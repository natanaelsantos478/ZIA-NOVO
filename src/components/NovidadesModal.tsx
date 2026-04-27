import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Novidade {
  id: string;
  titulo: string | null;
  imagem_url: string;
  ordem: number;
}

const LS_KEY = 'zia_novidades_seen_v1';

function getSeenIds(): string[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]'); } catch { return []; }
}
function markSeen(ids: string[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(ids));
}

export default function NovidadesModal() {
  const [items, setItems]   = useState<Novidade[]>([]);
  const [idx, setIdx]       = useState(0);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded]   = useState(false);

  useEffect(() => {
    supabase
      .from('novidades')
      .select('id, titulo, imagem_url, ordem')
      .eq('ativo', true)
      .order('ordem')
      .then(({ data }) => {
        const rows = (data ?? []) as Novidade[];
        const seen = getSeenIds();
        const unseen = rows.filter(r => !seen.includes(r.id));
        if (unseen.length > 0) {
          setItems(unseen);
          setIdx(0);
          setVisible(true);
        }
      });
  }, []);

  const close = useCallback(() => {
    markSeen([...getSeenIds(), ...items.map(i => i.id)]);
    setVisible(false);
  }, [items]);

  const prev = () => setIdx(i => Math.max(0, i - 1));
  const next = () => {
    if (idx < items.length - 1) setIdx(i => i + 1);
    else close();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!visible) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft')  prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, idx, close]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible || items.length === 0) return null;

  const current = items[idx];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      {/* Card widescreen 16:9 */}
      <div className="relative w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl shadow-black/60"
           style={{ aspectRatio: '16/9' }}>

        {/* Imagem */}
        <img
          src={current.imagem_url}
          alt={current.titulo ?? 'Novidade'}
          className="w-full h-full object-cover"
          onLoad={() => setLoaded(true)}
          style={{ display: loaded ? 'block' : 'none' }}
        />
        {!loaded && (
          <div className="w-full h-full bg-slate-900 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Gradiente inferior para os controles */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

        {/* Fechar */}
        <button
          onClick={close}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 flex items-center justify-center text-white transition-colors backdrop-blur-sm"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Título opcional */}
        {current.titulo && (
          <div className="absolute top-3 left-3 bg-black/40 backdrop-blur-sm rounded-lg px-3 py-1">
            <span className="text-white text-xs font-semibold">{current.titulo}</span>
          </div>
        )}

        {/* Seta esquerda */}
        {idx > 0 && (
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 flex items-center justify-center text-white transition-colors backdrop-blur-sm"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {/* Seta direita / avançar */}
        <button
          onClick={next}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 flex items-center justify-center text-white transition-colors backdrop-blur-sm"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Bolinhas */}
        {items.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`rounded-full transition-all ${
                  i === idx
                    ? 'w-5 h-2 bg-white'
                    : 'w-2 h-2 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
          </div>
        )}

        {/* Contador */}
        {items.length > 1 && (
          <div className="absolute bottom-3 right-4 text-white/60 text-[10px] font-mono">
            {idx + 1}/{items.length}
          </div>
        )}
      </div>
    </div>
  );
}
