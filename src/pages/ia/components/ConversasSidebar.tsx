import { useState } from 'react'
import { Plus, Trash2, MessageSquare } from 'lucide-react'
import { isToday, isYesterday, differenceInDays } from 'date-fns'
import type { Conversa, Agente } from '../types'

interface ConversasSidebarProps {
  conversas: Conversa[]
  conversaAtiva: string | null
  onSelecionar: (id: string) => void
  onNova: () => void
  onDeletar: (id: string) => void
  agentes: Agente[]
}

function groupByDate(conversas: Conversa[]): Record<string, Conversa[]> {
  const groups: Record<string, Conversa[]> = {
    'Hoje': [],
    'Ontem': [],
    'Esta semana': [],
    'Anteriores': [],
  }
  for (const c of conversas) {
    const d = new Date(c.updated_at)
    if (isToday(d)) groups['Hoje'].push(c)
    else if (isYesterday(d)) groups['Ontem'].push(c)
    else if (differenceInDays(new Date(), d) <= 7) groups['Esta semana'].push(c)
    else groups['Anteriores'].push(c)
  }
  return groups
}

export default function ConversasSidebar({
  conversas, conversaAtiva, onSelecionar, onNova, onDeletar,
}: ConversasSidebarProps) {
  const [busca, setBusca] = useState('')

  const filtradas = busca.trim()
    ? conversas.filter(c => (c.titulo ?? '').toLowerCase().includes(busca.toLowerCase()))
    : conversas

  const groups = groupByDate(filtradas)

  return (
    <div className="flex flex-col h-full bg-gray-50 border-r border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 flex-shrink-0">
        <h2 className="text-sm font-semibold text-gray-800">Conversas</h2>
        <button
          onClick={onNova}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-700 transition-colors text-xs font-medium text-white"
        >
          <Plus className="w-3.5 h-3.5" />
          Nova
        </button>
      </div>

      {/* Busca */}
      <div className="px-3 py-2 flex-shrink-0">
        <input
          type="text"
          placeholder="Buscar conversas..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="w-full bg-white text-gray-900 text-sm rounded-lg px-3 py-2 placeholder-gray-400 border border-gray-200 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200"
        />
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-4">
        {Object.entries(groups).map(([label, items]) => {
          if (items.length === 0) return null
          return (
            <div key={label}>
              <p className="text-xs text-gray-400 font-medium px-2 py-1.5 mt-2">{label}</p>
              {items.map(c => (
                <button
                  key={c.id}
                  onClick={() => onSelecionar(c.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-left group transition-colors mb-0.5 ${
                    conversaAtiva === c.id
                      ? 'bg-violet-50 text-violet-800 border border-violet-200'
                      : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <span className="text-sm flex-shrink-0">
                    {c.agente?.avatar_emoji ?? <MessageSquare className="w-4 h-4" />}
                  </span>
                  <span className="flex-1 text-sm truncate">{c.titulo ?? 'Nova conversa'}</span>
                  <button
                    onClick={e => { e.stopPropagation(); onDeletar(c.id) }}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all p-0.5"
                    title="Deletar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </button>
              ))}
            </div>
          )
        })}
        {filtradas.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">Nenhuma conversa</p>
        )}
      </div>
    </div>
  )
}
