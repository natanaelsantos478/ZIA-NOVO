// ─────────────────────────────────────────────────────────────────────────────
// Perfis e Acessos — Gerenciamento de perfis do sistema ZIA
// Usa CompaniesContext para listas de holding/matriz/filial
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import {
  Plus, Building2, Shield, Users, User, Edit2, PowerOff,
  Check, X, ChevronDown, Eye, EyeOff, Lock, Info,
} from 'lucide-react';
import {
  useProfiles,
  LEVEL_LABELS,
  LEVEL_COLORS,
  MODULE_OPTIONS,
  type AccessLevel,
  type EntityType,
  type OperatorProfile,
} from '../../../context/ProfileContext';
import { useCompanies } from '../../../context/CompaniesContext';

const LEVEL_ICON: Record<AccessLevel, React.ElementType> = {
  1: Building2,
  2: Shield,
  3: Users,
  4: User,
};

const LEVEL_DESC: Record<AccessLevel, string> = {
  1: 'Acesso total — holding, todas as matrizes e todas as filiais',
  2: 'Acesso à matriz selecionada e todas as suas filiais',
  3: 'Acesso exclusivo à filial selecionada',
  4: 'Acesso restrito ao módulo atribuído (funcionário operacional)',
};

const SCOPE_EXAMPLE: Record<AccessLevel, string> = {
  1: 'Vê: Holding + Matrizes + Filiais + todos os módulos',
  2: 'Vê: sua Matriz + Filiais dela. Não vê outras matrizes.',
  3: 'Vê: apenas sua Filial. Não vê outras filiais nem matrizes.',
  4: 'Vê: apenas 1 módulo dentro da filial atribuída.',
};

interface FormState {
  name: string;
  level: AccessLevel;
  entityType: EntityType;
  entityId: string;
  entityName: string;
  moduleAccess: string;
  password: string;
  showPassword: boolean;
  active: boolean;
}

const BLANK_FORM: FormState = {
  name: '',
  level: 1,
  entityType: 'holding',
  entityId: 'holding-001',
  entityName: 'ZIA Omnisystem Holding',
  moduleAccess: 'erp',
  password: '',
  showPassword: false,
  active: true,
};

