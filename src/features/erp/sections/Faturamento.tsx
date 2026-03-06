import { useState, useEffect } from 'react';
import { Receipt, Search, FileText, CheckCircle, AlertCircle, Loader2, Eye, Download } from 'lucide-react';
import { getPedidos, updatePedidoStatus } from '../../../lib/erp';
import type { ErpPedido } from '../../../lib/erp';

const STATUS_BADGE: Record<string, string> = {
  RASCUNHO: 'bg-slate-100 text-slate-600',
  CONFIRMADO: 'bg-blue-100 text-blue-700',
  FATURADO: 'bg-green-100 text-green-700',
  CANCELADO: 'bg-red-100 text-red-600',
};

// Tela de Faturamento — integração com pedidos confirmados para emissão de NF-e
export default function Faturamento() {
  const [pedidos, setPedidos] = useState<ErpPedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [faturando, setFaturando] = useState<string | null>(null);

  useEffect(() => {
    getPedidos('VENDA', 'CONFIRMADO')
      .then(setPedidos)
      .finally(() => setLoading(false));
  }, []);

  function showToast(msg: string, ok: boolean) { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500); }

  async function handleFaturar(id: string) {
    setFaturando(id);
    try {
      await updatePedidoStatus(id, 'FATURADO');
      setPedidos(prev => prev.filter(p => p.id !== id));
      showToast('Pedido faturado. NF-e em homologação — configure a integração Focus NFe para emissão real.', true);
    } catch (e) {
      showToast('Erro: ' + (e as Error).message, false);
    } finally {
      setFaturando(null);
    }
  }

  const filtered = pedidos.filter(p =>
    p.erp_clientes?.nome.toLowerCase().includes(search.toLowerCase()) ||
    String(p.numero).includes(search)
  );

  return (
    <div className="p-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white max-w-sm ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {toast.msg}
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Receipt className="w-5 h-5 text-emerald-600" />
          <h1 className="text-xl font-bold text-slate-900">Faturamento</h1>
        </div>
        <p className="text-sm text-slate-500">Pedidos confirmados aguardando faturamento (emissão de NF-e)</p>
      </div>

      {/* Info box sobre NF-e */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-amber-800">Configuração de NF-e necessária</p>
          <p className="text-amber-700 mt-0.5">Para emissão real de NF-e, configure as credenciais Focus NFe / NFe.io em <strong>Administrativo → Empresas</strong>.
          O sistema utilizará a API para comunicação com a SEFAZ e armazenará o XML autorizado no banco.</p>
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Buscar por cliente ou número..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Pedido</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Cliente</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Data Emissão</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Cond. Pagto</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Total</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={7} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12">
                <FileText className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                <p className="text-slate-400">Nenhum pedido aguardando faturamento.</p>
              </td></tr>
            ) : filtered.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <span className="font-mono text-xs font-bold text-slate-700">#{p.numero}</span>
                </td>
                <td className="px-4 py-3 font-medium text-slate-800">{p.erp_clientes?.nome ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">{new Date(p.data_emissao + 'T00:00').toLocaleDateString('pt-BR')}</td>
                <td className="px-4 py-3 text-slate-600">{p.condicao_pagamento ?? '—'}</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-800">
                  {p.total_pedido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[p.status]}`}>{p.status}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors">
                      <Eye className="w-3.5 h-3.5" /> Ver
                    </button>
                    <button
                      onClick={() => handleFaturar(p.id)}
                      disabled={faturando === p.id}
                      className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-2.5 py-1 rounded text-xs font-medium transition-colors">
                      {faturando === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      Emitir NF-e
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
