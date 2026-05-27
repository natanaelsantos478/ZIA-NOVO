// deno-lint-ignore-file no-explicit-any
// ─────────────────────────────────────────────────────────────────────────────
// ia-pending-action-execute — Executa uma ação pendente após aprovação humana
//
// POST /functions/v1/ia-pending-action-execute
//   body: { pending_id, aprovado_por }
//
// Lê o item em ia_pending_actions, executa de acordo com acao_tipo
// (gmail_send hoje), atualiza status. Validação de tenant é feita pelo RLS
// quando chamado com JWT do operator; com service_role assumimos que a UI
// já validou.
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getAccessToken, logUsage } from '../_shared/google.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization',
};
const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function makeRfc822(p: { from: string; to: string; subject: string; body: string; cc?: string | null }): string {
  const lines = [
    `From: ${p.from}`,
    `To: ${p.to}`,
    p.cc ? `Cc: ${p.cc}` : null,
    `Subject: ${p.subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    p.body,
  ].filter(Boolean) as string[];
  return lines.join('\r\n');
}

function base64url(s: string): string {
  return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST')    return json({ ok: false, error: 'POST only' }, 405);

  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, error: 'JSON inválido' }, 400); }
  const { pending_id, aprovado_por } = body ?? {};
  if (!pending_id) return json({ ok: false, error: 'pending_id obrigatório' }, 400);

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: pa, error: paErr } = await sb.from('ia_pending_actions')
    .select('id, tenant_id, agent_id, acao_tipo, payload, status')
    .eq('id', pending_id).maybeSingle();
  if (paErr || !pa) return json({ ok: false, error: 'Ação pendente não encontrada.' }, 404);
  if (pa.status !== 'pendente' && pa.status !== 'aprovado') {
    return json({ ok: false, error: `Ação já está em status '${pa.status}'.` }, 409);
  }

  // Marca como aprovado antes de executar
  await sb.from('ia_pending_actions').update({
    status: 'aprovado', aprovado_por: aprovado_por ?? null, aprovado_em: new Date().toISOString(),
  }).eq('id', pending_id);

  let resultado: unknown;
  let novoStatus: 'executado' | 'erro' = 'executado';

  try {
    switch (pa.acao_tipo) {
      case 'gmail_send': {
        const p = pa.payload as any;
        const tokRes = await getAccessToken(sb, pa.tenant_id, p.account_email ?? undefined);
        if ('erro' in tokRes) throw new Error(tokRes.erro);
        const rfc = makeRfc822({ from: tokRes.email, to: p.to, subject: p.subject, body: p.body, cc: p.cc });
        const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
          method: 'POST',
          headers: { Authorization: `Bearer ${tokRes.token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ raw: base64url(rfc) }),
        });
        const j = await r.json();
        await logUsage(sb, {
          tenantId: pa.tenant_id, email: tokRes.email, agentId: pa.agent_id,
          scope: 'gmail_send', endpoint: 'messages.send', statusCode: r.status,
        });
        if (!r.ok) throw new Error(JSON.stringify(j).slice(0, 300));
        resultado = { enviado: true, message_id: j.id, threadId: j.threadId };
        break;
      }
      default:
        throw new Error(`Tipo de ação não suportado: ${pa.acao_tipo}`);
    }
  } catch (e) {
    novoStatus = 'erro';
    resultado = { erro: String(e) };
  }

  await sb.from('ia_pending_actions').update({
    status: novoStatus, resultado, executado_em: new Date().toISOString(),
  }).eq('id', pending_id);

  return json({ ok: novoStatus === 'executado', status: novoStatus, resultado });
});
