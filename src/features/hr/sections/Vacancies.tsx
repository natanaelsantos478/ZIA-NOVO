import { useState } from 'react';
import {
  Plus, Search, Filter, MoreHorizontal, Users,
  Clock, TrendingUp, CheckCircle, XCircle, Sparkles,
  MapPin, Briefcase, MessageSquare, Send,
} from 'lucide-react';

const SUB_TABS = [
  { id: 'new',      label: 'Nova Vaga'        },
  { id: 'board',    label: 'ZIAvagas'         },
  { id: 'closed',   label: 'Vagas Encerradas' },
  { id: 'analysis', label: 'Análise'          },
  { id: 'zia',      label: 'Converse com ZIA' },
];

interface Vacancy {
  id: string;
  title: string;
  dept: string;
  type: 'CLT' | 'PJ' | 'Estágio' | 'Temporário';
  location: string;
  modality: 'Presencial' | 'Híbrido' | 'Remoto';
  stage: 'Triagem' | 'Entrevistas' | 'Teste Técnico' | 'Proposta' | 'Aprovação';
  candidates: number;
  openDate: string;
  priority: 'Alta' | 'Média' | 'Baixa';
}

const VACANCIES: Vacancy[] = [
  { id: 'V001', title: 'Desenvolvedor Full Stack Sênior', dept: 'TI – Desenvolvimento', type: 'CLT',      location: 'São Paulo, SP',  modality: 'Híbrido',    stage: 'Entrevistas', candidates: 42, openDate: '2025-01-10', priority: 'Alta'  },
  { id: 'V002', title: 'Analista de Customer Success',    dept: 'Comercial – CS',       type: 'CLT',      location: 'Remoto',         modality: 'Remoto',     stage: 'Triagem',     candidates: 87, openDate: '2025-01-18', priority: 'Alta'  },
  { id: 'V003', title: 'Designer UX/UI Pleno',            dept: 'Produto',              type: 'PJ',       location: 'Remoto',         modality: 'Remoto',     stage: 'Teste Técnico', candidates: 23, openDate: '2025-01-22', priority: 'Média' },
  { id: 'V004', title: 'Gerente de Qualidade (SGQ)',      dept: 'Qualidade',            type: 'CLT',      location: 'Campinas, SP',   modality: 'Presencial', stage: 'Proposta',    candidates: 11, openDate: '2025-02-01', priority: 'Alta'  },
  { id: 'V005', title: 'Estagiário de Marketing Digital', dept: 'Marketing',            type: 'Estágio',  location: 'São Paulo, SP',  modality: 'Híbrido',    stage: 'Triagem',     candidates: 134, openDate: '2025-02-05', priority: 'Baixa' },
  { id: 'V006', title: 'Analista de Dados (BI)',          dept: 'TI – Dados',           type: 'CLT',      location: 'Remoto',         modality: 'Remoto',     stage: 'Aprovação',   candidates: 19, openDate: '2025-02-08', priority: 'Média' },
];

const CLOSED_VACANCIES = [
  { id: 'VC001', title: 'Analista de RH Pleno',          hiredName: 'Ana Silva',        closeDate: '2024-12-15', duration: '28 dias', candidates: 56  },
  { id: 'VC002', title: 'Desenvolvedor React Sênior',    hiredName: 'Carlos Mendes',    closeDate: '2024-12-01', duration: '35 dias', candidates: 74  },
  { id: 'VC003', title: 'Coord. de Customer Success',    hiredName: 'Mariana Fonseca',  closeDate: '2024-11-20', duration: '42 dias', candidates: 38  },
  { id: 'VC004', title: 'Analista Financeiro Sênior',    hiredName: 'Rodrigo Lima',     closeDate: '2024-11-05', duration: '21 dias', candidates: 29  },
];

const PRIORITY_BADGE: Record<string, string> = {
  'Alta':  'bg-rose-100 text-rose-700',
  'Média': 'bg-amber-100 text-amber-700',
  'Baixa': 'bg-slate-100 text-slate-600',
};

