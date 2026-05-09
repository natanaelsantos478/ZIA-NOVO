---
agente: claude
data: 2026-05-09
tema: whatsapp agente diagnostico completo
branch: claude/analyze-ai-module-changes-RSjci
---

# Diagnóstico Completo — Módulo WhatsApp Agent

> Este documento é o contexto completo de duas sessões longas de diagnóstico e correção do módulo WhatsApp. Leia tudo antes de continuar.

---

## Arquitetura do Sistema

```
Z-API (instância 3F1969DB5C2181E61967D6E8332D8490)
  ↓ webhook POST
supabase/functions/whatsapp-webhook/index.ts  (v45)
  ↓ POST com payload completo
supabase/functions/whatsapp-agent-runner/index.ts  (v15 atual)
  ↓ chama ferramentas via
supabase/functions/whatsapp-proxy/index.ts  → Z-API enviar mensagem
supabase/functions/ia-web-search/index.ts   → Serper API busca
```

**Banco de dados:**
- `wa_agent_chats` — uma linha por (agente × telefone)
- `wa_agent_chat_messages` — todas as mensagens: user, reply, thought, tool_call, tool_result, assistant
- `ia_agentes` — definição do agente (id, nome, api_code, api_provider, system_prompt, integracao_tipo)
- `ia_api_keys` — instância Z-API com instanceUrl e token

**Agente ativo:**
- id: `89219065-c559-444b-8c1b-b14e069b2bfa`
- nome: "Whatsapp"
- api_provider: `deepseek`
- api_code: `API0001` (resolvido como `Deno.env.get('API0001')` no runner)
- phone teste (Natanael): `556295075446`
- chat_id: `0279a0fb-4462-49ad-8a21-270f81f2cc90`

---

## Versões do Runner (histórico)

| Versão | O que mudou |
|--------|------------|
| v7-v12 | Versões anteriores às sessões |
| v13 | Adicionado `prefixo` genérico antes do system_prompt do agente |
| v14 | Adicionado keyword detection + `sufixo` obrigatório no FIM do system_prompt para pesquisas/cálculos |
| v15 | Adicionado `if (ctx.mensagensEnviadas > 0) break;` em todos os 3 react loops (Gemini, OpenAI/DeepSeek, Claude) |

---

## Problemas Identificados

### 1. AGENTE RESPONDE ERRADO (não pesquisa, dá discurso de vendas)

**Sintoma:** Natanael manda "pesquise na internet" ou "qual a previsão do tempo em SP hoje?" e o agente responde com roteiro de vendas da ZITA.

**Causa raiz:** DeepSeek tem persona muito forte (Jessica, sales agent). O `system_prompt` do DB é 100% focado em vendas. Mesmo com o `sufixo` de AÇÃO OBRIGATÓRIA no final do system_prompt, o modelo ignora e responde com o script de vendas.

**Tentativas de correção:**
- v13: `prefixo` genérico no início → não resolveu (persona do DB mais forte)
- v14: keyword detection (`pesquis|busqu|internet|hoje|agora`) → sufixo no FINAL do prompt → parcialmente útil mas DeepSeek ainda ignora em muitos casos
- Atualizado system_prompt no DB para uma versão tool-centric com Jessica como agente polivalente

**Status:** PARCIALMENTE RESOLVIDO. O agente às vezes chama buscar_web mas frequentemente ainda silencia ou responde de forma genérica.

**Causa adicional:** `ia-web-search` retorna 500 porque `SERPER_API_KEY` não está configurada como env var no projeto Supabase. Se o agente chamar buscar_web, vai receber erro 500.

---

### 2. PRIMEIRO RACIOCÍNIO = RESPOSTA FINAL

**Sintoma:** O primeiro `thought` do agente já é a mensagem de resposta ao cliente ("Olá! Tudo bem sim..."), não uma análise do pedido. Depois o NUDGE força a usar ferramenta.

**Causa raiz:** DeepSeek gera texto livre no primeiro turn sem chamar ferramenta. O NUDGE corrige na segunda iteração, mas a resposta enviada é a do primeiro thought (gerada antes do nudge), não uma resposta contextual.

