import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Users, X, Trash2, UserPlus, ChevronDown, ChevronRight,
  UserMinus,
} from 'lucide-react';
import {
  getEmployeeGroups, createEmployeeGroup, deleteEmployeeGroup,
  getGroupMembers, addEmployeeToGroup, removeEmployeeFromGroup,
  getEmployees,
} from '../../../lib/hr';
import type { EmployeeGroup, EmployeeGroupMember, Employee } from '../../../lib/hr';

/* ── Types ────────────────────────────────────────────────────────────────── */

type GroupType = 'Turno' | 'Departamento' | 'Projeto' | 'Benefício' | 'Equipe' | 'Comitê' | 'Personalizado';

const TYPE_COLORS: Record<string, string> = {
  'Turno':         'bg-blue-100 text-blue-700',
  'Departamento':  'bg-indigo-100 text-indigo-700',
  'Projeto':       'bg-amber-100 text-amber-700',
  'Benefício':     'bg-green-100 text-green-700',
  'Equipe':        'bg-cyan-100 text-cyan-700',
  'Comitê':        'bg-rose-100 text-rose-700',
  'Personalizado': 'bg-purple-100 text-purple-700',
};

const GROUP_TYPES: GroupType[] = [
  'Turno', 'Departamento', 'Projeto', 'Benefício', 'Equipe', 'Comitê', 'Personalizado',
];

const INPUT = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400 bg-white';

/* ── New Group Modal ──────────────────────────────────────────────────────── */

