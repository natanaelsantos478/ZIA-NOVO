// ─────────────────────────────────────────────────────────────────────────────
// PedidoVendaForm — Formulário multi-etapas de criação de pedido de venda
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import {
  ChevronRight, ChevronLeft, Search, Plus, Trash2, ShoppingBag,
  Loader2, Truck, CreditCard, Users, MapPin, FileText, CheckCircle,
  AlertCircle, Building2, PackageSearch,
} from 'lucide-react';
import {
  getClientes, getProdutos, createPedido, getFornecedores,
  getEmpresas, getCondicoesPagamento, getNaturezasOperacao, getDepositos, getEmployeesSimple,
} from '../../../lib/erp';
import { useAppContext } from '../../../context/AppContext';
import type {
  ErpCliente, ErpProduto, ErpEmpresa, ErpFornecedor,
  ErpCondicaoPagamento, ErpNaturezaOperacao, ErpDeposito, ErpEmployeeSimple,
} from '../../../lib/erp';

// ── Tipos internos ────────────────────────────────────────────────────────────

interface ItemCarrinho {
  produto: ErpProduto;
  descricao_item: string;
  quantidade: number;
  unidade_medida: string;
  preco_unitario: number;
  desconto_item_pct: number;
  ipi_pct: number;
  cfop: string;
  ncm: string;
  cst_icms: string;
}

interface ParcelaPreview {
  numero: number;
  vencimento: string;
  valor: number;
  percentual: number;
}

interface EnderecoEntrega {
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
}

interface Props {
  onSaved: () => void;
  onCancel: () => void;
}

// ── Constantes ────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Pedido',      icon: FileText  },
  { id: 2, label: 'Itens',       icon: ShoppingBag },
  { id: 3, label: 'Transporte',  icon: Truck     },
  { id: 4, label: 'Financeiro',  icon: CreditCard },
  { id: 5, label: 'Agentes',     icon: Users     },
  { id: 6, label: 'Entrega',     icon: MapPin    },
  { id: 7, label: 'Observações', icon: FileText  },
];

const MODALIDADE_FRETE = [
  { v: '0', l: '0 – Emitente' },
  { v: '1', l: '1 – Destinatário' },
  { v: '2', l: '2 – Terceiros' },
  { v: '3', l: '3 – Próprio por conta do remetente' },
  { v: '4', l: '4 – Próprio por conta do destinatário' },
  { v: '9', l: '9 – Sem frete' },
];

const FINALIDADE_NFE = [
  { v: '1', l: '1 – Normal' },
  { v: '2', l: '2 – Complementar' },
  { v: '3', l: '3 – Ajuste' },
  { v: '4', l: '4 – Devolução/Retorno' },
];

const TIPO_PEDIDO = ['VENDA', 'DEVOLUCAO', 'DEMONSTRACAO', 'REVENDA'] as const;

const INPUT = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';
const LABEL = 'block text-xs font-medium text-slate-600 mb-1';

// ── Helpers ───────────────────────────────────────────────────────────────────

