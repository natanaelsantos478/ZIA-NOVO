// ─────────────────────────────────────────────────────────────────────────────
// ArvoreCustos.tsx — Visualizador + Editor da Árvore de Custos
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow, Background, Controls, MiniMap, applyEdgeChanges,
  Handle, Position,
} from '@xyflow/react';
import type { Node, Edge, NodeChange, EdgeChange, Connection, NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Plus, Play, ChevronDown, ChevronUp, Trash2, Edit2, GitBranch,
  Zap, BarChart2, DollarSign, Users, AlertCircle, CheckCircle2, Loader2,
} from 'lucide-react';
import { CONTEXTO_PADRAO } from './mockData';
import { simularArvore, descricaoGatilho } from './costEngine';
import type { NoCusto, ArestaCusto, ResultadoNo, ContextoCalculo } from './types';
import NoCustoEditor from './NoCustoEditor';
import ArestaEditor from './ArestaEditor';
import {
  getNos, getArestas, upsertNo, deleteNo, upsertAresta, deleteAresta, updateNoPosicao, avaliarNoDB,
  type FinNoCusto, type FinArestaCusto,
} from '../../../../lib/financeiro';

// ── Adaptadores de tipo (FinNoCusto → NoCusto) ────────────────────────────────
function finToNoCusto(n: FinNoCusto): NoCusto {
  return {
    id: n.id,
    nome: n.nome,
    descricao: n.descricao ?? undefined,
    icone: n.icone ?? '💰',
    cor_display: n.cor_display ?? '#6366f1',
    tipo_no: n.tipo_no,
    estrutura_valor: n.estrutura_valor as unknown as NoCusto['estrutura_valor'],
    gatilho: n.gatilho as unknown as NoCusto['gatilho'],
    escopo: n.escopo,
    produto_id: n.produto_id ?? undefined,
    grupo_produto_id: n.grupo_produto_id ?? undefined,
    grupo_custo_id: n.grupo_custo_id ?? undefined,
    faixa_preco_min: n.faixa_preco_min ?? undefined,
    faixa_preco_max: n.faixa_preco_max ?? undefined,
    config_rateio: (n.config_rateio as unknown as NoCusto['config_rateio']) ?? undefined,
    posicao: n.posicao_canvas ?? undefined,
    ordem_calculo: n.ordem_calculo ?? 0,
    ativo: n.ativo,
  };
}

function finToArestaCusto(a: FinArestaCusto): ArestaCusto {
  return {
    id: a.id,
    no_pai_id: a.no_pai_id,
    no_filho_id: a.no_filho_id,
    tipo_relacao: a.tipo_relacao,
    condicao_aresta: (a.condicao_aresta ?? { tipo: 'SEMPRE' }) as unknown as ArestaCusto['condicao_aresta'],
    prioridade: a.prioridade ?? 0,
    fator: a.fator ?? undefined,
    ativo: a.ativo ?? true,
  };
}

function noToFin(no: NoCusto): Partial<FinNoCusto> {
  // ID temporário ("no-xxx") nunca deve ser enviado ao banco — o UUID é gerado pelo banco
  const isTempId = !no.id || no.id.startsWith('no-');
  return {
    ...(isTempId ? {} : { id: no.id }),
    nome: no.nome,
    descricao: no.descricao,
    icone: no.icone,
    cor_display: no.cor_display,
    tipo_no: no.tipo_no,
    estrutura_valor: no.estrutura_valor as unknown as Record<string, unknown>,
    gatilho: no.gatilho as unknown as Record<string, unknown>,
    escopo: no.escopo,
    produto_id: no.produto_id || null,
    grupo_produto_id: no.grupo_produto_id || null,
    grupo_custo_id: no.grupo_custo_id || null,
    faixa_preco_min: no.faixa_preco_min,
    faixa_preco_max: no.faixa_preco_max,
    config_rateio: no.config_rateio as unknown as Record<string, unknown>,
    posicao_canvas: no.posicao,
    ordem_calculo: no.ordem_calculo,
    ativo: no.ativo,
  };
}

// ── Cores por tipo de nó ─────────────────────────────────────────────────────
const COR_TIPO: Record<string, { bg: string; border: string; label: string; text: string }> = {
  CUSTO_FOLHA:        { bg: 'bg-violet-50',  border: 'border-violet-400', label: 'Folha',        text: 'text-violet-700'  },
  CUSTO_AGREGADOR:    { bg: 'bg-blue-50',    border: 'border-blue-400',   label: 'Agregador',    text: 'text-blue-700'    },
  CUSTO_CONDICIONAL:  { bg: 'bg-amber-50',   border: 'border-amber-400',  label: 'Condicional',  text: 'text-amber-700'   },
  CUSTO_MULTIPLICADOR:{ bg: 'bg-green-50',   border: 'border-green-400',  label: 'Multiplicador',text: 'text-green-700'   },
  CUSTO_DISTRIBUIDOR: { bg: 'bg-rose-50',    border: 'border-rose-400',   label: 'Distribuidor', text: 'text-rose-700'    },
};

