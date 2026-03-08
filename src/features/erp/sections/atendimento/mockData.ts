// ─────────────────────────────────────────────────────────────────────────────
// Mock data — Atendimento, Caso e Pagamento
// Este arquivo é importável por outros módulos para consulta cruzada de dados.
// ─────────────────────────────────────────────────────────────────────────────
import type { Atendimento, Caso, PagamentoAtendimento } from './types';

const TENANT = '00000000-0000-0000-0000-000000000001';

// ─── ATENDIMENTOS ─────────────────────────────────────────────────────────────
export const MOCK_ATENDIMENTOS: Atendimento[] = [
  {
    id: 'atd-001', numero: 'ATD-2026-000001',
    tipo: 'HOSPITALAR', canal: 'PRESENCIAL', status: 'EM_ATENDIMENTO',
    prioridade: 'ALTA', sla_horas: 4,
    sla_deadline: '2026-03-08T14:00:00Z', sla_cumprido: null,
    solicitante_nome: 'Maria Aparecida Santos', solicitante_tipo: 'PESSOA_FISICA',
    solicitante_cpf_cnpj: '345.678.901-23', solicitante_data_nascimento: '1975-04-12',
    solicitante_genero: 'FEMININO', solicitante_telefone: '(11) 99123-4567',
    solicitante_email: 'maria.santos@email.com', solicitante_endereco: 'Rua das Acácias, 234 — São Paulo, SP',
    solicitante_convenio: 'Unimed', solicitante_matricula: '001234567',
    cliente_id: null,
    titulo: 'Consulta clínica — dor abdominal aguda',
    descricao: 'Paciente relata dor abdominal intensa no quadrante inferior direito há 6 horas.',
    setor: 'Clínica Geral', categoria: 'Consulta', subcategoria: 'Urgência',
    tags: ['dor-abdominal', 'urgência'],
    responsavel_nome: 'Dr. Carlos Mendes', equipe: 'Equipe A', unidade: 'UPA Centro',
    motivo_visita: 'Dor abdominal aguda', sintomas: 'Dor QID, náusea, febre 37,8°C',
    historico_relevante: 'HAS controlada. Sem cirurgias anteriores.',
    risco_triagem: 'LARANJA', alergias: 'Dipirona', nivel_dor: 8,
    data_abertura: '2026-03-08T10:00:00Z', data_inicio_atendimento: '2026-03-08T10:15:00Z',
    data_previsao: '2026-03-08T14:00:00Z', data_fechamento: null,
    caso_id: 'cso-001', pedido_id: null, projeto_id: null,
    financeiro_id: 'pag-001', valor_estimado: 350.00, status_pagamento: 'CONVENIO',
    satisfacao: null, feedback: null,
    historico: [
      { id: 'hi-001', tipo: 'STATUS_CHANGE', texto: 'Atendimento iniciado pelo Dr. Carlos Mendes.', autor: 'Dr. Carlos Mendes', privado: false, created_at: '2026-03-08T10:15:00Z' },
      { id: 'hi-002', tipo: 'NOTA', texto: 'Solicitado USG abdominal com urgência.', autor: 'Dr. Carlos Mendes', privado: true, created_at: '2026-03-08T10:40:00Z' },
    ],
    campos_extras: { peso: '68kg', altura: '162cm', pressao: '130/85' },
    tenant_id: TENANT, created_at: '2026-03-08T10:00:00Z', updated_at: '2026-03-08T10:15:00Z',
  },
  {
    id: 'atd-002', numero: 'ATD-2026-000002',
    tipo: 'SUPORTE_TECNICO', canal: 'EMAIL', status: 'AGUARDANDO',
    prioridade: 'MEDIA', sla_horas: 24,
    sla_deadline: '2026-03-09T09:00:00Z', sla_cumprido: null,
    solicitante_nome: 'Eletrotec Ltda.', solicitante_tipo: 'PESSOA_JURIDICA',
    solicitante_cpf_cnpj: '12.345.678/0001-99', solicitante_data_nascimento: null,
    solicitante_genero: null, solicitante_telefone: '(21) 3099-4500',
    solicitante_email: 'suporte@eletrotec.com.br', solicitante_endereco: 'Av. Industrial, 1200 — Rio de Janeiro, RJ',
    solicitante_convenio: null, solicitante_matricula: null, cliente_id: null,
    titulo: 'Falha no quadro de distribuição — loja 7',
    descricao: 'Disjuntor tripolar 100A desarmando após 20 minutos de operação.',
    setor: 'Instalações Elétricas', categoria: 'Manutenção Corretiva', subcategoria: 'Elétrica',
    tags: ['elétrica', 'disjuntor', 'urgente'],
    responsavel_nome: 'Técnico João Silva', equipe: 'Equipe Elétrica RJ', unidade: 'Regional RJ',
    motivo_visita: null, sintomas: 'Disjuntor desarmando por sobrecarga aparente',
    historico_relevante: 'Última manutenção preventiva: 01/2026',
    risco_triagem: null, alergias: null, nivel_dor: null,
    data_abertura: '2026-03-08T09:00:00Z', data_inicio_atendimento: null,
    data_previsao: '2026-03-09T09:00:00Z', data_fechamento: null,
    caso_id: null, pedido_id: null, projeto_id: null,
    financeiro_id: 'pag-002', valor_estimado: 1800.00, status_pagamento: 'PENDENTE',
    satisfacao: null, feedback: null,
    historico: [
      { id: 'hi-003', tipo: 'EMAIL', texto: 'E-mail de abertura recebido às 09:00.', autor: 'Sistema', privado: false, created_at: '2026-03-08T09:00:00Z' },
    ],
    campos_extras: { numero_serie_disjuntor: 'DSJ-998877', tensao: '380V', corrente_nominal: '100A' },
    tenant_id: TENANT, created_at: '2026-03-08T09:00:00Z', updated_at: '2026-03-08T09:00:00Z',
  },
  {
    id: 'atd-003', numero: 'ATD-2026-000003',
    tipo: 'ATENDIMENTO_COMERCIAL', canal: 'PRESENCIAL', status: 'RESOLVIDO',
    prioridade: 'BAIXA', sla_horas: 48,
    sla_deadline: '2026-03-10T10:00:00Z', sla_cumprido: true,
    solicitante_nome: 'Pedro Henrique Oliveira', solicitante_tipo: 'PESSOA_FISICA',
    solicitante_cpf_cnpj: '456.789.012-34', solicitante_data_nascimento: '1990-11-30',
    solicitante_genero: 'MASCULINO', solicitante_telefone: '(41) 98765-4321',
    solicitante_email: 'pedro.oliveira@email.com', solicitante_endereco: 'R. Flores, 88 — Curitiba, PR',
    solicitante_convenio: null, solicitante_matricula: null, cliente_id: null,
    titulo: 'Troca de produto com defeito — TV 55"',
    descricao: 'Cliente solicita troca de televisor com defeito de fábrica (tela com manchas).',
    setor: 'Pós-Venda', categoria: 'Troca / Devolução', subcategoria: 'Defeito de Fábrica',
    tags: ['troca', 'defeito', 'tv'],
    responsavel_nome: 'Atendente Fernanda Lima', equipe: 'Pós-Venda SP', unidade: 'Loja Centro',
    motivo_visita: null, sintomas: null, historico_relevante: null,
    risco_triagem: null, alergias: null, nivel_dor: null,
    data_abertura: '2026-03-06T14:30:00Z', data_inicio_atendimento: '2026-03-06T14:35:00Z',
    data_previsao: '2026-03-08T14:35:00Z', data_fechamento: '2026-03-07T11:00:00Z',
    caso_id: null, pedido_id: null, projeto_id: null,
    financeiro_id: 'pag-003', valor_estimado: 0, status_pagamento: 'ISENTO',
    satisfacao: 5, feedback: 'Atendimento excelente, resolução muito rápida!',
    historico: [
      { id: 'hi-004', tipo: 'NOTA', texto: 'NF de compra verificada. Produto dentro da garantia.', autor: 'Fernanda Lima', privado: true, created_at: '2026-03-06T14:40:00Z' },
      { id: 'hi-005', tipo: 'RESOLUCAO', texto: 'Troca realizada com novo produto do estoque. NF de troca emitida.', autor: 'Fernanda Lima', privado: false, created_at: '2026-03-07T11:00:00Z' },
    ],
    campos_extras: { numero_nf: 'NF-00123456', modelo_produto: 'Samsung QN55', numero_serie: 'SN20250301' },
    tenant_id: TENANT, created_at: '2026-03-06T14:30:00Z', updated_at: '2026-03-07T11:00:00Z',
  },
];

