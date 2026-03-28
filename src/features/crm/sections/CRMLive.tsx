// ─────────────────────────────────────────────────────────────────────────────
// CRM Live (Real-Time) — Painel em tempo real do pipeline de vendas
// Supabase real-time: negociações, atividades, alertas ao vivo
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react';
import {
  Radio, TrendingUp, Phone, Mail, Users, MessageCircle,
  DollarSign, Clock, AlertCircle, CheckCircle2, Zap,
  Circle, RefreshCw, FileText, Calendar, Activity,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useScope } from '../../../context/ProfileContext';
import {
  getAllNegociacoes, getCrmAtividades,
  type NegociacaoData, type CrmAtividade,
} from '../data/crmData';

// ── Utils ─────────────────────────────────────────────────────────────────────

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `${m}min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

function fmt(v: number) {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v.toFixed(0)}`;
}

const TIPO_ICON: Record<string, typeof Phone> = {
  ligacao:  Phone,
  email:    Mail,
  reuniao:  Users,
  whatsapp: MessageCircle,
  proposta: FileText,
  followup: CheckCircle2,
  outro:    Activity,
};

const TIPO_COLOR: Record<string, string> = {
  ligacao:  'text-blue-400 bg-blue-500/10',
  email:    'text-violet-400 bg-violet-500/10',
  reuniao:  'text-emerald-400 bg-emerald-500/10',
  whatsapp: 'text-green-400 bg-green-500/10',
  proposta: 'text-amber-400 bg-amber-500/10',
  followup: 'text-pink-400 bg-pink-500/10',
  outro:    'text-slate-400 bg-slate-500/10',
};

const STATUS_COLOR: Record<string, string> = {
  aberta:    'bg-blue-500/10 text-blue-300',
  ganha:     'bg-emerald-500/10 text-emerald-300',
  perdida:   'bg-red-500/10 text-red-300',
  suspensa:  'bg-slate-700 text-slate-400',
};

const ATIV_STATUS_COLOR: Record<string, string> = {
  pendente:     'bg-slate-700 text-slate-400',
  em_andamento: 'bg-amber-500/10 text-amber-300',
  concluida:    'bg-emerald-500/10 text-emerald-300',
  cancelada:    'bg-red-500/10 text-red-400',
};

// ── Componente ────────────────────────────────────────────────────────────────

