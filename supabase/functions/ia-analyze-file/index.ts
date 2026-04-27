// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

function buildCors(origin: string | null): Record<string, string> {
  const allowed = Deno.env.get('ALLOWED_ORIGINS');
  const h: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-zita-token',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
  if (!allowed) { h['Access-Control-Allow-Origin'] = '*'; return h; }
  const list = allowed.split(',').map(s => s.trim());
  h['Access-Control-Allow-Origin'] = list.includes(origin ?? '') ? origin! : list[0];
  h['Vary'] = 'Origin';
  return h;
}

// Pro para PDFs/XLSX/DOCX complexos; Flash para tipos simples (imagens, CSV)
const GEMINI_PRO_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const GEMINI_FLASH_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent';
const SIMPLE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'text/csv', 'text/plain', 'application/json'];

async function toBase64(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

Deno.serve(async (req: Request) => {
  const CORS = buildCors(req.headers.get('Origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  try {
    const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_KEY) throw new Error('GEMINI_API_KEY não configurada');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    const { arquivo_id, instrucao, tenant_id } = await req.json();
    if (!arquivo_id) throw new Error('arquivo_id obrigatório');

    const { data: arquivo, error: dbErr } = await supabase
      .from('ia_arquivos').select('*').eq('id', arquivo_id).single();

    if (dbErr || !arquivo) throw new Error('Arquivo não encontrado');
    if (tenant_id && arquivo.tenant_id !== tenant_id) throw new Error('Acesso negado: tenant incompatível');

    if (arquivo.analise_cache?.analise) {
      return new Response(JSON.stringify(arquivo.analise_cache), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const instrucaoFinal = instrucao || 'Faça uma análise completa deste arquivo. Extraia todas as informações relevantes, identifique padrões, valores importantes, datas e apresente de forma estruturada com markdown.';

    const { data: fileData, error: storageErr } = await supabase.storage
      .from('ia-arquivos').download(arquivo.storage_path);

    if (storageErr || !fileData) throw new Error(`Erro ao baixar arquivo: ${storageErr?.message}`);

    const mimeType = arquivo.mime_type;
    let geminiBody: any;

    const PDF_IMAGE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const TEXT_TYPES = ['text/csv', 'text/plain', 'application/json'];
    const XLSX_TYPES = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
    const DOCX_TYPES = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

    if (PDF_IMAGE_TYPES.includes(mimeType)) {
      const arrayBuffer = await fileData.arrayBuffer();
      const base64 = await toBase64(arrayBuffer);
      geminiBody = {
        contents: [{ role: 'user', parts: [
          { inline_data: { mime_type: mimeType, data: base64 } },
          { text: instrucaoFinal },
        ]}],
      };
    } else if (XLSX_TYPES.includes(mimeType)) {
      const arrayBuffer = await fileData.arrayBuffer();
      const XLSX = await import('https://esm.sh/xlsx@0.18.5');
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheets: Record<string, any[]> = {};
      for (const sheetName of workbook.SheetNames) {
        sheets[sheetName] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null });
      }
      const texto = JSON.stringify(sheets, null, 2).slice(0, 100000);
      geminiBody = {
        contents: [{ role: 'user', parts: [{ text: `Arquivo: ${arquivo.nome_original}\nConteúdo (JSON das planilhas):\n${texto}\n\nInstrução: ${instrucaoFinal}` }] }],
      };
    } else if (DOCX_TYPES.includes(mimeType)) {
      const arrayBuffer = await fileData.arrayBuffer();
      const mammoth = await import('https://esm.sh/mammoth@1.7.2');
      const result = await mammoth.extractRawText({ arrayBuffer });
      const texto = result.value.slice(0, 100000);
      geminiBody = {
        contents: [{ role: 'user', parts: [{ text: `Arquivo: ${arquivo.nome_original}\nConteúdo:\n${texto}\n\nInstrução: ${instrucaoFinal}` }] }],
      };
    } else if (TEXT_TYPES.includes(mimeType)) {
      const texto = (await fileData.text()).slice(0, 100000);
      geminiBody = {
        contents: [{ role: 'user', parts: [{ text: `Arquivo: ${arquivo.nome_original}\nConteúdo:\n${texto}\n\nInstrução: ${instrucaoFinal}` }] }],
      };
    } else {
      throw new Error(`Tipo não suportado: ${mimeType}`);
    }

    const geminiUrl = SIMPLE_TYPES.includes(mimeType) ? GEMINI_FLASH_URL : GEMINI_PRO_URL;

    const geminiRes = await fetch(`${geminiUrl}?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      throw new Error(`Gemini erro ${geminiRes.status}: ${errText}`);
    }

    const geminiData = await geminiRes.json();
    const analise = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Sem resposta da IA';
    const tokens_usados = geminiData.usageMetadata?.totalTokenCount ?? 0;

    const cacheData = { analise, tokens_usados, analisado_em: new Date().toISOString() };

    await supabase.from('ia_arquivos').update({ analise_cache: cacheData }).eq('id', arquivo_id);

    return new Response(JSON.stringify(cacheData), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('[ia-analyze-file] erro:', err);
    return new Response(JSON.stringify({ error: err.message ?? 'Erro interno' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
