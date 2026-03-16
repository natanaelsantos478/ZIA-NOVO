// ─────────────────────────────────────────────────────────────────────────────
// CRM Pipeline — Kanban de Negociações com drag & drop
// Etapas carregadas de crm_funis + crm_funil_etapas (novo schema DB)
// Click → modal de detalhe · Drag → salva etapa_id no banco
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState, useRef, useCallback, lazy, Suspense } from 'react';
import {
  RefreshCw, DollarSign, Calendar, Building2, Plus, X, Check,
  Loader2, GripVertical, Zap, Video, PhoneCall, Navigation, ListTodo,
  ChevronRight, User, Mail, Phone, MapPin, FileText, TrendingUp,
  MessageCircle, Settings, ArrowRightLeft, ChevronDown,
} from 'lucide-react';
import {
  getAllNegociacoes, addCompromisso, getFunilPadrao, getCrmFunis,
  type NegociacaoData, type CompromissoTipo, type CrmFunil, type CrmFunilEtapa,
} from '../data/crmData';
import { supabase } from '../../../lib/supabase';
import { createPedido } from '../../../lib/erp';

const FunilEditorModal = lazy(() => import('./FunilEditorModal'));

// ── Helpers ───────────────────────────────────────────────────────────────────

const BRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

const fmtDate = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

/** Retorna classes Tailwind para o header de coluna baseado no tipo e cor hex */
function colHeaderClasses(etapa: CrmFunilEtapa): { headerBg: string; textColor: string; dotClass: string } {
  if (etapa.tipo === 'GANHA')   return { headerBg: 'bg-emerald-50 border-emerald-200', textColor: 'text-emerald-800', dotClass: 'bg-emerald-500' };
  if (etapa.tipo === 'PERDIDA') return { headerBg: 'bg-red-50 border-red-200',         textColor: 'text-red-800',     dotClass: 'bg-red-500'     };
  return { headerBg: 'bg-slate-50 border-slate-200', textColor: 'text-slate-700', dotClass: 'bg-slate-400' };
}

function colBodyClasses(etapa: CrmFunilEtapa, isOver: boolean): string {
  if (isOver) return 'bg-purple-50/70 border-purple-300';
  if (etapa.tipo === 'GANHA')   return 'bg-emerald-50/30 border-emerald-200';
  if (etapa.tipo === 'PERDIDA') return 'bg-red-50/30 border-red-200';
  return 'bg-white border-slate-200';
}

// ── Modal de Detalhe ──────────────────────────────────────────────────────────