**Correção tentada:** Adicionado prefixo: `SEU PRIMEIRO RACIOCÍNIO deve ser: "O contato quer [X]. Vou [ação]."` 

**Status:** PARCIALMENTE RESOLVIDO. O modelo às vezes ainda gera a resposta como primeiro pensamento.

---

### 3. MENSAGEM DUPLA (2 WhatsApp por mensagem recebida)

**Sintoma:** O usuário recebe 2 mensagens idênticas do agente.

**Causa raiz (dual):**
1. **Loop interno:** Runner continuava o ReAct loop após enviar a primeira mensagem → agente enviava 2x dentro do mesmo run. **CORRIGIDO em v15** com `if (ctx.mensagensEnviadas > 0) break;`
2. **Z-API double delivery (race condition):** Z-API entrega o mesmo webhook 2 vezes quase simultaneamente. Ambas as instâncias do runner passam pelo duplicate check ao mesmo tempo (nenhum encontra registro porque o outro ainda não salvou), e ambas rodam o AgentAI e enviam 1 mensagem cada. **NÃO RESOLVIDO.**

**Fix para race condition (pendente):**
- Usar `INSERT ... ON CONFLICT DO NOTHING` para o registro do user message, e verificar se foi inserido (se não → outro runner já processou)
- Ou usar um lock Redis/Postgres com `pg_try_advisory_lock`

---

### 4. AGENTE NÃO RESPONDE (total silence)

**Sintoma:** Natanael envia "qual a previsão do tempo em sao paulo hoje?" e o agente não responde nada no WhatsApp.

**Investigação:** Os logs do Supabase mostram que:
- whatsapp-webhook v45 rodou 2x hoje (13:07 e 13:12 UTC)
- whatsapp-agent-runner v15 rodou 2x hoje (6-7 segundos cada)
- `wa_agent_chats.last_message_at` foi atualizado para 13:11 UTC (prova de que o runner alcançou a DB)
- ZERO registros novos em `wa_agent_chat_messages` de hoje
- NENHUM call ao `whatsapp-proxy` (prova que enviar_mensagem_whatsapp não foi chamada)

**Causa provável:**
DeepSeek gera texto (thought) sem chamar ferramentas. O NUDGE é enviado. DeepSeek continua gerando texto ou tenta usar ferramenta. Loop quebra depois de 10 iterações ou sem tools. Agente retorna `[agente não respondeu]`. E o logMensagem falha silentemente.

**Bug crítico descoberto: logMensagem silencia todos os erros**

O `logMensagem` usa:
```typescript
try {
  await sb.from('wa_agent_chat_messages').insert({...});
} catch { /* best-effort */ }
```

O Supabase JS client NÃO lança exceção em erro de insert — retorna `{ data, error }`. O catch NUNCA dispara. Erros de insert são 100% invisíveis.

**Isso significa:** O runner pode estar tendo erros reais nos inserts que nunca aparecem nos logs.

**Causa do insert failing (hipótese principal):** Não identificada definitivamente. Testamos:
- RLS: aberto para todos (`qual: true, with_check: true`) ✓
- Constraints: apenas FK em chat_id e check em role (roles válidas) ✓
- Triggers: nenhum ✓
- SQL direto: funciona ✓
- service key: válida (chat update funciona) ✓

Hipótese restante: **PostgREST timeout** ou **Supabase client versão** com bug específico para essa situação.

**O que é certo:** Mesmo sem logs de mensagem, o agente ESTÁ sendo chamado. O problema de comportamento (não pesquisar, silenciar) é a causa de não enviar nada no WhatsApp.

---

### 5. ia-web-search RETORNA 500

**Causa:** `SERPER_API_KEY` não está configurada como secret no projeto Supabase tgeomsnxfcqwrxijjvek.

**Fix necessário:** Configurar o secret `SERPER_API_KEY` com a chave do Serper.dev no Supabase.

---

## Sistema de Prompts do Runner (v15)

