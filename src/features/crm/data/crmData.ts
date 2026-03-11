// ─────────────────────────────────────────────────────────────────────────────
// CRM Data Store — modelo CRM nativo (independente do ERP)
// Compartilhado entre Negociações, Agenda e Escuta Inteligente
// ─────────────────────────────────────────────────────────────────────────────

export type NegociacaoStatus = 'aberta' | 'ganha' | 'perdida' | 'suspensa';
export type NegociacaoEtapa  = 'prospeccao' | 'qualificacao' | 'proposta' | 'negociacao' | 'fechamento';
export type CompromissoTipo  = 'reuniao' | 'ligacao' | 'visita' | 'followup' | 'outro';
export type OrcamentoStatus  = 'rascunho' | 'enviado' | 'aprovado' | 'recusado';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface Negociacao {
  id: string;
  clienteId?: string;
  clienteNome: string;
  clienteCnpj?: string;
  clienteEmail?: string;
  clienteTelefone?: string;
  clienteEndereco?: string;
  descricao?: string;
  status: NegociacaoStatus;
  etapa: NegociacaoEtapa;
  valor_estimado?: number;
  probabilidade?: number;
  responsavel: string;
  origem?: string;
  dataCriacao: string;
  dataFechamentoPrev?: string;
  notas?: string;
}

export interface TranscriptLine { ts: number; text: string; }

export interface AnaliseAtendimento {
  perfil: string;
  temperatura: string;
  resumo: string;
  necessidades: string[];
  produtos_mencionados: string[];
  objecoes: string[];
  probabilidade_fechamento: number;
  sentimento: string;
  observacoes: string;
}

export interface Atendimento {
  id: string;
  negociacaoId: string;
  clienteNome: string;
  data: string;
  hora: string;
  duracao: number; // segundos
  transcricao: TranscriptLine[];
  analise?: AnaliseAtendimento;
}

export interface ItemOrcamento {
  id: string;
  produto_nome: string;
  codigo: string;
  unidade: string;
  quantidade: number;
  preco_unitario: number;
  desconto_pct: number;
  total: number;
}

export interface Orcamento {
  id: string;
  status: OrcamentoStatus;
  condicao_pagamento: string;
  desconto_global_pct: number;
  frete: number;
  itens: ItemOrcamento[];
  total: number;
  dataCriacao: string;
  criado_por: 'usuario' | 'ia';
}

export interface Compromisso {
  id: string;
  negociacaoId?: string;
  clienteNome: string;
  titulo: string;
  data: string;
  hora: string;
  duracao: number; // minutos
  tipo: CompromissoTipo;
  notas: string;
  criado_por: 'usuario' | 'ia';
  concluido: boolean;
}

export interface NegociacaoData {
  negociacao: Negociacao;
  atendimentos: Atendimento[];
  compromissos: Compromisso[];
  orcamento?: Orcamento;
}

// ── Store singleton ────────────────────────────────────────────────────────────

const _store: Map<string, NegociacaoData> = new Map();
const _livres: Compromisso[] = [];

function seed(d: NegociacaoData) { _store.set(d.negociacao.id, d); }

// ── Dados mock ─────────────────────────────────────────────────────────────────

