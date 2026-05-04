---
agente: Ares (Claude Code)
data: 2026-05-05
tema: ProspeccaoIA — revisão Agent 5, 3 bugs adicionais corrigidos
branch: main
commit: 3d40df7
versao: 1.1.3-beta
---

## Contexto

Revisão completa do fluxo do Agent 5 após os fixes da parte 1 (commit 39da419).
Natanael pediu para verificar se havia mais algo que travasse o envio.

## Bugs encontrados e corrigidos

### Bug 1 — `permissoes.whatsapp` null crash (linha 611)
`keys.find(k => k.permissoes.whatsapp.enviar_em_massa || ...)` — se qualquer key no
array tiver `permissoes = null` (dados legados), o `.find` inteiro lança TypeError.
O `try/catch` externo captura silenciosamente → `waKey = null` → Agent 5 mostra
"Nenhuma API WhatsApp configurada" mesmo com key válida e ativa.

**Fix:** optional chaining `k.permissoes?.whatsapp?.enviar_em_massa`

### Bug 2 — `isOnWhatsapp` retornava false para números válidos
A `whatsapp-proxy` local já tinha `check-phone` implementado (commitado mas não
deployado). O fix da parte 1 (return true quando `exists` não é boolean) só protegia
contra a versão antiga do proxy. Com a versão nova deployada:
- Proxy chama `GET ${base}/phone-exists?phone=${phone}` (query param)
- Z-API espera `GET /${phone}` (path param) → Z-API retorna 4xx
- Proxy trata `r.ok === false` como `exists = false` (boolean!)
- `typeof false !== 'boolean'` = false → `isOnWhatsapp` retorna `false`
- TODOS os números rejeitados → zero envios

**Fix:** Removido o loop de validação `isOnWhatsapp` inteiramente. Tenta enviar direto
para todos os números válidos. Z-API decide se o número é válido pelo retorno real do
`send-text`. Falhas vão para `falhaEnvio++`.

### Bug 3 — `normalizePhone` double-55
Se Gemini retorna `"55 11 99999-9999"` → digits = `"5511999999999"` (13 dígitos) → ok.
Mas se retorna `"55 11 9876-5432"` (fixo, 8 dígitos) → digits = `"551198765432"` (12) → ok.
Caso problemático: `"55 11 98765432"` → digits = `"5511987654321"` 13 dígitos → ok.

O caso real de risco: Gemini retorna número no formato `"5511XXXXXXXXX"` que,
após strip de não-dígitos, fica com 11 dígitos → `55` é adicionado → `5555...`.

**Fix:** `if (digits.startsWith('55') && digits.length >= 12) return digits` — se já
tem código de país (55 + DDD 2 dígitos + número 8-9 dígitos = 12-13 total), retorna
como está.

## Arquivos modificados
- `src/features/crm/sections/ProspeccaoIA.tsx` — fixes acima + variável `semWhatsapp` removida
- `src/lib/version.ts` — 1.1.2-beta → 1.1.3-beta
- `package.json` — 1.1.2-beta → 1.1.3-beta

## Estado do fluxo Agent 5 após todos os fixes (partes 1 + 2)

1. Busca key WhatsApp: `permissoes?.whatsapp?.enviar_em_massa` ✓
2. Extrai config: `waKey.integracao_config` → `{instanceUrl, token}` ✓
3. Normaliza telefones: strip non-digits + prefixo 55 sem duplicar ✓
4. Para cada empresa: tenta enviar para cada número (para no primeiro OK) ✓
5. Se sent === 0: abre relatório automático para envio manual ✓
6. Salva no CRM e atualiza `prosp_empresas.status_pipeline` ✓

## Pendências restantes
- Deploy `whatsapp-proxy` com URL correta para Z-API phone-exists: `/${phone}` em vez de `?phone=${phone}`
- Deploy edge functions pendentes: `whatsapp-webhook`, `whatsapp-queue-worker`, `whatsapp-ia-processor`
- Aplicar migration `20260429_whatsapp_message_queue.sql` + configurar pg_cron
- ProspeccaoIA: bug `isNewLead` por prefix `55` no CRM (normalizar na entrada)
- Cloudflare hatsuit.com.br: worker.js correto nunca mergeado em main