// ─── CASOS ────────────────────────────────────────────────────────────────────
export const MOCK_CASOS: Caso[] = [
  {
    id: 'cso-001', numero: 'CSO-2026-000001',
    titulo: 'Investigação de dor abdominal — possível apendicite',
    descricao: 'Caso clínico aberto a partir do ATD-2026-000001. Investigação diagnóstica em andamento.',
    tipo_caso: 'Clínico — Cirúrgico', status: 'EM_INVESTIGACAO', prioridade: 'ALTA',
    paciente_nome: 'Maria Aparecida Santos', paciente_cpf: '345.678.901-23',
    paciente_data_nascimento: '1975-04-12', paciente_genero: 'FEMININO', paciente_id: null,
    responsavel: 'Dr. Carlos Mendes', equipe: 'Cirurgia Geral', especialidade: 'Cirurgia Abdominal',
    diagnostico_principal: 'Apendicite aguda — hipótese diagnóstica principal',
    cid10: 'K37', probabilidade_diagnostico: 75,
    causa_diagnostico: 'Obstrução do lúmen apendicular por fecalito',
    hipotese_diagnostica: 'Apendicite aguda grau II',
    diagnostico_diferencial: ['Colite', 'Gravidez ectópica', 'Cisto ovariano roto', 'Diverticulite de Meckel'],
    diagnosticos_secundarios: [
      { id: 'ds-001', descricao: 'Hipertensão arterial sistêmica', cid10: 'I10', probabilidade: 100, confirmado: true, causa: 'Predisposição genética + sedentarismo', observacoes: 'Em uso de Losartana 50mg' },
    ],
    cadeia_diagnosticos: [
      { id: 'cd-001', ordem: 1, diagnostico: 'Dor abdominal inespecífica', cid10: 'R10', data: '2026-03-08T10:00:00Z', causa: 'Início do quadro', efeito: 'Triagem laranja', responsavel: 'Enfermeira Paula', observacoes: null },
      { id: 'cd-002', ordem: 2, diagnostico: 'Apendicite aguda — hipótese', cid10: 'K37', data: '2026-03-08T10:30:00Z', causa: 'Exame físico + Blumberg positivo', efeito: 'Solicitação de USG abdominal', responsavel: 'Dr. Carlos Mendes', observacoes: 'Blumberg +, descompressão brusca dolorosa QID' },
    ],
    queixa_principal: 'Dor abdominal intensa no quadrante inferior direito há 6 horas',
    historia_doenca_atual: 'Paciente refere início de dor periumbilical que migrou para QID, associada à náusea e vômito. Febre 37,8°C.',
    antecedentes_pessoais: 'HAS em uso de Losartana 50mg. Nega DM, cardiopatia ou pneumopatia.',
    antecedentes_familiares: 'Pai falecido por IAM. Mãe viva, 72 anos, DM2.',
    historico_cirurgico: 'Sem cirurgias prévias.',
    alergias: 'Dipirona (urticária)', medicamentos_em_uso: [
      { id: 'med-001', nome: 'Losartana', dosagem: '50mg', via: 'VO', frequencia: '1x/dia', inicio: '2020-01-01', fim: null, prescrito_por: 'Dr. Ramiro Alves' },
    ],
    habitos: [
      { tipo: 'SEDENTARISMO', descricao: 'Sem atividade física regular', frequencia: 'Diariamente', tempo: '5 anos' },
      { tipo: 'ALIMENTACAO', descricao: 'Dieta rica em gordura saturada', frequencia: 'Diariamente', tempo: null },
    ],
    exames: [
      { id: 'ex-001', tipo: 'LABORATORIAL', nome: 'Hemograma completo', data_solicitacao: '2026-03-08T10:45:00Z', data_realizacao: null, resultado: null, laudo: null, status: 'AGENDADO' },
      { id: 'ex-002', tipo: 'IMAGEM', nome: 'Ultrassonografia abdominal', data_solicitacao: '2026-03-08T10:45:00Z', data_realizacao: null, resultado: null, laudo: null, status: 'AGENDADO' },
    ],
    evolucoes: [
      { id: 'ev-001', data: '2026-03-08T10:15:00Z', responsavel: 'Dr. Carlos Mendes', texto: 'Paciente chegou com dor 8/10. Exame físico: abdome tenso, Blumberg +. Solicitados exames.', tipo: 'EVOLUCAO' },
    ],
    prescricoes: [
      { id: 'presc-001', data: '2026-03-08T10:20:00Z', responsavel: 'Dr. Carlos Mendes', medicamento: 'Ondansetrona', dosagem: '8mg', via: 'EV', frequencia: 'Se necessário', duracao: '24 horas', observacoes: 'Para náusea/vômito' },
    ],
    procedimentos: [], protocolo: 'Protocolo de Dor Abdominal Aguda v2.1',
    atendimentos_ids: ['atd-001'],
    data_abertura: '2026-03-08T10:30:00Z', data_diagnostico: null, data_fechamento: null,
    tenant_id: TENANT, created_at: '2026-03-08T10:30:00Z', updated_at: '2026-03-08T10:45:00Z',
  },
];

