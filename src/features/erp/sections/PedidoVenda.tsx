import { useState, useEffect } from 'react';
import {
  Plus, Search, Trash2, ShoppingBag, Loader2, CheckCircle, AlertCircle, X,
  LayoutDashboard, Banknote, Link2, FileText, Users, UserCheck,
  Truck, MessageSquare, Tag, ArrowLeftRight, Receipt, Database,
  MapPin, CheckSquare, ChevronLeft, ChevronDown,
} from 'lucide-react';
import {
  getClientes, getProdutos, createPedido, updatePedido, getPedidos, updatePedidoStatus,
  getNaturezasOperacao, getCondicoesPagamento, getDepositos,
} from '../../../lib/erp';
import type {
  ErpCliente, ErpProduto, ErpPedido,
  ErpNaturezaOperacao, ErpCondicaoPagamento, ErpDeposito,
} from '../../../lib/erp';

// ── Tipos ───────────────────────────────────────────────────────────────────────

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
  { id: 'resumo',        label: 'Resumo da Operação',  icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
  { id: 'financeiro',    label: 'Financeiro',           icon: <Banknote className="w-3.5 h-3.5" /> },
  { id: 'doc-vinculado', label: 'Documento Vinculado',  icon: <Link2 className="w-3.5 h-3.5" /> },
  { id: 'documento',     label: 'Documento',            icon: <FileText className="w-3.5 h-3.5" /> },
  { id: 'participantes', label: 'Participantes',        icon: <Users className="w-3.5 h-3.5" /> },
  { id: 'vendedor-aux',  label: 'Vendedor Auxiliar',    icon: <UserCheck className="w-3.5 h-3.5" /> },
  { id: 'frete',         label: 'Frete',                icon: <Truck className="w-3.5 h-3.5" /> },
  { id: 'observacoes',   label: 'Observações',          icon: <MessageSquare className="w-3.5 h-3.5" /> },
  { id: 'deducoes',      label: 'Deduções',             icon: <Tag className="w-3.5 h-3.5" /> },
  { id: 'conversao',     label: 'Conversão De Para',    icon: <ArrowLeftRight className="w-3.5 h-3.5" /> },
  { id: 'dfe-info',      label: 'DFe Info',             icon: <Receipt className="w-3.5 h-3.5" /> },
  { id: 'dados-comp',    label: 'Dados Complementares', icon: <Database className="w-3.5 h-3.5" /> },
  { id: 'end-entrega',   label: 'Endereço de Entrega',  icon: <MapPin className="w-3.5 h-3.5" /> },
  { id: 'liberacoes',    label: 'Liberações Efetuadas', icon: <CheckSquare className="w-3.5 h-3.5" /> },
];

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ── Componente Principal ────────────────────────────────────────────────────────

