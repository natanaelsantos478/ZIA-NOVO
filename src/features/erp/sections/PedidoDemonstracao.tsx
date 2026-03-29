// ERP — Pedido de Demonstração — conectado ao banco (tipo=DEMONSTRACAO)
import { useState, useEffect } from 'react';
import { Package, Loader2, CheckCircle, AlertCircle, Search, X } from 'lucide-react';
import { getPedidos, updatePedidoStatus } from '../../../lib/erp';
import type { ErpPedido } from '../../../lib/erp';

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const STATUS_BADGE: Record<string, string> = {
  RASCUNHO:   'bg-slate-100 text-slate-600',
  CONFIRMADO: 'bg-blue-100 text-blue-700',
  FATURADO:   'bg-green-100 text-green-700',
  CANCELADO:  'bg-red-100 text-red-600',
  REALIZADO:  'bg-emerald-100 text-emerald-700',
};

const STATUS_LABEL: Record<string, string> = {
  RASCUNHO:   'Em Aberto',
  CONFIRMADO: 'Ativo',
  FATURADO:   'Convertido',
  CANCELADO:  'Encerrado',
  REALIZADO:  'Devolvido',
};

export default function PedidoDemonstracao() {
  const [pedidos, setPedidos] = useState<ErpPedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast]     = useState<{ msg: string; ok: boolean } | null>(null);
  const [search, setSearch]   = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [atualizando, setAtualizando]   = useState<string | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function load() {
    try { setPedidos(await getPedidos('DEMONSTRACAO')); }
    catch (e) { showToast('Erro: ' + (e as Error).message, false); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleStatus(id: string, novoStatus: ErpPedido['status']) {
    setAtualizando(id);
    try {
      await updatePedidoStatus(id, novoStatus);
      showToast('Status atualizado.', true);
      load();
    } catch (e) { showToast('Erro: ' + (e as Error).message, false); }
    finally { setAtualizando(null); }
  }

  const filtered = pedidos.filter(p => {
    if (statusFilter !== 'TODOS' && p.status !== statusFilter) return false;
    if (search) {
      const cliente = (p.erp_clientes?.nome ?? '').toLowerCase();
      if (!cliente.includes(search.toLowerCase()) && !String(p.numero).includes(search)) return false;
    }
    return true;
  });

  const ativos      = pedidos.filter(p => p.status === 'CONFIRMADO').length;
  const convertidos = pedidos.filter(p => p.status === 'FATURADO').length;

  return (
    <div className="p-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Package className="w-5 h-5 text-indigo-600" />
          <h1 className="text-xl font-bold text-slate-900">Pedidos de Demonstração</h1>
        </div>
        <p className="text-sm text-slate-500">Produtos enviados para avaliação de clientes</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500 mb-1">Demos Ativas</div>
          <div className="text-lg font-bold text-blue-600">{ativos}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500 mb-1">Convertidas em Venda</div>
          <div className="text-lg font-bold text-green-600">{convertidos}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500 mb-1">Taxa de Conversão</div>
          <div className="text-lg font-bold text-slate-700">
            {pedidos.length > 0 ? ((convertidos / pedidos.length) * 100).toFixed(0) + '%' : '—'}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Buscar cliente ou nº…" value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X className="w-3.5 h-3.5" /></button>}
        </div>
        <div className="flex gap-1">
          {['TODOS', 'RASCUNHO', 'CONFIRMADO', 'FATURADO', 'CANCELADO'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {s === 'TODOS' ? 'Todos' : STATUS_LABEL[s] ?? s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex justify-between">
          <span className="text-sm font-semibold text-slate-700">Demonstrações</span>
          <span className="text-xs text-slate-400">{filtered.length} registro(s)</span>
        </div>
        {loading ? (
          <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Nº</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Cliente</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Data</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Valor</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-slate-400">Nenhuma demonstração encontrada.</td></tr>
                ) : filtered.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">DEM-{String(p.numero).padStart(4, '0')}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{p.erp_clientes?.nome ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{new Date(p.data_emissao + 'T00:00').toLocaleDateString('pt-BR')}</td>
                    <td className="px-4 py-3 text-right font-semibold text-indigo-600">{BRL(p.total_pedido)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[p.status]}`}>
                        {STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.status === 'RASCUNHO' && (
                        <button onClick={() => handleStatus(p.id, 'CONFIRMADO')} disabled={atualizando === p.id}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors disabled:opacity-50">
                          Ativar
                        </button>
                      )}
                      {p.status === 'CONFIRMADO' && (
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => handleStatus(p.id, 'FATURADO')} disabled={atualizando === p.id}
                            className="text-xs text-green-600 hover:text-green-800 font-medium transition-colors disabled:opacity-50">
                            Converter
                          </button>
                          <button onClick={() => handleStatus(p.id, 'REALIZADO')} disabled={atualizando === p.id}
                            className="text-xs text-slate-500 hover:text-slate-700 font-medium transition-colors disabled:opacity-50">
                            Devolver
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
