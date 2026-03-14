// ─────────────────────────────────────────────────────────────────────────────
// CRM Pipeline — Kanban de Negociações com drag & drop
// Usa crm_negociacoes + etapas fixas mapeadas em cores dinâmicas
// Click → abre modal de detalhe · Drag → muda etapa · Etapa muda → trigger atividade
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState, useRef, useCallback } from 'react';
import {
  RefreshCw, DollarSign, Calendar, Building2, Plus, X, Check,
  Loader2, GripVertical, Zap, Video, PhoneCall, Navigation, ListTodo,
  ChevronRight, User, Mail, Phone, MapPin, FileText, TrendingUp, MessageCircle,
} from 'lucide-react';
import {
  getAllNegociacoes, updateNegociacao, addCompromisso,
  type NegociacaoData, type NegociacaoEtapa, type CompromissoTipo,
} from '../data/crmData';

// ── Configurações de etapa ────────────────────────────────────────────────────

interface EtapaCfg {
  label: string;
  color: string;
  bg: string;
  border: string;
  dot: string;
  headerBg: string;
  order: number;
}

const ETAPAS: Record<NegociacaoEtapa, EtapaCfg> = {
  prospeccao:   { label: 'Prospecção',   color: 'text-slate-700',   bg: 'bg-slate-50',    border: 'border-slate-200',  dot: 'bg-slate-400',   headerBg: 'bg-slate-100',  order: 1 },
  qualificacao: { label: 'Qualificação', color: 'text-violet-700',  bg: 'bg-violet-50',   border: 'border-violet-200', dot: 'bg-violet-500',  headerBg: 'bg-violet-100', order: 2 },
  proposta:     { label: 'Proposta',     color: 'text-blue-700',    bg: 'bg-blue-50',     border: 'border-blue-200',   dot: 'bg-blue-500',    headerBg: 'bg-blue-100',   order: 3 },
  negociacao:   { label: 'Negociação',   color: 'text-amber-700',   bg: 'bg-amber-50',    border: 'border-amber-200',  dot: 'bg-amber-500',   headerBg: 'bg-amber-100',  order: 4 },
  fechamento:   { label: 'Fechamento',   color: 'text-emerald-700', bg: 'bg-emerald-50',  border: 'border-emerald-200',dot: 'bg-emerald-500', headerBg: 'bg-emerald-100',order: 5 },
};

const ETAPA_ORDER: NegociacaoEtapa[] = ['prospeccao', 'qualificacao', 'proposta', 'negociacao', 'fechamento'];

const BRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

const fmtDate = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

// ── Modal de Detalhe da Negociação ────────────────────────────────────────────

