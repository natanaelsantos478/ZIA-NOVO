// ─────────────────────────────────────────────────────────────────────────────
// ERP — Vendas Realizadas
// Exibe todas as vendas finalizadas (orçamentos aprovados do CRM)
// Comissões, recorrências, múltiplas visualizações: lista · calendário · timeline
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect } from 'react';
import {
  DollarSign, Repeat, CreditCard, Award, Calendar, List,
  Activity, ChevronRight, ChevronLeft, Search,
  RefreshCw, User, Building2, CheckCircle, X,
} from 'lucide-react';
import { carregarFinalizacoes, type FinalizacaoVendaData } from '../../crm/sections/FinalizacaoVenda';
import { getAllNegociacoes, type NegociacaoData } from '../../crm/data/crmData';

// ── Helpers ───────────────────────────────────────────────────────────────────
const BRL = (v: number) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtDate = (d: string) =>
  d ? new Date(d + (d.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('pt-BR') : '—';

type ViewMode = 'lista' | 'calendario' | 'timeline';

// ── Venda enriquecida ─────────────────────────────────────────────────────────
interface VendaEnriquecida {
  finalizacao: FinalizacaoVendaData;
  negociacao?: NegociacaoData;
}

// ── Drawer de detalhe de venda ────────────────────────────────────────────────
function VendaDrawer({ venda, onClose }: { venda: VendaEnriquecida; onClose: () => void }) {
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
              {fin.tipoPagamento === 'recorrente' ? 'Assinatura Recorrente' : 'Venda Única'} ·
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

          {/* Comissão */}
          {fin.temComissao && fin.vendedorNome && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Comissão</p>
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
                  <span className="text-xs text-slate-400">Responsável: {neg.responsavel || '—'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Status da venda */}
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span className="text-slate-600">Status: <strong className="text-emerald-700">{fin.status}</strong></span>
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
}: {
  vendas: VendaEnriquecida[];
  onSelectVenda: (v: VendaEnriquecida) => void;
  filtro: string;
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
                {fin.temComissao && fin.vendedorNome && (
                  <p className="text-xs text-amber-600 flex items-center gap-1 justify-end mt-0.5">
                    <Award className="w-3 h-3" />
                    {fin.vendedorNome}: {BRL(fin.comissaoValor ?? 0)}
                  </p>
                )}
              </div>
            </div>

            {fin.tipoPagamento === 'recorrente' && fin.dataInicio && (
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Início: {fmtDate(fin.dataInicio)}</span>
                <span className={`px-2 py-0.5 rounded-full font-semibold ${fin.status === 'ativa' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{fin.status}</span>
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
  const [mes, setMes]   = useState(new Date().getMonth());
  const [ano, setAno]   = useState(new Date().getFullYear());

  const firstDay   = new Date(ano, mes, 1).getDay();
  const daysInMonth = new Date(ano, mes + 1, 0).getDate();
  const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  // Mapeia vendas por dia do mês
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

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay }, (_, i) => i);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header do calendário */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <button onClick={prevMes} className="p-2 rounded-lg hover:bg-slate-100"><ChevronLeft className="w-4 h-4 text-slate-600" /></button>
        <h3 className="font-bold text-slate-800">{MESES[mes]} {ano}</h3>
        <button onClick={nextMes} className="p-2 rounded-lg hover:bg-slate-100"><ChevronRight className="w-4 h-4 text-slate-600" /></button>
      </div>

      <div className="p-4">
        {/* Cabeçalhos dos dias */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
            <div key={d} className="text-center text-[10px] font-semibold text-slate-400 py-1">{d}</div>
          ))}
        </div>

        {/* Dias */}
        <div className="grid grid-cols-7 gap-1">
          {blanks.map(i => <div key={`b${i}`} />)}
          {days.map(day => {
            const vsDay = vendasPorDia[day] ?? [];
            const isToday = day === new Date().getDate() && mes === new Date().getMonth() && ano === new Date().getFullYear();
            return (
              <div
                key={day}
                className={`min-h-[52px] p-1 rounded-lg ${isToday ? 'bg-emerald-50 border border-emerald-200' : 'hover:bg-slate-50'}`}
              >
                <p className={`text-xs font-semibold text-center mb-1 ${isToday ? 'text-emerald-700' : 'text-slate-600'}`}>{day}</p>
                {vsDay.slice(0, 2).map((v, i) => (
                  <div key={i} className={`text-[9px] px-1 py-0.5 rounded truncate mb-0.5 ${v.finalizacao.tipoPagamento === 'recorrente' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {BRL(v.finalizacao.totalVenda)}
                  </div>
                ))}
                {vsDay.length > 2 && (
                  <p className="text-[9px] text-slate-400 text-center">+{vsDay.length - 2}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── View Timeline ─────────────────────────────────────────────────────────────
function ViewTimeline({ vendas }: { vendas: VendaEnriquecida[] }) {
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
      {/* Linha vertical */}
      <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-slate-200" />
      <div className="space-y-4">
        {sorted.map((v, i) => {
          const fin = v.finalizacao;
          const neg = v.negociacao?.negociacao;
          return (
            <div key={i} className="relative">
              {/* Dot */}
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
                      {fin.temComissao && fin.vendedorNome && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                          <Award className="w-2.5 h-2.5" />{fin.vendedorNome}
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

// ── Componente Principal ──────────────────────────────────────────────────────
export default function VendasRealizadas() {
  const [vendas, setVendas]         = useState<VendaEnriquecida[]>([]);
  const [loading, setLoading]       = useState(true);
  const [viewMode, setViewMode]     = useState<ViewMode>('lista');
  const [filtro]                    = useState<'todas' | 'recorrente' | 'unico'>('todas');
  const [search, setSearch]         = useState('');
  const [selected, setSelected]     = useState<VendaEnriquecida | null>(null);
  const [activeTab, setActiveTab]   = useState<'concluidas' | 'assinaturas'>('concluidas');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const fins = carregarFinalizacoes();
        if (fins.length === 0) { setVendas([]); return; }
        // Enriquece com dados do CRM
        const negs = await getAllNegociacoes();
        const enriched: VendaEnriquecida[] = fins.map(f => ({
          finalizacao: f,
          negociacao: negs.find(n => n.negociacao.id === f.negociacaoId),
        }));
        setVendas(enriched);
      } finally { setLoading(false); }
    }
    load();
  }, []);

  // KPIs
  const totalVendas    = vendas.reduce((s, v) => s + v.finalizacao.totalVenda, 0);
  const vendasUnicas   = vendas.filter(v => v.finalizacao.tipoPagamento === 'unico');
  const assinaturas    = vendas.filter(v => v.finalizacao.tipoPagamento === 'recorrente' && v.finalizacao.status === 'ativa');
  const receitaRecorrente = assinaturas.reduce((s, v) => s + v.finalizacao.totalVenda, 0);
  const totalComissoes = vendas.reduce((s, v) => s + (v.finalizacao.comissaoValor ?? 0), 0);

  // Filtros
  const vendaAtivos    = activeTab === 'assinaturas' ? assinaturas : vendasUnicas;
  const filtered       = vendaAtivos.filter(v => {
    if (!search) return true;
    const nome = v.negociacao?.negociacao.clienteNome ?? '';
    return nome.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="p-6 h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Vendas Realizadas</h1>
        <p className="text-sm text-slate-500 mt-0.5">Todas as vendas finalizadas com comissões e recorrências</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6 shrink-0">
        {[
          { label: 'Total em Vendas',      value: BRL(totalVendas),       icon: DollarSign, color: 'emerald' },
          { label: 'Receita Recorrente',   value: BRL(receitaRecorrente), icon: Repeat,     color: 'blue'    },
          { label: 'Assinaturas Ativas',   value: String(assinaturas.length), icon: CheckCircle, color: 'green' },
          { label: 'Total Comissões',      value: BRL(totalComissoes),    icon: Award,      color: 'amber'   },
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
          <button onClick={() => setActiveTab('concluidas')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'concluidas' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
            Concluídas ({vendasUnicas.length})
          </button>
          <button onClick={() => setActiveTab('assinaturas')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === 'assinaturas' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
            Assinaturas Ativas ({assinaturas.length})
          </button>
        </div>

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
          {/* Modo de visão */}
          {[
            { id: 'lista' as ViewMode,     Icon: List,     label: 'Lista' },
            { id: 'calendario' as ViewMode,Icon: Calendar, label: 'Calendário' },
            { id: 'timeline' as ViewMode,  Icon: Activity, label: 'Timeline' },
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
          <ViewLista vendas={filtered} onSelectVenda={setSelected} filtro={filtro} />
        ) : viewMode === 'calendario' ? (
          <ViewCalendario vendas={filtered} />
        ) : (
          <ViewTimeline vendas={filtered} />
        )}
      </div>

      {/* Drawer de detalhe */}
      {selected && <VendaDrawer venda={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
