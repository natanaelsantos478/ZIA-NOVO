import { useEffect, useState } from 'react';
import { Route, RefreshCw, AlertTriangle, Search, MapPin } from 'lucide-react';
import { fetchRoutes, SCMRoute } from '../../../lib/scm';

const STATUS_LABEL: Record<string, string> = {
  planned:    'Planejada',
  active:     'Em andamento',
  completed:  'Concluída',
  cancelled:  'Cancelada',
};

const STATUS_COLOR: Record<string, string> = {
  planned:   'bg-blue-100 text-blue-700',
  active:    'bg-emerald-100 text-emerald-700',
  completed: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-red-100 text-red-600',
};

export default function SCMRouting() {
  const [routes, setRoutes] = useState<SCMRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchRoutes()
      .then(setRoutes)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" />
        <span className="ml-2 text-slate-500">Carregando rotas...</span>
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

  const filtered = routes.filter(r =>
    [r.name, r.origin, r.destination, r.scm_vehicles?.plate, r.scm_drivers?.name].some(f =>
      f?.toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Roteirização</h2>
          <p className="text-sm text-slate-500">{routes.length} rota(s) cadastrada(s)</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar rota, origem, destino..."
            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Route className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>{search ? 'Nenhuma rota encontrada.' : 'Nenhuma rota cadastrada.'}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(r => (
            <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-slate-800 truncate">{r.name}</span>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLOR[r.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-slate-500">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{r.origin ?? '—'} → {r.destination ?? '—'}</span>
                  </div>
                </div>
                <div className="text-right text-sm shrink-0">
                  {r.scheduled_date && (
                    <div className="text-slate-500 text-xs">
                      {new Date(r.scheduled_date).toLocaleDateString('pt-BR')}
                    </div>
                  )}
                  {r.distance_km && (
                    <div className="text-slate-600 font-medium">{r.distance_km} km</div>
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500 border-t border-slate-100 pt-3">
                <span>
                  <span className="font-medium text-slate-600">Veículo:</span>{' '}
                  {r.scm_vehicles?.plate ?? '—'}
                  {r.scm_vehicles?.model ? ` (${r.scm_vehicles.model})` : ''}
                </span>
                <span>
                  <span className="font-medium text-slate-600">Motorista:</span>{' '}
                  {r.scm_drivers?.name ?? '—'}
                </span>
                {r.estimated_duration_min && (
                  <span>
                    <span className="font-medium text-slate-600">Duração estimada:</span>{' '}
                    {Math.floor(r.estimated_duration_min / 60)}h{r.estimated_duration_min % 60}min
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
