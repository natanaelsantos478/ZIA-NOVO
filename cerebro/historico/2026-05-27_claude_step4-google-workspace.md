---
agente: Claude (Opus 4.7)
data: 2026-05-27
tema: step 4 google workspace card multi-account
branch: claude/eloquent-lovelace-ezTux
versao: 2.2.0-beta
---

## Contexto

Step 4 do plano de Cards IA (já feitos Steps 1-3 em sessões anteriores).
Implementação do card `google_workspace` com decisões confirmadas pelo usuário:

- **Multi-account**: múltiplas contas Google por tenant (unique em `(tenant_id, email)`)
- **gmail_send**: sempre exige aprovação humana (cria item em `ia_pending_actions`)
- **Tracking**: tabela `google_api_usage` registra cada chamada
- **Calendar**: apenas calendário `primary`

---

## Migrações criadas e aplicadas

`supabase/migrations/20260527_google_workspace_card.sql`:
- `google_oauth_tokens` (tenant_id, email único, scopes, expires_at) — RLS tenant
- `google_api_usage` (tenant, email, agent, scope, endpoint, latência, erro)
- `ia_pending_actions` (tenant, agent, acao_tipo, payload, status pendente/aprovado/executado/erro/rejeitado)
- Todas com `zia_is_admin() OR tenant_in_scope(tenant_id)` + GRANTs

## Arquivos criados

- `supabase/functions/_shared/google.ts` — guard, refresh de token, resolveAccount, logUsage, buildGooglePromptSection
- `supabase/functions/_shared/google-tools.ts` — 9 tools (calendar 4 + sheets 2 + gmail 3) + listar_acoes_pendentes; gmail_send NÃO chama API, cria pending_action
- `supabase/functions/google-oauth-callback/index.ts` — troca code→tokens, upsert em google_oauth_tokens (deployed v1)
- `supabase/functions/ia-pending-action-execute/index.ts` — executa pending_action após aprovação humana (gmail_send via RFC822 base64url)
- `src/pages/GoogleOAuthCallback.tsx` — rota `/oauth/google/callback`, troca code via Edge Function, postMessage pro opener

## Arquivos modificados

- `supabase/functions/ia-agent-runner/index.ts` — import google + GOOGLE_TOOLS_DEF + roteamento GOOGLE_TOOL_NAMES no executarFerramenta + loadGoogleGuard + buildGooglePromptSection no system prompt
- `supabase/functions/whatsapp-agent-runner/index.ts` — mesmas mudanças
- `src/features/ia/sections/Organograma.tsx`:
  - novo tipo `google_workspace` em CARD_TIPO_INFO, CARD_DIRECAO, CARD_PAINEL_INFO
  - CardPainel: checkboxes de scopes + lista de contas + botão "Conectar Google" (popup OAuth) + desconectar
  - CriarAgenteModal (TIPOS + label switch + config default)
  - AgentePainel: nova aba `pendencias` + componente PendenciasTab (lista, aprovar via Edge Function, rejeitar)
- `src/App.tsx` — rota `/oauth/google/callback` (em ambos os Routes — sem perfil ativo e com perfil)
- `package.json` + `src/lib/version.ts` → 2.2.0-beta

## Secrets Supabase necessárias

Configurar em Supabase Dashboard → Settings → Edge Functions → Secrets:
- `GOOGLE_CLIENT_ID` — Web Client ID do Google OAuth
- `GOOGLE_CLIENT_SECRET` — Client Secret

Variável de build:
- `VITE_GOOGLE_CLIENT_ID` — mesmo Client ID (frontend lê via `import.meta.env`)

**Redirect URI a autorizar no Google Cloud Console:**
`https://<app-domain>/oauth/google/callback`

## Edge Functions deployadas

- `google-oauth-callback` v1 ACTIVE
- `ia-pending-action-execute` — (em deploy via sub-agente)
- `ia-agent-runner` — (em deploy via sub-agente, sobe para v45+)
- `whatsapp-agent-runner` — (em deploy via sub-agente, sobe para v113+)

## Como testar

1. **Configurar Google Cloud Console**:
   - Criar OAuth Client (Web Application)
   - Adicionar redirect URI `https://<app-domain>/oauth/google/callback`
   - Habilitar APIs: Calendar, Sheets, Gmail
2. **Configurar secrets** no Supabase (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) e build env (`VITE_GOOGLE_CLIENT_ID`)
3. **Criar card** `google_workspace` no Organograma → marcar scopes (Calendar + Sheets + Gmail read + Gmail send)
4. **Clicar "Conectar conta Google"** → popup OAuth → aprovar → conta aparece na lista
5. **Conectar card ao agente** via cordinha
6. **Chat com agente**:
   - "Liste meus próximos eventos do calendário" → executa `google_calendar_list`
   - "Envie email pro foo@bar.com com..." → cria pending_action, agente avisa "aguardando aprovação"
7. **Aba Pendências** do agente → ver o item → clicar "Aprovar e executar" → email é enviado, status muda para `executado`

## Pendências / próximos passos

- Configurar GOOGLE_CLIENT_ID/SECRET (não estão no Supabase ainda)
- Configurar OAuth Consent Screen no Google Cloud (para escapar do "verified app" precisamos manter como Internal ou submeter para verificação se for External; `gmail.send` é sensitive scope)
- Validar refresh token flow em produção (Google revoga refresh_token após 6 meses de inatividade)
- (Opcional) UI separada de auditoria `google_api_usage` por tenant (gráficos de uso)
- (Opcional) Suportar mais `acao_tipo` em `ia_pending_actions` além de `gmail_send`

## Rollback

- Migration: `DROP TABLE google_oauth_tokens, google_api_usage, ia_pending_actions CASCADE;`
- Edge Functions: disable no dashboard (google-oauth-callback, ia-pending-action-execute)
- Runners: reverter imports de google.ts / google-tools.ts (cards passam a ser ignorados sem erro — `loadGoogleGuard` retorna `hasCard: false`)
- UI: reverter Organograma.tsx + remover rota e página GoogleOAuthCallback
