// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-zita-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/csv', 'text/plain', 'application/json',
];

const MAX_SIZE = 50 * 1024 * 1024; // 50MB

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const tenant_id = formData.get('tenant_id') as string | null;
    const conversa_id = formData.get('conversa_id') as string | null;

    if (!file) {
      return new Response(JSON.stringify({ error: 'Arquivo não fornecido' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }
    if (!tenant_id) {
      return new Response(JSON.stringify({ error: 'tenant_id obrigatório' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return new Response(JSON.stringify({ error: `Tipo de arquivo não permitido: ${file.type}` }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }
    if (file.size > MAX_SIZE) {
      return new Response(JSON.stringify({ error: 'Arquivo excede o limite de 50MB' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const fileId = crypto.randomUUID();
    const storagePath = `${tenant_id}/${fileId}/${file.name}`;

    console.log(`[ia-upload] iniciando upload: ${file.name} (${file.type}, ${file.size} bytes) → ${storagePath}`);

    // ── 1. Upload para o Storage ─────────────────────────────────────────────
    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('ia-arquivos')
      .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error('[ia-upload] erro no storage.upload:', uploadError);
      return new Response(JSON.stringify({ error: `Erro no upload: ${uploadError.message}` }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    console.log('[ia-upload] storage.upload OK →', storagePath);

    // ── 2. INSERT em ia_arquivos ──────────────────────────────────────────────
    const insertData: Record<string, unknown> = {
      id: fileId,
      tenant_id,
      nome_original: file.name,
      storage_path: storagePath,
      mime_type: file.type,
      tamanho_bytes: file.size,
    };
    if (conversa_id) insertData.conversa_id = conversa_id;

    console.log('[ia-upload] inserindo em ia_arquivos:', JSON.stringify(insertData));

    const { data: inserted, error: dbError } = await supabase
      .from('ia_arquivos')
      .insert(insertData)
      .select('id')
      .single();

    if (dbError) {
      console.error('[ia-upload] erro no INSERT ia_arquivos:', dbError.code, dbError.message, dbError.details);
      // Storage já foi feito — logar mas não bloquear: retornar o arquivo_id gerado
      // para que o chat ainda possa tentar analisar via storage_path
      console.warn('[ia-upload] arquivo no storage mas sem registro DB — arquivo_id:', fileId);
      return new Response(JSON.stringify({
        arquivo_id: fileId,
        storage_path: storagePath,
        mime_type: file.type,
        tamanho_bytes: file.size,
        aviso: `Arquivo salvo no storage mas registro DB falhou: ${dbError.message}`,
      }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    console.log('[ia-upload] INSERT OK — id:', inserted?.id ?? fileId);

    return new Response(JSON.stringify({
      arquivo_id: inserted?.id ?? fileId,
      storage_path: storagePath,
      mime_type: file.type,
      tamanho_bytes: file.size,
    }), { headers: { ...CORS, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('[ia-upload] exceção não tratada:', err?.message ?? err);
    return new Response(JSON.stringify({ error: err.message ?? 'Erro interno' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
