// ─────────────────────────────────────────────────────────────────────────────
// AgentBuilder — Criação e configuração de agentes IA
// Formulário completo para definir função, modelo, permissões e gatilhos
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import {
  Sparkles, Cpu, Zap,
  Check, ArrowRight, RefreshCw,
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────

const MODELS = [
  {
    id: 'gemini-3.1-flash-lite-preview',
    name: 'Gemini 3.1 Flash Lite',
    desc: 'Mais rápido e econômico. Ideal para tarefas de monitoramento e alertas.',
    badge: 'Recomendado',
    badgeColor: 'bg-emerald-500/20 text-emerald-400',
    cost: 'Baixo custo',
  },
  {
    id: 'gemini-3.1-flash-preview',
    name: 'Gemini 3.1 Flash',
    desc: 'Equilíbrio entre velocidade e qualidade. Ótimo para análises intermediárias.',
    badge: 'Popular',
    badgeColor: 'bg-blue-500/20 text-blue-400',
    cost: 'Custo médio',
  },
  {
    id: 'gemini-3.1-pro-preview',
    name: 'Gemini 3.1 Pro',
    desc: 'Máxima qualidade para tarefas complexas de raciocínio e síntese de informação.',
    badge: 'Mais poderoso',
    badgeColor: 'bg-violet-500/20 text-violet-400',
    cost: 'Custo alto',
  },
];

const PERMISSION_GROUPS = [
  {
    label: 'CRM',
    items: [
      { id: 'crm.read',  label: 'Leitura — clientes, deals, histórico'  },
      { id: 'crm.write', label: 'Escrita — criar tarefas, atualizar deals' },
    ],
  },
  {
    label: 'RH',
    items: [
      { id: 'hr.read',  label: 'Leitura — colaboradores, ponto, folha' },
      { id: 'hr.write', label: 'Escrita — criar alertas, registrar ações' },
    ],
  },
  {
    label: 'ERP / Financeiro',
    items: [
      { id: 'erp.read',  label: 'Leitura — DRE, contas, guias fiscais' },
      { id: 'erp.write', label: 'Escrita — criar lançamentos, solicitações' },
    ],
  },
  {
    label: 'SCM / Logística',
    items: [
      { id: 'scm.read',  label: 'Leitura — estoque, pedidos, fornecedores' },
      { id: 'scm.write', label: 'Escrita — gerar requisições de compra'     },
    ],
  },
  {
    label: 'Qualidade',
    items: [
      { id: 'quality.read',  label: 'Leitura — NCs, auditorias, checklists' },
      { id: 'quality.write', label: 'Escrita — registrar ações corretivas'   },
    ],
  },
  {
    label: 'Documentos',
    items: [
      { id: 'docs.read',  label: 'Leitura — ler e listar documentos' },
      { id: 'docs.write', label: 'Escrita — criar resumos, classificar'  },
    ],
  },
  {
    label: 'APIs Externas',
    items: [
      { id: 'ext.web',   label: 'Busca na internet (Google, Bing)'   },
      { id: 'ext.email', label: 'Envio de e-mails automáticos'        },
      { id: 'ext.webhook', label: 'Chamar webhooks externos'          },
    ],
  },
];

const TRIGGER_PRESETS = [
  'Contínuo — sempre ativo (background)',
  'A cada 1 hora',
  'A cada 4 horas',
  'A cada 6 horas',
  'Diariamente às 07h',
  'Diariamente às 12h',
  'Toda segunda-feira às 08h',
  'Toda vez que um novo registro é criado',
  'Quando um evento específico ocorre (configurar)',
  'Gatilho manual apenas',
];

const AVATARS = ['🤖', '🧑‍💼', '📊', '📄', '📦', '🔍', '✨', '🎯', '⚡', '🛡️', '📡', '🔔'];

// ── Component ─────────────────────────────────────────────────────────────────

export default function AgentBuilder({ onNavigate }: { onNavigate?: (id: string) => void }) {
  const [step, setStep] = useState(1);
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    name: '',
    avatar: '🤖',
    role: '',
    model: 'gemini-3.1-flash-lite-preview',
    trigger: '',
    triggerCustom: '',
    callGeneral: true,
    permissions: [] as string[],
  });

  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');

  const totalSteps = 4;

  const togglePermission = (id: string) => {
    setForm(f => ({
      ...f,
      permissions: f.permissions.includes(id)
        ? f.permissions.filter(p => p !== id)
        : [...f.permissions, id],
    }));
  };

  const suggestRole = () => {
    if (!form.name) return;
    setAiSuggesting(true);
    setAiSuggestion('');
    setTimeout(() => {
      const suggestions: Record<string, string> = {
        'monitor': 'Monitora continuamente os dados do sistema e envia alertas automáticos quando detecta anomalias ou condições pré-definidas. Analisa tendências e gera relatórios periódicos.',
        'vendas':  'Acompanha o funil de vendas, identifica oportunidades em risco, envia alertas para a equipe comercial e gera resumos diários do pipeline.',
        'fiscal':  'Monitora vencimentos de obrigações fiscais, calcula valores de tributos com base nas transações registradas e alerta o setor financeiro com antecedência.',
        'rh':      'Verifica conformidade da folha de pagamento, monitora banco de horas, alertas de férias vencidas e gera relatórios de produtividade.',
      };
      const key = Object.keys(suggestions).find(k => form.name.toLowerCase().includes(k));
      setAiSuggestion(key
        ? suggestions[key]
        : `Agente especializado em "${form.name}". Executa tarefas automatizadas relacionadas à sua área de atuação, monitora dados relevantes e notifica o gestor sobre eventos importantes.`
      );
      setAiSuggesting(false);
    }, 1500);
  };

  const handleSave = () => {
    setSaved(true);
  };

  if (saved) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-6">
          <Check className="w-10 h-10 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-black text-slate-100 mb-2">Agente criado com sucesso!</h2>
        <p className="text-slate-400 mb-2">
          <span className="font-bold text-violet-400">{form.avatar} {form.name}</span> foi configurado e está pronto para iniciar.
        </p>
        <p className="text-sm text-slate-500 mb-8">Ele entrará em operação conforme o gatilho configurado.</p>
        <div className="flex gap-3">
          <button
            onClick={() => onNavigate?.('agents')}
            className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-colors"
          >
            Ver Meus Agentes
          </button>
          <button
            onClick={() => { setSaved(false); setStep(1); setForm({ name:'', avatar:'🤖', role:'', model:'gemini-3.1-flash-lite-preview', trigger:'', triggerCustom:'', callGeneral:true, permissions:[] }); setAiSuggestion(''); }}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-bold transition-colors"
          >
            Criar Outro
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-100">Criar Novo Agente</h1>
        <p className="text-sm text-slate-400 mt-0.5">Configure um agente IA para executar tarefas específicas automaticamente</p>
      </div>

      {/* ── Progress steps ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-8">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map(s => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0 ${
              s < step ? 'bg-emerald-500 text-white' :
              s === step ? 'bg-violet-600 text-white ring-4 ring-violet-600/20' :
              'bg-slate-800 text-slate-500'
            }`}>
              {s < step ? <Check className="w-4 h-4" /> : s}
            </div>
            {s < totalSteps && <div className={`h-0.5 flex-1 rounded-full ${s < step ? 'bg-emerald-500' : 'bg-slate-800'}`} />}
          </div>
        ))}
      </div>

      {/* ── STEP 1 — Identidade ─────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-100 mb-1">Identidade do Agente</h2>
            <p className="text-sm text-slate-400">Dê um nome e defina a função principal</p>
          </div>

          {/* Avatar picker */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Avatar</label>
            <div className="flex flex-wrap gap-2">
              {AVATARS.map(a => (
                <button
                  key={a}
                  onClick={() => setForm(f => ({ ...f, avatar: a }))}
                  className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                    form.avatar === a
                      ? 'bg-violet-600 ring-2 ring-violet-400'
                      : 'bg-slate-800 hover:bg-slate-700'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Nome do Agente *</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Monitor de Vendas, Fiscal Watcher..."
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30"
            />
          </div>

          {/* Role */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Função / Responsabilidade *</label>
              <button
                onClick={suggestRole}
                disabled={!form.name || aiSuggesting}
                className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 disabled:opacity-40 transition-colors font-semibold"
              >
                {aiSuggesting
                  ? <><RefreshCw className="w-3 h-3 animate-spin" /> Gerando...</>
                  : <><Sparkles className="w-3 h-3" /> Sugerir com IA</>
                }
              </button>
            </div>
            {aiSuggestion && (
              <div className="mb-2 p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl text-sm text-violet-300 leading-relaxed">
                <p className="font-semibold text-violet-400 text-xs mb-1">💡 Sugestão da IA:</p>
                {aiSuggestion}
                <button
                  onClick={() => { setForm(f => ({ ...f, role: aiSuggestion })); setAiSuggestion(''); }}
                  className="mt-2 text-xs font-bold text-violet-400 hover:text-violet-300 flex items-center gap-1"
                >
                  <Check className="w-3 h-3" /> Usar esta sugestão
                </button>
              </div>
            )}
            <textarea
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              rows={4}
              placeholder="Descreva o que este agente deve fazer, quando deve agir e o que deve monitorar..."
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 resize-none text-sm leading-relaxed"
            />
          </div>
        </div>
      )}

      {/* ── STEP 2 — Modelo ─────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100 mb-1">Modelo de IA</h2>
            <p className="text-sm text-slate-400">Selecione qual modelo este agente irá usar</p>
          </div>
          {MODELS.map(m => (
            <button
              key={m.id}
              onClick={() => setForm(f => ({ ...f, model: m.id }))}
              className={`w-full text-left p-4 rounded-2xl border transition-all ${
                form.model === m.id
                  ? 'border-violet-500 bg-violet-500/10'
                  : 'border-slate-700 bg-slate-900 hover:border-slate-600'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Cpu className={`w-4 h-4 ${form.model === m.id ? 'text-violet-400' : 'text-slate-400'}`} />
                    <span className="font-bold text-slate-100 text-sm">{m.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${m.badgeColor}`}>{m.badge}</span>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed">{m.desc}</p>
                  <p className="text-xs text-slate-500 mt-1 font-mono">{m.id}</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 shrink-0 mt-1 flex items-center justify-center ${
                  form.model === m.id ? 'border-violet-500 bg-violet-500' : 'border-slate-600'
                }`}>
                  {form.model === m.id && <Check className="w-3 h-3 text-white" />}
                </div>
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-500">{m.cost}</div>
            </button>
          ))}
        </div>
      )}

      {/* ── STEP 3 — Gatilhos e comportamento ──────────────────────────── */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-100 mb-1">Gatilhos e Comportamento</h2>
            <p className="text-sm text-slate-400">Quando o agente deve agir e como deve se comportar</p>
          </div>

          {/* Trigger */}
          <div>
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Quando executar *</label>
            <div className="space-y-2">
              {TRIGGER_PRESETS.map(t => (
                <button
                  key={t}
                  onClick={() => setForm(f => ({ ...f, trigger: t }))}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                    form.trigger === t
                      ? 'border-violet-500 bg-violet-500/10 text-violet-300 font-semibold'
                      : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Zap className={`w-3.5 h-3.5 shrink-0 ${form.trigger === t ? 'text-violet-400' : 'text-slate-500'}`} />
                    {t}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Call general */}
          <div className="p-4 bg-slate-900 border border-slate-700 rounded-2xl">
            <div className="flex items-start gap-3">
              <button
                onClick={() => setForm(f => ({ ...f, callGeneral: !f.callGeneral }))}
                className={`w-10 h-6 rounded-full shrink-0 mt-0.5 transition-colors relative ${
                  form.callGeneral ? 'bg-violet-600' : 'bg-slate-700'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                  form.callGeneral ? 'left-5' : 'left-1'
                }`} />
              </button>
              <div>
                <p className="font-semibold text-slate-200 text-sm">Acionar ZIA General quando necessário</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Permite que este agente chame o agente coordenador central quando perceber situações que exigem análise mais profunda ou múltiplas ações coordenadas.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 4 — Permissões ──────────────────────────────────────────── */}
      {step === 4 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100 mb-1">Permissões de Acesso</h2>
            <p className="text-sm text-slate-400">Defina quais dados e módulos este agente pode acessar</p>
          </div>
          {form.permissions.length > 0 && (
            <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-xl">
              <p className="text-xs font-bold text-violet-400 mb-2">{form.permissions.length} permissões selecionadas</p>
              <div className="flex flex-wrap gap-1.5">
                {form.permissions.map(p => (
                  <span key={p} className="text-xs bg-violet-600/20 text-violet-300 px-2 py-0.5 rounded-lg">{p}</span>
                ))}
              </div>
            </div>
          )}
          {PERMISSION_GROUPS.map(group => (
            <div key={group.label} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 bg-slate-800/40 border-b border-slate-800">
                <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">{group.label}</p>
              </div>
              <div className="divide-y divide-slate-800/60">
                {group.items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => togglePermission(item.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800/30 transition-colors text-left"
                  >
                    <div className={`w-5 h-5 rounded-lg border-2 shrink-0 flex items-center justify-center transition-all ${
                      form.permissions.includes(item.id)
                        ? 'bg-violet-600 border-violet-600'
                        : 'border-slate-600'
                    }`}>
                      {form.permissions.includes(item.id) && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div>
                      <p className="text-sm text-slate-200 font-medium">{item.label}</p>
                      <p className="text-xs text-slate-500 font-mono">{item.id}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Navigation buttons ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-800">
        <button
          onClick={() => setStep(s => Math.max(1, s - 1))}
          disabled={step === 1}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Voltar
        </button>

        <span className="text-xs text-slate-500">Etapa {step} de {totalSteps}</span>

        {step < totalSteps ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={step === 1 && (!form.name || !form.role)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Continuar <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-colors shadow-lg shadow-emerald-900/30"
          >
            <Check className="w-4 h-4" /> Criar Agente
          </button>
        )}
      </div>
    </div>
  );
}