function addDays(base: string, days: number): string {
  const d = new Date(base + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function formatBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ── Componentes auxiliares ────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={LABEL}>{label}</label>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-bold text-slate-700 mb-4 pb-2 border-b border-slate-100">{children}</h3>;
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function PedidoVendaForm({ onSaved, onCancel }: Props) {
  const { orgContexto } = useAppContext();
  const isFilialMode = !!orgContexto.filial;

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Dados de referência
  const [empresas, setEmpresas] = useState<ErpEmpresa[]>([]);
  const [clientes, setClientes] = useState<ErpCliente[]>([]);
  const [condicoes, setCondicoes] = useState<ErpCondicaoPagamento[]>([]);
  const [naturezas, setNaturezas] = useState<ErpNaturezaOperacao[]>([]);
  const [depositos, setDepositos] = useState<ErpDeposito[]>([]);
  const [employees, setEmployees] = useState<ErpEmployeeSimple[]>([]);
  const [produtos, setProdutos] = useState<ErpProduto[]>([]);
  const [loadingRef, setLoadingRef] = useState(true);

  // ── Step 1: Pedido ──────────────────────────────────────────────────────────
  const [empresaId, setEmpresaId] = useState('');
  const [tipo, setTipo] = useState<'VENDA' | 'DEVOLUCAO' | 'DEMONSTRACAO' | 'REVENDA'>('VENDA');
  const [clienteId, setClienteId] = useState('');
  const [clienteSearch, setClienteSearch] = useState('');
  const [dataEmissao, setDataEmissao] = useState(new Date().toISOString().split('T')[0]);
  const [dataEntrega, setDataEntrega] = useState('');
  const [naturezaId, setNaturezaId] = useState('');
  const [depositoId, setDepositoId] = useState('');
  const [tabelaPreco, setTabelaPreco] = useState('');
  const [pedidoCompra, setPedidoCompra] = useState('');
  const [consumidorFinal, setConsumidorFinal] = useState('1');
  const [finalidadeNfe, setFinalidadeNfe] = useState('1');

  // ── Step 2: Itens ───────────────────────────────────────────────────────────
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [prodSearch, setProdSearch] = useState('');
  const [showProdList, setShowProdList] = useState(false);

  // ── Step 3: Transporte ──────────────────────────────────────────────────────
  const [tipoFreteMode, setTipoFreteMode] = useState<'novo' | 'existente'>('novo');
  const [modalidadeFrete, setModalidadeFrete] = useState('9');
  const [freteValor, setFreteValor] = useState('0');
  const [transportadoraId, setTransportadoraId] = useState('');
  const [transportadoraNome, setTransportadoraNome] = useState('');
  const [transportadoraCnpj, setTransportadoraCnpj] = useState('');
  const [placaVeiculo, setPlacaVeiculo] = useState('');
  const [pesoBruto, setPesoBruto] = useState('');
  const [pesoLiquido, setPesoLiquido] = useState('');
  const [volumes, setVolumes] = useState('');
  const [especieVolume, setEspecieVolume] = useState('');
  const [fornecedores, setFornecedores] = useState<ErpFornecedor[]>([]);

  // ── Step 4: Financeiro ──────────────────────────────────────────────────────
  const [condicaoId, setCondicaoId] = useState('');
  const [descontoGlobalPct, setDescontoGlobalPct] = useState('0');
  const [descontoGlobalValor, setDescontoGlobalValor] = useState('0');
  const [acrescimo, setAcrescimo] = useState('0');

  // ── Step 5: Agentes ─────────────────────────────────────────────────────────
  const [vendedorId, setVendedorId] = useState('');
  const [vendedorAuxiliar, setVendedorAuxiliar] = useState('');
  const [comissaoAuxiliar, setComissaoAuxiliar] = useState('0');
  const [centroCusto, setCentroCusto] = useState('');
  const [projeto, setProjeto] = useState('');

  // ── Step 6: Entrega ─────────────────────────────────────────────────────────
  const [endIgualCliente, setEndIgualCliente] = useState(true);
  const [endEntrega, setEndEntrega] = useState<EnderecoEntrega>({
    logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '', cep: '',
  });

  // ── Step 7: Observações ─────────────────────────────────────────────────────
  const [obsNfe, setObsNfe] = useState('');
  const [obsInterna, setObsInterna] = useState('');
  const [infComplementares, setInfComplementares] = useState('');

  // ── Carregar dados de referência ────────────────────────────────────────────

  useEffect(() => {
    Promise.all([
      getEmpresas().then(list => { setEmpresas(list); if (list.length === 1) setEmpresaId(list[0].id); }).catch(() => {}),
      getClientes().then(setClientes).catch(() => {}),
      getCondicoesPagamento().then(setCondicoes).catch(() => {}),
      getNaturezasOperacao().then(setNaturezas).catch(() => {}),
      getDepositos().then(setDepositos).catch(() => {}),
      getEmployeesSimple().then(setEmployees).catch(() => {}),
      getProdutos().then(setProdutos).catch(() => {}),
      getFornecedores().then(setFornecedores).catch(() => {}),
    ]).finally(() => setLoadingRef(false));
  }, []);

  useEffect(() => {
    if (prodSearch.length > 1) getProdutos(prodSearch).then(setProdutos).catch(() => {});
  }, [prodSearch]);

  // ── Cálculos ────────────────────────────────────────────────────────────────

  const totalProdutos = itens.reduce((s, i) => {
    const subtotal = i.quantidade * i.preco_unitario * (1 - i.desconto_item_pct / 100);
    return s + subtotal;
  }, 0);

  const totalIpi = itens.reduce((s, i) => {
    const subtotal = i.quantidade * i.preco_unitario * (1 - i.desconto_item_pct / 100);
    return s + subtotal * (i.ipi_pct / 100);
  }, 0);

  const descontoGlobalCalc = Math.max(
    +(descontoGlobalValor || 0),
    totalProdutos * (+(descontoGlobalPct || 0) / 100),
  );

  const totalPedido = totalProdutos + totalIpi + +(freteValor || 0) + +(acrescimo || 0) - descontoGlobalCalc;

  // Parcelas preview
  const condicaoSelecionada = condicoes.find(c => c.id === condicaoId);
  const parcelasPreview: ParcelaPreview[] = condicaoSelecionada?.parcelas_json?.map((p, i) => ({
    numero: i + 1,
    vencimento: addDays(dataEmissao, p.dias),
    valor: totalPedido * (p.percentual / 100),
    percentual: p.percentual,
  })) ?? [];

  // Preenche endereço de entrega a partir do cliente selecionado
  const clienteSelecionado = clientes.find(c => c.id === clienteId);
  useEffect(() => {
    if (endIgualCliente && clienteSelecionado?.endereco_json) {
      const e = clienteSelecionado.endereco_json as Record<string, string>;
      setEndEntrega({
        logradouro: e.logradouro ?? '',
        numero: e.numero ?? '',
        complemento: e.complemento ?? '',
        bairro: e.bairro ?? '',
        cidade: e.cidade ?? '',
        uf: e.uf ?? '',
        cep: e.cep ?? '',
      });
    }
  }, [endIgualCliente, clienteId, clienteSelecionado]);

  // Quando seleciona natureza de operação, propaga o CFOP default para itens existentes sem CFOP
  const naturezaSelecionada = naturezas.find(n => n.id === naturezaId);
  const cfopDefault = naturezaSelecionada?.cfop_padrao ?? '';

  // ── Itens helpers ───────────────────────────────────────────────────────────

  function addProduto(p: ErpProduto) {
    const ex = itens.find(i => i.produto.id === p.id);
    if (ex) {
      setItens(prev => prev.map(i => i.produto.id === p.id ? { ...i, quantidade: i.quantidade + 1 } : i));
    } else {
      setItens(prev => [...prev, {
        produto: p,
        descricao_item: p.nome,
        quantidade: 1,
        unidade_medida: p.unidade_medida,
        preco_unitario: p.preco_venda,
        desconto_item_pct: 0,
        ipi_pct: 0,
        cfop: cfopDefault,
        ncm: p.ncm ?? '',
        cst_icms: p.cst_icms ?? '',
      }]);
    }
    setShowProdList(false);
    setProdSearch('');
  }

  function updateItem<K extends keyof ItemCarrinho>(id: string, field: K, value: ItemCarrinho[K]) {
    setItens(prev => prev.map(i => i.produto.id === id ? { ...i, [field]: value } : i));
  }

  const showToast = useCallback((msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ── Salvar ──────────────────────────────────────────────────────────────────

  async function handleSave(status: 'RASCUNHO' | 'CONFIRMADO') {
    if (!clienteId) { showToast('Selecione um cliente.', false); setStep(1); return; }
    if (itens.length === 0) { showToast('Adicione pelo menos um produto.', false); setStep(2); return; }
    setSaving(true);
    try {
      await createPedido(
        {
          tipo,
          status,
          cliente_id: clienteId,
          vendedor_id: vendedorId || null,
          data_emissao: dataEmissao,
          data_entrega_prevista: dataEntrega || null,
          condicao_pagamento: condicaoSelecionada?.descricao ?? null,
          condicao_pagamento_id: condicaoId || null,
          natureza_operacao_id: naturezaId || null,
          natureza_operacao_texto: naturezaSelecionada ? `${naturezaSelecionada.codigo} – ${naturezaSelecionada.descricao}` : null,
          deposito_id: depositoId || null,
          deposito_texto: depositos.find(d => d.id === depositoId)?.nome ?? null,
          tabela_preco: tabelaPreco || null,
          pedido_compra: pedidoCompra || null,
          desconto_global_pct: +(descontoGlobalPct || 0),
          desconto_global_valor: +(descontoGlobalValor || 0) || null,
          acrescimo_valor: +(acrescimo || 0) || null,
          frete_valor: +(freteValor || 0),
          modalidade_frete: modalidadeFrete || null,
          transportadora_nome: transportadoraNome || null,
          transportadora_cnpj: transportadoraCnpj || null,
          placa_veiculo: placaVeiculo || null,
          peso_bruto: pesoBruto ? +pesoBruto : null,
          peso_liquido: pesoLiquido ? +pesoLiquido : null,
          volumes: volumes ? +volumes : null,
          especie_volume: especieVolume || null,
          total_produtos: totalProdutos,
          total_ipi: totalIpi || null,
          total_pedido: totalPedido,
          vendedor_auxiliar: vendedorAuxiliar || null,
          comissao_auxiliar_pct: +(comissaoAuxiliar || 0) || null,
          centro_custo: centroCusto || null,
          projeto: projeto || null,
          finalidade_nfe: finalidadeNfe || null,
          consumidor_final: consumidorFinal || null,
          end_entrega_igual_cliente: endIgualCliente,
          end_entrega_json: endIgualCliente ? null : endEntrega,
          obs_nfe: obsNfe || null,
          obs_interna: obsInterna || null,
          inf_complementares: infComplementares || null,
          observacoes: obsInterna || null,
          modelo_nfe: null,
          serie_nfe: null,
          ambiente_nfe: null,
        } as Parameters<typeof createPedido>[0],
        itens.map(i => ({
          produto_id: i.produto.id,
          descricao_item: i.descricao_item,
          quantidade: i.quantidade,
          unidade_medida: i.unidade_medida,
          preco_unitario: i.preco_unitario,
          desconto_item_pct: i.desconto_item_pct,
          ipi_pct: i.ipi_pct,
          ipi_valor: i.quantidade * i.preco_unitario * (1 - i.desconto_item_pct / 100) * (i.ipi_pct / 100),
          cfop: i.cfop,
          ncm: i.ncm,
          cst_icms: i.cst_icms,
          total_item: i.quantidade * i.preco_unitario * (1 - i.desconto_item_pct / 100),
        }))
      );
      showToast(status === 'CONFIRMADO' ? 'Pedido confirmado!' : 'Rascunho salvo.', true);
      setTimeout(onSaved, 1200);
    } catch (e) {
      showToast('Erro: ' + (e as Error).message, false);
    } finally {
      setSaving(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loadingRef) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400 mr-2" />
        <span className="text-slate-500 text-sm">Carregando...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Step indicator */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center gap-1 overflow-x-auto">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const active = step === s.id;
            const done = step > s.id;
            return (
              <div key={s.id} className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setStep(s.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    active ? 'bg-blue-600 text-white' :
                    done ? 'bg-green-50 text-green-700 border border-green-200' :
                    'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {s.label}
                </button>
                {idx < STEPS.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">

        {/* ── Step 1: Pedido ──────────────────────────────────────────────────── */}
        {step === 1 && (
          <div>
            <SectionTitle>Dados Gerais do Pedido</SectionTitle>
            <div className="grid grid-cols-3 gap-4">

              {/* Empresa emitente */}
              <Field label="Empresa Emitente">
                {isFilialMode ? (
                  <div className={`${INPUT} bg-slate-50 text-slate-700 cursor-not-allowed`}>
                    {empresas.find(e => e.id === empresaId)?.nome_fantasia ?? 'Carregando…'}
                  </div>
                ) : (
                  <select className={INPUT} value={empresaId} onChange={e => setEmpresaId(e.target.value)}>
                    <option value="">Selecione a empresa…</option>
                    {empresas.map(e => (
                      <option key={e.id} value={e.id}>{e.nome_fantasia} – {e.cnpj}</option>
                    ))}
                  </select>
                )}
              </Field>

              {/* Tipo */}
              <Field label="Tipo de Pedido">
                <select className={INPUT} value={tipo} onChange={e => setTipo(e.target.value as typeof tipo)}>
                  {TIPO_PEDIDO.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>

              {/* Finalidade NF-e */}
              <Field label="Finalidade NF-e">
                <select className={INPUT} value={finalidadeNfe} onChange={e => setFinalidadeNfe(e.target.value)}>
                  {FINALIDADE_NFE.map(f => <option key={f.v} value={f.v}>{f.l}</option>)}
                </select>
              </Field>

              {/* Cliente */}
              <div className="col-span-2">
                <Field label="Cliente *">
                  {!clienteId ? (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Buscar por nome ou CNPJ/CPF…" value={clienteSearch}
                        onChange={e => setClienteSearch(e.target.value)} />
                      {clienteSearch && (
                        <div className="absolute top-full left-0 right-0 border border-slate-200 bg-white rounded-lg shadow-xl z-20 max-h-48 overflow-y-auto">
                          {clientes.filter(c =>
                            c.nome.toLowerCase().includes(clienteSearch.toLowerCase()) ||
                            (c.cpf_cnpj ?? '').includes(clienteSearch)
                          ).slice(0, 8).map(c => (
                            <button key={c.id} onClick={() => { setClienteId(c.id); setClienteSearch(''); }}
                              className="w-full px-3 py-2 hover:bg-slate-50 text-sm text-left border-b border-slate-100 last:border-0">
                              <span className="font-medium">{c.nome}</span>
                              <span className="text-xs text-slate-400 ml-2">{c.cpf_cnpj}</span>
                            </button>
                          ))}
                          {clientes.filter(c => c.nome.toLowerCase().includes(clienteSearch.toLowerCase())).length === 0 && (
                            <div className="px-3 py-2 text-sm text-slate-400">Nenhum cliente encontrado.</div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                      <div>
                        <span className="text-sm font-medium text-blue-800">{clienteSelecionado?.nome}</span>
                        <span className="text-xs text-blue-600 ml-2">{clienteSelecionado?.cpf_cnpj}</span>
                      </div>
                      <button onClick={() => setClienteId('')} className="text-blue-600 hover:text-blue-800 text-xs">Alterar</button>
                    </div>
                  )}
                </Field>
              </div>

              {/* Consumidor final */}
              <Field label="Consumidor Final">
                <select className={INPUT} value={consumidorFinal} onChange={e => setConsumidorFinal(e.target.value)}>
                  <option value="1">1 – Sim (Pessoa Física / CF)</option>
                  <option value="0">0 – Não (Revenda / B2B)</option>
                </select>
              </Field>

              {/* Data emissão */}
              <Field label="Data de Emissão *">
                <input type="date" className={INPUT} value={dataEmissao} onChange={e => setDataEmissao(e.target.value)} />
              </Field>

              {/* Data entrega */}
              <Field label="Previsão de Entrega">
                <input type="date" className={INPUT} value={dataEntrega} onChange={e => setDataEntrega(e.target.value)} />
              </Field>

              {/* Natureza de operação */}
              <div className="col-span-2">
                <Field label="Natureza de Operação">
                  <select className={INPUT} value={naturezaId} onChange={e => setNaturezaId(e.target.value)}>
                    <option value="">Selecione…</option>
                    {naturezas.map(n => (
                      <option key={n.id} value={n.id}>{n.codigo} – {n.descricao} (CFOP {n.cfop_padrao})</option>
                    ))}
                  </select>
                </Field>
              </div>

              {/* Depósito */}
              <Field label="Depósito de Origem">
                <select className={INPUT} value={depositoId} onChange={e => setDepositoId(e.target.value)}>
                  <option value="">Selecione…</option>
                  {depositos.map(d => (
                    <option key={d.id} value={d.id}>{d.nome}</option>
                  ))}
                </select>
              </Field>

              {/* Tabela de preço */}
              <Field label="Tabela de Preço">
                <input className={INPUT} placeholder="Ex: Tabela A, Varejo..." value={tabelaPreco} onChange={e => setTabelaPreco(e.target.value)} />
              </Field>

              {/* Pedido de compra / referência */}
              <Field label="Pedido de Compra / Referência do Cliente">
                <input className={INPUT} placeholder="Nº PO, NF anterior, referência..." value={pedidoCompra} onChange={e => setPedidoCompra(e.target.value)} />
              </Field>

            </div>

            {/* Aviso sobre tributação por empresa */}
            {empresas.length > 1 && (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-800">
                <strong className="block mb-1 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" /> Configuração por Empresa
                </strong>
                Você tem {empresas.length} empresas cadastradas. A empresa emitente selecionada acima define qual CNPJ emite a NF-e.
                Na aba <strong>Itens</strong>, cada item permite ajustar individualmente o CFOP e a tributação (CST/NCM) conforme as regras fiscais de cada empresa.
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Itens ───────────────────────────────────────────────────── */}
        {step === 2 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <SectionTitle>Itens do Pedido</SectionTitle>
              <div className="relative">
                <button onClick={() => setShowProdList(!showProdList)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Adicionar Produto
                </button>
                {showProdList && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 w-96">
                    <div className="p-2 border-b border-slate-100">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input autoFocus className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Código, nome..." value={prodSearch} onChange={e => setProdSearch(e.target.value)} />
                      </div>
                    </div>
                    <div className="max-h-56 overflow-y-auto divide-y divide-slate-50">
                      {produtos.slice(0, 12).map(p => (
                        <button key={p.id} onClick={() => addProduto(p)}
                          className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 text-sm text-left">
                          <div>
                            <div className="font-medium text-slate-800">{p.nome}</div>
                            <div className="text-xs text-slate-400">{p.codigo_interno} · {p.unidade_medida} · NCM {p.ncm ?? '—'}</div>
                          </div>
                          <div className="text-right flex-shrink-0 ml-3">
                            <div className="font-medium text-blue-600">{formatBRL(p.preco_venda)}</div>
                            <div className="text-xs text-slate-400">Estq: {p.estoque_atual}</div>
                          </div>
                        </button>
                      ))}
                      {produtos.length === 0 && <div className="px-3 py-3 text-sm text-slate-400">Nenhum produto encontrado.</div>}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {itens.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                <PackageSearch className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-slate-400 text-sm">Nenhum item adicionado. Clique em "Adicionar Produto".</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[900px]">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="text-left px-2 py-2 text-slate-500 font-semibold">Produto / Descrição</th>
                      <th className="text-center px-2 py-2 text-slate-500 font-semibold w-16">UN</th>
                      <th className="text-right px-2 py-2 text-slate-500 font-semibold w-20">Qtd</th>
                      <th className="text-right px-2 py-2 text-slate-500 font-semibold w-24">Preço Unit.</th>
                      <th className="text-right px-2 py-2 text-slate-500 font-semibold w-16">Desc%</th>
                      <th className="text-right px-2 py-2 text-slate-500 font-semibold w-16">IPI%</th>
                      <th className="text-center px-2 py-2 text-slate-500 font-semibold w-20">CFOP</th>
                      <th className="text-center px-2 py-2 text-slate-500 font-semibold w-24">NCM</th>
                      <th className="text-center px-2 py-2 text-slate-500 font-semibold w-16">CST</th>
                      <th className="text-right px-2 py-2 text-slate-500 font-semibold w-24">Total</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {itens.map(item => {
                      const sub = item.quantidade * item.preco_unitario * (1 - item.desconto_item_pct / 100);
                      return (
                        <tr key={item.produto.id} className="hover:bg-slate-50">
                          <td className="px-2 py-2">
                            <div className="font-medium text-slate-800 truncate max-w-[160px]">{item.produto.nome}</div>
                            <input className="mt-1 w-full text-xs border border-slate-200 rounded px-1.5 py-1 text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-400"
                              placeholder="Descrição no documento..."
                              value={item.descricao_item}
                              onChange={e => updateItem(item.produto.id, 'descricao_item', e.target.value)} />
                          </td>
                          <td className="px-2 py-2">
                            <input className="w-full text-center border border-slate-200 rounded px-1 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                              value={item.unidade_medida}
                              onChange={e => updateItem(item.produto.id, 'unidade_medida', e.target.value)} />
                          </td>
                          <td className="px-2 py-2">
                            <input type="number" min="0.001" step="0.001" className="w-full text-right border border-slate-200 rounded px-1 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                              value={item.quantidade} onChange={e => updateItem(item.produto.id, 'quantidade', +e.target.value)} />
                          </td>
                          <td className="px-2 py-2">
                            <input type="number" min="0" step="0.0001" className="w-full text-right border border-slate-200 rounded px-1 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                              value={item.preco_unitario} onChange={e => updateItem(item.produto.id, 'preco_unitario', +e.target.value)} />
                          </td>
                          <td className="px-2 py-2">
                            <input type="number" min="0" max="100" step="0.01" className="w-full text-right border border-slate-200 rounded px-1 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                              value={item.desconto_item_pct} onChange={e => updateItem(item.produto.id, 'desconto_item_pct', +e.target.value)} />
                          </td>
                          <td className="px-2 py-2">
                            <input type="number" min="0" max="100" step="0.01" className="w-full text-right border border-slate-200 rounded px-1 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                              value={item.ipi_pct} onChange={e => updateItem(item.produto.id, 'ipi_pct', +e.target.value)} />
                          </td>
                          <td className="px-2 py-2">
                            <input className="w-full text-center border border-slate-200 rounded px-1 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 font-mono"
                              placeholder={cfopDefault || '5102'}
                              value={item.cfop} onChange={e => updateItem(item.produto.id, 'cfop', e.target.value)} />
                          </td>
                          <td className="px-2 py-2">
                            <input className="w-full text-center border border-slate-200 rounded px-1 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 font-mono"
                              value={item.ncm} onChange={e => updateItem(item.produto.id, 'ncm', e.target.value)} />
                          </td>
                          <td className="px-2 py-2">
                            <input className="w-full text-center border border-slate-200 rounded px-1 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 font-mono"
                              value={item.cst_icms} onChange={e => updateItem(item.produto.id, 'cst_icms', e.target.value)} />
                          </td>
                          <td className="px-2 py-2 text-right font-medium text-slate-800">{formatBRL(sub)}</td>
                          <td className="px-2 py-2">
                            <button onClick={() => setItens(prev => prev.filter(i => i.produto.id !== item.produto.id))}
                              className="text-slate-300 hover:text-red-500 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Totalizador de itens */}
            {itens.length > 0 && (
              <div className="mt-4 flex justify-end gap-6 text-sm border-t border-slate-100 pt-3">
                <div className="text-right">
                  <p className="text-xs text-slate-500">Total Produtos</p>
                  <p className="font-semibold text-slate-800">{formatBRL(totalProdutos)}</p>
                </div>
                {totalIpi > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-slate-500">Total IPI</p>
                    <p className="font-semibold text-slate-800">{formatBRL(totalIpi)}</p>
                  </div>
                )}
              </div>
            )}

            {/* Info tributação multi-empresa */}
            {empresas.length > 1 && (
              <div className="mt-4 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-xs text-blue-700">
                <strong>Tributação por empresa:</strong> O CFOP, NCM e CST de cada item podem ser ajustados individualmente acima.
                Para a empresa emitente <strong>{empresas.find(e => e.id === empresaId)?.nome_fantasia ?? 'não selecionada'}</strong>,
                o CFOP padrão da natureza de operação é <strong>{cfopDefault || '—'}</strong>.
                Diferentes filiais podem exigir CFOPs distintos (ex: 5102 para SP → SP, 6102 para SP → outro estado).
              </div>
            )}
          </div>
        )}

        {/* ── Step 3: Transporte ──────────────────────────────────────────────── */}
        {step === 3 && (
          <div>
            <SectionTitle>Dados de Transporte / Frete</SectionTitle>

            {/* Modo de frete */}
            <div className="flex gap-3 mb-5">
              <button
                type="button"
                onClick={() => setTipoFreteMode('novo')}
                className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-semibold text-left transition-all ${tipoFreteMode === 'novo' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <Truck className="w-4 h-4" />
                  Cadastrar frete no pedido
                </div>
                <div className="text-xs font-normal opacity-70">Informar transportadora e dados manualmente</div>
              </button>
              <button
                type="button"
                onClick={() => setTipoFreteMode('existente')}
                className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-semibold text-left transition-all ${tipoFreteMode === 'existente' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <PackageSearch className="w-4 h-4" />
                  Puxar serviço de frete (SCM)
                </div>
                <div className="text-xs font-normal opacity-70">Usar frete já cadastrado no módulo de Logística</div>
              </button>
            </div>

            {/* Modo: cadastrar frete no pedido */}
            {tipoFreteMode === 'novo' && (
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Field label="Modalidade de Frete">
                    <select className={INPUT} value={modalidadeFrete} onChange={e => setModalidadeFrete(e.target.value)}>
                      {MODALIDADE_FRETE.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Valor do Frete (R$)">
                  <input type="number" min="0" step="0.01" className={INPUT} value={freteValor} onChange={e => setFreteValor(e.target.value)} />
                </Field>
                <div className="col-span-2">
                  <Field label="Transportadora">
                    <select
                      className={INPUT}
                      value={transportadoraId}
                      onChange={e => {
                        const id = e.target.value;
                        setTransportadoraId(id);
                        const f = fornecedores.find(f => f.id === id);
                        setTransportadoraNome(f?.nome ?? '');
                        setTransportadoraCnpj(f?.cnpj_cpf ?? '');
                      }}
                    >
                      <option value="">Selecione a transportadora…</option>
                      {fornecedores.map(f => (
                        <option key={f.id} value={f.id}>{f.nome}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="CNPJ da Transportadora">
                  <input
                    className={`${INPUT} bg-slate-50`}
                    readOnly
                    placeholder="Preenchido ao selecionar"
                    value={transportadoraCnpj}
                  />
                </Field>
                <Field label="Placa do Veículo">
                  <input className={INPUT} placeholder="ABC-1234" value={placaVeiculo} onChange={e => setPlacaVeiculo(e.target.value)} />
                </Field>
                <Field label="Peso Bruto (kg)">
                  <input type="number" min="0" step="0.001" className={INPUT} value={pesoBruto} onChange={e => setPesoBruto(e.target.value)} />
                </Field>
                <Field label="Peso Líquido (kg)">
                  <input type="number" min="0" step="0.001" className={INPUT} value={pesoLiquido} onChange={e => setPesoLiquido(e.target.value)} />
                </Field>
                <Field label="Quantidade de Volumes">
                  <input type="number" min="0" className={INPUT} value={volumes} onChange={e => setVolumes(e.target.value)} />
                </Field>
                <Field label="Espécie do Volume">
                  <input className={INPUT} placeholder="Ex: Caixas, Paletes…" value={especieVolume} onChange={e => setEspecieVolume(e.target.value)} />
                </Field>
              </div>
            )}

            {/* Modo: puxar frete do SCM */}
            {tipoFreteMode === 'existente' && (
              <div className="rounded-xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 p-6 text-center">
                <Truck className="w-10 h-10 text-emerald-300 mx-auto mb-3" />
                <p className="text-slate-600 font-medium mb-1">Selecionar serviço de frete do módulo SCM</p>
                <p className="text-xs text-slate-400 mb-4">
                  Acesse <strong>Logística › TMS (Fretes)</strong> para criar serviços de frete com cálculo de custos por km, combustível e pedágio.
                  Após criar, volte aqui para vincular ao pedido.
                </p>
                <a
                  href="/app/logistics"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  <PackageSearch className="w-4 h-4" />
                  Abrir módulo de Logística
                </a>
              </div>
            )}
          </div>
        )}

        {/* ── Step 4: Financeiro ──────────────────────────────────────────────── */}
        {step === 4 && (
          <div>
            <SectionTitle>Condições Financeiras</SectionTitle>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="col-span-3">
                <Field label="Condição de Pagamento">
                  <select className={INPUT} value={condicaoId} onChange={e => setCondicaoId(e.target.value)}>
                    <option value="">Selecione…</option>
                    {condicoes.map(c => (
                      <option key={c.id} value={c.id}>{c.descricao}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Desconto Global (%)">
                <input type="number" min="0" max="100" step="0.01" className={INPUT} value={descontoGlobalPct}
                  onChange={e => { setDescontoGlobalPct(e.target.value); setDescontoGlobalValor('0'); }} />
              </Field>
              <Field label="Desconto Global (R$)">
                <input type="number" min="0" step="0.01" className={INPUT} value={descontoGlobalValor}
                  onChange={e => { setDescontoGlobalValor(e.target.value); setDescontoGlobalPct('0'); }} />
              </Field>
              <Field label="Acréscimo (R$)">
                <input type="number" min="0" step="0.01" className={INPUT} value={acrescimo} onChange={e => setAcrescimo(e.target.value)} />
              </Field>
            </div>

            {/* Resumo financeiro */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Total Produtos</span>
                  <span className="font-medium">{formatBRL(totalProdutos)}</span>
                </div>
                {totalIpi > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Total IPI</span>
                    <span className="font-medium">{formatBRL(totalIpi)}</span>
                  </div>
                )}
                {+(freteValor || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Frete</span>
                    <span className="font-medium">{formatBRL(+(freteValor || 0))}</span>
                  </div>
                )}
                {descontoGlobalCalc > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Desconto</span>
                    <span>– {formatBRL(descontoGlobalCalc)}</span>
                  </div>
                )}
                {+(acrescimo || 0) > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Acréscimo</span>
                    <span>+ {formatBRL(+(acrescimo || 0))}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-base">
                  <span>Total do Pedido</span>
                  <span className="text-blue-600">{formatBRL(totalPedido)}</span>
                </div>
              </div>

              {/* Preview parcelas */}
              <div>
                {condicaoSelecionada ? (
                  <>
                    <p className="text-xs font-semibold text-slate-600 mb-2">Parcelas — {condicaoSelecionada.descricao}</p>
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="text-left px-3 py-2 text-slate-500">Parcela</th>
                            <th className="text-left px-3 py-2 text-slate-500">Vencimento</th>
                            <th className="text-right px-3 py-2 text-slate-500">%</th>
                            <th className="text-right px-3 py-2 text-slate-500">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {parcelasPreview.map(p => (
                            <tr key={p.numero}>
                              <td className="px-3 py-2 font-medium">{p.numero}/{parcelasPreview.length}</td>
                              <td className="px-3 py-2">{new Date(p.vencimento + 'T00:00').toLocaleDateString('pt-BR')}</td>
                              <td className="px-3 py-2 text-right">{p.percentual}%</td>
                              <td className="px-3 py-2 text-right font-medium">{formatBRL(p.valor)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6 text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-xl">
                    Selecione uma condição de pagamento para visualizar as parcelas.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 5: Agentes ─────────────────────────────────────────────────── */}
        {step === 5 && (
          <div>
            <SectionTitle>Agentes e Responsáveis</SectionTitle>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <Field label="Vendedor Responsável">
                  <select className={INPUT} value={vendedorId} onChange={e => setVendedorId(e.target.value)}>
                    <option value="">Nenhum / A definir</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.full_name} {e.position_title ? `– ${e.position_title}` : ''}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="col-span-2">
                <Field label="Vendedor Auxiliar / Assistente">
                  <input className={INPUT} placeholder="Nome do auxiliar..." value={vendedorAuxiliar} onChange={e => setVendedorAuxiliar(e.target.value)} />
                </Field>
              </div>
              <Field label="Comissão Auxiliar (%)">
                <input type="number" min="0" max="100" step="0.01" className={INPUT} value={comissaoAuxiliar} onChange={e => setComissaoAuxiliar(e.target.value)} />
              </Field>
              <div className="col-span-2">
                <Field label="Centro de Custo">
                  <input className={INPUT} placeholder="Ex: Comercial, Projetos, Filial SP..." value={centroCusto} onChange={e => setCentroCusto(e.target.value)} />
                </Field>
              </div>
              <Field label="Projeto Vinculado">
                <input className={INPUT} placeholder="Nome ou código do projeto..." value={projeto} onChange={e => setProjeto(e.target.value)} />
              </Field>
            </div>
            {employees.length === 0 && (
              <p className="mt-4 text-xs text-slate-400 bg-slate-50 rounded-lg px-4 py-3">
                Nenhum funcionário ativo encontrado. Cadastre funcionários no módulo RH para vinculá-los como vendedores.
              </p>
            )}
          </div>
        )}

        {/* ── Step 6: Entrega ──────────────────────────────────────────────────── */}
        {step === 6 && (
          <div>
            <SectionTitle>Endereço de Entrega</SectionTitle>
            <label className="flex items-center gap-2 cursor-pointer mb-5">
              <input type="checkbox" className="w-4 h-4 accent-blue-600" checked={endIgualCliente}
                onChange={e => setEndIgualCliente(e.target.checked)} />
              <span className="text-sm text-slate-700">Endereço de entrega igual ao do cliente</span>
              {clienteSelecionado && (
                <span className="text-xs text-slate-400">({clienteSelecionado.nome})</span>
              )}
            </label>

            {endIgualCliente && clienteSelecionado?.endereco_json ? (
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800">
                <p className="font-medium mb-1">Endereço do cliente</p>
                {(() => {
                  const e = clienteSelecionado.endereco_json as Record<string, string>;
                  return <p>{e.logradouro}, {e.numero} {e.complemento} – {e.bairro}, {e.cidade}/{e.uf} – CEP {e.cep}</p>;
                })()}
              </div>
            ) : endIgualCliente ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-xs text-amber-700">
                O cadastro do cliente não possui endereço preenchido. Preencha manualmente abaixo ou atualize o cadastro do cliente.
              </div>
            ) : null}

            {!endIgualCliente && (
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Field label="Logradouro">
                    <input className={INPUT} value={endEntrega.logradouro} onChange={e => setEndEntrega(p => ({ ...p, logradouro: e.target.value }))} />
                  </Field>
                </div>
                <Field label="Número">
                  <input className={INPUT} value={endEntrega.numero} onChange={e => setEndEntrega(p => ({ ...p, numero: e.target.value }))} />
                </Field>
                <Field label="Complemento">
                  <input className={INPUT} value={endEntrega.complemento} onChange={e => setEndEntrega(p => ({ ...p, complemento: e.target.value }))} />
                </Field>
                <div className="col-span-2">
                  <Field label="Bairro">
                    <input className={INPUT} value={endEntrega.bairro} onChange={e => setEndEntrega(p => ({ ...p, bairro: e.target.value }))} />
                  </Field>
                </div>
                <div className="col-span-2">
                  <Field label="Cidade">
                    <input className={INPUT} value={endEntrega.cidade} onChange={e => setEndEntrega(p => ({ ...p, cidade: e.target.value }))} />
                  </Field>
                </div>
                <Field label="UF">
                  <input className={INPUT} maxLength={2} placeholder="SP" value={endEntrega.uf} onChange={e => setEndEntrega(p => ({ ...p, uf: e.target.value.toUpperCase() }))} />
                </Field>
                <Field label="CEP">
                  <input className={INPUT} placeholder="00000-000" value={endEntrega.cep} onChange={e => setEndEntrega(p => ({ ...p, cep: e.target.value }))} />
                </Field>
              </div>
            )}
          </div>
        )}

        {/* ── Step 7: Observações ──────────────────────────────────────────────── */}
        {step === 7 && (
          <div>
            <SectionTitle>Observações e Informações</SectionTitle>
            <div className="space-y-4">
              <Field label="Observações para a NF-e (campo OBS da DANFE)">
                <textarea className={`${INPUT} h-20 resize-none`} value={obsNfe} onChange={e => setObsNfe(e.target.value)}
                  placeholder="Texto que aparece no campo de observações da nota fiscal..." />
              </Field>
              <Field label="Observações Internas (não aparece na NF-e)">
                <textarea className={`${INPUT} h-20 resize-none`} value={obsInterna} onChange={e => setObsInterna(e.target.value)}
                  placeholder="Notas internas, instruções para faturamento, alertas..." />
              </Field>
              <Field label="Informações Complementares (tributos / lei)">
                <textarea className={`${INPUT} h-20 resize-none`} value={infComplementares} onChange={e => setInfComplementares(e.target.value)}
                  placeholder="Ex: Tributado pelo Simples Nacional conforme LC 123/2006..." />
              </Field>
            </div>

            {/* Resumo final antes de salvar */}
            <div className="mt-6 bg-slate-50 rounded-xl p-4 text-sm">
              <p className="font-semibold text-slate-700 mb-3">Resumo do Pedido</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">Cliente</span><span className="font-medium">{clienteSelecionado?.nome ?? '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Tipo</span><span className="font-medium">{tipo}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Itens</span><span className="font-medium">{itens.length} produto(s)</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Condição</span><span className="font-medium">{condicaoSelecionada?.descricao ?? '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Empresa emitente</span><span className="font-medium">{empresas.find(e => e.id === empresaId)?.nome_fantasia ?? '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Depósito</span><span className="font-medium">{depositos.find(d => d.id === depositoId)?.nome ?? '—'}</span></div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between text-base font-bold">
                <span>Total do Pedido</span>
                <span className="text-blue-600">{formatBRL(totalPedido)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navegação */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button onClick={onCancel}
            className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:border-slate-300 transition-colors">
            Cancelar
          </button>
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:border-slate-300 transition-colors">
              <ChevronLeft className="w-4 h-4" /> Anterior
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {step < 7 && (
            <button onClick={() => setStep(s => s + 1)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
              Próximo <ChevronRight className="w-4 h-4" />
            </button>
          )}
          {step === 7 && (
            <>
              <button onClick={() => handleSave('RASCUNHO')} disabled={saving}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:border-slate-300 disabled:opacity-60 transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : null}
                Salvar Rascunho
              </button>
              <button onClick={() => handleSave('CONFIRMADO')} disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Confirmar Pedido
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
