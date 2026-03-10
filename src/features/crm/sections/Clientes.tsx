// ─────────────────────────────────────────────────────────────────────────────
// CRM — Clientes: lista, busca e CRUD completo
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react';
import {
  Plus, Search, RefreshCw, Pencil, Trash2, X,
  Building2, User, Mail, Phone, CheckCircle2, XCircle,
} from 'lucide-react';
import {
  getClientes, createCliente, updateCliente, deleteCliente,
  invalidateCacheAll,
  type ErpCliente,
} from '../../../lib/erp';
import { useScope } from '../../../context/ProfileContext';

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

export default function CRMClientes() {
  const scope = useScope();
  const [clientes, setClientes] = useState<ErpCliente[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem]   = useState<ErpCliente | null>(null);
  const [form, setForm]           = useState<Form>(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState<string | null>(null);
  const [filterAtivo, setFilterAtivo] = useState<'todos' | 'ativo' | 'inativo'>('todos');
  const [filterTipo, setFilterTipo]   = useState<'todos' | 'PF' | 'PJ'>('todos');

  async function load(q = '') {
    setLoading(true);
    try {
      const data = await getClientes(q);
      setClientes(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  function openCreate() {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(c: ErpCliente) {
    setEditItem(c);
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
        await createCliente(form);
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
    try {
      await deleteCliente(id);
      invalidateCacheAll();
      setClientes(prev => prev.filter(c => c.id !== id));
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">{label}</label>
      {children}
    </div>
  );
}
