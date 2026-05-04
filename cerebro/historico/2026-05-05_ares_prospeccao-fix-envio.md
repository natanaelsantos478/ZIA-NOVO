---
agente: Ares (Claude Code)
data: 2026-05-05
tema: ProspeccaoIA fix envio WhatsApp — 3 causas raiz identificadas e corrigidas
branch: main
commit: 39da419
versao: 1.1.2-beta
---

## Problema

Sistema parou de enviar WhatsApp após prospecção. Usuário relatou: "22 empresas selecionadas não é possível que nenhuma encontrou número válido" e "antes tava mandando, parou".

## Investigação

### Evidência 1 — zero chamadas ao whatsapp-proxy
Supabase logs: `whatsapp-proxy` com ZERO invocações nas últimas 24h. Isso prova que o Agent 5 nunca chegou na etapa de envio — o problema estava ANTES do send, na validação dos phones.

### Evidência 2 — `ai-proxy` retornando 200 para todos
`ai-proxy` funcionando normalmente. O problema não era de busca (agents 1-4 ok).

## 3 Causas Raiz

### Causa 1 — `isOnWhatsapp` sempre retornava `false` (BUG PRINCIPAL)
Alguém adicionou um check `isOnWhatsapp()` no `runAgent5` que chama `whatsapp-proxy` com `action: 'check-phone'`. O `whatsapp-proxy` não suporta essa action → retorna `{ ok: false, error: 'Ação inválida' }` (HTTP 400). O `supabase.functions.invoke` NÃO lança exceção para HTTP 400 — retorna `{ data: {...}, error: null }`. Resultado: `d?.exists === true` = `undefined === true` = **false**. TODOS os phones falhavam → zero envios.

Explica perfeitamente o "antes tava mandando, parou" — o check-phone foi adicionado e quebrou tudo.

**Fix:** `if (typeof d?.exists !== 'boolean') return true` — quando a action não é suportada, assume que o número existe.

### Causa 2 — Gemini 2.5 thinking parts no `callGemini`
`callGemini` lia `parts[0].text` diretamente. Gemini 2.5 Flash (thinking model) retorna `parts[0]` como `{thought: true, text: "...reasoning interno..."}` e `parts[1]` com o texto real. Agent 4 recebia o raciocínio interno do modelo em vez do JSON de contatos → `extractJsonArray` falhava → zero contatos → phones null.

**Fix:** `parts.filter(p => !p.thought).map(p => p.text ?? '').join('')`

### Causa 3 — Loop condition contava total em vez de empresas com telefone
`proceed()` avançava para o Agent 5 quando `newAll.length >= targetCount`, não quando havia `targetCount` empresas COM telefone. Mesmo coletando 10+ empresas, se nenhuma tinha telefone, o Agent 5 recebia lista vazia.

**Fix:** `const comTelefone = newAll.filter(e => ...)` — loop continua até `comTelefone.length >= targetCount` ou `MAX_ROUNDS` rodadas.

## O que foi corrigido

1. `isOnWhatsapp` — retorna `true` quando `check-phone` não é suportado
2. `callGemini` — filtra thought parts do Gemini 2.5
3. `proceed()` autoMode block — condição usa `comTelefone.length`
4. `proceed()` main block — mesma correção
5. Barra de progresso — mostra "Com telefone X/Y" em vez de "Qualificadas X/Y"
6. Botão "Enviar agora" — filtra apenas empresas com telefone

## Arquivos modificados
- `src/features/crm/sections/ProspeccaoIA.tsx` — fixes acima
- `src/lib/version.ts` — 1.1.1-beta → 1.1.2-beta
- `package.json` — 1.1.1-beta → 1.1.2-beta

## Pendências herdadas (não resolvidas nesta sessão)
- Adicionar suporte a `check-phone` no `whatsapp-proxy` edge function (Z-API: `GET ${base}/phone-exists/${phone}`)
- Verificar token Z-API: `F453e4d3987b1440d815c4e3449b7d1d3S` — discrepância entre instanceUrl e campo token
- Deploy edge functions pendentes: `whatsapp-webhook`, `whatsapp-queue-worker`, `whatsapp-ia-processor`
- Aplicar migration `20260429_whatsapp_message_queue.sql` + configurar pg_cron
- ProspeccaoIA: normalizar telefone com prefixo 55 no CRM (bug `isNewLead`)
- Cloudflare hatsuit.com.br: worker.js correto nunca mergeado em main
