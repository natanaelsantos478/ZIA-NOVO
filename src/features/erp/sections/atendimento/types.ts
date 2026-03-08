// ─────────────────────────────────────────────────────────────────────────────
// Atendimento — Tipos centrais (compartilhado entre Atendimento, Caso e Pagamento)
// ─────────────────────────────────────────────────────────────────────────────

export type TipoAtendimento =
  | 'SUPORTE_TECNICO' | 'HOSPITALAR' | 'CONSULTA_MEDICA' | 'TRIAGEM' | 'EMERGENCIA'
  | 'ATENDIMENTO_COMERCIAL' | 'MANUTENCAO' | 'INSTALACAO' | 'VISITA_TECNICA'
  | 'RECLAMACAO' | 'SOLICITACAO' | 'INFORMACAO' | 'DEVOLUCAO' | 'OUTRO';

export type CanalEntrada =
  | 'PRESENCIAL' | 'TELEFONE' | 'EMAIL' | 'CHAT' | 'WHATSAPP'
  | 'APP_MOBILE' | 'PORTAL' | 'OUTRO';

export type PrioridadeAtend = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA' | 'URGENTE';

export type StatusAtend =
  | 'AGUARDANDO' | 'EM_ATENDIMENTO' | 'AGUARDANDO_CLIENTE' | 'AGUARDANDO_TERCEIRO'
  | 'EM_ANALISE' | 'RESOLVIDO' | 'FECHADO' | 'CANCELADO';

export type RiscoTriagem = 'VERMELHO' | 'LARANJA' | 'AMARELO' | 'VERDE' | 'AZUL';

export type StatusPagamento = 'PENDENTE' | 'PARCIAL' | 'PAGO' | 'ISENTO' | 'CONVENIO';

export interface InteracaoAtend {
  id: string;
  tipo: 'NOTA' | 'EMAIL' | 'LIGACAO' | 'MENSAGEM' | 'RESOLUCAO' | 'ESCALONAMENTO' | 'STATUS_CHANGE';
  texto: string;
  autor: string;
  privado: boolean;
  created_at: string;
}

// ─── ATENDIMENTO ─────────────────────────────────────────────────────────────
export interface Atendimento {
  id: string;
  numero: string;                       // ATD-2026-000001

  // Identificação
  tipo: TipoAtendimento;
  canal: CanalEntrada;
  status: StatusAtend;
  prioridade: PrioridadeAtend;
  sla_horas: number;
  sla_deadline: string | null;
  sla_cumprido: boolean | null;

  // Solicitante / Paciente
  solicitante_nome: string;
  solicitante_tipo: 'PESSOA_FISICA' | 'PESSOA_JURIDICA';
  solicitante_cpf_cnpj: string | null;
  solicitante_data_nascimento: string | null;
  solicitante_genero: 'MASCULINO' | 'FEMININO' | 'NAO_BINARIO' | 'NAO_INFORMADO' | null;
  solicitante_telefone: string | null;
  solicitante_email: string | null;
  solicitante_endereco: string | null;
  solicitante_convenio: string | null;
  solicitante_matricula: string | null;
  cliente_id: string | null;

  // Conteúdo do atendimento
  titulo: string;
  descricao: string;
  setor: string | null;
  categoria: string | null;
  subcategoria: string | null;
  tags: string[];

  // Responsável
  responsavel_nome: string | null;
  equipe: string | null;
  unidade: string | null;

  // Informações clínicas / técnicas
  motivo_visita: string | null;
  sintomas: string | null;
  historico_relevante: string | null;
  risco_triagem: RiscoTriagem | null;
  alergias: string | null;
  nivel_dor: number | null;             // 0–10

  // Datas
  data_abertura: string;
  data_inicio_atendimento: string | null;
  data_previsao: string | null;
  data_fechamento: string | null;

  // Vinculações
  caso_id: string | null;
  pedido_id: string | null;
  projeto_id: string | null;

  // Financeiro (espelho — master em AtendimentoPagamento)
  financeiro_id: string | null;
  valor_estimado: number | null;
  status_pagamento: StatusPagamento | null;

  // Avaliação
  satisfacao: number | null;            // 1–5
  feedback: string | null;

  // Histórico de interações
  historico: InteracaoAtend[];

  // Campos extras dinâmicos (para uso setorial)
  campos_extras: Record<string, unknown>;

  tenant_id: string;
  created_at: string;
  updated_at: string;
}

// ─── CASO ─────────────────────────────────────────────────────────────────────
export type StatusCaso =
  | 'ABERTO' | 'EM_INVESTIGACAO' | 'AGUARDANDO_EXAMES' | 'DIAGNOSTICADO'
  | 'EM_TRATAMENTO' | 'MONITORAMENTO' | 'RESOLVIDO' | 'ARQUIVADO' | 'ENCAMINHADO';

export interface DiagnosticoSecundario {
  id: string;
  descricao: string;
  cid10: string | null;
  probabilidade: number;               // 0–100 %
  confirmado: boolean;
  causa: string | null;
  observacoes: string | null;
}

export interface CadeiaDiagnostico {
  id: string;
  ordem: number;
  diagnostico: string;
  cid10: string | null;
  data: string;
  causa: string | null;
  efeito: string | null;
  responsavel: string;
  observacoes: string | null;
}