export default function PedidoVenda() {
  const [view, setView] = useState<'lista' | 'novo'>('lista');
  const [abaForm, setAbaForm] = useState<AbaForm>('resumo');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Dados do banco
  const [pedidos, setPedidos] = useState<ErpPedido[]>([]);
  const [clientes, setClientes] = useState<ErpCliente[]>([]);
  const [produtos, setProdutos] = useState<ErpProduto[]>([]);
  const [naturezas, setNaturezas] = useState<ErpNaturezaOperacao[]>([]);
  const [depositos, setDepositos] = useState<ErpDeposito[]>([]);
  const [condicoes, setCondicoes] = useState<ErpCondicaoPagamento[]>([]);

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [saving, setSaving] = useState(false);

  // ── Aba: Resumo da Operação ────────────────────────────────────────────────
  const [clienteId, setClienteId] = useState('');
  const [clienteSearch, setClienteSearch] = useState('');
  const [showClienteList, setShowClienteList] = useState(false);
  const [dataEmissao, setDataEmissao] = useState(new Date().toISOString().split('T')[0]);
  const [dataEntrega, setDataEntrega] = useState('');
  const [naturezaOpId, setNaturezaOpId] = useState('');
  const [depositoId, setDepositoId] = useState('');
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [prodSearch, setProdSearch] = useState('');
  const [showProdList, setShowProdList] = useState(false);

  // ── Aba: Financeiro ───────────────────────────────────────────────────────
  const [condicaoPgtoId, setCondicaoPgtoId] = useState('');
  const [tabelaPreco, setTabelaPreco] = useState('');
  const [descontoGlobalPct, setDescontoGlobalPct] = useState('0');
  const [descontoGlobalValor, setDescontoGlobalValor] = useState('0');
  const [acrescimoValor, setAcrescimoValor] = useState('0');

  // ── Aba: Documento ────────────────────────────────────────────────────────
  const [modeloNfe, setModeloNfe] = useState<'55' | '65'>('55');
  const [serieNfe, setSerieNfe] = useState('001');
  const [ambienteNfe, setAmbienteNfe] = useState<'homologacao' | 'producao'>('homologacao');
  const [finalidadeNfe, setFinalidadeNfe] = useState('1');
  const [consumidorFinal, setConsumidorFinal] = useState('0');

  // ── Aba: Documento Vinculado ──────────────────────────────────────────────
  const [numDocRef, setNumDocRef] = useState('');

  // ── Aba: Participantes ────────────────────────────────────────────────────
  const [transportadoraNome, setTransportadoraNome] = useState('');
  const [transportadoraCnpj, setTransportadoraCnpj] = useState('');
  const [placaVeiculo, setPlacaVeiculo] = useState('');

  // ── Aba: Vendedor Auxiliar ────────────────────────────────────────────────
  const [vendedorAux, setVendedorAux] = useState('');
  const [comissaoAuxPct, setComissaoAuxPct] = useState('0');

  // ── Aba: Frete ────────────────────────────────────────────────────────────
  const [modalidadeFrete, setModalidadeFrete] = useState<'0' | '1' | '2' | '9'>('9');
  const [freteValor, setFreteValor] = useState('0');
  const [pesoBruto, setPesoBruto] = useState('0');
  const [pesoLiquido, setPesoLiquido] = useState('0');
  const [volumes, setVolumes] = useState('0');
  const [especieVolume, setEspecieVolume] = useState('');

  // ── Aba: Observações ──────────────────────────────────────────────────────
  const [observacoes, setObservacoes] = useState('');
  const [obsNfe, setObsNfe] = useState('');
  const [obsInterna, setObsInterna] = useState('');
  const [infComplementares, setInfComplementares] = useState('');

  // ── Aba: Dados Complementares ─────────────────────────────────────────────
  const [pedidoCompra, setPedidoCompra] = useState('');
  const [centroCusto, setCentroCusto] = useState('');
  const [projeto, setProjeto] = useState('');

  // ── Aba: Endereço de Entrega ──────────────────────────────────────────────
  const [endIgualCliente, setEndIgualCliente] = useState(true);
  const [endCep, setEndCep] = useState('');
  const [endLogradouro, setEndLogradouro] = useState('');
  const [endNumero, setEndNumero] = useState('');
  const [endBairro, setEndBairro] = useState('');
  const [endCidade, setEndCidade] = useState('');
  const [endUf, setEndUf] = useState('');

  // ── Carregar dados ────────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      getPedidos('VENDA').catch(() => []),
      getClientes().catch(() => []),
      getProdutos().catch(() => []),
      getNaturezasOperacao().catch(() => []),
      getCondicoesPagamento().catch(() => []),
      getDepositos().catch(() => []),
    ]).then(([peds, cls, prods, nats, conds, deps]) => {
      setPedidos(peds as ErpPedido[]);
      setClientes(cls as ErpCliente[]);
      setProdutos(prods as ErpProduto[]);
      setNaturezas(nats as ErpNaturezaOperacao[]);
      setCondicoes(conds as ErpCondicaoPagamento[]);
      setDepositos(deps as ErpDeposito[]);
    }).finally(() => setLoading(false));
  }, []);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  function resetForm() {
    setEditingId(null);
    setAbaForm('resumo');
    setClienteId(''); setClienteSearch('');
    setDataEmissao(new Date().toISOString().split('T')[0]);
    setDataEntrega('');
    setNaturezaOpId(naturezas[0]?.id ?? '');
    setDepositoId(depositos[0]?.id ?? '');
    setItens([]);
    setCondicaoPgtoId(condicoes[0]?.id ?? '');
    setTabelaPreco(''); setDescontoGlobalPct('0'); setDescontoGlobalValor('0'); setAcrescimoValor('0');
    setModeloNfe('55'); setSerieNfe('001'); setAmbienteNfe('homologacao'); setFinalidadeNfe('1'); setConsumidorFinal('0');
    setNumDocRef('');
    setTransportadoraNome(''); setTransportadoraCnpj(''); setPlacaVeiculo('');
    setVendedorAux(''); setComissaoAuxPct('0');
    setModalidadeFrete('9'); setFreteValor('0'); setPesoBruto('0'); setPesoLiquido('0'); setVolumes('0'); setEspecieVolume('');
    setObservacoes(''); setObsNfe(''); setObsInterna(''); setInfComplementares('');
    setPedidoCompra(''); setCentroCusto(''); setProjeto('');
    setEndIgualCliente(true); setEndCep(''); setEndLogradouro(''); setEndNumero(''); setEndBairro(''); setEndCidade(''); setEndUf('');
  }

  function openNovo() {
    resetForm();
    if (naturezas.length > 0) setNaturezaOpId(naturezas[0].id);
    if (depositos.length > 0) setDepositoId(depositos[0].id);
    if (condicoes.length > 0) setCondicaoPgtoId(condicoes[0].id);
    setView('novo');
  }

  // ── Cálculos ──────────────────────────────────────────────────────────────

  const totalProdutos = itens.reduce((s, i) => {
    const bruto = i.quantidade * i.preco_unitario;
    const desc = bruto * (i.desconto_item_pct / 100);
    return s + bruto - desc;
  }, 0);

  const totalIpi = itens.reduce((s, i) => {
    const bruto = i.quantidade * i.preco_unitario;
    const desc = bruto * (i.desconto_item_pct / 100);
    const base = bruto - desc;
    return s + base * (i.ipi_pct / 100);
  }, 0);

  const descGlobal = parseFloat(descontoGlobalValor) || 0;
  const acrescimo = parseFloat(acrescimoValor) || 0;
  const frete = parseFloat(freteValor) || 0;
  const totalPedido = totalProdutos - descGlobal + acrescimo + frete + totalIpi;

  // ── Adicionar produto ─────────────────────────────────────────────────────

  function addProduto(prod: ErpProduto) {
    setItens(prev => {
      const existing = prev.find(i => i.produto.id === prod.id);
      if (existing) {
        return prev.map(i => i.produto.id === prod.id
          ? { ...i, quantidade: i.quantidade + 1 }
          : i);
      }
      return [...prev, {
        produto: prod,
        quantidade: 1,
        preco_unitario: prod.preco_venda,
        desconto_item_pct: 0,
        ipi_pct: 0,
      }];
    });
    setProdSearch('');
    setShowProdList(false);
  }

  function removeItem(idx: number) {
    setItens(prev => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx: number, field: keyof Omit<ItemCarrinho, 'produto'>, value: number) {
    setItens(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  // ── Salvar pedido ─────────────────────────────────────────────────────────

  async function handleSalvar(status: 'RASCUNHO' | 'CONFIRMADO') {
    if (!clienteId) return showToast('Selecione o cliente.', false);
    if (itens.length === 0) return showToast('Adicione ao menos um item.', false);

    setSaving(true);
    try {
      const natSelecionada = naturezas.find(n => n.id === naturezaOpId);
      const pedidoPayload = {
        tipo: 'VENDA' as const,
        status,
        cliente_id: clienteId,
        vendedor_id: null,
        data_emissao: dataEmissao,
        data_entrega_prevista: dataEntrega || null,
        // Operação
        natureza_operacao_id: naturezaOpId || null,
        natureza_operacao_texto: natSelecionada?.descricao ?? '',
        deposito_id: depositoId || null,
        deposito_texto: depositos.find(d => d.id === depositoId)?.nome ?? null,
        condicao_pagamento_id: condicaoPgtoId || null,
        condicao_pagamento: condicoes.find(c => c.id === condicaoPgtoId)?.descricao ?? null,
        tabela_preco: tabelaPreco || null,
        // Totais
        desconto_global_pct: parseFloat(descontoGlobalPct) || 0,
        desconto_global_valor: descGlobal,
        acrescimo_valor: acrescimo,
        frete_valor: frete,
        total_produtos: totalProdutos,
        total_ipi: totalIpi,
        total_pedido: totalPedido,
        // Frete
        modalidade_frete: modalidadeFrete,
        transportadora_nome: transportadoraNome || null,
        transportadora_cnpj: transportadoraCnpj || null,
        placa_veiculo: placaVeiculo || null,
        peso_bruto: parseFloat(pesoBruto) || 0,
        peso_liquido: parseFloat(pesoLiquido) || 0,
        volumes: parseInt(volumes) || 0,
        especie_volume: especieVolume || null,
        // Observações
        observacoes: observacoes || null,
        obs_nfe: obsNfe || null,
        obs_interna: obsInterna || null,
        inf_complementares: infComplementares || null,
        // Vendedor auxiliar
        vendedor_auxiliar: vendedorAux || null,
        comissao_auxiliar_pct: parseFloat(comissaoAuxPct) || 0,
        // Dados complementares
        pedido_compra: pedidoCompra || null,
        centro_custo: centroCusto || null,
        projeto: projeto || null,
        // DFe
        modelo_nfe: modeloNfe,
        serie_nfe: serieNfe,
        ambiente_nfe: ambienteNfe,
        finalidade_nfe: finalidadeNfe,
        consumidor_final: consumidorFinal,
        // Endereço de entrega
        end_entrega_igual_cliente: endIgualCliente,
        end_entrega_json: endIgualCliente ? {} : {
          cep: endCep, logradouro: endLogradouro, numero: endNumero,
          bairro: endBairro, cidade: endCidade, uf: endUf,
        },
      };

      const itensPayload = itens.map(i => {
        const bruto = i.quantidade * i.preco_unitario;
        const desc = bruto * (i.desconto_item_pct / 100);
        const base = bruto - desc;
        return {
          produto_id: i.produto.id,
          quantidade: i.quantidade,
          preco_unitario: i.preco_unitario,
          desconto_item_pct: i.desconto_item_pct,
          ipi_pct: i.ipi_pct,
          ipi_valor: base * (i.ipi_pct / 100),
          total_item: base,
          cfop: natSelecionada?.cfop_padrao ?? null,
          ncm: i.produto.ncm ?? null,
          cst_icms: i.produto.cst_icms ?? null,
          unidade_medida: i.produto.unidade_medida ?? null,
          descricao_item: i.produto.nome,
        };
      });

      if (editingId) {
        await updatePedido(editingId, pedidoPayload, itensPayload);
        showToast('Pedido atualizado.', true);
      } else {
        await createPedido(pedidoPayload, itensPayload);
        showToast(status === 'CONFIRMADO' ? 'Pedido confirmado.' : 'Rascunho salvo.', true);
      }

      // Recarregar lista
      const lista = await getPedidos('VENDA');
      setPedidos(lista as ErpPedido[]);
      setView('lista');
    } catch (e) {
      showToast('Erro: ' + (e as Error).message, false);
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmar(id: string) {
    try {
      await updatePedidoStatus(id, 'CONFIRMADO');
      setPedidos(prev => prev.map(p => p.id === id ? { ...p, status: 'CONFIRMADO' } : p));
      showToast('Pedido confirmado.', true);
    } catch (e) {
      showToast('Erro: ' + (e as Error).message, false);
    }
  }

  async function handleCancelar(id: string) {
    if (!confirm('Cancelar este pedido?')) return;
    try {
      await updatePedidoStatus(id, 'CANCELADO');
      setPedidos(prev => prev.map(p => p.id === id ? { ...p, status: 'CANCELADO' } : p));
      showToast('Pedido cancelado.', true);
    } catch (e) {
      showToast('Erro: ' + (e as Error).message, false);
    }
  }

  // ── Filtros para busca ────────────────────────────────────────────────────

  const [search, setSearch] = useState('');
  const pedidosFiltrados = pedidos.filter(p =>
    p.erp_clientes?.nome.toLowerCase().includes(search.toLowerCase()) ||
    String(p.numero).includes(search)
  );

  const prodsFiltrados = produtos.filter(p =>
    p.nome.toLowerCase().includes(prodSearch.toLowerCase()) ||
    p.codigo_interno.toLowerCase().includes(prodSearch.toLowerCase())
  ).slice(0, 8);

  const clientesFiltrados = clientes.filter(c =>
    c.nome.toLowerCase().includes(clienteSearch.toLowerCase()) ||
    c.cpf_cnpj.includes(clienteSearch)
  ).slice(0, 8);

  const clienteSelecionado = clientes.find(c => c.id === clienteId);

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW: LISTA DE PEDIDOS
  // ═══════════════════════════════════════════════════════════════════════════

  if (view === 'lista') {
    return (
      <div className="p-6">
        {toast && (
          <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
            {toast.ok ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            {toast.msg}
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShoppingBag className="w-5 h-5 text-slate-600" />
              <h1 className="text-xl font-bold text-slate-900">Pedidos de Venda</h1>
            </div>
            <p className="text-sm text-slate-500">{pedidos.length} pedido(s) registrado(s)</p>
          </div>
          <button
            onClick={openNovo}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Novo Pedido
          </button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
            placeholder="Buscar por cliente ou número..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Nº</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Natureza Op.</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Emissão</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Condição Pgto</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Total</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto text-slate-400" /></td></tr>
              ) : pedidosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-14">
                    <ShoppingBag className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                    <p className="text-slate-400">Nenhum pedido encontrado.</p>
                  </td>
                </tr>
              ) : pedidosFiltrados.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-bold text-slate-700">#{p.numero}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">{p.erp_clientes?.nome ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    {p.erp_naturezas_operacao?.descricao ?? p.natureza_operacao_texto ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(p.data_emissao + 'T00:00').toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    {p.erp_condicoes_pagamento?.descricao ?? p.condicao_pagamento ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">
                    {p.total_pedido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[p.status]}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {p.status === 'RASCUNHO' && (
                        <button
                          onClick={() => handleConfirmar(p.id)}
                          className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors"
                        >
                          Confirmar
                        </button>
                      )}
                      {(p.status === 'RASCUNHO' || p.status === 'CONFIRMADO') && (
                        <button
                          onClick={() => handleCancelar(p.id)}
                          className="text-xs text-red-500 hover:text-red-700 transition-colors"
                        >
                          Cancelar
                        </button>
                      )}
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

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW: FORMULÁRIO COM 14 ABAS
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="flex h-full">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Sidebar escura das abas */}
      <div className="w-48 bg-slate-800 flex flex-col flex-shrink-0">
        <div className="px-3 py-3 border-b border-slate-700">
          <button
            onClick={() => setView('lista')}
            className="flex items-center gap-1.5 text-slate-400 hover:text-white text-xs transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Voltar
          </button>
          <p className="text-white text-sm font-semibold mt-1.5">
            {editingId ? 'Editar Pedido' : 'Novo Pedido'}
          </p>
        </div>
        <nav className="flex-1 overflow-y-auto py-1">
          {ABAS_FORM.map(aba => (
            <button
              key={aba.id}
              onClick={() => setAbaForm(aba.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors text-left ${
                abaForm === aba.id
                  ? 'bg-slate-600 text-white'
                  : 'text-slate-400 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {aba.icon}
              <span>{aba.label}</span>
            </button>
          ))}
        </nav>
        {/* Botões de ação */}
        <div className="p-3 border-t border-slate-700 space-y-2">
          <button
            onClick={() => handleSalvar('RASCUNHO')}
            disabled={saving}
            className="w-full py-1.5 text-xs rounded bg-slate-600 hover:bg-slate-500 text-white transition-colors disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'Salvar Rascunho'}
          </button>
          <button
            onClick={() => handleSalvar('CONFIRMADO')}
            disabled={saving}
            className="w-full py-1.5 text-xs rounded bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'Confirmar Pedido'}
          </button>
        </div>
      </div>

      {/* Conteúdo da aba */}
      <div className="flex-1 overflow-y-auto bg-slate-50">

        {/* ── ABA: RESUMO DA OPERAÇÃO ────────────────────────────────────────── */}
        {abaForm === 'resumo' && (
          <div className="p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-4">Resumo da Operação</h2>

            {/* Campos do cabeçalho */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {/* Natureza de Operação */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Natureza de Operação *</label>
                <div className="relative">
                  <select
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-slate-500 pr-8"
                    value={naturezaOpId}
                    onChange={e => setNaturezaOpId(e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {naturezas.map(n => (
                      <option key={n.id} value={n.id}>{n.codigo} — {n.descricao}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Depósito */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Depósito</label>
                <div className="relative">
                  <select
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-slate-500 pr-8"
                    value={depositoId}
                    onChange={e => setDepositoId(e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {depositos.map(d => (
                      <option key={d.id} value={d.id}>{d.nome}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Data de Emissão */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Data de Emissão *</label>
                <input type="date"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500"
                  value={dataEmissao}
                  onChange={e => setDataEmissao(e.target.value)}
                />
              </div>

              {/* Previsão de Entrega */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Previsão de Entrega</label>
                <input type="date"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500"
                  value={dataEntrega}
                  onChange={e => setDataEntrega(e.target.value)}
                />
              </div>

              {/* Cliente / Participante */}
              <div className="col-span-2 relative">
                <label className="block text-xs font-medium text-slate-600 mb-1">Participante (Cliente) *</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    className="w-full border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500"
                    placeholder="Buscar cliente..."
                    value={clienteSelecionado ? clienteSelecionado.nome : clienteSearch}
                    onChange={e => {
                      setClienteSearch(e.target.value);
                      setClienteId('');
                      setShowClienteList(true);
                    }}
                    onFocus={() => setShowClienteList(true)}
                  />
                  {clienteId && (
                    <button onClick={() => { setClienteId(''); setClienteSearch(''); }} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-700" />
                    </button>
                  )}
                </div>
                {showClienteList && !clienteId && clienteSearch && (
                  <div className="absolute z-20 top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {clientesFiltrados.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-slate-400">Nenhum cliente encontrado.</p>
                    ) : clientesFiltrados.map(c => (
                      <button key={c.id} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                        onClick={() => { setClienteId(c.id); setClienteSearch(''); setShowClienteList(false); }}>
                        <span className="font-medium text-slate-800">{c.nome}</span>
                        <span className="text-slate-400 ml-2">{c.cpf_cnpj}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Grid de itens */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50">
                <span className="text-xs font-bold text-slate-600 uppercase">Itens do Pedido</span>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-800 text-slate-200">
                    <th className="text-left px-3 py-2 font-medium w-8">#</th>
                    <th className="text-left px-3 py-2 font-medium">Código</th>
                    <th className="text-left px-3 py-2 font-medium">Descrição</th>
                    <th className="text-left px-3 py-2 font-medium w-16">Und</th>
                    <th className="text-right px-3 py-2 font-medium w-20">Qtde</th>
                    <th className="text-right px-3 py-2 font-medium w-24">Vl. Unit.</th>
                    <th className="text-right px-3 py-2 font-medium w-16">%Desc</th>
                    <th className="text-right px-3 py-2 font-medium w-24">Total</th>
                    <th className="text-right px-3 py-2 font-medium w-16">%IPI</th>
                    <th className="text-right px-3 py-2 font-medium w-24">$IPI</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {itens.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="text-center py-6 text-slate-400">
                        Nenhum item adicionado.
                      </td>
                    </tr>
                  ) : itens.map((item, idx) => {
                    const bruto = item.quantidade * item.preco_unitario;
                    const desc = bruto * (item.desconto_item_pct / 100);
                    const base = bruto - desc;
                    const ipiVal = base * (item.ipi_pct / 100);
                    return (
                      <tr key={item.produto.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{item.produto.codigo_interno}</td>
                        <td className="px-3 py-2 text-slate-800">{item.produto.nome}</td>
                        <td className="px-3 py-2 text-slate-500">{item.produto.unidade_medida}</td>
                        <td className="px-3 py-2 text-right">
                          <input type="number" min="0.001" step="0.001"
                            className="w-20 text-right border border-slate-200 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-slate-400"
                            value={item.quantidade}
                            onChange={e => updateItem(idx, 'quantidade', +e.target.value)}
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input type="number" min="0" step="0.01"
                            className="w-24 text-right border border-slate-200 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-slate-400"
                            value={item.preco_unitario}
                            onChange={e => updateItem(idx, 'preco_unitario', +e.target.value)}
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input type="number" min="0" max="100" step="0.1"
                            className="w-16 text-right border border-slate-200 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-slate-400"
                            value={item.desconto_item_pct}
                            onChange={e => updateItem(idx, 'desconto_item_pct', +e.target.value)}
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-slate-800">{fmtBRL(base)}</td>
                        <td className="px-3 py-2 text-right">
                          <input type="number" min="0" max="100" step="0.1"
                            className="w-16 text-right border border-slate-200 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-slate-400"
                            value={item.ipi_pct}
                            onChange={e => updateItem(idx, 'ipi_pct', +e.target.value)}
                          />
                        </td>
                        <td className="px-3 py-2 text-right text-slate-600">{fmtBRL(ipiVal)}</td>
                        <td className="px-3 py-2">
                          <button onClick={() => removeItem(idx)} className="text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Buscador de produto */}
              <div className="px-3 py-2.5 border-t border-slate-100 bg-slate-50">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    className="w-full pl-8 pr-4 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-slate-400"
                    placeholder="Adicionar produto (código ou nome)..."
                    value={prodSearch}
                    onChange={e => { setProdSearch(e.target.value); setShowProdList(true); }}
                    onFocus={() => setShowProdList(true)}
                  />
                  {showProdList && prodSearch && (
                    <div className="absolute z-20 bottom-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto mb-1">
                      {prodsFiltrados.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-slate-400">Nenhum produto encontrado.</p>
                      ) : prodsFiltrados.map(p => (
                        <button key={p.id} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                          onClick={() => addProduto(p)}>
                          <span className="font-mono text-slate-500 mr-2">{p.codigo_interno}</span>
                          <span className="font-medium text-slate-800">{p.nome}</span>
                          <span className="float-right text-slate-400">{fmtBRL(p.preco_venda)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Totais */}
            <div className="flex justify-end">
              <div className="bg-white rounded-xl border border-slate-200 p-4 w-80 space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Produtos</span>
                  <span>{fmtBRL(totalProdutos)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>IPI</span>
                  <span>{fmtBRL(totalIpi)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Desconto</span>
                  <span className="text-red-500">- {fmtBRL(descGlobal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Frete</span>
                  <span>{fmtBRL(frete)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Acréscimo</span>
                  <span>{fmtBRL(acrescimo)}</span>
                </div>
                <div className="flex justify-between font-bold text-blue-700 text-base border-t border-slate-200 pt-2 mt-2">
                  <span>Total</span>
                  <span>{fmtBRL(totalPedido)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ABA: FINANCEIRO ───────────────────────────────────────────────────── */}
        {abaForm === 'financeiro' && (
          <div className="p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-4">Financeiro</h2>
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Condição de Pagamento *</label>
                  <div className="relative">
                    <select
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-slate-500 pr-8"
                      value={condicaoPgtoId}
                      onChange={e => setCondicaoPgtoId(e.target.value)}
                    >
                      <option value="">Selecione...</option>
                      {condicoes.map(c => (
                        <option key={c.id} value={c.id}>{c.descricao}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  </div>
                  {condicaoPgtoId && condicoes.find(c => c.id === condicaoPgtoId) && (
                    <div className="mt-2 p-2 bg-slate-50 rounded-lg">
                      {condicoes.find(c => c.id === condicaoPgtoId)?.parcelas_json.map((p, i) => (
                        <p key={i} className="text-xs text-slate-500">
                          Parcela {i+1}: {p.percentual}% em {p.prazo_dias} dias
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tabela de Preço</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                    placeholder="Tabela padrão" value={tabelaPreco} onChange={e => setTabelaPreco(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Desconto Global %</label>
                  <input type="number" min="0" max="100" step="0.01"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                    value={descontoGlobalPct} onChange={e => {
                      setDescontoGlobalPct(e.target.value);
                      setDescontoGlobalValor(String((totalProdutos * parseFloat(e.target.value || '0')) / 100));
                    }} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Desconto Global R$</label>
                  <input type="number" min="0" step="0.01"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                    value={descontoGlobalValor} onChange={e => setDescontoGlobalValor(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Acréscimo R$</label>
                  <input type="number" min="0" step="0.01"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                    value={acrescimoValor} onChange={e => setAcrescimoValor(e.target.value)} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ABA: DOCUMENTO VINCULADO ──────────────────────────────────────────── */}
        {abaForm === 'doc-vinculado' && (
          <div className="p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-4">Documento Vinculado</h2>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <label className="block text-xs font-medium text-slate-600 mb-1">Nº Documento / Pedido de Compra do Cliente</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                placeholder="Ex.: PO-2024-001" value={numDocRef} onChange={e => setNumDocRef(e.target.value)} />
              <p className="text-xs text-slate-400 mt-2">Informe o número do documento do cliente referente a este pedido (pedido de compra, contrato, etc.).</p>
            </div>
          </div>
        )}

        {/* ── ABA: DOCUMENTO (DFe) ─────────────────────────────────────────────── */}
        {abaForm === 'documento' && (
          <div className="p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-4">Configuração do Documento Fiscal</h2>
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Modelo NF-e</label>
                  <div className="flex gap-3">
                    {(['55', '65'] as const).map(m => (
                      <button key={m} onClick={() => setModeloNfe(m)}
                        className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${modeloNfe === m ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-600 hover:border-slate-400'}`}>
                        {m === '55' ? 'NF-e (55)' : 'NFC-e (65)'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Série</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                    value={serieNfe} onChange={e => setSerieNfe(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Ambiente</label>
                  <div className="flex gap-3">
                    {(['homologacao', 'producao'] as const).map(a => (
                      <button key={a} onClick={() => setAmbienteNfe(a)}
                        className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${ambienteNfe === a ? (a === 'producao' ? 'bg-green-600 text-white border-green-600' : 'bg-amber-500 text-white border-amber-500') : 'border-slate-200 text-slate-600 hover:border-slate-400'}`}>
                        {a === 'homologacao' ? 'Homologação' : 'Produção'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Finalidade</label>
                  <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-500"
                    value={finalidadeNfe} onChange={e => setFinalidadeNfe(e.target.value)}>
                    <option value="1">1 — Normal</option>
                    <option value="2">2 — Complementar</option>
                    <option value="3">3 — Ajuste</option>
                    <option value="4">4 — Devolução</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Consumidor Final</label>
                <div className="flex gap-3">
                  {[['0', 'Não'], ['1', 'Sim']] .map(([v, l]) => (
                    <button key={v} onClick={() => setConsumidorFinal(v)}
                      className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${consumidorFinal === v ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-600 hover:border-slate-400'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ABA: PARTICIPANTES ────────────────────────────────────────────────── */}
        {abaForm === 'participantes' && (
          <div className="p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-4">Participantes</h2>
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              {clienteSelecionado && (
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-2">Cliente / Destinatário</p>
                  <p className="text-sm font-semibold text-slate-800">{clienteSelecionado.nome}</p>
                  <p className="text-xs text-slate-500">{clienteSelecionado.cpf_cnpj} · {clienteSelecionado.email}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Transportadora</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                    placeholder="Nome da transportadora"
                    value={transportadoraNome} onChange={e => setTransportadoraNome(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">CNPJ Transportadora</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                    placeholder="00.000.000/0000-00"
                    value={transportadoraCnpj} onChange={e => setTransportadoraCnpj(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Placa do Veículo</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                    placeholder="AAA-0000" value={placaVeiculo} onChange={e => setPlacaVeiculo(e.target.value)} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ABA: VENDEDOR AUXILIAR ────────────────────────────────────────────── */}
        {abaForm === 'vendedor-aux' && (
          <div className="p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-4">Vendedor Auxiliar</h2>
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Vendedor Auxiliar</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                    placeholder="Nome do vendedor"
                    value={vendedorAux} onChange={e => setVendedorAux(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Comissão %</label>
                  <input type="number" min="0" max="100" step="0.1"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                    value={comissaoAuxPct} onChange={e => setComissaoAuxPct(e.target.value)} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ABA: FRETE ───────────────────────────────────────────────────────── */}
        {abaForm === 'frete' && (
          <div className="p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-4">Frete</h2>
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">Modalidade de Frete</label>
                <div className="grid grid-cols-2 gap-2">
                  {([['0','0 — Emitente'], ['1','1 — Destinatário'], ['2','2 — Terceiros'], ['9','9 — Sem frete']] as [string, string][]).map(([v, l]) => (
                    <button key={v} onClick={() => setModalidadeFrete(v as '0'|'1'|'2'|'9')}
                      className={`py-2 rounded-lg border text-xs font-medium transition-colors ${modalidadeFrete === v ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-600 hover:border-slate-400'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Valor do Frete (R$)</label>
                  <input type="number" min="0" step="0.01"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                    value={freteValor} onChange={e => setFreteValor(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Espécie do Volume</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                    placeholder="Ex.: CAIXA" value={especieVolume} onChange={e => setEspecieVolume(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Peso Bruto (kg)</label>
                  <input type="number" min="0" step="0.001"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                    value={pesoBruto} onChange={e => setPesoBruto(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Peso Líquido (kg)</label>
                  <input type="number" min="0" step="0.001"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                    value={pesoLiquido} onChange={e => setPesoLiquido(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Volumes</label>
                  <input type="number" min="0" step="1"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                    value={volumes} onChange={e => setVolumes(e.target.value)} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ABA: OBSERVAÇÕES ──────────────────────────────────────────────────── */}
        {abaForm === 'observacoes' && (
          <div className="p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-4">Observações</h2>
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              {[
                ['Observações Gerais', observacoes, setObservacoes],
                ['Observações NF-e (impressa na DANFE)', obsNfe, setObsNfe],
                ['Observações Internas', obsInterna, setObsInterna],
                ['Informações Complementares (fisco)', infComplementares, setInfComplementares],
              ].map(([label, value, setter]) => (
                <div key={label as string}>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{label as string}</label>
                  <textarea rows={3}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 resize-none"
                    value={value as string}
                    onChange={e => (setter as (v: string) => void)(e.target.value)} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ABA: DEDUÇÕES ────────────────────────────────────────────────────── */}
        {abaForm === 'deducoes' && (
          <div className="p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-4">Deduções</h2>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-xs text-slate-400">Nenhuma dedução configurada. As deduções serão calculadas automaticamente pelo motor fiscal com base nas alíquotas de ICMS ST, PIS e COFINS.</p>
            </div>
          </div>
        )}

        {/* ── ABA: CONVERSÃO DE PARA ───────────────────────────────────────────── */}
        {abaForm === 'conversao' && (
          <div className="p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-4">Conversão De / Para</h2>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-xs text-slate-400">Configure regras de conversão de unidade de medida para itens específicos deste pedido (ex.: CX → UN).</p>
            </div>
          </div>
        )}

        {/* ── ABA: DFE INFO ────────────────────────────────────────────────────── */}
        {abaForm === 'dfe-info' && (
          <div className="p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-4">DFe Info</h2>
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Modelo</p>
                  <p className="font-medium text-slate-800">{modeloNfe === '55' ? 'NF-e 55' : 'NFC-e 65'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Série</p>
                  <p className="font-medium text-slate-800">{serieNfe}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Ambiente</p>
                  <p className={`font-medium ${ambienteNfe === 'producao' ? 'text-green-700' : 'text-amber-700'}`}>
                    {ambienteNfe === 'producao' ? 'Produção' : 'Homologação'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  <p className="font-medium text-slate-500">Aguardando emissão</p>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                A chave de acesso e o XML serão gerados após a emissão via Focus NFe / NFe.io em <strong>Administrativo → Empresas</strong>.
              </div>
            </div>
          </div>
        )}

        {/* ── ABA: DADOS COMPLEMENTARES ────────────────────────────────────────── */}
        {abaForm === 'dados-comp' && (
          <div className="p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-4">Dados Complementares</h2>
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Pedido de Compra do Cliente</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                    value={pedidoCompra} onChange={e => setPedidoCompra(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Centro de Custo</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                    value={centroCusto} onChange={e => setCentroCusto(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Projeto</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                    value={projeto} onChange={e => setProjeto(e.target.value)} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ABA: ENDEREÇO DE ENTREGA ──────────────────────────────────────────── */}
        {abaForm === 'end-entrega' && (
          <div className="p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-4">Endereço de Entrega</h2>
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-center gap-3">
                <input type="checkbox" id="endIgual" checked={endIgualCliente}
                  onChange={e => setEndIgualCliente(e.target.checked)} className="rounded" />
                <label htmlFor="endIgual" className="text-sm text-slate-700">Mesmo endereço do cliente</label>
              </div>
              {!endIgualCliente && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">CEP</label>
                    <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                      value={endCep} onChange={e => setEndCep(e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-600 mb-1">Logradouro</label>
                    <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                      value={endLogradouro} onChange={e => setEndLogradouro(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Número</label>
                    <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                      value={endNumero} onChange={e => setEndNumero(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Bairro</label>
                    <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                      value={endBairro} onChange={e => setEndBairro(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Cidade</label>
                    <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                      value={endCidade} onChange={e => setEndCidade(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">UF</label>
                    <input maxLength={2}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-slate-500"
                      value={endUf} onChange={e => setEndUf(e.target.value.toUpperCase())} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ABA: LIBERAÇÕES EFETUADAS ────────────────────────────────────────── */}
        {abaForm === 'liberacoes' && (
          <div className="p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-4">Liberações Efetuadas</h2>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-xs text-slate-400">Nenhuma liberação registrada. As liberações (crédito, estoque, fiscal) serão exibidas aqui conforme o fluxo de aprovação.</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
