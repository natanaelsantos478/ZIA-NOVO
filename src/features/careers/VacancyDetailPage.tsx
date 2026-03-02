import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Briefcase, Clock, Users, Globe,
  CheckCircle, Sparkles, FileText, Brain, Send,
  Building2, Eye, EyeOff,
} from 'lucide-react';
import { useVacancies, type DesiredProfiles } from '../../context/VacanciesContext';

const MODALITY_COLOR: Record<string, string> = {
  'Remoto':     'bg-green-100 text-green-700',
  'Híbrido':    'bg-blue-100 text-blue-700',
  'Presencial': 'bg-slate-100 text-slate-600',
};

const TYPE_COLOR: Record<string, string> = {
  'CLT':        'bg-indigo-100 text-indigo-700',
  'PJ':         'bg-purple-100 text-purple-700',
  'Estágio':    'bg-amber-100 text-amber-700',
  'Temporário': 'bg-slate-100 text-slate-600',
};

/* ── Perfil questions — mapeadas a cada tipo de perfil ── */
interface ProfileQuestion {
  id: keyof DesiredProfiles;
  text: string;
  options: { label: string; value: string }[];
}

const PROFILE_QUESTIONS: ProfileQuestion[] = [
  {
    id: 'executor',
    text: 'Quando surge um problema urgente na sua equipe, você:',
    options: [
      { label: 'Age imediatamente para resolver',                   value: 'executor'    },
      { label: 'Analisa todas as variáveis antes de agir',         value: 'analitico'   },
      { label: 'Conversa com a equipe para alinhar a melhor ação', value: 'comunicador' },
      { label: 'Planeja uma solução estruturada antes de executar', value: 'planejador'  },
    ],
  },
  {
    id: 'analitico',
    text: 'Para tomar uma decisão importante, você prefere:',
    options: [
      { label: 'Decidir rápido e ajustar depois se necessário',    value: 'executor'    },
      { label: 'Levantar dados e analisar cada detalhe',           value: 'analitico'   },
      { label: 'Consultar as pessoas mais experientes do time',    value: 'comunicador' },
      { label: 'Criar um plano detalhado com riscos mapeados',     value: 'planejador'  },
    ],
  },
  {
    id: 'comunicador',
    text: 'No trabalho em equipe, seu principal ponto forte é:',
    options: [
      { label: 'Entregar resultados de forma consistente',          value: 'executor'    },
      { label: 'Garantir a qualidade e precisão das entregas',      value: 'analitico'   },
      { label: 'Facilitar o diálogo e engajar o grupo',            value: 'comunicador' },
      { label: 'Organizar processos e garantir o seguimento',       value: 'planejador'  },
    ],
  },
  {
    id: 'planejador',
    text: 'Em um projeto novo, sua primeira reação é:',
    options: [
      { label: 'Começar logo e aprender na prática',                value: 'executor'    },
      { label: 'Estudar cases e referências antes de começar',     value: 'analitico'   },
      { label: 'Conversar com stakeholders para entender expectativas', value: 'comunicador' },
      { label: 'Criar um roadmap com entregas e cronograma',        value: 'planejador'  },
    ],
  },
];

const PROFILE_LABELS: Record<keyof DesiredProfiles, string> = {
  executor:    'Executor',
  analitico:   'Analítico',
  comunicador: 'Comunicador',
  planejador:  'Planejador',
};

