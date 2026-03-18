import { Settings, Key, Shield, Activity } from 'lucide-react'

export default function ConfigIAView() {
  return (
    <div className="flex-1 overflow-y-auto p-6 bg-slate-950 custom-scrollbar">
      <div className="mb-6">
        <h2 className="text-white font-bold text-xl">Configurações de IA</h2>
        <p className="text-slate-400 text-sm mt-0.5">Gerencie API keys, limites de tokens e autonomia dos agentes</p>
      </div>

      <div className="space-y-4 max-w-2xl opacity-60 pointer-events-none">
        {[
          { icon: Key, label: 'API Keys', desc: 'Gemini, OpenAI, Anthropic', color: 'text-violet-400' },
          { icon: Shield, label: 'Autonomia', desc: 'Modo Assistido · Supervisionado · Autônomo', color: 'text-blue-400' },
          { icon: Activity, label: 'Tokens & Uso', desc: '0 / 100.000 tokens usados hoje', color: 'text-emerald-400' },
          { icon: Settings, label: 'Módulos Permitidos', desc: 'CRM, RH, ERP, SCM, Qualidade', color: 'text-amber-400' },
        ].map(item => (
          <div key={item.label} className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
              <item.icon className={`w-5 h-5 ${item.color}`} />
            </div>
            <div>
              <p className="text-white font-medium text-sm">{item.label}</p>
              <p className="text-slate-400 text-xs mt-0.5">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-slate-600 text-xs mt-8">Em desenvolvimento — disponível em breve</p>
    </div>
  )
}
