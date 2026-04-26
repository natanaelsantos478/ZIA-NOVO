# ZIA Omnisystem — Guia de Referências

> **Leia primeiro, implemente depois.**
> Este arquivo é um índice de navegação, não documentação.
> Antes de alterar qualquer coisa, consulte a referência do módulo.
> **Mantenha este arquivo atualizado**: ao descobrir novo padrão, decisão ou criar novo MD, adicione aqui.

Vault completo: [[INDICE]] · Ponto de entrada: [[CLAUDE-Referencia]]
Documentação técnica: [[docs/index]] · Cérebro do projeto: [[cerebro/MAPA]]

---

## O Cérebro — LEIA ISSO ANTES DE QUALQUER COISA

O **cérebro real do Natanael** é o vault do Obsidian em:

```
C:\Users\Natanael\.cerebro\CEREBRO ZEUS
```

**Este vault é a mente do projeto. Não tem git. É local.**

| O que é | Caminho | Propósito |
|---------|---------|-----------|
| **Vault Obsidian (cérebro)** | `C:\Users\Natanael\.cerebro\CEREBRO ZEUS` | Decisões, contexto, conhecimento — a mente real |
| **ZITA-BRAIN** | `C:\Users\Natanael\ZITA-BRAIN` | Fork de trabalho do código — NÃO é o vault |
| **ZIA-NOVO** | `C:\Users\Natanael\ZIA-NOVO` | Código do app em produção |
| **ZITA-EMPRESA** | `C:\Users\Natanael\ZITA-EMPRESA` | App de agentes IA |

### Regras obrigatórias para agentes:

1. **Novas notas/decisões** → criar em `C:\Users\Natanael\.cerebro\CEREBRO ZEUS\05-Codigo\ZIA-NOVO-docs\decisoes\`
2. **Linkar** → adicionar em `05-Codigo\ZIA-NOVO-docs\_indice-projeto.md`
3. **NUNCA** escrever no ZITA-BRAIN esperando aparecer no Obsidian — são coisas distintas
4. **Índice mestre** → `00-INDICE-MESTRE.md`

---

## Repositórios locais — caminhos oficiais

| Repositório | Caminho local | GitHub | Finalidade |
|-------------|--------------|--------|-----------|
| `ZIA-NOVO` | `C:\Users\Natanael\ZIA-NOVO` | `natanaelsantos478/ZIA-NOVO` | Código do app |
| `ZITA-BRAIN` | `C:\Users\Natanael\ZITA-BRAIN` | `natanaelsantos478/ZITA-BRAIN` | Fork de trabalho/experimentação |
| `ZITA-EMPRESA` | `C:\Users\Natanael\ZITA-EMPRESA` | `natanaelsantos478/ZITA-EMPRESA` | Agentes IA |
| **Vault Obsidian** | `C:\Users\Natanael\.cerebro\CEREBRO ZEUS` | *(sem git — local)* | **Cérebro real** |

---

## Protocolo de início de sessão — OBRIGATÓRIO

**Antes de qualquer trabalho**, sincronize os repositórios de código:

```bash
git -C C:\Users\Natanael\ZITA-BRAIN pull
git -C C:\Users\Natanael\ZIA-NOVO pull
```

---

## Time de agentes

| Agente | Papel | Repositório |
|--------|-------|------------|
| Juliano | Gerente geral / CPO — estratégia, orquestração | ambos |
| Cezar | Programador sênior — revisão técnica | ZIA-NOVO |
| Marcelo | Programador — implementações | ZIA-NOVO |
| Marcos | Programador de agentes | ZITA-EMPRESA |

Fluxo: Natanael → Juliano → Cezar → Marcelo/Marcos → PR `agent-zeus`

---

## Projeto

**ZIA / ZITA** — ERP+CRM+RH+EAM+SCM+IA modular para PMEs brasileiras.
Stack: React 19 · TypeScript 5.9 · Tailwind v4 · React Router v7 · Vite 7 · Supabase · Lucide icons.
Deploy: Cloudflare Pages (principal) · Vercel (legado). Worker Zeus: `wrangler.toml`.

---

## Onde procurar — por tema

| Preciso de… | Referência |
|-------------|-----------|
| Padrão de estrutura de módulo | `src/features/hr/` (modelo — 30+ seções) · [[HR-Module]] |
| Supabase + RLS multi-tenant | [[Supabase-Auth]] · [[ZITA-Supabase-RLS-Correcao-e-Lancamento]] |
| Isolamento por empresa | [[ERP-Multi-Tenant-Isolamento-Dados-Documentos]] |
| Árvore de custos / costEngine | [[ERP-Financeiro-Secoes]] · [[ERP-Arvore-de-Custos-Complexa-Escalavel]] |
| Comissões e grupos de produto | [[ERP-Vendas-Comissoes]] · [[ERP-Comissoes-Vendedores-Grupos-RH-Integracao]] |
| Editor de orçamento (canvas) | [[ERP-Orcamentos-Canvas]] · [[ERP-Orcamento-Visual-Editor-Canva-Produtos]] |
| Motor de campos dinâmicos | [[ERP-Orcamentos-Canvas]] |
| Agentes IA no ZITA | [[IA-Module]] · [[Agentes-IA-Arquitetura-Multi-Agente]] |
| Zeus — prompt e orquestração | [[Agente-Zeus-Prompt-Motor-Raciocinio]] |
| Worker Cloudflare (Zeus webhook) | [[Cloudflare-Worker-Zeus]] · [[Worker-Zeus-Cloudflare-Flowise-Webhook]] |
| WhatsApp + Evolution API | [[ZITA-WhatsApp-Evolution-API-Integracao]] |
| API keys para agentes externos | [[Settings-API]] · [[ZITA-API-Modulo-IA-Para-Agentes-Externos]] |
| Google OAuth | [[Google-OAuth]] · [[Google-OAuth-Configuracao-Client-ID]] |
| Deploy Cloudflare multi-página | [[Public-Landing]] · [[Cloudflare-Deploy-ZITA-Paginas-Multiplas]] |
| Flowise / Railway | [[Railway-Flowise-Volume-Persistencia]] · [[Railway-vs-Supabase-Arquitetura-Agentes]] |
| Faturamento / NF-e | [[ERP-Operacoes-Secoes]] · [[ERP-Financeiro-Detalhamento-NF-Integracoes-Fiscais]] |
| Visão completa do ERP | [[ERP-Core]] · [[ERP-Visao-Geral-Modulos-Operacoes-Financeiro]] |
| App mobile (Capacitor/PWA) | [[ZITA-App-Mobile-Capacitor-PWA]] |

---

## Mapa de módulos → notas de código

[[ERP-Core]] · [[ERP-Financeiro-Secoes]] · [[ERP-Operacoes-Secoes]] · [[ERP-Financeiro-Contas]] · [[ERP-Vendas-Comissoes]] · [[ERP-Orcamentos-Canvas]] · [[ERP-Assinaturas]] · [[ERP-Projetos]]

[[HR-Module]] · [[CRM-Module]] · [[EAM-Module]] · [[IA-Module]] · [[SCM-Module]] · [[Settings-API]] · [[Supabase-Auth]] · [[Google-OAuth]] · [[Cloudflare-Worker-Zeus]] · [[Public-Landing]] · [[Infra-Build]] · [[Componentes-Globais]]

---

## Decisões críticas — leia antes de alterar

[[ZITA-Supabase-RLS-Correcao-e-Lancamento]] — RLS obrigatório em todas as tabelas
[[ERP-Multi-Tenant-Isolamento-Dados-Documentos]] — sempre filtrar por `company_id`
[[ERP-Arvore-de-Custos-Complexa-Escalavel]] — lógica e estrutura do costEngine
[[Agente-Zeus-Prompt-Motor-Raciocinio]] — prompt oficial do Zeus
[[Railway-vs-Supabase-Arquitetura-Agentes]] — decisão de plataforma de agentes
[[Render-vs-Railway-vs-Rawai-Comparativo-Custo]] — custo de infra Flowise
[[ZITA-API-Modulo-IA-Para-Agentes-Externos]] — API externa para agentes
[[Worker-Zeus-Cloudflare-Flowise-Webhook]] — arquitetura do worker

---

## Padrões obrigatórios

**Estrutura de módulo:**
```
features/[modulo]/[Modulo]Layout.tsx   # Header + ModuleSidebar + NAV_GROUPS
features/[modulo]/[Modulo]Module.tsx   # switch(activeSection)
features/[modulo]/sections/[Secao].tsx # uma seção = um arquivo
```

**Sidebar:**
```tsx
<ModuleSidebar moduleTitle="X" moduleCode="X" color="pink"
  navGroups={NAV_GROUPS} activeId={activeSection} onNavigate={setActiveSection} />
