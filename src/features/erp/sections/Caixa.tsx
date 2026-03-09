// ─────────────────────────────────────────────────────────────────────────────
// Caixa — PDV (Ponto de Venda)
//
// Fluxo:
//   1. Login       → operador digita código (5 dígitos) + senha
//   2. Abertura    → informa troco inicial + seleciona terminal
//   3. PDV         → busca produto (F2), carrinho, pagamento (F4), ESC=limpar
//   4. Fechamento  → resumo por forma de pagamento + fechar sessão
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  LogIn, LogOut, CreditCard, Banknote, Ticket,
  Search, Plus, Minus, Trash2, ShoppingCart, CheckCircle,
  X, ChevronRight, AlertCircle, Loader2, Lock, Hash,
  ArrowLeft, BarChart2, Printer, Zap, Settings,
} from 'lucide-react';
import { loginZia, type ZiaUsuario } from '../../../lib/zia-users';
import {
  getSessaoAberta, abrirSessao, fecharSessao, atualizarTotaisSessao,
  registrarTransacao, getTerminalConfigs, processarTef,
  type CaixaSessao, type TerminalConfig, type FormaPagamentoPDV, type TefResponse,
  FORMA_LABELS, FORMA_ICONS, PROVIDER_LABELS,
} from '../../../lib/pdv';
import { getProdutos, type ErpProduto } from '../../../lib/erp';
import { supabase } from '../../../lib/supabase';

// ── Telas do PDV ──────────────────────────────────────────────────────────────
type Tela = 'login' | 'abertura' | 'pdv' | 'pagamento' | 'sucesso' | 'fechamento';

// ── Item do carrinho ──────────────────────────────────────────────────────────
interface ItemCarrinho {
  produto: ErpProduto;
  quantidade: number;
  preco_unitario: number;
  desconto_pct: number;
}

// ── Parcela de pagamento (dividido) ───────────────────────────────────────────
interface ParcelaPagamento {
  forma: FormaPagamentoPDV;
  valor: number;
  parcelas: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function totalItem(item: ItemCarrinho) {
  return item.quantidade * item.preco_unitario * (1 - item.desconto_pct / 100);
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────
export default function Caixa() {
  const [tela, setTela] = useState<Tela>('login');
  const [operador, setOperador] = useState<ZiaUsuario | null>(null);
  const [sessao, setSessao] = useState<CaixaSessao | null>(null);
  const [terminais, setTerminais] = useState<TerminalConfig[]>([]);
  const [terminalSelecionado, setTerminalSelecionado] = useState<TerminalConfig | null>(null);

  // Carrinho
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [produtoBusca, setProdutoBusca] = useState('');
  const [produtosEncontrados, setProdutosEncontrados] = useState<ErpProduto[]>([]);
  const [buscando, setBuscando] = useState(false);
  const buscaRef = useRef<HTMLInputElement>(null);

  // Pagamento
  const [parcelas, setParcelas] = useState<ParcelaPagamento[]>([]);
  const [formaAtual, setFormaAtual] = useState<FormaPagamentoPDV>('dinheiro');
  const [valorAtual, setValorAtual] = useState('');
  const [qtdParcelas, setQtdParcelas] = useState(1);
  const [processandoTef, setProcessandoTef] = useState(false);
  const [trocoDinheiro, setTrocoDinheiro] = useState(0);

  // Fechamento
  const [valorContagemCaixa, setValorContagemCaixa] = useState('');

  // UI
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  // ── Totais ────────────────────────────────────────────────────────────────

  const totalCarrinho = itens.reduce((s, i) => s + totalItem(i), 0);
  const totalPago = parcelas.reduce((s, p) => s + p.valor, 0);
  const restante = Math.max(0, totalCarrinho - totalPago);

  // ── Inicialização ─────────────────────────────────────────────────────────

  useEffect(() => {
    getTerminalConfigs().then(setTerminais).catch(() => {});
  }, []);

  // ── Atalhos de teclado ────────────────────────────────────────────────────

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (tela !== 'pdv') return;
    if (e.key === 'F2') { e.preventDefault(); buscaRef.current?.focus(); }
    if (e.key === 'F4') { e.preventDefault(); if (itens.length > 0) iniciarPagamento(); }
    if (e.key === 'Escape') { e.preventDefault(); limparCarrinho(); }
  }, [tela, itens]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // ── Busca de produto ───────────────────────────────────────────────────────

  async function buscarProdutos(termo: string) {
    if (!termo.trim()) { setProdutosEncontrados([]); return; }
    setBuscando(true);
    try {
      const result = await getProdutos(termo);
      setProdutosEncontrados(result.slice(0, 8));
    } finally {
      setBuscando(false);
    }
  }

  function adicionarAoCarrinho(produto: ErpProduto) {
    setItens(prev => {
      const idx = prev.findIndex(i => i.produto.id === produto.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantidade: next[idx].quantidade + 1 };
        return next;
      }
      return [...prev, { produto, quantidade: 1, preco_unitario: produto.preco_venda, desconto_pct: 0 }];
    });
    setProdutoBusca('');
    setProdutosEncontrados([]);
  }

