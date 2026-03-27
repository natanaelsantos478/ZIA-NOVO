// ─────────────────────────────────────────────────────────────────────────────
// CanvasEditor.tsx — Editor visual tipo Canva com react-konva
// Suporta: drag, resize, rotate, seleção, undo/redo, zoom
// negociacao e orcamento são opcionais (modo template global)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { Stage, Layer, Rect, Text, Image as KImage, Group, Transformer, Ellipse, Line } from 'react-konva';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import {
  Undo2, Redo2, ZoomIn, ZoomOut, Printer, Loader2, MousePointer2, Monitor, Palette, FileText,
} from 'lucide-react';
import { SketchPicker } from 'react-color';
import type {
  PaginaCanvas, Elemento, TextoDados, ImagemDados, FormaDados,
  LogoDados, ProdutoCardDados, TabelaDados, CampoDadoDados, OrcConfig, PageFormato,
} from '../types';
import { PAGE_W, PAGE_H, CAMPOS_DADOS, PAGE_FORMATOS } from '../types';
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

// ── Contexto de produto para PRODUTO_TEMPLATE ────────────────────────────────
interface ProdutoCtx {
  nome?: string; descricao?: string; preco?: string;
  codigo?: string; unidade?: string; quantidade?: string; total?: string;
}

// ── Resolução de variáveis dinâmicas ──────────────────────────────────────────
function resolveTexto(
  dados: TextoDados,
  neg: NegociacaoData | undefined,
  orc: Orcamento | undefined,
  config: OrcConfig,
  produto?: ProdutoCtx,
): string {
  if (dados.variavel) {
    return resolverVariaveis(dados.variavel, {
      cliente_nome: neg?.negociacao.clienteNome ?? '',
      numero: orc?.numero ?? '',
      data_hoje: new Date().toLocaleDateString('pt-BR'),
      validade: orc?.validade ? new Date(orc.validade).toLocaleDateString('pt-BR') : '',
      vendedor: orc?.vendedor ?? '',
      total: orc?.total?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? '',
      empresa: config.empresa,
      produto_nome: produto?.nome,
      produto_descricao: produto?.descricao,
      produto_preco: produto?.preco,
      produto_codigo: produto?.codigo,
      produto_unidade: produto?.unidade,
      produto_quantidade: produto?.quantidade,
      produto_total: produto?.total,
    });
  }
  return dados.conteudo;
}

