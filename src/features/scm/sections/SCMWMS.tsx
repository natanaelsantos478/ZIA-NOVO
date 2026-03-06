import { useEffect, useState } from 'react';
import { Building, RefreshCw, AlertTriangle, Search } from 'lucide-react';
import { fetchDockSessions, SCMDockSession } from '../../../lib/scm';

const STATUS_LABEL: Record<string, string> = {
  scheduled:  'Agendado',
  in_progress:'Em andamento',
  completed:  'Concluído',
  cancelled:  'Cancelado',
};

const STATUS_COLOR: Record<string, string> = {
  scheduled:   'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed:   'bg-emerald-100 text-emerald-700',
  cancelled:   'bg-red-100 text-red-600',
};

const TYPE_LABEL: Record<string, string> = {
  inbound:    'Recebimento',
  outbound:   'Expedição',
  crossdock:  'Cross-Docking',
};

export default function SCMWMS() {
  const [sessions, setSessions] = useState<SCMDockSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchDockSessions()
      .then(setSessions)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" />
        <span className="ml-2 text-slate-500">Carregando docas...</span>
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

  const filtered = sessions.filter(s =>
    [s.vehicle_plate, s.carrier, s.type, String(s.dock_number)].some(f =>
      f?.toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Gestão de Docas (WMS)</h2>
          <p className="text-sm text-slate-500">{sessions.length} sessão(ões) de doca registrada(s)</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar doca, placa, transportadora..."
            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Building className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>{search ? 'Nenhuma doca encontrada.' : 'Nenhuma sessão de doca registrada.'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Doca</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Placa</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Transportadora</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Tipo</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Pallets</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Agendado</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-bold text-emerald-700">#{s.dock_number}</td>
                  <td className="px-4 py-3 font-mono text-slate-700">{s.vehicle_plate ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{s.carrier ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{TYPE_LABEL[s.type ?? ''] ?? s.type ?? '—'}</td>
                  <td className="px-4 py-3 text-center text-slate-600">{s.pallet_count ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {s.scheduled_at ? new Date(s.scheduled_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                  </td>
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
