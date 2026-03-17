// deno-lint-ignore-file no-explicit-any
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-zita-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const TOOLS_DEFINITION = {
  function_declarations: [
    {
      name: 'buscar_dados',
      description: 'Busca dados do Zita ERP. Use para consultar qualquer informação: clientes, pedidos, financeiro, RH, estoque.',
      parameters: {
        type: 'object',
        properties: {
          tabela: { type: 'string', description: 'Nome exato da tabela no banco' },
          filtros: { type: 'object', description: 'Filtros a aplicar como objeto JSON' },
          campos: { type: 'array', items: { type: 'string' }, description: 'Lista de campos a retornar.' },
          limite: { type: 'number', description: 'Máximo de registros. Default: 20, máximo: 100' },
          sql_custom: { type: 'string', description: 'Query SELECT completa para JOINs ou agregações. APENAS SELECT.' },
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
      name: 'pesquisar_internet',
      description: 'Pesquisa informações na internet via Google. Use para buscar leads, notícias, validar informações, pesquisar concorrentes.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Termo de busca' },
          tipo: { type: 'string', enum: ['web', 'noticias'], description: 'Tipo de busca. Default: web' },
          num: { type: 'number', description: 'Número de resultados. Default: 5, máximo: 10' },
        },
        required: ['query'],
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
  ],
};

async function exec_buscar_dados(args: any, tenant_id: string, supabase: any) {
  if (args.sql_custom) {
    const { data, error } = await supabase.rpc('executar_query_ia', {
      p_query: args.sql_custom,
      p_tenant_id: tenant_id,
    });
    if (error) throw new Error(error.message);
    return data;
  }
  let q = supabase.from(args.tabela).select(args.campos?.join(',') || '*');
  if (args.filtros) {
    for (const [k, v] of Object.entries(args.filtros)) {
      q = q.eq(k, v);
    }
  }
  q = q.eq('tenant_id', tenant_id).limit(Math.min(args.limite || 20, 100));
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data;
}

async function exec_criar_registro(args: any, tenant_id: string, supabase: any) {
  const { data, error } = await supabase
    .from(args.tabela)
    .insert({ ...args.dados, tenant_id })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return { criado: true, id: data.id, registro: data };
}

async function exec_atualizar_registro(args: any, tenant_id: string, supabase: any) {
  const { data, error } = await supabase
    .from(args.tabela)
    .update(args.dados)
    .eq('id', args.id)
    .eq('tenant_id', tenant_id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return { atualizado: true, registro: data };
}

async function exec_pesquisar_internet(args: any) {
  const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ia-web-search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
    },
    body: JSON.stringify({ action: 'search', query: args.query, tipo: args.tipo || 'web', num: args.num || 5 }),
  });
  return await res.json();
}

async function exec_consultar_cnpj(args: any) {
  const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ia-web-search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
    },
    body: JSON.stringify({ action: 'cnpj', cnpj: args.cnpj }),
  });
  return await res.json();
}

