// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type, authorization' };
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const SUPABASE_URL        = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GEMINI_PRO_URL      = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// ─── INPUT ───────────────────────────────────────────────────────────────────

interface RunnerInput {
  phone:           string;
  tenant_id:       string;
  agent_id:        string;
  api_key:         string;
  api_provider:    string;
  prompt_estilo:   string;
  mensagem_inicial: string;
  history:         { role: string; message: string }[];
  arquivos:        { nome: string; descricao: string | null; file_url: string; file_name: string }[];
  negociacao_id:   string | null;
  cliente_nome:    string;
}

// ─── FERRAMENTAS ──────────────────────────────────────────────────────────────

const TOOLS_DEF = [
  {
    name: 'buscar_dados',
    description: 'Busca dados em qualquer tabela do sistema. Use para consultar informações antes de agir.',
    parameters: {
      type: 'OBJECT',
      properties: {
        tabela:     { type: 'STRING', description: 'Nome da tabela (ex: crm_negociacoes, erp_produtos, employees)' },
        filtros:    { type: 'OBJECT', description: 'Filtros como pares chave-valor' },
        colunas:    { type: 'STRING', description: 'Colunas a retornar (padrão: *)' },
        limite:     { type: 'NUMBER', description: 'Máximo de registros (padrão: 10)' },
        ordenar_por: { type: 'STRING', description: 'campo.desc ou campo.asc' },
      },
      required: ['tabela'],
    },
  },
  {
    name: 'criar_registro',
    description: 'Cria um novo registro em qualquer tabela do sistema. NÃO inclua tenant_id.',
    parameters: {
      type: 'OBJECT',
      properties: {
        tabela: { type: 'STRING' },
        dados:  { type: 'OBJECT', description: 'Campos e valores do novo registro (sem tenant_id)' },
      },
      required: ['tabela', 'dados'],
    },
  },
  {
    name: 'editar_registro',
    description: 'Edita registros existentes no sistema.',
    parameters: {
      type: 'OBJECT',
      properties: {
        tabela:  { type: 'STRING' },
        id:      { type: 'STRING', description: 'UUID do registro (para editar 1 específico)' },
        filtros: { type: 'OBJECT', description: 'Filtros para editar múltiplos' },
        dados:   { type: 'OBJECT', description: 'Campos a atualizar (sem tenant_id)' },
      },
      required: ['tabela', 'dados'],
    },
  },
  {
    name: 'crm_buscar_lead',
    description: 'Busca todas as informações de um lead/negociação no CRM pelo número de telefone.',
    parameters: {
      type: 'OBJECT',
      properties: {
        phone: { type: 'STRING', description: 'Número de telefone do cliente' },
      },
      required: ['phone'],
    },
  },
  {
    name: 'crm_atualizar_negociacao',
    description: 'Atualiza status, etapa, responsável ou observações de uma negociação no CRM.',
    parameters: {
      type: 'OBJECT',
      properties: {
        negociacao_id: { type: 'STRING', description: 'UUID da negociação' },
        etapa:         { type: 'STRING', description: 'Nova etapa (ex: qualificado, proposta, fechado_ganho)' },
        status:        { type: 'STRING', description: 'novo status' },
        responsavel:   { type: 'STRING', description: 'Nome do responsável' },
        observacoes:   { type: 'STRING', description: 'Observações adicionais' },
      },
      required: ['negociacao_id'],
    },
  },
  {
    name: 'buscar_web',
    description: 'Realiza busca na internet para encontrar informações sobre empresa, produto ou tema.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Termos de busca' },
      },
      required: ['query'],
    },
  },
  {
    name: 'salvar_nota_crm',
    description: 'Registra uma nota ou observação interna na negociação do CRM.',
    parameters: {
      type: 'OBJECT',
      properties: {
        negociacao_id: { type: 'STRING', description: 'UUID da negociação' },
        nota:          { type: 'STRING', description: 'Conteúdo da nota a salvar' },
        tipo:          { type: 'STRING', description: 'Tipo: contato_tentativa, reuniao_agendada, proposta_enviada, observacao (padrão: observacao)' },
      },
      required: ['negociacao_id', 'nota'],
    },
  },
  {
    name: 'transferir_atendimento',
    description: 'Transfere a conversa para atendimento humano. Use quando o cliente pedir para falar com atendente ou quando a situação exigir.',
    parameters: {
      type: 'OBJECT',
      properties: {
        negociacao_id: { type: 'STRING', description: 'UUID da negociação' },
        motivo:        { type: 'STRING', description: 'Motivo da transferência' },
      },
      required: [],
    },
  },
];

