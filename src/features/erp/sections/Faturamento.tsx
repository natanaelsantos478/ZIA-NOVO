// ─────────────────────────────────────────────────────────────────────────────
// Faturamento.tsx — Tela principal de emissão de pedidos/NF-e
// Atalhos: F2=Buscar, F3=Novo, F6=Limpar, F7=Estoque, F12=Salvar
// ─────────────────────────────────────────────────────────────────────────────
import {
  useState, useEffect, useCallback, useRef,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  Plus, Trash2, Search, X, Loader2, CheckCircle, AlertCircle,
  Package, ChevronDown, FileText, DollarSign, Truck, MessageSquare,
  User, RefreshCw, ArrowLeftRight, MapPin, ShieldCheck,
  TriangleAlert, Receipt,
} from 'lucide-react';
import {
  getTiposOperacao, getDepositos, getProdutosComEstoque,
  getPedidosFat, savePedidoFat, atualizarStatusPedido,
  verificarEstoquePedido, getPedidosCompraParaVincular,
  pedidoVazio, BRL,
  CATEGORIA_LABEL, STATUS_COLOR,
  type TipoOperacao, type Deposito, type ProdutoComEstoque,
  type ItemFat, type PedidoFat, type CheckEstoqueItem,
} from '../../../lib/faturamento';
import { getClientes, getFornecedores } from '../../../lib/erp';
import type { ErpCliente, ErpFornecedor } from '../../../lib/erp';

// ── Tipos locais ──────────────────────────────────────────────────────────────

type TabSidebar =
  | 'resumo' | 'financeiro' | 'doc-vinculado' | 'de-para'
  | 'endereco' | 'observacoes' | 'frete' | 'vendedor-aux' | 'liberacoes';

const TAB_SIDEBAR: { id: TabSidebar; label: string; icon: React.ElementType }[] = [
  { id: 'resumo',       label: 'Resumo',           icon: Receipt },
  { id: 'financeiro',   label: 'Financeiro',        icon: DollarSign },
  { id: 'doc-vinculado',label: 'Doc. Vinculado',    icon: FileText },
  { id: 'de-para',      label: 'Conversão De/Para', icon: ArrowLeftRight },
  { id: 'endereco',     label: 'End. Entrega',      icon: MapPin },
  { id: 'observacoes',  label: 'Observações',       icon: MessageSquare },
  { id: 'frete',        label: 'Frete',             icon: Truck },
  { id: 'vendedor-aux', label: 'Vendedor Auxiliar', icon: User },
  { id: 'liberacoes',   label: 'Liberações',        icon: ShieldCheck },
];

const COND_PAGTO = ['À Vista', '7 dias', '14 dias', '30 dias', '30/60', '30/60/90', 'Cartão', 'Boleto'];

function uid(): string { return Math.random().toString(36).slice(2); }

