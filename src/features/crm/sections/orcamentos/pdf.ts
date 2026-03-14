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
  },
): string {
  return texto
    .replace(/\{\{cliente_nome\}\}/g, dados.cliente_nome ?? '')
    .replace(/\{\{numero_orcamento\}\}/g, dados.numero ?? '')
    .replace(/\{\{data_hoje\}\}/g, dados.data_hoje ?? new Date().toLocaleDateString('pt-BR'))
    .replace(/\{\{validade\}\}/g, dados.validade ?? '')
    .replace(/\{\{vendedor\}\}/g, dados.vendedor ?? '')
    .replace(/\{\{total\}\}/g, dados.total ?? '')
    .replace(/\{\{empresa\}\}/g, dados.empresa ?? '');
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

  const produtos: PaginaCanvas = {
    id: uid(), tipo: 'PRODUTOS', nome: 'Produtos', fundo_cor: '#ffffff',
    elementos: [
      {
        id: uid(), tipo: 'TEXTO', x: 40, y: 30, largura: 515, altura: 50,
        rotacao: 0, z_index: 1, bloqueado: false, visivel: true, opacidade: 1,
        dados: {
          conteudo: 'Produtos e Serviços',
          fonte: 'Inter', tamanho: 28, negrito: true, italico: false, sublinhado: false,
          alinhamento: 'left', cor: '#1e293b', cor_fundo: 'transparent',
          padding: 0, borda_arredondada: 0,
        },
      },
      {
        id: uid(), tipo: 'TABELA_PRODUTOS', x: 40, y: 100, largura: 515, altura: 400,
        rotacao: 0, z_index: 2, bloqueado: false, visivel: true, opacidade: 1,
        dados: {
          colunas_visiveis: ['produto_nome', 'quantidade', 'preco_unitario', 'total'],
          cor_cabecalho: corPrimaria,
          cor_linhas_pares: '#f8fafc',
          cor_linhas_impares: '#ffffff',
          cor_borda: '#e2e8f0',
          cor_texto: '#1e293b',
          fonte_tamanho: 11,
          mostrar_total: true,
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
