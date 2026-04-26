// ─────────────────────────────────────────────────────────────────────────────
// CRM — Clientes: lista, busca e CRUD completo + detalhe com abas
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState, type ReactNode } from 'react';
import {
  Plus, Search, RefreshCw, Pencil, Trash2, X,
  Building2, User, Mail, Phone, CheckCircle2, XCircle,
  Eye, Briefcase, FileText, CalendarDays, MapPin, Clock,
  Video, PhoneCall, Navigation, ListTodo, MoreHorizontal,
} from 'lucide-react';
import {
  getClientes, createCliente, updateCliente, deleteCliente,
  invalidateCacheAll,
  type ErpCliente,
} from '../../../lib/erp';
import { getAllNegociacoes, type NegociacaoData, type CompromissoTipo } from '../data/crmData';
import { useScope } from '../../../context/ProfileContext';
import TenantSelector, { useTenantName } from '../../../components/UI/TenantSelector';
import CompromissosPage from '../compromissos/CompromissosPage';

type Form = Omit<ErpCliente, 'id' | 'tenant_id' | 'created_at'>;

const INPUT = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400';

const EMPTY_FORM: Form = {
  tipo: 'PJ',
  nome: '',
  cpf_cnpj: '',
  inscricao_estadual: null,
  email: null,
  telefone: null,
  endereco_json: {},
  limite_credito: null,
  tabela_preco_id: null,
  vendedor_id: null,
  ativo: true,
};

// ── Ícones por tipo de compromisso ─────────────────────────────────────────────
const COMP_ICON: Record<CompromissoTipo, typeof CalendarDays> = {
  reuniao: Video, ligacao: PhoneCall, visita: Navigation, followup: ListTodo, outro: MoreHorizontal,
};
const COMP_COLOR: Record<CompromissoTipo, string> = {
  reuniao: 'text-purple-600 bg-purple-50', ligacao: 'text-blue-600 bg-blue-50',
  visita: 'text-emerald-600 bg-emerald-50', followup: 'text-amber-600 bg-amber-50', outro: 'text-slate-500 bg-slate-50',
};

// ── Badge de empresa para listagem Holding ────────────────────────────────────
function TenantBadge({ tenantId }: { tenantId: string }) {
  const name = useTenantName(tenantId);
  return (
    <td className="px-4 py-3">
      <span className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium max-w-[140px] truncate">
        <Building2 className="w-3 h-3 flex-shrink-0" />
        {name}
      </span>
    </td>
  );
}

