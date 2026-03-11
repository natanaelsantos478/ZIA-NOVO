// ─────────────────────────────────────────────────────────────────────────────
// CRM Negociações — painel duplo, 5 abas (Dados · Orçamento · Análise IA ·
//                                          Transcrições · Compromissos)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useCallback } from 'react';
import {
  Briefcase, Search, Plus, X, ChevronRight, Building2, Phone, Mail,
  MapPin, Calendar, TrendingUp, DollarSign, User, AlertCircle,
  FileText, Brain, MessageSquare, Clock, CheckCircle2, Circle,
  Package, Mic, Check, ChevronDown, ChevronUp,
  Video, PhoneCall, Navigation, ListTodo, MoreHorizontal,
} from 'lucide-react';
import {
  getAllNegociacoes, createNegociacao, addCompromisso,
  toggleCompromissoConcluido, setOrcamento,
  type NegociacaoData, type NegociacaoStatus, type NegociacaoEtapa,
  type CompromissoTipo,
} from '../data/crmData';

// ── Helpers ────────────────────────────────────────────────────────────────────
const BRL     = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDur  = (s: number) => `${Math.floor(s / 60)}m${s % 60}s`;
const fmtDate = (d: string) => { if (!d) return '—'; const [y, m, day] = d.split('-'); return `${day}/${m}/${y}`; };

// ── Configs ────────────────────────────────────────────────────────────────────
const STATUS_CFG: Record<NegociacaoStatus, { label: string; color: string; bg: string; dot: string }> = {
  aberta:   { label: 'Aberta',   color: 'text-blue-700',  bg: 'bg-blue-50',  dot: 'bg-blue-500'  },
  ganha:    { label: 'Ganha',    color: 'text-green-700', bg: 'bg-green-50', dot: 'bg-green-500' },
  perdida:  { label: 'Perdida',  color: 'text-red-700',   bg: 'bg-red-50',   dot: 'bg-red-500'   },
  suspensa: { label: 'Suspensa', color: 'text-amber-700', bg: 'bg-amber-50', dot: 'bg-amber-500' },
};

const ETAPA_CFG: Record<NegociacaoEtapa, { label: string; order: number }> = {
  prospeccao:   { label: 'Prospecção',   order: 1 },
  qualificacao: { label: 'Qualificação', order: 2 },
  proposta:     { label: 'Proposta',     order: 3 },
  negociacao:   { label: 'Negociação',   order: 4 },
  fechamento:   { label: 'Fechamento',   order: 5 },
};

const COMP_CFG: Record<CompromissoTipo, { label: string; Icon: typeof Calendar; color: string; bg: string }> = {
  reuniao:  { label: 'Reunião',   Icon: Video,           color: 'text-purple-600',  bg: 'bg-purple-50'  },
  ligacao:  { label: 'Ligação',   Icon: PhoneCall,       color: 'text-blue-600',    bg: 'bg-blue-50'    },
  visita:   { label: 'Visita',    Icon: Navigation,      color: 'text-emerald-600', bg: 'bg-emerald-50' },
  followup: { label: 'Follow-up', Icon: ListTodo,        color: 'text-amber-600',   bg: 'bg-amber-50'   },
  outro:    { label: 'Outro',     Icon: MoreHorizontal,  color: 'text-slate-600',   bg: 'bg-slate-50'   },
};

const ORC_STATUS_CFG = {
  rascunho: { label: 'Rascunho', color: 'text-slate-600', bg: 'bg-slate-100' },
  enviado:  { label: 'Enviado',  color: 'text-blue-700',  bg: 'bg-blue-100'  },
  aprovado: { label: 'Aprovado', color: 'text-green-700', bg: 'bg-green-100' },
  recusado: { label: 'Recusado', color: 'text-red-700',   bg: 'bg-red-100'   },
};

const TEMP_COLOR: Record<string, string> = { QUENTE: 'text-red-600', MORNO: 'text-amber-600', FRIO: 'text-blue-600' };
const TEMP_LABEL: Record<string, string> = { QUENTE: 'Quente', MORNO: 'Morno', FRIO: 'Frio' };

