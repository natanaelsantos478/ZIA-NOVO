// ─────────────────────────────────────────────────────────────────────────────
// Relatórios Avançados — Sistema de templates personalizáveis com canvas editor
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react';
import {
  FileText, Plus, Trash2, Edit3, Eye, Printer, Save,
  BarChart2, Table, Type, Minus, LayoutTemplate,
  ChevronUp, ChevronDown, X, Download, RefreshCw,
  TrendingUp, Users, DollarSign, Target, Star,
  Check,
} from 'lucide-react';
import {
  getClientes, getPedidos, getAtendimentos,
  type ErpCliente, type ErpPedido,
} from '../../../lib/erp';
import { getAllNegociacoes, type NegociacaoData } from '../data/crmData';

// ── Tipos ─────────────────────────────────────────────────────────────────────

type BlockType = 'title' | 'subtitle' | 'metrics' | 'table' | 'barchart' | 'text' | 'divider';

interface MetricItem { label: string; value: string; icon?: string; color?: string }
interface TableCol   { key: string; label: string }

interface ReportBlock {
  id: string;
  type: BlockType;
  // title / subtitle / text
  content?: string;
  // metrics
  metrics?: MetricItem[];
  // table
  columns?: TableCol[];
  rows?: Record<string, string>[];
  tableTitle?: string;
  // barchart
  chartTitle?: string;
  chartData?: { label: string; value: number; color?: string }[];
  maxValue?: number;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  preset: boolean;
  createdAt: string;
  blocks: ReportBlock[];
}

// ── Storage ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'zia_crm_report_templates_v1';

