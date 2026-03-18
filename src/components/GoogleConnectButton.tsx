import { useState } from 'react'
import { CheckCircle2, LogOut, AlertCircle, Loader2 } from 'lucide-react'

interface GoogleConnectButtonProps {
  isConnected:  boolean
  email:        string | null
  isConnecting: boolean
  error:        string | null
  onConnect:    () => void
  onDisconnect: () => void
}

// Ícone SVG do Google (sem dependência de lib)
function GoogleIcon() {
  return (
    <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

export default function GoogleConnectButton({
  isConnected, email, isConnecting, error, onConnect, onDisconnect,
}: GoogleConnectButtonProps) {
  const [showMenu, setShowMenu] = useState(false)

  if (isConnected && email) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowMenu(o => !o)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-900/30 border border-emerald-700/40 text-emerald-400 text-xs hover:bg-emerald-900/50 transition-colors"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Google</span>
        </button>

        {showMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            <div className="absolute top-full right-0 mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl py-1 z-50 min-w-[210px]">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700">
                <GoogleIcon />
                <p className="text-xs text-slate-300 truncate">{email}</p>
              </div>
              <div className="px-3 py-2 space-y-1">
                {['Calendar', 'Sheets', 'Gmail', 'Docs', 'Slides', 'Contatos'].map(api => (
                  <div key={api} className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">{api}</span>
                    <span className="text-emerald-400 font-medium">Ativo</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => { onDisconnect(); setShowMenu(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-900/20 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Desconectar Google
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {error && !isConnecting && (
        <div className="flex items-center gap-1 text-xs text-red-400 max-w-[180px]">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{error}</span>
        </div>
      )}
      <button
        onClick={onConnect}
        disabled={isConnecting}
        title="Conectar conta Google para usar Calendar, Sheets, Gmail, Docs, Slides e Contatos"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-700/60 border border-slate-600/50 text-slate-300 text-xs hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isConnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GoogleIcon />}
        <span>{isConnecting ? 'Aguardando...' : 'Conectar Google'}</span>
      </button>
    </div>
  )
}
