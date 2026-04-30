// ─────────────────────────────────────────────────────────────────────────────
// ProspeccaoIA — Pipeline de 5 agentes em cascata para captação de parceiros
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef, useEffect } from 'react';
import {
  X, Send, Loader2, CheckCircle2, AlertTriangle, Clock,
  Search, Building2, ShieldCheck, Users, MessageCircle,
  ArrowDown, Trash2, Settings, FileDown, Copy, ExternalLink, Zap,
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

interface AgentState {
  status: AgentStatus;
  empresas: ProspectEmpresa[];
  log: string;
  error?: string;
}

interface ChatMsg { role: 'user' | 'assistant'; content: string; }

interface Criterios {
  setor?: string;
  cidade?: string;
  estado?: string;
  regioes?: string[];
  capitalMin?: number;
  porte?: string;
  palavrasChave?: string;
  excluirSegmentos?: string;
  observacoes?: string;
}

export interface ProspeccaoSession {
  criterios: Criterios;
  totalBuscadas: number;
  totalQualificadas: number;
  totalDescartadas: number;
  empresas: ProspectEmpresa[];
}

interface Props {
  onClose: () => void;
  onParceirosAdded: (empresas: ProspectEmpresa[], session: ProspeccaoSession) => void;
}

// ── Agent config ──────────────────────────────────────────────────────────────
const AGENTS = [
  { id: 1, Icon: Search,        label: 'Busca Web',         desc: 'Gemini + Google Search',  color: 'violet' },
  { id: 2, Icon: Building2,     label: 'Dados Receita',     desc: 'Gemini Search',           color: 'blue'   },
  { id: 3, Icon: ShieldCheck,   label: 'Reputação',         desc: 'Gemini Search / Serasa',  color: 'emerald'},
  { id: 4, Icon: Users,         label: 'Sócios & Contatos', desc: 'Gemini Search',           color: 'amber'  },
  { id: 5, Icon: MessageCircle, label: 'Disparo WhatsApp',  desc: 'Z-API / Twilio',          color: 'green'  },
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

async function callGemini(type: string, payload: Record<string, unknown>, tenantId?: string): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase.functions.invoke('ai-proxy', { body: { type, ...(tenantId ? { tenantId } : {}), ...payload } });
    if (!error && data?.error !== 'GEMINI_TIMEOUT') return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const isRetryable =
      error?.message?.includes('Failed to send a request') ||
      error?.message?.includes('relay') ||
      error?.message?.includes('non-2xx') ||
      data?.error === 'GEMINI_TIMEOUT';
    if (!isRetryable || attempt === 2) throw new Error(error?.message ?? `Erro IA: ${data?.error}`);
    await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
  }
  throw new Error('Falha ao contatar a IA após 3 tentativas.');
}

function parseCnpj(s: string) { return s.replace(/\D/g, ''); }

function cleanJsonText(s: string): string {
  // Remove markdown fences e texto introdutório
  return s.replace(/```json|```/gi, '').trim();
}