  function alterarQuantidade(idx: number, delta: number) {
    setItens(prev => {
      const next = [...prev];
      const nova = next[idx].quantidade + delta;
      if (nova <= 0) { next.splice(idx, 1); return next; }
      next[idx] = { ...next[idx], quantidade: nova };
      return next;
    });
  }

  function removerItem(idx: number) {
    setItens(prev => prev.filter((_, i) => i !== idx));
  }

  function limparCarrinho() {
    setItens([]);
    setParcelas([]);
    setValorAtual('');
    setQtdParcelas(1);
  }

  // ── Fluxo de pagamento ────────────────────────────────────────────────────

  function iniciarPagamento() {
    if (itens.length === 0) return;
    setParcelas([]);
    setValorAtual(totalCarrinho.toFixed(2));
    setFormaAtual('dinheiro');
    setQtdParcelas(1);
    setTela('pagamento');
  }

  function adicionarParcela() {
    const v = parseFloat(valorAtual.replace(',', '.'));
    if (isNaN(v) || v <= 0) return;
    if (v > restante + 0.01) { setErro('Valor maior que o restante'); return; }
    setParcelas(prev => [...prev, { forma: formaAtual, valor: v, parcelas: qtdParcelas }]);
    const novoRestante = restante - v;
    setValorAtual(novoRestante > 0.005 ? novoRestante.toFixed(2) : '');
    setFormaAtual('dinheiro');
    setQtdParcelas(1);
    setErro('');
  }

