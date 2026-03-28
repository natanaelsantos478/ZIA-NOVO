// ERP — Planilha Geral (Vendas / Pedidos / Propostas / Fretes)
// Este componente é reutilizado para as 4 planilhas — diferenciado pelo prop `tipo`
import { useState, useMemo, useEffect } from 'react';
import {
  BarChart2, ListChecks, FileSearch, Truck,
  Download, Filter, Search, ChevronUp, ChevronDown, RefreshCw,
} from 'lucide-react';
import { getPedidos, type ErpPedido } from '../../../lib/erp';
import { getAllNegociacoes, type NegociacaoData } from '../../crm/data/crmData';

export type PlanilhaTipo = 'vendas' | 'pedidos' | 'propostas' | 'fretes';

// ── Interfaces de linha ────────────────────────────────────────────────────────

interface LinhaVenda {
  id: string; data: string; cliente: string; vendedor: string; produto: string;
  quantidade: number; valorUnitario: number; desconto: number; total: number;
  status: string; filial: string;
}

interface LinhaPedido {
  id: string; numero: string; data: string; cliente: string; tipo: string;
  itens: number; valor: number; status: string; previsaoEntrega: string; filial: string;
}

interface LinhaProposta {
  id: string; numero: string; data: string; cliente: string; titulo: string;
  valor: number; validade: string; status: string; responsavel: string; conversao: string;
}

interface LinhaFrete {
  id: string; numero: string; data: string; cliente: string; origem: string;
  destino: string; transportadora: string; peso: number; valor: number;
  status: string; prazoEntrega: string;
}

// ── Mapeadores de dados reais ──────────────────────────────────────────────────

function pedidoToVenda(p: ErpPedido): LinhaVenda {
  return {
    id: p.id,
    data: p.data_emissao,
    cliente: p.erp_clientes?.nome ?? '—',
    vendedor: '—',
    produto: '—',
    quantidade: 1,
    valorUnitario: p.total_produtos,
    desconto: p.desconto_global_pct,
    total: p.total_pedido,
    status: p.status,
    filial: '—',
  };
}

function pedidoToPedido(p: ErpPedido): LinhaPedido {
  return {
    id: p.id,
    numero: `PV-${String(p.numero).padStart(4, '0')}`,
    data: p.data_emissao,
    cliente: p.erp_clientes?.nome ?? '—',
    tipo: p.tipo,
    itens: 1,
    valor: p.total_pedido,
    status: p.status,
    previsaoEntrega: p.data_entrega_prevista ?? '—',
    filial: '—',
  };
}

const NEG_STATUS_MAP: Record<string, string> = {
  aberta:   'EM_NEGOCIACAO',
  ganha:    'APROVADA',
  perdida:  'RECUSADA',
  suspensa: 'SUSPENSA',
};

function negToConversao(prob: number | null | undefined): string {
  if (!prob) return '—';
  if (prob >= 70) return 'Alta';
  if (prob >= 40) return 'Média';
  return 'Baixa';
}

function negToProposta(d: NegociacaoData): LinhaProposta {
  const n = d.negociacao;
  return {
    id: n.id,
    numero: `NEG-${n.id.slice(0, 6).toUpperCase()}`,
    data: n.dataCriacao,
    cliente: n.clienteNome,
    titulo: n.descricao ?? '—',
    valor: n.valor_estimado ?? 0,
    validade: '—',
    status: NEG_STATUS_MAP[n.status] ?? n.status,
    responsavel: n.responsavel || '—',
    conversao: negToConversao(n.probabilidade),
  };
}

// ── Config por tipo (sem dados estáticos) ──────────────────────────────────────

