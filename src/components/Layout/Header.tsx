import { useState } from 'react';
import { Settings, User, LogOut, LayoutGrid, Bell } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

// Static map — Tailwind requires complete class strings to include them in the build
const HEADER_BG: Record<string, string> = {
  indigo: 'bg-indigo-600',
  purple: 'bg-purple-600',
  blue:   'bg-blue-600',
};

export default function Header() {
  const { config } = useAppContext();
  const [profileOpen, setProfileOpen] = useState(false);
  const headerBg = HEADER_BG[config.primaryColor] ?? HEADER_BG.indigo;

  return (
    <header className={`h-16 ${headerBg} text-white flex items-center justify-between px-6 shadow-md z-50 relative shrink-0`}>
      {/* Esquerda: Logo/Identidade */}
      <div className="flex items-center space-x-4">
        <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm">
          <LayoutGrid className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight">{config.companyName}</h1>
          <p className="text-[10px] text-white/70 uppercase tracking-widest font-semibold">Enterprise System</p>
        </div>
      </div>

      {/* Direita: Ações */}
      <div className="flex items-center space-x-6">
        <button className="p-2 rounded-full hover:bg-white/10 transition-colors relative">
          <Bell className="w-5 h-5 text-white/90" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>

        <button className="p-2 rounded-full hover:bg-white/10 transition-colors">
          <Settings className="w-5 h-5 text-white/90" />
        </button>

        {/* Perfil */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center space-x-3 bg-white/10 px-3 py-1.5 rounded-full hover:bg-white/20 transition-all border border-white/10"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-400 to-pink-400 flex items-center justify-center shadow-inner border-2 border-white/20">
              <span className="font-bold text-xs text-white">AD</span>
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-bold leading-none">Admin</p>
              <p className="text-[10px] text-white/60 leading-none mt-0.5">Global</p>
            </div>
          </button>

          {/* Menu Dropdown */}
          {profileOpen && (
            <div className="absolute right-0 mt-3 w-48 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right z-50">
              <div className="p-4 border-b border-slate-50 bg-slate-50/50">
                <p className="text-sm font-bold text-slate-800">Minha Conta</p>
                <p className="text-xs text-slate-500">admin@zia.system</p>
              </div>
              <div className="p-1">
                <button className="w-full flex items-center px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors">
                  <User className="w-4 h-4 mr-3" /> Editar Login
                </button>
                <button className="w-full flex items-center px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors">
                  <Settings className="w-4 h-4 mr-3" /> Editar Loja
                </button>
              </div>
              <div className="border-t border-slate-50 p-1">
                <button className="w-full flex items-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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
