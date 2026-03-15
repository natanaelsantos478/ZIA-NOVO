// ERP — Agrupamento de ORCs Abertos (orçamentos/propostas em aberto agrupados por critério)
import { useState } from 'react';
import { ClipboardList, ChevronDown, ChevronRight, Filter } from 'lucide-react';

interface Orc {
  id: string;
  numero: string;
  cliente: string;
  vendedor: string;
  produto: string;
  valor: number;
  dataCriacao: string;
  diasAberto: number;
  probabilidade: 'ALTA' | 'MEDIA' | 'BAIXA';
}

const ORCS: Orc[] = [
  { id: '1', numero: 'ORC-0041', cliente: 'Empresa Alpha', vendedor: 'Carlos V.', produto: 'ERP Full Suite', valor: 68000, dataCriacao: '2026-02-15', diasAberto: 28, probabilidade: 'ALTA' },
  { id: '2', numero: 'ORC-0042', cliente: 'Tech Beta', vendedor: 'Ana S.', produto: 'Módulo Logística', valor: 22000, dataCriacao: '2026-02-20', diasAberto: 23, probabilidade: 'MEDIA' },
  { id: '3', numero: 'ORC-0043', cliente: 'Indústria Sul', vendedor: 'Carlos V.', produto: 'Implantação RH', valor: 35000, dataCriacao: '2026-02-22', diasAberto: 21, probabilidade: 'ALTA' },
  { id: '4', numero: 'ORC-0044', cliente: 'Grupo Delta', vendedor: 'Pedro T.', produto: 'Suporte Premium', valor: 18000, dataCriacao: '2026-03-01', diasAberto: 14, probabilidade: 'MEDIA' },
  { id: '5', numero: 'ORC-0045', cliente: 'Comércio Norte', vendedor: 'Ana S.', produto: 'ERP Básico', valor: 28000, dataCriacao: '2026-03-05', diasAberto: 10, probabilidade: 'ALTA' },
  { id: '6', numero: 'ORC-0046', cliente: 'Varejo Sul ME', vendedor: 'Pedro T.', produto: 'Consultoria', valor: 12000, dataCriacao: '2026-03-08', diasAberto: 7, probabilidade: 'BAIXA' },
  { id: '7', numero: 'ORC-0047', cliente: 'Indústria Norte', vendedor: 'Carlos V.', produto: 'Módulo CRM', valor: 18000, dataCriacao: '2026-03-10', diasAberto: 5, probabilidade: 'MEDIA' },
  { id: '8', numero: 'ORC-0048', cliente: 'Distribuidora Leste', vendedor: 'Ricardo F.', produto: 'ERP Full Suite', valor: 72000, dataCriacao: '2026-03-12', diasAberto: 3, probabilidade: 'ALTA' },
];

type AgrupadorKey = 'vendedor' | 'produto' | 'probabilidade' | 'faixa_dias';

const AGRUPADORES: { key: AgrupadorKey; label: string }[] = [
  { key: 'vendedor', label: 'Vendedor' },
  { key: 'produto', label: 'Produto' },
  { key: 'probabilidade', label: 'Probabilidade' },
  { key: 'faixa_dias', label: 'Dias em Aberto' },
];

const PROB_BADGE: Record<string, string> = {
  ALTA: 'bg-green-100 text-green-700',
  MEDIA: 'bg-yellow-100 text-yellow-700',
  BAIXA: 'bg-red-100 text-red-700',
};

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function getGroupKey(orc: Orc, ag: AgrupadorKey): string {
  if (ag === 'vendedor') return orc.vendedor;
  if (ag === 'produto') return orc.produto;
  if (ag === 'probabilidade') return orc.probabilidade;
  if (ag === 'faixa_dias') {
    if (orc.diasAberto <= 7) return '0-7 dias';
    if (orc.diasAberto <= 15) return '8-15 dias';
    if (orc.diasAberto <= 30) return '16-30 dias';
    return 'Acima de 30 dias';
  }
  return '';
}