function stockBadge(disp: number, qtd: number): string {
  if (disp <= 0) return '🔴';
  if (disp < qtd) return '🟡';
  return '🟢';
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function Faturamento() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [pedido, setPedido] = useState<PedidoFat>(pedidoVazio());
  const [tiposOp, setTiposOp] = useState<TipoOperacao[]>([]);
  const [depositos, setDepositos] = useState<Deposito[]>([]);
  const [activeTab, setActiveTab] = useState<TabSidebar>('resumo');
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // participant autocomplete
  const [partSearch, setPartSearch] = useState('');
  const [partResults, setPartResults] = useState<(ErpCliente | ErpFornecedor)[]>([]);
  const [partSearching, setPartSearching] = useState(false);

  // product search
  const [prodSearch, setProdSearch] = useState('');
  const [prodResults, setProdResults] = useState<ProdutoComEstoque[]>([]);
  const [prodSearching, setProdSearching] = useState(false);
  const [showProdDrop, setShowProdDrop] = useState(false);

  // tipo op dropdown
  const [showTipoOp, setShowTipoOp] = useState(false);

  // modals
  const [modalF2, setModalF2] = useState(false);
  const [modalF7, setModalF7] = useState(false);
  const [f2Search, setF2Search] = useState('');
  const [f2Results, setF2Results] = useState<PedidoFat[]>([]);
  const [f2Loading, setF2Loading] = useState(false);
  const [f7Items, setF7Items] = useState<CheckEstoqueItem[]>([]);
  const [f7Loading, setF7Loading] = useState(false);

  // vincular PC
  const [showVincularPC, setShowVincularPC] = useState(false);
  const [pcOptions, setPcOptions] = useState<PedidoFat[]>([]);

  // confirm check
  const [checkItems, setCheckItems] = useState<CheckEstoqueItem[]>([]);
  const [showCheckModal, setShowCheckModal] = useState(false);

  const tipoOpAtual = tiposOp.find(t => t.id === pedido.tipo_operacao_id) ?? null;
  const isVenda = !tipoOpAtual || tipoOpAtual.categoria === 'VENDA' || tipoOpAtual.categoria === 'DEVOLUCAO';
  const isFuturaEstoque = tipoOpAtual?.subtipo === 'FUTURA_ESTOQUE';

  const partRef = useRef<HTMLInputElement>(null);
  const prodRef = useRef<HTMLInputElement>(null);

  // ── Load inicial ────────────────────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      getTiposOperacao().then(setTiposOp).catch(() => {}),
      getDepositos().then(setDepositos).catch(() => {}),
    ]);
  }, []);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────

  const handleKeyDown = useCallback((e: globalThis.KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      if (e.key === 'F12') { e.preventDefault(); handleSave('ORCAMENTO'); }
      return;
    }
    switch (e.key) {
      case 'F2':  e.preventDefault(); openF2(); break;
      case 'F3':  e.preventDefault(); handleNew(); break;
      case 'F6':  e.preventDefault(); handleClear(); break;
      case 'F7':  e.preventDefault(); openF7(); break;
      case 'F12': e.preventDefault(); handleSave('ORCAMENTO'); break;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedido]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // ── Participant search ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!partSearch.trim()) { setPartResults([]); return; }
    const t = setTimeout(async () => {
      setPartSearching(true);
      try {
        const results = isVenda
          ? await getClientes(partSearch)
          : await getFornecedores(partSearch);
        setPartResults(results.slice(0, 8));
      } catch { setPartResults([]); }
      finally { setPartSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [partSearch, isVenda]);

  function selectParticipante(p: ErpCliente | ErpFornecedor) {
    setPedido(prev => ({
      ...prev,
      participante_id:   p.id,
      participante_nome: p.nome,
      participante_doc:  (p as ErpCliente).cpf_cnpj ?? (p as ErpFornecedor).cnpj ?? '',
    }));
    setPartSearch(p.nome);
    setPartResults([]);
  }

  // ── Product search ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!prodSearch.trim()) { setProdResults([]); return; }
    const t = setTimeout(async () => {
      setProdSearching(true);
      try {
        const r = await getProdutosComEstoque(prodSearch);
        setProdResults(r);
        setShowProdDrop(true);
      } catch { setProdResults([]); }
      finally { setProdSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [prodSearch]);

  function addProduto(p: ProdutoComEstoque) {
    const depId = depositos[0]?.id ?? '';
    const item: ItemFat = {
      uid: uid(),
      produto_id: p.id,
      produto_codigo: p.codigo_interno,
      produto_nome: p.nome,
      unidade: p.unidade_medida,
      ncm: p.ncm,
      quantidade: 1,
      preco_unitario: p.preco_venda,
      desconto_pct: 0,
      total: p.preco_venda,
      deposito_id: depId,
      lote: '',
      numero_serie: '',
      estoque_disponivel: p.estoque_disponivel,
      controla_lote: p.controla_lote,
      controla_serie: p.controla_serie,
    };
    setPedido(prev => ({ ...prev, itens: [...prev.itens, item] }));
    setProdSearch('');
    setShowProdDrop(false);
    setProdResults([]);
  }

  function updateItem(uid: string, patch: Partial<ItemFat>) {
    setPedido(prev => ({
      ...prev,
      itens: prev.itens.map(i => {
        if (i.uid !== uid) return i;
        const updated = { ...i, ...patch };
        updated.total = updated.quantidade * updated.preco_unitario * (1 - updated.desconto_pct / 100);
        return updated;
      }),
    }));
  }

  function removeItem(uid: string) {
    setPedido(prev => ({ ...prev, itens: prev.itens.filter(i => i.uid !== uid) }));
  }

  // ── Totals ──────────────────────────────────────────────────────────────────

  const totalProdutos = pedido.itens.reduce((s, i) => s + i.total, 0);
  const descGlobal = totalProdutos * (pedido.desconto_global_pct / 100);
  const totalPedido = totalProdutos - descGlobal + pedido.frete_valor;

  // ── Actions ─────────────────────────────────────────────────────────────────

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }

  function handleNew() { setPedido(pedidoVazio()); setPartSearch(''); }

  function handleClear() {
    setPedido(prev => ({ ...pedidoVazio(), tipo_operacao_id: prev.tipo_operacao_id }));
    setPartSearch('');
  }

  async function handleSave(status: PedidoFat['status']) {
    if (!pedido.participante_id && !pedido.participante_nome) {
      showToast('Informe o participante antes de salvar.', false); return;
    }
    setSaving(true);
    try {
      const saved = await savePedidoFat({ ...pedido, status });
      setPedido(saved);
      showToast(`Pedido #${saved.numero} salvo como ${status}.`, true);
    } catch (e) {
      showToast('Erro ao salvar: ' + (e as Error).message, false);
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmar() {
    if (!pedido.id) { await handleSave('ORCAMENTO'); return; }
    if (tipoOpAtual?.exige_estoque && pedido.itens.length > 0) {
      setConfirming(true);
      try {
        const check = await verificarEstoquePedido(pedido.id);
        const semEstoque = check.filter(c => !c.disponivel);
        if (semEstoque.length > 0) {
          setCheckItems(check);
          setShowCheckModal(true);
          return;
        }
      } catch { /* fallback: confirma mesmo assim */ }
      finally { setConfirming(false); }
    }
    setSaving(true);
    try {
      await atualizarStatusPedido(pedido.id, 'CONFIRMADO');
      setPedido(prev => ({ ...prev, status: 'CONFIRMADO' }));
      showToast('Pedido confirmado!', true);
    } catch (e) {
      showToast('Erro: ' + (e as Error).message, false);
    } finally {
      setSaving(false);
    }
  }

  async function handleFaturar() {
    if (!pedido.id) return;
    if (!pedido.data_faturamento_prevista) {
      showToast('Informe a data de faturamento antes de faturar.', false); return;
    }
    setSaving(true);
    try {
      const hoje = new Date().toISOString().split('T')[0];
      await atualizarStatusPedido(pedido.id, 'FATURADO', { faturado_em: hoje });
      setPedido(prev => ({ ...prev, status: 'FATURADO', faturado_em: hoje }));
      showToast('Pedido faturado!', true);
    } catch (e) {
      showToast('Erro: ' + (e as Error).message, false);
    } finally {
      setSaving(false);
    }
  }

  // ── F2 Modal ────────────────────────────────────────────────────────────────

  function openF2() {
    setModalF2(true);
    setF2Search('');
    setF2Loading(true);
    getPedidosFat({ limit: 20 })
      .then(setF2Results)
      .finally(() => setF2Loading(false));
  }

  useEffect(() => {
    if (!modalF2 || !f2Search.trim()) return;
    const t = setTimeout(() => {
      setF2Loading(true);
      getPedidosFat({ limit: 20 })
        .then(r => setF2Results(r.filter(p =>
          String(p.numero).includes(f2Search) ||
          p.participante_nome.toLowerCase().includes(f2Search.toLowerCase())
        )))
        .finally(() => setF2Loading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [f2Search, modalF2]);

  async function selectPedidoF2(p: PedidoFat) {
    const full = await import('../../../lib/faturamento').then(m => m.getPedidoFat(p.id!));
    if (full) { setPedido(full); setPartSearch(full.participante_nome); }
    setModalF2(false);
  }

  // ── F7 Modal ────────────────────────────────────────────────────────────────

  async function openF7() {
    setModalF7(true);
    if (!pedido.id) { setF7Items([]); return; }
    setF7Loading(true);
    try {
      const check = await verificarEstoquePedido(pedido.id);
      setF7Items(check);
    } catch { setF7Items([]); }
    finally { setF7Loading(false); }
  }

  // ── Vincular PC ─────────────────────────────────────────────────────────────

  async function openVincularPC() {
    const prodIds = pedido.itens.map(i => i.produto_id);
    const pcs = await getPedidosCompraParaVincular(prodIds);
    setPcOptions(pcs);
    setShowVincularPC(true);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const statusColor = {
    ORCAMENTO: 'bg-slate-100 text-slate-600',
    CONFIRMADO: 'bg-blue-100 text-blue-700',
    FATURADO: 'bg-green-100 text-green-700',
    ENTREGUE: 'bg-emerald-100 text-emerald-700',
    CANCELADO: 'bg-red-100 text-red-600',
  }[pedido.status];

  return (
    <div className="flex h-full overflow-hidden bg-slate-50">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white max-w-sm ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* ── Sidebar esquerda ─────────────────────────────────────────────── */}
      <aside className="w-52 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
        <div className="px-3 py-3 border-b border-slate-100">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Informações</p>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
          {TAB_SIDEBAR.map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs transition-all ${
                  activeTab === t.id
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{t.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Atalhos */}
        <div className="p-3 border-t border-slate-100 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Atalhos</p>
          {[['F2','Buscar'],['F3','Novo'],['F6','Limpar'],['F7','Estoque'],['F12','Salvar']].map(([k,l]) => (
            <div key={k} className="flex items-center justify-between">
              <kbd className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono">{k}</kbd>
              <span className="text-[10px] text-slate-500">{l}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Área principal ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Toolbar */}
        <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-2 flex-shrink-0">
          <Receipt className="w-4 h-4 text-emerald-600" />
          <span className="font-bold text-slate-800 text-sm">Faturamento</span>
          {pedido.numero && (
            <span className="text-xs text-slate-500 font-mono">#{pedido.numero}</span>
          )}
          <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
            {pedido.status}
          </span>
          <div className="flex-1" />
          <button onClick={openF2} className="flex items-center gap-1.5 text-xs border border-slate-200 hover:border-slate-300 px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-800 transition-colors">
            <Search className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Buscar</span> <kbd className="text-[10px] font-mono text-slate-400">F2</kbd>
          </button>
          <button onClick={handleNew} className="flex items-center gap-1.5 text-xs border border-slate-200 hover:border-slate-300 px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-800 transition-colors">
            <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Novo</span> <kbd className="text-[10px] font-mono text-slate-400">F3</kbd>
          </button>
          <button onClick={handleClear} className="flex items-center gap-1.5 text-xs border border-slate-200 hover:border-slate-300 px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-800 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Limpar</span> <kbd className="text-[10px] font-mono text-slate-400">F6</kbd>
          </button>
          <button onClick={openF7} className="flex items-center gap-1.5 text-xs border border-slate-200 hover:border-slate-300 px-2.5 py-1.5 rounded-lg text-slate-600 hover:text-slate-800 transition-colors">
            <Package className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Estoque</span> <kbd className="text-[10px] font-mono text-slate-400">F7</kbd>
          </button>

          {/* Confirmar */}
          {pedido.status === 'ORCAMENTO' && (
            <button
              onClick={handleConfirmar}
              disabled={confirming || saving}
              className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
            >
              {confirming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              Confirmar
            </button>
          )}

          {/* Faturar */}
          {pedido.status === 'CONFIRMADO' && (
            <button
              onClick={handleFaturar}
              disabled={saving}
              className="flex items-center gap-1.5 text-xs bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Receipt className="w-3.5 h-3.5" />}
              Faturar
            </button>
          )}

          {/* Salvar */}
          <button
            onClick={() => handleSave(pedido.status === 'ORCAMENTO' ? 'ORCAMENTO' : pedido.status)}
            disabled={saving}
            className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
            Salvar <kbd className="text-[10px] font-mono opacity-75 ml-1">F12</kbd>
          </button>
        </div>

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">

          {/* Header do pedido */}
          <div className="bg-white border-b border-slate-200 px-4 py-3">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

              {/* Tipo de Operação */}
              <div className="col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Tipo de Operação
                </label>
                <div className="relative">
                  <button
                    onClick={() => setShowTipoOp(!showTipoOp)}
                    className="w-full flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2 text-sm text-left hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    {tipoOpAtual ? (
                      <>
                        <span className="font-mono text-xs text-slate-500">{tipoOpAtual.codigo}</span>
                        <span className="flex-1 truncate">{tipoOpAtual.nome}</span>
                        <span className="text-xs px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded font-medium">
                          {CATEGORIA_LABEL[tipoOpAtual.categoria]}
                        </span>
                      </>
                    ) : (
                      <span className="text-slate-400 flex-1">Selecione o tipo de operação...</span>
                    )}
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  </button>
                  {showTipoOp && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                      <div className="max-h-56 overflow-y-auto custom-scrollbar">
                        {tiposOp.length === 0 ? (
                          <p className="text-sm text-slate-400 p-3">Nenhum tipo cadastrado. Configure em Tipos de Operação.</p>
                        ) : tiposOp.map(t => (
                          <button
                            key={t.id}
                            onClick={() => {
                              setPedido(prev => ({ ...prev, tipo_operacao_id: t.id, tipo: t.categoria, subtipo: t.subtipo }));
                              setShowTipoOp(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 text-left"
                          >
                            <span className="font-mono text-xs text-slate-500 w-10 flex-shrink-0">{t.codigo}</span>
                            <span className="flex-1 truncate">{t.nome}</span>
                            <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">{CATEGORIA_LABEL[t.categoria]}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Data Emissão */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Data Emissão
                </label>
                <input
                  type="date"
                  value={pedido.data_emissao}
                  onChange={e => setPedido(prev => ({ ...prev, data_emissao: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Data Faturamento */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Previsão Faturamento
                </label>
                <input
                  type="date"
                  value={pedido.data_faturamento_prevista}
                  onChange={e => setPedido(prev => ({ ...prev, data_faturamento_prevista: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Participante */}
            <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="col-span-2 relative">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  {isVenda ? 'Cliente' : 'Fornecedor'}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  {partSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 animate-spin" />}
                  <input
                    ref={partRef}
                    type="text"
                    value={partSearch}
                    onChange={e => {
                      setPartSearch(e.target.value);
                      if (!e.target.value) setPedido(prev => ({ ...prev, participante_id: null, participante_nome: '', participante_doc: '' }));
                    }}
                    placeholder={`Buscar ${isVenda ? 'cliente' : 'fornecedor'}...`}
                    className="w-full pl-9 pr-9 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                {partResults.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                    {partResults.map(p => (
                      <button
                        key={p.id}
                        onClick={() => selectParticipante(p)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 text-left"
                      >
                        <span className="flex-1 font-medium truncate">{p.nome}</span>
                        <span className="text-xs text-slate-400 truncate">{(p as ErpCliente).cpf_cnpj ?? (p as ErpFornecedor).cnpj}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  CPF / CNPJ
                </label>
                <input
                  type="text"
                  value={pedido.participante_doc}
                  readOnly
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Cond. Pagamento
                </label>
                <select
                  value={pedido.condicao_pagamento}
                  onChange={e => setPedido(prev => ({ ...prev, condicao_pagamento: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  {COND_PAGTO.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* ── Painel central: conteúdo da tab ─────────────────────────── */}
          <div className="flex gap-0">

            {/* Grid de itens (sempre visível) */}
            <div className="flex-1 min-w-0">

              {/* Vincular PC (só para FUTURA_ESTOQUE) */}
              {isFuturaEstoque && (
                <div className="px-4 pt-3">
                  <button
                    onClick={openVincularPC}
                    className="flex items-center gap-2 text-xs border border-blue-200 text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Vincular a Pedido de Compra
                    {pedido.pedido_compra_vinculado_id && (
                      <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-medium">Vinculado</span>
                    )}
                  </button>
                </div>
              )}

              {/* Busca de produto */}
              <div className="px-4 pt-3 pb-2 relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  {prodSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 animate-spin" />}
                  <input
                    ref={prodRef}
                    type="text"
                    value={prodSearch}
                    onChange={e => setProdSearch(e.target.value)}
                    onFocus={() => prodResults.length > 0 && setShowProdDrop(true)}
                    placeholder="Adicionar produto (código ou nome)..."
                    className="w-full pl-9 pr-9 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                {showProdDrop && prodResults.length > 0 && (
                  <div className="absolute z-20 left-4 right-4 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                    <div className="max-h-48 overflow-y-auto custom-scrollbar">
                      {prodResults.map(p => {
                        const badge = stockBadge(p.estoque_disponivel, 1);
                        return (
                          <button
                            key={p.id}
                            onClick={() => addProduto(p)}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50 text-left"
                          >
                            <span className="font-mono text-xs text-slate-400 w-16 flex-shrink-0">{p.codigo_interno}</span>
                            <span className="flex-1 truncate">{p.nome}</span>
                            <span className="text-xs text-slate-400">{p.unidade_medida}</span>
                            <span className="text-xs font-medium text-slate-700">{BRL(p.preco_venda)}</span>
                            <span className="text-sm">{badge}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Tabela de itens */}
              <div className="px-4 pb-4">
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left px-3 py-2 text-slate-500 font-semibold w-6">#</th>
                        <th className="text-left px-3 py-2 text-slate-500 font-semibold">Produto</th>
                        <th className="text-center px-2 py-2 text-slate-500 font-semibold w-8">Est.</th>
                        <th className="text-right px-2 py-2 text-slate-500 font-semibold w-20">Qtd</th>
                        <th className="text-right px-2 py-2 text-slate-500 font-semibold w-24">Preço Unit.</th>
                        <th className="text-right px-2 py-2 text-slate-500 font-semibold w-16">Desc%</th>
                        <th className="text-right px-2 py-2 text-slate-500 font-semibold w-24">Total</th>
                        <th className="text-left px-2 py-2 text-slate-500 font-semibold w-28">Depósito</th>
                        <th className="px-2 py-2 w-8" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pedido.itens.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="text-center py-10 text-slate-400">
                            <Package className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                            Nenhum item adicionado. Busque um produto acima.
                          </td>
                        </tr>
                      ) : pedido.itens.map((item, idx) => (
                        <tr key={item.uid} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-1.5 text-slate-400">{idx + 1}</td>
                          <td className="px-3 py-1.5">
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-800 truncate max-w-[200px]">{item.produto_nome}</span>
                              <span className="text-slate-400 text-[10px]">{item.produto_codigo} · {item.unidade}</span>
                              {(item.controla_lote || item.controla_serie) && (
                                <div className="flex gap-2 mt-0.5">
                                  {item.controla_lote && (
                                    <input
                                      type="text"
                                      placeholder="Lote"
                                      value={item.lote}
                                      onChange={e => updateItem(item.uid, { lote: e.target.value })}
                                      className="w-24 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-emerald-400"
                                    />
                                  )}
                                  {item.controla_serie && (
                                    <input
                                      type="text"
                                      placeholder="Série"
                                      value={item.numero_serie}
                                      onChange={e => updateItem(item.uid, { numero_serie: e.target.value })}
                                      className="w-24 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-emerald-400"
                                    />
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-1.5 text-center text-sm">
                            {stockBadge(item.estoque_disponivel, item.quantidade)}
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              min="0.001"
                              step="0.001"
                              value={item.quantidade}
                              onChange={e => updateItem(item.uid, { quantidade: Number(e.target.value) })}
                              className="w-full text-right border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.preco_unitario}
                              onChange={e => updateItem(item.uid, { preco_unitario: Number(e.target.value) })}
                              className="w-full text-right border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={item.desconto_pct}
                              onChange={e => updateItem(item.uid, { desconto_pct: Number(e.target.value) })}
                              className="w-full text-right border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                            />
                          </td>
                          <td className="px-2 py-1.5 text-right font-semibold text-slate-800">
                            {BRL(item.total)}
                          </td>
                          <td className="px-2 py-1.5">
                            <select
                              value={item.deposito_id}
                              onChange={e => updateItem(item.uid, { deposito_id: e.target.value })}
                              className="w-full border border-slate-200 rounded px-1.5 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-emerald-400 bg-white"
                            >
                              <option value="">—</option>
                              {depositos.map(d => (
                                <option key={d.id} value={d.id}>{d.nome}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-2 py-1.5">
                            <button
                              onClick={() => removeItem(item.uid)}
                              className="text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totais */}
                {pedido.itens.length > 0 && (
                  <div className="mt-3 flex justify-end">
                    <div className="bg-white border border-slate-200 rounded-xl p-4 min-w-[280px] space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Subtotal Produtos</span>
                        <span className="font-medium">{BRL(totalProdutos)}</span>
                      </div>
                      <div className="flex justify-between text-sm items-center gap-2">
                        <span className="text-slate-500">Desconto Global</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number" min="0" max="100" step="0.1"
                            value={pedido.desconto_global_pct}
                            onChange={e => setPedido(prev => ({ ...prev, desconto_global_pct: Number(e.target.value) }))}
                            className="w-16 text-right border border-slate-200 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                          />
                          <span className="text-xs text-slate-400">%</span>
                          <span className="font-medium text-red-600">-{BRL(descGlobal)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between text-sm items-center gap-2">
                        <span className="text-slate-500">Frete</span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-slate-400">R$</span>
                          <input
                            type="number" min="0" step="0.01"
                            value={pedido.frete_valor}
                            onChange={e => setPedido(prev => ({ ...prev, frete_valor: Number(e.target.value) }))}
                            className="w-20 text-right border border-slate-200 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-400"
                          />
                        </div>
                      </div>
                      <div className="flex justify-between font-bold text-base border-t border-slate-100 pt-2 mt-2">
                        <span className="text-slate-800">Total</span>
                        <span className="text-emerald-700">{BRL(totalPedido)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Painel lateral de abas ──────────────────────────────── */}
              <div className="mx-4 mb-4 bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                  <p className="text-xs font-bold text-slate-600">
                    {TAB_SIDEBAR.find(t => t.id === activeTab)?.label}
                  </p>
                </div>
                <div className="p-4">
                  <TabContent
                    tab={activeTab}
                    pedido={pedido}
                    onChange={patch => setPedido(prev => ({ ...prev, ...patch }))}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal F2 — Buscar pedido ──────────────────────────────────────── */}
      {modalF2 && (
        <Modal title="Buscar Pedido (F2)" onClose={() => setModalF2(false)} wide>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              autoFocus
              type="text"
              value={f2Search}
              onChange={e => setF2Search(e.target.value)}
              placeholder="Número ou participante..."
              className="w-full pl-9 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          {f2Loading ? (
            <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-300" /></div>
          ) : (
            <div className="space-y-1 max-h-72 overflow-y-auto custom-scrollbar">
              {f2Results.map(p => (
                <button
                  key={p.id}
                  onClick={() => selectPedidoF2(p)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 text-left text-sm"
                >
                  <span className="font-mono text-xs text-slate-400 w-12">#{p.numero}</span>
                  <span className="flex-1 font-medium truncate">{p.participante_nome || '(sem participante)'}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[p.status]}`}>{p.status}</span>
                  <span className="text-slate-600 font-semibold">{BRL(p.total_pedido)}</span>
                </button>
              ))}
              {!f2Loading && f2Results.length === 0 && (
                <p className="text-center text-slate-400 py-6">Nenhum pedido encontrado.</p>
              )}
            </div>
          )}
        </Modal>
      )}

      {/* ── Modal F7 — Estoque ────────────────────────────────────────────── */}
      {modalF7 && (
        <Modal title="Consulta de Estoque (F7)" onClose={() => setModalF7(false)} wide>
          {f7Loading ? (
            <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-300" /></div>
          ) : f7Items.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Package className="w-10 h-10 mx-auto mb-2 text-slate-200" />
              {pedido.id ? 'Nenhum dado de estoque disponível.' : 'Salve o pedido primeiro para verificar o estoque.'}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-3 py-2 text-slate-500 text-xs font-semibold">Produto</th>
                  <th className="text-right px-3 py-2 text-slate-500 text-xs font-semibold">Pedido</th>
                  <th className="text-right px-3 py-2 text-slate-500 text-xs font-semibold">Disponível</th>
                  <th className="text-center px-3 py-2 text-slate-500 text-xs font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {f7Items.map(c => (
                  <tr key={c.produto_id}>
                    <td className="px-3 py-2 font-medium text-slate-800">{c.produto_nome}</td>
                    <td className="px-3 py-2 text-right">{c.quantidade_pedida}</td>
                    <td className="px-3 py-2 text-right">{c.estoque_disponivel}</td>
                    <td className="px-3 py-2 text-center text-lg">
                      {c.disponivel ? '🟢' : c.estoque_disponivel > 0 ? '🟡' : '🔴'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Modal>
      )}

      {/* ── Modal Check Estoque — antes de confirmar ──────────────────────── */}
      {showCheckModal && (
        <Modal title="Estoque insuficiente" onClose={() => setShowCheckModal(false)}>
          <div className="flex items-start gap-3 mb-4">
            <TriangleAlert className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-slate-700">
              Alguns itens não possuem estoque disponível suficiente.
              Deseja confirmar o pedido mesmo assim?
            </p>
          </div>
          <div className="space-y-1 mb-4 max-h-48 overflow-y-auto">
            {checkItems.filter(c => !c.disponivel).map(c => (
              <div key={c.produto_id} className="flex justify-between text-sm px-3 py-1.5 bg-red-50 rounded-lg">
                <span className="text-slate-800 truncate">{c.produto_nome}</span>
                <span className="text-red-600 font-medium ml-2">
                  Pedido: {c.quantidade_pedida} | Disp: {c.estoque_disponivel}
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowCheckModal(false)}
              className="px-4 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600"
            >
              Cancelar
            </button>
            <button
              onClick={async () => {
                setShowCheckModal(false);
                if (!pedido.id) return;
                setSaving(true);
                try {
                  await atualizarStatusPedido(pedido.id, 'CONFIRMADO');
                  setPedido(prev => ({ ...prev, status: 'CONFIRMADO' }));
                  showToast('Pedido confirmado (com restrição de estoque).', true);
                } catch (e) {
                  showToast('Erro: ' + (e as Error).message, false);
                } finally { setSaving(false); }
              }}
              className="px-4 py-2 text-sm bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium"
            >
              Confirmar mesmo assim
            </button>
          </div>
        </Modal>
      )}

      {/* ── Modal Vincular PC ─────────────────────────────────────────────── */}
      {showVincularPC && (
        <Modal title="Vincular Pedido de Compra" onClose={() => setShowVincularPC(false)} wide>
          {pcOptions.length === 0 ? (
            <p className="text-center text-slate-400 py-6">
              Nenhum Pedido de Compra compatível encontrado.
            </p>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto custom-scrollbar">
              {pcOptions.map(pc => (
                <button
                  key={pc.id}
                  onClick={() => {
                    setPedido(prev => ({ ...prev, pedido_compra_vinculado_id: pc.id! }));
                    setShowVincularPC(false);
                    showToast(`Vinculado ao PC #${pc.numero}.`, true);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 text-left text-sm ${
                    pedido.pedido_compra_vinculado_id === pc.id ? 'bg-blue-50 border border-blue-200' : ''
                  }`}
                >
                  <span className="font-mono text-xs text-slate-400">#{pc.numero}</span>
                  <span className="flex-1 font-medium truncate">{pc.participante_nome || '—'}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[pc.status]}`}>{pc.status}</span>
                  <span className="text-slate-700 font-semibold">{BRL(pc.total_pedido)}</span>
                </button>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

// ── TabContent ────────────────────────────────────────────────────────────────

interface TabContentProps {
  tab: TabSidebar;
  pedido: PedidoFat;
  onChange: (patch: Partial<PedidoFat>) => void;
}

function TabContent({ tab, pedido, onChange }: TabContentProps) {
  switch (tab) {
    case 'resumo':
      return (
        <div className="space-y-2 text-sm">
          <Row label="Nº Pedido" value={pedido.numero ? `#${pedido.numero}` : '—'} />
          <Row label="Status" value={pedido.status} />
          <Row label="Participante" value={pedido.participante_nome || '—'} />
          <Row label="Emissão" value={pedido.data_emissao ? new Date(pedido.data_emissao + 'T00:00').toLocaleDateString('pt-BR') : '—'} />
          <Row label="Itens" value={String(pedido.itens.length)} />
          <Row label="Total" value={BRL(pedido.total_pedido)} bold />
        </div>
      );

    case 'financeiro':
      return (
        <div className="space-y-3">
          <Field label="Cond. Pagamento">
            <input
              type="text"
              value={pedido.condicao_pagamento}
              onChange={e => onChange({ condicao_pagamento: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </Field>
          <Field label="Desconto Global (%)">
            <input type="number" min="0" max="100" step="0.1"
              value={pedido.desconto_global_pct}
              onChange={e => onChange({ desconto_global_pct: Number(e.target.value) })}
              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </Field>
          <Field label="Data Prev. Faturamento">
            <input type="date"
              value={pedido.data_faturamento_prevista}
              onChange={e => onChange({ data_faturamento_prevista: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </Field>
        </div>
      );

    case 'doc-vinculado':
      return (
        <div className="space-y-3">
          <Field label="Pedido de Compra vinculado">
            <input
              type="text"
              readOnly
              value={pedido.pedido_compra_vinculado_id ?? ''}
              placeholder="Nenhum"
              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-slate-50 text-slate-500"
            />
          </Field>
          {pedido.pedido_compra_vinculado_id && (
            <button
              onClick={() => onChange({ pedido_compra_vinculado_id: null })}
              className="text-xs text-red-500 hover:underline"
            >
              Remover vínculo
            </button>
          )}
          <Field label="Nº NF Vinculada">
            <input
              type="text"
              placeholder="Ex: NF-e 123456"
              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </Field>
        </div>
      );

    case 'de-para': {
      const items = pedido.conversao_de_para_json;
      return (
        <div className="space-y-2">
          <p className="text-xs text-slate-500 mb-2">Conversão de unidades para este pedido.</p>
          {items.map((row, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input value={row.de} placeholder="De"
                onChange={e => {
                  const n = [...items]; n[i] = { ...n[i], de: e.target.value };
                  onChange({ conversao_de_para_json: n });
                }}
                className="flex-1 border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none"
              />
              <ArrowLeftRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
              <input value={row.para} placeholder="Para"
                onChange={e => {
                  const n = [...items]; n[i] = { ...n[i], para: e.target.value };
                  onChange({ conversao_de_para_json: n });
                }}
                className="flex-1 border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none"
              />
              <input type="number" value={row.fator} placeholder="Fator"
                onChange={e => {
                  const n = [...items]; n[i] = { ...n[i], fator: Number(e.target.value) };
                  onChange({ conversao_de_para_json: n });
                }}
                className="w-16 border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none"
              />
              <button onClick={() => onChange({ conversao_de_para_json: items.filter((_, j) => j !== i) })}
                className="text-slate-300 hover:text-red-500">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <button
            onClick={() => onChange({ conversao_de_para_json: [...items, { de: '', para: '', fator: 1 }] })}
            className="flex items-center gap-1 text-xs text-emerald-600 hover:underline mt-1"
          >
            <Plus className="w-3 h-3" /> Adicionar conversão
          </button>
        </div>
      );
    }

    case 'endereco':
      return (
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={pedido.end_entrega_igual}
              onChange={e => onChange({ end_entrega_igual: e.target.checked })}
              className="rounded"
            />
            <span>Mesmo endereço do participante</span>
          </label>
          {!pedido.end_entrega_igual && (
            <div className="space-y-2">
              {(['cep','logradouro','numero','complemento','bairro','cidade','uf'] as const).map(f => (
                <Field key={f} label={f.toUpperCase()}>
                  <input
                    type="text"
                    value={pedido.end_entrega_json[f] ?? ''}
                    onChange={e => onChange({ end_entrega_json: { ...pedido.end_entrega_json, [f]: e.target.value } })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </Field>
              ))}
            </div>
          )}
        </div>
      );

    case 'observacoes':
      return (
        <div className="space-y-3">
          <Field label="Observações NF-e">
            <textarea
              value={pedido.obs_nfe}
              onChange={e => onChange({ obs_nfe: e.target.value })}
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </Field>
          <Field label="Observações Internas">
            <textarea
              value={pedido.obs_interna}
              onChange={e => onChange({ obs_interna: e.target.value })}
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </Field>
          <Field label="Inf. Complementares">
            <textarea
              value={pedido.inf_complementares}
              onChange={e => onChange({ inf_complementares: e.target.value })}
              rows={2}
              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
          </Field>
        </div>
      );

    case 'frete':
      return (
        <div className="space-y-3">
          <Field label="Modalidade">
            <select
              value={pedido.frete_modalidade}
              onChange={e => onChange({ frete_modalidade: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              {['SEM_FRETE','CIF','FOB','TERCEIROS','DESTINATARIO'].map(v => (
                <option key={v} value={v}>{v.replace('_', ' ')}</option>
              ))}
            </select>
          </Field>
          <Field label="Valor Frete">
            <input type="number" min="0" step="0.01"
              value={pedido.frete_valor}
              onChange={e => onChange({ frete_valor: Number(e.target.value) })}
              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </Field>
          <Field label="Transportadora">
            <input type="text"
              value={pedido.transportadora_nome}
              onChange={e => onChange({ transportadora_nome: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </Field>
          <Field label="CNPJ Transportadora">
            <input type="text"
              value={pedido.transportadora_cnpj}
              onChange={e => onChange({ transportadora_cnpj: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </Field>
          <div className="flex gap-2">
            <Field label="Placa">
              <input type="text"
                value={pedido.placa_veiculo}
                onChange={e => onChange({ placa_veiculo: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </Field>
            <Field label="Peso Bruto">
              <input type="number" min="0" step="0.001"
                value={pedido.peso_bruto}
                onChange={e => onChange({ peso_bruto: Number(e.target.value) })}
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </Field>
          </div>
        </div>
      );

    case 'vendedor-aux':
      return (
        <div className="space-y-3">
          <Field label="Nome Vendedor Auxiliar">
            <input type="text"
              value={pedido.vendedor_auxiliar}
              onChange={e => onChange({ vendedor_auxiliar: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </Field>
          <Field label="Comissão (%)">
            <input type="number" min="0" max="100" step="0.1"
              value={pedido.comissao_auxiliar_pct}
              onChange={e => onChange({ comissao_auxiliar_pct: Number(e.target.value) })}
              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </Field>
        </div>
      );

    case 'liberacoes':
      return (
        <div className="text-center py-6 text-slate-400">
          <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-slate-200" />
          <p className="text-sm">Nenhuma liberação registrada.</p>
          <p className="text-xs mt-1">As liberações aparecerão aqui após aprovação gerencial.</p>
        </div>
      );

    default:
      return null;
  }
}

// ── Helpers de UI ─────────────────────────────────────────────────────────────

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-slate-500 text-xs">{label}</span>
      <span className={`text-right text-xs ${bold ? 'font-bold text-emerald-700' : 'font-medium text-slate-800'}`}>{value}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

function Modal({ title, onClose, children, wide }: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-2xl shadow-2xl flex flex-col max-h-[80vh] w-full mx-4 ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 flex-shrink-0">
          <h2 className="font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto custom-scrollbar flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}