  async function confirmarPagamento() {
    if (!sessao || !operador) return;
    const totalFinal = parcelas.reduce((s, p) => s + p.valor, 0);
    if (totalFinal < totalCarrinho - 0.01) { setErro('Pagamento insuficiente'); return; }

    setProcessandoTef(true);
    setErro('');

    try {
      // 1. Cria pedido no ERP
      const { data: { user } } = await supabase.auth.getUser();
      const tenant_id = user?.id ?? '00000000-0000-0000-0000-000000000001';

      const { data: pedido, error: pedidoErr } = await supabase
        .from('erp_pedidos')
        .insert({
          tipo: 'VENDA',
          status: 'REALIZADO',
          cliente_id: '00000000-0000-0000-0000-000000000001',
          data_emissao: new Date().toISOString().split('T')[0],
          desconto_global_pct: 0,
          frete_valor: 0,
          total_produtos: totalCarrinho,
          total_pedido: totalCarrinho,
          origem: 'PDV',
          sessao_caixa_id: sessao.id,
          formas_pagamento_json: parcelas,
          tenant_id,
        })
        .select()
        .single();

      if (pedidoErr) throw pedidoErr;

      // 2. Insere itens do pedido
      await supabase.from('erp_pedidos_itens').insert(
        itens.map(item => ({
          pedido_id: pedido.id,
          produto_id: item.produto.id,
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
          desconto_item_pct: item.desconto_pct,
          total_item: totalItem(item),
          tenant_id,
        }))
      );

      // 3. Processa TEF para cada parcela que requer terminal
      const respostasTef: TefResponse[] = [];
      for (const parcela of parcelas) {
        if (parcela.forma !== 'dinheiro' && parcela.forma !== 'pix' && terminalSelecionado) {
          const resp = await processarTef({
            provider: terminalSelecionado.provider,
            forma: parcela.forma,
            valor: parcela.valor,
            parcelas: parcela.parcelas,
            config: terminalSelecionado,
          });
          respostasTef.push(resp);
          if (!resp.aprovado) throw new Error(resp.motivo_recusa ?? 'Pagamento recusado');
        } else {
          respostasTef.push({ aprovado: true });
        }
      }

      // 4. Registra cada transação
      for (let i = 0; i < parcelas.length; i++) {
        const p = parcelas[i];
        const tef = respostasTef[i];
        await registrarTransacao({
          sessao_caixa_id:    sessao.id,
          pedido_id:          pedido.id,
          terminal_config_id: terminalSelecionado?.id ?? null,
          forma_pagamento:    p.forma,
          valor:              p.valor,
          parcelas:           p.parcelas,
          bandeira:           tef.bandeira ?? null,
          nsu:                tef.nsu ?? null,
          codigo_autorizacao: tef.codigo_autorizacao ?? null,
          status:             'APROVADO',
          motivo_recusa:      null,
          payload_provider:   tef.payload_raw ?? null,
          operador_codigo:    operador.codigo,
          filial_id:          sessao.filial_id,
          modulo_origem:      'erp',
        });
      }

      // 5. Atualiza totais da sessão
      const dinheiroVenda   = parcelas.filter(p => p.forma === 'dinheiro').reduce((s, p) => s + p.valor, 0);
      const creditoVenda    = parcelas.filter(p => p.forma === 'credito').reduce((s, p) => s + p.valor, 0);
      const debitoVenda     = parcelas.filter(p => p.forma === 'debito').reduce((s, p) => s + p.valor, 0);
      const pixVenda        = parcelas.filter(p => p.forma === 'pix').reduce((s, p) => s + p.valor, 0);
      const voucherVenda    = parcelas.filter(p => p.forma.startsWith('voucher_')).reduce((s, p) => s + p.valor, 0);

      const novosSessao: Partial<CaixaSessao> = {
        total_dinheiro: (sessao.total_dinheiro ?? 0) + dinheiroVenda,
        total_credito:  (sessao.total_credito  ?? 0) + creditoVenda,
        total_debito:   (sessao.total_debito   ?? 0) + debitoVenda,
        total_pix:      (sessao.total_pix      ?? 0) + pixVenda,
        total_voucher:  (sessao.total_voucher  ?? 0) + voucherVenda,
        total_vendas:   (sessao.total_vendas   ?? 0) + totalCarrinho,
        qtd_vendas:     (sessao.qtd_vendas     ?? 0) + 1,
      };
      await atualizarTotaisSessao(sessao.id, novosSessao);
      setSessao(prev => prev ? { ...prev, ...novosSessao } : prev);

      // 6. Troco para dinheiro
      if (dinheiroVenda > 0) {
        setTrocoDinheiro(Math.max(0, totalPago - totalCarrinho));
      }

      setTela('sucesso');
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao processar pagamento');
    } finally {
      setProcessandoTef(false);
    }
  }

  // ── Fechamento de sessão ───────────────────────────────────────────────────

