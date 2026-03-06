import { useEffect, useState } from 'react';
import { Users, RefreshCw, AlertTriangle, Search } from 'lucide-react';
import { fetchDrivers, SCMDriver } from '../../../lib/scm';

const STATUS_LABEL: Record<string, string> = {
  active:   'Ativo',
  inactive: 'Inativo',
  on_leave: 'Afastado',
};

const STATUS_COLOR: Record<string, string> = {
  active:   'bg-emerald-100 text-emerald-700',
  inactive: 'bg-slate-100 text-slate-500',
  on_leave: 'bg-amber-100 text-amber-700',
};

function cnhExpiring(expiry: string | null): boolean {
  if (!expiry) return false;
  const days = (new Date(expiry).getTime() - Date.now()) / 86400000;
  return days < 30;
}

export default function SCMDrivers() {
  const [drivers, setDrivers] = useState<SCMDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchDrivers()
      .then(setDrivers)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" />
        <span className="ml-2 text-slate-500">Carregando motoristas...</span>
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

  const filtered = drivers.filter(d =>
    [d.name, d.cpf, d.cnh, d.phone].some(f =>
      f?.toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Motoristas</h2>
          <p className="text-sm text-slate-500">{drivers.length} motorista(s) cadastrado(s)</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar nome, CPF..."
            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>{search ? 'Nenhum motorista encontrado.' : 'Nenhum motorista cadastrado.'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Nome</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">CPF</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">CNH</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Categoria</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Vencimento CNH</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Telefone</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(d => (
                <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{d.name}</td>
                  <td className="px-4 py-3 text-slate-600 font-mono">{d.cpf ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600 font-mono">{d.cnh ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{d.cnh_category ?? '—'}</td>
                  <td className="px-4 py-3">
                    {d.cnh_expiry ? (
                      <span className={cnhExpiring(d.cnh_expiry) ? 'text-red-600 font-semibold' : 'text-slate-600'}>
                        {new Date(d.cnh_expiry).toLocaleDateString('pt-BR')}
                        {cnhExpiring(d.cnh_expiry) && ' ⚠'}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{d.phone ?? '—'}</td>
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
