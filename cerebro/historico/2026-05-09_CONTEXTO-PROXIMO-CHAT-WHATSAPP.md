# CONTEXTO — Módulo WhatsApp Agent (para próximo chat)

> Cole isso no início do próximo chat para continuar de onde parou.

---

## Situação atual

Você está trabalhando no sistema de agente WhatsApp do ZIA/ZITA. O agente usa DeepSeek via ReAct loop para responder mensagens do WhatsApp através da Z-API.

**Branch de trabalho:** `claude/analyze-ai-module-changes-RSjci`  
**PR aberto:** #133 em `natanaelsantos478/ZIA-NOVO`  
**Projeto Supabase:** `tgeomsnxfcqwrxijjvek` (ZITA)  
**Runner atual:** `whatsapp-agent-runner` v16 (deployado)

---

## Arquitetura

```
Z-API webhook → whatsapp-webhook (v45) → whatsapp-agent-runner (v16)
                                              ↓
                                    whatsapp-proxy → Z-API enviar
                                    ia-web-search → Serper.dev (QUEBRADO)
```

**Agente ativo no banco:**
- `ia_agentes.id` = `89219065-c559-444b-8c1b-b14e069b2bfa`
- `api_provider` = `deepseek`, `api_code` = `API0001`
- Telefone de teste (Natanael): `556295075446`
- Chat id: `0279a0fb-4462-49ad-8a21-270f81f2cc90`

---

## Problemas em aberto (por prioridade)

### 🔴 CRÍTICO — SERPER_API_KEY não configurada
`buscar_web` sempre retorna HTTP 500 porque a env var não existe no Supabase.

**Fix:**
```bash
supabase secrets set SERPER_API_KEY=<chave_do_serper.dev> --project-ref tgeomsnxfcqwrxijjvek
```
Sem isso, pesquisa na internet nunca funciona.

---

### 🔴 CRÍTICO — DB writes silentes falhando (inserts em wa_agent_chat_messages)

O runner roda (6-7 segundos, faz chamadas DeepSeek), atualiza `wa_agent_chats.last_message_at`, mas NÃO cria registros em `wa_agent_chat_messages`.

**O que sabemos:**
- RLS: aberto (`qual: true, with_check: true`)
- Constraints: só FK em chat_id e CHECK em role (roles válidas)
- SQL direto: funciona
- `wa_agent_chats.update()`: funciona (mesmo client, mesma key)
- `wa_agent_chat_messages.insert()`: falha silentemente

**Causa raiz do silêncio:** SDK Supabase retorna `{ data, error }`, nunca lança exceção. O `try { await sb.from().insert() } catch {}` nunca ativa. **Corrigido no v16** — agora loga `console.error` quando `error` não é null.

**Próximo passo:** Testar com v16 e checar logs em Supabase Dashboard → Edge Functions → whatsapp-agent-runner → Logs. O erro real vai aparecer lá.

---

### 🟠 IMPORTANTE — Agente não pesquisa na internet (chama nao_responder)

DeepSeek tem persona forte (Jessica, sales agent). Mesmo com instrução explícita, frequentemente gera texto de vendas e silencia em vez de chamar `buscar_web`.

**Correções já aplicadas:**
- v13: `prefixo` antes do system_prompt
- v14: keyword detection + `sufixo` no FIM do system_prompt
- v16: injeta `[SISTEMA: PRIMEIRA AÇÃO OBRIGATÓRIA: chame buscar_web...]` DENTRO da mensagem do usuário (maior peso para o LLM)

**Palavras-chave que disparam:** `pesquis|busqu|procur|internet|web|notícia|hoje|agora|informaç|search|previsao|previsão|clima|tempo`

**Status:** Ainda não confirmado se v16 resolve. Aguardando teste.

---

### 🟠 IMPORTANTE — Dupla mensagem (race condition Z-API)

Z-API às vezes entrega o mesmo webhook 2x quase simultaneamente. Dois runners passam pelo duplicate check ao mesmo tempo (nenhum encontra registro do outro ainda), ambos respondem → 2 mensagens no WhatsApp.

**Fix parcial no v15:** `if (ctx.mensagensEnviadas > 0) break` — impede que um runner envie 2 mensagens. Mas não impede que 2 runners rodem juntos.

**Fix definitivo (pendente):**
```typescript
// Substituir o duplicate check por INSERT com ON CONFLICT:
const { error: dupErr } = await sb.from('wa_agent_chat_messages').insert({
  ..., zapi_message_id: zapiMsgId
});
if (dupErr?.code === '23505') { // unique constraint violation
  return json({ ok: true, skipped: 'duplicate-race' });
}
// Só continua se inseriu com sucesso (ganhou a corrida)
```
Isso requer que o primeiro INSERT da mensagem user seja atômico e use o índice único `wa_agent_chat_messages_dedup_idx`.

---

### 🟡 MENOR — Primeiro raciocínio = resposta final

DeepSeek às vezes escreve a resposta ao cliente como primeiro `thought` (texto livre), depois o NUDGE o força a usar ferramenta. O `prefixo` foi adicionado para guiar: "SEU PRIMEIRO RACIOCÍNIO deve ser: O contato quer [X]. Vou [ação]."

---

## Histórico de versões do runner

| v | O que mudou |
|---|-------------|
| v13 | prefixo genérico antes do system_prompt |
| v14 | keyword detection + sufixo obrigatório no final do system_prompt |
| v15 | `if (ctx.mensagensEnviadas > 0) break` nos 3 react loops |
| v16 | logMensagem loga erros reais + instrução inline na mensagem do usuário |

---

## System prompt atual (construído no runner)

```
{prefixo}                    ← "INSTRUÇÃO PRIORITÁRIA: analise o pedido primeiro"
{systemPromptBase}           ← DB: persona Jessica, ferramentas, regras
{instrucoes}                 ← hard-coded: regras de ferramentas, phone=X
{crmContext}                 ← dados CRM pré-carregados
{arquivosPrompt}             ← arquivos disponíveis
{sufixo}                     ← condicional: "REGRA: chame buscar_web" (se pesquisa)

Mensagem do usuário:
"[MENSAGEM ATUAL — responda a esta]: {text}
[SISTEMA: PRIMEIRA AÇÃO OBRIGATÓRIA: chame buscar_web...]"  ← v16 novo
```

---

## Ferramentas disponíveis no runner

`enviar_mensagem_whatsapp` · `nao_responder` · `buscar_web` · `buscar_dados` · `criar_registro` · `editar_registro` · `crm_buscar_lead` · `crm_atualizar_negociacao` · `salvar_nota_crm` · `transferir_atendimento`

**Pendente implementar:** `consultar_agente` · `gerar_json`

---

## Arquivos principais

- `supabase/functions/whatsapp-agent-runner/index.ts` — runner (787 linhas)
- `supabase/functions/whatsapp-webhook/index.ts` — webhook (109 linhas)
- `supabase/functions/ia-web-search/index.ts` — busca (usa SERPER_API_KEY)
- `supabase/functions/whatsapp-proxy/index.ts` — proxy Z-API
- `src/features/ia/sections/Organograma.tsx` — chat UI no frontend

---

## Próximas ações recomendadas

1. **Configurar SERPER_API_KEY** (bloqueia tudo sobre pesquisa)
2. **Testar v16** — mandar "qual a previsão do tempo em SP hoje?" e checar logs da edge function para ver o erro real do insert
3. **Implementar fix de race condition** com INSERT atômico
4. **Considerar trocar DeepSeek por Gemini** — Gemini segue tool use com mais fidelidade que DeepSeek para este padrão ReAct
