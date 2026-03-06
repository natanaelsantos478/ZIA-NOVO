import { Leaf, TrendingDown, Recycle, Wind } from 'lucide-react';

// Sustentabilidade ESG — dados mock enquanto integração com APIs ambientais não está disponível
// Candidatos a integrar: APIs de cálculo de carbono, SustainApp, etc.

const MOCK_METRICS = [
  { label: 'Emissão de CO₂ (ton/mês)', value: '12.4', trend: '-8%', icon: Wind, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { label: 'Km Rodados (mês)',          value: '48.200', trend: '-3%', icon: TrendingDown, color: 'text-blue-600', bg: 'bg-blue-50' },
  { label: 'Rotas Otimizadas',          value: '67%',   trend: '+12%', icon: Leaf, color: 'text-green-600', bg: 'bg-green-50' },
  { label: 'Embalagens Recicladas',     value: '89%',   trend: '+5%',  icon: Recycle, color: 'text-teal-600', bg: 'bg-teal-50' },
];

const MOCK_GOALS = [
  { label: 'Redução de CO₂ em 2026', target: '20%', current: '8%', pct: 40 },
  { label: 'Frota elétrica/híbrida',  target: '30%', current: '12%', pct: 40 },
  { label: 'Embalagens sustentáveis', target: '100%', current: '89%', pct: 89 },
  { label: 'Rotas zero-emissão',      target: '15%', current: '4%', pct: 27 },
];

export default function Green() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Sustentabilidade (ESG)</h2>
        <p className="text-sm text-slate-500">Métricas ambientais e metas ESG da operação logística</p>
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-700 flex items-center gap-3">
        <Leaf className="w-5 h-5 flex-shrink-0" />
        <span>
          Módulo em fase de integração com APIs de cálculo de carbono. Os valores abaixo são ilustrativos até a conexão ser estabelecida.
        </span>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {MOCK_METRICS.map((m) => (
          <div key={m.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className={`w-9 h-9 ${m.bg} rounded-lg flex items-center justify-center mb-3`}>
              <m.icon className={`w-5 h-5 ${m.color}`} />
            </div>
            <p className="text-xs text-slate-500 mb-1">{m.label}</p>
            <p className="text-2xl font-bold text-slate-800">{m.value}</p>
            <p className={`text-xs font-medium mt-1 ${m.trend.startsWith('-') ? 'text-green-600' : 'text-blue-600'}`}>
              {m.trend} vs. mês anterior
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h3 className="font-semibold text-slate-800 mb-4">Metas ESG 2026</h3>
        <div className="space-y-4">
          {MOCK_GOALS.map((g) => (
            <div key={g.label}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-700">{g.label}</span>
                <span className="text-slate-500">{g.current} / {g.target}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${g.pct}%` }} />
              </div>
              <p className="text-xs text-slate-400 mt-0.5 text-right">{g.pct}% da meta</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
