import { useState, useEffect } from 'react';
import {
  Plus, Search, Trash2, ShoppingBag, Loader2, CheckCircle, AlertCircle, X,
  LayoutDashboard, Banknote, Link2, FileText, Users, UserCheck,
  Truck, MessageSquare, Tag, ArrowLeftRight, Receipt, Database,
  MapPin, CheckSquare, ChevronLeft,
} from 'lucide-react';
import { getClientes, getProdutos, createPedido, getPedidos, updatePedidoStatus } from '../../../lib/erp';
import type { ErpCliente, ErpProduto, ErpPedido } from '../../../lib/erp';

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface ItemCarrinho {
  produto: ErpProduto;
  quantidade: number;
  preco_unitario: number;
  desconto_item_pct: number;
  ipi_pct: number;
}

type AbaForm =
  | 'resumo' | 'financeiro' | 'doc-vinculado' | 'documento'
  | 'participantes' | 'vendedor-aux' | 'frete' | 'observacoes'
  | 'deducoes' | 'conversao' | 'dfe-info' | 'dados-comp'
  | 'end-entrega' | 'liberacoes';

const STATUS_BADGE: Record<string, string> = {
  RASCUNHO:   'bg-slate-100 text-slate-600',
  CONFIRMADO: 'bg-blue-100 text-blue-700',
  FATURADO:   'bg-green-100 text-green-700',
  CANCELADO:  'bg-red-100 text-red-600',
};

