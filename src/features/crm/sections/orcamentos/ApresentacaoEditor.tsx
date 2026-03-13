// ─────────────────────────────────────────────────────────────────────────────
// ApresentacaoEditor.tsx — Editor visual tipo Canva para apresentações de orçamento
// Drag-and-drop livre, múltiplas páginas, campos dinâmicos, export PDF
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, Type, Image as ImageIcon, Square, Copy, ChevronUp,
  ChevronDown, Printer, Eye, EyeOff, AlignLeft, AlignCenter,
  AlignRight, X, LayoutTemplate, Package, Maximize2,
} from 'lucide-react';
import type { ErpProduto, ErpProdutoFoto } from '../../../../lib/erp';
import type { Orcamento, NegociacaoData } from '../../data/crmData';

/* ── TYPES ─────────────────────────────────────────────────────────────────── */
type TipoElemento = 'texto' | 'imagem' | 'retangulo' | 'produto-card' | 'logo';
type AlignType    = 'left' | 'center' | 'right';
type CampoDin     = 'cliente.nome' | 'negociacao.numero' | 'orc.numero' | 'data.emissao' | 'data.validade' | 'empresa.nome' | 'vendedor';

export interface TextoEl {
  conteudo: string; campo?: CampoDin;
  fontSize: number; cor: string; corFundo: string;
  negrito: boolean; italico: boolean; align: AlignType;
}
export interface ImagemEl { url: string; objectFit: 'cover'|'contain'|'fill'; borderRadius: number; opacity: number; }
export interface RetanguloEl { cor: string; opacity: number; borderRadius: number; }
export interface ProdutoCardEl { produtoId: string; mostrarPreco: boolean; mostrarDesc: boolean; imagemIndex: number; }

export interface ElementoApresentacao {
  id: string; tipo: TipoElemento;
  xPct: number; yPct: number; wPct: number; hPct: number;
  texto?: TextoEl; imagem?: ImagemEl; retangulo?: RetanguloEl; produtoCard?: ProdutoCardEl;
  visivel: boolean; bloqueado: boolean;
}

export interface PaginaApresentacao {
  id: string; tipo: 'capa'|'produtos'|'personalizada'|'contracapa';
  nome: string; background: string; elementos: ElementoApresentacao[];
}

export interface ConfigApresentacao {
  logo: string; corPrimaria: string; corSecundaria: string;
  fontePrincipal: string; rodape: string; empresa: string;
}

interface ApresentacaoEditorProps {
  paginas: PaginaApresentacao[];
  onChange: (paginas: PaginaApresentacao[]) => void;
  config: ConfigApresentacao;
  negociacao: NegociacaoData;
  orcamento: Orcamento;
  produtos: ErpProduto[];
  fotos: Record<string, ErpProdutoFoto[]>;
}

/* ── UTILS ──────────────────────────────────────────────────────────────────── */
const uid = () => Math.random().toString(36).slice(2, 9);

const CAMPOS_DINAMICOS: { value: CampoDin; label: string }[] = [
  { value: 'cliente.nome',       label: 'Nome do Cliente'        },
  { value: 'negociacao.numero',  label: 'Nº da Negociação'       },
  { value: 'orc.numero',         label: 'Nº do Orçamento'        },
  { value: 'data.emissao',       label: 'Data de Emissão'        },
  { value: 'data.validade',      label: 'Data de Validade'       },
  { value: 'empresa.nome',       label: 'Nome da Empresa'        },
  { value: 'vendedor',           label: 'Vendedor'               },
];

function resolveCampo(campo: CampoDin, neg: NegociacaoData, orc: Orcamento, empresa: string): string {
  switch (campo) {
    case 'cliente.nome':      return neg.negociacao.clienteNome;
    case 'negociacao.numero': return `NEG-${neg.negociacao.id.slice(0,6).toUpperCase()}`;
    case 'orc.numero':        return orc.numero ?? `ORC-${orc.id?.slice(0,6).toUpperCase() ?? '000001'}`;
    case 'data.emissao':      return new Date().toLocaleDateString('pt-BR');
    case 'data.validade':     return orc.validade ? new Date(orc.validade).toLocaleDateString('pt-BR') : '—';
    case 'empresa.nome':      return empresa;
    case 'vendedor':          return neg.negociacao.responsavel;
  }
}