const STAGE_BADGE: Record<string, string> = {
  'Triagem':       'bg-blue-100 text-blue-700',
  'Entrevistas':   'bg-indigo-100 text-indigo-700',
  'Teste Técnico': 'bg-amber-100 text-amber-700',
  'Proposta':      'bg-green-100 text-green-700',
  'Aprovação':     'bg-pink-100 text-pink-700',
};

const MODALITY_ICON_COLOR: Record<string, string> = {
  'Remoto':     'bg-green-50 text-green-600',
  'Híbrido':    'bg-blue-50 text-blue-600',
  'Presencial': 'bg-slate-100 text-slate-600',
};

const ATS_STATS = [
  { label: 'Vagas Abertas',     value: '6',   icon: Briefcase,  color: 'text-pink-600 bg-pink-50' },
  { label: 'Candidatos Totais', value: '316', icon: Users,      color: 'text-blue-600 bg-blue-50' },
  { label: 'TMA (dias)',        value: '31',  icon: Clock,      color: 'text-amber-600 bg-amber-50' },
  { label: 'Taxa de Conversão', value: '4,1%', icon: TrendingUp, color: 'text-green-600 bg-green-50' },
];

function BoardTab() {
  const [search, setSearch] = useState('');
  const filtered = VACANCIES.filter((v) =>
    v.title.toLowerCase().includes(search.toLowerCase()) ||
    v.dept.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {ATS_STATS.map((s) => {
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

      {/* Search + filter */}
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
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                  <span className="flex items-center gap-1"><Briefcase className="w-3 h-3" />{v.dept}</span>
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{v.location}</span>
                  <span className={`px-2 py-0.5 rounded-full font-medium ${MODALITY_ICON_COLOR[v.modality]}`}>{v.modality}</span>
                  <span className="bg-slate-200/70 px-2 py-0.5 rounded font-medium">{v.type}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 ml-4 shrink-0">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold ${STAGE_BADGE[v.stage]}`}>
                  {v.stage}
                </span>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-700">{v.candidates}</p>
                  <p className="text-[10px] text-slate-400">candidatos</p>
                </div>
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

function NewVacancyTab() {
  const [step, setStep] = useState(1);

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
              {s === 1 ? 'Dados da Vaga' : s === 2 ? 'Requisitos' : 'Publicação'}
            </span>
            {s < 3 && <div className={`w-12 h-0.5 ${s < step ? 'bg-pink-400' : 'bg-slate-200'}`} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Título da Vaga *</label>
              <input type="text" placeholder="Ex: Desenvolvedor Full Stack Sênior" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Departamento *</label>
              <select className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400 bg-white">
                <option>Selecionar...</option>
                <option>TI – Desenvolvimento</option>
                <option>Comercial & Vendas</option>
                <option>Recursos Humanos</option>
                <option>Financeiro</option>
                <option>Marketing</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tipo de Contrato *</label>
              <select className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400 bg-white">
                <option>CLT</option>
                <option>PJ</option>
                <option>Estágio</option>
                <option>Temporário</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Modalidade</label>
              <select className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400 bg-white">
                <option>Híbrido</option>
                <option>Remoto</option>
                <option>Presencial</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Localização</label>
              <input type="text" placeholder="Ex: São Paulo, SP" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Faixa Salarial</label>
              <input type="text" placeholder="Ex: R$ 8.000 – R$ 12.000" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Descrição da Vaga</label>
            <textarea rows={5} placeholder="Descreva as responsabilidades e o perfil desejado..." className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400 resize-none" />
          </div>
          <div className="flex justify-end pt-2">
            <button onClick={() => setStep(2)} className="px-6 py-2 text-sm font-semibold text-white bg-pink-600 rounded-lg hover:bg-pink-700">
              Próximo →
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Defina os requisitos mínimos e desejáveis para o cargo.</p>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Requisitos Obrigatórios</label>
            <textarea rows={4} placeholder="• Graduação em Ciência da Computação ou área relacionada&#10;• 5+ anos de experiência com React e Node.js" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Requisitos Desejáveis</label>
            <textarea rows={3} placeholder="• Experiência com TypeScript&#10;• Conhecimento em AWS / GCP" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400 resize-none" />
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

      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">ZIA vai distribuir automaticamente</p>
              <p className="text-xs text-green-600 mt-0.5">A vaga será publicada no ZIAvagas e integrada aos portais configurados (LinkedIn, Gupy, etc.)</p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Prazo para candidaturas</label>
            <input type="date" className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/30 focus:border-pink-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Prioridade</label>
            <div className="flex gap-2">
              {['Alta', 'Média', 'Baixa'].map((p) => (
                <button key={p} className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600">
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-between pt-2">
            <button onClick={() => setStep(2)} className="px-6 py-2 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">
              ← Voltar
            </button>
            <button className="px-6 py-2 text-sm font-semibold text-white bg-pink-600 rounded-lg hover:bg-pink-700">
              Publicar Vaga
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ClosedTab() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Cargo</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Contratado(a)</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Data de Encerramento</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Duração do Processo</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Candidatos</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
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

function AnalysisTab() {
  const metrics = [
    { label: 'Tempo Médio de Atração (TMA)', value: '31 dias',  detail: 'Meta: < 30 dias', ok: false },
    { label: 'Custo por Contratação (CPC)',   value: 'R$ 2.840', detail: 'Meta: < R$ 3.000', ok: true  },
    { label: 'Taxa de Aceite de Proposta',    value: '87,5%',   detail: 'Meta: > 85%',      ok: true  },
    { label: 'Retenção 90 dias',             value: '94,1%',   detail: 'Meta: > 90%',      ok: true  },
    { label: 'Candidatos por Vaga',           value: '52,7',    detail: 'Média últimos 90d', ok: true  },
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
              <div className="bg-pink-500 h-2 rounded-full transition-all" style={{ width: `${f.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ZIAChatTab() {
  const [messages] = useState([
    { from: 'zia', text: 'Olá! Sou a ZIA, sua assistente de recrutamento. Posso te ajudar a analisar candidatos, criar critérios de avaliação, redigir descrições de vagas ou consultar métricas do ATS. Como posso te ajudar hoje?' },
    { from: 'user', text: 'Quantos candidatos temos na vaga de Dev Full Stack Sênior?' },
    { from: 'zia', text: 'A vaga **V001 – Desenvolvedor Full Stack Sênior** (aberta em 10/01/2025) possui **42 candidatos** no momento. Atualmente está na etapa de Entrevistas. Gostaria que eu filtrasse os candidatos com mais de 5 anos de experiência em React?' },
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
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                m.from === 'user'
                  ? 'bg-pink-600 text-white rounded-br-sm'
                  : 'bg-white border border-slate-200 text-slate-700 rounded-bl-sm shadow-sm'
              }`}
            >
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

export default function Vacancies() {
  const [activeTab, setActiveTab] = useState('board');

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Vagas & ATS</h1>
          <p className="text-slate-500 text-sm mt-1">Sistema de rastreamento de candidatos com inteligência ZIA</p>
        </div>
        {activeTab !== 'new' && (
          <button onClick={() => setActiveTab('new')} className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-pink-600 rounded-lg hover:bg-pink-700 font-medium">
            <Plus className="w-4 h-4" /> Nova Vaga
          </button>
        )}
      </div>

      {/* Card with sub-tabs */}
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
          {activeTab === 'new'      && <NewVacancyTab />}
          {activeTab === 'board'    && <BoardTab />}
          {activeTab === 'closed'   && <ClosedTab />}
          {activeTab === 'analysis' && <AnalysisTab />}
          {activeTab === 'zia'      && <ZIAChatTab />}
        </div>
      </div>
    </div>
  );
}
