// ─────────────────────────────────────────────────────────────────────────────
// CanvasEditor.tsx — Editor visual tipo Canva com react-konva
// Suporta: drag, resize, rotate, seleção múltipla, undo/redo, zoom
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { Stage, Layer, Rect, Text, Image as KImage, Group, Transformer, Ellipse, Line } from 'react-konva';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import {
  Undo2, Redo2, ZoomIn, ZoomOut, Printer, Loader2,
} from 'lucide-react';
import type {
  PaginaCanvas, Elemento, TextoDados, ImagemDados, FormaDados,
  LogoDados, ProdutoCardDados, TabelaDados, OrcConfig,
} from '../types';
import { PAGE_W, PAGE_H } from '../types';
import { resolverVariaveis, capturarPaginaKonva } from '../pdf';
import type { ItemOrcamento, Orcamento } from '../../../data/crmData';
import type { NegociacaoData } from '../../../data/crmData';
import CanvasSidebar from './CanvasSidebar';
import CanvasPagePanel from './CanvasPagePanel';
import PropertiesPanel from './PropertiesPanel';

// ── useImage hook ─────────────────────────────────────────────────────────────
function useKonvaImage(src?: string): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    if (!src) { setImg(null); return; }
    const i = new window.Image();
    i.crossOrigin = 'anonymous';
    i.src = src;
    i.onload = () => setImg(i);
    i.onerror = () => setImg(null);
  }, [src]);
  return img;
}

// ── Resolução de variáveis dinâmicas ──────────────────────────────────────────
function resolveTexto(dados: TextoDados, neg: NegociacaoData, orc: Orcamento, config: OrcConfig): string {
  if (dados.variavel) {
    return resolverVariaveis(dados.variavel, {
      cliente_nome: neg.negociacao.clienteNome,
      numero: orc.numero,
      data_hoje: new Date().toLocaleDateString('pt-BR'),
      validade: orc.validade ? new Date(orc.validade).toLocaleDateString('pt-BR') : '',
      vendedor: orc.vendedor,
      total: orc.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      empresa: config.empresa,
    });
  }
  return dados.conteudo;
}

// ── Elemento TEXTO ────────────────────────────────────────────────────────────
function ElTexto({ el, neg, orc, config }: { el: Elemento; neg: NegociacaoData; orc: Orcamento; config: OrcConfig }) {
  const d = el.dados as TextoDados;
  const text = resolveTexto(d, neg, orc, config);
  return (
    <>
      {d.cor_fundo !== 'transparent' && (
        <Rect width={el.largura} height={el.altura} fill={d.cor_fundo} cornerRadius={d.borda_arredondada}/>
      )}
      <Text
        text={text}
        width={el.largura} height={el.altura}
        fontSize={d.tamanho}
        fontFamily={d.fonte + ', sans-serif'}
        fontStyle={`${d.negrito ? 'bold' : 'normal'} ${d.italico ? 'italic' : 'normal'}`}
        textDecoration={d.sublinhado ? 'underline' : ''}
        fill={d.cor}
        align={d.alinhamento === 'justify' ? 'left' : d.alinhamento}
        verticalAlign="middle"
        padding={d.padding || 4}
        wrap="word"
        listening={false}
      />
    </>
  );
}

// ── Elemento IMAGEM ───────────────────────────────────────────────────────────
function ElImagem({ el }: { el: Elemento }) {
  const d = el.dados as ImagemDados;
  const img = useKonvaImage(d.url);
  if (!img) return <Rect width={el.largura} height={el.altura} fill="#e2e8f0" cornerRadius={d.borda_arredondada}/>;
  return (
    <KImage
      image={img}
      width={el.largura} height={el.altura}
      cornerRadius={d.borda_arredondada}
      opacity={d.opacidade}
      listening={false}
    />
  );
}

