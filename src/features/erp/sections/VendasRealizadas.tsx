// ─────────────────────────────────────────────────────────────────────────────
// ERP — Vendas Realizadas
// Controle de acesso por perfil:
//   Nível 1 (Holding)  → vê todas as vendas do grupo
//   Nível 2 (Matriz)   → vê vendas da matriz + filiais do escopo
//   Nível 3 (Filial)   → vê apenas vendas da sua filial
//   Nível 4 (Vendedor) → vê APENAS as próprias vendas (vendedor_id = employeeId)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useMemo } from 'react';
import {
  DollarSign, Repeat, CreditCard, Award, Calendar, List,
  Activity, ChevronRight, ChevronLeft, Search,
  RefreshCw, User, Building2, CheckCircle, X, AlertCircle,
  Filter, ChevronDown, Layers,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { carregarFinalizacoes, type FinalizacaoVendaData } from '../../crm/sections/FinalizacaoVenda';
import { getAllNegociacoes, type NegociacaoData } from '../../crm/data/crmData';
import { useScope, useProfiles } from '../../../context/ProfileContext';

// ── Helpers ───────────────────────────────────────────────────────────────────
const BRL = (v: number) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtDate = (d: string) =>
  d ? new Date(d + (d.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('pt-BR') : '—';

type ViewMode = 'lista' | 'calendario' | 'timeline';

// ── Row mapper Supabase → FinalizacaoVendaData ────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToFin(r: any): FinalizacaoVendaData {
  return {
    orcamentoId:        r.orcamento_id,
    negociacaoId:       r.negociacao_id,
    ziaCompanyId:       r.zia_company_id,
    tipoPagamento:      r.tipo_pagamento,
    recorrenciaAtiva:   r.recorrencia_ativa  ?? false,
    periodoRecorrencia: r.periodo_recorrencia ?? undefined,
    duracaoTipo:        r.duracao_tipo        ?? undefined,
    duracaoValor:       r.duracao_valor       ?? undefined,
    dataInicio:         r.data_inicio         ?? undefined,
    temComissao:        r.tem_comissao        ?? false,
    vendedorId:         r.vendedor_id         ?? undefined,
    vendedorNome:       r.vendedor_nome       ?? undefined,
    comissaoPct:        r.comissao_pct   != null ? Number(r.comissao_pct)   : undefined,
    comissaoRecorrente: r.comissao_recorrente ?? false,
    comissaoValor:      r.comissao_valor != null ? Number(r.comissao_valor) : undefined,
    totalVenda:         Number(r.total_venda),
    status:             r.status,
    criadoEm:           r.created_at,
  };
}

// ── Venda enriquecida ─────────────────────────────────────────────────────────
interface VendaEnriquecida {
  finalizacao: FinalizacaoVendaData;
  negociacao?: NegociacaoData;
}

// ── Badge de contexto de acesso ───────────────────────────────────────────────
function ScopeBadge({ level, entityName, vendorName }: {
  level: number | null;
  entityName: string | null;
  vendorName?: string;
}) {
  if (level === null) return null;

  const configs: Record<number, { label: string; color: string }> = {
    1: { label: 'Visão Holding — todas as empresas',    color: 'bg-violet-100 text-violet-700 border-violet-200' },
    2: { label: `Matriz — ${entityName ?? ''}`,         color: 'bg-blue-100 text-blue-700 border-blue-200'       },
    3: { label: `Filial — ${entityName ?? ''}`,         color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    4: { label: `Minhas vendas${vendorName ? ` — ${vendorName}` : ''}`, color: 'bg-amber-100 text-amber-700 border-amber-200' },
  };

  const cfg = configs[level];
  if (!cfg) return null;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${cfg.color}`}>
      <Layers className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

// ── Drawer de detalhe de venda ────────────────────────────────────────────────
function VendaDrawer({
  venda,
  onClose,
  isVendedor,
}: {
  venda: VendaEnriquecida;
  onClose: () => void;
  isVendedor: boolean;
}) {
  const fin = venda.finalizacao;
  const neg = venda.negociacao?.negociacao;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex justify-end" onClick={onClose}>
      <div
        className="bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-green-50">
          <div>
            <h2 className="text-base font-bold text-slate-900">{neg?.clienteNome ?? 'Cliente'}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {fin.tipoPagamento === 'recorrente' ? 'Assinatura Recorrente' : 'Venda Única'} ·{' '}
              {fmtDate(fin.criadoEm)}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/80">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Valor */}
          <div className="bg-emerald-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-500 mb-1">Valor da Venda</p>
            <p className="text-2xl font-black text-emerald-700">{BRL(fin.totalVenda)}</p>
            {fin.tipoPagamento === 'recorrente' && fin.periodoRecorrencia && (
              <p className="text-xs text-emerald-600 mt-1">
                {fin.periodoRecorrencia} ·{' '}
                {fin.duracaoTipo === 'indefinido'
                  ? 'por tempo indeterminado'
                  : `por ${fin.duracaoValor} ${fin.duracaoTipo}`}
              </p>
            )}
          </div>

          {/* Pagamento */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Pagamento</p>
            <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-3">
              {fin.tipoPagamento === 'recorrente'
                ? <Repeat className="w-5 h-5 text-blue-600 shrink-0" />
                : <CreditCard className="w-5 h-5 text-slate-600 shrink-0" />
              }
              <div>
                <p className="text-sm font-semibold text-slate-800">
                  {fin.tipoPagamento === 'recorrente' ? 'Recorrente' : 'Pagamento Único'}
                </p>
                {fin.dataInicio && (
                  <p className="text-xs text-slate-500">Início: {fmtDate(fin.dataInicio)}</p>
                )}
              </div>
            </div>
          </div>

          {/* Comissão — gestores veem tudo; vendedor vê apenas a própria */}
          {fin.temComissao && fin.vendedorNome && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                {isVendedor ? 'Sua Comissão' : 'Comissão'}
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-sm font-semibold text-slate-800">{fin.vendedorNome}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Comissão ({fin.comissaoPct}%)</span>
                  <span className="text-sm font-bold text-amber-700">{BRL(fin.comissaoValor ?? 0)}</span>
                </div>
                {fin.comissaoRecorrente && (
                  <div className="flex items-center gap-1 text-xs text-amber-600">
                    <Repeat className="w-3 h-3" />
                    Comissão recorrente: {BRL(fin.comissaoValor ?? 0)} por {fin.periodoRecorrencia}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Dados da negociação */}
          {neg && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Negociação</p>
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span className="font-medium text-slate-700">{neg.clienteNome}</span>
                </div>
                {neg.clienteEmail && (
                  <p className="text-xs text-slate-500">{neg.clienteEmail}</p>
                )}
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${neg.status === 'ganha' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {neg.status}
                  </span>
                  {/* Gestores veem o responsável; vendedor já sabe que é ele */}
                  {!isVendedor && (
                    <span className="text-xs text-slate-400">Responsável: {neg.responsavel || '—'}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Status da venda */}
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span className="text-slate-600">
              Status: <strong className="text-emerald-700">{fin.status}</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── View Lista ────────────────────────────────────────────────────────────────
function ViewLista({
  vendas,
  onSelectVenda,
  filtro,
  isVendedor,
}: {
  vendas: VendaEnriquecida[];
  onSelectVenda: (v: VendaEnriquecida) => void;
  filtro: string;
  isVendedor: boolean;
}) {
  const filtered = vendas.filter(v =>
    filtro === 'todas' ? true :
    filtro === 'recorrente' ? v.finalizacao.tipoPagamento === 'recorrente' :
    v.finalizacao.tipoPagamento === 'unico'
  );

  if (filtered.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-20" />
        <p className="text-sm">Nenhuma venda encontrada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {filtered.map((v, i) => {
        const fin = v.finalizacao;
        const neg = v.negociacao?.negociacao;
        return (
          <div
            key={i}
            onClick={() => onSelectVenda(v)}
            className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md cursor-pointer transition-all hover:border-emerald-200"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${fin.tipoPagamento === 'recorrente' ? 'bg-blue-100' : 'bg-emerald-100'}`}>
                  {fin.tipoPagamento === 'recorrente'
                    ? <Repeat className="w-5 h-5 text-blue-600" />
                    : <CreditCard className="w-5 h-5 text-emerald-600" />
                  }
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{neg?.clienteNome ?? 'Cliente'}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {fmtDate(fin.criadoEm)} ·{' '}
                    {fin.tipoPagamento === 'recorrente'
                      ? `${fin.periodoRecorrencia} · ${fin.duracaoTipo === 'indefinido' ? 'indefinido' : `${fin.duracaoValor} ${fin.duracaoTipo}`}`
                      : 'Pagamento único'}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-lg font-black text-emerald-700">{BRL(fin.totalVenda)}</p>
                {/* Gestores veem o nome do vendedor; vendedor vê a própria comissão */}
                {fin.temComissao && (
                  <p className="text-xs text-amber-600 flex items-center gap-1 justify-end mt-0.5">
                    <Award className="w-3 h-3" />
                    {isVendedor
                      ? BRL(fin.comissaoValor ?? 0)
                      : `${fin.vendedorNome}: ${BRL(fin.comissaoValor ?? 0)}`
                    }
                  </p>
                )}
              </div>
            </div>

            {fin.tipoPagamento === 'recorrente' && fin.dataInicio && (
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />Início: {fmtDate(fin.dataInicio)}
                </span>
                <span className={`px-2 py-0.5 rounded-full font-semibold ${fin.status === 'ativa' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {fin.status}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── View Calendário ───────────────────────────────────────────────────────────
function ViewCalendario({ vendas }: { vendas: VendaEnriquecida[] }) {
  const [mes, setMes] = useState(new Date().getMonth());
  const [ano, setAno] = useState(new Date().getFullYear());

  const firstDay    = new Date(ano, mes, 1).getDay();
  const daysInMonth = new Date(ano, mes + 1, 0).getDate();
  const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  const vendasPorDia: Record<number, VendaEnriquecida[]> = {};
  vendas.forEach(v => {
    const d = new Date(v.finalizacao.criadoEm);
    if (d.getMonth() === mes && d.getFullYear() === ano) {
      const day = d.getDate();
      if (!vendasPorDia[day]) vendasPorDia[day] = [];
      vendasPorDia[day].push(v);
    }
  });

  function prevMes() { if (mes === 0) { setMes(11); setAno(a => a - 1); } else setMes(m => m - 1); }
  function nextMes() { if (mes === 11) { setMes(0); setAno(a => a + 1); } else setMes(m => m + 1); }

  const days   = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <button onClick={prevMes} className="p-2 rounded-lg hover:bg-slate-100"><ChevronLeft className="w-4 h-4 text-slate-600" /></button>
        <h3 className="font-bold text-slate-800">{MESES[mes]} {ano}</h3>
        <button onClick={nextMes} className="p-2 rounded-lg hover:bg-slate-100"><ChevronRight className="w-4 h-4 text-slate-600" /></button>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
            <div key={d} className="text-center text-[10px] font-semibold text-slate-400 py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {blanks.map(i => <div key={`b${i}`} />)}
          {days.map(day => {
            const vsDay  = vendasPorDia[day] ?? [];
            const isToday = day === new Date().getDate() && mes === new Date().getMonth() && ano === new Date().getFullYear();
            return (
              <div key={day} className={`min-h-[52px] p-1 rounded-lg ${isToday ? 'bg-emerald-50 border border-emerald-200' : 'hover:bg-slate-50'}`}>
                <p className={`text-xs font-semibold text-center mb-1 ${isToday ? 'text-emerald-700' : 'text-slate-600'}`}>{day}</p>
                {vsDay.slice(0, 2).map((v, i) => (
                  <div key={i} className={`text-[9px] px-1 py-0.5 rounded truncate mb-0.5 ${v.finalizacao.tipoPagamento === 'recorrente' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {BRL(v.finalizacao.totalVenda)}
                  </div>
                ))}
                {vsDay.length > 2 && <p className="text-[9px] text-slate-400 text-center">+{vsDay.length - 2}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── View Timeline ─────────────────────────────────────────────────────────────
function ViewTimeline({ vendas, isVendedor }: { vendas: VendaEnriquecida[]; isVendedor: boolean }) {
  const sorted = [...vendas].sort((a, b) => b.finalizacao.criadoEm.localeCompare(a.finalizacao.criadoEm));

  if (sorted.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400">
        <Activity className="w-10 h-10 mx-auto mb-3 opacity-20" />
        <p className="text-sm">Nenhuma venda para exibir na timeline.</p>
      </div>
    );
  }

  return (
    <div className="relative pl-6">
      <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-slate-200" />
      <div className="space-y-4">
        {sorted.map((v, i) => {
          const fin = v.finalizacao;
          const neg = v.negociacao?.negociacao;
          return (
            <div key={i} className="relative">
              <div className={`absolute -left-3.5 top-4 w-3 h-3 rounded-full border-2 border-white ${fin.tipoPagamento === 'recorrente' ? 'bg-blue-500' : 'bg-emerald-500'}`} />
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm ml-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] text-slate-400 mb-1">{fmtDate(fin.criadoEm)}</p>
                    <p className="font-semibold text-slate-900 text-sm">{neg?.clienteNome ?? 'Cliente'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${fin.tipoPagamento === 'recorrente' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {fin.tipoPagamento === 'recorrente' ? 'Recorrente' : 'Único'}
                      </span>
                      {fin.temComissao && !isVendedor && fin.vendedorNome && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                          <Award className="w-2.5 h-2.5" />{fin.vendedorNome}
                        </span>
                      )}
                      {fin.temComissao && isVendedor && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                          <Award className="w-2.5 h-2.5" />Comissão: {BRL(fin.comissaoValor ?? 0)}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-base font-black text-emerald-700 shrink-0">{BRL(fin.totalVenda)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Aviso: perfil nível 4 sem employeeId vinculado ────────────────────────────
function AvisoSemVinculo() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-amber-500" />
      </div>
      <h3 className="text-base font-bold text-slate-800 mb-2">Perfil não vinculado</h3>
      <p className="text-sm text-slate-500 max-w-xs">
        Seu perfil ainda não está vinculado a um funcionário.
        Peça ao gestor para vincular seu perfil em <strong>Configurações → Perfis</strong>.
      </p>
    </div>
  );
}

// ── Componente Principal ──────────────────────────────────────────────────────
export default function VendasRealizadas() {
  const { activeProfile } = useProfiles();
  const scope             = useScope();

  const [vendas, setVendas]       = useState<VendaEnriquecida[]>([]);
  const [loading, setLoading]     = useState(true);
  const [viewMode, setViewMode]   = useState<ViewMode>('lista');
  const [filtro]                  = useState<'todas' | 'recorrente' | 'unico'>('todas');
  const [search, setSearch]       = useState('');
  const [selected, setSelected]   = useState<VendaEnriquecida | null>(null);
  const [activeTab, setActiveTab] = useState<'concluidas' | 'assinaturas'>('concluidas');

  // Filtro por vendedor — disponível para gestores (nível 1-3)
  const [filtroVendedor, setFiltroVendedor] = useState<string>('todos');
  const [showVendedorMenu, setShowVendedorMenu] = useState(false);

  const isVendedor  = scope.level === 4;
  const semVinculo  = isVendedor && !activeProfile?.employeeId;

  // ── Carrega vendas com controle de acesso ─────────────────────────────────
  useEffect(() => {
    if (scope.level === null) return;
    if (semVinculo) { setLoading(false); return; }

    async function load() {
      setLoading(true);
      try {
        let fins: FinalizacaoVendaData[] = [];

        // Monta query Supabase com filtro de acesso
        let query = supabase
          .from('crm_finalizacoes')
          .select('*')
          .order('created_at', { ascending: false });

        if (isVendedor) {
          // Nível 4: apenas as próprias vendas
          query = query.eq('vendedor_id', activeProfile!.employeeId!);
        } else {
          // Níveis 1-3: filtro por empresa(s) do escopo
          const ids = scope.scopedEntityIds;
          if (ids.length === 1)    query = query.eq('zia_company_id', ids[0]);
          else if (ids.length > 1) query = query.in('zia_company_id', ids);
        }

        const { data: sbData, error: sbError } = await query;

        if (!sbError && sbData && sbData.length > 0) {
          fins = sbData.map(rowToFin);
        } else {
          // Fallback: localStorage (dados sem zia_company_id — desenvolvimento)
          const all = carregarFinalizacoes();
          fins = isVendedor
            ? all.filter(f => f.vendedorId === activeProfile?.employeeId)
            : all;
        }

        // Enriquece com dados do CRM (getAllNegociacoes já aplica escopo de tenant)
        const negs = await getAllNegociacoes();
        setVendas(fins.map(f => ({
          finalizacao: f,
          negociacao:  negs.find(n => n.negociacao.id === f.negociacaoId),
        })));
      } finally {
        setLoading(false);
      }
    }

    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope.level, scope.scopedEntityIds.join(','), activeProfile?.employeeId, semVinculo]);

  // ── Lista de vendedores únicos (para filtro de gestores) ──────────────────
  const vendedores = useMemo(() => {
    if (isVendedor) return [];
    const map = new Map<string, string>();
    vendas.forEach(v => {
      if (v.finalizacao.vendedorId && v.finalizacao.vendedorNome)
        map.set(v.finalizacao.vendedorId, v.finalizacao.vendedorNome);
    });
    return Array.from(map.entries()).map(([id, nome]) => ({ id, nome }));
  }, [vendas, isVendedor]);

  // ── KPIs (calculados sobre vendas do escopo) ──────────────────────────────
  const vendasEscopo    = vendas.filter(v =>
    filtroVendedor === 'todos' ? true : v.finalizacao.vendedorId === filtroVendedor
  );
  const vendasUnicas    = vendasEscopo.filter(v => v.finalizacao.tipoPagamento === 'unico');
  const assinaturas     = vendasEscopo.filter(v =>
    v.finalizacao.tipoPagamento === 'recorrente' && v.finalizacao.status === 'ativa'
  );
  const totalVendas         = vendasEscopo.reduce((s, v) => s + v.finalizacao.totalVenda, 0);
  const receitaRecorrente   = assinaturas.reduce((s, v) => s + v.finalizacao.totalVenda, 0);
  const totalComissoes      = vendasEscopo
    .filter(v => isVendedor ? v.finalizacao.vendedorId === activeProfile?.employeeId : true)
    .reduce((s, v) => s + (v.finalizacao.comissaoValor ?? 0), 0);

  // ── Filtros de exibição ────────────────────────────────────────────────────
  const vendaAtivos = activeTab === 'assinaturas' ? assinaturas : vendasUnicas;
  const filtered    = vendaAtivos.filter(v => {
    if (!search) return true;
    const nome = v.negociacao?.negociacao.clienteNome ?? '';
    return nome.toLowerCase().includes(search.toLowerCase());
  });

  // ── Título do KPI de comissão ──────────────────────────────────────────────
  const labelComissao = isVendedor ? 'Minhas Comissões' : 'Total Comissões';

  return (
    <div className="p-6 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-bold text-slate-900">
            {isVendedor ? 'Minhas Vendas' : 'Vendas Realizadas'}
          </h1>
          <ScopeBadge
            level={scope.level}
            entityName={scope.entityName}
            vendorName={activeProfile?.name}
          />
        </div>
        <p className="text-sm text-slate-500 mt-1">
          {isVendedor
            ? 'Suas vendas finalizadas e comissões'
            : 'Vendas finalizadas do seu escopo de acesso'}
        </p>
      </div>

      {/* Estado: sem vínculo de funcionário */}
      {semVinculo ? (
        <AvisoSemVinculo />
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-4 gap-4 mb-5 shrink-0">
            {[
              { label: 'Total em Vendas',    value: BRL(totalVendas),         icon: DollarSign, color: 'emerald' },
              { label: 'Receita Recorrente', value: BRL(receitaRecorrente),   icon: Repeat,     color: 'blue'    },
              { label: 'Assinaturas Ativas', value: String(assinaturas.length), icon: CheckCircle, color: 'green' },
              { label: labelComissao,        value: BRL(totalComissoes),      icon: Award,      color: 'amber'   },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <div className={`w-9 h-9 rounded-xl mb-2 flex items-center justify-center bg-${color}-100`}>
                  <Icon className={`w-4 h-4 text-${color}-600`} />
                </div>
                <p className="text-lg font-black text-slate-900">{value}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            ))}
          </div>

          {/* Controles */}
          <div className="flex items-center gap-3 mb-4 shrink-0 flex-wrap">
            {/* Abas */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('concluidas')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'concluidas' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              >
                Concluídas ({vendasUnicas.length})
              </button>
              <button
                onClick={() => setActiveTab('assinaturas')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'assinaturas' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              >
                Assinaturas Ativas ({assinaturas.length})
              </button>
            </div>

            {/* Filtro por vendedor — apenas para gestores */}
            {!isVendedor && vendedores.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowVendedorMenu(v => !v)}
                  className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:border-slate-300 bg-white"
                >
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  {filtroVendedor === 'todos'
                    ? 'Todos os vendedores'
                    : vendedores.find(v => v.id === filtroVendedor)?.nome ?? 'Vendedor'}
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>
                {showVendedorMenu && (
                  <div className="absolute top-full mt-1 left-0 z-10 bg-white border border-slate-200 rounded-xl shadow-lg py-1 min-w-[180px]">
                    <button
                      onClick={() => { setFiltroVendedor('todos'); setShowVendedorMenu(false); }}
                      className={`w-full text-left px-4 py-2 text-xs hover:bg-slate-50 font-semibold ${filtroVendedor === 'todos' ? 'text-emerald-600' : 'text-slate-700'}`}
                    >
                      Todos os vendedores
                    </button>
                    {vendedores.map(v => (
                      <button
                        key={v.id}
                        onClick={() => { setFiltroVendedor(v.id); setShowVendedorMenu(false); }}
                        className={`w-full text-left px-4 py-2 text-xs hover:bg-slate-50 ${filtroVendedor === v.id ? 'text-emerald-600 font-semibold' : 'text-slate-600'}`}
                      >
                        {v.nome}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Busca */}
            <div className="relative flex-1 max-w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar cliente..."
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>

            <div className="ml-auto flex items-center gap-2">
              {[
                { id: 'lista' as ViewMode,      Icon: List,     label: 'Lista'      },
                { id: 'calendario' as ViewMode, Icon: Calendar, label: 'Calendário' },
                { id: 'timeline' as ViewMode,   Icon: Activity, label: 'Timeline'   },
              ].map(({ id, Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setViewMode(id)}
                  title={label}
                  className={`p-2 rounded-xl border transition-all ${viewMode === id ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Conteúdo */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Carregando vendas...
              </div>
            ) : viewMode === 'lista' ? (
              <ViewLista vendas={filtered} onSelectVenda={setSelected} filtro={filtro} isVendedor={isVendedor} />
            ) : viewMode === 'calendario' ? (
              <ViewCalendario vendas={filtered} />
            ) : (
              <ViewTimeline vendas={filtered} isVendedor={isVendedor} />
            )}
          </div>
        </>
      )}

      {/* Drawer de detalhe */}
      {selected && (
        <VendaDrawer
          venda={selected}
          onClose={() => setSelected(null)}
          isVendedor={isVendedor}
        />
      )}
    </div>
  );
}
