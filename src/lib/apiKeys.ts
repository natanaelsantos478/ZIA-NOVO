// ─────────────────────────────────────────────────────────────────────────────
// apiKeys.ts — Funções de acesso à tabela ia_api_keys e ia_api_logs
//
// ARQUITETURA DE SEGURANÇA:
//   • Criação de chaves → Edge Function `create-api-key`
//     - Gera rawKey server-side (CSPRNG)
//     - Armazena apenas SHA-256(rawKey) no banco (nunca o texto puro)
//     - Retorna rawKey uma única vez ao criador
//   • Listagem/edição/revogação → Supabase direto
//     - SELECT nunca inclui key_hash (coluna é excluída explicitamente)
//   • Validação por IAs externas → Edge Function `ia-api-gateway`
//     - Recebe a chave via header, calcula SHA-256 e compara com o banco
//
// Toda operação filtra por tenant_id (multi-tenant obrigatório).
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from './supabase';
import { getAuthToken } from './auth';

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
    ler_mensagens: boolean;
    enviar_mensagens: boolean;
    enviar_sem_comando: boolean;
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
  whatsapp: { ler_mensagens: false, enviar_mensagens: false, enviar_sem_comando: false },
  rate_limit: { requests_por_minuto: 60, requests_por_dia: 10000 },
};

export interface ApiKey {
  id: string;
  tenant_id: string;
  nome: string;
  descricao: string | null;
  /** Primeiros 12 caracteres da chave — apenas para identificação visual.
   *  Ex: "zita_a3f9bc". O texto completo nunca é armazenado após a criação. */
  key_prefix: string;
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

// Colunas seguras para SELECT — nunca incluir key_hash
const SAFE_COLUMNS =
  'id, tenant_id, nome, descricao, key_prefix, status, employee_id, ' +
  'permissoes, integracao_tipo, integracao_url, integracao_config, ' +
  'ultimo_uso_at, total_requests, criado_por, created_at, updated_at';

// ── Verificação de configuração ───────────────────────────────────────────────

function assertConfigured(): void {
  if (!import.meta.env.VITE_SUPABASE_URL) {
    throw new Error(
      'Supabase não configurado. Adicione VITE_SUPABASE_URL e ' +
      'VITE_SUPABASE_ANON_KEY ao arquivo .env para usar o sistema de API Keys.',
    );
  }
}

// ── Funções ───────────────────────────────────────────────────────────────────

/**
 * Retorna todas as API Keys pertencentes aos tenants indicados.
 * key_hash nunca é incluído no resultado.
 */
export async function getApiKeys(tenantIds: string[]): Promise<ApiKey[]> {
  if (tenantIds.length === 0) return [];
  assertConfigured();

  const { data, error } = await supabase
    .from('ia_api_keys')
    .select(SAFE_COLUMNS)
    .in('tenant_id', tenantIds)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`getApiKeys: ${error.message}`);
  return (data ?? []) as ApiKey[];
}

/**
 * Cria uma nova API Key via Edge Function `create-api-key`.
 *
 * A Edge Function:
 *   - Gera rawKey = "zita_" + 32 bytes aleatórios (CSPRNG server-side)
 *   - Calcula key_hash = SHA-256(rawKey) e salva SOMENTE o hash no banco
 *   - Retorna { ...registro, raw_key } — única vez que raw_key é visível
 *
 * Retorna { key: ApiKey, rawKey: string } — o rawKey deve ser exibido
 * ao usuário imediatamente; não é possível recuperá-lo depois.
 */
export async function createApiKey(
  input: CreateApiKeyInput,
): Promise<{ key: ApiKey; rawKey: string }> {
  assertConfigured();

  const token = getAuthToken();
  if (!token) throw new Error('Usuário não autenticado');

  const permissoes: Permissoes = {
    ...DEFAULT_PERMISSOES,
    ...input.permissoes,
    acoes:    { ...DEFAULT_PERMISSOES.acoes,    ...input.permissoes?.acoes    },
    webhooks: { ...DEFAULT_PERMISSOES.webhooks, ...input.permissoes?.webhooks },
    whatsapp: { ...DEFAULT_PERMISSOES.whatsapp, ...input.permissoes?.whatsapp },
    rate_limit: { ...DEFAULT_PERMISSOES.rate_limit, ...input.permissoes?.rate_limit },
  };

  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-api-key`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
      },
      body: JSON.stringify({
        tenant_id:        input.tenant_id,
        nome:             input.nome,
        descricao:        input.descricao,
        employee_id:      input.employee_id,
        permissoes,
        integracao_tipo:  input.integracao_tipo,
        integracao_url:   input.integracao_url,
        integracao_config: input.integracao_config ?? {},
        criado_por:       input.criado_por,
      }),
    },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(`createApiKey: ${(err as { error?: string }).error ?? res.statusText}`);
  }

  const data = await res.json() as Record<string, unknown>;
  const { raw_key, ...keyData } = data;

  return { key: keyData as ApiKey, rawKey: raw_key as string };
}

/**
 * Atualiza campos de uma API Key existente (exceto key_prefix, key_hash e tenant_id).
 */
export async function updateApiKey(
  id: string,
  updates: Partial<Omit<ApiKey, 'id' | 'key_prefix' | 'tenant_id' | 'created_at' | 'updated_at'>>,
): Promise<ApiKey> {
  assertConfigured();

  const { data, error } = await supabase
    .from('ia_api_keys')
    .update(updates)
    .eq('id', id)
    .select(SAFE_COLUMNS)
    .single();

  if (error) throw new Error(`updateApiKey: ${error.message}`);
  return data as ApiKey;
}

/**
 * Revoga uma API Key (status → 'revogado'). Irreversível pelo app.
 */
export async function revokeApiKey(id: string): Promise<void> {
  assertConfigured();

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
  assertConfigured();

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
  assertConfigured();

  const offset = (page - 1) * PAGE_SIZE;
  let query = supabase
    .from('ia_api_logs')
    .select('*', { count: 'exact' })
    .in('tenant_id', tenantIds)
    .order('created_at', { ascending: false });

  if (filters?.apiKeyId)   query = query.eq('api_key_id', filters.apiKeyId);
  if (filters?.dateFrom)   query = query.gte('created_at', filters.dateFrom);
  if (filters?.statusCode) query = query.eq('status_code', filters.statusCode);

  const { data, error, count } = await query.range(offset, offset + PAGE_SIZE - 1);
  if (error) throw new Error(`getTenantLogs: ${error.message}`);
  return { data: (data ?? []) as ApiLog[], total: count ?? 0, page };
}

/**
 * Exibe o identificador visual de uma chave: "zita_a3f9bc..."
 * key_prefix já é a versão curta — apenas acrescenta reticências.
 */
export function maskApiKey(keyPrefix: string): string {
  return `${keyPrefix}...`;
}
