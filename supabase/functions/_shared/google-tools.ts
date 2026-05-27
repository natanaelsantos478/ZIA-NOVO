// ─────────────────────────────────────────────────────────────────────────────
// google-tools.ts — Definição e execução das tools Google (compartilhado entre runners)
//
// 9 tools: calendar (4) + sheets (2) + gmail (3, send via aprovação humana).
// Roteamento: executeGoogleTool(name, params, ctx) → resultado.
// ─────────────────────────────────────────────────────────────────────────────

// deno-lint-ignore-file no-explicit-any

import { GoogleGuard, GoogleScope, checkGoogleScope, getAccessToken, logUsage } from './google.ts';

export interface GoogleToolCtx {
  sb:        any;
  tenantId:  string;
  agentId:   string;
  guard:     GoogleGuard;
}

export const GOOGLE_TOOL_NAMES = new Set([
  'google_calendar_list', 'google_calendar_create', 'google_calendar_update', 'google_calendar_delete',
  'google_sheets_read',   'google_sheets_write',
  'gmail_list',           'gmail_read',           'gmail_send',
  'aprovar_acao_pendente','listar_acoes_pendentes',
]);

export const GOOGLE_TOOLS_DEF = [
  // ── Calendar ────────────────────────────────────────────────────────────
  {
    name: 'google_calendar_list',
    description: 'Lista eventos do calendário principal (primary) do Google Calendar. Use para ver compromissos futuros, verificar disponibilidade ou confirmar reuniões.',
    parameters: { type: 'OBJECT', properties: {
      account_email: { type: 'STRING', description: 'Email da conta Google (obrigatório só se houver várias contas conectadas).' },
      time_min:      { type: 'STRING', description: 'ISO 8601 — limite inferior (padrão: agora).' },
      time_max:      { type: 'STRING', description: 'ISO 8601 — limite superior (padrão: +7 dias).' },
      limite:        { type: 'NUMBER', description: 'Máximo de eventos (padrão 20, máx 50).' },
    }, required: [] },
  },
  {
    name: 'google_calendar_create',
    description: 'Cria um novo evento no calendário principal do Google Calendar. Use para agendar reuniões, compromissos, lembretes.',
    parameters: { type: 'OBJECT', properties: {
      account_email: { type: 'STRING' },
      titulo:        { type: 'STRING', description: 'Título do evento.' },
      descricao:     { type: 'STRING', description: 'Descrição/agenda do evento.' },
      inicio:        { type: 'STRING', description: 'ISO 8601 com offset (ex: 2026-06-01T14:00:00-03:00).' },
      fim:           { type: 'STRING', description: 'ISO 8601 com offset.' },
      convidados:    { type: 'STRING', description: 'Emails de convidados separados por vírgula.' },
      local:         { type: 'STRING', description: 'Endereço ou link de reunião.' },
    }, required: ['titulo', 'inicio', 'fim'] },
  },
  {
    name: 'google_calendar_update',
    description: 'Atualiza um evento existente no calendário principal.',
    parameters: { type: 'OBJECT', properties: {
      account_email: { type: 'STRING' },
      event_id:      { type: 'STRING', description: 'ID do evento a atualizar.' },
      titulo:        { type: 'STRING' },
      descricao:     { type: 'STRING' },
      inicio:        { type: 'STRING' },
      fim:           { type: 'STRING' },
      local:         { type: 'STRING' },
    }, required: ['event_id'] },
  },
  {
    name: 'google_calendar_delete',
    description: 'Remove um evento do calendário principal.',
    parameters: { type: 'OBJECT', properties: {
      account_email: { type: 'STRING' },
      event_id:      { type: 'STRING' },
    }, required: ['event_id'] },
  },

  // ── Sheets ──────────────────────────────────────────────────────────────
  {
    name: 'google_sheets_read',
    description: 'Lê valores de uma planilha Google Sheets. Range no formato A1 (ex: "Sheet1!A1:C10").',
    parameters: { type: 'OBJECT', properties: {
      account_email: { type: 'STRING' },
      spreadsheet_id:{ type: 'STRING', description: 'ID da planilha (extraído da URL).' },
      range:         { type: 'STRING', description: 'Range A1 (ex: Página1!A1:D20).' },
    }, required: ['spreadsheet_id', 'range'] },
  },
  {
    name: 'google_sheets_write',
    description: 'Escreve valores em um range de uma planilha Google Sheets (sobrescreve).',
    parameters: { type: 'OBJECT', properties: {
      account_email: { type: 'STRING' },
      spreadsheet_id:{ type: 'STRING' },
      range:         { type: 'STRING', description: 'Range A1.' },
      valores:       { type: 'STRING', description: 'JSON 2D array (ex: [["a","b"],["c","d"]]).' },
    }, required: ['spreadsheet_id', 'range', 'valores'] },
  },

  // ── Gmail ────────────────────────────────────────────────────────────────
  {
    name: 'gmail_list',
    description: 'Lista emails do Gmail (read-only). Use query estilo Gmail (ex: "from:cliente@x.com is:unread").',
    parameters: { type: 'OBJECT', properties: {
      account_email: { type: 'STRING' },
      q:             { type: 'STRING', description: 'Query Gmail (ex: "is:unread from:x@y").' },
      limite:        { type: 'NUMBER', description: 'Máx mensagens (padrão 10).' },
    }, required: [] },
  },
  {
    name: 'gmail_read',
    description: 'Lê um email específico do Gmail pelo ID (retornado por gmail_list).',
    parameters: { type: 'OBJECT', properties: {
      account_email: { type: 'STRING' },
      message_id:    { type: 'STRING' },
    }, required: ['message_id'] },
  },
  {
    name: 'gmail_send',
    description: 'IMPORTANTE: NÃO envia direto. Cria uma AÇÃO PENDENTE de aprovação humana. Retorna pending_id; um gestor precisa aprovar via UI antes do email ser enviado.',
    parameters: { type: 'OBJECT', properties: {
      account_email: { type: 'STRING' },
      to:            { type: 'STRING', description: 'Email do destinatário.' },
      subject:       { type: 'STRING' },
      body:          { type: 'STRING', description: 'Corpo do email (texto puro).' },
      cc:            { type: 'STRING', description: 'CCs separados por vírgula.' },
    }, required: ['to', 'subject', 'body'] },
  },

  // ── Aprovação humana ─────────────────────────────────────────────────────
  {
    name: 'listar_acoes_pendentes',
    description: 'Lista ações do agente pendentes de aprovação humana (ex: emails aguardando envio).',
    parameters: { type: 'OBJECT', properties: {
      limite: { type: 'NUMBER', description: 'Máx itens (padrão 20).' },
    }, required: [] },
  },
];

