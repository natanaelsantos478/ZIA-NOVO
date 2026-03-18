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
    <aside className="w-48 flex-shrink-0 bg-gray-50 border-r border-gray-200 flex flex-col overflow-hidden">
      {/* Logo / título */}
      <div className="px-4 py-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center flex-shrink-0">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <span className="text-gray-900 font-bold text-sm">ZIA mind</span>
        </div>
        <p className="text-gray-500 text-[10px] mt-1 leading-tight">Assistente inteligente do ERP</p>
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
                  ? 'bg-violet-50 text-violet-700 border border-violet-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-violet-600' : 'text-gray-400'}`} />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200">
        <p className="text-gray-400 text-[10px] text-center">
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
    <div className="flex h-screen bg-white overflow-hidden">
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