function loadTemplates(): ReportTemplate[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); } catch { return []; }
}
function saveTemplates(ts: ReportTemplate[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ts.filter(t => !t.preset)));
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 10); }
function fmtBRL(v: number) {
  return v >= 1_000_000 ? `R$ ${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000 ? `R$ ${(v / 1_000).toFixed(0)}k`
    : `R$ ${v.toFixed(0)}`;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  users:    <Users   className="w-5 h-5" />,
  dollar:   <DollarSign className="w-5 h-5" />,
  target:   <Target  className="w-5 h-5" />,
  trend:    <TrendingUp className="w-5 h-5" />,
  star:     <Star    className="w-5 h-5" />,
};

// ── Preset templates (blocks serão gerados com dados reais ao renderizar) ─────

function buildPresets(): ReportTemplate[] {
  return [
    {
      id: 'preset-pipeline', name: 'Pipeline de Vendas', preset: true, createdAt: '',
      description: 'Visão geral do funil: negociações por etapa, valor total e taxa de conversão',
      blocks: [
        { id: uid(), type: 'title', content: 'Pipeline de Vendas' },
        { id: uid(), type: 'metrics', metrics: [] },
        { id: uid(), type: 'barchart', chartTitle: 'Negociações por Etapa', chartData: [] },
        { id: uid(), type: 'table', tableTitle: 'Negociações Abertas', columns: [], rows: [] },
      ],
    },
    {
      id: 'preset-clients', name: 'Clientes por Valor', preset: true, createdAt: '',
      description: 'Ranking de clientes por volume de pedidos e receita gerada',
      blocks: [
        { id: uid(), type: 'title', content: 'Clientes por Valor' },
        { id: uid(), type: 'metrics', metrics: [] },
        { id: uid(), type: 'table', tableTitle: 'Ranking de Clientes', columns: [], rows: [] },
      ],
    },
    {
      id: 'preset-activities', name: 'Atividades CRM', preset: true, createdAt: '',
      description: 'Resumo de atendimentos, tipo e status por período',
      blocks: [
        { id: uid(), type: 'title', content: 'Atividades CRM' },
        { id: uid(), type: 'metrics', metrics: [] },
        { id: uid(), type: 'barchart', chartTitle: 'Atendimentos por Tipo', chartData: [] },
      ],
    },
  ];
}

// ── Block components ──────────────────────────────────────────────────────────

function BlockTitle({ b }: { b: ReportBlock }) {
  return <h1 className="text-2xl font-bold text-slate-800 border-b-2 border-purple-500 pb-2 mb-1">{b.content}</h1>;
}
function BlockSubtitle({ b }: { b: ReportBlock }) {
  return <h2 className="text-lg font-semibold text-slate-600 mb-1">{b.content}</h2>;
}
function BlockText({ b }: { b: ReportBlock }) {
  return <p className="text-sm text-slate-600 leading-relaxed">{b.content}</p>;
}
function BlockDivider() {
  return <hr className="border-slate-200" />;
}
function BlockMetrics({ b }: { b: ReportBlock }) {
  const items = b.metrics ?? [];
  return (
    <div className={`grid gap-3 ${items.length <= 2 ? 'grid-cols-2' : items.length === 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
      {items.map((m, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 flex items-center gap-3 shadow-sm">
          {m.icon && (
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${m.color ?? 'bg-purple-50 text-purple-600'}`}>
              {ICON_MAP[m.icon] ?? <BarChart2 className="w-5 h-5" />}
            </div>
          )}
          <div>
            <div className="text-xs text-slate-400">{m.label}</div>
            <div className="text-xl font-bold text-slate-800">{m.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
function BlockTable({ b }: { b: ReportBlock }) {
  const cols = b.columns ?? [];
  const rows = b.rows ?? [];
  return (
    <div>
      {b.tableTitle && <div className="text-sm font-semibold text-slate-600 mb-2">{b.tableTitle}</div>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-purple-50">
              {cols.map(c => (
                <th key={c.key} className="text-left px-3 py-2 text-xs font-semibold text-purple-700 border-b border-purple-100">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                {cols.map(c => (
                  <td key={c.key} className="px-3 py-2 text-slate-700 border-b border-slate-100">{r[c.key] ?? '—'}</td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={cols.length} className="text-center py-4 text-slate-400 text-xs">Sem dados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function BlockBarChart({ b }: { b: ReportBlock }) {
  const data = b.chartData ?? [];
  const max  = b.maxValue ?? Math.max(...data.map(d => d.value), 1);
  return (
    <div>
      {b.chartTitle && <div className="text-sm font-semibold text-slate-600 mb-3">{b.chartTitle}</div>}
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-28 text-xs text-slate-500 text-right shrink-0 truncate">{d.label}</div>
            <div className="flex-1 bg-slate-100 rounded-full h-4 overflow-hidden">
              <div
                className={`h-4 rounded-full transition-all ${d.color ?? 'bg-purple-500'}`}
                style={{ width: `${Math.max((d.value / max) * 100, 2)}%` }}
              />
            </div>
            <div className="w-16 text-xs text-slate-600 font-medium shrink-0">{d.value}</div>
          </div>
        ))}
        {data.length === 0 && <div className="text-xs text-slate-400 text-center py-2">Sem dados</div>}
      </div>
    </div>
  );
}

function RenderBlock({ b }: { b: ReportBlock }) {
  switch (b.type) {
    case 'title':    return <BlockTitle b={b} />;
    case 'subtitle': return <BlockSubtitle b={b} />;
    case 'text':     return <BlockText b={b} />;
    case 'divider':  return <BlockDivider />;
    case 'metrics':  return <BlockMetrics b={b} />;
    case 'table':    return <BlockTable b={b} />;
    case 'barchart': return <BlockBarChart b={b} />;
    default:         return null;
  }
}

// ── Data builders (popula blocos com dados reais) ─────────────────────────────

async function buildPipelineBlocks(
  negs: NegociacaoData[],
  _clientes: ErpCliente[],
): Promise<ReportBlock[]> {
  const abertas = negs.filter(n => n.negociacao.status === 'aberta');
  const ganhas  = negs.filter(n => n.negociacao.status === 'ganha');
  const perdidas = negs.filter(n => n.negociacao.status === 'perdida');
  const totalValor = abertas.reduce((s, n) => s + (n.negociacao.valor_estimado ?? 0), 0);

  // group by etapa
  const byEtapa: Record<string, { count: number; valor: number }> = {};
  abertas.forEach(n => {
    const e = n.negociacao.etapa ?? 'Sem Etapa';
    if (!byEtapa[e]) byEtapa[e] = { count: 0, valor: 0 };
    byEtapa[e].count++;
    byEtapa[e].valor += n.negociacao.valor_estimado ?? 0;
  });

  const ETAPA_COLORS = ['bg-slate-400','bg-purple-400','bg-blue-400','bg-amber-400','bg-emerald-400','bg-red-400'];
  const chartData = Object.entries(byEtapa).map(([label, v], i) => ({
    label, value: v.count, color: ETAPA_COLORS[i % ETAPA_COLORS.length],
  }));

  const tableRows = abertas.slice(0, 20).map(n => ({
    cliente: n.negociacao.clienteNome ?? '—',
    etapa:   n.negociacao.etapa ?? '—',
    valor:   fmtBRL(n.negociacao.valor_estimado ?? 0),
    responsavel: n.negociacao.responsavel ?? '—',
  }));

  return [
    { id: uid(), type: 'title', content: 'Pipeline de Vendas' },
    {
      id: uid(), type: 'metrics',
      metrics: [
        { label: 'Negociações Abertas', value: String(abertas.length),  icon: 'target',  color: 'bg-purple-50 text-purple-600' },
        { label: 'Valor em Pipeline',   value: fmtBRL(totalValor),      icon: 'dollar',  color: 'bg-emerald-50 text-emerald-600' },
        { label: 'Vendas Ganhas',       value: String(ganhas.length),   icon: 'trend',   color: 'bg-blue-50 text-blue-600' },
        { label: 'Vendas Perdidas',     value: String(perdidas.length), icon: 'star',    color: 'bg-red-50 text-red-500' },
      ],
    },
    { id: uid(), type: 'barchart', chartTitle: 'Negociações por Etapa', chartData, maxValue: Math.max(...chartData.map(d => d.value), 1) },
    {
      id: uid(), type: 'table', tableTitle: 'Negociações Abertas',
      columns: [
        { key: 'cliente', label: 'Cliente' },
        { key: 'etapa',   label: 'Etapa' },
        { key: 'valor',   label: 'Valor Est.' },
        { key: 'responsavel', label: 'Responsável' },
      ],
      rows: tableRows,
    },
  ];
}

async function buildClientsBlocks(
  clientes: ErpCliente[],
  pedidos: ErpPedido[],
): Promise<ReportBlock[]> {
  const clienteTotais: Record<string, number> = {};
  pedidos.forEach(p => {
    if (p.cliente_id) clienteTotais[p.cliente_id] = (clienteTotais[p.cliente_id] ?? 0) + (p.total_pedido ?? 0);
  });
  const ranking = clientes
    .map(c => ({ ...c, total: clienteTotais[c.id] ?? 0 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 20);

  return [
    { id: uid(), type: 'title', content: 'Clientes por Valor' },
    {
      id: uid(), type: 'metrics',
      metrics: [
        { label: 'Total de Clientes',  value: String(clientes.length),                            icon: 'users',  color: 'bg-purple-50 text-purple-600' },
        { label: 'Clientes Ativos',    value: String(clientes.filter(c => c.ativo).length),       icon: 'target', color: 'bg-emerald-50 text-emerald-600' },
        { label: 'Com Pedidos',        value: String(Object.keys(clienteTotais).length),          icon: 'trend',  color: 'bg-blue-50 text-blue-600' },
        { label: 'Receita Total',      value: fmtBRL(pedidos.reduce((s, p) => s + (p.total_pedido ?? 0), 0)), icon: 'dollar', color: 'bg-amber-50 text-amber-600' },
      ],
    },
    {
      id: uid(), type: 'table', tableTitle: 'Ranking de Clientes',
      columns: [
        { key: 'pos',   label: '#' },
        { key: 'nome',  label: 'Cliente' },
        { key: 'tipo',  label: 'Tipo' },
        { key: 'total', label: 'Total Pedidos' },
        { key: 'status', label: 'Status' },
      ],
      rows: ranking.map((c, i) => ({
        pos:    String(i + 1),
        nome:   c.nome,
        tipo:   c.tipo,
        total:  fmtBRL(c.total),
        status: c.ativo ? 'Ativo' : 'Inativo',
      })),
    },
  ];
}

async function buildActivitiesBlocks(
  atendimentos: Awaited<ReturnType<typeof getAtendimentos>>,
): Promise<ReportBlock[]> {
  const byTipo: Record<string, number> = {};
  atendimentos.forEach(a => {
    byTipo[a.tipo] = (byTipo[a.tipo] ?? 0) + 1;
  });
  const TIPO_COLORS: Record<string, string> = {
    ENTRADA: 'bg-blue-400', SAIDA: 'bg-emerald-400',
    WHATSAPP: 'bg-green-400', EMAIL: 'bg-purple-400',
    VISITA: 'bg-amber-400', OUTRO: 'bg-slate-400',
  };
  const chartData = Object.entries(byTipo).map(([label, value]) => ({
    label, value, color: TIPO_COLORS[label] ?? 'bg-slate-400',
  })).sort((a, b) => b.value - a.value);

  const byStatus: Record<string, number> = {};
  atendimentos.forEach(a => { byStatus[a.status] = (byStatus[a.status] ?? 0) + 1; });

  return [
    { id: uid(), type: 'title', content: 'Atividades CRM' },
    {
      id: uid(), type: 'metrics',
      metrics: [
        { label: 'Total de Atendimentos', value: String(atendimentos.length),                         icon: 'target', color: 'bg-purple-50 text-purple-600' },
        { label: 'Abertos',               value: String(byStatus['ABERTO'] ?? 0),                    icon: 'trend',  color: 'bg-blue-50 text-blue-600' },
        { label: 'Resolvidos',            value: String(byStatus['RESOLVIDO'] ?? byStatus['FECHADO'] ?? 0), icon: 'star', color: 'bg-emerald-50 text-emerald-600' },
        { label: 'Tipos Diferentes',      value: String(Object.keys(byTipo).length),                 icon: 'users',  color: 'bg-amber-50 text-amber-600' },
      ],
    },
    {
      id: uid(), type: 'barchart', chartTitle: 'Atendimentos por Tipo',
      chartData, maxValue: Math.max(...chartData.map(d => d.value), 1),
    },
  ];
}

// ── Block type picker ─────────────────────────────────────────────────────────

const BLOCK_OPTIONS: { type: BlockType; label: string; icon: React.ReactNode }[] = [
  { type: 'title',    label: 'Título',      icon: <Type      className="w-4 h-4" /> },
  { type: 'subtitle', label: 'Subtítulo',   icon: <Type      className="w-4 h-4" /> },
  { type: 'text',     label: 'Texto',       icon: <FileText  className="w-4 h-4" /> },
  { type: 'metrics',  label: 'Métricas',    icon: <Target    className="w-4 h-4" /> },
  { type: 'table',    label: 'Tabela',      icon: <Table     className="w-4 h-4" /> },
  { type: 'barchart', label: 'Gráfico',     icon: <BarChart2 className="w-4 h-4" /> },
  { type: 'divider',  label: 'Divisor',     icon: <Minus     className="w-4 h-4" /> },
];

function newBlock(type: BlockType): ReportBlock {
  const id = uid();
  switch (type) {
    case 'title':    return { id, type, content: 'Novo Título' };
    case 'subtitle': return { id, type, content: 'Novo Subtítulo' };
    case 'text':     return { id, type, content: 'Texto do relatório...' };
    case 'divider':  return { id, type };
    case 'metrics':  return { id, type, metrics: [{ label: 'Métrica', value: '0', icon: 'target', color: 'bg-purple-50 text-purple-600' }] };
    case 'table':    return { id, type, tableTitle: 'Tabela', columns: [{ key: 'col1', label: 'Coluna 1' }], rows: [] };
    case 'barchart': return { id, type, chartTitle: 'Gráfico', chartData: [{ label: 'Item A', value: 10 }, { label: 'Item B', value: 20 }] };
    default:         return { id, type };
  }
}

// ── Canvas Editor ─────────────────────────────────────────────────────────────

function CanvasEditor({
  template,
  onSave,
  onCancel,
}: {
  template: ReportTemplate;
  onSave: (t: ReportTemplate) => void;
  onCancel: () => void;
}) {
  const [name, setName]     = useState(template.name);
  const [desc, setDesc]     = useState(template.description);
  const [blocks, setBlocks] = useState<ReportBlock[]>(template.blocks);
  const [editingBlock, setEditingBlock] = useState<string | null>(null);
  const [editContent, setEditContent]  = useState('');

  function moveBlock(idx: number, dir: -1 | 1) {
    const next = [...blocks];
    const swap = idx + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setBlocks(next);
  }
  function removeBlock(id: string) { setBlocks(b => b.filter(x => x.id !== id)); }
  function addBlock(type: BlockType) { setBlocks(b => [...b, newBlock(type)]); }
  function startEdit(b: ReportBlock) {
    setEditingBlock(b.id);
    setEditContent(b.content ?? b.tableTitle ?? b.chartTitle ?? '');
  }
  function applyEdit() {
    setBlocks(bs => bs.map(b => {
      if (b.id !== editingBlock) return b;
      if (b.type === 'title' || b.type === 'subtitle' || b.type === 'text') return { ...b, content: editContent };
      if (b.type === 'table')    return { ...b, tableTitle: editContent };
      if (b.type === 'barchart') return { ...b, chartTitle: editContent };
      return b;
    }));
    setEditingBlock(null);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-slate-100 bg-white shrink-0">
        <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><X className="w-4 h-4" /></button>
        <div className="flex-1">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="text-base font-bold text-slate-800 border-none outline-none bg-transparent w-full"
            placeholder="Nome do template..."
          />
          <input
            value={desc}
            onChange={e => setDesc(e.target.value)}
            className="text-xs text-slate-400 border-none outline-none bg-transparent w-full"
            placeholder="Descrição..."
          />
        </div>
        <button
          onClick={() => onSave({ ...template, name, description: desc, blocks })}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700"
        >
          <Save className="w-4 h-4" /> Salvar Template
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar: add blocks */}
        <div className="w-44 border-r border-slate-100 bg-slate-50 p-3 shrink-0 overflow-y-auto">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Adicionar bloco</div>
          <div className="space-y-1">
            {BLOCK_OPTIONS.map(opt => (
              <button
                key={opt.type}
                onClick={() => addBlock(opt.type)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-600 hover:bg-purple-50 hover:text-purple-700 transition-colors"
              >
                {opt.icon} {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
          <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-5">
            {blocks.length === 0 && (
              <div className="text-center py-16 text-slate-300 text-sm">
                Adicione blocos no painel à esquerda
              </div>
            )}
            {blocks.map((b, idx) => (
              <div key={b.id} className="group relative">
                {/* Block controls */}
                <div className="absolute -left-8 top-1/2 -translate-y-1/2 hidden group-hover:flex flex-col gap-0.5">
                  <button onClick={() => moveBlock(idx, -1)} className="p-0.5 rounded text-slate-300 hover:text-slate-600"><ChevronUp className="w-3.5 h-3.5" /></button>
                  <button onClick={() => moveBlock(idx, 1)}  className="p-0.5 rounded text-slate-300 hover:text-slate-600"><ChevronDown className="w-3.5 h-3.5" /></button>
                </div>
                <div className="absolute -right-8 top-1/2 -translate-y-1/2 hidden group-hover:flex flex-col gap-0.5">
                  {(b.type !== 'divider' && b.type !== 'metrics' && b.type !== 'table' && b.type !== 'barchart') && (
                    <button onClick={() => startEdit(b)} className="p-0.5 rounded text-slate-300 hover:text-purple-600"><Edit3 className="w-3.5 h-3.5" /></button>
                  )}
                  <button onClick={() => removeBlock(b.id)} className="p-0.5 rounded text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>

                {/* Edit inline */}
                {editingBlock === b.id ? (
                  <div className="border-2 border-purple-300 rounded-lg p-2">
                    <input
                      autoFocus
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      onBlur={applyEdit}
                      onKeyDown={e => e.key === 'Enter' && applyEdit()}
                      className="w-full outline-none text-sm text-slate-700"
                    />
                  </div>
                ) : (
                  <div className={`${b.type !== 'divider' ? 'hover:ring-2 hover:ring-purple-200 rounded-lg p-1 cursor-default' : ''}`}>
                    <RenderBlock b={b} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Report Preview (com dados reais) ──────────────────────────────────────────

function ReportPreview({
  template,
  onBack,
}: {
  template: ReportTemplate;
  onBack: () => void;
}) {
  const [blocks, setBlocks] = useState<ReportBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [clientes, pedidos, atendimentos, negs] = await Promise.all([
          getClientes(), getPedidos('VENDA'), getAtendimentos(), getAllNegociacoes(),
        ]);

        if (template.id.includes('pipeline') || template.name.toLowerCase().includes('pipeline')) {
          setBlocks(await buildPipelineBlocks(negs, clientes));
        } else if (template.id.includes('clients') || template.name.toLowerCase().includes('cliente')) {
          setBlocks(await buildClientsBlocks(clientes, pedidos));
        } else if (template.id.includes('activities') || template.name.toLowerCase().includes('atividade')) {
          setBlocks(await buildActivitiesBlocks(atendimentos));
        } else {
          // generic: just use saved blocks as-is
          setBlocks(template.blocks);
        }
      } catch {
        setBlocks(template.blocks);
      } finally {
        setLoading(false);
      }
    })();
  }, [template]);

  function handlePrint() { window.print(); }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-slate-100 bg-white shrink-0 print:hidden">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
          <X className="w-4 h-4" /> Fechar
        </button>
        <div className="flex-1 text-base font-bold text-slate-800">{template.name}</div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700"
        >
          <Printer className="w-4 h-4" /> Imprimir / PDF
        </button>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50"
        >
          <Download className="w-4 h-4" /> Exportar
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-100 p-6">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-slate-400 text-sm gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" /> Carregando dados...
          </div>
        ) : (
          <div ref={printRef} className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-100 p-10 space-y-6 print:shadow-none print:rounded-none print:p-8">
            <div className="text-xs text-slate-400 text-right print:block">
              Gerado em {new Date().toLocaleString('pt-BR')} — ZIA Omnisystem
            </div>
            {blocks.map(b => (
              <div key={b.id}><RenderBlock b={b} /></div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @media print {
          body > *:not(.print-root) { display: none !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}

// ── Template Card ─────────────────────────────────────────────────────────────

function TemplateCard({
  t,
  onPreview,
  onEdit,
  onDelete,
}: {
  t: ReportTemplate;
  onPreview: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
          <FileText className="w-5 h-5 text-purple-500" />
        </div>
        {t.preset && (
          <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-medium">Preset</span>
        )}
        {!t.preset && (
          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Personalizado</span>
        )}
      </div>
      <div>
        <div className="font-semibold text-slate-800 text-sm">{t.name}</div>
        <div className="text-xs text-slate-400 mt-0.5 line-clamp-2">{t.description}</div>
      </div>
      <div className="flex gap-2 mt-auto">
        <button
          onClick={onPreview}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700"
        >
          <Eye className="w-3.5 h-3.5" /> Gerar
        </button>
        {!t.preset && (
          <>
            <button onClick={onEdit}   className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500"><Edit3  className="w-3.5 h-3.5" /></button>
            <button onClick={onDelete} className="p-2 border border-slate-200 rounded-lg hover:bg-red-50 text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
          </>
        )}
        {t.preset && (
          <button onClick={onEdit} className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500" title="Duplicar e editar">
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type View = 'gallery' | 'editor' | 'preview';

export default function RelatoriosAvancados() {
  const presets = buildPresets();
  const [userTemplates, setUserTemplates] = useState<ReportTemplate[]>(loadTemplates);
  const [view,    setView]    = useState<View>('gallery');
  const [current, setCurrent] = useState<ReportTemplate | null>(null);
  const [showNameModal, setShowNameModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const allTemplates = [...presets, ...userTemplates];

  function handleSaveTemplate(t: ReportTemplate) {
    const updated = t.preset
      ? [...userTemplates, { ...t, id: uid(), preset: false, createdAt: new Date().toISOString() }]
      : userTemplates.some(u => u.id === t.id)
        ? userTemplates.map(u => u.id === t.id ? t : u)
        : [...userTemplates, t];
    setUserTemplates(updated);
    saveTemplates(updated);
    setView('gallery');
  }

  function handleDelete(id: string) {
    const updated = userTemplates.filter(t => t.id !== id);
    setUserTemplates(updated);
    saveTemplates(updated);
  }

  function openNewTemplate() {
    setNewName(''); setNewDesc(''); setShowNameModal(true);
  }

  function confirmNew() {
    const t: ReportTemplate = {
      id: uid(), name: newName || 'Novo Relatório', description: newDesc,
      preset: false, createdAt: new Date().toISOString(), blocks: [],
    };
    setCurrent(t);
    setShowNameModal(false);
    setView('editor');
  }

  function openEdit(t: ReportTemplate) {
    // If preset, duplicate first
    const editable = t.preset
      ? { ...t, id: uid(), preset: false, name: t.name + ' (Cópia)', createdAt: new Date().toISOString() }
      : t;
    setCurrent(editable);
    setView('editor');
  }

  if (view === 'editor' && current) {
    return (
      <div className="h-full flex flex-col">
        <CanvasEditor
          template={current}
          onSave={t => handleSaveTemplate(t)}
          onCancel={() => setView('gallery')}
        />
      </div>
    );
  }

  if (view === 'preview' && current) {
    return (
      <div className="h-full flex flex-col">
        <ReportPreview template={current} onBack={() => setView('gallery')} />
      </div>
    );
  }

  // Gallery
  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Relatórios Avançados</h1>
          <p className="text-sm text-slate-400 mt-0.5">Crie, personalize e exporte relatórios do CRM</p>
        </div>
        <button
          onClick={openNewTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-xl hover:bg-purple-700"
        >
          <Plus className="w-4 h-4" /> Novo Relatório
        </button>
      </div>

      {/* Presets section */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <LayoutTemplate className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-semibold text-slate-600">Templates Prontos</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {presets.map(t => (
            <TemplateCard
              key={t.id} t={t}
              onPreview={() => { setCurrent(t); setView('preview'); }}
              onEdit={() => openEdit(t)}
              onDelete={() => {}}
            />
          ))}
        </div>
      </div>

      {/* User templates */}
      {userTemplates.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold text-slate-600">Meus Templates</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {userTemplates.map(t => (
              <TemplateCard
                key={t.id} t={t}
                onPreview={() => { setCurrent(t); setView('preview'); }}
                onEdit={() => openEdit(t)}
                onDelete={() => handleDelete(t.id)}
              />
            ))}
          </div>
        </div>
      )}

      {allTemplates.length === 0 && (
        <div className="text-center py-20 text-slate-300 text-sm">Nenhum template criado ainda.</div>
      )}

      {/* Modal: new template name */}
      {showNameModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h2 className="text-base font-bold text-slate-800 mb-4">Novo Relatório</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Nome do relatório *</label>
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && confirmNew()}
                  placeholder="Ex: Relatório de Vendas Q2"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Descrição</label>
                <input
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Descrição opcional..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-200"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowNameModal(false)} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button onClick={confirmNew} disabled={!newName.trim()} className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 disabled:opacity-40">
                <Check className="w-4 h-4 inline mr-1" /> Criar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
