// ─────────────────────────────────────────────────────────────────────────────
// Caixa — PDV (Ponto de Venda)
// Seleção de operador → Abertura de sessão → Venda → Pagamento (maquininha ready)
// Dados estruturados para uso por todos os módulos (RH, SCM, etc.)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  User, Building2, Shield, Users, LogOut, Search, Plus, Minus, Trash2,
  CreditCard, Banknote, Smartphone, Tag, ShoppingCart, CheckCircle,
  X, ChevronRight, Package, ReceiptText, Clock, BarChart3,
  Zap, AlertCircle, RefreshCw,
} from 'lucide-react';
import {
  useProfiles,
  LEVEL_LABELS,
  type OperatorProfile,
  type AccessLevel,
} from '../../../context/ProfileContext';
import {
  defaultPaymentService,
  centsToBRL,
  BRLToCents,
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
  type CashSession,
  type SaleItem,
  type PaymentSplit,
} from '../../../lib/payment';

// ── Mock de produtos ──────────────────────────────────────────────────────────

interface Product {
  id: string;
  code: string;
  barcode?: string;
  name: string;
  unit: string;
  price: number; // centavos
  stock: number;
  group: string;
}

const MOCK_PRODUCTS: Product[] = [
  { id: 'p1', code: '001', barcode: '7891000315507', name: 'Café Solúvel 200g',     unit: 'UN', price: 1590, stock: 48, group: 'Alimentação' },
  { id: 'p2', code: '002', barcode: '7891000100103', name: 'Suco de Laranja 1L',    unit: 'UN', price: 890,  stock: 30, group: 'Bebidas'      },
  { id: 'p3', code: '003', barcode: '7896004604185', name: 'Água Mineral 500ml',    unit: 'UN', price: 250,  stock: 120,group: 'Bebidas'      },
  { id: 'p4', code: '004', barcode: '7891149108782', name: 'Biscoito Recheado 130g',unit: 'UN', price: 380,  stock: 60, group: 'Alimentação' },
  { id: 'p5', code: '005', barcode: '7896183303050', name: 'Sabão em Pó 1kg',       unit: 'UN', price: 1290, stock: 25, group: 'Limpeza'      },
  { id: 'p6', code: '006', barcode: '7891048014161', name: 'Shampoo 400ml',          unit: 'UN', price: 2190, stock: 18, group: 'Higiene'      },
  { id: 'p7', code: '007', barcode: '7891234567890', name: 'Caneta BIC Azul',        unit: 'UN', price: 199,  stock: 200,group: 'Papelaria'   },
  { id: 'p8', code: '008', barcode: '7890112345678', name: 'Caderno 96fls',          unit: 'UN', price: 1490, stock: 35, group: 'Papelaria'   },
];

// ── Tipos internos ────────────────────────────────────────────────────────────

interface CartItem extends SaleItem {
  cartId: string;
  productRef: Product;
}

type CaixaView = 'operator-select' | 'open-session' | 'pdv' | 'payment' | 'success';

const LEVEL_ICON_MAP: Record<AccessLevel, React.ElementType> = {
  1: Building2,
  2: Shield,
  3: Users,
  4: User,
};

// ── Componente principal ──────────────────────────────────────────────────────

