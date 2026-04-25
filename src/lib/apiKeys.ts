// ─────────────────────────────────────────────────────────────────────────────
// apiKeys.ts — Funções de acesso à tabela ia_api_keys e ia_api_logs
// Toda operação filtra por tenant_id (multi-tenant obrigatório).
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from './supabase';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type IntegracaoTipo =
  | 'flowise' | 'runway' | 'n8n' | 'make'
  | 'custom' | 'whatsapp' | 'excel' | 'webhook';

export type ApiKeyStatus = 'ativo' | 'inativo' | 'revogado';

export interface Permissoes {
  modulos: string[];
  acoes: {
    ler: boolean;
    criar: boolean;
    editar: boolean;
    deletar: boolean;
  };
  webhooks: {
    receber: boolean;
    enviar: boolean;
  };
  whatsapp: {
    // Leitura
    ler_mensagens: boolean;
    ler_todas_conversas: boolean;      // acesso ao histórico completo vs só conversas ativas
    // Restrições de contato
    numeros_bloqueados: string[];      // números que não devem ser lidos nem contactados
    apenas_numeros_permitidos: string[]; // whitelist (vazio = sem restrição)
    // Envio manual
    enviar_mensagens: boolean;         // enviar em resposta a mensagem recebida
    enviar_sem_comando: boolean;       // envio proativo sem trigger do cliente
    enviar_em_massa: boolean;          // disparos em lote (Módulo Prospecção)
    // Auto-resposta
    responder_automatico: boolean;     // IA responde sem aprovação do usuário
    // Mensagem inicial (primeira interação com um contato)
    mensagem_inicial: string;          // saudação quando o contato abre conversa pela 1ª vez ('' = desativa)
    // Comportamento da resposta automática
    modo_resposta_automatica: 'mensagem_fixa' | 'prompt_estilo'; // como a IA decide o que responder
    resposta_fixa: string;             // usado quando modo = 'mensagem_fixa'
    prompt_estilo: string;             // "forma de falar" usada quando modo = 'prompt_estilo'
    // Escopo de uso
    modulos_autorizados: string[];     // módulos que podem usar esta API ([] = todos)
    agentes_autorizados: string[];     // IDs de employee_id de agentes que podem responder ([] = todos)
  };
  rate_limit: {
    requests_por_minuto: number;
    requests_por_dia: number;
  };
}

export const DEFAULT_PERMISSOES: Permissoes = {
  modulos: [],
  acoes:    { ler: true, criar: false, editar: false, deletar: false },
  webhooks: { receber: false, enviar: false },
  whatsapp: {
    ler_mensagens: false,
    ler_todas_conversas: false,
    numeros_bloqueados: [],
    apenas_numeros_permitidos: [],
    enviar_mensagens: false,
    enviar_sem_comando: false,
    enviar_em_massa: false,
    responder_automatico: false,
    mensagem_inicial: '',
    modo_resposta_automatica: 'prompt_estilo',
    resposta_fixa: '',
    prompt_estilo: '',
    modulos_autorizados: [],
    agentes_autorizados: [],
  },
  rate_limit: { requests_por_minuto: 60, requests_por_dia: 10000 },
};

export interface ApiKey {
  id: string;
  tenant_id: string;
  nome: string;
  descricao: string | null;
  key_prefix: string;   // prefixo visível: "zita_xxxxxxxxx..."
  key_hash: string;     // SHA-256 da chave completa (verificação server-side)
  status: ApiKeyStatus;
  employee_id: string | null;
  permissoes: Permissoes;
  integracao_tipo: IntegracaoTipo | null;
  integracao_url: string | null;
  integracao_config: Record<string, unknown>;
  ultimo_uso_at: string | null;
  total_requests: number;
  criado_por: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiLog {
  id: string;
  api_key_id: string;
  tenant_id: string;
  endpoint: string;
  metodo: string;
  status_code: number | null;
  ip_origem: string | null;
  user_agent: string | null;
  payload_resumo: string | null;
  duracao_ms: number | null;
  erro: string | null;
  created_at: string;
}

export interface CreateApiKeyInput {
  tenant_id: string;
  nome: string;
  descricao?: string;
  employee_id?: string | null;
  permissoes?: Partial<Permissoes>;
  integracao_tipo?: IntegracaoTipo | null;
  integracao_url?: string | null;
  integracao_config?: Record<string, unknown>;
  criado_por?: string;
}

export interface ApiLogsPage {
  data: ApiLog[];
  total: number;
  page: number;
}

const PAGE_SIZE = 20;

// ── Funções ───────────────────────────────────────────────────────────────────

/**
 * Retorna todas as API Keys pertencentes aos tenants indicados.
 */
export async function getApiKeys(tenantIds: string[]): Promise<ApiKey[]> {
  if (tenantIds.length === 0) return [];

  const { data, error } = await supabase
    .from('ia_api_keys')
    .select('*')
    .in('tenant_id', tenantIds)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`getApiKeys: ${error.message}`);
  return (data ?? []) as ApiKey[];
}

