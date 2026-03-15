// ERP — PDV (Ponto de Venda) — Terminal de caixa rápido
import { useState } from 'react';
import { CreditCard, ShoppingCart, Plus, Minus, Trash2, Search, CheckCircle, X, DollarSign, Smartphone, Building2 } from 'lucide-react';

interface Produto {
  id: string;
  nome: string;
  codigo: string;
  preco: number;
  estoque: number;
  categoria: string;
}

interface ItemCarrinho {
  produto: Produto;
  quantidade: number;
}

const CATALOGO: Produto[] = [
  { id: '1', nome: 'Módulo ERP Básico', codigo: 'ERP-001', preco: 1200, estoque: 99, categoria: 'Software' },
  { id: '2', nome: 'Suporte Mensal', codigo: 'SUP-001', preco: 450, estoque: 99, categoria: 'Serviço' },
  { id: '3', nome: 'Licença Extra Usuário', codigo: 'LIC-001', preco: 89, estoque: 99, categoria: 'Licença' },
  { id: '4', nome: 'Treinamento 4h', codigo: 'TRE-001', preco: 800, estoque: 10, categoria: 'Serviço' },
  { id: '5', nome: 'Integração API', codigo: 'INT-001', preco: 2500, estoque: 99, categoria: 'Serviço' },
  { id: '6', nome: 'Backup em Nuvem/mês', codigo: 'BCK-001', preco: 99, estoque: 99, categoria: 'Infraestrutura' },
  { id: '7', nome: 'Customização Módulo', codigo: 'CUS-001', preco: 5000, estoque: 5, categoria: 'Serviço' },
  { id: '8', nome: 'Scanner de Código', codigo: 'HW-001', preco: 350, estoque: 3, categoria: 'Hardware' },
];

type FormaPagamento = 'dinheiro' | 'pix' | 'cartao_debito' | 'cartao_credito' | 'boleto';

