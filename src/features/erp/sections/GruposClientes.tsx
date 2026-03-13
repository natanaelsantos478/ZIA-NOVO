import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, X, Loader2, CheckCircle, AlertCircle,
  Users, Search, UserPlus, ChevronRight, Save, Edit2,
} from 'lucide-react';
import {
  getGruposClientes, createGrupoCliente, updateGrupoCliente, deleteGrupoCliente,
  getMembrosGrupo, addMembroGrupo, removeMembroGrupo, getClientes,
  type ErpGrupoCliente, type ErpGrupoClienteMembro, type ErpCliente,
} from '../../../lib/erp';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

const TIPO_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  geral:         { label: 'Geral',         bg: 'bg-slate-100',  color: 'text-slate-600' },
  vip:           { label: 'VIP',           bg: 'bg-amber-100',  color: 'text-amber-700' },
  inadimplente:  { label: 'Inadimplente',  bg: 'bg-red-100',    color: 'text-red-700'   },
  personalizado: { label: 'Personalizado', bg: 'bg-blue-100',   color: 'text-blue-700'  },
};

type GroupForm = { nome: string; tipo: string; descricao: string };
const EMPTY_GROUP: GroupForm = { nome: '', tipo: 'geral', descricao: '' };

// ── Modal para adicionar cliente ao grupo ─────────────────────────────────────
function AddClienteModal({
  grupoId,
  membrosIds,
  onClose,
  onAdded,
}: {
  grupoId: string;
  membrosIds: Set<string>;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [clientes, setClientes] = useState<ErpCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    getClientes('')
      .then(setClientes)
      .catch(() => setClientes([]))
      .finally(() => setLoading(false));
  }, []);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleAdd(clienteId: string) {
    setAdding(clienteId);
    try {
      await addMembroGrupo(grupoId, clienteId);
      showToast('Cliente adicionado ao grupo.', true);
      onAdded();
    } catch (e) {
      showToast('Erro: ' + (e as Error).message, false);
    } finally {
      setAdding(null);
    }
  }

  const filtered = clientes.filter(c =>
    !membrosIds.has(c.id) &&
    c.nome.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]">
        {/* Toast interno */}
        {toast && (
          <div className={`fixed top-4 right-4 z-[60] flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
            {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
          <h2 className="text-base font-bold text-slate-900">Adicionar Cliente</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-slate-700" /></button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-slate-100 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="Buscar cliente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-sm text-slate-400">Nenhum cliente disponível.</p>
          ) : filtered.map(c => (
            <div key={c.id} className="flex items-center justify-between px-5 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{c.nome}</p>
                <p className="text-[11px] text-slate-400">{c.cpf_cnpj}</p>
              </div>
              <button
                onClick={() => handleAdd(c.id)}
                disabled={adding === c.id}
                className="flex items-center gap-1 bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-60 shrink-0 ml-3"
              >
                {adding === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                Adicionar
              </button>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-slate-100 shrink-0">
          <button onClick={onClose} className="w-full py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function GruposClientes() {
  const [grupos, setGrupos] = useState<ErpGrupoCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ErpGrupoCliente | null>(null);
  const [membros, setMembros] = useState<ErpGrupoClienteMembro[]>([]);
  const [membrosLoading, setMembrosLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<GroupForm>(EMPTY_GROUP);
  const [, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(false);
  const [editForm, setEditForm] = useState<GroupForm>(EMPTY_GROUP);
  const [editSaving, setEditSaving] = useState(false);

  const loadGrupos = useCallback(async () => {
    try {
      setLoading(true);
      setGrupos(await getGruposClientes());
    } catch (e) {
      showToast('Erro ao carregar grupos: ' + (e as Error).message, false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadGrupos(); }, [loadGrupos]);

  const loadMembros = useCallback(async (grupoId: string) => {
    setMembrosLoading(true);
    try {
      setMembros(await getMembrosGrupo(grupoId));
    } catch (e) {
      showToast('Erro ao carregar membros: ' + (e as Error).message, false);
    } finally {
      setMembrosLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selected) loadMembros(selected.id);
    else setMembros([]);
  }, [selected, loadMembros]);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  function openNew() {
    setForm(EMPTY_GROUP);
    setEditId(null);
    setShowForm(true);
  }

  async function handleCreate() {
    if (!form.nome.trim()) return showToast('Nome é obrigatório.', false);
    setSaving(true);
    try {
      await createGrupoCliente({
        nome: form.nome,
        tipo: form.tipo,
        descricao: form.descricao || null,
      });
      showToast('Grupo criado.', true);
      setShowForm(false);
      setForm(EMPTY_GROUP);
      loadGrupos();
    } catch (e) {
      showToast('Erro: ' + (e as Error).message, false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteGrupo(id: string) {
    if (!confirm('Excluir este grupo de clientes?')) return;
    try {
      await deleteGrupoCliente(id);
      showToast('Grupo excluído.', true);
      if (selected?.id === id) setSelected(null);
      loadGrupos();
    } catch (e) {
      showToast('Erro: ' + (e as Error).message, false);
    }
  }

  function openEdit(g: ErpGrupoCliente) {
    setEditForm({ nome: g.nome, tipo: g.tipo, descricao: g.descricao ?? '' });
    setEditingGroup(true);
  }

  async function handleUpdateGrupo() {
    if (!selected || !editForm.nome.trim()) return showToast('Nome é obrigatório.', false);
    setEditSaving(true);
    try {
      const updated = await updateGrupoCliente(selected.id, {
        nome: editForm.nome,
        tipo: editForm.tipo,
        descricao: editForm.descricao || null,
      });
      showToast('Grupo atualizado.', true);
      setEditingGroup(false);
      setSelected(updated);
      loadGrupos();
    } catch (e) {
      showToast('Erro: ' + (e as Error).message, false);
    } finally {
      setEditSaving(false);
    }
  }

  async function handleRemoveMembro(clienteId: string) {
    if (!selected) return;
    if (!confirm('Remover cliente do grupo?')) return;
    try {
      await removeMembroGrupo(selected.id, clienteId);
      showToast('Cliente removido.', true);
      loadMembros(selected.id);
      loadGrupos();
    } catch (e) {
      showToast('Erro: ' + (e as Error).message, false);
    }
  }

  const membrosIds = new Set(membros.map(m => m.cliente_id));

  return (
    <div className="flex h-full overflow-hidden" translate="no">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Painel esquerdo — lista de grupos */}
      <div className="w-72 shrink-0 border-r border-slate-200 flex flex-col bg-slate-50">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between">
            <h1 className="text-sm font-bold text-slate-800">Grupos de Clientes</h1>
            <button
              onClick={openNew}
              className="flex items-center gap-1 bg-slate-800 hover:bg-slate-900 text-white px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Novo
            </button>
          </div>
        </div>

        {/* Formulário inline de criação */}
        {showForm && (
          <div className="border-b border-slate-200 bg-white px-4 py-3 space-y-2.5">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Novo Grupo</p>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Nome *</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                placeholder="Nome do grupo"
                value={form.nome}
                onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Tipo</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
                value={form.tipo}
                onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}
              >
                <option value="geral">Geral</option>
                <option value="vip">VIP</option>
                <option value="inadimplente">Inadimplente</option>
                <option value="personalizado">Personalizado</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Descrição</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                placeholder="Opcional"
                value={form.descricao}
                onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-900 text-white py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Criar
              </button>
              <button
                onClick={() => { setShowForm(false); setForm(EMPTY_GROUP); }}
                className="flex-1 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Lista */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
          ) : grupos.length === 0 ? (
            <p className="text-center py-8 text-sm text-slate-400">Nenhum grupo cadastrado.</p>
          ) : grupos.map(g => {
            const tc = TIPO_CONFIG[g.tipo] ?? TIPO_CONFIG.geral;
            const isSelected = selected?.id === g.id;
            return (
              <div
                key={g.id}
                onClick={() => { setSelected(g); setEditingGroup(false); }}
                className={`px-4 py-3 border-b border-slate-100 cursor-pointer transition-colors ${isSelected ? 'bg-slate-800 text-white' : 'hover:bg-white'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>{g.nome}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${isSelected ? 'bg-slate-600 text-slate-200' : `${tc.bg} ${tc.color}`}`}>
                        {tc.label}
                      </span>
                    </div>
                    {g.descricao && (
                      <p className={`text-[11px] truncate mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>{g.descricao}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <ChevronRight className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-300' : 'text-slate-400'}`} />
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteGrupo(g.id); }}
                      className={`p-1 rounded transition-colors ${isSelected ? 'hover:bg-slate-700 text-slate-300 hover:text-red-300' : 'hover:bg-red-50 text-slate-300 hover:text-red-500'}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-4 py-2 border-t border-slate-200 bg-white">
          <p className="text-[11px] text-slate-400">{grupos.length} grupo{grupos.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Painel direito — detalhes do grupo */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <Users className="w-12 h-12 text-slate-200 mb-3" />
            <p className="font-semibold text-slate-400">Selecione um grupo</p>
            <p className="text-sm text-slate-300 mt-1">ou clique em "Novo" para criar</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-white shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">{selected.nome}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {(TIPO_CONFIG[selected.tipo] ?? TIPO_CONFIG.geral).label}
                    {selected.descricao ? ` · ${selected.descricao}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { openEdit(selected); }}
                    className="flex items-center gap-1 text-xs text-slate-600 border border-slate-200 hover:border-slate-400 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" /> Editar
                  </button>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-1 bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Adicionar Cliente
                  </button>
                </div>
              </div>
            </div>

            {/* Formulário de edição do grupo */}
            {editingGroup && (
              <div className="px-6 py-4 border-b border-blue-100 bg-blue-50 shrink-0">
                <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3">Editar Grupo</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Nome *</label>
                    <input
                      className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      value={editForm.nome}
                      onChange={e => setEditForm(p => ({ ...p, nome: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Tipo</label>
                    <select
                      className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                      value={editForm.tipo}
                      onChange={e => setEditForm(p => ({ ...p, tipo: e.target.value }))}
                    >
                      <option value="geral">Geral</option>
                      <option value="vip">VIP</option>
                      <option value="inadimplente">Inadimplente</option>
                      <option value="personalizado">Personalizado</option>
                    </select>
                  </div>
                  <div className="col-span-3">
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Descrição</label>
                    <input
                      className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      value={editForm.descricao}
                      onChange={e => setEditForm(p => ({ ...p, descricao: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleUpdateGrupo}
                    disabled={editSaving}
                    className="flex items-center gap-1 bg-slate-800 hover:bg-slate-900 text-white px-4 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-60"
                  >
                    {editSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Salvar
                  </button>
                  <button
                    onClick={() => setEditingGroup(false)}
                    className="px-4 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Lista de membros */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="px-6 py-3 border-b border-slate-100 shrink-0 flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  Membros do grupo
                </p>
                {!membrosLoading && (
                  <span className="text-[11px] text-slate-400">{membros.length} cliente{membros.length !== 1 ? 's' : ''}</span>
                )}
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {membrosLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
                ) : membros.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                    <Users className="w-10 h-10 text-slate-200 mb-3" />
                    <p className="font-semibold text-slate-400 text-sm">Nenhum cliente neste grupo</p>
                    <p className="text-xs text-slate-300 mt-1">Clique em "Adicionar Cliente" para incluir membros.</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-slate-50 z-10">
                      <tr className="border-b border-slate-200">
                        <th className="text-left px-6 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
                        <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Telefone</th>
                        <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Adicionado em</th>
                        <th className="px-4 py-2.5 w-12" />
                      </tr>
                    </thead>
                    <tbody>
                      {membros.map(m => (
                        <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-3">
                            <p className="font-semibold text-slate-800 text-sm">
                              {m.erp_clientes?.nome ?? m.cliente_id}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-sm">
                            {m.erp_clientes?.telefone ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-500 text-sm">
                            {fmtDate(m.added_at)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => handleRemoveMembro(m.cliente_id)}
                              className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                              title="Remover do grupo"
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
            </div>
          </>
        )}
      </div>

      {/* Modal para adicionar cliente */}
      {showAddModal && selected && (
        <AddClienteModal
          grupoId={selected.id}
          membrosIds={membrosIds}
          onClose={() => setShowAddModal(false)}
          onAdded={() => {
            loadMembros(selected.id);
            loadGrupos();
          }}
        />
      )}
    </div>
  );
}