// ─── PAGAMENTOS ───────────────────────────────────────────────────────────────
export const MOCK_PAGAMENTOS: PagamentoAtendimento[] = [
  {
    id: 'pag-001', numero: 'PAG-2026-000001',
    atendimento_id: 'atd-001', atendimento_numero: 'ATD-2026-000001',
    paciente_nome: 'Maria Aparecida Santos',
    valor_servico: 350.00, desconto: 0, desconto_tipo: 'PERCENTUAL', acrescimo: 0,
    valor_total: 350.00, valor_pago: 350.00, valor_pendente: 0,
    forma_pagamento: 'CONVENIO', status: 'PAGO',
    parcelas: 1, parcelas_pagas: 1, valor_parcela: 350.00,
    convenio: 'Unimed', numero_convenio: '001234567', autorizacao_convenio: 'AUTH-2026-00331',
    data_emissao: '2026-03-08T10:00:00Z', data_vencimento: null, data_pagamento: '2026-03-08T10:00:00Z',
    numero_recibo: 'REC-2026-000001', nfse_numero: null, observacoes: 'Autorização convênio recebida.',
    tenant_id: TENANT, created_at: '2026-03-08T10:00:00Z',
  },
  {
    id: 'pag-002', numero: 'PAG-2026-000002',
    atendimento_id: 'atd-002', atendimento_numero: 'ATD-2026-000002',
    paciente_nome: 'Eletrotec Ltda.',
    valor_servico: 1800.00, desconto: 10, desconto_tipo: 'PERCENTUAL', acrescimo: 0,
    valor_total: 1620.00, valor_pago: 0, valor_pendente: 1620.00,
    forma_pagamento: 'BOLETO', status: 'PENDENTE',
    parcelas: 1, parcelas_pagas: 0, valor_parcela: 1620.00,
    convenio: null, numero_convenio: null, autorizacao_convenio: null,
    data_emissao: '2026-03-08T09:00:00Z', data_vencimento: '2026-03-15T09:00:00Z', data_pagamento: null,
    numero_recibo: null, nfse_numero: null, observacoes: 'Aguardando execução do serviço.',
    tenant_id: TENANT, created_at: '2026-03-08T09:00:00Z',
  },
  {
    id: 'pag-003', numero: 'PAG-2026-000003',
    atendimento_id: 'atd-003', atendimento_numero: 'ATD-2026-000003',
    paciente_nome: 'Pedro Henrique Oliveira',
    valor_servico: 0, desconto: 0, desconto_tipo: 'PERCENTUAL', acrescimo: 0,
    valor_total: 0, valor_pago: 0, valor_pendente: 0,
    forma_pagamento: 'OUTRO', status: 'ISENTO',
    parcelas: 1, parcelas_pagas: 1, valor_parcela: 0,
    convenio: null, numero_convenio: null, autorizacao_convenio: null,
    data_emissao: '2026-03-07T11:00:00Z', data_vencimento: null, data_pagamento: '2026-03-07T11:00:00Z',
    numero_recibo: 'REC-2026-000003', nfse_numero: null, observacoes: 'Troca em garantia — sem cobrança.',
    tenant_id: TENANT, created_at: '2026-03-07T11:00:00Z',
  },
];

