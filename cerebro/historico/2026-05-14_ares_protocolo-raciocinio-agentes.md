---
agente: Ares-ZIA
data: 2026-05-14
tema: protocolo raciocinio agentes
branch: main
---

## O que foi feito

### Fix: ia-agent-runner (v10 → v11)
- Corrigido bloco de "Raciocínio" duplicado no Chat Direto (Interno): `thought` agora logado com `&& !nudged` em `reactGemini`, `reactOpenAI` e `reactClaude`
- Adicionada query `wa_agent_numeros_confianca` + injeção no system prompt (igual ao whatsapp-agent-runner)
- Log de debug: `numeros_confianca found=N`

### Novo: Protocolo Obrigatório de Raciocínio em 5 Etapas (ia-agent-runner v11, whatsapp-agent-runner v48)
Ambas as funções agora seguem obrigatoriamente:
- ETAPA 1: Contexto (identificar mensagem atual)
- ETAPA 2: Análise de memória (leis essenciais → índice → decisão)
- ETAPA 3: Execução (chamadas de ferramentas)
- ETAPA 4: Validação (leis do sistema + leis do cliente)
- ETAPA 5: Resposta

## Arquivos modificados
- `supabase/functions/ia-agent-runner/index.ts`
- `supabase/functions/whatsapp-agent-runner/index.ts`
- `src/lib/version.ts` → 1.6.3-beta
- `package.json` → 1.6.3-beta

## Pendências
- Testar Chat Direto Interno com protocolo novo
- Validar que agente segue a ordem das etapas no raciocínio
