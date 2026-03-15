// ─────────────────────────────────────────────────────────────────────────────
// AnaliseMargem.tsx — Dashboard de análise de margem e fechamento mensal
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useMemo, useEffect } from 'react';
import {
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, BarChart2, Calendar, Play, CheckCircle2, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { NOS_MOCK, ARESTAS_MOCK, IMPOSTOS_MOCK, CONTEXTO_PADRAO } from './mockData';
import { simularArvore } from './costEngine';
import type { ContextoCalculo } from './types';
import { getSnapshot, upsertSnapshot, getNos, getArestas, getImpostos, avaliarNoDB } from '../../../../lib/financeiro';

// ── Waterfall data ────────────────────────────────────────────────────────────
function buildWaterfallData(receita: number, custos: number, impostos: number) {
  const lucrobruto = receita - custos;
  const lucroliq = lucrobruto - impostos;
  return [
    { name: 'Receita Bruta',     valor: receita,     tipo: 'positivo', inicio: 0 },
    { name: 'Custos Totais',     valor: -custos,     tipo: 'negativo', inicio: receita - custos },
    { name: 'Lucro Bruto',       valor: lucrobruto,  tipo: 'total',    inicio: 0 },
    { name: 'Impostos',          valor: -impostos,   tipo: 'negativo', inicio: lucrobruto - impostos },
    { name: 'Lucro Líquido',     valor: lucroliq,    tipo: 'total',    inicio: 0 },
  ];
}

function calcularImpostosTotal(receita: number) {
  return IMPOSTOS_MOCK.filter(i => i.ativo).reduce((s, imp) => {
    switch (imp.tipo_calculo) {
      case 'ALIQUOTA_FIXA': return s + receita * ((imp.aliquota_pct ?? 0) / 100);
      case 'VALOR_FIXO_MENSAL': return s + (imp.valor_fixo ?? 0);
      case 'ALIQUOTA_PROGRESSIVA': {
        const faixa = (imp.faixas_progressivas ?? []).find(f => receita >= f.receita_min && (f.receita_max === null || receita <= (f.receita_max ?? Infinity)));
        return s + (faixa ? receita * (faixa.aliquota / 100) - faixa.deducao : 0);
      }
      default: return s;
    }
  }, 0);
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, icon: Icon, trend }: {
  label: string; value: string; sub?: string; color: string; icon: React.ElementType; trend?: 'up' | 'down';
}) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 p-4`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={16}/>
        </div>
        {trend && (trend === 'up'
          ? <TrendingUp size={14} className="text-emerald-500"/>
          : <TrendingDown size={14} className="text-red-500"/>
        )}
      </div>
      <p className="text-xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Linha da tabela de produtos ───────────────────────────────────────────────
const PRODUTOS_MOCK = [
  { id: 'prod-1', nome: 'Plano Pro',    receita: 42000, custo_direto: 8400,  custo_indireto: 3200 },
  { id: 'prod-2', nome: 'Plano Básico', receita: 25000, custo_direto: 6250,  custo_indireto: 1900 },
  { id: 'prod-3', nome: 'Plano Elite',  receita: 18000, custo_direto: 2700,  custo_indireto: 1400 },
];

function corMargem(pct: number) {
  if (pct >= 30) return 'text-emerald-600 bg-emerald-50';
  if (pct >= 10) return 'text-amber-600 bg-amber-50';
  return 'text-red-600 bg-red-50';
}

// ── Etapas do fechamento ──────────────────────────────────────────────────────
const ETAPAS_FECHAMENTO = [
  'Coletando dados de receita…',
  'Avaliando nós da árvore de custos…',
  'Calculando impostos…',
  'Distribuindo custos por produto…',
  'Calculando margens…',
  'Salvando snapshot…',
];

// ── Principal ─────────────────────────────────────────────────────────────────
export default function AnaliseMargem() {
  const now = new Date();
  const [ano, setAno] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ctx, setCtx] = useState<ContextoCalculo>(CONTEXTO_PADRAO);
  const [loadingSnapshot, setLoadingSnapshot] = useState(true);
  const [fechando, setFechando] = useState(false);
  const [etapa, setEtapa] = useState(-1);
  const [fechado, setFechado] = useState(false);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  // Carrega snapshot do período selecionado
  useEffect(() => {
    setLoadingSnapshot(true);
    getSnapshot(ano, mes)
      .then(snap => {
        if (snap?.contexto_calculo) {
          const c = snap.contexto_calculo as Partial<ContextoCalculo>;
          setCtx(prev => ({ ...prev, ...c }));
        }
      })
      .catch(console.error)
      .finally(() => setLoadingSnapshot(false));
  }, [ano, mes]);

  const resultado = useMemo(() => simularArvore(NOS_MOCK, ARESTAS_MOCK, ctx), [ctx]);
  const impostosTotal = useMemo(() => calcularImpostosTotal(ctx.receita_bruta), [ctx]);
  const lucroLiq = ctx.receita_bruta - resultado.totais.custo_total_empresa - impostosTotal;
  const margemPct = ctx.receita_bruta > 0 ? (lucroLiq / ctx.receita_bruta * 100) : 0;
  const waterfall = buildWaterfallData(ctx.receita_bruta, resultado.totais.custo_total_empresa, impostosTotal);

  const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  async function fecharMes() {
    setFechando(true);
    setFechado(false);
    setEtapa(0);

    try {
      // Etapa 0: coletar dados
      await new Promise(r => setTimeout(r, 400));
      setEtapa(1);

      // Etapa 1: avaliar árvore de custos via RPC
      const [nosDB, arestasDB, impostosDB] = await Promise.all([getNos(), getArestas(), getImpostos()]);
      const arestasMap = arestasDB.reduce((m, a) => { (m[a.no_filho_id] = m[a.no_filho_id] || []).push(a.no_pai_id); return m; }, {} as Record<string, string[]>);
      const nosRaiz = nosDB.filter(n => !arestasMap[n.id]);
      const contexto: Record<string, unknown> = {
        total_assinantes: ctx.total_assinantes,
        receita_bruta: ctx.receita_bruta,
        total_pedidos: ctx.total_pedidos,
        volume_por_produto: {},
        receita_por_produto: {},
        receita_por_grupo: {},
      };
      let totalCustos = 0;
      try {
        const resultados = await Promise.all(nosRaiz.map(n => avaliarNoDB(n.id, contexto)));
        totalCustos = resultados.reduce((s, r) => s + (Number((r as Record<string, unknown>).valor) || 0), 0);
      } catch {
        // fallback to local engine
        totalCustos = resultado.totais.custo_total_empresa;
      }
      setEtapa(2);

      // Etapa 2: calcular impostos
      const totalImpostos = impostosDB.filter(i => i.ativo).reduce((s, imp) => {
        if (imp.tipo_calculo === 'ALIQUOTA_FIXA') return s + ctx.receita_bruta * ((imp.aliquota_pct ?? 0) / 100);
        if (imp.tipo_calculo === 'VALOR_FIXO_MENSAL') return s + (imp.valor_fixo ?? 0);
        return s;
      }, 0);
      setEtapa(3);
      await new Promise(r => setTimeout(r, 400));
      setEtapa(4);
      await new Promise(r => setTimeout(r, 400));
      setEtapa(5);

      // Etapa 5: salvar snapshot
      const lucroLiq = ctx.receita_bruta - totalCustos - totalImpostos;
      await upsertSnapshot({
        ano,
        mes,
        contexto_calculo: contexto,
        resultado_arvore: { totais: { custo_total_empresa: totalCustos } },
        receita_bruta: ctx.receita_bruta,
        total_custos: totalCustos,
        total_impostos: totalImpostos,
        lucro_liquido: lucroLiq,
        margem_liquida_pct: ctx.receita_bruta > 0 ? (lucroLiq / ctx.receita_bruta * 100) : 0,
      });
    } catch (e: unknown) {
      console.error('Erro ao fechar mês:', e);
    }

    setFechando(false);
    setFechado(true);
  }

  const mesLabel = `${MESES[mes - 1]} ${ano}`;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Análise de Margem</h1>
          <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1.5"><Calendar size={12}/> {mesLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={mes} onChange={e => setMes(Number(e.target.value))}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
            {['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <select value={ano} onChange={e => setAno(Number(e.target.value))}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400">
            {[2023, 2024, 2025, 2026].map(y => <option key={y}>{y}</option>)}
          </select>
          <button onClick={fecharMes} disabled={fechando}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-colors">
            {fechando ? <><Loader2 size={14} className="animate-spin"/> Processando…</> : <><Play size={14}/> Fechar Mês</>}
          </button>
        </div>
      </div>
      {loadingSnapshot && <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 size={14} className="animate-spin"/> Carregando dados do período…</div>}

      {/* Progresso do fechamento */}
      {(fechando || fechado) && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-bold text-slate-700 mb-3">{fechado ? '✅ Mês fechado com sucesso' : '⏳ Fechando mês…'}</p>
          <div className="space-y-1.5">
            {ETAPAS_FECHAMENTO.map((e, i) => (
              <div key={i} className={`flex items-center gap-2 text-xs ${i <= etapa ? 'text-emerald-600' : 'text-slate-300'}`}>
                {i < etapa || fechado ? <CheckCircle2 size={12}/> : i === etapa ? <span className="animate-spin">⏳</span> : <span className="w-3 h-3 rounded-full border border-current"/>}
                {e}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard label="Receita Bruta"   value={`R$ ${ctx.receita_bruta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}   color="bg-blue-100 text-blue-600"    icon={DollarSign}  trend="up"/>
        <KpiCard label="Custos Totais"   value={`R$ ${resultado.totais.custo_total_empresa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} color="bg-red-100 text-red-600"      icon={TrendingDown} trend="down"/>
        <KpiCard label="Impostos"        value={`R$ ${impostosTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}             color="bg-amber-100 text-amber-600"  icon={BarChart2}/>
        <KpiCard label="Lucro Líquido"   value={`R$ ${lucroLiq.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}             color="bg-emerald-100 text-emerald-600" icon={TrendingUp} trend={lucroLiq >= 0 ? 'up' : 'down'}/>
        <KpiCard label="Margem Líquida"  value={`${margemPct.toFixed(1)}%`}  sub="sobre receita bruta"                              color={margemPct >= 30 ? 'bg-emerald-100 text-emerald-600' : margemPct >= 10 ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'} icon={BarChart2}/>
      </div>

      {/* Waterfall */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-bold text-slate-700 mb-4">Demonstração de Resultado</h2>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={waterfall} margin={{ left: 40, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false}/>
            <YAxis tickFormatter={v => `R$ ${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} tickLine={false} axisLine={false}/>
            <Tooltip formatter={(v) => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}/>
            <ReferenceLine y={0} stroke="#94a3b8"/>
            <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
              {waterfall.map((entry, i) => (
                <Cell key={i} fill={entry.tipo === 'positivo' ? '#16a34a' : entry.tipo === 'negativo' ? '#dc2626' : '#2563eb'}/>
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Tabela por produto */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-700">Margem por Produto</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-400 border-b bg-slate-50">
              <th className="text-left px-5 py-3">Produto</th>
              <th className="text-right px-3 py-3">Receita</th>
              <th className="text-right px-3 py-3">Custo Direto</th>
              <th className="text-right px-3 py-3">Custo Indireto</th>
              <th className="text-right px-3 py-3">Imposto Alocado</th>
              <th className="text-right px-3 py-3">Margem R$</th>
              <th className="text-right px-5 py-3">Margem %</th>
            </tr>
          </thead>
          <tbody>
            {PRODUTOS_MOCK.map(prod => {
              const impAlocado = impostosTotal * (prod.receita / ctx.receita_bruta);
              const custoTotal = prod.custo_direto + prod.custo_indireto + impAlocado;
              const margem = prod.receita - custoTotal;
              const margemP = prod.receita > 0 ? (margem / prod.receita * 100) : 0;
              const expanded = expandidos.has(prod.id);

              return (
                <>
                  <tr key={prod.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <button onClick={() => setExpandidos(s => { const n = new Set(s); expanded ? n.delete(prod.id) : n.add(prod.id); return n; })}
                        className="flex items-center gap-2 text-left font-medium text-slate-800">
                        {expanded ? <ChevronDown size={13}/> : <ChevronRight size={13}/>}
                        {prod.nome}
                      </button>
                    </td>
                    <td className="text-right px-3 py-3 text-slate-700 font-mono">R$ {prod.receita.toLocaleString('pt-BR')}</td>
                    <td className="text-right px-3 py-3 text-red-600 font-mono">R$ {prod.custo_direto.toLocaleString('pt-BR')}</td>
                    <td className="text-right px-3 py-3 text-amber-600 font-mono">R$ {prod.custo_indireto.toLocaleString('pt-BR')}</td>
                    <td className="text-right px-3 py-3 text-slate-500 font-mono">R$ {impAlocado.toFixed(0)}</td>
                    <td className={`text-right px-3 py-3 font-bold font-mono ${margem >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>R$ {margem.toFixed(0)}</td>
                    <td className="text-right px-5 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${corMargem(margemP)}`}>{margemP.toFixed(1)}%</span>
                    </td>
                  </tr>
                  {expanded && (
                    <tr key={`${prod.id}-detail`} className="bg-slate-50">
                      <td colSpan={7} className="px-8 py-3">
                        <p className="text-xs font-semibold text-slate-500 mb-2">Detalhamento dos custos indiretos — trace da árvore</p>
                        <div className="space-y-1">
                          {Object.entries(resultado.nos).map(([nId, res]) => (
                            <div key={nId} className="flex items-center gap-2 text-xs">
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${res.gatilho_ativado ? 'bg-emerald-400' : 'bg-slate-200'}`}/>
                              <span className="font-medium text-slate-700 w-32 truncate">{res.no_nome}</span>
                              <span className="text-slate-400 flex-1 truncate font-mono">{res.trace}</span>
                              <span className="font-bold text-slate-600 font-mono">
                                R$ {(res.valor * (prod.receita / ctx.receita_bruta)).toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-800 text-white">
              <td className="px-5 py-3 font-bold text-sm">TOTAL</td>
              <td className="text-right px-3 py-3 font-bold font-mono">R$ {ctx.receita_bruta.toLocaleString('pt-BR')}</td>
              <td className="text-right px-3 py-3 font-mono">R$ {PRODUTOS_MOCK.reduce((s, p) => s + p.custo_direto, 0).toLocaleString('pt-BR')}</td>
              <td className="text-right px-3 py-3 font-mono">R$ {PRODUTOS_MOCK.reduce((s, p) => s + p.custo_indireto, 0).toLocaleString('pt-BR')}</td>
              <td className="text-right px-3 py-3 font-mono">R$ {impostosTotal.toFixed(0)}</td>
              <td className="text-right px-3 py-3 font-bold font-mono">R$ {lucroLiq.toFixed(0)}</td>
              <td className="text-right px-5 py-3">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${corMargem(margemPct)}`}>{margemPct.toFixed(1)}%</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
