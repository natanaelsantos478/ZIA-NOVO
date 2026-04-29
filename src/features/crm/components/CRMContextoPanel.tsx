import { Clock, MessageSquare, Mic, Target } from 'lucide-react';
import type { CRMContextoItem } from '../hooks/useCRMContexto';

interface Props {
  contexto: CRMContextoItem[];
}

const MODULO_CONFIG = {
  ia_crm: { label: 'IA CRM',                Icon: MessageSquare, cor: 'text-violet-600 bg-violet-50 border-violet-200' },
  escuta: { label: 'Escuta Inteligente',     Icon: Mic,           cor: 'text-blue-600 bg-blue-50 border-blue-200'   },
  leads:  { label: 'Inteligência de Leads',  Icon: Target,        cor: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
} as const;

function dataRelativa(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min  = Math.floor(diff / 60000);
  if (min < 1)   return 'agora';
  if (min < 60)  return `${min}min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24)   return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

export default function CRMContextoPanel({ contexto }: Props) {
  if (contexto.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8 text-slate-400">
        <Clock className="w-8 h-8 mb-2 opacity-40" />
        <p className="text-xs">Nenhuma interação registrada ainda.<br />As atividades das ferramentas de IA do CRM aparecerão aqui.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3 overflow-y-auto custom-scrollbar">
      {contexto.map(item => {
        const { label, Icon, cor } = MODULO_CONFIG[item.modulo];
        return (
          <div key={item.id} className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md border ${cor}`}>
                <Icon className="w-3 h-3" />
                {label}
              </span>
              <span className="text-[10px] text-slate-400 ml-auto">{dataRelativa(item.created_at)}</span>
            </div>
            <p className="text-xs font-semibold text-slate-700 mb-0.5 truncate">{item.titulo}</p>
            <p className="text-xs text-slate-500 line-clamp-2">{item.resumo}</p>
          </div>
        );
      })}
    </div>
  );
}
