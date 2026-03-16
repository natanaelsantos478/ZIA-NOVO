// ─────────────────────────────────────────────────────────────────────────────
// supabase.ts — Cliente Supabase com suporte a JWT de autenticação ZIA
//
// Exporta `supabase` como `let` (ESM live-binding):
//   • Todos os módulos que importam `supabase` recebem automaticamente o cliente
//     atualizado quando `activateAuthToken()` ou `deactivateAuthToken()` são chamados.
//
// Fluxo:
//   Login  → activateAuthToken(jwt)  → cliente passa a enviar Authorization: Bearer <jwt>
//   Logout → deactivateAuthToken()   → volta ao cliente anônimo
// ─────────────────────────────────────────────────────────────────────────────
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL  || 'https://placeholder.supabase.co';
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('[ZIA] Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env para ativar o backend.');
}

const BASE_CONFIG = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
};

function newClient(token?: string): SupabaseClient {
  if (!token) return createClient(URL, KEY, BASE_CONFIG);
  return createClient(URL, KEY, {
    ...BASE_CONFIG,
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

// ESM live-binding: re-atribuir esta variável atualiza todos os importadores
export let supabase: SupabaseClient = newClient();

/**
 * Chamado após login bem-sucedido com a Edge Function zia-auth.
 * Substitui o cliente anônimo pelo cliente com o JWT assinado.
 * O JWT carrega claims de escopo que o RLS usa para isolar dados por tenant.
 */
export function activateAuthToken(token: string): void {
  supabase = newClient(token);
}

/**
 * Chamado no logout.
 * Reverte para o cliente anônimo — sem acesso a dados protegidos.
 */
export function deactivateAuthToken(): void {
  supabase = newClient();
}
