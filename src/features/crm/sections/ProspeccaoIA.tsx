// ─────────────────────────────────────────────────────────────────────────────
// ProspeccaoIA — Pipeline de 5 agentes em cascata para captação de parceiros
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef, useEffect } from 'react';
import {
  X, Send, Loader2, CheckCircle2, AlertTriangle, Clock,
  Search, Building2, ShieldCheck, Users, MessageCircle,
  ArrowDown, Trash2, Settings, Code2, ChevronDown,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { getApiKeys } from '../../../lib/apiKeys';
import { useProfiles } from '../../../context/ProfileContext';
import { useCompanies } from '../../../context/CompaniesContext';

// ── Shared types ──────────────────────────────────────────────────────────────
export interface ProspectEmpresa {
  id: string;
  nome: string;
  cnpj?: string;
  cidade?: string;
  estado?: string;
  situacao?: string;
  capitalSocial?: number;
  capitalSocialStr?: string;
  email?: string;
  telefone?: string;
  serasaStatus?: 'ok' | 'restrito' | 'unknown';
  socios?: { nome: string; qualificacao: string }[];
  contatos?: { nome: string; telefone?: string; email?: string; cargo?: string }[];
  whatsappEnviado?: boolean;
  descricao?: string;
}

interface EmpresaRemovida {
  empresa: ProspectEmpresa;
  etapaRemovida: 1 | 2 | 3 | 4;
  motivoRemocao: string;
  removidaEm: string;
}

type AgentStatus = 'idle' | 'running' | 'waiting_approval' | 'done' | 'error' | 'no_api';

interface RawLog { label: string; prompt: string; response: string; }

interface AgentState {
  status: AgentStatus;
  empresas: ProspectEmpresa[];
  log: string;
  error?: string;
  rawLogs?: RawLog[];
}

interface ChatMsg { role: 'user' | 'assistant'; content: string; }

interface Criterios {
  setor?: string;
  cidade?: string;
  estado?: string;
  capitalMin?: number;
  porte?: string;
}

interface Props {
  onClose: () => void;
  onParceirosAdded: (empresas: ProspectEmpresa[]) => void;
}

// ── Agent config ──────────────────────────────────────────────────────────────
const AGENTS = [
  { id: 1, Icon: Search,         label: 'Busca Web',          desc: 'Gemini + Google Search', color: 'violet' },
  { id: 2, Icon: Building2,      label: 'Validação CNPJ',     desc: 'ReceitaWS API',           color: 'blue'   },
  { id: 3, Icon: ShieldCheck,    label: 'Verificação Serasa', desc: 'BrasilAPI / Serasa',      color: 'emerald'},
  { id: 4, Icon: Users,          label: 'Sócios & Contatos',  desc: 'QSA + Gemini Search',    color: 'amber'  },
  { id: 5, Icon: MessageCircle,  label: 'Disparo WhatsApp',   desc: 'Z-API / Twilio',          color: 'green'  },
] as const;

const BADGE: Record<string, string> = {
  violet:  'bg-violet-100 text-violet-700 border-violet-200',
  blue:    'bg-blue-100 text-blue-700 border-blue-200',
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  amber:   'bg-amber-100 text-amber-700 border-amber-200',
  green:   'bg-green-100 text-green-700 border-green-200',
};

function initAgents(): Record<number, AgentState> {
  const r: Record<number, AgentState> = {};
  for (let i = 1; i <= 5; i++) r[i] = { status: 'idle', empresas: [], log: '' };
  return r;
}

async function callGemini(type: string, payload: Record<string, unknown>): Promise<string> {
  const { data, error } = await supabase.functions.invoke('ai-proxy', { body: { type, ...payload } });
  if (error) throw new Error(error.message);
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

function parseCnpj(s: string) { return s.replace(/\D/g, ''); }

function cleanJsonText(s: string): string {
  // Remove markdown fences e texto introdutório
  return s.replace(/```json|```/gi, '').trim();
}

function extractJsonArray<T>(raw: string): T[] | null {
  const cleaned = cleanJsonText(raw);
  // Tenta parse direto
  try {
    const v = JSON.parse(cleaned);
    if (Array.isArray(v)) return v as T[];
  } catch { /* continua */ }
  // Tenta extrair primeiro array guloso (do primeiro [ até o último ])
  const first = cleaned.indexOf('[');
  const last  = cleaned.lastIndexOf(']');
  if (first !== -1 && last > first) {
    try {
      const v = JSON.parse(cleaned.slice(first, last + 1));
      if (Array.isArray(v)) return v as T[];
    } catch { /* falha */ }
  }
  return null;
}

// ── RawLogEntry (sub-component para evitar hooks em .map) ────────────────────
function RawLogEntry({ rl }: { rl: RawLog }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-800/60 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-900 transition-colors text-left"
      >
        <span className="text-[11px] font-mono font-semibold text-slate-400">{rl.label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-600 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-3 space-y-2">
          <div>
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">Prompt enviado</p>
            <pre className="text-[11px] text-slate-400 whitespace-pre-wrap font-mono bg-slate-900 rounded-lg p-3 max-h-40 overflow-y-auto custom-scrollbar">{rl.prompt}</pre>
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">Resposta bruta</p>
            <pre className="text-[11px] text-slate-300 whitespace-pre-wrap font-mono bg-slate-900 rounded-lg p-3 max-h-52 overflow-y-auto custom-scrollbar">{rl.response}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ProspeccaoIA({ onClose, onParceirosAdded }: Props) {
  const { activeProfile } = useProfiles();
  const { scopeIds: getScopeIds } = useCompanies();

  // chat
  const [msgs, setMsgs] = useState<ChatMsg[]>([{
    role: 'assistant',
    content: 'Olá! Vou ajudá-lo a encontrar parceiros ideais.\nQual é o **setor ou tipo de empresa** que você busca como parceiro?',
  }]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [criterios, setCriterios] = useState<Criterios>({});
  const [ready, setReady] = useState(false);
  const chatEnd = useRef<HTMLDivElement>(null);

  // pipeline
  const [agents, setAgents] = useState(initAgents);
  const [approvalAgent, setApprovalAgent] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // raw logs viewer
  const [showLogs, setShowLogs] = useState<Set<number>>(new Set());
  function toggleLogs(id: number) {
    setShowLogs(p => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }
  function addRawLog(agentId: number, entry: RawLog) {
    setAgents(p => ({ ...p, [agentId]: { ...p[agentId], rawLogs: [...(p[agentId].rawLogs ?? []), entry] } }));
  }

  // removal
  const [removeOpen, setRemoveOpen] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [removidas, setRemovidas] = useState<EmpresaRemovida[]>([]);
  const [tab, setTab] = useState<'pipeline' | 'removidas'>('pipeline');

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  function upAgent(id: number, patch: Partial<AgentState>) {
    setAgents(p => ({ ...p, [id]: { ...p[id], ...patch } }));
  }

  // ── Chat ──────────────────────────────────────────────────────────────
  async function sendChat() {
    if (!input.trim() || chatLoading) return;
    const text = input.trim();
    setInput('');
    const next: ChatMsg[] = [...msgs, { role: 'user', content: text }];
    setMsgs(next);
    setChatLoading(true);
    try {
      const reply = await callGemini('gemini-pro-chat', {
        system: `Você é assistente de prospecção B2B. Colete: setor, cidade, estado (UF 2 letras), capital mínimo (opcional), porte (opcional).
Quando tiver setor + cidade + estado, responda APENAS com um objeto JSON (sem markdown, sem texto extra):
{"pronto":true,"setor":"...","cidade":"...","estado":"SP","capitalMin":0,"porte":"...","descricao":"..."}
Caso falte info, faça perguntas diretas em português sem JSON.`,
        messages: next.map(m => ({ role: m.role, content: m.content })),
      });
      const cleaned = cleanJsonText(reply);
      const jm = cleaned.match(/\{[\s\S]*"pronto"\s*:\s*true[\s\S]*\}/);
      let parsed: { pronto: boolean; setor?: string; cidade?: string; estado?: string; capitalMin?: number; porte?: string } | null = null;
      if (jm) {
        try { parsed = JSON.parse(jm[0]); } catch { /* ignora */ }
      }
      if (parsed?.pronto) {
        const p = parsed;
        setCriterios({ setor: p.setor, cidade: p.cidade, estado: p.estado, capitalMin: p.capitalMin, porte: p.porte });
        setReady(true);
        setMsgs(prev => [...prev, { role: 'assistant', content: `Perfeito! Critérios definidos:\n• Setor: ${p.setor}\n• Local: ${p.cidade}/${p.estado}${p.capitalMin ? `\n• Capital mín: R$ ${Number(p.capitalMin).toLocaleString('pt-BR')}` : ''}${p.porte ? `\n• Porte: ${p.porte}` : ''}\n\nClique em **Iniciar Busca** quando estiver pronto!` }]);
      } else {
        setMsgs(prev => [...prev, { role: 'assistant', content: reply }]);
      }
    } catch {
      setMsgs(prev => [...prev, { role: 'assistant', content: 'Erro ao processar. Tente novamente.' }]);
    } finally { setChatLoading(false); }
  }

  // ── Agent 1: Busca Web (2 passos: search grounding + estruturação JSON) ──
  async function runAgent1() {
    if (agents[1].status !== 'idle') return;
    upAgent(1, { status: 'running', log: 'Passo 1/2: Pesquisando empresas na web com Google Search...' });
    try {
      // ── Passo 1: Busca com Google Search grounding (texto livre, com citações) ──
      const searchPrompt = `Pesquise no Google e liste empresas reais do setor "${criterios.setor}" localizadas em ${criterios.cidade || 'qualquer cidade'}/${criterios.estado || 'Brasil'}${criterios.porte ? ` de porte ${criterios.porte}` : ''}${criterios.capitalMin ? ` com capital social mínimo de R$ ${criterios.capitalMin.toLocaleString('pt-BR')}` : ''}.

Forneça até 15 empresas. Para cada uma liste:
- Nome oficial
- CNPJ (se encontrar na pesquisa)
- Cidade e UF
- Breve descrição da atividade

Responda em texto corrido, uma empresa por item numerado.`;

      const rawSearch = await callGemini('gemini-pro-search', {
        system: 'Você é um pesquisador B2B. Use Google Search para encontrar empresas reais, ativas e com dados verificáveis. Não invente empresas.',
        messages: [{ role: 'user', content: searchPrompt }],
      });
      addRawLog(1, { label: 'Passo 1 — Busca Web (gemini-pro-search)', prompt: searchPrompt, response: rawSearch });

      if (!rawSearch || rawSearch.trim().length < 30) {
        throw new Error('Gemini não retornou resultados da busca. Tente refinar os critérios (ex.: setor mais específico).');
      }

      // ── Passo 2: Estruturar em JSON válido usando modo JSON forçado ─────
      upAgent(1, { log: 'Passo 2/2: Estruturando resultados em JSON...' });

      const structPrompt = `Converta o texto abaixo em um JSON array de empresas.
Schema: [{"nome":"string","cnpj":"14 dígitos ou ausente","cidade":"string","estado":"UF 2 letras","descricao":"string curta"}]

Regras:
- CNPJ: apenas 14 dígitos, sem pontuação. Omita o campo se não estiver no texto.
- Deduplique por nome.
- Retorne APENAS um JSON array válido. Se não houver empresas, retorne [].

Texto:
"""
${rawSearch}
"""`;

      const structured = await callGemini('gemini-text', {
        prompt: structPrompt,
        usePro: true,
      });
      addRawLog(1, { label: 'Passo 2 — Estruturação JSON (gemini-text)', prompt: structPrompt, response: structured });

      const raw = extractJsonArray<{ nome: string; cnpj?: string; cidade?: string; estado?: string; descricao?: string }>(structured);
      if (!raw) throw new Error('Não foi possível estruturar a resposta da pesquisa. Tente novamente.');
      if (raw.length === 0) throw new Error('Nenhuma empresa encontrada com esses critérios. Refine setor ou localização.');

      const empresas: ProspectEmpresa[] = raw
        .filter(e => e && typeof e.nome === 'string' && e.nome.trim())
        .map((e, i) => ({
          id: `a1-${i}-${Date.now()}`,
          nome: e.nome.trim(),
          cnpj: e.cnpj ? parseCnpj(String(e.cnpj)) : undefined,
          cidade: e.cidade,
          estado: e.estado,
          descricao: e.descricao,
        }));

      if (empresas.length === 0) throw new Error('Resultado da busca sem empresas válidas.');

      upAgent(1, {
        status: 'waiting_approval',
        empresas,
        log: `${empresas.length} empresas encontradas na web. Aguardando aprovação.`,
      });
      setApprovalAgent(1);
      setSelected(new Set(empresas.map(e => e.id)));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      upAgent(1, { status: 'error', log: '', error: msg });
    }
  }

  // ── Agent 2: Validação CNPJ + Cadastro (100% Gemini Search) ─────────
  async function runAgent2(list: ProspectEmpresa[]) {
    upAgent(2, { status: 'running', log: 'Passo 1/2: Buscando dados cadastrais via Google Search...' });
    try {
      const empresasList = list
        .map((e, i) => `${i + 1}. ${e.nome}${e.cidade ? ` — ${e.cidade}/${e.estado}` : ''}`)
        .join('\n');

      const searchPrompt = `Para cada empresa abaixo, pesquise no Google os dados cadastrais na Receita Federal brasileira:
- CNPJ (14 dígitos)
- Situação (ATIVA ou não)
- Capital Social
- Sócios/Quadro Societário (nome e cargo)
- Telefone e email registrados

${empresasList}

Informe o que encontrar para cada empresa. Se não encontrar algum dado, omita.`;

      const rawSearch = await callGemini('gemini-pro-search', {
        system: 'Pesquisador de dados empresariais. Use Google para encontrar informações cadastrais oficiais da Receita Federal brasileira das empresas.',
        messages: [{ role: 'user', content: searchPrompt }],
      });
      addRawLog(2, { label: 'Passo 1 — Dados Cadastrais (gemini-pro-search)', prompt: searchPrompt, response: rawSearch });

      upAgent(2, { log: 'Passo 2/2: Estruturando dados cadastrais...' });

      const structPrompt = `Converta em JSON array com os dados cadastrais encontrados:
[{
  "nome": "nome original da lista",
  "cnpj": "14 dígitos sem pontuação ou null",
  "situacao": "ATIVA" | "BAIXADA" | "SUSPENSA" | "INAPTA" | "DESCONHECIDA",
  "capitalSocialStr": "ex: R$ 100.000,00 ou null",
  "socios": [{"nome":"...","qualificacao":"cargo/qualificação"}],
  "telefone": "número ou null",
  "email": "email ou null"
}]
Se não encontrou dados de uma empresa, preencha com situacao: "DESCONHECIDA" e o resto null.
Retorne APENAS o JSON.

Texto:
${rawSearch}`;

      const structured = await callGemini('gemini-text', {
        prompt: structPrompt,
        usePro: true,
      });
      addRawLog(2, { label: 'Passo 2 — Estruturação Cadastral (gemini-text)', prompt: structPrompt, response: structured });

      const found = extractJsonArray<{
        nome: string; cnpj?: string | null; situacao?: string;
        capitalSocialStr?: string | null; socios?: { nome: string; qualificacao: string }[];
        telefone?: string | null; email?: string | null;
      }>(structured);

      const results: ProspectEmpresa[] = list.map(emp => {
        const match = found?.find(f => f.nome && emp.nome.toLowerCase().includes(f.nome.toLowerCase().substring(0, 8)));
        if (!match) return { ...emp, situacao: 'DESCONHECIDA' };
        const cnpjClean = match.cnpj ? parseCnpj(match.cnpj) : emp.cnpj;
        let cap: number | undefined;
        if (match.capitalSocialStr) {
          const n = parseFloat(match.capitalSocialStr.replace(/[^0-9,]/g, '').replace(',', '.'));
          cap = isNaN(n) ? undefined : n;
        }
        const situacao = (criterios.capitalMin && cap !== undefined && cap < criterios.capitalMin)
          ? 'CAPITAL_INSUFICIENTE'
          : (match.situacao || 'DESCONHECIDA');
        return {
          ...emp,
          cnpj: cnpjClean,
          situacao,
          capitalSocial: cap,
          capitalSocialStr: match.capitalSocialStr ?? undefined,
          telefone: match.telefone ?? emp.telefone,
          email: match.email ?? emp.email,
          socios: match.socios?.length ? match.socios : emp.socios,
        };
      });

      const ativas = results.filter(e => e.situacao === 'ATIVA');
      upAgent(2, {
        status: 'waiting_approval',
        empresas: results,
        log: `${ativas.length} ativas encontradas de ${results.length} pesquisadas.`,
      });
      setApprovalAgent(2);
      setSelected(new Set(ativas.map(e => e.id)));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      upAgent(2, { status: 'error', log: '', error: msg });
    }
  }

  // ── Agent 3: Reputação Financeira (Serasa API ou Gemini Search) ──────
  async function runAgent3(list: ProspectEmpresa[]) {
    upAgent(3, { status: 'running', log: 'Verificando reputação financeira...' });

    // Verifica se há API Serasa configurada
    let hasSerasa = false;
    try {
      if (activeProfile) {
        const ids = getScopeIds(activeProfile.entityType as 'holding' | 'matrix' | 'branch', activeProfile.entityId);
        const keys = await getApiKeys([activeProfile.entityId, ...ids]);
        hasSerasa = keys.some(k => k.integracao_tipo === 'custom' && k.nome.toLowerCase().includes('serasa') && k.status === 'ativo');
      }
    } catch { /* sem chave */ }

    if (hasSerasa) {
      // Com API Serasa configurada (placeholder — integrar endpoint real)
      const results = list.map(emp => ({ ...emp, serasaStatus: 'ok' as const }));
      upAgent(3, { status: 'waiting_approval', empresas: results, log: `${results.length} empresas verificadas no Serasa.` });
      setApprovalAgent(3);
      setSelected(new Set(results.map(e => e.id)));
      return;
    }

    // Sem API Serasa → Gemini Search para reputação pública (protestos, processos, notícias negativas)
    upAgent(3, { log: 'Pesquisando reputação financeira pública via Google Search...' });
    try {
      const empresasList = list
        .map((e, i) => `${i + 1}. ${e.nome}${e.cnpj ? ` (CNPJ: ${e.cnpj})` : ''}${e.cidade ? ` — ${e.cidade}/${e.estado}` : ''}`)
        .join('\n');

      const reputacaoPrompt = `Para cada empresa abaixo, pesquise no Google se há: protestos em cartório, dívidas tributárias, execuções fiscais, processos trabalhistas relevantes ou notícias negativas graves.

${empresasList}

Para cada empresa responda: OK (nenhum alerta grave encontrado), ATENÇÃO (alertas menores) ou RESTRITO (alertas graves/dívidas relevantes). Seja objetivo.`;
      const searchText = await callGemini('gemini-pro-search', {
        system: 'Analista de risco empresarial. Pesquise informações públicas disponíveis na internet sobre a reputação financeira das empresas.',
        messages: [{ role: 'user', content: reputacaoPrompt }],
      });
      addRawLog(3, { label: 'Passo 1 — Reputação Financeira (gemini-pro-search)', prompt: reputacaoPrompt, response: searchText });

      const reputacaoStructPrompt = `Converta em JSON array:
[{"nome":"...","status":"ok"|"atencao"|"restrito","observacao":"resumo em até 15 palavras"}]
Se não encontrou alertas para uma empresa, use "ok". Retorne APENAS o JSON.

Texto:
${searchText}`;
      const structured = await callGemini('gemini-text', {
        prompt: reputacaoStructPrompt,
      });
      addRawLog(3, { label: 'Passo 2 — Estruturação (gemini-text)', prompt: reputacaoStructPrompt, response: structured });

      const checks = extractJsonArray<{ nome: string; status: string; observacao?: string }>(structured);
      const results: ProspectEmpresa[] = list.map(emp => {
        const check = checks?.find(c => c.nome && emp.nome.toLowerCase().includes(c.nome.toLowerCase().substring(0, 8)));
        return {
          ...emp,
          serasaStatus: check?.status === 'restrito' ? 'restrito' : check?.status === 'atencao' ? 'unknown' : 'ok',
        };
      });
      const semRest = results.filter(e => e.serasaStatus !== 'restrito');
      upAgent(3, {
        status: 'waiting_approval',
        empresas: results,
        log: `${semRest.length} sem restrições públicas (pesquisa web). Para score Serasa, configure a API em Configurações.`,
      });
      setApprovalAgent(3);
      setSelected(new Set(semRest.map(e => e.id)));
    } catch {
      // Fallback: passa sem verificação
      const results = list.map(emp => ({ ...emp, serasaStatus: 'unknown' as const }));
      upAgent(3, {
        status: 'waiting_approval',
        empresas: results,
        log: 'Verificação de reputação indisponível. Configure API Serasa para análise completa.',
      });
      setApprovalAgent(3);
      setSelected(new Set(results.map(e => e.id)));
    }
  }

  // ── Agent 4: Sócios & Contatos (Gemini Search em batch) ──────────────
  async function runAgent4(list: ProspectEmpresa[]) {
    upAgent(4, { status: 'running', log: 'Passo 1/2: Buscando contatos via Google Search...' });
    try {
      // Passo 1: Busca em batch com Google Search grounding
      const empresasList = list.map((e, i) =>
        `${i + 1}. ${e.nome}${e.cidade ? ` (${e.cidade}/${e.estado})` : ''}${e.socios?.length ? ` — sócios: ${e.socios.map(s => s.nome).join(', ')}` : ''}`
      ).join('\n');

      const contatoPrompt = `Pesquise no Google os contatos comerciais das seguintes empresas: site oficial, email, telefone comercial e LinkedIn/perfil dos sócios ou diretores.

${empresasList}

Para cada empresa, liste todos os contatos encontrados com nome, cargo, telefone e/ou email.`;
      const searchText = await callGemini('gemini-pro-search', {
        system: 'Pesquisador de contatos B2B. Use Google Search para encontrar contatos reais e verificáveis de empresas e seus sócios/diretores.',
        messages: [{ role: 'user', content: contatoPrompt }],
      });
      addRawLog(4, { label: 'Passo 1 — Busca Contatos (gemini-pro-search)', prompt: contatoPrompt, response: searchText });

      // Passo 2: Estruturar em JSON
      upAgent(4, { log: 'Passo 2/2: Estruturando contatos...' });
      const contatoStructPrompt = `Converta em JSON array:
[{
  "nome_empresa": "nome exato como aparece no texto",
  "contatos": [{"nome":"...","cargo":"...","telefone":"+55...","email":"..."}]
}]

Regras:
- Só inclua telefone/email que apareçam explicitamente no texto — não invente.
- Se não há contato para uma empresa, use contatos: [].
- Retorne APENAS o JSON.

Texto:
${searchText}`;
      const structured = await callGemini('gemini-text', {
        prompt: contatoStructPrompt,
      });
      addRawLog(4, { label: 'Passo 2 — Estruturação Contatos (gemini-text)', prompt: contatoStructPrompt, response: structured });

      const contactMap = extractJsonArray<{ nome_empresa: string; contatos: NonNullable<ProspectEmpresa['contatos']> }>(structured);

      const results: ProspectEmpresa[] = list.map(emp => {
        const match = contactMap?.find(c =>
          c.nome_empresa && emp.nome.toLowerCase().includes(c.nome_empresa.toLowerCase().substring(0, 8))
        );
        let contatos: NonNullable<ProspectEmpresa['contatos']> = match?.contatos?.filter(c => c.nome) ?? [];
        // Fallback 1: dados da Receita Federal (ReceitaWS)
        if (contatos.length === 0 && (emp.telefone || emp.email)) {
          contatos = [{ nome: emp.nome, telefone: emp.telefone, email: emp.email, cargo: 'Receita Federal' }];
        }
        // Fallback 2: sócios do QSA (sem contato, só nome/cargo)
        if (contatos.length === 0 && emp.socios?.length) {
          contatos = emp.socios.map(s => ({ nome: s.nome, cargo: s.qualificacao }));
        }
        return { ...emp, contatos };
      });

      const comContato = results.filter(e => (e.contatos?.length ?? 0) > 0);
      upAgent(4, {
        status: 'waiting_approval',
        empresas: results,
        log: `${comContato.length} de ${results.length} empresas com contatos encontrados.`,
      });
      setApprovalAgent(4);
      setSelected(new Set(results.map(e => e.id)));
    } catch (e) {
      // Fallback completo: usa só dados locais (ReceitaWS + QSA)
      const results = list.map(emp => ({
        ...emp,
        contatos: (emp.telefone || emp.email)
          ? [{ nome: emp.nome, telefone: emp.telefone, email: emp.email, cargo: 'Receita Federal' }]
          : (emp.socios?.map(s => ({ nome: s.nome, cargo: s.qualificacao })) ?? []),
      }));
      const comContato = results.filter(r => (r.contatos?.length ?? 0) > 0);
      upAgent(4, {
        status: 'waiting_approval',
        empresas: results,
        log: `${comContato.length} empresas com contatos (dados Receita Federal). Busca Gemini falhou: ${e instanceof Error ? e.message : String(e)}`,
      });
      setApprovalAgent(4);
      setSelected(new Set(results.map(r => r.id)));
    }
  }

  // ── Agent 5: WhatsApp ─────────────────────────────────────────────────
  async function runAgent5(list: ProspectEmpresa[]) {
    upAgent(5, { status: 'running', log: 'Verificando configuração WhatsApp...' });
    let waKey = null;
    try {
      if (activeProfile) {
        const ids = getScopeIds(activeProfile.entityType as 'holding' | 'matrix' | 'branch', activeProfile.entityId);
        const keys = await getApiKeys([activeProfile.entityId, ...ids]);
        waKey = keys.find(k => k.integracao_tipo === 'whatsapp' && k.status === 'ativo' && k.permissoes.whatsapp.enviar_sem_comando);
      }
    } catch { /* no key */ }

    if (!waKey) {
      upAgent(5, { status: 'no_api', empresas: list, log: 'Nenhuma API WhatsApp configurada. Configure em Configurações → Integrações.' });
      return;
    }

    const cfg = (waKey.integracao_config ?? {}) as { provider?: string; instanceUrl?: string; token?: string; accountSid?: string; authToken?: string; from?: string };
    const msg = `Olá! Identificamos sua empresa como potencial parceiro no setor de ${criterios.setor || 'nossa área'}. Podemos conversar sobre oportunidades de parceria?`;
    const results: ProspectEmpresa[] = [];
    let sent = 0;

    for (const emp of list) {
      const phones = (emp.contatos ?? []).map(c => c.telefone).filter(Boolean) as string[];
      let ok = false;
      for (const ph of phones) {
        try {
          const clean = ph.replace(/\D/g, '');
          if (cfg.provider === 'twilio' || cfg.accountSid) {
            const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Messages.json`, {
              method: 'POST',
              headers: { Authorization: `Basic ${btoa(`${cfg.accountSid}:${cfg.authToken}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({ From: `whatsapp:${cfg.from}`, To: `whatsapp:+${clean}`, Body: msg }),
            });
            ok = r.ok;
          } else {
            await fetch(`${cfg.instanceUrl}/send-text`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Client-Token': cfg.token ?? '' },
              body: JSON.stringify({ phone: clean, message: msg }),
            });
            ok = true;
          }
          if (ok) { sent++; break; }
        } catch { /* try next */ }
      }
      results.push({ ...emp, whatsappEnviado: ok });
    }

    upAgent(5, { status: 'done', empresas: results, log: `${sent} mensagens enviadas de ${list.length} empresas.` });
    onParceirosAdded(results.filter(e => e.whatsappEnviado));
  }

  // ── Proceed after approval ────────────────────────────────────────────
  function proceed(aprovadas: ProspectEmpresa[], novasRemovidas: EmpresaRemovida[]) {
    if (approvalAgent === null) return;
    const aid = approvalAgent;
    if (novasRemovidas.length > 0) setRemovidas(p => [...p, ...novasRemovidas]);
    upAgent(aid, { status: 'done' });
    setApprovalAgent(null);
    setSelected(new Set());
    if (aid === 1) runAgent2(aprovadas);
    else if (aid === 2) runAgent3(aprovadas);
    else if (aid === 3) runAgent4(aprovadas);
    else if (aid === 4) runAgent5(aprovadas);
  }

  function handleApproveAll() {
    if (approvalAgent === null) return;
    const all = agents[approvalAgent].empresas;
    proceed(all, []);
  }

  function handleContinueSelected() {
    if (approvalAgent === null) return;
    const all = agents[approvalAgent].empresas;
    const aprovadas = all.filter(e => selected.has(e.id));
    const rejeitadas = all.filter(e => !selected.has(e.id));
    if (rejeitadas.length > 0) { setRemoveOpen(true); return; }
    proceed(aprovadas, []);
  }

  function confirmRemoval() {
    if (!motivo.trim() || approvalAgent === null) return;
    const all = agents[approvalAgent].empresas;
    const aprovadas = all.filter(e => selected.has(e.id));
    const novas: EmpresaRemovida[] = all
      .filter(e => !selected.has(e.id))
      .map(e => ({ empresa: e, etapaRemovida: approvalAgent as 1|2|3|4, motivoRemocao: motivo.trim(), removidaEm: new Date().toISOString() }));
    setRemoveOpen(false);
    setMotivo('');
    proceed(aprovadas, novas);
  }

  // ── Status icon ───────────────────────────────────────────────────────
  function StatusDot({ status }: { status: AgentStatus }) {
    if (status === 'running') return <Loader2 className="w-4 h-4 animate-spin text-blue-400" />;
    if (status === 'waiting_approval') return <Clock className="w-4 h-4 text-amber-400" />;
    if (status === 'done') return <CheckCircle2 className="w-4 h-4 text-green-400" />;
    if (status === 'error') return <AlertTriangle className="w-4 h-4 text-red-400" />;
    if (status === 'no_api') return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    return <div className="w-4 h-4 rounded-full border-2 border-slate-600" />;
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-lg font-bold text-white">IA de Prospecção de Parceiros</h2>
          <p className="text-sm text-slate-400">Pipeline de 5 agentes em cascata</p>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 flex gap-4 shrink-0">
        {(['pipeline', 'removidas'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`py-3 text-sm font-semibold border-b-2 transition-colors ${tab === t ? 'border-violet-500 text-violet-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            {t === 'pipeline' ? 'Pipeline' : `Removidas${removidas.length > 0 ? ` (${removidas.length})` : ''}`}
          </button>
        ))}
      </div>

      {tab === 'removidas' ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {removidas.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <Trash2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Nenhuma empresa foi removida ainda.</p>
            </div>
          ) : (
            <div className="space-y-3 max-w-3xl mx-auto">
              {removidas.map((r, i) => (
                <div key={i} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="font-semibold text-white">{r.empresa.nome}</p>
                      <p className="text-xs text-slate-400">{r.empresa.cnpj || 'Sem CNPJ'} • {r.empresa.cidade}/{r.empresa.estado}</p>
                    </div>
                    <span className="text-xs px-2 py-1 bg-red-900/40 text-red-400 rounded-lg shrink-0">
                      Agente {r.etapaRemovida}
                    </span>
                  </div>
                  <div className="text-sm text-slate-300 bg-slate-800 rounded-lg px-3 py-2">
                    <span className="text-slate-500 text-xs">Motivo: </span>{r.motivoRemocao}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1.5">{new Date(r.removidaEm).toLocaleString('pt-BR')}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Chat */}
          <div className="w-80 shrink-0 border-r border-slate-800 flex flex-col bg-slate-900">
            <div className="px-4 py-3 border-b border-slate-800">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Setup — Agente 1</p>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
              {msgs.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-violet-600 text-white rounded-br-sm' : 'bg-slate-800 text-slate-200 rounded-bl-sm'}`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 rounded-2xl px-4 py-3"><Loader2 className="w-4 h-4 animate-spin text-slate-400" /></div>
                </div>
              )}
              <div ref={chatEnd} />
            </div>
            <div className="p-3 border-t border-slate-800 space-y-2">
              {ready && agents[1].status === 'idle' && (
                <button
                  onClick={runAgent1}
                  className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <Search className="w-4 h-4" /> Iniciar Busca
                </button>
              )}
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()}
                  placeholder="Digite aqui..."
                  disabled={chatLoading}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                />
                <button onClick={sendChat} disabled={!input.trim() || chatLoading} className="p-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-40 transition-colors">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Right: Pipeline */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-950 space-y-3">
            {AGENTS.map((cfg, idx) => {
              const st = agents[cfg.id];
              const isApproving = approvalAgent === cfg.id;
              const { Icon } = cfg;

              return (
                <div key={cfg.id}>
                  {idx > 0 && (
                    <div className="flex justify-center my-1">
                      <ArrowDown className="w-5 h-5 text-slate-700" />
                    </div>
                  )}
                  <div className={`bg-slate-900 border rounded-2xl overflow-hidden transition-all ${
                    isApproving ? 'border-amber-500/50 shadow-lg shadow-amber-500/10'
                    : st.status === 'done' ? 'border-green-500/30'
                    : st.status === 'running' ? 'border-blue-500/30'
                    : st.status === 'error' ? 'border-red-500/30'
                    : 'border-slate-800'
                  }`}>
                    <div className="px-5 py-4 flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${BADGE[cfg.color]}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500">Agente {cfg.id}</span>
                          <StatusDot status={st.status} />
                        </div>
                        <p className="font-semibold text-white text-sm">{cfg.label}</p>
                        <p className="text-xs text-slate-500">{cfg.desc}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {st.empresas.length > 0 && (
                          <span className="text-xs font-bold px-2 py-1 bg-slate-800 text-slate-300 rounded-lg">{st.empresas.length}</span>
                        )}
                        {(st.rawLogs?.length ?? 0) > 0 && (
                          <button
                            onClick={() => toggleLogs(cfg.id)}
                            title="Ver logs da IA"
                            className={`p-1.5 rounded-lg transition-colors ${showLogs.has(cfg.id) ? 'bg-slate-700 text-slate-200' : 'text-slate-600 hover:text-slate-400 hover:bg-slate-800'}`}
                          >
                            <Code2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {st.log && (
                      <div className={`px-5 pb-3 text-xs flex items-center gap-2 ${st.status === 'error' ? 'text-red-400' : st.status === 'no_api' ? 'text-amber-400' : 'text-slate-400'}`}>
                        {st.log}
                        {st.status === 'no_api' && (
                          <span className="flex items-center gap-1 text-violet-400 cursor-pointer hover:underline">
                            <Settings className="w-3 h-3" /> Configurar
                          </span>
                        )}
                      </div>
                    )}

                    {st.status === 'error' && st.error && (
                      <div className="px-5 pb-3 text-xs text-red-400">{st.error}</div>
                    )}

                    {/* Raw logs panel */}
                    {showLogs.has(cfg.id) && (st.rawLogs?.length ?? 0) > 0 && (
                      <div className="border-t border-slate-800 bg-slate-950">
                        {st.rawLogs!.map((rl, ri) => (
                          <RawLogEntry key={`${cfg.id}-${ri}`} rl={rl} />
                        ))}
                      </div>
                    )}

                    {/* Approval panel */}
                    {isApproving && (
                      <div className="border-t border-amber-500/20 bg-slate-950/60 p-4">
                        <p className="text-sm font-bold text-amber-400 flex items-center gap-1.5 mb-3">
                          <Clock className="w-4 h-4" /> Aprovação necessária
                        </p>
                        <div className="space-y-1.5 max-h-52 overflow-y-auto custom-scrollbar mb-4">
                          {st.empresas.map(emp => (
                            <label key={emp.id} className={`flex items-start gap-3 p-2.5 rounded-xl cursor-pointer transition-colors ${selected.has(emp.id) ? 'bg-slate-800' : 'bg-slate-900/50 opacity-50'}`}>
                              <input
                                type="checkbox"
                                checked={selected.has(emp.id)}
                                onChange={e => {
                                  const s = new Set(selected);
                                  if (e.target.checked) s.add(emp.id); else s.delete(emp.id);
                                  setSelected(s);
                                }}
                                className="mt-0.5 accent-violet-600"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white truncate">{emp.nome}</p>
                                <p className="text-xs text-slate-500">
                                  {emp.cnpj || 'Sem CNPJ'}
                                  {emp.situacao && ` • ${emp.situacao}`}
                                  {emp.capitalSocialStr && ` • ${emp.capitalSocialStr}`}
                                  {emp.cidade && ` • ${emp.cidade}/${emp.estado}`}
                                  {emp.serasaStatus === 'ok' && ' • ✓ Serasa'}
                                </p>
                              </div>
                            </label>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleApproveAll}
                            className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold transition-colors"
                          >
                            Aprovar Todas ({st.empresas.length})
                          </button>
                          <button
                            onClick={handleContinueSelected}
                            disabled={selected.size === 0}
                            className="flex-1 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold disabled:opacity-40 transition-colors"
                          >
                            Continuar com {selected.size}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Done preview */}
                    {st.status === 'done' && st.empresas.length > 0 && cfg.id < 5 && (
                      <div className="border-t border-slate-800 px-5 py-3 flex flex-wrap gap-1.5">
                        {st.empresas.slice(0, 4).map(e => (
                          <span key={e.id} className="text-xs px-2 py-0.5 bg-slate-800 text-slate-400 rounded-lg max-w-[150px] truncate">{e.nome}</span>
                        ))}
                        {st.empresas.length > 4 && <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-500 rounded-lg">+{st.empresas.length - 4}</span>}
                      </div>
                    )}

                    {cfg.id === 5 && st.status === 'done' && (
                      <div className="border-t border-green-500/20 px-5 py-3">
                        <p className="text-sm text-green-400 font-semibold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          {st.empresas.filter(e => e.whatsappEnviado).length} parceiros contatados com sucesso!
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Remove Modal */}
      {removeOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70" onClick={() => { setRemoveOpen(false); setMotivo(''); }} />
          <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
            <h3 className="font-bold text-white mb-1">
              Remover {agents[approvalAgent ?? 1]?.empresas.filter(e => !selected.has(e.id)).length ?? 0} empresa(s)
            </h3>
            <p className="text-sm text-slate-400 mb-4">Informe o motivo. Este histórico fica disponível para consulta.</p>
            <textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Ex: Capital abaixo do mínimo, fora do perfil..."
              rows={3}
              autoFocus
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none mb-4"
            />
            <div className="flex gap-2">
              <button onClick={() => { setRemoveOpen(false); setMotivo(''); }} className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors">
                Cancelar
              </button>
              <button onClick={confirmRemoval} disabled={!motivo.trim()} className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold disabled:opacity-40 transition-colors">
                Confirmar remoção
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
