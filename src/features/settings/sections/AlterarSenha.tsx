// ─────────────────────────────────────────────────────────────────────────────
// Alterar Senha — Módulo de segurança
// Permite alterar a senha de qualquer perfil da empresa
// Acesso admin (do painel Zitasoftware) pode alterar sem autenticação prévia
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import {
  Lock, Eye, EyeOff, Check, AlertCircle, Shield, User,
  Users, Building2, ChevronDown, Search, KeyRound, RefreshCw,
} from 'lucide-react';
import {
  useProfiles,
  LEVEL_LABELS,
  LEVEL_COLORS,
  type OperatorProfile,
  type AccessLevel,
} from '../../../context/ProfileContext';
import { useCompanies, type CompanyType } from '../../../context/CompaniesContext';

const LEVEL_ICON: Record<AccessLevel, React.ElementType> = {
  1: Building2,
  2: Shield,
  3: Users,
  4: User,
};

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-sm text-white ${ok ? 'bg-green-600' : 'bg-red-600'}`}>
      {ok ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />} {msg}
    </div>
  );
}

interface SenhaFormProps {
  profile: OperatorProfile;
  onSave: (id: string, novaSenha: string | undefined) => Promise<void>;
  onCancel: () => void;
}

function SenhaForm({ profile, onSave, onCancel }: SenhaFormProps) {
  const [novaSenha, setNovaSenha]         = useState('');
  const [confirmar, setConfirmar]         = useState('');
  const [showNova, setShowNova]           = useState(false);
  const [showConf, setShowConf]           = useState(false);
  const [saving, setSaving]               = useState(false);
  const [err, setErr]                     = useState('');

  const senhaOk = novaSenha.length >= 4;
  const match   = novaSenha === confirmar;

  async function handle() {
    if (!senhaOk || !match) return;
    setSaving(true);
    try {
      await onSave(profile.id, novaSenha || undefined);
    } finally { setSaving(false); }
  }

  async function handleRemover() {
    setSaving(true);
    try { await onSave(profile.id, undefined); }
    finally { setSaving(false); }
  }

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
        {(() => { const Icon = LEVEL_ICON[profile.level]; return (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${profile.level === 1 ? 'bg-violet-100' : profile.level === 2 ? 'bg-blue-100' : profile.level === 3 ? 'bg-emerald-100' : 'bg-slate-100'}`}>
            <Icon className={`w-5 h-5 ${profile.level === 1 ? 'text-violet-600' : profile.level === 2 ? 'text-blue-600' : profile.level === 3 ? 'text-emerald-600' : 'text-slate-600'}`} />
          </div>
        )})()}
        <div>
          <p className="font-bold text-slate-900 text-sm">{profile.name}</p>
          <p className="text-xs text-slate-500">{profile.entityName} · {LEVEL_LABELS[profile.level]}</p>
        </div>
        <span className={`ml-auto text-[10px] font-mono text-slate-400`}>#{profile.code}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Nova Senha *</label>
          <div className="relative">
            <input
              autoFocus
              type={showNova ? 'text' : 'password'}
              value={novaSenha}
              onChange={e => { setNovaSenha(e.target.value); setErr(''); }}
              placeholder="Mínimo 4 caracteres"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 pr-10"
            />
            <button type="button" onClick={() => setShowNova(v => !v)}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
              {showNova ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Confirmar Senha *</label>
          <div className="relative">
            <input
              type={showConf ? 'text' : 'password'}
              value={confirmar}
              onChange={e => { setConfirmar(e.target.value); setErr(''); }}
              placeholder="Repita a senha"
              className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 pr-10 ${confirmar && !match ? 'border-red-300 focus:ring-red-300' : 'border-slate-200 focus:ring-slate-400'}`}
            />
            <button type="button" onClick={() => setShowConf(v => !v)}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600">
              {showConf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {confirmar && !match && (
            <p className="text-xs text-red-500 mt-1">As senhas não coincidem</p>
          )}
        </div>
      </div>

      {err && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />{err}
        </div>
      )}

      <div className="flex items-center gap-2 pt-2">
        {profile.password && (
          <button onClick={handleRemover} disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-xl border border-red-200 transition-colors">
            <Lock className="w-3.5 h-3.5" /> Remover Senha
          </button>
        )}
        <div className="flex-1" />
        <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">
          Cancelar
        </button>
        <button
          onClick={handle}
          disabled={!senhaOk || !match || saving}
          className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-sm font-semibold"
        >
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Salvar Senha
        </button>
      </div>
    </div>
  );
}

export default function AlterarSenha() {
  const { profiles: allProfiles, activeProfile, updateProfile } = useProfiles();
  const { scopeIds } = useCompanies();

  const profiles = activeProfile
    ? allProfiles.filter(p => {
        const ids = scopeIds(activeProfile.entityType as CompanyType, activeProfile.entityId);
        return ids.includes(p.entityId);
      })
    : allProfiles;
  const [search, setSearch]         = useState('');
  const [editId, setEditId]         = useState<string | null>(null);
  const [toast, setToast]           = useState<{ msg: string; ok: boolean } | null>(null);
  const [filtroNivel, setFiltroNivel] = useState<string>('todos');

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok }); setTimeout(() => setToast(null), 3000);
  }

  async function handleSaveSenha(id: string, novaSenha: string | undefined) {
    try {
      await updateProfile(id, { password: novaSenha });
      setEditId(null);
      showToast(novaSenha ? 'Senha atualizada com sucesso!' : 'Senha removida.', true);
    } catch {
      showToast('Erro ao atualizar senha.', false);
    }
  }

  const filtered = profiles.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.code.includes(search);
    const matchNivel  = filtroNivel === 'todos' || String(p.level) === filtroNivel;
    return matchSearch && matchNivel;
  });

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {toast && <Toast {...toast} />}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Alterar Senhas</h2>
        </div>
        <p className="text-sm text-slate-500 ml-12">
          Gerencie as senhas de acesso de todos os perfis da empresa. O login é feito pelo código do perfil.
        </p>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-blue-700">
        <p className="font-semibold mb-0.5 flex items-center gap-1.5">
          <Lock className="w-4 h-4" /> Como funciona o login
        </p>
        <p className="text-xs text-blue-600">
          O login é feito pelo <strong>código do perfil</strong> (ex: 00001) + senha.
          Perfis sem senha entram automaticamente ao selecionar o código.
          O acesso admin usa <strong>Zitasoftware</strong> como login.
        </p>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar perfil..."
            className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>
        <div className="relative">
          <select
            value={filtroNivel}
            onChange={e => setFiltroNivel(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            <option value="todos">Todos os níveis</option>
            <option value="1">Holding</option>
            <option value="2">Matriz</option>
            <option value="3">Filial</option>
            <option value="4">Funcionário</option>
          </select>
          <ChevronDown className="w-4 h-4 absolute right-2.5 top-2.5 text-slate-400 pointer-events-none" />
        </div>
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} perfil(is)</span>
      </div>

      {/* Lista de perfis */}
      <div className="space-y-2">
        {filtered.map(profile => {
          const Icon    = LEVEL_ICON[profile.level];
          const isEdit  = editId === profile.id;

          return (
            <div key={profile.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              {/* Row */}
              <div className="flex items-center gap-4 p-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${profile.level === 1 ? 'bg-violet-100' : profile.level === 2 ? 'bg-blue-100' : profile.level === 3 ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                  <Icon className={`w-5 h-5 ${profile.level === 1 ? 'text-violet-600' : profile.level === 2 ? 'text-blue-600' : profile.level === 3 ? 'text-emerald-600' : 'text-slate-600'}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 text-sm">{profile.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${LEVEL_COLORS[profile.level]}`}>
                      {LEVEL_LABELS[profile.level]}
                    </span>
                    {profile.password ? (
                      <span className="flex items-center gap-1 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                        <Lock className="w-2.5 h-2.5" /> Com senha
                      </span>
                    ) : (
                      <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">
                        Sem senha
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {profile.entityName} · Login: <span className="font-mono font-bold text-slate-600">#{profile.code}</span>
                  </p>
                </div>

                <button
                  onClick={() => setEditId(isEdit ? null : profile.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${isEdit ? 'border-slate-300 bg-slate-100 text-slate-600' : 'border-slate-200 hover:border-slate-800 hover:bg-slate-800 hover:text-white text-slate-600'}`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  {isEdit ? 'Fechar' : profile.password ? 'Alterar Senha' : 'Definir Senha'}
                </button>
              </div>

              {/* Form de senha */}
              {isEdit && (
                <div className="border-t border-slate-100 p-4">
                  <SenhaForm
                    profile={profile}
                    onSave={handleSaveSenha}
                    onCancel={() => setEditId(null)}
                  />
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Nenhum perfil encontrado.</p>
          </div>
        )}
      </div>
    </div>
  );
}