function NewGroupModal({ onClose, onSave }: {
  onClose: () => void;
  onSave: (name: string, type: string, description: string) => Promise<void>;
}) {
  const [name, setName]         = useState('');
  const [type, setType]         = useState<GroupType>('Equipe');
  const [description, setDesc]  = useState('');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { setError(true); return; }
    setSaving(true);
    await onSave(name.trim(), type, description.trim());
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">Novo Grupo</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Nome do Grupo <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(false); }}
              placeholder="Ex: Squad Frontend"
              className={`${INPUT} ${error ? 'border-rose-400 bg-rose-50' : ''}`}
            />
            {error && <p className="text-xs text-rose-500 mt-1">Campo obrigatório</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Tipo</label>
            <select value={type} onChange={(e) => setType(e.target.value as GroupType)} className={INPUT}>
              {GROUP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Descreva o propósito deste grupo..."
              rows={3}
              className={`${INPUT} resize-none`}
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium disabled:opacity-60">
            {saving ? 'Criando...' : 'Criar Grupo'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Add Member Modal ─────────────────────────────────────────────────────── */

function AddMemberModal({ groupId, groupName, currentMemberIds, onClose, onAdded }: {
  groupId: string;
  groupName: string;
  currentMemberIds: string[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch]       = useState('');
  const [adding, setAdding]       = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    getEmployees().then(setEmployees).finally(() => setLoading(false));
  }, []);

  const available = employees.filter(
    (e) => !currentMemberIds.includes(e.id) &&
    (e.full_name.toLowerCase().includes(search.toLowerCase()) ||
     (e.position_title ?? '').toLowerCase().includes(search.toLowerCase()))
  );

  const handleAdd = async (empId: string) => {
    setAdding(empId);
    await addEmployeeToGroup(groupId, empId);
    setAdding(null);
    onAdded();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-800">Adicionar Colaborador</h2>
            <p className="text-xs text-slate-400 mt-0.5">Grupo: {groupName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-3 border-b border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar colaborador..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-pink-500/30"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {loading && <p className="text-center text-slate-400 text-sm py-6">Carregando colaboradores...</p>}
          {!loading && available.length === 0 && (
            <p className="text-center text-slate-400 text-sm py-6">
              {employees.length === 0 ? 'Nenhum colaborador cadastrado.' : 'Todos já fazem parte do grupo ou nenhum corresponde à busca.'}
            </p>
          )}
          {!loading && available.map((emp) => (
            <div key={emp.id} className="flex items-center gap-3 py-3 px-2 hover:bg-slate-50 rounded-xl transition-colors">
              <div className="w-9 h-9 rounded-full bg-pink-100 flex items-center justify-center text-sm font-bold text-pink-600 shrink-0">
                {emp.full_name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800">{emp.full_name}</p>
                <p className="text-xs text-slate-400">{emp.position_title ?? '—'}</p>
              </div>
              <button
                onClick={() => void handleAdd(emp.id)}
                disabled={adding === emp.id}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-pink-600 rounded-lg hover:bg-pink-700 disabled:opacity-60"
              >
                <UserPlus className="w-3.5 h-3.5" />
                {adding === emp.id ? 'Adicionando...' : 'Adicionar'}
              </button>
            </div>
          ))}
        </div>
        <div className="px-6 py-3 border-t border-slate-100 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Fechar</button>
        </div>
      </div>
    </div>
  );
}

/* ── Group Row ────────────────────────────────────────────────────────────── */

function GroupRow({ group, onDeleted }: {
  group: EmployeeGroup;
  onDeleted: () => void;
}) {
  const [expanded, setExpanded]    = useState(false);
  const [members, setMembers]      = useState<EmployeeGroupMember[]>([]);
  const [loadingM, setLoadingM]    = useState(false);
  const [showAdd, setShowAdd]      = useState(false);
  const [removing, setRemoving]    = useState<string | null>(null);
  const [deleting, setDeleting]    = useState(false);
  const [confirmDel, setConfirmDel]= useState(false);

  const loadMembers = useCallback(async () => {
    setLoadingM(true);
    const data = await getGroupMembers(group.id);
    setMembers(data);
    setLoadingM(false);
  }, [group.id]);

  const handleExpand = () => {
    setExpanded((v) => !v);
    if (!expanded && members.length === 0) loadMembers();
  };

  const handleRemoveMember = async (employeeId: string) => {
    setRemoving(employeeId);
    await removeEmployeeFromGroup(group.id, employeeId);
    setMembers((prev) => prev.filter((m) => m.employee_id !== employeeId));
    setRemoving(null);
  };

  const handleDeleteGroup = async () => {
    setDeleting(true);
    await deleteEmployeeGroup(group.id);
    onDeleted();
  };

  return (
    <>
      {showAdd && (
        <AddMemberModal
          groupId={group.id}
          groupName={group.name}
          currentMemberIds={members.map((m) => m.employee_id)}
          onClose={() => setShowAdd(false)}
          onAdded={loadMembers}
        />
      )}

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* Group header */}
        <div
          className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
          onClick={handleExpand}
        >
          <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-pink-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-slate-800">{group.name}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${TYPE_COLORS[group.type] ?? 'bg-slate-100 text-slate-600'}`}>
                {group.type}
              </span>
            </div>
            {group.description && (
              <p className="text-xs text-slate-400 mt-0.5 truncate">{group.description}</p>
            )}
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <p className="text-xs text-slate-400">Membros</p>
              <p className="font-bold text-slate-800">{members.length > 0 ? members.length : group.member_count}</p>
            </div>
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-pink-600 border border-pink-200 rounded-lg hover:bg-pink-50 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" /> Adicionar
              </button>
              {confirmDel ? (
                <div className="flex items-center gap-1">
                  <button onClick={() => void handleDeleteGroup()} disabled={deleting}
                    className="px-2 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60">
                    {deleting ? '...' : 'Confirmar'}
                  </button>
                  <button onClick={() => setConfirmDel(false)} className="px-2 py-1.5 text-xs text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50">
                    Cancelar
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmDel(true)}
                  className="p-1.5 text-slate-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            {expanded
              ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
              : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
            }
          </div>
        </div>

        {/* Members list */}
        {expanded && (
          <div className="border-t border-slate-100 bg-slate-50/40">
            {loadingM && <p className="text-slate-400 text-sm text-center py-6">Carregando membros...</p>}
            {!loadingM && members.length === 0 && (
              <div className="text-center py-8">
                <Users className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">Nenhum membro neste grupo.</p>
                <button onClick={() => setShowAdd(true)}
                  className="mt-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-pink-600 border border-pink-200 rounded-lg hover:bg-pink-50 mx-auto">
                  <UserPlus className="w-3.5 h-3.5" /> Adicionar primeiro membro
                </button>
              </div>
            )}
            {!loadingM && members.length > 0 && (
              <div className="divide-y divide-slate-100">
                {members.map((m) => {
                  const emp = m.employees;
                  const name = emp?.full_name ?? '—';
                  const role = emp?.position_title ?? '—';
                  const dept = emp?.departments?.name ?? '—';
                  const avatarInitials = name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
                  return (
                    <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-xs font-bold text-pink-600 shrink-0">
                        {avatarInitials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800">{name}</p>
                        <p className="text-xs text-slate-400">{role} · {dept}</p>
                      </div>
                      <p className="text-[10px] text-slate-400 shrink-0">
                        Desde {new Date(m.added_at).toLocaleDateString('pt-BR')}
                      </p>
                      <button
                        onClick={() => void handleRemoveMember(m.employee_id)}
                        disabled={removing === m.employee_id}
                        className="p-1.5 text-slate-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 disabled:opacity-50 ml-2"
                        title="Remover do grupo"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

/* ── Main Component ───────────────────────────────────────────────────────── */

export default function EmployeeGroups() {
  const [groups, setGroups]       = useState<EmployeeGroup[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [typeFilter, setTypeFilter] = useState('Todos');
  const [showNew, setShowNew]     = useState(false);

  const loadGroups = useCallback(async () => {
    setLoading(true);
    const data = await getEmployeeGroups();
    setGroups(data);
    setLoading(false);
  }, []);

  useEffect(() => { void loadGroups(); }, [loadGroups]);

  const filtered = groups.filter((g) => {
    const matchSearch = g.name.toLowerCase().includes(search.toLowerCase());
    const matchType   = typeFilter === 'Todos' || g.type === typeFilter;
    return matchSearch && matchType;
  });

  const handleCreate = async (name: string, type: string, description: string) => {
    await createEmployeeGroup({ name, type, description: description || null, member_count: 0 });
    await loadGroups();
  };

  return (
    <div className="p-8">
      {showNew && (
        <NewGroupModal onClose={() => setShowNew(false)} onSave={handleCreate} />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Grupos de Funcionários</h1>
          <p className="text-slate-500 text-sm mt-1">Organize colaboradores em grupos por turno, projeto, equipe ou critério personalizado</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium">
          <Plus className="w-4 h-4" /> Novo Grupo
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Total de Grupos</p>
          <p className="text-3xl font-bold text-slate-800">{groups.length}</p>
        </div>
        <div className="bg-pink-50 border border-pink-100 rounded-xl p-4">
          <p className="text-xs text-pink-600 font-semibold uppercase tracking-wider mb-1">Tipos Distintos</p>
          <p className="text-3xl font-bold text-pink-700">
            {new Set(groups.map((g) => g.type)).size}
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider mb-1">Filtrados</p>
          <p className="text-3xl font-bold text-blue-700">{filtered.length}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar grupo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-pink-500/30"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none"
        >
          <option value="Todos">Todos os tipos</option>
          {GROUP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Groups list */}
      {loading && <div className="text-center py-12 text-slate-400 text-sm">Carregando grupos...</div>}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16">
          <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">
            {groups.length === 0 ? 'Nenhum grupo criado ainda.' : 'Nenhum grupo corresponde ao filtro.'}
          </p>
          {groups.length === 0 && (
            <button onClick={() => setShowNew(true)}
              className="mt-4 flex items-center gap-2 px-4 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium mx-auto">
              <Plus className="w-4 h-4" /> Criar primeiro grupo
            </button>
          )}
        </div>
      )}
      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((g) => (
            <GroupRow key={g.id} group={g} onDeleted={loadGroups} />
          ))}
        </div>
      )}
    </div>
  );
}
