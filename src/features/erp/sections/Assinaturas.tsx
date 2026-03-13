import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Edit2, Trash2, X, Loader2, CheckCircle, AlertCircle,
  ChevronRight, Save, FileText, DollarSign, User, Calendar, Percent,
  PauseCircle, PlayCircle, XCircle, StopCircle, RefreshCw, Phone, MessageCircle,
  History, Activity, Settings, CreditCard, Eye, AlertTriangle, RotateCcw, Tag, Info,
} from 'lucide-react';
import {
  getAssinaturas, createAssinatura, updateAssinatura, deleteAssinatura,
  getVendedorFilter, getClientes, getProdutos, getZiaUsuarios,
  getAssinaturaHistorico, addAssinaturaHistorico, getAssinaturaCobrancas,
  type ErpAssinatura, type ErpCliente, type ErpProduto, type ZiaUsuario,
  type ErpAssinaturaHistorico, type ErpAssinaturaCobranca, type AssinaturaStatus,
} from '../../../lib/erp';

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
  produto_id: string;
  vendedor_id: string;
  valor_mensal: string;
  desconto_pct: string;
  data_inicio: string;
  data_fim: string;
  observacoes: string;
  status: AssinaturaStatus;
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
  const [saving, setSaving] = useState(false);
  const [clienteSearch, setClienteSearch] = useState('');
  const [clienteOpen, setClienteOpen] = useState(false);

  const produtosAssinatura = produtos.filter(p => p.is_subscription && p.ativo);
  const clientesFiltrados = clientes.filter(c =>
    c.nome.toLowerCase().includes(clienteSearch.toLowerCase()),
  );
  const clienteSelecionado = clientes.find(c => c.id === form.cliente_id);

  const valorMensal = parseFloat(form.valor_mensal) || 0;
  const descontoPct = parseFloat(form.desconto_pct) || 0;
  const valorLiquido = calcLiquido(valorMensal, descontoPct);

  async function handleSave() {
    if (!form.cliente_id) return showToast('Selecione um cliente.', false);
    if (!form.produto_id) return showToast('Selecione um produto/plano.', false);
    if (!form.valor_mensal || valorMensal <= 0) return showToast('Informe o valor mensal.', false);
    if (!form.data_inicio) return showToast('Informe a data de início.', false);
    setSaving(true);
    try {
      const payload = {
        cliente_id: form.cliente_id,
        produto_id: form.produto_id,
        vendedor_id: form.vendedor_id || null,
        valor_mensal: valorMensal,
        desconto_pct: descontoPct,
        data_inicio: form.data_inicio,
        data_fim: form.data_fim || null,
        observacoes: form.observacoes || null,
        status: 'ativa' as const,
        crm_negociacao_id: null,
      };
      const created = await createAssinatura(payload);
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

          {/* Produto/Plano */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Produto / Plano *</label>
            <select
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              value={form.produto_id}
              onChange={e => setForm(p => ({ ...p, produto_id: e.target.value }))}
            >
              <option value="">Selecione um plano...</option>
              {produtosAssinatura.map(prod => (
                <option key={prod.id} value={prod.id}>
                  {prod.nome} — {BRL(prod.preco_venda)}/mês
                </option>
              ))}
            </select>
            {produtosAssinatura.length === 0 && (
              <p className="text-[11px] text-amber-600 mt-1">
                Nenhum produto com "is_subscription" ativo encontrado.
              </p>
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

function DetailPanel({
  ass,
  usuarios,
  produtos,
  clientes,
  onUpdated,
  onDeleted,
  showToast,
}: {
  ass: ErpAssinatura;
  usuarios: ZiaUsuario[];
  produtos: ErpProduto[];
  clientes: ErpCliente[];
  onUpdated: (updated: ErpAssinatura) => void;
  onDeleted: (id: string) => void;
  showToast: (msg: string, ok: boolean) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AssForm>(assToForm(ass));

  // Reset form when selection changes
  useEffect(() => {
    setForm(assToForm(ass));
    setEditing(false);
    setConfirmDelete(false);
  }, [ass.id]);

  function assToForm(a: ErpAssinatura): AssForm {
    return {
      cliente_id: a.cliente_id,
      produto_id: a.produto_id,
      vendedor_id: a.vendedor_id ?? '',
      valor_mensal: a.valor_mensal.toString(),
      desconto_pct: a.desconto_pct.toString(),
      data_inicio: a.data_inicio,
      data_fim: a.data_fim ?? '',
      observacoes: a.observacoes ?? '',
      status: a.status,
    };
  }

  const vendedor = usuarios.find(u => u.id === ass.vendedor_id);
  const produtosAssinatura = produtos.filter(p => p.is_subscription && p.ativo);
  const valorLiquido = calcLiquido(ass.valor_mensal, ass.desconto_pct);
  const totalAcumulado = calcAcumulado(ass.valor_mensal, ass.desconto_pct, ass.data_inicio);
  const meses = monthsSince(ass.data_inicio);

  // Botões de transição de status
  type StatusAction = {
    label: string;
    icon: React.ReactNode;
    nextStatus: AssinaturaStatus;
    color: string;
    shows: AssinaturaStatus[];
  };
  const STATUS_ACTIONS: StatusAction[] = [
    {
      label: 'Pausar',
      icon: <PauseCircle className="w-3.5 h-3.5" />,
      nextStatus: 'pausada',
      color: 'text-yellow-600 border-yellow-200 hover:border-yellow-400 hover:bg-yellow-50',
      shows: ['ativa'],
    },
    {
      label: 'Reativar',
      icon: <PlayCircle className="w-3.5 h-3.5" />,
      nextStatus: 'ativa',
      color: 'text-green-600 border-green-200 hover:border-green-400 hover:bg-green-50',
      shows: ['pausada'],
    },
    {
      label: 'Cancelar',
      icon: <XCircle className="w-3.5 h-3.5" />,
      nextStatus: 'cancelada',
      color: 'text-red-500 border-red-200 hover:border-red-400 hover:bg-red-50',
      shows: ['ativa', 'pausada'],
    },
    {
      label: 'Encerrar',
      icon: <StopCircle className="w-3.5 h-3.5" />,
      nextStatus: 'encerrada',
      color: 'text-slate-500 border-slate-200 hover:border-slate-400 hover:bg-slate-50',
      shows: ['ativa', 'pausada', 'cancelada'],
    },
    {
      label: 'Reativar',
      icon: <RefreshCw className="w-3.5 h-3.5" />,
      nextStatus: 'ativa',
      color: 'text-green-600 border-green-200 hover:border-green-400 hover:bg-green-50',
      shows: ['cancelada', 'encerrada'],
    },
  ];

  async function handleStatusChange(nextStatus: AssinaturaStatus) {
    setSaving(true);
    try {
      const updated = await updateAssinatura(ass.id, { status: nextStatus });
      showToast(`Status alterado para "${STATUS_CONFIG[nextStatus].label}".`, true);
      onUpdated(updated);
    } catch (e) {
      showToast('Erro: ' + (e as Error).message, false);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit() {
    const valorMensal = parseFloat(form.valor_mensal);
    const descontoPct = parseFloat(form.desconto_pct) || 0;
    if (!form.cliente_id) return showToast('Selecione um cliente.', false);
    if (!form.produto_id) return showToast('Selecione um produto/plano.', false);
    if (!valorMensal || valorMensal <= 0) return showToast('Informe o valor mensal.', false);
    if (!form.data_inicio) return showToast('Informe a data de início.', false);
    setSaving(true);
    try {
      const updated = await updateAssinatura(ass.id, {
        cliente_id: form.cliente_id,
        produto_id: form.produto_id,
        vendedor_id: form.vendedor_id || null,
        valor_mensal: valorMensal,
        desconto_pct: descontoPct,
        data_inicio: form.data_inicio,
        data_fim: form.data_fim || null,
        observacoes: form.observacoes || null,
        status: form.status,
      });
      showToast('Assinatura atualizada.', true);
      setEditing(false);
      onUpdated(updated);
    } catch (e) {
      showToast('Erro: ' + (e as Error).message, false);
    } finally {
      setSaving(false);
    }
  }

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

  // ── View mode ──
  if (!editing) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 shrink-0">
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
            <div className="flex items-center gap-2 shrink-0">
              <StatusBadge status={ass.status} />
              <button
                onClick={() => { setEditing(true); setConfirmDelete(false); }}
                className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-400 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" /> Editar
              </button>
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Excluir
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-red-600 font-medium">Confirmar?</span>
                  <button
                    onClick={handleDelete}
                    disabled={saving}
                    className="text-xs bg-red-600 hover:bg-red-700 text-white px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Sim'}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1.5 rounded-lg"
                  >
                    Não
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Status actions */}
          <div className="flex flex-wrap gap-2 mt-3">
            {STATUS_ACTIONS.filter(a => a.shows.includes(ass.status)).map(action => (
              <button
                key={action.nextStatus + action.label}
                onClick={() => handleStatusChange(action.nextStatus)}
                disabled={saving}
                className={`flex items-center gap-1.5 text-xs border px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${action.color}`}
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : action.icon}
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5">
          {/* Seção Assinatura */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
              Assinatura
            </p>
            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
              <DetailRow icon={<FileText className="w-3.5 h-3.5" />} label="Plano / Produto">
                {ass.erp_produtos?.nome ?? '—'}
              </DetailRow>
              <DetailRow icon={<DollarSign className="w-3.5 h-3.5" />} label="Valor Mensal">
                {BRL(ass.valor_mensal)}
              </DetailRow>
              <DetailRow icon={<Percent className="w-3.5 h-3.5" />} label="Desconto">
                {ass.desconto_pct > 0 ? `${ass.desconto_pct}%` : '—'}
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

          {/* Seção Vendedor */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
              Vendedor Responsável
            </p>
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

          {/* Seção Observações */}
          {ass.observacoes && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                Observações
              </p>
              <div className="bg-white border border-slate-200 rounded-xl px-4 py-3">
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {ass.observacoes}
                </p>
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="text-[11px] text-slate-400 pt-1">
            Criada em {new Date(ass.created_at).toLocaleString('pt-BR')}
          </div>
        </div>
      </div>
    );
  }

  // ── Edit mode ──
  const editValorMensal = parseFloat(form.valor_mensal) || 0;
  const editDescontoPct = parseFloat(form.desconto_pct) || 0;
  const editValorLiquido = calcLiquido(editValorMensal, editDescontoPct);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Editar Assinatura</h2>
            <p className="text-xs text-slate-400 mt-0.5">{ass.erp_clientes?.nome ?? '—'}</p>
          </div>
          <button
            onClick={() => { setEditing(false); setForm(assToForm(ass)); }}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 border border-slate-200 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Cancelar
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
        {/* Cliente */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Cliente *</label>
          <select
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            value={form.cliente_id}
            onChange={e => setForm(p => ({ ...p, cliente_id: e.target.value }))}
          >
            <option value="">Selecione...</option>
            {clientes.map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>

        {/* Produto */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Produto / Plano *</label>
          <select
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            value={form.produto_id}
            onChange={e => setForm(p => ({ ...p, produto_id: e.target.value }))}
          >
            <option value="">Selecione...</option>
            {produtosAssinatura.map(prod => (
              <option key={prod.id} value={prod.id}>
                {prod.nome} — {BRL(prod.preco_venda)}/mês
              </option>
            ))}
          </select>
        </div>

        {/* Vendedor */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Vendedor</label>
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

        {/* Líquido calculado */}
        {editValorMensal > 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs text-slate-500">Valor líquido mensal:</span>
            <span className="text-sm font-bold text-slate-800">{BRL(editValorLiquido)}</span>
          </div>
        )}

        {/* Status */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
          <select
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            value={form.status}
            onChange={e => setForm(p => ({ ...p, status: e.target.value as AssinaturaStatus }))}
          >
            <option value="ativa">Ativa</option>
            <option value="pausada">Pausada</option>
            <option value="cancelada">Cancelada</option>
            <option value="encerrada">Encerrada</option>
          </select>
        </div>

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
            rows={4}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 resize-none"
            placeholder="Notas internas sobre esta assinatura..."
            value={form.observacoes}
            onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))}
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleSaveEdit}
            disabled={saving}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Alterações
          </button>
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
            produtos={produtos}
            clientes={clientes}
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