const TIPO_CONFIG = {
  vendas: {
    icon: BarChart2,
    label: 'Planilha Geral — Vendas',
    color: 'emerald',
    columns: ['Data', 'Cliente', 'Vendedor', 'Produto', 'Qtd', 'V. Unit.', 'Desc. %', 'Total', 'Status', 'Filial'],
    kpis: (d: LinhaVenda[]) => [
      { label: 'Total de Vendas', value: d.reduce((s, r) => s + r.total, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), color: 'emerald' },
      { label: 'Média por Venda', value: (d.reduce((s, r) => s + r.total, 0) / Math.max(d.length, 1)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), color: 'blue' },
      { label: 'Nº de Vendas', value: d.length.toString(), color: 'violet' },
    ],
  },
  pedidos: {
    icon: ListChecks,
    label: 'Planilha Geral — Pedidos',
    color: 'blue',
    columns: ['Número', 'Data', 'Cliente', 'Tipo', 'Itens', 'Valor', 'Status', 'Prev. Entrega', 'Filial'],
    kpis: (d: LinhaPedido[]) => [
      { label: 'Total em Pedidos', value: d.reduce((s, r) => s + r.valor, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), color: 'blue' },
      { label: 'Pedidos Ativos', value: d.filter(r => r.status !== 'CANCELADO').length.toString(), color: 'emerald' },
      { label: 'Aguardando', value: d.filter(r => r.status === 'CONFIRMADO').length.toString(), color: 'amber' },
    ],
  },
  propostas: {
    icon: FileSearch,
    label: 'Planilha Geral — Propostas',
    color: 'violet',
    columns: ['Número', 'Data', 'Cliente', 'Título', 'Valor', 'Validade', 'Status', 'Responsável', 'Conversão'],
    kpis: (d: LinhaProposta[]) => [
      { label: 'Pipeline Total', value: d.reduce((s, r) => s + r.valor, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), color: 'violet' },
      { label: 'Propostas Abertas', value: d.filter(r => ['EM_NEGOCIACAO', 'ENVIADA'].includes(r.status)).length.toString(), color: 'amber' },
      { label: 'Aprovadas', value: d.filter(r => r.status === 'APROVADA').length.toString(), color: 'green' },
    ],
  },
  fretes: {
    icon: Truck,
    label: 'Planilha Geral — Fretes',
    color: 'amber',
    columns: ['Número', 'Data', 'Cliente', 'Origem', 'Destino', 'Transportadora', 'Peso (kg)', 'Valor', 'Status', 'Previsão'],
    kpis: (d: LinhaFrete[]) => [
      { label: 'Total em Fretes', value: d.reduce((s, r) => s + r.valor, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), color: 'amber' },
      { label: 'Em Trânsito', value: d.filter(r => r.status === 'EM_TRANSITO').length.toString(), color: 'blue' },
      { label: 'Peso Total (kg)', value: d.reduce((s, r) => s + r.peso, 0).toFixed(1), color: 'slate' },
    ],
  },
};

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface Props { tipo: PlanilhaTipo }