function novoTexto(content = 'Texto'): ElementoApresentacao {
  return {
    id: uid(), tipo: 'texto', xPct: 10, yPct: 10, wPct: 40, hPct: 8, visivel: true, bloqueado: false,
    texto: { conteudo: content, fontSize: 18, cor: '#1e293b', corFundo: 'transparent', negrito: false, italico: false, align: 'left' },
  };
}
function novoRetangulo(cor = '#7c3aed'): ElementoApresentacao {
  return {
    id: uid(), tipo: 'retangulo', xPct: 10, yPct: 10, wPct: 30, hPct: 20, visivel: true, bloqueado: false,
    retangulo: { cor, opacity: 1, borderRadius: 8 },
  };
}
function novaImagem(url = ''): ElementoApresentacao {
  return {
    id: uid(), tipo: 'imagem', xPct: 10, yPct: 10, wPct: 30, hPct: 30, visivel: true, bloqueado: false,
    imagem: { url, objectFit: 'cover', borderRadius: 0, opacity: 1 },
  };
}
function novoProdutoCard(produtoId: string): ElementoApresentacao {
  return {
    id: uid(), tipo: 'produto-card', xPct: 5, yPct: 10, wPct: 90, hPct: 25, visivel: true, bloqueado: false,
    produtoCard: { produtoId, mostrarPreco: true, mostrarDesc: true, imagemIndex: 0 },
  };
}
function novaLogo(): ElementoApresentacao {
  return {
    id: uid(), tipo: 'logo', xPct: 5, yPct: 3, wPct: 20, hPct: 12, visivel: true, bloqueado: false,
  };
}

/* ── TEMPLATES DE PÁGINA ────────────────────────────────────────────────────── */
function paginaCapa(config: ConfigApresentacao): PaginaApresentacao {
  return {
    id: uid(), tipo: 'capa', nome: 'Capa', background: config.corPrimaria,
    elementos: [
      { id: uid(), tipo: 'retangulo', xPct: 0, yPct: 0, wPct: 100, hPct: 100, visivel: true, bloqueado: false,
        retangulo: { cor: config.corPrimaria, opacity: 1, borderRadius: 0 } },
      { id: uid(), tipo: 'logo', xPct: 5, yPct: 5, wPct: 22, hPct: 12, visivel: true, bloqueado: false },
      { id: uid(), tipo: 'texto', xPct: 5, yPct: 45, wPct: 60, hPct: 10, visivel: true, bloqueado: false,
        texto: { conteudo: 'Proposta Comercial', fontSize: 32, cor: '#ffffff', corFundo: 'transparent', negrito: true, italico: false, align: 'left' } },
      { id: uid(), tipo: 'texto', xPct: 5, yPct: 56, wPct: 70, hPct: 7, visivel: true, bloqueado: false,
        texto: { conteudo: '', campo: 'cliente.nome', fontSize: 22, cor: '#ffffff', corFundo: 'transparent', negrito: false, italico: false, align: 'left' } },
      { id: uid(), tipo: 'texto', xPct: 5, yPct: 63, wPct: 50, hPct: 5, visivel: true, bloqueado: false,
        texto: { conteudo: '', campo: 'data.emissao', fontSize: 14, cor: 'rgba(255,255,255,0.7)', corFundo: 'transparent', negrito: false, italico: false, align: 'left' } },
    ],
  };
}
function paginaProdutos(): PaginaApresentacao {
  return {
    id: uid(), tipo: 'produtos', nome: 'Produtos', background: '#ffffff',
    elementos: [
      { id: uid(), tipo: 'texto', xPct: 5, yPct: 3, wPct: 90, hPct: 7, visivel: true, bloqueado: false,
        texto: { conteudo: 'Produtos e Serviços', fontSize: 26, cor: '#1e293b', corFundo: 'transparent', negrito: true, italico: false, align: 'left' } },
    ],
  };
}
function paginaContracapa(config: ConfigApresentacao): PaginaApresentacao {
  return {
    id: uid(), tipo: 'contracapa', nome: 'Contracapa', background: '#f8fafc',
    elementos: [
      { id: uid(), tipo: 'retangulo', xPct: 0, yPct: 85, wPct: 100, hPct: 15, visivel: true, bloqueado: false,
        retangulo: { cor: config.corPrimaria, opacity: 1, borderRadius: 0 } },
      { id: uid(), tipo: 'texto', xPct: 5, yPct: 35, wPct: 90, hPct: 8, visivel: true, bloqueado: false,
        texto: { conteudo: 'Obrigado!', fontSize: 36, cor: '#1e293b', corFundo: 'transparent', negrito: true, italico: false, align: 'center' } },
      { id: uid(), tipo: 'texto', xPct: 5, yPct: 44, wPct: 90, hPct: 6, visivel: true, bloqueado: false,
        texto: { conteudo: config.rodape, fontSize: 14, cor: '#64748b', corFundo: 'transparent', negrito: false, italico: false, align: 'center' } },
    ],
  };
}

