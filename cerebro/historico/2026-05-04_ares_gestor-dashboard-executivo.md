---
agente: Ares (Claude Code)
data: 2026-05-04
tema: gestor dashboard executivo redesign
branch: main
---

## Contexto
Natanael pediu para replanejar e implementar o módulo Gestor — que estava abrindo como um dashboard de Vendas/CRM em vez de ter identidade própria. O Gestor deveria ser a tela home do sistema, com tema branco, sem ser um módulo clicável como os outros.

## O que foi feito

### Redesign completo do Gestor
- `GestorContent.tsx` reescrito do zero — tema branco, 3 painéis
- Painel esquerdo: lista de módulos que navegam direto para o módulo (não trocam conteúdo)
- Painel direito: IA Geral mantida
- Centro: dashboard executivo com 3 seções reais

### Dashboard executivo (centro)
1. **Saúde do Negócio** — 4 KPIs macro: Receita Mensal, Resultado Líquido, Headcount Ativo, Caixa Disponível (dados reais via `getLancamentos`, `getContasBancarias`, `getEmployees`)
2. **Central de Alertas** — consolida alertas críticos de todos os módulos (lançamentos vencidos, assinaturas inadimplentes, vagas abertas, não-conformidades) via queries paralelas com `Promise.allSettled`
3. **Resumo por Área** — 6 módulos com KPIs reais cada, reutilizando `fetchModuleHubData()`

### Limpeza
- `GestorLayout.tsx` deletado (485 linhas de código morto)
- `App.tsx` — import e rota `/app/gestor` removidos
- `ModuleHub.tsx` — limpo, tabs agora navegam para o módulo em vez de trocar conteúdo do centro

## Arquivos modificados
- `src/features/gestor/GestorContent.tsx` — reescrito completo
- `src/features/gestor/GestorLayout.tsx` — DELETADO
- `src/features/hub/ModuleHub.tsx` — tema branco, tabs como nav links
- `src/App.tsx` — import GestorLayout removido, rota /app/gestor removida
- `src/lib/version.ts` — 1.0.0-beta → 1.1.0-beta
- `package.json` — 1.0.0-beta → 1.1.0-beta

## Decisões tomadas
- Gestor é home screen (`/app`), tema branco — módulos têm tema escuro
- Gestor NÃO é módulo clicável na lista lateral
- Clicks nos módulos navegam para o módulo (não trocam dados do centro)
- MRR removido dos KPIs macro (irrelevante para PME sem assinaturas) — substituído por Resultado Líquido
- Feed de Atividades adiado: custo alto, retorno baixo para PME pequena
- Commits direto na `main` — branch `agent-ares` foi causa de confusão com Cloudflare

## Pendências
- Central de Alertas: avaliar migrar queries para RPC única no Supabase (`get_alertas_criticos`)
- Testar visualmente o ChatArea (IA Geral) no tema branco — possível texto ilegível
- Indicador de completude do sistema ("X de 10 módulos configurados") — aumenta engajamento no onboarding
- Deploy das 3 Edge Functions whatsapp-* e migration pendente (da sessão 30/04)
- ProspeccaoIA.tsx: normalizar telefone com prefixo 55 (bug isNewLead)
- Cloudflare hatsuit.com.br: worker.js correto nunca mergeado em main