// ── Elemento TEXTO ────────────────────────────────────────────────────────────
function ElTexto({
  el, neg, orc, config, produto,
}: { el: Elemento; neg?: NegociacaoData; orc?: Orcamento; config: OrcConfig; produto?: ProdutoCtx }) {
  const d = el.dados as TextoDados;
  const text = resolveTexto(d, neg, orc, config, produto);
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
function ElTabela({ el, itens, imageMap }: { el: Elemento; itens: ItemOrcamento[]; imageMap?: Record<string, string[]> }) {
  const d = el.dados as TabelaDados;
  const layout = d.layout_linha ?? 'compacto';
  const comImagem = layout === 'com_imagem';
  const IMG_W = comImagem ? 48 : 0;
  const ROW_H = comImagem ? (d.altura_linha_imagem ?? 52) : 28;
  const availW = el.largura - IMG_W;
  const COL_W = availW / Math.max(d.colunas_visiveis.length, 1);

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
      {/* Cabeçalho */}
      <Rect width={el.largura} height={ROW_H} fill={d.cor_cabecalho} listening={false}/>
      {comImagem && (
        <Text x={4} y={0} width={IMG_W - 4} height={ROW_H}
          text="Img" fontSize={d.fonte_tamanho} fontStyle="bold"
          fill="#ffffff" align="center" verticalAlign="middle" listening={false}/>
      )}
      {d.colunas_visiveis.map((col, ci) => (
        <Text key={col} x={IMG_W + ci * COL_W + 4} y={0} width={COL_W - 8} height={ROW_H}
          text={HEADERS[col] ?? col} fontSize={d.fonte_tamanho} fontStyle="bold"
          fill="#ffffff" align="center" verticalAlign="middle" listening={false}/>
      ))}

      {/* Linhas */}
      {itens.map((item, ri) => {
        const imgs = item.produto_id ? (imageMap?.[item.produto_id] ?? []) : [];
        const imgUrl = imgs[0];
        return (
          <Group key={item.id} y={(ri + 1) * ROW_H}>
            <Rect width={el.largura} height={ROW_H} fill={ri % 2 === 0 ? d.cor_linhas_pares : d.cor_linhas_impares} listening={false}/>
            <Rect y={ROW_H - 1} width={el.largura} height={1} fill={d.cor_borda} listening={false}/>
            {/* Coluna imagem */}
            {comImagem && (
              <>
                {imgUrl
                  ? <ElImageFromUrl src={imgUrl} x={2} y={2} w={IMG_W - 4} h={ROW_H - 4} radius={4}/>
                  : <Rect x={2} y={2} width={IMG_W - 4} height={ROW_H - 4} fill="#f1f5f9" cornerRadius={4} listening={false}/>
                }
              </>
            )}
            {d.colunas_visiveis.map((col, ci) => (
              <Text key={col} x={IMG_W + ci * COL_W + 4} y={0} width={COL_W - 8} height={ROW_H}
                text={getVal(item, col)} fontSize={d.fonte_tamanho} fill={d.cor_texto}
                align={['total', 'preco_unitario', 'quantidade'].includes(col) ? 'right' : 'left'}
                verticalAlign="middle" listening={false}/>
            ))}
          </Group>
        );
      })}

      {/* Total */}
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

// Auxiliar: imagem em KImage a partir de URL (hook interno) ──────────────────
function ElImageFromUrl({ src, x, y, w, h, radius }: { src: string; x: number; y: number; w: number; h: number; radius: number }) {
  const img = useKonvaImage(src);
  if (!img) return null;
  return <KImage image={img} x={x} y={y} width={w} height={h} cornerRadius={radius} listening={false}/>;
}

// ── Elemento CAMPO_DADO ───────────────────────────────────────────────────────
function ElCampoDado({
  el, neg, orc, config,
}: { el: Elemento; neg?: NegociacaoData; orc?: Orcamento; config: OrcConfig }) {
  const d = el.dados as CampoDadoDados;

  function resolverChave(chave: string): string {
    const nCli = neg?.negociacao.clienteNome ?? '';
    const mapa: Record<string, string> = {
      cliente_nome:        nCli,
      cliente_cnpj:        neg?.negociacao.clienteCnpj ?? '',
      cliente_email:       neg?.negociacao.clienteEmail ?? '',
      cliente_telefone:    neg?.negociacao.clienteTelefone ?? '',
      cliente_endereco:    neg?.negociacao.clienteEndereco ?? '',
      numero_orcamento:    orc?.numero ?? '',
      data_hoje:           new Date().toLocaleDateString('pt-BR'),
      validade:            orc?.validade ? new Date(orc.validade).toLocaleDateString('pt-BR') : '',
      vendedor:            orc?.vendedor ?? '',
      condicao_pagamento:  orc?.condicao_pagamento ?? '',
      prazo_entrega:       orc?.prazo_entrega ?? '',
      total_produtos:      orc ? `R$ ${orc.itens.reduce((s, i) => s + i.total, 0).toFixed(2)}` : '',
      desconto_global:     orc ? `${orc.desconto_global_pct}%` : '',
      frete:               orc ? `R$ ${orc.frete.toFixed(2)}` : '',
      total_orcamento:     orc?.total ? `R$ ${orc.total.toFixed(2)}` : '',
      observacoes:         orc?.observacoes ?? '',
      texto_validade:      config.texto_validade,
      texto_rodape:        config.texto_rodape,
      empresa:             config.empresa,
    };
    return mapa[chave] ?? `{{${chave}}}`;
  }

  const campo = CAMPOS_DADOS.find(c => c.chave === d.chave);
  const labelTexto = d.label_texto || campo?.label || d.chave;
  const valor = resolverChave(d.chave);
  const pad = d.padding ?? 4;

  const labelH = d.label_visivel && d.label_posicao === 'acima' ? (d.tamanho_label ?? 10) + 4 : 0;
  const valueY = d.label_visivel && d.label_posicao === 'acima' ? labelH : 0;
  const labelW = d.label_visivel && d.label_posicao === 'lado' ? 80 : el.largura;
  const valueX = d.label_visivel && d.label_posicao === 'lado' ? labelW : 0;
  const valueW = d.label_visivel && d.label_posicao === 'lado' ? el.largura - labelW : el.largura;

  return (
    <>
      {d.cor_fundo !== 'transparent' && (
        <Rect width={el.largura} height={el.altura} fill={d.cor_fundo}
          cornerRadius={d.borda_arredondada} listening={false}/>
      )}
      {d.label_visivel && (
        <Text
          x={pad} y={d.label_posicao === 'acima' ? pad : (el.altura - (d.tamanho_label ?? 10)) / 2}
          width={labelW - pad * 2}
          text={labelTexto}
          fontSize={d.tamanho_label ?? 10}
          fontFamily={(d.fonte ?? 'Inter') + ', sans-serif'}
          fill={d.cor} align="left" verticalAlign="middle"
          listening={false}
        />
      )}
      <Text
        x={valueX + pad} y={valueY + pad}
        width={valueW - pad * 2}
        height={el.altura - valueY - pad * 2}
        text={valor || '—'}
        fontSize={d.tamanho_valor ?? 14}
        fontFamily={(d.fonte ?? 'Inter') + ', sans-serif'}
        fontStyle={d.negrito_valor ? 'bold' : 'normal'}
        fill={d.cor}
        align={(d.alinhamento ?? 'left') as 'left' | 'center' | 'right'}
        verticalAlign="middle"
        listening={false}
      />
    </>
  );
}

// ── Elemento genérico ─────────────────────────────────────────────────────────
function CanvasEl({
  el, neg, orc, config, itens, imageMap, produto,
  onSelect, onChange,
}: {
  el: Elemento;
  neg?: NegociacaoData; orc?: Orcamento; config: OrcConfig;
  itens: ItemOrcamento[]; imageMap: Record<string, string[]>;
  produto?: ProdutoCtx;
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
      {/* Área de hit invisível — fill não-transparente garante hit-test no Konva v10 */}
      <Rect
        x={0} y={0} width={el.largura} height={el.altura}
        fill="rgba(0,0,0,0.001)"
      />
      {el.tipo === 'TEXTO'           && <ElTexto el={el} neg={neg} orc={orc} config={config} produto={produto}/>}
      {el.tipo === 'IMAGEM'          && <ElImagem el={el}/>}
      {el.tipo === 'FORMA'           && <ElForma el={el}/>}
      {el.tipo === 'LOGO'            && <ElLogo el={el} config={config}/>}
      {el.tipo === 'PRODUTO_CARD'    && <ElProdutoCard el={el} itens={itens} imageMap={imageMap}/>}
      {el.tipo === 'TABELA_PRODUTOS' && <ElTabela el={el} itens={itens} imageMap={imageMap}/>}
      {el.tipo === 'CAMPO_DADO'      && <ElCampoDado el={el} neg={neg} orc={orc} config={config}/>}
    </Group>
  );
}

// ── Inline color picker for page props ───────────────────────────────────────
function PageColorInput({ label, value, onChange }: { label: string; value: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <label className="text-xs text-slate-400 block mb-0.5">{label}</label>
      <div className="flex items-center gap-1.5 relative">
        <button onClick={() => setOpen(o => !o)}
          className="w-7 h-7 rounded border border-slate-200 flex-shrink-0"
          style={{ background: value }}/>
        <input value={value} onChange={e => onChange(e.target.value)}
          className="flex-1 border border-slate-200 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400"/>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}/>
            <div className="absolute z-50 right-0 top-full mt-1 shadow-xl">
              <SketchPicker color={value} onChange={c => onChange(c.hex)}
                presetColors={['#ffffff','#000000','#f8fafc','#7c3aed','#2563eb','#16a34a','#dc2626','#f59e0b','#1e293b','#0f172a']}/>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Painel de propriedades da página (lado direito, nenhum elemento selecionado) ─
interface PagePropsPanelProps {
  pagina: PaginaCanvas;
  itens: ItemOrcamento[];
  onUpdate: (fn: (p: PaginaCanvas) => PaginaCanvas) => void;
  isProdutoTemplate: boolean;
}
function PagePropsPanel({ pagina, itens, onUpdate, isProdutoTemplate }: PagePropsPanelProps) {
  const inp = 'w-full border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400';
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-slate-200 shrink-0 flex items-center gap-1.5">
        <Palette size={13} className="text-slate-400"/>
        <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Página</span>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
        {/* Nome da página */}
        <div>
          <label className="text-xs text-slate-400 block mb-0.5">Nome</label>
          <input value={pagina.nome} onChange={e => onUpdate(p => ({ ...p, nome: e.target.value }))} className={inp}/>
        </div>

        {/* Cor de fundo */}
        <PageColorInput
          label="Cor de fundo"
          value={pagina.fundo_cor}
          onChange={c => onUpdate(p => ({ ...p, fundo_cor: c }))}
        />

        {/* Produto referenciado — apenas PRODUTO_TEMPLATE */}
        {isProdutoTemplate && (
          <div>
            <p className="text-xs font-bold text-violet-600 mb-1.5 border-t border-slate-100 pt-3">Produto referenciado</p>
            <p className="text-xs text-slate-400 mb-1.5 leading-tight">
              Define qual produto esta página exibe no preview e no PDF. Deixe vazio para expandir para todos os produtos.
            </p>
            <select
              value={pagina.produto_id_ref ?? ''}
              onChange={e => onUpdate(p => ({ ...p, produto_id_ref: e.target.value || undefined }))}
              className={inp}
            >
              <option value="">— Todos os produtos —</option>
              {itens.filter(i => i.produto_id).map(i => (
                <option key={i.produto_id} value={i.produto_id!}>{i.produto_nome}</option>
              ))}
            </select>
            <p className="text-xs text-violet-500 mt-2 leading-tight border border-violet-100 bg-violet-50 rounded p-2">
              Esta página será repetida 1× por produto no PDF. Use os campos na sidebar para inserir variáveis do produto.
            </p>
          </div>
        )}

        {/* Dica */}
        <div className="mt-4 text-center">
          <MousePointer2 size={24} className="text-slate-200 mx-auto mb-2"/>
          <p className="text-xs text-slate-400 leading-relaxed">
            Clique em um elemento para editar suas propriedades
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main CanvasEditor ─────────────────────────────────────────────────────────
export interface CanvasEditorProps {
  paginas: PaginaCanvas[];
  onChange: (paginas: PaginaCanvas[]) => void;
  config: OrcConfig;
  negociacao?: NegociacaoData;
  orcamento?: Orcamento;
  imageMap: Record<string, string[]>;
  onExportPDF?: (getPageDataURL: (idx: number) => Promise<string>, totalExpandido: number) => void;
  formato?: PageFormato;
  onFormatoChange?: (f: PageFormato) => void;
  /** Modo somente-leitura: desabilita edição, exibe apenas controles de exportação */
  readonly?: boolean;
  /** Informação do orçamento para nomear o arquivo HTML */
  exportInfo?: { numero?: string; cliente_nome: string };
}

export default function CanvasEditor({
  paginas, onChange, config, negociacao, orcamento, imageMap, onExportPDF,
  formato: formatoProp = 'A4', onFormatoChange, readonly = false, exportInfo,
}: CanvasEditorProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paginaIdx, setPaginaIdx] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [containerW, setContainerW] = useState(700);
  const [exporting, setExporting] = useState(false);
  const [formato, setFormato] = useState<PageFormato>(formatoProp);
  // Índice do produto atual durante export de PRODUTO_TEMPLATE
  const [produtoExportIdx, setProdutoExportIdx] = useState<number | null>(null);

  const pgW = PAGE_FORMATOS[formato]?.w ?? PAGE_W;
  const pgH = PAGE_FORMATOS[formato]?.h ?? PAGE_H;

  const handleFormatoChange = (f: PageFormato) => {
    setFormato(f);
    onFormatoChange?.(f);
  };

  // Undo/redo
  const [history, setHistory] = useState<PaginaCanvas[][]>([paginas]);
  const [histIdx, setHistIdx] = useState(0);

  const pagina = paginas[paginaIdx];
  const itens = orcamento?.itens ?? [];
  const isProdutoTemplate = pagina?.tipo === 'PRODUTO_TEMPLATE';

  // Contexto de produto: real durante export, produto_id_ref na edição, ou mock
  const produtoCtxAtual: ProdutoCtx | undefined = (() => {
    if (!isProdutoTemplate) return undefined;
    if (produtoExportIdx !== null) {
      const item = itens[produtoExportIdx];
      if (!item) return undefined;
      return {
        nome: item.produto_nome,
        descricao: '',
        preco: `R$ ${item.preco_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        codigo: item.codigo ?? '',
        unidade: item.unidade,
        quantidade: String(item.quantidade),
        total: `R$ ${item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      };
    }
    // Preview com produto referenciado durante edição
    if (pagina?.produto_id_ref) {
      const item = itens.find(i => i.produto_id === pagina.produto_id_ref);
      if (item) {
        return {
          nome: item.produto_nome,
          descricao: '',
          preco: `R$ ${item.preco_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          codigo: item.codigo ?? '',
          unidade: item.unidade,
          quantidade: String(item.quantidade),
          total: `R$ ${item.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        };
      }
    }
    // Mock de preview
    return {
      nome: 'Produto Exemplo',
      descricao: 'Descrição do produto aparece aqui',
      preco: 'R$ 1.500,00',
      codigo: 'PROD-001',
      unidade: 'Un',
      quantidade: '2',
      total: 'R$ 3.000,00',
    };
  })();

  const scale = Math.min((containerW - 32) / pgW, 1) * zoom;
  const stageW = pgW * scale;
  const stageH = pgH * scale;

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
  }, [paginas, onChange, pushHistory]);

  const updateElement = useCallback((id: string, patchFn: (el: Elemento) => Partial<Elemento>) => {
    updatePagina(paginaIdx, p => ({
      ...p,
      elementos: p.elementos.map(e => e.id === id ? { ...e, ...patchFn(e) } : e),
    }));
  }, [paginaIdx, updatePagina]);

  const deleteSelected = useCallback(() => {
    if (!selectedId || !pagina) return;
    // PRODUTO_TEMPLATE: validar que ainda ficará pelo menos 1 identificador (nome, código ou foto)
    if (isProdutoTemplate) {
      const after = pagina.elementos.filter(e => e.id !== selectedId);
      const hasNome   = after.some(e => e.tipo === 'TEXTO'       && (e.dados as TextoDados).variavel?.includes('produto_nome'));
      const hasCodigo = after.some(e => e.tipo === 'TEXTO'       && (e.dados as TextoDados).variavel?.includes('produto_codigo'));
      const hasFoto   = after.some(e => e.tipo === 'IMAGEM' || e.tipo === 'PRODUTO_CARD');
      if (!hasNome && !hasCodigo && !hasFoto) {
        alert('Esta página de produto precisa ter pelo menos: nome do produto, número de referência ou uma foto. Adicione outro identificador antes de remover este.');
        return;
      }
    }
    updatePagina(paginaIdx, p => ({ ...p, elementos: p.elementos.filter(e => e.id !== selectedId) }));
    setSelectedId(null);
  }, [selectedId, paginaIdx, pagina, isProdutoTemplate, updatePagina]);

  const duplicateSelected = useCallback(() => {
    if (!selectedId) return;
    const el = paginas[paginaIdx]?.elementos.find(e => e.id === selectedId);
    if (!el) return;
    const clone = { ...el, id: Math.random().toString(36).slice(2), x: el.x + 10, y: el.y + 10 };
    updatePagina(paginaIdx, p => ({ ...p, elementos: [...p.elementos, clone] }));
    setSelectedId(clone.id);
  }, [selectedId, paginaIdx, paginas, updatePagina]);

  // ── Export PDF — expande PRODUTO_TEMPLATE 1× por produto ────────────────────
  const handleExport = async () => {
    if (!stageRef.current || !onExportPDF) return;
    setExporting(true);
    const stage = stageRef.current;
    const origPaginaIdx = paginaIdx;

    // Monta lista expandida: PRODUTO_TEMPLATE gera N entradas (N = nº de itens)
    // Se produto_id_ref estiver definido, gera apenas 1 entrada para aquele produto.
    type PageEntry = { paginaIdx: number; produtoIdx: number | null };
    const expandidas: PageEntry[] = [];
    paginas.forEach((p, i) => {
      if (p.tipo === 'PRODUTO_TEMPLATE') {
        if (p.produto_id_ref) {
          // Página vinculada a produto específico
          const pi = itens.findIndex(it => it.produto_id === p.produto_id_ref);
          expandidas.push({ paginaIdx: i, produtoIdx: pi >= 0 ? pi : null });
        } else if (itens.length === 0) {
          expandidas.push({ paginaIdx: i, produtoIdx: null });
        } else {
          // Sem referência: expandir para todos os produtos
          itens.forEach((_, pi) => expandidas.push({ paginaIdx: i, produtoIdx: pi }));
        }
      } else {
        expandidas.push({ paginaIdx: i, produtoIdx: null });
      }
    });

    const getPageDataURL = async (idx: number): Promise<string> => {
      const entry = expandidas[idx];
      await new Promise<void>(resolve => {
        setPaginaIdx(entry.paginaIdx);
        setProdutoExportIdx(entry.produtoIdx);
        setTimeout(resolve, 120);
      });
      return capturarPaginaKonva(stage);
    };

    try {
      await onExportPDF(getPageDataURL, expandidas.length);
    } finally {
      setPaginaIdx(origPaginaIdx);
      setProdutoExportIdx(null);
      setExporting(false);
    }
  };

  // ── Export HTML — embeds each page as base64 PNG ─────────────────────────────
  const handleExportHTML = async () => {
    if (!stageRef.current) return;
    setExporting(true);
    const stage = stageRef.current;
    const origPaginaIdx = paginaIdx;

    type PageEntry = { paginaIdx: number; produtoIdx: number | null };
    const expandidas: PageEntry[] = [];
    paginas.forEach((p, i) => {
      if (p.tipo === 'PRODUTO_TEMPLATE') {
        if (p.produto_id_ref) {
          const pi = itens.findIndex(it => it.produto_id === p.produto_id_ref);
          expandidas.push({ paginaIdx: i, produtoIdx: pi >= 0 ? pi : null });
        } else if (itens.length === 0) {
          expandidas.push({ paginaIdx: i, produtoIdx: null });
        } else {
          itens.forEach((_, pi) => expandidas.push({ paginaIdx: i, produtoIdx: pi }));
        }
      } else {
        expandidas.push({ paginaIdx: i, produtoIdx: null });
      }
    });

    try {
      const dataURLs: string[] = [];
      for (let idx = 0; idx < expandidas.length; idx++) {
        const entry = expandidas[idx];
        await new Promise<void>(resolve => {
          setPaginaIdx(entry.paginaIdx);
          setProdutoExportIdx(entry.produtoIdx);
          setTimeout(resolve, 120);
        });
        dataURLs.push(await capturarPaginaKonva(stage));
      }
      const nome = exportInfo
        ? `${exportInfo.numero ?? 'ORC'} — ${exportInfo.cliente_nome}`
        : 'Apresentação';
      const imgs = dataURLs.map(src =>
        `<img src="${src}" style="display:block;width:100%;max-width:900px;margin:0 auto 24px;box-shadow:0 4px 16px rgba(0,0,0,0.15);border-radius:4px">`
      ).join('\n');
      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${nome}</title>
  <style>body{margin:0;background:#e5e7eb;padding:24px;font-family:sans-serif}</style>
</head>
<body>
${imgs}
</body>
</html>`;
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${nome}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setPaginaIdx(origPaginaIdx);
      setProdutoExportIdx(null);
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
        {!readonly && (
          <>
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
          </>
        )}
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><ZoomOut size={14}/></button>
          <span className="text-xs font-mono text-slate-600 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><ZoomIn size={14}/></button>
          <button onClick={() => setZoom(1)} className="px-2 py-1 text-xs rounded hover:bg-slate-100 text-slate-500">Reset</button>
        </div>
        {isProdutoTemplate && !readonly && (
          <>
            <div className="w-px h-4 bg-slate-200"/>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700 border border-violet-200">
              Template por produto — 1 pág/produto
            </span>
          </>
        )}
        {!readonly && (
          <>
            <div className="w-px h-4 bg-slate-200"/>
            <div className="flex items-center gap-1">
              <Monitor size={13} className="text-slate-400"/>
              <select
                value={formato}
                onChange={e => handleFormatoChange(e.target.value as PageFormato)}
                className="text-xs border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white"
              >
                {(Object.entries(PAGE_FORMATOS) as [PageFormato, { label: string; w: number; h: number }][]).map(([k, v]) => (
                  <option key={k} value={k}>{v.label} ({v.w}×{v.h})</option>
                ))}
              </select>
            </div>
          </>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-xs text-slate-400">
            Pág {paginaIdx + 1}/{paginas.length}
            {paginas.some(p => p.tipo === 'PRODUTO_TEMPLATE') && itens.length > 0 && (
              <span className="ml-1 text-violet-500">({paginas.reduce((acc, p) => acc + (p.tipo === 'PRODUTO_TEMPLATE' ? itens.length : 1), 0)} no PDF)</span>
            )}
          </span>
          <button onClick={handleExportHTML} disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-60">
            {exporting ? <Loader2 size={12} className="animate-spin"/> : <FileText size={12}/>}
            Exportar HTML
          </button>
          {onExportPDF && (
            <button onClick={handleExport} disabled={exporting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-60">
              {exporting ? <Loader2 size={12} className="animate-spin"/> : <Printer size={12}/>}
              Exportar PDF
            </button>
          )}
        </div>
      </div>

      {/* ── BODY: sidebar + canvas + properties ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — apenas no modo edição */}
        {!readonly && <CanvasSidebar
          itens={itens}
          imageMap={imageMap}
          onAddElement={addElement}
          currentPagina={pagina}
          updatePagina={(fn) => updatePagina(paginaIdx, fn)}
          isProdutoTemplate={isProdutoTemplate}
        />}

        {/* Canvas area — NOTE: sem onClick no wrapper; Stage trata o clique no fundo */}
        <div
          ref={containerRef}
          className="flex-1 bg-slate-300 overflow-auto custom-scrollbar flex items-start justify-center p-4"
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
                  <Rect width={pgW} height={pgH} fill={pagina.fundo_cor}/>
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
                        produto={produtoCtxAtual}
                        onSelect={readonly ? () => {} : () => setSelectedId(el.id)}
                        onChange={readonly ? () => {} : patch => updateElement(el.id, () => patch)}
                      />
                    ))
                  }
                  {!readonly && <Transformer
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
                  />}
                </Layer>
              </Stage>
            </div>
          )}
        </div>

        {/* Right properties — apenas no modo edição */}
        {!readonly && (
          <div className="w-56 bg-white border-l border-slate-200 flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
            {selectedEl ? (
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
            ) : pagina ? (
              <PagePropsPanel
                pagina={pagina}
                itens={itens}
                onUpdate={(fn) => updatePagina(paginaIdx, fn)}
                isProdutoTemplate={isProdutoTemplate}
              />
            ) : null}
          </div>
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