const FORMAS_PGT: { id: FormaPagamento; label: string; icon: typeof CreditCard }[] = [
  { id: 'dinheiro', label: 'Dinheiro', icon: DollarSign },
  { id: 'pix', label: 'PIX', icon: Smartphone },
  { id: 'cartao_debito', label: 'Débito', icon: CreditCard },
  { id: 'cartao_credito', label: 'Crédito', icon: CreditCard },
  { id: 'boleto', label: 'Boleto', icon: Building2 },
];

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function PDV() {
  const [busca, setBusca] = useState('');
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [formaPgt, setFormaPgt] = useState<FormaPagamento>('pix');
  const [desconto, setDesconto] = useState('');
  const [cliente, setCliente] = useState('');
  const [showPagamento, setShowPagamento] = useState(false);
  const [showSucesso, setShowSucesso] = useState(false);
  const [numVenda, setNumVenda] = useState(1001);

  const catalogo = CATALOGO.filter(p =>
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    p.codigo.toLowerCase().includes(busca.toLowerCase()),
  );

  const subtotal = carrinho.reduce((s, i) => s + i.quantidade * i.produto.preco, 0);
  const descontoPct = parseFloat(desconto) || 0;
  const valorDesconto = subtotal * (descontoPct / 100);
  const total = subtotal - valorDesconto;

  function addProduto(p: Produto) {
    setCarrinho(prev => {
      const exists = prev.find(i => i.produto.id === p.id);
      if (exists) return prev.map(i => i.produto.id === p.id ? { ...i, quantidade: i.quantidade + 1 } : i);
      return [...prev, { produto: p, quantidade: 1 }];
    });
  }

  function setQtd(id: string, delta: number) {
    setCarrinho(prev => prev.map(i => i.produto.id === id
      ? { ...i, quantidade: Math.max(1, i.quantidade + delta) }
      : i,
    ));
  }

  function remover(id: string) { setCarrinho(prev => prev.filter(i => i.produto.id !== id)); }

  function finalizar() {
    setShowPagamento(false);
    setShowSucesso(true);
    setNumVenda(n => n + 1);
    setTimeout(() => {
      setShowSucesso(false);
      setCarrinho([]);
      setDesconto('');
      setCliente('');
    }, 3000);
  }

  return (
    <div className="p-4 h-full flex flex-col">
      {showSucesso && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-sm w-full">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">Venda Realizada!</h2>
            <p className="text-slate-500 text-sm mb-2">Nº {numVenda - 1} · {BRL(total)}</p>
            <p className="text-xs text-slate-400">Forma de pagamento: {FORMAS_PGT.find(f => f.id === formaPgt)?.label}</p>
          </div>
        </div>
      )}

      {showPagamento && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">Finalizar Pagamento</h3>
              <button onClick={() => setShowPagamento(false)} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 mb-4 text-center">
              <div className="text-3xl font-bold text-slate-900">{BRL(total)}</div>
              {valorDesconto > 0 && <div className="text-xs text-green-600 mt-0.5">Desconto: -{BRL(valorDesconto)}</div>}
            </div>

            <p className="text-xs font-medium text-slate-500 mb-2">Forma de pagamento</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {FORMAS_PGT.map(f => {
                const Icon = f.icon;
                return (
                  <button
                    key={f.id}
                    onClick={() => setFormaPgt(f.id)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 text-xs font-medium transition-colors ${formaPgt === f.id ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                  >
                    <Icon className="w-4 h-4" />
                    {f.label}
                  </button>
                );
              })}
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-600 mb-1">Cliente (opcional)</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Nome ou CPF/CNPJ" value={cliente} onChange={e => setCliente(e.target.value)} />
            </div>

            <div className="flex gap-2">
              <button onClick={finalizar} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5" /> Confirmar
              </button>
              <button onClick={() => setShowPagamento(false)} className="py-3 px-4 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-emerald-600" /> PDV — Ponto de Venda
        </h1>
        <span className="text-xs text-slate-400">Caixa #{numVenda}</span>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* Catálogo */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Buscar produto ou código…"
              value={busca} onChange={e => setBusca(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 overflow-y-auto custom-scrollbar flex-1">
            {catalogo.map(p => (
              <button
                key={p.id}
                onClick={() => addProduto(p)}
                className="bg-white border border-slate-200 rounded-xl p-3 text-left hover:border-emerald-400 hover:bg-emerald-50 transition-all group"
              >
                <div className="text-xs text-slate-400 mb-0.5">{p.codigo}</div>
                <div className="text-sm font-semibold text-slate-800 leading-tight">{p.nome}</div>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-bold text-emerald-700">{BRL(p.preco)}</span>
                  <span className="text-xs text-slate-400">{p.estoque} un</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Carrinho */}
        <div className="w-72 flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-slate-700 text-sm">{carrinho.length} {carrinho.length === 1 ? 'item' : 'itens'}</span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {carrinho.length === 0 && (
              <div className="text-center text-slate-400 text-sm py-8">Adicione produtos ao carrinho</div>
            )}
            {carrinho.map(item => (
              <div key={item.produto.id} className="bg-slate-50 rounded-lg p-2">
                <div className="flex items-start justify-between gap-1 mb-1">
                  <span className="text-xs font-medium text-slate-700 leading-tight flex-1">{item.produto.nome}</span>
                  <button onClick={() => remover(item.produto.id)} className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setQtd(item.produto.id, -1)} className="w-5 h-5 bg-white border border-slate-200 rounded flex items-center justify-center hover:bg-slate-50">
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold text-slate-700 w-5 text-center">{item.quantidade}</span>
                    <button onClick={() => setQtd(item.produto.id, 1)} className="w-5 h-5 bg-white border border-slate-200 rounded flex items-center justify-center hover:bg-slate-50">
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-xs font-bold text-slate-800">{BRL(item.quantidade * item.produto.preco)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Totais e ação */}
          <div className="border-t border-slate-100 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 w-16">Desconto %</span>
              <input
                type="number" min="0" max="100" className="flex-1 border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="0" value={desconto} onChange={e => setDesconto(e.target.value)}
              />
            </div>

            <div className="space-y-0.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span><span>{BRL(subtotal)}</span>
              </div>
              {valorDesconto > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Desconto ({descontoPct}%)</span><span>-{BRL(valorDesconto)}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between font-bold text-slate-900 border-t border-slate-100 pt-2">
              <span>Total</span><span>{BRL(total)}</span>
            </div>

            <button
              disabled={carrinho.length === 0}
              onClick={() => setShowPagamento(true)}
              className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Finalizar Venda
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
