import { useState } from 'react';
import {
  Plus, X, ChevronUp, ChevronDown, Star, BarChart2,
  Link2, Copy, CheckCircle, EyeOff, Trash2,
  AlignLeft, List, ToggleLeft, Hash, Sliders,
  Users, Lock,
} from 'lucide-react';
import type { DeptRow } from '../OrgChart';

/* ── Question types ──────────────────────────────────────────────────────── */

type QuestionType = 'escala' | 'escolha_unica' | 'multipla' | 'texto' | 'nps' | 'sim_nao';

interface Option { id: string; text: string }

interface Question {
  id: string;
  type: QuestionType;
  title: string;
  required: boolean;
  options?: Option[];     // escolha_unica, multipla
  scaleMin?: number;      // escala
  scaleMax?: number;      // escala
  scaleLabels?: [string, string]; // escala
}

type SurveyTarget = 'todos' | 'clt' | 'pj' | 'gestores';
type SurveyKind = 'interna' | 'externa';

interface Survey {
  id: string;
  title: string;
  description: string;
  kind: SurveyKind;
  target: SurveyTarget;
  questions: Question[];
  status: 'rascunho' | 'ativa' | 'encerrada';
  responses: number;
  createdAt: string;
  externalLink?: string;
  anonymous: boolean;
}

/* ── Constants ────────────────────────────────────────────────────────────── */

const TYPE_META: Record<QuestionType, { label: string; icon: React.ElementType; description: string }> = {
  escala:        { label: 'Escala de Valor',  icon: Sliders,      description: 'Ex: De 1 a 5 ou 1 a 10'          },
  nps:           { label: 'NPS (0-10)',        icon: Hash,         description: 'Net Promoter Score padrão'        },
  escolha_unica: { label: 'Escolha Única',    icon: List,         description: 'O respondente escolhe 1 opção'    },
  multipla:      { label: 'Múltipla Escolha', icon: CheckCircle,  description: 'Pode marcar várias opções'        },
  texto:         { label: 'Texto Livre',      icon: AlignLeft,    description: 'Campo aberto para resposta'       },
  sim_nao:       { label: 'Sim / Não',        icon: ToggleLeft,   description: 'Resposta binária'                 },
};

const TARGET_LABEL: Record<SurveyTarget, string> = {
  todos: 'Todos os colaboradores', clt: 'Apenas CLT', pj: 'Apenas PJ', gestores: 'Apenas gestores',
};

const STATUS_CFG = {
  rascunho:  { label: 'Rascunho', cls: 'bg-slate-100 text-slate-500' },
  ativa:     { label: 'Ativa',    cls: 'bg-green-100 text-green-700' },
  encerrada: { label: 'Encerrada',cls: 'bg-purple-100 text-purple-700' },
};

/* ── Mock surveys ─────────────────────────────────────────────────────────── */

const INIT_SURVEYS: Survey[] = [
  {
    id: 's1', title: 'Clima Organizacional Q1 2025', kind: 'interna',
    description: 'Pesquisa trimestral de clima para o departamento de TI.',
    target: 'todos', status: 'ativa', responses: 22, createdAt: '2025-01-10', anonymous: true,
    questions: [
      { id: 'q1', type: 'escala', title: 'Como você avalia o ambiente de trabalho no departamento?', required: true, scaleMin: 1, scaleMax: 5, scaleLabels: ['Péssimo', 'Excelente'] },
      { id: 'q2', type: 'nps', title: 'Em uma escala de 0 a 10, o quanto você recomendaria a empresa como um bom lugar para trabalhar?', required: true },
      { id: 'q3', type: 'escolha_unica', title: 'Como você avalia a comunicação interna do time?', required: true, options: [{ id: 'o1', text: 'Muito boa' },{ id: 'o2', text: 'Boa' },{ id: 'o3', text: 'Regular' },{ id: 'o4', text: 'Ruim' }] },
      { id: 'q4', type: 'texto', title: 'O que poderia ser melhorado no seu dia a dia de trabalho?', required: false },
    ],
  },
  {
    id: 's2', title: 'Pesquisa Pós-Treinamento AWS', kind: 'externa',
    description: 'Avaliação do treinamento de certificação AWS realizado em janeiro/2025.',
    target: 'todos', status: 'encerrada', responses: 18, createdAt: '2024-12-20', anonymous: true,
    externalLink: 'https://pesquisa.zia.com.br/ext/aws-jan25',
    questions: [
      { id: 'q1', type: 'nps', title: 'Como você avalia o treinamento no geral?', required: true },
      { id: 'q2', type: 'escala', title: 'O conteúdo atendeu às suas expectativas?', required: true, scaleMin: 1, scaleMax: 10, scaleLabels: ['Não atendeu', 'Superou'] },
      { id: 'q3', type: 'sim_nao', title: 'Você aplicaria o conhecimento adquirido imediatamente?', required: true },
      { id: 'q4', type: 'texto', title: 'Deixe um comentário sobre o treinamento:', required: false },
    ],
  },
];

