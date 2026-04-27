import { useState, useEffect } from 'react';
import { Bell, FileText, ExternalLink, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface NewsItem {
  id: string;
  titulo: string | null;
  descricao: string | null;
  arquivo_url: string | null;
  arquivo_nome: string | null;
  arquivo_tipo: string | null;
}

function NewsCard({ item }: { item: NewsItem }) {
  const isImage = item.arquivo_tipo?.startsWith('image/');

  return (
    <div className="border border-slate-100 rounded-xl overflow-hidden bg-white">
      {isImage && item.arquivo_url && (
        <img
          src={item.arquivo_url}
          alt={item.arquivo_nome ?? 'imagem'}
          className="w-full max-h-64 object-cover"
        />
      )}
      {!isImage && item.arquivo_url && (
        <a
          href={item.arquivo_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors"
        >
          <div className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-slate-500" />
          </div>
          <span className="text-sm text-slate-700 font-medium flex-1 min-w-0 truncate">
            {item.arquivo_nome}
          </span>
          <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        </a>
      )}
      {(item.titulo || item.descricao) && (
        <div className="px-4 py-3">
          {item.titulo && (
            <p className="font-semibold text-slate-800 text-sm mb-1">{item.titulo}</p>
          )}
          {item.descricao && (
            <p className="text-slate-500 text-sm leading-relaxed">{item.descricao}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function NewsModal({ onContinue }: { onContinue: () => void }) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('zia_news_items')
      .select('id,titulo,descricao,arquivo_url,arquivo_nome,arquivo_tipo')
      .eq('ativo', true)
      .order('ordem', { ascending: true })
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setItems(data ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="fixed inset-0 z-[9998] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[82vh] flex flex-col">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Novidades do Sistema</h2>
            <p className="text-xs text-slate-400">Atualizações da Zitasoftware</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16">
              <Bell className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="font-medium text-slate-400">Sem novidades no momento</p>
              <p className="text-sm text-slate-300 mt-1">Nenhuma atualização para exibir</p>
            </div>
          ) : (
            items.map(item => <NewsCard key={item.id} item={item} />)
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 shrink-0">
          <button
            onClick={onContinue}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
          >
            Continuar para a plataforma <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
