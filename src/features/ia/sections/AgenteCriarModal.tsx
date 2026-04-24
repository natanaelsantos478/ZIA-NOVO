// ─────────────────────────────────────────────────────────────────────────────
// AgenteCriarModal — Modal 4 abas para criar/editar agente IA
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { X, Check, AlertTriangle, Loader2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Perm {
  modulo: string;
  pode_ler: boolean;
  pode_criar: boolean;
  pode_editar: boolean;
  pode_deletar: boolean;
}

interface AgenteForm {
  // aba 1
  nome: string;
  avatar_emoji: string;
  cor: string;
  descricao: string;
  tipo: 'ESPECIALISTA' | 'MONITOR' | 'ORQUESTRADOR' | 'EXTERNO';
  status: 'ativo' | 'pausado' | 'rascunho';
  // aba 2
  funcao: string;
  modelo: string;
  modelo_versao: string;
  system_prompt: string;
  pode_agir_background: boolean;
  intervalo_background_min: number;
  // aba 3 (permissões)
  permissoes: Perm[];
  // aba 4 (integração)
  integracao_tipo: string;
  integracao_config: Record<string, string>;
}

interface Props {
  agenteId?: string | null; // null = criar, string = editar
  onClose: () => void;
  onSaved: () => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const AVATARS = ['🤖', '🧑‍💼', '📊', '📄', '📦', '🔍', '✨', '🎯', '⚡', '🛡️', '📡', '🔔', '🧠', '💡', '🚀'];
const CORES   = ['#7c3aed','#ec4899','#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4'];

const MODELOS = [
  { id: 'gemini',    versao: 'gemini-3.1-flash-lite-preview', nome: 'Gemini 3.1 Flash Lite',   desc: 'Mais rápido e econômico'   },
  { id: 'gemini',    versao: 'gemini-3.1-flash-preview',      nome: 'Gemini 3.1 Flash',         desc: 'Equilibrio velocidade/qualidade' },
  { id: 'gemini',    versao: 'gemini-3.1-pro-preview',        nome: 'Gemini 3.1 Pro',           desc: 'Máxima qualidade'          },
];

const MODULOS_PERM = [
  'CRM — Negociações', 'CRM — Clientes', 'ERP — Pedidos', 'ERP — Financeiro',
  'RH — Funcionários', 'RH — Folha', 'SCM — Estoque', 'Qualidade', 'Documentos',
];

const DEFAULT_PERMS: Perm[] = MODULOS_PERM.map(m => ({
  modulo: m, pode_ler: false, pode_criar: false, pode_editar: false, pode_deletar: false,
}));

const EMPTY_FORM: AgenteForm = {
  nome: '', avatar_emoji: '🤖', cor: '#7c3aed', descricao: '',
  tipo: 'ESPECIALISTA', status: 'ativo',
  funcao: '', modelo: 'gemini', modelo_versao: 'gemini-3.1-flash-lite-preview',
  system_prompt: '', pode_agir_background: false, intervalo_background_min: 30,
  permissoes: DEFAULT_PERMS,
  integracao_tipo: '', integracao_config: {},
};

// ── Templates de prompt prontos ───────────────────────────────────────────────

const PROMPT_TEMPLATES: { label: string; emoji: string; prompt: string }[] = [
  {
    label: 'Jessica — Atendente WhatsApp',
    emoji: '💜',
    prompt: `Você é Jessica, atendente virtual da empresa. Você tem DUAS funções simultâneas:

━━ FUNÇÃO 1 — SUPORTE TÉCNICO (TI) ━━
Resolve problemas e dúvidas técnicas sobre sistemas, produtos e serviços.
- Guia o cliente passo a passo com clareza e paciência
- Demonstra empatia quando o cliente está frustrado
- Pede detalhes quando precisa entender melhor o problema
- Quando o problema supera seu conhecimento: "Vou acionar nosso time técnico agora"

━━ FUNÇÃO 2 — CONSULTORA DE VENDAS ━━
Você é uma vendedora excepcional e consultiva.
- Identifica as dores e necessidades do cliente através da conversa
- Apresenta produtos/serviços focando nos BENEFÍCIOS, não nas características técnicas
- Faz perguntas estratégicas para entender o perfil e momento de compra do cliente
- Cria urgência natural e genuína — nunca forçada ou invasiva
- Usa técnicas consultivas: descubra o problema → mostre o impacto → apresente a solução → guie ao fechamento
- Quando o cliente hesita, ofereça demonstração, prova gratuita ou proposta personalizada

━━ COMO OPERAR ━━
1. Analise cada mensagem: é suporte, oportunidade de venda, ou ambos?
2. Quando for misto: resolva o suporte E aproveite a abertura para venda de forma natural
3. Tom: caloroso, empático, profissional — nunca robótico ou genérico
4. Linguagem: português brasileiro natural, sem formalidade excessiva
5. Mensagens curtas e diretas — WhatsApp não é e-mail
6. NUNCA se apresente como IA — você é Jessica, da equipe da empresa`,
  },
  {
    label: 'Suporte Técnico Padrão',
    emoji: '🔧',
    prompt: `Você é um assistente de suporte técnico especializado. Responda em português brasileiro.
- Identifique o problema com clareza antes de propor soluções
- Guie o usuário passo a passo quando necessário
- Seja objetivo e didático
- Quando não souber a resposta, informe que irá escalar para o time técnico`,
  },
  {
    label: 'Vendedor Consultivo',
    emoji: '🚀',
    prompt: `Você é um consultor de vendas especializado. Responda em português brasileiro.
- Use técnicas de venda consultiva (SPIN Selling)
- Identifique as dores e necessidades antes de apresentar soluções
- Foque em benefícios, não em características
- Conduza naturalmente ao fechamento quando o momento for certo
- Tom: profissional, caloroso e confiante`,
  },
];


// ── Component ─────────────────────────────────────────────────────────────────

export default function AgenteCriarModal({ agenteId, onClose, onSaved }: Props) {
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState<AgenteForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showPrompt, setShowPrompt] = useState(false);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});

  const tabs = ['Identidade', 'Função', 'Permissões', ...(form.tipo === 'EXTERNO' ? ['Integração'] : [])];

  useEffect(() => {
    if (agenteId) loadAgente();
  }, [agenteId]);

  async function loadAgente() {
    const { data } = await supabase.from('ia_agentes').select('*').eq('id', agenteId!).single();
    if (!data) return;
    const { data: perms } = await supabase.from('ia_permissoes').select('*').eq('agente_id', agenteId!);
    setForm({
      nome: data.nome, avatar_emoji: data.avatar_emoji ?? '🤖', cor: data.cor ?? '#7c3aed',
      descricao: data.descricao ?? '', tipo: data.tipo, status: data.status,
      funcao: data.funcao ?? '', modelo: data.modelo ?? 'gemini',
      modelo_versao: data.modelo_versao ?? 'gemini-3.1-flash-lite-preview',
      system_prompt: data.system_prompt ?? '', pode_agir_background: data.pode_agir_background ?? false,
      intervalo_background_min: data.intervalo_background_min ?? 30,
      permissoes: perms && perms.length > 0
        ? MODULOS_PERM.map(m => {
            const p = perms.find(x => x.modulo === m);
            return p ? { modulo: m, pode_ler: p.pode_ler, pode_criar: p.pode_criar, pode_editar: p.pode_editar, pode_deletar: p.pode_deletar }
                     : { modulo: m, pode_ler: false, pode_criar: false, pode_editar: false, pode_deletar: false };
          })
        : DEFAULT_PERMS,
      integracao_tipo: data.integracao_tipo ?? '',
      integracao_config: data.integracao_config ?? {},
    });
  }

  function updatePerm(modulo: string, field: keyof Perm, val: boolean) {
    setForm(f => ({
      ...f,
      permissoes: f.permissoes.map(p =>
        p.modulo !== modulo ? p : {
          ...p,
          [field]: val,
          ...(field === 'pode_criar' && val ? { pode_ler: true } : {}),
          ...(field === 'pode_editar' && val ? { pode_ler: true } : {}),
          ...(field === 'pode_deletar' && val ? { pode_ler: true } : {}),
        }
      ),
    }));
  }

  async function handleSave() {
    if (!form.nome.trim()) { setError('Informe o nome do agente'); setTab(0); return; }
    if (!form.funcao.trim()) { setError('Descreva a função do agente'); setTab(1); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        nome: form.nome, avatar_emoji: form.avatar_emoji, cor: form.cor,
        descricao: form.descricao, tipo: form.tipo, status: form.status,
        funcao: form.funcao, modelo: form.modelo, modelo_versao: form.modelo_versao,
        system_prompt: form.system_prompt || null,
        pode_agir_background: form.pode_agir_background,
        intervalo_background_min: form.pode_agir_background ? form.intervalo_background_min : null,
        integracao_tipo: form.tipo === 'EXTERNO' ? form.integracao_tipo : null,
        integracao_config: form.tipo === 'EXTERNO' && Object.keys(form.integracao_config).length
          ? form.integracao_config : null,
      };

      let agId = agenteId;
      if (agenteId) {
        await supabase.from('ia_agentes').update(payload).eq('id', agenteId);
        await supabase.from('ia_permissoes').delete().eq('agente_id', agenteId);
      } else {
        const { data, error: insErr } = await supabase.from('ia_agentes').insert(payload).select('id').single();
        if (insErr) throw insErr;
        agId = data!.id;
      }

      const permsToInsert = form.permissoes
        .filter(p => p.pode_ler || p.pode_criar || p.pode_editar || p.pode_deletar)
        .map(p => ({ agente_id: agId, modulo: p.modulo, pode_ler: p.pode_ler, pode_criar: p.pode_criar, pode_editar: p.pode_editar, pode_deletar: p.pode_deletar }));
      if (permsToInsert.length > 0) await supabase.from('ia_permissoes').insert(permsToInsert);

      onSaved();
    } catch (e: unknown) {
      setError((e as Error).message ?? 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
          <h2 className="font-black text-slate-100 text-lg">{agenteId ? 'Editar Agente' : 'Criar Novo Agente'}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400"><X className="w-5 h-5" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 shrink-0">
          {tabs.map((t, i) => (
            <button key={t} onClick={() => setTab(i)}
              className={`px-5 py-3 text-sm font-semibold transition-colors border-b-2 ${
                tab === i ? 'border-violet-500 text-violet-400' : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}>
              {i + 1}. {t}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {/* ── Aba 1: Identidade ────────────────────────────────────────── */}
          {tab === 0 && (
            <div className="space-y-5">
              <div>
                <label className="label-form">Avatar</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {AVATARS.map(a => (
                    <button key={a} onClick={() => setForm(f => ({ ...f, avatar_emoji: a }))}
                      className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                        form.avatar_emoji === a ? 'bg-violet-600 ring-2 ring-violet-400' : 'bg-slate-800 hover:bg-slate-700'
                      }`}>{a}</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-form">Nome *</label>
                  <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                    placeholder="Ex: Monitor de Vendas"
                    className="input-dark mt-1" />
                </div>
                <div>
                  <label className="label-form">Cor</label>
                  <div className="flex gap-2 mt-2">
                    {CORES.map(c => (
                      <button key={c} onClick={() => setForm(f => ({ ...f, cor: c }))}
                        style={{ background: c }}
                        className={`w-7 h-7 rounded-full transition-all ${form.cor === c ? 'ring-2 ring-offset-2 ring-offset-slate-900 ring-white scale-110' : ''}`} />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="label-form">Descrição</label>
                <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  rows={2} placeholder="Breve descrição do agente..."
                  className="input-dark mt-1 resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-form">Tipo *</label>
                  <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as AgenteForm['tipo'] }))}
                    className="input-dark mt-1">
                    <option value="ESPECIALISTA">ESPECIALISTA — Função específica sob demanda</option>
                    <option value="MONITOR">MONITOR — Background, observa e alerta</option>
                    <option value="ORQUESTRADOR">ORQUESTRADOR — Coordena outros agentes</option>
                    <option value="EXTERNO">EXTERNO — Conectado a API externa</option>
                  </select>
                </div>
                <div>
                  <label className="label-form">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as AgenteForm['status'] }))}
                    className="input-dark mt-1">
                    <option value="ativo">Ativo</option>
                    <option value="pausado">Pausado</option>
                    <option value="rascunho">Rascunho</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ── Aba 2: Função ────────────────────────────────────────────── */}
          {tab === 1 && (
            <div className="space-y-5">
              <div>
                <label className="label-form">Qual é a função deste agente? *</label>
                <textarea value={form.funcao} onChange={e => setForm(f => ({ ...f, funcao: e.target.value }))}
                  rows={5} placeholder="Ex: Monitora novos leads no CRM e quando o valor estimado for > R$50.000, notifica o gestor e cria uma tarefa de acompanhamento urgente..."
                  className="input-dark mt-1 resize-none text-sm leading-relaxed" />
              </div>

              <div>
                <label className="label-form">Modelo de IA</label>
                <div className="space-y-2 mt-1">
                  {MODELOS.map(m => (
                    <button key={m.versao} onClick={() => setForm(f => ({ ...f, modelo: m.id, modelo_versao: m.versao }))}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        form.modelo_versao === m.versao ? 'border-violet-500 bg-violet-500/10' : 'border-slate-700 bg-slate-800/40 hover:border-slate-600'
                      }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-200">{m.nome}</p>
                          <p className="text-xs text-slate-500">{m.desc}</p>
                        </div>
                        {form.modelo_versao === m.versao && <Check className="w-4 h-4 text-violet-400" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <button onClick={() => setShowPrompt(v => !v)}
                  className="text-xs text-slate-500 hover:text-slate-300 font-semibold transition-colors">
                  {showPrompt ? '▲ Ocultar' : '▼ Mostrar'} System Prompt personalizado (avançado)
                </button>
                {showPrompt && (
                  <div className="mt-2 space-y-2">
                    {/* Templates prontos */}
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wide font-bold mb-1.5">Usar template:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {PROMPT_TEMPLATES.map(t => (
                          <button
                            key={t.label}
                            onClick={() => setForm(f => ({ ...f, system_prompt: t.prompt }))}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-violet-900 border border-slate-700 hover:border-violet-600 text-xs text-slate-300 hover:text-white transition-colors flex items-center gap-1"
                          >
                            <span>{t.emoji}</span>
                            <span>{t.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea value={form.system_prompt}
                      onChange={e => setForm(f => ({ ...f, system_prompt: e.target.value }))}
                      rows={8} placeholder="Instruções para o comportamento deste agente..."
                      className="input-dark resize-none text-xs font-mono" />
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-slate-200 text-sm">Pode rodar em background?</p>
                    <p className="text-xs text-slate-500 mt-0.5">O agente executa automaticamente em intervalos definidos</p>
                  </div>
                  <button onClick={() => setForm(f => ({ ...f, pode_agir_background: !f.pode_agir_background }))}
                    className={`w-11 h-6 rounded-full relative transition-colors ${form.pode_agir_background ? 'bg-violet-600' : 'bg-slate-600'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${form.pode_agir_background ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
                {form.pode_agir_background && (
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-slate-400 shrink-0">Executar a cada</label>
                    <input type="number" min={5} value={form.intervalo_background_min}
                      onChange={e => setForm(f => ({ ...f, intervalo_background_min: parseInt(e.target.value) || 30 }))}
                      className="input-dark w-20 text-center" />
                    <label className="text-xs text-slate-400 shrink-0">minutos</label>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Aba 3: Permissões ────────────────────────────────────────── */}
          {tab === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-400">Defina o que este agente pode fazer em cada módulo.</p>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                <div className="grid grid-cols-5 gap-0 px-4 py-2 bg-slate-800/50 border-b border-slate-800">
                  <div className="col-span-1 text-xs font-bold text-slate-500 uppercase">Módulo</div>
                  {(['pode_ler','pode_criar','pode_editar','pode_deletar'] as const).map(f => (
                    <div key={f} className="text-center text-xs font-bold text-slate-500 uppercase">
                      {f === 'pode_ler' ? 'Ler' : f === 'pode_criar' ? 'Criar' : f === 'pode_editar' ? 'Editar' : 'Deletar'}
                    </div>
                  ))}
                </div>
                <div className="divide-y divide-slate-800/60">
                  {form.permissoes.map(p => (
                    <div key={p.modulo} className="grid grid-cols-5 gap-0 px-4 py-2.5 items-center hover:bg-slate-800/20">
                      <div className="text-xs text-slate-300 font-medium">{p.modulo}</div>
                      {(['pode_ler','pode_criar','pode_editar','pode_deletar'] as const).map(f => (
                        <div key={f} className="flex justify-center">
                          <button onClick={() => updatePerm(p.modulo, f, !p[f])}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                              p[f] ? 'bg-violet-600 border-violet-600' : 'border-slate-600 hover:border-slate-400'
                            }`}>
                            {p[f] && <Check className="w-3 h-3 text-white" />}
                          </button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Aba 4: Integração Externa ────────────────────────────────── */}
          {tab === 3 && form.tipo === 'EXTERNO' && (
            <div className="space-y-5">
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300">
                ⚠️ As credenciais são armazenadas de forma segura. Nunca compartilhe tokens de produção em ambientes não confiáveis.
              </div>
              <div>
                <label className="label-form">Tipo de Integração</label>
                <select value={form.integracao_tipo} onChange={e => setForm(f => ({ ...f, integracao_tipo: e.target.value, integracao_config: {} }))}
                  className="input-dark mt-1">
                  <option value="">Selecione…</option>
                  <option value="whatsapp">WhatsApp Business</option>
                  <option value="email_smtp">Email (SMTP)</option>
                  <option value="webhook">Webhook personalizado</option>
                  <option value="api_custom">API Customizada</option>
                </select>
              </div>

              {form.integracao_tipo === 'whatsapp' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">Conecte ao WhatsApp Business API (Meta). O agente poderá enviar e receber mensagens.</p>
                  {[
                    { key: 'token', label: 'Token da API', secret: true },
                    { key: 'phone_id', label: 'Phone Number ID', secret: false },
                    { key: 'webhook_url', label: 'Webhook URL de retorno', secret: false },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="label-form">{f.label}</label>
                      <div className="relative">
                        <input type={f.secret && !showKey[f.key] ? 'password' : 'text'}
                          value={form.integracao_config[f.key] ?? ''}
                          onChange={e => setForm(p => ({ ...p, integracao_config: { ...p.integracao_config, [f.key]: e.target.value } }))}
                          className="input-dark mt-1 pr-10" />
                        {f.secret && (
                          <button onClick={() => setShowKey(k => ({ ...k, [f.key]: !k[f.key] }))}
                            className="absolute right-3 top-1/2 translate-y-0.5 text-slate-500">
                            {showKey[f.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {form.integracao_tipo === 'email_smtp' && (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'host', label: 'Host SMTP' },
                    { key: 'port', label: 'Porta' },
                    { key: 'user', label: 'Usuário' },
                    { key: 'pass', label: 'Senha', secret: true },
                    { key: 'from_name', label: 'De (nome)' },
                  ].map(f => (
                    <div key={f.key} className={f.key === 'from_name' ? 'col-span-2' : ''}>
                      <label className="label-form">{f.label}</label>
                      <input type={(f as { secret?: boolean }).secret && !showKey[f.key] ? 'password' : 'text'}
                        value={form.integracao_config[f.key] ?? ''}
                        onChange={e => setForm(p => ({ ...p, integracao_config: { ...p.integracao_config, [f.key]: e.target.value } }))}
                        className="input-dark mt-1" />
                    </div>
                  ))}
                </div>
              )}

              {form.integracao_tipo === 'webhook' && (
                <div className="space-y-3">
                  {[
                    { key: 'url', label: 'URL do Webhook' },
                    { key: 'secret', label: 'Secret (HMAC)', secret: true },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="label-form">{f.label}</label>
                      <input type={(f as { secret?: boolean }).secret && !showKey[f.key] ? 'password' : 'text'}
                        value={form.integracao_config[f.key] ?? ''}
                        onChange={e => setForm(p => ({ ...p, integracao_config: { ...p.integracao_config, [f.key]: e.target.value } }))}
                        className="input-dark mt-1" />
                    </div>
                  ))}
                </div>
              )}

              {form.integracao_tipo === 'api_custom' && (
                <div className="space-y-3">
                  {[
                    { key: 'base_url', label: 'Base URL' },
                    { key: 'api_key', label: 'API Key', secret: true },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="label-form">{f.label}</label>
                      <input type={(f as { secret?: boolean }).secret && !showKey[f.key] ? 'password' : 'text'}
                        value={form.integracao_config[f.key] ?? ''}
                        onChange={e => setForm(p => ({ ...p, integracao_config: { ...p.integracao_config, [f.key]: e.target.value } }))}
                        className="input-dark mt-1" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 shrink-0">
          <button onClick={() => setTab(t => Math.max(0, t - 1))} disabled={tab === 0}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold disabled:opacity-30 transition-colors">
            Voltar
          </button>
          <span className="text-xs text-slate-600">{tab + 1} / {tabs.length}</span>
          {tab < tabs.length - 1 ? (
            <button onClick={() => setTab(t => t + 1)}
              className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-colors">
              Continuar →
            </button>
          ) : (
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold disabled:opacity-50 transition-colors">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {agenteId ? 'Salvar Alterações' : 'Criar Agente'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