/* ── ELEMENTO RENDERIZADO NO CANVAS ─────────────────────────────────────────── */
function RenderElemento({
  el, isSelected, neg, orc, config, fotos, produtos,
  onSelect, onMouseDown,
}: {
  el: ElementoApresentacao; isSelected: boolean;
  neg: NegociacaoData; orc: Orcamento; config: ConfigApresentacao;
  fotos: Record<string, ErpProdutoFoto[]>; produtos: ErpProduto[];
  onSelect: () => void; onMouseDown: (e: React.MouseEvent) => void;
}) {
  if (!el.visivel) return null;
  const style: React.CSSProperties = {
    position: 'absolute', left: `${el.xPct}%`, top: `${el.yPct}%`,
    width: `${el.wPct}%`, height: `${el.hPct}%`,
    outline: isSelected ? '2px solid #7c3aed' : '1px solid transparent',
    cursor: el.bloqueado ? 'default' : 'move',
    boxSizing: 'border-box', overflow: 'hidden',
  };

  let inner: React.ReactNode = null;

  if (el.tipo === 'retangulo' && el.retangulo) {
    inner = <div style={{ width:'100%', height:'100%', background: el.retangulo.cor, opacity: el.retangulo.opacity, borderRadius: el.retangulo.borderRadius }} />;
  } else if (el.tipo === 'texto' && el.texto) {
    const t = el.texto;
    const text = t.campo ? resolveCampo(t.campo, neg, orc, config.empresa) : t.conteudo;
    inner = (
      <div style={{
        width:'100%', height:'100%', display:'flex', alignItems:'center',
        justifyContent: t.align === 'left' ? 'flex-start' : t.align === 'right' ? 'flex-end' : 'center',
        background: t.corFundo === 'transparent' ? 'transparent' : t.corFundo,
      }}>
        <span style={{
          fontSize: t.fontSize, color: t.cor, fontWeight: t.negrito ? 700 : 400,
          fontStyle: t.italico ? 'italic' : 'normal', textAlign: t.align,
          fontFamily: config.fontePrincipal || 'Inter, sans-serif', lineHeight: 1.3,
          padding: '0 4px', wordBreak: 'break-word', width: '100%',
        }}>{text}</span>
      </div>
    );
  } else if (el.tipo === 'imagem' && el.imagem) {
    const im = el.imagem;
    inner = im.url
      ? <img src={im.url} style={{ width:'100%', height:'100%', objectFit: im.objectFit, borderRadius: im.borderRadius, opacity: im.opacity }} alt=""/>
      : <div style={{ width:'100%', height:'100%', background:'#e2e8f0', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <ImageIcon size={28} className="text-slate-300" />
        </div>;
  } else if (el.tipo === 'logo' && config.logo) {
    inner = <img src={config.logo} style={{ width:'100%', height:'100%', objectFit:'contain' }} alt="logo"/>;
  } else if (el.tipo === 'logo') {
    inner = <div style={{ width:'100%', height:'100%', background:'#e2e8f0', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <span style={{ color:'#94a3b8', fontSize:11 }}>LOGO</span>
    </div>;
  } else if (el.tipo === 'produto-card' && el.produtoCard) {
    const pc = el.produtoCard;
    const prod = produtos.find(p => p.id === pc.produtoId);
    const fts = fotos[pc.produtoId] ?? [];
    const foto = fts[pc.imagemIndex]?.url;
    inner = (
      <div style={{ width:'100%', height:'100%', background:'white', borderRadius:8, padding:12, display:'flex', gap:12, alignItems:'center', border:'1px solid #e2e8f0' }}>
        {foto && <img src={foto} style={{ width:80, height:80, objectFit:'cover', borderRadius:6, flexShrink:0 }} alt=""/>}
        {!foto && <div style={{ width:80, height:80, background:'#f1f5f9', borderRadius:6, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}><Package size={24} className="text-slate-300"/></div>}
        <div style={{ flex:1, overflow:'hidden' }}>
          <div style={{ fontWeight:700, fontSize:14, color:'#1e293b', marginBottom:2 }}>{prod?.nome ?? pc.produtoId}</div>
          {pc.mostrarDesc && prod?.descricao && <div style={{ fontSize:11, color:'#64748b', marginBottom:4, lineHeight:1.3 }}>{prod.descricao.slice(0,100)}</div>}
          {pc.mostrarPreco && <div style={{ fontWeight:700, fontSize:16, color:'#7c3aed' }}>R$ {prod?.preco_venda?.toLocaleString('pt-BR',{minimumFractionDigits:2}) ?? '—'}</div>}
        </div>
      </div>
    );
  }

  return (
    <div style={style} onMouseDown={e => { if (el.bloqueado) return; e.stopPropagation(); onSelect(); onMouseDown(e); }}>
      {inner}
      {isSelected && !el.bloqueado && (
        <div style={{ position:'absolute', inset:0, outline:'2px solid #7c3aed', pointerEvents:'none' }}>
          <div style={{ position:'absolute', bottom:-4, right:-4, width:8, height:8, background:'#7c3aed', borderRadius:2, cursor:'se-resize' }}/>
        </div>
      )}
    </div>
  );
}

/* ── PAINEL DE PROPRIEDADES ──────────────────────────────────────────────────── */
function PainelPropriedades({
  el, fotos, produtos, onChange, onDelete, onToggleLock, onToggleVisible,
}: {
  el: ElementoApresentacao; fotos: Record<string, ErpProdutoFoto[]>; produtos: ErpProduto[];
  onChange: (patch: Partial<ElementoApresentacao>) => void;
  onDelete: () => void; onToggleLock: () => void; onToggleVisible: () => void;
}) {
  const inp = 'w-full border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-purple-400';

  return (
    <div className="p-3 space-y-4 text-xs overflow-y-auto custom-scrollbar h-full">
      {/* Actions */}
      <div className="flex gap-1.5 flex-wrap">
        <button onClick={onDelete} className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 rounded-lg border border-red-200 hover:bg-red-100">
          <Trash2 size={11}/> Excluir
        </button>
        <button onClick={onToggleLock} className={`flex items-center gap-1 px-2 py-1 rounded-lg border ${el.bloqueado ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-200'} hover:opacity-80`}>
          {el.bloqueado ? 'Desbloquear' : 'Bloquear'}
        </button>
        <button onClick={onToggleVisible} className="flex items-center gap-1 px-2 py-1 bg-slate-50 text-slate-600 rounded-lg border border-slate-200 hover:bg-slate-100">
          {el.visivel ? <Eye size={11}/> : <EyeOff size={11}/>} {el.visivel ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>

      {/* Posição e tamanho */}
      <div>
        <p className="font-semibold text-slate-600 mb-2">Posição e tamanho (%)</p>
        <div className="grid grid-cols-2 gap-1.5">
          {(['xPct','yPct','wPct','hPct'] as const).map(f => (
            <div key={f}>
              <label className="text-slate-400 block mb-0.5">{f === 'xPct' ? 'X' : f === 'yPct' ? 'Y' : f === 'wPct' ? 'Largura' : 'Altura'}</label>
              <input type="number" step={0.5} value={Math.round(el[f]*10)/10}
                onChange={e => onChange({ [f]: Number(e.target.value) })} className={inp}/>
            </div>
          ))}
        </div>
      </div>

      {/* Texto */}
      {el.tipo === 'texto' && el.texto && (
        <div className="space-y-2">
          <p className="font-semibold text-slate-600">Texto</p>
          <div>
            <label className="text-slate-400 block mb-0.5">Campo dinâmico</label>
            <select value={el.texto.campo ?? ''} onChange={e => onChange({ texto: { ...el.texto!, campo: e.target.value as CampoDin || undefined } })} className={inp}>
              <option value="">— Texto livre —</option>
              {CAMPOS_DINAMICOS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          {!el.texto.campo && (
            <div>
              <label className="text-slate-400 block mb-0.5">Conteúdo</label>
              <textarea rows={3} value={el.texto.conteudo} onChange={e => onChange({ texto: { ...el.texto!, conteudo: e.target.value } })} className={inp + ' resize-none'}/>
            </div>
          )}
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="text-slate-400 block mb-0.5">Tamanho (px)</label>
              <input type="number" min={8} max={120} value={el.texto.fontSize}
                onChange={e => onChange({ texto: { ...el.texto!, fontSize: Number(e.target.value) } })} className={inp}/>
            </div>
            <div>
              <label className="text-slate-400 block mb-0.5">Cor do texto</label>
              <input type="color" value={el.texto.cor} onChange={e => onChange({ texto: { ...el.texto!, cor: e.target.value } })} className="w-full h-7 border border-slate-200 rounded cursor-pointer"/>
            </div>
          </div>
          <div>
            <label className="text-slate-400 block mb-0.5">Cor de fundo</label>
            <div className="flex gap-1.5">
              <input type="color" value={el.texto.corFundo === 'transparent' ? '#ffffff' : el.texto.corFundo}
                onChange={e => onChange({ texto: { ...el.texto!, corFundo: e.target.value } })} className="w-8 h-7 border border-slate-200 rounded cursor-pointer flex-shrink-0"/>
              <button onClick={() => onChange({ texto: { ...el.texto!, corFundo: 'transparent' } })} className={`flex-1 py-1 rounded border text-xs ${el.texto.corFundo === 'transparent' ? 'bg-purple-100 border-purple-300 text-purple-700' : 'border-slate-200 text-slate-500'}`}>Transparente</button>
            </div>
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => onChange({ texto: { ...el.texto!, negrito: !el.texto!.negrito } })}
              className={`flex-1 py-1 rounded border font-bold ${el.texto.negrito ? 'bg-purple-100 border-purple-300 text-purple-700' : 'border-slate-200 text-slate-500'}`}>N</button>
            <button onClick={() => onChange({ texto: { ...el.texto!, italico: !el.texto!.italico } })}
              className={`flex-1 py-1 rounded border italic ${el.texto.italico ? 'bg-purple-100 border-purple-300 text-purple-700' : 'border-slate-200 text-slate-500'}`}>I</button>
            {(['left','center','right'] as AlignType[]).map(a => (
              <button key={a} onClick={() => onChange({ texto: { ...el.texto!, align: a } })}
                className={`flex-1 py-1 rounded border ${el.texto!.align === a ? 'bg-purple-100 border-purple-300 text-purple-700' : 'border-slate-200 text-slate-500'}`}>
                {a === 'left' ? <AlignLeft size={11} className="mx-auto"/> : a === 'center' ? <AlignCenter size={11} className="mx-auto"/> : <AlignRight size={11} className="mx-auto"/>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Imagem */}
      {el.tipo === 'imagem' && el.imagem && (
        <div className="space-y-2">
          <p className="font-semibold text-slate-600">Imagem</p>
          <div>
            <label className="text-slate-400 block mb-0.5">URL da imagem</label>
            <input value={el.imagem.url} onChange={e => onChange({ imagem: { ...el.imagem!, url: e.target.value } })} placeholder="https://..." className={inp}/>
          </div>
          <div>
            <label className="text-slate-400 block mb-0.5">Ajuste</label>
            <select value={el.imagem.objectFit} onChange={e => onChange({ imagem: { ...el.imagem!, objectFit: e.target.value as 'cover'|'contain'|'fill' } })} className={inp}>
              <option value="cover">Cobrir (cover)</option>
              <option value="contain">Conter (contain)</option>
              <option value="fill">Preencher (fill)</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="text-slate-400 block mb-0.5">Arredondamento</label>
              <input type="number" min={0} max={50} value={el.imagem.borderRadius}
                onChange={e => onChange({ imagem: { ...el.imagem!, borderRadius: Number(e.target.value) } })} className={inp}/>
            </div>
            <div>
              <label className="text-slate-400 block mb-0.5">Opacidade</label>
              <input type="number" min={0} max={1} step={0.05} value={el.imagem.opacity}
                onChange={e => onChange({ imagem: { ...el.imagem!, opacity: Number(e.target.value) } })} className={inp}/>
            </div>
          </div>
        </div>
      )}

      {/* Retângulo */}
      {el.tipo === 'retangulo' && el.retangulo && (
        <div className="space-y-2">
          <p className="font-semibold text-slate-600">Retângulo</p>
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="text-slate-400 block mb-0.5">Cor</label>
              <input type="color" value={el.retangulo.cor} onChange={e => onChange({ retangulo: { ...el.retangulo!, cor: e.target.value } })} className="w-full h-7 border border-slate-200 rounded cursor-pointer"/>
            </div>
            <div>
              <label className="text-slate-400 block mb-0.5">Opacidade</label>
              <input type="number" min={0} max={1} step={0.05} value={el.retangulo.opacity}
                onChange={e => onChange({ retangulo: { ...el.retangulo!, opacity: Number(e.target.value) } })} className={inp}/>
            </div>
            <div>
              <label className="text-slate-400 block mb-0.5">Arredondamento</label>
              <input type="number" min={0} max={50} value={el.retangulo.borderRadius}
                onChange={e => onChange({ retangulo: { ...el.retangulo!, borderRadius: Number(e.target.value) } })} className={inp}/>
            </div>
          </div>
        </div>
      )}

      {/* Produto card */}
      {el.tipo === 'produto-card' && el.produtoCard && (
        <div className="space-y-2">
          <p className="font-semibold text-slate-600">Card de Produto</p>
          <div>
            <label className="text-slate-400 block mb-0.5">Produto</label>
            <select value={el.produtoCard.produtoId} onChange={e => onChange({ produtoCard: { ...el.produtoCard!, produtoId: e.target.value } })} className={inp}>
              {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="text-slate-400 block mb-0.5">Índice da imagem (0-9)</label>
            <div className="flex gap-1 flex-wrap">
              {(fotos[el.produtoCard.produtoId] ?? []).map((f, i) => (
                <button key={i} onClick={() => onChange({ produtoCard: { ...el.produtoCard!, imagemIndex: i } })}
                  className={`w-8 h-8 rounded border overflow-hidden ${el.produtoCard!.imagemIndex === i ? 'border-purple-500 ring-2 ring-purple-300' : 'border-slate-200'}`}>
                  <img src={f.url} className="w-full h-full object-cover" alt=""/>
                </button>
              ))}
              {(fotos[el.produtoCard.produtoId] ?? []).length === 0 && <span className="text-slate-400">Sem imagens</span>}
            </div>
          </div>
          <div className="space-y-1">
            {[['mostrarPreco','Mostrar preço'],['mostrarDesc','Mostrar descrição']] .map(([k,l]) => (
              <label key={k} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={el.produtoCard![k as 'mostrarPreco'|'mostrarDesc']}
                  onChange={e => onChange({ produtoCard: { ...el.produtoCard!, [k]: e.target.checked } })}
                  className="w-3.5 h-3.5 accent-purple-600"/>
                <span className="text-slate-600">{l}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── MAIN COMPONENT ─────────────────────────────────────────────────────────── */
export default function ApresentacaoEditor({
  paginas, onChange, config, negociacao, orcamento, produtos, fotos,
}: ApresentacaoEditorProps) {
  const [paginaIdx, setPaginaIdx] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id:string; startMX:number; startMY:number; startXPct:number; startYPct:number } | null>(null);
  const resizeRef = useRef<{ id:string; startMX:number; startMY:number; startWPct:number; startHPct:number } | null>(null);

  const pagina = paginas[paginaIdx];

  const updatePagina = useCallback((idx: number, fn: (p: PaginaApresentacao) => PaginaApresentacao) => {
    const novo = [...paginas];
    novo[idx] = fn(novo[idx]);
    onChange(novo);
  }, [paginas, onChange]);

  const updateEl = useCallback((id: string, patch: Partial<ElementoApresentacao>) => {
    updatePagina(paginaIdx, p => ({
      ...p, elementos: p.elementos.map(e => e.id === id ? { ...e, ...patch } : e),
    }));
  }, [paginaIdx, updatePagina]);

  const deleteEl = useCallback((id: string) => {
    updatePagina(paginaIdx, p => ({ ...p, elementos: p.elementos.filter(e => e.id !== id) }));
    setSelectedId(null);
  }, [paginaIdx, updatePagina]);

  const addEl = useCallback((el: ElementoApresentacao) => {
    updatePagina(paginaIdx, p => ({ ...p, elementos: [...p.elementos, el] }));
    setSelectedId(el.id);
    setShowAdd(false);
  }, [paginaIdx, updatePagina]);

  // Drag handlers
  const handleElMouseDown = useCallback((e: React.MouseEvent, el: ElementoApresentacao) => {
    e.preventDefault();
    dragRef.current = { id: el.id, startMX: e.clientX, startMY: e.clientY, startXPct: el.xPct, startYPct: el.yPct };
  }, []);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!dragRef.current || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const dxPct = ((e.clientX - dragRef.current.startMX) / rect.width) * 100;
      const dyPct = ((e.clientY - dragRef.current.startMY) / rect.height) * 100;
      const el = paginas[paginaIdx]?.elementos.find(x => x.id === dragRef.current!.id);
      if (!el) return;
      updateEl(dragRef.current.id, {
        xPct: Math.max(0, Math.min(100 - el.wPct, dragRef.current.startXPct + dxPct)),
        yPct: Math.max(0, Math.min(100 - el.hPct, dragRef.current.startYPct + dyPct)),
      });
    };
    const handleResizeMove = (e: MouseEvent) => {
      if (!resizeRef.current || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const dxPct = ((e.clientX - resizeRef.current.startMX) / rect.width) * 100;
      const dyPct = ((e.clientY - resizeRef.current.startMY) / rect.height) * 100;
      updateEl(resizeRef.current.id, {
        wPct: Math.max(5, resizeRef.current.startWPct + dxPct),
        hPct: Math.max(3, resizeRef.current.startHPct + dyPct),
      });
    };
    const handleUp = () => { dragRef.current = null; resizeRef.current = null; };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mousemove', handleResizeMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [paginas, paginaIdx, updateEl]);

  const handleResizeMouseDown = (e: React.MouseEvent, el: ElementoApresentacao) => {
    e.preventDefault(); e.stopPropagation();
    resizeRef.current = { id: el.id, startMX: e.clientX, startMY: e.clientY, startWPct: el.wPct, startHPct: el.hPct };
  };

  // Page management
  const addPage = (tipo: PaginaApresentacao['tipo']) => {
    let nova: PaginaApresentacao;
    if (tipo === 'capa') nova = paginaCapa(config);
    else if (tipo === 'contracapa') nova = paginaContracapa(config);
    else if (tipo === 'produtos') nova = paginaProdutos();
    else nova = { id: uid(), tipo: 'personalizada', nome: 'Página', background: '#ffffff', elementos: [] };
    const novo = [...paginas, nova];
    onChange(novo);
    setPaginaIdx(novo.length - 1);
  };
  const deletePage = (idx: number) => {
    if (paginas.length <= 1) return;
    const novo = paginas.filter((_, i) => i !== idx);
    onChange(novo);
    setPaginaIdx(Math.min(idx, novo.length - 1));
  };
  const movePage = (idx: number, dir: -1|1) => {
    const novo = [...paginas];
    const ni = idx + dir;
    if (ni < 0 || ni >= novo.length) return;
    [novo[idx], novo[ni]] = [novo[ni], novo[idx]];
    onChange(novo);
    setPaginaIdx(ni);
  };

  // Print export
  const handlePrint = () => {
    const printWin = window.open('', '_blank');
    if (!printWin || !canvasRef.current) return;
    const allCanvases = document.querySelectorAll('[data-page-canvas]');
    const pagesHtml = Array.from(allCanvases).map(c => `<div style="width:794px;height:1123px;position:relative;page-break-after:always;overflow:hidden">${(c as HTMLElement).innerHTML}</div>`).join('');
    printWin.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Apresentação</title><style>
      *{box-sizing:border-box;margin:0;padding:0}body{background:white}
      @media print{@page{size:A4 portrait;margin:0}body{margin:0}}
    </style></head><body>${pagesHtml}</body></html>`);
    printWin.document.close();
    setTimeout(() => { printWin.focus(); printWin.print(); }, 600);
  };

  const selectedEl = pagina?.elementos.find(e => e.id === selectedId) ?? null;

  if (!pagina) return <div className="flex items-center justify-center h-full text-slate-400">Nenhuma página</div>;

  return (
    <div className="flex h-full overflow-hidden bg-slate-100">
      {/* ── LEFT: Pages panel ── */}
      <div className="w-44 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-600">PÁGINAS</span>
          <button onClick={handlePrint} title="Exportar PDF" className="p-1 rounded hover:bg-slate-100 text-slate-500">
            <Printer size={14}/>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1.5">
          {paginas.map((pg, idx) => (
            <div key={pg.id} onClick={() => { setPaginaIdx(idx); setSelectedId(null); }}
              className={`relative rounded-lg border overflow-hidden cursor-pointer transition-all ${idx === paginaIdx ? 'border-purple-500 ring-2 ring-purple-200' : 'border-slate-200 hover:border-slate-300'}`}>
              <div style={{ background: pg.background, height: 76, position: 'relative', overflow: 'hidden' }}>
                {pg.elementos.filter(e => e.visivel && e.tipo === 'retangulo' && e.retangulo).slice(0,3).map(e => (
                  <div key={e.id} style={{
                    position:'absolute', left:`${e.xPct}%`, top:`${e.yPct}%`,
                    width:`${e.wPct}%`, height:`${e.hPct}%`,
                    background: e.retangulo!.cor, opacity: e.retangulo!.opacity,
                    borderRadius: e.retangulo!.borderRadius,
                  }}/>
                ))}
                <div className="absolute inset-0 flex items-end p-1">
                  <span className="text-xs text-white bg-black/40 px-1 py-0.5 rounded truncate max-w-full">{pg.nome}</span>
                </div>
              </div>
              <div className="absolute top-0.5 right-0.5 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 hover:opacity-100">
                <button onClick={e => { e.stopPropagation(); movePage(idx,-1); }} className="p-0.5 bg-white rounded shadow text-slate-500 hover:text-purple-600"><ChevronUp size={10}/></button>
                <button onClick={e => { e.stopPropagation(); movePage(idx,1); }} className="p-0.5 bg-white rounded shadow text-slate-500 hover:text-purple-600"><ChevronDown size={10}/></button>
                <button onClick={e => { e.stopPropagation(); deletePage(idx); }} className="p-0.5 bg-white rounded shadow text-red-400 hover:text-red-600"><X size={10}/></button>
              </div>
              <div className="absolute inset-0 flex flex-col gap-0.5 items-end p-0.5 opacity-0 hover:opacity-100">
                <button onClick={e => { e.stopPropagation(); movePage(idx,-1); }} className="p-0.5 bg-white/90 rounded shadow text-slate-500 hover:text-purple-600"><ChevronUp size={10}/></button>
                <button onClick={e => { e.stopPropagation(); movePage(idx,1); }} className="p-0.5 bg-white/90 rounded shadow text-slate-500 hover:text-purple-600"><ChevronDown size={10}/></button>
                <div className="flex-1"/>
                <button onClick={e => { e.stopPropagation(); deletePage(idx); }} className="p-0.5 bg-white/90 rounded shadow text-red-400 hover:text-red-600"><X size={10}/></button>
              </div>
            </div>
          ))}
        </div>
        {/* Add page */}
        <div className="p-2 border-t border-slate-200 space-y-1">
          {[
            { t: 'capa' as const, l: 'Capa' },
            { t: 'produtos' as const, l: 'Produtos' },
            { t: 'personalizada' as const, l: 'Personalizada' },
            { t: 'contracapa' as const, l: 'Contracapa' },
          ].map(({ t, l }) => (
            <button key={t} onClick={() => addPage(t)}
              className="w-full text-left text-xs px-2 py-1 rounded hover:bg-purple-50 text-slate-600 hover:text-purple-700">
              + {l}
            </button>
          ))}
        </div>
      </div>

      {/* ── CENTER: Canvas ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="bg-white border-b border-slate-200 px-3 py-2 flex items-center gap-2 shrink-0 flex-wrap">
          <span className="text-xs font-bold text-slate-600 mr-2">{pagina.nome}</span>
          {/* Background color */}
          <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer">
            Fundo:
            <input type="color" value={pagina.background} onChange={e => updatePagina(paginaIdx, p => ({ ...p, background: e.target.value }))}
              className="w-7 h-6 border border-slate-200 rounded cursor-pointer"/>
          </label>
          <div className="w-px h-4 bg-slate-200"/>
          {/* Add element buttons */}
          <div className="relative">
            <button onClick={() => setShowAdd(!showAdd)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg border border-purple-200 text-purple-700 text-xs font-medium hover:bg-purple-50">
              <Plus size={12}/> Elemento
            </button>
            {showAdd && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50 w-44">
                <button onClick={() => addEl(novoTexto())} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-purple-50 text-xs text-slate-700 text-left"><Type size={12}/> Texto</button>
                <button onClick={() => addEl(novaLogo())} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-purple-50 text-xs text-slate-700 text-left"><LayoutTemplate size={12}/> Logo</button>
                <button onClick={() => addEl(novaImagem())} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-purple-50 text-xs text-slate-700 text-left"><ImageIcon size={12}/> Imagem</button>
                <button onClick={() => addEl(novoRetangulo())} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-purple-50 text-xs text-slate-700 text-left"><Square size={12}/> Retângulo</button>
                {produtos.length > 0 && (
                  <>
                    <div className="my-1 h-px bg-slate-100"/>
                    <p className="text-xs text-slate-400 px-2 mb-1">Card de Produto</p>
                    {produtos.slice(0,5).map(p => (
                      <button key={p.id} onClick={() => addEl(novoProdutoCard(p.id))}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-purple-50 text-xs text-slate-700 text-left truncate">
                        <Package size={12} className="shrink-0"/> {p.nome}
                      </button>
                    ))}
                    {produtos.length > 5 && <p className="text-xs text-slate-400 px-2">+ {produtos.length-5} mais...</p>}
                  </>
                )}
              </div>
            )}
          </div>
          {selectedId && (
            <button onClick={() => { const el = pagina.elementos.find(e => e.id === selectedId); if (el) addEl({ ...el, id: uid(), xPct: el.xPct+2, yPct: el.yPct+2 }); }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 text-slate-600 text-xs hover:bg-slate-50">
              <Copy size={11}/> Duplicar
            </button>
          )}
          <div className="ml-auto flex items-center gap-1">
            <Maximize2 size={13} className="text-slate-400"/>
            <span className="text-xs text-slate-400">Pág {paginaIdx+1}/{paginas.length}</span>
          </div>
        </div>

        {/* Canvas area */}
        <div className="flex-1 overflow-auto custom-scrollbar flex items-start justify-center p-6">
          <div
            ref={canvasRef}
            data-page-canvas
            style={{
              width: '100%', maxWidth: 680, aspectRatio: '1 / 1.4142',
              background: pagina.background, position: 'relative',
              boxShadow: '0 4px 32px rgba(0,0,0,0.15)', borderRadius: 4, overflow: 'hidden',
              flexShrink: 0,
            }}
            onClick={() => setSelectedId(null)}
          >
            {pagina.elementos.map(el => (
              <RenderElemento
                key={el.id} el={el}
                isSelected={selectedId === el.id}
                neg={negociacao} orc={orcamento} config={config}
                fotos={fotos} produtos={produtos}
                onSelect={() => setSelectedId(el.id)}
                onMouseDown={(e) => handleElMouseDown(e, el)}
              />
            ))}
            {/* Resize handle for selected */}
            {selectedEl && !selectedEl.bloqueado && (
              <div
                style={{
                  position: 'absolute',
                  left: `calc(${selectedEl.xPct + selectedEl.wPct}% - 6px)`,
                  top: `calc(${selectedEl.yPct + selectedEl.hPct}% - 6px)`,
                  width: 12, height: 12, background: '#7c3aed',
                  borderRadius: 2, cursor: 'se-resize', zIndex: 100,
                }}
                onMouseDown={e => handleResizeMouseDown(e, selectedEl)}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── RIGHT: Properties ── */}
      <div className="w-52 bg-white border-l border-slate-200 flex flex-col shrink-0">
        <div className="px-3 py-2 border-b border-slate-200">
          <span className="text-xs font-bold text-slate-600">{selectedEl ? 'PROPRIEDADES' : 'SELECIONE UM ELEMENTO'}</span>
        </div>
        {selectedEl ? (
          <PainelPropriedades
            el={selectedEl}
            fotos={fotos}
            produtos={produtos}
            onChange={patch => updateEl(selectedEl.id, patch)}
            onDelete={() => deleteEl(selectedEl.id)}
            onToggleLock={() => updateEl(selectedEl.id, { bloqueado: !selectedEl.bloqueado })}
            onToggleVisible={() => updateEl(selectedEl.id, { visivel: !selectedEl.visivel })}
          />
        ) : (
          <div className="p-4 text-xs text-slate-400 text-center mt-4">
            Clique em um elemento no canvas para editar suas propriedades
          </div>
        )}
      </div>
    </div>
  );
}

export { paginaCapa, paginaProdutos, paginaContracapa };
