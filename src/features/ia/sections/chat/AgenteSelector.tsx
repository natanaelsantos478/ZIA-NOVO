import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import type { Agente } from './types'

interface AgenteSelectorProps {
  agentes: Agente[]
  agenteAtivo: Agente | null
  onChange: (agente: Agente) => void
}

export default function AgenteSelector({ agentes, agenteAtivo, onChange }: AgenteSelectorProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (agente: Agente) => {
    onChange(agente)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-sm"
      >
        <span>{agenteAtivo?.avatar_emoji ?? '🤖'}</span>
        <span className="text-slate-200 font-medium">{agenteAtivo?.nome ?? 'Selecionar agente'}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
          {agentes.map(agente => (
            <button
              key={agente.id}
              onClick={() => handleSelect(agente)}
              className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-700/60 transition-colors text-left"
            >
              <span className="text-xl flex-shrink-0 mt-0.5">{agente.avatar_emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">{agente.nome}</p>
                <p className="text-xs text-slate-500 truncate">{agente.funcao}</p>
              </div>
              {agenteAtivo?.id === agente.id && (
                <Check className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
