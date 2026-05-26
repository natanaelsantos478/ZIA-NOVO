---
agente: Claude (Opus 4.7)
data: 2026-05-26
tema: cards step 1 memoria organograma
branch: claude/eloquent-lovelace-ezTux
versao: 2.1.0-beta
---

## Contexto

Step 1 do plano de correção dos Cards IA. Investigação anterior mostrou que a aba **Memória** do `AgentePainel` (dentro do `Organograma.tsx`) lia/escrevia em `ia_agent_memoria` + `ia_agent_memoria_entradas`, enquanto os runners (`whatsapp-agent-runner`, `ia-agent-runner`) leem de `ia_memorias`. Resultado: o gestor escrevia memória pela UI do canvas e o agente nunca via aquilo em runtime.

Nota importante: o componente `IAMemoria.tsx` (standalone) já estava correto — usava `ia_memorias`. O bug era estritamente dentro do `Organograma.tsx`.

## O que foi feito

- Renomeado state `memoriaId` → `indiceMemId` (representa apenas a row de tipo='indice').
- Bloco de load (useEffect aba='memoria'):
  - Substituído `from('ia_agent_memoria').maybeSingle()` por consulta em `ia_memorias` filtrando `tipo='indice'`.
  - Substituído `from('ia_agent_memoria_entradas')` por consulta em `ia_memorias` excluindo `tipo='indice'`, ordenado por `updated_at desc`.
  - Mapeamento: row.tipo → state.categoria; row.conteudo → state.conteudo.
- `salvarIndice()`: upsert em `ia_memorias` com `tipo='indice', titulo='Índice de Memórias', importancia=10`.
- `adicionarEntrada()`: insert direto em `ia_memorias` com `tipo='geral', titulo='Nova entrada', importancia=5`. Removida dependência de "memoria mãe" (modelo antigo).
- `removerEntrada()`: delete em `ia_memorias`.
- onBlur de categoria/conteudo dos cards de entrada: update em `ia_memorias` (tipo/conteudo + updated_at).

## Arquivos modificados

- `src/features/ia/sections/Organograma.tsx`
- `package.json` (2.0.6 → 2.1.0)
- `src/lib/version.ts` (mesmo bump)

## Decisões

- Não migrar dados da `ia_agent_memoria*` legacy. Tabelas ficam órfãs (módulo novo, dados quase zero).
- Manter o tipo do `Entrada` no state como `{ id, categoria, conteudo }` (compatibilidade com a UI que já lê esses campos), mas mapeando para `tipo` no banco.

## Como testar

1. Abrir Organograma de um agente → aba Memória.
2. Digitar texto no Índice → "Salvar índice" → verificar row em `ia_memorias` (tipo='indice').
3. Adicionar entrada, mudar categoria para 'preferencias' → verificar row criada com tipo='preferencias'.
4. Recarregar a página → memórias devem persistir.
5. Disparar runner WhatsApp com este agente — `memoriasCtx` (whatsapp-agent-runner L1613–1623) deve carregar leis/personalidade/indice/essenciais conforme tipos cadastrados.

## Pendências

- Steps 2, 3, 4 do plano (em ordem).
- Cleanup opcional via COMMENT ON nas tabelas legacy (não bloqueante).
