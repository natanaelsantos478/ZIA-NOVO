const TOKEN_KEY   = 'zia_google_access_token'
const EXPIRY_KEY  = 'zia_google_token_expiry'
const EMAIL_KEY   = 'zia_google_user_email'

// ─── Armazenamento ────────────────────────────────────────────────────────────

export function getGoogleAccessToken(): string | null {
  const token  = sessionStorage.getItem(TOKEN_KEY)
  const expiry = sessionStorage.getItem(EXPIRY_KEY)
  if (!token || !expiry) return null
  if (Date.now() > parseInt(expiry)) { clearGoogleToken(); return null }
  return token
}

export function setGoogleToken(token: string, expiresIn: number, email?: string) {
  sessionStorage.setItem(TOKEN_KEY,  token)
  sessionStorage.setItem(EXPIRY_KEY, String(Date.now() + expiresIn * 1000))
  if (email) sessionStorage.setItem(EMAIL_KEY, email)
}

export function clearGoogleToken() {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(EXPIRY_KEY)
  sessionStorage.removeItem(EMAIL_KEY)
}

export function getGoogleUserEmail(): string | null {
  return sessionStorage.getItem(EMAIL_KEY)
}

// ─── PKCE ─────────────────────────────────────────────────────────────────────

function base64url(buffer: ArrayBuffer): string {
  let str = ''
  for (const b of new Uint8Array(buffer)) str += String.fromCharCode(b)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export function generateCodeVerifier(): string {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return base64url(arr.buffer)
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64url(digest)
}

// ─── Escopos ─────────────────────────────────────────────────────────────────

const SCOPES = [
  'openid', 'email', 'profile',
].join(' ')

// ─── Auth URL ────────────────────────────────────────────────────────────────

export async function buildAuthUrl(redirectUri: string): Promise<{ url: string; verifier: string }> {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!clientId) throw new Error('VITE_GOOGLE_CLIENT_ID não configurado')

  const verifier   = generateCodeVerifier()
  const challenge  = await generateCodeChallenge(verifier)

  const params = new URLSearchParams({
    client_id:             clientId,
    redirect_uri:          redirectUri,
    response_type:         'code',
    scope:                 SCOPES,
    code_challenge:        challenge,
    code_challenge_method: 'S256',
    access_type:           'offline',
    prompt:                'consent',
  })

  return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params}`, verifier }
}

// ─── Troca de código ─────────────────────────────────────────────────────────

export async function exchangeCode(
  code: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<{ access_token: string; expires_in: number; email?: string }> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://tgeomsnxfcqwrxijjvek.supabase.co'
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

  const res = await fetch(`${supabaseUrl}/functions/v1/google-token-exchange`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({ code, code_verifier: codeVerifier, redirect_uri: redirectUri }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }

  return await res.json()
}
