import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, FileText, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface NewsItem {
  id: string;
  titulo: string | null;
  descricao: string | null;
  arquivo_url: string | null;
  arquivo_nome: string | null;
  arquivo_tipo: string | null;
}

export default function NewsModal({ onContinue }: { onContinue: () => void }) {
  const [items, setItems]   = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    supabase
      .from('zia_news_items')
      .select('id,titulo,descricao,arquivo_url,arquivo_nome,arquivo_tipo')
      .eq('ativo', true)
      .order('ordem', { ascending: true })
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const list = data ?? [];
        setItems(list);
        setLoading(false);
        if (list.length === 0) onContinue();
      });
  }, []);

  const prev = useCallback(() => setCurrent(c => Math.max(0, c - 1)), []);
  const next = useCallback(() => setCurrent(c => Math.min(items.length - 1, c + 1)), [items.length]);

  if (loading || items.length === 0) return null;

  const item = items[current];
  const isImage = item.arquivo_tipo?.startsWith('image/');
  const multi   = items.length > 1;

  return (
    <div className="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col"
           style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)', border: '1px solid rgba(255,255,255,0.15)' }}>

        {/* Imagem — sempre no topo, ocupa espaço generoso */}
        {isImage && item.arquivo_url ? (
          <img
            src={item.arquivo_url}
            alt={item.titulo ?? ''}
            className="w-full object-cover"
            style={{ height: '420px' }}
          />
        ) : item.arquivo_url ? (
          <a
            href={item.arquivo_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 px-8 py-6 transition-colors"
            style={{ background: 'rgba(255,255,255,0.07)' }}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                 style={{ background: 'rgba(255,255,255,0.15)' }}>
              <FileText className="w-6 h-6 text-white" />
            </div>
            <span className="text-sm text-white font-medium flex-1 min-w-0 truncate">
              {item.arquivo_nome}
            </span>
            <ExternalLink className="w-4 h-4 shrink-0" style={{ color: 'rgba(255,255,255,0.5)' }} />
          </a>
        ) : null}

        {/* Corpo */}
        <div className="px-7 py-6 flex flex-col gap-5">
          {(item.titulo || item.descricao) && (
            <div>
              {item.titulo && (
                <p className="font-bold text-white text-xl leading-snug">{item.titulo}</p>
              )}
              {item.descricao && (
                <p className="text-sm leading-relaxed mt-1" style={{ color: 'rgba(255,255,255,0.65)' }}>
                  {item.descricao}
                </p>
              )}
            </div>
          )}

          {/* Dots */}
          {multi && (
            <div className="flex items-center justify-center gap-2">
              {items.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i === current ? '24px' : '8px',
                    height: '8px',
                    background: i === current ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.25)',
                  }}
                />
              ))}
            </div>
          )}

          {/* Ações */}
          <div className="flex items-center gap-3">
            {multi && (
              <>
                <button
                  onClick={prev}
                  disabled={current === 0}
                  className="p-2.5 rounded-xl transition-colors disabled:opacity-20"
                  style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={next}
                  disabled={current === items.length - 1}
                  className="p-2.5 rounded-xl transition-colors disabled:opacity-20"
                  style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
            <button
              onClick={onContinue}
              className="flex-1 py-3.5 rounded-2xl font-semibold text-sm text-white transition-all"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.22)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
            >
              Continuar para a plataforma
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
