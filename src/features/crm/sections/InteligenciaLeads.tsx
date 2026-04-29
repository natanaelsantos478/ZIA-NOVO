// ─────────────────────────────────────────────────────────────────────────────
// Inteligência de Leads — Análise completa de leads com IA + pesquisa online
// A IA pesquisa o lead na internet, analisa o portfólio do ERP e gera um
// relatório detalhado com oportunidades, plano de ação e score comercial.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import {
  Search, Sparkles, Building2, Globe, User, Hash,
  AlertTriangle, CheckCircle2, Clock,
  Target, Zap, FileText, Plus,
  History, ChevronRight, RotateCcw, ExternalLink,
  Flame, Thermometer, Snowflake, Package, Lightbulb,
  ShieldAlert, ListChecks,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { getProdutos } from '../../../lib/erp';
import { getAllNegociacoes, createNegociacao } from '../data/crmData';
import type { ErpProduto } from '../../../lib/erp';
import { useCRMContexto } from '../hooks/useCRMContexto';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface LeadInput {
  nome: string;
  cnpj: string;
  website: string;
  setor: string;
  contato: string;
  observacoes: string;
}

interface ProdutoRec { nome: string; motivo: string; prioridade: 'alta' | 'media' | 'baixa'; }
interface AcaoLead { ordem: number; acao: string; descricao: string; prazo: string; prioridade: 'alta' | 'media' | 'baixa'; }

interface LeadReport {
  lead: LeadInput;
  perfil: string;
  potencial: 'alto' | 'medio' | 'baixo';
  score: number;
  score_motivo: string;
  produtos_recomendados: ProdutoRec[];
  oportunidades: string[];
  desafios: string[];
  plano_acao: AcaoLead[];
  abordagem: string;
  proximos_passos: string[];
  fontes: string[];
  gerado_em: string;
}

// ── Chamadas de IA ────────────────────────────────────────────────────────────

async function webSearchLead(leadNome: string, cnpj: string, website: string): Promise<{ text: string; sources: string[] }> {
  const query = `Pesquise informações completas sobre: "${leadNome}"${cnpj ? ` CNPJ ${cnpj}` : ''}${website ? ` site ${website}` : ''}. Inclua: segmento, porte, produtos/serviços, clientes, presença digital, notícias recentes, desafios do setor, potencial de compra.`;
  const { data, error } = await supabase.functions.invoke('ai-proxy', {
    body: {
      type: 'gemini-pro-search',
      messages: [{ role: 'user', content: query }],
      system: 'Você é um analista de inteligência comercial. Pesquise e sintetize informações sobre empresas para embasar estratégias de venda.',
    },
  });
  if (error) throw new Error(error.message);
  const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const sources: string[] = (data?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [])
    .map((c: any) => c.web?.uri ?? '').filter(Boolean).slice(0, 8);
  return { text, sources };
}

