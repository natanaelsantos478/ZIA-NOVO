import { useState } from 'react';
import { Sparkles, TrendingDown, TrendingUp, AlertTriangle, Brain } from 'lucide-react';

/* ── Types ──────────────────────────────────────────────────────────────── */

type RiskLevel       = 'Baixo' | 'Médio' | 'Alto' | 'Crítico';
type Recommendation  = 'Promover' | 'Manter' | 'Realocar' | 'Desligar';
type SentimentLabel  = 'Positivo' | 'Neutro' | 'Negativo';

interface TurnoverEmployee {
  id:                  string;
  name:                string;
  position:            string;
  department:          string;
  score:               number;     // 0–100
  riskLevel:           RiskLevel;
  compaRatio:          number;     // % of market salary
  heRate:              number;     // % overtime over total hours
  absenceRate:         number;     // % absence rate
  monthsSincePromotion:number;
  ziaAction:           string;
}

interface SurveyResponse {
  id:        string;
  excerpt:   string;
  sentiment: SentimentLabel;
  theme:     string;
}

interface StrategicEmployee {
  id:               string;
  name:             string;
  position:         string;
  department:       string;
  monthlyCost:      number;   // fully-loaded cost (salary + encargos + benefits)
  valueGenerated:   number;   // estimated monthly value contribution
  roi:              number;   // valueGenerated / monthlyCost
  recommendation:   Recommendation;
  justification:    string;
}

/* ── Mock data ──────────────────────────────────────────────────────────── */

const TURNOVER_RISKS: TurnoverEmployee[] = [
  { id: 'E004', name: 'Rafael Nunes',        position: 'Dev Sênior',             department: 'Tecnologia', score: 78, riskLevel: 'Alto',     compaRatio: 81, heRate: 24, absenceRate: 8,  monthsSincePromotion: 18, ziaAction: 'Compa-ratio 19% abaixo do mercado. Alto índice de HE sugere burnout. Alinhamento salarial e férias urgentes recomendados.' },
  { id: 'E002', name: 'Carlos Eduardo Lima', position: 'Analista de Sistemas',   department: 'TI',         score: 61, riskLevel: 'Médio',    compaRatio: 88, heRate: 14, absenceRate: 6,  monthsSincePromotion: 25, ziaAction: '25 meses sem promoção. Avaliar plano de carreira na próxima calibração para evitar perda.' },
  { id: 'E001', name: 'Ana Paula Ferreira',  position: 'Gerente de RH',          department: 'RH',         score: 18, riskLevel: 'Baixo',    compaRatio: 102, heRate: 5, absenceRate: 1, monthsSincePromotion: 12, ziaAction: 'Perfil estável. Compa-ratio adequado. Engajamento alto com o cargo.' },
  { id: 'E003', name: 'Beatriz Souza',       position: 'Assistente Financeiro',  department: 'Financeiro', score: 29, riskLevel: 'Baixo',    compaRatio: 97, heRate: 3,  absenceRate: 2,  monthsSincePromotion: 8,  ziaAction: 'Risco baixo. Boa aderência às atividades. Monitorar progressão de carreira em 12 meses.' },
  { id: 'E006', name: 'Guilherme Martins',   position: 'Esp. em Produto',        department: 'Produto',    score: 44, riskLevel: 'Médio',    compaRatio: 90, heRate: 8,  absenceRate: 4,  monthsSincePromotion: 14, ziaAction: 'Compa-ratio ligeiramente abaixo do mercado para especialistas. Advertência recente pode reduzir engajamento.' },
  { id: 'E005', name: 'Fernanda Oliveira',   position: 'Designer UX',            department: 'Produto',    score: 35, riskLevel: 'Baixo',    compaRatio: 95, heRate: 6,  absenceRate: 3,  monthsSincePromotion: 10, ziaAction: 'Risco baixo. Desempenho estável e férias pendentes podem impactar levemente o engajamento.' },
];

