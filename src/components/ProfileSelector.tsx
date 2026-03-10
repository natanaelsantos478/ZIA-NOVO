// ─────────────────────────────────────────────────────────────────────────────
// ProfileSelector — Tela de login por seleção de perfil
// Suporte a senha: se o perfil tiver senha cadastrada, exige validação
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef, useEffect } from 'react';
import {
  Building2, Shield, Users, User, LogIn, ChevronRight, Layers,
  Lock, Eye, EyeOff, AlertCircle, ArrowLeft,
} from 'lucide-react';
import {
  useProfiles,
  LEVEL_LABELS,
  type OperatorProfile,
  type AccessLevel,
} from '../context/ProfileContext';
import { useCompanies, type CompanyType } from '../context/CompaniesContext';

const LEVEL_ICON: Record<AccessLevel, React.ElementType> = {
  1: Building2,
  2: Shield,
  3: Users,
  4: User,
};

const LEVEL_BG: Record<AccessLevel, string> = {
  1: 'bg-violet-600',
  2: 'bg-blue-600',
  3: 'bg-emerald-600',
  4: 'bg-slate-600',
};

const LEVEL_BADGE: Record<AccessLevel, string> = {
  1: 'bg-violet-500/20 text-violet-300 border border-violet-500/30',
  2: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  3: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  4: 'bg-slate-500/20 text-slate-300 border border-slate-500/30',
};

const LEVEL_SCOPE: Record<AccessLevel, string> = {
  1: 'Acesso total — holding + todas as matrizes e filiais',
  2: 'Acesso à matriz e suas filiais',
  3: 'Acesso exclusivo à filial',
  4: 'Acesso restrito ao módulo atribuído',
};

// Agrupa perfis por tipo de entidade
function groupProfiles(profiles: OperatorProfile[]) {
  const holding = profiles.filter(p => p.level === 1);
  const matrix  = profiles.filter(p => p.level === 2);
  const branch  = profiles.filter(p => p.level === 3);
  const staff   = profiles.filter(p => p.level === 4);
  return { holding, matrix, branch, staff };
}

