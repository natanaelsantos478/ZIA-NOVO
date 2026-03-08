// ─────────────────────────────────────────────────────────────────────────────
// Novo Caso — Formulário completo: diagnóstico, cadeia, anamnese, exames, etc.
// Universal: hospitalar, técnico, jurídico, clínico geral…
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { ArrowLeft, Save, ChevronDown, ChevronUp, Plus, X, Trash2 } from 'lucide-react';
import { MOCK_CASOS, gerarNumeroCaso } from '../mockData';
import type { PrioridadeAtend, DiagnosticoSecundario, CadeiaDiagnostico, ExameItem, EvolucaoItem, PrescricaoItem, MedicamentoItem, HabitoItem } from '../types';

interface Props { onBack: () => void; }

function Section({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-slate-50 transition-colors">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {open && <div className="px-5 pb-5 pt-1 border-t border-slate-100 space-y-4">{children}</div>}
    </div>
  );
}

const inp = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const sel = `${inp} bg-white`;

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4">{children}</div>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

export default function NovoCaso({ onBack }: Props) {
  const [sections, setSections] = useState({
    identificacao: true, paciente: true, responsavel: false,
    diagnostico: true, cadeiadiag: false, anamnese: false,
    medicamentos: false, exames: false, evolucoes: false, prescricoes: false,
  });
  function tog(k: keyof typeof sections) { setSections(s => ({ ...s, [k]: !s[k] })); }

  // Identificação
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipoCaso, setTipoCaso] = useState('Clínico');
  const [prioridade, setPrioridade] = useState<PrioridadeAtend>('MEDIA');
  const [protocolo, setProtocolo] = useState('');

  // Paciente
  const [pacNome, setPacNome] = useState('');
  const [pacCpf, setPacCpf] = useState('');
  const [pacNasc, setPacNasc] = useState('');
  const [pacGenero, setPacGenero] = useState('');

  // Responsável
  const [responsavel, setResponsavel] = useState('');
  const [equipe, setEquipe] = useState('');
  const [especialidade, setEspecialidade] = useState('');

  // Diagnóstico principal
  const [diagPrincipal, setDiagPrincipal] = useState('');
  const [cid10, setCid10] = useState('');
  const [prob, setProb] = useState('');
  const [causaDiag, setCausaDiag] = useState('');
  const [hipotese, setHipotese] = useState('');
  const [diagDifInput, setDiagDifInput] = useState('');
  const [diagDif, setDiagDif] = useState<string[]>([]);

  // Diagnósticos secundários
  const [diagSec, setDiagSec] = useState<Partial<DiagnosticoSecundario>[]>([]);

  // Cadeia de diagnósticos
  const [cadeia, setCadeia] = useState<Partial<CadeiaDiagnostico>[]>([]);

  // Anamnese
  const [queixa, setQueixa] = useState('');
  const [hda, setHda] = useState('');
  const [antPessoais, setAntPessoais] = useState('');
  const [antFamiliares, setAntFamiliares] = useState('');
  const [histCirurgico, setHistCirurgico] = useState('');
  const [alergias, setAlergias] = useState('');
  const [habitos, setHabitos] = useState<Partial<HabitoItem>[]>([]);

  // Medicamentos
  const [meds, setMeds] = useState<Partial<MedicamentoItem>[]>([]);

  // Exames
  const [exames, setExames] = useState<Partial<ExameItem>[]>([]);

  // Evoluções
  const [evolucoes, setEvolucoes] = useState<Partial<EvolucaoItem>[]>([]);

  // Prescrições
  const [prescricoes, setPrescricoes] = useState<Partial<PrescricaoItem>[]>([]);

  const [saved, setSaved] = useState(false);

  const PRIO_COLOR: Record<string, string> = {
    BAIXA: 'border-slate-300 text-slate-600', MEDIA: 'border-blue-400 text-blue-700',
    ALTA: 'border-amber-400 text-amber-700', CRITICA: 'border-red-400 text-red-700', URGENTE: 'border-red-600 bg-red-600 text-white',
  };

  function handleSave() {
    if (!titulo || !pacNome) return;
    console.log('Novo caso:', { numero: gerarNumeroCaso(MOCK_CASOS), titulo, pacNome });
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
          <h2 className="text-lg font-bold text-slate-900">Caso criado!</h2>
          <p className="text-sm text-slate-500">{gerarNumeroCaso(MOCK_CASOS)}</p>
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
          <h1 className="text-xl font-bold text-slate-900">Novo Caso</h1>
          <p className="text-xs text-slate-500">Cadastro completo de caso clínico, técnico ou institucional</p>
        </div>
      </div>

      {/* Identificação */}
      <Section title="Identificação do Caso" open={sections.identificacao} onToggle={() => tog('identificacao')}>
        <Grid>
          <Field label="Título" required>
            <input value={titulo} onChange={e => setTitulo(e.target.value)} className={inp} placeholder="Resumo do caso..." />
          </Field>
          <Field label="Tipo de Caso">
            <select value={tipoCaso} onChange={e => setTipoCaso(e.target.value)} className={sel}>
              {['Clínico','Clínico — Cirúrgico','Técnico','Técnico — Elétrico','Jurídico','Ambiental','Qualidade','Outro'].map(t =>
                <option key={t} value={t}>{t}</option>
              )}
            </select>
          </Field>
          <Field label="Descrição" required={false}>
            <textarea rows={2} value={descricao} onChange={e => setDescricao(e.target.value)} className={`${inp} resize-none`} placeholder="Contextualização inicial do caso..." />
          </Field>
          <div>
            <Field label="Protocolo Aplicado">
              <input value={protocolo} onChange={e => setProtocolo(e.target.value)} className={inp} placeholder="Ex: Protocolo Sepse v2.0..." />
            </Field>
          </div>
        </Grid>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-2">Prioridade</label>
          <div className="flex gap-2">
            {(['BAIXA','MEDIA','ALTA','CRITICA','URGENTE'] as PrioridadeAtend[]).map(p => (
              <button key={p} onClick={() => setPrioridade(p)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${prioridade === p ? PRIO_COLOR[p] : 'border-slate-200 text-slate-500'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* Paciente */}
      <Section title="Paciente / Entidade" open={sections.paciente} onToggle={() => tog('paciente')}>
        <Grid>
          <Field label="Nome Completo / Razão Social" required>
            <input value={pacNome} onChange={e => setPacNome(e.target.value)} className={inp} placeholder="Nome..." />
          </Field>
          <Field label="CPF / CNPJ">
            <input value={pacCpf} onChange={e => setPacCpf(e.target.value)} className={inp} placeholder="000.000.000-00" />
          </Field>
          <Field label="Data de Nascimento">
            <input type="date" value={pacNasc} onChange={e => setPacNasc(e.target.value)} className={inp} />
          </Field>
          <Field label="Gênero">
            <select value={pacGenero} onChange={e => setPacGenero(e.target.value)} className={sel}>
              <option value="">Não informado</option>
              <option value="MASCULINO">Masculino</option>
              <option value="FEMININO">Feminino</option>
              <option value="NAO_BINARIO">Não-binário</option>
            </select>
          </Field>
        </Grid>
      </Section>

      {/* Responsável */}
      <Section title="Responsável / Equipe" open={sections.responsavel} onToggle={() => tog('responsavel')}>
        <Grid>
          <Field label="Profissional Responsável">
            <input value={responsavel} onChange={e => setResponsavel(e.target.value)} className={inp} placeholder="Nome do responsável..." />
          </Field>
          <Field label="Especialidade">
            <input value={especialidade} onChange={e => setEspecialidade(e.target.value)} className={inp} placeholder="Ex: Cirurgia Geral, Eletrotécnica..." />
          </Field>
          <Field label="Equipe">
            <input value={equipe} onChange={e => setEquipe(e.target.value)} className={inp} placeholder="Ex: Equipe Cirúrgica A..." />
          </Field>
        </Grid>
      </Section>

      {/* Diagnóstico */}
      <Section title="Diagnóstico" open={sections.diagnostico} onToggle={() => tog('diagnostico')}>
        <Grid>
          <Field label="Diagnóstico Principal">
            <input value={diagPrincipal} onChange={e => setDiagPrincipal(e.target.value)} className={inp} placeholder="Ex: Apendicite aguda grau II..." />
          </Field>
          <Field label="CID-10 / Código">
            <input value={cid10} onChange={e => setCid10(e.target.value)} className={inp} placeholder="Ex: K37, F32.1..." />
          </Field>
          <Field label="Probabilidade do Diagnóstico (%)">
            <input type="number" min={0} max={100} value={prob} onChange={e => setProb(e.target.value)} className={inp} placeholder="0–100" />
          </Field>
          <Field label="Causa do Diagnóstico">
            <input value={causaDiag} onChange={e => setCausaDiag(e.target.value)} className={inp} placeholder="Causa principal identificada..." />
          </Field>
          <div className="col-span-2">
            <Field label="Hipótese Diagnóstica">
              <input value={hipotese} onChange={e => setHipotese(e.target.value)} className={inp} placeholder="Hipótese baseada em sintomas e exames..." />
            </Field>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Diagnóstico Diferencial</label>
            <div className="flex gap-2 mb-2 flex-wrap">
              {diagDif.map(d => (
                <span key={d} className="flex items-center gap-1 bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full">
                  {d} <button onClick={() => setDiagDif(dd => dd.filter(x => x !== d))}><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={diagDifInput} onChange={e => setDiagDifInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (diagDifInput.trim()) { setDiagDif(d => [...d, diagDifInput.trim()]); setDiagDifInput(''); } } }}
                className={inp} placeholder="Digite diagnóstico diferencial e pressione Enter..." />
            </div>
          </div>
        </Grid>

        {/* Diagnósticos secundários */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-600">Diagnósticos Secundários</label>
            <button onClick={() => setDiagSec(d => [...d, { id: crypto.randomUUID(), descricao: '', probabilidade: 0, confirmado: false }])}
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
              <Plus className="w-3.5 h-3.5" /> Adicionar
            </button>
          </div>
          {diagSec.map((d, i) => (
            <div key={i} className="flex gap-2 mb-2 items-start">
              <input value={d.descricao ?? ''} placeholder="Diagnóstico secundário..."
                onChange={e => setDiagSec(ds => ds.map((x, j) => j === i ? { ...x, descricao: e.target.value } : x))}
                className={`${inp} flex-1`} />
              <input value={d.cid10 ?? ''} placeholder="CID-10" style={{ width: 80 }}
                onChange={e => setDiagSec(ds => ds.map((x, j) => j === i ? { ...x, cid10: e.target.value } : x))}
                className={inp} />
              <input type="number" min={0} max={100} value={d.probabilidade ?? ''} placeholder="%" style={{ width: 64 }}
                onChange={e => setDiagSec(ds => ds.map((x, j) => j === i ? { ...x, probabilidade: Number(e.target.value) } : x))}
                className={inp} />
              <button onClick={() => setDiagSec(ds => ds.filter((_, j) => j !== i))}
                className="p-2 text-slate-400 hover:text-red-500 transition-colors mt-0.5"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </Section>

      {/* Cadeia de Diagnósticos */}
      <Section title="Cadeia de Diagnósticos" open={sections.cadeiadiag} onToggle={() => tog('cadeiadiag')}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-slate-500">Sequência causal de diagnósticos — da raiz ao diagnóstico principal</p>
          <button onClick={() => setCadeia(c => [...c, { id: crypto.randomUUID(), ordem: c.length + 1, diagnostico: '', data: new Date().toISOString().slice(0, 10), responsavel: '' }])}
            className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
            <Plus className="w-3.5 h-3.5" /> Adicionar elo
          </button>
        </div>
        {cadeia.map((c, i) => (
          <div key={i} className="flex gap-2 items-start border-l-2 border-blue-100 pl-3 mb-3">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs flex-shrink-0 mt-1">
              {i + 1}
            </div>
            <div className="flex-1 grid grid-cols-2 gap-2">
              <input value={c.diagnostico ?? ''} placeholder="Diagnóstico / evento..."
                onChange={e => setCadeia(cs => cs.map((x, j) => j === i ? { ...x, diagnostico: e.target.value } : x))}
                className={`${inp} col-span-2`} />
              <input value={c.causa ?? ''} placeholder="Causa"
                onChange={e => setCadeia(cs => cs.map((x, j) => j === i ? { ...x, causa: e.target.value } : x))}
                className={inp} />
              <input value={c.efeito ?? ''} placeholder="Efeito / consequência"
                onChange={e => setCadeia(cs => cs.map((x, j) => j === i ? { ...x, efeito: e.target.value } : x))}
                className={inp} />
              <input value={c.responsavel ?? ''} placeholder="Responsável"
                onChange={e => setCadeia(cs => cs.map((x, j) => j === i ? { ...x, responsavel: e.target.value } : x))}
                className={inp} />
              <input type="date" value={c.data ?? ''} onChange={e => setCadeia(cs => cs.map((x, j) => j === i ? { ...x, data: e.target.value } : x))}
                className={inp} />
            </div>
            <button onClick={() => setCadeia(cs => cs.filter((_, j) => j !== i).map((x, j) => ({ ...x, ordem: j + 1 })))}
              className="p-1.5 text-slate-400 hover:text-red-500 transition-colors mt-0.5"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
        {cadeia.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Nenhum elo na cadeia ainda. Clique em "Adicionar elo".</p>}
      </Section>

      {/* Anamnese */}
      <Section title="Anamnese" open={sections.anamnese} onToggle={() => tog('anamnese')}>
        <Field label="Queixa Principal">
          <textarea rows={2} value={queixa} onChange={e => setQueixa(e.target.value)} className={`${inp} resize-none`} placeholder="Queixa principal do paciente..." />
        </Field>
        <Field label="História da Doença Atual">
          <textarea rows={3} value={hda} onChange={e => setHda(e.target.value)} className={`${inp} resize-none`} placeholder="Descreva a evolução da doença/problema atual..." />
        </Field>
        <Grid>
          <Field label="Antecedentes Pessoais">
            <textarea rows={2} value={antPessoais} onChange={e => setAntPessoais(e.target.value)} className={`${inp} resize-none`} placeholder="HAS, DM, cardiopatia..." />
          </Field>
          <Field label="Antecedentes Familiares">
            <textarea rows={2} value={antFamiliares} onChange={e => setAntFamiliares(e.target.value)} className={`${inp} resize-none`} placeholder="Histórico familiar relevante..." />
          </Field>
          <Field label="Histórico Cirúrgico">
            <input value={histCirurgico} onChange={e => setHistCirurgico(e.target.value)} className={inp} placeholder="Cirurgias anteriores..." />
          </Field>
          <Field label="Alergias">
            <input value={alergias} onChange={e => setAlergias(e.target.value)} className={inp} placeholder="Dipirona, Penicilina, Látex..." />
          </Field>
        </Grid>
        {/* Hábitos */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-600">Hábitos</label>
            <button onClick={() => setHabitos(h => [...h, { tipo: 'OUTRO', descricao: '', frequencia: '' }])}
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
              <Plus className="w-3.5 h-3.5" /> Adicionar
            </button>
          </div>
          {habitos.map((h, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <select value={h.tipo} onChange={e => setHabitos(hs => hs.map((x, j) => j === i ? { ...x, tipo: e.target.value as HabitoItem['tipo'] } : x))}
                className={`${sel} w-40`}>
                {['TABAGISMO','ETILISMO','SEDENTARISMO','ATIVIDADE_FISICA','ALIMENTACAO','OUTRO'].map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
              <input value={h.descricao ?? ''} placeholder="Descrição"
                onChange={e => setHabitos(hs => hs.map((x, j) => j === i ? { ...x, descricao: e.target.value } : x))}
                className={`${inp} flex-1`} />
              <input value={h.frequencia ?? ''} placeholder="Frequência"
                onChange={e => setHabitos(hs => hs.map((x, j) => j === i ? { ...x, frequencia: e.target.value } : x))}
                className={`${inp} w-32`} />
              <button onClick={() => setHabitos(hs => hs.filter((_, j) => j !== i))} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </Section>

      {/* Medicamentos em uso */}
      <Section title="Medicamentos em Uso" open={sections.medicamentos} onToggle={() => tog('medicamentos')}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-slate-500">Medicamentos em uso contínuo pelo paciente</p>
          <button onClick={() => setMeds(m => [...m, { id: crypto.randomUUID(), nome: '', dosagem: '', via: 'VO', frequencia: '' }])}
            className="flex items-center gap-1 text-xs text-blue-600 hover:underline"><Plus className="w-3.5 h-3.5" /> Adicionar</button>
        </div>
        {meds.map((m, i) => (
          <div key={i} className="grid grid-cols-4 gap-2 mb-2 items-end">
            <input value={m.nome ?? ''} placeholder="Medicamento" onChange={e => setMeds(ms => ms.map((x, j) => j === i ? { ...x, nome: e.target.value } : x))} className={`${inp} col-span-1`} />
            <input value={m.dosagem ?? ''} placeholder="Dosagem (ex: 50mg)" onChange={e => setMeds(ms => ms.map((x, j) => j === i ? { ...x, dosagem: e.target.value } : x))} className={inp} />
            <input value={m.via ?? ''} placeholder="Via (VO, IV...)" onChange={e => setMeds(ms => ms.map((x, j) => j === i ? { ...x, via: e.target.value } : x))} className={inp} />
            <div className="flex gap-2">
              <input value={m.frequencia ?? ''} placeholder="Frequência" onChange={e => setMeds(ms => ms.map((x, j) => j === i ? { ...x, frequencia: e.target.value } : x))} className={`${inp} flex-1`} />
              <button onClick={() => setMeds(ms => ms.filter((_, j) => j !== i))} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
        {meds.length === 0 && <p className="text-xs text-slate-400 text-center py-3">Nenhum medicamento cadastrado.</p>}
      </Section>

      {/* Exames */}
      <Section title="Exames Solicitados / Realizados" open={sections.exames} onToggle={() => tog('exames')}>
        <button onClick={() => setExames(e => [...e, { id: crypto.randomUUID(), tipo: 'LABORATORIAL', nome: '', data_solicitacao: new Date().toISOString().slice(0, 10), status: 'SOLICITADO' }])}
          className="flex items-center gap-1 text-xs text-blue-600 hover:underline mb-2"><Plus className="w-3.5 h-3.5" /> Adicionar exame</button>
        {exames.map((e, i) => (
          <div key={i} className="grid grid-cols-4 gap-2 mb-2 items-end">
            <select value={e.tipo} onChange={ev => setExames(es => es.map((x, j) => j === i ? { ...x, tipo: ev.target.value as ExameItem['tipo'] } : x))} className={`${sel}`}>
              {['LABORATORIAL','IMAGEM','FUNCIONAL','BIOPSIA','OUTRO'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input value={e.nome ?? ''} placeholder="Nome do exame" onChange={ev => setExames(es => es.map((x, j) => j === i ? { ...x, nome: ev.target.value } : x))} className={inp} />
            <select value={e.status} onChange={ev => setExames(es => es.map((x, j) => j === i ? { ...x, status: ev.target.value as ExameItem['status'] } : x))} className={sel}>
              {['SOLICITADO','AGENDADO','REALIZADO','LAUDO_DISPONIVEL','CANCELADO'].map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
            <div className="flex gap-2">
              <input type="date" value={e.data_solicitacao ?? ''} onChange={ev => setExames(es => es.map((x, j) => j === i ? { ...x, data_solicitacao: ev.target.value } : x))} className={`${inp} flex-1`} />
              <button onClick={() => setExames(es => es.filter((_, j) => j !== i))} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
        {exames.length === 0 && <p className="text-xs text-slate-400 text-center py-3">Nenhum exame cadastrado.</p>}
      </Section>

      {/* Evoluções */}
      <Section title="Evoluções" open={sections.evolucoes} onToggle={() => tog('evolucoes')}>
        <button onClick={() => setEvolucoes(e => [...e, { id: crypto.randomUUID(), data: new Date().toISOString().slice(0, 16), responsavel: '', texto: '', tipo: 'EVOLUCAO' }])}
          className="flex items-center gap-1 text-xs text-blue-600 hover:underline mb-2"><Plus className="w-3.5 h-3.5" /> Adicionar evolução</button>
        {evolucoes.map((ev, i) => (
          <div key={i} className="bg-slate-50 rounded-lg p-3 mb-2 space-y-2">
            <div className="flex gap-2">
              <input type="datetime-local" value={ev.data ?? ''} onChange={e => setEvolucoes(es => es.map((x, j) => j === i ? { ...x, data: e.target.value } : x))} className={`${inp} flex-1`} />
              <input value={ev.responsavel ?? ''} placeholder="Responsável" onChange={e => setEvolucoes(es => es.map((x, j) => j === i ? { ...x, responsavel: e.target.value } : x))} className={`${inp} flex-1`} />
              <select value={ev.tipo} onChange={e => setEvolucoes(es => es.map((x, j) => j === i ? { ...x, tipo: e.target.value as EvolucaoItem['tipo'] } : x))} className={`${sel} w-36`}>
                {['EVOLUCAO','INTERCORRENCIA','ALTA','TRANSFERENCIA','OBITO','PRESCRICAO'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <button onClick={() => setEvolucoes(es => es.filter((_, j) => j !== i))} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
            </div>
            <textarea value={ev.texto ?? ''} rows={2} placeholder="Texto da evolução..." onChange={e => setEvolucoes(es => es.map((x, j) => j === i ? { ...x, texto: e.target.value } : x))} className={`${inp} resize-none`} />
          </div>
        ))}
        {evolucoes.length === 0 && <p className="text-xs text-slate-400 text-center py-3">Nenhuma evolução registrada.</p>}
      </Section>

      {/* Prescrições */}
      <Section title="Prescrições" open={sections.prescricoes} onToggle={() => tog('prescricoes')}>
        <button onClick={() => setPrescricoes(p => [...p, { id: crypto.randomUUID(), data: new Date().toISOString().slice(0, 10), responsavel: '', medicamento: '', dosagem: '', via: 'VO', frequencia: '', duracao: '' }])}
          className="flex items-center gap-1 text-xs text-blue-600 hover:underline mb-2"><Plus className="w-3.5 h-3.5" /> Adicionar prescrição</button>
        {prescricoes.map((p, i) => (
          <div key={i} className="bg-slate-50 rounded-lg p-3 mb-2">
            <div className="grid grid-cols-3 gap-2 mb-2">
              <input value={p.responsavel ?? ''} placeholder="Prescritor" onChange={e => setPrescricoes(ps => ps.map((x, j) => j === i ? { ...x, responsavel: e.target.value } : x))} className={inp} />
              <input value={p.medicamento ?? ''} placeholder="Medicamento" onChange={e => setPrescricoes(ps => ps.map((x, j) => j === i ? { ...x, medicamento: e.target.value } : x))} className={inp} />
              <div className="flex gap-2">
                <input type="date" value={p.data ?? ''} onChange={e => setPrescricoes(ps => ps.map((x, j) => j === i ? { ...x, data: e.target.value } : x))} className={`${inp} flex-1`} />
                <button onClick={() => setPrescricoes(ps => ps.filter((_, j) => j !== i))} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <input value={p.dosagem ?? ''} placeholder="Dosagem" onChange={e => setPrescricoes(ps => ps.map((x, j) => j === i ? { ...x, dosagem: e.target.value } : x))} className={inp} />
              <input value={p.via ?? ''} placeholder="Via" onChange={e => setPrescricoes(ps => ps.map((x, j) => j === i ? { ...x, via: e.target.value } : x))} className={inp} />
              <input value={p.frequencia ?? ''} placeholder="Frequência" onChange={e => setPrescricoes(ps => ps.map((x, j) => j === i ? { ...x, frequencia: e.target.value } : x))} className={inp} />
              <input value={p.duracao ?? ''} placeholder="Duração" onChange={e => setPrescricoes(ps => ps.map((x, j) => j === i ? { ...x, duracao: e.target.value } : x))} className={inp} />
            </div>
          </div>
        ))}
        {prescricoes.length === 0 && <p className="text-xs text-slate-400 text-center py-3">Nenhuma prescrição registrada.</p>}
      </Section>

      {/* Ações */}
      <div className="flex justify-end gap-3 pb-4">
        <button onClick={onBack} className="px-5 py-2 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">Cancelar</button>
        <button onClick={handleSave} disabled={!titulo || !pacNome}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors">
          <Save className="w-4 h-4" /> Criar Caso
        </button>
      </div>
    </div>
  );
}
