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

export const MOCK_CLIENTES_LISTA: LookupPessoa[] = [
  { id: 'cli-001', nome: 'Maria Aparecida Santos',     cpf_cnpj: '345.678.901-23', tipo_pessoa: 'PESSOA_FISICA',   data_nascimento: '1975-04-12', genero: 'FEMININO',   telefone: '(11) 99123-4567', email: 'maria.santos@email.com',      endereco: 'Rua das Acácias, 234 — São Paulo, SP',     convenio: 'Unimed',        matricula: '001234567',  tipo_vinculo: 'CLIENTE', tipo_cliente: 'CLIENTE_NORMAL' },
  { id: 'cli-002', nome: 'Pedro Henrique Oliveira',    cpf_cnpj: '456.789.012-34', tipo_pessoa: 'PESSOA_FISICA',   data_nascimento: '1990-11-30', genero: 'MASCULINO',  telefone: '(41) 98765-4321', email: 'pedro.oliveira@email.com',     endereco: 'R. Flores, 88 — Curitiba, PR',            convenio: null,            matricula: null,         tipo_vinculo: 'CLIENTE', tipo_cliente: 'CLIENTE_NORMAL' },
  { id: 'cli-003', nome: 'Ana Claudia Ferreira',       cpf_cnpj: '234.567.890-12', tipo_pessoa: 'PESSOA_FISICA',   data_nascimento: '1988-07-22', genero: 'FEMININO',   telefone: '(31) 97654-3210', email: 'ana.ferreira@email.com',       endereco: 'Av. Afonso Pena, 500 — Belo Horizonte, MG', convenio: 'Bradesco Saúde', matricula: '998877665', tipo_vinculo: 'CLIENTE', tipo_cliente: 'CLIENTE_NORMAL' },
  { id: 'cli-004', nome: 'Eletrotec Ltda.',            cpf_cnpj: '12.345.678/0001-99', tipo_pessoa: 'PESSOA_JURIDICA', data_nascimento: null, genero: null, telefone: '(21) 3099-4500', email: 'contato@eletrotec.com.br', endereco: 'Av. Industrial, 1200 — Rio de Janeiro, RJ', convenio: null, matricula: null, tipo_vinculo: 'CLIENTE', tipo_cliente: 'CLIENTE_NORMAL' },
  { id: 'cli-005', nome: 'Construções Novas Eras ME',  cpf_cnpj: '98.765.432/0001-11', tipo_pessoa: 'PESSOA_JURIDICA', data_nascimento: null, genero: null, telefone: '(51) 3344-5566', email: 'suporte@novaseras.com.br',     endereco: 'R. das Indústrias, 88 — Porto Alegre, RS', convenio: null, matricula: null, tipo_vinculo: 'CLIENTE', tipo_cliente: 'CLIENTE_NORMAL' },
  { id: 'cli-006', nome: 'Carlos Eduardo Moraes',      cpf_cnpj: '567.890.123-45', tipo_pessoa: 'PESSOA_FISICA',   data_nascimento: '1982-03-14', genero: 'MASCULINO',  telefone: '(85) 99988-7766', email: 'carlos.moraes@gmail.com',      endereco: 'R. Dom Luis, 120 — Fortaleza, CE',        convenio: 'SulAmérica',    matricula: '445566778',  tipo_vinculo: 'CLIENTE', tipo_cliente: 'CLIENTE_NORMAL' },
  // Solicitantes de serviço (tipo_cliente diferente)
  { id: 'sol-001', nome: 'Prefeitura Municipal de Goiânia', cpf_cnpj: '01.612.092/0001-23', tipo_pessoa: 'PESSOA_JURIDICA', data_nascimento: null, genero: null, telefone: '(62) 3524-6000', email: 'manutencao@goiania.go.gov.br', endereco: 'Av. do Cerrado, 999 — Goiânia, GO', convenio: null, matricula: null, tipo_vinculo: 'SOLICITANTE', tipo_cliente: 'SOLICITANTE_SERVICO' },
  { id: 'sol-002', nome: 'Supermercado Bom Preço',     cpf_cnpj: '55.432.100/0001-88', tipo_pessoa: 'PESSOA_JURIDICA', data_nascimento: null, genero: null, telefone: '(62) 3211-4422', email: 'ti@bompreco.com.br',           endereco: 'R. Comercial, 400 — Aparecida de Goiânia, GO', convenio: null, matricula: null, tipo_vinculo: 'SOLICITANTE', tipo_cliente: 'SOLICITANTE_SERVICO' },
];

