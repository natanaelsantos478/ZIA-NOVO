// ─────────────────────────────────────────────────────────────────────────────
// CRM Customer Success — Gestão de atendimentos e casos
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState, type ElementType } from 'react';
import {
  RefreshCw, Plus, Pencil, X, Search,
  CheckCircle2, Clock, AlertTriangle,
  MessageSquare, Wrench, FileCheck,
} from 'lucide-react';
import {
  getAtendimentos, getClientes, createAtendimento, updateAtendimento, invalidateCacheAll,
  type ErpAtendimento, type ErpCliente,
} from '../../../lib/erp';
import { useScope } from '../../../context/ProfileContext';

const STATUS_LABEL: Record<ErpAtendimento['status'], string> = {
  ABERTO:       'Aberto',
  EM_ANDAMENTO: 'Em Andamento',
  RESOLVIDO:    'Resolvido',
  FECHADO:      'Fechado',
};

const STATUS_COLOR: Record<ErpAtendimento['status'], string> = {
  ABERTO:       'bg-orange-100 text-orange-700',
  EM_ANDAMENTO: 'bg-blue-100 text-blue-700',
  RESOLVIDO:    'bg-emerald-100 text-emerald-700',
  FECHADO:      'bg-slate-100 text-slate-500',
};

const STATUS_ICON: Record<ErpAtendimento['status'], ElementType> = {
  ABERTO:       Clock,
  EM_ANDAMENTO: RefreshCw,
  RESOLVIDO:    CheckCircle2,
  FECHADO:      FileCheck,
};

const PRIO_COLOR: Record<ErpAtendimento['prioridade'], string> = {
  BAIXA:   'bg-slate-100 text-slate-500',
  MEDIA:   'bg-yellow-100 text-yellow-700',
  ALTA:    'bg-orange-100 text-orange-700',
  CRITICA: 'bg-red-100 text-red-700',
};

const TIPO_ICON: Record<ErpAtendimento['tipo'], ElementType> = {
  ATENDIMENTO:   MessageSquare,
  CASO:          AlertTriangle,
  ORDEM_SERVICO: Wrench,
};

const TIPO_LABEL: Record<ErpAtendimento['tipo'], string> = {
  ATENDIMENTO:   'Atendimento',
  CASO:          'Caso',
  ORDEM_SERVICO: 'Ordem de Serviço',
};

type Form = {
  tipo: ErpAtendimento['tipo'];
  cliente_id: string;
  titulo: string;
  descricao: string;
  prioridade: ErpAtendimento['prioridade'];
};

const EMPTY_FORM: Form = {
  tipo: 'ATENDIMENTO',
  cliente_id: '',
  titulo: '',
  descricao: '',
  prioridade: 'MEDIA',
};