export default function AgrupamentoOrcs() {
  const [agrupador, setAgrupador] = useState<AgrupadorKey>('vendedor');
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set(['Carlos V.', 'Ana S.', 'Pedro T.', 'Ricardo F.']));
  const [busca, setBusca] = useState('');

  const filtrados = ORCS.filter(o =>
    o.numero.toLowerCase().includes(busca.toLowerCase()) ||
    o.cliente.toLowerCase().includes(busca.toLowerCase()) ||
    o.produto.toLowerCase().includes(busca.toLowerCase()),
  );

  // Agrupar
  const grupos = filtrados.reduce((acc, orc) => {
    const key = getGroupKey(orc, agrupador);
    if (!acc[key]) acc[key] = [];
    acc[key].push(orc);
    return acc;
  }, {} as Record<string, Orc[]>);

  function toggleGrupo(key: string) {
    setExpandidos(prev => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });
  }

  const totalGeral = filtrados.reduce((s, o) => s + o.valor, 0);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-emerald-600" /> Agrupamento de ORCs Abertos
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Orçamentos em aberto organizados por critério selecionado</p>
        </div>
        <div className="text-right text-sm">
          <div className="font-bold text-slate-900">{BRL(totalGeral)}</div>
          <div className="text-slate-400">{filtrados.length} orçamentos abertos</div>
        </div>
      </div>

      {/* Controles */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <input
            className="w-full pl-3 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Buscar ORC, cliente, produto…"
            value={busca} onChange={e => setBusca(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2">
          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <span className="text-xs text-slate-500 whitespace-nowrap">Agrupar por:</span>
          <div className="flex gap-1">
            {AGRUPADORES.map(ag => (
              <button
                key={ag.key}
                onClick={() => setAgrupador(ag.key)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${agrupador === ag.key ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {ag.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grupos */}
      <div className="space-y-3">
        {Object.entries(grupos).map(([key, orcs]) => {
          const totalGrupo = orcs.reduce((s, o) => s + o.valor, 0);
          const isOpen = expandidos.has(key);
          return (
            <div key={key} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors"
                onClick={() => toggleGrupo(key)}
              >
                <div className="flex items-center gap-3">
                  {isOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                  <span className="font-semibold text-slate-800">{key}</span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs">{orcs.length} ORCs</span>
                </div>
                <span className="font-bold text-emerald-700">{BRL(totalGrupo)}</span>
              </button>

              {isOpen && (
                <div className="border-t border-slate-100">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        {['Número', 'Cliente', agrupador !== 'vendedor' ? 'Vendedor' : 'Produto', 'Valor', 'Dias Aberto', 'Probabilidade'].map(h => (
                          <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-slate-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {orcs.map(o => (
                        <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-2.5 font-mono text-xs font-bold text-slate-700">{o.numero}</td>
                          <td className="px-4 py-2.5 text-slate-700">{o.cliente}</td>
                          <td className="px-4 py-2.5 text-slate-600">{agrupador !== 'vendedor' ? o.vendedor : o.produto}</td>
                          <td className="px-4 py-2.5 font-semibold text-slate-800">{BRL(o.valor)}</td>
                          <td className="px-4 py-2.5">
                            <span className={`text-xs font-medium ${o.diasAberto > 20 ? 'text-orange-600' : o.diasAberto > 10 ? 'text-yellow-600' : 'text-slate-600'}`}>
                              {o.diasAberto}d
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PROB_BADGE[o.probabilidade]}`}>{o.probabilidade}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-slate-200 bg-slate-50">
                      <tr>
                        <td colSpan={3} className="px-4 py-2 text-xs font-semibold text-slate-500">Subtotal</td>
                        <td className="px-4 py-2 font-bold text-emerald-700">{BRL(totalGrupo)}</td>
                        <td colSpan={2} className="px-4 py-2 text-xs text-slate-400">Média: {Math.round(orcs.reduce((s, o) => s + o.diasAberto, 0) / orcs.length)}d abertos</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          );
        })}

        {Object.keys(grupos).length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-8 text-center text-slate-400">
            Nenhum orçamento encontrado
          </div>
        )}
      </div>
    </div>
  );
}
