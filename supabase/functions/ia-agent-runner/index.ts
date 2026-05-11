// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type, authorization' };
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface RunnerInput {
  agent_id:   string;
  tenant_id:  string;
  session_id: string; // identificador da sessão/conversa (ex: user_id, uuid gerado pelo frontend)
  message:    string; // mensagem do usuário
  // opcionais — se não informados, são lidos da tabela ia_agentes
  api_key?:      string;
  api_provider?: string;
  system_prompt?: string;
}

interface ToolContext {
  sb:           ReturnType<typeof createClient>;
  tenantId:     string;
  agentId:      string;
  sessionId:    string;
  chatId:       string;
  hasWebSearch: boolean;
  respostas:    string[]; // acumula respostas do tool `responder`
}

// ─── TOOLS ─────────────────────────────────────────────────────────────────

const TOOLS_DEF = [
  {
    name: 'responder',
    description: 'Envia uma resposta ao usuário. Use para TODA resposta ao usuário. Pode chamar múltiplas vezes para respostas sequenciais.',
    parameters: {
      type: 'OBJECT',
      properties: {
        mensagem: { type: 'STRING', description: 'Texto da resposta ao usuário.' },
      },
      required: ['mensagem'],
    },
  },
  {
    name: 'nao_responder',
    description: 'Use quando decidir NÃO enviar nenhuma resposta. Encerra o ciclo de raciocínio.',
    parameters: {
      type: 'OBJECT',
      properties: {
        motivo: { type: 'STRING', description: 'Razão pela qual não vai responder' },
      },
      required: [],
    },
  },
  {
    name: 'buscar_web',
    description: 'Realiza busca completa na internet. Retorna em 1 só crédito: resposta_direta (valor/resposta imediata quando disponível), noticias (manchetes recentes com data — explica movimentos de mercado), pessoas_perguntaram (perguntas relacionadas JÁ RESPONDIDAS, ex: "por que o dólar subiu?", "o que influenciou?"), resultados (até 10 páginas com snippets). IMPORTANTE: pessoas_perguntaram já contém respostas de contexto e causa — use esses dados sem fazer nova busca. 1 query bem formulada substitui 3 buscas.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Termos de busca — seja abrangente para capturar preço, contexto e causas de uma vez' },
      },
      required: ['query'],
    },
  },
  {
    name: 'buscar_dados',
    description: 'Busca dados em qualquer tabela do sistema. Use para consultar informações antes de agir.',
    parameters: {
      type: 'OBJECT',
      properties: {
        tabela:      { type: 'STRING', description: 'Nome da tabela (ex: crm_negociacoes, erp_produtos, hr_employees)' },
        filtros:     { type: 'OBJECT', description: 'Filtros como pares chave-valor' },
        colunas:     { type: 'STRING', description: 'Colunas a retornar (padrão: *)' },
        limite:      { type: 'NUMBER', description: 'Máximo de registros (padrão: 10)' },
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
    name: 'deletar_registro',
    description: 'Deleta registros do sistema. Use com cuidado.',
    parameters: {
      type: 'OBJECT',
      properties: {
        tabela:  { type: 'STRING' },
        id:      { type: 'STRING', description: 'UUID do registro (para deletar 1 específico)' },
        filtros: { type: 'OBJECT', description: 'Filtros para deletar múltiplos' },
      },
      required: ['tabela'],
    },
  },
  {
    name: 'buscar_memoria',
    description: 'Busca memórias persistentes do agente. Use para recuperar leis, personalidade, índice, conversas passadas, pesquisas, arquivos, dados, pedidos ou logs.',
    parameters: {
      type: 'OBJECT',
      properties: {
        tipo:  { type: 'STRING', description: 'Categoria: leis | personalidade | indice | essenciais | principais | conversas | pesquisas | arquivos | dados | pedidos | logs' },
        query: { type: 'STRING', description: 'Termo para filtrar por conteúdo (opcional)' },
      },
      required: ['tipo'],
    },
  },
  {
    name: 'atualizar_memoria',
    description: 'Cria ou atualiza uma memória persistente do agente. Use quando detectar informação importante para reter.',
    parameters: {
      type: 'OBJECT',
      properties: {
        tipo:        { type: 'STRING', description: 'Categoria: leis | personalidade | indice | essenciais | principais | conversas | pesquisas | arquivos | dados | pedidos | logs' },
        titulo:      { type: 'STRING', description: 'Título curto identificador da memória' },
        conteudo:    { type: 'STRING', description: 'Conteúdo completo da memória' },
        importancia: { type: 'NUMBER', description: 'Importância de 1 a 10 (padrão: 5)' },
      },
      required: ['tipo', 'titulo', 'conteudo'],
    },
  },
  {
    name: 'chamar_agente',
    description: 'Chama outro agente de IA e retorna a resposta dele. Use para delegar tarefas especializadas a outros agentes conectados no organograma.',
    parameters: {
      type: 'OBJECT',
      properties: {
        agent_id: { type: 'STRING', description: 'UUID do agente a ser chamado' },
        mensagem: { type: 'STRING', description: 'Mensagem ou instrução para o agente' },
      },
      required: ['agent_id', 'mensagem'],
    },
  },
];

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

// ─── EXECUTAR FERRAMENTA ─────────────────────────────────────────────────────

async function executarFerramenta(
  nome: string,
  params: Record<string, unknown>,
  ctx: ToolContext,
): Promise<unknown> {
  const { sb, tenantId } = ctx;

  switch (nome) {
    case 'responder': {
      const { mensagem } = params as { mensagem: string };
      if (!mensagem) return { erro: 'mensagem é obrigatória' };
      ctx.respostas.push(mensagem);
      await logMensagem(sb, ctx.chatId, ctx.agentId, tenantId, 'reply', mensagem, { tool_name: 'responder' });
      return { enviado: true };
    }

    case 'nao_responder': {
      return { silenciado: true, motivo: (params as any).motivo ?? '' };
    }

    case 'buscar_web': {
      if (!ctx.hasWebSearch) return { erro: 'Pesquisa web não disponível — conecte um card de pesquisa a este agente.' };
      const { query } = params as { query: string };
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/ia-web-search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
          body: JSON.stringify({ action: 'search', query, agent_id: ctx.agentId, tenant_id: ctx.tenantId }),
        });
        const d = await res.json().catch(() => ({})) as any;
        if (d.error) return { erro: d.error };
        return d;
      } catch (e) {
        return { erro: String(e) };
      }
    }

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

    case 'deletar_registro': {
      const { tabela, id, filtros } = params as any;
      let q: any = sb.from(tabela).delete();
      if (id) q = q.eq('id', id);
      if (filtros) {
        for (const [k, v] of Object.entries(filtros as Record<string, unknown>)) q = q.eq(k, String(v));
      }
      q = q.eq('tenant_id', tenantId);
      const { error } = await q;
      if (error) throw error;
      return { deletado: true };
    }

    case 'buscar_memoria': {
      const { tipo, query } = params as { tipo: string; query?: string };
      let q = sb.from('ia_memorias')
        .select('titulo, conteudo, importancia, updated_at')
        .eq('tenant_id', tenantId)
        .eq('agent_id', ctx.agentId)
        .eq('tipo', tipo)
        .order('importancia', { ascending: false })
        .limit(10);
      if (query) q = q.ilike('conteudo', `%${query}%`);
      const { data } = await q;
      return { tipo, memorias: data ?? [] };
    }

    case 'atualizar_memoria': {
      const { tipo, titulo, conteudo, importancia } = params as { tipo: string; titulo: string; conteudo: string; importancia?: number };
      const { data: existente } = await sb.from('ia_memorias')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('agent_id', ctx.agentId)
        .eq('tipo', tipo)
        .eq('titulo', titulo)
        .maybeSingle();
      if (existente) {
        await sb.from('ia_memorias').update({
          conteudo, importancia: importancia ?? 5,
          updated_at: new Date().toISOString(),
        }).eq('id', (existente as any).id);
        return { ok: true, acao: 'atualizado', titulo };
      }
      await sb.from('ia_memorias').insert({
        tenant_id: tenantId, agent_id: ctx.agentId,
        tipo, titulo, conteudo, importancia: importancia ?? 5,
      });
      return { ok: true, acao: 'criado', titulo };
    }

    case 'chamar_agente': {
      const { agent_id: targetAgentId, mensagem: agentMensagem } = params as { agent_id: string; mensagem: string };
      // Evita auto-chamada
      if (targetAgentId === ctx.agentId) return { erro: 'Um agente não pode chamar a si mesmo.' };
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/ia-agent-runner`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
          body: JSON.stringify({
            agent_id:   targetAgentId,
            tenant_id:  ctx.tenantId,
            session_id: `${ctx.sessionId}_sub_${targetAgentId.slice(0, 8)}`,
            message:    agentMensagem,
          }),
        });
        const d = await res.json() as any;
        if (!d.ok) return { erro: d.error ?? 'Agente retornou erro' };
        return { resposta: d.response ?? '(sem resposta)' };
      } catch (e) {
        return { erro: String(e) };
      }
    }

    default:
      return { erro: `Ferramenta desconhecida: ${nome}` };
  }
}

// ─── LOG ─────────────────────────────────────────────────────────────────────

async function logMensagem(
  sb: ReturnType<typeof createClient>,
  chatId: string,
  agentId: string,
  tenantId: string,
  role: string,
  content: string | null,
  extra: { tool_name?: string; tool_args?: unknown; tool_result?: unknown } = {},
): Promise<void> {
  const { error } = await sb.from('wa_agent_chat_messages').insert({
    chat_id:     chatId,
    agent_id:    agentId,
    tenant_id:   tenantId,
    role,
    content,
    tool_name:   extra.tool_name   ?? null,
    tool_args:   extra.tool_args   ?? null,
    tool_result: extra.tool_result ?? null,
  });
  if (error) console.error('[ia-agent-runner] logMensagem error:', error.message, '| role:', role);
}

// ─── REACT LOOPS ─────────────────────────────────────────────────────────────

interface RunResult { silenciado: boolean; acoes: unknown[] }

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

async function reactGemini(
  apiKey: string,
  systemPrompt: string,
  contextMsgs: { role: string; parts: { text: string }[] }[],
  sb: ReturnType<typeof createClient>,
  ctx: ToolContext,
  chatId: string,
  agentId: string,
): Promise<RunResult> {
  const contents = [...contextMsgs];
  const acoes: unknown[] = [];
  let silenciado = false;
  let nudged = false;
  let rodadasComErro = 0;

  const NUDGE = ctx.hasWebSearch
    ? 'Você gerou texto mas não chamou nenhuma ferramenta. ATENÇÃO: se era uma PERGUNTA, chame `buscar_web` primeiro. Textos sem ferramenta são descartados. Use `responder` para responder, `nao_responder` para silenciar.'
    : 'Você gerou texto mas não chamou nenhuma ferramenta. Textos sem ferramenta são descartados. Use `responder` para responder, `nao_responder` para silenciar.';

  for (let i = 0; i < 10; i++) {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
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
    const thinkText = parts.filter((p: any) => p.text).map((p: any) => p.text).join('');

    if (thinkText.trim()) await logMensagem(sb, chatId, agentId, ctx.tenantId, 'thought', thinkText);

    if (funcCalls.length === 0) {
      if (thinkText.trim() && !nudged) {
        nudged = true;
        contents.push({ role: 'model', parts });
        contents.push({ role: 'user', parts: [{ text: NUDGE }] });
        continue;
      }
      if (thinkText.trim() && nudged && ctx.respostas.length === 0) {
        try { await executarFerramenta('responder', { mensagem: thinkText.trim() }, ctx); } catch { /* ignore */ }
      }
      break;
    }

    const funcResults = [];
    let houveErroNessaRodada = false;
    for (const part of funcCalls) {
      const { name, args } = part.functionCall;
      await logMensagem(sb, chatId, agentId, ctx.tenantId, 'tool_call', null, { tool_name: name, tool_args: args });
      let resultado: unknown;
      try {
        resultado = await executarFerramenta(name, args, ctx);
        if (name === 'nao_responder') silenciado = true;
      } catch (err) { resultado = { erro: String(err) }; houveErroNessaRodada = true; }
      await logMensagem(sb, chatId, agentId, ctx.tenantId, 'tool_result',
        name === 'buscar_web' ? JSON.stringify(resultado) : null,
        { tool_name: name, tool_result: resultado });
      acoes.push({ ferramenta: name, args, resultado });
      funcResults.push({ role: 'function', parts: [{ functionResponse: { name, response: { resultado } } }] });
    }
    contents.push({ role: 'model', parts });
    contents.push(...funcResults);

    if (houveErroNessaRodada) { if (++rodadasComErro >= 3) break; } else { rodadasComErro = 0; }
    if (silenciado) break;
    if (ctx.respostas.length > 0) break;
  }
  return { silenciado, acoes };
}

async function reactOpenAI(
  apiKey: string,
  provider: string,
  systemPrompt: string,
  contextMsgs: { role: string; parts: { text: string }[] }[],
  sb: ReturnType<typeof createClient>,
  ctx: ToolContext,
  chatId: string,
  agentId: string,
): Promise<RunResult> {
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
  let silenciado = false;
  let nudged = false;
  let rodadasComErro = 0;

  const NUDGE = ctx.hasWebSearch
    ? 'Você gerou texto mas não chamou nenhuma ferramenta. ATENÇÃO: se era uma PERGUNTA, chame `buscar_web` primeiro. Textos sem ferramenta são descartados. Use `responder` para responder, `nao_responder` para silenciar.'
    : 'Você gerou texto mas não chamou nenhuma ferramenta. Textos sem ferramenta são descartados. Use `responder` para responder, `nao_responder` para silenciar.';

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

    if (msg?.content?.trim()) await logMensagem(sb, chatId, agentId, ctx.tenantId, 'thought', msg.content);

    if (!msg?.tool_calls || msg.tool_calls.length === 0) {
      if (msg?.content?.trim() && !nudged) {
        nudged = true;
        messages.push(msg);
        messages.push({ role: 'user', content: NUDGE });
        continue;
      }
      if (msg?.content?.trim() && nudged && ctx.respostas.length === 0) {
        try { await executarFerramenta('responder', { mensagem: msg.content.trim() }, ctx); } catch { /* ignore */ }
      }
      break;
    }

    messages.push(msg);

    let houveErroNessaRodada = false;
    for (const tc of msg.tool_calls) {
      const name = tc.function.name;
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(tc.function.arguments); } catch { /* ignore */ }
      await logMensagem(sb, chatId, agentId, ctx.tenantId, 'tool_call', null, { tool_name: name, tool_args: args });
      let resultado: unknown;
      try {
        resultado = await executarFerramenta(name, args, ctx);
        if (name === 'nao_responder') silenciado = true;
      } catch (err) { resultado = { erro: String(err) }; houveErroNessaRodada = true; }
      await logMensagem(sb, chatId, agentId, ctx.tenantId, 'tool_result',
        name === 'buscar_web' ? JSON.stringify(resultado) : null,
        { tool_name: name, tool_result: resultado });
      acoes.push({ ferramenta: name, args, resultado });
      messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(resultado) });
    }

    if (houveErroNessaRodada) { if (++rodadasComErro >= 3) break; } else { rodadasComErro = 0; }
    if (silenciado) break;
    if (ctx.respostas.length > 0) break;
  }
  return { silenciado, acoes };
}

async function reactClaude(
  apiKey: string,
  systemPrompt: string,
  contextMsgs: { role: string; parts: { text: string }[] }[],
  sb: ReturnType<typeof createClient>,
  ctx: ToolContext,
  chatId: string,
  agentId: string,
): Promise<RunResult> {
  const messages: any[] = contextMsgs.map(m => ({
    role: m.role === 'model' ? 'assistant' : 'user',
    content: m.parts[0].text,
  }));
  const tools = toAnthropicTools(TOOLS_DEF);
  const acoes: unknown[] = [];
  let silenciado = false;
  let nudged = false;
  let rodadasComErro = 0;

  const NUDGE = ctx.hasWebSearch
    ? 'Você gerou texto mas não chamou nenhuma ferramenta. ATENÇÃO: se era uma PERGUNTA, chame `buscar_web` primeiro. Textos sem ferramenta são descartados. Use `responder` para responder, `nao_responder` para silenciar.'
    : 'Você gerou texto mas não chamou nenhuma ferramenta. Textos sem ferramenta são descartados. Use `responder` para responder, `nao_responder` para silenciar.';

  for (let i = 0; i < 10; i++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'tools-2024-04-04',
      },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 4096, system: systemPrompt, tools, messages }),
    });
    const d = await res.json() as any;
    if (d.error) throw new Error(`Claude: ${JSON.stringify(d.error)}`);

    const content = d.content ?? [];
    const toolUses = content.filter((b: any) => b.type === 'tool_use');
    const textBlocks = content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');

    if (textBlocks.trim()) await logMensagem(sb, chatId, agentId, ctx.tenantId, 'thought', textBlocks);

    if (toolUses.length === 0 || d.stop_reason === 'end_turn') {
      if (textBlocks.trim() && !nudged) {
        nudged = true;
        messages.push({ role: 'assistant', content });
        messages.push({ role: 'user', content: NUDGE });
        continue;
      }
      if (textBlocks.trim() && nudged && ctx.respostas.length === 0) {
        try { await executarFerramenta('responder', { mensagem: textBlocks.trim() }, ctx); } catch { /* ignore */ }
      }
      break;
    }

    messages.push({ role: 'assistant', content });

    const toolResults: any[] = [];
    let houveErroNessaRodada = false;
    for (const tu of toolUses) {
      await logMensagem(sb, chatId, agentId, ctx.tenantId, 'tool_call', null, { tool_name: tu.name, tool_args: tu.input });
      let resultado: unknown;
      try {
        resultado = await executarFerramenta(tu.name, tu.input, ctx);
        if (tu.name === 'nao_responder') silenciado = true;
      } catch (err) { resultado = { erro: String(err) }; houveErroNessaRodada = true; }
      await logMensagem(sb, chatId, agentId, ctx.tenantId, 'tool_result',
        tu.name === 'buscar_web' ? JSON.stringify(resultado) : null,
        { tool_name: tu.name, tool_result: resultado });
      acoes.push({ ferramenta: tu.name, args: tu.input, resultado });
      toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(resultado) });
    }
    messages.push({ role: 'user', content: toolResults });

    if (houveErroNessaRodada) { if (++rodadasComErro >= 3) break; } else { rodadasComErro = 0; }
    if (silenciado) break;
    if (ctx.respostas.length > 0) break;
  }
  return { silenciado, acoes };
}

// ─── HANDLER ─────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  let input: RunnerInput;
  try { input = await req.json(); } catch { return json({ ok: false, error: 'JSON inválido' }, 400); }

  const { agent_id: agentId, tenant_id: tenantId, session_id: sessionId, message } = input;

  if (!agentId || !tenantId || !sessionId || !message) {
    return json({ ok: false, error: 'agent_id, tenant_id, session_id e message são obrigatórios' }, 400);
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Carrega config do agente do banco (api_key, api_provider, system_prompt)
  const { data: agente } = await sb
    .from('ia_agentes')
    .select('nome, instrucoes, api_code, api_provider')
    .eq('id', agentId)
    .maybeSingle() as any;

  if (!agente) return json({ ok: false, error: 'Agente não encontrado' }, 404);

  // Resolve api_code → chave real (igual ao whatsapp-webhook)
  let apiKey = input.api_key ?? '';
  if (!apiKey && agente.api_code) {
    apiKey = Deno.env.get(agente.api_code) ?? '';
  }
  const apiProvider = input.api_provider ?? agente.api_provider ?? 'gemini';
  const systemPromptBase = input.system_prompt ?? agente.instrucoes ?? '';

  if (!apiKey) return json({ ok: false, error: `api_key não encontrada — verifique o secret "${agente.api_code}" no Supabase` }, 400);

  // Verifica se o agente tem card de busca web
  const { data: wsCheck } = await sb.rpc('check_agent_web_search', { agent_uuid: agentId });
  const hasWebSearch = wsCheck === true;

  // Cria ou recupera sessão (reutiliza wa_agent_chats com session_id como phone)
  let chatId: string;
  {
    const { data: existing } = await sb
      .from('wa_agent_chats').select('id')
      .eq('agent_id', agentId).eq('phone', sessionId).maybeSingle();

    if (existing?.id) {
      chatId = existing.id as string;
    } else {
      const { data: novo } = await sb
        .from('wa_agent_chats')
        .insert({ agent_id: agentId, tenant_id: tenantId, phone: sessionId, titulo: `Chat ${sessionId.slice(0, 8)}`, last_message_at: new Date().toISOString() })
        .select('id').single();
      chatId = (novo?.id as string) ?? '';
    }
    if (chatId) {
      await sb.from('wa_agent_chats').update({ last_message_at: new Date().toISOString() }).eq('id', chatId);
    }
  }

  // Registra mensagem do usuário
  await logMensagem(sb, chatId, agentId, tenantId, 'user', message);

  // Carrega histórico
  const { data: histRows } = await sb
    .from('wa_agent_chat_messages')
    .select('role, content')
    .eq('chat_id', chatId)
    .in('role', ['user', 'reply'])
    .order('created_at', { ascending: false })
    .limit(20);

  const chronologicalRows = (histRows ?? []).reverse();
  const deduped: { role: string; content: string }[] = [];
  for (const m of chronologicalRows) {
    if (deduped.length === 0 || deduped[deduped.length - 1].role !== m.role) {
      deduped.push({ role: m.role, content: m.content ?? '' });
    } else {
      deduped[deduped.length - 1].content += '\n' + (m.content ?? '');
    }
  }

  const contextMsgs = deduped.slice(-14).map(m => ({
    role: m.role === 'reply' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  // Marca a última mensagem como mensagem atual
  if (contextMsgs.length > 0 && contextMsgs[contextMsgs.length - 1].role === 'user') {
    const last = contextMsgs[contextMsgs.length - 1];
    contextMsgs[contextMsgs.length - 1] = {
      role: 'user',
      parts: [{ text: `[MENSAGEM ATUAL — responda a esta]: ${last.parts[0].text}` }],
    };
  }

  // Carrega últimas pesquisas para evitar repetição
  const { data: buscasRows } = await sb
    .from('wa_agent_chat_messages')
    .select('content')
    .eq('chat_id', chatId)
    .eq('role', 'tool_result')
    .eq('tool_name', 'buscar_web')
    .not('content', 'is', null)
    .order('created_at', { ascending: false })
    .limit(3);

  const buscasCtx = buscasRows?.length
    ? `\n\nPESQUISAS JÁ REALIZADAS NESTA CONVERSA — use estes dados antes de buscar novamente:\n` +
      (buscasRows).reverse().map((b: any, i: number) => `[Busca ${i + 1}]: ${b.content}`).join('\n---\n')
    : '';

  // Carrega memórias essenciais
  const { data: memoriasRows } = await sb.from('ia_memorias')
    .select('tipo, titulo, conteudo, importancia')
    .eq('tenant_id', tenantId)
    .eq('agent_id', agentId)
    .in('tipo', ['leis', 'personalidade', 'indice', 'essenciais'])
    .order('importancia', { ascending: false })
    .limit(20);
  const memoriasCtx = memoriasRows?.length
    ? `\n\nMEMÓRIAS DO AGENTE (carregadas automaticamente — siga obrigatoriamente):\n` +
      memoriasRows.map((m: any) => `[${m.tipo.toUpperCase()}] ${m.titulo}: ${m.conteudo}`).join('\n')
    : '';

  const hoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' });

  const instrucoes = `\n\nDATA ATUAL: ${hoje}. Use esta data em todas as pesquisas e respostas.\n\nREGRAS OBRIGATÓRIAS:\n1. Para responder ao usuário: chame a ferramenta \`responder\` com o texto.\n2. Pode chamar \`responder\` múltiplas vezes para respostas sequenciais.\n3. Quando terminar (após responder OU decidir não responder): encerre o ciclo.\n4. Se NÃO for responder: chame \`nao_responder\` com o motivo.\n5. Para pesquisar mais informações: use \`buscar_web\` ou \`buscar_dados\`.\n6. NUNCA gere texto de resposta diretamente — use SEMPRE as ferramentas.\n7. ANTES de chamar buscar_web: verifique se o tema já foi pesquisado em "PESQUISAS JÁ REALIZADAS" — se sim, use aqueles dados diretamente. buscar_web retorna resposta_direta, noticias, pessoas_perguntaram E resultados em 1 só crédito. PROIBIDO chamar buscar_web 2x sobre o mesmo tema.\n8. NUNCA invente valores numéricos (preços, cotações, porcentagens) — use SOMENTE valores que apareçam literalmente nos resultados da busca.\n9. MEMÓRIA: use buscar_memoria para recuperar contexto específico de qualquer pasta. Use atualizar_memoria quando detectar algo importante para reter. As memórias de leis/personalidade/índice/essenciais já estão carregadas no contexto acima.`;

  const prefixo = `INSTRUÇÃO PRIORITÁRIA:\nLeia o histórico e identifique a mensagem marcada como [MENSAGEM ATUAL]. RESPONDA EXATAMENTE ao que ela pede.\n\n`;

  const systemPrompt = systemPromptBase
    ? `${prefixo}${systemPromptBase}${instrucoes}${memoriasCtx}${buscasCtx}`
    : `${prefixo}Você é um assistente inteligente. Seja direto e conciso.${instrucoes}${memoriasCtx}${buscasCtx}`;

  const ctx: ToolContext = {
    sb, tenantId, agentId, sessionId, chatId, hasWebSearch, respostas: [],
  };

  let resultado: RunResult;
  try {
    if (apiProvider === 'claude') {
      resultado = await reactClaude(apiKey, systemPrompt, contextMsgs, sb, ctx, chatId, agentId);
    } else if (apiProvider === 'deepseek' || apiProvider === 'openai' || apiProvider === 'openai_compatible') {
      resultado = await reactOpenAI(apiKey, apiProvider, systemPrompt, contextMsgs, sb, ctx, chatId, agentId);
    } else {
      resultado = await reactGemini(apiKey, systemPrompt, contextMsgs, sb, ctx, chatId, agentId);
    }
  } catch (err) {
    const errMsg = String(err);
    console.error('[ia-agent-runner] erro ReAct:', errMsg);
    await logMensagem(sb, chatId, agentId, tenantId, 'thought', `[ERROR] ${errMsg}`);
    resultado = { silenciado: false, acoes: [] };
  }

  const { silenciado, acoes } = resultado;
  const resposta = ctx.respostas.join('\n\n');

  await logMensagem(sb, chatId, agentId, tenantId, 'assistant',
    ctx.respostas.length > 0 ? `[${ctx.respostas.length} resposta(s) gerada(s)]` :
    silenciado               ? '[agente silenciou — sem resposta]' :
                               '[agente não respondeu]'
  );

  return json({
    ok:        true,
    response:  resposta || null,
    silenciado,
    chat_id:   chatId,
    acoes,
  });
});