/* ── Helper: unique id ───────────────────────────────────────────────────── */
const uid = () => Math.random().toString(36).slice(2, 9);

/* ── Question editor ─────────────────────────────────────────────────────── */

function QuestionEditor({
  question, index, total,
  onChange, onRemove, onMoveUp, onMoveDown,
}: {
  question: Question; index: number; total: number;
  onChange: (q: Question) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const meta = TYPE_META[question.type];
  const MetaIcon = meta.icon;
  const set = (p: Partial<Question>) => onChange({ ...question, ...p });

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* question header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-100">
        <span className="w-6 h-6 rounded-full bg-pink-100 text-pink-600 text-xs font-bold flex items-center justify-center">{index + 1}</span>
        <MetaIcon className="w-4 h-4 text-slate-500" />
        <span className="text-xs font-semibold text-slate-600 flex-1">{meta.label}</span>
        <div className="flex items-center gap-1">
          <button onClick={onMoveUp} disabled={index === 0} className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
          <button onClick={onMoveDown} disabled={index === total - 1} className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
          <button onClick={onRemove} className="p-1 text-slate-400 hover:text-red-500 ml-1"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {/* Title */}
        <input
          type="text"
          value={question.title}
          onChange={(e) => set({ title: e.target.value })}
          placeholder="Digite a pergunta aqui..."
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 font-medium text-slate-800"
        />

        {/* Type-specific config */}
        {question.type === 'escala' && (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-500 text-xs">Mínimo:</span>
            <input type="number" min={0} max={5} value={question.scaleMin ?? 1} onChange={(e) => set({ scaleMin: +e.target.value })}
              className="w-16 px-2 py-1 border border-slate-200 rounded text-center text-sm" />
            <span className="text-slate-500 text-xs">Máximo:</span>
            <input type="number" min={2} max={10} value={question.scaleMax ?? 5} onChange={(e) => set({ scaleMax: +e.target.value })}
              className="w-16 px-2 py-1 border border-slate-200 rounded text-center text-sm" />
            <span className="text-slate-500 text-xs ml-2">Rótulo baixo:</span>
            <input type="text" value={question.scaleLabels?.[0] ?? ''} onChange={(e) => set({ scaleLabels: [e.target.value, question.scaleLabels?.[1] ?? ''] })}
              className="px-2 py-1 border border-slate-200 rounded text-sm w-28" placeholder="Ex: Péssimo" />
            <span className="text-slate-500 text-xs">Rótulo alto:</span>
            <input type="text" value={question.scaleLabels?.[1] ?? ''} onChange={(e) => set({ scaleLabels: [question.scaleLabels?.[0] ?? '', e.target.value] })}
              className="px-2 py-1 border border-slate-200 rounded text-sm w-28" placeholder="Ex: Excelente" />
          </div>
        )}

        {question.type === 'nps' && (
          <div className="flex items-center gap-2">
            {Array.from({ length: 11 }, (_, i) => (
              <span key={i} className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center border ${i <= 6 ? 'border-red-200 text-red-500 bg-red-50' : i <= 8 ? 'border-amber-200 text-amber-600 bg-amber-50' : 'border-green-200 text-green-600 bg-green-50'}`}>{i}</span>
            ))}
            <span className="text-xs text-slate-400 ml-2">visualização NPS</span>
          </div>
        )}

        {question.type === 'sim_nao' && (
          <div className="flex gap-2">
            <span className="px-4 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium">Sim</span>
            <span className="px-4 py-1.5 bg-red-100 text-red-600 rounded-lg text-sm font-medium">Não</span>
          </div>
        )}

        {(question.type === 'escolha_unica' || question.type === 'multipla') && (
          <div className="space-y-2">
            {(question.options ?? []).map((opt, oi) => (
              <div key={opt.id} className="flex items-center gap-2">
                <span className={`w-4 h-4 border-2 border-slate-300 flex items-center justify-center shrink-0 ${question.type === 'multipla' ? 'rounded' : 'rounded-full'}`} />
                <input
                  type="text"
                  value={opt.text}
                  onChange={(e) => {
                    const opts = [...(question.options ?? [])];
                    opts[oi] = { ...opts[oi], text: e.target.value };
                    set({ options: opts });
                  }}
                  className="flex-1 px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-pink-400"
                  placeholder={`Opção ${oi + 1}`}
                />
                <button onClick={() => set({ options: (question.options ?? []).filter((_, i) => i !== oi) })}
                  className="text-slate-300 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
            <button
              onClick={() => set({ options: [...(question.options ?? []), { id: uid(), text: '' }] })}
              className="flex items-center gap-1 text-xs text-pink-600 hover:underline font-medium"
            >
              <Plus className="w-3 h-3" /> Adicionar opção
            </button>
          </div>
        )}

        {question.type === 'texto' && (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-400 italic">
            Campo de texto livre — o respondente digitará a resposta aqui.
          </div>
        )}

        {/* Required toggle */}
        <label className="flex items-center gap-2 cursor-pointer w-fit">
          <input type="checkbox" checked={question.required} onChange={(e) => set({ required: e.target.checked })} className="w-4 h-4 accent-pink-600" />
          <span className="text-xs text-slate-500">Resposta obrigatória</span>
        </label>
      </div>
    </div>
  );
}

/* ── Survey builder / editor ─────────────────────────────────────────────── */

function SurveyBuilder({ initial, onSave, onCancel }: {
  initial?: Partial<Survey>;
  onSave: (s: Survey) => void;
  onCancel: () => void;
}) {
  const [title, setTitle]       = useState(initial?.title ?? '');
  const [description, setDesc]  = useState(initial?.description ?? '');
  const [kind, setKind]         = useState<SurveyKind>(initial?.kind ?? 'interna');
  const [target, setTarget]     = useState<SurveyTarget>(initial?.target ?? 'todos');
  const [anonymous, setAnon]    = useState(initial?.anonymous ?? true);
  const [questions, setQs]      = useState<Question[]>(initial?.questions ?? []);

  const addQuestion = (type: QuestionType) => {
    const defaults: Partial<Question> = {};
    if (type === 'escala')        defaults.scaleMin = 1, defaults.scaleMax = 5, defaults.scaleLabels = ['Péssimo', 'Excelente'];
    if (type === 'escolha_unica' || type === 'multipla') defaults.options = [{ id: uid(), text: '' }, { id: uid(), text: '' }];
    setQs((prev) => [...prev, { id: uid(), type, title: '', required: true, ...defaults } as Question]);
  };

  const updateQ = (idx: number, q: Question) => setQs((prev) => prev.map((v, i) => i === idx ? q : v));
  const removeQ = (idx: number)              => setQs((prev) => prev.filter((_, i) => i !== idx));
  const moveUp  = (idx: number) => { if (idx === 0) return; setQs((prev) => { const a = [...prev]; [a[idx - 1], a[idx]] = [a[idx], a[idx - 1]]; return a; }); };
  const moveDown= (idx: number) => { if (idx === questions.length - 1) return; setQs((prev) => { const a = [...prev]; [a[idx], a[idx + 1]] = [a[idx + 1], a[idx]]; return a; }); };

  const save = () => {
    if (!title.trim() || questions.length === 0) return;
    onSave({
      id: initial?.id ?? uid(), title, description, kind, target, anonymous,
      questions, status: 'rascunho', responses: initial?.responses ?? 0,
      createdAt: initial?.createdAt ?? new Date().toISOString().slice(0, 10),
      externalLink: kind === 'externa' ? `https://pesquisa.zia.com.br/ext/${uid()}` : undefined,
    });
  };

  const INPUT = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-800 text-lg">Criador de Pesquisa</h2>
            <p className="text-xs text-slate-400 mt-0.5">Configure e adicione perguntas à pesquisa</p>
          </div>
          <button onClick={onCancel}><X className="w-5 h-5 text-slate-400" /></button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Config section */}
          <div className="px-6 py-5 border-b border-slate-100 space-y-4 bg-slate-50/50">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Título da Pesquisa *</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={INPUT} placeholder="Ex: Clima Organizacional Q1 2025" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Descrição</label>
                <textarea value={description} onChange={(e) => setDesc(e.target.value)} className={INPUT + ' resize-none'} rows={2} placeholder="Objetivo da pesquisa..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tipo de Pesquisa</label>
                <div className="flex gap-2">
                  {(['interna', 'externa'] as SurveyKind[]).map((k) => (
                    <label key={k} className={`flex-1 text-center px-3 py-2 border rounded-xl cursor-pointer text-sm font-medium transition-all capitalize ${kind === k ? 'border-pink-400 bg-pink-50 text-pink-700' : 'border-slate-200 text-slate-600'}`}>
                      <input type="radio" className="sr-only" checked={kind === k} onChange={() => setKind(k)} />
                      {k === 'interna' ? '🔒 Interna' : '🔗 Externa (link)'}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Público-alvo</label>
                <select value={target} onChange={(e) => setTarget(e.target.value as SurveyTarget)} className={INPUT}>
                  {(Object.entries(TARGET_LABEL) as [SurveyTarget, string][]).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Anonymity */}
            <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${anonymous ? 'border-purple-400 bg-purple-50' : 'border-slate-200'}`}>
              <input type="checkbox" checked={anonymous} onChange={(e) => setAnon(e.target.checked)} className="w-4 h-4 accent-purple-600" />
              <Lock className={`w-4 h-4 ${anonymous ? 'text-purple-600' : 'text-slate-400'}`} />
              <div>
                <p className={`text-sm font-medium ${anonymous ? 'text-purple-700' : 'text-slate-700'}`}>Pesquisa Anônima</p>
                <p className="text-xs text-slate-500">O gestor não terá acesso à identidade de quem respondeu — apenas dados agregados.</p>
              </div>
            </label>

            {kind === 'externa' && (
              <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
                <Link2 className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">Pesquisa Externa com validação por CPF</p>
                  <p className="text-blue-600 mt-0.5">Um link único será gerado. O respondente informa apenas o CPF para evitar duplicatas — sem necessidade de login. A identidade <strong>não é armazenada</strong>.</p>
                </div>
              </div>
            )}
          </div>

          {/* Questions */}
          <div className="px-6 py-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-700">Perguntas ({questions.length})</h3>
              {questions.length === 0 && <span className="text-xs text-slate-400">Adicione ao menos 1 pergunta</span>}
            </div>

            {questions.map((q, idx) => (
              <QuestionEditor
                key={q.id} question={q} index={idx} total={questions.length}
                onChange={(upd) => updateQ(idx, upd)}
                onRemove={() => removeQ(idx)}
                onMoveUp={() => moveUp(idx)}
                onMoveDown={() => moveDown(idx)}
              />
            ))}

            {/* Add question palette */}
            <div className="border border-dashed border-slate-300 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">Adicionar pergunta</p>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(TYPE_META) as [QuestionType, typeof TYPE_META[QuestionType]][]).map(([type, meta]) => {
                  const Icon = meta.icon;
                  return (
                    <button
                      key={type}
                      onClick={() => addQuestion(type)}
                      className="flex items-center gap-2 px-3 py-2.5 border border-slate-200 rounded-lg hover:border-pink-300 hover:bg-pink-50 transition-all text-left group"
                    >
                      <Icon className="w-4 h-4 text-slate-400 group-hover:text-pink-500 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-slate-700 group-hover:text-pink-700">{meta.label}</p>
                        <p className="text-[10px] text-slate-400">{meta.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
          <span className="text-xs text-slate-400">{questions.length} pergunta{questions.length !== 1 ? 's' : ''} configurada{questions.length !== 1 ? 's' : ''}</span>
          <div className="flex gap-2">
            <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-500 font-medium">Cancelar</button>
            <button
              onClick={save}
              disabled={!title.trim() || questions.length === 0}
              className="px-5 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >Salvar Pesquisa</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Results viewer ───────────────────────────────────────────────────────── */

function ResultsModal({ survey, onClose }: { survey: Survey; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-800">{survey.title}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-slate-400">{survey.responses} respostas</span>
              {survey.anonymous && (
                <span className="flex items-center gap-1 text-xs text-purple-600 font-medium">
                  <Lock className="w-3 h-3" /> Resultados anônimos
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {survey.anonymous && (
            <div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-700">
              <Lock className="w-4 h-4 shrink-0" />
              <span>Esta pesquisa é anônima. Apenas dados agregados são exibidos — a identidade dos respondentes não é revelada.</span>
            </div>
          )}
          {survey.questions.map((q, idx) => {
            const meta = TYPE_META[q.type];
            const MetaIcon = meta.icon;
            return (
              <div key={q.id} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <div className="flex items-start gap-2 mb-3">
                  <span className="w-5 h-5 rounded-full bg-pink-100 text-pink-600 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{idx + 1}</span>
                  <div className="flex-1">
                    <p className="font-medium text-slate-800 text-sm">{q.title}</p>
                    <span className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                      <MetaIcon className="w-3 h-3" /> {meta.label}
                    </span>
                  </div>
                </div>
                {/* Simulated aggregate results */}
                {(q.type === 'escala' || q.type === 'nps') && (
                  <div>
                    <div className="flex items-end gap-1 h-12 mt-2">
                      {Array.from({ length: q.type === 'nps' ? 11 : (q.scaleMax ?? 5) - (q.scaleMin ?? 1) + 1 }, (_, i) => {
                        const pcts = [5, 8, 12, 25, 38, 7, 3, 2, 15, 22, 35];
                        const pct = pcts[i % pcts.length];
                        return (
                          <div key={i} className="flex flex-col items-center flex-1 gap-1">
                            <span className="text-[9px] text-slate-500">{pct}%</span>
                            <div className="w-full bg-pink-300 rounded-t" style={{ height: `${(pct / 40) * 40}px` }} />
                            <span className="text-[9px] text-slate-400">{(q.scaleMin ?? 0) + i}</span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Média: <strong>3,8</strong> · {survey.responses} respostas</p>
                  </div>
                )}
                {(q.type === 'escolha_unica' || q.type === 'multipla') && (
                  <div className="space-y-2 mt-2">
                    {(q.options ?? []).map((opt, oi) => {
                      const pcts = [45, 30, 20, 5];
                      const pct = pcts[oi % pcts.length];
                      return (
                        <div key={opt.id} className="flex items-center gap-2">
                          <span className="text-xs text-slate-600 w-32 truncate">{opt.text || `Opção ${oi + 1}`}</span>
                          <div className="flex-1 bg-slate-200 rounded-full h-2">
                            <div className="h-2 bg-pink-400 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-slate-500 w-8 text-right">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {q.type === 'sim_nao' && (
                  <div className="flex gap-3 mt-2">
                    <div className="flex items-center gap-2 flex-1 bg-green-50 rounded-lg p-2 border border-green-100">
                      <div className="w-8 h-8 rounded-full bg-green-200 text-green-700 text-xs font-bold flex items-center justify-center">68%</div>
                      <span className="text-sm font-medium text-green-700">Sim</span>
                    </div>
                    <div className="flex items-center gap-2 flex-1 bg-red-50 rounded-lg p-2 border border-red-100">
                      <div className="w-8 h-8 rounded-full bg-red-200 text-red-700 text-xs font-bold flex items-center justify-center">32%</div>
                      <span className="text-sm font-medium text-red-600">Não</span>
                    </div>
                  </div>
                )}
                {q.type === 'texto' && (
                  <p className="text-xs text-slate-400 italic mt-2">
                    <EyeOff className="w-3 h-3 inline mr-1" />
                    Respostas individuais ocultadas para preservar o anonimato. Exporte para análise qualitativa.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Survey card ─────────────────────────────────────────────────────────── */

function SurveyCard({ survey, onActivate, onViewResults, onEdit }: {
  survey: Survey;
  onActivate: (id: string) => void;
  onViewResults: (s: Survey) => void;
  onEdit: (s: Survey) => void;
}) {
  const [copied, setCopied] = useState(false);
  const s = STATUS_CFG[survey.status];

  const copyLink = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-slate-800">{survey.title}</h4>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
            {survey.anonymous && (
              <span className="flex items-center gap-1 text-xs text-purple-600 font-medium">
                <Lock className="w-3 h-3" /> Anônima
              </span>
            )}
            {survey.kind === 'externa' && (
              <span className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                <Link2 className="w-3 h-3" /> Externa
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">{survey.description}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 flex-wrap">
            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {TARGET_LABEL[survey.target]}</span>
            <span>·</span>
            <span>{survey.questions.length} perguntas</span>
            <span>·</span>
            <span>{survey.responses} respostas</span>
            <span>·</span>
            <span>Criada: {survey.createdAt}</span>
          </div>
          {survey.kind === 'externa' && survey.externalLink && (
            <div className="flex items-center gap-2 mt-2">
              <span className="font-mono text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded truncate max-w-xs">{survey.externalLink}</span>
              <button onClick={copyLink} className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600">
                {copied ? <CheckCircle className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {survey.status !== 'ativa' && (
            <button onClick={() => onActivate(survey.id)}
              className="px-3 py-1.5 text-xs font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-200">
              Ativar
            </button>
          )}
          {survey.responses > 0 && (
            <button onClick={() => onViewResults(survey)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200">
              <BarChart2 className="w-3 h-3" /> Resultados
            </button>
          )}
          <button onClick={() => onEdit(survey)}
            className="px-3 py-1.5 text-xs font-medium border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50">
            Editar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────────────────────── */

type MainTab = 'interna' | 'externa';

export default function TabSatisfacao({ dept: _dept }: { dept: DeptRow }) {
  const [surveys, setSurveys]         = useState<Survey[]>(INIT_SURVEYS);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingSurvey, setEditing]   = useState<Survey | undefined>(undefined);
  const [viewing, setViewing]         = useState<Survey | null>(null);
  const [tab, setTab]                 = useState<MainTab>('interna');

  const newKind = tab;  // builder defaults to the current tab's kind

  const handleSave = (s: Survey) => {
    setSurveys((prev) => {
      const exists = prev.find((x) => x.id === s.id);
      return exists ? prev.map((x) => x.id === s.id ? s : x) : [...prev, s];
    });
    setShowBuilder(false);
    setEditing(undefined);
  };

  const activate = (id: string) =>
    setSurveys((prev) => prev.map((s) => s.id === id ? { ...s, status: 'ativa' } : s));

  const visible = surveys.filter((s) => s.kind === tab);

  const activeCount   = surveys.filter((s) => s.status === 'ativa').length;
  const totalResps    = surveys.reduce((acc, s) => acc + s.responses, 0);

  return (
    <div>
      {showBuilder && (
        <SurveyBuilder
          initial={editingSurvey ?? { kind: newKind }}
          onSave={handleSave}
          onCancel={() => { setShowBuilder(false); setEditing(undefined); }}
        />
      )}
      {viewing && <ResultsModal survey={viewing} onClose={() => setViewing(null)} />}

      {/* Sub-tabs */}
      <div className="bg-white border-b border-slate-200 px-8">
        <div className="flex gap-0">
          {([['interna', '🔒 Pesquisas Internas'], ['externa', '🔗 Pesquisas Externas']] as [MainTab, string][]).map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${tab === id ? 'border-pink-500 text-pink-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-8 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs text-slate-500 mb-1">Pesquisas Ativas</p>
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs text-slate-500 mb-1">Total de Respostas</p>
            <p className="text-2xl font-bold text-slate-800">{totalResps}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs text-slate-500 mb-1">NPS Médio do Depto.</p>
            <p className="text-2xl font-bold text-purple-600">+42</p>
          </div>
        </div>

        {/* Privacy banner */}
        {tab === 'interna' && (
          <div className="flex items-start gap-3 p-4 bg-purple-50 border border-purple-200 rounded-xl">
            <Lock className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
            <div className="text-xs text-purple-700">
              <p className="font-semibold mb-0.5">Privacidade garantida por design</p>
              <p>Em hipótese alguma o gestor terá acesso à identidade do respondente. Apenas médias, porcentagens e dados agregados são exibidos. Respostas individuais de questões abertas são ocultadas por padrão.</p>
            </div>
          </div>
        )}
        {tab === 'externa' && (
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <Link2 className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
            <div className="text-xs text-blue-700">
              <p className="font-semibold mb-0.5">Link externo com validação por CPF</p>
              <p>Ao ativar uma pesquisa externa, um link único é gerado. O respondente informa apenas o CPF para evitar respostas duplicadas — nenhum dado de identidade é armazenado junto às respostas.</p>
            </div>
          </div>
        )}

        {/* Header + new button */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-700">{tab === 'interna' ? 'Pesquisas Internas' : 'Pesquisas Externas'}</h3>
          <button
            onClick={() => { setEditing(undefined); setShowBuilder(true); }}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium"
          >
            <Plus className="w-4 h-4" /> Nova Pesquisa
          </button>
        </div>

        {/* Survey list */}
        <div className="space-y-3">
          {visible.map((s) => (
            <SurveyCard
              key={s.id} survey={s}
              onActivate={activate}
              onViewResults={setViewing}
              onEdit={(sv) => { setEditing(sv); setShowBuilder(true); }}
            />
          ))}
          {visible.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
              <Star className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">Nenhuma pesquisa {tab === 'interna' ? 'interna' : 'externa'} criada</p>
              <p className="text-sm text-slate-400 mt-1">Clique em "Nova Pesquisa" para criar a primeira.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