seed({
  negociacao: {
    id: 'neg-001',
    clienteNome: 'Construtora ABC Ltda',
    clienteCnpj: '12.345.678/0001-90',
    clienteEmail: 'joao.silva@construtoraABC.com.br',
    clienteTelefone: '(11) 98765-4321',
    clienteEndereco: 'Av. Paulista, 1000 — São Paulo / SP',
    descricao: 'ERP + Módulo Obras para empreendimento de R$ 45 M',
    status: 'aberta', etapa: 'negociacao',
    valor_estimado: 95000, probabilidade: 78,
    responsavel: 'Carlos Mendes', origem: 'Indicação',
    dataCriacao: '2026-03-01', dataFechamentoPrev: '2026-04-15',
    notas: 'Decisor: João Silva (Diretor de TI). Urgência para implantação até junho/26.',
  },
  atendimentos: [
    {
      id: 'at-001', negociacaoId: 'neg-001',
      clienteNome: 'Construtora ABC Ltda',
      data: '2026-03-05', hora: '10:30', duracao: 1847,
      transcricao: [
        { ts: 0,  text: 'Bom dia! Aqui é o João da Construtora ABC.' },
        { ts: 12, text: 'Precisamos de uma solução de gestão para nossa obra de R$ 45 milhões.' },
        { ts: 34, text: 'Vocês têm algo específico para construção civil?' },
        { ts: 56, text: 'O prazo é crítico — precisamos implantar até junho.' },
        { ts: 78, text: 'Qual seria o custo para 50 usuários?' },
      ],
      analise: {
        perfil: 'EXECUTOR', temperatura: 'QUENTE',
        resumo: 'Cliente com urgência de prazo e budget alto. Busca solução vertical para construção civil com implantação até junho/26.',
        necessidades: ['Gestão de obra', 'Controle de custos', 'Implantação rápida', 'Multi-usuário 50+'],
        produtos_mencionados: ['Módulo Obras', 'ERP Backoffice', 'Gestão de Contratos'],
        objecoes: ['Prazo de implantação', 'Custo por usuário'],
        probabilidade_fechamento: 78, sentimento: 'positivo',
        observacoes: 'Priorizar demo técnica. Enviar proposta até 13/03.',
      },
    },
    {
      id: 'at-002', negociacaoId: 'neg-001',
      clienteNome: 'Construtora ABC Ltda',
      data: '2026-03-08', hora: '14:00', duracao: 924,
      transcricao: [
        { ts: 0,  text: 'Olá Carlos! Nosso time técnico aprovou o módulo de obras.' },
        { ts: 15, text: 'Principalmente o controle de cronograma. Consegue enviar proposta até sexta?' },
        { ts: 30, text: 'Preciso apresentar para a diretoria na segunda.' },
      ],
      analise: {
        perfil: 'EXECUTOR', temperatura: 'QUENTE',
        resumo: 'Follow-up pós-demo positivo. Solicitou proposta formal urgente para apresentar à diretoria.',
        necessidades: ['Proposta formal', 'Módulo de obras'],
        produtos_mencionados: ['Módulo Obras', 'Controle de cronograma'],
        objecoes: [],
        probabilidade_fechamento: 87, sentimento: 'positivo',
        observacoes: 'Enviar proposta até 13/03.',
      },
    },
  ],
  compromissos: [
    {
      id: 'comp-001', negociacaoId: 'neg-001',
      clienteNome: 'Construtora ABC Ltda',
      titulo: 'Envio de proposta formal',
      data: '2026-03-13', hora: '09:00', duracao: 30,
      tipo: 'followup', notas: 'Proposta com módulo de obras e cronograma.',
      criado_por: 'ia', concluido: true,
    },
    {
      id: 'comp-002', negociacaoId: 'neg-001',
      clienteNome: 'Construtora ABC Ltda',
      titulo: 'Reunião com a Diretoria ABC',
      data: '2026-03-18', hora: '10:00', duracao: 90,
      tipo: 'reuniao', notas: 'Apresentar proposta. Levar case de construtora similar.',
      criado_por: 'usuario', concluido: false,
    },
    {
      id: 'comp-009', negociacaoId: 'neg-001',
      clienteNome: 'Construtora ABC Ltda',
      titulo: 'Acompanhamento pós-reunião',
      data: '2026-03-25', hora: '09:00', duracao: 20,
      tipo: 'ligacao', notas: 'Verificar feedback da diretoria.',
      criado_por: 'ia', concluido: false,
    },
  ],
  orcamento: {
    id: 'orc-001', status: 'enviado',
    condicao_pagamento: '30/60/90 dias',
    desconto_global_pct: 5, frete: 0,
    itens: [
      { id: 'oi-1', produto_nome: 'ZIA ERP Backoffice',         codigo: 'ZIA-ERP', unidade: 'LIC', quantidade: 1,  preco_unitario: 18000, desconto_pct: 0,  total: 18000 },
      { id: 'oi-2', produto_nome: 'ZIA Módulo Obras',           codigo: 'ZIA-OBR', unidade: 'LIC', quantidade: 1,  preco_unitario: 12000, desconto_pct: 0,  total: 12000 },
      { id: 'oi-3', produto_nome: 'Implantação e Treinamento',  codigo: 'ZIA-IMP', unidade: 'HR',  quantidade: 40, preco_unitario: 350,   desconto_pct: 10, total: 12600 },
      { id: 'oi-4', produto_nome: 'Suporte Premium 12 meses',   codigo: 'ZIA-SUP', unidade: 'ANO', quantidade: 1,  preco_unitario: 8400,  desconto_pct: 0,  total: 8400  },
    ],
    total: 48450, dataCriacao: '2026-03-09', criado_por: 'ia',
  },
});