/** Roteia a execução de qualquer tool google_* ou aprovar/listar_pending. */
export async function executeGoogleTool(
  name: string,
  params: Record<string, unknown>,
  ctx: GoogleToolCtx,
): Promise<unknown> {
  // listar_acoes_pendentes não exige card Google
  if (name === 'listar_acoes_pendentes') {
    const limite = Number((params as any).limite ?? 20);
    const { data } = await ctx.sb.from('ia_pending_actions')
      .select('id, acao_tipo, resumo, status, payload, created_at')
      .eq('tenant_id', ctx.tenantId).eq('agent_id', ctx.agentId)
      .order('created_at', { ascending: false }).limit(limite);
    return { itens: data ?? [], total: (data ?? []).length };
  }

  const scopeMap: Record<string, GoogleScope> = {
    google_calendar_list:   'calendar', google_calendar_create: 'calendar',
    google_calendar_update: 'calendar', google_calendar_delete: 'calendar',
    google_sheets_read:     'sheets',   google_sheets_write:    'sheets',
    gmail_list:             'gmail_read', gmail_read:           'gmail_read',
    gmail_send:             'gmail_send',
  };
  const scope = scopeMap[name];
  if (!scope) return { erro: `Tool Google desconhecida: ${name}` };

  const block = checkGoogleScope(ctx.guard, scope);
  if (block) return { erro: block };

  // gmail_send NUNCA chama API direto — cria pending_action
  if (name === 'gmail_send') {
    const p = params as any;
    const resumo = `Enviar email para ${p.to} — assunto: "${String(p.subject ?? '').slice(0, 80)}"`;
    const { data, error } = await ctx.sb.from('ia_pending_actions').insert({
      tenant_id: ctx.tenantId, agent_id: ctx.agentId,
      acao_tipo: 'gmail_send',
      payload: { account_email: p.account_email ?? null, to: p.to, cc: p.cc ?? null, subject: p.subject, body: p.body },
      resumo, status: 'pendente',
    }).select('id').single();
    if (error) return { erro: error.message };
    return {
      criado: true, status: 'aguardando_aprovacao', pending_id: data.id,
      mensagem: 'Email enfileirado para aprovação humana. Gestor precisa aprovar antes do envio efetivo.',
    };
  }

  // Demais tools: chama Google API
  const accountEmail = (params as any).account_email as string | undefined;
  const tokRes = await getAccessToken(ctx.sb, ctx.tenantId, accountEmail);
  if ('erro' in tokRes) return tokRes;
  const { token, email } = tokRes;

  const t0 = Date.now();
  let statusCode: number | undefined;
  let errMsg: string | undefined;
  let endpoint = name;

  try {
    let result: unknown;
    switch (name) {
      case 'google_calendar_list': {
        const p = params as any;
        const timeMin = p.time_min ?? new Date().toISOString();
        const timeMax = p.time_max ?? new Date(Date.now() + 7 * 86_400_000).toISOString();
        const limite  = Math.min(Number(p.limite ?? 20), 50);
        const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&maxResults=${limite}`;
        const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        statusCode = r.status; endpoint = 'events.list';
        const j = await r.json();
        if (!r.ok) throw new Error(JSON.stringify(j).slice(0, 300));
        result = { eventos: (j.items ?? []).map((e: any) => ({
          id: e.id, summary: e.summary, start: e.start, end: e.end, location: e.location, attendees: e.attendees?.map((a: any) => a.email),
        })) };
        break;
      }
      case 'google_calendar_create': {
        const p = params as any;
        const body: any = {
          summary: p.titulo, description: p.descricao,
          start: { dateTime: p.inicio }, end: { dateTime: p.fim },
        };
        if (p.local)      body.location  = p.local;
        if (p.convidados) body.attendees = String(p.convidados).split(',').map(e => ({ email: e.trim() })).filter(a => a.email);
        const r = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        statusCode = r.status; endpoint = 'events.insert';
        const j = await r.json();
        if (!r.ok) throw new Error(JSON.stringify(j).slice(0, 300));
        result = { criado: true, event_id: j.id, htmlLink: j.htmlLink };
        break;
      }
      case 'google_calendar_update': {
        const p = params as any;
        const body: any = {};
        if (p.titulo)    body.summary     = p.titulo;
        if (p.descricao) body.description = p.descricao;
        if (p.inicio)    body.start       = { dateTime: p.inicio };
        if (p.fim)       body.end         = { dateTime: p.fim };
        if (p.local)     body.location    = p.local;
        const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(p.event_id)}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        statusCode = r.status; endpoint = 'events.patch';
        const j = await r.json();
        if (!r.ok) throw new Error(JSON.stringify(j).slice(0, 300));
        result = { atualizado: true, event_id: j.id };
        break;
      }
      case 'google_calendar_delete': {
        const p = params as any;
        const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(p.event_id)}`, {
          method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
        });
        statusCode = r.status; endpoint = 'events.delete';
        if (!r.ok && r.status !== 410) throw new Error(`HTTP ${r.status}`);
        result = { removido: true };
        break;
      }
      case 'google_sheets_read': {
        const p = params as any;
        const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(p.spreadsheet_id)}/values/${encodeURIComponent(p.range)}`,
          { headers: { Authorization: `Bearer ${token}` } });
        statusCode = r.status; endpoint = 'values.get';
        const j = await r.json();
        if (!r.ok) throw new Error(JSON.stringify(j).slice(0, 300));
        const raw = JSON.stringify(j.values ?? []);
        result = { range: j.range, valores: raw.length > 4096 ? raw.slice(0, 4096) + '…[truncado]' : (j.values ?? []) };
        break;
      }
      case 'google_sheets_write': {
        const p = params as any;
        let parsed: unknown[][] = [];
        try { parsed = typeof p.valores === 'string' ? JSON.parse(p.valores) : p.valores; }
        catch { return { erro: 'valores precisa ser JSON 2D array válido.' }; }
        const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(p.spreadsheet_id)}/values/${encodeURIComponent(p.range)}?valueInputOption=USER_ENTERED`,
          {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ range: p.range, values: parsed }),
          });
        statusCode = r.status; endpoint = 'values.update';
        const j = await r.json();
        if (!r.ok) throw new Error(JSON.stringify(j).slice(0, 300));
        result = { atualizado: true, cells: j.updatedCells, range: j.updatedRange };
        break;
      }
      case 'gmail_list': {
        const p = params as any;
        const limite = Math.min(Number(p.limite ?? 10), 25);
        const qs = new URLSearchParams({ maxResults: String(limite) });
        if (p.q) qs.set('q', p.q);
        const r = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${qs}`,
          { headers: { Authorization: `Bearer ${token}` } });
        statusCode = r.status; endpoint = 'messages.list';
        const j = await r.json();
        if (!r.ok) throw new Error(JSON.stringify(j).slice(0, 300));
        result = { mensagens: j.messages ?? [], total: (j.messages ?? []).length };
        break;
      }
      case 'gmail_read': {
        const p = params as any;
        const r = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(p.message_id)}?format=full`,
          { headers: { Authorization: `Bearer ${token}` } });
        statusCode = r.status; endpoint = 'messages.get';
        const j = await r.json();
        if (!r.ok) throw new Error(JSON.stringify(j).slice(0, 300));
        const headers: Record<string, string> = {};
        for (const h of (j.payload?.headers ?? [])) headers[h.name] = h.value;
        // Extrai body (texto plano simples)
        let body = '';
        const walk = (p: any) => {
          if (!p) return;
          if (p.mimeType === 'text/plain' && p.body?.data) {
            body += atob(p.body.data.replace(/-/g, '+').replace(/_/g, '/'));
          }
          (p.parts ?? []).forEach(walk);
        };
        walk(j.payload);
        result = {
          id: j.id, snippet: j.snippet,
          from: headers.From, to: headers.To, subject: headers.Subject, date: headers.Date,
          body: body.length > 4096 ? body.slice(0, 4096) + '…[truncado]' : body,
        };
        break;
      }
      default:
        return { erro: `Tool não implementada: ${name}` };
    }

    await logUsage(ctx.sb, {
      tenantId: ctx.tenantId, email, agentId: ctx.agentId, scope, endpoint,
      statusCode, durationMs: Date.now() - t0,
    });
    return result;
  } catch (e) {
    errMsg = String(e);
    await logUsage(ctx.sb, {
      tenantId: ctx.tenantId, email, agentId: ctx.agentId, scope, endpoint,
      statusCode, durationMs: Date.now() - t0, error: errMsg,
    });
    return { erro: errMsg };
  }
}