export default function CRMCustomerSuccess() {
  const scope = useScope();
  const [atendimentos, setAtendimentos] = useState<ErpAtendimento[]>([]);
  const [clientes, setClientes]         = useState<ErpCliente[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [filterStatus, setFilterStatus] = useState<ErpAtendimento['status'] | 'todos'>('todos');
  const [filterTipo, setFilterTipo]     = useState<ErpAtendimento['tipo'] | 'todos'>('todos');
  const [modalOpen, setModalOpen]       = useState(false);
  const [editItem, setEditItem]         = useState<ErpAtendimento | null>(null);
  const [form, setForm]                 = useState<Form>(EMPTY_FORM);
  const [saving, setSaving]             = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [a, c] = await Promise.all([getAtendimentos(), getClientes()]);
      setAtendimentos(a);
      setClientes(c);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    invalidateCacheAll();
    load();
  }, [scope.entityId]); // eslint-disable-line react-hooks/exhaustive-deps

  function openCreate() {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(a: ErpAtendimento) {
    setEditItem(a);
    setForm({
      tipo: a.tipo,
      cliente_id: a.cliente_id,
      titulo: a.titulo,
      descricao: a.descricao ?? '',
      prioridade: a.prioridade,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.titulo.trim() || !form.cliente_id) return;
    setSaving(true);
    try {
      if (editItem) {
        await updateAtendimento(editItem.id, {
          tipo: form.tipo,
          cliente_id: form.cliente_id,
          titulo: form.titulo,
          descricao: form.descricao || null,
          prioridade: form.prioridade,
        });
      } else {
        await createAtendimento({
          tipo: form.tipo,
          status: 'ABERTO',
          cliente_id: form.cliente_id,
          responsavel_id: null,
          titulo: form.titulo,
          descricao: form.descricao || null,
          prioridade: form.prioridade,
          data_abertura: new Date().toISOString().split('T')[0],
          data_fechamento: null,
        });
      }
      invalidateCacheAll();
      setModalOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(id: string, status: ErpAtendimento['status']) {
    setUpdatingStatus(id);
    try {
      await updateAtendimento(id, {
        status,
        data_fechamento: (status === 'FECHADO' || status === 'RESOLVIDO')
          ? new Date().toISOString().split('T')[0]
          : null,
      });
      invalidateCacheAll();
      setAtendimentos(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    } finally {
      setUpdatingStatus(null);
    }
  }

  const filtered = atendimentos.filter(a => {
    if (filterStatus !== 'todos' && a.status !== filterStatus) return false;
    if (filterTipo !== 'todos' && a.tipo !== filterTipo) return false;
    if (search) {
      const text = `${a.titulo} ${a.erp_clientes?.nome ?? ''}`.toLowerCase();
      if (!text.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const abertos = atendimentos.filter(a => a.status === 'ABERTO' || a.status === 'EM_ANDAMENTO').length;
  const criticos = atendimentos.filter(a => a.prioridade === 'CRITICA' && a.status !== 'FECHADO').length;

  return (
    <div className="p-6 space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Customer Success</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {abertos} em aberto
            {criticos > 0 && <span className="ml-2 text-red-600 font-semibold">· {criticos} crítico{criticos > 1 ? 's' : ''}</span>}
            {scope.isHolding && <span className="ml-2 text-violet-600 font-medium">· Holding</span>}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" /> Novo Atendimento
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por título ou cliente…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
        >
          <option value="todos">Status: Todos</option>
          {(Object.keys(STATUS_LABEL) as ErpAtendimento['status'][]).map(s => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        <select
          value={filterTipo}
          onChange={e => setFilterTipo(e.target.value as typeof filterTipo)}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
        >
          <option value="todos">Tipo: Todos</option>
          {(Object.keys(TIPO_LABEL) as ErpAtendimento['tipo'][]).map(t => (
            <option key={t} value={t}>{TIPO_LABEL[t]}</option>
          ))}
        </select>
        <button onClick={load} className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Lista de cards */}
      {loading ? (
        <div className="p-12 flex items-center justify-center text-slate-400 text-sm gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" /> Carregando…
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Nenhum atendimento encontrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(a => {
            const Icon = TIPO_ICON[a.tipo];
            const StatusIcon = STATUS_ICON[a.status];
            return (
              <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-3">
                  {/* Ícone do tipo */}
                  <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-violet-600" />
                  </div>

                  {/* Conteúdo */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-semibold text-slate-800 text-sm">{a.titulo}</p>
                      <span className="font-mono text-xs text-slate-400">#{a.numero}</span>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">
                      {a.erp_clientes?.nome ?? '—'} · {TIPO_LABEL[a.tipo]}
                    </p>
                    {a.descricao && (
                      <p className="text-xs text-slate-500 line-clamp-2 mb-2">{a.descricao}</p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${STATUS_COLOR[a.status]}`}>
                        <StatusIcon className="w-3 h-3" />
                        {STATUS_LABEL[a.status]}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${PRIO_COLOR[a.prioridade]}`}>
                        {a.prioridade}
                      </span>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEdit(a)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    {/* Quick status change */}
                    {updatingStatus === a.id ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-violet-500" />
                    ) : (
                      <div className="flex gap-1">
                        {a.status === 'ABERTO' && (
                          <button
                            onClick={() => setStatus(a.id, 'EM_ANDAMENTO')}
                            title="Iniciar atendimento"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Clock className="w-4 h-4" />
                          </button>
                        )}
                        {(a.status === 'ABERTO' || a.status === 'EM_ANDAMENTO') && (
                          <button
                            onClick={() => setStatus(a.id, 'RESOLVIDO')}
                            title="Marcar como resolvido"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        {a.status === 'RESOLVIDO' && (
                          <button
                            onClick={() => setStatus(a.id, 'FECHADO')}
                            title="Fechar atendimento"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                          >
                            <FileCheck className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-800">
                {editItem ? 'Editar Atendimento' : 'Novo Atendimento'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">

              {/* Tipo */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Tipo</label>
                <div className="flex gap-2">
                  {(Object.keys(TIPO_LABEL) as ErpAtendimento['tipo'][]).map(t => (
                    <button
                      key={t}
                      onClick={() => setForm(f => ({ ...f, tipo: t }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold border-2 transition-colors ${form.tipo === t ? 'border-violet-600 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-500'}`}
                    >
                      {TIPO_LABEL[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cliente */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Cliente *</label>
                <select
                  value={form.cliente_id}
                  onChange={e => setForm(f => ({ ...f, cliente_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                >
                  <option value="">Selecione o cliente…</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              {/* Título */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Título *</label>
                <input
                  value={form.titulo}
                  onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                  placeholder="Descreva o atendimento brevemente…"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                />
              </div>

              {/* Prioridade */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Prioridade</label>
                <div className="flex gap-2">
                  {(['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'] as ErpAtendimento['prioridade'][]).map(p => (
                    <button
                      key={p}
                      onClick={() => setForm(f => ({ ...f, prioridade: p }))}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border-2 transition-colors ${form.prioridade === p ? `border-current ${PRIO_COLOR[p]}` : 'border-slate-200 text-slate-400'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Descrição</label>
                <textarea
                  value={form.descricao}
                  onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  rows={4}
                  placeholder="Detalhes do atendimento…"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex gap-2 justify-end">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.titulo.trim() || !form.cliente_id}
                className="px-5 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold disabled:opacity-50"
              >
                {saving ? 'Salvando…' : editItem ? 'Salvar' : 'Criar Atendimento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
