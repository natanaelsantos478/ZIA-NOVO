import { useState, useEffect } from 'react';
import { Search, ShoppingBag, Loader2, FileText } from 'lucide-react';
import { getPedidos } from '../../../lib/erp';
import type { ErpPedido } from '../../../lib/erp';

const STATUS_BADGE: Record<string, string> = {
  RASCUNHO: 'bg-slate-100 text-slate-600',
  CONFIRMADO: 'bg-blue-100 text-blue-700',
  FATURADO: 'bg-green-100 text-green-700',
  CANCELADO: 'bg-red-100 text-red-600',
};

export default function PedidosClientes() {
  const [pedidos, setPedidos] = useState<ErpPedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFiltro, setStatusFiltro] = useState<string>('');

  useEffect(() => {
    getPedidos('VENDA', statusFiltro || undefined).then(setPedidos).finally(() => setLoading(false));
  }, [statusFiltro]);

  const filtered = pedidos.filter(p =>
    !search ||
    p.erp_clientes?.nome.toLowerCase().includes(search.toLowerCase()) ||
    String(p.numero).includes(search)
  );

  const totalValor = filtered.reduce((s, p) => s + p.total_pedido, 0);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Pedidos de Clientes</h1>
        <p className="text-sm text-slate-500">{filtered.length} pedidos · Total: {totalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Buscar cliente ou número..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="RASCUNHO">Rascunho</option>
          <option value="CONFIRMADO">Confirmado</option>
          <option value="FATURADO">Faturado</option>
          <option value="CANCELADO">Cancelado</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">#</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Cliente</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Emissão</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Entrega Prevista</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Cond. Pagto</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Total</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12">
                <ShoppingBag className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                <p className="text-slate-400">Nenhum pedido encontrado.</p>
              </td></tr>
            ) : filtered.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs font-bold text-slate-600">#{p.numero}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{p.erp_clientes?.nome ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">{new Date(p.data_emissao + 'T00:00').toLocaleDateString('pt-BR')}</td>
                <td className="px-4 py-3 text-slate-600">
                  {p.data_entrega_prevista ? new Date(p.data_entrega_prevista + 'T00:00').toLocaleDateString('pt-BR') : '—'}
                </td>
                <td className="px-4 py-3 text-slate-600">{p.condicao_pagamento ?? '—'}</td>
                <td className="px-4 py-3 text-right font-semibold">{p.total_pedido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[p.status]}`}>{p.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
