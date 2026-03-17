// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-zita-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';

// ─── Ferramentas customizadas (google_search é nativo, adicionado separadamente) ──
const CUSTOM_TOOLS = {
  function_declarations: [
    {
      name: 'buscar_dados',
      description: 'Busca dados do Zita ERP. Use para consultar qualquer informação: clientes, pedidos, financeiro, RH, estoque. Prefira esta ferramenta antes de inventar dados.',
      parameters: {
        type: 'object',
        properties: {
          tabela: { type: 'string', description: 'Nome exato da tabela no banco' },
          filtros: { type: 'object', description: 'Filtros a aplicar como objeto JSON' },
          campos: { type: 'array', items: { type: 'string' }, description: 'Lista de campos a retornar.' },
          limite: { type: 'number', description: 'Máximo de registros. Default: 20, máximo: 100' },
          sql_custom: { type: 'string', description: 'Query SELECT completa para JOINs. APENAS SELECT.' },
        },
        required: [],
      },
    },
    {
      name: 'criar_registro',
      description: 'Cria um novo registro no banco. SEMPRE confirme com o usuário antes.',
      parameters: {
        type: 'object',
        properties: {
          tabela: { type: 'string' },
          dados: { type: 'object', description: 'Dados do novo registro. Não inclua id ou created_at.' },
        },
        required: ['tabela', 'dados'],
      },
    },
    {
      name: 'atualizar_registro',
      description: 'Atualiza um registro existente. SEMPRE confirme com o usuário antes.',
      parameters: {
        type: 'object',
        properties: {
          tabela: { type: 'string' },
          id: { type: 'string', description: 'UUID do registro a atualizar' },
          dados: { type: 'object', description: 'Campos a atualizar' },
        },
        required: ['tabela', 'id', 'dados'],
      },
    },
    {
      name: 'consultar_cnpj',
      description: 'Consulta dados de uma empresa brasileira pelo CNPJ na Receita Federal.',
      parameters: {
        type: 'object',
        properties: {
          cnpj: { type: 'string', description: 'CNPJ — apenas números, sem pontuação' },
        },
        required: ['cnpj'],
      },
    },
    {
      name: 'analisar_arquivo',
      description: 'Analisa um arquivo já enviado pelo usuário. Use automaticamente quando o usuário enviar um arquivo.',
      parameters: {
        type: 'object',
        properties: {
          arquivo_id: { type: 'string', description: 'ID do arquivo em ia_arquivos' },
          instrucao: { type: 'string', description: 'O que extrair ou analisar do arquivo.' },
        },
        required: ['arquivo_id'],
      },
    },
    {
      name: 'google_calendar',
      description: 'Acessa e gerencia eventos do Google Calendar do usuário. Só use se o usuário tiver conectado o Google.',
      parameters: {
        type: 'object',
        properties: {
          operacao: { type: 'string', enum: ['listar_eventos', 'criar_evento', 'deletar_evento'] },
          data_inicio: { type: 'string', description: 'Data início YYYY-MM-DD' },
          data_fim: { type: 'string', description: 'Data fim YYYY-MM-DD' },
          titulo: { type: 'string' },
          descricao: { type: 'string' },
          evento_id: { type: 'string' },
        },
        required: ['operacao'],
      },
    },
    {
      name: 'google_sheets',
      description: 'Lê e escreve em planilhas Google Sheets do usuário. Só use se o usuário tiver conectado o Google.',
      parameters: {
        type: 'object',
        properties: {
          operacao: { type: 'string', enum: ['ler_planilha', 'escrever_celula', 'listar_planilhas'] },
          spreadsheet_id: { type: 'string' },
          range: { type: 'string', description: 'Intervalo no formato A1:Z100' },
          valores: { type: 'array', description: 'Valores para escrever' },
        },
        required: ['operacao'],
      },
    },
    {
      name: 'gmail',
      description: 'Lê emails e envia mensagens pelo Gmail. SEMPRE confirme antes de enviar. Só use se o usuário tiver conectado o Google.',
      parameters: {
        type: 'object',
        properties: {
          operacao: { type: 'string', enum: ['listar_emails', 'ler_email', 'enviar_email'] },
          email_id: { type: 'string' },
          destinatario: { type: 'string' },
          assunto: { type: 'string' },
          corpo: { type: 'string' },
          max_resultados: { type: 'number' },
        },
        required: ['operacao'],
      },
    },
    {
      name: 'google_docs',
      description: 'Cria, lê e edita documentos Google Docs. Use para gerar relatórios, contratos, atas de reunião e exportar conteúdo gerado pela IA.',
      parameters: {
        type: 'object',
        properties: {
          operacao: { type: 'string', enum: ['ler_documento', 'criar_documento', 'editar_documento'] },
          document_id: { type: 'string', description: 'ID do documento (para ler ou editar)' },
          titulo: { type: 'string', description: 'Título do novo documento (para criar)' },
          conteudo: { type: 'string', description: 'Conteúdo em texto ou markdown para inserir' },
        },
        required: ['operacao'],
      },
    },
    {
      name: 'google_slides',
      description: 'Cria e lê apresentações Google Slides. Use para gerar apresentações de resultados, propostas comerciais e relatórios visuais.',
      parameters: {
        type: 'object',
        properties: {
          operacao: { type: 'string', enum: ['ler_apresentacao', 'criar_apresentacao', 'adicionar_slide'] },
          presentation_id: { type: 'string', description: 'ID da apresentação (para ler ou editar)' },
          titulo: { type: 'string', description: 'Título da apresentação (para criar)' },
          slides: { type: 'array', description: 'Array de slides com titulo e conteudo cada' },
        },
        required: ['operacao'],
      },
    },
    {
      name: 'cloud_vision',
      description: 'Analisa imagens com IA: detecta texto (OCR), objetos, logos, faces e lê documentos escaneados. Use quando o usuário enviar uma foto de documento, nota fiscal ou imagem com texto.',
      parameters: {
        type: 'object',
        properties: {
          operacao: { type: 'string', enum: ['detectar_texto', 'detectar_objetos', 'ler_documento_ocr', 'detectar_logos'] },
          image_base64: { type: 'string', description: 'Imagem em base64 (preferencial)' },
          image_url: { type: 'string', description: 'URL pública da imagem (alternativa ao base64)' },
        },
        required: ['operacao'],
      },
    },
    {
      name: 'google_people',
      description: 'Acessa a agenda de contatos do Google do usuário. Use para buscar emails, telefones e dados de contatos antes de enviar mensagens.',
      parameters: {
        type: 'object',
        properties: {
          operacao: { type: 'string', enum: ['listar_contatos', 'buscar_contato'] },
          query: { type: 'string', description: 'Nome ou email para buscar' },
          max_resultados: { type: 'number', description: 'Máximo de contatos. Default: 20' },
        },
        required: ['operacao'],
      },
    },
    {
      name: 'google_maps',
      description: 'Calcula rotas, busca endereços e geocodifica localizações. Útil para logística, entregas, frotas e validar endereços de clientes.',
      parameters: {
        type: 'object',
        properties: {
          operacao: { type: 'string', enum: ['calcular_rota', 'buscar_local', 'geocodificar', 'calcular_distancia_multiplos'] },
          origem: { type: 'string', description: 'Endereço ou coordenada de origem' },
          destino: { type: 'string', description: 'Endereço ou coordenada de destino' },
          endereco: { type: 'string', description: 'Endereço para geocodificar ou buscar' },
          modo: { type: 'string', enum: ['DRIVE', 'WALK', 'BICYCLE', 'TRANSIT'], description: 'Modo de transporte. Default: DRIVE' },
          multiplos_destinos: { type: 'array', items: { type: 'string' }, description: 'Lista de destinos para cálculo de rota de frota' },
        },
        required: ['operacao'],
      },
    },
  ],
};

