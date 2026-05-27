// ─────────────────────────────────────────────────────────────────────────────
// google.ts — Suporte ao card google_workspace nos runners IA (multi-account)
//
// • loadGoogleGuard(sb, agentId)   — verifica se agente tem card ativo + scopes
// • listAccounts(sb, tenantId)     — lista contas Google conectadas no tenant
// • getAccessToken(sb, tenantId, email) — retorna access_token válido (refresh tx)
// • logUsage(...)                  — auditoria em google_api_usage
// • buildGooglePromptSection(...)  — injeta bloco no system prompt
// ─────────────────────────────────────────────────────────────────────────────

// deno-lint-ignore-file no-explicit-any

export const GOOGLE_SCOPES = {
  calendar:   'https://www.googleapis.com/auth/calendar',
  sheets:     'https://www.googleapis.com/auth/spreadsheets',
  gmail_read: 'https://www.googleapis.com/auth/gmail.readonly',
  gmail_send: 'https://www.googleapis.com/auth/gmail.send',
  drive_meta: 'https://www.googleapis.com/auth/drive.metadata.readonly',
} as const;

export type GoogleScope = keyof typeof GOOGLE_SCOPES;

export interface GoogleGuard {
  hasCard: boolean;
  scopes:  GoogleScope[];                // scopes habilitados no card
  accounts: { email: string; scopes: string[] }[]; // contas disponíveis para o tenant
}

export interface GoogleAccount {
  email:         string;
  access_token:  string;
  refresh_token: string;
  expires_at:    string;
  scopes:        string[];
}

const GOOGLE_TOKEN_URL    = 'https://oauth2.googleapis.com/token';
const REFRESH_MARGIN_MS   = 60_000; // refresh se expira em < 60s

/** Carrega o guard do card google_workspace conectado ao agente. */
export async function loadGoogleGuard(sb: any, agentId: string, tenantId: string): Promise<GoogleGuard> {
  const { data } = await sb.from('ia_agent_cards')
    .select('ia_cards(tipo, config, ativo)')
    .eq('agente_id', agentId);
  const card = (data ?? [])
    .map((r: any) => r.ia_cards)
    .find((c: any) => c?.tipo === 'google_workspace' && c?.ativo === true);
  if (!card) return { hasCard: false, scopes: [], accounts: [] };

  const cfgScopes: string[] = (card.config?.scopes ?? []) as string[];
  const scopes = cfgScopes.filter((s): s is GoogleScope => s in GOOGLE_SCOPES);

  // Lista contas conectadas para o tenant
  const { data: acc } = await sb.from('google_oauth_tokens')
    .select('google_account_email, scopes')
    .eq('tenant_id', tenantId);
  const accounts = (acc ?? []).map((a: any) => ({
    email:  a.google_account_email as string,
    scopes: (a.scopes ?? []) as string[],
  }));

  return { hasCard: true, scopes, accounts };
}

/** Garante que o agente pode usar este scope; retorna null (ok) ou string de erro. */
export function checkGoogleScope(guard: GoogleGuard, scope: GoogleScope): string | null {
  if (!guard.hasCard) return 'Card Google Workspace não conectado a este agente.';
  if (!guard.scopes.includes(scope)) {
    return `Escopo '${scope}' não está habilitado no card Google Workspace deste agente.`;
  }
  return null;
}

/** Resolve qual conta usar: se email passado, busca essa; senão usa a única conectada. */
export async function resolveAccount(
  sb: any, tenantId: string, email?: string,
): Promise<GoogleAccount | { erro: string }> {
  let q = sb.from('google_oauth_tokens')
    .select('google_account_email, access_token, refresh_token, expires_at, scopes')
    .eq('tenant_id', tenantId);
  if (email) q = q.eq('google_account_email', email);
  const { data, error } = await q.limit(2);
  if (error) return { erro: error.message };
  if (!data || data.length === 0) {
    return { erro: email
      ? `Conta Google '${email}' não conectada para este tenant.`
      : 'Nenhuma conta Google conectada. Conecte uma conta no card Google Workspace.' };
  }
  if (!email && data.length > 1) {
    const opts = data.map((d: any) => d.google_account_email).join(', ');
    return { erro: `Existem várias contas Google conectadas (${opts}). Informe 'account_email' explicitamente.` };
  }
  const row = data[0];
  return {
    email:         row.google_account_email,
    access_token:  row.access_token,
    refresh_token: row.refresh_token,
    expires_at:    row.expires_at,
    scopes:        row.scopes ?? [],
  };
}