function NegociacaoModal({
  data,
  onClose,
}: {
  data: NegociacaoData;
  onClose: () => void;
}) {
  const n = data.negociacao;
  const orc = data.orcamento;
  const etapa = ETAPAS[n.etapa];
  const status_labels: Record<string, { label: string; color: string }> = {
    aberta:   { label: 'Aberta',   color: 'bg-blue-100 text-blue-700'   },
    ganha:    { label: 'Ganha',    color: 'bg-green-100 text-green-700' },
    perdida:  { label: 'Perdida',  color: 'bg-red-100 text-red-700'     },
    suspensa: { label: 'Suspensa', color: 'bg-amber-100 text-amber-700' },
  };
  const sc = status_labels[n.status] ?? status_labels.aberta;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${sc.color}`}>{sc.label}</span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${etapa.bg} ${etapa.color}`}>
                {etapa.label}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900">{n.clienteNome}</h2>
            {n.descricao && <p className="text-sm text-slate-500 mt-0.5">{n.descricao}</p>}
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 ml-4 flex-shrink-0">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Dados do cliente */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Cliente</p>
            <div className="flex items-center gap-2 text-sm text-slate-700">
              <Building2 className="w-4 h-4 text-purple-500 shrink-0" />
              <span className="font-semibold">{n.clienteNome}</span>
              {n.clienteCnpj && <span className="text-slate-400 text-xs">CNPJ: {n.clienteCnpj}</span>}
            </div>
            {n.clienteEmail    && <div className="flex items-center gap-2 text-sm text-slate-600"><Mail    className="w-3.5 h-3.5 text-slate-400" />{n.clienteEmail}</div>}
            {n.clienteTelefone && (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{n.clienteTelefone}</span>
                <a
                  href={`https://wa.me/55${n.clienteTelefone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-1 text-xs font-semibold text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 px-2 py-0.5 rounded-lg transition-all"
                >
                  <MessageCircle className="w-3 h-3" /> WhatsApp
                </a>
              </div>
            )}
            {n.clienteEndereco && <div className="flex items-center gap-2 text-sm text-slate-600"><MapPin  className="w-3.5 h-3.5 text-slate-400 shrink-0" />{n.clienteEndereco}</div>}
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-emerald-50 rounded-xl p-3 text-center">
              <DollarSign className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
              <p className="text-xs text-slate-500">Valor</p>
              <p className="text-sm font-bold text-slate-800">{BRL(n.valor_estimado ?? 0)}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <TrendingUp className="w-4 h-4 text-blue-600 mx-auto mb-1" />
              <p className="text-xs text-slate-500">Probabilidade</p>
              <p className="text-sm font-bold text-slate-800">{n.probabilidade ?? 50}%</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <User className="w-4 h-4 text-slate-500 mx-auto mb-1" />
              <p className="text-xs text-slate-500">Responsável</p>
              <p className="text-sm font-bold text-slate-800 truncate">{n.responsavel || '—'}</p>
            </div>
          </div>

          {/* Funil de etapas */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Etapa atual</p>
            <div className="flex items-center gap-1 flex-wrap">
              {ETAPA_ORDER.map((e, i) => {
                const cfg = ETAPAS[e];
                const active = e === n.etapa;
                const done   = ETAPAS[e].order < ETAPAS[n.etapa].order;
                return (
                  <div key={e} className="flex items-center gap-1">
                    {i > 0 && <ChevronRight className="w-3 h-3 text-slate-300" />}
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${active ? `${cfg.bg} ${cfg.color} ring-2 ring-offset-1` : done ? 'bg-slate-100 text-slate-500' : 'text-slate-300'}`}>
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Orçamento */}
          {orc && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" /> Orçamento {orc.numero ? `#${orc.numero}` : ''}
                </p>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  orc.status === 'aprovado' ? 'bg-green-100 text-green-700' :
                  orc.status === 'recusado' ? 'bg-red-100 text-red-700' :
                  orc.status === 'enviado' ? 'bg-blue-100 text-blue-700' :
                  'bg-slate-100 text-slate-600'
                }`}>{orc.status}</span>
              </div>
              <p className="text-lg font-bold text-emerald-700">{BRL(orc.total)}</p>
              <p className="text-xs text-emerald-600 mt-1">{orc.itens.length} item(ns) · {orc.condicao_pagamento}</p>
            </div>
          )}

          {/* Compromissos */}
          {data.compromissos.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Compromissos ({data.compromissos.length})</p>
              <div className="space-y-2">
                {data.compromissos.slice(0, 3).map(c => (
                  <div key={c.id} className={`flex items-center gap-3 p-2.5 rounded-lg ${c.concluido ? 'bg-slate-50 opacity-60' : 'bg-white border border-slate-100'}`}>
                    <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center">
                      <Calendar className="w-3 h-3 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium ${c.concluido ? 'line-through text-slate-400' : 'text-slate-700'}`}>{c.titulo}</p>
                      <p className="text-[11px] text-slate-400">{fmtDate(c.data)} às {c.hora}</p>
                    </div>
                    {c.concluido && <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notas */}
          {n.notas && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
              <p className="text-xs font-semibold text-amber-700 mb-1">Notas</p>
              <p className="text-sm text-amber-800">{n.notas}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Modal de trigger de atividade ─────────────────────────────────────────────

const ACTIVITY_TYPES: { id: CompromissoTipo; label: string; Icon: typeof Calendar }[] = [
  { id: 'reuniao',  label: 'Reunião',   Icon: Video     },
  { id: 'ligacao',  label: 'Ligação',   Icon: PhoneCall },
  { id: 'visita',   label: 'Visita',    Icon: Navigation},
  { id: 'followup', label: 'Follow-up', Icon: ListTodo  },
];

function TriggerModal({
  negData,
  novaEtapa,
  onConfirm,
  onSkip,
}: {
  negData: NegociacaoData;
  novaEtapa: NegociacaoEtapa;
  onConfirm: () => void;
  onSkip: () => void;
}) {
  const [tipo, setTipo]   = useState<CompromissoTipo>('reuniao');
  const [titulo, setTitulo] = useState('');
  const [data, setData]   = useState(new Date().toISOString().split('T')[0]);
  const [hora, setHora]   = useState('09:00');
  const [saving, setSaving] = useState(false);
  const etapaCfg = ETAPAS[novaEtapa];

  async function handleCreate() {
    if (!titulo.trim()) return;
    setSaving(true);
    try {
      await addCompromisso(negData.negociacao.id, {
        clienteNome: negData.negociacao.clienteNome,
        titulo: titulo.trim(),
        data,
        hora,
        duracao: 30,
        tipo,
        notas: `Atividade disparada ao entrar na etapa: ${etapaCfg.label}`,
        criado_por: 'usuario',
        concluido: false,
      });
      onConfirm();
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${etapaCfg.bg} flex items-center justify-center`}>
              <Zap className={`w-5 h-5 ${etapaCfg.color}`} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Disparar Atividade</h3>
              <p className="text-xs text-slate-500">Negociação entrou em <strong>{etapaCfg.label}</strong></p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {ACTIVITY_TYPES.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setTipo(id)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center ${tipo === id ? 'border-purple-600 bg-purple-50' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <Icon className={`w-4 h-4 ${tipo === id ? 'text-purple-600' : 'text-slate-400'}`} />
                <span className={`text-[10px] font-medium ${tipo === id ? 'text-purple-700' : 'text-slate-500'}`}>{label}</span>
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Título *</label>
            <input
              autoFocus
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Ex: Apresentação de proposta"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Data</label>
              <input type="date" value={data} onChange={e => setData(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Hora</label>
              <input type="time" value={hora} onChange={e => setHora(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onSkip} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">
            Pular
          </button>
          <div className="flex-1" />
          <button
            onClick={handleCreate}
            disabled={!titulo.trim() || saving}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-sm font-semibold"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Criar Atividade
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente Principal ──────────────────────────────────────────────────────

export default function CRMPipeline() {
  const [items, setItems]         = useState<NegociacaoData[]>([]);
  const [loading, setLoading]     = useState(true);
  const [openDetail, setOpenDetail] = useState<NegociacaoData | null>(null);
  const [dragId, setDragId]       = useState<string | null>(null);
  const [dragOver, setDragOver]   = useState<NegociacaoEtapa | null>(null);
  const [trigger, setTrigger]     = useState<{ data: NegociacaoData; novaEtapa: NegociacaoEtapa } | null>(null);
  const [moving, setMoving]       = useState<string | null>(null);

  const pendingMove = useRef<{ id: string; etapa: NegociacaoEtapa } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setItems(await getAllNegociacoes()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function doMove(id: string, novaEtapa: NegociacaoEtapa) {
    setMoving(id);
    try {
      await updateNegociacao(id, { etapa: novaEtapa });
      setItems(prev => prev.map(d =>
        d.negociacao.id === id ? { ...d, negociacao: { ...d.negociacao, etapa: novaEtapa } } : d,
      ));
    } finally {
      setMoving(null);
    }
  }

  // Drag handlers
  function onDragStart(e: React.DragEvent, id: string) {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
  }
  function onDragEnd() { setDragId(null); setDragOver(null); }
  function onDragOver(e: React.DragEvent, etapa: NegociacaoEtapa) {
    e.preventDefault();
    setDragOver(etapa);
  }
  function onDrop(e: React.DragEvent, etapa: NegociacaoEtapa) {
    e.preventDefault();
    setDragOver(null);
    if (!dragId) return;
    const neg = items.find(d => d.negociacao.id === dragId);
    if (!neg || neg.negociacao.etapa === etapa) { setDragId(null); return; }
    pendingMove.current = { id: dragId, etapa };
    setTrigger({ data: neg, novaEtapa: etapa });
    setDragId(null);
  }

  async function handleTriggerConfirm() {
    if (pendingMove.current) {
      await doMove(pendingMove.current.id, pendingMove.current.etapa);
      pendingMove.current = null;
    }
    setTrigger(null);
  }
  async function handleTriggerSkip() {
    if (pendingMove.current) {
      await doMove(pendingMove.current.id, pendingMove.current.etapa);
      pendingMove.current = null;
    }
    setTrigger(null);
  }

  const byEtapa = (e: NegociacaoEtapa) => items.filter(d => d.negociacao.etapa === e);
  const totalEtapa = (e: NegociacaoEtapa) =>
    items.filter(d => d.negociacao.etapa === e).reduce((s, d) => s + (d.negociacao.valor_estimado ?? 0), 0);
  const totalGeral = items.reduce((s, d) => s + (d.negociacao.valor_estimado ?? 0), 0);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Carregando pipeline…
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col h-full">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Funil de Negociações</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {items.length} negociação(ões) · {BRL(totalGeral)} total no pipeline
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm"
        >
          <RefreshCw className="w-4 h-4" /> Atualizar
        </button>
      </div>

      {/* Kanban */}
      <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
        {ETAPA_ORDER.map(etapa => {
          const cfg   = ETAPAS[etapa];
          const cards = byEtapa(etapa);
          const total = totalEtapa(etapa);
          const isOver = dragOver === etapa;

          return (
            <div
              key={etapa}
              className="flex-shrink-0 w-72 flex flex-col"
              onDragOver={e => onDragOver(e, etapa)}
              onDrop={e => onDrop(e, etapa)}
            >
              {/* Header da coluna */}
              <div className={`rounded-t-xl px-4 py-3 ${cfg.headerBg} border ${cfg.border} border-b-0`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                    <span className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</span>
                  </div>
                  <span className="text-xs font-bold bg-white/70 px-2 py-0.5 rounded-full text-slate-600">
                    {cards.length}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 font-medium">{BRL(total)}</p>
              </div>

              {/* Cards */}
              <div className={`flex-1 rounded-b-xl border ${cfg.border} ${isOver ? 'bg-purple-50/60' : 'bg-white'} p-2 space-y-2 min-h-32 overflow-y-auto custom-scrollbar transition-colors`}>
                {cards.length === 0 && (
                  <div className={`flex items-center justify-center h-16 text-xs ${isOver ? 'text-purple-400 font-medium' : 'text-slate-300'}`}>
                    {isOver ? 'Soltar aqui' : 'Nenhuma negociação'}
                  </div>
                )}
                {cards.map(d => {
                  const n = d.negociacao;
                  const iniciais = n.clienteNome.split(' ').slice(0, 2).map(x => x[0]).join('').toUpperCase();
                  const isMoving = moving === n.id;
                  const isDragging = dragId === n.id;
                  return (
                    <div
                      key={n.id}
                      draggable
                      onDragStart={e => onDragStart(e, n.id)}
                      onDragEnd={onDragEnd}
                      onClick={() => setOpenDetail(d)}
                      className={`bg-white rounded-xl border border-slate-200 p-3 shadow-sm hover:shadow-md transition-all cursor-pointer select-none ${isDragging ? 'opacity-40 scale-95' : ''} ${isMoving ? 'opacity-60' : ''}`}
                    >
                      {/* Drag handle + cliente */}
                      <div className="flex items-center gap-2 mb-2">
                        <GripVertical className="w-3 h-3 text-slate-300 shrink-0 cursor-grab" />
                        <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                          {iniciais}
                        </div>
                        <p className="text-sm font-semibold text-slate-800 truncate flex-1">{n.clienteNome}</p>
                        {isMoving && <Loader2 className="w-3 h-3 animate-spin text-purple-500 shrink-0" />}
                      </div>

                      {/* Valor */}
                      <div className="flex items-center gap-1 text-sm font-bold text-slate-800 mb-2">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                        {BRL(n.valor_estimado ?? 0)}
                        {n.probabilidade != null && (
                          <span className="ml-auto text-[10px] font-normal text-slate-400">{n.probabilidade}%</span>
                        )}
                      </div>

                      {/* Meta */}
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {fmtDate(n.dataCriacao)}
                        </span>
                        {d.orcamento && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                            d.orcamento.status === 'aprovado' ? 'bg-green-100 text-green-600' :
                            d.orcamento.status === 'enviado'  ? 'bg-blue-100 text-blue-600' :
                            'bg-slate-100 text-slate-500'
                          }`}>Orç. {d.orcamento.status}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {items.length === 0 && !loading && (
        <div className="text-center py-12 text-slate-400">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma negociação registrada.</p>
          <p className="text-xs mt-1">Crie negociações na aba Negociações.</p>
        </div>
      )}

      {/* Modal de detalhe */}
      {openDetail && (
        <NegociacaoModal data={openDetail} onClose={() => setOpenDetail(null)} />
      )}

      {/* Modal de trigger */}
      {trigger && (
        <TriggerModal
          negData={trigger.data}
          novaEtapa={trigger.novaEtapa}
          onConfirm={handleTriggerConfirm}
          onSkip={handleTriggerSkip}
        />
      )}
    </div>
  );
}