```
Cores: `purple`(CRM) · `pink`(RH) · `blue`(EAM) · `emerald`(SCM) · `green`(Quality) · `amber`(Docs) · `slate`(ERP/Settings)

**Código:**
- Componentes PascalCase · Props como `interface` acima do componente
- IDs de seção: kebab-case (`'payroll-groups'`)
- Tailwind inline — zero CSS externo · zero shadcn/MUI · ícones só de `lucide-react`
- Conteúdo visível: português · variáveis/funções: inglês
- `custom-scrollbar` em listas scrolláveis

**Dados:**
- Supabase já conectado — **não criar mock em seções novas**
- Sempre filtrar por `company_id` (RLS + multi-tenant)
- Migrations SQL → `supabase/migrations/`

**Dependências disponíveis:** lodash · mathjs · recharts · @xyflow/react · konva · jspdf · html2canvas · framer-motion · dnd-kit · date-fns. Não instalar novas sem perguntar.

**Versionamento:**
- Toda alteração mergeada na branch `main` deve atualizar:
  1. `"version"` em `package.json`
  2. Constante `APP_VERSION` em `src/lib/version.ts`
- Seguir semver: `MAJOR.MINOR.PATCH[-sufixo]` (ex: `1.0.1-beta`)
- Versão atual: `1.0.0-beta` · Lançamento: `26/05/2026`

---

## Integrações previstas

| API | Para | Status |
|-----|------|--------|
| Focus NFe / NFe.io | NF-e, NFS-e, CT-e | Planejado |
| Asaas / Iugu / Efí | PIX, Boleto, Cartão | Planejado |
| Evolution API | WhatsApp Business | Planejado |
| Flowise (Railway) | Agentes IA | Ativo |
| ViaCEP · ReceitaWS | CEP · CNPJ | Gratuito |
| D4Sign / BRy | Assinatura digital | Planejado |
| Google Custom Search | Prospecção de leads | Ativo |

---

## Comandos

```bash
npm run dev      # dev server
npm run build    # tsc + vite build
npm run lint     # ESLint
```

---

## Protocolo de atualização

Sempre que ocorrer qualquer um dos eventos abaixo, atualize este arquivo:

- Novo padrão de código → adicionar em "Padrões obrigatórios"
- Decisão arquitetural → criar MD em `conversas/` + linkar em "Decisões críticas"
- Novo módulo ou seção relevante → linkar em "Mapa de módulos"
- Nova integração → atualizar tabela
- Nova nota de referência no vault → adicionar link `[[nota]]` na seção correspondente

**Regra:** menor caminho entre pergunta e resposta. Se precisar de mais de 2 saltos, adicione o atalho aqui.