  async function confirmarFechamento() {
    if (!sessao) return;
    setLoading(true);
    try {
      const v = parseFloat(valorContagemCaixa.replace(',', '.')) || 0;
      await fecharSessao(sessao.id, v);
      setSessao(null);
      setOperador(null);
      setTela('login');
    } finally {
      setLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER — Tela de Login
  // ─────────────────────────────────────────────────────────────────────────
  if (tela === 'login') {
    return <TelaLogin
      terminais={terminais}
      onLogin={async (user, terminal) => {
        setOperador(user);
        if (terminal) setTerminalSelecionado(terminal);
        setLoading(true);
        try {
          const sessaoExistente = await getSessaoAberta();
          if (sessaoExistente) {
            setSessao(sessaoExistente);
            setTela('pdv');
          } else {
            setTela('abertura');
          }
        } finally {
          setLoading(false);
        }
      }}
    />;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER — Tela de Abertura de Sessão
  // ─────────────────────────────────────────────────────────────────────────
  if (tela === 'abertura') {
    return <TelaAbertura
      operador={operador!}
      terminais={terminais}
      terminalSelecionado={terminalSelecionado}
      onTerminalChange={setTerminalSelecionado}
      onAbrir={async (valorAbertura) => {
        setLoading(true);
        try {
          const nova = await abrirSessao({
            operador_codigo: operador!.codigo,
            operador_nome: operador!.nome,
            valor_abertura: valorAbertura,
            terminal_config_id: terminalSelecionado?.id ?? null,
          });
          setSessao(nova);
          setTela('pdv');
        } finally {
          setLoading(false);
        }
      }}
      loading={loading}
    />;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER — Tela de Sucesso
  // ─────────────────────────────────────────────────────────────────────────
  if (tela === 'sucesso') {
    return <TelaSucesso
      total={totalCarrinho}
      parcelas={parcelas}
      troco={trocoDinheiro}
      onNovaVenda={() => { limparCarrinho(); setTela('pdv'); }}
      onFechar={() => setTela('fechamento')}
    />;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER — Tela de Fechamento
  // ─────────────────────────────────────────────────────────────────────────
  if (tela === 'fechamento') {
    return <TelaFechamento
      sessao={sessao!}
      operador={operador!}
      valorContagem={valorContagemCaixa}
      onValorChange={setValorContagemCaixa}
      onConfirmar={confirmarFechamento}
      onCancelar={() => setTela('pdv')}
      loading={loading}
    />;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER — Tela de Pagamento
  // ─────────────────────────────────────────────────────────────────────────
  if (tela === 'pagamento') {
    return (
      <div className="flex flex-col h-full bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-3">
          <button onClick={() => setTela('pdv')} className="p-1.5 rounded-lg hover:bg-slate-100">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h2 className="font-bold text-slate-800">Pagamento</h2>
          <span className="ml-auto text-lg font-black text-emerald-600">{fmt(totalCarrinho)}</span>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Esquerda — resumo e parcelas adicionadas */}
          <div className="w-72 bg-white border-r border-slate-200 flex flex-col">
            <div className="p-4 border-b border-slate-100">
              <div className="text-xs text-slate-500 mb-1">Total da venda</div>
              <div className="text-2xl font-black text-slate-900">{fmt(totalCarrinho)}</div>
              <div className="text-xs text-slate-500 mt-1">
                Pago: {fmt(totalPago)} | Restante: <span className={restante > 0 ? 'text-red-600 font-bold' : 'text-emerald-600'}>{fmt(restante)}</span>
              </div>
            </div>

            {/* Parcelas já lançadas */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {parcelas.length === 0 && (
                <p className="text-xs text-slate-400 text-center mt-4">Nenhuma forma de pagamento adicionada</p>
              )}
              {parcelas.map((p, i) => (
                <div key={i} className="bg-slate-50 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-800">
                      {FORMA_ICONS[p.forma]} {FORMA_LABELS[p.forma]}
                      {p.parcelas > 1 && <span className="text-xs text-slate-500 ml-1">{p.parcelas}x</span>}
                    </div>
                    <div className="text-xs text-slate-500">{fmt(p.valor)}</div>
                  </div>
                  <button onClick={() => setParcelas(prev => prev.filter((_, j) => j !== i))}
                    className="p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Terminal selecionado */}
            {terminalSelecionado && (
              <div className="p-4 border-t border-slate-100">
                <div className="text-xs text-slate-500 mb-1">Terminal ativo</div>
                <div className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5 text-slate-400" />
                  {terminalSelecionado.nome}
                  <span className="text-xs text-slate-400">({PROVIDER_LABELS[terminalSelecionado.provider]})</span>
                  {terminalSelecionado.sandbox && <span className="text-xs bg-amber-100 text-amber-700 px-1 rounded">sandbox</span>}
                </div>
              </div>
            )}
          </div>

          {/* Direita — seleção de forma e valores */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* Formas de pagamento */}
            <div className="grid grid-cols-4 gap-2 mb-6">
              {(['dinheiro','credito','debito','pix','voucher_alimentacao','voucher_refeicao','voucher_combustivel'] as FormaPagamentoPDV[]).map(f => (
                <button
                  key={f}
                  onClick={() => { setFormaAtual(f); if (f !== 'credito') setQtdParcelas(1); }}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${formaAtual === f ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                >
                  <div className="text-lg mb-1">{FORMA_ICONS[f]}</div>
                  <div className="text-xs font-medium text-slate-700 leading-tight">{FORMA_LABELS[f]}</div>
                </button>
              ))}
            </div>

            {/* Valor e parcelamento */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Valor</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={valorAtual}
                    onChange={e => setValorAtual(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-right font-mono text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={restante.toFixed(2)}
                  />
                </div>
                {formaAtual === 'dinheiro' && parseFloat(valorAtual) > 0 && (
                  <div className="text-xs text-emerald-600 mt-1">
                    Troco: {fmt(Math.max(0, parseFloat(valorAtual) - restante))}
                  </div>
                )}
              </div>

              {formaAtual === 'credito' && (
                <div>
                  <label className="text-xs font-medium text-slate-600 block mb-1">Parcelas</label>
                  <div className="grid grid-cols-6 gap-1.5">
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                      <button key={n} onClick={() => setQtdParcelas(n)}
                        className={`py-1.5 rounded-lg text-xs font-medium border transition-all ${qtdParcelas === n ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'}`}>
                        {n}x
                      </button>
                    ))}
                  </div>
                  {qtdParcelas > 1 && parseFloat(valorAtual) > 0 && (
                    <div className="text-xs text-slate-500 mt-1">
                      {qtdParcelas}x de {fmt(parseFloat(valorAtual) / qtdParcelas)}
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={adicionarParcela}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Adicionar forma de pagamento
              </button>
            </div>

            {/* Erro */}
            {erro && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {erro}
              </div>
            )}

            {/* Confirmar */}
            {parcelas.length > 0 && restante <= 0.01 && (
              <button
                onClick={confirmarPagamento}
                disabled={processandoTef}
                className="mt-6 w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold py-4 rounded-xl text-lg transition-colors flex items-center justify-center gap-2"
              >
                {processandoTef ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Processando...</>
                ) : (
                  <><CheckCircle className="w-5 h-5" /> Confirmar Pagamento</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER — PDV Principal
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header PDV */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-2.5 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-emerald-400" />
          <span className="text-white font-bold text-sm">PDV</span>
        </div>
        <div className="flex items-center gap-2 ml-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-slate-300 text-xs">Sessão aberta</span>
          {terminalSelecionado && (
            <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
              {terminalSelecionado.nome}
              {terminalSelecionado.sandbox && ' (sandbox)'}
            </span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs text-slate-400">
          <span>{operador?.nome}</span>
          <span className="bg-slate-700 px-1.5 py-0.5 rounded font-mono">{operador?.codigo}</span>
          <button onClick={() => setTela('fechamento')}
            className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-slate-300 px-2.5 py-1.5 rounded-lg ml-2">
            <LogOut className="w-3.5 h-3.5" />
            Fechar caixa
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Esquerda — busca e carrinho */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Busca */}
          <div className="bg-slate-800 px-4 py-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={buscaRef}
                type="text"
                value={produtoBusca}
                onChange={e => { setProdutoBusca(e.target.value); buscarProdutos(e.target.value); }}
                placeholder="Buscar produto (F2)"
                className="w-full bg-slate-700 text-white pl-9 pr-4 py-2.5 rounded-lg border border-slate-600 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
              {buscando && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />}
            </div>

            {/* Dropdown de resultados */}
            {produtosEncontrados.length > 0 && (
              <div className="mt-1 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 absolute left-4 right-96">
                {produtosEncontrados.map(p => (
                  <button key={p.id} onClick={() => adicionarAoCarrinho(p)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0 text-left">
                    <div>
                      <div className="text-sm font-medium text-slate-800">{p.nome}</div>
                      <div className="text-xs text-slate-500">{p.codigo_interno} · {p.unidade_medida}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-800">{fmt(p.preco_venda)}</div>
                      <div className="text-xs text-slate-500">Estoque: {p.estoque_atual}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Carrinho */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {itens.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <ShoppingCart className="w-12 h-12 text-slate-600 mb-3" />
                <p className="text-slate-500 text-sm">Carrinho vazio</p>
                <p className="text-slate-600 text-xs mt-1">Pressione F2 para buscar produtos</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800 text-slate-400 text-xs">
                    <th className="px-4 py-2 text-left">Produto</th>
                    <th className="px-3 py-2 text-center w-28">Qtd</th>
                    <th className="px-3 py-2 text-right w-28">Unit.</th>
                    <th className="px-3 py-2 text-right w-28">Desc.%</th>
                    <th className="px-3 py-2 text-right w-28">Total</th>
                    <th className="px-2 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item, i) => (
                    <tr key={item.produto.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                      <td className="px-4 py-2.5">
                        <div className="text-slate-200 font-medium">{item.produto.nome}</div>
                        <div className="text-slate-500 text-xs">{item.produto.codigo_interno}</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => alterarQuantidade(i, -1)} className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 flex items-center justify-center">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-8 text-center text-slate-200 font-mono text-sm">{item.quantidade}</span>
                          <button onClick={() => alterarQuantidade(i, +1)} className="w-6 h-6 rounded bg-slate-700 hover:bg-slate-600 text-slate-300 flex items-center justify-center">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <input
                          type="number"
                          value={item.preco_unitario}
                          onChange={e => setItens(prev => {
                            const next = [...prev];
                            next[i] = { ...next[i], preco_unitario: parseFloat(e.target.value) || 0 };
                            return next;
                          })}
                          className="w-20 bg-slate-800 text-slate-200 border border-slate-700 rounded px-2 py-1 text-right text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <input
                          type="number"
                          min="0" max="100"
                          value={item.desconto_pct}
                          onChange={e => setItens(prev => {
                            const next = [...prev];
                            next[i] = { ...next[i], desconto_pct: Math.min(100, parseFloat(e.target.value) || 0) };
                            return next;
                          })}
                          className="w-16 bg-slate-800 text-slate-200 border border-slate-700 rounded px-2 py-1 text-right text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="px-3 py-2.5 text-right text-emerald-400 font-mono font-bold">
                        {fmt(totalItem(item))}
                      </td>
                      <td className="px-2 py-2.5">
                        <button onClick={() => removerItem(i)} className="p-1 rounded hover:bg-red-900/50 text-slate-500 hover:text-red-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Atalhos */}
          <div className="bg-slate-800 border-t border-slate-700 px-4 py-2 flex items-center gap-4 text-xs text-slate-500">
            <span><kbd className="bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded text-xs">F2</kbd> Buscar</span>
            <span><kbd className="bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded text-xs">F4</kbd> Pagar</span>
            <span><kbd className="bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded text-xs">ESC</kbd> Limpar</span>
          </div>
        </div>

        {/* Direita — totais e ação */}
        <div className="w-72 bg-slate-800 border-l border-slate-700 flex flex-col">
          {/* Totais da sessão */}
          <div className="p-4 border-b border-slate-700">
            <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Sessão</div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Vendas:</span><span>{sessao?.qtd_vendas ?? 0}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Dinheiro:</span><span>{fmt(sessao?.total_dinheiro ?? 0)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Crédito:</span><span>{fmt(sessao?.total_credito ?? 0)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Débito:</span><span>{fmt(sessao?.total_debito ?? 0)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>PIX:</span><span>{fmt(sessao?.total_pix ?? 0)}</span>
              </div>
              <div className="flex justify-between text-slate-300 font-medium border-t border-slate-700 pt-1">
                <span>Total:</span><span>{fmt(sessao?.total_vendas ?? 0)}</span>
              </div>
            </div>
          </div>

          {/* Total da venda atual */}
          <div className="p-5 flex-1 flex flex-col justify-end">
            <div className="text-center mb-6">
              <div className="text-slate-400 text-xs mb-1">Total da venda</div>
              <div className="text-4xl font-black text-emerald-400 font-mono">{fmt(totalCarrinho)}</div>
              <div className="text-slate-500 text-xs mt-1">
                {itens.length} {itens.length === 1 ? 'item' : 'itens'} · {itens.reduce((s, i) => s + i.quantidade, 0)} unidades
              </div>
            </div>

            <button
              onClick={iniciarPagamento}
              disabled={itens.length === 0}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white font-bold py-4 rounded-xl text-lg transition-colors flex items-center justify-center gap-2 mb-3"
            >
              <CreditCard className="w-5 h-5" />
              Pagar (F4)
            </button>

            <button
              onClick={limparCarrinho}
              disabled={itens.length === 0}
              className="w-full bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-slate-300 font-medium py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Limpar (ESC)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-componente: Tela de Login
// ─────────────────────────────────────────────────────────────────────────────
interface TelaLoginProps {
  terminais: TerminalConfig[];
  onLogin: (user: ZiaUsuario, terminal: TerminalConfig | null) => void;
}

function TelaLogin({ terminais, onLogin }: TelaLoginProps) {
  const [codigo, setCodigo] = useState('');
  const [senha, setSenha] = useState('');
  const [terminalId, setTerminalId] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!codigo || !senha) { setErro('Informe o código e a senha'); return; }
    setLoading(true);
    setErro('');
    try {
      const user = await loginZia(codigo, senha);
      if (!user) { setErro('Código ou senha incorretos'); return; }
      const terminal = terminais.find(t => t.id === terminalId) ?? null;
      onLogin(user, terminal);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full bg-slate-900">
      <div className="w-full max-w-md">
        {/* Logo PDV */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <ShoppingCart className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white">ZIA PDV</h1>
          <p className="text-slate-400 text-sm mt-1">Ponto de Venda</p>
        </div>

        <form onSubmit={handleLogin} className="bg-slate-800 rounded-2xl p-6 border border-slate-700 shadow-2xl space-y-4">
          {/* Código */}
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Código de acesso</label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={codigo}
                onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 5))}
                placeholder="00001"
                maxLength={5}
                autoFocus
                className="w-full bg-slate-700 text-white pl-9 pr-4 py-3 rounded-xl border border-slate-600 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono tracking-widest text-center text-lg"
              />
            </div>
          </div>

          {/* Senha */}
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="••••••"
                className="w-full bg-slate-700 text-white pl-9 pr-4 py-3 rounded-xl border border-slate-600 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Terminal */}
          {terminais.length > 0 && (
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">Terminal de pagamento (opcional)</label>
              <select
                value={terminalId}
                onChange={e => setTerminalId(e.target.value)}
                className="w-full bg-slate-700 text-white px-3 py-3 rounded-xl border border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Sem terminal (manual)</option>
                {terminais.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.nome} — {PROVIDER_LABELS[t.provider]}{t.sandbox ? ' (sandbox)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Erro */}
          {erro && (
            <div className="bg-red-900/40 border border-red-800 rounded-lg px-3 py-2 text-sm text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 mt-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
            Entrar no Caixa
          </button>
        </form>

        <p className="text-center text-xs text-slate-600 mt-4">
          Código padrão: <span className="text-slate-400 font-mono">00001</span> · Senha: <span className="text-slate-400 font-mono">admin123</span>
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-componente: Tela de Abertura de Sessão
// ─────────────────────────────────────────────────────────────────────────────
interface TelaAberturaProps {
  operador: ZiaUsuario;
  terminais: TerminalConfig[];
  terminalSelecionado: TerminalConfig | null;
  onTerminalChange: (t: TerminalConfig | null) => void;
  onAbrir: (valorAbertura: number) => void;
  loading: boolean;
}

function TelaAbertura({ operador, terminais, terminalSelecionado, onTerminalChange, onAbrir, loading }: TelaAberturaProps) {
  const [valor, setValor] = useState('0.00');

  return (
    <div className="flex flex-col items-center justify-center h-full bg-slate-900">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Banknote className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">Abertura de Caixa</h2>
          <p className="text-slate-400 text-sm mt-1">Olá, <span className="text-slate-200 font-medium">{operador.nome}</span></p>
        </div>

        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Valor de abertura (troco inicial)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={valor}
                onChange={e => setValor(e.target.value)}
                className="w-full bg-slate-700 text-white pl-10 pr-4 py-3 rounded-xl border border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-right text-lg"
              />
            </div>
          </div>

          {terminais.length > 0 && (
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">Terminal de pagamento</label>
              <select
                value={terminalSelecionado?.id ?? ''}
                onChange={e => onTerminalChange(terminais.find(t => t.id === e.target.value) ?? null)}
                className="w-full bg-slate-700 text-white px-3 py-3 rounded-xl border border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Sem terminal (manual)</option>
                {terminais.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.nome} — {PROVIDER_LABELS[t.provider]}{t.sandbox ? ' (sandbox)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => onAbrir(parseFloat(valor.replace(',', '.')) || 0)}
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
            Abrir Caixa
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-componente: Tela de Sucesso
// ─────────────────────────────────────────────────────────────────────────────
interface TelaSucessoProps {
  total: number;
  parcelas: ParcelaPagamento[];
  troco: number;
  onNovaVenda: () => void;
  onFechar: () => void;
}

function TelaSucesso({ total, parcelas, troco, onNovaVenda, onFechar }: TelaSucessoProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-slate-900">
      <div className="w-full max-w-sm text-center">
        <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-500/30">
          <CheckCircle className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-black text-white mb-1">Venda realizada!</h2>
        <div className="text-4xl font-black text-emerald-400 font-mono mb-4">{fmt(total)}</div>

        {/* Formas usadas */}
        <div className="bg-slate-800 rounded-xl p-4 mb-4 space-y-2 border border-slate-700">
          {parcelas.map((p, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-slate-400">{FORMA_ICONS[p.forma]} {FORMA_LABELS[p.forma]}{p.parcelas > 1 ? ` (${p.parcelas}x)` : ''}</span>
              <span className="text-white font-medium">{fmt(p.valor)}</span>
            </div>
          ))}
          {troco > 0 && (
            <div className="flex justify-between text-sm border-t border-slate-700 pt-2">
              <span className="text-amber-400 font-medium">Troco</span>
              <span className="text-amber-400 font-bold">{fmt(troco)}</span>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onNovaVenda}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <ShoppingCart className="w-5 h-5" />
            Nova venda
          </button>
          <button
            onClick={onFechar}
            className="w-12 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl flex items-center justify-center transition-colors"
            title="Fechar caixa"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        <button className="mt-3 w-full text-slate-500 hover:text-slate-400 text-xs flex items-center justify-center gap-1.5 transition-colors">
          <Printer className="w-3.5 h-3.5" />
          Imprimir cupom (em breve)
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-componente: Tela de Fechamento de Sessão
// ─────────────────────────────────────────────────────────────────────────────
interface TelaFechamentoProps {
  sessao: CaixaSessao;
  operador: ZiaUsuario;
  valorContagem: string;
  onValorChange: (v: string) => void;
  onConfirmar: () => void;
  onCancelar: () => void;
  loading: boolean;
}

function TelaFechamento({ sessao, operador, valorContagem, onValorChange, onConfirmar, onCancelar, loading }: TelaFechamentoProps) {
  const total = sessao.total_vendas ?? 0;
  const rows: { label: string; value: number; icon: React.ReactNode }[] = [
    { label: 'Dinheiro',    value: sessao.total_dinheiro ?? 0,  icon: <Banknote className="w-4 h-4" /> },
    { label: 'Crédito',     value: sessao.total_credito  ?? 0,  icon: <CreditCard className="w-4 h-4" /> },
    { label: 'Débito',      value: sessao.total_debito   ?? 0,  icon: <CreditCard className="w-4 h-4" /> },
    { label: 'PIX',         value: sessao.total_pix      ?? 0,  icon: <Zap className="w-4 h-4" /> },
    { label: 'Vouchers',    value: sessao.total_voucher  ?? 0,  icon: <Ticket className="w-4 h-4" /> },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full bg-slate-900 p-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center mx-auto mb-3">
            <LogOut className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">Fechamento de Caixa</h2>
          <p className="text-slate-400 text-sm">{operador.nome} · Sessão em aberto</p>
        </div>

        <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden mb-4">
          {/* Resumo por forma */}
          <div className="p-5 space-y-3">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <BarChart2 className="w-3.5 h-3.5" />
              Resumo da sessão — {sessao.qtd_vendas} vendas
            </div>
            {rows.map(r => (
              <div key={r.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="text-slate-500">{r.icon}</span>
                  {r.label}
                </div>
                <span className={r.value > 0 ? 'text-white font-medium' : 'text-slate-600'}>
                  {fmt(r.value)}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-slate-700 pt-3 mt-1">
              <span className="text-white font-bold">Total</span>
              <span className="text-emerald-400 font-black text-lg">{fmt(total)}</span>
            </div>
          </div>

          {/* Contagem física */}
          <div className="border-t border-slate-700 p-5">
            <label className="text-xs font-medium text-slate-400 block mb-1.5">
              Valor contado em caixa (dinheiro físico)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={valorContagem}
                onChange={e => onValorChange(e.target.value)}
                placeholder="0.00"
                className="w-full bg-slate-700 text-white pl-10 pr-4 py-3 rounded-xl border border-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-right text-lg"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancelar}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <button
            onClick={onConfirmar}
            disabled={loading}
            className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            Fechar Caixa
          </button>
        </div>
      </div>
    </div>
  );
}