// Formato OpenAI tools (DeepSeek / OpenAI)
function toOpenAITools(defs: typeof TOOLS_DEF) {
  return defs.map(t => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: {
        type: 'object',
        properties: Object.fromEntries(
          Object.entries(t.parameters.properties).map(([k, v]) => [k, { type: (v as any).type?.toLowerCase(), description: (v as any).description }])
        ),
        required: t.parameters.required ?? [],
      },
    },
  }));
}

// Formato Anthropic tools (Claude)
function toAnthropicTools(defs: typeof TOOLS_DEF) {
  return defs.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: {
      type: 'object',
      properties: Object.fromEntries(
        Object.entries(t.parameters.properties).map(([k, v]) => [k, { type: (v as any).type?.toLowerCase(), description: (v as any).description }])
      ),
      required: t.parameters.required ?? [],
    },
  }));
}

// ─── EXECUTOR ─────────────────────────────────────────────────────────────────

async function executarFerramenta(
  nome: string,
  params: Record<string, unknown>,
  sb: ReturnType<typeof createClient>,
  tenantId: string,
): Promise<unknown> {
  switch (nome) {
    case 'buscar_dados': {
      const { tabela, filtros, colunas, limite, ordenar_por } = params as any;
      let q = sb.from(tabela).select(colunas ?? '*').eq('tenant_id', tenantId).limit(limite ?? 10);
      if (filtros) {
        for (const [k, v] of Object.entries(filtros as Record<string, unknown>)) q = (q as any).eq(k, String(v));
      }
      if (ordenar_por) {
        const [campo, dir] = String(ordenar_por).split('.');
        q = (q as any).order(campo, { ascending: dir !== 'desc' });
      }
      const { data, error } = await q;
      if (error) throw error;
      return { registros: data, total: data?.length ?? 0 };
    }

    case 'criar_registro': {
      const { tabela, dados } = params as any;
      const { data, error } = await sb.from(tabela).insert({ ...dados, tenant_id: tenantId }).select().single();
      if (error) throw error;
      return { criado: true, registro: data };
    }

    case 'editar_registro': {
      const { tabela, id, filtros, dados } = params as any;
      const { tenant_id: _t, ...clean } = dados as any;
      let q: any = sb.from(tabela).update(clean);
      if (id) q = q.eq('id', id);
      if (filtros) {
        for (const [k, v] of Object.entries(filtros as Record<string, unknown>)) q = q.eq(k, String(v));
      }
      q = q.eq('tenant_id', tenantId);
      const { data, error } = await q.select();
      if (error) throw error;
      return { editado: true, registros_afetados: (data as unknown[])?.length ?? 0 };
    }

    case 'crm_buscar_lead': {
      const { phone } = params as { phone: string };
      const { data, error } = await sb
        .from('crm_negociacoes')
        .select('id, cliente_nome, cliente_telefone, etapa, status, responsavel, observacoes, created_at, updated_at')
        .eq('tenant_id', tenantId)
        .eq('cliente_telefone', phone)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data ?? { encontrado: false };
    }

    case 'crm_atualizar_negociacao': {
      const { negociacao_id, ...updates } = params as any;
      if (!negociacao_id) return { erro: 'negociacao_id obrigatório' };
      const clean = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined && v !== null && v !== ''));
      if (Object.keys(clean).length === 0) return { atualizado: false, motivo: 'nenhum campo informado' };
      const { error } = await sb.from('crm_negociacoes').update(clean).eq('id', negociacao_id).eq('tenant_id', tenantId);
      if (error) throw error;
      return { atualizado: true };
    }

    case 'buscar_web': {
      const { query } = params as { query: string };
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/ia-web-search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
          body: JSON.stringify({ query }),
        });
        if (!res.ok) return { erro: `web-search HTTP ${res.status}` };
        const d = await res.json() as any;
        return { resultados: d.results ?? d ?? [] };
      } catch (e) {
        return { erro: String(e) };
      }
    }

    case 'salvar_nota_crm': {
      const { negociacao_id, nota, tipo = 'observacao' } = params as any;
      if (!negociacao_id) return { erro: 'negociacao_id obrigatório' };
      const { error } = await sb.from('crm_negociacao_notas').insert({
        negociacao_id,
        tenant_id: tenantId,
        tipo,
        conteudo: nota,
        autor: 'Agente de WhatsApp',
      });
      if (error) {
        // Tabela pode não existir — salva em observacoes como fallback
        await sb.from('crm_negociacoes').update({
          observacoes: nota,
        }).eq('id', negociacao_id).eq('tenant_id', tenantId);
      }
      return { nota_salva: true };
    }

    case 'transferir_atendimento': {
      const { negociacao_id, motivo } = params as any;
      if (negociacao_id) {
        await sb.from('crm_negociacoes')
          .update({ etapa: 'aguardando_humano', responsavel: 'Aguardando Atendente' })
          .eq('id', negociacao_id).eq('tenant_id', tenantId);
      }
      return { transferido: true, motivo };
    }

    default:
      return { erro: `Ferramenta desconhecida: ${nome}` };
  }
}