export interface MedicamentoItem {
  id: string;
  nome: string;
  dosagem: string;
  via: string;                         // VO, IV, IM, SC…
  frequencia: string;
  inicio: string | null;
  fim: string | null;
  prescrito_por: string | null;
}

export interface ExameItem {
  id: string;
  tipo: 'LABORATORIAL' | 'IMAGEM' | 'FUNCIONAL' | 'BIOPSIA' | 'OUTRO';
  nome: string;
  data_solicitacao: string;
  data_realizacao: string | null;
  resultado: string | null;
  laudo: string | null;
  status: 'SOLICITADO' | 'AGENDADO' | 'REALIZADO' | 'LAUDO_DISPONIVEL' | 'CANCELADO';
}

export interface EvolucaoItem {
  id: string;
  data: string;
  responsavel: string;
  texto: string;
  tipo: 'EVOLUCAO' | 'INTERCORRENCIA' | 'ALTA' | 'TRANSFERENCIA' | 'OBITO' | 'PRESCRICAO';
}

export interface PrescricaoItem {
  id: string;
  data: string;
  responsavel: string;
  medicamento: string;
  dosagem: string;
  via: string;
  frequencia: string;
  duracao: string;
  observacoes: string | null;
}

export interface ProcedimentoItem {
  id: string;
  nome: string;
  data: string;
  responsavel: string;
  descricao: string | null;
  resultado: string | null;
  status: 'AGENDADO' | 'REALIZADO' | 'CANCELADO';
}

export interface HabitoItem {
  tipo: 'TABAGISMO' | 'ETILISMO' | 'SEDENTARISMO' | 'ATIVIDADE_FISICA' | 'ALIMENTACAO' | 'OUTRO';
  descricao: string;
  frequencia: string | null;
  tempo: string | null;
}

export interface Caso {
  id: string;
  numero: string;                      // CSO-2026-000001

  // Identificação
  titulo: string;
  descricao: string;
  tipo_caso: string;
  status: StatusCaso;
  prioridade: PrioridadeAtend;

  // Paciente / Entidade
  paciente_nome: string;
  paciente_cpf: string | null;
  paciente_data_nascimento: string | null;
  paciente_genero: string | null;
  paciente_id: string | null;

  // Responsável
  responsavel: string | null;
  equipe: string | null;
  especialidade: string | null;

  // Diagnóstico principal
  diagnostico_principal: string | null;
  cid10: string | null;
  probabilidade_diagnostico: number | null; // 0–100 %
  causa_diagnostico: string | null;
  hipotese_diagnostica: string | null;
  diagnostico_diferencial: string[];

  // Diagnósticos secundários e cadeia
  diagnosticos_secundarios: DiagnosticoSecundario[];
  cadeia_diagnosticos: CadeiaDiagnostico[];

  // Anamnese
  queixa_principal: string | null;
  historia_doenca_atual: string | null;
  antecedentes_pessoais: string | null;
  antecedentes_familiares: string | null;
  historico_cirurgico: string | null;
  alergias: string | null;
  medicamentos_em_uso: MedicamentoItem[];
  habitos: HabitoItem[];

  // Exames, evolução e tratamento
  exames: ExameItem[];
  evolucoes: EvolucaoItem[];
  prescricoes: PrescricaoItem[];
  procedimentos: ProcedimentoItem[];
  protocolo: string | null;

  // Vinculações
  atendimentos_ids: string[];

  // Datas
  data_abertura: string;
  data_diagnostico: string | null;
  data_fechamento: string | null;

  tenant_id: string;
  created_at: string;
  updated_at: string;
}

// ─── PAGAMENTO DE ATENDIMENTO ─────────────────────────────────────────────────
export type FormaPagamento =
  | 'DINHEIRO' | 'CARTAO_DEBITO' | 'CARTAO_CREDITO' | 'PIX'
  | 'BOLETO' | 'CONVENIO' | 'CHEQUE' | 'TRANSFERENCIA' | 'OUTRO';

export type StatusPagAtend = 'PENDENTE' | 'PARCIAL' | 'PAGO' | 'ISENTO' | 'CANCELADO' | 'ESTORNADO';

export interface PagamentoAtendimento {
  id: string;
  numero: string;                      // PAG-2026-000001
  atendimento_id: string;
  atendimento_numero: string;
  paciente_nome: string;

  // Valores
  valor_servico: number;
  desconto: number;
  desconto_tipo: 'PERCENTUAL' | 'ABSOLUTO';
  acrescimo: number;
  valor_total: number;
  valor_pago: number;
  valor_pendente: number;

  // Forma e status de pagamento
  forma_pagamento: FormaPagamento;
  status: StatusPagAtend;

  // Parcelamento
  parcelas: number;
  parcelas_pagas: number;
  valor_parcela: number;

  // Convênio
  convenio: string | null;
  numero_convenio: string | null;
  autorizacao_convenio: string | null;

  // Datas
  data_emissao: string;
  data_vencimento: string | null;
  data_pagamento: string | null;

  // Fiscal
  numero_recibo: string | null;
  nfse_numero: string | null;

  observacoes: string | null;

  tenant_id: string;
  created_at: string;
}