export default function CRMLive() {
  const scope = useScope();
  const [negData, setNegData] = useState<NegociacaoData[]>([]);
  const [atividades, setAtividades] = useState<CrmAtividade[]>([]);
  const [feed, setFeed] = useState<{ id: string; text: string; at: string; tipo: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [pulsar, setPulsar] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  async function carregar() {
    setLoading(true);
    const [negs, ativs] = await Promise.all([
      getAllNegociacoes(),
      getCrmAtividades(),
    ]);
    setNegData(negs);
    setAtividades(ativs);
    setFeed(
      ativs.slice(0, 20).map(a => ({
        id: a.id,
        text: `${a.titulo}`,
        at: a.created_at,
        tipo: a.tipo,
      }))
    );
    setLoading(false);
  }

  useEffect(() => {
    carregar();

    // Real-time: escuta crm_atividades
    const channel = supabase
      .channel('crm_live_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_atividades' }, (payload) => {
        setPulsar(true);
        setTimeout(() => setPulsar(false), 1200);
        if (payload.eventType === 'INSERT') {
          const nova = payload.new as CrmAtividade;
          setAtividades(prev => [nova, ...prev].slice(0, 50));
          setFeed(prev => [{ id: nova.id, text: nova.titulo, at: nova.created_at, tipo: nova.tipo }, ...prev].slice(0, 20));
        }
        if (payload.eventType === 'UPDATE') {
          setAtividades(prev => prev.map(a => a.id === (payload.new as CrmAtividade).id ? payload.new as CrmAtividade : a));
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_negociacoes' }, () => {
        getAllNegociacoes().then(setNegData);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [scope.scopedEntityIds.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  // KPIs derivados de negociacao (campo dentro de NegociacaoData)
  const negs = negData.map(nd => nd.negociacao);
  const abertas     = negs.filter(n => n.status === 'aberta');
  const ganhas      = negs.filter(n => n.status === 'ganha');
  const totalPipeline = negs.reduce((s, n) => s + (n.valor_estimado ?? 0), 0);
  const totalGanho    = ganhas.reduce((s, n) => s + (n.valor_estimado ?? 0), 0);

  const hoje = new Date();
  const atividadesHoje = atividades.filter(a => {
    const d = new Date(a.created_at);
    return d.getDate() === hoje.getDate() && d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
  });

  const KPIS = [
    { label: 'Pipeline Total',    value: fmt(totalPipeline),           icon: DollarSign,  color: 'text-purple-400',  bg: 'bg-purple-500/10' },
    { label: 'Receita Ganha',     value: fmt(totalGanho),              icon: TrendingUp,  color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { label: 'Negoc. Abertas',    value: String(abertas.length),       icon: Activity,    color: 'text-amber-400',   bg: 'bg-amber-500/10' },
    { label: 'Atividades Hoje',   value: String(atividadesHoje.length),icon: Zap,         color: 'text-blue-400',    bg: 'bg-blue-500/10' },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full bg-emerald-400 ${pulsar ? 'animate-ping' : 'animate-pulse'}`} />
          <Radio className="w-5 h-5 text-purple-400" />
          <div>
            <h1 className="font-bold text-white text-base">CRM Live</h1>
            <p className="text-xs text-slate-500">Atualização em tempo real via Supabase</p>
          </div>
        </div>
        <button onClick={carregar} disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm text-slate-300 transition-colors disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-500">Conectando ao Supabase real-time…</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {KPIS.map(k => (
              <div key={k.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <div className={`w-9 h-9 rounded-xl ${k.bg} flex items-center justify-center mb-3`}>
                  <k.icon className={`w-5 h-5 ${k.color}`} />
                </div>
                <div className="text-2xl font-black text-white">{k.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{k.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Feed de atividades ao vivo */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Circle className="w-2 h-2 fill-emerald-400 text-emerald-400 animate-pulse" />
                  <span className="font-bold text-slate-200 text-sm">Feed ao Vivo</span>
                </div>
                <span className="text-xs text-slate-500">{feed.length} eventos</span>
              </div>
              <div ref={feedRef} className="divide-y divide-slate-800/60 max-h-80 overflow-y-auto custom-scrollbar">
                {feed.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <AlertCircle className="w-8 h-8 text-slate-600 mb-2" />
                    <p className="text-sm text-slate-500">Nenhuma atividade recente</p>
                  </div>
                ) : feed.map(ev => {
                  const Icon = TIPO_ICON[ev.tipo] ?? Activity;
                  const colCls = TIPO_COLOR[ev.tipo] ?? 'text-slate-400 bg-slate-500/10';
                  return (
                    <div key={ev.id} className="flex items-start gap-3 px-5 py-3 hover:bg-slate-800/40 transition-colors">
                      <div className={`w-7 h-7 rounded-lg ${colCls} flex items-center justify-center shrink-0 mt-0.5`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-300 truncate">{ev.text}</p>
                        <p className="text-xs text-slate-600 mt-0.5">{timeAgo(ev.at)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Negociações abertas */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                  <span className="font-bold text-slate-200 text-sm">Negociações Abertas</span>
                </div>
                <span className="text-xs text-slate-500">{abertas.length} abertas</span>
              </div>
              <div className="divide-y divide-slate-800/60 max-h-80 overflow-y-auto custom-scrollbar">
                {abertas.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <AlertCircle className="w-8 h-8 text-slate-600 mb-2" />
                    <p className="text-sm text-slate-500">Nenhuma negociação aberta</p>
                  </div>
                ) : abertas.map(neg => (
                  <div key={neg.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-800/40 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-200 truncate">{neg.clienteNome}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${STATUS_COLOR[neg.status] ?? 'bg-slate-700 text-slate-400'}`}>
                          {neg.status}
                        </span>
                        <span className="text-[10px] text-slate-600 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {timeAgo(neg.dataCriacao)}
                        </span>
                      </div>
                    </div>
                    {(neg.valor_estimado ?? 0) > 0 && (
                      <span className="text-sm font-bold text-emerald-400 shrink-0">
                        {fmt(neg.valor_estimado!)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Atividades de hoje */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-800">
              <Calendar className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-slate-200 text-sm">Atividades de Hoje</span>
              <span className="text-xs text-slate-500 ml-auto">{atividadesHoje.length} registradas</span>
            </div>
            {atividadesHoje.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Clock className="w-8 h-8 text-slate-700 mb-2" />
                <p className="text-sm text-slate-500">Nenhuma atividade registrada hoje</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {atividadesHoje.slice(0, 10).map(a => {
                  const Icon = TIPO_ICON[a.tipo] ?? Activity;
                  const colCls = TIPO_COLOR[a.tipo] ?? 'text-slate-400 bg-slate-500/10';
                  return (
                    <div key={a.id} className="flex items-center gap-4 px-5 py-3">
                      <div className={`w-8 h-8 rounded-xl ${colCls} flex items-center justify-center shrink-0`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-200 font-medium truncate">{a.titulo}</p>
                        {a.descricao && (
                          <p className="text-xs text-slate-500 truncate">{a.descricao}</p>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold shrink-0 ${ATIV_STATUS_COLOR[a.status] ?? 'bg-slate-700 text-slate-400'}`}>
                        {a.status.replace('_', ' ')}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