// ── Elemento FORMA ────────────────────────────────────────────────────────────
function ElForma({ el }: { el: Elemento }) {
  const d = el.dados as FormaDados;
  if (d.tipo === 'elipse') {
    return (
      <Ellipse
        radiusX={el.largura / 2} radiusY={el.altura / 2}
        offsetX={-el.largura / 2} offsetY={-el.altura / 2}
        fill={d.cor_preenchimento} stroke={d.cor_borda} strokeWidth={d.espessura_borda}
        opacity={d.opacidade} listening={false}
      />
    );
  }
  if (d.tipo === 'linha') {
    return <Line points={[0, el.altura / 2, el.largura, el.altura / 2]} stroke={d.cor_borda || '#000'} strokeWidth={d.espessura_borda || 2} listening={false}/>;
  }
  return (
    <Rect
      width={el.largura} height={el.altura}
      fill={d.cor_preenchimento} stroke={d.cor_borda} strokeWidth={d.espessura_borda}
      cornerRadius={d.borda_arredondada} opacity={d.opacidade} listening={false}
    />
  );
}

// ── Elemento LOGO ─────────────────────────────────────────────────────────────
function ElLogo({ el, config }: { el: Elemento; config: OrcConfig }) {
  const d = el.dados as LogoDados;
  const url = d.usar_logo_config ? config.logo_url : d.url_custom;
  const img = useKonvaImage(url);
  if (!img) {
    return (
      <>
        <Rect width={el.largura} height={el.altura} fill="#e2e8f0" cornerRadius={d.borda_arredondada}/>
        <Text text="LOGO" width={el.largura} height={el.altura} align="center" verticalAlign="middle" fill="#94a3b8" fontSize={14} listening={false}/>
      </>
    );
  }
  return <KImage image={img} width={el.largura} height={el.altura} cornerRadius={d.borda_arredondada} listening={false}/>;
}

