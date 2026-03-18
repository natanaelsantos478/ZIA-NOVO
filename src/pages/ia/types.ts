export type MensagemRole = 'user' | 'assistant' | 'tool'
export type CanalChat = 'chat' | 'whatsapp' | 'email' | 'webhook'
export type AgenteStatus = 'ativo' | 'inativo' | 'rascunho'

export interface Agente {
  id: string
  nome: string
  descricao: string | null
  avatar_emoji: string
  cor: string
  funcao: string
  modelo: string
  modelo_versao: string
  status: AgenteStatus
  tipo: 'ORQUESTRADOR' | 'ESPECIALISTA' | 'EXTERNO'
}

export interface Conversa {
  id: string
  tenant_id: string
  titulo: string | null
  agente_id: string | null
  canal: CanalChat
  ativa: boolean
  created_at: string
  updated_at: string
  agente?: Agente
}

export interface ArquivoIA {
  id: string
  nome_original: string
  mime_type: string
  tamanho_bytes: number
  storage_path: string
  analise_cache: Record<string, unknown> | null
}

export interface ToolCallInfo {
  tool: string
  input: Record<string, unknown>
  resultado?: Record<string, unknown>
  duracao_ms?: number
}

export interface ArquivoVisual {
  nome: string
  preview?: string
  mime_type: string
}

export interface Mensagem {
  id: string
  conversa_id: string
  role: MensagemRole
  conteudo: string
  agente_id: string | null
  ferramentas_usadas: ToolCallInfo[]
  tokens_usados: number | null
  created_at: string
  // campos locais (não vêm do banco)
  isStreaming?: boolean
  arquivos?: ArquivoIA[]
  arquivos_visuais?: ArquivoVisual[]
}

export interface SSEEvent {
  type: 'conversa_id' | 'thinking' | 'tool_start' | 'tool_end' | 'text' | 'done' | 'error'
  id?: string
  tool?: string
  input?: Record<string, unknown>
  resultado?: Record<string, unknown>
  delta?: string
  mensagem_id?: string
  tokens?: number
  message?: string
}

export interface ArquivoPendente {
  file: File
  preview?: string
  progresso: number
  arquivo_id?: string
  erro?: string
}