function ProfileTest({ onComplete }: { onComplete: (results: Partial<DesiredProfiles>) => void }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const allAnswered = PROFILE_QUESTIONS.every((q) => answers[q.id]);

  function submit() {
    const counts: Record<string, number> = { executor: 0, analitico: 0, comunicador: 0, planejador: 0 };
    Object.values(answers).forEach((v) => { counts[v] = (counts[v] || 0) + 1; });
    const max = Math.max(...Object.values(counts));
    const results: Partial<DesiredProfiles> = {};
    (Object.keys(counts) as (keyof DesiredProfiles)[]).forEach((k) => {
      results[k] = counts[k] === max;
    });
    onComplete(results);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 bg-purple-50 border border-purple-200 rounded-xl p-4">
        <Brain className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-purple-800">Análise de perfil comportamental</p>
          <p className="text-xs text-purple-600 mt-0.5">
            Responda 4 perguntas rápidas. Não há resposta certa ou errada — queremos conhecer seu estilo de trabalho.
          </p>
        </div>
      </div>

      {PROFILE_QUESTIONS.map((q, i) => (
        <div key={q.id}>
          <p className="text-sm font-semibold text-slate-700 mb-3">
            {i + 1}. {q.text}
          </p>
          <div className="space-y-2">
            {q.options.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  answers[q.id] === opt.value
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name={q.id}
                  value={opt.value}
                  checked={answers[q.id] === opt.value}
                  onChange={() => setAnswers((p) => ({ ...p, [q.id]: opt.value }))}
                  className="w-4 h-4 accent-purple-600"
                />
                <span className="text-sm text-slate-700">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      ))}

      <button
        onClick={submit}
        disabled={!allAnswered}
        className="w-full py-3 text-sm font-semibold text-white bg-purple-600 rounded-xl hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Confirmar respostas
      </button>
    </div>
  );
}

/* ── Application form ── */
interface FormState {
  name: string;
  email: string;
  phone: string;
  linkedin: string;
  message: string;
  source: 'portal' | 'impresso' | 'indicacao';
  profileAnswers: Partial<DesiredProfiles>;
  profileDone: boolean;
}

export default function VacancyDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { getVacancyBySlug, addCandidate } = useVacancies();

  const vacancy = getVacancyBySlug(slug ?? '');

  const [form, setForm] = useState<FormState>({
    name: '', email: '', phone: '', linkedin: '', message: '',
    source: 'portal',
    profileAnswers: {},
    profileDone: false,
  });
  const [submitted, setSubmitted] = useState(false);

  if (!vacancy) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <Building2 className="w-16 h-16 text-slate-300" />
        <h1 className="text-xl font-bold text-slate-600">Vaga não encontrada</h1>
        <p className="text-sm text-slate-400">Esta vaga pode ter sido encerrada ou o link está incorreto.</p>
        <Link to="/vagas" className="flex items-center gap-2 px-4 py-2 text-sm text-pink-600 bg-pink-50 rounded-lg hover:bg-pink-100">
          <ArrowLeft className="w-4 h-4" /> Ver todas as vagas
        </Link>
      </div>
    );
  }

  function handleSubmit() {
    addCandidate({
      vacancyId: vacancy!.id,
      name: form.name,
      email: form.email,
      phone: form.phone,
      linkedin: form.linkedin,
      message: form.message,
      source: form.source,
      profileAnswers: form.profileAnswers,
    });
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const canSubmit = form.name && form.email && form.phone &&
    (!vacancy.requireProfileAnalysis || form.profileDone);

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-6 px-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-xl font-black text-slate-800 mb-2">Candidatura enviada!</h1>
          <p className="text-sm text-slate-500 mb-1">
            Obrigado, <strong>{form.name}</strong>!
          </p>
          <p className="text-sm text-slate-500 mb-6">
            Recebemos sua candidatura para <strong>{vacancy.title}</strong>. Nossa equipe de RH entrará em contato em breve pelo e-mail <strong>{form.email}</strong>.
          </p>
          {Object.values(form.profileAnswers).some(Boolean) && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6 text-left">
              <p className="text-xs font-semibold text-purple-700 mb-2 flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5" /> Seu perfil comportamental:
              </p>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(form.profileAnswers) as [keyof DesiredProfiles, boolean][])
                  .filter(([, v]) => v)
                  .map(([k]) => (
                    <span key={k} className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                      {PROFILE_LABELS[k]}
                    </span>
                  ))}
              </div>
            </div>
          )}
          <Link
            to="/vagas"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-pink-600 rounded-xl hover:bg-pink-700"
          >
            <Globe className="w-4 h-4" /> Ver outras vagas
          </Link>
        </div>
      </div>
    );
  }

  const inputCls = 'w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/vagas" className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
            <ArrowLeft className="w-4 h-4" />
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <span className="font-bold text-slate-800">ZIA Vagas</span>
            </div>
          </Link>
          <span className="text-xs text-slate-400">ID: {vacancy.id}</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Left: Job details ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title card */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h1 className="text-2xl font-black text-slate-800 mb-2">{vacancy.title}</h1>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${MODALITY_COLOR[vacancy.modality]}`}>
                {vacancy.modality}
              </span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${TYPE_COLOR[vacancy.type]}`}>
                {vacancy.type}
              </span>
              {vacancy.salaryVisible && vacancy.salary ? (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                  <Eye className="w-3 h-3" /> {vacancy.salary}
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                  <EyeOff className="w-3 h-3" /> A combinar
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm text-slate-600">
              <span className="flex items-center gap-2"><Briefcase className="w-4 h-4 text-slate-400" />{vacancy.dept}</span>
              <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-400" />{vacancy.location}</span>
              <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-slate-400" />Publicada em {vacancy.publishedAt}</span>
              <span className="flex items-center gap-2"><Users className="w-4 h-4 text-slate-400" />{vacancy.candidateCount} candidatos</span>
            </div>

            {vacancy.acceptPrintedResume && (
              <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg">
                <FileText className="w-3.5 h-3.5" />
                Esta vaga também aceita currículo impresso na recepção
              </div>
            )}
          </div>

          {/* Description */}
          {vacancy.description && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="font-bold text-slate-700 mb-3 text-base">Sobre a vaga</h2>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{vacancy.description}</p>
            </div>
          )}

          {/* Requirements */}
          {(vacancy.requirements || vacancy.niceToHave) && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
              {vacancy.requirements && (
                <div>
                  <h2 className="font-bold text-slate-700 mb-3 text-base">Requisitos obrigatórios</h2>
                  <ul className="space-y-1.5">
                    {vacancy.requirements.split('\n').filter(Boolean).map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        {r.replace(/^•\s*/, '')}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {vacancy.niceToHave && (
                <div>
                  <h2 className="font-bold text-slate-700 mb-3 text-base">Requisitos desejáveis</h2>
                  <ul className="space-y-1.5">
                    {vacancy.niceToHave.split('\n').filter(Boolean).map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-500">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                        {r.replace(/^•\s*/, '')}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Application form ── */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6 sticky top-20">
            <h2 className="font-bold text-slate-800 text-base mb-4 flex items-center gap-2">
              <Send className="w-4 h-4 text-pink-600" /> Candidatar-se
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nome completo *</label>
                <input
                  type="text"
                  placeholder="Seu nome"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">E-mail *</label>
                <input
                  type="email"
                  placeholder="seu@email.com"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Telefone / WhatsApp *</label>
                <input
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">LinkedIn (opcional)</label>
                <input
                  type="url"
                  placeholder="linkedin.com/in/seu-perfil"
                  value={form.linkedin}
                  onChange={(e) => setForm((p) => ({ ...p, linkedin: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Mensagem (opcional)</label>
                <textarea
                  rows={3}
                  placeholder="Conte um pouco sobre você e por que tem interesse nesta vaga..."
                  value={form.message}
                  onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                  className={`${inputCls} resize-none`}
                />
              </div>

              {/* Como chegou à vaga */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Como ficou sabendo desta vaga?</label>
                <select
                  value={form.source}
                  onChange={(e) => setForm((p) => ({ ...p, source: e.target.value as FormState['source'] }))}
                  className={`${inputCls} bg-white`}
                >
                  <option value="portal">Portal de vagas (este site)</option>
                  <option value="indicacao">Indicação de alguém</option>
                  <option value="impresso">Vi no material impresso</option>
                </select>
              </div>

              {/* Profile test */}
              {vacancy.requireProfileAnalysis && !form.profileDone && (
                <div className="border-t border-slate-100 pt-4">
                  <ProfileTest
                    onComplete={(results) => {
                      setForm((p) => ({ ...p, profileAnswers: results, profileDone: true }));
                    }}
                  />
                </div>
              )}

              {form.profileDone && (
                <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-xl px-3 py-2 text-xs text-purple-700">
                  <CheckCircle className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  Análise de perfil concluída
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full py-3 text-sm font-bold text-white bg-pink-600 rounded-xl hover:bg-pink-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" /> Enviar candidatura
              </button>

              <p className="text-[11px] text-slate-400 text-center leading-snug">
                Seus dados são tratados com sigilo e usados apenas para fins de seleção, conforme a LGPD.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