const CLIMATE_RESPONSES: SurveyResponse[] = [
  { id: 'SR001', excerpt: '"A empresa oferece muita autonomia para trabalhar, o que valorizo bastante."',       sentiment: 'Positivo',  theme: 'Autonomia'       },
  { id: 'SR002', excerpt: '"Sinto que minha remuneração ficou defasada em relação ao mercado nos últimos anos."', sentiment: 'Negativo',  theme: 'Remuneração'    },
  { id: 'SR003', excerpt: '"O produto é excelente e me orgulho de trabalhar nele."',                           sentiment: 'Positivo',  theme: 'Produto'         },
  { id: 'SR004', excerpt: '"A gestão poderia ser mais transparente nas decisões de promoção."',                 sentiment: 'Negativo',  theme: 'Liderança'       },
  { id: 'SR005', excerpt: '"As férias foram aprovadas rapidamente pelo portal, sem burocracia."',              sentiment: 'Positivo',  theme: 'Processos RH'    },
  { id: 'SR006', excerpt: '"Às vezes sinto que o volume de trabalho não é distribuído de forma justa."',       sentiment: 'Negativo',  theme: 'Carga de Trabalho'},
];

const STRATEGIC_RECS: StrategicEmployee[] = [
  { id: 'E001', name: 'Ana Paula Ferreira',  position: 'Gerente de RH',          department: 'RH',         monthlyCost: 18_500, valueGenerated: 72_000, roi: 3.89, recommendation: 'Promover',  justification: 'ROI de 3.9x. Reduz 40% do tempo administrativo do RH e mantém o índice de retenção acima da meta. Proposta: CHRO com expansão para LATAM.' },
  { id: 'E003', name: 'Beatriz Souza',       position: 'Assistente Financeiro',  department: 'Financeiro', monthlyCost: 5_800,  valueGenerated: 12_400, roi: 2.14, recommendation: 'Manter',    justification: 'ROI de 2.1x. Desempenho sólido e consistente. Custo justificado. Reavaliar em 12 meses.' },
  { id: 'E005', name: 'Fernanda Oliveira',   position: 'Designer UX',            department: 'Produto',    monthlyCost: 9_200,  valueGenerated: 21_800, roi: 2.37, recommendation: 'Manter',    justification: 'ROI de 2.4x. Entregas de alto impacto no produto. Manter e avaliar promoção em 6 meses.' },
  { id: 'E006', name: 'Guilherme Martins',   position: 'Esp. em Produto',        department: 'Produto',    monthlyCost: 12_400, valueGenerated: 19_500, roi: 1.57, recommendation: 'Manter',    justification: 'ROI de 1.6x aceitável para especialista. Advertência recente é fator de atenção. Monitorar nos próximos 90 dias.' },
  { id: 'E002', name: 'Carlos Eduardo Lima', position: 'Analista de Sistemas',   department: 'TI',         monthlyCost: 9_800,  valueGenerated: 11_200, roi: 1.14, recommendation: 'Realocar',  justification: 'ROI de 1.1x em TI, mas perfil indica potência maior em Produto/Dados. ZIA sugere realocação para Analytics antes de decisão de desligamento.' },
  { id: 'E004', name: 'Rafael Nunes',        position: 'Dev Sênior',             department: 'Tecnologia', monthlyCost: 21_600, valueGenerated: 16_800, roi: 0.78, recommendation: 'Desligar',  justification: 'ROI de 0.78x — custo maior que o valor gerado. Alto risco de turnover voluntário. Plano de retenção tem baixa expectativa de sucesso dada a histórico de advertências.' },
];

/* ── Style maps ─────────────────────────────────────────────────────────── */