export default function Caixa() {
  const { profiles } = useProfiles();

  const [view, setView] = useState<CaixaView>('operator-select');
  const [operator, setOperator] = useState<OperatorProfile | null>(null);
  const [session, setSession] = useState<CashSession | null>(null);

  // Carrinho
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Pagamento
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('dinheiro');
  const [installments, setInstallments] = useState(1);
  const [cashReceived, setCashReceived] = useState('');
  const [payments, setPayments] = useState<PaymentSplit[]>([]);
  const [processing, setProcessing] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<string>('');

  // Sessão stats
  const [sessionStats, setSessionStats] = useState({
    totalSales: 0, saleCount: 0,
    totalCash: 0, totalCredit: 0, totalDebit: 0, totalPix: 0, totalVoucher: 0,
  });

  // ── Busca de produtos ───────────────────────────────────────────────────────

  const doSearch = useCallback((q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    const lower = q.toLowerCase();
    setSearchResults(
      MOCK_PRODUCTS.filter(p =>
        p.name.toLowerCase().includes(lower) ||
        p.code.includes(lower) ||
        (p.barcode ?? '').includes(lower)
      ).slice(0, 8)
    );
  }, []);

  useEffect(() => { doSearch(search); }, [search, doSearch]);

  // Atalho F2 para focar busca, ESC para limpar
  useEffect(() => {
    if (view !== 'pdv') return;
    function handler(e: KeyboardEvent) {
      if (e.key === 'F2') { e.preventDefault(); searchRef.current?.focus(); setShowSearch(true); }
      if (e.key === 'Escape') { setSearch(''); setShowSearch(false); }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [view]);

  // ── Carrinho ────────────────────────────────────────────────────────────────

  function addToCart(p: Product) {
    setCart(prev => {
      const existing = prev.find(i => i.productId === p.id);
      if (existing) {
        return prev.map(i =>
          i.productId === p.id
            ? { ...i, quantity: i.quantity + 1, totalPrice: (i.quantity + 1) * i.unitPrice }
            : i
        );
      }
      const item: CartItem = {
        cartId: `cart-${Date.now()}-${p.id}`,
        productId: p.id,
        productCode: p.code,
        productName: p.name,
        unit: p.unit,
        quantity: 1,
        unitPrice: p.price,
        discountPct: 0,
        totalPrice: p.price,
        productRef: p,
      };
      return [...prev, item];
    });
    setSearch('');
    setShowSearch(false);
  }

  function updateQty(cartId: string, qty: number) {
    if (qty <= 0) {
      setCart(prev => prev.filter(i => i.cartId !== cartId));
    } else {
      setCart(prev => prev.map(i =>
        i.cartId === cartId
          ? { ...i, quantity: qty, totalPrice: qty * i.unitPrice * (1 - i.discountPct / 100) }
          : i
      ));
    }
  }

  function updateDiscount(cartId: string, pct: number) {
    const d = Math.min(100, Math.max(0, pct));
    setCart(prev => prev.map(i =>
      i.cartId === cartId
        ? { ...i, discountPct: d, totalPrice: Math.round(i.quantity * i.unitPrice * (1 - d / 100)) }
        : i
    ));
  }

  const subtotalCents = cart.reduce((s, i) => s + i.totalPrice, 0);
  const paidCents     = payments.reduce((s, p) => s + p.amount, 0);
  const remainingCents = subtotalCents - paidCents;
  const cashChange = paymentMethod === 'dinheiro'
    ? Math.max(0, BRLToCents(parseFloat(cashReceived || '0')) - remainingCents)
    : 0;

  // ── Abertura de sessão ──────────────────────────────────────────────────────

  function openSession(op: OperatorProfile) {
    const s: CashSession = {
      id: `sess-${Date.now()}`,
      operatorCode: op.code,
      operatorName: op.name,
      branchId: op.entityId,
      branchName: op.entityName,
      openedAt: new Date().toISOString(),
      status: 'ABERTA',
      initialCash: 0,
      totalSales: 0, totalCash: 0, totalCredit: 0, totalDebit: 0,
      totalPix: 0, totalVoucher: 0, totalOther: 0,
      saleCount: 0,
      tenantId: 'tenant-001',
    };
    setSession(s);
    setView('pdv');
  }

  // ── Finalização de venda ────────────────────────────────────────────────────

  async function finalizeSale() {
    if (!session || cart.length === 0 || remainingCents > 0) return;
    setProcessing(true);

    try {
      // Processa cada meio de pagamento
      let receipt = '';
      for (const split of payments) {
        if (split.method === 'dinheiro') continue; // dinheiro não vai para TEF
        const resp = await defaultPaymentService.processPayment({
          amount: split.amount,
          method: split.method,
          installments: split.installments ?? 1,
          orderId: `PDV-${Date.now()}`,
          sessionId: session.id,
          operatorId: session.operatorCode,
        });
        receipt = resp.receiptCustomer ?? '';
      }

      // Atualiza estatísticas da sessão
      setSessionStats(prev => ({
        totalSales:   prev.totalSales + subtotalCents,
        saleCount:    prev.saleCount + 1,
        totalCash:    prev.totalCash    + payments.filter(p => p.method === 'dinheiro').reduce((s, p) => s + p.amount, 0),
        totalCredit:  prev.totalCredit  + payments.filter(p => p.method === 'credito').reduce((s, p) => s + p.amount, 0),
        totalDebit:   prev.totalDebit   + payments.filter(p => p.method === 'debito').reduce((s, p) => s + p.amount, 0),
        totalPix:     prev.totalPix     + payments.filter(p => p.method === 'pix').reduce((s, p) => s + p.amount, 0),
        totalVoucher: prev.totalVoucher + payments.filter(p => p.method === 'voucher').reduce((s, p) => s + p.amount, 0),
      }));

      setLastReceipt(receipt || buildSimpleReceipt());
      setCart([]);
      setPayments([]);
      setCashReceived('');
      setView('success');
    } finally {
      setProcessing(false);
    }
  }

  function buildSimpleReceipt(): string {
    const lines = [
      '================================',
      '         ZIA OMNISYSTEM         ',
      `  ${session?.branchName ?? ''}  `,
      '================================',
      `Data: ${new Date().toLocaleString('pt-BR')}`,
      `Operador: ${session?.operatorName}`,
      '--------------------------------',
      ...cart.map(i => `${i.productName}\n  ${i.quantity}x ${centsToBRL(i.unitPrice)} = ${centsToBRL(i.totalPrice)}`),
      '--------------------------------',
      `TOTAL: ${centsToBRL(subtotalCents)}`,
      ...payments.map(p => `${PAYMENT_METHOD_LABELS[p.method]}: ${centsToBRL(p.amount)}`),
      cashChange > 0 ? `Troco: ${centsToBRL(cashChange)}` : '',
      '================================',
      '       Obrigado pela compra!     ',
      '================================',
    ].filter(l => l !== '');
    return lines.join('\n');
  }

  function addPaymentSplit() {
    const amount = paymentMethod === 'dinheiro'
      ? Math.min(BRLToCents(parseFloat(cashReceived || '0')), remainingCents)
      : remainingCents;

    if (amount <= 0) return;

    const split: PaymentSplit = {
      method: paymentMethod,
      amount,
      installments: paymentMethod === 'credito' ? installments : 1,
      change: paymentMethod === 'dinheiro' ? cashChange : 0,
    };
    setPayments(prev => [...prev, split]);
    setCashReceived('');
  }

  function removePaymentSplit(idx: number) {
    setPayments(prev => prev.filter((_, i) => i !== idx));
  }

  // ── Views ────────────────────────────────────────────────────────────────────

  // 1. Seletor de operador
  if (view === 'operator-select') {
    return <OperatorSelectView profiles={profiles} onSelect={op => { setOperator(op); setView('open-session'); }} />;
  }

  // 2. Abertura de sessão
  if (view === 'open-session' && operator) {
    return (
      <OpenSessionView
        operator={operator}
        onOpen={() => openSession(operator)}
        onBack={() => { setOperator(null); setView('operator-select'); }}
      />
    );
  }

  // 3. Tela de sucesso
  if (view === 'success') {
    return (
      <SuccessView
        receipt={lastReceipt}
        onNewSale={() => setView('pdv')}
        onClose={() => { setSession(null); setOperator(null); setView('operator-select'); }}
      />
    );
  }

  // 4. PDV principal
  if (view === 'pdv' || view === 'payment') {
    return (
      <div className="flex h-full">
        {/* ── Coluna esquerda: produtos / busca ── */}
        <div className="flex-1 flex flex-col border-r border-slate-200 bg-white">
          {/* Header PDV */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-slate-600" />
              <span className="font-bold text-slate-800 text-sm">PDV — Caixa</span>
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                Sessão aberta
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Clock className="w-3.5 h-3.5" />
              <span>Operador: <strong className="text-slate-700">{operator?.name}</strong></span>
              <button
                onClick={() => { setSession(null); setOperator(null); setView('operator-select'); }}
                className="ml-2 flex items-center gap-1 text-red-500 hover:text-red-700"
              >
                <LogOut className="w-3.5 h-3.5" />
                Fechar Caixa
              </button>
            </div>
          </div>

          {/* Stats rápidos */}
          <div className="grid grid-cols-4 gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100">
            {[
              { label: 'Vendas',   value: sessionStats.saleCount,                         icon: BarChart3,    color: 'text-slate-600' },
              { label: 'Total',    value: centsToBRL(sessionStats.totalSales),             icon: ReceiptText,  color: 'text-emerald-600' },
              { label: 'Dinheiro', value: centsToBRL(sessionStats.totalCash),              icon: Banknote,     color: 'text-amber-600' },
              { label: 'Cartão/PIX',value: centsToBRL(sessionStats.totalCredit + sessionStats.totalDebit + sessionStats.totalPix), icon: CreditCard, color: 'text-blue-600' },
            ].map(s => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="flex items-center gap-1.5 bg-white rounded-lg px-2 py-1.5 border border-slate-100">
                  <Icon className={`w-3.5 h-3.5 ${s.color}`} />
                  <div>
                    <div className="text-[10px] text-slate-400">{s.label}</div>
                    <div className={`text-xs font-bold ${s.color}`}>{s.value}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Busca de produto */}
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setShowSearch(true); }}
                onFocus={() => setShowSearch(true)}
                placeholder="Buscar produto por nome, código ou código de barras... (F2)"
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
              {search && (
                <button onClick={() => { setSearch(''); setShowSearch(false); }} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Resultados da busca */}
            {showSearch && searchResults.length > 0 && (
              <div className="absolute z-50 mt-1 w-[calc(50%-2rem)] bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                {searchResults.map(p => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left text-sm border-b border-slate-50 last:border-0"
                  >
                    <Package className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800 truncate">{p.name}</div>
                      <div className="text-xs text-slate-400">#{p.code} · Estoque: {p.stock}</div>
                    </div>
                    <div className="font-bold text-slate-700 flex-shrink-0">{centsToBRL(p.price)}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Carrinho */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                <ShoppingCart className="w-12 h-12 opacity-30" />
                <p className="text-sm">Carrinho vazio — busque um produto (F2)</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500">Produto</th>
                    <th className="text-center px-2 py-2 text-xs font-semibold text-slate-500">Qtd</th>
                    <th className="text-right px-2 py-2 text-xs font-semibold text-slate-500">Preço</th>
                    <th className="text-right px-2 py-2 text-xs font-semibold text-slate-500">Desc%</th>
                    <th className="text-right px-4 py-2 text-xs font-semibold text-slate-500">Total</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {cart.map(item => (
                    <tr key={item.cartId} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-4 py-2">
                        <div className="font-medium text-slate-800">{item.productName}</div>
                        <div className="text-xs text-slate-400">#{item.productCode}</div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => updateQty(item.cartId, item.quantity - 1)}
                            className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center font-mono text-sm">{item.quantity}</span>
                          <button
                            onClick={() => updateQty(item.cartId, item.quantity + 1)}
                            className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right text-slate-600">{centsToBRL(item.unitPrice)}</td>
                      <td className="px-2 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discountPct}
                            onChange={e => updateDiscount(item.cartId, parseFloat(e.target.value))}
                            className="w-14 text-right border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-slate-300"
                          />
                          <Tag className="w-3 h-3 text-slate-400" />
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right font-semibold text-slate-800">{centsToBRL(item.totalPrice)}</td>
                      <td className="pr-2">
                        <button
                          onClick={() => updateQty(item.cartId, 0)}
                          className="p-1 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Rodapé do carrinho */}
          <div className="border-t border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-500">{cart.length} item(s)</span>
              <div className="text-xl font-black text-slate-900">{centsToBRL(subtotalCents)}</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setCart([]); setPayments([]); }}
                disabled={cart.length === 0}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40"
              >
                Limpar
              </button>
              <button
                onClick={() => setView('payment')}
                disabled={cart.length === 0}
                className="flex-[2] py-2.5 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                Pagamento (F4)
              </button>
            </div>
          </div>
        </div>

        {/* ── Coluna direita: painel de pagamento ── */}
        {view === 'payment' && (
          <div className="w-80 flex flex-col bg-white border-l border-slate-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <span className="font-bold text-slate-800 text-sm">Pagamento</span>
              <button onClick={() => setView('pdv')} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
              {/* Resumo */}
              <div className="bg-slate-50 rounded-xl p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-medium">{centsToBRL(subtotalCents)}</span>
                </div>
                {paidCents > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Pago</span>
                    <span className="font-medium text-emerald-600">{centsToBRL(paidCents)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold border-t border-slate-200 pt-1">
                  <span>Restante</span>
                  <span className={remainingCents <= 0 ? 'text-emerald-600' : 'text-slate-900'}>
                    {centsToBRL(Math.max(0, remainingCents))}
                  </span>
                </div>
              </div>

              {/* Pagamentos já adicionados */}
              {payments.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Formas adicionadas</p>
                  <div className="space-y-1">
                    {payments.map((p, i) => (
                      <div key={i} className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-sm">
                        <span className="text-emerald-700 font-medium">{PAYMENT_METHOD_LABELS[p.method]}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-700">{centsToBRL(p.amount)}</span>
                          <button onClick={() => removePaymentSplit(i)} className="text-emerald-500 hover:text-red-500">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Escolha do meio */}
              {remainingCents > 0 && (
                <>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Meio de pagamento</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {([
                        { id: 'dinheiro',  label: 'Dinheiro',     icon: Banknote    },
                        { id: 'credito',   label: 'Crédito',      icon: CreditCard  },
                        { id: 'debito',    label: 'Débito',       icon: CreditCard  },
                        { id: 'pix',       label: 'PIX',          icon: Smartphone  },
                        { id: 'voucher',   label: 'Voucher',      icon: Tag         },
                      ] as { id: PaymentMethod; label: string; icon: React.ElementType }[]).map(m => {
                        const Icon = m.icon;
                        const isActive = paymentMethod === m.id;
                        return (
                          <button
                            key={m.id}
                            onClick={() => setPaymentMethod(m.id)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-all ${
                              isActive
                                ? 'border-slate-800 bg-slate-800 text-white'
                                : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            {m.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Campo de valor (dinheiro) */}
                  {paymentMethod === 'dinheiro' && (
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Valor recebido (R$)</label>
                      <input
                        type="number"
                        value={cashReceived}
                        onChange={e => setCashReceived(e.target.value)}
                        placeholder={`Mínimo: ${(Math.max(0, remainingCents) / 100).toFixed(2)}`}
                        className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
                      />
                      {cashChange > 0 && (
                        <div className="mt-1 flex items-center gap-1 text-sm text-emerald-600 font-semibold">
                          <Banknote className="w-3.5 h-3.5" />
                          Troco: {centsToBRL(cashChange)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Parcelas (crédito) */}
                  {paymentMethod === 'credito' && (
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Número de parcelas</label>
                      <div className="mt-1 grid grid-cols-4 gap-1">
                        {[1,2,3,4,6,8,10,12].map(n => (
                          <button
                            key={n}
                            onClick={() => setInstallments(n)}
                            className={`py-2 rounded-lg text-xs font-bold border-2 transition-all ${
                              installments === n
                                ? 'border-slate-800 bg-slate-800 text-white'
                                : 'border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            {n}x
                          </button>
                        ))}
                      </div>
                      {installments > 1 && (
                        <p className="text-xs text-slate-400 mt-1">
                          {installments}x de {centsToBRL(Math.ceil(remainingCents / installments))}
                        </p>
                      )}
                    </div>
                  )}

                  {/* PIX */}
                  {paymentMethod === 'pix' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">
                      <div className="flex items-center gap-2 font-semibold mb-1">
                        <Smartphone className="w-4 h-4" />
                        PIX — Pagamento instantâneo
                      </div>
                      <p className="text-xs">Ao confirmar, o QR code PIX será gerado pela maquininha ou API configurada.</p>
                    </div>
                  )}

                  {/* Maquininha info */}
                  {(paymentMethod === 'credito' || paymentMethod === 'debito') && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                      <div className="flex items-center gap-1.5 font-semibold mb-1">
                        <Zap className="w-3.5 h-3.5" />
                        TEF — Maquininha
                      </div>
                      <p>Configure a maquininha em Configurações → Integrações → Pagamentos. Atualmente em modo manual.</p>
                    </div>
                  )}

                  <button
                    onClick={addPaymentSplit}
                    disabled={paymentMethod === 'dinheiro' && BRLToCents(parseFloat(cashReceived || '0')) < remainingCents && cashChange === 0}
                    className="w-full py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-40"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar {PAYMENT_METHOD_LABELS[paymentMethod]}
                  </button>
                </>
              )}

              {/* Aviso se valor insuficiente */}
              {remainingCents > 0 && payments.length === 0 && (
                <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  Adicione uma forma de pagamento para continuar.
                </div>
              )}
            </div>

            {/* Botão finalizar */}
            <div className="p-4 border-t border-slate-100">
              <button
                onClick={finalizeSale}
                disabled={remainingCents > 0 || cart.length === 0 || processing}
                className="w-full py-4 rounded-2xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Finalizar Venda
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Botão de abrir pagamento (quando view=pdv) */}
        {view === 'pdv' && (
          <div className="w-72 flex flex-col bg-slate-50 border-l border-slate-200 p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Operador</p>
            <div className="bg-white border border-slate-200 rounded-xl p-3 mb-4">
              <div className="font-semibold text-slate-800 text-sm">{operator?.name}</div>
              <div className="text-xs text-slate-500">{LEVEL_LABELS[operator?.level ?? 4]}</div>
              <div className="text-xs text-slate-400 mt-0.5">{operator?.entityName}</div>
            </div>

            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Resumo da sessão</p>
            <div className="space-y-2 mb-4">
              {[
                { label: 'Vendas',    value: String(sessionStats.saleCount) },
                { label: 'Total',     value: centsToBRL(sessionStats.totalSales) },
                { label: 'Dinheiro',  value: centsToBRL(sessionStats.totalCash) },
                { label: 'Crédito',   value: centsToBRL(sessionStats.totalCredit) },
                { label: 'Débito',    value: centsToBRL(sessionStats.totalDebit) },
                { label: 'PIX',       value: centsToBRL(sessionStats.totalPix) },
              ].map(s => (
                <div key={s.label} className="flex justify-between text-sm bg-white border border-slate-100 rounded-xl px-3 py-2">
                  <span className="text-slate-500">{s.label}</span>
                  <span className="font-semibold text-slate-700">{s.value}</span>
                </div>
              ))}
            </div>

            <div className="mt-auto">
              <button
                onClick={() => setView('payment')}
                disabled={cart.length === 0}
                className="w-full py-3 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <CreditCard className="w-4 h-4" />
                Ir para Pagamento (F4)
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function OperatorSelectView({
  profiles,
  onSelect,
}: {
  profiles: OperatorProfile[];
  onSelect: (p: OperatorProfile) => void;
}) {
  const [selected, setSelected] = useState<OperatorProfile | null>(null);
  const active = profiles.filter(p => p.active);

  return (
    <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShoppingCart className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-black text-white">Caixa PDV</h2>
          <p className="text-slate-400 text-sm mt-1">Selecione o operador para iniciar a sessão</p>
        </div>

        <div className="space-y-2 mb-6 max-h-72 overflow-y-auto custom-scrollbar pr-1">
          {active.map(p => {
            const Icon = LEVEL_ICON_MAP[p.level];
            const isSel = selected?.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelected(isSel ? null : p)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                  isSel
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-slate-700 bg-slate-800/60 hover:border-slate-600'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isSel ? 'bg-emerald-600' : 'bg-slate-700'}`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white text-sm">{p.name}</div>
                  <div className="text-xs text-slate-400 truncate">{p.entityName}</div>
                </div>
                <span className="text-[10px] font-mono text-slate-500">#{p.code}</span>
                {isSel && <ChevronRight className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
              </button>
            );
          })}
        </div>

        <button
          disabled={!selected}
          onClick={() => selected && onSelect(selected)}
          className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ShoppingCart className="w-4 h-4" />
          {selected ? `Abrir Caixa — ${selected.name}` : 'Selecione um operador'}
        </button>
      </div>
    </div>
  );
}

function OpenSessionView({
  operator,
  onOpen,
  onBack,
}: {
  operator: OperatorProfile;
  onOpen: () => void;
  onBack: () => void;
}) {
  const Icon = LEVEL_ICON_MAP[operator.level];
  return (
    <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Icon className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-xl font-black text-white mb-1">{operator.name}</h3>
        <p className="text-slate-400 text-sm mb-1">{LEVEL_LABELS[operator.level]}</p>
        <p className="text-slate-500 text-xs mb-6">{operator.entityName}</p>
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 mb-6 text-left space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Data de abertura</span>
            <span className="text-white font-medium">{new Date().toLocaleDateString('pt-BR')}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Hora</span>
            <span className="text-white font-medium">{new Date().toLocaleTimeString('pt-BR')}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Código do operador</span>
            <span className="text-white font-mono">#{operator.code}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onBack} className="flex-1 py-3 border border-slate-700 text-slate-400 rounded-xl text-sm hover:bg-slate-800 transition-colors">
            Voltar
          </button>
          <button onClick={onOpen} className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            Abrir Caixa
          </button>
        </div>
      </div>
    </div>
  );
}

function SuccessView({
  receipt,
  onNewSale,
  onClose,
}: {
  receipt: string;
  onNewSale: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="w-full max-w-sm text-center">
        <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl shadow-emerald-500/30">
          <CheckCircle className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-xl font-black text-white mb-1">Venda finalizada!</h3>
        <p className="text-slate-400 text-sm mb-6">Pagamento aprovado com sucesso.</p>

        {receipt && (
          <pre className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-xs text-slate-300 text-left font-mono whitespace-pre-wrap max-h-48 overflow-y-auto custom-scrollbar mb-6">
            {receipt}
          </pre>
        )}

        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-3 border border-slate-700 text-slate-400 rounded-xl text-sm hover:bg-slate-800 transition-colors">
            Fechar Caixa
          </button>
          <button onClick={onNewSale} className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" />
            Nova Venda
          </button>
        </div>
      </div>
    </div>
  );
}
