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
  session_id: string;
  message:    string;
  api_key?:      string;
  api_provider?: string;
  system_prompt?: string;
  call_depth?:              number;
  message_already_logged?:  boolean;
}

interface ToolContext {
  sb:                  ReturnType<typeof createClient>;
  tenantId:            string;
  agentId:             string;
  agentNome:           string;
  grauHierarquico:     number;
  sessionId:           string;
  chatId:              string;
  hasWebSearch:        boolean;
  respostas:           string[];
  callDepth:           number;
  totalChamadasAgente: number;
  analiseDeclarada:    boolean;
  respostaBloqueada:   number;
}

const TOOLS_DEF = [
  {
    name: 'declarar_raciocinio',
    description: 'OBRIGATORIO antes de chamar responder(). Declare o raciocinio seguido nas etapas 1-4. responder() sera BLOQUEADO ate esta ferramenta ser chamada.',
    parameters: {
      type: 'OBJECT',
      properties: {
        contexto:          { type: 'STRING',  description: 'O que o usuario quer (ETAPA 1)' },
        leis_verificadas:  { type: 'BOOLEAN', description: 'Confirma que leis essenciais foram lidas (ETAPA 2a)' },
        indice_consultado: { type: 'BOOLEAN', description: 'Confirma que indice de memorias foi consultado (ETAPA 2b)' },
        decisao:           { type: 'STRING',  description: 'Ferramentas/memorias que serao usadas e por que (ETAPA 2c)' },
        validacao_ok:      { type: 'BOOLEAN', description: 'Confirma que a resposta nao viola nenhuma lei (ETAPA 4)' },
      },
      required: ['contexto', 'leis_verificadas', 'validacao_ok'],
    },
  },
  {
    name: 'responder',
    description: 'Envia uma resposta ao usuario. REQUER declarar_raciocinio() antes - sera bloqueado caso contrario. Pode chamar multiplas vezes para respostas sequenciais.',
    parameters: {
      type: 'OBJECT',
      properties: {
        mensagem: { type: 'STRING', description: 'Texto da resposta ao usuario.' },
      },
      required: ['mensagem'],
    },
  },
  {
    name: 'nao_responder',
    description: 'Use quando decidir NAO enviar nenhuma resposta. Encerra o ciclo de raciocinio.',
    parameters: {
      type: 'OBJECT',
      properties: {
        motivo: { type: 'STRING', description: 'Razao pela qual nao vai responder' },
      },
      required: [],
    },
  },
  {
    name: 'buscar_web',
    description: 'Realiza busca na internet. Retorna resposta_direta, noticias, pessoas_perguntaram, resultados.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Termos de busca' },
      },
      required: ['query'],
    },
  },
  {
    name: 'buscar_dados',
    description: 'Busca dados em qualquer tabela do sistema. Use para consultar informacoes antes de agir.',
    parameters: {
      type: 'OBJECT',
      properties: {
        tabela:      { type: 'STRING', description: 'Nome da tabela' },
        filtros:     { type: 'OBJECT', description: 'Filtros como pares chave-valor' },
        colunas:     { type: 'STRING', description: 'Colunas a retornar (padrao: *)' },
        limite:      { type: 'NUMBER', description: 'Maximo de registros (padrao: 10)' },
        ordenar_por: { type: 'STRING', description: 'campo.desc ou campo.asc' },
      },
      required: ['tabela'],
    },
  },
  {
    name: 'criar_registro',
    description: 'Cria um novo registro em qualquer tabela do sistema. NAO inclua tenant_id.',
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
        id:      { type: 'STRING', description: 'UUID do registro' },
        filtros: { type: 'OBJECT', description: 'Filtros para editar multiplos' },
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
        id:      { type: 'STRING', description: 'UUID do registro' },
        filtros: { type: 'OBJECT', description: 'Filtros para deletar multiplos' },
      },
      required: ['tabela'],
    },
  },
  {
    name: 'buscar_memoria',
    description: 'Busca memorias persistentes do agente.',
    parameters: {
      type: 'OBJECT',
      properties: {
        tipo:  { type: 'STRING', description: 'Categoria' },
        query: { type: 'STRING', description: 'Termo para filtrar' },
      },
      required: ['tipo'],
    },
  },
  {
    name: 'atualizar_memoria',
    description: 'Cria ou atualiza uma memoria persistente do agente.',
    parameters: {
      type: 'OBJECT',
      properties: {
        tipo:        { type: 'STRING' },
        titulo:      { type: 'STRING' },
        conteudo:    { type: 'STRING' },
        importancia: { type: 'NUMBER' },
      },
      required: ['tipo', 'titulo', 'conteudo'],
    },
  },
  {
    name: 'chamar_agente',
    description: 'Conversa com outro agente de IA.',
    parameters: {
      type: 'OBJECT',
      properties: {
        agent_id: { type: 'STRING' },
        mensagem: { type: 'STRING' },
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

const TABELAS_PERMITIDAS = new Set([
  'employees', 'hr_employees', 'hr_alerts',
  'crm_negociacoes', 'crm_orcamentos', 'crm_contatos', 'crm_leads', 'crm_atividades',
  'erp_pedidos', 'erp_produtos', 'erp_clientes', 'erp_fornecedores',
  'erp_estoque_movimentos', 'erp_financeiro_lancamentos',
  'fin_nos_custo', 'erp_comissoes_lancamentos', 'erp_assinaturas',
  'assets', 'asset_work_orders', 'asset_maintenance_plans', 'eam_asset_alerts',
  'ia_agentes', 'ia_conversas', 'ia_mensagens', 'ia_memorias', 'ia_solicitacoes',
  'wa_agent_chats', 'wa_agent_chat_messages', 'wa_agent_numeros_confianca',
]);

async function executarFerramenta(
  nome: string,
  params: Record<string, unknown>,
  ctx: ToolContext,
): Promise<unknown> {
  const { sb, tenantId } = ctx;

  switch (nome) {
    case 'declarar_raciocinio': {
      ctx.analiseDeclarada = true;
      const { decisao } = params as any;
      return { ok: true, pode_responder: true, decisao: decisao ?? '' };
    }

    case 'responder': {
      if (!ctx.analiseDeclarada) {
        ctx.respostaBloqueada++;
        if (ctx.respostaBloqueada <= 2) {
          return { erro: 'PROTOCOLO VIOLADO: chame declarar_raciocinio() antes de responder().' };
        }
      }
      const { mensagem } = params as { mensagem: string };
      if (!mensagem) return { erro: 'mensagem e obrigatoria' };
      ctx.respostas.push(mensagem);
      await logMensagem(sb, ctx.chatId, ctx.agentId, tenantId, 'reply', mensagem, { tool_name: 'responder' });
      return { enviado: true };
    }

    case 'nao_responder': {
      return { silenciado: true, motivo: (params as any).motivo ?? '' };
    }

    case 'buscar_web': {
      if (!ctx.hasWebSearch) return { erro: 'Pesquisa web nao disponivel.' };
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
      if (!TABELAS_PERMITIDAS.has(tabela)) {
        return { erro: `Tabela '${tabela}' nao autorizada.` };
      }
      let q = sb.from(tabela).select(colunas ?? '*').eq('tenant_id', tenantId).limit(limite ?? 10);
      if (filtros) {
        for (const [k, v] of Object.entries(filtros as Record<string, unknown>)) q = (q as any).eq(k, String(v));
      }
      if (ordenar_por) {
        const [campo, dir] = String(ordenar_por).split('.');
        q = (q as any).order(campo, { ascending: dir !== 'desc' });
      }
      const { data, error } = await q;
      if (error) {
        console.error(`[buscar_dados] tabela=${tabela} erro:`, JSON.stringify(error));
        throw new Error(error.message ?? error.details ?? JSON.stringify(error));
      }
      return { registros: data, total: data?.length ?? 0 };
    }

    case 'criar_registro': {
      const { tabela, dados } = params as any;
      if (!TABELAS_PERMITIDAS.has(tabela)) {
        return { erro: `Tabela '${tabela}' nao autorizada.` };
      }
      const { data, error } = await sb.from(tabela).insert({ ...dados, tenant_id: tenantId }).select().single();
      if (error) return { erro: error.message ?? String(error), code: (error as any).code, detail: (error as any).details ?? null, hint: (error as any).hint ?? null };
      return { criado: true, registro: data };
    }

    case 'editar_registro': {
      const { tabela, id, filtros, dados } = params as any;
      if (!TABELAS_PERMITIDAS.has(tabela)) {
        return { erro: `Tabela '${tabela}' nao autorizada.` };
      }
      const { tenant_id: _t, ...clean } = dados as any;
      let q: any = sb.from(tabela).update(clean);
      if (id) q = q.eq('id', id);
      if (filtros) {
        for (const [k, v] of Object.entries(filtros as Record<string, unknown>)) q = q.eq(k, String(v));
      }
      q = q.eq('tenant_id', tenantId);
      const { data, error } = await q.select();
      if (error) return { erro: error.message ?? String(error), code: (error as any).code, detail: (error as any).details ?? null, hint: (error as any).hint ?? null };
      return { editado: true, registros_afetados: (data as unknown[])?.length ?? 0 };
    }

    case 'deletar_registro': {
      const { tabela, id, filtros } = params as any;
      if (!TABELAS_PERMITIDAS.has(tabela)) {
        return { erro: `Tabela '${tabela}' nao autorizada.` };
      }
      let q: any = sb.from(tabela).delete();
      if (id) q = q.eq('id', id);
      if (filtros) {
        for (const [k, v] of Object.entries(filtros as Record<string, unknown>)) q = q.eq(k, String(v));
      }
      q = q.eq('tenant_id', tenantId);
      const { error } = await q;
      if (error) return { erro: error.message ?? String(error), code: (error as any).code, detail: (error as any).details ?? null, hint: (error as any).hint ?? null };
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
      if (targetAgentId === ctx.agentId) return { erro: 'Um agente nao pode chamar a si mesmo.' };
      if (ctx.callDepth >= 3) return { erro: 'Profundidade maxima de chamadas atingida.' };
      if (ctx.totalChamadasAgente >= 8) {
        return { erro: 'Limite de chamadas atingido.' };
      }
      ctx.totalChamadasAgente++;
      const msgComCaller = `[De: ${ctx.agentNome} | Grau ${ctx.grauHierarquico}/10]: ${agentMensagem}`;
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/ia-agent-runner`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
          body: JSON.stringify({
            agent_id:   targetAgentId,
            tenant_id:  ctx.tenantId,
            session_id: `${ctx.sessionId}_sub_${targetAgentId.slice(0, 8)}`,
            message:    msgComCaller,
            call_depth: ctx.callDepth + 1,
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
  let thoughtLogged = false;
  let rodadasComErro = 0;

  const NUDGE = 'Voce gerou texto mas nao chamou nenhuma ferramenta. Use responder ou nao_responder.';

  for (let i = 0; i < 10; i++) {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        tools: [{ function_declarations: TOOLS_DEF }],
        toolConfig: { function_calling_config: { mode: 'ANY' } },
        generationConfig: { maxOutputTokens: 4096 },
      }),
    });
    const d = await res.json() as any;
    if (d.error) throw new Error(`Gemini: ${d.error.message}`);

    const parts = d.candidates?.[0]?.content?.parts ?? [];
    const funcCalls = parts.filter((p: any) => p.functionCall);
    const thinkText = parts.filter((p: any) => p.text).map((p: any) => p.text).join('');

    if (thinkText.trim() && !thoughtLogged) {
      await logMensagem(sb, chatId, agentId, ctx.tenantId, 'thought', thinkText);
      thoughtLogged = true;
    }

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
      } catch (err) { resultado = { erro: (err as any)?.message ?? String(err) }; houveErroNessaRodada = true; }
      const resultContent = name !== 'responder' ? JSON.stringify(resultado) : null;
      await logMensagem(sb, chatId, agentId, ctx.tenantId, 'tool_result',
        resultContent,
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
  modelName: string,
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
  const model = modelName || (provider === 'deepseek' ? 'deepseek-chat' : 'gpt-4o');
  // reasoning models (deepseek-reasoner, v4-flash, v4-pro etc.) don't support tool_choice:'required'
  const isReasoningModel = model.includes('reasoner') || model.includes('v4-flash') || model.includes('v4-pro') || model.includes('think') || model.includes('-r1');
  const toolChoice = isReasoningModel ? 'auto' : 'required';

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
  let thoughtLogged = false;
  let rodadasComErro = 0;

  const NUDGE = 'Voce gerou texto mas nao chamou nenhuma ferramenta. Use responder ou nao_responder.';

  for (let i = 0; i < 10; i++) {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, tools, tool_choice: toolChoice, max_tokens: 4096 }),
    });
    const d = await res.json() as any;
    if (d.error) throw new Error(`${provider}: ${JSON.stringify(d.error)}`);

    const choice = d.choices?.[0];
    const msg = choice?.message;

    if (msg?.content?.trim() && !thoughtLogged) {
      await logMensagem(sb, chatId, agentId, ctx.tenantId, 'thought', msg.content);
      thoughtLogged = true;
    }

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
      } catch (err) { resultado = { erro: (err as any)?.message ?? String(err) }; houveErroNessaRodada = true; }
      await logMensagem(sb, chatId, agentId, ctx.tenantId, 'tool_result',
        name !== 'responder' ? JSON.stringify(resultado) : null,
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
  let thoughtLogged = false;
  let rodadasComErro = 0;

  const NUDGE = 'Voce gerou texto mas nao chamou nenhuma ferramenta. Use responder ou nao_responder.';

  for (let i = 0; i < 10; i++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'tools-2024-04-04',
      },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 4096, system: systemPrompt, tools, tool_choice: { type: 'any' }, messages }),
    });
    const d = await res.json() as any;
    if (d.error) throw new Error(`Claude: ${JSON.stringify(d.error)}`);

    const content = d.content ?? [];
    const toolUses = content.filter((b: any) => b.type === 'tool_use');
    const textBlocks = content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');

    if (textBlocks.trim() && !thoughtLogged) {
      await logMensagem(sb, chatId, agentId, ctx.tenantId, 'thought', textBlocks);
      thoughtLogged = true;
    }

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
      } catch (err) { resultado = { erro: (err as any)?.message ?? String(err) }; houveErroNessaRodada = true; }
      await logMensagem(sb, chatId, agentId, ctx.tenantId, 'tool_result',
        tu.name !== 'responder' ? JSON.stringify(resultado) : null,
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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  let input: RunnerInput;
  try { input = await req.json(); } catch { return json({ ok: false, error: 'JSON invalido' }, 400); }

  const { agent_id: agentId, tenant_id: tenantId, session_id: sessionId, message, message_already_logged } = input;

  if (!agentId || !tenantId || !sessionId || !message) {
    return json({ ok: false, error: 'agent_id, tenant_id, session_id e message sao obrigatorios' }, 400);
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { data: agente, error: agenteErr } = await sb
    .from('ia_agentes')
    .select('nome, system_prompt, api_code, api_provider, grau_hierarquico, modelo')
    .eq('id', agentId)
    .maybeSingle() as any;

  if (agenteErr) console.error('[ia-agent-runner] erro ao buscar agente:', agenteErr.message);
  if (!agente) return json({ ok: false, error: `Agente nao encontrado (id=${agentId})` }, 404);

  const grauHierarquico: number = agente.grau_hierarquico ?? 5;
  const agentNome: string = agente.nome ?? 'Agente';

  let apiKey = input.api_key ?? '';
  if (!apiKey && agente.api_code) {
    apiKey = Deno.env.get(agente.api_code) ?? '';
  }
  const apiProvider = input.api_provider ?? agente.api_provider ?? 'gemini';
  const agentModel: string = agente.modelo ?? '';
  const systemPromptBase = input.system_prompt ?? agente.system_prompt ?? '';

  if (!apiKey) return json({ ok: false, error: `api_key nao encontrada - verifique o secret '${agente.api_code}'` }, 400);

  const { data: wsCheck } = await sb.rpc('check_agent_web_search', { agent_uuid: agentId });
  const hasWebSearch = wsCheck === true;

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

  if (!message_already_logged) {
    await logMensagem(sb, chatId, agentId, tenantId, 'user', message);
  }

  const { data: histRows } = await sb
    .from('wa_agent_chat_messages')
    .select('role, content')
    .eq('chat_id', chatId)
    .in('role', ['user', 'reply'])
    .order('created_at', { ascending: false })
    .limit(60);

  const chronologicalRows = (histRows ?? []).reverse();
  const deduped: { role: string; content: string }[] = [];
  for (const m of chronologicalRows) {
    if (!m.content?.trim()) continue;
    if (deduped.length === 0 || deduped[deduped.length - 1].role !== m.role) {
      deduped.push({ role: m.role, content: m.content });
    } else {
      deduped[deduped.length - 1].content += '\n' + m.content;
    }
  }

  let sliced = deduped.slice(-20);
  while (sliced.length > 0 && sliced[0].role !== 'user') sliced = sliced.slice(1);

  const contextMsgs = sliced.map(m => ({
    role: m.role === 'reply' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  if (contextMsgs.length > 0 && contextMsgs[contextMsgs.length - 1].role === 'user') {
    const last = contextMsgs[contextMsgs.length - 1];
    contextMsgs[contextMsgs.length - 1] = {
      role: 'user',
      parts: [{ text: `[MENSAGEM ATUAL - responda a esta]: ${last.parts[0].text}` }],
    };
  }

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
    ? `\n\nPESQUISAS JA REALIZADAS NESTA CONVERSA:\n` +
      (buscasRows).reverse().map((b: any, i: number) => `[Busca ${i + 1}]: ${b.content}`).join('\n---\n')
    : '';

  const { data: memoriasRows } = await sb.from('ia_memorias')
    .select('tipo, titulo, conteudo, importancia')
    .eq('tenant_id', tenantId)
    .eq('agent_id', agentId)
    .in('tipo', ['leis', 'personalidade', 'indice', 'essenciais'])
    .order('importancia', { ascending: false })
    .limit(20);
  const memoriasCtx = memoriasRows?.length
    ? `\n\nMEMORIAS DO AGENTE (siga obrigatoriamente):\n` +
      memoriasRows.map((m: any) => `[${m.tipo.toUpperCase()}] ${m.titulo}: ${m.conteudo}`).join('\n')
    : `\n\n[MEMORIAS: nenhuma memoria essencial cadastrada]`;

  const { data: numerosConfianca } = await sb
    .from('wa_agent_numeros_confianca')
    .select('phone, nome, descricao, pode_visualizar, pode_editar, pode_criar, pode_apagar')
    .eq('agent_id', agentId)
    .eq('tenant_id', tenantId);

  const numerosCtx = numerosConfianca?.length
    ? `\n\n############################################################\n` +
      `### NUMEROS/USUARIOS DE CONFIANCA - DADOS DISPONIVEIS AQUI ###\n` +
      `############################################################\n` +
      `Total cadastrado: ${(numerosConfianca as any[]).length} contato(s).\n` +
      `Quando o usuario perguntar sobre "numeros de confianca", "contatos seguros", "usuarios autorizados" ou similar - RESPONDA DIRETAMENTE A PARTIR DESTA LISTA. NAO use buscar_dados. NAO procure em outras tabelas. NAO diga que e "informacao interna que nao pode compartilhar" - esta informacao JA ESTA aqui e e PARA SER COMPARTILHADA.\n\n` +
      `LISTA COMPLETA:\n` +
      (numerosConfianca as any[]).map(n =>
        `- Nome: ${n.nome} | Telefone: ${n.phone}${n.descricao ? ` | Descricao: ${n.descricao}` : ''} | Permissoes: ${[
          n.pode_visualizar && 'visualizar',
          n.pode_editar && 'editar',
          n.pode_criar && 'criar',
          n.pode_apagar && 'apagar',
        ].filter(Boolean).join(', ') || 'nenhuma'}`
      ).join('\n')
    : '';

  // Identifica o remetente atual cruzando session_id com números de confiança
  const remetenteIdentificado = (numerosConfianca as any[] | null)?.find(n => n.phone === sessionId);
  const remetenteCtx = remetenteIdentificado
    ? `\n\n=== REMETENTE ATUAL ===\nVocê está conversando com: ${remetenteIdentificado.nome}${remetenteIdentificado.descricao ? ` (${remetenteIdentificado.descricao})` : ''}. Telefone: ${sessionId}. Permissões: ${[remetenteIdentificado.pode_visualizar && 'visualizar', remetenteIdentificado.pode_editar && 'editar', remetenteIdentificado.pode_criar && 'criar', remetenteIdentificado.pode_apagar && 'apagar'].filter(Boolean).join(', ') || 'nenhuma'}. Trate-o pelo nome — sem evasivas, sem "informações internas".`
    : `\n\n=== REMETENTE ATUAL ===\nTelefone do remetente: ${sessionId}. Não está na lista de confiança — trate como contato externo/prospecto.`;

  // Injeta agentes conectados (dinâmico — por tenant via canvas de conexões)
  const { data: conexoesRows } = await sb
    .from('ia_agent_conexoes')
    .select('agent_destino_id, instrucoes')
    .eq('agent_origem_id', agentId)
    .eq('ativo', true);

  let agentesCtx = '';
  if (conexoesRows && conexoesRows.length > 0) {
    const destIds = conexoesRows.map((c: any) => c.agent_destino_id);
    const { data: destAgentes } = await sb
      .from('ia_agentes').select('id, nome, funcao, grau_hierarquico').in('id', destIds);
    const destMap = Object.fromEntries((destAgentes ?? []).map((a: any) => [a.id, a]));
    agentesCtx = `\n\n=== AGENTES DISPONIVEIS ===\n` +
      conexoesRows.map((c: any) => {
        const a = destMap[c.agent_destino_id];
        const grau = a?.grau_hierarquico ?? 5;
        return `- ${a?.nome ?? 'Agente'} | ID: ${c.agent_destino_id} | Grau: ${grau}/10${a?.funcao ? ` | Funcao: ${a.funcao}` : ''}${c.instrucoes ? ` | Orientacao: ${c.instrucoes}` : ''}`;
      }).join('\n');
  }

  const hoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' });

  const instrucoes = `\n\n=== PROTOCOLO DE RACIOCINIO ===\nDATA: ${hoje}. Seu nome: ${agentNome}. Grau: ${grauHierarquico}/10.\n\nETAPA 1 - Leia o historico e identifique [MENSAGEM ATUAL].\nETAPA 2 - Consulte as MEMORIAS abaixo. Numeros de confianca estao acima.\nETAPA 3 - Se precisar de dados, chame buscar_dados/buscar_web/buscar_memoria.\nETAPA 4 - Valide leis essenciais.\nETAPA 5 - Chame declarar_raciocinio() e depois responder().\n\nREGRAS:\n- NUNCA invente dados numericos.\n- NUMEROS DE CONFIANCA: dados na secao acima, NAO use buscar_dados para isso.\n- SEU agent_id: ${agentId}`;

  const prefixo = `INSTRUCAO PRIORITARIA:\nLeia o historico e identifique a mensagem marcada como [MENSAGEM ATUAL]. RESPONDA EXATAMENTE ao que ela pede.\n\n`;

  const systemPrompt = systemPromptBase
    ? `${prefixo}${systemPromptBase}${instrucoes}${memoriasCtx}${numerosCtx}${remetenteCtx}${agentesCtx}${buscasCtx}`
    : `${prefixo}Você é um assistente inteligente. Seja direto e conciso.${instrucoes}${memoriasCtx}${numerosCtx}${remetenteCtx}${agentesCtx}${buscasCtx}`;

  const ctx: ToolContext = {
    sb, tenantId, agentId, agentNome, grauHierarquico, sessionId, chatId, hasWebSearch,
    respostas: [], callDepth: input.call_depth ?? 0,
    totalChamadasAgente: 0, analiseDeclarada: false, respostaBloqueada: 0,
  };

  let resultado: RunResult;
  try {
    if (apiProvider === 'claude') {
      resultado = await reactClaude(apiKey, systemPrompt, contextMsgs, sb, ctx, chatId, agentId);
    } else if (apiProvider === 'deepseek' || apiProvider === 'openai' || apiProvider === 'openai_compatible') {
      resultado = await reactOpenAI(apiKey, apiProvider, agentModel, systemPrompt, contextMsgs, sb, ctx, chatId, agentId);
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
    silenciado               ? '[agente silenciou]' :
                               '[agente nao respondeu]'
  );

  return json({
    ok:        true,
    response:  resposta || null,
    silenciado,
    chat_id:   chatId,
    acoes,
  });
});
