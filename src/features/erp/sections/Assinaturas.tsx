import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Trash2, X, Loader2, CheckCircle, AlertCircle,
  ChevronRight, Save, FileText, DollarSign, User, Calendar, Percent,
  PauseCircle, PlayCircle, XCircle, StopCircle, RefreshCw, Phone, MessageCircle,
  History, Activity, Settings, CreditCard, Eye, AlertTriangle, Tag, Info,
} from 'lucide-react';
import {
  getAssinaturas, createAssinatura, updateAssinatura, deleteAssinatura,
  getVendedorFilter, getClientes, getProdutos, getZiaUsuarios,
  getAssinaturaHistorico, addAssinaturaHistorico, getAssinaturaCobrancas,
  type ErpAssinatura, type ErpCliente, type ErpProduto, type ZiaUsuario,
  type ErpAssinaturaHistorico, type ErpAssinaturaCobranca, type AssinaturaStatus,
} from '../../../lib/erp';
import { replaceAssinaturaItens } from '../../../lib/financeiro';

// ── Helpers ───────────────────────────────────────────────────────────────────

const BRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const DATE_FMT = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR');

/** Diferença em meses completos entre data_inicio e hoje */
function monthsSince(dataInicio: string): number {
  const start = new Date(dataInicio + 'T00:00:00');
  const now = new Date();
  return Math.max(
    0,
    (now.getFullYear() - start.getFullYear()) * 12 +
      (now.getMonth() - start.getMonth()),
  );
}

function calcLiquido(valorMensal: number, descontoPct: number): number {
  return valorMensal * (1 - descontoPct / 100);
}

