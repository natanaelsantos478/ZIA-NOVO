// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-zita-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── CNPJ via BrasilAPI ────────────────────────────────────────────────────
async function handleCnpj(cnpj: string) {
  const cnpjLimpo = cnpj.replace(/\D/g, '');
  const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`BrasilAPI ${res.status}: ${err}`);
  }
  const data = await res.json();
  const socios = (data.qsa ?? []).map((s: any) => s.nome_socio ?? s.nome ?? '').filter(Boolean);
  const endereco = [data.logradouro, data.numero, data.complemento, data.bairro]
    .filter(Boolean).join(', ');
  return {
    cnpj: data.cnpj,
    razao_social: data.razao_social,
    nome_fantasia: data.nome_fantasia,
    situacao: data.descricao_situacao_cadastral,
    endereco,
    municipio: data.municipio,
    uf: data.uf,
    socios,
  };
}

// ─── Google Calendar ────────────────────────────────────────────────────────
async function handleGoogleCalendar(args: any) {
  const { operacao, access_token, data_inicio, data_fim, titulo, descricao, evento_id } = args;
  const base = 'https://www.googleapis.com/calendar/v3';
  const headers = { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' };

  if (operacao === 'listar_eventos') {
    const params = new URLSearchParams({
      timeMin: data_inicio ? new Date(data_inicio).toISOString() : new Date().toISOString(),
      timeMax: data_fim ? new Date(data_fim + 'T23:59:59').toISOString() : new Date(Date.now() + 7 * 86400000).toISOString(),
      singleEvents: 'true', orderBy: 'startTime', maxResults: '20',
    });
    const res = await fetch(`${base}/calendars/primary/events?${params}`, { headers });
    if (!res.ok) throw new Error(`Google Calendar ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return {
      eventos: (data.items ?? []).map((e: any) => ({
        id: e.id, titulo: e.summary,
        inicio: e.start?.dateTime ?? e.start?.date,
        fim: e.end?.dateTime ?? e.end?.date,
        descricao: e.description, local: e.location,
      })),
    };
  }

  if (operacao === 'criar_evento') {
    const body = {
      summary: titulo, description: descricao,
      start: { dateTime: new Date(data_inicio).toISOString(), timeZone: 'America/Sao_Paulo' },
      end: { dateTime: new Date(data_fim).toISOString(), timeZone: 'America/Sao_Paulo' },
    };
    const res = await fetch(`${base}/calendars/primary/events`, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`Google Calendar ${res.status}: ${await res.text()}`);
    return await res.json();
  }

  if (operacao === 'deletar_evento') {
    const res = await fetch(`${base}/calendars/primary/events/${evento_id}`, { method: 'DELETE', headers });
    if (!res.ok && res.status !== 204) throw new Error(`Google Calendar ${res.status}: ${await res.text()}`);
    return { deletado: true, evento_id };
  }

  throw new Error(`operacao inválida: ${operacao}`);
}

// ─── Google Sheets ──────────────────────────────────────────────────────────
async function handleGoogleSheets(args: any) {
  const { operacao, access_token, spreadsheet_id, range, valores } = args;
  const base = 'https://sheets.googleapis.com/v4/spreadsheets';
  const headers = { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' };

  if (operacao === 'listar_planilhas') {
    const res = await fetch(`${base}/${spreadsheet_id}?fields=sheets.properties`, { headers });
    if (!res.ok) throw new Error(`Google Sheets ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return { planilhas: (data.sheets ?? []).map((s: any) => s.properties?.title) };
  }

  if (operacao === 'ler_planilha') {
    const r = range || 'A1:Z1000';
    const res = await fetch(`${base}/${spreadsheet_id}/values/${encodeURIComponent(r)}`, { headers });
    if (!res.ok) throw new Error(`Google Sheets ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return { range: data.range, valores: data.values ?? [] };
  }

  if (operacao === 'escrever_celula') {
    const r = range || 'A1';
    const body = { range: r, majorDimension: 'ROWS', values: valores };
    const res = await fetch(`${base}/${spreadsheet_id}/values/${encodeURIComponent(r)}?valueInputOption=USER_ENTERED`, {
      method: 'PUT', headers, body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Google Sheets ${res.status}: ${await res.text()}`);
    return await res.json();
  }

  throw new Error(`operacao inválida: ${operacao}`);
}

// ─── Gmail ──────────────────────────────────────────────────────────────────
async function handleGmail(args: any) {
  const { operacao, access_token, email_id, destinatario, assunto, corpo, max_resultados = 10 } = args;
  const base = 'https://gmail.googleapis.com/gmail/v1/users/me';
  const headers = { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' };

  if (operacao === 'listar_emails') {
    const res = await fetch(`${base}/messages?maxResults=${max_resultados}&labelIds=INBOX`, { headers });
    if (!res.ok) throw new Error(`Gmail ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const emails = await Promise.all(
      (data.messages ?? []).slice(0, 5).map(async (m: any) => {
        const detail = await fetch(`${base}/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`, { headers });
        if (!detail.ok) return { id: m.id };
        const d = await detail.json();
        const hdrs = d.payload?.headers ?? [];
        return {
          id: m.id,
          de: hdrs.find((h: any) => h.name === 'From')?.value ?? '',
          assunto: hdrs.find((h: any) => h.name === 'Subject')?.value ?? '',
          data: hdrs.find((h: any) => h.name === 'Date')?.value ?? '',
          snippet: d.snippet ?? '',
        };
      })
    );
    return { emails, total: data.resultSizeEstimate };
  }

  if (operacao === 'ler_email') {
    const res = await fetch(`${base}/messages/${email_id}?format=full`, { headers });
    if (!res.ok) throw new Error(`Gmail ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const hdrs = data.payload?.headers ?? [];
    const body = data.payload?.parts?.[0]?.body?.data
      ? atob(data.payload.parts[0].body.data.replace(/-/g, '+').replace(/_/g, '/'))
      : data.snippet;
    return {
      id: email_id,
      de: hdrs.find((h: any) => h.name === 'From')?.value ?? '',
      para: hdrs.find((h: any) => h.name === 'To')?.value ?? '',
      assunto: hdrs.find((h: any) => h.name === 'Subject')?.value ?? '',
      data: hdrs.find((h: any) => h.name === 'Date')?.value ?? '',
      corpo: body,
    };
  }

  if (operacao === 'enviar_email') {
    const raw = btoa(`To: ${destinatario}\r\nSubject: ${assunto}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${corpo}`)
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const res = await fetch(`${base}/messages/send`, {
      method: 'POST', headers, body: JSON.stringify({ raw }),
    });
    if (!res.ok) throw new Error(`Gmail ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return { enviado: true, id: data.id };
  }

  throw new Error(`operacao inválida: ${operacao}`);
}

// ─── Handler principal ──────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  try {
    const body = await req.json();
    const { action } = body;

    let resultado: unknown;

    switch (action) {
      case 'cnpj':
        if (!body.cnpj) throw new Error('cnpj obrigatório');
        resultado = await handleCnpj(body.cnpj);
        break;
      case 'google_calendar':
        if (!body.access_token) throw new Error('access_token obrigatório para Google Calendar');
        resultado = await handleGoogleCalendar(body);
        break;
      case 'google_sheets':
        if (!body.access_token) throw new Error('access_token obrigatório para Google Sheets');
        resultado = await handleGoogleSheets(body);
        break;
      case 'gmail':
        if (!body.access_token) throw new Error('access_token obrigatório para Gmail');
        resultado = await handleGmail(body);
        break;
      default:
        throw new Error(`action inválida: ${action}`);
    }

    return new Response(JSON.stringify(resultado), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('[ia-utils] erro:', err);
    return new Response(JSON.stringify({ error: err.message ?? 'Erro interno' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