seed({
  negociacao: {
    id: 'neg-002',
    clienteNome: 'Distribuidora Norte Sul S/A',
    clienteCnpj: '98.765.432/0001-11',
    clienteEmail: 'maria.costa@nortesul.com.br',
    clienteTelefone: '(31) 97654-3210',
    clienteEndereco: 'Rua das Flores, 500 — Belo Horizonte / MG',
    descricao: 'Controle de estoque multi-filial e relatórios consolidados',
    status: 'aberta', etapa: 'proposta',
    valor_estimado: 32000, probabilidade: 52,
    responsavel: 'Ana Lima', origem: 'Inbound / Site',
    dataCriacao: '2026-03-04', dataFechamentoPrev: '2026-05-01',
    notas: 'Empresa tem 3 filiais. Usa planilhas hoje. Decisora: Maria Costa (Gerente de Operações).',
  },
  atendimentos: [
    {
      id: 'at-003', negociacaoId: 'neg-002',
      clienteNome: 'Distribuidora Norte Sul S/A',
      data: '2026-03-06', hora: '11:00', duracao: 2340,
      transcricao: [
        { ts: 0,  text: 'Olá, sou a Maria da Distribuidora Norte Sul.' },
        { ts: 18, text: 'Temos problemas sérios com estoque em 3 filiais — cada uma usa planilha diferente.' },
        { ts: 35, text: 'Precisamos centralizar e gerar relatórios automáticos sem depender de TI.' },
        { ts: 52, text: 'Qual o prazo de implantação em múltiplos locais?' },
      ],
      analise: {
        perfil: 'ANALITICO', temperatura: 'MORNO',
        resumo: 'Dor clara: gestão descentralizada de estoque. Busca dados consolidados e relatórios automáticos.',
        necessidades: ['Estoque multi-filial', 'Consolidação', 'Relatórios automáticos', 'Autonomia de TI'],
        produtos_mencionados: ['SCM Logística', 'BI/Relatórios'],
        objecoes: ['Migração de planilhas', 'Implantação multi-site'],
        probabilidade_fechamento: 52, sentimento: 'neutro',
        observacoes: 'Demo focada em SCM. Preparar case de distribuidora.',
      },
    },
  ],
  compromissos: [
    {
      id: 'comp-003', negociacaoId: 'neg-002',
      clienteNome: 'Distribuidora Norte Sul S/A',
      titulo: 'Demo SCM — controle multi-filial',
      data: '2026-03-15', hora: '15:00', duracao: 90,
      tipo: 'reuniao', notas: 'Demo focada em SCM multi-filial. Incluir case de sucesso.',
      criado_por: 'ia', concluido: false,
    },
    {
      id: 'comp-008', negociacaoId: 'neg-002',
      clienteNome: 'Distribuidora Norte Sul S/A',
      titulo: 'Envio de proposta SCM',
      data: '2026-03-22', hora: '10:00', duracao: 20,
      tipo: 'followup', notas: 'Enviar proposta após aprovação interna.',
      criado_por: 'ia', concluido: false,
    },
  ],
});

seed({
  negociacao: {
    id: 'neg-003',
    clienteNome: 'Indústria Metalúrgica MG Ltda',
    clienteCnpj: '11.222.333/0001-44',
    clienteTelefone: '(31) 3456-7890',
    descricao: 'Prospecção inicial — interesse em módulo PCP / produção',
    status: 'aberta', etapa: 'prospeccao',
    valor_estimado: 45000, probabilidade: 25,
    responsavel: 'Carlos Mendes', origem: 'Prospecção Ativa',
    dataCriacao: '2026-03-09', dataFechamentoPrev: '2026-06-30',
    notas: 'Fábrica de componentes metálicos, 80 funcionários. Sem ERP atualmente.',
  },
  atendimentos: [],
  compromissos: [
    {
      id: 'comp-004', negociacaoId: 'neg-003',
      clienteNome: 'Indústria Metalúrgica MG Ltda',
      titulo: 'Ligação de prospecção — 1º contato',
      data: '2026-03-20', hora: '09:30', duracao: 30,
      tipo: 'ligacao', notas: 'Verificar interesse em ERP + PCP.',
      criado_por: 'usuario', concluido: false,
    },
  ],
});

