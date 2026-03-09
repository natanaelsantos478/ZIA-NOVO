import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, Users, Clock, CheckCircle, DollarSign, Loader2,
  AlertTriangle, BarChart2, Package, Award,
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ComissaoLancamento {
  id: string;
  employee_id: string;
  pedido_id: string | null;
  produto_id: string | null;
  grupo_id: string | null;
  quantidade: number;
  valor_venda: number;
  comissao_pct: number;
  comissao_valor: number;
  regra_id: string | null;
  status: 'PENDENTE' | 'APROVADA' | 'PAGA' | 'CANCELADA';
  data_competencia: string;
  employees: { full_name: string; position_title: string | null } | null;
  erp_grupo_produtos: { nome: string } | null;
}

interface EscalonamentoFaixa {
  min_unidades?: number | null;
  max_unidades?: number | null;
  min_valor?: number | null;
  max_valor?: number | null;
  comissao_pct: number;
}

interface ComissaoRegra {
  id: string;
  employee_id: string;
  tipo_escalonamento: 'NENHUM' | 'POR_UNIDADES' | 'POR_VALOR';
  regras_escalonamento: EscalonamentoFaixa[] | null;
  employees: { full_name: string; position_title: string | null } | null;
}

interface RankingRow {
  employee_id: string;
  nome: string;
  cargo: string;
  pedidos: Set<string>;
  totalVendas: number;
  totalComissao: number;
  pendente: number;
  aprovada: number;
  paga: number;
}

interface GrupoRow {
  grupo_id: string | null;
  nomeGrupo: string;
  totalVendas: number;
  totalComissao: number;
  totalComissaoPct: number;
  count: number;
  itens: number;
}

interface EscalonamentoProgress {
  employee_id: string;
  nome: string;
  cargo: string;
  regra_id: string;
  tipo: 'POR_UNIDADES' | 'POR_VALOR';
  faixas: EscalonamentoFaixa[];
  valorAtual: number;  // sum of quantidade or valor_venda this month
  faixaAtual: EscalonamentoFaixa | null;
  proximaFaixa: EscalonamentoFaixa | null;
  progresso: number;   // 0–100
}

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtPct(v: number) {
  return v.toFixed(1) + '%';
}

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                 'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// ── KPI Card ──────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: 'amber' | 'blue' | 'emerald' | 'slate';
  sub?: string;
}

const COLOR_MAP = {
  amber:   { card: 'border-amber-200 bg-amber-50',   icon: 'bg-amber-100 text-amber-600',   val: 'text-amber-700' },
  blue:    { card: 'border-blue-200 bg-blue-50',     icon: 'bg-blue-100 text-blue-600',     val: 'text-blue-700' },
  emerald: { card: 'border-emerald-200 bg-emerald-50', icon: 'bg-emerald-100 text-emerald-600', val: 'text-emerald-700' },
  slate:   { card: 'border-slate-200 bg-slate-50',   icon: 'bg-slate-100 text-slate-600',   val: 'text-slate-700' },
};