// ─── FUNÇÕES DE ACESSO (usadas por outros módulos) ────────────────────────────

/** Retorna todos os atendimentos — pode ser filtrado por status */
export function getAtendimentosMock(status?: Atendimento['status']): Atendimento[] {
  if (!status) return MOCK_ATENDIMENTOS;
  return MOCK_ATENDIMENTOS.filter(a => a.status === status);
}

/** Retorna todos os casos */
export function getCasosMock(): Caso[] {
  return MOCK_CASOS;
}

/** Retorna pagamentos de atendimentos */
export function getPagamentosAtendMock(): PagamentoAtendimento[] {
  return MOCK_PAGAMENTOS;
}

/** Gera CSV exportável — planilha de atendimentos (acessível por outros módulos) */
export function exportAtendimentosCSV(items?: Atendimento[]): string {
  const data = items ?? MOCK_ATENDIMENTOS;
  const headers = [
    'Número', 'Tipo', 'Canal', 'Status', 'Prioridade', 'SLA (h)',
    'Solicitante', 'CPF/CNPJ', 'Telefone', 'E-mail',
    'Título', 'Categoria', 'Setor', 'Responsável', 'Unidade',
    'Data Abertura', 'Data Fechamento', 'Satisfação', 'Status Pagamento', 'Valor Estimado',
  ].join(';');

  const rows = data.map(a => [
    a.numero, a.tipo, a.canal, a.status, a.prioridade, a.sla_horas,
    a.solicitante_nome, a.solicitante_cpf_cnpj ?? '', a.solicitante_telefone ?? '', a.solicitante_email ?? '',
    a.titulo, a.categoria ?? '', a.setor ?? '', a.responsavel_nome ?? '', a.unidade ?? '',
    new Date(a.data_abertura).toLocaleString('pt-BR'),
    a.data_fechamento ? new Date(a.data_fechamento).toLocaleString('pt-BR') : '',
    a.satisfacao ?? '', a.status_pagamento ?? '', a.valor_estimado ?? '',
  ].join(';')).join('\n');

  return `${headers}\n${rows}`;
}