function extractJsonArray<T>(raw: string): T[] | null {
  const cleaned = cleanJsonText(raw);
  try {
    const v = JSON.parse(cleaned);
    if (Array.isArray(v)) return v as T[];
  } catch { /* continua */ }
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

async function fetchBrasilApiCnpj(cnpj: string): Promise<Record<string, unknown> | null> {
  const limpo = cnpj.replace(/\D/g, '');
  if (limpo.length !== 14) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${limpo}`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    return await res.json() as Record<string, unknown>;
  } catch { return null; }
}

// ── Component ─────────────────────────────────────────────────────────────────
const MAX_ROUNDS = 5;

export default function ProspeccaoIA({ onClose, onParceirosAdded }: Props) {
  const { activeProfile } = useProfiles();
  const { scopeIds: getScopeIds } = useCompanies();
  const tenantId = activeProfile?.entityId;

  // chat
  const [msgs, setMsgs] = useState<ChatMsg[]>([{
    role: 'assistant',
    content: 'Olá! Vou te fazer algumas perguntas para montar o perfil ideal de parceiro e garantir uma busca precisa.\n\nPrimeiro: qual é o **setor ou tipo de empresa** que você busca como parceiro?',
  }]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [criterios, setCriterios] = useState<Criterios>({});
  const [ready, setReady] = useState(false);
  const [targetCount, setTargetCount] = useState(10);
  const chatEnd = useRef<HTMLDivElement>(null);

  // pipeline
  const [agents, setAgents] = useState(initAgents);
  const [approvalAgent, setApprovalAgent] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // acumulação multi-rodada
  const [rodada, setRodada] = useState(1);
  const [sendPhase, setSendPhase] = useState(false);
  const [allQualified, setAllQualified] = useState<ProspectEmpresa[]>([]);
  const allQualifiedRef = useRef<ProspectEmpresa[]>([]);
  const allProcessedRef = useRef<Set<string>>(new Set());
  const rodadaRef       = useRef(1);

  // automação
  const [autoMode, setAutoMode] = useState(false);

  // removal
  const [removeOpen, setRemoveOpen] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [removidas, setRemovidas] = useState<EmpresaRemovida[]>([]);
  const [tab, setTab] = useState<'pipeline' | 'removidas'>('pipeline');

  // relatório para envio manual
  const [reportOpen, setReportOpen] = useState(false);
  const [reportMsg, setReportMsg] = useState('');

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  // ── Auto-avanço entre agentes ──────────────────────────────────────────
  useEffect(() => {
    if (!autoMode || approvalAgent === null) return;
    const aid = approvalAgent;
    const st = agents[aid];
    if (st?.status !== 'waiting_approval') return;

    // Captura tudo agora (valores correntes no momento em que o painel de aprovação apareceu)
    const all = st.empresas;
    const aprovadas = all.filter(e => selected.has(e.id));
    const novas: EmpresaRemovida[] = all
      .filter(e => !selected.has(e.id))
      .map(e => ({ empresa: e, etapaRemovida: aid as 1|2|3|4, motivoRemocao: 'Filtro automático', removidaEm: new Date().toISOString() }));

    const t = setTimeout(() => {
      if (novas.length > 0) setRemovidas(p => [...p, ...novas]);
      upAgent(aid, { status: 'done' });
      setApprovalAgent(null);
      setSelected(new Set());

      if (aprovadas.length === 0) {
        // Nenhuma passou → reiniciar do agente 1
        const a1Names = agents[1].empresas.map(e => e.nome.toLowerCase().trim());
        allProcessedRef.current = new Set([...allProcessedRef.current, ...a1Names]);
        rodadaRef.current = 1; setRodada(1);
        allQualifiedRef.current = []; setAllQualified([]);
        setAgents(prev => ({
          1: { status: 'idle', empresas: [], log: '' },
          2: { status: 'idle', empresas: [], log: '' },
          3: { status: 'idle', empresas: [], log: '' },
          4: { status: 'idle', empresas: [], log: '' },
          5: prev[5],
        }));
        setTimeout(() => runAgent1(), 400);
        return;
      }

      if (aid === 1) { runAgent2(aprovadas); return; }
      if (aid === 2) { runAgent3(aprovadas); return; }
      if (aid === 3) { runAgent4(aprovadas); return; }

      if (aid === 4) {
        const newAll = [...allQualifiedRef.current, ...aprovadas];
        allQualifiedRef.current = newAll; setAllQualified([...newAll]);
        const a1Names = agents[1].empresas.map(e => e.nome.toLowerCase().trim());
        allProcessedRef.current = new Set([...allProcessedRef.current, ...a1Names]);
        if (newAll.length >= targetCount || rodadaRef.current >= MAX_ROUNDS) {
          setSendPhase(true);
          runAgent5(newAll.slice(0, targetCount));
        } else {
          const next = rodadaRef.current + 1;
          rodadaRef.current = next; setRodada(next);
          setAgents(prev => ({
            1: { status: 'idle', empresas: [], log: '' },
            2: { status: 'idle', empresas: [], log: '' },
            3: { status: 'idle', empresas: [], log: '' },
            4: { status: 'idle', empresas: [], log: '' },
            5: prev[5],
          }));
          setTimeout(() => runAgent1(), 400);
        }
      }
    }, 1500);

    return () => clearTimeout(t);
  }, [autoMode, approvalAgent]); // eslint-disable-line react-hooks/exhaustive-deps

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
        system: `Você é assistente de prospecção B2B especialista. Conduza uma conversa para coletar critérios detalhados de busca de parceiros.

FLUXO OBRIGATÓRIO — faça UMA pergunta por vez nesta ordem se o usuário não informou:
1. Setor/tipo de empresa (OBRIGATÓRIO)
2. Regiões/estados/cidades de interesse
3. Porte da empresa (MEI / ME / EPP / Médio / Grande)
4. Capital social mínimo (ex: R$ 500 mil)
5. Palavras-chave do negócio (ex: "atacadista", "importador", "franquia")
6. Segmentos a EXCLUIR
7. Observações extras (ex: "com e-commerce", "que exporta", etc.)

Após coletar pelo menos setor + região + 2 critérios extras, ou se o usuário disser "pode buscar" / "já chega" / "pronto", responda APENAS com JSON (sem markdown):
{"pronto":true,"setor":"...","cidade":"...","estado":"SP","regioes":["SP","RJ","MG"],"capitalMin":0,"porte":"","palavrasChave":"","excluirSegmentos":"","observacoes":""}

Seja conversacional. Confirme o que entendeu antes de perguntar o próximo item.`,
        messages: next.map(m => ({ role: m.role, content: m.content })),
      }, tenantId);
      const cleaned = cleanJsonText(reply);
      const jm = cleaned.match(/\{[\s\S]*"pronto"\s*:\s*true[\s\S]*\}/);
      let parsed: { pronto: boolean; setor?: string; cidade?: string; estado?: string; regioes?: string[]; capitalMin?: number; porte?: string; palavrasChave?: string; excluirSegmentos?: string; observacoes?: string } | null = null;
      if (jm) {
        try { parsed = JSON.parse(jm[0]); } catch { /* ignora */ }
      }
      if (parsed?.pronto) {
        const p = parsed;
        setCriterios({ setor: p.setor, cidade: p.cidade, estado: p.estado, regioes: p.regioes, capitalMin: p.capitalMin, porte: p.porte, palavrasChave: p.palavrasChave, excluirSegmentos: p.excluirSegmentos, observacoes: p.observacoes });
        setReady(true);
        const resumo = [
          p.setor && `• Setor: ${p.setor}`,
          (p.regioes?.length ? `• Regiões: ${p.regioes.join(', ')}` : p.cidade ? `• Local: ${p.cidade}/${p.estado}` : p.estado ? `• Estado: ${p.estado}` : null),
          p.capitalMin ? `• Capital mín: R$ ${Number(p.capitalMin).toLocaleString('pt-BR')}` : null,
          p.porte ? `• Porte: ${p.porte}` : null,
          p.palavrasChave ? `• Palavras-chave: ${p.palavrasChave}` : null,
          p.excluirSegmentos ? `• Excluir: ${p.excluirSegmentos}` : null,
          p.observacoes ? `• Obs: ${p.observacoes}` : null,
        ].filter(Boolean).join('\n');
        setMsgs(prev => [...prev, { role: 'assistant', content: `Critérios definidos:\n${resumo}\n\nDefina a meta de empresas e clique em **Iniciar Busca**!` }]);
      } else {
        setMsgs(prev => [...prev, { role: 'assistant', content: reply }]);
      }
    } catch {
      setMsgs(prev => [...prev, { role: 'assistant', content: 'Erro ao processar. Tente novamente.' }]);
    } finally { setChatLoading(false); }
  }

  // ── Agent 1: Busca Web — 3 sub-buscas paralelas de 10 empresas ───────
  async function runAgent1() {
    upAgent(1, { status: 'running', log: 'Pesquisando empresas na web (3 buscas paralelas)...' });
    try {
      const excluded = allProcessedRef.current;
      const localStr = criterios.regioes?.length
        ? criterios.regioes.join(', ')
        : criterios.cidade
        ? `${criterios.cidade}/${criterios.estado || 'Brasil'}`
        : criterios.estado || 'Brasil';
      const excludeStr = excluded.size > 0
        ? `\nNÃO inclua: ${[...excluded].slice(0, 30).join(', ')}`
        : '';

      const baseCtx = `setor "${criterios.setor}" em ${localStr}`
        + (criterios.porte ? `, porte ${criterios.porte}` : '')
        + (criterios.capitalMin ? `, capital até R$ ${criterios.capitalMin.toLocaleString('pt-BR')}` : '')
        + (criterios.palavrasChave ? `, tema: ${criterios.palavrasChave}` : '')
        + (criterios.excluirSegmentos ? `. Excluir: ${criterios.excluirSegmentos}` : '')
        + (criterios.observacoes ? `. Obs: ${criterios.observacoes}` : '');

      // 3 ângulos de busca diferentes para maximizar diversidade
      const angles = [
        `Pesquise empresas reais do ${baseCtx}. Liste até 10 empresas diferentes. Para cada: nome, CNPJ se disponível, cidade, UF, descrição curta. Uma por linha numerada.${excludeStr}`,
        `Pesquise mais empresas reais do ${baseCtx}, priorizando as menos conhecidas e de menor porte. Liste até 10 empresas diferentes. Para cada: nome, CNPJ se disponível, cidade, UF, descrição curta. Uma por linha numerada.${excludeStr}`,
        `Pesquise empresas reais do ${baseCtx}, focando em diferentes bairros ou regiões. Liste até 10 empresas diferentes. Para cada: nome, CNPJ se disponível, cidade, UF, descrição curta. Uma por linha numerada.${excludeStr}`,
      ];

      const system = 'Você é um pesquisador B2B. Use Google Search para encontrar empresas reais e ativas. Não invente empresas.';

      // Disparar as 3 buscas em paralelo
      const rawResults = await Promise.allSettled(
        angles.map(prompt =>
          callGemini('gemini-pro-search', { system, messages: [{ role: 'user', content: prompt }] }, tenantId)
        )
      );

      const rawCombined = rawResults
        .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled' && r.value.trim().length > 20)
        .map(r => r.value)
        .join('\n\n');

      if (!rawCombined || rawCombined.trim().length < 30) {
        throw new Error('Gemini não retornou resultados da busca. Tente refinar os critérios (ex.: setor mais específico).');
      }

      // ── Estruturar resultado combinado em JSON ──────────────────────────
      upAgent(1, { log: 'Estruturando resultados em JSON...' });

      const structPrompt = `Converta o texto abaixo em um JSON array de empresas.
Schema: [{"nome":"string","cnpj":"14 dígitos ou ausente","cidade":"string","estado":"UF 2 letras","descricao":"string curta"}]

Regras:
- CNPJ: apenas 14 dígitos, sem pontuação. Omita o campo se não estiver no texto.
- Deduplique por nome (mantenha apenas a primeira ocorrência).
- Retorne APENAS um JSON array válido. Se não houver empresas, retorne [].

Texto:
"""
${rawCombined.slice(0, 8000)}
"""`;

      const structured = await callGemini('gemini-text', {
        prompt: structPrompt,
        usePro: true,
      }, tenantId);

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

  // ── Agent 2: Dados Receita — BrasilAPI direto + Gemini batch de 10 ────
  async function runAgent2(list: ProspectEmpresa[]) {
    upAgent(2, { status: 'running', log: `Consultando ${list.length} empresas...` });
    const results: ProspectEmpresa[] = [...list];
    try {
      // ─ Fase A: BrasilAPI para quem já tem CNPJ (8 paralelas, oficial e rápido) ─
      const comCnpj = list.filter(e => e.cnpj?.replace(/\D/g, '').length === 14);
      if (comCnpj.length > 0) {
        const BAPI = 8;
        for (let i = 0; i < comCnpj.length; i += BAPI) {
          upAgent(2, { log: `BrasilAPI: ${Math.min(i + BAPI, comCnpj.length)}/${comCnpj.length} CNPJs...` });
          await Promise.allSettled(comCnpj.slice(i, i + BAPI).map(async (emp) => {
            const d = await fetchBrasilApiCnpj(emp.cnpj!);
            if (!d) return;
            const idx = list.indexOf(emp);
            const cap  = (d.capital_social as number) ?? 0;
            const sit  = (d.descricao_situacao_cadastral as string) ?? 'ATIVA';
            const socios = ((d.qsa as { nome_socio?: string; qualificacao_socio_descricao?: string }[]) ?? [])
              .map(s => ({ nome: s.nome_socio ?? '', qualificacao: s.qualificacao_socio_descricao ?? '' }));
            const tel  = (d.ddd_telefone_1 as string | undefined)?.trim();
            if (criterios.capitalMin && cap < criterios.capitalMin)
              results[idx] = { ...emp, situacao: 'CAPITAL_INSUFICIENTE', capitalSocial: cap, capitalSocialStr: `R$ ${cap.toLocaleString('pt-BR')}`, socios };
            else
              results[idx] = { ...emp, situacao: sit, capitalSocial: cap, capitalSocialStr: `R$ ${cap.toLocaleString('pt-BR')}`, socios, telefone: tel || emp.telefone, email: (d.email as string) || emp.email };
          }));
        }
      }

      // ─ Fase B: Gemini batch de 10 para empresas sem CNPJ (3 batches simultâneos) ─
      const semCnpj = list.filter(e => !e.cnpj || e.cnpj.replace(/\D/g, '').length !== 14);
      if (semCnpj.length > 0) {
        const BSIZE = 10, CONC = 3;
        for (let i = 0; i < semCnpj.length; i += BSIZE * CONC) {
          const grupos: { items: ProspectEmpresa[]; off: number }[] = [];
          for (let j = 0; j < CONC; j++) {
            const s = i + j * BSIZE;
            if (s >= semCnpj.length) break;
            grupos.push({ items: semCnpj.slice(s, s + BSIZE), off: s });
          }
          upAgent(2, { log: `Gemini Receita: ${Math.min(i + BSIZE * CONC, semCnpj.length)}/${semCnpj.length} sem CNPJ...` });
          await Promise.allSettled(grupos.map(async ({ items }) => {
            try {
              type Rec2B = { idx: number; cnpj?: string; situacao?: string; capitalSocial?: number; capitalSocialStr?: string; socios?: { nome: string; qualificacao: string }[]; telefone?: string; email?: string };
              const nomes = items.map((e, k) => `${k + 1}. ${e.nome}${e.cidade ? ` — ${e.cidade}/${e.estado}` : ''}`).join('\n');
              const raw = await callGemini('gemini-pro-search', {
                system: 'Pesquisador de dados empresariais brasileiro. Use Google Search para encontrar dados reais da Receita Federal.',
                messages: [{ role: 'user', content: `Pesquise dados públicos da Receita Federal para:\n${nomes}\nPara cada: CNPJ (14 dígitos), situação cadastral, capital social, sócios, telefone, email.` }],
              }, tenantId);
              const structured = await callGemini('gemini-text', {
                prompt: `JSON array (sem markdown): [{"idx":1,"cnpj":"14digits","situacao":"ATIVA","capitalSocial":0,"capitalSocialStr":"R$...","socios":[{"nome":"","qualificacao":""}],"telefone":"","email":""}]\n\nTexto:\n"""\n${raw}\n"""`,
                usePro: true,
              }, tenantId);
              const parsed = extractJsonArray<Rec2B>(structured);
              items.forEach((emp, k) => {
                const d = parsed?.find(p => p.idx === k + 1);
                if (!d) return;
                const idx = list.indexOf(emp);
                if (criterios.capitalMin && typeof d.capitalSocial === 'number' && d.capitalSocial < criterios.capitalMin)
                  results[idx] = { ...emp, cnpj: d.cnpj ?? emp.cnpj, situacao: 'CAPITAL_INSUFICIENTE', capitalSocial: d.capitalSocial, capitalSocialStr: d.capitalSocialStr, socios: d.socios };
                else
                  results[idx] = { ...emp, cnpj: d.cnpj ?? emp.cnpj, situacao: d.situacao ?? 'ATIVA', capitalSocial: d.capitalSocial, capitalSocialStr: d.capitalSocialStr, socios: d.socios, telefone: d.telefone ?? emp.telefone, email: d.email };
              });
            } catch { /* mantém originais */ }
          }));
        }
      }

      const ativas = results.filter(e => !e.situacao || e.situacao === 'ATIVA');
      upAgent(2, { status: 'waiting_approval', empresas: results, log: `${ativas.length} ativas de ${results.length} consultadas.` });
      setApprovalAgent(2);
      setSelected(new Set(ativas.map(e => e.id)));
    } catch (e) { upAgent(2, { status: 'error', log: '', error: e instanceof Error ? e.message : String(e) }); }
  }

  // ── Agent 3: Reputação — Gemini batch de 10 (3 simultâneos) ─────────
  async function runAgent3(list: ProspectEmpresa[]) {
    upAgent(3, { status: 'running', log: `Verificando reputação de ${list.length} empresas...` });
    let hasSerasaApi = false;
    if (activeProfile) {
      try {
        const ids = getScopeIds(activeProfile.entityType as 'holding' | 'matrix' | 'branch', activeProfile.entityId);
        const keys = await getApiKeys([activeProfile.entityId, ...ids]);
        hasSerasaApi = keys.some(k => k.integracao_tipo === 'custom' && k.nome.toLowerCase().includes('serasa') && k.status === 'ativo');
      } catch { /* no key */ }
    }
    const BSIZE = 10, CONC = 3;
    const results: ProspectEmpresa[] = [...list];
    try {
      for (let i = 0; i < list.length; i += BSIZE * CONC) {
        const grupos: { items: ProspectEmpresa[]; off: number }[] = [];
        for (let j = 0; j < CONC; j++) {
          const s = i + j * BSIZE;
          if (s >= list.length) break;
          grupos.push({ items: list.slice(s, s + BSIZE), off: s });
        }
        upAgent(3, { log: `Reputação: ${Math.min(i + BSIZE * CONC, list.length)}/${list.length}...` });
        await Promise.allSettled(grupos.map(async ({ items, off }) => {
          try {
            type Rec3 = { idx: number; status: 'ok' | 'atencao' | 'restrito' };
            const nomes = items.map((e, k) => `${k + 1}. ${e.nome}${e.cnpj ? ` (CNPJ ${e.cnpj})` : ''}`).join('\n');
            const raw = await callGemini('gemini-pro-search', {
              system: 'Analista de risco empresarial. Pesquise protestos, dívidas, ações judiciais e notícias negativas.',
              messages: [{ role: 'user', content: `Verifique reputação financeira de:\n${nomes}\nPara cada: protestos, dívidas, ações judiciais, avaliação (ok/atencao/restrito).` }],
            }, tenantId);
            const structured = await callGemini('gemini-text', {
              prompt: `JSON array (sem markdown): [{"idx":1,"status":"ok"}]. Status: ok=sem restrições, atencao=atenção, restrito=restrições graves.\n\nTexto:\n"""\n${raw}\n"""`,
              usePro: true,
            }, tenantId);
            const parsed = extractJsonArray<Rec3>(structured);
            items.forEach((emp, k) => {
              const d = parsed?.find(p => p.idx === k + 1);
              results[off + k] = { ...emp, serasaStatus: (d?.status ?? 'unknown') as 'ok' | 'restrito' | 'unknown' };
            });
          } catch { /* mantém originais */ }
        }));
      }
      const semRest = results.filter(e => e.serasaStatus !== 'restrito');
      upAgent(3, {
        status: 'waiting_approval', empresas: results,
        log: hasSerasaApi ? `${semRest.length} sem restrições (Serasa).` : `${semRest.length} sem restrições. Configure API Serasa para dados oficiais.`,
      });
      setApprovalAgent(3);
      setSelected(new Set(semRest.map(e => e.id)));
    } catch (e) { upAgent(3, { status: 'error', log: '', error: e instanceof Error ? e.message : String(e) }); }
  }

  // ── Agent 4: Sócios & Contatos — Gemini batch de 10 (3 simultâneos) ──
  async function runAgent4(list: ProspectEmpresa[]) {
    upAgent(4, { status: 'running', log: `Buscando contatos de ${list.length} empresas...` });
    const BSIZE = 10, CONC = 3;
    const results: ProspectEmpresa[] = [...list];
    try {
      for (let i = 0; i < list.length; i += BSIZE * CONC) {
        const grupos: { items: ProspectEmpresa[]; off: number }[] = [];
        for (let j = 0; j < CONC; j++) {
          const s = i + j * BSIZE;
          if (s >= list.length) break;
          grupos.push({ items: list.slice(s, s + BSIZE), off: s });
        }
        upAgent(4, { log: `Contatos: ${Math.min(i + BSIZE * CONC, list.length)}/${list.length}...` });
        await Promise.allSettled(grupos.map(async ({ items, off }) => {
          try {
            type Rec4 = { idx: number; contatos: { nome: string; cargo?: string; telefone?: string; email?: string }[] };
            const nomes = items.map((e, k) => `${k + 1}. ${e.nome}${e.socios?.length ? ` — sócios: ${e.socios.map(s => s.nome).join(', ')}` : ''}${e.cidade ? ` — ${e.cidade}/${e.estado}` : ''}`).join('\n');
            const raw = await callGemini('gemini-pro-search', {
              system: 'Pesquisador de contatos empresariais. Busque o celular/WhatsApp DIRETO dos sócios e donos. Prefira números de celular (9 dígitos após o DDD) em vez de fixo. O telefone registrado na Receita Federal pode ser do contador — busque o contato REAL do empresário em redes sociais, LinkedIn, site da empresa e outros.',
              messages: [{ role: 'user', content: `Pesquise o celular/WhatsApp e email dos SÓCIOS e DONOS de:\n${nomes}\nPrefira números de celular que comecem com 9 (WhatsApp). Evite números de escritórios de contabilidade. Se encontrar o LinkedIn ou Instagram do sócio, use para validar.` }],
            }, tenantId);
            const structured = await callGemini('gemini-text', {
              prompt: `JSON array (sem markdown): [{"idx":1,"contatos":[{"nome":"","cargo":"","telefone":"+55...","email":""}]}]\n\nPrefira telefones celulares (9 dígitos após DDD). Se o número tiver 8 dígitos após o DDD é fixo — inclua mesmo assim mas com cargo "Empresa (fixo)".\n\nTexto:\n"""\n${raw}\n"""`,
              usePro: true,
            }, tenantId);
            const parsed = extractJsonArray<Rec4>(structured);
            items.forEach((emp, k) => {
              const d = parsed?.find(p => p.idx === k + 1);
              let contatos = d?.contatos ?? [];
              if (contatos.length === 0 && (emp.telefone || emp.email))
                contatos = [{ nome: emp.nome, telefone: emp.telefone, email: emp.email, cargo: 'Empresa' }];
              results[off + k] = { ...emp, contatos };
            });
          } catch { /* mantém originais */ }
        }));
      }
      const comContato = results.filter(e => (e.contatos?.length ?? 0) > 0);
      upAgent(4, { status: 'waiting_approval', empresas: results, log: `${comContato.length} empresas com contatos.` });
      setApprovalAgent(4);
      setSelected(new Set(results.map(e => e.id)));
    } catch (e) { upAgent(4, { status: 'error', log: '', error: e instanceof Error ? e.message : String(e) }); }
  }

  // ── Agent 5: WhatsApp ─────────────────────────────────────────────────
  async function runAgent5(list: ProspectEmpresa[]) {
    upAgent(5, { status: 'running', log: 'Verificando configuração WhatsApp...' });
    let waKey = null;
    try {
      if (activeProfile) {
        const ids = getScopeIds(activeProfile.entityType as 'holding' | 'matrix' | 'branch', activeProfile.entityId);
        const keys = await getApiKeys([activeProfile.entityId, ...ids]);
        waKey = keys.find(k => k.integracao_tipo === 'whatsapp' && k.status === 'ativo' && (k.permissoes.whatsapp.enviar_em_massa || k.permissoes.whatsapp.enviar_sem_comando));
      }
    } catch { /* no key */ }

    if (!waKey) {
      upAgent(5, { status: 'no_api', empresas: list, log: 'Nenhuma API WhatsApp configurada. Configure em Configurações → Integrações.' });
      return;
    }

    const cfg = (waKey.integracao_config ?? {}) as { provider?: string; instanceUrl?: string; token?: string; accountSid?: string; authToken?: string; from?: string };

    // Usa a mensagem configurada na integração — mensagem_inicial tem prioridade
    const wa = waKey.permissoes?.whatsapp ?? {};
    const msgTemplate: string = wa.mensagem_inicial || wa.resposta_fixa ||
      `Olá! Identificamos sua empresa como potencial parceira no setor de ${criterios.setor || 'nossa área'}. Podemos conversar sobre oportunidades de parceria?`;

    // ── Persistir todas as empresas prospectadas no Supabase ─────────────
    if (tenantId && list.length > 0) {
      const prospEntries = list.map(e => {
        const tel1 = e.telefone || e.contatos?.[0]?.telefone || null;
        const tel2 = e.contatos?.[1]?.telefone || null;
        const email = e.email || e.contatos?.[0]?.email || null;
        return {
          tenant_id:         tenantId,
          nome_fantasia:     e.nome,
          cnpj:              e.cnpj || null,
          cnpj_situacao:     e.situacao || null,
          capital_social:    e.capitalSocial ?? null,
          municipio:         e.cidade || null,
          uf:                e.estado || null,
          telefone_principal: tel1,
          telefone_secundario: tel2,
          email_contato:     email,
          socios:            e.socios ?? null,
          serasa_status:     e.serasaStatus || null,
          descricao_google:  e.descricao || null,
          segmento:          criterios.setor || null,
          status_pipeline:   'prospectado',
          etapa_atual:       'agente5_whatsapp',
          fonte_descoberta:  'prospeccao_ia',
        };
      });
      await supabase.from('prosp_empresas').insert(prospEntries).then(({ error }) => {
        if (error) console.warn('[Prospecção] Erro ao salvar prosp_empresas:', error.message);
      });
    }

    const results: ProspectEmpresa[] = [];
    let sent = 0;
    let semTelefone = 0;
    let semWhatsapp = 0;
    let falhaEnvio = 0;

    function normalizePhone(ph: string): string {
      const digits = ph.replace(/\D/g, '');
      return digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
    }

    async function isOnWhatsapp(clean: string): Promise<boolean> {
      if (cfg.provider === 'twilio' || cfg.accountSid) return true;
      try {
        const { data } = await supabase.functions.invoke('whatsapp-proxy', {
          body: { action: 'check-phone', instanceUrl: cfg.instanceUrl, token: cfg.token, phone: clean },
        });
        return (data as { exists?: boolean })?.exists === true;
      } catch { return true; }
    }

    upAgent(5, { status: 'running', log: `Validando ${list.length} números no WhatsApp...` });

    for (const emp of list) {
      const phonesSet = new Set<string>();
      (emp.contatos ?? []).forEach(c => { if (c.telefone) phonesSet.add(c.telefone); });
      if (emp.telefone) phonesSet.add(emp.telefone);
      const phones = [...phonesSet].filter(Boolean).map(normalizePhone).filter(p => p.length >= 10);

      let ok = false;
      if (phones.length === 0) {
        semTelefone++;
      } else {
        const validados: string[] = [];
        for (const clean of phones) {
          if (await isOnWhatsapp(clean)) validados.push(clean);
        }
        if (validados.length === 0) {
          semWhatsapp++;
        } else {
          for (const clean of validados) {
            try {
              if (cfg.provider === 'twilio' || cfg.accountSid) {
                const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Messages.json`, {
                  method: 'POST',
                  headers: { Authorization: `Basic ${btoa(`${cfg.accountSid}:${cfg.authToken}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
                  body: new URLSearchParams({ From: `whatsapp:${cfg.from}`, To: `whatsapp:+${clean}`, Body: msgTemplate }),
                });
                ok = r.ok;
              } else {
                const { data, error } = await supabase.functions.invoke('whatsapp-proxy', {
                  body: { action: 'send-text', instanceUrl: cfg.instanceUrl, token: cfg.token, phone: clean, message: msgTemplate },
                });
                ok = !error && (data as { ok?: boolean })?.ok === true;
              }
              if (ok) { sent++; break; }
            } catch { /* try next */ }
          }
          if (!ok) falhaEnvio++;
        }
      }
      results.push({ ...emp, whatsappEnviado: ok });
    }

    // Salvar empresas contatadas no CRM (crm_negociacoes) e atualizar status no prosp_empresas
    if (tenantId) {
      const enviadas = results.filter(e => e.whatsappEnviado);
      if (enviadas.length > 0) {
        const crmEntries = enviadas.map(e => ({
          tenant_id: tenantId,
          cliente_nome: e.nome,
          cliente_telefone: (e.contatos?.[0]?.telefone ?? e.telefone ?? '').replace(/\D/g, '') || null,
          origem: 'prospeccao_ia',
          status: 'aberta',
          etapa: 'prospeccao',
          responsavel: 'IA Prospecção',
        }));
        await supabase.from('crm_negociacoes').insert(crmEntries).then(({ error }) => {
          if (error) console.warn('[Prospecção] Erro ao salvar no CRM:', error.message);
        });
        // Marcar como whatsapp_enviado no prosp_empresas
        const nomesEnviados = enviadas.map(e => e.nome);
        await supabase.from('prosp_empresas')
          .update({ status_pipeline: 'whatsapp_enviado', etapa_atual: 'aguardando_resposta' })
          .eq('tenant_id', tenantId)
          .in('nome_fantasia', nomesEnviados)
          .then(({ error }) => {
            if (error) console.warn('[Prospecção] Erro ao atualizar prosp_empresas:', error.message);
          });
      }
    }

    const logParts = [`${sent} de ${list.length} enviadas`];
    if (semTelefone > 0) logParts.push(`${semTelefone} sem telefone`);
    if (semWhatsapp > 0) logParts.push(`${semWhatsapp} não estão no WhatsApp`);
    if (falhaEnvio > 0) logParts.push(`${falhaEnvio} com falha no envio`);

    upAgent(5, { status: 'done', empresas: results, log: logParts.join(' · ') });
    const qualificadas = results.filter(e => e.whatsappEnviado);
    onParceirosAdded(qualificadas, {
      criterios,
      totalBuscadas: list.length + removidas.length,
      totalQualificadas: qualificadas.length,
      totalDescartadas: removidas.length,
      empresas: results,
    });
  }

  // ── Proceed after approval ────────────────────────────────────────────
  function proceed(aprovadas: ProspectEmpresa[], novasRemovidas: EmpresaRemovida[]) {
    if (approvalAgent === null) return;
    const aid = approvalAgent;
    if (novasRemovidas.length > 0) setRemovidas(p => [...p, ...novasRemovidas]);
    upAgent(aid, { status: 'done' });
    setApprovalAgent(null);
    setSelected(new Set());

    if (aid === 1) { runAgent2(aprovadas); return; }
    if (aid === 2) { runAgent3(aprovadas); return; }
    if (aid === 3) { runAgent4(aprovadas); return; }

    if (aid === 4) {
      // Acumular empresas qualificadas
      const newAll = [...allQualifiedRef.current, ...aprovadas];
      allQualifiedRef.current = newAll;
      setAllQualified([...newAll]);

      // Registrar TODAS as empresas do agente 1 desta rodada como processadas
      const agent1Names = agents[1].empresas.map(e => e.nome.toLowerCase().trim());
      const newProcessed = new Set([...allProcessedRef.current, ...agent1Names]);
      allProcessedRef.current = newProcessed;

      if (newAll.length >= targetCount || rodadaRef.current >= MAX_ROUNDS) {
        // Meta atingida ou rodadas esgotadas → disparar WhatsApp com tudo
        setSendPhase(true);
        runAgent5(newAll.slice(0, targetCount));
      } else {
        // Iniciar próxima rodada de coleta
        const next = rodadaRef.current + 1;
        rodadaRef.current = next;
        setRodada(next);
        setAgents(prev => ({
          1: { status: 'idle', empresas: [], log: '' },
          2: { status: 'idle', empresas: [], log: '' },
          3: { status: 'idle', empresas: [], log: '' },
          4: { status: 'idle', empresas: [], log: '' },
          5: prev[5],
        }));
        setTimeout(() => runAgent1(), 400);
      }
    }
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoMode(p => !p)}
            title={autoMode ? 'Desativar automação' : 'Ativar automação — avança automaticamente entre agentes'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${autoMode ? 'bg-violet-600 text-white shadow-md shadow-violet-500/30' : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-white'}`}
          >
            <Zap className="w-3.5 h-3.5" />
            {autoMode ? 'Auto ON' : 'Automação'}
          </button>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
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
              {ready && !sendPhase && agents[1].status === 'idle' && rodada === 1 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-semibold">Meta de empresas</span>
                    <span className="text-xs text-violet-400">{targetCount}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setTargetCount(n => Math.max(1, n - 5))} className="w-8 h-8 rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600 font-bold text-sm transition-colors">−</button>
                    <input
                      type="number"
                      min={1} max={200}
                      value={targetCount}
                      onChange={e => setTargetCount(Math.max(1, Math.min(200, parseInt(e.target.value) || 1)))}
                      className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-2 py-1.5 text-sm text-white text-center focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                    />
                    <button onClick={() => setTargetCount(n => Math.min(200, n + 5))} className="w-8 h-8 rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600 font-bold text-sm transition-colors">+</button>
                  </div>
                  <button
                    onClick={runAgent1}
                    className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Search className="w-4 h-4" /> Iniciar Busca
                  </button>
                </div>
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

            {/* Barra de progresso multi-rodada */}
            {(allQualified.length > 0 || rodada > 1) && (
              <div className="bg-slate-900 border border-violet-500/30 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-400">Rodada</span>
                  <span className="font-bold text-violet-400">{rodada}/{MAX_ROUNDS}</span>
                  <span className="text-slate-600">·</span>
                  <span className="text-slate-400">Qualificadas</span>
                  <span className={`font-bold ${allQualified.length >= targetCount ? 'text-green-400' : 'text-white'}`}>{allQualified.length}/{targetCount}</span>
                </div>
                {allQualified.length > 0 && !sendPhase && agents[5].status === 'idle' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const base = `Olá! Identificamos sua empresa como potencial parceiro no setor de ${criterios.setor || 'nossa área'}. Podemos conversar sobre oportunidades de parceria?`;
                        setReportMsg(base);
                        setReportOpen(true);
                      }}
                      className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors flex items-center gap-1.5 border border-slate-700"
                    >
                      <FileDown className="w-3.5 h-3.5" /> Gerar relatório
                    </button>
                    <button
                      onClick={() => { setSendPhase(true); runAgent5(allQualified); }}
                      className="text-xs px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors"
                    >
                      Enviar agora ({allQualified.length})
                    </button>
                  </div>
                )}
              </div>
            )}

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
                      {st.empresas.length > 0 && (
                        <span className="text-xs font-bold px-2 py-1 bg-slate-800 text-slate-300 rounded-lg">{st.empresas.length}</span>
                      )}
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

                    {/* Approval panel */}
                    {isApproving && (
                      <div className="border-t border-amber-500/20 bg-slate-950/60 p-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
                            <Clock className="w-4 h-4" /> Aprovação necessária
                          </p>
                          {autoMode && (
                            <span className="flex items-center gap-1 text-xs font-semibold text-violet-400 animate-pulse">
                              <Zap className="w-3 h-3" /> Avançando em 1.5s...
                            </span>
                          )}
                        </div>
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

                    {cfg.id === 5 && st.status === 'idle' && !sendPhase && (
                      <div className="border-t border-slate-800 px-5 py-3">
                        <p className="text-xs text-slate-500">
                          {allQualified.length === 0
                            ? 'Aguardando coleta de empresas...'
                            : `${allQualified.length}/${targetCount} qualificadas — coletando mais...`}
                        </p>
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

      {/* Report Modal — relatório para envio manual via WhatsApp */}
      {reportOpen && (() => {
        const rows = allQualified.map(emp => {
          const contato = emp.contatos?.find(c => c.telefone) ?? emp.contatos?.[0];
          const telefone = (contato?.telefone ?? emp.telefone ?? '').replace(/\D/g, '');
          return {
            id: emp.id,
            empresa: emp.nome || '—',
            cnpj: emp.cnpj ?? '',
            contato: contato?.nome ?? '',
            cargo: contato?.cargo ?? '',
            email: contato?.email ?? emp.email ?? '',
            telefone,
          };
        });

        const csv = [
          ['Empresa','CNPJ','Contato','Cargo','Telefone','E-mail','Link WhatsApp','Mensagem'].join(';'),
          ...rows.map(r => [
            r.empresa,
            r.cnpj,
            r.contato,
            r.cargo,
            r.telefone,
            r.email,
            r.telefone ? `https://wa.me/${r.telefone}?text=${encodeURIComponent(reportMsg)}` : '',
            reportMsg.replace(/\n/g, ' '),
          ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')),
        ].join('\n');

        const copyCsv = () => { navigator.clipboard.writeText(csv); };
        const downloadCsv = () => {
          const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `prospeccao-${new Date().toISOString().slice(0,10)}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        };
        const copyMsg = (tel: string) => {
          navigator.clipboard.writeText(reportMsg);
          if (tel) window.open(`https://wa.me/${tel}?text=${encodeURIComponent(reportMsg)}`, '_blank');
        };

        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/70" onClick={() => setReportOpen(false)} />
            <div className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white flex items-center gap-2"><FileDown className="w-4 h-4 text-violet-400" /> Relatório para envio manual</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{rows.length} empresa(s) qualificada(s). Edite a mensagem e copie/exporte para enviar pelo WhatsApp.</p>
                </div>
                <button onClick={() => setReportOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-6 py-4 border-b border-slate-800 space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Mensagem padrão</label>
                <textarea
                  value={reportMsg}
                  onChange={e => setReportMsg(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
                />
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={copyCsv}
                    className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors flex items-center gap-1.5 border border-slate-700"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copiar CSV
                  </button>
                  <button
                    onClick={downloadCsv}
                    className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <FileDown className="w-3.5 h-3.5" /> Baixar CSV
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-3">
                {rows.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-8">Nenhuma empresa qualificada ainda.</p>
                ) : (
                  <div className="space-y-2">
                    {rows.map(r => (
                      <div key={r.id} className="bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{r.empresa}</p>
                          <p className="text-xs text-slate-400 truncate">
                            {r.contato ? `${r.contato}${r.cargo ? ` · ${r.cargo}` : ''}` : r.cnpj || '—'}
                          </p>
                          <p className="text-xs text-slate-500 font-mono mt-0.5">
                            {r.telefone ? `+${r.telefone}` : 'Sem telefone'}
                            {r.email && ` · ${r.email}`}
                          </p>
                        </div>
                        <button
                          onClick={() => copyMsg(r.telefone)}
                          disabled={!r.telefone}
                          className="text-xs px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                          title={r.telefone ? 'Abre WhatsApp Web/App e copia a mensagem' : 'Contato sem telefone'}
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Abrir WhatsApp
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

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
