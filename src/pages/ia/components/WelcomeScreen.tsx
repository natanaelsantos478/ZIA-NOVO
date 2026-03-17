import type { Agente } from '../types'

interface WelcomeScreenProps {
  agente: Agente
  onSugestao: (texto: string) => void
}

const SUGESTOES = [
  { emoji: '📊', texto: 'Mostre o resumo financeiro do mês' },
  { emoji: '👥', texto: 'Quantos clientes ativos temos?' },
  { emoji: '🔍', texto: 'Pesquise concorrentes do nosso setor' },
  { emoji: '📋', texto: 'Analise um arquivo para mim' },
  { emoji: '📈', texto: 'Produtos mais vendidos este mês' },
  { emoji: '🏢', texto: 'Valide o CNPJ de um fornecedor' },
]

export default function WelcomeScreen({ agente, onSugestao }: WelcomeScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center gap-6">
      <div className="text-6xl select-none">{agente.avatar_emoji}</div>
      <div>
        <h2 className="text-xl font-semibold text-slate-100 mb-2">
          Olá! Sou o {agente.nome}
        </h2>
        <p className="text-sm text-slate-400 max-w-sm">{agente.funcao}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 w-full max-w-lg mt-2">
        {SUGESTOES.map((s, i) => (
          <button
            key={i}
            onClick={() => onSugestao(s.texto)}
            className="flex items-start gap-2 px-4 py-3 rounded-xl bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 hover:border-slate-600 text-left transition-all group"
          >
            <span className="text-lg flex-shrink-0">{s.emoji}</span>
            <span className="text-sm text-slate-300 group-hover:text-slate-100 transition-colors leading-snug">
              {s.texto}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
