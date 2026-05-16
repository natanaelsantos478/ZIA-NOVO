// ─────────────────────────────────────────────────────────────────────────────
// Edge Function: zia-auth
// Valida credenciais (code + password) e emite um JWT assinado com o secret
// do projeto Supabase. O JWT carrega claims de escopo (scope_ids) e flag de
// admin (is_admin) que as policies RLS usam para isolar dados por tenant.
//
// Variáveis de ambiente necessárias (configurar em Supabase Dashboard > Settings > Edge Functions):
//   SUPABASE_URL              — injetado automaticamente
//   SUPABASE_SERVICE_ROLE_KEY — injetado automaticamente
//   ZIA_JWT_SECRET            — Legacy JWT Secret copiado de Settings > JWT Keys.
//                               Não pode ser SUPABASE_JWT_SECRET pois o prefixo
//                               SUPABASE_ é reservado e bloqueado para secrets customizadas.
//                               Dívida técnica: migrar para ES256 com chave própria,
//                               ou trocar zia-auth pelo auth nativo do Supabase.
//   ZIA_ADMIN_CODE            — código do admin (ex: "00000")
//   ZIA_ADMIN_PASS            — senha do admin (ex: "ZITA084620")
// ─────────────────────────────────────────────────────────────────────────────
import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

function buildCors(origin: string | null): Record<string, string> {
  const allowed = Deno.env.get('ALLOWED_ORIGINS');
  const h: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  if (!allowed) { h['Access-Control-Allow-Origin'] = '*'; return h; }
  const list = allowed.split(',').map(s => s.trim());
  h['Access-Control-Allow-Origin'] = list.includes(origin ?? '') ? origin! : list[0];
  h['Vary'] = 'Origin';
  return h;
}

