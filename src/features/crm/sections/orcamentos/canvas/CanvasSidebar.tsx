// ─────────────────────────────────────────────────────────────────────────────
// CanvasSidebar.tsx — Painel esquerdo: botões de elementos + imagens dos produtos
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Type, Image as ImageIcon, Square, LayoutTemplate, Package, TableIcon, Minus, ChevronDown, ChevronRight, Tag } from 'lucide-react';
import type { Elemento, PaginaCanvas } from '../types';
import { PAGE_W, PAGE_H, VARIAVEIS_PRODUTO } from '../types';
import type { ItemOrcamento } from '../../../data/crmData';

const uid = () => Math.random().toString(36).slice(2, 9);

// ── Factory de elementos ──────────────────────────────────────────────────────
function criarTexto(): Elemento {
  return {
    id: uid(), tipo: 'TEXTO', x: PAGE_W * 0.1, y: PAGE_H * 0.1,
    largura: 280, altura: 60, rotacao: 0, z_index: 10, bloqueado: false, visivel: true, opacidade: 1,
    dados: {
      conteudo: 'Texto', fonte: 'Inter', tamanho: 18, negrito: false, italico: false,
      sublinhado: false, alinhamento: 'left', cor: '#1e293b', cor_fundo: 'transparent', padding: 4, borda_arredondada: 0,
    },
  };
}
function criarImagem(): Elemento {
  return {
    id: uid(), tipo: 'IMAGEM', x: PAGE_W * 0.1, y: PAGE_H * 0.1,
    largura: 200, altura: 150, rotacao: 0, z_index: 10, bloqueado: false, visivel: true, opacidade: 1,
    dados: { url: '', object_fit: 'cover', borda_arredondada: 0, opacidade: 1, legenda_visivel: false },
  };
}
function criarImagemURL(url: string): Elemento {
  return {
    id: uid(), tipo: 'IMAGEM', x: PAGE_W * 0.1, y: PAGE_H * 0.1,
    largura: 200, altura: 180, rotacao: 0, z_index: 10, bloqueado: false, visivel: true, opacidade: 1,
    dados: { url, object_fit: 'cover', borda_arredondada: 8, opacidade: 1, legenda_visivel: false },
  };
}
function criarForma(): Elemento {
  return {
    id: uid(), tipo: 'FORMA', x: PAGE_W * 0.1, y: PAGE_H * 0.1,
    largura: 200, altura: 120, rotacao: 0, z_index: 5, bloqueado: false, visivel: true, opacidade: 1,
    dados: { tipo: 'retangulo', cor_preenchimento: '#7c3aed', cor_borda: 'transparent', espessura_borda: 0, borda_arredondada: 8, opacidade: 1 },
  };
}
function criarLinha(): Elemento {
  return {
    id: uid(), tipo: 'FORMA', x: PAGE_W * 0.05, y: PAGE_H * 0.5,
    largura: PAGE_W * 0.9, altura: 2, rotacao: 0, z_index: 5, bloqueado: false, visivel: true, opacidade: 1,
    dados: { tipo: 'linha', cor_preenchimento: 'transparent', cor_borda: '#e2e8f0', espessura_borda: 2, borda_arredondada: 0, opacidade: 1 },
  };
}
function criarLogo(): Elemento {
  return {
    id: uid(), tipo: 'LOGO', x: 40, y: 30, largura: 140, altura: 70,
    rotacao: 0, z_index: 10, bloqueado: false, visivel: true, opacidade: 1,
    dados: { usar_logo_config: true, alinhamento: 'left', borda_arredondada: 0 },
  };
}
function criarProdutoCard(produtoId: string): Elemento {
  return {
    id: uid(), tipo: 'PRODUTO_CARD', x: PAGE_W * 0.05, y: PAGE_H * 0.1,
    largura: PAGE_W * 0.9, altura: 140, rotacao: 0, z_index: 10, bloqueado: false, visivel: true, opacidade: 1,
    dados: {
      produto_id: produtoId, imagens_selecionadas: [0], layout: 'horizontal',
      mostrar_preco: true, mostrar_descricao: true, mostrar_codigo: false,
      cor_fundo: '#ffffff', cor_texto: '#1e293b', estilo_borda: '1px solid #e2e8f0', borda_arredondada: 8,
    },
  };
}
function criarCampoProduto(variavel: string, label: string): Elemento {
  return {
    id: uid(), tipo: 'TEXTO', x: PAGE_W * 0.05, y: PAGE_H * 0.1,
    largura: PAGE_W * 0.9, altura: 50, rotacao: 0, z_index: 10, bloqueado: false, visivel: true, opacidade: 1,
    dados: {
      conteudo: '', variavel, fonte: 'Inter', tamanho: 20, negrito: false, italico: false,
      sublinhado: false, alinhamento: 'left', cor: '#1e293b', cor_fundo: 'transparent', padding: 4, borda_arredondada: 0,
    },
  };
  void label;
}
function criarTabela(): Elemento {
  return {
    id: uid(), tipo: 'TABELA_PRODUTOS', x: PAGE_W * 0.05, y: PAGE_H * 0.12,
    largura: PAGE_W * 0.9, altura: 320, rotacao: 0, z_index: 10, bloqueado: false, visivel: true, opacidade: 1,
    dados: {
      colunas_visiveis: ['produto_nome', 'quantidade', 'preco_unitario', 'total'],
      cor_cabecalho: '#7c3aed', cor_linhas_pares: '#f8fafc', cor_linhas_impares: '#ffffff',
      cor_borda: '#e2e8f0', cor_texto: '#1e293b', fonte_tamanho: 11, mostrar_total: true,
    },
  };
}