export const MOCK_PACIENTES_LISTA: LookupPessoa[] = [
  { id: 'pac-001', nome: 'Maria Aparecida Santos',     cpf_cnpj: '345.678.901-23', tipo_pessoa: 'PESSOA_FISICA',   data_nascimento: '1975-04-12', genero: 'FEMININO',  telefone: '(11) 99123-4567', email: 'maria.santos@email.com', endereco: 'Rua das Acácias, 234 — São Paulo, SP', convenio: 'Unimed',     matricula: '001234567', tipo_vinculo: 'PACIENTE' },
  { id: 'pac-002', nome: 'José Roberto Lima',          cpf_cnpj: '678.901.234-56', tipo_pessoa: 'PESSOA_FISICA',   data_nascimento: '1958-09-05', genero: 'MASCULINO', telefone: '(11) 97777-5544', email: 'jrlima@email.com',       endereco: 'Av. Paulista, 1500 — São Paulo, SP',   convenio: 'Amil',       matricula: '334455667', tipo_vinculo: 'PACIENTE' },
  { id: 'pac-003', nome: 'Fernanda Costa Ribeiro',     cpf_cnpj: '789.012.345-67', tipo_pessoa: 'PESSOA_FISICA',   data_nascimento: '2000-12-18', genero: 'FEMININO',  telefone: '(21) 98888-3322', email: 'fernanda.costa@email.com', endereco: 'R. Leblon, 77 — Rio de Janeiro, RJ',  convenio: null,         matricula: null,        tipo_vinculo: 'PACIENTE' },
  { id: 'pac-004', nome: 'Antônio Pereira da Silva',   cpf_cnpj: '890.123.456-78', tipo_pessoa: 'PESSOA_FISICA',   data_nascimento: '1945-02-28', genero: 'MASCULINO', telefone: '(31) 96666-1100', email: null,                     endereco: 'R. da Paz, 33 — Contagem, MG',        convenio: 'Unimed',     matricula: '778899001', tipo_vinculo: 'PACIENTE' },
  { id: 'pac-005', nome: 'Mariana Souza Barbosa',      cpf_cnpj: '901.234.567-89', tipo_pessoa: 'PESSOA_FISICA',   data_nascimento: '2015-06-10', genero: 'FEMININO',  telefone: '(41) 95555-9988', email: 'mariana.mae@email.com',  endereco: 'R. Verde, 55 — Curitiba, PR',          convenio: 'Bradesco Saúde', matricula: '112233445', tipo_vinculo: 'PACIENTE' },
];

/** Busca pessoas por tipo de vínculo — usado no autocomplete (mínimo 3 chars) */
export function buscarPessoas(query: string, tipo: TipoVinculo): LookupPessoa[] {
  if (query.length < 3) return [];
  const q = query.toLowerCase();
  const lista = tipo === 'PACIENTE'
    ? MOCK_PACIENTES_LISTA
    : MOCK_CLIENTES_LISTA.filter(p =>
        tipo === 'SOLICITANTE'
          ? p.tipo_cliente === 'SOLICITANTE_SERVICO'
          : p.tipo_cliente === 'CLIENTE_NORMAL'
      );
  return lista.filter(p =>
    p.nome.toLowerCase().includes(q) ||
    (p.cpf_cnpj ?? '').replace(/\D/g, '').includes(q.replace(/\D/g, ''))
  ).slice(0, 6);
}

/** Label de destino da tabela no Supabase conforme tipo */
export function tabelaDestino(tipo: TipoVinculo): string {
  return tipo === 'PACIENTE' ? 'atendimento_pacientes' : 'erp_clientes';
}
