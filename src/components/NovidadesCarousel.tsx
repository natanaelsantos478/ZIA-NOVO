import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
        requestAnimationFrame(() => setVisible(true));
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      style={{ background: 'rgba(2,4,14,0.85)', backdropFilter: 'blur(10px)' }}
    >
      {/* Card */}
      <div className="relative w-full max-w-2xl mx-4 rounded-3xl overflow-hidden shadow-2xl flex flex-col">

        {/* ── Imagem grande ── */}
        <div className="relative w-full" style={{ height: '68vh', maxHeight: 520 }}>
          <img
            key={item.id}
            src={item.image_url}
            alt={item.titulo ?? 'Novidade'}
            className="w-full h-full object-cover"
          />

          {/* Arrows sobre a imagem */}
          {items.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/25 hover:bg-black/45 flex items-center justify-center text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/25 hover:bg-black/45 flex items-center justify-center text-white transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* ── Barra inferior compacta e semi-transparente ── */}
        <div
          className="flex items-center justify-between gap-4 px-5 py-3"
          style={{ background: 'rgba(10,10,18,0.75)', backdropFilter: 'blur(12px)' }}
        >
          {/* Título + descrição */}
          <div className="min-w-0 flex-1">
            {item.titulo && (
              <p className="text-white font-semibold text-sm leading-tight truncate">{item.titulo}</p>
            )}
            {item.descricao && (
              <p className="text-white/50 text-xs mt-0.5 truncate">{item.descricao}</p>
            )}
          </div>

          {/* Dots */}
          {items.length > 1 && (
            <div className="flex items-center gap-1.5 shrink-0">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`rounded-full transition-all duration-300 ${
                    i === current ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/50'
                  }`}
                />
              ))}
            </div>
          )}

          {/* CTA */}
          <button
            onClick={onClose}
            className="shrink-0 text-xs font-semibold text-white bg-white/15 hover:bg-white/25 px-4 py-2 rounded-xl transition-colors"
          >
            Continuar para a plataforma
          </button>
        </div>

      </div>
    </div>
  );
}
