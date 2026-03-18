import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { MessageSquare, Search, Bot, Settings } from 'lucide-react'
import ChatView from './views/ChatView'
import ProspeccaoView from './views/ProspeccaoView'
import AgentesView from './views/AgentesView'
import ConfigIAView from './views/ConfigIAView'

type View = 'chat' | 'prospeccao' | 'agentes' | 'config'

const NAV_ITEMS: { id: View; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'chat',       label: 'Chat',       icon: MessageSquare },
  { id: 'prospeccao', label: 'Prospecção', icon: Search },
  { id: 'agentes',    label: 'Agentes',    icon: Bot },
  { id: 'config',     label: 'Config IA',  icon: Settings },
]

function IASidebar({
  viewAtiva,
  onChange,
}: {
  viewAtiva: View
  onChange: (v: View) => void
}) {
  return (
    <aside className="w-48 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col overflow-hidden">
      {/* Logo / título */}
      <div className="px-4 py-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center flex-shrink-0">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-sm">ZIA mind</span>
        </div>
        <p className="text-slate-500 text-[10px] mt-1 leading-tight">Assistente inteligente do ERP</p>
      </div>

      {/* Navegação */}
      <nav className="flex-1 p-2 space-y-0.5">
        {NAV_ITEMS.map(item => {
          const isActive = viewAtiva === item.id
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                isActive
                  ? 'bg-violet-600/20 text-violet-300 border border-violet-700/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-violet-400' : ''}`} />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-slate-800">
        <p className="text-slate-600 text-[10px] text-center">
          Powered by Gemini
        </p>
      </div>
    </aside>
  )
}

export default function IAPage() {
  const { conversaId } = useParams<{ conversaId?: string }>()
  const [viewAtiva, setViewAtiva] = useState<View>('chat')

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Sidebar de navegação da IA */}
      <IASidebar viewAtiva={viewAtiva} onChange={setViewAtiva} />

      {/* Área de conteúdo principal */}
      <main className="flex-1 overflow-hidden">
        {viewAtiva === 'chat'       && <ChatView conversaId={conversaId} />}
        {viewAtiva === 'prospeccao' && <ProspeccaoView />}
        {viewAtiva === 'agentes'    && <AgentesView />}
        {viewAtiva === 'config'     && <ConfigIAView />}
      </main>
    </div>
  )
}