export default function PlanilhaGeral({ tipo }: Props) {
  const cfg = TIPO_CONFIG[tipo];
  const Icon = cfg.icon;

  const [busca, setBusca] = useState('');
  const [sortCol, setSortCol] = useState(0);
  const [sortAsc, setSortAsc] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setRows([]);

    const load = async () => {
      try {
        if (tipo === 'vendas') {
          const pedidos = await getPedidos('VENDA');
          setRows(pedidos.map(pedidoToVenda));
        } else if (tipo === 'pedidos') {
          const pedidos = await getPedidos();
          setRows(pedidos.map(pedidoToPedido));
        } else if (tipo === 'propostas') {
          const negs = await getAllNegociacoes();
          setRows(negs.map(negToProposta));
        } else {
          // fretes: sem tabela ainda
          setRows([]);
        }
      } catch {
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [tipo]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kpis = (cfg.kpis as any)(rows);

  const COLOR = {
    emerald: { btn: 'bg-emerald-600 text-white hover:bg-emerald-700', text: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
    blue:    { btn: 'bg-blue-600 text-white hover:bg-blue-700',       text: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200' },
    violet:  { btn: 'bg-violet-600 text-white hover:bg-violet-700',   text: 'text-violet-700',  bg: 'bg-violet-50 border-violet-200' },
    amber:   { btn: 'bg-amber-600 text-white hover:bg-amber-700',     text: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200' },
    slate:   { btn: 'bg-slate-600 text-white hover:bg-slate-700',     text: 'text-slate-700',   bg: 'bg-slate-50 border-slate-200' },
    green:   { btn: 'bg-green-600 text-white hover:bg-green-700',     text: 'text-green-700',   bg: 'bg-green-50 border-green-200' },
  } as const;

  const colColor = COLOR[cfg.color as keyof typeof COLOR];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function renderRow(row: any) {
    switch (tipo) {
      case 'vendas': {
        const r = row as LinhaVenda;
        return [r.data, r.cliente, r.vendedor, r.produto, r.quantidade, BRL(r.valorUnitario), `${r.desconto}%`, BRL(r.total), r.status, r.filial];
      }
      case 'pedidos': {
        const r = row as LinhaPedido;
        return [r.numero, r.data, r.cliente, r.tipo, r.itens, BRL(r.valor), r.status, r.previsaoEntrega, r.filial];
      }
      case 'propostas': {
        const r = row as LinhaProposta;
        return [r.numero, r.data, r.cliente, r.titulo, BRL(r.valor), r.validade, r.status, r.responsavel, r.conversao];
      }
      case 'fretes': {
        const r = row as LinhaFrete;
        return [r.numero, r.data, r.cliente, r.origem, r.destino, r.transportadora, r.peso, BRL(r.valor), r.status, r.prazoEntrega];
      }
    }
  }

  const filteredRows = useMemo(() => {
    if (!busca) return rows;
    const q = busca.toLowerCase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return rows.filter((r: any) =>
      Object.values(r).some(v => String(v).toLowerCase().includes(q)),
    );
  }, [busca, rows]);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Icon className={`w-5 h-5 ${colColor.text}`} /> {cfg.label}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Visão tabular completa com filtros e exportação</p>
        </div>
        <button className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${colColor.btn}`}>
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {kpis.map((k: { label: string; value: string; color: string }) => (
          <div key={k.label} className={`border rounded-xl p-4 ${COLOR[k.color as keyof typeof COLOR]?.bg ?? 'bg-slate-50 border-slate-200'}`}>
            <div className={`text-lg font-bold ${COLOR[k.color as keyof typeof COLOR]?.text ?? 'text-slate-700'}`}>{k.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filtro */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Filtrar registros…"
            value={busca} onChange={e => setBusca(e.target.value)}
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">
          <Filter className="w-4 h-4" /> Filtros
        </button>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-400 text-sm">
            <RefreshCw className="w-4 h-4 animate-spin" /> Carregando…
          </div>
        ) : tipo === 'fretes' && rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Truck className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">Módulo de fretes em desenvolvimento</p>
            <p className="text-xs mt-1">A integração com transportadoras será disponibilizada em breve.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {cfg.columns.map((col, i) => (
                  <th
                    key={col}
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 select-none whitespace-nowrap"
                    onClick={() => { if (sortCol === i) setSortAsc(!sortAsc); else { setSortCol(i); setSortAsc(true); } }}
                  >
                    <div className="flex items-center gap-1">
                      {col}
                      {sortCol === i ? (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : null}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.length === 0 && (
                <tr><td colSpan={cfg.columns.length} className="px-4 py-8 text-center text-slate-400">Nenhum registro encontrado</td></tr>
              )}
              {filteredRows.map((row, ri) => {
                const cells = renderRow(row);
                return (
                  <tr key={row.id ?? ri} className="hover:bg-slate-50 transition-colors">
                    {cells.map((cell, ci) => (
                      <td key={ci} className="px-4 py-3 text-slate-700 whitespace-nowrap">
                        {typeof cell === 'string' && ['CONCLUIDA','APROVADA','ENTREGUE','FATURADO','Alta','Fechada'].includes(cell) ? (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">{cell}</span>
                        ) : typeof cell === 'string' && ['EM_TRANSITO','CONFIRMADO','EM_NEGOCIACAO','Média'].includes(cell) ? (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">{cell}</span>
                        ) : typeof cell === 'string' && ['PENDENTE','RASCUNHO','AGUARDANDO_COLETA','ATIVO'].includes(cell) ? (
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">{cell}</span>
                        ) : typeof cell === 'string' && ['CANCELADO','RECUSADA','SUSPENSA'].includes(cell) ? (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">{cell}</span>
                        ) : (
                          <span>{String(cell)}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}


export const PlanilhaVendas  = () => <PlanilhaGeral tipo="vendas" />;
export const PlanilhaPedidos = () => <PlanilhaGeral tipo="pedidos" />;
export const PlanilhaFretes  = () => <PlanilhaGeral tipo="fretes" />;
