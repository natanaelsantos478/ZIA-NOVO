// ─────────────────────────────────────────────────────────────────────────────
// Caixa — Ponto de Venda (PDV) completo
//
// Arquitetura pensada para isolamento de módulo:
//   • Toda lógica de dados passa por lib/caixa.ts (fácil de extrair para desktop)
//   • TefService: stub preparado para integração Stone/Cielo/PagSeguro
//   • Teclado: F2 = busca, F4 = pagamento, F6 = cancelar item, ESC = limpar
//   • Sessão de caixa persistida no DB (erp_caixa_sessoes)
//   • Venda finalizada cria erp_pedidos com status REALIZADO + origem PDV
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ShoppingCart, Search, Plus, Minus, Trash2, CreditCard,
  Banknote, Smartphone, Ticket, X, CheckCircle, AlertCircle,
  Printer, RotateCcw, Lock, Unlock,
  Users, Calculator, Package, Loader2, Monitor,
  Wifi, ArrowRight,
} from 'lucide-react';
import { getProdutos, getClientes, createPedido } from '../../../lib/erp';
import { getFilialDb } from '../../../lib/supabase';
import { getFilialId } from '../../../lib/tenant';
import type { ErpProduto, ErpCliente } from '../../../lib/erp';
import { useAppContext } from '../../../context/AppContext';

// ── Tipos ─────────────────────────────────────────────────────────────────────

type FormaPagamento = 'DINHEIRO' | 'CREDITO' | 'DEBITO' | 'PIX' | 'VOUCHER';

interface ItemCarrinho {
  id: string; // produto.id
  nome: string;
  codigo: string;
  unidade: string;
  preco: number;
  qtd: number;
  desconto: number; // percentual 0-100
}

interface Pagamento {
  forma: FormaPagamento;
  valor: number;
  parcelas?: number;
  nsu?: string;
}

interface SessaoCaixa {
  id: string;
  numero: number;
  operador_nome: string;
  data_abertura: string;
  saldo_inicial: number;
  total_vendas: number;
  qtd_vendas: number;
}

type ViewPDV = 'fechado' | 'pdv' | 'pagamento' | 'fechamento' | 'sucesso';

interface VendaSucesso {
  numero: number;
  total: number;
  troco: number;
  formas: Pagamento[];
}

// ── TEF Service stub ───────────────────────────────────────────────────────────
// Em produção: substituir por SDK Stone (stone-ecommerce), Cielo LIO, ou
// integração TEF via serial/USB num app Electron.
interface TefResult {
  approved: boolean;
  nsu?: string;
  message: string;
}

async function processTef(forma: 'CREDITO' | 'DEBITO', valor: number, parcelas = 1): Promise<TefResult> {
  // Simulação — substitua por chamada real ao SDK da maquininha
  console.log('[TEF] Iniciando transação', { forma, valor, parcelas });
  await new Promise(r => setTimeout(r, 2000)); // simula comunicação
  return { approved: true, nsu: Math.random().toString(36).slice(2, 10).toUpperCase(), message: 'Transação aprovada' };
}

// ── Funções DB ────────────────────────────────────────────────────────────────

async function abrirSessao(operador_nome: string, saldo_inicial: number): Promise<SessaoCaixa> {
  const tenant_id = getFilialId();
  const { data, error } = await getFilialDb()
    .from('erp_caixa_sessoes')
    .insert({ operador_nome, saldo_inicial, tenant_id, status: 'ABERTA' })
    .select('id, numero, operador_nome, data_abertura, saldo_inicial, total_vendas, qtd_vendas')
    .single();
  if (error) throw error;
  return data as SessaoCaixa;
}

async function fecharSessao(id: string, totais: {
  saldo_final: number; total_vendas: number; qtd_vendas: number;
  total_dinheiro: number; total_credito: number; total_debito: number;
  total_pix: number; total_voucher: number; observacoes?: string;
}): Promise<void> {
  const { error } = await getFilialDb()
    .from('erp_caixa_sessoes')
    .update({ ...totais, data_fechamento: new Date().toISOString(), status: 'FECHADA' })
    .eq('id', id);
  if (error) throw error;
}

async function getSessaoAberta(): Promise<SessaoCaixa | null> {
  const { data } = await getFilialDb()
    .from('erp_caixa_sessoes')
    .select('id, numero, operador_nome, data_abertura, saldo_inicial, total_vendas, qtd_vendas')
    .eq('status', 'ABERTA')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as SessaoCaixa | null) ?? null;
}