function NegociacaoModal({
  data,
  funis,
  onClose,
  onFunilChanged,
}: {
  data: NegociacaoData;
  funis: CrmFunil[];
  onClose: () => void;
  onFunilChanged: (negId: string, funilId: string, etapaId: string, etapaSlug: string, prob: number) => void;
}) {
  const n = data.negociacao;
  const orc = data.orcamento;

  // Funil real da negociação: busca pelo funilId ou pega o primeiro disponível
  const funilAtual = funis.find(f => f.id === n.funilId) ?? funis[0] ?? null;

  // Etapa atual: busca pelo etapa_id dentro do funil real
  const etapaAtual = funilAtual?.etapas.find(e =>
    (n.etapaId && e.id === n.etapaId) || (!n.etapaId && e.slug === n.etapa),
  );

  // Estado para painel de transferência de funil
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferFunilId, setTransferFunilId] = useState(n.funilId ?? funis[0]?.id ?? '');
  const [transferEtapaId, setTransferEtapaId] = useState('');
  const [saving, setSaving] = useState(false);

  const transferFunil = funis.find(f => f.id === transferFunilId);

  // Ao mudar o funil destino, pré-seleciona a primeira etapa NORMAL
  useEffect(() => {
    if (!transferFunil) return;
    const primeira = transferFunil.etapas.find(e => e.tipo === 'NORMAL') ?? transferFunil.etapas[0];
    setTransferEtapaId(primeira?.id ?? '');
  }, [transferFunilId, transferFunil]);

  async function handleSaveTransfer() {
    if (!transferFunilId || !transferEtapaId || saving) return;
    const etapa = transferFunil?.etapas.find(e => e.id === transferEtapaId);
    if (!etapa) return;
    setSaving(true);
    try {
      await supabase.from('crm_negociacoes').update({
        funil_id:    transferFunilId,
        etapa_id:    transferEtapaId,
        etapa:       etapa.slug,
        probabilidade: etapa.probabilidade,
      }).eq('id', n.id);
      onFunilChanged(n.id, transferFunilId, transferEtapaId, etapa.slug, etapa.probabilidade);
      onClose();
    } finally {
      setSaving(false);
    }
  }

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
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${sc.color}`}>{sc.label}</span>
              {etapaAtual && (
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: etapaAtual.cor + '22', color: etapaAtual.cor, border: `1px solid ${etapaAtual.cor}44` }}
                >
                  {etapaAtual.icone ? `${etapaAtual.icone} ` : ''}{etapaAtual.nome}
                </span>
              )}
              {funilAtual && (
                <span className="text-xs text-slate-400 px-2 py-1 bg-slate-100 rounded-full">
                  {funilAtual.nome}
                </span>
              )}
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
              <p className="text-sm font-bold text-slate-800">{n.probabilidade ?? 0}%</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <User className="w-4 h-4 text-slate-500 mx-auto mb-1" />
              <p className="text-xs text-slate-500">Responsável</p>
              <p className="text-sm font-bold text-slate-800 truncate">{n.responsavel || '—'}</p>
            </div>
          </div>

          {/* Funil e etapas */}
          {funilAtual && funilAtual.etapas.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Funil: {funilAtual.nome}
                </p>
                {funis.length > 1 && (
                  <button
                    onClick={() => { setShowTransfer(v => !v); setTransferFunilId(n.funilId ?? funis[0]?.id ?? ''); }}
                    className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 font-medium"
                  >
                    <ArrowRightLeft className="w-3 h-3" />
                    Transferir para outro funil
                    <ChevronDown className={`w-3 h-3 transition-transform ${showTransfer ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>

              {/* Barra de progresso das etapas */}
              <div className="flex items-center gap-1 flex-wrap">
                {funilAtual.etapas.map((e, i) => {
                  const isActive = etapaAtual?.id === e.id;
                  const isDone   = etapaAtual && e.ordem < etapaAtual.ordem;
                  return (
                    <div key={e.id} className="flex items-center gap-1">
                      {i > 0 && <ChevronRight className="w-3 h-3 text-slate-300" />}
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full transition-all ${
                          isActive ? 'ring-2 ring-offset-1' :
                          isDone   ? 'bg-slate-100 text-slate-500' : 'text-slate-300'
                        }`}
                        style={isActive ? { backgroundColor: e.cor + '22', color: e.cor, outline: `2px solid ${e.cor}`, outlineOffset: '1px' } : undefined}
                      >
                        {e.icone ? `${e.icone} ` : ''}{e.nome}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Painel de transferência */}
              {showTransfer && (
                <div className="mt-3 p-4 bg-purple-50 border border-purple-200 rounded-xl space-y-3">
                  <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Transferir para funil</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Funil destino</label>
                      <select
                        value={transferFunilId}
                        onChange={e => setTransferFunilId(e.target.value)}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                      >
                        {funis.map(f => (
                          <option key={f.id} value={f.id}>{f.nome}{f.isPadrao ? ' (padrão)' : ''}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Etapa inicial</label>
                      <select
                        value={transferEtapaId}
                        onChange={e => setTransferEtapaId(e.target.value)}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                      >
                        {(transferFunil?.etapas ?? []).map(e => (
                          <option key={e.id} value={e.id}>{e.icone ? `${e.icone} ` : ''}{e.nome}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSaveTransfer}
                      disabled={saving || transferFunilId === n.funilId && transferEtapaId === n.etapaId}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
                    >
                      {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Confirmar transferência
                    </button>
                    <button
                      onClick={() => setShowTransfer(false)}
                      className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

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
  etapaNome,
  etapaCor,
  onConfirm,
  onSkip,
}: {
  negData: NegociacaoData;
  etapaNome: string;
  etapaCor: string;
  onConfirm: () => void;
  onSkip: () => void;
}) {
  const [tipo, setTipo]   = useState<CompromissoTipo>('reuniao');
  const [titulo, setTitulo] = useState('');
  const [data, setData]   = useState(new Date().toISOString().split('T')[0]);
  const [hora, setHora]   = useState('09:00');
  const [saving, setSaving] = useState(false);

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
        notas: `Atividade disparada ao entrar na etapa: ${etapaNome}`,
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
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: etapaCor + '22' }}>
              <Zap className="w-5 h-5" style={{ color: etapaCor }} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Disparar Atividade</h3>
              <p className="text-xs text-slate-500">Negociação entrou em <strong>{etapaNome}</strong></p>
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
  const [items, setItems]           = useState<NegociacaoData[]>([]);
  const [funis, setFunis]           = useState<CrmFunil[]>([]);
  const [funil, setFunil]           = useState<CrmFunil | null>(null);
  const [loading, setLoading]       = useState(true);
  const [openDetail, setOpenDetail] = useState<NegociacaoData | null>(null);
  const [dragId, setDragId]         = useState<string | null>(null);
  const [dragOver, setDragOver]     = useState<string | null>(null); // etapa.id
  const [trigger, setTrigger]       = useState<{ data: NegociacaoData; etapa: CrmFunilEtapa } | null>(null);
  const [moving, setMoving]         = useState<string | null>(null);
  const [toast, setToast]           = useState<{ msg: string; ok: boolean } | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  const pendingMove = useRef<{ id: string; etapa: CrmFunilEtapa } | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok }); setTimeout(() => setToast(null), 4000);
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [negs, allFunis, padrao] = await Promise.all([
        getAllNegociacoes(),
        getCrmFunis(),
        getFunilPadrao(),
      ]);
      setItems(negs);
      setFunis(allFunis);
      // Mantém funil selecionado se ainda existir; senão usa o padrão
      setFunil(prev => {
        if (prev && allFunis.find(f => f.id === prev.id)) {
          return allFunis.find(f => f.id === prev.id) ?? padrao;
        }
        return padrao;
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Retorna negociações que pertencem a esta etapa do funil selecionado
  function cardsForEtapa(etapa: CrmFunilEtapa): NegociacaoData[] {
    return items.filter(d => {
      const n = d.negociacao;
      if (n.funilId) {
        // Negociação pertence a outro funil — não mostra neste
        if (n.funilId !== funil?.id) return false;
        // Etapa definida: match exato por ID
        if (n.etapaId) return n.etapaId === etapa.id;
        // Sem etapaId → cai na primeira etapa do funil
        return etapa.id === (funil?.etapas[0]?.id ?? '');
      }
      // Fallback legado: sem funilId, usa slug — só aparece no funil padrão
      if (!funil?.isPadrao) return false;
      // Tenta match por slug; se não achar, cai na primeira etapa
      const slugMatch = funil.etapas.some(e => e.slug === n.etapa);
      if (slugMatch) return etapa.slug === n.etapa;
      return etapa.id === (funil.etapas[0]?.id ?? '');
    });
  }

  function totalForEtapa(etapa: CrmFunilEtapa): number {
    return cardsForEtapa(etapa).reduce((s, d) => s + (d.negociacao.valor_estimado ?? 0), 0);
  }

  const totalGeral = items.reduce((s, d) => s + (d.negociacao.valor_estimado ?? 0), 0);

  async function doMove(id: string, novaEtapa: CrmFunilEtapa) {
    setMoving(id);
    try {
      await supabase.from('crm_negociacoes').update({
        etapa_id:     novaEtapa.id,
        etapa:        novaEtapa.slug,
        probabilidade: novaEtapa.probabilidade,
      }).eq('id', id);

      setItems(prev => prev.map(d =>
        d.negociacao.id === id
          ? { ...d, negociacao: { ...d.negociacao, etapaId: novaEtapa.id, etapa: novaEtapa.slug as NegociacaoData['negociacao']['etapa'], probabilidade: novaEtapa.probabilidade } }
          : d,
      ));

      // Ao atingir etapa tipo GANHA, gera Pedido de Venda no ERP
      if (novaEtapa.tipo === 'GANHA') {
        const negData = items.find(d => d.negociacao.id === id);
        const neg = negData?.negociacao;
        if (neg?.clienteId) {
          try {
            const orc = negData?.orcamento;
            const totalValor = orc?.total ?? (neg.valor_estimado ?? 0);
            const pedidoItens = (orc?.itens ?? [])
              .filter(item => item.produto_id)
              .map(item => ({
                produto_id:        item.produto_id!,
                quantidade:        item.quantidade,
                preco_unitario:    item.preco_unitario,
                desconto_item_pct: item.desconto_pct,
                total_item:        item.total,
              }));
            await createPedido({
              tipo:                 'VENDA',
              status:               'CONFIRMADO',
              cliente_id:           neg.clienteId,
              vendedor_id:          null,
              data_emissao:         new Date().toISOString().split('T')[0],
              data_entrega_prevista: neg.dataFechamentoPrev ?? null,
              condicao_pagamento:   orc?.condicao_pagamento ?? null,
              desconto_global_pct:  orc?.desconto_global_pct ?? 0,
              frete_valor:          orc?.frete ?? 0,
              total_produtos:       totalValor,
              total_pedido:         totalValor,
              observacoes:          `Gerado pelo CRM — Negociação ${id.slice(0, 8).toUpperCase()}`,
            }, pedidoItens);
            showToast('Venda realizada! Pedido de venda criado no ERP.', true);
          } catch (err) {
            console.error('Falha ao criar pedido de venda:', err);
            showToast('Venda movida, mas não foi possível criar o pedido automaticamente.', false);
          }
        } else {
          showToast('Venda realizada! Crie o pedido no ERP (cliente sem ID ERP vinculado).', true);
        }
      }
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
  function onDragOver(e: React.DragEvent, etapaId: string) {
    e.preventDefault();
    setDragOver(etapaId);
  }
  function onDrop(e: React.DragEvent, etapa: CrmFunilEtapa) {
    e.preventDefault();
    setDragOver(null);
    if (!dragId) return;
    const neg = items.find(d => d.negociacao.id === dragId);
    if (!neg) { setDragId(null); return; }
    const currentEtapaId = neg.negociacao.etapaId;
    if (currentEtapaId === etapa.id) { setDragId(null); return; }
    pendingMove.current = { id: dragId, etapa };
    setTrigger({ data: neg, etapa });
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

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Carregando pipeline…
      </div>
    );
  }

  const etapas = funil?.etapas ?? [];

  return (
    <div className="p-6 flex flex-col h-full">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${toast.ok ? 'bg-green-600' : 'bg-amber-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            {funil?.nome ?? 'Funil de Negociações'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {items.filter(d => d.negociacao.funilId === funil?.id || (!d.negociacao.funilId && funil?.isPadrao)).length} negociação(ões) · {BRL(totalGeral)} total no pipeline
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEditor(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm"
            title="Editar funil"
          >
            <Settings className="w-4 h-4" /> Editar Funil
          </button>
          <button
            onClick={load}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm"
          >
            <RefreshCw className="w-4 h-4" /> Atualizar
          </button>
        </div>
      </div>

      {/* Tabs de seleção de funil */}
      {funis.length > 1 && (
        <div className="flex items-center gap-1 mb-5 overflow-x-auto pb-1">
          {funis.map(f => (
            <button
              key={f.id}
              onClick={() => setFunil(f)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                funil?.id === f.id
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.nome}
              {f.isPadrao && <span className="ml-1 text-[10px] opacity-70">(padrão)</span>}
            </button>
          ))}
        </div>
      )}

      {/* Sem funil configurado */}
      {etapas.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <Settings className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Nenhum funil configurado.</p>
          <p className="text-xs mt-1">Clique em "Editar Funil" para configurar as etapas.</p>
        </div>
      )}

      {/* Kanban */}
      {etapas.length > 0 && (
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
          {etapas.map(etapa => {
            const { headerBg, textColor, dotClass } = colHeaderClasses(etapa);
            const cards   = cardsForEtapa(etapa);
            const total   = totalForEtapa(etapa);
            const isOver  = dragOver === etapa.id;

            return (
              <div
                key={etapa.id}
                className="flex-shrink-0 w-72 flex flex-col"
                onDragOver={e => onDragOver(e, etapa.id)}
                onDrop={e => onDrop(e, etapa)}
              >
                {/* Header da coluna */}
                <div
                  className={`rounded-t-xl px-4 py-3 border ${headerBg} border-b-0`}
                  style={{ borderLeftColor: etapa.cor, borderLeftWidth: '3px' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotClass}`}
                        style={etapa.tipo === 'NORMAL' ? { backgroundColor: etapa.cor } : undefined}
                      />
                      <span className={`text-sm font-bold truncate ${textColor}`}>
                        {etapa.icone ? `${etapa.icone} ` : ''}{etapa.nome}
                      </span>
                    </div>
                    <span className="text-xs font-bold bg-white/70 px-2 py-0.5 rounded-full text-slate-600 shrink-0 ml-2">
                      {cards.length}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-medium">{BRL(total)}</p>
                  {etapa.probabilidade > 0 && (
                    <p className="text-[10px] text-slate-400 mt-0.5">{etapa.probabilidade}% probabilidade</p>
                  )}
                </div>

                {/* Cards */}
                <div className={`flex-1 rounded-b-xl border ${colBodyClasses(etapa, isOver)} p-2 space-y-2 min-h-32 overflow-y-auto custom-scrollbar transition-colors`}>
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
                        <div className="flex items-center gap-2 mb-2">
                          <GripVertical className="w-3 h-3 text-slate-300 shrink-0 cursor-grab" />
                          <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                            {iniciais}
                          </div>
                          <p className="text-sm font-semibold text-slate-800 truncate flex-1">{n.clienteNome}</p>
                          {isMoving && <Loader2 className="w-3 h-3 animate-spin text-purple-500 shrink-0" />}
                        </div>

                        <div className="flex items-center gap-1 text-sm font-bold text-slate-800 mb-2">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                          {BRL(n.valor_estimado ?? 0)}
                          {n.probabilidade != null && (
                            <span className="ml-auto text-[10px] font-normal text-slate-400">{n.probabilidade}%</span>
                          )}
                        </div>

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
      )}

      {/* Empty state (sem negociações) */}
      {items.length === 0 && !loading && etapas.length > 0 && (
        <div className="text-center py-8 text-slate-400">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma negociação registrada.</p>
          <p className="text-xs mt-1">Crie negociações na aba Negociações.</p>
        </div>
      )}

      {/* Modal de detalhe */}
      {openDetail && (
        <NegociacaoModal
          data={openDetail}
          funis={funis}
          onClose={() => setOpenDetail(null)}
          onFunilChanged={(negId, funilId, etapaId, etapaSlug, prob) => {
            setItems(prev => prev.map(d =>
              d.negociacao.id === negId
                ? { ...d, negociacao: { ...d.negociacao, funilId, etapaId, etapa: etapaSlug as NegociacaoData['negociacao']['etapa'], probabilidade: prob } }
                : d,
            ));
          }}
        />
      )}

      {/* Modal de trigger de atividade */}
      {trigger && (
        <TriggerModal
          negData={trigger.data}
          etapaNome={trigger.etapa.nome}
          etapaCor={trigger.etapa.cor}
          onConfirm={handleTriggerConfirm}
          onSkip={handleTriggerSkip}
        />
      )}

      {/* Editor de funil */}
      {showEditor && funil && (
        <Suspense fallback={null}>
          <FunilEditorModal
            funil={funil}
            onClose={() => setShowEditor(false)}
            onSaved={updatedFunil => {
              setFunil(updatedFunil);
              setShowEditor(false);
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