async function generateReport(
  input: LeadInput,
  webInfo: string,
  produtos: ErpProduto[],
  hasNeg: boolean,
): Promise<Omit<LeadReport, 'lead' | 'fontes' | 'gerado_em'>> {
  const portfolioText = produtos.slice(0, 30).map(p =>
    `• ${p.nome}${p.descricao ? ': ' + p.descricao.slice(0, 60) : ''} — R$${(p.preco_venda ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
  ).join('\n');

  const prompt = `Você é um consultor de vendas sênior. Analise este lead e gere um relatório comercial detalhado.

━━ LEAD ━━
Nome: ${input.nome}
CNPJ: ${input.cnpj || 'não informado'}
Website: ${input.website || 'não informado'}
Setor: ${input.setor || 'não informado'}
Contato: ${input.contato || 'não informado'}
Observações do vendedor: ${input.observacoes || 'nenhuma'}
Já existe negociação ativa no CRM: ${hasNeg ? 'Sim' : 'Não'}

━━ PESQUISA NA INTERNET ━━
${webInfo || 'Nenhuma informação encontrada na internet.'}

━━ PORTFÓLIO DA EMPRESA ━━
${portfolioText || 'Nenhum produto/serviço cadastrado ainda.'}

━━ INSTRUÇÕES ━━
Responda APENAS com JSON válido, sem markdown, sem texto adicional.
Score: 0–100 baseado em fit comercial, interesse detectado e potencial de receita.
Potencial: "alto" (score≥70), "medio" (40-69), "baixo" (<40).

{
  "perfil": "Análise detalhada da empresa/pessoa (3-5 parágrafos)",
  "potencial": "alto|medio|baixo",
  "score": 82,
  "score_motivo": "Justificativa em 2 linhas do score",
  "produtos_recomendados": [
    {"nome": "Nome exato do produto", "motivo": "Por que se encaixa para este lead", "prioridade": "alta|media|baixa"}
  ],
  "oportunidades": ["Oportunidade específica 1", "Oportunidade 2", "Oportunidade 3"],
  "desafios": ["Desafio/objeção esperada 1", "Desafio 2"],
  "plano_acao": [
    {"ordem": 1, "acao": "Título da ação", "descricao": "Descrição detalhada do que fazer e como", "prazo": "3 dias", "prioridade": "alta|media|baixa"}
  ],
  "abordagem": "Estratégia de abordagem recomendada: tom, canal, argumentos principais, como se diferenciar",
  "proximos_passos": ["Passo imediato 1", "Passo 2", "Passo 3"]
}`;

  const { data, error } = await supabase.functions.invoke('ai-proxy', {
    body: { type: 'gemini-pro', prompt },
  });
  if (error) throw new Error(error.message);
  const raw: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
  const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(clean);
}

// ── Persistência ──────────────────────────────────────────────────────────────

const LS_KEY = 'zia_lead_intel_v1';
const loadHistory = (): LeadReport[] => { try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]'); } catch { return []; } };
const saveHistory = (list: LeadReport[]) => localStorage.setItem(LS_KEY, JSON.stringify(list.slice(0, 30)));

// ── Helpers de estilo ─────────────────────────────────────────────────────────

const PRIO_CLS: Record<string, string> = {
  alta:  'bg-red-100 text-red-700 border border-red-200',
  media: 'bg-amber-100 text-amber-700 border border-amber-200',
  baixa: 'bg-slate-100 text-slate-600 border border-slate-200',
};

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 70 ? '#10b981' : score >= 40 ? '#f59e0b' : '#ef4444';
  const pct   = Math.min(100, Math.max(0, score));
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-28 h-14 overflow-hidden">
        <svg viewBox="0 0 120 60" className="w-full h-full">
          <path d="M10,60 A50,50 0 0,1 110,60" fill="none" stroke="#e2e8f0" strokeWidth="12" strokeLinecap="round"/>
          <path
            d="M10,60 A50,50 0 0,1 110,60"
            fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
            strokeDasharray={`${pct * 1.57} 157`}
          />
        </svg>
        <div className="absolute inset-0 flex items-end justify-center pb-0.5">
          <span className="text-2xl font-black" style={{ color }}>{score}</span>
        </div>
      </div>
      <span className="text-xs text-slate-400 font-medium">Lead Score</span>
    </div>
  );
}

const EMPTY: LeadInput = { nome: '', cnpj: '', website: '', setor: '', contato: '', observacoes: '' };
const INPUT = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-400';

// ── Componente principal ──────────────────────────────────────────────────────

const STEPS = [
  { icon: Search,   label: 'Pesquisando na internet...' },
  { icon: Package,  label: 'Carregando portfólio do ERP...' },
  { icon: Sparkles, label: 'IA sintetizando relatório...' },
];

export default function InteligenciaLeads() {
  const tenantIdLeads = localStorage.getItem('zia_active_entity_id_v1') ?? undefined;
  const { salvar: salvarContexto } = useCRMContexto(tenantIdLeads);

  const [form, setForm]         = useState<LeadInput>(EMPTY);
  const [analyzing, setAnalyzing] = useState(false);
  const [step, setStep]         = useState(0);
  const [report, setReport]     = useState<LeadReport | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [history, setHistory]   = useState<LeadReport[]>(loadHistory);
  const [showHistory, setShowHistory] = useState(false);
  const [creatingNeg, setCreatingNeg] = useState(false);

  async function analyze() {
    if (!form.nome.trim()) return;
    setAnalyzing(true); setError(null); setReport(null); setStep(0);
    try {
      // Step 1 — web search
      setStep(0);
      const { text: webInfo, sources } = await webSearchLead(form.nome, form.cnpj, form.website);

      // Step 2 — ERP data
      setStep(1);
      const [produtos, negs] = await Promise.all([getProdutos(), getAllNegociacoes()]);
      const hasNeg = negs.some(n =>
        n.negociacao.clienteNome?.toLowerCase().includes(form.nome.toLowerCase()) ||
        (form.cnpj && n.negociacao.clienteCnpj === form.cnpj)
      );

      // Step 3 — Synthesis
      setStep(2);
      const result = await generateReport(form, webInfo, produtos, hasNeg);

      const newReport: LeadReport = {
        ...result,
        lead: { ...form },
        fontes: sources,
        gerado_em: new Date().toISOString(),
      };
      setReport(newReport);
      const updated = [newReport, ...history.filter(h => h.lead.nome !== form.nome)];
      setHistory(updated);
      saveHistory(updated);

      salvarContexto(
        'leads',
        `Lead: ${newReport.lead.nome} · Score ${newReport.score} · ${newReport.potencial}`,
        newReport.abordagem.slice(0, 500),
        { score: newReport.score, potencial: newReport.potencial },
      );
    } catch (e: any) {
      setError(e.message ?? 'Erro ao analisar lead');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleCreateNegociacao() {
    if (!report) return;
    setCreatingNeg(true);
    try {
      await createNegociacao({
        clienteNome: report.lead.nome,
        clienteCnpj: report.lead.cnpj || undefined,
        descricao: `Lead gerado via Inteligência de Leads. Score: ${report.score}/100. ${report.abordagem.slice(0, 120)}`,
        valor_estimado: 0, status: 'aberta', etapa: 'prospeccao', etapaId: 'prospeccao', funilId: '',
        responsavel: '', notas: report.plano_acao.map(a => `${a.ordem}. ${a.acao}: ${a.descricao}`).join('\n'),
      });
      alert('Negociação criada com sucesso no CRM!');
    } catch (e: any) {
      alert(`Erro: ${e.message}`);
    } finally {
      setCreatingNeg(false);
    }
  }

  const pot = report?.potencial;
  const PotIcon = pot === 'alto' ? Flame : pot === 'medio' ? Thermometer : Snowflake;
  const potColor = pot === 'alto' ? 'text-red-500' : pot === 'medio' ? 'text-amber-500' : 'text-blue-400';

  return (
    <div className="flex h-full overflow-hidden bg-slate-50">

      {/* ── Painel esquerdo — form ──────────────────────────────────────────── */}
      <div className="w-80 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-0.5">
            <Sparkles className="w-5 h-5 text-violet-600" />
            <h1 className="text-base font-bold text-slate-800">Inteligência de Leads</h1>
          </div>
          <p className="text-xs text-slate-400">IA pesquisa o lead online e gera um relatório completo</p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Nome / Empresa *</label>
            <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              placeholder="Ex: Construtora ABC Ltda" className={INPUT} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">CNPJ</label>
            <div className="relative">
              <Hash className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input value={form.cnpj} onChange={e => setForm(f => ({ ...f, cnpj: e.target.value }))}
                placeholder="00.000.000/0001-00" className={`${INPUT} pl-8`} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Website</label>
            <div className="relative">
              <Globe className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                placeholder="www.empresa.com.br" className={`${INPUT} pl-8`} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Setor / Segmento</label>
            <input value={form.setor} onChange={e => setForm(f => ({ ...f, setor: e.target.value }))}
              placeholder="Ex: Construção Civil, Tecnologia..." className={INPUT} />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Contato / Responsável</label>
            <div className="relative">
              <User className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input value={form.contato} onChange={e => setForm(f => ({ ...f, contato: e.target.value }))}
                placeholder="Nome e cargo" className={`${INPUT} pl-8`} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Observações</label>
            <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
              placeholder="Como chegou até nós, contexto da conversa..." rows={3}
              className={`${INPUT} resize-none`} />
          </div>
        </div>

        <div className="p-5 border-t border-slate-100 space-y-2">
          <button
            onClick={analyze}
            disabled={!form.nome.trim() || analyzing}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold text-sm transition-colors"
          >
            {analyzing ? <><RotateCcw className="w-4 h-4 animate-spin" /> Analisando...</>
              : <><Sparkles className="w-4 h-4" /> Analisar Lead</>}
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-slate-500 hover:text-slate-700"
          >
            <History className="w-3.5 h-3.5" />
            {showHistory ? 'Esconder histórico' : `Histórico (${history.length})`}
          </button>
        </div>

        {/* Histórico */}
        {showHistory && history.length > 0 && (
          <div className="border-t border-slate-100 overflow-y-auto max-h-64">
            {history.map((h, i) => (
              <button key={i} onClick={() => { setReport(h); setShowHistory(false); }}
                className="w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b border-slate-50 last:border-0">
                <p className="text-sm font-medium text-slate-700 truncate">{h.lead.nome}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs font-bold ${h.score >= 70 ? 'text-emerald-600' : h.score >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
                    {h.score}/100
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(h.gerado_em).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Painel direito — resultado ──────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* Loading */}
        {analyzing && (
          <div className="flex flex-col items-center justify-center h-full gap-8">
            <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-violet-600 animate-pulse" />
            </div>
            <div className="space-y-3 w-72">
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                const done = i < step;
                const active = i === step;
                return (
                  <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active ? 'bg-violet-50 border border-violet-200' : done ? 'opacity-50' : 'opacity-30'}`}>
                    {done ? <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      : active ? <RotateCcw className="w-5 h-5 text-violet-600 animate-spin flex-shrink-0" />
                        : <Icon className="w-5 h-5 text-slate-400 flex-shrink-0" />}
                    <span className={`text-sm font-medium ${active ? 'text-violet-700' : 'text-slate-500'}`}>{s.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Error */}
        {error && !analyzing && (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <AlertTriangle className="w-10 h-10 text-red-400" />
            <p className="text-slate-600 font-medium">Erro ao analisar lead</p>
            <p className="text-sm text-slate-400 max-w-sm text-center">{error}</p>
            <button onClick={analyze} className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold">
              Tentar novamente
            </button>
          </div>
        )}

        {/* Empty state */}
        {!analyzing && !error && !report && (
          <div className="flex flex-col items-center justify-center h-full gap-4 px-8">
            <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center">
              <Target className="w-8 h-8 text-violet-400" />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-bold text-slate-700">Análise de Lead por IA</h2>
              <p className="text-sm text-slate-400 mt-1 max-w-xs">
                Preencha as informações do lead e clique em "Analisar Lead". A IA irá pesquisar na internet, cruzar com seu portfólio e gerar um relatório completo.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 w-full max-w-md mt-4">
              {[
                { icon: Globe,      label: 'Pesquisa online',      desc: 'Informações públicas do lead' },
                { icon: Package,    label: 'Match de portfólio',   desc: 'Produtos que se encaixam' },
                { icon: ListChecks, label: 'Plano de ação',        desc: 'Próximos passos priorizados' },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="bg-white rounded-xl p-3 border border-slate-200 text-center">
                  <Icon className="w-5 h-5 text-violet-400 mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-slate-700">{label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Report */}
        {!analyzing && report && (
          <div className="p-6 space-y-5 max-w-4xl">

            {/* Header */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-6 h-6 text-violet-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">{report.lead.nome}</h2>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {report.lead.setor && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{report.lead.setor}</span>}
                      {report.lead.cnpj && <span className="text-xs text-slate-400 font-mono">{report.lead.cnpj}</span>}
                      {report.lead.website && (
                        <a href={report.lead.website.startsWith('http') ? report.lead.website : `https://${report.lead.website}`}
                          target="_blank" rel="noopener noreferrer"
                          className="text-xs text-violet-500 flex items-center gap-0.5 hover:underline">
                          <Globe className="w-3 h-3" />{report.lead.website}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <ScoreGauge score={report.score} />
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${
                    pot === 'alto' ? 'bg-red-50 text-red-600' : pot === 'medio' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-500'
                  }`}>
                    <PotIcon className={`w-4 h-4 ${potColor}`} />
                    Potencial {report.potencial}
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-3 italic">{report.score_motivo}</p>
              <div className="flex gap-2 mt-4">
                <button onClick={handleCreateNegociacao} disabled={creatingNeg}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors disabled:opacity-50">
                  <Plus className="w-4 h-4" />{creatingNeg ? 'Criando...' : 'Criar Negociação'}
                </button>
                <button onClick={() => { setForm(report.lead); setReport(null); }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-medium">
                  <RotateCcw className="w-4 h-4" /> Re-analisar
                </button>
              </div>
            </div>

            {/* Grid principal */}
            <div className="grid grid-cols-2 gap-5">

              {/* Perfil */}
              <div className="col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-violet-500" />
                  <h3 className="font-semibold text-slate-800 text-sm">Perfil do Lead</h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{report.perfil}</p>
                {report.fontes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100">
                    <span className="text-xs text-slate-400">Fontes:</span>
                    {report.fontes.slice(0, 5).map((f, i) => (
                      <a key={i} href={f} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-violet-500 hover:underline flex items-center gap-0.5">
                        <ExternalLink className="w-2.5 h-2.5" />{new URL(f).hostname}
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Oportunidades */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-4 h-4 text-emerald-500" />
                  <h3 className="font-semibold text-slate-800 text-sm">Oportunidades</h3>
                </div>
                <ul className="space-y-2">
                  {report.oportunidades.map((o, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />{o}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Desafios */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldAlert className="w-4 h-4 text-amber-500" />
                  <h3 className="font-semibold text-slate-800 text-sm">Desafios / Objeções</h3>
                </div>
                <ul className="space-y-2">
                  {report.desafios.map((d, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />{d}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Produtos recomendados */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-4 h-4 text-blue-500" />
                  <h3 className="font-semibold text-slate-800 text-sm">Produtos Recomendados</h3>
                </div>
                <div className="space-y-2">
                  {report.produtos_recomendados.map((p, i) => (
                    <div key={i} className="flex items-start justify-between gap-2 p-2.5 rounded-lg bg-slate-50">
                      <div>
                        <p className="text-sm font-semibold text-slate-700">{p.nome}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{p.motivo}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${PRIO_CLS[p.prioridade]}`}>{p.prioridade}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Abordagem */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-violet-500" />
                  <h3 className="font-semibold text-slate-800 text-sm">Abordagem Recomendada</h3>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{report.abordagem}</p>
                {report.proximos_passos.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-500 mb-2">Próximos Passos</p>
                    <ul className="space-y-1">
                      {report.proximos_passos.map((p, i) => (
                        <li key={i} className="flex items-center gap-1.5 text-xs text-slate-600">
                          <ChevronRight className="w-3 h-3 text-violet-400 flex-shrink-0" />{p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Plano de ação */}
              <div className="col-span-2 bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <ListChecks className="w-4 h-4 text-violet-500" />
                  <h3 className="font-semibold text-slate-800 text-sm">Plano de Ação</h3>
                </div>
                <div className="space-y-3">
                  {report.plano_acao.map((a) => (
                    <div key={a.ordem} className="flex items-start gap-4 p-3.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                        a.prioridade === 'alta' ? 'bg-red-100 text-red-600' : a.prioridade === 'media' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'
                      }`}>{a.ordem}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-slate-800">{a.acao}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIO_CLS[a.prioridade]}`}>{a.prioridade}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{a.descricao}</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-400 flex-shrink-0">
                        <Clock className="w-3 h-3" />{a.prazo}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400 text-right pb-4">
              Relatório gerado em {new Date(report.gerado_em).toLocaleString('pt-BR')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