/** Gerador de número sequencial */
export function gerarNumeroAtendimento(existentes: Atendimento[]): string {
  const ano = new Date().getFullYear();
  const seq = existentes.length + 1;
  return `ATD-${ano}-${String(seq).padStart(6, '0')}`;
}

export function gerarNumeroCaso(existentes: Caso[]): string {
  const ano = new Date().getFullYear();
  const seq = existentes.length + 1;
  return `CSO-${ano}-${String(seq).padStart(6, '0')}`;
}

export function gerarNumeroPagamento(existentes: PagamentoAtendimento[]): string {
  const ano = new Date().getFullYear();
  const seq = existentes.length + 1;
  return `PAG-${ano}-${String(seq).padStart(6, '0')}`;
}

// ─── LOOKUP DE PESSOAS (autocomplete no Novo Atendimento) ────────────────────
//
// Tabela de destino conforme tipo de vínculo:
//   CLIENTE     → erp_clientes         (tipo_cliente = 'CLIENTE_NORMAL')
//   SOLICITANTE → erp_clientes         (tipo_cliente = 'SOLICITANTE_SERVICO')
//   PACIENTE    → atendimento_pacientes (tabela separada, fora do ERP Financeiro)
//
export type TipoVinculo = 'CLIENTE' | 'PACIENTE' | 'SOLICITANTE';

export interface LookupPessoa {
  id: string;
  nome: string;
  cpf_cnpj: string | null;
  tipo_pessoa: 'PESSOA_FISICA' | 'PESSOA_JURIDICA';
  data_nascimento: string | null;
  genero: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  convenio: string | null;
  matricula: string | null;
  tipo_vinculo: TipoVinculo;
  // Apenas clientes
  tipo_cliente?: 'CLIENTE_NORMAL' | 'SOLICITANTE_SERVICO';
}

/** Label de destino da tabela no Supabase conforme tipo */
export function tabelaDestino(tipo: TipoVinculo): string {
  return tipo === 'PACIENTE' ? 'atendimento_pacientes' : 'erp_clientes';
}
