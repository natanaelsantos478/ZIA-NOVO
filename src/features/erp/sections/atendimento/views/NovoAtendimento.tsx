// ─────────────────────────────────────────────────────────────────────────────
// Novo Atendimento — Formulário completo multi-seção
// Universal: hospitalar, técnico, comercial, suporte, etc.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { ChevronDown, ChevronUp, Save, ArrowLeft, Plus, X } from 'lucide-react';
import { MOCK_ATENDIMENTOS, gerarNumeroAtendimento } from '../mockData';
import type { TipoAtendimento, CanalEntrada, PrioridadeAtend, RiscoTriagem } from '../types';

interface Props { onBack: () => void; }

const TIPOS: TipoAtendimento[] = [
  'SUPORTE_TECNICO','HOSPITALAR','CONSULTA_MEDICA','TRIAGEM','EMERGENCIA',
  'ATENDIMENTO_COMERCIAL','MANUTENCAO','INSTALACAO','VISITA_TECNICA',
  'RECLAMACAO','SOLICITACAO','INFORMACAO','DEVOLUCAO','OUTRO',
];

const CANAIS: CanalEntrada[] = ['PRESENCIAL','TELEFONE','EMAIL','CHAT','WHATSAPP','APP_MOBILE','PORTAL','OUTRO'];

const PRIORIDADES: PrioridadeAtend[] = ['BAIXA','MEDIA','ALTA','CRITICA','URGENTE'];

const PRIO_COLOR: Record<string, string> = {
  BAIXA: 'border-slate-300 bg-slate-50 text-slate-700',
  MEDIA: 'border-blue-400 bg-blue-50 text-blue-700',
  ALTA: 'border-amber-400 bg-amber-50 text-amber-700',
  CRITICA: 'border-red-400 bg-red-50 text-red-700',
  URGENTE: 'border-red-600 bg-red-600 text-white',
};

const RISCO_COR: Record<RiscoTriagem, string> = {
  VERMELHO: 'bg-red-600 text-white', LARANJA: 'bg-orange-500 text-white',
  AMARELO: 'bg-yellow-400 text-slate-900', VERDE: 'bg-green-500 text-white', AZUL: 'bg-blue-500 text-white',
};

const RISCO_DESC: Record<RiscoTriagem, string> = {
  VERMELHO: 'Emergência', LARANJA: 'Muito urgente', AMARELO: 'Urgente', VERDE: 'Pouco urgente', AZUL: 'Não urgente',
};

function Section({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-slate-50 transition-colors"
      >
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && <div className="px-5 pb-5 pt-1 border-t border-slate-100 grid grid-cols-2 gap-4">{children}</div>}
    </div>
  );
}