```typescript
const prefixo = `INSTRUÇÃO PRIORITÁRIA (sobrepõe qualquer outra):
1. Leia o histórico e identifique a mensagem marcada como [MENSAGEM ATUAL]. RESPONDA EXATAMENTE ao que ela pede.
2. SEU PRIMEIRO RACIOCÍNIO deve ser: "O contato quer [X]. Vou [ação]." — análise do pedido, nunca a resposta em si.
`;

// keyword detection na mensagem atual
const pedidoPesquisa = /pesquis|busqu|procur|internet|web|notícia|hoje|agora|informaç|search/i.test(text);
const sufixo = pedidoPesquisa
  ? `\n\n=== AÇÃO OBRIGATÓRIA ===\n...chamar buscar_web...`
  : '';

const systemPrompt = `${prefixo}${systemPromptBase}${instrucoes}${crmContext}${arquivosPrompt}${sufixo}`;
```

**Instrucoes hard-coded no runner:**
```
REGRAS OBRIGATÓRIAS:
1. Dados do CRM já carregados — leia antes de agir
2. Para responder: chame enviar_mensagem_whatsapp com phone="${phone}"
3. Múltiplas mensagens: chamar ferramenta várias vezes com delay_ms
4. Quando terminar: chame nao_responder
5. Se não for responder: chame nao_responder diretamente
6. Máximo 2-3 frases. PROIBIDO emojis.
7. Para pesquisar: use buscar_web ou buscar_dados
8. Para humano: chame transferir_atendimento
9. NUNCA gere texto direto — use SEMPRE as ferramentas
```

**System prompt no DB (ia_agentes):**
```
Você é a Jessica, agente inteligente da ZITA Soluções...
COMO VOCÊ PENSA E AGE: REGRA INVIOLÁVEL: nunca entrega texto diretamente ao cliente.
FERRAMENTAS DISPONÍVEIS: [lista completa]
REGRAS OBRIGATÓRIAS (7 regras)
SOBRE A ZITA — USE QUANDO RELEVANTE
```

---

## Ferramentas Disponíveis no Runner

- `enviar_mensagem_whatsapp` — via whatsapp-proxy → Z-API
- `nao_responder` — encerra sem responder
- `buscar_web` — via ia-web-search → Serper.dev (ATUALMENTE QUEBRADO: SERPER_API_KEY ausente)
- `buscar_dados` — query direta no banco
- `criar_registro` — insert no banco
- `editar_registro` — update no banco
- `crm_buscar_lead` — busca em crm_negociacoes por telefone
- `crm_atualizar_negociacao` — atualiza CRM
- `salvar_nota_crm` — salva nota em crm_negociacao_notas
- `transferir_atendimento` — atualiza etapa para "aguardando_humano"

**Ferramentas planejadas (não implementadas ainda):**
- `consultar_agente` — chamar outro agente do sistema
- `gerar_json` — gerar JSON estruturado para integração externa

---

## O que Está Funcionando

- ✅ Z-API entrega webhooks
- ✅ whatsapp-webhook roteia para runner
- ✅ Runner inicializa, acha o chat, atualiza timestamp
- ✅ DeepSeek API responde (6-7 segundos)
- ✅ Loop ReAct funciona (nudge incluído)
- ✅ `if (ctx.mensagensEnviadas > 0) break` impede loop infinito (v15)
- ✅ enviar_mensagem_whatsapp chama whatsapp-proxy e envia via Z-API
- ✅ RLS e permissões corretas no banco
- ✅ CRM pré-carregado automaticamente antes do AI
- ✅ Scroll do chat no frontend só ao receber `role === 'reply'` (corrigido)
- ✅ Marcação de mensagem atual `[MENSAGEM ATUAL — responda a esta]` no contexto

---

## O que Está Quebrado

- ❌ `SERPER_API_KEY` não configurada → buscar_web sempre retorna erro 500
- ❌ logMensagem não detecta erros (catch vazio + SDK não lança)
- ❌ Agente frequentemente silencia em vez de pesquisar
- ❌ Race condition Z-API double delivery → 2 mensagens no WhatsApp
- ❌ Agente ignora sufixo de AÇÃO OBRIGATÓRIA e gera resposta de vendas

---

## Pendências Prioritárias (próxima sessão)

### CRÍTICO (fazer primeiro):
1. **Configurar `SERPER_API_KEY` no Supabase** — sem isso buscar_web nunca funciona
   ```bash
   supabase secrets set SERPER_API_KEY=<chave> --project-ref tgeomsnxfcqwrxijjvek
   ```

