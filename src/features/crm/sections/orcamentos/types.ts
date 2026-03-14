// ─────────────────────────────────────────────────────────────────────────────
// types.ts — Tipos completos do módulo de Orçamentos
// ─────────────────────────────────────────────────────────────────────────────

// ── Elemento base ─────────────────────────────────────────────────────────────
export type TipoElemento = 'TEXTO' | 'IMAGEM' | 'PRODUTO_CARD' | 'TABELA_PRODUTOS' | 'FORMA' | 'LOGO';

export interface TextoDados {
  conteudo: string;
  variavel?: string; // '{{cliente_nome}}' etc.
  fonte: string;
  tamanho: number;
  negrito: boolean;
  italico: boolean;
  sublinhado: boolean;
  alinhamento: 'left' | 'center' | 'right' | 'justify';
  cor: string;
  cor_fundo: string;
  padding: number;
  borda_arredondada: number;
}

export interface ImagemDados {
  url: string;
  storage_path?: string;
  object_fit: 'cover' | 'contain' | 'fill';
  borda_arredondada: number;
  opacidade: number;
  legenda?: string;
  legenda_visivel: boolean;
}

export interface FormaDados {
  tipo: 'retangulo' | 'elipse' | 'linha';
  cor_preenchimento: string;
  cor_borda: string;
  espessura_borda: number;
  borda_arredondada: number;
  opacidade: number;
}

export interface LogoDados {
  usar_logo_config: boolean;
  url_custom?: string;
  alinhamento: 'left' | 'center' | 'right';
  borda_arredondada: number;
}

export interface ProdutoCardDados {
  produto_id: string;
  imagens_selecionadas: number[];
  layout: 'vertical' | 'horizontal';
  mostrar_preco: boolean;
  mostrar_descricao: boolean;
  mostrar_codigo: boolean;
  cor_fundo: string;
  cor_texto: string;
  estilo_borda: string;
  borda_arredondada: number;
}

export interface TabelaDados {
  colunas_visiveis: string[];
  cor_cabecalho: string;
  cor_linhas_pares: string;
  cor_linhas_impares: string;
  cor_borda: string;
  cor_texto: string;
  fonte_tamanho: number;
  mostrar_total: boolean;
}

export type ElementoDados = TextoDados | ImagemDados | FormaDados | LogoDados | ProdutoCardDados | TabelaDados;

export interface Elemento {
  id: string;
  tipo: TipoElemento;
  x: number;        // page-space 0–595
  y: number;        // page-space 0–842
  largura: number;
  altura: number;
  rotacao: number;
  z_index: number;
  bloqueado: boolean;
  visivel: boolean;
  opacidade: number;
  dados: ElementoDados;
}

// ── Página do canvas ──────────────────────────────────────────────────────────
export interface PaginaCanvas {
  id: string;
  tipo: 'CAPA' | 'CONTRACAPA' | 'PRODUTOS' | 'LIVRE';
  nome: string;
  fundo_cor: string;
  fundo_imagem_url?: string;
  elementos: Elemento[];
}

// ── Configuração global ───────────────────────────────────────────────────────
export interface OrcConfig {
  id?: string;
  logo_url: string;
  logo_storage_path?: string;
  cor_primaria: string;
  cor_secundaria: string;
  cor_texto: string;
  fonte_padrao: string;
  texto_validade: string;
  texto_condicoes: string;
  texto_rodape: string;
  assinatura_url?: string;
  mostrar_codigo_produto: boolean;
  mostrar_ncm: boolean;
  mostrar_estoque: boolean;
  mostrar_desconto_por_item: boolean;
  mostrar_imagens_produto: boolean;
  max_imagens_por_produto: number;
  prefixo_numero: string;
  proximo_numero: number;
  empresa: string;
}

export const ORC_CONFIG_PADRAO: OrcConfig = {
  logo_url: '',
  cor_primaria: '#7c3aed',
  cor_secundaria: '#f3f4f6',
  cor_texto: '#111827',
  fonte_padrao: 'Inter',
  texto_validade: 'Este orçamento é válido por 30 dias a partir da data de emissão.',
  texto_condicoes: '',
  texto_rodape: 'Obrigado pela preferência.',
  mostrar_codigo_produto: true,
  mostrar_ncm: false,
  mostrar_estoque: false,
  mostrar_desconto_por_item: true,
  mostrar_imagens_produto: true,
  max_imagens_por_produto: 3,
  prefixo_numero: 'ORC',
  proximo_numero: 1,
  empresa: 'Minha Empresa',
};

// ── Apresentação ──────────────────────────────────────────────────────────────
export interface Apresentacao {
  id?: string;
  orcamento_id: string;
  nome: string;
  orientacao: 'portrait' | 'landscape';
  tamanho_pagina: 'A4' | 'A3' | 'Letter';
  paginas: PaginaCanvas[];
  thumbnail_url?: string;
}

// ── Dimensões A4 em pontos ────────────────────────────────────────────────────
export const PAGE_W = 595;
export const PAGE_H = 842;

// ── Variáveis dinâmicas ───────────────────────────────────────────────────────
export const VARIAVEIS_DINAMICAS = [
  { valor: '{{cliente_nome}}',       label: 'Nome do Cliente'   },
  { valor: '{{numero_orcamento}}',   label: 'Nº do Orçamento'   },
  { valor: '{{data_hoje}}',          label: 'Data de Hoje'      },
  { valor: '{{validade}}',           label: 'Data de Validade'  },
  { valor: '{{vendedor}}',           label: 'Vendedor'          },
  { valor: '{{total}}',              label: 'Total'             },
  { valor: '{{empresa}}',            label: 'Empresa'           },
];

// ── Fontes disponíveis ────────────────────────────────────────────────────────
export const FONTES = ['Inter', 'Arial', 'Georgia', 'Montserrat', 'Playfair Display', 'Open Sans', 'Roboto'];

// ── Colunas de tabela ─────────────────────────────────────────────────────────
export const COLUNAS_TABELA = [
  { id: 'codigo',        label: 'Código'      },
  { id: 'produto_nome',  label: 'Produto'     },
  { id: 'unidade',       label: 'Un.'         },
  { id: 'quantidade',    label: 'Qtd'         },
  { id: 'preco_unitario',label: 'Preço Unit.' },
  { id: 'desconto_pct',  label: 'Desc.%'      },
  { id: 'total',         label: 'Total'       },
];
