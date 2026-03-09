import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings, User, LogOut, LayoutGrid, Bell,
  Crown, Building2, Store, ChevronDown,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

const HEADER_BG: Record<string, string> = {
  indigo: 'bg-indigo-600',
  purple: 'bg-purple-600',
  blue:   'bg-blue-600',
};

const NIVEL_ICON: Record<number, React.ReactNode> = {
  1: <Crown    className="w-3 h-3 text-amber-300" />,
  2: <Building2 className="w-3 h-3 text-blue-300" />,
  3: <Store    className="w-3 h-3 text-emerald-300" />,
  4: <User     className="w-3 h-3 text-slate-300" />,
};

export default function Header() {
  const { config } = useAppContext();
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);

  const headerBg = HEADER_BG[config.primaryColor] ?? HEADER_BG.indigo;

  const usuario      = session?.usuario;
  const empresaAtiva = session?.empresaAtiva;

  // Iniciais do nome
  const iniciais = usuario
    ? usuario.nome.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()
    : 'ZA';

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  function handleTrocarEmpresa() {
    setProfileOpen(false);
    if (usuario) {
      // Recarrega entidades e vai para seleção
      navigate('/selecionar-empresa', { state: { usuario } });
    }
  }

  return (
    <header className={`h-16 ${headerBg} text-white flex items-center justify-between px-6 shadow-md z-50 relative shrink-0`}>
      {/* Esquerda: Logo + empresa ativa */}
      <div className="flex items-center space-x-4">
        <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm">
          <LayoutGrid className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight leading-none">
            {empresaAtiva?.nome ?? config.companyName}
          </h1>
          <p className="text-[10px] text-white/70 uppercase tracking-widest font-semibold mt-0.5">
            ZIA Omnisystem
          </p>
        </div>
      </div>

      {/* Direita */}
      <div className="flex items-center space-x-4">
        <button className="p-2 rounded-full hover:bg-white/10 transition-colors relative">
          <Bell className="w-5 h-5 text-white/90" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white" />
        </button>

        <button
          onClick={() => navigate('/app/settings')}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <Settings className="w-5 h-5 text-white/90" />
        </button>

        {/* Perfil */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center space-x-2.5 bg-white/10 px-3 py-1.5 rounded-full hover:bg-white/20 transition-all border border-white/10"
          >
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-400 to-pink-400 flex items-center justify-center shadow-inner border-2 border-white/20 shrink-0">
              <span className="font-bold text-xs text-white">{iniciais}</span>
            </div>

            {/* Info */}
            <div className="hidden md:block text-left">
              <p className="text-xs font-bold leading-none">{usuario?.nome ?? 'Usuário'}</p>
              <div className="flex items-center gap-1 mt-0.5">
                {usuario && NIVEL_ICON[usuario.nivel]}
                <p className="text-[10px] text-white/60 leading-none">
                  {empresaAtiva?.tipo === 'filial'  ? 'Filial'
                 : empresaAtiva?.tipo === 'matriz'  ? 'Matriz'
                 : empresaAtiva?.tipo === 'holding' ? 'Holding'
                 : 'Global'}
                </p>
              </div>
            </div>
            <ChevronDown className="w-3 h-3 text-white/60 hidden md:block" />
          </button>

          {/* Dropdown */}
          {profileOpen && (
            <div
              className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right z-50"
              onMouseLeave={() => setProfileOpen(false)}
            >
              {/* Info do usuário */}
              <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                <p className="text-sm font-bold text-slate-800">{usuario?.nome ?? 'Usuário'}</p>
                <p className="text-xs text-slate-500">Código #{usuario?.codigo}</p>
                {empresaAtiva && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <p className="text-xs text-slate-500 truncate">{empresaAtiva.nome}</p>
                  </div>
                )}
              </div>

              <div className="p-1">
                <button
                  onClick={handleTrocarEmpresa}
                  className="w-full flex items-center px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors"
                >
                  <Building2 className="w-4 h-4 mr-3" /> Trocar empresa
                </button>
                <button
                  onClick={() => { setProfileOpen(false); navigate('/app/settings'); }}
                  className="w-full flex items-center px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors"
                >
                  <Settings className="w-4 h-4 mr-3" /> Configurações
                </button>
              </div>

              <div className="border-t border-slate-100 p-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                >
                  <LogOut className="w-4 h-4 mr-3" /> Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
