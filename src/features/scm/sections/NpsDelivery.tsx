import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Minus, TrendingUp, MessageSquare, Download, BarChart2 } from 'lucide-react';

interface NpsResponse {
  id: string;
  customer: string;
  carrier: string;
  orderId: string;
  score: number;
  category: 'Promotor' | 'Neutro' | 'Detrator';
  comment: string;
  deliveredAt: string;
  region: string;
}

const RESPONSES: NpsResponse[] = [
  { id: 'NPS-481', customer: 'João Alves',      carrier: 'Frota Própria', orderId: 'PED-12854', score: 10, category: 'Promotor', comment: 'Entregou antes do prazo! Motorista super atencioso. Embalagem perfeita.', deliveredAt: '05/03', region: 'SP' },
  { id: 'NPS-480', customer: 'Maria Santos',    carrier: 'Total Express', orderId: 'PED-12850', score: 9,  category: 'Promotor', comment: 'Ótimo serviço, entregou no horário combinado.', deliveredAt: '04/03', region: 'RJ' },
  { id: 'NPS-479', customer: 'Pedro Oliveira',  carrier: 'Correios',      orderId: 'PED-12843', score: 7,  category: 'Neutro',   comment: 'Chegou no prazo mas embalagem estava um pouco amassada.', deliveredAt: '03/03', region: 'MG' },
  { id: 'NPS-478', customer: 'Fernanda Lima',   carrier: 'Jadlog',        orderId: 'PED-12841', score: 4,  category: 'Detrator', comment: 'Atrasou 3 dias sem nenhuma comunicação. Tive que ligar várias vezes.', deliveredAt: '02/03', region: 'BA' },
  { id: 'NPS-477', customer: 'Carlos Mendes',   carrier: 'Frota Própria', orderId: 'PED-12838', score: 10, category: 'Promotor', comment: 'Perfeito! Continuem assim.', deliveredAt: '01/03', region: 'SP' },
  { id: 'NPS-476', customer: 'Juliana Ferreira', carrier: 'Jadlog',       orderId: 'PED-12835', score: 3,  category: 'Detrator', comment: 'Produto chegou com avaria. A caixa estava claramente danificada. Muito decepcionante.', deliveredAt: '28/02', region: 'SP' },
  { id: 'NPS-475', customer: 'Roberto Lima',    carrier: 'Total Express', orderId: 'PED-12830', score: 8,  category: 'Promotor', comment: 'Boa entrega. Rastreio funcionou bem.', deliveredAt: '27/02', region: 'SP' },
];

const CATEGORY_BADGE: Record<string, string> = {
  'Promotor': 'bg-emerald-100 text-emerald-700',
  'Neutro':   'bg-slate-100 text-slate-600',
  'Detrator': 'bg-red-100 text-red-700',
};

const SCORE_COLORS: Record<number, string> = {
  10: 'bg-emerald-500', 9: 'bg-emerald-400', 8: 'bg-teal-400', 7: 'bg-amber-300',
  6: 'bg-amber-400', 5: 'bg-orange-400', 4: 'bg-orange-500', 3: 'bg-red-500',
  2: 'bg-red-600', 1: 'bg-red-700',
};

const promotors = RESPONSES.filter((r) => r.category === 'Promotor').length;
const detractors = RESPONSES.filter((r) => r.category === 'Detrator').length;
const npsScore = Math.round(((promotors - detractors) / RESPONSES.length) * 100);

const NPS_BY_CARRIER = [
  { carrier: 'Frota Própria',  nps: 88, responses: 92  },
  { carrier: 'Total Express',  nps: 72, responses: 241 },
  { carrier: 'Braspress',      nps: 68, responses: 43  },
  { carrier: 'Jadlog',         nps: 52, responses: 198 },
  { carrier: 'Correios',       nps: 44, responses: 512 },
];

export default function NpsDelivery() {
  const [categoryFilter, setCategoryFilter] = useState('Todos');

  const CATEGORIES = ['Todos', 'Promotor', 'Neutro', 'Detrator'];

  const filtered = RESPONSES.filter((r) => categoryFilter === 'Todos' || r.category === categoryFilter);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">NPS Pós-entrega</h1>
          <p className="text-slate-500 text-sm mt-0.5">Pesquisa automática de satisfação enviada após confirmação de entrega</p>
        </div>
        <button className="flex items-center gap-2 border border-slate-200 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
          <Download className="w-4 h-4" />
          Exportar Respostas
        </button>
      </div>

      {/* NPS Score + breakdown */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm col-span-1">
          <div className="text-center">
            <div className={`text-5xl font-black mb-1 ${npsScore >= 70 ? 'text-emerald-600' : npsScore >= 30 ? 'text-amber-600' : 'text-red-600'}`}>
              {npsScore}
            </div>
            <div className="text-sm text-slate-500 font-medium">NPS Logístico</div>
            <div className="flex items-center justify-center gap-1 mt-2">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-xs text-emerald-600">+4 pts vs mês ant.</span>
            </div>
          </div>
        </div>
        {[
          { label: 'Promotores (9-10)', value: promotors, icon: ThumbsUp,   color: 'emerald', pct: Math.round((promotors / RESPONSES.length) * 100) },
          { label: 'Neutros (7-8)',     value: RESPONSES.filter((r) => r.category === 'Neutro').length, icon: Minus, color: 'slate', pct: Math.round((RESPONSES.filter((r) => r.category === 'Neutro').length / RESPONSES.length) * 100) },
          { label: 'Detratores (0-6)',  value: detractors, icon: ThumbsDown, color: 'red',    pct: Math.round((detractors / RESPONSES.length) * 100) },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 bg-${s.color}-50`}>
                <Icon className={`w-4 h-4 text-${s.color}-600`} />
              </div>
              <div className="text-2xl font-bold text-slate-800">{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
              <div className={`text-xs font-bold mt-1 text-${s.color}-600`}>{s.pct}%</div>
            </div>
          );
        })}
      </div>

      {/* NPS by carrier */}
      <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <BarChart2 className="w-4 h-4 text-emerald-600" />
          <h2 className="font-semibold text-slate-800">NPS por Transportadora</h2>
        </div>
        <div className="space-y-3">
          {NPS_BY_CARRIER.map((c) => (
            <div key={c.carrier} className="flex items-center gap-4">
              <span className="text-sm text-slate-700 w-32 flex-shrink-0">{c.carrier}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${c.nps >= 70 ? 'bg-emerald-500' : c.nps >= 30 ? 'bg-amber-400' : 'bg-red-500'}`}
                  style={{ width: `${c.nps}%` }}
                />
              </div>
              <span className={`text-sm font-bold w-10 ${c.nps >= 70 ? 'text-emerald-600' : c.nps >= 30 ? 'text-amber-600' : 'text-red-600'}`}>{c.nps}</span>
              <span className="text-xs text-slate-500 w-20 text-right">{c.responses} respostas</span>
            </div>
          ))}
        </div>
      </div>

      {/* Filter + responses */}
      <div className="flex items-center gap-2 mb-4">
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCategoryFilter(c)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${categoryFilter === c ? 'bg-emerald-600 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{c}</button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((r) => (
          <div key={r.id} className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0 ${SCORE_COLORS[r.score] ?? 'bg-slate-400'}`}>
                {r.score}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-medium text-slate-800">{r.customer}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_BADGE[r.category]}`}>{r.category}</span>
                  <span className="text-xs text-slate-500 ml-auto">{r.carrier} · {r.orderId} · {r.deliveredAt}</span>
                </div>
                {r.comment && (
                  <div className="flex items-start gap-2 mt-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-600 italic">"{r.comment}"</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
