// ─────────────────────────────────────────────────────────────────────────────
// pdf.ts — Exportação PDF via jsPDF + Konva stage.toDataURL()
// ─────────────────────────────────────────────────────────────────────────────
import type Konva from 'konva';
import type { PaginaCanvas } from './types';

export interface OrcamentoPDFInfo {
  numero?: string;
  cliente_nome: string;
}

/**
 * Exporta todas as páginas do canvas para PDF.
 * O caller é responsável por navegar até cada página e chamar onCapturePage.
 */
export async function exportarOrcamentoPDF(
  getPageDataURL: (idx: number) => Promise<string>,
  totalPaginas: number,
  info: OrcamentoPDFInfo,
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  for (let i = 0; i < totalPaginas; i++) {
    if (i > 0) pdf.addPage();
    const imgData = await getPageDataURL(i);
    pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
  }

  const nome = `${info.numero ?? 'orcamento'}-${info.cliente_nome.replace(/\s+/g, '-')}.pdf`;
  pdf.save(nome);
}

/**
 * Captura uma página do Konva Stage como PNG base64.
 * Retorna dataURL.
 */
export function capturarPaginaKonva(stage: Konva.Stage): string {
  return stage.toDataURL({ pixelRatio: 2, mimeType: 'image/png' });
}

/**
 * Substitui variáveis dinâmicas no texto.
 */
export function resolverVariaveis(
  texto: string,
  dados: {
    cliente_nome?: string;
    numero?: string;
    data_hoje?: string;
    validade?: string;
    vendedor?: string;
    total?: string;
    empresa?: string;
    // campos de produto (página PRODUTO_TEMPLATE)
    produto_nome?: string;
    produto_descricao?: string;
    produto_preco?: string;
    produto_codigo?: string;
    produto_unidade?: string;
    produto_quantidade?: string;
    produto_total?: string;
  },
): string {
  return texto
    .replace(/\{\{cliente_nome\}\}/g, dados.cliente_nome ?? '')
    .replace(/\{\{numero_orcamento\}\}/g, dados.numero ?? '')
    .replace(/\{\{data_hoje\}\}/g, dados.data_hoje ?? new Date().toLocaleDateString('pt-BR'))
    .replace(/\{\{validade\}\}/g, dados.validade ?? '')
    .replace(/\{\{vendedor\}\}/g, dados.vendedor ?? '')
    .replace(/\{\{total\}\}/g, dados.total ?? '')
    .replace(/\{\{empresa\}\}/g, dados.empresa ?? '')
    .replace(/\{\{produto_nome\}\}/g, dados.produto_nome ?? '[Nome do Produto]')
    .replace(/\{\{produto_descricao\}\}/g, dados.produto_descricao ?? '[Descrição]')
    .replace(/\{\{produto_preco\}\}/g, dados.produto_preco ?? '[Preço]')
    .replace(/\{\{produto_codigo\}\}/g, dados.produto_codigo ?? '[Código]')
    .replace(/\{\{produto_unidade\}\}/g, dados.produto_unidade ?? '[Un.]')
    .replace(/\{\{produto_quantidade\}\}/g, dados.produto_quantidade ?? '[Qtd]')
    .replace(/\{\{produto_total\}\}/g, dados.produto_total ?? '[Total]');
}

/**
 * Gera templates de páginas iniciais para uma nova apresentação.
 */
