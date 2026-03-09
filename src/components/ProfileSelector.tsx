// ─────────────────────────────────────────────────────────────────────────────
// ProfileSelector — Tela de seleção de perfil (entrada no sistema)
// Sem senha por enquanto — apenas painel de escolha
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import {
  Building2, Shield, Users, User, LogIn, ChevronRight, Layers,
} from 'lucide-react';
import {
  useProfiles,
  LEVEL_LABELS,
  type OperatorProfile,
  type AccessLevel,
} from '../context/ProfileContext';

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

export default function ProfileSelector() {
  const { profiles, setActiveProfile } = useProfiles();
  const [selected, setSelected] = useState<OperatorProfile | null>(null);

  const active = profiles.filter(p => p.active);

  function handleEnter() {
    if (!selected) return;
    setActiveProfile(selected);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-xl">

        {/* Marca */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-indigo-500/30">
            <Layers className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">ZIA Omnisystem</h1>
          <p className="text-slate-400 mt-2 text-sm">Selecione seu perfil de acesso</p>
        </div>

        {/* Lista de perfis */}
        {active.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum perfil disponível</p>
          </div>
        ) : (
          <div className="space-y-2 mb-6 max-h-96 overflow-y-auto custom-scrollbar pr-1">
            {active.map((profile) => {
              const Icon = LEVEL_ICON[profile.level];
              const isSelected = selected?.id === profile.id;

              return (
                <button
                  key={profile.id}
                  onClick={() => setSelected(isSelected ? null : profile)}
                  className={`
                    w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all
                    ${isSelected
                      ? 'border-indigo-500 bg-indigo-500/10 shadow-lg'
                      : 'border-slate-800 bg-slate-800/50 hover:border-slate-700 hover:bg-slate-800'
                    }
                  `}
                >
                  {/* Avatar */}
                  <div className={`
                    w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0
                    ${isSelected ? 'bg-indigo-600' : LEVEL_BG[profile.level]}
                  `}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white text-sm">{profile.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${LEVEL_BADGE[profile.level]}`}>
                        {LEVEL_LABELS[profile.level]}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 truncate">{profile.entityName}</div>
                  </div>

                  {/* Código + indicador de seleção */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] font-mono text-slate-600">#{profile.code}</span>
                    {isSelected && (
                      <div className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                        <ChevronRight className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Botão de entrada */}
        <button
          disabled={!selected}
          onClick={handleEnter}
          className={`
            w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all
            ${selected
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl shadow-indigo-500/25'
              : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
            }
          `}
        >
          <LogIn className="w-4 h-4" />
          {selected ? `Entrar como ${selected.name}` : 'Selecione um perfil para entrar'}
        </button>

        <p className="text-center text-xs text-slate-700 mt-6">
          Novos perfis são criados em Configurações → Perfis e Acessos
        </p>
      </div>
    </div>
  );
}
