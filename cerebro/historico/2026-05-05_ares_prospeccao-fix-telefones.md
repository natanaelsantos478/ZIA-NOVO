---
agente: Ares (Claude Code)
data: 2026-05-05
tema: ProspeccaoIA fix telefones sem retorno
branch: main
---

## Contexto

Natanael relatou que o sistema de prospecção selecionou 10 empresas (login `holding-zita-vendas`) mas não enviou nenhuma mensagem no WhatsApp. A tela fechou antes de mostrar o resultado.

## Investigação

- Supabase query em `prosp_empresas`: 10 empresas com `status_pipeline: 'prospectado'` (nunca atualizou para `whatsapp_enviado`)
- Todos os 10 registros com `telefone_principal: null` e `telefone_secundario: null`
- Nenhuma chamada à `whatsapp-proxy` Edge Function foi registrada
- Chave WhatsApp para `holding-zita-vendas`: 1 key `ativo` com `enviar_em_massa: true` — OK

**Causa raiz:** Agent 4 (Sócios & Contatos / Gemini Search) não encontrou telefones para nenhuma das 10 empresas. Agent 2 (BrasilAPI) também retornou `ddd_telefone_1: null` para todos (campo opcional no CNPJ). Sem telefones, Agent 5 conta todos como `semTelefone` e não dispara nada — falha silenciosa.

**Causa raiz 2:** O `whatsapp-proxy` sequer é chamado quando `phones.length === 0`. O log "X sem telefone" só aparece se o usuário permanecer na tela até o fim.

## O que foi corrigido

### 1. Agent 4 — painel de aprovação agora mostra status de telefone
- Empresa com telefone encontrado: exibe o número em verde
- Empresa sem telefone: exibe campo de input âmbar para o usuário digitar manualmente

### 2. `proceed()` — merge de telefones manuais
Quando o usuário avança a partir do Agente 4, os telefones digitados manualmente são injetados em `emp.contatos` das empresas que não tinham nenhum telefone. Agent 5 pega esses contatos normalmente.

### 3. Agent 5 — auto-abre relatório manual se 0 enviadas
Se `sent === 0 && list.length > 0`, o modal de relatório abre automaticamente com a mensagem configurada. O usuário vê a lista com links `wa.me/` para cada empresa e pode enviar manualmente.

## Arquivos modificados
- `src/features/crm/sections/ProspeccaoIA.tsx` — fixes acima
- `src/lib/version.ts` — 1.1.0-beta → 1.1.1-beta
- `package.json` — 1.1.0-beta → 1.1.1-beta

## Nota: remote tinha mudanças
Ao rebasing, o remote já tinha um commit com `autoMode` (botão de automação que avança automaticamente entre agentes) e ícone `Zap`. Foi mergeado sem conflito.

## Tabela ia_api_keys — configuração WhatsApp
- Key `revogado`: instância antiga com token `13138C57B4A6EBC80FF93E61`
- Key `ativo` (Jessica): instância `3F1969DB5C2181E61967D6E8332D8490`, token na URL e `F453e4d3987b1440d815c4e3449b7d1d3S` no campo token — a discrepância pode causar erro no `whatsapp-proxy` dependendo de como ele usa `instanceUrl` vs `token`. **A investigar.**

## Pendências
- Verificar `whatsapp-proxy` Edge Function: como usa `instanceUrl` vs `token` — se já inclui o token na URL, passar `token` separado pode conflitar
- Deploy das 3 Edge Functions whatsapp-* e migration 20260429 (pendente de 30/04)
- ProspeccaoIA.tsx: normalizar telefone com prefixo 55 no CRM (`isNewLead` bug)
- Cloudflare hatsuit.com.br: worker.js correto nunca mergeado em main
