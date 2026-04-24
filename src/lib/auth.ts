// ─────────────────────────────────────────────────────────────────────────────
// auth.ts — Gerencia o JWT de autenticação ZIA
//
// • Armazenado em sessionStorage (limpo ao fechar a aba — nunca persiste entre sessões)
// • O JWT é emitido pela Edge Function zia-auth após validação de código+senha
// • Claims relevantes ficam em app_metadata: { is_admin, scope_ids, profile_id, holding_id }
// ─────────────────────────────────────────────────────────────────────────────

const TOKEN_KEY = 'zia_auth_token_v1';

// ── Armazenamento ─────────────────────────────────────────────────────────────

export function getAuthToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

// ── Decodificação (sem validação de assinatura — feita pelo servidor via RLS) ──

function decodePayload(token: string): Record<string, unknown> | null {
  try {
    const [, payload] = token.split('.');
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

function getAppMeta(token?: string | null): Record<string, unknown> {
  const t = token ?? getAuthToken();
  if (!t) return {};
  const claims = decodePayload(t);
  return (claims?.app_metadata as Record<string, unknown>) ?? {};
}

// ── Utilitários de claims ─────────────────────────────────────────────────────

/** Retorna true se o token atual pertence ao admin ZIA (vê todos os dados) */
export function isAdminToken(): boolean {
  return getAppMeta().is_admin === true;
}

/** Retorna os IDs de empresa acessíveis pelo token atual */
export function getTokenScopeIds(): string[] {
  const ids = getAppMeta().scope_ids;
  return Array.isArray(ids) ? (ids as string[]) : [];
}

/** Retorna o ID da entidade ativa (entity_id do JWT) */
export function getTokenEntityId(): string {
  return (getAppMeta().entity_id as string) ?? '';
}

/**
 * Retorna os tenant IDs para filtrar queries SELECT.
 * Prioridade:
 *   1. Perfil ativo selecionado na UI (zia_scope_ids_v1 no localStorage)
 *   2. scope_ids do JWT (todos os tenants acessíveis ao usuário)
 *   3. Fallback para DEFAULT_TENANT quando não há sessão
 * Admin não filtra (RLS usa zia_is_admin()).
 */
const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000001';
const SCOPE_IDS_KEY  = 'zia_scope_ids_v1';
export function getTenantIds(): string[] {
  if (isAdminToken()) return [];
  // Usa o escopo do perfil ativo (set pelo ProfileContext ao trocar empresa)
  try {
    const stored = localStorage.getItem(SCOPE_IDS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as string[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignora erro de parse */ }
  // Fallback: scope_ids do JWT (todos os tenants do usuário)
  const ids = getTokenScopeIds();
  return ids.length > 0 ? ids : [DEFAULT_TENANT];
}

/** Retorna o tenant ativo (entity_id) para INSERT e UPDATE/DELETE */
export function getTenantId(): string {
  if (isAdminToken()) return DEFAULT_TENANT;
  // Usa entity_id do perfil ativo quando disponível
  try {
    const id = localStorage.getItem('zia_active_entity_id_v1');
    if (id && id.length > 0) return id;
  } catch { /* ignora */ }
  const id = getTokenEntityId();
  return id.length > 0 ? id : DEFAULT_TENANT;
}

/** Verifica se o token existe e não está expirado */
export function isTokenValid(): boolean {
  const token = getAuthToken();
  if (!token) return false;
  const claims = decodePayload(token);
  if (!claims?.exp) return false;
  return (claims.exp as number) > Math.floor(Date.now() / 1000);
}