// ─── Executores ──────────────────────────────────────────────────────────────
async function exec_buscar_dados(args: any, tenant_id: string, supabase: any) {
  if (args.sql_custom) {
    const { data, error } = await supabase.rpc('executar_query_ia', { p_query: args.sql_custom, p_tenant_id: tenant_id });
    if (error) throw new Error(error.message);
    return data;
  }
  let q = supabase.from(args.tabela).select(args.campos?.join(',') || '*');
  if (args.filtros) {
    for (const [k, v] of Object.entries(args.filtros)) q = q.eq(k, v);
  }
  q = q.eq('tenant_id', tenant_id).limit(Math.min(args.limite || 20, 100));
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data;
}

async function exec_criar_registro(args: any, tenant_id: string, supabase: any) {
  const { data, error } = await supabase.from(args.tabela).insert({ ...args.dados, tenant_id }).select().single();
  if (error) throw new Error(error.message);
  return { criado: true, id: data.id, registro: data };
}

async function exec_atualizar_registro(args: any, tenant_id: string, supabase: any) {
  const { data, error } = await supabase.from(args.tabela).update(args.dados).eq('id', args.id).eq('tenant_id', tenant_id).select().single();
  if (error) throw new Error(error.message);
  return { atualizado: true, registro: data };
}