function KpiCard({ label, value, icon, color, sub }: KpiCardProps) {
  const c = COLOR_MAP[color];
  return (
    <div className={`rounded-xl border shadow-sm p-5 flex items-start gap-4 ${c.card}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${c.icon}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</p>
        <p className={`text-2xl font-bold ${c.val}`}>{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Section Header ─────────────────────────────────────────────────────────────

function SectionHeader({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="text-slate-400">{icon}</div>
      <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
    </div>
  );
}

// ── Horizontal Bar ─────────────────────────────────────────────────────────────

function HBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
      <div
        className={`h-2 rounded-full transition-all ${color}`}
        style={{ width: `${Math.min(100, pct)}%` }}
      />
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AnalisesComissao() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());

  const [lancamentos, setLancamentos] = useState<ComissaoLancamento[]>([]);
  const [regras, setRegras] = useState<ComissaoRegra[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    const mesStr = String(mes).padStart(2, '0');
    const from = `${ano}-${mesStr}-01`;
    const to   = `${ano}-${mesStr}-31`;

    const [{ data: lanc }, { data: regs }] = await Promise.all([
      supabase
        .from('erp_comissoes_lancamentos')
        .select('*, employees(full_name, position_title), erp_grupo_produtos(nome)')
        .gte('data_competencia', from)
        .lte('data_competencia', to),
      supabase
        .from('erp_comissoes_funcionario_produto')
        .select('id, employee_id, tipo_escalonamento, regras_escalonamento, employees(full_name, position_title)')
        .neq('tipo_escalonamento', 'NENHUM'),
    ]);

    setLancamentos((lanc ?? []) as unknown as ComissaoLancamento[]);
    setRegras((regs ?? []) as unknown as ComissaoRegra[]);
    setLoading(false);
  }, [mes, ano]);

  useEffect(() => { load(); }, [load]);

  // ── KPI calculations ──────────────────────────────────────────────────────

  const totalPendente = lancamentos.filter(l => l.status === 'PENDENTE').reduce((s, l) => s + l.comissao_valor, 0);
  const totalAprovada = lancamentos.filter(l => l.status === 'APROVADA').reduce((s, l) => s + l.comissao_valor, 0);
  const totalPaga     = lancamentos.filter(l => l.status === 'PAGA').reduce((s, l) => s + l.comissao_valor, 0);

  const employeesComPendencia = new Set(
    lancamentos.filter(l => l.status === 'PENDENTE').map(l => l.employee_id)
  ).size;

  // ── Ranking por vendedor ──────────────────────────────────────────────────

  const rankingMap = new Map<string, RankingRow>();
  for (const l of lancamentos) {
    if (!rankingMap.has(l.employee_id)) {
      rankingMap.set(l.employee_id, {
        employee_id: l.employee_id,
        nome: l.employees?.full_name ?? 'Desconhecido',
        cargo: l.employees?.position_title ?? '—',
        pedidos: new Set(),
        totalVendas: 0,
        totalComissao: 0,
        pendente: 0,
        aprovada: 0,
        paga: 0,
      });
    }
    const row = rankingMap.get(l.employee_id)!;
    if (l.pedido_id) row.pedidos.add(l.pedido_id);
    row.totalVendas += l.valor_venda;
    row.totalComissao += l.comissao_valor;
    if (l.status === 'PENDENTE') row.pendente += l.comissao_valor;
    if (l.status === 'APROVADA') row.aprovada += l.comissao_valor;
    if (l.status === 'PAGA')     row.paga     += l.comissao_valor;
  }
  const ranking = Array.from(rankingMap.values()).sort((a, b) => b.totalComissao - a.totalComissao);
  const maxComissao = ranking[0]?.totalComissao ?? 1;

  // ── Por grupo de produto ──────────────────────────────────────────────────

  const grupoMap = new Map<string | null, GrupoRow>();
  for (const l of lancamentos) {
    const key = l.grupo_id ?? '__sem_grupo__';
    if (!grupoMap.has(key)) {
      grupoMap.set(key, {
        grupo_id: l.grupo_id,
        nomeGrupo: l.erp_grupo_produtos?.nome ?? 'Sem grupo',
        totalVendas: 0,
        totalComissao: 0,
        totalComissaoPct: 0,
        count: 0,
        itens: 0,
      });
    }
    const row = grupoMap.get(key)!;
    row.totalVendas += l.valor_venda;
    row.totalComissao += l.comissao_valor;
    row.totalComissaoPct += l.comissao_pct;
    row.count++;
    row.itens += l.quantidade;
  }
  const grupos = Array.from(grupoMap.values())
    .map(g => ({ ...g, pctMedia: g.count > 0 ? g.totalComissaoPct / g.count : 0 }))
    .sort((a, b) => b.totalComissao - a.totalComissao);
  const maxGrupoComissao = grupos[0]?.totalComissao ?? 1;

  // ── Escalonamento progress ────────────────────────────────────────────────

  const escaloList: EscalonamentoProgress[] = [];

  for (const regra of regras) {
    if (!regra.regras_escalonamento || regra.regras_escalonamento.length === 0) continue;

    const empLanc = lancamentos.filter(l => l.employee_id === regra.employee_id);
    const valorAtual = regra.tipo_escalonamento === 'POR_UNIDADES'
      ? empLanc.reduce((s, l) => s + l.quantidade, 0)
      : empLanc.reduce((s, l) => s + l.valor_venda, 0);

    const faixas = [...regra.regras_escalonamento].sort((a, b) => {
      const aMin = regra.tipo_escalonamento === 'POR_UNIDADES' ? (a.min_unidades ?? 0) : (a.min_valor ?? 0);
      const bMin = regra.tipo_escalonamento === 'POR_UNIDADES' ? (b.min_unidades ?? 0) : (b.min_valor ?? 0);
      return aMin - bMin;
    });

    let faixaAtual: EscalonamentoFaixa | null = null;
    let proximaFaixa: EscalonamentoFaixa | null = null;

    for (let i = 0; i < faixas.length; i++) {
      const f = faixas[i];
      const min = regra.tipo_escalonamento === 'POR_UNIDADES' ? (f.min_unidades ?? 0) : (f.min_valor ?? 0);
      const max = regra.tipo_escalonamento === 'POR_UNIDADES' ? (f.max_unidades ?? null) : (f.max_valor ?? null);

      if (valorAtual >= min && (max === null || valorAtual <= max)) {
        faixaAtual = f;
        proximaFaixa = faixas[i + 1] ?? null;
        break;
      }
      if (valorAtual < min) {
        proximaFaixa = f;
        break;
      }
    }

    let progresso = 0;
    if (proximaFaixa) {
      const proxMin = regra.tipo_escalonamento === 'POR_UNIDADES'
        ? (proximaFaixa.min_unidades ?? 0)
        : (proximaFaixa.min_valor ?? 0);
      const prevMin = faixaAtual
        ? (regra.tipo_escalonamento === 'POR_UNIDADES' ? (faixaAtual.min_unidades ?? 0) : (faixaAtual.min_valor ?? 0))
        : 0;
      const range = proxMin - prevMin;
      progresso = range > 0 ? ((valorAtual - prevMin) / range) * 100 : 0;
    } else {
      progresso = 100;
    }

    escaloList.push({
      employee_id: regra.employee_id,
      nome: regra.employees?.full_name ?? 'Desconhecido',
      cargo: regra.employees?.position_title ?? '—',
      regra_id: regra.id,
      tipo: regra.tipo_escalonamento as 'POR_UNIDADES' | 'POR_VALOR',
      faixas,
      valorAtual,
      faixaAtual,
      proximaFaixa,
      progresso: Math.max(0, Math.min(100, progresso)),
    });
  }

  // deduplicate by employee (keep highest progress)
  const escaloMap = new Map<string, EscalonamentoProgress>();
  for (const ep of escaloList) {
    const existing = escaloMap.get(ep.employee_id);
    if (!existing || ep.progresso > existing.progresso) {
      escaloMap.set(ep.employee_id, ep);
    }
  }
  const escaloFinal = Array.from(escaloMap.values()).sort((a, b) => b.progresso - a.progresso);

  function progressColor(pct: number) {
    if (pct >= 90) return 'bg-red-500';
    if (pct >= 60) return 'bg-amber-500';
    return 'bg-emerald-500';
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4 justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart2 className="w-5 h-5 text-emerald-600" />
            <h1 className="text-xl font-bold text-slate-900">Análises de Comissão</h1>
          </div>
          <p className="text-sm text-slate-500">Visão consolidada de comissões por período</p>
        </div>

        <div className="flex items-center gap-2">
          <select
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            value={mes}
            onChange={e => setMes(+e.target.value)}
          >
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            value={ano}
            onChange={e => setAno(+e.target.value)}
          >
            {[2023, 2024, 2025, 2026].map(y => <option key={y}>{y}</option>)}
          </select>
          {loading && <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Comissões Pendentes"
          value={fmtBRL(totalPendente)}
          icon={<Clock className="w-5 h-5" />}
          color="amber"
          sub="Aguardando aprovação"
        />
        <KpiCard
          label="Aprovadas a Pagar"
          value={fmtBRL(totalAprovada)}
          icon={<CheckCircle className="w-5 h-5" />}
          color="blue"
          sub="Aprovadas, não pagas"
        />
        <KpiCard
          label="Pagas no Mês"
          value={fmtBRL(totalPaga)}
          icon={<DollarSign className="w-5 h-5" />}
          color="emerald"
          sub={`${MONTHS[mes - 1]} / ${ano}`}
        />
        <KpiCard
          label="Vendedores com Pendência"
          value={String(employeesComPendencia)}
          icon={<Users className="w-5 h-5" />}
          color="slate"
          sub="Colaboradores únicos"
        />
      </div>

      {/* Ranking por vendedor */}
      <div>
        <SectionHeader label="Ranking por Vendedor" icon={<Award className="w-4 h-4" />} />
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-emerald-500" /></div>
          ) : ranking.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-sm">Nenhum dado para o período selecionado</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Vendedor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Cargo</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Pedidos</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Total Vendas</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Comissão Total</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase min-w-[140px]">Distribuição</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Pendente</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Paga</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ranking.map((row, idx) => (
                  <tr key={row.employee_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-400 font-bold text-xs">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{row.nome}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{row.cargo}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{row.pedidos.size}</td>
                    <td className="px-4 py-3 text-right text-slate-700 font-medium">{fmtBRL(row.totalVendas)}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700">{fmtBRL(row.totalComissao)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <HBar pct={(row.totalComissao / maxComissao) * 100} color="bg-emerald-500" />
                        <span className="text-xs text-slate-400 w-8 shrink-0">
                          {fmtPct((row.totalComissao / maxComissao) * 100)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.pendente > 0 ? (
                        <span className="text-amber-600 font-medium text-xs">{fmtBRL(row.pendente)}</span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.paga > 0 ? (
                        <span className="text-emerald-600 font-medium text-xs">{fmtBRL(row.paga)}</span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Por grupo de produto */}
      <div>
        <SectionHeader label="Por Grupo de Produto" icon={<Package className="w-4 h-4" />} />
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-emerald-500" /></div>
          ) : grupos.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">Nenhum dado de grupo para o período</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Grupo</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Total Vendas</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Total Comissão</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">% Médio</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Itens Vendidos</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase min-w-[120px]">Participação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {grupos.map(g => (
                  <tr key={g.grupo_id ?? '__sem__'} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{g.nomeGrupo}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{fmtBRL(g.totalVendas)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700">{fmtBRL(g.totalComissao)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{fmtPct(g.pctMedia)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{g.itens.toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-3">
                      <HBar pct={(g.totalComissao / maxGrupoComissao) * 100} color="bg-blue-500" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Análise de escalonamento */}
      <div>
        <SectionHeader label="Análise de Escalonamento — Quem está perto de subir de faixa?" icon={<TrendingUp className="w-4 h-4" />} />

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-emerald-500" /></div>
        ) : escaloFinal.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center text-slate-400">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm">Nenhum colaborador com regra de escalonamento ativa no período</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {escaloFinal.map(ep => {
              const isUnidades = ep.tipo === 'POR_UNIDADES';
              const proxMin = ep.proximaFaixa
                ? (isUnidades ? ep.proximaFaixa.min_unidades : ep.proximaFaixa.min_valor)
                : null;
              const falta = (proxMin !== null && proxMin !== undefined) ? Math.max(0, proxMin - ep.valorAtual) : null;
              const pColor = progressColor(ep.progresso);

              return (
                <div key={`${ep.employee_id}-${ep.regra_id}`} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{ep.nome}</p>
                      <p className="text-xs text-slate-500">{ep.cargo}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      ep.progresso >= 90 ? 'bg-red-100 text-red-700' :
                      ep.progresso >= 60 ? 'bg-amber-100 text-amber-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {fmtPct(ep.progresso)}
                    </span>
                  </div>

                  {/* Current tier */}
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span>
                      Faixa atual:{' '}
                      <span className="font-semibold text-emerald-700">
                        {ep.faixaAtual ? fmtPct(ep.faixaAtual.comissao_pct) : '—'}
                      </span>
                    </span>
                    {ep.proximaFaixa && (
                      <span>
                        Próxima:{' '}
                        <span className="font-semibold text-blue-700">{fmtPct(ep.proximaFaixa.comissao_pct)}</span>
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden mb-3">
                    <div
                      className={`h-3 rounded-full transition-all ${pColor}`}
                      style={{ width: `${Math.min(100, ep.progresso)}%` }}
                    />
                  </div>

                  {/* Value label */}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">
                      Atual:{' '}
                      <span className="font-semibold text-slate-800">
                        {isUnidades
                          ? `${ep.valorAtual.toLocaleString('pt-BR')} un.`
                          : fmtBRL(ep.valorAtual)}
                      </span>
                    </span>
                    {falta !== null && falta > 0 ? (
                      <span className="text-slate-400">
                        Faltam{' '}
                        <span className={`font-semibold ${ep.progresso >= 90 ? 'text-red-600' : ep.progresso >= 60 ? 'text-amber-600' : 'text-slate-600'}`}>
                          {isUnidades
                            ? `${falta.toLocaleString('pt-BR')} un.`
                            : fmtBRL(falta)}
                        </span>
                      </span>
                    ) : ep.proximaFaixa === null ? (
                      <span className="text-emerald-600 font-semibold text-xs">Faixa máxima atingida</span>
                    ) : null}
                  </div>

                  {/* Faixas summary */}
                  {ep.faixas.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="flex flex-wrap gap-1">
                        {ep.faixas.map((f, fi) => {
                          const min = isUnidades ? (f.min_unidades ?? 0) : (f.min_valor ?? 0);
                          const isCurrent = ep.faixaAtual?.comissao_pct === f.comissao_pct &&
                            (isUnidades ? ep.faixaAtual?.min_unidades === f.min_unidades : ep.faixaAtual?.min_valor === f.min_valor);
                          return (
                            <span key={fi} className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                              isCurrent ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}>
                              {isUnidades ? `≥${min}un` : `≥${fmtBRL(min)}`} → {fmtPct(f.comissao_pct)}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
