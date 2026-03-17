// ─────────────────────────────────────────────────────────────────────────────
// Models — Configuração de Modelos de IA
// Selecione quais modelos estão disponíveis, configure API keys e limites
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import {
  Cpu, CheckCircle2, Eye, EyeOff,
  Save, Star, BarChart3, DollarSign, Key,
} from 'lucide-react';

// ── Data ──────────────────────────────────────────────────────────────────────

const MODELS = [
  {
    id: 'gemini-3.1-flash-lite-preview',
    name: 'Gemini 3.1 Flash Lite',
    provider: 'Google DeepMind',
    desc: 'Modelo mais rápido e econômico da família Gemini 3.1. Ideal para tarefas de monitoramento contínuo, alertas e análises simples que exigem baixa latência.',
    contextWindow: '128K tokens',
    costIn: 'R$ 0,009/1K tokens',
    costOut: 'R$ 0,036/1K tokens',
    latency: '~300ms',
    capabilities: ['Texto', 'Análise', 'Código', 'JSON estruturado'],
    status: 'active',
    isDefault: true,
    agentsUsing: 4,
    tokensMonth: '4.2M',
  },
  {
    id: 'gemini-3.1-flash-preview',
    name: 'Gemini 3.1 Flash',
    provider: 'Google DeepMind',
    desc: 'Equilíbrio entre velocidade e qualidade. Suporta entrada multimodal (imagens, PDFs). Ótimo para análises de documentos, classificação e tarefas intermediárias.',
    contextWindow: '1M tokens',
    costIn: 'R$ 0,035/1K tokens',
    costOut: 'R$ 0,105/1K tokens',
    latency: '~800ms',
    capabilities: ['Texto', 'Imagem', 'PDF', 'Áudio', 'Código', 'JSON'],
    status: 'active',
    isDefault: false,
    agentsUsing: 0,
    tokensMonth: '0',
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro',
    provider: 'Google DeepMind',
    desc: 'Máxima qualidade e raciocínio complexo. Indicado para o agente coordenador (ZIA General), análises fiscais complexas e síntese de múltiplas fontes de dados.',
    contextWindow: '2M tokens',
    costIn: 'R$ 0,175/1K tokens',
    costOut: 'R$ 0,525/1K tokens',
    latency: '~2s',
    capabilities: ['Texto', 'Imagem', 'PDF', 'Áudio', 'Vídeo', 'Código', 'Raciocínio'],
    status: 'active',
    isDefault: false,
    agentsUsing: 2,
    tokensMonth: '890K',
  },
  {
    id: 'gemini-3.1-flash-thinking',
    name: 'Gemini 3.1 Flash Thinking',
    provider: 'Google DeepMind',
    desc: 'Versão com "thinking" habilitado — exibe o raciocínio passo a passo antes de responder. Ideal para decisões críticas onde a transparência do processo é essencial.',
    contextWindow: '128K tokens',
    costIn: 'R$ 0,12/1K tokens',
    costOut: 'R$ 0,35/1K tokens',
    latency: '~1.5s',
    capabilities: ['Texto', 'Raciocínio visível', 'Código', 'Matemática'],
    status: 'inactive',
    isDefault: false,
    agentsUsing: 0,
    tokensMonth: '0',
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function Models() {
  const [models, setModels] = useState(MODELS);
  const [showKey, setShowKey] = useState(false);
  const [apiKey, setApiKey] = useState('AIzaSy••••••••••••••••••••••••••••••••Q');
  const [monthlyLimit, setMonthlyLimit] = useState('50');
  const [saved, setSaved] = useState(false);

  const toggleModel = (id: string) => {
    setModels(prev => prev.map(m =>
      m.id !== id ? m : { ...m, status: m.status === 'active' ? 'inactive' : 'active' }
    ));
    setSaved(false);
  };

  const setDefault = (id: string) => {
    setModels(prev => prev.map(m => ({ ...m, isDefault: m.id === id })));
    setSaved(false);
  };

  const totalTokens = '5.09M';
  const totalCost = 'R$ 48,20';

  return (
    <div className="p-6 space-y-6 max-w-screen-lg">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-100">Modelos de IA</h1>
          <p className="text-sm text-slate-400 mt-0.5">Configure quais modelos estão disponíveis e defina limites de uso</p>
        </div>
        <button
          onClick={() => setSaved(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-colors shadow-lg shadow-violet-900/30"
        >
          <Save className="w-4 h-4" /> {saved ? 'Salvo!' : 'Salvar configurações'}
        </button>
      </div>

      {/* ── API Key + Limits ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Key className="w-4 h-4 text-violet-400" />
            <span className="font-bold text-slate-200 text-sm">Chave de API — Google AI</span>
            <span className="ml-auto flex items-center gap-1 text-xs text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3 h-3" /> Válida
            </span>
          </div>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              className="w-full pr-10 pl-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 font-mono focus:outline-none focus:border-violet-500"
            />
            <button
              onClick={() => setShowKey(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">Chave usada por todos os agentes. Gerencie em console.cloud.google.com</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-slate-200 text-sm">Limite Mensal de Gasto</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-semibold">R$</span>
            <input
              type="number"
              value={monthlyLimit}
              onChange={e => setMonthlyLimit(e.target.value)}
              className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-violet-500"
            />
            <span className="text-slate-400 text-sm">/mês</span>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-500">Gasto atual: {totalCost}</span>
              <span className="text-slate-300 font-semibold">{Math.round((48.20 / parseFloat(monthlyLimit || '1')) * 100)}%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${Math.min(100, Math.round((48.20 / parseFloat(monthlyLimit || '1')) * 100))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Usage summary ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 p-4 bg-slate-900 border border-slate-800 rounded-2xl">
        <BarChart3 className="w-4 h-4 text-violet-400" />
        <span className="text-sm text-slate-400">Uso acumulado do mês:</span>
        <span className="text-sm font-bold text-slate-200">{totalTokens} tokens</span>
        <span className="text-slate-600">•</span>
        <span className="text-sm font-bold text-slate-200">{totalCost}</span>
        <span className="text-xs text-slate-500 ml-auto">Período: 01/03 – 17/03/2026</span>
      </div>

      {/* ── Model cards ─────────────────────────────────────────────────── */}
      <div className="space-y-4">
        {models.map(model => (
          <div
            key={model.id}
            className={`bg-slate-900 border rounded-2xl overflow-hidden transition-all ${
              model.status === 'active' ? 'border-slate-700' : 'border-slate-800 opacity-60'
            }`}
          >
            <div className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <Cpu className="w-4 h-4 text-violet-400" />
                    <span className="font-bold text-slate-100">{model.name}</span>
                    {model.isDefault && (
                      <span className="flex items-center gap-1 text-xs bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded-full font-bold">
                        <Star className="w-3 h-3" /> Padrão
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      model.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-slate-700 text-slate-500'
                    }`}>
                      {model.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  <p className="text-sm text-slate-400 leading-relaxed mb-4">{model.desc}</p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="bg-slate-800/60 rounded-xl p-3">
                      <p className="text-slate-500 mb-1">Janela contexto</p>
                      <p className="font-bold text-slate-300">{model.contextWindow}</p>
                    </div>
                    <div className="bg-slate-800/60 rounded-xl p-3">
                      <p className="text-slate-500 mb-1">Custo entrada</p>
                      <p className="font-bold text-slate-300">{model.costIn}</p>
                    </div>
                    <div className="bg-slate-800/60 rounded-xl p-3">
                      <p className="text-slate-500 mb-1">Latência média</p>
                      <p className="font-bold text-slate-300">{model.latency}</p>
                    </div>
                    <div className="bg-slate-800/60 rounded-xl p-3">
                      <p className="text-slate-500 mb-1">Agentes usando</p>
                      <p className="font-bold text-slate-300">{model.agentsUsing}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {model.capabilities.map(c => (
                      <span key={c} className="text-xs bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5 rounded-lg">{c}</span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => toggleModel(model.id)}
                    className={`w-12 h-6 rounded-full shrink-0 transition-all relative ${
                      model.status === 'active' ? 'bg-emerald-600' : 'bg-slate-700'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                      model.status === 'active' ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                  {!model.isDefault && model.status === 'active' && (
                    <button
                      onClick={() => setDefault(model.id)}
                      className="text-xs text-slate-500 hover:text-violet-400 transition-colors whitespace-nowrap font-semibold"
                    >
                      Tornar padrão
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
