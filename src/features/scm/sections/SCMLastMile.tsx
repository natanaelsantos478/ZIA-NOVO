import { useEffect, useState } from 'react';
import { Navigation, RefreshCw, AlertTriangle, Search } from 'lucide-react';
import { fetchDeliveries, SCMDelivery } from '../../../lib/scm';

const STATUS_LABEL: Record<string, string> = {
  pending:    'Pendente',
  out:        'Saiu para entrega',
  delivered:  'Entregue',
  failed:     'Falha na entrega',
  returned:   'Devolvido',
};

const STATUS_COLOR: Record<string, string> = {
  pending:   'bg-slate-100 text-slate-600',
  out:       'bg-blue-100 text-blue-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  failed:    'bg-red-100 text-red-600',
  returned:  'bg-amber-100 text-amber-700',
};

export default function SCMLastMile() {
  const [deliveries, setDeliveries] = useState<SCMDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchDeliveries()
      .then(setDeliveries)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" />
        <span className="ml-2 text-slate-500">Carregando entregas...</span>
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

  const filtered = deliveries.filter(d =>
    [d.recipient_name, d.recipient_address, d.recipient_phone, d.scm_shipments?.code].some(f =>
      f?.toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Rastreamento Last-Mile</h2>
          <p className="text-sm text-slate-500">{deliveries.length} entrega(s) registrada(s)</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar destinatário, endereço..."
            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Navigation className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>{search ? 'Nenhuma entrega encontrada.' : 'Nenhuma entrega registrada.'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Embarque</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Destinatário</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Endereço</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Tentativas</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Agendado</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Entregue em</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(d => (
                <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{d.scm_shipments?.code ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{d.recipient_name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs max-w-xs truncate">{d.recipient_address ?? '—'}</td>
                  <td className="px-4 py-3 text-center text-slate-600">{d.attempts ?? 0}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {d.scheduled_date ? new Date(d.scheduled_date).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {d.delivered_at ? new Date(d.delivered_at).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR[d.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {STATUS_LABEL[d.status] ?? d.status}
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