function calcAcumulado(valorMensal: number, descontoPct: number, dataInicio: string): number {
  return monthsSince(dataInicio) * calcLiquido(valorMensal, descontoPct);
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  AssinaturaStatus,
  { label: string; bg: string; text: string }
> = {
  ativa:        { label: 'Ativa',        bg: 'bg-green-100',  text: 'text-green-700'  },
  pausada:      { label: 'Pausada',      bg: 'bg-yellow-100', text: 'text-yellow-700' },
  cancelada:    { label: 'Cancelada',    bg: 'bg-red-100',    text: 'text-red-700'    },
  encerrada:    { label: 'Encerrada',    bg: 'bg-slate-100',  text: 'text-slate-500'  },
  inadimplente: { label: 'Inadimplente', bg: 'bg-red-100',    text: 'text-red-700'    },
  em_trial:     { label: 'Em Trial',     bg: 'bg-amber-100',  text: 'text-amber-700'  },
};

function StatusBadge({ status }: { status: AssinaturaStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

// ── Form type ─────────────────────────────────────────────────────────────────

type AssForm = {
  cliente_id: string;
  produto_id: string; // Produto principal (legado — preenchido com o primeiro item)
  vendedor_id: string;
  valor_mensal: string;
  desconto_pct: string;
  data_inicio: string;
  data_fim: string;
  observacoes: string;
  status: AssinaturaStatus;
};

type AssItem = {
  key: number;
  produto_id: string;
  quantidade: number;
  valor_unitario: number;
  desconto_pct: number;
};

const EMPTY_FORM: AssForm = {
  cliente_id: '',
  produto_id: '',
  vendedor_id: '',
  valor_mensal: '',
  desconto_pct: '0',
  data_inicio: new Date().toISOString().slice(0, 10),
  data_fim: '',
  observacoes: '',
  status: 'ativa',
};

// ── Modal de criação ──────────────────────────────────────────────────────────

function CreateModal({
  clientes,
  produtos,
  usuarios,
  onClose,
  onSaved,
  showToast,
}: {
  clientes: ErpCliente[];
  produtos: ErpProduto[];
  usuarios: ZiaUsuario[];
  onClose: () => void;
  onSaved: (ass: ErpAssinatura) => void;
  showToast: (msg: string, ok: boolean) => void;
}) {
  const [form, setForm] = useState<AssForm>({ ...EMPTY_FORM });
  const [itens, setItens] = useState<AssItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [clienteSearch, setClienteSearch] = useState('');
  const [clienteOpen, setClienteOpen] = useState(false);
  const [keySeq, setKeySeq] = useState(0);

  const produtosAssinatura = produtos.filter(p => p.ativo);
  const clientesFiltrados = clientes.filter(c =>
    c.nome.toLowerCase().includes(clienteSearch.toLowerCase()),
  );
  const clienteSelecionado = clientes.find(c => c.id === form.cliente_id);

  const totalItens = itens.reduce((s, i) => s + i.quantidade * i.valor_unitario * (1 - i.desconto_pct / 100), 0);
  const descontoPct = parseFloat(form.desconto_pct) || 0;
  const valorMensal = itens.length > 0 ? totalItens : (parseFloat(form.valor_mensal) || 0);
  const valorLiquido = itens.length > 0 ? totalItens : calcLiquido(valorMensal, descontoPct);

  const addItem = () => {
    setKeySeq(k => k + 1);
    setItens(prev => [...prev, { key: keySeq, produto_id: '', quantidade: 1, valor_unitario: 0, desconto_pct: 0 }]);
  };
  const updItem = (key: number, patch: Partial<AssItem>) => {
    setItens(prev => prev.map(i => i.key === key ? { ...i, ...patch } : i));
  };
  const removeItem = (key: number) => setItens(prev => prev.filter(i => i.key !== key));

  async function handleSave() {
    if (!form.cliente_id) return showToast('Selecione um cliente.', false);
    const produtoPrincipal = itens.length > 0 ? itens[0].produto_id : form.produto_id;
    if (!produtoPrincipal) return showToast('Adicione pelo menos um produto.', false);
    if (itens.length === 0 && (!form.valor_mensal || valorMensal <= 0)) return showToast('Informe o valor mensal ou adicione produtos.', false);
    if (!form.data_inicio) return showToast('Informe a data de início.', false);
    setSaving(true);
    try {
      const payload = {
        cliente_id: form.cliente_id,
        produto_id: produtoPrincipal,
        vendedor_id: form.vendedor_id || null,
        valor_mensal: totalItens > 0 ? totalItens : valorMensal,
        desconto_pct: itens.length > 0 ? 0 : descontoPct,
        data_inicio: form.data_inicio,
        data_fim: form.data_fim || null,
        observacoes: form.observacoes || null,
        status: 'ativa' as const,
        crm_negociacao_id: null,
        ciclo_cobranca: null,
        proximo_vencimento: null,
        motivo_cancelamento: null,
        motivo_pausa: null,
        data_retorno_previsto: null,
        desconto_motivo: null,
        desconto_validade: null,
      };
      const created = await createAssinatura(payload);
      // Salvar itens se houver
      if (itens.length > 0) {
        await replaceAssinaturaItens(
          created.id,
          itens.map(i => ({ assinatura_id: created.id, produto_id: i.produto_id, quantidade: i.quantidade, valor_unitario: i.valor_unitario, desconto_pct: i.desconto_pct })),
        );
      }
      showToast('Assinatura criada com sucesso.', true);
      onSaved(created);
    } catch (e) {
      showToast('Erro: ' + (e as Error).message, false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-bold text-slate-900">Nova Assinatura</h3>
            <p className="text-xs text-slate-400 mt-0.5">Vincule um cliente a um plano/produto recorrente</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
          {/* Cliente */}
          <div className="relative">
            <label className="block text-xs font-medium text-slate-600 mb-1">Cliente *</label>
            {clienteSelecionado ? (
              <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-sm flex-1 truncate">{clienteSelecionado.nome}</span>
                <button
                  onClick={() => { setForm(p => ({ ...p, cliente_id: '' })); setClienteSearch(''); }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  placeholder="Buscar cliente..."
                  value={clienteSearch}
                  onChange={e => { setClienteSearch(e.target.value); setClienteOpen(true); }}
                  onFocus={() => setClienteOpen(true)}
                />
                {clienteOpen && clienteSearch && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto custom-scrollbar">
                    {clientesFiltrados.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-slate-400">Nenhum cliente encontrado</div>
                    ) : clientesFiltrados.map(c => (
                      <button
                        key={c.id}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors"
                        onClick={() => {
                          setForm(p => ({ ...p, cliente_id: c.id }));
                          setClienteSearch('');
                          setClienteOpen(false);
                        }}
                      >
                        <span className="font-medium">{c.nome}</span>
                        {c.cpf_cnpj && (
                          <span className="text-slate-400 text-xs ml-2">{c.cpf_cnpj}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Produtos da Assinatura */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-slate-600">Produtos da Assinatura *</label>
              <button type="button" onClick={addItem}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs hover:bg-slate-200 transition-colors">
                <Plus size={11}/> Produto
              </button>
            </div>

            {itens.length > 0 ? (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                      <th className="text-left px-3 py-1.5">Produto</th>
                      <th className="text-center px-2 py-1.5 w-12">Qtd</th>
                      <th className="text-right px-2 py-1.5 w-20">Vlr Unit.</th>
                      <th className="text-right px-2 py-1.5 w-12">Desc%</th>
                      <th className="text-right px-3 py-1.5 w-20">Total</th>
                      <th className="w-6"/>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map(item => {
                      const total = item.quantidade * item.valor_unitario * (1 - item.desconto_pct / 100);
                      return (
                        <tr key={item.key} className="border-b border-slate-50 last:border-0">
                          <td className="px-2 py-1.5">
                            <select value={item.produto_id}
                              onChange={e => {
                                const prod = produtosAssinatura.find(p => p.id === e.target.value);
                                updItem(item.key, { produto_id: e.target.value, valor_unitario: prod?.preco_venda ?? 0 });
                              }}
                              className="w-full border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400">
                              <option value="">Selecione…</option>
                              {produtosAssinatura.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                            </select>
                          </td>
                          <td className="px-1 py-1.5">
                            <input type="number" min="1" value={item.quantidade}
                              onChange={e => updItem(item.key, { quantidade: Number(e.target.value) })}
                              className="w-12 border border-slate-200 rounded px-1 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-slate-400"/>
                          </td>
                          <td className="px-1 py-1.5">
                            <input type="number" min="0" step="0.01" value={item.valor_unitario}
                              onChange={e => updItem(item.key, { valor_unitario: Number(e.target.value) })}
                              className="w-20 border border-slate-200 rounded px-1 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-slate-400"/>
                          </td>
                          <td className="px-1 py-1.5">
                            <input type="number" min="0" max="100" value={item.desconto_pct}
                              onChange={e => updItem(item.key, { desconto_pct: Number(e.target.value) })}
                              className="w-12 border border-slate-200 rounded px-1 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-slate-400"/>
                          </td>
                          <td className="px-2 py-1.5 text-right font-semibold text-slate-700 font-mono">{BRL(total)}</td>
                          <td className="px-1 py-1.5">
                            <button onClick={() => removeItem(item.key)} className="p-0.5 text-slate-300 hover:text-red-500">
                              <X size={12}/>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 border-t border-slate-200">
                      <td colSpan={4} className="px-3 py-1.5 text-xs text-slate-500 font-semibold">Total da assinatura:</td>
                      <td className="px-2 py-1.5 text-right font-bold text-slate-800 font-mono">{BRL(totalItens)}</td>
                      <td/>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              // Fallback: campo único legado
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                value={form.produto_id}
                onChange={e => setForm(p => ({ ...p, produto_id: e.target.value }))}
              >
                <option value="">Selecione um plano ou clique + Produto…</option>
                {produtosAssinatura.map(prod => (
                  <option key={prod.id} value={prod.id}>
                    {prod.nome} — {BRL(prod.preco_venda)}/mês
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Vendedor */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Vendedor Responsável</label>
            <select
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              value={form.vendedor_id}
              onChange={e => setForm(p => ({ ...p, vendedor_id: e.target.value }))}
            >
              <option value="">Sem vendedor</option>
              {usuarios.filter(u => u.ativo).map(u => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          </div>

          {/* Valores */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Valor Mensal (R$) *</label>
              <input
                type="number" min="0" step="0.01"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                placeholder="0,00"
                value={form.valor_mensal}
                onChange={e => setForm(p => ({ ...p, valor_mensal: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Desconto (%)</label>
              <input
                type="number" min="0" max="100" step="0.1"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                value={form.desconto_pct}
                onChange={e => setForm(p => ({ ...p, desconto_pct: e.target.value }))}
              />
            </div>
          </div>

          {/* Valor líquido calculado */}
          {valorMensal > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs text-slate-500">Valor líquido mensal:</span>
              <span className="text-sm font-bold text-slate-800">{BRL(valorLiquido)}</span>
            </div>
          )}

          {/* Datas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Data de Início *</label>
              <input
                type="date"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                value={form.data_inicio}
                onChange={e => setForm(p => ({ ...p, data_inicio: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Data de Término</label>
              <input
                type="date"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                value={form.data_fim}
                onChange={e => setForm(p => ({ ...p, data_fim: e.target.value }))}
              />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Observações</label>
            <textarea
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
              placeholder="Notas internas sobre esta assinatura..."
              value={form.observacoes}
              onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Criar Assinatura
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Painel de detalhes ────────────────────────────────────────────────────────

type DetailTab = 'visao-geral' | 'cobrancas' | 'alteracoes' | 'atividades' | 'gestao';

function DetailPanel({
  ass,
  usuarios,
  onUpdated,
  onDeleted,
  showToast,
}: {
  ass: ErpAssinatura;
  usuarios: ZiaUsuario[];
  onUpdated: (updated: ErpAssinatura) => void;
  onDeleted: (id: string) => void;
  showToast: (msg: string, ok: boolean) => void;
}) {
  const [activeTab, setActiveTab] = useState<DetailTab>('visao-geral');
  const [saving, setSaving] = useState(false);

  // Reset tab when selection changes
  useEffect(() => {
    setActiveTab('visao-geral');
  }, [ass.id]);

  const vendedor = usuarios.find(u => u.id === ass.vendedor_id);
  const valorLiquido = calcLiquido(ass.valor_mensal, ass.desconto_pct);
  const totalAcumulado = calcAcumulado(ass.valor_mensal, ass.desconto_pct, ass.data_inicio);
  const meses = monthsSince(ass.data_inicio);

  async function handleDelete() {
    setSaving(true);
    try {
      await deleteAssinatura(ass.id);
      showToast('Assinatura excluída.', true);
      onDeleted(ass.id);
    } catch (e) {
      showToast('Erro: ' + (e as Error).message, false);
    } finally {
      setSaving(false);
    }
  }

  const TABS: { id: DetailTab; label: string; icon: React.ReactNode }[] = [
    { id: 'visao-geral',  label: 'Visão Geral',  icon: <Eye className="w-3.5 h-3.5" /> },
    { id: 'cobrancas',   label: 'Cobranças',     icon: <CreditCard className="w-3.5 h-3.5" /> },
    { id: 'alteracoes',  label: 'Alterações',    icon: <History className="w-3.5 h-3.5" /> },
    { id: 'atividades',  label: 'Atividades',    icon: <Activity className="w-3.5 h-3.5" /> },
    { id: 'gestao',      label: 'Gestão',        icon: <Settings className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 shrink-0 bg-white">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900 truncate">
              {ass.erp_clientes?.nome ?? '—'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 truncate">
              {ass.erp_produtos?.nome ?? '—'}
            </p>
            {ass.erp_clientes?.telefone && (
              <div className="flex items-center gap-2 mt-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="text-xs text-slate-500">{ass.erp_clientes.telefone}</span>
                <a
                  href={`https://wa.me/55${ass.erp_clientes.telefone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs font-semibold text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-2 py-0.5 rounded-lg transition-all"
                >
                  <MessageCircle className="w-3 h-3" /> WhatsApp
                </a>
              </div>
            )}
          </div>
          <StatusBadge status={ass.status} />
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 mt-3 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === 'visao-geral' && (
          <TabVisaoGeral
            ass={ass}
            vendedor={vendedor}
            valorLiquido={valorLiquido}
            totalAcumulado={totalAcumulado}
            meses={meses}
          />
        )}
        {activeTab === 'cobrancas' && (
          <TabCobrancas ass={ass} />
        )}
        {activeTab === 'alteracoes' && (
          <TabAlteracoes ass={ass} />
        )}
        {activeTab === 'atividades' && (
          <TabAtividades />
        )}
        {activeTab === 'gestao' && (
          <TabGestao
            ass={ass}
            usuarios={usuarios}
            saving={saving}
            setSaving={setSaving}
            onUpdated={onUpdated}
            onDelete={handleDelete}
            showToast={showToast}
          />
        )}
      </div>
    </div>
  );
}

// ── Tab: Visão Geral ──────────────────────────────────────────────────────────

function TabVisaoGeral({
  ass,
  vendedor,
  valorLiquido,
  totalAcumulado,
  meses,
}: {
  ass: ErpAssinatura;
  vendedor: ZiaUsuario | undefined;
  valorLiquido: number;
  totalAcumulado: number;
  meses: number;
}) {
  const CICLO_LABEL: Record<string, string> = {
    mensal: 'Mensal',
    trimestral: 'Trimestral',
    semestral: 'Semestral',
    anual: 'Anual',
  };

  return (
    <div className="p-5 space-y-5">
      {/* Plano info */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Assinatura</p>
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          <DetailRow icon={<FileText className="w-3.5 h-3.5" />} label="Plano Contratado">
            {ass.erp_produtos?.nome ?? '—'}
          </DetailRow>
          {ass.ciclo_cobranca && (
            <DetailRow icon={<RefreshCw className="w-3.5 h-3.5" />} label="Ciclo de Cobrança">
              {CICLO_LABEL[ass.ciclo_cobranca] ?? ass.ciclo_cobranca}
            </DetailRow>
          )}
          <DetailRow icon={<DollarSign className="w-3.5 h-3.5" />} label="Valor Mensal">
            {BRL(ass.valor_mensal)}
          </DetailRow>
          <DetailRow icon={<Percent className="w-3.5 h-3.5" />} label="Desconto">
            {ass.desconto_pct > 0 ? `${ass.desconto_pct}%` : '—'}
            {ass.desconto_motivo && (
              <span className="ml-2 text-xs text-slate-400 italic">({ass.desconto_motivo})</span>
            )}
          </DetailRow>
          <DetailRow icon={<DollarSign className="w-3.5 h-3.5 text-green-600" />} label="Valor Líquido">
            <span className="font-bold text-slate-800">{BRL(valorLiquido)}</span>
          </DetailRow>
          <DetailRow icon={<Calendar className="w-3.5 h-3.5" />} label="Data de Início">
            {DATE_FMT(ass.data_inicio)}
          </DetailRow>
          <DetailRow icon={<Calendar className="w-3.5 h-3.5" />} label="Data de Término">
            {ass.data_fim ? DATE_FMT(ass.data_fim) : 'Indefinida'}
          </DetailRow>
          {ass.proximo_vencimento && (
            <DetailRow icon={<Calendar className="w-3.5 h-3.5 text-amber-500" />} label="Próx. Vencimento">
              <span className="text-amber-700 font-medium">{DATE_FMT(ass.proximo_vencimento)}</span>
            </DetailRow>
          )}
          <DetailRow icon={<RefreshCw className="w-3.5 h-3.5" />} label="Tempo Ativo">
            {meses > 0 ? `${meses} mês${meses !== 1 ? 'es' : ''}` : 'Menos de 1 mês'}
          </DetailRow>
        </div>
      </div>

      {/* Resumo acumulado */}
      {meses > 0 && (
        <div className="bg-slate-800 rounded-xl px-4 py-3 text-white grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Meses ativos</p>
            <p className="text-xl font-bold mt-0.5">{meses}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Valor líquido/mês</p>
            <p className="text-sm font-bold mt-0.5">{BRL(valorLiquido)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Total acumulado</p>
            <p className="text-sm font-bold mt-0.5 text-green-400">{BRL(totalAcumulado)}</p>
          </div>
        </div>
      )}

      {/* Vendedor */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Vendedor Responsável</p>
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          <DetailRow icon={<User className="w-3.5 h-3.5" />} label="Nome">
            {vendedor ? vendedor.nome : <span className="text-slate-400 italic">Não atribuído</span>}
          </DetailRow>
          {vendedor && (
            <DetailRow icon={<User className="w-3.5 h-3.5" />} label="Código">
              <span className="font-mono text-xs">{vendedor.codigo}</span>
            </DetailRow>
          )}
        </div>
      </div>

      {/* Motivo cancelamento/pausa */}
      {(ass.motivo_cancelamento || ass.motivo_pausa) && (
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
            {ass.motivo_cancelamento ? 'Motivo de Cancelamento' : 'Motivo de Pausa'}
          </p>
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <p className="text-sm text-red-800 whitespace-pre-wrap leading-relaxed">
              {ass.motivo_cancelamento ?? ass.motivo_pausa}
            </p>
            {ass.data_retorno_previsto && (
              <p className="text-xs text-red-600 mt-1.5">
                Retorno previsto: {DATE_FMT(ass.data_retorno_previsto)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Observações */}
      {ass.observacoes && (
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Observações</p>
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{ass.observacoes}</p>
          </div>
        </div>
      )}

      <div className="text-[11px] text-slate-400 pt-1">
        Criada em {new Date(ass.created_at).toLocaleString('pt-BR')}
      </div>
    </div>
  );
}

// ── Tab: Cobranças ────────────────────────────────────────────────────────────

function TabCobrancas({ ass }: { ass: ErpAssinatura }) {
  const [cobrancas, setCobrancas] = useState<ErpAssinaturaCobranca[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getAssinaturaCobrancas(ass.id).then(data => {
      setCobrancas(data);
      setLoading(false);
    });
  }, [ass.id]);

  const COB_STATUS: Record<ErpAssinaturaCobranca['status'], { label: string; bg: string; text: string }> = {
    pago:      { label: 'Pago',      bg: 'bg-green-100',  text: 'text-green-700'  },
    pendente:  { label: 'Pendente',  bg: 'bg-yellow-100', text: 'text-yellow-700' },
    atrasado:  { label: 'Atrasado',  bg: 'bg-red-100',    text: 'text-red-700'    },
    cancelado: { label: 'Cancelado', bg: 'bg-slate-100',  text: 'text-slate-500'  },
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (cobrancas.length === 0) {
    return (
      <div className="p-5 space-y-4">
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <CreditCard className="w-10 h-10 text-slate-200 mb-3" />
          <p className="text-sm font-semibold text-slate-400">Nenhuma cobrança registrada</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 leading-relaxed">
            As cobranças serão geradas automaticamente após integração com o gateway de pagamento.
          </p>
        </div>
      </div>
    );
  }

  const totalPago = cobrancas
    .filter(c => c.status === 'pago')
    .reduce((sum, c) => sum + c.valor_liquido, 0);
  const totalAberto = cobrancas
    .filter(c => c.status === 'pendente' || c.status === 'atrasado')
    .reduce((sum, c) => sum + c.valor_liquido, 0);

  return (
    <div className="p-5 space-y-4">
      {/* Resumo */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-center">
          <p className="text-[10px] font-bold text-green-600 uppercase tracking-wide">Total Pago</p>
          <p className="text-base font-bold text-green-800 mt-0.5">{BRL(totalPago)}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-center">
          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">Em Aberto</p>
          <p className="text-base font-bold text-amber-800 mt-0.5">{BRL(totalAberto)}</p>
        </div>
      </div>

      {/* Lista de cobranças */}
      <div className="space-y-2">
        {cobrancas.map(cob => {
          const cfg = COB_STATUS[cob.status];
          return (
            <div key={cob.id} className="bg-white border border-slate-200 rounded-xl px-4 py-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold text-slate-800">{cob.referencia}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                  {cfg.label}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-slate-500">
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase">Vencimento</span>
                  <span className="font-medium text-slate-700">{DATE_FMT(cob.vencimento)}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase">Valor Bruto</span>
                  <span className="font-medium text-slate-700">{BRL(cob.valor_bruto)}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase">Valor Líquido</span>
                  <span className="font-bold text-slate-800">{BRL(cob.valor_liquido)}</span>
                </div>
              </div>
              {cob.desconto_pct > 0 && (
                <p className="text-[11px] text-slate-400 mt-1">Desconto: {cob.desconto_pct}%</p>
              )}
              {cob.pago_em && (
                <p className="text-[11px] text-green-600 mt-1">
                  Pago em {new Date(cob.pago_em).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tab: Alterações ───────────────────────────────────────────────────────────

function TabAlteracoes({ ass }: { ass: ErpAssinatura }) {
  const [historico, setHistorico] = useState<ErpAssinaturaHistorico[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getAssinaturaHistorico(ass.id).then(data => {
      setHistorico(data);
      setLoading(false);
    });
  }, [ass.id]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (historico.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center px-4">
        <History className="w-10 h-10 text-slate-200 mb-3" />
        <p className="text-sm font-semibold text-slate-400">Nenhuma alteração registrada ainda.</p>
      </div>
    );
  }

  return (
    <div className="p-5">
      <div className="relative">
        <div className="absolute left-3.5 top-0 bottom-0 w-px bg-slate-200" />
        <div className="space-y-4">
          {historico.map(entry => (
            <div key={entry.id} className="flex gap-3 relative">
              <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 z-10">
                <History className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold text-slate-800">{entry.acao}</span>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {new Date(entry.created_at).toLocaleString('pt-BR')}
                  </span>
                </div>
                {(entry.valor_anterior || entry.valor_novo) && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                    {entry.valor_anterior && (
                      <span className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded line-through">
                        {entry.valor_anterior}
                      </span>
                    )}
                    {entry.valor_anterior && entry.valor_novo && (
                      <ChevronRight className="w-3 h-3 text-slate-400" />
                    )}
                    {entry.valor_novo && (
                      <span className="bg-green-50 text-green-600 px-1.5 py-0.5 rounded font-medium">
                        {entry.valor_novo}
                      </span>
                    )}
                  </div>
                )}
                {entry.motivo && (
                  <p className="text-xs text-slate-500 italic">{entry.motivo}</p>
                )}
                {entry.usuario_nome && (
                  <p className="text-[10px] text-slate-400 mt-1">por {entry.usuario_nome}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tab: Atividades ───────────────────────────────────────────────────────────

function TabAtividades() {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center px-6 gap-4">
      <Activity className="w-10 h-10 text-slate-200" />
      <div>
        <p className="text-sm font-semibold text-slate-500">Atividades do Cliente</p>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">
          Integração com o módulo de Atividades de Clientes em desenvolvimento.
        </p>
      </div>
      <button
        disabled
        className="flex items-center gap-2 mt-2 text-xs text-slate-400 border border-slate-200 px-4 py-2 rounded-lg cursor-not-allowed opacity-60"
      >
        <Plus className="w-3.5 h-3.5" /> Criar Atividade Manual
      </button>
    </div>
  );
}

// ── Tab: Gestão ───────────────────────────────────────────────────────────────

type GestaoAction = 'pausar' | 'reativar' | 'cancelar' | 'inadimplente' | 'encerrar' | 'trial' | null;

function TabGestao({
  ass,
  usuarios,
  saving,
  setSaving,
  onUpdated,
  onDelete,
  showToast,
}: {
  ass: ErpAssinatura;
  usuarios: ZiaUsuario[];
  saving: boolean;
  setSaving: (v: boolean) => void;
  onUpdated: (updated: ErpAssinatura) => void;
  onDelete: () => void;
  showToast: (msg: string, ok: boolean) => void;
}) {
  const [expandedAction, setExpandedAction] = useState<GestaoAction>(null);
  const [actionMotivo, setActionMotivo] = useState('');
  const [actionRetorno, setActionRetorno] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Desconto section
  const [descontoForm, setDescontoForm] = useState({
    pct: ass.desconto_pct.toString(),
    motivo: ass.desconto_motivo ?? '',
    validade: ass.desconto_validade ?? '',
  });
  const [savingDesconto, setSavingDesconto] = useState(false);

  // Ciclo section
  const [savingCiclo, setSavingCiclo] = useState(false);

  // Vendedor section
  const [novoVendedor, setNovoVendedor] = useState(ass.vendedor_id ?? '');
  const [savingVendedor, setSavingVendedor] = useState(false);

  // Observacoes section
  const [obs, setObs] = useState(ass.observacoes ?? '');
  const [savingObs, setSavingObs] = useState(false);

  const CICLO_LABEL: Record<string, string> = {
    mensal: 'Mensal',
    trimestral: 'Trimestral',
    semestral: 'Semestral',
    anual: 'Anual',
  };

  type ActionDef = {
    id: GestaoAction;
    label: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    nextStatus: AssinaturaStatus;
    shows: AssinaturaStatus[];
    fields: ('motivo' | 'retorno')[];
    motivoRequired: boolean;
  };

  const ACTION_DEFS: ActionDef[] = [
    {
      id: 'pausar',
      label: 'Pausar assinatura',
      description: 'Interrompe temporariamente a assinatura.',
      icon: <PauseCircle className="w-4 h-4" />,
      color: 'border-yellow-200 bg-yellow-50 text-yellow-800',
      nextStatus: 'pausada',
      shows: ['ativa', 'inadimplente'],
      fields: ['motivo', 'retorno'],
      motivoRequired: true,
    },
    {
      id: 'reativar',
      label: 'Reativar assinatura',
      description: 'Retoma uma assinatura pausada, cancelada ou encerrada.',
      icon: <PlayCircle className="w-4 h-4" />,
      color: 'border-green-200 bg-green-50 text-green-800',
      nextStatus: 'ativa',
      shows: ['pausada', 'cancelada', 'encerrada'],
      fields: [],
      motivoRequired: false,
    },
    {
      id: 'cancelar',
      label: 'Cancelar assinatura',
      description: 'Cancela definitivamente a assinatura.',
      icon: <XCircle className="w-4 h-4" />,
      color: 'border-red-200 bg-red-50 text-red-800',
      nextStatus: 'cancelada',
      shows: ['ativa', 'pausada', 'em_trial'],
      fields: ['motivo'],
      motivoRequired: true,
    },
    {
      id: 'inadimplente',
      label: 'Marcar como Inadimplente',
      description: 'Marca o cliente como inadimplente por falta de pagamento.',
      icon: <AlertTriangle className="w-4 h-4" />,
      color: 'border-red-200 bg-red-50 text-red-800',
      nextStatus: 'inadimplente',
      shows: ['ativa'],
      fields: ['motivo'],
      motivoRequired: false,
    },
    {
      id: 'encerrar',
      label: 'Encerrar contrato',
      description: 'Encerra o contrato ao final do período vigente.',
      icon: <StopCircle className="w-4 h-4" />,
      color: 'border-slate-200 bg-slate-50 text-slate-800',
      nextStatus: 'encerrada',
      shows: ['ativa', 'pausada', 'cancelada'],
      fields: ['motivo'],
      motivoRequired: false,
    },
    {
      id: 'trial',
      label: 'Iniciar Trial',
      description: 'Coloca a assinatura em modo de trial para avaliação.',
      icon: <Tag className="w-4 h-4" />,
      color: 'border-amber-200 bg-amber-50 text-amber-800',
      nextStatus: 'em_trial',
      shows: ['ativa'],
      fields: ['motivo'],
      motivoRequired: false,
    },
  ];

  async function handleActionConfirm(action: ActionDef) {
    if (action.motivoRequired && !actionMotivo.trim()) {
      showToast('Informe o motivo.', false);
      return;
    }
    setSaving(true);
    try {
      const payload: Partial<ErpAssinatura> = { status: action.nextStatus };
      if (action.id === 'pausar') {
        payload.motivo_pausa = actionMotivo || null;
        payload.data_retorno_previsto = actionRetorno || null;
      } else if (action.id === 'cancelar') {
        payload.motivo_cancelamento = actionMotivo || null;
      }
      const updated = await updateAssinatura(ass.id, payload);
      await addAssinaturaHistorico(ass.id, {
        acao: action.label,
        valor_anterior: STATUS_CONFIG[ass.status].label,
        valor_novo: STATUS_CONFIG[action.nextStatus].label,
        motivo: actionMotivo || null,
        usuario_nome: null,
      });
      showToast(`${action.label} realizado com sucesso.`, true);
      onUpdated(updated);
      setExpandedAction(null);
      setActionMotivo('');
      setActionRetorno('');
    } catch (e) {
      showToast('Erro: ' + (e as Error).message, false);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDesconto() {
    const pct = parseFloat(descontoForm.pct) || 0;
    if (pct > 0 && !descontoForm.motivo.trim()) {
      showToast('Informe o motivo do desconto.', false);
      return;
    }
    setSavingDesconto(true);
    try {
      const updated = await updateAssinatura(ass.id, {
        desconto_pct: pct,
        desconto_motivo: descontoForm.motivo || null,
        desconto_validade: descontoForm.validade || null,
      });
      await addAssinaturaHistorico(ass.id, {
        acao: 'Desconto alterado',
        valor_anterior: `${ass.desconto_pct}%`,
        valor_novo: `${pct}%`,
        motivo: descontoForm.motivo || null,
        usuario_nome: null,
      });
      showToast('Desconto atualizado.', true);
      onUpdated(updated);
    } catch (e) {
      showToast('Erro: ' + (e as Error).message, false);
    } finally {
      setSavingDesconto(false);
    }
  }

  async function handleChangeCiclo(ciclo: 'mensal' | 'trimestral' | 'semestral' | 'anual') {
    setSavingCiclo(true);
    try {
      const updated = await updateAssinatura(ass.id, { ciclo_cobranca: ciclo });
      await addAssinaturaHistorico(ass.id, {
        acao: 'Ciclo de cobrança alterado',
        valor_anterior: ass.ciclo_cobranca ?? 'Não definido',
        valor_novo: CICLO_LABEL[ciclo],
        motivo: null,
        usuario_nome: null,
      });
      showToast('Ciclo de cobrança atualizado.', true);
      onUpdated(updated);
    } catch (e) {
      showToast('Erro: ' + (e as Error).message, false);
    } finally {
      setSavingCiclo(false);
    }
  }

  async function handleSaveVendedor() {
    setSavingVendedor(true);
    try {
      const updated = await updateAssinatura(ass.id, { vendedor_id: novoVendedor || null });
      const oldVendedor = usuarios.find(u => u.id === ass.vendedor_id);
      const newVendedor = usuarios.find(u => u.id === novoVendedor);
      await addAssinaturaHistorico(ass.id, {
        acao: 'Vendedor alterado',
        valor_anterior: oldVendedor?.nome ?? 'Sem vendedor',
        valor_novo: newVendedor?.nome ?? 'Sem vendedor',
        motivo: null,
        usuario_nome: null,
      });
      showToast('Vendedor atualizado.', true);
      onUpdated(updated);
    } catch (e) {
      showToast('Erro: ' + (e as Error).message, false);
    } finally {
      setSavingVendedor(false);
    }
  }

  async function handleSaveObs() {
    setSavingObs(true);
    try {
      const updated = await updateAssinatura(ass.id, { observacoes: obs || null });
      showToast('Observações salvas.', true);
      onUpdated(updated);
    } catch (e) {
      showToast('Erro: ' + (e as Error).message, false);
    } finally {
      setSavingObs(false);
    }
  }

  const visibleActions = ACTION_DEFS.filter(a => a.shows.includes(ass.status));

  // Keep novoVendedor/obs/descontoForm in sync if ass changes
  useEffect(() => {
    setNovoVendedor(ass.vendedor_id ?? '');
    setObs(ass.observacoes ?? '');
    setDescontoForm({
      pct: ass.desconto_pct.toString(),
      motivo: ass.desconto_motivo ?? '',
      validade: ass.desconto_validade ?? '',
    });
    setExpandedAction(null);
    setConfirmDelete(false);
  }, [ass.id]);

  return (
    <div className="p-5 space-y-6">

      {/* ── Alteração de Status ── */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Alteração de Status</p>
        {visibleActions.length === 0 ? (
          <p className="text-xs text-slate-400 italic">Nenhuma ação disponível para o status atual.</p>
        ) : (
          <div className="space-y-2">
            {visibleActions.map(action => (
              <div key={action.id} className={`border rounded-xl overflow-hidden ${action.color}`}>
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {action.icon}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{action.label}</p>
                      <p className="text-xs opacity-70 mt-0.5">{action.description}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setExpandedAction(expandedAction === action.id ? null : action.id)}
                    className="shrink-0 text-xs font-medium underline ml-2 opacity-80 hover:opacity-100"
                  >
                    {expandedAction === action.id ? 'Fechar' : 'Executar'}
                  </button>
                </div>
                {expandedAction === action.id && (
                  <div className="border-t border-black/10 px-4 py-3 bg-white/50 space-y-3">
                    {action.fields.includes('motivo') && (
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Motivo {action.motivoRequired ? '*' : '(opcional)'}
                        </label>
                        <textarea
                          rows={2}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none bg-white"
                          placeholder="Descreva o motivo..."
                          value={actionMotivo}
                          onChange={e => setActionMotivo(e.target.value)}
                        />
                      </div>
                    )}
                    {action.fields.includes('retorno') && (
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Data de Retorno Previsto (opcional)
                        </label>
                        <input
                          type="date"
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
                          value={actionRetorno}
                          onChange={e => setActionRetorno(e.target.value)}
                        />
                      </div>
                    )}
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => { setExpandedAction(null); setActionMotivo(''); setActionRetorno(''); }}
                        className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleActionConfirm(action)}
                        disabled={saving}
                        className="flex items-center gap-1.5 text-xs bg-slate-800 hover:bg-slate-900 text-white px-4 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-60"
                      >
                        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                        Confirmar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Desconto Manual ── */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Desconto Manual</p>
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          {ass.desconto_pct > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <Tag className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-800">
                Desconto atual: <strong>{ass.desconto_pct}%</strong>
                {ass.desconto_motivo && ` — ${ass.desconto_motivo}`}
                {ass.desconto_validade && ` (até ${DATE_FMT(ass.desconto_validade)})`}
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Desconto (%)</label>
              <input
                type="number" min="0" max="100" step="0.1"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                value={descontoForm.pct}
                onChange={e => setDescontoForm(p => ({ ...p, pct: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Validade (opcional)</label>
              <input
                type="date"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                value={descontoForm.validade}
                onChange={e => setDescontoForm(p => ({ ...p, validade: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Motivo {parseFloat(descontoForm.pct) > 0 ? '*' : '(opcional)'}
            </label>
            <input
              type="text"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="Ex: Fidelidade, Parceria..."
              value={descontoForm.motivo}
              onChange={e => setDescontoForm(p => ({ ...p, motivo: e.target.value }))}
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleSaveDesconto}
              disabled={savingDesconto}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-60"
            >
              {savingDesconto ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Salvar Desconto
            </button>
          </div>
        </div>
      </div>

      {/* ── Ciclo de Cobrança ── */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Ciclo de Cobrança</p>
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <p className="text-xs text-slate-500">
            Atual: <strong className="text-slate-800">{ass.ciclo_cobranca ? CICLO_LABEL[ass.ciclo_cobranca] : 'Não definido'}</strong>
          </p>
          <div className="flex flex-wrap gap-2">
            {(['mensal', 'trimestral', 'semestral', 'anual'] as const).map(ciclo => (
              <button
                key={ciclo}
                onClick={() => handleChangeCiclo(ciclo)}
                disabled={savingCiclo || ass.ciclo_cobranca === ciclo}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-60 ${
                  ass.ciclo_cobranca === ciclo
                    ? 'bg-slate-800 text-white border-slate-800'
                    : 'border-slate-200 text-slate-600 hover:border-slate-400 hover:bg-slate-50'
                }`}
              >
                {savingCiclo && ass.ciclo_cobranca !== ciclo ? (
                  <Loader2 className="w-3 h-3 animate-spin inline" />
                ) : CICLO_LABEL[ciclo]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Alterar Vendedor ── */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Alterar Vendedor</p>
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
            <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <p className="text-xs text-blue-700">Apenas gestores podem alterar o vendedor responsável.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Vendedor Responsável</label>
            <select
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              value={novoVendedor}
              onChange={e => setNovoVendedor(e.target.value)}
            >
              <option value="">Sem vendedor</option>
              {usuarios.filter(u => u.ativo).map(u => (
                <option key={u.id} value={u.id}>{u.nome}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleSaveVendedor}
              disabled={savingVendedor}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-60"
            >
              {savingVendedor ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Salvar
            </button>
          </div>
        </div>
      </div>

      {/* ── Observações Internas ── */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Observações Internas</p>
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <textarea
            rows={4}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
            placeholder="Notas internas sobre esta assinatura..."
            value={obs}
            onChange={e => setObs(e.target.value)}
          />
          <div className="flex justify-end">
            <button
              onClick={handleSaveObs}
              disabled={savingObs}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-60"
            >
              {savingObs ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Salvar Observações
            </button>
          </div>
        </div>
      </div>

      {/* ── Excluir Assinatura ── */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Zona de Perigo</p>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800">Excluir Assinatura</p>
              <p className="text-xs text-red-600 mt-0.5">
                Esta ação é irreversível. Todos os dados desta assinatura serão permanentemente removidos.
              </p>
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="mt-3 flex items-center gap-1.5 text-xs bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Excluir Assinatura
                </button>
              ) : (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-red-700 font-medium">Confirmar exclusão?</span>
                  <button
                    onClick={onDelete}
                    disabled={saving}
                    className="text-xs bg-red-700 hover:bg-red-800 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Sim, excluir'}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

// ── Linha de detalhe reutilizável ─────────────────────────────────────────────

function DetailRow({
  icon, label, children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className="text-slate-400 shrink-0">{icon}</span>
      <span className="text-xs text-slate-500 w-32 shrink-0">{label}</span>
      <span className="text-sm text-slate-800 flex-1">{children}</span>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function Assinaturas() {
  const [assinaturas, setAssinaturas] = useState<ErpAssinatura[]>([]);
  const [clientes, setClientes] = useState<ErpCliente[]>([]);
  const [produtos, setProdutos] = useState<ErpProduto[]>([]);
  const [usuarios, setUsuarios] = useState<ZiaUsuario[]>([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selected, setSelected] = useState<ErpAssinatura | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const vendedorId = getVendedorFilter();
  const isVendedor = vendedorId !== null;

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ass, cli, prod, usr] = await Promise.all([
        getAssinaturas({
          vendedor_id: vendedorId,
          status: statusFilter || undefined,
        }),
        getClientes(),
        getProdutos(),
        getZiaUsuarios(),
      ]);
      setAssinaturas(ass);
      setClientes(cli);
      setProdutos(prod);
      setUsuarios(usr);
    } catch (e) {
      showToast('Erro ao carregar dados: ' + (e as Error).message, false);
    } finally {
      setLoading(false);
    }
  }, [vendedorId, statusFilter]);

  useEffect(() => { load(); }, [load]);

  // Filtragem local por search (nome do cliente ou produto)
  const filtered = assinaturas.filter(a => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (a.erp_clientes?.nome ?? '').toLowerCase().includes(s) ||
      (a.erp_produtos?.nome ?? '').toLowerCase().includes(s)
    );
  });

  function handleCreated(ass: ErpAssinatura) {
    setShowCreate(false);
    setAssinaturas(prev => [ass, ...prev]);
    setSelected(ass);
  }

  function handleUpdated(updated: ErpAssinatura) {
    setAssinaturas(prev => prev.map(a => a.id === updated.id ? updated : a));
    setSelected(updated);
  }

  function handleDeleted(id: string) {
    setAssinaturas(prev => prev.filter(a => a.id !== id));
    setSelected(null);
  }

  // Contadores por status
  const counts = {
    ativa: assinaturas.filter(a => a.status === 'ativa').length,
    pausada: assinaturas.filter(a => a.status === 'pausada').length,
    cancelada: assinaturas.filter(a => a.status === 'cancelada').length,
    encerrada: assinaturas.filter(a => a.status === 'encerrada').length,
    inadimplente: assinaturas.filter(a => a.status === 'inadimplente').length,
    em_trial: assinaturas.filter(a => a.status === 'em_trial').length,
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm text-white ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}
        >
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Modal de criação */}
      {showCreate && (
        <CreateModal
          clientes={clientes}
          produtos={produtos}
          usuarios={usuarios}
          onClose={() => setShowCreate(false)}
          onSaved={handleCreated}
          showToast={showToast}
        />
      )}

      {/* Painel esquerdo — lista */}
      <div className="w-80 shrink-0 border-r border-slate-200 flex flex-col bg-slate-50">
        {/* Header da lista */}
        <div className="px-4 py-3 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-sm font-bold text-slate-800">Assinaturas</h1>
            {!isVendedor && (
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-1 bg-slate-800 hover:bg-slate-900 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Nova
              </button>
            )}
          </div>

          {/* Busca */}
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
              placeholder="Buscar por cliente ou plano..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Filtro de status */}
          <div className="flex flex-wrap gap-1">
            {(['', 'ativa', 'pausada', 'cancelada', 'encerrada', 'inadimplente', 'em_trial'] as const).map(st => {
              const isAll = st === '';
              const active = statusFilter === st;
              const label = isAll ? `Todas (${assinaturas.length})` : `${STATUS_CONFIG[st].label} (${counts[st]})`;
              return (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-colors ${
                    active
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center px-4">
              <FileText className="w-9 h-9 text-slate-200 mb-2" />
              <p className="text-sm font-medium text-slate-400">Nenhuma assinatura</p>
              {search && (
                <p className="text-xs text-slate-300 mt-1">Tente outro termo de busca.</p>
              )}
            </div>
          ) : (
            filtered.map(a => {
              const isSelected = selected?.id === a.id;
              const cfg = STATUS_CONFIG[a.status];
              const liquido = calcLiquido(a.valor_mensal, a.desconto_pct);
              return (
                <div
                  key={a.id}
                  onClick={() => setSelected(a)}
                  className={`px-4 py-3 border-b border-slate-100 cursor-pointer transition-colors ${
                    isSelected ? 'bg-slate-800 text-white' : 'hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className={`text-sm font-semibold truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                      {a.erp_clientes?.nome ?? '—'}
                    </p>
                    <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-slate-300' : 'text-slate-400'}`} />
                  </div>
                  <p className={`text-xs truncate mb-1.5 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                    {a.erp_produtos?.nome ?? '—'}
                  </p>
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        isSelected
                          ? 'bg-slate-700 text-slate-200'
                          : `${cfg.bg} ${cfg.text}`
                      }`}
                    >
                      {cfg.label}
                    </span>
                    <span className={`text-xs font-semibold ${isSelected ? 'text-slate-200' : 'text-slate-700'}`}>
                      {BRL(liquido)}<span className={`text-[10px] font-normal ml-0.5 ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>/mês</span>
                    </span>
                  </div>
                  <p className={`text-[10px] mt-1 ${isSelected ? 'text-slate-400' : 'text-slate-400'}`}>
                    Desde {DATE_FMT(a.data_inicio)}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé */}
        <div className="px-4 py-2 border-t border-slate-200 bg-white">
          <p className="text-[11px] text-slate-400">
            {filtered.length} assinatura(s)
            {isVendedor && <span className="ml-1 text-amber-500">· visão do vendedor</span>}
          </p>
        </div>
      </div>

      {/* Painel direito */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        {selected ? (
          <DetailPanel
            ass={selected}
            usuarios={usuarios}
            onUpdated={handleUpdated}
            onDeleted={handleDeleted}
            showToast={showToast}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <FileText className="w-12 h-12 text-slate-200 mb-3" />
            <p className="font-semibold text-slate-400">Selecione uma assinatura</p>
            <p className="text-sm text-slate-300 mt-1">
              {!isVendedor
                ? 'ou clique em "Nova" para criar'
                : 'Exibindo apenas suas assinaturas'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
