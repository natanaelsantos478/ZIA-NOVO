// ─────────────────────────────────────────────────────────────────────────────
// Tipos do Módulo de Compromissos — ZIA CRM
// ─────────────────────────────────────────────────────────────────────────────

export type CompromissoTipoFull = 'reuniao' | 'ligacao' | 'visita' | 'apresentacao' | 'outro';
export type CompromissoStatus   = 'agendado' | 'confirmado' | 'em_andamento' | 'concluido' | 'cancelado';

export interface CompromissoParticipante {
  id: string;
  compromisso_id: string;
  tenant_id: string;
  profissional_id: string;
  profissional_nome: string;
  profissional_email?: string;
  confirmado: boolean;
  created_at: string;
}

export interface CompromissoArquivo {
  id: string;
  compromisso_id: string;
  tenant_id: string;
  nome_original: string;
  storage_path: string;
  mime_type: string;
  tamanho_bytes?: number;
  criado_por?: string;
  created_at: string;
}

export interface CompromissoFull {
  id: string;
  tenant_id: string;

  titulo: string;
  notas: string;
  tipo: CompromissoTipoFull;
  status: CompromissoStatus;
  concluido: boolean;

  data: string;         // YYYY-MM-DD
  hora: string;         // HH:MM
  duracao: number;      // minutos
  data_hora_inicio?: string;
  data_hora_fim?: string;

  // Local
  local?: string;
  local_endereco?: string;
  local_lat?: number;
  local_lng?: number;

  // Reunião online
  link_reuniao?: string;

  // Vínculos
  negociacao_id?: string;
  orcamento_id?: string;
  cliente_id?: string;
  cliente_nome: string;
  empresa_id?: string;
  produto_id?: string;
  profissional_id?: string;

  // Valores
  valor_em_disputa?: number;
  moeda?: string;

  criado_por: string;
  created_at: string;
  updated_at?: string;

  // Relacionamentos (JOIN)
  participantes?: CompromissoParticipante[];
  arquivos?: CompromissoArquivo[];
}

export interface ZiaProfile {
  id: string;
  code: string;
  name: string;
  level: number;
  entity_name?: string;
  active: boolean;
}
