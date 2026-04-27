import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Novidade {
  id: string;
  titulo: string | null;
  descricao: string | null;
  image_url: string;
}

interface Props {
  onClose: () => void;
}

export default function NovidadesCarousel({ onClose }: Props) {
  const [items, setItems]     = useState<Novidade[]>([]);
  const [current, setCurrent] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    supabase
      .from('novidades')
      .select('id, titulo, descricao, image_url, ordem')
      .eq('ativo', true)
      .order('ordem')
      .then(({ data }) => {
        if (!data || data.length === 0) { onClose(); return; }
        setItems(data);
        // Pequeno delay para animar a entrada
        requestAnimationFrame(() => setVisible(true));
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-avança a cada 6s
  useEffect(() => {
    if (items.length <= 1) return;
    const t = setInterval(() => setCurrent(c => (c + 1) % items.length), 6000);
    return () => clearInterval(t);
  }, [items.length]);

  const prev = useCallback(
    () => setCurrent(c => (c - 1 + items.length) % items.length),
    [items.length],
  );
  const next = useCallback(
    () => setCurrent(c => (c + 1) % items.length),
    [items.length],
  );

  if (items.length === 0) return null;

  const item = items[current];

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}
      style={{ background: 'rgba(2,4,14,0.92)', backdropFilter: 'blur(8px)' }}
    >
      <div className="relative w-full max-w-3xl mx-4 flex flex-col items-center">

        {/* Imagem principal */}
        <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl bg-slate-900">
          <img
            key={item.id}
            src={item.image_url}
            alt={item.titulo ?? 'Novidade'}
            className="w-full max-h-[58vh] object-cover"
          />

          {/* Gradiente inferior suave para o texto */}
          {(item.titulo || item.descricao) && (
            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/70 to-transparent" />
          )}

          {/* Texto sobre a imagem */}
          {(item.titulo || item.descricao) && (
            <div className="absolute inset-x-0 bottom-0 px-6 pb-5">
              {item.titulo && (
                <p className="text-white font-semibold text-lg leading-tight">{item.titulo}</p>
              )}
              {item.descricao && (
                <p className="text-white/70 text-sm mt-1 line-clamp-2">{item.descricao}</p>
              )}
            </div>
          )}

          {/* Navegação prev/next — só com mais de 1 slide */}
          {items.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center text-white transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {/* Dots + counter */}
        {items.length > 1 && (
          <div className="flex items-center gap-2 mt-5">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === current
                    ? 'w-5 h-1.5 bg-white'
                    : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={onClose}
          className="mt-6 flex items-center gap-2 text-white text-sm font-medium px-6 py-2.5 rounded-full border border-white/20 hover:bg-white/10 transition-colors"
        >
          Entrar no sistema <ArrowRight className="w-4 h-4" />
        </button>

        {/* Label discreta de contagem */}
        {items.length > 1 && (
          <p className="mt-3 text-white/30 text-xs">
            {current + 1} / {items.length}
          </p>
        )}
      </div>
    </div>
  );
}