// ── COR das arestas ──────────────────────────────────────────────────────────
const COR_ARESTA: Record<string, string> = {
  SOMA:          '#16a34a',
  SUBTRAI:       '#dc2626',
  SUBSTITUI:     '#2563eb',
  MULTIPLICA_POR:'#ca8a04',
  DIVIDE_POR:    '#9333ea',
  ATIVA_SE:      '#0891b2',
  MODIFICA_FAIXA:'#94a3b8',
};

// ── Custom Node Component ────────────────────────────────────────────────────
interface NodeData {
  no: NoCusto;
  resultado?: ResultadoNo;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onAddFilho: (id: string) => void;
}

function CustoNode({ data, selected }: NodeProps) {
  const d = data as unknown as NodeData;
  const { no, resultado, onEdit, onDelete, onAddFilho } = d;
  const cores = COR_TIPO[no.tipo_no] ?? COR_TIPO.CUSTO_FOLHA;
  const ativo = resultado?.gatilho_ativado !== false;

  return (
    <div className={`relative min-w-[180px] max-w-[220px] rounded-xl border-2 shadow-sm transition-all
      ${cores.bg} ${selected ? 'border-slate-800 shadow-lg ring-2 ring-slate-300' : cores.border}
      ${!ativo ? 'opacity-50' : ''}
    `}>
      <Handle type="target" position={Position.Top} className="!bg-slate-400 !w-3 !h-3"/>

      <div className="px-3 py-2">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">{no.icone}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-800 truncate">{no.nome}</p>
            <span className={`text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full border ${cores.bg} ${cores.border} ${cores.text}`}>
              {cores.label}
            </span>
          </div>
          {resultado && (
            ativo
              ? <CheckCircle2 size={14} className="text-green-500 flex-shrink-0"/>
              : <AlertCircle  size={14} className="text-slate-300  flex-shrink-0"/>
          )}
        </div>

        {/* Valor calculado */}
        {resultado?.gatilho_ativado && (
          <div className="mt-1 bg-white/70 rounded-lg px-2 py-1 text-center">
            <p className="text-sm font-bold text-slate-900">
              R$ {resultado.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        )}

        {/* Gatilho */}
        {no.gatilho.tipo !== 'SEMPRE' && (
          <p className="text-[10px] text-slate-500 mt-1 truncate">
            🔁 {descricaoGatilho(no.gatilho)}
          </p>
        )}

        {/* Trace (ao hover — via title) */}
        {resultado?.trace && (
          <p className="text-[9px] text-slate-400 mt-0.5 truncate" title={resultado.trace}>
            {resultado.trace}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex border-t border-slate-100 divide-x divide-slate-100">
        <button onClick={() => onEdit(no.id)} className="flex-1 py-1 text-xs text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-1">
          <Edit2 size={10}/> Editar
        </button>
        <button onClick={() => onAddFilho(no.id)} className="flex-1 py-1 text-xs text-slate-500 hover:text-green-600 hover:bg-green-50 transition-colors flex items-center justify-center gap-1">
          <Plus size={10}/> Filho
        </button>
        <button onClick={() => onDelete(no.id)} className="flex-1 py-1 text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center gap-1">
          <Trash2 size={10}/>
        </button>
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-slate-400 !w-3 !h-3"/>
    </div>
  );
}

const NODE_TYPES = { custo: CustoNode };

// ── Simulador ────────────────────────────────────────────────────────────────
function SimuladorPanel({
  ctx, setCtx, resultado, onSimular,
}: {
  ctx: ContextoCalculo;
  setCtx: (c: ContextoCalculo) => void;
  resultado: ReturnType<typeof simularArvore> | null;
  onSimular: () => void;
}) {
  const [aberto, setAberto] = useState(true);
  const inp = 'border border-slate-200 rounded px-2 py-1 text-xs w-28 focus:outline-none focus:ring-1 focus:ring-emerald-400';

  return (
    <div className="border-t border-slate-200 bg-white">
      <button
        onClick={() => setAberto(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
      >
        <span className="flex items-center gap-2"><Zap size={13} className="text-amber-500"/> SIMULADOR DE CUSTOS</span>
        {aberto ? <ChevronDown size={14}/> : <ChevronUp size={14}/>}
      </button>

      {aberto && (
        <div className="px-4 pb-3 space-y-3">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5 flex items-center gap-1"><Users size={10}/> Assinantes</label>
              <input type="number" value={ctx.total_assinantes} onChange={e => setCtx({ ...ctx, total_assinantes: Number(e.target.value) })} className={inp}/>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5 flex items-center gap-1"><DollarSign size={10}/> Faturamento (R$)</label>
              <input type="number" value={ctx.receita_bruta} onChange={e => setCtx({ ...ctx, receita_bruta: Number(e.target.value) })} className={inp + ' w-36'}/>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5 flex items-center gap-1"><BarChart2 size={10}/> Pedidos/mês</label>
              <input type="number" value={ctx.total_pedidos} onChange={e => setCtx({ ...ctx, total_pedidos: Number(e.target.value) })} className={inp}/>
            </div>
            <button onClick={onSimular} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors">
              <Play size={12}/> Recalcular
            </button>
          </div>

          {resultado && (
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Custo Total', value: `R$ ${resultado.totais.custo_total_empresa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, color: 'text-red-600', bg: 'bg-red-50' },
                { label: 'Faturamento', value: `R$ ${ctx.receita_bruta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Lucro Bruto', value: `R$ ${(ctx.receita_bruta - resultado.totais.custo_total_empresa).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Margem', value: `${ctx.receita_bruta > 0 ? ((ctx.receita_bruta - resultado.totais.custo_total_empresa) / ctx.receita_bruta * 100).toFixed(1) : '0'}%`, color: 'text-violet-600', bg: 'bg-violet-50' },
              ].map(c => (
                <div key={c.label} className={`${c.bg} rounded-lg px-3 py-2`}>
                  <p className="text-[10px] text-slate-500">{c.label}</p>
                  <p className={`text-sm font-bold ${c.color}`}>{c.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Tabela de nós */}
          {resultado && Object.entries(resultado.nos).length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-1 text-slate-400 font-medium">Nó</th>
                    <th className="text-left py-1 text-slate-400 font-medium">Gatilho</th>
                    <th className="text-right py-1 text-slate-400 font-medium">Valor</th>
                    <th className="text-left py-1 text-slate-400 font-medium pl-4">Trace</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(resultado.nos).map(([id, res]) => (
                    <ResultadoRow key={id} noId={id} resultado={res} profundidade={0}/>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResultadoRow({ noId: _noId, resultado, profundidade }: { noId: string; resultado: ResultadoNo; profundidade: number }) {
  const [expandido, setExpandido] = useState(false);
  const temFilhos = Object.keys(resultado.filhos_avaliados).length > 0;

  return (
    <>
      <tr className={`border-b border-slate-50 ${!resultado.gatilho_ativado ? 'opacity-40' : ''}`}>
        <td className="py-1" style={{ paddingLeft: profundidade * 16 + 4 }}>
          <button onClick={() => temFilhos && setExpandido(e => !e)} className="flex items-center gap-1.5 text-left">
            {temFilhos && (expandido ? <ChevronDown size={11}/> : <ChevronUp size={11} className="rotate-180"/>)}
            <span className="font-medium text-slate-700">{resultado.no_nome}</span>
          </button>
        </td>
        <td className="py-1">
          {resultado.gatilho_ativado
            ? <span className="text-green-600 flex items-center gap-1"><CheckCircle2 size={10}/> Ativo</span>
            : <span className="text-slate-300 flex items-center gap-1"><AlertCircle size={10}/> Inativo</span>
          }
        </td>
        <td className="py-1 text-right font-mono font-bold text-slate-800">
          R$ {resultado.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </td>
        <td className="py-1 pl-4 text-slate-400 max-w-xs truncate" title={resultado.trace}>
          {resultado.trace}
        </td>
      </tr>
      {expandido && Object.entries(resultado.filhos_avaliados).map(([fId, fRes]) => (
        <ResultadoRow key={fId} noId={fId} resultado={fRes} profundidade={profundidade + 1}/>
      ))}
    </>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ArvoreCustos() {
  const [nos, setNos] = useState<NoCusto[]>([]);
  const [arestas, setArestas] = useState<ArestaCusto[]>([]);
  const [loading, setLoading] = useState(true);
  const [ctx, setCtx] = useState<ContextoCalculo>(CONTEXTO_PADRAO);
  const [resultado, setResultado] = useState<ReturnType<typeof simularArvore> | null>(null);
  const [editandoNo, setEditandoNo] = useState<string | null>(null);
  const [novoNoParaId, setNovoNoParaId] = useState<string | null>(null);
  const [editandoAresta, setEditandoAresta] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getNos(), getArestas()])
      .then(([ns, as]) => {
        setNos(ns.map(finToNoCusto));
        setArestas(as.map(finToArestaCusto));
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Converte para formato @xyflow/react ──
  const rfNodes: Node[] = useMemo(() => nos.map(no => ({
    id: no.id,
    type: 'custo',
    position: no.posicao ?? { x: 0, y: 0 },
    data: {
      no,
      resultado: resultado?.nos[no.id],
      onEdit: (id: string) => setEditandoNo(id),
      onDelete: async (id: string) => {
        try {
          await deleteNo(id);
          setNos(prev => prev.filter(n => n.id !== id));
          setArestas(prev => prev.filter(a => a.no_pai_id !== id && a.no_filho_id !== id));
        } catch (e: unknown) { alert((e as Error).message); }
      },
      onAddFilho: (id: string) => setNovoNoParaId(id),
    },
  })), [nos, resultado]);

  const rfEdges: Edge[] = useMemo(() => arestas.map(a => ({
    id: a.id,
    source: a.no_pai_id,
    target: a.no_filho_id,
    label: a.tipo_relacao,
    style: { stroke: COR_ARESTA[a.tipo_relacao] ?? '#94a3b8', strokeWidth: 2 },
    labelStyle: { fontSize: 9, fill: COR_ARESTA[a.tipo_relacao] ?? '#94a3b8' },
    labelBgStyle: { fill: '#fff', opacity: 0.85 },
    data: { aresta: a },
  })), [arestas]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    changes.forEach(ch => {
      if (ch.type === 'position' && ch.position) {
        setNos(prev => prev.map(n => n.id === ch.id ? { ...n, posicao: ch.position! } : n));
        // Persiste no banco com debounce implícito (apenas drag-end)
        if (!ch.dragging) {
          updateNoPosicao(ch.id, ch.position).catch(console.error);
        }
      }
    });
  }, []);

  const onEdgesChange = useCallback((_changes: EdgeChange[]) => {
    applyEdgeChanges(_changes, rfEdges);
  }, [rfEdges]);

  const onConnect = useCallback((conn: Connection) => {
    const tempAresta: ArestaCusto = {
      id: `e-${Date.now()}`,
      no_pai_id: conn.source!,
      no_filho_id: conn.target!,
      tipo_relacao: 'SOMA',
      condicao_aresta: { tipo: 'SEMPRE' },
      prioridade: 0,
      ativo: true,
    };
    setArestas(prev => [...prev, tempAresta]);
    setEditandoAresta(tempAresta.id);
  }, []);

  const handleSimular = useCallback(async () => {
    // Tenta usar RPC do banco para os nós raiz; fallback para engine local
    const nosRaiz = nos.filter(n => !arestas.some(a => a.no_filho_id === n.id));
    try {
      const contexto: Record<string, unknown> = {
        total_assinantes: ctx.total_assinantes,
        receita_bruta: ctx.receita_bruta,
        total_pedidos: ctx.total_pedidos,
        volume_por_produto: ctx.volume_por_produto ?? {},
        receita_por_produto: ctx.receita_por_produto ?? {},
        receita_por_grupo: ctx.receita_por_grupo ?? {},
      };
      const resultados = await Promise.all(
        nosRaiz.map(n => avaliarNoDB(n.id, contexto))
      );
      const nosMap: Record<string, unknown> = {};
      nosRaiz.forEach((n, i) => { nosMap[n.id] = resultados[i]; });
      setResultado({ nos: nosMap as Record<string, ResultadoNo>, totais: { custo_total_empresa: 0, por_produto: {}, impostos_totais: 0 }, margem_por_produto: {} });
    } catch {
      // Fallback para engine local
      setResultado(simularArvore(nos, arestas, ctx));
    }
  }, [nos, arestas, ctx]);

  const noEmEdicao = nos.find(n => n.id === editandoNo);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 size={28} className="animate-spin text-emerald-500"/>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center">
          <GitBranch size={18} className="text-emerald-600"/>
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-900">Árvore de Custos</h1>
          <p className="text-xs text-slate-500">{nos.length} nós · {arestas.length} relações</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setNovoNoParaId(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs hover:bg-slate-50 transition-colors"
          >
            <Edit2 size={12}/> Nova Aresta
          </button>
          <button
            onClick={() => setEditandoNo('new')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
          >
            <Plus size={12}/> Novo Nó
          </button>
          <button
            onClick={handleSimular}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
          >
            <Play size={12}/> Simular
          </button>
        </div>
      </div>

      {/* ── Legenda de tipos ── */}
      <div className="bg-white border-b border-slate-100 px-6 py-1.5 flex items-center gap-4 text-xs shrink-0 overflow-x-auto">
        <span className="text-slate-400 text-[10px] font-medium uppercase tracking-wide shrink-0">Tipos:</span>
        {Object.entries(COR_TIPO).map(([tipo, c]) => (
          <span key={tipo} className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] ${c.bg} ${c.border} ${c.text} shrink-0`}>
            {c.label}
          </span>
        ))}
        <span className="text-slate-300">|</span>
        <span className="text-slate-400 text-[10px] font-medium uppercase tracking-wide shrink-0">Arestas:</span>
        {Object.entries(COR_ARESTA).slice(0,4).map(([tipo, cor]) => (
          <span key={tipo} className="flex items-center gap-1 text-[10px] shrink-0" style={{ color: cor }}>
            <span className="w-3 h-0.5 inline-block" style={{ background: cor }}/>
            {tipo.replace('_', ' ')}
          </span>
        ))}
      </div>

      {/* ── Canvas principal ── */}
      <div className="flex-1 min-h-0">
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeClick={(_, edge) => setEditandoAresta(edge.id)}
          nodeTypes={NODE_TYPES}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} color="#e2e8f0"/>
          <Controls/>
          <MiniMap nodeColor={n => {
            const no = nos.find(x => x.id === n.id);
            return no ? (COR_TIPO[no.tipo_no]?.border.replace('border-', '#').replace('-400', '') ?? '#94a3b8') : '#94a3b8';
          }}/>
        </ReactFlow>
      </div>

      {/* ── Simulador ── */}
      <SimuladorPanel ctx={ctx} setCtx={setCtx} resultado={resultado} onSimular={handleSimular}/>

      {/* ── Modais ── */}
      {(editandoNo !== null) && (
        <NoCustoEditor
          no={editandoNo === 'new' ? undefined : noEmEdicao}
          paiId={novoNoParaId ?? undefined}
          onSave={async (no) => {
            try {
              const idTemp = no.id;
              const isTempId = !idTemp || idTemp.startsWith('no-');
              const saved = await upsertNo(noToFin(no));
              const savedNo = finToNoCusto(saved);
              const isNew = editandoNo === 'new' || isTempId || !nos.find(n => n.id === savedNo.id);
              if (isNew) {
                // Substitui o ID temporário pelo UUID real retornado do banco
                setNos(prev => [
                  ...prev.filter(n => n.id !== idTemp),
                  savedNo,
                ]);
                if (novoNoParaId) {
                  const novaAresta: ArestaCusto = {
                    id: `e-${Date.now()}`,
                    no_pai_id: novoNoParaId,
                    no_filho_id: savedNo.id,
                    tipo_relacao: 'SOMA',
                    condicao_aresta: { tipo: 'SEMPRE' },
                    prioridade: 0,
                    ativo: true,
                  };
                  const savedAresta = await upsertAresta(novaAresta as unknown as Partial<FinArestaCusto>);
                  setArestas(prev => [...prev, finToArestaCusto(savedAresta)]);
                }
              } else {
                setNos(prev => prev.map(n => n.id === savedNo.id ? savedNo : n));
              }
            } catch (e: unknown) { alert((e as Error).message); }
            setEditandoNo(null);
            setNovoNoParaId(null);
          }}
          onClose={() => { setEditandoNo(null); setNovoNoParaId(null); }}
        />
      )}

      {editandoAresta !== null && (
        <ArestaEditor
          aresta={arestas.find(a => a.id === editandoAresta)}
          nos={nos}
          onSave={async (a) => {
            try {
              const saved = await upsertAresta(a as unknown as Partial<FinArestaCusto>);
              const savedAresta = finToArestaCusto(saved);
              setArestas(prev => {
                const idx = prev.findIndex(x => x.id === savedAresta.id);
                return idx >= 0 ? prev.map(x => x.id === savedAresta.id ? savedAresta : x) : [...prev, savedAresta];
              });
            } catch (e: unknown) { alert((e as Error).message); }
            setEditandoAresta(null);
          }}
          onDelete={async (id) => {
            try {
              await deleteAresta(id);
              setArestas(prev => prev.filter(a => a.id !== id));
            } catch (e: unknown) { alert((e as Error).message); }
            setEditandoAresta(null);
          }}
          onClose={() => setEditandoAresta(null)}
        />
      )}
    </div>
  );
}
