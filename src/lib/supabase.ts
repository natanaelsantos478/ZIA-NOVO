// ─────────────────────────────────────────────────────────────────────────────
// supabase.ts — Cliente Supabase com JWT dinâmico por request
//
// O cliente lê o JWT do sessionStorage em cada request via custom fetch.
// Isso elimina a dependência de live-binding ESM e funciona corretamente
// após page refresh, hot-reload e code-splitting do Vite.
//
// Fluxo:
//   Login  → setAuthToken(jwt) salva em sessionStorage
//   Logout → clearAuthToken() remove do sessionStorage
//   Cada request → fetch intercepta e adiciona Authorization: Bearer <jwt>
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL  || 'https://tgeomsnxfcqwrxijjvek.supabase.co';
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnZW9tc254ZmNxd3J4aWpqdmVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NDAxMjEsImV4cCI6MjA4ODExNjEyMX0.5c_DvW3KlTd1p75oMDXrRZNmggFrVUbwO9Dk0fqapD4';
const TOKEN_KEY = 'zia_auth_token_v1';

function jwtFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) return fetch(input, init);
  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

export const supabase = createClient(URL, KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { fetch: jwtFetch },
});

// Mantidos para compatibilidade — setAuthToken/clearAuthToken em auth.ts controlam o token
export function activateAuthToken(_token: string): void {}
export function deactivateAuthToken(): void {}