export function gerarPaginasIniciais(
  corPrimaria: string,
  _corSecundaria: string,
): PaginaCanvas[] {
  const uid = () => Math.random().toString(36).slice(2, 9);
  const capa: PaginaCanvas = {
    id: uid(), tipo: 'CAPA', nome: 'Capa', fundo_cor: corPrimaria,
    elementos: [
      {
        id: uid(), tipo: 'LOGO', x: 40, y: 40, largura: 160, altura: 80,
        rotacao: 0, z_index: 1, bloqueado: false, visivel: true, opacidade: 1,
        dados: { usar_logo_config: true, alinhamento: 'left', borda_arredondada: 0 },
      },
      {
        id: uid(), tipo: 'TEXTO', x: 40, y: 360, largura: 515, altura: 80,
        rotacao: 0, z_index: 2, bloqueado: false, visivel: true, opacidade: 1,
        dados: {
          conteudo: 'Proposta Comercial',
          fonte: 'Inter', tamanho: 40, negrito: true, italico: false, sublinhado: false,
          alinhamento: 'left', cor: '#ffffff', cor_fundo: 'transparent',
          padding: 0, borda_arredondada: 0,
        },
      },
      {
        id: uid(), tipo: 'TEXTO', x: 40, y: 450, largura: 400, altura: 50,
        rotacao: 0, z_index: 3, bloqueado: false, visivel: true, opacidade: 1,
        dados: {
          conteudo: '', variavel: '{{cliente_nome}}',
          fonte: 'Inter', tamanho: 24, negrito: false, italico: false, sublinhado: false,
          alinhamento: 'left', cor: 'rgba(255,255,255,0.85)', cor_fundo: 'transparent',
          padding: 0, borda_arredondada: 0,
        },
      },
      {
        id: uid(), tipo: 'TEXTO', x: 40, y: 510, largura: 300, altura: 36,
        rotacao: 0, z_index: 4, bloqueado: false, visivel: true, opacidade: 1,
        dados: {
          conteudo: '', variavel: '{{data_hoje}}',
          fonte: 'Inter', tamanho: 14, negrito: false, italico: false, sublinhado: false,
          alinhamento: 'left', cor: 'rgba(255,255,255,0.65)', cor_fundo: 'transparent',
          padding: 0, borda_arredondada: 0,
        },
      },
    ],
  };

  // Página PRODUTO_TEMPLATE — será repetida 1× por produto no export
  const produtos: PaginaCanvas = {
    id: uid(), tipo: 'PRODUTO_TEMPLATE', nome: 'Produto', fundo_cor: '#ffffff',
    elementos: [
      // Barra de cor no topo
      {
        id: uid(), tipo: 'FORMA', x: 0, y: 0, largura: 595, altura: 10,
        rotacao: 0, z_index: 1, bloqueado: false, visivel: true, opacidade: 1,
        dados: { tipo: 'retangulo', cor_preenchimento: corPrimaria, cor_borda: 'transparent', espessura_borda: 0, borda_arredondada: 0, opacidade: 1 },
      },
      // Logo
      {
        id: uid(), tipo: 'LOGO', x: 40, y: 28, largura: 120, altura: 60,
        rotacao: 0, z_index: 2, bloqueado: false, visivel: true, opacidade: 1,
        dados: { usar_logo_config: true, alinhamento: 'left', borda_arredondada: 0 },
      },
      // Nome do produto
      {
        id: uid(), tipo: 'TEXTO', x: 40, y: 130, largura: 515, altura: 60,
        rotacao: 0, z_index: 3, bloqueado: false, visivel: true, opacidade: 1,
        dados: {
          conteudo: '', variavel: '{{produto_nome}}',
          fonte: 'Inter', tamanho: 32, negrito: true, italico: false, sublinhado: false,
          alinhamento: 'left', cor: '#1e293b', cor_fundo: 'transparent',
          padding: 0, borda_arredondada: 0,
        },
      },
      // Linha divisória
      {
        id: uid(), tipo: 'FORMA', x: 40, y: 195, largura: 515, altura: 2,
        rotacao: 0, z_index: 4, bloqueado: false, visivel: true, opacidade: 1,
        dados: { tipo: 'linha', cor_preenchimento: 'transparent', cor_borda: corPrimaria, espessura_borda: 2, borda_arredondada: 0, opacidade: 0.4 },
      },
      // Código e unidade
      {
        id: uid(), tipo: 'TEXTO', x: 40, y: 205, largura: 300, altura: 30,
        rotacao: 0, z_index: 5, bloqueado: false, visivel: true, opacidade: 1,
        dados: {
          conteudo: '', variavel: '{{produto_codigo}}',
          fonte: 'Inter', tamanho: 12, negrito: false, italico: false, sublinhado: false,
          alinhamento: 'left', cor: '#64748b', cor_fundo: 'transparent',
          padding: 0, borda_arredondada: 0,
        },
      },
      // Descrição
      {
        id: uid(), tipo: 'TEXTO', x: 40, y: 240, largura: 515, altura: 100,
        rotacao: 0, z_index: 6, bloqueado: false, visivel: true, opacidade: 1,
        dados: {
          conteudo: '', variavel: '{{produto_descricao}}',
          fonte: 'Inter', tamanho: 13, negrito: false, italico: false, sublinhado: false,
          alinhamento: 'left', cor: '#475569', cor_fundo: 'transparent',
          padding: 0, borda_arredondada: 0,
        },
      },
      // Preço
      {
        id: uid(), tipo: 'TEXTO', x: 40, y: 680, largura: 280, altura: 60,
        rotacao: 0, z_index: 7, bloqueado: false, visivel: true, opacidade: 1,
        dados: {
          conteudo: '', variavel: '{{produto_preco}}',
          fonte: 'Inter', tamanho: 28, negrito: true, italico: false, sublinhado: false,
          alinhamento: 'left', cor: corPrimaria, cor_fundo: 'transparent',
          padding: 0, borda_arredondada: 0,
        },
      },
      // Qtd × total
      {
        id: uid(), tipo: 'TEXTO', x: 40, y: 745, largura: 515, altura: 28,
        rotacao: 0, z_index: 8, bloqueado: false, visivel: true, opacidade: 1,
        dados: {
          conteudo: '', variavel: '{{produto_quantidade}}',
          fonte: 'Inter', tamanho: 12, negrito: false, italico: false, sublinhado: false,
          alinhamento: 'left', cor: '#64748b', cor_fundo: 'transparent',
          padding: 0, borda_arredondada: 0,
        },
      },
    ],
  };

  const contracapa: PaginaCanvas = {
    id: uid(), tipo: 'CONTRACAPA', nome: 'Contracapa', fundo_cor: '#f8fafc',
    elementos: [
      {
        id: uid(), tipo: 'FORMA', x: 0, y: 720, largura: 595, altura: 122,
        rotacao: 0, z_index: 1, bloqueado: false, visivel: true, opacidade: 1,
        dados: {
          tipo: 'retangulo', cor_preenchimento: corPrimaria,
          cor_borda: 'transparent', espessura_borda: 0, borda_arredondada: 0, opacidade: 1,
        },
      },
      {
        id: uid(), tipo: 'TEXTO', x: 40, y: 300, largura: 515, altura: 80,
        rotacao: 0, z_index: 2, bloqueado: false, visivel: true, opacidade: 1,
        dados: {
          conteudo: 'Obrigado!',
          fonte: 'Inter', tamanho: 42, negrito: true, italico: false, sublinhado: false,
          alinhamento: 'center', cor: '#1e293b', cor_fundo: 'transparent',
          padding: 0, borda_arredondada: 0,
        },
      },
      {
        id: uid(), tipo: 'TEXTO', x: 40, y: 740, largura: 515, altura: 40,
        rotacao: 0, z_index: 3, bloqueado: false, visivel: true, opacidade: 1,
        dados: {
          conteudo: '', variavel: '{{empresa}}',
          fonte: 'Inter', tamanho: 16, negrito: false, italico: false, sublinhado: false,
          alinhamento: 'center', cor: '#ffffff', cor_fundo: 'transparent',
          padding: 0, borda_arredondada: 0,
        },
      },
    ],
  };

  return [capa, produtos, contracapa];
}
