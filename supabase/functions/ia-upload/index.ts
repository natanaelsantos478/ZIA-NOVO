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

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

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

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('ia-arquivos')
      .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      throw new Error(`Erro no upload: ${uploadError.message}`);
    }

    const insertData: any = {
      id: fileId,
      tenant_id,
      nome_original: file.name,
      storage_path: storagePath,
      mime_type: file.type,
      tamanho_bytes: file.size,
    };
    if (conversa_id) insertData.conversa_id = conversa_id;

    const { error: dbError } = await supabase
      .from('ia_arquivos')
      .insert(insertData);

    if (dbError) {
      throw new Error(`Erro ao salvar registro: ${dbError.message}`);
    }

    return new Response(JSON.stringify({
      arquivo_id: fileId,
      storage_path: storagePath,
      mime_type: file.type,
      tamanho_bytes: file.size,
    }), { headers: { ...CORS, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error('[ia-upload] erro:', err);
    return new Response(JSON.stringify({ error: err.message ?? 'Erro interno' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
