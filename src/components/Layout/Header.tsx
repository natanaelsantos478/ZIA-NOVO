import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings, LogOut, LayoutGrid, Bell, RefreshCw,
  Building2, Shield, Users, User, UserCog, ChevronDown, Menu,
  AlertTriangle, X, CheckCheck, Trash2,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useProfiles, LEVEL_LABELS, useScope, type AccessLevel } from '../../context/ProfileContext';
import { useCompanies } from '../../context/CompaniesContext';
import { limparTokenIA } from '../../hooks/useZitaIA';
import { useAlerts, type Level1Alert } from '../../context/AlertContext';

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

const SCOPE_BADGE: Record<AccessLevel, string> = {
  1: 'bg-violet-500/20 text-violet-200 border-violet-400/30',
  2: 'bg-blue-500/20 text-blue-200 border-blue-400/30',
  3: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30',
  4: 'bg-slate-500/20 text-slate-300 border-slate-400/30',
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `${m}min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

function AlertPanel({ onClose }: { onClose: () => void }) {
  const { alerts, unreadCount, markRead, markAllRead, clearAll } = useAlerts();

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 mt-3 w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50">
        {/* Header */}
        <div className="px-4 py-3 bg-red-600 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-white" />
            <span className="text-sm font-bold text-white">Alertas Nível 1</span>
            {unreadCount > 0 && (
              <span className="bg-white text-red-600 text-[11px] font-bold px-1.5 py-0.5 rounded-full">
                {unreadCount} novo{unreadCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                title="Marcar todos como lidos"
                className="p-1 rounded hover:bg-red-500 text-white/80 hover:text-white transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
              </button>
            )}
            {alerts.length > 0 && (
              <button
                onClick={clearAll}
                title="Limpar todos"
                className="p-1 rounded hover:bg-red-500 text-white/80 hover:text-white transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button onClick={onClose} className="p-1 rounded hover:bg-red-500 text-white/80 hover:text-white transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Lista */}
        <div className="max-h-96 overflow-y-auto custom-scrollbar">
          {alerts.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm">
              Nenhum alerta no momento
            </div>
          ) : (
            alerts.map((a: Level1Alert) => (
              <button
                key={a.id}
                onClick={() => markRead(a.id)}
                className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${a.read ? '' : 'bg-red-50'}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${a.read ? 'bg-slate-300' : 'bg-red-500'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">
                        Nível 1
                      </span>
                      <span className="text-[11px] text-slate-400">{relativeTime(a.createdAt)}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800 truncate">{a.dealName}</p>
                    <p className="text-[12px] text-slate-600 mt-0.5">
                      Negociação com <strong>{a.probability}%</strong> de fechamento sendo perdida
                    </p>
                    {a.observacoes && (
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{a.observacoes}</p>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {alerts.length > 0 && (
          <div className="px-4 py-2 bg-slate-50 text-[11px] text-slate-400 text-center border-t border-slate-100">
            {alerts.length} alerta{alerts.length > 1 ? 's' : ''} · Apenas para perfil Gestor
          </div>
        )}
      </div>
    </>
  );
}

export default function Header({ onMenuClick }: { onMenuClick?: () => void } = {}) {
  const { config } = useAppContext();
  const { activeProfile, setActiveProfile } = useProfiles();
  const { setHoldingScope } = useCompanies();
  const scope = useScope();
  const navigate = useNavigate();
  const { unreadCount } = useAlerts();
  const [profileOpen, setProfileOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const headerBg = HEADER_BG[config.primaryColor] ?? HEADER_BG.indigo;

  const ProfileIcon = activeProfile ? LEVEL_ICON[activeProfile.level] : User;
  const initials = activeProfile
    ? activeProfile.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'ZIA';

  function handleSwitchProfile() {
    setProfileOpen(false);
    setHoldingScope(null);
    setActiveProfile(null);
    limparTokenIA();
  }

  function goToSettings(section?: string) {
    setProfileOpen(false);
    navigate(section ? `/app/settings?s=${section}` : '/app/settings');
  }

  return (
    <header className={`h-16 ${headerBg} text-white flex items-center justify-between px-4 md:px-6 shadow-md z-50 relative shrink-0`}>
      {/* Esquerda: Logo/Identidade */}
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors shrink-0"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5 text-white" />
          </button>
        )}
        <button
          onClick={() => navigate('/app')}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm">
            <LayoutGrid className="w-6 h-6 text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold tracking-tight">{config.companyName}</h1>
            <p className="text-[10px] text-white/70 uppercase tracking-widest font-semibold">Enterprise System</p>
          </div>
        </button>

        {activeProfile && scope.level && (
          <div className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium ${SCOPE_BADGE[scope.level]}`}>
            <ProfileIcon className="w-3 h-3" />
            <span className="max-w-[160px] truncate">{scope.entityName}</span>
            <span className="opacity-60">·</span>
            <span className="opacity-70">{LEVEL_LABELS[scope.level]}</span>
          </div>
        )}
      </div>

      {/* Direita: Ações */}
      <div className="flex items-center space-x-4">
        {/* Sino de alertas */}
        <div className="relative">
          <button
            onClick={() => { setAlertsOpen(!alertsOpen); setProfileOpen(false); }}
            className="p-2 rounded-full hover:bg-white/10 transition-colors relative"
            title="Alertas Nível 1"
          >
            <Bell className="w-5 h-5 text-white/90" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white px-0.5">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {alertsOpen && <AlertPanel onClose={() => setAlertsOpen(false)} />}
        </div>

        {/* Configurações */}
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
            onClick={() => { setProfileOpen(!profileOpen); setAlertsOpen(false); }}
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
            <ChevronDown className={`w-3.5 h-3.5 text-white/50 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Menu Dropdown */}
          {profileOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
              <div className="absolute right-0 mt-3 w-60 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50">
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
