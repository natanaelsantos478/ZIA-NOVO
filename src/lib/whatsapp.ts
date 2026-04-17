// ─────────────────────────────────────────────────────────────────────────────
// whatsapp.ts — Helpers para integração WhatsApp (Z-API e Twilio)
// Puxa credenciais de ia_api_keys (tenant-isolado) e expõe ler/listar/enviar.
// ─────────────────────────────────────────────────────────────────────────────
import { getApiKeys, type ApiKey } from './apiKeys';

export interface WhatsappChat {
  phone: string;
  name?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unread?: number;
}

export interface WhatsappMensagem {
  id: string;
  phone: string;
  fromMe: boolean;
  text: string;
  timestamp: string;
}

interface ZapiConfig {
  provider?: 'zapi' | 'twilio' | string;
  instanceUrl?: string;
  token?: string;
  accountSid?: string;
  authToken?: string;
  from?: string;
}

export async function getWhatsappKey(tenantIds: string[]): Promise<ApiKey | null> {
  if (tenantIds.length === 0) return null;
  try {
    const keys = await getApiKeys(tenantIds);
    return keys.find(k => k.integracao_tipo === 'whatsapp' && k.status === 'ativo') ?? null;
  } catch {
    return null;
  }
}

function getConfig(key: ApiKey): ZapiConfig {
  return (key.integracao_config ?? {}) as ZapiConfig;
}

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '');
}

// ── Listar conversas (Z-API) ──────────────────────────────────────────────────
export async function listarChats(key: ApiKey): Promise<WhatsappChat[]> {
  const cfg = getConfig(key);
  if (cfg.provider === 'twilio' || cfg.accountSid) return [];
  if (!cfg.instanceUrl || !cfg.token) return [];

  try {
    const r = await fetch(`${cfg.instanceUrl}/chats`, {
      headers: { 'Client-Token': cfg.token },
    });
    if (!r.ok) return [];
    const data = await r.json();
    const arr = Array.isArray(data) ? data : (data?.chats ?? []);
    return arr.map((c: Record<string, unknown>): WhatsappChat => ({
      phone: String(c.phone ?? c.number ?? c.id ?? ''),
      name: (c.name as string) ?? (c.contactName as string) ?? undefined,
      lastMessage: (c.lastMessageText as string) ?? (c.lastMessage as string) ?? undefined,
      lastMessageAt: (c.lastMessageTime as string) ?? (c.messageTime as string) ?? undefined,
      unread: typeof c.unread === 'number' ? c.unread : undefined,
    })).filter((c: WhatsappChat) => c.phone);
  } catch {
    return [];
  }
}

// ── Ler mensagens de um contato (Z-API) ───────────────────────────────────────
export async function lerMensagens(
  key: ApiKey,
  phone: string,
  limit = 20,
): Promise<WhatsappMensagem[]> {
  const cfg = getConfig(key);
  if (cfg.provider === 'twilio' || cfg.accountSid) return [];
  if (!cfg.instanceUrl || !cfg.token) return [];

  const clean = normalizePhone(phone);
  try {
    const r = await fetch(`${cfg.instanceUrl}/chat-messages/${clean}?amount=${limit}`, {
      headers: { 'Client-Token': cfg.token },
    });
    if (!r.ok) return [];
    const data = await r.json();
    const arr = Array.isArray(data) ? data : (data?.messages ?? []);
    return arr.map((m: Record<string, unknown>): WhatsappMensagem => ({
      id: String(m.messageId ?? m.id ?? crypto.randomUUID()),
      phone: String(m.phone ?? clean),
      fromMe: Boolean(m.fromMe ?? m.fromme ?? false),
      text: (m.text as string) ?? (m.body as string) ?? (m.caption as string) ?? '',
      timestamp: String(m.moment ?? m.timestamp ?? m.date ?? ''),
    }));
  } catch {
    return [];
  }
}

// ── Enviar mensagem (Z-API ou Twilio) ─────────────────────────────────────────
export async function enviarTexto(
  key: ApiKey,
  phone: string,
  message: string,
): Promise<{ ok: boolean; error?: string }> {
  const cfg = getConfig(key);
  const clean = normalizePhone(phone);

  try {
    if (cfg.provider === 'twilio' || cfg.accountSid) {
      const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`${cfg.accountSid}:${cfg.authToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: `whatsapp:${cfg.from}`,
          To: `whatsapp:+${clean}`,
          Body: message,
        }),
      });
      return { ok: r.ok, error: r.ok ? undefined : `HTTP ${r.status}` };
    }

    if (!cfg.instanceUrl || !cfg.token) return { ok: false, error: 'Z-API não configurada' };
    const r = await fetch(`${cfg.instanceUrl}/send-text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Client-Token': cfg.token },
      body: JSON.stringify({ phone: clean, message }),
    });
    return { ok: r.ok, error: r.ok ? undefined : `HTTP ${r.status}` };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// ── Busca textual local em conversas ──────────────────────────────────────────
export function filtrarChats(chats: WhatsappChat[], query: string): WhatsappChat[] {
  const q = query.toLowerCase().trim();
  if (!q) return chats;
  return chats.filter(c =>
    (c.name ?? '').toLowerCase().includes(q) ||
    c.phone.includes(q.replace(/\D/g, '')) ||
    (c.lastMessage ?? '').toLowerCase().includes(q),
  );
}
