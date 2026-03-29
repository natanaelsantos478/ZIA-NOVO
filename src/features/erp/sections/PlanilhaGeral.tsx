// ERP — Planilha Geral (Vendas / Pedidos / Fretes) — dados reais do banco
import { useState, useEffect, useMemo } from 'react';
import { BarChart2, ListChecks, Truck, Download, Search, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import { getPedidos } from '../../../lib/erp';
import type { ErpPedido } from '../../../lib/erp';

export type PlanilhaTipo = 'vendas' | 'pedidos' | 'propostas' | 'fretes';

const BRL = (v: number) => (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d: string) => d ? new Date(d + 'T00:00').toLocaleDateString('pt-BR') : '—';

const STATUS_BADGE: Record<string, string> = {
  RASCUNHO:   'bg-yellow-100 text-yellow-700',
  CONFIRMADO: 'bg-blue-100 text-blue-700',
  FATURADO:   'bg-green-100 text-green-700',
  CANCELADO:  'bg-red-100 text-red-600',
  REALIZADO:  'bg-emerald-100 text-emerald-700',
};

const COLOR = {
  emerald: { btn: 'bg-emerald-600 hover:bg-emerald-700 text-white', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  blue:    { btn: 'bg-blue-600 hover:bg-blue-700 text-white',       text: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200' },
  amber:   { btn: 'bg-amber-600 hover:bg-amber-700 text-white',     text: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200' },
} as const;

const PAGE_SIZE = 25;

interface Props { tipo: PlanilhaTipo }

export default function PlanilhaGeral({ tipo }: Props) {
  const [todos, setTodos]     = useState<ErpPedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro]       = useState('');
  const [busca, setBusca]     = useState('');
  const [sortCol, setSortCol] = useState(0);
  const [sortAsc, setSortAsc] = useState(false);
  const [pagina, setPagina]   = useState(1);

  useEffect(() => {
    setLoading(true);
    getPedidos()
      .then(setTodos)
      .catch(e => setErro(e.message))
      .finally(() => setLoading(false));
  }, []);

  // ── Dados filtrados por tipo ───────────────────────────────────────────────
  const rows = useMemo(() => {
    switch (tipo) {
      case 'vendas':
        return todos.filter(p => p.tipo === 'VENDA' && ['FATURADO', 'REALIZADO'].includes(p.status));
      case 'pedidos':
        return todos;
      case 'fretes':
        return todos.filter(p => (p.frete_valor ?? 0) > 0);
      default:
        return todos;
    }
  }, [todos, tipo]);

  // ── Config por tipo ────────────────────────────────────────────────────────
  const cfg = useMemo(() => {
    switch (tipo) {
      case 'vendas': return {
        icon: BarChart2, label: 'Planilha Geral — Vendas', color: 'emerald' as const,
        columns: ['Nº', 'Data', 'Cliente', 'Tipo', 'Total', 'Condição Pgto', 'Status'],
        kpis: [
          { label: 'Total de Vendas',   value: BRL(rows.reduce((s, p) => s + p.total_pedido, 0)),         color: 'emerald' },
          { label: 'Ticket Médio',      value: BRL(rows.length ? rows.reduce((s, p) => s + p.total_pedido, 0) / rows.length : 0), color: 'blue' },
          { label: 'Nº de Vendas',      value: rows.length.toString(),                                    color: 'amber' },
        ],
      };
      case 'pedidos': return {
        icon: ListChecks, label: 'Planilha Geral — Pedidos', color: 'blue' as const,
        columns: ['Nº', 'Data', 'Cliente', 'Tipo', 'Total', 'Condição Pgto', 'Status'],
        kpis: [
          { label: 'Total em Pedidos',  value: BRL(rows.reduce((s, p) => s + p.total_pedido, 0)),         color: 'blue' },
          { label: 'Pedidos Ativos',    value: rows.filter(p => p.status !== 'CANCELADO').length.toString(), color: 'emerald' },
          { label: 'Aguardando',        value: rows.filter(p => p.status === 'CONFIRMADO').length.toString(), color: 'amber' },
        ],
      };
      case 'fretes': return {
        icon: Truck, label: 'Planilha Geral — Fretes', color: 'amber' as const,
        columns: ['Nº', 'Data', 'Cliente', 'Tipo Pedido', 'Frete (R$)', 'Total Pedido', 'Status'],
        kpis: [
          { label: 'Total em Fretes',   value: BRL(rows.reduce((s, p) => s + (p.frete_valor ?? 0), 0)),   color: 'amber' },
          { label: 'Pedidos c/ Frete',  value: rows.length.toString(),                                    color: 'blue' },
          { label: 'Frete Médio',       value: BRL(rows.length ? rows.reduce((s, p) => s + (p.frete_valor ?? 0), 0) / rows.length : 0), color: 'emerald' },
        ],
      };
      default: return {
        icon: ListChecks, label: 'Planilha', color: 'blue' as const,
        columns: ['Nº', 'Data', 'Cliente', 'Tipo', 'Total', 'Condição Pgto', 'Status'],
        kpis: [],
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo, rows]);

  const Icon = cfg.icon;
  const colColor = COLOR[cfg.color];

  function renderRow(p: ErpPedido): (string | number)[] {
    const num = `PV-${String(p.numero).padStart(4, '0')}`;
    const cliente = p.erp_clientes?.nome ?? '—';
    switch (tipo) {
      case 'fretes':
        return [num, fmtDate(p.data_emissao), cliente, p.tipo, p.frete_valor ?? 0, p.total_pedido, p.status];
      default:
        return [num, fmtDate(p.data_emissao), cliente, p.tipo, p.total_pedido, p.condicao_pagamento ?? '—', p.status];
    }
  }

  const filtered = useMemo(() => {
    if (!busca) return rows;
    const q = busca.toLowerCase();
    return rows.filter(p =>
      (p.erp_clientes?.nome ?? '').toLowerCase().includes(q) ||
      String(p.numero).includes(q) ||
      p.status.toLowerCase().includes(q),
    );
  }, [busca, rows]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginaSegura = Math.min(pagina, totalPages);
  const pageRows = filtered.slice((paginaSegura - 1) * PAGE_SIZE, paginaSegura * PAGE_SIZE);

  function handleSort(i: number) {
    if (sortCol === i) setSortAsc(!sortAsc);
    else { setSortCol(i); setSortAsc(true); }
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Icon className={`w-5 h-5 ${colColor.text}`} /> {cfg.label}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Visão tabular com filtros</p>
        </div>
        <button className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${colColor.btn}`}>
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {cfg.kpis.map(k => (
          <div key={k.label} className={`border rounded-xl p-4 ${COLOR[k.color as keyof typeof COLOR]?.bg ?? 'bg-slate-50 border-slate-200'}`}>
            <div className={`text-lg font-bold ${COLOR[k.color as keyof typeof COLOR]?.text ?? 'text-slate-700'}`}>{k.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Busca */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Filtrar por cliente, nº ou status…" value={busca} onChange={e => { setBusca(e.target.value); setPagina(1); }} />
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></div>
        ) : erro ? (
          <div className="text-center py-10 text-red-500 text-sm">{erro}</div>
        ) : (
          <>
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {cfg.columns.map((col, i) => (
                      <th key={col}
                        className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 select-none whitespace-nowrap"
                        onClick={() => handleSort(i)}>
                        <div className="flex items-center gap-1">
                          {col}
                          {sortCol === i ? (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : null}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageRows.length === 0 ? (
                    <tr><td colSpan={cfg.columns.length} className="px-4 py-10 text-center text-slate-400">Nenhum registro encontrado.</td></tr>
                  ) : pageRows.map(p => {
                    const cells = renderRow(p);
                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        {cells.map((cell, ci) => (
                          <td key={ci} className="px-4 py-3 whitespace-nowrap">
                            {typeof cell === 'string' && STATUS_BADGE[cell] ? (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[cell]}`}>{cell}</span>
                            ) : typeof cell === 'number' && ci >= 4 ? (
                              <span className="font-medium text-slate-800">{BRL(cell)}</span>
                            ) : (
                              <span className="text-slate-700">{String(cell)}</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Paginação */}
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>{filtered.length} registro(s) · página {paginaSegura} de {totalPages}</span>
              <div className="flex gap-1">
                <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={paginaSegura === 1}
                  className="px-2 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors">
                  ‹ Anterior
                </button>
                <button onClick={() => setPagina(p => Math.min(totalPages, p + 1))} disabled={paginaSegura === totalPages}
                  className="px-2 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition-colors">
                  Próxima ›
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function PlanilhaVendas()  { return <PlanilhaGeral tipo="vendas" />; }
export function PlanilhaPedidos() { return <PlanilhaGeral tipo="pedidos" />; }
export function PlanilhaFretes()  { return <PlanilhaGeral tipo="fretes" />; }