const ABAS_FORM: { id: AbaForm; label: string; icon: React.ReactNode }[] = [
  { id: 'resumo',       label: 'Resumo da Operação',    icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
  { id: 'financeiro',   label: 'Financeiro',             icon: <Banknote className="w-3.5 h-3.5" /> },
  { id: 'doc-vinculado',label: 'Documento Vinculado',    icon: <Link2 className="w-3.5 h-3.5" /> },
  { id: 'documento',    label: 'Documento',              icon: <FileText className="w-3.5 h-3.5" /> },
  { id: 'participantes',label: 'Participantes',          icon: <Users className="w-3.5 h-3.5" /> },
  { id: 'vendedor-aux', label: 'Vendedor Auxiliar',      icon: <UserCheck className="w-3.5 h-3.5" /> },
  { id: 'frete',        label: 'Frete',                  icon: <Truck className="w-3.5 h-3.5" /> },
  { id: 'observacoes',  label: 'Observações',            icon: <MessageSquare className="w-3.5 h-3.5" /> },
  { id: 'deducoes',     label: 'Deduções',               icon: <Tag className="w-3.5 h-3.5" /> },
  { id: 'conversao',    label: 'Conversão De Para',      icon: <ArrowLeftRight className="w-3.5 h-3.5" /> },
  { id: 'dfe-info',     label: 'DFe Info',               icon: <Receipt className="w-3.5 h-3.5" /> },
  { id: 'dados-comp',   label: 'Dados Complementares',   icon: <Database className="w-3.5 h-3.5" /> },
  { id: 'end-entrega',  label: 'Endereço de Entrega',    icon: <MapPin className="w-3.5 h-3.5" /> },
  { id: 'liberacoes',   label: 'Liberações Efetuadas',   icon: <CheckSquare className="w-3.5 h-3.5" /> },
];

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ── Componente ─────────────────────────────────────────────────────────────────

export default function PedidoVenda() {
  const [view, setView] = useState<'lista' | 'novo'>('lista');
  const [abaForm, setAbaForm] = useState<AbaForm>('resumo');

  const [pedidos, setPedidos] = useState<ErpPedido[]>([]);
  const [clientes, setClientes] = useState<ErpCliente[]>([]);
  const [produtos, setProdutos] = useState<ErpProduto[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  // Resumo
  const [clienteId, setClienteId] = useState('');
  const [clienteSearch, setClienteSearch] = useState('');
  const [dataEmissao, setDataEmissao] = useState(new Date().toISOString().split('T')[0]);
  const [dataEntrega, setDataEntrega] = useState('');
  const [deposito, setDeposito] = useState('');
  const [naturezaOp, setNaturezaOp] = useState('Venda de Mercadoria');
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [prodSearch, setProdSearch] = useState('');
  const [showProdList, setShowProdList] = useState(false);

  // Financeiro
  const [condicao, setCondicao] = useState('À Vista');
  const [tabelaPreco, setTabelaPreco] = useState('');
  const [vendedorId, setVendedorId] = useState('');

  // Documento
  const [tipoDoc, setTipoDoc] = useState('NF-e 55');
  const [serieDoc, setSerieDoc] = useState('001');
  const [numDocRef, setNumDocRef] = useState('');

  // Participantes
  const [transportadora, setTransportadora] = useState('');
  const [cnpjTransp, setCnpjTransp] = useState('');

  // Vendedor Auxiliar
  const [vendedorAux, setVendedorAux] = useState('');
  const [comissaoAux, setComissaoAux] = useState('');

  // Frete
  const [modalidadeFrete, setModalidadeFrete] = useState('9');
  const [freteValor, setFreteValor] = useState('0');
  const [pesoBruto, setPesoBruto] = useState('');
  const [pesoLiquido, setPesoLiquido] = useState('');
  const [volumes, setVolumes] = useState('');
  const [especieVolume, setEspecieVolume] = useState('');
  const [placaVeiculo, setPlacaVeiculo] = useState('');

  // Observações
  const [obsNfe, setObsNfe] = useState('');
  const [obsInterna, setObsInterna] = useState('');
  const [infCompl, setInfCompl] = useState('');

  // Deduções
  const [descontoGlobalPct, setDescontoGlobalPct] = useState('0');
  const [descontoGlobalVal, setDescontoGlobalVal] = useState('0');
  const [acrescimo, setAcrescimo] = useState('0');

  // DFe Info
  const [modeloNfe, setModeloNfe] = useState('55');
  const [ambienteNfe, setAmbienteNfe] = useState('homologacao');
  const [finalidadeNfe, setFinalidadeNfe] = useState('1');
  const [consumidorFinal, setConsumidorFinal] = useState('1');

  // Dados Complementares
  const [pedidoCompra, setPedidoCompra] = useState('');
  const [centroCusto, setCentroCusto] = useState('');
  const [projeto, setProjeto] = useState('');

  // Endereço de Entrega
  const [cepEntrega, setCepEntrega] = useState('');
  const [logradouroEntrega, setLogradouroEntrega] = useState('');
  const [numeroEntrega, setNumeroEntrega] = useState('');
  const [bairroEntrega, setBairroEntrega] = useState('');
  const [cidadeEntrega, setCidadeEntrega] = useState('');
  const [ufEntrega, setUfEntrega] = useState('');
  const [enderecoIgualCliente, setEnderecoIgualCliente] = useState(true);

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

  // Totais calculados
  const totalProdutos = itens.reduce((s, i) => s + i.quantidade * i.preco_unitario * (1 - i.desconto_item_pct / 100), 0);
  const totalIpi = itens.reduce((s, i) => s + i.quantidade * i.preco_unitario * (i.ipi_pct / 100), 0);
  const descGlobalVal = totalProdutos * (+descontoGlobalPct / 100) + (+descontoGlobalVal);
  const totalPedido = totalProdutos + (+freteValor || 0) - descGlobalVal + (+acrescimo || 0);
  const totalQtde = itens.reduce((s, i) => s + i.quantidade, 0);

  function addProduto(p: ErpProduto) {
    const existing = itens.find(i => i.produto.id === p.id);
    if (existing) {
      setItens(prev => prev.map(i => i.produto.id === p.id ? { ...i, quantidade: i.quantidade + 1 } : i));
    } else {
      setItens(prev => [...prev, { produto: p, quantidade: 1, preco_unitario: p.preco_venda, desconto_item_pct: 0, ipi_pct: 0 }]);
    }
    setShowProdList(false); setProdSearch('');
  }

  function removeItem(id: string) { setItens(prev => prev.filter(i => i.produto.id !== id)); }
  function updateItem(id: string, field: keyof ItemCarrinho, value: unknown) {
    setItens(prev => prev.map(i => i.produto.id === id ? { ...i, [field]: value } : i));
  }

  function resetForm() {
    setClienteId(''); setClienteSearch(''); setItens([]);
    setFreteValor('0'); setDescontoGlobalPct('0'); setDescontoGlobalVal('0');
    setObsNfe(''); setObsInterna(''); setAbaForm('resumo');
  }

  async function handleSave(status: 'RASCUNHO' | 'CONFIRMADO') {
    if (!clienteId) return showToast('Selecione um cliente.', false);
    if (itens.length === 0) return showToast('Adicione pelo menos um produto.', false);
    setSaving(true);
    try {
      await createPedido(
        {
          tipo: 'VENDA', status,
          cliente_id: clienteId,
          vendedor_id: vendedorId || null,
          data_emissao: dataEmissao,
          data_entrega_prevista: dataEntrega || null,
          condicao_pagamento: condicao,
          desconto_global_pct: +descontoGlobalPct || 0,
          frete_valor: +freteValor || 0,
          total_produtos: totalProdutos,
          total_pedido: totalPedido,
          observacoes: obsNfe || null,
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
      setView('lista'); resetForm();
      getPedidos('VENDA').then(setPedidos);
    } catch (e) { showToast('Erro: ' + (e as Error).message, false); }
    finally { setSaving(false); }
  }

  async function handleCancelar(id: string) {
    if (!confirm('Cancelar pedido?')) return;
    try { await updatePedidoStatus(id, 'CANCELADO'); getPedidos('VENDA').then(setPedidos); showToast('Pedido cancelado.', true); }
    catch (e) { showToast('Erro: ' + (e as Error).message, false); }
  }

  const clientesFiltrados = clientes.filter(c => c.nome.toLowerCase().includes(clienteSearch.toLowerCase())).slice(0, 6);
  const clienteSelecionado = clientes.find(c => c.id === clienteId);

  // ── Input helper ────────────────────────────────────────────────────────────
  const inp = (extra?: string) =>
    `w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${extra ?? ''}`;
  const lbl = 'block text-xs font-medium text-slate-600 mb-1';

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full p-0">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />} {toast.msg}
        </div>
      )}

      {/* ── LISTA ─────────────────────────────────────────────────────────────── */}
      {view === 'lista' && (
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Pedidos de Venda</h1>
              <p className="text-sm text-slate-500">{pedidos.length} pedidos</p>
            </div>
            <button onClick={() => { setView('novo'); setAbaForm('resumo'); }}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> Novo Pedido
            </button>
          </div>

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
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pedidos.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-12">
                      <ShoppingBag className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                      <p className="text-slate-400">Nenhum pedido. Clique em "Novo Pedido".</p>
                    </td></tr>
                  ) : pedidos.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">#{p.numero}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{p.erp_clientes?.nome ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{new Date(p.data_emissao + 'T00:00').toLocaleDateString('pt-BR')}</td>
                      <td className="px-4 py-3 text-slate-600">{p.condicao_pagamento ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-medium">{fmtBRL(p.total_pedido)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[p.status]}`}>{p.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        {p.status !== 'CANCELADO' && (
                          <button onClick={() => handleCancelar(p.id)} className="text-slate-400 hover:text-red-600 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── FORMULÁRIO com abas laterais ──────────────────────────────────────── */}
      {view === 'novo' && (
        <div className="flex flex-col h-full min-h-0">
          {/* Barra superior */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-white">
            <button onClick={() => { setView('lista'); resetForm(); }}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
              <ChevronLeft className="w-4 h-4" /> Voltar à lista
            </button>
            <div className="flex items-center gap-2">
              <button onClick={() => handleSave('RASCUNHO')} disabled={saving}
                className="border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                Salvar Rascunho
              </button>
              <button onClick={() => handleSave('CONFIRMADO')} disabled={saving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Confirmar Pedido
              </button>
            </div>
          </div>

          {/* Layout com sidebar + conteúdo */}
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Sidebar de abas */}
            <div className="w-48 flex-shrink-0 bg-slate-800 flex flex-col overflow-y-auto custom-scrollbar">
              {ABAS_FORM.map(a => (
                <button key={a.id} onClick={() => setAbaForm(a.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-medium text-left transition-colors border-l-2 ${
                    abaForm === a.id
                      ? 'bg-blue-600 text-white border-blue-400'
                      : 'text-slate-300 border-transparent hover:bg-slate-700 hover:text-white'
                  }`}>
                  {a.icon}
                  <span className="leading-tight">{a.label}</span>
                </button>
              ))}
            </div>

            {/* Área de conteúdo das abas */}
            <div className="flex-1 overflow-y-auto bg-slate-50 custom-scrollbar">

              {/* ── RESUMO DA OPERAÇÃO ───────────────────────────────────────── */}
              {abaForm === 'resumo' && (
                <div className="flex flex-col h-full">
                  {/* Cabeçalho do pedido */}
                  <div className="bg-white border-b border-slate-200 px-5 py-4">
                    <div className="grid grid-cols-4 gap-3 mb-3">
                      <div>
                        <label className={lbl}>OPERAÇÃO</label>
                        <input className={inp()} value={naturezaOp} onChange={e => setNaturezaOp(e.target.value)} placeholder="Ex: Venda de Mercadoria" />
                      </div>
                      <div>
                        <label className={lbl}>DEPÓSITO</label>
                        <input className={inp()} value={deposito} onChange={e => setDeposito(e.target.value)} placeholder="Depósito principal..." />
                      </div>
                      <div>
                        <label className={lbl}>DATA EMISSÃO</label>
                        <input type="date" className={inp()} value={dataEmissao} onChange={e => setDataEmissao(e.target.value)} />
                      </div>
                      <div>
                        <label className={lbl}>PREVISÃO ENTREGA</label>
                        <input type="date" className={inp()} value={dataEntrega} onChange={e => setDataEntrega(e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <label className={lbl}>PARTICIPANTE (Cliente) *</label>
                        {!clienteId ? (
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="Buscar cliente..." value={clienteSearch} onChange={e => setClienteSearch(e.target.value)} />
                            {clienteSearch && (
                              <div className="absolute top-full left-0 right-0 border border-slate-200 bg-white rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                                {clientesFiltrados.map(c => (
                                  <button key={c.id} onClick={() => { setClienteId(c.id); setClienteSearch(''); }}
                                    className="w-full px-3 py-2 hover:bg-blue-50 text-sm text-left border-b border-slate-100 last:border-b-0">
                                    <span className="font-medium">{c.nome}</span>
                                    <span className="text-slate-400 ml-2 text-xs">{c.cpf_cnpj}</span>
                                  </button>
                                ))}
                                {clientesFiltrados.length === 0 && <div className="px-3 py-2 text-sm text-slate-400">Nenhum cliente encontrado.</div>}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                            <div>
                              <span className="text-sm font-medium text-blue-800">{clienteSelecionado?.nome}</span>
                              <span className="text-xs text-blue-500 ml-2">{clienteSelecionado?.cpf_cnpj}</span>
                            </div>
                            <button onClick={() => setClienteId('')} className="text-blue-400 hover:text-blue-700 text-xs ml-2">Alterar</button>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className={lbl}>COND. PRINCIPAL</label>
                        <input className={inp()} value={condicao} onChange={e => setCondicao(e.target.value)} placeholder="Ex: 30/60/90" />
                      </div>
                    </div>
                  </div>

                  {/* Grid de itens */}
                  <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between px-5 py-2 bg-slate-100 border-b border-slate-200">
                      <span className="text-xs font-semibold text-slate-600 uppercase">Itens do Pedido</span>
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
                                  placeholder="Buscar produto..." value={prodSearch} onChange={e => setProdSearch(e.target.value)} />
                              </div>
                            </div>
                            <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                              {produtos.slice(0, 10).map(p => (
                                <button key={p.id} onClick={() => addProduto(p)}
                                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 text-sm text-left">
                                  <div>
                                    <div className="font-medium text-slate-800">{p.nome}</div>
                                    <div className="text-xs text-slate-500">{p.codigo_interno} · {p.unidade_medida}</div>
                                  </div>
                                  <div className="text-right shrink-0 ml-3">
                                    <div className="font-medium text-blue-600">{fmtBRL(p.preco_venda)}</div>
                                    <div className="text-xs text-slate-400">Estq: {p.estoque_atual}</div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 overflow-auto">
                      <table className="w-full text-xs min-w-[900px]">
                        <thead className="bg-slate-100 border-b border-slate-200 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-slate-500 font-semibold uppercase w-8">Item</th>
                            <th className="px-3 py-2 text-left text-slate-500 font-semibold uppercase">Código</th>
                            <th className="px-3 py-2 text-left text-slate-500 font-semibold uppercase">Nome do Produto</th>
                            <th className="px-3 py-2 text-center text-slate-500 font-semibold uppercase w-14">Und</th>
                            <th className="px-3 py-2 text-right text-slate-500 font-semibold uppercase w-20">Qtde</th>
                            <th className="px-3 py-2 text-right text-slate-500 font-semibold uppercase w-24">Valor Unit.</th>
                            <th className="px-3 py-2 text-right text-slate-500 font-semibold uppercase w-16">%Desc</th>
                            <th className="px-3 py-2 text-right text-slate-500 font-semibold uppercase w-24">Total</th>
                            <th className="px-3 py-2 text-right text-slate-500 font-semibold uppercase w-16">%IPI</th>
                            <th className="px-3 py-2 text-right text-slate-500 font-semibold uppercase w-20">$IPI</th>
                            <th className="px-3 py-2 text-center text-slate-500 font-semibold uppercase w-8" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {itens.length === 0 ? (
                            <tr>
                              <td colSpan={11} className="text-center py-10 text-slate-400">
                                <ShoppingBag className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                                Clique em "Adicionar Produto" para inserir itens
                              </td>
                            </tr>
                          ) : itens.map((item, idx) => {
                            const total = item.quantidade * item.preco_unitario * (1 - item.desconto_item_pct / 100);
                            const ipiVal = item.quantidade * item.preco_unitario * (item.ipi_pct / 100);
                            return (
                              <tr key={item.produto.id} className="hover:bg-blue-50/30">
                                <td className="px-3 py-1.5 text-slate-500 text-center">{idx + 1}</td>
                                <td className="px-3 py-1.5 text-slate-600 font-mono">{item.produto.codigo_interno}</td>
                                <td className="px-3 py-1.5 font-medium text-slate-800">{item.produto.nome}</td>
                                <td className="px-3 py-1.5 text-center text-slate-500">{item.produto.unidade_medida}</td>
                                <td className="px-3 py-1.5">
                                  <input type="number" min="0.001" step="0.001"
                                    className="w-full text-right border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                    value={item.quantidade} onChange={e => updateItem(item.produto.id, 'quantidade', +e.target.value)} />
                                </td>
                                <td className="px-3 py-1.5">
                                  <input type="number" min="0" step="0.0001"
                                    className="w-full text-right border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                    value={item.preco_unitario} onChange={e => updateItem(item.produto.id, 'preco_unitario', +e.target.value)} />
                                </td>
                                <td className="px-3 py-1.5">
                                  <input type="number" min="0" max="100" step="0.01"
                                    className="w-full text-right border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                    value={item.desconto_item_pct} onChange={e => updateItem(item.produto.id, 'desconto_item_pct', +e.target.value)} />
                                </td>
                                <td className="px-3 py-1.5 text-right font-semibold text-slate-800">{fmtBRL(total)}</td>
                                <td className="px-3 py-1.5">
                                  <input type="number" min="0" max="100" step="0.01"
                                    className="w-full text-right border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                                    value={item.ipi_pct} onChange={e => updateItem(item.produto.id, 'ipi_pct', +e.target.value)} />
                                </td>
                                <td className="px-3 py-1.5 text-right text-slate-600">{ipiVal > 0 ? fmtBRL(ipiVal) : '—'}</td>
                                <td className="px-3 py-1.5 text-center">
                                  <button onClick={() => removeItem(item.produto.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Rodapé de totais */}
                    <div className="border-t border-slate-200 bg-white px-4 py-3">
                      <div className="grid grid-cols-5 gap-3">
                        <div className="text-center">
                          <div className="text-xs text-slate-500 font-semibold uppercase mb-1">Produtos</div>
                          <div className="bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm font-bold text-slate-800">{fmtBRL(totalProdutos)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-slate-500 font-semibold uppercase mb-1">Desconto</div>
                          <div className="bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm font-bold text-orange-600">{fmtBRL(descGlobalVal)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-slate-500 font-semibold uppercase mb-1">Frete</div>
                          <div className="bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm font-bold text-slate-700">{fmtBRL(+freteValor || 0)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-slate-500 font-semibold uppercase mb-1">Qtde Total</div>
                          <div className="bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm font-bold text-slate-700">{totalQtde.toFixed(3)}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-xs text-slate-500 font-semibold uppercase mb-1">Total Operação</div>
                          <div className="bg-blue-600 border border-blue-700 rounded px-3 py-2 text-sm font-bold text-white">{fmtBRL(totalPedido)}</div>
                        </div>
                      </div>
                      {totalIpi > 0 && (
                        <div className="mt-2 text-right text-xs text-slate-500">IPI Total: <span className="font-semibold text-slate-700">{fmtBRL(totalIpi)}</span></div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── FINANCEIRO ────────────────────────────────────────────────── */}
              {abaForm === 'financeiro' && (
                <div className="p-6 max-w-2xl space-y-6">
                  <h2 className="text-base font-bold text-slate-800">Financeiro</h2>
                  <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={lbl}>Condição de Pagamento *</label>
                        <input className={inp()} value={condicao} onChange={e => setCondicao(e.target.value)} placeholder="Ex: 30/60, À Vista..." />
                      </div>
                      <div>
                        <label className={lbl}>Tabela de Preço</label>
                        <input className={inp()} value={tabelaPreco} onChange={e => setTabelaPreco(e.target.value)} placeholder="Tabela padrão" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={lbl}>Data de Emissão</label>
                        <input type="date" className={inp()} value={dataEmissao} onChange={e => setDataEmissao(e.target.value)} />
                      </div>
                      <div>
                        <label className={lbl}>Data Previsão Entrega</label>
                        <input type="date" className={inp()} value={dataEntrega} onChange={e => setDataEntrega(e.target.value)} />
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
                    <p className="text-xs text-slate-500">As parcelas serão geradas automaticamente ao confirmar o pedido com base na condição de pagamento selecionada.</p>
                    <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                      <div className="bg-white rounded-lg border border-slate-200 p-3">
                        <div className="text-xs text-slate-500">Produtos</div>
                        <div className="font-bold text-slate-800 mt-1">{fmtBRL(totalProdutos)}</div>
                      </div>
                      <div className="bg-white rounded-lg border border-slate-200 p-3">
                        <div className="text-xs text-slate-500">Desconto</div>
                        <div className="font-bold text-orange-600 mt-1">{fmtBRL(descGlobalVal)}</div>
                      </div>
                      <div className="bg-blue-600 rounded-lg p-3">
                        <div className="text-xs text-blue-200">Total Pedido</div>
                        <div className="font-bold text-white mt-1">{fmtBRL(totalPedido)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── DOCUMENTO VINCULADO ───────────────────────────────────────── */}
              {abaForm === 'doc-vinculado' && (
                <div className="p-6 max-w-2xl space-y-4">
                  <h2 className="text-base font-bold text-slate-800">Documento Vinculado</h2>
                  <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                    <div>
                      <label className={lbl}>Pedido / Proposta de Origem</label>
                      <input className={inp()} placeholder="Nº do pedido ou proposta de origem..." />
                    </div>
                    <div>
                      <label className={lbl}>NF-e Referenciada</label>
                      <input className={inp()} placeholder="Chave de acesso (44 dígitos) da NF-e referenciada..." maxLength={44} />
                    </div>
                    <div>
                      <label className={lbl}>Contrato Vinculado</label>
                      <input className={inp()} placeholder="Nº do contrato..." />
                    </div>
                    <div>
                      <label className={lbl}>Projeto Vinculado</label>
                      <input className={inp()} value={projeto} onChange={e => setProjeto(e.target.value)} placeholder="Código do projeto..." />
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">Os documentos vinculados serão referenciados no XML da NF-e ao faturar o pedido.</p>
                </div>
              )}

              {/* ── DOCUMENTO ─────────────────────────────────────────────────── */}
              {abaForm === 'documento' && (
                <div className="p-6 max-w-2xl space-y-4">
                  <h2 className="text-base font-bold text-slate-800">Documento Fiscal</h2>
                  <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className={lbl}>Modelo</label>
                        <select className={inp()} value={modeloNfe} onChange={e => setModeloNfe(e.target.value)}>
                          <option value="55">NF-e — Modelo 55</option>
                          <option value="65">NFC-e — Modelo 65</option>
                        </select>
                      </div>
                      <div>
                        <label className={lbl}>Série</label>
                        <input className={inp()} value={serieDoc} onChange={e => setSerieDoc(e.target.value)} />
                      </div>
                      <div>
                        <label className={lbl}>Nº Documento Ref.</label>
                        <input className={inp()} value={numDocRef} onChange={e => setNumDocRef(e.target.value)} placeholder="Referência interna..." />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={lbl}>Tipo do Documento</label>
                        <select className={inp()} value={tipoDoc} onChange={e => setTipoDoc(e.target.value)}>
                          <option>NF-e 55</option>
                          <option>NFC-e 65</option>
                          <option>Sem documento fiscal</option>
                        </select>
                      </div>
                      <div>
                        <label className={lbl}>Natureza da Operação</label>
                        <input className={inp()} value={naturezaOp} onChange={e => setNaturezaOp(e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── PARTICIPANTES ─────────────────────────────────────────────── */}
              {abaForm === 'participantes' && (
                <div className="p-6 max-w-2xl space-y-4">
                  <h2 className="text-base font-bold text-slate-800">Participantes</h2>
                  <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                    <div>
                      <label className={lbl}>Comprador / Destinatário</label>
                      {clienteSelecionado ? (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                          <div className="font-medium text-blue-800">{clienteSelecionado.nome}</div>
                          <div className="text-xs text-blue-500 mt-0.5">{clienteSelecionado.cpf_cnpj} · {clienteSelecionado.email ?? '—'}</div>
                        </div>
                      ) : (
                        <p className="text-slate-400 text-sm">Selecione o cliente na aba Resumo da Operação.</p>
                      )}
                    </div>
                    <div className="border-t border-slate-100 pt-4">
                      <p className="text-xs font-semibold text-slate-600 uppercase mb-3">Transportadora</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={lbl}>Razão Social</label>
                          <input className={inp()} value={transportadora} onChange={e => setTransportadora(e.target.value)} placeholder="Nome da transportadora..." />
                        </div>
                        <div>
                          <label className={lbl}>CNPJ</label>
                          <input className={inp()} value={cnpjTransp} onChange={e => setCnpjTransp(e.target.value)} placeholder="00.000.000/0000-00" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── VENDEDOR AUXILIAR ─────────────────────────────────────────── */}
              {abaForm === 'vendedor-aux' && (
                <div className="p-6 max-w-xl space-y-4">
                  <h2 className="text-base font-bold text-slate-800">Vendedor Auxiliar</h2>
                  <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                    <div>
                      <label className={lbl}>Vendedor Principal</label>
                      <input className={inp()} value={vendedorId} onChange={e => setVendedorId(e.target.value)} placeholder="Buscar vendedor..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={lbl}>Vendedor Auxiliar</label>
                        <input className={inp()} value={vendedorAux} onChange={e => setVendedorAux(e.target.value)} placeholder="Nome do vendedor aux..." />
                      </div>
                      <div>
                        <label className={lbl}>Comissão Aux (%)</label>
                        <input type="number" min="0" max="100" step="0.01" className={inp()} value={comissaoAux} onChange={e => setComissaoAux(e.target.value)} placeholder="0,00" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── FRETE ─────────────────────────────────────────────────────── */}
              {abaForm === 'frete' && (
                <div className="p-6 max-w-2xl space-y-4">
                  <h2 className="text-base font-bold text-slate-800">Frete</h2>
                  <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={lbl}>Modalidade do Frete</label>
                        <select className={inp()} value={modalidadeFrete} onChange={e => setModalidadeFrete(e.target.value)}>
                          <option value="0">0 — Por conta do Emitente</option>
                          <option value="1">1 — Por conta do Destinatário</option>
                          <option value="2">2 — Por conta de Terceiros</option>
                          <option value="9">9 — Sem Frete</option>
                        </select>
                      </div>
                      <div>
                        <label className={lbl}>Valor do Frete (R$)</label>
                        <input type="number" min="0" step="0.01" className={inp()} value={freteValor} onChange={e => setFreteValor(e.target.value)} />
                      </div>
                    </div>
                    {modalidadeFrete !== '9' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={lbl}>Transportadora</label>
                          <input className={inp()} value={transportadora} onChange={e => setTransportadora(e.target.value)} placeholder="Razão social..." />
                        </div>
                        <div>
                          <label className={lbl}>Placa do Veículo</label>
                          <input className={inp()} value={placaVeiculo} onChange={e => setPlacaVeiculo(e.target.value)} placeholder="ABC-1234" />
                        </div>
                        <div>
                          <label className={lbl}>Peso Bruto (kg)</label>
                          <input type="number" min="0" step="0.001" className={inp()} value={pesoBruto} onChange={e => setPesoBruto(e.target.value)} />
                        </div>
                        <div>
                          <label className={lbl}>Peso Líquido (kg)</label>
                          <input type="number" min="0" step="0.001" className={inp()} value={pesoLiquido} onChange={e => setPesoLiquido(e.target.value)} />
                        </div>
                        <div>
                          <label className={lbl}>Nº de Volumes</label>
                          <input type="number" min="0" step="1" className={inp()} value={volumes} onChange={e => setVolumes(e.target.value)} />
                        </div>
                        <div>
                          <label className={lbl}>Espécie do Volume</label>
                          <input className={inp()} value={especieVolume} onChange={e => setEspecieVolume(e.target.value)} placeholder="Ex: Caixa, Fardo, Rolo..." />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── OBSERVAÇÕES ───────────────────────────────────────────────── */}
              {abaForm === 'observacoes' && (
                <div className="p-6 max-w-2xl space-y-4">
                  <h2 className="text-base font-bold text-slate-800">Observações</h2>
                  <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                    <div>
                      <label className={lbl}>Observações da NF-e (campo no XML)</label>
                      <textarea rows={4} className={inp('resize-none')} value={obsNfe} onChange={e => setObsNfe(e.target.value)}
                        placeholder="Texto que aparece no campo de informações adicionais da NF-e..." />
                    </div>
                    <div>
                      <label className={lbl}>Observações Internas</label>
                      <textarea rows={3} className={inp('resize-none')} value={obsInterna} onChange={e => setObsInterna(e.target.value)}
                        placeholder="Anotações internas — não aparecem na NF-e..." />
                    </div>
                    <div>
                      <label className={lbl}>Informações Complementares</label>
                      <textarea rows={3} className={inp('resize-none')} value={infCompl} onChange={e => setInfCompl(e.target.value)}
                        placeholder="Ex: Pedido de Compra nº..., Contrato nº..." />
                    </div>
                  </div>
                </div>
              )}

              {/* ── DEDUÇÕES ──────────────────────────────────────────────────── */}
              {abaForm === 'deducoes' && (
                <div className="p-6 max-w-xl space-y-4">
                  <h2 className="text-base font-bold text-slate-800">Deduções e Acréscimos</h2>
                  <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={lbl}>Desconto Global (%)</label>
                        <input type="number" min="0" max="100" step="0.01" className={inp()} value={descontoGlobalPct} onChange={e => setDescontoGlobalPct(e.target.value)} />
                      </div>
                      <div>
                        <label className={lbl}>Desconto Global (R$)</label>
                        <input type="number" min="0" step="0.01" className={inp()} value={descontoGlobalVal} onChange={e => setDescontoGlobalVal(e.target.value)} />
                      </div>
                      <div>
                        <label className={lbl}>Acréscimo (R$)</label>
                        <input type="number" min="0" step="0.01" className={inp()} value={acrescimo} onChange={e => setAcrescimo(e.target.value)} />
                      </div>
                    </div>
                    <div className="border-t border-slate-100 pt-4 space-y-2 text-sm">
                      <div className="flex justify-between text-slate-600"><span>Produtos:</span><span className="font-medium">{fmtBRL(totalProdutos)}</span></div>
                      <div className="flex justify-between text-orange-600"><span>Desconto Total:</span><span className="font-medium">- {fmtBRL(descGlobalVal)}</span></div>
                      <div className="flex justify-between text-slate-600"><span>Frete:</span><span className="font-medium">{fmtBRL(+freteValor || 0)}</span></div>
                      <div className="flex justify-between text-green-600"><span>Acréscimo:</span><span className="font-medium">+ {fmtBRL(+acrescimo || 0)}</span></div>
                      <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-2"><span>Total:</span><span>{fmtBRL(totalPedido)}</span></div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── CONVERSÃO DE PARA ─────────────────────────────────────────── */}
              {abaForm === 'conversao' && (
                <div className="p-6 max-w-2xl space-y-4">
                  <h2 className="text-base font-bold text-slate-800">Conversão De / Para</h2>
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Produto</th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Und. Pedido</th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Qtde Pedido</th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Fator</th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Und. Estoque</th>
                          <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Qtde Estoque</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {itens.length === 0 ? (
                          <tr><td colSpan={6} className="text-center py-8 text-slate-400 text-sm">Nenhum item no pedido.</td></tr>
                        ) : itens.map(item => (
                          <tr key={item.produto.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-medium text-slate-800">{item.produto.nome}</td>
                            <td className="px-4 py-3 text-center text-slate-600">{item.produto.unidade_medida}</td>
                            <td className="px-4 py-3 text-center text-slate-700">{item.quantidade}</td>
                            <td className="px-4 py-3 text-center text-slate-400">1</td>
                            <td className="px-4 py-3 text-center text-slate-600">{item.produto.unidade_medida}</td>
                            <td className="px-4 py-3 text-right font-medium text-slate-800">{item.quantidade}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── DFe INFO ──────────────────────────────────────────────────── */}
              {abaForm === 'dfe-info' && (
                <div className="p-6 max-w-2xl space-y-4">
                  <h2 className="text-base font-bold text-slate-800">DFe — Informações do Documento Fiscal</h2>
                  <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={lbl}>Modelo NF-e</label>
                        <select className={inp()} value={modeloNfe} onChange={e => setModeloNfe(e.target.value)}>
                          <option value="55">55 — NF-e</option>
                          <option value="65">65 — NFC-e</option>
                        </select>
                      </div>
                      <div>
                        <label className={lbl}>Série</label>
                        <input className={inp()} value={serieDoc} onChange={e => setSerieDoc(e.target.value)} />
                      </div>
                      <div>
                        <label className={lbl}>Ambiente</label>
                        <select className={inp()} value={ambienteNfe} onChange={e => setAmbienteNfe(e.target.value)}>
                          <option value="homologacao">Homologação (teste)</option>
                          <option value="producao">Produção</option>
                        </select>
                      </div>
                      <div>
                        <label className={lbl}>Finalidade</label>
                        <select className={inp()} value={finalidadeNfe} onChange={e => setFinalidadeNfe(e.target.value)}>
                          <option value="1">1 — Normal</option>
                          <option value="2">2 — Complementar</option>
                          <option value="3">3 — Ajuste</option>
                          <option value="4">4 — Devolução</option>
                        </select>
                      </div>
                      <div>
                        <label className={lbl}>Consumidor Final</label>
                        <select className={inp()} value={consumidorFinal} onChange={e => setConsumidorFinal(e.target.value)}>
                          <option value="1">1 — Sim (B2C)</option>
                          <option value="0">0 — Não (B2B)</option>
                        </select>
                      </div>
                    </div>
                    {ambienteNfe === 'homologacao' && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                        Ambiente de homologação — NF-e não tem validade fiscal. Altere para Produção para emissão real.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── DADOS COMPLEMENTARES ──────────────────────────────────────── */}
              {abaForm === 'dados-comp' && (
                <div className="p-6 max-w-xl space-y-4">
                  <h2 className="text-base font-bold text-slate-800">Dados Complementares</h2>
                  <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                    <div>
                      <label className={lbl}>Pedido de Compra do Cliente</label>
                      <input className={inp()} value={pedidoCompra} onChange={e => setPedidoCompra(e.target.value)} placeholder="Nº do PO / pedido de compra..." />
                    </div>
                    <div>
                      <label className={lbl}>Centro de Custo</label>
                      <input className={inp()} value={centroCusto} onChange={e => setCentroCusto(e.target.value)} placeholder="Código do centro de custo..." />
                    </div>
                    <div>
                      <label className={lbl}>Projeto / Obra</label>
                      <input className={inp()} value={projeto} onChange={e => setProjeto(e.target.value)} placeholder="Código ou nome do projeto..." />
                    </div>
                  </div>
                </div>
              )}

              {/* ── ENDEREÇO DE ENTREGA ───────────────────────────────────────── */}
              {abaForm === 'end-entrega' && (
                <div className="p-6 max-w-2xl space-y-4">
                  <h2 className="text-base font-bold text-slate-800">Endereço de Entrega</h2>
                  <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="rounded" checked={enderecoIgualCliente} onChange={e => setEnderecoIgualCliente(e.target.checked)} />
                      <span className="text-sm text-slate-700">Mesmo endereço do cliente</span>
                    </label>
                    {!enderecoIgualCliente && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={lbl}>CEP</label>
                          <input className={inp()} value={cepEntrega} onChange={e => setCepEntrega(e.target.value)} placeholder="00000-000" />
                        </div>
                        <div>
                          <label className={lbl}>Logradouro</label>
                          <input className={inp()} value={logradouroEntrega} onChange={e => setLogradouroEntrega(e.target.value)} />
                        </div>
                        <div>
                          <label className={lbl}>Número</label>
                          <input className={inp()} value={numeroEntrega} onChange={e => setNumeroEntrega(e.target.value)} />
                        </div>
                        <div>
                          <label className={lbl}>Bairro</label>
                          <input className={inp()} value={bairroEntrega} onChange={e => setBairroEntrega(e.target.value)} />
                        </div>
                        <div>
                          <label className={lbl}>Cidade</label>
                          <input className={inp()} value={cidadeEntrega} onChange={e => setCidadeEntrega(e.target.value)} />
                        </div>
                        <div>
                          <label className={lbl}>UF</label>
                          <input className={inp('uppercase')} maxLength={2} value={ufEntrega} onChange={e => setUfEntrega(e.target.value.toUpperCase())} />
                        </div>
                      </div>
                    )}
                    {enderecoIgualCliente && clienteSelecionado && (
                      <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 text-sm text-slate-600">
                        Entrega será realizada no endereço cadastrado para <strong>{clienteSelecionado.nome}</strong>.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── LIBERAÇÕES EFETUADAS ──────────────────────────────────────── */}
              {abaForm === 'liberacoes' && (
                <div className="p-6 max-w-2xl space-y-4">
                  <h2 className="text-base font-bold text-slate-800">Liberações Efetuadas</h2>
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Data/Hora</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Usuário</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Tipo</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Observação</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr><td colSpan={4} className="text-center py-10 text-slate-400 text-sm">
                          Nenhuma liberação registrada. As liberações serão listadas aqui após salvar o pedido.
                        </td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
