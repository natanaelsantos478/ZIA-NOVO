// ─────────────────────────────────────────────────────────────────────────────
// Finalizados — Atendimentos resolvidos e fechados
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { Search, Star, CheckCircle2, XCircle } from 'lucide-react';
import { MOCK_ATENDIMENTOS } from '../mockData';

const STATUS_BADGE: Record<string, string> = {
  RESOLVIDO:  'bg-green-100 text-green-700',
  FECHADO:    'bg-slate-100 text-slate-600',
  CANCELADO:  'bg-red-100 text-red-600',
};

const PRIO_COLOR: Record<string, string> = {
  BAIXA: 'bg-slate-100 text-slate-500', MEDIA: 'bg-blue-100 text-blue-700',
  ALTA: 'bg-amber-100 text-amber-700', CRITICA: 'bg-red-100 text-red-700', URGENTE: 'bg-red-600 text-white',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  RESOLVIDO: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  FECHADO:   <CheckCircle2 className="w-4 h-4 text-slate-400" />,
  CANCELADO: <XCircle className="w-4 h-4 text-red-400" />,
};

function Stars({ n }: { n: number | null }) {
  if (n === null) return <span className="text-xs text-slate-400">—</span>;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`w-3.5 h-3.5 ${i <= n ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
      ))}
    </div>
  );
}

export default function Finalizados() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('TODOS');

  const finalizados = MOCK_ATENDIMENTOS.filter(a =>
    ['RESOLVIDO', 'FECHADO', 'CANCELADO'].includes(a.status)
  );

  const filtered = finalizados.filter(a => {
    const ms = a.titulo.toLowerCase().includes(search.toLowerCase()) ||
      a.solicitante_nome.toLowerCase().includes(search.toLowerCase()) ||
      a.numero.toLowerCase().includes(search.toLowerCase());
    const mf = filterStatus === 'TODOS' || a.status === filterStatus;
    return ms && mf;
  }).sort((a, b) =>
    new Date(b.data_fechamento ?? b.updated_at).getTime() -
    new Date(a.data_fechamento ?? a.updated_at).getTime()
  );

  const satisfMedia = (() => {
    const c = finalizados.filter(a => a.satisfacao !== null);
    if (!c.length) return null;
    return (c.reduce((s, a) => s + (a.satisfacao ?? 0), 0) / c.length).toFixed(1);
  })();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Finalizados</h1>
          <p className="text-sm text-slate-500">{finalizados.length} atendimentos encerrados</p>
        </div>
        {satisfMedia && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span className="text-sm font-bold text-amber-700">{satisfMedia}</span>
            <span className="text-xs text-amber-600">Satisfação média</span>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="TODOS">Todos</option>
          <option value="RESOLVIDO">Resolvido</option>
          <option value="FECHADO">Fechado</option>
          <option value="CANCELADO">Cancelado</option>
        </select>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400">Nenhum atendimento encontrado.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Número</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Título</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Solicitante</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Prioridade</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Fechamento</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Satisfação</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{a.numero}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800 max-w-xs truncate">{a.titulo}</div>
                    {a.feedback && <div className="text-xs text-slate-400 italic truncate max-w-xs">"{a.feedback}"</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{a.solicitante_nome}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{a.tipo.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIO_COLOR[a.prioridade]}`}>{a.prioridade}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {STATUS_ICON[a.status]}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[a.status]}`}>{a.status}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {a.data_fechamento ? new Date(a.data_fechamento).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Stars n={a.satisfacao} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
