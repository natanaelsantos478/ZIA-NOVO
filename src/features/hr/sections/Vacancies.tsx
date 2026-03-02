import { useState } from 'react';
import {
  Plus, Search, Filter, MoreHorizontal, Users,
  Clock, TrendingUp, CheckCircle, XCircle, Sparkles,
  MapPin, Briefcase, MessageSquare, Send, Link2, Copy,
  ExternalLink, Eye, EyeOff, FileText, Brain, Globe,
} from 'lucide-react';
import { useVacancies, type PublishedVacancy, type DesiredProfiles } from '../../../context/VacanciesContext';

const SUB_TABS = [
  { id: 'board',    label: 'ZIAvagas'         },
  { id: 'new',      label: 'Nova Vaga'        },
  { id: 'closed',   label: 'Vagas Encerradas' },
  { id: 'analysis', label: 'Análise'          },
  { id: 'zia',      label: 'Converse com ZIA' },
];

const PRIORITY_BADGE: Record<string, string> = {
  'Alta':  'bg-rose-100 text-rose-700',
  'Média': 'bg-amber-100 text-amber-700',
  'Baixa': 'bg-slate-100 text-slate-600',
};

const STAGE_BADGE: Record<string, string> = {
  'Triagem':        'bg-blue-100 text-blue-700',
  'Entrevistas':    'bg-indigo-100 text-indigo-700',
  'Teste Técnico':  'bg-amber-100 text-amber-700',
  'Proposta':       'bg-green-100 text-green-700',
  'Aprovação':      'bg-pink-100 text-pink-700',
};

const MODALITY_COLOR: Record<string, string> = {
  'Remoto':     'bg-green-50 text-green-600',
  'Híbrido':    'bg-blue-50 text-blue-600',
  'Presencial': 'bg-slate-100 text-slate-600',
};