async function registrarVendaDB(
  sessaoId: string,
  itens: ItemCarrinho[],
  pagamentos: Pagamento[],
  clienteId: string | null,
  total: number,
): Promise<number> {
  const formas_pagamento_json = pagamentos.map(p => ({ forma: p.forma, valor: p.valor, parcelas: p.parcelas, nsu: p.nsu }));

  const pedido = await createPedido(
    {
      tipo: 'VENDA',
      status: 'REALIZADO',
      cliente_id: clienteId ?? '',
      vendedor_id: null,
      data_emissao: new Date().toISOString().split('T')[0],
      data_entrega_prevista: null,
      condicao_pagamento: pagamentos[0]?.forma ?? 'DINHEIRO',
      condicao_pagamento_id: null,
      natureza_operacao_id: null,
      natureza_operacao_texto: 'VENDA PDV',
      deposito_id: null,
      deposito_texto: null,
      tabela_preco: null,
      pedido_compra: null,
      desconto_global_pct: 0,
      desconto_global_valor: null,
      acrescimo_valor: null,
      frete_valor: 0,
      total_produtos: total,
      total_ipi: null,
      total_pedido: total,
      modalidade_frete: '9',
      transportadora_nome: null,
      transportadora_cnpj: null,
      placa_veiculo: null,
      peso_bruto: null,
      peso_liquido: null,
      volumes: null,
      especie_volume: null,
      vendedor_auxiliar: null,
      comissao_auxiliar_pct: null,
      centro_custo: null,
      projeto: null,
      modelo_nfe: null,
      serie_nfe: null,
      ambiente_nfe: null,
      finalidade_nfe: '1',
      consumidor_final: '1',
      end_entrega_igual_cliente: true,
      end_entrega_json: null,
      obs_nfe: null,
      obs_interna: `Sessão caixa: ${sessaoId}`,
      inf_complementares: null,
      observacoes: null,
      origem: 'PDV',
      sessao_caixa_id: sessaoId,
      formas_pagamento_json,
    },
    itens.map(i => ({
      produto_id: i.id,
      descricao_item: i.nome,
      quantidade: i.qtd,
      unidade_medida: i.unidade,
      preco_unitario: i.preco,
      desconto_item_pct: i.desconto,
      total_item: i.qtd * i.preco * (1 - i.desconto / 100),
      ipi_pct: 0,
      ipi_valor: null,
      cfop: '5102',
      ncm: null,
      cst_icms: null,
    }))
  );

  // Atualiza totais da sessão (read-then-write para evitar race em monousuário)
  const totaisPag = pagamentos.reduce(
    (acc, p) => { acc[p.forma] = (acc[p.forma] ?? 0) + p.valor; return acc; },
    {} as Record<FormaPagamento, number>
  );
  const { data: sess } = await getFilialDb()
    .from('erp_caixa_sessoes')
    .select('total_vendas, qtd_vendas, total_dinheiro, total_credito, total_debito, total_pix, total_voucher')
    .eq('id', sessaoId)
    .single();
  if (sess) {
    await getFilialDb().from('erp_caixa_sessoes').update({
      total_vendas:  (sess.total_vendas  ?? 0) + total,
      qtd_vendas:    (sess.qtd_vendas    ?? 0) + 1,
      total_dinheiro:(sess.total_dinheiro?? 0) + (totaisPag.DINHEIRO ?? 0),
      total_credito: (sess.total_credito ?? 0) + (totaisPag.CREDITO  ?? 0),
      total_debito:  (sess.total_debito  ?? 0) + (totaisPag.DEBITO   ?? 0),
      total_pix:     (sess.total_pix     ?? 0) + (totaisPag.PIX      ?? 0),
      total_voucher: (sess.total_voucher ?? 0) + (totaisPag.VOUCHER  ?? 0),
    }).eq('id', sessaoId);
  }

  return pedido.numero;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function brl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function now() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const FORMAS: { id: FormaPagamento; label: string; icon: React.ElementType; color: string }[] = [
  { id: 'DINHEIRO', label: 'Dinheiro',    icon: Banknote,    color: 'bg-green-600 hover:bg-green-700' },
  { id: 'CREDITO',  label: 'Crédito',     icon: CreditCard,  color: 'bg-blue-600 hover:bg-blue-700' },
  { id: 'DEBITO',   label: 'Débito',      icon: CreditCard,  color: 'bg-indigo-600 hover:bg-indigo-700' },
  { id: 'PIX',      label: 'PIX',         icon: Smartphone,  color: 'bg-teal-600 hover:bg-teal-700' },
  { id: 'VOUCHER',  label: 'Voucher',      icon: Ticket,      color: 'bg-amber-600 hover:bg-amber-700' },
];

// ── Componente principal ──────────────────────────────────────────────────────

export default function Caixa() {
  const { orgContexto } = useAppContext();
  const [view, setView]             = useState<ViewPDV>('fechado');
  const [sessao, setSessao]         = useState<SessaoCaixa | null>(null);
  const [loadingSessao, setLoadingSessao] = useState(true);

  // Abertura de caixa
  const [operadorNome, setOperadorNome] = useState('');
  const [saldoInicial, setSaldoInicial] = useState('');
  const [abrindo, setAbrindo]           = useState(false);

  // PDV
  const [itens, setItens]           = useState<ItemCarrinho[]>([]);
  const [produtos, setProdutos]     = useState<ErpProduto[]>([]);
  const [clientes, setClientes]     = useState<ErpCliente[]>([]);
  const [search, setSearch]         = useState('');
  const [clienteId, setClienteId]   = useState('');
  const [clienteSearch, setClienteSearch] = useState('');
  const [loadingProd, setLoadingProd] = useState(false);
  const [hora, setHora]             = useState(now());
  const searchRef = useRef<HTMLInputElement>(null);

  // Pagamento
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [formaPag, setFormaPag]     = useState<FormaPagamento>('DINHEIRO');
  const [valorPag, setValorPag]     = useState('');
  const [parcelas, setParcelas]     = useState(1);
  const [tefPending, setTefPending] = useState(false);
  const [tefMsg, setTefMsg]         = useState('');

  // Fechamento
  const [saldoFinal, setSaldoFinal] = useState('');
  const [obsFechamento, setObsFechamento] = useState('');
  const [fechando, setFechando]     = useState(false);

  // Sucesso
  const [sucesso, setSucesso]       = useState<VendaSucesso | null>(null);

  // Toast
  const [toast, setToast]           = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  // Relógio
  useEffect(() => {
    const t = setInterval(() => setHora(now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Checar sessão aberta ao montar
  useEffect(() => {
    getSessaoAberta()
      .then(s => { if (s) { setSessao(s); setView('pdv'); } })
      .catch(() => {})
      .finally(() => setLoadingSessao(false));
  }, []);

  // Carregar produtos iniciais
  useEffect(() => {
    if (view !== 'pdv') return;
    setLoadingProd(true);
    Promise.all([
      getProdutos().then(setProdutos),
      getClientes().then(setClientes),
    ]).catch(() => {}).finally(() => setLoadingProd(false));
  }, [view]);

  // Busca de produto (debounced)
  useEffect(() => {
    if (!search) return;
    const t = setTimeout(() => {
      setLoadingProd(true);
      getProdutos(search).then(setProdutos).catch(() => {}).finally(() => setLoadingProd(false));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Atalhos de teclado
  const handleKeyboard = useCallback((e: KeyboardEvent) => {
    if (view !== 'pdv') return;
    if (e.key === 'F2') { e.preventDefault(); searchRef.current?.focus(); }
    if (e.key === 'F4' && itens.length > 0) { e.preventDefault(); setView('pagamento'); }
    if (e.key === 'Escape') { e.preventDefault(); setSearch(''); searchRef.current?.blur(); }
  }, [view, itens.length]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [handleKeyboard]);

  // ── Carrinho ───────────────────────────────────────────────────────────────

  function addItem(prod: ErpProduto) {
    setItens(prev => {
      const idx = prev.findIndex(i => i.id === prod.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], qtd: updated[idx].qtd + 1 };
        return updated;
      }
      return [...prev, {
        id: prod.id,
        nome: prod.nome,
        codigo: prod.codigo_interno ?? '',
        unidade: prod.unidade_medida,
        preco: prod.preco_venda ?? 0,
        qtd: 1,
        desconto: 0,
      }];
    });
    setSearch('');
    searchRef.current?.focus();
  }

  function setQtd(id: string, qtd: number) {
    if (qtd <= 0) { setItens(p => p.filter(i => i.id !== id)); return; }
    setItens(p => p.map(i => i.id === id ? { ...i, qtd } : i));
  }

  function setDescItem(id: string, desc: number) {
    setItens(p => p.map(i => i.id === id ? { ...i, desconto: Math.min(100, Math.max(0, desc)) } : i));
  }

  function setPriceItem(id: string, preco: number) {
    setItens(p => p.map(i => i.id === id ? { ...i, preco: Math.max(0, preco) } : i));
  }

  const subtotal = itens.reduce((s, i) => s + i.qtd * i.preco * (1 - i.desconto / 100), 0);
  const totalPago = pagamentos.reduce((s, p) => s + p.valor, 0);
  const restante = Math.max(0, subtotal - totalPago);
  const troco = Math.max(0, totalPago - subtotal);

  // ── Pagamento ──────────────────────────────────────────────────────────────

  function initPagamento() {
    setPagamentos([]);
    setFormaPag('DINHEIRO');
    setValorPag(subtotal.toFixed(2));
    setParcelas(1);
    setTefPending(false);
    setTefMsg('');
    setView('pagamento');
  }

  async function addPagamento() {
    const val = parseFloat(valorPag.replace(',', '.'));
    if (!val || val <= 0) { showToast('Informe um valor válido.', false); return; }

    if (formaPag === 'CREDITO' || formaPag === 'DEBITO') {
      setTefPending(true);
      setTefMsg('Aguardando maquininha…');
      try {
        const result = await processTef(formaPag, val, parcelas);
        if (!result.approved) { setTefMsg('Transação recusada: ' + result.message); setTefPending(false); return; }
        setPagamentos(p => [...p, { forma: formaPag, valor: val, parcelas, nsu: result.nsu }]);
        setTefMsg('');
      } catch {
        setTefMsg('Erro na comunicação com a maquininha.');
      } finally {
        setTefPending(false);
      }
    } else {
      setPagamentos(p => [...p, { forma: formaPag, valor: val, parcelas: 1 }]);
    }

    const newTotal = totalPago + val;
    const remaining = subtotal - newTotal;
    setValorPag(remaining > 0 ? remaining.toFixed(2) : '');
  }

  async function finalizarVenda() {
    if (!sessao) return;
    if (restante > 0.01) { showToast('Pagamento insuficiente.', false); return; }
    if (itens.length === 0) { showToast('Carrinho vazio.', false); return; }

    try {
      const numero = await registrarVendaDB(sessao.id, itens, pagamentos, clienteId || null, subtotal);
      setSucesso({ numero, total: subtotal, troco, formas: pagamentos });
      setItens([]);
      setPagamentos([]);
      setClienteId('');
      setClienteSearch('');
      setSessao(prev => prev ? { ...prev, total_vendas: prev.total_vendas + subtotal, qtd_vendas: prev.qtd_vendas + 1 } : prev);
      setView('sucesso');
    } catch (e) {
      showToast('Erro ao registrar venda: ' + (e as Error).message, false);
    }
  }

  // ── Abertura de caixa ──────────────────────────────────────────────────────

  async function handleAbrirCaixa() {
    if (!operadorNome.trim()) { showToast('Informe o nome do operador.', false); return; }
    setAbrindo(true);
    try {
      const s = await abrirSessao(operadorNome.trim(), parseFloat(saldoInicial || '0'));
      setSessao(s);
      setView('pdv');
      showToast(`Caixa #${s.numero} aberto!`);
    } catch (e) {
      showToast('Erro ao abrir caixa: ' + (e as Error).message, false);
    } finally { setAbrindo(false); }
  }

  // ── Fechamento de caixa ────────────────────────────────────────────────────

  async function handleFecharCaixa() {
    if (!sessao) return;
    setFechando(true);
    try {
      await fecharSessao(sessao.id, {
        saldo_final: parseFloat(saldoFinal || '0'),
        total_vendas: sessao.total_vendas,
        qtd_vendas: sessao.qtd_vendas,
        total_dinheiro: 0, total_credito: 0, total_debito: 0, total_pix: 0, total_voucher: 0,
        observacoes: obsFechamento,
      });
      setSessao(null);
      setView('fechado');
      setOperadorNome('');
      setSaldoInicial('');
      showToast('Caixa fechado com sucesso!');
    } catch (e) {
      showToast('Erro ao fechar caixa: ' + (e as Error).message, false);
    } finally { setFechando(false); }
  }

  // ── Renders ────────────────────────────────────────────────────────────────

  if (loadingSessao) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const filialNome = orgContexto.filial?.nome_fantasia ?? orgContexto.matriz?.nome ?? orgContexto.holding?.nome ?? '—';

  // ── Tela: Caixa fechado ────────────────────────────────────────────────────
  if (view === 'fechado') {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-50 p-8">
        {toast && <Toast {...toast} />}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-8">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
              <Lock className="w-8 h-8 text-slate-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 text-center mb-1">Abrir Caixa</h2>
          <p className="text-slate-500 text-sm text-center mb-6">{filialNome}</p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Operador *</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Seu nome"
                value={operadorNome}
                onChange={e => setOperadorNome(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAbrirCaixa()}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Saldo inicial (fundo de troco)</label>
              <input
                type="number" min="0" step="0.01"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0,00"
                value={saldoInicial}
                onChange={e => setSaldoInicial(e.target.value)}
              />
            </div>
            <button
              onClick={handleAbrirCaixa}
              disabled={abrindo}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
            >
              {abrindo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
              Abrir Caixa
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400">
            <Monitor className="w-3.5 h-3.5" />
            <span>Preparado para integração TEF (Stone, Cielo, PagSeguro)</span>
          </div>
        </div>
      </div>
    );
  }

  // ── Tela: Sucesso ──────────────────────────────────────────────────────────
  if (view === 'sucesso' && sucesso) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-50 p-8">
        {toast && <Toast {...toast} />}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-1">Venda Realizada!</h2>
          <p className="text-slate-500 text-sm mb-6">Pedido #{sucesso.numero} · {filialNome}</p>

          <div className="bg-slate-50 rounded-xl p-4 text-left space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Total</span>
              <span className="font-bold text-slate-800">{brl(sucesso.total)}</span>
            </div>
            {sucesso.formas.map((p, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-slate-500">{p.forma}{p.parcelas && p.parcelas > 1 ? ` ${p.parcelas}x` : ''}</span>
                <span>{brl(p.valor)}</span>
              </div>
            ))}
            {sucesso.troco > 0 && (
              <div className="flex justify-between text-sm font-semibold text-green-700 border-t border-slate-200 pt-2 mt-2">
                <span>Troco</span>
                <span>{brl(sucesso.troco)}</span>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => window.print()}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg py-2.5 text-sm font-medium transition-colors"
            >
              <Printer className="w-4 h-4" /> Imprimir
            </button>
            <button
              onClick={() => setView('pdv')}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> Nova Venda
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Tela: Fechamento de caixa ──────────────────────────────────────────────
  if (view === 'fechamento' && sessao) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-slate-50 p-8">
        {toast && <Toast {...toast} />}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-8">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setView('pdv')} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Fechar Caixa #{sessao.numero}</h2>
              <p className="text-sm text-slate-500">Operador: {sessao.operador_nome}</p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 space-y-2 mb-6">
            <SummaryRow label="Saldo inicial" value={brl(sessao.saldo_inicial)} />
            <SummaryRow label="Total de vendas" value={brl(sessao.total_vendas)} bold />
            <SummaryRow label="Qtd. vendas" value={String(sessao.qtd_vendas)} />
            <SummaryRow label="Saldo esperado" value={brl(sessao.saldo_inicial + sessao.total_vendas)} bold />
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Saldo em caixa (contagem física)</label>
              <input
                type="number" min="0" step="0.01"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0,00"
                value={saldoFinal}
                onChange={e => setSaldoFinal(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Observações</label>
              <textarea
                rows={2}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                value={obsFechamento}
                onChange={e => setObsFechamento(e.target.value)}
              />
            </div>
            <button
              onClick={handleFecharCaixa}
              disabled={fechando}
              className="w-full bg-red-600 hover:bg-red-700 text-white rounded-lg py-3 font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
            >
              {fechando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              Confirmar Fechamento
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Tela: PDV principal ────────────────────────────────────────────────────
  if (view === 'pdv' && sessao) {
    const clienteSel = clientes.find(c => c.id === clienteId);
    const prodsFiltrados = produtos.filter(p =>
      !search ||
      p.nome.toLowerCase().includes(search.toLowerCase()) ||
      (p.codigo_interno ?? '').toLowerCase().includes(search.toLowerCase())
    ).slice(0, 30);

    return (
      <div className="h-full flex flex-col bg-slate-900 text-white">
        {toast && <Toast {...toast} />}

        {/* Top Bar */}
        <div className="flex items-center gap-4 px-4 py-2 bg-slate-800 border-b border-slate-700 shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-400" />
            <span className="font-bold text-sm">PDV</span>
            <span className="text-xs bg-slate-700 px-2 py-0.5 rounded">#{sessao.numero}</span>
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-1">
            <Monitor className="w-3.5 h-3.5" />
            {filialNome}
          </div>
          <div className="ml-auto flex items-center gap-4">
            <div className="text-xs text-slate-400 flex items-center gap-1">
              <Wifi className="w-3.5 h-3.5 text-green-400" />
              <span className="font-mono">{hora}</span>
            </div>
            <div className="text-xs text-slate-400">
              {sessao.operador_nome} · <span className="text-green-400">{sessao.qtd_vendas} venda(s) · {brl(sessao.total_vendas)}</span>
            </div>
            <button
              onClick={() => setView('fechamento')}
              className="flex items-center gap-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded px-2.5 py-1 text-xs transition-colors"
            >
              <Lock className="w-3.5 h-3.5" /> Fechar Caixa
            </button>
          </div>
        </div>

        {/* Main area */}
        <div className="flex flex-1 min-h-0">

          {/* Left: Search + Products + Cart */}
          <div className="flex flex-col flex-1 min-w-0 border-r border-slate-700">

            {/* Search bar */}
            <div className="px-3 py-2 border-b border-slate-700 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  ref={searchRef}
                  className="w-full bg-slate-700 text-white placeholder-slate-400 pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Buscar produto por nome ou código… (F2)"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  autoFocus
                />
                {loadingProd && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />}
              </div>
            </div>

            {/* Product grid (visible only when searching) */}
            {search && (
              <div className="border-b border-slate-700 p-2 shrink-0 max-h-48 overflow-y-auto bg-slate-800">
                {prodsFiltrados.length === 0 ? (
                  <div className="text-center py-4 text-slate-500 text-sm flex flex-col items-center gap-1">
                    <Package className="w-5 h-5" /> Nenhum produto encontrado
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                    {prodsFiltrados.map(p => (
                      <button
                        key={p.id}
                        onClick={() => addItem(p)}
                        className="bg-slate-700 hover:bg-blue-700 rounded-lg p-2.5 text-left transition-colors group"
                      >
                        <div className="text-xs font-medium text-white truncate">{p.nome}</div>
                        <div className="text-xs text-slate-400 group-hover:text-blue-200">{p.codigo_interno}</div>
                        <div className="text-sm font-bold text-green-400 mt-1">{brl(p.preco_venda ?? 0)}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Cart */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {itens.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-2">
                  <ShoppingCart className="w-10 h-10" />
                  <p className="text-sm">Carrinho vazio — busque um produto acima</p>
                  <p className="text-xs text-slate-700">F2 para buscar · F4 para pagar</p>
                </div>
              ) : (
                itens.map(item => (
                  <div key={item.id} className="bg-slate-800 rounded-lg px-3 py-2 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{item.nome}</div>
                      <div className="text-xs text-slate-400">{item.codigo} · {item.unidade}</div>
                    </div>
                    {/* Price edit */}
                    <input
                      type="number" min="0" step="0.01"
                      className="w-20 bg-slate-700 text-white text-xs rounded px-2 py-1 text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={item.preco}
                      onChange={e => setPriceItem(item.id, parseFloat(e.target.value) || 0)}
                    />
                    {/* Qty */}
                    <div className="flex items-center gap-1">
                      <button onClick={() => setQtd(item.id, item.qtd - 1)} className="w-6 h-6 bg-slate-700 hover:bg-slate-600 rounded flex items-center justify-center">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-bold">{item.qtd}</span>
                      <button onClick={() => setQtd(item.id, item.qtd + 1)} className="w-6 h-6 bg-slate-700 hover:bg-slate-600 rounded flex items-center justify-center">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    {/* Discount */}
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <span>Desc.</span>
                      <input
                        type="number" min="0" max="100" step="0.5"
                        className="w-12 bg-slate-700 text-white text-xs rounded px-1.5 py-1 text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={item.desconto}
                        onChange={e => setDescItem(item.id, parseFloat(e.target.value) || 0)}
                      />
                      <span>%</span>
                    </div>
                    {/* Total */}
                    <div className="w-20 text-right text-sm font-bold text-green-400">
                      {brl(item.qtd * item.preco * (1 - item.desconto / 100))}
                    </div>
                    <button onClick={() => setQtd(item.id, 0)} className="text-slate-600 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Customer + Totals + Payment */}
          <div className="w-80 flex flex-col bg-slate-800 shrink-0">

            {/* Customer */}
            <div className="p-3 border-b border-slate-700">
              <div className="text-xs text-slate-400 mb-1.5 flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> Cliente (opcional)
              </div>
              {clienteSel ? (
                <div className="flex items-center gap-2 bg-slate-700 rounded-lg px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{clienteSel.nome}</div>
                    <div className="text-xs text-slate-400">{clienteSel.cpf_cnpj}</div>
                  </div>
                  <button onClick={() => { setClienteId(''); setClienteSearch(''); }} className="text-slate-500 hover:text-red-400">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    className="w-full bg-slate-700 text-white placeholder-slate-500 px-3 py-1.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Buscar cliente ou CPF…"
                    value={clienteSearch}
                    onChange={e => setClienteSearch(e.target.value)}
                  />
                  {clienteSearch && (
                    <div className="absolute top-full left-0 right-0 bg-slate-700 border border-slate-600 rounded-lg shadow-xl z-20 max-h-36 overflow-y-auto mt-1">
                      {clientes.filter(c =>
                        c.nome.toLowerCase().includes(clienteSearch.toLowerCase()) ||
                        (c.cpf_cnpj ?? '').includes(clienteSearch)
                      ).slice(0, 5).map(c => (
                        <button key={c.id} onClick={() => { setClienteId(c.id); setClienteSearch(''); }}
                          className="w-full px-3 py-2 hover:bg-slate-600 text-xs text-left border-b border-slate-600 last:border-0">
                          <div className="font-medium">{c.nome}</div>
                          <div className="text-slate-400">{c.cpf_cnpj}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Order totals */}
            <div className="p-3 border-b border-slate-700 space-y-1.5">
              <div className="flex justify-between text-xs text-slate-400">
                <span>{itens.reduce((s, i) => s + i.qtd, 0)} item(ns)</span>
                <span>{itens.length} produto(s)</span>
              </div>
              {itens.some(i => i.desconto > 0) && (
                <div className="flex justify-between text-xs text-amber-400">
                  <span>Descontos</span>
                  <span>- {brl(itens.reduce((s, i) => s + i.qtd * i.preco * (i.desconto / 100), 0))}</span>
                </div>
              )}
              <div className="flex justify-between text-2xl font-black pt-1">
                <span className="text-slate-300">TOTAL</span>
                <span className="text-green-400">{brl(subtotal)}</span>
              </div>
            </div>

            {/* Shortcuts hint */}
            <div className="px-3 py-2 border-b border-slate-700 flex gap-2">
              {[
                { key: 'F2', label: 'Buscar' },
                { key: 'F4', label: 'Pagar' },
              ].map(k => (
                <span key={k.key} className="flex items-center gap-1 text-xs text-slate-500">
                  <kbd className="bg-slate-700 rounded px-1.5 py-0.5 text-slate-300 font-mono text-xs">{k.key}</kbd>
                  {k.label}
                </span>
              ))}
            </div>

            {/* Pay button */}
            <div className="p-3 mt-auto">
              <button
                onClick={initPagamento}
                disabled={itens.length === 0}
                className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl py-4 font-black text-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Calculator className="w-5 h-5" />
                PAGAR <span className="text-sm font-normal opacity-75">(F4)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Tela: Pagamento ────────────────────────────────────────────────────────
  if (view === 'pagamento') {
    const totalPagoNow = pagamentos.reduce((s, p) => s + p.valor, 0);
    const restanteNow  = Math.max(0, subtotal - totalPagoNow);
    const trocoNow     = Math.max(0, totalPagoNow - subtotal);
    const pago         = totalPagoNow >= subtotal - 0.01;

    return (
      <div className="h-full flex bg-slate-900 text-white">
        {toast && <Toast {...toast} />}

        {/* Left: order summary */}
        <div className="w-80 flex flex-col border-r border-slate-700 bg-slate-800">
          <div className="p-4 border-b border-slate-700">
            <button onClick={() => setView('pdv')} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors mb-4">
              <X className="w-4 h-4" /> Voltar ao PDV
            </button>
            <h2 className="text-lg font-bold">Resumo do Pedido</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {itens.map(item => (
              <div key={item.id} className="flex justify-between text-xs py-1 border-b border-slate-700">
                <div>
                  <div className="font-medium">{item.nome}</div>
                  <div className="text-slate-400">{item.qtd}x {brl(item.preco)}</div>
                </div>
                <div className="text-green-400 font-bold">{brl(item.qtd * item.preco * (1 - item.desconto / 100))}</div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-slate-700 text-xl font-black flex justify-between">
            <span className="text-slate-300">TOTAL</span>
            <span className="text-green-400">{brl(subtotal)}</span>
          </div>
        </div>

        {/* Right: payment forms */}
        <div className="flex-1 flex flex-col p-6 overflow-y-auto">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-blue-400" /> Formas de Pagamento
          </h2>

          {/* Payment method buttons */}
          <div className="grid grid-cols-3 gap-2 mb-4 sm:grid-cols-5">
            {FORMAS.map(f => (
              <button
                key={f.id}
                onClick={() => { setFormaPag(f.id); setValorPag(restanteNow.toFixed(2)); }}
                className={`rounded-xl py-3 px-2 flex flex-col items-center gap-1 text-xs font-semibold transition-colors ${
                  formaPag === f.id ? f.color + ' text-white ring-2 ring-white/40' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                }`}
              >
                <f.icon className="w-5 h-5" />
                {f.label}
              </button>
            ))}
          </div>

          {/* Amount input */}
          <div className="bg-slate-800 rounded-xl p-4 mb-4">
            <label className="block text-xs text-slate-400 mb-2">Valor a receber ({FORMAS.find(f => f.id === formaPag)?.label})</label>
            <input
              type="number" min="0" step="0.01"
              className="w-full bg-slate-700 text-white text-2xl font-bold rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={valorPag}
              onChange={e => setValorPag(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addPagamento()}
            />
            {formaPag === 'DINHEIRO' && parseFloat(valorPag || '0') > restanteNow + 0.01 && (
              <div className="mt-2 text-xs text-green-400">
                Troco: {brl(parseFloat(valorPag || '0') - restanteNow)}
              </div>
            )}

            {/* Parcelas (crédito) */}
            {formaPag === 'CREDITO' && (
              <div className="mt-3">
                <label className="block text-xs text-slate-400 mb-1">Parcelas</label>
                <select
                  className="bg-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={parcelas}
                  onChange={e => setParcelas(parseInt(e.target.value))}
                >
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                    <option key={n} value={n}>{n}x {brl(parseFloat(valorPag || '0') / n)}</option>
                  ))}
                </select>
              </div>
            )}

            {/* PIX QR placeholder */}
            {formaPag === 'PIX' && (
              <div className="mt-3 bg-white rounded-lg p-3 flex flex-col items-center gap-2">
                <div className="w-24 h-24 bg-slate-200 rounded flex items-center justify-center text-slate-400 text-xs text-center">
                  QR Code<br/>PIX<br/>(integração)
                </div>
                <p className="text-slate-600 text-xs text-center">
                  Em produção: gerar QR via Asaas / Iugu API
                </p>
              </div>
            )}

            {/* TEF status */}
            {tefPending && (
              <div className="mt-3 bg-amber-900/40 border border-amber-600/40 rounded-lg px-3 py-2 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-amber-400 shrink-0" />
                <span className="text-amber-300 text-sm">{tefMsg}</span>
              </div>
            )}
            {tefMsg && !tefPending && (
              <div className="mt-3 bg-red-900/40 border border-red-600/40 rounded-lg px-3 py-2 text-red-300 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {tefMsg}
              </div>
            )}

            <button
              onClick={addPagamento}
              disabled={tefPending || !valorPag || parseFloat(valorPag) <= 0}
              className="mt-3 w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg py-2.5 font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              {(formaPag === 'CREDITO' || formaPag === 'DEBITO') ? (
                <><Monitor className="w-4 h-4" /> Processar Maquininha</>
              ) : (
                <><Plus className="w-4 h-4" /> Adicionar Pagamento</>
              )}
            </button>
          </div>

          {/* Applied payments */}
          {pagamentos.length > 0 && (
            <div className="bg-slate-800 rounded-xl p-4 mb-4">
              <h3 className="text-xs font-semibold text-slate-400 mb-2">Pagamentos lançados</h3>
              <div className="space-y-1.5">
                {pagamentos.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-300">{p.forma}{p.parcelas && p.parcelas > 1 ? ` ${p.parcelas}x` : ''}</span>
                      {p.nsu && <span className="text-xs text-slate-500">NSU: {p.nsu}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-green-400">{brl(p.valor)}</span>
                      <button onClick={() => setPagamentos(prev => prev.filter((_, j) => j !== i))} className="text-slate-600 hover:text-red-400">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-700 mt-2 pt-2 flex justify-between text-sm">
                <span className="text-slate-400">Pago</span>
                <span className="font-bold text-white">{brl(totalPagoNow)}</span>
              </div>
              {restanteNow > 0.01 && (
                <div className="flex justify-between text-sm text-amber-400">
                  <span>Restante</span>
                  <span className="font-bold">{brl(restanteNow)}</span>
                </div>
              )}
              {trocoNow > 0.01 && (
                <div className="flex justify-between text-sm text-green-400 font-bold">
                  <span>Troco</span>
                  <span>{brl(trocoNow)}</span>
                </div>
              )}
            </div>
          )}

          {/* Finalize */}
          <button
            onClick={finalizarVenda}
            disabled={!pago || tefPending}
            className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl py-4 font-black text-xl flex items-center justify-center gap-3 transition-colors"
          >
            <CheckCircle className="w-6 h-6" />
            FINALIZAR VENDA
            {pago && <ArrowRight className="w-5 h-5" />}
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// ── Sub-componentes ────────────────────────────────────────────────────────────

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white ${ok ? 'bg-green-600' : 'bg-red-600'}`}>
      {ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      {msg}
    </div>
  );
}

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${bold ? 'font-bold text-slate-700' : 'text-slate-600'}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