export default function Perfis() {
  const { scopedProfiles: profiles, addProfile, updateProfile, deleteProfile, nextCode } = useProfiles();
  const { holdings, matrices, branches, branchesOf } = useCompanies();

  const [showForm, setShowForm]       = useState(false);
  const [form, setForm]               = useState<FormState>(BLANK_FORM);
  const [editId, setEditId]           = useState<string | null>(null);
  const [saved, setSaved]             = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [showScope, setShowScope]     = useState<string | null>(null);

  function set(changes: Partial<FormState>) {
    setForm(prev => ({ ...prev, ...changes }));
  }

  function handleLevelChange(level: AccessLevel) {
    if (level === 1 && holdings.length > 0) {
      set({ level, entityType: 'holding', entityId: holdings[0].id, entityName: holdings[0].nomeFantasia });
    } else if (level === 2 && matrices.length > 0) {
      set({ level, entityType: 'matrix', entityId: matrices[0].id, entityName: matrices[0].nomeFantasia });
    } else if ((level === 3 || level === 4) && branches.length > 0) {
      set({ level, entityType: 'branch', entityId: branches[0].id, entityName: branches[0].nomeFantasia });
    } else {
      set({ level });
    }
  }

  function handleHoldingChange(id: string) {
    const found = holdings.find(h => h.id === id);
    if (found) set({ entityId: id, entityName: found.nomeFantasia });
  }

  function handleMatrixChange(id: string) {
    const found = matrices.find(m => m.id === id);
    if (found) set({ entityId: id, entityName: found.nomeFantasia });
  }

  function handleBranchChange(id: string) {
    const found = branches.find(b => b.id === id);
    if (found) set({ entityId: id, entityName: found.nomeFantasia });
  }

  // Filiais agrupadas por matriz para facilitar seleção
  const branchesByMatrix = matrices.map(m => ({
    matrixId: m.id,
    matrixName: m.nomeFantasia,
    branches: branchesOf(m.id),
  }));

  async function handleSave() {
    if (!form.name.trim() || !form.entityId) return;
    const payload = {
      name: form.name.trim(),
      level: form.level,
      entityType: form.entityType,
      entityId: form.entityId,
      entityName: form.entityName,
      moduleAccess: form.level === 4 ? form.moduleAccess : undefined,
      password: form.password.trim() || undefined,
      active: form.active,
    };
    if (editId) {
      await updateProfile(editId, payload).catch(console.error);
    } else {
      await addProfile(payload).catch(console.error);
    }
    setShowForm(false);
    setEditId(null);
    setForm(BLANK_FORM);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function handleEdit(p: OperatorProfile) {
    setForm({
      name: p.name,
      level: p.level,
      entityType: p.entityType,
      entityId: p.entityId,
      entityName: p.entityName,
      moduleAccess: p.moduleAccess ?? 'erp',
      password: p.password ?? '',
      showPassword: false,
      active: p.active,
    });
    setEditId(p.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleCancel() {
    setShowForm(false);
    setEditId(null);
    setForm(BLANK_FORM);
  }

  const nextProfileCode = nextCode();

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Perfis e Acessos</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {profiles.length} perfil(s) · {profiles.filter(p => p.active).length} ativo(s)
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm(BLANK_FORM); }}
          className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Perfil
        </button>
      </div>

      {/* Toast */}
      {saved && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl mb-4 text-sm">
          <Check className="w-4 h-4" />
          Perfil salvo com sucesso!
        </div>
      )}

      {/* Formulário */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 mb-1">
            {editId ? 'Editar Perfil' : 'Novo Perfil'}
          </h3>
          {!editId && (
            <p className="text-xs text-slate-400 mb-4">
              Código gerado automaticamente: <span className="font-mono font-semibold text-slate-600">#{nextProfileCode}</span>
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">

            {/* Nome */}
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Nome do perfil *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => set({ name: e.target.value })}
                placeholder="Ex: Gerente Loja SP, Caixa RJ, Diretor Financeiro..."
                className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>

            {/* Nível de acesso */}
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 block">
                Nível de acesso *
              </label>
              <div className="grid grid-cols-4 gap-2">
                {([1, 2, 3, 4] as AccessLevel[]).map(level => {
                  const Icon = LEVEL_ICON[level];
                  const isActive = form.level === level;
                  return (
                    <button
                      key={level}
                      onClick={() => handleLevelChange(level)}
                      className={`
                        flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-center transition-all
                        ${isActive
                          ? 'border-slate-800 bg-slate-800 text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }
                      `}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-bold">{`Nível ${level}`}</span>
                      <span className="text-[10px] opacity-70 leading-tight">{LEVEL_LABELS[level]}</span>
                    </button>
                  );
                })}
              </div>

              {/* Descrição de escopo */}
              <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs font-semibold text-slate-700">{LEVEL_DESC[form.level]}</p>
                <p className="text-[11px] text-slate-400 mt-1">{SCOPE_EXAMPLE[form.level]}</p>
              </div>
            </div>

            {/* Holding (nível 1) */}
            {form.level === 1 && (
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Holding *</label>
                <div className="mt-1 relative">
                  <select
                    value={form.entityId}
                    onChange={e => handleHoldingChange(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-slate-300 pr-8"
                  >
                    {holdings.length === 0 && <option value="">Nenhuma holding cadastrada</option>}
                    {holdings.map(h => <option key={h.id} value={h.id}>{h.nomeFantasia} — {h.code}</option>)}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Matriz (nível 2) */}
            {form.level === 2 && (
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Matriz *</label>
                <div className="mt-1 relative">
                  <select
                    value={form.entityId}
                    onChange={e => handleMatrixChange(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-slate-300 pr-8"
                  >
                    {matrices.length === 0 && <option value="">Nenhuma matriz cadastrada</option>}
                    {matrices.map(m => <option key={m.id} value={m.id}>{m.nomeFantasia} — {m.code}</option>)}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
                </div>
                {form.entityId && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Filiais visíveis: {branchesOf(form.entityId).map(b => b.nomeFantasia).join(', ') || '—'}
                  </p>
                )}
              </div>
            )}

            {/* Filial (nível 3 ou 4) */}
            {(form.level === 3 || form.level === 4) && (
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Filial *</label>
                <div className="mt-1 relative">
                  <select
                    value={form.entityId}
                    onChange={e => handleBranchChange(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-slate-300 pr-8"
                  >
                    {branches.length === 0 && <option value="">Nenhuma filial cadastrada</option>}
                    {branchesByMatrix.map(group =>
                      group.branches.length > 0 && (
                        <optgroup key={group.matrixId} label={group.matrixName}>
                          {group.branches.map(b => (
                            <option key={b.id} value={b.id}>{b.nomeFantasia} — {b.code}</option>
                          ))}
                        </optgroup>
                      )
                    )}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Módulo (apenas nível 4) */}
            {form.level === 4 && (
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Módulo de acesso *</label>
                <div className="mt-1 relative">
                  <select
                    value={form.moduleAccess}
                    onChange={e => set({ moduleAccess: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-slate-300 pr-8"
                  >
                    {MODULE_OPTIONS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Senha */}
            <div className={form.level === 4 ? '' : 'col-span-2'}>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1">
                <Lock className="w-3 h-3" /> Senha de acesso
              </label>
              <div className="mt-1 relative">
                <input
                  type={form.showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => set({ password: e.target.value })}
                  placeholder="Deixe em branco para acesso sem senha"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 pr-10"
                />
                <button
                  type="button"
                  onClick={() => set({ showPassword: !form.showPassword })}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {form.showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {form.password
                  ? 'Senha será exigida ao entrar com este perfil'
                  : 'Sem senha: basta clicar no perfil para entrar'
                }
              </p>
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
            <button onClick={handleCancel} className="flex items-center gap-1.5 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              <X className="w-4 h-4" /> Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!form.name.trim() || !form.entityId}
              className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              {editId ? 'Salvar alterações' : 'Criar perfil'}
            </button>
          </div>
        </div>
      )}

      {/* Lista de perfis */}
      <div className="space-y-2">
        {profiles.map(profile => {
          const Icon = LEVEL_ICON[profile.level];
          const isMaster = profile.id === 'profile-00001';
          const scopeOpen = showScope === profile.id;

          return (
            <div
              key={profile.id}
              className={`bg-white border rounded-2xl overflow-hidden transition-all ${
                profile.active ? 'border-slate-200' : 'border-slate-100 opacity-60'
              }`}
            >
              <div className="p-4 flex items-center gap-4">
                {/* Avatar */}
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  profile.active
                    ? profile.level === 1 ? 'bg-violet-100' : profile.level === 2 ? 'bg-blue-100' : profile.level === 3 ? 'bg-emerald-100' : 'bg-slate-100'
                    : 'bg-slate-100'
                }`}>
                  <Icon className={`w-5 h-5 ${
                    profile.active
                      ? profile.level === 1 ? 'text-violet-600' : profile.level === 2 ? 'text-blue-600' : profile.level === 3 ? 'text-emerald-600' : 'text-slate-600'
                      : 'text-slate-400'
                  }`} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-900 text-sm">{profile.name}</span>
                    {isMaster && (
                      <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full font-semibold">Master</span>
                    )}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${LEVEL_COLORS[profile.level]}`}>
                      {LEVEL_LABELS[profile.level]}
                    </span>
                    {profile.password && (
                      <span className="flex items-center gap-1 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
                        <Lock className="w-2.5 h-2.5" /> Senha
                      </span>
                    )}
                    {!profile.active && (
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Inativo</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                    <span className="truncate">{profile.entityName}</span>
                    {profile.moduleAccess && (
                      <span className="text-slate-400 flex-shrink-0">
                        · {MODULE_OPTIONS.find(m => m.id === profile.moduleAccess)?.label ?? profile.moduleAccess}
                      </span>
                    )}
                  </div>
                </div>

                {/* Código */}
                <span className="text-xs font-mono text-slate-400 flex-shrink-0">#{profile.code}</span>

                {/* Ações */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* Toggle escopo */}
                  <button
                    onClick={() => setShowScope(scopeOpen ? null : profile.id)}
                    className="p-2 rounded-lg text-slate-300 hover:bg-slate-100 hover:text-slate-500 transition-colors"
                    title="Ver escopo de acesso"
                  >
                    <Info className="w-4 h-4" />
                  </button>

                  <button onClick={() => handleEdit(profile)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors" title="Editar">
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {!isMaster && (
                    profile.active ? (
                      <button onClick={() => updateProfile(profile.id, { active: false }).catch(console.error)} className="p-2 rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors" title="Desativar">
                        <PowerOff className="w-4 h-4" />
                      </button>
                    ) : (
                      <button onClick={() => updateProfile(profile.id, { active: true }).catch(console.error)} className="p-2 rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors" title="Ativar">
                        <Check className="w-4 h-4" />
                      </button>
                    )
                  )}

                  {!isMaster && (
                    confirmDelete === profile.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => { deleteProfile(profile.id).catch(console.error); setConfirmDelete(null); }} className="px-2 py-1 text-[10px] bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700">Confirmar</button>
                        <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 text-[10px] bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200">Cancelar</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDelete(profile.id)} className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="Remover perfil">
                        <X className="w-4 h-4" />
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Painel de escopo expandido */}
              {scopeOpen && (
                <div className="px-4 pb-4 pt-0">
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs space-y-1.5">
                    <p className="font-semibold text-slate-700">Escopo de dados — o que este perfil enxerga:</p>
                    <p className="text-slate-500">{LEVEL_DESC[profile.level]}</p>
                    <p className="text-slate-400 font-mono">{SCOPE_EXAMPLE[profile.level]}</p>
                    <div className="mt-2 pt-2 border-t border-slate-200 flex items-center gap-4 text-slate-400">
                      <span>Entidade: <strong className="text-slate-600">{profile.entityName}</strong></span>
                      <span>Código: <strong className="font-mono text-slate-600">#{profile.code}</strong></span>
                      <span>Criado: <strong className="text-slate-600">{new Date(profile.createdAt).toLocaleDateString('pt-BR')}</strong></span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info */}
      <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-500">
        <p className="font-semibold text-slate-700 mb-1">Separação de dados por perfil</p>
        <p className="text-xs leading-relaxed">
          Cada perfil acessa apenas os dados da entidade à qual está vinculado.
          Perfis de <span className="text-violet-600 font-medium">Holding</span> veem tudo.
          Perfis de <span className="text-blue-600 font-medium">Matriz</span> veem a matriz e suas filiais.
          Perfis de <span className="text-emerald-600 font-medium">Filial</span> veem apenas a própria filial.
          Perfis de <span className="text-slate-600 font-medium">Funcionário</span> são limitados a 1 módulo da filial.
        </p>
        <div className="mt-3 flex gap-6 text-xs">
          <span>Total: <strong className="text-slate-700">{profiles.length}</strong></span>
          <span>Ativos: <strong className="text-emerald-600">{profiles.filter(p => p.active).length}</strong></span>
          <span>Com senha: <strong className="text-slate-600">{profiles.filter(p => !!p.password).length}</strong></span>
          <span>Inativos: <strong className="text-slate-400">{profiles.filter(p => !p.active).length}</strong></span>
        </div>
      </div>
    </div>
  );
}