async function callUtils(action: string, body: Record<string, unknown>) {
  const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ia-utils`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
    body: JSON.stringify({ action, ...body }),
  });
  return await res.json();
}

async function exec_analisar_arquivo(args: any, tenant_id: string) {
  const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ia-analyze-file`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
    body: JSON.stringify({ arquivo_id: args.arquivo_id, instrucao: args.instrucao || 'Faça uma análise completa.', tenant_id }),
  });
  return await res.json();
}

async function exec_cloud_vision(args: any) {
  const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY');
  const features_map: Record<string, any[]> = {
    detectar_texto:    [{ type: 'TEXT_DETECTION' }],
    ler_documento_ocr: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
    detectar_objetos:  [{ type: 'LABEL_DETECTION' }, { type: 'OBJECT_LOCALIZATION' }],
    detectar_logos:    [{ type: 'LOGO_DETECTION' }],
  };
  const image = args.image_base64
    ? { content: args.image_base64 }
    : { source: { imageUri: args.image_url } };
  const res = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests: [{ image, features: features_map[args.operacao] ?? [{ type: 'TEXT_DETECTION' }] }] }),
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

async function exec_google_maps(args: any) {
  const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY');

  if (args.operacao === 'calcular_rota' || args.operacao === 'calcular_distancia_multiplos') {
    const destinos: string[] = args.multiplos_destinos ?? (args.destino ? [args.destino] : []);
    const results = await Promise.all(destinos.map(async (dest: string) => {
      const res = await fetch(
        `https://routes.googleapis.com/directions/v2:computeRoutes?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters' },
          body: JSON.stringify({
            origin: { address: args.origem },
            destination: { address: dest },
            travelMode: args.modo || 'DRIVE',
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
    return args.multiplos_destinos ? { rotas: results } : results[0];
  }

  // Geocoding
  const query = args.endereco ?? args.origem ?? '';
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&language=pt-BR&key=${GEMINI_KEY}`
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

async function executarFerramenta(nome: string, args: any, tenant_id: string, supabase: any, google_access_token?: string) {
  switch (nome) {
    case 'buscar_dados':         return await exec_buscar_dados(args, tenant_id, supabase);
    case 'criar_registro':       return await exec_criar_registro(args, tenant_id, supabase);
    case 'atualizar_registro':   return await exec_atualizar_registro(args, tenant_id, supabase);
    case 'consultar_cnpj':       return await callUtils('cnpj', { cnpj: args.cnpj });
    case 'analisar_arquivo':     return await exec_analisar_arquivo(args, tenant_id);
    case 'google_calendar':      return await callUtils('google_calendar', { ...args, access_token: google_access_token });
    case 'google_sheets':        return await callUtils('google_sheets', { ...args, access_token: google_access_token });
    case 'gmail':                return await callUtils('gmail', { ...args, access_token: google_access_token });
    case 'google_docs':          return await callUtils('google_docs', { ...args, access_token: google_access_token });
    case 'google_slides':        return await callUtils('google_slides', { ...args, access_token: google_access_token });
    case 'cloud_vision':         return await exec_cloud_vision(args);
    case 'google_people':        return await callUtils('google_people', { ...args, access_token: google_access_token });
    case 'google_maps':          return await exec_google_maps(args);
    default: throw new Error(`Ferramenta desconhecida: ${nome}`);
  }
}

function sseEvent(data: Record<string, any>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY');
  if (!GEMINI_KEY) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY não configurada' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const encoder = new TextEncoder();

  const body = await req.json();
  const { mensagem, conversa_id, agente_id, tenant_id, usuario_id, arquivo_ids = [], google_access_token } = body;

  if (!tenant_id) {
    return new Response(JSON.stringify({ error: 'tenant_id obrigatório' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
  if (!mensagem && (!arquivo_ids || arquivo_ids.length === 0)) {
    return new Response(JSON.stringify({ error: 'mensagem ou arquivo_ids obrigatório' }), {
      status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, any>) => controller.enqueue(encoder.encode(sseEvent(data)));

      try {
        // 1. Buscar ou criar conversa
        let conversaId = conversa_id;
        if (!conversaId) {
          const titulo = (mensagem || 'Nova conversa').slice(0, 60);
          const { data: nova, error: convErr } = await supabase
            .from('ia_conversas')
            .insert({ tenant_id, usuario_id: usuario_id || 'anon', agente_id: agente_id || null, titulo, canal: 'chat' })
            .select().single();
          if (convErr) throw new Error(`Erro ao criar conversa: ${convErr.message}`);
          conversaId = nova.id;
        }

        // 2. Salvar mensagem do usuário
        await supabase.from('ia_mensagens').insert({
          conversa_id: conversaId, tenant_id, role: 'user',
          conteudo: mensagem || '', agente_id: agente_id || null,
          metadata: arquivo_ids.length > 0 ? { arquivo_ids } : {},
        });

        send({ type: 'conversa_id', id: conversaId });

        // 3. Buscar histórico (até 20 mensagens)
        const { data: historico } = await supabase
          .from('ia_mensagens').select('role, conteudo')
          .eq('conversa_id', conversaId).eq('tenant_id', tenant_id)
          .order('created_at', { ascending: true }).limit(20);

        // 4. Buscar agente e permissões
        let agente: any = null;
        if (agente_id) {
          const { data } = await supabase.from('ia_agentes').select('*').eq('id', agente_id).single();
          agente = data;
        }
        const { data: permissoes } = await supabase.from('ia_permissoes').select('*').eq('tenant_id', tenant_id);

        // 5. Buscar metadados de arquivos
        let arquivosMetadata: any[] = [];
        if (arquivo_ids.length > 0) {
          const { data: arqs } = await supabase
            .from('ia_arquivos').select('id, nome_original, mime_type, tamanho_bytes').in('id', arquivo_ids);
          arquivosMetadata = arqs || [];
        }

        // 6. Montar system_prompt
        const systemBase = agente?.system_prompt || 'Você é a ZIA, assistente inteligente do Zita ERP. Responda em português brasileiro.';
        const googleStatus = google_access_token
          ? '\nGoogle APIs: conectado (Calendar, Sheets, Gmail, Docs, Slides, People disponíveis)'
          : '';
        const systemPrompt = [
          systemBase,
          `\nPermissões ativas: ${JSON.stringify(permissoes || [])}`,
          `\nTenant ID: ${tenant_id}`,
          `\nData/hora: ${new Date().toISOString()}`,
          googleStatus,
          arquivosMetadata.length > 0 ? `\nArquivos enviados: ${JSON.stringify(arquivosMetadata)}` : '',
        ].join('');

        // 7. Formatar histórico
        const contents: any[] = (historico || []).map((m: any) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.conteudo || '' }],
        }));

        const ultimaRole = contents.length > 0 ? contents[contents.length - 1].role : null;
        if (ultimaRole !== 'user') {
          contents.push({ role: 'user', parts: [{ text: mensagem || 'Analise os arquivos enviados.' }] });
        }

        send({ type: 'thinking' });

        // 8. Loop tool calls
        const ferramentasUsadas: any[] = [];
        let textoFinal = '';
        let totalTokens = 0;
        let loopCount = 0;
        const MAX_LOOPS = 8;

        while (loopCount < MAX_LOOPS) {
          loopCount++;

          const geminiBody: any = {
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents,
            // google_search nativo (Gemini pesquisa automaticamente quando necessário)
            // + function_declarations customizadas
            tools: [{ google_search: {} }, CUSTOM_TOOLS],
            tool_config: { function_calling_config: { mode: 'AUTO' } },
            generation_config: { temperature: 0.7, max_output_tokens: 8192 },
          };

          const geminiRes = await fetch(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(geminiBody),
          });

          if (!geminiRes.ok) {
            const errText = await geminiRes.text();
            throw new Error(`Gemini ${geminiRes.status}: ${errText}`);
          }

          const geminiData = await geminiRes.json();
          totalTokens += geminiData.usageMetadata?.totalTokenCount ?? 0;

          const candidate = geminiData.candidates?.[0];
          if (!candidate) throw new Error('Gemini retornou resposta vazia');

          const parts = candidate.content?.parts ?? [];
          const functionCalls = parts.filter((p: any) => p.functionCall);

          if (functionCalls.length === 0) {
            // Resposta final — extrair texto
            textoFinal = parts.map((p: any) => p.text ?? '').filter(Boolean).join('');
            const chunkSize = 60;
            for (let i = 0; i < textoFinal.length; i += chunkSize) {
              send({ type: 'text', delta: textoFinal.slice(i, i + chunkSize) });
            }
            break;
          }

          // Processar function calls
          const toolResults: any[] = [];
          const modelParts: any[] = [];

          for (const part of parts) {
            if (!part.functionCall) continue;
            const { name: toolName, args: toolArgs } = part.functionCall;
            modelParts.push({ functionCall: { name: toolName, args: toolArgs } });

            send({ type: 'tool_start', tool: toolName, input: toolArgs });

            const inicio = Date.now();
            let resultado: any;
            let status = 'sucesso';
            let erroMsg = null;

            try {
              resultado = await executarFerramenta(toolName, toolArgs, tenant_id, supabase, google_access_token);
            } catch (err: any) {
              resultado = { error: err.message };
              status = 'erro';
              erroMsg = err.message;
            }

            const duracao = Date.now() - inicio;
            send({ type: 'tool_end', tool: toolName, resultado });
            ferramentasUsadas.push({ tool: toolName, input: toolArgs, resultado, duracao_ms: duracao });

            await supabase.from('ia_acoes_log').insert({
              tenant_id, conversa_id: conversaId,
              ferramenta: toolName, parametros: toolArgs,
              resultado, status, erro_msg: erroMsg, duracao_ms: duracao,
            });

            toolResults.push({
              functionResponse: { name: toolName, response: { content: resultado } },
            });
          }

          contents.push({ role: 'model', parts: modelParts });
          contents.push({ role: 'user', parts: toolResults });
        }

        // 9. Salvar mensagem do assistente
        const { data: msgAI } = await supabase.from('ia_mensagens').insert({
          conversa_id: conversaId, tenant_id, role: 'assistant',
          conteudo: textoFinal, agente_id: agente_id || null,
          tokens_usados: totalTokens, ferramentas_usadas: ferramentasUsadas,
        }).select('id').single();

        await supabase.from('ia_conversas').update({ updated_at: new Date().toISOString() }).eq('id', conversaId);

        send({ type: 'done', mensagem_id: msgAI?.id, tokens: totalTokens });

      } catch (err: any) {
        console.error('[ia-chat] erro:', err);
        send({ type: 'error', message: err.message ?? 'Erro interno' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...CORS,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
});
