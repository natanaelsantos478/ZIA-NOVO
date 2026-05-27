// deno-lint-ignore-file no-explicit-any
// ─────────────────────────────────────────────────────────────────────────────
// google-oauth-callback — troca o code OAuth por tokens e upsert em google_oauth_tokens
//
// POST /functions/v1/google-oauth-callback
//   body: { code, redirect_uri, tenant_id }
//
// Retorna: { ok, email, scopes }
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GOOGLE_CLIENT_ID     = Deno.env.get('GOOGLE_CLIENT_ID')     ?? '';
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST')    return json({ ok: false, error: 'POST only' }, 405);

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return json({ ok: false, error: 'GOOGLE_CLIENT_ID/SECRET não configurados no servidor.' }, 500);
  }

  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, error: 'JSON inválido' }, 400); }
  const { code, redirect_uri, tenant_id } = body ?? {};
  if (!code || !redirect_uri || !tenant_id) {
    return json({ ok: false, error: 'code, redirect_uri e tenant_id são obrigatórios' }, 400);
  }

  // 1) Troca code → tokens
  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code, client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri, grant_type: 'authorization_code',
    }),
  });
  const tok = await tokenResp.json().catch(() => ({}));
  if (!tokenResp.ok || !tok.access_token) {
    return json({ ok: false, error: `Google token exchange falhou: ${JSON.stringify(tok).slice(0, 300)}` }, 400);
  }
  if (!tok.refresh_token) {
    return json({ ok: false, error: 'Google não retornou refresh_token. Use access_type=offline e prompt=consent no OAuth.' }, 400);
  }

  // 2) Busca dados do usuário
  const userResp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tok.access_token}` },
  });
  const userInfo = await userResp.json().catch(() => ({}));
  const email = userInfo.email as string | undefined;
  if (!email) return json({ ok: false, error: 'Não foi possível obter email da conta Google.' }, 400);

  const scopes = (tok.scope ?? '').split(' ').filter(Boolean);
  const expiresAt = new Date(Date.now() + ((tok.expires_in ?? 3600) * 1000)).toISOString();

  // 3) Upsert em google_oauth_tokens
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { error: upErr } = await sb.from('google_oauth_tokens').upsert({
    tenant_id, google_account_email: email, google_user_id: userInfo.id ?? null,
    access_token: tok.access_token, refresh_token: tok.refresh_token,
    scopes, expires_at: expiresAt, updated_at: new Date().toISOString(),
  }, { onConflict: 'tenant_id,google_account_email' });

  if (upErr) return json({ ok: false, error: `Erro ao salvar tokens: ${upErr.message}` }, 500);

  return json({ ok: true, email, scopes });
});