function fmt(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const RISK_CLASS: Record<RiskLevel, { badge: string; bar: string; score: string }> = {
  Baixo:   { badge: 'bg-green-100 text-green-700',  bar: 'bg-green-400',  score: 'text-green-700'  },
  Médio:   { badge: 'bg-amber-100 text-amber-700',  bar: 'bg-amber-400',  score: 'text-amber-700'  },
  Alto:    { badge: 'bg-orange-100 text-orange-700',bar: 'bg-orange-400', score: 'text-orange-700' },
  Crítico: { badge: 'bg-rose-100 text-rose-700',    bar: 'bg-rose-500',   score: 'text-rose-700'   },
};

const REC_BADGE: Record<Recommendation, string> = {
  Promover:  'bg-green-100 text-green-800',
  Manter:    'bg-blue-100 text-blue-700',
  Realocar:  'bg-amber-100 text-amber-700',
  Desligar:  'bg-rose-100 text-rose-700',
};

const SENTIMENT_CLASS: Record<SentimentLabel, string> = {
  Positivo: 'bg-green-100 text-green-700',
  Neutro:   'bg-slate-100 text-slate-600',
  Negativo: 'bg-rose-100 text-rose-700',
};

/* ── Sub-tabs ───────────────────────────────────────────────────────────── */

function TurnoverTab() {
  const critical = TURNOVER_RISKS.filter((e) => e.riskLevel === 'Alto' || e.riskLevel === 'Crítico').length;

  return (
    <div className="space-y-5">
      {critical > 0 && (
        <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-xl px-5 py-4">
          <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-rose-800">{critical} colaborador{critical > 1 ? 'es' : ''} com risco de turnover alto — ação proativa recomendada</p>
            <p className="text-xs text-rose-600 mt-0.5">ZIA cruzou compa-ratio, horas extras (burnout), ausências e histórico de promoções para calcular o Score.</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-500" />
            <h3 className="font-semibold text-slate-800">Score de Risco de Turnover</h3>
            <span className="text-xs text-slate-400">— monitoramento contínuo por ZIA</span>
          </div>
        </div>
        <div className="divide-y divide-slate-50">
          {TURNOVER_RISKS.sort((a, b) => b.score - a.score).map((emp) => {
            const rc = RISK_CLASS[emp.riskLevel];
            return (
              <div key={emp.id} className="p-5">
                <div className="flex items-start gap-4 mb-3">
                  {/* Score badge */}
                  <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0 ${rc.badge}`}>
                    <span className={`text-2xl font-black ${rc.score}`}>{emp.score}</span>
                    <span className="text-[9px] font-semibold opacity-70">/ 100</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-800">{emp.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${rc.badge}`}>Risco {emp.riskLevel}</span>
                    </div>
                    <p className="text-xs text-slate-400">{emp.position} · {emp.department}</p>
                  </div>
                </div>

                {/* Factor bars */}
                <div className="grid grid-cols-4 gap-3 mb-3">
                  {[
                    { label: 'Compa-Ratio', value: emp.compaRatio, max: 120, unit: '%', good: emp.compaRatio >= 95 },
                    { label: 'HE (%h)',      value: emp.heRate,    max: 40,  unit: '%', good: emp.heRate <= 10      },
                    { label: 'Ausências',    value: emp.absenceRate,max: 20, unit: '%', good: emp.absenceRate <= 3  },
                    { label: 'Meses s/ Promo', value: emp.monthsSincePromotion, max: 36, unit: 'm', good: emp.monthsSincePromotion <= 18 },
                  ].map((f) => (
                    <div key={f.label}>
                      <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                        <span>{f.label}</span>
                        <span className={`font-semibold ${f.good ? 'text-green-600' : 'text-rose-600'}`}>{f.value}{f.unit}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${f.good ? 'bg-green-400' : 'bg-rose-400'}`}
                          style={{ width: `${Math.min((f.value / f.max) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* ZIA action */}
                <div className="flex items-start gap-2 bg-purple-50 rounded-lg px-3 py-2">
                  <Sparkles className="w-3.5 h-3.5 text-purple-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-purple-700">{emp.ziaAction}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ClimateTab() {
  const enps = 42;
  const promoters = 58;
  const passives = 26;
  const detractors = 16;
  const sentimentPos = 62;
  const sentimentNeu = 22;
  const sentimentNeg = 16;
  const positiveThemes = ['Autonomia', 'Produto', 'Colegas', 'Flexibilidade', 'Portal RH'];
  const negativeThemes = ['Remuneração', 'Crescimento', 'Liderança', 'Carga de Trabalho'];

  return (
    <div className="space-y-6">
      {/* ZIA header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-5 text-white">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-5 h-5 text-white/80" />
          <h3 className="font-bold text-white">Diagnóstico de Clima — ZIA Sentiment Analysis</h3>
        </div>
        <p className="text-white/70 text-xs">
          Análise de sentimento aplicada sobre respostas abertas da pesquisa de clima (148 respondentes · última pesquisa: 15/02/2026).
          Padrões negativos detectados automaticamente com NLP.
        </p>
      </div>

      {/* eNPS + sentiment */}
      <div className="grid grid-cols-2 gap-4">
        {/* eNPS */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 font-semibold">eNPS (Employee Net Promoter Score)</p>
          <div className="flex items-end gap-3 mb-4">
            <span className={`text-5xl font-black ${enps >= 50 ? 'text-green-600' : enps >= 20 ? 'text-amber-600' : 'text-rose-600'}`}>{enps}</span>
            <div className="mb-1">
              <div className="flex items-center gap-1 text-xs text-slate-500">
                {enps >= 20 ? <TrendingUp className="w-3 h-3 text-green-500" /> : <TrendingDown className="w-3 h-3 text-rose-500" />}
                <span>+4 vs. período anterior</span>
              </div>
              <p className="text-xs text-slate-400">Bom (meta: ≥ 40)</p>
            </div>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Promotores (9-10)',  pct: promoters,  bar: 'bg-green-400' },
              { label: 'Neutros (7-8)',      pct: passives,   bar: 'bg-slate-300' },
              { label: 'Detratores (0-6)',   pct: detractors, bar: 'bg-rose-400'  },
            ].map((s) => (
              <div key={s.label}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-slate-500">{s.label}</span>
                  <span className="font-semibold text-slate-700">{s.pct}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${s.bar} rounded-full`} style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sentiment */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 font-semibold">Sentimento — Respostas Abertas</p>
          <div className="flex items-center gap-2 h-8 rounded-lg overflow-hidden mb-4">
            <div className="bg-green-400 h-full rounded-l-lg" style={{ width: `${sentimentPos}%` }} title={`${sentimentPos}% Positivo`} />
            <div className="bg-slate-200 h-full" style={{ width: `${sentimentNeu}%` }} title={`${sentimentNeu}% Neutro`} />
            <div className="bg-rose-400 h-full rounded-r-lg" style={{ width: `${sentimentNeg}%` }} title={`${sentimentNeg}% Negativo`} />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'Positivo', pct: sentimentPos, color: 'text-green-600' },
              { label: 'Neutro',   pct: sentimentNeu, color: 'text-slate-500' },
              { label: 'Negativo', pct: sentimentNeg, color: 'text-rose-600'  },
            ].map((s) => (
              <div key={s.label}>
                <p className={`text-2xl font-bold ${s.color}`}>{s.pct}%</p>
                <p className="text-xs text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Themes */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-xs text-green-600 font-semibold uppercase tracking-wider mb-3">Temas Positivos Recorrentes</p>
          <div className="flex flex-wrap gap-2">
            {positiveThemes.map((t) => (
              <span key={t} className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm font-medium border border-green-200">{t}</span>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-xs text-rose-600 font-semibold uppercase tracking-wider mb-3">Temas Negativos Recorrentes</p>
          <div className="flex flex-wrap gap-2">
            {negativeThemes.map((t) => (
              <span key={t} className="px-3 py-1 bg-rose-50 text-rose-700 rounded-full text-sm font-medium border border-rose-200">{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Sample responses */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800 text-sm">Amostras de Respostas Abertas — Classificadas por ZIA</h3>
          <p className="text-xs text-slate-400 mt-0.5">Respostas anonimizadas — identidade dos colaboradores protegida</p>
        </div>
        <div className="divide-y divide-slate-50">
          {CLIMATE_RESPONSES.map((r) => (
            <div key={r.id} className="flex items-start gap-4 px-5 py-3">
              <span className={`mt-0.5 shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold ${SENTIMENT_CLASS[r.sentiment]}`}>{r.sentiment}</span>
              <div className="flex-1">
                <p className="text-sm text-slate-600 italic">{r.excerpt}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Tema: {r.theme}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StrategicTab() {
  return (
    <div className="space-y-5">
      {/* ZIA disclaimer */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          <h3 className="font-semibold text-indigo-800">Recomendação Estratégica ZIA</h3>
        </div>
        <p className="text-xs text-indigo-700">
          A ZIA cruza o <strong>Custo Total do Colaborador</strong> (salário + encargos + benefícios ≈ 1.7× CLT) com o
          <strong> Valor Gerado</strong> (metas, revenue, economia operacional) para calcular o ROI individual e sugerir
          a ação mais adequada — Promover, Manter, Realocar ou Desligar. Esta é uma ferramenta de apoio à decisão.
          A decisão final é sempre do gestor e do RH.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Colaborador</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Custo Total / Mês</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Valor Gerado / Mês</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">ROI</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Recomendação ZIA</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Justificativa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {STRATEGIC_RECS.sort((a, b) => b.roi - a.roi).map((emp) => (
                <tr key={emp.id} className={`hover:bg-slate-50/60 transition-colors ${emp.recommendation === 'Desligar' ? 'bg-rose-50/20' : ''}`}>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-800">{emp.name}</p>
                    <p className="text-xs text-slate-400">{emp.position} · {emp.department}</p>
                  </td>
                  <td className="px-4 py-4 text-right font-medium text-slate-700">{fmt(emp.monthlyCost)}</td>
                  <td className="px-4 py-4 text-right font-medium text-slate-700">{fmt(emp.valueGenerated)}</td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {emp.roi >= 1
                        ? <TrendingUp   className="w-3.5 h-3.5 text-green-500" />
                        : <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                      }
                      <span className={`font-bold ${emp.roi >= 2 ? 'text-green-700' : emp.roi >= 1 ? 'text-amber-700' : 'text-rose-700'}`}>
                        {emp.roi.toFixed(2)}×
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${REC_BADGE[emp.recommendation]}`}>
                      {emp.recommendation}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-start gap-1.5 max-w-xs">
                      <Sparkles className="w-3 h-3 text-purple-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-500 leading-relaxed">{emp.justification}</p>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── Main ───────────────────────────────────────────────────────────────── */

const TABS = [
  { id: 'turnover',  label: 'Risco de Turnover'         },
  { id: 'climate',   label: 'Diagnóstico de Clima'      },
  { id: 'strategic', label: 'Recomendação Estratégica'  },
] as const;

type TabId = typeof TABS[number]['id'];

export default function PeopleAnalytics() {
  const [tab, setTab] = useState<TabId>('turnover');
  const criticalRisk = TURNOVER_RISKS.filter((e) => e.riskLevel === 'Alto' || e.riskLevel === 'Crítico').length;

  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">People Analytics — ZIA</h1>
        </div>
        <p className="text-slate-500 text-sm">
          Camada de inteligência artificial: Score de Turnover, análise de sentimento em pesquisas de clima e recomendação estratégica cruzando custo e valor gerado
        </p>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              tab === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
            {t.id === 'turnover' && criticalRisk > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black flex items-center justify-center">
                {criticalRisk}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'turnover'  && <TurnoverTab />}
      {tab === 'climate'   && <ClimateTab />}
      {tab === 'strategic' && <StrategicTab />}
    </div>
  );
}
