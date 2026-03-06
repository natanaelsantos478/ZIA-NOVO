import { useEffect, useState } from 'react';
import { Truck, RefreshCw, AlertTriangle, Search } from 'lucide-react';
import { fetchVehicles } from '../../../lib/scm';
import type { SCMVehicle } from '../../../lib/scm';

const STATUS_LABEL: Record<string, string> = {
  available:    'Disponível',
  in_use:       'Em uso',
  maintenance:  'Manutenção',
  inactive:     'Inativo',
};

const STATUS_COLOR: Record<string, string> = {
  available:   'bg-emerald-100 text-emerald-700',
  in_use:      'bg-blue-100 text-blue-700',
  maintenance: 'bg-amber-100 text-amber-700',
  inactive:    'bg-slate-100 text-slate-500',
};

export default function SCMFleet() {
  const [vehicles, setVehicles] = useState<SCMVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchVehicles()
      .then(setVehicles)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" />
        <span className="ml-2 text-slate-500">Carregando frota...</span>
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

  const filtered = vehicles.filter(v =>
    [v.plate, v.model, v.brand, v.type].some(f =>
      f?.toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Gestão de Frota</h2>
          <p className="text-sm text-slate-500">{vehicles.length} veículo(s) cadastrado(s)</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar placa, modelo..."
            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Truck className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>{search ? 'Nenhum veículo encontrado.' : 'Nenhum veículo cadastrado.'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Placa</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Veículo</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Tipo</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Capacidade</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Km</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Próx. Manutenção</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(v => (
                <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-slate-800">{v.plate}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {[v.brand, v.model, v.year].filter(Boolean).join(' ')}
                  </td>
                  <td className="px-4 py-3 text-slate-600 capitalize">{v.type}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {v.capacity_kg ? `${v.capacity_kg.toLocaleString('pt-BR')} kg` : '—'}
                    {v.capacity_m3 ? ` / ${v.capacity_m3} m³` : ''}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {v.mileage_km ? `${v.mileage_km.toLocaleString('pt-BR')} km` : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {v.next_maintenance
                      ? new Date(v.next_maintenance).toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR[v.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {STATUS_LABEL[v.status] ?? v.status}
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
