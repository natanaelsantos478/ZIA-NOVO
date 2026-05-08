---
agente: Ares (Claude Code)
data: 2026-05-08
tema: análise arquitetura IA — estado atual e pendências
branch: main
versao: 1.1.3-beta
---

## Contexto

Sessão de revisão de contexto e análise do estado atual do módulo IA.
Nenhuma mudança de código — sessão focada em documentação e diagnóstico.

## O que foi feito

- Leitura de todos os logs de sessão anteriores (04/05 e 05/05)
- Análise completa da edge function `ia-chat`
- Análise do `whatsapp-ia-processor`
- Diagnóstico do bug TENANT_ID hardcoded no frontend
- Criação desta nota + atualização do `ZITA-BRAIN/cerebro/02-modulos/ia.md`

---

## Arquitetura atual da IA — diagnóstico completo

### `ia-chat` Edge Function (chat interno ZIA)

Modelo: **Gemini 2.5 Flash** (`gemini-2.5-flash:generateContent`)
Protocolo: **SSE streaming** (`text/event-stream`)
Loop: até **8 rounds** de tool calls

**14 ferramentas customizadas:**

| Ferramenta | O que faz |
|-----------|-----------|
| `buscar_dados` | SELECT no Supabase (filtros ou sql_custom) |
| `criar_registro` | INSERT multi-tenant com confirmação |
| `atualizar_registro` | UPDATE por UUID |
| `consultar_cnpj` | Receita Federal via `ia-utils` |
| `analisar_arquivo` | Análise de arquivo via `ia-analyze-file` |
| `google_calendar` | Listar/criar/deletar eventos |
| `google_sheets` | Ler/escrever planilhas |
| `gmail` | Listar/ler/enviar emails |
| `google_docs` | Criar/ler/editar documentos |
| `google_slides` | Criar/ler apresentações |
| `cloud_vision` | OCR, objetos, logos (via Google Vision API) |
| `google_people` | Listar/buscar contatos da agenda |
| `google_maps` | Rotas, geocoding, múltiplos destinos |
| `buscar_web` | Busca Google via `ia-web-search` |

**Fluxo de dados:**
1. Frontend envia `{ mensagem, conversa_id, agente_id, tenant_id, usuario_id, arquivo_ids, google_access_token }`
2. Cria ou busca conversa em `ia_conversas`
3. Salva mensagem do usuário em `ia_mensagens`
4. Busca histórico (20 msgs) + agente de `ia_agentes` + permissões de `ia_permissoes`
5. Monta `system_prompt` com base no agente + permissões + tenant + timestamp + Google status
6. Loop de até 8 rounds: Gemini → tool calls → executar → devolver resultado
7. Salva resposta final em `ia_mensagens` + logs em `ia_acoes_log`
8. Emite eventos SSE: `thinking` → `tool_start` → `tool_end` → `text (chunks)` → `done`

---

### `whatsapp-ia-processor` Edge Function (bot WhatsApp)

Modelo: **Gemini 2.5 Flash** (sem loop de tool calls)
Fluxo simples: webhook → carregar histórico → Gemini → Z-API

**Particularidades:**
- Contexto: até 20 msgs, com deduplicação de turnos consecutivos do mesmo role
- Prompt configurável por tenant via `ia_api_keys.permissoes.whatsapp.prompt_estilo`
- Mensagem inicial (tom/serviços) via `ia_api_keys.permissoes.whatsapp.mensagem_inicial`
- Envio de arquivos: IA escreve `[ARQUIVO:nome_exato]` no final da resposta → processado pelo caller
- Auto-detecção de nome: regex `/(me chamo|meu nome é|sou o|sou a)\s+([A-Z]...)/i`
- Strip de emojis na resposta: `replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/gu, '')`
- API key Gemini: busca em `ia_api_keys` por tenant → fallback para chave global

---

### Frontend — ChatSection + ChatArea

**Bug crítico ainda aberto:**
`ChatSection.tsx:9` e `ChatArea.tsx:15` — `TENANT_ID = '00000000-0000-0000-0000-000000000001'` hardcoded.

`ChatArea` aceita `tenantId` como prop opcional (default = hardcoded).
`ChatSection` **não passa** `tenantId` para `ChatArea` → todos os chats vão para o tenant demo.

**Isso significa:** nenhum tenant real consegue usar o chat corretamente.

Fix necessário: `ChatSection` deve buscar `activeProfile.entityId` (ou `company_id`) via `useProfiles()`/`useCompanies()` e passar como `tenantId` para `ChatArea`.

---

## Pendências abertas (herdadas + novas)

### Alta prioridade
- [ ] **Fix TENANT_ID hardcoded** em `ChatSection.tsx` e `ChatArea.tsx` → usar `activeProfile.entityId`
- [ ] **Deploy** `whatsapp-ia-processor`, `whatsapp-queue-worker`, `whatsapp-webhook` (pendente desde 30/04)
- [ ] **Aplicar migration** `20260429_whatsapp_message_queue.sql` + configurar pg_cron

### Média prioridade
- [ ] **ProspeccaoIA.tsx** — `isNewLead` falso por prefixo `55` no telefone do CRM (normalizar na entrada)
- [ ] **Cloudflare hatsuit.com.br** — `worker.js` correto nunca mergeado em main

### Fase 2 da reestruturação IA (parado)
- [ ] Migration SQL: colunas `organograma_x`, `organograma_y`, `organograma_parent_id` em `ia_agentes`
- [ ] Hook `useIAAuth()` adapter para `useProfiles()` + `useCompanies()`
- [ ] Hook `useAgentStatus()` com realtime Supabase
- [ ] Adaptar `useChat` do ZITA-EMPRESA para `ia-chat` do ZIA-NOVO

### Fase 3 (backlog)
- [ ] Portar `CanvasView` + `IANode` do ZITA-EMPRESA → `sections/Organograma.tsx`
- [ ] Portar `Escritorio2D` do ZITA-EMPRESA → `sections/Escritorio2D.tsx`

---

## Arquivos que precisam de atenção imediata

| Arquivo | Problema | Fix |
|---------|---------|-----|
| `src/features/ia/sections/ChatSection.tsx:9` | TENANT_ID hardcoded | usar `activeProfile.entityId` |
| `src/features/ia/sections/chat/ChatArea.tsx:15` | TENANT_ID hardcoded | já aceita prop, basta ChatSection passar |
| `supabase/functions/whatsapp-*` | não deployados | `supabase functions deploy` |
| `supabase/migrations/20260429_*` | não aplicada | `supabase db push` |

---

## Estado dos arquivos órfãos (reestruturação Fase 1)

Verificado em 08/05/2026 — **todos os arquivos órfãos foram deletados.** Fase 1 da reestruturação está concluída.

`src/features/ia/sections/` contém apenas:
`AgenteCriarModal.tsx` · `ChatSection.tsx` · `IAAgentDetalhe.tsx` · `IAAgentes.tsx` · `IAConfiguracoes.tsx` · `IADashboard.tsx` · `IAHistorico.tsx` · `IAPermissoes.tsx` · `IASolicitacoes.tsx` · `Models.tsx` · `Monitor.tsx` · `chat/`