async function exec_analisar_arquivo(args: any, tenant_id: string) {
  const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ia-analyze-file`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
    },
    body: JSON.stringify({
      arquivo_id: args.arquivo_id,
      instrucao: args.instrucao || 'Faça uma análise completa deste arquivo.',
      tenant_id,
    }),
  });
  return await res.json();
}

async function executarFerramenta(nome: string, args: any, tenant_id: string, supabase: any) {
  switch (nome) {
    case 'buscar_dados': return await exec_buscar_dados(args, tenant_id, supabase);
    case 'criar_registro': return await exec_criar_registro(args, tenant_id, supabase);
    case 'atualizar_registro': return await exec_atualizar_registro(args, tenant_id, supabase);
    case 'pesquisar_internet': return await exec_pesquisar_internet(args);
    case 'consultar_cnpj': return await exec_consultar_cnpj(args);
    case 'analisar_arquivo': return await exec_analisar_arquivo(args, tenant_id);
    default: throw new Error(`Ferramenta desconhecida: ${nome}`);
  }
}

function sseEvent(data: Record<string, any>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  const GEMINI_KEY = Deno.env.get('GEMINI_API_KEY');
  if (!GEMINI_KEY) {
    return new Response(JSON.stringify({ error: 'GEMINI_API_KEY não configurada' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const encoder = new TextEncoder();

  const body = await req.json();
  const { mensagem, conversa_id, agente_id, tenant_id, usuario_id, arquivo_ids = [] } = body;

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
      const send = (data: Record<string, any>) => {
        controller.enqueue(encoder.encode(sseEvent(data)));
      };

      try {
        // 1. Buscar ou criar conversa
        let conversaId = conversa_id;
        if (!conversaId) {
          const titulo = (mensagem || 'Nova conversa').slice(0, 60);
          const { data: novaConversa, error: convErr } = await supabase
            .from('ia_conversas')
            .insert({ tenant_id, usuario_id: usuario_id || 'anon', agente_id: agente_id || null, titulo, canal: 'chat' })
            .select()
            .single();
          if (convErr) throw new Error(`Erro ao criar conversa: ${convErr.message}`);
          conversaId = novaConversa.id;
        }

        // 2. Salvar mensagem do usuário
        const msgUserPayload: any = {
          conversa_id: conversaId,
          tenant_id,
          role: 'user',
          conteudo: mensagem || '',
          agente_id: agente_id || null,
          metadata: arquivo_ids.length > 0 ? { arquivo_ids } : {},
        };
        await supabase.from('ia_mensagens').insert(msgUserPayload);

        // 3. Emitir conversa_id
        send({ type: 'conversa_id', id: conversaId });

        // 4. Buscar histórico
        const { data: historico } = await supabase
          .from('ia_mensagens')
          .select('role, conteudo')
          .eq('conversa_id', conversaId)
          .eq('tenant_id', tenant_id)
          .order('created_at', { ascending: true })
          .limit(20);

        // 5. Buscar agente
        let agente: any = null;
        if (agente_id) {
          const { data } = await supabase.from('ia_agentes').select('*').eq('id', agente_id).single();
          agente = data;
        }

        // 6. Buscar permissões
        const { data: permissoes } = await supabase
          .from('ia_permissoes')
          .select('*')
          .eq('tenant_id', tenant_id);

        // 7. Buscar metadados dos arquivos se houver
        let arquivosMetadata: any[] = [];
        if (arquivo_ids.length > 0) {
          const { data: arqs } = await supabase
            .from('ia_arquivos')
            .select('id, nome_original, mime_type, tamanho_bytes')
            .in('id', arquivo_ids);
          arquivosMetadata = arqs || [];
        }

        // 8. Montar system_prompt
        const systemPromptBase = agente?.system_prompt ||
          'Você é a ZIA, assistente inteligente do Zita ERP. Responda em português brasileiro.';
        const systemPrompt = [
          systemPromptBase,
          `\nPermissões ativas: ${JSON.stringify(permissoes || [])}`,
          `\nTenant ID atual: ${tenant_id}`,
          `\nData/hora atual: ${new Date().toISOString()}`,
          arquivosMetadata.length > 0
            ? `\nArquivos enviados pelo usuário: ${JSON.stringify(arquivosMetadata)}`
            : '',
        ].join('');

        // 9. Formatar histórico para Gemini
        const contents: any[] = (historico || []).map((msg: any) => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.conteudo || '' }],
        }));

        const ultimaMsgDoUser = contents.length > 0 && contents[contents.length - 1].role === 'user';
        if (!ultimaMsgDoUser) {
          contents.push({ role: 'user', parts: [{ text: mensagem || 'Analise os arquivos enviados.' }] });
        }

        send({ type: 'thinking' });

        // 10. Loop de chamadas ao Gemini
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
            tools: [TOOLS_DEFINITION],
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
            throw new Error(`Gemini erro ${geminiRes.status}: ${errText}`);
          }

          const geminiData = await geminiRes.json();
          totalTokens += geminiData.usageMetadata?.totalTokenCount ?? 0;

          const candidate = geminiData.candidates?.[0];
          if (!candidate) throw new Error('Gemini retornou resposta vazia');

          const parts = candidate.content?.parts ?? [];
          const hasFunctionCall = parts.some((p: any) => p.functionCall);

          if (!hasFunctionCall) {
            textoFinal = parts.map((p: any) => p.text ?? '').join('');
            const chunkSize = 50;
            for (let i = 0; i < textoFinal.length; i += chunkSize) {
              send({ type: 'text', delta: textoFinal.slice(i, i + chunkSize) });
            }
            break;
          }

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
              resultado = await executarFerramenta(toolName, toolArgs, tenant_id, supabase);
            } catch (err: any) {
              resultado = { error: err.message };
              status = 'erro';
              erroMsg = err.message;
            }

            const duracao = Date.now() - inicio;
            send({ type: 'tool_end', tool: toolName, resultado });

            ferramentasUsadas.push({ tool: toolName, input: toolArgs, resultado, duracao_ms: duracao });

            await supabase.from('ia_acoes_log').insert({
              tenant_id,
              conversa_id: conversaId,
              ferramenta: toolName,
              parametros: toolArgs,
              resultado,
              status,
              erro_msg: erroMsg,
              duracao_ms: duracao,
            });

            toolResults.push({
              functionResponse: {
                name: toolName,
                response: { content: resultado },
              },
            });
          }

          contents.push({ role: 'model', parts: modelParts });
          contents.push({ role: 'user', parts: toolResults });
        }

        // 11. Salvar mensagem do assistente
        const { data: msgAssistente } = await supabase
          .from('ia_mensagens')
          .insert({
            conversa_id: conversaId,
            tenant_id,
            role: 'assistant',
            conteudo: textoFinal,
            agente_id: agente_id || null,
            tokens_usados: totalTokens,
            ferramentas_usadas: ferramentasUsadas,
          })
          .select('id')
          .single();

        // 12. Atualizar updated_at da conversa
        await supabase
          .from('ia_conversas')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversaId);

        send({ type: 'done', mensagem_id: msgAssistente?.id, tokens: totalTokens });

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