seed({
  negociacao: {
    id: 'neg-004',
    clienteNome: 'Escritório Advocacia Pinheiro',
    clienteCnpj: '22.333.444/0001-55',
    clienteEmail: 'admin@pinheiro-adv.com.br',
    clienteTelefone: '(21) 3210-9876',
    descricao: 'Gestão documental + assinatura digital',
    status: 'ganha', etapa: 'fechamento',
    valor_estimado: 18000, probabilidade: 100,
    responsavel: 'Ana Lima', origem: 'Indicação',
    dataCriacao: '2026-02-10', dataFechamentoPrev: '2026-03-01',
    notas: 'Contrato assinado em 01/03. Implantação em andamento.',
  },
  atendimentos: [],
  compromissos: [
    {
      id: 'comp-005', negociacaoId: 'neg-004',
      clienteNome: 'Escritório Advocacia Pinheiro',
      titulo: 'Treinamento da equipe',
      data: '2026-03-12', hora: '14:00', duracao: 120,
      tipo: 'visita', notas: 'Treinamento on-site, 12 usuários.',
      criado_por: 'usuario', concluido: true,
    },
    {
      id: 'comp-006', negociacaoId: 'neg-004',
      clienteNome: 'Escritório Advocacia Pinheiro',
      titulo: 'Check-in pós-implantação',
      data: '2026-03-19', hora: '11:00', duracao: 45,
      tipo: 'ligacao', notas: 'Verificar adaptação da equipe.',
      criado_por: 'ia', concluido: false,
    },
  ],
});

// Evento pessoal livre (não vinculado a negociação)
_livres.push({
  id: 'comp-007', negociacaoId: undefined,
  clienteNome: '',
  titulo: 'Reunião interna — planejamento Q2',
  data: '2026-03-11', hora: '08:30', duracao: 60,
  tipo: 'reuniao', notas: 'Alinhamento de metas do trimestre com o time comercial.',
  criado_por: 'usuario', concluido: false,
});

// ── API ────────────────────────────────────────────────────────────────────────

export function getAllNegociacoes(): NegociacaoData[] {
  return Array.from(_store.values());
}

export function getNegociacao(id: string): NegociacaoData | undefined {
  return _store.get(id);
}

export function createNegociacao(neg: Omit<Negociacao, 'id' | 'dataCriacao'>): NegociacaoData {
  const id = 'NEG-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  const data: NegociacaoData = {
    negociacao: { ...neg, id, dataCriacao: new Date().toISOString().split('T')[0] },
    atendimentos: [], compromissos: [],
  };
  _store.set(id, data);
  return data;
}

export function updateNegociacao(id: string, updates: Partial<Negociacao>): void {
  const d = _store.get(id);
  if (d) d.negociacao = { ...d.negociacao, ...updates };
}

export function addAtendimento(negId: string, at: Omit<Atendimento, 'id' | 'negociacaoId'>): Atendimento {
  if (!_store.has(negId)) {
    _store.set(negId, { negociacao: { id: negId, clienteNome: 'Cliente', status: 'aberta', etapa: 'prospeccao', responsavel: '', dataCriacao: new Date().toISOString().split('T')[0] }, atendimentos: [], compromissos: [] });
  }
  const full: Atendimento = { ...at, id: 'at-' + Math.random().toString(36).slice(2, 8), negociacaoId: negId };
  _store.get(negId)!.atendimentos.push(full);
  return full;
}

export function addCompromisso(negId: string | undefined, comp: Omit<Compromisso, 'id' | 'negociacaoId'>): Compromisso {
  const full: Compromisso = { ...comp, negociacaoId: negId, id: 'comp-' + Math.random().toString(36).slice(2, 8) };
  if (negId && _store.has(negId)) _store.get(negId)!.compromissos.push(full);
  else _livres.push(full);
  return full;
}

export function setOrcamento(negId: string, orc: Omit<Orcamento, 'id'>): Orcamento {
  const d = _store.get(negId);
  if (!d) return orc as Orcamento;
  const full: Orcamento = { ...orc, id: 'orc-' + Math.random().toString(36).slice(2, 8) };
  d.orcamento = full;
  return full;
}

export function toggleCompromissoConcluido(id: string): void {
  for (const d of _store.values()) {
    const c = d.compromissos.find(x => x.id === id);
    if (c) { c.concluido = !c.concluido; return; }
  }
  const c = _livres.find(x => x.id === id);
  if (c) c.concluido = !c.concluido;
}

export function getAllCompromissos(): Compromisso[] {
  const all: Compromisso[] = [];
  for (const d of _store.values()) all.push(...d.compromissos);
  all.push(..._livres);
  return all.sort((a, b) => a.data < b.data ? -1 : a.data > b.data ? 1 : a.hora < b.hora ? -1 : 1);
}
