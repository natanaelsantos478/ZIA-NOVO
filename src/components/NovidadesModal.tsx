// ─────────────────────────────────────────────────────────────────────────────
// NovidadesModal — Pop-up exibido a todas as empresas após o login
// Se não houver novidades ativas, mostra "Sem novidades" e libera entrada.
// ─────────────────────────────────────────────────────────────────────────────
import { Megaphone, Download, FileText, Image, Film, ArrowRight, X } from 'lucide-react';

export interface Novidade {
  id: string;
  titulo: string;
  descricao?: string | null;
  arquivo_url?: string | null;
  arquivo_nome?: string | null;
  arquivo_tipo?: string | null;
  criado_em: string;
}

interface Props {
  novidades: Novidade[];
  onContinue: () => void;
}

function AnexoIcon({ tipo }: { tipo?: string | null }) {
  if (!tipo) return <FileText className="w-4 h-4" />;
  if (tipo.startsWith('image/')) return <Image className="w-4 h-4" />;
  if (tipo.startsWith('video/')) return <Film className="w-4 h-4" />;
  return <FileText className="w-4 h-4" />;
}

export default function NovidadesModal({ novidades, onContinue }: Props) {
  const temNovidades = novidades.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800 bg-gradient-to-r from-indigo-900/40 to-violet-900/40">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0">
            <Megaphone className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Novidades</h2>
            <p className="text-xs text-slate-400">Comunicados da Zitasoftware</p>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {!temNovidades ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
                <Megaphone className="w-6 h-6 text-slate-600" />
              </div>
              <p className="text-slate-400 text-sm">Nenhuma novidade no momento.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {novidades.map((n, idx) => (
                <div key={n.id}
                  className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white leading-snug">{n.titulo}</p>
                      {n.descricao && (
                        <p className="text-xs text-slate-300 mt-1.5 leading-relaxed whitespace-pre-wrap">{n.descricao}</p>
                      )}
                      {n.arquivo_url && (
                        <a
                          href={n.arquivo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 mt-3 text-xs text-indigo-400 hover:text-indigo-300 bg-indigo-900/30 hover:bg-indigo-900/50 border border-indigo-800/50 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <AnexoIcon tipo={n.arquivo_tipo} />
                          <Download className="w-3.5 h-3.5" />
                          {n.arquivo_nome || 'Ver Anexo'}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40">
          <button
            onClick={onContinue}
            className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
          >
            Continuar para a plataforma <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
