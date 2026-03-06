import { useEffect, useState } from 'react';
import { RefreshCw as RefreshIcon, RefreshCw, AlertTriangle, Search } from 'lucide-react';
import { fetchReverseLogistics } from '../../../lib/scm';
import type { SCMReverseLogistic } from '../../../lib/scm';

const STATUS_LABEL: Record<string, string> = {
  open:       'Aberto',
  in_analysis:'Em análise',
  approved:   'Aprovado',
  rejected:   'Rejeitado',
  completed:  'Concluído',
};

const STATUS_COLOR: Record<string, string> = {
  open:        'bg-slate-100 text-slate-600',
  in_analysis: 'bg-amber-100 text-amber-700',
  approved:    'bg-blue-100 text-blue-700',
  rejected:    'bg-red-100 text-red-600',
  completed:   'bg-emerald-100 text-emerald-700',
};

const REFUND_LABEL: Record<string, string> = {
  credit:      'Crédito',
  replacement: 'Troca',
  refund:      'Reembolso',
};

export default function SCMReverse() {
  const [items, setItems] = useState<SCMReverseLogistic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchReverseLogistics()
      .then(setItems)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" />
        <span className="ml-2 text-slate-500">Carregando devoluções...</span>
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

  const filtered = items.filter(i =>
    [i.customer_name, i.customer_phone, i.reason, i.product_description, i.scm_shipments?.code].some(f =>
      f?.toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Logística Reversa</h2>
          <p className="text-sm text-slate-500">{items.length} devolução(ões) registrada(s)</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cliente, motivo..."
            className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <RefreshIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>{search ? 'Nenhuma devolução encontrada.' : 'Nenhuma devolução registrada.'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Embarque</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Cliente</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Produto</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Motivo</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Valor</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Tipo Reembolso</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(i => (
                <tr key={i.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{i.scm_shipments?.code ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{i.customer_name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs max-w-xs truncate">{i.product_description ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{i.reason ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-700 font-medium">
                    {i.value
                      ? i.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{REFUND_LABEL[i.refund_type ?? ''] ?? i.refund_type ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR[i.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {STATUS_LABEL[i.status] ?? i.status}
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
