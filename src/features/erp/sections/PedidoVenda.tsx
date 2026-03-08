import { useState, useEffect } from 'react';
import { ShoppingBag, Loader2, CheckCircle, AlertCircle, X, ArrowLeft, Eye } from 'lucide-react';
import { getPedidos, updatePedidoStatus, getPedidoItens } from '../../../lib/erp';
import type { ErpPedido, ErpPedidoItem } from '../../../lib/erp';
import PedidoVendaForm from './PedidoVendaForm';

type Aba = 'lista' | 'novo' | 'detalhe';

const STATUS_BADGE: Record<string, string> = {
  RASCUNHO: 'bg-slate-100 text-slate-600',
  CONFIRMADO: 'bg-blue-100 text-blue-700',
  FATURADO: 'bg-green-100 text-green-700',
  CANCELADO: 'bg-red-100 text-red-600',
};

export default function PedidoVenda() {
  const [aba, setAba] = useState<Aba>('lista');
  const [pedidos, setPedidos] = useState<ErpPedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [pedidoDetalhe, setPedidoDetalhe] = useState<ErpPedido | null>(null);
  const [itensDetalhe, setItensDetalhe] = useState<ErpPedidoItem[]>([]);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);

  function showToast(msg: string, ok: boolean) { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500); }

  function reloadPedidos() {
    setLoading(true);
    getPedidos('VENDA').then(setPedidos).finally(() => setLoading(false));
  }

  useEffect(() => { reloadPedidos(); }, []);

  async function abrirDetalhe(p: ErpPedido) {
    setLoadingDetalhe(true);
    setPedidoDetalhe(p);
    setAba('detalhe');
    try {
      const itens = await getPedidoItens(p.id);
      setItensDetalhe(itens);
    } catch { setItensDetalhe([]); }
    finally { setLoadingDetalhe(false); }
  }

  async function handleCancelar(id: string) {
    if (!confirm('Cancelar pedido?')) return;
    try { await updatePedidoStatus(id, 'CANCELADO'); reloadPedidos(); showToast('Pedido cancelado.', true); }
    catch (e) { showToast('Erro: ' + (e as Error).message, false); }
  }

  return (
    <div className="p-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Abas / navegação */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          {aba === 'detalhe' || aba === 'novo' ? (
            <button onClick={() => { setAba('lista'); reloadPedidos(); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white border border-slate-200 text-slate-600 hover:border-blue-300 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Voltar à Lista
            </button>
          ) : (
            <>
              <span className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white">Lista de Pedidos</span>
              <button onClick={() => setAba('novo')}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-slate-200 text-slate-600 hover:border-blue-300 transition-colors">
                + Novo Pedido
              </button>
            </>
          )}
        </div>
        {aba === 'lista' && <span className="text-sm text-slate-500">{pedidos.length} pedidos</span>}
        {aba === 'detalhe' && pedidoDetalhe && (
          <span className="text-sm text-slate-500 font-mono">#{pedidoDetalhe.numero}</span>
        )}
        {aba === 'novo' && <span className="text-sm text-slate-500">Novo Pedido de Venda</span>}
      </div>

      {/* ── Lista ──────────────────────────────────────────────────────────────── */}
      {aba === 'lista' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" /></div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Cliente</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Data</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Cond. Pgto</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Total</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pedidos.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10">
                    <ShoppingBag className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                    <p className="text-slate-400">Nenhum pedido. Clique em "+ Novo Pedido".</p>
                  </td></tr>
                ) : pedidos.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => abrirDetalhe(p)}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">#{p.numero}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{p.erp_clientes?.nome ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{new Date(p.data_emissao + 'T00:00').toLocaleDateString('pt-BR')}</td>
                    <td className="px-4 py-3 text-slate-600">{p.condicao_pagamento ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-medium">{p.total_pedido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[p.status]}`}>{p.status}</span>
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <button onClick={() => abrirDetalhe(p)} className="text-slate-400 hover:text-blue-600 transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                        {p.status !== 'CANCELADO' && (
                          <button onClick={() => handleCancelar(p.id)} className="text-slate-400 hover:text-red-600 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Novo Pedido ─────────────────────────────────────────────────────────── */}
      {aba === 'novo' && (
        <PedidoVendaForm
          onSaved={() => { reloadPedidos(); setAba('lista'); }}
          onCancel={() => setAba('lista')}
        />
      )}

      {/* ── Detalhe do Pedido ───────────────────────────────────────────────────── */}
      {aba === 'detalhe' && pedidoDetalhe && (
        <div className="space-y-5">
          {/* Info do pedido */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-700">Dados do Pedido</h3>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[pedidoDetalhe.status]}`}>{pedidoDetalhe.status}</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div><p className="text-xs text-slate-500 mb-0.5">Cliente</p><p className="font-medium text-slate-800">{pedidoDetalhe.erp_clientes?.nome ?? '—'}</p></div>
              <div><p className="text-xs text-slate-500 mb-0.5">Tipo</p><p className="font-medium text-slate-800">{pedidoDetalhe.tipo}</p></div>
              <div><p className="text-xs text-slate-500 mb-0.5">Data de Emissão</p><p className="font-medium text-slate-800">{new Date(pedidoDetalhe.data_emissao + 'T00:00').toLocaleDateString('pt-BR')}</p></div>
              <div><p className="text-xs text-slate-500 mb-0.5">Previsão de Entrega</p><p className="font-medium text-slate-800">{pedidoDetalhe.data_entrega_prevista ? new Date(pedidoDetalhe.data_entrega_prevista + 'T00:00').toLocaleDateString('pt-BR') : '—'}</p></div>
              <div><p className="text-xs text-slate-500 mb-0.5">Cond. de Pagamento</p><p className="font-medium text-slate-800">{pedidoDetalhe.condicao_pagamento ?? '—'}</p></div>
              <div><p className="text-xs text-slate-500 mb-0.5">Natureza de Operação</p><p className="font-medium text-slate-800">{pedidoDetalhe.natureza_operacao_texto ?? '—'}</p></div>
              <div><p className="text-xs text-slate-500 mb-0.5">Depósito</p><p className="font-medium text-slate-800">{pedidoDetalhe.deposito_texto ?? '—'}</p></div>
              <div><p className="text-xs text-slate-500 mb-0.5">Frete</p><p className="font-medium text-slate-800">{(pedidoDetalhe.frete_valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
              <div><p className="text-xs text-slate-500 mb-0.5">Desconto Global</p><p className="font-medium text-slate-800">{pedidoDetalhe.desconto_global_pct ?? 0}%</p></div>
              {pedidoDetalhe.pedido_compra && <div><p className="text-xs text-slate-500 mb-0.5">Ped. Compra / Ref.</p><p className="font-medium text-slate-800">{pedidoDetalhe.pedido_compra}</p></div>}
              {pedidoDetalhe.centro_custo && <div><p className="text-xs text-slate-500 mb-0.5">Centro de Custo</p><p className="font-medium text-slate-800">{pedidoDetalhe.centro_custo}</p></div>}
              {pedidoDetalhe.obs_interna && <div className="col-span-3"><p className="text-xs text-slate-500 mb-0.5">Obs. Interna</p><p className="text-slate-700">{pedidoDetalhe.obs_interna}</p></div>}
              {pedidoDetalhe.obs_nfe && <div className="col-span-3"><p className="text-xs text-slate-500 mb-0.5">Obs. NF-e</p><p className="text-slate-700">{pedidoDetalhe.obs_nfe}</p></div>}
            </div>
          </div>

          {/* Itens */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-4">Itens do Pedido</h3>
            {loadingDetalhe ? (
              <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" /></div>
            ) : itensDetalhe.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Nenhum item encontrado.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200">
                  <tr>
                    <th className="text-left pb-2 text-xs text-slate-500">Produto</th>
                    <th className="text-center pb-2 text-xs text-slate-500">UN</th>
                    <th className="text-right pb-2 text-xs text-slate-500">Qtd</th>
                    <th className="text-right pb-2 text-xs text-slate-500">Preço Unit.</th>
                    <th className="text-right pb-2 text-xs text-slate-500">Desc%</th>
                    <th className="text-center pb-2 text-xs text-slate-500">CFOP</th>
                    <th className="text-center pb-2 text-xs text-slate-500">CST</th>
                    <th className="text-right pb-2 text-xs text-slate-500">IPI%</th>
                    <th className="text-right pb-2 text-xs text-slate-500">Total Item</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {itensDetalhe.map(item => {
                    const prod = (item as unknown as { erp_produtos?: { nome: string; codigo_interno: string } }).erp_produtos;
                    return (
                      <tr key={item.id}>
                        <td className="py-2.5">
                          <div className="font-medium text-slate-800">{prod?.nome ?? item.produto_id}</div>
                          {item.descricao_item && item.descricao_item !== prod?.nome && (
                            <div className="text-xs text-slate-400 italic">{item.descricao_item}</div>
                          )}
                          <div className="text-xs text-slate-400">{prod?.codigo_interno ?? ''} · NCM {item.ncm ?? '—'}</div>
                        </td>
                        <td className="py-2.5 text-center text-slate-500">{item.unidade_medida ?? '—'}</td>
                        <td className="py-2.5 text-right text-slate-700">{item.quantidade}</td>
                        <td className="py-2.5 text-right text-slate-700">{item.preco_unitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        <td className="py-2.5 text-right text-slate-500">{item.desconto_item_pct}%</td>
                        <td className="py-2.5 text-center font-mono text-xs text-slate-600">{item.cfop ?? '—'}</td>
                        <td className="py-2.5 text-center font-mono text-xs text-slate-600">{item.cst_icms ?? '—'}</td>
                        <td className="py-2.5 text-right text-slate-500">{item.ipi_pct ?? 0}%</td>
                        <td className="py-2.5 text-right font-medium">{item.total_item.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t border-slate-200">
                  <tr>
                    <td colSpan={8} className="pt-3 text-right text-sm font-bold text-slate-700">Total do Pedido</td>
                    <td className="pt-3 text-right font-bold text-blue-600 text-base">{pedidoDetalhe.total_pedido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* Ações */}
          {pedidoDetalhe.status !== 'CANCELADO' && (
            <div className="flex gap-3">
              <button onClick={() => { handleCancelar(pedidoDetalhe.id); setAba('lista'); }}
                className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 transition-colors">
                <X className="w-4 h-4" /> Cancelar Pedido
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