/** Retorna um access_token válido, fazendo refresh se necessário. */
export async function getAccessToken(
  sb: any, tenantId: string, email?: string,
): Promise<{ token: string; email: string } | { erro: string }> {
  const acc = await resolveAccount(sb, tenantId, email);
  if ('erro' in acc) return acc;

  const expMs = new Date(acc.expires_at).getTime();
  if (expMs - Date.now() > REFRESH_MARGIN_MS) {
    return { token: acc.access_token, email: acc.email };
  }

  const clientId     = Deno.env.get('GOOGLE_CLIENT_ID')     ?? '';
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '';
  if (!clientId || !clientSecret) {
    return { erro: 'GOOGLE_CLIENT_ID/SECRET não configurados no servidor.' };
  }

  const body = new URLSearchParams({
    client_id:     clientId,
    client_secret: clientSecret,
    refresh_token: acc.refresh_token,
    grant_type:    'refresh_token',
  });
  const resp = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const j = await resp.json().catch(() => ({}));
  if (!resp.ok || !j.access_token) {
    return { erro: `Refresh Google falhou: HTTP ${resp.status} ${JSON.stringify(j).slice(0, 200)}` };
  }
  const newExpires = new Date(Date.now() + ((j.expires_in ?? 3600) * 1000)).toISOString();
  await sb.from('google_oauth_tokens').update({
    access_token: j.access_token,
    expires_at:   newExpires,
    updated_at:   new Date().toISOString(),
  }).eq('tenant_id', tenantId).eq('google_account_email', acc.email);

  return { token: j.access_token, email: acc.email };
}

/** Registra uma chamada de API Google em google_api_usage. */
export async function logUsage(
  sb: any,
  args: { tenantId: string; email: string; agentId: string; scope: GoogleScope;
          endpoint: string; statusCode?: number; durationMs?: number; error?: string },
): Promise<void> {
  try {
    await sb.from('google_api_usage').insert({
      tenant_id: args.tenantId, google_account_email: args.email,
      agent_id: args.agentId, scope: args.scope, endpoint: args.endpoint,
      status_code: args.statusCode ?? null, duration_ms: args.durationMs ?? null,
      error: args.error ?? null,
    });
  } catch { /* log de auditoria não pode quebrar tool */ }
}

/** Bloco para system prompt — lista scopes habilitados e contas disponíveis. */
export function buildGooglePromptSection(guard: GoogleGuard): string {
  if (!guard.hasCard) return '';
  if (guard.scopes.length === 0) {
    return `\n\n=== GOOGLE WORKSPACE ===\nCard conectado mas nenhum escopo habilitado. Nenhuma tool Google está disponível.`;
  }
  if (guard.accounts.length === 0) {
    return `\n\n=== GOOGLE WORKSPACE ===\nCard conectado (scopes: ${guard.scopes.join(', ')}), mas NENHUMA conta Google autenticada no momento. Peça ao gestor para conectar uma conta Google no painel do card.`;
  }
  const contas = guard.accounts.map(a => `• ${a.email}`).join('\n');
  return `\n\n=== GOOGLE WORKSPACE — SCOPES HABILITADOS ===\nScopes: ${guard.scopes.join(', ')}\n\nContas conectadas (passe account_email se houver mais de uma):\n${contas}\n\nFerramentas disponíveis (somente as compatíveis com os scopes acima):\n• google_calendar_list / google_calendar_create / google_calendar_update / google_calendar_delete (escopo: calendar)\n• google_sheets_read / google_sheets_write (escopo: sheets)\n• gmail_list / gmail_read (escopo: gmail_read)\n• gmail_send (escopo: gmail_send — CRIA APROVAÇÃO HUMANA, não envia direto)\n\nIMPORTANTE: gmail_send NUNCA envia direto. Cria um item em ia_pending_actions e retorna pending_id. Um gestor humano precisa aprovar.`;
}
