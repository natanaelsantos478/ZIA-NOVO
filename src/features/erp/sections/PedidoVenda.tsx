import { useState, useEffect } from 'react';
import { Plus, Search, Trash2, ShoppingBag, Loader2, CheckCircle, AlertCircle, X, ArrowLeft, Eye } from 'lucide-react';
import { getClientes, getProdutos, createPedido, getPedidos, updatePedidoStatus, getPedidoItens } from '../../../lib/erp';
import type { ErpCliente, ErpProduto, ErpPedido, ErpPedidoItem } from '../../../lib/erp';

interface ItemCarrinho {
  produto: ErpProduto;
  quantidade: number;
  preco_unitario: number;
  desconto_item_pct: number;
}

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
  const [clientes, setClientes] = useState<ErpCliente[]>([]);
  const [produtos, setProdutos] = useState<ErpProduto[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [pedidoDetalhe, setPedidoDetalhe] = useState<ErpPedido | null>(null);
  const [itensDetalhe, setItensDetalhe] = useState<ErpPedidoItem[]>([]);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);

  // Form state
  const [clienteId, setClienteId] = useState('');
  const [clienteSearch, setClienteSearch] = useState('');
  const [dataEmissao, setDataEmissao] = useState(new Date().toISOString().split('T')[0]);
  const [dataEntrega, setDataEntrega] = useState('');
  const [condicao, setCondicao] = useState('À Vista');
  const [freteValor, setFreteValor] = useState('0');
  const [descontoGlobal, setDescontoGlobal] = useState('0');
  const [observacoes, setObservacoes] = useState('');
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [prodSearch, setProdSearch] = useState('');
  const [showProdList, setShowProdList] = useState(false);

  function showToast(msg: string, ok: boolean) { setToast({ msg, ok }); setTimeout(() => setToast(null), 3500); }

  useEffect(() => {
    Promise.all([
      getPedidos('VENDA').then(setPedidos),
      getClientes().then(setClientes),
      getProdutos().then(setProdutos),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (prodSearch) getProdutos(prodSearch).then(setProdutos).catch(() => {});
  }, [prodSearch]);

  const totalProdutos = itens.reduce((s, i) => s + i.quantidade * i.preco_unitario * (1 - i.desconto_item_pct / 100), 0);
  const totalPedido = totalProdutos + (+freteValor || 0) - (totalProdutos * (+descontoGlobal || 0) / 100);

  function addProduto(p: ErpProduto) {
    const existing = itens.find(i => i.produto.id === p.id);
    if (existing) {
      setItens(prev => prev.map(i => i.produto.id === p.id ? { ...i, quantidade: i.quantidade + 1 } : i));
    } else {
      setItens(prev => [...prev, { produto: p, quantidade: 1, preco_unitario: p.preco_venda, desconto_item_pct: 0 }]);
    }
    setShowProdList(false);
    setProdSearch('');
  }

  function removeItem(id: string) {
    setItens(prev => prev.filter(i => i.produto.id !== id));
  }

  function updateItem(id: string, field: keyof ItemCarrinho, value: unknown) {
    setItens(prev => prev.map(i => i.produto.id === id ? { ...i, [field]: value } : i));
  }

  async function handleSave(status: 'RASCUNHO' | 'CONFIRMADO') {
    if (!clienteId) return showToast('Selecione um cliente.', false);
    if (itens.length === 0) return showToast('Adicione pelo menos um produto.', false);
    setSaving(true);
    try {
      await createPedido(
        {
          tipo: 'VENDA',
          status,
          cliente_id: clienteId,
          vendedor_id: null,
          data_emissao: dataEmissao,
          data_entrega_prevista: dataEntrega || null,
          condicao_pagamento: condicao,
          desconto_global_pct: +descontoGlobal || 0,
          frete_valor: +freteValor || 0,
          total_produtos: totalProdutos,
          total_pedido: totalPedido,
          observacoes: observacoes || null,
        },
        itens.map(i => ({
          produto_id: i.produto.id,
          quantidade: i.quantidade,
          preco_unitario: i.preco_unitario,
          desconto_item_pct: i.desconto_item_pct,
          total_item: i.quantidade * i.preco_unitario * (1 - i.desconto_item_pct / 100),
        }))
      );
      showToast(status === 'CONFIRMADO' ? 'Pedido confirmado!' : 'Rascunho salvo.', true);
      setAba('lista');
      // Reset form
      setClienteId(''); setClienteSearch(''); setItens([]); setFreteValor('0'); setDescontoGlobal('0'); setObservacoes('');
      getPedidos('VENDA').then(setPedidos);
    } catch (e) { showToast('Erro: ' + (e as Error).message, false); }
    finally { setSaving(false); }
  }

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
    try { await updatePedidoStatus(id, 'CANCELADO'); getPedidos('VENDA').then(setPedidos); showToast('Pedido cancelado.', true); }
    catch (e) { showToast('Erro: ' + (e as Error).message, false); }
  }

  const clientesFiltrados = clientes.filter(c => c.nome.toLowerCase().includes(clienteSearch.toLowerCase())).slice(0, 5);
  const clienteSelecionado = clientes.find(c => c.id === clienteId);

  return (
    <div className="p-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Abas */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          {aba === 'detalhe' ? (
            <button onClick={() => setAba('lista')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white border border-slate-200 text-slate-600 hover:border-blue-300 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Voltar à Lista
            </button>
          ) : (
            (['lista', 'novo'] as const).map(a => (
              <button key={a} onClick={() => setAba(a)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${aba === a ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300'}`}>
                {a === 'lista' ? 'Lista de Pedidos' : '+ Novo Pedido'}
              </button>
            ))
          )}
        </div>
        {aba === 'lista' && <span className="text-sm text-slate-500">{pedidos.length} pedidos</span>}
        {aba === 'detalhe' && pedidoDetalhe && (
          <span className="text-sm text-slate-500 font-mono">#{pedidoDetalhe.numero}</span>
        )}
      </div>

      {/* Lista */}
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

      {/* Detalhe do Pedido */}
      {aba === 'detalhe' && pedidoDetalhe && (
        <div className="space-y-5">
          {/* Info do pedido */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-700">Dados do Pedido</h3>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[pedidoDetalhe.status]}`}>{pedidoDetalhe.status}</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Cliente</p>
                <p className="font-medium text-slate-800">{pedidoDetalhe.erp_clientes?.nome ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Data de Emissão</p>
                <p className="font-medium text-slate-800">{new Date(pedidoDetalhe.data_emissao + 'T00:00').toLocaleDateString('pt-BR')}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Previsão de Entrega</p>
                <p className="font-medium text-slate-800">
                  {pedidoDetalhe.data_entrega_prevista ? new Date(pedidoDetalhe.data_entrega_prevista + 'T00:00').toLocaleDateString('pt-BR') : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Cond. de Pagamento</p>
                <p className="font-medium text-slate-800">{pedidoDetalhe.condicao_pagamento ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Frete</p>
                <p className="font-medium text-slate-800">{(pedidoDetalhe.frete_valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Desconto Global</p>
                <p className="font-medium text-slate-800">{pedidoDetalhe.desconto_global_pct ?? 0}%</p>
              </div>
              {pedidoDetalhe.observacoes && (
                <div className="col-span-3">
                  <p className="text-xs text-slate-500 mb-0.5">Observações</p>
                  <p className="text-slate-700">{pedidoDetalhe.observacoes}</p>
                </div>
              )}
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
                    <th className="text-right pb-2 text-xs text-slate-500">Qtd</th>
                    <th className="text-right pb-2 text-xs text-slate-500">Preço Unit.</th>
                    <th className="text-right pb-2 text-xs text-slate-500">Desc%</th>
                    <th className="text-right pb-2 text-xs text-slate-500">Total Item</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {itensDetalhe.map(item => (
                    <tr key={item.id}>
                      <td className="py-2.5">
                        <div className="font-medium text-slate-800">{(item as unknown as { erp_produtos?: { nome: string } }).erp_produtos?.nome ?? item.produto_id}</div>
                        <div className="text-xs text-slate-400">{(item as unknown as { erp_produtos?: { codigo_interno: string } }).erp_produtos?.codigo_interno ?? ''}</div>
                      </td>
                      <td className="py-2.5 text-right text-slate-700">{item.quantidade}</td>
                      <td className="py-2.5 text-right text-slate-700">{item.preco_unitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                      <td className="py-2.5 text-right text-slate-500">{item.desconto_item_pct}%</td>
                      <td className="py-2.5 text-right font-medium">{item.total_item.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-slate-200">
                  <tr>
                    <td colSpan={4} className="pt-3 text-right text-sm font-bold text-slate-700">Total do Pedido</td>
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

      {/* Novo Pedido */}
      {aba === 'novo' && (
        <div className="grid grid-cols-3 gap-6">
          {/* Formulário principal */}
          <div className="col-span-2 space-y-5">
            {/* Cliente */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-sm font-bold text-slate-700 mb-3">Dados do Pedido</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Cliente *</label>
                  {!clienteId ? (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Buscar cliente..." value={clienteSearch} onChange={e => setClienteSearch(e.target.value)} />
                      {clienteSearch && (
                        <div className="absolute top-full left-0 right-0 border border-slate-200 bg-white rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                          {clientesFiltrados.map(c => (
                            <button key={c.id} onClick={() => { setClienteId(c.id); setClienteSearch(''); }}
                              className="w-full px-3 py-2 hover:bg-slate-50 text-sm text-left border-b border-slate-100 last:border-b-0">
                              <span className="font-medium">{c.nome}</span>
                              <span className="text-slate-500 ml-2 text-xs">{c.cpf_cnpj}</span>
                            </button>
                          ))}
                          {clientesFiltrados.length === 0 && <div className="px-3 py-2 text-sm text-slate-400">Nenhum cliente encontrado.</div>}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                      <span className="text-sm font-medium text-blue-800">{clienteSelecionado?.nome}</span>
                      <button onClick={() => setClienteId('')} className="text-blue-600 hover:text-blue-800 text-xs">Alterar</button>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Data de Emissão</label>
                  <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={dataEmissao} onChange={e => setDataEmissao(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Previsão de Entrega</label>
                  <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={dataEntrega} onChange={e => setDataEntrega(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Cond. de Pagamento</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={condicao} onChange={e => setCondicao(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Observações</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={observacoes} onChange={e => setObservacoes(e.target.value)} />
                </div>
              </div>
            </div>

            {/* Itens */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-700">Itens do Pedido</h3>
                <div className="relative">
                  <button onClick={() => setShowProdList(!showProdList)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Adicionar Produto
                  </button>
                  {showProdList && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 w-80">
                      <div className="p-2">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                          <input autoFocus className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Buscar..." value={prodSearch} onChange={e => setProdSearch(e.target.value)} />
                        </div>
                      </div>
                      <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                        {produtos.slice(0, 10).map(p => (
                          <button key={p.id} onClick={() => addProduto(p)}
                            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 text-sm text-left">
                            <div>
                              <div className="font-medium text-slate-800">{p.nome}</div>
                              <div className="text-xs text-slate-500">{p.codigo_interno}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium text-blue-600">{p.preco_venda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</div>
                              <div className="text-xs text-slate-500">{p.unidade_medida}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {itens.length === 0 ? (
                <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
                  <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">Nenhum item adicionado</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200">
                    <tr>
                      <th className="text-left py-2 text-xs text-slate-500">Produto</th>
                      <th className="text-right py-2 text-xs text-slate-500">Qtd</th>
                      <th className="text-right py-2 text-xs text-slate-500">Preço Unit.</th>
                      <th className="text-right py-2 text-xs text-slate-500">Desc%</th>
                      <th className="text-right py-2 text-xs text-slate-500">Total</th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {itens.map(item => {
                      const total = item.quantidade * item.preco_unitario * (1 - item.desconto_item_pct / 100);
                      return (
                        <tr key={item.produto.id}>
                          <td className="py-2 font-medium text-slate-800">{item.produto.nome}</td>
                          <td className="py-2">
                            <input type="number" min="0.001" step="0.001" className="w-20 text-right border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                              value={item.quantidade} onChange={e => updateItem(item.produto.id, 'quantidade', +e.target.value)} />
                          </td>
                          <td className="py-2">
                            <input type="number" min="0" step="0.0001" className="w-24 text-right border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                              value={item.preco_unitario} onChange={e => updateItem(item.produto.id, 'preco_unitario', +e.target.value)} />
                          </td>
                          <td className="py-2">
                            <input type="number" min="0" max="100" step="0.01" className="w-16 text-right border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                              value={item.desconto_item_pct} onChange={e => updateItem(item.produto.id, 'desconto_item_pct', +e.target.value)} />
                          </td>
                          <td className="py-2 text-right font-medium">{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                          <td className="py-2 pl-2"><button onClick={() => removeItem(item.produto.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Resumo lateral */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5 sticky top-4">
              <h3 className="text-sm font-bold text-slate-700 mb-4">Resumo do Pedido</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Produtos ({itens.length})</span>
                  <span className="font-medium">{totalProdutos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Frete (R$)</span>
                  <input type="number" min="0" step="0.01" className="w-24 text-right border border-slate-200 rounded px-2 py-1 text-xs"
                    value={freteValor} onChange={e => setFreteValor(e.target.value)} />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Desconto Global (%)</span>
                  <input type="number" min="0" max="100" step="0.01" className="w-16 text-right border border-slate-200 rounded px-2 py-1 text-xs"
                    value={descontoGlobal} onChange={e => setDescontoGlobal(e.target.value)} />
                </div>
                <div className="border-t border-slate-200 pt-3 flex justify-between">
                  <span className="font-bold text-slate-800">Total do Pedido</span>
                  <span className="font-bold text-blue-600 text-lg">{totalPedido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
              </div>
              <div className="mt-5 space-y-2">
                <button onClick={() => handleSave('CONFIRMADO')} disabled={saving}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white py-2.5 rounded-lg text-sm font-medium transition-colors">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingBag className="w-4 h-4" />}
                  Confirmar Pedido
                </button>
                <button onClick={() => handleSave('RASCUNHO')} disabled={saving}
                  className="w-full border border-slate-200 hover:border-slate-300 text-slate-600 py-2.5 rounded-lg text-sm font-medium transition-colors">
                  Salvar Rascunho
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
