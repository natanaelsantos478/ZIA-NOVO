import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings, LogOut, LayoutGrid, Bell, RefreshCw,
  Building2, Shield, Users, User, UserCog,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useProfiles, LEVEL_LABELS, type AccessLevel } from '../../context/ProfileContext';

const HEADER_BG: Record<string, string> = {
  indigo: 'bg-indigo-600',
  purple: 'bg-purple-600',
  blue:   'bg-blue-600',
};

const LEVEL_ICON: Record<AccessLevel, React.ElementType> = {
  1: Building2,
  2: Shield,
  3: Users,
  4: User,
};

export default function Header() {
  const { config } = useAppContext();
  const { activeProfile, setActiveProfile } = useProfiles();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const headerBg = HEADER_BG[config.primaryColor] ?? HEADER_BG.indigo;

  const ProfileIcon = activeProfile ? LEVEL_ICON[activeProfile.level] : User;
  const initials = activeProfile
    ? activeProfile.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'ZIA';

  function handleSwitchProfile() {
    setProfileOpen(false);
    setActiveProfile(null);
  }

  function goToSettings(section?: string) {
    setProfileOpen(false);
    navigate(section ? `/app/settings?s=${section}` : '/app/settings');
  }

  return (
    <header className={`h-16 ${headerBg} text-white flex items-center justify-between px-6 shadow-md z-50 relative shrink-0`}>
      {/* Esquerda: Logo/Identidade */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/app')}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm">
            <LayoutGrid className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">{config.companyName}</h1>
            <p className="text-[10px] text-white/70 uppercase tracking-widest font-semibold">Enterprise System</p>
          </div>
        </button>
      </div>

      {/* Direita: Ações */}
      <div className="flex items-center space-x-4">
        <button className="p-2 rounded-full hover:bg-white/10 transition-colors relative">
          <Bell className="w-5 h-5 text-white/90" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white" />
        </button>

        {/* Botão de Configurações — navega para /app/settings */}
        <button
          onClick={() => goToSettings()}
          title="Configurações"
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <Settings className="w-5 h-5 text-white/90" />
        </button>

        {/* Perfil ativo */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center space-x-3 bg-white/10 px-3 py-1.5 rounded-full hover:bg-white/20 transition-all border border-white/10"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-400 to-pink-400 flex items-center justify-center shadow-inner border-2 border-white/20">
              <span className="font-bold text-xs text-white">{initials}</span>
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-bold leading-none">
                {activeProfile?.name ?? 'Sem perfil'}
              </p>
              <p className="text-[10px] text-white/60 leading-none mt-0.5">
                {activeProfile ? LEVEL_LABELS[activeProfile.level] : '—'}
              </p>
            </div>
          </button>

          {/* Menu Dropdown */}
          {profileOpen && (
            <>
              {/* overlay para fechar */}
              <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />

              <div className="absolute right-0 mt-3 w-60 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50">
                {/* Card do perfil ativo */}
                {activeProfile && (
                  <div className="p-4 border-b border-slate-100 bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                        <ProfileIcon className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{activeProfile.name}</p>
                        <p className="text-[10px] text-slate-500">{LEVEL_LABELS[activeProfile.level]}</p>
                        <p className="text-[10px] font-mono text-slate-400">#{activeProfile.code}</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2 truncate">{activeProfile.entityName}</p>
                  </div>
                )}

                {/* Links rápidos */}
                <div className="p-1.5">
                  <button
                    onClick={() => goToSettings('users')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl transition-colors"
                  >
                    <UserCog className="w-4 h-4 text-indigo-500" />
                    <span>Gerenciar Perfis</span>
                    <span className="ml-auto text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-medium">
                      Config
                    </span>
                  </button>
                  <button
                    onClick={() => goToSettings('empresas')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-colors"
                  >
                    <Building2 className="w-4 h-4 text-emerald-500" />
                    <span>Empresas e Filiais</span>
                    <span className="ml-auto text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full font-medium">
                      Config
                    </span>
                  </button>
                  <button
                    onClick={() => goToSettings()}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-xl transition-colors"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>Configurações</span>
                  </button>
                </div>

                {/* Trocar perfil / Sair */}
                <div className="border-t border-slate-100 p-1.5 space-y-0.5">
                  <button
                    onClick={handleSwitchProfile}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-amber-700 hover:bg-amber-50 rounded-xl transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Trocar perfil
                  </button>
                  <button
                    onClick={handleSwitchProfile}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sair
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
