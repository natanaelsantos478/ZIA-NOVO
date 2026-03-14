// ─────────────────────────────────────────────────────────────────────────────
// types.ts — Tipos completos do módulo de Orçamentos
// ─────────────────────────────────────────────────────────────────────────────

// ── Elemento base ─────────────────────────────────────────────────────────────
export type TipoElemento = 'TEXTO' | 'IMAGEM' | 'PRODUTO_CARD' | 'TABELA_PRODUTOS' | 'FORMA' | 'LOGO' | 'CAMPO_DADO';

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

export interface CampoDadoDados {
  chave: string;
  label_visivel: boolean;
  label_texto: string;
  label_posicao: 'acima' | 'lado';
  fonte: string;
  tamanho_valor: number;
  tamanho_label: number;
  negrito_valor: boolean;
  cor: string;
  cor_fundo: string;
  alinhamento: 'left' | 'center' | 'right';
  borda_arredondada: number;
  padding: number;
}

export type ElementoDados = TextoDados | ImagemDados | FormaDados | LogoDados | ProdutoCardDados | TabelaDados | CampoDadoDados;

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
  tipo: 'CAPA' | 'CONTRACAPA' | 'PRODUTOS' | 'LIVRE' | 'PRODUTO_TEMPLATE';
  nome: string;
  fundo_cor: string;
  fundo_imagem_url?: string;
  elementos: Elemento[];
}

// ── Configuração global ───────────────────────────────────────────────────────
export interface OrcConfig {
  id?: string;
  logo_url: string;
  template_paginas: PaginaCanvas[];  // legado — mapeado para templates[0] se existir
  templates: LayoutTemplate[];        // múltiplos templates nomeados
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
  template_paginas: [],
  templates: [],
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
  formato: PageFormato;
  paginas: PaginaCanvas[];
  thumbnail_url?: string;
}

// ── Formato de página ─────────────────────────────────────────────────────────
export type PageFormato = 'A4' | 'A4-landscape' | 'Letter' | '1:1' | '16:9' | '4:3';

export const PAGE_FORMATOS: Record<PageFormato, { label: string; w: number; h: number }> = {
  'A4':          { label: 'A4 Retrato',   w: 595, h: 842 },
  'A4-landscape':{ label: 'A4 Paisagem',  w: 842, h: 595 },
  'Letter':      { label: 'Carta',        w: 612, h: 792 },
  '1:1':         { label: 'Quadrado 1:1', w: 595, h: 595 },
  '16:9':        { label: 'Slide 16:9',   w: 842, h: 474 },
  '4:3':         { label: 'Slide 4:3',    w: 794, h: 596 },
};

// ── Dimensões A4 em pontos (padrão, mantido para compatibilidade) ──────────────
export const PAGE_W = 595;
export const PAGE_H = 842;

// ── Template de layout nomeado ────────────────────────────────────────────────
export interface LayoutTemplate {
  id: string;
  nome: string;
  descricao?: string;
  formato: PageFormato;
  paginas: PaginaCanvas[];
  criado_em?: string;
}

// ── Variáveis dinâmicas — orçamento ──────────────────────────────────────────
export const VARIAVEIS_DINAMICAS = [
  { valor: '{{cliente_nome}}',       label: 'Nome do Cliente'   },
  { valor: '{{numero_orcamento}}',   label: 'Nº do Orçamento'   },
  { valor: '{{data_hoje}}',          label: 'Data de Hoje'      },
  { valor: '{{validade}}',           label: 'Data de Validade'  },
  { valor: '{{vendedor}}',           label: 'Vendedor'          },
  { valor: '{{total}}',              label: 'Total'             },
  { valor: '{{empresa}}',            label: 'Empresa'           },
];

// ── Variáveis dinâmicas — produto (página PRODUTO_TEMPLATE) ──────────────────
export const VARIAVEIS_PRODUTO = [
  { valor: '{{produto_nome}}',        label: 'Nome do Produto'  },
  { valor: '{{produto_descricao}}',   label: 'Descrição'        },
  { valor: '{{produto_preco}}',       label: 'Preço Unitário'   },
  { valor: '{{produto_codigo}}',      label: 'Código'           },
  { valor: '{{produto_unidade}}',     label: 'Unidade'          },
  { valor: '{{produto_quantidade}}',  label: 'Quantidade'       },
  { valor: '{{produto_total}}',       label: 'Total do Item'    },
];

// ── Campos de dados do orçamento (CAMPO_DADO) ─────────────────────────────────
export const CAMPOS_DADOS = [
  // Cliente
  { chave: 'cliente_nome',       label: 'Nome do Cliente',    grupo: 'Cliente'    },
  { chave: 'cliente_cnpj',       label: 'CNPJ do Cliente',    grupo: 'Cliente'    },
  { chave: 'cliente_email',      label: 'E-mail',             grupo: 'Cliente'    },
  { chave: 'cliente_telefone',   label: 'Telefone',           grupo: 'Cliente'    },
  { chave: 'cliente_endereco',   label: 'Endereço',           grupo: 'Cliente'    },
  // Orçamento
  { chave: 'numero_orcamento',   label: 'Nº do Orçamento',    grupo: 'Orçamento'  },
  { chave: 'data_hoje',          label: 'Data de Emissão',    grupo: 'Orçamento'  },
  { chave: 'validade',           label: 'Data de Validade',   grupo: 'Orçamento'  },
  { chave: 'vendedor',           label: 'Vendedor',           grupo: 'Orçamento'  },
  { chave: 'condicao_pagamento', label: 'Condição Pgto',      grupo: 'Orçamento'  },
  { chave: 'prazo_entrega',      label: 'Prazo de Entrega',   grupo: 'Orçamento'  },
  // Financeiro
  { chave: 'total_produtos',     label: 'Total dos Produtos', grupo: 'Financeiro' },
  { chave: 'desconto_global',    label: 'Desconto Global',    grupo: 'Financeiro' },
  { chave: 'frete',              label: 'Frete',              grupo: 'Financeiro' },
  { chave: 'total_orcamento',    label: 'Total Final',        grupo: 'Financeiro' },
  // Textos
  { chave: 'observacoes',        label: 'Observações',        grupo: 'Textos'     },
  { chave: 'texto_validade',     label: 'Texto de Validade',  grupo: 'Textos'     },
  { chave: 'texto_rodape',       label: 'Texto de Rodapé',    grupo: 'Textos'     },
  { chave: 'empresa',            label: 'Nome da Empresa',    grupo: 'Textos'     },
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
