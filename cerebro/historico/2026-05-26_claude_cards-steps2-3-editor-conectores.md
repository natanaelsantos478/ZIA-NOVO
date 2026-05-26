---
agente: Claude (Opus 4.7)
data: 2026-05-26
tema: cards steps 2-3 editor-interno conectores-externos
branch: claude/eloquent-lovelace-ezTux
versao: 2.1.0-beta
---

## Contexto

Continuação do Step 1 (memória). Steps 2 e 3 do plano de correção dos Cards IA.

---

## Step 2 — editor_interno: enforcement nos runners

### O que foi feito

**Arquivo criado:** `supabase/functions/_shared/editor-interno.ts`
- `TABLE_TO_MODULE`: mapa de tabela → módulo (CRM, ERP Vendas, ERP Financeiro, ERP Estoque, RH, EAM, SCM, IA, GED)
- `ACTION_TO_PERM`: buscar_dados='ver', criar_registro='criar', editar_registro='editar', deletar_registro='apagar'
- `loadEditorGuard(sb, agentId)`: busca card `editor_interno` ativo via `ia_agent_cards`. Sem card → `hasCard=false`
- `checkEditorAccess(guard, tabela, action)`: retorna `null` (permitido) ou string de erro. Default sem card: allow all
- `buildEditorPromptSection(guard)`: injeta bloco `=== EDITOR INTERNO ===` no system prompt

**Modificado:** `supabase/functions/whatsapp-agent-runner/index.ts`
- Import de `editor-interno.ts` e `conectores.ts`
- `ToolContext.editorGuard: EditorGuard` + `ToolContext.conectoresSaida: ConectorSaida[]`
- `const editorGuard = await loadEditorGuard(sb, agentId)` após hasWebSearch
- Gates com `checkEditorAccess` em: `buscar_dados`, `criar_registro`, `editar_registro`, `deletar_registro`
- `buildEditorPromptSection(editorGuard)` injetado no system prompt como `${editorSection}`

**Modificado:** `supabase/functions/ia-agent-runner/index.ts`
- Mesmas mudanças aplicadas

---

## Step 3a — conector_externo_saida: tool chamar_webhook_externo

### O que foi feito

**Arquivo criado:** `supabase/functions/_shared/conectores.ts`
- `ConectorSaida` interface (id, nome, descricao, target_url, method, headers_raw, content_type)
- `loadConectoresSaida(sb, agentId)`: busca cards `conector_externo_saida` ativos via `ia_agent_cards`
- `parseHeaders(raw)`: converte "Key: Value\n..." em objeto
- `executarConectorSaida(conector, payload)`: faz fetch real, retorna `{ ok, status, resposta }` (truncado a 2KB)
- `buildConectoresPromptSection(conectores)`: injeta `=== CONECTORES EXTERNOS DISPONÍVEIS ===` no prompt

**Modificado:** ambos os runners
- Tools adicionadas: `chamar_webhook_externo`, `ver_caixa_entrada`, `marcar_webhook_processado`
- Cases no switch: chamar_webhook_externo (lookup no ctx.conectoresSaida + executarConectorSaida), ver_caixa_entrada (SELECT ia_webhook_inbox), marcar_webhook_processado (UPDATE status='processado')
- `const conectoresSaida = await loadConectoresSaida(sb, agentId)` carregado antes do ctx
- `buildConectoresPromptSection(conectoresSaida)` injetado no system prompt

---

## Step 3b — conector_externo_entrada: receptor de webhooks

### O que foi feito

**Migração criada e aplicada:** `supabase/migrations/20260526_ia_webhook_inbox.sql`
- Tabela `ia_webhook_inbox` (tenant_id, card_id, agent_id, payload JSONB, status, resultado, source_ip)
- RLS: `zia_is_admin() OR tenant_in_scope(tenant_id)`
- GRANT para `authenticated` + `service_role`
- Índices em `(agent_id, status, created_at DESC)` e `(tenant_id, created_at DESC)`

**Edge Function criada e deployada:** `supabase/functions/ia-card-webhook/index.ts`
- `verify_jwt: false` (webhook público — validação é pelo card_id UUID)
- Endpoint: `POST /functions/v1/ia-card-webhook/<card_id>`
- Validação: UUID válido, card tipo `conector_externo_entrada`, ativo=true
- Fan-out: para cada agente conectado via `ia_agent_cards`, grava `ia_webhook_inbox`
- Fire-and-forget: dispara `ia-agent-runner` com mensagem `instructions + payload JSON`
- Retorna `{ ok, inbox_ids[], agentes, card_id }`

---

## Arquivos modificados

- `supabase/functions/_shared/editor-interno.ts` (**criado**)
- `supabase/functions/_shared/conectores.ts` (**criado**)
- `supabase/functions/ia-card-webhook/index.ts` (**criado**)
- `supabase/migrations/20260526_ia_webhook_inbox.sql` (**criado + aplicado**)
- `supabase/functions/whatsapp-agent-runner/index.ts` (modificado)
- `supabase/functions/ia-agent-runner/index.ts` (modificado)

## Como testar

### Step 2 (editor_interno)
1. Agente sem card → usar buscar_dados → funciona (compat)
2. Criar card `editor_interno` com `{modulos: {crm: {ativo:true, permissoes:['ver']}}}`, conectar ao agente
3. Chat com agente: "listar negociações" → OK
4. Chat: "criar lead" → erro: "Ação 'criar' não permitida no módulo 'crm'"
5. Habilitar `criar` no card → criar lead OK

### Step 3a (conector_externo_saida)
1. Criar card `conector_externo_saida` com `target_url=https://webhook.site/<uuid>`
2. Conectar ao agente
3. Chat: "envie {teste:1} pro meu conector" → verificar no webhook.site
4. Desconectar card → retry → "Conector não encontrado ou não autorizado"

### Step 3b (conector_externo_entrada)
1. Criar card `conector_externo_entrada`, conectar ao agente
2. `curl -X POST https://tgeomsnxfcqwrxijjvek.supabase.co/functions/v1/ia-card-webhook/<card_id> -H "Content-Type: application/json" -d '{"evento":"teste"}'`
3. Verificar row em `ia_webhook_inbox`
4. Agente recebe mensagem via `ia-agent-runner` e pode chamar `ver_caixa_entrada`

## Pendências

- Step 4 (google_workspace) — aguarda confirmação do usuário sobre questões abertas
- Verificar nos logs do Supabase se os runners deployaram sem erro de sintaxe Deno

## Rollback

- editor_interno: deletar `_shared/editor-interno.ts`, reverter imports nos runners
- conectores: deletar `_shared/conectores.ts`, reverter imports/tools nos runners
- ia-card-webhook: disable no Supabase Dashboard (não afeta runners)
- ia_webhook_inbox: `DROP TABLE public.ia_webhook_inbox;` (sem dados de produção ainda)
