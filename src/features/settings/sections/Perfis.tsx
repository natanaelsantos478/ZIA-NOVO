// ─────────────────────────────────────────────────────────────────────────────
// Perfis e Acessos — Gerenciamento de perfis do sistema ZIA
// Criar/editar/desativar perfis com 4 níveis de acesso
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import {
  Plus, Building2, Shield, Users, User, Edit2, PowerOff,
  Check, X, ChevronDown, Eye, EyeOff, Lock,
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

// ── Mock entities ─────────────────────────────────────────────────────────────
const HOLDINGS  = [{ id: 'holding-001', name: 'ZIA Omnisystem Holding' }];
const MATRICES  = [{ id: 'matrix-001',  name: 'Matriz Principal' }, { id: 'matrix-002', name: 'Matriz Norte' }];
const BRANCHES  = [
  { id: 'branch-001', name: 'Filial São Paulo', matrixId: 'matrix-001' },
  { id: 'branch-002', name: 'Filial Rio de Janeiro', matrixId: 'matrix-001' },
  { id: 'branch-003', name: 'Filial Manaus', matrixId: 'matrix-002' },
];

const LEVEL_ICON: Record<AccessLevel, React.ElementType> = {
  1: Building2,
  2: Shield,
  3: Users,
  4: User,
};

const LEVEL_DESC: Record<AccessLevel, string> = {
  1: 'Acesso total — holding, matrizes e filiais',
  2: 'Acesso à matriz selecionada e suas filiais',
  3: 'Acesso somente à filial selecionada',
  4: 'Acesso restrito ao módulo selecionado',
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
  const { profiles, addProfile, updateProfile, deleteProfile, nextCode } = useProfiles();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(BLANK_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  function set(changes: Partial<FormState>) {
    setForm(prev => ({ ...prev, ...changes }));
  }

  function handleLevelChange(level: AccessLevel) {
    if (level === 1) {
      set({ level, entityType: 'holding', entityId: HOLDINGS[0].id, entityName: HOLDINGS[0].name });
    } else if (level === 2) {
      set({ level, entityType: 'matrix', entityId: MATRICES[0].id, entityName: MATRICES[0].name });
    } else if (level === 3) {
      set({ level, entityType: 'branch', entityId: BRANCHES[0].id, entityName: BRANCHES[0].name });
    } else {
      set({ level, entityType: 'branch', entityId: BRANCHES[0].id, entityName: BRANCHES[0].name });
    }
  }

  function handleEntityChange(id: string) {
    const found =
      [...HOLDINGS, ...MATRICES, ...BRANCHES].find(e => e.id === id);
    if (found) set({ entityId: id, entityName: found.name });
  }

  function handleSave() {
    if (!form.name.trim()) return;
    if (editId) {
      updateProfile(editId, {
        name: form.name.trim(),
        level: form.level,
        entityType: form.entityType,
        entityId: form.entityId,
        entityName: form.entityName,
        moduleAccess: form.level === 4 ? form.moduleAccess : undefined,
        password: form.password || undefined,
        active: form.active,
      });
    } else {
      addProfile({
        name: form.name.trim(),
        level: form.level,
        entityType: form.entityType,
        entityId: form.entityId,
        entityName: form.entityName,
        moduleAccess: form.level === 4 ? form.moduleAccess : undefined,
        password: form.password || undefined,
        active: true,
      });
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
            Gerencie os perfis de acesso ao sistema ZIA — {profiles.length} perfil(s) cadastrado(s)
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

      {/* Toast de sucesso */}
      {saved && (
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl mb-4 text-sm">
          <Check className="w-4 h-4" />
          Perfil salvo com sucesso!
        </div>
      )}

      {/* Formulário de criação / edição */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 mb-4">
            {editId ? 'Editar Perfil' : `Novo Perfil — Código gerado: #${nextProfileCode}`}
          </h3>

          <div className="grid grid-cols-2 gap-4">
            {/* Nome */}
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Nome do perfil *</label>
              <input
                type="text"
                value={form.name}
                onChange={e => set({ name: e.target.value })}
                placeholder="Ex: Caixa Loja SP, Gerente Logística..."
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
                        flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-center transition-all
                        ${isActive
                          ? 'border-slate-800 bg-slate-800 text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }
                      `}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-semibold">{`Nível ${level}`}</span>
                      <span className="text-[10px] opacity-70">{LEVEL_LABELS[level]}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500 mt-2">{LEVEL_DESC[form.level]}</p>
            </div>

            {/* Entidade (holding/matriz/filial) */}
            {form.level === 1 && (
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Holding</label>
                <div className="mt-1 relative">
                  <select
                    value={form.entityId}
                    onChange={e => handleEntityChange(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-slate-300 pr-8"
                  >
                    {HOLDINGS.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
                </div>
              </div>
            )}

            {form.level === 2 && (
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Matriz</label>
                <div className="mt-1 relative">
                  <select
                    value={form.entityId}
                    onChange={e => handleEntityChange(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-slate-300 pr-8"
                  >
                    {MATRICES.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
                </div>
              </div>
            )}

            {(form.level === 3 || form.level === 4) && (
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                  {form.level === 3 ? 'Filial' : 'Entidade'}
                </label>
                <div className="mt-1 relative">
                  <select
                    value={form.entityId}
                    onChange={e => handleEntityChange(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-slate-300 pr-8"
                  >
                    {[...BRANCHES].map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
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
                    {MODULE_OPTIONS.map(m => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Senha (opcional, para uso futuro) */}
            <div className={form.level === 4 ? '' : 'col-span-2'}>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1">
                <Lock className="w-3 h-3" /> Senha (opcional)
              </label>
              <div className="mt-1 relative">
                <input
                  type={form.showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => set({ password: e.target.value })}
                  placeholder="Deixe em branco para sem senha"
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
              <p className="text-[10px] text-slate-400 mt-1">Usado quando login com senha for ativado</p>
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={handleCancel}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X className="w-4 h-4" /> Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!form.name.trim()}
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

          return (
            <div
              key={profile.id}
              className={`bg-white border rounded-2xl p-4 flex items-center gap-4 transition-all ${
                profile.active ? 'border-slate-200' : 'border-slate-100 opacity-60'
              }`}
            >
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
                    <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full font-semibold">
                      Master
                    </span>
                  )}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${LEVEL_COLORS[profile.level]}`}>
                    {LEVEL_LABELS[profile.level]}
                  </span>
                  {!profile.active && (
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                      Inativo
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
                  <span>{profile.entityName}</span>
                  {profile.moduleAccess && (
                    <span className="text-slate-400">· {MODULE_OPTIONS.find(m => m.id === profile.moduleAccess)?.label ?? profile.moduleAccess}</span>
                  )}
                </div>
              </div>

              {/* Código */}
              <div className="text-xs font-mono text-slate-400 flex-shrink-0">#{profile.code}</div>

              {/* Ações */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleEdit(profile)}
                  className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                  title="Editar"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                {!isMaster && (
                  profile.active ? (
                    <button
                      onClick={() => updateProfile(profile.id, { active: false })}
                      className="p-2 rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                      title="Desativar"
                    >
                      <PowerOff className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => updateProfile(profile.id, { active: true })}
                      className="p-2 rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                      title="Ativar"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )
                )}

                {!isMaster && (
                  confirmDelete === profile.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { deleteProfile(profile.id); setConfirmDelete(null); }}
                        className="px-2 py-1 text-[10px] bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="px-2 py-1 text-[10px] bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(profile.id)}
                      className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                      title="Remover perfil"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Info de cobrança futura */}
      <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-500">
        <p className="font-semibold text-slate-700 mb-1">Sobre acessos</p>
        <p>
          Cada perfil ativo representa um acesso ao sistema. No futuro, o número de acessos ativos
          poderá impactar na cobrança conforme o plano contratado.
          Desative perfis não utilizados para manter o controle.
        </p>
        <div className="mt-3 flex gap-6 text-xs">
          <span>Total: <strong className="text-slate-700">{profiles.length}</strong></span>
          <span>Ativos: <strong className="text-emerald-600">{profiles.filter(p => p.active).length}</strong></span>
          <span>Inativos: <strong className="text-slate-500">{profiles.filter(p => !p.active).length}</strong></span>
        </div>
      </div>
    </div>
  );
}