const PROFILE_INFO = {
  executor:     { label: 'Executor',     desc: 'Focado em resultados, ação e entregas rápidas',         color: 'bg-rose-50 border-rose-200 text-rose-700'    },
  analitico:    { label: 'Analítico',    desc: 'Metódico, detalhista e orientado por dados',            color: 'bg-blue-50 border-blue-200 text-blue-700'    },
  comunicador:  { label: 'Comunicador',  desc: 'Habilidade interpessoal, colaborativo e empático',      color: 'bg-amber-50 border-amber-200 text-amber-700' },
  planejador:   { label: 'Planejador',   desc: 'Organizado, estratégico e focado em processos',         color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
} as const;

function getPublicUrl(slug: string) {
  return `${window.location.origin}/vagas/${slug}`;
}

/* ───────────────────────────── BOARD TAB ───────────────────────────── */

function BoardTab({ onNewVaga }: { onNewVaga: () => void }) {
  const { vacancies } = useVacancies();
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const filtered = vacancies.filter((v) =>
    v.title.toLowerCase().includes(search.toLowerCase()) ||
    v.dept.toLowerCase().includes(search.toLowerCase()),
  );

  const stats = [
    { label: 'Vagas Abertas',     value: String(vacancies.filter(v => v.stage !== 'Aprovação').length), icon: Briefcase,  color: 'text-pink-600 bg-pink-50' },
    { label: 'Candidatos Totais', value: String(vacancies.reduce((s, v) => s + v.candidateCount, 0)),   icon: Users,      color: 'text-blue-600 bg-blue-50' },
    { label: 'TMA (dias)',        value: '31',                                                            icon: Clock,      color: 'text-amber-600 bg-amber-50' },
    { label: 'Taxa de Conversão', value: '4,1%',                                                          icon: TrendingUp, color: 'text-green-600 bg-green-50' },
  ];

  function copyLink(slug: string) {
    navigator.clipboard.writeText(getPublicUrl(slug));
    setCopied(slug);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs text-slate-500">{s.label}</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">{s.value}</p>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar vagas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400 w-full"
          />
        </div>
        <button className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
          <Filter className="w-4 h-4" /> Filtros
        </button>
        <button
          onClick={onNewVaga}
          className="flex items-center gap-2 px-3 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium ml-auto"
        >
          <Plus className="w-4 h-4" /> Nova Vaga
        </button>
      </div>

      <div className="space-y-3">
        {filtered.map((v) => (
          <div key={v.id} className="bg-slate-50 rounded-xl border border-slate-100 p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-semibold text-slate-800 text-sm">{v.title}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${PRIORITY_BADGE[v.priority]}`}>
                    {v.priority}
                  </span>
                  {v.requireProfileAnalysis && (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-50 text-purple-600">
                      <Brain className="w-3 h-3" /> Perfil
                    </span>
                  )}
                  {v.acceptPrintedResume && (
                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500">
                      <FileText className="w-3 h-3" /> Impresso
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                  <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{v.dept}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{v.location}</span>
                  <span className={`px-2 py-0.5 rounded-full font-medium ${MODALITY_COLOR[v.modality]}`}>{v.modality}</span>
                  <span className="bg-slate-200/70 px-2 py-0.5 rounded font-medium">{v.type}</span>
                  <span className="flex items-center gap-1">
                    {v.salaryVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {v.salaryVisible ? v.salary : 'A combinar'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4 shrink-0">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${STAGE_BADGE[v.stage]}`}>
                  {v.stage}
                </span>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-700">{v.candidateCount}</p>
                  <p className="text-[10px] text-slate-400">candidatos</p>
                </div>
                <button
                  title="Copiar link público"
                  onClick={() => copyLink(v.slug)}
                  className="text-slate-400 hover:text-pink-600 transition-colors"
                >
                  {copied === v.slug ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
                <a
                  href={`/vagas/${v.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  title="Ver vaga no portal público"
                  className="text-slate-400 hover:text-pink-600 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button className="text-slate-400 hover:text-slate-600">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── NEW VACANCY TAB ────────────────────────── */

interface FormData {
  // Step 1 — Dados da Vaga
  title: string;
  dept: string;
  type: string;
  modality: string;
  location: string;
  description: string;
  salary: string;
  salaryVisible: boolean;

  // Step 2 — Requisitos & Perfil
  requirements: string;
  niceToHave: string;
  acceptPrintedResume: boolean;
  requireProfileAnalysis: boolean;
  desiredProfiles: DesiredProfiles;

  // Step 3 — Publicação
  deadline: string;
  priority: string;
}

const EMPTY_FORM: FormData = {
  title: '',
  dept: '',
  type: 'CLT',
  modality: 'Híbrido',
  location: '',
  description: '',
  salary: '',
  salaryVisible: true,
  requirements: '',
  niceToHave: '',
  acceptPrintedResume: false,
  requireProfileAnalysis: false,
  desiredProfiles: { executor: false, analitico: false, comunicador: false, planejador: false },
  deadline: '',
  priority: 'Média',
};

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-pink-500' : 'bg-slate-300'}`}
      >
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </div>
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  );
}

function NewVacancyTab() {
  const { publishVacancy } = useVacancies();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [published, setPublished] = useState<PublishedVacancy | null>(null);
  const [copied, setCopied] = useState(false);

  const set = (k: keyof FormData, v: unknown) => setForm((p) => ({ ...p, [k]: v }));
  const setProfile = (k: keyof DesiredProfiles, v: boolean) =>
    setForm((p) => ({ ...p, desiredProfiles: { ...p.desiredProfiles, [k]: v } }));

  const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400';
  const selectCls = `${inputCls} bg-white`;

  function handlePublish() {
    const v = publishVacancy({
      title: form.title || 'Nova Vaga',
      dept: form.dept || 'Geral',
      type: form.type as PublishedVacancy['type'],
      location: form.location || 'Remoto',
      modality: form.modality as PublishedVacancy['modality'],
      description: form.description,
      requirements: form.requirements,
      niceToHave: form.niceToHave,
      salary: form.salary,
      salaryVisible: form.salaryVisible,
      acceptPrintedResume: form.acceptPrintedResume,
      requireProfileAnalysis: form.requireProfileAnalysis,
      desiredProfiles: form.desiredProfiles,
      priority: form.priority as PublishedVacancy['priority'],
      deadline: form.deadline,
    });
    setPublished(v);
  }

  function copyLink() {
    if (!published) return;
    navigator.clipboard.writeText(getPublicUrl(published.slug));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function reset() {
    setForm(EMPTY_FORM);
    setStep(1);
    setPublished(null);
    setCopied(false);
  }

  // ── Sucesso ──
  if (published) {
    return (
      <div className="max-w-2xl">
        <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-green-800 mb-1">Vaga publicada com sucesso!</h2>
          <p className="text-sm text-green-600 mb-6">
            <strong>{published.title}</strong> já está disponível no portal de vagas.
          </p>

          {/* Link público */}
          <div className="bg-white rounded-xl border border-green-200 p-4 mb-4">
            <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" /> Link público da vaga
            </p>
            <div className="flex items-center gap-2">
              <span className="flex-1 text-sm text-slate-700 bg-slate-50 px-3 py-2 rounded-lg font-mono truncate border border-slate-200">
                {getPublicUrl(published.slug)}
              </span>
              <button
                onClick={copyLink}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  copied ? 'bg-green-600 text-white' : 'bg-pink-600 text-white hover:bg-pink-700'
                }`}
              >
                {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
              <a
                href={`/vagas/${published.slug}`}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
              >
                <ExternalLink className="w-4 h-4" /> Ver
              </a>
            </div>
          </div>

          {/* Info badges */}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {published.requireProfileAnalysis && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                <Brain className="w-3.5 h-3.5" /> Análise de perfil ativa
              </span>
            )}
            {published.acceptPrintedResume && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                <FileText className="w-3.5 h-3.5" /> Currículo impresso aceito
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-700">
              {published.salaryVisible ? `Salário: ${published.salary}` : 'Salário: A combinar'}
            </span>
          </div>

          <div className="flex justify-center gap-3">
            <button
              onClick={reset}
              className="px-5 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              Criar outra vaga
            </button>
            <a
              href={`/vagas/${published.slug}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-pink-600 rounded-lg hover:bg-pink-700"
            >
              <Globe className="w-4 h-4" /> Abrir portal
            </a>
          </div>
        </div>
      </div>
    );
  }

  const STEP_LABELS = ['Dados da Vaga', 'Requisitos & Perfil', 'Publicação'];

  return (
    <div className="max-w-2xl">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                s <= step ? 'bg-pink-600 text-white' : 'bg-slate-200 text-slate-500'
              }`}
            >
              {s}
            </div>
            <span className={`text-sm ${s <= step ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
              {STEP_LABELS[s - 1]}
            </span>
            {s < 3 && <div className={`w-12 h-0.5 ${s < step ? 'bg-pink-400' : 'bg-slate-200'}`} />}
          </div>
        ))}
      </div>

      {/* ── STEP 1: Dados da Vaga ── */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Título da Vaga *</label>
              <input
                type="text"
                placeholder="Ex: Desenvolvedor Full Stack Sênior"
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Departamento *</label>
              <select value={form.dept} onChange={(e) => set('dept', e.target.value)} className={selectCls}>
                <option value="">Selecionar...</option>
                <option>TI – Desenvolvimento</option>
                <option>TI – Dados</option>
                <option>TI – Infraestrutura</option>
                <option>Comercial & Vendas</option>
                <option>Comercial – CS</option>
                <option>Recursos Humanos</option>
                <option>Financeiro</option>
                <option>Marketing</option>
                <option>Produto</option>
                <option>Operações</option>
                <option>Qualidade</option>
                <option>Jurídico</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tipo de Contrato *</label>
              <select value={form.type} onChange={(e) => set('type', e.target.value)} className={selectCls}>
                <option>CLT</option>
                <option>PJ</option>
                <option>Estágio</option>
                <option>Temporário</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Modalidade</label>
              <select value={form.modality} onChange={(e) => set('modality', e.target.value)} className={selectCls}>
                <option>Híbrido</option>
                <option>Remoto</option>
                <option>Presencial</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Localização</label>
              <input
                type="text"
                placeholder="Ex: São Paulo, SP"
                value={form.location}
                onChange={(e) => set('location', e.target.value)}
                className={inputCls}
              />
            </div>

            {/* Faixa salarial + visibilidade */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Faixa Salarial</label>
              <input
                type="text"
                placeholder="Ex: R$ 8.000 – R$ 12.000"
                value={form.salary}
                onChange={(e) => set('salary', e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="flex flex-col justify-end gap-2">
              <label className="block text-xs font-semibold text-slate-600">Exibição do Salário</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => set('salaryVisible', true)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                    form.salaryVisible
                      ? 'bg-pink-600 text-white border-pink-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" /> Exibir valor
                </button>
                <button
                  type="button"
                  onClick={() => set('salaryVisible', false)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                    !form.salaryVisible
                      ? 'bg-pink-600 text-white border-pink-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <EyeOff className="w-3.5 h-3.5" /> A combinar
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Descrição da Vaga</label>
            <textarea
              rows={5}
              placeholder="Descreva as responsabilidades, o contexto do time e o impacto do cargo..."
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              className={`${inputCls} resize-none`}
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-2 text-sm font-semibold text-white bg-pink-600 rounded-lg hover:bg-pink-700"
            >
              Próximo →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Requisitos & Perfil ── */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Requisitos Obrigatórios</label>
            <textarea
              rows={4}
              placeholder="• Graduação em Ciência da Computação ou área relacionada&#10;• 5+ anos de experiência com React e Node.js"
              value={form.requirements}
              onChange={(e) => set('requirements', e.target.value)}
              className={`${inputCls} resize-none`}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Requisitos Desejáveis</label>
            <textarea
              rows={3}
              placeholder="• Experiência com TypeScript&#10;• Conhecimento em AWS / GCP"
              value={form.niceToHave}
              onChange={(e) => set('niceToHave', e.target.value)}
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Opções adicionais */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Configurações de Candidatura</p>

            <Toggle
              checked={form.acceptPrintedResume}
              onChange={(v) => set('acceptPrintedResume', v)}
              label="Aceitar currículo impresso"
            />

            <Toggle
              checked={form.requireProfileAnalysis}
              onChange={(v) => set('requireProfileAnalysis', v)}
              label="Exigir análise de perfil comportamental"
            />

            {form.requireProfileAnalysis && (
              <div className="pl-4 border-l-2 border-pink-200">
                <p className="text-xs font-semibold text-slate-600 mb-3">
                  Perfis desejados para esta vaga:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(PROFILE_INFO) as (keyof typeof PROFILE_INFO)[]).map((key) => {
                    const info = PROFILE_INFO[key];
                    const active = form.desiredProfiles[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setProfile(key, !active)}
                        className={`flex items-start gap-2 p-3 rounded-xl border-2 text-left transition-all ${
                          active ? info.color : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border-2 mt-0.5 shrink-0 flex items-center justify-center ${
                          active ? 'bg-current border-current' : 'border-slate-300'
                        }`}>
                          {active && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                        <div>
                          <p className="text-xs font-bold">{info.label}</p>
                          <p className="text-[11px] leading-snug opacity-80">{info.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  O candidato responderá um questionário rápido no portal e ZIA irá classificar automaticamente o perfil.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-between pt-2">
            <button onClick={() => setStep(1)} className="px-6 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">
              ← Voltar
            </button>
            <button onClick={() => setStep(3)} className="px-6 py-2 text-sm font-semibold text-white bg-pink-600 rounded-lg hover:bg-pink-700">
              Próximo →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Publicação ── */}
      {step === 3 && (
        <div className="space-y-4">
          {/* ZIA notice */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">ZIA vai distribuir automaticamente</p>
              <p className="text-xs text-green-600 mt-0.5">
                A vaga será publicada no portal ZIAvagas e um link exclusivo será gerado para divulgação.
              </p>
            </div>
          </div>

          {/* Preview do link */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5" /> Link público que será gerado
            </p>
            <div className="bg-white rounded-lg border border-slate-200 px-3 py-2 text-xs font-mono text-slate-500 truncate">
              {window.location.origin}/vagas/
              <span className="text-pink-600">
                {form.title
                  ? `vXXX-${form.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').slice(0, 40)}`
                  : 'slug-da-vaga'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Prazo para candidaturas</label>
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => set('deadline', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Prioridade</label>
              <div className="flex gap-2 h-[38px]">
                {(['Alta', 'Média', 'Baixa'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => set('priority', p)}
                    className={`flex-1 text-sm rounded-lg border font-medium transition-colors ${
                      form.priority === p
                        ? p === 'Alta'   ? 'bg-rose-600 text-white border-rose-600'
                        : p === 'Média'  ? 'bg-amber-500 text-white border-amber-500'
                        :                  'bg-slate-600 text-white border-slate-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Resumo */}
          <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-1.5">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Resumo da vaga</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-600">
              <span><strong>Cargo:</strong> {form.title || '—'}</span>
              <span><strong>Depto:</strong> {form.dept || '—'}</span>
              <span><strong>Tipo:</strong> {form.type}</span>
              <span><strong>Modalidade:</strong> {form.modality}</span>
              <span><strong>Salário:</strong> {form.salaryVisible ? (form.salary || '—') : 'A combinar'}</span>
              <span><strong>Currículo impresso:</strong> {form.acceptPrintedResume ? 'Sim' : 'Não'}</span>
              <span><strong>Análise de perfil:</strong> {form.requireProfileAnalysis ? 'Sim' : 'Não'}</span>
              {form.requireProfileAnalysis && (
                <span className="col-span-2">
                  <strong>Perfis:</strong>{' '}
                  {Object.entries(form.desiredProfiles)
                    .filter(([, v]) => v)
                    .map(([k]) => PROFILE_INFO[k as keyof typeof PROFILE_INFO].label)
                    .join(', ') || 'Nenhum selecionado'}
                </span>
              )}
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <button onClick={() => setStep(2)} className="px-6 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">
              ← Voltar
            </button>
            <button
              onClick={handlePublish}
              className="flex items-center gap-2 px-6 py-2 text-sm font-semibold text-white bg-pink-600 rounded-lg hover:bg-pink-700"
            >
              <Globe className="w-4 h-4" /> Publicar Vaga
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── CLOSED TAB ────────────────────────────── */

const CLOSED_VACANCIES = [
  { id: 'VC001', title: 'Analista de RH Pleno',       hiredName: 'Ana Silva',       closeDate: '2024-12-15', duration: '28 dias', candidates: 56 },
  { id: 'VC002', title: 'Desenvolvedor React Sênior', hiredName: 'Carlos Mendes',   closeDate: '2024-12-01', duration: '35 dias', candidates: 74 },
  { id: 'VC003', title: 'Coord. de Customer Success', hiredName: 'Mariana Fonseca', closeDate: '2024-11-20', duration: '42 dias', candidates: 38 },
  { id: 'VC004', title: 'Analista Financeiro Sênior', hiredName: 'Rodrigo Lima',    closeDate: '2024-11-05', duration: '21 dias', candidates: 29 },
];

function ClosedTab() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            {['Cargo', 'Contratado(a)', 'Data de Encerramento', 'Duração', 'Candidatos', 'Status'].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {CLOSED_VACANCIES.map((v) => (
            <tr key={v.id} className="hover:bg-slate-50/60 transition-colors">
              <td className="px-4 py-3 font-medium text-slate-800">{v.title}</td>
              <td className="px-4 py-3 text-slate-700 font-medium">{v.hiredName}</td>
              <td className="px-4 py-3 text-slate-500">{v.closeDate}</td>
              <td className="px-4 py-3 text-slate-600">{v.duration}</td>
              <td className="px-4 py-3 text-slate-600">{v.candidates}</td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  <CheckCircle className="w-3 h-3" /> Preenchida
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─────────────────────────── ANALYSIS TAB ──────────────────────────── */

function AnalysisTab() {
  const metrics = [
    { label: 'Tempo Médio de Atração (TMA)', value: '31 dias',  detail: 'Meta: < 30 dias',    ok: false },
    { label: 'Custo por Contratação (CPC)',   value: 'R$ 2.840', detail: 'Meta: < R$ 3.000',   ok: true  },
    { label: 'Taxa de Aceite de Proposta',    value: '87,5%',   detail: 'Meta: > 85%',         ok: true  },
    { label: 'Retenção 90 dias',             value: '94,1%',   detail: 'Meta: > 90%',         ok: true  },
    { label: 'Candidatos por Vaga',           value: '52,7',    detail: 'Média últimos 90d',   ok: true  },
    { label: 'Funil de Conversão',            value: '4,1%',    detail: 'Candidato → Admitido', ok: null },
  ];

  return (
    <div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {metrics.map((m) => (
          <div key={m.label} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <p className="text-xs text-slate-500 mb-2">{m.label}</p>
            <p className="text-2xl font-bold text-slate-800 mb-1">{m.value}</p>
            <div className="flex items-center gap-1">
              {m.ok === true  && <CheckCircle className="w-3 h-3 text-green-500" />}
              {m.ok === false && <XCircle className="w-3 h-3 text-rose-500" />}
              <span className={`text-xs ${m.ok === true ? 'text-green-600' : m.ok === false ? 'text-rose-600' : 'text-slate-400'}`}>{m.detail}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
        <h3 className="font-semibold text-slate-700 mb-4">Funil de Recrutamento (últimos 90 dias)</h3>
        {[
          { stage: 'Candidaturas Recebidas', count: 316, pct: 100 },
          { stage: 'Triagem Aprovada',        count: 148, pct: 47  },
          { stage: 'Entrevista RH',           count: 62,  pct: 20  },
          { stage: 'Entrevista Técnica',      count: 28,  pct: 9   },
          { stage: 'Proposta Enviada',        count: 14,  pct: 4.4 },
          { stage: 'Admitidos',               count: 13,  pct: 4.1 },
        ].map((f) => (
          <div key={f.stage} className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-600 font-medium">{f.stage}</span>
              <span className="text-slate-500">{f.count} ({f.pct}%)</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div className="bg-pink-500 h-2 rounded-full" style={{ width: `${f.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── ZIA CHAT TAB ──────────────────────────── */

function ZIAChatTab() {
  const [messages] = useState([
    { from: 'zia', text: 'Olá! Sou a ZIA, sua assistente de recrutamento. Posso te ajudar a analisar candidatos, criar critérios de avaliação, redigir descrições de vagas ou consultar métricas do ATS. Como posso te ajudar hoje?' },
    { from: 'user', text: 'Quantos candidatos temos na vaga de Dev Full Stack Sênior?' },
    { from: 'zia', text: 'A vaga V001 – Desenvolvedor Full Stack Sênior (aberta em 10/01/2025) possui 42 candidatos no momento. Atualmente está na etapa de Entrevistas. Gostaria que eu filtrasse os candidatos com mais de 5 anos de experiência em React?' },
  ]);
  const [input, setInput] = useState('');

  return (
    <div className="flex flex-col h-[480px]">
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.from === 'zia' && (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center mr-2 shrink-0 mt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
            )}
            <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
              m.from === 'user'
                ? 'bg-pink-600 text-white rounded-br-sm'
                : 'bg-white border border-slate-200 text-slate-700 rounded-bl-sm shadow-sm'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
        <input
          type="text"
          placeholder="Pergunte sobre candidatos, vagas ou métricas..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400"
        />
        <button className="p-2.5 bg-pink-600 text-white rounded-xl hover:bg-pink-700 transition-colors">
          <Send className="w-4 h-4" />
        </button>
        <button className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors">
          <MessageSquare className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────── MAIN EXPORT ───────────────────────────── */

export default function Vacancies() {
  const [activeTab, setActiveTab] = useState('board');

  return (
    <div className="p-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Vagas & ATS</h1>
          <p className="text-slate-500 text-sm mt-1">Sistema de rastreamento de candidatos com inteligência ZIA</p>
        </div>
        <a
          href="/vagas"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-pink-600 bg-pink-50 rounded-lg hover:bg-pink-100 border border-pink-200 transition-colors"
        >
          <Globe className="w-4 h-4" /> Portal público
        </a>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex border-b border-slate-100 px-6 pt-4 gap-6">
          {SUB_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-semibold transition-all border-b-2 -mb-px flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'text-pink-600 border-pink-600'
                  : 'text-slate-500 border-transparent hover:text-slate-700'
              }`}
            >
              {tab.id === 'zia' && <Sparkles className="w-3.5 h-3.5" />}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'board'    && <BoardTab onNewVaga={() => setActiveTab('new')} />}
          {activeTab === 'new'      && <NewVacancyTab />}
          {activeTab === 'closed'   && <ClosedTab />}
          {activeTab === 'analysis' && <AnalysisTab />}
          {activeTab === 'zia'      && <ZIAChatTab />}
        </div>
      </div>
    </div>
  );
}
