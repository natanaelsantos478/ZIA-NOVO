import { useEffect, useState } from 'react';
import { Package, RefreshCw, AlertTriangle, Search } from 'lucide-react';
import { fetchShipments, SCMShipment } from '../../../lib/scm';

const STATUS_LABEL: Record<string, string> = {
  pending:    'Pendente',
  in_transit: 'Em trânsito',
  delivered:  'Entregue',
  cancelled:  'Cancelado',
  returned:   'Devolvido',
};

const STATUS_COLOR: Record<string, string> = {
  pending:    'bg-slate-100 text-slate-600',
  in_transit: 'bg-blue-100 text-blue-700',
  delivered:  'bg-emerald-100 text-emerald-700',
  cancelled:  'bg-red-100 text-red-600',
  returned:   'bg-amber-100 text-amber-700',
};

export default function SCMTMS() {
  const [shipments, setShipments] = useState<SCMShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchShipments()
      .then(setShipments)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" />
        <span className="ml-2 text-slate-500">Carregando embarques...</span>
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

  const filtered = shipments.filter(s =>
    [s.code, s.origin, s.destination, s.carrier, s.tracking_code].some(f =>
      f?.toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">TMS — Fretes e Embarques</h2>
          <p className="text-sm text-slate-500">{shipments.length} embarque(s) registrado(s)</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar código, transportadora..."
            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>{search ? 'Nenhum embarque encontrado.' : 'Nenhum embarque registrado.'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Código</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Origem → Destino</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Transportadora</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Frete</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Previsão</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Rastreio</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-slate-800">{s.code}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    {s.origin ?? '—'}<br /><span className="text-slate-400">→ {s.destination ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{s.carrier ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-700 font-medium">
                    {s.freight_value
                      ? s.freight_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {s.estimated_delivery
                      ? new Date(s.estimated_delivery).toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.tracking_code ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR[s.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {STATUS_LABEL[s.status] ?? s.status}
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