function Field({ label, required, colSpan = 1, children }: { label: string; required?: boolean; colSpan?: 1 | 2; children: React.ReactNode }) {
  return (
    <div className={colSpan === 2 ? 'col-span-2' : ''}>
      <label className="block text-xs font-medium text-slate-600 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inp = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const sel = `${inp} bg-white`;

export default function NovoAtendimento({ onBack }: Props) {
  // Seções abertas/fechadas
  const [sections, setSections] = useState({
    solicitante: true, atendimento: true, responsavel: false,
    clinico: false, vinculos: false, extras: false,
  });

  function toggleSection(k: keyof typeof sections) {
    setSections(s => ({ ...s, [k]: !s[k] }));
  }

  // Form state
  const [tipo, setTipo] = useState<TipoAtendimento>('SUPORTE_TECNICO');
  const [canal, setCanal] = useState<CanalEntrada>('PRESENCIAL');
  const [prioridade, setPrioridade] = useState<PrioridadeAtend>('MEDIA');
  const [slaHoras, setSlaHoras] = useState(24);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [setor, setSetor] = useState('');
  const [categoria, setCategoria] = useState('');
  const [subcategoria, setSubcategoria] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [solNome, setSolNome] = useState('');
  const [solTipo, setSolTipo] = useState<'PESSOA_FISICA' | 'PESSOA_JURIDICA'>('PESSOA_FISICA');
  const [solCpfCnpj, setSolCpfCnpj] = useState('');
  const [solNasc, setSolNasc] = useState('');
  const [solGenero, setSolGenero] = useState('');
  const [solTel, setSolTel] = useState('');
  const [solEmail, setSolEmail] = useState('');
  const [solEnd, setSolEnd] = useState('');
  const [solConvenio, setSolConvenio] = useState('');
  const [solMatricula, setSolMatricula] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [equipe, setEquipe] = useState('');
  const [unidade, setUnidade] = useState('');
  const [motivo, setMotivo] = useState('');
  const [sintomas, setSintomas] = useState('');
  const [historico, setHistorico] = useState('');
  const [risco, setRisco] = useState<RiscoTriagem | ''>('');
  const [alergias, setAlergias] = useState('');
  const [nivelDor, setNivelDor] = useState('');
  const [casoId, setCasoId] = useState('');
  const [valorEstimado, setValorEstimado] = useState('');
  const [camposExtras, setCamposExtras] = useState<{ key: string; value: string }[]>([]);
  const [saved, setSaved] = useState(false);

  function addTag() {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags(ts => [...ts, t]);
    setTagInput('');
  }

  function addCampoExtra() {
    setCamposExtras(c => [...c, { key: '', value: '' }]);
  }

  function handleSave() {
    if (!solNome || !titulo) return;
    const numero = gerarNumeroAtendimento(MOCK_ATENDIMENTOS);
    // In a real app: POST to API
    console.log('Novo atendimento:', { numero, tipo, canal, prioridade, titulo });
    setSaved(true);
    setTimeout(() => onBack(), 1500);
  }

  if (saved) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Save className="w-7 h-7 text-green-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Atendimento criado!</h2>
          <p className="text-sm text-slate-500 mt-1">Número: {gerarNumeroAtendimento(MOCK_ATENDIMENTOS)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Novo Atendimento</h1>
          <p className="text-xs text-slate-500">Preencha os dados para abrir o atendimento</p>
        </div>
      </div>

      {/* Identificação rápida — sempre visível */}
      <div className="bg-white rounded-xl border border-slate-200 px-5 py-4">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Identificação</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Tipo de Atendimento <span className="text-red-500">*</span></label>
            <select value={tipo} onChange={e => setTipo(e.target.value as TipoAtendimento)} className={sel}>
              {TIPOS.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Canal de Entrada</label>
            <select value={canal} onChange={e => setCanal(e.target.value as CanalEntrada)} className={sel}>
              {CANAIS.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">SLA (horas)</label>
            <input type="number" min={1} value={slaHoras} onChange={e => setSlaHoras(Number(e.target.value))} className={inp} />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-medium text-slate-600 mb-2">Prioridade</label>
          <div className="flex gap-2">
            {PRIORIDADES.map(p => (
              <button key={p} onClick={() => setPrioridade(p)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${prioridade === p ? PRIO_COLOR[p] + ' border-current' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Dados do Solicitante */}
      <Section title="Solicitante / Paciente" open={sections.solicitante} onToggle={() => toggleSection('solicitante')}>
        <Field label="Tipo de Pessoa" required>
          <select value={solTipo} onChange={e => setSolTipo(e.target.value as typeof solTipo)} className={sel}>
            <option value="PESSOA_FISICA">Pessoa Física</option>
            <option value="PESSOA_JURIDICA">Pessoa Jurídica</option>
          </select>
        </Field>
        <Field label={solTipo === 'PESSOA_FISICA' ? 'Nome Completo' : 'Razão Social'} required>
          <input value={solNome} onChange={e => setSolNome(e.target.value)} className={inp} placeholder="Nome..." />
        </Field>
        <Field label={solTipo === 'PESSOA_FISICA' ? 'CPF' : 'CNPJ'}>
          <input value={solCpfCnpj} onChange={e => setSolCpfCnpj(e.target.value)} className={inp} placeholder="000.000.000-00" />
        </Field>
        {solTipo === 'PESSOA_FISICA' && (
          <Field label="Data de Nascimento">
            <input type="date" value={solNasc} onChange={e => setSolNasc(e.target.value)} className={inp} />
          </Field>
        )}
        {solTipo === 'PESSOA_FISICA' && (
          <Field label="Gênero">
            <select value={solGenero} onChange={e => setSolGenero(e.target.value)} className={sel}>
              <option value="">Não informado</option>
              <option value="MASCULINO">Masculino</option>
              <option value="FEMININO">Feminino</option>
              <option value="NAO_BINARIO">Não-binário</option>
            </select>
          </Field>
        )}
        <Field label="Telefone">
          <input value={solTel} onChange={e => setSolTel(e.target.value)} className={inp} placeholder="(00) 00000-0000" />
        </Field>
        <Field label="E-mail">
          <input type="email" value={solEmail} onChange={e => setSolEmail(e.target.value)} className={inp} placeholder="email@exemplo.com" />
        </Field>
        <Field label="Endereço" colSpan={2}>
          <input value={solEnd} onChange={e => setSolEnd(e.target.value)} className={inp} placeholder="Rua, número, bairro — Cidade, UF" />
        </Field>
        <Field label="Convênio / Empresa">
          <input value={solConvenio} onChange={e => setSolConvenio(e.target.value)} className={inp} placeholder="Nome do convênio ou empresa" />
        </Field>
        <Field label="Número do Convênio / Matrícula">
          <input value={solMatricula} onChange={e => setSolMatricula(e.target.value)} className={inp} placeholder="00000000" />
        </Field>
      </Section>

      {/* Dados do Atendimento */}
      <Section title="Dados do Atendimento" open={sections.atendimento} onToggle={() => toggleSection('atendimento')}>
        <Field label="Título" required colSpan={2}>
          <input value={titulo} onChange={e => setTitulo(e.target.value)} className={inp} placeholder="Resumo objetivo do atendimento..." />
        </Field>
        <Field label="Descrição Detalhada" colSpan={2}>
          <textarea rows={4} value={descricao} onChange={e => setDescricao(e.target.value)} className={`${inp} resize-none`} placeholder="Descreva em detalhes o problema, solicitação ou situação..." />
        </Field>
        <Field label="Setor / Departamento">
          <input value={setor} onChange={e => setSetor(e.target.value)} className={inp} placeholder="Ex: Clínica Geral, TI, Pós-Venda..." />
        </Field>
        <Field label="Categoria">
          <input value={categoria} onChange={e => setCategoria(e.target.value)} className={inp} placeholder="Ex: Manutenção, Consulta, Suporte..." />
        </Field>
        <Field label="Subcategoria">
          <input value={subcategoria} onChange={e => setSubcategoria(e.target.value)} className={inp} placeholder="Ex: Elétrica, Urgência, Nível 2..." />
        </Field>
        <Field label="Valor Estimado (R$)">
          <input type="number" min={0} step={0.01} value={valorEstimado} onChange={e => setValorEstimado(e.target.value)} className={inp} placeholder="0,00" />
        </Field>
        <Field label="Tags" colSpan={2}>
          <div className="flex gap-2 mb-2 flex-wrap">
            {tags.map(t => (
              <span key={t} className="flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                {t}
                <button onClick={() => setTags(ts => ts.filter(x => x !== t))}><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={tagInput} onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
              className={inp} placeholder="Digite uma tag e pressione Enter..." />
            <button onClick={addTag} className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-200 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </Field>
      </Section>

      {/* Responsável */}
      <Section title="Responsável pelo Atendimento" open={sections.responsavel} onToggle={() => toggleSection('responsavel')}>
        <Field label="Atendente / Profissional Responsável">
          <input value={responsavel} onChange={e => setResponsavel(e.target.value)} className={inp} placeholder="Nome do responsável..." />
        </Field>
        <Field label="Equipe">
          <input value={equipe} onChange={e => setEquipe(e.target.value)} className={inp} placeholder="Ex: Equipe A, Suporte N2..." />
        </Field>
        <Field label="Unidade / Local">
          <input value={unidade} onChange={e => setUnidade(e.target.value)} className={inp} placeholder="Ex: UPA Centro, Loja 07..." />
        </Field>
      </Section>

      {/* Informações Clínicas / Técnicas */}
      <Section title="Informações Clínicas / Técnicas (expandível)" open={sections.clinico} onToggle={() => toggleSection('clinico')}>
        <Field label="Motivo da Visita / Consulta" colSpan={2}>
          <input value={motivo} onChange={e => setMotivo(e.target.value)} className={inp} placeholder="Principal motivo declarado pelo solicitante..." />
        </Field>
        <Field label="Sintomas / Problema Relatado" colSpan={2}>
          <textarea rows={3} value={sintomas} onChange={e => setSintomas(e.target.value)} className={`${inp} resize-none`} placeholder="Descreva os sintomas, falhas ou problemas observados..." />
        </Field>
        <Field label="Histórico Relevante" colSpan={2}>
          <textarea rows={2} value={historico} onChange={e => setHistorico(e.target.value)} className={`${inp} resize-none`} placeholder="Histórico médico, manutenções anteriores, contexto..." />
        </Field>
        <Field label="Alergias Conhecidas">
          <input value={alergias} onChange={e => setAlergias(e.target.value)} className={inp} placeholder="Ex: Dipirona, Penicilina, Látex..." />
        </Field>
        <Field label="Nível de Dor (0–10)">
          <input type="number" min={0} max={10} value={nivelDor} onChange={e => setNivelDor(e.target.value)} className={inp} placeholder="0 a 10" />
        </Field>
        <Field label="Classificação de Risco — Triagem (Manchester)" colSpan={2}>
          <div className="flex gap-2 flex-wrap">
            {(['VERMELHO','LARANJA','AMARELO','VERDE','AZUL'] as RiscoTriagem[]).map(r => (
              <button key={r} onClick={() => setRisco(r === risco ? '' : r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${risco === r ? RISCO_COR[r] + ' border-transparent' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                {r} — {RISCO_DESC[r]}
              </button>
            ))}
          </div>
        </Field>
      </Section>

      {/* Vinculações */}
      <Section title="Vinculações" open={sections.vinculos} onToggle={() => toggleSection('vinculos')}>
        <Field label="ID do Caso vinculado">
          <input value={casoId} onChange={e => setCasoId(e.target.value)} className={inp} placeholder="CSO-2026-000001" />
        </Field>
      </Section>

      {/* Campos Extras */}
      <Section title="Campos Extras (dados setoriais)" open={sections.extras} onToggle={() => toggleSection('extras')}>
        <div className="col-span-2 space-y-2">
          {camposExtras.map((c, i) => (
            <div key={i} className="flex gap-2">
              <input value={c.key} placeholder="Nome do campo"
                onChange={e => setCamposExtras(cs => cs.map((x, j) => j === i ? { ...x, key: e.target.value } : x))}
                className={`${inp} flex-1`} />
              <input value={c.value} placeholder="Valor"
                onChange={e => setCamposExtras(cs => cs.map((x, j) => j === i ? { ...x, value: e.target.value } : x))}
                className={`${inp} flex-1`} />
              <button onClick={() => setCamposExtras(cs => cs.filter((_, j) => j !== i))}
                className="p-2 text-slate-400 hover:text-red-500 transition-colors"><X className="w-4 h-4" /></button>
            </div>
          ))}
          <button onClick={addCampoExtra} className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline mt-1">
            <Plus className="w-3.5 h-3.5" /> Adicionar campo extra
          </button>
        </div>
      </Section>

      {/* Ações */}
      <div className="flex justify-end gap-3 pb-4">
        <button onClick={onBack} className="px-5 py-2 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={!solNome || !titulo}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Save className="w-4 h-4" /> Abrir Atendimento
        </button>
      </div>
    </div>
  );
}