/**
 * Cria um registro em ia_api_keys.
 *
 * Dois modos:
 * - INBOUND (integracao_tipo=null): gera chave zita_xxx que agentes externos
 *   usarão para chamar a ZIA. Retorna rawKey (exibida uma única vez).
 * - OUTBOUND (integracao_tipo preenchido): apenas armazena credenciais de um
 *   serviço externo que a ZIA vai chamar (Z-API, Flowise...). key_prefix e
 *   key_hash ficam NULL pois não há autenticação inbound. rawKey === ''.
 */
export async function createApiKey(
  input: CreateApiKeyInput,
): Promise<{ key: ApiKey; rawKey: string }> {
  const isOutbound = !!input.integracao_tipo;

  let key_prefix: string | null = null;
  let key_hash:   string | null = null;
  let rawKey = '';

  if (!isOutbound) {
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    const hex = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    rawKey = `zita_${hex}`;
    key_prefix = rawKey.slice(0, 14);

    const hashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawKey));
    key_hash = Array.from(new Uint8Array(hashBuf))
      .map(b => b.toString(16).padStart(2, '0')).join('');
  }

  const permissoes: Permissoes = {
    ...DEFAULT_PERMISSOES,
    ...input.permissoes,
    acoes:      { ...DEFAULT_PERMISSOES.acoes,       ...input.permissoes?.acoes      },
    webhooks:   { ...DEFAULT_PERMISSOES.webhooks,    ...input.permissoes?.webhooks   },
    whatsapp:   { ...DEFAULT_PERMISSOES.whatsapp,    ...input.permissoes?.whatsapp   },
    rate_limit: { ...DEFAULT_PERMISSOES.rate_limit,  ...input.permissoes?.rate_limit },
  };

  const { data, error } = await supabase
    .from('ia_api_keys')
    .insert({
      tenant_id:         input.tenant_id,
      nome:              input.nome,
      descricao:         input.descricao ?? null,
      employee_id:       input.employee_id ?? null,
      key_prefix,
      key_hash,
      permissoes,
      integracao_tipo:   input.integracao_tipo ?? null,
      integracao_url:    input.integracao_url ?? null,
      integracao_config: input.integracao_config ?? {},
      criado_por:        input.criado_por ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`createApiKey: ${error.message}`);
  return { key: data as ApiKey, rawKey };
}

/**
 * Atualiza campos de uma API Key existente (exceto api_key e tenant_id).
 */
export async function updateApiKey(
  id: string,
  updates: Partial<Omit<ApiKey, 'id' | 'api_key' | 'tenant_id' | 'created_at' | 'updated_at'>>,
): Promise<ApiKey> {
  const { data, error } = await supabase
    .from('ia_api_keys')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`updateApiKey: ${error.message}`);
  return data as ApiKey;
}

/**
 * Revoga uma API Key (status → 'revogado'). Irreversível pelo app.
 */
export async function revokeApiKey(id: string): Promise<void> {
  const { error } = await supabase
    .from('ia_api_keys')
    .update({ status: 'revogado' })
    .eq('id', id);

  if (error) throw new Error(`revokeApiKey: ${error.message}`);
}

/**
 * Retorna os logs de uso de uma API Key, paginados (20 por página).
 */
export async function getApiLogs(
  apiKeyId: string,
  page: number = 1,
): Promise<ApiLogsPage> {
  const offset = (page - 1) * PAGE_SIZE;

  const { data, error, count } = await supabase
    .from('ia_api_logs')
    .select('*', { count: 'exact' })
    .eq('api_key_id', apiKeyId)
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (error) throw new Error(`getApiLogs: ${error.message}`);
  return { data: (data ?? []) as ApiLog[], total: count ?? 0, page };
}

/**
 * Busca logs de um tenant inteiro (para a view de logs global).
 */
export async function getTenantLogs(
  tenantIds: string[],
  page: number = 1,
  filters?: { apiKeyId?: string; dateFrom?: string; statusCode?: number },
): Promise<ApiLogsPage> {
  if (tenantIds.length === 0) return { data: [], total: 0, page };

  const offset = (page - 1) * PAGE_SIZE;
  let query = supabase
    .from('ia_api_logs')
    .select('*', { count: 'exact' })
    .in('tenant_id', tenantIds)
    .order('created_at', { ascending: false });

  if (filters?.apiKeyId) query = query.eq('api_key_id', filters.apiKeyId);
  if (filters?.dateFrom)  query = query.gte('created_at', filters.dateFrom);
  if (filters?.statusCode) query = query.eq('status_code', filters.statusCode);

  const { data, error, count } = await query.range(offset, offset + PAGE_SIZE - 1);
  if (error) throw new Error(`getTenantLogs: ${error.message}`);
  return { data: (data ?? []) as ApiLog[], total: count ?? 0, page };
}

/** Exibe o prefixo da chave com reticências: "zita_xxxxxxxxx..." */
export function maskApiKey(keyPrefix: string | undefined | null): string {
  if (!keyPrefix) return '—';
  return `${keyPrefix}...`;
}