// ── Rate limiting em memória (por IP — resets com cold start da função) ────────
const RATE_LIMIT_MAX    = 5;    // tentativas por janela
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutos em ms
const attempts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now  = Date.now();
  const entry = attempts.get(ip);
  if (!entry || entry.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

function clearRateLimit(ip: string): void {
  attempts.delete(ip);
}

// ── JWT signing (HMAC-SHA256 — mesmo algoritmo do Supabase) ──────────────────

async function signJwt(payload: Record<string, unknown>, secret: string): Promise<string> {
  const b64url = (v: unknown) =>
    btoa(JSON.stringify(v)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const header = b64url({ alg: 'HS256', typ: 'JWT' });
  const body   = b64url(payload);
  const data   = `${header}.${body}`;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${data}.${sigB64}`;
}

function nowSec() { return Math.floor(Date.now() / 1000); }

function makeToken(
  sub: string,
  appMeta: Record<string, unknown>,
  secret: string,
): Promise<string> {
  return signJwt({
    role: 'authenticated',
    aud:  'authenticated',
    iss:  'supabase',
    ref:  'tgeomsnxfcqwrxijjvek',
    iat:  nowSec(),
    exp:  nowSec() + 8 * 3600, // 8 horas
    sub,
    app_metadata: appMeta,
  }, secret);
}

// ── Helpers de escopo ─────────────────────────────────────────────────────────

type DB = ReturnType<typeof createClient>;

async function computeScopeIds(db: DB, entityType: string, entityId: string): Promise<string[]> {
  if (entityType === 'holding') {
    const { data: matrices } = await db
      .from('zia_companies').select('id').eq('parent_id', entityId).eq('type', 'matrix');
    const matrixIds = (matrices ?? []).map((m: { id: string }) => m.id);
    let branchIds: string[] = [];
    if (matrixIds.length > 0) {
      const { data: branches } = await db
        .from('zia_companies').select('id').in('parent_id', matrixIds).eq('type', 'branch');
      branchIds = (branches ?? []).map((b: { id: string }) => b.id);
    }
    return [entityId, ...matrixIds, ...branchIds];
  }
  if (entityType === 'matrix') {
    const { data: branches } = await db
      .from('zia_companies').select('id').eq('parent_id', entityId).eq('type', 'branch');
    return [entityId, ...(branches ?? []).map((b: { id: string }) => b.id)];
  }
  return [entityId];
}

async function resolveHoldingId(db: DB, entityType: string, entityId: string): Promise<string> {
  if (entityType === 'holding') return entityId;
  const { data: co } = await db
    .from('zia_companies').select('parent_id, type').eq('id', entityId).single();
  if (!co) return entityId;
  if (co.type === 'matrix') return co.parent_id ?? entityId;
  const { data: mx } = await db
    .from('zia_companies').select('parent_id').eq('id', co.parent_id).single();
  return mx?.parent_id ?? entityId;
}

// ── Handler principal ────────────────────────────────────────────────────────

function makeJson(cors: Record<string, string>) {
  return (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  const CORS = buildCors(req.headers.get('Origin'));
  const json = makeJson(CORS);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    // ── Rate limiting por IP ─────────────────────────────────────────────────
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
             ?? req.headers.get('cf-connecting-ip')
             ?? 'unknown';
    if (!checkRateLimit(ip)) {
      return json({ error: 'Muitas tentativas. Aguarde 15 minutos e tente novamente.' }, 429);
    }

    const body = await req.json() as { code: string; password: string };
    const { code, password } = body;
    console.log('[zia-auth] step=parse code=', code);

    const jwtSecret  = Deno.env.get('ZIA_JWT_SECRET');
    if (!jwtSecret) {
      return json({ error: 'Servidor mal configurado: ZIA_JWT_SECRET ausente.' }, 500);
    };
    const adminCode  = Deno.env.get('ZIA_ADMIN_CODE') ?? '00000';
    const adminPass  = Deno.env.get('ZIA_ADMIN_PASS');
    console.log('[zia-auth] step=env jwtSecret_len=', jwtSecret?.length ?? 'MISSING');

    // ── Admin ZIA ─────────────────────────────────────────────────────────────
    if (code === adminCode) {
      // Recusa se a senha de admin não estiver configurada no ambiente
      if (!adminPass) return json({ error: 'Servidor mal configurado. Contate o suporte.' }, 500);
      if (password !== adminPass) return json({ error: 'Código ou senha inválidos.' }, 401);
      clearRateLimit(ip);
      const token = await makeToken('admin', { is_admin: true, scope_ids: [], profile_id: 'admin' }, jwtSecret);
      return json({ token, is_admin: true });
    }

    // ── Operador regular ─────────────────────────────────────────────────────
    const db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const normalized = code.padStart(5, '0');
    const { data: rows } = await db
      .from('zia_operator_profiles')
      .select('*')
      .or(`code.eq.${code},code.eq.${normalized}`)
      .eq('active', true)
      .limit(1);

    const profile = rows?.[0];
    console.log('[zia-auth] step=profile found=', !!profile);
    // Mensagem genérica — não revela se o código existe ou não (evita user enumeration)
    if (!profile) return json({ error: 'Código ou senha inválidos.' }, 401);

    const validPassword = profile.password ? password === profile.password : true;
    console.log('[zia-auth] step=password valid=', validPassword);
    if (!validPassword) return json({ error: 'Código ou senha inválidos.' }, 401);

    clearRateLimit(ip);

    console.log('[zia-auth] step=computeScope entity_type=', profile.entity_type);
    const scopeIds  = await computeScopeIds(db, profile.entity_type, profile.entity_id);
    console.log('[zia-auth] step=scope_ids=', JSON.stringify(scopeIds));
    const holdingId = await resolveHoldingId(db, profile.entity_type, profile.entity_id);
    console.log('[zia-auth] step=makeToken');

    const token = await makeToken(profile.id, {
      is_admin:    false,
      scope_ids:   scopeIds,
      profile_id:  profile.id,
      holding_id:  holdingId,
      entity_id:   profile.entity_id,
      entity_type: profile.entity_type,
    }, jwtSecret);

    return json({ token, profile, scope_ids: scopeIds, is_admin: false });

  } catch (err) {
    const msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    console.error('[zia-auth] CRASH:', msg);
    return json({ error: 'Erro interno.', _debug: msg }, 500);
  }
});
