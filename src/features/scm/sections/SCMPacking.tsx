import { useEffect, useState } from 'react';
import { Box, RefreshCw, AlertTriangle, Search } from 'lucide-react';
import { fetchPackingOrders } from '../../../lib/scm';
import type { SCMPackingOrder } from '../../../lib/scm';

const STATUS_LABEL: Record<string, string> = {
  pending:    'Pendente',
  in_progress:'Em andamento',
  packed:     'Embalado',
  shipped:    'Expedido',
};

const STATUS_COLOR: Record<string, string> = {
  pending:     'bg-slate-100 text-slate-600',
  in_progress: 'bg-amber-100 text-amber-700',
  packed:      'bg-blue-100 text-blue-700',
  shipped:     'bg-emerald-100 text-emerald-700',
};

export default function SCMPacking() {
  const [orders, setOrders] = useState<SCMPackingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchPackingOrders()
      .then(setOrders)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" />
        <span className="ml-2 text-slate-500">Carregando ordens de packing...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 gap-2 text-red-500">
        <AlertTriangle className="w-5 h-5" />
        <span>{error}</span>
      </div>
    );
  }

  const filtered = orders.filter(o =>
    [o.order_ref, o.packer_name, o.scm_shipments?.code].some(f =>
      f?.toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Embalagem e Packing</h2>
          <p className="text-sm text-slate-500">{orders.length} ordem(ns) de packing</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar ordem, embalador..."
            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Box className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>{search ? 'Nenhuma ordem encontrada.' : 'Nenhuma ordem de packing registrada.'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Ordem</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Embarque</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Itens</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Caixas</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Peso</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Embalador</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(o => (
                <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-slate-700">{o.order_ref ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{o.scm_shipments?.code ?? '—'}</td>
                  <td className="px-4 py-3 text-center text-slate-600">{o.items_count ?? '—'}</td>
                  <td className="px-4 py-3 text-center text-slate-600">{o.box_count ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {o.weight_kg ? `${o.weight_kg} kg` : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{o.packer_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR[o.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {STATUS_LABEL[o.status] ?? o.status}
                    </span>
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