2. **Fix logMensagem para logar erros** — mudar de catch vazio para console.error

3. **Fix agente chamando buscar_web** — opções:
   - a) Mover sufixo de AÇÃO OBRIGATÓRIA para o INÍCIO do system_prompt (não final)
   - b) Injetar a instrução diretamente na mensagem do usuário (como "mensagem do sistema" inline)
   - c) Mudar o provider do agente para Gemini (que tem melhor conformidade com tool use)

4. **Fix race condition double delivery** — implementar lock otimista:
   ```typescript
   // Em vez de duplicate check → insert separado:
   const { error } = await sb.from('wa_agent_chat_messages').insert({
     ..., zapi_message_id: zapiMsgId
   });
   if (error?.code === '23505') { // unique constraint = já processado
     return json({ ok: true, skipped: 'duplicate' });
   }
   ```

### IMPORTANTE:
5. Adicionar ferramentas `consultar_agente` e `gerar_json` ao runner
6. Investigar por que inserts em `wa_agent_chat_messages` falham silentemente hoje
7. Verificar se há outro sistema (`jessica-queue-worker`?) concorrendo com o runner

---

## Fluxo de Dados Detalhado

```
WhatsApp → Z-API → webhook POST
├── type !== 'ReceivedCallback' → skip
├── fromMe = true → skip
├── Busca ia_api_keys WHERE integracao_tipo='whatsapp' AND status='ativo'
│   └── Filtra pela instanceId no instanceUrl
├── Busca ia_agentes WHERE tenant_id=? AND status='ativo' AND integracao_tipo='whatsapp'
├── apiKey = Deno.env.get(agente.api_code)
└── POST para whatsapp-agent-runner com todo o payload

whatsapp-agent-runner:
├── Acha ou cria wa_agent_chats
├── Atualiza last_message_at
├── Duplicate check por zapi_message_id (pode falhar se race condition)
├── Loga mensagem user (pode falhar silentemente)
├── Carrega histório (últimas 14 mensagens user/reply)
├── Pré-carrega CRM crm_negociacoes por phone
├── Constrói system_prompt = prefixo + DB_prompt + instrucoes + crmCtx + arquivos + sufixo
├── reactOpenAI/reactGemini/reactClaude (max 10 iterações)
│   ├── Chama API do modelo
│   ├── Se texto sem tool → nudge → próxima iteração
│   ├── Se tool call → executarFerramenta → registra resultado
│   ├── Break se: mensagensEnviadas > 0, silenciado, transferido, 3 erros
│   └── Break se 10 iterações
└── Loga status final
```

---

## Notas Técnicas

**Por que `logMensagem` falha silentemente:**
```typescript
// O SDK Supabase NUNCA lança exceção — retorna { data, error }
// Este try-catch NUNCA é ativado em caso de erro de insert:
try {
  await sb.from('wa_agent_chat_messages').insert({...});
} catch { /* nunca chega aqui */ }

// Fix correto:
const { error } = await sb.from('wa_agent_chat_messages').insert({...});
if (error) console.error('[logMensagem]', error.message, error.code);
```

**Por que o agente ignora instrução de pesquisa:**
DeepSeek tem alta tendência a gerar texto livre antes de chamar tools. O `prefixo` e `sufixo` são sobrepostos pelo `system_prompt` do banco que é muito prescritivo como sales agent. A solução mais robusta é: injetar a instrução diretamente na MENSAGEM do usuário (como `[SISTEMA]: O usuário pediu para pesquisar. CHAME buscar_web AGORA.`), porque o modelo presta mais atenção ao turno mais recente da conversa.

**Formato de zapi_message_id:**
Exemplos observados: `3EB0489392C558B1A0055D`, `3EB05D80B116E04F37D6B5`, `3EB0F38E1F07E81D941EC2`
Formato: prefixo `3EB0` + 16 chars hex.

---

## Arquivo Runner Atual
`supabase/functions/whatsapp-agent-runner/index.ts` — 787 linhas, versão v15

## Branch de Trabalho
`claude/analyze-ai-module-changes-RSjci`

## PR
Criar PR no repositório `natanaelsantos478/ZIA-NOVO` para esta branch.