// ── Sidebar Button ────────────────────────────────────────────────────────────
function SideBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex flex-col items-center gap-1 p-2 rounded-xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50 text-slate-600 hover:text-purple-700 transition-all">
      {icon}
      <span className="text-xs font-medium leading-none">{label}</span>
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
interface CanvasSidebarProps {
  itens: ItemOrcamento[];
  imageMap: Record<string, string[]>;
  onAddElement: (el: Elemento) => void;
  currentPagina: PaginaCanvas | undefined;
  updatePagina: (fn: (p: PaginaCanvas) => PaginaCanvas) => void;
  isProdutoTemplate?: boolean;
}

export default function CanvasSidebar({ itens, imageMap, onAddElement, isProdutoTemplate }: CanvasSidebarProps) {
  const [openProd, setOpenProd] = useState<string | null>(null);

  const BUTTONS = [
    { icon: <Type size={18}/>, label: 'Texto',    fn: criarTexto   },
    { icon: <ImageIcon size={18}/>, label: 'Imagem', fn: criarImagem },
    { icon: <Square size={18}/>, label: 'Forma',   fn: criarForma  },
    { icon: <Minus size={18}/>, label: 'Linha',    fn: criarLinha  },
    { icon: <LayoutTemplate size={18}/>, label: 'Logo', fn: criarLogo },
    { icon: <TableIcon size={18}/>, label: 'Tabela', fn: criarTabela },
  ];

  return (
    <motion.div
      initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
      className="w-44 bg-white border-r border-slate-200 flex flex-col shrink-0"
    >
      <div className="px-3 py-2 border-b border-slate-200">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Elementos</span>
      </div>

      {/* Element buttons */}
      <div className="p-2 grid grid-cols-2 gap-1.5 border-b border-slate-100">
        {BUTTONS.map(({ icon, label, fn }) => (
          <SideBtn key={label} icon={icon} label={label} onClick={() => onAddElement(fn())}/>
        ))}
      </div>

      {/* Campos do Produto — visível em páginas PRODUTO_TEMPLATE */}
      {isProdutoTemplate && (
        <div className="p-2 border-b border-slate-100">
          <p className="text-xs font-bold text-violet-600 mb-1.5 flex items-center gap-1">
            <Tag size={11}/> Campos do Produto
          </p>
          <p className="text-[10px] text-slate-400 mb-1.5 leading-tight">
            Arraste para a página. O campo será preenchido automaticamente para cada produto.
          </p>
          <div className="space-y-1">
            {VARIAVEIS_PRODUTO.map(v => (
              <button key={v.valor}
                onClick={() => onAddElement(criarCampoProduto(v.valor, v.label))}
                className="w-full text-left text-xs px-2 py-1.5 rounded-lg border border-violet-200 bg-violet-50 hover:bg-violet-100 text-violet-700 flex items-center gap-1.5 transition-colors">
                <Tag size={10} className="shrink-0 text-violet-400"/>{v.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Products (cards) */}
      {itens.filter(i => i.produto_id).length > 0 && (
        <div className="p-2 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-500 mb-1.5">Cards de Produto</p>
          <div className="space-y-1">
            {itens.filter(i => i.produto_id).map(item => (
              <button key={item.id} onClick={() => onAddElement(criarProdutoCard(item.produto_id!))}
                className="w-full text-left text-xs px-2 py-1.5 rounded-lg border border-slate-200 hover:border-purple-300 hover:bg-purple-50 text-slate-600 hover:text-purple-700 truncate flex items-center gap-1.5">
                <Package size={11} className="shrink-0"/>{item.produto_nome}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Product images */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        <p className="text-xs font-semibold text-slate-500 mb-1.5">Imagens dos Produtos</p>
        <div className="space-y-2">
          {itens.filter(i => i.produto_id && (imageMap[i.produto_id!] ?? []).length > 0).map(item => {
            const imgs = imageMap[item.produto_id!] ?? [];
            const isOpen = openProd === item.produto_id;
            return (
              <div key={item.produto_id}>
                <button onClick={() => setOpenProd(isOpen ? null : item.produto_id!)}
                  className="w-full flex items-center gap-1.5 text-xs text-slate-600 hover:text-purple-700 font-medium">
                  {isOpen ? <ChevronDown size={11}/> : <ChevronRight size={11}/>}
                  <span className="truncate">{item.produto_nome}</span>
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-1"
                    >
                      <div className="grid grid-cols-3 gap-1 pl-3">
                        {imgs.map((url, idx) => (
                          <button key={idx} onClick={() => onAddElement(criarImagemURL(url))}
                            className="rounded border border-slate-200 overflow-hidden hover:border-purple-400 hover:ring-2 hover:ring-purple-200 transition-all">
                            <img src={url} className="w-full h-10 object-cover" alt={`img ${idx + 1}`}/>
                            <span className="block text-center text-xs text-slate-400 py-0.5">{idx + 1}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
          {itens.every(i => !i.produto_id || (imageMap[i.produto_id!] ?? []).length === 0) && (
            <p className="text-xs text-slate-400 text-center py-2">Sem imagens disponíveis</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
