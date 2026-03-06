import { useEffect, useState } from 'react';
import { FileSearch, RefreshCw, AlertTriangle, Search } from 'lucide-react';
import { fetchFreightAudits } from '../../../lib/scm';
import type { SCMFreightAudit } from '../../../lib/scm';

const STATUS_LABEL: Record<string, string> = {
  pending:  'Pendente',
  disputed: 'Em disputa',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
};

const STATUS_COLOR: Record<string, string> = {
  pending:  'bg-slate-100 text-slate-600',
  disputed: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-600',
};

export default function SCMAudit() {
  const [audits, setAudits] = useState<SCMFreightAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchFreightAudits()
      .then(setAudits)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin" />
        <span className="ml-2 text-slate-500">Carregando auditorias...</span>
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

  const filtered = audits.filter(a =>
    [a.carrier, a.dispute_reason, a.scm_shipments?.code, a.status].some(f =>
      f?.toLowerCase().includes(search.toLowerCase())
    )
  );

  const totalDiscrepancy = filtered.reduce((sum, a) => sum + (a.discrepancy ?? 0), 0);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Auditoria de Fretes</h2>
          <p className="text-sm text-slate-500">{audits.length} auditoria(s) registrada(s)</p>
        </div>
        <div className="flex items-center gap-4">
          {totalDiscrepancy !== 0 && (
            <div className={`text-sm font-semibold px-3 py-1.5 rounded-lg ${totalDiscrepancy > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
              Discrepância total: {totalDiscrepancy.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar transportadora..."
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <FileSearch className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>{search ? 'Nenhuma auditoria encontrada.' : 'Nenhuma auditoria de frete registrada.'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Embarque</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Transportadora</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Valor Cobrado</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Valor Acordado</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Discrepância</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Motivo Disputa</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(a => (
                <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{a.scm_shipments?.code ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{a.carrier ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {a.billed_value?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {a.agreed_value?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? '—'}
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${(a.discrepancy ?? 0) > 0 ? 'text-red-600' : (a.discrepancy ?? 0) < 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {a.discrepancy != null
                      ? a.discrepancy.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{a.dispute_reason ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR[a.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {STATUS_LABEL[a.status] ?? a.status}
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
