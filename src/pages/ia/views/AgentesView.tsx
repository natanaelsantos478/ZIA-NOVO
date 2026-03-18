import { Bot, Plus, Zap } from 'lucide-react'

export default function AgentesView() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-slate-950 text-center px-8">
      <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mb-5">
        <Bot className="w-8 h-8 text-violet-400" />
      </div>
      <h2 className="text-white font-bold text-xl mb-2">Gerenciador de Agentes</h2>
      <p className="text-slate-400 text-sm max-w-sm leading-relaxed mb-6">
        Crie e configure agentes especializados com system prompts customizados, ferramentas específicas e gatilhos automáticos.
      </p>
      <div className="flex gap-3">
        <button className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors opacity-50 cursor-not-allowed">
          <Plus className="w-4 h-4" /> Novo Agente
        </button>
        <button className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm px-4 py-2 rounded-lg border border-slate-700 transition-colors opacity-50 cursor-not-allowed">
          <Zap className="w-4 h-4" /> Explorar Templates
        </button>
      </div>
      <p className="text-slate-600 text-xs mt-6">Em desenvolvimento — disponível em breve</p>
    </div>
  )
}
