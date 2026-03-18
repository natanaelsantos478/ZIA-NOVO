import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, X, Bot } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useConversas } from '../hooks/useConversas'
import ConversasSidebar from '../components/ConversasSidebar'
import ChatArea from '../components/ChatArea'
import type { Agente } from '../types'

const TENANT_ID = '00000000-0000-0000-0000-000000000001'
const ZIA_GERAL_ID = 'b697ce6c-8ea0-4268-bf73-7e690a296f68'

interface ChatViewProps {
  conversaId?: string | null
}

export default function ChatView({ conversaId }: ChatViewProps) {
  const navigate = useNavigate()

  const [agentes, setAgentes] = useState<Agente[]>([])
  const [agenteAtivo, setAgenteAtivo] = useState<Agente | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { conversas, isLoading: loadingConversas, deletarConversa, refetch } = useConversas()

  useEffect(() => {
    supabase
      .from('ia_agentes')
      .select('*')
      .eq('status', 'ativo')
      .eq('tenant_id', TENANT_ID)
      .then(({ data }) => {
        const lista = (data as Agente[]) ?? []
        setAgentes(lista)
        const padrao = lista.find(a => a.id === ZIA_GERAL_ID) ?? lista[0] ?? null
        setAgenteAtivo(padrao)
      })
  }, [])

  const handleSelecionarConversa = (id: string) => {
    navigate(`/ia/${id}`)
    setSidebarOpen(false)
  }

  const handleNovaConversa = () => {
    navigate('/ia')
    setSidebarOpen(false)
  }

  const handleDeletarConversa = async (id: string) => {
    await deletarConversa(id)
    if (conversaId === id) navigate('/ia')
  }

  const handleConversaCriada = (id: string) => {
    navigate(`/ia/${id}`, { replace: true })
    refetch()
  }

  if (!agenteAtivo) {
    return (
      <div className="flex items-center justify-center h-full bg-slate-950 text-slate-400 gap-3">
        <Bot className="w-6 h-6 animate-pulse" />
        <span className="text-sm">Carregando agentes...</span>
      </div>
    )
  }

  return (
    <div className="flex h-full bg-slate-950 overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Conversas sidebar */}
      <div className={`
        flex-shrink-0 w-64
        lg:relative lg:translate-x-0
        fixed inset-y-0 left-0 z-40 transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:block
      `}>
        {!loadingConversas && (
          <ConversasSidebar
            conversas={conversas}
            conversaAtiva={conversaId ?? null}
            onSelecionar={handleSelecionarConversa}
            onNova={handleNovaConversa}
            onDeletar={handleDeletarConversa}
            agentes={agentes}
          />
        )}
      </div>

      {/* Mobile toggle */}
      <button
        className="fixed top-4 left-2 z-50 lg:hidden bg-slate-800 text-slate-300 rounded-lg p-1.5 shadow-lg"
        onClick={() => setSidebarOpen(o => !o)}
      >
        {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </button>

      {/* Chat area */}
      <div className="flex-1 overflow-hidden">
        <ChatArea
          conversaId={conversaId ?? null}
          agente={agenteAtivo}
          agentes={agentes}
          onAgenteChange={setAgenteAtivo}
          tenantId={TENANT_ID}
          usuarioId="usuario"
          onNovaConversa={handleConversaCriada}
        />
      </div>
    </div>
  )
}
