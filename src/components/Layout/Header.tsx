import { useState } from 'react';
import { Settings, User, LogOut, LayoutGrid, Bell, Building2, ChevronDown, ArrowLeftRight } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const HEADER_BG: Record<string, string> = {
  indigo: 'bg-indigo-600',
  purple: 'bg-purple-600',
  blue:   'bg-blue-600',
};

export default function Header() {
  const { config, orgContexto, clearOrg } = useAppContext();
  const [profileOpen, setProfileOpen] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const headerBg = HEADER_BG[config.primaryColor] ?? HEADER_BG.indigo;

  const { holding, matriz, filial } = orgContexto;

  return (
    <header className={`h-16 ${headerBg} text-white flex items-center justify-between px-6 shadow-md z-50 relative shrink-0`}>
      {/* Esquerda: Logo */}
      <div className="flex items-center space-x-4">
        <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm">
          <LayoutGrid className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight">ZIA mind</h1>
          <p className="text-[10px] text-white/70 uppercase tracking-widest font-semibold">Enterprise System</p>
        </div>
      </div>

      {/* Centro: Empresa selecionada */}
      {filial && (
        <div className="relative">
          <button
            onClick={() => setCompanyOpen(!companyOpen)}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl px-4 py-2 transition-all"
          >
            <Building2 className="w-4 h-4 text-white/80" />
            <div className="text-left">
              <p className="text-xs font-bold text-white leading-none">{filial.nome_fantasia}</p>
              {(holding || matriz) && (
                <p className="text-[10px] text-white/60 leading-none mt-0.5">
                  {[holding?.nome, matriz?.nome].filter(Boolean).join(' › ')}
                </p>
              )}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-white/60" />
          </button>

          {companyOpen && (
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150 origin-top">
              <div className="p-4 bg-slate-50 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Contexto atual</p>
                {holding && (
                  <div className="flex items-center gap-2 text-xs text-slate-600 mb-1">
                    <span className="w-14 text-right font-medium text-slate-400 shrink-0">Holding</span>
                    <span className="text-slate-700 font-semibold">{holding.nome}</span>
                  </div>
                )}
                {matriz && (
                  <div className="flex items-center gap-2 text-xs text-slate-600 mb-1">
                    <span className="w-14 text-right font-medium text-slate-400 shrink-0">Matriz</span>
                    <span className="text-slate-700 font-semibold">{matriz.nome}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="w-14 text-right font-medium text-slate-400 shrink-0">Filial</span>
                  <span className="text-indigo-700 font-bold">{filial.nome_fantasia}</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">CNPJ: {filial.cnpj}</p>
              </div>
              <div className="p-2">
                <button
                  onClick={() => { clearOrg(); setCompanyOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors font-medium"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  Trocar empresa
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Direita: Ações */}
      <div className="flex items-center space-x-4">
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
              <p className="text-[10px] text-white/60 leading-none mt-0.5">
                {filial?.nome_fantasia ?? 'Global'}
              </p>
            </div>
          </button>

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
                  <Settings className="w-4 h-4 mr-3" /> Configurações
                </button>
                <button
                  onClick={() => { clearOrg(); setProfileOpen(false); }}
                  className="w-full flex items-center px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition-colors"
                >
                  <ArrowLeftRight className="w-4 h-4 mr-3" /> Trocar empresa
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
