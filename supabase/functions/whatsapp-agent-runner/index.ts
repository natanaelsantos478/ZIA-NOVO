// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type, authorization' };
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GEMINI_PRO_URL       = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

interface RunnerInput {
  phone:           string;
  text:            string;
  zapi_message_id: string | null;
  tenant_id:       string;
  agent_id:        string;
  api_key:         string;
  api_provider:    string;
  system_prompt:   string;
  instance_url:    string;
  zapi_token:      string;
}

interface ToolContext {
  sb:               ReturnType<typeof createClient>;
  tenantId:         string;
  phone:            string;
  chatId:           string;
  agentId:          string;
  instanceUrl:      string;
  zapiToken:        string;
  mensagensEnviadas: number;
}

const TOOLS_DEF = [
  {
    name: 'enviar_mensagem_whatsapp',
    description: 'Envia uma mensagem de texto via WhatsApp para o cliente ou outro número. Use para TODA resposta ao cliente.',
    parameters: {
      type: 'OBJECT',
      properties: {
        phone:    { type: 'STRING', description: 'Número de destino no formato internacional (ex: 5511999999999).' },
        mensagem: { type: 'STRING', description: 'Texto da mensagem a enviar.' },
        delay_ms: { type: 'NUMBER', description: 'Aguardar X ms antes de enviar (máx 4000). Use 1000-2000ms entre mensagens.' },
      },
      required: ['phone', 'mensagem'],
    },
  },
  {
    name: 'nao_responder',
    description: 'Use quando decidir NÃO enviar nenhuma mensagem ao cliente. Encerra o ciclo de raciocínio sem responder.',
    parameters: {
      type: 'OBJECT',
      properties: {
        motivo: { type: 'STRING', description: 'Razão pela qual não vai responder' },
      },
      required: [],
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
    description: 'Atualiza status, etapa, responsável, nome do cliente ou observações de uma negociação no CRM.',
    parameters: {
      type: 'OBJECT',
      properties: {
        negociacao_id: { type: 'STRING', description: 'UUID da negociação' },
        cliente_nome:  { type: 'STRING', description: 'Nome do cliente (atualizar quando descoberto na conversa)' },
        etapa:         { type: 'STRING', description: 'Nova etapa (ex: qualificado, proposta, fechado_ganho)' },
        status:        { type: 'STRING', description: 'Novo status' },
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
    description: 'Transfere a conversa para atendimento humano. Use quando o cliente pedir para falar com atendente ou a situação exigir.',
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

async function executarFerramenta(
  nome: string,
  params: Record<string, unknown>,
  ctx: ToolContext,
): Promise<unknown> {
  const { sb, tenantId, instanceUrl, zapiToken } = ctx;

  switch (nome) {
    case 'enviar_mensagem_whatsapp': {
      const { phone: destPhone, mensagem, delay_ms } = params as { phone: string; mensagem: string; delay_ms?: number };
      if (!destPhone || !mensagem) return { erro: 'phone e mensagem são obrigatórios' };
      if (delay_ms && delay_ms > 0) await new Promise(r => setTimeout(r, Math.min(delay_ms, 4000)));

      ctx.mensagensEnviadas++;
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-proxy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
          body: JSON.stringify({ action: 'send-text', instanceUrl, token: zapiToken, phone: destPhone, message: mensagem }),
        });
        let d: Record<string, unknown> = {};
        try { d = await res.json() as Record<string, unknown>; } catch { /* non-JSON */ }

        await sb.from('wa_agent_chat_messages').insert({
          chat_id:   ctx.chatId,
          agent_id:  ctx.agentId,
          tenant_id: tenantId,
          role:      'reply',
          content:   mensagem,
          tool_name: 'enviar_mensagem_whatsapp',
        }).then(() => {});

        return { enviado: res.ok, status: res.status, destinatario: destPhone, proxy: d };
      } catch (e) {
        return { enviado: false, erro: String(e) };
      }
    }

    case 'nao_responder': {
      return { silenciado: true, motivo: (params as any).motivo ?? '' };
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
          body: JSON.stringify({ action: 'search', query }),
        });
        if (!res.ok) return { erro: `web-search HTTP ${res.status}` };
        const d = await res.json() as any;
        return { resultados: d.resultados ?? d.results ?? [] };
      } catch (e) {
        return { erro: String(e) };
      }
    }

    case 'salvar_nota_crm': {
      const { negociacao_id, nota, tipo = 'observacao' } = params as any;
      if (!negociacao_id) return { erro: 'negociacao_id obrigatório' };
      const { error } = await sb.from('crm_negociacao_notas').insert({
        negociacao_id, tenant_id: tenantId, tipo, conteudo: nota, autor: 'Agente WhatsApp',
      });
      if (error) {
        await sb.from('crm_negociacoes').update({ observacoes: nota }).eq('id', negociacao_id).eq('tenant_id', tenantId);
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

async function logMensagem(
  sb: ReturnType<typeof createClient>,
  chatId: string,
  agentId: string,
  tenantId: string,
  role: string,
  content: string | null,
  extra: { tool_name?: string; tool_args?: unknown; tool_result?: unknown; zapi_message_id?: string | null } = {},
) {
  try {
    await sb.from('wa_agent_chat_messages').insert({
      chat_id:         chatId,
      agent_id:        agentId,
      tenant_id:       tenantId,
      role,
      content,
      tool_name:       extra.tool_name        ?? null,
      tool_args:       extra.tool_args        ?? null,
      tool_result:     extra.tool_result      ?? null,
      zapi_message_id: extra.zapi_message_id  ?? null,
    });
  } catch { /* best-effort */ }
}

interface RunResult { transferido: boolean; silenciado: boolean; acoes: unknown[] }

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
  let transferido = false;
  let silenciado  = false;
  let nudged      = false;
  let rodadasComErro = 0;

  const NUDGE = 'Você gerou texto mas não chamou nenhuma ferramenta. Textos sem ferramenta são descartados — o cliente não recebe nada. Se quer responder, chame `enviar_mensagem_whatsapp`. Se não quer responder, chame `nao_responder`.';

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
    const thinkText = parts.filter((p: any) => p.text).map((p: any) => p.text).join('');

    if (thinkText.trim()) await logMensagem(sb, chatId, agentId, ctx.tenantId, 'thought', thinkText);

    if (funcCalls.length === 0) {
      if (thinkText.trim() && !nudged) {
        nudged = true;
        contents.push({ role: 'model', parts });
        contents.push({ role: 'user', parts: [{ text: NUDGE }] });
        continue;
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
        if (name === 'transferir_atendimento') transferido = true;
        if (name === 'nao_responder') silenciado = true;
      } catch (err) { resultado = { erro: String(err) }; houveErroNessaRodada = true; }
      await logMensagem(sb, chatId, agentId, ctx.tenantId, 'tool_result', null, { tool_name: name, tool_result: resultado });
      acoes.push({ ferramenta: name, args, resultado });
      funcResults.push({ role: 'function', parts: [{ functionResponse: { name, response: { resultado } } }] });
    }
    contents.push({ role: 'model', parts });
    contents.push(...funcResults);

    if (houveErroNessaRodada) { if (++rodadasComErro >= 3) break; } else { rodadasComErro = 0; }
    if (transferido || silenciado) break;
  }
  return { transferido, silenciado, acoes };
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
  let transferido = false;
  let silenciado  = false;
  let nudged      = false;
  let rodadasComErro = 0;

  const NUDGE = 'Você gerou texto mas não chamou nenhuma ferramenta. Textos sem ferramenta são descartados — o cliente não recebe nada. Se quer responder, chame `enviar_mensagem_whatsapp`. Se não quer responder, chame `nao_responder`.';

  for (let i = 0; i < 10; i++) {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, tools, max_tokens: 4096 }),
    });
    const d = await res.json() as any;
    if (d.error) {
      await logMensagem(sb, chatId, agentId, ctx.tenantId, 'thought', `[API_ERROR] ${JSON.stringify(d.error)}`);
      throw new Error(`${provider}: ${JSON.stringify(d.error)}`);
    }

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
        if (name === 'transferir_atendimento') transferido = true;
        if (name === 'nao_responder') silenciado = true;
      } catch (err) { resultado = { erro: String(err) }; houveErroNessaRodada = true; }
      await logMensagem(sb, chatId, agentId, ctx.tenantId, 'tool_result', null, { tool_name: name, tool_result: resultado });
      acoes.push({ ferramenta: name, args, resultado });
      messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(resultado) });
    }

    if (houveErroNessaRodada) { if (++rodadasComErro >= 3) break; } else { rodadasComErro = 0; }
    if (transferido || silenciado) break;
  }
  return { transferido, silenciado, acoes };
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
  let transferido = false;
  let silenciado  = false;
  let nudged      = false;
  let rodadasComErro = 0;

  const NUDGE = 'Você gerou texto mas não chamou nenhuma ferramenta. Textos sem ferramenta são descartados — o cliente não recebe nada. Se quer responder, chame `enviar_mensagem_whatsapp`. Se não quer responder, chame `nao_responder`.';

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
        if (tu.name === 'transferir_atendimento') transferido = true;
        if (tu.name === 'nao_responder') silenciado = true;
      } catch (err) { resultado = { erro: String(err) }; houveErroNessaRodada = true; }
      await logMensagem(sb, chatId, agentId, ctx.tenantId, 'tool_result', null, { tool_name: tu.name, tool_result: resultado });
      acoes.push({ ferramenta: tu.name, args: tu.input, resultado });
      toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(resultado) });
    }
    messages.push({ role: 'user', content: toolResults });

    if (houveErroNessaRodada) { if (++rodadasComErro >= 3) break; } else { rodadasComErro = 0; }
    if (transferido || silenciado) break;
  }
  return { transferido, silenciado, acoes };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  let input: RunnerInput;
  try { input = await req.json(); } catch { return json({ ok: false, error: 'JSON inválido' }, 400); }

  const {
    phone, text, zapi_message_id: zapiMsgId,
    tenant_id: tenantId, agent_id: agentId,
    api_key: apiKey, api_provider: apiProvider = 'gemini',
    system_prompt: systemPromptBase,
    instance_url: instanceUrl = '', zapi_token: zapiToken = '',
  } = input;

  if (!phone || !text || !tenantId || !agentId || !apiKey) {
    return json({ ok: false, error: 'phone, text, tenant_id, agent_id e api_key são obrigatórios' }, 400);
  }

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  let chatId: string;
  {
    const { data: existing } = await sb
      .from('wa_agent_chats').select('id')
      .eq('agent_id', agentId).eq('phone', phone).maybeSingle();

    if (existing?.id) {
      chatId = existing.id as string;
    } else {
      const { data: novo } = await sb
        .from('wa_agent_chats')
        .insert({ agent_id: agentId, tenant_id: tenantId, phone, titulo: phone, last_message_at: new Date().toISOString() })
        .select('id').single();
      chatId = (novo?.id as string) ?? '';
    }
    if (chatId) {
      await sb.from('wa_agent_chats').update({ last_message_at: new Date().toISOString() }).eq('id', chatId);
    }
  }

  if (zapiMsgId && chatId) {
    const { data: existing } = await sb
      .from('wa_agent_chat_messages')
      .select('id')
      .eq('chat_id', chatId)
      .eq('zapi_message_id', zapiMsgId)
      .maybeSingle();
    if (existing) {
      console.log('[Runner] duplicate zapi_message_id ignorado | phone:', phone, '| msgId:', zapiMsgId);
      return json({ ok: true, skipped: 'duplicate' });
    }
  }

  if (chatId) {
    await logMensagem(sb, chatId, agentId, tenantId, 'user', text, { zapi_message_id: zapiMsgId });
  }

  const { data: histRows } = await sb
    .from('wa_agent_chat_messages')
    .select('role, content')
    .eq('chat_id', chatId)
    .in('role', ['user', 'reply'])
    .order('created_at', { ascending: true })
    .limit(20);

  const deduped: { role: string; content: string }[] = [];
  for (const m of histRows ?? []) {
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

  // Marca explicitamente a mensagem que disparou este run — evita o LLM responder ao histórico antigo
  if (contextMsgs.length > 0 && contextMsgs[contextMsgs.length - 1].role === 'user') {
    const last = contextMsgs[contextMsgs.length - 1];
    contextMsgs[contextMsgs.length - 1] = {
      role: 'user',
      parts: [{ text: `[MENSAGEM ATUAL — responda a esta]: ${last.parts[0].text}` }],
    };
  }

  const { data: arquivosRows } = await sb
    .from('whatsapp_ia_arquivos')
    .select('nome, descricao, file_url, file_name')
    .eq('tenant_id', tenantId);

  const arquivos = (arquivosRows ?? []) as { nome: string; descricao: string | null; file_url: string; file_name: string }[];

  const ctx: ToolContext = {
    sb, tenantId, phone,
    chatId, agentId,
    instanceUrl, zapiToken,
    mensagensEnviadas: 0,
  };

  // CRM pré-carregado automaticamente
  let crmData: unknown = { encontrado: false };
  try {
    crmData = await executarFerramenta('crm_buscar_lead', { phone }, ctx);
    if (chatId) {
      await logMensagem(sb, chatId, agentId, tenantId, 'tool_call', null,
        { tool_name: 'crm_buscar_lead', tool_args: { phone } });
      await logMensagem(sb, chatId, agentId, tenantId, 'tool_result', null,
        { tool_name: 'crm_buscar_lead', tool_result: crmData });
    }
  } catch { /* best-effort */ }

  const arquivosPrompt = arquivos.length > 0
    ? `\n\nARQUIVOS DISPONÍVEIS:\n${arquivos.map((a: any) => `- "${a.nome}"${a.descricao ? `: ${a.descricao}` : ''}`).join('\n')}`
    : '';

  const crmContext = `\n\nDados do CRM para ${phone}: ${JSON.stringify(crmData)}`;

  const instrucoes = `\n\nREGRAS OBRIGATÓRIAS:\n1. Os dados do CRM já estão carregados acima — leia-os antes de agir.\n2. Para responder ao cliente: chame enviar_mensagem_whatsapp com phone="${phone}".\n3. Pode enviar múltiplas mensagens chamando a ferramenta várias vezes com delay_ms entre elas.\n4. Quando terminar (após responder OU decidir não responder): chame nao_responder para encerrar.\n5. Se NÃO for responder: chame nao_responder diretamente com o motivo.\n6. Máximo 2-3 frases por mensagem. PROIBIDO emojis.\n7. Para pesquisar mais informações: use buscar_web ou buscar_dados.\n8. Para atendimento humano: chame transferir_atendimento.\n9. NUNCA gere texto de resposta diretamente — use SEMPRE as ferramentas.`;

  // Prefixo injetado ANTES do system_prompt do agente
  const prefixo = `INSTRUÇÃO PRIORITÁRIA (sobrepõe qualquer outra):
1. Leia o histórico e identifique a mensagem marcada como [MENSAGEM ATUAL]. RESPONDA EXATAMENTE ao que ela pede.
2. SEU PRIMEIRO RACIOCÍNIO deve ser: "O contato quer [X]. Vou [ação]." — análise do pedido, nunca a resposta em si.

`;

  // Detecção de pedido específico na mensagem atual → instrução cirúrgica no FINAL do system_prompt
  const pedidoPesquisa = /pesquis|busqu|procur|internet|web|not[ií]cia|hoje|agora|informa[çc]|search/i.test(text);
  const pedidoCalculo  = /calcul|quanto|valor|pre[çc]o|desconto|total/i.test(text);
  const sufixo = pedidoPesquisa
    ? `\n\n=== AÇÃO OBRIGATÓRIA PARA ESTA MENSAGEM ===\nO contato pediu EXPLICITAMENTE para PESQUISAR NA INTERNET. Você DEVE:\n1. Chamar buscar_web com os termos do pedido\n2. Enviar o resultado via enviar_mensagem_whatsapp\n3. Chamar nao_responder\nPROIBIDO responder com roteiro de vendas nesta interação. Execute a pesquisa agora.`
    : pedidoCalculo
    ? `\n\n=== AÇÃO OBRIGATÓRIA PARA ESTA MENSAGEM ===\nO contato fez um pedido de cálculo/valor. Responda com os dados solicitados via enviar_mensagem_whatsapp. PROIBIDO desviar para roteiro de vendas.`
    : '';

  const systemPrompt = systemPromptBase
    ? `${prefixo}${systemPromptBase}${instrucoes}${crmContext}${arquivosPrompt}${sufixo}`
    : `${prefixo}Você é um assistente de atendimento via WhatsApp. Seja direto e conciso.${instrucoes}${crmContext}${arquivosPrompt}${sufixo}`;

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
    console.error('[Runner] erro ReAct:', errMsg);
    if (chatId) {
      try { await logMensagem(sb, chatId, agentId, tenantId, 'thought', `[ERROR] ${errMsg}`); } catch { /* best-effort */ }
    }
    resultado = { transferido: false, silenciado: false, acoes: [] };
  }

  const { transferido, silenciado, acoes } = resultado;
  const enviouViaFerramenta = ctx.mensagensEnviadas > 0;

  if (chatId) {
    await logMensagem(sb, chatId, agentId, tenantId, 'assistant',
      silenciado         ? '[agente silenciou — sem resposta]' :
      enviouViaFerramenta ? `[${ctx.mensagensEnviadas} mensagem(ns) enviada(s)]` :
                            '[agente não respondeu]'
    );
  }

  return json({
    ok: true,
    enviou_via_ferramenta: enviouViaFerramenta,
    mensagens_enviadas: ctx.mensagensEnviadas,
    transferido,
    silenciado,
    acoes,
    chatId,
  });
});