// ── Modal detalhe do cliente ──────────────────────────────────────────────────
function ClienteDetalheModal({ cliente, onClose }: { cliente: ErpCliente; onClose: () => void }) {
  const [tab, setTab] = useState<'dados' | 'negociacoes' | 'orcamentos' | 'agendas' | 'compromissos'>('dados');
  const [allDados, setAllDados] = useState<NegociacaoData[]>([]);
  const [loadingDados, setLoadingDados] = useState(false);

  useEffect(() => {
    setLoadingDados(true);
    getAllNegociacoes()
      .then(d => setAllDados(d.filter(nd =>
        nd.negociacao.clienteId === cliente.id ||
        nd.negociacao.clienteNome?.toLowerCase() === cliente.nome.toLowerCase()
      )))
      .finally(() => setLoadingDados(false));
  }, [cliente.id, cliente.nome]);

  const negociacoes = allDados.map(d => d.negociacao);
  const orcamentos  = allDados.filter(d => d.orcamento).map(d => ({ neg: d.negociacao, orc: d.orcamento! }));
  const compromissos = allDados.flatMap(d => d.compromissos);

  const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const STATUS_COLOR: Record<string, string> = {
    aberta: 'bg-blue-100 text-blue-700', ganha: 'bg-green-100 text-green-700',
    perdida: 'bg-red-100 text-red-700', suspensa: 'bg-slate-100 text-slate-600',
  };
  const ORC_COLOR: Record<string, string> = {
    rascunho: 'bg-slate-100 text-slate-600', enviado: 'bg-blue-100 text-blue-700',
    aprovado: 'bg-green-100 text-green-700', recusado: 'bg-red-100 text-red-700',
  };

  const TABS = [
    { id: 'dados',         label: 'Dados Pessoais', icon: User },
    { id: 'negociacoes',   label: 'Negociações',    icon: Briefcase },
    { id: 'orcamentos',    label: 'Orçamentos',     icon: FileText },
    { id: 'agendas',       label: 'Agendas',        icon: CalendarDays },
    { id: 'compromissos',  label: 'Compromissos',   icon: CalendarDays },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cliente.tipo === 'PJ' ? 'bg-violet-100' : 'bg-blue-100'}`}>
            {cliente.tipo === 'PJ' ? <Building2 className="w-5 h-5 text-violet-600" /> : <User className="w-5 h-5 text-blue-600" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-900 truncate">{cliente.nome}</p>
            <p className="text-xs text-slate-500">{cliente.tipo === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}{cliente.cpf_cnpj ? ` · ${cliente.cpf_cnpj}` : ''}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100"><X className="w-4 h-4 text-slate-400" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-6 gap-1 shrink-0">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.id ? 'border-violet-600 text-violet-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}>
                <Icon className="w-3.5 h-3.5" />{t.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {/* Dados Pessoais */}
          {tab === 'dados' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Nome / Razão Social', val: cliente.nome },
                  { label: 'CPF / CNPJ', val: cliente.cpf_cnpj || '—' },
                  { label: 'E-mail', val: cliente.email || '—' },
                  { label: 'Telefone', val: cliente.telefone || '—' },
                  { label: 'Insc. Estadual', val: cliente.inscricao_estadual || '—' },
                  { label: 'Limite de Crédito', val: cliente.limite_credito ? BRL(cliente.limite_credito) : '—' },
                ].map(f => (
                  <div key={f.label} className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-400 font-medium mb-0.5">{f.label}</p>
                    <p className="text-sm text-slate-800 font-medium">{f.val}</p>
                  </div>
                ))}
              </div>
              {cliente.endereco_json && Object.keys(cliente.endereco_json).length > 0 && (
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-400 font-medium mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" />Endereço</p>
                  <p className="text-sm text-slate-700">{JSON.stringify(cliente.endereco_json)}</p>
                </div>
              )}
              <div className="flex items-center gap-2">
                {cliente.ativo
                  ? <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-medium"><CheckCircle2 className="w-3 h-3" />Ativo</span>
                  : <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-600 px-2.5 py-1 rounded-full font-medium"><XCircle className="w-3 h-3" />Inativo</span>
                }
              </div>
            </div>
          )}

          {/* Negociações */}
          {tab === 'negociacoes' && (
            loadingDados ? <p className="text-sm text-slate-400 text-center py-10">Carregando...</p> :
            negociacoes.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">Nenhuma negociação encontrada para este cliente.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {negociacoes.map(n => (
                  <div key={n.id} className="border border-slate-100 rounded-xl p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm truncate">{n.descricao || 'Negociação'}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Responsável: {n.responsavel} · {n.dataCriacao}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLOR[n.status] ?? 'bg-slate-100 text-slate-600'}`}>{n.status}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      {n.valor_estimado != null && <span className="text-emerald-700 font-semibold">{BRL(n.valor_estimado)}</span>}
                      <span className="capitalize">{n.etapa?.replace(/_/g, ' ')}</span>
                      {n.probabilidade != null && <span>{n.probabilidade}% prob.</span>}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Orçamentos */}
          {tab === 'orcamentos' && (
            loadingDados ? <p className="text-sm text-slate-400 text-center py-10">Carregando...</p> :
            orcamentos.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">Nenhum orçamento encontrado para este cliente.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orcamentos.map(({ neg, orc }) => (
                  <div key={orc.id} className="border border-slate-100 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">#{orc.numero ?? orc.id.slice(0, 8)} · {neg.descricao || neg.clienteNome}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Criado em {orc.dataCriacao} · {orc.itens.length} item(ns)</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${ORC_COLOR[orc.status] ?? 'bg-slate-100 text-slate-600'}`}>{orc.status}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-slate-500">{orc.condicao_pagamento}</span>
                      <span className="text-sm font-bold text-emerald-700">{BRL(orc.total)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Agendas */}
          {tab === 'agendas' && (
            loadingDados ? <p className="text-sm text-slate-400 text-center py-10">Carregando...</p> :
            compromissos.length === 0 ? (
              <div className="text-center py-12">
                <CalendarDays className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">Nenhum compromisso encontrado para este cliente.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {[...compromissos].sort((a, b) => a.data.localeCompare(b.data)).map(c => {
                  const Icon = COMP_ICON[c.tipo] ?? CalendarDays;
                  return (
                    <div key={c.id} className={`border rounded-xl p-4 ${c.concluido ? 'opacity-60' : ''}`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${COMP_COLOR[c.tipo]}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm ${c.concluido ? 'line-through text-slate-400' : 'text-slate-800'}`}>{c.titulo}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{c.data}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{c.hora}</span>
                            <span>{c.duracao}min</span>
                          </div>
                          {c.notas && <p className="text-xs text-slate-500 mt-1 truncate">{c.notas}</p>}
                        </div>
                        {c.concluido && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
          {/* Compromissos */}
          {tab === 'compromissos' && (
            <div className="-m-6">
              <CompromissosPage filtroFixo={{ cliente_id: cliente.id }} preClienteId={cliente.id} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CRMClientes() {
  const scope = useScope();
  const [clientes, setClientes] = useState<ErpCliente[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem]   = useState<ErpCliente | null>(null);
  const [form, setForm]           = useState<Form>(EMPTY_FORM);
  const [selectedTenant, setSelectedTenant] = useState<string>(scope.entityId ?? '');
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filterAtivo, setFilterAtivo] = useState<'todos' | 'ativo' | 'inativo'>('todos');
  const [filterTipo, setFilterTipo]   = useState<'todos' | 'PF' | 'PJ'>('todos');
  const [detalheCliente, setDetalheCliente] = useState<ErpCliente | null>(null);

  async function load(q = '') {
    setLoading(true);
    setLoadError(null);
    try {
      const tids = scope.scopedEntityIds.length > 0 ? scope.scopedEntityIds : undefined;
      const data = await getClientes(q, tids);
      setClientes(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Erro ao carregar clientes');
      setClientes([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [scope.entityId]);

  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  function openCreate() {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setSelectedTenant(scope.entityId ?? '');
    setModalOpen(true);
  }

  function openEdit(c: ErpCliente) {
    setEditItem(c);
    setSelectedTenant(c.tenant_id);
    setForm({
      tipo: c.tipo,
      nome: c.nome,
      cpf_cnpj: c.cpf_cnpj,
      inscricao_estadual: c.inscricao_estadual,
      email: c.email,
      telefone: c.telefone,
      endereco_json: c.endereco_json,
      limite_credito: c.limite_credito,
      tabela_preco_id: c.tabela_preco_id,
      vendedor_id: c.vendedor_id,
      ativo: c.ativo,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.nome.trim()) return;
    setSaving(true);
    try {
      if (editItem) {
        await updateCliente(editItem.id, form);
      } else {
        await createCliente(form, selectedTenant || undefined);
      }
      invalidateCacheAll();
      setModalOpen(false);
      await load(search);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir cliente? Esta ação não pode ser desfeita.')) return;
    setDeleting(id);
    setDeleteError(null);
    try {
      await deleteCliente(id);
      invalidateCacheAll();
      setClientes(prev => prev.filter(c => c.id !== id));
    } catch (e) {
      setDeleteError((e as Error).message);
      setTimeout(() => setDeleteError(null), 7000);
    } finally {
      setDeleting(null);
    }
  }

  const filtered = clientes.filter(c => {
    if (filterAtivo === 'ativo'   && !c.ativo) return false;
    if (filterAtivo === 'inativo' &&  c.ativo) return false;
    if (filterTipo !== 'todos' && c.tipo !== filterTipo) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-4">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Clientes</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {filtered.length} cliente{filtered.length !== 1 ? 's' : ''}
            {scope.isHolding && <span className="ml-2 text-violet-600 font-medium">· Holding</span>}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" /> Novo Cliente
        </button>
      </div>

      {deleteError && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 text-sm">
          <span className="shrink-0 font-bold">⚠</span>
          <span>{deleteError}</span>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>
        <select
          value={filterTipo}
          onChange={e => setFilterTipo(e.target.value as typeof filterTipo)}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
        >
          <option value="todos">Tipo: Todos</option>
          <option value="PJ">Pessoa Jurídica</option>
          <option value="PF">Pessoa Física</option>
        </select>
        <select
          value={filterAtivo}
          onChange={e => setFilterAtivo(e.target.value as typeof filterAtivo)}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
        >
          <option value="todos">Status: Todos</option>
          <option value="ativo">Ativos</option>
          <option value="inativo">Inativos</option>
        </select>
        <button
          onClick={() => load(search)}
          className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" /> Carregando…
          </div>
        ) : loadError ? (
          <div className="p-12 text-center">
            <XCircle className="w-10 h-10 text-red-300 mx-auto mb-3" />
            <p className="text-slate-600 text-sm font-medium">Erro ao carregar clientes</p>
            <p className="text-slate-400 text-xs mt-1 font-mono">{loadError}</p>
            <button onClick={() => load(search)} className="mt-4 px-4 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700">
              Tentar novamente
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <User className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-medium">Nenhum cliente encontrado</p>
            <p className="text-slate-400 text-xs mt-1">Cadastre o primeiro cliente para começar.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Cliente</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">CPF/CNPJ</th>
                  {scope.isHolding && <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Empresa</th>}
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Contato</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${c.tipo === 'PJ' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>
                          {c.tipo === 'PJ' ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{c.nome}</p>
                          <p className="text-xs text-slate-400">{c.tipo === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">{c.cpf_cnpj || '—'}</td>
                    {scope.isHolding && <TenantBadge tenantId={c.tenant_id} />}
                    <td className="px-4 py-3">
                      <div className="space-y-0.5">
                        {c.email && (
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Mail className="w-3 h-3" /> {c.email}
                          </div>
                        )}
                        {c.telefone && (
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Phone className="w-3 h-3" /> {c.telefone}
                          </div>
                        )}
                        {!c.email && !c.telefone && <span className="text-slate-300 text-xs">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.ativo
                        ? <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium"><CheckCircle2 className="w-3 h-3" />Ativo</span>
                        : <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium"><XCircle className="w-3 h-3" />Inativo</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setDetalheCliente(c)}
                          title="Ver detalhes"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          disabled={deleting === c.id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal detalhe do cliente */}
      {detalheCliente && (
        <ClienteDetalheModal cliente={detalheCliente} onClose={() => setDetalheCliente(null)} />
      )}

      {/* Modal criar/editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-800">
                {editItem ? 'Editar Cliente' : 'Novo Cliente'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Empresa (só aparece em Holding/Matriz) */}
              <TenantSelector
                value={selectedTenant}
                onChange={setSelectedTenant}
                label="Empresa *"
                required
              />

              {/* Tipo */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Tipo</label>
                <div className="flex gap-2">
                  {(['PJ', 'PF'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setForm(f => ({ ...f, tipo: t }))}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${form.tipo === t ? 'border-violet-600 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-500'}`}
                    >
                      {t === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nome */}
              <Field label="Nome / Razão Social *">
                <input
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder={form.tipo === 'PJ' ? 'Razão Social' : 'Nome completo'}
                  className={INPUT}
                />
              </Field>

              {/* CPF/CNPJ */}
              <Field label={form.tipo === 'PJ' ? 'CNPJ' : 'CPF'}>
                <input
                  value={form.cpf_cnpj}
                  onChange={e => setForm(f => ({ ...f, cpf_cnpj: e.target.value }))}
                  placeholder={form.tipo === 'PJ' ? '00.000.000/0000-00' : '000.000.000-00'}
                  className={INPUT}
                />
              </Field>

              {/* E-mail e Telefone */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="E-mail">
                  <input
                    type="email"
                    value={form.email ?? ''}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value || null }))}
                    placeholder="email@empresa.com"
                    className={INPUT}
                  />
                </Field>
                <Field label="Telefone">
                  <input
                    value={form.telefone ?? ''}
                    onChange={e => setForm(f => ({ ...f, telefone: e.target.value || null }))}
                    placeholder="(00) 00000-0000"
                    className={INPUT}
                  />
                </Field>
              </div>

              {/* Limite de crédito */}
              <Field label="Limite de Crédito (R$)">
                <input
                  type="number"
                  min={0}
                  value={form.limite_credito ?? ''}
                  onChange={e => setForm(f => ({ ...f, limite_credito: e.target.value ? Number(e.target.value) : null }))}
                  placeholder="0,00"
                  className={INPUT}
                />
              </Field>

              {/* Ativo */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setForm(f => ({ ...f, ativo: !f.ativo }))}
                  className={`w-10 h-5 rounded-full transition-colors relative ${form.ativo ? 'bg-violet-600' : 'bg-slate-300'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.ativo ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
                <span className="text-sm text-slate-700">Cliente ativo</span>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex gap-2 justify-end">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.nome.trim()}
                className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold disabled:opacity-50"
              >
                {saving ? 'Salvando…' : editItem ? 'Salvar Alterações' : 'Criar Cliente'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">{label}</label>
      {children}
    </div>
  );
}