export default function ProfileSelector() {
  const { profiles, setActiveProfile } = useProfiles();
  const { scopeIds } = useCompanies();
  const [selected, setSelected]       = useState<OperatorProfile | null>(null);
  const [step, setStep]               = useState<'select' | 'password'>('select');
  const [password, setPassword]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]             = useState('');
  const [shake, setShake]             = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  const active = profiles.filter(p => p.active);
  const groups = groupProfiles(active);

  useEffect(() => {
    if (step === 'password') {
      setTimeout(() => passwordRef.current?.focus(), 100);
    }
  }, [step]);

  function handleSelect(profile: OperatorProfile) {
    setSelected(profile);
    setError('');
    setPassword('');
    if (profile.password) {
      setStep('password');
    } else {
      const ids = scopeIds(profile.entityType as CompanyType, profile.entityId);
      setActiveProfile(profile, ids.length > 0 ? ids : [profile.entityId]);
    }
  }

  function handlePasswordSubmit() {
    if (!selected) return;
    if (selected.password && password !== selected.password) {
      setError('Senha incorreta. Tente novamente.');
      setShake(true);
      setPassword('');
      setTimeout(() => setShake(false), 500);
      return;
    }
    const ids = scopeIds(selected.entityType as CompanyType, selected.entityId);
    setActiveProfile(selected, ids.length > 0 ? ids : [selected.entityId]);
  }

  function handleBack() {
    setStep('select');
    setSelected(null);
    setPassword('');
    setError('');
  }

  // ── Tela de seleção de perfil ───────────────────────────────────────────────

  if (step === 'select') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">

          {/* Marca */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-indigo-500/30">
              <Layers className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">ZIA Omnisystem</h1>
            <p className="text-slate-400 mt-2 text-sm">Selecione seu perfil de acesso para entrar</p>
          </div>

          {active.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum perfil disponível.</p>
              <p className="text-xs mt-1">Acesse as configurações para criar perfis.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[65vh] overflow-y-auto custom-scrollbar pr-1">

              {/* Holding */}
              {groups.holding.length > 0 && (
                <ProfileGroup label="Gestor Holding" color="violet" profiles={groups.holding} onSelect={handleSelect} />
              )}

              {/* Matrizes */}
              {groups.matrix.length > 0 && (
                <ProfileGroup label="Gestores de Matriz" color="blue" profiles={groups.matrix} onSelect={handleSelect} />
              )}

              {/* Filiais */}
              {groups.branch.length > 0 && (
                <ProfileGroup label="Gestores de Filial" color="emerald" profiles={groups.branch} onSelect={handleSelect} />
              )}

              {/* Funcionários */}
              {groups.staff.length > 0 && (
                <ProfileGroup label="Funcionários" color="slate" profiles={groups.staff} onSelect={handleSelect} />
              )}
            </div>
          )}

          <p className="text-center text-xs text-slate-700 mt-6">
            Novos perfis são criados em Configurações → Perfis e Acessos
          </p>
        </div>
      </div>
    );
  }

  // ── Tela de senha ───────────────────────────────────────────────────────────

  const Icon = selected ? LEVEL_ICON[selected.level] : User;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-indigo-500/30">
            <Layers className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white">ZIA Omnisystem</h1>
        </div>

        <div className={`bg-slate-800/60 border border-slate-700 rounded-2xl p-6 ${shake ? 'animate-shake' : ''}`}>
          {/* Card do perfil selecionado */}
          <div className="flex items-center gap-3 mb-6 pb-5 border-b border-slate-700">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${LEVEL_BG[selected!.level]}`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white truncate">{selected!.name}</p>
              <p className="text-xs text-slate-400 truncate">{selected!.entityName}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{LEVEL_SCOPE[selected!.level]}</p>
            </div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${LEVEL_BADGE[selected!.level]}`}>
              {LEVEL_LABELS[selected!.level]}
            </span>
          </div>

          {/* Campo de senha */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1 mb-2">
              <Lock className="w-3 h-3" /> Senha de acesso
            </label>
            <div className="relative">
              <input
                ref={passwordRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handlePasswordSubmit()}
                placeholder="Digite a senha"
                className={`w-full bg-slate-900 border rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 pr-10 transition-colors ${
                  error ? 'border-red-500 focus:ring-red-500/30' : 'border-slate-700 focus:ring-indigo-500/40'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-red-400">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {error}
              </div>
            )}
          </div>

          {/* Ações */}
          <button
            onClick={handlePasswordSubmit}
            disabled={!password}
            className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogIn className="w-4 h-4" />
            Entrar
          </button>

          <button
            onClick={handleBack}
            className="w-full mt-3 py-2.5 rounded-xl text-sm text-slate-500 hover:text-slate-300 flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Trocar perfil
          </button>
        </div>

        <p className="text-center text-xs text-slate-700 mt-6">
          Código do perfil: <span className="font-mono">#{selected?.code}</span>
        </p>
      </div>
    </div>
  );
}

// ── Componente de grupo de perfis ─────────────────────────────────────────────

interface GroupProps {
  label: string;
  color: 'violet' | 'blue' | 'emerald' | 'slate';
  profiles: OperatorProfile[];
  onSelect: (p: OperatorProfile) => void;
}

const GROUP_HEADER: Record<string, string> = {
  violet:  'text-violet-400 border-violet-900/50',
  blue:    'text-blue-400 border-blue-900/50',
  emerald: 'text-emerald-400 border-emerald-900/50',
  slate:   'text-slate-400 border-slate-800',
};

function ProfileGroup({ label, color, profiles, onSelect }: GroupProps) {
  return (
    <div>
      <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 pb-1.5 border-b ${GROUP_HEADER[color]}`}>
        {label} · {profiles.length}
      </p>
      <div className="space-y-1.5">
        {profiles.map(profile => {
          const Icon = LEVEL_ICON[profile.level];
          const hasPassword = !!profile.password;
          return (
            <button
              key={profile.id}
              onClick={() => onSelect(profile)}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl border-2 border-slate-800 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800 text-left transition-all group"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${LEVEL_BG[profile.level]}`}>
                <Icon className="w-5 h-5 text-white" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white text-sm truncate">{profile.name}</span>
                  {hasPassword && (
                    <span title="Protegido por senha">
                      <Lock className="w-3 h-3 text-slate-500 flex-shrink-0" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 truncate mt-0.5">{profile.entityName}</p>
                <p className="text-[10px] text-slate-600 mt-0.5">{LEVEL_SCOPE[profile.level]}</p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[10px] font-mono text-slate-600">#{profile.code}</span>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
