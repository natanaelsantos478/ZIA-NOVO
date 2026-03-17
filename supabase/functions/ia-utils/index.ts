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

// ─── Google Docs ─────────────────────────────────────────────────────────────
async function handleGoogleDocs(args: any) {
  const { operacao, access_token, document_id, titulo, conteudo } = args;
  const base = 'https://docs.googleapis.com/v1/documents';
  const headers = { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' };

  if (operacao === 'ler_documento') {
    const res = await fetch(`${base}/${document_id}`, { headers });
    if (!res.ok) throw new Error(`Google Docs ${res.status}: ${await res.text()}`);
    const data = await res.json();
    // Extrair texto dos paragrafos
    const texto = (data.body?.content ?? [])
      .flatMap((b: any) => b.paragraph?.elements ?? [])
      .map((e: any) => e.textRun?.content ?? '')
      .join('');
    return { document_id: data.documentId, titulo: data.title, texto };
  }

  if (operacao === 'criar_documento') {
    // Criar documento
    const res = await fetch(base, {
      method: 'POST', headers, body: JSON.stringify({ title: titulo ?? 'Novo Documento' }),
    });
    if (!res.ok) throw new Error(`Google Docs ${res.status}: ${await res.text()}`);
    const doc = await res.json();
    // Inserir conteúdo se fornecido
    if (conteudo) {
      const reqRes = await fetch(`${base}/${doc.documentId}:batchUpdate`, {
        method: 'POST', headers,
        body: JSON.stringify({
          requests: [{ insertText: { location: { index: 1 }, text: conteudo } }],
        }),
      });
      if (!reqRes.ok) throw new Error(`Google Docs batchUpdate ${reqRes.status}: ${await reqRes.text()}`);
    }
    return { criado: true, document_id: doc.documentId, titulo: doc.title };
  }

  if (operacao === 'editar_documento') {
    const res = await fetch(`${base}/${document_id}:batchUpdate`, {
      method: 'POST', headers,
      body: JSON.stringify({
        requests: [{ insertText: { location: { index: 1 }, text: conteudo ?? '' } }],
      }),
    });
    if (!res.ok) throw new Error(`Google Docs ${res.status}: ${await res.text()}`);
    return { editado: true, document_id };
  }

  throw new Error(`operacao inválida: ${operacao}`);
}

// ─── Google Slides ───────────────────────────────────────────────────────────
async function handleGoogleSlides(args: any) {
  const { operacao, access_token, presentation_id, titulo, slides } = args;
  const base = 'https://slides.googleapis.com/v1/presentations';
  const headers = { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' };

  if (operacao === 'ler_apresentacao') {
    const res = await fetch(`${base}/${presentation_id}`, { headers });
    if (!res.ok) throw new Error(`Google Slides ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const slidesResumo = (data.slides ?? []).map((s: any, i: number) => {
      const textos = (s.pageElements ?? [])
        .flatMap((el: any) => el.shape?.text?.textElements ?? [])
        .map((te: any) => te.textRun?.content ?? '')
        .join('').trim();
      return { indice: i + 1, id: s.objectId, texto: textos };
    });
    return { presentation_id: data.presentationId, titulo: data.title, slides: slidesResumo };
  }

  if (operacao === 'criar_apresentacao') {
    const res = await fetch(base, {
      method: 'POST', headers, body: JSON.stringify({ title: titulo ?? 'Nova Apresentação' }),
    });
    if (!res.ok) throw new Error(`Google Slides ${res.status}: ${await res.text()}`);
    const pres = await res.json();

    // Adicionar slides se fornecidos
    if (slides && slides.length > 0) {
      const requests = slides.flatMap((slide: any) => [
        { createSlide: { slideLayoutReference: { predefinedLayout: 'TITLE_AND_BODY' } } },
      ]);
      await fetch(`${base}/${pres.presentationId}:batchUpdate`, {
        method: 'POST', headers, body: JSON.stringify({ requests }),
      });
    }
    return { criado: true, presentation_id: pres.presentationId, titulo: pres.title };
  }

  if (operacao === 'adicionar_slide') {
    const requests = (slides ?? []).map(() => ({
      createSlide: { slideLayoutReference: { predefinedLayout: 'TITLE_AND_BODY' } },
    }));
    const res = await fetch(`${base}/${presentation_id}:batchUpdate`, {
      method: 'POST', headers, body: JSON.stringify({ requests }),
    });
    if (!res.ok) throw new Error(`Google Slides ${res.status}: ${await res.text()}`);
    return { adicionado: true, presentation_id };
  }

  throw new Error(`operacao inválida: ${operacao}`);
}

// ─── Cloud Vision ────────────────────────────────────────────────────────────
async function handleCloudVision(args: any) {
  const { operacao, image_base64, image_url } = args;
  const API_KEY = Deno.env.get('GEMINI_API_KEY');

  const features_map: Record<string, any[]> = {
    detectar_texto:    [{ type: 'TEXT_DETECTION' }],
    ler_documento_ocr: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
    detectar_objetos:  [{ type: 'LABEL_DETECTION' }, { type: 'OBJECT_LOCALIZATION' }],
    detectar_logos:    [{ type: 'LOGO_DETECTION' }],
  };

  const image = image_base64
    ? { content: image_base64 }
    : { source: { imageUri: image_url } };

  const res = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{ image, features: features_map[operacao] ?? [{ type: 'TEXT_DETECTION' }] }],
      }),
    }
  );
  if (!res.ok) throw new Error(`Cloud Vision ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const resp = data.responses?.[0];
  return {
    texto_completo: resp?.fullTextAnnotation?.text ?? resp?.textAnnotations?.[0]?.description ?? '',
    objetos: (resp?.labelAnnotations ?? []).map((l: any) => ({ descricao: l.description, confianca: l.score })),
    logos: (resp?.logoAnnotations ?? []).map((l: any) => ({ descricao: l.description, confianca: l.score })),
  };
}

// ─── Google People ───────────────────────────────────────────────────────────
async function handleGooglePeople(args: any) {
  const { operacao, access_token, query, max_resultados = 20 } = args;
  const headers = { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' };

  if (operacao === 'listar_contatos') {
    const params = new URLSearchParams({
      personFields: 'names,emailAddresses,phoneNumbers',
      pageSize: String(Math.min(max_resultados, 100)),
    });
    const res = await fetch(`https://people.googleapis.com/v1/people/me/connections?${params}`, { headers });
    if (!res.ok) throw new Error(`Google People ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return {
      contatos: (data.connections ?? []).map((c: any) => ({
        nome: c.names?.[0]?.displayName ?? '',
        email: c.emailAddresses?.[0]?.value ?? '',
        telefone: c.phoneNumbers?.[0]?.value ?? '',
      })),
    };
  }

  if (operacao === 'buscar_contato') {
    const params = new URLSearchParams({
      query: query ?? '',
      readMask: 'names,emailAddresses,phoneNumbers',
      pageSize: String(Math.min(max_resultados, 30)),
    });
    const res = await fetch(`https://people.googleapis.com/v1/people:searchContacts?${params}`, { headers });
    if (!res.ok) throw new Error(`Google People ${res.status}: ${await res.text()}`);
    const data = await res.json();
    return {
      contatos: (data.results ?? []).map((r: any) => ({
        nome: r.person?.names?.[0]?.displayName ?? '',
        email: r.person?.emailAddresses?.[0]?.value ?? '',
        telefone: r.person?.phoneNumbers?.[0]?.value ?? '',
      })),
    };
  }

  throw new Error(`operacao inválida: ${operacao}`);
}

// ─── Google Maps ─────────────────────────────────────────────────────────────
async function handleGoogleMaps(args: any) {
  const { operacao, origem, destino, endereco, modo = 'DRIVE', multiplos_destinos } = args;
  const API_KEY = Deno.env.get('GEMINI_API_KEY');

  if (operacao === 'calcular_rota' || operacao === 'calcular_distancia_multiplos') {
    const destinos = multiplos_destinos ?? (destino ? [destino] : []);
    const results = await Promise.all(destinos.map(async (dest: string) => {
      const res = await fetch(
        `https://routes.googleapis.com/directions/v2:computeRoutes?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters' },
          body: JSON.stringify({
            origin: { address: origem },
            destination: { address: dest },
            travelMode: modo,
            languageCode: 'pt-BR',
          }),
        }
      );
      if (!res.ok) return { destino: dest, erro: `Routes API ${res.status}` };
      const data = await res.json();
      const route = data.routes?.[0];
      return {
        destino: dest,
        distancia_km: route ? (route.distanceMeters / 1000).toFixed(1) : null,
        duracao_min: route ? Math.round(parseInt(route.duration ?? '0') / 60) : null,
      };
    }));
    return multiplos_destinos ? { rotas: results } : results[0];
  }

  if (operacao === 'geocodificar' || operacao === 'buscar_local') {
    const query = endereco ?? origem ?? '';
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&language=pt-BR&key=${API_KEY}`
    );
    if (!res.ok) throw new Error(`Geocoding ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const result = data.results?.[0];
    return {
      endereco_formatado: result?.formatted_address ?? '',
      lat: result?.geometry?.location?.lat,
      lng: result?.geometry?.location?.lng,
    };
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
      case 'google_docs':
        if (!body.access_token) throw new Error('access_token obrigatório para Google Docs');
        resultado = await handleGoogleDocs(body);
        break;
      case 'google_slides':
        if (!body.access_token) throw new Error('access_token obrigatório para Google Slides');
        resultado = await handleGoogleSlides(body);
        break;
      case 'cloud_vision':
        resultado = await handleCloudVision(body);
        break;
      case 'google_people':
        if (!body.access_token) throw new Error('access_token obrigatório para Google People');
        resultado = await handleGooglePeople(body);
        break;
      case 'google_maps':
        resultado = await handleGoogleMaps(body);
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