// ── Elemento PRODUTO CARD ─────────────────────────────────────────────────────
function ElProdutoCard({
  el, itens, imageMap,
}: { el: Elemento; itens: ItemOrcamento[]; imageMap: Record<string, string[]> }) {
  const d = el.dados as ProdutoCardDados;
  const item = itens.find(i => i.produto_id === d.produto_id);
  const imgs = imageMap[d.produto_id] ?? [];
  const imgUrl = imgs[d.imagens_selecionadas[0] ?? 0];
  const img = useKonvaImage(imgUrl);
  const isHorizontal = d.layout === 'horizontal';
  const imgH = isHorizontal ? el.altura : Math.min(el.altura * 0.55, 160);
  const imgW = isHorizontal ? Math.min(el.largura * 0.4, 160) : el.largura;
  const textX = isHorizontal ? imgW + 10 : 10;
  const textY = isHorizontal ? 10 : imgH + 10;
  const textW = isHorizontal ? el.largura - imgW - 20 : el.largura - 20;

  return (
    <>
      <Rect width={el.largura} height={el.altura} fill={d.cor_fundo} cornerRadius={d.borda_arredondada} stroke="#e2e8f0" strokeWidth={1} listening={false}/>
      {img
        ? <KImage image={img} x={0} y={0} width={imgW} height={imgH} cornerRadius={isHorizontal ? [d.borda_arredondada, 0, 0, d.borda_arredondada] as unknown as number : [d.borda_arredondada, d.borda_arredondada, 0, 0] as unknown as number} listening={false}/>
        : <Rect x={0} y={0} width={imgW} height={imgH} fill="#f1f5f9" cornerRadius={isHorizontal ? [d.borda_arredondada, 0, 0, d.borda_arredondada] as unknown as number : [d.borda_arredondada, d.borda_arredondada, 0, 0] as unknown as number} listening={false}/>
      }
      <Text x={textX} y={textY} text={item?.produto_nome ?? 'Produto'} width={textW}
        fontSize={13} fontStyle="bold" fill={d.cor_texto} wrap="word" listening={false}/>
      {d.mostrar_codigo && item?.codigo && (
        <Text x={textX} y={textY + 20} text={item.codigo} width={textW} fontSize={10} fill="#64748b" listening={false}/>
      )}
      {d.mostrar_preco && item && (
        <Text
          x={textX} y={textY + (d.mostrar_codigo && item.codigo ? 38 : 22)}
          text={`R$ ${item.preco_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          width={textW} fontSize={15} fontStyle="bold" fill="#7c3aed" listening={false}
        />
      )}
      {d.mostrar_descricao && item && (
        <Text
          x={textX} y={textY + (d.mostrar_codigo && item.codigo ? 60 : 44)}
          text={item.produto_nome} width={textW} fontSize={10} fill="#64748b"
          wrap="word" listening={false}
        />
      )}
    </>
  );
}

// ── Elemento TABELA ───────────────────────────────────────────────────────────
function ElTabela({ el, itens }: { el: Elemento; itens: ItemOrcamento[] }) {
  const d = el.dados as TabelaDados;
  const ROW_H = 28;
  const COL_W = el.largura / Math.max(d.colunas_visiveis.length, 1);
  const HEADERS: Record<string, string> = {
    codigo: 'Código', produto_nome: 'Produto', unidade: 'Un.',
    quantidade: 'Qtd', preco_unitario: 'Preço', desconto_pct: 'Desc.%', total: 'Total',
  };
  const getVal = (item: ItemOrcamento, col: string): string => {
    switch (col) {
      case 'codigo': return item.codigo ?? '';
      case 'produto_nome': return item.produto_nome;
      case 'unidade': return item.unidade;
      case 'quantidade': return String(item.quantidade);
      case 'preco_unitario': return `R$ ${item.preco_unitario.toFixed(2)}`;
      case 'desconto_pct': return `${item.desconto_pct}%`;
      case 'total': return `R$ ${item.total.toFixed(2)}`;
      default: return '';
    }
  };
  const totalVal = itens.reduce((s, i) => s + i.total, 0);

  return (
    <>
      {/* Header */}
      <Rect width={el.largura} height={ROW_H} fill={d.cor_cabecalho} listening={false}/>
      {d.colunas_visiveis.map((col, ci) => (
        <Text key={col} x={ci * COL_W + 4} y={0} width={COL_W - 8} height={ROW_H}
          text={HEADERS[col] ?? col} fontSize={d.fonte_tamanho} fontStyle="bold"
          fill="#ffffff" align="center" verticalAlign="middle" listening={false}/>
      ))}
      {/* Rows */}
      {itens.map((item, ri) => (
        <Group key={item.id} y={(ri + 1) * ROW_H}>
          <Rect width={el.largura} height={ROW_H} fill={ri % 2 === 0 ? d.cor_linhas_pares : d.cor_linhas_impares} listening={false}/>
          <Rect y={ROW_H - 1} width={el.largura} height={1} fill={d.cor_borda} listening={false}/>
          {d.colunas_visiveis.map((col, ci) => (
            <Text key={col} x={ci * COL_W + 4} y={0} width={COL_W - 8} height={ROW_H}
              text={getVal(item, col)} fontSize={d.fonte_tamanho} fill={d.cor_texto}
              align={['total', 'preco_unitario', 'quantidade'].includes(col) ? 'right' : 'left'}
              verticalAlign="middle" listening={false}/>
          ))}
        </Group>
      ))}
      {/* Total row */}
      {d.mostrar_total && (
        <Group y={(itens.length + 1) * ROW_H}>
          <Rect width={el.largura} height={ROW_H} fill={d.cor_cabecalho} listening={false}/>
          <Text x={4} y={0} width={el.largura - 8} height={ROW_H}
            text={`TOTAL: R$ ${totalVal.toFixed(2)}`} fontSize={d.fonte_tamanho}
            fontStyle="bold" fill="#ffffff" align="right" verticalAlign="middle" listening={false}/>
        </Group>
      )}
    </>
  );
}

// ── Elemento genérico ─────────────────────────────────────────────────────────
function CanvasEl({
  el, neg, orc, config, itens, imageMap,
  onSelect, onChange,
}: {
  el: Elemento;
  neg: NegociacaoData; orc: Orcamento; config: OrcConfig;
  itens: ItemOrcamento[]; imageMap: Record<string, string[]>;
  onSelect: () => void; onChange: (patch: Partial<Elemento>) => void;
}) {
  const groupRef = useRef<Konva.Group>(null);

  const handleDragEnd = (e: KonvaEventObject<DragEvent>) => {
    onChange({ x: e.target.x(), y: e.target.y() });
  };

  const handleTransformEnd = () => {
    const node = groupRef.current;
    if (!node) return;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1); node.scaleY(1);
    onChange({
      x: node.x(), y: node.y(),
      largura: Math.max(10, el.largura * scaleX),
      altura: Math.max(10, el.altura * scaleY),
      rotacao: node.rotation(),
    });
  };

  return (
    <Group
      id={el.id}
      ref={groupRef}
      x={el.x} y={el.y}
      width={el.largura} height={el.altura}
      rotation={el.rotacao}
      opacity={el.opacidade}
      draggable={!el.bloqueado}
      visible={el.visivel}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
      onClick={(e) => { e.cancelBubble = true; onSelect(); }}
      onTap={(e) => { e.cancelBubble = true; onSelect(); }}
    >
      {el.tipo === 'TEXTO'          && <ElTexto el={el} neg={neg} orc={orc} config={config}/>}
      {el.tipo === 'IMAGEM'         && <ElImagem el={el}/>}
      {el.tipo === 'FORMA'          && <ElForma el={el}/>}
      {el.tipo === 'LOGO'           && <ElLogo el={el} config={config}/>}
      {el.tipo === 'PRODUTO_CARD'   && <ElProdutoCard el={el} itens={itens} imageMap={imageMap}/>}
      {el.tipo === 'TABELA_PRODUTOS'&& <ElTabela el={el} itens={itens}/>}
    </Group>
  );
}

// ── Main CanvasEditor ─────────────────────────────────────────────────────────
export interface CanvasEditorProps {
  paginas: PaginaCanvas[];
  onChange: (paginas: PaginaCanvas[]) => void;
  config: OrcConfig;
  negociacao: NegociacaoData;
  orcamento: Orcamento;
  imageMap: Record<string, string[]>; // produto_id -> array of img URLs
  onExportPDF: (getPageDataURL: (idx: number) => Promise<string>) => void;
}

export default function CanvasEditor({
  paginas, onChange, config, negociacao, orcamento, imageMap, onExportPDF,
}: CanvasEditorProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paginaIdx, setPaginaIdx] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [containerW, setContainerW] = useState(700);
  const [exporting, setExporting] = useState(false);

  // Undo/redo
  const [history, setHistory] = useState<PaginaCanvas[][]>([paginas]);
  const [histIdx, setHistIdx] = useState(0);

  const pagina = paginas[paginaIdx];
  const itens = orcamento.itens ?? [];

  // Compute scale to fit container
  const scale = Math.min((containerW - 32) / PAGE_W, 1) * zoom;
  const stageW = PAGE_W * scale;
  const stageH = PAGE_H * scale;

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => setContainerW(el.clientWidth));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Transformer sync
  useEffect(() => {
    const tr = transformerRef.current;
    const stage = stageRef.current;
    if (!tr || !stage) return;
    if (selectedId) {
      const node = stage.findOne(`#${selectedId}`);
      tr.nodes(node ? [node] : []);
    } else {
      tr.nodes([]);
    }
    tr.getLayer()?.batchDraw();
  }, [selectedId, paginaIdx]);

  // Keyboard shortcuts
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') { e.preventDefault(); redo(); }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault();
        deleteSelected();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') { e.preventDefault(); duplicateSelected(); }
      if (e.key === 'Escape') setSelectedId(null);
      // Arrow keys: move 1px (Shift = 10px)
      if (selectedId && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) {
        e.preventDefault();
        const delta = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -delta : e.key === 'ArrowRight' ? delta : 0;
        const dy = e.key === 'ArrowUp' ? -delta : e.key === 'ArrowDown' ? delta : 0;
        updateElement(selectedId, patch => ({ x: patch.x + dx, y: patch.y + dy }));
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  });

  // ── History ──────────────────────────────────────────────────────────────────
  const pushHistory = useCallback((newPaginas: PaginaCanvas[]) => {
    setHistory(h => {
      const trimmed = h.slice(0, histIdx + 1);
      return [...trimmed.slice(-49), newPaginas];
    });
    setHistIdx(i => Math.min(i + 1, 49));
  }, [histIdx]);

  const undo = useCallback(() => {
    if (histIdx <= 0) return;
    const ni = histIdx - 1;
    setHistIdx(ni);
    onChange(history[ni]);
  }, [histIdx, history, onChange]);

  const redo = useCallback(() => {
    if (histIdx >= history.length - 1) return;
    const ni = histIdx + 1;
    setHistIdx(ni);
    onChange(history[ni]);
  }, [histIdx, history, onChange]);

  // ── Update helpers ────────────────────────────────────────────────────────────
  const updatePagina = useCallback((idx: number, fn: (p: PaginaCanvas) => PaginaCanvas) => {
    const next = paginas.map((p, i) => i === idx ? fn(p) : p);
    onChange(next);
    pushHistory(next);
  }, [paginas, paginaIdx, onChange, pushHistory]);

  const updateElement = useCallback((id: string, patchFn: (el: Elemento) => Partial<Elemento>) => {
    updatePagina(paginaIdx, p => ({
      ...p,
      elementos: p.elementos.map(e => e.id === id ? { ...e, ...patchFn(e) } : e),
    }));
  }, [paginaIdx, updatePagina]);

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    updatePagina(paginaIdx, p => ({ ...p, elementos: p.elementos.filter(e => e.id !== selectedId) }));
    setSelectedId(null);
  }, [selectedId, paginaIdx, updatePagina]);

  const duplicateSelected = useCallback(() => {
    if (!selectedId) return;
    const el = paginas[paginaIdx]?.elementos.find(e => e.id === selectedId);
    if (!el) return;
    const clone = { ...el, id: Math.random().toString(36).slice(2), x: el.x + 10, y: el.y + 10 };
    updatePagina(paginaIdx, p => ({ ...p, elementos: [...p.elementos, clone] }));
    setSelectedId(clone.id);
  }, [selectedId, paginaIdx, paginas, updatePagina]);

  // ── Export PDF ────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (!stageRef.current) return;
    setExporting(true);
    const stage = stageRef.current;
    const origPaginaIdx = paginaIdx;
    const getPageDataURL = async (idx: number): Promise<string> => {
      // Render each page by temporarily switching
      await new Promise<void>(resolve => {
        setPaginaIdx(idx);
        setTimeout(resolve, 80); // allow render
      });
      return capturarPaginaKonva(stage);
    };
    try {
      await onExportPDF(getPageDataURL);
    } finally {
      setPaginaIdx(origPaginaIdx);
      setExporting(false);
    }
  };

  // ── Add element ───────────────────────────────────────────────────────────────
  const addElement = useCallback((el: Elemento) => {
    updatePagina(paginaIdx, p => ({ ...p, elementos: [...p.elementos, el] }));
    setSelectedId(el.id);
  }, [paginaIdx, updatePagina]);

  // ── Page management ───────────────────────────────────────────────────────────
  const updatePageOrder = (newPaginas: PaginaCanvas[]) => {
    const clampedIdx = Math.min(paginaIdx, newPaginas.length - 1);
    setPaginaIdx(clampedIdx);
    onChange(newPaginas);
    pushHistory(newPaginas);
  };

  const selectedEl = pagina?.elementos.find(e => e.id === selectedId);

  return (
    <div className="flex flex-col h-full">
      {/* ── TOOLBAR ── */}
      <div className="bg-white border-b border-slate-200 px-3 py-1.5 flex items-center gap-2 shrink-0 flex-wrap">
        <div className="flex items-center gap-1">
          <button onClick={undo} disabled={histIdx <= 0} title="Desfazer (Ctrl+Z)"
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-30">
            <Undo2 size={14}/>
          </button>
          <button onClick={redo} disabled={histIdx >= history.length - 1} title="Refazer (Ctrl+Y)"
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 disabled:opacity-30">
            <Redo2 size={14}/>
          </button>
        </div>
        <div className="w-px h-4 bg-slate-200"/>
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><ZoomOut size={14}/></button>
          <span className="text-xs font-mono text-slate-600 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><ZoomIn size={14}/></button>
          <button onClick={() => setZoom(1)} className="px-2 py-1 text-xs rounded hover:bg-slate-100 text-slate-500">Reset</button>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-xs text-slate-400">Pág {paginaIdx + 1}/{paginas.length}</span>
          <button onClick={handleExport} disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-60">
            {exporting ? <Loader2 size={12} className="animate-spin"/> : <Printer size={12}/>}
            Exportar PDF
          </button>
        </div>
      </div>

      {/* ── BODY: sidebar + canvas + properties ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <CanvasSidebar
          itens={itens}
          imageMap={imageMap}
          onAddElement={addElement}
          currentPagina={pagina}
          updatePagina={(fn) => updatePagina(paginaIdx, fn)}
        />

        {/* Canvas area */}
        <div
          ref={containerRef}
          className="flex-1 bg-slate-300 overflow-auto custom-scrollbar flex items-start justify-center p-4"
          onClick={() => setSelectedId(null)}
        >
          {pagina && (
            <div style={{ width: stageW, height: stageH, flexShrink: 0, position: 'relative' }}>
              <Stage
                ref={stageRef}
                width={stageW}
                height={stageH}
                scaleX={scale} scaleY={scale}
                style={{ boxShadow: '0 4px 32px rgba(0,0,0,0.2)' }}
                onClick={(e) => { if (e.target === e.target.getStage()) setSelectedId(null); }}
              >
                <Layer>
                  {/* Background */}
                  <Rect width={PAGE_W} height={PAGE_H} fill={pagina.fundo_cor}/>
                  {/* Elements sorted by z_index */}
                  {[...pagina.elementos]
                    .sort((a, b) => a.z_index - b.z_index)
                    .map(el => (
                      <CanvasEl
                        key={el.id}
                        el={el}
                        neg={negociacao}
                        orc={orcamento}
                        config={config}
                        itens={itens}
                        imageMap={imageMap}
                        onSelect={() => setSelectedId(el.id)}
                        onChange={patch => updateElement(el.id, () => patch)}
                      />
                    ))
                  }
                  <Transformer
                    ref={transformerRef}
                    boundBoxFunc={(oldBox, newBox) => {
                      if (newBox.width < 10 || newBox.height < 10) return oldBox;
                      return newBox;
                    }}
                    rotateEnabled={true}
                    keepRatio={false}
                    borderStroke="#7c3aed"
                    borderStrokeWidth={1.5}
                    anchorStroke="#7c3aed"
                    anchorFill="#ffffff"
                    anchorSize={8}
                  />
                </Layer>
              </Stage>
            </div>
          )}
        </div>

        {/* Right properties */}
        {selectedEl && (
          <PropertiesPanel
            el={selectedEl}
            itens={itens}
            imageMap={imageMap}
            config={config}
            onChange={patch => updateElement(selectedEl.id, () => ({ ...selectedEl, ...patch }))}
            onDelete={deleteSelected}
            onDuplicate={duplicateSelected}
            onBringForward={() => updateElement(selectedEl.id, e => ({ z_index: e.z_index + 1 }))}
            onSendBack={() => updateElement(selectedEl.id, e => ({ z_index: Math.max(0, e.z_index - 1) }))}
            onToggleLock={() => updateElement(selectedEl.id, e => ({ bloqueado: !e.bloqueado }))}
            onToggleVisible={() => updateElement(selectedEl.id, e => ({ visivel: !e.visivel }))}
          />
        )}
      </div>

      {/* ── PAGE PANEL ── */}
      <CanvasPagePanel
        paginas={paginas}
        paginaIdx={paginaIdx}
        setPaginaIdx={setPaginaIdx}
        onChange={updatePageOrder}
        config={config}
      />
    </div>
  );
}