// ─── LOG NO CHAT ──────────────────────────────────────────────────────────────

async function logMensagem(
  sb: ReturnType<typeof createClient>,
  chatId: string,
  agentId: string,
  tenantId: string,
  role: string,
  content: string | null,
  extra: { tool_name?: string; tool_args?: unknown; tool_result?: unknown } = {},
) {
  try {
    await sb.from('wa_agent_chat_messages').insert({
      chat_id: chatId, agent_id: agentId, tenant_id: tenantId,
      role, content,
      tool_name:   extra.tool_name   ?? null,
      tool_args:   extra.tool_args   ?? null,
      tool_result: extra.tool_result ?? null,
    });
  } catch { /* best-effort */ }
}

// ─── REACT LOOP — GEMINI ──────────────────────────────────────────────────────

async function reactGemini(
  apiKey: string,
  systemPrompt: string,
  contextMsgs: { role: string; parts: { text: string }[] }[],
  sb: ReturnType<typeof createClient>,
  tenantId: string,
  chatId: string,
  agentId: string,
): Promise<{ resposta: string; transferido: boolean; acoes: unknown[] }> {
  const contents = [...contextMsgs];
  const acoes: unknown[] = [];
  let resposta = '';
  let transferido = false;

  for (let i = 0; i < 10; i++) {
    const res = await fetch(`${GEMINI_PRO_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        tools: [{ function_declarations: TOOLS_DEF }],
        generationConfig: { maxOutputTokens: 4096 },
      }),
    });
    const d = await res.json() as any;
    if (d.error) throw new Error(`Gemini: ${d.error.message}`);

    const parts = d.candidates?.[0]?.content?.parts ?? [];
    const funcCalls = parts.filter((p: any) => p.functionCall);

    if (funcCalls.length === 0) {
      resposta = parts.filter((p: any) => p.text).map((p: any) => p.text).join('');
      break;
    }

    // Log thought (texto antes das tool calls)
    const thinkText = parts.filter((p: any) => p.text).map((p: any) => p.text).join('');
    if (thinkText.trim()) {
      await logMensagem(sb, chatId, agentId, tenantId, 'thought', thinkText);
    }

    const funcResults = [];
    for (const part of funcCalls) {
      const { name, args } = part.functionCall;
      await logMensagem(sb, chatId, agentId, tenantId, 'tool_call', null, { tool_name: name, tool_args: args });

      let resultado: unknown;
      try {
        resultado = await executarFerramenta(name, args, sb, tenantId);
        if (name === 'transferir_atendimento') transferido = true;
      } catch (err) {
        resultado = { erro: String(err) };
      }
      await logMensagem(sb, chatId, agentId, tenantId, 'tool_result', null, { tool_name: name, tool_result: resultado });
      acoes.push({ ferramenta: name, args, resultado });
      funcResults.push({ role: 'function', parts: [{ functionResponse: { name, response: { resultado } } }] });
    }

    contents.push({ role: 'model', parts });
    contents.push(...funcResults);
  }

  return { resposta, transferido, acoes };
}

// ─── REACT LOOP — OPENAI COMPAT (DeepSeek / OpenAI) ──────────────────────────

async function reactOpenAI(
  apiKey: string,
  provider: string,
  systemPrompt: string,
  contextMsgs: { role: string; parts: { text: string }[] }[],
  sb: ReturnType<typeof createClient>,
  tenantId: string,
  chatId: string,
  agentId: string,
): Promise<{ resposta: string; transferido: boolean; acoes: unknown[] }> {
  const baseUrl = provider === 'deepseek'
    ? 'https://api.deepseek.com/chat/completions'
    : 'https://api.openai.com/v1/chat/completions';
  const model = provider === 'deepseek' ? 'deepseek-chat' : 'gpt-4o';

  const messages: any[] = [
    { role: 'system', content: systemPrompt },
    ...contextMsgs.map(m => ({
      role: m.role === 'model' ? 'assistant' : 'user',
      content: m.parts[0].text,
    })),
  ];

  const tools = toOpenAITools(TOOLS_DEF);
  const acoes: unknown[] = [];
  let resposta = '';
  let transferido = false;

  for (let i = 0; i < 10; i++) {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, tools, max_tokens: 4096 }),
    });
    const d = await res.json() as any;
    if (d.error) throw new Error(`${provider}: ${JSON.stringify(d.error)}`);

    const choice = d.choices?.[0];
    const msg = choice?.message;

    if (!msg?.tool_calls || msg.tool_calls.length === 0) {
      resposta = msg?.content ?? '';
      break;
    }

    if (msg.content?.trim()) {
      await logMensagem(sb, chatId, agentId, tenantId, 'thought', msg.content);
    }

    messages.push(msg);

    for (const tc of msg.tool_calls) {
      const name = tc.function.name;
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(tc.function.arguments); } catch { /* ignore */ }

      await logMensagem(sb, chatId, agentId, tenantId, 'tool_call', null, { tool_name: name, tool_args: args });

      let resultado: unknown;
      try {
        resultado = await executarFerramenta(name, args, sb, tenantId);
        if (name === 'transferir_atendimento') transferido = true;
      } catch (err) {
        resultado = { erro: String(err) };
      }
      await logMensagem(sb, chatId, agentId, tenantId, 'tool_result', null, { tool_name: name, tool_result: resultado });
      acoes.push({ ferramenta: name, args, resultado });

      messages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: JSON.stringify(resultado),
      });
    }
  }

  return { resposta, transferido, acoes };
}

// ─── REACT LOOP — CLAUDE (Anthropic) ─────────────────────────────────────────

async function reactClaude(
  apiKey: string,
  systemPrompt: string,
  contextMsgs: { role: string; parts: { text: string }[] }[],
  sb: ReturnType<typeof createClient>,
  tenantId: string,
  chatId: string,
  agentId: string,
): Promise<{ resposta: string; transferido: boolean; acoes: unknown[] }> {
  const messages: any[] = contextMsgs.map(m => ({
    role: m.role === 'model' ? 'assistant' : 'user',
    content: m.parts[0].text,
  }));

  const tools = toAnthropicTools(TOOLS_DEF);
  const acoes: unknown[] = [];
  let resposta = '';
  let transferido = false;

  for (let i = 0; i < 10; i++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'tools-2024-04-04',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: systemPrompt,
        tools,
        messages,
      }),
    });
    const d = await res.json() as any;
    if (d.error) throw new Error(`Claude: ${JSON.stringify(d.error)}`);

    const content = d.content ?? [];
    const toolUses = content.filter((b: any) => b.type === 'tool_use');

    if (toolUses.length === 0 || d.stop_reason === 'end_turn') {
      resposta = content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
      break;
    }

    const textBlocks = content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
    if (textBlocks.trim()) {
      await logMensagem(sb, chatId, agentId, tenantId, 'thought', textBlocks);
    }

    messages.push({ role: 'assistant', content });

    const toolResults: any[] = [];
    for (const tu of toolUses) {
      await logMensagem(sb, chatId, agentId, tenantId, 'tool_call', null, { tool_name: tu.name, tool_args: tu.input });
      let resultado: unknown;
      try {
        resultado = await executarFerramenta(tu.name, tu.input, sb, tenantId);
        if (tu.name === 'transferir_atendimento') transferido = true;
      } catch (err) {
        resultado = { erro: String(err) };
      }
      await logMensagem(sb, chatId, agentId, tenantId, 'tool_result', null, { tool_name: tu.name, tool_result: resultado });
      acoes.push({ ferramenta: tu.name, args: tu.input, resultado });
      toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(resultado) });
    }
    messages.push({ role: 'user', content: toolResults });
  }

  return { resposta, transferido, acoes };
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  let input: RunnerInput;
  try { input = await req.json(); } catch { return json({ ok: false, error: 'JSON inválido' }, 400); }

  const {
    phone, tenant_id: tenantId, agent_id: agentId,
    api_key: apiKey, api_provider: apiProvider = 'gemini',
    prompt_estilo: promptEstilo, mensagem_inicial: mensagemInicial,
    history, arquivos, negociacao_id: negociacaoId, cliente_nome: clienteNome,
  } = input;

  if (!phone || !tenantId || !agentId || !apiKey) {
    return json({ ok: false, error: 'phone, tenant_id, agent_id e api_key são obrigatórios' }, 400);
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // ── Obter ou criar chat para este telefone ────────────────────────────────
  let chatId: string;
  {
    const { data: existing } = await sb
      .from('wa_agent_chats')
      .select('id')
      .eq('agent_id', agentId)
      .eq('phone', phone)
      .maybeSingle();

    if (existing?.id) {
      chatId = existing.id as string;
    } else {
      const { data: novo } = await sb
        .from('wa_agent_chats')
        .insert({
          agent_id: agentId,
          tenant_id: tenantId,
          phone,
          titulo: clienteNome !== phone ? clienteNome : phone,
          last_message_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      chatId = (novo?.id as string) ?? '';
    }

    // Atualiza last_message_at
    if (chatId) {
      await sb.from('wa_agent_chats').update({ last_message_at: new Date().toISOString() }).eq('id', chatId);
    }
  }

  // ── Histório de conversa (30 msgs) ────────────────────────────────────────
  const deduped: { role: string; message: string }[] = [];
  for (const m of history) {
    if (deduped.length === 0 || deduped[deduped.length - 1].role !== m.role) {
      deduped.push({ ...m });
    } else {
      deduped[deduped.length - 1].message += '\n' + m.message;
    }
  }
  const contextMsgs = deduped.slice(-14).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.message }],
  }));

  // Log da mensagem do usuário
  const lastUserMsg = deduped.filter(m => m.role === 'user').pop()?.message ?? '';
  if (chatId && lastUserMsg) {
    await logMensagem(sb, chatId, agentId, tenantId, 'user', lastUserMsg);
  }

  // ── System prompt ─────────────────────────────────────────────────────────
  const arquivosPrompt = arquivos.length > 0
    ? `\n\nARQUIVOS DISPONÍVEIS PARA ENVIO:\n${arquivos.map(a => `- "${a.nome}"${a.descricao ? `: ${a.descricao}` : ''}`).join('\n')}\nSe quiser enviar um arquivo, adicione exatamente ao FINAL da sua resposta: [ARQUIVO:nome_exato]`
    : '';

  const nomeDesconhecido = clienteNome === phone;
  const contextoAbertura = mensagemInicial
    ? `\n\nReferência de tom e serviços da empresa: "${mensagemInicial}"`
    : '';

  const instrucoes = `\n\nRegras de comportamento:\n- BREVIDADE: respostas curtas (1 a 3 frases).\n- Use ferramentas para buscar dados do CRM antes de responder sobre negociações.\n- PROIBIDO emojis.\n- Se precisar enviar mais de uma mensagem, use [QUEBRA] entre elas (máximo 3 partes).\n- Se o assunto exigir atendimento humano, chame a ferramenta transferir_atendimento e adicione [TRANSFERIR] ao final.\n- Responda SOMENTE com o texto da mensagem final — sem JSON, sem marcadores extras.`;

  const systemPrompt = promptEstilo
    ? `${promptEstilo}${contextoAbertura}${instrucoes}${arquivosPrompt}`
    : `Você é um assistente de atendimento via WhatsApp. Seja direto e conciso.${contextoAbertura}${nomeDesconhecido ? ' Quando pertinente, pergunte o nome do cliente.' : ` O cliente se chama ${clienteNome}.`}${instrucoes}${arquivosPrompt}`;

  // ── Loop ReAct por provider ───────────────────────────────────────────────
  let resultado: { resposta: string; transferido: boolean; acoes: unknown[] };

  try {
    if (apiProvider === 'claude') {
      resultado = await reactClaude(apiKey, systemPrompt, contextMsgs, sb, tenantId, chatId, agentId);
    } else if (apiProvider === 'deepseek' || apiProvider === 'openai' || apiProvider === 'openai_compatible') {
      resultado = await reactOpenAI(apiKey, apiProvider, systemPrompt, contextMsgs, sb, tenantId, chatId, agentId);
    } else {
      resultado = await reactGemini(apiKey, systemPrompt, contextMsgs, sb, tenantId, chatId, agentId);
    }
  } catch (err) {
    console.error('[Runner] ReAct error:', String(err));
    resultado = { resposta: '', transferido: false, acoes: [] };
  }

  let { resposta, transferido, acoes } = resultado;

  // Limpar emojis e fallback
  resposta = resposta.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/gu, '').trim();
  if (!resposta || resposta.length < 5) {
    resposta = 'Desculpe, não consegui processar sua mensagem. Poderia repetir?';
  }

  // Detectar [TRANSFERIR] no texto (caso o modelo não usou a ferramenta)
  const transferirMatch = resposta.match(/\[TRANSFERIR\]\s*$/);
  if (transferirMatch) {
    resposta = resposta.replace(transferirMatch[0], '').trim();
    if (!transferido && negociacaoId) {
      await sb.from('crm_negociacoes')
        .update({ etapa: 'aguardando_humano', responsavel: 'Aguardando Atendente' })
        .eq('id', negociacaoId);
    }
    transferido = true;
  }

  // Log da resposta final do assistente
  if (chatId) {
    await logMensagem(sb, chatId, agentId, tenantId, 'assistant', resposta.replace(/\[QUEBRA\]/g, '\n'));
  }

  // Detectar nome do cliente na última mensagem
  let nomeDetectado: string | null = null;
  const nomeMatch = lastUserMsg.match(/(?:me chamo|meu nome é|sou o|sou a)\s+([A-ZÁÉÍÓÚÃÕÂÊÎÔÛÇ][a-záéíóúãõâêîôûç]+)/i);
  if (nomeMatch) nomeDetectado = nomeMatch[1];

  return json({ ok: true, resposta, transferido, nomeDetectado, acoes, chatId });
});
