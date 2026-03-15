// ─────────────────────────────────────────────────────────────────────────────
// ERP Finance — Leads do CRM
// Visão somente-leitura das negociações abertas do pipeline de vendas
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, Users, DollarSign, Target, RefreshCw,
  Loader2, AlertCircle, ChevronDown, Calendar, User,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { NegociacaoEtapa } from '../../crm/data/crmData';

// ── Tenant helper ──────────────────────────────────────────────────────────────

function getTenantIds(): string[] {
  const raw = localStorage.getItem('zia_scope_ids_v1');
  try {
    if (raw) {
      const ids = JSON.parse(raw);
      if (Array.isArray(ids) && ids.length > 0) return ids;
    }
  } catch { /* ignore */ }
  return [localStorage.getItem('zia_active_entity_id_v1') ?? ''];
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface LeadRow {
  id: string;
  cliente_nome: string;
  etapa: NegociacaoEtapa;
  valor_estimado: number | null;
  probabilidade: number | null;
  responsavel: string | null;
  data_fechamento_prev: string | null;
  created_at: string;
}

// ── Config ─────────────────────────────────────────────────────────────────────

type EtapaFilter = 'todas' | NegociacaoEtapa;

const ETAPA_CFG: Record<NegociacaoEtapa, { label: string; bg: string; text: string; border: string }> = {
  // Etapas obrigatórias
  prospeccao:           { label: 'Prospecção',        bg: 'bg-slate-100',   text: 'text-slate-600',   border: 'border-slate-200'   },
  projeto_em_analise:   { label: 'Proj. em Análise',  bg: 'bg-violet-100',  text: 'text-violet-700',  border: 'border-violet-200'  },
  proposta_enviada:     { label: 'Proposta Enviada',  bg: 'bg-blue-100',    text: 'text-blue-700',    border: 'border-blue-200'    },
  proposta_aceita:      { label: 'Proposta Aceita',   bg: 'bg-yellow-100',  text: 'text-yellow-700',  border: 'border-yellow-200'  },
  venda_realizada:      { label: 'Venda Realizada',   bg: 'bg-green-100',   text: 'text-green-700',   border: 'border-green-200'   },
  venda_cancelada:      { label: 'Venda Cancelada',   bg: 'bg-red-100',     text: 'text-red-700',     border: 'border-red-200'     },
  // Legadas
  qualificacao:         { label: 'Qualificação',      bg: 'bg-blue-100',    text: 'text-blue-700',    border: 'border-blue-200'    },
  proposta:             { label: 'Proposta',           bg: 'bg-yellow-100',  text: 'text-yellow-700',  border: 'border-yellow-200'  },
  negociacao:           { label: 'Negociação',         bg: 'bg-orange-100',  text: 'text-orange-700',  border: 'border-orange-200'  },
  fechamento:           { label: 'Fechamento',         bg: 'bg-green-100',   text: 'text-green-700',   border: 'border-green-200'   },
};

const FILTER_TABS: { id: EtapaFilter; label: string }[] = [
  { id: 'todas',              label: 'Todas'            },
  { id: 'prospeccao',         label: 'Prospecção'       },
  { id: 'projeto_em_analise', label: 'Em Análise'       },
  { id: 'proposta_enviada',   label: 'Prop. Enviada'    },
  { id: 'proposta_aceita',    label: 'Prop. Aceita'     },
  { id: 'venda_realizada',    label: 'Venda Realizada'  },
  { id: 'venda_cancelada',    label: 'Venda Cancelada'  },
];

const BRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtDate = (d?: string | null) =>
  d ? new Date(d + (d.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('pt-BR') : '—';

// ── KPI Card ───────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  Icon: typeof TrendingUp;
  iconBg: string;
  iconColor: string;
}

function KpiCard({ label, value, sub, Icon, iconBg, iconColor }: KpiCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-start gap-3">
      <div className={`${iconBg} rounded-lg p-2.5 shrink-0`}>
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium truncate">{label}</p>
        <p className="text-xl font-bold text-slate-800 mt-0.5 truncate">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function LeadsFinanceiro() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [etapaFilter, setEtapaFilter] = useState<EtapaFilter>('todas');
  const [sortCol, setSortCol] = useState<'valor_estimado' | 'probabilidade' | 'data_fechamento_prev' | 'created_at'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tids = getTenantIds();
      const { data, error: err } = await supabase
        .from('crm_negociacoes')
        .select('id, cliente_nome, etapa, valor_estimado, probabilidade, responsavel, data_fechamento_prev, created_at')
        .in('tenant_id', tids)
        .eq('status', 'aberta')
        .order('created_at', { ascending: false });
      if (err) throw err;
      setLeads((data ?? []) as LeadRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar leads.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Computed ───────────────────────────────────────────────────────────────

  const filtered = etapaFilter === 'todas'
    ? leads
    : leads.filter(l => l.etapa === etapaFilter);

  const sorted = [...filtered].sort((a, b) => {
    const aVal = a[sortCol] ?? (sortDir === 'asc' ? '\uffff' : '');
    const bVal = b[sortCol] ?? (sortDir === 'asc' ? '\uffff' : '');
    if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const totalLeads = leads.length;
  const totalValor = leads.reduce((s, l) => s + (l.valor_estimado ?? 0), 0);
  const mediaValor = totalLeads > 0 ? totalValor / totalLeads : 0;
  const taxaFechamento = totalLeads > 0
    ? leads.reduce((s, l) => s + (l.probabilidade ?? 0), 0) / totalLeads
    : 0;

  function toggleSort(col: typeof sortCol) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  }

  function SortIcon({ col }: { col: typeof sortCol }) {
    if (sortCol !== col) return <ChevronDown className="w-3.5 h-3.5 text-slate-300 ml-1 inline" />;
    return (
      <ChevronDown
        className={`w-3.5 h-3.5 ml-1 inline text-emerald-600 transition-transform ${sortDir === 'asc' ? 'rotate-180' : ''}`}
      />
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Leads do CRM</h1>
          <p className="text-sm text-slate-500 mt-1">
            Oportunidades em andamento no pipeline de vendas
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total de Leads"
          value={String(totalLeads)}
          sub="negociações abertas"
          Icon={Users}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <KpiCard
          label="Valor Estimado Total"
          value={BRL(totalValor)}
          sub="soma dos leads ativos"
          Icon={DollarSign}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <KpiCard
          label="Média por Lead"
          value={BRL(mediaValor)}
          sub="valor médio estimado"
          Icon={TrendingUp}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <KpiCard
          label="Taxa de Fechamento Prevista"
          value={`${taxaFechamento.toFixed(1)}%`}
          sub="média de probabilidade"
          Icon={Target}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setEtapaFilter(tab.id)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              etapaFilter === tab.id
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            {tab.label}
            {tab.id !== 'todas' && (
              <span className="ml-1.5 text-xs text-slate-400">
                ({leads.filter(l => l.etapa === tab.id).length})
              </span>
            )}
            {tab.id === 'todas' && (
              <span className="ml-1.5 text-xs text-slate-400">({totalLeads})</span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-20 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Carregando leads...</span>
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <TrendingUp className="w-10 h-10 opacity-30" />
            <p className="text-sm font-medium">Nenhum lead encontrado para esta etapa.</p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Cliente
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Etapa
                  </th>
                  <th
                    className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer select-none hover:text-emerald-600 transition-colors"
                    onClick={() => toggleSort('valor_estimado')}
                  >
                    Valor Estimado <SortIcon col="valor_estimado" />
                  </th>
                  <th
                    className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer select-none hover:text-emerald-600 transition-colors"
                    onClick={() => toggleSort('probabilidade')}
                  >
                    Probabilidade <SortIcon col="probabilidade" />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Responsável
                  </th>
                  <th
                    className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer select-none hover:text-emerald-600 transition-colors"
                    onClick={() => toggleSort('data_fechamento_prev')}
                  >
                    Previsão Fechamento <SortIcon col="data_fechamento_prev" />
                  </th>
                  <th
                    className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer select-none hover:text-emerald-600 transition-colors"
                    onClick={() => toggleSort('created_at')}
                  >
                    Data Criação <SortIcon col="created_at" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((lead, idx) => {
                  const etapa = ETAPA_CFG[lead.etapa] ?? ETAPA_CFG.prospeccao;
                  return (
                    <tr
                      key={lead.id}
                      className={`border-b border-slate-50 hover:bg-emerald-50/30 transition-colors ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                      }`}
                    >
                      {/* Cliente */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-emerald-700">
                              {lead.cliente_nome.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="font-medium text-slate-700 truncate max-w-[180px]">
                            {lead.cliente_nome}
                          </span>
                        </div>
                      </td>
                      {/* Etapa */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${etapa.bg} ${etapa.text} ${etapa.border}`}>
                          {etapa.label}
                        </span>
                      </td>
                      {/* Valor */}
                      <td className="px-4 py-3 text-right font-semibold text-slate-700">
                        {lead.valor_estimado != null ? BRL(lead.valor_estimado) : <span className="text-slate-300">—</span>}
                      </td>
                      {/* Probabilidade */}
                      <td className="px-4 py-3 text-right">
                        {lead.probabilidade != null ? (
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${Math.min(lead.probabilidade, 100)}%` }}
                              />
                            </div>
                            <span className="text-slate-600 font-medium tabular-nums w-10 text-right">
                              {lead.probabilidade}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      {/* Responsável */}
                      <td className="px-4 py-3">
                        {lead.responsavel ? (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[120px]">{lead.responsavel}</span>
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      {/* Previsão */}
                      <td className="px-4 py-3">
                        {lead.data_fechamento_prev ? (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {fmtDate(lead.data_fechamento_prev)}
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      {/* Criação */}
                      <td className="px-4 py-3 text-slate-500">
                        {fmtDate(lead.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {/* Footer count */}
        {!loading && sorted.length > 0 && (
          <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-400">
              Exibindo <span className="font-medium text-slate-600">{sorted.length}</span> de{' '}
              <span className="font-medium text-slate-600">{totalLeads}</span> leads abertos
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