// ── Aba Dados ─────────────────────────────────────────────────────────────────
function TabDados({ data }: { data: NegociacaoData }) {
  const n = data.negociacao;
  const sc = STATUS_CFG[n.status];
  return (
    <div className="p-5 space-y-5 overflow-y-auto h-full custom-scrollbar">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${sc.bg} ${sc.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />{sc.label}
        </span>
        <div className="flex items-center gap-0.5">
          {(Object.keys(ETAPA_CFG) as NegociacaoEtapa[]).map((e, i) => {
            const active = e === n.etapa;
            const done   = ETAPA_CFG[e].order < ETAPA_CFG[n.etapa].order;
            return (
              <div key={e} className="flex items-center gap-0.5">
                {i > 0 && <ChevronRight className="w-3 h-3 text-slate-300" />}
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${active ? 'bg-purple-600 text-white' : done ? 'bg-purple-100 text-purple-600' : 'text-slate-400'}`}>
                  {ETAPA_CFG[e].label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-slate-50 rounded-xl p-4 space-y-2.5">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Dados do Cliente</p>
        <div className="flex items-start gap-2">
          <Building2 className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-slate-800">{n.clienteNome}</p>
            {n.clienteCnpj && <p className="text-xs text-slate-500">CNPJ: {n.clienteCnpj}</p>}
          </div>
        </div>
        {n.clienteEmail     && <div className="flex items-center gap-2 text-sm text-slate-600"><Mail    className="w-3.5 h-3.5 text-slate-400" />{n.clienteEmail}</div>}
        {n.clienteTelefone  && <div className="flex items-center gap-2 text-sm text-slate-600"><Phone   className="w-3.5 h-3.5 text-slate-400" />{n.clienteTelefone}</div>}
        {n.clienteEndereco  && <div className="flex items-start gap-2 text-sm text-slate-600"><MapPin  className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />{n.clienteEndereco}</div>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-purple-50 rounded-xl p-4">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Valor Estimado</p>
          <p className="text-lg font-bold text-purple-700">{n.valor_estimado ? BRL(n.valor_estimado) : '—'}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Probabilidade</p>
          <p className="text-lg font-bold text-green-700">{n.probabilidade ?? 0}%</p>
          <div className="mt-2 h-1.5 bg-green-200 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{ width: `${n.probabilidade ?? 0}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
          <div><p className="text-[11px] text-slate-400">Criação</p><p className="text-sm font-medium text-slate-700">{fmtDate(n.dataCriacao)}</p></div>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-slate-400 shrink-0" />
          <div><p className="text-[11px] text-slate-400">Fechamento Prev.</p><p className="text-sm font-medium text-slate-700">{n.dataFechamentoPrev ? fmtDate(n.dataFechamentoPrev) : '—'}</p></div>
        </div>
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-slate-400 shrink-0" />
          <div><p className="text-[11px] text-slate-400">Responsável</p><p className="text-sm font-medium text-slate-700">{n.responsavel || '—'}</p></div>
        </div>
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-slate-400 shrink-0" />
          <div><p className="text-[11px] text-slate-400">Origem</p><p className="text-sm font-medium text-slate-700">{n.origem || '—'}</p></div>
        </div>
      </div>

      {n.descricao && (
        <div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Descrição</p>
          <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">{n.descricao}</p>
        </div>
      )}
      {n.notas && (
        <div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Notas internas</p>
          <p className="text-sm text-slate-700 bg-amber-50 border border-amber-100 rounded-lg p-3 leading-relaxed">{n.notas}</p>
        </div>
      )}
    </div>
  );
}

// ── Aba Orçamento ──────────────────────────────────────────────────────────────
function TabOrcamento({ data }: { data: NegociacaoData }) {
  const orc = data.orcamento!;
  const sc = ORC_STATUS_CFG[orc.status];
  const subtotal  = orc.itens.reduce((s, i) => s + i.total, 0);
  const descGlobal = subtotal * (orc.desconto_global_pct / 100);
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3 shrink-0">
        <FileText className="w-4 h-4 text-purple-500" />
        <div>
          <p className="text-sm font-bold text-slate-800">{orc.id.toUpperCase()}</p>
          <p className="text-[11px] text-slate-400">Criado em {fmtDate(orc.dataCriacao)} · por {orc.criado_por === 'ia' ? '✦ IA' : 'usuário'}</p>
        </div>
        <span className={`ml-auto text-xs font-semibold px-3 py-1 rounded-full ${sc.bg} ${sc.color}`}>{sc.label}</span>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left text-[11px] text-slate-400 font-semibold pb-2 uppercase">Produto / Serviço</th>
              <th className="text-center text-[11px] text-slate-400 font-semibold pb-2 uppercase w-14">Qtd</th>
              <th className="text-center text-[11px] text-slate-400 font-semibold pb-2 uppercase w-10">Un.</th>
              <th className="text-right text-[11px] text-slate-400 font-semibold pb-2 uppercase w-24">Preço Un.</th>
              <th className="text-right text-[11px] text-slate-400 font-semibold pb-2 uppercase w-14">Desc.</th>
              <th className="text-right text-[11px] text-slate-400 font-semibold pb-2 uppercase w-24">Total</th>
            </tr>
          </thead>
          <tbody>
            {orc.itens.map(item => (
              <tr key={item.id} className="border-b border-slate-50">
                <td className="py-3">
                  <p className="font-medium text-slate-800">{item.produto_nome}</p>
                  <p className="text-[11px] text-slate-400 font-mono">{item.codigo}</p>
                </td>
                <td className="text-center py-3 text-slate-600">{item.quantidade}</td>
                <td className="text-center py-3 text-slate-500 text-[11px]">{item.unidade}</td>
                <td className="text-right py-3 text-slate-600 font-mono text-xs">{BRL(item.preco_unitario)}</td>
                <td className="text-right py-3 text-slate-500 text-xs">{item.desconto_pct > 0 ? `${item.desconto_pct}%` : '—'}</td>
                <td className="text-right py-3 font-bold text-slate-800 font-mono text-xs">{BRL(item.total)}</td>
              </tr>
            ))}
            {orc.itens.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-slate-400 text-sm">Nenhum item no orçamento</td></tr>
            )}
          </tbody>
        </table>
        <div className="mt-4 space-y-1.5 border-t border-slate-200 pt-3">
          <div className="flex justify-between text-sm text-slate-600"><span>Subtotal</span><span className="font-mono">{BRL(subtotal)}</span></div>
          {orc.desconto_global_pct > 0 && <div className="flex justify-between text-sm text-red-600"><span>Desconto global ({orc.desconto_global_pct}%)</span><span className="font-mono">− {BRL(descGlobal)}</span></div>}
          {orc.frete > 0 && <div className="flex justify-between text-sm text-slate-600"><span>Frete</span><span className="font-mono">{BRL(orc.frete)}</span></div>}
          <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-200 pt-2 mt-2">
            <span>TOTAL</span><span className="font-mono text-purple-700">{BRL(orc.total)}</span>
          </div>
        </div>
        <div className="mt-4 bg-slate-50 rounded-lg px-4 py-3">
          <p className="text-[11px] text-slate-400 uppercase tracking-wide font-semibold mb-1">Condição de pagamento</p>
          <p className="text-sm font-medium text-slate-700">{orc.condicao_pagamento}</p>
        </div>
      </div>
    </div>
  );
}

// ── Aba Análise IA ─────────────────────────────────────────────────────────────
function TabAnalise({ data }: { data: NegociacaoData }) {
  const analises = data.atendimentos.filter(a => a.analise).sort((a, b) => b.data.localeCompare(a.data));
  const latest   = analises[0]?.analise;
  if (!latest) return (
    <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6">
      <Brain className="w-10 h-10 text-slate-200 mb-3" />
      <p className="font-semibold text-slate-600">Sem análise de IA</p>
      <p className="text-sm text-slate-400 mt-1 max-w-xs">Realize um atendimento via Escuta Inteligente e vincule esta negociação para gerar análise automaticamente.</p>
    </div>
  );
  return (
    <div className="p-5 space-y-4 overflow-y-auto h-full custom-scrollbar">
      <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
        <Brain className="w-3.5 h-3.5" />
        {analises.length} atendimento{analises.length > 1 ? 's' : ''} · Última análise: {fmtDate(analises[0].data)}
      </p>
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-purple-50 rounded-xl p-3 text-center">
          <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Perfil</p>
          <p className="text-sm font-bold text-purple-700">{latest.perfil}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 text-center">
          <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Temperatura</p>
          <p className={`text-sm font-bold ${TEMP_COLOR[latest.temperatura] ?? 'text-slate-600'}`}>
            {TEMP_LABEL[latest.temperatura] ?? latest.temperatura}
          </p>
        </div>
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Probabilidade</p>
          <p className="text-sm font-bold text-green-700">{latest.probabilidade_fechamento}%</p>
        </div>
      </div>
      <div>
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Resumo</p>
        <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-4 leading-relaxed">{latest.resumo}</p>
      </div>
      {latest.necessidades.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Necessidades</p>
          <div className="flex flex-wrap gap-1.5">
            {latest.necessidades.map((n, i) => <span key={i} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full">{n}</span>)}
          </div>
        </div>
      )}
      {latest.produtos_mencionados.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Produtos Mencionados</p>
          <div className="space-y-1.5">
            {latest.produtos_mencionados.map((p, i) => (
              <div key={i} className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                <Package className="w-3.5 h-3.5 text-green-600 shrink-0" />
                <span className="text-sm text-green-800">{p}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {latest.objecoes.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Objeções</p>
          <div className="space-y-1.5">
            {latest.objecoes.map((o, i) => (
              <div key={i} className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                <span className="text-sm text-red-700">{o}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {latest.observacoes && (
        <div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Observações da IA</p>
          <p className="text-sm text-slate-600 italic bg-amber-50 border border-amber-100 rounded-lg p-3">{latest.observacoes}</p>
        </div>
      )}
    </div>
  );
}

// ── Aba Transcrições ───────────────────────────────────────────────────────────
function TabTranscricoes({ data }: { data: NegociacaoData }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setExpanded(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const sorted = [...data.atendimentos].sort((a, b) => b.data.localeCompare(a.data));

  if (sorted.length === 0) return (
    <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6">
      <Mic className="w-10 h-10 text-slate-200 mb-3" />
      <p className="font-semibold text-slate-600">Nenhum atendimento registrado</p>
      <p className="text-sm text-slate-400 mt-1 max-w-xs">Use a Escuta Inteligente e vincule esta negociação para registrar atendimentos com transcrição.</p>
    </div>
  );

  return (
    <div className="p-4 space-y-3 overflow-y-auto h-full custom-scrollbar">
      {sorted.map(at => {
        const isOpen = expanded.has(at.id);
        return (
          <div key={at.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <button onClick={() => toggle(at.id)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                <Mic className="w-4 h-4 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-800">{fmtDate(at.data)} às {at.hora}</p>
                  <span className="text-xs text-slate-400">· {fmtDur(at.duracao)}</span>
                </div>
                {at.analise && <p className="text-xs text-slate-500 truncate mt-0.5">{at.analise.resumo}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {at.analise && <span className={`text-xs font-semibold ${TEMP_COLOR[at.analise.temperatura] ?? ''}`}>{TEMP_LABEL[at.analise.temperatura] ?? at.analise.temperatura}</span>}
                {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </button>
            {isOpen && (
              <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-3">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                  <MessageSquare className="w-3 h-3" /> Transcrição — {at.transcricao.length} linhas
                </p>
                <div className="space-y-1.5">
                  {at.transcricao.map((line, i) => (
                    <div key={i} className="flex gap-2 bg-white rounded-lg px-3 py-2 border border-slate-100">
                      <span className="text-[10px] font-mono text-slate-400 shrink-0 mt-0.5">
                        {String(Math.floor(line.ts / 60)).padStart(2, '0')}:{String(line.ts % 60).padStart(2, '0')}
                      </span>
                      <span className="text-xs text-slate-700 leading-relaxed">{line.text}</span>
                    </div>
                  ))}
                </div>
                {at.analise && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="bg-white rounded-lg p-3 border border-slate-100">
                      <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Perfil</p>
                      <p className="text-sm font-bold text-purple-700">{at.analise.perfil}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-slate-100">
                      <p className="text-[10px] text-slate-400 uppercase font-semibold mb-1">Sentimento</p>
                      <p className="text-sm font-bold text-slate-700 capitalize">{at.analise.sentimento}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Aba Compromissos ───────────────────────────────────────────────────────────
function TabCompromissos({ data, onRefresh }: { data: NegociacaoData; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [ver, setVer]           = useState(0);
  const [form, setForm]         = useState({
    titulo: '', tipo: 'reuniao' as CompromissoTipo,
    data: '', hora: '09:00', duracao: 60, notas: '',
  });

  const sorted = [...data.compromissos].sort((a, b) => a.data.localeCompare(b.data));
  void ver;

  const handleToggle = (id: string) => { toggleCompromissoConcluido(id); setVer(v => v + 1); onRefresh(); };

  const handleCreate = useCallback(() => {
    if (!form.titulo || !form.data) return;
    addCompromisso(data.negociacao.id, {
      clienteNome: data.negociacao.clienteNome,
      titulo: form.titulo, tipo: form.tipo, data: form.data,
      hora: form.hora, duracao: form.duracao, notas: form.notas,
      criado_por: 'usuario', concluido: false,
    });
    setForm({ titulo: '', tipo: 'reuniao', data: '', hora: '09:00', duracao: 60, notas: '' });
    setShowForm(false);
    onRefresh();
  }, [form, data, onRefresh]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between shrink-0">
        <span className="text-xs text-slate-500">{sorted.length} compromisso{sorted.length !== 1 ? 's' : ''}</span>
        <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-1.5 text-xs font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg transition-colors">
          <Plus className="w-3.5 h-3.5" /> Novo Compromisso
        </button>
      </div>

      {showForm && (
        <div className="bg-purple-50 border-b border-purple-100 p-4 space-y-2 shrink-0">
          <p className="text-xs font-semibold text-purple-700">Novo Compromisso</p>
          <div className="grid grid-cols-2 gap-2">
            <input className="col-span-2 border border-purple-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 placeholder-slate-400" placeholder="Título *" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
            <select className="border border-purple-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as CompromissoTipo }))}>
              {(Object.keys(COMP_CFG) as CompromissoTipo[]).map(t => <option key={t} value={t}>{COMP_CFG[t].label}</option>)}
            </select>
            <input type="number" min={5} max={480} className="border border-purple-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400" placeholder="Duração (min)" value={form.duracao} onChange={e => setForm(f => ({ ...f, duracao: +e.target.value }))} />
            <input type="date" className="border border-purple-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
            <input type="time" className="border border-purple-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400" value={form.hora} onChange={e => setForm(f => ({ ...f, hora: e.target.value }))} />
            <textarea rows={2} className="col-span-2 border border-purple-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none placeholder-slate-400" placeholder="Notas" value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5">
              <Check className="w-4 h-4" /> Salvar
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
        {sorted.length === 0 ? (
          <div className="text-center py-12 text-slate-400"><Clock className="w-8 h-8 mx-auto mb-2 opacity-20" /><p className="text-sm">Nenhum compromisso</p></div>
        ) : sorted.map(comp => {
          const cfg = COMP_CFG[comp.tipo];
          return (
            <div key={comp.id} className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${comp.concluido ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-slate-200'}`}>
              <button onClick={() => handleToggle(comp.id)} className="mt-0.5 shrink-0">
                {comp.concluido ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Circle className="w-5 h-5 text-slate-300 hover:text-purple-500 transition-colors" />}
              </button>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg}`}>
                <cfg.Icon className={`w-4 h-4 ${cfg.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${comp.concluido ? 'line-through text-slate-400' : 'text-slate-800'}`}>{comp.titulo}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs text-slate-500">{fmtDate(comp.data)} às {comp.hora}</span>
                  <span className="text-xs text-slate-400">· {comp.duracao}min</span>
                  {comp.criado_por === 'ia' && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-semibold">✦ IA</span>}
                </div>
                {comp.notas && <p className="text-xs text-slate-500 mt-1 truncate">{comp.notas}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Detalhe da negociação ──────────────────────────────────────────────────────
type TabId = 'dados' | 'orcamento' | 'analise' | 'transcricoes' | 'compromissos';

function NegociacaoDetail({ data, onRefresh }: { data: NegociacaoData; onRefresh: () => void }) {
  const hasOrc = !!data.orcamento;
  const tabs: { id: TabId; label: string; Icon: typeof Briefcase }[] = [
    { id: 'dados',        label: 'Dados',         Icon: Building2 },
    ...(hasOrc ? [{ id: 'orcamento' as TabId, label: 'Orçamento', Icon: FileText }] : []),
    { id: 'analise',      label: 'Análise IA',    Icon: Brain     },
    { id: 'transcricoes', label: 'Transcrições',  Icon: Mic       },
    { id: 'compromissos', label: 'Compromissos',  Icon: Clock     },
  ];
  const [activeTab, setActiveTab] = useState<TabId>('dados');
  const validTab = tabs.find(t => t.id === activeTab) ? activeTab : 'dados';
  const n = data.negociacao;

  const handleCreateOrc = () => {
    setOrcamento(n.id, { status: 'rascunho', condicao_pagamento: 'A combinar', desconto_global_pct: 0, frete: 0, itens: [], total: 0, dataCriacao: new Date().toISOString().split('T')[0], criado_por: 'usuario' });
    onRefresh();
    setActiveTab('orcamento');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Cabeçalho */}
      <div className="px-5 py-3.5 border-b border-slate-200 shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-mono text-slate-400">{n.id}</p>
            <p className="text-base font-bold text-slate-900 truncate">{n.clienteNome}</p>
            {n.descricao && <p className="text-xs text-slate-500 truncate mt-0.5">{n.descricao}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {n.probabilidade !== undefined && <span className="text-sm font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-lg">{n.probabilidade}%</span>}
            {n.valor_estimado && <span className="text-sm font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg">{BRL(n.valor_estimado)}</span>}
          </div>
        </div>
        {/* Tabs */}
        <div className="flex items-center gap-0.5 mt-3 -mb-3.5">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${validTab === tab.id ? 'text-purple-700 border-purple-600 bg-purple-50' : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'}`}
            >
              <tab.Icon className="w-3.5 h-3.5" />{tab.label}
              {tab.id === 'compromissos' && data.compromissos.filter(c => !c.concluido).length > 0 && (
                <span className="bg-purple-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">{data.compromissos.filter(c => !c.concluido).length}</span>
              )}
              {tab.id === 'transcricoes' && data.atendimentos.length > 0 && (
                <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">{data.atendimentos.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {validTab === 'dados'        && <TabDados data={data} />}
        {validTab === 'orcamento'    && hasOrc && <TabOrcamento data={data} />}
        {validTab === 'analise'      && <TabAnalise data={data} />}
        {validTab === 'transcricoes' && <TabTranscricoes data={data} />}
        {validTab === 'compromissos' && <TabCompromissos data={data} onRefresh={onRefresh} />}
      </div>

      {!hasOrc && (
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 shrink-0">
          <button onClick={handleCreateOrc} className="flex items-center gap-2 text-xs font-semibold text-purple-600 hover:text-purple-700 bg-white border border-purple-200 hover:bg-purple-50 px-4 py-2 rounded-lg transition-colors">
            <Plus className="w-3.5 h-3.5" /> Criar Orçamento para esta Negociação
          </button>
        </div>
      )}
    </div>
  );
}

// ── Modal nova negociação ──────────────────────────────────────────────────────
function NovaModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [form, setForm] = useState({
    clienteNome: '', clienteCnpj: '', clienteEmail: '', clienteTelefone: '', clienteEndereco: '',
    descricao: '', etapa: 'prospeccao' as NegociacaoEtapa,
    valor_estimado: '', probabilidade: '50', responsavel: '', origem: '', dataFechamentoPrev: '', notas: '',
  });
  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleCreate = () => {
    if (!form.clienteNome.trim()) return;
    const data = createNegociacao({
      clienteNome: form.clienteNome.trim(),
      clienteCnpj: form.clienteCnpj || undefined, clienteEmail: form.clienteEmail || undefined,
      clienteTelefone: form.clienteTelefone || undefined, clienteEndereco: form.clienteEndereco || undefined,
      descricao: form.descricao || undefined, status: 'aberta', etapa: form.etapa,
      valor_estimado: form.valor_estimado ? Number(form.valor_estimado) : undefined,
      probabilidade: Number(form.probabilidade), responsavel: form.responsavel,
      origem: form.origem || undefined, dataFechamentoPrev: form.dataFechamentoPrev || undefined, notas: form.notas || undefined,
    });
    onCreated(data.negociacao.id);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scrollbar" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 p-5 border-b border-slate-100">
          <Briefcase className="w-5 h-5 text-purple-600" />
          <h2 className="font-bold text-slate-800">Nova Negociação</h2>
          <button onClick={onClose} className="ml-auto text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Dados do cliente</p>
            <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" placeholder="Nome / Razão Social *" value={form.clienteNome} onChange={f('clienteNome')} />
            <div className="grid grid-cols-2 gap-2">
              <input className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" placeholder="CNPJ" value={form.clienteCnpj} onChange={f('clienteCnpj')} />
              <input className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" placeholder="Telefone" value={form.clienteTelefone} onChange={f('clienteTelefone')} />
            </div>
            <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" placeholder="E-mail" value={form.clienteEmail} onChange={f('clienteEmail')} />
            <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" placeholder="Endereço" value={form.clienteEndereco} onChange={f('clienteEndereco')} />
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Negociação</p>
            <input className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" placeholder="Descrição" value={form.descricao} onChange={f('descricao')} />
            <div className="grid grid-cols-2 gap-2">
              <select className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" value={form.etapa} onChange={f('etapa')}>
                {(Object.keys(ETAPA_CFG) as NegociacaoEtapa[]).map(e => <option key={e} value={e}>{ETAPA_CFG[e].label}</option>)}
              </select>
              <input type="number" className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" placeholder="Valor estimado (R$)" value={form.valor_estimado} onChange={f('valor_estimado')} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" placeholder="Responsável" value={form.responsavel} onChange={f('responsavel')} />
              <input className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" placeholder="Origem" value={form.origem} onChange={f('origem')} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" value={form.dataFechamentoPrev} onChange={f('dataFechamentoPrev')} />
              <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2.5">
                <input type="number" min={0} max={100} className="flex-1 text-sm focus:outline-none" placeholder="Probabilidade" value={form.probabilidade} onChange={f('probabilidade')} />
                <span className="text-xs text-slate-400">%</span>
              </div>
            </div>
            <textarea rows={2} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none" placeholder="Notas internas" value={form.notas} onChange={f('notas')} />
          </div>
        </div>
        <div className="flex gap-2 p-5 border-t border-slate-100">
          <button onClick={handleCreate} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
            <Check className="w-4 h-4" /> Criar Negociação
          </button>
          <button onClick={onClose} className="px-5 py-2.5 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function CRMNegociacoes() {
  const [all, setAll]                   = useState(getAllNegociacoes());
  const [selectedId, setSelectedId]     = useState<string | null>('neg-001');
  const [search, setSearch]             = useState('');
  const [filterStatus, setFilterStatus] = useState<NegociacaoStatus | 'todas'>('todas');
  const [showCreate, setShowCreate]     = useState(false);

  const refresh = useCallback(() => setAll(getAllNegociacoes()), []);

  const filtered = all.filter(d => {
    if (filterStatus !== 'todas' && d.negociacao.status !== filterStatus) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return d.negociacao.clienteNome.toLowerCase().includes(q) || d.negociacao.descricao?.toLowerCase().includes(q) || d.negociacao.id.toLowerCase().includes(q);
  });

  const selected = selectedId ? all.find(d => d.negociacao.id === selectedId) ?? null : null;

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Lista (esquerda) ── */}
      <div className="w-80 flex flex-col border-r border-slate-200 bg-white shrink-0">
        <div className="px-4 py-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-purple-600" /> Negociações
              <span className="text-xs font-normal text-slate-400">({filtered.length})</span>
            </h2>
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 text-xs font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 px-2.5 py-1.5 rounded-lg transition-colors">
              <Plus className="w-3.5 h-3.5" /> Nova
            </button>
          </div>
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-400" placeholder="Buscar cliente, ID..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {(['todas', 'aberta', 'ganha', 'perdida', 'suspensa'] as const).map(s => (
              <button key={s} onClick={() => setFilterStatus(s)} className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap transition-colors shrink-0 ${filterStatus === s ? 'bg-purple-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                {s === 'todas' ? 'Todas' : STATUS_CFG[s].label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-slate-400"><Briefcase className="w-8 h-8 mx-auto mb-2 opacity-20" /><p className="text-sm">Nenhuma negociação</p></div>
          ) : filtered.map(d => {
            const n  = d.negociacao;
            const sc = STATUS_CFG[n.status];
            const pendComp = d.compromissos.filter(c => !c.concluido).length;
            const isSelected = n.id === selectedId;
            return (
              <button key={n.id} onClick={() => setSelectedId(n.id)} className={`w-full text-left p-3 rounded-xl transition-colors border ${isSelected ? 'bg-purple-50 border-purple-200' : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'}`}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-[11px] font-mono text-slate-400">{n.id}</p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sc.bg} ${sc.color} shrink-0`}>{sc.label}</span>
                </div>
                <p className="text-sm font-semibold text-slate-800 leading-tight truncate">{n.clienteNome}</p>
                {n.descricao && <p className="text-xs text-slate-500 truncate mt-0.5">{n.descricao}</p>}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-xs text-slate-400">{ETAPA_CFG[n.etapa].label}</span>
                  {n.valor_estimado && <span className="text-xs font-semibold text-purple-600">{BRL(n.valor_estimado)}</span>}
                  {n.probabilidade !== undefined && <span className="text-xs text-green-600 font-semibold">{n.probabilidade}%</span>}
                  {pendComp > 0 && <span className="ml-auto text-[10px] bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-full">{pendComp} ativo{pendComp > 1 ? 's' : ''}</span>}
                </div>
                {d.orcamento && (
                  <div className="mt-1 flex items-center gap-1 text-[10px] text-blue-600">
                    <FileText className="w-3 h-3" />Orçamento {ORC_STATUS_CFG[d.orcamento.status].label} · {BRL(d.orcamento.total)}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Detalhe (direita) ── */}
      <div className="flex-1 overflow-hidden bg-slate-50">
        {selected ? (
          <NegociacaoDetail key={selected.negociacao.id} data={selected} onRefresh={refresh} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mb-4">
              <Briefcase className="w-8 h-8 text-purple-300" />
            </div>
            <p className="font-semibold text-slate-600">Selecione uma negociação</p>
            <p className="text-sm text-slate-400 mt-1">Escolha uma negociação na lista para ver os detalhes</p>
            <button onClick={() => setShowCreate(true)} className="mt-4 flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors">
              <Plus className="w-4 h-4" /> Nova Negociação
            </button>
          </div>
        )}
      </div>

      {showCreate && (
        <NovaModal onClose={() => setShowCreate(false)} onCreated={id => { refresh(); setSelectedId(id); setShowCreate(false); }} />
      )}
    </div>
  );
}
